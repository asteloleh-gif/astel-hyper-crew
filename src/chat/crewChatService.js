const ROLE_INSTRUCTIONS = Object.freeze({
  orchestrator: "You are the CEO/orchestrator. Help the owner frame the task, choose which crew member should handle it, and coordinate a plan. You may recommend a full Hyper Crew run, but do not pretend that a run or external action happened inside chat.",
  researcher: "You are the researcher. Find timely, relevant evidence when needed, distinguish evidence from inference, and cite links returned by web search. If fresh research is not needed, answer directly.",
  strategist: "You are the strategist. Turn the supplied context into a focused objective, audience, angle, priorities and execution plan. Do not invent research or metrics.",
  copywriter: "You are the writer. Produce concise, usable copy in the user's language and requested platform style. Preserve facts and do not invent numbers.",
  reviewer: "You are QA/reviewer. Inspect the supplied work for unsupported claims, ambiguity, platform fit, duplication and execution risk. Give concrete fixes rather than vague criticism.",
  "distribution-manager": "You are the distribution manager. Recommend where and how to distribute content. Do not claim anything was posted or scheduled unless the user explicitly supplies that result.",
  visual: "You are the visual designer. Develop visual concepts, shot lists, thumbnail ideas, prompts, composition and creative direction. When the owner explicitly asks you to make, generate, render, draw, or provide a finished visual, use the image generator and return the actual image instead of only a prompt.",
  analytics: "You are the analytics specialist. Analyze only metrics or datasets that are actually supplied. Separate observations from hypotheses and ask for missing data when a conclusion depends on it.",
  "router-parser": "You are the routing/parser specialist. Turn messy requests into clean structured tasks, fields, routing decisions and deterministic preprocessing instructions. Prefer cheap, simple transformations.",
});

function compactHistory(history) {
  return (Array.isArray(history) ? history : [])
    .slice(-12)
    .map(item => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      text: String(item?.text || "").trim().slice(0, 2500),
      agentId: item?.agentId ? String(item.agentId).slice(0, 80) : null,
    }))
    .filter(item => item.text);
}

function shouldGenerateImage(text) {
  const normalized = String(text || "").toLowerCase().replaceAll("ё", "е");
  if (!normalized) return false;
  return [
    /(сделай|создай|нарисуй|сгенерируй|отрендери|рендерни)/,
    /(готовый|готовую|готовое|готового)/,
    /\b(generate|create|make|draw|render|design)\b/,
  ].some(pattern => pattern.test(normalized));
}

function buildImagePrompt({ project, history, message }) {
  const context = compactHistory(history)
    .slice(-8)
    .map(item => `${item.role === "assistant" ? "Assistant/Yuki" : "Owner"}: ${item.text}`)
    .join("\n");

  return [
    "Create the finished visual asset requested by the owner.",
    "You are Yuki Pixel, the visual designer in Astel Hyper Crew.",
    "Return the visual itself. Do not create a mockup unless the owner asks for one.",
    "Do not add explanatory labels, captions, watermarks, or extra text unless explicitly requested.",
    `Project: ${project?.name || project?.id || "Astel"}.`,
    context ? `Relevant conversation context:\n${context}` : "",
    `Latest owner request: ${message}`,
  ].filter(Boolean).join("\n\n");
}

function createCrewChatService({
  agentRegistry,
  projectRegistry,
  imageGenerator = null,
  env = process.env,
  sdkLoader = () => import("@openai/agents"),
} = {}) {
  if (!agentRegistry) throw new Error("Crew chat requires agent registry");
  if (!projectRegistry) throw new Error("Crew chat requires project registry");

  const modelByTier = {
    reasoning: env.AI_MODEL_REASONING || "gpt-5.4-mini",
    standard: env.AI_MODEL_STANDARD || "gpt-5.4-mini",
    cheap: env.AI_MODEL_CHEAP || "gpt-5.4-nano",
  };

  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) sdkPromise = sdkLoader();
    return sdkPromise;
  }

  async function chat({ text, projectId = "astel-business", history = [] } = {}) {
    const message = String(text || "").trim();
    if (!message) throw new Error("CHAT_TEXT_REQUIRED");
    if (message.length > 4000) throw new Error("CHAT_TEXT_TOO_LONG");
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

    const project = projectRegistry.get(projectId);
    if (!project) throw new Error(`Unknown project: ${projectId}`);

    const match = agentRegistry.resolveMention(message);
    const target = match?.agent || agentRegistry.get("orchestrator");
    if (!target || target.enabled === false) throw new Error("CHAT_AGENT_UNAVAILABLE");

    const routedMessage = match?.remainder || message;

    if (target.id === "visual" && shouldGenerateImage(routedMessage)) {
      if (!imageGenerator?.generate) throw new Error("IMAGE_GENERATOR_NOT_CONFIGURED");
      const artifact = await imageGenerator.generate({
        prompt: buildImagePrompt({
          project,
          history,
          message: routedMessage,
        }),
      });
      return {
        target: {
          id: target.id,
          name: target.name,
          title: target.title,
          mention: target.mention,
        },
        matchedAlias: match?.matchedAlias || null,
        reply: "Готово — вот визуал.",
        artifacts: [artifact],
        telemetry: {
          model: artifact.model,
          requests: 1,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          imageUsage: artifact.usage || null,
        },
      };
    }

    const sdk = await loadSdk();
    const tools = target.id === "researcher" && sdk.webSearchTool
      ? [sdk.webSearchTool({ searchContextSize: "medium" })]
      : [];

    const instructions = [
      `You are ${target.name}, ${target.title || target.role}, inside Astel Hyper Crew.`,
      target.description || "",
      ROLE_INSTRUCTIONS[target.id] || "Help the owner with the task according to your role.",
      "This endpoint is conversational. Never claim that publishing, messaging, deployment, file mutation, image generation, or another external action happened unless an actual tool in this chat performed it.",
      "Reply in the language used by the owner unless they explicitly ask for another language.",
      "Be concise, practical and role-specific. Do not role-play unnecessary theatrics.",
    ].filter(Boolean).join("\n");

    const runtimeAgent = new sdk.Agent({
      name: target.name,
      model: modelByTier[target.modelTier] || modelByTier.standard,
      instructions,
      ...(tools.length ? { tools } : {}),
    });

    const payload = {
      project,
      targetAgent: {
        id: target.id,
        name: target.name,
        title: target.title,
      },
      matchedAlias: match?.matchedAlias || null,
      history: compactHistory(history),
      message: routedMessage,
      originalMessage: message,
    };

    const result = await sdk.run(runtimeAgent, JSON.stringify(payload), {
      maxTurns: Number(env.AI_MAX_TURNS_PER_AGENT || 4),
      context: { projectId, agentId: target.id, mode: "crew-chat" },
    });

    if (result.finalOutput == null) throw new Error("CHAT_AGENT_RETURNED_NO_OUTPUT");
    const usage = result.state?.usage || result.runContext?.usage || {};
    return {
      target: {
        id: target.id,
        name: target.name,
        title: target.title,
        mention: target.mention,
      },
      matchedAlias: match?.matchedAlias || null,
      reply: String(result.finalOutput),
      artifacts: [],
      telemetry: {
        model: runtimeAgent.model,
        requests: Number(usage.requests || 0),
        inputTokens: Number(usage.inputTokens || 0),
        outputTokens: Number(usage.outputTokens || 0),
        totalTokens: Number(usage.totalTokens || 0),
      },
    };
  }

  return { chat };
}

module.exports = {
  createCrewChatService,
  compactHistory,
  shouldGenerateImage,
  buildImagePrompt,
  ROLE_INSTRUCTIONS,
};
