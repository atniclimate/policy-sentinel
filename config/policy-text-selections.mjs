// Reviewed local rendition exclusions; no source text is stored in Git.
// Source-evidence review: docs/source-reviews/real-policy-direct-2026-09-05.md.
// These two paragraphs reproduce private brief/comment expression. Omitting
// whole blocks preserves an exact replay while disclosing the broader omission.
const exclusions = Object.freeze({
  "https://www.govinfo.gov/content/pkg/FR-2004-07-06/html/04-15218.htm":
    Object.freeze([
      "/html[1]/body[1]/pre[1]/paragraph[53]",
      "/html[1]/body[1]/pre[1]/paragraph[57]",
    ]),
});
export function reviewedPolicyTextExclusions(url) {
  return [...(exclusions[url] ?? [])];
}
