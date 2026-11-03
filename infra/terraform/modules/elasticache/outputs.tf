output "primary_endpoint_address" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint address for the Redis replication group"
}

output "reader_endpoint_address" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Reader endpoint address for scaling read operations"
}

output "port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "Port number on which the cluster accepts connections"
}

output "auth_token" {
  value       = random_password.redis_auth_token.result
  sensitive   = true
  description = "Generated Redis AUTH token"
}

output "security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security group ID for Redis"
}
