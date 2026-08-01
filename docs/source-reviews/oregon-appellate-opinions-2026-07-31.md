# Oregon appellate-opinion source review

Accessed: 2026-07-31

Implementation state: terms-gated in source-registry 1.14.0; registered
disabled with `adapter: null`; no production records

External authorization: required and not granted. Oregon's statewide terms say
that continued access accepts the agreement. Phase B does not authorize a new
source agreement, and the OJD policy separately restricts commercial copying.

## Primary sources

- [OJD Publications Program](https://www.courts.oregon.gov/publications/Pages/default.aspx)
- [Supreme Court opinions](https://www.courts.oregon.gov/publications/sc/Pages/default.aspx)
- [Court of Appeals opinions](https://www.courts.oregon.gov/publications/coa/Pages/default.aspx)
- [Case opinion updates](https://www.courts.oregon.gov/publications/other/Pages/updates.aspx)
- [Notice regarding citation](https://www.courts.oregon.gov/publications/other/Pages/notice.aspx)
- [OJD site policy](https://www.courts.oregon.gov/Pages/policies.aspx)
- [Oregon.gov terms and conditions](https://www.oregon.gov/pages/terms-and-conditions.aspx)
- [OJD privacy policy](https://www.courts.oregon.gov/Pages/privacy.aspx)

The Oregon Judicial Department Publications Program is the originating
publisher. It says appellate decisions are posted weekly on issuance and that
the Advance Sheets and bound Oregon Reports are the official published
decisions. Slip opinions can receive copy correction before preliminary and
bound publication, and the separate update page warns that editorial
corrections and approved changes can occur.

## Bounded structural evidence

Before the terms gate surfaced, one bounded observation of the current Court of
Appeals index found 1,343,711 UTF-8 bytes, 110 weekly date groups from
2024-06-05 through 2026-07-29, and 2,438 distinct opinion links. The response
had no useful checksum, content length, encoding, or stable update validator;
`Last-Modified` changed with request time and cannot be source-update
provenance. No page body was retained.

The strongest institutional candidate was:

| Field | Exact index value |
|---|---|
| Caption | `Oregon Public Broadcasting v. Dept. of Corrections` |
| Docket | `A185546` |
| Citation | `350 Or App 590` |
| Displayed date | `06/17/2026` |
| Section | `Precedential Opinions` |
| Advance sheet | `Advance Sheets 2026 #14` |

The source supplied an OJD redirect for that docket into the Oregon State Law
Library's OCLC-hosted digital collection. Neither the redirect target, PDF, nor
docket search was fetched. The current registry does not allowlist that host.

This row demonstrates that an exact caption, docket, official citation, date,
section, advance-sheet label, and link can coexist. It does not establish a
complete current or historical population. The Supreme Court and Court of
Appeals pages and the older digital collections are distinct surfaces, so the
registry records no verified overall start date.

## Status, revision, and normalization limits

The source's exact labels must remain distinct. Mapping the displayed date to
decision date, `Precedential Opinions` to normalized publication status, or an
Advance Sheets heading to `preliminary_print` requires a reviewed source
contract. The updates page must also be checked without inferring that an
unlisted case has complete subsequent history.

The current page contains extensive natural-person, juvenile, mental-health,
estate, and contact content. A future parser would need a fixed exact-row
allowlist, strict DOM and byte budgets, immediate payload disposal, and no PDF,
search, staff summary, personal caption, or free-text retrieval.

## Terms, reproduction, and access

Oregon's statewide terms govern access to Oregon-operated sites and state that
access and continued access constitute acceptance without modification. OJD's
site policy separately allows personal noncommercial copying but says
commercial copying requires written consent. Metadata-only treatment does not
remove the access-triggered agreement. Phase B expressly keeps new terms
acceptance and third-party contact closed.

OJD publishes no API, feed, numeric rate limit, retry rule, stable pagination
contract, checksum, or SLA for these indexes. Third-party OCLC access and reuse
would require its own review. No additional Oregon request was made after the
terms condition was identified.

## Decision

Source-registry 1.14.0 records `oregon-appellate-opinions` as a disabled
`official_index` source with `adapter: null`, null coverage bounds,
metadata-and-links-only intent, no OCLC host, no subject mappings, and no
public record, source health, or last-known-good shard.

`G-B-OR-OJD` remains closed. An owner decision must approve the exact current
Oregon.gov/OJD terms, intended noncommercial or commercial use, and any OCLC
access before live adapter work. If approved, the smallest candidate is one
exact Court of Appeals institutional row, one no-retry GET, fixed byte/DOM/link
budgets, citation-plus-docket identity, no PDF or search request, and atomic
failure on structure, identity, privacy, amendment, link, or terms drift.
