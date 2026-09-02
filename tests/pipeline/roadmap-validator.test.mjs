import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const validatorPath = path.resolve(projectRoot, "scripts/validate-roadmap.mjs");
const protectedReleaseRoots = [
  "B2-REVIEW",
  "B4-FR-UX",
  "B5-WA-LWS-ADAPTER",
  "B5-WA-RULES",
];
const additiveStages = [
  "contract_design",
  "contract_freeze",
  "contract_review",
  "implementation",
  "implementation_review",
  "completion",
];

const blockedWorkItem = (id, priority) => ({
  id,
  priority,
  milestone: "TEST",
  title: id,
  status: "blocked",
  dependencies: [],
  blocked_by: ["X-CLOSED"],
  safe_fallback: "Remain unavailable.",
  unblocks_only_when: "Synthetic evidence is supplied.",
  acceptance: ["The synthetic blocked state remains explicit."],
  evidence: ["Synthetic roadmap-validator fixture."],
});

const makeRoadmap = ({
  status = "blocked",
  stage = "contract_design",
  authorizedThrough = "contract_freeze",
  releaseState = "blocked",
  authorizationState = status === "blocked" && stage === "contract_design"
    ? "closed"
    : "approved",
} = {}) => {
  const releaseRoots =
    releaseState === "blocked" ? [...protectedReleaseRoots] : [];
  const nextActionIds =
    releaseState === "blocked"
      ? [...protectedReleaseRoots]
      : ["RELEASE-PUBLISH"];
  const o0 = {
    id: "O0-ORCHESTRATION",
    priority: 122,
    milestone: "O0",
    title: "Synthetic additive orchestration fixture",
    status,
    additive_phase_stage: stage,
    dependencies: ["K0-LIFECYCLE"],
    authorization_gate: "G-O0-SYNTHETIC",
    convergence_gate: "G-O0-CONVERGENCE",
    acceptance: [
      "The additive phase remains isolated from release accounting.",
    ],
    evidence: ["Synthetic roadmap-validator fixture."],
  };
  if (status === "blocked") {
    Object.assign(o0, {
      blocked_by: ["G-O0-SYNTHETIC"],
      safe_fallback: "Keep the additive phase isolated.",
      unblocks_only_when: "The exact next stage is authorized.",
    });
  }

  const o0AuthorizationGate = {
    id: "G-O0-SYNTHETIC",
    name: "Synthetic O0 authorization",
    state: authorizationState,
    authorized_through: authorizedThrough,
  };
  if (authorizationState === "approved") {
    o0AuthorizationGate.approved_scope = ["Synthetic contract work only."];
    o0AuthorizationGate.evidence = ["Synthetic owner authorization."];
  }

  const requiredWorkItems = protectedReleaseRoots.map((id, index) =>
    blockedWorkItem(id, (index + 1) * 10),
  );
  if (releaseState === "complete") {
    for (const item of requiredWorkItems) {
      item.status = "complete";
      delete item.blocked_by;
      delete item.safe_fallback;
      delete item.unblocks_only_when;
    }
  }
  const releaseGate = (id, name) =>
    releaseState === "complete"
      ? {
          id,
          name,
          state: "satisfied",
          evidence: ["Synthetic release completion evidence."],
        }
      : { id, name, state: "closed" };

  return {
    schema_version: "test",
    roadmap_id: "policy-sentinel-test",
    project: { name: "Policy Sentinel validator fixture" },
    canonical_ledger: {
      allowed_work_item_statuses: [
        "complete",
        "in_progress",
        "ready",
        "blocked",
        "deferred",
        "not_started",
      ],
      allowed_gate_states: [
        "approved",
        "closed",
        "pending_evidence",
        "satisfied",
      ],
      allowed_finish_states: [
        "not_started",
        "in_progress",
        "complete",
        "blocked",
      ],
      allowed_additive_phase_stages: additiveStages,
    },
    authority: {
      external_boundaries: [
        {
          id: "X-CLOSED",
          state: "closed",
          prohibits: "External activity.",
          unblocks_only_when: "The owner supplies exact authority.",
        },
      ],
    },
    baseline: {},
    current_focus: {
      work_item: status === "in_progress" ? "O0-ORCHESTRATION" : null,
      terminal_reason:
        status === "in_progress"
          ? null
          : "The local release remains evidence-blocked.",
      resumable_roots: [...releaseRoots],
    },
    gates: [
      releaseGate("G-RC", "Release candidate"),
      releaseGate("G-J", "Owner go/no-go"),
      {
        id: "G-K0-LIFECYCLE",
        name: "Synthetic K0 authorization",
        state: "approved",
        authorized_through: "completion",
        approved_scope: ["Synthetic K0 fixture."],
        evidence: ["Synthetic prior authorization."],
      },
      {
        id: "G-K0-S0-CONVERGENCE",
        name: "Synthetic K0 convergence",
        state: "closed",
      },
      o0AuthorizationGate,
      {
        id: "G-O0-CONVERGENCE",
        name: "Synthetic O0 convergence",
        state: "closed",
      },
    ],
    binding_documents: [
      { path: "AGENTS.md", role: "Existing local fixture path." },
    ],
    work_items: [
      ...requiredWorkItems,
      blockedWorkItem("SOURCE-GAP", 50),
      {
        ...blockedWorkItem("RELEASE-PUBLISH", 100),
        milestone: "RELEASE",
      },
      {
        id: "K0-LIFECYCLE",
        priority: 120,
        milestone: "K0",
        title: "Synthetic completed additive prerequisite",
        status: "complete",
        additive_phase_stage: "completion",
        dependencies: [],
        authorization_gate: "G-K0-LIFECYCLE",
        convergence_gate: "G-K0-S0-CONVERGENCE",
        acceptance: ["The synthetic prerequisite is complete."],
        evidence: ["Synthetic completion evidence."],
      },
      o0,
    ],
    completion_scope: {
      local_release_candidate: {
        required_outcomes: [...protectedReleaseRoots],
        accepted_source_blocks: ["SOURCE-GAP"],
        publication_only: ["RELEASE-PUBLISH"],
        additive_vision_phases: ["K0-LIFECYCLE", "O0-ORCHESTRATION"],
      },
    },
    finish_states: {
      local_release_candidate: {
        current_state: releaseState,
        blocked_by: [...releaseRoots],
      },
      public_beta: { current_state: "blocked" },
    },
    source_register: [
      {
        id: "SYNTHETIC-SOURCE",
        source: "Synthetic source",
        implementation_state: "unavailable",
        public_claim: "None.",
        work_items: ["SOURCE-GAP"],
      },
    ],
    next_actions: nextActionIds.map((workItem, index) => ({
      order: index + 1,
      work_item: workItem,
      action: `Resolve ${workItem}.`,
    })),
  };
};

test("additive stage governance cannot affect protected release accounting", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  const validateCandidate = async (name, candidate) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, stringify(candidate), "utf8");
    return spawnSync(process.execPath, [validatorPath, fixturePath], {
      cwd: projectRoot,
      encoding: "utf8",
    });
  };
  const expectValid = async (
    name,
    candidate,
    expectedReleaseState = "blocked",
  ) => {
    const result = await validateCandidate(name, candidate);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(
      candidate.finish_states.local_release_candidate.current_state,
      expectedReleaseState,
    );
    assert.deepEqual(
      candidate.finish_states.local_release_candidate.blocked_by,
      expectedReleaseState === "blocked" ? protectedReleaseRoots : [],
    );
    assert.deepEqual(
      candidate.current_focus.resumable_roots,
      expectedReleaseState === "blocked" ? protectedReleaseRoots : [],
    );
    assert.deepEqual(
      candidate.next_actions.map((action) => action.work_item),
      expectedReleaseState === "blocked"
        ? protectedReleaseRoots
        : ["RELEASE-PUBLISH"],
    );
  };
  const expectInvalid = async (name, candidate, expectedMessage) => {
    const result = await validateCandidate(name, candidate);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedMessage);
  };

  const states = [
    ["blocked", makeRoadmap()],
    ["ready", makeRoadmap({ status: "ready" })],
    ["in-progress", makeRoadmap({ status: "in_progress" })],
    [
      "review-blocked",
      makeRoadmap({ status: "blocked", stage: "contract_review" }),
    ],
    [
      "implementation-blocked",
      makeRoadmap({ status: "blocked", stage: "implementation" }),
    ],
    [
      "complete",
      makeRoadmap({
        status: "complete",
        stage: "completion",
        authorizedThrough: "completion",
      }),
    ],
  ];
  for (const [name, candidate] of states) {
    await expectValid(name, candidate);
  }

  for (const [name, candidate] of states) {
    const o0 = candidate.work_items.find(
      (item) => item.id === "O0-ORCHESTRATION",
    );
    const completeReleaseCandidate = makeRoadmap({
      status: o0.status,
      stage: o0.additive_phase_stage,
      authorizedThrough:
        o0.status === "complete" ? "completion" : "contract_freeze",
      releaseState: "complete",
      authorizationState: candidate.gates.find(
        (gate) => gate.id === "G-O0-SYNTHETIC",
      ).state,
    });
    await expectValid(
      `complete-release-${name}`,
      completeReleaseCandidate,
      "complete",
    );
  }

  const wrongStageVocabulary = makeRoadmap();
  wrongStageVocabulary.canonical_ledger.allowed_additive_phase_stages = [
    ...additiveStages,
  ].reverse();
  await expectInvalid(
    "wrong-stage-vocabulary",
    wrongStageVocabulary,
    /ordered durable stage contract/,
  );

  const missingAuthorizationCeiling = makeRoadmap({ status: "ready" });
  delete missingAuthorizationCeiling.gates.find(
    (gate) => gate.id === "G-O0-SYNTHETIC",
  ).authorized_through;
  await expectInvalid(
    "missing-authorization-ceiling",
    missingAuthorizationCeiling,
    /G-O0-SYNTHETIC\.authorized_through must be a non-empty string/,
  );

  const unrecordedAuthorizationBlock = makeRoadmap();
  unrecordedAuthorizationBlock.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).blocked_by = ["X-CLOSED"];
  await expectInvalid(
    "unrecorded-authorization-block",
    unrecordedAuthorizationBlock,
    /authorization_gate is absent from blocked_by/,
  );

  await expectInvalid(
    "ready-beyond-authorization",
    makeRoadmap({ status: "ready", stage: "contract_review" }),
    /authorizes only through contract_freeze/,
  );

  const wrongCompletionStage = makeRoadmap({
    status: "complete",
    stage: "implementation_review",
    authorizedThrough: "completion",
  });
  await expectInvalid(
    "wrong-completion-stage",
    wrongCompletionStage,
    /complete before additive phase stage completion/,
  );

  const sameGate = makeRoadmap({ status: "ready" });
  sameGate.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).convergence_gate = "G-O0-SYNTHETIC";
  await expectInvalid(
    "same-authorization-and-convergence-gate",
    sameGate,
    /convergence gate distinct from its authorization gate/,
  );

  const missingConvergenceGate = makeRoadmap({ status: "ready" });
  delete missingConvergenceGate.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).convergence_gate;
  await expectInvalid(
    "missing-convergence-gate",
    missingConvergenceGate,
    /convergence_gate must be a non-empty string/,
  );

  const removedAdditive = makeRoadmap({ status: "ready" });
  removedAdditive.completion_scope.local_release_candidate.additive_vision_phases =
    ["O0-ORCHESTRATION"];
  removedAdditive.completion_scope.local_release_candidate.publication_only.push(
    "K0-LIFECYCLE",
  );
  const removedK0 = removedAdditive.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  );
  delete removedK0.additive_phase_stage;
  delete removedK0.convergence_gate;
  await expectInvalid(
    "removed-additive-accounting",
    removedAdditive,
    /K0-LIFECYCLE must remain classified only in additive_vision_phases/,
  );

  const duplicateCompletionGroup = makeRoadmap({ status: "ready" });
  duplicateCompletionGroup.completion_scope.local_release_candidate.publication_only.push(
    "O0-ORCHESTRATION",
  );
  await expectInvalid(
    "duplicate-completion-group",
    duplicateCompletionGroup,
    /appears in both completion scope/,
  );

  const directConvergence = makeRoadmap({ status: "ready" });
  directConvergence.work_items.find(
    (item) => item.id === "RELEASE-PUBLISH",
  ).dependencies = ["O0-ORCHESTRATION"];
  await expectInvalid(
    "direct-closed-convergence-dependency",
    directConvergence,
    /RELEASE-PUBLISH has a direct dependency.*RELEASE-PUBLISH -> O0-ORCHESTRATION/,
  );

  const transitiveConvergence = makeRoadmap({ status: "ready" });
  transitiveConvergence.work_items.find(
    (item) => item.id === "RELEASE-PUBLISH",
  ).dependencies = ["NONADDITIVE-BRIDGE"];
  transitiveConvergence.work_items.push({
    ...blockedWorkItem("NONADDITIVE-BRIDGE", 130),
    dependencies: ["O0-ORCHESTRATION"],
  });
  transitiveConvergence.completion_scope.local_release_candidate.publication_only.push(
    "NONADDITIVE-BRIDGE",
  );
  await expectInvalid(
    "transitive-closed-convergence-dependency",
    transitiveConvergence,
    /RELEASE-PUBLISH has a transitive dependency.*RELEASE-PUBLISH -> NONADDITIVE-BRIDGE -> O0-ORCHESTRATION/,
  );

  const changedReleaseRoot = makeRoadmap({ status: "ready" });
  changedReleaseRoot.finish_states.local_release_candidate.blocked_by.pop();
  await expectInvalid(
    "changed-protected-release-roots",
    changedReleaseRoot,
    /exact protected roots in order/,
  );

  const nonAdditiveProgress = makeRoadmap({ status: "ready" });
  nonAdditiveProgress.work_items.find(
    (item) => item.id === "SOURCE-GAP",
  ).status = "in_progress";
  nonAdditiveProgress.current_focus.work_item = "SOURCE-GAP";
  nonAdditiveProgress.current_focus.terminal_reason = null;
  await expectInvalid(
    "terminal-nonadditive-progress",
    nonAdditiveProgress,
    /permits only optional additive in_progress work/,
  );

  const activeReleaseWithAdditiveFocus = makeRoadmap({ status: "in_progress" });
  activeReleaseWithAdditiveFocus.finish_states.local_release_candidate.current_state =
    "in_progress";
  await expectInvalid(
    "active-release-additive-focus",
    activeReleaseWithAdditiveFocus,
    /requires its in_progress item to be non-additive/,
  );
});
