import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import candidateFixture from "../../fixtures/engine/real-source-lifecycle.candidate.valid.json";
import {
  REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS,
  type RealSourceLifecycleEvaluationRequest,
} from "../../src/engine/real-source-lifecycle-contracts";
import {
  RealSourceLifecycleValidationError,
  assertRealSourceLifecycleCompatibility,
  evaluateRealSourceLifecycle,
  parseRealSourceLifecycleBundle,
  serializeRealSourceLifecycleBundle,
  serializeRealSourceLifecycleEvaluation,
} from "../../src/engine/real-source-lifecycle";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function stripContentDigests(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripContentDigests);
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "contentDigest")
      .map(([key, child]) => [key, stripContentDigests(child)]),
  );
}

function refreshBundleDigest<T extends { contentDigest: string }>(value: T): T {
  const clone = structuredClone(value);
  const payload = structuredClone(clone) as Record<string, unknown>;
  delete payload.contentDigest;
  clone.contentDigest = digest(payload);
  return clone;
}

function refreshScopeAndBundle<
  T extends { contentDigest: string; scope: unknown },
>(value: T): T {
  const clone = structuredClone(value) as T & Record<string, unknown>;
  const scope = clone.scope as Record<string, unknown>;
  const scopePayload = structuredClone(scope);
  delete scopePayload.contentDigest;
  scope.contentDigest = digest(scopePayload);
  for (const groupName of [
    "authorityReceipts",
    "evidenceReceipts",
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
    const group = clone[groupName];
    if (!Array.isArray(group)) {
      continue;
    }
    for (const member of group as Record<string, unknown>[]) {
      (member.scopeRef as Record<string, unknown>).contentDigest =
        scope.contentDigest;
    }
  }
  return refreshBundleDigest(clone);
}

function capture(run: () => unknown): RealSourceLifecycleValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RealSourceLifecycleValidationError);
    return error as RealSourceLifecycleValidationError;
  }
  throw new Error("invalid real-source lifecycle candidate was accepted");
}

function candidateRequest(): RealSourceLifecycleEvaluationRequest {
  return {
    expectedScope: structuredClone(
      candidateFixture.scope,
    ) as unknown as RealSourceLifecycleEvaluationRequest["expectedScope"],
    expectedBundleContentDigest: candidateFixture.contentDigest,
    requestedOperation: "acquisition" as const,
    asOf: "2026-09-03T12:00:00Z",
    currentAttempt: "not_attempted" as const,
    currentRevisionRef: null,
    requestedLkgRef: null,
  };
}

describe("real-source lifecycle closed gates", () => {
  it("parses, canonically serializes, and deeply freezes the candidate", () => {
    const acceptedBytes = JSON.stringify(candidateFixture);
    const parsed = parseRealSourceLifecycleBundle(candidateFixture);

    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.scope.relationshipPolicy)).toBe(true);
    expect(JSON.stringify(candidateFixture)).toBe(acceptedBytes);
    expect(serializeRealSourceLifecycleBundle(parsed)).toBe(canonical(parsed));
    expect(() => {
      (parsed.scope.source as { sourceId: string }).sourceId = "changed";
    }).toThrow(TypeError);
    expect(parsed.lifecycleState).toBe("evidence_blocked");
    expect(
      parsed.authorityReceipts.map(({ authorityRole }) => authorityRole),
    ).toEqual(["owner_configuration_authority"]);
    expect(
      parsed.evidenceReceipts.some(
        ({ evidenceClass }) => evidenceClass === "provider_fact",
      ),
    ).toBe(false);
  });

  it("keeps a candidate closed across every later lifecycle gate", () => {
    const evaluation = evaluateRealSourceLifecycle(
      candidateFixture,
      candidateRequest(),
    );

    expect(evaluation).toMatchObject({
      qualificationState: "not_qualified",
      admissionState: "not_admitted",
      activationState: "inactive",
      bindingState: "unbound",
      artifactEligibilityState: "ineligible",
      operationGranted: false,
      canExecute: false,
      canEmitLocalArtifact: false,
      canPublish: false,
      publicationState: "closed",
    });
    expect(evaluation.reasonCodes).toContain("PUBLICATION_CLOSED");
    expect(serializeRealSourceLifecycleEvaluation(evaluation)).toBe(
      canonical(evaluation),
    );
    expect(Object.isFrozen(evaluation)).toBe(true);
  });

  it("keeps the bare candidate state distinct and fail closed", () => {
    const bareCandidate = refreshBundleDigest({
      ...structuredClone(candidateFixture),
      lifecycleState: "candidate" as const,
    });
    const request = candidateRequest();
    const evaluation = evaluateRealSourceLifecycle(bareCandidate, {
      ...request,
      expectedBundleContentDigest: bareCandidate.contentDigest,
    });
    expect(evaluation.qualificationState).toBe("not_qualified");
    expect(evaluation.canExecute).toBe(false);
    expect(evaluation.canEmitLocalArtifact).toBe(false);
    expect(evaluation.canPublish).toBe(false);
  });

  it("rejects synthetic substitution even when its catalog shape is otherwise valid", () => {
    const candidate = structuredClone(candidateFixture);
    candidate.scope.source.sourceId = "synthetic-federal";
    const payload = structuredClone(candidate.scope) as Record<string, unknown>;
    delete payload.contentDigest;
    candidate.scope.contentDigest = digest(payload);
    candidate.contentDigest = refreshBundleDigest(candidate).contentDigest;

    const error = capture(() => parseRealSourceLifecycleBundle(candidate));
    expect(error.code).toBe("INVALID_REAL_TRUST");
    expect(error.message).not.toContain("synthetic-federal");
  });

  it("detects same-id/version receipt substitution after only the bundle digest is recomputed", () => {
    const candidate = structuredClone(candidateFixture);
    candidate.authorityReceipts[0]!.authorityRole = "issuing_agency";
    const forged = refreshBundleDigest(candidate);
    const error = capture(() => parseRealSourceLifecycleBundle(forged));
    expect(error.code).toBe("CONTENT_DIGEST_MISMATCH");
  });

  it("requires the caller-pinned bundle digest after a self-consistent same-identity substitution", () => {
    const substituted = structuredClone(candidateFixture);
    substituted.evidenceReceipts[0]!.observationKind = "error_shape";
    substituted.evidenceReceipts[0]!.contentDigest = digest(
      stripContentDigests(substituted.evidenceReceipts[0]),
    );
    substituted.contentDigest = refreshBundleDigest(substituted).contentDigest;
    expect(() => parseRealSourceLifecycleBundle(substituted)).not.toThrow();

    const error = capture(() =>
      assertRealSourceLifecycleCompatibility(
        substituted,
        candidateFixture.scope as never,
        candidateFixture.contentDigest,
      ),
    );
    expect(error.code).toBe("CONTENT_DIGEST_MISMATCH");
  });

  it("rejects authority-set substitution independently of the bundle fingerprint", () => {
    const candidate = structuredClone(candidateFixture);
    candidate.scope.authoritySetDigest = "a".repeat(64);
    const scopePayload = structuredClone(candidate.scope) as Record<
      string,
      unknown
    >;
    delete scopePayload.contentDigest;
    candidate.scope.contentDigest = digest(scopePayload);
    for (const receipt of [
      ...candidate.authorityReceipts,
      ...candidate.evidenceReceipts,
    ]) {
      receipt.scopeRef.contentDigest = candidate.scope.contentDigest;
    }
    candidate.contentDigest = refreshBundleDigest(candidate).contentDigest;

    const error = capture(() => parseRealSourceLifecycleBundle(candidate));
    expect(error.code).toBe("AUTHORITY_SET_DIGEST_MISMATCH");
  });

  it("rejects untrusted registry identities and same-version registry bytes", () => {
    const nonPrefixedSynthetic = structuredClone(candidateFixture);
    nonPrefixedSynthetic.scope.source.sourceId = "plausible-real-source";
    const unknownSource = refreshScopeAndBundle(nonPrefixedSynthetic);
    expect(
      capture(() => parseRealSourceLifecycleBundle(unknownSource)).code,
    ).toBe("UNTRUSTED_SOURCE_REGISTRY");

    const differentRegistryBytes = structuredClone(candidateFixture);
    differentRegistryBytes.scope.source.sourceRegistryRef.digest = "a".repeat(
      64,
    );
    const forgedRegistry = refreshScopeAndBundle(differentRegistryBytes);
    expect(
      capture(() => parseRealSourceLifecycleBundle(forgedRegistry)).code,
    ).toBe("UNTRUSTED_SOURCE_REGISTRY");

    const differentEntryBytes = structuredClone(candidateFixture);
    differentEntryBytes.scope.source.sourceRegistryEntryRef.digest = "b".repeat(
      64,
    );
    const forgedEntry = refreshScopeAndBundle(differentEntryBytes);
    expect(
      capture(() => parseRealSourceLifecycleBundle(forgedEntry)).code,
    ).toBe("UNTRUSTED_SOURCE_REGISTRY");
  });

  it("rejects any widening of the frozen FR-A1 request and access envelope", () => {
    const widenedMethod = structuredClone(candidateFixture);
    widenedMethod.scope.accessScope.methods.push("HEAD" as never);
    const methodCandidate = refreshScopeAndBundle(widenedMethod);
    expect(
      capture(() => parseRealSourceLifecycleBundle(methodCandidate)).code,
    ).toBe("INVALID_REQUEST_PLAN");

    const widenedBytes = structuredClone(candidateFixture);
    widenedBytes.scope.requestPlan.ceilings.responseBytes = 65_537;
    const planPayload = structuredClone(
      widenedBytes.scope.requestPlan,
    ) as Record<string, unknown>;
    delete planPayload.digest;
    widenedBytes.scope.requestPlan.digest = digest(planPayload);
    const bytesCandidate = refreshScopeAndBundle(widenedBytes);
    expect(
      capture(() => parseRealSourceLifecycleBundle(bytesCandidate)).code,
    ).toBe("INVALID_REQUEST_PLAN");

    const widenedQuery = structuredClone(candidateFixture);
    widenedQuery.scope.requestPlan.query[0]!.value = "raw_text";
    const queryPayload = structuredClone(
      widenedQuery.scope.requestPlan,
    ) as Record<string, unknown>;
    delete queryPayload.digest;
    widenedQuery.scope.requestPlan.digest = digest(queryPayload);
    const queryCandidate = refreshScopeAndBundle(widenedQuery);
    expect(
      capture(() => parseRealSourceLifecycleBundle(queryCandidate)).code,
    ).toBe("INVALID_REQUEST_PLAN");

    const widenedPath = structuredClone(candidateFixture);
    widenedPath.scope.requestPlan.path = "/api/v1/documents/other.json";
    const pathPayload = structuredClone(
      widenedPath.scope.requestPlan,
    ) as Record<string, unknown>;
    delete pathPayload.digest;
    widenedPath.scope.requestPlan.digest = digest(pathPayload);
    const pathCandidate = refreshScopeAndBundle(widenedPath);
    expect(
      capture(() => parseRealSourceLifecycleBundle(pathCandidate)).code,
    ).toBe("INVALID_REQUEST_PLAN");

    const changedRange = structuredClone(candidateFixture);
    changedRange.scope.selectedRange.id = "federal-register-document-other";
    const rangeCandidate = refreshScopeAndBundle(changedRange);
    expect(
      capture(() => parseRealSourceLifecycleBundle(rangeCandidate)).code,
    ).toBe("UNTRUSTED_SCOPE_REFERENCE");

    const changedPolicy = structuredClone(candidateFixture);
    const substitutedDescriptor = {
      ...structuredClone(REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract),
      publication: "allowed",
    };
    expect(substitutedDescriptor.id).toBe(changedPolicy.scope.contractRef.id);
    expect(substitutedDescriptor.version).toBe(
      changedPolicy.scope.contractRef.version,
    );
    changedPolicy.scope.contractRef.digest = digest(substitutedDescriptor);
    const policyCandidate = refreshScopeAndBundle(changedPolicy);
    expect(
      capture(() => parseRealSourceLifecycleBundle(policyCandidate)).code,
    ).toBe("UNTRUSTED_SCOPE_REFERENCE");

    const changedDeployment = structuredClone(candidateFixture);
    const substitutedDeployment = {
      ...structuredClone(REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.deployment),
      publication: "allowed",
    };
    expect(substitutedDeployment.id).toBe(
      changedDeployment.scope.deploymentRef.id,
    );
    expect(substitutedDeployment.version).toBe(
      changedDeployment.scope.deploymentRef.version,
    );
    changedDeployment.scope.deploymentRef.digest = digest(
      substitutedDeployment,
    );
    const deploymentCandidate = refreshScopeAndBundle(changedDeployment);
    expect(
      capture(() => parseRealSourceLifecycleBundle(deploymentCandidate)).code,
    ).toBe("UNTRUSTED_SCOPE_REFERENCE");
  });
});
