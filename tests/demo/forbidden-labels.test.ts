// Design section 1 rule 2: the page's own chain labels and exports never use
// a forbidden word. Official wording is skipped by field name, and only for
// exactly VERBATIM_FIELDS (condition F6). The main session extends the export
// half when the chain joins buildDocument.
import { cleanup, render } from "@testing-library/preact";
import { h } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { LinkedRecordsPanel } from "../../demo/app/LinkedRecordsPanel";
import { COPY } from "../../src/demo/copy";
import { chain } from "../../src/demo/copy/chain";
import { laneId } from "../../src/demo/discovery";
import type { Reason } from "../../src/demo/discovery";
import { buildDocument } from "../../src/demo/document";
import type { DocBlock } from "../../src/demo/document";
import { VERBATIM_FIELDS } from "../../src/demo/index-types";
import { foundByOf, reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import type { DemoCitation } from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { frRecord } from "./fixtures/chain";
import { forbiddenHits } from "./fixtures/chain/forbidden-words";
import { allRows, answered, idle, notices } from "./fixtures/chain/panel-props";
import { policy } from "./frontend-fixtures";

afterEach(cleanup);

const SKIPPED = new Set<string>(VERBATIM_FIELDS);

/** The panel's text with exactly the VERBATIM_FIELDS elements removed. */
function ownText(root: Element): { text: string; skipped: string[] } {
  const copy = root.cloneNode(true) as Element;
  const marked = [...copy.querySelectorAll("[data-verbatim]")];
  const fields = marked.map((el) => el.getAttribute("data-verbatim") ?? "");
  for (const el of marked)
    if (SKIPPED.has(el.getAttribute("data-verbatim") ?? "")) el.remove();
  return { text: copy.textContent ?? "", skipped: fields };
}

// Strings: every leaf string of the chain copy, whatever its depth.
const leaves = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : typeof value === "function"
      ? [String((value as (s: string) => string)("2099-01-01"))]
      : value && typeof value === "object"
        ? Object.values(value).flatMap(leaves)
        : [];

describe("forbidden words in chain labels and exports", () => {
  it("finds none in the rendered panel outside verbatim official wording", () => {
    for (const expansions of [idle, answered()]) {
      const { container } = render(
        h(LinkedRecordsPanel, {
          rows: allRows(),
          notices,
          expansions,
          onExpand: () => undefined,
          onHop: () => undefined,
        }),
      );
      const { text, skipped } = ownText(container);
      // Only VERBATIM_FIELDS are ever marked, so nothing else can be skipped.
      expect(skipped.filter((f) => !SKIPPED.has(f))).toEqual([]);
      expect(forbiddenHits(text)).toEqual([]);
      cleanup();
    }
  });

  it("would catch a forbidden word: the fixture's official wording holds one", () => {
    const { container } = render(h(LinkedRecordsPanel, { rows: allRows() }));
    expect(forbiddenHits(container.textContent ?? "")).toContain("under");
  });

  it("finds none in the chain copy", () => {
    expect(leaves(chain).flatMap(forbiddenHits)).toEqual([]);
  });

  it("finds none in a built export of a chain record outside the Grants.gov filter wording", () => {
    const opened = policy("a", frRecord);
    const report: ReportState = {
      cited: {
        [keyOf(opened.citation)]: {
          citation: opened.citation,
          policy: opened,
          note: "",
          alternates: [],
        },
      },
      marks: {},
      actors: {
        name: "Example Analyst",
        role: "Policy analyst",
        organization: "Example Office",
        sharingWith: "Example Committee",
        purpose: "Synthetic test",
      },
    };
    const doc = buildDocument({
      version: "0.0.0",
      generatedAt: new Date("2099-03-01T12:00:00Z"),
      entries: reportEntries(report),
      actors: report.actors,
    });
    // The export marks no field names, so nothing is skipped: the synthetic
    // record's titles and quotes hold no forbidden word.
    expect(exportHits(doc.blocks, [])).toEqual([]);
  });

  it("finds none in a built export that carries the chain, outside verbatim official wording", () => {
    const opened = policy("a", frRecord);
    const rows = allRows();
    // A Find related match and a name search, so the export prints the
    // related caveat and the name caution (R3-5).
    const foundBy = [
      ...foundByOf([{ ...reason("99 CFR 100"), match: "cfr" as const }], {
        kind: "record",
        sourceId: "federal-register",
        identifier: "FR Doc. 2099-00001",
      }),
      ...foundByOf([{ ...reason("Sampleperson water"), name: true }], {
        kind: "draft",
        id: "PSC-99-001",
      }),
    ];
    const listed: DemoCitation = { ...grantsRow, listedEligibility: "tribal" };
    const entries = [
      {
        ...reportEntries(reportOf(opened.citation, opened))[0],
        chain: rows,
        foundBy,
      },
      {
        ...reportEntries(reportOf(listed))[0],
        chain: [],
        grants: {
          ok: true as const,
          source: "grants" as const,
          citation: listed,
          authority: "found" as const,
        },
      },
    ];
    for (const template of ["citations", "briefing"] as const) {
      const doc = buildDocument({
        version: "0.0.0",
        generatedAt: new Date("2099-03-01T12:00:00Z"),
        entries,
        actors: ACTORS,
        template,
      });
      // Exactly the rows' VERBATIM_FIELDS wording is skipped (the panel marks
      // the same spans), and nothing else.
      const verbatim = [
        ...rows.flatMap((row) =>
          row.quote?.text && SKIPPED.has(row.quote.field)
            ? [row.quote.text]
            : [],
        ),
        ...rows.flatMap((row) =>
          row.sourceWording ? [row.sourceWording] : [],
        ),
      ];
      expect(exportHits(doc.blocks, verbatim)).toEqual([]);
      if (template === "citations") {
        const text = JSON.stringify(doc.blocks);
        for (const s of [
          COPY.related.caveat,
          COPY.docFoundBy.nameCaution,
          COPY.grants.listedUnder,
        ])
          expect(text).toContain(s);
      }
    }
    // The fixture's official CFR wording holds a forbidden word, so the skip is load-bearing.
    expect(
      rows.some((row) => forbiddenHits(row.quote?.text ?? "").length),
    ).toBe(true);
  });

  it("exempts only the safeguard 1 label general-jurisdiction in the sovereignty notes", () => {
    expect(COPY.docSovereignty.flatMap(forbiddenHits)).toEqual([
      "jurisdiction",
    ]);
    expect(
      COPY.docSovereignty
        .map((s) => s.split(SAFEGUARD_LABEL).join(" "))
        .flatMap(forbiddenHits),
    ).toEqual([]);
  });
});

/** The safeguard 1 label (AGENTS.md): the one design rule 2 word an export may print. */
const SAFEGUARD_LABEL = "general-jurisdiction";

const ACTORS = {
  name: "Example Analyst",
  role: "Policy analyst",
  organization: "Example Office",
  sharingWith: "Example Committee",
  purpose: "Synthetic test",
};

const grantsRow: DemoCitation = {
  sourceId: "grants",
  identifier: "EX-2099-001",
  title: "Example Water Program",
  issuingBody: "Example Agency",
  kind: "posted",
  date: "2099-01-05",
  officialUrl: "https://www.grants.gov/search-results-detail/990001",
  textUrl: null,
  retrievedAt: "2099-01-07T12:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
  assistanceListings: [{ number: "99.001", title: "Example Listing" }],
  authorityPassage: {
    text: "99 U.S.C. 1001, as stated in the program notice.",
    heading: "Authority",
    locator: 'Grants.gov synopsis description, heading "Authority"',
  },
  versionDate: "2099-01-04",
};

function reportOf(
  citation: DemoCitation,
  opened: ReturnType<typeof policy> | null = null,
): ReportState {
  return {
    cited: {
      [keyOf(citation)]: { citation, policy: opened, note: "", alternates: [] },
    },
    marks: {},
    actors: ACTORS,
  };
}

const reason = (terms: string): Reason => ({
  laneId: laneId("federal-register", terms),
  group: "related",
  sourceId: "federal-register",
  query: terms,
  label: terms,
  terms,
});

/** A Grants.gov string with only the word "eligibility" cut out: its filter's own name. */
const grantsExempt = leaves(COPY.grants).map(
  (s) => [s, s.replace(/\beligibility\b/gi, " ")] as const,
);

/** Forbidden words in an export's own wording, after the given verbatim spans and the exemptions are cut out. */
function exportHits(blocks: readonly DocBlock[], verbatim: readonly string[]) {
  const cut = [...verbatim, SAFEGUARD_LABEL];
  return blocks
    .flatMap((b) =>
      b.kind === "field" ? [b.label, b.value] : "text" in b ? [b.text] : [],
    )
    .map((s) => cut.reduce((t, w) => t.split(w).join(" "), s))
    .map((s) => grantsExempt.reduce((t, [w, r]) => t.split(w).join(r), s))
    .flatMap(forbiddenHits);
}
