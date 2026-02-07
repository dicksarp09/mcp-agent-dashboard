"""
Observability and AgentOps plumbing for MCP agent system.
Implements metrics, tracing, and cost tracking.
"""

import time
from enum import Enum
from typing import Dict, Any, Optional
import logging


# Fixed enums for low-cardinality labels
class NodeType(str, Enum):
    INTENT = "intent"
    VALIDATION = "validation"
    MCP_CALL = "mcp_call"
    ANALYSIS = "analysis"
    RESPONSE = "response"
    ERROR = "error"


class FailureReason(str, Enum):
    LLM_PARSE = "llm_parse"
    VALIDATION = "validation"
    MCP_ERROR = "mcp_error"
    ANALYSIS = "analysis"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


class MCPStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    VALIDATION_REJECT = "validation_reject"
    NOT_FOUND = "not_found"
    TIMEOUT = "timeout"


class QueryType(str, Enum):
    SINGLE_STUDENT = "single_student"
    TREND = "trend"
    DERIVED_METRICS = "derived_metrics"
    CLASS_SUMMARY = "class_summary"


class LLMModel(str, Enum):
    LLAMA_70B = "llama-3.3-70b"


# Static cost table (per 1k tokens)
COST_TABLE = {LLMModel.LLAMA_70B: {"input": 0.00059, "output": 0.00079}}


# Prometheus-compatible metrics (in-memory counters/histograms)
class MetricsRegistry:
    """Simple metrics registry compatible with Prometheus exposition format."""

    def __init__(self):
        # Counters
        self.agent_requests_total: Dict[str, int] = {}
        self.agent_failures_total: Dict[str, int] = {}
        self.mcp_requests_total: Dict[str, int] = {}
        self.mcp_rejected_requests_total: Dict[str, int] = {}
        self.llm_calls_total: Dict[str, int] = {}
        self.llm_failures_total: Dict[str, int] = {}

        # Histograms (store as list of observations)
        self.agent_latency_seconds: Dict[str, list] = {}
        self.mcp_latency_seconds: list = []
        self.llm_latency_seconds: list = []
        self.analysis_latency_seconds: list = []

        # Gauges
        self.agent_active_requests: int = 0
        self.cache_hits: int = 0
        self.cache_misses: int = 0

        # Cost tracking
        self.llm_tokens_total: Dict[str, int] = {}
        self.llm_cost_usd_total: Dict[str, float] = {}

    def increment_counter(self, metric: Dict, key: str, value: int = 1):
        """Increment a counter metric."""
        metric[key] = metric.get(key, 0) + value

    def record_histogram(self, metric: Dict, key: str, value: float):
        """Record a histogram observation."""
        if key not in metric:
            metric[key] = []
        metric[key].append(value)

    def record_simple_histogram(self, metric: list, value: float):
        """Record to a simple list-based histogram."""
        metric.append(value)


# Global metrics registry
metrics = MetricsRegistry()
logger = logging.getLogger("observability")


# OpenTelemetry-style tracing (simplified)
class Span:
    """Simple span implementation for tracing."""

    def __init__(
        self, name: str, trace_id: Optional[str] = None, parent_id: Optional[str] = None
    ):
        self.name = name
        self.trace_id = trace_id or self._generate_id()
        self.parent_id = parent_id
        self.span_id = self._generate_id()
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.attributes: Dict[str, Any] = {}
        self.status = "ok"

    def _generate_id(self) -> str:
        import uuid

        return str(uuid.uuid4())[:16]

    def set_attribute(self, key: str, value: Any):
        """Set a span attribute (low cardinality only)."""
        self.attributes[key] = value

    def set_status(self, status: str):
        """Set span status: ok, error."""
        self.status = status

    def end(self):
        """End the span and record duration."""
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        logger.debug(f"Span {self.name} ended: {duration:.4f}s")
        return duration


class Tracer:
    """Simple tracer for distributed tracing."""

    def __init__(self):
        self.active_spans: Dict[str, Span] = {}

    def start_span(
        self, name: str, trace_id: Optional[str] = None, parent_id: Optional[str] = None
    ) -> Span:
        """Start a new span."""
        span = Span(name, trace_id, parent_id)
        self.active_spans[span.span_id] = span
        return span

    def end_span(self, span: Span) -> float:
        """End a span and return duration."""
        duration = span.end()
        if span.span_id in self.active_spans:
            del self.active_spans[span.span_id]
        return duration


tracer = Tracer()


def estimate_llm_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate LLM cost based on static pricing table."""
    model_key = LLMModel.LLAMA_70B if "llama" in model.lower() else LLMModel.LLAMA_70B
    costs = COST_TABLE.get(model_key, {"input": 0.001, "output": 0.001})

    input_cost = (prompt_tokens / 1000) * costs["input"]
    output_cost = (completion_tokens / 1000) * costs["output"]

    return round(input_cost + output_cost, 6)


def record_llm_usage(model: str, prompt_tokens: int, completion_tokens: int):
    """Record LLM usage metrics and costs."""
    total_tokens = prompt_tokens + completion_tokens
    cost = estimate_llm_cost(model, prompt_tokens, completion_tokens)

    # Record tokens
    metrics.increment_counter(metrics.llm_tokens_total, model, total_tokens)
    # Record cost
    if model not in metrics.llm_cost_usd_total:
        metrics.llm_cost_usd_total[model] = 0.0
    metrics.llm_cost_usd_total[model] += cost


def get_metrics_summary() -> Dict[str, Any]:
    """Get current metrics summary for debugging/monitoring."""
    return {
        "agent_requests": metrics.agent_requests_total,
        "agent_failures": metrics.agent_failures_total,
        "mcp_requests": metrics.mcp_requests_total,
        "mcp_rejections": metrics.mcp_rejected_requests_total,
        "llm_calls": metrics.llm_calls_total,
        "llm_failures": metrics.llm_failures_total,
        "cache_hits": metrics.cache_hits,
        "cache_misses": metrics.cache_misses,
        "active_requests": metrics.agent_active_requests,
        "llm_tokens": metrics.llm_tokens_total,
        "llm_cost_usd": metrics.llm_cost_usd_total,
    }
