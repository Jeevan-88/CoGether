variable "environment" {
  type        = string
  description = "Deployment environment name (staging or production)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones"
  default     = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for application private subnets"
  default     = []
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets"
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway (set to false for lean EC2 staging to eliminate NAT charges)"
  default     = false
}

variable "enable_elasticache_subnet_group" {
  type        = bool
  description = "Enable ElastiCache subnet group (set to false for lean EC2 staging to eliminate ElastiCache resources)"
  default     = false
}
