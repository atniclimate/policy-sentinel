# FederalRegister.gov published-document service documentation review

Access date: 2026-09-02 Pacific; network observations occurred on
2026-09-03 UTC

Roadmap/review source ID: `SRC-FEDERAL-REGISTER`

Runtime source-registry ID: `federal-register` (`enabled: false`)

Authorized tranche: `PNW-05-SRC-FEDERAL-REGISTER-DOC-REVIEW`

Review state: documentation evidence complete; no admission, activation,
adapter, production binding, or provider-content persistence

Recommendation: `RECOMMEND_BOUNDED_ADMISSION_REVIEW`

## Executive determination

`SRC-FEDERAL-REGISTER` identifies the public FederalRegister.gov API operated
through the Office of the Federal Register (OFR) at the National Archives and
Records Administration (NARA), with Government Publishing Office (GPO)
publication custody represented by the official Federal Register collection on
GovInfo. The API base is `https://www.federalregister.gov/api/v1/`. The path
contains `v1`, but the current OpenAPI document declares OpenAPI dialect
`3.0.0` and leaves `info.version` blank. It therefore supplies no semantic API
version or provider change-management promise.

The published-document interface is publicly readable without an API key in
the current documentation and observations. The OpenAPI document declares no
security scheme, and five deliberately small API probes succeeded or failed
without credentials as expected for their inputs. That does not promise
permanent keyless access. No current primary material reviewed here documents a
numeric rate or quota, concurrency ceiling, retry rule, availability target,
SLA, timeout, stable total-result window, cursor lifetime, deprecation schedule,
change-notice channel, or polling/bulk-use contract.

NARA distinguishes an official digitally signed PDF rendition from endorsed
but unofficial HTML and XML renditions. GovInfo identifies its Federal Register
collection as the official daily publication and hosted the exact PDF for
document `2026-16965`. Policy Sentinel must retain separate custody and
rendition types; it must not merge the FederalRegister.gov presentation URL and
the GovInfo official-edition URL or call the PDF cryptographically authenticated
without validating its signature.

The source is a technically plausible metadata-and-link candidate for published
rules, proposed rules, notices, and presidential documents in the documented
1994-forward API history. It is not authority for current codified law, court
outcomes, grant awards, local permits, Nation positions, consultation
sufficiency, treaty effects, geographic or rights conclusions, public comments,
or linked content. The existing repository adapter remains protected historical
implementation evidence and `enabled: false`; this review neither admits nor
activates it.

The two repository identifiers are different namespaces. `SRC-FEDERAL-REGISTER`
is the roadmap/evidence identity for this review. `federal-register` is the
runtime registry entry retained from the B-series implementation, with adapter
`federal-register-adapter` version `1.0.0` and `enabled: false`. Its 2026-07-31
configuration includes `authentication: none`, a 10,000-result observation in
its rate-limit prose, a cadence statement, and `last_known_good` failure mode.
Those values are protected historical configuration, not revalidated PNW
admission evidence or current provider guarantees. A future admission review
must reconcile them against this dossier's documented/observed/unknown split
without treating either identifier or the retained executable adapter as an
automatic admission.

## Review method and evidence classes

This review followed the repository source-review procedure and resolved the
five owner companions as hypotheses and acceptance inputs rather than external
evidence. Their stated preparation date, 2026-09-03, is later than the local
repository date. External facts below therefore use current originating sources
and a 2026-09-02 Pacific access date.

Facts use these classes:

- `DOCUMENTED`: stated by current primary documentation or a maintained source
  artifact.
- `OBSERVED`: a bounded 2026-09-03 UTC response or repository-state observation;
  never a provider guarantee.
- `UNKNOWN`: not established in the reviewed primary material.
- `OWNER_HYPOTHESIS`: supplied for testing but not independently established by
  this review.

The external request plan was declared before access. Exactly 25 of the
30-request ceiling were consumed: eight by the API reviewer, eight by the
rights/case reviewer, eight by the lead allocation, and one reserve request to
close the rendition-status gap. At most two requests were concurrent. No retry
or redirect follow occurred, no credential/account/cookie/form/terms action was
used, and no response body or provider record was written to disk or Git.

## Identity, institutional custody, and legal status

| Element | Finding | Class and consequence |
| --- | --- | --- |
| Service | FederalRegister.gov API at `https://www.federalregister.gov/api/v1/` | `DOCUMENTED`; this is the reviewed interface, not a generic label for every Federal Register surface. |
| Publisher | OFR, within NARA, publishes the Federal Register with GPO distribution/publication support | `DOCUMENTED` by NARA and GovInfo; retain the issuing agency separately from the publication service. |
| API implementation custody | NARA-maintained `usnationalarchives/federalregister-api-core`, reviewed at commit `e9c64236b385c04c7383eef167e6c29d03cfe467` | `OBSERVED`; repository code informs gaps but does not override the deployed contract. |
| Official daily edition | GovInfo's Federal Register collection | `DOCUMENTED`; collection coverage is 1936-present, with period-specific format differences. |
| FederalRegister.gov HTML/XML | Endorsed but unofficial renditions | `DOCUMENTED` by NARA's current FAQ; useful for discovery and reading, not legally equivalent to the official PDF. |
| GovInfo PDF | Official digitally signed rendition when supplied for the document | `DOCUMENTED`; document `2026-16965` was observed at the exact GovInfo URL. Signature validity was not independently verified. |
| Published document identity | `document_number`, publication date, Federal Register citation when supplied, and canonical URLs | `DOCUMENTED` fields; never replace a source identifier with a title, docket, RIN, or URL slug. |
| External docket | A linked Regulations.gov or agency docket is a different source and lifecycle | `DOCUMENTED` interface separation; a docket identifier or link carries no inherited authority, rights, completeness, or ingestion status. |

The Federal Register issue is a permanent publication record at its publication
state. NARA says published documents cannot be unpublished; later corrections
or other disposition documents must remain separate dated records. Policy
Sentinel must preserve the earlier document and typed source relationship rather
than silently replacing history.

## Interface inventory

### Version and generated contract

- Deployed OpenAPI URL:
  `https://www.federalregister.gov/api/v1/documentation.json`.
- OpenAPI dialect: `3.0.0`.
- API server: `/api/v1/` on FederalRegister.gov.
- Semantic version: `UNKNOWN`; deployed `info.version` is blank.
- Current specification observation: 230,046 decoded bytes, SHA-256
  `06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71`.
- Reviewed source-template observation: 21,623 bytes, SHA-256
  `9894095f1ebab32e14c5735870441bbbf25c27d7063e35d7657e23b996b6e23f`.
- The deployed document is generated and includes mutable agency/topic enums.
  Its size/hash difference from the ERB-backed source template is not itself
  contract drift.
- The reviewed source repository was unarchived and had no GitHub release. No
  API deprecation schedule or change-notice contract was found. One individual
  agency identifier parameter is marked deprecated; that is not a service-wide
  lifecycle policy.

### Exact OpenAPI path inventory

| OpenAPI path | Surface | Initial Policy Sentinel decision |
| --- | --- | --- |
| `/documents/{document_number}.{format}` | One published document | Candidate metadata lookup only in a later authorized design. |
| `/documents/{document_numbers}.{format}` | Multiple published documents | Candidate only for bounded same-source relationship reconciliation; partial-result semantics remain observational. |
| `/documents.{format}` | Published-document search | Candidate for a later bounded build-time design; no use in this tranche. |
| `/documents/facets/{facet}` | Published-document facets | Inventory only; generated path and prior `.json` observation diverge. |
| `/issues/{publication_date}.{format}` | One publication-date issue/table of contents | Inventory only; not proof of per-document availability. |
| `/public-inspection-documents/{document_number}.{format}` | One public-inspection item | Excluded. |
| `/public-inspection-documents/{document_numbers}.{format}` | Multiple public-inspection items | Excluded. |
| `/public-inspection-documents/current.{format}` | Current public-inspection inventory | Excluded. |
| `/public-inspection-documents.{format}` | Public-inspection search | Excluded. |
| `/agencies` | Agency vocabulary | Reference inventory only; description/logo fields excluded. |
| `/agencies/{slug}` | Agency detail | Reference inventory only; not an authority hierarchy beyond source-supplied values. |
| `/images/{identifier}` | Image asset | Excluded for rights, necessity, and retention reasons. |
| `/suggested_searches` | Curated search suggestions | Excluded; not record or taxonomy evidence. |
| `/suggested_searches/{slug}` | One curated suggestion | Excluded. |

The source routes also contain paths absent from the generated OpenAPI,
including document autocomplete/search-details, public-inspection
search-details/facets, public-inspection issue facets, agency suggestions, and a
documentation route. They are implementation observations, not documented
external contract surfaces, and are outside this candidate.

### Request formats, search filters, and paging

The OpenAPI `Format` enum is exactly `json` and `csv`. Source code also exposes
an RSS search presentation, but it is absent from that enum and is not an
initial contract surface.

Published-document search declares:

```text
format
fields[]
per_page
page
order
conditions[term]
conditions[publication_date][is]
conditions[publication_date][year]
conditions[publication_date][gte]
conditions[publication_date][lte]
conditions[effective_date][is]
conditions[effective_date][year]
conditions[effective_date][gte]
conditions[effective_date][lte]
conditions[agencies][]
conditions[type][]
conditions[presidential_document_type][]
conditions[president][]
conditions[docket_id]
conditions[regulation_id_number]
conditions[sections][]
conditions[topics][]
conditions[significant]
conditions[cfr][title]
conditions[cfr][part]
conditions[near][location]
conditions[near][within]
```

`per_page` is documented as an integer from 1 through 1,000, default 20. No
documented maximum page or total result window was found. A current tiny search
with `per_page=2` reported `count: 108`, `total_pages: 50`, and two projected
results. That is a dated observation, not permission to infer a 100-result
contract. The repository's earlier observed 10,000-window behavior and its own
2,000-record slicing threshold remain dated implementation evidence, not
provider guarantees.

Facet source code recognizes field facets `agency`, `topic`, `section`, `type`,
and `subtype`, plus date facets `daily`, `weekly`, `monthly`, `quarterly`, and
`yearly`. Endpoint existence does not authorize use or establish completeness.

### Exact external published-document field inventory

The deployed `DocumentField` enum contains exactly 56 requestable names. The
OpenAPI defines requestability but supplies no usable document-response schema,
so every shape below is either a maintained-serializer observation or remains
formally untyped. `Candidate` means only proposed for a later admission review;
it does not authorize fetching or persistence.

| External field | Known or unresolved shape | Initial treatment |
| --- | --- | --- |
| `abstract` | Nullable/untyped source-authored text | Conditional bounded display text after privacy review; never association or legal evidence. |
| `action` | Nullable/untyped source-authored text | Conditional bounded action display; preserve exact language and provenance. |
| `agencies` | Array-like nested agency objects | Candidate minimum identity only; see nested shape below. |
| `agency_names` | Redundant flattened names | Exclude when structured agencies are retained. |
| `amendatory_instructions` | Untyped amendatory text | Exclude. |
| `body_html_url` | URL-like value to body HTML | Exclude from initial profile. |
| `cfr_references` | Items observed with `chapter`, `citation_url`, `part`, `title` | Candidate formal reference; null and historical shapes remain valid. |
| `cfr_topics` | Scheme-distinct CFR topic objects | Candidate exact source vocabulary only; never merge with `topics`. |
| `citation` | Nullable Federal Register citation string | Candidate. |
| `comment_url` | Outbound comment URL | Exclude. |
| `comments_close_on` | Nullable date-like value | Candidate as source-stated deadline, subject to later notices. |
| `correction_of` | Same-source document URL(s), exact shape not in OpenAPI | Conditional typed relationship after target/reciprocity verification. |
| `corrections` | Same-source document URL(s), exact shape not in OpenAPI | Conditional typed relationship after target/reciprocity verification. |
| `dates` | Free-text dates narrative | Exclude initially; structured dates take precedence. |
| `disposition_notes` | Free text | Conditional only after bounded privacy/status review; never synthesize legal effect. |
| `docket_id` | Singular/untyped docket value | Exclude as redundant/ambiguous. |
| `docket_ids` | Array-like docket identifiers | Candidate typed outbound references only; an empty array remains empty. |
| `dockets` | Expanded docket objects | Exclude; linked content and supporting-document counts cross source boundaries. |
| `document_number` | Stable source string | Required candidate identity. |
| `effective_on` | Nullable date-like value | Candidate as source-stated date, not a legal-effect conclusion. |
| `end_page` | Nullable/zero-or-positive page value observed historically | Candidate with paired page validation. |
| `excerpts` | Generated search snippets | Exclude. |
| `executive_order_notes` | Untyped text | Exclude pending a distinct presidential-document need. |
| `executive_order_number` | Nullable/untyped identifier | Exclude pending a distinct need. |
| `explanation` | Feature-flagged generated text | Exclude. |
| `full_text_xml_url` | FederalRegister.gov rendition URL | Link-only candidate; XML body must not be downloaded or retained. |
| `html_url` | FederalRegister.gov document URL | Candidate informational presentation link. |
| `images` | Image objects/URLs | Exclude. |
| `images_metadata` | Image metadata | Exclude. |
| `json_url` | FederalRegister.gov API URL | Candidate source/provenance link, never a browser dependency. |
| `mods_url` | MODS metadata URL | Exclude pending a demonstrated metadata need and separate shape review. |
| `not_received_for_publication` | Untyped publication flag/state | Exclude pending documented semantics. |
| `page_length` | Numeric-like page metric | Exclude as unnecessary. |
| `page_views` | Popularity metric | Exclude. |
| `pdf_url` | Usually a GovInfo or publication PDF URL | Link-only candidate after exact host/rendition verification. |
| `president` | Nested or text person-bearing field, formally untyped | Exclude initially; do not retain a person's identity without a demonstrated need. |
| `presidential_document_number` | Nullable/untyped identifier | Exclude pending a distinct presidential-document profile. |
| `proclamation_number` | Nullable/untyped identifier | Exclude pending a distinct presidential-document profile. |
| `public_inspection_pdf_url` | Public-inspection PDF URL | Exclude. |
| `publication_date` | Date-like value | Required candidate date. |
| `raw_text_url` | FederalRegister.gov text rendition URL | Link-only candidate; body must not be downloaded or retained. |
| `regulation_id_number_info` | Expanded RIN/planning information | Exclude pending separate review. |
| `regulation_id_numbers` | Array-like RIN identifiers | Candidate formal reference. |
| `regulations_dot_gov_info` | Expanded linked Regulations.gov information | Exclude. |
| `regulations_dot_gov_url` | Outbound Regulations.gov URL | Exclude initially; docket ID can remain a typed reference. |
| `related_documents` | Docket-grouped same-source references with nullable relationship label | Conditional only for an explicit provider label and verified target; docket co-occurrence alone is not a relationship. |
| `significant` | Untyped regulatory significance value | Exclude; it must not become urgency or relevance. |
| `signing_date` | Nullable date-like value | Candidate only when applicable. |
| `start_page` | Nullable/zero-or-positive page value observed historically | Candidate with paired page validation. |
| `subtype` | Nullable source value | Candidate exact source value. |
| `title` | Source-authored string | Required candidate display value. |
| `toc_doc` | Table-of-contents presentation metadata | Exclude. |
| `toc_subject` | Table-of-contents presentation metadata | Exclude. |
| `topics` | Source topic values | Candidate exact source vocabulary only; deterministic versioned mapping or `Unclassified`. |
| `type` | Source document-type value | Required candidate classification input; preserve source value. |
| `volume` | Nullable/integer-like Federal Register volume | Candidate formal reference. |

The reviewed maintained `EntryApiConfiguration.api_fields` lists 53 fields;
the deployed enum additionally exposes `amendatory_instructions`, `cfr_topics`,
and `related_documents`. The deployed generated specification is therefore the
requestability inventory, while the source configuration and serializers supply
partial implementation-shape evidence. Neither is a complete response schema.

Current source defaults are not a privacy whitelist:

- JSON index: `title`, `type`, `abstract`, `document_number`, `html_url`,
  `pdf_url`, `public_inspection_pdf_url`, `publication_date`, `agencies`, and
  `excerpts`, plus feature-flagged `explanation`.
- CSV index: `title`, `type`, `agency_names`, `abstract`, `citation`,
  `document_number`, `html_url`, `pdf_url`, and `publication_date`.
- RSS index: `title`, `abstract`, `document_number`, `publication_date`,
  `agencies`, `topics`, and `html_url`.
- Default show: the 53 configured fields except `excerpts`, `agency_names`,
  `docket_id`, and `president`.

### Nested and related shapes

- A document agency may have `raw_name`, `name`, `id`, `url`, `json_url`,
  `parent_id`, and `slug`. Historical rows may supply only `raw_name`; it is the
  minimum identity evidence. A future candidate may retain only `raw_name`,
  `name`, `id`, `slug`, and `parent_id`. Agency descriptions, external URLs,
  logos, and child lists are unnecessary initially.
- Agency-detail output separately exposes `id`, `parent_id`, `child_ids`,
  `child_slugs`, `name`, `short_name`, `slug`, `url`, `agency_url`,
  `description`, `recent_articles_url`, and `logo`. The candidate does not
  inherit that whole object.
- CFR references have observed keys `chapter`, `citation_url`, `part`, and
  `title`; older `chapter` and `part` values can be numeric, string, or null.
- CFR topics have observed keys `cfr_part`, optional/null `cfr_chapter`,
  `topics[]`, and `cfr_title`. They remain a separate scheme from `topics`.
- Related-document entries are grouped by a docket-like key and have observed
  `document_number`, nullable `relationship_type`, `html_url`, nullable
  `action`, `publication_date`, `title`, and nullable `docket_number`.
- Expanded Regulations.gov/docket structures may contain comment URLs, docket
  titles, supporting-document lists/counts, and regulatory-plan links. They are
  excluded rather than treated as Federal Register content.
- Public inspection is a separate 27-field prepublication lifecycle with
  `filed_at`, filing type, PDF metadata, subjects, page views, and agency
  letters. It is not a published-document variant and is excluded in full.

## Candidate Policy Sentinel field policy

No field is implemented by this review. A later admission review may consider
only these tiers:

### Tier 1: purpose-limited structured metadata

```text
document_number
title
type
subtype
publication_date
effective_on
comments_close_on
signing_date
citation
volume
start_page
end_page
agencies.raw_name
agencies.name
agencies.id
agencies.slug
agencies.parent_id
docket_ids
regulation_id_numbers
cfr_references
topics
cfr_topics
```

Every value remains source-specific and field-provenanced. Topics and CFR
topics retain their scheme identity. Only an exact, versioned mapping may
classify them; otherwise the record remains `Unclassified`. Dates remain
source-stated facts and do not by themselves prove current legal effect.

### Tier 2: conditional source language and relationships

`abstract` and `action` may be considered as bounded display text only after a
later privacy/content review establishes a concrete need. Do not extract
contacts, people, addresses, signatures, sensitive locations, legal claims,
Nation associations, policy positions, or status conclusions from them.

`correction_of`, `corrections`, `related_documents`, and `disposition_notes`
remain conditional. A correction must resolve to a same-source document and be
verified directionally; related documents require an explicit provider-supplied
relationship label and target replay. A shared docket or keyword match is not a
relationship. Earlier documents remain preserved.

### Tier 3: typed links only

`html_url`, `pdf_url`, and `json_url` are candidate provenance/rendition links.
`full_text_xml_url` and `raw_text_url` may be retained only as typed
FederalRegister.gov outbound rendition links if a later review needs them.
Policy Sentinel must identify host, custody, rendition type, legal status, and
verification state independently. Retaining a URL never authorizes fetching,
storing, reproducing, or assigning authority to its target.

### Explicit initial exclusions

Exclude all public-inspection objects and links; `body_html_url`; downloaded or
embedded HTML/XML/text/PDF bodies; `amendatory_instructions`; free-text `dates`;
search `excerpts`; feature-generated `explanation`; page views, page length,
popularity, images and image metadata; seals and logos; comments, comment URLs,
commenters, submitter identities, attachments, and mirrored docket data;
expanded Regulations.gov and RIN-plan objects; contacts, names, emails,
telephone numbers, addresses, and signatures; archaeological/cultural-resource
locations or identifiers; sealed/confidential material; and every undocumented
or unreviewed field.

## Operational contract: documented, observed, and unknown

| Topic | `DOCUMENTED` | Current `OBSERVED` | `UNKNOWN` / activation consequence |
| --- | --- | --- | --- |
| Authentication | OpenAPI declares no security scheme | OpenAPI, document, search, and controlled failure requests completed without credentials | Permanence of keyless access and any network-layer policy |
| Account/clickthrough | No API account or clickthrough requirement was found in accessible API materials | No account, login, cookie, form, or agreement action was used | Current FederalRegister.gov legal/about pages redirected to an unapproved block host, so API-specific terms remain incomplete |
| API/site privacy | No current FederalRegister.gov API/site privacy statement was accessible in this review | Probes sent only public request parameters and no account, cookie, person, or private data | Collection/logging/cookie/retention practices for the API/site remain unknown; GovInfo's separate privacy policy does not fill this gap |
| Formats | OpenAPI declares JSON and CSV | JSON success and JSON validation errors observed | RSS is source-code-visible but not in the OpenAPI format enum |
| Paging | `per_page` 1-1,000, default 20; `page` and opaque next link exist | Tiny search returned count 108, two results, `total_pages: 50`, and a string next URL | Stable max page, total-result cap, cursor lifetime, ordering stability, snapshot consistency |
| Rate/quota | No numeric value in reviewed docs | No rate headers appeared on the five probes | Numeric request/quota/concurrency limits, rate headers, throttling semantics |
| Retry | None found | No request was retried; no `Retry-After` observed | Retryable statuses, delay/backoff rule, idempotency guidance |
| Availability | NARA/GovInfo describe publication schedules | Requests succeeded except controlled failures and blocked human pages | SLA, uptime, maintenance, incident/status channel |
| Change management | `/api/v1/` path and generated OpenAPI exist | Blank semantic version; no repository release | Compatibility promise, deprecation schedule, change notice |
| Cache/conditional | None found | JSON responses used `no-store, no-cache, must-revalidate, private`; OpenAPI used `max-age=0, private, must-revalidate`; no success ETag/Last-Modified | Conditional GET support and permitted caching/polling |
| Cadence | NARA says GPO pushes continuously and all published documents are available by 9 a.m. each federal business day; GovInfo says its collection updates by 6 a.m. Monday-Friday except federal holidays | Exact document and rendition were available | These are publication descriptions, not SLAs; API indexing latency is unknown |
| CORS | No contract statement found | `Access-Control-Allow-Origin: *` on successful and 400 JSON responses; absent on the 404 HTML response | Future CORS behavior; public application must remain build-time/static and independent of it |
| Success media | No formal response schema/media contract | 200 `application/json; charset=utf-8` for known document and search | Stable schemas and requiredness |
| Unknown document | No formal error schema | 404 `text/html` for `0000-00000` | Stable media/body and machine error code |
| Invalid date | No formal error schema | 400 JSON `errors` map naming invalid publication date | Stable error wording/key shape |
| Invalid field | No formal error schema | 400 JSON with top-level `message` and `status` keys | Stable error wording/key shape |

The static-build consequence is categorical: even though CORS was observed on
JSON responses, a public browser must not depend on this API. Any later approved
operation must be build-time, bounded, allowlisted, fail-closed, and separated
from the public artifact. This review specifies no transport, retry, cache, or
last-known-good implementation.

## Rights, terms, privacy, and retention

NARA's current FAQ states that permission is not needed to reproduce or
republish content published in the Federal Register and cites 1 CFR 2.6. That
statement is limited to material actually appearing in a Federal Register
edition. It does not grant rights to linked dockets, public comments,
attachments, incorporated-by-reference standards, agency or court pages,
third-party content, images, seals, logos, or other external material.

GovInfo's policies separately address public-domain/copyright status, privacy,
PII redaction, and image rights. Identified images can retain owner rights.
Those policies govern GovInfo and are not a substitute for an inaccessible
FederalRegister.gov API/site privacy statement. Policy Sentinel therefore
remains metadata-and-link first and excludes images, full text, comments,
attachments, person-bearing fields, and sensitive content by default.

The reviewed API-core repository `LICENSE` states GNU AGPL version 3 or later.
That license applies to implementation code, not Federal Register publication
content, GovInfo renditions, logos, or linked material. A CC0 or other license
for another FederalRegister.gov repository was not established in this review
and must not be inferred.

The human developer and about-site pages each returned `302` to
`https://unblock.federalregister.gov/`, which was outside the owner's host
allowlist and was not followed. Consequently, no current API-specific
clickthrough, attribution formula, caching/bulk-use permission, or separate API
license was established from those pages. The deployed interface was readable
without credentials; that observation does not fill the terms gap.

A later source record must retain, for every accepted field, the exact source
URL, retrieval time, source update time when supplied, source document number,
rendition/custody type, transform/mapping version, and validation state.
Corrections and superseding notices remain additive dated provenance. If a
later approved retrieval fails, Policy Sentinel may use only that adapter's
checksum-validated prior approved public shard, preserve its original data-as-
of time, and label it degraded/stale; no such source-pack activation or shard is
created here.

## Coverage and explicit noncoverage

Possible future coverage, after separate admission/design/activation gates, is
limited to published federal rules, proposed rules, notices, and presidential
documents in the documented 1994-forward API search history, using reviewed
metadata, agency-authored bounded text when separately accepted, identifiers,
dates, formal references, and typed rendition links.

This candidate cannot establish:

- complete pre-1994 API-search coverage; GovInfo's 1936 collection is a
  separate custody/interface contract;
- current codified CFR/eCFR law or the legal effect of an amendment;
- court complaints, orders, outcomes, precedent, or current dockets;
- grant awards or recipients absent an exact published notice;
- local permits, software behavior, archaeological records, or cultural
  resource facts;
- Regulations.gov comments, attachments, submitter identities, or complete
  docket history;
- a Nation-specific position, relationship, membership, recognition, treaty
  effect, legal applicability, geographic relation, consultation sufficiency,
  rights impact, or community relevance;
- an intertribal body's position as the position of each member Nation;
- external-link content or reproduction rights; or
- legal equivalence between a FederalRegister.gov HTML/XML rendition and the
  official GovInfo edition.

## Case-boundary acceptance tests

### Point Roberts broadband construction

The companion's July 15, 2026 preliminary-order date and October 4, 2027 trial
date remain `OWNER_HYPOTHESIS` in this review. The exact public Justia order URL
returned 403, no originating court document was available under the authorized
request set, and a third-party docket mirror would not establish current
schedule truth. The source-contract test nevertheless passes because none of
these facts is permitted to come from Federal Register data.

| Test assertion | Federal Register result | Disposition |
| --- | --- | --- |
| General USDA or NTIA program context | Possible only when an exact published document says it | General-jurisdiction context; not proof of a particular award or project. |
| Complaint, pleaded claims, injunction, tailored relief, merits, or outcome | No direct coverage | Require the originating court filing/order. Preserve `preliminary` and never call it final if later verified. |
| October 4, 2027 trial setting | No direct coverage | Require a current official scheduling order/docket; schedule remains mutable. |
| Grant award/recipient/compliance | No direct coverage absent an exact award notice | Require the awarding agency record. |
| County permit or software defect | No direct coverage | Require official county and court evidence. |
| Archaeological, burial, cultural-resource, or consultation facts | No direct coverage | Require authorized originating custody and exclude all site identifiers, locations, maps, and sensitive exhibits. |
| Lummi Nation position | No direct coverage | Require a Lummi-originating record; a pleading remains case-specific. |
| NAGPRA as a pleaded claim | No evidence in this source | Do not attach it without primary complaint/order support. |

No archaeological coordinates, identifiers, quantities, maps, or confidential
consultation details are retained in this review.

### Roadless Rule rescission proposal

Probe P1 and the FederalRegister.gov unofficial text rendition of the published
document establish this direct source coverage:

| Fact | Evidence and limitation |
| --- | --- |
| Identity/title | `2026-16965`, `Special Areas; Roadless Area Conservation` |
| Stage/type | `Proposed Rule`; action says proposed rule and request for public comment |
| Citation | `91 FR 53827` |
| Publication | 2026-08-20 |
| Comment deadline | 2026-09-21, as stated in this notice and subject to later notices |
| RIN | `0596-AD66` |
| CFR reference | Title 36, part 294 |
| Docket | The FederalRegister.gov unofficial text rendition identifies `FS-2025-0001`; the structured API probe returned `docket_ids: []`, so no future normalizer may manufacture a structured value or hide that gap |
| Renditions | FederalRegister.gov informational HTML/XML/text links and the exact GovInfo official PDF link remain distinct |
| Proposal scope | The agency proposes removing/reserving subpart B; the text says the proposal itself authorizes no specific ground-disturbing project and does not affect the Idaho and Colorado state-specific rules |

The case contract further passes these non-inference checks:

- The 2025 announcement, consultation, and EIS-scoping hypotheses remain
  distinct from the 2026 proposed-rule/DEIS publication stage. When the 2026
  notice recounts earlier engagement, the account is USDA's; it is not an
  independently verified Nation position or a consultation-sufficiency finding.
- ATNI Resolution 2025-49 remains an owner-supplied ATNI resolution lead outside
  Federal Register custody. Its canonical custody, adoption, and current status
  were not independently verified here, and no inference may assign it to each
  ATNI member Nation.
- NCAI `SEA-25-102` and `MEM-26-040` remain supported owner-supplied discovery
  leads requiring NCAI-canonical custody, adoption/current-status,
  amendment/withdrawal, and date verification before admission. The companion
  characterizes `ABQ-19-029` as a date-bound historical lead; that custody and
  status also remain unverified here. None was browsed in this tranche, and none
  establishes a Nation-specific position.
- A docket ID or outbound link does not authorize Regulations.gov comment,
  attachment, DEIS, or complete-history ingestion.
- The proposal does not become a final rescission, site-specific approval,
  treaty determination, geographic conclusion, or rights-impact finding.

## Material decisions and rejected alternatives

| Decision | Chosen option | Rejected alternative and reason |
| --- | --- | --- |
| Candidate representation | Documentation/evidence only | Registry metadata was rejected because the live registry has no non-admitted review state and changes would couple to protected adapter/tests. |
| Source identity | FederalRegister.gov discovery and GovInfo official-edition custody remain distinct | One merged `Federal Register` URL/status was rejected because it erases legal-status and rendition provenance. |
| Endpoint scope | Published documents only for a possible initial profile | Public inspection, images, suggestions, and undocumented routes were rejected for lifecycle, rights, privacy, and contract reasons. |
| Field policy | Tiered structured metadata, conditional text/relationships, typed links, explicit exclusions | The 56-field external inventory, default response, or prior adapter allowlist cannot serve as a privacy whitelist. |
| Operations | Store `UNKNOWN` where documentation is silent and date every observation | Numeric limits, retry/SLA promises, or CORS guarantees were not inferred from code or successful probes. |
| Rights | Publication content, implementation code, GovInfo images, and linked content have separate rights | A blanket `public domain` or license-inheritance claim was rejected. |
| Roadless docket mismatch | Preserve the API empty array and separately record the FederalRegister.gov unofficial-text rendition fact | Populating `docket_ids` from expectation or owner prose was rejected. |
| Point Roberts chronology | Exercise the noncoverage boundary but retain external-fact status as hypothesis | A blocked third-party mirror and owner input were insufficient to create court truth. |
| Recommendation | `RECOMMEND_BOUNDED_ADMISSION_REVIEW` | Activation, adapter modification, and automatic admission were outside authority; rejection was unnecessary because a minimized interface is technically plausible. |

## Evidence register

| ID | Class | Originating source | Fact supported | Boundary |
| --- | --- | --- | --- | --- |
| FR-E01 | `DOCUMENTED` | [Deployed OpenAPI](https://www.federalregister.gov/api/v1/documentation.json) | OpenAPI 3.0.0, blank semantic version, base route, 14 paths, JSON/CSV formats, search parameters, 56 fields, page-size range, no security declaration | No response schemas, total cap, rate, SLA, or change promise |
| FR-E02 | `OBSERVED` | [NARA API-core routes](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/config/routes/api.rb) | Generated and undocumented route inventory | Code routes do not become a public contract |
| FR-E03 | `OBSERVED` | [OpenAPI template](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/data/open_api_v3.yml) | Generated-contract source and filters | Template is smaller than the deployed generated document |
| FR-E04 | `OBSERVED` | [Entry configuration](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/app/serializers/entry_api_configuration.rb) | 53 configured fields and default projections | Does not contain all 56 deployed requestable fields |
| FR-E05 | `OBSERVED` | [Entry serializer](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/app/serializers/entry_serializer.rb) | Partial nested/reference shapes and expanded docket/privacy risks | Not a formal external response schema |
| FR-E06 | `OBSERVED` | [Public-inspection configuration](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/app/serializers/public_inspection_document_api_configuration.rb) | Distinct 27-field public-inspection lifecycle | Entire lifecycle excluded |
| FR-E07 | `DOCUMENTED` | [API-core LICENSE](https://github.com/usnationalarchives/federalregister-api-core/blob/e9c64236b385c04c7383eef167e6c29d03cfe467/LICENSE) | GNU AGPL v3 or later for reviewed implementation code | No publication-content, logo, image, or linked-content rights inheritance |
| FR-E08 | `DOCUMENTED` | [NARA Federal Register FAQ](https://www.archives.gov/federal-register/faqs) | 1994 web search history; GPO-to-site cadence; reproduction statement; permanent publication/correction boundary; official PDF versus unofficial HTML/XML | Not an API rate, SLA, or linked-content license |
| FR-E09 | `DOCUMENTED` | [GovInfo Federal Register help](https://www.govinfo.gov/help/fr) | Official daily publication, OFR/NARA publisher, federal-business-day cadence, 1936-present collection, rendition-period differences | GovInfo API access is a separate credentialed contract |
| FR-E10 | `DOCUMENTED` | [GovInfo policies](https://www.govinfo.gov/about/policies) | Copyright/public-domain, privacy/PII, and image-rights distinctions | No blanket public-domain conclusion |
| FR-E11 | `DOCUMENTED` | [GovInfo authentication](https://www.govinfo.gov/about/authentication) | GPO digital-signature and visible-seal verification guidance | Browser display/markers alone do not validate a signature |
| FR-E12 | `OBSERVED` | [GovInfo PDF for 2026-16965](https://www.govinfo.gov/content/pkg/FR-2026-08-20/pdf/2026-16965.pdf) | 200 PDF, 260,175 bytes, SHA-256 `804169a872fb0e02cf0541f2213eb2a4a7c53aa86f4b62767bd90d1bf7d9e8e0` | Official custody verified; cryptographic signature not validated |
| FR-E13 | `OBSERVED` | [Exact 17-field API record request](https://www.federalregister.gov/api/v1/documents/2026-16965.json?fields%5B%5D=document_number&fields%5B%5D=title&fields%5B%5D=type&fields%5B%5D=subtype&fields%5B%5D=abstract&fields%5B%5D=action&fields%5B%5D=publication_date&fields%5B%5D=comments_close_on&fields%5B%5D=citation&fields%5B%5D=docket_ids&fields%5B%5D=regulation_id_numbers&fields%5B%5D=cfr_references&fields%5B%5D=html_url&fields%5B%5D=pdf_url&fields%5B%5D=json_url&fields%5B%5D=full_text_xml_url&fields%5B%5D=raw_text_url) | Identity, title, stage, action, dates, citation, RIN, CFR reference, URLs, empty docket array | One response is not completeness or stability evidence |
| FR-E14 | `OBSERVED` | [Tiny 2026-08-20 search](https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpublication_date%5D%5Bgte%5D=2026-08-20&conditions%5Bpublication_date%5D%5Blte%5D=2026-08-20&per_page=2&page=1&order=oldest&fields%5B%5D=document_number&fields%5B%5D=publication_date) | Search envelope keys, two-field projection, count/total-pages observation | No stable total-result cap or snapshot guarantee |
| FR-E15 | `OBSERVED` | [Unknown document](https://www.federalregister.gov/api/v1/documents/0000-00000.json), [invalid date](https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpublication_date%5D%5Bis%5D=not-a-date&per_page=1&fields%5B%5D=document_number), and [invalid field](https://www.federalregister.gov/api/v1/documents.json?per_page=1&fields%5B%5D=policy_sentinel_nonexistent_field) | 404 HTML and two distinct 400 JSON error shapes; exact values and CORS/cache/rate/retry header observations are in the coordination ledger | Error schema/media stability unknown |
| FR-E16 | `DOCUMENTED` | [FederalRegister.gov text rendition for 2026-16965](https://www.federalregister.gov/documents/full_text/text/2026/08/20/2026-16965.txt) | Docket/RIN/deadline and proposal-scope statements | Unofficial text rendition; used only for this review, not retained |
| FR-E17 | `OWNER_HYPOTHESIS` | Untracked owner companions 15B-15E | Case chronology and future-source leads | Not external evidence; files remain untracked and excluded from canonical validation |

## External request ledger

All timestamps are UTC on 2026-09-03. Bodies were reduced in memory to the
facts above and discarded. A `302` target was not followed. `gh` requests were
read-only and limited to the NARA-maintained API-core repository.

| Allocation | Requests | Result summary |
| --- | ---: | --- |
| API reviewer | 8 | `gh auth status`; blocked developer page; deployed OpenAPI; five compact GitHub repository/tree/blob inspections, one with truncated output and deliberately unused evidence; no retry |
| Rights/case reviewer | 8 | Two blocked FederalRegister.gov human pages; NARA FAQ; GovInfo help, policies, authentication, exact PDF; blocked Justia order; no retry |
| Lead probes P1-P5 | 5 | Known document 200 JSON; tiny search 200 JSON; unknown document 404 HTML; invalid date 400 JSON; invalid field 400 JSON |
| Lead document/spec reads | 3 | Exact text 200; 8,192-byte range 206; OpenAPI 200 used to verify formats/legal-status absence |
| Reserved gap closure | 1 | NARA FAQ 200 used to verify official PDF versus unofficial HTML/XML wording |
| **Total** | **25** | Five requests remained unused; no persisted provider body or record |

Detailed allocation timing and minimized response facts are preserved in the
[coordination record](../development/PNW-05-FEDERAL-REGISTER-DOC-REVIEW-COORDINATION-2026-09-02.md).

## Remaining gaps and exact next gate

These facts remain unresolved and must stay visible in any later review:

- numeric rates, quotas, concurrency, retry/backoff, SLA, timeout, incident,
  deprecation, compatibility, and change-notice contracts;
- stable total-result and paging/cursor behavior;
- formal response and error schemas, requiredness, nullability, and media-type
  guarantees;
- current API-specific terms for polling, caching, bulk use, redistribution,
  attribution, or clickthrough because the human legal/about pages were blocked;
- FederalRegister.gov API/site privacy, logging, cookie, and request-retention
  behavior; GovInfo's separate privacy policy does not resolve it;
- CC0 or logo terms for any separate FederalRegister.gov repository;
- Point Roberts court chronology from an originating court record;
- canonical custody/status for the identified ATNI/NCAI resolution leads; and
- whether a future metadata profile actually needs conditional text,
  relationships, full-text links, or presidential-document identifiers.

The smallest future authority is exact owner authorization for
`PNW-05-SRC-FEDERAL-REGISTER-ADMISSION-REVIEW`: a metadata-only, no-fetch
mapping of this dossier into the real-source admission contract, including an
explicit decision on the remaining terms/operations unknowns and the existing
disabled adapter's non-authoritative status. That review must not implement or
modify an adapter, fetch production content, admit automatically, activate,
bind, publish, accept terms, create an account, or use credentials. Any later
adapter design, source admission, or activation remains a separate exact gate.
