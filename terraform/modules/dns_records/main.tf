# Route53 alias records: the app domain -> CloudFront, the api host -> ALB.
# Split from the acm module so certs (which only need the zone) can be created
# before the ALB/CloudFront they front, avoiding a module dependency cycle.

variable "zone_id" { type = string }
variable "domain" { type = string }
variable "api_fqdn" { type = string }
variable "cloudfront_domain_name" { type = string }
variable "alb_dns_name" { type = string }
variable "alb_zone_id" { type = string }

locals {
  # Fixed hosted zone ID for all CloudFront distributions.
  cloudfront_hosted_zone_id = "Z2FDTNDATAQYW2"
}

resource "aws_route53_record" "app_a" {
  zone_id = var.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_aaaa" {
  zone_id = var.zone_id
  name    = var.domain
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_a" {
  zone_id = var.zone_id
  name    = var.api_fqdn
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_aaaa" {
  zone_id = var.zone_id
  name    = var.api_fqdn
  type    = "AAAA"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
