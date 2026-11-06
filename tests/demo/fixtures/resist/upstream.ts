/**
 * Synthetic upstream records for the ATNI-ResIST compatibility test
 * (tests/demo/resist-compat.test.ts). They are invented text shaped like the
 * official answers each adapter reads, so the Worker returns answers shaped
 * like ResIST's recorded fixtures: a Federal Register search with five
 * results of 10,000, one read with five issue types, and one search each on
 * the other sources ResIST offers. No provider content is copied.
 */

export const RESIST_FR_DOC = "2099-00301";

/** Search words as a person might type them; ResIST squashes the spaces before sending. */
export const RESIST_QUERY = "  example   consultation procedures ";

/** Congress.gov looks up one bill by reference. */
export const RESIST_BILL_QUERY = "hr 4321 119";

/**
 * Federal Register documents.json rows. The first is the one read. Some rows
 * carry the version 2 fields, which a version 1 answer must leave out.
 */
export const RESIST_FR_SEARCH = {
  count: 10000,
  results: [
    {
      document_number: RESIST_FR_DOC,
      title: "Example Consultation Procedures",
      type: "Rule",
      agencies: [{ name: "Example Department" }],
      publication_date: "2099-02-02",
      html_url:
        "https://www.federalregister.gov/documents/2099/02/02/2099-00301/example-consultation-procedures",
      abstract:
        "The Department revises the example procedures it follows before it issues a rule.",
      citation: "99 FR 3010",
      docket_ids: ["Docket No. 990202-0001"],
      regulation_id_numbers: ["0000-AA01"],
      cfr_references: [
        { chapter: null, citation_url: null, part: "999", title: 50 },
      ],
      topics: ["Example procedures"],
    },
    {
      document_number: "2099-00302",
      title: "Example Program Eligibility Notice",
      type: "Notice",
      agencies: [{ name: "Example Department" }, { name: "Example Bureau" }],
      publication_date: "2099-02-03",
      citation: "99 FR 3105",
    },
    {
      document_number: "2099-00303",
      title: "Example Habitat Standards",
      type: "Proposed Rule",
      agencies: [{ name: "Example Agency" }],
      publication_date: "2099-02-04",
      citation: "99 FR 3220",
      comments_close_on: "2099-04-05",
      docket_ids: ["EX-2099-0004"],
      regulation_id_numbers: ["0000-AA02"],
      cfr_references: [
        { chapter: null, citation_url: null, part: "998", title: 50 },
      ],
      topics: ["Example habitat"],
    },
    {
      document_number: "2099-00304",
      title: "Example Proclamation",
      type: "Presidential Document",
      agencies: [],
      publication_date: "2099-02-05",
      citation: "99 FR 3301",
    },
    {
      // No citation yet: the identifier is "FR Doc. 2099-00305" alone.
      document_number: "2099-00305",
      title: "Example Correction",
      type: "Rule",
      agencies: [{ raw_name: "EXAMPLE OFFICE" }],
      publication_date: "2099-02-06",
    },
  ],
};

/** GovInfo text of the first row, in the Federal Register HTML rendition. */
export const RESIST_FR_HTML = `<html>
<head>
<title>Federal Register, Volume 99 Issue 22 (Monday, February 2, 2099)</title>
</head>
<body><pre>
[Federal Register Volume 99, Number 22 (Monday, February 2, 2099)]
[Rules and Regulations]
[Pages 3010-3012]
From the Federal Register Online via the Government Publishing Office [www.gpo.gov]
[FR Doc No: ${RESIST_FR_DOC}]


-----------------------------------------------------------------------

EXAMPLE DEPARTMENT

50 CFR Part 999

Example Consultation Procedures

AGENCY: Example Department.

ACTION: Final rule.

-----------------------------------------------------------------------

SUMMARY: The Department revises the example procedures it follows before
it issues a rule.

DATES: This rule is effective March 4, 2099.

SUPPLEMENTARY INFORMATION:

I. Background

The Department reviewed this rule under Executive Order 13175 and held
government-to-government consultation sessions before it was drafted.

II. Discussion

The revised procedures describe how Tribal governments may ask the
Department for a meeting about a rule it is developing.

[FR Doc. ${RESIST_FR_DOC} Filed 1-30-99; 8:45 am]
BILLING CODE 0000-00-P
</pre></body>
</html>`;

/** GovInfo search: a Federal Register granule and a plain package, no offsetMark. */
export const RESIST_GOVINFO_SEARCH = {
  count: 2,
  results: [
    {
      packageId: "FR-2099-02-02",
      granuleId: RESIST_FR_DOC,
      title: "Example Consultation Procedures",
      governmentAuthor: ["Example Department"],
      collectionCode: "FR",
      dateIssued: "2099-02-02",
    },
    {
      packageId: "EXAMPLE-2099-0001",
      title: "Example Annual Report on Consultation",
      governmentAuthor: ["Example Bureau"],
      collectionCode: "EXAMPLE",
      dateIssued: "2099-01-15",
    },
  ],
};

/** Regulations.gov v4 documents listing. */
export const RESIST_REGULATIONS_SEARCH = {
  data: [
    {
      id: "EX-2099-0003-0001",
      attributes: {
        title: "Example consultation procedures, as the docket lists them",
        agencyId: "EX",
        documentType: "Rule",
        postedDate: "2099-02-02T05:00:00Z",
        frDocNum: RESIST_FR_DOC,
        docketId: "EX-2099-0003",
        commentEndDate: null,
      },
    },
  ],
  meta: { totalElements: 1 },
};

/** Congress.gov v3 bill record for RESIST_BILL_QUERY. */
export const RESIST_CONGRESS_BILL = {
  type: "HR",
  number: "4321",
  congress: 119,
  title: "Example Consultation Improvement Act",
  introducedDate: "2025-03-04",
  originChamber: "House",
  latestAction: { text: "Referred to a committee." },
};
