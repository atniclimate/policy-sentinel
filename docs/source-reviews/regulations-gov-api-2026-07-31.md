# Regulations.gov credential-free contract and privacy review

Accessed: 2026-07-31

Implementation state: bounded official API, privacy, records, reuse, and notice
research complete; a distinct GET-specific terms instrument was not
established; a repository-owned synthetic structural contract is locally
permissible; live API validation and adapter activation remain blocked

External authorization: Gate G-B-REGULATIONS remains closed for registration,
account creation, API-key issuance, credentialed requests, current terms
acceptance, and build-time API use

Safe fallback: omit Regulations.gov-derived records. The current artifact has
no planned-but-disabled source row, so an artifact-visible unavailable notice
requires a later versioned mechanism; repository coverage documentation records
the planned gap while independently approved sources continue.

## Primary sources

- [Regulations.gov API developer page](https://open.gsa.gov/api/regulationsgov/)
- [Current Regulations.gov OpenAPI document](https://open.gsa.gov/api/regulationsgov/v4/openapi.yaml)
- [api.data.gov developer manual](https://api.data.gov/docs/developer-manual/)
- [Regulations.gov public application](https://www.regulations.gov/)
- [Regulations.gov user notice](https://www.regulations.gov/user-notice)
- [Regulations.gov privacy notice](https://www.regulations.gov/privacy-notice)
- [Deployed Regulations.gov application bundle containing the current notices](https://www.regulations.gov/assets/regs-gov-380e2d546c67d514a14febb086d8a8e2.js)
- [Current eRulemaking 2.0 privacy impact assessment](https://www.gsa.gov/system/files/GSA%20eRulemaking%202%200%20%28PIA-489%29.pdf)
- [GSA services for participating federal rulemaking agencies](https://www.gsa.gov/policy-regulations/regulations/managing-the-federal-rulemaking-process-erulemaking/services-for-federal-rulemaking-agencies)
- [GSA website reuse and copyright policy](https://www.gsa.gov/website-information/website-policies)
- [GAO-21-103181 public-comment limitations](https://www.gao.gov/products/gao-21-103181)

Only official documentation was inspected. The OpenAPI document was measured
in memory and not persisted. The public application returned an automated
access denial for the direct user-notice, privacy-notice, FAQ, and bulk-download
paths, and no attempt was made to bypass the denial. An independent
credential-free review inspected the two notice strings in the public deployed
application bundle entirely in memory. That 906,027-byte UTF-8 asset reported a
2026-07-30 last-modified value and SHA-256
`c66a3e53590c6fb194f6582211574fbc47c907aed1859f360754f47de58971f9`;
the raw bundle was not persisted. The GSA privacy impact assessment, GSA
website policy, GSA participation page, and GAO report supplied independently
readable official privacy, records, reuse, participation, and comment-limit
evidence.

No `api.regulations.gov/v4` data operation was called. No account, key, signup
form, submission key, upload URL, comment, terms action, provider contact, or
paid action occurred. No provider response, raw documentation file, attachment,
comment, or corpus was persisted. Local fixtures must be authored by this
repository and must not copy official examples or responses.

## OpenAPI measurement and complete route inventory

The current formal document declares OpenAPI `3.0.0`, API information version
`4.0`, and the server `https://api.regulations.gov/v4`. It measured 60,826
bytes with SHA-256
`be43c866f5ca424a456bde36ea03cb9326c454ef4e1894a13df80b6dc6e22488`.
The response reported `Last-Modified: Thu, 02 Jul 2026 21:13:41 GMT`. These are
dated observations, not promises of immutability or semantic versioning.
The document itself begins with a disclaimer that it remains a work in
progress and will continue to change until Public API v4 is finalized.

Its complete path inventory is:

```text
GET  /documents
GET  /documents/{documentId}
GET  /comments
POST /comments
GET  /comments/{commentId}
GET  /dockets
GET  /dockets/{docketId}
GET  /agency-categories
POST /submission-keys
POST /file-upload-urls
```

There is no standalone attachment-read operation. Document attachments are
advertised only through
`GET /documents/{documentId}?include=attachments`. Comment-detail attachments
belong to the excluded comment surface.

The following normalized review projection is repository-owned and records only
the bounded facts used by this review:

```text
{"openapi":"3.0.0","infoVersion":"4.0","server":"https://api.regulations.gov/v4","security":{"type":"apiKey","in":"header","name":"X-Api-Key"},"reviewedGetPaths":["/documents","/documents/{documentId}","/dockets","/dockets/{docketId}"],"excludedPaths":["/comments","/comments/{commentId}","/agency-categories","/submission-keys","/file-upload-urls"],"documentTypes":["Notice","Rule","Proposed Rule","Supporting & Related Material","Other"],"docketTypes":["Rulemaking","Nonrulemaking"],"pagination":{"pageNumberMin":1,"pageNumberMax":20,"pageSizeMin":5,"pageSizeMax":250,"maximumResultsPerQuery":5000},"metadata":["hasNextPage","hasPreviousPage","numberOfElements","pageNumber","pageSize","totalElements","totalPages","firstPage","lastPage"],"documentedErrors":{"list":[400,403],"detail":[400,403,404],"gateway":[400,403,404,429]},"rateHeaders":["X-RateLimit-Limit","X-RateLimit-Remaining"]}
```

Its UTF-8 SHA-256 is
`99f02bbbe431478017abd2e2feb2c97b665bd3a22148192d1bd9415da144d2a9`.
This digest is not the upstream OpenAPI checksum.

## Authentication and credential boundary

The OpenAPI applies an `apiKey` security scheme globally:

```text
type: apiKey
in: header
name: X-Api-Key
```

The developer page likewise says every request needs that header. Its copyable
examples nevertheless put `api_key=DEMO_KEY` in the URL. The general
api.data.gov manual permits query-string and Basic-auth variants for some
services.

Policy Sentinel must use none of those forms while G-B-REGULATIONS is closed.
If a later approval permits bounded validation, only an ephemeral build-time
`X-Api-Key` header may be considered. The query-string and Basic-auth variants
remain forbidden because they can leak into logs, provenance, caches, error
messages, history, and persisted URLs. A key, keyed URL, header value, gateway
error echo, or submission credential must never enter Git, a fixture, an
artifact, a browser asset, a source map, or a log.

The developer page's Terms of Participation govern the comment-posting API and
describe additional registration and entity-validation actions for enabling
comment submission. This project does not register for or use either GET or
POST access, does not accept the comment terms, and excludes every comment and
submission operation.

The current Privacy Notice says API users must comply with Regulations.gov
Terms of Service, but the reviewed deployed application contains no distinct
Terms-of-Service route. The privacy impact assessment likewise says
Regulations.gov offers API Terms of Service, while the developer page presents
explicit acceptance language only for registering for and using the Comment
API key. A separate GET-specific terms instrument was not established, so the
current GET terms and registration implications remain a Gate B question
rather than an assumption. The registry cites the actual User Notice and does
not relabel the developer page's Comment API terms as a GET agreement.

## Narrowed request surface

The credential-free contract models pure relative requests for only:

```text
/v4/documents
/v4/documents/{documentId}
/v4/dockets
/v4/dockets/{docketId}
```

It creates no network client and selects no credential source. It rejects
absolute URLs, alternate versions, comments, comment posting, agency
categories, submission keys, file-upload URLs, keyword searches, and every
credential-shaped query parameter.

### Document list

The formal document list parameters are:

- `filter[agencyId]`
- `filter[commentEndDate]`
- `filter[docketId]`
- `filter[documentType]`
- `filter[frDocNum]`
- `filter[searchTerm]`
- `filter[postedDate]`
- `filter[lastModifiedDate]`
- `filter[subtype]`
- `filter[withinCommentPeriod]`
- `sort`
- `page[number]`
- `page[size]`

The documented document types are:

```text
Notice
Rule
Proposed Rule
Supporting & Related Material
Other
```

`withinCommentPeriod` accepts only `true`; false is represented by omission.
Supported sort fields are `commentEndDate`, `postedDate`, `lastModifiedDate`,
`documentId`, and `title`, with comma-separated multi-field sorts and `-` for
descending.

The repository-owned query subset excludes `searchTerm` because a keyword hit
cannot establish category, Nation relationship, jurisdiction, status, or
eligibility. It uses bounded `lastModifiedDate` windows and a deterministic
ascending `lastModifiedDate,documentId` order. Agency, docket, document-type,
and subtype filters may narrow a window but never supply Nation evidence or a
taxonomy mapping.

### Document detail and attachments

`/documents/{documentId}` takes an unconstrained string identifier and an
optional string `include`. The OpenAPI supplies `attachments` only as an
example, not an enum. The local contract permits only an absent include or the
exact value `attachments`.

The source documents `originalDocumentId` as the identifier assigned when a
change causes a new document ID. The relationship among top-level `id`,
`objectId`, `originalDocumentId`, reassignment, withdrawal, deletion, and
tombstones is not documented well enough for a live stable-ID policy.

The current privacy impact assessment also says public-uploaded comment
attachments become documents in a docket and that the application accepts
applications and adjudication documents. A `documents` resource or
`Supporting & Related Material` label therefore does not prove government
authorship, absence of personal data, or cleared reproduction rights.

### Docket list and detail

The formal docket list parameters are:

- `filter[agencyId]`
- `filter[searchTerm]`
- `filter[lastModifiedDate]`
- `filter[docketType]`
- `sort`
- `page[number]`
- `page[size]`

The documented docket types are `Rulemaking` and `Nonrulemaking`. The
developer page demonstrates comma-separated agency acronyms, but the OpenAPI
does not formally define token syntax. Supported sort fields are `title`,
`docketId`, and `lastModifiedDate`.

The local query subset again excludes full-text search and uses a bounded
`lastModifiedDate` window with ascending
`lastModifiedDate,docketId`. Docket IDs remain opaque source identifiers; their
visible segments must not be parsed as legal, agency, temporal, or
jurisdictional conclusions.

## Pagination and date-filter limits

The page-number description allows only 1 through 20 and the page-size
description only 5 through 250, producing a documented maximum of 5,000
retrievable results for one query. Those bounds appear only in prose; the
integer schemas omit `minimum` and `maximum`.

List metadata fields are:

```text
hasNextPage
hasPreviousPage
numberOfElements
pageNumber
pageSize
totalElements
totalPages
firstPage
lastPage
```

The contract treats more than 5,000 results as an incomplete window and fails
closed rather than publishing the first 5,000. A future adapter must split a
window and prove that the resulting union is complete, stable, and duplicate
free. If it cannot, the source is unavailable for that build.

Date-filter prose permits exact, `[ge]`, and `[le]` variants, but the modified
parameter names are not declared separately in the formal parameter list.
`lastModifiedDate` filters are described as `yyyy-MM-dd HH:mm:ss`, their
schemas incorrectly say `format: date`, and response values are ISO 8601
date-times with offsets. A pagination example converts UTC to Eastern time
before filtering, but it is about comments and does not establish a general
time-zone or daylight-saving contract.

The FAQ labels `lastModifiedDate` filtering beta and says it may be removed.
Time zone, precision, inclusivity, equality behavior, same-second ties,
concurrent updates, and boundary duplication all require authorized live
canaries. Credential-free code preserves a source-literal timestamp and must
not silently convert or label it UTC.

## Formal response projection and schema defects

Document search formally exposes:

- top-level `data[]` and `meta`;
- item `id`, `type`, `attributes`, and `links[]`; and
- attributes `agencyId`, comment start/end dates, `docketId`, `documentType`,
  `frDocNum`, `highlightedContent`, `lastModifiedDate`, `objectId`,
  `openForComment`, `postedDate`, `subtype`, `title`, and `withdrawn`.

Docket search formally exposes:

- top-level `data[]` and `meta`;
- item `id`, `type`, `attributes`, and `links[]`; and
- attributes `agencyId`, `docketType`, `highlightedContent`,
  `lastModifiedDate`, `objectId`, and `title`.

Document and docket detail schemas expose their resource fields directly
rather than beneath a conventional JSON:API `data` member. Link properties are
modeled as arrays. Docket detail's 404 response is described as “Document not
found.” Document detail declares `documentId` required in an `allOf` branch
that defines no such property.

Except for that erroneous `documentId`, relevant response schemas declare no
required fields. Most allow unknown properties. The formal schema therefore
does not establish actual response envelopes, requiredness, omission,
nullability, cardinality, bounds, or forward-compatibility behavior. Synthetic
fixtures must not claim to reproduce the provider envelope.

## Docket, document, agency, and subtype meaning

A docket is an organizational folder containing documents. `docketType`
preserves only the source labels `Rulemaking` or `Nonrulemaking`. A document
preserves the exact `documentType` and agency-specific `subtype`.

Agency acronyms, docket types, document types, subtypes, titles, subjects,
topics, keywords, and RINs do not establish a relationship to a Nation. They
also do not support a deterministic Policy Sentinel category without a
separately reviewed exact official vocabulary mapping. Records remain
`general_jurisdiction` and `Unclassified` unless the official source text
supplies the separate evidence required by project governance.

`withdrawn=true` is a source status label. `openForComment`,
`allowLateComments`, comment dates, effective dates, implementation dates, and
restriction fields are source metadata, not legal-effect or deadline advice.
They must not be converted into a legal conclusion.

## Mutable fields and distinct dates

The contract must preserve these distinct source concepts:

- search `lastModifiedDate`;
- detail `modifyDate`;
- document `postedDate`;
- `commentStartDate` and `commentEndDate`;
- `authorDate`;
- `effectiveDate`;
- `implementationDate`;
- `postmarkDate` and `receiveDate`;
- attachment `modifyDate`; and
- attachment `publication`, which is an unformatted string.

The schema does not state that search `lastModifiedDate` and detail
`modifyDate` are identical. Neither is a publication, effective, legal-status,
or retrieval timestamp.

Potentially mutable content includes title, subtype, agency-specific fields,
comment windows, open/late-comment flags, withdrawal and reason fields,
restrictions, docket membership, object/original identifiers, attachment
metadata, attachment URLs, and included relationships. A future normalizer must
record retrieval time and every retained field's provenance, compare mutable
fields to the prior validated shard, and never overwrite the original
data-as-of time of a last-known-good shard.

## Comment and personal-data exclusion

Public comments are entirely outside the beta:

- no comment list or detail;
- no comment text or title;
- no commenter identity or organization;
- no comment tracking, receipt, or moderation state;
- no comment attachments;
- no agency category lookup for comment submission;
- no submission keys, upload URLs, or comment POST; and
- no counts or summaries that imply complete comment coverage.

This exclusion is structural, not merely a runtime filter. The OpenAPI's shared
document-detail base model lists comment text, address lines, city, country,
email, fax, first and last name, phone, organization, ZIP, tracking number, and
agency-configurable fields alongside policy-document metadata. The schema also
permits author arrays on documents and attachments. Raw deserialization or
pass-through storage is therefore forbidden.

The current GSA privacy impact assessment confirms that the system can receive
unsolicited sensitive information and PII through comment forms or uploaded
documents. Partner agencies make redaction and posting decisions case by case,
and unredacted originals can remain in the non-public FDMS backend. GAO likewise
found that commenter identity can be self-reported and inaccurate and that
agencies may not post every duplicate comment. Comment identities, counts, and
availability therefore cannot represent verified people or a complete
submission corpus.

The local projection retains only an explicit allowlist of synthetic
governmental docket, document, date, status, relationship, and attachment
fields. It rejects personal/contact keys, comment keys, unknown fields, raw
provider bodies, and arbitrary extension objects. A later live adapter still
requires field-by-field privacy canaries before any data can enter ephemeral
staging.

## Attachment boundary

An included attachment formally has resource `id`, `type`, attributes, and
links. Attributes can include agency note, authors, abstract, order, file
formats, modified/publication values, restrictions, and title. Each file format
offers `fileUrl`, `format`, and `size`.

`fileUrl` is only a string described as an S3 URL. The OpenAPI supplies no
required URL scheme or host, expiry, redirect, authentication, checksum,
content type, filename agreement, byte-size bound, disposition, malware
control, or reproduction right.

The credential-free contract can prove only synthetic relationship identity,
bounded format labels and sizes, restriction state, and keyless URL hygiene. It
must not retrieve attachment bytes, reproduce content, retain authors or free
text, or treat availability as permission. Direct attachment publication
remains blocked until an approved live canary verifies parent identity,
mutation, privacy, security, and document-specific rights. The safe public
fallback is the reviewed Regulations.gov document detail page.

## Rates, headers, errors, and retries

The api.data.gov manual publishes a generic default of 1,000 requests per
rolling hour, while warning that service-specific and user-specific limits can
vary. Regulations.gov publishes no precise GET quota. Its separate POST/comment
limits of 50 per minute and 500 per hour do not establish GET limits.

The gateway documents these headers on every response:

```text
X-RateLimit-Limit
X-RateLimit-Remaining
```

It does not document a reset or `Retry-After` header. A synthetic contract may
validate the two integers and a 429 `OVER_RATE_LIMIT` control state, but it must
label the generic 1,000/hour value as a default, not an observed Regulations.gov
limit. No blind retry interval may be invented.

The OpenAPI lists 400 and 403 on list routes, plus 404 on detail routes. Its
body is modeled as `errors[]` with `status`, `title`, and `detail`. It does not
model 429, timeouts, or 5xx responses.

The gateway separately documents:

- 400 `HTTPS_REQUIRED`;
- 403 `API_KEY_MISSING`, `API_KEY_INVALID`, `API_KEY_DISABLED`,
  `API_KEY_UNAUTHORIZED`, and `API_KEY_UNVERIFIED`;
- 404 `NOT_FOUND`; and
- 429 `OVER_RATE_LIMIT`.

Gateway errors can use a different `{error:{code,message}}` body and may be
JSON, XML, CSV, or HTML. Error handling must use status and documented codes,
not message prose. Actual backend/gateway precedence, content types, headers,
timeouts, 5xx behavior, and recovery require later live evidence.

## Historical completeness, cadence, and reuse

No reviewed official source promises a single historical start, complete
agency participation, complete field population, or comprehensive docket and
document corpus. GSA currently invites agencies to join “more than 221”
participants, which is not a statement that every federal body participates.
The API page explicitly warns that agency practices and configurable fields
create public-data limitations. A build may report only its documented source
range, selected query window, and actual emitted minimum and maximum dates. It
must never label that observed range as all federal rulemaking.

The privacy impact assessment says partner agencies retain responsibility for
their records and the originating agency retains the record copy, while
GSA-hosted copies use schedules that can permit later destruction. Portal
availability is therefore not an archival or historical-completeness guarantee.

The source changes as agencies post, amend, withdraw, restrict, or replace
dockets, documents, and attachments. Policy Sentinel remains weekly and
build-time only after approval; CORS or public URL visibility cannot authorize
browser API calls.

The reviewed API documentation supplies no blanket right to republish
attachment bytes or all document text. Policy Sentinel remains metadata-and-link
first, attributes Regulations.gov and the exact issuing agency, and uses no
excerpt until source- and field-specific rights are reviewed. Public-comment
visibility is not permission to copy, summarize, or redistribute comments.

The current User Notice says public site information may be distributed or
copied while also making the issuing agency responsible for the content. That
does not establish government authorship or remove restrictions from every
partner-agency document, public submission, or attachment.

GSA's general website policy says most GSA-created federal material may be
copied, while licensed or restricted items require separate permission. That
general rule does not establish that material uploaded by partner agencies or
the public was created by GSA or is rights-cleared. The issuing agency,
submitter, attachment, and document-specific restriction remain controlling.

## Repository-owned synthetic contract decision

The local contract is deliberately narrower than the OpenAPI:

- four pure relative GET request shapes only;
- no transport, API host selection, environment access, or key;
- bounded update windows, stable sort, and complete pages only;
- strict repository-owned docket/document/attachment projections rather than
  provider envelopes;
- exact source labels with no keyword classification or Nation inference;
- public comments and all submission routes structurally absent;
- personal/contact and unbounded free-text fields forbidden;
- attachment metadata only, with no byte retrieval or reuse claim;
- a same-synthetic-document mutation scope that marks provider identity
  behavior unverified, permits docket reassignment, and does not infer identity
  replacement behavior;
- repository safety limits of 250 documents, 64 attachments per document, 8
  formats per attachment, 256 attachments per bundle, and 1,024 formats per
  bundle while live provider bounds remain unknown;
- explicit mutable-field and historical-completeness limitations;
- synthetic rate snapshots rather than claims about live headers; and
- impossible synthetic identities in every committed fixture.

The source registry remains disabled with `adapter: null`. No public record or
artifact is added.

## Live-only questions behind G-B-REGULATIONS

An approved credentialed canary would still need to establish:

1. Actual JSON:API envelopes, links, relationships, and included attachment
   shape.
2. Required, optional, nullable, omitted, and unknown fields by agency and
   resource type.
3. ID syntax, uniqueness, reassignment, withdrawal, deletion, tombstone, and
   disappearance behavior.
4. Exact document-to-docket and attachment-to-document identity rules.
5. `[ge]` and `[le]` acceptance, inclusivity, time zone, daylight-saving,
   precision, same-second ties, and boundary duplication.
6. Stable multi-field sorting and concurrent-update behavior.
7. Exhaustive slicing beyond the 5,000-result query window.
8. Whether beta `lastModifiedDate` covers every relevant mutation and remains
   supported.
9. Attachment requiredness, empty/absent behavior, URL hosts, redirects,
   expiry, authentication, byte limits, formats, checksum availability,
   mutation, privacy, security, and rights.
10. Actual GET quota, both rate headers, 429 recovery, gateway/backend error
    precedence, timeouts, and 5xx behavior.
11. Field, array, page, and response-size bounds.
12. Personal-data and agency-configurable-field behavior despite the unsafe
    shared detail schema.
13. Stable public detail-link rules and issuing-agency attribution.
14. Actual historical range and source-by-source completeness.

Until those questions and the authorization gate are resolved, the source
contributes no public record. Because disabled source IDs are currently absent
from artifact coverage and health, a future public unavailable-source notice
also requires an explicit versioned planned-source disclosure mechanism.
