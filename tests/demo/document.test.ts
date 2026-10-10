import { describe, expect, it } from "vitest";
import { atniReferences, ieeeReference } from "../../src/demo/citations";
import { COPY } from "../../src/demo/copy";
import { buildDocument } from "../../src/demo/document";
import type { DocBlock } from "../../src/demo/document";
import { emptyActors, reportEntries } from "../../src/demo/report-state";
import type { DataActors, ReportState } from "../../src/demo/report-state";
import type { DemoIssue } from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { listing } from "./fixtures";
import { citation, policy } from "./frontend-fixtures";

const VERSION = "0.2.0";
const GENERATED = new Date("2099-01-08T12:00:00Z");
const RETRIEVED = "2099-01-07T11:59:00.000Z";
const ACTORS: DataActors = {
  name: "Sam Example",
  role: "Policy analyst",
  organization: "Example Office",
  sharingWith: "Example working group",
  purpose: "Briefing preparation",
};
const ABSENT: DemoIssue = {
  id: "consultation_absent-1",
  type: "consultation_absent",
  label: "No consultation wording",
  quote: "No consultation wording matched.",
  locator: "whole text",
  rule: "Absence rule.",
  limits: "Missing wording does not show that no consultation occurred.",
  check: "Read the whole record.",
};

/** A read Federal Register policy listed by two more sources, and an unread GovInfo listing. */
function fixture() {
  const base = policy("a", { ...citation(), matchKey: "fr:2099-00001" });
  const first = {
    ...base,
    issues: [
      ...base.issues,
      ABSENT,
      { ...base.issues[0], id: "consultation_language-2", quote: "Left out." },
    ],
  };
  const second = {
    ...listing("govinfo", "2099-00002", null),
    title: 'A  second EXAMPLE; "title"',
    issuingBody: "Not stated",
    date: null,
  };
  const key = keyOf(first.citation);
  const report: ReportState = {
    cited: {
      [key]: {
        citation: first.citation,
        policy: first,
        note: "  Keep this policy note.  ",
        alternates: [listing("govinfo"), listing("regulations")],
      },
      [keyOf(second)]: {
        citation: second,
        policy: null,
        note: "",
        alternates: [],
      },
    },
    marks: {
      [key]: {
        "consultation_language-1": {
          on: true,
          note: " Ask the program office. ",
        },
        "consultation_absent-1": { on: true, note: "" },
        "consultation_language-2": { on: false, note: "Not included." },
      },
    },
    actors: ACTORS,
  };
  return { first, second, report };
}

function build(report: ReportState, actors = report.actors) {
  return buildDocument({
    version: VERSION,
    generatedAt: GENERATED,
    entries: reportEntries(report),
    actors,
  });
}

const field = (label: string, value: string, mono?: true): DocBlock =>
  mono
    ? { kind: "field", label, value, mono }
    : { kind: "field", label, value };
const fields = (blocks: readonly DocBlock[], label: string) =>
  blocks.flatMap((block) =>
    block.kind === "field" && block.label === label ? [block.value] : [],
  );

describe("document model shared by the PDF and the print view", () => {
  it("lays out the cover, each policy, the data actors, the references and the notes in order", () => {
    const { first, second, report } = fixture();
    expect(build(report)).toEqual({
      title: "Cited Policies, 2099-01-08",
      runningHead: "Cited Policies",
      footer: COPY.limitsShort(VERSION),
      blocks: [
        { kind: "eyebrow", text: "Policy Sentinel 0.2.0, working demo" },
        { kind: "title", text: "Cited Policies" },
        { kind: "lede", text: COPY.pdfIntro },
        field("Prepared by", "Sam Example, Policy analyst"),
        field("Organization or Nation", "Example Office"),
        field("Sharing with", "Example working group"),
        field("Purpose", "Briefing preparation"),
        field("Generated", "2099-01-08"),
        { kind: "small", text: COPY.docActorsIntro },
        { kind: "h3", text: "Limits" },
        { kind: "p", text: COPY.limits(VERSION) },
        { kind: "h3", text: "Policies in This List" },
        { kind: "p", text: "1. Example Water Policy [1]" },
        { kind: "p", text: '2. A  second EXAMPLE; "title" [2]' },

        { kind: "break" },
        { kind: "h2", text: "1. Example Water Policy" },
        field("Identifier", "99 FR 100 (FR Doc. 2099-00001)", true),
        field("Source", "Federal Register"),
        field("Issuing body", "Example Department"),
        field("Type", "Proposed Rule"),
        field("Date", "2099-01-05"),
        field(
          "Official URL",
          "https://www.federalregister.gov/d/2099-00001",
          true,
        ),
        { kind: "h3", text: "Note" },
        { kind: "note", text: "Keep this policy note." },
        { kind: "h3", text: "Consultation wording" },
        {
          kind: "quote",
          text: "The Department invites consultation in snapshot a.",
        },
        { kind: "small", text: "Where: /p[1]" },
        {
          kind: "small",
          text: "Limit: Wording does not show that consultation occurred.",
        },
        { kind: "small", text: "Rule: Exact consultation wording." },
        { kind: "small", text: "Check: Read the official record." },
        { kind: "note", text: "Note: Ask the program office." },
        { kind: "h3", text: "No consultation wording" },
        {
          kind: "assessment",
          text: "Rule assessment: No consultation wording matched.",
        },
        { kind: "small", text: "Where: whole text" },
        {
          kind: "small",
          text: "Limit: Missing wording does not show that no consultation occurred.",
        },
        { kind: "small", text: "Rule: Absence rule." },
        { kind: "small", text: "Check: Read the whole record." },
        { kind: "h3", text: "Provenance" },
        field("Reference", "[1]"),
        field("Metadata retrieved", RETRIEVED),
        field("Text read from", first.receipt.textUrl),
        field("Text retrieved", RETRIEVED),
        field("Fingerprint", `SHA-256 ${"a".repeat(64)} (1,234 bytes)`, true),
        field("Extractor", "policy-text 2.0.0"),
        field("Parser configuration SHA-256", "c".repeat(64), true),
        field("Demo rules", "demo-rules-1.0.0"),
        field(
          "Also listed by",
          "GovInfo: https://www.govinfo.gov/app/details/FR-2099-01-05/2099-00001",
        ),
        field(
          "Also listed by",
          "Regulations.gov: https://www.regulations.gov/document/EX-2099-00001",
        ),

        { kind: "break" },
        { kind: "h2", text: '2. A  second EXAMPLE; "title"' },
        field("Identifier", "govinfo 2099-00002", true),
        field("Source", "GovInfo"),
        field("Issuing body", "Not stated"),
        field("Type", "Notice"),
        field("Date", "Not stated"),
        field(
          "Official URL",
          "https://www.govinfo.gov/app/details/FR-2099-01-05/2099-00002",
          true,
        ),
        { kind: "h3", text: "Note" },
        { kind: "note", text: COPY.pdfNoNote },
        { kind: "small", text: COPY.pdfTextNotRead },
        { kind: "h3", text: "Provenance" },
        field("Reference", "[2]"),
        field("Metadata retrieved", RETRIEVED),
        field("Text read from", "Not recorded"),
        field("Text retrieved", "Not recorded"),
        field("Fingerprint", "Not recorded"),

        { kind: "break" },
        { kind: "h2", text: "Data Actors and Sharing" },
        { kind: "p", text: COPY.docActorsIntro },
        field("Prepared by", "Sam Example"),
        field("Role", "Policy analyst"),
        field("Organization or Nation", "Example Office"),
        field("Sharing with", "Example working group"),
        field("Purpose", "Briefing preparation"),
        { kind: "h3", text: "Software" },
        field("Tool", "Policy Sentinel demo 0.2.0, in development"),
        field("Responsible person for this use", "Sam Example"),
        field("Sources cited", "Federal Register, GovInfo"),

        { kind: "h2", text: "References" },
        { kind: "ref", number: 1, text: ieeeReference(first.citation) },
        { kind: "ref", number: 2, text: ieeeReference(second) },
        { kind: "ref", number: 3, text: atniReferences(VERSION)[0] },
        { kind: "ref", number: 4, text: atniReferences(VERSION)[1] },

        { kind: "h2", text: "Data Provenance and Sovereignty Notes" },
        ...COPY.docSovereignty.map((text) => ({ kind: "p", text })),
      ],
    });
  });

  it("shares one number between the contents list, the Reference field and the References section", () => {
    const { report } = fixture();
    const { blocks } = build(report);
    const refs = blocks.filter((block) => block.kind === "ref");
    expect(refs.map((ref) => ref.number)).toEqual([1, 2, 3, 4]);
    expect(fields(blocks, "Reference")).toEqual(["[1]", "[2]"]);
    for (const [index, entry] of reportEntries(report).entries()) {
      const n = index + 1;
      expect(blocks).toContainEqual({
        kind: "p",
        text: `${n}. ${entry.citation.title} [${n}]`,
      });
      expect(blocks).toContainEqual({
        kind: "h2",
        text: `${n}. ${entry.citation.title}`,
      });
      expect(refs[index].text).toBe(ieeeReference(entry.citation));
    }
    expect(refs.slice(-2).map((ref) => ref.text)).toEqual(
      atniReferences(VERSION),
    );
  });

  it("starts every policy and the data actors on a new page, and nothing else", () => {
    const { blocks } = build(fixture().report);
    const afterBreak = blocks.flatMap((block, index) =>
      block.kind === "break" ? [blocks[index + 1]] : [],
    );
    expect(afterBreak).toEqual([
      { kind: "h2", text: "1. Example Water Policy" },
      { kind: "h2", text: '2. A  second EXAMPLE; "title"' },
      { kind: "h2", text: "Data Actors and Sharing" },
    ]);
  });

  it("prints Not recorded for every data actor entry that is missing", () => {
    const { report } = fixture();
    const blank = build(report, { ...emptyActors(), role: " \n " }).blocks;
    expect(fields(blank, "Prepared by")).toEqual([
      "Not recorded",
      "Not recorded",
    ]);
    for (const label of ["Role", "Responsible person for this use"])
      expect(fields(blank, label)).toEqual(["Not recorded"]);
    for (const label of ["Organization or Nation", "Sharing with", "Purpose"])
      expect(fields(blank, label)).toEqual(["Not recorded", "Not recorded"]);

    const partial = build(report, { ...ACTORS, role: "" }).blocks;
    expect(fields(partial, "Prepared by")).toEqual([
      "Sam Example",
      "Sam Example",
    ]);
    expect(fields(partial, "Role")).toEqual(["Not recorded"]);

    // A role alone must not read as the preparer on the cover.
    const nameless = build(report, { ...ACTORS, name: "" }).blocks;
    expect(fields(nameless, "Prepared by")).toEqual([
      "Not recorded, Policy analyst",
      "Not recorded",
    ]);
    expect(fields(nameless, "Responsible person for this use")).toEqual([
      "Not recorded",
    ]);
  });

  it("says on the cover, beside the typed entries, that the demo does not verify them", () => {
    const { blocks } = build(fixture().report);
    const cover = blocks.slice(
      0,
      blocks.findIndex((block) => block.kind === "break"),
    );
    expect(COPY.docActorsIntro).toBe(
      "The data actor entries in this document were typed by the person who prepared this list. The demo does not verify them.",
    );
    expect(cover).toContainEqual({ kind: "small", text: COPY.docActorsIntro });
    expect(
      blocks.filter(
        (block) => "text" in block && block.text === COPY.docActorsIntro,
      ),
    ).toHaveLength(2);
  });

  it("says a read policy has no selected passages without calling its text unread", () => {
    const { report } = fixture();
    const { blocks } = build({ ...report, marks: {} });
    expect(blocks.filter((block) => block.kind === "small")).toEqual([
      { kind: "small", text: COPY.docActorsIntro },
      { kind: "small", text: COPY.pdfNoPassages },
      { kind: "small", text: COPY.pdfTextNotRead },
    ]);
    expect(blocks.some((block) => block.kind === "quote")).toBe(false);
    expect(fields(blocks, "Fingerprint")[0]).toMatch(/^SHA-256 a{64} /);
  });

  it("still builds for an empty list, with only the ATNI references", () => {
    const model = build({ cited: {}, marks: {}, actors: emptyActors() });
    expect(model.blocks.some((block) => block.kind === "break")).toBe(true);
    // The document states the gap; it does not print the page's instruction.
    expect(model.blocks).toContainEqual({
      kind: "p",
      text: "No policies are cited in this list.",
    });
    expect(JSON.stringify(model)).not.toContain(COPY.exportEmpty);
    expect(fields(model.blocks, "Sources cited")).toEqual([]);
    expect(model.blocks.filter((block) => block.kind === "ref")).toEqual([
      { kind: "ref", number: 1, text: atniReferences(VERSION)[0] },
      { kind: "ref", number: 2, text: atniReferences(VERSION)[1] },
    ]);
  });

  it("states the sovereignty and verification facts and uses no dashes for punctuation", () => {
    const model = build(fixture().report);
    const notes = COPY.docSovereignty.join(" ");
    expect(notes).toMatch(
      /Tiered Sovereign Data Framework \(TSDF\) 0\.9\.8, a pre-release standard/,
    );
    expect(notes).toMatch(/Tier 0 \(T0\)/);
    // The tier is explained once, in the first paragraph, with the framework's own condition.
    expect(COPY.docSovereignty[0]).toMatch(
      /treats documented public federal and state sources as Tier 0 \(T0\), subject to each source's conditions\./,
    );
    expect(COPY.docSovereignty[0]).toMatch(
      /Tier 0 is the framework's open tier: material formally released for public access by an authorized source\./,
    );
    expect(notes).toMatch(
      /no Tribal code source and no Tribal government source/,
    );
    expect(notes).toMatch(/does not detect or exclude/);
    expect(notes).toMatch(/does not classify/);
    // The demo knows who typed an entry, not who it belongs to.
    expect(notes).toMatch(
      /were written by the person who prepared this list\. The demo does not classify them or say who they belong to/,
    );
    expect(notes).not.toMatch(/belong to the person/);
    expect(notes).toMatch(/no certification/);
    expect(notes).toMatch(/no relationship to any Nation/);
    expect(notes).toMatch(/official source/);
    expect(JSON.stringify(model)).not.toMatch(/[–—]/);
  });
});
