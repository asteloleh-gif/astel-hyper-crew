const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");

function asDays(value, fallback = 30) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(3650, Math.floor(n))) : fallback;
}

function createPostgresAnalyticsRepository({ connectionString, pool = null } = {}) {
  const db = pool || new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  async function init() {
    const sql = await fs.readFile(path.join(__dirname, "../../migrations/002_analytics_hub.sql"), "utf8");
    await db.query(sql);
  }

  async function recordMetric({
    source,
    projectId = null,
    accountKey = null,
    entityType,
    entityId,
    contentId = null,
    metrics = {},
    dimensions = {},
    metadata = {},
    capturedAt = new Date(),
    idempotencyKey = null,
  } = {}) {
    if (!source || !entityType || !entityId) throw new Error("ANALYTICS_METRIC_IDENTITY_REQUIRED");
    const result = await db.query(
      `INSERT INTO analytics_metric_snapshots
        (source, project_id, account_key, entity_type, entity_id, content_id, metrics, dimensions, metadata, captured_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11)
       ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
       DO UPDATE SET
         metrics = EXCLUDED.metrics,
         dimensions = EXCLUDED.dimensions,
         metadata = EXCLUDED.metadata,
         captured_at = EXCLUDED.captured_at
       RETURNING *`,
      [
        String(source), projectId, accountKey, String(entityType), String(entityId), contentId,
        JSON.stringify(metrics || {}), JSON.stringify(dimensions || {}), JSON.stringify(metadata || {}),
        capturedAt, idempotencyKey,
      ]
    );
    return result.rows[0] || null;
  }

  async function listLatestMetrics({
    days = 30,
    projectId = null,
    source = null,
    contentId = null,
    entityType = null,
    limit = 500,
  } = {}) {
    const params = [];
    const where = [`captured_at >= NOW() - ($${params.push(asDays(days))}::text || ' days')::interval`];
    if (projectId) where.push(`project_id = $${params.push(String(projectId))}`);
    if (source) where.push(`source = $${params.push(String(source))}`);
    if (contentId) where.push(`content_id = $${params.push(String(contentId))}`);
    if (entityType) where.push(`entity_type = $${params.push(String(entityType))}`);
    params.push(Math.max(1, Math.min(5000, Number(limit) || 500)));
    const result = await db.query(
      `SELECT *
       FROM (
         SELECT DISTINCT ON (source, entity_type, entity_id)
           id, source, project_id, account_key, entity_type, entity_id, content_id,
           metrics, dimensions, metadata, captured_at
         FROM analytics_metric_snapshots
         WHERE ${where.join(" AND ")}
         ORDER BY source, entity_type, entity_id, captured_at DESC
       ) latest
       ORDER BY captured_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  }

  async function recordCost({
    id = crypto.randomUUID(),
    runId = null,
    projectId = null,
    source = "hyper-crew",
    service = null,
    agentId = null,
    provider = null,
    model = null,
    inputTokens = 0,
    cachedInputTokens = 0,
    outputTokens = 0,
    requests = 0,
    toolName = null,
    toolCalls = 0,
    amountMicrousd = null,
    pricingVersion = null,
    metadata = {},
    occurredAt = new Date(),
    idempotencyKey = null,
  } = {}) {
    const result = await db.query(
      `INSERT INTO analytics_cost_ledger
        (id, run_id, project_id, source, service, agent_id, provider, model,
         input_tokens, cached_input_tokens, output_tokens, requests, tool_name, tool_calls,
         amount_microusd, pricing_version, metadata, occurred_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
       ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
       DO UPDATE SET
         input_tokens = EXCLUDED.input_tokens,
         cached_input_tokens = EXCLUDED.cached_input_tokens,
         output_tokens = EXCLUDED.output_tokens,
         requests = EXCLUDED.requests,
         tool_calls = EXCLUDED.tool_calls,
         amount_microusd = EXCLUDED.amount_microusd,
         pricing_version = EXCLUDED.pricing_version,
         metadata = EXCLUDED.metadata,
         occurred_at = EXCLUDED.occurred_at
       RETURNING *`,
      [
        id, runId, projectId, String(source), service, agentId, provider, model,
        Number(inputTokens || 0), Number(cachedInputTokens || 0), Number(outputTokens || 0),
        Number(requests || 0), toolName, Number(toolCalls || 0),
        amountMicrousd == null ? null : Number(amountMicrousd), pricingVersion,
        JSON.stringify(metadata || {}), occurredAt, idempotencyKey,
      ]
    );
    return result.rows[0] || null;
  }

  async function listCosts({ days = 30, projectId = null, agentId = null, source = null, limit = 5000 } = {}) {
    const params = [];
    const where = [`occurred_at >= NOW() - ($${params.push(asDays(days))}::text || ' days')::interval`];
    if (projectId) where.push(`project_id = $${params.push(String(projectId))}`);
    if (agentId) where.push(`agent_id = $${params.push(String(agentId))}`);
    if (source) where.push(`source = $${params.push(String(source))}`);
    params.push(Math.max(1, Math.min(20000, Number(limit) || 5000)));
    const result = await db.query(
      `SELECT *
       FROM analytics_cost_ledger
       WHERE ${where.join(" AND ")}
       ORDER BY occurred_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  }

  async function upsertContentBinding({
    contentId,
    source,
    projectId = null,
    accountKey = null,
    entityType,
    entityId,
    metadata = {},
  } = {}) {
    if (!contentId || !source || !entityType || !entityId) throw new Error("CONTENT_BINDING_IDENTITY_REQUIRED");
    const result = await db.query(
      `INSERT INTO analytics_content_bindings
        (content_id, source, project_id, account_key, entity_type, entity_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (source, entity_type, entity_id)
       DO UPDATE SET
         content_id = EXCLUDED.content_id,
         project_id = EXCLUDED.project_id,
         account_key = EXCLUDED.account_key,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [String(contentId), String(source), projectId, accountKey, String(entityType), String(entityId), JSON.stringify(metadata || {})]
    );
    return result.rows[0] || null;
  }

  async function listContentBindings({ projectId = null, contentId = null, limit = 1000 } = {}) {
    const params = [];
    const where = [];
    if (projectId) where.push(`project_id = $${params.push(String(projectId))}`);
    if (contentId) where.push(`content_id = $${params.push(String(contentId))}`);
    params.push(Math.max(1, Math.min(5000, Number(limit) || 1000)));
    const result = await db.query(
      `SELECT * FROM analytics_content_bindings
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY updated_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  }

  async function setSyncState(connectorId, {
    cursor = {},
    startedAt = null,
    successAt = null,
    error = null,
    metadata = {},
  } = {}) {
    const result = await db.query(
      `INSERT INTO analytics_sync_state
        (connector_id, cursor, last_started_at, last_success_at, last_error, metadata, updated_at)
       VALUES ($1,$2::jsonb,$3,$4,$5,$6::jsonb,NOW())
       ON CONFLICT (connector_id)
       DO UPDATE SET
         cursor = EXCLUDED.cursor,
         last_started_at = COALESCE(EXCLUDED.last_started_at, analytics_sync_state.last_started_at),
         last_success_at = COALESCE(EXCLUDED.last_success_at, analytics_sync_state.last_success_at),
         last_error = EXCLUDED.last_error,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [String(connectorId), JSON.stringify(cursor || {}), startedAt, successAt, error, JSON.stringify(metadata || {})]
    );
    return result.rows[0] || null;
  }

  async function listSyncStates() {
    const result = await db.query("SELECT * FROM analytics_sync_state ORDER BY connector_id");
    return result.rows;
  }

  return {
    init,
    recordMetric,
    listLatestMetrics,
    recordCost,
    listCosts,
    upsertContentBinding,
    listContentBindings,
    setSyncState,
    listSyncStates,
    close: () => db.end(),
    health: () => ({ backend: "postgres", configured: true }),
  };
}

module.exports = { createPostgresAnalyticsRepository };
