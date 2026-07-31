import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import taxonomy from "../../../config/taxonomy.v1.json";
import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  normalizeWashingtonGovernorExecutiveOrder,
  parseWashingtonGovernorExecutiveOrdersIndex,
  washingtonGovernorExecutiveOrderStableRecordId,
} from "../../../src/adapters/washington-governor-executive-orders";
import {
  sourceDerivedLeafPointers,
  validateRecordSetPolicy,
} from "../../../src/pipeline/policy-validation.mjs";
import type {
  SourceConfig,
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";

const fixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/washington-governor-executive-orders/current-term.valid.html",
  ),
  "utf8",
);

function enabledSource(): SourceConfig {
  const source = structuredClone(
    sourceRegistry.sources.find(
      ({ id }) => id === "washington-governor-executive-orders",
    ),
  ) as unknown as SourceConfig;
  source.enabled = true;
  return source;
}

function syntheticRow() {
  return parseWashingtonGovernorExecutiveOrdersIndex(fixture, {
    maximumIssuedDate: "2099-12-31",
  }).rows[0]!;
}

describe("Washington Governor executive-order normalization", () => {
  it("emits metadata and links only without inferring a Nation relationship", () => {
    const row = syntheticRow();
    const record = normalizeWashingtonGovernorExecutiveOrder(row, {
      source: enabledSource(),
      retrievedAt: "2099-01-03T00:00:00.000Z",
      coverageThrough: "2099-01-02",
      rowIndex: 0,
    });

    expect(record.internalId).toBe(
      washingtonGovernorExecutiveOrderStableRecordId(row),
    );
    expect(record.source).toMatchObject({
      id: "washington-governor-executive-orders",
      recordId: "99-01@2099-01-02",
      adapterId: "washington-governor-executive-orders-adapter",
      adapterVersion: "1.0.0",
      coverage: {
        from: "2025-01-15",
        through: "2099-01-02",
      },
    });
    expect(record.officialTitle).toBe(
      "Synthetic Tribal Nations planning notice",
    );
    expect(record.sourceDocumentIdentifier).toBe("99-01");
    expect(record.documentType).toBe("executive_action");
    expect(record.jurisdiction).toEqual({
      level: "state",
      name: "Washington",
      stateCode: "WA",
      generalJurisdictionOnly: true,
    });
    expect(record.issuingBodies).toEqual([
      {
        sourceId: null,
        officialName: "Office of the Governor, State of Washington",
      },
    ]);
    expect(record.status).toEqual({
      normalized: "unknown",
      sourceLabel: "Active",
      asOf: "2099-01-03T00:00:00.000Z",
    });
    expect(record.dates).toMatchObject({
      published: "2099-01-02",
      retrieved: "2099-01-03T00:00:00.000Z",
      effective: null,
      updated: null,
    });
    expect(record.urls).toEqual({
      officialSource: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      officialFullText:
        "https://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf",
    });
    expect(record.texts).toMatchObject({
      officialSummary: null,
      sourceExcerpt: null,
      detailAsset: {
        availability: "official_link_only",
        path: null,
      },
    });
    expect(record.actionHistory).toEqual([
      {
        date: "2099-01-02",
        sourceLabel: "Issued Date",
        sourceUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      },
    ]);
    expect(record.statusHistory).toEqual([]);
    expect(record.sourceDocumentRelationships).toEqual([]);
    expect(record.officialSubjects).toEqual([]);
    expect(record.taxonomyMemberships).toEqual([]);
    expect(record.isUnclassified).toBe(true);
    expect(record.nationAssociations).toEqual([]);
    expect(record.relevance).toEqual([
      expect.objectContaining({
        basis: "general_jurisdiction",
        sourceUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      }),
    ]);
    expect(record.landmark).toEqual({ isLandmark: false });
    expect(record.historical).toEqual({
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    });
    expect(record.aiSummary).toEqual({
      exists: false,
      label: "AI-generated source summary",
    });
    expect(record.sourceHealth).toEqual({
      status: "healthy",
      checkedAt: "2099-01-03T00:00:00.000Z",
      dataAsOf: "2099-01-03T00:00:00.000Z",
      lastSuccessfulRetrievalAt: "2099-01-03T00:00:00.000Z",
      usingLastKnownGood: false,
      message: null,
    });
  });

  it("provides exact complete provenance for every retained source-derived leaf", () => {
    const record = normalizeWashingtonGovernorExecutiveOrder(syntheticRow(), {
      source: enabledSource(),
      retrievedAt: "2099-01-03T00:00:00.000Z",
      coverageThrough: "2099-01-02",
      rowIndex: 0,
    });
    expect(record.fieldProvenance.map(({ field }) => field)).toEqual(
      sourceDerivedLeafPointers(record),
    );
    expect(
      record.fieldProvenance.every(
        (entry) =>
          entry.sourceId === "washington-governor-executive-orders" &&
          entry.sourceRecordId === record.source.recordId &&
          entry.sourceUrl === WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL &&
          entry.retrievedAt === "2099-01-03T00:00:00.000Z" &&
          entry.sourceUpdatedAt === null &&
          entry.validationState === "validated",
      ),
    ).toBe(true);
    expect(
      record.fieldProvenance.find(({ field }) => field === "/dates/published"),
    ).toMatchObject({
      sourcePath: "$.rows[0].issuedDateSourceText",
      transformation: "normalized",
      transformRuleId: "washington-governor-issued-date-to-record-date-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/status/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$.rows[0].sourceStatus",
      transformation: "copied",
      transformRuleId: null,
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/actionHistory/0/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$view.table.headers[1]",
      transformation: "copied",
      transformRuleId: null,
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/urls/officialFullText",
      ),
    ).toMatchObject({
      sourcePath: "$view.table.rows[0].cells[2].a[0].@href",
      transformation: "normalized",
      transformRuleId:
        "washington-governor-relative-pdf-href-to-absolute-url-v1",
    });
  });

  it("passes schema-adjacent sovereignty and source policy validation in an explicit enabled context", () => {
    const source = enabledSource();
    const record = normalizeWashingtonGovernorExecutiveOrder(syntheticRow(), {
      source,
      retrievedAt: "2099-01-03T00:00:00.000Z",
      coverageThrough: "2099-01-02",
      rowIndex: 0,
    });
    const registry = structuredClone(
      sourceRegistry,
    ) as unknown as SourceRegistry;
    registry.sources = registry.sources.map((candidate) =>
      candidate.id === source.id ? source : candidate,
    );
    expect(() =>
      validateRecordSetPolicy([record], {
        sourceRegistry: registry,
        taxonomy: taxonomy as unknown as TaxonomyConfig,
      }),
    ).not.toThrow();
  });

  it("fails closed on registration, coverage, or row-scope drift", () => {
    const wrongSource = enabledSource();
    wrongSource.access.allowedHosts.push("example.invalid");
    expect(() =>
      normalizeWashingtonGovernorExecutiveOrder(syntheticRow(), {
        source: wrongSource,
        retrievedAt: "2099-01-03T00:00:00.000Z",
        coverageThrough: "2099-01-02",
        rowIndex: 0,
      }),
    ).toThrow(/differs from the reviewed enabled runtime contract/);

    expect(() =>
      normalizeWashingtonGovernorExecutiveOrder(syntheticRow(), {
        source: enabledSource(),
        retrievedAt: "2099-01-03T00:00:00.000Z",
        coverageThrough: "2098-12-31",
        rowIndex: 0,
      }),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));

    expect(() =>
      normalizeWashingtonGovernorExecutiveOrder(
        { ...syntheticRow(), sourceStatus: "Expired" } as never,
        {
          source: enabledSource(),
          retrievedAt: "2099-01-03T00:00:00.000Z",
          coverageThrough: "2099-01-02",
          rowIndex: 0,
        },
      ),
    ).toThrow(expect.objectContaining({ code: "invalid_value" }));
  });
});
