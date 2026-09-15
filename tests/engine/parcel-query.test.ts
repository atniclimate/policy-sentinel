import { describe, expect, it } from "vitest";

import boundaryFixture from "../../fixtures/engine/land-boundary.synthetic.valid.json";
import parcelFixture from "../../fixtures/engine/land-parcel.synthetic.valid.json";
import countyRecordFixture from "../../fixtures/records/county-explicit.valid.json";
import federalRecordFixture from "../../fixtures/records/general-jurisdiction.valid.json";
import accordRecordFixture from "../../fixtures/records/intergovernmental-accord.valid.json";
import {
  parseLandBoundary,
  type LandBoundary,
} from "../../src/engine/land-boundary-contracts";
import {
  parseLandParcel,
  type JurisdictionLayer,
  type LandParcel,
} from "../../src/engine/land-parcel-contracts";
import {
  layerMatchesRecord,
  resolveParcelQuery,
  serializeParcelQueryResult,
} from "../../src/engine/parcel-query";
import type { PolicyRecord } from "../../src/shared/contracts";
import {
  createSyntheticInMemoryPrivateContextAdapter,
  PrivateContextError,
  SYNTHETIC_PRIVATE_CONTEXT_ADAPTER_ID,
} from "../../src/engine/authorized-private-context-adapter";
import type {
  AuthorizedInput,
  DeploymentContext,
} from "../../src/engine/authorized-private-context-adapter";

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

function parsedParcel(): LandParcel {
  return parseLandParcel(
    structuredClone(parcelFixture) as unknown as LandParcel,
  );
}

function parsedBoundary(): LandBoundary {
  return parseLandBoundary(
    structuredClone(boundaryFixture) as unknown as LandBoundary,
  );
}

function federalRecord(): PolicyRecord {
  return structuredClone(federalRecordFixture) as PolicyRecord;
}

function countyRecord(): PolicyRecord {
  return structuredClone(countyRecordFixture) as PolicyRecord;
}

function accordRecord(): PolicyRecord {
  return structuredClone(accordRecordFixture) as PolicyRecord;
}

function privateFailure(run: () => unknown): PrivateContextError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PrivateContextError);
    return error as PrivateContextError;
  }
  throw new Error("private context adapter accepted an invalid call");
}

describe("parcel-scoped record query", () => {
  it("unions federal and both county/tribal layers, and excludes the unrelated state accord record", () => {
    const parcel = parsedParcel();
    const records = [federalRecord(), countyRecord(), accordRecord()];
    const result = resolveParcelQuery(parcel, records);

    expect(result.parcelId).toBe(parcel.parcelId);
    expect(result.layerCount).toBe(3);
    expect(result.unmatchedLayerIndexes).toEqual([]);
    expect(result.records.map((entry) => entry.internalId)).toEqual([
      countyRecordFixture.internalId,
      federalRecordFixture.internalId,
    ]);

    const county = result.records.find(
      (entry) => entry.internalId === countyRecordFixture.internalId,
    )!;
    expect(county.whyAssociated.map((w) => w.layerIndex)).toEqual([1, 2]);
    expect(county.whyAssociated[0]!.level).toBe("county");
    expect(county.whyAssociated[1]!.level).toBe("tribal");

    const federal = result.records.find(
      (entry) => entry.internalId === federalRecordFixture.internalId,
    )!;
    expect(federal.whyAssociated.map((w) => w.layerIndex)).toEqual([0]);
    expect(federal.whyAssociated[0]!.level).toBe("federal");

    expect(
      result.records.find(
        (entry) => entry.internalId === accordRecordFixture.internalId,
      ),
    ).toBeUndefined();
  });

  it("matches only the county layer for a county-only parcel", () => {
    const countyOnlyInput = structuredClone(parcelFixture);
    countyOnlyInput.jurisdictionLayers = [
      countyOnlyInput.jurisdictionLayers[1]!,
    ];
    countyOnlyInput.sensitivity = "restricted";
    const countyOnlyParcel = parseLandParcel(
      countyOnlyInput as unknown as LandParcel,
    );
    const records = [federalRecord(), countyRecord(), accordRecord()];
    const result = resolveParcelQuery(countyOnlyParcel, records);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.internalId).toBe(countyRecordFixture.internalId);
    expect(result.records[0]!.whyAssociated).toHaveLength(1);
    expect(result.records[0]!.whyAssociated[0]!.level).toBe("county");
    expect(result.unmatchedLayerIndexes).toEqual([]);
  });

  it("leaves a tribal layer unmatched when no validated nation association carries its nationId", () => {
    const tribalOnlyInput = structuredClone(parcelFixture);
    const tribalLayer = tribalOnlyInput.jurisdictionLayers[2]!;
    tribalOnlyInput.jurisdictionLayers = [
      { ...tribalLayer, nationId: "nation:synthetic-z" },
    ];
    const tribalOnlyParcel = parseLandParcel(
      tribalOnlyInput as unknown as LandParcel,
    );
    const records = [federalRecord(), countyRecord(), accordRecord()];
    const result = resolveParcelQuery(tribalOnlyParcel, records);

    expect(result.records).toEqual([]);
    expect(result.unmatchedLayerIndexes).toEqual([0]);
  });

  it("never matches a tribal layer through jurisdiction.name alone", () => {
    const parcel = parsedParcel();
    const tribalLayer = parcel.jurisdictionLayers[2]!;
    const jurisdictionNameTrap = countyRecord();
    jurisdictionNameTrap.jurisdiction = {
      ...jurisdictionNameTrap.jurisdiction,
      name: tribalLayer.authorityName,
    };
    jurisdictionNameTrap.nationAssociations = [];

    expect(layerMatchesRecord(tribalLayer, jurisdictionNameTrap)).toBe(false);

    const tribalOnlyInput = structuredClone(parcelFixture);
    tribalOnlyInput.jurisdictionLayers = [
      tribalOnlyInput.jurisdictionLayers[2]!,
    ];
    const tribalOnlyParcel = parseLandParcel(
      tribalOnlyInput as unknown as LandParcel,
    );
    const result = resolveParcelQuery(tribalOnlyParcel, [jurisdictionNameTrap]);
    expect(result.records).toEqual([]);
    expect(result.unmatchedLayerIndexes).toEqual([0]);
  });

  it("does not match a tribal layer through a pending nation association", () => {
    const parcel = parsedParcel();
    const tribalLayer = parcel.jurisdictionLayers[2]!;
    const pendingAssociation = countyRecord();
    pendingAssociation.nationAssociations =
      pendingAssociation.nationAssociations.map((association) => ({
        ...association,
        validationState: "pending",
      }));

    expect(layerMatchesRecord(tribalLayer, pendingAssociation)).toBe(false);
  });

  it("matches a tribal layer only by nationId, never by an equal official name", () => {
    const parcel = parsedParcel();
    const tribalLayer = parcel.jurisdictionLayers[2]!;
    const sameNameDifferentId = countyRecord();
    sameNameDifferentId.nationAssociations =
      sameNameDifferentId.nationAssociations.map((association) => ({
        ...association,
        nationId: "nation:synthetic-other",
      }));
    expect(layerMatchesRecord(tribalLayer, sameNameDifferentId)).toBe(false);

    const sameIdDifferentName = countyRecord();
    sameIdDifferentName.nationAssociations =
      sameIdDifferentName.nationAssociations.map((association) => ({
        ...association,
        officialNationName: "Synthetic Nation A (later name)",
      }));
    expect(layerMatchesRecord(tribalLayer, sameIdDifferentName)).toBe(true);

    const result = resolveParcelQuery(parcel, [sameIdDifferentName]);
    const match = result.records[0]!.whyAssociated.find(
      (why) => why.level === "tribal",
    )!;
    expect(match.nationId).toBe("nation:synthetic-a");
  });

  it("narrows every layer's candidates by taxonomyCategoryIds", () => {
    const parcel = parsedParcel();
    const taxonomyRecord = federalRecord();
    taxonomyRecord.internalId = "psr:synthetic-federal:record-002";
    taxonomyRecord.taxonomyMemberships = [
      {
        categoryId: "synthetic-category",
        subcategoryId: null,
        mappingRuleId: "synthetic-rule",
        taxonomyVersion: "1.0.0",
        officialSubjectLabels: ["Synthetic Subject Label"],
      },
    ];
    taxonomyRecord.officialSubjects = [
      {
        scheme: "synthetic-scheme",
        label: "Synthetic Subject Label",
        sourceUrl: "https://federal.example.invalid/subjects/synthetic",
      },
    ];

    const result = resolveParcelQuery(
      parcel,
      [taxonomyRecord, federalRecord()],
      {
        taxonomyCategoryIds: ["synthetic-category"],
      },
    );
    expect(result.records.map((entry) => entry.internalId)).toEqual([
      taxonomyRecord.internalId,
    ]);
  });

  it("narrows every layer's candidates by officialSubjectLabels", () => {
    const parcel = parsedParcel();
    const subjectRecord = federalRecord();
    subjectRecord.internalId = "psr:synthetic-federal:record-003";
    subjectRecord.officialSubjects = [
      {
        scheme: "synthetic-scheme",
        label: "Synthetic Subject Label",
        sourceUrl: "https://federal.example.invalid/subjects/synthetic",
      },
    ];

    const result = resolveParcelQuery(
      parcel,
      [subjectRecord, federalRecord()],
      {
        officialSubjectLabels: ["Synthetic Subject Label"],
      },
    );
    expect(result.records.map((entry) => entry.internalId)).toEqual([
      subjectRecord.internalId,
    ]);
  });

  it("returns a frozen, detached result and never mutates or freezes its inputs", () => {
    const parcel = parsedParcel();
    const records = [federalRecord(), countyRecord(), accordRecord()];
    const parcelBefore = JSON.stringify(parcel);
    const recordsBefore = records.map(canonical);

    const result = resolveParcelQuery(parcel, records);

    expect(JSON.stringify(parcel)).toBe(parcelBefore);
    expect(records.map(canonical)).toEqual(recordsBefore);
    expect(Object.isFrozen(records[0])).toBe(false);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.records)).toBe(true);
    expect(Object.isFrozen(result.records[0])).toBe(true);
    expect(Object.isFrozen(result.records[0]!.whyAssociated)).toBe(true);
    expect(Object.isFrozen(result.unmatchedLayerIndexes)).toBe(true);
  });

  it("serializes byte-stably and never leaks applicability-shaped keys", () => {
    const parcel = parsedParcel();
    const records = [federalRecord(), countyRecord(), accordRecord()];
    const result = resolveParcelQuery(parcel, records);
    const result2 = resolveParcelQuery(parsedParcel(), [
      federalRecord(),
      countyRecord(),
      accordRecord(),
    ]);

    const bytes1 = serializeParcelQueryResult(result);
    const bytes2 = serializeParcelQueryResult(result2);
    expect(bytes1).toBe(bytes2);
    // The fixed PARCEL_QUERY_NONCLAIMS boilerplate legitimately contains
    // "not_an_applicability_determination", so "applicab" cannot be banned
    // outright; assert instead that no *other* applicability-shaped text
    // leaks in beyond that one fixed non-claim string.
    expect(
      bytes1.replaceAll("not_an_applicability_determination", ""),
    ).not.toContain("applicab");
    expect(bytes1).not.toContain("jurisdictionDetermination");
    expect(bytes1).not.toContain("rightsImpact");
  });

  it("layerMatchesRecord implements each of the five documented match rules", () => {
    const parcel = parsedParcel();
    const [federalLayer, countyLayer, tribalLayer] = parcel.jurisdictionLayers;
    const stateLayer: JurisdictionLayer = {
      level: "state",
      authorityName: "Synthetic State",
      nationId: null,
      evidenceUrl:
        "https://accord.example.invalid/jurisdiction/synthetic-state-layer",
      evidenceDate: "2026-08-01",
    };

    expect(layerMatchesRecord(federalLayer!, federalRecord())).toBe(true);
    expect(layerMatchesRecord(stateLayer, accordRecord())).toBe(true);
    expect(layerMatchesRecord(countyLayer!, countyRecord())).toBe(true);
    expect(layerMatchesRecord(tribalLayer!, countyRecord())).toBe(true);

    const jurisdictionNameOnly = countyRecord();
    jurisdictionNameOnly.jurisdiction = {
      ...jurisdictionNameOnly.jurisdiction,
      name: tribalLayer!.authorityName,
    };
    jurisdictionNameOnly.nationAssociations = [];
    expect(layerMatchesRecord(tribalLayer!, jurisdictionNameOnly)).toBe(false);
  });
});

describe("synthetic in-memory private context adapter", () => {
  it("has the documented adapter id", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    expect(adapter.adapterId).toBe(SYNTHETIC_PRIVATE_CONTEXT_ADAPTER_ID);
    expect(adapter.adapterId).toBe("synthetic-in-memory-private-context");
  });

  it("enforces a private, loopback-only deployment", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    expect(
      privateFailure(() =>
        adapter.assertDeploymentIsPrivate({
          deploymentProfile: "public",
          deploymentId: "synthetic-deployment",
          loopbackOnly: true,
        }),
      ).code,
    ).toBe("DEPLOYMENT_NOT_PRIVATE");
    expect(
      privateFailure(() =>
        adapter.assertDeploymentIsPrivate({
          deploymentProfile: "private",
          deploymentId: "synthetic-deployment",
          loopbackOnly: false,
        }),
      ).code,
    ).toBe("DEPLOYMENT_NOT_PRIVATE");
    expect(() =>
      adapter.assertDeploymentIsPrivate({
        deploymentProfile: "private",
        deploymentId: "synthetic-deployment",
        loopbackOnly: true,
      }),
    ).not.toThrow();
  });

  function baseAuthorizedInput(): AuthorizedInput {
    return {
      adapterId: SYNTHETIC_PRIVATE_CONTEXT_ADAPTER_ID,
      trustDomain: "synthetic_test_only",
      boundaries: [parsedBoundary()],
      parcels: [parsedParcel()],
      authorization: {
        kind: "synthetic_test_authorization",
        reference: "synthetic-authorization-1",
        issuedAt: "2026-09-15",
      },
    };
  }

  const privateDeploymentContext: DeploymentContext = {
    deploymentProfile: "private",
    deploymentId: "synthetic-deployment",
    loopbackOnly: true,
  };

  it("verifies a synthetic authorized input with a stable 64-hex digest", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const authorization1 = adapter.verifyWrittenAuthorization(
      baseAuthorizedInput(),
    );
    const authorization2 = adapter.verifyWrittenAuthorization(
      baseAuthorizedInput(),
    );
    expect(authorization1.state).toBe("verified");
    expect(authorization1.inputDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(authorization1.inputDigest).toBe(authorization2.inputDigest);
  });

  it("rejects a private_local_authorized trust domain on the synthetic adapter", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input: AuthorizedInput = {
      ...baseAuthorizedInput(),
      trustDomain: "private_local_authorized",
      authorization: {
        kind: "written_owner_and_nation_authorization",
        reference: "synthetic-authorization-1",
        issuedAt: "2026-09-15",
      },
    };
    const error = privateFailure(() =>
      adapter.verifyWrittenAuthorization(input),
    );
    expect(error.code).toBe("REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER");
  });

  it("rejects an authorization kind that does not match the trust domain", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input: AuthorizedInput = {
      ...baseAuthorizedInput(),
      authorization: {
        kind: "written_owner_and_nation_authorization",
        reference: "synthetic-authorization-1",
        issuedAt: "2026-09-15",
      },
    };
    const error = privateFailure(() =>
      adapter.verifyWrittenAuthorization(input),
    );
    expect(error.code).toBe("AUTHORIZATION_KIND_MISMATCH");
  });

  it("rejects an adapterId that does not match the adapter", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input: AuthorizedInput = {
      ...baseAuthorizedInput(),
      adapterId: "some-other-adapter",
    };
    const error = privateFailure(() =>
      adapter.verifyWrittenAuthorization(input),
    );
    expect(error.code).toBe("ADAPTER_ID_MISMATCH");
  });

  it("rejects a parcel boundaryRef with no matching boundary", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input: AuthorizedInput = { ...baseAuthorizedInput(), boundaries: [] };
    const error = privateFailure(() =>
      adapter.verifyWrittenAuthorization(input),
    );
    expect(error.code).toBe("BOUNDARY_REFERENCE_UNRESOLVED");
  });

  it("rejects connectLocally when the authorization does not match the exact input", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input = baseAuthorizedInput();
    const authorization = adapter.verifyWrittenAuthorization(input);
    const tampered = {
      ...authorization,
      reference: "synthetic-authorization-tampered",
    };
    const error = privateFailure(() =>
      adapter.connectLocally(privateDeploymentContext, input, tampered),
    );
    expect(error.code).toBe("AUTHORIZATION_NOT_VERIFIED");
  });

  it("enriches a private view with resolveParcelQuery results and rejects a mismatched adapter", () => {
    const adapter = createSyntheticInMemoryPrivateContextAdapter();
    const input = baseAuthorizedInput();
    const authorization = adapter.verifyWrittenAuthorization(input);
    const context = adapter.connectLocally(
      privateDeploymentContext,
      input,
      authorization,
    );
    const records = [federalRecord(), countyRecord(), accordRecord()];

    const view = adapter.enrichPrivateView(records, context);
    expect(view.deploymentProfile).toBe("private");
    expect(view.trustDomain).toBe("synthetic_test_only");
    expect(view.parcelQueries).toHaveLength(1);
    const expected = resolveParcelQuery(input.parcels[0]!, records);
    expect(canonical(view.parcelQueries[0]!.result)).toBe(canonical(expected));

    const mismatchedContext = { ...context, adapterId: "some-other-adapter" };
    const error = privateFailure(() =>
      adapter.enrichPrivateView(records, mismatchedContext),
    );
    expect(error.code).toBe("CONTEXT_MISMATCH");
  });
});
