// @vitest-environment node
/**
 * T1.1 contract widening (Full 0.9 Wave 1, step 1a): the FOLLOW_VERSION 2
 * migration, the version 3 search criteria branch, and the refusal of
 * version 3 citation fields on version 1 and 2 answers.
 */
import { describe, expect, it } from "vitest";
import {
  FOLLOW_VERSION,
  followItem,
  importFollows,
  restoreFollows,
  serializeFollows,
} from "../../src/demo/follow";
import { searchCriteria } from "../../src/demo/search-contract";
import type { DemoSearchOptions, LinkedRecord } from "../../src/demo/types";
import {
  citationFields,
  citationValue,
  searchValue,
} from "../../src/demo/validation";
import { citation, statedCitation } from "./frontend-fixtures";

const FOLLOWED = new Date("2099-01-08T12:00:00.000Z");
const DOCKET = "Docket No. 990101-0001";

describe("FOLLOW_VERSION 2 migration", () => {
  it("is version 2, and reads a version 1 list the same as version 2", () => {
    expect(FOLLOW_VERSION).toBe(2);
    const item = followItem(statedCitation(), "docket", DOCKET, FOLLOWED)!;
    const v1File = JSON.stringify({ version: 1, followed: [item] });
    const v2File = serializeFollows([item]);
    expect(JSON.parse(v2File).version).toBe(2);
    expect(restoreFollows(v1File)).toEqual(restoreFollows(v2File));
    expect(restoreFollows(v1File)).toEqual({ list: [item], restored: "ok" });
  });

  it("migrates losslessly: a version 1 list re-exports as version 2 with the same items and dates", () => {
    const item = followItem(statedCitation(), "docket", DOCKET, FOLLOWED)!;
    const checked = { ...item, lastChecked: "2099-01-15T00:00:00.000Z" };
    const v1File = JSON.stringify({ version: 1, followed: [checked] });
    const { list } = restoreFollows(v1File);
    expect(list).toEqual([checked]);
    expect(JSON.parse(serializeFollows(list))).toEqual({
      version: 2,
      followed: [checked],
    });
  });

  it("imports a version 1 export file the same way as a version 2 one", () => {
    const item = followItem(statedCitation(), "docket", DOCKET, FOLLOWED)!;
    const v1File = JSON.stringify({ version: 1, followed: [item] });
    const v2File = serializeFollows([item]);
    expect(importFollows([], v1File)).toEqual(importFollows([], v2File));
  });

  it("refuses an unknown version, same as the existing error behavior", () => {
    expect(
      restoreFollows(JSON.stringify({ version: 3, followed: [] })),
    ).toEqual({ list: [], restored: "failed" });
    expect(
      importFollows([], JSON.stringify({ version: 0, followed: [] })),
    ).toBeNull();
  });
});

describe("search criteria version 3", () => {
  const v3 = (extra: Partial<DemoSearchOptions> = {}): DemoSearchOptions => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 3,
    ...extra,
  });

  it("builds a v3 criteria identical to v2 but for its version, for a kind both support", () => {
    const v2c = searchCriteria("federal-register", "Docket No. 1", 1, {
      ...v3({ version: 2 }),
      match: "docket",
    });
    const v3c = searchCriteria("federal-register", "Docket No. 1", 1, {
      ...v3(),
      match: "docket",
    });
    expect(v3c).toEqual({ ...v2c, version: 3 });
  });

  it("recognizes the new router identifier readings as a valid contract, not yet supported by any source", () => {
    expect(() =>
      searchCriteria("federal-register", "42 U.S.C. 1996", 1, {
        ...v3(),
        match: "usc",
      }),
    ).toThrow(expect.objectContaining({ code: "unsupported_criteria" }));
  });

  it("keeps the new match kinds out of version 1 and 2 (byte-identical to today)", () => {
    expect(() =>
      searchCriteria("federal-register", "water", 1, {
        ...v3({ version: 2 }),
        match: "usc",
      }),
    ).toThrow(expect.objectContaining({ code: "bad_query" }));
  });

  it("still rejects an unsupported version", () => {
    expect(() =>
      searchCriteria("federal-register", "water", 1, v3({ version: 4 as 3 })),
    ).toThrow(expect.objectContaining({ code: "bad_query" }));
  });
});

describe("govinfo-courts search criteria (version 3 only)", () => {
  const v3 = (match: DemoSearchOptions["match"]): DemoSearchOptions => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 3,
    match,
  });

  it("accepts words, a docket with its court code and a U.S. Reports citation", () => {
    expect(
      searchCriteria("govinfo-courts", "water rights", 1, v3("text")),
    ).toMatchObject({
      version: 3,
      source: "govinfo-courts",
      match: "text",
      sort: "provider-default",
      resultLevel: "default",
      historical: false,
      cursor: null,
    });
    expect(
      searchCriteria("govinfo-courts", "ca9 99-12345", 1, v3("court_docket"))
        .query,
    ).toBe("ca9 99-12345");
    expect(
      searchCriteria("govinfo-courts", "199 U.S. 42", 1, v3("us_reports")),
    ).toMatchObject({ match: "us_reports" });
  });

  it("passes a U.S. Reports volume above 586, so the Worker answers not_resolvable", () => {
    expect(
      searchCriteria("govinfo-courts", "600 U.S. 1", 1, v3("us_reports")).query,
    ).toBe("600 U.S. 1");
  });

  it("refuses a docket with no court code and a malformed citation", () => {
    for (const [q, match] of [
      ["99-12345", "court_docket"],
      ["U.S. Reports", "us_reports"],
    ] as const)
      expect(() => searchCriteria("govinfo-courts", q, 1, v3(match))).toThrow(
        expect.objectContaining({ code: "bad_query" }),
      );
  });

  it("refuses other match kinds, versions 1 and 2, and a second page", () => {
    expect(() =>
      searchCriteria("govinfo-courts", "Docket No. 1", 1, v3("docket")),
    ).toThrow(expect.objectContaining({ code: "unsupported_criteria" }));
    expect(() =>
      searchCriteria("govinfo-courts", "water", 1, {
        ...v3("text"),
        version: 2,
      }),
    ).toThrow(expect.objectContaining({ code: "unsupported_criteria" }));
    expect(() => searchCriteria("govinfo-courts", "water", 1)).toThrow(
      expect.objectContaining({ code: "unsupported_criteria" }),
    );
    expect(() =>
      searchCriteria("govinfo-courts", "water", 2, v3("text")),
    ).toThrow(expect.objectContaining({ code: "bad_query" }));
  });

  it("keeps the court readings away from every other source", () => {
    for (const source of ["federal-register", "govinfo", "congress"])
      expect(() =>
        searchCriteria(source, "ca9 99-12345", 1, v3("court_docket")),
      ).toThrow(expect.objectContaining({ code: "unsupported_criteria" }));
  });
});

describe("a court lookup answer's continuation", () => {
  const options = (match: "text" | "court_docket" | "us_reports") => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 3 as const,
    match,
    documentType: null,
  });
  const answer = (query: string, match: string, reason: string) => ({
    ok: true,
    source: "govinfo-courts",
    query,
    total: 0,
    page: 1,
    results: [],
    retrievedAt: "2099-01-07T11:59:00.000Z",
    criteria: searchCriteria(
      "govinfo-courts",
      query,
      1,
      options(match as "text" | "court_docket" | "us_reports"),
    ),
    continuation: { kind: "stopped", reason },
  });

  it("accepts not_applicable for a docket or U.S. Reports lookup, as the Worker answers", () => {
    // The live Worker answered a docket lookup this way, and the page refused it as an outage.
    for (const [query, match] of [
      ["ca9 97-70217", "court_docket"],
      ["586 U.S. 347", "us_reports"],
    ] as const)
      expect(
        searchValue(
          answer(query, match, "not_applicable"),
          "govinfo-courts",
          query,
          1,
          options(match),
        ).continuation,
      ).toEqual({ kind: "stopped", reason: "not_applicable" });
  });

  it("still refuses not_applicable for a court text search, which pages", () => {
    expect(() =>
      searchValue(
        answer("tribe", "text", "not_applicable"),
        "govinfo-courts",
        "tribe",
        1,
        options("text"),
      ),
    ).toThrow("Invalid search continuation");
  });
});

describe("search contract v3 citation fields", () => {
  it("accepts the v3 fields only on a version 3 answer", () => {
    const v3Citation = citationValue(
      {
        ...citation(),
        court: "ca9",
        docketNumber: "1:20-cv-00001",
        caseCitationProvided: false,
      },
      3,
    );
    expect(v3Citation.court).toBe("ca9");
    expect(v3Citation.docketNumber).toBe("1:20-cv-00001");
    expect(v3Citation.caseCitationProvided).toBe(false);
  });

  it("rejects v3-only fields on version 1 and 2 answers", () => {
    expect(() => citationValue({ ...citation(), court: "ca9" }, 1)).toThrow();
    expect(() => citationValue({ ...citation(), court: "ca9" }, 2)).toThrow();
    expect(() => citationFields({ court: "ca9" }, 1)).toThrow();
    expect(() => citationFields({ court: "ca9" }, 2)).toThrow();
    expect(citationFields({ court: "ca9" }, 3)).toEqual({ court: "ca9" });
  });

  it("drops a malformed or oversized v3 field instead of throwing", () => {
    const long = "x".repeat(5000);
    expect(
      citationFields(
        {
          assistanceListings: [
            { number: "93.933", title: "Example Listing" },
            { number: "", title: long },
          ],
          authorityPassage: { text: long, heading: "Authority:", locator: "s" },
        },
        3,
      ),
    ).toEqual({
      assistanceListings: [{ number: "93.933", title: "Example Listing" }],
    });
  });
});

describe("the link chain shape (T1.1 rules 1-3)", () => {
  it("accepts one link with a closed basis, a label key and no legal-conclusion field", () => {
    const link: LinkedRecord = {
      basis: "citation_in_text",
      labelId: "citation-found-at",
      direction: "forward",
      target: {
        sourceId: "federal-register",
        identifier: "FR Doc. 2099-00001",
      },
      sourceWording: "42 U.S.C. 1996",
      locator: "p. 12",
      sourceName: "Federal Register",
      asOfText: "as of Jan. 7, 2099",
      retrievedAt: "2099-01-07T11:59:00.000Z",
      family: "rules_and_notices",
    };
    expect(link.basis).toBe("citation_in_text");
    expect(Object.keys(link)).not.toContain("nation");
  });
});
