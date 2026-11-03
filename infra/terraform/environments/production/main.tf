terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "cogether-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "ap-south-2"
    encrypt        = true
    dynamodb_table = "cogether-terraform-locks-prod"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CoGether"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

module "vpc" {
  source                = "../../modules/vpc"
  environment           = "production"
  vpc_cidr              = "10.20.0.0/16"
  availability_zones    = ["ap-south-2a", "ap-south-2b", "ap-south-2c"]
  public_subnet_cidrs   = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
  private_subnet_cidrs  = ["10.20.11.0/24", "10.20.12.0/24", "10.20.13.0/24"]
  database_subnet_cidrs = ["10.20.21.0/24", "10.20.22.0/24", "10.20.23.0/24"]
}

module "iam" {
  source      = "../../modules/iam"
  environment = "production"
}

module "alb" {
  source            = "../../modules/alb"
  environment       = "production"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.acm_certificate_arn
}

module "rds" {
  source                     = "../../modules/rds"
  environment                = "production"
  vpc_id                     = module.vpc.vpc_id
  database_subnet_group_name = module.vpc.database_subnet_group_name
  ecs_security_group_id      = module.ecs.security_group_id
  instance_class             = "db.r6g.xlarge"
  allocated_storage          = 100
  max_allocated_storage      = 500
  multi_az                   = true
  backup_retention_period    = 30
  deletion_protection        = true
}

module "elasticache" {
  source                  = "../../modules/elasticache"
  environment             = "production"
  vpc_id                  = module.vpc.vpc_id
  redis_subnet_group_name = module.vpc.redis_subnet_group_name
  ecs_security_group_id   = module.ecs.security_group_id
  node_type               = "cache.r6g.large"
  num_cache_clusters      = 3 # Primary + 2 Multi-AZ Read Replicas
}

# Production Application Secrets in Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "cogether/production/app"
  description = "CoGether Production authoritative secrets"
}

module "ecs" {
  source                = "../../modules/ecs"
  environment           = "production"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.security_group_id
  target_group_arn      = module.alb.target_group_arn
  execution_role_arn    = module.iam.execution_role_arn
  task_role_arn         = module.iam.task_role_arn
  app_secrets_arn       = aws_secretsmanager_secret.app_secrets.arn
  container_image       = var.container_image
  desired_count         = 4
  max_count             = 20
  cpu                   = "2048"
  memory                = "4096"
}
