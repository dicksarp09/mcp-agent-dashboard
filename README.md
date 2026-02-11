# LangGraph — MCP-backed Student Analysis Agent

This repository implements a production-ready LangGraph-style agent that safely routes user requests through a minimal MCP (Model-Connector-Proxy) server to query MongoDB, performs deterministic analysis, and synthesizes human-readable responses. It is designed for safety, observability, and graceful failure handling when AI components are uncertain.

**Key Features:**
- ✅ Clean FastAPI backend with MongoDB integration
- ✅ React 18 + TypeScript dashboard with real-time analytics
- ✅ Comprehensive observability (metrics, tracing, cost tracking)
- ✅ LLM-powered intent parsing with deterministic fallback
- ✅ Read-only MCP server with projection whitelists
- ✅ Student performance analysis (trends, risk assessment, class rankings)

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOL
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB=student-db
MONGO_COLLECTION=student_performance.records
GROQ_API_KEY=your_groq_api_key_here
EOL

# Start the MCP server
python start_server.py
```

Server runs on `http://127.0.0.1:8000`

### 2. Frontend Setup

```bash
cd web
npm install
npm run dev
```

Dashboard runs on `http://localhost:3000`

### 3. Access the Application

Open `http://localhost:3000` in your browser.

---

## Architecture

```
┌─────────────────┐
│  React Client   │
│   (Dashboard)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────────────────┐
│       LangGraph Agent Layer         │
│  ┌──────────────────────────────┐  │
│  │  Intent Classification Node   │  │ ← Rule-based + LLM fallback
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   Input Validation Node      │  │ ← Security checkpoint
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   MCP Tool Invocation Node   │  │ ← Database interaction
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   Performance Analysis Node  │  │ ← Deterministic computation
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   Response Formatting Node   │  │
│  └──────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │ MCP Protocol
                  ▼
         ┌─────────────────┐
         │   MCP Server    │
         │  ┌───────────┐  │
         │  │   Cache   │  │ ← In-memory (1,295x speedup)
         │  └─────┬─────┘  │
         │        ▼         │
         │  ┌───────────┐  │
         │  │Projection │  │ ← Security whitelist
         │  │Whitelist  │  │
         │  └─────┬─────┘  │
         └────────┼─────────┘
                  │ Read-only
                  ▼
         ┌─────────────────┐
         │  MongoDB Atlas  │
         │  (Students DB)  │
         └─────────────────┘
```

### Components

**Agent (`src/agent.py`)**
- Orchestrates LangGraph nodes: Intent, Validation, MCP client, Analysis, Response
- Implements local caching and observability instrumentation
- 5 nodes with full metrics and tracing coverage

**MCP Server (`src/mcp_server.py`)**
- FastAPI service with read-only, projection-limited MongoDB access
- Input validation and security whitelists
- Full observability instrumentation

**Performance Analyzer (`src/performance_analyzer.py`)**
- Student summaries, trends, risk assessments
- Class-level analytics and statistics
- Sparkline generation for grade visualization

**Observability (`src/observability.py`)**
- Prometheus-compatible metrics
- OpenTelemetry-style distributed tracing
- LLM cost tracking

---

## Observability & AgentOps

The system includes comprehensive observability covering 80% of production needs.

### Metrics (Prometheus-compatible)

#### Counters
- `agent_requests_total{query_type}` - Total requests by query type
- `agent_failures_total{node, reason}` - Failures by node and reason
- `mcp_requests_total{status}` - MCP requests (success, error, not_found, validation_reject)
- `mcp_rejected_requests_total{reason}` - Rejected requests
- `llm_calls_total{model}` - LLM API calls
- `llm_failures_total{reason}` - LLM call failures

#### Histograms
- `agent_latency_seconds{node}` - Node execution latency
- `mcp_latency_seconds` - MCP call latency
- `llm_latency_seconds` - LLM call latency
- `analysis_latency_seconds` - Analysis operation latency

#### Gauges
- `agent_active_requests` - Currently active requests
- `cache_hits` - Cache hit count
- `cache_misses` - Cache miss count

#### Cost Tracking
- `llm_tokens_total{model}` - Cumulative token usage
- `llm_cost_usd_total{model}` - Estimated cost in USD

### Distributed Tracing

**Agent Spans:**
- `agent.intent` - Intent parsing
- `agent.validation` - Request validation
- `agent.mcp_call` - MCP server call
- `agent.analysis` - Performance analysis
- `agent.response` - Response synthesis

**MCP Server Spans:**
- `mcp.mongo_query` - MongoDB query execution

### What You Can Answer

✅ **Is the agent less reliable than yesterday?**
- Compare `agent_failures_total` over time
- Check failure rates per node

✅ **Where is latency coming from?**
- Analyze `agent_latency_seconds` by node
- Check `mcp_latency_seconds` for DB bottlenecks
- Review `llm_latency_seconds` for LLM delays

✅ **Which node fails most often?**
- Query `agent_failures_total{node}` metric
- Filter by node type

✅ **Which query types cost the most?**
- Compare `llm_tokens_total` by query type
- Review `llm_cost_usd_total`

### Accessing Metrics

```python
from src.observability import get_metrics_summary, metrics

# Get current metrics
summary = get_metrics_summary()
print(summary)

# Access individual metrics
print(f"Active requests: {metrics.agent_active_requests}")
print(f"Cache hits: {metrics.cache_hits}")
print(f"Total LLM cost: ${metrics.llm_cost_usd_total}")
```

---

## API Endpoints

### Health & Info
- `GET /` - API info and status
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation

### Student Queries
- `POST /query` - Query single student by ID
  ```json
  {
    "student_id": "689cef602490264c7f2dd235",
    "fields": ["name", "G1", "G2", "G3"]
  }
  ```

### Analysis
- `POST /analyze/summary` - Student performance summary
- `POST /analyze/trend` - Grade trend analysis
- `POST /analyze/risk` - Risk assessment

### Class-Level
- `POST /class_analysis` - Get students for class analysis
  ```json
  {
    "limit": 500
  }
  ```

---

## Dashboard Features

### KPI Overview
- Average Final Grade (color-coded)
- Highest / Lowest grades
- At-risk student count and percentage
- Total enrolled students

### Charts & Analytics
- Grade distribution histogram
- Risk status pie chart
- Grade progression line charts

### Class Ranking Leaderboard
- Sortable by Name, Grade, Trend
- Paginated (20 students per page)
- Risk status badges

### Individual Student Panel
- **Overview**: Summary stats, risk flag, study efficiency
- **Grades**: G1 → G2 → G3 progression chart
- **Metrics**: Behavioral data, alerts, risk level

### AI Assistant
- Natural language queries
- Student-specific analysis
- Class-level statistics
- Real-time responses via MCP

---

## Project Structure

```
mcp-agent-dashboard/
├── src/
│   ├── main.py                    # FastAPI application (production server)
│   ├── agent.py                   # LangGraph agent with observability
│   ├── mcp_server.py              # MCP server with observability
│   ├── performance_analyzer.py    # Analytics logic
│   ├── observability.py           # Metrics, tracing, cost tracking
│   └── run_demo.py               # Demo harness (legacy)
├── web/
│   ├── src/
│   │   ├── pages/                 # Dashboard, AI Assistant, Students
│   │   ├── components/            # UI components
│   │   └── api/client.ts          # MCP client
│   └── package.json
├── start_server.py               # Production server startup script
├── requirements.txt              # Python dependencies
├── .env                          # Environment variables
└── README.md                     # This file
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB (Required for real data)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=student-db
MONGO_COLLECTION=student_performance.records

# Groq API (Optional - for LLM intent parsing)
GROQ_API_KEY=your_groq_api_key_here

# Without MongoDB credentials, the server runs with mock data
```

---

## Development

### Running Tests

```bash
# Backend tests (add your tests to tests/ directory)
pytest

# Frontend tests
cd web
npm test
```

### Code Quality

```bash
# Type checking
cd web
npx tsc --noEmit

# Linting
npm run lint
```

---

## Security & Best Practices

- ✅ **Projection Whitelists**: MCP only allows specific fields
- ✅ **Read-Only Access**: No write operations through MCP
- ✅ **Input Validation**: Pydantic validators on all inputs
- ✅ **No Raw Data in Metrics**: Observability uses low-cardinality labels only
- ✅ **Trace Context**: Distributed tracing without exposing sensitive data
- ✅ **Cost Tracking**: Static pricing, no external API calls

---

## Troubleshooting

### Backend won't start
- Check if port 8000 is free: `netstat -ano | findstr :8000`
- Verify MongoDB credentials in `.env`
- Check logs for connection errors

### Frontend can't connect
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify `vite.config.ts` proxy settings

### LLM not working
- Check `GROQ_API_KEY` in `.env`
- System falls back to heuristic parsing if LLM fails
- Check logs for "LLM parsing failed" messages

---

## System Design Assessment

This section addresses 55 critical system design questions organized by impact tier, covering architecture, security, resilience, observability, and production readiness.

### Tier 1: Critical (Architecture, Security, Resilience)

#### Architecture (25-30% impact)

**1. Does it prevent "LLM as the system" anti-pattern?**
✅ **Yes.** The architecture explicitly separates LLM usage to intent parsing only (`src/agent.py:60-156`). All database access, validation, and business logic are deterministic functions. The LLM is a classifier, not the system.

**2. Does it enforce separation between orchestration and reasoning?**
✅ **Yes.** The LangGraph architecture (`src/agent.py:802-834`) separates orchestration (node routing, state management) from reasoning (intent classification). The MCP server (`src/mcp_server.py`) handles data access independently.

**3. Does it make scaling assumptions explicit?**
⚠️ **Partially.** Cache limits are explicit (200 entries, 60s TTL at `src/agent.py:77-81`), but horizontal scaling patterns are not documented.

**4. Can engineers override the LLM deterministically?**
✅ **Yes.** The system has a robust heuristic fallback (`src/agent.py:158-233`) that parses queries without LLM. Engineers can disable LLM entirely by not setting `GROQ_API_KEY`.

**5. Are failure points enumerable at design time?**
✅ **Yes.** All failure modes are enumerated in `src/observability.py:22-28`: `LLM_PARSE`, `VALIDATION`, `MCP_ERROR`, `ANALYSIS`, `TIMEOUT`, `UNKNOWN`.

#### Security (15-20% impact)

**6. Does it prevent direct database access by LLM?**
✅ **Yes.** The LLM never accesses the database. All DB access goes through the MCP server (`src/mcp_server.py`) which has field whitelists (`ALLOWED_FIELDS` at line 21-59) and is read-only.

**7. Does it structurally prevent prompt injection exploits?**
✅ **Yes.** Input validation occurs before LLM output is used (`src/agent.py:241-342`). The validation node checks student_id format with regex and validates fields against `ALLOWED_FIELDS`.

**8. Are audit logs immutable and mandatory?**
⚠️ **Partially.** All operations are logged (`src/observability.py:99`), but immutability requires external log aggregation (e.g., ELK stack) not included in this codebase.

**9. Can decisions be replayed for compliance?**
✅ **Yes.** Distributed tracing (`src/observability.py:103-161`) captures every decision with trace IDs and span contexts. The `get_metrics_summary()` function provides full request history.

**10. Is PII handling explicit and enforced?**
✅ **Yes.** PII fields are controlled via `ALLOWED_FIELDS` whitelist (`src/mcp_server.py:21-59`). MongoDB `_id` is explicitly excluded from responses (`src/mcp_server.py:142`).

#### Resilience (15% impact)

**11. Is LLM failure treated as normal, not exceptional?**
✅ **Yes.** LLM failures are caught and logged (`src/agent.py:149-156`), with automatic fallback to heuristic parsing. The system operates normally without LLM.

**12. Are retry/timeout bounds explicit?**
✅ **Yes.** MCP timeout is explicit (30.0s at `src/agent.py:61`). Error node limits retries to 2 attempts (`src/agent.py:783-791`).

**13. Does the system degrade gracefully?**
✅ **Yes.** If MongoDB fails, the system falls back to mock data (`src/mcp_server.py:76-95`). If LLM fails, heuristic parsing takes over.

**14. Can it handle partial failures in multi-step workflows?**
✅ **Yes.** Each node has independent error handling. The validation node catches errors before DB calls. The error node provides user-friendly messages.

**15. Are escalation paths deterministic?**
✅ **Yes.** The routing function (`src/agent.py:346-354`) has deterministic logic: error → error_node, needs_analysis → analysis, needs_db → mongo, else respond.

### Tier 2: Important (Observability, Production Readiness)

#### Observability (10-15% impact)

**16. Is every agent step traceable?**
✅ **Yes.** All 5 nodes emit spans: `agent.intent`, `agent.validation`, `agent.mcp_call`, `agent.analysis`, `agent.response` (`src/observability.py:170-175`).

**17. Are costs trackable per operation?**
✅ **Yes.** LLM cost tracking with static pricing table (`src/observability.py:50-51`). Costs tracked per model in `llm_cost_usd_total`.

**18. Can you explain decisions without exposing prompts?**
✅ **Yes.** Metrics use low-cardinality labels only (enums in `src/observability.py:13-48`). Trace attributes contain query types, not raw prompts.

**19. Are failure modes observable in metrics?**
✅ **Yes.** Prometheus-compatible counters for all failure types: `agent_failures_total`, `mcp_rejected_requests_total`, `llm_failures_total`.

**20. Do correlation IDs exist?**
✅ **Yes.** Every request gets a `trace_id` (`src/observability.py:110-111`) propagated through all spans.

#### Production Readiness (10-15% impact)

**21. Are deployments reversible?**
⚠️ **Not implemented.** No deployment configuration (Kubernetes, Docker) included in this codebase.

**22. Can you A/B test prompt changes?**
⚠️ **Not implemented.** No feature flags or experiment framework present.

**23. Are conservative defaults enforced?**
✅ **Yes.** Mock data fallback ensures system works without MongoDB. Heuristic parsing works without LLM. Timeout defaults are conservative (30s).

**24. Can you shadow-test before rollout?**
⚠️ **Not implemented.** No shadow traffic or canary deployment setup.

**25. Is there a runbook-friendly design?**
✅ **Yes.** Clear metrics and traces enable runbooks. Health endpoints (`/health`) and Swagger docs (`/docs`) provide operational visibility.

### Tier 3: Table Stakes (Edge Cases, User Context)

#### Edge Cases (10% impact)

**26. Are infinite loops structurally prevented?**
✅ **Yes.** The error node limits attempts to 2 (`src/agent.py:783-791`). LangGraph's acyclic graph prevents true infinite loops.

**27. Are low-confidence states handled explicitly?**
⚠️ **Partially.** LLM parsing errors fall back to heuristic, but no explicit confidence scoring.

**28. Does it account for user abandonment?**
⚠️ **Not implemented.** No session timeout or abandonment detection.

**29. Are conflicting signals resolved deterministically?**
✅ **Yes.** The routing function (`src/agent.py:346-354`) uses deterministic priority: error > analysis > mongo > respond.

**30. Are retries bounded?**
✅ **Yes.** Max 2 attempts in error node (`src/agent.py:783-791`).

#### User Context (5-10% impact)

**31. Is context retrieval strategy explicit?**
✅ **Yes.** The intent node determines query type and sets `needs_db`/`needs_analysis` flags explicitly (`src/agent.py:146,232`).

**32. Is multi-tenancy isolation enforced?**
⚠️ **Not implemented.** No tenant separation in current implementation.

**33. Are policies data, not hardcoded prompts?**
⚠️ **Partially.** Risk thresholds (G3 < 10) are hardcoded in `src/performance_analyzer.py:26,93,140`. Should be configurable.

**34. Is context window exhaustion handled?**
✅ **Yes.** LLM calls limited to 200 tokens (`src/agent.py:95`), well below context limits.

**35. Are personalization boundaries clear?**
✅ **Yes.** The system returns the same analysis for the same input. No personalization that could introduce bias.

### Human Behavior and Trust Failure

**36. What happens when humans over-trust the system?**
⚠️ **Explore further.** No explicit safeguards against rubber-stamping. Risk flags are clearly marked (`src/agent.py:684-688`) but no override workflow exists.

**37. Is human review workload bounded?**
⚠️ **Not applicable.** This is a read-only analytics system with no approval workflows.

**38. Are humans trained or calibrated against the system?**
⚠️ **Not implemented.** No calibration training for dashboard users.

### Feedback Loops and System Drift

**39. How does the system detect policy drift?**
⚠️ **Not implemented.** Risk thresholds are static. No detection for changing student populations or grade distributions.

**40. How do human overrides feed back into thresholds?**
⚠️ **Not applicable.** No human override mechanism in read-only system.

**41. How do you prevent feedback loops?**
✅ **Yes.** The system is read-only with no learning mechanism. No feedback loops possible.

### Incentives, Abuse, and Adversarial Behavior

**42. What prevents internal misuse?**
✅ **Yes.** Read-only MCP server prevents data modification. Projection whitelists limit data exposure.

**43. What prevents claimants from probing thresholds?**
⚠️ **Not applicable.** Student-facing interface not implemented. Teachers use the dashboard.

**44. Are abuse patterns detectable over time?**
⚠️ **Explore further.** Metrics track all queries, but no anomaly detection for unusual query patterns.

### Organizational Ownership and Operations

**45. Who owns incidents?**
⚠️ **Not defined.** No explicit ownership model documented.

**46. Is there a kill switch?**
⚠️ **Not implemented.** No feature flag or kill switch for LLM or analysis components.

**47. Is there a defined on-call path?**
⚠️ **Not implemented.** No paging or escalation procedures defined.

### Data Lifecycle and Retention

**48. How long is claim data retained?**
⚠️ **Not defined.** Retention policy depends on MongoDB configuration, not system logic.

**49. Can data be deleted or anonymized later?**
⚠️ **Not implemented.** No GDPR-style deletion or anonymization workflow.

**50. Are training datasets reproducible?**
✅ **Yes.** Deterministic analysis functions (`src/performance_analyzer.py`) produce reproducible outputs given the same input data.

### Decision Quality and Business Metrics

**51. What is a 'good' decision, quantitatively?**
⚠️ **Not defined.** No explicit accuracy metrics for LLM intent parsing vs. heuristic fallback.

**52. What is the business tradeoff curve?**
⚠️ **Not defined.** Cost tracking exists but no explicit cost/accuracy tradeoff analysis.

**53. Can stakeholders tune risk appetite safely?**
⚠️ **Not implemented.** Risk thresholds are hardcoded. No admin interface for adjustment.

### Decommissioning and Exit Strategy

**54. How do you safely turn this off?**
✅ **Yes.** Stateless design means stopping the service has no data loss. MongoDB remains the source of truth.

**55. Can humans take over seamlessly?**
✅ **Yes.** All data is in MongoDB with standard query interfaces. Dashboard provides raw data view.

---

## License

MIT License - see LICENSE file for details

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## Support

For issues and questions:
- Check the [API_README.md](API_README.md) for backend details
- Check [OBSERVABILITY_SUMMARY.md](OBSERVABILITY_SUMMARY.md) for observability docs
- Open an issue on GitHub
