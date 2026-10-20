import { COPY } from "./copy";
import { searchPageLimit } from "./search-contract";
import type { LaneMatch, Reason, Seed } from "./discovery";
import type { DemoCitation, DemoPolicyResponse } from "./types";
import {
  citationValue,
  keyOf,
  object,
  policyId,
  policyValue,
  text,
} from "./validation";

export const STORAGE_KEY = "ps-demo-citations-v1";
export const MAX_CITATIONS = 50;
export const MAX_NOTE = 10000;
export const MAX_SAVED_CHARACTERS = 2_000_000;
export const MAX_ACTOR_TEXT = 300;
export const MAX_DRAFT_TITLE = 300;
// Every loaded listing may identify the same document; one is its primary citation.
export const MAX_ALTERNATES =
  ["federal-register", "govinfo", "regulations"].reduce(
    (total, source) => total + searchPageLimit(source) * 10,
    0,
  ) - 1;

export interface Mark {
  on: boolean;
  note: string;
}
/** Who prepared the list, for whom and why. Typed by the person exporting; never verified. */
export interface DataActors {
  name: string;
  role: string;
  organization: string;
  sharingWith: string;
  purpose: string;
}
export const ACTOR_FIELDS: readonly (keyof DataActors)[] = [
  "name",
  "role",
  "organization",
  "sharingWith",
  "purpose",
];
export const emptyActors = (): DataActors => ({
  name: "",
  role: "",
  organization: "",
  sharingWith: "",
  purpose: "",
});
export function missingActorFields(actors: DataActors): (keyof DataActors)[] {
  return ACTOR_FIELDS.filter((field) => !actors[field].trim());
}
/**
 * What a search grew from, as the exported report may name it: a draft by ID,
 * with the title the page showed when it supplies one (D-112), a typed search
 * with no text beyond its terms, the committee area menu without the area,
 * which is never applied to results, or the official record Find related
 * started from, by its source and identifier.
 */
export type FoundSeed =
  | { readonly kind: "draft"; readonly id: string; readonly title?: string }
  | { readonly kind: "typed" }
  | { readonly kind: "area" }
  | {
      readonly kind: "record";
      readonly sourceId: string;
      readonly identifier: string;
    };
/** One search that listed a cited document. */
export interface FoundBy {
  readonly sourceId: string;
  readonly terms: string;
  readonly collection?: string;
  /** A name search, worded apart in the report (safeguard 1). */
  readonly name?: true;
  /** An exact identifier lookup: the kind of identifier in `terms`. */
  readonly match?: LaneMatch;
  readonly seed: FoundSeed;
}

/**
 * A row's reasons as report provenance. The seed is rebuilt, so nothing else on
 * it is copied; a draft's title comes only from `draftTitle`, the title on screen.
 */
export function foundByOf(
  reasons: readonly Reason[],
  seed: Seed,
  draftTitle?: string,
): readonly FoundBy[] {
  const title = draftTitle?.trim().slice(0, MAX_DRAFT_TITLE).trimEnd();
  const found: FoundSeed =
    seed.kind === "draft"
      ? { kind: "draft", id: seed.id, ...(title && { title }) }
      : seed.kind === "record"
        ? {
            kind: "record",
            sourceId: seed.sourceId,
            identifier: seed.identifier,
          }
        : { kind: seed.kind };
  return reasons.map((reason) => ({
    sourceId: reason.sourceId,
    terms: reason.terms,
    ...(reason.collection && { collection: reason.collection }),
    ...(reason.name && { name: true as const }),
    ...(reason.match && { match: reason.match }),
    seed: found,
  }));
}

export interface Cited {
  citation: DemoCitation;
  policy: DemoPolicyResponse | null;
  note: string;
  /** The same document as listed by other sources. */
  alternates: readonly DemoCitation[];
  /** How it was found. Memory only: never saved, so absent after a restore. */
  foundBy?: readonly FoundBy[];
}
export interface ReportState {
  cited: Record<string, Cited>;
  marks: Record<string, Record<string, Mark>>;
  actors: DataActors;
}
export interface RestoredReport {
  report: ReportState;
  notice: string;
}
export const emptyReport = (): ReportState => ({
  cited: {},
  marks: {},
  actors: emptyActors(),
});

/** Find the saved snapshot without replacing it when another listing becomes primary. */
export function findCitedKey(
  report: ReportState,
  citation: DemoCitation,
  alternates: readonly DemoCitation[] = [],
): string | undefined {
  const listings = new Set([citation, ...alternates].map(keyOf));
  for (const listing of listings)
    if (Object.hasOwn(report.cited, listing)) return listing;
  const entries = Object.entries(report.cited);
  const exact = entries.find(([, entry]) =>
    entry.alternates.some((alternate) => listings.has(keyOf(alternate))),
  );
  if (exact) return exact[0];
  if (citation.matchKey === null) return undefined;
  return entries.find(
    ([, entry]) => entry.citation.matchKey === citation.matchKey,
  )?.[0];
}

/** Keep only saved alternates that are valid, distinct other listings of the cited document. */
function restoreAlternates(
  value: unknown,
  citation: DemoCitation,
): { alternates: DemoCitation[]; damaged: boolean } {
  const alternates: DemoCitation[] = [];
  if (!Array.isArray(value)) return { alternates, damaged: true };
  let damaged = value.length > MAX_ALTERNATES;
  const listings = new Set([keyOf(citation)]);
  for (const item of value.slice(0, MAX_ALTERNATES)) {
    try {
      const alternate = citationValue(item);
      if (
        citation.matchKey === null ||
        alternate.matchKey !== citation.matchKey ||
        listings.has(keyOf(alternate))
      )
        throw new Error("Saved alternate is not the cited document");
      listings.add(keyOf(alternate));
      alternates.push(alternate);
    } catch {
      damaged = true;
    }
  }
  return { alternates, damaged };
}

/** Restore only bounded, internally consistent snapshots. Valid entries survive partial damage. */
export function restoreReport(raw: string | null): RestoredReport {
  const report = emptyReport();
  if (raw === null) return { report, notice: "" };
  let recovered = false;
  try {
    if (raw.length > MAX_SAVED_CHARACTERS)
      throw new Error("Saved report is too large");
    const saved = object(JSON.parse(raw));
    if (
      saved.version !== undefined &&
      saved.version !== 2 &&
      saved.version !== 3
    )
      throw new Error("Unknown saved version");
    // Data actors and alternates were first saved by version 3.
    const current = saved.version === 3;
    if (current) {
      try {
        const actors = object(saved.actors);
        const restored = emptyActors();
        for (const field of ACTOR_FIELDS)
          restored[field] = text(actors[field], MAX_ACTOR_TEXT, true);
        report.actors = restored;
      } catch {
        recovered = true;
      }
    }
    const cited = object(saved.cited);
    let marks: Record<string, unknown> = {};
    try {
      marks = object(saved.marks);
    } catch {
      recovered = true;
    }
    const entries = Object.entries(cited);
    if (entries.length > MAX_CITATIONS) recovered = true;
    for (const [key, value] of entries.slice(0, MAX_CITATIONS)) {
      try {
        const entry = object(value);
        const citation = citationValue(entry.citation);
        if (key !== keyOf(citation))
          throw new Error("Saved citation identity changed");
        const note = text(entry.note, MAX_NOTE, true);
        let policy: DemoPolicyResponse | null = null;
        if (entry.policy !== null) {
          try {
            policy = policyValue(entry.policy);
            if (JSON.stringify(policy.citation) !== JSON.stringify(citation))
              throw new Error("Saved evidence does not match citation");
          } catch {
            policy = null;
            recovered = true;
          }
        }
        let alternates: DemoCitation[] = [];
        if (current) {
          const result = restoreAlternates(entry.alternates, citation);
          alternates = result.alternates;
          if (result.damaged) recovered = true;
        }
        report.cited[key] = { citation, policy, note, alternates };
        if (marks[key] !== undefined) {
          try {
            const savedMarks = object(marks[key]);
            const issues = new Set(
              policy?.issues.map((issue) => issue.id) ?? [],
            );
            for (const [id, item] of Object.entries(savedMarks)) {
              try {
                if (!issues.has(id))
                  throw new Error("Saved mark has no matching evidence");
                const mark = object(item);
                if (typeof mark.on !== "boolean")
                  throw new Error("Invalid saved selection");
                (report.marks[key] ??= {})[id] = {
                  on: mark.on,
                  note: text(mark.note, MAX_NOTE, true),
                };
              } catch {
                recovered = true;
              }
            }
          } catch {
            recovered = true;
          }
        }
      } catch {
        recovered = true;
      }
    }
    if (Object.keys(marks).some((key) => !Object.hasOwn(report.cited, key)))
      recovered = true;
    return { report, notice: recovered ? COPY.restorePartial : "" };
  } catch {
    return { report, notice: COPY.restoreFailed };
  }
}

/**
 * Kept in memory only. foundBy holds search terms and draft IDs; the rest are
 * the search contract v2 citation fields, which nothing reads back after a
 * citation is saved. No other saved field has these names.
 */
const MEMORY_ONLY = new Set([
  "foundBy",
  "commentsCloseOn",
  "commentsCloseWithheld",
  "docketIds",
  "rins",
  "cfrRefs",
  "topics",
]);

export function serializeReport(report: ReportState): string {
  const result = JSON.stringify({ version: 3, ...report }, (key, value) =>
    MEMORY_ONLY.has(key) ? undefined : (value as unknown),
  );
  if (result.length > MAX_SAVED_CHARACTERS)
    throw new Error("Saved report is too large");
  return result;
}

export function removeFromReport(
  report: ReportState,
  key: string,
): ReportState {
  const cited = { ...report.cited };
  const marks = { ...report.marks };
  delete cited[key];
  delete marks[key];
  return { ...report, cited, marks };
}

/** A retrieved snapshot can fill an unread entry, but never replace its evidence or notes. */
export function attachPolicy(
  report: ReportState,
  key: string,
  policy: DemoPolicyResponse,
): ReportState {
  const current = report.cited[key];
  if (
    !current ||
    current.policy ||
    current.citation.sourceId !== policy.citation.sourceId ||
    policyId(current.citation) !== policyId(policy.citation)
  )
    return report;
  // Preserve the saved display key while binding retrieved evidence by document ID.
  // The saved match key stays too: the entry's alternates were matched on it.
  const citation = {
    ...policy.citation,
    identifier: current.citation.identifier,
    matchKey: current.citation.matchKey,
  };
  return {
    ...report,
    cited: {
      ...report.cited,
      [key]: { ...current, citation, policy: { ...policy, citation } },
    },
  };
}

export function reportEntries(report: ReportState) {
  return Object.entries(report.cited).map(([key, entry]) => ({
    citation: entry.citation,
    receipt: entry.policy?.receipt ?? null,
    engine: entry.policy?.engine ?? null,
    note: entry.note,
    alternates: entry.alternates,
    foundBy: entry.foundBy,
    issues: (entry.policy?.issues ?? [])
      .filter((issue) => report.marks[key]?.[issue.id]?.on)
      .map((issue) => ({
        issue,
        note: report.marks[key]?.[issue.id]?.note ?? "",
      })),
  }));
}
