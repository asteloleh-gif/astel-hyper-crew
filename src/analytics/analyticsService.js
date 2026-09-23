const { calculateModelCostMicrousd, loadPricing } = require("./pricing");

function finite(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeDays(value, fallback = 30) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(3650, Math.floor(n))) : fallback;
}

function toPublicCost(row) {
  const micro = row.amount_microusd == null ? null : Number(row.amount_microusd);
  return {
    id: row.id,
    runId: row.run_id,
    projectId: row.project_id,
    source: row.source,
    service: row.service,
    agentId: row.agent_id,
    provider: row.provider,
    model: row.model,
    inputTokens: Number(row.input_tokens || 0),
    cachedInputTokens: Number(row.cached_input_tokens || 0),
    outputTokens: Number(row.output_tokens || 0),
    totalTokens: Number(row.input_tokens || 0) + Number(row.output_tokens || 0),
    requests: Number(row.requests || 0),
    toolName: row.tool_name,
    toolCalls: Number(row.tool_calls || 0),
    amountUsd: micro == null ? null : micro / 1_000_000,
    pricingVersion: row.pricing_version,
    occurredAt: row.occurred_at,
    metadata: row.metadata || {},
  };
}

function summarizeCosts(rows = [], groupBy = "agent") {
  const groups = new Map();
  const keyFor = row => {
    if (groupBy === "model") return row.model || "unknown";
    if (groupBy === "provider") return row.provider || "unknown";
    if (groupBy === "source") return row.source || "unknown";
    if (groupBy === "service") return row.service || "unknown";
    return row.agentId || "unattributed";
  };
  const totals = {
    amountUsd: 0,
    knownCostRows: 0,
    unknownCostRows: 0,
    requests: 0,
    toolCalls: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    rows: rows.length,
  };

  for (const raw of rows) {
    const row = toPublicCost(raw);
    const key = keyFor(row);
    const current = groups.get(key) || {
      key,
      amountUsd: 0,
      knownCostRows: 0,
      unknownCostRows: 0,
      requests: 0,
      toolCalls: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      rows: 0,
    };
    for (const target of [current, totals]) {
      target.requests += row.requests;
      target.toolCalls += row.toolCalls;
      target.inputTokens += row.inputTokens;
      target.cachedInputTokens += row.cachedInputTokens;
      target.outputTokens += row.outputTokens;
      target.totalTokens += row.totalTokens;
      if (row.amountUsd == null) target.unknownCostRows += 1;
      else {
        target.amountUsd += row.amountUsd;
        target.knownCostRows += 1;
      }
    }
    current.rows += 1;
    groups.set(key, current);
  }

  return {
    totals: { ...totals, amountUsd: Number(totals.amountUsd.toFixed(6)) },
    groups: [...groups.values()]
      .map(item => ({ ...item, amountUsd: Number(item.amountUsd.toFixed(6)) }))
      .sort((a, b) => b.amountUsd - a.amountUsd || b.totalTokens - a.totalTokens),
  };
}

function summarizeMetrics(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.source}:${row.entity_type}`;
    const current = groups.get(key) || {
      source: row.source,
      entityType: row.entity_type,
      entities: 0,
      metrics: {},
      newestCapturedAt: null,
    };
    current.entities += 1;
    const at = row.captured_at ? new Date(row.captured_at).toISOString() : null;
    if (at && (!current.newestCapturedAt || at > current.newestCapturedAt)) current.newestCapturedAt = at;
    for (const [name, value] of Object.entries(row.metrics || {})) {
      const n = finite(value);
      if (n == null) continue;
      current.metrics[name] = Number(current.metrics[name] || 0) + n;
    }
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source) || a.entityType.localeCompare(b.entityType));
}

function createAnalyticsService({
  repository,
  connectors = [],
  env = process.env,
  now = () => new Date(),
} = {}) {
  if (!repository) throw new Error("Analytics service requires repository");
  const pricing = loadPricing({ env });
  const connectorMap = new Map(connectors.map(connector => [connector.id, connector]));

  async function recordAgentExecution({
    runId,
    projectId,
    agentId,
    model,
    telemetry = {},
    latencyMs = null,
    source = "hyper-crew",
    service = "astel-hyper-crew",
  } = {}) {
    const inputTokens = Number(telemetry.inputTokens || 0);
    const cachedInputTokens = Number(telemetry.cachedInputTokens || 0);
    const outputTokens = Number(telemetry.outputTokens || 0);
    const cost = calculateModelCostMicrousd({
      model,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      pricing,
    });
    return repository.recordCost({
      runId,
      projectId,
      source,
      service,
      agentId,
      provider: "openai",
      model,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      requests: Number(telemetry.requests || 0),
      amountMicrousd: cost.amountMicrousd,
      pricingVersion: cost.pricingVersion,
      metadata: {
        latencyMs: latencyMs == null ? null : Number(latencyMs),
        rate: cost.rate,
      },
      occurredAt: now(),
      idempotencyKey: runId && agentId
        ? `agent:${runId}:${agentId}:${telemetry.attempt || 1}`
        : null,
    });
  }

  async function recordToolCost({
    runId = null,
    projectId = null,
    agentId = null,
    toolName,
    toolCalls = 1,
    amountUsd = null,
    metadata = {},
    idempotencyKey = null,
  } = {}) {
    return repository.recordCost({
      runId,
      projectId,
      source: "tool",
      service: "astel-hyper-crew",
      agentId,
      provider: metadata.provider || null,
      toolName,
      toolCalls,
      amountMicrousd: amountUsd == null ? null : Math.round(Number(amountUsd) * 1_000_000),
      pricingVersion: metadata.pricingVersion || null,
      metadata,
      occurredAt: now(),
      idempotencyKey,
    });
  }

  async function ingestMetric(metric = {}) {
    return repository.recordMetric(metric);
  }

  async function ingestBatch({ metrics = [], costs = [], bindings = [] } = {}) {
    const result = { metrics: 0, costs: 0, bindings: 0 };
    for (const metric of Array.isArray(metrics) ? metrics : []) {
      await repository.recordMetric(metric);
      result.metrics += 1;
    }
    for (const cost of Array.isArray(costs) ? costs : []) {
      await repository.recordCost(cost);
      result.costs += 1;
    }
    for (const binding of Array.isArray(bindings) ? bindings : []) {
      await repository.upsertContentBinding(binding);
      result.bindings += 1;
    }
    return result;
  }

  async function costs({ days = 30, projectId = null, agentId = null, source = null, groupBy = "agent" } = {}) {
    const rows = await repository.listCosts({ days: safeDays(days), projectId, agentId, source });
    return {
      days: safeDays(days),
      projectId,
      groupBy,
      ...summarizeCosts(rows, groupBy),
      pricingVersion: pricing.version,
    };
  }

  async function agents({ days = 30, projectId = null } = {}) {
    const summary = await costs({ days, projectId, groupBy: "agent" });
    return {
      days: summary.days,
      projectId,
      agents: summary.groups.map(item => ({
        agentId: item.key,
        requests: item.requests,
        totalTokens: item.totalTokens,
        inputTokens: item.inputTokens,
        outputTokens: item.outputTokens,
        amountUsd: item.amountUsd,
        costKnown: item.unknownCostRows === 0,
        observations: item.rows,
      })),
      totals: summary.totals,
    };
  }

  async function content({ days = 30, projectId = null, limit = 100 } = {}) {
    const rows = await repository.listLatestMetrics({ days: safeDays(days), projectId, limit: Math.max(1, Math.min(1000, Number(limit) || 100)) });
    const bindings = await repository.listContentBindings({ projectId, limit: 5000 });
    const bindingByEntity = new Map(bindings.map(item => [
      `${item.source}:${item.entity_type}:${item.entity_id}`,
      item,
    ]));

    const items = rows.map(row => {
      const binding = bindingByEntity.get(`${row.source}:${row.entity_type}:${row.entity_id}`);
      return {
        source: row.source,
        projectId: row.project_id,
        accountKey: row.account_key,
        entityType: row.entity_type,
        entityId: row.entity_id,
        contentId: row.content_id || binding?.content_id || null,
        metrics: row.metrics || {},
        dimensions: row.dimensions || {},
        metadata: row.metadata || {},
        capturedAt: row.captured_at,
      };
    });

    return { days: safeDays(days), projectId, items };
  }

  async function overview({ days = 7, projectId = null } = {}) {
    const safe = safeDays(days, 7);
    const [metricRows, costSummary, sync] = await Promise.all([
      repository.listLatestMetrics({ days: safe, projectId, limit: 2000 }),
      costs({ days: safe, projectId, groupBy: "source" }),
      repository.listSyncStates(),
    ]);
    return {
      days: safe,
      projectId,
      metrics: summarizeMetrics(metricRows),
      costs: costSummary,
      sources: sync.map(item => ({
        id: item.connector_id,
        lastStartedAt: item.last_started_at,
        lastSuccessAt: item.last_success_at,
        lastError: item.last_error,
        metadata: item.metadata || {},
      })),
      generatedAt: now().toISOString(),
    };
  }

  async function bindContent(binding) {
    return repository.upsertContentBinding(binding);
  }

  async function sync({ connectorIds = null, days = 30 } = {}) {
    const selected = Array.isArray(connectorIds) && connectorIds.length
      ? connectorIds.map(id => connectorMap.get(id)).filter(Boolean)
      : [...connectorMap.values()];
    const results = [];
    for (const connector of selected) {
      if (connector.enabled && !connector.enabled()) {
        results.push({ connectorId: connector.id, status: "skipped", reason: "NOT_CONFIGURED" });
        continue;
      }
      const startedAt = now().toISOString();
      await repository.setSyncState(connector.id, { startedAt, error: null, metadata: { status: "running" } });
      try {
        const result = await connector.sync({ analytics: { ingestBatch, ingestMetric, bindContent }, days: safeDays(days) });
        const successAt = now().toISOString();
        await repository.setSyncState(connector.id, {
          startedAt,
          successAt,
          error: null,
          cursor: result?.cursor || {},
          metadata: { status: "ok", ...(result?.metadata || {}) },
        });
        results.push({ connectorId: connector.id, status: "ok", ...result });
      } catch (error) {
        await repository.setSyncState(connector.id, {
          startedAt,
          error: error.message,
          metadata: { status: "error" },
        });
        results.push({ connectorId: connector.id, status: "error", error: error.message });
      }
    }
    return { results, syncedAt: now().toISOString() };
  }

  function health() {
    return {
      repository: repository.health?.() || null,
      pricingVersion: pricing.version,
      connectors: [...connectorMap.values()].map(connector => ({
        id: connector.id,
        configured: connector.enabled ? Boolean(connector.enabled()) : true,
      })),
    };
  }

  return {
    recordAgentExecution,
    recordToolCost,
    ingestMetric,
    ingestBatch,
    bindContent,
    costs,
    agents,
    content,
    overview,
    sync,
    health,
    pricing,
  };
}

module.exports = {
  createAnalyticsService,
  summarizeCosts,
  summarizeMetrics,
  toPublicCost,
};
