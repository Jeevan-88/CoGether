resource "aws_security_group" "rds" {
  name        = "cogether-${var.environment}-rds-sg"
  description = "Access control for CoGether PostgreSQL RDS cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL access from application tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "cogether-${var.environment}-rds-sg"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "pg16" {
  name        = "cogether-${var.environment}-pg16-params"
  family      = "postgres16"
  description = "Hardened parameter group for CoGether PostgreSQL 16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "0"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "500" # Log queries taking longer than 500ms
  }
}

resource "aws_db_instance" "postgresql" {
  identifier            = "cogether-${var.environment}-db"
  engine                = "postgres"
  engine_version        = "16.2"
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name                     = "cogether_db"
  username                    = "cogether_admin"
  manage_master_user_password = true # Auto-managed by AWS Secrets Manager

  publicly_accessible    = false
  multi_az               = var.multi_az
  db_subnet_group_name   = var.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  backup_retention_period     = var.backup_retention_period
  backup_window               = "03:00-04:00"
  maintenance_window          = "Sun:04:30-Sun:05:30"
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = var.skip_final_snapshot
  final_snapshot_identifier   = "cogether-${var.environment}-db-final-snapshot"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = {
    Name        = "cogether-${var.environment}-db"
    Environment = var.environment
  }
}
