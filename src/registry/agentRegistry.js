const DEFAULT_AGENTS = Object.freeze([
  { id: "researcher", role: "Trend Researcher", modelTier: "reasoning" },
  { id: "strategist", role: "Content Strategist", modelTier: "standard" },
  { id: "copywriter", role: "Copywriter + Localizer", modelTier: "standard" },
  { id: "reviewer", role: "Content Reviewer", modelTier: "cheap" },
  {
    id: "distribution-manager",
    role: "Distribution Manager",
    modelTier: "standard",
    responsibility: "Prepare a channel plan before approval; never publish autonomously",
  },
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
