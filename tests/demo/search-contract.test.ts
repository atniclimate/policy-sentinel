// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cfrQuery,
  dateRangeValue,
  documentTypeFilter,
  nextSearchCursor,
  parseCfrQuery,
  REGULATIONS_V2_CONFIRMED,
  sameSearchCriteria,
  searchCriteria,
  supportsDatedGovinfoQuery,
  supportsMatch,
} from "../../src/demo/search-contract";
import type { DemoSearchOptions } from "../../src/demo/types";

const dates = {
  dateFrom: "2024-01-01",
  dateTo: "2024-12-31",
  continuation: null,
};

describe("bounded demo search criteria", () => {
  it("keeps inclusive year endpoints and leaves a blank range unbounded", () => {
    expect(dateRangeValue(dates.dateFrom, dates.dateTo)).toEqual({
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });
    expect(dateRangeValue(null, null)).toEqual({
      dateFrom: null,
      dateTo: null,
    });
    expect(dateRangeValue("2024-02-29", "2024-02-29")).toEqual({
      dateFrom: "2024-02-29",
      dateTo: "2024-02-29",
    });
  });

  it.each([
    ["2023-02-29", "2024-01-01"],
    ["2024-04-31", "2024-12-31"],
    ["2024-13-01", "2024-12-31"],
    ["2024-02-01", "2024-01-01"],
    ["2024-01-01", null],
    [null, "2024-12-31"],
    ["2024-1-01", "2024-12-31"],
  ])("rejects impossible or incomplete date range %s / %s", (from, to) => {
    expect(() => dateRangeValue(from, to)).toThrow();
  });

  it.each(["federal-register", "govinfo", "regulations"])(
    "binds %s dates and canonical provider options",
    (source) => {
      const criteria = searchCriteria(source, "water quality", 1, dates);
      expect(criteria).toMatchObject({
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        version: 1,
        source,
        query: "water quality",
        page: 1,
        pageSize: 10,
        cursor: null,
      });
    },
  );

  it.each(["water", "water quality", "water 2024", "WATER  quality"])(
    "accepts narrow dated GovInfo input %s",
    (query) => {
      expect(supportsDatedGovinfoQuery(query)).toBe(true);
      expect(searchCriteria("govinfo", query, 1, dates).query).toBe(query);
    },
  );

  it.each([
    '"water quality"',
    "water OR land",
    "water and land",
    "water NOT land",
    "(water)",
    "water\\",
    "collection:FR",
    "water-quality",
    "water\nquality",
    "café",
  ])(
    "rejects ambiguous dated GovInfo input without rewriting undated input: %s",
    (query) => {
      expect(supportsDatedGovinfoQuery(query)).toBe(false);
      expect(() => searchCriteria("govinfo", query, 1, dates)).toThrow();
      expect(searchCriteria("govinfo", query, 1).query).toBe(query);
    },
  );

  it("validates the complete opaque continuation binding", () => {
    const first = searchCriteria("govinfo", "water", 1, dates);
    const next = nextSearchCursor(first, "opaque+/=token");
    expect(
      searchCriteria("govinfo", "water", 2, { ...dates, continuation: next }),
    ).toEqual(next);
    for (const patch of [
      { source: "regulations" },
      { query: "land" },
      { dateFrom: "2023-01-01" },
      { dateTo: "2025-01-01" },
      { page: 3 },
      { pageSize: 20 },
      { version: 2 },
      { sort: "date" },
      { historical: true },
      { resultLevel: "package" },
      { cursor: "*" },
      { cursor: "" },
      { cursor: "has space" },
      { cursor: "X".repeat(4097) },
    ]) {
      expect(() =>
        searchCriteria("govinfo", "water", 2, {
          ...dates,
          continuation: { ...next, ...patch } as typeof next,
        }),
      ).toThrow();
    }
    expect(() => searchCriteria("govinfo", "water", 2, dates)).toThrow();
    expect(() =>
      searchCriteria("govinfo", "water", 1, { ...dates, continuation: next }),
    ).toThrow();
  });

  it.each([
    ["federal-register", 51],
    ["govinfo", 51],
    ["regulations", 21],
    ["congress", 2],
    ["washington", 2],
  ])("rejects %s page %s", (source, page) => {
    expect(() =>
      searchCriteria(String(source), "water", Number(page)),
    ).toThrow();
  });

  it.each(["congress", "washington"])(
    "refuses active dates for reference lookup %s",
    (source) => {
      expect(() => searchCriteria(source, "hr 1234 119", 1, dates)).toThrow();
    },
  );
});

describe("search contract v2 criteria", () => {
  const v2 = (extra: Partial<DemoSearchOptions> = {}): DemoSearchOptions => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 2,
    ...extra,
  });

  it("keeps the v1 echo exactly as 0.8.0 sends it, key order included", () => {
    const pinned =
      '{"version":1,"source":"federal-register","query":"water","dateFrom":null,"dateTo":null,"page":1,"pageSize":10,"sort":"relevance","resultLevel":null,"historical":null,"cursor":null}';
    expect(JSON.stringify(searchCriteria("federal-register", "water", 1))).toBe(
      pinned,
    );
    expect(
      JSON.stringify(
        searchCriteria("federal-register", "water", 1, {
          dateFrom: null,
          dateTo: null,
          continuation: null,
          version: 1,
          match: "text",
          documentType: null,
        }),
      ),
    ).toBe(pinned);
  });

  it("adds match and documentType only on v2", () => {
    expect(searchCriteria("regulations", "water", 1, v2())).toEqual({
      ...searchCriteria("regulations", "water", 1),
      version: 2,
      match: "text",
      documentType: null,
    });
  });

  it.each<[string, DemoSearchOptions["match"], string]>([
    ["federal-register", "docket", "Docket No. 260916-0002"],
    ["federal-register", "docket", "FF09M32000-267-FXMB1231099BPP0"],
    ["federal-register", "rin", "0648-BO46"],
    ["federal-register", "cfr", "50 CFR 660"],
    // Held until its live check is recorded (REGULATIONS_V2_CONFIRMED).
    ...(REGULATIONS_V2_CONFIRMED
      ? [
          ["regulations", "docket", "EPA-HQ-OAR-2021-0317"] as [
            string,
            DemoSearchOptions["match"],
            string,
          ],
        ]
      : []),
  ])("binds a %s %s identifier %s", (source, match, query) => {
    expect(searchCriteria(source, query, 1, v2({ match }))).toMatchObject({
      version: 2,
      query,
      match,
      sort: source === "federal-register" ? "newest" : "-postedDate",
    });
  });

  it.each<[string, Partial<DemoSearchOptions>, string, string]>([
    [
      "federal-register",
      { version: 1, match: "docket" },
      "Docket No. 1",
      "bad_query",
    ],
    [
      "federal-register",
      { version: 1, documentType: "RULE" },
      "water",
      "bad_query",
    ],
    ["federal-register", { version: 3 as 2 }, "water", "bad_query"],
    ["federal-register", { match: "near" as "text" }, "water", "bad_query"],
    [
      "federal-register",
      { documentType: "rule" as "RULE" },
      "water",
      "bad_query",
    ],
    ["federal-register", { match: "rin" }, "0648-BO4", "bad_query"],
    ["federal-register", { match: "cfr" }, "50 CFR", "bad_query"],
    // A part range: how the Federal Register matches one is unconfirmed.
    ["federal-register", { match: "cfr" }, "40 CFR 1-50", "bad_query"],
    ["federal-register", { match: "docket" }, " Docket No. 1", "bad_query"],
    [
      "regulations",
      { match: "docket" },
      "EPA-HQ;EPA-HQ-2",
      REGULATIONS_V2_CONFIRMED ? "bad_query" : "unsupported_criteria",
    ],
    ["regulations", { match: "rin" }, "0648-BO46", "unsupported_criteria"],
    [
      "regulations",
      { documentType: "PRESDOCU" },
      "water",
      "unsupported_criteria",
    ],
    [
      "govinfo",
      { match: "docket" },
      "EPA-HQ-OAR-2021-0317",
      "unsupported_criteria",
    ],
    ["govinfo", { documentType: "NOTICE" }, "water", "unsupported_criteria"],
    [
      "congress",
      { documentType: "RULE" },
      "hr 1234 119",
      "unsupported_criteria",
    ],
    ["washington", { match: "cfr" }, "50 CFR 660", "unsupported_criteria"],
  ])("refuses %s %j for %s with %s", (source, extra, query, code) => {
    expect(() =>
      searchCriteria(source, query, 1, { ...v2(), ...extra }),
    ).toThrow(expect.objectContaining({ code }));
  });

  it("states which sources match which identifiers and types", () => {
    expect(
      [
        "federal-register",
        "regulations",
        "govinfo",
        "congress",
        "washington",
      ].map((source) =>
        (["docket", "rin", "cfr"] as const).filter((m) =>
          supportsMatch(source, m),
        ),
      ),
    ).toEqual([
      ["docket", "rin", "cfr"],
      REGULATIONS_V2_CONFIRMED ? ["docket"] : [],
      [],
      [],
      [],
    ]);
    const regulations = REGULATIONS_V2_CONFIRMED
      ? ["Rule", "Proposed Rule", "Notice", null]
      : [null, null, null, null];
    expect(
      (["RULE", "PRORULE", "NOTICE", "PRESDOCU"] as const).map((type) => [
        documentTypeFilter("federal-register", type),
        documentTypeFilter("regulations", type),
        documentTypeFilter("govinfo", type),
      ]),
    ).toEqual([
      ["RULE", regulations[0], null],
      ["PRORULE", regulations[1], null],
      ["NOTICE", regulations[2], null],
      ["PRESDOCU", regulations[3], null],
    ]);
  });

  it.runIf(!REGULATIONS_V2_CONFIRMED)(
    "holds Regulations.gov docket lookup and type filter until their live check is recorded",
    () => {
      for (const extra of [
        { match: "docket" },
        { documentType: "RULE" },
      ] as const)
        expect(() =>
          searchCriteria("regulations", "EPA-HQ-OAR-2021-0317", 1, {
            ...v2(),
            ...extra,
          }),
        ).toThrow(expect.objectContaining({ code: "unsupported_criteria" }));
      // Text search on Regulations.gov is unchanged.
      expect(searchCriteria("regulations", "water", 1, v2()).version).toBe(2);
    },
  );

  it("writes and reads CFR identifier queries, one part at a time", () => {
    expect(cfrQuery({ title: 50, part: "660" })).toBe("50 CFR 660");
    expect(parseCfrQuery("50 CFR 660")).toEqual({ title: 50, part: "660" });
    expect(parseCfrQuery("40 CFR 1-50")).toBeNull();
    for (const bad of [
      "0 CFR 1",
      "51 CFR 1",
      "05 CFR 1",
      "50 CFR 0",
      "50 CFR 01",
      "50 CFR 50-50",
      "50 CFR 123456",
      "50 cfr 660",
      "50 CFR 660 ",
      "50 CFR 660a",
    ])
      expect(parseCfrQuery(bad)).toBeNull();
  });

  it("refuses a v1 continuation for a v2 search and a changed v2 envelope", () => {
    const first = searchCriteria(
      "federal-register",
      "0648-BO46",
      1,
      v2({ match: "rin" }),
    );
    const next = nextSearchCursor(first);
    expect(
      searchCriteria(
        "federal-register",
        "0648-BO46",
        2,
        v2({ match: "rin", continuation: next }),
      ),
    ).toEqual(next);
    expect(
      sameSearchCriteria(
        next,
        nextSearchCursor(searchCriteria("federal-register", "0648-BO46", 1)),
      ),
    ).toBe(false);
    for (const patch of [
      { match: "text" },
      { documentType: "RULE" },
      { version: 1 },
      { sort: "relevance" },
      { extra: true },
    ])
      expect(() =>
        searchCriteria(
          "federal-register",
          "0648-BO46",
          2,
          v2({
            match: "rin",
            continuation: { ...next, ...patch } as typeof next,
          }),
        ),
      ).toThrow();
  });
});
