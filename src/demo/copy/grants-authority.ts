/** Strings for the Grants.gov authority citations panel (design section 3 T1.4). */
export const grantsAuthority = {
  title: "Authority Citations Stated by the Opportunity",
  listingsTitle: "Assistance Listings",
  listingsSource:
    "Assistance Listing numbers and titles as Grants.gov states them in the opportunity record.",
  listingsNone: "No Assistance Listing in the retrieved Grants.gov record.",
  passageTitle: "Authority Passage",
  passageFrom: (heading: string) =>
    `Quoted from the Grants.gov synopsis, at its heading "${heading}".`,
  noPassage: "No authority passage in the retrieved Grants.gov record",
  withheld:
    "The Grants.gov synopsis has an authority heading, but its passage is not shown here because it holds contact-shaped text. Read it at Grants.gov.",
  versionDate: (date: string) => `Grants.gov record version date: ${date}.`,
  versionDateNone: "Grants.gov states no version date for this record.",
  openOpportunity: "Open the opportunity at Grants.gov",
  citationsTitle: "Citations in the Passage",
  citationsNone:
    "No full U.S. Code or Public Law citation was found in the passage.",
  citationParsed: "Parsed from the quoted passage",
  coverage:
    "A forecast, a posted opportunity, and a stated authority citation are different things. This shows only what the opportunity record states. Appropriation, award, obligation, and disbursement are not covered.",
  loading: "Reading the Grants.gov opportunity record.",
  failed:
    "The Grants.gov opportunity record could not be read. Open the opportunity at Grants.gov.",
} as const;
