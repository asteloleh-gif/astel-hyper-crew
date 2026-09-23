const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createWindsorYouTubeAnalyticsConnector,
  aggregateVideoRows,
} = require("../src/analytics/connectors/windsorYouTubeConnector");
const { createInMemoryAnalyticsRepository } = require("../src/analytics/inMemoryAnalyticsRepository");
const { createAnalyticsService } = require("../src/analytics/analyticsService");

test("Windsor YouTube rows aggregate per video with weighted averages", () => {
  const videos = aggregateVideoRows([
    {
      account_id: "c1",
      account_name: "Astel Family",
      date: "2026-09-17",
      video: "v1",
      video_title: "One",
      creator_content_type: "shorts",
      views: 100,
      engaged_views: 40,
      average_view_duration: 10,
      average_view_percentage: 50,
      estimated_minutes_watched: 20,
      likes: 5,
      comments: 1,
      shares: 2,
      subscribers_gained: 1,
      subscribers_lost: 0,
    },
    {
      account_id: "c1",
      account_name: "Astel Family",
      date: "2026-09-18",
      video: "v1",
      video_title: "One",
      creator_content_type: "shorts",
      views: 300,
      engaged_views: 100,
      average_view_duration: 20,
      average_view_percentage: 80,
      estimated_minutes_watched: 100,
      likes: 7,
      comments: 2,
      shares: 1,
      subscribers_gained: 2,
      subscribers_lost: 1,
    },
  ]);

  assert.equal(videos.length, 1);
  assert.equal(videos[0].metrics.views, 400);
  assert.equal(videos[0].metrics.engaged_views, 140);
  assert.equal(videos[0].metrics.likes, 12);
  assert.equal(videos[0].metrics.subscribers_gained, 3);
  assert.equal(videos[0].metrics.average_view_duration, 17.5);
  assert.equal(videos[0].metrics.average_view_percentage, 72.5);
});

test("Windsor YouTube connector imports account and video snapshots", async () => {
  const fetchImpl = async url => {
    assert.match(String(url), /connectors\.windsor\.ai\/youtube/);
    assert.match(String(url), /select_accounts=39554/);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          data: [
            {
              account_id: "UCMW",
              account_name: "Astel Family",
              date: "2026-09-17",
              video: "v1",
              video_title: "Money Challenge",
              creator_content_type: "shorts",
              views: 1000,
              engaged_views: 400,
              average_view_duration: 16.5,
              average_view_percentage: 95.1,
              estimated_minutes_watched: 275,
              likes: 10,
              comments: 1,
              shares: 2,
              subscribers_gained: 3,
              subscribers_lost: 1,
              published_at: "2026-09-17T20:00:00Z",
              videourl: "https://www.youtube.com/watch?v=v1",
            },
          ],
        };
      },
    };
  };

  const repository = createInMemoryAnalyticsRepository();
  const analytics = createAnalyticsService({ repository, env: {} });
  const connector = createWindsorYouTubeAnalyticsConnector({
    env: {
      WINDSOR_API_KEY: "secret",
      WINDSOR_YOUTUBE_ACCOUNT_ID: "39554",
      YOUTUBE_ANALYTICS_PROJECT_ID: "battle-box",
      YOUTUBE_ANALYTICS_ACCOUNT_KEY: "astel-family",
    },
    fetchImpl,
    now: () => new Date("2026-09-23T18:00:00Z"),
  });

  const result = await connector.sync({ analytics, days: 7 });
  assert.equal(result.status, "ok");
  assert.equal(result.metadata.provider, "windsor");
  assert.equal(result.metadata.videos, 1);

  const content = await analytics.content({ days: 30, projectId: "battle-box" });
  const video = content.items.find(item => item.entityId === "v1");
  assert.equal(video.metrics.views, 1000);
  assert.equal(video.metrics.engaged_views, 400);
  assert.equal(video.metadata.provider, "windsor");
  assert.equal(video.metadata.contentType, "shorts");
});
