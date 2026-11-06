/**
 * Citation pattern table (design rule 3). One versioned table shared by the
 * build-time acquisition (scripts/acquire-demo-index.mjs) and the run-time
 * citation_in_text module.
 *
 * Only a full citation is parsed as a citation. Short forms are returned as
 * `short_form` with the note "short form, not resolved" and are never linked
 * to an earlier citation. "et seq." keeps the starting section and is never
 * expanded. Ranges are kept as written. Callers add the basis and build any
 * link target; this module returns neither.
 *
 * Erasable TypeScript with no imports, so Node can load it without a build.
 */

export const PATTERN_SET_VERSION = "1.0.0";

export type PatternId =
  | "usc-section"
  | "cfr-part-section"
  | "pl-number"
  | "stat-page"
  | "fr-page"
  | "us-reports-page"
  | "rcw-section"
  | "ors-section"
  | "idaho-code-section"
  | "short-form"
  | "uslm-pl-href"
  | "uslm-stat-href"
  | "uslm-act-href"
  | "uslm-usc-href";

export interface PatternRef {
  id: PatternId;
  version: string;
}

const PATTERN_IDS: readonly PatternId[] = [
  "usc-section",
  "cfr-part-section",
  "pl-number",
  "stat-page",
  "fr-page",
  "us-reports-page",
  "rcw-section",
  "ors-section",
  "idaho-code-section",
  "short-form",
  "uslm-pl-href",
  "uslm-stat-href",
  "uslm-act-href",
  "uslm-usc-href",
];

export const PATTERNS: readonly PatternRef[] = PATTERN_IDS.map((id) => ({
  id,
  version: PATTERN_SET_VERSION,
}));

export const SHORT_FORM_NOTE = "short form, not resolved";

interface Span {
  /** The exact source text from start to end (for an href, the href). */
  text: string;
  pattern: PatternRef;
  start: number;
  end: number;
}

export interface UscCite extends Span {
  kind: "usc";
  title: number;
  section: string;
  etSeq: boolean;
}
export interface CfrCite extends Span {
  kind: "cfr";
  title: number;
  part: string;
  section: string | null;
}
export interface PlCite extends Span {
  kind: "pl";
  congress: number;
  number: number;
  section: string | null;
}
export interface StatCite extends Span {
  kind: "stat";
  volume: number;
  page: number;
  pageEnd: number | null;
}
export interface FrCite extends Span {
  kind: "fr";
  volume: number;
  page: number;
}
export interface UsReportsCite extends Span {
  kind: "us_reports";
  volume: number;
  page: number;
}
export interface StateCodeCite extends Span {
  kind: "rcw" | "ors" | "idaho_code";
  section: string;
}
export interface ActCite extends Span {
  kind: "act";
  href: string;
}
export interface ShortForm extends Span {
  kind: "short_form";
  note: typeof SHORT_FORM_NOTE;
}

export type ParsedCitation =
  | UscCite
  | CfrCite
  | PlCite
  | StatCite
  | FrCite
  | UsReportsCite
  | StateCodeCite
  | ActCite
  | ShortForm;

type Fields = ParsedCitation extends infer C
  ? C extends ParsedCitation
    ? Omit<C, keyof Span>
    : never
  : never;
type Groups = Record<string, string | undefined>;

const ref = (id: PatternId): PatternRef => ({
  id,
  version: PATTERN_SET_VERSION,
});

// Not preceded by a word character, period, slash or hyphen (keeps docket and
// phone digits out).
const LEAD = String.raw`(?<![\w./-])`;
const PAREN = String.raw`(?:\([A-Za-z0-9]+\))*`;
const SEC = String.raw`\d+[A-Za-z0-9]*(?:[-–][A-Za-z0-9]+)*${PAREN}`;
const CFR_SEC = String.raw`\d+[A-Za-z]?(?:\.\d+[A-Za-z0-9-]*)?${PAREN}`;
const RCW_SEC = String.raw`\d+[A-Z]?\.\d+[A-Z]?\.\d+[A-Za-z0-9]*${PAREN}`;
const ORS_SEC = String.raw`\d+[A-Z]?\.\d+[A-Za-z0-9]*${PAREN}`;
const IDAHO_SEC = String.raw`\d+[A-Z]?-\d+[A-Za-z0-9]*${PAREN}`;
const ET_SEQ = String.raw`\s+et\.?\s+seq\b\.?`;
const range = (s: string) => String.raw`${s}(?:\s+through\s+${s})?`;
// A list item is not the volume or title of the next full citation.
const NOT_CODE = String.raw`(?!\s*(?:U\.\s?S\.|USC\b|C\.\s?F\.\s?R\.|CFR\b|Stat\.|FR\b|Fed\.\s?Reg\.))`;
const LIST_SEP = String.raw`(?:\s*,\s*(?:and\s+)?|\s+and\s+)`;

/** Code-section patterns: a head, then one or more sections sharing it. */
interface CodeRule {
  id: PatternId;
  head: string;
  item: string;
  etSeq: boolean;
  make: (title: number, item: string, etSeq: boolean) => Fields;
}

const CODE_RULES: readonly CodeRule[] = [
  {
    id: "usc-section",
    head: String.raw`${LEAD}(?<title>\d{1,3})\s+(?:U\.\s?S\.\s?C\.|USC\b)\s*(?:§§?\s*|[Ss]ecs?\.\s*|[Ss]ections?\s+)?`,
    item: range(SEC),
    etSeq: true,
    make: (title, section, etSeq) => ({ kind: "usc", title, section, etSeq }),
  },
  {
    id: "cfr-part-section",
    head: String.raw`${LEAD}(?<title>\d{1,3})\s+(?:C\.\s?F\.\s?R\.|CFR\b)\s*(?:§§?\s*|[Pp]arts?\s+|[Pp]t\.\s*|[Ss]ections?\s+)?`,
    item: range(CFR_SEC),
    etSeq: false,
    make: (title, item) =>
      item.includes(".")
        ? {
            kind: "cfr",
            title,
            part: /^\d+[A-Za-z]?/.exec(item)?.[0] ?? item,
            section: item,
          }
        : { kind: "cfr", title, part: item, section: null },
  },
  {
    id: "rcw-section",
    head: String.raw`${LEAD}RCW\s+(?:§\s*)?`,
    item: range(RCW_SEC),
    etSeq: false,
    make: (_t, section) => ({ kind: "rcw", section }),
  },
  {
    id: "ors-section",
    head: String.raw`${LEAD}ORS\s+(?:§\s*)?`,
    item: range(ORS_SEC),
    etSeq: false,
    make: (_t, section) => ({ kind: "ors", section }),
  },
  {
    id: "idaho-code-section",
    head: String.raw`${LEAD}Idaho\s+Code\s*(?:§§?\s*|[Ss]ections?\s+)?`,
    item: range(IDAHO_SEC),
    etSeq: false,
    make: (_t, section) => ({ kind: "idaho_code", section }),
  },
];

/** Single-span patterns. */
interface SimpleRule {
  id: PatternId;
  re: RegExp;
  make: (g: Groups) => Fields;
}

const SIMPLE_RULES: readonly SimpleRule[] = [
  {
    id: "idaho-code-section",
    re: new RegExp(
      String.raw`${LEAD}[Ss]ection\s+(?<section>${IDAHO_SEC}),\s+Idaho\s+Code\b`,
      "g",
    ),
    make: (g) => ({ kind: "idaho_code", section: g.section ?? "" }),
  },
  {
    id: "pl-number",
    re: new RegExp(
      String.raw`${LEAD}(?:Pub(?:lic)?\.?\s?L(?:aw)?\.?|P\.\s?L\.)\s*(?:No\.\s*)?(?<congress>\d{1,3})\s*[-–]\s*(?<number>\d{1,4})\b(?:,\s*(?:§|[Ss]ec\.|[Ss]ection)\s*(?<section>${SEC}))?`,
      "g",
    ),
    make: (g) => ({
      kind: "pl",
      congress: Number(g.congress),
      number: Number(g.number),
      section: g.section ?? null,
    }),
  },
  {
    id: "stat-page",
    re: new RegExp(
      String.raw`${LEAD}(?<volume>\d{1,3})\s+Stat\.\s*(?<page>\d+)(?:\s*[-–]\s*(?<pageEnd>\d+))?\b`,
      "g",
    ),
    make: (g) => ({
      kind: "stat",
      volume: Number(g.volume),
      page: Number(g.page),
      pageEnd: g.pageEnd ? Number(g.pageEnd) : null,
    }),
  },
  {
    id: "fr-page",
    re: new RegExp(
      String.raw`${LEAD}(?<volume>\d{1,3})\s+(?:FR|Fed\.\s?Reg\.)\s+(?<page>\d{1,3}(?:,\d{3})+|\d+)\b`,
      "g",
    ),
    make: (g) => ({
      kind: "fr",
      volume: Number(g.volume),
      page: Number((g.page ?? "").replaceAll(",", "")),
    }),
  },
  {
    id: "us-reports-page",
    re: new RegExp(
      String.raw`${LEAD}(?<volume>\d{1,3})\s+U\.\s?S\.\s+(?<page>\d+)\b`,
      "g",
    ),
    make: (g) => ({
      kind: "us_reports",
      volume: Number(g.volume),
      page: Number(g.page),
    }),
  },
];

// Longer alternatives first so "section 4 of the Act" wins over "the Act".
const SHORT_RE = new RegExp(
  String.raw`${LEAD}(?:[Ss]ection\s+${SEC}\s+of\s+the\s+Act\b|[Tt]he\s+Act\b|[Ii]d\.|[Ss]upra\b|[Ii]bid\b\.?|§§?\s*${SEC})`,
  "g",
);

function cite(
  fields: Fields,
  id: PatternId,
  text: string,
  start: number,
): ParsedCitation {
  return {
    ...fields,
    text,
    pattern: ref(id),
    start,
    end: start + text.length,
  } as ParsedCitation;
}

function scanCode(text: string, rule: CodeRule, out: ParsedCitation[]): void {
  const tail = rule.etSeq ? `(?<etseq>${ET_SEQ})?` : "";
  const first = new RegExp(`${rule.head}(?<item>${rule.item})${tail}`, "g");
  const next = new RegExp(
    `${LIST_SEP}(?<item>${rule.item})${tail}${NOT_CODE}`,
    "y",
  );
  for (const m of text.matchAll(first)) {
    const g: Groups = m.groups ?? {};
    const title = Number(g.title ?? 0);
    out.push(
      cite(
        rule.make(title, g.item ?? "", Boolean(g.etseq)),
        rule.id,
        m[0],
        m.index,
      ),
    );
    next.lastIndex = m.index + m[0].length;
    for (let n = next.exec(text); n; n = next.exec(text)) {
      const ng: Groups = n.groups ?? {};
      const item = ng.item ?? "";
      const span = item + (ng.etseq ?? "");
      out.push(
        cite(
          rule.make(title, item, Boolean(ng.etseq)),
          rule.id,
          span,
          n.index + n[0].length - span.length,
        ),
      );
    }
  }
}

const overlaps = (a: ParsedCitation, b: ParsedCitation) =>
  a.start < b.end && b.start < a.end;

/** Every full citation and short form in `text`, in source order. */
export function findCitations(text: string): ParsedCitation[] {
  const found: ParsedCitation[] = [];
  for (const rule of CODE_RULES) scanCode(text, rule, found);
  for (const rule of SIMPLE_RULES) {
    for (const m of text.matchAll(rule.re)) {
      found.push(cite(rule.make(m.groups ?? {}), rule.id, m[0], m.index));
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: ParsedCitation[] = [];
  for (const c of found) if (!kept.some((k) => overlaps(k, c))) kept.push(c);
  for (const m of text.matchAll(SHORT_RE)) {
    const s = cite(
      { kind: "short_form", note: SHORT_FORM_NOTE },
      "short-form",
      m[0],
      m.index,
    );
    if (!kept.some((k) => overlaps(k, s))) kept.push(s);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** The one citation or short form that is exactly `text`, else null. */
export function parseCitation(text: string): ParsedCitation | null {
  const found = findCitations(text);
  const c = found[0];
  return found.length === 1 && c.start === 0 && c.end === text.length
    ? c
    : null;
}

const HREF_SEC = String.raw`[0-9A-Za-z–-]+`;
const HREF_RULES: readonly SimpleRule[] = [
  {
    id: "uslm-pl-href",
    re: new RegExp(
      // A title segment (/tI) and subdivisions after the section (/a/1) stay in
      // the verbatim href; only the section is read.
      String.raw`^/us/pl/(?<congress>\d+)/(?<number>\d+)(?:/t[IVXLC]+)?(?:/s(?<section>${HREF_SEC})(?:/[0-9A-Za-z]+)*)?$`,
    ),
    make: (g) => ({
      kind: "pl",
      congress: Number(g.congress),
      number: Number(g.number),
      section: g.section ?? null,
    }),
  },
  {
    id: "uslm-stat-href",
    re: /^\/us\/stat\/(?<volume>\d+)\/(?<page>\d+)$/,
    make: (g) => ({
      kind: "stat",
      volume: Number(g.volume),
      page: Number(g.page),
      pageEnd: null,
    }),
  },
  {
    id: "uslm-act-href",
    re: /^\/us\/act\/\d{4}-\d{2}-\d{2}\/ch\d+(?:\/\S*)?$/,
    make: (g) => ({ kind: "act", href: g.href ?? "" }),
  },
  {
    id: "uslm-usc-href",
    re: new RegExp(
      String.raw`^/us/usc/t(?<title>\d+)/s(?<section>${HREF_SEC})$`,
    ),
    make: (g) => ({
      kind: "usc",
      title: Number(g.title),
      section: g.section ?? "",
      etSeq: false,
    }),
  },
];

/**
 * One USLM ref href, or null when its grammar is not in the table. `text` is
 * the href; a caller holding the ref element's printed text may replace it.
 */
export function parseUslmHref(href: string): ParsedCitation | null {
  for (const rule of HREF_RULES) {
    const m = rule.re.exec(href);
    if (m) return cite(rule.make({ ...m.groups, href }), rule.id, href, 0);
  }
  return null;
}
