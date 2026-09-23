const { createApp } = require("./app");
const { createProjectRegistry } = require("./registry/projectRegistry");
const { createAgentRegistry } = require("./registry/agentRegistry");
const { createConnectorRegistry } = require("./registry/connectorRegistry");
const { createInMemoryRunStore } = require("./storage/inMemoryRunStore");
const { createPostgresRunStore } = require("./storage/postgresRunStore");
const { createOpenAiAgentExecutor } = require("./executors/openAiAgentExecutor");
const { createHyperCrewOrchestrator } = require("./orchestrator/hyperCrewOrchestrator");\nconst { createCrewChatService } = require("./chat/crewChatService");

async function main() {
  const store = process.env.DATABASE_URL
    ? createPostgresRunStore({ connectionString: process.env.DATABASE_URL })
    : createInMemoryRunStore();
  await store.init();
  const projectRegistry = createProjectRegistry();
  const savedAgentProfiles = await store.listAgentProfiles();
  const agentRegistry = createAgentRegistry({
    overrides: savedAgentProfiles,
    onSave: agent => store.saveAgentProfile(agent),
  });
  const connectorRegistry = createConnectorRegistry();
  const agentExecutor = createOpenAiAgentExecutor();\n  const crewChatService = createCrewChatService({ agentRegistry, projectRegistry });
  const orchestrator = createHyperCrewOrchestrator({
    store,
    projectRegistry,
    agentRegistry,
    agentExecutor,
  });
  const app = createApp({
    orchestrator,
    projectRegistry,
    agentRegistry,
    connectorRegistry,
    agentExecutor,
    apiToken: process.env.INTERNAL_API_TOKEN || "",
  });
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Astel Hyper Crew listening on ${port}`));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
