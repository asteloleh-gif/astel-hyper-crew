const DEFAULT_AGENTS = Object.freeze([
  Object.freeze({
    id: "orchestrator",
    name: "Kevin CEO",
    title: "Orchestrator",
    role: "Orchestrator",
    description: "Routes objectives, coordinates the crew and decides which workflow should run.",
    mention: "@kevin",
    aliases: ["kevin", "kevin ceo", "кевин", "кев", "кевин сео", "ceo", "босс"],
    modelTier: "reasoning",
    wave: "core",
    enabled: true,
    tools: ["crew-routing"],
    permissions: ["crew.route", "crew.plan"],
    executable: false,
  }),
  Object.freeze({
    id: "researcher",
    name: "Tommy the Googler",
    title: "Researcher",
    role: "Trend Researcher",
    description: "Finds timely evidence, sources and factual context before the crew makes claims.",
    mention: "@tommy",
    aliases: ["tommy", "tommy the googler", "томми", "томи", "томми гуглер", "толян", "researcher", "ресерчер"],
    modelTier: "reasoning",
    wave: "core",
    enabled: true,
    tools: ["web-search"],
    permissions: ["research.read"],
    executable: true,
  }),
  Object.freeze({
    id: "strategist",
    name: "George Big Brain",
    title: "Strategist",
    role: "Content Strategist",
    description: "Turns research into one focused angle, audience and content strategy.",
    mention: "@george",
    aliases: ["george", "george big brain", "джордж", "жора", "жорж", "strategist", "стратег"],
    modelTier: "standard",
    wave: "core",
    enabled: true,
    tools: [],
    permissions: ["strategy.write"],
    executable: true,
  }),
  Object.freeze({
    id: "copywriter",
    name: "Sergio Contentmaker",
    title: "Writer",
    role: "Copywriter + Localizer",
    description: "Writes platform-ready variants while preserving the approved strategy and evidence.",
    mention: "@sergio",
    aliases: ["sergio", "sergio contentmaker", "серджио", "сергио", "серега", "серёга", "writer", "райтер"],
    modelTier: "standard",
    wave: "core",
    enabled: true,
    tools: [],
    permissions: ["content.write"],
    executable: true,
  }),
  Object.freeze({
    id: "reviewer",
    name: "Hans QA",
    title: "Reviewer",
    role: "Content Reviewer",
    description: "Checks factual support, platform fit, duplication, tone and safety before approval.",
    mention: "@hans",
    aliases: ["hans", "hans qa", "ханс", "ганс", "qa", "reviewer", "ревьюер"],
    modelTier: "cheap",
    wave: "core",
    enabled: true,
    tools: [],
    permissions: ["content.review"],
    executable: true,
  }),
  Object.freeze({
    id: "distribution-manager",
    name: "Luca Everywhere",
    title: "Distribution Manager",
    role: "Distribution Manager",
    description: "Builds the channel plan and handoff package but never publishes before human approval.",
    mention: "@luca",
    aliases: ["luca", "luca everywhere", "лука", "distribution", "дистрибуция", "дистрибьютор"],
    modelTier: "standard",
    wave: "core",
    enabled: true,
    tools: ["social-engine", "distribution-engine"],
    permissions: ["distribution.plan"],
    executable: true,
    responsibility: "Prepare a channel plan before approval; never publish autonomously",
  }),
  Object.freeze({
    id: "visual",
    name: "Yuki Pixel",
    title: "Visual",
    role: "Visual Designer",
    description: "Prepares visual concepts, prompts, thumbnails and creative direction for content assets.",
    mention: "@yuki",
    aliases: ["yuki", "yuki pixel", "юки", "юки пиксель", "юки пиксел", "visual", "дизайнер"],
    modelTier: "standard",
    wave: "next",
    enabled: true,
    tools: ["image-generation"],
    permissions: ["visual.create"],
    executable: false,
  }),
  Object.freeze({
    id: "analytics",
    name: "Eddie Dataman",
    title: "Analytics",
    role: "Analytics",
    description: "Reads performance data and turns metrics into concise findings and next actions.",
    mention: "@eddie",
    aliases: ["eddie", "eddie dataman", "эдди", "эдик", "analytics", "аналитик", "аналитика"],
    modelTier: "standard",
    wave: "next",
    enabled: true,
    tools: ["analytics"],
    permissions: ["analytics.read"],
    executable: false,
  }),
  Object.freeze({
    id: "router-parser",
    name: "Vasya Free Tier Hustler",
    title: "Router / Parser",
    role: "Router / Parser",
    description: "Handles cheap routing, parsing and deterministic preprocessing before expensive agents run.",
    mention: "@vasya",
    aliases: ["vasya", "vasya free tier hustler", "вася", "васек", "router", "parser", "роутер", "парсер"],
    modelTier: "cheap",
    wave: "next",
    enabled: true,
    tools: ["parser"],
    permissions: ["input.parse", "crew.route"],
    executable: false,
  }),
]);

function cloneAgent(agent) {
  return {
    ...agent,
    aliases: [...(agent.aliases || [])],
    tools: [...(agent.tools || [])],
    permissions: [...(agent.permissions || [])],
  };
}

function normalizeAlias(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/^@+/, "")
    .replace(/[.,!?;:()[\]{}"'\u201c\u201d\u00ab\u00bb]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAliases(values) {
  const unique = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const clean = String(value || "").trim();
    if (!clean) continue;
    const key = normalizeAlias(clean);
    if (key) unique.add(key);
  }
  return [...unique];
}

function createAgentRegistry({ agents = DEFAULT_AGENTS, overrides = [], onSave = null } = {}) {
  const registry = new Map(agents.map(agent => [agent.id, cloneAgent(agent)]));
  for (const override of overrides || []) {
    const current = registry.get(override?.id);
    if (!current) continue;
    registry.set(override.id, {
      ...current,
      ...override,
      id: current.id,
      role: current.role,
      mention: current.mention,
      wave: current.wave,
      executable: current.executable,
      aliases: sanitizeAliases(override.aliases?.length ? override.aliases : current.aliases),
      tools: [...(override.tools || current.tools || [])],
      permissions: [...(override.permissions || current.permissions || [])],
    });
  }

  function get(agentId) {
    const agent = registry.get(String(agentId || "").trim());
    return agent ? cloneAgent(agent) : null;
  }

  function list() {
    return [...registry.values()].map(cloneAgent);
  }

  function resolveMention(text) {
    const normalized = normalizeAlias(text);
    if (!normalized) return null;
    const candidates = [];
    for (const agent of registry.values()) {
      if (!agent.enabled) continue;
      const aliases = [agent.name, agent.mention, ...(agent.aliases || [])]
        .map(normalizeAlias)
        .filter(Boolean);
      for (const alias of aliases) {
        if (normalized === alias || normalized.startsWith(`${alias} `)) {
          candidates.push({ agent, alias });
        }
      }
    }
    candidates.sort((a, b) => b.alias.length - a.alias.length);
    const match = candidates[0];
    if (!match) return null;
    return {
      agent: cloneAgent(match.agent),
      matchedAlias: match.alias,
      normalizedInput: normalized,
      remainder: normalized.slice(match.alias.length).trim(),
    };
  }

  async function update(agentId, patch = {}) {
    const id = String(agentId || "").trim();
    const current = registry.get(id);
    if (!current) throw new Error(`Unknown agent: ${id}`);

    const next = cloneAgent(current);
    if (patch.name !== undefined) {
      const value = String(patch.name || "").trim();
      if (!value) throw new Error("Agent name cannot be empty");
      next.name = value.slice(0, 80);
    }
    if (patch.title !== undefined) {
      const value = String(patch.title || "").trim();
      if (!value) throw new Error("Agent title cannot be empty");
      next.title = value.slice(0, 80);
    }
    if (patch.description !== undefined) {
      next.description = String(patch.description || "").trim().slice(0, 500);
    }
    if (patch.aliases !== undefined) {
      const aliases = sanitizeAliases(patch.aliases);
      if (!aliases.length) throw new Error("Agent must keep at least one alias");
      next.aliases = aliases.slice(0, 30);
    }
    if (patch.enabled !== undefined) next.enabled = Boolean(patch.enabled);

    registry.set(id, next);
    if (onSave) await onSave(cloneAgent(next));
    return cloneAgent(next);
  }

  return { get, list, resolveMention, update };
}

module.exports = { DEFAULT_AGENTS, createAgentRegistry, normalizeAlias };
