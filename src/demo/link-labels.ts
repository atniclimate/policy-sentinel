/**
 * The closed label table for Cited and linked records (design section 1
 * rule 2). Every link kind has a forward and a reverse label, worded with the
 * source's own heading where it has one. citation_in_text has no reverse
 * listing in 0.9: that would be a citation graph the demo builds itself.
 *
 * `subject` is the other record as the page prints it ("25 CFR part 900",
 * "RIN 1076-AF81", a locator). No label names a relation the source does not
 * state. Erasable TypeScript, so Node scripts can load it without a build.
 */
import { SHORT_FORM_NOTE } from "./cite-patterns.ts";

type Label = (subject: string) => string;

export interface LabelEntry {
  readonly forward: Label;
  /** null: no reverse listing for this kind. */
  readonly reverse: Label | null;
}

export const LINK_LABELS = Object.freeze({
  // Federal Register document fields (source_field).
  fr_cfr_refs: {
    forward: () => "CFR parts this document names",
    reverse: () => "Federal Register documents that name this CFR part",
  },
  correction_of: {
    forward: (id) =>
      `The Federal Register lists this document as a correction of FR Doc. ${id}`,
    reverse: (id) =>
      `The Federal Register lists FR Doc. ${id} as a correction of this document`,
  },
  // Federal Register full-text AUTH element (source_text_parsed).
  fr_authority_line: {
    forward: () => "Named in the 'Authority:' line of this document",
    reverse: () =>
      "Federal Register documents whose 'Authority:' line names this",
  },
  // Shared official identifiers (identifier_match); symmetric by nature.
  shares_rin: {
    forward: (rin) => `Shares RIN ${rin}`,
    reverse: (rin) => `Shares RIN ${rin}`,
  },
  shares_docket: {
    forward: (docket) => `Shares docket ${docket}`,
    reverse: (docket) => `Shares docket ${docket}`,
  },
  // CFR annual edition, part level (source_text_parsed).
  cfr_authority: {
    forward: (part) => `Named in the part-level 'Authority:' line of ${part}`,
    reverse: () => "CFR parts whose part-level 'Authority:' line names this",
  },
  cfr_source: {
    forward: (part) => `Named in the 'Source:' line of ${part}`,
    reverse: () => "CFR parts whose 'Source:' line names this",
  },
  // OLRC USLM (source_field).
  usc_source_credit: {
    forward: () => "Source credit stated by the U.S. Code",
    reverse: () => "U.S. Code sections whose source credit names this",
  },
  usc_reclassified: {
    forward: (target) =>
      `OLRC notes this section was editorially reclassified as ${target}`,
    reverse: (from) =>
      `OLRC notes ${from} was editorially reclassified as this section`,
  },
  // Run-time parse of text the page already reads (citation_in_text).
  citation_in_text: {
    forward: (locator) => `Citation found at ${locator}`,
    reverse: null,
  },
  short_form: {
    forward: (locator) => `Citation found at ${locator}`,
    reverse: null,
  },
  // Families that expand on a press (GovInfo states the relation name itself).
  govinfo_related: {
    forward: () => "Related records stated by GovInfo",
    reverse: () => "Related records stated by GovInfo",
  },
  congress_related_bills: {
    forward: () => "Related bills stated by Congress.gov",
    reverse: () => "Related bills stated by Congress.gov",
  },
  // Notices shown in place of a link.
  fr_no_authority_line: {
    forward: () => "No authority line in this document",
    reverse: null,
  },
  cfr_no_authority_line: {
    forward: () => "No part-level 'Authority:' line in this part",
    reverse: null,
  },
  cases_citing: {
    forward: () => "Cases that cite this section",
    reverse: null,
  },
} satisfies Record<string, LabelEntry>);

export type LabelId = keyof typeof LINK_LABELS;

/** Notices a row carries instead of a live link. */
export const LINK_NOTICES = Object.freeze({
  notLive: "Not available from a live source",
  notOfficial: "Not available from an official source",
  shortForm: SHORT_FORM_NOTE,
  noneParsed: "No full citation found in this line",
  /** Condition G3: the acquisition left official wording out of the file. */
  omitted: "Wording omitted; read it at the source",
} as const);

export function linkLabel(
  id: LabelId,
  direction: "forward" | "reverse",
  subject = "",
): string {
  const entry: LabelEntry = LINK_LABELS[id];
  const label = direction === "forward" ? entry.forward : entry.reverse;
  if (!label) throw new Error(`No reverse label for ${id}`);
  return label(subject);
}
