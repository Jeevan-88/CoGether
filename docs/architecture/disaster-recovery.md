# Disaster Recovery, Business Continuity & Backup Strategy: CoGether

## 1. Disaster Recovery Objectives

- **Recovery Point Objective (RPO)**: <= 5 minutes (maximum acceptable data loss).
- **Recovery Time Objective (RTO)**: <= 30 minutes (maximum acceptable downtime).

---

## 2. Backup & Replication Architecture

### PostgreSQL 16
- **Continuous Archiving / WAL Shipping**: Write-Ahead Logs (WAL) streamed continuously to multi-region object storage (S3/GCS) enabling Point-In-Time Recovery (PITR) up to 30 days.
- **Automated Daily Snapshots**: Full encrypted database snapshots executed every 24 hours with automated 90-day retention policies.
- **Read Replicas**: In-region read replica for read-heavy game catalog queries, and cross-region replica for rapid failover.

### Redis 7
- **Persistence Model**: AOF (Append Only File) configured with `appendfsync everysec` and RDB snapshots taken every 15 minutes.
- **Replication**: Master-replica replication with automated Sentinel / cluster failover (< 10 seconds).
- **Transient State Resilience**: Because Redis stores ephemeral room state, a complete Redis loss drops active WebRTC rooms, but user accounts and persistent game scores in PostgreSQL remain intact.

---

## 3. Disaster Scenarios & Playbooks

| Scenario | Severity | Automated Response | Manual SRE Action |
| :--- | :--- | :--- | :--- |
| **Single Pod Failure** | Low | Kubernetes restarts pod automatically | None (investigate logs if restart loops) |
| **Availability Zone (AZ) Outage** | Medium | Cloud Load Balancer shifts traffic to remaining AZs | Verify autoscaler scales up capacity in remaining AZs |
| **Database Primary Failure** | High | Multi-AZ RDS automatically promotes standby replica (approx. 60–120s) | Monitor connection pool drainage and reconnects |
| **Full Region Catastrophe** | Critical | Cloudflare DNS traffic shifted to secondary region via Geo-Steering | Restore PostgreSQL from cross-region WAL / snapshot replica |
