import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const validatorPath = path.resolve(projectRoot, "scripts/validate-roadmap.mjs");
const liveRoadmap = parse(
  await readFile(path.resolve(projectRoot, "ROADMAP.yaml"), "utf8"),
);
const liveWorkItem = (id) =>
  liveRoadmap.work_items.find((item) => item.id === id);
const protectedReleaseRoots = [
  "B2-REVIEW",
  "B4-FR-UX",
  "B5-WA-LWS-ADAPTER",
  "B5-WA-RULES",
];
const protectedPnwRoots = ["PNW-01-ENGINE-SEAMS", "PNW-02-REGIONAL-REGISTRY"];
const additiveStages = [
  "contract_design",
  "contract_freeze",
  "contract_review",
  "implementation",
  "implementation_review",
  "completion",
];
const localRealSourcePrereleaseOutcomes = [
  "PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT",
  "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION",
  "PNW-06-FEDERAL-REGISTER-BOUNDED-REFRESH-LKG",
  "PNW-07-GENERAL-JURISDICTION-ANALYZED-CORPUS-PROJECTION",
  "PNW-08-LOCAL-REAL-SOURCE-APPLICATION-PRERELEASE",
  "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY",
];

test("live roadmap isolates the local real-source prerelease child lane", () => {
  assert.deepEqual(
    liveRoadmap.completion_scope.local_real_source_prerelease.required_outcomes,
    localRealSourcePrereleaseOutcomes,
  );
  assert.equal(
    liveRoadmap.gates.find(({ id }) => id === "G-PNW-05-REAL-SOURCE-PRERELEASE")
      ?.state,
    "approved",
  );
  assert.equal(
    liveRoadmap.gates.find(({ id }) => id === "G-PNW-SOURCE-ACTIVATION")?.state,
    "closed",
  );
  assert.equal(liveWorkItem("PNW-05-SOURCE-PACK")?.status, "ready");
  for (const id of [
    "PNW-06-LIFECYCLE-REFRESH",
    "PNW-07-ANALYZED-CORPUS",
    "PNW-08-OUTPUT-ADAPTERS",
    "PNW-09-ACCEPTANCE-SCENARIOS",
    "PNW-10-REGIONAL-RC",
  ]) {
    assert.equal(liveWorkItem(id)?.status, "not_started");
  }
  assert.equal(
    liveRoadmap.finish_states.local_release_candidate.current_state,
    "blocked",
  );
  assert.equal(
    liveRoadmap.finish_states.pnw_regional_engine.current_state,
    "in_progress",
  );
  assert.equal(liveRoadmap.finish_states.public_beta.current_state, "blocked");

  const federalRegister = liveRoadmap.source_register.find(
    ({ id }) => id === "SRC-FEDERAL-REGISTER",
  );
  assert.equal(federalRegister?.admission, "not_admitted");
  assert.equal(federalRegister?.activation, "inactive");
  assert.equal(federalRegister?.binding, "unbound");
  assert.equal(federalRegister?.publication, "not_authorized");
});

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeRepositoryBytes = (bytes) =>
  Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
const o0ContractPath = "docs/vision/o0-orchestration-contract.md";
const o0ContractBytes = normalizeRepositoryBytes(
  await readFile(path.resolve(projectRoot, o0ContractPath)),
);
const o0ContractSha256 = sha256Hex(o0ContractBytes);
const o0ContractGitBlobId = createHash("sha1")
  .update(Buffer.from(`blob ${o0ContractBytes.length}\0`, "utf8"))
  .update(o0ContractBytes)
  .digest("hex");
const o0CandidatePreimage = Buffer.concat([
  Buffer.from("policy-sentinel:o0-contract-candidate:v1\n", "utf8"),
  Buffer.from("proposed-version:1.0.0\n", "utf8"),
  Buffer.from(`byte-length:${o0ContractBytes.length}\n`, "utf8"),
  o0ContractBytes,
]);
const o0ContractCandidateId =
  "o0-contract-candidate:1.0.0:sha256:" + sha256Hex(o0CandidatePreimage);
const o0IdDerivation =
  'SHA-256 of UTF8("policy-sentinel:o0-contract-candidate:v1\\n") + ' +
  'UTF8("proposed-version:1.0.0\\n") + ' +
  `UTF8("byte-length:${o0ContractBytes.length}\\n") + the exact ` +
  `${o0ContractBytes.length} LF/no-BOM contract bytes.`;

const k0DurableLineage = {
  evidence_prefix: {
    count: 8,
    sha256: "967e759aa3616479a24b60694fe3c9d9996ab35dd8cad13c4becf692e23374ca",
  },
  contract: {
    path: "docs/vision/k0-lifecycle-contract.md",
    version: "1.0.0",
    sha256: "30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d",
    freeze_commit: "21bb68fbb9bbd45f470b84de02b037a624efadb4",
  },
  contract_review: {
    path: "docs/vision/reviews/k0-contract-review-2026-09-01.md",
    sha256: "cd72507ad36e11ff2a665174307f8be246839ce9a62b6b8f75133677ed5d7d28",
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
  convergence: {
    gate: "G-K0-S0-CONVERGENCE",
    required_state: "closed",
  },
};

const s0DurableLineage = {
  evidence_prefix: {
    count: 22,
    sha256: "997f3d6f1c781f06fb24d7b2ab812404a04771a5da0a19b75ea94017e3c119e1",
  },
  contract: {
    path: "docs/vision/s0-spatial-contract.md",
    version: "1.0.0",
    sha256: "ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888",
    freeze_commit: "383cc13a7e8e30db031f590a1c2d128a35a81b27",
  },
  contract_review: {
    path: "docs/vision/reviews/s0-contract-review-2026-09-01.md",
    sha256: "19ac4f2d90185571aaed9d2643755ea294d7b1074b85104b66036b990edc915d",
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
  convergence: {
    gate: "G-K0-S0-CONVERGENCE",
    required_state: "closed",
  },
};

const o0DurableLineage = {
  reviewed_predecessor: {
    path: o0ContractPath,
    proposed_version: "1.0.0",
    contractCandidateId:
      "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
    byte_length: 59366,
    sha256: "3ea10d753571f08f3e97d5c729d289c3d71e374d5fd91e68bd64c5e3c949f5d6",
    git_blob_id: "28f127fb62b112001fbb49a7a1e57f53fe9d0d2a",
    freeze_commit: "789ece12eb51164abfd3e11b7093644143e3c702",
    disposition: "rejected_material_findings",
  },
  independent_review: {
    path: "docs/vision/reviews/o0-contract-review-2026-09-01.md",
    byte_length: 24228,
    sha256: "d42f850c1193a05f4608660bee1247acffb7cb99e664375b5fdcb01c0995e375",
    git_blob_id: "a6dbbc48dc89b48d0a384aae4792123a30243adc",
    review_commit: "24633b993535f64e5b8da73265588753f5a95778",
    disposition: "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
  },
  repair_authorization: {
    accepted_disposition_only:
      "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
    authorized_findings: "O0-R01..O0-R15,O0-G01..O0-G03",
    contract_accepted: false,
    implementation_authorized: false,
    convergence_authorized: false,
  },
  supersession: {
    predecessor_contractCandidateId:
      "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
    successor_contractCandidateId: o0ContractCandidateId,
    relationship: "supersedes_rejected_candidate_for_independent_review",
  },
};

const o0ContractCandidate = {
  path: o0ContractPath,
  proposed_version: "1.0.0",
  contractCandidateId: o0ContractCandidateId,
  byte_length: o0ContractBytes.length,
  sha256: o0ContractSha256,
  git_blob_id: o0ContractGitBlobId,
  id_derivation: o0IdDerivation,
  predecessor_contractCandidateId:
    "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
  state: "byte_sealed_independent_review_required",
};

const o0ContractReview = {
  state: "awaiting_independent_review",
  reviewed_predecessor_candidate_id:
    "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
  predecessor_review_artifact:
    "docs/vision/reviews/o0-contract-review-2026-09-01.md",
  predecessor_review_artifact_sha256:
    "d42f850c1193a05f4608660bee1247acffb7cb99e664375b5fdcb01c0995e375",
  predecessor_disposition:
    "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
  active_candidate_id: o0ContractCandidateId,
  active_review_artifact: null,
  active_review_disposition: null,
};

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

const makePnwWorkItems = () => {
  const item = (id, priority, dependencies, status = "not_started") => ({
    id,
    priority,
    milestone: "PNW-TEST",
    title: id,
    status,
    dependencies,
    acceptance: ["The synthetic PNW roadmap contract remains explicit."],
    evidence:
      status === "complete" ? ["Synthetic PNW completion evidence."] : [],
  });
  const pnw00 = item("PNW-00-RECONCILE", 130, [], "complete");
  const pnw01 = {
    ...item("PNW-01-ENGINE-SEAMS", 131, ["PNW-00-RECONCILE"], "blocked"),
    blocked_by: ["G-PNW-IMPLEMENTATION"],
    authorization_gate: "G-PNW-IMPLEMENTATION",
    safe_fallback: "Keep the synthetic seam unimplemented.",
    unblocks_only_when: "The exact synthetic tranche is authorized.",
    evidence: ["Synthetic PNW implementation boundary."],
  };
  const pnw02 = {
    ...item(
      "PNW-02-REGIONAL-REGISTRY",
      132,
      ["PNW-01-ENGINE-SEAMS"],
      "blocked",
    ),
    blocked_by: ["G-PNW-ATNI-59-ROSTER"],
    authorization_gate: "G-PNW-ATNI-59-ROSTER",
    safe_fallback: "Emit no regional registry.",
    unblocks_only_when: "Originating synthetic roster evidence exists.",
    evidence: ["Synthetic PNW roster evidence boundary."],
  };
  return [
    pnw00,
    pnw01,
    pnw02,
    item("PNW-03-GEOGRAPHY-RIGHTS", 133, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-04-TAXONOMY", 134, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-05-SOURCE-PACK", 135, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-06-LIFECYCLE-REFRESH", 136, ["PNW-05-SOURCE-PACK"]),
    item("PNW-07-ANALYZED-CORPUS", 137, [
      "PNW-01-ENGINE-SEAMS",
      "PNW-04-TAXONOMY",
      "PNW-05-SOURCE-PACK",
    ]),
    item("PNW-08-OUTPUT-ADAPTERS", 138, ["PNW-07-ANALYZED-CORPUS"]),
    item("PNW-09-ACCEPTANCE-SCENARIOS", 139, [
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-06-LIFECYCLE-REFRESH",
      "PNW-08-OUTPUT-ADAPTERS",
    ]),
    item("PNW-10-REGIONAL-RC", 140, ["PNW-09-ACCEPTANCE-SCENARIOS"]),
  ];
};

const makeRoadmap = ({
  status = "blocked",
  stage = "contract_design",
  authorizedThrough = "contract_freeze",
  releaseState = "blocked",
  authorizationState = "approved",
} = {}) => {
  const releaseRoots =
    releaseState === "blocked" ? [...protectedReleaseRoots] : [];
  const nextActionIds =
    releaseState === "blocked"
      ? [...protectedReleaseRoots, ...protectedPnwRoots]
      : [...protectedPnwRoots];
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
    durable_lineage: clone(o0DurableLineage),
    contract_candidate: clone(o0ContractCandidate),
    contract_review: clone(o0ContractReview),
    accepted_contract: null,
    implementation_authorization: null,
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
      status_semantics: Object.fromEntries(
        [
          "complete",
          "in_progress",
          "ready",
          "blocked",
          "deferred",
          "not_started",
        ].map((value) => [value, `Synthetic meaning for ${value}.`]),
      ),
      capability_maturity_semantics: Object.fromEntries(
        [
          "proposed",
          "contracted",
          "implemented",
          "integrated",
          "validated",
          "source_activated",
          "release_ready",
          "published",
        ].map((value) => [value, `Synthetic meaning for ${value}.`]),
      ),
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
      {
        id: "G-S0-SYNTHETIC",
        name: "Synthetic S0 authorization",
        state: "approved",
        authorized_through: "completion",
        approved_scope: ["Synthetic S0 fixture."],
        evidence: ["Synthetic prior authorization."],
      },
      o0AuthorizationGate,
      {
        id: "G-O0-CONVERGENCE",
        name: "Synthetic O0 convergence",
        state: "closed",
      },
      {
        id: "G-PNW-IMPLEMENTATION",
        name: "Synthetic PNW implementation authorization",
        state: "closed",
      },
      {
        id: "G-PNW-ATNI-59-ROSTER",
        name: "Synthetic PNW roster evidence",
        state: "pending_evidence",
      },
      {
        id: "G-PNW-COMMUNITY-AUTHORITY",
        name: "Synthetic PNW community authority",
        state: "closed",
      },
      {
        id: "G-PNW-SPATIAL-EVIDENCE",
        name: "Synthetic PNW spatial evidence",
        state: "pending_evidence",
      },
      {
        id: "G-PNW-SOURCE-ACTIVATION",
        name: "Synthetic PNW source activation",
        state: "closed",
      },
      {
        id: "G-PNW-OUTPUT-REVIEW",
        name: "Synthetic PNW output review",
        state: "pending_evidence",
      },
    ],
    binding_documents: [
      { path: "AGENTS.md", role: "Existing local fixture path." },
      {
        path: "docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md",
        role: "Synthetic PNW launch contract.",
      },
    ],
    work_items: [
      {
        id: "H-HANDOFF",
        priority: 1,
        milestone: "TEST",
        title: "Synthetic durable handoff",
        status: "complete",
        dependencies: [],
        acceptance: ["The synthetic handoff is complete."],
        evidence: ["Synthetic handoff evidence."],
      },
      {
        id: "H-HOOKS",
        priority: 2,
        milestone: "TEST",
        title: "Synthetic hook guardrails",
        status: "complete",
        dependencies: ["H-HANDOFF"],
        acceptance: ["The synthetic hooks are complete."],
        evidence: ["Synthetic hook evidence."],
      },
      {
        id: "B3-PIPELINE",
        priority: 3,
        milestone: "TEST",
        title: "Synthetic existing pipeline",
        status: "complete",
        dependencies: [],
        acceptance: ["The synthetic pipeline is complete."],
        evidence: ["Synthetic pipeline evidence."],
      },
      ...requiredWorkItems,
      blockedWorkItem("SOURCE-GAP", 50),
      blockedWorkItem("APPLICATION-CONSUMER", 60),
      blockedWorkItem("PIPELINE-CONSUMER", 65),
      blockedWorkItem("ARTIFACT-CONSUMER", 70),
      blockedWorkItem("B9-LONGTAIL", 75),
      blockedWorkItem("B10-RC", 80),
      blockedWorkItem("PUBLICATION-CONSUMER", 85),
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
        dependencies: ["H-HANDOFF", "B3-PIPELINE"],
        authorization_gate: "G-K0-LIFECYCLE",
        convergence_gate: "G-K0-S0-CONVERGENCE",
        durable_lineage: clone(k0DurableLineage),
        acceptance: ["The synthetic prerequisite is complete."],
        evidence: clone(liveWorkItem("K0-LIFECYCLE").evidence),
      },
      {
        id: "S0-SPATIAL",
        priority: 121,
        milestone: "S0",
        title: "Synthetic completed spatial additive phase",
        status: "complete",
        additive_phase_stage: "completion",
        dependencies: ["K0-LIFECYCLE"],
        authorization_gate: "G-S0-SYNTHETIC",
        convergence_gate: "G-K0-S0-CONVERGENCE",
        durable_lineage: clone(s0DurableLineage),
        acceptance: ["The synthetic S0 phase is complete."],
        evidence: clone(liveWorkItem("S0-SPATIAL").evidence),
      },
      o0,
      ...makePnwWorkItems(),
      {
        id: "H-REPOSITORY-BACKBONE",
        priority: 141,
        milestone: "Repository governance",
        title: "Synthetic repository backbone",
        status: "complete",
        work_class: "repository_governance",
        dependencies: ["H-HOOKS", "PNW-00-RECONCILE"],
        acceptance: ["The synthetic repository backbone is aligned."],
        evidence: ["Synthetic repository-backbone completion evidence."],
      },
    ],
    completion_scope: {
      repository_backbone: {
        required_outcomes: ["H-REPOSITORY-BACKBONE"],
        does_not_change: ["Synthetic product roots."],
      },
      local_release_candidate: {
        required_outcomes: [
          "H-HANDOFF",
          "H-HOOKS",
          "B3-PIPELINE",
          ...protectedReleaseRoots,
        ],
        accepted_source_blocks: ["SOURCE-GAP"],
        publication_only: [
          "APPLICATION-CONSUMER",
          "PIPELINE-CONSUMER",
          "ARTIFACT-CONSUMER",
          "B9-LONGTAIL",
          "B10-RC",
          "PUBLICATION-CONSUMER",
          "RELEASE-PUBLISH",
        ],
        additive_vision_phases: [
          "K0-LIFECYCLE",
          "S0-SPATIAL",
          "O0-ORCHESTRATION",
        ],
      },
      pnw_regional_engine: {
        required_outcomes: [
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
        ],
        mapping_document: "AGENTS.md",
        launch_document:
          "docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md",
        first_implementation_tranche: "PNW-01-ENGINE-SEAMS",
        implementation_gate: "G-PNW-IMPLEMENTATION",
      },
    },
    finish_states: {
      repository_backbone: {
        current_state: "complete",
        satisfied_when: ["Synthetic backbone completion."],
        does_not_mean: ["Synthetic product completion."],
      },
      local_release_candidate: {
        current_state: releaseState,
        blocked_by: [...releaseRoots],
      },
      pnw_regional_engine: {
        current_state: "blocked",
        blocked_by: ["PNW-01-ENGINE-SEAMS", "PNW-02-REGIONAL-REGISTRY"],
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
    expectedNextActionIds = null,
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
      expectedNextActionIds ?? [
        ...(expectedReleaseState === "blocked" ? protectedReleaseRoots : []),
        ...(candidate.finish_states.pnw_regional_engine.current_state ===
        "blocked"
          ? protectedPnwRoots
          : []),
      ],
    );
  };
  const expectInvalid = async (name, candidate, expectedMessage) => {
    const result = await validateCandidate(name, candidate);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedMessage);
  };
  const addPendingAdditivePhase = (candidate) => {
    candidate.gates.push(
      {
        id: "G-X0-SYNTHETIC",
        name: "Synthetic X0 authorization",
        state: "approved",
        authorized_through: "contract_freeze",
        approved_scope: ["Synthetic X0 fixture."],
        evidence: ["Synthetic X0 authorization."],
      },
      {
        id: "G-X0-CONVERGENCE",
        name: "Synthetic X0 convergence",
        state: "pending_evidence",
      },
    );
    candidate.work_items.push({
      id: "X0-EXPERIMENT",
      priority: 142,
      milestone: "X0",
      title: "Synthetic pending-convergence additive phase",
      status: "ready",
      additive_phase_stage: "contract_design",
      dependencies: ["K0-LIFECYCLE"],
      authorization_gate: "G-X0-SYNTHETIC",
      convergence_gate: "G-X0-CONVERGENCE",
      acceptance: ["The synthetic additive phase remains isolated."],
      evidence: ["Synthetic pending-convergence evidence."],
    });
    candidate.completion_scope.local_release_candidate.additive_vision_phases.push(
      "X0-EXPERIMENT",
    );
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

  const approvedAuthorizationIsNotABlocker = makeRoadmap();
  approvedAuthorizationIsNotABlocker.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).blocked_by = ["X-CLOSED"];
  await expectValid(
    "approved-authorization-is-not-a-blocker",
    approvedAuthorizationIsNotABlocker,
  );

  const unrecordedAuthorizationBlock = makeRoadmap({
    authorizationState: "closed",
  });
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
    ["S0-SPATIAL", "O0-ORCHESTRATION"];
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

  const deletedO0Wholesale = makeRoadmap({ status: "ready" });
  deletedO0Wholesale.work_items = deletedO0Wholesale.work_items.filter(
    (item) => item.id !== "O0-ORCHESTRATION",
  );
  deletedO0Wholesale.completion_scope.local_release_candidate.additive_vision_phases =
    deletedO0Wholesale.completion_scope.local_release_candidate.additive_vision_phases.filter(
      (id) => id !== "O0-ORCHESTRATION",
    );
  deletedO0Wholesale.gates = deletedO0Wholesale.gates.filter(
    (gate) => !["G-O0-SYNTHETIC", "G-O0-CONVERGENCE"].includes(gate.id),
  );
  await expectInvalid(
    "o0-g01-wholesale-deletion",
    deletedO0Wholesale,
    /durable additive work item is missing: O0-ORCHESTRATION/,
  );

  const deletedS0Wholesale = makeRoadmap({ status: "ready" });
  deletedS0Wholesale.work_items = deletedS0Wholesale.work_items.filter(
    (item) => item.id !== "S0-SPATIAL",
  );
  deletedS0Wholesale.completion_scope.local_release_candidate.additive_vision_phases =
    deletedS0Wholesale.completion_scope.local_release_candidate.additive_vision_phases.filter(
      (id) => id !== "S0-SPATIAL",
    );
  deletedS0Wholesale.gates = deletedS0Wholesale.gates.filter(
    (gate) => gate.id !== "G-S0-SYNTHETIC",
  );
  await expectInvalid(
    "s0-g01-wholesale-deletion",
    deletedS0Wholesale,
    /durable additive work item is missing: S0-SPATIAL/,
  );

  const deletedO0Gate = makeRoadmap({ status: "ready" });
  deletedO0Gate.gates = deletedO0Gate.gates.filter(
    (gate) => gate.id !== "G-O0-CONVERGENCE",
  );
  await expectInvalid(
    "o0-g01-required-gate-deletion",
    deletedO0Gate,
    /references unknown gate G-O0-CONVERGENCE|durable additive gate is missing/,
  );

  const downgradedK0 = makeRoadmap({ status: "ready" });
  const downgradedK0Item = downgradedK0.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  );
  downgradedK0Item.status = "blocked";
  downgradedK0Item.additive_phase_stage = "implementation_review";
  downgradedK0Item.blocked_by = ["G-K0-LIFECYCLE"];
  downgradedK0Item.safe_fallback = "Do not reinterpret K0 completion.";
  downgradedK0Item.unblocks_only_when = "Never in this fixture.";
  await expectInvalid(
    "k0-g03-terminal-downgrade",
    downgradedK0,
    /S0-SPATIAL is complete but dependencies are not: K0-LIFECYCLE|K0-LIFECYCLE\.status must remain "complete"/,
  );

  const reopenedS0 = makeRoadmap({ status: "ready" });
  const reopenedS0Item = reopenedS0.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  );
  reopenedS0Item.status = "ready";
  reopenedS0Item.additive_phase_stage = "contract_design";
  await expectInvalid(
    "s0-g03-terminal-reopening",
    reopenedS0,
    /O0-ORCHESTRATION is ready but dependencies are not: S0-SPATIAL|S0-SPATIAL\.status must remain "complete"/,
  );

  const removedK0Evidence = makeRoadmap({ status: "ready" });
  removedK0Evidence.work_items
    .find((item) => item.id === "K0-LIFECYCLE")
    .evidence.shift();
  await expectInvalid(
    "k0-g03-evidence-removal",
    removedK0Evidence,
    /K0-LIFECYCLE\.evidence removed durable terminal evidence|changed durable terminal evidence/,
  );

  const removedS0ReviewEvidence = makeRoadmap({ status: "ready" });
  delete removedS0ReviewEvidence.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).durable_lineage.contract_review;
  await expectInvalid(
    "s0-g03-review-evidence-removal",
    removedS0ReviewEvidence,
    /S0-SPATIAL\.durable_lineage must contain exactly/,
  );

  const removedK0ImplementationEvidence = makeRoadmap({ status: "ready" });
  delete removedK0ImplementationEvidence.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  ).durable_lineage.implementation.audit_sha256;
  await expectInvalid(
    "k0-g03-implementation-evidence-removal",
    removedK0ImplementationEvidence,
    /K0-LIFECYCLE\.durable_lineage\.implementation must contain exactly/,
  );

  const changedS0FrozenHash = makeRoadmap({ status: "ready" });
  changedS0FrozenHash.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).durable_lineage.contract.sha256 = "0".repeat(64);
  await expectInvalid(
    "s0-g03-frozen-hash-change",
    changedS0FrozenHash,
    /S0-SPATIAL\.durable_lineage\.contract\.sha256 must remain/,
  );

  const changedS0ConvergenceBinding = makeRoadmap({ status: "ready" });
  changedS0ConvergenceBinding.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).convergence_gate = "G-O0-CONVERGENCE";
  await expectInvalid(
    "s0-g03-convergence-binding-change",
    changedS0ConvergenceBinding,
    /S0-SPATIAL\.convergence_gate must remain "G-K0-S0-CONVERGENCE"/,
  );

  const pendingDurableConvergence = makeRoadmap({ status: "ready" });
  pendingDurableConvergence.gates.find(
    (gate) => gate.id === "G-K0-S0-CONVERGENCE",
  ).state = "pending_evidence";
  await expectInvalid(
    "g02-durable-convergence-cannot-reopen-pending",
    pendingDurableConvergence,
    /G-K0-S0-CONVERGENCE\.state must remain "closed"/,
  );

  for (const state of ["pending_evidence", "approved"]) {
    const changedO0Convergence = makeRoadmap({ status: "ready" });
    const gate = changedO0Convergence.gates.find(
      (entry) => entry.id === "G-O0-CONVERGENCE",
    );
    gate.state = state;
    if (state === "approved") {
      gate.approved_scope = ["Synthetic unauthorized convergence."];
      gate.evidence = ["Synthetic unauthorized convergence evidence."];
    }
    await expectInvalid(
      `o0-g02-convergence-reopen-${state}`,
      changedO0Convergence,
      /G-O0-CONVERGENCE\.state must remain "closed"/,
    );
  }

  const removedO0ReviewEvidence = makeRoadmap({ status: "ready" });
  delete removedO0ReviewEvidence.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).durable_lineage.independent_review;
  await expectInvalid(
    "o0-g01-review-evidence-removal",
    removedO0ReviewEvidence,
    /O0-ORCHESTRATION\.durable_lineage must contain exactly/,
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
    ...blockedWorkItem("NONADDITIVE-BRIDGE", 150),
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

  const protectedConsumers = [
    "APPLICATION-CONSUMER",
    "PIPELINE-CONSUMER",
    "ARTIFACT-CONSUMER",
    "B9-LONGTAIL",
    "B10-RC",
    "PUBLICATION-CONSUMER",
    "RELEASE-PUBLISH",
  ];
  for (const consumerId of protectedConsumers) {
    const pendingDirect = makeRoadmap({ status: "ready" });
    addPendingAdditivePhase(pendingDirect);
    pendingDirect.work_items.find(
      (item) => item.id === consumerId,
    ).dependencies = ["X0-EXPERIMENT"];
    await expectInvalid(
      `g02-pending-direct-${consumerId.toLowerCase()}`,
      pendingDirect,
      new RegExp(
        `${consumerId} has a direct dependency.*${consumerId} -> X0-EXPERIMENT`,
      ),
    );
  }

  const pendingTransitive = makeRoadmap({ status: "ready" });
  addPendingAdditivePhase(pendingTransitive);
  pendingTransitive.work_items.find(
    (item) => item.id === "ARTIFACT-CONSUMER",
  ).dependencies = ["NONADDITIVE-BRIDGE"];
  pendingTransitive.work_items.push({
    ...blockedWorkItem("NONADDITIVE-BRIDGE", 150),
    dependencies: ["X0-EXPERIMENT"],
  });
  pendingTransitive.completion_scope.local_release_candidate.publication_only.push(
    "NONADDITIVE-BRIDGE",
  );
  await expectInvalid(
    "g02-pending-transitive-artifact",
    pendingTransitive,
    /ARTIFACT-CONSUMER has a transitive dependency.*ARTIFACT-CONSUMER -> NONADDITIVE-BRIDGE -> X0-EXPERIMENT/,
  );

  const changedReleaseRoot = makeRoadmap({ status: "ready" });
  changedReleaseRoot.finish_states.local_release_candidate.blocked_by.pop();
  await expectInvalid(
    "changed-protected-release-roots",
    changedReleaseRoot,
    /exact protected roots in order/,
  );

  const activePnwTranche = makeRoadmap();
  const activePnwGate = activePnwTranche.gates.find(
    (gate) => gate.id === "G-PNW-IMPLEMENTATION",
  );
  activePnwGate.state = "approved";
  activePnwGate.evidence = ["Synthetic exact PNW tranche authorization."];
  const activePnwItem = activePnwTranche.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  activePnwItem.status = "in_progress";
  delete activePnwItem.blocked_by;
  delete activePnwItem.safe_fallback;
  delete activePnwItem.unblocks_only_when;
  activePnwTranche.current_focus.work_item = "PNW-01-ENGINE-SEAMS";
  activePnwTranche.current_focus.terminal_reason = null;
  activePnwTranche.finish_states.pnw_regional_engine = {
    current_state: "in_progress",
  };
  activePnwTranche.next_actions = protectedReleaseRoots.map(
    (workItem, index) => ({
      order: index + 1,
      work_item: workItem,
      action: `Resolve ${workItem}.`,
    }),
  );
  await expectValid("active-pnw-with-blocked-legacy-release", activePnwTranche);

  const completedPnwTranche = makeRoadmap();
  const completedPnwGate = completedPnwTranche.gates.find(
    (gate) => gate.id === "G-PNW-IMPLEMENTATION",
  );
  completedPnwGate.state = "approved";
  completedPnwGate.evidence = ["Synthetic exact PNW tranche authorization."];
  const completedPnwItem = completedPnwTranche.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  completedPnwItem.status = "complete";
  completedPnwItem.evidence = ["Synthetic completed PNW tranche evidence."];
  delete completedPnwItem.blocked_by;
  delete completedPnwItem.safe_fallback;
  delete completedPnwItem.unblocks_only_when;
  for (const id of [
    "PNW-03-GEOGRAPHY-RIGHTS",
    "PNW-04-TAXONOMY",
    "PNW-05-SOURCE-PACK",
  ]) {
    completedPnwTranche.work_items.find((item) => item.id === id).status =
      "ready";
  }
  completedPnwTranche.current_focus.work_item = null;
  completedPnwTranche.current_focus.terminal_reason =
    "The completed PNW tranche stopped before separately authorized successor work.";
  completedPnwTranche.finish_states.pnw_regional_engine = {
    current_state: "in_progress",
  };
  completedPnwTranche.next_actions = [
    ...protectedReleaseRoots,
    "PNW-02-REGIONAL-REGISTRY",
    "PNW-03-GEOGRAPHY-RIGHTS",
    "PNW-04-TAXONOMY",
    "PNW-05-SOURCE-PACK",
  ].map((workItem, index) => ({
    order: index + 1,
    work_item: workItem,
    action: `Resolve or authorize ${workItem}.`,
  }));
  await expectValid(
    "completed-pnw-tranche-stops-before-ready-successors",
    completedPnwTranche,
    "blocked",
    [
      ...protectedReleaseRoots,
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-04-TAXONOMY",
      "PNW-05-SOURCE-PACK",
    ],
  );

  const missingPnwOutcome = makeRoadmap();
  missingPnwOutcome.completion_scope.pnw_regional_engine.required_outcomes.pop();
  await expectInvalid(
    "missing-pnw-outcome",
    missingPnwOutcome,
    /preserve PNW-00 through PNW-10 in order/,
  );

  const changedPnwTranche = makeRoadmap();
  changedPnwTranche.completion_scope.pnw_regional_engine.first_implementation_tranche =
    "PNW-02-REGIONAL-REGISTRY";
  await expectInvalid(
    "changed-pnw-first-tranche",
    changedPnwTranche,
    /PNW-01-ENGINE-SEAMS must remain the exact first implementation tranche/,
  );

  const unboundPnwMapping = makeRoadmap();
  unboundPnwMapping.completion_scope.pnw_regional_engine.mapping_document =
    "docs/not-binding.md";
  await expectInvalid(
    "unbound-pnw-mapping",
    unboundPnwMapping,
    /PNW regional mapping document must be a binding document/,
  );

  const changedPnwLaunch = makeRoadmap();
  changedPnwLaunch.completion_scope.pnw_regional_engine.launch_document =
    "AGENTS.md";
  await expectInvalid(
    "changed-pnw-launch-document",
    changedPnwLaunch,
    /PNW-01 launch document must remain/,
  );

  const removedPnwGate = makeRoadmap();
  removedPnwGate.gates = removedPnwGate.gates.filter(
    (gate) => gate.id !== "G-PNW-OUTPUT-REVIEW",
  );
  await expectInvalid(
    "removed-pnw-gate",
    removedPnwGate,
    /durable PNW gate is missing: G-PNW-OUTPUT-REVIEW/,
  );

  const changedPnwDependency = makeRoadmap();
  changedPnwDependency.work_items.find(
    (item) => item.id === "PNW-05-SOURCE-PACK",
  ).dependencies = ["PNW-02-REGIONAL-REGISTRY"];
  await expectInvalid(
    "changed-pnw-dependency",
    changedPnwDependency,
    /PNW-05-SOURCE-PACK dependencies do not match the durable PNW execution graph/,
  );

  const reorderedPnwRoots = makeRoadmap();
  reorderedPnwRoots.finish_states.pnw_regional_engine.blocked_by.reverse();
  await expectInvalid(
    "reordered-pnw-roots",
    reorderedPnwRoots,
    /PNW regional finish blockers must exactly match incomplete PNW roots/,
  );

  const hiddenPnwReadyRoot = makeRoadmap();
  const hiddenPnwRoot = hiddenPnwReadyRoot.work_items.find(
    (item) => item.id === "PNW-00-RECONCILE",
  );
  hiddenPnwRoot.status = "deferred";
  hiddenPnwRoot.reason = "Synthetic hidden-root regression.";
  hiddenPnwRoot.evidence = [];
  const dependentBackbone = hiddenPnwReadyRoot.work_items.find(
    (item) => item.id === "H-REPOSITORY-BACKBONE",
  );
  dependentBackbone.status = "not_started";
  dependentBackbone.evidence = [];
  hiddenPnwReadyRoot.finish_states.repository_backbone.current_state =
    "not_started";
  await expectInvalid(
    "hidden-pnw-nonblocked-root",
    hiddenPnwReadyRoot,
    /blocked PNW regional finish state has non-blocked incomplete roots: PNW-00-RECONCILE/,
  );

  const falsePnwCompletion = makeRoadmap();
  falsePnwCompletion.finish_states.pnw_regional_engine.current_state =
    "complete";
  delete falsePnwCompletion.finish_states.pnw_regional_engine.blocked_by;
  await expectInvalid(
    "false-pnw-completion",
    falsePnwCompletion,
    /PNW regional engine is complete with incomplete required outcomes/,
  );

  const readyPnwBehindClosedGate = makeRoadmap();
  const readyPnwItem = readyPnwBehindClosedGate.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  readyPnwItem.status = "ready";
  delete readyPnwItem.blocked_by;
  delete readyPnwItem.safe_fallback;
  delete readyPnwItem.unblocks_only_when;
  await expectInvalid(
    "ready-pnw-behind-closed-gate",
    readyPnwBehindClosedGate,
    /cannot be ready while authorization gate G-PNW-IMPLEMENTATION is closed/,
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
