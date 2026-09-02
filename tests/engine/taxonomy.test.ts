import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import {
  REQUIRED_TAXONOMY_NONCLAIMS,
  TaxonomyValidationError,
  createEngineProjection,
  createTaxonomyProjection,
  parseTaxonomyBundle,
  serializeEngineProjection,
  serializeTaxonomyProjection,
} from "../../src/engine";
import type {
  EngineProjection,
  TaxonomyProjection,
  TaxonomyProjectionRequest,
} from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

function taxonomyProfile() {
  const profile = structuredClone(validProfileBundle);
  const cloudRegion = profile.regionPacks.find(
    ({ id }) => id === "synthetic-cloud-harbor-region",
  );
  const cloudRule = profile.watchRules.find(
    ({ id }) => id === "synthetic-cloud-harbor-source-rule",
  );
  const glassRule = profile.watchRules.find(
    ({ id }) => id === "synthetic-glass-desert-general-rule",
  );
  if (
    cloudRegion === undefined ||
    cloudRule === undefined ||
    glassRule === undefined
  ) {
    throw new Error("PNW-01 synthetic profile strata are missing");
  }
  cloudRegion.taxonomy.taxonomyIds = [
    "environmental-protection-pollution-governance",
    "climate-energy-policy",
    "infrastructure-transportation-broadband",
  ];
  cloudRule.recordIds = [
    "psr:synthetic-federal:record-001",
    "psr:synthetic-federal:record-002",
    "psr:synthetic-federal:record-003",
    "psr:synthetic-federal:record-004",
    "psr:synthetic-federal:record-007",
    "psr:synthetic-federal:record-008",
    "psr:synthetic-federal:record-009",
    "psr:synthetic-federal:record-010",
    "psr:synthetic-federal:record-011",
    "psr:synthetic-federal:record-012",
  ];
  glassRule.recordIds = [
    "psr:synthetic-federal:record-005",
    "psr:synthetic-federal:record-006",
  ];
  return profile;
}

function taxonomyRecords(): PolicyRecord[] {
  return Array.from({ length: 12 }, (_, index) => {
    const ordinal = String(index + 1).padStart(3, "0");
    const record = structuredClone(federalRecord) as PolicyRecord;
    record.internalId = `psr:synthetic-federal:record-${ordinal}`;
    record.source.recordId = `SYN-${ordinal}`;
    if (ordinal === "002") {
      record.officialSubjects = [
        {
          scheme: "synthetic-topic",
          label: "Synthetic Shared Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/evidence",
        },
        {
          scheme: "synthetic-other-topic",
          label: "Synthetic Shared Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/other-evidence",
        },
      ];
    } else if (ordinal === "012") {
      record.officialSubjects = [
        {
          scheme: "synthetic-topic",
          label: "Synthetic Expired Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/evidence",
        },
      ];
    }
    return record;
  });
}

const cloudRequest: TaxonomyProjectionRequest = {
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
  asOf: "3785-06-30",
};

const glassRequest: TaxonomyProjectionRequest = {
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
  asOf: "3785-06-30",
};

function inputs() {
  const profile = taxonomyProfile();
  const records = taxonomyRecords();
  const engineProjection = createEngineProjection(records, profile);
  return { profile, records, engineProjection };
}

function captureValidationError(run: () => unknown): TaxonomyValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(TaxonomyValidationError);
    return error as TaxonomyValidationError;
  }
  throw new Error("invalid taxonomy projection was accepted");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const NON_JSON_ARRAY_PROPERTIES = [
  { label: "non-index", key: "syntheticHiddenState" },
  { label: "noncanonical numeric", key: "01" },
  { label: "out-of-range numeric", key: "4294967295" },
] as const;

type MutableEngineRecord = Record<string, unknown> & {
  internalId: string;
  isUnclassified: boolean;
  taxonomyMemberships: unknown[];
};

type MutableEngineRecordReference = Record<string, unknown> & {
  recordId: string;
  reasons: Array<Record<string, unknown>>;
};

type MutableEngineView = Record<string, unknown> & {
  id: string;
  recordReferences: MutableEngineRecordReference[];
};

type MutableEngineProjection = {
  records: MutableEngineRecord[];
  views: MutableEngineView[];
};

function mutableEngineProjection(
  projection: EngineProjection,
): MutableEngineProjection {
  return projection as unknown as MutableEngineProjection;
}

function expectForgedEngineProjectionRejected(
  mutate: (projection: EngineProjection) => void,
  expectedCode: string,
  expectedPath: string,
): void {
  const { profile, engineProjection } = inputs();
  const profileBefore = JSON.stringify(profile);
  const engineBefore = serializeEngineProjection(engineProjection);
  const bundleBefore = JSON.stringify(validTaxonomyBundle);
  const requestBefore = JSON.stringify(cloudRequest);
  const prior = createTaxonomyProjection(
    profile,
    engineProjection,
    validTaxonomyBundle,
    cloudRequest,
  );
  const priorBefore = serializeTaxonomyProjection(prior);
  const forged = structuredClone(engineProjection);
  mutate(forged);
  const forgedBefore = JSON.stringify(forged);
  let result: TaxonomyProjection | symbol = Symbol("no partial projection");

  const error = captureValidationError(() => {
    result = createTaxonomyProjection(
      profile,
      forged,
      validTaxonomyBundle,
      cloudRequest,
    );
  });

  expect(error.code).toBe(expectedCode);
  expect(error.path).toBe(expectedPath);
  expect(typeof result).toBe("symbol");
  expect(JSON.stringify(forged)).toBe(forgedBefore);
  expect(serializeEngineProjection(engineProjection)).toBe(engineBefore);
  expect(JSON.stringify(profile)).toBe(profileBefore);
  expect(JSON.stringify(validTaxonomyBundle)).toBe(bundleBefore);
  expect(JSON.stringify(cloudRequest)).toBe(requestBefore);
  expect(serializeTaxonomyProjection(prior)).toBe(priorBefore);
}

function reverseSetLikeCollections() {
  const bundle = structuredClone(validTaxonomyBundle);
  bundle.authorityBindings.reverse();
  bundle.namespaces.reverse();
  bundle.concepts.reverse();
  bundle.evidenceReferences.reverse();
  bundle.reviewAttestations.reverse();
  bundle.crosswalks.reverse();
  bundle.assignments.reverse();
  bundle.deploymentBindings.reverse();
  for (const review of bundle.reviewAttestations) {
    review.evidenceRefs.reverse();
  }
  for (const crosswalk of bundle.crosswalks) {
    crosswalk.targetConceptRefs.reverse();
    crosswalk.evidenceRefs.reverse();
    crosswalk.reviewAttestationRefs.reverse();
  }
  for (const assignment of bundle.assignments) {
    assignment.evidenceRefs.reverse();
    assignment.reviewAttestationRefs.reverse();
  }
  for (const binding of bundle.deploymentBindings) {
    binding.namespaceRefs.reverse();
    binding.crosswalkRefs.reverse();
    binding.assignmentRefs.reverse();
    binding.personaGrants.reverse();
    for (const grant of binding.personaGrants) {
      grant.outputAdapterRefs.reverse();
      grant.namespaceRefs.reverse();
      grant.crosswalkRefs.reverse();
      grant.assignmentRefs.reverse();
    }
  }
  return bundle;
}

describe("governed taxonomy projection", () => {
  it("parses a detached frozen graph while preserving exact authority layers", () => {
    const input = structuredClone(validTaxonomyBundle);
    const before = JSON.stringify(input);
    const parsed = parseTaxonomyBundle(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.concepts)).toBe(true);
    expect(Object.isFrozen(parsed.concepts[0]!.namespaceRef)).toBe(true);
    expect(
      parsed.crosswalks.every(({ nonClaims }) =>
        nonClaims.every(
          (value, index) => value === REQUIRED_TAXONOMY_NONCLAIMS[index],
        ),
      ),
    ).toBe(true);
    expect(
      parsed.assignments.every(({ nonClaims }) =>
        nonClaims.every(
          (value, index) => value === REQUIRED_TAXONOMY_NONCLAIMS[index],
        ),
      ),
    ).toBe(true);

    const shared = parsed.concepts.filter(
      ({ id }) => id === "synthetic-shared-term",
    );
    expect(shared).toHaveLength(6);
    expect(
      new Set(shared.map(({ namespaceRef }) => namespaceRef.id)).size,
    ).toBe(6);
    expect(
      shared.every(
        (concept) =>
          concept.kind === "authority_native" &&
          concept.preferredLabel === "Synthetic Shared Monitor",
      ),
    ).toBe(true);

    input.concepts[5]!.id = "synthetic-caller-mutation";
    expect(
      parsed.concepts.some(({ id }) => id === "synthetic-caller-mutation"),
    ).toBe(false);
    expect(() => {
      (parsed.concepts[0] as unknown as { id: string }).id =
        "synthetic-output-mutation";
    }).toThrow(TypeError);
  });

  it.each(NON_JSON_ARRAY_PROPERTIES)(
    "rejects $label own state on a taxonomy array before canonicalization",
    ({ key }) => {
      const candidate = structuredClone(validTaxonomyBundle);
      const concepts = candidate.concepts as unknown as Record<string, unknown>;
      const sentinel = "Synthetic hidden taxonomy array state";
      const canonicalBefore = JSON.stringify(candidate);
      Object.defineProperty(concepts, key, {
        configurable: true,
        enumerable: true,
        value: sentinel,
        writable: true,
      });
      expect(JSON.stringify(candidate)).toBe(canonicalBefore);
      let result: unknown | symbol = Symbol("no parsed bundle");

      const error = captureValidationError(() => {
        result = parseTaxonomyBundle(candidate);
      });

      expect(error.code).toBe("INVALID_JSON");
      expect(error.path).toBe("$taxonomyBundle/concepts");
      expect(error.message).not.toContain(key);
      expect(error.message).not.toContain(sentinel);
      expect(typeof result).toBe("symbol");
      expect(Object.hasOwn(concepts, key)).toBe(true);
      expect(concepts[key]).toBe(sentinel);
      expect(JSON.stringify(candidate)).toBe(canonicalBefore);
    },
  );

  it.each(NON_JSON_ARRAY_PROPERTIES)(
    "rejects $label own state on an EngineProjection array without dropping it",
    ({ key }) => {
      const { profile, engineProjection } = inputs();
      const prior = createTaxonomyProjection(
        profile,
        engineProjection,
        validTaxonomyBundle,
        cloudRequest,
      );
      const priorBefore = serializeTaxonomyProjection(prior);
      const forged = structuredClone(engineProjection);
      const records = mutableEngineProjection(forged)
        .records as unknown as Record<string, unknown>;
      const sentinel = "Synthetic hidden engine array state";
      const canonicalBefore = JSON.stringify(forged);
      Object.defineProperty(records, key, {
        configurable: true,
        enumerable: true,
        value: sentinel,
        writable: true,
      });
      expect(JSON.stringify(forged)).toBe(canonicalBefore);
      let result: TaxonomyProjection | symbol = Symbol("no partial projection");

      const error = captureValidationError(() => {
        result = createTaxonomyProjection(
          profile,
          forged,
          validTaxonomyBundle,
          cloudRequest,
        );
      });

      expect(error.code).toBe("INVALID_JSON");
      expect(error.path).toBe("$engineProjection/records");
      expect(error.message).not.toContain(key);
      expect(error.message).not.toContain(sentinel);
      expect(typeof result).toBe("symbol");
      expect(Object.hasOwn(records, key)).toBe(true);
      expect(records[key]).toBe(sentinel);
      expect(JSON.stringify(forged)).toBe(canonicalBefore);
      expect(serializeTaxonomyProjection(prior)).toBe(priorBefore);
    },
  );

  it("redacts an arbitrary unexpected key and value at the containing structural path", () => {
    const candidate = structuredClone(validTaxonomyBundle);
    const authority = candidate.authorityBindings[0] as unknown as Record<
      string,
      unknown
    >;
    const hiddenKey = "syntheticSensitiveKeyMustNotLeak";
    const hiddenValue = "Synthetic sensitive value must not leak";
    authority[hiddenKey] = hiddenValue;
    const before = JSON.stringify(candidate);
    let result: unknown | symbol = Symbol("no parsed bundle");

    const error = captureValidationError(() => {
      result = parseTaxonomyBundle(candidate);
    });

    expect(error.code).toBe("INVALID_SHAPE");
    expect(error.path).toBe("/authorityBindings/0");
    expect(error.path).not.toContain(hiddenKey);
    expect(error.message).not.toContain(hiddenKey);
    expect(error.message).not.toContain(hiddenValue);
    expect(typeof result).toBe("symbol");
    expect(JSON.stringify(candidate)).toBe(before);
  });

  it("projects every direct many-to-many target as a reference-only nonclaim", () => {
    const { profile, engineProjection } = inputs();
    const projection = createTaxonomyProjection(
      profile,
      engineProjection,
      validTaxonomyBundle,
      cloudRequest,
    );

    expect(Object.keys(projection).sort()).toEqual([
      "classifications",
      "context",
      "profileBundleRef",
      "schemaVersion",
      "taxonomyBundleRef",
    ]);
    expect(projection.context.disclosureState).toBe(
      "authorized_subset_not_comprehensive",
    );
    expect(projection.classifications).toHaveLength(7);
    expect(
      projection.classifications.filter(
        ({ assignmentRef }) =>
          assignmentRef.id === "synthetic-source-assignment",
      ),
    ).toHaveLength(2);
    expect(
      projection.classifications.filter(
        ({ assignmentRef }) =>
          assignmentRef.id === "synthetic-configured-assignment",
      ),
    ).toHaveLength(3);
    expect(
      projection.classifications.filter(
        ({ assignmentRef }) =>
          assignmentRef.id === "synthetic-analyst-assignment",
      ),
    ).toHaveLength(1);
    expect(
      projection.classifications.find(
        ({ assignmentRef }) =>
          assignmentRef.id === "synthetic-unclassified-assignment",
      )?.resolutionState,
    ).toBe("unclassified");

    for (const classification of projection.classifications) {
      expect(Object.keys(classification).sort()).toEqual([
        "assignmentKind",
        "assignmentRef",
        "authorityBindingRefs",
        "crosswalkRef",
        "evidenceRefs",
        "nonClaims",
        "recordId",
        "resolutionState",
        "reviewAttestationRefs",
        "sourceConceptRef",
        "targetConceptRef",
        "targetNamespaceRef",
      ]);
      expect(classification.nonClaims).toEqual(REQUIRED_TAXONOMY_NONCLAIMS);
      if (classification.resolutionState === "mapped") {
        expect(classification.targetConceptRef?.namespaceRef.id).toBe(
          "synthetic-project-general",
        );
        expect(classification.crosswalkRef).not.toBeNull();
      }
    }
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.classifications)).toBe(true);
    expect(Object.isFrozen(projection.classifications[0]!.evidenceRefs)).toBe(
      true,
    );
  });

  it("keeps unmapped and not-assessed distinct without inventing Unclassified", () => {
    const { profile, engineProjection } = inputs();
    const projection = createTaxonomyProjection(
      profile,
      engineProjection,
      validTaxonomyBundle,
      glassRequest,
    );

    expect(projection.classifications).toHaveLength(2);
    expect(
      projection.classifications.map(({ resolutionState }) => resolutionState),
    ).toEqual(["unmapped", "not_assessed"]);
    const unmapped = projection.classifications.find(
      ({ resolutionState }) => resolutionState === "unmapped",
    );
    const notAssessed = projection.classifications.find(
      ({ resolutionState }) => resolutionState === "not_assessed",
    );
    expect(unmapped?.sourceConceptRef).not.toBeNull();
    expect(unmapped?.targetConceptRef).toBeNull();
    expect(unmapped?.crosswalkRef).toBeNull();
    expect(notAssessed?.sourceConceptRef).toBeNull();
    expect(
      projection.classifications.some(
        ({ resolutionState }) => resolutionState === "unclassified",
      ),
    ).toBe(false);
  });

  it("omits an accepted assignment whose exact review occurs after the request date", () => {
    const { profile, engineProjection } = inputs();
    const candidate = structuredClone(validTaxonomyBundle);
    const review = candidate.reviewAttestations.find(
      ({ id }) => id === "synthetic-source-assignment-review",
    );
    if (review === undefined) {
      throw new Error("source assignment review fixture is missing");
    }
    review.reviewedAt = "3785-07-01T00:00:00Z";
    const candidateBefore = JSON.stringify(candidate);
    const engineBefore = serializeEngineProjection(engineProjection);

    const projection = createTaxonomyProjection(
      profile,
      engineProjection,
      candidate,
      cloudRequest,
    );
    const replay = createTaxonomyProjection(
      structuredClone(profile),
      structuredClone(engineProjection),
      structuredClone(candidate),
      structuredClone(cloudRequest),
    );

    expect(projection.classifications).toHaveLength(5);
    expect(
      projection.classifications.some(
        ({ recordId }) => recordId === "psr:synthetic-federal:record-002",
      ),
    ).toBe(false);
    expect(
      projection.classifications.some(
        ({ recordId, resolutionState }) =>
          recordId === "psr:synthetic-federal:record-002" &&
          resolutionState === "unclassified",
      ),
    ).toBe(false);
    expect(serializeTaxonomyProjection(replay)).toBe(
      serializeTaxonomyProjection(projection),
    );
    expect(Object.isFrozen(projection)).toBe(true);
    expect(JSON.stringify(candidate)).toBe(candidateBefore);
    expect(serializeEngineProjection(engineProjection)).toBe(engineBefore);
  });

  it("never projects inactive mappings or assignments and never traverses beyond direct edges", () => {
    const { profile, engineProjection } = inputs();
    const projection = createTaxonomyProjection(
      profile,
      engineProjection,
      validTaxonomyBundle,
      cloudRequest,
    );
    const bytes = serializeTaxonomyProjection(projection);

    for (const inactive of [
      "synthetic-pending-crosswalk",
      "synthetic-rejected-crosswalk",
      "synthetic-withdrawn-crosswalk",
      "synthetic-disputed-crosswalk",
      "synthetic-expired-crosswalk",
      '"synthetic-history-crosswalk","version":"1.0.0"',
      "synthetic-pending-assignment",
      "synthetic-disputed-assignment",
      "synthetic-rejected-assignment",
      "synthetic-withdrawn-assignment",
      "synthetic-superseded-assignment",
      "synthetic-expired-assignment",
    ]) {
      expect(bytes).not.toContain(inactive);
    }
    expect(
      projection.classifications.every(
        ({ sourceConceptRef, targetConceptRef }) =>
          sourceConceptRef === null ||
          targetConceptRef === null ||
          (sourceConceptRef.namespaceRef.id !== "synthetic-project-general" &&
            targetConceptRef.namespaceRef.id === "synthetic-project-general"),
      ),
    ).toBe(true);
    expect(
      projection.classifications.map((classification) =>
        [
          classification.recordId,
          classification.sourceConceptRef?.namespaceRef.id ?? "",
          classification.sourceConceptRef?.conceptRef.id ?? "",
          classification.targetConceptRef?.conceptRef.id ?? "",
          classification.crosswalkRef?.id ?? "",
          classification.assignmentRef.id,
        ].join("|"),
      ),
    ).toEqual([
      "psr:synthetic-federal:record-001|||||synthetic-unclassified-assignment",
      "psr:synthetic-federal:record-002|synthetic-source-a|synthetic-shared-term|synthetic-general-environment|synthetic-source-a-crosswalk|synthetic-source-assignment",
      "psr:synthetic-federal:record-002|synthetic-source-a|synthetic-shared-term|synthetic-general-water|synthetic-source-a-crosswalk|synthetic-source-assignment",
      "psr:synthetic-federal:record-003|synthetic-community-a|synthetic-shared-term|synthetic-general-climate|synthetic-community-a-crosswalk|synthetic-configured-assignment",
      "psr:synthetic-federal:record-003|synthetic-community-a|synthetic-shared-term|synthetic-general-environment|synthetic-community-a-crosswalk|synthetic-configured-assignment",
      "psr:synthetic-federal:record-003|synthetic-community-a|synthetic-shared-term|synthetic-general-water|synthetic-community-a-crosswalk|synthetic-configured-assignment",
      "psr:synthetic-federal:record-004|synthetic-regional-organization|synthetic-shared-term|synthetic-general-climate|synthetic-regional-crosswalk|synthetic-analyst-assignment",
    ]);
  });

  it("serializes byte-identically across set-like permutations and replay", () => {
    const { profile, engineProjection } = inputs();
    const baseline = createTaxonomyProjection(
      profile,
      engineProjection,
      validTaxonomyBundle,
      cloudRequest,
    );
    const permuted = createTaxonomyProjection(
      profile,
      engineProjection,
      reverseSetLikeCollections(),
      cloudRequest,
    );
    const replay = createTaxonomyProjection(
      structuredClone(profile),
      structuredClone(engineProjection),
      structuredClone(validTaxonomyBundle),
      structuredClone(cloudRequest),
    );
    const baselineBytes = serializeTaxonomyProjection(baseline);

    expect(serializeTaxonomyProjection(permuted)).toBe(baselineBytes);
    expect(serializeTaxonomyProjection(replay)).toBe(baselineBytes);
    expect(digest(serializeTaxonomyProjection(permuted))).toBe(
      digest(baselineBytes),
    );
    expect(digest(serializeTaxonomyProjection(replay))).toBe(
      digest(baselineBytes),
    );
  });

  it("fails late and atomically without mutating inputs, prior output, or leaking values", () => {
    const { profile, records, engineProjection } = inputs();
    const profileBefore = JSON.stringify(profile);
    const engineBefore = serializeEngineProjection(engineProjection);
    const recordsBefore = records.map((record) => JSON.stringify(record));
    const bundleBefore = JSON.stringify(validTaxonomyBundle);
    const earlier = createTaxonomyProjection(
      profile,
      engineProjection,
      validTaxonomyBundle,
      cloudRequest,
    );
    const earlierBytes = serializeTaxonomyProjection(earlier);
    const candidate = structuredClone(validTaxonomyBundle);
    const sentinel = "Synthetic Hidden Scheme Must Not Leak";
    candidate.assignments[0]!.sourceProvidedLabel!.scheme = sentinel;
    const candidateBefore = JSON.stringify(candidate);
    let result: TaxonomyProjection | symbol = Symbol("no partial projection");

    const error = captureValidationError(() => {
      result = createTaxonomyProjection(
        profile,
        engineProjection,
        candidate,
        cloudRequest,
      );
    });
    expect(error.code).toBe("INVALID_SOURCE_LABEL");
    expect(error.path).toBe("/assignments/7/sourceProvidedLabel");
    expect(error.message).not.toContain(sentinel);
    expect(typeof result).toBe("symbol");
    expect(JSON.stringify(candidate)).toBe(candidateBefore);
    expect(JSON.stringify(validTaxonomyBundle)).toBe(bundleBefore);
    expect(JSON.stringify(profile)).toBe(profileBefore);
    expect(serializeEngineProjection(engineProjection)).toBe(engineBefore);
    expect(records.map((record) => JSON.stringify(record))).toEqual(
      recordsBefore,
    );
    expect(serializeTaxonomyProjection(earlier)).toBe(earlierBytes);
  });

  it("rejects a false Unclassified mirror instead of using it as recovery", () => {
    const profile = taxonomyProfile();
    const records = taxonomyRecords();
    const record = records.find(
      ({ internalId }) => internalId === "psr:synthetic-federal:record-001",
    );
    if (record === undefined) {
      throw new Error("unclassified record fixture is missing");
    }
    record.isUnclassified = false;
    const engineProjection = createEngineProjection(records, profile);
    let result: TaxonomyProjection | symbol = Symbol("no partial projection");

    const error = captureValidationError(() => {
      result = createTaxonomyProjection(
        profile,
        engineProjection,
        validTaxonomyBundle,
        cloudRequest,
      );
    });
    expect(error.code).toBe("INVALID_ASSIGNMENT");
    expect(error.path).toBe("/assignments/9/kind");
    expect(typeof result).toBe("symbol");
  });

  it("rejects a forged engine record with neither memberships nor Unclassified state", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const recordIndex = projection.records.findIndex(
          ({ internalId }) => internalId === "psr:synthetic-federal:record-006",
        );
        expect(recordIndex).toBe(5);
        const record = projection.records[recordIndex] as unknown as {
          isUnclassified: boolean;
          taxonomyMemberships: unknown[];
        };
        expect(record.taxonomyMemberships).toHaveLength(0);
        expect(record.isUnclassified).toBe(true);
        record.isUnclassified = false;
      },
      "INVALID_RECORD",
      "/engineProjection/records/5",
    );
  });

  it("rejects a forged engine record with memberships and a false Unclassified mirror", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const mutable = mutableEngineProjection(projection);
        const record = mutable.records[5];
        expect(record?.internalId).toBe("psr:synthetic-federal:record-006");
        if (record === undefined) {
          throw new Error("forged membership record is missing");
        }
        record.taxonomyMemberships = [
          {
            categoryId: "environmental-protection-pollution-governance",
            subcategoryId: null,
            mappingRuleId: "synthetic-exact-subject",
            taxonomyVersion: "1.0.0",
            officialSubjectLabels: ["Synthetic Shared Monitor"],
          },
        ];
        expect(record.isUnclassified).toBe(true);
        const rebuilt = createEngineProjection(
          mutable.records as unknown as PolicyRecord[],
          taxonomyProfile(),
        );
        mutable.views = structuredClone(
          rebuilt.views,
        ) as unknown as MutableEngineView[];
      },
      "INVALID_RECORD",
      "/engineProjection/records/5",
    );
  });

  it("rejects a forged engine record with a non-PolicyRecord schema version", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        expect(projection.records[0]?.internalId).toBe(
          "psr:synthetic-federal:record-001",
        );
        (
          projection.records[0] as unknown as {
            schemaVersion: string;
          }
        ).schemaVersion = "9.9.9";
      },
      "INVALID_RECORD",
      "/engineProjection/records/0/schemaVersion",
    );
  });

  it("rejects a forged engine record missing a required PolicyRecord field", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const record = mutableEngineProjection(projection).records[0];
        expect(record?.internalId).toBe("psr:synthetic-federal:record-001");
        if (record === undefined) {
          throw new Error("forged record is missing");
        }
        delete record.texts;
      },
      "INVALID_RECORD",
      "/engineProjection/records/0",
    );
  });

  it("rejects a forged engine record carrying an extra PolicyRecord field", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const record = mutableEngineProjection(projection).records[0];
        expect(record?.internalId).toBe("psr:synthetic-federal:record-001");
        if (record === undefined) {
          throw new Error("forged record is missing");
        }
        record.syntheticUnexpectedRecordField = "synthetic-hidden-record";
      },
      "INVALID_RECORD",
      "/engineProjection/records/0",
    );
  });

  it("rejects a forged engine view record reference without reasons", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        expect(projection.views[0]?.id).toBe(
          "synthetic-cloud-harbor-researcher",
        );
        expect(projection.views[0]?.recordReferences[0]?.recordId).toBe(
          "psr:synthetic-federal:record-001",
        );
        delete (
          projection.views[0]!.recordReferences[0] as unknown as {
            reasons?: unknown;
          }
        ).reasons;
      },
      "INVALID_SHAPE",
      "/engineProjection/views/0/recordReferences/0/reasons",
    );
  });

  it("rejects a forged engine view with altered record reasons", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const reason =
          mutableEngineProjection(projection).views[0]?.recordReferences[0]
            ?.reasons[0];
        if (reason === undefined) {
          throw new Error("forged view reason is missing");
        }
        expect(reason.reviewState).toBe("synthetic_reviewed");
        reason.reviewState = "candidate_pending";
      },
      "INVALID_ENGINE_PROJECTION",
      "/engineProjection",
    );
  });

  it("rejects an engine record reference moved between persona views", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const views = mutableEngineProjection(projection).views;
        const cloud = views[0];
        const glass = views[1];
        if (cloud === undefined || glass === undefined) {
          throw new Error("forged persona views are missing");
        }
        const [moved] = cloud.recordReferences.splice(0, 1);
        if (moved === undefined) {
          throw new Error("forged record reference is missing");
        }
        glass.recordReferences.push(moved);
      },
      "INVALID_ENGINE_PROJECTION",
      "/engineProjection",
    );
  });

  it("rejects duplicate engine record references", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const references =
          mutableEngineProjection(projection).views[0]?.recordReferences;
        if (references?.[0] === undefined || references[1] === undefined) {
          throw new Error("forged record references are missing");
        }
        references[1] = structuredClone(references[0]);
      },
      "INVALID_ENGINE_PROJECTION",
      "/engineProjection",
    );
  });

  it("rejects an extra engine record reference in a persona view", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const views = mutableEngineProjection(projection).views;
        const cloud = views[0];
        const glassReference = views[1]?.recordReferences[0];
        if (cloud === undefined || glassReference === undefined) {
          throw new Error("forged record reference fixtures are missing");
        }
        cloud.recordReferences.push(structuredClone(glassReference));
      },
      "INVALID_ENGINE_PROJECTION",
      "/engineProjection",
    );
  });

  it("rejects an extra field on an engine record reference", () => {
    expectForgedEngineProjectionRejected(
      (projection) => {
        const reference =
          mutableEngineProjection(projection).views[0]?.recordReferences[0];
        if (reference === undefined) {
          throw new Error("forged record reference is missing");
        }
        reference.syntheticUnexpectedReferenceField =
          "synthetic-hidden-reference";
      },
      "INVALID_SHAPE",
      "/engineProjection/views/0/recordReferences/0",
    );
  });

  it("preserves exact source scheme and label without label-based identity", () => {
    const parsed = parseTaxonomyBundle(validTaxonomyBundle);
    const sourceAssignment = parsed.assignments.find(
      ({ id }) => id === "synthetic-source-assignment",
    );
    expect(sourceAssignment?.sourceProvidedLabel).toEqual({
      sourceId: "synthetic-federal",
      scheme: "synthetic-topic",
      label: "Synthetic Shared Monitor",
    });
    expect(
      parsed.concepts.filter(
        (concept) =>
          concept.kind === "authority_native" &&
          concept.preferredLabel === "Synthetic Shared Monitor",
      ),
    ).toHaveLength(6);
    expect(
      new Set(
        parsed.concepts
          .filter(
            (concept) =>
              concept.kind === "authority_native" &&
              concept.preferredLabel === "Synthetic Shared Monitor",
          )
          .map(
            ({ namespaceRef }) => `${namespaceRef.id}@${namespaceRef.version}`,
          ),
      ).size,
    ).toBe(6);
    expect(
      parsed.namespaces
        .filter(({ role }) => role === "source_native")
        .map(({ id, officialSubjectScheme }) => ({
          id,
          officialSubjectScheme,
        })),
    ).toEqual([
      {
        id: "synthetic-source-a",
        officialSubjectScheme: "synthetic-topic",
      },
      {
        id: "synthetic-source-b",
        officialSubjectScheme: "synthetic-other-topic",
      },
    ]);
    expect(
      parsed.namespaces
        .filter(({ role }) => role !== "source_native")
        .every(({ officialSubjectScheme }) => officialSubjectScheme === null),
    ).toBe(true);
    expect(
      parsed.concepts.filter(
        (concept) =>
          concept.kind === "authority_native" &&
          ["synthetic-source-a", "synthetic-source-b"].includes(
            concept.namespaceRef.id,
          ) &&
          concept.preferredLabel === "Synthetic Shared Monitor",
      ),
    ).toHaveLength(2);
  });
});
