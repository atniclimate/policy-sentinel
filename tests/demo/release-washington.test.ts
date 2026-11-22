/**
 * Release check, Washington State Legislature (2026-11-18). The fixtures are
 * the live deployed Worker's answers for one current-biennium bill, recorded
 * 2026-11-19T03:53Z, trimmed to public bill metadata (no names, no body text).
 * They prove the page's own validators accept what the Worker really sends.
 */
import { describe, expect, it } from "vitest";
import { currentBiennium, parseWashingtonQuery } from "../../worker/src/index";
import {
  policyId,
  policyValueV3,
  searchValue,
} from "../../src/demo/validation";

const TEXT_URL =
  "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1100.htm";
const CITATION = {
  sourceId: "washington",
  identifier: "HB 1100, 2025-26 biennium, as introduced",
  title: "Relating to creating a local sales and use tax",
  issuingBody: "Washington State Legislature",
  kind: "Bill",
  date: "2025-01-13",
  officialUrl: TEXT_URL,
  textUrl: TEXT_URL,
  retrievedAt: "2026-11-19T03:53:02.893Z",
  summary: null,
  textAvailable: true,
  matchKey: null,
};
const LIVE_SEARCH = {
  ok: true,
  source: "washington",
  query: "HB 1100 2025-26",
  total: 1,
  page: 1,
  results: [CITATION],
  retrievedAt: "2026-11-19T03:53:02.893Z",
  criteria: {
    version: 2,
    source: "washington",
    query: "HB 1100 2025-26",
    dateFrom: null,
    dateTo: null,
    page: 1,
    pageSize: 10,
    sort: "reference",
    resultLevel: null,
    historical: null,
    cursor: null,
    match: "text",
    documentType: null,
  },
  continuation: { kind: "stopped", reason: "not_applicable" },
};
const LIVE_POLICY = {
  ok: true,
  citation: { ...CITATION, retrievedAt: "2026-11-19T03:53:29.030Z" },
  receipt: {
    sha256: "490feaaba8055fef471a89540a1b6975f18c375f639f26ec5899dfc1354fe6bb",
    bytes: 5190,
    retrievedAt: "2026-11-19T03:53:29.030Z",
    textUrl: TEXT_URL,
  },
  engine: {
    parser: "policy-text",
    parserVersion: "1.0.0",
    parserConfigDigest:
      "8e9010eff045c34f089f845669da795bb833aefdf7a6b134bf6bf9910030eda5",
    rulesVersion: "demo-rules-1.1.0",
  },
  blockCount: 17,
  characterCount: 2853,
  issues: [],
  exclusions: [{ reason: "unsafe_link", count: 6 }],
  warnings: [
    "amendment_markup_preserved_as_explicit_markers",
    "metadata_candidates_require_source_review_and_field_provenance",
  ],
  opening: "State of Washington | 69th Legislature | 2025 Regular Session",
  version: 3,
  chain: [],
};

describe("Washington release check: live Worker answers", () => {
  it("the page accepts the live bill lookup exactly as the Worker sent it", () => {
    const read = searchValue(LIVE_SEARCH, "washington", "HB 1100 2025-26", 1, {
      version: 2,
      dateFrom: null,
      dateTo: null,
      continuation: null,
    });
    expect(read.results).toHaveLength(1);
    expect(read.results[0].identifier).toBe(CITATION.identifier);
  });

  it("the page's id for the result is one the Worker reads back", () => {
    const id = policyId(CITATION);
    expect(id).toBe("HB 1100 2025-26");
    expect(parseWashingtonQuery(id)).toMatchObject({
      prefix: "HB",
      number: "1100",
      biennium: "2025-26",
    });
    const read = policyValueV3(LIVE_POLICY, { source: "washington", id });
    expect(read.receipt.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(read.chain).toEqual([]);
  });

  it("a bare bill number reads the session in progress on the check date", () => {
    expect(currentBiennium(new Date("2027-01-01T07:59:59Z"))).toBe("2025-26");
    expect(currentBiennium(new Date("2027-01-01T08:00:00Z"))).toBe("2027-28");
    expect(currentBiennium(new Date("2026-11-19T03:53:00Z"))).toBe("2025-26");
    expect(
      parseWashingtonQuery("HB 1100", new Date("2026-11-19T03:53:00Z"))
        ?.biennium,
    ).toBe("2025-26");
  });
});
