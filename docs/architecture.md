# Architecture

## Product-space target and compatibility boundary

Policy Sentinel evolves by braided addition into a general engine with explicit
region-pack, community-deployment, persona-projection, analyzed-corpus, and
output-adapter seams. The target flow is:

```text
authoritative sources -> bounded adapters -> source facts and events
  -> evidence-bearing relations/classifications -> analyzed corpus
  -> community/persona projections -> document, web, application, structured outputs
```

The engine owns only generic identity, evidence lineage, lifecycle, coverage,
health, deterministic replay, review/visibility state, and projections. A
region pack references source IDs, authority-qualified jurisdictions,
taxonomy/crosswalk versions, organization/identity evidence, acceptance
scenarios, and explicit gaps. A deployment profile supplies only authorized
community context. Personas are views, not fact stores. Output adapters retain
record identity, citations, evidence, timestamps, coverage, review,
visibility, and limitations.

The current static Preact application, print dossier, CSV serializer, source
contracts, `PolicyRecord 1.4`, source registry `1.19`, and artifact package
`1.4` remain unchanged compatibility inputs and outputs. They are not the
complete analyzed corpus or adapter suite. Required successor contracts are
listed in [`data-contract.md`](data-contract.md), and the exact PNW acceptance
boundary is [`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md).

K0, S0, and O0 remain outside this architecture's active dependency graph
unless their existing convergence gates are separately opened. The planning
rebase neither changes their bytes nor imports them into product code.

## PNW-01 synthetic projection seam

The additive `src/engine/` seam now defines closed, readonly `RegionPack`,
`CommunityDeploymentProfile`, `PersonaProjection`,
`CommunityRelevanceAssertion`, `ProjectedRecordReference`, `DeploymentView`,
`EngineProjection`, and `OutputAdapter<T>` contracts. Its independent profile
schema begins at `1.0.0`. The committed demonstration bundle is explicitly
synthetic and uses two impossible region/deployment/persona configurations.

The pure projection function receives already validated `PolicyRecord 1.4`
values. Before returning anything, it validates the complete profile graph
against the current source registry and taxonomy, rejects non-synthetic source
references, resolves every exact ID-and-version reference against closed
authority, region, rule, deployment, and output catalogs, rejects stable-ID
collisions across declaration kinds, checks fixed non-claims and bounded
temporal scopes, and resolves exact configured record IDs. Watch rules perform
no keyword, geography, urgency, legal, rights, or community-position inference.
Each emitted view contains stable record references and typed
configuration-supported reasons only.

The result owns one canonical, detached, recursively frozen record store;
persona views do not copy records. Set-like input collections are normalized
with fixed ASCII ordering, so canonical serialization is byte-stable. Caller
inputs remain unfrozen and unchanged. The `OutputAdapter<T>` interface is a
synchronous, parameter-minimal type boundary over an immutable projection and
view ID. There is no concrete output adapter, and type-level purity is not a
proof of arbitrary consumer behavior.

This seam is not connected to the current application, source adapters,
pipeline, artifact builder, or release flow. It establishes neither a
production PNW profile nor an ATNI roster, analyzed-corpus completion, source
activation, rights/geography evidence, publication, or K0/S0/O0 convergence.
The validated PNW-01 checkpoint introduced the tenth schema ID and ninth
foundation-compiled schema; later validated successor counts do not change the
meaning or bytes of that closed `1.0.0` seam.

## PNW-03 governed geography and rights seam

The additive, synthetic-only `GeographyRightsBundle 1.0.0` is a separate closed
catalog consumed beside the unchanged PNW-01 profile bundle. It models
role-specific authority bindings, configured subject/scope references, exact
source evidence and citations, independent review attestations, optional opaque
geometry references, typed geographic relations, configured rights frames, and
deployment/persona grants. Exact composite `id@version` references bind every
object to a PNW-01 bundle, region, synthetic-demo deployment, persona, output,
and region-scoped profile authority.

Observed and effective temporal ranges use discriminated known, open, or
unknown bounds. Same-ID versions form one immediate-predecessor chain; a
supersession edge requires known, non-overlapping effective dates. Geography
kinds are optional and relational rather than one landbase field. A deployment
or an entire bundle may carry rights frames without geography, or relations
without a treaty-style frame. S0 types, geometry algorithms, and K0/O0 modules
are not imported.

Authority identity and profile authority scope are separate. One exact
authority identity cannot change deployment, scope, or authority class across
bindings, while distinct role bindings prevent a source, configuration,
custody, derivation, analyst, or counsel role from satisfying another. Evidence,
review, scope, geometry lineage, relation authority, and frame configuration
remain separate references.

Visibility and sensitivity use the closed `public`, `internal`, `restricted`,
and `privileged` classes. An object's declarations may not be less restrictive
than any evidence, review, scope, geometry, or derivation dependency. The
projection request names one exact deployment, persona, output, requested
visibility, and approved use. It emits only authorized relation/frame
references plus the constant `authorized_subset_not_comprehensive`; it never
emits catalog payloads, geometry tokens, withheld identifiers, or withheld
counts. Pending/rejected reviews and non-synthetic-demo deployments cannot be
upgraded into accepted output.

Every relation and frame repeats the exact six PNW-01 non-claims and the fixed
PNW-03 forbidden-inference tuple. A rights frame is only a configured,
source-bound monitoring reference. Neither a frame nor geography establishes
identity, membership, ownership, land status, jurisdiction, applicability,
rights impact, consultation, consent, eligibility, urgency, remedy, outcome, or
community position. The seam does not target records or add a `whyShown` basis.

The schema is
`https://policy-sentinel.invalid/schemas/geography-rights.schema.v1.json`.
With it, backbone validation contains eleven schema IDs and foundation
validation compiles ten schemas. The fixture/test family remains repository-only
and is not consumed by the static artifact builder. No concrete adapter, GIS
engine, source activation, real geography, real community configuration, or
public delivery path is introduced.

## PNW-04 governed taxonomy and crosswalk seam

The additive, synthetic-only `TaxonomyBundle 1.0.0` is a separate closed
catalog consumed beside the unchanged retained taxonomy and PNW-01 profile
bundle. The retained `taxonomy.v1.json` remains the only normative taxonomy for
`PolicyRecord 1.4`, application behavior, static artifacts, source mapping, and
last-known-good validation. A PNW-04 project-general concept references an
exact retained category/subcategory identity instead of copying or migrating
its label.

The bundle separates project-general, source-native, regional-organization,
national-organization, and community-deployment namespaces. Each namespace,
concept, evidence item, review, direct crosswalk, and assignment carries exact
version, authority, scope, lifecycle, and public synthetic identities. Generic
authority roles keep organization analogues out of the universal kernel. A
source owns its source-native language, an organization owns only its own
vocabulary, a community authority owns only its deployment configuration, and
the project owns only the retained general vocabulary. A crosswalk authorizer
controls an edge, not either endpoint's meaning. Each source-native namespace
also pins one exact official-subject scheme; identical labels in different
schemes or namespaces remain different concepts. Bundle v1 permits one version
per namespace stable ID because it has no namespace-predecessor contract.

`monitoring_crosswalk` is the sole relation kind. It is directional from a
source-native, regional-organization, national-organization, or
community-deployment concept to one or more project-general references. The
runtime follows one explicit edge only: there is no inverse, transitive,
keyword, label-similarity, fuzzy, embedding, or model resolution. Parallel
targets remain many-to-many results; duplicate/conflicting edges fail closed
rather than selecting an authority winner. Pending, disputed, rejected,
withdrawn, superseded, and expired edges remain catalog states and cannot
project as accepted.

The resolver receives an exact PNW-01 profile bundle and immutable
`EngineProjection`, then selects one synthetic-demo deployment, public persona,
output adapter, and fixed `asOf` date. It schema-validates every PolicyRecord,
enforces the retained membership/Unclassified invariant, and accepts only the
exact engine projection reproduced by the pure PNW-01 resolver. It then
validates the entire bundle and PNW-01 reference graph before returning a
detached, recursively frozen, canonically ordered projection. Output contains
only record, assignment, concept, edge, authority, evidence, and review
references plus
`authorized_subset_not_comprehensive`; it never contains a second record store
or rewrites the PNW-01 projection.

Assignments keep source-provided, authority-configured, analyst-reviewed,
unmapped, not-assessed, and legacy-Unclassified meanings distinct. A PNW-04
`unclassified` result can only mirror a valid record whose retained membership
array is empty and `isUnclassified` is true. It is not a concept or an absence
claim. `unmapped` is checked against every eligible edge in the exact
deployment binding before persona/output filtering, so a restricted grant
cannot manufacture an absence. Invalid references reject atomically;
unavailable evidence, future review, or inactive review/mapping states are not
converted to Unclassified.

Every accepted edge, assignment, and result repeats a fixed non-claim tuple.
The seam cannot establish identity or recognition, organization membership,
source-record association, `whyShown` relevance, semantic equivalence,
endpoint endorsement, legal effect or applicability, consultation, rights
impact, affiliation or consent, eligibility, urgency, recommended action, or a
Nation/community/organization position. It consumes no PNW-03 geography or
rights object as evidence and leaves PNW-03 unchanged.

The schema is
`https://policy-sentinel.invalid/schemas/taxonomy-bundle.schema.v1.json`. Its
fixture/test family is repository-only and does not enter the static artifact
builder or application. It supplies structural synthetic qualification, not a
real ATNI, NCAI, Nation, source, or community taxonomy; no real mapping,
membership, policy position, source activation, production classification, or
publication follows from it.

## PNW-05 synthetic source-pack core

The additive `SourcePackBundle 1.0.0` is a closed, synthetic-test-only reference
graph. It compiles an internal source-admission plan without acquiring,
retaining, interpreting, or publishing source content. Canonical source truth
stays in `sources.v1.json`: a pack member names only the exact source ID and
source-registry version. It cannot copy a source name, provider, URL, terms,
publisher jurisdiction, access settings, or `enabled` flag, and registry
enablement never satisfies admission.

Admission is proof-carrying and conjunctive. A usable binding requires a
matching synthetic fixture contract, typed structural evidence, a reviewed
declared-coverage object, synthetic configuration authority, an accepted
synthetic-test review, a current synthetic-test admission receipt, an
independent operation grant, exact PNW-01 region membership, and authorized
PNW-05 disclosure. The admission's persona and output must also equal the exact
request tuple. Acquisition, retention, transformation, internal analysis,
redistribution, and public projection are independent grants. Each evidence
receipt declares its exact contract, coverage, or authority subject and has
exactly one primary consumer; review references are secondary views of that
same evidence, not reusable primary proof. Every catalog reference is kind-,
ID-, version-, source-, context-, jurisdiction-, profile-, and deployment-
checked before any plan is returned. Every admission review must target that
admission's exact contract or coverage object, and its review instant must lie
inside the exact subject, evidence, and authority proof intervals; malformed
graphs fail atomically.

Source context and monitoring jurisdiction are explicit configuration axes.
An opaque monitoring-jurisdiction reference points to an exact configured
PNW-01 jurisdiction but expressly makes no publisher-jurisdiction equivalence,
geographic-intersection, legal-jurisdiction, applicability, membership, or
coverage claim. The neutral synthetic fixture uses a test-local PNW-01 profile
variant, parsed by the unchanged PNW-01 validator, solely to exercise existing
canonical synthetic registry IDs. It neither changes nor migrates the accepted
PNW-01 profile fixture.

Coverage is evaluated per requested opaque slot and preserves `covered`,
`partial`, `outside_coverage`, `unknown_coverage`, and `not_assessed` as
different states. Partial declarations remain useful but never aggregate into
a complete-region claim, percentage, or readiness score. A slot served only by
an eligible `partial` binding retains both that eligible proof and a `partial`
`notEvidenceOfAbsence` gap. A plan otherwise contains authorized eligible
binding references, permitted typed exclusions, and one such gap for each
unserved requested slot.

Availability and health are separate immutable observation dimensions at
source, jurisdiction, and source-within-jurisdiction scope. The latest exact-key
observation at or before explicit request `asOf` applies; a future-only or
missing observation is `not_observed`, and conflicting states at the same
instant reject. All required availability scopes must be `available` and all
required health scopes `healthy`. Observed availability `unknown` and health
`unknown` remain the distinct `availability_unknown` and `health_unknown` gap
states instead of being relabeled `not_observed`. The core derives neither from
record counts and implements no refresh, retry, staleness, cache, cursor, or
last-known-good behavior; those remain PNW-06 concerns.

PNW-05 disclosure is a separate synthetic-test overlay anchored to exact
PNW-01 deployment, persona, and output references; it does not widen PNW-01's
public-only visibility contract. Access is checked before identity-bearing
projection. A hidden binding contributes no identity, count, reason, time,
metadata, or fingerprint input to an unauthorized plan. Its unserved slot is
represented only by the same opaque gap that would exist if no hidden binding
were present. The disclosure-scoped plan deliberately omits the global source-
pack bundle identity and version, so a correctly versioned hidden-only bundle
change cannot perturb public bytes.

Canonical serialization uses ordinal ordering. A browser-safe pure SHA-256
fingerprint covers only the requester's authorized plan bytes. The plan is
detached and recursively frozen, and an exact compatibility assertion rejects
reuse under another profile, region, deployment, persona, output, access
context, disclosure ceiling, operation, `asOf`, or normalized slot set.
Optional exact PNW-03 relation/rights-frame and PNW-04 taxonomy-namespace
references are compatibility links only. PNW-03 predecessors are admissible in
this v1 seam only when both visibility and sensitivity are `public`; a rights
frame must additionally approve `source_reference` use and the `public`
audience. These links cannot change admission, coverage, association,
relevance, authority, jurisdiction, applicability, rights, legal meaning, or
activation.

The schema is
`https://policy-sentinel.invalid/schemas/source-pack-bundle.schema.v1.json`.
The source-pack fixture/test family stays repository-only and is absent from
the application and ordinary static artifact. It proves an offline structural
core only—not real source authority, terms, observed behavior, coverage,
currentness, activation, policy association, PNW-05 completion, publication,
or readiness for PNW-06/07.

## PNW-05 additive real-source lifecycle substrate

`RealSourceLifecycleBundle 1.0.0` is a separate Federal Register local-
prerelease contract. It does not loosen, migrate, import, or relabel
`SourcePackBundle 1.0.0`. Its closed scope resolves the exact disabled
`federal-register` registry entry and whole registry bytes, seven exported
deep-frozen contract/field/transform/deployment/region/persona/output
descriptors, one selected document identity, and one acquisition plan. That
plan is `GET` only, fixes the document path and ordered 23-field query, permits
one request/page/item at one concurrency, caps the response at 65,536 bytes and
30 seconds, and forbids redirect follow. The scope also binds its authority
set, relationship non-claims, taxonomy separation, and ignored-artifact
boundary. The bundle and every catalog member carry content digests; a caller
must supply the trusted whole-bundle digest and exact scope. Same-version
registry, descriptor, request, range, or receipt substitution therefore fails
closed.

The graph keeps provider-established facts, dated observations,
repository-enforced controls, explicit unknowns, and expiring owner residual-
risk decisions as different evidence classes. Qualification requires the
reviewed source identity, official status, field meaning, rendition custody,
credential-free access requirement, and reproduction boundary plus exactly one
receipt for each of 18 scoped project controls. Its fixed nine-axis,
23-question applicability inventory preserves unknown API terms, privacy,
rates, paging, snapshots, retry/backoff, formal schemas, service levels, and
change notice. Deleting an unknown cannot make the candidate qualify. Only the
exact terms and privacy gaps may enter the narrow owner residual path, which
binds the same hosts, `GET` method, field policy, conditions, authority, and a
maximum 90-day interval. Unknown or required authentication remains blocking,
and incompatible affirmative restrictions fail closed. No pre-acquisition fact
claims the selected document's issuing agency: the Tier-1 parser must later
obtain nonblank `agencies[].raw_name` from the record itself or fail atomically.
Source identity and service operation do not create issuing-agency,
official-edition, Nation, organization-membership, geography, rights,
jurisdiction, applicability, or position authority.

Qualification, operation grants, admission, activation, binding, local
artifact eligibility, and publication are independent. Every operation grant
names the exact governing request-plan digest. Accepted review and authority
receipts are typed, exact-subject, revocable, supersedable, and time-scoped;
reviews are effective no earlier than `reviewedAt` and residual decisions no
earlier than `acceptedAt`. Downstream receipts cannot predate the full effective
prerequisite chain. Provider institutions may legitimately hold more than one
provider role, while the owner, source reviewer, sovereignty reviewer, and
security reviewer trust groups require distinct identities. A declared
progressive state must have exactly one usable chain at `lifecycleAsOf`, and
evaluation rechecks that chain at its later `asOf`. Evidence-blocked, rejected,
suspended, expired, revoked, and retired states retain history but authorize
nothing. Publication is structurally closed in version 1.0.0.

Coverage binds the exact plan, acquisition grant, admission, activation, and
binding that were usable when the attempt occurred. Its eight documented,
selected, attempted, received, validated, emitted, omitted, and claimed stages
are fixed to the one-member range under a permanently bounded-
non-comprehensive, no-absence-inference rule. A success reconciles every
positive stage to one and creates exactly one LKG revision atomically; a failed
or partial real attempt emits and claims zero. Health remains separate at
source-contract, acquisition-operation, and selected-range scope. An LKG must
bind a prior fully validated acquisition revision, successful coverage,
then-current healthy selected-range evidence, current owner/review authority,
and an exact manifest. One genesis and reciprocal single-child succession form
one connected history with one eligible canonical tip. Fallback additionally
requires exact current degraded/failed/unavailable evidence at all three
health scopes for the current failed coverage. It cannot rescue an expired or
revoked gate, a scope/contract/range/source mismatch, future evidence, a
zero-attempt failure, an older fork, or a first run with no predecessor.

Supersession and LKG member digests are cycle-safe: member hashes cover every
non-reference-digest value, each nested reference must resolve to the exact
referenced member digest, graph validation enforces reciprocal linear
semantics, and the caller-pinned whole-bundle digest covers every edge byte.
The contract does not claim mathematically recursive member hashes.

The initial Federal Register fixture is only a digest-bound candidate with no
qualification, grant, admission, activation, binding, artifact-eligibility,
coverage, health, or LKG receipt. The runtime has no network or persistence
surface and is not consumed by the ordinary adapter, build, application, or
artifact pipeline. Source-specific qualification and every later local
prerelease step remain separate evidence-gated outcomes.

### Source-neutral analyzed-corpus child

The additive `AnalyzedCorpus 1.0.0` seam is implemented under the narrow
PNW-07 local-prerelease child. It embeds each complete `PolicyRecord 1.4` once,
then exposes only digest-bound record references through views. One exclusive
source-evidence binding per record closes field provenance, normalized-revision,
lifecycle, bounded-coverage, three-scope health, review, optional LKG,
visibility, limitation, and `whyShown` references into the corpus digest.
Creation is deterministic and canonical; parsing rejects noncanonical stored
provenance. All returned objects are detached and recursively frozen.

The only positive executable path is impossible synthetic structural proof.
Synthetic records require a `synthetic-*` source ID, credential-free and
port-free `.invalid` HTTPS origins for every URL-bearing record field, validated
data quality, causal health times, and coherent fresh-versus-LKG state. The
fixed relevance language is a project-owned deterministic general-jurisdiction
mapping with exact mapping provenance. Records remain `general_jurisdiction`,
zero-Nation, `Unclassified`, non-landmark, and AI-free, with eleven mandatory
non-claims and closed non-public visibility.

Every real-source create or parse operation fails
`REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED`. The seam cannot accept caller-
declared lifecycle references as evidence; a real path requires the accepted
lifecycle parser and evaluator to become callable through a separately reviewed
source-neutral integration. No current adapter, PNW-01 projection, artifact
builder, application, dossier, CSV, or public output consumes this corpus, and
no real corpus or corpus artifact is generated.

## Current application and ingestion architecture

The implemented baseline is a static TypeScript application with a separate
build-time ingestion pipeline. There is no browser-to-provider API path, runtime
database, application server, LLM dependency, telemetry service, or private
data path in the public build.

Its current maturity is:

| Maturity | Current repository evidence |
| --- | --- |
| Integrated local output | The Preact application, print dossier, CSV serializer, hash-route behavior, and artifact pipeline run over three synthetic records and 575 explicitly synthetic Nation rows. |
| Implemented foundation seams | The synthetic-only PNW-01 profile projection, PNW-03 geography/rights catalog, PNW-04 governed taxonomy/crosswalk catalog, PNW-05 source-pack core, and narrow PNW-07 source-neutral analyzed-corpus child produce deterministic immutable reference-only structures. They are not integrated with the application or artifact pipeline; the corpus runtime accepts no real source. |
| Implemented but disabled | Federal Register, Washington Governor executive orders, Washington Centennial Accord, and the one-row curated Supreme Court adapters are tested and registered but cannot emit public records. |
| Contract-only | Congress.gov, GovInfo, Regulations.gov, Oregon Legislature OData, and Washington LWS have bounded synthetic contracts but no activated production adapter. |
| Proposed and unimplemented | Production region packs and community profiles, broad real-source analyzed-corpus integration, concrete common output-adapter implementations, scheduled/manual workflows, Pages delivery, and a private deployment remain future work. |

Current and conditional tooling:

- TypeScript on Node.js 22 or later, with Node's built-in `fetch` for bounded
  adapter transports;
- Vite for deterministic static builds and Preact for a small, accessible
  stateful interface;
- JSON Schema Draft 2020-12 and Ajv for source, record, taxonomy, manifest, and
  artifact validation;
- Vitest and Testing Library for logic/component tests, `axe-core` for
  automated accessibility checks;
- `saxes@6.0.0` as the narrowly scoped, build-time, namespace-aware XML event
  parser for the bounded Washington Legislative Web Services SOAP contract
  (Decision D-025);
- `parse5@8.0.1` as the pinned, inert build-time HTML parser for the bounded
  Washington Governor executive-order index contract (Decision D-032); and
- a dedicated client-side search library only if an artifact-size and latency
  benchmark shows that a simple prebuilt token index is insufficient.

Playwright is not installed. Keyboard, responsive, print, download, and
built-site browser evidence remains an acceptance target to satisfy through an
available approved browser-testing route; it is not current package capability.

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

Source-registry schema 1.3 retains `official_index` for an originating public
document index that is neither an API, feed, nor bulk export and adds
`official_page` for one bounded originating document page that is not an index.
The independently registered `washington-state-register` and
`washington-governor-executive-orders` sources use `official_index`; the
Register still has `adapter: null`, while source-registry 1.19.0 retains the
Governor's versioned adapter descriptor without authorizing it to emit public
records. `washington-centennial-accord` uses `official_page` and remains
disabled with its versioned contract-1.0 adapter descriptor; the separately enabled
`synthetic-state-accord` fixture proves the Accord contract without carrying
provider data. These methods describe reviewed access surfaces and do not turn
undocumented HTML into a formal API or export.

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

The Register's issue index is not itself a sufficient normalized-record
contract. A bounded observation of eligible issue `26-14` found 147 filing rows
and 123 unique identifiers, with 22 duplicate groups whose displayed or
inherited agency contexts all disagreed. The five-column index has no exact
record title. An index-only adapter would therefore have to invent a required
title and choose among conflicting agency labels. The Register remains
`adapter: null` until a separate filing-page contract fixes the maximum issue,
request, byte, chunk, concurrency, and deadline budgets and validates exact
headings, agencies, duplicate and holdover behavior, Reviser's Notes,
relationships, privacy exclusion, and atomic failure.

The Centennial Accord's single official page supplies an exact title,
collective executing parties, and a 1989-08-04 execution event, but no
individual signatory list, official number, signed facsimile, structured
current status, source update time, complete amendment/supersession history,
or reuse license. Record and artifact package 1.4 add a source-neutral
`accordContext`: non-Accords require null, while Accords preserve bounded
governmental or collective parties and exact source roles, an executed/signed
event, narrative status evidence that cannot establish current status, scoped
supersession review tied to reciprocal typed edges, and source-provided or
deterministic fallback identity. Accord parties cannot populate
`issuingBodies`; generic status is unknown with null label/as-of; execution
cannot populate introduction, publication, last-action, deadline, or effective
dates. The compact index carries the complete context, and the client binds it
to detail hydration, search and chronology, cards, details, dossier, and CSV
with explicit current-status, relationship-history, and Nation-association
boundaries. The model is proven by a fictional pre-1980 metadata-only landmark
fixture.

GOIA adapter 1.0 makes one build-time request to the exact canonical page and
rejects URL, public-DNS, redirect, status, UTF-8, encoding, length, chunk,
deadline, DOM, attribute, depth, text, parse-error, article-identity, or direct
element grammar drift. It emits only an 11-key reviewed projection and clears
the response buffer; HTML and page prose never cross the transport boundary.
Normalization is metadata-and-links-only, `general_jurisdiction`, Unclassified,
and has zero issuing bodies and Nation associations. Source-wide failure is
atomic and last-known-good reuse remains same-source only. The real source stays
disabled, so it emits no public record, coverage, health, or LKG shard; exact
signatory evidence and source activation remain separate gates.

Court research and health remain source-specific. Registry 1.19.0 preserves the
1.11 DOI IBIA research outcome as a disabled gap because its chronology can lag
a separate search database, omits docket and decision-status relationships,
includes privacy- and land-sensitive matters, and points to an OHA host that
disallows automated access.

The same registry independently records the assessed state-court gaps.
Washington's originating indexes expose mutable slip-opinion metadata but no
official citation separate from the docket or case-specific current-version
relationship. Oregon's OJD index contains a bounded citation-and-docket
candidate, but no transport is configured because statewide terms make access
acceptance and the exact source gate is closed. Idaho's Supreme Court and Court
of Appeals indexes are separate source IDs because their inventory and future
health can diverge; both lack required citations and later-event finality or
substitution evidence. Each remains disabled with `adapter: null`. Their
configured host lists are declarative validation boundaries, not authority to
retrieve opinion or summary files.

Oregon's non-OData sources are also independent disabled boundaries.
`oregon-administrative-rules-bulletins` describes the Secretary of State OARD
monthly filing index; `oregon-governor-executive-orders` describes the
Governor's separate index. Neither has transport or an adapter. Registry 1.17.0
records the OARD index's observed AON/agency/type/filed/caption shape and its
session-token, privacy, date, status, and relationship gaps, while the Governor
source has no reviewed per-order contract. The current statewide terms cover
any site operated or maintained by an Oregon executive-department agency and
make access acceptance, so both sources stay behind separate closed terms gates
even when the hostname is not `oregon.gov`. OARD's aggregate `Executive Orders
and Other Notices` document cannot be used to infer an order identity or merge
the two health boundaries.

Oregon Legislature OData is a third, independent Oregon boundary. Registry
1.17.0 records `oregon-legislature-odata` as a disabled API source with
`adapter: null`, `build_secret` authentication, null exact-date coverage, and
the separate closed `G-C` agreement/account/credential gate. Contract 1.0 has
no request or transport surface. It validates only repository-authored logical
metadata and impossible synthetic pages for sessions, measures, sponsors,
committees, actions, votes, versions, and statuses. It rejects unknown and
privacy-bearing fields, incomplete pagination, unsupported pre-2007 sessions,
and unresolved or cross-session relationships without claiming provider field
names, response shape, service completeness, or live behavior.

The Oregon offline DTO is not a normalized record or a provider-provenance,
health, coverage, or last-known-good receipt. The current record can eventually
hold core measure/session, sponsor/committee, action, and source-status facts
only after official URLs, live paths, dates, identity, nullability, and status
rules are reconciled. It has no first-class vote or version collection, and
history events require official URLs absent from the synthetic projection.
`Relating To Clause` language is neither a controlled subject nor Nation
evidence. Those values must not be forced into category, relevance, Nation,
status, action, relationship, or legal-effect fields.

Idaho administrative rulemaking and Governor executive orders are two more
independent disabled source boundaries. Registry 1.17.0 gives each an
`official_index` identity but no transport or adapter. The administrative HTML
listings were unavailable during review, and the fixed active-rulemaking PDF
cannot establish a stable row schema, lossless text, canonical HTTPS links,
currentness metadata, or complete lifecycle relationships. The Governor index
has order-number rows and official PDF links but omits exact issue dates and
uniform status, range, and relationship evidence; at least one row omits the
required title. File paths, upload years, `Last-Modified` values, year headings,
and listing presence cannot fill those fields. Both sources therefore emit no
records, coverage, health, manifest membership, or last-known-good shard.

Record schema and artifact package 1.2 introduced a source-neutral
`judicialContext`. Court and administrative decisions must preserve an exact
adjudicating body, docket numbers, typed official citations and their links,
decision date, source-labeled document form and publication status, and a dated
revision-review state; nonjudicial records require `null`. Semantic validation
binds court versus administrative body to the document type, preserves the
same body in `issuingBodies`, validates citation hosts, and requires revision
state to agree with explicit correction, supersession, or substitution edges.
The compact index carries the full context and is checked against detail data.
Current artifact validation requires the coherent package/record 1.4 pair, and
the client independently rejects a judicial type/context/body/date/citation or
landmark/relevance/evidence invariant failure rather than silently normalizing
it away. The client uses decision date for judicial chronology and exposes the
context and exact citation link in cards, details, dossier, CSV, and search with
a visible subsequent-history and legal-effect boundary.

Supreme Court adapter 1.1 implements the first selected court contract for the
single October Term 2018 row
`Washington State Dept. of Licensing v. Cougar Den, Inc.` It makes one exact
build-time request to the term page, validates the two reviewed opinion tables
and independently bound header and cell orders, then projects only the exact
caption, docket `16-1498`, decision date `2019-03-19`, permanent citation
`586 U.S. 347`, document form, bound-volume status, and source links. The
Court-supplied citation link targets the complete bound Volume 586 at a case
page fragment; the adapter preserves that fragment only on the citation,
leaves `officialFullText` null, and never fetches or copies the PDF. The source
detail and dossier expose the source-supplied reproduction boundary rather than
presenting the citation link as a case-only text. Record 1.3 marks only this
exact row as an editorially approved `documented-court-decision` landmark and
retains the exact metadata evidence without copied opinion text or a Nation
association. The source remains disabled pending its source-specific G-J
evidence decision, so the implementation does not emit public records.

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

The current authored tree and its explicitly absent target seams are:

```text
policy-sentinel/
  .agents/skills/               # one repository source-review procedure
  .codex/                       # hooks and read-only reviewer roles
  config/
    taxonomy.v1.json
    sources.v1.json             # implemented source registry
    mappings/                   # absent; future exact official-label maps
  docs/
  fixtures/
    engine/                     # synthetic PNW profile/geography/taxonomy/source-pack contracts
    records/                    # synthetic only
    sources/                    # synthetic source contracts
  schemas/
    record.schema.v1.json
    taxonomy.schema.v1.json
    taxonomy-bundle.schema.v1.json
    source-pack-bundle.schema.v1.json
    source.schema.v1.json
    artifact.schema.v1.json
    projection-profile.schema.v1.json
  scripts/
    validate-foundation.mjs     # plus artifact/source/hook validators
  src/
    app/                        # implemented static synthetic UI
    adapters/                   # implemented adapters; real sources disabled
    contracts/                  # bounded synthetic source contracts
    experimental/spatial/       # isolated S0; not a product dependency
    kernel/                     # isolated K0; not a product dependency
    pipeline/                   # implemented normalize/validate/package stages
    engine/                     # additive synthetic projection seam; not integrated
    private-adapters/           # absent; future gated interface only
    shared/
  tests/
  .github/workflows/            # absent; future and separately gated
  AGENTS.md
  README.md
  package.json
```

The source repository may hold code, configuration, schemas, documentation,
synthetic fixtures, tests, notices, and approved workflow definitions. It may
not hold raw/cached source data, generated records or summaries, secrets,
private data, or real Nation-specific configuration.

`npm run build` currently creates an ignored, validated synthetic static
artifact under `dist/`; it does not publish it. If Pages delivery is separately
approved, the retained application's deployment artifact uses this layout:

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

The static client uses hash routes as the durable browser-session state. It
serializes applied search criteria, sort, bounded result window, selected public
record IDs, detail return route, and originating record focus. Selection IDs
must match the record-ID grammar and, once the artifact loads, an actual compact
record; malformed, duplicate, and stale IDs are removed without fetching a
provider. Draft form changes remain local until the visitor explicitly applies
them, so a selection or result-window change cannot silently submit the draft.
Native hash history restores URL state through Back and Forward. Route changes
are announced in a polite live region, and leaving a detail route returns focus
to the encoded, collision-free originating record link when it is still
present. These automated invariants do not satisfy the separately gated built
desktop/mobile browser smoke.

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

Artifact package `1.1.0` historically added richer coverage fields and the
card-critical source document identifier, issuing bodies, and official-source
URL to the compact index. Package `1.2.0` and record schema `1.2.0` added the
complete nullable `judicialContext` projection. Package and record schema
`1.3.0` add reviewed landmark evidence that can be either permitted source text
or metadata-only evidence with an exact source label, URL, date, and
reproduction basis. Current package and record schema `1.4.0` add the complete
Accord context and bind source registry `1.19.0`. These additions remain
optional under artifact schema `1.0.0`, so historical package `1.0.0`,
`1.1.0`, `1.2.0`, and `1.3.0` manifests continue to pass archival schema
validation. The current client requires a matching package `1.4.0` manifest
and rejects legacy or unversioned packages before normalizing records; an
explicit migration is required before a historical package can run under a
newer client. On-demand detail hydration also requires the detail wrapper's
build timestamp to match the loaded manifest and compares every compact
card/search field, including judicial context, Accord context, and landmark
state, against the index before accepting detail-only content. A mismatch
cancels the detail, CSV, or dossier operation instead of mixing artifact
builds.

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

The standalone Nation-collection policy binds the manifest and baseline
synthetic flags before artifact creation or validation. A production collection
must contain exactly 575 collision-free reviewed identities and carry a
semantic registry version, completed publication review, validated
reconciliation summary, current source health, baseline-bound source evidence,
and field provenance for every identity field. Each accepted WA, OR, or ID code
has one authoritative crosswalk evidence item with the exact source Nation name,
text, identifier, URL, date/retrieval state, and matching provenance. An
unresolved entry must remain federal-only. Synthetic rows cannot claim those
production fields. Record validation resolves every association against the
validated collection by both stable ID and official name, requires an exact
official name or authorized alias in the evidence, and binds the evidence URL
to the official record. This policy can validate a future exact 577-entry to
575-identity reconciliation but does not invent that reconciliation.

## Record and taxonomy contracts

[`record.schema.v1.json`](../schemas/record.schema.v1.json) defines the
versioned normalized record shape.
[`taxonomy.schema.v1.json`](../schemas/taxonomy.schema.v1.json) validates the
human-readable [`taxonomy.v1.json`](../config/taxonomy.v1.json). The taxonomy
keeps mapping rules outside UI code and supports many-to-many membership.

JSON Schema validates shape and conditional rules. Pipeline semantic validators
add cross-record and source-specific checks, including:

- uniqueness and stability of internal/source identifiers;
- exactly 575 reviewed federal-recognition identities plus the production review,
  source-evidence, provenance, health, and state-crosswalk policy above;
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

The local pipeline implements source-scoped health and last-known-good merge
rules when a validated prior artifact is supplied. It does not retrieve a
public Pages artifact, schedule a refresh, or publish a build. A future approved
scheduled publication workflow must first verify the manifest and checksums
from the current public Pages artifact. For each source:

- a successful refresh replaces that source's shard and records its new
  retrieval and data-as-of times;
- a failed refresh may reuse only the checksum-valid prior public shard, keeps
  its original data-as-of time, and marks the source `degraded` and `stale`;
- a first-run source with no valid prior shard is omitted and marked
  `unavailable`; and
- an artifact-level validation failure stops deployment, leaving the current
  site unchanged.

The implemented health manifest identifies the failure stage and last
successful time
without publishing secrets or raw provider errors. No build may convert an
unknown freshness state to current. This approach keeps generated data in the
local or approved Pages artifact rather than in Git history or an unrelated
durable cache.

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
or implicit source paths. No private adapter module or private-context manifest
exists. Current repository checks reject tracked private-path families and
prohibited public-record fields; a future implementation must additionally
prove that its public build configuration rejects the private module and every
private-context manifest. Private context cannot create a public
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

The target production design keeps source refresh, artifact build, and Pages
deployment as separate jobs with explicit permissions. No `.github` workflow,
scheduled/manual refresh job, or Pages deployment is currently present. A
future pull-request build uses synthetic fixtures only. A live-data workflow
requires approved source access and secrets; deployment requires a separately
approved remote and Pages target.
