import type { DemoIssue, IssueType, PolicyMeta, TextBlock } from "./types";

/**
 * Automated demo rules. These are deterministic pattern checks over text the
 * Policy Sentinel extractor has already read. They are not Sentinel's curated
 * findings (those are human-reviewed research coding with counterevidence).
 * Every issue quotes the exact words, names its rule, and says what it cannot
 * show.
 */
export const DEMO_RULES_VERSION = "demo-rules-1.0.0";

const MAX_QUOTE = 420;
const MAX_PER_TYPE = 6;

interface Sentence {
  readonly text: string;
  readonly locator: string;
}

const COPY: Record<
  IssueType,
  { label: string; rule: string; limits: string; check: string }
> = {
  consultation_language: {
    label: "Consultation wording",
    rule: "The sentence contains consult, consultation, government-to-government, Tribal implications, or Executive Order 13175.",
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
    rule: "The sentence contains a calendar date together with words such as effective, comments, due, compliance, must be received, or no later than.",
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

const CONSULT =
  /\bconsult(?:ation|ations|ed|ing|s)?\b|government-to-government|\btribal implications\b|\b(?:E\.?O\.?|Executive Order)\s*13175\b/i;
const TRIBAL = /\b(?:Indian\s+Tribal?|Indian\s+Tribes?|Tribal|Tribes?)\b/;
const MONTH =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const DATE_RE = new RegExp(`\\b${MONTH}\\s+\\d{1,2},\\s+\\d{4}\\b`);
const DEADLINE_WORDS =
  /\b(?:effective|comments?|due|compliance|must be received|no later than|on or before|deadline|applicab(?:le|ility)|take effect)\b/i;
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
    // Hard line breaks in preformatted source text are layout, not sentence ends.
    const flat = block.text
      .replace(/-\n(?=[a-z])/g, "")
      .replace(/[-=_]{8,}/g, " ");
    const parts = flat.split(/(?<=[.;:?!])\s+(?=[A-Z(["“§\d])/);
    for (const part of parts) {
      const text = normalizeSpace(part);
      // A fragment that starts in lower case is the tail of a split line, not a sentence.
      if (text.length < 20 || /^[a-z]/.test(text)) continue;
      out.push({
        text:
          text.length > MAX_QUOTE ? `${text.slice(0, MAX_QUOTE - 1)}…` : text,
        locator: block.locator,
      });
    }
  }
  return out;
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

  const take = (type: IssueType, test: (s: Sentence) => boolean): number => {
    let count = 0;
    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (count >= MAX_PER_TYPE) break;
      if (!test(sentence) || seen.has(sentence.text)) continue;
      seen.add(sentence.text);
      issues.push(make(type, count, sentence.text, sentence.locator));
      count += 1;
    }
    return count;
  };

  const consult = take("consultation_language", (s) => CONSULT.test(s.text));
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
  take("tribal_reference", (s) => TRIBAL.test(s.text));
  take(
    "date_or_deadline",
    (s) => DATE_RE.test(s.text) && DEADLINE_WORDS.test(s.text),
  );
  take("status_signal", (s) => STATUS.test(s.text));

  // Cross-references: one issue per distinct citation, quoted in its sentence.
  const citations = new Set<string>();
  let xrefCount = 0;
  for (const sentence of sentences) {
    if (xrefCount >= MAX_PER_TYPE) break;
    const found = [...sentence.text.matchAll(XREF)].map((m) =>
      normalizeSpace(m[0]).toLowerCase(),
    );
    const fresh = found.filter((c) => !citations.has(c));
    if (fresh.length === 0) continue;
    fresh.forEach((c) => citations.add(c));
    issues.push(
      make("cross_reference", xrefCount, sentence.text, sentence.locator),
    );
    xrefCount += 1;
  }

  return issues;
}
