# PNW-05 source-pack core coordination and evidence

Date: 2026-09-02  
Work item: `PNW-05-SOURCE-PACK`  
Authorized slice: `PNW-05-SOURCE-PACK-CORE`  
Contract freeze: `PNW_05_CORE_CONTRACT_FREEZE`  
Status: structural core complete; source onboarding authorization required

## Authority and outcome boundary

The owner authorized one local, offline, synthetic-only structural core. It may
compile a governed declarative source-pack bundle into a deterministic,
immutable, reference-only admission plan. It may not access a source, accept
terms, qualify or activate a real source, ingest records, refresh data, execute
last-known-good behavior, build an analyzed corpus, publish an artifact, change
a remote, add a dependency, or begin PNW-06 or PNW-07.

Passing this slice records structural evidence under the existing parent
`PNW-05-SOURCE-PACK`; it does not create a child roadmap ID and does not
complete the parent. `G-PNW-SOURCE-ACTIVATION` remains closed for every real
source. The terminal state must have zero active work, leave PNW-06 and PNW-07
not started, and leave PNW-05 non-complete and ready only for a separately
authorized named-source onboarding tranche or truthfully evidence-blocked if
the final validator-compatible ledger state requires that wording.

## Reconciled starting custody

- Branch: `main`.
- Starting HEAD: `45c8756163dafa96e17bc17d31aefe16e11d1a25`.
- Starting parent: `8fd1931bf05e6ab3bc93f5d25b18030101fd7269`.
- Worktrees: one, at `I:/policy-sentinel`.
- Remotes: none.
- Tracked and staged state: clean; no Git index lock.
- PNW-01 implementation/evidence ancestors:
  `2ca77547675c3f757fb951bbbe800acba964ddc8` and
  `e1285c7eea66a0e948fd511fdb4ea54fcb8bc852`.
- PNW-03 implementation/evidence ancestors:
  `712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a` and
  `d0f201eddd31a941b7d1ec40d64a11d526f5063c`.
- PNW-04 implementation/evidence ancestors:
  `8fd1931bf05e6ab3bc93f5d25b18030101fd7269` and
  `45c8756163dafa96e17bc17d31aefe16e11d1a25`.
- The PNW-04 implementation and evidence manifests are the exact recorded
  14-path and five-path manifests. Dedicated PNW-01, PNW-03, and PNW-04 schema,
  runtime, fixture, and test paths match their accepted implementation bytes.
- K0: Git blob `fc42d19220ff354405f1325e2451ea40e8ca247d`,
  28,667 bytes, SHA-256
  `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d`.
- S0: Git blob `52ecbd7895748d02e757a1fb6f91e6764ac8c6ff`,
  41,506 bytes, SHA-256
  `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.
- O0: Git blob `39a340d04f87017a7ebdb2ac3585682048e323ed`,
  116,551 canonical LF bytes, SHA-256
  `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381`.
- Baseline roadmap validation: 63 work items, 41 gates, 14 roadmap
  source-register entries, 23 binding paths; 32 complete, zero in progress, one
  ready, 16 blocked, zero deferred, and 14 not started.
- Baseline backbone validation: 12 schema IDs, 807 references, 63 Markdown
  files, and 246 links.
- Baseline foundation validation: 11 compiled contract schemas. The twelfth
  backbone schema is the artifact schema, which has its own artifact validator.
  Adding the source-pack schema is expected to produce 12 foundation-compiled
  contract schemas and 13 backbone schema IDs.

### Protected untracked owner inputs

These bytes were frozen before the first write and must remain unmodified,
unstaged, and uncommitted:

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/00-READ-FIRST.md` | 4,672 | `88f6967bf9655c02e2b598011f437e9c0ed7415b3c722fe537ffa7171095f6fa` |
| `docs/01-NORTH-STAR-AND-PRODUCT-CONTRACT.md` | 5,347 | `22738dfd2d2362cffd5071d2553aea907ded5b0f734c917dcf6b4b1a80da9b52` |
| `docs/02-PNW-REGIONAL-SCOPE-AND-AUTHORITY.md` | 5,795 | `b0f9dfd54b126cd94f6236976edd20c66f697a665236a5a17eafc863090f3556` |
| `docs/03-ENGINE-ARCHITECTURE-AND-DATA-MODEL.md` | 8,000 | `67abb72b8f3c816af0c9582a34ced6da0f74cbd986f6339c7e9e01171e0bfe9b` |
| `docs/04-DEFINITION-OF-DONE-AND-ACCEPTANCE.md` | 6,566 | `0ca69a5f78e5e0f6fc21e4786f77228b033afab2f54755d1b30ee63492645a41` |
| `docs/05-ROADMAP-REBASE-PROPOSAL.yaml` | 10,216 | `7a015459d1d7a5c5cbce161b3076645978d7967bafdb824856b2e7aa06cf4add` |
| `docs/06-REPRESENTATIVE-USE-CASES.md` | 5,124 | `ba7bd9911f6a8f5b5a7eaba17de366f03d1f298e7648d463fe5a456781d55965` |
| `docs/07-DECISIONS-GATES-AND-NON-GOALS.md` | 4,900 | `9677dfe181f64db80009bd3bf469b3aef756e9cc3829536bc2461c0d8c9e012a` |
| `docs/08-CODEX-LONG-RUN-DIRECTIVE.md` | 11,578 | `afdefa2dc2bfdea37edd345ceef07dd11b97a910e45e2b5c51d052035533b29f` |
| `docs/09-PASTE-INTO-CODEX.txt` | 1,728 | `e4902fb1ce2ff067c27f5fa272aef6152301d4d5309d132311da0bd78ebeecdc` |
| `docs/10-CODEX-PRODUCT-SPACE-REBASE-CONTINUATION.md` | 8,966 | `0110be885473a7b5287eaa7cc8ff864b10a21409b2f62b5d8bb667a8ae2b68b3` |
| `docs/11-CODEX-REPOSITORY-CONGRUENCE-AND-LONG-RUN-HANDOFF.md` | 35,950 | `9a49eecddbc626190e7d5a9f445c0e14348d2aa63fb4c0edc6f757572c6cadc3` |
| `docs/12-CODEX-PNW-03-GEOGRAPHY-RIGHTS-IMPLEMENTATION-LONG-RUN.md` | 37,295 | `84fcb0bf60021c75c7e87b2b61d1e8b066b3c9b63a7ecf4a7dfd1e49315d9959` |
| `docs/13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md` | 43,718 | `e82c88fddd781e2fffccb8871c1dc30502ebf7838d0efb167d4a50a6e6e0555a` |
| `docs/14-CODEX-PNW-05-SOURCE-PACK-CORE-LONG-RUN.md` | 53,887 | `6146b2e478caf484e702e48f4412d2cbeb8f461212f53cf63862e61d573c12f6` |

The predecessor record accounted for paths 00 through 13. Path 14 is the
expected new owner authorization input. No completed owner closeout response
was present. Historical evidence did not independently freeze the per-file
hashes for owner paths 09 and 11; their live hashes above are the PNW-05
baseline. This limitation is not an observed mismatch.

## Frozen positive capability and non-capabilities

The additive core exposes a schema-validated parser and a pure planner. Given
one source-pack bundle, one already validated PNW-01 profile bundle, an exact
request tuple, and optional already governed PNW-03/PNW-04 bundles, it validates
the whole graph before projection and returns a detached, recursively frozen,
canonically ordered reference plan.

The frozen public names are
`SOURCE_PACK_BUNDLE_SCHEMA_ID`, `SOURCE_PACK_BUNDLE_SCHEMA_VERSION`,
`SourcePackValidationError`, `parseSourcePackBundle`,
`serializeSourcePackBundle`, `createSourcePackAdmissionPlan`,
`serializeSourcePackAdmissionPlan`, and
`assertSourcePackPlanCompatibility`. The planner signature takes, in order,
the PNW-01 profile-bundle input, source-pack-bundle input, request input, and an
optional object containing `geographyRightsBundle` and/or `taxonomyBundle`.
There is no overload that accepts a prior plan as authority.

The request tuple is exactly: profile-bundle reference, region reference,
deployment reference, persona reference, output-adapter reference, PNW-05
access-context reference, disclosure ceiling, requested operation, explicit
canonical UTC `asOf`, and a normalized non-empty set of opaque coverage-slot
references. `assertSourcePackPlanCompatibility` must reject reuse after any
semantic tuple change with `PLAN_CONTEXT_MISMATCH`; a slot-order permutation is
the one non-change.

The module has no URL, header, credential, body, payload, callback, adapter,
network client, timer, implicit clock, record, corpus, refresh, retry, cache,
cursor, staleness, last-known-good, K0, S0, O0, or public-artifact behavior.

## Frozen identity and reference model

- Schema ID: `https://policy-sentinel.invalid/schemas/source-pack-bundle.schema.v1.json`.
- Schema version: `1.0.0`.
- Bundle trust domain: exact `synthetic_test_only`.
- Bundle lifecycle state: exact `synthetic_test_configuration`.
- Canonical source identity is the exact pair `sourceId` plus
  `sourceRegistryVersion`. The global registry version is the configuration
  version. An adapter version never substitutes for it.
- Runtime resolution must find the exact pair in the existing canonical
  registry, require `synthetic: true`, fixture access, and fixture adapter
  module, and reject real or mixed identities. Pack-local source descriptors,
  names, providers, terms, URLs, publisher jurisdictions, and `enabled` flags
  are forbidden. Registry `enabled` state is not admission proof.
- All source-pack catalogs use stable IDs and semantic versions. IDs are
  globally unique across catalog kinds. References include expected kind, ID,
  and version where ambiguity is possible. Every reference is resolved against
  the complete graph before an eligibility decision. Duplicate, dangling,
  wrong-kind, wrong-version, cross-source, cross-context, cross-jurisdiction,
  cross-deployment, cross-profile, and cross-trust references reject atomically.
- Bundle equality is exact semantic identity plus canonical bytes. Label or
  member overlap is never equality. Object keys and all set-like arrays use
  Unicode code-point ordinal ordering, not locale-sensitive comparison.
- Canonical JSON recursively orders object keys and the explicitly set-like
  arrays named below. A pure, browser-safe SHA-256 implementation fingerprints
  canonical authorized plan bytes; no Node, WebCrypto, pipeline, or external
  hashing dependency is permitted. A requester-visible fingerprint is computed
  only from that requester's authorized projection. No full-graph or hidden
  member digest is returned.

## Frozen closed catalogs and vocabularies

The root bundle has only: `$schema`, `schemaVersion`, `id`, `version`,
`synthetic`, `trustDomain`, `lifecycleState`, `profileBundleRef`,
`configurationAuthorityBindingRefs`, `sourceContexts`, `jurisdictionContexts`,
`accessContexts`, `authorityBindings`, `evidenceReceipts`, `contractReceipts`,
`coverageDeclarations`, `reviewAttestations`, `admissionReceipts`,
`availabilityObservations`, `healthObservations`, `sourceBindings`, and
`deploymentBindings`. Every catalog member has `id`, `version`, and
`synthetic: true`. Unknown properties are rejected.

Closed vocabularies:

- Source-context role: `federal_context`, `state_context`,
  `regional_intergovernmental_context`, `other_opaque_context`.
- Jurisdiction-context kind: `opaque_monitoring_context` only, with
  `publisherJurisdictionEquivalence: not_asserted` and an exact PNW-01
  configured-jurisdiction reference. This is not a publisher jurisdiction and
  cannot create geographic, legal, political, membership, or coverage facts.
- PNW-05 disclosure: `public`, `internal`, `restricted`. This is a separate
  synthetic-test overlay anchored to PNW-01 persona/output references; PNW-01
  itself still supplies only public visibility and is not claimed to define
  this lattice.
- Evidence class: `repository_authored_synthetic_test` only.
- Evidence kind: `synthetic_fixture_identity`,
  `synthetic_contract_structure`, `synthetic_coverage_declaration`, or
  `synthetic_configuration_authority`.
- Contract qualification: `synthetic_test_qualified` only. Provider layer is
  `synthetic_fixture_reference`; internal layer is
  `closed_normalized_reference`; public layer is `reference_only_no_payload`.
  Fixture fingerprints bind structure only and can never prove provider
  behavior. `observed_provider_behavior` is not an allowed evidence class.
- Review state: `synthetic_test_accepted`, `synthetic_test_pending`, or
  `synthetic_test_rejected`.
- Admission state: `synthetic_test_admitted`, `pack_binding_disabled`,
  `not_admitted`, `expired`, or `revoked`.
- Operation: `acquisition`, `retention`, `transformation`,
  `internal_analysis`, `redistribution`, or `public_projection`. Grants are
  independent; no grant implies another.
- Coverage state: `covered`, `partial`, `outside_coverage`,
  `unknown_coverage`, or `not_assessed`.
- Availability state: `available`, `unavailable`, `not_observed`, or `unknown`.
- Health state: `healthy`, `degraded`, `failed`, `not_observed`, or `unknown`.
- Observation scope: `source`, `jurisdiction`, or
  `source_within_jurisdiction`.
- Predecessor reference kind: `geographic_relation`, `rights_frame`, or
  `taxonomy_namespace`.

The exact source-binding proof is: canonical synthetic source pair + matching
contract receipt + typed evidence + matching reviewed coverage declaration +
synthetic configuration authority + accepted synthetic-test reviews + exact
context/jurisdiction/deployment scope + current synthetic-test admission. A
source binding contains references only. Contract, coverage, evidence, review,
authority, and admission objects occur once in their root catalogs.

Contract receipts bind the exact source pair, adapter ID/version resolved from
that canonical registry entry, structural fixture fingerprint, distinct layer
states, evidence references, qualification, and validity interval. Evidence
receipts state exactly which synthetic structural role they support and carry
an exact typed contract, coverage, or authority subject. Each receipt must have
exactly one primary consumer in those three catalogs; review references are
secondary exact views and never another primary evidence scope. Review
attestations bind an exact contract or coverage subject, authority binding,
evidence references, state, review time, and validity interval. Admission
receipts bind the exact source, contract, coverage, authority, accepted review
references, source context, jurisdiction context, PNW-01 deployment/region/
persona/output references, independent operation grants, state, and validity
interval. Every review referenced by one admission must target that exact
admission contract or coverage declaration, and the review instant must fall
within the exact subject, evidence, and configuration-authority proof
intervals.

Coverage declarations bind the exact source, source context, jurisdiction
context, evidence, and a non-empty set of exact opaque `{slotRef, state}`
entries. Coverage states never create a real-world topic or geography. `partial`
remains partial even when several declarations are combined; the output never
claims complete regional coverage and never emits a percentage or readiness
score.

Availability and health are separate immutable observation catalogs. Each
observation has a typed scope key, exact deployment, `observedAt`, and one state.
For one binding the three independently required keys are source,
jurisdiction, and source-within-jurisdiction. Eligibility requires every latest
availability state to be `available` and every latest health state to be
`healthy`. The latest observation at or before request `asOf` wins; equality is
included, future observations are ignored, absence becomes `not_observed`, and
different states at one exact key/time reject the graph. These facts never
derive from record counts and have no refresh or last-known-good semantics.

Optional PNW-03 geographic-relation/rights-frame and PNW-04 taxonomy-namespace
references must resolve by exact bundle/object identity against separately
validated predecessor bundles. They are carried as compatibility references
only. In this v1 seam, a PNW-03 predecessor must have both public visibility
and public sensitivity; a rights frame must additionally approve
`source_reference` use and the `public` audience. Adding or removing permitted
references cannot change source admission, coverage, association, relevance,
jurisdiction, applicability, rights, legal meaning, or activation.

## Frozen eligibility, gaps, and disclosure

For each visible binding and requested slot, eligibility is the conjunction of:

1. exact canonical synthetic source/configuration resolution;
2. exact membership in the requested PNW-01 region;
3. current `synthetic_test_qualified` contract and supported evidence;
4. current configuration authority and accepted synthetic-test reviews;
5. current `synthetic_test_admitted` admission;
6. admission persona and output equal the exact request tuple;
7. exact independent operation grant;
8. applicable `covered` or `partial` declaration for that slot;
9. all three availability scopes equal to `available`;
10. all three health scopes equal to `healthy`; and
11. requested access context and disclosure ceiling authorize the binding.

The closed ordered exclusion reason vocabulary is:
`PACK_BINDING_DISABLED`, `NOT_ADMITTED`, `ADMISSION_NOT_CURRENT`,
`PERSONA_NOT_GRANTED`, `OUTPUT_NOT_GRANTED`, `OPERATION_NOT_GRANTED`,
`OUTSIDE_DECLARED_COVERAGE`, `COVERAGE_UNKNOWN`, `COVERAGE_NOT_ASSESSED`,
`SOURCE_UNAVAILABLE`, `AVAILABILITY_NOT_OBSERVED`, `AVAILABILITY_UNKNOWN`,
`HEALTH_NOT_OBSERVED`, `HEALTH_UNKNOWN`, `HEALTH_DEGRADED`, and
`HEALTH_FAILED`. Multiple independent failures are all retained in this fixed
order. Invalid trust or reference graphs are errors, not gaps.

An authorized plan contains exact request context, eligible source-binding
references with their proof references and per-slot declared state, permitted
source-specific exclusions, one typed gap per unserved requested slot, and a
`partial` gap for a slot served only by partial eligible bindings. Gap states
are `partial`, `unavailable`, `disabled`, `not_admitted`, `outside_coverage`,
`unknown_coverage`, `not_assessed`, `availability_unknown`, `health_unknown`,
`not_observed`, `unhealthy`, or `opaque_coverage_gap`. Observed unknown states
are never relabeled as missing observations. Every gap states
`notEvidenceOfAbsence: true`.

Access is evaluated before identity-bearing output. A binding above the
requester's PNW-05 disclosure ceiling contributes no identity, count, reason,
timestamp, catalog metadata, or digest input. If no authorized eligible binding
serves a requested slot, the plan emits exactly one slot-scoped gap. Its state
is derived only from authorized visible bindings; if none are visible it is the
constant `opaque_coverage_gap`. Adding, removing, renaming, reordering, or
changing a hidden binding must leave every unauthorized serialized byte and
fingerprint identical, including when the global source-pack bundle version is
correctly changed. The disclosure-scoped plan therefore omits the global
bundle identity/version; its authorized member references and fingerprint are
the compatibility evidence.

## Frozen atomicity and immutability rules

The parser validates schema shape, synthetic trust, canonical source
resolution, every catalog identity, and complete graph closure before returning
or evaluating. Errors expose stable codes and structural paths but never echo
attacker-controlled IDs or values. A late malformed or hidden catalog member
rejects without a partial plan or fingerprint.

Input bundles and optional predecessors are never mutated. Successful parsed
bundles and plans are deep detached copies and recursively frozen. Prior plans
and predecessor bytes remain unchanged after success or failure. Caller
mutation after return, and nested mutation/delete/splice/`defineProperty`
attempts against output, cannot change serialized bytes.

## Frozen synthetic fixture strata

The valid source-pack fixture is schema-valid but is resolved in runtime tests
against a test-local PNW-01 profile variant. The variant is created in test
memory by cloning the accepted profile fixture, assigning a new synthetic
bundle identity, and adding only existing canonical synthetic registry IDs to
region source sets. It is parsed by the unchanged PNW-01 validator, is never
committed as a second profile fixture, and the accepted profile fixture's bytes
must be identical before and after every test.

The matrix uses only the canonical `synthetic-federal`, `synthetic-county`, and
`synthetic-state-accord` source IDs. It gives two distinct canonical sources a
`state_context` role under two different opaque monitoring-jurisdiction
references without changing or restating their publisher jurisdiction. A
separate neutral `regional_intergovernmental_context` role is configuration
only and names no real organization, Nation, geography, policy topic, law, or
community. It contains at least two eligible sources, one partial but useful
source, one unavailable source/context, and distinct disabled and not-admitted
bindings. One canonical source is healthy in one context and unavailable or
outside coverage in another. An optional exact PNW-04 source-native namespace
reference may be tested through an in-memory parsed predecessor variant.

Opaque slot IDs are neutral structural tokens. Fixtures contain no real source
record, source endpoint, provider, organization, Nation, community, policy,
law, case, grant, geography, land, person, contact, credential, raw response,
or private data.

## Frozen adversarial and metamorphic tests

The three focused test files must predeclare and prove:

1. schema-valid representative fixture and closed unknown-key rejection;
2. every malformed inventory case fails its expected schema/runtime class;
3. real/mixed source identity, wrong registry version, adapter-version
   substitution, production-shaped receipt, and copied source truth reject;
4. duplicate global IDs and dangling, wrong-kind/version, cross-source,
   cross-context, cross-jurisdiction, cross-deployment, cross-profile, and
   cross-trust references reject atomically;
5. `enabled` or adapter presence without proof cannot admit a source;
6. documentation/structural evidence cannot claim observed provider behavior;
7. evidence subjects and kinds must match, every receipt has exactly one
   primary consumer, cross-context/deployment reuse rejects, and reviews remain
   secondary exact views;
8. persona, output, and operation grants are independently exact to the
   request;
9. two eligible sources, partial usefulness plus a partial gap, unavailable
   isolation, disabled and not-admitted distinction, and per-slot non-absence
   gaps are non-vacuous;
10. available+failed, unavailable+healthy, observed availability-unknown,
   observed health-unknown, missing/future/exact-boundary observations, and
   conflicting equal-time observations remain distinct;
11. source, jurisdiction, and source-within-jurisdiction changes affect only
    exact dependent slices;
12. complementary partial sources and added unavailable sources never create
    complete-region claims or improve completeness;
13. hidden binding add/remove/change/reorder variants and a hidden-only change
    with a global bundle-version bump are byte-identical for an unauthorized
    request, including fingerprint and metadata;
14. request changes for operation, deployment, `asOf`, slot, persona, output,
    access context, or disclosure fail plan compatibility; slot reordering does
    not;
15. reverse-order and object-insertion-order variants produce identical
    canonical bytes and fingerprints under ordinal comparison;
16. late failure produces no partial output and never mutates inputs,
    predecessors, or an earlier plan;
17. returned JSON containers are detached and recursively frozen;
18. optional PNW-03/PNW-04 references resolve exactly but cannot alter admission
    or coverage; restricted PNW-03 references and rights frames without public
    source-reference approval reject;
19. no network/timer/implicit-clock/import edge exists; a `fetch` spy records
    zero calls;
20. accepted PNW-01/03/04 fixture bytes and focused behavior remain unchanged;
21. ordinary fixed-time builds contain no source-pack fixture, identity,
    receipt, admission, slot, gap, or marker and two inventories are identical.

The final independent auditor must also answer the 16 audit questions recorded
by the isolation reviewer: exact registry-pair semantics; kind/version closure;
whole-graph validation; three-scope health rules; independent state axes;
equal-time conflict handling; per-slot explicit gaps; no completeness upgrade;
hidden-byte invariance; mechanical replay rejection; predecessor non-inference;
deep detachment/freeze; closed JSON/schema/runtime parity; dependency/network
incapability; predecessor and ordinary-artifact invariance; and terminal
roadmap/gate truthfulness.

## Frozen authorized path manifest and leases

Implementation commit, exactly 14 paths:

1. `schemas/source-pack-bundle.schema.v1.json`
2. `src/engine/source-pack-contracts.ts`
3. `src/engine/source-pack.ts`
4. `src/engine/index.ts`
5. `fixtures/engine/source-pack.synthetic.valid.json`
6. `fixtures/engine/source-pack-malformed.invalid.json`
7. `tests/engine/source-pack-schema.test.ts`
8. `tests/engine/source-pack.test.ts`
9. `tests/engine/source-pack-non-interference.test.ts`
10. `scripts/validate-foundation.mjs`
11. `scripts/validate-backbone.mjs`
12. `tests/pipeline/backbone-validator.test.mjs`
13. `docs/architecture.md`
14. `docs/data-contract.md`

Evidence commit, exactly five paths:

1. `ROADMAP.yaml`
2. `docs/PROJECT-BACKBONE.md`
3. `docs/continuation-prompt.md`
4. `docs/development/PNW-05-SOURCE-PACK-CORE-COORDINATION-2026-09-02.md`
5. `docs/handoffs/pnw-source-pack-core-2026-09-02.md`

No one-to-one substitution is currently used. All listed source, fixture, test,
validator, and documentation files are authored. `dist/` and `.cache/` remain
generated, ignored, ephemeral, and uncommitted.

- Agent 4 lease: paths 1-3 only (schema and the two source-pack runtime/type
  modules). No fixtures, tests, export, validator, shared docs, roadmap,
  evidence, owner input, or commit.
- Agent 5 lease: paths 5-9 only (two fixtures and three focused tests). No
  runtime, schema, export, validator, shared docs, roadmap, evidence, owner
  input, or commit.
- Lead lease: paths 4 and 10-14, plus the five evidence paths. The lead is the
  sole committer and integration/terminal-judgment owner.
- Agents 1-3 and Agent 6 are read-only. No agent may spawn a child or expand a
  lease. Concurrent edits outside these disjoint leases stop the run.

## Validation and stop contract

Iteration uses only focused source-pack tests, directly affected PNW-01/03/04
regressions, foundation/backbone validation, and the directly affected
validator test. Once candidate bytes stabilize, run the required staged checks,
independent audit, two fixed-input build inventories, and one terminal serialized
`npm run check`. Do not change timeouts or test configuration to hide failures.

Any need for a registry edit, accepted predecessor schema/fixture/runtime edit,
new dependency, path expansion, real source evidence/access/terms/content,
PNW-06/07 behavior, K0/S0/O0 convergence, remote, deployment, publication, or
private/person-bearing data stops this tranche. So does an unresolved custody,
semantic, sovereignty, privacy, disclosure, determinism, atomicity, or final
audit defect.

## Checkpoint log

- Pre-write custody and protected hashes reconciled.
- Three independent read-only audits completed. Their five pre-freeze blockers
  are closed here by the exact registry pair, test-local parsed PNW-01 variant,
  separate PNW-05 access context, three-scope static health/availability facts,
  projection-safe fingerprint, and mechanical plan-compatibility assertion.
- Contract, test matrix, path manifest, and write leases frozen before any
  implementation edit.
- Independent candidate audit initially returned `REJECT_PNW_05_CORE` with
  four finite proof-boundary defects. The contract was re-frozen before repair:
  the singular inert configuration-authority anchor became the exact canonical
  set `configurationAuthorityBindingRefs`, which must equal both the full
  authority catalog and the set actually used by admissions. This is a
  correctness repair within schema `1.0.0` before any commit, not a migration.
  Contract-structure fingerprints must now equal their exact evidence receipt;
  reviews must use the exact subject evidence role/reference; relied-upon
  reviews must have `reviewedAt <= asOf`; and every malformed case must assert
  a stable value-safe structural error path with numeric catalog positions
  redacted as `*`. Three new semantic adversarial cases and one future-review
  planner assertion predeclare the repairs. Renewed independent review is
  required before commit.
- A subsequent source-contract stability review found seven further material
  projection/proof defects before commit. The contract was re-frozen again to
  require public visibility/sensitivity for PNW-03 predecessors plus explicit
  public `source_reference` permission for rights frames; distinguish partial,
  observed-unknown, and not-observed gaps; bind every admission review to its
  exact contract/coverage and proof-valid instant; omit the global bundle
  identity/version from disclosure-scoped plans; match admission persona and
  output to the exact request; and bind every evidence receipt to one exact
  typed subject and exactly one primary contract/coverage/authority consumer.
  The valid fixture now splits reused public/glass authority and coverage
  receipts. Agent 6 then found two unconsumed-review scope gaps; catalog-level
  review validation now joins the exact authority configuration-evidence
  source to the reviewed subject source and joins coverage jurisdiction to the
  authority's configured jurisdiction even when no admission references the
  review. Accepted reviews must have exactly one admission consumer, while
  pending/rejected reviews must remain unconsumed. Agent 6 then found one
  split-deployment ambiguity; exact deployment-profile/region tuples are now
  globally unique before member traversal, with split-scope and member-order
  permutation coverage. The malformed inventory is 53 cases (18 schema, 31
  semantic, four projection), and the three focused suites pass 83 tests.
- Final Agent 6 review returned exact `APPROVE_PNW_05_CORE` with no material
  defect register. The lead then ran the required terminal serialized check and
  sealed the exact implementation manifest in commit
  `6f1475dfb72a432ccfe65b16e65035df25a933d3`. Agent 6 independently inspected
  that commit and returned exact `POST_COMMIT_PNW05_CORE_VERIFIED`.

## Terminal validation and commit evidence

- Focused PNW-05 suites: three files and 83 tests passed. PNW-01/03/04
  regression suites: nine files and 253 tests passed.
- Foundation: 12 compiled contract schemas, including one valid, 18
  schema-invalid, and 35 runtime-boundary source-pack cases. Final backbone: 13
  schema resources/IDs, 924 references, 64 canonical Markdown files, and 260
  local links.
- Hooks and the direct Node backbone suite each passed 9 of 9. Formatting,
  lint, typecheck, roadmap, backbone, source-boundary, diff, and artifact checks
  passed.
- Two ordinary parallel full-check attempts exposed only the repository's known
  unchanged 20-second nested pipeline-wrapper contention after 82 files and
  1,334 tests passed. The isolated wrapper passed 1 of 1 in 8.11 seconds, and
  diagnostics reproduced the same contention with all PNW-05 suites excluded.
  No timeout or test configuration changed.
- The required serialized `VITEST_MAX_WORKERS=1 npm run check` passed 83 files
  and 1,335 tests in 113.18 seconds, then built and validated three records,
  exactly 575 synthetic Nations, and eight assets at build ID
  `synthetic-91006af61ddfe9888fcb`.
- Two complete source-data builds at fixed generated time
  `2026-09-02T18:00:00.000Z` matched all nine relative paths, sizes, and SHA-256
  values at build ID `synthetic-c1d8d821528cac1f7efa`. The ordinary artifact
  contained no source-pack identity, configuration, receipt, admission,
  fixture, slot, gap, or marker. Temporary comparison files were removed.
- Implementation commit
  `6f1475dfb72a432ccfe65b16e65035df25a933d3`, parent
  `45c8756163dafa96e17bc17d31aefe16e11d1a25`, tree
  `210a1d78befe12c54d06eba4b5f888f533079b39`, contains exactly the frozen 14
  implementation paths. The separate evidence commit contains exactly the five
  frozen evidence paths.
- The final roadmap has 63 items and 41 gates: 32 complete, zero in progress,
  one ready, 16 blocked, zero deferred, and 14 not started. Parent PNW-05 is the
  one ready item because only its structural core is complete; PNW-06/07 remain
  not started, `G-PNW-SOURCE-ACTIVATION` remains closed, and every external or
  convergence gate remains closed.
- All 15 owner inputs match the frozen table above at end custody and remain
  untracked, unstaged, and uncommitted. K0, S0, O0, accepted PNW-01/03/04
  identities, dependencies, remotes, publication, deployment, and every
  forbidden operation remain unchanged.
