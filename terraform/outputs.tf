# Human-facing URLs
output "app_url" {
  description = "Frontend URL (served by CloudFront)."
  value       = "https://${var.domain}"
}

output "api_url" {
  description = "Backend API base URL (served by the ALB)."
  value       = "https://${local.api_fqdn}"
}

# ---------------------------------------------------------------------------
# CI/CD wiring — set these as GitHub Actions *repository variables* (Settings →
# Secrets and variables → Actions → Variables). See docs/DEPLOYMENT.md.
# ---------------------------------------------------------------------------
output "github_actions_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN — role the deploy workflow assumes via OIDC."
  value       = module.cicd.role_arn
}

output "aws_region" {
  description = "AWS_REGION."
  value       = var.aws_region
}

output "ecr_api_repository_url" {
  description = "ECR_API_REPO."
  value       = module.ecr.api_repository_url
}

output "ecr_worker_repository_url" {
  description = "ECR_WORKER_REPO."
  value       = module.ecr.worker_repository_url
}

output "ecs_cluster_name" {
  description = "ECS_CLUSTER."
  value       = module.ecs.cluster_name
}

output "ecs_api_service" {
  description = "ECS_API_SERVICE."
  value       = module.ecs.api_service_name
}

output "ecs_worker_service" {
  description = "ECS_WORKER_SERVICE."
  value       = module.ecs.worker_service_name
}

output "api_task_def_family" {
  description = "API_TASK_DEF_FAMILY (also used by the migrate run-task)."
  value       = module.ecs.api_task_def_family
}

output "worker_task_def_family" {
  description = "WORKER_TASK_DEF_FAMILY."
  value       = module.ecs.worker_task_def_family
}

output "ecs_subnets" {
  description = "ECS_SUBNETS — private subnet IDs (comma-joined) for the migrate run-task."
  value       = join(",", module.network.private_subnet_ids)
}

output "ecs_security_group" {
  description = "ECS_SECURITY_GROUP — app security group for the migrate run-task."
  value       = module.security.app_sg_id
}

output "frontend_bucket" {
  description = "FRONTEND_BUCKET — S3 bucket the static export syncs to."
  value       = module.frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CLOUDFRONT_DISTRIBUTION_ID — invalidated after each frontend deploy."
  value       = module.frontend.distribution_id
}

output "next_public_api_url" {
  description = "NEXT_PUBLIC_API_URL — baked into the frontend build."
  value       = "https://${local.api_fqdn}/api/v1"
}

# ---------------------------------------------------------------------------
# Infra detail
# ---------------------------------------------------------------------------
output "alb_dns_name" {
  description = "Public DNS name of the ALB."
  value       = module.ecs.alb_dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = module.frontend.distribution_domain_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private)."
  value       = module.data.db_endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint (private)."
  value       = module.data.redis_endpoint
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID used for records."
  value       = module.acm.zone_id
}
