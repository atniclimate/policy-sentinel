// @vitest-environment node
// The Federal Register "Authority:" line read from text blocks (design T1.3).
// Pure function; synthetic blocks only.
import { describe, expect, it } from "vitest";
import {
  AUTHORITY_LINE_MAX,
  authorityLine,
} from "../../src/demo/authority-line";

const block = (text: string, locator = "Part 999") => ({ text, locator });

describe("authorityLine", () => {
  it("returns the wording after the heading at the start of a block", () => {
    expect(
      authorityLine([
        block("PART 999--EXAMPLE PROVISIONS"),
        block("Authority:  25 U.S.C. 9;\n 42 U.S.C. 7401."),
      ]),
    ).toEqual({
      authorityLine: "25 U.S.C. 9; 42 U.S.C. 7401.",
      authorityLinePresent: true,
    });
  });

  it("joins several lines in source order and keeps an exact repeat once", () => {
    expect(
      authorityLine([
        block("Authority: 42 U.S.C. 7401."),
        block("Other text."),
        block("Authority: 25 U.S.C. 9."),
        block("Authority: 42 U.S.C. 7401."),
      ]).authorityLine,
    ).toBe("42 U.S.C. 7401.; 25 U.S.C. 9.");
  });

  it("says present false when no block starts with the heading", () => {
    expect(
      authorityLine([
        block("This action is authorized by 42 U.S.C. 7401."),
        block("See the Authority: section below."),
        block("authority: lower case is not the printed heading"),
      ]),
    ).toEqual({ authorityLinePresent: false });
    expect(authorityLine([])).toEqual({ authorityLinePresent: false });
    expect(authorityLine([block("Authority:   ")])).toEqual({
      authorityLinePresent: false,
    });
  });

  it("leaves out a line the personal-pattern guard stops, but still says one is present", () => {
    expect(
      authorityLine([block("Authority: call (555) 010-0199 for the list.")]),
    ).toEqual({ authorityLinePresent: true });
  });

  it("shows no line when any one is withheld, so the rest is not read as the whole authority", () => {
    // Boundary B recheck: the clean line alone would read as the document's
    // whole authority; the page then states that a line exists instead.
    for (const blocks of [
      [
        block("Authority: write to someone@example.org."),
        block("Authority: 25 U.S.C. 9."),
      ],
      [
        block("Authority: 25 U.S.C. 5301."),
        block("Authority: 42 U.S.C. 1; contact Ms. Sampleperson"),
      ],
    ])
      expect(authorityLine(blocks)).toEqual({ authorityLinePresent: true });
  });

  it("withholds a text over the validator's bound rather than show part of it", () => {
    // A cut or dropped line would read as the whole authority (safeguard 8).
    const long = `${"25 U.S.C. 9, ".repeat(115)}end.`;
    expect(
      authorityLine([
        block(`Authority: ${long}`),
        block(`Authority: ${"42 U.S.C. 1, ".repeat(46)}fin.`),
      ]),
    ).toEqual({ authorityLinePresent: true });
    expect(
      authorityLine([block(`Authority: ${"9 ".repeat(AUTHORITY_LINE_MAX)}`)]),
    ).toEqual({ authorityLinePresent: true });
    const exact = "9".repeat(AUTHORITY_LINE_MAX);
    expect(authorityLine([block(`Authority: ${exact}`)])).toEqual({
      authorityLine: exact,
      authorityLinePresent: true,
    });
  });
});
