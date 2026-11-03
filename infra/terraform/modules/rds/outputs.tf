output "endpoint" {
  value       = aws_db_instance.postgresql.endpoint
  description = "The connection endpoint for the PostgreSQL instance"
}

output "address" {
  value       = aws_db_instance.postgresql.address
  description = "The hostname of the PostgreSQL instance"
}

output "port" {
  value       = aws_db_instance.postgresql.port
  description = "The database port"
}

output "db_name" {
  value       = aws_db_instance.postgresql.db_name
  description = "The database name"
}

output "master_user_secret_arn" {
  value       = aws_db_instance.postgresql.master_user_secret[0].secret_arn
  description = "Secrets Manager ARN holding auto-rotated master credentials"
}

output "security_group_id" {
  value       = aws_security_group.rds.id
  description = "Security group ID for RDS"
}
