/**
 * A typed Tribe-shaped name (design D-186b, the owner ruling of 2026-11-19):
 * whether the typed words hold a name shaped like a Tribe's, so the page can
 * word the search as a name search (safeguard 1). Structural only, built on
 * the mask's own `nation_name` spans; `treaty_title` and `case_caption` spans
 * never count here. No injected name list; over-catching is the safe
 * direction.
 *
 * No imports beyond the language and the mask, so Node can load it directly.
 */
import { maskProtectedSpans } from "./nation-mask.ts";

/**
 * General words that name no particular Tribe or organization on their own.
 * Documented here, the one place this module reads them.
 */
export const GENERAL_WORDS: ReadonlySet<string> = new Set([
  "indian",
  "tribal",
  "native",
  "natives",
  "american",
  "americans",
  "alaska",
  "alaskan",
  "hawaiian",
  "federally",
  "federal",
  "recognized",
  "unrecognized",
  "the",
  "of",
  "and",
  "or",
  "for",
  "in",
  "all",
  "any",
  "each",
  "every",
  "other",
  "many",
  "some",
  "several",
  "these",
  "those",
  "both",
  "state",
  "states",
  "local",
  "united",
  "sovereign",
  "government",
  "governments",
  "governmental",
  "organization",
  "organizations",
  "entity",
  "entities",
  "members",
  "member",
  "urban",
  "rural",
  "eligible",
  "certain",
  "various",
  "such",
  "non",
  "new",
]);

const STRONG_WORDS = new Set([
  "tribe",
  "tribes",
  "nation",
  "nations",
  "band",
  "bands",
  "indians",
  "pueblo",
  "pueblos",
  "rancheria",
  "rancherias",
  "reservation",
  "reservations",
  "colony",
  "confederated",
]);

const WEAK_WORDS = new Set([
  "village",
  "villages",
  "island",
  "islands",
  "community",
  "communities",
]);

// A word ending in "tribe"/"tribes" that the mask treats as joined (mirrors
// nation-mask's JOINED_TRIBE: one or more letters, then "tribe" or "tribes").
const JOINED_TRIBE = /^(?!diatribes?$)\p{L}+tribes?$/u;

const isStrongAnchor = (word: string): boolean =>
  STRONG_WORDS.has(word) || JOINED_TRIBE.test(word);
const isWeakAnchor = (word: string): boolean => WEAK_WORDS.has(word);
const isAnchor = (word: string): boolean =>
  isStrongAnchor(word) || isWeakAnchor(word);

/**
 * The span's words, lower-cased, periods and a trailing possessive 's
 * stripped, as the mask's own `core` does; split the same way the mask's
 * scanner tokenizes (on whitespace and the same punctuation).
 */
function words(span: string): string[] {
  return span
    .split(/[\s,;:()[\]{}"“”?!]+/u)
    .filter(Boolean)
    .map((w) =>
      w
        .toLowerCase()
        .replace(/\.+$/, "")
        .replace(/['’]s?$/, ""),
    )
    .filter(Boolean);
}

/**
 * Whether the typed words hold a name shaped like a Tribe's: a `nation_name`
 * span anchored on a strong anchor (tribe, nation, band, indians, pueblo,
 * rancheria, reservation, colony, confederated, or a joined "...tribe") with
 * a word that is neither an anchor nor a general word; or anchored only on a
 * weak anchor (village, island, community) that also holds "native",
 * "indian" or "indians" and such a word. A one-word everyday name (no anchor
 * word) is not recognized (the stated page limit).
 */
export function holdsTribeName(text: string): boolean {
  const { spans } = maskProtectedSpans(text);
  return spans.some((span) => {
    if (span.kind !== "nation_name") return false;
    const ws = words(text.slice(span.start, span.end));
    const strong = ws.some(isStrongAnchor);
    const weak = !strong && ws.some(isWeakAnchor);
    if (!strong && !weak) return false;
    const distinctive = ws.some((w) => !isAnchor(w) && !GENERAL_WORDS.has(w));
    if (strong) return distinctive;
    const holdsNative = ws.some(
      (w) => w === "native" || w === "indian" || w === "indians",
    );
    return holdsNative && distinctive;
  });
}
