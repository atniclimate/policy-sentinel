/**
 * Synthetic documents shaped like the official renditions the demo reads.
 * They are invented text for tests, not copies of any provider response.
 */
export const FR_DOC_NUMBER = "2099-00001";

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
