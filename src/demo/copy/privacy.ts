// Privacy notes (design rule 5, safeguard 3): where search words go, and the
// footer link to the third-party notices. The main session places these.

/** "A, B and C" from source labels. */
function listed(labels: readonly string[]): string {
  return labels.length < 2
    ? (labels[0] ?? "")
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export const privacy = {
  /** Names the official services a search is sent to, from the live source list. */
  searchWordsSent: (labels: readonly string[]) =>
    labels.length
      ? `Search words are sent in the body of each request, never in the page address, to the demo service, which passes them to the official services you search: ${listed(labels)}. Those services keep their own logs.`
      : "Search words are sent in the body of each request, never in the page address, to the demo service, which passes them to the official services you search. Those services keep their own logs.",
  noticesLink: "Third-party notices",
  noticesHref: "./THIRD-PARTY-NOTICES.txt",
};
