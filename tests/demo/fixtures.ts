/**
 * Synthetic documents shaped like the official renditions the demo reads.
 * They are invented text for tests, not copies of any provider response.
 */
import type { DemoCitation } from "../../src/demo/types";

export const FR_DOC_NUMBER = "2099-00001";

const LISTING_URLS = {
  "federal-register": "https://www.federalregister.gov/d/",
  govinfo: "https://www.govinfo.gov/app/details/FR-2099-01-05/",
  regulations: "https://www.regulations.gov/document/EX-",
  congress: "https://www.congress.gov/bill/119th-congress/house-bill/",
};

/** One synthetic listing of document `id` as the named source would return it. */
export function listing(
  sourceId: keyof typeof LISTING_URLS,
  id = FR_DOC_NUMBER,
  matchKey: string | null = `fr:${id}`,
): DemoCitation {
  return {
    sourceId,
    identifier: `${sourceId} ${id}`,
    title: `Example listing ${id}`,
    issuingBody: "Example Department",
    kind: "Notice",
    date: "2099-01-05",
    officialUrl: `${LISTING_URLS[sourceId]}${id}`,
    textUrl: null,
    retrievedAt: "2099-01-07T11:59:00.000Z",
    summary: null,
    textAvailable: false,
    matchKey,
  };
}

export const FR_HTML = `<html>
<head>
<title>Federal Register, Volume 99 Issue 1 (Monday, January 5, 2099)</title>
</head>
<body><pre>
[Federal Register Volume 99, Number 1 (Monday, January 5, 2099)]
[Proposed Rules]
[Pages 100-102]
From the Federal Register Online via the Government Publishing Office [www.gpo.gov]
[FR Doc No: ${FR_DOC_NUMBER}]


-----------------------------------------------------------------------

EXAMPLE DEPARTMENT

40 CFR Part 999

Example Water Quality Provisions

AGENCY: Example Department.

ACTION: Proposed rule.

-----------------------------------------------------------------------

SUMMARY: The Department proposes to revise its example water provisions.
The Department consulted with affected governments before drafting this
proposal, as described in the preamble.

DATES: Comments must be received on or before March 2, 2099. The final
rule would take effect on July 1, 2099.

FOR FURTHER INFORMATION CONTACT: Pat Example, 555-123-4567, pat@example.gov.

SUPPLEMENTARY INFORMATION:

I. Background

This action is authorized by 42 U.S.C. 7401 and implements part 131 of
40 CFR 131.10. The Department has reviewed Executive Order 13175 and
concludes that this proposal has Tribal implications, so it invites
government-to-government consultation with Indian Tribes.

The Department would rescind the earlier guidance and withdraw the
associated notice of interpretation.

[FR Doc. ${FR_DOC_NUMBER} Filed 1-2-99; 8:45 am]
BILLING CODE 0000-00-P
</pre></body>
</html>`;

export const FR_HTML_QUIET = `<html>
<head>
<title>Federal Register, Volume 99 Issue 2 (Tuesday, January 6, 2099)</title>
</head>
<body><pre>
[Federal Register Volume 99, Number 2 (Tuesday, January 6, 2099)]
[Rules and Regulations]
[Pages 200-201]
From the Federal Register Online via the Government Publishing Office [www.gpo.gov]
[FR Doc No: 2099-00002]


-----------------------------------------------------------------------

EXAMPLE DEPARTMENT

Example Fee Schedule

AGENCY: Example Department.

ACTION: Final rule.

-----------------------------------------------------------------------

SUMMARY: The Department adjusts the fees it charges for example
filings. The fee for a standard filing is unchanged.

SUPPLEMENTARY INFORMATION:

The adjustment applies to filings made after the effective date.

[FR Doc. 2099-00002 Filed 1-3-99; 8:45 am]
BILLING CODE 0000-00-P
</pre></body>
</html>`;

export const WA_HTML = `<!DOCTYPE html><html><body><div>H-0000.1</div><hr /><div style="font-weight:bold;text-align:center;">HOUSE BILL 1100</div><hr /><table><tr><td><div>State of Washington</div></td><td><div>69th Legislature</div></td><td><div>2025 Regular Session</div></td></tr></table><div><span>By</span>Representative Example</div><div><span>Prefiled 12/19/24.</span><span>Read first time 01/13/25.</span><span>Referred to Committee on Finance.</span></div><div>AN ACT Relating to an example local tax; and providing an effective date.</div><div>BE IT ENACTED BY THE LEGISLATURE OF THE STATE OF WASHINGTON:</div><div><span>NEW SECTION.</span><span>  </span><span>Sec. 1.  </span><span>The legislature finds that example local governments would benefit from consultation with affected governments before this section takes effect.</span></div><div><span>NEW SECTION.</span><span>  </span><span>Sec. 2.  </span><span>This act takes effect July 1, 2025.</span></div></body></html>`;

/**
 * Federal Register search rows trimmed from the response recorded on
 * 2026-10-20T11:32Z (conditions[type][]=PRORULE, two bounded calls). Public
 * metadata, kept as the field-shape fixture for the v2 citation fields.
 */
export const FR_PROBE_ROWS = [
  {
    document_number: "2026-19346",
    title:
      "Magnuson-Stevens Act Provisions; Fisheries Off West Coast States; Pacific Coast Groundfish Fishery; Pacific Coast Groundfish Fishery Management Plan; Amendment 38; 2027-28 Biennial Specifications and Management Measures",
    type: "Proposed Rule",
    publication_date: "2026-09-22",
    comments_close_on: "2026-10-22",
    docket_ids: ["Docket No. 260916-0002"],
    regulation_id_numbers: ["0648-BO46"],
    cfr_references: [
      { chapter: null, citation_url: null, part: "300", title: 50 },
      { chapter: null, citation_url: null, part: "660", title: 50 },
    ],
    topics: [
      "Fisheries",
      "Fishing",
      "Reporting and recordkeeping requirements",
    ],
    html_url:
      "https://www.federalregister.gov/documents/2026/09/22/2026-19346/magnuson-stevens-act-provisions-fisheries-off-west-coast-states-pacific-coast-groundfish-fishery",
  },
  {
    document_number: "2026-12955",
    title: "Process for Authorizing Seasonal Migratory Game Bird Hunting",
    type: "Proposed Rule",
    publication_date: "2026-06-26",
    comments_close_on: "2026-07-27",
    docket_ids: [
      "Docket No. FWS-HQ-MB-2024-0206",
      "FF09M32000-267-FXMB1231099BPP0",
    ],
    regulation_id_numbers: ["1018-BI04"],
    cfr_references: [
      { chapter: null, citation_url: null, part: "20", title: 50 },
    ],
    topics: [
      "Exports",
      "Hunting",
      "Imports",
      "Reporting and recordkeeping requirements",
      "Transportation",
      "Wildlife",
    ],
    html_url:
      "https://www.federalregister.gov/documents/2026/06/26/2026-12955/process-for-authorizing-seasonal-migratory-game-bird-hunting",
  },
];

/**
 * Synthetic Regulations.gov v4 document listing. Field names and types follow
 * the official OpenAPI file: commentEndDate is a nullable date-time and
 * docketId a string. The timestamp spellings are invented test values.
 */
export const REGULATIONS_V2_JSON = {
  data: [
    {
      id: "EX-2099-0001-0001",
      attributes: {
        title: "Example proposed rule, as the docket lists it",
        agencyId: "EX",
        documentType: "Proposed Rule",
        postedDate: "2099-01-05T05:00:00Z",
        frDocNum: FR_DOC_NUMBER,
        docketId: "EX-2099-0001",
        commentEndDate: "2099-03-02T23:59:59-05:00",
      },
    },
    {
      id: "EX-2099-0001-0002",
      attributes: {
        title: "Example supporting material",
        agencyId: "EX",
        documentType: "Supporting & Related Material",
        postedDate: "2099-01-06T05:00:00Z",
        frDocNum: null,
        docketId: "EX-2099-0001",
        commentEndDate: null,
      },
    },
  ],
  meta: { totalElements: 2 },
};

/**
 * Regulations.gov v4 document rows trimmed from bounded live calls at
 * 2026-10-24T00:48Z (DEMO_KEY): an exact docket lookup
 * (filter[docketId]=USCG-2024-0407, both rows) and a Proposed Rule type filter
 * (three of ten rows). Only the attributes the Worker reads are kept; public
 * metadata. Every commentEndDate stated is a UTC instant at 23:59:59 Eastern
 * (04:59:59Z in winter, 03:59:59Z in summer); docketId and commentEndDate can
 * be null; frDocNum can carry an en dash.
 */
export const REGULATIONS_LIVE_DOCKET_ROWS = [
  {
    id: "USCG-2024-0407-0005",
    attributes: {
      title: "Drawbridge Operation Regulation; Manitowoc River, Manitowoc, WI",
      agencyId: "USCG",
      documentType: "Proposed Rule",
      postedDate: "2026-10-22T04:00:00Z",
      frDocNum: "2026-21608",
      docketId: "USCG-2024-0407",
      commentEndDate: "2026-11-24T04:59:59Z",
    },
  },
  {
    id: "USCG-2024-0407-0001",
    attributes: {
      title: "Drawbridge Operation Regulation; Manitowoc River, Manitowoc, WI",
      agencyId: "USCG",
      documentType: "Rule",
      postedDate: "2025-05-21T04:00:00Z",
      frDocNum: "2025-09136",
      docketId: "USCG-2024-0407",
      commentEndDate: "2025-06-22T03:59:59Z",
    },
  },
];

export const REGULATIONS_LIVE_TYPE_ROWS = [
  {
    id: "FNA-2026-0496-0001",
    attributes: {
      title:
        "Supplemental Nutrition Assistance Program: Electronic Benefits Transfer Card Security Measures",
      agencyId: "FNA",
      documentType: "Proposed Rule",
      postedDate: "2026-10-23T04:00:00Z",
      frDocNum: "2026-21658",
      docketId: "FNA-2026-0496",
      commentEndDate: "2026-12-23T04:59:59Z",
    },
  },
  {
    id: "EPA-HQ-OW-1998-9208-0001",
    attributes: {
      title: "Streamlining the State Sewage Sludge Management Regulations",
      agencyId: "EPA",
      documentType: "Proposed Rule",
      postedDate: "2026-10-21T04:00:00Z",
      frDocNum: "97–5879",
      docketId: "EPA-HQ-OW-1998-9208",
      commentEndDate: null,
    },
  },
  {
    id: "FERC-2026-6178-0001",
    attributes: {
      title:
        "Authorizations for Certain Activities at Liquefied Natural Gas Plants",
      agencyId: "FERC",
      documentType: "Proposed Rule",
      postedDate: "2026-10-20T04:00:00Z",
      frDocNum: "2026-21443",
      docketId: null,
      commentEndDate: "2026-12-22T04:59:59Z",
    },
  },
];

/**
 * Grants.gov search2 answers trimmed from two bounded live calls at
 * 2026-10-24T01:08:35Z (keyword "climate", oppStatuses "forecasted|posted",
 * rows 10, startRecordNum 0): the first with eligibilities "07|11" (hitCount 9),
 * the second without (hitCount 50). Only the fields the Worker reads are kept;
 * public metadata. closeDate can be empty, a forecast says docType "forecast",
 * and a title can carry an HTML entity as Grants.gov wrote it.
 */
export const GRANTS_LIVE_TRIBAL = {
  errorcode: 0,
  data: {
    hitCount: 9,
    oppHits: [
      {
        id: "347414",
        number: "EDA-DISASTER-2023",
        title: "FY 2023 Disaster Supplemental",
        agency: "Economic Development Administration",
        agencyCode: "DOC-EDA",
        openDate: "04/24/2023",
        closeDate: "",
        docType: "synopsis",
      },
      {
        id: "363728",
        number: "P27AS00032",
        title:
          "Exploring and Enhancing Outdoor and Heritage Tourism in the Chesapeake Bay Watershed",
        agency: "National Park Service",
        agencyCode: "DOI-NPS",
        openDate: "08/27/2026",
        closeDate: "11/04/2026",
        docType: "synopsis",
      },
    ],
  },
};

export const GRANTS_LIVE_ANY = {
  errorcode: 0,
  data: {
    hitCount: 50,
    oppHits: [
      {
        id: "351231",
        number: "PDSITALYFY24",
        title: "U.S. Mission Italy PDS Annual Program Statement",
        agency: "U.S. Mission to Italy",
        agencyCode: "DOS-ITA",
        openDate: "11/30/2023",
        closeDate: "",
        docType: "forecast",
      },
      {
        id: "329436",
        number: "DE-FOA-0002265",
        title:
          "University Nuclear Leadership Program&ndash; Scholarship and Fellowship Support",
        agency: "Idaho Field Office",
        agencyCode: "DOE-ID",
        openDate: "10/15/2020",
        closeDate: "10/14/2030",
        docType: "synopsis",
      },
    ],
  },
};

export const FR_SEARCH_JSON = {
  count: 1,
  results: [
    {
      document_number: FR_DOC_NUMBER,
      title: "Example Water Quality Provisions",
      type: "Proposed Rule",
      agencies: [{ name: "Example Department" }],
      publication_date: "2099-01-05",
      html_url:
        "https://www.federalregister.gov/documents/2099/01/05/2099-00001/example",
      abstract:
        "The Department proposes to revise its example water provisions.",
      citation: "99 FR 100",
    },
  ],
};
