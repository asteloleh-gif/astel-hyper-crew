# Edie Analytics Hub v1

Edie is the read-only analytics/BI layer for Astel. The Hub lives inside the standalone Hyper Crew service and normalizes metrics, costs and content identity without giving the analyst mutation credentials.

## Data flow

```text
Hyper Crew telemetry ─┐
Social Engine ────────┤
YouTube Analytics ────┤
future PostHog ───────┤
future Distribution ──┤
                      ↓
             Edie Analytics Hub
             PostgreSQL snapshots
                      ↓
           read-only analytics tools
                      ↓
                Edie Dataman
```

## Storage

- `analytics_metric_snapshots` — normalized source/entity snapshots.
- `analytics_cost_ledger` — tokens, calls and attributable USD cost.
- `analytics_content_bindings` — maps one logical Astel content item to platform entities.
- `analytics_sync_state` — connector freshness/errors.

External platform credentials remain owned by their source engine where possible.

## Cost rules

Known prices are versioned. The default v1 table contains the models currently used by Hyper Crew. `AI_PRICING_JSON` can override/add model rates without a code deploy.

If a model/tool has no configured rate, the ledger stores usage but leaves cost unknown. Edie must never convert unknown usage into a fabricated dollar amount.

## Connectors

### Social Engine
Set `SOCIAL_ANALYTICS_BASE_URL` and `SOCIAL_ANALYTICS_TOKEN`.
The connector imports stored platform insight snapshots, community activity and durable AI-run costs.

### YouTube

Preferred path is Windsor.ai because Astel Family is already connected there. Set `WINDSOR_API_KEY` and leave `YOUTUBE_ANALYTICS_PROVIDER=auto` (or set it to `windsor`). The connector reads the connected Astel Family account, aggregates daily rows per video, and imports views, engaged views, watch time, retention, engagement and subscriber movement.

A direct Google OAuth connector remains available as a fallback. Set `YOUTUBE_ANALYTICS_PROVIDER=google` plus `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN`.

### Generic ingestion
Other engines can push normalized batches through authenticated `POST /v1/analytics/ingest`. This is the integration seam for Distribution, PostHog rollups, Video Editor plans and future revenue sources.

## Edie tools

When the analytics agent is selected in Crew Chat she receives read-only tools:

- `analytics_overview`
- `analytics_content`
- `analytics_costs`
- `analytics_agents`
- `analytics_sync`

No analytics tool can publish, modify social accounts or change infrastructure.

## API

```text
GET  /v1/analytics/overview
GET  /v1/analytics/costs
GET  /v1/analytics/agents
GET  /v1/analytics/content
POST /v1/analytics/sync
POST /v1/analytics/ingest
POST /v1/analytics/bindings
```

All routes inherit the existing Hyper Crew bearer authentication.
