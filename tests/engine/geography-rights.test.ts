import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import {
  GeographyRightsValidationError,
  REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS,
  REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES,
  createEngineProjection,
  createGeographyRightsProjection,
  parseGeographyRightsBundle,
  parseProjectionProfileBundle,
  serializeEngineProjection,
  serializeGeographyRightsProjection,
} from "../../src/engine";
import type { GeographyRightsProjection } from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

const publicRequest = {
  deploymentProfileRef: {
    id: "synthetic-cloud-harbor-deployment",
    version: "1.0.0",
  },
  personaProjectionRef: {
    id: "synthetic-cloud-harbor-researcher",
    version: "1.0.0",
  },
  outputAdapterRef: {
    id: "synthetic-document-reference-output",
    version: "1.0.0",
  },
  requestedVisibility: "public",
  requestedUse: "monitoring_context",
} as const;

const restrictedRequest = {
  ...publicRequest,
  requestedVisibility: "restricted",
  requestedUse: "human_review_context",
} as const;

const glassDesertRequest = {
  deploymentProfileRef: {
    id: "synthetic-glass-desert-deployment",
    version: "1.0.0",
  },
  personaProjectionRef: {
    id: "synthetic-glass-desert-coordinator",
    version: "1.0.0",
  },
  outputAdapterRef: {
    id: "synthetic-web-reference-output",
    version: "1.0.0",
  },
  requestedVisibility: "public",
  requestedUse: "monitoring_context",
} as const;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function captureValidationError(
  run: () => unknown,
): GeographyRightsValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(GeographyRightsValidationError);
    return error as GeographyRightsValidationError;
  }
  throw new Error("invalid projection was accepted");
}

function reverseSetLikeCollections() {
  const bundle = structuredClone(validGeographyRightsBundle);
  bundle.authorityBindings.reverse();
  bundle.scopeReferences.reverse();
  bundle.evidenceReferences.reverse();
  bundle.reviewAttestations.reverse();
  bundle.geometryReferences.reverse();
  bundle.geographicRelations.reverse();
  bundle.rightsFrames.reverse();
  bundle.deploymentBindings.reverse();

  for (const review of bundle.reviewAttestations) {
    review.evidenceRefs.reverse();
  }
  for (const geometry of bundle.geometryReferences) {
    geometry.evidenceRefs.reverse();
  }
  for (const relation of bundle.geographicRelations) {
    relation.evidenceRefs.reverse();
    relation.reviewAttestationRefs.reverse();
    relation.allowedInferences.reverse();
  }
  for (const frame of bundle.rightsFrames) {
    frame.evidenceRefs.reverse();
    frame.reviewAttestationRefs.reverse();
    frame.approvedUses.reverse();
    frame.approvedAudiences.reverse();
    frame.allowedInferences.reverse();
  }
  for (const binding of bundle.deploymentBindings) {
    binding.geographicRelationRefs.reverse();
    binding.rightsFrameRefs.reverse();
    binding.personaGrants.reverse();
    for (const grant of binding.personaGrants) {
      grant.outputAdapterRefs.reverse();
      grant.approvedUses.reverse();
      grant.geographicRelationRefs.reverse();
      grant.rightsFrameRefs.reverse();
    }
  }
  return bundle;
}

describe("governed geography and rights projection", () => {
  it("parses a detached recursively frozen catalog with exact typed limits", () => {
    const input = structuredClone(validGeographyRightsBundle);
    const before = JSON.stringify(input);
    const parsed = parseGeographyRightsBundle(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.geographicRelations)).toBe(true);
    expect(Object.isFrozen(parsed.geographicRelations[0]!.subjectRef)).toBe(
      true,
    );
    expect(parsed.geographicRelations[0]!.forbiddenInferences).toEqual(
      REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES,
    );
    expect(parsed.geographicRelations[0]!.nonClaims).toEqual(
      REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS,
    );
    const lineage = parsed.geographicRelations.filter(
      ({ id }) => id === "synthetic-cloud-harbor-service-relation",
    );
    expect(lineage).toHaveLength(2);
    expect(lineage[0]!.effectiveTemporalScope.through).toEqual({
      state: "known",
      date: "3781-12-31",
    });
    expect(lineage[1]!.effectiveTemporalScope.from).toEqual({
      state: "known",
      date: "3782-01-01",
    });
    expect(lineage[1]!.supersedesRef).toEqual({
      id: "synthetic-cloud-harbor-service-relation",
      version: "1.0.0",
    });

    input.geographicRelations[0]!.id = "synthetic-caller-mutation";
    expect(parsed.geographicRelations[0]!.id).not.toBe(
      "synthetic-caller-mutation",
    );
    expect(() => {
      (parsed.geographicRelations[0] as unknown as { id: string }).id =
        "synthetic-output-mutation";
    }).toThrow(TypeError);
  });

  it("emits only authorized references and never geography payloads", () => {
    const publicProjection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      publicRequest,
    );
    const restrictedProjection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      restrictedRequest,
    );
    const publicBytes = serializeGeographyRightsProjection(publicProjection);
    const restrictedBytes =
      serializeGeographyRightsProjection(restrictedProjection);

    expect(Object.keys(publicProjection).sort()).toEqual([
      "context",
      "geographyRightsBundleRef",
      "profileBundleRef",
      "schemaVersion",
    ]);
    expect(Object.keys(publicProjection.context).sort()).toEqual([
      "deploymentProfileRef",
      "disclosureState",
      "geographicRelationRefs",
      "nonClaims",
      "outputAdapterRef",
      "personaProjectionRef",
      "requestedUse",
      "requestedVisibility",
      "rightsFrameRefs",
    ]);
    expect(publicProjection.context.disclosureState).toBe(
      "authorized_subset_not_comprehensive",
    );
    expect(publicProjection.context.requestedUse).toBe("monitoring_context");
    expect(publicProjection.context.geographicRelationRefs).toEqual([
      {
        id: "synthetic-cloud-harbor-service-relation",
        version: "2.0.0",
      },
      {
        id: "synthetic-cloud-harbor-watershed-relation",
        version: "1.0.0",
      },
    ]);
    expect(publicProjection.context.rightsFrameRefs).toEqual([
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    ]);
    expect(restrictedProjection.context.geographicRelationRefs).toHaveLength(3);
    expect(restrictedProjection.context.rightsFrameRefs).toHaveLength(2);

    for (const secret of [
      "synthetic-cloud-harbor-co-management-relation",
      "synthetic-cloud-harbor-restricted-frame",
      "synthetic-cloud-harbor-opaque-geometry",
      "opaque-reference-0001",
      "opaque-reference-0002",
    ]) {
      expect(publicBytes).not.toContain(secret);
    }
    expect(publicBytes).not.toContain("withheld");
    expect(publicBytes).not.toContain("geometryRef");
    expect(restrictedBytes).not.toContain("opaque-reference");
    expect(restrictedBytes).not.toContain("evidenceReferences");
    expect(Object.isFrozen(publicProjection)).toBe(true);
    expect(
      Object.isFrozen(publicProjection.context.geographicRelationRefs),
    ).toBe(true);
  });

  it("supports a materially different deployment with no rights frame", () => {
    const projection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      glassDesertRequest,
    );

    expect(projection.context.geographicRelationRefs).toEqual([
      {
        id: "synthetic-glass-desert-agreement-relation",
        version: "1.0.0",
      },
    ]);
    expect(projection.context.rightsFrameRefs).toEqual([]);
    expect(projection.context.disclosureState).toBe(
      "authorized_subset_not_comprehensive",
    );
  });

  it("enforces requested use at the grant and frame boundaries", () => {
    const sourceReferenceProjection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      { ...publicRequest, requestedUse: "source_reference" },
    );
    expect(sourceReferenceProjection.context.requestedUse).toBe(
      "source_reference",
    );
    expect(sourceReferenceProjection.context.rightsFrameRefs).toEqual([
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    ]);

    const humanReviewProjection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      { ...restrictedRequest, requestedUse: "human_review_context" },
    );
    expect(humanReviewProjection.context.rightsFrameRefs).toEqual([
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
      {
        id: "synthetic-cloud-harbor-restricted-frame",
        version: "1.0.0",
      },
    ]);

    const frameLimited = structuredClone(validGeographyRightsBundle);
    const monitoringFrame = frameLimited.rightsFrames.find(
      ({ id }) => id === "synthetic-cloud-harbor-monitoring-frame",
    );
    if (monitoringFrame === undefined) {
      throw new Error("fixture monitoring frame is missing");
    }
    monitoringFrame.approvedUses = ["source_reference"];
    const frameFilteredProjection = createGeographyRightsProjection(
      validProfileBundle,
      frameLimited,
      publicRequest,
    );
    expect(frameFilteredProjection.context.geographicRelationRefs).toHaveLength(
      2,
    );
    expect(frameFilteredProjection.context.rightsFrameRefs).toEqual([]);

    let unauthorizedResult: GeographyRightsProjection | symbol = Symbol(
      "no partial projection",
    );
    const error = captureValidationError(() => {
      unauthorizedResult = createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        { ...glassDesertRequest, requestedUse: "source_reference" },
      );
    });
    expect(error.code).toBe("UNAUTHORIZED_PROJECTION");
    expect(error.path).toBe("/request/requestedUse");
    expect(typeof unauthorizedResult).toBe("symbol");
    expect(error.message).not.toContain(
      "synthetic-glass-desert-agreement-relation",
    );
  });

  it("does not project pending or rejected review attestations", () => {
    const pending = structuredClone(validGeographyRightsBundle);
    const sourceReviews = pending.reviewAttestations.filter(
      ({ deploymentProfileRef, kind }) =>
        deploymentProfileRef.id === "synthetic-cloud-harbor-deployment" &&
        kind === "source_verified",
    );
    if (sourceReviews.length < 2) {
      throw new Error("fixture source reviews are missing");
    }
    sourceReviews.forEach((review, index) => {
      review.state = index % 2 === 0 ? "pending" : "rejected";
    });

    const projection = createGeographyRightsProjection(
      validProfileBundle,
      pending,
      restrictedRequest,
    );
    expect(projection.context.geographicRelationRefs).toEqual([]);
    expect(projection.context.rightsFrameRefs).toEqual([]);
    expect(serializeGeographyRightsProjection(projection)).not.toContain(
      "synthetic-cloud-harbor-co-management-relation",
    );
  });

  it("keeps unauthorized failures atomic and free of restricted identifiers", () => {
    const bundleBefore = JSON.stringify(validGeographyRightsBundle);
    const profileBefore = JSON.stringify(validProfileBundle);
    const earlier = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      publicRequest,
    );
    const earlierBytes = serializeGeographyRightsProjection(earlier);

    for (const request of [
      { ...publicRequest, requestedVisibility: "privileged" },
      {
        ...publicRequest,
        outputAdapterRef: {
          id: "synthetic-web-reference-output",
          version: "1.0.0",
        },
      },
      {
        ...publicRequest,
        personaProjectionRef: {
          id: "synthetic-glass-desert-coordinator",
          version: "1.0.0",
        },
      },
    ]) {
      let result: GeographyRightsProjection | symbol = Symbol(
        "no partial projection",
      );
      const error = captureValidationError(() => {
        result = createGeographyRightsProjection(
          validProfileBundle,
          validGeographyRightsBundle,
          request,
        );
      });
      expect(error.code).toBe("UNAUTHORIZED_PROJECTION");
      expect(typeof result).toBe("symbol");
      expect(error.message).not.toContain(
        "synthetic-cloud-harbor-co-management-relation",
      );
      expect(error.message).not.toContain("opaque-reference");
    }

    expect(JSON.stringify(validGeographyRightsBundle)).toBe(bundleBefore);
    expect(JSON.stringify(validProfileBundle)).toBe(profileBefore);
    expect(serializeGeographyRightsProjection(earlier)).toBe(earlierBytes);
  });

  it("keeps invalid graph failure atomic and error text value-safe", () => {
    const candidate = structuredClone(validGeographyRightsBundle);
    const restrictedSentinel =
      "synthetic-restricted-reference-that-must-not-appear";
    candidate.geographicRelations[0]!.evidenceRefs[0]!.id = restrictedSentinel;
    const candidateBefore = JSON.stringify(candidate);
    const profileBefore = JSON.stringify(validProfileBundle);
    const earlier = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      publicRequest,
    );
    const earlierBytes = serializeGeographyRightsProjection(earlier);
    let result: GeographyRightsProjection | symbol = Symbol(
      "no partial projection",
    );

    const error = captureValidationError(() => {
      result = createGeographyRightsProjection(
        validProfileBundle,
        candidate,
        publicRequest,
      );
    });

    expect(error.code).toBe("UNKNOWN_REFERENCE");
    expect(error.path).toMatch(/^\//);
    expect(error.message).not.toContain(restrictedSentinel);
    expect(typeof result).toBe("symbol");
    expect(JSON.stringify(candidate)).toBe(candidateBefore);
    expect(JSON.stringify(validProfileBundle)).toBe(profileBefore);
    expect(serializeGeographyRightsProjection(earlier)).toBe(earlierBytes);
  });

  it("serializes byte-identically across set-like permutations and replay", () => {
    const baseline = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      restrictedRequest,
    );
    const permuted = createGeographyRightsProjection(
      validProfileBundle,
      reverseSetLikeCollections(),
      restrictedRequest,
    );
    const replay = createGeographyRightsProjection(
      structuredClone(validProfileBundle),
      structuredClone(validGeographyRightsBundle),
      structuredClone(restrictedRequest),
    );
    const baselineBytes = serializeGeographyRightsProjection(baseline);

    expect(serializeGeographyRightsProjection(permuted)).toBe(baselineBytes);
    expect(serializeGeographyRightsProjection(replay)).toBe(baselineBytes);
    expect(digest(serializeGeographyRightsProjection(permuted))).toBe(
      digest(baselineBytes),
    );
    expect(digest(serializeGeographyRightsProjection(replay))).toBe(
      digest(baselineBytes),
    );
  });

  it("makes restricted-object presence and an unrelated deployment invisible to public bytes", () => {
    const baseline = serializeGeographyRightsProjection(
      createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        publicRequest,
      ),
    );

    const withoutRestricted = structuredClone(validGeographyRightsBundle);
    withoutRestricted.geographicRelations =
      withoutRestricted.geographicRelations.filter(
        ({ id }) => id !== "synthetic-cloud-harbor-co-management-relation",
      );
    withoutRestricted.rightsFrames = withoutRestricted.rightsFrames.filter(
      ({ id }) => id !== "synthetic-cloud-harbor-restricted-frame",
    );
    const cloudBinding = withoutRestricted.deploymentBindings.find(({ id }) =>
      id.includes("cloud-harbor"),
    );
    if (cloudBinding === undefined) {
      throw new Error("cloud binding is missing");
    }
    cloudBinding.geographicRelationRefs =
      cloudBinding.geographicRelationRefs.filter(
        ({ id }) => id !== "synthetic-cloud-harbor-co-management-relation",
      );
    cloudBinding.rightsFrameRefs = cloudBinding.rightsFrameRefs.filter(
      ({ id }) => id !== "synthetic-cloud-harbor-restricted-frame",
    );
    cloudBinding.personaGrants[0]!.geographicRelationRefs =
      cloudBinding.personaGrants[0]!.geographicRelationRefs.filter(
        ({ id }) => id !== "synthetic-cloud-harbor-co-management-relation",
      );
    cloudBinding.personaGrants[0]!.rightsFrameRefs =
      cloudBinding.personaGrants[0]!.rightsFrameRefs.filter(
        ({ id }) => id !== "synthetic-cloud-harbor-restricted-frame",
      );

    const cloudOnly = structuredClone(withoutRestricted);
    const cloudDeploymentId = "synthetic-cloud-harbor-deployment";
    cloudOnly.authorityBindings = cloudOnly.authorityBindings.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.scopeReferences = cloudOnly.scopeReferences.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.evidenceReferences = cloudOnly.evidenceReferences.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.reviewAttestations = cloudOnly.reviewAttestations.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.geometryReferences = cloudOnly.geometryReferences.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.geographicRelations = cloudOnly.geographicRelations.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.rightsFrames = cloudOnly.rightsFrames.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );
    cloudOnly.deploymentBindings = cloudOnly.deploymentBindings.filter(
      ({ deploymentProfileRef }) =>
        deploymentProfileRef.id === cloudDeploymentId,
    );

    for (const candidate of [withoutRestricted, cloudOnly]) {
      const bytes = serializeGeographyRightsProjection(
        createGeographyRightsProjection(
          validProfileBundle,
          candidate,
          publicRequest,
        ),
      );
      expect(bytes).toBe(baseline);
    }
  });

  it("does not mutate or duplicate PNW-01 profiles, records, or projection bytes", () => {
    const profileBefore = JSON.stringify(validProfileBundle);
    const record = structuredClone(federalRecord) as PolicyRecord;
    const recordBefore = JSON.stringify(record);
    const pnw01Before = serializeEngineProjection(
      createEngineProjection([record], validProfileBundle),
    );

    const geographyProjection = createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      restrictedRequest,
    );
    const pnw01After = serializeEngineProjection(
      createEngineProjection([record], validProfileBundle),
    );

    expect(pnw01After).toBe(pnw01Before);
    expect(JSON.stringify(validProfileBundle)).toBe(profileBefore);
    expect(JSON.stringify(record)).toBe(recordBefore);
    expect(JSON.stringify(geographyProjection)).not.toContain(
      record.internalId,
    );
    expect(geographyProjection).not.toHaveProperty("records");
    expect(geographyProjection.context).not.toHaveProperty("whyShown");
  });

  it("rejects a PNW-01-valid candidate deployment without governed references", () => {
    const candidateProfile = structuredClone(validProfileBundle);
    const deployment = candidateProfile.deploymentProfiles.find(
      ({ id }) => id === "synthetic-cloud-harbor-deployment",
    );
    const rule = candidateProfile.watchRules.find(
      ({ id }) => id === "synthetic-cloud-harbor-source-rule",
    );
    if (deployment === undefined || rule === undefined) {
      throw new Error("candidate profile inputs are missing");
    }
    deployment.authorityState = "candidate";
    rule.reviewState = "candidate_pending";

    expect(() => parseProjectionProfileBundle(candidateProfile)).not.toThrow();
    const pnw01Bytes = serializeEngineProjection(
      createEngineProjection(
        [structuredClone(federalRecord) as PolicyRecord],
        candidateProfile,
      ),
    );
    expect(pnw01Bytes).not.toContain("geographicRelationRefs");
    expect(pnw01Bytes).not.toContain("rightsFrameRefs");

    let geographyResult: GeographyRightsProjection | symbol = Symbol(
      "no governed projection",
    );
    const error = captureValidationError(() => {
      geographyResult = createGeographyRightsProjection(
        candidateProfile,
        validGeographyRightsBundle,
        publicRequest,
      );
    });
    expect(error.code).toBe("UNAUTHORIZED_PROJECTION");
    expect(error.path).toMatch(/\/deploymentProfileRef$/);
    expect(typeof geographyResult).toBe("symbol");
    expect(error.message).not.toContain("geographicRelationRefs");
    expect(error.message).not.toContain("rightsFrameRefs");
  });

  it("rejects a PNW-01-valid candidate jurisdiction authority without governed references", () => {
    const candidateProfile = structuredClone(validProfileBundle);
    const region = candidateProfile.regionPacks.find(
      ({ id }) => id === "synthetic-cloud-harbor-region",
    );
    const jurisdiction = region?.jurisdictionReferences.find(
      ({ id }) => id === "synthetic-cloud-harbor-jurisdiction",
    );
    if (jurisdiction === undefined) {
      throw new Error("candidate jurisdiction input is missing");
    }
    jurisdiction.authorityState = "candidate";

    expect(() => parseProjectionProfileBundle(candidateProfile)).not.toThrow();
    const pnw01Bytes = serializeEngineProjection(
      createEngineProjection(
        [structuredClone(federalRecord) as PolicyRecord],
        candidateProfile,
      ),
    );
    expect(pnw01Bytes).not.toContain("geographicRelationRefs");
    expect(pnw01Bytes).not.toContain("rightsFrameRefs");

    let geographyResult: GeographyRightsProjection | symbol = Symbol(
      "no governed projection",
    );
    const error = captureValidationError(() => {
      geographyResult = createGeographyRightsProjection(
        candidateProfile,
        validGeographyRightsBundle,
        publicRequest,
      );
    });
    expect(error.code).toBe("UNAUTHORIZED_PROJECTION");
    expect(error.path).toBe("/authorityBindings/0/profileAuthorityScopeRef");
    expect(typeof geographyResult).toBe("symbol");
    expect(error.message).not.toContain("geographicRelationRefs");
    expect(error.message).not.toContain("rightsFrameRefs");
  });

  it("rejects ambiguous profile authority assertions independently of assertion ID order", () => {
    const cases = [
      {
        id: "synthetic-aaa-candidate-jurisdiction",
        authorityState: "candidate",
        expectedOrder: "before",
      },
      {
        id: "synthetic-zzz-candidate-jurisdiction",
        authorityState: "candidate",
        expectedOrder: "after",
      },
      {
        id: "synthetic-duplicate-demo-jurisdiction",
        authorityState: "synthetic_demo",
        expectedOrder: "after",
      },
    ] as const;
    const outcomes: Array<{ code: string; path: string; message: string }> = [];
    const validBundleBefore = JSON.stringify(validGeographyRightsBundle);
    const requestBefore = JSON.stringify(publicRequest);

    for (const fixtureCase of cases) {
      const candidateProfile = structuredClone(validProfileBundle);
      const region = candidateProfile.regionPacks.find(
        ({ id }) => id === "synthetic-cloud-harbor-region",
      );
      const demoAssertion = region?.jurisdictionReferences.find(
        ({ id }) => id === "synthetic-cloud-harbor-jurisdiction",
      );
      if (region === undefined || demoAssertion === undefined) {
        throw new Error("authority assertion fixture input is missing");
      }
      const additionalAssertion = structuredClone(demoAssertion);
      additionalAssertion.id = fixtureCase.id;
      additionalAssertion.authorityState = fixtureCase.authorityState;
      region.jurisdictionReferences.push(additionalAssertion);

      const sortedIds = region.jurisdictionReferences
        .map(({ id }) => id)
        .sort();
      const additionalIndex = sortedIds.indexOf(fixtureCase.id);
      const demoIndex = sortedIds.indexOf(demoAssertion.id);
      expect(
        additionalIndex < demoIndex ? "before" : "after",
        fixtureCase.id,
      ).toBe(fixtureCase.expectedOrder);

      const candidateBefore = JSON.stringify(candidateProfile);
      expect(() =>
        parseProjectionProfileBundle(candidateProfile),
      ).not.toThrow();
      expect(() =>
        createEngineProjection(
          [structuredClone(federalRecord) as PolicyRecord],
          candidateProfile,
        ),
      ).not.toThrow();

      const noProjection = Symbol("no partial projection");
      let result: unknown = noProjection;
      const error = captureValidationError(() => {
        result = createGeographyRightsProjection(
          candidateProfile,
          validGeographyRightsBundle,
          publicRequest,
        );
      });
      expect(error.code).toBe("INVALID_AUTHORITY_BINDING");
      expect(error.path).toBe("/authorityBindings/0/profileAuthorityScopeRef");
      expect(result).toBe(noProjection);
      expect(error.message).not.toContain(fixtureCase.id);
      expect(JSON.stringify(candidateProfile)).toBe(candidateBefore);
      outcomes.push({
        code: error.code,
        path: error.path,
        message: error.message,
      });
    }

    expect(outcomes[0]).toEqual(outcomes[1]);
    expect(outcomes[2]).toEqual(outcomes[0]);
    expect(JSON.stringify(validGeographyRightsBundle)).toBe(validBundleBefore);
    expect(JSON.stringify(publicRequest)).toBe(requestBefore);
  });
});
