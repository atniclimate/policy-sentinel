import { describe, expect, it } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import taxonomy from "../../../config/taxonomy.v1.json";
import {
  SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS,
  SUPREME_COURT_TERM_HEADING,
  SUPREME_COURT_TERM_URL,
  normalizeSupremeCourtOpinion,
  parseSupremeCourtTermIndex,
  supremeCourtOpinionStableRecordId,
  type SupremeCourtOpinionProjection,
} from "../../../src/adapters/supreme-court-opinions-curated";
import {
  sourceDerivedLeafPointers,
  validateRecordSetPolicy,
} from "../../../src/pipeline/policy-validation.mjs";
import type {
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";
import { enabledSupremeCourtSource, supremeCourtFixture } from "./test-helpers";

function selectedRow() {
  return parseSupremeCourtTermIndex(supremeCourtFixture).rows[0];
}

describe("Supreme Court curated-opinion normalization", () => {
  it("emits one metadata-and-citation record without generic date or Nation inference", () => {
    const row = selectedRow();
    const record = normalizeSupremeCourtOpinion(row, {
      source: enabledSupremeCourtSource(),
      retrievedAt: "2026-07-31T20:00:00.000Z",
      termHeading: SUPREME_COURT_TERM_HEADING,
    });

    expect(record.internalId).toBe(supremeCourtOpinionStableRecordId(row));
    expect(record.source).toMatchObject({
      id: "supreme-court-opinions-curated",
      recordId: "16-1498@586 U.S. 347",
      adapterId: "supreme-court-opinions-curated-adapter",
      adapterVersion: "1.1.0",
      coverage: {
        from: "2019-03-19",
        through: "2019-03-19",
      },
    });
    expect(record).toMatchObject({
      schemaVersion: "1.4.0",
      accordContext: null,
      officialTitle: "Washington State Dept. of Licensing v. Cougar Den, Inc.",
      sourceDocumentIdentifier: "16-1498",
      documentType: "court_decision",
      jurisdiction: {
        level: "federal",
        name: "United States",
        stateCode: null,
        generalJurisdictionOnly: true,
      },
      issuingBodies: [
        {
          sourceId: null,
          officialName: "Supreme Court of the United States",
        },
      ],
      judicialContext: {
        adjudicatingBody: {
          kind: "court",
          sourceId: null,
          officialName: "Supreme Court of the United States",
        },
        docketNumbers: ["16-1498"],
        citations: [
          {
            kind: "reporter",
            value: "586 U.S. 347",
            sourceUrl:
              "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=546",
          },
        ],
        decisionDate: "2019-03-19",
        documentForm: {
          normalized: "opinion",
          sourceLabel: "Opinions of the Court",
        },
        publicationStatus: {
          normalized: "bound_volume",
          sourceLabel: "U.S. Reports, Volume 586",
          asOf: "2026-07-31",
        },
        revisionReview: {
          state: "no_separate_relationship_exposed",
          reviewedOn: "2026-07-31",
        },
      },
      status: {
        normalized: "decided",
        sourceLabel: "Opinions of the Court - 2018",
        asOf: "2019-03-19",
      },
      urls: {
        officialSource: SUPREME_COURT_TERM_URL,
        officialFullText: null,
      },
    });
    expect(record.dates).toEqual({
      introduced: null,
      published: null,
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: "2026-07-31T20:00:00.000Z",
    });
    expect(record.actionHistory).toEqual([]);
    expect(record.statusHistory).toEqual([]);
    expect(record.sourceDocumentRelationships).toEqual([]);
    expect(record.texts).toMatchObject({
      officialSummary: null,
      sourceExcerpt: null,
      detailAsset: { availability: "official_link_only", path: null },
    });
    expect(record.officialSubjects).toEqual([]);
    expect(record.taxonomyMemberships).toEqual([]);
    expect(record.isUnclassified).toBe(true);
    expect(record.relevance).toEqual([
      expect.objectContaining({
        basis: "general_jurisdiction",
        sourceUrl: SUPREME_COURT_TERM_URL,
      }),
      expect.objectContaining({
        basis: "landmark",
        sourceUrl: SUPREME_COURT_TERM_URL,
      }),
    ]);
    expect(record.nationAssociations).toEqual([]);
    expect(record.landmark).toEqual({
      isLandmark: true,
      criterionCodes: ["documented-court-decision"],
      reviewState: "approved",
      officialEvidence: [
        {
          sourceLabel:
            "Washington State Dept. of Licensing v. Cougar Den, Inc.; docket 16-1498; decided 2019-03-19; 586 U.S. 347.",
          sourceUrl: SUPREME_COURT_TERM_URL,
          sourceDate: "2019-03-19",
          reproductionBasis: expect.stringContaining(
            "Metadata from the selected Supreme Court term index",
          ),
        },
      ],
    });
    expect(record.historical).toEqual({
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    });
    expect(record.aiSummary).toEqual({
      exists: false,
      label: "AI-generated source summary",
    });
    expect(JSON.stringify(record)).not.toContain(
      "IGNORED_SCOTUS_TITLE_SENTINEL",
    );
  });

  it("provides exact complete provenance for every retained judicial and generic leaf", () => {
    const record = normalizeSupremeCourtOpinion(selectedRow(), {
      source: enabledSupremeCourtSource(),
      retrievedAt: "2026-07-31T20:00:00.000Z",
      termHeading: SUPREME_COURT_TERM_HEADING,
    });
    expect(record.fieldProvenance.map(({ field }) => field)).toEqual(
      sourceDerivedLeafPointers(record),
    );
    for (const required of SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS) {
      expect(record.fieldProvenance.map(({ field }) => field)).toContain(
        required,
      );
    }
    expect(
      record.fieldProvenance.every(
        (entry) =>
          entry.sourceId === "supreme-court-opinions-curated" &&
          entry.sourceRecordId === record.source.recordId &&
          entry.sourceUrl === SUPREME_COURT_TERM_URL &&
          entry.retrievedAt === "2026-07-31T20:00:00.000Z" &&
          entry.sourceUpdatedAt === null &&
          entry.validationState === "validated",
      ),
    ).toBe(true);
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/judicialContext/decisionDate",
      ),
    ).toMatchObject({
      sourcePath: "$opinionTables[1].rows[41].cells[1].text",
      transformation: "normalized",
      transformRuleId: "supreme-court-decision-date-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/judicialContext/citations/0/sourceUrl",
      ),
    ).toMatchObject({
      sourcePath: "$opinionTables[1].rows[41].cells[3].a[0].@href",
      transformation: "normalized",
      transformRuleId: "supreme-court-bound-volume-publication-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) =>
          field === "/judicialContext/publicationStatus/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$opinionTables[1].rows[41].cells[3].a[0].@href",
      transformation: "deterministic_mapping",
      transformRuleId: "supreme-court-bound-volume-publication-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/judicialContext/revisionReview/state",
      ),
    ).toMatchObject({
      sourcePath: "$opinionTables[1].rows[41].cells[0].elements",
      transformation: "deterministic_mapping",
      transformRuleId: "supreme-court-revision-review-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/landmark/officialEvidence/0/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$opinionTables[1].rows[41]",
      transformation: "normalized",
      transformRuleId: "supreme-court-documented-decision-landmark-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/landmark/reviewState",
      ),
    ).toMatchObject({
      sourcePath: "$landmarkReview.reviewState",
      transformation: "deterministic_mapping",
      transformRuleId: "supreme-court-documented-decision-landmark-v1",
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/status/sourceLabel",
      ),
    ).toMatchObject({
      sourcePath: "$document.h3",
      transformation: "copied",
      transformRuleId: null,
    });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/judicialContext/publicationStatus/asOf",
      ),
    ).toMatchObject({ sourcePath: "$retrieval.retrievedAt" });
    expect(
      record.fieldProvenance.find(
        ({ field }) => field === "/judicialContext/revisionReview/reviewedOn",
      ),
    ).toMatchObject({ sourcePath: "$retrieval.retrievedAt" });
  });

  it("passes schema-adjacent policy validation in an explicit enabled context", () => {
    const source = enabledSupremeCourtSource();
    const record = normalizeSupremeCourtOpinion(selectedRow(), {
      source,
      retrievedAt: "2026-07-31T20:00:00.000Z",
      termHeading: SUPREME_COURT_TERM_HEADING,
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

  it("fails closed on source registration, retrieval, heading, or row drift", () => {
    const wrongHost = enabledSupremeCourtSource();
    wrongHost.access.allowedHosts.push("example.invalid");
    expect(() =>
      normalizeSupremeCourtOpinion(selectedRow(), {
        source: wrongHost,
        retrievedAt: "2026-07-31T20:00:00.000Z",
        termHeading: SUPREME_COURT_TERM_HEADING,
      }),
    ).toThrow(/differs from the reviewed enabled runtime contract/);

    expect(() =>
      normalizeSupremeCourtOpinion(selectedRow(), {
        source: enabledSupremeCourtSource(),
        retrievedAt: "2019-03-18T20:00:00.000Z",
        termHeading: SUPREME_COURT_TERM_HEADING,
      }),
    ).toThrow(/differs from the reviewed normalization scope/);

    expect(() =>
      normalizeSupremeCourtOpinion(selectedRow(), {
        source: enabledSupremeCourtSource(),
        retrievedAt: "2026-07-31T20:00:00.000Z",
        termHeading: "Opinions of the Court - 2019",
      }),
    ).toThrow(/differs from the reviewed normalization scope/);

    expect(() =>
      normalizeSupremeCourtOpinion(
        { ...selectedRow(), reporterCitation: "609/2" },
        {
          source: enabledSupremeCourtSource(),
          retrievedAt: "2026-07-31T20:00:00.000Z",
          termHeading: SUPREME_COURT_TERM_HEADING,
        },
      ),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));

    expect(() =>
      normalizeSupremeCourtOpinion(
        {
          ...selectedRow(),
          revisionElementExposed: true,
        } as unknown as SupremeCourtOpinionProjection,
        {
          source: enabledSupremeCourtSource(),
          retrievedAt: "2026-07-31T20:00:00.000Z",
          termHeading: SUPREME_COURT_TERM_HEADING,
        },
      ),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));
  });

  it("fails closed on reviewed rate-limit, cadence, or limitation drift", () => {
    const rateLimitDrift = enabledSupremeCourtSource();
    rateLimitDrift.access.rateLimit += " Synthetic drift.";
    const cadenceDrift = enabledSupremeCourtSource();
    cadenceDrift.coverage.cadence += " Synthetic drift.";
    const limitationsDrift = enabledSupremeCourtSource();
    limitationsDrift.coverage.limitations += " Synthetic drift.";

    for (const source of [rateLimitDrift, cadenceDrift, limitationsDrift]) {
      expect(() =>
        normalizeSupremeCourtOpinion(selectedRow(), {
          source,
          retrievedAt: "2026-07-31T20:00:00.000Z",
          termHeading: SUPREME_COURT_TERM_HEADING,
        }),
      ).toThrow(/differs from the reviewed enabled runtime contract/);
    }
  });
});
