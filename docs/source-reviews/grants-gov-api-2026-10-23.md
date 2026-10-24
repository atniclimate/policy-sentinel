# Grants.gov search2 and fetchOpportunity

Access date: 2026-10-23 (Pacific); the two live calls ran at 2026-10-24
00:56 UTC. Candidate source for federal funding opportunities (the FY27 Tribal
Community Resilience staff task in `docs/PLAN.md`). Added to the local demo
on 2026-10-23 as a search source with an optional Tribal eligibility filter
(two more bounded calls at 01:08 UTC). Not in the engine; the Worker change is
not deployed and needs the owner's approval.

## Originating URLs (read 2026-10-23)

- <https://grants.gov/api/api-guide>, <https://grants.gov/api/common/search2>,
  <https://grants.gov/api/common/fetchopportunity>,
  <https://grants.gov/api/status-codes>, <https://grants.gov/api/terms-conditions>.
- Publisher: Grants.gov (HHS) on behalf of the grant-making agencies. It is the
  originating system for the opportunity posting.

## Interface

- `POST https://api.grants.gov/v1/api/search2` and
  `POST https://api.grants.gov/v1/api/fetchOpportunity`. No key or registration.
- No numeric rate limit is documented; 429 means back off. Both live responses
  sent `access-control-allow-origin: *`.
- search2 body used: `{rows, keyword, eligibilities: "07", oppStatuses: "posted"}`.
  Hits (`data.oppHits[]`) carry `id, number, title, agencyCode, agency, openDate,
  closeDate, oppStatus, docType, cfdaList`. The documentation names `agencyName`
  and `alnist`; the live response uses `agency` and `cfdaList`.
- fetchOpportunity `data.synopsis` carries `applicantTypes[] {id, description}`,
  `applicantEligibilityDesc` (the "Additional Information on Eligibility" text),
  `estimatedFunding`, `numberOfAwards`, `awardCeiling`, `awardFloor`,
  `costSharing`, `postingDate`, `responseDateDesc`, `lastUpdatedDate`. It also
  carries agency contact names, phones and emails, which must never be kept.
- Official page per opportunity: `https://www.grants.gov/search-results-detail/<id>`
  (seen on grants.gov through Parallel Search).

## Eligibility labels, exactly as the live API returns them

| Code | Label |
| --- | --- |
| 07 | Native American tribal governments (Federally recognized) |
| 11 | Native American tribal organizations (other than Federally recognized tribal governments) |
| 08 | Public housing authorities/Indian housing authorities |
| 25 | Others (see text field entitled "Additional Information on Eligibility" for clarification) |

The other codes (00 to 23) name state, local, school, higher education,
nonprofit, business and individual applicants. The documentation pages word
these labels differently; only the live strings above are verbatim.

## Terms

- "You may use the Grants.gov API to search, display, analyze, retrieve, view".
- Required attribution, shown prominently: "This product uses the Grants.gov API
  but is not endorsed or certified by the U.S. Department of Health and Human
  Services."
- "You may not modify or falsely represent content accessed through the API".

## Limits for display

An eligibility label is the posting agency's statement of who may apply to that
opportunity. It is never a determination about any Nation. Show the label and
`applicantEligibilityDesc` as source wording, with the opportunity's official
link. A posted award ceiling or estimate is not an award, obligation or
disbursement.
