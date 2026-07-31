# GovInfo credential-free contract and reuse review

Accessed: 2026-07-31

Implementation state: official documentation and credential-free public-source
research complete; a repository-owned synthetic structural contract is locally
permissible; live API validation and adapter activation remain blocked

External authorization: Gate G-B-GOVINFO remains closed for registration,
account creation, API-key issuance, credentialed requests, and build-time API
use

Safe fallback: omit GovInfo-derived records and disclose the source as
unavailable while independent approved sources continue

## Primary sources

- [GovInfo Developer Hub](https://www.govinfo.gov/developers)
- [GovInfo API documentation](https://api.govinfo.gov/docs/)
- [Current GovInfo OpenAPI document](https://api.govinfo.gov/govinfoapi/api-docs)
- [Official GPO API repository](https://github.com/usgpo/api)
- [GovInfo API feature overview](https://www.govinfo.gov/features/api)
- [GovInfo sitemaps](https://www.govinfo.gov/sitemaps)
- [Official GPO sitemap guide](https://github.com/usgpo/sitemap)
- [GovInfo Bulk Data Repository](https://www.govinfo.gov/bulkdata)
- [Official GPO bulk-data guide](https://github.com/usgpo/bulk-data)
- [GovInfo policies](https://www.govinfo.gov/about/policies)
- [GovInfo authentication guidance](https://www.govinfo.gov/about/authentication)
- [GovInfo digital-preservation overview](https://www.govinfo.gov/about/digital-preservation)
- [Congressional Bills help](https://www.govinfo.gov/help/bills)
- [Public and Private Laws help](https://www.govinfo.gov/help/plaw)
- [Statutes at Large help](https://www.govinfo.gov/help/statute)
- [Federal Register help](https://www.govinfo.gov/help/fr)
- [Congressional Record help](https://www.govinfo.gov/help/crec)
- [Bound Congressional Record help](https://www.govinfo.gov/help/crecb)
- [United States Courts Opinions help](https://www.govinfo.gov/help/uscourts)
- [Congressional Hearings help](https://www.govinfo.gov/help/chrg)
- [Congressional Reports help](https://www.govinfo.gov/help/crpt)
- [Congressional Committee Prints help](https://www.govinfo.gov/help/cprt)
- [Congressional Documents help](https://www.govinfo.gov/help/cdoc)
- [Congressional Calendars help](https://www.govinfo.gov/help/ccal)

Only official documentation and bounded, credential-free public GovInfo detail,
rendition, and metadata examples were inspected. The OpenAPI document was
measured only in memory. No collection, published, search, package, granule, or
related API data operation was called; no account or key was requested or used;
no signup form, terms action, provider contact, or paid action occurred; and no
provider response, raw documentation file, publication, or metadata document
was persisted. Any local fixtures must be authored by this repository and must
not copy a provider response or example.

## OpenAPI measurement, path inventory, and limits

The current formal document declares OpenAPI `3.0.1` and API information
version `2.0`. It measured 28,203 UTF-8 bytes with SHA-256
`eb9f8f5a0819a9a0669f71260fc7462b4d27e1d00c91113f33d8dce21e2b53a7`.
That digest is an observation of the upstream document accessed on the date
above, not a repository fixture or a promise that the provider bytes are
immutable.

Its complete path inventory is:

```text
/collections
/collections/{collection}/{lastModifiedStartDate}
/collections/{collection}/{lastModifiedStartDate}/{lastModifiedEndDate}
/packages/{packageId}/granules
/packages/{packageId}/granules/{granuleId}/summary
/packages/{packageId}/summary
/published/{dateIssuedStartDate}
/published/{dateIssuedStartDate}/{dateIssuedEndDate}
/related/{accessId}
/related/{accessId}/{collection}
/search
```

The OpenAPI is useful as a route and parameter inventory, but it is not a safe,
complete response contract. In particular, it does not establish complete
required-property and nullability rules for collection pages, package summaries,
granule summaries, or relationship objects. It does not fully specify the
pagination envelope and terminal cursor behavior, collection-specific metadata,
rendition availability, MODS or PREMIS structure, fixity-to-file binding, or a
complete error model.

The formal path list also omits the content and metadata retrieval routes that
the official API guide documents and package summaries advertise, including
package and granule PDF, HTML, XML, MODS, PREMIS, and ZIP links. Those links
must therefore be treated as advertised per-object capabilities, not formats
guaranteed by the OpenAPI or by collection membership. The POST search route is
outside the credential-free contract: it is not needed to prove deterministic
collection, package, granule, or public-link structure.

## Authentication, rate, browser, and CORS boundary

Every reviewed API operation requires an `api.data.gov` key. The official GPO
guide publishes default regular-key limits of:

- 36,000 requests per rolling hour;
- 1,200 requests per minute; and
- 40 requests per second.

The guide documents `401 API_KEY_MISSING` and `429` rate limiting, but it does
not provide a complete rate-reset, retry, or error-body contract. A key must
never enter a browser asset, public URL, provenance value, fixture, log, error,
source map, cache, or committed file. If future approval permits API use, the
key remains build-time only and any key-bearing URL is redacted before logging
or persistence.

Neither the formal documentation nor the reviewed GPO guides promise CORS.
Bounded public-response header checks on 2026-07-31 did not expose an
`Access-Control-Allow-Origin` header on the tested GovInfo detail, PDF, HTML,
XML, MODS, bulk-listing, or API-documentation responses. That observation is
not a service guarantee. The public application may navigate to official
GovInfo pages and renditions, but it must make no browser-side GovInfo request.

## Discovery dates, cursor pagination, and identity

The collections service requires a collection and `lastModifiedStartDate`,
with an optional end date, and supports at most 1,000 results per page. The
official guide directs clients to begin with the opaque `offsetMark=*` and use
the exact cursor returned in `nextPage`. The former numeric `offset` is
deprecated; `offsetMark` is intended to traverse beyond the former first
10,000-result boundary.

A future client must not calculate, decode, normalize, or reuse an opaque
cursor across queries. It must validate a returned next link against the exact
GovInfo API host, permitted path, collection, date window, and page size; keep
the cursor only in ephemeral retrieval state; reject cursor repetition or query
drift; and never persist a next link containing a key. One official Federal
Register granule example still shows `offsetMark=0`, while the general cursor
instructions require `*`. The general initial-cursor rule and returned
`nextPage` control; the inconsistent example remains a live-canary question.

GovInfo `lastModified` is the time a package was added or updated in GovInfo and
is equivalent to the sitemap modification value. The official guide expressly
states that it is not MODS Date Published, Date Issued, or Date Ingested. The
published service instead filters by issue date. A contract must preserve, not
collapse:

- the source-issued or publication date;
- every retained MODS date with its exact date type;
- GovInfo `lastModified` or sitemap `lastmod`;
- retrieval time; and
- the original data-as-of time of any last-known-good shard.

A package ID identifies one GovInfo publication package. A granule ID identifies
a logical component within its parent package, such as an individual Federal
Register document, Congressional Record item, hearing component, Statutes at
Large section, or court opinion. The stable source keys are therefore
`govinfo:{packageId}` and, when applicable,
`govinfo:{packageId}:{granuleId}`. Package and granule path parameters, summary
identifiers, parent links, and every advertised rendition identifier must agree
before resources are combined.

GovInfo BILLS identity is not Congress.gov bill identity. For example, a
GovInfo ID such as `BILLS-115hr1625enr` identifies one published bill version;
the Congress.gov record identifies the bill across its legislative lifecycle.
One bill can have multiple BILLS packages and later related PLAW and STATUTE
packages. GovInfo `related` and BILLSTATUS links are explicit crosswalk edges,
not permission to merge provider IDs, status history, provenance, or records.

## Public detail, rendition, and metadata URLs

Credential-free public GovInfo links use the following documented forms:

```text
https://www.govinfo.gov/app/details/{packageId}
https://www.govinfo.gov/app/details/{packageId}/{granuleId}
https://www.govinfo.gov/content/pkg/{packageId}/{format}/{accessId}.{extension}
https://www.govinfo.gov/content/pkg/{packageId}.zip
https://www.govinfo.gov/metadata/pkg/{packageId}/mods.xml
https://www.govinfo.gov/metadata/pkg/{packageId}/premis.xml
https://www.govinfo.gov/metadata/granule/{packageId}/{granuleId}/mods.xml
```

These are structural patterns, not authority to invent a URL. Retain only a
link advertised by the applicable public detail page, sitemap, or validated API
summary. Format sets differ by collection and period; a GovInfo `Text` link can
point to an HTML rendition rather than a `.txt` file. Absence of one format
must not cause code to guess an extension or silently substitute a different
legal or publication state.

API content links are key-gated and are unsuitable as public artifact URLs.
The public artifact should retain the keyless GovInfo detail page and reviewed
keyless rendition links. URLs must use HTTPS, an exact allowed host, no user
information, no fragment, and no query or credential.

## Collection-specific coverage and format matrix

| Collection | Official coverage and cadence | Contract limitation |
| --- | --- | --- |
| BILLS | All published bill versions from the 103rd Congress (1993-1994) forward. Updated by 6 a.m. Eastern daily when bills are published and approved for release. | This is published-version coverage, not Congress.gov lifecycle coverage. Each version has its own package. The bulk-data guide describes bulk bill XML only back to the 113th Congress, so bulk data cannot establish 103rd-112th completeness. |
| PLAW | Public and private slip laws from the 104th Congress (1995-1996) forward. | A signed enrolled bill before slip-law publication is not a PLAW package. Preserve enacted/enrolled, published slip law, and later bound Statutes at Large as distinct source states. No fixed update SLA is stated. |
| STATUTE | Volumes 1 to present. Volumes 1-64 were digitized by GPO; 65-116 came from digital imaging for the Library of Congress; day-forward GovInfo coverage begins with volume 117 (2003). | USLM XML is currently documented from volume 117 forward; older-volume XML is a future incremental plan. Historical PDF without XML is expected, not a source outage. Historical material types also vary, including pre-1948 treaties. |
| FR | Official Federal Register from 1936-present; updated by 6 a.m. Monday-Friday except Federal holidays. | Volume 60 (1995)-present has issue PDF/XML and section PDF/text. Volume 59 (1994) is exceptional: issue PDF and section text. Older digitized issues are full-issue PDF only. Missing historic granules or XML is expected. Public Inspection material is unofficial and cannot substitute for the published issue. |
| CREC | Daily Congressional Record from 1994-present; published when Congress is in session and the current year is usually updated by 11 a.m., subject to late-adjournment delay. | A non-session day is a healthy no-update state. CREC daily packages and granules must not be confused with the separately paginated bound CRECB edition. The current CRECB help page ends at 2017 and documents search gaps in some bound sections. |
| USCOURTS | Opinions from selected appellate, district, bankruptcy, and selected national courts; generally 2004-present, with incomplete early holdings and older opinions only selectively and non-comprehensively available. | No regular cadence or comprehensive-court promise is published. Sitemaps are partitioned by court code and year; USCOURTS is not a bulk-data collection. A healthy source remains explicitly `limited`, and missing unadvertised historical opinions are not proof of retrieval failure. |

Other relevant congressional collections are also explicitly selective or
irregular. CHRG can lag a hearing by two months to two years and depends on
committee publication; CRPT, CPRT, and CDOC are select and irregular; CCAL is
cumulative and updates on session days. Their collection headers must not be
converted into comprehensive historical-coverage claims.

## MODS, PREMIS, rendition, and fixity boundary

GovInfo describes a package as a self-describing unit containing available
renditions, descriptive MODS metadata, and preservation PREMIS metadata.
Granules can have their own summaries, renditions, and metadata. The following
constraints apply:

- MODS is source metadata, not a normalized Policy Sentinel record. Parse only
  reviewed elements, preserve each date's declared meaning, and reject unknown
  or conflicting identity fields rather than retaining the raw XML.
- PREMIS can contain object, event, relationship, and fixity information, but
  neither the OpenAPI nor the general guide guarantees that every rendition has
  a checksum, algorithm, or unambiguous object-to-public-URL binding. Provider
  fixity is optional evidence until a live canary proves that exact binding.
- Policy Sentinel's transport SHA-256 is a separate local digest over the exact
  bytes retrieved from an advertised URL. It must not be presented as a GPO
  checksum or digital-signature validation.
- PDF, XML, HTML/text, MODS, PREMIS, and ZIP are optional per object. Validate
  HTTP status, content type, size, identifier agreement, and local digest for
  each retained rendition. Never require a format that the collection's
  historical matrix does not promise.
- Existing packages can be reprocessed. GovInfo recreates public-access copies,
  re-signs applicable PDFs, and updates API/sitemaps. A new `lastModified` plus
  changed bytes can therefore be legitimate, but it requires complete
  re-retrieval and validation before atomic shard replacement.

The API guide documents on-demand generation and caching for package and
granule MODS or ZIP files. The service can return `503` with `Retry-After`,
normally 30 seconds, and can repeat that response while generation continues.
Honor only a bounded, syntactically valid `Retry-After`; a single generated-file
503 is an item-level transient, not evidence that the collection is down.

Beyond the documented missing-key `401`, rate-limit `429`, and generated-file
`503`, the formal contract does not adequately define not-found, malformed
request, authorization, timeout, general `5xx`, error content type/body, or
retry semantics. All other non-2xx responses fail closed and raw error bodies
must not be retained.

## Sitemaps and bulk data are separate contracts

GovInfo sitemaps are explicitly intended for external crawl and harvest. They
are grouped by collection and collection/year; USCOURTS is grouped by
collection/court code/year. Sitemap entries lead to public detail pages, and
the official guide documents the package MODS URL. Sitemap `lastmod` is GovInfo
addition/reprocessing time, not issue date.

Sitemaps cover the reviewed BILLS, PLAW, STATUTE, FR, CREC, and USCOURTS
collections as well as other congressional collections. They can provide a
credential-free change inventory, but they do not supply the package/granule
summary contract, guarantee every format, or prove collection completeness.

The Bulk Data Repository is a different, select XML distribution channel. Its
listed data sets include BILLS, BILLSTATUS, BILLSUM, PLAW, STATUTE, FR, and
several non-scoped collections, but not USCOURTS or CREC. Directory listings
support `/xml/` and `/json/` forms; the official guide warns that an appropriate
`Accept` header is required or a crawler can receive `406`. Bulk collection
coverage can be narrower than GovInfo package coverage, as with BILLS.

On 2026-07-31 the public bulk root returned HTTP 200 with an HTML page titled
`Govinfo Bulkdata Service Error`. This bounded observation is not proof of a
service-wide outage, but it demonstrates that status alone is insufficient:
validate content type and listing structure. No numeric bulk/sitemap rate limit,
availability SLA, or retry contract was found. A future implementation must not
silently switch between API, sitemap, and bulk identities or formats; each path
requires its own validated contract and health evidence.

## Reuse, attribution, and authentication

GovInfo's policy explains that United States Government works are generally in
the public domain, but Government publications can contain copyrighted material
used with permission. Publication in a Government document does not authorize
reuse of that third-party material. GPO describes itself as the printing and
distribution agency and recommends consulting the originating department or
agency before reprinting; customary credit belongs to the originating body.

The initial Policy Sentinel publication policy is therefore
`metadata_and_links`:

- attribute the U.S. Government Publishing Office (GovInfo) and the exact
  originating department, agency, Congress, or court;
- retain source-exact public metadata and reviewed official links;
- do not reproduce full text, images, seals, exhibits, incorporated material,
  or attachments under a blanket public-domain assumption; and
- perform a separate item/field reproduction review before any excerpt or text
  body enters a public artifact.

GovInfo digitally signs and certifies many official PDFs to provide evidence of
integrity and authenticity. Browser PDF viewers may not perform signature
validation, and copied/extracted text does not carry the signature. Policy
Sentinel may label only an individually checked linked PDF as authenticated; it
must not label normalized metadata, HTML, XML, an excerpt, a local digest, or
its own artifact as authenticated GPO content.

## Privacy and raw-field exclusions

GovInfo policy says the authoring agency is responsible for ensuring that its
public information contains no PII, that agencies can use different redaction
criteria, and that content can be redacted after publication. That is not a
PII-free guarantee.

The reviewed public MODS example
`https://www.govinfo.gov/metadata/pkg/USCOURTS-meb-2_10-ap-02064/mods.xml`
contains individual party names in `<party>` and personal `<name>` elements,
with names also present in the case caption. A generic metadata allowlist is
therefore insufficient for USCOURTS.

The contract must reject or discard raw MODS/PREMIS, party and personal-name
elements, personal captions/titles, contact details, addresses, email, phone,
social fields, comments, request headers, cookies, keys, key-bearing links, raw
errors, full-text corpora, and unknown extension fields. It may retain only the
reviewed non-personal package/granule identifiers, collection, official
government author/body, source-defined document type and dates, court code/type
where applicable, validation state, and advertised official links. A USCOURTS
record whose required public title itself contains a person's name must remain
excluded unless the owner separately changes the no-personal-data contract.

No provider token, personal field, raw body, PREMIS document, MODS document, or
ZIP may enter Git, a fixture, log, cache, normalized record, or public artifact.

## Source-specific health and last-known-good behavior

There is currently no approved GovInfo adapter output and therefore no valid
last-known-good GovInfo shard. While G-B-GOVINFO is closed, the only safe state
is omitted/unavailable; synthetic fixtures are never data.

The current shared artifact contract has one health and last-known-good state
per source ID; it cannot yet express independent GovInfo collection shards.
Before activation, live implementation must either add a versioned collection
dimension to health/LKG or use the conservative whole-source state. It must not
claim collection-level degradation while emitting a single source-level health
receipt.

After that representation is resolved and an approved live implementation
exists:

- shard health and last-known-good independently by collection; additionally
  partition USCOURTS by court code/year and issue-based collections by date;
- treat weekends, Federal holidays, and congressional non-session days as
  expected no-update windows for the applicable collection;
- treat documented historical format gaps and permanently selective collection
  coverage as limitations, not transient health failures;
- fail closed on auth/rate/transient exhaustion, cursor repetition, pagination
  or count inconsistency, schema/content-type drift, identity conflict,
  duplicate IDs, missing advertised rendition, checksum mismatch, unexplained
  disappearance, or unsafe URL;
- use only a checksum-validated prior public shard after failure, label it
  stale/degraded, and preserve its original data-as-of time; and
- if no valid prior shard exists, omit only the affected source shard and mark
  it unavailable rather than staling unrelated GovInfo collections.

An enrolled bill cannot be used as PLAW last-known-good, a later Statutes volume
cannot replace a slip law, an issue PDF cannot masquerade as a missing granule,
and bulk data cannot silently replace an API/sitemap package contract. A
reprocessed package or mass sitemap update must be revalidated before promotion.

## Exact credential-free local contract scope

The smallest repository-owned implementation authorized by
B4-GOVINFO-CONTRACT is:

1. `src/contracts/govinfo/constants.ts` containing reviewed collection codes,
   relative route templates, bounded page/size limits, format identifiers, and
   keyless public-host/path rules;
2. `src/contracts/govinfo/query-contract.ts` validating pure relative request
   descriptors for collections, published dates, and package/granule summaries,
   including opaque cursor and page-size constraints, with no host selection,
   key, fetch, or secret API; search and related routes remain outside this
   smallest contract;
3. `src/contracts/govinfo/pagination-contract.ts` validating bounded,
   repository-owned synthetic page traversals with an initial `*`, immutable
   query fingerprint, exact next-request continuity, explicit terminal state,
   and duplicate/cursor rejection without claiming a provider envelope;
4. `src/contracts/govinfo/response-contract.ts` containing strict synthetic
   projections for package and granule identities, advertised rendition links,
   selected MODS fields, optional explicitly unverified PREMIS fixity
   references, and parent/identity agreement;
5. clearly labeled repository-authored fixtures under
   `fixtures/sources/govinfo/`, using impossible IDs and dates, that cover
   representative collection-specific availability, missing formats,
   historical limitations, malformed or unsafe fields, fixity, and 503 cases;
   and
6. offline tests under `tests/contracts/govinfo/` for bounds, key rejection,
   path/identity agreement, collection-specific format matrices, issued versus
   modified dates, cursor termination, exact link allowlisting, raw/PII field
   rejection, optional provider fixity, and separate local SHA-256 semantics.

The synthetic contract must not add `transport.ts`, XML retrieval/parsing of a
provider body, network tests, runtime host selection, environment-secret access,
an adapter entry point, normalization, an enabled source, a production record,
or a generated artifact. The disabled source-registry entry can cite this
review, but it remains `adapter: null` and cannot appear in coverage, health, a
manifest, or an artifact.

## Disposition

B4-GOVINFO-CONTRACT can complete with this dated evidence, a bounded OpenAPI
projection, strict repository-owned synthetic package/granule/MODS/fixity
fragments, and offline tests. That completion does not make GovInfo a production
source and does not establish comprehensive court or congressional coverage.

B4-GOVINFO-LIVE remains blocked by G-B-GOVINFO. Only explicit owner approval of
the then-current registration/key action, secret handling, and bounded
build-time use can authorize live canaries. Those canaries must resolve response
requiredness/nullability, exact cursor termination, content and metadata link
behavior, collection-specific MODS/PREMIS variation, provider fixity binding,
reprocessing, undocumented errors, quota/retry headers, and source-specific
last-known-good behavior before an adapter or public coverage claim is
permitted.
