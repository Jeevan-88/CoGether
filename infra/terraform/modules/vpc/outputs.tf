output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs of the public subnets"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "IDs of the private application subnets"
}

output "database_subnet_group_name" {
  value       = aws_db_subnet_group.rds.name
  description = "Name of the RDS database subnet group"
}

output "redis_subnet_group_name" {
  value       = var.enable_elasticache_subnet_group ? aws_elasticache_subnet_group.redis[0].name : null
  description = "Name of the ElastiCache subnet group"
}
