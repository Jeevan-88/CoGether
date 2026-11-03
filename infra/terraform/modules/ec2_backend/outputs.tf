output "public_ip" {
  value       = aws_eip.backend_eip.public_ip
  description = "Elastic Public IP of the CoGether EC2 backend"
}

output "instance_id" {
  value       = aws_instance.backend.id
  description = "EC2 Instance ID"
}

output "security_group_id" {
  value       = aws_security_group.ec2.id
  description = "Security Group ID of the EC2 backend"
}
