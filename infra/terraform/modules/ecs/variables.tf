variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "ap-south-2"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for the ECS tasks"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID of the Application Load Balancer"
}

variable "target_group_arn" {
  type        = string
  description = "Target group ARN of the ALB"
}

variable "execution_role_arn" {
  type        = string
  description = "IAM execution role ARN"
}

variable "task_role_arn" {
  type        = string
  description = "IAM task role ARN"
}

variable "app_secrets_arn" {
  type        = string
  description = "Secrets Manager ARN for application secrets"
}

variable "container_image" {
  type        = string
  description = "Docker image URI for the container"
  default     = "cogether-api:latest"
}

variable "desired_count" {
  type        = number
  description = "Desired number of running tasks"
  default     = 2
}

variable "max_count" {
  type        = number
  description = "Maximum auto-scaling task capacity"
  default     = 10
}

variable "cpu" {
  type        = string
  description = "Fargate CPU allocation units"
  default     = "1024"
}

variable "memory" {
  type        = string
  description = "Fargate Memory allocation units"
  default     = "2048"
}
