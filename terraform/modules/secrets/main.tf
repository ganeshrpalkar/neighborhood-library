# Application secrets generated in-stack and stored in Secrets Manager.
# DATABASE_URL / REDIS_URL are composed by the data module (it owns the
# endpoints); this module owns the values that have no other home.

variable "name_prefix" { type = string }

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "secret_key" {
  length  = 64
  special = false
}

# Alphanumeric only: avoids RDS-disallowed characters AND URL-encoding issues
# when the password is embedded in DATABASE_URL.
resource "random_password" "db" {
  length  = 40
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${var.name_prefix}/jwt-secret-key"
  description             = "HS256 JWT signing key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

resource "aws_secretsmanager_secret" "secret_key" {
  name                    = "${var.name_prefix}/secret-key"
  description             = "Application SECRET_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "secret_key" {
  secret_id     = aws_secretsmanager_secret.secret_key.id
  secret_string = random_password.secret_key.result
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name_prefix}/db-master-password"
  description             = "RDS master password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db.result
}

output "jwt_secret_arn" { value = aws_secretsmanager_secret.jwt.arn }
output "secret_key_arn" { value = aws_secretsmanager_secret.secret_key.arn }
output "db_password_secret_arn" { value = aws_secretsmanager_secret.db.arn }

output "db_master_password" {
  value     = random_password.db.result
  sensitive = true
}
