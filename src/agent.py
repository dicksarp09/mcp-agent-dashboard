import re
import requests
import time
import logging
import os
from typing import Optional, List, Dict, Literal
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("langgraph_agent")

# Initialize Groq client for Intent Node
GROQ_API_KEY = os.getenv("GOOGLE_API_KEY")  # Your Groq key
groq_client = None

if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("Intent Node: Groq client initialized")
    except Exception as e:
        logger.warning(f"Intent Node: Failed to initialize Groq client: {e}")


# State design as required
def make_initial_state(raw_input: str) -> dict:
    return {
        "request": {
            "raw_input": raw_input,
            "student_id": None,
            "fields": []
        },
        "mongo_result": None,
        "final_response": None,
        "error": None,
        "attempt_count": 0
    }


# Intent / Reasoning Node (LLM-powered with query-type detection)
def intent_node(state: dict) -> dict:
    node = "Intent Node"
    start = time.time()
    raw = state["request"]["raw_input"].strip()

    # Try LLM first for full understanding
    if groq_client:
        try:
            prompt = f"""You are an expert at understanding student performance queries.
            
Analyze this query and extract:
1. Query type: one of [single_student, trend, derived_metrics, class_summary]
2. Student ID: 24-hex MongoDB ObjectId if mentioned, otherwise null

Query: "{raw}"

Guidelines:
- "Summarize", "show", "get info", "performance" for a single student → single_student
- "Trend", "growth", "improving", "declining" → trend
- "Alert", "risk", "metric", "check", "behavior" → derived_metrics
- "Class", "all students", "dataset", "ranking", "summary statistics" → class_summary
- Extract student IDs like: 689cef602490264c7f2dd235

Respond ONLY with JSON (no markdown, no extra text):
{{"query_type": "single_student|trend|derived_metrics|class_summary", "student_id": "24-hex-id or null"}}"""

            message = groq_client.messages.create(
                model="llama-3.3-70b-versatile",
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            response_text = message.content[0].text.strip()
            
            # Try to parse JSON (handle markdown code blocks if returned)
            import json
            if "```" in response_text:
                response_text = response_text.split("```")[1].replace("json", "").strip()
            
            result = json.loads(response_text)
            state["query_type"] = result.get("query_type", "single_student")
            state["request"]["student_id"] = result.get("student_id")
            # Optionally LLM may return analysis options
            state["analysis_opts"] = result.get("analysis_opts", {})
            
            needs_analysis = state["query_type"] in ["trend", "derived_metrics", "class_summary"] or (
                state["query_type"] == "single_student" and state["request"]["student_id"]
            )
            duration = time.time() - start
            logger.info(f"{node} - parsed (LLM) - query_type={state['query_type']} - student_id={state['request']['student_id']} - needs_analysis={needs_analysis} - duration={duration:.4f}s")
            state["intent"] = {"needs_db": True, "needs_analysis": needs_analysis}
            return state

        except Exception as e:
            logger.warning(f"{node} - LLM parsing failed: {e}, falling back to heuristic")

    # Fallback: heuristic-based detection
    query_type = "single_student"  # default
    if any(kw in raw.lower() for kw in ["class", "all students", "dataset", "ranking", "summary statistics", "analyze class"]):
        query_type = "class_summary"
    elif any(kw in raw.lower() for kw in ["trend", "growth", "improving", "declining", "progress"]):
        query_type = "trend"
    elif any(kw in raw.lower() for kw in ["alert", "risk", "metric", "derived", "behavior", "check"]):
        query_type = "derived_metrics"

    # Extract student ID from patterns
    sid_match = re.search(r"id\s*[:=]\s*([0-9a-fA-F]{24})", raw)
    if not sid_match:
        sid_match = re.search(r"student\s+([0-9a-fA-F]{24})", raw, re.IGNORECASE)
    
    if sid_match:
        state["request"]["student_id"] = sid_match.group(1)

    state["query_type"] = query_type
    # Parse simple options: top N, page, at-risk, grade threshold
    opts = {}
    top_match = re.search(r"top\s+(\d+)", raw, re.IGNORECASE)
    page_match = re.search(r"page\s+(\d+)", raw, re.IGNORECASE)
    if top_match:
        opts["top_n"] = int(top_match.group(1))
    if page_match:
        opts["page"] = int(page_match.group(1))
    if re.search(r"at[- ]?risk|struggl", raw, re.IGNORECASE):
        opts["at_risk_only"] = True
    thr = re.search(r"grade\s*(?:>=|>=\s*)?(\d+)", raw, re.IGNORECASE)
    if thr:
        opts["grade_threshold"] = int(thr.group(1))
    state["analysis_opts"] = opts

    needs_analysis = query_type in ["trend", "derived_metrics", "class_summary"] or (
        query_type == "single_student" and state["request"]["student_id"]
    )
    duration = time.time() - start
    logger.info(f"{node} - parsed (fallback) - query_type={query_type} - student_id={state['request']['student_id']} - needs_analysis={needs_analysis} - duration={duration:.4f}s")
    state["intent"] = {"needs_db": True, "needs_analysis": needs_analysis}
    return state



# Deterministic Validation Node
ALLOWED_FIELDS = {"name", "age", "sex", "G3"}
OBJID_RE = re.compile(r"^[0-9a-fA-F]{24}$")

def validation_node(state: dict) -> dict:
    node = "Validation Node"
    start = time.time()
    req = state["request"]
    query_type = state.get("query_type", "single_student")

    sid = req.get("student_id")
    fields = req.get("fields") or []

    # For single_student/trend/derived_metrics: validate student_id format
    if query_type in ["single_student", "trend", "derived_metrics"]:
        if sid is None:
            state["error"] = "missing student_id for this query type"
            duration = time.time() - start
            logger.info(f"{node} - invalid - reason=missing_id - duration={duration:.4f}s")
            return state
        
        if not OBJID_RE.match(sid):
            state["error"] = "invalid student_id format"
            duration = time.time() - start
            logger.info(f"{node} - invalid - reason=student_id_format - duration={duration:.4f}s")
            return state
    
    # For class_summary: no student_id needed
    if query_type == "class_summary":
        duration = time.time() - start
        logger.info(f"{node} - success (class_summary) - duration={duration:.4f}s")
        return state

    # Validate fields if provided
    invalid = [f for f in fields if f not in ALLOWED_FIELDS]
    if invalid:
        state["error"] = f"invalid fields requested: {invalid}"
        duration = time.time() - start
        logger.info(f"{node} - invalid - reason=fields_whitelist - duration={duration:.4f}s")
        return state

    # Normalize: lowercase and dedupe
    state["request"]["fields"] = list(dict.fromkeys(fields))
    duration = time.time() - start
    logger.info(f"{node} - success - duration={duration:.4f}s")
    return state


# Routing function
def route_intent(state: dict) -> Literal["mongo", "analysis", "respond", "error"]:
    # Follow the required routing rules
    if state.get("error"):
        return "error"
    if state.get("intent", {}).get("needs_analysis"):
        return "analysis"
    if state.get("intent", {}).get("needs_db"):
        return "mongo"
    return "respond"


# Mongo MCP Tool Node (calls MCP server only)
def mongo_mcp_tool(state: dict, mcp_url: str, timeout: float = 30.0) -> dict:
    node = "Mongo MCP Tool Node (client)"
    start = time.time()
    req = state["request"]
    query_type = state.get("query_type", "single_student")
    headers = {"Content-Type": "application/json"}
    
    # Simple in-memory cache for student queries
    if not hasattr(mongo_mcp_tool, "cache"):
        mongo_mcp_tool.cache = {}
        mongo_mcp_tool.cache_ttl = 60.0
        mongo_mcp_tool.cache_max = 200

    def _get_cache(sid):
        entry = mongo_mcp_tool.cache.get(sid)
        if not entry:
            return None
        ts, val = entry
        if time.time() - ts > mongo_mcp_tool.cache_ttl:
            del mongo_mcp_tool.cache[sid]
            return None
        return val

    def _set_cache(sid, val):
        if len(mongo_mcp_tool.cache) >= mongo_mcp_tool.cache_max:
            # evict oldest
            oldest = min(mongo_mcp_tool.cache.items(), key=lambda kv: kv[1][0])[0]
            del mongo_mcp_tool.cache[oldest]
        mongo_mcp_tool.cache[sid] = (time.time(), val)

    try:
        # For class_summary, use class_analysis endpoint
        if query_type == "class_summary":
            payload = {"limit": 500}
            r = requests.post(f"{mcp_url}/class_analysis", json=payload, headers=headers, timeout=timeout)
            duration = time.time() - start
            if r.status_code == 200:
                body = r.json()
                state["mongo_result"] = body.get("students", [])
                logger.info(f"{node} - class_analysis - count={body.get('count', 0)} - duration={duration:.4f}s")
                return state
            else:
                state["error"] = f"MCP error: {r.status_code} {r.text}"
                logger.info(f"{node} - error - status={r.status_code} - duration={duration:.4f}s")
                return state
        
        # For single queries, use query endpoint
        sid = req.get("student_id")
        # Try cache
        cached = _get_cache(sid)
        if cached is not None:
            state["mongo_result"] = cached
            logger.info(f"{node} - cache_hit - student_id={sid} - duration={time.time()-start:.4f}s")
            return state

        payload = {"student_id": sid, "fields": ["name", "G1", "G2", "G3", "studytime", "absences", "failures", "goout", "Dalc", "Walc"]}
        r = requests.post(f"{mcp_url}/query", json=payload, headers=headers, timeout=timeout)
        duration = time.time() - start
        if r.status_code == 200:
            body = r.json()
            state["mongo_result"] = body.get("result")
            if state["mongo_result"] is not None:
                _set_cache(sid, state["mongo_result"])
            outcome = "empty" if body.get("result") is None else "success"
            logger.info(f"{node} - {outcome} - duration={duration:.4f}s")
            return state
        else:
            state["error"] = f"MCP error: {r.status_code} {r.text}"
            logger.info(f"{node} - error - status={r.status_code} - duration={duration:.4f}s")
            return state
    except Exception as e:
        duration = time.time() - start
        state["error"] = f"MCP request failed: {str(e)}"
        logger.exception(f"{node} - exception - duration={duration:.4f}s")
        return state


# Response Synthesis Node
def response_node(state: dict) -> dict:
    node = "Response Synthesis Node"
    start = time.time()
    
    # Check if analysis was done
    if state.get("analysis_result"):
        state["final_response"] = state["analysis_result"]
        duration = time.time() - start
        logger.info(f"{node} - analysis - duration={duration:.4f}s")
        return state
    
    # Must not call DB here
    mongo = state.get("mongo_result")
    if mongo is None:
        # Could be explicitly empty or simply no DB requested
        if state.get("request", {}).get("student_id") is None:
            state["final_response"] = "I can help — please provide a student id and fields to query."
        else:
            state["final_response"] = "No record found for that student."
        duration = time.time() - start
        logger.info(f"{node} - empty_or_no_query - duration={duration:.4f}s")
        return state

    # Compose human-readable structured response
    parts = [f"{k}: {v}" for k, v in mongo.items()]
    state["final_response"] = "Student data — " + "; ".join(parts)
    duration = time.time() - start
    logger.info(f"{node} - success - duration={duration:.4f}s")
    return state


# Performance Analysis Node
def performance_analysis_node(state: dict) -> dict:
    node = "Performance Analysis Node"
    start = time.time()
    query_type = state.get("query_type", "single_student")
    student_id = state.get("request", {}).get("student_id")
    
    try:
        from src.performance_analyzer import (
            summarize_student, detect_trend, derived_metrics, class_analysis, class_summary_statistics
        )
        
        if query_type == "single_student":
            # Fetch student and summarize
            if not state.get("mongo_result"):
                state["analysis_result"] = "Student not found."
            else:
                state["analysis_result"] = summarize_student(state["mongo_result"], student_id)
            duration = time.time() - start
            logger.info(f"{node} - single_student - duration={duration:.4f}s")
            return state
        
        if query_type == "trend":
            # Fetch student and detect trend
            if not state.get("mongo_result"):
                state["analysis_result"] = "Student not found."
            else:
                state["analysis_result"] = detect_trend(state["mongo_result"], student_id)
            duration = time.time() - start
            logger.info(f"{node} - trend - duration={duration:.4f}s")
            return state
        
        if query_type == "derived_metrics":
            # Fetch student and extract alerts
            if not state.get("mongo_result"):
                state["analysis_result"] = "Student not found."
            else:
                metrics = derived_metrics(state["mongo_result"], student_id)
                risk = metrics.get("risk_level", "low")
                # Visual cue for risk
                cue = "[LOW ⚪]"
                if risk == "medium":
                    cue = "[MEDIUM 🟡]"
                elif risk == "high":
                    cue = "[HIGH 🔴]"

                if metrics["has_alerts"]:
                    alerts_text = "\n".join(metrics["alerts"])
                    state["analysis_result"] = f"Student {metrics['student_id']} {cue} alerts:\n{alerts_text}"
                else:
                    state["analysis_result"] = f"Student {metrics['student_id']} {cue} has no alerts."
            duration = time.time() - start
            logger.info(f"{node} - derived_metrics - duration={duration:.4f}s")
            return state
        
        if query_type == "class_summary":
            # Fetch all students (no projection for now; in production, optimize)
            # For demo, assume mongo_result is a list
            if isinstance(state.get("mongo_result"), list):
                students = state["mongo_result"]
                analysis_text = class_analysis(students) + "\n\n" + class_summary_statistics(students)
                state["analysis_result"] = analysis_text
            else:
                state["analysis_result"] = "Class data not available."
            duration = time.time() - start
            logger.info(f"{node} - class_summary - duration={duration:.4f}s")
            return state
        
        state["analysis_result"] = "Unknown analysis type."
        return state
    
    except Exception as e:
        duration = time.time() - start
        logger.exception(f"{node} - error - {e} - duration={duration:.4f}s")
        state["error"] = f"Analysis failed: {str(e)}"
        return state


# Error / Fallback Node
def error_node(state: dict) -> dict:
    node = "Error Node"
    start = time.time()
    state["attempt_count"] = state.get("attempt_count", 0) + 1
    if state["attempt_count"] > 2:
        state["error"] = state.get("error") or "Maximum attempts exceeded"
        state["final_response"] = "An error occurred and we couldn't complete your request."
        duration = time.time() - start
        logger.info(f"{node} - hard_stop - duration={duration:.4f}s")
        return state

    # Provide a clean user message
    err = state.get("error") or "Unknown error"
    state["final_response"] = f"Error: {err}"
    duration = time.time() - start
    logger.info(f"{node} - responded - duration={duration:.4f}s")
    return state


# Top-level runner for one request
def handle_request(raw_input: str, mcp_url: str) -> dict:
    state = make_initial_state(raw_input)

    # Intent
    state = intent_node(state)

    # Validation
    state = validation_node(state)
    route = route_intent(state)

    if route == "error":
        state = error_node(state)
        return state

    if route == "respond":
        state = response_node(state)
        return state

    # route == "mongo" or "analysis"
    state = mongo_mcp_tool(state, mcp_url)
    if state.get("error"):
        state = error_node(state)
        return state

    # If analysis is needed, run the analysis node
    if route == "analysis":
        state = performance_analysis_node(state)
        if state.get("error"):
            state = error_node(state)
            return state

    state = response_node(state)
    return state
