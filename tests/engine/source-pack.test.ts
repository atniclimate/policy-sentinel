import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import validSourcePackBundle from "../../fixtures/engine/source-pack.synthetic.valid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import {
  SourcePackValidationError,
  assertSourcePackPlanCompatibility,
  createSourcePackAdmissionPlan,
  parseGeographyRightsBundle,
  parseProjectionProfileBundle,
  parseSourcePackBundle,
  parseTaxonomyBundle,
  serializeSourcePackAdmissionPlan,
  serializeSourcePackBundle,
} from "../../src/engine";
import type {
  SourcePackAdmissionPlan,
  SourcePackAdmissionRequest,
} from "../../src/engine";

const ordinal = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function sourcePackProfileVariant(
  mutate: (profile: typeof validProfileBundle) => void = () => undefined,
) {
  const acceptedBytes = JSON.stringify(validProfileBundle);
  const profile = structuredClone(validProfileBundle);
  profile.id = "synthetic-source-pack-profiles";
  for (const region of profile.regionPacks) {
    region.sourceIds = [
      ...new Set([
        ...region.sourceIds,
        "synthetic-county",
        "synthetic-state-accord",
      ]),
    ].sort(ordinal);
  }
  mutate(profile);
  const parsed = parseProjectionProfileBundle(profile);
  expect(JSON.stringify(validProfileBundle)).toBe(acceptedBytes);
  return parsed;
}

function sourcePackProfile() {
  return sourcePackProfileVariant();
}

function predecessorBundles() {
  return predecessorBundlesWithGeography(() => undefined);
}

function predecessorBundlesWithGeography(
  mutate: (bundle: typeof validGeographyRightsBundle) => void,
) {
  const geography = structuredClone(validGeographyRightsBundle);
  geography.id = "synthetic-source-pack-geography";
  geography.profileBundleRef = {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  };
  mutate(geography);
  const taxonomy = structuredClone(validTaxonomyBundle);
  taxonomy.id = "synthetic-source-pack-taxonomy";
  taxonomy.profileBundleRef = {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  };
  return {
    geographyRightsBundle: parseGeographyRightsBundle(geography),
    taxonomyBundle: parseTaxonomyBundle(taxonomy),
  };
}

const cloudRequest: SourcePackAdmissionRequest = {
  profileBundleRef: {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  },
  regionPackRef: {
    id: "synthetic-cloud-harbor-region",
    version: "1.0.0",
  },
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
  accessContextRef: {
    kind: "access_context",
    id: "synthetic-access-cloud-public",
    version: "1.0.0",
  },
  disclosureCeiling: "public",
  requestedOperation: "internal_analysis",
  asOf: "3785-06-30T00:00:00Z",
  requestedCoverageSlotRefs: [
    "synthetic-slot-alpha",
    "synthetic-slot-beta",
    "synthetic-slot-gamma",
  ],
};

const glassRequest: SourcePackAdmissionRequest = {
  profileBundleRef: cloudRequest.profileBundleRef,
  regionPackRef: {
    id: "synthetic-glass-desert-region",
    version: "1.0.0",
  },
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
  accessContextRef: {
    kind: "access_context",
    id: "synthetic-access-glass-public",
    version: "1.0.0",
  },
  disclosureCeiling: "public",
  requestedOperation: "internal_analysis",
  asOf: cloudRequest.asOf,
  requestedCoverageSlotRefs: cloudRequest.requestedCoverageSlotRefs,
};

function plan(
  bundle: unknown = validSourcePackBundle,
  request: SourcePackAdmissionRequest = cloudRequest,
): SourcePackAdmissionPlan {
  return createSourcePackAdmissionPlan(
    sourcePackProfile(),
    bundle,
    request,
    predecessorBundles(),
  );
}

function captureValidationError(run: () => unknown): SourcePackValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(SourcePackValidationError);
    return error as SourcePackValidationError;
  }
  throw new Error("invalid source-pack operation was accepted");
}

function findById<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new Error(`synthetic test member is missing: ${id}`);
  }
  return item;
}

function recursivelyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return true;
  }
  return (
    Object.isFrozen(value) &&
    Object.values(value).every((child) => recursivelyFrozen(child))
  );
}

function reverseSetLikeCollections() {
  const bundle = structuredClone(validSourcePackBundle);
  for (const key of [
    "sourceContexts",
    "jurisdictionContexts",
    "accessContexts",
    "authorityBindings",
    "evidenceReceipts",
    "contractReceipts",
    "coverageDeclarations",
    "reviewAttestations",
    "admissionReceipts",
    "availabilityObservations",
    "healthObservations",
    "sourceBindings",
    "deploymentBindings",
  ] as const) {
    bundle[key].reverse();
  }
  for (const authority of bundle.authorityBindings) {
    authority.evidenceRefs.reverse();
  }
  for (const contract of bundle.contractReceipts) {
    contract.evidenceRefs.reverse();
  }
  for (const coverage of bundle.coverageDeclarations) {
    coverage.evidenceRefs.reverse();
    coverage.slotStates.reverse();
  }
  for (const review of bundle.reviewAttestations) {
    review.evidenceRefs.reverse();
  }
  for (const admission of bundle.admissionReceipts) {
    admission.reviewAttestationRefs.reverse();
    admission.operationGrants.reverse();
  }
  for (const binding of bundle.sourceBindings) {
    binding.predecessorRefs.reverse();
  }
  for (const deployment of bundle.deploymentBindings) {
    deployment.sourceBindingRefs.reverse();
    deployment.accessContextRefs.reverse();
  }
  return bundle;
}

function reverseObjectInsertion(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectInsertion);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, child]) => [key, reverseObjectInsertion(child)]),
  );
}

describe("source-pack deterministic admission planning", () => {
  it("parses a detached frozen graph with distinct authority and state strata", () => {
    const input = structuredClone(validSourcePackBundle);
    const before = JSON.stringify(input);
    const parsed = parseSourcePackBundle(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(recursivelyFrozen(parsed)).toBe(true);
    expect(
      parsed.sourceContexts.filter(({ role }) => role === "state_context"),
    ).toHaveLength(2);
    expect(
      parsed.sourceContexts.some(
        ({ role }) => role === "regional_intergovernmental_context",
      ),
    ).toBe(true);
    expect(
      new Set(
        parsed.jurisdictionContexts.map(
          ({ configuredJurisdictionRef }) =>
            `${configuredJurisdictionRef.id}@${configuredJurisdictionRef.version}`,
        ),
      ).size,
    ).toBe(2);
    expect(
      parsed.jurisdictionContexts.every(
        ({ publisherJurisdictionEquivalence }) =>
          publisherJurisdictionEquivalence === "not_asserted",
      ),
    ).toBe(true);
    expect(
      parsed.contractReceipts.every(
        ({ providerLayer, internalLayer, publicLayer, qualification }) =>
          providerLayer === "synthetic_fixture_reference" &&
          internalLayer === "closed_normalized_reference" &&
          publicLayer === "reference_only_no_payload" &&
          qualification === "synthetic_test_qualified",
      ),
    ).toBe(true);

    const primaryConsumers = [
      ...parsed.contractReceipts.flatMap((consumer) =>
        consumer.evidenceRefs.map(({ id: evidenceId }) => ({
          evidenceId,
          subjectKind: "contract_receipt" as const,
          subjectId: consumer.id,
        })),
      ),
      ...parsed.coverageDeclarations.flatMap((consumer) =>
        consumer.evidenceRefs.map(({ id: evidenceId }) => ({
          evidenceId,
          subjectKind: "coverage_declaration" as const,
          subjectId: consumer.id,
        })),
      ),
      ...parsed.authorityBindings.flatMap((consumer) =>
        consumer.evidenceRefs.map(({ id: evidenceId }) => ({
          evidenceId,
          subjectKind: "authority_binding" as const,
          subjectId: consumer.id,
        })),
      ),
    ];
    expect(primaryConsumers).toHaveLength(parsed.evidenceReceipts.length);
    expect(
      new Set(primaryConsumers.map(({ evidenceId }) => evidenceId)).size,
    ).toBe(primaryConsumers.length);
    for (const evidence of parsed.evidenceReceipts) {
      const expectedSubjectKind =
        evidence.evidenceKind === "synthetic_coverage_declaration"
          ? "coverage_declaration"
          : evidence.evidenceKind === "synthetic_configuration_authority"
            ? "authority_binding"
            : "contract_receipt";
      expect(evidence.subject.kind, evidence.id).toBe(expectedSubjectKind);
      expect(
        primaryConsumers.find(({ evidenceId }) => evidenceId === evidence.id),
        evidence.id,
      ).toMatchObject({
        subjectKind: evidence.subject.kind,
        subjectId: evidence.subject.ref.id,
      });
    }
  });

  it("produces two eligible sources, partial usefulness, exclusions, and explicit non-absence gaps", () => {
    const result = plan();
    expect(
      result.eligibleBindings.map(({ source }) => source.sourceId),
    ).toEqual(["synthetic-county", "synthetic-federal"]);
    expect(
      result.eligibleBindings.flatMap(({ slotStates }) => slotStates),
    ).toEqual(
      expect.arrayContaining([
        { slotRef: "synthetic-slot-alpha", state: "covered" },
        { slotRef: "synthetic-slot-alpha", state: "partial" },
        { slotRef: "synthetic-slot-beta", state: "partial" },
      ]),
    );
    expect(result.gaps.map(({ slotRef }) => slotRef)).toEqual([
      "synthetic-slot-beta",
      "synthetic-slot-gamma",
    ]);
    expect(result.gaps).toEqual(
      expect.arrayContaining([
        {
          slotRef: "synthetic-slot-beta",
          state: "partial",
          notEvidenceOfAbsence: true,
        },
      ]),
    );
    expect(
      result.gaps.every(({ notEvidenceOfAbsence }) => notEvidenceOfAbsence),
    ).toBe(true);
    expect(result.context.disclosureState).toBe(
      "authorized_subset_not_comprehensive",
    );
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    const { fingerprint, ...authorizedPlanBytes } = result;
    expect(fingerprint).toBe(
      createHash("sha256")
        .update(JSON.stringify(authorizedPlanBytes))
        .digest("hex"),
    );
    expect(serializeSourcePackAdmissionPlan(result)).not.toMatch(
      /(?:percentage|readinessScore|completeRegion|comprehensiveCoverage)/i,
    );
  });

  it("keeps the six operation grants independent", () => {
    const acquisition = plan(validSourcePackBundle, {
      ...cloudRequest,
      requestedOperation: "acquisition",
    });
    const publicProjection = plan(validSourcePackBundle, {
      ...cloudRequest,
      requestedOperation: "public_projection",
    });
    const retention = plan(validSourcePackBundle, {
      ...cloudRequest,
      requestedOperation: "retention",
    });

    expect(
      acquisition.eligibleBindings.map(({ source }) => source.sourceId),
    ).toEqual(["synthetic-federal"]);
    expect(
      publicProjection.eligibleBindings.map(({ source }) => source.sourceId),
    ).toEqual(["synthetic-county"]);
    expect(retention.eligibleBindings).toEqual([]);
    expect(
      retention.exclusions.every(({ reasonCodes }) =>
        reasonCodes.includes("OPERATION_NOT_GRANTED"),
      ),
    ).toBe(true);
  });

  it("closes same-deployment persona and output mismatches without eligibility", () => {
    const cases = [
      {
        label: "persona",
        reason: "PERSONA_NOT_GRANTED" as const,
        accessId: "synthetic-access-cloud-observer",
        personaId: "synthetic-cloud-harbor-observer",
        outputId: "synthetic-document-reference-output",
        mutateProfile: (profile: typeof validProfileBundle) => {
          const persona = structuredClone(
            findById(
              profile.personaProjections,
              "synthetic-cloud-harbor-researcher",
            ),
          );
          persona.id = "synthetic-cloud-harbor-observer";
          profile.personaProjections.push(persona);
        },
      },
      {
        label: "output",
        reason: "OUTPUT_NOT_GRANTED" as const,
        accessId: "synthetic-access-cloud-web",
        personaId: "synthetic-cloud-harbor-researcher",
        outputId: "synthetic-web-reference-output",
        mutateProfile: (profile: typeof validProfileBundle) => {
          findById(
            profile.personaProjections,
            "synthetic-cloud-harbor-researcher",
          ).outputAdapterRefs.push({
            id: "synthetic-web-reference-output",
            version: "1.0.0",
          });
        },
      },
    ];

    for (const fixtureCase of cases) {
      const candidate = structuredClone(validSourcePackBundle);
      const accessContext = structuredClone(
        findById(candidate.accessContexts, "synthetic-access-cloud-public"),
      );
      accessContext.id = fixtureCase.accessId;
      accessContext.personaProjectionRef = {
        id: fixtureCase.personaId,
        version: "1.0.0",
      };
      accessContext.outputAdapterRef = {
        id: fixtureCase.outputId,
        version: "1.0.0",
      };
      candidate.accessContexts.push(accessContext);
      findById(
        candidate.deploymentBindings,
        "synthetic-deployment-binding-cloud",
      ).accessContextRefs.push({
        kind: "access_context",
        id: fixtureCase.accessId,
        version: "1.0.0",
      });

      const result = createSourcePackAdmissionPlan(
        sourcePackProfileVariant(fixtureCase.mutateProfile),
        candidate,
        {
          ...cloudRequest,
          personaProjectionRef: {
            id: fixtureCase.personaId,
            version: "1.0.0",
          },
          outputAdapterRef: {
            id: fixtureCase.outputId,
            version: "1.0.0",
          },
          accessContextRef: {
            kind: "access_context",
            id: fixtureCase.accessId,
            version: "1.0.0",
          },
          requestedCoverageSlotRefs: ["synthetic-slot-alpha"],
        },
        predecessorBundles(),
      );
      expect(result.eligibleBindings, fixtureCase.label).toEqual([]);
      expect(
        result.exclusions.map(({ reasonCodes }) => reasonCodes),
        fixtureCase.label,
      ).toEqual([[fixtureCase.reason], [fixtureCase.reason]]);
      expect(result.gaps, fixtureCase.label).toEqual([
        {
          slotRef: "synthetic-slot-alpha",
          state: "not_admitted",
          notEvidenceOfAbsence: true,
        },
      ]);
    }
  });

  it("keeps availability, health, admission, and coverage as independent axes", () => {
    const glass = plan(validSourcePackBundle, glassRequest);
    const federalGlass = glass.exclusions.filter(
      ({ source }) => source.sourceId === "synthetic-federal",
    );
    const stateGlass = glass.exclusions.filter(
      ({ source }) => source.sourceId === "synthetic-state-accord",
    );
    expect(
      federalGlass.some(({ reasonCodes }) =>
        reasonCodes.includes("SOURCE_UNAVAILABLE"),
      ),
    ).toBe(true);
    expect(
      federalGlass.every(
        ({ reasonCodes }) => !reasonCodes.includes("HEALTH_FAILED"),
      ),
    ).toBe(true);
    expect(
      stateGlass.some(({ reasonCodes }) =>
        reasonCodes.includes("NOT_ADMITTED"),
      ),
    ).toBe(true);
    expect(
      stateGlass.every(
        ({ reasonCodes }) => !reasonCodes.includes("SOURCE_UNAVAILABLE"),
      ),
    ).toBe(true);

    const failed = structuredClone(validSourcePackBundle);
    findById(
      failed.healthObservations,
      "synthetic-health-federal-cloud-source",
    ).state = "failed";
    const failedPlan = plan(failed);
    expect(
      failedPlan.exclusions
        .filter(({ source }) => source.sourceId === "synthetic-federal")
        .every(({ reasonCodes }) => reasonCodes.includes("HEALTH_FAILED")),
    ).toBe(true);
    expect(
      failedPlan.eligibleBindings.map(({ source }) => source.sourceId),
    ).toEqual(["synthetic-county"]);
  });

  it("uses only observations at or before asOf and rejects absence distinctly", () => {
    const baseline = serializeSourcePackAdmissionPlan(plan());
    const future = structuredClone(validSourcePackBundle);
    future.healthObservations.push({
      ...structuredClone(
        findById(
          future.healthObservations,
          "synthetic-health-federal-cloud-source",
        ),
      ),
      id: "synthetic-health-federal-cloud-future",
      observedAt: "3785-07-01T00:00:00Z",
      state: "failed",
    });
    expect(serializeSourcePackAdmissionPlan(plan(future))).toBe(baseline);

    const exact = structuredClone(validSourcePackBundle);
    exact.healthObservations.push({
      ...structuredClone(
        findById(
          exact.healthObservations,
          "synthetic-health-federal-cloud-source",
        ),
      ),
      id: "synthetic-health-federal-cloud-boundary",
      observedAt: cloudRequest.asOf,
      state: "failed",
    });
    expect(
      plan(exact)
        .exclusions.filter(
          ({ source }) => source.sourceId === "synthetic-federal",
        )
        .every(({ reasonCodes }) => reasonCodes.includes("HEALTH_FAILED")),
    ).toBe(true);

    const futureReview = structuredClone(validSourcePackBundle);
    findById(
      futureReview.reviewAttestations,
      "synthetic-review-federal-cloud-contract",
    ).reviewedAt = "3785-07-01T00:00:00Z";
    expect(
      plan(futureReview)
        .exclusions.filter(
          ({ source }) => source.sourceId === "synthetic-federal",
        )
        .every(({ reasonCodes }) =>
          reasonCodes.includes("ADMISSION_NOT_CURRENT"),
        ),
    ).toBe(true);

    const missing = structuredClone(validSourcePackBundle);
    missing.availabilityObservations = missing.availabilityObservations.filter(
      ({ id }) => id !== "synthetic-availability-county-cloud-jurisdiction",
    );
    expect(
      plan(missing)
        .exclusions.filter(
          ({ source }) => source.sourceId === "synthetic-county",
        )
        .every(({ reasonCodes }) =>
          reasonCodes.includes("AVAILABILITY_NOT_OBSERVED"),
        ),
    ).toBe(true);
  });

  it("distinguishes observed unknown availability and health from absent observations", () => {
    const alphaRequest: SourcePackAdmissionRequest = {
      ...cloudRequest,
      requestedCoverageSlotRefs: ["synthetic-slot-alpha"],
    };
    const cases = [
      {
        gapState: "availability_unknown",
        reason: "AVAILABILITY_UNKNOWN",
        mutate: (candidate: typeof validSourcePackBundle) => {
          for (const id of [
            "synthetic-availability-federal-cloud-source",
            "synthetic-availability-county-cloud-source",
          ]) {
            findById(candidate.availabilityObservations, id).state = "unknown";
          }
        },
      },
      {
        gapState: "health_unknown",
        reason: "HEALTH_UNKNOWN",
        mutate: (candidate: typeof validSourcePackBundle) => {
          for (const id of [
            "synthetic-health-federal-cloud-source",
            "synthetic-health-county-cloud-source",
          ]) {
            findById(candidate.healthObservations, id).state = "unknown";
          }
        },
      },
      {
        gapState: "not_observed",
        reason: "AVAILABILITY_NOT_OBSERVED",
        mutate: (candidate: typeof validSourcePackBundle) => {
          candidate.availabilityObservations =
            candidate.availabilityObservations.filter(
              ({ id }) =>
                ![
                  "synthetic-availability-federal-cloud-source",
                  "synthetic-availability-county-cloud-source",
                ].includes(id),
            );
        },
      },
      {
        gapState: "not_observed",
        reason: "HEALTH_NOT_OBSERVED",
        mutate: (candidate: typeof validSourcePackBundle) => {
          candidate.healthObservations = candidate.healthObservations.filter(
            ({ id }) =>
              ![
                "synthetic-health-federal-cloud-source",
                "synthetic-health-county-cloud-source",
              ].includes(id),
          );
        },
      },
    ] as const;

    for (const fixtureCase of cases) {
      const candidate = structuredClone(validSourcePackBundle);
      fixtureCase.mutate(candidate);
      const result = plan(candidate, alphaRequest);
      expect(result.eligibleBindings, fixtureCase.reason).toEqual([]);
      expect(result.gaps, fixtureCase.reason).toEqual([
        {
          slotRef: "synthetic-slot-alpha",
          state: fixtureCase.gapState,
          notEvidenceOfAbsence: true,
        },
      ]);
      expect(
        result.exclusions.every(({ reasonCodes }) =>
          reasonCodes.includes(fixtureCase.reason),
        ),
        fixtureCase.reason,
      ).toBe(true);
    }
  });

  it("isolates source, jurisdiction, and source-within-jurisdiction observation scopes", () => {
    for (const scope of [
      "source",
      "jurisdiction",
      "source-within-jurisdiction",
    ]) {
      const candidate = structuredClone(validSourcePackBundle);
      findById(
        candidate.healthObservations,
        `synthetic-health-county-cloud-${scope}`,
      ).state = "degraded";
      const result = plan(candidate);
      expect(
        result.eligibleBindings.map(({ source }) => source.sourceId),
      ).toEqual(["synthetic-federal"]);
      expect(
        result.exclusions
          .filter(({ source }) => source.sourceId === "synthetic-county")
          .every(({ reasonCodes }) => reasonCodes.includes("HEALTH_DEGRADED")),
      ).toBe(true);
    }
  });

  it("never upgrades complementary partial declarations or cross-context unavailability into completeness", () => {
    const candidate = structuredClone(validSourcePackBundle);
    findById(
      candidate.coverageDeclarations,
      "synthetic-coverage-federal-cloud",
    ).slotStates.find(
      ({ slotRef }) => slotRef === "synthetic-slot-alpha",
    )!.state = "partial";
    const cloud = plan(candidate);
    const alphaStates = cloud.eligibleBindings.flatMap(({ slotStates }) =>
      slotStates.filter(({ slotRef }) => slotRef === "synthetic-slot-alpha"),
    );
    expect(alphaStates).toEqual([
      { slotRef: "synthetic-slot-alpha", state: "partial" },
      { slotRef: "synthetic-slot-alpha", state: "partial" },
    ]);
    expect(cloud.gaps).toEqual(
      expect.arrayContaining([
        {
          slotRef: "synthetic-slot-alpha",
          state: "partial",
          notEvidenceOfAbsence: true,
        },
      ]),
    );
    expect(serializeSourcePackAdmissionPlan(cloud)).not.toContain(
      '"state":"covered"',
    );
    expect(
      plan(candidate, glassRequest).exclusions.some(({ reasonCodes }) =>
        reasonCodes.includes("SOURCE_UNAVAILABLE"),
      ),
    ).toBe(true);
  });

  it("distinguishes disabled from not-admitted bindings under exact disclosure", () => {
    const restricted = plan(validSourcePackBundle, {
      ...cloudRequest,
      accessContextRef: {
        kind: "access_context",
        id: "synthetic-access-cloud-restricted",
        version: "1.0.0",
      },
      disclosureCeiling: "restricted",
    });
    expect(
      restricted.exclusions
        .filter(({ source }) => source.sourceId === "synthetic-state-accord")
        .some(({ reasonCodes }) =>
          reasonCodes.includes("PACK_BINDING_DISABLED"),
        ),
    ).toBe(true);
    expect(
      plan(validSourcePackBundle, glassRequest)
        .exclusions.filter(
          ({ source }) => source.sourceId === "synthetic-state-accord",
        )
        .some(({ reasonCodes }) => reasonCodes.includes("NOT_ADMITTED")),
    ).toBe(true);
  });

  it("mechanically rejects replay after every semantic request-tuple change", () => {
    const result = plan();
    expect(() =>
      assertSourcePackPlanCompatibility(result, cloudRequest),
    ).not.toThrow();
    expect(() =>
      assertSourcePackPlanCompatibility(result, {
        ...cloudRequest,
        requestedCoverageSlotRefs: [
          ...cloudRequest.requestedCoverageSlotRefs,
        ].reverse(),
      }),
    ).not.toThrow();

    const changes: SourcePackAdmissionRequest[] = [
      { ...cloudRequest, requestedOperation: "retention" },
      { ...cloudRequest, asOf: "3785-06-29T00:00:00Z" },
      { ...cloudRequest, requestedCoverageSlotRefs: ["synthetic-slot-alpha"] },
      {
        ...cloudRequest,
        profileBundleRef: { id: "synthetic-other-profiles", version: "1.0.0" },
      },
      {
        ...cloudRequest,
        regionPackRef: { id: "synthetic-other-region", version: "1.0.0" },
      },
      {
        ...cloudRequest,
        deploymentProfileRef: {
          id: "synthetic-other-deployment",
          version: "1.0.0",
        },
      },
      {
        ...cloudRequest,
        personaProjectionRef: {
          id: "synthetic-other-persona",
          version: "1.0.0",
        },
      },
      {
        ...cloudRequest,
        outputAdapterRef: { id: "synthetic-other-output", version: "1.0.0" },
      },
      {
        ...cloudRequest,
        accessContextRef: {
          kind: "access_context",
          id: "synthetic-access-cloud-restricted",
          version: "1.0.0",
        },
      },
      { ...cloudRequest, disclosureCeiling: "internal" },
    ];
    for (const changed of changes) {
      const error = captureValidationError(() =>
        assertSourcePackPlanCompatibility(result, changed),
      );
      expect(error.code).toBe("PLAN_CONTEXT_MISMATCH");
    }
  });

  it("canonicalizes ordinal set order and object insertion order", () => {
    const canonicalBundle = serializeSourcePackBundle(
      parseSourcePackBundle(validSourcePackBundle),
    );
    expect(
      serializeSourcePackBundle(
        parseSourcePackBundle(reverseSetLikeCollections()),
      ),
    ).toBe(canonicalBundle);
    expect(
      serializeSourcePackBundle(
        parseSourcePackBundle(reverseObjectInsertion(validSourcePackBundle)),
      ),
    ).toBe(canonicalBundle);
    expect(
      serializeSourcePackAdmissionPlan(plan(reverseSetLikeCollections())),
    ).toBe(serializeSourcePackAdmissionPlan(plan()));
  });

  it("rejects late failure atomically and returns detached recursively frozen plans", () => {
    const profile = sourcePackProfile();
    const predecessors = predecessorBundles();
    const prior = createSourcePackAdmissionPlan(
      profile,
      validSourcePackBundle,
      cloudRequest,
      predecessors,
    );
    const priorBytes = serializeSourcePackAdmissionPlan(prior);
    const profileBefore = JSON.stringify(profile);
    const bundleBefore = JSON.stringify(validSourcePackBundle);
    const predecessorsBefore = JSON.stringify(predecessors);
    const invalid = structuredClone(validSourcePackBundle);
    invalid.evidenceReceipts.push({
      ...structuredClone(invalid.evidenceReceipts[0]!),
      id: "synthetic-late-invalid-evidence",
      source: {
        sourceId: "synthetic-unknown-source",
        sourceRegistryVersion: "1.19.0",
      },
    });
    let result: SourcePackAdmissionPlan | symbol = Symbol("no partial plan");
    expect(() => {
      result = createSourcePackAdmissionPlan(
        profile,
        invalid,
        cloudRequest,
        predecessors,
      );
    }).toThrow(SourcePackValidationError);
    expect(typeof result).toBe("symbol");
    expect(JSON.stringify(profile)).toBe(profileBefore);
    expect(JSON.stringify(validSourcePackBundle)).toBe(bundleBefore);
    expect(JSON.stringify(predecessors)).toBe(predecessorsBefore);
    expect(serializeSourcePackAdmissionPlan(prior)).toBe(priorBytes);
    expect(recursivelyFrozen(prior)).toBe(true);
    expect(() =>
      Object.defineProperty(prior.context, "asOf", {
        value: "3785-01-01T00:00:00Z",
      }),
    ).toThrow(TypeError);
    expect(() =>
      (prior.eligibleBindings as unknown as unknown[]).splice(0, 1),
    ).toThrow(TypeError);
  });

  it("rejects every extra accepted review whose subject is outside the admission proof", () => {
    const cases = [
      {
        sourceReviewId: "synthetic-review-federal-glass-coverage",
        extraId: "synthetic-review-federal-cloud-extra-same-source",
        expectedCode: "CROSS_JURISDICTION_REFERENCE",
        expectedPath: "/reviewAttestations/*/authorityBindingRef",
      },
      {
        sourceReviewId: "synthetic-review-county-cloud-contract",
        extraId: "synthetic-review-federal-cloud-extra-cross-source",
        expectedCode: "CROSS_SOURCE_REFERENCE",
        expectedPath:
          "/reviewAttestations/*/authorityBindingRef/evidenceRefs/*",
      },
    ];
    for (const fixtureCase of cases) {
      const candidate = structuredClone(validSourcePackBundle);
      const extra = structuredClone(
        findById(candidate.reviewAttestations, fixtureCase.sourceReviewId),
      );
      extra.id = fixtureCase.extraId;
      extra.authorityBindingRef = {
        kind: "authority_binding",
        id: "synthetic-authority-federal-cloud",
        version: "1.0.0",
      };
      candidate.reviewAttestations.push(extra);
      findById(
        candidate.admissionReceipts,
        "synthetic-admission-federal-cloud",
      ).reviewAttestationRefs.push({
        kind: "review_attestation",
        id: extra.id,
        version: extra.version,
      });

      const error = captureValidationError(() =>
        parseSourcePackBundle(candidate),
      );
      expect(error.code, fixtureCase.extraId).toBe(fixtureCase.expectedCode);
      expect(error.path, fixtureCase.extraId).toBe(fixtureCase.expectedPath);
    }
  });

  it("rejects review time outside the exact subject, evidence, or authority validity", () => {
    const cases = [
      {
        label: "subject",
        mutate: (candidate: typeof validSourcePackBundle) => {
          (
            findById(
              candidate.contractReceipts,
              "synthetic-contract-federal",
            ) as unknown as { validThrough: string | null }
          ).validThrough = "3784-01-31T00:00:00Z";
        },
      },
      {
        label: "evidence",
        mutate: (candidate: typeof validSourcePackBundle) => {
          (
            findById(
              candidate.evidenceReceipts,
              "synthetic-evidence-federal-contract",
            ) as unknown as { validThrough: string | null }
          ).validThrough = "3784-01-31T00:00:00Z";
        },
      },
      {
        label: "authority",
        mutate: (candidate: typeof validSourcePackBundle) => {
          (
            findById(
              candidate.authorityBindings,
              "synthetic-authority-federal-cloud",
            ) as unknown as { validThrough: string | null }
          ).validThrough = "3784-01-31T00:00:00Z";
        },
      },
    ];
    for (const fixtureCase of cases) {
      const candidate = structuredClone(validSourcePackBundle);
      fixtureCase.mutate(candidate);
      const error = captureValidationError(() =>
        parseSourcePackBundle(candidate),
      );
      expect(error.code, fixtureCase.label).toBe("CROSS_TRUST_REFERENCE");
      expect(error.path, fixtureCase.label).toContain("/reviewAttestations/");
    }
  });

  it("rejects restricted PNW-03 predecessors from a public source binding", () => {
    const cases = [
      {
        kind: "geographic_relation",
        objectId: "synthetic-cloud-harbor-co-management-relation",
      },
      {
        kind: "rights_frame",
        objectId: "synthetic-cloud-harbor-restricted-frame",
      },
    ] as const;
    for (const fixtureCase of cases) {
      const candidate = structuredClone(validSourcePackBundle);
      const binding = findById(
        candidate.sourceBindings,
        "synthetic-binding-federal-cloud",
      );
      binding.predecessorRefs[0] = {
        kind: fixtureCase.kind,
        bundleRef: {
          id: "synthetic-source-pack-geography",
          version: "1.0.0",
        },
        objectRef: { id: fixtureCase.objectId, version: "1.0.0" },
      };
      const error = captureValidationError(() =>
        createSourcePackAdmissionPlan(
          sourcePackProfile(),
          candidate,
          cloudRequest,
          predecessorBundles(),
        ),
      );
      expect(error.code, fixtureCase.kind).toBe("UNAUTHORIZED_PREDECESSOR");
      expect(error.path, fixtureCase.kind).toBe(
        "/sourceBindings/*/predecessorRefs/*/objectRef",
      );
    }
  });

  it("admits only a public source-reference rights frame with a public audience", () => {
    const candidate = structuredClone(validSourcePackBundle);
    const binding = findById(
      candidate.sourceBindings,
      "synthetic-binding-federal-cloud",
    );
    binding.predecessorRefs[0] = {
      kind: "rights_frame",
      bundleRef: {
        id: "synthetic-source-pack-geography",
        version: "1.0.0",
      },
      objectRef: {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    };
    expect(
      plan(candidate)
        .eligibleBindings.find(
          ({ sourceBindingRef }) =>
            sourceBindingRef.id === "synthetic-binding-federal-cloud",
        )
        ?.predecessorRefs.some(({ kind }) => kind === "rights_frame"),
    ).toBe(true);

    const mutations = [
      {
        label: "source-reference use",
        mutate: (geography: typeof validGeographyRightsBundle) => {
          const frame = findById(
            geography.rightsFrames,
            "synthetic-cloud-harbor-monitoring-frame",
          );
          frame.approvedUses = frame.approvedUses.filter(
            (value) => value !== "source_reference",
          );
        },
      },
      {
        label: "public audience",
        mutate: (geography: typeof validGeographyRightsBundle) => {
          const frame = findById(
            geography.rightsFrames,
            "synthetic-cloud-harbor-monitoring-frame",
          );
          frame.approvedAudiences = frame.approvedAudiences.filter(
            (value) => value !== "public",
          );
        },
      },
    ];
    for (const fixtureCase of mutations) {
      const error = captureValidationError(() =>
        createSourcePackAdmissionPlan(
          sourcePackProfile(),
          candidate,
          cloudRequest,
          predecessorBundlesWithGeography(fixtureCase.mutate),
        ),
      );
      expect(error.code, fixtureCase.label).toBe("UNAUTHORIZED_PREDECESSOR");
      expect(error.path, fixtureCase.label).toBe(
        "/sourceBindings/*/predecessorRefs/*/objectRef",
      );
    }
  });

  it("resolves predecessor references exactly without changing eligibility or coverage", () => {
    const withReferences = plan();
    const noReferenceBundle = structuredClone(validSourcePackBundle);
    findById(
      noReferenceBundle.sourceBindings,
      "synthetic-binding-federal-cloud",
    ).predecessorRefs = [];
    const withoutReferences = plan(noReferenceBundle);
    const stripCompatibility = (value: SourcePackAdmissionPlan) => ({
      ...structuredClone(value),
      fingerprint: "projection-fingerprint-omitted",
      eligibleBindings: value.eligibleBindings.map((binding) => ({
        ...structuredClone(binding),
        predecessorRefs: [],
      })),
    });
    expect(stripCompatibility(withReferences)).toEqual(
      stripCompatibility(withoutReferences),
    );
    expect(
      withReferences.eligibleBindings
        .find(
          ({ sourceBindingRef }) =>
            sourceBindingRef.id === "synthetic-binding-federal-cloud",
        )
        ?.predecessorRefs.map(({ kind }) => kind),
    ).toEqual(["geographic_relation", "taxonomy_namespace"]);

    const error = captureValidationError(() =>
      createSourcePackAdmissionPlan(
        sourcePackProfile(),
        validSourcePackBundle,
        cloudRequest,
      ),
    );
    expect(error.code).toBe("UNKNOWN_REFERENCE");
  });
});
