# ADR-006: Kubernetes Stateless Pods and Scaling Policy

## Status
Accepted

## Context
CoGether workloads consist of stateless REST APIs, long-lived WebSocket connections, and asynchronous batch workers. Mixing these workloads in monolithic deployments complicates autoscaling and deployment rollouts.

## Decision
Deploy workloads into **Isolated Kubernetes Deployments**:
1. `cogether-api`: Stateless HTTP REST services, scaling on CPU and request latency.
2. `cogether-realtime`: Persistent Socket.IO gateway pods, scaling on active socket connection counts with a 60-second connection draining grace period.
3. `cogether-workers`: Asynchronous event and outbox processors, scaling on Kafka consumer lag.

## Consequences
- **Positive**: Isolated blast radiuses; fine-tuned autoscaling policies; zero downtime rolling deployments.
- **Negative**: Requires maintaining separate container deployment manifests.
