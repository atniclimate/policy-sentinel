/**
 * D-068 personal-pattern guard (design rule 7, index conditions G1).
 *
 * A finite guard against personal-shaped text: emails, phone numbers and
 * extensions, a title or contact heading before a name, and postal blocks.
 * It is not a proof: a value that passes is not thereby agency-level or
 * approved; that still needs the cited provenance and a source review.
 *
 * No imports beyond the language, so the page bundle does not pull in
 * pipeline or engine code and Node scripts can load it directly.
 */

export type PersonalPatternKind =
  "email" | "phone" | "person_title" | "postal_block";

export interface PersonalPatternHit {
  kind: PersonalPatternKind;
  start: number;
  end: number;
}

// EMAIL copied from src/pipeline/policy-text.mjs line 56.
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi;

// PHONE from src/pipeline/policy-text.mjs line 57, with the "direct", "cell"
// and "mobile" labels of PERSONAL_CONTACT_SHAPE_TOKENS
// (src/engine/citation-export-contracts.ts line 97) added to the labeled form.
const PHONE =
  /(?:\+?1[ .-]?)?(?:\(\d{3}\)[ .-]?|\b\d{3}[ .-])\d{3}[ .-]\d{4}\b|\b(?:phone|telephone|tel|fax|direct(?: line)?|cell|mobile)\s*:\s*\+?\d[\d .()/-]{6,}\d/gi;

// Extensions: the "ext.", "extension" and "x1".."x9" tokens of
// PERSONAL_CONTACT_SHAPE_TOKENS, followed by digits.
const EXTENSION = /\bext(?:ension)?\.?\s*#?\s*\d{1,6}\b|\bx\d{2,6}\b/gi;

// The "mr.", "ms.", "mrs", "mx.", "dr." tokens of PERSONAL_CONTACT_SHAPE_TOKENS,
// plus "Hon.", before a capitalized name. "Dr" and "Hon" need the period so a
// street "Dr" or a word such as "Honor" does not count.
const TITLE_NAME = /\b(?:(?:Mrs|Mr|Ms|Mx)\.?|(?:Dr|Hon)\.)\s+[A-Z][a-z'’-]+/g;

// Contact headings: CONTACT from src/pipeline/policy-text.mjs line 54, and the
// "attn", "c/o", "care of", "director:", "officer:", "manager:" tokens of
// PERSONAL_CONTACT_SHAPE_TOKENS. A name must follow (checked below).
const CONTACT_LEAD =
  /\bfor\s+(?:[a-z]+\s+)?information,?\s+contact\b\s*:?\s*|\b(?:contact(?:\s+(?:information|person))?|staff\s+contact|personal\s+contact|attn|attention|director|officer|manager)\s*:\s*|\b(?:c\/o|care\s+of)\s+/gi;
// Two capitalized words, with an optional middle initial.
const NAME_AFTER_LEAD = /^[A-Z][a-z'’-]+(?:\s+[A-Z]\.)?\s+[A-Z][a-z'’-]+/;

const STREET_WORD =
  "(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy|Parkway|Pkwy|Circle|Cir|Terrace|Ter|Loop|Trail|Trl|Square|Sq)";
const UNIT =
  "(?:[NSEW]{1,2}|(?:Suite|Ste\\.?|Apt\\.?|Unit|Room|Rm\\.?|#)\\s*[A-Za-z0-9-]+)";
const CITY = "[A-Z][A-Za-z.'-]*(?:\\s+[A-Z][A-Za-z.'-]*){0,3}";
// A postal code or a capitalized state name, then a ZIP or ZIP+4.
const STATE_ZIP =
  "(?:[A-Z]{2}|[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+\\d{5}(?:-\\d{4})?\\b";
const POSTAL_BLOCK = new RegExp(
  [
    `\\b\\d{1,6}\\s+(?:[A-Z0-9][A-Za-z0-9.'-]*\\s+){0,4}${STREET_WORD}\\b\\.?(?:[ ,]+${UNIT})*,?\\s+${CITY},?\\s+${STATE_ZIP}`,
    `\\bP\\.?\\s?O\\.?\\s+Box\\s+\\d+,?\\s+${CITY},?\\s+${STATE_ZIP}`,
  ].join("|"),
  "g",
);

function collect(
  text: string,
  pattern: RegExp,
  kind: PersonalPatternKind,
  hits: PersonalPatternHit[],
): void {
  for (const m of text.matchAll(pattern)) {
    hits.push({ kind, start: m.index, end: m.index + m[0].length });
  }
}

export function personalPatternHits(
  text: string,
): readonly PersonalPatternHit[] {
  const hits: PersonalPatternHit[] = [];
  collect(text, EMAIL, "email", hits);
  collect(text, PHONE, "phone", hits);
  collect(text, EXTENSION, "phone", hits);
  collect(text, TITLE_NAME, "person_title", hits);
  for (const m of text.matchAll(CONTACT_LEAD)) {
    const after = m.index + m[0].length;
    const name = NAME_AFTER_LEAD.exec(text.slice(after));
    if (name) {
      hits.push({
        kind: "person_title",
        start: m.index,
        end: after + name[0].length,
      });
    }
  }
  collect(text, POSTAL_BLOCK, "postal_block", hits);
  return hits.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function hasPersonalPattern(text: string): boolean {
  return personalPatternHits(text).length > 0;
}
