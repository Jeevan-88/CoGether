output "backend_public_ip" {
  value       = module.ec2_backend.public_ip
  description = "Staging Backend Elastic IPv4 address"
}

output "backend_instance_id" {
  value       = module.ec2_backend.instance_id
  description = "Staging EC2 backend instance ID"
}

output "rds_endpoint" {
  value       = module.rds.endpoint
  description = "Staging PostgreSQL connection endpoint"
}

output "secrets_manager_arn" {
  value       = aws_secretsmanager_secret.app_secrets.arn
  description = "AWS Secrets Manager staging secret ARN"
}

output "ssm_connect_command" {
  value       = "aws ssm start-session --target ${module.ec2_backend.instance_id} --region ${var.aws_region}"
  description = "SSM Session Manager command to access staging instance securely without SSH"
}
