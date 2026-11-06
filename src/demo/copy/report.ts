/** Report pane: citations, data actors and export. */
export const report = {
  reportTitle: "Report",
  citationsTitle: "My Citations",
  citationsEmpty:
    "Nothing cited yet. Add a policy from the results to build a short, annotated list.",
  citationLimit: (limit: number) =>
    `My Citations holds up to ${limit} citations. Remove one to add another; export the list first to keep a copy.`,
  citationAdded: (title: string, reading: boolean) =>
    `Added ${title}.${reading ? " Reading the official text." : ""}`,
  citationSaved: (title: string) => `Citation and text saved for ${title}.`,
  citationTextFailed: (title: string) =>
    `Citation added for ${title}, but its text could not be read. Use Show issues to retry.`,
  citationRemoved: (title: string) =>
    `Removed ${title}, its selected passages, and its notes.`,
  /** Label of the count of passages a citation carries into the document. */
  passagesSelected: "Passages selected",
  readingForCitation: "Reading the official text for this citation.",
  textNotReadYet:
    "The text has not been read. Export PDF and Print view include this citation without passages.",
  citationNote: "Note on this policy",
  remove: "Remove",
  storageUnavailable:
    "Browser storage is unavailable. The citation list works in this tab but will not be restored after a reload. Export it before reloading or closing the tab.",
  storageSaveFailed:
    "The citation list could not be saved in browser storage. Keep this page open or export the list; Export PDF and Print view use the list as it stands.",
  /** Restore notices raised by src/demo/report-state.ts when saved state is damaged. */
  restorePartial:
    "Part of the saved citation list could not be restored. Valid citations and notes were kept; check the list and the data actor entries before exporting.",
  restoreFailed:
    "The saved citation list could not be restored. This tab starts with an empty list and blank data actor entries.",
  actorsTitle: "Data Actors",
  actorsIntro:
    "Who prepared this list, who it is shared with, and why. All five entries are required before Export PDF or Print view. They stay in this browser tab and leave it only inside the PDF or the printed pages. The demo does not verify them. The document also prints the name as the responsible person for this use of the tool.",
  actorsCount: (entered: number, total: number) => `${entered} of ${total}`,
  actorEntered: "Entered",
  actorRequired: "Required",
  /** `missing` is the list of entry labels still blank, already joined. */
  actorsMissing: (missing: string) =>
    `Export PDF and Print view need every data actor entry. Still missing: ${missing}.`,
  exportTitle: "Export",
  exportPdf: "Export PDF",
  exportingPdf: "Building the PDF.",
  printView: "Print view",
  printPreparing: "Preparing the print view.",
  exportEmpty: "Add at least one policy to My Citations first.",
  exportDone: "The PDF was built and sent to the browser's downloads.",
  exportFailed:
    "The PDF could not be built. The print view still works: use Print view, then save as PDF.",
  /** `character` names the first refused character, such as "x (U+0078)"; empty when unknown. */
  exportUnsupported: (character: string) =>
    `The PDF fonts cannot display ${character ? `the character ${character}` : "a character"} in this list. Letters used in some Indigenous-language names are among those affected. Use Print view to save the list as a PDF with the browser's fonts, and check the saved pages before sharing them.`,
  /** The calendar file (src/demo/calendar.ts): official record details only. */
  calendar: {
    button: "Export comment dates",
    help: "Downloads a calendar file (.ics) with one all-day event for each Federal Register document in My Citations or Results that states a comment closing date. The file holds only official record details: no notes, names, or search terms.",
    none: "No Federal Register document in My Citations or Results states a comment closing date, so there is nothing to export.",
    done: (count: number) =>
      `The calendar file was sent to the browser's downloads, with ${count} comment closing ${count === 1 ? "date" : "dates"}.`,
    summary: (title: string) => `Comments close: ${title}`,
    /** Opens with the page's own words for the date; the date is the source's. */
    description: (date: string, source: string, url: string) =>
      `Comments close ${date}, as stated by ${source}. The date can change through an extension or a correction. Check the official source before relying on it: ${url}`,
  },
  aboutPdfTagging: "The exported PDF is not tagged for screen readers.",
  serviceDown:
    "The demo service did not answer. Try again in a moment. If it keeps happening, the service may be down.",
  rateLimited:
    "That is a lot of requests in a short time. Wait a minute and try again.",
  keyPendingTitle: "Key pending",
  notAvailableTitle: "Not available",
  liveTitle: "Live",
  notCheckedTitle: "Not checked",
  notCheckedNote: "Availability has not been checked.",
  pdfIntro:
    "A short list of public policies with citations, selected passages or rule assessments, and notes written by the person who prepared this list.",
  pdfNotesLabel: "Note",
  pdfNoNote: "No note added.",
  pdfNoPassages: "No passages selected for this policy.",
  pdfTextNotRead:
    "The text was not read: the demo does not read this source's text, or the read did not finish. No passages are listed.",
} as const;
