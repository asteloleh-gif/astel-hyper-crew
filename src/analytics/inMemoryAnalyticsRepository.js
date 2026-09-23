const crypto = require("node:crypto");

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createInMemoryAnalyticsRepository() {
  const metrics = [];
  const costs = [];
  const bindings = new Map();
  const syncStates = new Map();

  async function recordMetric(input = {}) {
    if (!input.source || !input.entityType || !input.entityId) throw new Error("ANALYTICS_METRIC_IDENTITY_REQUIRED");
    const key = input.idempotencyKey || null;
    const row = {
      id: metrics.length + 1,
      source: String(input.source),
      project_id: input.projectId || null,
      account_key: input.accountKey || null,
      entity_type: String(input.entityType),
      entity_id: String(input.entityId),
      content_id: input.contentId || null,
      metrics: clone(input.metrics || {}),
      dimensions: clone(input.dimensions || {}),
      metadata: clone(input.metadata || {}),
      captured_at: new Date(input.capturedAt || Date.now()).toISOString(),
      idempotency_key: key,
    };
    if (key) {
      const index = metrics.findIndex(item => item.idempotency_key === key);
      if (index >= 0) { metrics[index] = row; return clone(row); }
    }
    metrics.push(row);
    return clone(row);
  }

  async function listLatestMetrics({ days = 30, projectId = null, source = null, contentId = null, entityType = null, limit = 500 } = {}) {
    const cutoff = Date.now() - Number(days || 30) * 86400000;
    const filtered = metrics.filter(row =>
      new Date(row.captured_at).getTime() >= cutoff &&
      (!projectId || row.project_id === projectId) &&
      (!source || row.source === source) &&
      (!contentId || row.content_id === contentId) &&
      (!entityType || row.entity_type === entityType)
    ).sort((a,b) => new Date(b.captured_at) - new Date(a.captured_at));
    const seen = new Set();
    return filtered.filter(row => {
      const key = `${row.source}:${row.entity_type}:${row.entity_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit).map(clone);
  }

  async function recordCost(input = {}) {
    const row = {
      id: input.id || crypto.randomUUID(),
      run_id: input.runId || null,
      project_id: input.projectId || null,
      source: String(input.source || "hyper-crew"),
      service: input.service || null,
      agent_id: input.agentId || null,
      provider: input.provider || null,
      model: input.model || null,
      input_tokens: Number(input.inputTokens || 0),
      cached_input_tokens: Number(input.cachedInputTokens || 0),
      output_tokens: Number(input.outputTokens || 0),
      requests: Number(input.requests || 0),
      tool_name: input.toolName || null,
      tool_calls: Number(input.toolCalls || 0),
      amount_microusd: input.amountMicrousd == null ? null : Number(input.amountMicrousd),
      pricing_version: input.pricingVersion || null,
      metadata: clone(input.metadata || {}),
      occurred_at: new Date(input.occurredAt || Date.now()).toISOString(),
      idempotency_key: input.idempotencyKey || null,
    };
    if (row.idempotency_key) {
      const index = costs.findIndex(item => item.idempotency_key === row.idempotency_key);
      if (index >= 0) { costs[index] = row; return clone(row); }
    }
    costs.push(row);
    return clone(row);
  }

  async function listCosts({ days = 30, projectId = null, agentId = null, source = null, limit = 5000 } = {}) {
    const cutoff = Date.now() - Number(days || 30) * 86400000;
    return costs.filter(row =>
      new Date(row.occurred_at).getTime() >= cutoff &&
      (!projectId || row.project_id === projectId) &&
      (!agentId || row.agent_id === agentId) &&
      (!source || row.source === source)
    ).sort((a,b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, limit).map(clone);
  }

  async function upsertContentBinding(input = {}) {
    if (!input.contentId || !input.source || !input.entityType || !input.entityId) throw new Error("CONTENT_BINDING_IDENTITY_REQUIRED");
    const key = `${input.source}:${input.entityType}:${input.entityId}`;
    const row = {
      content_id: String(input.contentId),
      source: String(input.source),
      project_id: input.projectId || null,
      account_key: input.accountKey || null,
      entity_type: String(input.entityType),
      entity_id: String(input.entityId),
      metadata: clone(input.metadata || {}),
      updated_at: new Date().toISOString(),
    };
    bindings.set(key, row);
    return clone(row);
  }

  async function listContentBindings({ projectId = null, contentId = null, limit = 1000 } = {}) {
    return [...bindings.values()]
      .filter(row => (!projectId || row.project_id === projectId) && (!contentId || row.content_id === contentId))
      .slice(0, limit).map(clone);
  }

  async function setSyncState(connectorId, input = {}) {
    const prior = syncStates.get(connectorId) || {};
    const row = {
      connector_id: String(connectorId),
      cursor: clone(input.cursor || prior.cursor || {}),
      last_started_at: input.startedAt || prior.last_started_at || null,
      last_success_at: input.successAt || prior.last_success_at || null,
      last_error: input.error ?? prior.last_error ?? null,
      metadata: clone(input.metadata || {}),
      updated_at: new Date().toISOString(),
    };
    syncStates.set(connectorId, row);
    return clone(row);
  }

  return {
    init: async () => {},
    recordMetric,
    listLatestMetrics,
    recordCost,
    listCosts,
    upsertContentBinding,
    listContentBindings,
    setSyncState,
    listSyncStates: async () => [...syncStates.values()].map(clone),
    health: () => ({ backend: "memory", configured: true }),
  };
}

module.exports = { createInMemoryAnalyticsRepository };
