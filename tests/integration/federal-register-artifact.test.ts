import { describe, expect, it } from "vitest";

import sourceRegistryJson from "../../config/sources.v1.json";
import taxonomyJson from "../../config/taxonomy.v1.json";
import correctionFixture from "../../fixtures/sources/federal-register/document-correction.valid.json";
import originalFixture from "../../fixtures/sources/federal-register/document-original.valid.json";
import {
  FEDERAL_REGISTER_ADAPTER_ID,
  FEDERAL_REGISTER_ADAPTER_VERSION,
  FEDERAL_REGISTER_IDENTITY_RULE,
  normalizeFederalRegisterInventory,
  parseFederalRegisterDocument,
} from "../../src/adapters/federal-register";
import {
  createArtifactDocuments,
  generateSyntheticNations,
} from "../../src/pipeline/artifact.mjs";
import { validateRecordSetPolicy } from "../../src/pipeline/policy-validation.mjs";
import type {
  ArtifactCoverage,
  ArtifactManifest,
  RecordDetail,
  RecordIndex,
  SourceConfig,
  SourceHealth,
  SourceHealthCollection,
  SourceRegistry,
  TaxonomyConfig,
} from "../../src/shared/contracts";

function enabledFederalRegister(): {
  source: SourceConfig;
  registry: SourceRegistry;
} {
  const registry = structuredClone(
    sourceRegistryJson,
  ) as unknown as SourceRegistry;
  const source = registry.sources.find(({ id }) => id === "federal-register");
  if (!source) {
    throw new Error("Federal Register source registration is missing");
  }
  for (const configuredSource of registry.sources) {
    configuredSource.enabled = false;
  }
  source.enabled = true;
  source.adapter = {
    id: FEDERAL_REGISTER_ADAPTER_ID,
    version: FEDERAL_REGISTER_ADAPTER_VERSION,
    module: "src/adapters/federal-register/index.ts",
    identityRule: FEDERAL_REGISTER_IDENTITY_RULE,
  };
  return { source, registry };
}

describe("Federal Register normalized artifact integration", () => {
  it("packages hand-authored correction fixtures into bounded compact and detail assets", () => {
    const { source, registry } = enabledFederalRegister();
    const taxonomy = taxonomyJson as unknown as TaxonomyConfig;
    const records = normalizeFederalRegisterInventory(
      [originalFixture, correctionFixture].map((fixture) =>
        parseFederalRegisterDocument(fixture),
      ),
      {
        source,
        retrievedAt: "2026-07-31T12:00:00.000Z",
        coverageRange: {
          start: "2026-07-01",
          end: "2026-07-31",
        },
        correctionBoundaryExcludedCount: 0,
      },
    );

    expect(() =>
      validateRecordSetPolicy(records, {
        sourceRegistry: registry,
        taxonomy,
      }),
    ).not.toThrow();

    const recordHealth = records[0].sourceHealth;
    const dataAsOf = records
      .map((record) => record.sourceHealth.dataAsOf)
      .sort()
      .at(-1) as string;
    const lastSuccessfulRetrievalAt = records
      .map((record) => record.sourceHealth.lastSuccessfulRetrievalAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) as string;
    const sourceHealth: SourceHealth[] = [
      {
        sourceId: source.id,
        status: recordHealth.status,
        checkedAt: recordHealth.checkedAt,
        dataAsOf,
        lastSuccessfulRetrievalAt,
        usingLastKnownGood: recordHealth.usingLastKnownGood,
        stale:
          recordHealth.usingLastKnownGood || recordHealth.status !== "healthy",
        recordCount: records.length,
        failureStage: null,
        message: recordHealth.message,
      },
    ];

    const documents = createArtifactDocuments({
      records,
      nations: generateSyntheticNations(),
      taxonomy,
      sourceRegistry: registry,
      generatedAt: "2026-07-31T12:00:00.000Z",
      synthetic: true,
      sourceHealth,
    });
    const manifest = documents.get("manifest.json") as ArtifactManifest;
    const coverage = documents.get("coverage.json") as ArtifactCoverage;
    const index = documents.get("index/records.json") as RecordIndex;
    const health = documents.get(
      "source-health.json",
    ) as SourceHealthCollection;
    const federalCoverage = coverage.entries.find(
      ({ sourceId }) => sourceId === "federal-register",
    );

    expect(manifest.recordCount).toBe(2);
    expect(federalCoverage).toMatchObject({
      from: "2026-07-01",
      through: "2026-07-31",
      documentedFrom: "1994-01-03",
      documentedThrough: null,
      recordFrom: "2026-07-30",
      recordThrough: "2026-07-31",
      recordCount: 2,
      status: "limited",
    });
    expect(index.records).toHaveLength(2);
    expect(health.sources).toEqual([
      {
        ...sourceHealth[0],
        sourceName: source.name,
      },
    ]);
    expect(index.records[0]).toMatchObject({
      sourceDocumentIdentifier: expect.any(String),
      issuingBodies: ["Synthetic Test Agency"],
      urls: {
        officialSource: expect.stringMatching(
          /^https:\/\/www\.federalregister\.gov\//,
        ),
      },
      isUnclassified: true,
      jurisdiction: {
        level: "federal",
        generalJurisdictionOnly: true,
      },
    });
    expect(
      index.records.every(
        (record) =>
          !("sourceDocumentRelationships" in record) &&
          !("fieldProvenance" in record) &&
          !("aiSummary" in record),
      ),
    ).toBe(true);

    const detailDocuments = [...documents.entries()]
      .filter(([path]) => path.startsWith("details/"))
      .map(([, value]) => value as RecordDetail);
    expect(
      detailDocuments.flatMap(
        ({ record }) => record.sourceDocumentRelationships,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relationshipType: "corrected_by" }),
        expect.objectContaining({ relationshipType: "corrects" }),
      ]),
    );
    expect(
      detailDocuments.every(
        ({ record }) =>
          record.aiSummary.exists === false &&
          record.nationAssociations.length === 0 &&
          record.relevance.every(
            ({ basis }) => basis === "general_jurisdiction",
          ),
      ),
    ).toBe(true);
  });
});
