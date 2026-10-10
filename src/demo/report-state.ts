import { COPY } from "./copy";
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
const MAX_ALTERNATES = 3;

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
export interface Cited {
  citation: DemoCitation;
  policy: DemoPolicyResponse | null;
  note: string;
  /** The same document as listed by other sources. */
  alternates: readonly DemoCitation[];
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

/** Keep only saved alternates that are valid listings of the cited document by another source. */
function restoreAlternates(
  value: unknown,
  citation: DemoCitation,
): { alternates: DemoCitation[]; damaged: boolean } {
  const alternates: DemoCitation[] = [];
  if (!Array.isArray(value)) return { alternates, damaged: true };
  let damaged = value.length > MAX_ALTERNATES;
  const sources = new Set([citation.sourceId]);
  for (const item of value.slice(0, MAX_ALTERNATES)) {
    try {
      const alternate = citationValue(item);
      if (
        citation.matchKey === null ||
        alternate.matchKey !== citation.matchKey ||
        sources.has(alternate.sourceId)
      )
        throw new Error("Saved alternate is not the cited document");
      sources.add(alternate.sourceId);
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

export function serializeReport(report: ReportState): string {
  const result = JSON.stringify({ version: 3, ...report });
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
    issues: (entry.policy?.issues ?? [])
      .filter((issue) => report.marks[key]?.[issue.id]?.on)
      .map((issue) => ({
        issue,
        note: report.marks[key]?.[issue.id]?.note ?? "",
      })),
  }));
}
