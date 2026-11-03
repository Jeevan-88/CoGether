output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the load balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "The ARN of the load balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.api.arn
  description = "The ARN of the ECS API target group"
}

output "security_group_id" {
  value       = aws_security_group.alb.id
  description = "The security group ID of the ALB"
}
