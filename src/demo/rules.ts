import type { DemoIssue, IssueType, PolicyMeta, TextBlock } from "./types";

/**
 * Automated demo rules. These are deterministic pattern checks over text the
 * Policy Sentinel extractor has already read. They are not Sentinel's curated
 * findings (those are human-reviewed research coding with counterevidence).
 * Passage issues quote source words with whitespace collapsed. Absence is a
 * rule assessment, never a source quotation. Both carry limits and a next check.
 */
export const DEMO_RULES_VERSION = "demo-rules-1.1.0";

const MAX_QUOTE = 420;
const MAX_PER_TYPE = 6;

interface Sentence {
  readonly text: string;
  readonly searchable: string;
  readonly removed: readonly { at: number; count: number }[];
  readonly locator: string;
}

const COPY: Record<
  IssueType,
  { label: string; rule: string; limits: string; check: string }
> = {
  consultation_language: {
    label: "Consultation wording",
    rule: "The sentence contains consult, consultation, government-to-government, Tribal implications, Executive Order 13175, coordination or engagement with Tribes, or that order's standard wording (substantial direct effects or compliance costs on Tribes, preempting Tribal law). Consulting firms and companies are left out.",
    limits:
      "Wording only. It does not show that consultation happened, that it was adequate, or that any right attaches to it.",
    check:
      "Read the surrounding section at the official source, then look for the agency's own consultation record.",
  },
  consultation_absent: {
    label: "No consultation wording found",
    rule: "The extracted text of a rule or proposed rule has no sentence that matches the consultation wording check.",
    limits:
      "Absence in this extract is not absence in the record. The agency may address consultation in a separate document, and the extract may omit parts of the text.",
    check:
      "Open the official source and search the full document and its docket before drawing any conclusion.",
  },
  tribal_reference: {
    label: "Tribal wording",
    rule: "The sentence contains Indian Tribe, Indian Tribal, Tribal, Tribe, or Tribes.",
    limits:
      "This marks where the text uses the word. It says nothing about effect on any particular Nation, and it does not establish that a Nation is named.",
    check:
      "Read the full provision, and ask the Nation concerned how the provision applies to it.",
  },
  date_or_deadline: {
    label: "Date or deadline",
    rule: "The sentence contains a calendar date with words such as effective, comments, due, compliance, must be received, or no later than within 80 characters of it. Dates that only cite a commenter's letter or a Federal Register page are left out.",
    limits:
      "Dates are read from the text as written. Extensions, corrections and later notices can change them.",
    check:
      "Check the agency's page for the document and for any later correction or extension.",
  },
  cross_reference: {
    label: "Cross-reference",
    rule: "The sentence cites a Code of Federal Regulations part or section, a U.S. Code section, an Executive Order, or a Public Law.",
    limits:
      "The citation is listed as written. The cited provision is not retrieved or checked here, and it may have changed.",
    check:
      "Follow the citation to the current official text of the cited provision.",
  },
  status_signal: {
    label: "Status signal",
    rule: "The sentence contains words such as proposed, final, withdrawn, rescind, extension of comment period, correction, or supersede.",
    limits:
      "The words come from the document itself. They do not give the current legal status of the policy.",
    check: "Check the official source for the document's current status.",
  },
};

// Precision and recall measured against Jev judgments on 45 Federal Register
// rules (scripts/dev-ai/audit-rules.mjs, 2026-10-23); Jev never runs here.
const CONSULT =
  /\bconsult(?:ation|ations|ed|ing|s)?\b|government-to-government|\btribal implications\b|\b(?:E\.?O\.?|Executive Order)\s*13175\b|\bcoordinat(?:e|es|ed|ing|ion)\s+with\s+(?:[\w-]+\s+){0,3}?(?:Indian\s+)?(?:Tribes?|Tribal)\b|\bTribal\s+(?:coordination|engagement|review process)\b|\bpreempts?\s+tribal\s+law\b|\bsubstantial direct (?:compliance costs|effects?) on (?:[\w-]+\s+){0,3}?(?:Indian\s+)?(?:Tribes?|Tribal governments?)\b/gi;
const CONSULTING_BUSINESS =
  /^consulting\s+(?:firms?|compan(?:y|ies)|services|group|engineers?|fees?)\b/i;
const TRIBAL = /\b(?:Indian\s+Tribal?|Indian\s+Tribes?|Tribal|Tribes?)\b/i;
const MONTH =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const DATE_G = new RegExp(`\\b${MONTH}\\s+\\d{1,2},\\s+\\d{4}\\b`, "g");
const DEADLINE_G =
  /\b(?:effective|comments?|due|compliance|must be received|no later than|on or before|deadline|applicab(?:le|ility)|take effect)\b/gi;
const NEAR = 80;

/** First consultation match that is not a consulting business or a name. */
function consultAt(text: string): number {
  for (const match of text.matchAll(CONSULT)) {
    if (CONSULTING_BUSINESS.test(text.slice(match.index))) continue;
    if (match[0] === "Consulting" && match.index > 0) continue;
    return match.index;
  }
  return -1;
}

/** First date with a deadline word near it, skipping citation-only dates. */
function deadlineAt(text: string): number {
  for (const date of text.matchAll(DATE_G)) {
    const end = date.index + date[0].length;
    // "BLUE January 23, 2026 Comments at 4" and "91 FR 37840 (June 24, 2026)".
    if (/^\s+(?:Comments?|Letter)\b/i.test(text.slice(end, end + 12))) continue;
    if (
      /\bFR\s+\d+,?\s*\(?$/.test(
        text.slice(Math.max(0, date.index - 30), date.index),
      )
    )
      continue;
    const from = Math.max(0, date.index - NEAR);
    const window = text.slice(from, end + NEAR);
    for (const word of window.matchAll(DEADLINE_G)) {
      const after = from + word.index + word[0].length;
      if (!/^\s+at\b/.test(text.slice(after, after + 4))) return date.index;
    }
  }
  return -1;
}
const XREF = new RegExp(
  [
    String.raw`\b\d{1,2}\s+CFR\s+(?:parts?\s+|§+\s*)?\d+(?:\.\d+)?`,
    String.raw`\b\d{1,2}\s+U\.?S\.?C\.?\s+(?:§+\s*)?\d+[a-z]?(?:-\d+)?`,
    String.raw`\bExecutive\s+Order\s+\d{4,5}\b`,
    String.raw`\bPub(?:lic)?\.?\s+L(?:aw|\.)\s*(?:No\.\s*)?\d{2,3}-\d+`,
  ].join("|"),
  "gi",
);
const STATUS =
  /\b(?:proposed rule|notice of proposed rulemaking|final rule|interim final|withdraw(?:n|al)|rescind(?:s|ed)?|rescission|extension of (?:the )?comment period|reopening of (?:the )?comment period|correction|corrections|supersede[sd]?|repeal(?:s|ed)?)\b/i;

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Split blocks into sentences, keeping the block locator for each. */
export function splitSentences(blocks: readonly TextBlock[]): Sentence[] {
  const out: Sentence[] = [];
  for (const block of blocks) {
    const flat = block.text;
    const parts = flat.split(
      /(?<!\bU\.S\.C\.)(?<!\bE\.O\.)(?<!\bPub\.)(?<!\bL\.)(?<!\bNo\.)(?<=[.;:?!])\s+(?=[A-Z(["“§\d])/,
    );
    for (const part of parts) {
      const text = normalizeSpace(part);
      // Short and lowercase blocks still carry evidence. Display limits must
      // never determine whether wording exists in the extracted text.
      if (!text) continue;
      const removed: { at: number; count: number }[] = [];
      let omitted = 0;
      const searchable = text.replace(
        /(?<=\p{L})-\s+(?=\p{L})/gu,
        (layout: string, offset: number) => {
          removed.push({ at: offset - omitted, count: layout.length });
          omitted += layout.length;
          return "";
        },
      );
      out.push({
        text,
        searchable,
        removed,
        locator: block.locator,
      });
    }
  }
  return out;
}

function sourceOffset(sentence: Sentence, at: number): number {
  return (
    at +
    sentence.removed.reduce(
      (sum, span) => sum + (span.at <= at ? span.count : 0),
      0,
    )
  );
}

/** A contiguous source window around the match, without invented punctuation. */
function excerpt(text: string, at: number): string {
  if (text.length <= MAX_QUOTE) return text;
  let start = Math.max(0, at - 100);
  const boundary = text.indexOf(" ", start);
  if (start > 0 && boundary >= start && boundary < at) start = boundary + 1;
  let end = Math.min(text.length, start + MAX_QUOTE);
  const lastSpace = text.lastIndexOf(" ", end);
  if (end < text.length && lastSpace > at) end = lastSpace;
  // Do not split a Unicode surrogate pair at a display boundary.
  if (/[\uDC00-\uDFFF]/u.test(text[start] ?? "")) start += 1;
  if (/[\uD800-\uDBFF]/u.test(text[end - 1] ?? "")) end -= 1;
  return text.slice(start, end).trim();
}

function make(
  type: IssueType,
  index: number,
  quote: string,
  locator: string,
): DemoIssue {
  const copy = COPY[type];
  return {
    id: `${type}-${index + 1}`,
    type,
    label: copy.label,
    quote,
    locator,
    rule: copy.rule,
    limits: copy.limits,
    check: copy.check,
  };
}

export function identifyIssues(
  blocks: readonly TextBlock[],
  meta: PolicyMeta,
): DemoIssue[] {
  const sentences = splitSentences(blocks);
  const issues: DemoIssue[] = [];

  const take = (type: IssueType, match: (text: string) => number): number => {
    let count = 0;
    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (count >= MAX_PER_TYPE) break;
      const at = match(sentence.searchable);
      if (at < 0 || seen.has(sentence.text)) continue;
      seen.add(sentence.text);
      issues.push(
        make(
          type,
          count,
          excerpt(sentence.text, sourceOffset(sentence, at)),
          sentence.locator,
        ),
      );
      count += 1;
    }
    return count;
  };

  const consult = take("consultation_language", consultAt);
  if (
    consult === 0 &&
    /\b(?:rule|proposed rule)\b/i.test(meta.kind) &&
    sentences.length > 0
  ) {
    issues.push(
      make(
        "consultation_absent",
        0,
        `No sentence in the extracted text of this ${meta.kind.toLowerCase()} matched the consultation wording check.`,
        "whole text",
      ),
    );
  }
  take("tribal_reference", (text) => text.search(TRIBAL));
  take("date_or_deadline", deadlineAt);
  take("status_signal", (text) => text.search(STATUS));

  // Cross-references: one issue per distinct citation, quoted in its sentence.
  const citations = new Set<string>();
  let xrefCount = 0;
  for (const sentence of sentences) {
    if (xrefCount >= MAX_PER_TYPE) break;
    const found = [...sentence.searchable.matchAll(XREF)];
    for (const match of found) {
      const key = normalizeSpace(match[0]).toLowerCase();
      if (citations.has(key)) continue;
      if (xrefCount >= MAX_PER_TYPE) break;
      citations.add(key);
      issues.push(
        make(
          "cross_reference",
          xrefCount,
          excerpt(sentence.text, sourceOffset(sentence, match.index)),
          sentence.locator,
        ),
      );
      xrefCount += 1;
    }
  }

  return issues;
}
