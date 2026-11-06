/**
 * Court case strings (T1.5): case rows, the U.S. Reports volume limit, the
 * link-outs for IBIA and Tribal courts, and the related-record expansion
 * buttons (T1.3). Plain, source-stated wording only; nothing here says what
 * a decision means or relates a record to a Nation.
 */
export const courts = {
  familyTitle: "Cases",
  /** Shown when GovInfo's record carries no reporter citation for the case. */
  citationNotProvided: "Citation not provided by this source.",
  citationStated: (citation: string) =>
    `U.S. Reports citation, from GovInfo's volume and page: ${citation}.`,
  /** A U.S. Reports citation above the last GovInfo volume. No call is made. */
  notResolvable:
    "Not resolvable from an official source; search the case name.",
  /** The caption is withheld when it may name a person (no-personal-data contract). */
  captionWithheld:
    "Case name not shown here because the caption may name a person. Open the official record.",
  courtLabel: "Court",
  docketLabel: "Docket number",
  docketLine: (court: string, docket: string) => `${docket} (${court})`,
  dateIssuedLabel: "Date issued",
  dateNotStated: "Date not stated by the source",
  officialLink: "Open at GovInfo",
  docketNotFound:
    "GovInfo has no opinion package for that docket number in that court.",
  usReportsNotFound:
    "GovInfo has no U.S. Reports entry starting at that volume and page.",
  courtNotCovered:
    "That court is not one this demo searches. Covered: Ninth Circuit, Federal Circuit, Court of Federal Claims, and the federal district courts for Washington, Oregon and Idaho.",
  follow: "Follow case",
  following: "Following case",
  /** Link-outs only; the demo makes no request to these services. */
  linkOuts: {
    ibia: {
      label: "Interior Board of Indian Appeals decisions",
      note: "Link out only. The Department of the Interior's page on finding IBIA decisions leads to its decision search; this demo does not search it.",
    },
    nill: {
      label: "Tribal court decisions: NILL Tribal Law Gateway",
      note: "Link out only. The National Indian Law Library directory lists Tribal codes and court decisions shared with it; this demo does not search it.",
    },
  },
  related: {
    heading: "Stated by the source",
    govinfo: "Show records GovInfo lists as related",
    congress: "Show bills Congress.gov lists as related",
    loading: "Asking the source.",
    none: "The source lists no related records.",
    relationLine: (relation: string, source: string) =>
      `${source} lists this as: ${relation}`,
    identifiedBy: (by: string) =>
      `Identified by ${by}, as Congress.gov states.`,
    truncated: (shown: number, total: number) =>
      `Showing ${shown} of ${total} that the source lists. Open the official record for the rest.`,
  },
} as const;
