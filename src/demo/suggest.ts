/**
 * Word suggestions for the search box (design T1.2; owner decisions 7 and 9
 * of 2026-11-06). Pure and deterministic: no network, no storage, no model.
 * Every label comes from a validated list (vocabulary files, the reviewed law
 * alias table, the reviewed plain-phrase table).
 *
 * rankLabels: every typed token matches a word start in label or shortLabel;
 * earlier tokens are whole words and the last may be a prefix. Order: exact,
 * then word-start, then fewer extra words, then list order.
 *
 * possibleMatches: the bounded typo pass, which the caller runs only when
 * rankLabels finds nothing. Each typed token must sit within an optimal
 * string alignment budget of a word (an adjacent swap is one edit): none
 * under 4 letters, 1 for 4 to 7, 2 for 8 or more, and none for a token with a
 * digit or an all-caps token of 6 letters or fewer. The first letter must
 * match. It reads the typed text with masked spans blanked, never offers a
 * label with a protected span, returns at most 5, and yields labels only,
 * never a reading. uFuzzy only narrows the candidates; these rules decide.
 */
import uFuzzy from "@leeoniya/ufuzzy";
import { maskProtectedSpans } from "./nation-mask.ts";

export interface Labeled {
  readonly label: string;
  readonly shortLabel?: string | null;
}

export const MAX_POSSIBLE_MATCHES = 5;

const wordsOf = (text: string): string[] =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

interface Prepared {
  /** Words of label and shortLabel together. */
  words: string[][];
  /** Label words and shortLabel words, each joined, for the exact tier. */
  exact: string[][];
  labelWords: number[];
  /** True when label or shortLabel holds a protected span. */
  masked: boolean[];
  /** One line per item for uFuzzy: its words, space separated. */
  haystack: string[];
  /** Items uFuzzy may miss, so the typo rules always see them (see narrows). */
  keep: number[];
}

// Built once per list (the caller keeps the list's identity), not per keystroke.
const prepared = new WeakMap<readonly Labeled[], Prepared>();

function prepare(items: readonly Labeled[]): Prepared {
  const hit = prepared.get(items);
  if (hit) return hit;
  const p: Prepared = {
    words: [],
    exact: [],
    labelWords: [],
    masked: [],
    haystack: [],
    keep: [],
  };
  items.forEach(({ label, shortLabel }, i) => {
    const own = wordsOf(label);
    const short = shortLabel ? wordsOf(shortLabel) : [];
    const words = [...own, ...short];
    p.words.push(words);
    p.exact.push(
      short.length ? [own.join(" "), short.join(" ")] : [own.join(" ")],
    );
    p.labelWords.push(own.length);
    p.masked.push(
      maskProtectedSpans(label).spans.length > 0 ||
        (!!shortLabel && maskProtectedSpans(shortLabel).spans.length > 0),
    );
    p.haystack.push(words.join(" "));
    // uFuzzy misses some single edits to a word whose first two letters are the
    // same, and its character classes are ASCII; such items skip the filter.
    if (words.some((w) => !/^(?:[a-z]+|[0-9]+)$/.test(w) || w[0] === w[1]))
      p.keep.push(i);
  });
  prepared.set(items, p);
  return p;
}

/** Runs the once-per-list work (word lists, mask check) ahead of the first keystroke. */
export function prepareLabels(items: readonly Labeled[]): void {
  prepare(items);
}

type Hit = [tier: number, extra: number, index: number];
const byHit = (a: Hit, b: Hit) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Step 1: word-start matches, best first. Returns every match; the caller slices. */
export function rankLabels<T extends Labeled>(
  typed: string,
  items: readonly T[],
): T[] {
  const tokens = wordsOf(typed);
  if (!tokens.length) return [];
  const p = prepare(items);
  const joined = tokens.join(" ");
  const last = tokens.length - 1;
  const hits: Hit[] = [];
  p.words.forEach((words, i) => {
    const all = tokens.every((t, k) =>
      words.some((w) => (k === last ? w.startsWith(t) : w === t)),
    );
    if (all)
      hits.push([
        p.exact[i].includes(joined) ? 0 : 1,
        p.labelWords[i] - tokens.length,
        i,
      ]);
  });
  return hits.sort(byHit).map(([, , i]) => items[i]);
}

/** Edits allowed for one typed token, read in the case it was typed. */
export function editBudget(token: string): number {
  if (/\p{N}/u.test(token)) return 0;
  if (
    token.length <= 6 &&
    token === token.toUpperCase() &&
    token !== token.toLowerCase()
  )
    return 0;
  return token.length < 4 ? 0 : token.length < 8 ? 1 : 2;
}

/**
 * Optimal string alignment distance from a to b (whole), and to the closest
 * prefix of b within the budget's length range (prefix).
 */
function alignment(a: string, b: string, budget: number) {
  const m = a.length;
  const n = b.length;
  let before: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const row = [i];
    let low = i;
    for (let j = 1; j <= n; j += 1) {
      let d = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d = Math.min(d, before[j - 2] + 1);
      row.push(d);
      low = Math.min(low, d);
    }
    // No later cell can drop below a whole row's minimum, swaps included.
    if (low > budget) return { whole: Infinity, prefix: Infinity };
    before = prev;
    prev = row;
  }
  let prefix = Infinity;
  for (let j = Math.max(1, m - budget); j <= Math.min(n, m + budget); j += 1)
    prefix = Math.min(prefix, prev[j]);
  return { whole: prev[n], prefix };
}

/** Edits from token to one word (or, for the last token, its start); Infinity if over budget. */
function wordEdits(token: string, budget: number, w: string, last: boolean) {
  if (budget === 0)
    return (last ? w.startsWith(token) : w === token) ? 0 : Infinity;
  if (w[0] !== token[0]) return Infinity;
  if (
    last
      ? w.length < token.length - budget
      : Math.abs(w.length - token.length) > budget
  )
    return Infinity;
  const { whole, prefix } = alignment(token, w, budget);
  const d = last ? Math.min(whole, prefix) : whole;
  return d <= budget ? d : Infinity;
}

interface Token {
  text: string;
  budget: number;
  last: boolean;
  /** Per call: labels repeat words, so each distinct word is aligned once. */
  seen: Map<string, number>;
}

function edits(t: Token, words: string[]) {
  let best = Infinity;
  for (const w of words) {
    let d = t.seen.get(w);
    if (d === undefined)
      t.seen.set(w, (d = wordEdits(t.text, t.budget, w, t.last)));
    best = Math.min(best, d);
  }
  return best;
}

const fuzzy = new uFuzzy({
  intraMode: 1,
  // One edit of any kind after the first letter, for every term length.
  intraRules: () => ({
    intraSlice: [1, Infinity],
    intraIns: 1,
    intraSub: 1,
    intraTrn: 1,
    intraDel: 1,
  }),
});

/**
 * Whether uFuzzy may narrow by this token without dropping an item the rules
 * would accept: ASCII letters and at most one edit (a test checks the filter
 * against the rules).
 */
const narrows = (token: string, budget: number) =>
  budget <= 1 && /^[a-z]+$/.test(token);

/** Step 2: labels within the typo budget, best first, at most 5. */
export function possibleMatches<T extends Labeled>(
  route: {
    input: string;
    maskedSpans: readonly { start: number; end: number }[];
  },
  items: readonly T[],
): T[] {
  const chars = route.input.split("");
  for (const { start, end } of route.maskedSpans)
    for (let i = start; i < end && i < chars.length; i += 1) chars[i] = " ";
  const typed = chars.join("").match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!typed.length) return [];
  const tokens: Token[] = typed.map((t, k) => ({
    text: t.toLowerCase(),
    budget: editBudget(t),
    last: k === typed.length - 1,
    seen: new Map(),
  }));
  const p = prepare(items);
  let pool: number[] | undefined;
  for (const t of tokens)
    if (narrows(t.text, t.budget))
      pool = fuzzy.filter(p.haystack, t.text, pool) ?? [];
  const allowed = pool && new Set([...pool, ...p.keep]);
  const hits: Hit[] = [];
  for (let i = 0; i < items.length; i += 1) {
    if (p.masked[i] || (allowed && !allowed.has(i))) continue;
    let total = 0;
    for (const t of tokens) {
      total += edits(t, p.words[i]);
      if (total === Infinity) break;
    }
    if (total !== Infinity)
      hits.push([total, p.labelWords[i] - tokens.length, i]);
  }
  return hits
    .sort(byHit)
    .slice(0, MAX_POSSIBLE_MATCHES)
    .map(([, , i]) => items[i]);
}

// The reviewed plain-phrase table (owner decision 9; schemas/plain-phrases.schema.v1.json).
export type PlainPhraseFamily =
  | "federal_register_topic"
  | "congress_subject_term"
  | "cfr_title_name"
  | "agency";
export interface PlainPhrase {
  phrase: string;
  termFamily: PlainPhraseFamily;
  /** The official vocabulary term, verbatim. */
  term: string;
  termSourceUrl: string;
  /** YYYY-MM-DD */
  reviewedOn: string;
  reviewerRole: "owner";
  basis: "curated";
}
export interface PlainPhraseFile {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "plain-phrases";
  entries: PlainPhrase[];
}

const folded = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Rows whose phrase equals the typed text, ignoring case and spacing. Offered, never applied. */
export function phraseRows(
  typed: string,
  table: PlainPhraseFile,
): PlainPhrase[] {
  const key = folded(typed);
  return table.entries.filter((row) => folded(row.phrase) === key);
}
