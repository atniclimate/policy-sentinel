// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  dateRangeValue,
  nextSearchCursor,
  searchCriteria,
  supportsDatedGovinfoQuery,
} from "../../src/demo/search-contract";

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
