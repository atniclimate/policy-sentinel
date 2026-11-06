/**
 * The Briefing export (src/demo/document.ts). Every line points to a numbered
 * reference; nothing here recommends an action or states what a record means.
 */
export const briefing = {
  title: "Briefing",
  lede: "Dates, source-stated changes, open evidence gaps, and questions for staff or counsel, drawn from the records cited in this list. Each item points to its reference. This briefing makes no recommendation and states no legal conclusion.",
  datesTitle: "Decision Dates",
  datesNone:
    "No cited record states a comment or application closing date. Check each official source.",
  changesTitle: "Changes Since the Last Check",
  changesNone:
    "Nothing followed was checked in this session, so no change is reported here.",
  /** One followed item: its kind and value, as its source spells it. */
  followed: (kind: string, value: string, source: string) =>
    `Followed ${kind} ${value} (${source})`,
  newListing: (title: string, date: string, source: string, ref: number) =>
    `${title}, dated ${date} by ${source} [${ref}]`,
  gapsTitle: "Open Evidence Gaps",
  gapsNone: "No open evidence gap was recorded for the cited records.",
  gaps: {
    textNotRead: (ref: number) =>
      `The official text of [${ref}] was not read by this demo. Read it at the official source.`,
    dateNotStated: (ref: number) =>
      `The source of [${ref}] states no date for it.`,
    closeWithheld: (ref: number, source: string) =>
      `${source} states a closing time for [${ref}] that this demo does not show. See the official source.`,
    foundByNotRecorded: (ref: number) =>
      `How [${ref}] was found is not recorded: it was restored from an earlier visit.`,
    trackingUnavailable: (what: string, ref: number) =>
      `${what} could not be checked. Nothing is established about new documents for [${ref}].`,
    trackingNotChecked: (what: string, ref: number) =>
      `${what} was not checked in this session [${ref}].`,
  },
  questionsTitle: "Questions for Staff or Counsel",
  questionsNone: "No question was drawn from the cited records.",
  questions: {
    closeDate: (date: string, ref: number) =>
      `Does the office intend to respond before ${date}? [${ref}]`,
    passage: (label: string, locator: string, ref: number) =>
      `What do staff or counsel read in the passage marked "${label}" (${locator})? [${ref}]`,
    consultationAbsent: (ref: number) =>
      `Was consultation offered for [${ref}]? Missing wording in the text read does not show that none occurred.`,
    noLongerListed: (what: string, ref: number) =>
      `${what} is no longer listed by its source. What does the source now show? [${ref}]`,
  },
} as const;
