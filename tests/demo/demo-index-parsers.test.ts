// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns";
import { buildCfrShard } from "../../scripts/demo-index/cfr.mjs";
import {
  loadProbeNames,
  shardBytes,
} from "../../scripts/demo-index/common.mjs";
import { buildUslmShard } from "../../scripts/demo-index/uslm.mjs";
import { schemaErrors } from "../../scripts/demo-index/validate.mjs";
import { mapFrAgencies, mapFrTopics } from "../../scripts/demo-index/vocab.mjs";
import { listZipEntries, readZipEntry } from "../../scripts/demo-index/zip.mjs";
import { nationNameBases } from "../support/nation-name-probes";
import { makeZip } from "./fixtures/demo-index/build-index";

const CFR_XML = readFileSync(
  "tests/demo/fixtures/demo-index/cfr-title25-trimmed.xml",
  "utf8",
);
const USLM_XML = readFileSync(
  "tests/demo/fixtures/demo-index/usc25-trimmed.xml",
  "utf8",
);
const { names } = loadProbeNames();
const v = PATTERN_SET_VERSION;
const cfr = (xml = CFR_XML) =>
  buildCfrShard([{ volume: 1, xml }], {
    title: 25,
    editionYear: 2025,
    volumes: null,
    names,
  });
const uslm = (xml = USLM_XML, releasePoint = "119-136") =>
  buildUslmShard(xml, { title: 25, releasePoint, names });
const shortestName = () =>
  nationNameBases().reduce((a, b) => (b.length < a.length ? b : a));

describe("fixtures", () => {
  it("hold no Nation name from the probe set (H6)", () => {
    for (const text of [CFR_XML, USLM_XML].map((t) => t.toLowerCase()))
      for (const base of nationNameBases())
        expect(text).not.toContain(base.toLowerCase());
  });
});

describe("CFR annual edition parser", () => {
  it("reads part-level lines, the revision wording and the count identity", () => {
    const { shard, report } = cfr();
    expect(schemaErrors("cfr-authority-shard", shard)).toEqual([]);
    expect(shard).toMatchObject({
      title: 25,
      editionYear: 2025,
      revisedAsOfText: "Revised as of April 1, 2025",
      volumes: null,
      partsExpected: 5,
      partsReserved: 2,
      subpartAuthorityCount: 1,
    });
    expect(shard.entries.map((e) => e.part)).toEqual(["2", "32", "900"]);
    expect(report.omitted).toEqual([]);
    expect(shardBytes(shard).toString()).not.toMatch(/SYNTHETIC|Synthetic/);
  });

  it("parses the 25 CFR 900 authority line with et seq. kept, never expanded", () => {
    const part = cfr().shard.entries.find((e) => e.part === "900")!;
    expect(part.authorityText).toBe("25 U.S.C. 450f et seq.");
    expect(part.authorityCitations).toEqual([
      {
        kind: "usc",
        text: "25 U.S.C. 450f et seq.",
        basis: "source_text_parsed",
        pattern: { id: "usc-section", version: v },
        title: 25,
        section: "450f",
        etSeq: true,
      },
    ]);
    expect(part.sourceCitations).toEqual([
      {
        kind: "fr",
        text: "61 FR 32501",
        basis: "source_text_parsed",
        pattern: { id: "fr-page", version: v },
        volume: 61,
        page: 32501,
        dateText: "June 24, 1996",
      },
    ]);
  });

  it("keeps the source order of statute, public law and code citations and a pre-1994 source line", () => {
    const part = cfr().shard.entries.find((e) => e.part === "32")!;
    expect(part.authorityCitations.map((c) => `${c.kind}:${c.text}`)).toEqual([
      "stat:92 Stat. 2143",
      "pl:Pub. L. 95-561",
      "usc:25 U.S.C. 2010",
      "usc:2013",
    ]);
    expect(
      part.sourceCitations.map((c) => [c.volume, c.page, c.dateText]),
    ).toEqual([
      [44, 58098, "Oct. 9, 1979"],
      [47, 13327, "Mar. 30, 1982"],
    ]);
  });

  it("writes no shard when a listed part is missing (D1)", () => {
    const missing = CFR_XML.replace(
      "<EAR>Pt. 2</EAR>",
      "<RESERVED>PART 2 [RESERVED]</RESERVED>",
    );
    expect(() => cfr(missing)).toThrow(/count identity fails/);
    const extra = CFR_XML.replace(
      "<PT>2</PT>",
      "<PT>2</PT><SUBJECT>x</SUBJECT><PT>3</PT>",
    );
    expect(() => cfr(extra)).toThrow(/count identity fails/);
  });

  it("omits official wording with a Nation-name probe hit and keeps its citations (G3)", () => {
    const hit = CFR_XML.replace(
      "<P>43 U.S.C. 1457; 25 U.S.C. 9; 5 U.S.C. 301.</P>",
      `<P>43 U.S.C. 1457; 25 U.S.C. 9; ${shortestName()} 5 U.S.C. 301.</P>`,
    );
    const { shard, report } = cfr(hit);
    const part = shard.entries.find((e) => e.part === "2")!;
    expect(part.authorityText).toBeNull();
    expect(part.omitted).toEqual(["authorityText"]);
    expect(part.authorityCitations.length).toBeGreaterThan(0);
    expect(report.omitted).toEqual([
      { part: "2", field: "authorityText", reason: "nation_name_probe" },
    ]);
  });

  it("refuses a volume that is not CFR XML or names another edition year", () => {
    expect(() =>
      cfr("<html><body>Govinfo Bulkdata Service Error</body></html>"),
    ).toThrow();
    expect(() =>
      buildCfrShard([{ volume: 1, xml: CFR_XML }], {
        title: 25,
        editionYear: 2026,
        volumes: null,
        names,
      }),
    ).toThrow(/edition year/);
  });
});

describe("USLM source-credit parser", () => {
  it("reads the release point wording and sections in code-unit order, skipping quoted sections", () => {
    const { shard } = uslm();
    expect(schemaErrors("usc-source-credit-shard", shard)).toEqual([]);
    expect(shard).toMatchObject({
      title: 25,
      chapters: null,
      releasePoint: "119-136",
      publicationName: "Online@119-136",
      currentThroughText: "Current through 119-136",
    });
    expect(
      shard.entries.map((e) => e.identifier.slice("/us/usc/t25/".length)),
    ).toEqual(["s13–1", "s421", "s43", "s442", "s450f", "s458bbb", "s5304"]);
  });

  it("carries sourceCredit refs as source_field credits with the public law date", () => {
    const s5304 = uslm().shard.entries.find((e) =>
      e.identifier.endsWith("/s5304"),
    )!;
    expect(s5304.status).toBeNull();
    expect(s5304.reclassifiedAs).toBeNull();
    expect(s5304.creditText).toMatch(
      /^\(Pub\. L\. 93–638, § 4, Jan\. 4, 1975, 88 Stat\. 2204; /,
    );
    expect(s5304.credits[0]).toEqual({
      kind: "pl",
      text: "Pub. L. 93–638, § 4",
      basis: "source_field",
      pattern: { id: "uslm-pl-href", version: v },
      congress: 93,
      number: 638,
      section: "4",
      date: "1975-01-04",
    });
    expect(s5304.credits.filter((c) => c.kind === "stat")).toHaveLength(7);
    const s43 = uslm().shard.entries.find((e) =>
      e.identifier.endsWith("/s43"),
    )!;
    expect(s43.credits).toEqual([
      {
        kind: "act",
        text: "Apr. 4, 1910, ch. 140, § 2",
        basis: "source_field",
        pattern: { id: "uslm-act-href", version: v },
        href: "/us/act/1910-04-04/ch140/s2",
      },
      {
        kind: "stat",
        text: "36 Stat. 272",
        basis: "source_field",
        pattern: { id: "uslm-stat-href", version: v },
        volume: 36,
        page: 272,
        pageEnd: null,
      },
    ]);
  });

  it("counts refs the href table does not parse (F3)", () => {
    // Every fixture ref is in the table, title and subdivision segments included.
    expect(uslm().shard.unmappedRefCount).toBe(0);
    // A division segment is outside the table: counted, and no credit is guessed.
    const xml = USLM_XML.replace(
      '<ref href="/us/pl/101/301/s2/a/1">',
      '<ref href="/us/pl/101/301/dA/s2">',
    );
    expect(xml).not.toBe(USLM_XML);
    const { shard, report } = uslm(xml);
    expect(shard.unmappedRefCount).toBe(1);
    expect(report.unmappedRefCount).toBe(1);
    const s5304 = shard.entries.find((e) => e.identifier.endsWith("/s5304"))!;
    expect(s5304.credits.filter((c) => c.kind === "pl")).toHaveLength(6);
  });

  it("reads the section of a public law ref with title or subdivision segments", () => {
    const s5304 = uslm().shard.entries.find((e) =>
      e.identifier.endsWith("/s5304"),
    )!;
    const pl = s5304.credits.filter((c) => c.kind === "pl");
    expect(pl).toHaveLength(7);
    expect(pl[1]).toEqual({
      kind: "pl",
      text: "Pub. L. 100–472, title I, § 103",
      basis: "source_field",
      pattern: { id: "uslm-pl-href", version: v },
      congress: 100,
      number: 472,
      section: "103",
      date: "1988-10-05",
    });
    expect(pl[3]).toMatchObject({
      text: "Pub. L. 101–301, § 2(a)(1)",
      congress: 101,
      number: 301,
      section: "2",
      date: "1990-05-24",
    });
    const s13 = uslm().shard.entries.find((e) =>
      e.identifier.endsWith("/s13–1"),
    )!;
    expect(s13.credits[0]).toMatchObject({ kind: "pl", section: "1103" });
  });

  it("walks the 450f transfer and keeps two targets and a cross-title target", () => {
    const by = (s: string) =>
      uslm().shard.entries.find((e) => e.identifier.endsWith(`/${s}`))!;
    expect(by("s450f").reclassifiedAs).toEqual({
      targets: ["/us/usc/t25/s5321"],
      noteText:
        "Section 450f was editorially reclassified as section 5321 of this title.",
      noteTextOmitted: false,
    });
    expect(by("s458bbb").reclassifiedAs!.targets).toEqual([
      "/us/usc/t25/s458ddd",
      "/us/usc/t25/s5421",
    ]);
    expect(by("s458bbb").credits).toEqual([]);
    expect(by("s421").reclassifiedAs).toEqual({
      targets: ["/us/usc/t43/s179"],
      noteText: null,
      noteTextOmitted: true,
    });
  });

  it("refuses a title that does not state the requested release point", () => {
    expect(() => uslm(USLM_XML, "119-140")).toThrow(/release point/);
    expect(() =>
      uslm(
        USLM_XML.replace(
          '<ref href="/us/usc/t25/s1545">',
          '<ref href="/us/pl/1/1">',
        ),
      ),
    ).toThrow(/names no target/);
  });
});

describe("Federal Register vocabulary", () => {
  it("keeps slug, name, short name and parent slug only, and leaves out wording it cannot carry", () => {
    const { file, report } = mapFrAgencies(
      [
        {
          id: 2,
          slug: "beta-service",
          name: "Beta Service",
          short_name: "",
          parent_id: 1,
          url: "https://x",
          description: "d",
        },
        {
          id: 1,
          slug: "alpha-department",
          name: "Alpha  Department",
          short_name: "AD",
          parent_id: null,
        },
        {
          id: 3,
          slug: "gamma-office",
          name: `Office for ${shortestName()}`,
          short_name: null,
          parent_id: 1,
        },
      ],
      names,
    );
    expect(file.entries).toEqual([
      {
        id: "alpha-department",
        label: "Alpha Department",
        shortLabel: "AD",
        parentId: null,
      },
      {
        id: "beta-service",
        label: "Beta Service",
        shortLabel: null,
        parentId: "alpha-department",
      },
    ]);
    expect(report.dropped).toEqual([
      { id: "gamma-office", reason: "nation_name_probe" },
    ]);
    const topics = mapFrTopics(
      {
        "zeta-topic": { count: 3, name: "Zeta topic" },
        "eta-topic": { count: 1, name: "Eta topic" },
      },
      names,
    );
    expect(topics.file.entries.map((e) => e.id)).toEqual([
      "eta-topic",
      "zeta-topic",
    ]);
    expect(schemaErrors("vocabulary", topics.file)).toEqual([]);
  });
});

describe("zip reader", () => {
  it("reads stored and deflated entries and refuses a damaged one", () => {
    const data = Buffer.from("synthetic volume bytes ".repeat(50));
    const zip = makeZip([
      { name: "a/one.xml", data },
      { name: "two.xml", data, deflate: true },
    ]);
    const entries = listZipEntries(zip);
    expect(entries.map((e) => e.name)).toEqual(["a/one.xml", "two.xml"]);
    for (const entry of entries)
      expect(readZipEntry(zip, entry).equals(data)).toBe(true);
    const damaged = Buffer.from(zip);
    damaged[40] ^= 0xff;
    expect(() => readZipEntry(damaged, entries[0])).toThrow(/CRC/);
    expect(() =>
      listZipEntries(Buffer.from("not a zip at all, plainly text")),
    ).toThrow(/not a zip/);
  });
});
