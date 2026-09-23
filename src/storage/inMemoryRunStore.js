function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createInMemoryRunStore() {
  const runs = new Map();
  const idempotency = new Map();
  return {
    async init() {},
    async create(run) {
      if (runs.has(run.id)) throw new Error(`Run already exists: ${run.id}`);
      if (run.idempotencyKey && idempotency.has(run.idempotencyKey)) {
        return clone(runs.get(idempotency.get(run.idempotencyKey)));
      }
      runs.set(run.id, clone(run));
      if (run.idempotencyKey) idempotency.set(run.idempotencyKey, run.id);
      return clone(run);
    },
    async get(runId) {
      return clone(runs.get(runId) || null);
    },
    async findByIdempotencyKey(key) {
      const runId = idempotency.get(key);
      return runId ? clone(runs.get(runId)) : null;
    },
    async save(run) {
      if (!runs.has(run.id)) throw new Error(`Unknown run: ${run.id}`);
      runs.set(run.id, clone(run));
      return clone(run);
    },
    async list() {
      return [...runs.values()].map(clone);
    },
  };
}

module.exports = { createInMemoryRunStore };
