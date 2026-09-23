const test = require("node:test");
const assert = require("node:assert/strict");
const { createInMemoryRunStore } = require("../src/storage/inMemoryRunStore");
const { createProjectRegistry } = require("../src/registry/projectRegistry");
const { createAgentRegistry } = require("../src/registry/agentRegistry");
const { createHyperCrewOrchestrator } = require("../src/orchestrator/hyperCrewOrchestrator");

function fixture() {
  const store = createInMemoryRunStore();
  const calls = [];
  const agentExecutor = {
    async execute({ agent, input }) {
      calls.push(agent.id);
      return { producedBy: agent.id, previous: input.producedBy || null };
    },
  };
  const operator = { async execute({ idempotencyKey }) { return { status: "DRY_RUN", idempotencyKey }; } };
  return {
    calls,
    orchestrator: createHyperCrewOrchestrator({
      store,
      projectRegistry: createProjectRegistry(),
      agentRegistry: createAgentRegistry(),
      agentExecutor,
      operator,
    }),
  };
}

test("runs the crew in order and stops at human approval", async () => {
  const { orchestrator, calls } = fixture();
  const created = await orchestrator.createRun({ projectId: "astel-business", objective: "Prepare today's content" });
  const run = await orchestrator.start(created.id);
  assert.deepEqual(calls, ["researcher", "strategist", "copywriter", "reviewer"]);
  assert.equal(run.status, "AWAITING_APPROVAL");
  assert.equal(run.approval.status, "PENDING");
});

test("approval resumes the run and invokes the operator once", async () => {
  const { orchestrator } = fixture();
  const created = await orchestrator.createRun({ projectId: "astel-business", objective: "Prepare content" });
  await orchestrator.start(created.id);
  const run = await orchestrator.decide(created.id, { decision: "APPROVE", decidedBy: "oleg" });
  assert.equal(run.status, "COMPLETED");
  assert.equal(run.execution.status, "DRY_RUN");
  assert.equal(run.execution.idempotencyKey, `${created.id}:operator`);
});

test("rejection is terminal and never invokes the operator", async () => {
  const { orchestrator } = fixture();
  const created = await orchestrator.createRun({ projectId: "battle-box", objective: "Prepare a video plan" });
  await orchestrator.start(created.id);
  const run = await orchestrator.decide(created.id, { decision: "REJECT", note: "Wrong angle" });
  assert.equal(run.status, "REJECTED");
  assert.equal(run.execution, null);
});

test("idempotency returns the original run", async () => {
  const { orchestrator } = fixture();
  const first = await orchestrator.createRun({ projectId: "astel-business", objective: "First", idempotencyKey: "telegram:42" });
  const second = await orchestrator.createRun({ projectId: "astel-business", objective: "Second", idempotencyKey: "telegram:42" });
  assert.equal(second.id, first.id);
  assert.equal(second.objective, "First");
});
