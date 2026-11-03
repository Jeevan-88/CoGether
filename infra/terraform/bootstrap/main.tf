terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CoGether"
      Environment = "bootstrap"
      ManagedBy   = "Terraform"
      Purpose     = "Terraform-State-Backend"
    }
  }
}

variable "aws_region" {
  type        = string
  description = "AWS Region for Terraform remote state backend"
  default     = "ap-south-1"
}

variable "state_bucket_name" {
  type        = string
  description = "Name of S3 bucket for Terraform remote state"
  default     = "cogether-terraform-state-staging"
}

variable "lock_table_name" {
  type        = string
  description = "Name of DynamoDB table for Terraform state locking"
  default     = "cogether-terraform-locks-staging"
}

# 1. Terraform S3 Remote State Bucket
resource "aws_s3_bucket" "terraform_state" {
  bucket        = var.state_bucket_name
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.state_bucket_name
    Environment = "staging"
  }
}

# 2. Enforce S3 Bucket Versioning (Preserves state history and rollback capability)
resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 3. Enforce Server-Side Encryption (AES256 / SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 4. Strict Public Access Blocking (Zero Public Access)
resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 5. Bucket Policy Enforcing TLS / In-Transit Encryption
resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# 6. DynamoDB Table for Distributed State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.lock_table_name
    Environment = "staging"
  }
}

output "s3_bucket_id" {
  value       = aws_s3_bucket.terraform_state.id
  description = "Remote Terraform State S3 Bucket Name"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.terraform_state.arn
  description = "Remote Terraform State S3 Bucket ARN"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "Remote State DynamoDB Lock Table Name"
}

output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.terraform_locks.arn
  description = "Remote State DynamoDB Lock Table ARN"
}
