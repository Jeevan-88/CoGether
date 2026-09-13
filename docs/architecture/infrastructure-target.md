# Infrastructure Target, Kubernetes & Terraform Specification: CoGether

## 1. Cloud Target Topology

CoGether is architected for cloud-agnostic containerized deployments on major hyperscalers (AWS / GCP / Azure) behind Cloudflare.

```
                           [ Cloudflare Global Edge ]
                           (DNS, DDoS, SSL, WAF, CDN)
                                       |
                                       v
                             [ Cloud Load Balancer ]
                               (AWS ALB / GCP GLB)
                                       |
                   +-------------------+-------------------+
                   |                                       |
       [ EKS / GKE Pods: Stateless API ]       [ EKS / GKE Pods: Realtime WS ]
       (Autoscaled: 2 to 50 replicas)          (Autoscaled: 2 to 30 replicas)
                   |                                       |
       +-----------+-----------+               +-----------+
       |                       |               |
       v                       v               v
[ Managed PostgreSQL ]   [ Managed Kafka ]  [ Managed Redis ]
(AWS RDS / Neon)        (MSK / Confluent)  (ElastiCache / Upstash)
```

---

## 2. Kubernetes Architecture

### Workload Separation
1. **Stateless API Deployment (`cogether-api`)**:
   - Manages REST endpoints (Identity, CoPlay, CoWatch, CoShop).
   - Horizontal Pod Autoscaler (HPA) configured on CPU (>70%) and HTTP Request Latency (>150ms).
   - Probes: `livenessProbe` on `/health/live`, `readinessProbe` on `/health/ready`, `startupProbe` on `/health/startup`.
2. **Realtime Signaling Gateway Deployment (`cogether-realtime`)**:
   - Manages persistent WebSocket / Socket.IO connections.
   - HPA configured on open connection count and memory utilization.
   - Termination grace period: 60 seconds (allows graceful socket draining and client reconnect migrations).
3. **Async Workers Deployment (`cogether-workers`)**:
   - Transactional outbox tailer, game score verification, affiliate click aggregator.

---

## 3. Terraform Infrastructure as Code (IaC) Layout

```
infra/terraform/
├── modules/
│   ├── vpc/             # VPC, subnets, NAT gateways, security groups
│   ├── kubernetes/      # EKS/GKE cluster, node groups, OIDC provider
│   ├── database/        # Managed PostgreSQL instance, read replicas, backups
│   ├── cache/           # Redis cluster, replication groups
│   ├── eventstream/     # Kafka / MSK cluster or EventHubs
│   └── storage/         # S3 / GCS asset buckets and IAM policies
└── environments/
    ├── dev/             # Minimal sizing, single-AZ, reduced cost
    ├── staging/         # Multi-AZ mirror of production
    └── prod/            # High-availability, multi-AZ, automated backups
```

---

## 4. Cost Efficiency & Resource Sizing (Phase 1 vs Target)

- **Phase 1 (Development & Minimum Platform)**:
  - Local Docker Compose or single low-cost cloud container (~$20–$40/month).
  - Managed serverless PostgreSQL (e.g. Neon free/launch tier) & serverless Redis (Upstash).
- **Target Scale (100k Monthly Active Users)**:
  - Estimated cloud spend: ~$450–$650/month (Kubernetes worker nodes, managed RDS Postgres multi-AZ, managed Redis, S3 egress behind Cloudflare free tier caching).
