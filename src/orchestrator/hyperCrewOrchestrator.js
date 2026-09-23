const crypto = require("node:crypto");
const { RUN_STATUS, assertTransition } = require("../domain/runState");
const { CREW_NODE, DEFAULT_CREW_GRAPH, validateCrewGraph } = require("../domain/crewGraph");

function createHyperCrewOrchestrator({
  store,
  projectRegistry,
  agentRegistry,
  agentExecutor,
  analyticsService = null,
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

  function recordUsage(run, nodeId, telemetry = {}) {
    const usage = run.usage;
    const current = usage.byAgent[nodeId] || { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    for (const key of ["requests", "inputTokens", "outputTokens", "totalTokens"]) {
      const value = Number(telemetry[key] || 0);
      usage[key] += value;
      current[key] += value;
    }
    current.model = telemetry.model || current.model || null;
    usage.byAgent[nodeId] = current;
  }

  async function executeStage(run, nodeId, input, attempt = 1) {
    const agent = agentRegistry.get(nodeId);
    if (!agent) throw new Error(`Agent is not registered: ${nodeId}`);
    const startedAt = now();
    event(run, "stage.started", { nodeId, attempt });
    const result = await agentExecutor.execute({
      agent,
      project: projectRegistry.get(run.projectId),
      run,
      input: { ...input, priorOutputs: run.outputs },
    });
    const envelope = result?.__agentExecution === true;
    const output = envelope ? result.output : result;
    if (envelope) {
      recordUsage(run, nodeId, result.telemetry);
      if (analyticsService?.recordAgentExecution) {
        const latencyMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
        await analyticsService.recordAgentExecution({
          runId: run.id,
          projectId: run.projectId,
          agentId: nodeId,
          model: result.telemetry?.model,
          telemetry: { ...result.telemetry, attempt },
          latencyMs,
        }).catch(error => event(run, "analytics.record.failed", { nodeId, attempt, message: error.message }));
      }
    }
    if (run.outputs[nodeId] !== undefined) {
      run.outputHistory[nodeId] = [...(run.outputHistory[nodeId] || []), run.outputs[nodeId]];
    }
    run.outputs[nodeId] = output;
    run.stages.push({
      nodeId,
      attempt,
      status: "COMPLETED",
      startedAt,
      finishedAt: now(),
      telemetry: envelope ? result.telemetry : null,
    });
    event(run, "stage.completed", { nodeId, attempt });
    await store.save(run);
    return output;
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
      requestedBy, status: RUN_STATUS.CREATED, input, outputs: {}, outputHistory: {}, stages: [], events: [],
      usage: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, byAgent: {} },
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
    try {
      const research = await executeStage(run, CREW_NODE.RESEARCHER, {
        objective: run.objective,
        suppliedResearch: run.input.research || [],
      });
      const strategy = await executeStage(run, CREW_NODE.STRATEGIST, { research });
      let draft = await executeStage(run, CREW_NODE.COPYWRITER, { research, strategy });
      let review = await executeStage(run, CREW_NODE.REVIEWER, { research, strategy, draft });

      if (review?.decision === "REVISE") {
        event(run, "review.revision.requested", { instructions: review.revisionInstructions || [] });
        draft = await executeStage(run, CREW_NODE.COPYWRITER, { research, strategy, previousDraft: draft, review }, 2);
        review = await executeStage(run, CREW_NODE.REVIEWER, { research, strategy, draft }, 2);
      }
      if (review?.decision !== "PASS") throw new Error(`CONTENT_REVIEW_${review?.decision || "INVALID"}`);

      await executeStage(run, CREW_NODE.DISTRIBUTION_MANAGER, {
        strategy,
        draft,
        review,
        requestedSchedule: run.input.schedule || null,
      });
      transition(run, RUN_STATUS.AWAITING_APPROVAL);
      run.approval = {
        status: "PENDING",
        requestedAt: now(),
        decidedAt: null,
        decidedBy: null,
        note: null,
        package: {
          draft: run.outputs[CREW_NODE.COPYWRITER],
          review: run.outputs[CREW_NODE.REVIEWER],
          distributionPlan: run.outputs[CREW_NODE.DISTRIBUTION_MANAGER],
        },
      };
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
