# Grants.gov contract, terms, and reuse review

Accessed: 2026-07-31

Implementation state: primary-source research complete; adapter blocked; no
production records

External authorization: current API access or use constitutes acceptance of the
Grants.gov API terms, so Gate G-B-GRANTS remains closed

Safe fallback: omit Grants.gov records and show the source as unavailable while
independent sources continue

## Primary sources

- [Grants.gov API guide](https://www.grants.gov/api/api-guide)
- [Search opportunities endpoint](https://www.grants.gov/api/common/search2)
- [Fetch opportunity endpoint](https://www.grants.gov/api/common/fetchopportunity)
- [API terms and conditions](https://www.grants.gov/api/terms-conditions)
- [API status codes](https://www.grants.gov/api/status-codes)
- [API versioning](https://www.grants.gov/api/api-versioning)
- [XML extract landing page](https://www.grants.gov/xml-extract)
- [XML extract help and field guide](https://www.grants.gov/help/xml-extract/)
- [Search Grants help](https://www.grants.gov/help/search-grants/search-grants-tab)
- [View Grant Opportunity help](https://www.grants.gov/help/search-grants/view-grant-opportunity)
- [Related Opportunities help](https://www.grants.gov/help/search-grants/related-opportunities)
- [Create Synopsis help](https://www.grants.gov/help/grantors/create-synopsis)
- [Grant eligibility guidance](https://www.grants.gov/learn-grants/grant-eligibility)
- [External-site and copyright disclaimer](https://www.grants.gov/exit-disclaimer)

No live REST request was made. One bounded `HEAD` request to the current linked
XML ZIP returned `200`, `application/zip`, a 77,832,033-byte content length, and
an ETag, with no `Access-Control-Allow-Origin` header. No XML body, API response,
provider record, token, contact field, cache, or temporary artifact was
downloaded or persisted.

## Access and authorization

The current API guide documents these common endpoints as requiring neither
authentication nor authorization:

- `POST https://api.grants.gov/v1/api/search2`
- `POST https://api.grants.gov/v1/api/fetchOpportunity`

That no-key access does not make a live request authorized for this project.
The current terms state that access to or use of the API or its content
constitutes acceptance of the agreement. The owner has expressly kept new
provider-term acceptance closed. Policy Sentinel therefore made no REST request
and cannot validate or implement the adapter from live responses until the
owner approves the exact then-current terms and build-time operation.

The terms permit searching, displaying, analyzing, retrieving, and viewing
Grants.gov data, prohibit false representation, and reserve HHS's ability to
monitor, limit, temporarily or permanently block, change, or discontinue
access. Any approved future use must display this notice prominently:

> This product uses the Grants.gov API but is not endorsed or certified by the
> U.S. Department of Health and Human Services.

Linked agency announcements and attachments do not receive a blanket
reproduction grant through the API terms. The Grants.gov exit disclaimer says
Grants.gov cannot authorize use of copyrighted material on external sites.
Future public output must therefore remain metadata-, permitted-excerpt-, and
official-link-first unless document-specific rights are verified.

## Published REST shape

The `search2` documentation shows a JSON request containing `rows`, `keyword`,
`oppNum`, `eligibilities`, `agencies`, `oppStatuses`, `aln`, and
`fundingCategories`. Its sample response echoes additional search controls such
as `startRecordNum`, `sortBy`, `fundingInstruments`, `resultType`, `searchOnly`,
and `keywordEncoded`.

The documented sample response contains:

- envelope fields `errorcode`, `msg`, `token`, and `data`;
- `hitCount`, `startRecord`, and `oppHits`;
- result fields `id`, `number`, `title`, `agencyCode`, `agencyName`,
  `openDate`, `closeDate`, `oppStatus`, `docType`, and `alnist`;
- status, date-range, eligibility, category, instrument, and agency option
  collections; and
- suggestion, access-key, and error-message fields.

The `fetchOpportunity` documentation shows a request with one
`opportunityId`. Its explicitly sample-only response includes opportunity and
agency identity, synopsis metadata and text, dates, award amounts, applicant
types, funding instruments and categories, assistance listings, attachments,
document links, changes, related opportunities, packages, version history, and
status.

There is no current formal OpenAPI document or normative response schema on the
cited REST pages. The samples are not a sufficient contract for a production
parser. A future adapter must whitelist only reviewed public fields and discard
unknown additions.

## Contract gaps requiring an approved live canary

The official documentation does not establish:

- a maximum `rows` value, stable ordering, a complete pagination algorithm, or
  a result-completeness guarantee;
- a single consistent request spelling for `keyword` versus `keywords`;
- an unambiguous multi-status encoding;
- consistent example identifiers between the JSON and summary table;
- forecast-versus-synopsis nullability;
- canonical current-deadline and time-zone behavior;
- a canonical public opportunity-detail URL field; or
- a guaranteed historical start or complete archive.

The API landing page describes `search2` in terms of open packages while the
examples and search help also describe forecasted, closed, and archived
statuses. One published curl example contains an empty JSON key. The XML help
and the linked OpportunityDetail schema also disagree over which record type
carries `CloseDate`.

These gaps cannot be resolved by inventing a synthetic provider contract.
After an exact terms approval, bounded live canaries must establish request
shape, pagination, nullability, status transitions, dates, canonical URLs, and
failure behavior before adapter implementation.

## Proposed public-field boundary

A future approved adapter may evaluate an allowlist containing:

- opportunity ID and number;
- official title;
- agency code and name;
- exact source status and document type;
- posted, original close, current close, archive, and source-update dates;
- exact source deadline explanation and time zone when supplied;
- assistance-listing numbers and titles;
- exact applicant-eligibility codes and descriptions;
- exact funding-category and funding-instrument labels;
- source-supplied synopsis metadata or a permitted short excerpt; and
- a validated official opportunity URL.

The adapter must not retain the response `token`, `accessKey`, search echoes,
`publisherUid`, contact names, addresses, phone numbers, email addresses,
notification flags, application-package data, attachment bodies, unrelated
attachment metadata, or raw responses. Attachments and outside-agency
documents remain links only until separately reviewed.

## Eligibility and Nation evidence

The current official code table defines:

- `07`: Native American tribal governments, federally recognized;
- `11`: Native American tribal organizations other than federally recognized
  Tribal governments; and
- `99`: unrestricted, subject to additional eligibility clarification.

These are general applicant classes. They do not name a Nation, prove that a
specific Nation qualifies, create a Nation-to-record relationship, or establish
Policy Sentinel relevance. The official announcement and its additional
eligibility language control actual eligibility.

The general eligibility guidance and machine-code descriptions are not fully
aligned for non-federally recognized Tribal entities. A future adapter must
preserve the exact returned code and label without reconciling or reinterpreting
them. Every Grants.gov record remains `general_jurisdiction` unless an official
source field supplies exact Nation evidence under the shared relationship
contract.

## Status, dates, and deterministic urgency

Official search help defines `Forecasted` as planned and not guaranteed to
become an announcement, `Posted` as open, `Closed` as past its due date, and
`Archived` as a historical closed announcement. Preserve those exact source
states rather than converting them into legal or eligibility conclusions.

Official detail guidance distinguishes original and current close dates,
supports a blank close date with an explanation, and describes both automatic
and manual archive behavior. Related opportunities and version history can
change. A future record must retain original and current values, source update
time, version/history evidence, and any exact deadline narrative.

Urgent-deadline behavior cannot be implemented from a date alone when the
source time zone or deadline explanation is absent. After contract validation,
urgency must be a deterministic comparison against the exact current deadline
and explicit source time zone, with boundary tests. It must never be an AI or
keyword score.

## Rate, version, and failure behavior

No numeric request quota was found in the cited current documentation. The
status-code page documents `400`, `401`, `402`, `403`, `404`, `429`, `500`,
`502`, `503`, and `504`, and recommends exponential backoff for `429`.

The versioning policy places the major version in `/v1/`, reserves a new major
for breaking changes, treats added fields as non-breaking, and promises support
for at least one prior major. A future parser must ignore unrequested additions
but fail closed on required-field, type, pagination, count, status, or date
drift. Only a checksum-validated prior public shard may serve as
last-known-good; with none, the source stays unavailable.

## Cadence, range, and static delivery

Opportunities can change throughout their lifecycle. The XML extract is
described as a daily snapshot of the current active grants database, and its v2
form includes forecasts and omits empty elements. The download page exposes
recent daily files but promises neither an earliest date nor historical
completeness. Grants.gov's establishment in 2002 is not proof of a complete
machine-readable range from that date.

The XML snapshot is not a safe way around the authorization or contract
problem. It is approximately 77.8 MB compressed, includes personal grantor
contact fields, lacks a separately documented reuse contract on the cited
pages, and has its own field-shape discrepancy. It must remain unused unless
the owner approves the exact operation and a privacy-, volume-, schema-, and
terms-reviewed ingestion design.

Any future access is build-time only. The public application must never call
Grants.gov from the browser, regardless of observed CORS behavior. Coverage
must disclose the measured loaded range and limitations rather than claiming a
complete archive.

## Disposition

Primary-source research is complete, but the current no-registration assumption
did not pass. `B4-GRANTS-ADAPTER` remains a visible source block behind
G-B-GRANTS. No synthetic fixture can substitute for the undocumented live
contract details listed above. Independent local work continues, and a future
owner approval would authorize only the exact Grants.gov terms and build-time
operation recorded on that source-scoped gate.
