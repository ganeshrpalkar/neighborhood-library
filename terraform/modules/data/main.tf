# Data layer: RDS PostgreSQL + ElastiCache Redis in private subnets.
# Composes the full DATABASE_URL (with the master password) into Secrets Manager
# so ECS can inject it as a secret with no app changes.

variable "name_prefix" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_sg_id" { type = string }
variable "redis_sg_id" { type = string }

variable "db_password" {
  type      = string
  sensitive = true
}
variable "db_instance_class" { type = string }
variable "db_allocated_storage" { type = number }
variable "db_engine_version" { type = string }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "multi_az" { type = bool }
variable "backup_retention_days" { type = number }
variable "deletion_protection" { type = bool }

variable "redis_node_type" { type = string }
variable "redis_engine_version" { type = string }

# --- PostgreSQL ---
resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "${var.name_prefix}-db-subnets" }
}

resource "aws_db_instance" "this" {
  identifier            = "${var.name_prefix}-postgres"
  engine                = "postgres"
  engine_version        = var.db_engine_version
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 5 # storage autoscaling ceiling
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name      = aws_db_subnet_group.this.name
  vpc_security_group_ids    = [var.rds_sg_id]
  multi_az                  = var.multi_az
  backup_retention_period   = var.backup_retention_days
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${var.name_prefix}-postgres-final" : null
  apply_immediately         = true

  tags = { Name = "${var.name_prefix}-postgres" }
}

# --- ElastiCache Redis (single node, cluster-mode disabled) ---
resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "${var.name_prefix}-redis-subnets" }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${var.name_prefix}-redis"
  description                = "Redis for ${var.name_prefix}"
  engine                     = "redis"
  engine_version             = var.redis_engine_version
  node_type                  = var.redis_node_type
  num_cache_clusters         = 1
  automatic_failover_enabled = false
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [var.redis_sg_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # REDIS_URL stays plain redis:// (no AUTH)
  apply_immediately          = true

  tags = { Name = "${var.name_prefix}-redis" }
}

# --- DATABASE_URL secret (SQLAlchemy psycopg URL, includes the password) ---
locals {
  database_url = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.this.address}:5432/${var.db_name}"
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name_prefix}/database-url"
  description             = "SQLAlchemy connection URL for the API/worker"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

output "database_url_secret_arn" { value = aws_secretsmanager_secret.database_url.arn }
output "db_endpoint" { value = aws_db_instance.this.address }
output "redis_endpoint" { value = aws_elasticache_replication_group.this.primary_endpoint_address }
