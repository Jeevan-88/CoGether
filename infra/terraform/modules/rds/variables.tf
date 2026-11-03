variable "environment" {
  type        = string
  description = "Environment (staging or production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "database_subnet_group_name" {
  type        = string
  description = "Subnet group name for RDS"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID of the ECS application cluster"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
  default     = 50
}

variable "max_allocated_storage" {
  type        = number
  description = "Autoscaling storage upper ceiling in GB"
  default     = 200
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ high availability deployment"
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention window in days"
  default     = 7
}

variable "deletion_protection" {
  type        = bool
  description = "Prevent accidental RDS deletion"
  default     = false
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final DB snapshot on deletion (set to false for safety so a final snapshot is always created)"
  default     = false
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Key ARN for storage encryption"
  default     = null
}
