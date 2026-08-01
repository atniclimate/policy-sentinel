# U.S. Supreme Court curated-opinion source review

Accessed: 2026-07-31

Implementation state: record/artifact contract 1.3.0 and adapter 1.1.0
implemented in source-registry 1.14.0; source remains disabled pending its
source-specific G-J evidence decision; no production records

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
Volume 586 as a bound volume. Record schema 1.3 and adapter 1.1 preserve:

- normalized lifecycle status `decided`, sourced from the exact term-page
  heading and decision date, with exact generic source label
  `Opinions of the Court - 2018`;
- exact decision date `2019-03-19`;
- document form `opinion` with source label `Opinions of the Court`;
- publication form `bound_volume`;
- exact source label `U.S. Reports, Volume 586`; and
- revision-review state `no_separate_relationship_exposed`, reviewed on
  2026-07-31.

This is a publication-state observation, not a claim about precedential force,
subsequent treatment, legal effect, or a complete supersession history. The
Court cautions that only the printed bound U.S. Reports controls if an
electronic version differs.

The source-neutral `judicialContext` keeps the Court, docket, reporter citation
and its exact source URL, decision date, opinion form, bound-volume publication
state, and dated revision review separate. The context is included in compact
and detail artifacts and carried through cards, search, details, dossier, CSV,
date filtering, and historical policy. It does not concatenate those facts into
`sourceDocumentIdentifier`, hide them in action history, convert the decision
date into a publication date, or collapse them into one status label.

## Landmark inclusion decision

The row passes the written `documented-court-decision` criterion because the
originating Court index supplies the exact case title, docket, decision date,
permanent reporter citation, Court identity, publication state, and official
links. `reviewState: approved` records the project's editorial review of that
criterion; it is not source approval, owner authorization to activate the
source, or a legal determination.

The landmark evidence is metadata-only. Its label repeats the exact reviewed
title, docket, decision date, and citation; its evidence URL is the originating
term page; its source date is `2019-03-19`; and its reproduction basis states
that the linked PDF is the complete U.S. Reports volume and is neither fetched
nor retained. The separate citation URL keeps the Court-supplied volume
fragment. The record remains general jurisdiction with zero Nation
associations, and no association is inferred from the caption, parties,
subject, geography, treaty context, or linked opinion.

## Bounded structural observation

The first exact aggregate-only request to the October Term 2018 page returned
exact-URL HTTP 200 UTF-8 HTML with no content encoding or declared length:
107,003 bytes in 11 nonempty chunks. Inert `parse5` inspection counted 2,719
nodes, 1,261 attributes, maximum depth 17, 39,147 text code units, and one
`unexpected-character-in-attribute-name` parse error outside the selected
projection. No response body was written or retained.

A corrected direct-child DOM observation on 2026-07-31 returned HTTP 200
`text/html; charset=utf-8` and 107,004 bytes. It corrected an earlier diagnostic
stack traversal that had reversed table and header order and overstated the
target row index. The page had three tables total. Exactly two opinion tables
had class `table table-bordered`, with 11 and 64 rows respectively including
their headers, for exact data-row counts of 10 and 63. Each opinion table's
direct `th` order was exactly `R-`, `Date`, `Docket`, `Name`, `J.`,
`Citation`. The unique target appeared at data-row index 41 in the second
opinion table. Its separately validated direct `td` order was exactly `22`,
`3/19/19`, `16-1498`,
`Washington State Dept. of Licensing v. Cougar Den, Inc.`, `B`,
`586 U.S. 347`; the citation cell has exact direct style
`text-align: center;` and contains one non-link `span` wrapper with exact style
`white-space:nowrap;` and the same exact visible text. Only the target's name
cell contained a link, with exact raw path
`/opinions/boundvolumes/586BV.pdf#page=546`. The one known
`unexpected-character-in-attribute-name` parse error remained outside the two
opinion tables. No response body was written or retained.

The one-byte response-size difference between the observations is within the
fixed byte ceiling and is not treated as identity. The adapter instead binds
the exact table structure, target table and values, unique target, and link
grammar; the observed row index is evidence, not an identity input.

After the exact wrapper contract was added, one final no-retry production
transport check on 2026-07-31 passed against the same exact term-page URL. It
validated 73 data rows, projected only the single allowlisted row at coordinates
`[1, 41]`, and returned the reviewed date, docket, caption, citation, and
bound-volume fragment. It made no PDF request and retained no response body.

The link is a 1,162-page complete bound volume, not an individual case PDF. The
adapter preserves the exact Court-supplied fragment only in the reporter
citation's `sourceUrl`, sets `urls.officialFullText` to `null`, and does not
fetch, hash, parse, copy, or call the volume an individual-case file. The
citation is the source locator within the controlling printed volume.

## Access, cadence, health, and failure

The page is public HTML with no account, key, registration, paid call, or
access-triggered terms acceptance. The Court publishes no API, numeric
request-rate limit, retry rule, SLA, checksum, or change feed for this fixed
page. Its robots policy allows opinion paths, disallows selected asset paths,
and specifies `Crawl-delay: 1`.

Adapter 1.1 is bounded to one internally constructed weekly build-time GET:

- literal HTTPS URL and host `www.supremecourt.gov`;
- no userinfo, port, query, fragment, redirect, credentials, cookie, referrer,
  user input, term enumeration, search, docket traversal, or browser call;
- exact final URL and HTTP 200 `text/html` with UTF-8;
- identity encoding and fixed 30-second, 256-KiB, 512-chunk, DOM, attribute,
  depth, text, table, and row ceilings;
- exactly the documented term identity, at most three total tables, exactly two
  opinion tables with 11 and 64 rows including headers, exact 10-and-63 data-row
  counts, 73 data rows total, and
  one exact docket `16-1498` row;
- independently validated direct header order
  `R-`, `Date`, `Docket`, `Name`, `J.`, `Citation` and target direct-cell order
  `22`, `3/19/19`, `16-1498`, exact caption, `B`, `586 U.S. 347`;
- exact caption, date, docket, permanent citation, and same-host bound-volume
  link grammar;
- reject current placeholders such as `609/2` and citations that are not
  permanent `volume U.S. page` values;
- project only the allowlisted target fields before normalization; and
- discard all provider bytes and non-target rows without logging them.

The adapter does not fetch the bound-volume link. A missing, duplicate,
renamed, recited, redated, revised, relinked, placeholder-citation,
structurally changed, oversized, challenged, or unavailable target fails the
whole selected source for review. A target revision indicator must also fail
closed rather than be silently applied. The private source projection records
only the validated fact that the target sequence cell contains no revision
element; the public revision-review state is deterministically derived from
that explicit absence evidence.

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
- `general_jurisdiction`, `Unclassified`, and an editorially approved
  `documented-court-decision` landmark with exact metadata-only evidence;
- zero Nation associations; and
- no AI output.

The source remains fully useful as citation-and-link metadata without
reproducing the volume. Landmark selection records the exact title, docket,
decision date, permanent citation, evidence URL, project editorial review
state, and reproduction boundary. It does not reproduce opinion text or imply
legal effect, rights, a Nation relationship, or comprehensive landmark
coverage.

## Broader-source expansion assessment

The separately reviewed [October Term 2025 opinion page](https://www.supremecourt.gov/opinions/slipopinions.aspx?Term=09)
does not inherit the bounded-row contract. The Court says current opinions are
posted as slip opinions and later replaced by versions edited for U.S. Reports
publication. On 2026-07-31 the table mixed permanent citations with incomplete
volume/part placeholders such as `609/2`, and multiple rows exposed later
revision links. The [field definitions](https://www.supremecourt.gov/opinions/definitions.aspx)
confirm that the citation column can be a volume/part placeholder and that the
revision links identify revised electronic slip files.

The current page also includes natural-person and pseudonymous captions. A
term-wide adapter would need a versioned lifecycle and privacy-selection
contract, stable final pagination, exact replacement handling, and a bounded
selection rationale. Neither a placeholder citation nor the absence of a
revision link establishes a bound or complete current version. No broad
current-term adapter, PDF retrieval, personal record, or Court-wide coverage
claim is added. Bounded additional cases remain separate curated-source or
landmark decisions.

## Implementation decision

Source-registry 1.14.0 retains `supreme-court-opinions-curated` independently
with adapter 1.1, exact one-record coverage on 2019-03-19, one runtime host,
metadata-and-links reproduction, and no subject mappings. It remains disabled
pending its source-specific G-J evidence decision; disabled-source rejection
prevents it from emitting a public artifact record.

Record schema and artifact package 1.3 supply the source-neutral judicial
context, metadata-only landmark evidence, and compact/detail integrity needed
by this adapter. The implementation preserves:

1. adjudicating body `Supreme Court of the United States`, with kind `court`;
2. docket `16-1498` independently from record identity and citation;
3. reporter citation `586 U.S. 347` with the exact Court-supplied
   bound-volume fragment as its citation `sourceUrl`;
4. decision date `2019-03-19` without relabeling it as publication;
5. document form `opinion` and source label `Opinions of the Court`;
6. publication status `bound_volume`, source label
   `U.S. Reports, Volume 586`, and a dated as-of value;
7. revision state `no_separate_relationship_exposed`, which is explicitly not
   a complete subsequent-history or legal-effect determination; and
8. the approved `documented-court-decision` criterion, project editorial review
   state, exact metadata-only landmark evidence, and reproduction basis; and
9. exact field provenance plus compact artifact, details, dossier, CSV,
   search, date, historical, privacy, source-health, and LKG behavior.

The stable identity remains the docket-plus-reporter-citation rule. The
term-page URL is `officialSource`; `officialFullText` is null. No existing
field is overloaded, no PDF or other linked body is requested, and no source
activation is implied by the implemented local adapter.
