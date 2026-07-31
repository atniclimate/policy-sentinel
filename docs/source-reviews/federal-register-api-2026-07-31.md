# Federal Register API contract and reuse review

Accessed: 2026-07-31

Implementation state: adapter and bounded artifact integration implemented
locally; registered disabled; no production records

External authorization: none required for the documented public API

Activation gate: source-specific evidence gate G-J remains closed until the
adapter, fixtures, health behavior, provenance, and integrated artifact pass

## Primary sources

- [Federal Register API documentation](https://www.federalregister.gov/developers/documentation/api/v1)
- [Current OpenAPI 3.0 document](https://www.federalregister.gov/api/v1/documentation.json)
- [Federal Register API legal-status statement](https://www.federalregister.gov/developers/documentation/api/v1#legal-status)
- [Federal Register site policy and OFR procedures](https://www.federalregister.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site)
- [1 CFR 2.6, unrestricted reproduction](https://www.ecfr.gov/current/title-1/chapter-I/part-2/section-2.6)
- [Office of the Federal Register reuse FAQ](https://www.archives.gov/federal-register/faqs)
- [GovInfo Federal Register collection help](https://www.govinfo.gov/help/fr)
- [GovInfo policies](https://www.govinfo.gov/about/policies)
- [GovInfo authentication](https://www.govinfo.gov/about/authentication)
- [Incorporation by reference guidance](https://www.archives.gov/federal-register/write/ibr)
- [FederalRegister.gov robots policy](https://www.federalregister.gov/robots.txt)

The OpenAPI response was observed as `200 application/json; charset=utf-8`,
229,602 UTF-8 bytes, with SHA-256
`eaae3dbc5a2acc60267ecd597ab074cd08eb0555ebd8024bfa65912f412f2cde`.
The hash is evidence for this review, not a production pin: the document
contains mutable agency and topic enumerations. The adapter must instead
validate a small required projection of paths, parameters, fields, and enums.

## Official contract

The API is rooted at `https://www.federalregister.gov/api/v1/`. Relevant
documented routes are:

| Route | Intended use |
|---|---|
| `GET documents.json` | Published-document discovery since 1994 |
| `GET documents/{document_number}.json` | One exact document |
| `GET documents/{comma-separated-document_numbers}.json` | Bounded exact-document reconciliation |
| `GET documents/facets/{facet}.json` | Count reconciliation by a documented facet |
| `GET issues/{publication_date}.json` | Print-edition table of contents |
| `GET agencies` and `GET agencies/{slug}` | Agency vocabulary and detail |

The OpenAPI path for facets omits the format suffix. The live route without
`.json` returned `404 text/html`; the `.json` route returned JSON. Production
code must use the verified `.json` form and fail on an unexpected content type.
Public-inspection endpoints and records are outside this adapter.

The search operation documents:

- explicit `fields[]`;
- `per_page`, documented as 1 through 1,000;
- `page`;
- `order`, including `oldest` and `newest`;
- publication and effective date conditions;
- agency, document type, presidential document, docket, RIN, section, topic,
  significant-action, CFR title/part, and proximity filters.

Production discovery will use only inclusive publication-date `gte` and `lte`,
an explicit field allowlist, `order=oldest`, and `per_page=1000`. Query type
codes (`RULE`, `PRORULE`, `NOTICE`, and `PRESDOCU`) differ from returned display
values. Parameters are generated and validated locally; the live service
silently defaults several invalid values.

## Whitelisted discovery fields

The current OpenAPI lists 56 possible document fields but supplies no
response-body schema. Default search results omit fields needed for corrections,
dates, subjects, and relationships. Repository-owned response contracts must
cover only this proposed discovery allowlist:

```text
document_number
title
type
subtype
abstract
action
dates
publication_date
effective_on
comments_close_on
signing_date
citation
volume
start_page
end_page
agencies
agency_names
docket_ids
regulation_id_numbers
topics
cfr_topics
cfr_references
correction_of
corrections
related_documents
disposition_notes
html_url
pdf_url
json_url
mods_url
```

Presidential identifiers may be added only with a tested record need.
Discovery must not request or retain generated search excerpts, images, image
metadata, page views, raw full text, comments, or amendatory content.

Historical agency objects are not uniform. A 1994 record contained an agency
with only `raw_name`. The contract therefore requires exact source agency
language and treats normalized agency IDs, names, slugs, parent IDs, and URLs as
optional.

The same 1994-01-03 sample returned `citation: null` on 10 of 105 documents and
included CFR references with `chapter: 0` and `part: null`. Those values are
valid historical source shapes, not evidence of a citation or CFR part. The
response contract accepts them exactly; normalization never substitutes a
citation or CFR label for an unavailable value.

Ten records in that sample also used the paired page sentinel `start_page: 0`
and `end_page: 0`. The contract accepts only that exact zero pair or ordered
positive page bounds; it rejects partial-zero and reversed ranges.

The 1994-01-03 search also returned 11 records with the exact historical source
type `Uncategorized Document`; seven supplied neither `agencies` nor
`agency_names`. Those records remain inside source-count, identifier-replay,
issue, and relationship reconciliation, but they are not eligible public-record
candidates under the MVP rule that rejects unsupported document types. The
adapter normalizes only `Notice`, `Rule`, `Proposed Rule`, and
`Presidential Document`, requires an exact source-supplied issuing body, and
never invents a placeholder agency.

## Pagination and deterministic slicing

The former repository claim that the API exposes only 2,000 results is no
longer accurate. On 2026-07-31:

- a January 2026 query reported 2,005 records and returned page 3 at 1,000
  records per page;
- a March 2026 query reported 2,175 records;
- a January through June query reported 10,000 records and ten pages;
- the corresponding bounded 2026 yearly facet reported 15,271 records through
  July 31; and
- page 11 at 1,000 records per page returned `400 application/json` with the
  message that no more than 10,000 items may be requested at once.

The full 1994-01-03 through 2026-07-31 daily facet contained 11,898 issue dates
and reported 1,005,337 documents, with a maximum of 344 on one date. This is a
source-scale observation, not authorization to emit a million-record static
artifact.

The B4-FR-UX measurement used rolling calendar windows ending 2026-07-31. The
daily facet reported 1,057 documents for 14 days, 2,319 for 31 days, 4,525 for
60 days, 6,844 for 90 days, 13,266 for 180 days, and 24,504 for 365 days. A
scan of all available daily counts found the largest inclusive 31-day window
at 3,442 documents for 1998-03-16 through 1998-04-15. These are unfiltered
provider counts, so they conservatively include historical types that cannot
become public records.

The versioned beta policy therefore selects the most recent 31 calendar days,
inclusive, clamps the beginning to the documented source start, and fails
before search when the daily facet exceeds 4,000 documents. It never trims
individual records to fit. The normalized record and public coverage artifact
carry the selected range; the coverage artifact separately carries the
documented provider range and the earliest/latest validated record actually
emitted. A healthy bounded build is labeled `limited`, not complete or
1994-present.

Reciprocal correction relationships are kept as graph components. If an
otherwise eligible in-window record belongs to a correction component whose
reciprocal member falls outside the selected window, the in-window component is
also omitted. The build records the exact number of these boundary exclusions
in its coverage limitation instead of leaving a dangling relationship or
silently implying completeness.

An in-memory 1994-01-03 packaging sample used the 94 eligible normalized
records from the live canary. Re-measurement against artifact package `1.1.0`
and its additive compact fields produced a 183,051-byte index, 2,030,738 bytes
of detail assets, a 26,702-byte largest detail, 370,527 bytes of initial
non-detail assets, and 2,401,265 total hashed-asset bytes. No response,
normalized record, artifact, cache, or temporary file was persisted.
Extrapolating the measured bytes per record to the 3,442-document historical
maximum supported the following fail-closed static-artifact v1 budgets:

- compact index: 6 MiB;
- all non-detail initial JSON assets: 8 MiB;
- one detail asset: 256 KiB;
- all detail assets: 128 MiB; and
- all hashed JSON assets: 136 MiB.

The packager rejects the whole candidate artifact if a budget is exceeded.
These ceilings are guards, not performance targets or evidence that every
future 31-day window will fit. Any exceedance keeps the prior checksum-validated
artifact eligible for last-known-good handling and requires a reviewed
sharding or range-policy change.

Artifact package `1.1.0` adds documented/selected/actual range metadata and
card-critical compact fields without changing schema `1.0.0`; legacy
package-`1.0.0` coverage and compact-index fixtures remain valid. Packaging
requires an authoritative refresh health receipt for an enabled
non-synthetic source, including failure stage and last-known-good state.
Validation applies the manifest-declared budgets and checks actual on-disk
sizes before reading asset bodies.

The documented page-size maximum remains 1,000. Live values from 2 through
2,000 were accepted, while 1, zero, invalid values, and values above 2,000
silently fell back to 20 in the observed checks. The adapter must use the
documented maximum of 1,000 and never depend on the looser behavior.

The client will retain 2,000 as a conservative slicing threshold, not describe
it as the server ceiling:

1. Start with an inclusive publication-date range.
2. Probe its first page using the fixed allowlist, `order=oldest`, and
   `per_page=1000`.
3. If `count >= 2000`, discard that probe and split at the calendar midpoint
   into `[start, midpoint]` and `[midpoint + 1 day, end]`.
4. If a single-day slice still reports at least 2,000, fail the slice closed.
5. For an accepted slice, follow only the returned `next_page_url`.
6. Require each next URL to remain HTTPS on `www.federalregister.gov`, on the
   exact document-search path, with the immutable fields, dates, order, and page
   size plus one opaque nonempty cursor.
7. Reject cycles, duplicate document numbers, changing counts, out-of-range
   publication dates, missing pages, or a collected count mismatch.
8. Re-probe the accepted slice after collection so a changing source cannot
   produce a mixed inventory.
9. Sort locally by `(publication_date, document_number)` and reconcile the
   unique identifier count across nonoverlapping slices.

The adapter does not construct or interpret `search_after_cursor`. A zero-result
response may omit both `results` and `total_pages`; only `count: 0` with no
errors is an accepted empty slice.

The issue table of contents is a useful same-provider inventory reconciliation.
On 2026-07-31, its 148 unique document numbers matched exact-day search. On
1994-01-03, 107 table-of-contents occurrences reduced to 105 unique identifiers,
matching the 105 search results. The historical issue response had an empty
`meta` object in one live response and omitted `meta` entirely in a follow-up,
while a current issue repeated its publication date in
`meta.publication_date`. The parser therefore binds the historical response to
the already validated request route and exact search/facet identifier set; when
the optional metadata date is present it must match exactly. Historical agency
groups can also include bounded `see_also` entries containing only agency name
and slug; these presentation cross-references are structurally validated but
do not enter the document inventory. Two historical presentation categories
also used the exact empty-string `type`; that label is validated as either the
observed empty sentinel or a bounded nonblank string but is not treated as a
document type. A weekend issue request returned `404 text/html`; it is a normal
no-issue day only when exact-day search also reconciles to zero.

The multiple-document endpoint can return `200` with partial results and an
`errors.not_found` inventory, and it does not preserve request order. Any error
or difference between requested and returned identifier sets fails that batch.
An in-memory check using related target `2011-1650`, stable anchor `93-30302`,
and the complete `fields[]` allowlist returned two results, no error inventory,
and exactly the requested field set on both documents. Relationship closure
therefore uses bounded comma batches, revalidates the stable anchor, and replays
the exact target metadata before accepting it.

## Historical coverage and official renditions

The OpenAPI describes published-document coverage since 1994. The oldest live
result observed was document `93-30302`, published 1994-01-03; a 1993 query
returned zero. GovInfo supplies the Federal Register collection from 1936.

GovInfo documents full-issue PDF/XML plus smaller-section PDF/text formats for
the modern collection. The 1994 volume is different: it has full-issue PDFs and
smaller-section text, and the oldest API document returned neither an individual
PDF nor full-text XML. Per-document XML exposed by the document API is an
informational FederalRegister.gov rendition, not a GovInfo article-level XML
claim. The adapter must allow missing individual PDFs, preserve the
informational FederalRegister.gov landing page, and use a verified issue-level
GovInfo link when no article PDF exists. It must not fabricate a granule URL.

Display labels are:

- `Official PDF on GovInfo`; and
- `HTML rendition on FederalRegister.gov — informational`.

The word `authenticated` is used only after the particular GovInfo PDF and its
visible authentication mark have been verified. A generic GovInfo link is not
enough for that stronger claim.

## Corrections, withdrawals, and source history

Observed correction documents use reciprocal URL relationships:

- original `2026-13124` listed
  `C1-2026-13124` in `corrections`; and
- correction `C1-2026-13124` linked the original in `correction_of`.

Each relationship must be a unique, same-origin API document URL. The adapter
must fetch the linked metadata, verify the document number and reciprocal
relationship, preserve both documents and both publication dates, and never
silently replace the original. Because the API supplies no document-update
timestamp, ETag, or Last-Modified header, newly discovered corrections require
the antecedent to be refreshed and retained relationships to be re-audited
periodically.

The API has no structured `withdrawn` boolean. Document `2026-15582` expressed
withdrawal through its exact `action`, `dates`, abstract, and an explicit
`related_documents` relationship. Preserve exact source language and an
explicit source relationship. Do not infer withdrawal from keywords.

`related_documents` can also contain noisy docket-based links. A docket match
alone is not a semantic relationship and must not create a status, supersession,
correction, Nation association, or legal conclusion.

On the 2026-07-30 live sample, 330 of 359 `related_documents` entries had
`relationship_type: null`. The contract accepts that nullable provider shape
for reconciliation, but null-labeled docket links are excluded from semantic
target closure and public relationship output. Only an explicit source-supplied
relationship label can produce the generic relationship edge described below.
The same sample repeated 12 targets under multiple docket groups, including
explicitly labeled relationships. Repeats are accepted only when their target,
label, URL, title, action, and publication date agree exactly; normalization
emits one deterministic relationship edge and rejects conflicting repeats.

Normalized record contract v1.1 carries a detail-only structured
source-document relationship. Correction pairs must remain reciprocal within
the validated same-source record set; generic related-document edges may remain
one-way and must preserve the exact source label.

## Terms, attribution, and reproduction boundary

The API requires no key and declares no OpenAPI security scheme. No separate
API license, click-through acceptance, required API attribution formula, or
numeric request-rate limit was found in the reviewed primary materials.

1 CFR 2.6 permits unrestricted reproduction or republication of material that
actually appears in regular or special Federal Register editions. The OFR FAQ
and FederalRegister.gov policy state that permission is not required. This
permission does not extend to material merely linked from a notice, public
comments, docket attachments, incorporated-by-reference standards, seals,
logos, or other third-party material.

Policy Sentinel will take the narrower operational approach:

- preserve factual metadata with field-level provenance;
- reproduce only reviewed source language such as the action or a bounded
  abstract;
- retain raw date language when also emitting a normalized date;
- omit generated search excerpts as quotation or relationship evidence;
- link rather than store the full official text; and
- exclude external attachments, incorporated material, public comments,
  images, seals, and logos.

Each record should credit the issuing agency and include title, Federal Register
citation when supplied, document number, publication date, the informational
FederalRegister.gov landing page, and the official GovInfo PDF or issue link
when verified. Nothing may imply OFR, NARA, GPO, or agency endorsement.

## Cadence, transport, and failure behavior

Federal Register issues appear on federal business days. Policy Sentinel
retrieval remains build-time only on the product's weekly cadence. The observed
API response allowed cross-origin requests, but CORS is not an authorization
and creates no browser dependency.

Observed response behavior included:

| Condition | Response |
|---|---|
| Valid JSON search | `200 application/json; charset=utf-8` |
| Invalid date or field | `400 application/json` with errors |
| Search offset beyond 10,000 | `400 application/json` |
| Unknown document | `404 text/html` despite `.json` |
| Missing facet or no issue | `404 text/html` |
| Empty search | `200` with `count: 0`, possibly no `results` |
| Partial multi-document lookup | `200` plus `errors.not_found` |
| Unsupported API `.xml` route | `500 application/json` |

Production transport must:

- allow only HTTPS and exact configured hosts and paths, including after
  redirects;
- set bounded connection/overall timeouts and response-byte limits;
- require JSON media type before decoding API responses;
- validate locally generated parameters before requesting;
- use bounded retry with jitter for network failures, `429`, and transient
  `5xx`, honoring `Retry-After` if supplied; and
- treat contract drift, `400`, `404`, unexpected redirects or content types,
  partial batches, changing counts, and persistent `5xx` as source failures.

A failed refresh can use only a checksum-validated prior public shard under the
existing last-known-good policy, preserving its original data-as-of time and
marking it degraded/stale. With no last-known-good shard, Federal Register
coverage is omitted and marked unavailable; partial fresh output is never
published.

## Implementation decision

The public API is technically viable without credentials or an external terms
action. Source-registry v1.2 records the versioned build-time adapter and access
date 2026-07-31, but keeps the source disabled. Disabled sources are excluded
from coverage, health, manifests, and record output.

The adapter and integrated artifact/UI tests use only hand-authored synthetic
contract fixtures in Git. Its
retrieval barrier validates bounded transport, deterministic date slicing,
opaque pagination, complete metadata replay, pre/post daily facets, selected
issue inventories, correction graphs, and related-document targets before
yielding a reference. Unsupported historical document types remain part of
reconciliation but cannot become public records. Normalization preserves exact
action/date language, generic explicit relationships, official subjects, links,
and field provenance; it never derives a Nation association, issuing body, or
withdrawal status.

A live in-memory end-to-end canary for 1994-01-03 passed the contract,
retrieval, exact replay, issue/facet reconciliation, normalization, internal
record-policy validation, and unchanged external-validation receipt. It
reconciled all 105 source documents and produced 94 unique eligible records,
excluding the 11 exact `Uncategorized Document` entries. No live response,
normalized record, or generated artifact was persisted.

The local artifact contract distinguishes the documented source range,
selected artifact window, and actual earliest/latest validated record. It
enforces deterministic index/detail budgets before writing, while the
application exposes bounded coverage, freshness, health, general-jurisdiction,
Unclassified, relationship, dossier, and CSV states from same-origin static
assets.

Federal Register remains disabled until the owner separately opens G-J after
reviewing the completed evidence. Early records with no individual PDF remain
link-limited; an issue-level GovInfo link may be added only after that exact
rendition is verified. No live response or normalized provider record may
enter Git.
