import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import enumerationManifest from "../../../fixtures/sources/washington-lws/enumeration-fixture-manifest.valid.json";
import { describe, expect, it } from "vitest";

import {
  WASHINGTON_LWS_KNOWN_BILL_OPERATIONS,
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
} from "../../../src/contracts/washington-lws/constants";
import { WashingtonLwsContractError } from "../../../src/contracts/washington-lws/errors";
import {
  loadWashingtonLwsSyntheticEnumerationEvidence,
  parseWashingtonLwsSyntheticEnumerationManifest,
  WASHINGTON_LWS_REFRESH_CAPABILITY,
} from "../../../src/contracts/washington-lws/refresh-contract";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function fixture(): Uint8Array {
  return readFileSync(
    path.resolve(
      projectRoot,
      "fixtures/sources/washington-lws/get-legislation-by-year.valid.xml",
    ),
  );
}

function replace(value: Uint8Array, from: string, to: string): Uint8Array {
  const original = new TextDecoder().decode(value);
  const changed = original.replace(from, to);
  expect(changed).not.toBe(original);
  return new TextEncoder().encode(changed);
}

describe("Washington LWS refresh-discovery contract", () => {
  it("runtime-freezes every node in the machine-readable capability graph", () => {
    expect(Object.isFrozen(WASHINGTON_LWS_REFRESH_CAPABILITY)).toBe(true);
    expect(
      Object.isFrozen(WASHINGTON_LWS_REFRESH_CAPABILITY.pointOperations),
    ).toBe(true);
    for (const capability of Object.values(
      WASHINGTON_LWS_REFRESH_CAPABILITY.pointOperations,
    )) {
      expect(Object.isFrozen(capability)).toBe(true);
      expect(Object.isFrozen(capability.requiredSeed)).toBe(true);
    }

    const candidate =
      WASHINGTON_LWS_REFRESH_CAPABILITY.selectedEnumerationCandidate;
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.formalRequestSequence)).toBe(true);
    expect(Object.isFrozen(candidate.formalRequestSequence[0])).toBe(true);
    expect(Object.isFrozen(candidate.reviewedInitialCanaryYears)).toBe(true);

    const mutableCapability = WASHINGTON_LWS_REFRESH_CAPABILITY as unknown as {
      numericBillRangeScanning: string;
    };
    expect(() =>
      Object.assign(mutableCapability, {
        numericBillRangeScanning: "allowed",
      }),
    ).toThrow(TypeError);
    const mutableCandidate = candidate as unknown as {
      productionEnabled: boolean;
    };
    expect(() =>
      Object.assign(mutableCandidate, { productionEnabled: true }),
    ).toThrow(TypeError);
    expect(WASHINGTON_LWS_REFRESH_CAPABILITY).toMatchObject({
      numericBillRangeScanning: "forbidden",
      selectedEnumerationCandidate: { productionEnabled: false },
    });
  });

  it("pins digest-bound Washington XML to canonical LF repository bytes", () => {
    const attributes = readFileSync(
      path.resolve(projectRoot, ".gitattributes"),
      "utf8",
    );
    expect(attributes).toContain(
      "fixtures/sources/washington-lws/*.xml text eol=lf",
    );
  });

  it("proves every reviewed known-bill operation requires a seed and cannot discover the population", () => {
    expect(
      Object.keys(WASHINGTON_LWS_REFRESH_CAPABILITY.pointOperations),
    ).toEqual(WASHINGTON_LWS_KNOWN_BILL_OPERATIONS);
    for (const operation of WASHINGTON_LWS_KNOWN_BILL_OPERATIONS) {
      const capability =
        WASHINGTON_LWS_REFRESH_CAPABILITY.pointOperations[operation];
      expect(capability.requiredSeed.length).toBeGreaterThan(0);
      expect(capability.populationDiscovery).toBe("none");
    }
    expect(
      WASHINGTON_LWS_REFRESH_CAPABILITY.pointOperationPopulationDiscovery,
    ).toBe("none");
    expect(WASHINGTON_LWS_REFRESH_CAPABILITY.unifiedMutationFeed).toBe("none");
    expect(WASHINGTON_LWS_REFRESH_CAPABILITY.numericBillRangeScanning).toBe(
      "forbidden",
    );
  });

  it("selects one disabled, bounded yearly candidate without claiming completeness", () => {
    expect(
      WASHINGTON_LWS_REFRESH_CAPABILITY.selectedEnumerationCandidate,
    ).toEqual({
      operation: "GetLegislationByYear",
      formalRequestSequence: [{ name: "year", type: "xsd:int" }],
      responseItem: "LegislationInfo",
      providerDescription: "all_bills_active_during_year",
      helpSignatureConflict: "biennium_prose_conflicts_with_xsd_int",
      requestYearEcho: "not_observable",
      pagination: "not_documented",
      providerRowLimit: "not_documented",
      ordering: "not_documented",
      populationCompleteness: "unverified",
      historicalRange: "unverified",
      reviewedInitialCanaryYears: [2025, 2026],
      firstReviewedCanaryYear: 2025,
      repositoryMaximumItems:
        WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislationByYear.maximumItems,
      productionEnabled: false,
    });
  });

  it("loads separate digest-bound synthetic enumeration evidence and preserves repeated rows", () => {
    const evidence = loadWashingtonLwsSyntheticEnumerationEvidence(
      enumerationManifest,
      fixture(),
    );

    expect(evidence).toMatchObject({
      contractVersion: "1.1.0",
      refreshCapabilityVersion: "1.0.0",
      sourceId: "washington-lws",
      providerEnvelope: false,
      operation: "GetLegislationByYear",
      syntheticYear: 3785,
      requestYearEcho: "not_observable",
      populationCompleteness: "not_established",
      historicalCompleteness: "not_documented",
      unifiedMutationFeed: false,
      numericBillRangeScanning: "forbidden",
      orderingBehavior:
        "synthetic_order_preserved_provider_behavior_unverified",
      duplicateBehavior:
        "synthetic_duplicates_preserved_provider_behavior_unverified",
      governance: {
        jurisdiction: "general_jurisdiction",
        classification: "Unclassified",
        nationEvidence: [],
        officialSubjects: [],
        taxonomyMemberships: [],
      },
    });
    expect(evidence.result).toHaveLength(4);
    expect(evidence.result[1]).toEqual(evidence.result[2]);
    expect(evidence.result[3]).toMatchObject({
      biennium: null,
      billId: null,
      billNumber: 999992,
      legislationType: null,
      originalAgency: null,
      displayNumber: null,
    });

    const serialized = JSON.stringify(evidence);
    for (const unsupported of [
      '"internalId"',
      '"fieldProvenance"',
      '"retrievedAt"',
      '"nationAssociations"',
      '"taxonomyMembership"',
      '"legalEffect"',
      '"activeVersion"',
      '"complete"',
    ]) {
      expect(serialized).not.toContain(unsupported);
    }
  });

  it("rejects manifest drift and fixture tampering before projection", () => {
    expect(
      parseWashingtonLwsSyntheticEnumerationManifest(enumerationManifest),
    ).toEqual(enumerationManifest);
    for (const changed of [
      { ...enumerationManifest, populationCompleteness: "complete" },
      { ...enumerationManifest, providerEnvelope: true },
      { ...enumerationManifest, numericBillRangeScanning: "allowed" },
      {
        ...enumerationManifest,
        nationEvidence: ["SYNTHETIC-INFERENCE"],
      },
      {
        ...enumerationManifest,
        resource: {
          ...enumerationManifest.resource,
          sha256: "0".repeat(64),
        },
      },
    ]) {
      expect(() =>
        parseWashingtonLwsSyntheticEnumerationManifest(changed),
      ).toThrowError(WashingtonLwsContractError);
    }

    expect(() =>
      loadWashingtonLwsSyntheticEnumerationEvidence(
        enumerationManifest,
        replace(
          fixture(),
          "SYNTHETIC-YEAR-HB-999991-BASE",
          "SYNTHETIC-YEAR-HB-999991-TAMPERED",
        ),
      ),
    ).toThrowError(/do not match the reviewed enumeration SHA-256/);
    expect(() =>
      loadWashingtonLwsSyntheticEnumerationEvidence(
        enumerationManifest,
        new DataView(new ArrayBuffer(8)),
      ),
    ).toThrowError(/must be supplied as bytes/);
  });
});
