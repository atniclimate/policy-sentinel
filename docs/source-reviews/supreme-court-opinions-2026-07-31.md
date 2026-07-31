# U.S. Supreme Court curated-opinion source review

Accessed: 2026-07-31

Implementation state: selected pilot in source-registry 1.11.0; registered
disabled with `adapter: null`; no production records

External authorization: none required for the reviewed public pages

## Primary sources

- [Opinions of the Court, October Term 2018](https://www.supremecourt.gov/opinions/slipopinion/18)
- [Opinion-table field definitions](https://www.supremecourt.gov/opinions/definitions.aspx)
- [Publication of Supreme Court opinions](https://www.supremecourt.gov/opinions/info_opinions.aspx)
- [U.S. Reports](https://www.supremecourt.gov/opinions/USReports.aspx)
- [Bound volumes](https://www.supremecourt.gov/opinions/boundvolumes.aspx)
- [Website policies and notices](https://www.supremecourt.gov/policies/web_policies_and_notices.aspx)
- [Privacy policy](https://www.supremecourt.gov/policies/privacy_notice.aspx)
- [Supreme Court robots policy](https://www.supremecourt.gov/robots.txt)

The Supreme Court is the originating judicial publisher. The Court documents
the meaning of the term table's date, docket, party name, revision link,
principal-opinion author code, and permanent citation. It also documents the
publication progression from released slip opinion through edited pagination,
preliminary print, and bound U.S. Reports.

## Selected pilot scope

The first allowlisted record is exactly:

| Field | Exact source value |
| --- | --- |
| Sequence | `22` |
| Decision date | `3/19/19` (`2019-03-19`) |
| Docket | `16-1498` |
| Case name | `Washington State Dept. of Licensing v. Cougar Den, Inc.` |
| Principal-opinion code | `B` |
| Permanent citation | `586 U.S. 347` |
| Current official link | `https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=546` |

The author code is not needed for public policy discovery and must not be
retained. The configured coverage is exactly one record on 2019-03-19. It does
not claim complete October Term 2018, Supreme Court, federal-court, Indian-law,
or U.S. Reports coverage.

The institutional-party caption avoids retaining a natural-person party.
Neither `Cougar Den, Inc.` nor the subject of the opinion establishes a public
Nation association. No party-role, ownership, treaty, tax, land, rights,
jurisdiction, prevailing-party, or legal-effect conclusion is created.

## Identity, date, and publication status

The source supplies distinct docket, permanent reporter citation, decision
date, and case name. The permanent citation identifies the reported opinion;
the docket identifies the case. They must remain separate. The stable record
identity rule is the exact pair of Court docket `16-1498` and permanent
citation `586 U.S. 347`, not title, date, sequence number, or PDF fragment.

The Court defines `Date` as the date the case was decided and `Citation` as the
permanent citation in the U.S. Reports publication stream. The target row's
current link has moved from a slip-opinion path to the complete bound Volume
586 PDF, with a Court-supplied page fragment. The U.S. Reports page lists
Volume 586 as a bound volume. A future model may therefore preserve:

- normalized lifecycle status `decided`, sourced from the exact term-page
  heading and decision date;
- exact decision date `2019-03-19`;
- publication form `bound_volume`;
- exact source label `U.S. Reports, Volume 586`; and
- current revision-review state `bound volume link observed`.

This is a publication-state observation, not a claim about precedential force,
subsequent treatment, legal effect, or a complete supersession history. The
Court cautions that only the printed bound U.S. Reports controls if an
electronic version differs.

The current generic record has no separate court, docket, reporter citation,
decision date, opinion form, publication state, or revision-review fields.
They must not be concatenated into `sourceDocumentIdentifier`, hidden in action
history, converted into a publication date, or collapsed into one status
label.

## Bounded structural observation

One exact aggregate-only request to the October Term 2018 page returned
exact-URL HTTP 200 UTF-8 HTML with no content encoding or declared length:
107,003 bytes in 11 nonempty chunks. Inert `parse5` inspection counted 2,719
nodes, 1,261 attributes, maximum depth 17, 39,147 text code units, and one
`unexpected-character-in-attribute-name` parse error outside the selected
projection. No response body was written or retained.

The page had two repeated exact six-column table headers and 73 opinion rows.
There was exactly one docket `16-1498` row, with the exact values above. Only
its name cell contained a link. The current link resolved on the same host to
`/opinions/boundvolumes/586BV.pdf#page=546`.

The link is a 1,162-page complete bound volume, not an individual case PDF. A
future adapter must preserve the exact Court-supplied fragment but must not
fetch, hash, parse, copy, or call the volume an individual-case file. The
citation is the source locator within the controlling printed volume.

## Access, cadence, health, and failure

The page is public HTML with no account, key, registration, paid call, or
access-triggered terms acceptance. The Court publishes no API, numeric
request-rate limit, retry rule, SLA, checksum, or change feed for this fixed
page. Its robots policy allows opinion paths, disallows selected asset paths,
and specifies `Crawl-delay: 1`.

A first adapter is bounded to one internally constructed weekly build-time GET:

- literal HTTPS URL and host `www.supremecourt.gov`;
- no userinfo, port, query, fragment, redirect, credentials, cookie, referrer,
  user input, term enumeration, search, docket traversal, or browser call;
- exact final URL and HTTP 200 `text/html` with UTF-8;
- identity encoding and fixed 30-second, 256-KiB, 512-chunk, DOM, attribute,
  depth, text, table, and row ceilings;
- exactly the documented term identity, two repeated headers, 73-row maximum,
  and one exact docket `16-1498` row;
- exact caption, date, docket, permanent citation, and same-host bound-volume
  link grammar;
- reject current placeholders such as `609/2` and citations that are not
  permanent `volume U.S. page` values;
- project only the allowlisted target fields before normalization; and
- discard all provider bytes and non-target rows without logging them.

Do not fetch the bound-volume link. A missing, duplicate, renamed, recited,
redated, revised, relinked, placeholder-citation, structurally changed,
oversized, challenged, or unavailable target fails the whole selected source
for review. A target revision indicator must also fail closed rather than be
silently applied.

`supreme-court-opinions-curated` is an independent source-health and
last-known-good boundary. A failed refresh may use only its own
checksum-validated prior public shard, preserve the original data-as-of time,
and mark it stale/degraded. Without one, omit the source and mark it
unavailable. Health can claim only that the one selected row validated; it
cannot claim current-term or Court-wide completeness.

## Reproduction, privacy, and public fields

The Court's website policies address linking, outside sites, monitoring, and
disclaimers but do not grant a source-specific bulk-reproduction license. Its
privacy notice describes request logging. The bound volume also contains
unrelated opinions, orders, party names, counsel, memorial material, and other
content beyond the selected record.

The reviewed public boundary is therefore:

- exact case name, docket, decision date, permanent citation, court identity,
  publication state, term-page URL, and exact Court-supplied bound-volume link;
- metadata and links only;
- no Justice or author, syllabus, holding, opinion, concurrence, dissent,
  counsel, brief, docket document, party enrichment, fact, subject, excerpt,
  summary, or full-text asset;
- no personal, contact, land, parcel, ownership, treaty-right, tax-effect, or
  other legal-content field;
- `general_jurisdiction`, `Unclassified`, and `landmark: false` for the first
  adapter milestone;
- zero Nation associations; and
- no AI output.

The source remains fully useful as citation-and-link metadata without
reproducing the volume. Later landmark treatment is a separate B6-LANDMARKS
decision and requires metadata-compatible evidence and exact reproduction
review.

## Implementation decision

Source-registry 1.11 registers `supreme-court-opinions-curated` independently,
disabled with `adapter: null`, exact one-record coverage on 2019-03-19, one
runtime host, metadata-and-links reproduction, and no subject mappings.

This source is selected for B6-COURT-ADAPTER because one bounded originating
official page supplies the required identity and lifecycle evidence without
PACER, a credential, a paid service, a third-party editorial source, a PDF
fetch, or personal-party output. Adapter work begins only after a versioned
source-neutral judicial context preserves:

1. issuing court or administrative body;
2. one or more docket identifiers;
3. one or more exact reporter citations;
4. decision date;
5. exact decision or opinion form;
6. publication/rendition status and source label;
7. explicit revision-history review state and typed relationships where
   supplied; and
8. provenance, compact artifact, details, dossier, CSV, search, date,
   historical, privacy, health, and LKG behavior.

No existing field is overloaded merely to make the selected source emit.
