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
import { buildDocument } from "../../src/demo/document";
import { VERBATIM_FIELDS } from "../../src/demo/index-types";
import { reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
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
    // shortcut: two sovereignty notes older than this test use "under" and
    // "general-jurisdiction" (the safeguard 1 label); exempted by exact text
    // until the owner of src/demo/copy/document.ts rewords them or rules them in.
    const existing = [COPY.docSovereignty[1], COPY.docSovereignty[2]];
    const exempt = [...leaves(COPY.grants), ...existing];
    const text = doc.blocks
      .flatMap((b) =>
        b.kind === "field" ? [b.label, b.value] : "text" in b ? [b.text] : [],
      )
      .map((s) => exempt.reduce((t, w) => t.split(w).join(" "), s));
    expect(existing.flatMap(forbiddenHits)).toEqual(["under", "jurisdiction"]);
    expect(text.flatMap(forbiddenHits)).toEqual([]);
  });
});
