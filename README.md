# LangGraph — MCP-backed Student Analysis Agent

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A production-ready LangGraph-style agent that safely routes user requests through a minimal MCP (Model-Connector-Proxy) server to analyze student performance data. Designed for safety, observability, and graceful failure handling.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
  - [One-Line Install](#one-line-install)
  - [Manual Setup](#manual-setup)
- [Architecture](#architecture)
- [API Overview](#api-overview)
- [Observability](#observability)
- [Development](#development)
- [Roadmap](#roadmap)
- [Support](#support)

---

## Overview

This system helps educators analyze student performance data to identify at-risk students, track grade trends, and gain insights through an AI assistant interface.

**Why MCP?** The Model-Connector-Proxy pattern creates a strict boundary between AI reasoning and data access. This prevents the "LLM as the system" anti-pattern by ensuring the LLM only classifies intent, while all data operations go through deterministic, auditable, read-only channels.

---

## Features

- **AI-Powered Analytics** — Natural language queries about students with LLM intent parsing and deterministic fallback
- **Performance Analysis** — Student summaries, trend detection, risk assessment, and class rankings  
- **Real-Time Dashboard** — React + TypeScript interface with KPIs, charts, and leaderboards
- **Comprehensive Observability** — Prometheus metrics, distributed tracing, and LLM cost tracking
- **Security-First Design** — Read-only MCP server, projection whitelists, input validation
- **Graceful Degradation** — Works without LLM (heuristic fallback) and without MongoDB (mock data)

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas) — *or use Docker for one-command setup*

### One-Line Install

```bash
curl -sSL https://raw.githubusercontent.com/dicksarp09/mcp-agent-dashboard/main/install.sh | bash
```

This will:
1. Clone the repository
2. Set up Docker containers (MongoDB, backend, frontend)
3. Configure environment variables
4. Start all services

Access the dashboard at: **http://localhost:3000**

### Manual Setup

#### 1. Backend Setup

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

#### 2. Frontend Setup

```bash
cd web
npm install
npm run dev
```

Dashboard runs on `http://localhost:3000`

#### 3. Access the Application

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
│  │  Intent Classification Node  │  │ ← Rule-based + LLM fallback
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

### Key Components

- **Agent** (`src/agent.py`) — Orchestrates LangGraph nodes with observability instrumentation
- **MCP Server** (`src/mcp_server.py`) — Read-only MongoDB access with security whitelists
- **Performance Analyzer** (`src/performance_analyzer.py`) — Deterministic analytics logic
- **Observability** (`src/observability.py`) — Metrics, tracing, and cost tracking

### System Design

For a detailed 55-question system design assessment covering architecture, security, resilience, and observability, see **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)**.

---

## API Overview

### Health & Info

- `GET /` — API info and status
- `GET /health` — Health check
- `GET /docs` — Swagger UI documentation

### Student Queries

- `POST /query` — Query single student by ID
- `POST /analyze/summary` — Student performance summary
- `POST /analyze/trend` — Grade trend analysis
- `POST /analyze/risk` — Risk assessment
- `POST /class_analysis` — Class-level analysis

### Example Query

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"student_id": "689cef602490264c7f2dd235", "fields": ["name", "G1", "G2", "G3"]}'
```

For complete API documentation, see **[API_README.md](API_README.md)**.

---

## Observability

The system includes comprehensive observability covering 80% of production needs.

### Metrics Available

- **Request Metrics** — Total requests, failures by node/query type
- **Latency Metrics** — Execution time per node, MCP calls, LLM calls
- **Cache Metrics** — Hit/miss rates (up to 1,295x speedup observed)
- **Cost Tracking** — LLM token usage and estimated USD cost per model

### Distributed Tracing

Every request is traced through all 5 agent nodes with correlation IDs:
- `agent.intent` — Intent parsing
- `agent.validation` — Request validation  
- `agent.mcp_call` — MCP server call
- `agent.analysis` — Performance analysis
- `agent.response` — Response synthesis

### Accessing Metrics

```python
from src.observability import get_metrics_summary

summary = get_metrics_summary()
print(f"Cache hits: {summary['cache_hits']}")
print(f"Total LLM cost: ${sum(summary['llm_cost_usd'].values())}")
```

Prometheus metrics endpoint: `GET /metrics`

For detailed observability documentation, see **[OBSERVABILITY_SUMMARY.md](OBSERVABILITY_SUMMARY.md)**.

---

## Development

### Project Structure

```
mcp-agent-dashboard/
├── src/
│   ├── main.py                    # FastAPI application
│   ├── agent.py                   # LangGraph agent
│   ├── mcp_server.py              # MCP server
│   ├── performance_analyzer.py    # Analytics logic
│   └── observability.py           # Metrics & tracing
├── web/                           # React frontend
├── SYSTEM_DESIGN.md               # Detailed system design
├── DEPLOYMENT.md                  # Deployment guide
└── README.md                      # This file
```

### Running Tests

```bash
# Backend tests
pytest

# Frontend tests
cd web
npm test
```

### Code Quality

```bash
# Type checking (frontend)
cd web
npx tsc --noEmit

# Linting (frontend)
npm run lint
```

### Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB (Required for real data)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB=student-db
MONGO_COLLECTION=student_performance.records

# Groq API (Optional - for LLM intent parsing)
GROQ_API_KEY=your_groq_api_key_here

# Without MongoDB credentials, the server runs with mock data
```

---

## Roadmap

### Current Limitations

- Risk thresholds are hardcoded (G3 < 10)
- No multi-tenancy support
- No configurable policies via UI
- Production deployment requires manual setup

### Planned Features

- [ ] Configurable risk thresholds via admin interface
- [ ] Multi-tenant support with data isolation
- [ ] Advanced analytics (predictive modeling)
- [ ] Mobile-responsive dashboard improvements
- [ ] Kubernetes deployment templates
- [ ] A/B testing framework for prompt changes
- [ ] Anomaly detection for unusual query patterns
- [ ] GDPR-compliant data deletion workflows

---

## Security & Best Practices

- ✅ **Projection Whitelists** — MCP only allows specific fields
- ✅ **Read-Only Access** — No write operations through MCP
- ✅ **Input Validation** — Pydantic validators on all inputs
- ✅ **No Raw Data in Metrics** — Observability uses low-cardinality labels only
- ✅ **Trace Context** — Distributed tracing without exposing sensitive data
- ✅ **Cost Tracking** — Static pricing, no external API calls

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

### Docker Issues

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed Docker troubleshooting.

---

## Support

For issues and questions:

- Check the **[API_README.md](API_README.md)** for backend details
- Check **[OBSERVABILITY_SUMMARY.md](OBSERVABILITY_SUMMARY.md)** for observability docs
- Check **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** for architecture details
- Check **[DEPLOYMENT.md](DEPLOYMENT.md)** for deployment guide
- Open an issue on GitHub

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with** FastAPI, React, LangGraph, and MongoDB
