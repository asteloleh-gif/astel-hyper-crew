const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentRegistry } = require("../src/registry/agentRegistry");
const { createProjectRegistry } = require("../src/registry/projectRegistry");
const { createCrewChatService } = require("../src/chat/crewChatService");

class FakeAgent {
  constructor(options) { Object.assign(this, options); }
}

function fixture() {
  const calls = [];
  const sdk = {
    Agent: FakeAgent,
    webSearchTool: options => ({ type: "web-search", options }),
    run: async (agent, input, options) => {
      calls.push({ agent, input: JSON.parse(input), options });
      return {
        finalOutput: `reply from ${agent.name}`,
        state: { usage: { requests: 1, inputTokens: 10, outputTokens: 5, totalTokens: 15 } },
      };
    },
  };
  const service = createCrewChatService({
    agentRegistry: createAgentRegistry(),
    projectRegistry: createProjectRegistry(),
    env: {
      OPENAI_API_KEY: "test-key",
      AI_MODEL_REASONING: "reasoning-model",
      AI_MODEL_STANDARD: "standard-model",
      AI_MODEL_CHEAP: "cheap-model",
      AI_MAX_TURNS_PER_AGENT: "3",
    },
    sdkLoader: async () => sdk,
  });
  return { service, calls };
}

test("routes Russian alias to Yuki", async () => {
  const { service, calls } = fixture();
  const result = await service.chat({ text: "Юки, сделай обложку", projectId: "astel-business" });
  assert.equal(result.target.id, "visual");
  assert.equal(result.target.name, "Yuki Pixel");
  assert.equal(result.reply, "reply from Yuki Pixel");
  assert.equal(calls[0].input.message, "сделай обложку");
  assert.equal(calls[0].agent.model, "standard-model");
});

test("defaults unaddressed chat to Kevin", async () => {
  const { service } = fixture();
  const result = await service.chat({ text: "Что делаем дальше?" });
  assert.equal(result.target.id, "orchestrator");
  assert.equal(result.target.name, "Kevin CEO");
});

test("Tommy receives web search and bounded history", async () => {
  const { service, calls } = fixture();
  const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` }));
  const result = await service.chat({ text: "Томми найди свежие данные", history });
  assert.equal(result.target.id, "researcher");
  assert.equal(calls[0].agent.tools.length, 1);
  assert.equal(calls[0].input.history.length, 12);
  assert.equal(result.telemetry.totalTokens, 15);
});

test("rejects chat without API key", async () => {
  const service = createCrewChatService({
    agentRegistry: createAgentRegistry(),
    projectRegistry: createProjectRegistry(),
    env: {},
    sdkLoader: async () => ({ Agent: FakeAgent, run: async () => ({ finalOutput: "x" }) }),
  });
  await assert.rejects(() => service.chat({ text: "hello" }), /OPENAI_API_KEY_NOT_CONFIGURED/);
});
