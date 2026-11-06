/** Following (src/demo/follow.ts): kept in this browser, checked only when asked. */
export const follow = {
  title: "Following",
  intro:
    "Follow a docket, a RIN, or a document to look for newer documents later. The followed list is kept in this browser between visits and is not sent anywhere on its own. Check for new looks up each followed identifier, exactly as its source states it, in that source only, and only when pressed. A followed document is looked up by every identifier its source stated, as Find related does. A shared identifier does not show how one document relates to another.",
  empty: "Nothing followed yet. Use Follow on a result row.",
  follow: "Follow",
  following: "Following",
  followDocument: "Follow document",
  followingDocument: "Following document",
  kinds: { docket: "docket", rin: "RIN", document: "document", case: "case" },
  from: (source: string, identifier: string) =>
    `From ${source} record ${identifier}`,
  followedOn: "Followed",
  lastChecked: "Last checked",
  notChecked: "Not checked yet",
  check: "Check for new",
  checking: "Checking followed items with their sources.",
  checkingItem: "Checking.",
  exportButton: "Export followed list",
  importButton: "Import followed list",
  none: "Follow at least one docket, RIN, or document first.",
  added: (what: string) => `Following ${what}.`,
  removed: (what: string) => `Stopped following ${what}.`,
  full: (limit: number) =>
    `The followed list holds up to ${limit} items. Remove one to follow another.`,
  newSince: (date: string, count: number) =>
    `New since ${date}: ${count} ${count === 1 ? "document" : "documents"}.`,
  nothingNew: (date: string) => `No document listed since ${date}.`,
  undated: (count: number) =>
    `${count} ${count === 1 ? "listing states" : "listings state"} no date, so ${count === 1 ? "it is" : "they are"} not counted as new.`,
  more: "The source holds more listings than this check loaded. See the official source.",
  unavailable: (reason: string) =>
    `Unavailable. ${reason} Nothing is established about new documents; Last checked is unchanged.`,
  waiting: (limit: number) =>
    `Not checked this time: one check sends at most ${limit} lookups, to stay within the demo service's request limit. Press Check for new again for the rest.`,
  checked: (checked: number, unavailable: number, waiting: number) =>
    [
      `Checked ${checked} followed ${checked === 1 ? "item" : "items"}.`,
      unavailable ? `${unavailable} could not be checked.` : "",
      waiting ? `${waiting} wait for the next check.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  remove: "Stop following",
  exportDone: "The followed list was sent to the browser's downloads.",
  importDone: (
    added: number,
    already: number,
    dropped: number,
    limit: number,
  ) =>
    [
      `Imported ${added} followed ${added === 1 ? "item" : "items"}.`,
      already
        ? `${already} ${already === 1 ? "was" : "were"} already followed.`
        : "",
      dropped
        ? `${dropped} did not fit: the list holds up to ${limit} items.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  importRejected:
    "The file is not a Policy Sentinel followed list, or part of it could not be checked, so nothing was imported.",
  storageUnavailable:
    "Browser storage is unavailable. The followed list works on this page but will not be kept after a reload. Export it to keep a copy.",
  storageSaveFailed:
    "The followed list could not be saved in browser storage. Export it to keep a copy.",
  restorePartial:
    "Part of the saved followed list could not be restored. Valid items were kept.",
  restoreFailed:
    "The saved followed list could not be restored. This page starts with an empty followed list.",
  /** The five tracking states (design T1.6), each shown apart from the others. */
  states: {
    new: "New",
    unchanged: "Unchanged",
    not_checked: "Not checked",
    unavailable: "Unavailable",
    no_longer_listed: "No longer listed",
  },
  stateHelp: {
    new: "The source lists documents dated on or after the last check.",
    unchanged: "The source lists no document dated on or after the last check.",
    not_checked:
      "Not looked up in this check. Nothing is established about new documents.",
    unavailable:
      "The source could not answer. Nothing is established about new documents.",
    no_longer_listed:
      "The source no longer lists the followed record by this identifier. This does not show why.",
  },
  lastCheckedLine: (day: string | null) =>
    `Last checked: ${day ?? "not checked yet"}.`,
  dataAsOfLine: (asOf: string | null) =>
    `Source data as of: ${asOf ?? "not stated by the source"}.`,
  /** A saved Federal Register word search: never called a consultation notice, never naming a Nation. */
  savedSearch: {
    title: "Documents containing these words",
    passage: (passage: string) => `Matched passage: "${passage}"`,
    note: "A word match only. It does not show what kind of notice a document is or whom it concerns.",
  },
} as const;
