output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster"
}

output "cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "The ARN of the ECS cluster"
}

output "service_name" {
  value       = aws_ecs_service.api.name
  description = "The name of the ECS service"
}

output "security_group_id" {
  value       = aws_security_group.ecs.id
  description = "Security group ID for the ECS service"
}
