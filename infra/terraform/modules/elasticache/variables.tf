variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "redis_subnet_group_name" {
  type        = string
  description = "ElastiCache Subnet Group name"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID of the ECS application cluster"
}

variable "node_type" {
  type        = string
  description = "ElastiCache node instance type"
  default     = "cache.t4g.medium"
}

variable "num_cache_clusters" {
  type        = number
  description = "Number of cache nodes in the replication group"
  default     = 1
}
