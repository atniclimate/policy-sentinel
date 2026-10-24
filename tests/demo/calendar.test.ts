import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  calendarRows,
  CALENDAR_UID_DOMAIN,
  escapeText,
  foldLine,
} from "../../src/demo/calendar";
import {
  citation,
  regulationsRecord,
  statedCitation,
} from "./frontend-fixtures";

const AT = new Date("2099-01-08T12:00:00.000Z");
const octets = (line: string) => new TextEncoder().encode(line).length;
/** Unfolds per RFC 5545 3.1: a CRLF followed by one space is removed. */
const unfold = (text: string) => text.replace(/\r\n /g, "");

describe("comment closing dates as a calendar file", () => {
  it("writes one all-day event per Federal Register document that states a date", () => {
    const stated = statedCitation();
    const ics = buildCalendar(
      [stated, { ...stated }, citation(), regulationsRecord()],
      AT,
    );
    const lines = unfold(ics).split("\r\n");
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    for (const line of [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `UID:fr-2099-00010-comments-close@${CALENDAR_UID_DOMAIN}`,
      "DTSTAMP:20990108T120000Z",
      "DTSTART;VALUE=DATE:20990201",
      "DTEND;VALUE=DATE:20990202",
      "SUMMARY:Comments close: Example Groundfish Rule",
      `URL:${stated.officialUrl}`,
      "END:VCALENDAR",
    ])
      expect(lines).toContain(line);
    const description = lines.find((line) => line.startsWith("DESCRIPTION:"));
    expect(description).toBe(
      `DESCRIPTION:Comments close 2099-02-01\\, as stated by Federal Register. The date can change through an extension or a correction. Check the official source before relying on it: ${stated.officialUrl}`,
    );
    // Every line ends in CRLF, and none is a bare LF.
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("rolls DTEND over a month and a year end", () => {
    const ics = unfold(
      buildCalendar(
        [{ ...statedCitation(), commentsCloseOn: "2099-12-31" }],
        AT,
      ),
    );
    expect(ics).toContain("DTEND;VALUE=DATE:21000101");
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    expect(escapeText("a,b;c\\d\ne\r\nf")).toBe("a\\,b\\;c\\\\d\\ne\\nf");
    const ics = unfold(
      buildCalendar(
        [{ ...statedCitation(), title: "Fish, Wildlife; and\nParks" }],
        AT,
      ),
    );
    expect(ics).toContain(
      "SUMMARY:Comments close: Fish\\, Wildlife\\; and\\nParks",
    );
  });

  it("folds lines at 75 octets without splitting a character", () => {
    const line = `SUMMARY:${"é".repeat(60)}${"x".repeat(40)}`;
    const folded = foldLine(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) expect(octets(part)).toBeLessThanOrEqual(75);
    for (const part of folded.slice(1)) expect(part.startsWith(" ")).toBe(true);
    expect(unfold(folded.join("\r\n"))).toBe(line);
    expect(folded.join("")).not.toContain("�");
    expect(foldLine("SHORT:line")).toBe("SHORT:line");
  });

  it("carries no notes, names or search terms: only official record fields go in", () => {
    const ics = buildCalendar([statedCitation()], AT);
    expect(ics).not.toMatch(/Note|Prepared by|Search|Found by/);
  });

  it("finds no rows when nothing states a Federal Register closing date", () => {
    expect(calendarRows([citation(), regulationsRecord()])).toEqual([]);
    expect(calendarRows([])).toEqual([]);
    // An empty file still opens: the page keeps the button off instead of sending one.
    expect(buildCalendar([], AT)).not.toContain("VEVENT");
  });
});
