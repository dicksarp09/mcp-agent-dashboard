
# LangGraph — MCP-backed Student Analysis Agent

This repository implements a small LangGraph-style agent that safely routes user requests through a minimal MCP (Model-Connector-Proxy) server to query MongoDB, performs deterministic analysis, and synthesizes human-readable responses. It is designed for safety, observability, and graceful failure handling when AI components are uncertain.

**Contents**
- **Backend** (`src/` + `run_demo.py`): Python LangGraph agent, MCP server, performance analyzer
- **Frontend** (`web/`): React 18 + TypeScript dashboard with charts, filters, student panels
- `src/mcp_server.py`: FastAPI MCP server enforcing strict input/output schemas and read-only Mongo projections.
- `src/agent.py`: LangGraph-style node runner (Intent, Validation, Mongo MCP client, Analysis, Response, Error).
- `src/performance_analyzer.py`: Student- and class-level analytics (summaries, trends, derived metrics, sparklines).
- `web/`: React dashboard (see [web/README.md](web/README.md) for frontend documentation).
- `run_demo.py`: Demo harness that runs the MCP and example queries.

**Architecture Layout**

<img width="1536" height="1024" alt="ChatGPT Image Jan 31, 2026, 02_51_12 AM" src="https://github.com/user-attachments/assets/2ad826eb-3a18-4d9d-85de-510e7f7f299b" />


- Components:
	- Agent (`src/agent.py`): Orchestrates nodes (Intent, Validation, Routing, MCP client, Analysis, Response). It contains local caching and retry logic.
	- MCP (`src/mcp_server.py`): Single-purpose FastAPI service that performs read-only, projection-limited queries against MongoDB. Acts as the only component with direct DB access.
	- Analyzer (`src/performance_analyzer.py`): Pure-Python business logic that computes student summaries, trends, derived alerts, and class statistics.
	- Runner (`run_demo.py`): Local demo harness that launches the MCP and drives example queries.

- Data flow (simplified):

	User -> Agent (Intent Node → Validation) -> MCP (projection-only query) -> MongoDB
																					 \-> Analyzer (if requested) -> Agent -> User

- Deployment notes:
	- The MCP is the recommended deployable boundary (container or serverless function). The agent can run in the same VPC or separately and call MCP over TLS.
	- For multi-instance production, replace the in-process TTL cache with Redis or Memcached and add request tracing (OpenTelemetry).

**Tech Stack**
- Language: Python 3.10+ (3.11 recommended)
- Web/API: FastAPI + Uvicorn (MCP)
- Data: MongoDB (pymongo) — Atlas recommended for production
- LLM: Groq client (model: `llama-3.3-70b-versatile`) used for intent parsing (optional)
- Packaging & config: `python-dotenv` for local secret loading
- Security & TLS: `certifi` (passed into `MongoClient` via `tlsCAFile` for Atlas)
- Caching (demo): simple in-memory TTL cache (swap for Redis in production)
- Testing: `pytest` recommended
- Observability: builtin logging per node; recommend adding OpenTelemetry/Prometheus in production



**Quick Start**

**Backend Setup:**
- Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

- Provide runtime secrets in a `.env` file in the project root (optional for demo):
  - `MONGO_URI`, `MONGO_DB`, `MONGO_COLLECTION` — for real MongoDB Atlas access
  - `GOOGLE_API_KEY` — Groq API key for LLM intent parsing (optional)

- Run the backend MCP server (stays running; serves on `http://127.0.0.1:8000`):

```powershell
python run_demo.py
```

**Frontend Setup (new terminal):**
- Navigate to the web folder and install dependencies:

```powershell
cd web
npm install
npm run dev
```

- Dashboard runs on `http://localhost:3000`

**Full Integration:**
- Backend MCP server on port 8000
- Frontend dev server on port 3000 (proxies `/api/*` to backend)
- Open `http://localhost:3000` and start exploring student data

**How it works**
- Intent parsing: a dedicated Intent node calls an LLM (Groq) to parse user intent into a small, strict JSON payload (query_type, student_id, analysis options). A deterministic fallback parses natural language if the LLM response is absent or malformed.
- Validation: a light-weight validator enforces allowed query types and required parameters.
- MCP server: the agent never connects to MongoDB directly — all reads go through `src/mcp_server.py` which accepts projection-limited, read-only requests and returns sanitized documents. TLS CA (via `certifi`) and request timeouts are enforced to handle real Atlas latency and SSL.
- Analysis node: business logic in `src/performance_analyzer.py` computes student summaries (averages, growth, sparklines), derived metrics (alerts, risk levels), and class-level statistics with pagination and filters.
- Response synthesis: combines projected fields + analysis outputs into concise, human-readable text. The system returns structured JSON when callers request programmatic output.

**How smart product decisions were made**
- Safety-first: never give the LLM direct DB access. The MCP enforces a whitelist of allowed projection fields to reduce data exposure and accidental writes.
- Deterministic fallback: LLMs are helpful at intent parsing, but fallbacks (regex heuristics and explicit validation) ensure the system behaves predictably when the model fails or returns non-JSON.
- Observability: node-level logging records durations, outcomes, and failure reasons so product and SRE teams can prioritize model or infra fixes.
- Incremental UX: textual sparklines and risk-level cues provide immediate, low-cost signals before investing in a full graphical dashboard.
- Configurable tradeoffs: analysis options (top N, pagination, at-risk filters, grade thresholds) are parsed from either LLM output or heuristics so product can rapidly iterate on API ergonomics.

**Does this resonate with systems-level concerns?**

Error handling and reliability
- Layered failures: every external call (LLM, MCP/DB) has a timeout and explicit error handling. The agent increments an `attempt_count` and fails gracefully after a small number of retries to avoid looping or accidental repeated charges to LLMs.
- Fallbacks: when the LLM output is missing or unparsable, deterministic parsing and conservative defaults are used. If the MCP returns no results, the agent returns a helpful, non-technical explanation (e.g., "No student found for given id") and suggests next steps.
- MCP safeguards: the MCP is the single source-of-truth for database access and enforces projection whitelists, input validation, and read-only semantics to reduce blast radius.

Edge cases and data quality
- Missing fields: analyzers assume missing numeric fields as null and compute sensible defaults (e.g., skip empty arrays, report insufficient data). All outputs explicitly label uncertainty (e.g., "insufficient trend data").
- Partial datasets: class analysis supports pagination and filters so results remain responsive even on large collections; heavy queries are limited by server-side paging and projection.
- Malformed IDs: pydantic validators in MCP validate `ObjectId` formats and return clear 400 errors.

User experience when AI fails
- Transparent messaging: when intent parsing fails, the system returns the deterministic fallback result and includes a short note that the LLM parsing was inconclusive.
- Safe defaults: when analysis is impossible due to missing data, the agent returns what it can (raw projections) and an actionable message describing what's missing.
- Human-in-the-loop: outputs are intentionally concise and include suggested follow-ups (e.g., "try 'student 123 analysis' or provide student name") so a human can quickly correct queries.

**Design choices explained**
- Why an MCP? Centralizing DB access in a minimal API reduces the attack surface, simplifies audits, and decouples the model from data access rules.
- Why projection whitelists? Limits risk of exposing PII or unexpected fields when the LLM crafts queries.
- Why mix LLM + deterministic parsing? LLMs are excellent for flexible natural language handling; deterministic fallback ensures correctness and reproducibility for product-critical operations.
- Why textual sparklines & emoji cues? Low-effort, high-signal visual cues accelerate review in terminals and logs without building a full frontend.
- Why local TTL cache? It reduces repeated RPCs for hot student queries during demos and light usage without introducing external infra like Redis.

**Files of interest**
- `src/mcp_server.py` — MCP endpoint and input validation
- `src/agent.py` — node orchestration and MCP client
- `src/performance_analyzer.py` — analytics logic and sparklines
- `run_demo.py` — example runner and sanity checks
- `web/` — React dashboard (see [web/README.md](web/README.md))
- `web/src/api/client.ts` — MCP client with caching
- `web/src/App.tsx` — main layout and KPI orchestration
- `web/src/components/` — reusable UI components (Navbar, Leaderboard, StudentPanel, etc.)

**Environment & Security notes**
- Keep `MONGO_URI` and API keys out of source control. Use `.env` for local demos and a secrets manager in production.
- When using Atlas, prefer IP-restricted keys and short-lived credentials.

**Next steps & suggestions**
- Add unit and integration tests for analyzers and MCP endpoints.
- Replace local cache with Redis for multi-instance deployments.
- Add a lightweight web UI or export CSV for richer visualization of trends.
- Add CI checks to validate LLM intent-output schema periodically (contract testing).
- Add authentication & role-based access control (RBAC) to dashboard (student vs. teacher vs. admin views).
- Implement export-to-CSV / PDF in dashboard for reports.
- Add real-time WebSocket notifications for at-risk alerts.
- Dark mode toggle in dashboard settings.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                  React Dashboard (web/)                      │
│  [KPI Cards] [Leaderboard] [Student Panel] [Charts/Filters]  │
└─────────────────────────┬──────────────────────────────────┐ 
                          │ API calls: /query, /class_analysis
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI MCP Server (src/mcp_server.py)          │
│  [Projection Whitelist] [Read-only] [Input Validation]       │
└─────────────────────────┬──────────────────────────────────┐
                          │ (Mongo only via MCP)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│            MongoDB Atlas / Local Collection                  │
│  [Student Docs: G1, G2, G3, absences, failures, etc.]       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│    LangGraph Agent (src/agent.py) — Used in run_demo.py     │
│  [Intent Node + Groq LLM] → [Validation] → [MCP Client]    │
│  → [Analysis Node] → [Response Synthesis]                    │
└──────────────────────────────────────────────────────────────┘
```

## Dashboard Features

**1. KPI Overview (Top of Dashboard)**
- Average Final Grade with color coding (green ≥12, yellow 10-12, red <10)
- Highest / Lowest grades in class
- At-risk student count and percentage
- Total enrolled students

**2. Charts & Analytics**
- Grade distribution histogram (0-5, 5-10, 10-15, 15-20)
- Risk status pie chart (Healthy vs At-Risk vs Warning)
- Interactive tooltips on hover

**3. Class Ranking Leaderboard**
- Sortable by Name, Final Grade (G3), Trend
- Paginated (20 students per page)
- Risk status badges (red = <10, yellow = 10-12, green = ≥12)
- Click a student to open detailed panel

**4. Individual Student Panel**
- **Overview Tab**: Summary stats, at-risk flag, study efficiency
- **Grades Tab**: Line chart showing G1 → G2 → G3 progression
- **Metrics Tab**: Behavioral data (absences, alcohol consumption, social outings), risk level, alerts

**5. Filters & Search**
- Grade range slider (0–20)
- Risk status radio buttons (at-risk, healthy, improving, declining)
- Study time slider (0–4 hours/week)
- Dynamic filtering updates all charts and tables in real-time
