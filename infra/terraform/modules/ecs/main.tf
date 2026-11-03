resource "aws_security_group" "ecs" {
  name        = "cogether-${var.environment}-ecs-sg"
  description = "Security group for CoGether ECS Fargate tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound from Application Load Balancer"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    description = "Outbound to private services and internet NAT"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "cogether-${var.environment}-ecs-sg"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/cogether-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = {
    Name        = "cogether-${var.environment}-logs"
    Environment = var.environment
  }
}

resource "aws_ecs_cluster" "main" {
  name = "cogether-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "cogether-${var.environment}-cluster"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "cogether-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "cogether-api"
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3001" },
        { name = "HOST", value = "0.0.0.0" },
        { name = "DATABASE_SSL", value = "true" },
        { name = "STORAGE_PROVIDER", value = "s3" },
        { name = "S3_BUCKET", value = "cogether-${var.environment}-avatars" },
        { name = "S3_REGION", value = var.aws_region }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${var.app_secrets_arn}:DATABASE_URL::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "${var.app_secrets_arn}:REDIS_URL::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "${var.app_secrets_arn}:JWT_SECRET::"
        },
        {
          name      = "OTP_HMAC_KEY"
          valueFrom = "${var.app_secrets_arn}:OTP_HMAC_KEY::"
        },
        {
          name      = "MFA_ENCRYPTION_KEY"
          valueFrom = "${var.app_secrets_arn}:MFA_ENCRYPTION_KEY::"
        },
        {
          name      = "TWILIO_ACCOUNT_SID"
          valueFrom = "${var.app_secrets_arn}:TWILIO_ACCOUNT_SID::"
        },
        {
          name      = "TWILIO_AUTH_TOKEN"
          valueFrom = "${var.app_secrets_arn}:TWILIO_AUTH_TOKEN::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/health/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))\""]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  tags = {
    Name        = "cogether-${var.environment}-task"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "api" {
  name            = "cogether-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "cogether-api"
    container_port   = 3001
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition] # Managed by CD workflow deployments
  }

  tags = {
    Name        = "cogether-${var.environment}-service"
    Environment = var.environment
  }
}

# Auto-scaling target
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_count
  min_capacity       = var.desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale on CPU target 70%
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "cogether-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
