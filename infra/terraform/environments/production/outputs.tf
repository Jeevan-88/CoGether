output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "Production Application Load Balancer DNS"
}

output "rds_endpoint" {
  value       = module.rds.endpoint
  description = "Production PostgreSQL Multi-AZ connection endpoint"
}

output "redis_endpoint" {
  value       = module.elasticache.primary_endpoint_address
  description = "Production Redis primary endpoint"
}

output "ecs_service_name" {
  value       = module.ecs.service_name
  description = "Production ECS service name"
}
