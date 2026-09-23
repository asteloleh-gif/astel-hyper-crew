CREATE TABLE IF NOT EXISTS crew_runs (
  id UUID PRIMARY KEY,
  project_id TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crew_runs_idempotency_key_unique
  ON crew_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crew_runs_project_status_idx
  ON crew_runs (project_id, status, updated_at DESC);
