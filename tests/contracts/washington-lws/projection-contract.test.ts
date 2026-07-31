import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import manifestFixture from "../../../fixtures/sources/washington-lws/fixture-manifest.valid.json";
import { describe, expect, it } from "vitest";

import { WashingtonLwsContractError } from "../../../src/contracts/washington-lws/errors";
import {
  loadWashingtonLwsReviewedSyntheticFixtureBundle,
  parseWashingtonLwsSyntheticFixtureManifest,
} from "../../../src/contracts/washington-lws/projection-contract";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const REVIEWED_FIXTURE_FILES = [
  "get-legislation.valid.xml",
  "get-legislative-status-changes-by-bill-id.valid.xml",
  "get-sponsors.valid.xml",
  "get-committee-referrals-by-bill.valid.xml",
  "get-documents.valid.xml",
  "get-session-law-by-bill-id.valid.xml",
  "soap-fault.valid.xml",
] as const;

function fixture(name: string): Uint8Array {
  return readFileSync(
    path.resolve(projectRoot, "fixtures/sources/washington-lws", name),
  );
}

function fixtureBytes(): Record<string, Uint8Array> {
  return Object.fromEntries(
    REVIEWED_FIXTURE_FILES.map((name) => [name, fixture(name)]),
  );
}

function replace(
  bytes: Uint8Array,
  from: string | RegExp,
  to: string,
): Uint8Array {
  const original = new TextDecoder().decode(bytes);
  const changed = original.replace(from, to);
  expect(changed).not.toBe(original);
  return new TextEncoder().encode(changed);
}

function capturedContractError(
  action: () => unknown,
): WashingtonLwsContractError {
  try {
    action();
  } catch (error) {
    if (error instanceof WashingtonLwsContractError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected WashingtonLwsContractError");
}

describe("Washington LWS digest-bound reviewed synthetic fixture bundle", () => {
  it("binds the exact manifest, six present responses, and sanitized fault fixture", () => {
    const bundle = loadWashingtonLwsReviewedSyntheticFixtureBundle(
      manifestFixture,
      fixtureBytes(),
    );

    expect(bundle).toMatchObject({
      fixtureNotice: "Synthetic contract data; not a Washington LWS response.",
      contractVersion: "1.0.0",
      sourceId: "washington-lws",
      providerEnvelope: false,
      identityBehavior: "synthetic_fixture_only_provider_behavior_unverified",
      historicalCompleteness: "not_documented",
      billKey: {
        biennium: "3785-86",
        billNumber: 999991,
      },
      governance: {
        jurisdiction: "general_jurisdiction",
        classification: "Unclassified",
        nationEvidence: [],
        officialSubjects: [],
        taxonomyMemberships: [],
      },
      privacy: {
        reviewedInputContactSentinelsPresent: true,
        knownContactFieldsDiscardedBeforeProjection: true,
      },
    });
    expect(bundle.versions).toHaveLength(2);
    expect(bundle.statusHistory).toHaveLength(2);
    expect(bundle.sponsors).toHaveLength(1);
    expect(bundle.committeeReferrals).toHaveLength(1);
    expect(bundle.documents).toHaveLength(2);
    expect(bundle.sessionLaw).toMatchObject({
      billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
      biennium: "3785-86",
      multipleEffectiveDates: true,
      partialVeto: true,
      veto: false,
    });
    expect(bundle.reviewedFixtureInventory).toHaveLength(7);
    expect(
      bundle.reviewedFixtureInventory.filter(
        ({ outcome }) => outcome === "present",
      ),
    ).toHaveLength(6);
    expect(
      bundle.reviewedFixtureInventory.filter(
        ({ outcome }) => outcome === "fault",
      ),
    ).toHaveLength(1);
  });

  it("proves contact sentinels exist in reviewed inputs and not in projection output", () => {
    const inputs = fixtureBytes();
    const inputText = Object.values(inputs)
      .map((value) => new TextDecoder().decode(value))
      .join("\n");
    const sentinels = [
      "PROHIBITED-SPONSOR-PHONE",
      "PROHIBITED-SPONSOR-EMAIL",
      "PROHIBITED-SPONSOR-FIRST-NAME",
      "PROHIBITED-SPONSOR-LAST-NAME",
      "PROHIBITED-COMMITTEE-PHONE",
    ];
    for (const sentinel of sentinels) {
      expect(inputText).toContain(sentinel);
    }

    const serialized = JSON.stringify(
      loadWashingtonLwsReviewedSyntheticFixtureBundle(manifestFixture, inputs),
    );
    for (const sentinel of sentinels) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it("returns no provider envelope, PolicyRecord, provenance, inferred class, or invented active winner", () => {
    const bundle = loadWashingtonLwsReviewedSyntheticFixtureBundle(
      manifestFixture,
      fixtureBytes(),
    );
    const serialized = JSON.stringify(bundle);

    for (const unsupported of [
      '"internalId"',
      '"sourceHealth"',
      '"fieldProvenance"',
      '"retrievedAt"',
      '"nationAssociations"',
      '"taxonomyMembership"',
      '"legalEffect"',
      '"deadline"',
      '"activeVersion"',
      '"operationEvidence"',
    ]) {
      expect(serialized).not.toContain(unsupported);
    }
    expect(bundle.governance).toEqual({
      jurisdiction: "general_jurisdiction",
      classification: "Unclassified",
      nationEvidence: [],
      officialSubjects: [],
      taxonomyMemberships: [],
    });
  });

  it("rejects tampered, swapped, missing, and extra fixture bytes before projection", () => {
    const tampered = fixtureBytes();
    tampered["get-legislation.valid.xml"] = replace(
      tampered["get-legislation.valid.xml"],
      "SYNTHETIC ACTIVE VERSION TITLE",
      "SYNTHETIC TAMPERED VERSION TITLE",
    );
    const tamperedError = capturedContractError(() =>
      loadWashingtonLwsReviewedSyntheticFixtureBundle(
        manifestFixture,
        tampered,
      ),
    );
    expect(tamperedError).toMatchObject({
      code: "inconsistent_value",
      path: "$.fixtureBytes.get-legislation.valid.xml",
    });

    const swapped = fixtureBytes();
    swapped["get-legislation.valid.xml"] = swapped["get-sponsors.valid.xml"];
    expect(() =>
      loadWashingtonLwsReviewedSyntheticFixtureBundle(manifestFixture, swapped),
    ).toThrowError(/do not match the reviewed SHA-256 inventory/);

    const missing = fixtureBytes();
    delete missing["get-documents.valid.xml"];
    expect(() =>
      loadWashingtonLwsReviewedSyntheticFixtureBundle(manifestFixture, missing),
    ).toThrowError(/every digest-bound resource exactly once/);

    const extra = {
      ...fixtureBytes(),
      "provider-response.xml": fixture("get-legislation.valid.xml"),
    };
    expect(() =>
      loadWashingtonLwsReviewedSyntheticFixtureBundle(manifestFixture, extra),
    ).toThrowError(/every digest-bound resource exactly once/);
  });

  it("rejects any manifest change that could relabel or detach fixture evidence", () => {
    expect(parseWashingtonLwsSyntheticFixtureManifest(manifestFixture)).toEqual(
      manifestFixture,
    );
    for (const mutated of [
      { ...manifestFixture, providerEnvelope: true },
      { ...manifestFixture, historicalCompleteness: "complete" },
      {
        ...manifestFixture,
        nationEvidence: ["SYNTHETIC-INFERENCE"],
      },
      {
        ...manifestFixture,
        classification: "Natural Resources & Environment",
      },
      {
        ...manifestFixture,
        resources: manifestFixture.resources.slice(1),
      },
      {
        ...manifestFixture,
        resources: manifestFixture.resources.map((resource, index) =>
          index === 0
            ? {
                ...resource,
                sha256: "0".repeat(64),
              }
            : resource,
        ),
      },
      {
        ...manifestFixture,
        prohibitedSyntheticSentinels:
          manifestFixture.prohibitedSyntheticSentinels.map((entry, index) =>
            index === 0 ? { ...entry, values: [] } : entry,
          ),
      },
    ]) {
      expect(() =>
        parseWashingtonLwsSyntheticFixtureManifest(mutated),
      ).toThrowError(WashingtonLwsContractError);
    }
  });
});
