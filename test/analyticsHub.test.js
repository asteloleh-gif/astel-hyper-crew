const test = require("node:test");
const assert = require("node:assert/strict");

const { createInMemoryAnalyticsRepository } = require("../src/analytics/inMemoryAnalyticsRepository");
const { createAnalyticsService, summarizeCosts } = require("../src/analytics/analyticsService");
const { calculateModelCostMicrousd } = require("../src/analytics/pricing");
const { createYouTubeAnalyticsConnector } = require("../src/analytics/connectors/youtubeConnector");

test("OpenAI model pricing is explicit and computes microdollars", () => {
  const result = calculateModelCostMicrousd({
    model: "gpt-5.4-mini",
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  });
  assert.equal(result.amountMicrousd, 5_250_000);
  assert.equal(result.pricingVersion, "openai-2026-09-23");
});

test("analytics service records agent cost and groups Edie usage", async () => {
  const repository = createInMemoryAnalyticsRepository();
  await repository.init();
  const service = createAnalyticsService({ repository, env: {} });

  await service.recordAgentExecution({
    runId: "11111111-1111-4111-8111-111111111111",
    projectId: "battle-box",
    agentId: "copywriter",
    model: "gpt-5.4-mini",
    telemetry: { inputTokens: 1000, outputTokens: 200, requests: 1, attempt: 1 },
    latencyMs: 450,
  });

  const report = await service.agents({ days: 7, projectId: "battle-box" });
  assert.equal(report.agents.length, 1);
  assert.equal(report.agents[0].agentId, "copywriter");
  assert.equal(report.agents[0].totalTokens, 1200);
  assert.equal(report.agents[0].costKnown, true);
  assert.ok(report.agents[0].amountUsd > 0);
});

test("unknown model remains explicitly unpriced instead of inventing cost", async () => {
  const repository = createInMemoryAnalyticsRepository();
  const service = createAnalyticsService({ repository, env: {} });
  await service.recordAgentExecution({
    projectId: "astel-business",
    agentId: "researcher",
    model: "future-model",
    telemetry: { inputTokens: 1000, outputTokens: 100, requests: 1 },
  });
  const report = await service.costs({ days: 7, groupBy: "agent" });
  assert.equal(report.totals.unknownCostRows, 1);
  assert.equal(report.totals.knownCostRows, 0);
  assert.equal(report.totals.amountUsd, 0);
});

test("analytics metrics keep one latest snapshot per source entity", async () => {
  const repository = createInMemoryAnalyticsRepository();
  const service = createAnalyticsService({ repository, env: {} });
  await service.ingestMetric({
    source: "youtube", projectId: "battle-box", entityType: "video", entityId: "v1",
    metrics: { views: 10 }, capturedAt: new Date(Date.now() - 1000),
  });
  await service.ingestMetric({
    source: "youtube", projectId: "battle-box", entityType: "video", entityId: "v1",
    metrics: { views: 20 }, capturedAt: new Date(),
  });
  const content = await service.content({ days: 7, projectId: "battle-box" });
  assert.equal(content.items.length, 1);
  assert.equal(content.items[0].metrics.views, 20);
});

test("YouTube connector normalizes Analytics API rows into Edie metrics", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push(String(url));
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return { ok: true, status: 200, async json() { return { access_token: "access" }; } };
    }
    if (String(url).includes("youtubeanalytics.googleapis.com") && String(url).includes("dimensions=video")) {
      return {
        ok: true, status: 200,
        async json() {
          return {
            columnHeaders: [{ name: "video" }, { name: "views" }, { name: "likes" }],
            rows: [["vid1", 123, 9]],
          };
        },
      };
    }
    if (String(url).includes("youtubeanalytics.googleapis.com")) {
      return {
        ok: true, status: 200,
        async json() {
          return {
            columnHeaders: [{ name: "views" }, { name: "subscribersGained" }],
            rows: [[500, 12]],
          };
        },
      };
    }
    if (String(url).includes("youtube/v3/videos")) {
      return {
        ok: true, status: 200,
        async json() {
          return {
            items: [{
              id: "vid1",
              snippet: { title: "Money Challenge", publishedAt: "2026-09-20T10:00:00Z", channelId: "c1" },
              statistics: { viewCount: "1000", likeCount: "20" },
              contentDetails: { duration: "PT20S" },
            }],
          };
        },
      };
    }
    throw new Error("unexpected fetch");
  };

  const repository = createInMemoryAnalyticsRepository();
  const service = createAnalyticsService({ repository, env: {} });
  const connector = createYouTubeAnalyticsConnector({
    env: {
      YOUTUBE_CLIENT_ID: "client",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REFRESH_TOKEN: "refresh",
      YOUTUBE_ANALYTICS_PROJECT_ID: "battle-box",
      YOUTUBE_ANALYTICS_ACCOUNT_KEY: "astel-family",
    },
    fetchImpl,
    now: () => new Date("2026-09-23T18:00:00Z"),
  });

  const result = await connector.sync({ analytics: service, days: 7 });
  assert.equal(result.status, "ok");
  assert.equal(result.metadata.videos, 1);
  const content = await service.content({ days: 30, projectId: "battle-box" });
  const video = content.items.find(item => item.entityId === "vid1");
  assert.equal(video.metrics.views, 123);
  assert.equal(video.metrics.lifetime_viewCount, 1000);
  assert.equal(video.metadata.title, "Money Challenge");
  assert.ok(calls.some(url => url.includes("youtubeanalytics.googleapis.com")));
});

test("summarizeCosts supports source grouping", () => {
  const summary = summarizeCosts([{
    source: "crew-chat", agent_id: "analytics", provider: "openai", model: "gpt-5.4-mini",
    input_tokens: 10, cached_input_tokens: 0, output_tokens: 5, requests: 1, tool_calls: 0,
    amount_microusd: 1000,
  }], "source");
  assert.equal(summary.groups[0].key, "crew-chat");
  assert.equal(summary.totals.amountUsd, 0.001);
});
