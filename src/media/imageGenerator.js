function createImageGenerator({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const model = env.AI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
  const quality = env.AI_IMAGE_QUALITY || "low";
  const size = env.AI_IMAGE_SIZE || "1024x1024";

  async function generate({ prompt } = {}) {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) throw new Error("IMAGE_PROMPT_REQUIRED");
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

    const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: cleanPrompt,
        size,
        quality,
        output_format: "png",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || `Image API request failed (${response.status})`;
      throw new Error(`IMAGE_GENERATION_FAILED: ${message}`);
    }

    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) throw new Error("IMAGE_GENERATION_RETURNED_NO_IMAGE");

    return {
      type: "image",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${b64}`,
      model,
      quality,
      size,
      usage: payload?.usage || null,
    };
  }

  return {
    generate,
    health: () => ({ model, quality, size, configured: Boolean(env.OPENAI_API_KEY) }),
  };
}

module.exports = { createImageGenerator };
