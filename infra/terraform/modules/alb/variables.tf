variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for the ALB"
}

variable "certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for HTTPS listener"
  default     = null
}
