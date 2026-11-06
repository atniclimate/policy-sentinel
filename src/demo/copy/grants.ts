/** Grants.gov strings, shown on Results pane rows and the eligibility filter. */
export const grants = {
  /** Grants.gov eligibility labels for codes 07 and 11, verbatim as its API returns them. */
  labels: [
    "Native American tribal governments (Federally recognized)",
    "Native American tribal organizations (other than Federally recognized tribal governments)",
  ],
  filterLabel:
    "Only Grants.gov opportunities listed for Tribal governments or Tribal organizations",
  filterHelp:
    "Applies to Grants.gov only. It asks Grants.gov for opportunities listed under either eligibility category: Native American tribal governments (Federally recognized); Native American tribal organizations (other than Federally recognized tribal governments). Other sources are searched without it.",
  /** The filter's statement on a row: the search does not say which of the two categories the row has. */
  listedUnder:
    "Found with the Grants.gov eligibility filter: listed by Grants.gov under at least one of: Native American tribal governments (Federally recognized); Native American tribal organizations (other than Federally recognized tribal governments). This search does not show which.",
  filterApplied:
    "Eligibility filter applied: Tribal governments or Tribal organizations, in Grants.gov's own categories.",
  submittedFilter:
    "Grants.gov eligibility filter: Tribal governments or Tribal organizations.",
  limit:
    "An eligibility listing is the posting agency's statement of who may apply. It is not a determination for any Nation. Read the opportunity's eligibility section at Grants.gov.",
  /** Required by the Grants.gov API terms wherever its rows appear. */
  attribution:
    "This product uses the Grants.gov API but is not endorsed or certified by the U.S. Department of Health and Human Services.",
} as const;

export const grantsDatesSkipped =
  "Grants.gov was not searched: the demo does not send it a date range. Clear the dates to search it.";
