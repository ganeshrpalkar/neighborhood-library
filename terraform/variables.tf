# ---------------------------------------------------------------------------
# Core / naming
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for all regional resources (VPC, ECS, RDS, ElastiCache, ALB, ECR)."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used as the prefix for every resource. Keep it short — it feeds into AWS names with a 32-char limit (ALB, target groups)."
  type        = string
  default     = "library"
}

variable "environment" {
  description = "Deployment environment. Part of the resource name prefix."
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "tags" {
  description = "Extra tags merged into the default tags applied to every resource."
  type        = map(string)
  default     = {}
}

# ---------------------------------------------------------------------------
# DNS / domains
# ---------------------------------------------------------------------------

variable "domain" {
  description = "Apex/app domain the frontend is served from via CloudFront, e.g. \"library.example.com\". The API is served from \"<api_subdomain>.<domain>\"."
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain (label) for the backend API. With domain=library.example.com and api_subdomain=api, the API host is api.library.example.com."
  type        = string
  default     = "api"
}

variable "route53_zone_name" {
  description = "Name of the Route53 hosted zone that serves the domain, e.g. \"example.com\". Leave empty to use var.domain itself (correct when the domain is the zone apex). Set it when var.domain is a subdomain like library.example.com served by the example.com zone."
  type        = string
  default     = ""
}

variable "create_hosted_zone" {
  description = "If true, create the Route53 hosted zone (route53_zone_name). If false (default), an existing hosted zone is looked up — you must have delegated the domain to it already."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread public/private subnets across (>= 2 for ALB and RDS)."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be at least 2 (ALB and RDS subnet groups require two AZs)."
  }
}

variable "nat_gateway_count" {
  description = "Number of NAT gateways for private-subnet egress. 1 is cheapest; set to az_count for AZ-level HA."
  type        = number
  default     = 1
}

# ---------------------------------------------------------------------------
# Database (RDS PostgreSQL)
# ---------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL major (or major.minor) engine version."
  type        = string
  default     = "16"
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "library"
}

variable "db_username" {
  description = "Master database username."
  type        = string
  default     = "library"
}

variable "rds_multi_az" {
  description = "Run RDS as Multi-AZ (HA, roughly doubles DB cost)."
  type        = bool
  default     = false
}

variable "rds_backup_retention_days" {
  description = "Automated backup retention in days."
  type        = number
  default     = 7
}

variable "rds_deletion_protection" {
  description = "Protect the RDS instance from accidental destroy. When true, a final snapshot is taken on destroy."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Cache (ElastiCache Redis)
# ---------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

# ---------------------------------------------------------------------------
# ECS Fargate — API and worker sizing
# ---------------------------------------------------------------------------

variable "container_image_tag" {
  description = "Image tag the task definitions reference on first apply. CI registers new revisions per deploy; \"latest\" is fine for bootstrapping."
  type        = string
  default     = "latest"
}

variable "api_cpu" {
  description = "Fargate CPU units for the API task (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task."
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Baseline number of API tasks."
  type        = number
  default     = 2
}

variable "api_min_count" {
  description = "Autoscaling minimum for the API service."
  type        = number
  default     = 1
}

variable "api_max_count" {
  description = "Autoscaling maximum for the API service."
  type        = number
  default     = 4
}

variable "worker_cpu" {
  description = "Fargate CPU units for the Celery worker task."
  type        = number
  default     = 256
}

variable "worker_memory" {
  description = "Fargate memory (MiB) for the Celery worker task."
  type        = number
  default     = 512
}

variable "worker_desired_count" {
  description = "Number of Celery worker tasks."
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for ECS task logs."
  type        = number
  default     = 30
}

# ---------------------------------------------------------------------------
# CI/CD identity (GitHub Actions OIDC)
# ---------------------------------------------------------------------------

variable "github_repo" {
  description = "GitHub repository in \"owner/name\" form. The CI deploy role trusts OIDC tokens from this repo."
  type        = string
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider in IAM. Set false if it already exists in the account (only one is allowed)."
  type        = bool
  default     = true
}
