import sourceRegistry from "../../config/sources.v1.json";
import taxonomy from "../../config/taxonomy.v1.json";
import * as legacyProjection from "../../src/engine/projection";
import * as pureProjection from "../../src/core/projection";
import * as configuredEngine from "../../scripts/configured-engine";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import countyRecord from "../../fixtures/records/county-explicit.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import accordRecord from "../../fixtures/records/intergovernmental-accord.valid.json";
import {
  REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS,
  ProjectionValidationError,
  createEngineProjection,
  serializeEngineProjection,
} from "../../src/engine";
import type { EngineProjection } from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

function records(): PolicyRecord[] {
  return [countyRecord, federalRecord, accordRecord].map(
    (record) => structuredClone(record) as PolicyRecord,
  );
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

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

function reverseSetLikeCollections(bundle: typeof validProfileBundle) {
  const reversed = structuredClone(bundle);
  reversed.outputAdapters.reverse();
  reversed.regionPacks.reverse();
  for (const region of reversed.regionPacks) {
    region.sourceIds.reverse();
    region.taxonomy.taxonomyIds.reverse();
    region.jurisdictionReferences.reverse();
  }
  reversed.watchRules.reverse();
  for (const rule of reversed.watchRules) {
    rule.recordIds.reverse();
  }
  reversed.deploymentProfiles.reverse();
  for (const deployment of reversed.deploymentProfiles) {
    deployment.watchRuleRefs.reverse();
  }
  reversed.personaProjections.reverse();
  for (const persona of reversed.personaProjections) {
    persona.outputAdapterRefs.reverse();
  }
  return reversed;
}

function projectionRecordBytes(projection: EngineProjection): string {
  return JSON.stringify(projection.records);
}

describe("deterministic reference-only engine projection", () => {
  it("stores each record once and lets two views reference one record for distinct reasons", () => {
    const projection = createEngineProjection(records(), validProfileBundle);
    const targetId = "psr:synthetic-federal:record-001";

    expect(
      projection.records.filter(({ internalId }) => internalId === targetId),
    ).toHaveLength(1);
    expect(projection.views).toHaveLength(2);
    for (const view of projection.views) {
      expect(view.recordReferences.map(({ recordId }) => recordId)).toEqual([
        targetId,
      ]);
      expect(Object.keys(view.recordReferences[0]!).sort()).toEqual([
        "reasons",
        "recordId",
      ]);
      expect(view.recordReferences[0]).not.toHaveProperty("record");
      expect(view.recordReferences[0]).not.toHaveProperty("officialTitle");
      expect(view.recordReferences[0]).not.toHaveProperty("source");
      expect(view.recordReferences[0]).not.toHaveProperty("fieldProvenance");
    }

    const reasons = projection.views.map(
      (view) => view.recordReferences[0]!.reasons[0]!,
    );
    expect(new Set(reasons.map(({ basis }) => basis)).size).toBe(2);
    expect(new Set(reasons.map(({ ruleRef }) => ruleRef.id)).size).toBe(2);
    expect(
      new Set(reasons.map(({ configurationRef }) => configurationRef.id)).size,
    ).toBe(2);
    for (const reason of reasons) {
      expect(reason.ruleRef.version).toBe("1.0.0");
      expect(reason.configurationRef.version).toBe("1.0.0");
      expect(reason.evidenceReference.kind).toBe("policy_record_field");
      expect(reason.evidenceReference.recordId).toBe(targetId);
      expect(reason.evidenceReference.configurationEvidenceUrl).toMatch(
        /^https:\/\/.*\.invalid\//,
      );
      expect(reason.reviewState).toBe("synthetic_reviewed");
      expect(reason.temporalScope.kind).toBe("inclusive_date_range");
      expect(reason.nonClaims).toEqual(REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS);
    }
  });

  it("emits byte-stable canonical output for every set-like input order", () => {
    const inputRecords = records();
    const baseline = createEngineProjection(inputRecords, validProfileBundle);
    const baselineBytes = serializeEngineProjection(baseline);
    const baselineDigest = createHash("sha256")
      .update(baselineBytes)
      .digest("hex");

    const permutations = [
      createEngineProjection([...inputRecords].reverse(), validProfileBundle),
      createEngineProjection(
        inputRecords,
        reverseSetLikeCollections(validProfileBundle),
      ),
      createEngineProjection(
        [...inputRecords].reverse(),
        reverseSetLikeCollections(validProfileBundle),
      ),
    ];
    for (const projection of permutations) {
      const bytes = serializeEngineProjection(projection);
      expect(bytes).toBe(baselineBytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        baselineDigest,
      );
    }
  });

  it("does not mutate caller records and returns a detached frozen corpus", () => {
    const inputRecords = records();
    const beforeBytes = inputRecords.map((record) => JSON.stringify(record));
    const beforeDigests = inputRecords.map(digest);
    const projection = createEngineProjection(inputRecords, validProfileBundle);

    expect(inputRecords.map((record) => JSON.stringify(record))).toEqual(
      beforeBytes,
    );
    expect(inputRecords.map(digest)).toEqual(beforeDigests);
    expect(inputRecords.every((record) => !Object.isFrozen(record))).toBe(true);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.records)).toBe(true);
    expect(Object.isFrozen(projection.records[0]!.source)).toBe(true);

    inputRecords[0]!.officialTitle = "caller-side mutation after projection";
    expect(projection.records[0]!.officialTitle).not.toBe(
      inputRecords[0]!.officialTitle,
    );
    expect(() => {
      (
        projection.records[0] as unknown as { officialTitle: string }
      ).officialTitle = "attempted output mutation";
    }).toThrow(TypeError);
  });

  it("changes deployment and persona configuration without changing source records", () => {
    const inputRecords = records();
    const baseline = createEngineProjection(inputRecords, validProfileBundle);
    const configured = structuredClone(validProfileBundle);
    configured.deploymentProfiles[0]!.id =
      "synthetic-cloud-harbor-deployment-revised";
    configured.personaProjections[0]!.deploymentProfileRef.id =
      "synthetic-cloud-harbor-deployment-revised";
    configured.personaProjections[0]!.id =
      "synthetic-cloud-harbor-public-reader";
    configured.personaProjections[0]!.outputAdapterRefs = [
      structuredClone(configured.outputAdapters[1]!),
    ];
    const revised = createEngineProjection(inputRecords, configured);

    expect(projectionRecordBytes(revised)).toBe(
      projectionRecordBytes(baseline),
    );
    expect(revised.records.map(digest)).toEqual(baseline.records.map(digest));
    expect(revised.views.map(({ id }) => id)).not.toEqual(
      baseline.views.map(({ id }) => id),
    );
    expect(inputRecords.map(({ source }) => digest(source))).toEqual(
      baseline.records.map(({ source }) => digest(source)),
    );
  });

  it("fails atomically on duplicate input records without mutating any input", () => {
    const inputRecords = records();
    inputRecords.push(structuredClone(inputRecords[0]!));
    const before = inputRecords.map((record) => JSON.stringify(record));
    let result: EngineProjection | symbol = Symbol("no result");

    try {
      result = createEngineProjection(inputRecords, validProfileBundle);
      throw new Error("duplicate record input was accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectionValidationError);
      expect((error as ProjectionValidationError).code).toBe("DUPLICATE_ID");
    }
    expect(typeof result).toBe("symbol");
    expect(inputRecords.map((record) => JSON.stringify(record))).toEqual(
      before,
    );
  });
});

it("retains projection facade identity and canonical output with explicit configuration", () => {
  const shared = [
    "REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS",
    "ProjectionValidationError",
    "serializeEngineProjection",
  ] as const;
  const configured = [
    "parseProjectionProfileBundle",
    "createEngineProjection",
  ] as const;
  expect(Object.keys(legacyProjection).sort()).toEqual(
    [...shared, ...configured].sort(),
  );
  for (const name of shared)
    expect(legacyProjection[name]).toBe(pureProjection[name]);
  for (const name of configured)
    expect(legacyProjection[name]).toBe(configuredEngine[name]);
  const direct = pureProjection.createProjectionRuntime({
    sourceRegistry,
    taxonomy,
  });
  expect(direct.parseProjectionProfileBundle(validProfileBundle)).toEqual(
    legacyProjection.parseProjectionProfileBundle(validProfileBundle),
  );
  expect(
    serializeEngineProjection(
      direct.createEngineProjection(records(), validProfileBundle),
    ),
  ).toBe(
    serializeEngineProjection(
      createEngineProjection(records(), validProfileBundle),
    ),
  );
  const noSources = pureProjection.createProjectionRuntime({
    sourceRegistry: { sources: [] },
    taxonomy,
  });
  expect(() =>
    noSources.parseProjectionProfileBundle(validProfileBundle),
  ).toThrow(ProjectionValidationError);
  const wrongTaxonomy = pureProjection.createProjectionRuntime({
    sourceRegistry,
    taxonomy: { ...taxonomy, taxonomyVersion: "99.0.0" },
  });
  expect(() =>
    wrongTaxonomy.createEngineProjection(records(), validProfileBundle),
  ).toThrow(ProjectionValidationError);
});
