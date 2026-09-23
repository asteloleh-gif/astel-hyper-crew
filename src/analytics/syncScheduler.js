function createAnalyticsSyncScheduler({
  analyticsService,
  enabled = String(process.env.ANALYTICS_SYNC_ENABLED || "true").toLowerCase() === "true",
  intervalMs = Number(process.env.ANALYTICS_SYNC_INTERVAL_MS || 21_600_000),
  days = Number(process.env.ANALYTICS_SYNC_LOOKBACK_DAYS || 30),
  logger = console,
} = {}) {
  let timer = null;
  let running = false;
  let lastResult = null;
  let lastRunAt = null;

  async function runOnce() {
    if (!enabled) return { status: "skipped", reason: "DISABLED" };
    if (running) return { status: "skipped", reason: "ALREADY_RUNNING" };
    running = true;
    lastRunAt = new Date().toISOString();
    try {
      lastResult = await analyticsService.sync({ days });
      return { status: "ok", ...lastResult };
    } catch (error) {
      lastResult = { status: "error", error: error.message };
      logger?.error?.("Analytics sync failed", error);
      return lastResult;
    } finally {
      running = false;
    }
  }

  async function start() {
    if (!enabled) return { status: "skipped", reason: "DISABLED" };
    if (timer) return { status: "ok", reason: "ALREADY_STARTED" };
    const first = await runOnce();
    timer = setInterval(() => { runOnce().catch(() => {}); }, Math.max(300_000, intervalMs));
    timer.unref?.();
    return { status: "ok", first };
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function health() {
    return {
      enabled,
      running,
      intervalMs: Math.max(300_000, intervalMs),
      days,
      lastRunAt,
      lastResult,
    };
  }

  return { start, stop, runOnce, health };
}

module.exports = { createAnalyticsSyncScheduler };
