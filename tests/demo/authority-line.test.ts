// @vitest-environment node
// The Federal Register "Authority:" line read from text blocks (design T1.3).
// Pure function; synthetic blocks only.
import { describe, expect, it } from "vitest";
import {
  AUTHORITY_LINE_MAX,
  authorityLine,
} from "../../src/demo/authority-line";
import { plainSourceText } from "../../src/demo/search-contract";

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
    expect(
      authorityLine([
        block("Authority: write to someone@example.org."),
        block("Authority: 25 U.S.C. 9."),
      ]),
    ).toEqual({ authorityLine: "25 U.S.C. 9.", authorityLinePresent: true });
  });

  it("stays within the validator's bound, keeping whole lines", () => {
    const long = `${"25 U.S.C. 9, ".repeat(100)}end.`;
    const out = authorityLine([
      block(`Authority: ${long}`),
      block(`Authority: ${long.replace("end", "fin")}`),
    ]);
    expect(out.authorityLine).toBe(long.replace(/\s+$/, ""));
    expect(out.authorityLine!.length).toBeLessThanOrEqual(AUTHORITY_LINE_MAX);
    const huge = authorityLine([
      block(`Authority: ${"9 ".repeat(AUTHORITY_LINE_MAX)}`),
    ]).authorityLine!;
    expect(huge.length).toBeLessThanOrEqual(AUTHORITY_LINE_MAX);
    expect(plainSourceText(huge, AUTHORITY_LINE_MAX)).toBe(true);
  });
});
