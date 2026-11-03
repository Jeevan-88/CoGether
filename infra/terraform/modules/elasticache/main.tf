resource "aws_security_group" "redis" {
  name        = "cogether-${var.environment}-redis-sg"
  description = "Access control for CoGether Redis cache cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis port access from ECS application tier"
    from_port       = 6379
    to_port         = 6379
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
    Name        = "cogether-${var.environment}-redis-sg"
    Environment = var.environment
  }
}

resource "aws_elasticache_parameter_group" "redis7" {
  name        = "cogether-${var.environment}-redis7-params"
  family      = "redis7"
  description = "Redis 7 parameter group with appendonly persistence enabled"

  parameter {
    name  = "appendonly"
    value = "yes"
  }

  parameter {
    name  = "appendfsync"
    value = "everysec"
  }

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "cogether-${var.environment}-redis"
  description          = "CoGether Redis replication group for presence & ratelimiting"
  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_clusters
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  subnet_group_name    = var.redis_subnet_group_name
  security_group_ids   = [aws_security_group.redis.id]

  automatic_failover_enabled = var.num_cache_clusters > 1
  multi_az_enabled           = var.num_cache_clusters > 1

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  snapshot_retention_limit   = var.environment == "production" ? 7 : 1
  snapshot_window            = "02:00-03:00"
  maintenance_window         = "sun:03:30-sun:04:30"
  auto_minor_version_upgrade = true

  tags = {
    Name        = "cogether-${var.environment}-redis"
    Environment = var.environment
  }
}
