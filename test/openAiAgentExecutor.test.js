const test = require("node:test");
const assert = require("node:assert/strict");
const { createOpenAiAgentExecutor } = require("../src/executors/openAiAgentExecutor");

class FakeAgent {
  constructor(config) {
    Object.assign(this, config);
  }
}

test("executes a registered role and exposes normalized telemetry", async () => {
  const sdkLoader = async () => ({
    Agent: FakeAgent,
    webSearchTool: options => ({ type: "web_search", options }),
    async run(agent, input, options) {
      assert.equal(agent.name, "Tommy the Googler");
      assert.equal(options.maxTurns, 3);
      assert.equal(JSON.parse(input).objective, "Find trends");
      return {
        finalOutput: { summary: "ok" },
        state: { usage: { requests: 1, inputTokens: 100, outputTokens: 20, totalTokens: 120 } },
      };
    },
  });
  const executor = createOpenAiAgentExecutor({
    env: { OPENAI_API_KEY: "test", AI_MAX_TURNS_PER_AGENT: "3" },
    sdkLoader,
  });
  const result = await executor.execute({
    agent: { id: "researcher" },
    project: { id: "astel-business" },
    run: {
      id: "run-1",
      projectId: "astel-business",
      objective: "Find trends",
      requestedBy: "oleg",
      input: {},
      usage: { requests: 0, totalTokens: 0 },
    },
    input: {},
  });
  assert.equal(result.__agentExecution, true);
  assert.equal(result.output.summary, "ok");
  assert.equal(result.telemetry.totalTokens, 120);
});

test("fails closed when the API key is absent", async () => {
  const executor = createOpenAiAgentExecutor({ env: {} });
  await assert.rejects(() => executor.execute({ agent: { id: "researcher" }, run: {} }), /OPENAI_API_KEY_NOT_CONFIGURED/);
});
