const crypto = require("node:crypto");
const { RUN_STATUS, assertTransition } = require("../domain/runState");
const { CREW_NODE, DEFAULT_CREW_GRAPH, validateCrewGraph } = require("../domain/crewGraph");

function createHyperCrewOrchestrator({
  store,
  projectRegistry,
  agentRegistry,
  agentExecutor,
  operator,
  graph = DEFAULT_CREW_GRAPH,
  uuid = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
} = {}) {
  if (!store) throw new Error("Run store is required");
  if (!projectRegistry) throw new Error("Project registry is required");
  if (!agentRegistry) throw new Error("Agent registry is required");
  if (!agentExecutor?.execute) throw new Error("Agent executor is required");
  validateCrewGraph(graph);

  function event(run, type, data = {}) {
    run.events.push({ id: uuid(), type, data, at: now() });
  }

  function transition(run, status) {
    assertTransition(run.status, status);
    run.status = status;
    run.updatedAt = now();
    event(run, "run.status.changed", { status });
  }

  async function createRun({ projectId, objective, idempotencyKey = null, input = {}, requestedBy = "oleg" } = {}) {
    const project = projectRegistry.get(projectId);
    if (!project) throw new Error(`Unknown project: ${projectId}`);
    const cleanObjective = String(objective || "").trim();
    if (!cleanObjective) throw new Error("Run objective is required");
    const cleanKey = idempotencyKey ? String(idempotencyKey).trim() : null;
    if (cleanKey) {
      const existing = await store.findByIdempotencyKey(cleanKey);
      if (existing) return existing;
    }
    const timestamp = now();
    const run = {
      id: uuid(), projectId: project.id, objective: cleanObjective, idempotencyKey: cleanKey,
      requestedBy, status: RUN_STATUS.CREATED, input, outputs: {}, stages: [], events: [],
      approval: null, execution: null, createdAt: timestamp, updatedAt: timestamp,
    };
    event(run, "run.created", { projectId: project.id });
    return store.create(run);
  }

  async function start(runId) {
    const run = await store.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    if (run.status !== RUN_STATUS.CREATED) return run;
    transition(run, RUN_STATUS.RUNNING);
    await store.save(run);
    let previous = { objective: run.objective, input: run.input };
    try {
      for (const nodeId of [CREW_NODE.RESEARCHER, CREW_NODE.STRATEGIST, CREW_NODE.COPYWRITER, CREW_NODE.REVIEWER]) {
        const agent = agentRegistry.get(nodeId);
        if (!agent) throw new Error(`Agent is not registered: ${nodeId}`);
        const startedAt = now();
        event(run, "stage.started", { nodeId });
        const output = await agentExecutor.execute({ agent, project: projectRegistry.get(run.projectId), run, input: previous });
        run.outputs[nodeId] = output;
        run.stages.push({ nodeId, status: "COMPLETED", startedAt, finishedAt: now() });
        event(run, "stage.completed", { nodeId });
        previous = output;
        await store.save(run);
      }
      transition(run, RUN_STATUS.AWAITING_APPROVAL);
      run.approval = { status: "PENDING", requestedAt: now(), decidedAt: null, decidedBy: null, note: null };
      event(run, "approval.requested", { gate: CREW_NODE.HUMAN_APPROVAL });
      return store.save(run);
    } catch (error) {
      transition(run, RUN_STATUS.FAILED);
      run.error = { message: error.message, at: now() };
      event(run, "run.failed", { message: error.message });
      await store.save(run);
      throw error;
    }
  }

  async function decide(runId, { decision, decidedBy = "oleg", note = null } = {}) {
    const run = await store.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    if (run.status !== RUN_STATUS.AWAITING_APPROVAL) throw new Error(`Run is not awaiting approval: ${run.status}`);
    const normalized = String(decision || "").trim().toUpperCase();
    if (!["APPROVE", "REJECT"].includes(normalized)) throw new Error("Decision must be APPROVE or REJECT");
    run.approval = { ...run.approval, status: normalized === "APPROVE" ? "APPROVED" : "REJECTED", decidedAt: now(), decidedBy, note };
    event(run, "approval.decided", { decision: normalized, decidedBy });
    if (normalized === "REJECT") {
      transition(run, RUN_STATUS.REJECTED);
      return store.save(run);
    }
    transition(run, RUN_STATUS.APPROVED);
    await store.save(run);
    return execute(run.id);
  }

  async function execute(runId) {
    const run = await store.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    if (run.status !== RUN_STATUS.APPROVED) throw new Error(`Run is not approved: ${run.status}`);
    transition(run, RUN_STATUS.EXECUTING);
    await store.save(run);
    try {
      const result = operator?.execute
        ? await operator.execute({ run, idempotencyKey: `${run.id}:operator` })
        : { status: "DRY_RUN", reason: "OPERATOR_NOT_CONFIGURED" };
      run.execution = result;
      transition(run, RUN_STATUS.COMPLETED);
      event(run, "operator.completed", { status: result?.status || "UNKNOWN" });
      return store.save(run);
    } catch (error) {
      transition(run, RUN_STATUS.FAILED);
      run.error = { message: error.message, at: now() };
      event(run, "operator.failed", { message: error.message });
      await store.save(run);
      throw error;
    }
  }

  return { createRun, start, decide, execute, getRun: id => store.get(id), listRuns: () => store.list() };
}

module.exports = { createHyperCrewOrchestrator };
