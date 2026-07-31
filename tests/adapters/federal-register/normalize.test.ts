import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import taxonomy from "../../../config/taxonomy.v1.json";
import correctionFixture from "../../../fixtures/sources/federal-register/document-correction.valid.json";
import historicalFixture from "../../../fixtures/sources/federal-register/document-historical.valid.json";
import originalFixture from "../../../fixtures/sources/federal-register/document-original.valid.json";
import withdrawalFixture from "../../../fixtures/sources/federal-register/document-withdrawal.valid.json";
import recordSchema from "../../../schemas/record.schema.v1.json";
import {
  FEDERAL_REGISTER_ADAPTER_ID,
  FEDERAL_REGISTER_ADAPTER_VERSION,
  FEDERAL_REGISTER_IDENTITY_RULE,
  federalRegisterStableRecordId,
  normalizeFederalRegisterDocument,
  normalizeFederalRegisterInventory,
} from "../../../src/adapters/federal-register/normalize";
import type { FederalRegisterDateRange } from "../../../src/adapters/federal-register/query-contract";
import { parseFederalRegisterDocument } from "../../../src/adapters/federal-register/response-contract";
import type {
  SourceConfig,
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";
import {
  sourceDerivedLeafPointers,
  validateRecordPolicy,
  validateRecordSetPolicy,
} from "../../../src/pipeline/policy-validation.mjs";

const retrievedAt = "2026-07-31T12:00:00.000Z";
const taxonomyConfig = taxonomy as unknown as TaxonomyConfig;
const registryConfig = sourceRegistry as unknown as SourceRegistry;
const recentCoverageRange = {
  start: "2026-07-01",
  end: "2026-07-31",
} as const;
const historicalCoverageRange = {
  start: "1994-01-03",
  end: "1994-01-03",
} as const;

function configuredSource(): SourceConfig {
  const source = structuredClone(
    sourceRegistry.sources.find(({ id }) => id === "federal-register"),
  ) as unknown as SourceConfig;
  source.enabled = true;
  source.adapter = {
    id: FEDERAL_REGISTER_ADAPTER_ID,
    version: FEDERAL_REGISTER_ADAPTER_VERSION,
    module: "src/adapters/federal-register/index.ts",
    identityRule: FEDERAL_REGISTER_IDENTITY_RULE,
  };
  return source;
}

function normalizationInput(
  source: SourceConfig,
  coverageRange: FederalRegisterDateRange = recentCoverageRange,
) {
  return {
    source,
    retrievedAt,
    coverageRange,
    correctionBoundaryExcludedCount: 0,
  };
}

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateRecordSchema = ajv.compile(recordSchema);

describe("Federal Register normalization", () => {
  it("normalizes a reciprocal correction pair with complete exact provenance", () => {
    const source = configuredSource();
    const documents = [originalFixture, correctionFixture].map((fixture) =>
      parseFederalRegisterDocument(fixture),
    );
    const records = normalizeFederalRegisterInventory(
      documents,
      normalizationInput(source),
    );

    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(
        validateRecordSchema(record),
        ajv.errorsText(validateRecordSchema.errors),
      ).toBe(true);
      expect(() =>
        validateRecordPolicy(record, {
          sourceConfig: source,
          taxonomy: taxonomyConfig,
        }),
      ).not.toThrow();
      expect(record.jurisdiction).toMatchObject({
        level: "federal",
        generalJurisdictionOnly: true,
      });
      expect(record.nationAssociations).toEqual([]);
      expect(record.relevance).toEqual([
        expect.objectContaining({
          basis: "general_jurisdiction",
        }),
      ]);

      const provenanceFields = new Set(
        record.fieldProvenance.map(({ field }) => field),
      );
      expect(
        sourceDerivedLeafPointers(record).filter(
          (field: string) => !provenanceFields.has(field),
        ),
      ).toEqual([]);
    }
    expect(() =>
      validateRecordSetPolicy(records, {
        sourceRegistry: {
          ...registryConfig,
          sources: [
            ...registryConfig.sources.filter(
              ({ id }) => id !== "federal-register",
            ),
            source,
          ],
        },
        taxonomy: taxonomyConfig,
      }),
    ).not.toThrow();

    const original = records.find(
      ({ source: recordSource }) => recordSource.recordId === "TST-2026-00001",
    );
    const correction = records.find(
      ({ source: recordSource }) =>
        recordSource.recordId === "C1-TST-2026-00001",
    );
    expect(original?.sourceDocumentRelationships).toEqual([
      {
        relationshipType: "corrected_by",
        targetSourceRecordId: "C1-TST-2026-00001",
        targetUrl:
          "https://www.federalregister.gov/api/v1/documents/C1-TST-2026-00001",
        sourceLabel: "corrections",
      },
    ]);
    expect(correction?.sourceDocumentRelationships).toEqual([
      {
        relationshipType: "corrects",
        targetSourceRecordId: "TST-2026-00001",
        targetUrl:
          "https://www.federalregister.gov/api/v1/documents/TST-2026-00001",
        sourceLabel: "correction_of",
      },
    ]);
    expect(original?.dates.published).toBe("2026-07-30");
    expect(correction?.dates.published).toBe("2026-07-31");
    expect(original?.source.coverage).toMatchObject({
      from: "2026-07-01",
      through: "2026-07-31",
    });
    expect(original?.source.coverage.notes).toContain(
      "not complete 1994-present coverage",
    );
    expect(original?.officialSubjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scheme: "Federal Register topic",
          label: "Synthetic Topic",
        }),
        expect.objectContaining({
          scheme: "Federal Register CFR topic",
          label: "Synthetic CFR Topic",
        }),
      ]),
    );
    expect(original?.isUnclassified).toBe(true);
  });

  it("preserves withdrawal source language and its generic relation without inferring status", () => {
    const source = configuredSource();
    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(withdrawalFixture),
      normalizationInput(source),
    );

    expect(record.status).toEqual({
      normalized: "unknown",
      sourceLabel: "Withdrawal of synthetic notice.",
      asOf: "2026-07-31",
    });
    expect(record.actionHistory.map(({ sourceLabel }) => sourceLabel)).toEqual([
      "Withdrawal of synthetic notice.",
      "The synthetic notice is withdrawn on July 31, 2026.",
    ]);
    expect(record.actionHistory.map(({ date }) => date)).toEqual([null, null]);
    expect(record.dates.lastAction).toBeNull();
    expect(record.texts.officialSummary?.text).toContain(
      "preserves withdrawal language",
    );
    expect(record.sourceDocumentRelationships).toEqual([
      {
        relationshipType: "related_document",
        targetSourceRecordId: "TST-2026-00002",
        targetUrl: "https://www.federalregister.gov/d/TST-2026-00002",
        sourceLabel: "refers_to_antecedent_by_citation",
      },
    ]);
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/status/sourceLabel",
      )?.sourcePath,
    ).toBe("$.action");
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/actionHistory/1/sourceLabel",
      )?.sourcePath,
    ).toBe("$.dates");
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/sourceDocumentRelationships/0/sourceLabel",
      )?.sourcePath,
    ).toBe('$.related_documents["TST-DOCKET-0003"][0].relationship_type');
    expect(JSON.stringify(record)).not.toContain('"withdrawn"');
  });

  it("does not turn a null docket match into a public relationship", () => {
    const source = configuredSource();
    const candidate = structuredClone(withdrawalFixture) as unknown as {
      related_documents: Record<
        string,
        Array<{ relationship_type: string | null }>
      >;
    };
    const related = candidate.related_documents["TST-DOCKET-0003"]?.[0];
    if (related === undefined) {
      throw new Error("Synthetic related-document fixture is missing");
    }
    related.relationship_type = null;

    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(candidate),
      normalizationInput(source),
    );

    expect(record.sourceDocumentRelationships).toEqual([]);
    expect(
      record.fieldProvenance.some(({ field }) =>
        field.startsWith("/sourceDocumentRelationships/"),
      ),
    ).toBe(false);
  });

  it("deduplicates an exact semantic target repeated across docket groups", () => {
    const source = configuredSource();
    const candidate = structuredClone(withdrawalFixture) as unknown as {
      related_documents: Record<string, Array<Record<string, unknown>>>;
    };
    const original = candidate.related_documents["TST-DOCKET-0003"]?.[0];
    if (original === undefined) {
      throw new Error("Synthetic related-document fixture is missing");
    }
    candidate.related_documents["AAA-ALTERNATE-DOCKET"] = [
      {
        ...structuredClone(original),
        docket_number: "AAA-ALTERNATE-DOCKET",
      },
    ];

    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(candidate),
      normalizationInput(source),
    );

    expect(record.sourceDocumentRelationships).toHaveLength(1);
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/sourceDocumentRelationships/0/sourceLabel",
      )?.sourcePath,
    ).toBe('$.related_documents["AAA-ALTERNATE-DOCKET"][0].relationship_type');
  });

  it("keeps historical missing-PDF and raw-name-only agency fields truthful", () => {
    const source = configuredSource();
    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(historicalFixture),
      normalizationInput(source, historicalCoverageRange),
    );

    expect(record.urls.officialFullText).toBeNull();
    expect(record.issuingBodies).toEqual([
      {
        sourceId: null,
        officialName: "Synthetic Historical Agency",
      },
    ]);
    expect(record.texts.officialSummary).toBeNull();
    expect(record.sourceDocumentRelationships).toEqual([]);
    expect(record.source.coverage).toMatchObject({
      from: "1994-01-03",
      through: "1994-01-03",
    });
    expect(record.historical).toEqual({
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    });
  });

  it("uses only the versioned document-number identity rule", () => {
    expect(federalRegisterStableRecordId("TST-2026-00001")).toBe(
      federalRegisterStableRecordId("TST-2026-00001"),
    );
    expect(federalRegisterStableRecordId("TST-2026-00001")).not.toBe(
      federalRegisterStableRecordId("TST-2026-00002"),
    );
    expect(() => federalRegisterStableRecordId("../unsafe")).toThrow(
      /document number/,
    );
  });

  it("rejects a document outside the declared artifact window", () => {
    const source = configuredSource();
    expect(() =>
      normalizeFederalRegisterDocument(
        parseFederalRegisterDocument(historicalFixture),
        normalizationInput(source),
      ),
    ).toThrow(/outside the selected public artifact range/);
  });

  it("cannot mark an orphan correction as validated", () => {
    const source = configuredSource();
    const correction = parseFederalRegisterDocument(correctionFixture);
    expect(() =>
      normalizeFederalRegisterDocument(correction, normalizationInput(source)),
    ).toThrow(/nonreciprocal|missing/i);
  });

  it("refuses to normalize from the disabled registry configuration", () => {
    const disabled = structuredClone(
      registryConfig.sources.find(({ id }) => id === "federal-register"),
    ) as SourceConfig;
    disabled.adapter = {
      id: FEDERAL_REGISTER_ADAPTER_ID,
      version: FEDERAL_REGISTER_ADAPTER_VERSION,
      module: "src/adapters/federal-register/index.ts",
      identityRule: FEDERAL_REGISTER_IDENTITY_RULE,
    };
    expect(disabled.enabled).toBe(false);
    expect(() =>
      normalizeFederalRegisterDocument(
        parseFederalRegisterDocument(historicalFixture),
        normalizationInput(disabled),
      ),
    ).toThrow(/registration/);
  });

  it("pins every reviewed source registration invariant before normalization", () => {
    const mutations: Array<(source: SourceConfig) => void> = [
      (source) => {
        source.jurisdiction.level = "tribal";
      },
      (source) => {
        source.coverage.from = "2026-01-01";
      },
      (source) => {
        source.coverage.limitations = "False injected coverage claim.";
      },
      (source) => {
        source.access.allowedHosts.push("example.invalid");
      },
      (source) => {
        source.adapter!.module = "src/adapters/federal-register/other.ts";
      },
      (source) => {
        source.officialSubjectMappings.push("unreviewed-mapping");
      },
    ];

    for (const mutate of mutations) {
      const source = configuredSource();
      mutate(source);
      expect(() =>
        normalizeFederalRegisterDocument(
          parseFederalRegisterDocument(historicalFixture),
          normalizationInput(source),
        ),
      ).toThrow(/configuration differs from the reviewed/);
    }
  });

  it("uses exact agency_names evidence when the detailed agency list is empty", () => {
    const candidate = structuredClone(historicalFixture);
    candidate.agencies = [];
    candidate.agency_names = [
      "Synthetic Historical Agency",
      "Synthetic Historical Agency",
    ];
    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(candidate),
      normalizationInput(configuredSource(), historicalCoverageRange),
    );

    expect(record.issuingBodies).toEqual([
      {
        sourceId: null,
        officialName: "Synthetic Historical Agency",
      },
    ]);
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/issuingBodies/0/officialName",
      )?.sourcePath,
    ).toBe("$.agency_names[0]");
  });

  it("never derives a Nation association from source language", () => {
    const source = configuredSource();
    const candidate = structuredClone(withdrawalFixture);
    candidate.title = "Synthetic notice naming Synthetic Nation A in a title";
    candidate.action =
      "Synthetic Nation A appears in this synthetic action label.";
    candidate.topics = ["Synthetic Nation A"];
    candidate.agencies[0].raw_name = "Synthetic Nation A";
    const record = normalizeFederalRegisterDocument(
      parseFederalRegisterDocument(candidate),
      normalizationInput(source),
    );

    expect(record.nationAssociations).toEqual([]);
    expect(record.jurisdiction.generalJurisdictionOnly).toBe(true);
    expect(record.relevance.map(({ basis }) => basis)).toEqual([
      "general_jurisdiction",
    ]);
  });
});
