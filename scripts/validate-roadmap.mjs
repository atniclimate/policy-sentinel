import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDocument } from "yaml";

const root = resolve(import.meta.dirname, "..");
const requestedRoadmapPath = process.argv[2];
const roadmapPath = requestedRoadmapPath
  ? resolve(process.cwd(), requestedRoadmapPath)
  : resolve(root, "ROADMAP.yaml");
const source = await readFile(roadmapPath, "utf8");
const document = parseDocument(source, {
  prettyErrors: true,
  strict: true,
  uniqueKeys: true,
});

if (document.errors.length > 0) {
  throw new Error(
    `ROADMAP.yaml could not be parsed:\n${document.errors
      .map((error) => error.message)
      .join("\n")}`,
  );
}

const roadmap = document.toJS();

const fail = (message) => {
  throw new Error(`ROADMAP.yaml: ${message}`);
};

const requireObject = (value, path) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  return value;
};

const requireArray = (value, path, { nonempty = true } = {}) => {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) {
    fail(`${path} must be ${nonempty ? "a non-empty" : "an"} array`);
  }
  return value;
};

const requireString = (value, path) => {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${path} must be a non-empty string`);
  }
  return value;
};

const requireUniqueStrings = (value, path) => {
  const entries = requireArray(value, path);
  for (const [index, entry] of entries.entries()) {
    requireString(entry, `${path}[${index}]`);
  }
  if (new Set(entries).size !== entries.length) {
    fail(`${path} contains duplicate values`);
  }
  return entries;
};

requireString(roadmap.schema_version, "schema_version");
requireString(roadmap.roadmap_id, "roadmap_id");
requireObject(roadmap.project, "project");
requireObject(roadmap.canonical_ledger, "canonical_ledger");
requireObject(roadmap.authority, "authority");
requireObject(roadmap.baseline, "baseline");
requireObject(roadmap.current_focus, "current_focus");
requireObject(roadmap.completion_scope, "completion_scope");
requireObject(roadmap.finish_states, "finish_states");

const allowedStatuses = new Set(
  requireUniqueStrings(
    roadmap.canonical_ledger.allowed_work_item_statuses,
    "canonical_ledger.allowed_work_item_statuses",
  ),
);
const expectedStatuses = new Set([
  "complete",
  "in_progress",
  "ready",
  "blocked",
  "deferred",
  "not_started",
]);
if (
  allowedStatuses.size !== expectedStatuses.size ||
  [...expectedStatuses].some((status) => !allowedStatuses.has(status))
) {
  fail("allowed work-item statuses do not match the durable status contract");
}

const allowedGateStates = new Set(
  requireUniqueStrings(
    roadmap.canonical_ledger.allowed_gate_states,
    "canonical_ledger.allowed_gate_states",
  ),
);
const expectedGateStates = new Set([
  "approved",
  "closed",
  "pending_evidence",
  "satisfied",
]);
if (
  allowedGateStates.size !== expectedGateStates.size ||
  [...expectedGateStates].some((state) => !allowedGateStates.has(state))
) {
  fail("allowed gate states do not match the durable gate contract");
}

const allowedFinishStates = new Set(
  requireUniqueStrings(
    roadmap.canonical_ledger.allowed_finish_states,
    "canonical_ledger.allowed_finish_states",
  ),
);
const expectedFinishStates = new Set([
  "not_started",
  "in_progress",
  "complete",
  "blocked",
]);
if (
  allowedFinishStates.size !== expectedFinishStates.size ||
  [...expectedFinishStates].some((state) => !allowedFinishStates.has(state))
) {
  fail("allowed finish states do not match the durable finish-state contract");
}

const boundaries = requireArray(
  roadmap.authority.external_boundaries,
  "authority.external_boundaries",
);
const boundaryIds = new Set();
for (const [index, boundary] of boundaries.entries()) {
  const path = `authority.external_boundaries[${index}]`;
  requireObject(boundary, path);
  const id = requireString(boundary.id, `${path}.id`);
  if (boundaryIds.has(id)) {
    fail(`duplicate external boundary id: ${id}`);
  }
  boundaryIds.add(id);
  if (boundary.state !== "closed") {
    fail(
      `${path}.state must remain closed; record an exact approved exception on its scoped gate`,
    );
  }
  requireString(boundary.prohibits, `${path}.prohibits`);
  requireString(boundary.unblocks_only_when, `${path}.unblocks_only_when`);
}

const gates = requireArray(roadmap.gates, "gates");
const gateIds = new Set();
const gateById = new Map();
for (const [index, gate] of gates.entries()) {
  const path = `gates[${index}]`;
  requireObject(gate, path);
  const id = requireString(gate.id, `${path}.id`);
  if (gateIds.has(id)) {
    fail(`duplicate gate id: ${id}`);
  }
  gateIds.add(id);
  gateById.set(id, gate);
  requireString(gate.name, `${path}.name`);
  if (!allowedGateStates.has(gate.state)) {
    fail(`${path}.state is not allowed: ${gate.state}`);
  }
  if (gate.boundary && !boundaryIds.has(gate.boundary)) {
    fail(`${path}.boundary references unknown boundary ${gate.boundary}`);
  }
  if (gate.approvable === false && gate.state !== "closed") {
    fail(`${path} is a category gate and must remain closed`);
  }
  if (gate.state === "approved" && gate.boundary) {
    requireUniqueStrings(gate.approved_scope, `${path}.approved_scope`);
  }
  if (gate.state === "approved" || gate.state === "satisfied") {
    requireUniqueStrings(gate.evidence, `${path}.evidence`);
  }
  if (
    gate.state !== "approved" &&
    Array.isArray(gate.approved_scope) &&
    gate.approved_scope.length > 0
  ) {
    fail(`${path}.approved_scope requires state approved`);
  }
}

const bindingDocuments = requireArray(
  roadmap.binding_documents,
  "binding_documents",
);
const bindingPaths = new Set();
for (const [index, documentEntry] of bindingDocuments.entries()) {
  const path = `binding_documents[${index}]`;
  requireObject(documentEntry, path);
  const repositoryPath = requireString(documentEntry.path, `${path}.path`);
  if (bindingPaths.has(repositoryPath)) {
    fail(`duplicate binding document path: ${repositoryPath}`);
  }
  bindingPaths.add(repositoryPath);
  requireString(documentEntry.role, `${path}.role`);
  try {
    await access(resolve(root, repositoryPath));
  } catch {
    fail(`${path}.path does not exist: ${repositoryPath}`);
  }
}

const workItems = requireArray(roadmap.work_items, "work_items");
const workItemIds = new Set();
const priorities = new Set();
const byId = new Map();
let previousPriority = -1;

for (const [index, item] of workItems.entries()) {
  const path = `work_items[${index}]`;
  requireObject(item, path);
  const id = requireString(item.id, `${path}.id`);
  if (workItemIds.has(id)) {
    fail(`duplicate work-item id: ${id}`);
  }
  workItemIds.add(id);
  byId.set(id, item);

  if (!Number.isInteger(item.priority) || item.priority < 0) {
    fail(`${path}.priority must be a non-negative integer`);
  }
  if (priorities.has(item.priority)) {
    fail(`duplicate work-item priority: ${item.priority}`);
  }
  priorities.add(item.priority);
  if (item.priority <= previousPriority) {
    fail(`${path}.priority must be greater than the prior work item`);
  }
  previousPriority = item.priority;

  requireString(item.milestone, `${path}.milestone`);
  requireString(item.title, `${path}.title`);
  if (!allowedStatuses.has(item.status)) {
    fail(`${path}.status is not allowed: ${item.status}`);
  }
  requireArray(item.dependencies, `${path}.dependencies`, { nonempty: false });
  requireArray(item.acceptance, `${path}.acceptance`);
  const itemEvidence = requireArray(item.evidence, `${path}.evidence`, {
    nonempty: false,
  });
  for (const [evidenceIndex, evidence] of itemEvidence.entries()) {
    requireString(evidence, `${path}.evidence[${evidenceIndex}]`);
  }
  if (new Set(itemEvidence).size !== itemEvidence.length) {
    fail(`${path}.evidence contains duplicate values`);
  }

  if (item.status === "complete" && item.evidence.length === 0) {
    fail(`${id} is complete without evidence`);
  }
  if (item.status === "blocked") {
    requireArray(item.blocked_by, `${path}.blocked_by`);
    requireString(item.safe_fallback, `${path}.safe_fallback`);
    requireString(item.unblocks_only_when, `${path}.unblocks_only_when`);
    if (item.evidence.length === 0) {
      fail(`${id} is blocked without evidence`);
    }
  }
  if (item.status === "deferred") {
    requireString(item.reason, `${path}.reason`);
  }
  if (item.authorization_gate) {
    requireString(item.authorization_gate, `${path}.authorization_gate`);
    if (!gateIds.has(item.authorization_gate)) {
      fail(
        `${path}.authorization_gate references unknown gate ${item.authorization_gate}`,
      );
    }
    if (
      item.status === "blocked" &&
      !item.blocked_by.includes(item.authorization_gate)
    ) {
      fail(`${id} is blocked but authorization_gate is absent from blocked_by`);
    }
    if (
      item.status !== "blocked" &&
      !["approved", "satisfied"].includes(
        gateById.get(item.authorization_gate).state,
      )
    ) {
      fail(
        `${id} cannot be ${item.status} while authorization gate ${item.authorization_gate} is ${gateById.get(item.authorization_gate).state}`,
      );
    }
  }
}

for (const item of workItems) {
  for (const dependency of item.dependencies) {
    if (!workItemIds.has(dependency)) {
      fail(`${item.id} depends on unknown work item ${dependency}`);
    }
    if (dependency === item.id) {
      fail(`${item.id} cannot depend on itself`);
    }
  }
  if (item.status === "complete") {
    const unfinishedDependencies = item.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (unfinishedDependencies.length > 0) {
      fail(
        `${item.id} is complete but dependencies are not: ${unfinishedDependencies.join(", ")}`,
      );
    }
  }
  if (item.status === "ready") {
    const unfinishedDependencies = item.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (unfinishedDependencies.length > 0) {
      fail(
        `${item.id} is ready but dependencies are not complete: ${unfinishedDependencies.join(", ")}`,
      );
    }
  }
  if (item.status === "in_progress") {
    const unfinishedDependencies = item.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (unfinishedDependencies.length > 0) {
      fail(
        `${item.id} is in_progress but dependencies are not complete: ${unfinishedDependencies.join(", ")}`,
      );
    }
  }
  if (
    item.status === "not_started" &&
    item.dependencies.every(
      (dependency) => byId.get(dependency).status === "complete",
    )
  ) {
    fail(
      `${item.id} has complete dependencies and must be ready, blocked, deferred, or complete`,
    );
  }
  if (item.status === "blocked") {
    for (const blocker of item.blocked_by) {
      if (!gateIds.has(blocker) && !boundaryIds.has(blocker)) {
        fail(`${item.id} references unknown blocker ${blocker}`);
      }
    }
  }
}

const visitState = new Map();
const visit = (id, stack = []) => {
  const state = visitState.get(id);
  if (state === "done") {
    return;
  }
  if (state === "visiting") {
    fail(`dependency cycle detected: ${[...stack, id].join(" -> ")}`);
  }
  visitState.set(id, "visiting");
  for (const dependency of byId.get(id).dependencies) {
    visit(dependency, [...stack, id]);
  }
  visitState.set(id, "done");
};
for (const id of workItemIds) {
  visit(id);
}

const completionScope = requireObject(
  roadmap.completion_scope.local_release_candidate,
  "completion_scope.local_release_candidate",
);
const requiredOutcomes = requireUniqueStrings(
  completionScope.required_outcomes,
  "completion_scope.local_release_candidate.required_outcomes",
);
const acceptedSourceBlocks = requireUniqueStrings(
  completionScope.accepted_source_blocks,
  "completion_scope.local_release_candidate.accepted_source_blocks",
);
const publicationOnly = requireUniqueStrings(
  completionScope.publication_only,
  "completion_scope.local_release_candidate.publication_only",
);
const additiveVisionPhases = requireUniqueStrings(
  completionScope.additive_vision_phases,
  "completion_scope.local_release_candidate.additive_vision_phases",
);
const completionGroups = [
  ["required_outcomes", requiredOutcomes],
  ["accepted_source_blocks", acceptedSourceBlocks],
  ["publication_only", publicationOnly],
  ["additive_vision_phases", additiveVisionPhases],
];
const completionMembership = new Map();
for (const [group, ids] of completionGroups) {
  for (const id of ids) {
    if (!workItemIds.has(id)) {
      fail(`completion scope ${group} references unknown work item ${id}`);
    }
    if (completionMembership.has(id)) {
      fail(
        `${id} appears in both completion scope ${completionMembership.get(id)} and ${group}`,
      );
    }
    completionMembership.set(id, group);
  }
}
const unscopedWorkItems = [...workItemIds].filter(
  (id) => !completionMembership.has(id),
);
if (unscopedWorkItems.length > 0) {
  fail(
    `work items missing from completion scope: ${unscopedWorkItems.join(", ")}`,
  );
}
const localFinish = requireObject(
  roadmap.finish_states.local_release_candidate,
  "finish_states.local_release_candidate",
);
if (!allowedFinishStates.has(localFinish.current_state)) {
  fail(
    `finish_states.local_release_candidate.current_state is not allowed: ${localFinish.current_state}`,
  );
}
const inProgress = workItems.filter((item) => item.status === "in_progress");
const isTerminal = ["complete", "blocked"].includes(localFinish.current_state);
let terminalRequiredRoots = [];
// A required outcome may be evidence-blocked while independent ready work
// continues. The terminal-complete check below still requires every required
// outcome to be complete, so an active blocker cannot weaken release
// acceptance or be mistaken for an accepted source gap.
if (isTerminal) {
  if (inProgress.length !== 0) {
    fail(
      `terminal local finish state requires zero in_progress items; found ${inProgress.length}`,
    );
  }
  if (roadmap.current_focus.work_item !== null) {
    fail("terminal local finish state requires current_focus.work_item: null");
  }
  requireString(
    roadmap.current_focus.terminal_reason,
    "current_focus.terminal_reason",
  );
} else {
  if (inProgress.length !== 1) {
    fail(
      `active local finish state requires exactly one in_progress item; found ${inProgress.length}`,
    );
  }
  const focusId = requireString(
    roadmap.current_focus.work_item,
    "current_focus.work_item",
  );
  if (!workItemIds.has(focusId)) {
    fail(`current_focus.work_item references unknown work item ${focusId}`);
  }
  if (focusId !== inProgress[0].id) {
    fail(
      `current_focus.work_item ${focusId} does not match in_progress item ${inProgress[0].id}`,
    );
  }
}

if (localFinish.current_state === "complete") {
  const incompleteRequired = requiredOutcomes.filter(
    (id) => byId.get(id).status !== "complete",
  );
  if (incompleteRequired.length > 0) {
    fail(
      `local release candidate is complete with incomplete required outcomes: ${incompleteRequired.join(", ")}`,
    );
  }
  if (gateById.get("G-RC")?.state !== "satisfied") {
    fail("local release candidate is complete but G-RC is not satisfied");
  }
  if (gateById.get("G-J")?.state !== "satisfied") {
    fail("local release candidate is complete but G-J is not satisfied");
  }
  const unresolvedAcceptedBlocks = acceptedSourceBlocks.filter(
    (id) => !["blocked", "complete"].includes(byId.get(id).status),
  );
  if (unresolvedAcceptedBlocks.length > 0) {
    fail(
      `local release candidate is complete with unresolved accepted source blocks: ${unresolvedAcceptedBlocks.join(", ")}`,
    );
  }
}
if (localFinish.current_state === "blocked") {
  const localFinishBlockers = requireUniqueStrings(
    localFinish.blocked_by,
    "finish_states.local_release_candidate.blocked_by",
  );
  const incompleteRequiredRoots = new Set();
  const collectIncompleteRoots = (id) => {
    const item = byId.get(id);
    if (item.status === "complete") {
      return;
    }
    const incompleteDependencies = item.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (item.status === "blocked" || incompleteDependencies.length === 0) {
      incompleteRequiredRoots.add(id);
      return;
    }
    for (const dependency of incompleteDependencies) {
      collectIncompleteRoots(dependency);
    }
  };
  for (const id of requiredOutcomes) {
    collectIncompleteRoots(id);
  }
  terminalRequiredRoots = [...incompleteRequiredRoots].sort(
    (left, right) => byId.get(left).priority - byId.get(right).priority,
  );
  const omittedRequiredRoots = terminalRequiredRoots.filter(
    (id) => !localFinishBlockers.includes(id),
  );
  const unexpectedFinishBlockers = localFinishBlockers.filter(
    (id) => !incompleteRequiredRoots.has(id),
  );
  if (omittedRequiredRoots.length > 0 || unexpectedFinishBlockers.length > 0) {
    fail(
      "terminal-blocked finish blockers must exactly match incomplete " +
        `required-outcome roots; missing: ${omittedRequiredRoots.join(", ") || "none"}; ` +
        `unexpected: ${unexpectedFinishBlockers.join(", ") || "none"}`,
    );
  }
  const currentFocusRoots = requireUniqueStrings(
    roadmap.current_focus.resumable_roots,
    "current_focus.resumable_roots",
  );
  const omittedFocusRoots = terminalRequiredRoots.filter(
    (id) => !currentFocusRoots.includes(id),
  );
  const unexpectedFocusRoots = currentFocusRoots.filter(
    (id) => !incompleteRequiredRoots.has(id),
  );
  if (omittedFocusRoots.length > 0 || unexpectedFocusRoots.length > 0) {
    fail(
      "terminal-blocked current focus must exactly match incomplete " +
        `required-outcome roots; missing: ${omittedFocusRoots.join(", ") || "none"}; ` +
        `unexpected: ${unexpectedFocusRoots.join(", ") || "none"}`,
    );
  }
  const readyItems = workItems
    .filter((item) => item.status === "ready")
    .map((item) => item.id);
  if (readyItems.length > 0) {
    fail(
      `local release candidate cannot be terminal-blocked while ready work remains: ${readyItems.join(", ")}`,
    );
  }
}

const publicFinish = requireObject(
  roadmap.finish_states.public_beta,
  "finish_states.public_beta",
);
if (!allowedFinishStates.has(publicFinish.current_state)) {
  fail(
    `finish_states.public_beta.current_state is not allowed: ${publicFinish.current_state}`,
  );
}
if (
  publicFinish.current_state === "complete" &&
  (localFinish.current_state !== "complete" ||
    byId.get("RELEASE-PUBLISH")?.status !== "complete")
) {
  fail(
    "public beta is complete without a complete local release candidate and publication work item",
  );
}
if (
  publicFinish.current_state === "blocked" &&
  byId.get("RELEASE-PUBLISH")?.status !== "blocked"
) {
  fail("public beta is blocked but RELEASE-PUBLISH is not blocked");
}

const sourceRegister = requireArray(roadmap.source_register, "source_register");
const sourceIds = new Set();
for (const [index, sourceEntry] of sourceRegister.entries()) {
  const path = `source_register[${index}]`;
  requireObject(sourceEntry, path);
  const id = requireString(sourceEntry.id, `${path}.id`);
  if (sourceIds.has(id)) {
    fail(`duplicate source id: ${id}`);
  }
  sourceIds.add(id);
  requireString(sourceEntry.source, `${path}.source`);
  requireString(
    sourceEntry.implementation_state,
    `${path}.implementation_state`,
  );
  requireString(sourceEntry.public_claim, `${path}.public_claim`);
  for (const workItem of requireArray(
    sourceEntry.work_items,
    `${path}.work_items`,
  )) {
    if (!workItemIds.has(workItem)) {
      fail(`${id} references unknown work item ${workItem}`);
    }
  }
}

const nextActions = requireArray(roadmap.next_actions, "next_actions");
let previousOrder = -1;
for (const [index, action] of nextActions.entries()) {
  const path = `next_actions[${index}]`;
  requireObject(action, path);
  if (!Number.isInteger(action.order) || action.order <= previousOrder) {
    fail(`${path}.order must be an increasing integer`);
  }
  previousOrder = action.order;
  if (!workItemIds.has(action.work_item)) {
    fail(`${path}.work_item references unknown item ${action.work_item}`);
  }
  requireString(action.action, `${path}.action`);
}
if (terminalRequiredRoots.length > 0) {
  const nextActionIds = nextActions.map((action) => action.work_item);
  const hasExactOrderedRoots =
    nextActionIds.length === terminalRequiredRoots.length &&
    nextActionIds.every((id, index) => id === terminalRequiredRoots[index]);
  if (!hasExactOrderedRoots) {
    const nextActionSet = new Set(nextActionIds);
    const omittedActionRoots = terminalRequiredRoots.filter(
      (id) => !nextActionSet.has(id),
    );
    const expectedRootSet = new Set(terminalRequiredRoots);
    const unexpectedActions = nextActionIds.filter(
      (id) => !expectedRootSet.has(id),
    );
    fail(
      "terminal-blocked next actions must list each incomplete required-outcome " +
        `root exactly once in priority order; missing: ${omittedActionRoots.join(", ") || "none"}; ` +
        `unexpected: ${unexpectedActions.join(", ") || "none"}; expected order: ${terminalRequiredRoots.join(", ")}`,
    );
  }
}

const statusCounts = Object.fromEntries(
  [...allowedStatuses].map((status) => [
    status,
    workItems.filter((item) => item.status === status).length,
  ]),
);

console.log(
  `Roadmap validation passed: ${workItems.length} work items, ` +
    `${gates.length} gates, ${sourceRegister.length} sources, ` +
    `${bindingDocuments.length} binding paths; statuses ${JSON.stringify(statusCounts)}.`,
);
