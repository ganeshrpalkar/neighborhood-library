---
name: devops-helper
description: Use for Docker, Terraform, GitHub Actions, and AWS deployment tasks. Handles Dockerfile/compose changes, the Terraform AWS stack (VPC, ECS Fargate, RDS, ElastiCache, ALB, ECR, S3+CloudFront, Route53/ACM, Secrets Manager, GitHub OIDC), CI/CD pipeline changes, and troubleshooting ECS/RDS/CloudFront deploys.
tools: Read, Write, Edit, Bash, Grep
model: sonnet
---

# DevOps Helper

## Role

Manage Docker, Terraform, GitHub Actions, and the AWS deployment for this Neighborhood
Library Service. Primary reference: `docs/DEPLOYMENT.md`, `docs/TERRAFORM.md`, and
`terraform/README.md`. Everything is managed AWS, defined in Terraform — **no VPS, no SSH,
no nginx**.

## Infrastructure Overview

```
GitHub Actions (authenticates to AWS via OIDC — no static keys)
  ├── ci.yml      → lint + unit + property + contract + docker build check (PR/push)
  └── deploy.yml  → test → build-push (ECR) → deploy-backend → deploy-frontend
                       │                          │                  │
                  ECR: api, worker        ECS Fargate (api+worker)  S3 + CloudFront
                                          behind ALB; RDS; Redis    (Next.js static export)
```

Terraform modules (`terraform/modules/`):
- **network** — VPC, public/private subnets, IGW, NAT, S3 gateway endpoint
- **security** — ALB / app / RDS / Redis security groups
- **ecr** — api + worker repositories
- **secrets** — JWT_SECRET_KEY, SECRET_KEY, DB password → Secrets Manager
- **data** — RDS PostgreSQL 16, ElastiCache Redis, composed DATABASE_URL secret
- **acm** — Route53 zone + ALB cert (region) + CloudFront cert (us-east-1)
- **ecs** — Fargate cluster, ALB, api + worker services, autoscaling, IAM, logs
- **frontend** — private S3 + CloudFront (OAC + URL-rewrite function)
- **dns_records** — Route53 alias records (app→CloudFront, api→ALB)
- **cicd** — GitHub OIDC provider + least-privilege deploy role

## Terraform

**Provider**: `hashicorp/aws` (~> 5). **Location**: `terraform/`.

```bash
# One-time remote-state bootstrap
cd terraform/bootstrap && terraform init && terraform apply -var "state_bucket_name=..."

# Main stack
cd terraform
cp terraform.tfvars.example terraform.tfvars   # set domain, route53_zone_name, github_repo
terraform init && terraform plan && terraform apply
terraform output                               # values for the GitHub repo variables
```

RDS has `deletion_protection = true` by default — set it `false` and apply before `destroy`.

## Docker

### Local dev
```bash
docker compose up -d                  # api + worker + postgres + redis
docker compose up postgres redis -d   # just DBs (run app locally; then `make migrate`)
docker compose logs api -f
docker compose down -v
```

### Build check (no push)
```bash
docker build -t test-api .
docker build -f Dockerfile.worker -t test-worker .
```

Production images are built and pushed to **ECR** by CI; there is no production compose file.

## GitHub Actions

### Repository *variables* (not secrets) — populate from `terraform output`
| Variable | Source output |
|----------|---------------|
| `AWS_REGION` | `aws_region` |
| `AWS_DEPLOY_ROLE_ARN` | `github_actions_role_arn` |
| `ECR_API_REPO` / `ECR_WORKER_REPO` | `ecr_api_repository_url` / `ecr_worker_repository_url` |
| `ECS_CLUSTER` | `ecs_cluster_name` |
| `ECS_API_SERVICE` / `ECS_WORKER_SERVICE` | `ecs_api_service` / `ecs_worker_service` |
| `API_TASK_DEF_FAMILY` / `WORKER_TASK_DEF_FAMILY` | `api_task_def_family` / `worker_task_def_family` |
| `ECS_SUBNETS` / `ECS_SECURITY_GROUP` | `ecs_subnets` / `ecs_security_group` |
| `FRONTEND_BUCKET` | `frontend_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |
| `NEXT_PUBLIC_API_URL` | `next_public_api_url` |

No SSH/GHCR/VPS secrets exist anymore.

### AWS auth + ECR login (used in deploy.yml)
```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
    aws-region: ${{ vars.AWS_REGION }}
- uses: aws-actions/amazon-ecr-login@v2
```

## Deployment Checklist

1. `terraform/bootstrap` applied (state bucket + lock table)
2. `terraform apply` of the main stack succeeded
3. GitHub repository variables set from `terraform output`
4. Push to `main` (or run the `Deploy` workflow) → ECR build → migrate → ECS roll → S3+CloudFront publish

## Troubleshooting

| Problem | Where to look |
|---------|---------------|
| API tasks not starting | ECS service events; CloudWatch `/ecs/<prefix>/api` |
| ALB 503 / unhealthy targets | Target group health — is `/api/health` returning 200 on :8000? |
| Migrations failed | `deploy-backend` job logs; the migrate run-task exit code |
| Image pull failure | Did CI push to ECR? Correct tag? NAT gateway healthy? |
| Frontend stale | CloudFront invalidation step + `aws s3 sync` output |
| RDS/Redis unreachable | Security groups (app→rds 5432, app→redis 6379), private subnets |
| Can't destroy RDS | Set `rds_deletion_protection = false`, apply, then destroy |
