// Design section 1 rule 2: words no page label or export of ours may use.
export const FORBIDDEN_WORDS = [
  "governs",
  "applies",
  "applicable",
  "implements",
  "authorizes",
  "authorized by",
  "under",
  "eligible",
  "eligibility",
  "valid",
  "binding",
  "jurisdiction",
  "good law",
  "overrule",
  "enacted by",
  "supporting legislation",
  "the law behind",
] as const;

const RE = new RegExp(
  String.raw`\b(?:${FORBIDDEN_WORDS.map((w) => w.replace(/ /g, String.raw`\s+`)).join("|")})\b`,
  "gi",
);

/** Every forbidden word or phrase in `text`, lowercased, in order. */
export const forbiddenHits = (text: string): string[] =>
  [...text.matchAll(RE)].map((m) => m[0].toLowerCase());
