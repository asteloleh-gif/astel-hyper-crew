const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentRegistry } = require("../src/registry/agentRegistry");

test("ships the named Hyper Crew roster", () => {
  const registry = createAgentRegistry();
  const agents = registry.list();
  assert.equal(agents.length, 9);
  assert.equal(registry.get("orchestrator").name, "Kevin CEO");
  assert.equal(registry.get("visual").name, "Yuki Pixel");
  assert.equal(registry.get("analytics").name, "Eddie Dataman");
  assert.equal(registry.get("router-parser").name, "Vasya Free Tier Hustler");
});

test("resolves English and Russian call signs at the start of chat input", () => {
  const registry = createAgentRegistry();
  assert.equal(registry.resolveMention("Юки, сделай обложку").agent.id, "visual");
  assert.equal(registry.resolveMention("@yuki make three variants").agent.id, "visual");
  assert.equal(registry.resolveMention("Серёга перепиши под Threads").agent.id, "copywriter");
  assert.equal(registry.resolveMention("Кевин собери команду").agent.id, "orchestrator");
  assert.equal(registry.resolveMention("Эдик посмотри аналитику").agent.id, "analytics");
  assert.equal(registry.resolveMention("обычный вопрос без обращения"), null);
});

test("agent profile edits keep system identity immutable and can persist", async () => {
  const saved = [];
  const registry = createAgentRegistry({ onSave: async agent => saved.push(agent) });
  const updated = await registry.update("visual", {
    name: "Yuki Pixel Pro",
    title: "Visual Director",
    aliases: ["юки", "yuki", "юки пиксель"],
  });
  assert.equal(updated.id, "visual");
  assert.equal(updated.role, "Visual Designer");
  assert.equal(updated.name, "Yuki Pixel Pro");
  assert.equal(registry.resolveMention("юки сделай thumbnail").agent.id, "visual");
  assert.equal(saved.length, 1);
});
