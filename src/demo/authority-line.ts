/**
 * The Federal Register's printed "Authority:" line (design T1.3), read from
 * text blocks the Worker already extracted. Pure: the wording after the
 * official heading at the start of a block, verbatim with its white space
 * collapsed. Several lines are kept in source order, joined by "; ", and an
 * exact repeat is kept once. A line the personal-pattern guard stops is left
 * out. Present false means no block starts with the heading, which the page
 * words as "No authority line in this document", never as "no authority".
 */
import { hasPersonalPattern } from "./personal-guard.ts";
import type { TextBlock } from "./types";

/** The validator's bound for authorityLine (src/demo/validation.ts). */
export const AUTHORITY_LINE_MAX = 2000;

const HEADING = /^\s*Authority:\s*/;

export interface AuthorityLineFields {
  readonly authorityLine?: string;
  readonly authorityLinePresent: boolean;
}

export function authorityLine(
  blocks: readonly TextBlock[],
): AuthorityLineFields {
  const lines: string[] = [];
  let present = false;
  for (const block of blocks) {
    const heading = HEADING.exec(block.text);
    if (!heading) continue;
    const wording = block.text
      .slice(heading[0].length)
      .replace(/\s+/g, " ")
      .trim();
    if (!wording) continue;
    present = true;
    if (!hasPersonalPattern(wording) && !lines.includes(wording))
      lines.push(wording);
  }
  // Whole lines only, up to the bound; a single longer line is cut at it.
  let joined = "";
  for (const line of lines) {
    const next = joined ? `${joined}; ${line}` : line;
    if (next.length > AUTHORITY_LINE_MAX) break;
    joined = next;
  }
  if (!joined && lines.length)
    joined = lines[0].slice(0, AUTHORITY_LINE_MAX).trim();
  return joined
    ? { authorityLine: joined, authorityLinePresent: true }
    : { authorityLinePresent: present };
}
