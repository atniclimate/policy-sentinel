# Idaho appellate-opinion source review

Accessed: 2026-07-31

Implementation state: evidence-blocked in source-registry 1.13.0; the Supreme
Court and Court of Appeals indexes are registered independently, disabled, and
have `adapter: null`; no production records

External authorization: no account or key is required, but no API reuse grant
was found. Idaho Court Administrative Rule 32(e) says bulk distribution of
electronic court data is not allowed, and the site asserts copyright.

## Primary sources

- [Idaho Supreme Court opinions](https://isc.idaho.gov/cases-opinions/isc-opinions)
- [Idaho Court of Appeals opinions](https://isc.idaho.gov/cases-opinions/ica-opinions)
- [Supreme Court procedures](https://isc.idaho.gov/about-the-courts/sc-procedures)
- [Court of Appeals procedures](https://isc.idaho.gov/about-the-courts/ica-procedures)
- [Idaho Appellate Rules](https://isc.idaho.gov/rules-procedure/iar)
- [Idaho Court Administrative Rules](https://isc.idaho.gov/rules-procedure/icar)
- [Robots policy](https://isc.idaho.gov/robots.txt)
- [Sitemap](https://isc.idaho.gov/sitemap.xml)

The Idaho Judicial Branch is the originating publisher. The Supreme Court page
says cited opinions, and the Court of Appeals page says opinions, are posted on
release day. Both warn that staff summaries are only for public convenience
and are not the Court's opinion. The summaries are excluded completely.

## Current interface and fields

The official client uses undocumented same-origin JSON routes for content
search and document detail. Search uses document type, descending entry date,
an optional keyword/year/category, a default 20-item page, and an opaque cursor.
There is no published total, cursor lifetime, stable ordering guarantee, API
schema, rate limit, retry rule, SLA, checksum, or change feed. Unsupported
values can normalize silently, so a future contract would have to assert exact
scope and limits rather than trust request echo.

The allowlistable metadata is:

- adjudicating court from the page/document type;
- docket or comma-separated dockets;
- exact title/parties and release date;
- source category such as civil, criminal, or unpublished;
- individual official opinion link, MIME type, and displayed size.

Release dates were observed in both `YYYY-MM-DD` and `YYYY/MM/DD`. The interface
also exposes author, free-text summary, SEO description, notes, summary file,
and other content that Policy Sentinel must reject.

## Observed range, not completeness

Ascending one-row observations found:

- Supreme Court: 2019-09-11, docket `44182`; and
- Court of Appeals: 2013-07-12, docket `39073`.

Descending observations reached 2026-07-29 and 2026-07-31 respectively on the
access date. The UI merely generates a rolling 20-year selector; older tag
queries and surviving legacy PDFs do not establish a complete archive. Registry
coverage uses the observed lower bound for each independent index and labels it
non-comprehensive.

## Citation, finality, and revision gaps

Neither index supplies a per-record Idaho Reports, Pacific Reporter, neutral,
or other official citation. A docket, CMS ID, or PDF filename is not a citation,
and record 1.2 requires at least one citation distinct from the docket.

Idaho Appellate Rules make finality depend on later rehearing, modification,
review, and remittitur events. The index exposes none of them. Top-level CMS
`published` is only web-publication state, while `Archived` is a search tag and
cannot mean withdrawn or superseded.

One reviewed institutional item exposed substitute/amended wording only in a
top-level filename and media path while its notes were blank and no prior item,
replacement URL, or typed relationship was present. Filename inference cannot
create an amendment, substitution, or finality state.

## Access, reproduction, privacy, and failure

Robots does not disallow the two index pages or observed same-origin JSON
routes, but that is not reuse permission. Opinion files use a separate
`api.isc.idaho.gov` host whose robots path returned no policy. ICAR 32 permits
public inspection and copying of opinions but expressly restricts bulk
distribution of electronic court data. No body crawl or provider contact is
authorized.

Index metadata and summaries include natural persons, Doe/minor matters,
estates, custody, domestic violence, criminal matters, and other sensitive
content. A future adapter must exclude author, personal parties, summary,
summary file, notes, SEO/free text, and PDF bytes. It must never select by
Nation keyword or infer association from a caption, category, geography, or
case content. Any record remains `general_jurisdiction`, `Unclassified`, and
has zero Nation associations.

## Decision

Source-registry 1.13.0 registers `idaho-supreme-court-opinions` and
`idaho-court-of-appeals-opinions` as independent disabled `official_index`
sources with `adapter: null`, metadata-and-links reproduction, observed but
non-comprehensive lower bounds, no mappings, and separate future health and
last-known-good boundaries. Disabled sources emit no public metadata.

`G-ID-APPELLATE-CITATION-FINALITY-CONTRACT` remains pending. Adapter work can
resume only when originating evidence supplies an exact per-record citation,
finality/remittitur state, typed amendment/substitution relationships, a
permitted bounded interface, and a privacy-safe selection contract. It must not
fetch staff summaries or PDFs, infer status from CMS tags or filenames, or use
contact as a workaround without exact owner approval.
