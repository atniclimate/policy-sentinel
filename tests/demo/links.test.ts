import { describe, expect, it } from "vitest";
import {
  cfrPartLinks,
  citationsInText,
  groupInText,
  labelNamesTarget,
  recordLinks,
  uscSectionLinks,
} from "../../src/demo/links";
import type { ChainLink, ChainRow } from "../../src/demo/links";
import {
  blocks,
  cfrFile,
  cfrShard,
  frRecord,
  frRecordNoAuth,
  NOW,
  SOURCES,
  staleCfrFile,
  uscFile,
  uscShard,
} from "./fixtures/chain";

const links = (rows: readonly ChainRow[] | null) =>
  (rows ?? []).filter((r): r is ChainLink => r.kind === "link");
const brief = (r: ChainRow) => ({
  kind: r.kind,
  section: r.section,
  label: r.label,
  ...(r.kind === "link" && {
    basis: r.basis,
    direction: r.direction,
    target: r.target,
    targetText: r.targetText,
  }),
  sourceWording: r.sourceWording,
  notice: r.notice,
});

describe("groupInText: one row per distinct citation found in the text", () => {
  const repeated = [
    { text: "Revises 25 CFR part 900 in full.", locator: "paragraph 1" },
    { text: "Also 50 CFR 660.11 and id.", locator: "paragraph 2" },
    { text: "Under review: 25 CFR part 900 again.", locator: "paragraph 3" },
    { text: "See id. once more, and 25 CFR part 900.", locator: "paragraph 4" },
  ];
  const rows = citationsInText(repeated, frRecord);

  it("keeps the first row of each target in source order and counts the places", () => {
    const grouped = groupInText(rows);
    const shown = grouped.map((r) =>
      r.kind === "link"
        ? [r.targetText, r.locator, r.places]
        : [r.sourceWording, r.places],
    );
    expect(shown).toEqual([
      ["25 CFR part 900", "paragraph 1", 3],
      ["50 CFR 660.11", "paragraph 2", undefined],
      ["id.", 2],
    ]);
  });

  it("leaves the stated and identifier sections untouched", () => {
    const stated = recordLinks(frRecord, SOURCES);
    expect(groupInText(stated)).toEqual(stated);
  });
});

describe("labelNamesTarget: a label that already prints its target", () => {
  it("is true for shared identifiers and false for a row whose target follows its label", () => {
    const rows = links(recordLinks(frRecord, SOURCES));
    const docket = rows.find((r) => r.label.startsWith("Shares docket"))!;
    const cfr = rows.find((r) => r.label === "CFR parts this document names")!;
    expect(labelNamesTarget(docket)).toBe(true);
    expect(labelNamesTarget(cfr)).toBe(false);
  });
});

describe("recordLinks: the opened record's own fields", () => {
  it("lists CFR parts, shared identifiers, corrections and the authority line", () => {
    const rows = recordLinks(frRecord, SOURCES);
    expect(rows.map(brief)).toEqual([
      {
        kind: "link",
        section: "stated",
        label: "CFR parts this document names",
        basis: "source_field",
        direction: "forward",
        target: {
          sourceId: "cfr-index",
          identifier: "99 CFR part 100",
          officialUrl: "https://www.ecfr.gov/current/title-99/part-100",
        },
        targetText: "99 CFR part 100",
        sourceWording: null,
        notice: null,
      },
      {
        kind: "link",
        section: "identifiers",
        label: "Shares docket EX-2099-0001",
        basis: "identifier_match",
        direction: "forward",
        target: { sourceId: "federal-register", identifier: "EX-2099-0001" },
        targetText: "EX-2099-0001",
        sourceWording: null,
        notice: null,
      },
      {
        kind: "link",
        section: "identifiers",
        label: "Shares RIN 9999-AA00",
        basis: "identifier_match",
        direction: "forward",
        target: { sourceId: "federal-register", identifier: "9999-AA00" },
        targetText: "9999-AA00",
        sourceWording: null,
        notice: null,
      },
      {
        kind: "link",
        section: "stated",
        label:
          "The Federal Register lists this document as a correction of FR Doc. 2098-11111",
        basis: "source_field",
        direction: "forward",
        target: {
          sourceId: "federal-register",
          identifier: "2098-11111",
          officialUrl: "https://www.federalregister.gov/d/2098-11111",
        },
        targetText: "FR Doc. 2098-11111",
        sourceWording: null,
        notice: null,
      },
      {
        kind: "link",
        section: "stated",
        label:
          "The Federal Register lists FR Doc. 2099-22222 as a correction of this document",
        basis: "source_field",
        direction: "reverse",
        target: {
          sourceId: "federal-register",
          identifier: "2099-22222",
          officialUrl: "https://www.federalregister.gov/d/2099-22222",
        },
        targetText: "FR Doc. 2099-22222",
        sourceWording: null,
        notice: null,
      },
      {
        kind: "link",
        section: "stated",
        label: "Named in the 'Authority:' line of this document",
        basis: "source_text_parsed",
        direction: "forward",
        target: {
          sourceId: "usc-index",
          identifier: "/us/usc/t99/s1001",
          officialUrl:
            "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title99-section1001&num=0&edition=prelim",
        },
        targetText: "99 U.S.C. 1001",
        sourceWording: "99 U.S.C. 1001",
        notice: null,
      },
      {
        kind: "note",
        section: "stated",
        label: "Named in the 'Authority:' line of this document",
        sourceWording: "section 4 of the Act",
        notice: "short form, not resolved",
      },
    ]);
    // The authority line is quoted verbatim on its rows.
    expect(rows.at(-1)?.quote).toEqual({
      heading: "Authority:",
      text: frRecord.authorityLine,
      field: "authorityText",
    });
  });

  it("says there is no authority line, never that there is no authority", () => {
    const rows = recordLinks(frRecordNoAuth, SOURCES);
    expect(rows.at(-1)).toMatchObject({
      kind: "note",
      label: "No authority line in this document",
    });
  });

  it("carries the C1 facts on every row: source, as-of wording, retrieval and live link", () => {
    for (const row of recordLinks(frRecord, SOURCES)) {
      expect(row).toMatchObject({
        sourceName: "Federal Register",
        asOfLabel: "published",
        asOfText: "2099-01-05",
        retrievedAt: frRecord.retrievedAt,
        liveUrl: frRecord.officialUrl,
        stale: false,
      });
    }
  });
});

describe("cfrPartLinks: the CFR annual edition shard", () => {
  it("hops from each parsed authority citation and marks a pre-1994 FR citation", () => {
    const rows = cfrPartLinks(cfrShard, "100", cfrFile, NOW);
    expect(links(rows).map((r) => [r.label, r.targetText, r.notice])).toEqual([
      [
        "Named in the part-level 'Authority:' line of 99 CFR part 100",
        "99 U.S.C. 1001 et seq.",
        null,
      ],
      [
        "Named in the part-level 'Authority:' line of 99 CFR part 100",
        "Pub. L. 120-5",
        null,
      ],
      [
        "Named in the 'Source:' line of 99 CFR part 100",
        "50 FR 1000",
        "Not available from a live source",
      ],
      ["Named in the 'Source:' line of 99 CFR part 100", "70 FR 2000", null],
    ]);
    const [usc, , oldFr] = links(rows);
    expect(usc.target.sourceId).toBe("usc-index");
    expect(usc.target.identifier).toBe("/us/usc/t99/s1001");
    expect(oldFr.target.officialUrl).toBeUndefined();
    expect(usc).toMatchObject({
      sourceName: "CFR annual edition (GovInfo)",
      asOfLabel: "asOf",
      asOfText: "Revised as of April 1, 2099",
      asOfField: "revisedAsOfText",
      retrievedAt: "2099-02-01T10:00:00-08:00",
      liveUrl: "https://www.ecfr.gov/current/title-99/part-100",
      stale: false,
      quote: {
        heading: "Authority:",
        text: cfrShard.entries[0].authorityText,
        field: "authorityText",
      },
    });
  });

  it("states a missing part-level line, keeps citations when wording is omitted, and returns null for an unknown part", () => {
    expect(cfrPartLinks(cfrShard, "200", cfrFile, NOW)?.map(brief)).toEqual([
      {
        kind: "note",
        section: "stated",
        label: "No part-level 'Authority:' line in this part",
        sourceWording: null,
        notice: null,
      },
    ]);
    const omitted = cfrPartLinks(cfrShard, "300", cfrFile, NOW);
    expect(links(omitted).map((r) => [r.targetText, r.quote?.text])).toEqual([
      ["99 U.S.C. 2002", null],
    ]);
    expect(cfrPartLinks(cfrShard, "999", cfrFile, NOW)).toBeNull();
  });

  it("marks hops from a file retrieved more than 180 days ago (C3)", () => {
    const rows = cfrPartLinks(cfrShard, "100", staleCfrFile, NOW) ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.stale)).toBe(true);
  });
});

describe("uscSectionLinks: the OLRC source-credit shard", () => {
  it("links each source credit and states cases citing a law are not available", () => {
    const rows = uscSectionLinks(uscShard, "/us/usc/t99/s1001", uscFile, NOW);
    expect(rows?.map(brief)).toEqual([
      expect.objectContaining({
        basis: "source_field",
        label: "Source credit stated by the U.S. Code",
        targetText: "Pub. L. 120-5",
      }),
      expect.objectContaining({
        basis: "source_field",
        label: "Source credit stated by the U.S. Code",
        targetText: "99 Stat. 10",
      }),
      {
        kind: "note",
        section: "stated",
        label: "Cases that cite this section",
        sourceWording: null,
        notice: "Not available from an official source",
      },
    ]);
    expect(rows?.[0]).toMatchObject({
      asOfLabel: "releasePoint",
      asOfText: "Current through 120-1",
      asOfField: "currentThroughText",
      quote: { heading: "Source credit", field: "creditText" },
      target: {
        officialUrl: "https://www.govinfo.gov/link/plaw/120/public/5",
      },
    });
  });

  it("quotes the codification note and links each target with OLRC's own verb", () => {
    const [row] = links(
      uscSectionLinks(uscShard, "/us/usc/t99/s450", uscFile, NOW),
    );
    expect(row).toMatchObject({
      label:
        "OLRC notes this section was editorially reclassified as 99 U.S.C. 5321",
      target: { sourceId: "usc-index", identifier: "/us/usc/t99/s5321" },
      quote: {
        field: "noteText",
        text: uscShard.entries[1].reclassifiedAs?.noteText,
      },
    });
    expect(
      uscSectionLinks(uscShard, "/us/usc/t99/s1", uscFile, NOW),
    ).toBeNull();
  });
});

describe("citationsInText", () => {
  it("links each full citation at its block's locator and leaves short forms unresolved", () => {
    const rows = citationsInText(blocks, frRecord);
    expect(rows.map(brief)).toEqual([
      expect.objectContaining({
        section: "inText",
        basis: "citation_in_text",
        label: "Citation found at page 12",
        targetText: "99 CFR 100.5",
        sourceWording: "99 CFR 100.5",
      }),
      expect.objectContaining({
        label: "Citation found at page 12",
        targetText: "Pub. L. 120-5",
      }),
      {
        kind: "note",
        section: "inText",
        label: "Citation found at page 12",
        sourceWording: "id.",
        notice: "short form, not resolved",
      },
      expect.objectContaining({
        label: "Citation found at section 2",
        targetText: "RCW 99.10.020",
      }),
    ]);
    expect(links(rows).every((r) => r.direction === "forward")).toBe(true);
    expect(links(rows)[0].locator).toBe("page 12");
  });
});
