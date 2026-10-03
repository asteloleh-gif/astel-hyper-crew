const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentRegistry } = require("../src/registry/agentRegistry");
const { createSkillRegistry } = require("../src/registry/skillRegistry");
const {
  createServiceBindingRegistry,
  DEFAULT_SERVICE_BINDINGS,
} = require("../src/registry/serviceBindingRegistry");

test("service bindings cover every configured crew skill", () => {
  const agents = createAgentRegistry();
  const skills = createSkillRegistry();
  const bindings = createServiceBindingRegistry();

  const coverage = bindings.validateSkillCoverage(skills, agents);
  assert.equal(coverage.ok, true);
  assert.deepEqual(coverage.issues, []);
});

test("service bindings expose wired services for priority specialists", () => {
  const bindings = createServiceBindingRegistry();

  const yuki = bindings.forAgent("visual");
  assert.ok(yuki.some(item => item.id === "openai-image-generation" && item.runtime === "wired"));

  const edie = bindings.forAgent("analytics");
  assert.ok(edie.some(item => item.id === "analytics-hub" && item.runtime === "wired"));

  const tommy = bindings.forAgent("researcher");
  assert.ok(tommy.some(item => item.id === "openai-web-search" && item.runtime === "wired"));
});

test("write-capable connectors retain explicit approval requirements", () => {
  const bindings = createServiceBindingRegistry();
  const social = bindings.get("social-engine");
  const distribution = bindings.get("distribution-engine");

  assert.equal(social.externalMutation, true);
  assert.ok(social.approvalRequiredFor.includes("threads.publish"));
  assert.equal(distribution.externalMutation, true);
  assert.ok(distribution.approvalRequiredFor.includes("pinterest.publish"));
});

test("registry has one stable id per binding", () => {
  const ids = DEFAULT_SERVICE_BINDINGS.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
});
