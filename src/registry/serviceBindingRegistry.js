const DEFAULT_SERVICE_BINDINGS = Object.freeze([
  Object.freeze({
    id: "core-state",
    name: "Astel Core State",
    agents: ["orchestrator"],
    skills: ["crew-orchestration", "decision-synthesis", "project-planning", "routing", "scenario-analysis"],
    capabilities: ["projects.read", "runs.read", "runs.write", "approvals.read", "approvals.write", "audit.read"],
    access: "internal",
    runtime: "wired",
    costClass: "deterministic",
    externalMutation: false,
  }),
  Object.freeze({
    id: "openai-web-search",
    name: "OpenAI Hosted Web Search",
    agents: ["researcher"],
    skills: ["web-research", "evidence-mapping", "customer-research", "competitor-research", "fact-check"],
    capabilities: ["web.search", "sources.read"],
    access: "read",
    runtime: "wired",
    costClass: "metered-ai",
    externalMutation: false,
  }),
  Object.freeze({
    id: "openai-image-generation",
    name: "OpenAI Image Generation",
    agents: ["visual"],
    skills: ["visual-direction", "image-prompting", "brand-system", "social-content"],
    capabilities: ["image.generate", "visual.asset.create"],
    access: "create-artifact",
    runtime: "wired",
    costClass: "metered-ai",
    externalMutation: false,
  }),
  Object.freeze({
    id: "analytics-hub",
    name: "Edie Analytics Hub",
    agents: ["analytics"],
    skills: ["analytics", "attribution", "experiment-design", "trend-analysis", "evidence-mapping"],
    capabilities: ["analytics.overview", "analytics.content", "analytics.costs", "analytics.agents", "analytics.sync"],
    access: "read",
    runtime: "wired",
    costClass: "deterministic",
    externalMutation: false,
  }),
  Object.freeze({
    id: "social-engine",
    name: "Astel Social Engine",
    agents: ["analytics", "distribution-manager"],
    skills: ["analytics", "trend-analysis", "distribution-strategy", "content-repurposing", "social-content"],
    capabilities: ["social.analytics", "threads.publish", "instagram.publish", "facebook.publish"],
    access: "mixed",
    runtime: "connector-only",
    costClass: "service",
    externalMutation: true,
    approvalRequiredFor: ["threads.publish", "instagram.publish", "facebook.publish"],
  }),
  Object.freeze({
    id: "distribution-engine",
    name: "Astel Distribution Engine",
    agents: ["distribution-manager"],
    skills: ["distribution-strategy", "content-repurposing", "launch-distribution", "social-content", "analytics"],
    capabilities: ["youtube.read", "pinterest.publish", "distribution.analytics"],
    access: "mixed",
    runtime: "connector-only",
    costClass: "service",
    externalMutation: true,
    approvalRequiredFor: ["pinterest.publish"],
  }),
  Object.freeze({
    id: "video-editor",
    name: "Video Editor",
    agents: ["visual"],
    skills: ["visual-direction", "short-form-script", "social-content"],
    capabilities: ["video.rough-cut", "video.edit-plan"],
    access: "create-artifact",
    runtime: "connector-only",
    costClass: "service",
    externalMutation: false,
  }),
  Object.freeze({
    id: "deterministic-router",
    name: "Deterministic Router / Parser",
    agents: ["router-parser"],
    skills: ["input-parsing", "routing", "data-normalization", "automation-economics", "project-planning"],
    capabilities: ["input.parse", "input.normalize", "task.route", "dedupe", "cost.gate"],
    access: "internal",
    runtime: "planned",
    costClass: "deterministic",
    externalMutation: false,
  }),
]);

function clone(binding) {
  return {
    ...binding,
    agents: [...(binding.agents || [])],
    skills: [...(binding.skills || [])],
    capabilities: [...(binding.capabilities || [])],
    approvalRequiredFor: [...(binding.approvalRequiredFor || [])],
  };
}

function createServiceBindingRegistry(bindings = DEFAULT_SERVICE_BINDINGS) {
  const registry = new Map(bindings.map(binding => [binding.id, clone(binding)]));

  function list() {
    return [...registry.values()].map(clone);
  }

  function get(id) {
    const binding = registry.get(String(id || "").trim());
    return binding ? clone(binding) : null;
  }

  function forAgent(agentId) {
    const id = String(agentId || "").trim();
    return list().filter(binding => binding.agents.includes(id));
  }

  function forSkill(skillId) {
    const id = String(skillId || "").trim();
    return list().filter(binding => binding.skills.includes(id));
  }

  function validateSkillCoverage(skillRegistry, agentRegistry) {
    const issues = [];
    for (const agent of agentRegistry?.list?.() || []) {
      const profile = skillRegistry?.profileForAgent?.(agent.id);
      if (!profile) continue;
      for (const skillId of profile.skillIds || []) {
        if (!forSkill(skillId).length) {
          issues.push({ type: "SKILL_WITHOUT_SERVICE_BINDING", agentId: agent.id, skillId });
        }
      }
    }
    return { ok: issues.length === 0, issues };
  }

  return { list, get, forAgent, forSkill, validateSkillCoverage };
}

module.exports = {
  DEFAULT_SERVICE_BINDINGS,
  createServiceBindingRegistry,
};
