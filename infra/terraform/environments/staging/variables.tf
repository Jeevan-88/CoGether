variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-1"
}

variable "container_image" {
  type        = string
  description = "Docker image URI for staging deployment"
  default     = "cogether-api:staging-latest"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for staging HTTPS domain"
  default     = null
}
