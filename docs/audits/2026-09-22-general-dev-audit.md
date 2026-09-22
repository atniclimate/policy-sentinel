# General development audit (2026-09-22)

Status: evidence record for the realignment session on branch
`realign/general-development`. It describes the repository as found. It
authorizes nothing, changes no gate, and does not change open fact O-023. The
module design that follows from it is
[`../architecture/module-boundaries.md`](../architecture/module-boundaries.md);
owner calls are collected in
[`../decisions/2026-09-22-realignment-open-decisions.md`](../decisions/2026-09-22-realignment-open-decisions.md).

Method. Every file cited here was opened in this session. The import graph was
extracted mechanically from `src/`, `config/`, `scripts/` and `tests/`, and the
files it pointed at were then read. Three read-only mappers, one per sibling
repository, reported on land-use-analyzer, TCR-policy-scanner and plan-assessor
(`I:\cap-assessor`, with its `pilot\` directory excluded from every search). The
lead re-verified the land-use-analyzer profile definitions directly.
Paths outside this repository are written as code, not links, because the
backbone validator rejects links that leave the repository.

## 1. Baseline

| Field | Value |
| --- | --- |
| Starting branch and HEAD | `main` at `9f00a0ae2b3c5b966386be7557f8d973753932b8` ("Add ATNI Climate interop IO guide and record D-070 and O-023") |
| Working branch | `realign/general-development`, created from that HEAD |
| Tracked modifications (pre-existing, not this session's) | `src/pipeline/policy-local-output.mjs`, `tests/pipeline/policy-assurance.test.mjs` |
| Untracked | 34 owner-direction inputs under `docs/` (hash-bound custody) and `docs/policy-sentinel-selected-records.csv` |
| Git-excluded local file | `.local/handoff/HANDOFF.md` (private note from a 2026-09-19 review session, excluded through `.git/info/exclude`) |
| Logs | `C:\dev\_scratch\policy-sentinel-audit\p1-test.log`, `p1-roadmap.log`, `p1-backbone.log`, `p1-baseline-summary.txt` |

| Command | Result |
| --- | --- |
| `npm test` | Exit 0. Node suites: corpus 13/13, spine 30 passed plus 1 skipped of 31, policy 115/115, assurance 100/100, backbone tests 26/26, tier1 129/129, knowledge 31/31. Vitest: 97 files, 1617 tests passed. |
| `npm run validate:roadmap` | Exit 0. 81 work items, 57 gates, 14 sources, 23 binding paths; complete 43, in_progress 0, ready 1, blocked 18, deferred 2, not_started 17. |
| `npm run validate:backbone` | **Exit 1.** Four issues, all `.local/handoff/HANDOFF.md link escapes the repository` (finding F-01). |

The tests ran against the working-tree bytes, including the two pre-existing
modifications.

## 2. Pipeline inventory

The repository has no single pipeline. It has two production families and a
set of tested but unconnected seams.

- **Retained v1 family (public synthetic app).** `PublicSourceAdapter` produces
  `PolicyRecord 1.4`, which the artifact builder and last-known-good merge turn
  into the static app's data and its dossier/CSV. Only three synthetic fixture
  records flow through it; every real adapter is disabled.
- **v2 family (reviewed local workbench).** A manifest-driven bounded runner
  feeds immutable custody, then text extraction, `AnalyzedCorpus 2.0`,
  search/temporal operations, and the local workbench, dossier and research
  export. Real data stays in an external namespace.
- **Seams tested in isolation:** PNW-01 projection, PNW-03 geography/rights,
  PNW-04 taxonomy, PNW-05 source-pack and real-source lifecycle, Run 2 identity,
  K0 kernel, S0 spatial, and the Makah demo private-context contracts. None
  feeds a production path.

### 2.1 Intake

| Aspect | Evidence |
| --- | --- |
| v1 adapters | `src/adapters/federal-register/` (13 files incl. Tier-1 `.mjs`), `src/adapters/supreme-court-opinions-curated/`, `src/adapters/washington-centennial-accord/`, `src/adapters/washington-governor-executive-orders/`, `src/adapters/bia/`. Interface `src/pipeline/source-adapter.ts:37-52` (`checkContract`, `discover`, `fetch`, `normalize`). Registry `config/sources.v1.json` (registry `1.19.0`, line 4), semantics `src/pipeline/source-registry.mjs`. |
| v1 offline contracts | `src/contracts/{congress,govinfo,oregon-odata,regulations-gov,washington-lws}/` (contract-only, no live adapter). |
| v2 acquisition | `src/pipeline/policy-custody.mjs` (manifest validation `:305-444`, network transport `:794`, `acquirePolicyObject` `:855`, `verifyPolicyRun` `:1216`); runner `scripts/bounded-operation-runner.mjs`; manifests `config/policy-sources.v2.mjs:18-237`; manifest registry `scripts/prepare-policy-run.mjs:6-13`. |
| Source-specific discovery | `src/pipeline/policy-broad-discovery.mjs:5-152` (Washington session-law chapter selection with hardcoded 2025 paths at `:29-50`). |
| Seams | `src/engine/source-pack.ts`, `src/engine/real-source-lifecycle.ts` (6,027 lines), `src/pipeline/corpus-store.mjs` (synthetic CAS). |
| Inputs / outputs | v1: provider responses, then `PolicyRecord[]` plus `SourceHealth`. v2: a manifest (profiles and targets), then immutable objects plus ledger receipts in the external run root. |
| Cross-stage imports | Adapters import pipeline validation (`src/adapters/*/index.ts` and `normalize.ts` import `src/pipeline/policy-validation.mjs`). Tier-1 refresh imports the engine lifecycle (`src/adapters/federal-register/tier1-refresh.mjs` imports `src/engine/real-source-lifecycle.ts`). |
| Tests | `tests/adapters/**` (26 files), `tests/contracts/**` (16), `tests/pipeline/{bounded-operation-runner,policy-custody-pdf,makah-demo-manifest,policy-broad-discovery,corpus-store,policy-windows-probe}.test.mjs`, `tests/engine/{source-pack,real-source-lifecycle}*`. |

### 2.2 Normalization

| Aspect | Evidence |
| --- | --- |
| v1 | Per-adapter `normalize.ts`; record policy validator `src/pipeline/policy-validation.mjs` (`validateRecordPolicy` `:1038`, forbidden keys `:48-72`); identity `src/pipeline/identity.mjs`; hashing `src/pipeline/hashing.mjs`; corpus v1 `src/pipeline/analyzed-corpus.mjs` (imports three fixtures at module load, `:15-17`); `src/pipeline/synthetic-corpus-path.mjs` (same fixture imports `:4-6`); `src/pipeline/curated-document-pack.mjs`. |
| v2 | Text extraction `src/pipeline/policy-text.mjs` (`extractPolicyText` `:695`; parse5 and saxes); corpus builder `src/pipeline/policy-corpus-builder.mjs` (`createPolicyCorpus` `:353`); schema/runtime `src/pipeline/analyzed-corpus-v2.mjs` and `schemas/analyzed-corpus.schema.v2.json`. |
| Kernel | `src/kernel/lifecycle/policy-record-14-validator.ts` imports `src/pipeline/nation-collection-policy.mjs`, `policy-validation.mjs` and `source-registry.mjs`: a kernel-to-pipeline dependency. |
| Tests | `tests/pipeline/{policy-text,policy-corpus-builder,analyzed-corpus,analyzed-corpus-v2,curated-document-pack,synthetic-corpus-path,nation-collection-policy}.test.mjs`, adapter normalize tests, `tests/kernel/**`. |

### 2.3 Geographic mapping

| Aspect | Evidence |
| --- | --- |
| Public app relevance | `src/app/policy.ts:59-85` (`recordAvailableForNation`: federal records are always shown, state records are shown when `nation.coveredStateCodes` includes the record's `stateCode`, and county/tribal records need an explicit association). Covered states are filtered to `["WA","OR","ID"]` at `src/app/data.ts:156`. |
| Nation collection | `src/pipeline/nation-collection-policy.mjs:3-4` (`EXPECTED_NATION_COUNT = 575`, `STATE_CODES = {WA, OR, ID}`). |
| v2 corpus | `governmentContext` is a free string of at most 256 characters (`schemas/analyzed-corpus.schema.v2.json:555-559`). `relevance` is the constant `general_jurisdiction` (`:586-587`). There is no jurisdiction identifier. |
| Seams | `src/engine/geography-rights.ts` (PNW-03, synthetic), `src/experimental/spatial/` (S0, impossible geometries, closed convergence), and the Makah groundwork: `src/engine/land-boundary-contracts.ts`, `land-parcel-contracts.ts`, `parcel-query.ts`, `authorized-private-context-adapter.ts`. |
| Tests | `tests/engine/{geography-rights*,land-boundary,land-parcel,parcel-query,makah-demo-non-interference}.test.ts`, `tests/experimental/spatial/**` (13), `tests/app/policy.test.ts`. |

### 2.4 Taxonomy resolution

| Aspect | Evidence |
| --- | --- |
| Configuration | `config/taxonomy.v1.json:5-9`: `method: deterministic-official-subject-only`, `unmappedBehavior: unclassified`, **`sourceMappings: []`**. |
| Producers | Every adapter emits `taxonomyMemberships: []`: `src/adapters/federal-register/normalize.ts:868`, `supreme-court-opinions-curated/normalize.ts:511`, `washington-centennial-accord/normalize.ts:393`, `washington-governor-executive-orders/normalize.ts:527`. The v2 schema pins `taxonomy: "Unclassified"` (`schemas/analyzed-corpus.schema.v2.json:588-590`). |
| Consumers | `src/app/policy.ts:87-107` (`recordMatchesPolicy`), `src/engine/parcel-query.ts:72-101`. |
| Seam | `src/engine/taxonomy.ts` (4,258 lines, PNW-04 governed bundle, synthetic), which no producer calls. |
| Tests | `tests/engine/taxonomy*.test.ts` (3), `tests/app/policy.test.ts`. |

In effect the stage is a deterministic Unclassified fallback. It is compliant
with the category rule in `AGENTS.md:240-243`, but no real mapping exists.

### 2.5 Output formatting

| Aspect | Evidence |
| --- | --- |
| Public artifact | `src/pipeline/artifact.mjs` (`createArtifactDocuments` `:561`, `toCompactIndexRecord` `:195`), `artifact-health.mjs`, `last-known-good.mjs` (`mergeSourceRefresh` `:1024`), `scripts/build-synthetic-artifact.mjs`, `scripts/validate-artifact.mjs`. |
| Public app outputs | `src/app/App.tsx` (3,138 lines, including `PrintDossier` `:2703`), `src/app/csv.ts:22-95` (`selectedRecordsCsv`, 67 columns), `src/app/data.ts` (`loadRecordDetail` hydration). |
| Local workbench outputs | `src/pipeline/policy-local-output.mjs` (replay `:116-203`, `writeLocalOutput` `:224-307`, failure simulation `:456`, loopback HTTP server `:654`), `src/pipeline/policy-research-output.mjs` (review resolution `:62-236`, HTML rendering `:243-249` onward), `src/app/PolicyWorkbench.tsx`, `src/engine/policy-search.mjs`, `src/engine/temporal-operations.mjs`. |
| Seams | `src/engine/projection.ts` (PNW-01), `src/engine/citation-export-contracts.ts` (`CitationExport 1.0.0`). |
| Tests | `tests/pipeline/{artifact-*,last-known-good-hardening,policy-local-output,policy-research-output,policy-search,temporal-operations,policy-assurance}`, `tests/app/**` (11), `tests/engine/{citation-export,projection*}.test.ts`. `tests/pipeline/policy-local-output.test.mjs` exercises only `validateLocalOutputFiles`, `simulateLocalSourceFailure` and `createLoopbackOutputServer`. `replayReviewedCorpus`, `writeLocalOutput`, `readLocalOutput` and `localCorpusBytes` have no direct test in `npm test`. |

### 2.6 Entanglement flags

| Kind | Evidence |
| --- | --- |
| Output re-runs normalization and custody | `src/pipeline/policy-local-output.mjs:6-19` imports custody, `extractPolicyText` and `createPolicyCorpus`, and `replayReviewedCorpus` (`:116-203`) re-extracts and rebuilds the corpus before output. |
| Format logic inside analysis | `src/pipeline/policy-research-output.mjs` holds `resolvePolicyResearchReview`/`enrichPolicyCorpus` (analysis, `:62-241`) and `buildPolicyResearchOutput` with an inline stylesheet and HTML page builder (`:243-249` onward). |
| Engine depends on pipeline | `src/engine/policy-search.d.mts` and `temporal-operations.d.mts` type against `src/pipeline/analyzed-corpus-v2.mjs`. |
| Kernel depends on pipeline | `src/kernel/lifecycle/policy-record-14-validator.ts` (see 2.2). |
| Browser app imports pipeline modules | `src/app/PolicyWorkbench.tsx` and `src/app/policy-local-loader.ts` import `src/pipeline/analyzed-corpus-v2.mjs`. |
| Import-time data coupling | `src/engine/projection.ts:63-73` builds maps from `config/sources.v1.json` and `config/taxonomy.v1.json` at module load; `src/pipeline/analyzed-corpus.mjs:15-17` imports fixtures. |
| Shared mutable state | Only a memoized promise, `let canonicalValidationContextPromise` at `src/pipeline/last-known-good.mjs:64`. The other module-level maps are derived read-only. No shared mutable state crosses a stage boundary. |
| Divergent boundary guards | Three protected-key lists: `src/pipeline/policy-validation.mjs:48-72` (no `bbox`, `bounds`, `extent`, `wkt`, `wkb`, `geojson`, `centroid`, `features`, `shapefile`, `owner`, `ownership`), `src/engine/land-boundary-contracts.ts:39-93`, `src/engine/citation-export-contracts.ts:49-86`. |
| Tribe-specific configuration in engine config | `config/policy-sources.v2.mjs:153-237` (`makahDemoFederalManifest`), wired into `scripts/prepare-policy-run.mjs:6-13`. |
| PNW hardcoding | State enum `["WA","OR","ID"]` at `schemas/record.schema.v1.json:1335-1348`, `schemas/artifact.schema.v1.json:73-80` (also `:512`, `:544`, `:1069`), `schemas/source.schema.v1.json:136`, `src/pipeline/nation-collection-policy.mjs:4`, `src/app/data.ts:156`; Washington-only discovery `src/pipeline/policy-broad-discovery.mjs`. |
| Nez Perce hardcoding | None in `src/`, `config/` or `scripts/`. Nez Perce appears only as a planning candidate in docs (for example `docs/decision-register.md` O-020). |
| Makah hardcoding in engine code | Only provenance comments naming the groundwork (`src/engine/*-contracts.ts:4`, `parcel-query.ts:2`, `authorized-private-context-adapter.ts:2`). No Makah identifier, geometry or rule is encoded in engine logic. The Makah-specific bytes are the acquisition manifest (row above) and the docs. |

## 3. Contract drift

| # | Repository contract | Code or other document | Which side looks right |
| --- | --- | --- | --- |
| C-1 | `AGENTS.md:141-142` and `docs/PROJECT-BACKBONE.md:44-45`: nationwide support is a "later-compatible direction". | The owner's 2026-09-22 direction makes nationwide coverage core. The code agrees with the documents and not with the direction: the state enum admits only WA/OR/ID (section 2.6). | The owner direction governs (authority order, `docs/PROJECT-BACKBONE.md:86-88`). The framing is updated in this session. The schema successor and the D-004 supersession (`docs/decision-register.md:82`) are owner decisions. |
| C-2 | `AGENTS.md:265-267`: "Do not add maps, parcel geometry, ownership, trust-land, fee-land, Tribally owned parcel, or sensitive land content." `docs/decision-register.md:88` (D-010): an adapter may be "documented but unimplemented". | `src/engine/land-parcel-contracts.ts:39-59` enumerates `tribal_trust`, `tribal_fee`, `allotted_trust`, `reservation_fee`. `src/engine/citation-export-contracts.ts:139-146` defines a `parcel` export scope carrying `parcelId` and the parcel's layers. `src/engine/authorized-private-context-adapter.ts:328` ships a synthetic in-memory implementation, and `src/engine/index.ts:286-351` re-exports all of it. | The code follows D-068 (`docs/decision-register.md:163`), which adopted these as private-only, geometry-free, synthetic-only references. No land data is present. The data rule in `AGENTS.md` is not reconciled to D-068, and D-010's "unimplemented" wording is now inaccurate. The rule itself is unchanged; the reconciliation is an owner decision. |
| C-3 | `docs/architecture.md:477-480` and the docstring at `src/engine/parcel-query.ts:111-115`: a tribal layer matches when a validated association's official name equals the layer's authority name. | `src/engine/parcel-query.ts:193-204` matches on `nationId`, and `tests/engine/parcel-query.test.ts:187` pins "only by nationId, never by an equal official name". | The code is right. It is identity-bound, which is stricter and consistent with `src/engine/land-parcel-contracts.ts:75-82`. Both prose passages are stale. |
| C-4 | `docs/development/atni-climate-interop-io-guide.md:97-100`: "Restriction labels travel with a query if the sender derived it from restricted context." | The land-use-analyzer envelope's `classification` has only `scheme`, `label` (T0-T2), `permitted_use`, `synthetic` and `mapped_lua_tier` (`I:\land-use-analyzer\docs\schemas\atni_climate_interop_v1.schema.json:84-133`). It has no restriction, lineage or audience field. | The schema is the actual wire contract. The guide describes an intent that no field carries, and it should say so. |
| C-5 | IO guide sections 2 and 3 describe `policy.search-context/1` and `policy.citations/1` as defined profiles. | Both are only reserved enum values (`atni_climate_interop_v1.schema.json:15-28`), described in prose (`ATNI_CLIMATE_NO_SAVE_INTEROPERABILITY_2026-09-15.md:365-390`), and rejected by `webapp\src\lib\interop\validation.ts:113`. `ATNI_CLIMATE_INTEROP_PROTOCOL.md:24` marks them reserved. | The land-use-analyzer code is right. No field-level definition exists anywhere yet (Phase 2 conformance table). |
| C-6 | `AGENTS.md:294-309` lists the command surface. | `package.json` `check` also runs `validate:knowledge` and `validate:foundation`. `test:policy`, `test:assurance` and the `policy:*` scripts are not listed. | `package.json` is the executable truth. Low severity. |
| C-7 | `docs/PROJECT-BACKBONE.md:238-331` (repository surfaces). | Missing from the list: `src/engine/{geography-rights,taxonomy,projection,identity-authority-scenarios,policy-search,temporal-operations}`, `src/knowledge/`, and the Makah groundwork engine modules. | The code is the inventory. The backbone is updated in this session. |
| C-8 | `AGENTS.md:167`: "Select only within the authorized canonical PS09 graph." | `scripts/validate-roadmap.mjs:2975-2980` permits an active item only if it is PS09, publication, or one of the named maintenance/Makah identities. `:778-793` freezes work-item and gate identities by digest under schema 1.9. | Both agree with each other and conflict with the owner's direction to start general development. A new ledger representation (schema 1.10) is required and is an owner decision (finding F-02). |
| C-9 | `AGENTS.md:204-205`: never commit "real Nation-specific configuration". | `config/policy-sources.v2.mjs:153-237` names the Makah treaty and Makah court documents in an acquisition manifest (committed at `07d5fb2` under D-069). | Placement is settled by owner ruling, and the material stays. For future work the rule is right: Tribe-specific manifests belong in private deployment repositories. |

## 4. Open fact O-023: shapefile-driven cross-app pipeline

O-023 (`docs/decision-register.md:181`) records the owner's stated direction:
GeoBase shapefiles enter land-use-analyzer with parcel metadata,
land-use-analyzer exports a shapefile, and Policy Sentinel "identifies the
policies attached within the shapefile for the identified land use metadata and
exports a detailed document". O-023's status is not changed here.

### 4.1 The boundaries it is measured against

- `EXT-PRIVATE` (`ROADMAP.yaml:214-221`) prohibits "Private, restricted,
  Nation-supplied, or land-related data and private adapter activation" until
  the supplying Tribe and the owner approve an exact private deployment.
- `G-G` (`ROADMAP.yaml:601-604`, "Private or Nation-supplied material") is
  closed on that boundary.
- D-010 (`docs/decision-register.md:88`) excludes maps, parcel geometry,
  ownership, trust/fee land, Tribally owned parcel data and sensitive land
  context from public data and relevance logic. It allows a private adapter only
  in a separate private deployment with no automatic export path.
- The IO guide (`docs/development/atni-climate-interop-io-guide.md:90-100`) and
  its source (`ATNI_CLIMATE_NO_SAVE_INTEROPERABILITY_2026-09-15.md:373-378`)
  state that `policy.search-context/1` "contains no parcel IDs, coordinates,
  bbox, ownership, land status, Nation inferred from a map, or attachment
  carrying those fields".
- Also relevant: D-005 (`docs/decision-register.md:83`, geography cannot create
  a Nation link) and `AGENTS.md:263-264` (no search logging).

### 4.2 O-023 as written

As written, O-023 is not feasible. Four flows decide it:

1. **A shapefile enters Policy Sentinel.** Geometry crosses into the engine,
   which every boundary above prohibits.
2. **"Land use metadata" per parcel.** In land-use-analyzer these are parcel
   attributes: `prop_id`, `county_fips`, `owner_class_public`,
   `owner_display_name`, `tenure_class` and more
   (`I:\land-use-analyzer\webapp\src\lib\demo-parcels.ts:74-86`), plus
   land-status codes such as `aiannh_offreservation_trust_component` and
   `bia_tract_tribal` (`webapp\src\lib\demo\context-artifact.ts:13-19`). Parcel
   and ownership attributes would enter.
3. **"Policies attached within the shapefile".** Policy Sentinel would compute
   a spatial relation between policy and geometry. For Nation relevance this is
   the inference D-005 forbids. For general jurisdiction, it replaces identifier
   matching with geometry.
4. **A document per shapefile.** The output would be keyed to a parcel set.
   The existing `CitationExport` `parcel` scope (`src/engine/citation-export-contracts.ts:139-146`)
   would carry the `parcelId` and the layers into the export, which makes the
   restricted selection derivable from the output.

### 4.3 The question as posed

> Can Policy Sentinel receive `policy.search-context/1` and emit
> `policy.citations/1`, as those profiles are defined in the repo, without
> restricted geometry or parcel attributes entering, being stored in, or being
> derivable from this engine?

**Verdict: feasible with named changes.** The profiles as described admit no
geometry. The inbound set is "existing topic/category/source IDs, date bounds,
explicit textual search where supported, and caller-selected general-jurisdiction
criteria" (IO guide `:55-59`). But "as defined in the repo" means prose only.
No closed schema exists in this repository or in land-use-analyzer, and five
channels stay open until specific changes close them.

| Channel | Why it is open | Named change that closes it |
| --- | --- | --- |
| Free-text `query` | Unbounded prose can carry a parcel number, an address or coordinates. The mapper confirms that no schema bounds it on the sender side. | NC-1: a closed Policy Sentinel-owned schema for both profiles with a length cap and a reject rule for coordinate-, APN- and bbox-shaped tokens (a guard, not proof). NC-2: one shared protected-key guard applied before schema validation. |
| Nation criteria | The envelope cannot distinguish a user-chosen Nation from one inferred from a map. `SearchCriteria` requires `nationId` (`src/app/types.ts:341`), and `filterRecords` requires a Nation (`src/app/policy.ts:115-125`). | NC-3: version 1 of the profile carries no Nation criterion at all; a later version admits only an explicit caller-selected Nation with provenance. NC-4: a Nation-free general-jurisdiction query path in the projector. |
| Restricted derivation | A county plus Nation plus topic set derived from a Tribal-supplied parcel selection is restricted-derived, yet the envelope carries only a tier label (C-4). | NC-5: the adapter refuses (`TIER_NOT_ALLOWED` or `PURPOSE_NOT_ALLOWED`) any request whose classification is not `synthetic_conformance`, or whose label is above T0, unless an owner grant names the audience and purpose. It declares `storage: memory_only`, never logs or persists the query, and never echoes inbound `provenance`. |
| Output keyed to a selection | Reusing `CitationExport`'s `parcel` scope, or echoing the query's jurisdiction set, would make the selection derivable from the output. | NC-6: a new `policy.citations/1` projector that carries record-side evidence only (record IDs, source, dates, locators, `whyShown` from the record, health, coverage). It carries no scope layers and no `parcelId`, and never uses `CitationExport`'s `parcel` scope. |
| Jurisdiction identifiers | The reviewed local corpus holds only a free-text `governmentContext` (section 2.3). The public corpus admits only WA/OR/ID. | NC-7: a jurisdiction identifier model for the v2 corpus (see the module design). Until it exists, jurisdiction criteria against the local corpus return `OUT_OF_COVERAGE`. |

With NC-1 through NC-7, only coarse public identifiers and topics enter Policy
Sentinel, nothing is stored, and the output depends only on public record
evidence. A county or state cannot be inverted into a parcel.

### 4.4 Feasible designs for the owner's intent

**Design A, sender-side criteria (recommended; no boundary change).**
land-use-analyzer keeps the shapefiles and parcels. The user makes an explicit
public topic search that is separate from the area of interest, which the
source text permits: "A separately user-chosen public topic search can be
independent of an AOI" (`NO_SAVE...md:378`). land-use-analyzer maps its land-use
categories to Policy Sentinel taxonomy IDs through a crosswalk it owns and sends
`policy.search-context/1` with state/county identifiers, topics and dates.
Policy Sentinel returns `policy.citations/1` and, separately, a dossier. Any join
of citations back to parcels happens inside land-use-analyzer's own boundary.
The owner's "detailed document" becomes a jurisdiction-and-topic dossier, not a
per-parcel determination.

**Design B, a Tribe-owned private deployment (needs EXT-PRIVATE, G-G and D-010
approval by the supplying Tribe and the owner).** A separate private
repository hosts a real `AuthorizedPrivateContextAdapter` and the `LandParcel`
contracts over Tribe-held data. It imports the public engine as a dependency and
never feeds back into this repository or any public build. This repository
changes only by keeping the private-context seam importable and inert.

## 5. Makah demo material inventory

Owner ruling: this material stays exactly where it is. It is inventoried here,
not moved.

| Kind | Path (last commit) |
| --- | --- |
| Engine contracts and modules | `src/engine/land-boundary-contracts.ts` (554e105), `src/engine/land-parcel-contracts.ts` (554e105), `src/engine/parcel-query.ts` (554e105), `src/engine/authorized-private-context-adapter.ts` (554e105), `src/engine/citation-export-contracts.ts` (c583ef6); re-exported by `src/engine/index.ts:286-351` |
| Schemas | `schemas/land-boundary.schema.v1.json`, `schemas/land-parcel.schema.v1.json`, `schemas/citation-export.schema.v1.json`, `schemas/makah-demo-doc.schema.v1.json` (67002ce) |
| Fixtures | `fixtures/engine/{land-boundary,land-parcel,citation-export}.synthetic.valid.json`, `fixtures/engine/{land-boundary,land-parcel}-malformed.invalid.json` (554e105) |
| Tests | `tests/engine/{land-boundary,land-parcel,parcel-query,citation-export,makah-demo-non-interference}.test.ts`, `tests/pipeline/makah-demo-manifest.test.mjs` (07d5fb2) |
| Configuration and scripts | `config/policy-sources.v2.mjs:153-237` (07d5fb2), `scripts/prepare-policy-run.mjs:6-13` (07d5fb2), Makah identities in `scripts/validate-roadmap.mjs:49-73, 998-1205` (07d5fb2), `scripts/validate-foundation.mjs` (554e105) |
| Descriptive documents | `docs/makah-demo/00-llm-usage-manifest.yaml` (07d5fb2), `01-current-functionality-and-gis-boundary.yaml`, `02-parcel-jurisdiction-and-citation-export.yaml` (67002ce) |
| Development records | `docs/development/makah-demo/` (scouts, sovereignty review, reference lookup, TSDF provenance record and its schema) |
| Handoffs and reviews | `docs/handoffs/makah-demo-fable-5.1-launch-prompt.md`, `makah-demo-01-groundwork-outcome.md`, `makah-demo-02-federal-acquisition-launch.md`, `makah-demo-02-federal-acquisition-outcome.md`; `docs/source-reviews/makah-tribe-official-publications-2026-09-15.md`, `olympic-peninsula-federal-actions-2026-09-15.md`, `federal-court-opinion-datastores-2026-09-15.md` |
| Ledger | `ROADMAP.yaml:235-280` (gates G-MAKAH-DEMO-01/02), `:5452-5560` (items), `:960-965`, `:6317-6332` |
| Outside the repository | Acquired objects `I:\policy-sentinel-corpus-real-policy\makah-demo-02` (ten receipts, custody only); stage package `I:\ATNI-annual-convention-2026\ga-demonstration\policy-sentinel` (machine-only) |

Completion records: groundwork `554e105` (committed 2026-09-15T06:33:24-07:00);
acquisition `07d5fb2` (2026-09-15T08:18:30-07:00), with the ledger follow-up
`a1ee988` (2026-09-15T08:20:05-07:00).

## 6. Findings, most severe first

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| F-01 | High | The backbone gate fails in this working checkout at baseline. The validator walks every on-disk Markdown file except `.cache`, `.git`, `coverage`, `dist` and `node_modules`, including git-excluded files. The private note `.local/handoff/HANDOFF.md` links outside the repository. This session does not own that file and has not changed it. | `scripts/validate-backbone.mjs:16-22, 698-703, 793-796`; `.local/handoff/HANDOFF.md:46, 51, 92, 187`; `.git/info/exclude:7` |
| F-02 | High | New work cannot be represented in the ledger under schema 1.9. Work-item and gate identities are frozen by digest, unknown gates are rejected, and an active item must be PS09, publication, or a named maintenance identity. Sequencing general development needs a schema 1.10 representation and a validator extension, which this session may not write. | `scripts/validate-roadmap.mjs:49-52, 483-490, 773-793, 2975-2980` |
| F-03 | High | Nationwide coverage is structurally blocked. The state code is a closed WA/OR/ID enum in three public contracts and two runtime modules. Any record from another state fails schema validation. | Section 2.6 "PNW hardcoding"; D-004 `docs/decision-register.md:82` |
| F-04 | High | The real corpus has no jurisdiction identifier model. `governmentContext` is free text and relevance is fixed at `general_jurisdiction`, so geographic association and jurisdiction filtering cannot be validated on the reviewed local corpus. | `schemas/analyzed-corpus.schema.v2.json:555-559, 586-587` |
| F-05 | High | Output code re-runs normalization and custody. `policy-local-output.mjs` mixes replay (extraction plus corpus rebuild), output writing, a loopback HTTP server and failure simulation. It is also the file carrying uncommitted modifications from earlier work that this session does not own. | `src/pipeline/policy-local-output.mjs:1-19, 116-307, 456, 654`; `git status` |
| F-06 | Medium | The taxonomy stage is a fallback only. All producers emit empty memberships, the mapping list is empty, and the governed taxonomy engine is not wired to any producer. | Section 2.4 |
| F-07 | Medium | Format logic sits inside analysis in `policy-research-output.mjs`. | `src/pipeline/policy-research-output.mjs:62-249` |
| F-08 | Medium | Layering inversions: engine to pipeline, kernel to pipeline, browser app to pipeline, plus import-time config and fixture coupling. | Section 2.6 |
| F-09 | Medium | Three divergent protected-key guards. The record guard lacks several geometry and ownership keys that interop intake must reject. | Section 2.6 |
| F-10 | Medium | The private land-context contracts in the public engine are not reconciled with the `AGENTS.md` data rule or with D-010's "unimplemented" wording. They are covered by D-068. | C-2 |
| F-11 | Medium | Intake is hand-coded per source. There are two unrelated intake interfaces (v1 adapter, v2 manifest runner), source profiles live in one JavaScript module, and the custody caps (at most 4 profiles and 10 hosts per run) make each run small. That is correct for a bounded run but means nationwide coverage has to come from a source catalog plus many runs. | `src/pipeline/source-adapter.ts:37-52`; `config/policy-sources.v2.mjs:18-151`; `src/pipeline/policy-custody.mjs:321, 394`; `src/pipeline/policy-broad-discovery.mjs` |
| F-12 | Medium | Neither interop profile is defined at field level anywhere, and the IO guide overstates what the envelope carries. | C-4, C-5 |
| F-13 | Medium | The public search contract is Nation-scoped. `SearchCriteria.nationId` is required and `filterRecords` needs a Nation, so a Nation-free general-jurisdiction interop query has no path. | `src/app/types.ts:340-354`; `src/app/policy.ts:115-125` |
| F-14 | Medium | Tribe-specific acquisition configuration is in engine config. It stays by owner ruling; future manifests need a private home. | C-9 |
| F-15 | Low | Source reviews expire soon. After expiry, dispatch fails with `EXPIRED_PROFILE`. | `config/policy-sources.v2.mjs:7` (2026-10-05), `:63` (2026-10-15); `src/pipeline/policy-custody.mjs:381-386` |
| F-16 | Low | Tribal-layer matching is described inaccurately in two places. | C-3 |
| F-17 | Low | Local-output replay and write paths have no direct unit test. | Section 2.5 |
| F-18 | Low | The `AGENTS.md` command list and the backbone surfaces list lag the code. | C-6, C-7 |
| F-19 | Info | Six node test files run only through a Vitest wrapper, so their counts are nested in one Vitest test. | `tests/pipeline/pipeline.test.ts:11-33` |

No finding in this session required a code change to make a test or validator
run. Both validators and the test suite ran as found.

## 7. Session ledger

(Entries are appended at each checkpoint.)

- **Phase 1 checkpoint (audit).** Finished the baseline, pipeline inventory,
  contract drift, O-023 assessment, Makah inventory and findings. Commit
  `fff7990`. Next: Phase 2 module design.
- **Phase 2 checkpoint (module design).** Finished
  [`../architecture/module-boundaries.md`](../architecture/module-boundaries.md):
  the three module contracts, ecosystem map, interop conformance tables,
  refactor handoff, and a dependency-checked schema 1.10 proposal (not applied,
  finding F-02). The commit hash is recorded in the next entry. Next: Phase 3
  realignment of `AGENTS.md`, `PROJECT-BACKBONE.md` and `ROADMAP.yaml`, plus the
  decisions file.
- **Phase 3 checkpoint (realignment).** Phase 2 was commit `20d0056`.
  - `AGENTS.md`: the framing paragraphs and one purpose sentence changed; every
    rule section is byte-identical.
  - `PROJECT-BACKBONE.md`: updated to the module design and nationwide scope.
  - `ROADMAP.yaml`: the phase, owner intent, current focus and next-action text
    changed. The Makah items gained `completed_on` and `completion_commit` from
    `git show -s --format=%cI` (554e105 and 07d5fb2) plus close-out evidence.
    Schema stays 1.9 and no item or gate was added (F-02). The status
    vocabulary was confirmed against `scripts/validate-roadmap.mjs:343-350` and
    is identical to the expected set.
  - [Decisions file](../decisions/2026-09-22-realignment-open-decisions.md):
    RD-01 through RD-07.
  - Gates: `validate:roadmap` passed (81 items, 57 gates, same status counts).
    `validate:backbone` failed only on the four pre-existing
    `.local/handoff/HANDOFF.md` issues (RD-03); it passed on a scratch clone of
    the branch with these files (126 Markdown files, 875 links). `npm test`
    matches the baseline (node suites identical; Vitest 97 files, 1617 tests).
    `validate:knowledge` and `format:check` also passed.
  - The commit hash is recorded in the next entry. Next: owner rulings on RD-01
    through RD-03, then refactor wave 1 (module boundaries section 9.2).
