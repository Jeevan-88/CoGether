# Observability, Telemetry & SLO Specification: CoGether

## 1. Structured JSON Logging Standard

Every log emitted across the CoGether platform is formatted as a single-line JSON object adhering to the OpenTelemetry semantic conventions:

```json
{
  "timestamp": "2026-09-13T16:05:30.124Z",
  "level": "info",
  "service": "cogether-api",
  "environment": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "userId": "usr_981a2f",
  "method": "POST",
  "path": "/api/v1/coplay/scores",
  "statusCode": 200,
  "durationMs": 14.8,
  "message": "Game score successfully recorded and verified",
  "context": {
    "gameId": "2048",
    "score": 16384
  }
}
```

---

## 2. Distributed Tracing & W3C Trace Context

- **Standards**: W3C TraceContext (`traceparent`, `tracestate`).
- **Propagation**: Incoming `traceparent` headers are extracted by the API gateway or Express correlation middleware; child spans are propagated to internal service calls and Kafka event metadata.
- **Trace Id Extraction**: If no incoming trace header exists, a random 128-bit trace ID and 64-bit span ID are generated.

---

## 3. Prometheus Metrics Taxonomy (Four Golden Signals)

| Signal | Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Traffic** | `http_requests_total` | Counter | `service, method, path, status` | Inbound HTTP request volume |
| **Latency** | `http_request_duration_seconds` | Histogram | `service, path, status` | Latency distribution (p50, p90, p99) |
| **Errors** | `http_request_errors_total` | Counter | `service, path, error_type` | 5xx and critical application errors |
| **Saturation** | `process_cpu_usage_ratio` | Gauge | `service, instance` | Node.js process CPU utilization |
| **Saturation** | `process_resident_memory_bytes` | Gauge | `service, instance` | Heap and resident memory footprint |
| **Realtime** | `websocket_connections_active` | Gauge | `room_type` | Active concurrent WebSocket connections |
| **Realtime** | `webrtc_signaling_events_total` | Counter | `event_type` | Signaling throughput (`offer`, `answer`, `ice`) |

---

## 4. Kubernetes Health & Readiness Model

```
               [ kubelet ]
                    |
      +-------------+-------------+
      |                           |
(Every 10s)                   (Every 5s)
      v                           v
GET /health/live            GET /health/ready
      |                           |
[ Process Alive? ]          [ DB & Redis Connected? ]
      |                           |
(HTTP 200 = OK)             (HTTP 200 = OK / HTTP 503 = Drain)
```

1. **`/health/live` (Liveness Probe)**:
   - Verifies the Node.js event loop is responsive.
   - Failure indicates process deadlock or unbounded memory leak -> triggers pod restart.
2. **`/health/ready` (Readiness Probe)**:
   - Verifies connectivity to PostgreSQL and Redis.
   - Failure indicates temporary dependency degradation -> kubelet removes pod from load balancer traffic without restarting.
3. **`/health/startup` (Startup Probe)**:
   - Verifies schema migrations and initialization caches are loaded before traffic is accepted.

---

## 5. Service Level Objectives (SLOs) & Error Budgets

| Service | Target Metric | Target SLO | Measurement Window |
| :--- | :--- | :--- | :--- |
| **API Availability** | Successful HTTP 2xx/3xx/4xx requests | 99.95% | Rolling 30 days |
| **API Latency** | HTTP request duration | P95 < 80ms, P99 < 200ms | Rolling 7 days |
| **Realtime Signaling** | Socket.IO message transit latency | P99 < 30ms | Rolling 24 hours |
| **Video Playback Sync** | Peer time drift | < 250ms for 98% of checks | Continuous |
