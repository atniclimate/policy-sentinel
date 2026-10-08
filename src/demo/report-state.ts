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

export interface Mark {
  on: boolean;
  note: string;
}
export interface Cited {
  citation: DemoCitation;
  policy: DemoPolicyResponse | null;
  note: string;
}
export interface ReportState {
  cited: Record<string, Cited>;
  marks: Record<string, Record<string, Mark>>;
}
export interface RestoredReport {
  report: ReportState;
  notice: string;
}
export const emptyReport = (): ReportState => ({ cited: {}, marks: {} });

/** Restore only bounded, internally consistent snapshots. Valid entries survive partial damage. */
export function restoreReport(raw: string | null): RestoredReport {
  const report = emptyReport();
  if (raw === null) return { report, notice: "" };
  let recovered = false;
  try {
    if (raw.length > MAX_SAVED_CHARACTERS)
      throw new Error("Saved report is too large");
    const saved = object(JSON.parse(raw));
    if (saved.version !== undefined && saved.version !== 2)
      throw new Error("Unknown saved version");
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
        report.cited[key] = { citation, policy, note };
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
    return {
      report,
      notice: recovered
        ? "Some saved citations or passage selections could not be restored. Valid citations and notes were kept; check your list before exporting."
        : "",
    };
  } catch {
    return {
      report,
      notice:
        "The saved citation list could not be restored. This session starts with an empty list.",
    };
  }
}

export function serializeReport(report: ReportState): string {
  const result = JSON.stringify({ version: 2, ...report });
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
  return { cited, marks };
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
  const citation = {
    ...policy.citation,
    identifier: current.citation.identifier,
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
    issues: (entry.policy?.issues ?? [])
      .filter((issue) => report.marks[key]?.[issue.id]?.on)
      .map((issue) => ({
        issue,
        note: report.marks[key]?.[issue.id]?.note ?? "",
      })),
  }));
}
