# Root module. Wiring order follows the dependency DAG:
#   network -> security, ecr, secrets -> data -> acm
#   acm -> ecs (alb cert) + frontend (cloudfront cert) -> dns_records
#   ecr + ecs + frontend -> cicd

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  api_fqdn    = "${var.api_subdomain}.${var.domain}"
  zone_name   = var.route53_zone_name != "" ? var.route53_zone_name : var.domain

  common_tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)
}

module "network" {
  source            = "./modules/network"
  name_prefix       = local.name_prefix
  vpc_cidr          = var.vpc_cidr
  az_count          = var.az_count
  nat_gateway_count = var.nat_gateway_count
}

module "security" {
  source      = "./modules/security"
  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
}

module "ecr" {
  source      = "./modules/ecr"
  name_prefix = local.name_prefix
}

module "secrets" {
  source      = "./modules/secrets"
  name_prefix = local.name_prefix
}

module "data" {
  source                = "./modules/data"
  name_prefix           = local.name_prefix
  private_subnet_ids    = module.network.private_subnet_ids
  rds_sg_id             = module.security.rds_sg_id
  redis_sg_id           = module.security.redis_sg_id
  db_password           = module.secrets.db_master_password
  db_instance_class     = var.db_instance_class
  db_allocated_storage  = var.db_allocated_storage
  db_engine_version     = var.db_engine_version
  db_name               = var.db_name
  db_username           = var.db_username
  multi_az              = var.rds_multi_az
  backup_retention_days = var.rds_backup_retention_days
  deletion_protection   = var.rds_deletion_protection
  redis_node_type       = var.redis_node_type
  redis_engine_version  = var.redis_engine_version
}

module "acm" {
  source             = "./modules/acm"
  zone_name          = local.zone_name
  domain             = var.domain
  api_fqdn           = local.api_fqdn
  create_hosted_zone = var.create_hosted_zone

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "ecs" {
  source                  = "./modules/ecs"
  name_prefix             = local.name_prefix
  environment             = var.environment
  aws_region              = var.aws_region
  vpc_id                  = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  private_subnet_ids      = module.network.private_subnet_ids
  alb_sg_id               = module.security.alb_sg_id
  app_sg_id               = module.security.app_sg_id
  alb_certificate_arn     = module.acm.alb_certificate_arn
  api_image               = "${module.ecr.api_repository_url}:${var.container_image_tag}"
  worker_image            = "${module.ecr.worker_repository_url}:${var.container_image_tag}"
  api_cpu                 = var.api_cpu
  api_memory              = var.api_memory
  api_desired_count       = var.api_desired_count
  api_min_count           = var.api_min_count
  api_max_count           = var.api_max_count
  worker_cpu              = var.worker_cpu
  worker_memory           = var.worker_memory
  worker_desired_count    = var.worker_desired_count
  log_retention_days      = var.log_retention_days
  database_url_secret_arn = module.data.database_url_secret_arn
  jwt_secret_arn          = module.secrets.jwt_secret_arn
  secret_key_arn          = module.secrets.secret_key_arn
  redis_endpoint          = module.data.redis_endpoint
  cors_allowed_origins    = "https://${var.domain}"
}

module "frontend" {
  source                     = "./modules/frontend"
  name_prefix                = local.name_prefix
  domain                     = var.domain
  cloudfront_certificate_arn = module.acm.cloudfront_certificate_arn
}

module "dns_records" {
  source                 = "./modules/dns_records"
  zone_id                = module.acm.zone_id
  domain                 = var.domain
  api_fqdn               = local.api_fqdn
  cloudfront_domain_name = module.frontend.distribution_domain_name
  alb_dns_name           = module.ecs.alb_dns_name
  alb_zone_id            = module.ecs.alb_zone_id
}

module "cicd" {
  source                      = "./modules/cicd"
  name_prefix                 = local.name_prefix
  github_repo                 = var.github_repo
  create_oidc_provider        = var.create_github_oidc_provider
  ecr_repository_arns         = module.ecr.repository_arns
  frontend_bucket_arn         = module.frontend.bucket_arn
  cloudfront_distribution_arn = module.frontend.distribution_arn
  execution_role_arn          = module.ecs.execution_role_arn
  task_role_arn               = module.ecs.task_role_arn
}
