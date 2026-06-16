# Default provider — all regional resources: VPC, ECS, RDS, ElastiCache, ALB,
# ECR, Secrets Manager, and the ACM certificate used by the ALB.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# CloudFront only accepts an ACM certificate that lives in us-east-1, no matter
# which region the rest of the stack runs in. This aliased provider is passed to
# the acm module purely to issue the CloudFront (frontend) viewer certificate.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}
