const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCrewGraph, DEFAULT_CREW_GRAPH } = require("../src/domain/crewGraph");

test("default graph is valid", () => assert.equal(validateCrewGraph(DEFAULT_CREW_GRAPH), true));

test("rejects cycles", () => {
  assert.throws(() => validateCrewGraph([
    { id: "researcher", kind: "agent", dependsOn: ["reviewer"] },
    { id: "reviewer", kind: "agent", dependsOn: ["researcher"] },
    { id: "human-approval", kind: "hard-gate", autonomous: false, dependsOn: ["reviewer"] },
  ]), /cycle/);
});

test("external mutations must follow approval", () => {
  assert.throws(() => validateCrewGraph([
    { id: "researcher", kind: "agent", dependsOn: [] },
    { id: "human-approval", kind: "hard-gate", autonomous: false, dependsOn: ["researcher"] },
    { id: "operator", kind: "connector", externalMutation: true, dependsOn: ["researcher"] },
  ]), /human approval/);
});
