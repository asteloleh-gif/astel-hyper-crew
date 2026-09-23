const { createApp } = require("./app");
const { createProjectRegistry } = require("./registry/projectRegistry");
const { createAgentRegistry } = require("./registry/agentRegistry");
const { createSkillRegistry } = require("./registry/skillRegistry");
const { createConnectorRegistry } = require("./registry/connectorRegistry");
const { createInMemoryRunStore } = require("./storage/inMemoryRunStore");
const { createPostgresRunStore } = require("./storage/postgresRunStore");
const { createOpenAiAgentExecutor } = require("./executors/openAiAgentExecutor");
const { createHyperCrewOrchestrator } = require("./orchestrator/hyperCrewOrchestrator");
const { createCrewChatService } = require("./chat/crewChatService");
const { createImageGenerator } = require("./media/imageGenerator");
const { createPostgresAnalyticsRepository } = require("./analytics/postgresAnalyticsRepository");
const { createInMemoryAnalyticsRepository } = require("./analytics/inMemoryAnalyticsRepository");
const { createAnalyticsService } = require("./analytics/analyticsService");
const { createSocialEngineAnalyticsConnector } = require("./analytics/connectors/socialEngineConnector");
const { createYouTubeAnalyticsConnector } = require("./analytics/connectors/youtubeConnector");
const { createWindsorYouTubeAnalyticsConnector } = require("./analytics/connectors/windsorYouTubeConnector");
const { createAnalyticsSyncScheduler } = require("./analytics/syncScheduler");

async function main() {
  const store = process.env.DATABASE_URL
    ? createPostgresRunStore({ connectionString: process.env.DATABASE_URL })
    : createInMemoryRunStore();
  await store.init();

  const analyticsRepository = process.env.DATABASE_URL
    ? createPostgresAnalyticsRepository({ connectionString: process.env.DATABASE_URL })
    : createInMemoryAnalyticsRepository();
  await analyticsRepository.init();
  const youtubeProvider = String(process.env.YOUTUBE_ANALYTICS_PROVIDER || "auto").toLowerCase();
  const youtubeConnector = youtubeProvider === "google"
    ? createYouTubeAnalyticsConnector()
    : youtubeProvider === "windsor"
      ? createWindsorYouTubeAnalyticsConnector()
      : process.env.WINDSOR_API_KEY
        ? createWindsorYouTubeAnalyticsConnector()
        : createYouTubeAnalyticsConnector();
  const analyticsConnectors = [
    createSocialEngineAnalyticsConnector(),
    youtubeConnector,
  ];
  const analyticsService = createAnalyticsService({ repository: analyticsRepository, connectors: analyticsConnectors });
  const analyticsScheduler = createAnalyticsSyncScheduler({ analyticsService });

  const projectRegistry = createProjectRegistry();
  const savedAgentProfiles = await store.listAgentProfiles();
  const agentRegistry = createAgentRegistry({
    overrides: savedAgentProfiles,
    onSave: agent => store.saveAgentProfile(agent),
  });
  const connectorRegistry = createConnectorRegistry();
  const skillRegistry = createSkillRegistry();
  const agentExecutor = createOpenAiAgentExecutor({ skillRegistry });
  const imageGenerator = createImageGenerator();
  const crewChatService = createCrewChatService({ agentRegistry, projectRegistry, skillRegistry, analyticsService, imageGenerator });

  const orchestrator = createHyperCrewOrchestrator({
    store,
    projectRegistry,
    agentRegistry,
    agentExecutor,
    analyticsService,
  });

  const app = createApp({
    orchestrator,
    projectRegistry,
    agentRegistry,
    connectorRegistry,
    skillRegistry,
    agentExecutor,
    crewChatService,
    analyticsService,
    analyticsScheduler,
    apiToken: process.env.INTERNAL_API_TOKEN || "",
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Astel Hyper Crew listening on ${port}`));
  analyticsScheduler.start()
    .then(result => console.log("Analytics sync startup", JSON.stringify(result)))
    .catch(error => console.error("Analytics sync startup failed", error));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
