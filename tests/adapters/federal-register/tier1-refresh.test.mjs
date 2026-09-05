/* global URL, process, structuredClone */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import {
  FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
  FEDERAL_REGISTER_TIER1_POST_AUTHORITY_EVIDENCE_RECEIPTS,
  FEDERAL_REGISTER_TIER1_REJECTED_MANIFEST_DIGEST,
  FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
  FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST,
  FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
  FederalRegisterTier1RefreshGateError,
  assembleFederalRegisterTier1PreAcquisitionGate,
  assertFederalRegisterTier1AcquisitionGate,
  buildFederalRegisterTier1PreAcquisitionGraph,
  buildFederalRegisterTier1ProspectiveAuthorityGraph,
  createFederalRegisterTier1GateProposal,
  parseFederalRegisterTier1BoundedRegistryJson,
  serializeFederalRegisterTier1PreAcquisitionGate,
} from "../../../src/adapters/federal-register/tier1-refresh.mjs";
import {
  computeFederalRegisterTier1ExecutableManifest,
  runFederalRegisterPrereleaseCli,
} from "../../../scripts/refresh-federal-register-prerelease.mjs";

const candidateBundle = JSON.parse(
  await readFile(
    new URL(
      "../../../fixtures/engine/real-source-lifecycle.candidate.valid.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

async function optionalFileDigest(url) {
  try {
    const bytes = await readFile(url);
    return `${bytes.byteLength}:${createHash("sha256").update(bytes).digest("hex")}`;
  } catch (error) {
    if (error?.code === "ENOENT") return "absent";
    throw error;
  }
}

const acquisitionEnvironmentDenylist = [
  "ALL_PROXY",
  "GLOBAL_AGENT_HTTP_PROXY",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NODE_DEBUG",
  "NODE_DEBUG_NATIVE",
  "NODE_COMPILE_CACHE",
  "NODE_COMPILE_CACHE_PORTABLE",
  "NODE_DISABLE_COMPILE_CACHE",
  "NODE_EXTRA_CA_CERTS",
  "NODE_OPENSSL_CONF_NAME",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "NODE_USE_BUNDLED_CA",
  "NODE_USE_ENV_PROXY",
  "NODE_USE_SYSTEM_CA",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_ENGINES",
  "OPENSSL_MODULES",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SSLKEYLOGFILE",
  "VITEST",
  "all_proxy",
  "http_proxy",
  "https_proxy",
];

function cleanAcquisitionEnvironment() {
  const environment = { ...process.env };
  for (const name of acquisitionEnvironmentDenylist) delete environment[name];
  return environment;
}

const authoritySlots = [
  "ofr_nara_service_operator",
  "ofr_nara_originating_publisher",
  "gpo_official_edition_custodian",
  "source_reviewer",
  "security_reviewer",
  "sovereignty_reviewer",
];

const reviewBlueprint = [
  ["qualification", "source_contract", "source_reviewer"],
  ["qualification", "source_evidence", "source_reviewer"],
  ["qualification", "sovereignty", "sovereignty_reviewer"],
  ["acquisition_grant", "source_contract", "source_reviewer"],
  ["acquisition_grant", "security", "security_reviewer"],
  ["acquisition_grant", "sovereignty", "sovereignty_reviewer"],
  ["admission", "source_evidence", "source_reviewer"],
  ["admission", "security", "security_reviewer"],
  ["admission", "sovereignty", "sovereignty_reviewer"],
  ["activation", "source_evidence", "source_reviewer"],
  ["activation", "security", "security_reviewer"],
  ["activation", "sovereignty", "sovereignty_reviewer"],
  ["binding", "security", "security_reviewer"],
  ["binding", "sovereignty", "sovereignty_reviewer"],
];

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}

function clone(value) {
  return structuredClone(value);
}

function authorityEvidence() {
  return authoritySlots.map((slot, index) => ({
    slot,
    authorityIdentityRef: {
      id:
        index < 2
          ? "ofr-nara-institutional-identity"
          : `${slot.replaceAll("_", "-")}-test-identity`,
      version: "1.0.0",
      digest: index < 2 ? digest("ofr-nara") : digest(`identity:${slot}`),
    },
    issuedAt: `2026-09-03T12:0${index}:00Z`,
    evidenceDigest: digest(`authority-evidence:${slot}`),
  }));
}

function sourceEvidence() {
  return clone(FEDERAL_REGISTER_TIER1_POST_AUTHORITY_EVIDENCE_RECEIPTS);
}

function reviewEvidence() {
  const minutes = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18];
  return reviewBlueprint.map(([subject, reviewKind, reviewerSlot], index) => ({
    subject,
    reviewKind,
    reviewerSlot,
    reviewedAt: `2026-09-03T13:${String(minutes[index]).padStart(2, "0")}:00Z`,
    issuedAt: `2026-09-03T13:${String(minutes[index]).padStart(2, "0")}:00Z`,
    evidenceDigest: digest(`lifecycle-review-evidence:${index}`),
  }));
}

function buildInput() {
  return {
    candidateBundle: clone(candidateBundle),
    authorityEvidence: authorityEvidence(),
    sourceEvidence: sourceEvidence(),
    controlDocumentedAt: "2026-09-03T12:48:00Z",
    receiptEvents: {
      qualificationIssuedAt: "2026-09-03T13:00:00Z",
      acquisitionGrantIssuedAt: "2026-09-03T13:04:00Z",
      admissionIssuedAt: "2026-09-03T13:08:00Z",
      activationIssuedAt: "2026-09-03T13:12:00Z",
      bindingIssuedAt: "2026-09-03T13:16:00Z",
      lifecycleAsOf: "2026-09-03T13:19:00Z",
    },
    reviewEvidence: reviewEvidence(),
  };
}

function prospectiveInput() {
  return {
    candidateBundle: clone(candidateBundle),
    authorityEvidence: authorityEvidence(),
    lifecycleAsOf: "2026-09-03T12:10:00Z",
  };
}

function manifest() {
  return {
    id: "federal-register-tier1-companion-manifest",
    version: "1.0.0",
    byteLength: 2048,
    sha256: digest("replacement-tier1-manifest"),
  };
}

function authorityRefForRole(graph, role) {
  const receipt = graph.lifecycleBundle.authorityReceipts.find(
    ({ authorityRole }) => authorityRole === role,
  );
  return {
    kind: "authority_receipt",
    id: receipt.id,
    version: receipt.version,
    contentDigest: receipt.contentDigest,
  };
}

function companion(graph, companionManifest = manifest()) {
  const roles = [
    ["source", "source_reviewer", "source_evidence_reviewer"],
    ["security", "security_reviewer", "security_reviewer"],
    ["sovereignty", "sovereignty_reviewer", "sovereignty_reviewer"],
  ];
  return {
    manifest: companionManifest,
    approvals: roles.map(([role, reviewerSlot, authorityRole], index) => ({
      role,
      reviewerSlot,
      reviewerAuthorityRef: authorityRefForRole(graph, authorityRole),
      reviewedAt: `2026-09-03T13:${20 + index}:00Z`,
      issuedAt: `2026-09-03T13:${20 + index}:00Z`,
      expiresAt: FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
      evidenceDigest: digest(`whole-graph-approval:${role}`),
      decision: "approved",
      manifestDigest: companionManifest.sha256,
      lifecycleBundleContentDigest: graph.lifecycleBundle.contentDigest,
      lifecycleScopeContentDigest: graph.lifecycleBundle.scope.contentDigest,
      requestPlanDigest: FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
      fieldPolicyDigest: graph.lifecycleBundle.scope.fieldPolicyRef.digest,
      requestPolicyDigest: FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST,
    })),
  };
}

function expectation(gate, companionValue, asOf = "2026-09-03T13:25:00Z") {
  return {
    gateContentDigest: gate.contentDigest,
    lifecycleBundleContentDigest: gate.lifecycleBundle.contentDigest,
    lifecycleScopeContentDigest: gate.lifecycleBundle.scope.contentDigest,
    companionManifestDigest: companionValue.manifest.sha256,
    companionManifestByteLength: companionValue.manifest.byteLength,
    sourceEvidenceIds: gate.sourceEvidence.map(({ id }) => id),
    approvalEvidenceDigests: companionValue.approvals.map(
      ({ evidenceDigest }) => evidenceDigest,
    ),
    asOf,
  };
}

function resealGate(gate) {
  const copy = clone(gate);
  delete copy.contentDigest;
  gate.contentDigest = digest(canonical(copy));
  return gate;
}

function resealBundleRoot(bundle) {
  const copy = clone(bundle);
  delete copy.contentDigest;
  bundle.contentDigest = digest(canonical(copy));
  return bundle;
}

function isRefreshError(error, code) {
  return (
    error instanceof FederalRegisterTier1RefreshGateError &&
    (code === undefined || error.code === code)
  );
}

test("prospective stage seals exactly seven authorities and remains evidence blocked", () => {
  const graph =
    buildFederalRegisterTier1ProspectiveAuthorityGraph(prospectiveInput());
  assert.equal(graph.state, "prospective_authority_evidence_blocked");
  assert.equal(graph.acquisitionAuthorized, false);
  assert.equal(graph.lifecycleBundle.lifecycleState, "evidence_blocked");
  assert.equal(graph.lifecycleBundle.authorityReceipts.length, 7);
  assert.equal(
    graph.lifecycleBundle.evidenceReceipts.filter(
      ({ evidenceClass }) => evidenceClass === "provider_fact",
    ).length,
    0,
  );
  for (const group of [
    "reviewReceipts",
    "operationGrants",
    "qualificationReceipts",
    "admissionReceipts",
    "activationReceipts",
    "bindingReceipts",
    "artifactEligibilityReceipts",
    "coverageReceipts",
    "healthReceipts",
    "lkgReceipts",
  ]) {
    assert.equal(graph.lifecycleBundle[group].length, 0, group);
  }
  assert.equal(Object.isFrozen(graph), true);
  assert.equal(Object.isFrozen(graph.lifecycleBundle.scope), true);
});

test("prospective authority graph is byte deterministic and permits one provider identity to hold both provider roles", () => {
  const first =
    buildFederalRegisterTier1ProspectiveAuthorityGraph(prospectiveInput());
  const second =
    buildFederalRegisterTier1ProspectiveAuthorityGraph(prospectiveInput());
  assert.equal(
    first.lifecycleBundle.contentDigest,
    second.lifecycleBundle.contentDigest,
  );
  assert.equal(
    first.lifecycleBundle.authorityReceipts[1].authorityIdentityRef.digest,
    first.lifecycleBundle.authorityReceipts[2].authorityIdentityRef.digest,
  );
});

test("prospective stage rejects reviewer/owner or reviewer/reviewer identity collisions", () => {
  const input = prospectiveInput();
  input.authorityEvidence[4].authorityIdentityRef = clone(
    input.authorityEvidence[3].authorityIdentityRef,
  );
  assert.throws(
    () => buildFederalRegisterTier1ProspectiveAuthorityGraph(input),
    /AUTHORITY_IDENTITY_COLLISION/,
  );
});

test("full graph implements the exact bound-state blueprint", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const bundle = graph.lifecycleBundle;
  assert.equal(bundle.lifecycleState, "bound");
  assert.equal(bundle.authorityReceipts.length, 7);
  assert.equal(bundle.evidenceReceipts.length, 36);
  assert.equal(bundle.reviewReceipts.length, 14);
  assert.equal(bundle.operationGrants.length, 1);
  assert.equal(bundle.qualificationReceipts.length, 1);
  assert.equal(bundle.admissionReceipts.length, 1);
  assert.equal(bundle.activationReceipts.length, 1);
  assert.equal(bundle.bindingReceipts.length, 1);
  assert.equal(bundle.artifactEligibilityReceipts.length, 0);
  assert.equal(bundle.coverageReceipts.length, 0);
  assert.equal(bundle.healthReceipts.length, 0);
  assert.equal(bundle.lkgReceipts.length, 0);
  assert.equal(bundle.publication.state, "closed");
  assert.deepEqual(bundle.publication.authorityReceiptRefs, []);
  assert.equal(
    bundle.authorityReceipts.some(
      ({ authorityRole }) => authorityRole === "issuing_agency",
    ),
    false,
  );
  const counts = Object.groupBy(
    bundle.evidenceReceipts,
    ({ evidenceClass }) => evidenceClass,
  );
  assert.equal(counts.provider_fact.length, 6);
  assert.equal(counts.dated_observation.length, 1);
  assert.equal(counts.project_control.length, 18);
  assert.equal(counts.unknown.length, 9);
  assert.equal(counts.residual_risk_decision.length, 2);
  assert.equal(counts.dated_observation[0].resultState, "not_observed");
  assert.equal(
    counts.dated_observation[0].id,
    "federal-register-acquisition-not-observed",
  );
  assert.ok(
    counts.project_control.every(
      ({ enforcementState }) => enforcementState === "fail_closed",
    ),
  );
  assert.equal(bundle.operationGrants[0].operation, "acquisition");
  assert.equal(
    bundle.operationGrants[0].requestPlanRef.digest,
    FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
  );
});

test("provider facts bind the exact post-authority aggregate receipts without the auxiliary path counter", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  assert.deepEqual(
    graph.sourceEvidence.map(
      ({ id, byteCount, chunkCount, responseDigest }) => ({
        id,
        byteCount,
        chunkCount,
        responseDigest,
      }),
    ),
    [
      {
        id: "FR-D2",
        byteCount: 230_046,
        chunkCount: 19,
        responseDigest:
          "06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71",
      },
      {
        id: "FR-R4",
        byteCount: 83_240,
        chunkCount: 8,
        responseDigest:
          "272f27476b26ff1ee8ab534cacbb29595a12aaf05625c3a0923e13b80387441e",
      },
      {
        id: "FR-R5",
        byteCount: 112_041,
        chunkCount: 54,
        responseDigest:
          "6928c58b8617d0b012408eb835bbae0e8b5e7b3496d149552de0622281f0e1c4",
      },
    ],
  );
  assert.ok(
    graph.sourceEvidence.every(
      ({ attemptCount, redirectCount, retryCount, rawBytesRetained }) =>
        attemptCount === 1 &&
        redirectCount === 0 &&
        retryCount === 0 &&
        rawBytesRetained === 0,
    ),
  );
  assert.deepEqual(
    graph.sourceEvidence.reduce(
      (totals, receipt) => ({
        attemptCount: totals.attemptCount + receipt.attemptCount,
        byteCount: totals.byteCount + receipt.byteCount,
        chunkCount: totals.chunkCount + receipt.chunkCount,
        redirectCount: totals.redirectCount + receipt.redirectCount,
        retryCount: totals.retryCount + receipt.retryCount,
        rawBytesRetained: totals.rawBytesRetained + receipt.rawBytesRetained,
      }),
      {
        attemptCount: 0,
        byteCount: 0,
        chunkCount: 0,
        redirectCount: 0,
        retryCount: 0,
        rawBytesRetained: 0,
      },
    ),
    {
      attemptCount: 3,
      byteCount: 425_327,
      chunkCount: 81,
      redirectCount: 0,
      retryCount: 0,
      rawBytesRetained: 0,
    },
  );
  assert.ok(
    graph.lifecycleBundle.evidenceReceipts
      .filter(({ evidenceClass }) => evidenceClass === "provider_fact")
      .every(({ accessedAt }) => accessedAt === "2026-09-03T12:47:44Z"),
  );
  assert.equal("apiPathCount" in graph.sourceEvidence[0], false);
});

test("two owner residuals bind only terms/privacy and the exact accepted/expiry times", () => {
  const bundle =
    buildFederalRegisterTier1PreAcquisitionGraph(buildInput()).lifecycleBundle;
  const residuals = bundle.evidenceReceipts.filter(
    ({ evidenceClass }) => evidenceClass === "residual_risk_decision",
  );
  assert.equal(residuals.length, 2);
  for (const residual of residuals) {
    assert.equal(
      residual.acceptedAt,
      FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
    );
    assert.equal(
      residual.issuedAt,
      FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
    );
    assert.equal(residual.expiresAt, FEDERAL_REGISTER_TIER1_GATE_EXPIRY);
    assert.equal(residual.unknownEvidenceRefs.length, 1);
    assert.deepEqual(residual.riskScope.hosts, ["www.federalregister.gov"]);
    assert.deepEqual(residual.riskScope.methods, ["GET"]);
    assert.equal(
      residual.riskScope.outputBoundary,
      "ignored_local_prerelease_only",
    );
  }
});

test("historical pre-authority observations cannot be relabeled as provider facts", () => {
  const input = buildInput();
  input.authorityEvidence[0].issuedAt = "2026-09-03T12:48:00Z";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(input),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );

  const reused = buildInput();
  reused.sourceEvidence[0].id = "FR-D1";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(reused),
    (error) => isRefreshError(error, "MISMATCH"),
  );
});

test("provider authority must strictly predate every supporting replacement access", () => {
  const input = buildInput();
  input.authorityEvidence[0].issuedAt = "2026-09-03T12:47:43Z";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(input),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );
});

test("missing, forged, or cross-role lifecycle review evidence is rejected", () => {
  const missing = buildInput();
  missing.reviewEvidence.pop();
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(missing),
    (error) => isRefreshError(error, "INVALID_INPUT"),
  );

  const forged = buildInput();
  forged.reviewEvidence[0].evidenceDigest = "not-a-digest";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(forged),
    (error) => isRefreshError(error, "INVALID_DIGEST"),
  );

  const crossRole = buildInput();
  crossRole.reviewEvidence[0].reviewerSlot = "security_reviewer";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(crossRole),
    (error) => isRefreshError(error, "MISMATCH"),
  );
});

test("all lifecycle gates are strictly causal and current", () => {
  const earlyReview = buildInput();
  earlyReview.reviewEvidence[0].reviewedAt =
    earlyReview.receiptEvents.qualificationIssuedAt;
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(earlyReview),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );

  const earlyActivation = buildInput();
  earlyActivation.receiptEvents.activationIssuedAt = "2026-09-03T13:10:30Z";
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(earlyActivation),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );

  const expiredReview = buildInput();
  expiredReview.reviewEvidence[13].issuedAt =
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY;
  expiredReview.reviewEvidence[13].reviewedAt =
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY;
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(expiredReview),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );
});

test("graph and canonical gate serialization are deterministic", () => {
  const firstGraph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const secondGraph =
    buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  assert.equal(
    firstGraph.lifecycleBundle.contentDigest,
    secondGraph.lifecycleBundle.contentDigest,
  );
  const firstCompanion = companion(firstGraph);
  const secondCompanion = companion(secondGraph);
  const first = assembleFederalRegisterTier1PreAcquisitionGate(
    firstGraph,
    firstCompanion,
  );
  const second = assembleFederalRegisterTier1PreAcquisitionGate(
    secondGraph,
    secondCompanion,
  );
  assert.equal(first.contentDigest, second.contentDigest);
  assert.equal(
    serializeFederalRegisterTier1PreAcquisitionGate(first),
    serializeFederalRegisterTier1PreAcquisitionGate(second),
  );
});

test("assertion returns only a detached deeply frozen, executable pre-acquisition gate", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const companionValue = companion(graph);
  const gate = assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    companionValue,
  );
  const validated = assertFederalRegisterTier1AcquisitionGate(
    gate,
    expectation(gate, companionValue),
  );
  assert.notEqual(validated, gate);
  assert.equal(validated.state, "bound_pre_acquisition");
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.approvals[0]), true);
  assert.equal(Object.isFrozen(validated.lifecycleBundle.scope), true);
  assert.equal(validated.publication, "closed");
});

test("the rejected 3a85bf manifest can never be assembled", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const rejected = manifest();
  rejected.sha256 = FEDERAL_REGISTER_TIER1_REJECTED_MANIFEST_DIGEST;
  assert.throws(
    () =>
      assembleFederalRegisterTier1PreAcquisitionGate(
        graph,
        companion(graph, rejected),
      ),
    (error) => isRefreshError(error, "REJECTED_MANIFEST"),
  );
});

test("missing and cross-role whole-graph approvals fail closed", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const missing = companion(graph);
  missing.approvals.pop();
  assert.throws(
    () => assembleFederalRegisterTier1PreAcquisitionGate(graph, missing),
    (error) => isRefreshError(error, "INVALID_INPUT"),
  );

  const crossRole = companion(graph);
  crossRole.approvals[0].reviewerAuthorityRef = clone(
    crossRole.approvals[1].reviewerAuthorityRef,
  );
  assert.throws(
    () => assembleFederalRegisterTier1PreAcquisitionGate(graph, crossRole),
    (error) => isRefreshError(error, "REVIEWER_ROLE_MISMATCH"),
  );
});

test("manifest, graph, request policy, grant, and reviewer-evidence drift are rejected", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const companionValue = companion(graph);
  const gate = assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    companionValue,
  );
  const expected = expectation(gate, companionValue);

  const requestDrift = clone(gate);
  requestDrift.request.policy.maximumBytes += 1;
  resealGate(requestDrift);
  assert.throws(
    () => assertFederalRegisterTier1AcquisitionGate(requestDrift, expected),
    (error) => isRefreshError(error, "REQUEST_POLICY_MISMATCH"),
  );

  const evidenceDrift = clone(gate);
  evidenceDrift.approvals[0].evidenceDigest = digest("forged-approval");
  resealGate(evidenceDrift);
  const evidenceExpected = {
    ...expected,
    gateContentDigest: evidenceDrift.contentDigest,
  };
  assert.throws(
    () =>
      assertFederalRegisterTier1AcquisitionGate(
        evidenceDrift,
        evidenceExpected,
      ),
    (error) => isRefreshError(error, "MISMATCH"),
  );

  const grantDrift = clone(graph);
  grantDrift.lifecycleBundle.operationGrants[0].requestPlanRef.digest = digest(
    "different-request-plan",
  );
  resealBundleRoot(grantDrift.lifecycleBundle);
  assert.throws(() =>
    assembleFederalRegisterTier1PreAcquisitionGate(grantDrift, companionValue),
  );
});

test("a same-shape manifest replacement still needs the external exact digest pin", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const firstCompanion = companion(graph);
  const firstGate = assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    firstCompanion,
  );
  const pinned = expectation(firstGate, firstCompanion);

  const replacementManifest = manifest();
  replacementManifest.sha256 = digest("different-same-size-manifest");
  const replacementCompanion = companion(graph, replacementManifest);
  const replacementGate = assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    replacementCompanion,
  );
  assert.throws(
    () => assertFederalRegisterTier1AcquisitionGate(replacementGate, pinned),
    (error) => isRefreshError(error, "MISMATCH"),
  );
});

test("expired or not-yet-effective approvals never open acquisition", () => {
  const graph = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const companionValue = companion(graph);
  const gate = assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    companionValue,
  );
  assert.throws(
    () =>
      assertFederalRegisterTier1AcquisitionGate(
        gate,
        expectation(gate, companionValue, FEDERAL_REGISTER_TIER1_GATE_EXPIRY),
      ),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );

  assert.throws(
    () =>
      assertFederalRegisterTier1AcquisitionGate(
        gate,
        expectation(gate, companionValue, "2026-09-03T13:21:00Z"),
      ),
    (error) => isRefreshError(error, "INVALID_CHRONOLOGY"),
  );
});

test("extra grant, artifact, coverage, health, or LKG members are rejected", () => {
  const base = buildFederalRegisterTier1PreAcquisitionGraph(buildInput());
  const companionValue = companion(base);
  for (const group of [
    "operationGrants",
    "artifactEligibilityReceipts",
    "coverageReceipts",
    "healthReceipts",
    "lkgReceipts",
  ]) {
    const graph = clone(base);
    if (group === "operationGrants") {
      const extra = clone(graph.lifecycleBundle.operationGrants[0]);
      extra.id = "forbidden-extra-grant";
      extra.operation = "local_projection";
      extra.reviewReceiptRefs = [];
      const memberPayload = clone(extra);
      delete memberPayload.contentDigest;
      function strip(value) {
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(strip);
        return Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => key !== "contentDigest")
            .map(([key, child]) => [key, strip(child)]),
        );
      }
      extra.contentDigest = digest(canonical(strip(memberPayload)));
      graph.lifecycleBundle.operationGrants.push(extra);
    } else {
      graph.lifecycleBundle[group].push({ forbidden: true });
    }
    resealBundleRoot(graph.lifecycleBundle);
    assert.throws(
      () =>
        assembleFederalRegisterTier1PreAcquisitionGate(graph, companionValue),
      undefined,
      group,
    );
  }
});

test("source evidence deletion, substitution, or ID drift cannot qualify", () => {
  const missing = buildInput();
  missing.sourceEvidence.pop();
  assert.throws(() => buildFederalRegisterTier1PreAcquisitionGraph(missing));

  const crossSource = buildInput();
  crossSource.sourceEvidence[1].url =
    "https://www.federalregister.gov/api/v1/documentation.json";
  assert.throws(() =>
    buildFederalRegisterTier1PreAcquisitionGraph(crossSource),
  );

  const duplicate = buildInput();
  duplicate.sourceEvidence[2].id = duplicate.sourceEvidence[1].id;
  assert.throws(() => buildFederalRegisterTier1PreAcquisitionGraph(duplicate));
});

test("public input boundaries reject accessors, cycles, and hidden data", () => {
  const accessor = buildInput();
  Object.defineProperty(accessor, "candidateBundle", {
    enumerable: true,
    get() {
      return candidateBundle;
    },
  });
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(accessor),
    (error) => isRefreshError(error, "INVALID_JSON"),
  );

  const cyclic = buildInput();
  cyclic.loop = cyclic;
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(cyclic),
    (error) => isRefreshError(error, "INVALID_JSON"),
  );

  const unsafeInteger = buildInput();
  unsafeInteger.sourceEvidence[0].byteCount = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(
    () => buildFederalRegisterTier1PreAcquisitionGraph(unsafeInteger),
    (error) => isRefreshError(error, "INVALID_JSON"),
  );
});

test("registry JSON parser enforces structural budgets and prototype-safe members", () => {
  const parsed = parseFederalRegisterTier1BoundedRegistryJson(
    '{"__proto__":{"polluted":true},"items":[0]}',
  );
  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.equal(Object.hasOwn(parsed, "__proto__"), true);
  assert.equal(parsed.polluted, undefined);

  const overwideArray = `[${Array.from({ length: 25_001 }, () => "0").join(",")}]`;
  assert.throws(
    () => parseFederalRegisterTier1BoundedRegistryJson(overwideArray),
    SyntaxError,
  );
  const excessiveKeys = Object.fromEntries(
    Array.from({ length: 30_000 }, (_, index) => [
      `registry-key-${String(index).padStart(5, "0")}`,
      null,
    ]),
  );
  assert.throws(
    () =>
      parseFederalRegisterTier1BoundedRegistryJson(
        JSON.stringify(excessiveKeys),
      ),
    SyntaxError,
  );
  for (const unsafeNumber of ["-0", "9007199254740992", "1.5"]) {
    assert.throws(
      () => parseFederalRegisterTier1BoundedRegistryJson(unsafeNumber),
      SyntaxError,
      unsafeNumber,
    );
  }
});

test("default CLI path is a no-fetch, no-write qualification proposal", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("fetch must remain unreachable");
  };
  try {
    const result = await runFederalRegisterPrereleaseCli([]);
    assert.equal(result.mode, "qualification_proposal_only");
    assert.equal(result.acquisitionAuthorized, false);
    assert.equal(result.companionManifestDigest, null);
    assert.equal(result.publication, "closed");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refresh and acquisition use only the exact direct Tier-1 transport seam", async () => {
  const [refreshSource, cliSource] = await Promise.all([
    readFile(
      new URL(
        "../../../src/adapters/federal-register/tier1-refresh.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../../scripts/refresh-federal-register-prerelease.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.doesNotMatch(refreshSource, /tier1-transport\.mjs/);
  assert.match(
    cliSource,
    /import\(\s*"\.\.\/src\/adapters\/federal-register\/tier1-transport\.mjs"\s*\)/u,
  );
  const genericAdapterImport =
    /(?:from|import\()\s*["'][^"']*federal-register\/index[^"']*["']/u;
  assert.doesNotMatch(refreshSource, genericAdapterImport);
  assert.doesNotMatch(cliSource, genericAdapterImport);
  assert.doesNotMatch(refreshSource, /fetchFederalRegisterJson/);
  assert.doesNotMatch(cliSource, /fetchFederalRegisterJson/);
  assert.match(cliSource, /const directEntry = import\.meta\.main === true;/u);
  assert.match(refreshSource, /export default JSON\.parse/u);
  for (const name of acquisitionEnvironmentDenylist) {
    assert.match(cliSource, new RegExp(JSON.stringify(name), "u"), name);
  }
});

test("proposal records the approved post-authority evidence while the replacement freeze remains blocked", () => {
  const proposal = createFederalRegisterTier1GateProposal();
  assert.equal(proposal.companionManifestState, "replacement_freeze_required");
  assert.equal(
    proposal.replacementSourceEvidenceState,
    "three_post_authority_serial_receipts_recorded_and_approved",
  );
  assert.deepEqual(proposal.replacementSourceEvidenceIds, [
    "FR-D2",
    "FR-R4",
    "FR-R5",
  ]);
  assert.match(proposal.provenanceBlocker, /cannot be backdated/);
  assert.equal(Object.isFrozen(proposal), true);
});

test("CLI refuses acquisition without every ignored-custody gate path", async () => {
  await assert.rejects(
    () => runFederalRegisterPrereleaseCli(["--acquire"]),
    /missing a required exact path option/,
  );
  await assert.rejects(
    () =>
      runFederalRegisterPrereleaseCli([
        "--acquire",
        "--gate",
        "fixtures/gate.json",
        "--expectation",
        "fixtures/expectation.json",
      ]),
    /fresh direct process/,
  );
  await assert.rejects(
    () =>
      runFederalRegisterPrereleaseCli([
        "--acquire",
        "--gate",
        "fixtures/gate.json",
        "--expectation",
        "fixtures/expectation.json",
        "--out",
        "fixtures/output.json",
      ]),
    /option is not valid/,
  );
});

test("spoofed argv wrapper import cannot acquire, fetch, or mutate custody", async () => {
  const cliUrl = new URL(
    "../../../scripts/refresh-federal-register-prerelease.mjs",
    import.meta.url,
  );
  const custodyUrls = [
    "../../../generated-data/real-source-prerelease/FR-A1.attempt",
    "../../../generated-data/real-source-prerelease/federal-register-tier1-acquisition.part.json",
    "../../../generated-data/real-source-prerelease/federal-register-tier1-acquisition.json",
  ].map((path) => new URL(path, import.meta.url));
  const before = await Promise.all(custodyUrls.map(optionalFileDigest));
  const environment = cleanAcquisitionEnvironment();
  const wrapperSource = `
(async () => {
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("wrapper fake fetch must remain unreachable");
  };
  process.argv = [
    process.execPath,
    ${JSON.stringify(fileURLToPath(cliUrl))},
    "--acquire",
    "--gate",
    "generated-data/real-source-prerelease/nonexistent-gate.json",
    "--expectation",
    "generated-data/real-source-prerelease/nonexistent-expectation.json",
  ];
  await import(${JSON.stringify(cliUrl.href)});
  process.stdout.write(
    JSON.stringify({ importCompleted: true, fetchCalls, execArgv: process.execArgv }) +
      "\\n",
  );
})().catch((error) => {
  process.stderr.write(String(error?.stack ?? error) + "\\n");
  process.exitCode = 1;
});
`;
  const result = spawnSync(process.execPath, ["-"], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    encoding: "utf8",
    env: environment,
    input: wrapperSource,
    maxBuffer: 1_048_576,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(
    result.stdout,
    `${JSON.stringify({ importCompleted: true, fetchCalls: 0, execArgv: [] })}\n`,
  );
  assert.deepEqual(
    await Promise.all(custodyUrls.map(optionalFileDigest)),
    before,
  );
});

test("actual acquisition guard distinguishes CA override from historical runtime rejection without dispatch", async () => {
  const cliUrl = new URL(
    "../../../scripts/refresh-federal-register-prerelease.mjs",
    import.meta.url,
  );
  const custodyUrls = [
    "../../../generated-data/real-source-prerelease/FR-A1.attempt",
    "../../../generated-data/real-source-prerelease/federal-register-tier1-acquisition.part.json",
    "../../../generated-data/real-source-prerelease/federal-register-tier1-acquisition.json",
  ].map((path) => new URL(path, import.meta.url));
  const before = await Promise.all(custodyUrls.map(optionalFileDigest));
  // Evaluate only the actual pure guard and its exact constants. No import,
  // transport, process launch, custody routine or acquisition CLI can run here.
  const source = await readFile(cliUrl, "utf8");
  const version = source.match(/const REVIEWED_NODE_VERSION = "([^"]+)";/)?.[1];
  assert.equal(version, "v24.14.1");
  const denylist = source.match(
    /const ACQUISITION_ENVIRONMENT_DENYLIST = Object\.freeze\((\[[\s\S]*?\])\);/,
  )?.[1];
  assert.ok(denylist);
  const start = source.indexOf("function assertAcquisitionProcessBoundary() {");
  const end = source.indexOf("\nfunction parseCanonicalTimestamp", start);
  assert.ok(start > 0 && end > start);
  const guardSource = `${source.slice(start, end)}\nassertAcquisitionProcessBoundary();`;
  const checkGuard = (runtime, execArgv, env) =>
    runInNewContext(guardSource, {
      process: { version: runtime, execArgv, env },
      REVIEWED_NODE_VERSION: version,
      ACQUISITION_ENVIRONMENT_DENYLIST: JSON.parse(
        denylist.replace(/,\s*\]/, "]"),
      ),
      fail: (code, detail) => {
        throw Object.assign(new Error(detail), { code });
      },
    });
  assert.doesNotThrow(() => checkGuard(version, [], {}));
  assert.throws(
    () => checkGuard("v24.19.0", [], { NODE_USE_SYSTEM_CA: "1" }),
    /Node runtime differs/,
  );
  assert.throws(
    () => checkGuard(version, ["--synthetic-flag"], {}),
    /Node preload, loader, and runtime flags/,
  );
  assert.throws(
    () => checkGuard(version, [], { NODE_USE_SYSTEM_CA: "1" }),
    (error) =>
      error.code === "process_boundary" &&
      error.message === "request-affecting environment overrides are forbidden",
  );
  assert.deepEqual(
    await Promise.all(custodyUrls.map(optionalFileDigest)),
    before,
  );
});

test("executable manifest covers the complete fixed 17-path trust closure", async () => {
  const manifest = await computeFederalRegisterTier1ExecutableManifest();
  assert.equal(manifest.pathCount, 17);
  assert.equal(manifest.rows.length, 17);
  assert.deepEqual(manifest.rows, [...manifest.rows].sort());
  assert.equal(new Set(manifest.rows).size, 17);
  for (const requiredPath of [
    "config/sources.v1.json",
    "package.json",
    "scripts/refresh-federal-register-prerelease.mjs",
    "src/engine/real-source-lifecycle-contracts.ts",
    "src/engine/real-source-lifecycle.ts",
  ]) {
    assert.equal(
      manifest.rows.some((row) => row.startsWith(`${requiredPath}\t`)),
      true,
      `${requiredPath} must be covered`,
    );
  }
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(manifest.byteLength > 0, true);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.rows), true);
});
