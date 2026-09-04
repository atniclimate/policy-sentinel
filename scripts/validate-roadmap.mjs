import { createHash } from "node:crypto";
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

const requireExactOrderedValues = (actual, expected, path) => {
  const values = requireArray(actual, path, { nonempty: expected.length > 0 });
  if (
    values.length !== expected.length ||
    values.some((value, index) => value !== expected[index])
  ) {
    fail(`${path} must preserve exactly: ${expected.join(", ")}`);
  }
  return values;
};

const requireExactKeys = (value, expectedKeys, path) => {
  const object = requireObject(value, path);
  const actualKeys = Object.keys(object).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    fail(`${path} must contain exactly: ${expectedKeys.join(", ")}`);
  }
  return object;
};

const requireExactValue = (actual, expected, path) => {
  if (actual !== expected) {
    fail(`${path} must remain ${JSON.stringify(expected)}`);
  }
  return actual;
};

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

const repositoryBytes = async (repositoryPath, path) => {
  const bytes = await readFile(resolve(root, repositoryPath));
  const normalized = Buffer.from(
    bytes.toString("utf8").replaceAll("\r\n", "\n"),
    "utf8",
  );
  if (normalized.includes(13)) {
    fail(`${path} contains a non-canonical carriage return`);
  }
  return normalized;
};

const requireRepositorySha256 = async (
  repositoryPath,
  expectedSha256,
  path,
) => {
  const actualSha256 = sha256Hex(await repositoryBytes(repositoryPath, path));
  if (actualSha256 !== expectedSha256) {
    fail(
      `${path} SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`,
    );
  }
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
const statusSemantics = requireExactKeys(
  roadmap.canonical_ledger.status_semantics,
  [...expectedStatuses],
  "canonical_ledger.status_semantics",
);
for (const status of expectedStatuses) {
  requireString(
    statusSemantics[status],
    `canonical_ledger.status_semantics.${status}`,
  );
}
const maturitySemanticsKeys = [
  "proposed",
  "contracted",
  "implemented",
  "integrated",
  "validated",
  "source_activated",
  "release_ready",
  "published",
];
const maturitySemantics = requireExactKeys(
  roadmap.canonical_ledger.capability_maturity_semantics,
  maturitySemanticsKeys,
  "canonical_ledger.capability_maturity_semantics",
);
for (const maturity of maturitySemanticsKeys) {
  requireString(
    maturitySemantics[maturity],
    `canonical_ledger.capability_maturity_semantics.${maturity}`,
  );
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

const expectedAdditivePhaseStages = [
  "contract_design",
  "contract_freeze",
  "contract_review",
  "implementation",
  "implementation_review",
  "completion",
];
const allowedAdditivePhaseStages = requireUniqueStrings(
  roadmap.canonical_ledger.allowed_additive_phase_stages,
  "canonical_ledger.allowed_additive_phase_stages",
);
if (
  allowedAdditivePhaseStages.length !== expectedAdditivePhaseStages.length ||
  allowedAdditivePhaseStages.some(
    (stage, index) => stage !== expectedAdditivePhaseStages[index],
  )
) {
  fail(
    "allowed additive-phase stages do not match the ordered durable stage contract",
  );
}
const additivePhaseStageIndex = new Map(
  expectedAdditivePhaseStages.map((stage, index) => [stage, index]),
);

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
  if (gate.authorized_through !== undefined) {
    const authorizedThrough = requireString(
      gate.authorized_through,
      `${path}.authorized_through`,
    );
    if (!additivePhaseStageIndex.has(authorizedThrough)) {
      fail(
        `${path}.authorized_through is not an allowed additive-phase stage: ${authorizedThrough}`,
      );
    }
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
  if (item.additive_phase_stage !== undefined) {
    const additivePhaseStage = requireString(
      item.additive_phase_stage,
      `${path}.additive_phase_stage`,
    );
    if (!additivePhaseStageIndex.has(additivePhaseStage)) {
      fail(
        `${path}.additive_phase_stage is not allowed: ${additivePhaseStage}`,
      );
    }
  }
  if (item.convergence_gate !== undefined) {
    const convergenceGate = requireString(
      item.convergence_gate,
      `${path}.convergence_gate`,
    );
    if (!gateIds.has(convergenceGate)) {
      fail(
        `${path}.convergence_gate references unknown gate ${convergenceGate}`,
      );
    }
  }
  if (item.authorization_gate) {
    requireString(item.authorization_gate, `${path}.authorization_gate`);
    if (!gateIds.has(item.authorization_gate)) {
      fail(
        `${path}.authorization_gate references unknown gate ${item.authorization_gate}`,
      );
    }
    const authorizationGateState = gateById.get(item.authorization_gate).state;
    if (
      item.status === "blocked" &&
      !["approved", "satisfied"].includes(authorizationGateState) &&
      !item.blocked_by.includes(item.authorization_gate)
    ) {
      fail(`${id} is blocked but authorization_gate is absent from blocked_by`);
    }
    if (
      item.status !== "blocked" &&
      !["approved", "satisfied"].includes(authorizationGateState)
    ) {
      fail(
        `${id} cannot be ${item.status} while authorization gate ${item.authorization_gate} is ${authorizationGateState}`,
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
const pnwCompletionScope = requireObject(
  roadmap.completion_scope.pnw_regional_engine,
  "completion_scope.pnw_regional_engine",
);
const localRealSourcePrereleaseScope =
  roadmap.completion_scope.local_real_source_prerelease === undefined
    ? null
    : requireObject(
        roadmap.completion_scope.local_real_source_prerelease,
        "completion_scope.local_real_source_prerelease",
      );
const repositoryBackboneScope = requireObject(
  roadmap.completion_scope.repository_backbone,
  "completion_scope.repository_backbone",
);
const hasExactOrderedValues = (actual, expected) =>
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index]);
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
const repositoryBackboneOutcomes = requireUniqueStrings(
  repositoryBackboneScope.required_outcomes,
  "completion_scope.repository_backbone.required_outcomes",
);
requireUniqueStrings(
  repositoryBackboneScope.does_not_change,
  "completion_scope.repository_backbone.does_not_change",
);
if (
  !hasExactOrderedValues(repositoryBackboneOutcomes, ["H-REPOSITORY-BACKBONE"])
) {
  fail("repository backbone scope must contain exactly H-REPOSITORY-BACKBONE");
}
const expectedPnwRequiredOutcomes = [
  "PNW-00-RECONCILE",
  "PNW-01-ENGINE-SEAMS",
  "PNW-02-REGIONAL-REGISTRY",
  "PNW-03-GEOGRAPHY-RIGHTS",
  "PNW-04-TAXONOMY",
  "PNW-05-SOURCE-PACK",
  "PNW-06-LIFECYCLE-REFRESH",
  "PNW-07-ANALYZED-CORPUS",
  "PNW-08-OUTPUT-ADAPTERS",
  "PNW-09-ACCEPTANCE-SCENARIOS",
  "PNW-10-REGIONAL-RC",
];
const pnwRequiredOutcomes = requireUniqueStrings(
  pnwCompletionScope.required_outcomes,
  "completion_scope.pnw_regional_engine.required_outcomes",
);
const expectedLocalRealSourcePrereleaseOutcomes = [
  "PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT",
  "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION",
  "PNW-06-FEDERAL-REGISTER-BOUNDED-REFRESH-LKG",
  "PNW-07-GENERAL-JURISDICTION-ANALYZED-CORPUS-PROJECTION",
  "PNW-08-LOCAL-REAL-SOURCE-APPLICATION-PRERELEASE",
  "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY",
];
const localRealSourcePrereleaseOutcomes =
  localRealSourcePrereleaseScope === null
    ? []
    : requireUniqueStrings(
        localRealSourcePrereleaseScope.required_outcomes,
        "completion_scope.local_real_source_prerelease.required_outcomes",
      );
if (
  localRealSourcePrereleaseScope !== null &&
  !hasExactOrderedValues(
    localRealSourcePrereleaseOutcomes,
    expectedLocalRealSourcePrereleaseOutcomes,
  )
) {
  fail(
    "local real-source prerelease outcomes must preserve the exact bounded child lane",
  );
}
if (!hasExactOrderedValues(pnwRequiredOutcomes, expectedPnwRequiredOutcomes)) {
  fail(
    "PNW regional required outcomes must preserve PNW-00 through PNW-10 in order",
  );
}
const pnwMappingDocument = requireString(
  pnwCompletionScope.mapping_document,
  "completion_scope.pnw_regional_engine.mapping_document",
);
if (!bindingPaths.has(pnwMappingDocument)) {
  fail("PNW regional mapping document must be a binding document");
}
const expectedPnwLaunchDocument =
  "docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md";
const pnwLaunchDocument = requireString(
  pnwCompletionScope.launch_document,
  "completion_scope.pnw_regional_engine.launch_document",
);
if (pnwLaunchDocument !== expectedPnwLaunchDocument) {
  fail(`PNW-01 launch document must remain ${expectedPnwLaunchDocument}`);
}
if (!bindingPaths.has(pnwLaunchDocument)) {
  fail("PNW-01 launch document must be a binding document");
}
if (
  requireString(
    pnwCompletionScope.first_implementation_tranche,
    "completion_scope.pnw_regional_engine.first_implementation_tranche",
  ) !== "PNW-01-ENGINE-SEAMS"
) {
  fail(
    "PNW-01-ENGINE-SEAMS must remain the exact first implementation tranche",
  );
}
if (
  requireString(
    pnwCompletionScope.implementation_gate,
    "completion_scope.pnw_regional_engine.implementation_gate",
  ) !== "G-PNW-IMPLEMENTATION"
) {
  fail("the PNW first implementation tranche must retain G-PNW-IMPLEMENTATION");
}
const requiredPnwGateIds = [
  "G-PNW-IMPLEMENTATION",
  "G-PNW-ATNI-59-ROSTER",
  "G-PNW-COMMUNITY-AUTHORITY",
  "G-PNW-SPATIAL-EVIDENCE",
  "G-PNW-SOURCE-ACTIVATION",
  "G-PNW-OUTPUT-REVIEW",
];
for (const id of requiredPnwGateIds) {
  if (!gateById.has(id)) {
    fail(`durable PNW gate is missing: ${id}`);
  }
}
if (localRealSourcePrereleaseScope !== null) {
  const exactGates = new Map([
    ["authority_gate", "G-PNW-05-REAL-SOURCE-PRERELEASE"],
    ["qualification_gate", "G-PNW-05-FR-TIER1-QUALIFICATION"],
    ["activation_gate", "G-PNW-05-FR-LOCAL-ACTIVATION"],
  ]);
  for (const [field, gateId] of exactGates) {
    if (localRealSourcePrereleaseScope[field] !== gateId) {
      fail(`local real-source prerelease ${field} must remain ${gateId}`);
    }
    if (!gateById.has(gateId)) {
      fail(`local real-source prerelease gate is missing: ${gateId}`);
    }
  }
  requireUniqueStrings(
    localRealSourcePrereleaseScope.does_not_change,
    "completion_scope.local_real_source_prerelease.does_not_change",
  );
}
const expectedPnwDependencies = new Map([
  ["PNW-00-RECONCILE", []],
  ["PNW-01-ENGINE-SEAMS", ["PNW-00-RECONCILE"]],
  ["PNW-02-REGIONAL-REGISTRY", ["PNW-01-ENGINE-SEAMS"]],
  ["PNW-03-GEOGRAPHY-RIGHTS", ["PNW-01-ENGINE-SEAMS"]],
  ["PNW-04-TAXONOMY", ["PNW-01-ENGINE-SEAMS"]],
  ["PNW-05-SOURCE-PACK", ["PNW-01-ENGINE-SEAMS"]],
  ["PNW-06-LIFECYCLE-REFRESH", ["PNW-05-SOURCE-PACK"]],
  [
    "PNW-07-ANALYZED-CORPUS",
    ["PNW-01-ENGINE-SEAMS", "PNW-04-TAXONOMY", "PNW-05-SOURCE-PACK"],
  ],
  ["PNW-08-OUTPUT-ADAPTERS", ["PNW-07-ANALYZED-CORPUS"]],
  [
    "PNW-09-ACCEPTANCE-SCENARIOS",
    [
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-06-LIFECYCLE-REFRESH",
      "PNW-08-OUTPUT-ADAPTERS",
    ],
  ],
  ["PNW-10-REGIONAL-RC", ["PNW-09-ACCEPTANCE-SCENARIOS"]],
]);
for (const [id, expectedDependencies] of expectedPnwDependencies) {
  const item = byId.get(id);
  if (!item) {
    fail(`durable PNW work item is missing: ${id}`);
  }
  if (!hasExactOrderedValues(item.dependencies, expectedDependencies)) {
    fail(`${id} dependencies do not match the durable PNW execution graph`);
  }
}
const expectedLocalRealSourceDependencies = new Map([
  [
    "PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT",
    ["B3-PIPELINE", "PNW-01-ENGINE-SEAMS", "PNW-04-TAXONOMY"],
  ],
  [
    "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION",
    ["PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT", "B4-FR-ADAPTER"],
  ],
  [
    "PNW-06-FEDERAL-REGISTER-BOUNDED-REFRESH-LKG",
    ["PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION"],
  ],
  [
    "PNW-07-GENERAL-JURISDICTION-ANALYZED-CORPUS-PROJECTION",
    ["PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT", "PNW-04-TAXONOMY"],
  ],
  [
    "PNW-08-LOCAL-REAL-SOURCE-APPLICATION-PRERELEASE",
    [
      "PNW-06-FEDERAL-REGISTER-BOUNDED-REFRESH-LKG",
      "PNW-07-GENERAL-JURISDICTION-ANALYZED-CORPUS-PROJECTION",
    ],
  ],
  ["PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY", ["PNW-01-ENGINE-SEAMS"]],
]);
if (localRealSourcePrereleaseScope !== null) {
  for (const [
    id,
    expectedDependencies,
  ] of expectedLocalRealSourceDependencies) {
    const item = byId.get(id);
    if (!item) {
      fail(`local real-source prerelease work item is missing: ${id}`);
    }
    if (!hasExactOrderedValues(item.dependencies, expectedDependencies)) {
      fail(
        `${id} dependencies do not match the bounded local prerelease graph`,
      );
    }
    if (item.authorization_gate !== "G-PNW-05-REAL-SOURCE-PRERELEASE") {
      fail(`${id} must retain G-PNW-05-REAL-SOURCE-PRERELEASE`);
    }
  }
}
if (
  byId.get("PNW-01-ENGINE-SEAMS").authorization_gate !== "G-PNW-IMPLEMENTATION"
) {
  fail("PNW-01-ENGINE-SEAMS must retain G-PNW-IMPLEMENTATION");
}
if (
  byId.get("PNW-02-REGIONAL-REGISTRY").authorization_gate !==
  "G-PNW-ATNI-59-ROSTER"
) {
  fail("PNW-02-REGIONAL-REGISTRY must retain G-PNW-ATNI-59-ROSTER");
}
const completionGroups = [
  ["repository_backbone.required_outcomes", repositoryBackboneOutcomes],
  ["required_outcomes", requiredOutcomes],
  ["accepted_source_blocks", acceptedSourceBlocks],
  ["publication_only", publicationOnly],
  ["additive_vision_phases", additiveVisionPhases],
  ["pnw_regional_engine.required_outcomes", pnwRequiredOutcomes],
];
if (localRealSourcePrereleaseScope !== null) {
  completionGroups.push([
    "local_real_source_prerelease.required_outcomes",
    localRealSourcePrereleaseOutcomes,
  ]);
}
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

const additiveVisionPhaseIds = new Set(additiveVisionPhases);
const repositoryBackboneOutcomeIds = new Set(repositoryBackboneOutcomes);
const repositoryBackboneItem = byId.get("H-REPOSITORY-BACKBONE");
if (!repositoryBackboneItem) {
  fail("durable repository backbone work item is missing");
}
if (
  !hasExactOrderedValues(repositoryBackboneItem.dependencies, [
    "H-HOOKS",
    "PNW-00-RECONCILE",
  ])
) {
  fail(
    "H-REPOSITORY-BACKBONE must depend exactly on H-HOOKS and PNW-00-RECONCILE",
  );
}
if (repositoryBackboneItem.work_class !== "repository_governance") {
  fail("H-REPOSITORY-BACKBONE must retain work_class repository_governance");
}
const durableAdditiveVisionPhaseIds = [
  "K0-LIFECYCLE",
  "S0-SPATIAL",
  "O0-ORCHESTRATION",
];
for (const id of durableAdditiveVisionPhaseIds) {
  if (!byId.has(id)) {
    fail(`durable additive work item is missing: ${id}`);
  }
  if (completionMembership.get(id) !== "additive_vision_phases") {
    fail(`${id} must remain classified only in additive_vision_phases`);
  }
}

const durableAdditiveGateIds = [
  "G-K0-LIFECYCLE",
  "G-S0-SYNTHETIC",
  "G-K0-S0-CONVERGENCE",
  "G-O0-SYNTHETIC",
  "G-O0-CONVERGENCE",
];
for (const id of durableAdditiveGateIds) {
  if (!gateById.has(id)) {
    fail(`durable additive gate is missing: ${id}`);
  }
}
for (const [index, item] of workItems.entries()) {
  const path = `work_items[${index}]`;
  const isAdditive = additiveVisionPhaseIds.has(item.id);
  const hasAdditiveMetadata =
    item.additive_phase_stage !== undefined ||
    item.convergence_gate !== undefined;

  if (!isAdditive && hasAdditiveMetadata) {
    fail(
      `${item.id} has additive-phase metadata but is not in additive_vision_phases`,
    );
  }
  if (!isAdditive) {
    continue;
  }

  const stage = requireString(
    item.additive_phase_stage,
    `${path}.additive_phase_stage`,
  );
  const stageIndex = additivePhaseStageIndex.get(stage);
  if (stageIndex === undefined) {
    fail(`${path}.additive_phase_stage is not allowed: ${stage}`);
  }

  const authorizationGateId = requireString(
    item.authorization_gate,
    `${path}.authorization_gate`,
  );
  const authorizationGate = gateById.get(authorizationGateId);
  if (!authorizationGate) {
    fail(
      `${path}.authorization_gate references unknown gate ${authorizationGateId}`,
    );
  }
  const authorizedThrough = requireString(
    authorizationGate.authorized_through,
    `gate ${authorizationGateId}.authorized_through`,
  );
  const authorizedThroughIndex = additivePhaseStageIndex.get(authorizedThrough);
  if (authorizedThroughIndex === undefined) {
    fail(
      `gate ${authorizationGateId}.authorized_through is not an allowed additive-phase stage: ${authorizedThrough}`,
    );
  }

  const convergenceGateId = requireString(
    item.convergence_gate,
    `${path}.convergence_gate`,
  );
  const convergenceGate = gateById.get(convergenceGateId);
  if (!convergenceGate) {
    fail(
      `${path}.convergence_gate references unknown gate ${convergenceGateId}`,
    );
  }
  if (convergenceGateId === authorizationGateId) {
    fail(
      `${item.id} must use a convergence gate distinct from its authorization gate`,
    );
  }

  if (item.status === "complete" && stage !== "completion") {
    fail(`${item.id} is complete before additive phase stage completion`);
  }
  if (stage === "completion" && item.status !== "complete") {
    fail(
      `${item.id} is at additive phase stage completion but is not complete`,
    );
  }
  if (item.status === "not_started" && stage !== "contract_design") {
    fail(
      `${item.id} is not_started outside additive phase stage contract_design`,
    );
  }
  if (stageIndex > authorizedThroughIndex && item.status !== "blocked") {
    fail(
      `${item.id} cannot be ${item.status} at additive phase stage ${stage}; ` +
        `${authorizationGateId} authorizes only through ${authorizedThrough}`,
    );
  }
}

const durableTerminalSpecifications = [
  {
    id: "K0-LIFECYCLE",
    priority: 120,
    milestone: "K0",
    dependencies: ["H-HANDOFF", "B3-PIPELINE"],
    authorizationGate: "G-K0-LIFECYCLE",
    convergenceGate: "G-K0-S0-CONVERGENCE",
    evidenceCount: 8,
    evidenceSha256:
      "967e759aa3616479a24b60694fe3c9d9996ab35dd8cad13c4becf692e23374ca",
    contract: {
      path: "docs/vision/k0-lifecycle-contract.md",
      version: "1.0.0",
      sha256:
        "30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d",
      freeze_commit: "21bb68fbb9bbd45f470b84de02b037a624efadb4",
    },
    contractReview: {
      path: "docs/vision/reviews/k0-contract-review-2026-09-01.md",
      sha256:
        "cd72507ad36e11ff2a665174307f8be246839ce9a62b6b8f75133677ed5d7d28",
      disposition: "PASS",
    },
    implementation: {
      report_path: "docs/vision/reports/k0-implementation-2026-09-01.md",
      report_sha256:
        "4793c6ea7bf41f0207ad534140f275a4a8c1c33a45d693c147beb509891a6b98",
      audit_path: "docs/vision/reviews/k0-implementation-audit-2026-09-01.md",
      audit_sha256:
        "ceb7f5d4d1d53646f237caf5cef75a8d7eb508d24de9afbc02a8dcc897329cda",
      implementation_commit: "ba6c4b6483f052dd372babb58a1280e6804e0617",
      validated_ledger_commit: "e8e5ce3827fe7f2790bdabd74d85045229d69e84",
    },
  },
  {
    id: "S0-SPATIAL",
    priority: 121,
    milestone: "S0",
    dependencies: ["K0-LIFECYCLE"],
    authorizationGate: "G-S0-SYNTHETIC",
    convergenceGate: "G-K0-S0-CONVERGENCE",
    evidenceCount: 22,
    evidenceSha256:
      "997f3d6f1c781f06fb24d7b2ab812404a04771a5da0a19b75ea94017e3c119e1",
    contract: {
      path: "docs/vision/s0-spatial-contract.md",
      version: "1.0.0",
      sha256:
        "ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888",
      freeze_commit: "383cc13a7e8e30db031f590a1c2d128a35a81b27",
    },
    contractReview: {
      path: "docs/vision/reviews/s0-contract-review-2026-09-01.md",
      sha256:
        "19ac4f2d90185571aaed9d2643755ea294d7b1074b85104b66036b990edc915d",
      disposition: "PASS",
    },
    implementation: {
      report_path: "docs/vision/reports/s0-implementation-2026-09-01.md",
      report_sha256:
        "2b74233e61c55f0a955f18dfebdf43a2b673a2af99beb14dbcac38769ff5f634",
      audit_path: "docs/vision/reviews/s0-implementation-audit-2026-09-01.md",
      audit_sha256:
        "d05901ea5c9c4f651ba53521202413694c875d11179edc8cebaf69d111c1e59e",
      implementation_commit: "a7e4c142975304b45c87848c9dc07e991b5fd078",
      terminal_ledger_commit: "6f04b23a35a3aad7929b93702aaa3d0c31545df8",
    },
  },
];

for (const specification of durableTerminalSpecifications) {
  const item = byId.get(specification.id);
  const path = `work item ${specification.id}`;
  requireExactValue(item.priority, specification.priority, `${path}.priority`);
  requireExactValue(
    item.milestone,
    specification.milestone,
    `${path}.milestone`,
  );
  requireExactValue(item.status, "complete", `${path}.status`);
  requireExactValue(
    item.additive_phase_stage,
    "completion",
    `${path}.additive_phase_stage`,
  );
  requireExactOrderedValues(
    item.dependencies,
    specification.dependencies,
    `${path}.dependencies`,
  );
  requireExactValue(
    item.authorization_gate,
    specification.authorizationGate,
    `${path}.authorization_gate`,
  );
  requireExactValue(
    item.convergence_gate,
    specification.convergenceGate,
    `${path}.convergence_gate`,
  );

  const authorizationGate = gateById.get(specification.authorizationGate);
  requireExactValue(
    authorizationGate.state,
    "approved",
    `gate ${specification.authorizationGate}.state`,
  );
  requireExactValue(
    authorizationGate.authorized_through,
    "completion",
    `gate ${specification.authorizationGate}.authorized_through`,
  );
  requireExactValue(
    gateById.get(specification.convergenceGate).state,
    "closed",
    `gate ${specification.convergenceGate}.state`,
  );

  const lineage = requireExactKeys(
    item.durable_lineage,
    [
      "evidence_prefix",
      "contract",
      "contract_review",
      "implementation",
      "convergence",
    ],
    `${path}.durable_lineage`,
  );
  const evidencePrefix = requireExactKeys(
    lineage.evidence_prefix,
    ["count", "sha256"],
    `${path}.durable_lineage.evidence_prefix`,
  );
  requireExactValue(
    evidencePrefix.count,
    specification.evidenceCount,
    `${path}.durable_lineage.evidence_prefix.count`,
  );
  requireExactValue(
    evidencePrefix.sha256,
    specification.evidenceSha256,
    `${path}.durable_lineage.evidence_prefix.sha256`,
  );
  if (item.evidence.length < specification.evidenceCount) {
    fail(`${path}.evidence removed durable terminal evidence`);
  }
  const actualEvidenceSha256 = sha256Hex(
    Buffer.from(
      JSON.stringify(item.evidence.slice(0, specification.evidenceCount)),
      "utf8",
    ),
  );
  if (actualEvidenceSha256 !== specification.evidenceSha256) {
    fail(`${path}.evidence changed durable terminal evidence`);
  }

  const contract = requireExactKeys(
    lineage.contract,
    ["path", "version", "sha256", "freeze_commit"],
    `${path}.durable_lineage.contract`,
  );
  for (const [key, expected] of Object.entries(specification.contract)) {
    requireExactValue(
      contract[key],
      expected,
      `${path}.durable_lineage.contract.${key}`,
    );
  }
  await requireRepositorySha256(
    contract.path,
    contract.sha256,
    `${path}.durable_lineage.contract`,
  );

  const contractReview = requireExactKeys(
    lineage.contract_review,
    ["path", "sha256", "disposition"],
    `${path}.durable_lineage.contract_review`,
  );
  for (const [key, expected] of Object.entries(specification.contractReview)) {
    requireExactValue(
      contractReview[key],
      expected,
      `${path}.durable_lineage.contract_review.${key}`,
    );
  }
  await requireRepositorySha256(
    contractReview.path,
    contractReview.sha256,
    `${path}.durable_lineage.contract_review`,
  );

  const implementationKeys = Object.keys(specification.implementation);
  const implementation = requireExactKeys(
    lineage.implementation,
    implementationKeys,
    `${path}.durable_lineage.implementation`,
  );
  for (const [key, expected] of Object.entries(specification.implementation)) {
    requireExactValue(
      implementation[key],
      expected,
      `${path}.durable_lineage.implementation.${key}`,
    );
  }
  await requireRepositorySha256(
    implementation.report_path,
    implementation.report_sha256,
    `${path}.durable_lineage.implementation.report`,
  );
  await requireRepositorySha256(
    implementation.audit_path,
    implementation.audit_sha256,
    `${path}.durable_lineage.implementation.audit`,
  );

  const convergence = requireExactKeys(
    lineage.convergence,
    ["gate", "required_state"],
    `${path}.durable_lineage.convergence`,
  );
  requireExactValue(
    convergence.gate,
    specification.convergenceGate,
    `${path}.durable_lineage.convergence.gate`,
  );
  requireExactValue(
    convergence.required_state,
    "closed",
    `${path}.durable_lineage.convergence.required_state`,
  );
}

const o0 = byId.get("O0-ORCHESTRATION");
if (o0) {
  if (completionMembership.get(o0.id) !== "additive_vision_phases") {
    fail("O0-ORCHESTRATION must appear only in additive_vision_phases");
  }
  if (o0.priority !== 122) {
    fail("O0-ORCHESTRATION must have priority 122");
  }
  if (o0.milestone !== "O0") {
    fail("O0-ORCHESTRATION must have milestone O0");
  }
  if (o0.dependencies.length !== 1 || o0.dependencies[0] !== "K0-LIFECYCLE") {
    fail(
      "O0-ORCHESTRATION must depend directly only on K0-LIFECYCLE and not on S0-SPATIAL",
    );
  }
  if (o0.authorization_gate !== "G-O0-SYNTHETIC") {
    fail("O0-ORCHESTRATION must use G-O0-SYNTHETIC for authorization");
  }
  if (o0.convergence_gate !== "G-O0-CONVERGENCE") {
    fail("O0-ORCHESTRATION must use G-O0-CONVERGENCE for convergence");
  }
  requireExactValue(
    gateById.get("G-O0-SYNTHETIC").state,
    "approved",
    "gate G-O0-SYNTHETIC.state",
  );
  requireExactValue(
    gateById.get("G-O0-CONVERGENCE").state,
    "closed",
    "gate G-O0-CONVERGENCE.state",
  );

  const lineage = requireExactKeys(
    o0.durable_lineage,
    [
      "reviewed_predecessor",
      "independent_review",
      "repair_authorization",
      "supersession",
    ],
    "O0-ORCHESTRATION.durable_lineage",
  );
  const predecessor = requireExactKeys(
    lineage.reviewed_predecessor,
    [
      "path",
      "proposed_version",
      "contractCandidateId",
      "byte_length",
      "sha256",
      "git_blob_id",
      "freeze_commit",
      "disposition",
    ],
    "O0-ORCHESTRATION.durable_lineage.reviewed_predecessor",
  );
  const expectedPredecessor = {
    path: "docs/vision/o0-orchestration-contract.md",
    proposed_version: "1.0.0",
    contractCandidateId:
      "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
    byte_length: 59366,
    sha256: "3ea10d753571f08f3e97d5c729d289c3d71e374d5fd91e68bd64c5e3c949f5d6",
    git_blob_id: "28f127fb62b112001fbb49a7a1e57f53fe9d0d2a",
    freeze_commit: "789ece12eb51164abfd3e11b7093644143e3c702",
    disposition: "rejected_material_findings",
  };
  for (const [key, expected] of Object.entries(expectedPredecessor)) {
    requireExactValue(
      predecessor[key],
      expected,
      `O0-ORCHESTRATION.durable_lineage.reviewed_predecessor.${key}`,
    );
  }

  const independentReview = requireExactKeys(
    lineage.independent_review,
    [
      "path",
      "byte_length",
      "sha256",
      "git_blob_id",
      "review_commit",
      "disposition",
    ],
    "O0-ORCHESTRATION.durable_lineage.independent_review",
  );
  const expectedReview = {
    path: "docs/vision/reviews/o0-contract-review-2026-09-01.md",
    byte_length: 24228,
    sha256: "d42f850c1193a05f4608660bee1247acffb7cb99e664375b5fdcb01c0995e375",
    git_blob_id: "a6dbbc48dc89b48d0a384aae4792123a30243adc",
    review_commit: "24633b993535f64e5b8da73265588753f5a95778",
    disposition: "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
  };
  for (const [key, expected] of Object.entries(expectedReview)) {
    requireExactValue(
      independentReview[key],
      expected,
      `O0-ORCHESTRATION.durable_lineage.independent_review.${key}`,
    );
  }
  const reviewBytes = await repositoryBytes(
    independentReview.path,
    "O0 independent review",
  );
  requireExactValue(
    reviewBytes.length,
    independentReview.byte_length,
    "O0 independent review byte_length",
  );
  requireExactValue(
    sha256Hex(reviewBytes),
    independentReview.sha256,
    "O0 independent review sha256",
  );

  const repairAuthorization = requireExactKeys(
    lineage.repair_authorization,
    [
      "accepted_disposition_only",
      "authorized_findings",
      "contract_accepted",
      "implementation_authorized",
      "convergence_authorized",
    ],
    "O0-ORCHESTRATION.durable_lineage.repair_authorization",
  );
  requireExactValue(
    repairAuthorization.accepted_disposition_only,
    "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
    "O0 repair authorization accepted_disposition_only",
  );
  requireExactValue(
    repairAuthorization.authorized_findings,
    "O0-R01..O0-R15,O0-G01..O0-G03",
    "O0 repair authorization authorized_findings",
  );
  for (const key of [
    "contract_accepted",
    "implementation_authorized",
    "convergence_authorized",
  ]) {
    requireExactValue(
      repairAuthorization[key],
      false,
      `O0 repair authorization ${key}`,
    );
  }

  const candidate = requireExactKeys(
    o0.contract_candidate,
    [
      "path",
      "proposed_version",
      "contractCandidateId",
      "byte_length",
      "sha256",
      "git_blob_id",
      "id_derivation",
      "predecessor_contractCandidateId",
      "state",
    ],
    "O0-ORCHESTRATION.contract_candidate",
  );
  requireExactValue(
    candidate.path,
    "docs/vision/o0-orchestration-contract.md",
    "O0-ORCHESTRATION.contract_candidate.path",
  );
  requireExactValue(
    candidate.proposed_version,
    "1.0.0",
    "O0-ORCHESTRATION.contract_candidate.proposed_version",
  );
  requireExactValue(
    candidate.predecessor_contractCandidateId,
    predecessor.contractCandidateId,
    "O0-ORCHESTRATION.contract_candidate.predecessor_contractCandidateId",
  );
  requireExactValue(
    candidate.state,
    "byte_sealed_independent_review_required",
    "O0-ORCHESTRATION.contract_candidate.state",
  );

  const contractBytes = await repositoryBytes(
    candidate.path,
    "O0 active contract candidate",
  );
  const contractSha256 = sha256Hex(contractBytes);
  const gitBlobId = createHash("sha1")
    .update(Buffer.from(`blob ${contractBytes.length}\0`, "utf8"))
    .update(contractBytes)
    .digest("hex");
  const candidatePreimage = Buffer.concat([
    Buffer.from("policy-sentinel:o0-contract-candidate:v1\n", "utf8"),
    Buffer.from("proposed-version:1.0.0\n", "utf8"),
    Buffer.from(`byte-length:${contractBytes.length}\n`, "utf8"),
    contractBytes,
  ]);
  const contractCandidateId =
    "o0-contract-candidate:1.0.0:sha256:" + sha256Hex(candidatePreimage);
  const expectedIdDerivation =
    'SHA-256 of UTF8("policy-sentinel:o0-contract-candidate:v1\\n") + ' +
    'UTF8("proposed-version:1.0.0\\n") + ' +
    `UTF8("byte-length:${contractBytes.length}\\n") + the exact ` +
    `${contractBytes.length} LF/no-BOM contract bytes.`;
  requireExactValue(
    candidate.byte_length,
    contractBytes.length,
    "O0-ORCHESTRATION.contract_candidate.byte_length",
  );
  requireExactValue(
    candidate.sha256,
    contractSha256,
    "O0-ORCHESTRATION.contract_candidate.sha256",
  );
  requireExactValue(
    candidate.git_blob_id,
    gitBlobId,
    "O0-ORCHESTRATION.contract_candidate.git_blob_id",
  );
  requireExactValue(
    candidate.contractCandidateId,
    contractCandidateId,
    "O0-ORCHESTRATION.contract_candidate.contractCandidateId",
  );
  requireExactValue(
    candidate.id_derivation,
    expectedIdDerivation,
    "O0-ORCHESTRATION.contract_candidate.id_derivation",
  );
  if (
    candidate.contractCandidateId === predecessor.contractCandidateId ||
    candidate.sha256 === predecessor.sha256 ||
    candidate.git_blob_id === predecessor.git_blob_id
  ) {
    fail("O0 successor candidate must not reuse rejected candidate identity");
  }

  const supersession = requireExactKeys(
    lineage.supersession,
    [
      "predecessor_contractCandidateId",
      "successor_contractCandidateId",
      "relationship",
    ],
    "O0-ORCHESTRATION.durable_lineage.supersession",
  );
  requireExactValue(
    supersession.predecessor_contractCandidateId,
    predecessor.contractCandidateId,
    "O0 supersession predecessor",
  );
  requireExactValue(
    supersession.successor_contractCandidateId,
    candidate.contractCandidateId,
    "O0 supersession successor",
  );
  requireExactValue(
    supersession.relationship,
    "supersedes_rejected_candidate_for_independent_review",
    "O0 supersession relationship",
  );

  const contractReview = requireExactKeys(
    o0.contract_review,
    [
      "state",
      "reviewed_predecessor_candidate_id",
      "predecessor_review_artifact",
      "predecessor_review_artifact_sha256",
      "predecessor_disposition",
      "active_candidate_id",
      "active_review_artifact",
      "active_review_disposition",
    ],
    "O0-ORCHESTRATION.contract_review",
  );
  requireExactValue(
    contractReview.state,
    "awaiting_independent_review",
    "O0-ORCHESTRATION.contract_review.state",
  );
  requireExactValue(
    contractReview.reviewed_predecessor_candidate_id,
    predecessor.contractCandidateId,
    "O0 reviewed predecessor candidate",
  );
  requireExactValue(
    contractReview.predecessor_review_artifact,
    independentReview.path,
    "O0 predecessor review artifact",
  );
  requireExactValue(
    contractReview.predecessor_review_artifact_sha256,
    independentReview.sha256,
    "O0 predecessor review artifact SHA-256",
  );
  requireExactValue(
    contractReview.predecessor_disposition,
    independentReview.disposition,
    "O0 predecessor review disposition",
  );
  requireExactValue(
    contractReview.active_candidate_id,
    candidate.contractCandidateId,
    "O0 active candidate review binding",
  );
  requireExactValue(
    contractReview.active_review_artifact,
    null,
    "O0 active review artifact",
  );
  requireExactValue(
    contractReview.active_review_disposition,
    null,
    "O0 active review disposition",
  );
  requireExactValue(o0.accepted_contract, null, "O0 accepted_contract");
  requireExactValue(
    o0.implementation_authorization,
    null,
    "O0 implementation_authorization",
  );
}

for (const item of workItems) {
  if (additiveVisionPhaseIds.has(item.id)) {
    continue;
  }

  const convergenceAuthorizingStates = new Set(["approved", "satisfied"]);
  const dependencyPathToNonconvergedAdditive = (id, path = [item.id]) => {
    const dependency = byId.get(id);
    const nextPath = [...path, id];
    if (
      additiveVisionPhaseIds.has(id) &&
      !convergenceAuthorizingStates.has(
        gateById.get(dependency.convergence_gate)?.state,
      )
    ) {
      return nextPath;
    }
    for (const nestedDependency of dependency.dependencies) {
      const found = dependencyPathToNonconvergedAdditive(
        nestedDependency,
        nextPath,
      );
      if (found) {
        return found;
      }
    }
    return null;
  };

  for (const dependency of item.dependencies) {
    const path = dependencyPathToNonconvergedAdditive(dependency);
    if (path) {
      const relationship = path.length === 2 ? "direct" : "transitive";
      fail(
        `${item.id} has a ${relationship} dependency on additive work behind ` +
          `a non-authorizing convergence gate: ${path.join(" -> ")}`,
      );
    }
  }
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
const pnwFinish = requireObject(
  roadmap.finish_states.pnw_regional_engine,
  "finish_states.pnw_regional_engine",
);
const localRealSourcePrereleaseFinish =
  localRealSourcePrereleaseScope === null
    ? null
    : requireObject(
        roadmap.finish_states.local_real_source_prerelease,
        "finish_states.local_real_source_prerelease",
      );
const repositoryBackboneFinish = requireObject(
  roadmap.finish_states.repository_backbone,
  "finish_states.repository_backbone",
);
if (!allowedFinishStates.has(repositoryBackboneFinish.current_state)) {
  fail(
    "finish_states.repository_backbone.current_state is not an allowed finish state",
  );
}
requireUniqueStrings(
  repositoryBackboneFinish.satisfied_when,
  "finish_states.repository_backbone.satisfied_when",
);
requireUniqueStrings(
  repositoryBackboneFinish.does_not_mean,
  "finish_states.repository_backbone.does_not_mean",
);
const expectedRepositoryBackboneFinish = new Map([
  ["complete", "complete"],
  ["in_progress", "in_progress"],
  ["ready", "not_started"],
  ["not_started", "not_started"],
  ["blocked", "blocked"],
  ["deferred", "blocked"],
]).get(repositoryBackboneItem.status);
if (
  repositoryBackboneFinish.current_state !== expectedRepositoryBackboneFinish
) {
  fail(
    "repository backbone finish state must match H-REPOSITORY-BACKBONE status",
  );
}
if (!allowedFinishStates.has(pnwFinish.current_state)) {
  fail(
    `finish_states.pnw_regional_engine.current_state is not allowed: ${pnwFinish.current_state}`,
  );
}
const pnwRequiredOutcomeIds = new Set(pnwRequiredOutcomes);
const localRealSourcePrereleaseOutcomeIds = new Set(
  localRealSourcePrereleaseOutcomes,
);
if (
  localRealSourcePrereleaseFinish !== null &&
  !allowedFinishStates.has(localRealSourcePrereleaseFinish.current_state)
) {
  fail(
    "finish_states.local_real_source_prerelease.current_state is not allowed",
  );
}
if (localRealSourcePrereleaseFinish !== null) {
  requireUniqueStrings(
    localRealSourcePrereleaseFinish.satisfied_when,
    "finish_states.local_real_source_prerelease.satisfied_when",
  );
  requireUniqueStrings(
    localRealSourcePrereleaseFinish.does_not_mean,
    "finish_states.local_real_source_prerelease.does_not_mean",
  );
}
const inProgress = workItems.filter((item) => item.status === "in_progress");
const isTerminal = ["complete", "blocked"].includes(localFinish.current_state);
let terminalRequiredRoots = [];
let terminalPnwRoots = [];
let terminalLocalRealSourcePrereleaseRoots = [];
// A required outcome may be evidence-blocked while independent ready work
// continues. The terminal-complete check below still requires every required
// outcome to be complete, so an active blocker cannot weaken release
// acceptance or be mistaken for an accepted source gap.
if (inProgress.length > 1) {
  fail(
    `global current focus permits at most one in_progress item; found ${inProgress.length}`,
  );
}
if (inProgress.length === 1) {
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
} else if (roadmap.current_focus.work_item !== null) {
  fail("zero in_progress items require current_focus.work_item: null");
}

if (isTerminal) {
  const disallowedTerminalInProgress = inProgress.filter(
    (item) =>
      !additiveVisionPhaseIds.has(item.id) &&
      !(
        pnwFinish.current_state === "in_progress" &&
        pnwRequiredOutcomeIds.has(item.id)
      ) &&
      !(
        repositoryBackboneFinish.current_state === "in_progress" &&
        repositoryBackboneOutcomeIds.has(item.id)
      ) &&
      !(
        localRealSourcePrereleaseFinish?.current_state === "in_progress" &&
        localRealSourcePrereleaseOutcomeIds.has(item.id)
      ),
  );
  if (disallowedTerminalInProgress.length !== 0) {
    fail(
      "terminal local finish state permits only optional additive in_progress " +
        "work, in_progress repository-backbone work, or in_progress work in " +
        "the separately active PNW scope; found " +
        "disallowed in_progress items: " +
        disallowedTerminalInProgress.map((item) => item.id).join(", "),
    );
  }
  if (inProgress.length === 0) {
    requireString(
      roadmap.current_focus.terminal_reason,
      "current_focus.terminal_reason",
    );
  } else if (roadmap.current_focus.terminal_reason !== null) {
    fail(
      "an active additive, repository-backbone, or PNW current focus requires current_focus.terminal_reason: null",
    );
  }
} else {
  if (inProgress.length !== 1) {
    fail(
      `active local finish state requires exactly one in_progress item; found ${inProgress.length}`,
    );
  }
  if (additiveVisionPhaseIds.has(inProgress[0].id)) {
    fail(
      "active local finish state requires its in_progress item to be non-additive",
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
const collectIncompleteOutcomeRoots = (outcomeIds) => {
  const roots = new Set();
  const collect = (id) => {
    const item = byId.get(id);
    if (item.status === "complete") {
      return;
    }
    const incompleteDependencies = item.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (item.status === "blocked" || incompleteDependencies.length === 0) {
      roots.add(id);
      return;
    }
    for (const dependency of incompleteDependencies) {
      collect(dependency);
    }
  };
  for (const id of outcomeIds) {
    collect(id);
  }
  return [...roots].sort(
    (left, right) => byId.get(left).priority - byId.get(right).priority,
  );
};

const protectedReleaseRoots = [
  "B2-REVIEW",
  "B4-FR-UX",
  "B5-WA-LWS-ADAPTER",
  "B5-WA-RULES",
];
if (localFinish.current_state === "blocked") {
  const localFinishBlockers = requireUniqueStrings(
    localFinish.blocked_by,
    "finish_states.local_release_candidate.blocked_by",
  );
  if (!hasExactOrderedValues(localFinishBlockers, protectedReleaseRoots)) {
    fail(
      "local release blockers must preserve the exact protected roots in order: " +
        protectedReleaseRoots.join(", "),
    );
  }
  terminalRequiredRoots = collectIncompleteOutcomeRoots(requiredOutcomes);
  const incompleteRequiredRoots = new Set(terminalRequiredRoots);
  if (!hasExactOrderedValues(terminalRequiredRoots, protectedReleaseRoots)) {
    fail(
      "incomplete required-outcome roots must preserve the exact protected " +
        `release roots in order: ${protectedReleaseRoots.join(", ")}`,
    );
  }
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
  if (inProgress.length === 0 || !pnwRequiredOutcomeIds.has(inProgress[0].id)) {
    const currentFocusRoots = requireUniqueStrings(
      roadmap.current_focus.resumable_roots,
      "current_focus.resumable_roots",
    );
    if (!hasExactOrderedValues(currentFocusRoots, protectedReleaseRoots)) {
      fail(
        "current focus must preserve the exact protected release roots in " +
          `order: ${protectedReleaseRoots.join(", ")}`,
      );
    }
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
  }
  const nonAdditiveReadyItems = workItems
    .filter(
      (item) =>
        item.status === "ready" &&
        !additiveVisionPhases.includes(item.id) &&
        !pnwRequiredOutcomeIds.has(item.id) &&
        !localRealSourcePrereleaseOutcomeIds.has(item.id),
    )
    .map((item) => item.id);
  if (nonAdditiveReadyItems.length > 0) {
    fail(
      "local release candidate cannot be terminal-blocked while non-additive " +
        `ready work remains: ${nonAdditiveReadyItems.join(", ")}`,
    );
  }
}

if (pnwFinish.current_state === "complete") {
  const incompletePnwOutcomes = pnwRequiredOutcomes.filter(
    (id) => byId.get(id).status !== "complete",
  );
  if (incompletePnwOutcomes.length > 0) {
    fail(
      "PNW regional engine is complete with incomplete required outcomes: " +
        incompletePnwOutcomes.join(", "),
    );
  }
}
if (localRealSourcePrereleaseFinish?.current_state === "in_progress") {
  const activeLocalPrereleaseItems = inProgress.filter((item) =>
    localRealSourcePrereleaseOutcomeIds.has(item.id),
  );
  if (activeLocalPrereleaseItems.length !== 1 || inProgress.length !== 1) {
    fail(
      "active local real-source prerelease requires exactly one child in_progress item",
    );
  }
  terminalLocalRealSourcePrereleaseRoots = collectIncompleteOutcomeRoots(
    localRealSourcePrereleaseOutcomes,
  );
}
if (localRealSourcePrereleaseFinish?.current_state === "complete") {
  const incomplete = localRealSourcePrereleaseOutcomes.filter(
    (id) => byId.get(id).status !== "complete",
  );
  if (incomplete.length > 0) {
    fail(
      "local real-source prerelease is complete with incomplete outcomes: " +
        incomplete.join(", "),
    );
  }
  if (gateById.get("G-PNW-05-FR-TIER1-QUALIFICATION")?.state !== "satisfied") {
    fail(
      "local real-source prerelease is complete without Tier-1 qualification",
    );
  }
  if (gateById.get("G-PNW-05-FR-LOCAL-ACTIVATION")?.state !== "satisfied") {
    fail(
      "local real-source prerelease is complete without scoped local activation",
    );
  }
}
if (localRealSourcePrereleaseFinish?.current_state === "blocked") {
  const active = workItems.filter(
    (item) =>
      localRealSourcePrereleaseOutcomeIds.has(item.id) &&
      ["ready", "in_progress"].includes(item.status),
  );
  if (active.length > 0) {
    fail(
      "blocked local real-source prerelease cannot retain ready or in_progress children: " +
        active.map((item) => item.id).join(", "),
    );
  }
  requireUniqueStrings(
    localRealSourcePrereleaseFinish.blocked_by,
    "finish_states.local_real_source_prerelease.blocked_by",
  );
}
if (
  repositoryBackboneFinish.current_state === "in_progress" &&
  (inProgress.length !== 1 ||
    !repositoryBackboneOutcomeIds.has(inProgress[0].id))
) {
  fail(
    "active repository backbone finish state requires exactly its one in_progress item",
  );
}
if (pnwFinish.current_state === "in_progress") {
  const activePnwItems = inProgress.filter((item) =>
    pnwRequiredOutcomeIds.has(item.id),
  );
  const readyPnwItems = workItems.filter(
    (item) => pnwRequiredOutcomeIds.has(item.id) && item.status === "ready",
  );
  if (activePnwItems.length === 1) {
    if (inProgress.length !== 1) {
      fail(
        "active PNW regional finish state cannot run beside another in_progress item",
      );
    }
  } else if (
    activePnwItems.length === 0 &&
    (inProgress.length === 0 ||
      (inProgress.length === 1 &&
        (localRealSourcePrereleaseOutcomeIds.has(inProgress[0].id) ||
          repositoryBackboneOutcomeIds.has(inProgress[0].id)))) &&
    readyPnwItems.length > 0
  ) {
    // A bounded PNW tranche may end with newly dependency-ready successors
    // while exact authority for the next tranche remains outside the run.
    // Preserve those roots in next_actions without pretending another item is
    // already active.
    terminalPnwRoots = collectIncompleteOutcomeRoots(pnwRequiredOutcomes);
  } else {
    fail(
      "in-progress PNW regional finish state requires exactly one PNW in_progress item or a terminal checkpoint with zero in_progress and at least one ready PNW item",
    );
  }
}
if (pnwFinish.current_state === "blocked") {
  const activePnwItems = workItems.filter(
    (item) =>
      pnwRequiredOutcomeIds.has(item.id) &&
      ["in_progress", "ready"].includes(item.status),
  );
  if (activePnwItems.length > 0) {
    fail(
      "blocked PNW regional finish state cannot retain ready or in_progress " +
        `items: ${activePnwItems.map((item) => item.id).join(", ")}`,
    );
  }
  terminalPnwRoots = collectIncompleteOutcomeRoots(pnwRequiredOutcomes);
  const nonBlockedPnwRoots = terminalPnwRoots.filter(
    (id) => byId.get(id).status !== "blocked",
  );
  if (nonBlockedPnwRoots.length > 0) {
    fail(
      "blocked PNW regional finish state has non-blocked incomplete roots: " +
        nonBlockedPnwRoots.join(", "),
    );
  }
  const pnwFinishBlockers = requireUniqueStrings(
    pnwFinish.blocked_by,
    "finish_states.pnw_regional_engine.blocked_by",
  );
  if (!hasExactOrderedValues(pnwFinishBlockers, terminalPnwRoots)) {
    fail(
      "PNW regional finish blockers must exactly match incomplete PNW roots in " +
        `priority order: ${terminalPnwRoots.join(", ")}`,
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
    pnwFinish.current_state !== "complete" ||
    byId.get("RELEASE-PUBLISH")?.status !== "complete")
) {
  fail(
    "public beta is complete without complete legacy and PNW local scopes plus the publication work item",
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
const terminalActionRoots = [
  ...new Set([
    ...terminalRequiredRoots,
    ...terminalPnwRoots,
    ...terminalLocalRealSourcePrereleaseRoots,
  ]),
].sort((left, right) => byId.get(left).priority - byId.get(right).priority);
if (terminalActionRoots.length > 0) {
  const nextActionIds = nextActions.map((action) => action.work_item);
  const hasExactOrderedRoots =
    nextActionIds.length === terminalActionRoots.length &&
    nextActionIds.every((id, index) => id === terminalActionRoots[index]);
  if (!hasExactOrderedRoots) {
    const nextActionSet = new Set(nextActionIds);
    const omittedActionRoots = terminalActionRoots.filter(
      (id) => !nextActionSet.has(id),
    );
    const expectedRootSet = new Set(terminalActionRoots);
    const unexpectedActions = nextActionIds.filter(
      (id) => !expectedRootSet.has(id),
    );
    fail(
      "terminal next actions must list each incomplete completion-scope root " +
        `exactly once in priority order; missing: ${omittedActionRoots.join(", ") || "none"}; ` +
        `unexpected: ${unexpectedActions.join(", ") || "none"}; expected order: ${terminalActionRoots.join(", ")}`,
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
