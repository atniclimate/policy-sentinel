/**
 * Comment closing dates as an iCalendar file (RFC 5545), built in the browser.
 * One all-day event per Federal Register document that states a closing date.
 * Only official record fields go in: never notes, names, data actor entries or
 * search terms. The date is the source's own; the file says it can change.
 */
import { SOURCE_LABELS } from "./citations";
import { COPY } from "./copy";
import type { DemoCitation } from "./types";
import { policyId } from "./validation";

/** Fixed, so a calendar that imports the file again updates the same events. */
export const CALENDAR_UID_DOMAIN = "policy-sentinel.atniclimate.github.io";
const CRLF = "\r\n";
const encoder = new TextEncoder();

/** Federal Register rows that state a closing date, once per document number, in list order. */
export function calendarRows(
  citations: readonly DemoCitation[],
): DemoCitation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const number = policyId(citation);
    if (
      citation.sourceId !== "federal-register" ||
      !citation.commentsCloseOn ||
      seen.has(number)
    )
      return false;
    seen.add(number);
    return true;
  });
}

/** TEXT value escaping (RFC 5545 3.3.11): backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Lines longer than 75 octets continue on the next line after CRLF and one
 * space (RFC 5545 3.1). Splits fall between characters, never inside one.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    // The leading space of a continuation line counts toward its 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += character;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const day = (iso: string) => iso.replace(/-/g, "");
/** DTEND of an all-day event is the next day, exclusive. */
function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return day(date.toISOString().slice(0, 10));
}

export function buildCalendar(
  rows: readonly DemoCitation[],
  generatedAt: Date,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Affiliated Tribes of Northwest Indians//Policy Sentinel demo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const row of calendarRows(rows)) {
    const date = row.commentsCloseOn!;
    const source = SOURCE_LABELS[row.sourceId] ?? row.sourceId;
    lines.push(
      "BEGIN:VEVENT",
      `UID:fr-${policyId(row)}-comments-close@${CALENDAR_UID_DOMAIN}`,
      `DTSTAMP:${stamp(generatedAt)}`,
      `DTSTART;VALUE=DATE:${day(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${escapeText(COPY.calendar.summary(row.title))}`,
      `DESCRIPTION:${escapeText(COPY.calendar.description(date, source, row.officialUrl))}`,
      // A URI value, not TEXT: the official address goes in unescaped.
      `URL:${row.officialUrl}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
