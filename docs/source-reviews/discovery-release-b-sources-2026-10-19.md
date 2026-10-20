# Seeded discovery, Release B: Federal Register and Regulations.gov fields

Access date: 2026-10-19 (Pacific). Two read-only research lanes checked the
primary documentation for the fields and filters Release B would add to the demo
Worker: comment deadlines, dockets, RINs, CFR parts, subject labels and document
types. No API was called, no key was registered and no terms were accepted. This
note opens no engine source gate. It precedes any Worker change, which needs the
owner's approval to deploy (D-083).

## Regulations.gov API v4: confirmed from the official OpenAPI file

Primary sources: <https://open.gsa.gov/api/regulationsgov/> and its linked
<https://open.gsa.gov/api/regulationsgov/v4/openapi.yaml>, both read directly.

- Document attributes confirmed: `commentEndDate` and `commentStartDate`
  (nullable date-time), `docketId`, `documentType` (Notice, Rule, Proposed Rule,
  Supporting & Related Material, Other), `postedDate`, `openForComment`
  (boolean).
- Filters confirmed on `GET /v4/documents`: `filter[docketId]`,
  `filter[commentEndDate]` with `ge`/`le`, `filter[withinCommentPeriod]` (true
  only), `filter[documentType]` (one value), `filter[searchTerm]`.
- `withinCommentPeriod` is a request filter, not a response field. Dockets carry
  no comment-period fields; a docket's open status would have to come from its
  documents.
- Authentication: the api.data.gov key in the `X-Api-Key` header, which the
  Worker already sends.
- Limits: the documentation defers to api.data.gov. The 1,000 requests per hour
  figure and the HTTP 429 behavior come from a search summary of
  <https://api.data.gov/docs/rate-limits/>, not a direct read. Confirm before
  setting a call budget.
- Documented failures: HTTP 403 for a missing or invalid key; HTTP 429 over the
  limit. No full error list exists for `GET /v4/documents`.

Unconfirmed: the terms of service page
(<https://www.regulations.gov/api-terms-of-service>) returned HTTP 403 to
automated reads. A third-party copy of its text asks for a "last updated" date
near reused content, a disclaimer that the government cannot verify the data, and
a statement of non-endorsement. These must be read on the primary page before
product copy relies on them. The bracket syntax for `filter[commentEndDate][ge]`
and multi-value `documentType` need one bounded live call each before use.

## Federal Register API v1: confirmed from the official OpenAPI file

Automated reads of the documentation were redirected to a bot-check page
(`unblock.federalregister.gov`). On 2026-10-20 the owner directed a read through
their own browser session. That read reached
<https://www.federalregister.gov/developers/documentation/api/v1> and its OpenAPI
3.0 file
<https://www.federalregister.gov/developers/documentation/api/v1.json>. The page
states: "FederalRegister.gov APIs do not require API keys".

- `DocumentField` enum confirmed, including `comments_close_on`, `comment_url`,
  `docket_ids`, `dockets`, `regulation_id_numbers`, `regulation_id_number_info`,
  `regulations_dot_gov_info`, `regulations_dot_gov_url`, `cfr_references`,
  `topics`, `effective_on`, `significant`, `dates` and `type`. Shapes are not
  given in the file. One bounded live call must record each field's shape
  before parsing.
- `GET /documents.{format}` conditions confirmed: `conditions[term]`,
  publication and effective date ranges, `conditions[agencies][]`,
  `conditions[type][]` (RULE, PRORULE, NOTICE, PRESDOCU),
  `conditions[docket_id]`, `conditions[regulation_id_number]`,
  `conditions[topics][]` (a fixed enum of CFR indexing terms, including
  `indians`, `indians-tribal-government`, `indians-lands` and
  `grant-programs-indians`), `conditions[significant]`, and
  `conditions[cfr][title]` with `conditions[cfr][part]` (the part requires a
  title). `per_page` maximum is 1000.
- No comment-date condition exists. An "open for comment" view must compare
  `comments_close_on` with the date shown to the reader, and say so.
- `conditions[near][location]` and `conditions[near][within]` exist. Policy
  Sentinel must never use them: safeguards 1 and 4 forbid geography as
  evidence.
- The `topics` enum fits safeguard 2: exact official labels that a versioned
  mapping may use later. They are shown verbatim until then.
- Still unstated in the documentation read: rate limits, CORS behavior and reuse
  terms for document text. Metadata display with links is the current demo
  practice; text reproduction is unchanged.

## What this allows

- Release B may proceed for Regulations.gov comment deadlines, docket
  expansion and the document-type filter, after the terms page is read and each
  new parameter has one bounded live call.
- Federal Register deadlines, docket, RIN, CFR-part, topic and type features
  may proceed. First, one bounded live call records the shapes of the new
  fields, and its trimmed response is kept as the test fixture.
- Every Release B display keeps source wording: "Comments close <date>, as
  stated by Regulations.gov", never a computed legal deadline or a claim that
  comment is open to any particular Tribe.

## What was built (2026-10-20, release 0.9.0)

A Federal Register probe (11:32 UTC, 2 calls) recorded the field shapes.
`comments_close_on` is a date or null. `docket_ids` holds the Federal
Register's own text, such as "Docket No. 260916-0002". `cfr_references` holds
`{title, part, chapter, citation_url}`. `topics` holds display names. The docket
condition matches the exact text. The Worker (deployed as `f6e2b85a`, source
`66a3420`) carries these fields in search contract v2 and looks up docket, RIN
and CFR part within the Federal Register. Five bounded calls after deployment
confirmed the fields, a one-document docket lookup, a CFR lookup and an
unchanged v1. The Regulations.gov half is built but switched off
(`REGULATIONS_V2_CONFIRMED`) until its terms page is read and its fields are
confirmed through the Worker.

The research records, with their evidence quotes, are kept outside the
repository at
`C:\dev\_scratch\policy-sentinel\ncai-discovery-20261019\scouts.json`.
