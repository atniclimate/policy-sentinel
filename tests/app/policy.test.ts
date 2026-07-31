import { describe, expect, it } from "vitest";
import {
  filterRecords,
  recordAvailableForNation,
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
});
