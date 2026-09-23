const CREW_NODE = Object.freeze({
  RESEARCHER: "researcher",
  STRATEGIST: "strategist",
  COPYWRITER: "copywriter",
  REVIEWER: "reviewer",
  DISTRIBUTION_MANAGER: "distribution-manager",
  HUMAN_APPROVAL: "human-approval",
  OPERATOR: "operator",
});

const DEFAULT_CREW_GRAPH = Object.freeze([
  Object.freeze({ id: CREW_NODE.RESEARCHER, kind: "agent", dependsOn: [] }),
  Object.freeze({ id: CREW_NODE.STRATEGIST, kind: "agent", dependsOn: [CREW_NODE.RESEARCHER] }),
  Object.freeze({ id: CREW_NODE.COPYWRITER, kind: "agent", dependsOn: [CREW_NODE.STRATEGIST] }),
  Object.freeze({ id: CREW_NODE.REVIEWER, kind: "agent", dependsOn: [CREW_NODE.COPYWRITER] }),
  Object.freeze({
    id: CREW_NODE.DISTRIBUTION_MANAGER,
    kind: "agent",
    dependsOn: [CREW_NODE.REVIEWER],
  }),
  Object.freeze({
    id: CREW_NODE.HUMAN_APPROVAL,
    kind: "hard-gate",
    dependsOn: [CREW_NODE.DISTRIBUTION_MANAGER],
    autonomous: false,
  }),
  Object.freeze({
    id: CREW_NODE.OPERATOR,
    kind: "connector",
    dependsOn: [CREW_NODE.HUMAN_APPROVAL],
    externalMutation: true,
  }),
]);

function validateCrewGraph(graph = DEFAULT_CREW_GRAPH) {
  if (!Array.isArray(graph) || graph.length === 0) throw new Error("Crew graph must contain nodes");
  const nodes = new Map();
  for (const node of graph) {
    if (!node?.id || typeof node.id !== "string") throw new Error("Crew node id is required");
    if (nodes.has(node.id)) throw new Error(`Duplicate crew node: ${node.id}`);
    nodes.set(node.id, node);
  }
  for (const node of graph) {
    for (const dependency of node.dependsOn || []) {
      if (!nodes.has(dependency)) throw new Error(`Unknown crew dependency: ${dependency}`);
      if (dependency === node.id) throw new Error(`Crew node cannot depend on itself: ${node.id}`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Crew graph contains a cycle at: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of nodes.get(id).dependsOn || []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);

  const gate = nodes.get(CREW_NODE.HUMAN_APPROVAL);
  if (!gate || gate.kind !== "hard-gate" || gate.autonomous !== false) {
    throw new Error("Crew graph requires a non-autonomous human approval hard gate");
  }
  for (const node of graph.filter(item => item.externalMutation === true)) {
    if (!(node.dependsOn || []).includes(CREW_NODE.HUMAN_APPROVAL)) {
      throw new Error(`External mutation must depend directly on human approval: ${node.id}`);
    }
  }
  return true;
}

module.exports = { CREW_NODE, DEFAULT_CREW_GRAPH, validateCrewGraph };
