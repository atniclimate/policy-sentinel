# Washington appellate-opinion source review

Accessed: 2026-07-31

Implementation state: evidence-blocked in source-registry 1.13.0; registered
disabled with `adapter: null`; no production records

External authorization: no account, key, registration, or access-triggered
terms were found for the reviewed first-party index. Public availability does
not establish bulk-reproduction permission.

## Primary sources

- [Opinion home and search](https://www.courts.wa.gov/opinions/)
- [Fourteen-day opinion index](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.recent)
- [Available-year inventory](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.displayAll)
- [Opinion-status background](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.page&pgname=opinionBackground)
- [Reporter of Decisions](https://www.courts.wa.gov/appellate_trial_courts/supreme/?fa=atc_supreme.reporter)
- [Free-access reporter overview](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.page&pgname=LexisOverview)
- [Privacy and disclaimer](https://www.courts.wa.gov/?fa=home.notice)
- [Robots policy](https://www.courts.wa.gov/robots.txt)
- [General Rule 14.1](https://www.courts.wa.gov/court_rules/?fa=court_rules.display&group=ga&ruleid=gagr14.1&set=GR)
- [RCW 2.06.040](https://apps.leg.wa.gov/RCW/default.aspx?cite=2.06.040)

The Washington State Administrative Office of the Courts maintains the
first-party index. The Reporter of Decisions prepares Supreme Court and Court
of Appeals opinions for official publication and oversees the separate
publisher contract.

## Interfaces and observed range

The advertised recent page is a rolling 14-day HTML index. One bounded
observation returned 77,799 bytes and 70 unique rows, each with an information
link and a direct slip-opinion PDF link. No response body was written. Annual
indexes use exact court-level, year, and publication-section query values and
show no pagination control. They are not intrinsically small: the 2026 Court
of Appeals unpublished page was 752,808 bytes with 730 unique information
links.

Seven advertised RSS 2.0 feeds expose only title, link, HTML description, and
publication time. They have no GUID, citation, division, revision field, total,
or completeness marker. Both current Supreme Court feed titles omitted a digit
from the docket displayed by the recent HTML page and encoded in the link. The
RSS feed therefore cannot control identity, and Policy Sentinel must not repair
its values by inference.

The Court says the first-party site contains slip opinions filed after
2013-02-22. The current inventory offers Supreme Court and Court of Appeals
sections beginning principally in 2013, but also exposes a 2012 Court of
Appeals published page containing one row labeled only `An Order`. Those facts
do not prove a complete start date, so registry coverage remains null.

## Exact fields and missing citation

The HTML indexes expose:

- court level and, for Court of Appeals rows, division;
- displayed docket and exact caption;
- `File Date`;
- Supreme Court, published, published-in-part, or unpublished section;
- exact `File Contains` label;
- information-sheet URL; and
- direct first-party slip-PDF URL.

The Court explains that filing is the date the appellate court issues its
decision, so a reviewed transform from `File Date` to decision date could
preserve exact evidence. A privacy-safe institutional example was
`Wash. Farm Bureau v. Dep't Of Ecology`, docket `103,413-0`, filed 2026-06-25,
with `Maj., and Con. Opinions`. The index supplied no reporter, neutral, or
other official citation.

Record 1.2 requires at least one exact citation in addition to the docket. A
docket, information token, or PDF filename cannot be relabeled as a citation.
The first-party information pages cannot safely fill the gap because they also
expose judges, counsel, firms, and street or post-office addresses.

## Status and revision semantics

Every first-party file is a mutable slip opinion. Section headings separately
identify published, published-in-part, and unpublished decisions. The Court
explains that official reporter publication supersedes a published slip
opinion and that a red asterisk marks a slip opinion that should no longer be
cited.

The asterisk supplies no typed revision edge, amended-order identifier,
reporter citation, or case-specific current-version link. `File Contains` can
also combine opinions and orders without describing their relationship. The
external free reporter is court-designated, but the reviewed entry point
redirected to an opaque commercial application with no stable enumeration or
deep-link contract. It is not a no-registration build-time supplement.

## Access, reproduction, privacy, and failure

The Court publishes no numeric rate limit, retry rule, SLA, checksum, stable
page-size contract, or change feed. Robots does not disallow `/opinions`, but
that is not a reproduction license. The site asserts AOC copyright and grants
no bulk-copy permission. The safe publication boundary is attribution,
allowlisted metadata, and official links only.

Indexes contain personal, family, dependency, detention, criminal, and
disciplinary captions. A future first increment must select an exact reviewed
institutional row, not classify captions heuristically. It must never retrieve
information pages or PDF bodies and must retain no judges, counsel, addresses,
facts, land information, natural-person enrichment, or source summary.

Any future record remains `general_jurisdiction`, `Unclassified`, and has zero
Nation associations. Captions, keywords, dockets, geography, RSS text, and
document facts are not Nation evidence.

## Decision

Source-registry 1.13.0 records `washington-appellate-slip-opinions` as a
disabled `official_index` source with `adapter: null`, null coverage bounds,
metadata-and-links reproduction, no subject mappings, and its own future
health/last-known-good boundary. Disabled sources emit no coverage, health,
manifest, or record entry.

`G-WA-APPELLATE-CITATION-REVISION-CONTRACT` remains pending. Adapter work can
resume only when originating evidence supplies a privacy-safe exact citation
and case-specific current-version/revision contract, or a deliberate versioned
record and UI change permits citationless slip records. It must forbid
docket-as-citation, filename-derived identity, RSS docket repair, information
page or PDF retrieval, and inferred category or Nation relationships.
