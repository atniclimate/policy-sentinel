import { describe, expect, it } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import taxonomy from "../../../config/taxonomy.v1.json";
import {
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS,
  GOIA_ACCORD_URL,
  WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
  goiaAccordStableRecordId,
  normalizeGoiaAccord,
  parseGoiaAccordPage,
  type GoiaAccordProjection,
} from "../../../src/adapters/washington-centennial-accord";
import {
  sourceDerivedLeafPointers,
  validateRecordSetPolicy,
} from "../../../src/pipeline/policy-validation.mjs";
import type {
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";
import { enabledGoiaAccordSource, goiaAccordFixture } from "./test-helpers";

function projection() {
  return parseGoiaAccordPage(goiaAccordFixture).projection;
}

describe("GOIA Centennial Accord normalization", () => {
  it("retains only reviewed Accord metadata with no Nation or issuing-body coercion", () => {
    const record = normalizeGoiaAccord(projection(), {
      source: enabledGoiaAccordSource(),
      retrievedAt: "2026-08-03T20:00:00.000Z",
    });
    expect(record.internalId).toBe(goiaAccordStableRecordId());
    expect(record).toMatchObject({
      schemaVersion: "1.4.0",
      officialTitle: GOIA_ACCORD_METADATA.instrumentTitle,
      sourceDocumentIdentifier: "centennial-accord@1989-08-04",
      documentType: "intergovernmental_accord",
      jurisdiction: {
        level: "state",
        name: "Washington",
        stateCode: "WA",
        generalJurisdictionOnly: true,
      },
      issuingBodies: [],
      legislativeContext: null,
      judicialContext: null,
      status: { normalized: "unknown", sourceLabel: null, asOf: null },
      urls: { officialSource: GOIA_ACCORD_URL, officialFullText: null },
      isUnclassified: true,
      nationAssociations: [],
      sourceDocumentRelationships: [],
    });
    expect(record.source).toMatchObject({
      id: "washington-centennial-accord",
      recordId: "centennial-accord@1989-08-04",
      adapterId: "washington-centennial-accord-adapter",
      adapterVersion: "1.0.0",
      coverage: { from: "1989-08-04", through: "1989-08-04" },
    });
    expect(record.accordContext).toEqual({
      parties: [
        {
          sourceId: null,
          partyKind: "government",
          officialName: "State of Washington",
          roles: [
            {
              normalized: "executing_party",
              sourceLabel: GOIA_ACCORD_METADATA.stateExecutingLabel,
              sourceUrl: GOIA_ACCORD_URL,
            },
            {
              normalized: "signatory_party",
              sourceLabel: GOIA_ACCORD_METADATA.stateSignatoryLabel,
              sourceUrl: GOIA_ACCORD_URL,
            },
          ],
        },
        {
          sourceId: null,
          partyKind: "collective_governments",
          officialName: GOIA_ACCORD_METADATA.tribalPartyName,
          roles: [
            {
              normalized: "executing_party",
              sourceLabel: GOIA_ACCORD_METADATA.tribalPartyName,
              sourceUrl: GOIA_ACCORD_URL,
            },
            {
              normalized: "signatory_party",
              sourceLabel: GOIA_ACCORD_METADATA.tribalSignatoryLabel,
              sourceUrl: GOIA_ACCORD_URL,
            },
          ],
        },
      ],
      executionEvent: {
        role: "executed",
        date: "1989-08-04",
        sourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
        sourceUrl: GOIA_ACCORD_URL,
      },
      statusReview: {
        currentStatus: "not_established",
        evidenceKind: "narrative_execution_language",
        sourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
        sourceUrl: GOIA_ACCORD_URL,
        reviewedOn: "2026-08-03",
      },
      supersessionReview: {
        state: "no_relationship_established",
        scope: "reviewed_official_sources_only",
        reviewedOn: "2026-08-03",
        sourceUrls: [GOIA_ACCORD_URL],
      },
      instrumentIdentity: {
        kind: "project_fallback",
        sourceIdentifier: null,
        fallbackRuleId: WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
      },
    });
    expect(record.dates).toEqual({
      introduced: null,
      published: null,
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: "2026-08-03T20:00:00.000Z",
    });
    expect(record.texts).toMatchObject({
      officialSummary: null,
      sourceExcerpt: null,
      detailAsset: { availability: "official_link_only", path: null },
    });
    expect(record.officialSubjects).toEqual([]);
    expect(record.taxonomyMemberships).toEqual([]);
    expect(record.relevance.map(({ basis }) => basis)).toEqual([
      "general_jurisdiction",
      "landmark",
    ]);
    expect(record.landmark).toMatchObject({
      isLandmark: true,
      criterionCodes: ["public-state-federal-accord"],
      reviewState: "approved",
      officialEvidence: [{ sourceDate: "1989-08-04" }],
    });
    expect(record.historical).toEqual({
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    });
    expect(record.aiSummary.exists).toBe(false);
    expect(JSON.stringify(record)).not.toContain("3785");
    expect(JSON.stringify(record)).not.toContain("provider prose");
  });

  it("supplies complete exact provenance for every retained source-derived leaf", () => {
    const record = normalizeGoiaAccord(projection(), {
      source: enabledGoiaAccordSource(),
      retrievedAt: "2026-08-03T20:00:00.000Z",
    });
    expect(record.fieldProvenance.map(({ field }) => field)).toEqual(
      sourceDerivedLeafPointers(record),
    );
    for (const pointer of GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS) {
      expect(record.fieldProvenance.map(({ field }) => field)).toContain(
        pointer,
      );
    }
    expect(
      record.fieldProvenance.every(
        (entry) =>
          entry.sourceId === "washington-centennial-accord" &&
          entry.sourceRecordId === "centennial-accord@1989-08-04" &&
          entry.sourceUrl === GOIA_ACCORD_URL &&
          entry.retrievedAt === "2026-08-03T20:00:00.000Z" &&
          entry.sourceUpdatedAt === null &&
          entry.adapterId === "washington-centennial-accord-adapter" &&
          entry.validationState === "validated",
      ),
    ).toBe(true);
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/sourceDocumentIdentifier",
      ),
    ).toMatchObject({
      transformation: "deterministic_mapping",
      transformRuleId: WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/accordContext/executionEvent/date",
      ),
    ).toMatchObject({
      sourcePath: "$article.executionEvent",
      transformation: "normalized",
      transformRuleId: "goia-accord-execution-date-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/accordContext/statusReview/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$article.executionEvent",
      transformation: "copied",
      transformRuleId: null,
    });
  });

  it("passes policy validation only in the explicit enabled validation context", () => {
    const source = enabledGoiaAccordSource();
    const record = normalizeGoiaAccord(projection(), {
      source,
      retrievedAt: "2026-08-03T20:00:00.000Z",
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

  it("fails closed on source configuration, time, or projection drift", () => {
    const wrongHost = enabledGoiaAccordSource();
    wrongHost.access.allowedHosts.push("example.invalid");
    expect(() =>
      normalizeGoiaAccord(projection(), {
        source: wrongHost,
        retrievedAt: "2026-08-03T20:00:00.000Z",
      }),
    ).toThrow(/differs from the reviewed enabled runtime contract/);

    expect(() =>
      normalizeGoiaAccord(projection(), {
        source: enabledGoiaAccordSource(),
        retrievedAt: "1989-08-03T20:00:00.000Z",
      }),
    ).toThrow(/cannot predate/);

    expect(() =>
      normalizeGoiaAccord(
        {
          ...projection(),
          executionDate: "1989-08-05",
        } as unknown as GoiaAccordProjection,
        {
          source: enabledGoiaAccordSource(),
          retrievedAt: "2026-08-03T20:00:00.000Z",
        },
      ),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));
  });

  it("binds the canonical registry entry to the independently reviewed fingerprint", () => {
    const registered = sourceRegistry.sources.find(
      ({ id }) => id === "washington-centennial-accord",
    );
    if (registered === undefined) {
      throw new Error("missing registered Accord source");
    }
    const original = registered.access.rateLimit;
    try {
      registered.access.rateLimit = `${original} Fictional drift.`;
      expect(() =>
        normalizeGoiaAccord(projection(), {
          source: enabledGoiaAccordSource(),
          retrievedAt: "2026-08-03T20:00:00.000Z",
        }),
      ).toThrow(/registered source differs from the reviewed contract/);
    } finally {
      registered.access.rateLimit = original;
    }
  });
});
