/**
 * Protected-span masking before jurisdiction matching (design rule 6).
 *
 * The page carries no Nation list (the full recognition collection is not in
 * the repository; its build is gated on purpose), so masking is structural:
 * organization names anchored on words such as Tribe, Nation, Band, Indians,
 * Pueblo, Rancheria, Reservation, Colony, Village, Island or Community; treaty
 * titles; and case captions. A caller may also inject exact names, matched
 * case-insensitively after NFC normalization and whitespace collapsing.
 *
 * Over-masking is the safe direction. The module never decides relevance, a
 * filter or a relationship; it only removes spans from jurisdiction matching.
 * Masked characters become spaces, so offsets are preserved.
 *
 * No imports beyond the language, so Node scripts can load it directly.
 */

export type ProtectedSpanKind = "nation_name" | "treaty_title" | "case_caption";

export interface ProtectedSpan {
  start: number;
  end: number;
  kind: ProtectedSpanKind;
}

export interface MaskResult {
  masked: string;
  spans: readonly ProtectedSpan[];
}

export interface MaskOptions {
  names?: readonly string[];
}

const MASK_CHAR = " ";
const MAX_BACK = 6;
const MAX_FORWARD = 8;
const MAX_BACK_PAREN = 40;

const STRONG_ANCHOR =
  /^(?:tribes?|nations?|bands?|indians|pueblos?|rancheria|rancherias|reservation|reservations|colony)$/i;
/** Weak anchors do not take a state word backward or a trailing state list. */
const WEAK_ANCHOR = /^(?:village|villages|islands?|community|communities)$/i;
// shortcut: the BIA list prints one name with "Tribe" joined to the word before
// it; any word ending in "tribe" counts, which over-masks rare English words.
const JOINED_TRIBE = /^(?!diatribes?$)\p{L}+tribes?$/iu;
const CONFEDERATED = /^confederated$/i;
// The period is optional: a typed caption often drops it, and over-masking is safe.
const CAPTION_V = /^vs?\.?$/i;

const STOP = new Set(
  (
    "the a an and or nor but with for to in on at by from about under over into onto upon " +
    "regarding between among per via see also is are was were be been as that this these those " +
    "which who whom whose it its their our his her all any each every not no of if than then so such " +
    "consultation consultations policy policies rule rules rulemaking act acts law laws grant grants " +
    "program programs staff notice notices comment comments letter meeting regulation regulations plan report"
  ).split(" "),
);
/** Connectors a case caption party name may contain. */
const CAPTION_CONNECTORS = new Set(["of", "and", "&", "ex", "rel", "et", "al"]);
const CAPTION_FORWARD = new Set([...CAPTION_CONNECTORS, "the"]);
/** A strong anchor walks back through "of": National Congress of American Indians. */
const OF_ONLY = new Set(["of"]);
const ABBREVIATIONS = new Set(["dept", "corp", "assn", "bros", "univ"]);

const STATE_NAMES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];
const STATE_SET = new Set(STATE_NAMES.map((s) => s.toLowerCase()));
const STATE_ALT = STATE_NAMES.map((s) => s.replace(" ", "\\s+")).join("|");
const STATE_LIST_ITEM = new RegExp(
  `^(?:\\s*,\\s*|\\s*&\\s*|\\s+and\\s+)(?:${STATE_ALT})(?![\\p{L}\\p{N}])`,
  "iu",
);
const ENDS_WITH_STATE = new RegExp(`(?:^|\\s)(?:${STATE_ALT})$`, "iu");
const YEAR_AFTER = /^\s*,?\s*(?:1[5-9]\d\d|20\d\d)\b/;

interface Token {
  start: number;
  end: number;
  text: string;
  core: string;
}

function core(text: string): string {
  // Periods first, so "Tribes'." and "Tribe's." still reach the anchor test.
  return text
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(/['’]s?$/, "");
}

function sentenceEnd(text: string): boolean {
  if (!text.endsWith(".")) return false;
  const body = text.replace(/\.+$/, "");
  return (
    !body.includes(".") &&
    /^\p{L}{4,}$/u.test(body) &&
    !ABBREVIATIONS.has(body.toLowerCase())
  );
}

class Scanner {
  readonly tokens: Token[] = [];
  private readonly byStart = new Map<number, number>();
  private readonly byEnd = new Map<number, number>();
  readonly text: string;

  constructor(text: string) {
    this.text = text;
    for (const m of text.matchAll(/[^\s,;:()[\]{}"“”?!]+/g)) {
      const token = {
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        core: core(m[0]),
      };
      this.byStart.set(token.start, this.tokens.length);
      this.byEnd.set(token.end, this.tokens.length);
      this.tokens.push(token);
    }
  }

  /** The token after pos, separated only by whitespace. */
  next(pos: number): Token | undefined {
    let p = pos;
    while (p < this.text.length && /\s/.test(this.text[p] ?? "")) p += 1;
    const i = this.byStart.get(p);
    return i === undefined ? undefined : this.tokens[i];
  }

  /** The position before pos after skipping whitespace. */
  skipBack(pos: number): number {
    let p = pos;
    while (p > 0 && /\s/.test(this.text[p - 1] ?? "")) p -= 1;
    return p;
  }

  tokenEndingAt(pos: number): Token | undefined {
    const i = this.byEnd.get(pos);
    return i === undefined ? undefined : this.tokens[i];
  }

  /** Index of the "(" matching the ")" at close, or -1. */
  openBefore(close: number): number {
    let depth = 0;
    for (let i = close; i >= 0; i -= 1) {
      const c = this.text[i];
      if (c === ")") depth += 1;
      else if (c === "(" && --depth === 0) return i;
    }
    return -1;
  }

  /** Index after the ")" matching the "(" at open, or the text end. */
  closeAfter(open: number): number {
    let depth = 0;
    for (let i = open; i < this.text.length; i += 1) {
      const c = this.text[i];
      if (c === "(") depth += 1;
      else if (c === ")" && --depth === 0) return i + 1;
    }
    return this.text.length;
  }
}

function isNameToken(
  t: Token | undefined,
  connectors?: Set<string>,
): t is Token {
  if (!t || /^\d/.test(t.text)) return false;
  return !STOP.has(t.core) || (connectors?.has(t.core) ?? false);
}

/** Backward over name words; includes a "the" it stops at. */
function extendBack(
  s: Scanner,
  from: number,
  opts: { weak: boolean; connectors?: Set<string> },
): number {
  let start = from;
  for (let steps = 0; steps < MAX_BACK; steps += 1) {
    const p = s.skipBack(start);
    if (p === 0) break;
    if (s.text[p - 1] === ")") {
      const open = s.openBefore(p - 1);
      if (open < 0 || p - open > MAX_BACK_PAREN) break;
      start = open;
      continue;
    }
    const t = s.tokenEndingAt(p);
    if (!t) break;
    if (t.core === "the") {
      start = t.start;
      break;
    }
    if (!isNameToken(t, opts.connectors) || sentenceEnd(t.text)) break;
    if (opts.weak && STATE_SET.has(t.core)) break;
    start = t.start;
  }
  return start;
}

/** Forward through "of ..." chains, a trailing state list and parentheticals. */
function extendForward(s: Scanner, from: number, strong: boolean): number {
  let end = from;
  for (;;) {
    const of = s.next(end);
    if (of?.core === "of") {
      let q = of.end;
      let t = s.next(q);
      if (t?.core === "the") {
        q = t.end;
        t = s.next(q);
      }
      let n = 0;
      while (n < MAX_FORWARD && isNameToken(t)) {
        q = t.end;
        n += 1;
        if (sentenceEnd(t.text)) break;
        t = s.next(q);
      }
      if (n > 0) {
        end = q;
        continue;
      }
    }
    const rest = s.text.slice(end);
    if (strong) {
      const item = STATE_LIST_ITEM.exec(rest);
      const viaAnd = item ? /^\s+and\s/i.test(item[0]) : false;
      if (item && (!viaAnd || ENDS_WITH_STATE.test(s.text.slice(0, end)))) {
        end += item[0].length;
        continue;
      }
    }
    const paren = /^\s*\(/.exec(rest);
    if (paren) {
      end = s.closeAfter(end + paren[0].length - 1);
      continue;
    }
    return end;
  }
}

function structuralSpans(s: Scanner): ProtectedSpan[] {
  const spans: ProtectedSpan[] = [];
  s.tokens.forEach((t, i) => {
    const strong = STRONG_ANCHOR.test(t.core) || JOINED_TRIBE.test(t.core);
    const weak = !strong && WEAK_ANCHOR.test(t.core);
    if (strong || weak) {
      const start = extendBack(s, t.start, {
        weak,
        connectors: strong ? OF_ONLY : undefined,
      });
      const end = extendForward(s, t.end, strong);
      const phrase = s.text
        .slice(start, end)
        .replace(/\s+/g, " ")
        .toLowerCase();
      if (!(weak && STATE_SET.has(phrase))) {
        spans.push({ start, end, kind: "nation_name" });
      }
      return;
    }
    if (CONFEDERATED.test(t.core)) {
      // Forward to the first strong anchor within reach, "and" allowed.
      let q = t.end;
      for (let n = 0; n < MAX_BACK; n += 1) {
        const u = s.next(q);
        if (!isNameToken(u, CAPTION_CONNECTORS)) break;
        q = u.end;
        if (STRONG_ANCHOR.test(u.core)) {
          spans.push({ start: t.start, end: q, kind: "nation_name" });
          break;
        }
      }
      return;
    }
    if (t.core === "treaty") {
      const link = s.next(t.end);
      if (link?.core !== "of" && link?.core !== "with") return;
      let q = link.end;
      let u = s.next(q);
      if (u?.core === "the") {
        q = u.end;
        u = s.next(q);
      }
      for (let n = 0; n < MAX_FORWARD && isNameToken(u); n += 1) {
        q = u.end;
        if (sentenceEnd(u.text)) break;
        u = s.next(q);
      }
      const year = YEAR_AFTER.exec(s.text.slice(q));
      if (year) q += year[0].length;
      spans.push({ start: t.start, end: q, kind: "treaty_title" });
      return;
    }
    if (CAPTION_V.test(t.text) && i > 0) {
      const start = extendBack(s, t.start, {
        weak: false,
        connectors: CAPTION_CONNECTORS,
      });
      let q = t.end;
      let u = s.next(q);
      for (let n = 0; n < MAX_BACK && isNameToken(u, CAPTION_FORWARD); n += 1) {
        q = u.end;
        if (sentenceEnd(u.text)) break;
        u = s.next(q);
      }
      if (start < t.start && q > t.end) {
        spans.push({ start, end: q, kind: "case_caption" });
      }
    }
  });
  return spans;
}

/** NFC, lower-cased, whitespace-collapsed text with a map back to the source. */
function normalizeWithMap(text: string): {
  norm: string;
  from: number[];
  to: number[];
} {
  let norm = "";
  const from: number[] = [];
  const to: number[] = [];
  for (const m of text.matchAll(/\s+|\P{M}\p{M}*|\p{M}+/gu)) {
    const end = m.index + m[0].length;
    if (/^\s/.test(m[0])) {
      if (norm.endsWith(" ")) {
        to[to.length - 1] = end;
        continue;
      }
      norm += " ";
      from.push(m.index);
      to.push(end);
      continue;
    }
    const piece = m[0].normalize("NFC").toLowerCase();
    for (let k = 0; k < piece.length; k += 1) {
      from.push(m.index);
      to.push(end);
    }
    norm += piece;
  }
  return { norm, from, to };
}

function injectedSpans(
  text: string,
  names: readonly string[],
): ProtectedSpan[] {
  const spans: ProtectedSpan[] = [];
  const { norm, from, to } = normalizeWithMap(text);
  const wordChar = /[\p{L}\p{N}]/u;
  for (const name of names) {
    const needle = name
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!needle) continue;
    for (
      let k = norm.indexOf(needle);
      k >= 0;
      k = norm.indexOf(needle, k + 1)
    ) {
      const last = k + needle.length - 1;
      if (
        wordChar.test(norm[k - 1] ?? "") ||
        wordChar.test(norm[last + 1] ?? "")
      ) {
        continue;
      }
      const start = from[k];
      const end = to[last];
      if (start !== undefined && end !== undefined) {
        spans.push({ start, end, kind: "nation_name" });
      }
    }
  }
  return spans;
}

/** Merge overlapping spans and spans separated only by whitespace; the earlier span's kind wins. */
function merge(text: string, spans: ProtectedSpan[]): ProtectedSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: ProtectedSpan[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (
      last &&
      (span.start <= last.end || /^\s*$/.test(text.slice(last.end, span.start)))
    ) {
      last.end = Math.max(last.end, span.end);
    } else {
      out.push({ ...span });
    }
  }
  return out;
}

export function maskProtectedSpans(
  text: string,
  options?: MaskOptions,
): MaskResult {
  const scanner = new Scanner(text);
  const spans = merge(text, [
    ...structuralSpans(scanner),
    ...injectedSpans(text, options?.names ?? []),
  ]);
  const chars = text.split("");
  for (const { start, end } of spans) {
    for (let i = start; i < end; i += 1) chars[i] = MASK_CHAR;
  }
  return { masked: chars.join(""), spans };
}
