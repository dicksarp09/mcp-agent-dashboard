"""
Grafana Cloud Metrics Exporter
Pushes metrics to Grafana Cloud Prometheus endpoint
"""

import os
import time
import logging
from typing import Dict, Any
from prometheus_client import CollectorRegistry, Counter, Histogram, Gauge, Info
from prometheus_client.exposition import basic_auth_handler, push_to_gateway

logger = logging.getLogger("grafana_cloud")


class GrafanaCloudExporter:
    """Export metrics to Grafana Cloud Prometheus."""

    def __init__(self):
        self.enabled = os.getenv("GRAFANA_CLOUD_ENABLED", "false").lower() == "true"
        self.gateway_url = os.getenv("GRAFANA_CLOUD_PROMETHEUS_URL", "")
        self.user = os.getenv("GRAFANA_CLOUD_PROMETHEUS_USER", "")
        self.api_key = os.getenv("GRAFANA_CLOUD_API_KEY", "")
        self.job_name = os.getenv("GRAFANA_CLOUD_JOB_NAME", "mcp-agent-dashboard")

        self.registry = CollectorRegistry()
        self._init_metrics()

        if self.enabled:
            if not all([self.gateway_url, self.user, self.api_key]):
                logger.warning(
                    "Grafana Cloud enabled but missing configuration. Disabling."
                )
                self.enabled = False
            else:
                logger.info(f"Grafana Cloud exporter initialized: {self.gateway_url}")

    def _init_metrics(self):
        """Initialize Prometheus metrics."""
        # HTTP Request metrics
        self.http_requests_total = Counter(
            "http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status"],
            registry=self.registry,
        )

        self.http_request_duration_seconds = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
            registry=self.registry,
        )

        # Business metrics
        self.agent_queries_total = Counter(
            "agent_queries_total",
            "Total agent queries by type",
            ["query_type"],
            registry=self.registry,
        )

        self.llm_tokens_used_total = Counter(
            "llm_tokens_used_total",
            "Total LLM tokens used",
            ["model"],
            registry=self.registry,
        )

        self.llm_cost_usd_total = Counter(
            "llm_cost_usd_total",
            "Total LLM cost in USD",
            ["model"],
            registry=self.registry,
        )

        self.cache_hits_total = Counter(
            "cache_hits_total", "Total cache hits", registry=self.registry
        )

        self.cache_misses_total = Counter(
            "cache_misses_total", "Total cache misses", registry=self.registry
        )

        # Database metrics
        self.mongodb_query_duration_seconds = Histogram(
            "mongodb_query_duration_seconds",
            "MongoDB query duration",
            ["operation"],
            buckets=[0.01, 0.1, 0.5, 1.0, 5.0, 10.0],
            registry=self.registry,
        )

        self.at_risk_students = Gauge(
            "at_risk_students_total",
            "Number of at-risk students",
            registry=self.registry,
        )

        self.total_students = Gauge(
            "total_students",
            "Total number of students in database",
            registry=self.registry,
        )

        # System info
        self.app_info = Info(
            "app_info", "Application information", registry=self.registry
        )
        self.app_info.info(
            {
                "version": "1.0.0",
                "environment": os.getenv("RAILWAY_ENVIRONMENT", "local"),
                "service": "mcp-agent-dashboard",
            }
        )

    def push_metrics(self):
        """Push metrics to Grafana Cloud."""
        if not self.enabled:
            return

        try:

            def handler(url, method, timeout, headers, data):
                """Basic auth handler for Grafana Cloud."""
                return basic_auth_handler(
                    url, method, timeout, headers, data, self.user, self.api_key
                )

            push_to_gateway(
                self.gateway_url,
                job=self.job_name,
                registry=self.registry,
                handler=handler,
            )
            logger.debug("Metrics pushed to Grafana Cloud successfully")
        except Exception as e:
            logger.error(f"Failed to push metrics to Grafana Cloud: {e}")

    def record_http_request(
        self, method: str, endpoint: str, status_code: int, duration: float
    ):
        """Record HTTP request metric."""
        if not self.enabled:
            return

        status = str(status_code)
        self.http_requests_total.labels(
            method=method, endpoint=endpoint, status=status
        ).inc()
        self.http_request_duration_seconds.labels(
            method=method, endpoint=endpoint
        ).observe(duration)

    def record_agent_query(self, query_type: str):
        """Record agent query metric."""
        if not self.enabled:
            return
        self.agent_queries_total.labels(query_type=query_type).inc()

    def record_llm_usage(self, model: str, tokens: int, cost: float):
        """Record LLM usage metrics."""
        if not self.enabled:
            return
        self.llm_tokens_used_total.labels(model=model).inc(tokens)
        self.llm_cost_usd_total.labels(model=model).inc(cost)

    def record_cache(self, hit: bool):
        """Record cache hit/miss."""
        if not self.enabled:
            return
        if hit:
            self.cache_hits_total.inc()
        else:
            self.cache_misses_total.inc()

    def record_mongodb_query(self, operation: str, duration: float):
        """Record MongoDB query metric."""
        if not self.enabled:
            return
        self.mongodb_query_duration_seconds.labels(operation=operation).observe(
            duration
        )

    def set_student_metrics(self, total: int, at_risk: int):
        """Update student metrics."""
        if not self.enabled:
            return
        self.total_students.set(total)
        self.at_risk_students.set(at_risk)


# Global instance
grafana_exporter = GrafanaCloudExporter()
