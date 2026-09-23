const { buildAgentDefinitions } = require("../agents/roleDefinitions");
const { createRunBudgetManager } = require("../ai/runBudgetManager");

function createOpenAiAgentExecutor({
  env = process.env,
  sdkLoader = () => import("@openai/agents"),
  budgetManager = createRunBudgetManager({ env }),
  skillRegistry = null,
} = {}) {
  let runtimePromise = null;

  async function loadRuntime() {
    if (!runtimePromise) {
      runtimePromise = sdkLoader().then(sdk => ({
        sdk,
        definitions: buildAgentDefinitions({ Agent: sdk.Agent, webSearchTool: sdk.webSearchTool, env, skillRegistry }),
      }));
    }
    return runtimePromise;
  }

  async function execute({ agent, project, run, input } = {}) {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
    budgetManager.assertCanStart(run);
    const { sdk, definitions } = await loadRuntime();
    const runtimeAgent = definitions.get(agent.id);
    if (!runtimeAgent) throw new Error(`OpenAI agent definition not found: ${agent.id}`);
    const payload = {
      project,
      objective: run.objective,
      requestedBy: run.requestedBy,
      originalInput: run.input,
      stageInput: input,
    };
    const result = await sdk.run(runtimeAgent, JSON.stringify(payload), {
      maxTurns: Number(env.AI_MAX_TURNS_PER_AGENT || 4),
      context: { crewRunId: run.id, projectId: run.projectId, agentId: agent.id },
    });
    if (result.finalOutput == null) throw new Error(`Agent returned no output: ${agent.id}`);
    const usage = result.state?.usage || result.runContext?.usage || {};
    return {
      __agentExecution: true,
      output: result.finalOutput,
      telemetry: {
        model: runtimeAgent.model,
        requests: Number(usage.requests || 0),
        inputTokens: Number(usage.inputTokens || 0),
        cachedInputTokens: Number(usage.cachedInputTokens || usage.inputTokensDetails?.cachedTokens || usage.inputTokensDetails?.cached_tokens || 0),
        outputTokens: Number(usage.outputTokens || 0),
        totalTokens: Number(usage.totalTokens || 0),
      },
    };
  }

  return {
    execute,
    init: loadRuntime,
    health: () => ({
      provider: "openai-agents-sdk",
      configured: Boolean(env.OPENAI_API_KEY),
      budget: budgetManager.limits,
    }),
  };
}

module.exports = { createOpenAiAgentExecutor };
