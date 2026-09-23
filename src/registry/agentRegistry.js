const DEFAULT_AGENTS = Object.freeze([
  { id: "researcher", role: "Trend Researcher", modelTier: "reasoning" },
  { id: "strategist", role: "Content Strategist", modelTier: "standard" },
  { id: "copywriter", role: "Copywriter + Localizer", modelTier: "standard" },
  { id: "reviewer", role: "Content Reviewer", modelTier: "cheap" },
]);

function createAgentRegistry(agents = DEFAULT_AGENTS) {
  const registry = new Map(agents.map(agent => [agent.id, Object.freeze({ ...agent })]));
  return {
    get(agentId) {
      return registry.get(String(agentId || "").trim()) || null;
    },
    list() {
      return [...registry.values()];
    },
  };
}

module.exports = { DEFAULT_AGENTS, createAgentRegistry };
