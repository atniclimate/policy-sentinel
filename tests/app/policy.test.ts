import { describe, expect, it } from "vitest";
import {
  filterRecords,
  recordAvailableForNation,
  recordEventDate,
  whyShownFor,
} from "../../src/app/policy";
import { emptyCriteria } from "../../src/app/routing";
import type { Nation, PublicRecord } from "../../src/app/types";

const nation: Nation = {
  id: "nation:test",
  officialName: "Synthetic Nation",
  aliases: [],
  coveredStateCodes: ["WA"],
};

const record = (overrides: Partial<PublicRecord>): PublicRecord =>
  ({
    internalId: "psr:test:1",
    officialTitle: "Official synthetic title",
    sourceDocumentIdentifier: "SYN-1",
    documentType: "notice",
    source: { id: "source", name: "Official Source" },
    jurisdiction: { level: "federal", name: "United States", stateCode: null },
    issuingBodies: [],
    judicialContext: null,
    accordContext: null,
    status: { normalized: "active", sourceLabel: "Open", asOf: null },
    dates: {
      introduced: null,
      published: "2026-01-01",
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: "2026-01-02T00:00:00Z",
    },
    urls: { officialSource: "https://example.invalid", officialFullText: null },
    texts: {
      officialSummary: null,
      sourceExcerpt: null,
      officialLanguage: null,
      detailPath: null,
      detailAvailability: null,
      detailReproductionBasis: null,
    },
    sponsors: [],
    committees: [],
    actionHistory: [],
    statusHistory: [],
    sourceDocumentRelationships: [],
    officialSubjects: [],
    taxonomyMemberships: [],
    isUnclassified: true,
    relevance: [],
    nationIds: [],
    nationAssociations: [],
    landmark: {
      isLandmark: false,
      criterionCodes: [],
      officialEvidence: [],
    },
    historical: { isHistorical: false },
    dataQuality: { state: "validated", issues: [] },
    sourceHealth: {
      status: "healthy",
      dataAsOf: "2026-01-01",
      lastSuccessfulRetrievalAt: "2026-01-02",
      usingLastKnownGood: false,
      message: null,
    },
    change: { kind: "unchanged", urgentAlert: null },
    aiSummary: { exists: false, label: "AI-generated source summary" },
    fieldProvenance: [],
    searchText: "official synthetic title official source",
    ...overrides,
  }) as PublicRecord;

describe("Nation relationship policy", () => {
  it("shows federal records only as general jurisdiction without evidence", () => {
    const federal = record({});
    expect(recordAvailableForNation(federal, nation)).toBe(true);
    expect(whyShownFor(federal, nation.id).basis).toBe("general_jurisdiction");
    expect(whyShownFor(federal, nation.id).label).toContain(
      "not Nation-specific",
    );
  });

  it("fails closed for county records without exact Nation evidence", () => {
    const county = record({
      jurisdiction: {
        level: "county",
        name: "Synthetic County",
        stateCode: "WA",
      },
    });
    expect(recordAvailableForNation(county, nation)).toBe(false);
  });

  it("accepts validated explicit Nation evidence", () => {
    const explicit = record({
      jurisdiction: {
        level: "county",
        name: "Synthetic County",
        stateCode: "WA",
      },
      nationAssociations: [
        {
          nationId: nation.id,
          officialNationName: nation.officialName,
          basis: "explicit_mention",
          evidenceText: "The official source explicitly names the Nation.",
          evidenceUrl: "https://example.invalid/evidence",
          validationState: "validated",
        },
      ],
      nationIds: [nation.id],
    });
    expect(recordAvailableForNation(explicit, nation)).toBe(true);
    expect(whyShownFor(explicit, nation.id).basis).toBe(
      "explicit_nation_reference",
    );
  });

  it("keeps unmapped records discoverable on the Unclassified route", () => {
    const criteria = {
      ...emptyCriteria(),
      nationId: nation.id,
      allPolicyAreas: true,
    };
    expect(filterRecords([record({})], nation, criteria, true)).toHaveLength(1);
  });

  it("uses the judicial decision date for filtering and ordering", () => {
    const judicial = record({
      documentType: "court_decision",
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
            sourceUrl: "https://example.invalid/999.pdf#page=1",
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
      dates: {
        introduced: null,
        published: null,
        updated: null,
        lastAction: null,
        deadline: null,
        effective: null,
        retrieved: "2026-07-31T00:00:00Z",
      },
    });
    expect(recordEventDate(judicial)).toBe("2019-03-19");

    const criteria = {
      ...emptyCriteria(),
      nationId: nation.id,
      allPolicyAreas: true,
      dateFrom: "2019-03-19",
      dateThrough: "2019-03-19",
    };
    expect(filterRecords([judicial], nation, criteria)).toEqual([judicial]);
    expect(
      filterRecords([judicial], nation, {
        ...criteria,
        dateFrom: "2019-03-20",
      }),
    ).toEqual([]);
  });

  it("uses the Accord execution date instead of a page-update timestamp", () => {
    const accord = record({
      documentType: "intergovernmental_accord",
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
          reviewedOn: "2026-07-31",
        },
        supersessionReview: {
          state: "no_relationship_established",
          scope: "reviewed_official_sources_only",
          reviewedOn: "2026-07-31",
          sourceUrls: ["https://accord.example.invalid/source"],
        },
        instrumentIdentity: {
          kind: "project_fallback",
          sourceIdentifier: null,
          fallbackRuleId: "synthetic-accord-fallback-v1",
        },
      },
      dates: {
        introduced: null,
        published: null,
        updated: "2026-07-31T00:00:00Z",
        lastAction: null,
        deadline: null,
        effective: null,
        retrieved: "2026-07-31T01:00:00Z",
      },
    });

    expect(recordEventDate(accord)).toBe("1974-08-04");
    const criteria = {
      ...emptyCriteria(),
      nationId: nation.id,
      allPolicyAreas: true,
      dateFrom: "1974-08-04",
      dateThrough: "1974-08-04",
    };
    expect(filterRecords([accord], nation, criteria)).toEqual([accord]);
  });
});
