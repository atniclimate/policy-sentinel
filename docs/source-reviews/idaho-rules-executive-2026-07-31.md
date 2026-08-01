# Idaho administrative-rulemaking and executive-order source review

Accessed: 2026-07-31

Implementation state: evidence-blocked in source-registry 1.17.0; both sources
registered independently, disabled, and configured with `adapter: null`; no
production records

External authorization: no account, key, terms acceptance, provider contact,
or paid operation is required or authorized for the reviewed public indexes.
No stable record contract or document-reproduction grant was found.

## Primary sources

- [Idaho Administrative Rules](https://adminrules.idaho.gov/)
- [Index of Active Rulemaking](https://proddfmmainsa.blob.core.windows.net/dfm-admin-website/standalone/AbridgedIX.pdf)
- [Idaho Governor executive orders](https://gov.idaho.gov/executive-orders/)
- [Governor robots policy](https://gov.idaho.gov/robots.txt)
- [Idaho legal notices](https://idaho.gov/legal-notices/)
- [Idaho privacy policy](https://idaho.gov/privacy-policy/)

The Office of Administrative Rules Coordinator in the Division of Financial
Management is the originating administrative-rules publisher. The Office of
the Governor is the originating executive-order publisher. These are separate
sources with independent future range, health, and last-known-good behavior.

## Access and publication boundary

The reviewed public pages require no key or login and publish no numeric rate
limit, retry rule, API schema, checksum contract, SLA, or change feed. The
administrative-rules site did not return a usable robots policy: its
`robots.txt` redirected to an official blob path that returned `BlobNotFound`.
The Governor robots policy disallows `/wp-admin/` and permits its AJAX route;
the reviewed public order index is not disallowed. Robots evidence is not a
reuse license.

The Idaho legal notice reserves copyrights and trademarks and supplies no bulk
document-reproduction grant. The privacy policy describes collection of
technical visit information and warns that linked sites can have separate
policies. The registry therefore permits only exact metadata and reviewed
official links after a complete source contract; it does not permit copied rule
or order bodies, attachments, comments, personal/contact content, or land
material. No provider cookie value was retained, replayed, or written to the
repository.

## Administrative Rules publisher claims

The official landing page describes:

- current administrative rules and annual archives through 1996;
- monthly Idaho Administrative Bulletins and archives through 1995;
- a cumulative rulemaking index beginning July 1, 1993;
- executive orders published in the Bulletin and archived annually; and
- rule History Notes that identify the docket, affected sections, Bulletin
  volume, and final effective date.

Those statements establish publisher identity and holdings, not one complete
machine-readable range. Every relevant HTML search or listing view displayed a
temporary technical-issue notice during the review. Bounded query parameters
for search term, page size, page number, agency, document type, currentness,
sort, and year only navigated the HTML page; no documented API or record rows
were available. Exact continuity, paging, fields, identifiers, dates, links,
and failure behavior therefore could not be validated.

## Active-rulemaking PDF observation

The landing page links a fixed official blob path for the `Index of Active
Rulemaking`. A temporary inspection copy was used only for structural and
visual review, then removed. The observed file was:

- 474,383 bytes, `application/pdf`, 19 letter-size tagged pages, with no form,
  encryption, JavaScript, or attachment;
- SHA-256
  `e2060a6e6c40bd4dceed5d0cae75d34ca22f656ca0c770c083ac7371cc66ba6a`;
- last modified on 2026-07-01 according to both PDF and HTTP evidence; and
- labeled by the document as the July 1, 2026, volume 26-7 abridged index for
  active rulemakings from April 4, 2025 through July 1, 2026.

The blob also advertised `x-ms-meta-publish_date: 2027-07-01`, which is in the
future and conflicts with both the document and its `Last-Modified` value. That
metadata cannot establish publication or data-as-of time.

The document says it includes all active rulemakings and explains exact labels
for pending legislative review, legislatively adopted effective dates,
temporary effective dates, and concurrent-resolution action. Its hierarchy is
agency IDAPA number and name, chapter ID and title, then docket lifecycle rows
with stage, Bulletin volume, and sometimes effective, termination,
supersession, or legislative-action notation.

Visual review covered all 19 rendered pages. Text extraction identified 491
docket-stage rows for 189 unique docket identifiers; 108 identifiers appeared
in multiple stages, with as many as six rows for one docket. Extraction also
changed spacing and some glyphs, so the parsed text is not a lossless record
contract. The PDF contained 724 URI annotations, all targeting the official
administrative-rules host, but 55 used plain HTTP. A future adapter could not
publish those links without separately proving an exact canonical HTTPS
equivalent.

The fixed PDF mutates monthly and supplies a report-oriented hierarchy rather
than a versioned row schema. Correctly normalizing one docket would require
complete stage ordering, corrections, effective dates, legislative action,
termination, supersession, source-update time, and link relationships. Parsing
visual layout or extracted text without those guarantees would be an opaque
PDF scraper. The temporary HTML outage also prevents reconciliation to the
official document listings. No administrative-rulemaking adapter is viable.

## Governor executive-order observation

A bounded in-memory parse of the official index found 83 primary rows under
2019 through 2026 year headings:

| Year heading | Primary rows |
| --- | ---: |
| 2019 | 15 |
| 2020 | 20 |
| 2021 | 12 |
| 2022 | 6 |
| 2023 | 3 |
| 2024 | 13 |
| 2025 | 8 |
| 2026 | 6 |

The primary identifiers were unique and ranged in display order from `2026-06`
to `2019-01`. All primary links targeted PDFs on the Governor host. This is an
observed inventory, not a completeness or exact-date range: the page gives no
prior-governor claim, complete historical statement, issuance dates, source
update time, or uniform per-order status.

The source contains material relationship and field gaps:

- one primary row, `2026-01`, has no title and only says it repeals and replaces
  `2025-05`;
- 17 primary rows have free-text repeal, replacement, or amendment notes;
- four rows contain more than one linked rendition or relationship target;
- the displayed text contains the source typo `Executive Ord-er 2025-06`;
- four primary files use upload-folder years that differ from the order-number
  year; and
- the index continues to list replaced and repealed orders, so presence does
  not mean active or current.

Header-only checks of four representative PDFs confirmed official PDF targets
but did not retrieve their bodies. Their `Last-Modified` dates did not reliably
match the order-number year, and neither the upload path nor file timestamp can
be converted into an issuance date. Raw page bytes also varied across requests,
so a whole-page hash is not a stable source checksum.

The normalized record requires an exact official title, date, source status,
status-as-of value, and official link. The index cannot supply those fields for
every row and does not prove that its free-text relationship notes form a
complete amendment/repeal history. Fetching and interpreting all order PDFs
would introduce a separate body, privacy, date, status, relationship, request,
and reproduction contract that this review does not authorize. No Governor
adapter is viable.

## Governance, health, and failure

Neither source exposes a controlled policy-subject field. Any future eligible
state record remains `Unclassified` and `general_jurisdiction` unless exact
separate official evidence satisfies the binding mapping and Nation-evidence
contracts. Docket text, agency, chapter, title, order number, subject matter,
geography, or document body cannot create a category, Nation association,
legal-effect conclusion, or rights determination.

The sources remain independent health and last-known-good boundaries. If one
later gains a viable contract, it must have source-specific request, byte,
item, parsing, deadline, privacy, link, date, status, relationship, range, and
atomic-failure tests. A disabled source emits no record, coverage, provenance,
health, manifest membership, or last-known-good shard and cannot borrow data or
health from another Idaho source.

## Decision

Source-registry 1.17.0 records
`idaho-administrative-rulemaking-index` and
`idaho-governor-executive-orders` as disabled `official_index` sources with
`adapter: null`, null exact-date coverage, metadata-and-links-only intent, no
subject mappings, and no public output.

B8's feasibility work closes with dated evidence. Its adapter item closes
through the accepted no-viable-source fallback: the implementation does not
substitute Idaho legislative scraping, an opaque PDF scraper, file timestamps,
or inferred status. Reopen a source only after a stable permitted official
contract supplies every required field and passes source-specific validation.
