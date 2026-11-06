/**
 * The calendar day for an instant as YYYY-MM-DD, in the reader's zone unless one
 * is named; stored times stay UTC. A leaf module, so plain-Node scripts that
 * load citations.ts do not pull in the follow and discovery modules.
 */
export function localDay(value: string | Date, timeZone?: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
