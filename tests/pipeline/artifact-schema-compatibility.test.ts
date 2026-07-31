import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { test } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const artifactSchema = JSON.parse(
  await readFile(
    path.resolve(projectRoot, "schemas/artifact.schema.v1.json"),
    "utf8",
  ),
);
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);
const validateArtifactDocument = ajv.compile(artifactSchema);

test("artifact schema v1 continues to accept the legacy coverage shape", () => {
  const legacyCoverage = {
    artifactType: "coverage",
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-30T15:00:00.000Z",
    notices: ["Legacy v1 coverage fixture."],
    entries: [
      {
        sourceId: "synthetic-federal",
        jurisdiction: {
          level: "federal",
          name: "United States",
          stateCode: null,
        },
        from: "2026-07-01",
        through: "2026-07-30",
        cadence: "Contract-test fixture",
        recordTypes: ["notice"],
        status: "synthetic",
        limitation: "Contract-test records only.",
      },
    ],
  };

  assert.equal(
    validateArtifactDocument(legacyCoverage),
    true,
    JSON.stringify(validateArtifactDocument.errors),
  );
});

test("artifact schema v1 accepts legacy and additive manifest versions", () => {
  const manifest = {
    artifactType: "manifest",
    schemaVersion: "1.0.0",
    artifactVersion: "1.0.0",
    buildId: `synthetic-${"0".repeat(20)}`,
    generatedAt: "2026-07-30T15:00:00.000Z",
    dataAsOf: "2026-07-30T15:00:00.000Z",
    synthetic: true,
    recordSchemaVersion: "1.1.0",
    taxonomyVersion: "1.0.0",
    sourceRegistryVersion: "1.4.0",
    recordCount: 0,
    nationCount: 575,
    assets: [
      "coverage.json",
      "source-health.json",
      "nations.json",
      "taxonomy.json",
      "index/records.json",
    ].map((assetPath) => ({
      path: assetPath,
      sha256: "0".repeat(64),
      sizeBytes: 1,
      mediaType: "application/json",
      sourceIds: [],
    })),
  };

  for (const artifactVersion of ["1.0.0", "1.1.0"]) {
    for (const sourceRegistryVersion of [
      "1.4.0",
      "1.5.0",
      "1.6.0",
      "1.7.0",
      "1.8.0",
      "1.9.0",
      "1.10.0",
    ]) {
      assert.equal(
        validateArtifactDocument({
          ...manifest,
          artifactVersion,
          sourceRegistryVersion,
        }),
        true,
        JSON.stringify(validateArtifactDocument.errors),
      );
    }
  }
});

test("artifact schema v1 accepts the legacy compact-index shape", () => {
  const legacyIndex = {
    artifactType: "record-index",
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-30T15:00:00.000Z",
    records: [
      {
        id: "psr:synthetic-federal:legacy",
        detailPath: "details/legacy.json",
        officialTitle: "Legacy compact record",
        documentType: "notice",
        jurisdiction: {
          level: "federal",
          name: "United States",
          stateCode: null,
          generalJurisdictionOnly: true,
        },
        status: {},
        source: {
          id: "synthetic-federal",
          name: "Synthetic Federal Source",
          provider: "Synthetic provider",
        },
        dates: {},
        taxonomyMemberships: [],
        isUnclassified: true,
        nationIds: [],
        relevance: [{}],
        landmark: { isLandmark: false },
        change: {},
      },
    ],
  };

  assert.equal(
    validateArtifactDocument(legacyIndex),
    true,
    JSON.stringify(validateArtifactDocument.errors),
  );
});
