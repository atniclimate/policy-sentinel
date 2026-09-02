# Versioned data contract

## Product-space compatibility and successor boundary

The current contracts below remain authoritative for implemented application
and artifact behavior. They are not silently renamed as the PNW analyzed
corpus. `PolicyRecord 1.4` may initially be consumed as one opaque validated
record input while successor contracts are added around it.

The PNW architecture requires separately versioned contracts for:

- region packs with authority-qualified jurisdiction and source references;
- community deployment profiles and deployment-authority state;
- persona projection and visibility policy;
- stable sovereign entities;
- recognition assertions independent of organization-membership assertions;
- evidence-bearing community relevance / `whyShown` assertions;
- Nation, ATNI, NCAI, source, and general taxonomy-authority crosswalks;
- a canonical analyzed corpus that references records once alongside events,
  evidence, explanations, coverage, health, review, and visibility;
- an output-adapter interface and digest-bearing output receipt; and
- later governed geographic and lifecycle bindings, only through separately
  authorized S0/K0 convergence if those modules are selected.

The first authorized successor must be additive and preserve current record,
artifact, source-registry, Nation-collection, application, K0, S0, and O0
behavior. A breaking change still requires a new version, migration fixture,
artifact-version decision, and compatibility test. Planning text supplies no
schema implementation or PNW completion evidence.

## Canonical schema catalog

This section is the single catalog for implemented JSON Schemas, related
logical/runtime contracts, and accepted but unimplemented successors. A schema
or interface is normative only for the scope named here. Its existence does
not activate a source, authorize production data, integrate an additive module,
or establish PNW completion.

### Implemented JSON Schemas

| Schema and normative status | Purpose, version, and stable ID | `$ref` dependencies | Instance producer and consumers | Examples and fixtures | Validator and migration posture |
| --- | --- | --- | --- | --- | --- |
| [`artifact.schema.v1.json`](../schemas/artifact.schema.v1.json) — current static-application contract | Six static artifact document kinds use document schema `1.0.0`. The manifest accepts archival artifact packages `1.0.0` through `1.4.0`; current output is package `1.4.0` with record `1.4.0` and source registry `1.19.0`. ID: `https://policy-sentinel.invalid/schemas/artifact.schema.v1.json`. | No external references; record, index, Nation, coverage, health, and manifest shapes are closed local definitions. | [`artifact.mjs`](../src/pipeline/artifact.mjs) and [`build-synthetic-artifact.mjs`](../scripts/build-synthetic-artifact.mjs) produce ignored `dist/data/**`. The application loader, artifact validator, and [`last-known-good.mjs`](../src/pipeline/last-known-good.mjs) consume it. | Current examples are generated and ignored; archival package fixtures are constructed in [`artifact-schema-compatibility.test.ts`](../tests/pipeline/artifact-schema-compatibility.test.ts). | [`validate-artifact.mjs`](../scripts/validate-artifact.mjs) and pipeline hardening tests validate instances separately from foundation validation. The schema remains archive-compatible, but the current client and validator require the coherent `1.4.0` package/record pair. Older packages need matching-version software or an explicit tested migration. |
| [`record.schema.v1.json`](../schemas/record.schema.v1.json) — current normalized-record contract | `PolicyRecord` schema `1.4.0`, including taxonomy membership `1.0.0`. ID: `https://policy-sentinel.invalid/schemas/record.schema.v1.json`. Its WA/OR/ID jurisdiction vocabulary and Nation-association fields belong to the retained application; they are not universal engine primitives or an ATNI-membership model. | No external references. The artifact schema carries related closed projections rather than referencing this schema. | Source normalizers under [`src/adapters/`](../src/adapters/), the pipeline, and the synthetic builder produce records. Policy validation, artifact/LKG handling, K0 compatibility projection, and application loading consume them. | [`county-explicit.valid.json`](../fixtures/records/county-explicit.valid.json), [`general-jurisdiction.valid.json`](../fixtures/records/general-jurisdiction.valid.json), and [`intergovernmental-accord.valid.json`](../fixtures/records/intergovernmental-accord.valid.json). | [`validate-foundation.mjs`](../scripts/validate-foundation.mjs), [`policy-record-14-validator.ts`](../src/kernel/lifecycle/policy-record-14-validator.ts), artifact validation, and pipeline tests enforce schema plus semantic policy. A breaking field or meaning change requires a new major schema, migration and compatibility fixtures, an artifact-version decision, and a decision-register entry. No general record migration is implemented. |
| [`source.schema.v1.json`](../schemas/source.schema.v1.json) — current source-registry contract | Source schema `1.3.0`; current registry `1.19.0`. ID: `https://policy-sentinel.invalid/schemas/source.schema.v1.json`. | No external references. | The authored [`sources.v1.json`](../config/sources.v1.json) is the normative instance. Build, policy, LKG, and K0 projection validators consume it. | The registry itself is the representative configuration; source-specific synthetic payloads live under [`fixtures/sources/`](../fixtures/sources/). | Foundation validation and [`source-registry.test.mjs`](../tests/pipeline/source-registry.test.mjs) validate it. Artifact/LKG compatibility is pinned to the exact registry version; an older artifact must be rebuilt or explicitly migrated, never silently relabeled. |
| [`taxonomy.schema.v1.json`](../schemas/taxonomy.schema.v1.json) — current taxonomy-configuration contract | Taxonomy schema and current taxonomy version `1.0.0`. ID: `https://policy-sentinel.invalid/schemas/taxonomy.schema.v1.json`. | No external references. | The authored [`taxonomy.v1.json`](../config/taxonomy.v1.json) is the normative ten-category, 33-subcategory instance. Mapping, record-policy, build, application, and LKG paths consume it. | The configuration itself is the representative example; record fixtures exercise mapped and Unclassified states. | Foundation and pipeline tests validate exact IDs and many-to-many structure. A semantic taxonomy change requires a new version and reviewed mapping compatibility; no automatic taxonomy migration exists. |
| [`assertion.schema.v1.json`](../schemas/assertion.schema.v1.json) — implemented additive K0 primitive contract | Shared assertion contract `1.0.0` with canonicalization `ps-c14n-json-1`. ID: `https://policy-sentinel.invalid/schemas/assertion.schema.v1.json`. It is normative for K0 and the frozen S0 imports, not integrated product data. | No external references; lifecycle and all three S0 schemas reference its fragments. | Runtime constructors and validators under [`src/kernel/assertions/`](../src/kernel/assertions/) produce and consume assertion values; K0 and S0 consume the same identities, temporal values, evidence, and digests. | Representative values are constructed in [`source-fact.test.ts`](../tests/kernel/assertions/source-fact.test.ts), [`temporal.test.ts`](../tests/kernel/assertions/temporal.test.ts), and K0/S0 fixtures. | Foundation validation and assertion, lifecycle, and S0 schema/runtime-parity tests validate it. A semantic change requires a new contract version and compatibility review across both dependents; closed convergence means no current product migration is implied. |
| [`lifecycle.schema.v1.json`](../schemas/lifecycle.schema.v1.json) — implemented additive K0 contract | Lifecycle bundle contract `1.0.0`, assertion contract `1.0.0`, and canonicalization `ps-c14n-json-1`. ID: `https://policy-sentinel.invalid/schemas/lifecycle.schema.v1.json`. K0 remains outside product dependencies while convergence is closed. | References only fragments in `assertion.schema.v1.json`. | [`bundle.ts`](../src/kernel/lifecycle/bundle.ts) produces and validates bundles. [`projection.ts`](../src/kernel/lifecycle/projection.ts) can make a declared-lossy PolicyRecord 1.4 compatibility projection; it does not migrate stored artifacts. | [`empty.synthetic.valid.json`](../fixtures/lifecycle/empty.synthetic.valid.json) and typed representative fixtures in [`fixtures.ts`](../tests/kernel/lifecycle/fixtures.ts). | Foundation validation and [`schema.test.ts`](../tests/kernel/lifecycle/schema.test.ts) enforce JSON Schema/runtime parity. The projection identifier is `policy-record-1.4-from-k0-1.0.1`; any lifecycle or projection semantic change requires a separately versioned compatibility decision. |
| [`spatial-observation.schema.v1.json`](../schemas/experimental/spatial-observation.schema.v1.json) — implemented experimental S0 contract | Impossible-synthetic `SpatialObservation` contract and adapter `1.0.0`. ID: `https://policy-sentinel.invalid/schemas/experimental/spatial-observation.schema.v1.json`. It is not a real-geography or product contract. | References only assertion-schema fragments. | [`observation.ts`](../src/experimental/spatial/observation.ts) produces/validates observations; only S0 relation, evidence-view, and tests consume them. | Five valid observation fixtures and one malformed fixture under [`fixtures/experimental/spatial/`](../fixtures/experimental/spatial/). | Foundation validation, schema/runtime parity, adversarial, custody, and non-interference tests validate it. S0 is removable and nonconverged; changing it requires an S0 version/review decision and creates no product migration. |
| [`spatial-relation.schema.v1.json`](../schemas/experimental/spatial-relation.schema.v1.json) — implemented experimental S0 contract | Impossible-synthetic `SpatialRelation` contract `1.0.0`. ID: `https://policy-sentinel.invalid/schemas/experimental/spatial-relation.schema.v1.json`. It cannot establish identity, association, jurisdiction, legal applicability, or rights impact. | References only assertion-schema fragments. | [`relation.ts`](../src/experimental/spatial/relation.ts) produces/validates relations; only S0 evidence-view and tests consume them. | One valid partial-coverage relation, one invalid duplicate-digest relation, and topology cases under [`fixtures/experimental/spatial/`](../fixtures/experimental/spatial/). | Foundation validation and S0 parity, adversarial, topology, custody, and non-interference tests validate it. It has no product migration while the S0 convergence gate is closed. |
| [`jurisdiction-evidence.schema.v1.json`](../schemas/experimental/jurisdiction-evidence.schema.v1.json) — implemented experimental S0 contract | Impossible-synthetic `JurisdictionEvidence` contract `1.0.0`. ID: `https://policy-sentinel.invalid/schemas/experimental/jurisdiction-evidence.schema.v1.json`. It preserves a limited reviewed statement and is not a legal or geographic authority determination. | References only assertion-schema fragments. | [`jurisdiction-evidence.ts`](../src/experimental/spatial/jurisdiction-evidence.ts) produces/validates evidence; only the S0 view and tests consume it. | One valid and one malformed jurisdiction-evidence fixture plus the expected evidence view under [`fixtures/experimental/spatial/`](../fixtures/experimental/spatial/). | Foundation validation and S0 parity, adversarial, custody, accessibility, and non-interference tests validate it. It is removable experimental data with no current product migration. |

All nine top-level IDs are unique. In the current schema bytes, 578 `$ref`
keywords resolve: the lifecycle schema and three experimental S0 schemas point
only to locally registered assertion-schema fragments, and every other
reference is an internal JSON Pointer. The `.invalid` IDs are logical schema
identifiers; validation never fetches them. The dependency-free
[`validate-backbone.mjs`](../scripts/validate-backbone.mjs) discovers every JSON
file below `schemas/`, requires Draft 2020-12 plus an absolute top-level ID,
rejects duplicate resource IDs and anchors, and resolves every local pointer or
cross-schema reference. It also checks local relative links in all repository
Markdown discovered from the filesystem, including untracked candidate files,
while excluding external URLs, ignored generated/dependency trees, and the
preserved `docs/00-*` through `docs/11-*` owner-direction packet. That packet is
input to this reconciliation, not a canonical dependency of a later clone or
launch.

`npm test` runs foundation validation, which currently compiles the eight
record, source, taxonomy, assertion, lifecycle, and S0 schemas in strict mode,
validates the source registry, taxonomy, and synthetic fixtures, and proves
selected invalid governance cases are rejected. The artifact schema follows a
separate instance-validation route through `npm run build`,
`npm run validate:artifact`, and its focused tests. The backbone validator
proves identifier, reference, and local-link closure; it does not replace Ajv,
semantic policy, schema/runtime parity, artifact, or migration tests.

### Logical and runtime contract families

These families are executable contracts or compatibility projections without
independent JSON Schema IDs. TypeScript types do not override the JSON Schemas
above.

| Family and current status | Versioned boundary, producers, consumers, and proof | Compatibility limit |
| --- | --- | --- |
| Shared record/artifact/source types and pipeline policy — implemented | [`src/shared/contracts.ts`](../src/shared/contracts.ts) mirrors record `1.4.0`, artifact document `1.0.0`, source schema `1.3.0`, and registry `1.19.0`; [`policy-validation.mjs`](../src/pipeline/policy-validation.mjs), artifact packaging, and LKG enforce additional semantic invariants. | These are runtime mirrors and policies, not successor engine contracts. Schema and semantic changes must move together with fixtures and compatibility tests. |
| Retained application projections — implemented | [`src/app/types.ts`](../src/app/types.ts), [`data.ts`](../src/app/data.ts), and [`policy.ts`](../src/app/policy.ts) hydrate a deliberately narrower public view and derive display behavior from accepted artifact data. | Application interfaces are consumers, not normative duplicates of `PolicyRecord`, the artifact package, or a future analyzed corpus. |
| BIA recognition transcription and identity policy — implemented but evidence-blocked | [`recognition-registry.ts`](../src/adapters/bia/recognition-registry.ts) binds the 2026 notice, identity rule `1.0.0`, 577 reviewed paragraphs, stated count 575, and a fail-closed unresolved reconciliation. Its tests and synthetic HTML fixture validate structure. | It emits no production Nation registry. Federal recognition is not ATNI membership, and exactly 575 is a retained United States collection rule rather than a universal engine invariant. |
| Federal Register contract and adapter — implemented, disabled for public output | Query/response/transport contracts and adapter `1.0.0` live under [`src/adapters/federal-register/`](../src/adapters/federal-register/) with representative, historical, correction, withdrawal, facet, issue, and malformed synthetic fixtures. | Bounded adapter proof is not public source activation, universal history, or PNW coverage. |
| Congress.gov synthetic contract — implemented, live gate closed | Contract `1.0.0` under [`src/contracts/congress/`](../src/contracts/congress/) validates query and response/resource projections against valid, historical, and malformed fixtures. | No live response, credential, provider provenance, source health, or public record is authorized. |
| GovInfo synthetic contract — implemented, live gate closed | Contract `1.0.0` under [`src/contracts/govinfo/`](../src/contracts/govinfo/) validates query, response, and pagination projections for package/granule, retry, malformed, and incomplete fixtures. | GovInfo identity remains distinct from Congress.gov identity; live key, fixity, pagination, and collection semantics remain unresolved. |
| Regulations.gov synthetic contract — implemented, live gate closed | Contract `1.0.0` under [`src/contracts/regulations-gov/`](../src/contracts/regulations-gov/) validates query, pagination, docket/document/attachment, mutation, rate, malformed, and exclusion fixtures. | Comments, personal/contact content, raw envelopes, and attachment bytes are excluded. The current record/artifact contracts have no first-class docket, attachment, rate, or shard model. |
| Washington LWS synthetic contract — implemented, discovery evidence blocked | Contract `1.1.0`, refresh capability `1.0.0`, and closed canary report `1.1.0` live under [`src/contracts/washington-lws/`](../src/contracts/washington-lws/) with digest-bound XML and manifest fixtures. | The six known-bill operations do not enumerate a population. The one fixed yearly observation failed bounded parsing and is not retried; the source remains disabled with `adapter: null`. |
| Washington Governor executive orders — adapter validated, source disabled | Contract and adapter `1.0.0` under [`src/adapters/washington-governor-executive-orders/`](../src/adapters/washington-governor-executive-orders/) consume one bounded synthetic current-term HTML fixture. | No production record or historical-completeness claim is authorized. |
| Washington Centennial Accord — adapter validated, source disabled | Contract and adapter `1.0.0` under [`src/adapters/washington-centennial-accord/`](../src/adapters/washington-centennial-accord/) exercise the record/artifact `1.4.0` accord context using one synthetic HTML fixture. | Collective party language is not an individual Nation association; real-source output and a complete signatory claim remain unauthorized. |
| Curated Supreme Court opinions — adapter validated, source disabled | Contract `1.0.0` and adapter `1.1.0` under [`src/adapters/supreme-court-opinions-curated/`](../src/adapters/supreme-court-opinions-curated/) exercise a one-row synthetic Cougar Den metadata/link projection. | It is a bounded landmark pilot, not complete court history or authorization to reproduce opinion text. |
| Oregon Legislature OData — offline contract implemented, live gate closed | Contract `1.0.0` under [`src/contracts/oregon-odata/`](../src/contracts/oregon-odata/) validates repository-owned metadata and resource bundles with explicit nullability, identity, cardinality, and privacy limits. | It is a logical offline DTO, not a provider envelope, adapter, source receipt, coverage claim, or public record. |
| K0 assertion/lifecycle runtime — implemented, nonconverged | Runtime code under [`src/kernel/assertions/`](../src/kernel/assertions/) and [`src/kernel/lifecycle/`](../src/kernel/lifecycle/) is governed by the frozen [`k0-lifecycle-contract.md`](vision/k0-lifecycle-contract.md) and its independent review/audit. | `SourceFact`, `PolicyInstrument`, `PolicyEvent`, and `DerivedAssertion` remain distinct. K0 may affect product dependencies only after a separate convergence decision. |
| S0 spatial runtime — implemented impossible-synthetic experiment, nonconverged | Runtime code, fixtures, view, and non-interference tests under [`src/experimental/spatial/`](../src/experimental/spatial/) are governed by the frozen [`s0-spatial-contract.md`](vision/s0-spatial-contract.md). | `SpatialRelation`, source association, and community relevance are distinct. S0 supplies no real geometry, rights frame, product route, or PNW completion evidence. |

The application's current `WhyShown` interface is specifically **not** the
planned `CommunityRelevanceAssertion`. [`WhyShown`](../src/app/types.ts) has a
display basis and label plus optional evidence text and URL, and
[`whyShownFor`](../src/app/policy.ts) derives it while rendering the retained
Nation-oriented application. It has no stable assertion identity, required
configuration or authoring authority, versioned rule, review state, temporal
scope, visibility decision, or explicit non-claims. Neither it nor the current
record `relevance` array may be cited as implementation evidence for the PNW
successor.

### Successor contract register

The status cells below describe the live repository checkpoint. Live bytes,
schema-graph validation, focused/full test evidence, and `ROADMAP.yaml` control
whether a row is proposed or implemented; this register cannot authorize a
transition. Historical handoff statements that PNW-01 or PNW-03 paths were
absent remain dated evidence, not contrary current-state claims.

| Proposed family | Current authority and status | Missing contract/migration consequence |
| --- | --- | --- |
| PNW-01 engine, region, deployment, persona, relevance, and output seam | Implemented and validated as the additive closed `ProjectionProfileBundle 1.0.0` and readonly `src/engine` projection seam under its exact historical [`PNW launch handoff`](handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md). | The synthetic profile fixture is its producer input and `src/engine` its consumer. It does not migrate or change `PolicyRecord 1.4`, artifact `1.4`, source registry `1.19`, current app data, or existing fixtures. A semantic break requires a successor schema version, migration fixture, consumer review, and roadmap decision. |
| Sovereign identity, recognition, and organization membership | PNW-02 requires stable `SovereignEntity`, time-versioned `RecognitionAssertion`, and independent `OrganizationMembershipAssertion` contracts plus originating evidence for the intended 59 current ATNI Member Tribes. | No schema, authoritative 59-member roster, crosswalk, or migration exists. Current Nation records and the 575-recognition collection cannot be renamed or migrated into ATNI membership. |
| Governed geography and configured rights frames | Implemented as the separate closed `GeographyRightsBundle 1.0.0` schema and PNW-owned parser/projection seam. It references exact PNW-01 scopes, holds multiple optional typed temporal relations and source-bound rights frames, and emits only access/use-authorized references. | It is synthetic model evidence only. It does not migrate the PNW-01 profile, `PolicyRecord`, or public artifact; supply real geography or rights evidence; activate a source; compute an intersection; establish identity, land status, jurisdiction, applicability, or rights impact; or converge S0. A semantic break requires a successor schema and migration/consumer review. |
| Authority-separated taxonomy crosswalks | PNW-04 requires Nation, ATNI, NCAI, originating-source, and general taxonomy authorities to remain separately versioned and many-to-many. | No successor crosswalk schema exists. Taxonomy `1.0.0` remains the retained general/source configuration and cannot be relabeled as an organization position. |
| Source-supported events and lifecycle convergence | PNW-06 requires source-specific event, correction, amendment, challenge, withdrawal, deadline, supersession, health, and LKG evidence. | No PNW lifecycle schema exists. K0 is only a possible primitive source after its closed convergence gate is separately opened; current history fields and K0 cannot silently migrate into asserted currentness or legal effect. |
| Canonical analyzed corpus | PNW-07 requires one versioned identity that references records once alongside events, evidence, explanations, coverage, health, review, projection inputs, and output-safe visibility. | No corpus schema, producer, fixture, or migration exists. `PolicyRecord 1.4`, artifact package `1.4`, and the current app are compatible inputs/precursors, not the analyzed corpus. |
| Document, web-module, application, and structured-output adapters | PNW-08 requires pure adapters over one accepted corpus plus digest-bearing output receipts that preserve record/corpus identity, citations, evidence, review, visibility, coverage, and limitations. | No successor adapter or receipt schema exists. The current app, dossier, CSV, and static artifact are retained output precursors only. |
| O0 orchestration | [`o0-orchestration-contract.md`](vision/o0-orchestration-contract.md) is a repaired, byte-sealed proposed `1.0.0` candidate awaiting independent review. It is unaccepted, unimplemented, nonconverged, and blocked at `O0-ORCHESTRATION`. | It has no JSON Schema, fixture implementation, producer, consumer, migration, or product dependency. Cataloging the candidate does not accept or authorize it. |
| D0 change intelligence | D0 appears only in the superseded historical development proposal and remains absent and unauthorized. | There is no roadmap work item, contract, schema ID, fixture, implementation, migration, or dependency. O0 absence/promotion evidence cannot create D0 change semantics. |

The successor concepts deliberately preserve distinctions that current output
projections cannot collapse: sovereign identity versus recognition versus
organization membership; source fact versus instrument versus event versus
derived assertion; geographic relation versus source association versus
community relevance; configured rights frame versus legal applicability or
rights impact; and coverage versus source health versus review state versus
visibility versus output projection. A future compatible evolution must
preserve source identity, evidence lineage, record identity, and eventual corpus
identity through every adapter.

Source-registry version `1.19.0` distinguishes researched configuration,
implemented adapters, and activation. A disabled source may have
`adapter: null` or a versioned adapter that is not authorized to emit public
records; an enabled source must have a versioned adapter. Every non-synthetic
source records the date its cited contract and terms were accessed. Disabled
sources and their identifiers are rejected from coverage, health, manifests,
and records rather than appearing as an unavailable public source. The
compatible source schema retains the `official_index` access method for an
originating public document index that is neither an API, feed, nor bulk
export and adds `official_page` for a bounded originating document page that is
not an index. The independently registered `washington-state-register` and
`washington-governor-executive-orders` sources use that method and remain
disabled; the Register retains `adapter: null`, while the Governor has a
versioned contract-1.0 adapter descriptor. Separate source IDs preserve
independent health and last-known-good behavior. The Governor's synthetic
contract enforces one exact Bob Ferguson value-`220` page, 25 rows or fewer,
compound number/date identity, Active-only v1 status, metadata and links only,
complete provenance, and atomic source failure. Its one aggregate-only live
contract check matched the reviewed 14-row range without retaining provider
bytes. It is still not authorized to emit public records and does not claim
historical completeness or continuous PDF reachability. Their dated reviews
keep the Register's scheduled publication date separate from online
availability and do not treat the Governor's current-term index as a complete
historical archive. The registry-version change intentionally makes an older
artifact ineligible for last-known-good reuse until it has been rebuilt
against the exact current source registry.

The Register issue index cannot populate the record schema's required exact title
or reliably populate the issuing body: the observed `26-14` index has no title
column, and all 22 duplicate identifier groups disagree under their displayed
or inherited agency contexts. Identifier-only titles and guessed agency
selection are forbidden. The source remains `adapter: null` until a separately
reviewed bounded filing-page contract supplies exact values while excluding
raw bodies, contacts, hearing credentials, unrelated free text, and land
content.

The separately registered `washington-centennial-accord` source uses
`official_page` and remains disabled with a versioned contract-1.0 adapter. Its official page
supplies an exact title, collective executing parties, and an execution date but
no individual signatory list, official number, signed facsimile, structured
current status, source update time, complete supersession history, or reuse
license. Record schema and artifact package `1.4.0` add a required nullable
`accordContext`, non-null only for `intergovernmental_accord`. It preserves
bounded government or collective-government parties with exact executing or
signatory role labels and URLs, an exact executed or signed event, narrative
execution evidence that explicitly establishes no current status, a
reviewed-official-sources-only supersession state tied to reciprocal typed
edges, and either a source identifier or deterministic project-fallback rule.
Accords require zero issuing bodies and an unknown/null generic status; their
execution event cannot populate introduction, publication, last-action,
deadline, or effective dates. The context, event chronology, metadata-only
landmark evidence, provenance, compact/detail integrity, dossier, CSV, and
last-known-good behavior are covered by synthetic tests. This model does not
authorize the real source. Adapter 1.0 accepts only the exact canonical URL and
a bounded 11-key metadata projection under public-DNS, transport, byte, chunk,
deadline, DOM, text, and grammar limits; no HTML or page prose crosses the
transport boundary. Normalization is metadata-and-links-only,
`general_jurisdiction`, Unclassified, and has zero issuing bodies or Nation
associations. The GOIA entry remains disabled, emits no record, coverage,
health, or LKG shard, and cannot create a Nation association without exact
official signatory evidence reconciled to the approved Nation registry.

Grants.gov is disabled with no adapter because its current terms and live
contract canaries remain behind G-B-GRANTS. The Congress.gov entry is likewise
disabled with no adapter because registration, key handling, runtime-host
selection, and live response validation remain behind G-B-CONGRESS; its local
contract uses synthetic resource fragments only. GovInfo is also disabled with
no adapter: every reviewed API operation requires a query-bound key, and its
formal package/granule response schemas do not establish a safe live contract.
Its local contract preserves only repository-owned synthetic projections,
keeps GovInfo package/granule identity separate from Congress.gov identity, and
distinguishes local transport SHA-256 verification from optional provider
PREMIS fixity. Regulations.gov is also disabled with no adapter while its key,
live response, pagination, date-window, privacy, attachment, rate, and
historical-completeness gates remain closed. Its local contract permits only
repository-owned synthetic docket/document/attachment and control projections;
public comments, submission operations, raw provider envelopes, personal or
contact fields, and attachment bytes are structurally excluded. The mutation
projection is explicitly limited to one synthetic document ID, treats provider
identity behavior as unverified, and permits docket reassignment without
inferring replacement behavior. Repository-owned aggregate attachment and
format budgets fail closed before nested projections can grow without bound.
Washington Legislative Web Services remains disabled with `adapter: null`.
Its repository contract now validates exact SOAP 1.1 requests and bounded,
namespace-aware XML responses for six known-bill operations using impossible
synthetic fixtures. Contract 1.1 separately adds the formally typed
`GetLegislationByYear(year: xsd:int) -> LegislationInfo[]` surface as a disabled
enumeration candidate with its own digest-bound impossible-year fixture and a
2,048-item repository ceiling. The typed projection preserves bill/version,
status, sponsor, committee, document-link, and session-law evidence while
excluding contact fields and reviewed free text. It fails closed on unknown or
duplicate structural fields, unbounded collections, unsafe document URLs, and
explicit request/response identity-echo disagreement. It preserves repeated
operation items plus successful missing/empty results because live uniqueness
and sparse result semantics are not yet known. Repository fixture bytes are
bound by filename, operation, role, and SHA-256; that reviewed fixture
inventory is not provider provenance. The projection is explicitly
`general_jurisdiction`, has no Nation evidence or official subject labels, and
remains `Unclassified`.

The refresh-capability contract proves that every one of the six known-bill
operations requires an existing bill number, bill ID, or document-name seed.
None discovers a bill population, and the bill-specific status window is not a
unified mutation feed. Numeric bill-range scanning is forbidden.
`GetLegislationByYear` is only a bounded year-keyed query candidate: no pagination,
total, provider row cap, ordering, completeness, historical range, deletion
signal, data-as-of time, or request-year echo is documented. The year-keyed
query may overlap other years and is not a proven partition. The response
boundary therefore preserves order and duplicates, does not infer a biennium
from the request year, and cannot establish a unique or active winner. Present
returned biennia must independently be canonical odd-year `YYYY-YY` values
within 1799 through 3999, and returned bill numbers must be integers from 1
through 999,999; these source-value bounds are not an identity echo.

The generic repository network transport remains enabled only for the six
known-bill operations. It rejects every `GetLegislationByYear` input before
resolving or calling `fetch`. A separately reviewed fixed helper owns the one
2025 yearly canary request, accepts only transport dependencies, reaches the
private prepared-request core, reduces typed items to a frozen closed aggregate
before returning, and is omitted from the general contract barrel. No exported
function returns the yearly request, receipt, or items. The helper ran once on
2026-07-31 and returned a sanitized `invalid_soap` rejection at HTTP 200; it
must not be rerun under the current ledger. For enabled operations the transport
builds the exact URL, action, headers, and body internally; permits one
credential-free, no-redirect attempt under a 30-second
whole-operation deadline enforced by cancellation during retrieval and
monotonic elapsed-time checks before and after bounded parsing; requires the
exact final URL, HTTP 200, reviewed `text/xml` media type with no charset or
UTF-8, either no `Content-Encoding` or `identity`, and a streamed body of
1 byte through 2 MiB in at most 4,096 non-empty chunks; and immediately parses
then zeroes every retained byte buffer before release. Non-200 bodies and unread
remainders are canceled. The returned receipt contains the canonical request,
aggregate byte counts, and the typed sanitized projection, never provider bytes
or raw XML. Errors contain only repository-owned categories, an optional
numeric HTTP status, and static messages.

The fixed known-bill `GetLegislation` observer's one 2026-07-31 attempt
succeeded with a single present item and accepted reviewed identity echoes;
both observed response date lexemes lacked a timezone. The fixed yearly
observer's separate one attempt reached HTTP 200 in under one second but was
rejected as `invalid_soap`; its report retained no byte counts or SOAP
observation and its expectation was false. That category proves only that the
body reached and failed bounded SOAP parsing, not why it failed or whether it
contained a success, fault, excessive collection, malformed XML, or another
contract mismatch. No raw XML, typed response item, provider string, exact
response date, or public record was persisted by either observer.

The separately invoked canary observer reduces a receipt immediately to a
plain-data snapshot, then runtime-validates an exact-key aggregate report before
serialization. Report contract 1.1 binds each of two scenarios to a frozen
operation and structural policy and reports the actual zero-or-one request
attempt. The second, now closed scenario authorizes only the internally fixed
yearly helper. The module-private scenario executor is reachable only after one
exact command passes; the observer and helper are omitted from the general
Washington contract barrel. The yearly report exposes only operation/scenario
enums, expectation and sanitized-fault booleans, numeric or null HTTP/byte
aggregates, returned-item and aggregate five-field optional-presence counts,
repository-budget state, a timing bucket, and fixed non-assessment markers. It
accepts no dynamic request or output value and does not expose the request year,
a response item, identifier, provider string, exact date, URL, header, raw byte,
error detail, or partial aggregate. The launcher disables `.env` loading. The
report is not a `PolicyRecord`, provider provenance, source-health receipt,
coverage claim, or persisted artifact.

That source-contract DTO is not a normalized `PolicyRecord` and carries no
claim of live provider behavior, historical completeness, retrieval
provenance, or public eligibility. Operation-specific ranges, live SOAP
response/fault behavior, document-link hosts, date semantics, identity
reconciliation, complete discovery, health, and last-known-good behavior
remain unverified. The official WSDLs expose no bill-subject field and include
personal/contact, free-text, and untyped surfaces; publication remains
metadata-and-reviewed-official-links only after the remaining adapter
contracts pass.

The current normalized record and artifact schemas do not provide first-class
Regulations.gov docket entities, attachment collections, rate-header metadata,
or a general mutable-field observation history. Regulations.gov docket
relationships and attachment metadata therefore remain source-contract
evidence only. They must
not be forced into unrelated record fields or emitted publicly before a
separate versioned schema decision. Health and last-known-good state are also
source-level; future agency, date-window, or docket sharding must either add a
versioned shard dimension or conservatively fail/degrade Regulations.gov as one
source.

The normalized schema likewise has no first-class Washington bill-version or
rendition collection, veto model, RCW/session-law relationship, or structured
biennium boundary. Source health and last-known-good state are not partitioned
by LWS operation or biennium. Until a versioned schema decision adds those
dimensions, a required operation or biennium failure must conservatively
omit/degrade Washington LWS as one source and source-contract evidence must not
be forced into unrelated record fields.

Record schema 1.2 introduced a source-neutral `judicialContext` for court and
administrative decisions. It keeps adjudicating body, docket numbers, exact
reporter/neutral/other official citations and their source URLs, decision date,
document form, publication status, and revision review in distinct roles.
`court_decision` and `administrative_decision` records require this context;
all other document types require `null`. Semantic validation binds the body
kind to the document type, requires the exact adjudicating body to remain in
`issuingBodies`, checks citation URLs against the registered hosts, and makes a
`relationships_recorded` revision state agree with at least one typed revision
edge. The model preserves source evidence without asserting precedential force,
legal effect, or complete subsequent history.

Record schema and artifact package 1.3 add a required `reviewState` for every
landmark and permit either copied `SourceText` or a mutually exclusive
metadata-only evidence object with an exact source label, URL, date, and
reproduction basis. Semantic validation requires landmark relevance and its
official evidence to share a URL, binds typed criterion codes to document type,
rejects copied landmark text from `metadata_and_links` sources, and enforces
link-only treatment for non-landmark pre-1980 records.

Registry 1.17.0 retains adapter 1.1 for the selected one-row Supreme Court
source while keeping the source disabled. The adapter emits only the reviewed
Cougar Den citation-and-link metadata, marks the row as an editorially approved
`documented-court-decision` landmark, sets `urls.officialFullText` to `null`,
and preserves the bound-volume fragment only as the reporter citation's
`sourceUrl`. Its landmark evidence is exact metadata, not copied opinion text.
The separate DOI IBIA chronology remains disabled with `adapter: null` because
its source and privacy gaps are unchanged.

Registry 1.17.0 also gives the assessed state court surfaces independent
disabled source identities. `washington-appellate-slip-opinions` has no
official citation separate from its docket and no case-specific typed path
from a mutable slip opinion to its current reporter version.
`oregon-appellate-opinions` exposes a technically usable citation-and-docket
row, but Oregon.gov makes continued access acceptance of its terms and that
source-scoped authorization remains closed. `idaho-supreme-court-opinions` and
`idaho-court-of-appeals-opinions` expose dockets, dates, categories, and links
but no per-record citation, remittitur/finality state, or typed substitution
history. All four entries retain `adapter: null`; their provenance pointer
requirements document the missing judicial fields, while disabled-source
validation prevents records, coverage, health, manifests, or last-known-good
shards from claiming those sources.

Registry 1.17.0 separately records
`oregon-administrative-rules-bulletins` and
`oregon-governor-executive-orders` as disabled non-OData source gaps. The
bounded OARD observation found a technically useful final-filing index with an
exact AON, agency, source type, filed value, caption, and link, but proposed
notices have no AON, receipt targets expose prohibited contact and free-text
content, generated links carry session values, and the index supplies no
effective/current-status or correction relationships. Oregon's current
statewide terms make access acceptance and cover Oregon-operated sites outside
the `oregon.gov` hostname, so no further OARD or Governor request or adapter is
authorized. Both entries retain `adapter: null`, null exact-date coverage,
metadata-and-links-only intent, and independent future health/LKG boundaries.

Registry 1.17.0 retains disabled `oregon-legislature-odata` with
`adapter: null`, `build_secret` authentication, null exact-date coverage, and
the still-closed G-C terms/account/credential gate. Its contract 1.0 is an
offline logical DTO, not a provider envelope: canonical synthetic metadata
defines sessions, measures, sponsors, committees, actions, votes, versions,
and statuses; bounded sequential pages carry impossible year-3785 records;
and exact allowlists, explicit nullability, identity order, cardinality,
cross-entity references, privacy exclusions, and a conservative 2007 contract
floor fail closed. No request, transport, environment, adapter, production
record, provider provenance, health receipt, coverage entry, or last-known-good
shard is produced.

Registry 1.17.0 adds `idaho-administrative-rulemaking-index` and
`idaho-governor-executive-orders` as separate disabled sources. The
administrative HTML listings were unavailable during review, while the mutable
active-rulemaking PDF repeats docket lifecycle rows, drifts under text
extraction, includes HTTP links, and exposes conflicting future blob metadata.
The Governor index supplies unique order numbers and official PDF links but no
exact issuance dates, complete status/range statement, or uniform relationship
contract, and one row lacks a title. Both sources retain `adapter: null`, null
coverage bounds, metadata-and-links-only intent, and no public health/LKG
output. Their required provenance pointers record the title, identity, issuing
body, status-as-of, date, and link fields that any future contract must prove.

Core measure/session, sponsor/committee, action, and source-status concepts can
fit the normalized record only after live identity, official URLs, required
dates, source paths, nullability, and mappings are verified. A measure without
an official title or current status date cannot satisfy the record contract.
Votes and versions have no first-class record collections, while action and
status history require official event URLs that the offline DTO intentionally
lacks. `Relating To Clause` text is not a controlled official subject and must
not become a taxonomy category, relevance basis, Nation association, or legal
conclusion. The [dated offline review](source-reviews/oregon-odata-offline-contract-2026-07-31.md)
records the complete field-fit and failure boundary.

## Nation collection boundary

The artifact keeps the current 575-entry synthetic Nation collection explicit:
its manifest and baseline synthetic flags must agree, and synthetic rows cannot
carry production identity, review, source-evidence, provenance, health, or
official-crosswalk claims. This prevents a fixture from being relabeled as a
reviewed public registry.

A production collection remains impossible until `G-BIA-IDENTITY` is satisfied.
When that evidence exists, the same schema and standalone semantic policy
require exactly 575 collision-free stable IDs and official names; a semantic
registry/identity rule; completed non-blocking publication review; a validated
reconciliation summary whose raw count matches all assigned source paragraphs;
the annual notice's exact document metadata and current healthy receipt; and
baseline-bound evidence plus field provenance for every source-derived identity
field. The policy can represent 577 source paragraphs assigned exactly to 575
reviewed identities, but supplies no grouping or exclusion rule itself.

State coverage is either `reviewed_official_crosswalk` or
`unresolved_no_reviewed_crosswalk`. Each accepted WA, OR, or ID code requires
one validated authoritative evidence item containing the exact official name or
authorized alias, source text, identifier, URL, source date, retrieval time, and
matching `/stateCoverage` provenance. Unresolved entries carry no state or state
evidence and remain federal-only. Record associations must match both stable ID
and official name in the validated collection, cite an official record URL, and
contain an exact approved identity in their evidence text.

## Record groups

The normalized record preserves:

| Group | Contract |
|---|---|
| Identity | Schema version, stable opaque internal ID, source ID, exact source record ID, exact official title, and source-specific document identifier. |
| Classification | Document type, jurisdiction and level, issuing bodies, session/congress context, normalized and exact source status, official subjects, zero-or-more taxonomy memberships, and explicit `isUnclassified`. |
| Dates | Introduction, publication, update, action, deadline, retrieval, and any source-defined dates, without inventing absent values. |
| Judicial context | For court and administrative decisions only: exact adjudicating body and kind, docket numbers, typed official citations and source links, decision date, normalized plus source-labeled document form and publication status, and dated revision-review state. |
| Accord context | For intergovernmental accords only: exact collective or governmental parties and source roles, executed/signed event and evidence, explicit absence of a source-established current status, reviewed supersession scope tied to typed edges, and source-provided or deterministic fallback identity. Parties are not issuing bodies and collective language is not a Nation association. |
| Links and language | Registered official landing/full-text URLs, official summary or abstract, and only permitted source-language excerpts or full text. |
| Legislative/process detail | Sponsors, committees, actions, status history, versions, and source timestamps when supplied. |
| Source-document relationships | Detail-only `corrects`, `corrected_by`, `supersedes`, `superseded_by`, `substitutes`, `substituted_by`, and `related_document` edges with the exact target source-record ID, official target URL, and originating source label. |
| Relevance | One or more explicit bases such as source-explicit Nation reference, general jurisdiction, landmark, or another registered source-defined basis. |
| Nation evidence | Internal Nation ID, exact official name or authorized alias found, exact evidence text/location, official evidence URL, evidence date, basis, and validation state. |
| History and quality | Actual source coverage range and confidence; pre-1980 treatment; landmark criterion code, project editorial review state, exact official evidence metadata or permitted source text, and reproduction basis; data quality; source health; freshness; change badge; and urgent alert metadata. |
| AI | Nullable detail-summary object with required label, model/build/policy provenance, cited official inputs, dates, and validation state. |
| Provenance | Per-field JSON Pointer, source ID/record ID/URL, retrieval time, source update time when available, transformation or mapping rule, and validation state. |

The schema includes no field for a legal conclusion, rights impact,
jurisdictional determination, land interest, or inferred Nation relationship.

## Semantic invariants

JSON Schema is one layer. Phase B semantic validation must additionally prove:

1. internal and compound source IDs are unique and stable;
2. every source-derived leaf field has a field-provenance entry;
3. every Nation association has exact official evidence and no inference flag;
4. every taxonomy membership cites exact official label(s), mapping-rule ID,
   mapping source, and taxonomy version;
5. zero taxonomy memberships means `isUnclassified: true`, while one or more
   means false;
6. county records contain an explicit Nation association and
   `explicit_nation_reference` relevance;
7. federal or state records with no Nation association are marked
   general-jurisdiction;
8. historic and landmark labels satisfy the written criteria, every landmark
   has an approved project editorial review state and official evidence tied to
   its landmark relevance URL, and criterion codes match the record type;
9. excerpts and full text match the registered source-use decision, metadata-
   only landmark evidence contains no copied source text, and non-landmark
   pre-1980 records remain citation-and-link entries;
10. deadlines and status alerts retain their exact source field and date;
11. AI text contains no em dash or forbidden conclusion/relevance assertion
    and has complete cited-input provenance; and
12. judicial context is present only for court or administrative decisions,
    its body kind matches the document type, and the same exact body is retained
    in `issuingBodies`;
13. judicial publication-status and revision-review dates remain within the
    decision-to-retrieval interval;
14. judicial revision-review state agrees with any typed correction,
    supersession, or substitution edge;
15. source-document relationships use registered official HTTPS URLs and
    contain neither self-relationships nor duplicate type/target edges;
16. every `corrects` or `corrected_by` relationship resolves within the same
    source record set and has the reciprocal correction edge; and
17. no raw response, credential, personal contact, private, parcel, ownership,
    map, or sensitive land field survives normalization.

Validation failures quarantine the candidate record from the new artifact; they
do not silently coerce, categorize, associate, or drop it. The source health
manifest reports aggregate failure and the prior valid public shard remains
eligible for last-known-good handling.

## Source-document relationships

`sourceDocumentRelationships` preserves only relationships explicitly supplied
by the originating source. `sourceLabel` retains the upstream relationship
field or label without converting it into a legal conclusion. A correction
record uses `corrects`; the corrected record uses `corrected_by`; both records
must be present in the validated same-source record set and point to each other.
The `supersedes`/`superseded_by` and `substitutes`/`substituted_by` pairs retain
only an explicit originating-source relationship and may remain one-way when
the target lies outside a bounded curated shard. `related_document` is generic
and may also remain one-way. A judicial revision-review state of
`relationships_recorded` requires at least one correction, supersession, or
substitution edge; `no_separate_relationship_exposed` forbids those edges.

Relationships never synthesize a normalized status, change badge, legal effect,
or additional relationship. They are retained in detail records with exact
field provenance but excluded from compact indexes and search text.

## Stable IDs

An internal ID is derived by a versioned, source-specific identity rule from
stable official identifiers, then stored as an opaque value. Titles, URLs,
status, dates, and party names are not identity inputs unless the source has no
stable identifier and a reviewed fallback rule explicitly says so. Identity
rules and collision fixtures are versioned. A changed upstream ID creates an
audited alias or supersession, not an unnoticed duplicate.

## Provenance model

`fieldProvenance` is intentionally separate from displayed values so the
normalized record stays compact. Each entry points to one source-derived field
with an exact JSON Pointer and records:

- originating source and source record IDs;
- the exact official source URL;
- retrieval time and source update time when supplied;
- whether the value was copied, normalized, or deterministically mapped;
- the versioned transformation/mapping rule where applicable; and
- validation state and time.

One entry may not stand in for unrelated fields. A source group may share a
retrieval event, but every published source-derived leaf must be covered by an
exact pointer.

## Category membership

Mappings are source-specific configuration, not application logic. A mapping
rule accepts one or more exact official labels and can emit multiple category
and subcategory memberships. It records its rule ID, source, taxonomy version,
and official input labels. Free-text similarity, keyword rules, and AI
classification are invalid public mapping methods.

An official label that has no approved exact mapping leaves the record
`Unclassified`. This is a visible discovery state, not an error and not a
reason to exclude the record.

## Static coverage artifact

Every enabled source has one coverage entry. It keeps three ranges distinct:

- `documentedFrom` and `documentedThrough` describe the reviewed provider
  availability in the source registry;
- `from` and `through` describe the exact window selected for the candidate
  public artifact; and
- `recordFrom` and `recordThrough`, together with `recordCount`, describe the
  publication dates and count of validated records actually present.

All emitted records for one source must carry the same selected range, and each
actual record date must fall inside it. The packager rejects inconsistent or
out-of-bounds ranges. A non-synthetic source with a bounded window is
`limited` even when its refresh health is `healthy`; health and coverage are
different facts. Disabled source identifiers remain absent at every artifact
boundary.

Static artifact budget v1 is measured on the same deterministic UTF-8 JSON
serialization hashed by the manifest. Packaging fails closed before writing if
the compact index exceeds 6 MiB, hashed initial non-detail JSON (the manifest
self-file is excluded) exceeds 8 MiB, any detail exceeds 512 KiB, aggregate
details exceed 128 MiB, or all hashed assets exceed 136 MiB. Validation rejects
over-budget manifest declarations and actual filesystem sizes before reading
artifact asset bodies. The 512 KiB detail guard is a measured pre-release
amendment: the complete July 2026 Federal Register candidate contained one
439,763-byte subject-heavy detail, while the next largest was 168,633 bytes.
Both official-subject schemes and every exact leaf-provenance entry remain in
the record. No record or field is silently dropped to make an artifact fit.

Before parsing, validation requires a regular directory containing exactly the
manifested JSON inventory and its expected directories. Symbolic links,
non-regular entries, extra files, and missing assets fail closed. The manifest
is limited to 4 MiB and 20,000 hashed assets. Last-known-good reuse performs the
same inventory and budget checks, then reads bounded regular-file handles and
requires current schema, registry, taxonomy, policy, source-health, hash, and
compact/detail consistency.

Every enabled non-synthetic source supplies its authoritative refresh health
receipt to packaging. The artifact preserves `failureStage`, retrieval and
data-as-of timestamps, last-known-good use, stale state, record count, and the
neutral public message. A source with no validated current or last-known-good
records is unavailable and contributes no records. Synthetic-only builds may
derive health from their hand-authored records.

The public artifact accepts only coherent source-health combinations:

- `healthy` has current records, successful freshness timestamps, no fallback,
  no failure stage, no stale flag, and no message;
- `degraded` has validated last-known-good records, preserves their successful
  timestamps, and carries fallback, stale, failure-stage, and message fields;
  and
- `unavailable` has zero records, no successful freshness timestamps, no
  fallback, and a stale flag plus a neutral message.

## Versioning

The artifact manifest names the record, taxonomy, mapping, source-registry, and
build versions. Additive compatible changes can increment the minor version.
Current builds emit artifact package `1.4.0`, record schema `1.4.0`, and source
registry `1.19.0`; artifact schema `1.0.0` still accepts historical package
`1.0.0`, `1.1.0`, `1.2.0`, and `1.3.0` shapes for archival schema validation. Package
1.2 added `judicialContext` to the compact-index/detail integrity projection so
court, docket, citation, form, publication, and revision evidence cannot
diverge during hydration. Package 1.3 keeps the compact landmark flag and adds
the reviewed criterion and evidence union to detail records. Package 1.4 adds
the full Accord context to compact/detail integrity. The current client fails
closed on any artifact package or record schema other than `1.4.0` before
record normalization; it does not synthesize judicial, landmark, or Accord
evidence from a legacy package. The current artifact validator likewise
requires the coherent `1.4.0` package/record pair even though the artifact JSON
Schema retains archival compatibility. For current records, client
normalization rechecks judicial invariants, landmark/relevance symmetry and
evidence, and the Accord party/role/date/status/supersession/identity boundary.
A package-1.4 detail must share the loaded manifest build timestamp and exactly
reproduce the compact index projection; CSV and dossier hydration abort on any
mismatch.
Breaking field or meaning changes require a new major schema, migration and
backward-compatibility fixtures, and an explicit decision-register entry.
Historical artifacts are interpreted by matching-version software or an
explicitly tested migration under the versions recorded at build time.
