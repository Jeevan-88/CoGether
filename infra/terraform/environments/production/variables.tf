variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-2"
}

variable "container_image" {
  type        = string
  description = "Docker image URI for production deployment"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for production HTTPS domain (api.cogether.tech)"
}
