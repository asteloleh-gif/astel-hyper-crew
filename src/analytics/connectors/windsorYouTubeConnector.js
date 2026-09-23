function finite(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function aggregateVideoRows(rows = []) {
  const byVideo = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const videoId = String(row?.video || "").trim();
    if (!videoId) continue;

    const current = byVideo.get(videoId) || {
      videoId,
      title: row.video_title || null,
      publishedAt: row.published_at || null,
      url: row.videourl || null,
      contentType: row.creator_content_type || null,
      accountId: row.account_id || null,
      accountName: row.account_name || null,
      metrics: {
        views: 0,
        engaged_views: 0,
        estimated_minutes_watched: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        subscribers_gained: 0,
        subscribers_lost: 0,
      },
      weightedDuration: 0,
      weightedPercentage: 0,
      averageWeight: 0,
    };

    for (const key of [
      "views",
      "engaged_views",
      "estimated_minutes_watched",
      "likes",
      "comments",
      "shares",
      "subscribers_gained",
      "subscribers_lost",
    ]) {
      const value = finite(row[key]);
      if (value != null) current.metrics[key] += value;
    }

    const weight = Math.max(0, finite(row.views) || 0);
    const avgDuration = finite(row.average_view_duration);
    const avgPercentage = finite(row.average_view_percentage);
    if (weight > 0) {
      if (avgDuration != null) current.weightedDuration += avgDuration * weight;
      if (avgPercentage != null) current.weightedPercentage += avgPercentage * weight;
      if (avgDuration != null || avgPercentage != null) current.averageWeight += weight;
    }

    if (!current.title && row.video_title) current.title = row.video_title;
    if (!current.publishedAt && row.published_at) current.publishedAt = row.published_at;
    if (!current.url && row.videourl) current.url = row.videourl;
    if (!current.contentType && row.creator_content_type) current.contentType = row.creator_content_type;
    if (!current.accountId && row.account_id) current.accountId = row.account_id;
    if (!current.accountName && row.account_name) current.accountName = row.account_name;

    byVideo.set(videoId, current);
  }

  return [...byVideo.values()].map(item => {
    const metrics = { ...item.metrics };
    if (item.averageWeight > 0) {
      metrics.average_view_duration = item.weightedDuration / item.averageWeight;
      metrics.average_view_percentage = item.weightedPercentage / item.averageWeight;
    }
    return { ...item, metrics };
  });
}

function createWindsorYouTubeAnalyticsConnector({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const apiKey = String(env.WINDSOR_API_KEY || "");
  const accountSelection = String(env.WINDSOR_YOUTUBE_ACCOUNT_ID || "39554");
  const projectId = String(env.YOUTUBE_ANALYTICS_PROJECT_ID || "battle-box");
  const accountKey = String(env.YOUTUBE_ANALYTICS_ACCOUNT_KEY || "astel-family");
  const maxRows = Math.max(100, Math.min(10_000, Number(env.WINDSOR_YOUTUBE_MAX_ROWS || 5000)));
  const refreshInterval = String(env.WINDSOR_REFRESH_INTERVAL || "6h");

  const fields = [
    "account_id",
    "account_name",
    "date",
    "video",
    "video_title",
    "creator_content_type",
    "views",
    "engaged_views",
    "average_view_duration",
    "average_view_percentage",
    "estimated_minutes_watched",
    "likes",
    "comments",
    "shares",
    "subscribers_gained",
    "subscribers_lost",
    "published_at",
    "videourl",
  ];

  return {
    id: "youtube",
    enabled: () => Boolean(apiKey),
    async sync({ analytics, days = 30 } = {}) {
      if (!apiKey) return { status: "skipped", reason: "NOT_CONFIGURED" };

      const capturedAt = now();
      const safeDays = Math.max(1, Math.min(365, Number(days || 30)));
      const params = new URLSearchParams({
        api_key: apiKey,
        fields: fields.join(","),
        date_preset: `last_${safeDays}dT`,
        select_accounts: accountSelection,
        _max_rows: String(maxRows),
        refresh_since: "3d",
        refresh_interval: refreshInterval,
      });

      const response = await fetchImpl(`https://connectors.windsor.ai/youtube?${params}`, {
        headers: { accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(`WINDSOR_YOUTUBE_FAILED: ${body?.error || body?.message || response.status}`);
      }

      const rows = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : [];
      const videos = aggregateVideoRows(rows);
      const metrics = [];

      const channel = videos[0] || null;
      const accountTotals = videos.reduce((acc, video) => {
        for (const [key, value] of Object.entries(video.metrics || {})) {
          if (["average_view_duration", "average_view_percentage"].includes(key)) continue;
          const n = finite(value);
          if (n != null) acc[key] = Number(acc[key] || 0) + n;
        }
        return acc;
      }, {});

      metrics.push({
        source: "youtube",
        projectId,
        accountKey,
        entityType: "account",
        entityId: channel?.accountId || accountKey,
        metrics: accountTotals,
        dimensions: { windowDays: safeDays },
        metadata: {
          provider: "windsor",
          accountName: channel?.accountName || "Astel Family",
          connectedAccount: accountSelection,
          rowCount: rows.length,
        },
        capturedAt,
        idempotencyKey: `youtube:windsor:account:${accountKey}:${capturedAt.toISOString().slice(0, 13)}`,
      });

      for (const video of videos) {
        metrics.push({
          source: "youtube",
          projectId,
          accountKey,
          entityType: "video",
          entityId: video.videoId,
          metrics: video.metrics,
          dimensions: { windowDays: safeDays },
          metadata: {
            provider: "windsor",
            title: video.title,
            publishedAt: video.publishedAt,
            url: video.url,
            contentType: video.contentType,
            accountId: video.accountId,
            accountName: video.accountName,
          },
          capturedAt,
          idempotencyKey: `youtube:windsor:video:${video.videoId}:${capturedAt.toISOString().slice(0, 13)}`,
        });
      }

      const imported = await analytics.ingestBatch({ metrics });
      return {
        status: "ok",
        metadata: {
          provider: "windsor",
          importedMetrics: imported.metrics,
          rows: rows.length,
          videos: videos.length,
          windowDays: safeDays,
        },
      };
    },
  };
}

module.exports = {
  createWindsorYouTubeAnalyticsConnector,
  aggregateVideoRows,
};
