# Terraform — complete AWS deployment stack

This configuration provisions the **entire** runtime for the Neighborhood
Library service on AWS — backend, worker, database, cache, frontend, networking,
TLS, DNS, secrets, container registry, and the CI/CD deploy identity.

## What it creates

| Module | Resources |
|--------|-----------|
| `network` | VPC, public + private subnets (×`az_count`), Internet Gateway, NAT gateway(s), route tables, S3 gateway endpoint |
| `security` | Security groups: ALB, app (ECS), RDS, Redis |
| `ecr` | ECR repos `…-api` and `…-worker` + lifecycle policy |
| `secrets` | `JWT_SECRET_KEY`, `SECRET_KEY`, DB master password → Secrets Manager |
| `data` | RDS PostgreSQL 16, ElastiCache Redis, and the composed `DATABASE_URL` secret |
| `acm` | Route53 zone (lookup/create) + ACM certs for the ALB (region) and CloudFront (us-east-1) |
| `ecs` | Fargate cluster, ALB + listeners, api & worker task defs/services, autoscaling, IAM roles, CloudWatch logs |
| `frontend` | Private S3 bucket + CloudFront (OAC) + URL-rewrite function |
| `dns_records` | Route53 alias records: app → CloudFront, api → ALB |
| `cicd` | GitHub Actions OIDC provider + least-privilege deploy role |

Architecture diagram and full flow: [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

## Prerequisites

1. An AWS account + credentials (`aws configure` or `AWS_PROFILE`).
2. A domain with a Route53 hosted zone (or set `create_hosted_zone = true` and
   delegate your registrar's NS records to it).
3. Terraform >= 1.6.

## Quick start

```bash
# 0) (Once) create the remote-state bucket + lock table
cd terraform/bootstrap
terraform init && terraform apply -var "state_bucket_name=library-tfstate-$(aws sts get-caller-identity --query Account --output text)"
terraform output -raw backend_config   # paste into ../backend.tf

# 1) Configure and apply the main stack
cd ..
cp terraform.tfvars.example terraform.tfvars   # edit: domain, route53_zone_name, github_repo
cp backend.tf.example backend.tf               # paste the bootstrap output, or skip for local state
terraform init
terraform plan
terraform apply
```

## After apply — wire up CI

`terraform output` prints every value the GitHub Actions workflow needs. Set
them as **repository variables** (Settings → Secrets and variables → Actions →
Variables):

```bash
terraform output            # AWS_DEPLOY_ROLE_ARN, ECR_*, ECS_*, FRONTEND_BUCKET,
                            # CLOUDFRONT_DISTRIBUTION_ID, NEXT_PUBLIC_API_URL, ...
```

Then push to `main` (or run the workflow manually). The first deploy builds and
pushes images to ECR, runs the DB migration task, rolls the ECS services, and
publishes the frontend to S3 + CloudFront. See
[`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for the variable list and the
first-deploy ordering.

## Cost note

A managed AWS stack is not free. Rough `us-east-1` idle baseline: NAT gateway
~$32, ALB ~$16, RDS `db.t4g.micro` ~$12, ElastiCache `cache.t4g.micro` ~$11,
plus CloudFront/S3/Secrets ≈ **~$75–90/mo**. Tune via `db_instance_class`,
`redis_node_type`, `rds_multi_az`, `nat_gateway_count`, and the desired-count
variables.

## Destroy

```bash
terraform destroy
```

`rds_deletion_protection = true` (the default) blocks RDS destroy and forces a
final snapshot — set it to `false` first if you really want the database gone.
The ECR repos and frontend S3 bucket use `force_destroy`, so they remove cleanly.
