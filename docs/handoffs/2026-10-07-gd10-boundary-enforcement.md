# GD-10 boundary enforcement contract

This contract selects GD-10 after bounded GD-09 acceptance at source checkpoint
`8b97383f37e33c0569e57b7e834ac8fd8ef582fc` (20:24:01 UTC).
GD-10 has priority 320; its complete recursive closure includes accepted
GD-04/06/07/08, their GD-01/02/03 prerequisites and GD-00. Approved
G-GENERAL-DEV-01 and D-071 admit this local mechanical refactor. GD-12 is
newly ready after GD-09, as is GD-20 under D-076; GD-10 remains the lowest
eligible priority. Both promotions keep their synthetic contract scope.
Exactly one item stays active. GD-22 identity, GD-13 public successor, all
release conditions and separately closed operations remain unchanged.

All 16 retained audit exceptions are substantive imports. A label change or
unchanged exception list cannot complete this item. This reviewed amendment
extends the original harness-only ownership to their actual production
closure while preserving module classification and compatibility APIs.
Source work starts only after independent five-document selection review,
ledger/backbone/format checks and the local selection commit. Leases below
are unissued until that checkpoint.

No network request, acquisition, source activation, credential/terms change,
private-data use, optional AI, publication or outbound notification is
dispatched. No config JSON, sealed corpus 2.0, measurement implementation
pin, private seam, K0/S0/O0 contract, demo or Worker path is owned here.
Historical observer digests and grants stay unchanged. Changing a covered
adapter entry does not renew observer eligibility.

## Production closure

Core corpus v1 keeps its validation responsibilities. Move the existing
implementation to src/core/analyzed-corpus.mjs with matching declarations;
replace the old runtime/declaration paths with explicit named export facades.
Introduce internal createAnalyzedCorpusRuntime with explicit canonicalSources,
canonicalTaxonomy, federalFixture, countyFixture and accordFixture inputs.
The eight configuration-dependent functions are syntheticApplicationPins,
validatePolicyRecord, validateCorpusSnapshot, createAnalyzedCorpus,
parseAnalyzedCorpus, serializeAnalyzedCorpus,
assertAnalyzedCorpusCompatibility and projectAnalyzedCorpus. Preserve their
complete bodies within the factory. Return all six public configured bindings,
including syntheticApplicationPins. Keep independent helpers, constants,
canonicalCorpusDigest and the error constructor singleton at module scope.

Import-safe scripts/configured-analyzed-corpus.mjs binds the unchanged
canonical JSON and fixtures once. Its companion declaration preserves the
original public signatures and core types. The legacy runtime retains all
12 exports and the legacy declaration all 34 bindings (12 values, 22 types);
new internal factory/interface names appear only at the new core path.
Preserve fixture provenance completion, digests and existing configuration
behavior; introduce no extra copying or freezing.

Move the complete synthetic-corpus orchestration into
scripts/synthetic-corpus-path.mjs, with direct configured-corpus composition
and pure core dependencies. Preserve all five legacy exports and bodies.
The two substantive intake callers are this orchestration and curated pack.
The latter receives createCuratedDocumentPackRuntime({parseAnalyzedCorpus})
in its new intake implementation. Only createInternal,
createCuratedDocumentPack and replayCuratedDocumentPack require factory scope.
scripts/configured-curated-document-pack.mjs binds that factory and explicitly
supplies the canonical parser. Keep its error class,
constants, serializer and denial helper singleton; preserve all seven
legacy exports. No curated/synthetic declaration or wrapper paths beyond
the exact lease below are introduced.

Pure core projection receives createProjectionRuntime(configuration).
ProjectionConfiguration contains readonly sourceRegistry.sources entries
{id,synthetic} and taxonomy {taxonomyVersion,categories:[{id,
subcategories:[{id}]}]}. Its ProjectionRuntime preserves the exact existing
parseProjectionProfileBundle and createEngineProjection signatures.
Only validateBundleGraph, parseProjectionProfileBundle,
validateProjectionRecords and createEngineProjection need configuration
scope. Serializer, error class, independent helpers and nonclaim constant
remain module-global. Core imports only existing core contracts/types.

The new context implementations import the actual pure core factory,
serializer/constants and types. createGeographyRightsRuntime receives
ProjectionConfiguration and returns the existing creator; its independent
parser remains a direct module export. createTaxonomyRuntime receives
{taxonomyConfig,projectionConfiguration}, using existing core TaxonomyConfig,
and returns the existing parser and creator. Its captured functions are
validateNamespaces, validateRetainedTaxonomyReference, validateConcepts,
validateLocalGraph, parseTaxonomyBundle, validateEngineProjection and
createTaxonomyProjection. Preserve all other bodies and singleton identities.
scripts/configured-engine.ts binds existing configuration explicitly and
exports the original APIs. Each old projection/geography/taxonomy path retains
exactly five runtime exports. There is no core-to-context cycle and no
implementation import through a configured legacy facade.

Source-pack is composition: it combines intake contracts, context parsers
and projection profiles. Move its complete implementation into
scripts/source-pack.ts, adjusting only required relative imports/URLs.
Its old path becomes an explicit six-export facade. Context types remain
in their original context contract files. Preserve validation order,
predecessor restrictions, error identity, freezing, request tuples, fingerprints
and all six public signatures. No new source-pack helper or shared contract
is added.

Each of four adapters moves its complete implementation to same-directory
adapter.ts. Retain the class, factory, exact prototype checks, source-registry
replacement with context.source, mandatory policy validator, receipts,
transport bounds, errors, caller-validator ordering and mutation refusal.
Remove only its implicit taxonomy import. Its internal refresh function adds
a required final TaxonomyConfig argument and the suffix WithTaxonomy.
scripts/configured-source-refresh.ts binds the unchanged canonical taxonomy
and exports the original three-argument refresh functions. Existing indexes
retain all sibling named reexports and explicitly reexport class/factory/
validator type from adapter.ts plus the original refresh name from composition.
Do not expose an internal refresh name through an old entry.

Move only SourceRefreshSuccess, SourceRefreshFailure and SourceRefreshResult
unchanged into src/core/source-refresh.ts. source-adapter.ts preserves their
explicit type reexports; last-known-good.d.mts imports core. Last-known-good
runtime is untouched.

## Exact source leases

Worker A owns exactly 25 paths:

- src/core/analyzed-corpus.mjs
- src/core/analyzed-corpus.d.mts
- src/pipeline/analyzed-corpus.mjs
- src/pipeline/analyzed-corpus.d.mts
- scripts/configured-analyzed-corpus.mjs
- scripts/configured-analyzed-corpus.d.mts
- scripts/synthetic-corpus-path.mjs
- src/pipeline/synthetic-corpus-path.mjs
- src/modules/intake/curated-document-pack.mjs
- src/pipeline/curated-document-pack.mjs
- scripts/configured-curated-document-pack.mjs
- src/core/projection.ts
- src/engine/projection.ts
- src/modules/context/geography-rights.ts
- src/engine/geography-rights.ts
- src/modules/context/taxonomy.ts
- src/engine/taxonomy.ts
- scripts/configured-engine.ts
- tests/pipeline/analyzed-corpus.test.mjs
- tests/pipeline/synthetic-corpus-path.test.mjs
- tests/pipeline/curated-document-pack.test.mjs
- tests/engine/projection.test.ts
- tests/engine/projection-non-interference.test.ts
- tests/engine/geography-rights-non-interference.test.ts
- tests/engine/taxonomy-non-interference.test.ts

Worker B owns exactly 16 paths:

- src/adapters/federal-register/index.ts
- src/adapters/federal-register/adapter.ts
- src/adapters/supreme-court-opinions-curated/index.ts
- src/adapters/supreme-court-opinions-curated/adapter.ts
- src/adapters/washington-centennial-accord/index.ts
- src/adapters/washington-centennial-accord/adapter.ts
- src/adapters/washington-governor-executive-orders/index.ts
- src/adapters/washington-governor-executive-orders/adapter.ts
- scripts/configured-source-refresh.ts
- src/core/source-refresh.ts
- src/pipeline/source-adapter.ts
- src/pipeline/last-known-good.d.mts
- tests/adapters/federal-register/adapter.test.ts
- tests/adapters/supreme-court-opinions-curated/adapter.test.ts
- tests/adapters/washington-centennial-accord/adapter.test.ts
- tests/adapters/washington-governor-executive-orders/adapter.test.ts

Worker C owns exactly nine paths, source-pack and enforcement:

- scripts/source-pack.ts
- src/engine/source-pack.ts
- tests/engine/source-pack-non-interference.test.ts
- tests/engine/source-pack-composition.test.ts
- tests/architecture/module-manifest.mjs
- tests/architecture/module-manifest.d.mts
- tests/architecture/module-boundaries.test.ts
- tests/architecture/module-graph.ts
- tests/architecture/module-graph.test.ts

Root owns ROADMAP.yaml, this handoff, the autonomous run record,
docs/architecture/module-boundaries.md and the GD-09 handoff. The last
handoff changes only for the separate acceptance transition. Root alone
writes the index and commits and serializes native validation.
Workers are not alone in the repository; preserve concurrent changes,
do not revert another worker's edits and do not expand a lease.
Workers run no test/validation processes, stage nothing and commit nothing.
Return all leases before root formats or validates source.

## Enforcement contract

Keep every existing module classification and public/private entry rule.
Recognize only the three new exact TypeScript composition roots:
scripts/configured-engine.ts, scripts/configured-source-refresh.ts and
scripts/source-pack.ts. Retain the existing scripts/*.mjs composition rule.
Name reviewed executable roots separately from composition declarations,
including configured-analyzed-corpus.d.mts. Ordinary module implementations
cannot reach either kind through a facade or an unclassified relay.

Every approved facade has an exact path and a complete static binding table:
resolved target, imported/exported names and type-only status. Permit only
those source-bearing named export declarations; reject imports, local
statements/initializers, extra names/targets and export *. Permission applies
only to that facade's outgoing bindings. Keep old classified paths classified;
moving substantive code to an unclassified location is allowed only for the
explicit composition responsibilities above.

Freeze legacy names and type status from the pre-GD-10 checkpoint, not from
the refactored facade being tested. Root's passive TypeScript AST inventory
at 8b97383 records counts 12/34/5/7/5/5/5/6 for the eight corpus/engine paths
and 79/40/33/36 for the four adapter entries. Its external immutable
gd10-legacy-export-inventory.json is preparation evidence, never product data.
Retain each existing adapter sibling target. Local class/factory/validator
bindings go to adapter.ts; refresh bindings go to configured-source-refresh.
For corpus, configured six methods go to configured-analyzed-corpus and
all other values/types to pure core. Curated creator/replay go to configured
composition and other values to intake. Profile parser/creator go to configured
engine, geography creator and taxonomy parser/creator likewise; their other
bindings go to pure implementations. Synthetic/source-pack bindings go to
their designated composition roots. Implementation tests compare actual
direct/configured/legacy binding identity and exact export surfaces.

The new pure test helper receives a fresh injected file inventory. Its
runtime exports are collectModuleLoads, resolveRepositoryTargets,
validateLegacyFacade, analyzeModuleBoundaries and walkRepositoryReachable,
with readonly result/diagnostic types. It performs no filesystem mutation.
The real harness supplies repository files. Match every new manifest export
in its existing declaration.

Resolve all existing compatible runtime/source/declaration targets, including
.js to .ts/.tsx/.d.ts and .mjs to .mts/.d.mts, rather than stopping at the
first existing file. Use the same resolver for module and public/private checks.
Include named export-from, import types, literal dynamic imports and recognized
loader aliases. Computed repository loaders and unanalysable loader escapes
fail closed; legitimate literal Node/package loading remains allowed.
Follow unclassified intermediaries to the next classified target and apply
the originating module's rule. Inspect that target's own outgoing edges
under its own classification. Composition-bound facades are explicit barriers
for ordinary implementations. Public/private traversal follows all paths
without facade or composition exemptions.

Remove the 16 substantive audit allowances; only reviewed compatibility
facades may carry explicit exceptions. Report the actual strict graph,
not an inferred zero. Passive inventory found no extra current relative
.js imports, import types or computed local loaders, but was not an
AST-complete graph result. A stricter actual finding requires diagnosis
and a concrete root-reviewed lease amendment before another path changes.

## Verification and stop conditions

Extend existing static source inventories to the actual relocated
implementations and configured roots; empty facade-only scans are insufficient.
Keep every existing fixture, assertion and deadline. Characterize exact
runtime/type surfaces and singleton identities, canonical serialized output
and digest equivalence, explicit configuration mismatch refusal, curated
synthetic/real-source boundaries and atomic predecessor/request failures.

For each adapter compare canonical wrappers with directly configured refresh
using separate synthetic instances; prove mandatory policy validation receives
the canonical taxonomy and context.source registry, and that refusal precedes
the caller validator. Preserve transport counts, exact-prototype refusals,
failure stages/messages, mutation barriers and last-known-good behavior.
Typecheck proves legacy/core result declarations remain equivalent.

Synthetic graph regressions cover suffix substitutions and simultaneous
runtime/declaration traversal; hidden private edges in declarations, import
types, exports and unclassified relays; exact facade acceptance versus extra
export/initializer/target and implementation-to-composition refusal; direct,
aliased/chained and escaping/computed loaders; legitimate Node and
createRequire/playwright-core use; legal edges and cycle termination; and
private barrel/module detection through facades/composition.

Root serially runs focused affected suites and guard/non-interference checks,
lint/typecheck, complete npm test, synthetic build/artifact, standing checks,
protected hashes and independent source/acceptance review. Existing failed
receipts remain immutable, including the protected ignored-settings global
format failure. Never claim an aggregate check pass while that failure remains.

Stop at the binding section 9.3 conditions: protected/private/K0/S0/O0 byte
changes, weakened pinned tests, new config JSON, changed sealed 2.0 replay,
network/source activation or land fields. Do not broaden this lease to renew
historical observer pins or grants. This step proves local architecture
enforcement, not source qualification, official Nation evidence, general-engine
release acceptance or publication.

## Selection checkpoint and pause

The exact five-document selection checkpoint is committed locally as
`84cf62c0aa2b70510a8045a04fe80d139131c1fe`. Independent reviewers found no
substantive scope blocker. One wording ambiguity about the leased configured
curated-pack composition root was clarified before the final scoped formatting
check (ROADMAP.yaml under repository ignore rules), whitespace check on all five
paths, roadmap validation and backbone validation; all passed. Full GD-09 test
and standing-check evidence is recorded in
`docs/development/2026-10-07-autonomous-run.md`.

The owner paused the autonomous run before any GD-10 source lease was issued.
GD-10 remains the sole active item. On explicit continuation, confirm the
worktree and protected files, then issue only the three reviewed disjoint
source leases (25/16/9). If the actual strict graph requires paths outside this
manifest, stop for diagnosis and a reviewed amendment before changing them.
