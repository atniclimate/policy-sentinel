# Washington Governor executive-order source and reproduction review

Accessed: 2026-07-31

Implementation state: contract and adapter 1.0 implemented in source-registry
1.9.0; registered disabled; no production records

External authorization: none required for the reviewed public index and files

Activation state: closed. The bounded Bob Ferguson term,
metadata-and-links-only parser, transport, normalizer, health receipt, and
source-specific last-known-good boundary are implemented and tested. A
separately reviewed continuous official-link health operation and the exact
later activation gate remain unresolved.

## Primary sources

- [Executive Orders index](https://governor.wa.gov/office-governor/office/official-actions/executive-orders)
- [Official Actions overview](https://governor.wa.gov/official-actions)
- [Governor privacy, copyright, and disclaimer notice](https://governor.wa.gov/privacy-notice)
- [Governor intended-use and linking policy](https://governor.wa.gov/intended-use)

The Official Actions overview identifies executive orders as one class of
official gubernatorial action and points to RCW 43.06. Policy Sentinel preserves
the exact source status and source language. It does not restate the site's
general description as a conclusion about any individual order's force,
effect, current validity, supersession, or rights consequences.

## Index filters and selected range

The canonical page silently selects the current governor. The reviewed form
has these fields:

```text
combine
governor
field_executive_order_status_target_id
```

The current-governor option is opaque source value `220`, displayed as
`Bob Ferguson`. The four exposed status-filter options are:

| Filter value | Source label |
|---|---|
| `221` | `Active` |
| `222` | `Expired` |
| `223` | `Superseded` |
| `224` | `Rescinded` |

The first bounded contract must not rely on the changing default. Its exact
selected URL is:

```text
https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All
```

On 2026-07-31 that URL exposed 14 rows, from order `25-01` issued
2025-01-15 through order `26-02` issued 2026-06-25. All 14 rows had the exact
source status `Active` and governor `Bob Ferguson`.

An explicit all-governors/all-statuses view exists:

```text
https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=All&field_executive_order_status_target_id=All
```

The reviewed view advertised and exposed 534 rows over pages 0 through 21,
observed from 1918-11-27 through 2026-06-25. This disproves an interpretation
that the publisher exposes only the 14 default rows. It does not establish
complete historical coverage:

- the publisher makes no completeness promise;
- conspicuous date gaps exist;
- filter and pager values have no documented stability contract;
- out-of-range pages return HTTP 200 with misleading display text and zero
  rows;
- historical source statuses are not limited to the four filter labels; and
- individual older PDFs can exist without proving that the index is an
  exhaustive archive.

The first adapter therefore selects only the explicit Bob Ferguson term. A
future historical increment requires separate pagination, identity, status,
gap, and completeness evidence and may not silently expand this range.
Registry `coverage.from` records 1918-11-27 as the earliest observed provider
row, while its limitations and every eventual artifact must keep that
documented/observed boundary separate from the first adapter's selected
2025-01-15-forward range.

## Reviewed HTML and link shape

The current-term response contained exactly one data table with six columns:

| Column | Retained use |
|---|---|
| `Number` | Exact source document identifier |
| `Issued Date` | Exact source-issued date |
| `Title` | Exact source title and anchor to the official PDF |
| `Status` | Exact source status |
| `Governor` | Contract identity check for the selected term |
| empty edit column | Structurally checked and discarded |

The reviewed target container has the stable class tokens
`view`, `view-executive-orders`, `view-id-executive_orders`, and
`view-display-id-executive_order_list_block`; its extra `js-view-dom-id-*`
token is deliberately ignored. The exact table has class tokens `table`,
`table-bordered`, `table-striped`, `tablesaw`, and `cols-6`. Its count is one
`view-header` whose collapsed text follows `Displaying 1 - N of N`. The
reviewed form explicitly marked governor option value `220` / `Bob Ferguson`
and status option value `All` / `- Any -` as selected. Contract 1.0 validates
those selected options, the four exact status option mappings, and every row's
governor label. Pager rejection is scoped to this target view rather than
unrelated Drupal shell content.

The title anchor is a relative path below
`/sites/default/files/exe_order/` on `governor.wa.gov`. All 14 current links
returned HTTP 200 with `application/pdf`, no redirect, and the same final URL
when checked. Observed file sizes ranged from 118,264 through 1,014,845 bytes.
Those observations validate the links for the review date; they are not a
provider size promise or a production byte ceiling.

No contact field or order body appears in the index. The implemented parser
uses an exact table/field allowlist and discards all other page content rather
than treating the complete Drupal page as a normalized source record.

The current rows are descending by issued date. Retrieval must reconcile the
advertised display total to the exact parsed row count, reject duplicate
compound identities, and sort deterministically after validation. For the
selected first scope, it must cap the response at 25 rows and fail closed if a
pager appears. Last-known-good behavior, not an undocumented second-page
assumption, handles growth past that reviewed boundary.

## Identity, statuses, and dates

Across the 534-row historical observation:

- all rows supplied number, date, title, governor, and PDF link;
- five rows omitted status;
- 534 rows reduced to 533 distinct numbers;
- number plus issued date was unique; and
- two groups reused a PDF link.

Neither number alone nor PDF URL is therefore a safe historical identity. The
proposed identity rule is
`washington-governor-executive-order-number-issued-date-v1`, with source record
identity composed from the exact number and ISO-normalized issued date.
`sourceDocumentIdentifier` continues to display the exact source number.

The first current-term response currently uses only `Active`. A future contract
may accept the four exact controlled filter labels above and must preserve the
exact source label. It must not convert free-form historical status prose into
one of those labels. Unknown, missing, compound, or changed status in the
selected current-term scope fails closed until separately reviewed.

The source calls its date `Issued Date`. Normalization may use that value as the
record's public date only under an explicit transform that retains the exact
source label and path in provenance. It is not an upload timestamp, effective
date, last-modified time, rescission date, or status-history timestamp.
HTTP `Last-Modified` and ETag describe page caching and cannot become a
per-record source-update time.

The index supplies no explicit correction edge, status history, rescission
target, or supersession relationship. None may be inferred from number, title,
date, status word, PDF text, or another order's existence.

## Normalization boundary

The first adapter may retain only:

- exact order number;
- ISO-normalized exact issued date;
- exact source title;
- one reviewed controlled source status;
- exact governor label for contract identity checking;
- validated official PDF URL;
- selected index URL;
- retrieval time and field-level provenance; and
- validation state.

The normalized public record is:

- `documentType: executive_action`;
- Washington state jurisdiction;
- `general_jurisdiction`;
- `Unclassified`;
- no Nation association;
- metadata and official link only; and
- no excerpt, summary, order body, attachment byte, contact field, or inferred
  relationship.

Order `25-10` has a title referring generally to sovereign Tribal Nations.
That title is not exact named-Nation evidence and creates no Nation association.
No title, keyword, subject matter, issuing governor, or statewide scope may
create one.

The source does not expose a reviewed controlled policy-subject vocabulary.
The four status filters are lifecycle labels, not taxonomy labels.

## Reproduction and attribution

The privacy notice says the Governor site is a public-domain website and most
site information may be used, shared, or copied with appropriate source credit.
It also warns that third-party content can be copyrighted and recommends
permission, and it disclaims accuracy, reliability, and timeliness warranties.

The intended-use policy says advance permission is not needed to link to the
Governor site. It warns that subpage URLs may change without notice, says links
should be continuously verified, and forbids framing or misrepresenting the
content's origin.

The current decision is therefore:

- metadata and exact official PDF links only;
- attribution to `Office of the Governor, State of Washington`;
- no PDF or page-body ingestion into public output;
- no excerpt or full-text reproduction;
- no framing or proxying of official content; and
- continuous exact-link validation before any later activation.

## Access, cadence, and failure behavior

Reviewed public pages and PDFs required no account, key, form submission,
terms acceptance, or paid request. No numeric request limit, publication
schedule, SLA, checksum, retry rule, or formal HTML/pagination version was
found. Responses exposed no rate-limit header. The index advertised a
15-minute public cache lifetime, but that is not a refresh or completeness
contract.

The web search fetcher received HTTP 403 while ordinary bounded requests
received HTTP 200. Availability can therefore depend on client or WAF behavior.
A future adapter must report only a sanitized contract or transport failure and
must not work around access controls, rotate clients, or retry without a
reviewed policy.

Retrieval must remain low-frequency, sequential, and build-time only. The
absence of an observed CORS allow-origin header is not the reason browser calls
are forbidden; browser runtime access is forbidden by product policy
regardless of current headers.

A future transport must use:

- the exact HTTPS origin, path, and two selected query pairs;
- GET with no credentials, referrer, body, redirect, or cache dependence;
- a repository-owned user agent;
- one attempt under strict media-type, byte, row, chunk, and whole-operation
  time ceilings;
- exact final-URL validation;
- no PDF-body retrieval for normalization; and
- sanitized repository-defined failure categories only.

## Health and last-known-good

`washington-governor-executive-orders` is an independent source-health and
last-known-good boundary. It must not share a source ID or shard with the
Washington State Register or Washington LWS.

A successful refresh must validate the exact selected term, displayed count,
row identities, statuses, dates, titles, and links before emitting any record.
A partial or structurally drifting page fails the complete source refresh. A
later enabled build may use only this source's checksum-validated prior public
shard, preserving its original data-as-of time and labeling it stale/degraded.
Without a prior shard, omit the source and mark it unavailable. While disabled,
it appears in neither public coverage nor public health.

## Implemented contract and remaining gate

The repository now contains the one-page explicit Bob Ferguson term contract.
It pins direct `parse5@8.0.1` and uses its inert AST rather than regex or a
browser DOM. One exact GET has no credentials, referrer, cache, redirect, or
retry. It accepts only exact-final-URL HTTP 200 UTF-8 HTML, at most 256 KiB in
at most 512 nonempty chunks, under one 30-second deadline. Separate fixed DOM
node, attribute, depth, aggregate-text, parse-error, and 25-row ceilings apply.
Only bounded duplicate-attribute recovery outside the target view is accepted;
parse ambiguity inside the target view fails closed. Every retained byte
buffer is zeroed and no raw page or PDF body crosses the transport boundary.

The parser requires the exact filters, table, count, current-term anchor,
Active-only v1 status, safe Governor PDF path, and compound number/date
identity before yielding any row. Normalization retains only metadata and
official links, uses `status.normalized: unknown` while preserving exact
`Active`, keeps every row `general_jurisdiction` and `Unclassified`, and
provides provenance for every retained source-derived field. A generic title
mentioning Tribal Nations still produces no Nation association.

The synthetic suite covers:

- exact current filter query and rejection of default, all-governor, unknown,
  duplicated, or reordered query pairs;
- one exact six-column table and a matching display total;
- unexpected pager, more than 25 rows, empty or partial rows, and out-of-range
  HTTP-200/zero-row behavior;
- duplicate number/date identities and reused URLs;
- exact date parsing and deterministic ordering;
- controlled, missing, unknown, and free-form statuses;
- unsafe hosts, redirects, plaintext links, non-PDF paths, and identity drift;
- byte/chunk/deadline/media-type limits;
- general-jurisdiction, Unclassified, no-Nation normalization;
- complete field provenance and metadata-only output; and
- source-specific failure, health, and last-known-good handling.

The shared LKG merge also fails closed when a success receipt, failure receipt,
previous record, or previous health entry belongs to the Register, LWS, or any
other source. On 2026-07-31, one aggregate-only execution through the finished
transport matched 14 rows, earliest issued date 2025-01-15 and latest
2026-06-25, under contract 1.0. It made no PDF request and retained no provider
HTML or bytes.

The historical 534-row view remains a separately bounded future increment.
Registry 1.9.0 records adapter 1.0 but keeps the source disabled. Before
activation, add and review a bounded continuous official-PDF link-health
operation; structural URL validation alone is not a current reachability
claim.
