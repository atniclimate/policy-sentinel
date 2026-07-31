# Architecture

## Recommendation

Build Policy Sentinel as a static TypeScript application with a separate
build-time ingestion pipeline. There is no browser-to-provider API path, runtime
database, application server, LLM dependency, telemetry service, or private
data path in the public build.

Recommended Phase B stack:

- TypeScript on the current Node.js LTS line, with Node's built-in `fetch` for
  adapters;
- Vite for deterministic static builds and Preact for a small, accessible
  stateful interface;
- JSON Schema Draft 2020-12 and Ajv for source, record, taxonomy, manifest, and
  artifact validation;
- Vitest and Testing Library for logic/component tests, `axe-core` for
  automated accessibility checks, and Playwright for keyboard, responsive,
  print, download, and built-site tests;
- `saxes@6.0.0` as the narrowly scoped, build-time, namespace-aware XML event
  parser for the bounded Washington Legislative Web Services SOAP contract
  (Decision D-025);
- `parse5@8.0.1` as the pinned, inert build-time HTML parser for the bounded
  Washington Governor executive-order index contract (Decision D-032); and
- a dedicated client-side search library only if an artifact-size and latency
  benchmark shows that a simple prebuilt token index is insufficient.

These packages are build tooling or local UI code; none requires an additional
hosted service. Do not add a framework with a server runtime, hosted search,
analytics, a database, a PDF service, or a job service without a documented
need and owner approval. Use browser print styles and a tested RFC 4180 CSV
serializer first.

## System boundary

After the required gates are approved, the weekly and manual workflows will
follow this path:

```text
official sources
      |
build-time adapters -> ephemeral raw staging -> normalization
      |                                      |
source registry/terms -----------------> schema + policy validation
                                             |
prior public shards -> last-known-good merge |
                                             v
                         compact index + detail shards + manifests
                                             |
                         static app build and artifact validation
                                             |
                              approved GitHub Pages artifact
```

Raw responses remain in ephemeral runner space and are discarded. Only
whitelisted, validated public fields enter the deployment artifact.

The bounded Washington LWS transport constructs only allowlisted SOAP 1.1
requests. Its operation descriptors are frozen at both levels at runtime, and
its flat XML policy is also runtime-frozen, so importing code cannot mutate
endpoint paths, wrapper names, item caps, or parser budgets. Its transport
policy and sanitized error-code allowlist are likewise frozen, preventing
runtime changes to the timeout, media type, user agent, or chunk ceiling. The
transport makes one credential-free attempt with automatic redirects,
referrers, and caching disabled and fixed request media headers. One 30-second deadline uses
cancellation during fetch and streamed body collection plus monotonic
elapsed-time checks immediately before and after bounded parsing. The response
must keep the exact request URL, return HTTP 200, use `text/xml` with
no charset or UTF-8 and either no `Content-Encoding` or `identity`, and contain
between 1 byte and 2 MiB in no more than 4,096 non-empty stream chunks.
Non-200 bodies are canceled without inspection. Every response-byte buffer
retained by the transport passes directly into the typed parser and is zeroed
before release; unread bodies or remainders are canceled. No response-byte
buffer crosses the transport boundary or enters logs or storage. This
conservative rule remains in force after one successful known-bill aggregate
canary and is not evidence about other operations, provider fault behavior, or
complete coverage.
Transport failures expose a repository-defined category, a numeric HTTP status
when one was received, and static text without provider body or network-error
content.

The manual LWS canary observer sits immediately above that transport. Report
contract 1.1 has one repository-owned known-bill `GetLegislation` scenario and
one once-executed `GetLegislationByYear` scenario whose fixed 2025 input exists
only in a direct helper omitted from the general barrel. That helper reduces the
typed receipt inside the transport module and returns only a frozen closed
aggregate. The generic transport continues to reject every yearly input.
Neither scenario accepts identifiers, years, URLs, headers, dates, output paths,
loggers, or environment overrides.
Its complete per-scenario policy is runtime-frozen. Exact execution arguments
authorize one scenario, and the module-private exhaustive executor is reachable
only through that command path. A counted wrapper permits at most one
sequential provider-request attempt with no retry. The report distinguishes
authorization from the actual zero-or-one attempt count. The observer
constructs and runtime-validates a plain-data snapshot field by field, then
emits one JSON line. The yearly shape contains only returned-item and aggregate
five-field optional-presence counts, repository-budget state, byte/status
aggregates, a timing bucket, and fixed markers that leave request-year echo,
uniqueness, ordering, completeness, active winner, history, and production
viability unassessed. It never serializes the request year, transport receipt,
typed SOAP projection, identifiers, provider strings, exact dates, errors, or
raw bytes; its launcher disables `.env` loading, it imports no filesystem API,
and it is not connected to build, check, or lifecycle scripts.

The fixed yearly scenario ran exactly once on 2026-07-31 with one attempt and
no retry. The closed report recorded HTTP 200 in under one second, but the body
failed the reviewed parser as `invalid_soap`; byte aggregates were withheld,
there was no SOAP observation, and the expectation was false. This proves only
that the response reached bounded SOAP parsing after the preceding transport
checks. It does not identify the parser mismatch, establish a successful SOAP
result or fault, or provide item, ordering, uniqueness, coverage, historical,
or production-viability evidence. No provider body or typed item was retained,
and the yearly scenario must not be rerun under the current ledger.

The versioned LWS refresh-capability layer keeps point lookups separate from
population discovery. All six known-bill operations require an existing bill
number, bill ID, or document-name seed, so none is an enumerator and numeric
bill-range scanning is forbidden. The complete exported capability graph is
runtime-frozen, including nested entries and arrays. Contract 1.1 selects
`GetLegislationByYear` as a disabled, year-keyed synthetic query candidate only.
It accepts a formal integer year without coercing a biennium, reuses the strict
`LegislationInfo` field projection, and fails above 2,048 items under the
existing global XML/transport budgets. Its fixture and manifest are separate
from the one-bill bundle. The parser preserves order and duplicates and has no
request-year echo from which to infer a returned biennium. Independently of
request identity, any present returned biennium must be canonical odd-year
`YYYY-YY` in the reviewed range and every returned bill number must remain
within 1 through 999,999. No code has called the operation live. The generic
network boundary rejects synthetic and reviewed candidate years before
resolving or calling `fetch`; only the fixed command-owned, dependency-only
canary helper can reach the private prepared-request core. No eventual success
could by itself prove annual
completeness, server non-truncation, uniqueness, prefile coverage, historical
range, deletions, or a unified change
feed.

The Washington LWS parser accepts response bytes only after an outer byte
ceiling, then applies strict UTF-8, XML 1.0, namespace, depth, node, attribute,
text, collection, and operation limits. It has no resolver or network callback
and rejects DTDs, non-predefined entity declarations, XInclude, SOAP 1.2,
headers, and unknown structure. Its current bounded in-memory event projection
is source-contract evidence only; it is neither a browser dependency nor
authorization to persist raw provider XML.

Source-registry schema 1.2 adds `official_index` for an originating public
document index that is neither an API, feed, nor bulk export. The independently
registered `washington-state-register` and
`washington-governor-executive-orders` sources use this method. Both remain
disabled. The Register still has `adapter: null`; source-registry 1.9 records
the Governor's versioned adapter descriptor without authorizing it to emit
public records. The method describes a reviewed access surface and does not
turn an undocumented HTML page into a formal API.

Governor contract 1.0 makes one credential-free request to the literal Bob
Ferguson value-`220`, all-status URL, with no redirect, retry, referrer, cache,
or browser path. The response must be exact-URL HTTP 200 UTF-8 HTML, at most
256 KiB in at most 512 nonempty chunks, and must also fit fixed DOM node,
attribute, depth, text, parse-error, row, and whole-operation time ceilings.
The pinned `parse5` projection scopes itself to the reviewed executive-orders
view, checks the selected governor and status options, the exact six-column
table and `Displaying 1 - N of N` count, rejects a pager or more than 25 rows,
requires the `25-01` / 2025-01-15 lower-bound anchor, and accepts only exact
`Active` rows in v1. It retains only number, issued date, title, source status,
governor contract label, and a structurally validated Governor PDF link.
Compound number-plus-date identity remains independent of the PDF URL.

The Governor adapter performs that complete projection before yielding any
reference, returns the in-memory allowlisted row from `fetch`, and never
retrieves a PDF body. Normalization is metadata-and-links-only,
`general_jurisdiction`, and `Unclassified`; even a title referring generally
to Tribal Nations creates no Nation association. Every retained
source-derived leaf has exact provenance. Source-wide failure is atomic, and
the shared last-known-good merge now rejects success receipts, failure
receipts, prior records, or prior health from another source before cloning
them. One bounded aggregate-only implementation check on 2026-07-31 matched
14 rows from 2025-01-15 through 2026-06-25; no HTML or PDF bytes were retained.
Activation remains closed until a separately reviewed continuous official-link
health step and the exact later activation gate are approved.

The Register and Governor sources must have separate adapters, health receipts,
and last-known-good shards from each other and from Washington LWS. A Register
refresh may select only issues whose official annual calendar publication date
is at or before the build time. Online or certified future issues remain
ineligible. The first Governor contract is limited to exact Bob Ferguson
filter value `220` and one page of at most 25 rows. The larger
all-governors view is separate historical evidence, not implicit coverage.
Both sources are metadata-and-links-only, build-time-only, state
`general_jurisdiction`, and `Unclassified` absent exact separately validated
evidence. No page body, PDF body, contact field, land detail, title keyword,
source status, or publisher identity creates a Nation relationship.

## Source repository versus deployment artifact

The proposed tree is:

```text
policy-sentinel/
  .github/
    workflows/                  # Phase B+, only after workflow approval
  config/
    taxonomy.v1.json
    sources.v1.json             # planned source registry
    mappings/                   # planned exact official-label maps
  docs/
  fixtures/
    records/                    # synthetic only
    sources/                    # planned synthetic/rights-cleared contracts
  schemas/
    record.schema.v1.json
    taxonomy.schema.v1.json
    source.schema.v1.json       # planned
    artifact.schema.v1.json     # planned
  scripts/
    validate-foundation.mjs
  src/
    app/                        # planned static UI
    adapters/                   # planned build-time public adapters
    pipeline/                   # planned normalize/validate/package stages
    private-adapters/           # planned interfaces only, excluded publicly
    shared/
  tests/
  AGENTS.md
  README.md
  package.json
```

The source repository may hold code, configuration, schemas, documentation,
synthetic fixtures, tests, notices, and approved workflow definitions. It may
not hold raw/cached source data, generated records or summaries, secrets,
private data, or real Nation-specific configuration.

The planned Pages artifact is separate:

```text
/
  index.html
  assets/                       # versioned app assets
  data/
    manifest.json               # build/data-as-of/schema versions
    coverage.json               # visible ranges and limitations
    source-health.json
    nations.json                # reviewed public selector fields only
    index/                      # compact result/search shards
    details/<stable-id>.json    # on-demand record detail assets
```

Every artifact file is public. Detail assets are split so full permitted
language, actions, and provenance do not inflate initial page load. Index
entries contain only fields needed for search, filtering, cards, selection, and
detail lookup.

Static artifact policy v1 fails packaging before any write when the compact
index exceeds 6 MiB, hashed non-detail initial JSON (excluding the manifest
self-file) exceeds 8 MiB, one detail exceeds 512 KiB, all details exceed
128 MiB, or all hashed JSON assets exceed 136 MiB.
These ceilings were selected from the documented Federal Register rolling-range
measurement and are versioned safety limits rather than targets. The
pre-release per-detail limit was amended from 256 KiB after the complete July
2026 candidate exposed one valid 439,763-byte record whose two distinct
official-subject schemes required 697 exact provenance entries. No subject,
scheme, or provenance entry was collapsed to fit the artifact. A source must
also publish its documented range, selected artifact window, actual
earliest/latest validated record, count, health, and limitations. A bounded
healthy slice is `limited`; it is never relabeled as complete source history.

Validation recursively inventories the candidate before parsing asset bodies.
It rejects symbolic links, non-regular or non-JSON entries, unexpected
directories, and any missing or unmanifested file. The manifest itself is
bounded to 4 MiB and 20,000 hashed assets. Declared and actual sizes must both
fit the static budgets. Last-known-good reuse also binds bounded no-follow file
handles to the inventoried file identity, hash, current schemas, current
taxonomy and source registry, record policy, source-health state, and exact
index/detail projection. For every enabled non-synthetic source, packaging
requires the authoritative refresh health receipt and preserves its failure
stage, freshness, last-known-good timestamps, stale state, and message.

Artifact package `1.1.0` adds the richer coverage fields and the card-critical
source document identifier, issuing bodies, and official-source URL to the
compact index. These additions remain optional under schema `1.0.0`, so
historical package `1.0.0` coverage and index documents continue to pass schema
validation; current packages always emit and semantically validate the additive
fields. The current client requires a matching package `1.1.0` manifest and
rejects legacy or unversioned packages before normalizing records; an explicit
migration is required before a historical package can run under a newer client.
On-demand detail hydration also requires the detail wrapper's build timestamp
to match the loaded manifest and compares every compact card/search field
against the index before accepting detail-only content. A mismatch cancels the
detail, CSV, or dossier operation instead of mixing artifact builds.

## Adapter boundaries

Each public source receives its own adapter and registry entry. The conceptual
contract is:

```ts
interface PublicSourceAdapter {
  readonly sourceId: string;
  checkContract(): Promise<ContractHealth>;
  discover(since: Cursor | null): AsyncIterable<SourceReference>;
  fetch(reference: SourceReference): Promise<unknown>;
  normalize(raw: unknown, context: BuildContext): Promise<PolicyRecord[]>;
}
```

The pipeline, not the adapter, owns publication. An adapter cannot bypass:

- registered source host and terms;
- response-size, page, and rate limits;
- field allowlists and raw-data disposal;
- source-specific contract/schema fixtures;
- stable-ID and duplicate checks;
- exact Nation-evidence validation;
- deterministic official-label mapping;
- field-provenance coverage;
- prohibited-field and sensitive-content scans; or
- source-health and historical-range declarations.

Adapters must not interpret free text as a Nation association or public
category. A source without a clean official subject mapping produces
`Unclassified` records. A source without an official Nation relationship
produces general-jurisdiction records where that label is eligible.

## Identity and Nation registry

Internal IDs are stable, opaque identifiers assigned by Policy Sentinel and are
never presented as government identifiers. Each record also keeps its source
ID and exact source-specific document identifier. A versioned alias table may
contain only official names and reviewed authorized aliases.

The annual Federal Register recognition notice is the authority for the
575-entry selector. BIA directory information can assist a reviewed crosswalk
but cannot change recognition status. Contact information, addresses, geometry,
and map points are discarded. A separate audited coverage crosswalk controls
which state coverage notice appears; it does not claim a Nation's complete
geographic, treaty, or land interests.

## Record and taxonomy contracts

[`record.schema.v1.json`](../schemas/record.schema.v1.json) defines the
versioned normalized record shape.
[`taxonomy.schema.v1.json`](../schemas/taxonomy.schema.v1.json) validates the
human-readable [`taxonomy.v1.json`](../config/taxonomy.v1.json). The taxonomy
keeps mapping rules outside UI code and supports many-to-many membership.

JSON Schema validates shape and conditional rules. Pipeline semantic validators
add cross-record and source-specific checks, including:

- uniqueness and stability of internal/source identifiers;
- exactly 575 current Nation registry entries;
- complete provenance for every source-derived leaf field, expressed as an
  exact JSON Pointer and source/retrieval/validation record;
- exact-evidence coverage for every Nation link;
- known official label, rule ID, and taxonomy version for every mapping;
- correct general-jurisdiction and unclassified flags;
- valid coverage interval, historical, landmark, and mutable-document state;
- no prohibited legal-conclusion, inference, personal, private, or land fields;
- permitted excerpt/full-text treatment; and
- complete AI build and cited-input provenance when a summary exists.

Schema changes are additive within a version where possible. A breaking change
creates a new schema version, migration fixture, artifact-version change, and
compatibility test. Missing source values remain missing or explicitly null
according to the source contract; they are never guessed.

## Last-known-good and health behavior

Before a scheduled build publishes, it verifies the manifest and checksums from
the current public Pages artifact. For each source:

- a successful refresh replaces that source's shard and records its new
  retrieval and data-as-of times;
- a failed refresh may reuse only the checksum-valid prior public shard, keeps
  its original data-as-of time, and marks the source `degraded` and `stale`;
- a first-run source with no valid prior shard is omitted and marked
  `unavailable`; and
- an artifact-level validation failure stops deployment, leaving the current
  site unchanged.

The new health manifest identifies the failure stage and last successful time
without publishing secrets or raw provider errors. No build may convert an
unknown freshness state to current. This approach keeps generated data in the
Pages artifact rather than in Git history or an unrelated durable cache.

## AI boundary

The normal pipeline and static application have no AI dependency. If separately
approved, an optional build stage may read only the cited official fields of a
validated record and emit a candidate summary. A policy validator and review
state gate publication. The summary lives only in its on-demand detail asset,
never the compact index, and records model/provider identifier, prompt-policy
version, build ID, cited inputs, dates, and validation state.

The browser never calls an LLM. If the optional stage is absent or fails, the
record builds normally with official source metadata and permitted source
language.

## Private extension boundary

The future private interface is documentation-level only:

```ts
interface AuthorizedPrivateContextAdapter {
  readonly adapterId: string;
  assertDeploymentIsPrivate(context: DeploymentContext): void;
  verifyWrittenAuthorization(input: AuthorizedInput): Promise<Authorization>;
  connectLocally(input: AuthorizedInput): Promise<PrivateContext>;
  enrichPrivateView(records: PolicyRecord[], context: PrivateContext): Promise<unknown>;
}
```

An implementation, if later authorized, belongs in a separately configured
private deployment. It is opt-in, has no automatic public export, sends no
telemetry, and must not contain bundled data, credentials, example locations,
or implicit source paths. Public build configuration rejects this module and
any private-context manifest. Private context cannot create a public
Nation-to-record relationship. The public product must state that its results
do not represent all of a Nation's land or other interests.

## Security and privacy

- Provider credentials are injected only into an approved build job and are
  never serialized.
- Logs redact request headers, credentials, personal fields, and response
  bodies.
- URLs are restricted to registered HTTPS hosts; redirects and content types
  are validated.
- Downloaded content has size/time limits and is treated as untrusted data.
- HTML is not trusted; source excerpts are rendered as text.
- CSV cells are escaped against spreadsheet formula execution.
- Content Security Policy and dependency review are build requirements.
- There is no telemetry, search logging, tracking pixel, service worker, or
  outbound alert channel in the beta.

## Deployment separation

Source refresh, artifact build, and Pages deployment are separate jobs with
explicit permissions. Scheduled and manual refreshes are planned, but no
workflow is present in Phase A. A future pull-request build uses synthetic
fixtures only. A live-data workflow requires approved source access and
secrets; deployment requires a separately approved remote and Pages target.
