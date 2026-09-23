const { SKILLS, SKILL_MAP } = require("../skills/skillCatalog");
const { AGENT_SKILL_PROFILES } = require("../skills/agentProfiles");
const { KNOWLEDGE_PACKS } = require("../knowledge/knowledgePacks");

const EXPLICIT_WEB_RE = /\b(latest|today|current|news|breaking|live|price|pricing now|search the web|google|github|source links?)\b|сегодня|сейчас|последн|свеж|новост|актуаль|цена сейчас|поищи в интернете|проверь в интернете|гугл|гитхаб|дай источники/i;
const EXTERNAL_RESEARCH_RE = /\b(search|research|find sources?|competitors?|market scan|look up)\b|найди|поищи|исследуй|источник|конкурент|обзор рынка|что есть на рынке/i;

function normalize(value) {
  return String(value || "").toLowerCase().replaceAll("ё", "е");
}

function scoreSkill(skill, text) {
  const haystack = normalize(text);
  let score = 0;
  for (const trigger of skill.triggers || []) {
    const needle = normalize(trigger);
    if (needle && haystack.includes(needle)) score += needle.includes(" ") ? 3 : 2;
  }
  return score;
}

function createSkillRegistry({ maxSelectedSkills = 4 } = {}) {
  function get(skillId) {
    const skill = SKILL_MAP.get(String(skillId || "").trim());
    return skill ? { ...skill, triggers: [...skill.triggers], instructions: [...skill.instructions], sourceRefs: [...skill.sourceRefs] } : null;
  }

  function list() {
    return SKILLS.map(skill => get(skill.id));
  }

  function profileForAgent(agentOrId) {
    const id = typeof agentOrId === "string" ? agentOrId : agentOrId?.id;
    const base = AGENT_SKILL_PROFILES[id];
    if (!base) return null;
    const skillIds = [...base.skillIds];
    return {
      agentId: id,
      hardSkills: { ...base.hardSkills },
      softSkills: { ...base.softSkills },
      bestFor: [...base.bestFor],
      blindSpots: [...base.blindSpots],
      signatureQuestions: [...base.signatureQuestions],
      skillIds,
      skills: skillIds.map(skillId => ({
        ...get(skillId),
        level: Number(base.hardSkills[skillId] || 0),
      })).filter(Boolean),
      knowledge: KNOWLEDGE_PACKS[id] ? {
        mission: KNOWLEDGE_PACKS[id].mission,
        playbookCount: KNOWLEDGE_PACKS[id].playbooks.length,
        principleCount: KNOWLEDGE_PACKS[id].operatingPrinciples.length,
      } : null,
    };
  }

  function selectForAgent(agentOrId, text) {
    const profile = profileForAgent(agentOrId);
    if (!profile) return [];
    const ranked = profile.skillIds
      .map(id => ({ skill: get(id), score: scoreSkill(get(id), text), level: profile.hardSkills[id] || 0 }))
      .filter(item => item.skill)
      .sort((a, b) => b.score - a.score || b.level - a.level);

    const matched = ranked.filter(item => item.score > 0).slice(0, maxSelectedSkills);
    const chosen = matched.length
      ? matched
      : ranked.slice(0, Math.min(2, maxSelectedSkills));
    return chosen.map(item => ({ ...item.skill, level: item.level, triggerScore: item.score }));
  }

  function shouldUseWeb(agentOrId, text, selectedSkills = []) {
    const id = typeof agentOrId === "string" ? agentOrId : agentOrId?.id;
    if (id !== "researcher") return false;
    const query = String(text || "");
    if (EXPLICIT_WEB_RE.test(query)) return true;
    if (EXTERNAL_RESEARCH_RE.test(query)) return true;
    return selectedSkills.some(skill => skill.freshness === "live" && EXPLICIT_WEB_RE.test(query));
  }

  function buildAgentContext(agent, text) {
    if (!agent?.id) return { selectedSkills: [], context: "" };
    const profile = profileForAgent(agent.id);
    const pack = KNOWLEDGE_PACKS[agent.id];
    const selectedSkills = selectForAgent(agent.id, text);
    if (!profile || !pack) return { selectedSkills, context: "" };

    const skillText = selectedSkills.map(skill => [
      `### Skill: ${skill.name} (level ${skill.level}/5, freshness: ${skill.freshness})`,
      ...skill.instructions.map(line => `- ${line}`)
    ].join("\n")).join("\n\n");

    const context = [
      "## Operating profile",
      `Mission: ${pack.mission}`,
      `Best for: ${profile.bestFor.join("; ")}`,
      `Blind spots: ${profile.blindSpots.join("; ")}`,
      "Signature questions:",
      ...profile.signatureQuestions.map(q => `- ${q}`),
      "",
      "## Permanent domain knowledge",
      ...pack.operatingPrinciples.map(p => `- ${p}`),
      "",
      "## Playbooks",
      ...pack.playbooks.map(p => `- ${p}`),
      "",
      "## Known failure modes",
      ...pack.pitfalls.map(p => `- ${p}`),
      "",
      "## Activated skills",
      skillText,
      "",
      "Use this internal knowledge first. Do not browse merely to rediscover these methods. Browse only when the request requires external/current evidence."
    ].join("\n");

    return { selectedSkills, context };
  }

  return { get, list, profileForAgent, selectForAgent, shouldUseWeb, buildAgentContext };
}

module.exports = {
  createSkillRegistry,
  EXPLICIT_WEB_RE,
  EXTERNAL_RESEARCH_RE,
};
