# Astel Hyper Crew

Standalone control plane for Oleg's AI team. It coordinates projects, agents, approvals and service connectors; it does not own Telegram UI or social-platform tokens.

## Boundary

- **Astel Assistant**: Telegram/Web UI, commands and approval cards.
- **Astel Hyper Crew**: runs, routing, agent graph, budgets, approvals and audit events.
- **Astel Social Engine**: Threads/Instagram/Facebook execution.
- **Astel Distribution Engine**: content distribution.
- **Video Editor**: remains an independent Battle Box production tool.

## V0.1 flow

`CREATED -> RUNNING -> AWAITING_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED`

Reject and failure are terminal. External mutation is only allowed after the non-autonomous human approval gate.

The service includes:

- project and agent registries;
- validated acyclic crew graph;
- idempotent run creation;
- resumable approval/rejection API;
- event history on every run;
- PostgreSQL persistence with in-memory development fallback;
- bearer authentication for internal APIs;
- dry-run operator fallback.

Agent execution is deliberately unconfigured in production V0.1. The next connector will implement the agents with the OpenAI Agents SDK or call an existing content runtime. This prevents placeholder text from being mistaken for real agent work.

## API

```text
GET  /health
GET  /v1/projects
GET  /v1/agents
GET  /v1/runs
GET  /v1/runs/:id
POST /v1/runs
POST /v1/runs/:id/start
POST /v1/runs/:id/decisions
```

All `/v1` routes require `Authorization: Bearer $INTERNAL_API_TOKEN`.

## Local verification

```bash
npm install
npm test
npm start
```

## Research decision

We keep the domain state machine in this repository instead of merging a full orchestration platform.

- OpenAI Agents SDK is the preferred next agent runtime: tools, manager-style orchestration, tracing and serializable approval state.
- Inngest or Trigger.dev is a later durability option when runs must wait for hours/days and resume across deployments.
- LangGraph is technically strong but duplicates the explicit graph/state layer already required by Astel.
- CrewAI is Python-first and would split the current Node.js platform.

This keeps the initial system cheap, inspectable and compatible with the existing Astel codebase.
