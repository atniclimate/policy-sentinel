import { describe, expect, it } from "vitest";
import { normalizeRecord } from "../../src/app/data";
import { filterRecords, recordMatchesPolicy } from "../../src/app/policy";
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
  officialTitle: "Synthetic compact official record",
  documentType: "notice",
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
    generalJurisdictionOnly: true,
  },
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
    criterionCodes: [],
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

  it("does not reconstruct memberships from parallel ID arrays", () => {
    const legacy = compactRecord();
    delete (legacy as { taxonomyMemberships?: unknown }).taxonomyMemberships;
    const record = normalizeRecord(legacy);

    expect(record?.taxonomyMemberships).toEqual([]);
    expect(record?.isUnclassified).toBe(true);
  });

  it("preserves landmark metadata so the timeline can select the record", () => {
    const record = normalizeRecord(
      compactRecord({
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
});
