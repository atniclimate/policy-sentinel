// @vitest-environment node
// Grants.gov authority passage extractor, Assistance Listings and the parsed
// citation links (design section 3 T1.4; section 1 rules 1, 2 and 7).
import { describe, expect, it } from "vitest";
import {
  PASSAGE_MAX,
  assistanceListings,
  authorityLinks,
  authorityPassage,
  grantsDetailValue,
  listingNumbers,
} from "../../src/demo/grants-authority";
import type { DemoCitation } from "../../src/demo/types";

const row = (extra: Partial<DemoCitation> = {}): DemoCitation => ({
  sourceId: "grants",
  identifier: "SYN-OPP-2099-0001",
  title: "Synthetic opportunity",
  issuingBody: "Synthetic Agency for Examples",
  kind: "Funding opportunity",
  date: null,
  officialUrl: "https://www.grants.gov/search-results-detail/990001",
  textUrl: null,
  retrievedAt: "2099-02-03T00:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
  ...extra,
});

describe("the heading rule", () => {
  it("quotes the rest of the line at an AUTHORITIES heading", () => {
    const out = authorityPassage(
      "<p>About the program.</p><p><b>AUTHORITIES:</b> Awards are made through 25 U.S.C. 5304(l) and P. L. 117-58.</p><p>Next part.</p>",
    );
    expect(out).toEqual({
      state: "found",
      passage: {
        text: "Awards are made through 25 U.S.C. 5304(l) and P. L. 117-58.",
        heading: "AUTHORITIES",
        locator: 'Grants.gov synopsis description, heading "AUTHORITIES"',
      },
    });
  });

  it("takes the next line when the Authority heading stands alone", () => {
    const out = authorityPassage(
      "<h4>Authority</h4><p>42 U.S.C. &sect; 1234, as amended.</p>",
    );
    expect(out.state === "found" && out.passage).toMatchObject({
      text: "42 U.S.C. § 1234, as amended.",
      heading: "Authority",
    });
  });

  it.each([
    ["no heading at all", "<p>Funds are made through 25 U.S.C. 13.</p>"],
    [
      "the word mid-sentence",
      "<p>The agency has authority: 25 U.S.C. 13 is cited elsewhere.</p>",
    ],
    [
      "a heading word that opens a sentence",
      "<p>Authority to award rests with the office.</p>",
    ],
    ["lower case", "<p>authorities: 25 U.S.C. 13</p>"],
    ["a heading with nothing after it", "<p>AUTHORITIES:</p>"],
    ["no synopsis", undefined],
  ])("finds no passage for %s", (_, html) => {
    expect(authorityPassage(html)).toEqual({ state: "none" });
  });

  it("bounds a long passage and marks the cut", () => {
    const long = `Authority: ${"25 U.S.C. 13 and more words ".repeat(80)}`;
    const out = authorityPassage(`<p>${long}</p>`);
    if (out.state !== "found") throw new Error("expected a passage");
    expect(out.passage.text.length).toBeLessThanOrEqual(PASSAGE_MAX);
    expect(out.passage.text.endsWith(" [...]")).toBe(true);
  });
});

describe("the personal-pattern guard on passages", () => {
  it.each([
    ["an email", "Authority: 25 U.S.C. 13; questions to someone@example.org"],
    ["a phone number", "AUTHORITIES: 25 U.S.C. 13. Call (555) 010-0101."],
    [
      "a title before a name",
      "Authority: Dr. Alex Sample signs for 25 U.S.C. 13",
    ],
  ])("withholds a passage holding %s", (_, text) => {
    expect(authorityPassage(`<p>${text}</p>`)).toEqual({ state: "withheld" });
  });

  it("withholds a passage holding a contact name in capitals (R2-2)", () => {
    expect(
      authorityPassage(
        "<p>AUTHORITY: 25 U.S.C. 5301 et seq. PROGRAM CONTACT: JANE SAMPLEPERSON</p>",
      ),
    ).toEqual({ state: "withheld" });
  });

  it("cuts the passage after its last citation's sentence and marks the cut (R2-3)", () => {
    const out = authorityPassage(
      "<p>Authority: 25 U.S.C. 5301 et seq. Questions may be directed to Jane Sampleperson, Program Officer.</p>",
    );
    expect(out).toMatchObject({
      state: "found",
      passage: { text: "25 U.S.C. 5301 et seq. [...]" },
    });
    expect(JSON.stringify(out)).not.toContain("Sampleperson");
  });

  it("keeps the first sentence only when the passage has no citation (R2-3)", () => {
    const out = authorityPassage(
      "<p>Authority: The Example Act of 2099. Write to Jane Sampleperson, Program Officer.</p>",
    );
    expect(out).toMatchObject({
      state: "found",
      passage: { text: "The Example Act of 2099. [...]" },
    });
  });

  it("does not look past the passage: contact text elsewhere in the synopsis is not quoted", () => {
    const out = authorityPassage(
      "<p>AUTHORITIES: 25 U.S.C. 13.</p><p>Contact: Dr. Alex Sample, someone@example.org</p>",
    );
    expect(out).toMatchObject({
      state: "found",
      passage: { text: "25 U.S.C. 13." },
    });
  });

  it("the page drops a flagged passage that reaches it and states it as withheld", () => {
    const value = grantsDetailValue({
      ok: true,
      source: "grants",
      authority: "found",
      citation: row({
        authorityPassage: {
          text: "25 U.S.C. 13; write to someone@example.org",
          heading: "Authority",
          locator: 'Grants.gov synopsis description, heading "Authority"',
        },
      }),
    });
    expect(value.authority).toBe("withheld");
    expect(value.citation.authorityPassage).toBeUndefined();
  });

  it("the page refuses a state that does not match the passage", () => {
    expect(() =>
      grantsDetailValue({
        ok: true,
        source: "grants",
        authority: "found",
        citation: row(),
      }),
    ).toThrow();
    expect(() =>
      grantsDetailValue({
        ok: true,
        source: "grants",
        authority: "maybe",
        citation: row(),
      }),
    ).toThrow();
  });
});

describe("Assistance Listings (source_field)", () => {
  it("keeps number and title from fetchOpportunity cfdas and drops malformed items", () => {
    expect(
      assistanceListings([
        {
          id: 1,
          cfdaNumber: "99.001",
          programTitle: "Synthetic &amp; Example",
        },
        { cfdaNumber: "99.001", programTitle: "Duplicate" },
        { cfdaNumber: "not-a-listing", programTitle: "Dropped" },
        { cfdaNumber: "99.002", programTitle: "" },
        "99.003",
      ]),
    ).toEqual([{ number: "99.001", title: "Synthetic & Example" }]);
    expect(assistanceListings(undefined)).toEqual([]);
  });

  it("keeps numbers from a search2 cfdaList", () => {
    expect(listingNumbers(["99.001", "99.001", "x", 7, "99.A01"])).toEqual([
      "99.001",
      "99.A01",
    ]);
    expect(listingNumbers(null)).toEqual([]);
  });
});

describe("citations parsed from the passage", () => {
  const passage = {
    text: "Awards are made through Pub. L. 93–638, P. L. 117-58, 25 U.S.C. 5304(l), 25 U.S.C. 5301 et. seq., 25 U.S.C. 5304, and section 4 of the Act.",
    heading: "AUTHORITIES",
    locator: 'Grants.gov synopsis description, heading "AUTHORITIES"',
  };

  it("links each full U.S.C. and Pub. L. citation once, with its exact wording", () => {
    const links = authorityLinks(
      row({ authorityPassage: passage, versionDate: "2099-02-02" }),
    );
    expect(
      links.map((l) => [
        l.sourceWording,
        l.target.sourceId,
        l.target.identifier,
      ]),
    ).toEqual([
      ["Pub. L. 93–638", "govinfo", "PLAW-93publ638"],
      ["P. L. 117-58", "govinfo", "PLAW-117publ58"],
      ["25 U.S.C. 5304(l)", "usc-index", "/us/usc/t25/s5304"],
      ["25 U.S.C. 5301 et. seq.", "usc-index", "/us/usc/t25/s5301"],
    ]);
    for (const link of links) {
      expect(link).toMatchObject({
        basis: "source_text_parsed",
        direction: "forward",
        locator: passage.locator,
        sourceName: "Grants.gov",
        asOfText: "Grants.gov record version date 2099-02-02",
        family: "laws_and_bills",
      });
      expect(link.target.officialUrl).toMatch(
        /^https:\/\/(uscode\.house\.gov|www\.govinfo\.gov)\//,
      );
    }
    // The short form stays text and is never linked.
    expect(links.some((l) => /Act/.test(l.sourceWording ?? ""))).toBe(false);
  });

  it("produces no links without a passage", () => {
    expect(authorityLinks(row())).toEqual([]);
  });
});
