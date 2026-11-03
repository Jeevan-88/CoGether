# CoGether Infrastructure as Code (Terraform)

This directory contains production-ready Terraform definitions for provisioning CoGether infrastructure on AWS.

## Architecture

- **VPC Module:** Multi-AZ 3-tier networking (Public, Private Application, Isolated Database subnets) with NAT Gateways and Internet Gateway.
- **RDS Module:** AWS RDS Aurora / PostgreSQL 16 with Multi-AZ, automated backups, performance insights, and KMS encryption.
- **ElastiCache Module:** Redis 7 replication group with in-transit and at-rest encryption, auth token, and append-only persistence enabled.
- **ALB Module:** Application Load Balancer with TLS 1.3 ACM certificate listener, HTTP-to-HTTPS redirect, and health checks on `/health/live`.
- **ECS Module:** AWS ECS Fargate cluster with autoscaling, task definitions reading secrets from AWS Secrets Manager, and CloudWatch log groups.
- **IAM Module:** Least-privilege IAM roles and execution policies.

## Directory Structure

```
infra/terraform/
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ alb/
â”‚   â”œâ”€â”€ ecs/
â”‚   â”œâ”€â”€ elasticache/
â”‚   â”œâ”€â”€ iam/
â”‚   â”œâ”€â”€ rds/
â”‚   â””â”€â”€ vpc/
â””â”€â”€ environments/
    â”œâ”€â”€ staging/
    â””â”€â”€ production/
```

## Deployment Instructions

### 1. Initialize Backend State
Ensure the S3 state bucket and DynamoDB lock table exist in AWS (`ap-south-2`):
```bash
aws s3api create-bucket --bucket cogether-terraform-state-staging --region ap-south-2
aws dynamodb create-table --table-name cogether-terraform-locks-staging --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region ap-south-2
```

### 2. Plan and Apply Staging
```bash
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with actual ACM Certificate and ECR image URI
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 3. Plan and Apply Production
```bash
cd infra/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```
