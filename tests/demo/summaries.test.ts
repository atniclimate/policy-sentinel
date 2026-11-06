// Decision 8: a source's own summary is shown only when its source note
// settles reuse, and never past the D-068 personal-pattern guard.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SUMMARY_LIMIT,
  SUMMARY_TERMS,
  sourceSummary,
} from "../../src/demo/summaries";

const SUMMARY = "The Example Agency proposes to revise its sample water rule.";

describe("SUMMARY_TERMS", () => {
  it("shows the Federal Register only, and names a note for every source", () => {
    const on = Object.entries(SUMMARY_TERMS)
      .filter(([, terms]) => terms.show)
      .map(([id]) => id);
    expect(on).toEqual(["federal-register"]);
    for (const { note } of Object.values(SUMMARY_TERMS)) {
      expect(existsSync(note), note).toBe(true);
    }
  });
});

describe("sourceSummary", () => {
  it("passes an on source's summary through unchanged", () => {
    expect(
      sourceSummary({ sourceId: "federal-register", summary: SUMMARY }),
    ).toEqual({ text: SUMMARY, cut: false });
  });

  it("shows nothing with no summary, an off source or an unknown source", () => {
    expect(
      sourceSummary({ sourceId: "federal-register", summary: null }),
    ).toBeNull();
    expect(sourceSummary({ sourceId: "federal-register", summary: "" })).toBe(
      null,
    );
    expect(sourceSummary({ sourceId: "congress", summary: SUMMARY })).toBe(
      null,
    );
    expect(sourceSummary({ sourceId: "govinfo", summary: SUMMARY })).toBe(null);
    expect(
      sourceSummary({ sourceId: "example-source", summary: SUMMARY }),
    ).toBe(null);
    // A key inherited from Object.prototype is not a source.
    expect(sourceSummary({ sourceId: "toString", summary: SUMMARY })).toBe(
      null,
    );
  });

  it("withholds a summary the personal-pattern guard flags", () => {
    for (const flagged of [
      `${SUMMARY} For information, contact Sample Person at 999-555-0100.`,
      `${SUMMARY} Write to sample@example.gov.`,
    ]) {
      expect(
        sourceSummary({ sourceId: "federal-register", summary: flagged }),
      ).toBe("withheld");
    }
  });

  it("marks a summary that reaches the Worker's limit as possibly cut", () => {
    const long = "a".repeat(SUMMARY_LIMIT);
    expect(
      sourceSummary({ sourceId: "federal-register", summary: long }),
    ).toEqual({ text: long, cut: true });
    expect(
      sourceSummary({ sourceId: "federal-register", summary: long.slice(1) }),
    ).toEqual({ text: long.slice(1), cut: false });
  });
});
