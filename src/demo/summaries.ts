/**
 * Source summaries (owner decision 8, 2026-11-06): a source's own summary is
 * shown verbatim only when its source note settles reuse of that text, and
 * never when the D-068 personal-pattern guard finds anything in it.
 */
import { hasPersonalPattern } from "./personal-guard.ts";
import type { DemoCitation, DemoSourceId } from "./types.ts";

/**
 * One row per source the demo can enable, closed. `show` is true only when
 * `note` settles reuse of the source's summary or abstract text; when false,
 * `note` is the review that leaves it open.
 */
export const SUMMARY_TERMS: Readonly<
  Record<DemoSourceId, { readonly show: boolean; readonly note: string }>
> = {
  // 1 CFR 2.6: Federal Register material may be reproduced; the note allows a bounded abstract.
  "federal-register": {
    show: true,
    note: "docs/source-reviews/federal-register-api-2026-07-31.md",
  },
  // Needs a separate item and field reproduction review before any excerpt.
  govinfo: {
    show: false,
    note: "docs/source-reviews/govinfo-api-2026-07-31.md",
  },
  // CRS summary bodies wait on a field-specific review; the Worker's field is the latest action.
  congress: {
    show: false,
    note: "docs/source-reviews/congress-gov-api-2026-07-31.md",
  },
  // No excerpt until source- and field-specific rights are reviewed.
  regulations: {
    show: false,
    note: "docs/source-reviews/regulations-gov-api-2026-07-31.md",
  },
  // No reproduction grant; only a permitted short excerpt, not yet named.
  grants: {
    show: false,
    note: "docs/source-reviews/grants-gov-api-2026-07-31.md",
  },
  // No excerpt pending document-specific rights review.
  washington: {
    show: false,
    note: "docs/source-reviews/washington-lws-2026-07-31.md",
  },
  // The use agreement is silent on reusing text.
  oregon: {
    show: false,
    note: "docs/source-reviews/oregon-olis-odata-aua-2026-11-05.md",
  },
  // Text, excerpt and export acceptance: none.
  idaho: {
    show: false,
    note: "docs/source-reviews/nationwide/id-2026-10-07.md",
  },
  // Metadata and links only; no opinion text is copied.
  "govinfo-courts": {
    show: false,
    note: "docs/source-reviews/court-opinion-references-2026-10-19.md",
  },
};

/** The Worker cuts a Federal Register abstract at this many characters (worker/src/sources/federal-register.ts). */
export const SUMMARY_LIMIT = 500;

/**
 * What a row shows: null shows nothing (no summary, or the source is off),
 * "withheld" states that one was held back, otherwise the text as sent.
 * `cut` is true when the text reaches the Worker's limit and may be shortened.
 */
export function sourceSummary(
  c: Pick<DemoCitation, "sourceId" | "summary">,
): { readonly text: string; readonly cut: boolean } | "withheld" | null {
  if (!c.summary || !Object.hasOwn(SUMMARY_TERMS, c.sourceId)) return null;
  if (!SUMMARY_TERMS[c.sourceId as DemoSourceId].show) return null;
  if (hasPersonalPattern(c.summary)) return "withheld";
  return { text: c.summary, cut: c.summary.length >= SUMMARY_LIMIT };
}
