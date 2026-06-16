# Deployment Guide

This service runs entirely on **AWS**, defined in Terraform (`terraform/`) and shipped by
GitHub Actions. There is no VPS, no SSH, and no nginx — the frontend is a static export on
S3 + CloudFront and the backend runs on ECS Fargate behind an Application Load Balancer.

## Architecture overview

```
                         Route53  (app + api records)
                          │                       │
        ACM (us-east-1)   │                       │   ACM (region)
              │           ▼                       ▼          │
        ┌──────────  CloudFront  ─────┐    ┌──────  ALB (:443, :80→443)  ─────┐
        │  OAC + URL-rewrite function │    │      target group :8000          │
        └──────────────┬──────────────┘    └───────────────┬──────────────────┘
                       │                                    │
                 S3 (private,                       ECS Fargate (private subnets)
                  static export)                    ├── api service (autoscaled)
                                                    └── worker service (Celery)
                                                              │             │
                                                       RDS PostgreSQL   ElastiCache Redis
   Secrets Manager: DATABASE_URL · JWT_SECRET_KEY · SECRET_KEY
   ECR: api · worker images       GitHub OIDC role → push/deploy from CI
```

Request flow: browsers hit `https://<domain>` → CloudFront → S3 static files. The app calls
`https://api.<domain>/api/v1/...` → ALB → ECS `api` tasks → RDS / Redis. The `worker` service
runs Celery jobs (overdue-loan flagging, fine recalcs) off the same database and Redis.

## Prerequisites

- An AWS account and credentials locally (`aws configure` or `AWS_PROFILE`).
- A registered domain with a **Route53 hosted zone** (or set `create_hosted_zone = true` and
  delegate your registrar's NS records to the zone Terraform creates).
- Terraform >= 1.6, plus the AWS CLI, Node 20, and Docker for local builds.

## First deploy (one-time)

### 1. Bootstrap remote state
```bash
cd terraform/bootstrap
terraform init
terraform apply -var "state_bucket_name=library-tfstate-$(aws sts get-caller-identity --query Account --output text)"
terraform output -raw backend_config   # paste into ../backend.tf
```

### 2. Apply the stack
```bash
cd ..              # terraform/
cp terraform.tfvars.example terraform.tfvars   # set domain, route53_zone_name, github_repo
cp backend.tf.example backend.tf               # paste the bootstrap output (or skip → local state)
terraform init
terraform apply
```
The ECS services are created now but **cannot pull images until the first CI run** — that's
expected (services use `wait_for_steady_state = false`, so apply does not hang). The site and
API come fully online after step 4.

### 3. Set the GitHub repository variables
`terraform output` prints every value CI needs. Add them under **Settings → Secrets and
variables → Actions → Variables** (these are *variables*, not secrets — there are no SSH or
registry secrets anymore):

| GitHub variable | Terraform output |
|-----------------|------------------|
| `AWS_REGION` | `aws_region` |
| `AWS_DEPLOY_ROLE_ARN` | `github_actions_role_arn` |
| `ECR_API_REPO` | `ecr_api_repository_url` |
| `ECR_WORKER_REPO` | `ecr_worker_repository_url` |
| `ECS_CLUSTER` | `ecs_cluster_name` |
| `ECS_API_SERVICE` | `ecs_api_service` |
| `ECS_WORKER_SERVICE` | `ecs_worker_service` |
| `API_TASK_DEF_FAMILY` | `api_task_def_family` |
| `WORKER_TASK_DEF_FAMILY` | `worker_task_def_family` |
| `ECS_SUBNETS` | `ecs_subnets` |
| `ECS_SECURITY_GROUP` | `ecs_security_group` |
| `FRONTEND_BUCKET` | `frontend_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |
| `NEXT_PUBLIC_API_URL` | `next_public_api_url` |

### 4. Deploy
Push to `main` (or run the **Deploy** workflow manually). CI then:
1. builds + pushes the api and worker images to ECR,
2. runs Alembic migrations as a one-off ECS task on the new image,
3. rolls the api and worker ECS services,
4. builds the Next.js static export and syncs it to S3 + invalidates CloudFront.

### 5. Verify
```bash
curl https://api.<domain>/api/health      # → 200 {"status":"ok","postgres":true,"redis":true}
open https://<domain>                      # app loads; deep links resolve
```

## Ongoing deploys

Every push to `main` / `staging` / `production` (or a manual dispatch) repeats step 4. The
deploy is gated through GitHub Environments named `staging` / `production`. Images are tagged
with the commit SHA, so each deploy is pinned and reproducible.

## Rollback

Two options:
- **Re-run the workflow** at a previous commit (Actions → Deploy → Run workflow → pick the
  ref); it rebuilds and pins that SHA.
- **Point ECS at the previous task-def revision** directly:
  ```bash
  aws ecs update-service --cluster <ECS_CLUSTER> --service <ECS_API_SERVICE> \
    --task-definition <family>:<previous-revision>
  aws ecs wait services-stable --cluster <ECS_CLUSTER> --services <ECS_API_SERVICE>
  ```
For the frontend, re-running the workflow re-syncs S3 and invalidates CloudFront.

## Logs & monitoring

- **ECS task logs** → CloudWatch Logs groups `/ecs/<project>-<env>/api` and `/worker`.
- **ALB / target health** → EC2 → Target Groups → the `*-api` group.
- **Container Insights** is enabled on the cluster (CPU / memory / task metrics).
- **Migrations** → the `deploy-backend` job log shows the migrate task's exit code.

## Secrets

`DATABASE_URL`, `JWT_SECRET_KEY`, and `SECRET_KEY` are generated by Terraform and stored in
AWS Secrets Manager; ECS injects them into tasks at launch. Redis/Celery URLs and CORS are
plain env. To rotate a secret, update its Secrets Manager value and force a new deployment
(`aws ecs update-service --force-new-deployment`).

## Cost note

A managed stack is not free. Rough `us-east-1` idle baseline: NAT gateway ~$32, ALB ~$16,
RDS `db.t4g.micro` ~$12, ElastiCache `cache.t4g.micro` ~$11, plus CloudFront/S3/Secrets ≈
**~$75–90/mo**. Tune with `db_instance_class`, `redis_node_type`, `rds_multi_az`,
`nat_gateway_count`, and the desired-count variables in `terraform.tfvars`.

## Troubleshooting

| Problem | Action |
|---------|--------|
| API tasks won't start / cycle | CloudWatch `/ecs/<prefix>/api`; confirm the image tag exists in ECR |
| ALB returns 503 | Target group has no healthy targets — is `/api/health` returning 200? |
| Health check 503 | `postgres`/`redis` field false — check RDS/Redis security groups + endpoints |
| Migration job failed | `deploy-backend` job log → migrate run-task exit code |
| Frontend not updating | Confirm the CloudFront invalidation step ran; check `aws s3 sync` output |
| 401 on API | `JWT_SECRET_KEY` secret mismatch — confirm the Secrets Manager value |
| `terraform apply` won't finish on ECS | Expected before the first image push; it does not wait for steady state |

Terraform specifics (modules, variables, outputs, state): see [TERRAFORM.md](TERRAFORM.md)
and [`../terraform/README.md`](../terraform/README.md).
