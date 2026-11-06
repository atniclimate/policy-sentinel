// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadProbeNames } from "../../scripts/demo-index/common.mjs";
import { buildUslmShard } from "../../scripts/demo-index/uslm.mjs";
import { chain } from "../../src/demo/copy/chain";
import type {
  IndexFile,
  UscSourceCreditShard,
} from "../../src/demo/index-types";
import {
  cfrPartLinks,
  citationsInText,
  groupInText,
  labelNamesTarget,
  recordLinks,
  relatedRows,
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
      // R3-2: the rows quote the annual edition, so the live link is that edition at GovInfo.
      liveUrl: "https://www.govinfo.gov/bulkdata/CFR/2099/title-99",
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
      {
        kind: "note",
        section: "stated",
        label: "No 'Source:' line in this part",
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

  it("quotes the codification note and links each target under a neutral label", () => {
    const rows = uscSectionLinks(uscShard, "/us/usc/t99/s450", uscFile, NOW);
    expect(rows?.slice(0, 2).map((r) => r.label)).toEqual([
      "Status stated by the U.S. Code: transferred",
      "No source credit in this section",
    ]);
    const [row] = links(rows);
    expect(row).toMatchObject({
      label: "Named in the OLRC codification note of this section",
      targetText: "99 U.S.C. 5321",
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

describe("boundary B regressions", () => {
  const retainedFile = (file: IndexFile): IndexFile => ({
    ...file,
    status: "retained_after_failed_refresh",
    lastRefreshAttemptAt: "2099-02-28T10:00:00Z",
    failureStage: "fetch",
    message: "Source refresh failed.",
  });

  it("R3-1: never says OLRC reclassified a section its codification note only names", () => {
    const { shard } = buildUslmShard(
      readFileSync("tests/demo/fixtures/demo-index/usc25-trimmed.xml", "utf8"),
      { title: 25, releasePoint: "119-136", names: loadProbeNames().names },
    );
    for (const id of ["/us/usc/t25/s421", "/us/usc/t25/s458bbb"]) {
      const rows = uscSectionLinks(shard, id, uscFile, NOW) ?? [];
      expect(rows.filter((r) => /reclassif/i.test(r.label))).toEqual([]);
      // The status attribute is shown as the fact the U.S. Code states.
      expect(rows[0].label).toBe("Status stated by the U.S. Code: transferred");
    }
    const named = links(
      uscSectionLinks(shard, "/us/usc/t25/s458bbb", uscFile, NOW),
    ).filter((r) => r.labelId === "usc_reclassified");
    expect(named.map((r) => [r.label, r.targetText])).toEqual([
      [
        "Named in the OLRC codification note of this section",
        "25 U.S.C. 458ddd",
      ],
      ["Named in the OLRC codification note of this section", "25 U.S.C. 5421"],
    ]);
    // The note itself speaks, quoted verbatim.
    expect(named[0].quote).toMatchObject({
      heading: "Codification note",
      field: "noteText",
      text: expect.stringContaining("458ddd"),
    });
  });

  it("R3-2: no annual-edition row sends the reader to eCFR under the edition's name", () => {
    for (const part of ["100", "200", "300"])
      for (const row of cfrPartLinks(cfrShard, part, cfrFile, NOW) ?? []) {
        expect(row.sourceName).toBe("CFR annual edition (GovInfo)");
        expect(row.asOfText).toBe("Revised as of April 1, 2099");
        expect(row.liveUrl).toBe(
          "https://www.govinfo.gov/bulkdata/CFR/2099/title-99",
        );
      }
  });

  it("R3-3: rows from a file kept after a failed refresh say so, though it is under six months old", () => {
    const rows = [
      ...(cfrPartLinks(cfrShard, "100", retainedFile(cfrFile), NOW) ?? []),
      ...(uscSectionLinks(
        uscShard,
        "/us/usc/t99/s450",
        retainedFile(uscFile),
        NOW,
      ) ?? []),
    ];
    expect(rows.length).toBeGreaterThan(4);
    expect(rows.every((r) => r.notice?.endsWith(chain.retained))).toBe(true);
    // A row's own notice stays, with the retained sentence after it.
    expect(rows.map((r) => r.notice)).toContain(
      `Not available from a live source. ${chain.retained}`,
    );
    // Not the six-month sentence, and the original as-of is kept.
    expect(rows.some((r) => r.stale)).toBe(false);
    expect(rows[0].asOfText).toBe("Revised as of April 1, 2099");
    // A current file's rows carry no such sentence.
    expect(
      (cfrPartLinks(cfrShard, "100", cfrFile, NOW) ?? []).some((r) =>
        r.notice?.includes(chain.retained),
      ),
    ).toBe(false);
  });

  it("R3-8: a section stub with no source credit states its status and the missing credit", () => {
    const stub: UscSourceCreditShard = {
      ...uscShard,
      entries: [
        {
          identifier: "/us/usc/t99/s7",
          status: "repealed",
          creditText: null,
          credits: [],
          reclassifiedAs: null,
        },
      ],
    };
    expect(
      uscSectionLinks(stub, "/us/usc/t99/s7", uscFile, NOW)?.map(
        (r) => r.label,
      ),
    ).toEqual([
      "Status stated by the U.S. Code: repealed",
      "No source credit in this section",
      "Cases that cite this section",
    ]);
  });
});

describe("related bills a guard withheld", () => {
  it("says the title is not shown instead of printing null", () => {
    const rows = relatedRows(
      {
        ok: true,
        source: "congress",
        basis: "source_field",
        bill: "hr 4004 199",
        records: [
          {
            relation: "Related bill",
            identifiedBy: "CRS",
            identifier: "HR 4005, 199th Congress",
            title: null,
            officialUrl:
              "https://www.congress.gov/bill/199th-congress/house-bill/4005",
          },
        ],
        total: 1,
        retrievedAt: "2099-01-07T11:59:00.000Z",
      },
      frRecord,
    );
    const texts = rows.map((r) => (r.kind === "link" ? r.targetText : ""));
    expect(texts.join(" ")).not.toMatch(/null/);
    expect(texts).toContain(`HR 4005, 199th Congress: ${chain.titleWithheld}`);
  });
});

describe("relation names a source returns (decision 12)", () => {
  const RETRIEVED = "2099-01-07T11:59:00.000Z";
  const bill = (relation: string) => ({
    relation,
    identifiedBy: "CRS",
    identifier: "HR 4005, 199th Congress",
    title: "Example Watershed Act",
    officialUrl: "https://www.congress.gov/bill/199th-congress/house-bill/4005",
  });
  const labels = (rows: ChainRow[]) =>
    rows.map((r) => [r.label, r.labelVerbatim ?? false]);

  it("shows a GovInfo name on the list verbatim and withholds any other, keeping the row", () => {
    const rows = relatedRows(
      {
        ok: true,
        source: "govinfo",
        basis: "source_field",
        accessId: "BILLS-199hr1001ih",
        relations: [
          { relation: "Bill Versions", collection: "BILLS" },
          { relation: "Implements Example Rule", collection: "FR" },
        ],
        retrievedAt: RETRIEVED,
      },
      frRecord,
    );
    expect(labels(rows)).toEqual([
      ["Bill Versions", true],
      [chain.relationWithheld, false],
    ]);
  });

  it("does the same for Congress.gov relationship types, and the withheld row still links", () => {
    const rows = relatedRows(
      {
        ok: true,
        source: "congress",
        basis: "source_field",
        bill: "hr 4004 199",
        records: [bill("Identical bill"), bill("Authorized by Example Act")],
        total: 2,
        retrievedAt: RETRIEVED,
      },
      frRecord,
    );
    expect(labels(rows)).toEqual([
      ["Identical bill", true],
      [chain.relationWithheld, false],
    ]);
    expect(links(rows).map((r) => r.target.identifier)).toEqual([
      "HR 4005, 199th Congress",
      "HR 4005, 199th Congress",
    ]);
    expect(JSON.stringify(rows)).not.toContain("Authorized by");
  });
});

describe("a note citation in the text", () => {
  it("keeps the word note in the row it links", () => {
    const rows = citationsInText(
      [{ text: "See 25 U.S.C. 2801 note.", locator: "Section 9" }],
      frRecord,
    );
    const link = rows.find((r) => r.kind === "link");
    expect(link && link.kind === "link" ? link.targetText : "").toBe(
      "25 U.S.C. 2801 note",
    );
  });
});

describe("a U.S.C. subsection in the text", () => {
  it("hops to the section the index holds and keeps the wording", () => {
    const rows = links(
      citationsInText(
        [{ text: "See 25 U.S.C. 5304(l).", locator: "Section 9" }],
        frRecord,
      ),
    );
    expect(rows.map((r) => [r.targetText, r.target.identifier])).toEqual([
      ["25 U.S.C. 5304(l)", "/us/usc/t25/s5304"],
    ]);
    expect(rows[0].target.officialUrl).toContain("title25-section5304&");
  });
});
