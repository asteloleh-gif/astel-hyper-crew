CREATE TABLE IF NOT EXISTS analytics_metric_snapshots (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  project_id TEXT,
  account_key TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  content_id TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_metric_snapshots_idempotency_uq
  ON analytics_metric_snapshots(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_metric_source_time_idx
  ON analytics_metric_snapshots(source, captured_at DESC);

CREATE INDEX IF NOT EXISTS analytics_metric_entity_time_idx
  ON analytics_metric_snapshots(source, entity_type, entity_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS analytics_metric_content_time_idx
  ON analytics_metric_snapshots(content_id, captured_at DESC)
  WHERE content_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS analytics_cost_ledger (
  id UUID PRIMARY KEY,
  run_id TEXT,
  project_id TEXT,
  source TEXT NOT NULL,
  service TEXT,
  agent_id TEXT,
  provider TEXT,
  model TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  cached_input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0,
  tool_name TEXT,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  amount_microusd BIGINT,
  pricing_version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_cost_ledger_idempotency_uq
  ON analytics_cost_ledger(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_cost_project_time_idx
  ON analytics_cost_ledger(project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_cost_agent_time_idx
  ON analytics_cost_ledger(agent_id, occurred_at DESC)
  WHERE agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS analytics_content_bindings (
  content_id TEXT NOT NULL,
  source TEXT NOT NULL,
  project_id TEXT,
  account_key TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS analytics_content_bindings_content_idx
  ON analytics_content_bindings(content_id);

CREATE TABLE IF NOT EXISTS analytics_sync_state (
  connector_id TEXT PRIMARY KEY,
  cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_started_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
