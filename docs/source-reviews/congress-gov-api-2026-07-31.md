# Congress.gov credential-free contract review

Accessed: 2026-07-31

Implementation state: official documentation research complete; synthetic
resource-contract work is locally permissible; live validation and adapter work
remain blocked

External authorization: Gate G-B-CONGRESS remains closed for registration,
account creation, API-key issuance, credentialed requests, and build-time use

Safe fallback: omit Congress.gov records and disclose the source as unavailable
while independent approved sources continue

## Primary sources

- [Congress.gov API OpenAPI documentation](https://api.congress.gov/)
- [Official Library of Congress API repository](https://github.com/LibraryOfCongress/api.congress.gov)
- [Official API repository README](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/README.md)
- [Library of Congress Congress.gov API overview](https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/)
- [Congress.gov API key page](https://api.congress.gov/sign-up/)
- [Using Congress.gov data offsite](https://www.congress.gov/help/using-data-offsite)
- [Coverage dates for Congress.gov collections](https://www.congress.gov/help/coverage-dates)
- [About legislation](https://www.congress.gov/help/legislation)
- [About legislation and law text](https://www.congress.gov/help/legislation-text)
- [About CRS bill summaries](https://www.congress.gov/help/bill-summaries)
- [Find bills by subject and policy area](https://www.congress.gov/help/find-bills-by-subject)
- [Policy Area field values](https://www.congress.gov/help/field-values/policy-area)
- [Legislative Subject field values](https://www.congress.gov/help/field-values/legislative-subject-terms)
- [Bill text version field values](https://www.congress.gov/help/field-values/bill-text-versions)
- [About congressional member profiles](https://www.congress.gov/help/members)
- [About committee profiles](https://www.congress.gov/help/committee-profiles)
- [Linking to Congress.gov](https://www.congress.gov/help/linking-to-congress-gov)
- [Congress.gov citation guide](https://www.congress.gov/help/citation-guide)
- [Congress.gov data anomalies](https://www.congress.gov/help/data-anomalies)
- [Library of Congress legal overview](https://www.loc.gov/legal/)
- [Library of Congress copyright guidance](https://www.loc.gov/legal/security-copyright-and-privacy/understanding-copyright/)

Only official documentation and repository files were inspected. GitHub
inspection used `gh` read-only after `gh auth status`. No `/v3` data endpoint
was called, no account or API key was requested or used, no signup form or
terms action was submitted, and no provider response or raw documentation body
was persisted. All response fixtures proposed below must be authored
synthetically rather than copied from provider examples.

## OpenAPI version, projection, and unresolved base host

The API page embeds an OpenAPI 3.0.3 JSON object directly in its HTML. It
declares API version `3`, a relative server `/v3`, and an `apiKey` security
scheme named `api_key` in the query. The page does not link a separately
versioned OpenAPI file.

The embedded OpenAPI object was measured entirely in memory as 170,069 UTF-8
bytes with SHA-256
`19a968aaa7e46b0fce5d130b0931022ee72d061aacfa4f92e329a5833357690f`.
No OpenAPI or HTML response file was persisted. The following single-line
normalized review projection is the bounded shape used for this review:

```text
{"openapi":"3.0.3","infoVersion":"3","server":"/v3","security":{"type":"apiKey","in":"query","name":"api_key"},"parameters":{"format":{"default":"xml","enum":["xml","json"]},"offset":"0-first","limitMax":250,"fromDateTime":"YYYY-MM-DDT00:00:00Z","toDateTime":"YYYY-MM-DDT00:00:00Z","sort":["updateDate+asc","updateDate+desc"]},"paths":["/congress","/congress/{congress}","/congress/current","/bill","/bill/{congress}/{billType}/{billNumber}","/bill/{congress}/{billType}/{billNumber}/actions","/bill/{congress}/{billType}/{billNumber}/committees","/bill/{congress}/{billType}/{billNumber}/cosponsors","/bill/{congress}/{billType}/{billNumber}/subjects","/bill/{congress}/{billType}/{billNumber}/summaries","/bill/{congress}/{billType}/{billNumber}/text","/bill/{congress}/{billType}/{billNumber}/titles","/law/{congress}","/law/{congress}/{lawType}/{lawNumber}","/member","/member/{bioguideId}","/committee","/committee/{chamber}/{committeeCode}","/committee/{congress}/{chamber}/{committeeCode}","/summaries"]}
```

Its UTF-8 SHA-256 is
`453bbe000b5e08302e215c42fa77700550f54f1908cf149b30d2869bd02902ae`.
A local contract may pin and hash its own required projection, but must not
present that value as an upstream OpenAPI byte checksum.

Official pages disagree on the runtime base:

- the Library overview publishes
  `https://api.data.gov/congress/v3?api_key=`;
- the OpenAPI server `/v3` resolves relative to `https://api.congress.gov/`;
  and
- the key page's embedded example uses `https://api.congress.gov/v3`.

No live request was made to determine whether both hosts are equivalent,
redirected, or supported with identical behavior. Credential-free code must
therefore model relative paths only and leave runtime-host selection unresolved
until G-B-CONGRESS authorizes a bounded live check.

## Documented resources and response fragments

The reviewed contract needs only the following subset of the API's broader
collection surface.

### Congresses and sessions

`/congress`, `/congress/{congress}`, and `/congress/current` return the
documented `Congresses` array. Each Congress has `name`, `startYear`, `endYear`,
and sessions containing `chamber`, `number`, `startDate`, and `endDate`.
The OpenAPI models the two year values as strings rather than integers.
Congress.gov publishes session history back to 1789, but the API documentation
does not state that the `/congress` endpoint has the same complete range.

### Bills and laws

Bill list and detail paths are `/bill`, `/bill/{congress}`,
`/bill/{congress}/{billType}`, and
`/bill/{congress}/{billType}/{billNumber}`. Documented bill types are `hr`, `s`,
`hjres`, `sjres`, `hconres`, `sconres`, `hres`, and `sres`.

The list model exposes Congress, number, type, title, originating chamber and
code, latest action, `updateDate`, `updateDateIncludingText`, and a resource
URL. The detail model documents introduction, sponsor, policy-area, action,
committee, and related-bill references, but is materially less complete than
the law-detail model and does not provide a safe complete-response contract.

Law paths are `/law/{congress}`, `/law/{congress}/{lawType}`, and
`/law/{congress}/{lawType}/{lawNumber}`, where law type is `pub` or `priv`.
Law identity must remain separate from bill identity even when the law resource
points to the originating bill.

### Sponsors and members

Sponsors are embedded in bill detail; there is no standalone sponsor resource.
Documented sponsor fields include `bioguideId`, official name components,
`fullName`, `isByRequest`, party, state, and member URL. The source schema models
`isByRequest` as the string flag `Y` or `N`, not a boolean. Cosponsors are
available at `/bill/{congress}/{billType}/{billNumber}/cosponsors` with
sponsorship date and original-cosponsor status.

Member list/detail resources include `/member`, `/member/{bioguideId}`, Congress
and state/district filters, and sponsored/cosponsored-legislation subresources.
The BioGuide ID is the official stable member control number. Current member
profiles can also contain contact and depiction data that Policy Sentinel does
not need and must not retain.

### Committees and actions

Bill committee and action paths are
`/bill/{congress}/{billType}/{billNumber}/committees` and `/actions`.
Committee fragments expose activity date/name, chamber, official name,
`systemCode`, type, and URL. General `/committee` list/detail resources add
parent/subcommittee relationships, name history, current status, update date,
and official committee website references.

Action fragments document `actionDate`, `actionCode`, `type`, exact action
text, and source-system code/name. Action prose must not be parsed into a legal
conclusion.

### Summaries, titles, text, and subjects

- Bill summaries are available from the bill `/summaries` resource and from
  `/summaries`, `/summaries/{congress}`, and
  `/summaries/{congress}/{billType}`. Documented metadata includes action date
  and description, version code, chamber information, summary/update dates,
  and text.
- Bill `/titles` fragments contain exact title, title type and numeric code,
  update date, and associated bill-text version code/name.
- Bill `/text` fragments contain text-version date/type and format type/URL.
  The API contract exposes links and version metadata; Policy Sentinel does not
  need the underlying bill text in this credential-free phase.
- Bill `/subjects` fragments contain one Policy Area and zero or more
  Legislative Subjects, with subject update dates when supplied. There is no
  standalone API vocabulary endpoint; the Congress.gov field-value pages are
  the vocabulary authorities.

## Request, sort, pagination, and envelope limits

The OpenAPI documents:

- `format=xml|json`, with XML as the default;
- `offset`, where zero is the first record;
- `limit`, with maximum `250` and no documented default;
- `fromDateTime` and `toDateTime` as update-date filters in the displayed form
  `YYYY-MM-DDT00:00:00Z`; and
- `sort=updateDate+asc|updateDate+desc` only on standalone summary and bill
  cosponsor operations.

The update-date parameters are operation-specific. They appear on bill lists
and bill action, amendment, cosponsor, subject, and title resources, plus
standalone summaries. They do not appear on Congress, law, committee,
related-bill, bill-summary, or bill-text operations. The local query contract
rejects them on those unsupported paths instead of forwarding provider-unknown
parameters.

Bill lists are described as sorted by latest-action date, not by update date.
Their update filters therefore cannot support early termination based on list
order. A future authorized incremental fetch must page the complete bounded
window, overlap windows conservatively, and deduplicate by stable bill identity.
The documentation does not state date-boundary inclusivity or whether the
update filter captures changes represented only by `updateDateIncludingText`.

The embedded OpenAPI does not define a shared request or pagination envelope,
total-count field, next-link shape, maximum offset, or terminal-page rule. It
also has these observable inconsistencies:

- plural list operations often reference a single-item object schema, while
  summaries, titles, text, and Congresses use bare arrays;
- none of the reviewed schemas declares required properties;
- several properties declare `format: date` while their examples contain UTC
  date-times, so the credential-free contract validates and preserves either
  exact documented shape rather than coercing one into the other;
- `CoSponsor` spells the member field `bioguidId`, unlike sponsor and member
  `bioguideId`;
- `RelatedBills` spells `latestAction` as `lastestAction`; and
- relevant operations document only `200` plus a generic `400 Invalid status
  value`, without auth, not-found, quota, transient, or error-body schemas.

Synthetic work must not invent a provider envelope or silently normalize these
documentation defects. Envelope, nullability, alias, and failure behavior stay
for the approved live canary.

## Field-specific coverage and cadence

| Field or resource | Officially documented coverage and limitation |
| --- | --- |
| Congress/session dates | Congress.gov publishes dates back to 1789; API range parity is not stated. |
| Bill/resolution records | All introduced measures from 1973-present; enacted bills and joint resolutions from 1951-1972; selected, incomplete measures from 1799-1873. |
| Actions | Action overview and non-amendment actions from 1973-present; all actions from 1981-present. Historical action records are less complete. |
| Sponsors and cosponsors | Contemporary bill sponsorship/cosponsorship from 1973-present; unavailable on the cited 1951-1972 and selected 1799-1873 records. |
| Member profiles | 1973-present, plus earlier members still serving in the 93rd Congress. |
| Committee data | Profiles reach approximately 1971-present with varying starts; complete committee/subcommittee actions begin in 1981. For 1973-1980, referral, reporting, and discharge are the principal available committee actions. |
| CRS bill summaries | 1973-present; update time varies. In the 119th Congress CRS writes introduced-version summaries only, and older unpublished summaries can be delayed. |
| Titles | Part of contemporary bill records; 1951-1972 enacted records have an official title and selected historical measures have titles, but no separate complete title range is promised. |
| Bill text | Full current coverage from 1993-present; partial or historical material exists for earlier periods and may be missing, incomplete, inaccurate, non-searchable, or unavailable in a desired format. |
| Law text | Full law text from 1951; public/private slip-law full text from 1995-present. |
| Legislative Subjects | 2009-present. |
| Legislative Indexing Vocabulary | 1973-2008 and no longer updated; it is not represented in the reviewed `/subjects` schema. |
| Policy Areas | The coverage table says 1973-present, while subject guidance says the 32-term vocabulary is consistently used only from 1979-present. Use 1979 as the conservative deterministic-mapping boundary until live evidence resolves the discrepancy. |

Current congressional information is usually updated the morning after House
or Senate sessions adjourn. Actions, cosponsors, members, and many committee
fields are estimated around 8 a.m.; summaries, bill text, laws, and several
committee collections vary. Senate bill text can be delayed. The product may
therefore refresh weekly, but source `dataAsOf` and field update times must
remain distinct from build time.

The official Data Anomalies page records current and historical missing XML,
reserved numbers, inaccurate text metadata, and other exceptional records. A
future live adapter must treat that page as evidence that missing formats or
apparently discontinuous numbering are not by themselves retrieval failures.

## Reuse, attribution, and text boundary

Congress.gov expressly describes the API as a way to view, retrieve, and reuse
machine-readable Congress.gov data. The citation guide's examples identify the
site as `Congress.gov, Library of Congress`, which is the conservative product
attribution for this source.

No Congress.gov API-specific terms page, mandatory attribution string, or
blanket field-by-field text-reproduction grant was found in the reviewed
official pages. The Library's legal guidance also cautions that it does not
necessarily own rights in every collection item and that users must determine
and satisfy applicable restrictions.

The initial publication policy must therefore be `metadata_and_links`:

- retain official metadata and durable Congress.gov links;
- identify CRS summaries as CRS analytical products, not statutory text;
- do not reproduce CRS summary bodies or bill/law text until a separate
  source- and field-specific reproduction review approves the exact use; and
- do not assume that linked committee, GPO, or other third-party material
  inherits a blanket Congress.gov reuse grant.

## Safe field allowlist and exclusions

A synthetic resource contract may retain only:

- Congress and session identity, chamber, and start/end dates;
- bill Congress, type, number, exact title, originating chamber/code,
  introduction/update/latest-action dates, resource link, and explicit law
  reference;
- sponsor/cosponsor BioGuide ID, official full name, source role,
  `isByRequest`, original-cosponsor flag, and sponsorship date;
- committee system code, official name, chamber, type, activities/history, and
  official URLs;
- action date, code, type, exact source label/text, and source-system identity;
- summary version/action/update metadata, but not public summary reproduction;
- exact title metadata;
- text-version and format-link metadata, but not text bodies; and
- exact Policy Area and Legislative Subject labels with scheme and update data.

The contract must reject or discard API keys, query strings containing keys,
request/response headers, cookies, raw bodies, raw errors, search echoes,
unknown fields, member birth years, depictions, addresses, phone numbers, email
addresses, personal websites, maps or district geometry, full legislative text,
summary bodies pending rights review, and unrelated committee/member content.
Sponsor name components, party, state, and member-resource URL may be validated
for source structure and identity but are discarded from the retained synthetic
projection; only BioGuide ID, official full name, and the exact by-request flag
survive.

## Identity, provenance, Nation, and taxonomy invariants

- A bill's stable source identity is
  `congress-gov:{congress}:{billType}:{billNumber}`. A law identity separately
  includes Congress, `pub|priv`, and law number. Endpoint path parameters and
  every returned identity fragment must agree before resources are combined.
- Derive the primary source URL from Congress.gov's durable public URL patterns,
  not from a key-bearing API URL. The type-slug mapping must be explicit and
  deterministic.
- Each normalized field records source ID, stable record ID, endpoint and JSON
  pointer, keyless source URL, retrieval time, closest source update time,
  contract/adapter version, transformation rule, and validation state.
- Preserve `updateDate` and `updateDateIncludingText` separately. A text version
  with no own update time must not be assigned retrieval time as though it were
  the source update time.
- An enacted-law relationship must come from an explicit law resource or
  `laws[]` relationship, never from parsing action prose. Likewise, no legal or
  tracker status may be inferred from latest-action text.
- Policy Area and Legislative Subject labels remain exact, scheme-qualified
  source values. Deterministic taxonomy mappings require a versioned exact-label
  rule with provenance; unmapped records remain `Unclassified`. Policy Areas
  and their scope notes can change, so mappings are not timeless facts.
- A broad Indigenous subject label, policy area, sponsor, committee, title,
  geography, eligibility concept, or keyword does not prove a relationship to
  a Nation. Only an exact Nation reference in an official source field, with
  its URL and evidence location, can create a Nation association. Otherwise a
  federal Congress.gov record remains `general_jurisdiction`.
- Congress.gov and any future GovInfo record identities and field provenance
  remain distinct even when they describe or link the same legislation.

Historical pre-1980 records default to metadata-and-link treatment unless they
meet the separately documented landmark criteria.

## Authentication, rate, browser, and failure boundary

An API key is required and is supplied in the query string. That design makes
browser use incompatible with the project's secret boundary: a key could leak
through client code, URLs, logs, caches, referrers, or source maps. CORS is not
documented and would not make browser access acceptable. Any future retrieval
must be build-time only, inject the key outside URL/provenance persistence, and
redact it from diagnostics.

The official Library of Congress API repository README publishes a limit of
5,000 requests per hour. The Library's general legal guidance separately
recommends no more than ten requests per minute to its applications. A future
build must use the more conservative applicable rate until live headers and
gateway behavior are verified behind G-B-CONGRESS; neither number defines
retry timing or the undocumented error envelope.

Because the OpenAPI omits useful auth, not-found, quota, transient, retry, and
error-envelope behavior, future retrieval must fail closed on every non-2xx,
malformed resource, identity mismatch, repeated page, count inconsistency, or
schema drift. Only a checksum-validated prior public shard may be used as
last-known-good after one exists. With no last-known-good shard, omit the source
and mark it unavailable; never publish synthetic contract fixtures as data.

## Exact credential-free local contract scope

The smallest implementation authorized by B4-CONGRESS-CONTRACT is:

1. `src/contracts/congress/constants.ts` containing only reviewed enums,
   bounded sizes, durable-link type slugs, and relative resource paths;
2. `src/contracts/congress/query-contract.ts` validating pure relative
   request descriptors for JSON, offset/limit, UTC update windows, and
   operation-specific sort support, with no host, key, fetch, or secret API;
3. `src/contracts/congress/response-contract.ts` containing strict resource
   fragment types and validators for Congresses/sessions, bills/law references,
   sponsors, committees, actions, summaries, titles, text links, and subjects;
4. clearly labeled synthetic fixtures using impossible identities such as a
   999th Congress and invented BioGuide/committee codes, covering
   representative, missing-optional, malformed, duplicate, unsafe-URL,
   unexpected-field, and historically limited cases; and
5. offline tests for allowlisting, bounds, exact IDs/types/dates/URLs, resource
   identity agreement, query constraints, secret rejection, and exact subject
   preservation.

The contract must not implement or claim a provider response envelope because
the official envelope is not adequately specified. It must add no
`transport.ts`, retrieval, normalization, adapter `index.ts`, enabled registry
entry, runtime host selection, environment secret, network test, provider data,
public record, or generated artifact.

## Disposition

B4-CONGRESS-CONTRACT can complete with the bounded documentation projection,
strict synthetic resource fragments, and offline tests above. It does not make
Congress.gov a production source.

B4-CONGRESS-LIVE remains blocked by G-B-CONGRESS. Only explicit owner approval
of the then-current registration/key action and build-time credentialed use can
authorize bounded live canaries. Those canaries must resolve the base host,
response envelope, field aliases and nullability, pagination termination,
update-window boundaries, text-only update behavior, quota/error/retry behavior,
and source-specific last-known-good semantics before a live adapter or public
coverage claim is permitted.
