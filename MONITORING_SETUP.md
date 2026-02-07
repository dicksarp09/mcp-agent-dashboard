# Prometheus & Grafana Monitoring Setup

Complete monitoring stack for the MCP Student Agent system.

## Overview

This setup provides:
- ✅ **Prometheus** - Metrics collection and storage
- ✅ **Grafana** - Visualization dashboards
- ✅ **Pre-configured Dashboard** - MCP Agent monitoring out of the box
- ✅ **Auto-refresh** - Metrics update every 5 seconds

## Quick Start

### 1. Start the Monitoring Stack

```bash
# From the project root
docker-compose -f docker-compose.monitoring.yml up -d
```

This will start:
- Prometheus on http://localhost:9090
- Grafana on http://localhost:3001

### 2. Ensure Backend is Running

The monitoring needs your backend API to be running:

```bash
# In another terminal
python start_server.py
```

Backend must be on http://127.0.0.1:8000 (default)

### 3. Access the Dashboards

- **Prometheus**: http://localhost:9090
  - Query metrics directly
  - View targets status
  
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
  - Dashboard auto-loaded: "MCP Student Agent Dashboard"

## Dashboard Panels

### Overview Section
- **Total Requests** - Gauge showing total agent requests
- **Total Failures** - Gauge showing failure count (red threshold at 5)
- **Active Requests** - Real-time active request count
- **Cache Hit Rate** - Percentage gauge (green/yellow/red thresholds)

### Request Rates
- **Agent Requests by Query Type** - Rate of requests over time, split by query type
- **MCP Requests by Status** - Rate of MCP calls, split by status (success, error, etc.)

### Latency
- **Agent Node Latency** - Average latency per node (intent, validation, mcp_call, analysis, response)
- **Component Latency Comparison** - Side-by-side comparison of MCP, LLM, and Analysis latencies

### Errors & Failures
- **Agent Failures by Node** - Bar chart showing which nodes fail most
- **MCP Rejected Requests** - Bar chart of rejection reasons

### LLM & Cost Tracking
- **LLM Token Usage by Model** - Token consumption over time
- **Total LLM Cost** - Gauge showing cumulative cost in USD

## Available Metrics

### Counters
```
agent_requests_total{query_type}
agent_failures_total{node, reason}
mcp_requests_total{status}
mcp_rejected_requests_total{reason}
llm_calls_total{model}
llm_failures_total{reason}
llm_tokens_total{model}
llm_cost_usd_total{model}
```

### Histograms
```
agent_latency_seconds{node}
mcp_latency_seconds
llm_latency_seconds
analysis_latency_seconds
```

### Gauges
```
agent_active_requests
cache_hits_total
cache_misses_total
cache_hit_rate
```

## Manual Metric Testing

### View Raw Metrics
```bash
curl http://127.0.0.1:8000/metrics
```

### Query in Prometheus
Open http://localhost:9090 and try these queries:

```promql
# Total requests
sum(agent_requests_total)

# Requests per minute
rate(agent_requests_total[5m])

# Average latency by node
avg by (node) (agent_latency_seconds_avg)

# Error rate
rate(agent_failures_total[5m])

# Cache hit rate
cache_hit_rate

# Current LLM cost
sum(llm_cost_usd_total)
```

## Customizing the Stack

### Change Scrape Interval
Edit `monitoring/prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 30s  # Change from 15s
```

### Add Alerting Rules
Create `monitoring/prometheus/alerts.yml`:
```yaml
groups:
  - name: agent_alerts
    rules:
      - alert: HighFailureRate
        expr: rate(agent_failures_total[5m]) > 0.1
        for: 1m
        annotations:
          summary: "High failure rate detected"
```

Then update prometheus.yml:
```yaml
rule_files:
  - "alerts.yml"
```

### Change Grafana Password
Edit `docker-compose.monitoring.yml`:
```yaml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

## Troubleshooting

### Prometheus Can't Scrape Backend

**Error**: "connection refused" or "target down"

**Solution**:
1. Ensure backend is running on port 8000
2. Check if metrics endpoint is accessible:
   ```bash
   curl http://127.0.0.1:8000/metrics
   ```
3. On Windows/Mac, Docker uses `host.docker.internal` to reach host
4. On Linux, you may need to use host networking or specify IP

### No Data in Grafana

**Check**:
1. Prometheus targets: http://localhost:9090/targets
2. Data source connection: Grafana → Configuration → Data Sources
3. Time range: Ensure dashboard time range includes recent data
4. Query metrics directly in Prometheus first

### Dashboard Not Loading

**Check**:
1. Grafana logs: `docker-compose -f docker-compose.monitoring.yml logs grafana`
2. Dashboard JSON validity
3. Restart Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`

## Stopping the Stack

```bash
# Stop services
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove volumes (deletes all data)
docker-compose -f docker-compose.monitoring.yml down -v
```

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Backend API   │         │    Prometheus   │         │     Grafana     │
│   (Port 8000)   │◄────────│   (Port 9090)   │◄────────│   (Port 3001)   │
│                 │ scrape  │                 │ query   │                 │
│  /metrics       │  (5s)   │  Store metrics  │         │  Visualize      │
│  endpoint       │         │                 │         │  Dashboards     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       ▲                                                           ▲
       │                                                           │
       │                    User Access                            │
       └───────────────────────────────────────────────────────────┘
```

## Data Retention

- **Prometheus**: 15 days (configurable in prometheus.yml)
- **Grafana**: Stored in Docker volume, persists across restarts

To change retention:
```yaml
# docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=30d'
```

## Next Steps

1. **Set up alerts** in Prometheus AlertManager
2. **Add more dashboards** for specific use cases
3. **Export metrics** to external systems (CloudWatch, Datadog)
4. **Set up distributed tracing** with Jaeger
5. **Configure log aggregation** with ELK stack

## Resources

- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
