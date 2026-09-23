function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createRunBudgetManager({ env = process.env } = {}) {
  const limits = Object.freeze({
    maxRequestsPerRun: asPositiveInt(env.AI_MAX_REQUESTS_PER_RUN, 8),
    maxTokensPerRun: asPositiveInt(env.AI_MAX_TOKENS_PER_RUN, 30_000),
  });

  function assertCanStart(run) {
    const usage = run.usage || {};
    if (Number(usage.requests || 0) >= limits.maxRequestsPerRun) {
      throw new Error("AI_REQUEST_BUDGET_EXHAUSTED");
    }
    if (Number(usage.totalTokens || 0) >= limits.maxTokensPerRun) {
      throw new Error("AI_TOKEN_BUDGET_EXHAUSTED");
    }
  }

  return { assertCanStart, limits };
}

module.exports = { createRunBudgetManager };
