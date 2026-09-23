const test = require("node:test");
const assert = require("node:assert/strict");
const { createImageGenerator } = require("../src/media/imageGenerator");

test("image generator calls OpenAI images API and returns a data URL", async () => {
  const calls = [];
  const generator = createImageGenerator({
    env: {
      OPENAI_API_KEY: "secret",
      AI_IMAGE_MODEL: "gpt-image-test",
      AI_IMAGE_QUALITY: "low",
      AI_IMAGE_SIZE: "1024x1024",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        data: [{ b64_json: "ZmFrZQ==" }],
        usage: { total_tokens: 123 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  const result = await generator.generate({ prompt: "make a logo" });
  assert.equal(calls[0].url, "https://api.openai.com/v1/images/generations");
  assert.equal(calls[0].options.headers.authorization, "Bearer secret");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "gpt-image-test");
  assert.equal(body.output_format, "png");
  assert.equal(result.dataUrl, "data:image/png;base64,ZmFrZQ==");
});

test("image generator exposes API errors", async () => {
  const generator = createImageGenerator({
    env: { OPENAI_API_KEY: "secret" },
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "bad prompt" } }), {
      status: 400,
      headers: { "content-type": "application/json" },
    }),
  });
  await assert.rejects(() => generator.generate({ prompt: "x" }), /IMAGE_GENERATION_FAILED: bad prompt/);
});
