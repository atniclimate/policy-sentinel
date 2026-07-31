import { describe, expect, it } from "vitest";
import { neutralizeSpreadsheetFormula, serializeCsv } from "../../src/app/csv";

describe("CSV output", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", " \t=hidden"])(
    "neutralizes spreadsheet formula prefix %s",
    (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
    },
  );

  it("preserves normal official-source text", () => {
    expect(neutralizeSpreadsheetFormula("Official title")).toBe(
      "Official title",
    );
  });

  it("uses RFC 4180 quoting and CRLF line endings", () => {
    expect(serializeCsv(["title"], [['A "quoted", title']])).toBe(
      '"title"\r\n"A ""quoted"", title"',
    );
  });
});
