# Module boundaries for general development

Status: design proposal, 2026-09-22. It follows from the
[general development audit](../audits/2026-09-22-general-dev-audit.md) and is
the document the follow-on refactor session executes from. It changes no code
and authorizes nothing. Executing it requires the owner decisions in
[the realignment decisions file](../decisions/2026-09-22-realignment-open-decisions.md),
chiefly RD-01 (a schema 1.10 ledger representation and its gate) and RD-02 (the
disposition of the two pre-existing uncommitted modifications). The binding
architecture owner remains [`../architecture.md`](../architecture.md); this
file becomes binding only if the owner adopts it and the ledger represents it.

Audit finding IDs (F-xx) and drift IDs (C-x) refer to the audit.

## 1. What the audit forces

| Constraint | Source |
| --- | --- |
| Split files that mix stages. Do not re-home cohesive directories just to make the tree look tidy. | F-05, F-07; most directories are already cohesive (audit 2.1-2.5) |
| Existing paths stay importable. `src/kernel/` imports three pipeline files. The S0 import test pins production paths and the exact `config/*.json` list. Backbone links, scripts and 130+ test files import current paths. | `src/kernel/lifecycle/policy-record-14-validator.ts`; `tests/experimental/spatial/non-interference-imports.test.ts:831-878` |
| K0, S0 and O0 stay byte-identical and outside every module while their convergence gates are closed. | `docs/vision/README.md:21-34`; `ROADMAP.yaml` G-K0-S0-CONVERGENCE, G-O0-CONVERGENCE |
| The Makah demo material stays exactly where it is (owner ruling). | audit section 5 |
| Nationwide coverage needs identifiers, not more hardcoded states. | F-03, F-04, F-11 |
| One boundary guard for geometry, land, ownership, contact and secret keys. | F-09 |
| The interop pathway needs a Nation-free query path and closed profile schemas owned in this repository. | F-12, F-13; audit 4.3 |

## 2. Target shape

```text
                 +-------------------------------+
                 |  core (shared, pure, no I/O)  |
                 |  contracts, corpus v1/v2,     |
                 |  validation, identity, guard  |
                 +-------------------------------+
                   ^            ^             ^
                   |            |             |
      +------------+--+   +-----+--------+  +-+---------------+
      | 1 intake       |  | 2 context    |  | 3 output        |
      | sources, custody|  | jurisdiction |<-| search, views,  |
      | extraction,     |  | taxonomy,    |  | artifact, app,  |
      | normalization,  |  | Nation       |  | workbench,      |
      | replay          |  | evidence,    |  | dossier, CSV,   |
      +----------------+   | temporal     |  | policy.citations|
                           +--------------+  +-----------------+

  composition roots: scripts/*.mjs and src/main.tsx (may import module entries)
  outside every module: src/kernel (K0), src/experimental (S0), src/knowledge,
  and the private-context seam (Makah groundwork, in place)
```

**Dependency rule** (enforced by the boundary test in step GD-02):

1. `core` imports only `core`, `schemas/`, Node built-ins and pinned
   dependencies.
2. `intake` imports `core` and `intake`.
3. `context` imports `core` and `context`.
4. `output` imports `core`, `context` (read-only association results and pure
   relevance functions) and `output`.
5. No module imports `src/kernel/`, `src/experimental/`, `src/engine/index.ts`
   (the barrel re-exports the private seam) or any private-seam file.
6. Composition roots may import any module's public entry. Data moves between
   modules only through core types; a module never reaches into another
   module's internals.

**Membership model.** A module is a declared set of paths plus the rule above.
It is not necessarily one directory. New and split-out code goes into
`src/modules/intake/`, `src/modules/context/`, `src/modules/output/` and
`src/core/`. Existing cohesive directories join a module in place: moving
`src/adapters/` would break about 40 test imports and buy nothing. The manifest
(`tests/architecture/module-manifest.mjs`, written in GD-02) lists in-place
members explicitly and classifies the four new directories by prefix, so later
steps add files without editing the manifest.

**Shim policy.** When a file is split, its old path keeps a thin re-export
(`export * from`, with a matching `.d.mts` for `.mjs` files) so that scripts,
tests, backbone links and pinned tests keep resolving. Shims imported by
`src/kernel/` stay for as long as G-K0-S0-CONVERGENCE is closed. Other shims
can be removed later, in a reviewed step that also updates their importers.

**Outside every module:**

- K0 `src/kernel/**` and S0 `src/experimental/**`: untouched.
- `src/knowledge/**`: repository tooling.
- The **private-context seam**, kept in place by owner ruling:
  `src/engine/land-boundary-contracts.ts`, `land-parcel-contracts.ts`,
  `parcel-query.ts`, `authorized-private-context-adapter.ts`,
  `citation-export-contracts.ts`, and their schemas, fixtures and tests. It may
  import `core` types (it already imports `src/shared/contracts.ts`). No module
  may import it. It exists for a future Tribe-owned private deployment
  (audit 4.4, Design B).

## 3. Core (shared)

In-place members: `src/shared/contracts.ts`, `src/engine/contracts.ts`,
`src/pipeline/{identity,hashing,policy-validation,source-registry,analyzed-corpus,analyzed-corpus-v2,policy-assurance}.mjs`
and their `.d.mts` files, and `schemas/**`.

New in GD-04: `src/core/boundary-guard.mjs` (with `.d.mts`). It exports one
normalized protected-key set, the union of the geometry, land-status,
ownership, personal-contact and secret families found in
`src/pipeline/policy-validation.mjs:48-72`,
`src/engine/land-boundary-contracts.ts:39-93` and
`src/engine/citation-export-contracts.ts:49-86`, plus `landStatus`, `apn`,
`parcelNumber` and `shapefile`. It also exports `rejectProtectedKeys(value)`.
`policy-validation.mjs` adopts it; the private-seam files keep their own lists
unchanged.

Core has no I/O. The v2 corpus parser is already browser-safe (the workbench
imports it), so classifying it as core makes the engine-to-pipeline and
app-to-pipeline edges (F-08) legal without moving the file.

GD-08 transitive dependency amendment (2026-10-07): the complete import-free
public declaration block in `src/app/types.ts` moves unchanged to
`src/core/public-app-types.ts`. The old path explicitly re-exports all 21 type
names. Context relevance imports its three types directly from core, avoiding
a forbidden context-to-output type edge. This is a mechanical relocation:
declarations, artifact versions, required `SearchCriteria.nationId`, signatures
and every legacy importer remain unchanged. Existing core record types are
different contracts and are not substituted. The manifest and allowlist need
no change because the new file follows the existing core prefix rule.

GD-06 transitive dependency amendment (2026-10-07): unchanged pure
`safeFile`, `assertProfileBindings` and `assertCaptureBindings` move from
intake replay into `src/core/local-output-bindings.mjs` with declarations.
Intake imports and re-exports their bindings. Core retains no I/O or non-core
dependency; canonicalV2Digest comes from the reviewed core corpus terminal.
This promotion avoids an output-to-intake helper edge.

## 4. Module 1: intake

**Purpose.** Federal, state and Tribal source ingestion, source-agnostic enough
to scale nationwide: a source is a catalog row plus, where unavoidable, a small
source-specific plugin. It is never new engine code.

| Contract | Definition |
| --- | --- |
| Accepts | (a) `SourceDescriptor` rows from a source catalog: id; authority class (`federal`, `state`, `tribal_government`, `county`, `intergovernmental`); publishing jurisdiction as a `JurisdictionRef` (section 5); interface kind (`api`, `html`, `pdf`, `xml`); hosts and path prefixes; `review {reviewer, reviewedAt, expiresAt, evidenceUrls}`; `uses`; cadence; credential requirement (always `none` while EXT-CREDENTIALS is closed). This generalizes the profile shape `validateManifest` already enforces (`src/pipeline/policy-custody.mjs:327-386`). (b) An `OperationManifest` (the existing v2 manifest `1.0.0`). (c) Provider bytes through the bounded transport only. |
| Emits | Immutable objects and ledger receipts (existing custody); extraction renditions; source facts normalized into `AnalyzedCorpus 2.0` works, versions and segments with field provenance and **no** context association; `SourceHealth` and coverage rows; for the retained family, `PolicyRecord 1.4` from `PublicSourceAdapter`. |
| Must never see | Interop requests (a query never starts acquisition: `NO_SAVE...md:386-388`); geometry, parcels, land status, ownership, or private or Nation-supplied material (EXT-PRIVATE, G-G); credentials (EXT-CREDENTIALS); taxonomy or Nation-association decisions (`docs/architecture.md:1011-1014`); output formatting. |

In-place members: `src/adapters/**`, `src/contracts/**`,
`src/pipeline/{source-adapter.ts,policy-custody.mjs,corpus-store.mjs,policy-text.mjs,policy-corpus-builder.mjs,curated-document-pack.mjs,synthetic-corpus-path.mjs}`,
`src/engine/{source-pack,source-pack-contracts,real-source-lifecycle,real-source-lifecycle-contracts}.ts`,
`config/{sources.v1.json,policy-sources.v2.mjs,policy-text-selections.mjs,local-corpus.v1.mjs}`.
The Makah factory stays in `config/policy-sources.v2.mjs` by owner ruling.
Future Tribe-specific manifests are deployment input from private repositories.

Moves and splits:

| From | To | Step |
| --- | --- | --- |
| `replayReviewedCorpus` (`src/pipeline/policy-local-output.mjs:116-203`) and its helpers `readOwnedFile`, `assertProfileBindings`, `assertCaptureBindings` | `src/modules/intake/replay.mjs` (`.d.mts`); old path re-exports | GD-05 |
| `src/pipeline/policy-broad-discovery.mjs` (whole file, Washington-specific) | `src/modules/intake/sources/washington-legislature/discovery.mjs`; old path becomes a shim | GD-05 |
| none (new) | `src/modules/intake/source-catalog.mjs` plus schema `schemas/source-catalog.schema.v1.json`; catalog rows are data under `fixtures/` for synthetic tests. A JSON file under `config/` would change the S0 test's pinned list, so catalog data lives in `.mjs` or under `fixtures/`. | GD-12 |

Untangle first:

1. Characterize replay, write and read with tests (GD-01). Today they have no
   direct test (F-17).
2. The owner disposes of the pre-existing edit to `readOwnedFile`, which is in
   the function being moved (RD-02).

Extraction order: GD-01 → GD-05 → GD-12.

## 5. Module 2: geographic and context association

**Purpose.** Links policy to geographic entities, topics and (only on exact
evidence) Nations, at the level the land-data boundaries allow. It never
handles restricted geometry or parcels.

**Identifiers accepted in place of geometry** (the `JurisdictionRef` model
built in GD-09):

| Kind | Identifier form | Authority for the identifier |
| --- | --- | --- |
| Federal | `us` | fixed |
| State or territory | `us-state:<USPS code>`, carrying the two-digit FIPS alongside | published USPS/FIPS code lists; all 50 states, DC and territories, **not** an enum of three |
| County or equivalent | `us-county:<5-digit FIPS>` | published county FIPS list |
| Tribal government | `nation:<slug>` | only as the subject of exact official-source evidence under the existing Nation rules; the slug set is bound to the recognition notice and waits on G-BIA-IDENTITY. Never derived from a location. |
| Intergovernmental or regional body | `body:<slug>` with its member `JurisdictionRef`s as source-stated evidence | the body's own official publication |

Never accepted: coordinates, bounding boxes, polygons, WKT/WKB/GeoJSON, shapefile
bundles, parcel IDs or APNs, ownership, land status, AIANNH or LAR geometry, or
any Nation inferred from a map. The boundary guard (GD-04) rejects these keys
at every intake point of this module.

| Contract | Definition |
| --- | --- |
| Accepts | A validated corpus (v2) or `PolicyRecord` set from core; governed catalogs: the `JurisdictionRef` registry, the taxonomy bundle and official-label source mappings (`config/taxonomy.v1.json` `sourceMappings`, PNW-04 engine), the identity/authority bundle (Run 2), the geography/rights catalog (PNW-03); reviewed research inputs. |
| Emits | `JurisdictionAssociation {recordRef, jurisdictionRef, basis: issuing_authority or source_stated_scope, evidence {url, locator}, reviewState}`; `TaxonomyAssignment {recordRef, conceptId, basis: official_subject_label_mapping, ruleId, taxonomyVersion}`, with `Unclassified` when unmapped; Nation associations only on the existing exact-evidence rules; pure relevance functions (`whyShown`) with `general_jurisdiction` as the default; temporal relationships and version comparisons. |
| Must never see | Geometry, parcels, land status, ownership, private context (the private seam is not importable), inbound interop provenance, AI output. |

In-place members:
`src/engine/{geography-rights,geography-rights-contracts,taxonomy,taxonomy-contracts,identity-authority-scenarios,identity-authority-scenarios-contracts}.ts`,
`src/engine/temporal-operations.mjs` (`.d.mts`),
`src/pipeline/nation-collection-policy.mjs` (`.d.mts`), `config/taxonomy.v1.json`,
`config/policy-gold.v1.mjs`.

Moves and splits:

| From | To | Step |
| --- | --- | --- |
| `recordEventDate`, `whyShownFor`, `recordAvailableForNation` (`src/app/policy.ts:9-85`) and their public app type dependency | `src/modules/context/relevance.ts`; unchanged complete declarations move from `src/app/types.ts` to `src/core/public-app-types.ts`. Both old app paths retain explicit re-exports, so the S0-pinned policy path and every importer stay valid | GD-08 |
| `resolvePolicyResearchReview`, `enrichPolicyCorpus` and their closed-shape helpers (`src/pipeline/policy-research-output.mjs:8-241`) | `src/modules/context/research-review.mjs`; old path re-exports | GD-07 |
| none (new) | `src/modules/context/jurisdiction/{registry,association}.ts`, `schemas/jurisdiction-ref.schema.v1.json`, synthetic registry fixture | GD-09 |
| none (new) | v2 jurisdiction association: an additive corpus successor (`AnalyzedCorpus 2.1`) with `work.jurisdictionRefs[]`, each with evidence; `governmentContext` retained as source text | GD-11 |

Untangle first:

1. Split relevance from filtering in `src/app/policy.ts`. Filtering
   (`filterRecords`, `recordMatchesPolicy`) is output; relevance is context.
2. Remove the hard WA/OR/ID filter from relevance input. The filter at
   `src/app/data.ts:156` belongs to the retained public contract and changes
   only with GD-13.

Extraction order: GD-08 and GD-07 (parallel) → GD-09 → GD-11 and GD-14.

## 6. Module 3: output and formatting

**Purpose.** Retrieval and presentation over an analyzed corpus: dossiers,
exports, the existing output adapters, and the `policy.citations/1` payload.

| Contract | Definition |
| --- | --- |
| Accepts | A verified corpus handle from core or intake replay; association results and relevance functions from context; for interop, a `policy.search-context/1` request (validated here, section 8); source health and coverage. |
| Emits | The public synthetic artifact and app (existing); CSV (`src/app/csv.ts`, formula-neutralized); print dossier; local workbench files and the loopback server on `127.0.0.1` (existing narrow contract); research HTML and JSON; persona/deployment projections; `policy.citations/1` artifacts (GD-16). |
| Must never see | Provider transport or custody writes (it reads a verified handle); raw provider bytes except through replayed renditions; geometry, parcels, land status or ownership; the private seam. `CitationExport`'s `parcel` scope (`src/engine/citation-export-contracts.ts:139-146`) is never reused for interop (audit 4.3, NC-6). |

In-place members: `src/app/**`, `src/main.tsx`,
`src/pipeline/{artifact,artifact-health,last-known-good}.mjs`,
`src/engine/projection.ts`, `src/engine/policy-search.mjs` (`.d.mts`).
Composition roots that use it: `scripts/{build-synthetic-artifact,validate-artifact,build-policy-local,serve-policy-local,replay-policy-corpus,simulate-policy-source-failure,verify-policy-browser,evaluate-policy-discovery,measure-engineering}.mjs`.

Moves and splits:

| From | To | Step |
| --- | --- | --- |
| `localCorpusBytes`, `validateLocalOutputFiles` | `src/modules/output/local-workbench/write.mjs` with declarations | GD-06 |
| `writeLocalOutput`, `readLocalOutput` custody orchestration | Import-safe composition `scripts/policy-local-output.mjs` with declarations | GD-06 |
| `safeFile`, `assertProfileBindings`, `assertCaptureBindings` from intake replay | `src/core/local-output-bindings.mjs` with declarations; intake preserves re-exports | GD-06 |
| `simulateLocalSourceFailure`, `checksumOutputSnapshot` | `src/modules/output/local-workbench/failure-simulation.mjs` with declarations | GD-06 |
| `createLoopbackOutputServer`, `contentType` (`:644-700`) | `src/modules/output/local-workbench/loopback-server.mjs` | GD-06 |
| After GD-05 and GD-06 | `src/pipeline/policy-local-output.mjs` becomes a pure re-export shim | GD-06 |
| `buildPolicyResearchOutput`, stylesheet, `page` and the escape helpers (`src/pipeline/policy-research-output.mjs:42-59, 243` onward) | `src/modules/output/research-html.mjs` | GD-07 |
| none (new) | `src/modules/output/interop/{search-context,citations}.ts`, `schemas/interop/policy-search-context.schema.v1.json`, `schemas/interop/policy-citations.schema.v1.json`, `tests/interop/` | GD-16 |

Untangle first:

1. Replay leaves this file for intake (GD-05), so output consumes a verified
   corpus rather than re-running extraction.
2. HTML rendering leaves analysis (GD-07).
3. A Nation-free general-jurisdiction query entry for interop (GD-16) that does
   not require `SearchCriteria.nationId` (`src/app/types.ts:341`).

GD-06 preserves the complete existing function bodies and error strings.
Writer/reader remain custody callers in composition; actual sealed replay and
reader cleanup remain intake operations. Composition performs no top-level
execution, listener creation, acquisition or root lookup. Output receives the
existing inert run metadata shape `{root, owner, ledger, manifest}`, reads
owner/profile/receipt bindings and ignores root; it receives no custody callback.
This is not a new nominal verified-handle contract. A scoped transitive guard
covers all three new output modules and declarations, follows core/unclassified
intermediates and rejects intake, composition, legacy-shim and computed loading
bypasses. Only the reviewed existing corpus-validator and hashing terminals
stop traversal; the broader retained boundary cleanup remains GD-10.
The exact 18-path ownership manifest is in the autonomous run record.

Extraction order: GD-05 → GD-06; GD-07 in parallel; GD-16 last and gated.

## 7. Ecosystem map

The three sibling repositories were mapped read-only. Their raw reports are
kept outside the repository at
`C:\dev\_scratch\policy-sentinel-audit\sibling-*.md`. None of them has an
implemented interop path to Policy Sentinel today.

### 7.1 land-use-analyzer (`I:\land-use-analyzer`, HEAD `8550853`, branch `codex/interop-protocol-2026-09-15`; canonical for interop)

- **Would send.** Nothing today. No code derives search criteria from a
  selection. Its only outbound interop payload, `lua.selection/1`, carries
  `prop_id`s, owner and tenure fields and a viewport bbox, and is restricted to
  the GeoBase target (`webapp\src\lib\interop\validation.ts:113-119`). Under
  Design A it would send `policy.search-context/1` built from a user-chosen
  public topic search, independent of any area of interest.
- **Would consume.** `policy.citations/1` for display only. The design keeps
  arbitrary policy bodies out of land-use-analyzer intake (`NO_SAVE...md:312-315`,
  per the mapper).
- **Shareable.** The wire schema `docs\schemas\atni_climate_interop_v1.schema.json`
  (draft-07), the error codes and LIMITS in `webapp\src\lib\interop\protocol.ts`,
  and the bounded JSON parser. No publishable package exists; pin copies of the
  bytes instead (IO guide section 7).
- **Recommended changes there.**
  1. Closed `definitions` for both policy profiles, with enumerated filters,
     bounded free text and an explicit corpus identity.
  2. A `policy_search` permitted use and an audience field, or keep refusing
     the route.
  3. Restrict the `interop.synthetic/1` probe's free numeric `values` from
     policy targets.
  4. Target-restrict `selection.evaluate` headers.
  5. A land-use-category to Policy Sentinel taxonomy crosswalk, owned by
     land-use-analyzer.
  6. Negative fixtures for minimum scenario 4.
- **Second copy.** `C:\dev\land-use-analyzer` (`c4b502d`, `main`) is an older
  checkout with no interop layer.

### 7.2 TCR-policy-scanner (canonical `I:\TCR-policy-scanner`, HEAD `59b02c4`; legacy `C:\dev\TCR-policy-scanner`, HEAD `f0908716`)

- **Would send.** A search context generated from `data\program_inventory.json`
  (program keywords, search queries, CFDA numbers, agencies) and a scan window.
- **Would consume.** `policy.citations/1` in the successor's downstream family.
  The successor put policy matching out of scope and did not port the legacy
  scanner (`I:\...\docs\migration-ledger.yaml:502`, per the mapper), so Policy
  Sentinel would fill that gap.
- **Shareable.** The successor keys five Nations as `tcr.nation:<slug>` bound to
  the recognition notice: FR Doc. 2026-01899, 91 FR 4102, locators
  "91 FR 4103: ..." (`I:\TCR-policy-scanner\src\tcr_policy_scanner\geography\evidence.py`,
  verified). This matches Policy Sentinel's evidence rule and is the best
  candidate for a shared notice-bound Nation reference. Also shareable: the
  provenance chain `ProvenanceRecord`.
- **Must not reach Policy Sentinel.** The legacy copy derives Nation links from
  geometry and fuzzy names: congressional delegation by area overlap, awards and
  plans by fuzzy match (per the mapper). None of those may be sent as a Nation
  criterion.
- **Recommended changes there.** Consume `policy.citations/1`; never send
  geography-derived Nation IDs; map `source_id`, `url` and `cfr_references` onto
  citation fields; keep ranking downstream.

### 7.3 plan-assessor (`I:\cap-assessor`, HEAD `1e512a5`, branch `phase-b/m1-port`; `pilot\` never accessed)

- **Would send.** Only `TribeRef` plus `PlanGap` today, into an inert stub.
  `PolicySentinelAdapter.status()` always returns unavailable and every method
  returns empty (`src\cap_assessor\policy\adapters\policy_sentinel.py:37-67`,
  verified). Recommended: a search-context builder from gap codes, plan domains
  and `GeoContext` codes (states, BIA region), using T0/T1 material only.
- **Would consume.** A new `get_citations(context)` returning a
  `PolicyCitation` with locator, why-shown, source health and coverage.
  `PolicyMatch` cannot carry these today (per the mapper).
- **Conflict to resolve there.** `docs\integration-policy-sentinel.md:58` plans
  to bypass Policy Sentinel's `can_export()` gate (verified). That contradicts
  the interop profile and must be retired.
- **Shareable.** The 575-slug registry with FR provenance and `citation-anchor-v1`
  (hash-pinned locator), per the mapper.

### 7.4 Shared-contract recommendations

| Contract | Proposal | Owner |
| --- | --- | --- |
| Interop wire and profile schemas | Pinned, digest-checked copies in each consumer; profile definitions authored once (land-use-analyzer is the spec owner) | land-use-analyzer spec; Policy Sentinel pins |
| Notice-bound Nation reference | `nation:<slug>` plus FR doc number plus per-entry locator, as in the TCR successor. Adopt only after G-BIA-IDENTITY. | each repository; Policy Sentinel owner decision |
| `JurisdictionRef` | `us`, `us-state:<USPS>`, `us-county:<FIPS>` (section 5) | Policy Sentinel |
| Citation locator | Map Policy Sentinel v2 segment byte locators to plan-assessor `CitationAnchorV1` fields | later interop work |

## 8. Interop conformance

No schema for either profile exists in `schemas/` or anywhere else. Both are
reserved enum values in the land-use-analyzer wire schema
(`atni_climate_interop_v1.schema.json:15-28`), defined only in prose
(`ATNI_CLIMATE_NO_SAVE_INTEROPERABILITY_2026-09-15.md:365-390`), and rejected by
`webapp\src\lib\interop\validation.ts:113`. "Implemented" below means the
Policy Sentinel data or function exists. No adapter maps it yet.

### 8.1 Inbound `policy.search-context/1`

| Field (prose or envelope) | Status | Policy Sentinel location or note |
| --- | --- | --- |
| Profile id `policy.search-context/1` | missing | No schema in `schemas/`; to be pinned at `schemas/interop/policy-search-context.schema.v1.json` (GD-16) |
| Corpus identity (public synthetic or reviewed local) | missing | Required by "validate against the specific public or reviewed local workbench model" (`NO_SAVE...md:370-371`); not carried by any field |
| Topic/category IDs | partial | Public: `SearchCriteria.categoryIds`/`subcategoryIds` (`src/app/types.ts:343-344`), matched by `recordMatchesPolicy` (`src/app/policy.ts:87-107`). Local: every work is `Unclassified` (`schemas/analyzed-corpus.schema.v2.json:588-590`), so no topic can match. |
| Source IDs | partial | Public: `SearchCriteria.sources` (`src/app/types.ts:349`). Local: a single `sourceProfileId` (`src/engine/policy-search.mjs:335, 368`). |
| Date bounds | partial | Public: `dateFrom`/`dateThrough` over `recordEventDate` (`src/app/types.ts:351-352`; `src/app/policy.ts:148-156`). Local: `asOf` plus `basis` (`src/engine/policy-search.mjs:338-352`) with different semantics. |
| Explicit text search | partial | Public: `query` against `searchText` (`src/app/policy.ts:122, 135`). Local: `query` up to 2000 characters (`src/engine/policy-search.mjs:326-330`). No guard against coordinate-, APN- or bbox-shaped text (NC-1). |
| Caller-selected general-jurisdiction criteria | partial | Public: `jurisdictions` are name strings (`src/app/types.ts:346`) and `stateCode` is limited to WA/OR/ID. Local: exact-string `governmentContext` (`src/engine/policy-search.mjs:336, 370`). No identifier model (GD-09, GD-11). |
| Nation criterion | missing (by design) | Version 1 carries none (NC-3). `SearchCriteria.nationId` is required (`src/app/types.ts:341`), so a Nation-free path is needed (NC-4). |
| Filters Policy Sentinel has but the profile does not list (`documentTypes`, `statuses`, `relevanceBases`, `sort`, `allPolicyAreas`, `instrumentClass`) | not in profile | These must be rejected as unsupported, not silently accepted (IO guide section 7) |
| Prohibited fields (parcel IDs, coordinates, bbox, ownership, land status, map-inferred Nation, attachments carrying them) | missing | No request validator exists. The record guard (`src/pipeline/policy-validation.mjs:48-72`) covers records, not requests. GD-04 builds the shared guard. |
| Envelope `classification {scheme, label, permitted_use, synthetic, mapped_lua_tier}` | missing | Refusal rule NC-5 |
| Envelope `provenance {source_app, adapter_version, native_schema, source_artifacts, source_as_of, transformations}` | missing | Must be verified and never retained or echoed (NC-5) |
| Manifest `sha256`, verified before parse | partial | Digest utilities exist (`src/pipeline/hashing.mjs`, `src/pipeline/policy-custody.mjs:45`); nothing verifies an interop artifact |
| Error codes `UNSUPPORTED_PROFILE`, `INVALID_PAYLOAD`, `PURPOSE_NOT_ALLOWED`, `TIER_NOT_ALLOWED`, `OUT_OF_COVERAGE`, `NOT_READY`, `INTEGRITY_MISMATCH` | missing | Codes defined in the land-use-analyzer wire schema; IO guide section 2 table |
| Capabilities (two profiles, `storage: memory_only`) | missing | IO guide section 6 |

### 8.2 Outbound `policy.citations/1`

| Field | Status | Policy Sentinel location or note |
| --- | --- | --- |
| Record IDs | implemented (data) | Public `internalId`; v2 work and version IDs (`schemas/analyzed-corpus.schema.v2.json:522-526`) |
| Official titles where allowed | partial | Public `officialTitle`; v2 `work.title` with field provenance; "where allowed" depends on source `uses` (`config/policy-sources.v2.mjs:10-17`) and has no projection rule yet |
| Source IDs and URLs | implemented (data) | Public `record.source.id`, `officialSource`; v2 `sourceProfileId`, capture URLs |
| Dates | implemented (data) | Public `recordEventDate` (`src/app/policy.ts:9-16`); v2 dated events with precision |
| Citation and evidence locators | partial | Public: judicial citations only (`src/app/csv.ts:119-120`). v2: segment byte locators and `replayCorpusCitation` (`src/pipeline/analyzed-corpus-v2.mjs:1347`). |
| Why-shown | partial | Public `whyShownFor` (`src/app/policy.ts:18-57`) is Nation-scoped. v2 relevance is fixed at `general_jurisdiction`. |
| Source health | implemented (data) | `SourceHealth` (`src/shared/contracts.ts:240`); CSV health columns (`src/app/csv.ts:88-92`); v2 `coverage` rows (`schemas/analyzed-corpus.schema.v2.json:1252-1264`) |
| Native schema identifier | implemented (data), not emitted | `ANALYZED_CORPUS_V2_SCHEMA_ID` (`src/pipeline/analyzed-corpus-v2.mjs:6`); `PolicyRecord 1.4` schema ID |
| Coverage limitations | partial | Public manifest coverage; v2 coverage catalog; the CSV has no coverage-limitation column (`src/app/csv.ts:27-95`) |
| Hydration through the verified path | implemented | Public `loadRecordDetail` (`src/app/data.ts:1454`); local `parseAnalyzedCorpusV2` |
| CSV formula neutralization | implemented | `neutralizeSpreadsheetFormula` (`src/app/csv.ts:3`) |
| `classification.synthetic` preserved | partial | Public `ArtifactManifest.synthetic` (`src/app/data.ts:1190`); v2 `trustDomain`; no mapping yet |
| Artifact manifest (`artifact_id`, `sha256`, `byte_length`, `media_type`, `suggested_name`, `native_schema_version`, `provenance`, `limitations`) | missing | GD-16 |
| Readiness (`complete`, `partial`, `not_analyzed`, `unavailable`, `synthetic_only`) | missing | Needs a mapping from source health and coverage; a zero-result query must still report readiness |
| Reuse of `CitationExport 1.0.0` | not applicable | Private-only contract with a `parcel` scope (`src/engine/citation-export-contracts.ts:139-146`); must not be reused (NC-6) |

## 9. Refactor handoff

The refactor session starts here. Preconditions (owner, see the decisions file):

- RD-01: a schema 1.10 ledger representation with gate G-GENERAL-DEV-01
  approved. The fragment in 9.4 is dependency-checked.
- RD-02: the two pre-existing modifications are committed by their owner or
  discarded.
- RD-03: a resolution of the backbone gate failure caused by
  `.local/handoff/HANDOFF.md`.

Standing checks at every step: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm run validate:roadmap`, `npm run validate:backbone`,
`npm run scan:source`, and `npm run build` (which runs `validate:artifact`).
These must stay green, together with
`tests/engine/makah-demo-non-interference.test.ts` and
`tests/experimental/spatial/non-interference-imports.test.ts` (both part of
`npm test`). Commit once per step.

### 9.1 Steps in dependency order

| Step | Depends on | Files it owns | Tests that must stay green (beyond the standing checks) | Tests written first |
| --- | --- | --- | --- | --- |
| GD-01 characterization tests | GD-00 | `tests/pipeline/policy-local-output-replay.test.mjs` (new), `package.json` (register it in `test:policy`) | `npm run test:policy`, `npm run test:assurance` | This step is the tests: replay, write, read and `localCorpusBytes` over a synthetic run root built with `initializePolicyRun` and `admitPolicyTargets` |
| GD-02 module boundary test | GD-00 | `tests/architecture/module-manifest.mjs`, `tests/architecture/module-boundaries.test.ts` (both new); extend the scan in `tests/engine/makah-demo-non-interference.test.ts:229-250` to `src/modules/**` and `src/core/**` | `tests/engine/makah-demo-non-interference.test.ts` | This step is the test. It starts in report mode with an explicit allowlist of today's violations (audit 2.6) |
| GD-03 boundary guard tests | GD-00 | `tests/core/boundary-guard.test.ts` (new) | none beyond the standing checks | The union of the three key lists plus `landStatus`, `apn`, `parcelNumber`, `shapefile`, rejected at any depth |
| GD-04 core boundary guard | GD-03 | `src/core/boundary-guard.mjs` and `.d.mts` (new), `src/pipeline/policy-validation.mjs` | `npm run test:artifact` (direct artifact, LKG and Nation suites), `tests/app/data-integrity.test.ts`, `npm run build` | GD-03 |
| GD-05 intake replay and discovery | GD-01, GD-02, RD-02 | `src/modules/intake/replay.mjs` and `.d.mts`, `src/modules/intake/sources/washington-legislature/discovery.mjs`, `src/pipeline/policy-broad-discovery.mjs` (to a shim), `src/pipeline/policy-local-output.mjs` (replay moved out, shim export added) | `npm run test:policy`, `npm run test:assurance`, GD-01 | GD-01 |
| GD-06 output local-workbench split | GD-05 | Three output module/declaration pairs, core binding pair, intake replay pair, composition pair, legacy shim/declaration pair; exact 18-path ownership in the autonomous run record | Local-output/replay identity tests, scoped transitive boundary test, unchanged assurance reader cases, GD-01 and full required checks | GD-01 |
| GD-07 research output split | GD-02 | `src/modules/context/research-review.mjs`, `src/modules/output/research-html.mjs`, `src/pipeline/policy-research-output.mjs` (to a shim) | `tests/pipeline/policy-research-output.test.mjs` | none; the existing five tests cover both halves |
| GD-08 context relevance extraction | GD-02 | `src/modules/context/relevance.ts` and `src/core/public-app-types.ts` (new), `src/app/policy.ts` and `src/app/types.ts` (explicit re-exports; remaining policy bodies unchanged) | `tests/app/policy.test.ts` (binding identity plus retained cases), unchanged `tests/app/csv.test.ts` and `tests/app/accessibility.test.tsx` | none; `tests/app/policy.test.ts` covers the moved functions |
| GD-09 jurisdiction identifier model | GD-02 | `src/modules/context/jurisdiction/{registry,association}.ts`, `schemas/jurisdiction-ref.schema.v1.json`, `fixtures/context/jurisdiction-registry.synthetic.valid.json`, `tests/context/jurisdiction*.test.ts` (all new) | backbone schema-ID check | This step's own schema and negative tests |
| GD-10 boundary enforcement | GD-04, GD-06, GD-07, GD-08 | Exact 50-path production/test closure in the GD-10 handoff: pure factories, composition, named compatibility facades and enforcing graph harness | Focused affected suites, strict graph/private reachability and complete required checks | Exact-facade and transitive-loader regression graphs |
| GD-11 v2 jurisdiction association | GD-09, GD-10 | an additive `AnalyzedCorpus 2.1` schema and runtime, `src/modules/context/jurisdiction/association.ts`, tests | `npm run test:policy`, `tests/pipeline/analyzed-corpus-v2.test.mjs`; the sealed 2.0 corpus must still replay unchanged | 2.0 replay compatibility test |
| GD-12 nationwide source catalog | GD-05, GD-09 | `src/modules/intake/source-catalog.mjs`, `schemas/source-catalog.schema.v1.json`, synthetic catalog fixture, tests | `npm run test:policy` | catalog schema negative cases; manifest-from-catalog equivalence with `initialDirectManifest` |
| GD-13 nationwide record contract | GD-09, GD-10, gate G-GD-NATIONWIDE-CONTRACT (RD-05) | record, artifact and source schema successors (state enum replaced by `JurisdictionRef`), `src/app/data.ts:156`, `src/pipeline/nation-collection-policy.mjs:4`, migration fixtures | all artifact and app suites, `npm run build` | migration and compatibility fixtures first |
| GD-14 federal taxonomy source mappings | GD-08, GD-10 | `config/taxonomy.v1.json` `sourceMappings` (synthetic labels first), context mapping function, tests | `tests/engine/taxonomy*.test.ts`, foundation validation | mapping provenance and `Unclassified` fallback tests |
| GD-15 architecture documents | GD-10 | `docs/architecture.md` (including the C-3 wording), `docs/PROJECT-BACKBONE.md`, `docs/data-contract.md` | `npm run validate:backbone` | none |
| GD-16 interop pure adapter | GD-06, GD-08, GD-09, GD-10, gate G-GD-INTEROP (RD-06) | `src/modules/output/interop/*`, `schemas/interop/*`, `tests/interop/*` | everything above | minimum scenario 4 negatives first (IO guide section 7) |

### 9.2 Parallel groups (no overlapping files)

- **Wave 1:** GD-01, GD-02 and GD-03 in parallel. Only GD-01 touches
  `package.json`.
- **Wave 2** (after wave 1): GD-04, GD-05, GD-07, GD-08 and GD-09 in parallel.
  Their file sets are disjoint. GD-05 alone touches
  `src/pipeline/policy-local-output.mjs`.
- **Wave 3:** GD-06 (after GD-05), then GD-10 (after GD-04, GD-06, GD-07 and
  GD-08).
- **Wave 4:** GD-11, GD-12, GD-14 and GD-15 in parallel. GD-13 and GD-16 run
  when their gates open.

The manifest classifies `src/modules/*` and `src/core/` by prefix, so wave 2
steps never edit it. Only GD-02 and GD-10 do.

GD-10 production closure amendment (2026-10-07): all 16 audit exceptions
remain substantive after GD-04/06/07/08; changing the harness label alone
cannot satisfy enforcement. The binding exact 50-path source/test manifest is
[the GD-10 contract](../handoffs/2026-10-07-gd10-boundary-enforcement.md).
Pure corpus/profile factories stay in core; context factories receive explicit
configuration, synthetic/source-pack orchestration stays in composition and
configured refresh wrappers retain mandatory validation and existing APIs.
The curated intake caller receives its canonical parser from composition.
Three refresh-result types move unchanged to core; retained LKG runtime,
configuration, sealed 2.0, private/K0/S0/O0 and measurement pins stay untouched.

Existing module classification remains binding. Recognize only the three
exact TypeScript composition roots named in the handoff, alongside existing
scripts/*.mjs roots. Exact legacy facades permit only reviewed named export
bindings; substantive implementations cannot reach configured composition
through those facades or an unclassified intermediary. Source/declaration
resolution, import types, loader aliases and public/private traversal are
enforced with a shared pure graph helper and substantive negative cases.
Capability scans cover relocated implementations and configured roots.
The amendment changes no source qualification, identity, private-data,
publication, observer eligibility or release gate. Section 9.3 stays binding.

### 9.3 Stop conditions for the refactor session

Stop and report if any of the following would happen:

- a step changes a byte under `src/kernel/`, `src/experimental/`, a private-seam
  file, `docs/vision/`, or a K0/S0/O0 contract;
- a pinned test (S0 import list, Makah non-interference) can pass only by
  weakening it;
- a new JSON file is needed under `config/`, which would change the S0 test's
  pinned list;
- the sealed 2.0 corpus stops replaying byte-identically;
- any step would add a network call, a source activation or a land field.

### 9.4 Proposed schema 1.10 ledger fragment (not applied)

Represented at schema 1.10 on 2026-09-24 (commit `3499feb`), admitted by rule
under D-071; see `ROADMAP.yaml`. This fragment was checked with a
scratch script that applies the validator's generic dependency and gate rules
(`scripts/validate-roadmap.mjs:562-749`) in two states. With
G-GENERAL-DEV-01 closed, every GD item except GD-00 is `blocked`. With it
approved, GD-01 through GD-03 are `ready`, GD-13 and GD-16 stay `blocked` on
their own gates, and the rest are `not_started`. Both states pass (log
`C:\dev\_scratch\policy-sentinel-audit\p2-proposed-graph-check.log`). Applying
it needs a validator extension that admits exactly these identities, following
the 1.7, 1.8 and 1.9 pattern (RD-01).

| ID | Priority | Title | Dependencies | Gate | Status after approval |
| --- | --- | --- | --- | --- | --- |
| GD-00-REALIGNMENT-AUDIT-DESIGN | 310 | Realignment audit, module design and planning realignment | none | none | complete (this session's commits) |
| GD-01-CHARACTERIZATION-TESTS | 311 | Characterization tests for local-output replay/write/read | GD-00 | G-GENERAL-DEV-01 | ready |
| GD-02-MODULE-BOUNDARY-TEST | 312 | Module manifest and import-rule test (report mode) | GD-00 | G-GENERAL-DEV-01 | ready |
| GD-03-BOUNDARY-GUARD-TESTS | 313 | Shared boundary-guard tests | GD-00 | G-GENERAL-DEV-01 | ready |
| GD-04-CORE-BOUNDARY-GUARD | 314 | Core boundary guard adopted by record validation | GD-03 | G-GENERAL-DEV-01 | not_started |
| GD-05-INTAKE-REPLAY-AND-DISCOVERY | 315 | Replay and Washington discovery moved into intake | GD-01, GD-02 | G-GENERAL-DEV-01 | not_started |
| GD-06-OUTPUT-LOCAL-WORKBENCH-SPLIT | 316 | Local-workbench writer, server and failure simulation split into output | GD-05 | G-GENERAL-DEV-01 | not_started |
| GD-07-RESEARCH-OUTPUT-SPLIT | 317 | Research review (context) split from research HTML (output) | GD-02 | G-GENERAL-DEV-01 | not_started |
| GD-08-CONTEXT-RELEVANCE-EXTRACTION | 318 | Relevance functions moved into context | GD-02 | G-GENERAL-DEV-01 | not_started |
| GD-09-JURISDICTION-IDENTIFIER-MODEL | 319 | Nationwide `JurisdictionRef` model (synthetic registry) | GD-02 | G-GENERAL-DEV-01 | not_started |
| GD-10-BOUNDARY-ENFORCEMENT | 320 | Boundary test flipped to enforcing | GD-04, GD-06, GD-07, GD-08 | G-GENERAL-DEV-01 | not_started |
| GD-11-V2-JURISDICTION-ASSOCIATION | 321 | Additive corpus 2.1 jurisdiction association | GD-09, GD-10 | G-GENERAL-DEV-01 | not_started |
| GD-12-NATIONWIDE-SOURCE-CATALOG | 322 | Source catalog replacing hand-coded profiles | GD-05, GD-09 | G-GENERAL-DEV-01 | not_started |
| GD-13-NATIONWIDE-RECORD-CONTRACT | 323 | Public record, artifact and source contracts for all states | GD-09, GD-10 | G-GD-NATIONWIDE-CONTRACT | blocked |
| GD-14-FEDERAL-TAXONOMY-SOURCE-MAPPINGS | 324 | Deterministic official-label mappings (synthetic first) | GD-08, GD-10 | G-GENERAL-DEV-01 | not_started |
| GD-15-ARCHITECTURE-DOCS | 325 | Architecture, backbone and data-contract updates | GD-10 | G-GENERAL-DEV-01 | not_started |
| GD-16-INTEROP-PURE-ADAPTER | 326 | Pure `policy.search-context/1` validator and `policy.citations/1` projector | GD-06, GD-08, GD-09, GD-10 | G-GD-INTEROP | blocked |

Proposed gates (all start `closed`):

- G-GENERAL-DEV-01: local synthetic refactor; acquisition budget zero; no source
  activation, private data, publication or release authority.
- G-GD-NATIONWIDE-CONTRACT: the public contract change that supersedes D-004's
  three-state coverage.
- G-GD-INTEROP: the O-023 ruling plus adoption of the IO pathway.

Each item also needs `milestone: General development`,
`work_class: general_development_local`, acceptance lines taken from the step
table above, and (for blocked items) `blocked_by`, `safe_fallback`,
`unblocks_only_when` and evidence. The validator requires these fields
(`scripts/validate-roadmap.mjs:590-620`).
