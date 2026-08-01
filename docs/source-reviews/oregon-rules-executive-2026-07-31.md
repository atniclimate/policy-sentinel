# Oregon administrative-rule and executive-order source review

Accessed: 2026-07-31

Implementation state: terms-blocked in source-registry 1.16.0; both sources
registered disabled with `adapter: null`; no production records

External authorization: required and not granted. Oregon's current statewide
terms say that access and continued access constitute acceptance and apply to
Oregon.gov plus any other website operated, controlled, or maintained by
Oregon or one of its executive-department agencies. That scope reaches the
separately hosted Oregon Administrative Rules Database (OARD) as well as the
Governor site.

A bounded structural observation of the public OARD surface occurred before
that broad terms scope was confirmed. Requests stopped when the condition was
identified. During this review, no Oregon Legislature OData endpoint,
agreement, login, credential, or response was accessed; no Governor page or
order file was requested; and no
provider response, session value, receipt body, rule text, or order text was
retained.

## Primary sources

- [OARD public home](https://secure.sos.state.or.us/oard/processLogin.action)
- [OARD current-rule search](https://secure.sos.state.or.us/oard/ruleSearch.action)
- [OARD filing search](https://secure.sos.state.or.us/oard/filingSearch.action)
- [OARD Oregon Bulletin inventory](https://secure.sos.state.or.us/oard/displayBulletins.action)
- [OARD annual-compilation inventory](https://secure.sos.state.or.us/oard/displayCompilations.action)
- [Oregon Administrative Rules](https://sos.oregon.gov/archives/administrative-rules/pages/default.aspx)
- [OAR publications and reports](https://sos.oregon.gov/archives/administrative-rules/Pages/publications-reports.aspx)
- [OARD filing FAQ](https://sos.oregon.gov/archives/administrative-rules/Pages/oard-faq.aspx)
- [Archives Division records-retention schedule](https://sos.oregon.gov/archives/Documents/recordsmgmt/sched/schedule-secretary-state.pdf)
- [Governor resources](https://www.oregon.gov/gov/pages/resources.aspx)
- [Governor executive-order index](https://www.oregon.gov/gov/Pages/executive-orders.aspx)
- [Oregon.gov statewide terms and conditions](https://www.oregon.gov/pages/terms-and-conditions.aspx)

These links document the reviewed source identities. Their inclusion is not
authorization for another request while the source-specific terms gates are
closed.

## Terms boundary

The statewide terms are not limited to the `oregon.gov` hostname. Their stated
scope includes any website operated, controlled, or maintained by Oregon or an
executive-department agency, and they state that accessing and continuing to
access a covered site accepts the terms without modification. OARD is operated
by the Secretary of State Archives Division even though its public application
uses `secure.sos.state.or.us`.

The OARD footer links to Secretary of State privacy and accessibility policies
and displays `All Rights Reserved`; it does not publish an independent bulk-use
license that displaces the statewide terms. The public interface requires no
account to read, but no-registration access is not the same as no-terms access.

The bounded OARD observation may itself have triggered the access-based
statewide terms before their broad scope was confirmed. No further Oregon
request is authorized. This review does not treat that accidental condition as
approval, does not extend it to another source, and does not touch or evade the
separate Oregon Legislature OData agreement.

## Official status, holdings, and cadence

The Secretary of State identifies OARD as the official resource for filing
Oregon Administrative Rules and says it houses official copies of rules and
filings. The official copy of an Oregon Administrative Rule is the
Administrative Order, identified by an Administrative Order Number (AON).

The OARD FAQ says the Oregon Bulletin is published on the first business day
of each month and contains filings from the prior month. It includes Notices of
Proposed Rulemaking, Permanent Administrative Orders, Temporary Administrative
Orders, Statutory Minor Corrections, Governor executive orders, and other
notices. A filing is not guaranteed to appear unless reviewed and published;
an uncorrected filing can be voided and resubmitted.

The Archives retention schedule describes much broader holdings:

- administrative-rule notices from 1939, all digital in OARD since 2017;
- Oregon Bulletins from 1974, published digitally from OARD since 2017;
- annual compilations from 1957; and
- permanent, temporary, and statutory-minor-correction Administrative Orders
  from approximately 1914, all digital in OARD since 2017.

Those retention ranges do not prove one uniform online record contract or a
complete machine-readable range. No adapter may relabel them as public source
coverage.

## Bounded pre-gate OARD observation

The anonymous public application returned HTTP 200 HTML for its home, current
rule search, filing search, Bulletin inventory, and compilation inventory. It
set an anonymous session cookie and embedded a `JSESSIONID_OARD` path value in
generated links. A provider session value is not record identity and must never
enter a URL, artifact, log, fixture, or provenance entry.

The Bulletin inventory exposed 105 monthly labels from November 2017 through
July 2026: November and December 2017, every month from January 2018 through
December 2025, and January through July 2026. The separate annual-compilation
inventory exposed 2018 through 2026. Month and year labels do not establish an
exact first publication date, so registry coverage bounds remain null.

The July 2026 Bulletin page contained two exact tables:

| Section | Exact columns | Observed rows | Contract consequence |
|---|---|---:|---|
| Notices of Proposed Rulemaking | `Chapter`, `Agency`, `Filed`, `Caption`, link | 61 | No AON or other public document identifier appears in the table, so the current record contract cannot emit these notices from the index. |
| Permanent, Temporary, and Statutory Minor Correction Filings | `Chapter`, `Agency`, `AON`, `Filed`, `Type`, `Caption`, link | 189 | Every observed row populated all retained fields and every AON was unique within the issue: 95 `Permanent`, 38 `Temporary`, and 56 `Minor Correction`. |

The page was approximately 246 KiB and changed byte-for-byte across anonymous
sessions because generated URLs carried session values. A raw response hash is
therefore not a stable source checksum. The source supplied 188 receipt-viewer
links, one direct receipt-PDF link, 61 tracked-change links, and one aggregate
`Executive Orders and Other Notices` link.

One bounded receipt-link check redirected from OARD to the official
`records.sos.state.or.us` viewer and returned approximately 721 KiB of dynamic
HTML. No viewer content was parsed or retained. Public filing receipts can
contain names, postal addresses, telephone numbers, email addresses, free text,
full rule text, attachments, and land-related material. The index already
supplies the only fields eligible for a first metadata contract; receipt,
tracked-change, attachment, rule-body, and record-viewer retrieval are excluded.

The HTTPS `robots.txt` request did not yield a usable policy because it attempted
an insecure redirect. No downgrade was followed. OARD publishes no documented
API, feed, schema version, numeric rate limit, retry rule, response-size bound,
checksum, SLA, or change-notification contract. Observed responses had no CORS,
rate-limit, or retry headers. Browser retrieval remains forbidden regardless.

## Administrative-rule contract limits

The final-filing table is technically sufficient to describe a future bounded
metadata-only increment after exact authorization, but it is not currently
available for implementation. A future reviewed contract would have to:

- select an exact eligible Bulletin issue and validate the month inventory;
- retain only exact chapter, agency label, AON, filed value, source type,
  caption, issue label, and canonical official link;
- strip and reject every session path value rather than retain or replay it;
- exclude proposed notices until a stable public document identifier exists;
- map `Permanent`, `Temporary`, and `Minor Correction` to normalized document
  types only through an explicit versioned transform;
- preserve the source's `Filed` label and avoid assigning an undocumented time
  zone to its displayed timestamp;
- leave effective, expiration, current-validity, source-update, and
  relationship fields absent when the table does not supply them;
- treat each AON as one source filing and never infer correction,
  supersession, adoption, repeal, or rule-level relationships from chapter,
  caption, date proximity, or shared rule numbers; and
- fail the whole source refresh on missing columns, blank retained fields,
  duplicate AONs, unknown type labels, unexpected hosts or paths, session-token
  leakage, privacy drift, or an unbounded response.

The source exposes no controlled policy-topic field. Every future record would
remain `Unclassified`. Every state filing would remain
`general_jurisdiction` with zero Nation associations unless exact separate
official evidence names a Nation and passes the approved identity contract.
Caption words, agency, chapter, geography, subject matter, and rule text cannot
create a Nation relationship.

## Executive-order source limits

The Governor resources page describes an executive-order index from 2003 to
the present. No direct Governor index or PDF request was made after the
statewide terms condition was known, so that publisher claim is not a verified
record-level range and registry bounds remain null.

OARD is not an independent substitute. Its FAQ says Bulletins can contain
Governor executive orders, but the reviewed July issue exposed one aggregate
`Executive Orders and Other Notices` document rather than per-order number,
title, issued date, governor, status, or official-link rows. The category also
contains non-order notices. Neither the aggregate heading, publisher, topic
words, nor inclusion in a Bulletin proves that a contained item is an
executive order or establishes its current effect.

The Archives retention schedules establish permanent archival duties, not a
stable public executive-order inventory contract. No official no-terms source
with exact record identity, date, status, link, range, correction behavior, and
bounded transport was verified.

## Reproduction, privacy, health, and failure

No bulk-reuse or full-text license was verified. Both registry entries are
therefore metadata-and-links-only, with descriptive attribution to the
originating Oregon office and no copied rule, receipt, redline, attachment,
order, or page body.

The two logical sources remain independent health and last-known-good
boundaries. If either source is later approved and enabled, it must have its
own exact range, retrieved/data-as-of state, structural and link validation,
request/byte/item/deadline ceilings, sanitized failures, and checksum-validated
prior shard. A failed or disabled source cannot borrow another Oregon source's
records or health.

## Decision

Source-registry 1.16.0 records
`oregon-administrative-rules-bulletins` and
`oregon-governor-executive-orders` as disabled `official_index` sources with
`adapter: null`, null coverage bounds, metadata-and-links-only intent, no
subject mappings, and no public record, health entry, or last-known-good shard.

`G-B-OR-OARD` and `G-B-OR-GOVERNOR` remain closed. B7's non-OData research is
complete as a dated source-specific block, and the no-registration adapter item
closes through its accepted no-viable-source fallback rather than an inferred
or scraped substitute. Reopen either path only if the owner approves that
source's exact current statewide terms and intended build-time operation. The
OData gate remains separately closed.
