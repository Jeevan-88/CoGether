resource "aws_security_group" "ec2" {
  name        = "cogether-${var.environment}-ec2-sg"
  description = "Security group for CoGether EC2 backend host"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS API and WebSocket ingress (Nginx reverse proxy)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP ingress for ACME Lets Encrypt verification and redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound to internet, RDS, and external APIs"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "cogether-${var.environment}-ec2-sg"
    Environment = var.environment
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "cogether-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "cogether-${var.environment}-ec2-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "ec2_secrets_policy" {
  name        = "cogether-${var.environment}-ec2-secrets-read"
  description = "Scoped read access to CoGether Secrets Manager secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:cogether/${var.environment}/*",
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:rds!db-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/cogether/${var.environment}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_secrets_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_secrets_policy.arn
}

resource "aws_iam_role_policy_attachment" "ec2_ssm_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "cogether-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  # Enforce IMDSv2 to prevent SSRF credential theft
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = <<-EOF
              #!/bin/bash
              set -euo pipefail

              # 1. System packages and prerequisites
              export DEBIAN_FRONTEND=noninteractive
              apt-get update -y
              apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                docker.io \
                docker-compose-v2 \
                nginx \
                certbot \
                python3-certbot-nginx \
                awscli \
                jq

              # 2. Verify and configure AWS SSM Agent
              if command -v snap >/dev/null 2>&1; then
                snap install amazon-ssm-agent --classic || true
                systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service || true
              fi

              # Direct deb package fallback if snap service is not active
              if ! systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent.service && ! systemctl is-active --quiet amazon-ssm-agent; then
                echo "Installing amazon-ssm-agent from official AWS S3 deb package..."
                curl -fsSL "https://s3.ap-south-1.amazonaws.com/amazon-ssm-ap-south-1/latest/debian_arm64/amazon-ssm-agent.deb" -o /tmp/amazon-ssm-agent.deb
                dpkg -i /tmp/amazon-ssm-agent.deb || apt-get install -f -y
                systemctl enable --now amazon-ssm-agent
              fi

              # 3. Configure Docker and Daemon Security
              systemctl enable --now docker
              usermod -aG docker ubuntu

              cat <<'DOCKERCONF' > /etc/docker/daemon.json
              {
                "log-driver": "json-file",
                "log-opts": {
                  "max-size": "50m",
                  "max-file": "3"
                }
              }
              DOCKERCONF
              systemctl restart docker

              # 4. Configure and Launch Local Redis Container (Host Loopback Only)
              mkdir -p /opt/cogether/redis-data
              docker run -d \
                --name cogether-redis \
                --restart always \
                -p 127.0.0.1:6379:6379 \
                -v /opt/cogether/redis-data:/data \
                redis:7-alpine redis-server --appendonly yes --protected-mode yes

              # 5. Configure Nginx Reverse Proxy with WebSocket and ACME Support
              rm -f /etc/nginx/sites-enabled/default

              cat <<'NGINXCONF' > /etc/nginx/sites-available/cogether.conf
              upstream cogether_backend {
                  server 127.0.0.1:3001;
                  keepalive 64;
              }

              map $http_upgrade $connection_upgrade {
                  default upgrade;
                  ''      close;
              }

              server {
                  listen 80;
                  listen [::]:80;
                  server_name staging-api.cogether.tech;

                  location /.well-known/acme-challenge/ {
                      root /var/www/certbot;
                      allow all;
                  }

                  location / {
                      proxy_pass http://cogether_backend;
                      proxy_http_version 1.1;
                      proxy_set_header Upgrade $http_upgrade;
                      proxy_set_header Connection $connection_upgrade;
                      proxy_set_header Host $host;
                      proxy_set_header X-Real-IP $remote_addr;
                      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                      proxy_set_header X-Forwarded-Proto $scheme;
                      proxy_read_timeout 86400s;
                      proxy_send_timeout 86400s;
                      proxy_connect_timeout 60s;
                      proxy_buffering off;
                      client_max_body_size 50M;
                  }
              }
              NGINXCONF

              mkdir -p /var/www/certbot
              ln -sf /etc/nginx/sites-available/cogether.conf /etc/nginx/sites-enabled/cogether.conf
              nginx -t && systemctl restart nginx
              systemctl enable nginx

              # 6. Prepare Backend Application and Deployment Directory
              mkdir -p /opt/cogether/app
              mkdir -p /opt/cogether/scripts

              cat <<'DEPLOYSCRIPT' > /opt/cogether/scripts/deploy.sh
              #!/bin/bash
              set -euo pipefail

              IMAGE_TAG="$${1:-staging-latest}"
              RUN_MIGRATIONS="$${2:-false}"
              AWS_REGION="${var.aws_region}"
              SECRET_ID="cogether/${var.environment}/app"

              echo "=== Starting CoGether Backend Deployment ==="
              echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
              echo "Image Tag: $${IMAGE_TAG}"

              echo "Resolving secrets from AWS Secrets Manager..."
              SECRETS_JSON=$(aws secretsmanager get-secret-value --secret-id "$${SECRET_ID}" --region "$${AWS_REGION}" --query SecretString --output text)

              echo "$${SECRETS_JSON}" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > /opt/cogether/app/.env
              chmod 600 /opt/cogether/app/.env

              echo "Restarting application container (zero migration rerun)..."
              docker stop cogether-backend || true
              docker rm cogether-backend || true

              echo "Launching cogether-backend container..."
              docker run -d \
                --name cogether-backend \
                --restart unless-stopped \
                --network host \
                --env-file /opt/cogether/app/.env \
                -e NODE_ENV=${var.environment} \
                -e PORT=3001 \
                -e AWS_REGION="$${AWS_REGION}" \
                cogether-api:$${IMAGE_TAG}

              if [ "$${RUN_MIGRATIONS}" = "--run-migrations" ]; then
                echo "Explicit --run-migrations flag detected. Invoking controlled migration script..."
                /opt/cogether/scripts/migrate.sh
              else
                echo "Database migrations skipped (controlled deployment step). Use /opt/cogether/scripts/migrate.sh to apply migrations."
              fi

              echo "=== Deployment Complete ==="
              DEPLOYSCRIPT

              # 7. Dedicated Controlled Database Migration Script
              cat <<'MIGRATESCRIPT' > /opt/cogether/scripts/migrate.sh
              #!/bin/bash
              set -euo pipefail

              echo "=== CoGether Controlled Database Migration Pipeline ==="
              echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

              if ! docker ps | grep -q cogether-backend; then
                echo "ERROR: cogether-backend container is not running. Start container before migrating."
                exit 1
              fi

              echo "Executing idempotent database migrations in container..."
              docker exec cogether-backend node packages/database/migrator.js

              echo "=== Database Migrations Verified and Completed ==="
              MIGRATESCRIPT

              chmod +x /opt/cogether/scripts/deploy.sh
              chmod +x /opt/cogether/scripts/migrate.sh
              echo "CoGether EC2 Bootstrap Complete at $(date -u)" > /opt/cogether/bootstrap.log
              EOF

  tags = {
    Name        = "cogether-${var.environment}-backend"
    Environment = var.environment
  }
}

resource "aws_eip" "backend_eip" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name        = "cogether-${var.environment}-eip"
    Environment = var.environment
  }
}
