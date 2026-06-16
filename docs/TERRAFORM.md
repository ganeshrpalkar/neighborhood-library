# Terraform Guide

The `terraform/` configuration provisions the **complete** AWS stack for this service —
backend, worker, database, cache, frontend, networking, TLS, DNS, secrets, the container
registry, and the CI/CD deploy identity. (It replaces the old SSH-into-a-VPS setup entirely.)

Quick start lives in [`../terraform/README.md`](../terraform/README.md); this guide is the
reference for modules, variables, outputs, and state.

## Modules

| Module | What it provisions |
|--------|--------------------|
| `network` | VPC, public + private subnets across AZs, IGW, NAT gateway(s), route tables, S3 gateway endpoint |
| `security` | Security groups: ALB (80/443), app (8000 from ALB), RDS (5432 from app), Redis (6379 from app) |
| `ecr` | ECR repos `<prefix>-api` and `<prefix>-worker` + image lifecycle policy |
| `secrets` | `random_password` → Secrets Manager: `JWT_SECRET_KEY`, `SECRET_KEY`, DB master password |
| `data` | RDS PostgreSQL 16, ElastiCache Redis, and the composed `DATABASE_URL` secret |
| `acm` | Route53 zone (lookup or create) + DNS-validated ACM certs (ALB in-region, CloudFront in us-east-1) |
| `ecs` | Fargate cluster, ALB + listeners, api & worker task defs/services, autoscaling, IAM roles, CloudWatch logs |
| `frontend` | Private S3 bucket + CloudFront (OAC) + URL-rewrite CloudFront Function + bucket policy |
| `dns_records` | Route53 alias records: app → CloudFront, api → ALB |
| `cicd` | GitHub Actions OIDC provider + least-privilege deploy role |

Wiring order (`main.tf`): `network → security, ecr, secrets → data → acm → ecs + frontend →
dns_records`, with `cicd` consuming the ECR / ECS / frontend ARNs.

## Prerequisites

- Terraform >= 1.6 ([install](https://developer.hashicorp.com/terraform/install))
- AWS credentials (`aws configure` / `AWS_PROFILE`)
- A Route53 hosted zone for your domain (or `create_hosted_zone = true`)

## Key variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-1` | Region for all regional resources |
| `project_name` | `library` | Short resource-name prefix (feeds 32-char AWS names) |
| `environment` | `production` | `staging` or `production` |
| `domain` | — | Frontend host, e.g. `library.example.com` |
| `api_subdomain` | `api` | API host = `<api_subdomain>.<domain>` |
| `route53_zone_name` | `""` | Hosted zone name when `domain` is a subdomain (e.g. `example.com`) |
| `create_hosted_zone` | `false` | Create the zone instead of looking it up |
| `github_repo` | — | `owner/name` trusted by the OIDC deploy role |
| `create_github_oidc_provider` | `true` | Set false if the provider already exists in the account |
| `db_instance_class` | `db.t4g.micro` | RDS size |
| `redis_node_type` | `cache.t4g.micro` | ElastiCache size |
| `rds_multi_az` | `false` | RDS high availability |
| `rds_deletion_protection` | `true` | Blocks destroy; forces a final snapshot |
| `nat_gateway_count` | `1` | NAT gateways (raise to `az_count` for HA) |
| `api_desired_count` / `api_min_count` / `api_max_count` | `2` / `1` / `4` | API service + autoscaling bounds |
| `worker_desired_count` | `1` | Celery worker tasks |

Full list with descriptions: `terraform/variables.tf`.

## Outputs

`terraform output` surfaces the values you paste into the GitHub Actions repository variables
(`AWS_DEPLOY_ROLE_ARN`, `ECR_*`, `ECS_*`, `*_TASK_DEF_FAMILY`, `ECS_SUBNETS`,
`ECS_SECURITY_GROUP`, `FRONTEND_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `NEXT_PUBLIC_API_URL`)
plus `app_url`, `api_url`, `alb_dns_name`, `cloudfront_domain_name`, `rds_endpoint`,
`redis_endpoint`. The full mapping table is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Remote state

State lives in S3 with a DynamoDB lock table, created once by `terraform/bootstrap/`:

```bash
cd terraform/bootstrap
terraform init
terraform apply -var "state_bucket_name=library-tfstate-<account-id>"
terraform output -raw backend_config   # paste into terraform/backend.tf
```

Then `cp backend.tf.example backend.tf` (or paste the above), fill in the bucket/table, and
run `terraform init` to migrate state into S3. Local state (no `backend.tf`) is fine for a
single operator. State files and `*.tfvars` are gitignored — never commit them.

## Apply / destroy

```bash
terraform plan
terraform apply

# Tear down — RDS deletion protection must be disabled first
terraform apply -var "rds_deletion_protection=false"
terraform destroy
```

The ECR repos and the frontend S3 bucket use `force_destroy`, so they remove cleanly.

## Notes

- The ECS services set `lifecycle { ignore_changes = [task_definition, desired_count] }` so
  CI-registered task revisions and autoscaling are not reverted on `terraform apply`.
- The CloudFront ACM certificate must live in `us-east-1`; the root passes an aliased provider
  (`aws.us_east_1`) to the `acm` module for exactly that.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `no matching Route 53 Zone found` | Set `route53_zone_name` to the actual zone (e.g. `example.com`), or `create_hosted_zone = true` |
| OIDC provider already exists | Set `create_github_oidc_provider = false` |
| `Error acquiring the state lock` | A prior apply crashed — `terraform force-unlock <ID>` |
| ECS service never stabilizes on first apply | Expected until CI pushes the first image |
| Can't destroy (RDS protected) | `terraform apply -var rds_deletion_protection=false`, then `terraform destroy` |
