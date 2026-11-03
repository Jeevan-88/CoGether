terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  backend "s3" {
    bucket         = "cogether-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "cogether-terraform-locks-staging"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project      = "CoGether"
      Environment  = "staging"
      ManagedBy    = "Terraform"
      Architecture = "Lean-EC2"
    }
  }
}

# 1. Dedicated Isolated Staging VPC (Zero overlap with default VPC)
module "vpc" {
  source                = "../../modules/vpc"
  environment           = "staging"
  vpc_cidr              = "10.10.0.0/16"
  availability_zones    = ["ap-south-1a", "ap-south-1b"]
  public_subnet_cidrs   = ["10.10.1.0/24", "10.10.2.0/24"]
  database_subnet_cidrs = ["10.10.21.0/24", "10.10.22.0/24"]
  private_subnet_cidrs  = []
  enable_nat_gateway    = false # Zero NAT Gateway charges ($0.00 vs $32.85/mo)
}

# 2. Hardened EC2 Backend (IMDSv2, SSM, Encrypted EBS, Docker & Nginx, Elastic IP)
module "ec2_backend" {
  source           = "../../modules/ec2_backend"
  environment      = "staging"
  aws_region       = var.aws_region
  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.vpc.public_subnet_ids[0]
  instance_type    = "t4g.small" # 2 vCPU, 2 GB RAM Graviton3 (~$12.26/mo)
}

# 3. Private Managed PostgreSQL 16 RDS (Ingress restricted ONLY to EC2 security group)
module "rds" {
  source                     = "../../modules/rds"
  environment                = "staging"
  vpc_id                     = module.vpc.vpc_id
  database_subnet_group_name = module.vpc.database_subnet_group_name
  ecs_security_group_id      = module.ec2_backend.security_group_id
  instance_class             = "db.t4g.micro" # 2 vCPU, 1 GB RAM (~$12.41/mo)
  allocated_storage          = 20
  max_allocated_storage      = 50
  multi_az                   = false
  backup_retention_period    = 7
  deletion_protection        = true
  skip_final_snapshot        = false
}

# 4. Scoped Staging Secrets Container
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "cogether/staging/app"
  description             = "CoGether Staging application environment secrets"
  recovery_window_in_days = 7
}
