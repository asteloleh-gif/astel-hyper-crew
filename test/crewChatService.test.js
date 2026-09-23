const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentRegistry } = require("../src/registry/agentRegistry");
const { createProjectRegistry } = require("../src/registry/projectRegistry");
const { createCrewChatService, shouldGenerateImage } = require("../src/chat/crewChatService");

class FakeAgent {
  constructor(options) { Object.assign(this, options); }
}

function fixture() {
  const calls = [];
  const imageCalls = [];
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
  const imageGenerator = {
    generate: async input => {
      imageCalls.push(input);
      return {
        type: "image",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,ZmFrZQ==",
        model: "gpt-image-test",
        quality: "low",
        size: "1024x1024",
      };
    },
  };
  const service = createCrewChatService({
    agentRegistry: createAgentRegistry(),
    projectRegistry: createProjectRegistry(),
    imageGenerator,
    env: {
      OPENAI_API_KEY: "test-key",
      AI_MODEL_REASONING: "reasoning-model",
      AI_MODEL_STANDARD: "standard-model",
      AI_MODEL_CHEAP: "cheap-model",
      AI_MAX_TURNS_PER_AGENT: "3",
    },
    sdkLoader: async () => sdk,
  });
  return { service, calls, imageCalls };
}

test("routes explicit Yuki creation request to image generator", async () => {
  const { service, calls, imageCalls } = fixture();
  const history = [{ role: "assistant", text: "Вариант 1: A + звезда сверху справа", agentId: "visual" }];
  const result = await service.chat({
    text: "Юки да готовый вариант срочно",
    projectId: "astel-business",
    history,
  });
  assert.equal(result.target.id, "visual");
  assert.equal(result.target.name, "Yuki Pixel");
  assert.equal(result.artifacts[0].type, "image");
  assert.match(result.artifacts[0].dataUrl, /^data:image\/png;base64,/);
  assert.equal(imageCalls.length, 1);
  assert.match(imageCalls[0].prompt, /A \+ звезда сверху справа/);
  assert.match(imageCalls[0].prompt, /да готовый вариант срочно/);
  assert.equal(calls.length, 0);
});

test("Yuki can still discuss visuals without generating an image", async () => {
  const { service, calls, imageCalls } = fixture();
  const result = await service.chat({ text: "Юки что думаешь про этот логотип?" });
  assert.equal(result.target.id, "visual");
  assert.equal(result.reply, "reply from Yuki Pixel");
  assert.equal(imageCalls.length, 0);
  assert.equal(calls.length, 1);
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

test("image generation intent recognizes Russian and English imperatives", () => {
  assert.equal(shouldGenerateImage("сделай готовую обложку"), true);
  assert.equal(shouldGenerateImage("generate a thumbnail"), true);
  assert.equal(shouldGenerateImage("что думаешь про обложку?"), false);
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


test("Kevin receives the authoritative enabled crew roster", async () => {
  const { service, calls } = fixture();
  await service.chat({ text: "Кевин кто у нас в команде?" });
  const roster = calls[0].input.crewRoster;
  assert.ok(Array.isArray(roster));
  assert.ok(roster.some(agent => agent.name === "Tommy the Googler" && agent.id === "researcher"));
  assert.ok(roster.some(agent => agent.name === "Yuki Pixel" && agent.id === "visual"));
  assert.ok(roster.some(agent => agent.name === "Vasya Free Tier Hustler" && agent.id === "router-parser"));
});
