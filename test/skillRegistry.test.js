const test = require("node:test");
const assert = require("node:assert/strict");
const { createSkillRegistry } = require("../src/registry/skillRegistry");
const { createAgentRegistry } = require("../src/registry/agentRegistry");

test("ships skill profiles for all nine agents", () => {
  const skills = createSkillRegistry();
  const agents = createAgentRegistry().list();
  assert.equal(agents.length, 9);
  for (const agent of agents) {
    const profile = skills.profileForAgent(agent);
    assert.ok(profile, `missing profile for ${agent.id}`);
    assert.ok(profile.skills.length >= 4, `too few skills for ${agent.id}`);
    assert.ok(Object.keys(profile.softSkills).length >= 4, `too few soft skills for ${agent.id}`);
    assert.ok(profile.bestFor.length > 0);
    assert.ok(profile.blindSpots.length > 0);
  }
});

test("selects role-specific skills from natural language", () => {
  const skills = createSkillRegistry();
  const george = skills.selectForAgent("strategist", "Нужно позиционирование и GTM для нового продукта");
  assert.ok(george.some(skill => skill.id === "positioning"));
  assert.ok(george.some(skill => skill.id === "go-to-market"));

  const vasya = skills.selectForAgent("router-parser", "Распарси JSON, нормализуй поля и сделай дешёвый роутинг");
  assert.ok(vasya.some(skill => skill.id === "data-normalization" || skill.id === "input-parsing"));
  assert.ok(vasya.some(skill => skill.id === "routing"));
});

test("research web policy is local-first and freshness-aware", () => {
  const skills = createSkillRegistry();
  const local = skills.selectForAgent("researcher", "объясни методику customer research");
  assert.equal(skills.shouldUseWeb("researcher", "объясни методику customer research", local), false);

  const fresh = skills.selectForAgent("researcher", "найди свежие новости и источники по рынку");
  assert.equal(skills.shouldUseWeb("researcher", "найди свежие новости и источники по рынку", fresh), true);

  assert.equal(skills.shouldUseWeb("strategist", "найди свежие новости", []), false);
});

test("permanent brain contains knowledge, playbooks and all assigned skills", () => {
  const skills = createSkillRegistry();
  const brain = skills.buildPermanentContext("reviewer");
  assert.match(brain.context, /Permanent domain knowledge/);
  assert.match(brain.context, /Playbooks/);
  assert.match(brain.context, /Adversarial Review/);
  assert.match(brain.context, /Rubric Evaluation/);
});
