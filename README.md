# Astel Hyper Crew

Standalone control plane for Oleg's AI team. It coordinates projects, agents, approvals and service connectors; it does not own Telegram UI or social-platform tokens.

## Boundary

- **Astel Assistant**: Telegram/Web UI, commands and approval cards.
- **Astel Hyper Crew**: runs, routing, agent graph, budgets, approvals and audit events.
- **Astel Social Engine**: Threads/Instagram/Facebook execution.
- **Astel Distribution Engine**: content distribution.
- **Video Editor**: remains an independent Battle Box production tool.

## Operating model — Kevin-first, cost-first

**Kevin Dot is the primary orchestrator and the single user-facing control point.**
Hyper Crew is subordinate infrastructure: Kevin may invoke individual Hyper Crew capabilities only when they add clear value.

Operating rules:
- Do not run the full multi-agent graph automatically for ordinary work.
- Prefer ChatGPT/Dot capabilities, existing project context, local skills, stored knowledge, deterministic code and already-paid services before any metered OpenAI API call.
- OpenAI API-backed Hyper Crew agent execution is optional and must fail closed when `OPENAI_API_KEY` is absent.
- Use the minimum necessary Hyper Crew stage(s) for the task; avoid duplicate research, strategy, copy, review, visual or distribution calls when Kevin already has an acceptable result.
- Edie analytics, registries, logs, connectors and deterministic utilities may operate without creating new LLM calls when their underlying source does not require them.
- Yuki is a visual/distribution support capability for Kevin; Kevin remains responsible for the production decision and final video handoff.
- External publication, destructive changes, credentials, billing and paid-service activation remain human-approved.
- Cost is a first-class production metric. Every API-backed run must remain inside configured request/token budgets and should be avoided when expected value is lower than its cost.

The internal `orchestrator` registry entry is **Astel Core — Hyper Crew Team Lead**. It coordinates only the Hyper Crew backend and must not be confused with the primary Kevin Dot.

This repository is therefore a **backend/toolbox for Kevin**, not a competing top-level orchestrator.

## V0.1 flow

`CREATED -> RUNNING -> AWAITING_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED`

Reject and failure are terminal. External mutation is only allowed after the non-autonomous human approval gate.

The service includes:

- project and agent registries;
- local-first Skill Registry with hard/soft skill profiles for all nine crew members;
- skill-to-service binding registry that declares which runtime/service actually powers each skill;
- curated permanent knowledge packs and role playbooks;
- freshness-aware research policy so stable domain questions do not automatically browse;
- optional OpenAI File Search vector knowledge via `ASTEL_KNOWLEDGE_VECTOR_STORE_ID`;
- Edie Analytics Hub with normalized metrics, AI cost ledger, source freshness and read-only analyst tools;
- connector registry for Social Engine, Distribution Engine and Video Editor;
- validated acyclic crew graph;
- idempotent run creation;
- resumable approval/rejection API;
- event history on every run;
- PostgreSQL persistence with in-memory development fallback;
- bearer authentication for internal APIs;
- dry-run operator fallback.

The pre-approval team is:

`Researcher -> Strategist -> Copywriter -> Reviewer -> Distribution Manager -> Human Approval`

Distribution Manager prepares the channel plan but cannot publish. The approval package contains the draft, review and distribution plan. Only the post-approval operator may call an execution engine.

Agent execution uses the OpenAI Agents SDK with Zod-validated outputs. Researcher alone receives hosted web search; the other roles only transform the supplied, traceable evidence. Reviewer may request one controlled rewrite. A second non-PASS decision fails the run before Distribution Manager.

Runtime cost is bounded per run with request and token ceilings. Defaults are 8 requests and 30,000 total reported tokens. Model names and limits are configurable through environment variables.

## API

```text
GET  /health
GET  /v1/projects
GET  /v1/agents
GET  /v1/skills
GET  /v1/service-bindings
GET  /v1/agents/:id/profile
GET  /v1/connectors
GET  /v1/analytics/overview
GET  /v1/analytics/costs
GET  /v1/analytics/agents
GET  /v1/analytics/content
POST /v1/analytics/sync
POST /v1/analytics/ingest
POST /v1/analytics/bindings
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


## Skill Brains

See [docs/SKILL_BRAINS.md](docs/SKILL_BRAINS.md) for the nine-agent hard/soft skill tree, local-first knowledge policy, freshness rules and optional vector-store integration.


## Analytics Hub

See [docs/ANALYTICS_HUB.md](docs/ANALYTICS_HUB.md) for Edie's storage model, cost rules, connectors and read-only tool surface.


## Skill-to-service bindings

Skills are not treated as capabilities until a runtime/service binding exists. The registry separates:

- `wired` — callable in the current Hyper Crew runtime;
- `connector-only` — known service/capability, but not exposed as a chat tool yet;
- `planned` — intended deterministic backend capability, not implemented yet.

Current wired specialist services include Tommy web search, Yuki image generation and Edie Analytics Hub. Strategy/writing/review skills use the optional metered OpenAI agent runtime. Social/Distribution/Video connectors remain explicit bindings without pretending that execution is wired.

External mutation capabilities retain an explicit approval requirement.
