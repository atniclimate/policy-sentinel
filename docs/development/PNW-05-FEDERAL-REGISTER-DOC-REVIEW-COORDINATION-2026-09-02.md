# PNW-05 Federal Register documentation-review coordination

Date: 2026-09-02
Parent work item: `PNW-05-SOURCE-PACK`
Authorized slice: `PNW-05-SRC-FEDERAL-REGISTER-DOC-REVIEW`
Target source: `SRC-FEDERAL-REGISTER`
Status: documentation review complete; source admission and activation are not
authorized

Terminal disposition:
`PNW_05_FEDERAL_REGISTER_DOC_REVIEW_COMPLETE_ACTIVATION_AUTHORIZATION_REQUIRED`

## Authority and stop boundary

The owner authorized exactly one local evidence tranche: current primary
documentation review of the FederalRegister.gov published-document service,
including bounded public documentation reads, at most five predeclared
unauthenticated API behavior probes, repository-native evidence and handoff
updates, verification, and narrow local commits. The authorization does not
permit an adapter, source admission, source activation, source-pack binding,
runtime or browser retrieval, ingestion, polling, caching, scheduling, full-text
retention, public-inspection ingestion, credentials, terms acceptance, provider
contact, private or sensitive data, another PNW tranche, or any remote or
publication action.

This slice is recorded under the existing parent roadmap item rather than as a
new canonical child ID. While the review is active, `PNW-05-SOURCE-PACK` is the
single `in_progress` item. At a successful terminal checkpoint it returns to
`ready`, because the parent source pack remains incomplete. PNW-06 and PNW-07
remain `not_started`, and `G-PNW-SOURCE-ACTIVATION` remains closed.

The repository's source registry has no candidate-review lifecycle fields. A
registry edit would be a versioned production-configuration change and could be
mistaken for onboarding. This tranche therefore uses documentation and evidence
artifacts only and leaves `config/sources.v1.json`, its schema, and the existing
disabled adapter untouched.

`SRC-FEDERAL-REGISTER` is the roadmap/review identity. The distinct runtime
registry ID is `federal-register`, which retains B-series adapter version
`1.0.0`, `enabled: false`, and dated 2026-07-31 operational/design statements.
Those statements are protected prior configuration, not current PNW admission
evidence; the documentation review records conflicts/unknowns without editing
or silently revalidating them.

## Reconciled starting custody

- Repository root: `I:/policy-sentinel`.
- Branch: `main`.
- Starting HEAD: `0ad4933b03b8c47e68dc8c6bcc5afd1d71148a6b`.
- Relevant predecessor commits:
  `45c8756163dafa96e17bc17d31aefe16e11d1a25`,
  `6f1475dfb72a432ccfe65b16e65035df25a933d3`, and
  `0ad4933b03b8c47e68dc8c6bcc5afd1d71148a6b`.
- Worktrees: one, at `I:/policy-sentinel`.
- Remotes: none.
- Tracked and staged state: clean; no Git index lock.
- Baseline roadmap validation: 63 work items, 41 gates, 14 roadmap sources,
  and 23 binding paths; 32 complete, zero in progress, one ready, 16 blocked,
  zero deferred, and 14 not started.
- Baseline backbone command: 13 JSON Schemas, 13 schema IDs, 924 references,
  71 reported Markdown files, and 260 local links. Inspection showed that the
  71 incorrectly included seven newly supplied owner-input files; the truthful
  pre-tranche canonical Markdown baseline was 64. The literal-path loader/test
  repair below closes that defect.
- Direct roadmap regression: one test passed.

All 20 untracked `docs/00-*` through `docs/15E-*` owner-input files are a
do-not-touch, do-not-stage, do-not-commit set. The five current companions have
these frozen identities:

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/15A-PNW-05-SOURCE-CANDIDATE-QUALIFICATION-AND-AUTHORIZATION.md` | 15,548 | `eda4148c38480081e29b119ecf4c6df7c051cbb235632af93a3e2d740b807b89` |
| `docs/15B-CASE-EXAMPLE-01-LUMMI-POINT-ROBERTS-BROADBAND.md` | 10,359 | `e6e255ae5956c9f685fd840b26b6f3e827553e02f750edd0da043a9955597743` |
| `docs/15C-CASE-EXAMPLE-02-ROADLESS-RULE-RESCISSION.md` | 13,633 | `45c716302379c30eef79307f843d7d982350e2da6debb5a5becf7fb3ddcd7c9e` |
| `docs/15D-PNW-05-CASE-EVIDENCE-CROSSWALK.md` | 13,745 | `61010682c331836619a01c8afaa172c9e82e0b6860de6c3907406aedfce14eda` |
| `docs/15E-PNW-05-TRIBAL-POLICY-CONTEXT-SOURCE-LANDSCAPE.md` | 18,519 | `bde02ceccf87554964d09b30d134b510d69777a377af9564ea46f27f82df069c` |

The companion preparation date of 2026-09-03 is later than the repository
session date. Companion assertions are therefore hypotheses and acceptance
inputs, never current external evidence. Repository facts and external
observations use the actual 2026-09-02 review date.

## Frozen path manifest

Only these authored paths may change in this tranche:

1. `ROADMAP.yaml`
2. `docs/PROJECT-BACKBONE.md`
3. `docs/continuation-prompt.md`
4. `docs/decision-register.md`
5. `docs/source-feasibility.md`
6. `docs/source-coverage.md`
7. `docs/source-reviews/federal-register-api-2026-09-02.md`
8. `docs/development/PNW-05-FEDERAL-REGISTER-DOC-REVIEW-COORDINATION-2026-09-02.md`
9. `docs/handoffs/pnw-federal-register-doc-review-2026-09-02.md`
10. `scripts/validate-backbone.mjs`
11. `tests/pipeline/backbone-validator.test.mjs`

The initial nine-path draft was corrected before external access when the
backbone loader was found to count the seven newly supplied owner inputs as
canonical Markdown. Paths 10 and 11 are the smallest loader/test closure that
keeps those untracked hypotheses outside repository truth. No one-to-one path
substitution is authorized. The lead owns all writes,
integration, staging, commits, and terminal judgment. All agents are read-only.
Any need to change the source registry, source schema, source-pack schema or
runtime, existing adapter, fixtures, tests, dependencies, PNW-01/03/04, K0/S0/O0,
or another path stops for a scope decision rather than expanding this manifest.

## Agent assignments

- Repository-contract reviewer: map canonical evidence paths, status
  invariants, source-registry boundaries, and validators; zero network and zero
  writes.
- API-contract reviewer: inspect the documented interface, generated OpenAPI,
  endpoint/parameter/field sources, history, cadence, and error gaps; read-only
  and limited to its accepted request allocation.
- Rights-and-case reviewer: inspect legal-status, reproduction, terms, privacy,
  retention, linked-content, official-edition, and case-boundary evidence;
  read-only, no 15E source browsing, and limited to its accepted allocation.
- A fresh sovereignty/adversarial reviewer will inspect the stable candidate
  diff with zero network and zero writes.

Agent reports are recommendations. The lead reconciles conflicts against
originating primary evidence and records no claim by vote.

## External request and probe ledger

The entire run has a hard ceiling of 30 HTTP requests, including redirects
where observable. Concurrency is at most two. Requests use direct allowlisted
URLs, do not follow redirects automatically, make no retry loop, and retain no
response body. A transient failure may receive at most one manually recorded
retry. The lead owns the final count.

Allocation before external access:

| Allocation | Maximum | Purpose |
| --- | ---: | --- |
| API-contract reviewer | 8 | FederalRegister.gov documentation/OpenAPI and NARA-maintained GitHub source; `gh auth status` is counted conservatively if used |
| Rights-and-case reviewer | 8 | NARA, FederalRegister.gov policy, GovInfo help/policies/direct official PDF, and the exact public court-order URL only if needed |
| Lead | 8 | Five live probes plus narrow gap-closing reads |
| Unallocated reserve | 6 | Observable redirects, one allowed manual transient retry, or a material evidence conflict |

### Predeclared live API probes

At most these five probes may run. They are observations, not contractual
guarantees. Each result will record request shape, UTC time, status, media type,
relevant CORS/rate/retry/cache headers, minimized body shape, and request count.

| Probe | Request shape | Purpose |
| --- | --- | --- |
| P1 | `GET /api/v1/documents/2026-16965.json` with a minimal explicit field set | Verify one known published-document lookup and observe success headers |
| P2 | `GET /api/v1/documents.json` for 2026-08-20, `per_page=2`, minimal fields | Verify one tiny filtered page, envelope, paging, and count shape |
| P3 | `GET /api/v1/documents/0000-00000.json` | Observe unknown-document behavior |
| P4 | `GET /api/v1/documents.json` with one invalid publication-date value | Observe validation behavior |
| P5 | `GET /api/v1/documents.json` with one non-existent requested field | Observe field-validation behavior |

No throttling, authentication, injection, stress, broad pagination, public-
inspection, image, suggestion, Regulations.gov, or credentialed GovInfo API
request is permitted. No `per_page` value above 1,000 is permitted.

### Completed request ledger

Access date is 2026-09-02 Pacific; timestamps are UTC on 2026-09-03. Exactly 25
requests were consumed. No redirect was followed, no request was retried, and
no body or provider record was persisted. At most two requests were concurrent.

#### API-contract allocation: 8 of 8

| # | UTC time | Request/result | Minimized evidence retained |
| ---: | --- | --- | --- |
| A1 | 03:05:49.828 | `gh auth status`, exit 0; conservatively counted as one | Authentication state only |
| A2 | 03:06:09.260 | FederalRegister.gov developer documentation, 302, zero bytes, Location `https://unblock.federalregister.gov/` | Status/location; target outside allowlist and not followed |
| A3 | 03:06:36.750 | Deployed OpenAPI, 200 JSON, 230,046 decoded bytes, SHA-256 `06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71` | Paths, fields, parameters, formats, schema/version/security facts |
| A4 | 03:07:21.479 | Read-only `gh` GraphQL repository metadata/blobs | Exact main commit, archive/release/license/template metadata |
| A5 | 03:07:36.750 | Read-only `gh` recursive tree, 1,597 entries, not truncated | Relevant maintained-source paths only |
| A6 | Between A5 and A7 | Read-only targeted `gh` GraphQL; output truncated before reliable capture | Counted, not retried, and no claim relies on it; exact timestamp is an explicit ledger gap |
| A7 | 03:10:27.556 | Read-only targeted routes/controllers/OpenAPI-template GraphQL, exit 0, 36,651 response bytes | Fourteen documented paths and source-only route/filter facts |
| A8 | 03:10:49.638 | Read-only targeted configurations/serializers GraphQL, exit 0, 25,581 response bytes | 53 configured versus 56 deployed fields; defaults, nested shapes, distinct 27-field public inspection lifecycle |

#### Rights-and-case allocation: 8 of 8

| # | UTC time | Request/result | Minimized evidence retained |
| ---: | --- | --- | --- |
| R1 | 03:06:10.830 | FederalRegister.gov legal-status anchor, 302 to unallowlisted block host | Status/location only; not followed |
| R2 | 03:06:47.321 | NARA Federal Register FAQ, 200 HTML, 83,240 decoded bytes | Reproduction and publication-cadence facts |
| R3 | 03:07:00.846 | FederalRegister.gov about-site page, 302 to unallowlisted block host | Status/location only; not followed |
| R4 | 03:07:12.873 | GovInfo Federal Register help, 200 HTML, 112,041 decoded bytes | Official collection, publisher, cadence, history, rendition formats |
| R5 | 03:07:27.200 | GovInfo policies, 200 HTML, 64,162 decoded bytes | Public-domain/copyright, privacy/PII, image-rights boundaries |
| R6 | 03:07:54.163 | GovInfo authentication, 200 HTML, 68,316 decoded bytes | Digital-signature/seal verification guidance |
| R7 | 03:08:07.474 | Exact `2026-16965` GovInfo PDF, 200 PDF, 260,175 bytes, SHA-256 `804169a872fb0e02cf0541f2213eb2a4a7c53aa86f4b62767bd90d1bf7d9e8e0` | Official custody; signature markers observed but cryptographic validation not performed |
| R8 | 03:08:21.970 | Exact companion-listed Justia order URL, 403 HTML, 5,791 decoded bytes | No usable court evidence; no retry |

#### Lead allocation and reserve: 9 requests

| # | UTC time | Request/result | Minimized evidence retained |
| ---: | --- | --- | --- |
| P1 | 03:09:38.193 | Known document with 17 explicit fields, 200 JSON, 2,284 decoded bytes | Exact Roadless identity/stage/dates/citation/RIN/CFR/links; `docket_ids: []`; CORS/cache headers |
| P2 | 03:09:38.470 | One date, `per_page=2`, two fields, 200 JSON, 572 decoded bytes | `count:108`, `total_pages:50`, two exact projections, next-link shape; CORS/cache headers |
| P3 | 03:09:38.559 | Unknown document `0000-00000`, 404 HTML, 4,569 bytes | Failure status/media/cache/ETag shape; no CORS header |
| P4 | 03:09:38.644 | Invalid publication date, 400 JSON, 71 bytes | `errors` map and CORS/cache headers |
| P5 | 03:09:38.911 | Invalid requested field, 400 JSON, 78 bytes | Top-level `message`/`status` shape and CORS/cache headers |
| L6 | 03:13:52.783 | Exact Roadless text rendition, 200 text, 41,541 bytes, SHA-256 `1de29498a87dfa2ee31792fd8389725d9989832df1ab6ebedb5836f48de69d97` | Proposal/DEIS/consultation/scope statements; body discarded |
| L7 | 03:14:10.687 | Exact text bytes 0-8191, 206, 8,192 bytes | RIN, deadline, docket text and range-header behavior; body discarded |
| L8 | 03:16:24.472 | Deployed OpenAPI, 200 JSON, 230,046 decoded bytes | Exact JSON/CSV enum and absence of a legal-status statement |
| Z1 | 03:16:45.883 | Reserved NARA FAQ gap-closing read, 200 HTML, 83,240 decoded bytes, SHA-256 `8e487e7a01b6d182f4f9623625b7a46b101aa580b663155ec35f5effb70cd101` | Current official digitally signed PDF versus endorsed/unofficial HTML/XML distinction |

P1-P5 were the only live API behavior probes. L6-L8 and Z1 were exact
documentation/document reads, not additional behavior scenarios. Five requests
remained unused. Observed headers and bodies are not contractual promises.

#### Exact P1-P5 request shapes

The origin for every shape below was exactly
`https://www.federalregister.gov`. Parameter order is preserved from the
executed request.

```text
P1 /api/v1/documents/2026-16965.json?fields[]=document_number&fields[]=title&fields[]=type&fields[]=subtype&fields[]=abstract&fields[]=action&fields[]=publication_date&fields[]=comments_close_on&fields[]=citation&fields[]=docket_ids&fields[]=regulation_id_numbers&fields[]=cfr_references&fields[]=html_url&fields[]=pdf_url&fields[]=json_url&fields[]=full_text_xml_url&fields[]=raw_text_url
P2 /api/v1/documents.json?conditions[publication_date][gte]=2026-08-20&conditions[publication_date][lte]=2026-08-20&per_page=2&page=1&order=oldest&fields[]=document_number&fields[]=publication_date
P3 /api/v1/documents/0000-00000.json
P4 /api/v1/documents.json?conditions[publication_date][is]=not-a-date&per_page=1&fields[]=document_number
P5 /api/v1/documents.json?per_page=1&fields[]=policy_sentinel_nonexistent_field
```

Every request sent `Accept: application/json`, the fixed review user agent,
no credential/cookie, a 30-second abort boundary, and manual redirect handling.
No request redirected.

| Probe | Status/media | Length/hash | Relevant headers | Minimized body shape |
| --- | --- | --- | --- | --- |
| P1 | 200 `application/json; charset=utf-8` | `Content-Length: 1036`; 2,284 decoded bytes; SHA-256 `9aaff45e6c81b887707c5f977e02dcabdd5d5e158612bd2a9c3a77e18f1247b5` | `Access-Control-Allow-Origin: *`; `Cache-Control: no-store, no-cache, must-revalidate, private`; `Vary: Accept-Encoding`; all inspected rate headers and `Retry-After` absent | Exactly the 17 requested keys; 1,366-character abstract present; selected case facts recorded in the dossier |
| P2 | 200 `application/json; charset=utf-8` | `Content-Length: 342`; 572 decoded bytes; SHA-256 `6e50b5b98ab71a72ef0bd7ec4939ab452253fbd2b7bce2414866dc98acf47da1` | Same CORS/cache/vary values as P1; all inspected rate headers and `Retry-After` absent | Keys `count`, `description`, `next_page_url`, `results`, `total_pages`; count 108, total pages 50, two results with exactly the two requested keys |
| P3 | 404 `text/html` | 4,569 bytes; SHA-256 `7d80334cd926333e2ad7bec254d8b787c397ef2b9dd0f6f944168b300e340edf` | Same no-store cache value; ETag `"6a8ec45a-11d9"`; CORS, inspected rate headers, and `Retry-After` absent | HTML, not a JSON error object |
| P4 | 400 `application/json; charset=utf-8` | 71 bytes; SHA-256 `dc11b6e5d6d413f6645dc70c204d4c6821a909f7c7adb00c24123192001bdcff` | `Access-Control-Allow-Origin: *`; same no-store cache value; inspected rate headers and `Retry-After` absent | Top-level `errors` with `publication_date` invalid-date message |
| P5 | 400 `application/json; charset=utf-8` | 78 bytes; SHA-256 `21b70e05310f3ec106a961a5f26f8c77e454e4b0b44bd1274d26b4483aa573e1` | `Access-Control-Allow-Origin: *`; same no-store cache value; inspected rate headers and `Retry-After` absent | Top-level `message` and `status`; message text deliberately not retained |

Inspected rate headers were `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. Their absence is only an observation on these responses.

## Adversarial review record

The first independent sovereignty/adversarial pass returned `REJECT` with six
finite, in-scope findings and confirmed that no registry/schema/adapter/runtime/
fixture/artifact file changed, all 56 external fields were unique, the smaller
candidate tiers were separate, owner companion hashes still matched, and all
authored paths stayed inside the manifest.

The lead repaired the findings without network or scope expansion:

1. every FederalRegister.gov HTML/XML/text reference now says unofficial, with
   official-edition custody reserved for the GovInfo PDF;
2. P1-P5 now preserve exact request shapes, UTC times, status/media, bytes,
   hashes, per-response CORS/cache and rate/retry-header observations, and
   minimized body shapes;
3. roadmap/review ID `SRC-FEDERAL-REGISTER` is explicitly mapped to runtime ID
   `federal-register`, whose disabled adapter and dated B-series configuration
   remain protected but un-revalidated;
4. ATNI/NCAI materials not browsed in this tranche are labeled owner-supplied
   leads with custody/adoption/status unverified;
5. evidence rows use only the declared four-class vocabulary, and
   FederalRegister.gov API/site privacy is an explicit unknown distinct from
   GovInfo policy; and
6. terminal state remained deferred until renewed adversarial approval and the
   required serialized verification closed it atomically.

Renewed review disposition: exact
`APPROVE_PNW05_FR_DOC_REVIEW_CANDIDATE`. No substantive defect remained; only
the predeclared serialized suite and atomic terminal ledger/commit closure were
then pending.

## Decision discipline and acceptance

The candidate dossier must separate `DOCUMENTED`, dated `OBSERVED`, `UNKNOWN`,
and `OWNER_HYPOTHESIS` facts; inventory the external published-document fields
separately from Policy Sentinel's smaller proposed whitelist; preserve
FederalRegister.gov discovery custody separately from GovInfo official-edition
custody; exclude public-inspection, full-text, image, popularity, person-bearing,
comment, attachment, cultural-resource, and sensitive-location content; and
demonstrate both case non-inference boundaries.

Successful review completion may recommend only a bounded later admission or
adapter-design review. It cannot admit or activate the source. Terminal
acceptance requires focused documentation/link/roadmap checks, source and
sensitive-data scans, one serialized full suite, independent adversarial review,
two narrow local commits if the established evidence pattern requires a
follow-up ledger commit, zero active work, unchanged protected files, and the
exact disposition
`PNW_05_FEDERAL_REGISTER_DOC_REVIEW_COMPLETE_ACTIVATION_AUTHORIZATION_REQUIRED`.

## Terminal validation and Git evidence

- Focused direct tests passed: backbone validator 9/9, roadmap regression 1/1,
  source-registry regression 7/7, and hooks 9/9. Focused roadmap/backbone,
  formatting, lint, typecheck, source-boundary, and `git diff --check` commands
  passed.
- The one required terminal command preserved/restored
  `VITEST_MAX_WORKERS=1` around `npm run check`. It passed formatting, lint,
  typecheck, active-state roadmap/backbone/source/foundation validation, all 83
  test files and 1,335 tests in 161.72 seconds, then built and validated 3
  synthetic records, exactly 575 synthetic Nations, and 8 assets at build ID
  `synthetic-b3c631c7991d21088f26`.
- Browser/UI/accessibility checks beyond the unchanged automated suite were
  inapplicable because no application, interaction, route, public artifact
  contract, or runtime source dependency changed.
- Implementation/evidence commit
  `1b7f95e6aea2820d38f6cf9e74356daa00477dc7` contains exactly the dossier,
  source feasibility/coverage indexes, D-055/O-021, and the owner-input
  backbone-loader/test repair in six authorized paths.
- The terminal evidence commit contains only `ROADMAP.yaml`, the project
  backbone, continuation prompt, this coordination record, and the terminal
  handoff. Its SHA is reported by the terminal session because a commit cannot
  self-reference its own ID.
- Terminal roadmap validation must report 63 items and 41 gates with 32
  complete, zero in progress, one ready, 16 blocked, zero deferred, and 14 not
  started. Terminal backbone validation must report 13 JSON Schemas and IDs,
  924 references, 67 canonical Markdown files, and 273 local links.
- Parent `PNW-05-SOURCE-PACK` is `ready`, not complete. PNW-02 remains blocked;
  PNW-06/07 remain not started; the source remains disabled, not admitted,
  inactive, and non-production; all activation/external/convergence gates stay
  closed.
