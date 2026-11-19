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
  "national",
  "civilian",
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
  // The connecting words of a case caption, so a caption of general words
  // alone ("Indian Tribes v. United States") stays an ordinary search.
  "v",
  "vs",
  "et",
  "al",
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

/** Village and Community count with a name beside them (design (b)1); Island does not. */
const PLACE_WORDS = new Set([
  "village",
  "villages",
  "community",
  "communities",
]);

/** A word that is neither an anchor nor a general word. */
const isDistinctive = (word: string | undefined): boolean =>
  !!word && !isAnchor(word) && !GENERAL_WORDS.has(word);

/**
 * Whether the typed words hold a name shaped like a Tribe's.
 *
 * A span with a strong anchor (tribe, nation, band, indians, pueblo,
 * rancheria, reservation, colony, confederated, or a joined "...tribe") and
 * a distinctive word counts, whether the mask calls it a `nation_name` or
 * has folded the name into a `case_caption` or `treaty_title` span (a
 * caption with a Tribe as a party, a treaty named for one).
 *
 * A `nation_name` span with only a weak anchor counts when it also holds
 * "native", "indian" or "indians" and a distinctive word, or when Village or
 * Community has a distinctive word right before it or after "of" ("X
 * Village", "Village of X"). General phrases such as "community development"
 * stay ordinary searches.
 *
 * Not recognized (the stated page limit): a name typed with no such word,
 * or only with Island.
 */
export function holdsTribeName(text: string): boolean {
  const { spans } = maskProtectedSpans(text);
  return spans.some((span) => {
    const ws = words(text.slice(span.start, span.end));
    if (ws.some(isStrongAnchor)) return ws.some(isDistinctive);
    if (span.kind !== "nation_name" || !ws.some(isWeakAnchor)) return false;
    const holdsNative = ws.some(
      (w) => w === "native" || w === "indian" || w === "indians",
    );
    if (holdsNative && ws.some(isDistinctive)) return true;
    return ws.some(
      (w, i) =>
        PLACE_WORDS.has(w) &&
        (isDistinctive(ws[i - 1]) ||
          // "Village of X", "Village of the X".
          (ws[i + 1] === "of" &&
            isDistinctive(ws[i + 2] === "the" ? ws[i + 3] : ws[i + 2]))),
    );
  });
}
