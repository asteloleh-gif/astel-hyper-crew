const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

function createPostgresRunStore({ connectionString, pool = null } = {}) {
  const db = pool || new Pool({ connectionString, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
  return {
    async init() {
      const sql = await fs.readFile(path.join(__dirname, "../../migrations/001_init.sql"), "utf8");
      await db.query(sql);
    },
    async create(run) {
      const result = await db.query(
        `INSERT INTO crew_runs (id, project_id, idempotency_key, status, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
         DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
         RETURNING payload`,
        [run.id, run.projectId, run.idempotencyKey || null, run.status, JSON.stringify(run)]
      );
      return result.rows[0].payload;
    },
    async get(runId) {
      const result = await db.query("SELECT payload FROM crew_runs WHERE id = $1", [runId]);
      return result.rows[0]?.payload || null;
    },
    async findByIdempotencyKey(key) {
      const result = await db.query("SELECT payload FROM crew_runs WHERE idempotency_key = $1", [key]);
      return result.rows[0]?.payload || null;
    },
    async save(run) {
      const result = await db.query(
        `UPDATE crew_runs SET status = $2, payload = $3::jsonb, updated_at = NOW()
         WHERE id = $1 RETURNING payload`,
        [run.id, run.status, JSON.stringify(run)]
      );
      if (!result.rows[0]) throw new Error(`Unknown run: ${run.id}`);
      return result.rows[0].payload;
    },
    async list() {
      const result = await db.query("SELECT payload FROM crew_runs ORDER BY created_at DESC LIMIT 100");
      return result.rows.map(row => row.payload);
    },
    async listAgentProfiles() {
      const result = await db.query("SELECT payload FROM crew_agent_profiles ORDER BY id");
      return result.rows.map(row => row.payload);
    },
    async saveAgentProfile(agent) {
      const result = await db.query(
        `INSERT INTO crew_agent_profiles (id, payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
         RETURNING payload`,
        [agent.id, JSON.stringify(agent)]
      );
      return result.rows[0].payload;
    },
    async close() {
      await db.end();
    },
  };
}

module.exports = { createPostgresRunStore };
