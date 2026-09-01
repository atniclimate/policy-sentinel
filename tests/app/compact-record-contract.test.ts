import { describe, expect, it } from "vitest";
import { normalizeRecord } from "../../src/app/data";
import {
  filterRecords,
  recordEventDate,
  recordMatchesPolicy,
} from "../../src/app/policy";
import { emptyCriteria } from "../../src/app/routing";
import type { Nation } from "../../src/app/types";

const nation: Nation = {
  id: "nation:synthetic",
  officialName: "Synthetic Nation",
  aliases: [],
  coveredStateCodes: [],
};

const compactRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "psr:synthetic:record-1",
  detailPath: "details/cHNyOnN5bnRoZXRpYzpyZWNvcmQtMQ.json",
  sourceDocumentIdentifier: "SYN-RECORD-1",
  officialTitle: "Synthetic compact official record",
  documentType: "notice",
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
    generalJurisdictionOnly: true,
  },
  issuingBodies: ["Synthetic Public Agency"],
  judicialContext: null,
  accordContext: null,
  status: {
    normalized: "active",
    sourceLabel: "Open",
    asOf: "2026-07-30",
  },
  source: {
    id: "synthetic-source",
    name: "Synthetic Official Source",
    provider: "Synthetic Public Agency",
  },
  dates: {
    published: "2026-07-30",
    updated: "2026-07-30T12:00:00Z",
    retrieved: "2026-07-30T13:00:00Z",
  },
  urls: {
    officialSource: "https://official.example.invalid/SYN-RECORD-1",
  },
  categoryIds: ["category-a", "category-b"],
  subcategoryIds: ["subcategory-a", "subcategory-b"],
  taxonomyMemberships: [
    {
      categoryId: "category-a",
      subcategoryId: "subcategory-a",
    },
    {
      categoryId: "category-b",
      subcategoryId: "subcategory-b",
    },
  ],
  isUnclassified: false,
  nationIds: [],
  relevance: [
    {
      basis: "general_jurisdiction",
      label: "General federal jurisdiction",
    },
  ],
  change: {
    kind: "unchanged",
    urgentAlert: null,
  },
  landmark: {
    isLandmark: false,
  },
  ...overrides,
});

describe("compact record contract", () => {
  it("preserves exact many-to-many category and subcategory pairs", () => {
    const record = normalizeRecord(compactRecord());
    expect(record?.taxonomyMemberships).toEqual([
      {
        categoryId: "category-a",
        subcategoryId: "subcategory-a",
        officialSubjectLabels: [],
      },
      {
        categoryId: "category-b",
        subcategoryId: "subcategory-b",
        officialSubjectLabels: [],
      },
    ]);

    const matching = {
      ...emptyCriteria(),
      allPolicyAreas: false,
      categoryIds: ["category-a"],
      subcategoryIds: { "category-a": ["subcategory-a"] },
    };
    const crossed = {
      ...matching,
      subcategoryIds: { "category-a": ["subcategory-b"] },
    };

    expect(record && recordMatchesPolicy(record, matching)).toBe(true);
    expect(record && recordMatchesPolicy(record, crossed)).toBe(false);
  });

  it("does not reconstruct memberships or coerce classification from parallel ID arrays", () => {
    const legacy = compactRecord();
    delete (legacy as { taxonomyMemberships?: unknown }).taxonomyMemberships;
    const record = normalizeRecord(legacy);

    expect(record?.taxonomyMemberships).toEqual([]);
    expect(record?.isUnclassified).toBe(false);
  });

  it("preserves landmark metadata so the timeline can select the record", () => {
    const record = normalizeRecord(
      compactRecord({
        relevance: [
          {
            basis: "general_jurisdiction",
            label: "General federal jurisdiction",
          },
          {
            basis: "landmark",
            label: "Verified landmark; not Nation-specific",
            sourceUrl: "https://official.example.invalid/SYN-RECORD-1",
          },
        ],
        landmark: {
          isLandmark: true,
        },
      }),
    );
    expect(record?.landmark).toMatchObject({
      isLandmark: true,
    });

    const criteria = {
      ...emptyCriteria(),
      nationId: nation.id,
      allPolicyAreas: true,
    };
    expect(
      record ? filterRecords([record], nation, criteria, false, true) : [],
    ).toHaveLength(1);
  });

  it("preserves detail relationships without adding them to compact search text", () => {
    const compact = normalizeRecord(compactRecord());
    expect(compact?.sourceDocumentRelationships).toEqual([]);

    const relationshipLabel = "Corrections label must remain detail-only";
    const detail = normalizeRecord(
      compactRecord({
        sourceDocumentRelationships: [
          {
            relationshipType: "corrected_by",
            targetSourceRecordId: "SYN-CORRECTION",
            targetUrl:
              "https://official.example.invalid/records/SYN-CORRECTION",
            sourceLabel: relationshipLabel,
          },
        ],
      }),
    );

    expect(detail?.sourceDocumentRelationships).toEqual([
      {
        relationshipType: "corrected_by",
        targetSourceRecordId: "SYN-CORRECTION",
        targetUrl: "https://official.example.invalid/records/SYN-CORRECTION",
        sourceLabel: relationshipLabel,
      },
    ]);
    expect(detail?.searchText).not.toContain(relationshipLabel.toLowerCase());
  });

  it("preserves judicial context and makes court, docket, and citation searchable", () => {
    const record = normalizeRecord(
      compactRecord({
        documentType: "court_decision",
        issuingBodies: ["Synthetic Supreme Court"],
        judicialContext: {
          adjudicatingBody: {
            kind: "court",
            sourceId: null,
            officialName: "Synthetic Supreme Court",
          },
          docketNumbers: ["SYN-DOCKET"],
          citations: [
            {
              kind: "reporter",
              value: "999 U.S. 1",
              sourceUrl:
                "https://official.example.invalid/opinions/999.pdf#page=1",
            },
          ],
          decisionDate: "2019-03-19",
          documentForm: {
            normalized: "opinion",
            sourceLabel: "Opinions of the Court",
          },
          publicationStatus: {
            normalized: "bound_volume",
            sourceLabel: "U.S. Reports, Volume 999",
            asOf: "2026-07-31",
          },
          revisionReview: {
            state: "no_separate_relationship_exposed",
            reviewedOn: "2026-07-31",
          },
        },
      }),
    );

    expect(record?.judicialContext).toMatchObject({
      adjudicatingBody: {
        kind: "court",
        officialName: "Synthetic Supreme Court",
      },
      docketNumbers: ["SYN-DOCKET"],
      citations: [{ value: "999 U.S. 1" }],
      decisionDate: "2019-03-19",
    });
    expect(record?.searchText).toContain("synthetic supreme court");
    expect(record?.searchText).toContain("syn-docket");
    expect(record?.searchText).toContain("999 u.s. 1");
  });

  it("preserves Accord context for search and execution-date filtering", () => {
    const record = normalizeRecord(
      compactRecord({
        documentType: "intergovernmental_accord",
        issuingBodies: [],
        accordContext: {
          parties: [
            {
              sourceId: "government:synthetic-state",
              partyKind: "government",
              officialName: "Synthetic State Government",
              roles: [
                {
                  normalized: "executing_party",
                  sourceLabel: "State executing party",
                  sourceUrl: "https://accord.example.invalid/source",
                },
              ],
            },
            {
              sourceId: null,
              partyKind: "collective_governments",
              officialName: "Synthetic Intergovernmental Council",
              roles: [
                {
                  normalized: "signatory_party",
                  sourceLabel: "Council signatory party",
                  sourceUrl: "https://accord.example.invalid/source",
                },
              ],
            },
          ],
          executionEvent: {
            role: "signed",
            date: "1974-08-04",
            sourceLabel: "Signed August 4, 1974",
            sourceUrl: "https://accord.example.invalid/source",
          },
          statusReview: {
            currentStatus: "not_established",
            evidenceKind: "narrative_execution_language",
            sourceLabel: "Reviewed narrative execution history",
            sourceUrl: "https://accord.example.invalid/history",
            reviewedOn: "2026-07-30",
          },
          supersessionReview: {
            state: "no_relationship_established",
            scope: "reviewed_official_sources_only",
            reviewedOn: "2026-07-30",
            sourceUrls: ["https://accord.example.invalid/source"],
          },
          instrumentIdentity: {
            kind: "project_fallback",
            sourceIdentifier: null,
            fallbackRuleId: "synthetic-accord-fallback-v1",
          },
        },
        status: { normalized: "unknown", sourceLabel: null, asOf: null },
        dates: {
          published: null,
          updated: null,
          lastAction: null,
          deadline: null,
        },
      }),
    );

    expect(record?.accordContext?.parties).toHaveLength(2);
    expect(record?.searchText).toContain("synthetic state government");
    expect(record?.searchText).toContain("council signatory party");
    expect(record?.searchText).toContain(
      "reviewed narrative execution history",
    );
    expect(record && recordEventDate(record)).toBe("1974-08-04");
  });
});
