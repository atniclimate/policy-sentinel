# GD-60 federal probe readiness and local refresh decision

Reviewed 2026-10-09 under D-092. This is a local preparation checkpoint. No
provider data endpoint, document body, registration form or credential was used.
No source was activated. The queries below are **blocked proposals**, not runner
manifests or permission to send requests. The GD-31 packet remains closed.

## Current publisher evidence and route decisions

| Collection | Current originating documentation | Selected bounded canary and gate |
| --- | --- | --- |
| GovInfo `PLAW` slip laws | [GPO API](https://github.com/usgpo/api), [PLAW help](https://www.govinfo.gov/help/plaw), [GPO policies](https://www.govinfo.gov/about/policies) | `GET https://api.govinfo.gov/collections/PLAW/2025-01-01T00:00:00Z/2025-01-02T00:00:00Z?offsetMark=*&pageSize=2`; one metadata page only; `G-B-GOVINFO` closed. Distinguish a slip law from a later Statutes at Large or Code version. |
| GovInfo `BILLS` published bill and resolution versions | [GPO API](https://github.com/usgpo/api), [BILLS help](https://www.govinfo.gov/help/bills), [GPO policies](https://www.govinfo.gov/about/policies) | The same collection-update path/window with `BILLS`; one metadata page only; `G-B-GOVINFO` closed. A published text version is neither a final action nor an enacted law. |
| GovInfo `BUDGET` proposed budget books | [GPO API](https://github.com/usgpo/api), [BUDGET help](https://www.govinfo.gov/help/budget), [GPO policies](https://www.govinfo.gov/about/policies) | The same collection-update path/window with `BUDGET`; one metadata page only; `G-B-GOVINFO` closed. Fiscal year, package, granule and format must be checked independently. |
| GovInfo `USCOURTS` selected lower-court opinions | [GPO API](https://github.com/usgpo/api), [USCOURTS help](https://www.govinfo.gov/help/uscourts), [GPO policies](https://www.govinfo.gov/about/policies) | The same collection-update path/window with `USCOURTS`; one metadata page only; `G-B-GOVINFO` closed. Court/year participation and redaction remain separate coverage and privacy checks. |
| Congress.gov bill and resolution actions | [Library API overview](https://github.com/LibraryOfCongress/api.congress.gov), [bill endpoint](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/BillEndpoint.md), [Library legal guidance](https://www.loc.gov/legal/) | Proposed `GET https://api.congress.gov/v3/bill/119?limit=2&offset=0`; one metadata page only; `G-B-CONGRESS` closed. Exact measure and text-version IDs must be selected from reviewed results before any retrieval. |
| OMB budget books and Supreme Court slip opinions | [OMB books](https://www.whitehouse.gov/omb/information-resources/budget/), [Court term index](https://www.supremecourt.gov/opinions/slipopinions.aspx) | Discovery only. No fixed item, host automation policy, permitted rendition and item-specific reuse review are bound; no canary is proposed for dispatch. GD-58 and GD-59 own their successors. |

The GPO API still documents an API.data.gov key, package `lastModified`
enumeration with `offsetMark`, a 1,000-item page maximum, default limits of
36,000/hour, 1,200/minute and 40/second, 429 responses and some generated-file
503 responses. The Library documents a required key, v3, up to 250 bill rows per
page and 5,000 requests/hour. These are publisher descriptions, **not observed
reliability**. GPO's reproduction notice excludes third-party content from its
general government-work permission and asks for originating-author credit.
No selected title/body is cleared for local excerpt or public reuse. The GPO
robots document again returned a research-tool error; this does not prove host
failure or permission. Congress.gov historical coverage dates and field rights
remain unresolved. No 429 was induced. CORS is irrelevant to build-time intake.

Each proposed API canary has a separate ceiling of **one attempt, 30 seconds,
1 MiB response and 1 MiB aggregate**, including errors; no retry, one request
at a time, at most four requests per minute, and no pagination beyond the first
page. The window is a mechanical sample, not a complete population; if a
`nextPage` is present, record `partial_sample` and stop. Expected format is JSON
metadata only. Allowlisted observations are status, elapsed time, byte count,
content type, redirect chain, rate/retry headers, collection, package ID,
publisher update timestamp, next-page presence and checksum. Do not retain
response bodies or personal titles in Git. A follow-up package, text or changed
version requires a new manifest with its exact ID, rendition, reuse review and
its own operation accounting. Keyed calls require a credential reference held
outside Git after the exact gate opens; no value or keyed URL belongs in a log.
The future external custody namespace and reviewed runner are unbound, so these
rows cannot be sent as written.

The fixed publisher examples `PLAW-111publ4`, `BILLS-115hr1625enr`,
`BUDGET-2010-PER` and `USCOURTS-meb-2_10-ap-02064-0` provide candidate
package/granule identities for later rendition-specific acquisition manifests;
Congress.gov's documented `117/hr/3076` is a separate measure identity. These
examples establish syntax only. No body path, byte estimate, permitted excerpt,
publisher version digest or external custody target has been approved for them.
Each subsequent content request must bind those details and independently refuse
missing rights, a changed host or format, an unqualified redirect, an expired
review, a spent operation, an over-budget response or inadequate disk headroom.
The proposed canaries select a 2025 update window but emit **no selected build
range and no records**. The publishers' documented ranges remain collection
specific: `PLAW` from the 104th Congress, `BILLS` from the 103rd, `BUDGET` from
FY 1996 and selected `USCOURTS` generally from 2004 with incomplete early
holdings. Congress.gov field coverage is unresolved. No Nation relationship or
taxonomy mapping follows from any of these routes; absent exact official
evidence, records stay general-jurisdiction and `Unclassified`.

For a later reviewed runner, the five one-page rows above form five **separate
blocked acquisition proposals**, with operation IDs `gd60-plaw-01`,
`gd60-bills-01`, `gd60-budget-01`, `gd60-uscourts-01` and `gd60-congress-01`.
Their only allowed use is local metadata envelope validation. The four GPO
paths have the exact dates and query shown above with only the collection code
changed; the Congress path and query are shown in its row. The first four require
the ungranted `G-B-GOVINFO` credential reference, and the fifth requires the
ungranted `G-B-CONGRESS` reference. The proposed external custody namespace is
`I:/policy-sentinel-corpus-real-policy/gd60-federal-canaries-2026-10-09/`;
it has not been created or assigned to a runner. Each operation stops after one
response or on any redirect, format, size, timeout, rights or validation
mismatch. Only the JSON envelope, collection and package/measure identifiers,
official URL, update date, cursor presence, transport observations and digest
would be projected; every other field remains excluded. The five independent
1 MiB response ceilings total **5 MiB**, with **15 MiB** reserved as a
conservative three-copy peak for original, validation staging and output. On
the measured inventory this would project 969,934,515 logical bytes, below the
50,000,000,000-byte managed cap. The same observation-time free-space values
clear the 20 GiB floor; a fresh manifest-specific storage check must refuse
dispatch if either condition changes. These proposals are not accepted runner
manifests and cannot be spent until source review, rights, credentials, runner
and namespace ownership are independently bound.

## Capacity, fallback and reliability

`npm run storage:report -- --manifest <existing local manifest>` inventoried
all twelve declared managed roots without opening document bodies at
2026-10-09T17:47:54.149Z: **954,205,875 logical bytes**. Its existing
hypothetical forecast returned `within_limits` at a 3,219,130,035-byte peak.
Current free space was 38,532,427,776 bytes on C: and 188,179,931,136 bytes
on I:, each above the 20 GiB floor. These values are observation-time planning
evidence; they do not reserve space for an operation or certify the proposed
API rows. A future dispatch needs a fresh manifest-specific forecast and
write/rebuild reservation.

There are **zero live API observations** for these collections in GD-60: no
status, latency, provider bytes, cursor behavior, update cadence, fixity or
failure frequency can be asserted. The three-document direct GovInfo roadless
pilot is a different route and its operation IDs are spent. No newly approved
same-adapter, same-collection shard exists for these canaries. On failure the
collection would be unavailable with zero new records. Source-level LKG tests
cannot prove collection-level fallback; GD-40/42 and the GD-58/59 successors
must test a checksum-bound prior shard with its original as-of time, a changed
version, missing/malformed metadata, timeout, 5xx and simulated 429 before
acceptance. An alternate publisher route must be separately reviewed.

## Local refresh decision

Retain the immutable corpus plus derived file search projection for the current
workload. The accepted synthetic measurement covers 100, 500 and 2,000 works,
with 16 queries and fresh-process replay. At 2,000 works, the largest projection
is 15,040,137 bytes; cold-query medians across queries are 13.262–75.368 ms,
warm medians 11.493–37.111 ms, and rebuild coexistence is 61,804,525 bytes.
The current reviewed real corpus is 210 works, 215 versions and 21,209 segments.
These results do not measure real-document refresh cost or a 50 GB workload,
but they establish no current query need for a database. Adding SQLite now
would create another store, migration and backup contract without an observed
bottleneck. Reconsider a transactional index after a qualified collection
supplies measured refresh, replay and query cases that the file projection
cannot meet. Keep source bytes and receipts immutable; any future index is a
rebuildable projection with collection-scoped health, staged promotion and
offline replay. No production database dependency or schema was added.

GD-60 closes as a **readiness assessment** with zero gate-cleared live routes.
This does not complete GD-39/40/42, GD-58/59, the five-API claim or GD-27.
