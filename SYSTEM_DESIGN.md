# System Design Assessment

This document addresses 55 critical system design questions organized by impact tier, covering architecture, security, resilience, observability, and production readiness.

**[← Back to README](../README.md)**

---

## Tier 1: Critical (Architecture, Security, Resilience)

### Architecture (25-30% impact)

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

### Security (15-20% impact)

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

### Resilience (15% impact)

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

---

## Tier 2: Important (Observability, Production Readiness)

### Observability (10-15% impact)

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

### Production Readiness (10-15% impact)

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

---

## Tier 3: Table Stakes (Edge Cases, User Context)

### Edge Cases (10% impact)

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

### User Context (5-10% impact)

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

---

## Additional System Design Questions

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

## Legend

- ✅ **Yes** - Implemented and working
- ⚠️ **Partially / Not implemented** - Gap identified
- **Explore further** - Needs investigation or design decision

---

*[Back to README](../README.md)*
