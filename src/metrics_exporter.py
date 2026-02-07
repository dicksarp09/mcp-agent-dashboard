"""
Prometheus metrics exporter for MCP Agent observability.
Exposes metrics in Prometheus exposition format.
"""

from fastapi import APIRouter, Response
from typing import List
import time
from src.observability import metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])


def format_counter(name: str, labels: dict, value: int, help_text: str = "") -> str:
    """Format a counter metric in Prometheus format."""
    lines = []
    if help_text:
        lines.append(f"# HELP {name} {help_text}")
    lines.append(f"# TYPE {name} counter")

    for label_key, label_values in labels.items():
        if isinstance(label_values, dict):
            for label_val, count in label_values.items():
                lines.append(f'{name}{{label="{label_val}"}} {count}')
        else:
            lines.append(f"{name} {label_values}")

    return "\n".join(lines)


def format_histogram(name: str, data: dict, help_text: str = "") -> str:
    """Format a histogram metric in Prometheus format."""
    lines = []
    if help_text:
        lines.append(f"# HELP {name} {help_text}")
    lines.append(f"# TYPE {name} histogram")

    if isinstance(data, dict):
        # Dict-based histogram with labels
        for label, values in data.items():
            if isinstance(values, list) and values:
                # Calculate buckets
                count = len(values)
                total = sum(values)
                avg = total / count

                lines.append(f'{name}_count{{node="{label}"}} {count}')
                lines.append(f'{name}_sum{{node="{label}"}} {total}')
                lines.append(f'{name}_avg{{node="{label}"}} {avg}')
    elif isinstance(data, list) and data:
        # Simple list-based histogram
        count = len(data)
        total = sum(data)
        avg = total / count

        lines.append(f"{name}_count {count}")
        lines.append(f"{name}_sum {total}")
        lines.append(f"{name}_avg {avg}")

    return "\n".join(lines)


def format_gauge(name: str, value: float, help_text: str = "") -> str:
    """Format a gauge metric in Prometheus format."""
    lines = []
    if help_text:
        lines.append(f"# HELP {name} {help_text}")
    lines.append(f"# TYPE {name} gauge")
    lines.append(f"{name} {value}")
    return "\n".join(lines)


@router.get("")
async def prometheus_metrics():
    """Expose metrics in Prometheus format."""
    output_lines = []

    # Agent Request Counters
    output_lines.append(
        format_counter(
            "agent_requests_total",
            {"query_type": metrics.agent_requests_total},
            0,
            "Total number of agent requests by query type",
        )
    )
    output_lines.append("")

    # Agent Failure Counters
    output_lines.append(
        format_counter(
            "agent_failures_total",
            {"node_reason": metrics.agent_failures_total},
            0,
            "Total number of agent failures by node and reason",
        )
    )
    output_lines.append("")

    # MCP Request Counters
    output_lines.append(
        format_counter(
            "mcp_requests_total",
            {"status": metrics.mcp_requests_total},
            0,
            "Total number of MCP requests by status",
        )
    )
    output_lines.append("")

    # MCP Rejected Request Counters
    output_lines.append(
        format_counter(
            "mcp_rejected_requests_total",
            {"reason": metrics.mcp_rejected_requests_total},
            0,
            "Total number of rejected MCP requests by reason",
        )
    )
    output_lines.append("")

    # LLM Call Counters
    output_lines.append(
        format_counter(
            "llm_calls_total",
            {"model": metrics.llm_calls_total},
            0,
            "Total number of LLM API calls by model",
        )
    )
    output_lines.append("")

    # LLM Failure Counters
    output_lines.append(
        format_counter(
            "llm_failures_total",
            {"reason": metrics.llm_failures_total},
            0,
            "Total number of LLM call failures by reason",
        )
    )
    output_lines.append("")

    # LLM Token Counter
    output_lines.append(
        format_counter(
            "llm_tokens_total",
            {"model": metrics.llm_tokens_total},
            0,
            "Total number of LLM tokens used by model",
        )
    )
    output_lines.append("")

    # LLM Cost Counter
    output_lines.append("# HELP llm_cost_usd_total Total LLM cost in USD by model")
    output_lines.append("# TYPE llm_cost_usd_total counter")
    for model, cost in metrics.llm_cost_usd_total.items():
        output_lines.append(f'llm_cost_usd_total{{model="{model}"}} {cost:.6f}')
    output_lines.append("")

    # Agent Latency Histogram
    output_lines.append(
        format_histogram(
            "agent_latency_seconds",
            metrics.agent_latency_seconds,
            "Agent node execution latency in seconds",
        )
    )
    output_lines.append("")

    # MCP Latency Histogram
    output_lines.append(
        format_histogram(
            "mcp_latency_seconds",
            metrics.mcp_latency_seconds,
            "MCP call latency in seconds",
        )
    )
    output_lines.append("")

    # LLM Latency Histogram
    output_lines.append(
        format_histogram(
            "llm_latency_seconds",
            metrics.llm_latency_seconds,
            "LLM call latency in seconds",
        )
    )
    output_lines.append("")

    # Analysis Latency Histogram
    output_lines.append(
        format_histogram(
            "analysis_latency_seconds",
            metrics.analysis_latency_seconds,
            "Analysis operation latency in seconds",
        )
    )
    output_lines.append("")

    # Gauges
    output_lines.append(
        format_gauge(
            "agent_active_requests",
            metrics.agent_active_requests,
            "Number of currently active agent requests",
        )
    )
    output_lines.append("")

    output_lines.append(
        format_gauge(
            "cache_hits_total", metrics.cache_hits, "Total number of cache hits"
        )
    )
    output_lines.append("")

    output_lines.append(
        format_gauge(
            "cache_misses_total", metrics.cache_misses, "Total number of cache misses"
        )
    )
    output_lines.append("")

    # Calculate cache hit rate
    total_cache_ops = metrics.cache_hits + metrics.cache_misses
    if total_cache_ops > 0:
        hit_rate = metrics.cache_hits / total_cache_ops
    else:
        hit_rate = 0

    output_lines.append(
        format_gauge("cache_hit_rate", hit_rate, "Cache hit rate (0-1)")
    )

    return Response(content="\n".join(output_lines), media_type="text/plain")
