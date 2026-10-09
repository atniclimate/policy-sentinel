# GD-57 federal document access and reliability plan

Reviewed 2026-10-09 under D-091 and G-GENERAL-DEV-01. This is a collection-level
planning assessment, not a source activation, API integration, acquisition
manifest, rights clearance or release claim. Official documentation was read;
no provider API or policy-document request was made for this work. “Documented”
below means the publisher describes a capability. No new route is implemented or
live-tested in Policy Sentinel. The [GD-17 federal survey](../source-reviews/nationwide/federal-2026-10-07.md)
and [GD-31 closed packets](gd31-operation-packets.md) retain their gates.

## Collection and capability matrix

The state column uses `D` for documented by the linked publisher, `I` for
implemented in this repository, and `T` for tested against the provider in this
GD-57 session. `—` means no evidence of that state, not a failed provider.
Keyed GovInfo and Congress.gov routes are currently unavailable for dispatch
under their closed gates; no uniform OMB, agency-budget, or Supreme Court
population API was established by this review.
Search means a publisher search UI or documented API search, not a proven
complete population enumerator. Dates are collection ranges, not selected build
or emitted coverage.

| Family and collection | Origin, documented access and coverage | Capability state (D / I / T) | Condition, reliability and gap |
| --- | --- | --- | --- |
| Public laws: GovInfo `PLAW` slip laws | OFR/NARA prepares laws; GPO publishes. [PLAW help](https://www.govinfo.gov/help/plaw) documents public/private slip laws from the 104th Congress, keyword/field and identifier search, Congress/law-number package IDs, and PDF/HTML links. [GovInfo API](https://github.com/usgpo/api) offers keyed collection updates and package summaries; [sitemaps](https://www.govinfo.gov/sitemaps) offer collection/year discovery. | D: search, identifiers, rendition links, keyed update enumeration. I: generic GovInfo query/response/pagination contracts only. T: —. | The keyed route retains `G-B-GOVINFO`. Direct links do not establish API acceptance or current-law status. Enrolled bill text may precede slip-law publication; later corrections and republished bytes require version checks. No GD-57 request, latency, completeness or failure rate was measured. |
| Public laws: GovInfo `STATUTE` | OFR/NARA prepares the permanent Statutes at Large; GPO publishes. [Collection help](https://www.govinfo.gov/help/statute) documents 1789 onward, with digitized older volumes and USLM XML described from volume 117 (2003). [Sitemaps](https://www.govinfo.gov/sitemaps) list this collection. | D: browse, citation/package discovery and period-dependent formats. I/T: — for this collection. | Slip laws, bound statutes, and the separately maintained U.S. Code are different versions/products. Do not silently replace one with another or infer present legal effect. Earlier volume OCR/XML availability is not uniform. |
| Law and bill relationships: Congress.gov `law`/`bill` | Library of Congress API [bill endpoint documentation](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/BillEndpoint.md) describes law-number lookup and bill actions, related measures, titles and text-version links. Its [API overview](https://github.com/LibraryOfCongress/api.congress.gov) documents v3 JSON/XML, pagination and a key. | D: identifier lookup, metadata, action and text-version links. I: offline Congress contracts and fixtures. T: —. | `G-B-CONGRESS` remains closed for credentialed use. Congress.gov action dates, update dates and text update dates differ; links do not prove retrieved text or enacted status. The official coverage-date page could not be independently read in the prior survey, so historical field coverage remains unresolved. |
| Congressional bills and resolutions: GovInfo `BILLS` | Congress originates measures; GPO publishes versions. [BILLS help](https://www.govinfo.gov/help/bills) documents all *published* versions from the 103rd Congress, eight instrument types, version codes, daily release processing, PDF/HTML/XML where available, and keyword/field search. [Bulk bill text](https://www.govinfo.gov/developers) starts at the 113th Congress. | D: search, identifiers, versions, rendition links, bulk XML and keyed updates. I: generic GovInfo contracts only. T: —. | A published version is a separate record from a measure and from a law. Simple and concurrent resolutions are not enactments; joint resolutions require their actual action history. Bulk range is shorter than the collection range. Collection API use retains `G-B-GOVINFO`. |
| Congressional bills and resolutions: Congress.gov `bill` | [Official API repository](https://github.com/LibraryOfCongress/api.congress.gov) documents bill lists and v3 JSON/XML; [bill endpoint](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/BillEndpoint.md) covers actions, related bills and text-version format URLs. Defaults are 20 items, maximum 250 per page; documented key limit is 5,000 requests/hour. | D: metadata/identifier enumeration, actions, relationships, text-version discovery. I: offline contracts/fixtures, no live adapter. T: —. | `G-B-CONGRESS` and current host, terms and field-rights review precede requests. Text versions may lack a format; `updateDate` does not include text changes while `updateDateIncludingText` does. Documented historical records have missing fields. No population completeness or live pagination is proven. |
| President's proposed budget: OMB publications and GovInfo `BUDGET` | OMB originates the [current budget books](https://www.whitehouse.gov/omb/information-resources/budget/), [Appendix](https://www.whitehouse.gov/omb/information-resources/budget/appendix/), [Analytical Perspectives](https://www.whitehouse.gov/omb/information-resources/budget/analytical-perspectives/), [Historical Tables](https://www.whitehouse.gov/omb/information-resources/budget/historical-tables/) and [public budget database files](https://www.whitehouse.gov/omb/information-resources/budget/supplemental-materials/). [GovInfo BUDGET help](https://www.govinfo.gov/help/budget) documents FY 1996 onward, package/granule IDs, fiscal-year/agency/keyword search, PDFs and some XLS/CSV tables. | D: OMB document/table links and GovInfo search, package/granule discovery. I/T: — for budget-specific intake. | The President's request, later amendments, congressional resolutions, appropriations and enacted funding must remain distinct. GovInfo says formats and supporting books vary by year; granule hierarchy is not predictable. No general OMB population API or uniform machine-readable table coverage is established. Review each origin/format and its reuse before capture or excerpt. |
| Agency budget justifications | Each agency originates its own publication; [DOJ's budget page](https://www.justice.gov/doj/budget-and-performance) is one official example. OMB's books may link agency material, but this is a distinct source class. | D: selected agency document indexes. I/T: —. | No single complete cross-agency retrieval interface, cadence, format set or historical range is established. Select an exact agency and fiscal-year cohort only after publisher-specific review. Do not treat a proposal table as spending authority. |
| Congressional budget resolutions | Congress originates these as concurrent resolutions. The `BILLS`/Congress.gov routes above provide measure versions and actions; [GovInfo BILLS help](https://www.govinfo.gov/help/bills) distinguishes resolution types. | D: measure search, version and action routes. I: generic contracts. T: —. | Keep the resolution type and chamber action. A concurrent budget resolution is a congressional framework, not an enacted appropriation or a public law. The collection routes inherit their own credential and rights gates. |
| Lower federal court opinions: GovInfo `USCOURTS` | Issuing courts originate opinions; GPO receives them from the AOUSC. [USCOURTS help](https://www.govinfo.gov/help/uscourts) documents selected appellate, district, bankruptcy and national courts, generally since 2004, with incomplete early holdings, court/case field search and court-specific codes. [U.S. Courts](https://pacer.uscourts.gov/find-case/court-opinions) says participating courts provide free GovInfo access; PACER itself requires registration. | D: selected-court search, metadata and opinion links, keyed GovInfo package access. I: no court-specific adapter. T: —. | Participating court/year must be an explicit coverage dimension; a GovInfo miss is not a finding that no ruling exists. Redactions, removals at court direction, changed opinions and PII require exclusion/review. `G-B-GOVINFO` remains closed for keyed access. PACER is not a substitute free population API. |
| Supreme Court opinions: Court slip opinions and GovInfo `USREPORTS` | The [Court's opinion table](https://www.supremecourt.gov/opinions/slipopinions.aspx) posts term-specific slip PDFs and revisions; its [table definitions](https://www.supremecourt.gov/opinions/definitions.aspx) explain revisions and later United States Reports pagination. [GovInfo developer hub](https://www.govinfo.gov/developers) lists the Reports link service. | D: term index, docket/date/citation and PDF links; later bound-report route. I/T: —. | No documented Court population API or automated change feed was verified. Slip and final Reports text require separate version identities and correction checks. Court site access/reuse and item-specific redaction must be reviewed before a finite direct-document run. |

For GovInfo, the [official API repository](https://github.com/usgpo/api) documents
36,000/hour, 1,200/minute and 40/second default keyed limits, 429 responses, and
503 plus `Retry-After` while generating some ZIP/MODS files. These are provider
limits, not a proposed request budget. The [search service](https://www.govinfo.gov/features/search-service-overview)
documents `offsetMark` pagination and at most 1,000 results per page. Its
collection `lastModified` route is an update signal, not an immutable history or
completeness proof. GPO's [policies](https://www.govinfo.gov/about/policies)
warn that federal publications can contain third-party copyrighted material and
later PII redactions; issuer attribution and item-specific text/excerpt review
remain necessary. The [LOC API repository](https://github.com/LibraryOfCongress/api.congress.gov)
documents a key and 5,000/hour, while the prior [federal review](../source-reviews/nationwide/federal-2026-10-07.md)
records a more conservative Library site-use condition; resolve the exact runtime
host policy before any Congress.gov run. OMB and Court pages establish public
discovery, not a blanket automated-use or reproduction grant.

## Reliability and recovery evidence

There were zero GD-57 provider requests, bytes, observed response times, rate
limits, timeouts or payload validations. No endpoint is marked live-tested or
dispatch-ready by this matrix. Earlier exact GovInfo *direct-document* custody
and the roadless pilot prove only their recorded documents and dates; they do
not prove `PLAW`, `BILLS`, `BUDGET`, `USCOURTS`, the keyed API, Congress.gov API,
OMB population discovery or Court enumeration. Offline GovInfo and Congress.gov
fixtures establish parser expectations, not current upstream reliability.

A future source run must preserve collection and issuer IDs, official URL,
retrieval time, source update time when present, version/status and checksum for
each field and rendition. Fail closed on missing IDs, mismatched package/granule
parents, unsafe redirects, unexpected HTML, absent formats, truncated pages,
cursor loops, duplicate/reordered results, mutable bytes, permission changes and
PII-bearing content. Do not induce 429s to test limits. A provider failure can
use only a checksum-validated prior approved shard from the *same adapter*, with
its original as-of time and stale/degraded label; otherwise omit it and mark it
unavailable. This follows the existing [operation packet](gd31-operation-packets.md).

## Integration ownership and finite next packet

1. **GD-33** records nationwide source discovery; its federal rows should link
   these collection-specific coverage and format gaps. **GD-39** remains the
   Federal Register API owner; none of the collections above completes it.
   **GD-40** owns actual keyed GovInfo API integration, beginning with its
   existing FR acceptance and then versioned `PLAW`, `BILLS`, `BUDGET` and
   `USCOURTS` selectors. **GD-42** owns Congress.gov bill, law, action and text
   links. GD-41 and GD-43 retain their separate eCFR and Regulations.gov duties.
2. Add explicit successor ledger items **GD-58-FEDERAL-BUDGET-COLLECTION** and
   **GD-59-FEDERAL-COURT-OPINIONS** before implementing those families. GD-58
   owns OMB books/tables, agency-specific justification selection and budget
   status/units; GD-59 owns Court slip/final opinions, participating-court
   coverage and privacy. Both may reuse GD-40 collection transport after that
   route is actually accepted, but neither can inherit its rights or claim
   collection acceptance. Congressional budget resolutions remain with GD-42
   for actions and GD-40 for official text versions. Public-law version
   reconciliation spans GD-40 and GD-42 and needs one fixture before activation.
3. For each proposed collection, prepare a **new** finite manifest with exact
   official host, collection, Congress/fiscal year or court/term, date interval,
   identifiers, expected renditions, credential reference if applicable,
   per-request and aggregate byte limits, attempt count (including failed
   attempts and pagination), timeout, storage forecast and external namespace.
   Reuse the GD-31 ceilings only as a starting proposal; its rows permit **zero
   dispatch**. Recheck current source access, host policy, registration/terms,
   item-specific reuse, privacy projection and current managed-storage capacity
   first. Do not register a key, accept terms, select an arbitrary crawl, or
   spend an expired historical operation ID through this plan.
4. Validate one representative, one missing-field and one malformed synthetic
   case per collection, plus version/action distinctions, pagination and
   failure/LKG behavior. When its exact gate and manifest are resolved, a
   bounded live run must separately prove source response, immutable custody,
   normalization, offline search and replayable quotation with permitted
   output fields. Record requests, bytes, elapsed time, status/retry headers,
   gaps and source-health state. Only that evidence can advance each integration
   and eventually the five-API and release claims in the [GD-31 crosswalk](gd31-release-acceptance-crosswalk.md).

This packet adds no credential, raw corpus, private input, activation, remote
write or publication. The general-engine GD-27 release remains unaccepted.
