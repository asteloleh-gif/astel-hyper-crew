const DEFAULT_PRICING = Object.freeze({
  "gpt-5.4-mini": Object.freeze({ inputPerMillion: 0.75, cachedInputPerMillion: 0.075, outputPerMillion: 4.50 }),
  "gpt-5.4-nano": Object.freeze({ inputPerMillion: 0.20, cachedInputPerMillion: null, outputPerMillion: 1.25 }),
});

const DEFAULT_PRICING_VERSION = "openai-2026-09-23";

function normalizeModelName(model) {
  const value = String(model || "").trim().toLowerCase();
  if (!value) return "";
  for (const key of Object.keys(DEFAULT_PRICING)) {
    if (value === key || value.startsWith(`${key}-`)) return key;
  }
  return value;
}

function loadPricing({ env = process.env } = {}) {
  let overrides = {};
  if (env.AI_PRICING_JSON) {
    try {
      const parsed = JSON.parse(env.AI_PRICING_JSON);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) overrides = parsed;
    } catch (error) {
      throw new Error(`AI_PRICING_JSON_INVALID: ${error.message}`);
    }
  }
  return {
    version: String(env.AI_PRICING_VERSION || DEFAULT_PRICING_VERSION),
    models: { ...DEFAULT_PRICING, ...overrides },
  };
}

function calculateModelCostMicrousd({
  model,
  inputTokens = 0,
  cachedInputTokens = 0,
  outputTokens = 0,
  pricing,
} = {}) {
  const table = pricing || loadPricing();
  const normalized = normalizeModelName(model);
  const rate = table.models?.[normalized] || table.models?.[String(model || "")] || null;
  if (!rate) return { amountMicrousd: null, pricingVersion: table.version, rate: null };

  const input = Math.max(0, Number(inputTokens || 0));
  const cached = Math.max(0, Number(cachedInputTokens || 0));
  const output = Math.max(0, Number(outputTokens || 0));
  const uncachedInput = Math.max(0, input - cached);

  const inputUsd = uncachedInput / 1_000_000 * Number(rate.inputPerMillion || 0);
  const cachedRate = rate.cachedInputPerMillion == null
    ? Number(rate.inputPerMillion || 0)
    : Number(rate.cachedInputPerMillion || 0);
  const cachedUsd = cached / 1_000_000 * cachedRate;
  const outputUsd = output / 1_000_000 * Number(rate.outputPerMillion || 0);
  const amountUsd = inputUsd + cachedUsd + outputUsd;

  return {
    amountMicrousd: Math.round(amountUsd * 1_000_000),
    pricingVersion: table.version,
    rate: {
      inputPerMillion: Number(rate.inputPerMillion || 0),
      cachedInputPerMillion: rate.cachedInputPerMillion == null ? null : Number(rate.cachedInputPerMillion),
      outputPerMillion: Number(rate.outputPerMillion || 0),
    },
  };
}

module.exports = {
  DEFAULT_PRICING,
  DEFAULT_PRICING_VERSION,
  loadPricing,
  normalizeModelName,
  calculateModelCostMicrousd,
};
