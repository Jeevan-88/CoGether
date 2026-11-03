variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-1"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_id" {
  type        = string
  description = "Public subnet ID for hosting the EC2 backend"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t4g.small" # 2 vCPU, 2 GB RAM Graviton3 (~$12.26/mo in ap-south-1)
}
