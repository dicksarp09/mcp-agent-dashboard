# Grafana Cloud Observability Setup

This guide integrates your MCP Student Analytics Dashboard with **Grafana Cloud** for advanced observability, monitoring, and alerting.

## Overview

Grafana Cloud provides:
- **Metrics** (Prometheus-compatible) - Store and query metrics
- **Logs** (Loki) - Centralized logging
- **Traces** (Tempo) - Distributed tracing
- **Dashboards** - Pre-built visualizations
- **Alerting** - Get notified when things go wrong

---

## Step 1: Create Grafana Cloud Account

1. Go to [https://grafana.com/products/cloud/](https://grafana.com/products/cloud/)
2. Sign up for a free account (10,000 metrics, 50GB logs, 50GB traces)
3. After signup, you'll get a **Grafana Cloud Stack** with:
   - A Grafana instance URL
   - Prometheus endpoint
   - Loki endpoint
   - Tempo endpoint

---

## Step 2: Get Your API Keys

In your Grafana Cloud portal:

1. Go to **Administration** → **API Keys**
2. Create a new API key with role **"MetricsPublisher"**
3. Copy the key - you'll need it for the next step

Also find your endpoints:
- **Prometheus URL**: `https://prometheus-prod-[region].grafana.net/api/prom/push`
- **Loki URL**: `https://logs-prod-[region].grafana.net/loki/api/v1/push`
- **Tempo URL**: `https://tempo-prod-[region].grafana.net:443`

---

## Step 3: Configure Environment Variables

Add these to your Railway service:

```bash
# Grafana Cloud Configuration
GRAFANA_CLOUD_ENABLED=true
GRAFANA_CLOUD_PROMETHEUS_URL=https://prometheus-prod-[your-region].grafana.net/api/prom/push
GRAFANA_CLOUD_PROMETHEUS_USER=[your-user-id]
GRAFANA_CLOUD_API_KEY=[your-api-key]

# Optional: Enable logs and traces
GRAFANA_CLOUD_LOKI_URL=https://logs-prod-[your-region].grafana.net/loki/api/v1/push
GRAFANA_CLOUD_TEMPO_URL=https://tempo-prod-[your-region].grafana.net:443
```

---

## Step 4: Deploy Changes

The application will automatically start pushing metrics to Grafana Cloud when these environment variables are set.

---

## Step 5: Import Dashboards

1. Go to your Grafana Cloud instance
2. Click **+** → **Import**
3. Upload the dashboard JSON files from `monitoring/grafana/dashboards/`
4. Select your Prometheus data source

### Available Dashboards:

- **API Overview** - Request rates, latencies, error rates
- **AI Performance** - LLM usage, token consumption, costs
- **Student Analytics** - Database query performance, cache hit rates
- **System Health** - CPU, memory, MongoDB connection status

---

## Step 6: Set Up Alerts

Create alerts for critical conditions:

1. **High Error Rate**: > 5% error rate for 5 minutes
2. **Slow Response Time**: p95 latency > 2 seconds
3. **Database Connection Lost**: MongoDB disconnected
4. **High LLM Cost**: Daily cost > $1
5. **Cache Miss Rate**: < 50% cache hit rate

---

## Metrics Available

Your application automatically exports these metrics to Grafana:

### Request Metrics
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `http_request_errors_total` - Error count

### Business Metrics
- `agent_queries_total` - Total queries by type
- `llm_tokens_used_total` - LLM token consumption
- `llm_cost_usd_total` - Estimated LLM costs
- `cache_hits_total` / `cache_misses_total` - Cache performance

### Database Metrics
- `mongodb_query_duration_seconds` - MongoDB query latency
- `mongodb_queries_total` - Total database queries
- `at_risk_students_total` - Number of at-risk students

### System Metrics
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `python_gc_collections_total` - Garbage collection stats

---

## Troubleshooting

### No metrics appearing?
1. Check that environment variables are set correctly
2. Verify API key has "MetricsPublisher" role
3. Check Railway logs for connection errors
4. Ensure Prometheus URL includes `/api/prom/push`

### High metric volume?
- Grafana Cloud free tier: 10,000 active series
- Disable unnecessary metrics by setting `METRICS_FILTER` env var
- Reduce metric cardinality by limiting label values

### Need help?
- Grafana Cloud docs: https://grafana.com/docs/grafana-cloud/
- Check logs in Railway: `Logs` tab
- Metrics endpoint: `https://your-app.railway.app/metrics`

---

## Cost Optimization

**Free Tier Limits (per month):**
- 10,000 Prometheus active series
- 50 GB logs (Loki)
- 50 GB traces (Tempo)
- 10,000 alert evaluations

**Tips to stay within limits:**
1. Use metric aggregation where possible
2. Set `METRICS_RETENTION_DAYS=7` to reduce storage
3. Filter out high-cardinality labels
4. Use sampling for traces (1% of requests)

---

## Next Steps

After setup, you can:
1. Create custom dashboards for your specific needs
2. Set up alert notification channels (Slack, email, PagerDuty)
3. Add log aggregation with Loki
4. Implement distributed tracing with Tempo
5. Create SLOs (Service Level Objectives) and error budgets

---

**Your observability stack is now enterprise-grade!** 🚀
