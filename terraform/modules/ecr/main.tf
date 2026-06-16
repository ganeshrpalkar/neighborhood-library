# ECR repositories for the api and worker images, with a lifecycle policy that
# expires untagged layers and caps retained tagged images.

variable "name_prefix" { type = string }

locals {
  repos = ["api", "worker"]
}

resource "aws_ecr_repository" "this" {
  for_each             = toset(local.repos)
  name                 = "${var.name_prefix}-${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # allow `terraform destroy` to remove repos with images

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = "${var.name_prefix}-${each.key}" }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only the 20 most recent images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = { type = "expire" }
      },
    ]
  })
}

output "api_repository_url" { value = aws_ecr_repository.this["api"].repository_url }
output "worker_repository_url" { value = aws_ecr_repository.this["worker"].repository_url }
output "repository_arns" { value = [for r in aws_ecr_repository.this : r.arn] }
