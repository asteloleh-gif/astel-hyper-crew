function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function mapAnalyticsTable(body = {}) {
  const headers = Array.isArray(body.columnHeaders) ? body.columnHeaders.map(item => item.name) : [];
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return rows.map(row => Object.fromEntries(headers.map((name, index) => [name, row[index]])));
}

function numericMetrics(row = {}, excluded = []) {
  const skip = new Set(excluded);
  const metrics = {};
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue;
    const n = Number(value);
    if (Number.isFinite(n)) metrics[key] = n;
  }
  return metrics;
}

function createYouTubeAnalyticsConnector({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const clientId = String(env.YOUTUBE_CLIENT_ID || "");
  const clientSecret = String(env.YOUTUBE_CLIENT_SECRET || "");
  const refreshToken = String(env.YOUTUBE_REFRESH_TOKEN || "");
  const projectId = String(env.YOUTUBE_ANALYTICS_PROJECT_ID || "battle-box");
  const accountKey = String(env.YOUTUBE_ANALYTICS_ACCOUNT_KEY || "astel-family");
  const maxVideos = Math.max(1, Math.min(200, Number(env.YOUTUBE_ANALYTICS_MAX_VIDEOS || 50)));

  async function accessToken() {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) {
      throw new Error(`YOUTUBE_OAUTH_FAILED: ${payload?.error_description || payload?.error || response.status}`);
    }
    return payload.access_token;
  }

  async function getJson(url, token) {
    const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) {
      throw new Error(`YOUTUBE_API_FAILED: ${body?.error?.message || response.status}`);
    }
    return body;
  }

  async function analyticsReport({ token, startDate, endDate, dimensions = null, maxResults = null }) {
    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost",
    });
    if (dimensions) params.set("dimensions", dimensions);
    if (dimensions === "video") params.set("sort", "-views");
    if (maxResults) params.set("maxResults", String(maxResults));
    return getJson(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, token);
  }

  async function videoMetadata(ids, token) {
    if (!ids.length) return new Map();
    const result = new Map();
    for (let index = 0; index < ids.length; index += 50) {
      const chunk = ids.slice(index, index + 50);
      const params = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: chunk.join(","),
      });
      const body = await getJson(`https://www.googleapis.com/youtube/v3/videos?${params}`, token);
      for (const item of Array.isArray(body.items) ? body.items : []) {
        result.set(String(item.id), item);
      }
    }
    return result;
  }

  return {
    id: "youtube",
    enabled: () => Boolean(clientId && clientSecret && refreshToken),
    async sync({ analytics, days = 30 } = {}) {
      if (!clientId || !clientSecret || !refreshToken) return { status: "skipped", reason: "NOT_CONFIGURED" };
      const token = await accessToken();
      const capturedAt = now();
      const end = new Date(capturedAt);
      end.setUTCDate(end.getUTCDate() - 1);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - Math.max(1, Number(days || 30)) + 1);
      const startDate = isoDate(start);
      const endDate = isoDate(end);

      const [accountReport, videoReport] = await Promise.all([
        analyticsReport({ token, startDate, endDate }),
        analyticsReport({ token, startDate, endDate, dimensions: "video", maxResults: maxVideos }),
      ]);

      const accountRow = mapAnalyticsTable(accountReport)[0] || {};
      const videoRows = mapAnalyticsTable(videoReport);
      const metadataByVideo = await videoMetadata(videoRows.map(row => String(row.video)).filter(Boolean), token);

      const metrics = [{
        source: "youtube",
        projectId,
        accountKey,
        entityType: "account",
        entityId: accountKey,
        metrics: numericMetrics(accountRow),
        dimensions: { startDate, endDate },
        metadata: { windowDays: Number(days || 30) },
        capturedAt,
        idempotencyKey: `youtube:account:${accountKey}:${capturedAt.toISOString().slice(0, 13)}`,
      }];

      for (const row of videoRows) {
        const videoId = String(row.video || "");
        if (!videoId) continue;
        const meta = metadataByVideo.get(videoId);
        const apiStats = numericMetrics(meta?.statistics || {});
        metrics.push({
          source: "youtube",
          projectId,
          accountKey,
          entityType: "video",
          entityId: videoId,
          metrics: { ...numericMetrics(row, ["video"]), ...Object.fromEntries(Object.entries(apiStats).map(([k,v]) => [`lifetime_${k}`, v])) },
          dimensions: { startDate, endDate },
          metadata: {
            title: meta?.snippet?.title || null,
            publishedAt: meta?.snippet?.publishedAt || null,
            duration: meta?.contentDetails?.duration || null,
            channelId: meta?.snippet?.channelId || null,
          },
          capturedAt,
          idempotencyKey: `youtube:video:${videoId}:${capturedAt.toISOString().slice(0, 13)}`,
        });
      }

      const imported = await analytics.ingestBatch({ metrics });
      return {
        status: "ok",
        metadata: {
          startDate,
          endDate,
          importedMetrics: imported.metrics,
          videos: videoRows.length,
        },
      };
    },
  };
}

module.exports = { createYouTubeAnalyticsConnector, mapAnalyticsTable, numericMetrics };
