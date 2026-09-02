# O0 fixture orchestration contract candidate

Proposed contract version: `1.0.0`

Candidate status: byte sealing and independent review are governance actions
outside these bytes. This document is a proposed contract only. It is not an
accepted contract, review disposition, implementation authority, source
authorization, convergence decision, or release dependency.

## Authority, conformance, and interpretation

This candidate defines the narrow O0 authority granted on 2026-09-01. The
broader, non-binding O0 sketch in the long-running development program does not
control where it mentions discovery, fetch, normalization, production adapters,
public artifacts, or production refresh. O0 `1.0.0` is fixture-only.

No earlier accepted O0 preflight artifact or A01-A32 register exists in the
repository history. The owner's current requirements are the controlling
preflight. This candidate therefore defines the previously absent literal
grammars, preimages, directory names, continuation rules, failure vocabulary,
and acceptance IDs; it does not claim to recover historical text.

`MUST`, `MUST NOT`, `REQUIRED`, and `MAY` are normative. A future implementation
conforms only if a separately authorized review accepts these exact bytes and
every applicable A01-A32 assertion passes. Type declarations, schemas, fixture
files, code existence, or passing tests alone are not conformance.

Every O0 object is a recursively closed ordinary JSON value. Extra keys,
accessors, symbols, non-enumerable properties, sparse arrays, cycles,
non-finite numbers, negative zero, unsafe integers, non-plain prototypes, and
non-JSON values are rejected before semantic evaluation. Durable JSON is UTF-8
without BOM and is stored as the exact canonical bytes produced by
`ps-c14n-json-1`, with no trailing byte. Set-like arrays are explicitly sorted
by Unicode code-point order before canonicalization and are rejected, not
silently sorted, by validators. Semantic arrays whose order is named below are
never treated as sets.

SHA-256 means SHA-256 over the exact stated byte preimage. A digest is exactly
64 lowercase hexadecimal characters. A numeric version is exactly three
dot-separated non-negative decimal integers without leading zeroes except the
single digit `0`; prerelease and build suffixes are forbidden. Counts and
ordinals are safe non-negative integers within their stated bounds.

The canonicalization profile is exactly:

```json
{"id":"ps-c14n-json-1","version":"1.0.0"}
```

Its 41 UTF-8 bytes have SHA-256
`84b18f00f6ebdca3a2ef4723a11209dd619eb63823b24e7f0c3dc5be49b4d33a`.

The governance `contractCandidateId`, which identifies these Markdown bytes,
is distinct from the runtime `candidateId` defined below. The former is held
only in `ROADMAP.yaml`; it MUST NOT appear in or influence these bytes.

## Responsibility boundary and crosswalk

O0 is an isolated, removable, fixture-only, per-source-revision transaction and
custody kernel. It MAY own only:

- fixture-only source-plan admission;
- exact source, fixture-registry, fixture-executor, source-contract, schema,
  validation-profile, and K0-interface binding;
- deterministic logical time;
- bounded source-wide attempt transcripts;
- immutable candidate, source-outcome, run, promotion, resume, and cleanup
  receipts;
- content-addressed candidate custody;
- per-source promotion and append-only last-known-good lineage; and
- exact evidence a future D0 phase might consume without comparing generations
  or interpreting change.

O0 MUST NOT own or perform real source discovery, retrieval, transport, parsing,
or normalization; dynamic adapter loading; public artifact construction;
current source health or public last-known-good projection; B3 production
pipeline behavior; B10 refresh, scheduling, Actions, or release workflow; D0
comparison, change detection, alerting, urgency, or notification; or any Nation,
jurisdiction, relevance, legal-effect, rights, consent, affiliation, interest,
eligibility, or impact assertion. It MUST NOT introduce a database, backend,
service, queue, daemon, scheduler, telemetry channel, or external persistence.

The ownership crosswalk is exact:

| Boundary | Owns | Must not receive from O0 `1.0.0` |
| --- | --- | --- |
| Frozen K0 | Source-qualified identity, immutable provenance, facts, fact references, evidence, temporal values, and derived assertions through `src/kernel/assertions/index.ts` | Promotion state, source health, LKG state, change interpretation, or O0 filesystem concerns |
| Existing B3 and source-specific code | Existing adapters, real or synthetic normalization already authorized there, source-health projection, public shard fallback, and artifact inputs | O0 imports, O0 custody, fixture LKG lineage, or an O0-derived release dependency |
| O0 `1.0.0` | Fixed fixture-plan admission, complete-snapshot proof, semantic candidate identity, private candidate custody, receipts, and per-source fixture promotion lineage | Real transport, parsing, normalization, public projection, current-health labels, or semantic change claims |
| Future B10 | Any separately authorized production refresh, scheduling, real adapter invocation, artifact assembly, Actions, and release workflow | Authority inferred merely from O0 interfaces, candidates, or fixture tests |
| Future D0 | Any separately authorized comparison of immutable generations and any change, correction, urgency, alert, or notification semantics | An inferred deletion, correction, amendment, withdrawal, supersession, legal effect, or other change from O0 absence or promotion |

O0 fixture LKG lineage and B3 public-shard LKG behavior are different state
machines. They share no storage, import, status label, or automatic projection.

## Closed programmatic capability surface

The complete O0 `1.0.0` runtime export set is exactly the following eight
functions, in this order:

1. `compilePlan`
2. `executePlan`
3. `inspectObject`
4. `validateObject`
5. `verifyCustody`
6. `promoteCandidate`
7. `resumePromotion`
8. `abortStaging`

There is no CLI, package-script entry point, scheduler, daemon, background
worker, interactive prompt, arbitrary callback, plugin hook, dynamic import,
administrative override, or browser API. There is no manual completeness,
disabled-source, retry, validation, custody, ignore, or platform override;
forced promotion; accept-with-warning; semantic compare; rollback; migration;
history edit; candidate rewrite; or normalized-record editor.

### Closed-schema notation

Every schema in this document is exact. “Contains exactly” excludes every
unnamed property. A union is selected by its named discriminator and no branch
inherits properties from another branch. A property described as nullable is
present with JSON `null`; it is never absent. All other named properties are
required. `Digest` means 64 lowercase hexadecimal characters. An `O0Id` is a
named literal prefix followed by one `Digest`. `CanonicalBytes(x)` means the
exact `ps-c14n-json-1` UTF-8 bytes of `x`. `DigestOf(x)` means
SHA-256(`CanonicalBytes(x)`). These definitions apply to every nested object,
not only top-level receipts.

Every set-like string array is Unicode-code-point sorted and unique. Every
object array names its comparator and identity field at its definition; there
is no blanket object comparator. An object-array entry is unique by that
identity field. Semantic sequence arrays retain the stated order and may retain
duplicates only where this contract expressly says so.

### Request envelope and exact requests

Every capability accepts one recursively closed `RequestEnvelope` containing
exactly `requestKind`, `requestVersion`, `requestId`, `compatibility`, and
`payload`. `requestVersion` is `1.0.0`. `requestId` is
`o0:request:sha256:<digest>`, where `<digest>` is `DigestOf` the object
containing exactly `requestKind`, `requestVersion`, `compatibility`, and
`payload`. `compatibility` is exactly one `RunCompatibility` or one
`SourceCompatibility` defined below, as required by the request row. A request
cannot substitute one scope for the other.

The request kinds and payloads are exhaustive:

| Capability | `requestKind` | Compatibility | Payload containing exactly |
| --- | --- | --- | --- |
| `compilePlan` | `compile_plan` | `RunCompatibility` | `repositoryRoot`, `o0Root`, `runManifest`, `requestedPlatformProfile`, `requestedBudgetProfile` |
| `executePlan` | `execute_plan` | `RunCompatibility` | `executionPreparation` |
| `inspectObject` | `inspect_object` | scope required by `locator` | `repositoryRoot`, `o0Root`, `locator` |
| `validateObject` | `validate_object` | scope required by `locator` | `repositoryRoot`, `o0Root`, `locator`, `expectedIdentity` |
| `verifyCustody` | `verify_custody` | scope required by `target` | `repositoryRoot`, `o0Root`, `target`, `requestedAction` |
| `promoteCandidate` | `promote_candidate` | `SourceCompatibility` | `promotionPreparation` |
| `resumePromotion` | `resume_promotion` | `SourceCompatibility` | `resumePreparation` |
| `abortStaging` | `abort_staging` | scope required by the preparation | `cleanupPreparation` |

`requestedPlatformProfile` and `requestedBudgetProfile` are the exact literals
defined below. `expectedIdentity` contains exactly `objectId` and
`objectDigest`. `objectId` is always non-null. `objectDigest` may be null only
for an `operation` locator, in which case validation derives and reports the
verified intent digest rather than accepting an unverified caller digest.
`requestedAction` is exactly `verify`, `prepare_promotion`, `prepare_resume`, or
`prepare_cleanup`. `ObjectLocator` is the discriminated union below:

| `locatorKind` | Remaining exact properties | Identity and scope |
| --- | --- | --- |
| `candidate_object` | `candidateId` | candidate ID; source scope |
| `sealed_candidate_staging` | `sourceKey`, `operationKey`, `candidateId` | operation and candidate IDs; source scope |
| `run` | `runId` | run ID; run scope |
| `promotion` | `sourceKey`, `generation`, `generationKey` | source plus generation; source scope |
| `receipt` | `receiptId` | receipt ID; compatibility scope encoded by the receipt |
| `operation` | `operationKey` | operation ID; compatibility scope encoded by its intent |

`target` is one complete `ObjectLocator`. A wrong locator, compatibility scope,
request kind, preparation kind, or preparation state is `invalid_input` before
executor invocation or mutation.

### Receipt envelope, durability, and total result algebra

A `ReceiptEnvelope` contains exactly `receiptKind`, `receiptVersion`,
`durability`, `receiptId`, `compatibility`, and `payload`. `receiptVersion` is
`1.0.0`. `durability` is exactly `durable` or `ephemeral`. `receiptId` is
`o0:<receiptKind>:sha256:<digest>`, where `<digest>` is `DigestOf` the object
containing exactly `receiptKind`, `receiptVersion`, `durability`,
`compatibility`, and `payload`. Receipt bytes therefore bind the issuer,
scope, complete payload, and durability class without a self-reference.

Durability is exact by branch:

| Receipt branch | Durability |
| --- | --- |
| `inspection_result`, `validation_result`, `custody_verification`, `compilation_rejection` | always `ephemeral`; recursively frozen and ID-replayable but never written |
| `run_result.rejected` with `failure.failureBoundary.state: "before_operation"`; `promotion_result.rejected`; `resume_result.rejected`; `cleanup_result.rejected` | `ephemeral`, because rejected custody cannot be used as its own storage authority |
| every other allowed receipt branch | `durable` and present in the global receipt store before it is returned or referenced |

A state-changing capability that has crossed its first mutation boundary never
returns an ephemeral rejection. It returns its durable ordinary result or a
durable `mutation_interruption`; if publication itself is interrupted, exact
request replay finishes that content-bound publication before any receipt is
returned. “Receipt” never means an unclassified optional write, and an unsafe
or unproved root is never used merely to make a rejection look durable.

The allowed receipt kinds are exactly:

```text
execution_preparation
compilation_rejection
run_result
source_outcome
inspection_result
validation_result
custody_verification
k0_reference_validation
promotion_preparation
promotion_result
resume_preparation
resume_result
cleanup_preparation
cleanup_result
mutation_interruption
```

Every capability returns exactly one of these branches:

| Capability | Success | Idempotent success | Closed failure |
| --- | --- | --- | --- |
| `compilePlan` | `execution_preparation` | the byte-identical existing `execution_preparation` | `compilation_rejection`, or `mutation_interruption` while publishing the successful durable preparation |
| `executePlan` | `run_result` with `resultCode: "completed"` or `"completed_with_source_failures"` | the byte-identical verified `run_result` | `run_result` with `resultCode: "rejected"`, or `mutation_interruption` |
| `inspectObject` | `inspection_result` with `state: "observed"` | same | `inspection_result` with `state: "not_observed"` |
| `validateObject` | `validation_result` with `state: "valid"` | same | `validation_result` with `state: "invalid"` |
| `verifyCustody` | the action-mapped receipt below | a byte-identical existing preparation or verification | `custody_verification` with `state: "rejected"`, or `mutation_interruption` while publishing a durable preparation |
| `promoteCandidate` | `promotion_result` with `resultCode: "promoted"` | `promotion_result` with `resultCode: "already_current"` | `promotion_result` with `resultCode: "rejected"`, or `mutation_interruption` |
| `resumePromotion` | `resume_result` with `resultCode: "resumed"` | `resume_result` with `resultCode: "already_completed"` | `resume_result` with `resultCode: "rejected"`, or `mutation_interruption` |
| `abortStaging` | `cleanup_result` with `resultCode: "cleaned"` | `cleanup_result` with `resultCode: "already_clean"` | `cleanup_result` with `resultCode: "partial_cleanup"` or `"rejected"`, or `mutation_interruption` |

`verifyCustody` maps requested actions exactly. `verify` returns one
`custody_verification`. `prepare_promotion` returns a
`promotion_preparation` only for a published sealed candidate object and a
fully verified expected chain tip. `executePlan` may issue the byte-identical
preparation after performing those same checks and embeds the complete durable
receipt in its source outcome. `prepare_resume` returns a
`resume_preparation` only for complete sealed candidate staging or complete
promotion staging with its exact original preparation and unchanged
predecessor. `prepare_cleanup` returns a `cleanup_preparation` only for one
verified unsealed interruption-owned candidate or promotion staging subtree.
A failure in any action returns
`custody_verification` with `state: "rejected"`; a preparation is never emitted
beside it.

`FailureEvidence` contains exactly `failureCode`, `retryable`,
`failureBoundary`, `operationKey`, `partialEntry`, and `completedEntries`.
`operationKey` is nullable only before an operation identity can be formed.
`partialEntry` is nullable and otherwise one `OwnedEntry`. `completedEntries`
is operation-relative-path sorted and unique by `relativePath`. `retryable` is
true only for the three retry codes stated below. `failureBoundary` is exactly
`{ "state": "before_operation" }` when no mutation began, or the object
containing exactly `state: "at_boundary"` and one complete `boundary` value of
type `MutationBoundary`. No OS error string, stack, caller text, or arbitrary
diagnostic is retained.

The exact payload schemas are:

| Receipt kind | Payload containing exactly |
| --- | --- |
| `execution_preparation` | `runId`, `repositoryRoot`, `o0Root`, `rootKey`, `runManifest`, `runManifestDigest`, `sourcePlanDigests`, `expectedChainTips`, `outputDeclarations`, `gitIgnoreProof`, `platformProfile`, `budgetProfile`, `state: "execution_prepared"` |
| `compilation_rejection` | `runManifestDigest`, `sourcePlanDigests`, `resultCode: "rejected"`, `failure` |
| `run_result` | `runId`, `runManifestDigest`, `sourceOutcomes`, `candidateReferences`, `candidateCount`, `attemptCount`, `logicalRunClose`, `resultCode`, `failure` |
| `source_outcome` | `runId`, `sourceId`, `sourceRevision`, `attempts`, `candidateReferences`, `candidateCount`, `promotionPreparation`, `completenessRejection`, `resultCode`, `failure` |
| `inspection_result` | `locator`, `observedByteLength`, `observedByteDigest`, `state`, `failure` |
| `validation_result` | `locator`, `expectedIdentity`, `validatedIdentity`, `state`, `failureCodes` |
| `custody_verification` | `repositoryRoot`, `o0Root`, `target`, `requestedAction`, `verifiedIdentity`, `verifiedChainTip`, `state`, `failure` |
| `k0_reference_validation` | `referenceId`, `k0ObjectKind`, `k0ObjectId`, `k0ObjectDigest`, `validatorName`, `validatedCanonicalByteLength`, `validatedCanonicalByteDigest`, `state: "validated"` |
| `promotion_preparation` | `repositoryRoot`, `o0Root`, `sourceId`, `sourceKey`, `candidateId`, `objectSealDigest`, `generation`, `generationKey`, `expectedPredecessor`, `promotionLogicalTime`, `gitIgnoreProof`, `state: "promotion_prepared"` |
| `promotion_result` | `sourceId`, `sourceKey`, `candidateId`, `generation`, `generationKey`, `predecessor`, `preparationReceiptId`, `objectSealDigest`, `logicalCommittedAt`, `committedPromotionReceiptId`, `resultCode`, `failure` |
| `resume_preparation` | `repositoryRoot`, `o0Root`, `sourceId`, `sourceKey`, `resumeKind`, `subjectOperationKey`, `candidateId`, `objectSealDigest`, `generation`, `generationKey`, `expectedPredecessor`, `originalPreparationReceiptId`, `promotionLogicalTime`, `gitIgnoreProof`, `ownedEntries`, `state: "resume_prepared"` |
| `resume_result` | `resumeKind`, `subjectOperationKey`, `candidateId`, `generation`, `promotionReceiptId`, `resultCode`, `failure` |
| `cleanup_preparation` | `repositoryRoot`, `o0Root`, `sourceKey`, `subjectOperationKey`, `cleanupKind`, `interruptionReceiptId`, `ownedEntries`, `state: "cleanup_prepared"` |
| `cleanup_result` | `subjectOperationKey`, `cleanupOperationKey`, `cleanupKind`, `removedEntries`, `remainingEntries`, `resultCode`, `failure` |
| `mutation_interruption` | `requestId`, `operationKind`, `operationKey`, `lastCompletedBoundary`, `nextBoundary`, `ownedEntries`, `resultCode: "interrupted"`, `failure` |

`sourceOutcomes` is source-ID sorted and contains complete durable
`source_outcome` receipt envelopes, not IDs. `promotionPreparation` is either a
complete durable `promotion_preparation` envelope or null. `run_result.failure`
is null for both completed result codes and non-null for `rejected`.
`source_outcome.failure` is null only for `candidate_prepared`,
`complete_zero_output`, or `reused_verified`; its `resultCode` is exactly
`candidate_prepared`, `complete_zero_output`, `reused_verified`,
`incomplete_population_rejected`, or `source_failed`.
`completenessRejection` is non-null only for
`incomplete_population_rejected`; it is null in every other branch.
The first three source results contain exactly one candidate reference and a
non-null complete promotion preparation; the last two contain neither. A
`complete_zero_output` candidate has zero logical items but still carries its
complete witness, partition, metadata, manifest, seal, and preparation.
For a `promoted` result, `committedPromotionReceiptId` is null and the
authoritative promotion ID is the enclosing receipt's non-self-referential
`receiptId`. For `already_current`, `committedPromotionReceiptId` is the
verified existing committed promotion receipt. It is null for `rejected`.
`resumeKind` is exactly
`candidate_publication` or `promotion_publication`. In a
`candidate_publication` resume, `generation`, `generationKey`,
`expectedPredecessor`, `promotionLogicalTime`, and the resume result's
`promotionReceiptId` are
null, and `originalPreparationReceiptId` names the exact run-global
`execution_preparation` whose plan and operation intent produced the staging
tree. In a `promotion_publication` resume the generation fields are non-null and
`originalPreparationReceiptId` names the exact source-scoped
`promotion_preparation`. This is a closed
union, not inheritance from `promotion_preparation`, so
`state: "resume_prepared"` replaces every other preparation state.

`failureCodes` is failure-code sorted and unique. `validatedIdentity` contains
exactly `objectId` and `objectDigest`, both null when validation fails.
`verifiedIdentity` has the same shape and null rule. `candidateReferences` is
candidate-ID sorted and unique. `removedEntries`, `remainingEntries`, and
`ownedEntries` use the exact ownership schema below and are sorted by
`relativePath`. `expectedChainTips` is source-ID sorted; `sourcePlanDigests` and
`outputDeclarations` are source-ID sorted. Each output declaration is the exact
value copied from that source plan, and each expected chain tip is the exact
verified value for the same source. `sourceOutcomes` contains exactly one
outcome per source plan. Its `attempts` array is attempt-ordinal ordered,
contains one through three unique contiguous ordinals, and its last entry
determines the source outcome. `run_result.attemptCount` equals the sum of all
embedded source-outcome attempt-array lengths and is at most 24.
`logicalRunClose` is the complete `LogicalTime` for the run-global clock at tick
255. No receipt carries a bare identifier where this contract requires the
complete nested receipt.

Every object observation is reproducible. `ObservedFileEntry` contains exactly
`relativePath`, `byteLength`, and `byteDigest`; entries are relative-POSIX-path
sorted and unique. `ObjectObservation` contains exactly `locator` and `files`.
Its files are the complete bounded ordinary-file inventory below the locator:
candidate manifest/assets/seal, one run manifest, one promotion commit, one
receipt, or operation intent/boundaries, as applicable. Empty directories,
unknown entries, and nonordinary entries are invalid and are never omitted from
the decision. `inspection_result.observedByteLength` is the byte length of
`CanonicalBytes(ObjectObservation)` and `observedByteDigest` is its SHA-256.

The valid `ObjectIdentity` mapping is exact: candidate and sealed-candidate
staging map to candidate ID/object-seal digest; run maps to run ID/run-manifest
digest; promotion maps to the committed promotion receipt ID/SHA-256 of its
complete canonical receipt bytes; receipt maps to receipt ID/SHA-256 of its
complete canonical receipt bytes; and operation maps to operation key/intent
digest. A non-null expected identity must equal this pair. A valid or verified
result contains this complete pair; an invalid or rejected result contains
both properties as null. `verifiedChainTip` is a complete `ChainTip` or null:
it is the exact verified current predecessor for `prepare_promotion`, the exact
subject tip for a promotion-target verification or promotion resume, and null
for genesis or a target/action with no chain semantics.

For `inspection_result`, `observed` requires non-null observed length/digest and
null failure; `not_observed` requires both observed values null and non-null
failure. For `validation_result`, `valid` requires a non-null validated
identity and empty `failureCodes`; `invalid` requires a null validated identity
and a nonempty array. For `custody_verification`, `verified` requires non-null
verified identity, the chain-tip variant appropriate to the target, and null
failure; `rejected` requires null verified identity/tip and non-null failure.
Every preparation exists only in its one success state and has no failure
branch. A `compilation_rejection` always has non-null failure. A rejected run
retains already durable source-outcome receipts but has an empty run-level
candidate-reference array and `candidateCount: 0`; candidates cannot escape a
structurally rejected run. Every completed run has null failure; every rejected
run has non-null failure. `completed` means every source outcome is one of the
three successful values. `completed_with_source_failures` means at least one
source is incomplete-population rejected or failed and there is no
run-structural rejection.

A `promotion_result` always copies candidate, generation, generation key,
predecessor, preparation ID, seal digest, and logical time from its verified
preparation. `promoted` and `already_current` have null failure; `rejected` has
non-null failure and null `committedPromotionReceiptId`. A `resume_result`
always copies resume kind, subject operation, candidate, and applicable
generation from its preparation. `resumed` and `already_completed` have null failure;
`rejected` has non-null failure. Its `promotionReceiptId` is non-null only after
a `promotion_publication` resume reaches or verifies a committed promotion.
For cleanup, `cleaned` and `already_clean` have null failure and an empty
remaining array; `partial_cleanup` has `cleanup_partial` failure and both exact
removed/remaining inventories; `rejected` has non-null failure, an empty
removed array, and the last verified remaining inventory. `cleanupOperationKey`
is the operation key derived for the cleanup request; `subjectOperationKey`
is copied from its preparation. Every
`mutation_interruption` has non-null failure and exactly one nullable partial
entry matching `failure.partialEntry` byte-for-byte.
Its `operationKind` is one exact operation kind, `lastCompletedBoundary` is a
complete `MutationBoundary` or null when none completed, and `nextBoundary` is
the one complete deterministic next `MutationBoundary`. The last and next
ordinals are contiguous when both are present; interruption is never emitted
after `operation_closed`.

## Exact compatibility and frozen K0 seam

`CompatibilityEntry` contains exactly `id`, `version`, and `digest`.
`SourceContractEntry` contains exactly `id`, `version`, `digest`, `sourceId`,
and `sourceRevision`. Every durable source-scoped object binds one exact
`SourceCompatibility` containing exactly:

```text
o0Contract
k0PublicInterface
canonicalizationProfile
fixtureRegistrySchema
fixtureRegistry
fixtureExecutor
sourceContract
candidateSchema
validationProfile
runManifestSchema
promotionManifestSchema
```

All properties except `sourceContract` are `CompatibilityEntry` values;
`sourceContract` is a `SourceContractEntry`. The O0 contract entry is
`policy-sentinel-o0-contract`, version `1.0.0`, and the SHA-256 of the exact
separately accepted contract bytes. Until acceptance records that digest, no O0
implementation or durable O0 object is authorized.

The canonicalization entry is the profile and digest stated above. Every other
entry is supplied by the closed synthetic registry defined below and MUST replay
against the exact bound bytes. Equality means byte-for-byte equality of every
string and digest. SemVer ordering or compatibility is never inferred.

`CustodyProfile` contains exactly `o0Contract`, `k0PublicInterface`,
`canonicalizationProfile`, `fixtureRegistrySchema`, `runManifestSchema`,
`promotionManifestSchema`, `platformProfile`, and `budgetProfile`. The first
six values are copied from every source compatibility tuple and MUST be
byte-equal across all source plans in one run. `platformProfile` and
`budgetProfile` are the exact literal profile records defined below. A mismatch
rejects the whole run before executor invocation or mutation.

`RunCompatibility` contains exactly `scope: "run"`, `custodyProfile`, and
`sourceTuples`. `sourceTuples` is source-ID sorted and contains one through
eight entries, each containing exactly `sourceId` and `compatibility`.
`sourceId` equals `compatibility.sourceContract.sourceId`; source IDs are
unique. `SourceCompatibility` is used directly for source/object scope. One
scope cannot substitute for the other.

The K0 public-interface entry is fixed to ID
`policy-sentinel-k0-public-assertion-seam`, version `1.0.0`, and digest
`65842e39c82bbaf4e0a7ff032f3a52922b5cba52c8edc959cbc913ea0dbf8e9f`.
That digest is SHA-256 of the 1,406 `ps-c14n-json-1` bytes of the following
closed manifest. `members` is path-sorted and its order is semantic:

```json
{
  "canonicalizationProfile": "ps-c14n-json-1",
  "interfaceId": "policy-sentinel-k0-public-assertion-seam",
  "interfaceVersion": "1.0.0",
  "members": [
    { "path": "docs/vision/k0-lifecycle-contract.md", "role": "normative_contract", "sha256": "30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d" },
    { "path": "schemas/assertion.schema.v1.json", "role": "assertion_schema", "sha256": "fd056ecacd1cc8f08e0bccd512196e90c248534c9800fce83ddf8ba4f6695d9c" },
    { "path": "src/kernel/assertions/canonical-json.ts", "role": "transitive_public_implementation", "sha256": "80ab679cbb0b1378a9a801e0c4273e79ffb40e56b73c583e6dff9ca8f701d04d" },
    { "path": "src/kernel/assertions/contracts.ts", "role": "transitive_public_implementation", "sha256": "b83e8865282f21324f50af126cc5dd793a051c82a7acfb95db3eac7dccc601ce" },
    { "path": "src/kernel/assertions/identity.ts", "role": "transitive_public_implementation", "sha256": "4adcab60f59585eb4e5583b1bccc5b82582fabc47c0b5210df7a4a51b35f2e2f" },
    { "path": "src/kernel/assertions/index.ts", "role": "public_entrypoint", "sha256": "a7882a5a7a41d10383a05a28d9d0ff3bb6dbf9477012520a585b0a0c7622611b" },
    { "path": "src/kernel/assertions/integrity.ts", "role": "transitive_public_implementation", "sha256": "486e3c2027c7fcb741ae81ad4f3679c1cfecfe81d915f8946f3bf32c78a56c9a" },
    { "path": "src/kernel/assertions/temporal.ts", "role": "transitive_public_implementation", "sha256": "0d5fedc03c1352bfb3436f968f3eee7ed7628b992b264c5699b12ed63cec7aea" }
  ]
}
```

O0 imports K0 only through `src/kernel/assertions/index.ts`. The exact K0 object
kind union is `source_fact` or `derived_assertion`; it is distinct from every
O0 `locatorKind`. For `source_fact`, O0 calls the actually exported
`validateSourceFact`, `k0ObjectId` is the validated `factId`, and
`k0ObjectDigest` is the validated `factDigest`. For `derived_assertion`, O0
calls the actually exported `validateDerivedAssertion`, `k0ObjectId` is the
validated `assertionId`, and `k0ObjectDigest` is the validated `resultDigest`.
No K0 validation receipt or K0 receipt issuer exists or is implied.

O0 instead issues its own durable `k0_reference_validation` receipt after the
selected K0 validator returns a recursively frozen value. Let `B` be the exact
canonical bytes of that returned value. The receipt's
`validatedCanonicalByteLength` is `B.length` and
`validatedCanonicalByteDigest` is SHA-256(`B`). `validatorName` is exactly
`validateSourceFact` or `validateDerivedAssertion` according to the kind.
`referenceId` is `o0:k0-reference:sha256:<digest>`, where `<digest>` is
`DigestOf` the object containing exactly `k0PublicInterface`, `k0ObjectKind`,
`k0ObjectId`, `k0ObjectDigest`, `validatorName`,
`validatedCanonicalByteLength`, and `validatedCanonicalByteDigest`. The
receipt uses the source compatibility that will retain the reference and is
stored under the global receipt protocol below.

An `OpaqueK0Reference` contains exactly `referenceId`, `k0ObjectKind`,
`k0ObjectId`, `k0ObjectDigest`, `o0ValidationReceiptId`,
`k0PublicInterfaceVersion`, and `k0PublicInterfaceDigest`. Its O0 receipt must
replay byte-for-byte, have `state: "validated"`, and bind all six referenced
values. References are sorted and unique by `referenceId`. O0 retains no copied
K0 value and MUST NOT reinterpret a predicate, value, evidence, time, status,
legal meaning, Nation association, jurisdiction, relevance, rights,
eligibility, or impact.

O0 `1.0.0` performs no implicit migration, reinterpretation, in-place upgrade,
historical recomputation, ID translation, fallback canonicalization, or history
rewrite. A future version may inspect older custody only through a separately
reviewed legacy verifier that implements the historical tuple and contract
exactly.

## Fixture-only source plans and deterministic execution

A source ID is `o0-fixture-source-` followed by exactly four decimal digits. A
source revision is `fixture-revision-` followed by exactly four decimal digits.
A fixture member ID is `o0-fixture-member-` followed by exactly four decimal
digits. Fixture registry, executor, contract, schema, and profile IDs begin
with `o0-fixture-` and otherwise contain only lowercase ASCII letters, digits,
and single hyphens. These grammars are necessary but not sufficient for
synthetic admission; exact frozen-registry membership is mandatory.

The future implementation contains one immutable compile-time
`SyntheticFixtureRegistry` selected by the exact `fixtureRegistry` and
`fixtureRegistrySchema` compatibility entries. It contains exactly
`registryVersion: "o0-synthetic-fixture-registry-1"`, `registryId`,
`executorBinding`, `sourceContracts`, `populations`, `members`, and `assets`.
`executorBinding` is one `CompatibilityEntry` and equals every admitted
source's `fixtureExecutor`. `sourceContracts` is source-ID sorted and contains
unique `SourceContractEntry` values. `populations` is sorted and unique by
`populationScopeReference.identity`. Each population contains exactly
`sourceId`, `sourceRevision`, `populationScopeReference`, `memberIdentities`,
and `populationDigest`; `memberIdentities` is member-ID sorted and unique;
`populationDigest` is `DigestOf` the preceding four properties.

`members` is member-ID sorted and unique. Each `FixtureMemberBinding` contains
exactly:

```text
memberIdentity
fixtureIdentityDigest
sourceId
sourceRevision
sourceContract
executorBinding
populationScopeReference
payloadByteLength
payloadDigest
logicalItems
assetIdentities
```

`sourceContract` and `executorBinding` are complete compatibility entries and
equal the registry and source plan. `logicalItems` is logical-item-ID sorted and
contains complete `RegisteredLogicalItem` objects defined below.
`assetIdentities` is asset-identity sorted and unique. The
`fixtureIdentityDigest` is `DigestOf` the object containing exactly the other
ten properties. A fixture identity is therefore bound to its executor, source
contract, population, payload, logical outputs, and assets.

`assets` is sorted and unique by `assetIdentity`. Each `RegisteredAsset`
contains exactly `assetIdentity`, `assetIdentityDigest`, `sourceId`,
`sourceRevision`, `memberIdentity`, `logicalPath`, `role`, `mediaType`,
`byteLength`, and `byteDigest`. `assetIdentity` is
`o0:fixture-asset:sha256:<assetIdentityDigest>`. `assetIdentityDigest` is
`DigestOf` the object containing exactly the remaining eight properties. Its
member and source must resolve to exactly one `FixtureMemberBinding`.

Registry source contracts, populations, members, and assets form exact total
partitions: every member resolves to exactly one listed population and source
contract; every listed member asset resolves to exactly one registered asset;
every registered asset is referenced by exactly one member; and no orphan,
duplicate, cross-source, or ambiguous entry is valid. The complete registry
bytes replay the tuple digest before a request is admitted.

No request, plan, receipt, executor result, environment value, or caller may
supply a path, module name, function, callback, URL, payload bytes, logical item,
asset bytes, adapter, or registry extension. The executor is selected only by
the registry's exact ID/version/digest from a compile-time map. It may read only
the bytes compiled for a requested registered identity. Its returned member,
payload, logical-item, and asset references must equal the registry projection
byte-for-byte. Unknown or substituted material is `fixture_not_registered`.
Opaque bytes are not semantically inspected: they are admissible only when
their exact registry identity, length, digest, member, source, logical role,
and media type all replay. This structural rule, rather than keyword or content
classification, makes arbitrary, real, private, land, or injected material
inadmissible.

`PopulationScopeReference` contains exactly `identity`, `version`, and
`digest`. `identity` is `o0-fixture-scope-` plus four decimal digits. `version`
is a numeric version. `digest` is `DigestOf` the object containing exactly
`identity`, `version`, and the registry population's complete data boundary
defined below.

`RegisteredLogicalItem` contains exactly `logicalItemId`, `memberIdentity`,
`itemOrdinal`, `logicalItemDigest`, and `canonicalByteLength`.
`itemOrdinal` is one-based and contiguous within one member.
`logicalItemDigest` is the digest of the exact registered canonical logical-item
bytes. `logicalItemId` is `o0:logical-item:sha256:<digest>`, where `<digest>` is
`DigestOf` the object containing exactly `sourceId`, `sourceRevision`,
`memberIdentity`, `itemOrdinal`, `logicalItemDigest`, and
`canonicalByteLength`. Logical-item IDs are globally unique within a source
plan and cannot occur under two members.

`OutputDeclaration` contains exactly `sourceId`, `sourceRevision`,
`expectedPopulationCount`, `maximumAttemptCount`, `maximumSegments`,
`fixtureInputByteLength`, `maximumLogicalItemCount`, `maximumLogicalAssetCount`,
`maximumPhysicalAssetCount`, `maximumCandidateManifestBytes`,
`maximumStagedBytes`, and `declarationDigest`. `declarationDigest` is
`DigestOf` the object containing exactly the preceding eleven properties.
`maximumAttemptCount` is from 1 through 3 and the run sum is at most 24. Every
number is calculated from the frozen registry and bounded by the resource
profile. The declaration is an upper bound, not executor testimony; O0
recomputes it during compilation.

A `SourcePlan` contains exactly `compatibility`, `fixtureSemanticDigest`,
`populationScopeReference`, `fixtureItems`, `outputDeclaration`, and
`admissionState: "fixture_enabled"`. `fixtureItems` is member-ID sorted and
contains complete `FixtureMemberBinding` values for exactly one registry
population. `fixtureSemanticDigest` is `DigestOf` the object containing exactly
`fixtureRegistry`, `fixtureExecutor`, `sourceContract`,
`populationScopeReference`, `fixtureItems`, and `outputDeclaration`. O0
recomputes every binding from the registry before admission. There is no
disabled-source or registry override.

Two plans with the same `sourceId`, whether or not their revisions differ, are
duplicate source plans. `compilePlan` rejects the complete run before executor
invocation or candidate/promotion mutation if any duplicate exists. After
uniqueness validation, source plans are sorted by `sourceId`.

`RunManifest` contains exactly `runManifestVersion: "o0-run-manifest-1"`,
`runCompatibility`, `logicalClock`, `budgetProfile`, and `sourcePlans`.
`runCompatibility` is the exact `RunCompatibility`; `budgetProfile` is the
complete `BudgetProfile`; and `sourcePlans` is the source-ID-sorted array. Every
source plan's six custody-profile entries equal the run custody profile
byte-for-byte. `sourcePlanDigest` is `DigestOf` the complete `SourcePlan`.
`SourcePlanDigestEntry` contains exactly `sourceId`, `sourceRevision`, and
`sourcePlanDigest`, is sorted by `sourceId`, and is unique by `sourceId`.

The run identity preimage is the complete `RunManifest`. If its digest is `R`,
`runId` is `o0:run:sha256:<R>` and `runKey` is `R`. The durable run object
contains exactly `runId`, `runManifest`, and `runManifestDigest`, where the
digest is SHA-256 of the exact canonical `runManifest` bytes; all three replay.

The one run-global `LogicalClock` contains exactly `clockId`, `epoch`, and
`tickUnit`. `clockId` is `o0-logical-clock-1`; `epoch` is a valid date-time in
the exact fixed value `2000-01-01T00:00:00.000Z`; and `tickUnit` is
`logical_step`. It appears once in `RunManifest`; a source plan does not carry
another clock and no caller chooses any clock property. A `LogicalTime`
contains exactly the same three fields plus `tick`, an integer from 0 through
255. Every logical-time value copies the run-global fields byte-for-byte.

Run open is tick 0. For zero-based source index `s` after source-ID sorting,
one-based attempt ordinal `a`, and zero-based event ordinal `e`, the event tick
is `1 + 32*s + 8*(a-1) + e`. Event codes by ordinal 0 through 7 are exactly
`attempt_started`, `executor_invoked`, `executor_returned`,
`witness_recomputed`, `candidate_validated`, `candidate_sealed`,
`outcome_closed`, and `attempt_closed`. Run close is tick 255. Physical start,
completion, worker, or scheduling order cannot change these values. Attempts
are attempt-ordinal ordered, events are event-ordinal ordered, and run source
outcomes are source-ID ordered.

`AttemptEvent` contains exactly `eventCode`, `eventOrdinal`, `logicalTime`,
`evidence`, and `evidenceDigest`. `eventOrdinal` is the event code's fixed
ordinal. `StageEvidence` contains exactly `evidenceKind`, `subjectId`,
`byteLength`, `itemCount`, and `targetDigest`; `evidenceKind` equals
`eventCode`; `evidenceDigest` is `DigestOf` the complete `StageEvidence`.
`byteLength` and `itemCount` are safe non-negative integers and are zero when
the target has no corresponding measure. The evidence target is exact:

| Event | `subjectId` | `targetDigest` preimage |
| --- | --- | --- |
| `attempt_started` | source ID | complete `SourcePlan` |
| `executor_invoked` | source ID | object containing exactly `sourcePlanDigest`, `attemptOrdinal`, registry-sorted `memberIdentities`, and `outputDeclarationDigest` |
| `executor_returned` | source ID | complete `ExecutorResult` |
| `witness_recomputed` | population-scope identity | complete recomputed witness |
| `candidate_validated` | candidate ID | complete candidate identity preimage |
| `candidate_sealed` | candidate ID | complete `CandidateSealBody` |
| `outcome_closed` | source ID | `OutcomeDecision` |
| `attempt_closed` | source ID | `AttemptSummaryCore` |

`ExecutorResult` contains exactly `sourceId`, `sourceRevision`,
`attemptOrdinal`, `completenessMode`, `segments`, `logicalItems`, `assets`, and
`resultCode`. Each segment is the exact witness segment below. `logicalItems`
is logical-item-ID sorted and consists only of complete registered logical-item
objects. `assets` is asset-identity sorted and consists only of complete
registered assets. `resultCode` is `returned` or `interrupted`.

`OutcomeDecision` contains exactly `sourceId`, `sourceRevision`,
`attemptOrdinal`, `resultCode`, `failureCode`, `candidateId`,
`promotionPreparationReceiptId`, and `completenessRejectionDigest`. The last
four properties are nullable under the source-outcome branch rules; the final
property is non-null only for incomplete-population rejection.
`AttemptSummaryCore` contains exactly
`attemptOrdinal`, `resultCode`, `failureCode`, and
`priorEventEvidenceDigests`; the digest array contains every evidence digest
before `attempt_closed` in event-ordinal order. These preimages avoid a receipt
or event self-reference.

`AttemptEntry` contains exactly `attemptOrdinal`, `events`, `resultCode`, and
`failure`. `resultCode` is exactly `candidate_sealed`,
`complete_zero_output`, `reused_verified`, `incomplete_population_rejected`,
or `failed`. `failure` is null for the first three and one `FailureEvidence`
for the last two.
The event array begins at `attempt_started`, ends at `attempt_closed`, and
contains the strictly increasing event-code subsequence for every stage
actually reached. Repeated, out-of-order, omitted reached-stage, or impossible
later-stage events reject the receipt.

Promotion time is independent of run time. `PromotionLogicalTime` contains
exactly `clockId: "o0-promotion-clock-1"`,
`epoch: "2000-01-01T00:00:00.000Z"`, `tickUnit: "generation"`, and `tick`.
`tick` equals the one-based promotion generation. Ordinary, concurrent, and
resumed logical writers naming the same generation therefore derive
byte-identical logical time. “Concurrent” here means requests prepared against
the same predecessor and serialized through the one permitted O0 filesystem
writer; simultaneous filesystem writers are outside the platform profile. Wall
time, run epoch, process time, and file time never participate.

There are at most three attempts per source and 24 attempts per run. Retry is
allowed only for `executor_unavailable_before_population`,
`executor_interrupted_before_population`, or
`staging_interrupted_before_seal`. The first two require that no population
mode, segment, or member was emitted. The third requires a verified unsealed
staging subtree to be cleaned under the cleanup contract before another
attempt. Every other failure is non-retryable. Once an executor emits
`partial_snapshot`, `delta`, or `unknown_completeness`, that source transaction
closes and MUST NOT retry into a complete claim. No retry override exists.

Every source receives its own transcript, staging subtree, outcome, candidate,
and promotion preparation. One source failure cannot mutate, delete, relabel,
or reuse another source's material. Run results embed source-outcome receipts
by source ID and list candidate references as sorted unique arrays. A
duplicate candidate reference within an outcome or across the run is a
structural rejection, not a deduplication opportunity.

The closed failure-code vocabulary is exactly `invalid_input`,
`duplicate_source_plan`, `fixture_not_registered`,
`compatibility_mismatch`, `budget_exceeded`,
`promotion_chain_limit`, `unsafe_filesystem`, `git_ignore_not_proven`,
`operation_state_invalid`, `filesystem_operation_interrupted`,
`executor_unavailable_before_population`,
`executor_interrupted_before_population`, `staging_interrupted_before_seal`,
`incomplete_population_mode`, `complete_snapshot_witness_invalid`,
`candidate_validation_failed`, `duplicate_candidate_reference`,
`custody_integrity_failure`, `stale_predecessor`, `orphan_not_resumable`,
`cleanup_not_safe`, `cleanup_partial`, and `platform_proof_unavailable`.
The exact non-null failure-code subsets are:

| Receipt branch | Allowed failure codes, exactly |
| --- | --- |
| `compilation_rejection.rejected` | `invalid_input`, `duplicate_source_plan`, `fixture_not_registered`, `compatibility_mismatch`, `budget_exceeded`, `promotion_chain_limit`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `custody_integrity_failure`, `stale_predecessor`, `platform_proof_unavailable` |
| `run_result.rejected` | `invalid_input`, `compatibility_mismatch`, `budget_exceeded`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `duplicate_candidate_reference`, `custody_integrity_failure`, `platform_proof_unavailable` |
| `source_outcome.incomplete_population_rejected` | `incomplete_population_mode`, `complete_snapshot_witness_invalid` |
| `source_outcome.source_failed` or `AttemptEntry.failed` | `fixture_not_registered`, `budget_exceeded`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `executor_unavailable_before_population`, `executor_interrupted_before_population`, `staging_interrupted_before_seal`, `candidate_validation_failed`, `custody_integrity_failure`, `platform_proof_unavailable` |
| `inspection_result.not_observed` | `invalid_input`, `unsafe_filesystem`, `operation_state_invalid`, `custody_integrity_failure`, `orphan_not_resumable`, `platform_proof_unavailable` |
| `validation_result.invalid` | `invalid_input`, `compatibility_mismatch`, `unsafe_filesystem`, `operation_state_invalid`, `candidate_validation_failed`, `custody_integrity_failure`, `platform_proof_unavailable` |
| `custody_verification.rejected` | `invalid_input`, `compatibility_mismatch`, `promotion_chain_limit`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `custody_integrity_failure`, `stale_predecessor`, `orphan_not_resumable`, `cleanup_not_safe`, `platform_proof_unavailable` |
| `promotion_result.rejected` | `invalid_input`, `compatibility_mismatch`, `promotion_chain_limit`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `custody_integrity_failure`, `stale_predecessor`, `platform_proof_unavailable` |
| `resume_result.rejected` | `invalid_input`, `compatibility_mismatch`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `custody_integrity_failure`, `stale_predecessor`, `orphan_not_resumable`, `platform_proof_unavailable` |
| `cleanup_result.partial_cleanup` | `cleanup_partial` |
| `cleanup_result.rejected` | `invalid_input`, `compatibility_mismatch`, `unsafe_filesystem`, `git_ignore_not_proven`, `operation_state_invalid`, `custody_integrity_failure`, `orphan_not_resumable`, `cleanup_not_safe`, `platform_proof_unavailable` |
| `mutation_interruption.interrupted` | `staging_interrupted_before_seal` before a candidate seal; `cleanup_partial` during cleanup; otherwise `filesystem_operation_interrupted` |

`validation_result.failureCodes` uses the exact `validation_result.invalid`
subset and every other failure-bearing branch uses one `FailureEvidence` with
one code from its row. The three source-attempt retry codes are the only values
for which `FailureEvidence.retryable` is true. Operation recovery after
`filesystem_operation_interrupted` or `cleanup_partial` follows the exact
journal table and is not a semantic source-attempt retry. No result, state, or
failure value is valid outside its named receipt branch. Durable stack traces,
exception messages, OS error text, and arbitrary strings are forbidden.

## Complete-snapshot-only admission

The recognized completeness modes are exactly `complete_snapshot`,
`partial_snapshot`, `delta`, and `unknown_completeness`. Only
`complete_snapshot` may form a candidate or reach promotion/LKG logic.
Each other mode produces a `CompletenessRejection` containing exactly
`completenessMode`, `reason: "incomplete_population_mode"`,
`retryable: false`, and `candidateId: null`. This object is the exact
`source_outcome.completenessRejection` for a durable source outcome whose
`resultCode` is `incomplete_population_rejected`; its digest is bound in the
`OutcomeDecision`. `completeness_rejection` is not a separate receipt kind. It
writes no candidate object or promotion preparation.

The complete witness version is exactly
`o0-complete-population-witness-1`. A complete witness contains exactly:

```text
witnessVersion
completenessMode
sourceRevision
fixtureSemanticDigest
populationScope
dataBoundary
expectedPopulation
segments
observedPopulationIdentities
observedUniquePopulationIdentities
observedPopulationCount
uniquePopulationCount
reconciliation
duplicateCount
missingCount
unresolvedCount
nonTruncated
nonTimedOut
budgetsExhausted
```

`completenessMode` is `complete_snapshot`. `sourceRevision` and
`fixtureSemanticDigest` exactly equal the plan.

`dataBoundary` contains `kind`, `canonicalValue`, and `evidenceDigest`. `kind`
is exactly `fixture_registry_population`. `canonicalValue` contains exactly
`fixtureRegistryId`, `fixtureRegistryVersion`, `populationScopeId`,
`populationScopeVersion`, `sourceId`, and `sourceRevision`, all equal to the
compatibility tuple and source plan. `evidenceDigest` is SHA-256 of the
canonical object containing exactly `kind` and `canonicalValue`.

`populationScope` contains exactly `identity`, `version`, and `digest`.
`identity` is `o0-fixture-scope-` plus four decimal digits. `version` is a
numeric version. Its digest is SHA-256 of the canonical object containing
exactly that identity, version, and the complete `dataBoundary`.

`expectedPopulation` contains exactly `memberIdentities`, `count`,
`sortedIdentityDigest`, `evidence`, and `evidenceDigest`.
`memberIdentities` is the member-ID-sorted unique array from the exact registry
population and `count` is its length, from 0 through 256.
`sortedIdentityDigest` is SHA-256 of the canonical `memberIdentities` array.
`evidence` contains exactly
`kind: "fixture_registry_expected_population"`, `fixtureRegistryDigest`,
`sourceContractDigest`, `populationScopeDigest`, `count`, and
`sortedIdentityDigest`. `evidenceDigest` is SHA-256 of that complete canonical
evidence object. O0 resolves the exact tuple-bound registry and recomputes the
member list, count, both digests, and every equality.

There is one through 256 segments. Segment ordinals are one-based and exactly
contiguous. Each segment contains exactly:

```text
ordinal
selectorCanonicalValue
selectorDigest
payloadByteLength
payloadDigest
declaredMemberCount
observedMemberCount
observedMemberIdentities
memberIdentityDigest
incomingContinuation
outgoingContinuation
terminal
terminalEvidence
```

`selectorCanonicalValue` contains exactly
`kind: "fixture_segment"`, `ordinal`, `populationScopeDigest`, and
`incomingTokenDigest`; the first segment's token is null and every later value
equals its incoming continuation's `tokenDigest`. `selectorDigest` is the
SHA-256 of that canonical object. A continuation token digest covers the exact
opaque token bytes emitted by the fixed fixture executor; those token bytes are
not retained in the candidate. `payloadDigest` covers the exact fixture payload
bytes and `payloadByteLength` is their exact length.
`observedMemberIdentities` is member-ID sorted, retains duplicate occurrences,
and contains only IDs parsed from that payload. `observedMemberCount` equals its
length; `declaredMemberCount` must equal it. `memberIdentityDigest` is SHA-256
of the canonical duplicate-retaining identity array.

A continuation link contains exactly `fromOrdinal`, `toOrdinal`, and
`tokenDigest`. The first incoming link is null. For every nonterminal segment,
the outgoing link's ordinals are `ordinal` and `ordinal + 1`, and it is byte-for-
byte equal to the next segment's incoming link. A terminal segment's outgoing
link is null. There is exactly one terminal segment, it is last, and every
earlier segment is nonterminal.

Only the terminal segment has non-null `terminalEvidence`. It contains exactly
`kind: "fixture_scope_exhausted"`, `segmentOrdinal`, `selectorDigest`,
`payloadDigest`, `observedMemberCount`, and `digest`; `digest` is SHA-256 of the
canonical object containing the preceding five fields. Every nonterminal
segment has `terminalEvidence: null`.

Let `E` be `expectedPopulation.memberIdentities`. Let `O` be the
member-ID-sorted concatenation of every segment's
`observedMemberIdentities`, retaining every repeated occurrence. Let `U` be
the member-ID-sorted unique values of `O`. The witness stores `O` exactly as
`observedPopulationIdentities` and `U` exactly as
`observedUniquePopulationIdentities`; duplicate detection never removes a value
from `O`.

The equations are exact:

```text
observedPopulationCount = |O| = sum(segment.observedMemberCount)
uniquePopulationCount = |U|
duplicateCount = sum over x in U of max(multiplicity(O, x) - 1, 0)
missingCount = |E \\ U|
unresolvedCount = |{ x in U : registryMatchCount(x) != 1 }|
```

The frozen registry already requires unique member identities, but
`registryMatchCount` is still recomputed so missing, extra, or ambiguous
material cannot be laundered. Every identity in `E` and `U` uses exact string
equality; no case folding, alias, or normalization participates.

`reconciliation` contains exactly:

```text
recomputedExpectedCount
recomputedObservedCount
recomputedUniqueCount
recomputedDuplicateCount
recomputedMissingCount
recomputedUnresolvedCount
recomputedExpectedIdentityDigest
recomputedObservedIdentityDigest
recomputedObservedUniqueIdentityDigest
recomputedPopulationScopeDigest
recomputedSegmentSequenceDigest
recomputedTerminalEvidenceDigest
countsReconciled
identitiesReconciled
scopeReconciled
segmentsReconciled
terminationReconciled
```

The three identity digests cover canonical `E`, `O`, and `U`, respectively.
The segment-sequence digest covers the complete ordinal-ordered `segments`
array. The terminal digest equals the last segment's
`terminalEvidence.digest`. `countsReconciled` is true exactly when the six
recomputed counts equal the six stored/equation-derived values above.
`identitiesReconciled` is true exactly when the stored expected, observed, and
unique arrays equal `E`, `O`, and `U` and all three digests replay.
`scopeReconciled` is true exactly when the registry population, data boundary,
scope reference, source, revision, contract, and their digests all replay.
`segmentsReconciled` is true exactly when every ordinal, selector, payload,
declared/observed count, member array/digest, continuation, and complete
sequence digest replays. `terminationReconciled` is true exactly when there is
one terminal segment, it is last, every prior segment is nonterminal, and its
terminal evidence replays. Each Boolean must be true and must result from O0's
own recomputation, not an executor assertion.

Admission requires zero duplicate, missing, and unresolved members;
`nonTruncated: true`; `nonTimedOut: true`; and `budgetsExhausted: false`.
Failure of any complete-witness field produces a non-retryable
`complete_snapshot_witness_invalid` source outcome, no candidate identity, and
no promotion preparation.

## Emission partition and absence semantics

Only after the complete witness passes may O0 validate candidate output.
`populationPartition` contains exactly `emitted`, `excluded`, and
`documentedLoss`. `emitted` is member-ID-sorted. Each entry contains exactly a
`memberIdentity` and a logical-item-ID-sorted unique array of `logicalItemIds`.
Every logical item resolves to the same member's exact registered logical item,
and a logical-item ID may occur in only one emitted entry across the source.
`excluded` is member-ID-sorted. Each entry contains exactly `memberIdentity`,
`reason: "documented_source_contract_exclusion"`,
`sourceContractRuleId`, `sourceContractRuleVersion`,
`sourceContractRuleDigest`, and `evidenceDigest`. The rule and evidence must
replay against the exact tuple-bound source contract.

Let `EM` be the emitted member-ID array, `EX` the excluded member-ID array,
`LI` the concatenation of all emitted logical-item IDs, `LA` the logical asset
descriptor array, and `PA` the unique byte-digest array. The equations are:

```text
EM and EX are individually unique and EM intersection EX is empty
sorted(EM union EX) = expectedPopulation.memberIdentities
emittedMemberCount = |EM|
excludedMemberCount = |EX|
logicalItemCount = |LI| = sum(emitted[*].logicalItemIds.length)
logicalAssetCount = |LA|
physicalAssetCount = |PA| = count(unique(LA[*].byteDigest))
candidateCount = 1
```

Global logical-item uniqueness makes `|LI|` equal both the concatenation length
and the global union size. Every registered logical item for an emitted member
occurs exactly once in `LI`; excluded members contribute none. Every logical
asset in `LA` is registered to an emitted member, and every registered asset
for an emitted member occurs exactly once. No asset from an excluded or unknown
member is permitted.

`documentedLoss` is either
the closed object containing `state: "none"`, `excludedCount: 0`,
`excludedIdentityDigest`, and `exclusionDigest`, or the same four properties
with `state: "documented"` and a positive `excludedCount`. The identity digest
covers the canonical excluded member-ID array; the exclusion digest covers the
complete canonical `excluded` array. The `none` variant uses the digests of
empty canonical arrays. `excludedCount` equals `|EX|` in both branches.

Zero emitted records are valid only after the complete-population witness
passes. For a nonempty witnessed population, every nonemitted identity MUST
have one documented source-contract exclusion. No generic filter, warning,
keyword, relevance decision, or silent loss is permitted.

Candidate metadata contains exactly `candidateKind`, `semanticDataAsOf`,
`absenceSemantics`, `emittedMemberCount`, `excludedMemberCount`,
`logicalItemCount`, `logicalAssetCount`, `physicalAssetCount`, and
`candidateCount`. `candidateKind` is
`fixture_complete_snapshot`. `semanticDataAsOf` is either
`{ "state": "not_supplied" }` or
`{ "state": "declared", "logicalTime": <closed logical-clock value> }` and
must be supplied by the fixture contract, never wall time. `absenceSemantics`
is exactly `none`. Every count equals the equations above; `candidateCount` is
exactly one even when the witnessed population or emitted logical-item set is
empty. Absence never establishes deletion, withdrawal, correction, amendment,
supersession, legal effect, or any other semantic change.

For a `source_outcome`, `candidateCount` equals
`candidateReferences.length` and is one for `candidate_prepared` or
`complete_zero_output` or `reused_verified`, zero otherwise. For a completed
`run_result`, `candidateCount` equals both the length of its globally unique
candidate-reference array and the sum of embedded source-outcome candidate
counts. For a rejected run, its array is empty and its count is zero even if a
retained durable source outcome already names a sealed candidate; those
references are quarantined from that run result and remain reachable only
through their independently verified source custody. No source can contribute
more than one candidate. These equations are checked before any promotion
preparation is accepted.

## Semantic candidate identity

The candidate identity preimage is the complete closed object containing
exactly:

```text
candidateManifestVersion
o0Contract
canonicalizationProfile
k0PublicInterface
sourceContract
fixtureRegistrySchema
fixtureRegistry
fixtureExecutor
fixtureSemanticDigest
candidateSchema
validationProfile
runManifestSchema
promotionManifestSchema
completePopulationWitness
dataBoundary
populationPartition
opaqueK0References
candidateMetadata
logicalItems
assets
```

`candidateManifestVersion` is `o0-candidate-manifest-1`. Every compatibility
entry is copied exactly from the tuple. `sourceContract` is the tuple's exact
entry and therefore contains its `id`, `version`, `digest`, `sourceId`, and
`sourceRevision`.
`completePopulationWitness` is the entire accepted witness; `dataBoundary` is
an exact second copy and must equal the witness value. The complete
compatibility tuple is thereby identity-bound, including both registry schema
and registry and both run- and promotion-manifest schemas.

`opaqueK0References` is sorted by `referenceId` and contains complete
`OpaqueK0Reference` values. Every referenced O0 validation receipt must be
durable, byte-replayable, source-compatible, and bound to the exact frozen K0
seam. O0 retains no copied K0 value or semantic label.

`logicalItems` is logical-item-ID sorted and contains exactly the complete
registered logical items referenced by emitted members. `assets` is sorted by
`logicalPath` and contains complete `RegisteredAsset` values for those members.
Logical paths are unique, relative POSIX paths of at most eight segments. A
segment is 1 through 64 lowercase ASCII letters, digits, dots, underscores, or
hyphens; it cannot be `.`, `..`, begin or end with a dot or space, contain two
adjacent dots, or be a Windows device name under case folding. Roles are
exactly `candidate_data`, `candidate_index`, or `candidate_evidence`. Media
types are exactly `application/json`, `application/x-ndjson`, or
`application/octet-stream`. Byte length and SHA-256 are recomputed from the
exact registry-bound asset bytes.

Every logical item and asset must be byte-for-byte represented by the frozen
registry projection and pass the exact tuple-bound candidate schema and
validation profile before identity or sealing. Validation is structural: it
rejects unknown fields, unregistered IDs, paths, bytes, lengths, digests,
members, roles, media types, and substitutions. O0 does not attempt to infer
whether opaque bytes are personal, private, land-related, real, or synthetic.
Those bytes are inadmissible unless a separately reviewed frozen synthetic
registry already binds their exact identity and digest. A candidate-validation
failure is non-retryable and produces no sealed object or promotion
preparation. O0 does not edit, repair, normalize, classify, or
accept-with-warning any item.

If `P` is the `ps-c14n-json-1` bytes of this entire preimage and `D` is
SHA-256(`P`), then:

```text
candidateId = o0:candidate:sha256:<D>
```

The durable candidate manifest contains exactly `candidateId` and
`identityPreimage`. The ID must replay. Two candidates with identical asset
bytes but different source revisions, contracts, registries, executors,
fixture semantics, schemas, validation profiles, witnesses, boundaries,
partitions, K0 references, metadata, or asset roles/paths/media types therefore
cannot share an ID without a SHA-256 collision, which is treated as a custody-
integrity failure.

The following operational fields are exactly excluded from candidate identity
and are forbidden inside `identityPreimage`:

- run fields: `runId`, run receipt ID, physical start/end, logical run-open and
  run-close ticks, and source completion order;
- attempt fields: attempt receipt ID, attempt ordinal, retry count, retry code,
  retry schedule, transcript event order after canonical sorting, and worker or
  completion order;
- filesystem fields: repository root, O0 root, staging/object/run/promotion
  paths, preparation path, volume/device/file identifiers, handles, operation
  ordinals, fault-injection ordinal, and atime/mtime/ctime/birthtime;
- promotion fields: preparation and result receipt IDs, promotion ID,
  generation, predecessor promotion/candidate/generation, commit filename,
  promoted logical tick, and `reused_verified` or `already_current` result;
- correction-custody fields: `custodyInspectionReceiptId`,
  `custodyVerificationReceiptId`, `custodyCorrectionReceiptId`,
  `supersededCustodyReceiptId`, `custodyFailureCode`, and
  `custodyRecoveryAttemptOrdinal`; and
- LKG/projection fields: current generation, chain tip, current/LKG candidate
  ID, current flag, staleness, degraded, unavailable, not-monitored, or source-
  health state.

These fields never alter a candidate ID. Only fields named by an exact receipt
payload above may be emitted in O0 `1.0.0`; the named correction-custody fields
are therefore not emitted, and there is no administrative custody-correction
capability. Their explicit exclusion prevents a later append-only custody
annotation from being mistaken for candidate semantics. A source-semantic
correction is not an operational correction: it changes at least source
revision, fixture semantic digest, witness, partition, metadata, K0 references,
or assets and therefore changes candidate identity.

## Duplicate, reuse, and orphan semantics

The outcomes are exact:

- Duplicate source plans reject the whole plan before execution or mutation.
- A duplicate candidate reference in one source outcome or run is a structural
  rejection before promotion.
- If the content-addressed destination already exists, O0 verifies the exact
  manifest ID and bytes, every asset path/role/media type/length/digest, the
  object seal, compatibility tuple, containment, component types, case identity,
  and single-link state. Exact equality returns `reused_verified` and writes no
  candidate/object byte; it may publish only the deterministic durable source
  outcome and run receipts. Any mismatch for the claimed ID is
  `custody_integrity_failure` and no fallback object is used.
- If the fully verified candidate is already the unique current chain tip,
  promotion returns a durable idempotent `already_current` result but appends no
  promotion generation or commit.
- A fully verified sealed candidate with no promotion is an orphan. It may
  resume only with its exact sealed preparation receipt and only if the current
  verified predecessor is unchanged from that preparation.
- A partial or unsealed object is never a candidate, never reusable, and never
  promotable. It is eligible only for verified staging cleanup.
- A sealed orphan is retained. Deleting it is outside O0 `1.0.0`.

No exact duplicate is silently deduplicated at an input boundary. Reuse is a
post-seal custody result reached only after full independent verification.

## Dedicated root and fixed physical layout

The exact successful platform profile is `o0-windows-node-ntfs-process-crash-1`
version `1.0.0`. `PlatformProfile` contains exactly `id`, `version`,
`nodeVersion`, `platform`, `arch`, `fileSystem`, `gitVersion`, `crashModel`,
`concurrencyModel`, `powerLossDurability`, `hostilePathRaceResistance`, and
`profileDigest`, with these values:

```text
id = o0-windows-node-ntfs-process-crash-1
version = 1.0.0
nodeVersion = v24.14.1
platform = win32
arch = x64
fileSystem = NTFS
gitVersion = 2.55.0.windows.2
crashModel = single_process_termination
concurrencyModel = single_o0_writer_no_external_filesystem_mutator
powerLossDurability = not_claimed
hostilePathRaceResistance = not_claimed
```

`profileDigest` is `DigestOf` the object containing exactly the preceding
eleven fields. An implementation on any other Node, operating system,
architecture, filesystem, Git version, crash model, or concurrency model
returns `platform_proof_unavailable` before executor invocation or mutation.
The contract does not silently fall back to weaker behavior.

The caller supplies absolute `repositoryRoot` and `o0Root` paths but supplies
no managed relative path. The O0 root must resolve exactly to:

```text
<repositoryRoot>/.cache/o0/<rootKey>
```

`rootKey` is `DigestOf` the object containing exactly
`rootPurpose: "o0-fixture-custody"` and the complete `CustodyProfile`. It is
recorded in every execution preparation. Because every source in a run has the
same custody-profile entries, one run cannot derive two roots.
Each supplied absolute path is at most 512 UTF-8 bytes, uses one ordinary drive-
absolute Windows form, has no extended-device or UNC prefix, and has no empty,
dot, dot-dot, ADS, reserved-device, trailing-dot, or trailing-space component.
The repository root, `.cache`, `o0`, and root-key directory must already exist
as ordinary, non-reparse directories before planning. O0 never creates or
selects a broader root. The root is dedicated to that exact root profile; every
source-specific tuple remains independently bound by its object. The root is
not `dist`, `.git`, the repository root, or an ancestor of any of them.

### Complete Git-ignore predicate

O0 does not parse `.gitignore`. `GitIgnoreProof` contains exactly
`proofVersion: "o0-git-ignore-proof-1"`, `repositoryRoot`,
`repositoryIdentityDigest`, `gitVersion`, `relativeCustodyRoot`, `argv`,
`stdinByteLength`, `stdinDigest`, `exitCode`, `record`, and `proofDigest`.
`repositoryIdentityDigest` is `DigestOf` the object containing exactly
`repositoryRoot` and `reportedTopLevel`, where the latter is the bounded
read-only result of `git rev-parse --show-toplevel`; both paths must be
exact-case equal.
`relativeCustodyRoot` is exactly `.cache/o0/<rootKey>` with POSIX separators.

The only permitted ignore evaluation is a shell-free `node:child_process`
`spawnSync` of executable `git` with exact argv
`["-C", repositoryRoot, "check-ignore", "--no-index", "-v", "-z", "--stdin"]`,
an environment that removes all `GIT_*` overrides but retains ordinary
executable lookup, a 1,024-byte stdout ceiling, a 1,024-byte stderr ceiling,
and stdin equal to UTF-8(`relativeCustodyRoot`) followed by one NUL byte. The
version must first equal the platform profile's exact `gitVersion`. There is no
shell and no caller-controlled argument, option, environment override, or
additional pathname.

Success requires exit code 0, empty stderr, and exactly one four-field NUL-
delimited verbose record: source file, decimal line number, effective pattern,
and pathname. The pathname must byte-equal `relativeCustodyRoot`; source and
pattern must be nonempty bounded strings; no second record or trailing non-NUL
byte is allowed. `record` contains exactly `source`, `lineNumber`, `pattern`,
and `pathname`. `proofDigest` is `DigestOf` every preceding proof property.
Git's evaluator therefore applies the complete applicable repository rules,
`.git/info/exclude`, `core.excludesFile`, and later negations. `--no-index`
prevents a tracked path from being mistaken for an ignored custody root. A
successful ignore result for the directory establishes its subtree under Git's
rule that a file cannot be re-included while a parent directory remains
excluded. The proof is recomputed during plan compilation and immediately
before the first mutation of every state-changing request; a byte change is
`git_ignore_not_proven`.

The only top-level children and layouts are:

```text
operations/<operationKey>/intent
operations/<operationKey>/boundaries/<boundaryKey>
receipt-staging/<operationKey>/<receiptDigest>/receipt
receipts/sha256/<receiptDigest>/receipt
run-staging/<operationKey>/run-manifest
runs/<runKey>/run-manifest
staging/<sourceKey>/<operationKey>/candidate-manifest
staging/<sourceKey>/<operationKey>/assets/<assetDigest>
staging/<sourceKey>/<operationKey>/seal
objects/sha256/<candidateDigest>/candidate-manifest
objects/sha256/<candidateDigest>/assets/<assetDigest>
objects/sha256/<candidateDigest>/seal
promotion-staging/<sourceKey>/<operationKey>/commit
promotions/<sourceKey>/<generationKey>/commit
```

Fixed names appear exactly as shown. Every variable physical component is a
bare lowercase SHA-256 digest. `sourceKey` is `DigestOf` the object containing
exactly `sourceId`; it is stable across source revisions.

`OperationSubject` is the exact discriminated union below. Every named ID or
key must replay before the operation key is formed:

| `subjectKind` | Remaining exact properties |
| --- | --- |
| `receipt` | `receiptId` |
| `run` | `runId` |
| `candidate` | `sourceId`, `candidateId` |
| `promotion` | `sourceId`, `candidateId`, `generation` |
| `candidate_staging_cleanup` | `sourceKey`, `subjectOperationKey` |
| `promotion_staging_cleanup` | `sourceKey`, `subjectOperationKey` |

An originating `operationKey` is `DigestOf` the object containing exactly the
originating `requestId`, `operationKind`, `rootKey`, and complete
`operationSubject`. This prevents two source candidates or two receipts from
sharing a physical journal merely because one request produced both. Candidate,
run, and receipt keys are the digest portions of their IDs. `generationKey` is
`DigestOf` the object containing exactly `sourceKey` and one-based
`generation`. `boundaryKey` is `DigestOf` the complete `MutationBoundary`.

An exact resume request carries `subjectOperationKey` and may continue only
the already-authored boundaries of that verified subject journal; it never
changes that journal's intent or operation key. After the subject operation and
its original result are closed, the resume result is published by a distinct
`publish_receipt` operation whose subject is that result receipt. An exact
cleanup request likewise carries `subjectOperationKey`, but creates a distinct
cleanup operation and journal whose `operationSubject` binds the subject key.
It never reuses the subject journal for removal evidence. Logical asset paths
remain only in the candidate manifest; physical asset names are their byte
digests. No managed relative path exceeds eight components.

`ChainTip` contains exactly `promotionReceiptId`, `candidateId`, `generation`,
and `objectSealDigest`. `ExpectedChainTipEntry` contains exactly `sourceId`,
`sourceKey`, and `tip`, where `tip` is one `ChainTip` or null for genesis.
Expected chain-tip entries are source-ID sorted and unique. An
`ExpectedPredecessor` is exactly one `ChainTip` or null; it is null only for
generation 1.

`ExpectedEntry` contains exactly `relativePath`, `entryKind`, and
`contentBinding`. `entryKind` is `file` or `directory`. `contentBinding` is the
exact union `{ "bindingKind": "directory" }`, the object containing exactly
`bindingKind: "exact_bytes"`, `byteLength`, and `byteDigest`, or the object
containing exactly `bindingKind: "derived_boundary"` and one complete
`boundary`. The branch must agree with the entry kind. Boundary bytes are
uniquely derived after the named physical event from that boundary and the
then-current complete owned-entry array; every other file is exact-byte bound
before its operation begins. Expected entries are relative-path sorted and
unique and contain every directory, output file, journal boundary file, and
result file the operation can create; no later step may extend that array. The
intent file is the one fixed self-describing bootstrap path and is not an entry
in its own array.

`OwnedEntry` contains exactly `relativePath`, `entryKind`, `lifecycleState`,
`byteLength`, `byteDigest`, `volumeId`, `fileId`, `linkCount`,
`creatorOperationKey`, and `completedBoundary`. `entryKind` is `file` or
`directory`. `lifecycleState` is `planned`, `partial`, `complete`, `published`,
or `removed`. `creatorOperationKey` equals the owning operation. For `planned`,
all byte/identity fields and `completedBoundary` are null. For a directory,
`byteLength` and `byteDigest` are null. For a partial or complete file they are
the exact current length and digest. `volumeId` and `fileId` are unsigned
decimal strings derived from the opened handle's `dev` and `ino`; `linkCount`
is the exact positive integer `nlink`. Identity fields are non-null after
creation and must replay. `completedBoundary` is null only for `planned` or
`partial`; otherwise it is one complete `MutationBoundary`.

Owned-entry arrays cover operation-owned output, staging, and result entries;
they never contain the operation intent or immutable journal boundary files.
Those two journal classes are independently fixed by the operation layout,
intent, template, ordinals, expected-entry array, and exact publication rule.
This exclusion prevents a boundary file from recursively claiming itself while
leaving every cleanup-eligible entry explicitly owned.

`MutationBoundary` contains exactly `operationKind`, `boundaryName`,
`entryOrdinal`, and `operationOrdinal`. `entryOrdinal` is zero for a
non-entry-specific boundary and otherwise the one-based canonical entry order.
`operationOrdinal` is one-based, contiguous, and derived by expanding the
operation template below. The immutable boundary file contains exactly
`boundary`, `ownedEntries`, and `boundaryDigest`; the digest is `DigestOf` the
preceding two properties. `ownedEntries` is relative-path sorted and unique.
`operationKind` is exactly `publish_receipt`, `publish_run`,
`publish_candidate`, `publish_promotion`, `cleanup_candidate_staging`, or
`cleanup_promotion_staging`. Its operation subject must be, respectively,
`receipt`, `run`, `candidate`, `promotion`, `candidate_staging_cleanup`, or
`promotion_staging_cleanup`; no other pairing is valid. Cleanup-owned entries
retain their original `creatorOperationKey`, while each removal boundary names
the distinct cleanup operation key. The cleanup preparation, original intent,
and cleanup intent jointly authorize that transition.

All internally derived managed paths are resolved against the already verified
root. Component-by-component `lstat` and realpath checks prove exact containment
and exact case immediately before every read or mutation; opened-handle `stat`
and a second `lstat`/realpath check must agree immediately afterward. Managed
relative values reject absolute,
rooted, drive-qualified, drive-relative, UNC, device, namespace, ADS/colon,
slash/backslash-mixed, empty, `.`, `..`, percent-encoded, NUL, control-character,
trailing-dot, trailing-space, and case-alias forms. The absolute caller-supplied
Windows root may have its one expected drive prefix; no managed relative input
may have one.

Every component and target rejects symbolic links, junctions, mount points,
reparse points, hard links or link count other than one, alternate data streams,
file-identity aliasing, case-fold collisions, and Windows reserved device names.
Reads retain the opened handle, compare handle identity to the checked
component, enforce the byte limit while reading, and reverify identity after
reading. Directory enumeration is bounded and rejects unknown names rather
than ignoring them. Node on the named target exposes no no-follow/open-at
primitive; this sequence is a detection check inside the exact
no-external-mutator model, not a claim of resistance to a hostile concurrent
path race.

## Candidate custody and filesystem durability

O0 `1.0.0` uses “durable” only to mean that a completed file-sync/close or
same-volume rename remains available after termination of the one O0 Node
process while Windows and the NTFS volume continue running. It does not claim
survival across operating-system crash, volume loss, storage-controller loss,
or power loss. It does not claim parent-directory persistence because Node
`v24.14.1` on the named Windows target cannot synchronize a directory. It does
not claim hostile concurrent no-follow safety because that runtime provides no
no-follow/open-at primitive. Requiring either excluded property is a successor-
contract and separately reviewed platform-mechanism decision, not a best-effort
branch.

Every file write uses only reachable Node operations: create the exact new file
with `open("wx")`; write the bounded bytes; call `FileHandle.sync()`; close;
reopen read-only; read within the bound; compare byte length and digest; compare
opened-handle `dev`, `ino`, and `nlink` to the immediately surrounding path
checks; close; and record the completed boundary. No overwrite, append, retry
inside one write invocation, directory sync, hard link, symlink, junction, or
cross-volume rename is permitted. After process termination only, an owned
partial ordinary file may be reopened with `r+` and continued at its exact
current offset if its bounded bytes are an exact prefix of the intent-bound
expected bytes; the implementation writes only the missing suffix and then
syncs, closes, reopens, and verifies the whole file. A full expected prefix is
not rewritten. Any other unexpected existing path or byte sequence is
`custody_integrity_failure`.

`PhysicalAssetEntry` contains exactly `byteDigest`, `byteLength`,
`logicalPathCount`, and `logicalPathDigest`. `logicalPathDigest` is `DigestOf`
the logical-path-sorted unique array of candidate asset paths having that byte
digest. Physical entries are byte-digest sorted and unique. Exactly one
physical file is written per unique byte digest even when two or more logical
paths have identical bytes. `logicalPathCount` equals the array length and
`byteLength` equals every logical descriptor in that group.

`CandidateSealBody` contains exactly
`sealVersion: "o0-candidate-object-seal-1"`, `candidateId`,
`candidateManifestByteLength`, `candidateManifestByteDigest`,
`logicalAssetCount`, `physicalAssetCount`, and `physicalAssets`.
`logicalAssetCount` equals `candidateMetadata.logicalAssetCount` and the
manifest asset-array length. `physicalAssetCount` equals the unique-digest
array length and `candidateMetadata.physicalAssetCount`. `physicalAssets` is
the byte-digest-sorted `PhysicalAssetEntry` array. `CandidateSeal` contains
exactly `objectSealDigest` and `body`; `objectSealDigest` is `DigestOf(body)`.
The seal never digests itself.

### Deterministic mutation boundaries and recovery

Every mutation-capable request expands one of these exact operation templates.
For each entry placeholder, entries are relative-path sorted and its five
entry boundaries are repeated in order:

```text
operation_directory_created
intent_created
intent_written
intent_synced
intent_closed
intent_verified
entry_created
entry_written
entry_synced
entry_closed
entry_verified
tree_verified
directory_published
published_tree_reopened
published_tree_verified
result_receipt_created
result_receipt_written
result_receipt_synced
result_receipt_closed
result_receipt_verified
result_receipt_published
operation_closed
```

`publish_receipt` has only the operation, intent, result-receipt, and close
boundaries. `publish_run` inserts one run-manifest entry.
`publish_candidate` inserts directories, unique-digest-sorted physical assets,
candidate manifest, and seal entries; the seal is last. `publish_promotion`
inserts one commit entry. `cleanup` replaces entry create/write boundaries with
`entry_verified_for_removal` and `entry_removed` for each reverse-relative-
path-ordered owned entry, followed by `directories_removed`. The resulting
`operationOrdinal` sequence is one-based and contiguous. A future fault
injector names only that ordinal.

The operation intent contains exactly `intentVersion: "o0-operation-intent-1"`,
`requestId`, `operationKind`, `operationSubject`, `operationKey`, `rootKey`,
`compatibility`, `expectedEntries`, and `intentDigest`; the digest covers the
preceding eight properties. It is the ownership authority for planned paths. A crash while
creating the intent is the only bootstrap partial state. Re-invoking the exact
same request derives the same operation key, verifies that the operation
directory contains only the one expected ordinary single-link partial intent,
records its length/digest/identity as a partial `OwnedEntry`, removes only that
file, and restarts intent publication. No different request or administrative
override may do so.

After a verified intent exists, every completed boundary has one immutable
boundary file. A boundary file itself is published by `wx`, bounded write,
file sync, close, reopen, and exact verification; it is not recursively
journaled. If termination leaves exactly one boundary file whose bytes are an
exact prefix of its uniquely derived expected bytes, exact-request recovery
finishes only its missing suffix and verification before interpreting that
boundary as complete. On invocation or resume, O0 enumerates only the bounded
expected operation tree, replays the intent, every contiguous boundary, and
every owned entry, then applies exactly one transition:

| Observed exact state | Only next transition |
| --- | --- |
| no operation directory | start the operation |
| bootstrap partial intent | exact-request bootstrap removal and intent restart |
| verified intent, no entry partial | execute the next derived boundary |
| one exact-prefix owned entry or boundary-file partial | exact-request replay writes only the missing suffix, then syncs, closes, reopens, verifies, and records the uniquely next boundary |
| one owned unsealed non-prefix partial whose identity still matches its creation boundary | emit `mutation_interruption`; only `verifyCustody` may prepare bounded cleanup |
| complete unsealed candidate staging | verify then continue with the seal entry |
| complete sealed candidate staging | verify then same-volume publish it; exact `executePlan` replay or a `candidate_publication` resume may take this route |
| complete promotion staging | verify then same-volume publish it; exact `promoteCandidate` replay or a `promotion_publication` resume may take this route |
| destination published, result receipt absent | reopen/replay destination, publish the deterministic result receipt, and close |
| result receipt published, operation not closed | replay receipt, write `operation_closed`, and return it |
| operation closed | return the byte-identical durable result |
| gap, unknown entry, mismatch, two partials, noncontiguous boundary, or conflicting destination | return `custody_integrity_failure` with no mutation |

The retry after a process interruption is operation recovery, not a semantic
source retry. Executor population is considered emitted only when the complete
registry-bound `ExecutorResult` boundary is published. A process termination
before that boundary is deterministically
`executor_interrupted_before_population`; after it, recovery reconstructs the
same result from the frozen registry and boundary digests and may not relabel or
retry it into another completeness mode.

Durable receipt publication always uses
`receipt-staging/<operationKey>/<receiptDigest>/receipt`, replays the complete
receipt bytes, and same-volume renames the receipt directory to
`receipts/sha256/<receiptDigest>`. An equal existing receipt is idempotent; a
mismatch is integrity failure. Run-manifest publication uses the analogous
run-staging path. Every source outcome and mutation interruption is independently
stored before the run result references it. A run/result crash is therefore
recovered from the deterministic request, operation boundaries, frozen
registry, candidate/run objects, and globally stored receipts without an
administrative override.

An immutable candidate is published only after the complete staging subtree
and seal replay. Same-volume directory rename gives atomic process-visible
publication on the named target. A complete reopen/reread/reverify follows.
Promotion references only the immutable verified object. Failure of the future
exact-platform process-kill procedure yields `platform_proof_unavailable`; the
implementation may not rename atomic visibility as power-loss durability.

## Per-source promotion and chain ceiling

Promotion is per `sourceKey` and append-only. The envelope binds the complete
source compatibility. A `PromotionCommit` is the complete durable
`promotion_result` receipt envelope whose payload has `resultCode: "promoted"`,
`failure: null`, and `committedPromotionReceiptId: null`. Its
`preparationReceiptId` names the exact promotion or resume preparation.
`predecessor` is null only for generation 1 and otherwise is the exact
`ExpectedPredecessor`. `logicalCommittedAt` equals the preparation's exact
`PromotionLogicalTime`; its tick equals generation. The envelope's
non-self-referential `receiptId` is the promotion ID.

The complete canonical `PromotionCommit` is first written to
`promotion-staging/<sourceKey>/<operationKey>/commit` under its verified
operation intent. Only after replay is the complete staging directory renamed
same-volume and no-clobber to
`promotions/<sourceKey>/<generationKey>`. A process crash before rename leaves
complete promotion staging, reachable through exact request replay or a
`promotion_publication` resume. A crash after rename is recovered by reopening
the published commit and publishing any missing result receipt/boundary. An
unsealed or partial promotion staging directory is cleanup-eligible only through
its operation/interruption evidence.

Two logically concurrent requests naming the same generation necessarily target
the same final slot and are serialized through the one writer; only the first
publication can succeed. The later request reopens and verifies the complete
published `PromotionCommit`. If candidate, seal, generation, predecessor, and
logical time are byte-equal, it returns a distinct idempotent
`promotion_result` with `resultCode: "already_current"` and
`committedPromotionReceiptId` equal to the winner's receipt ID; it appends no
generation. A different candidate or predecessor is `stale_predecessor`. It
never creates a fork.

A verified chain begins at one generation 1 `PromotionCommit`, increments by
exactly one, has exact predecessor IDs, candidates, seal digests, and
generation-derived logical times, contains no gap, fork, duplicate, dangling
receipt, unknown file, or invalid candidate, and has exactly one tip.
Current state is derived only by bounded enumeration and verification of this
unique tip. Modification time, directory order, a mutable `latest` file, and a
caller hint are never authority. Integrity failure closes the chain; O0 MUST
NOT roll back to an older apparently valid generation.

The chain is one-based and capped at 64 generations. A verified current
generation 63 may prepare and append generation 64. A verified current
generation 64 yields `promotion_chain_limit` during plan compilation, before
executor invocation or filesystem mutation. Generation 65 is never staged,
prepared, or named.

O0 `1.0.0` performs no automatic garbage collection, historical pruning,
compaction, checkpoint substitution, generation renumbering, history rewrite,
sealed-candidate deletion, promotion deletion, or rollback. Future archival,
compaction, increased capacity, migration, sealed-orphan deletion, or history
rewrite requires a separate contract and exact owner authorization.

## Bounded staging cleanup

`cleanupKind` is exactly `candidate_staging` or `promotion_staging`.
Candidate cleanup is limited to
`staging/<sourceKey>/<operationKey>`; promotion cleanup is limited to
`promotion-staging/<sourceKey>/<operationKey>`. The cleanup preparation's
`interruptionReceiptId` must resolve to the exact durable
`mutation_interruption` that names the same operation, partial entry, and
complete owned-entry inventory. A caller cannot synthesize ownership.

A candidate subtree may contain only its fixed directories, manifest, at most
64 unique-digest physical asset files, and one unsealed partial file, with at
most 70 ordinary entries. A promotion subtree may contain only its fixed
directory, one commit file, and one unsealed partial file, with at most four
ordinary entries. Every path, kind, lifecycle, byte field, volume/file/link
identity, creator operation, and completed boundary must equal one
`OwnedEntry`. An unknown file, alias, link, mount, reparse point, identity
mismatch, second partial, published destination, candidate seal, or complete
promotion commit makes cleanup `cleanup_not_safe` before deletion.

Complete sealed candidate staging is never cleanup-eligible; it is reachable
through exact `executePlan` replay or `candidate_publication` resume. Complete
promotion staging is likewise reachable through promotion replay or
`promotion_publication` resume. Content-addressed objects, global receipts,
runs, promotion commits, operation evidence, another source, and another
operation are never cleanup targets.

`abortStaging` first performs a bounded component walk without recursion across
unverified entries. Only after the complete walk proves the exact ordinary
subtree does it remove verified files in reverse relative-path order, then
empty fixed directories bottom-up. Each success writes its deterministic
removal boundary. `removedEntries` records the exact entries with
`lifecycleState: "removed"`; `remainingEntries` records every not-yet-removed
entry in its last verified state. Any verification or deletion failure stops,
leaves all not-yet-removed material untouched, and returns `partial_cleanup`
with `cleanup_partial` failure evidence. It never switches to generic recursive
removal.

Receipt-staging and run-staging partials are not exposed to `abortStaging`.
Their exact originating request applies the exact-prefix continuation rule;
non-prefix or identity-mismatched material fails closed and is never removed by
O0 `1.0.0`. A bootstrap-intent partial is the sole exception: before any
verified intent or boundary exists, the exact request may remove that one
identity-checked file and restart intent publication. Any other request is
rejected. This supplies recovery for every supported mutation boundary without
broadening cleanup ownership or creating an administrative override.

## Frozen resource and adversarial-evidence budgets

`BudgetProfile` contains exactly `id: "o0-fixture-budget-v1"`,
`version: "1.0.0"`, `ceilings`, and `profileDigest`. `ceilings` contains exactly
the following named inclusive values; `profileDigest` is `DigestOf` the object
containing exactly `id`, `version`, and `ceilings`:

| Resource | Ceiling |
| --- | ---: |
| Sources per run | 8 |
| Attempts per source | 3 |
| Attempts per run | 24 |
| Fixture items per source | 256 |
| Logical candidate assets per source | 64 |
| Physical candidate assets per source | 64 |
| Logical candidate items per source | 512 |
| Fixture input bytes per source | 8,388,608 (8 MiB) |
| Staged candidate bytes per source | 16,777,216 (16 MiB) |
| Canonical bytes per manifest or receipt | 1,048,576 (1 MiB) |
| Managed relative path depth | 8 |
| Verified promotion-chain length | 64 |
| Injectable promotion filesystem operations | 64 |
| Deterministic cases per test file | 10,000 |
| Focused test deadline where explicitly needed | 30 seconds |

Exactly-at-limit cases are valid; limit-plus-one cases reject. Capacity is
checked in three noninterchangeable phases:

1. **Pre-executor.** Before executor invocation or candidate/promotion
   mutation, O0 checks source and planned-attempt counts, compatibility, the
   complete registry population/member count, fixture-input byte total, path
   depth, current promotion-chain length, every recomputed
   `OutputDeclaration`, root/platform/ignore proofs, and every declared maximum
   against the profile. An absent, understated, or mismatched declaration is
   `budget_exceeded`; the executor is not called.
2. **During execution.** Before reading or allocating each registered payload,
   selector token, continuation token, segment array, logical item, asset, or
   transcript event, O0 checks its registry-declared length/count and the
   remaining cumulative budget. The complete executor result must remain within
   the declaration. Limit failure closes that source without staging an output
   byte.
3. **Post-output/pre-seal.** After witness, partition, logical items, and assets
   are complete but before creating any candidate staging file, O0 computes the
   actual canonical candidate-manifest bytes, logical and physical asset counts,
   unique physical asset bytes, seal body/bytes, total staged bytes, and every
   count equation. Each actual value must be no greater than both its exact
   declaration and the profile ceiling. Only then may candidate staging begin.

Fixture-input bytes are the sum of the exact tuple-bound registry, source-
contract, executor, payload, selector-token, and continuation-token bytes
available to one source plan, with identical bound bytes counted once even if
operation recovery rereads them. Staged-candidate bytes are candidate-manifest,
unique physical asset, and seal bytes; two logical assets with one digest count
once physically. Logical item count is the globally unique logical-item array
length. Logical asset count is the manifest asset length; physical asset count
is the unique byte-digest count. Path depth counts root-relative components. A
transcript stores only the exact bounded schema above.

A later implementation's post-verification promotion publication protocol may
contain at most 64 injectable filesystem operations. The count begins after the
read-only candidate, chain, platform, and ignore verification and ends after
publication, reopen, and final verification. Each invoked `open`, `write`, `sync`,
`close`, `lstat`, `realpath`, `read`, `readdir`, `mkdir`, or `rename` in that
interval consumes one ordinal; retries are forbidden inside the interval. The
test harness may inject one failure ordinal from 1 through the exact operation
count. That injector is a module-private, test-build-only fixed integer seam; it
is not an exported callback, runtime capability, environment override, or
production option. Every ordinal and the post-crash observable states are
deterministically tested. Random, fuzz, probabilistic, or unrecorded-seed
testing is supplemental only and is never acceptance evidence.

## Structural non-interference and removability

Dependency direction is only from future experimental O0 modules to local O0
modules, the frozen `src/kernel/assertions/index.ts` seam, and these reviewed
runtime Node modules: `node:crypto`, `node:fs`, `node:fs/promises`, and
`node:path`. One isolated ignore-proof module may additionally import
`spawnSync` from `node:child_process` and may perform only the exact bounded
`git --version`, `git rev-parse --show-toplevel`, and `git check-ignore`
operations defined above, with `shell: false`. No other production module may
import or receive that function. Test-only modules may additionally use
`node:assert/strict`, `node:os`, and `node:test`. No other child process,
network, HTTP, DNS, browser, database, timer, worker, or dynamic-module API is
allowed.

Existing application, pipeline, adapter, artifact, K0, S0, B9, and B10 code
MUST NOT import, export, register, route to, or dynamically load O0. O0 MUST NOT
import lifecycle internals, S0, app, pipeline, adapters, current contracts,
source configuration, Nation data, artifact builders, or release code. There is
no production barrel.

Future implementation, if separately authorized, is confined to dedicated
experimental O0 schema/source/fixture/test paths plus the smallest additive
foundation-registration and import-boundary test entries. It cannot modify a
current schema, source registry, adapter, app, pipeline, artifact constructor,
K0/S0 implementation, package script, lockfile, B9/B10 chain, release item, or
convergence gate.

Every candidate test asset includes the exact planted string
`o0-fixture-custody-marker-v1-DO-NOT-PUBLISH`; receipts include
`o0-complete-population-witness-1`; and IDs include
`o0:candidate:sha256:`. Artifact tests require all three markers absent from
every `dist` path and byte. Exact planted paths `dist/o0`,
`dist/data/o0`, and `dist/data/orchestration` must be rejected as unmanifested.
No O0 custody, route, chunk, source map, manifest entry, dynamic import, or
asset may enter `dist`.

Non-interference evidence includes reverse-import barriers; planted leakage
markers; exact artifact-absence checks; before/after digests of protected
Nation and PolicyRecord roots; and sorted relative-path/SHA-256 inventories of
fixed-time builds. A detached-worktree removal proof must remove only future O0
implementation/schema/fixture/test paths and their additive validation entries,
rerun `npm run check`, and compare complete fixed-time `dist` inventories.
Every path and hash must match. Any shared dependency junction is verified,
unlinked nonrecursively outside the proof worktree, and shown not to affect its
target before the disposable worktree is removed. No product file may require a
compensating edit.

## Governance and convergence

`O0-ORCHESTRATION` belongs only to
`completion_scope.local_release_candidate.additive_vision_phases`. It depends
directly only on `K0-LIFECYCLE`, never `S0-SPATIAL`. Its authorization gate is
`G-O0-SYNTHETIC`; its convergence gate is `G-O0-CONVERGENCE`.

Only convergence-gate state `approved` or `satisfied` authorizes convergence.
Every other allowed state, including `closed` and `pending_evidence`, is
non-converged. While `G-O0-CONVERGENCE` is non-converged:

- O0 cannot enter required outcomes, accepted source blocks, or publication-
  only work;
- no required, accepted-source, publication, application, pipeline, artifact,
  B9, B10, or release item may depend directly or transitively on O0;
- O0 status cannot add, remove, satisfy, or block an existing release root;
- incomplete O0 cannot make an otherwise complete release incomplete;
- complete O0 cannot make an otherwise incomplete release complete; and
- code existence, a sealed candidate, or passing fixture tests cannot authorize
  convergence.

D0 remains absent and unauthorized. O0 creates only immutable evidence that a
future, separately contracted D0 might inspect.

## Frozen acceptance register A01-A32

The register below is normative. “Future test” means a deterministic test in a
separately authorized implementation session; no such test is authorized by
this candidate.

| ID | Required future acceptance evidence |
| --- | --- |
| `A01` | Prove the responsibility crosswalk and import ownership. Reject real discovery/retrieval/transport/parsing/normalization, public artifacts/health, B10 workflow, D0 semantics, protected assertions, services, and external persistence. |
| `A02` | Compile one through eight source-ID-sorted plans with one run-global custody profile and clock; bind the complete frozen registry, executor, source contract, population, member, logical-item, asset, schema, platform, budget, and K0 entries; reject arbitrary path/payload/callback/module input, unregistered or substituted material, disabled execution, cross-plan root/profile drift, and duplicate source IDs before executor invocation or candidate/promotion mutation. |
| `A03` | Accept representative one-segment, multi-segment, duplicate, missing, extra, multi-segment, and zero-population cases only after independently recomputing exact registry member bindings; expected set `E`; observed multiset `O`; unique set `U`; every selector, payload, continuation, terminal, count, set equation, and named reconciliation digest/Boolean. Only zero-duplicate/missing/unresolved `complete_snapshot` passes. |
| `A04` | For `partial_snapshot`, emit the exact closed non-retryable source-outcome branch with null candidate identity/count zero and prove no candidate or promotion preparation exists. |
| `A05` | Apply the identical closed behavior to `delta`. |
| `A06` | Apply the identical closed behavior to `unknown_completeness`. |
| `A07` | Once any incomplete mode or population member is emitted, prove the source transaction performs no later retry into `complete_snapshot`; prove only the three before-population/before-seal retry codes are retryable. |
| `A08` | Mutate one field at a time across witness version/mode/revision/fixture digest, data boundary/scope, exact expected member array/count/evidence, segment ordinals/selectors/payloads/member multisets/continuations/terminal evidence, stored `E`/`O`/`U`, all six counts, all twelve recomputed values, five Boolean equations, truncation, timeout, and budget state; every mutation fails closed with candidate count zero. |
| `A09` | Cover empty population, fully emitted population, valid documented exclusions, zero emission after a nonempty complete witness, missing exclusion, overlap, duplicate, extra/unresolved member, rule/evidence mismatch, global logical-item duplication, unregistered logical output/asset, every population/emission/exclusion/logical/asset/candidate count equation, documented-loss replay, and exact `absenceSemantics: "none"`. |
| `A10` | Replay arbitrary physical source/attempt completion orders and the three fixed semantic retry codes; canonical run/source receipts, the one run-global clock, stage-evidence preimages, promotion generation clock, candidate IDs, and unaffected source outcomes remain byte-identical and source-isolated. |
| `A11` | Golden-test every field of the complete semantic identity preimage and exact runtime candidate-ID formula, including all compatibility entries, witness, boundary, partition/loss, O0-issued validated K0 references, metadata/count equations, registered logical items, and logical-path-sorted asset descriptors. |
| `A12` | Mutate every semantic field and prove the ID changes; mutate each exactly listed run/attempt/completion-order/filesystem/promotion/correction-custody/LKG operational field and prove the ID does not. A source-semantic correction must change the ID. |
| `A13` | Test registry asset identity/member/path/role/media type/length/digest and manifest tampering; reject undeclared or substituted bytes without semantic byte inspection. Cover two logical paths with one digest: one physical file, exact logical-path membership digest, distinct logical/physical counts, unique digest-sorted seal entry, and deterministic `objectSealDigest`. The same claimed ID with different bytes or semantic preimage is `custody_integrity_failure`, never reuse or overwrite. |
| `A14` | Reject repeated candidate references within one outcome or run before promotion, including exact duplicates and cross-source collision claims. |
| `A15` | Fully verify a prior byte-identical sealed object and return `reused_verified` with zero candidate/object writes and unchanged candidate byte/file identities; only the deterministic durable outcome/run receipt path may write. Every incomplete verification path fails. |
| `A16` | When the candidate is the unique verified current tip, return a durable idempotent `already_current` result that references the committed promotion receipt, append no promotion generation/commit, and leave chain generation and inventory unchanged. |
| `A17` | Resume fully verified sealed candidate staging or complete promotion staging only through the exact `candidate_publication` or `promotion_publication` branch with the original durable preparation, operation intent/ownership, unchanged expected predecessor, and generation-derived time; reject missing, altered, wrong-root, wrong-tuple, wrong-kind, replayed, and stale preparations. |
| `A18` | Prove partial/unsealed material is never reusable or promotable and is eligible only for exact-request automatic recovery or receipt-owned bounded cleanup; prove sealed candidate/promotion staging has one reachable publication resume and is never cleanup-deleted; published/sealed orphans remain retained. |
| `A19` | Enumerate the exact eight request schemas, request-ID preimages, 15 receipt kinds, branch-specific durability classes, `verifyCustody` action map, nested schemas, and every success/idempotent/failure result union. Prove complete execution input is embedded, source outcomes/preparations are complete nested receipts, resume state replaces promotion state, pre-custody rejection is never written to an unsafe root, and every call that crosses its first mutation boundary returns only a durable replaying result or interruption. |
| `A20` | Verify genesis and multi-generation per-source chains, exact predecessor publication, unique tip/current derivation, source isolation, and rejection of gap/fork/duplicate/dangling/unknown/corrupt material without rollback. |
| `A21` | Cover empty chain to generation 1, generation 63 to 64, and verified current generation 64. At 64, `promotion_chain_limit` occurs before executor invocation or any mutation; generation 65 is never named. |
| `A22` | Prove no automatic GC, pruning, compaction, checkpoint substitution, renumbering, rewrite, sealed-candidate/promotion deletion, or rollback path exists and all historical bytes remain. |
| `A23` | Exercise exact `OwnedEntry` path/type/lifecycle/length/digest/volume/file/link/creator/boundary fields and the producing `mutation_interruption`; candidate and promotion cleanup ceilings; every link/reparse/alias/ownership/unknown/sealed attack; failure after each removal; exact removed/remaining inventories; and proof that unverifiable or unowned material is not traversed or deleted. |
| `A24` | Change one field at a time across `SourceCompatibility`, the run-global `CustodyProfile`, source tuples, platform/budget profiles, plans, candidates, runs, K0 validation receipts, promotions, resumes, and chains. Reject every mismatch and cross-source root/profile drift; prove no SemVer fallback, migration, reinterpretation, translation, or historical recomputation. |
| `A25` | Prove the exported set is exactly the eight names and scan for CLI/package scripts, schedulers, daemons, workers, prompts, callbacks, overrides, compare/rollback/migration/history-edit/record-edit surfaces. |
| `A26` | For every budget resource, test three separate phases: declared static pre-executor bounds, per-segment/read/allocation during-execution bounds, and actual post-output/pre-seal manifest/item/logical-asset/physical-asset/seal/staged-byte bounds. Accept each exact ceiling and reject plus one before its bounded allocation or mutation. Enforce at most 10,000 deterministic cases per file and explicit 30-second focused deadlines only where needed. |
| `A27` | Cover attempts 1 through 3 per source and 24 per run, attempt 4/25 rejection, bounded exact stage evidence, fixed retry vocabulary, durable global source-outcome/run/interruption receipts, complete candidate-count equations, process termination before and after executor-result emission, and one-source failure without cross-source mutation or relabeling. |
| `A28` | Verify the exact caller roots, root-key preimage, complete fixed layout, digest-only variable components, logical asset-path grammar, containment/case, and depth 8/9. Invoke the exact compatibility-bound shell-free Git evaluator and reject later negation, tracked path, wrong root/path/record/version/output, nonzero status, changed proof, and every state where the exact resolved custody directory is not ignored under the complete applicable Git rule set. |
| `A29` | On exactly Node `v24.14.1` `win32 x64`, Git `2.55.0.windows.2`, local NTFS, one O0 writer, and no external filesystem mutator, reproduce the platform gate and reject traversal, absolute/drive-relative managed paths, UNC/device/namespace/ADS, trailing dot/space, reserved names, case aliases, observed symlink/junction/mount/reparse/hard-link/identity aliases, and checkpoint drift. Prove the implementation makes no hostile no-follow race or power-loss claim and fails closed outside this profile. |
| `A30` | Prove reachable `open("wx")`/write/file-sync/close/reopen/reread/reverify, unique-digest asset sealing, same-volume directory publication, immutable replay, promotion staging, exact predecessor and generation time, all deterministic mutation-boundary files, bootstrap/partial/sealed/published/result-missing recovery, and process kill at every boundary without administrative override. Parent-directory sync is forbidden and power-loss durability is expressly not claimed. Test each of at most 64 promotion filesystem-operation ordinals and stop if any included claim fails. |
| `A31` | Enforce O0-to-K0-only imports, all reverse barriers, the fixed runtime/test module allowlists, and the one isolated exact Git child-process exception; reject arbitrary path/payload/module/callback and every other process or external API. Prove protected-root nonmutation, planted marker/path absence from `dist`, fixed-time build-inventory equality, and detached-worktree removal with safe junction cleanup. |
| `A32` | Validate unconditional K0/S0/O0 and required-gate existence, exact additive-only membership, K0/S0 terminal status/stage/dependency/gate locks, frozen contract hashes, review/implementation/checkpoint evidence, O0 predecessor/review/successor lineage, authorization ceiling, stage/status consistency, completion-group exclusivity, and exact four release roots. Only `approved`/`satisfied` convergence may authorize direct or transitive application/pipeline/artifact/B9/B10/publication/release dependencies; `closed` and `pending_evidence` must reject them. Cover deletion, downgrade, reopening, evidence/hash/binding removal, release-accounting invariance, and D0 absence without parsing this prose or simulating O0 runtime semantics. |

## Threat model and stop conditions

The principal threats are completeness laundering; retrying partial output into
a complete claim; semantic candidate collisions; forged K0 references; tuple
drift; duplicate plans or candidates; cross-source mutation; object rewrite;
stale-predecessor resume; promotion fork or rollback; chain exhaustion bypass;
unbounded transcripts; traversal, case, link, reparse, hard-link, ADS, device,
or identity attacks within the no-external-mutator model; rename/durability
overclaim; cleanup escape; production
import or artifact leakage; and conversion of absence or custody into semantic
change. The closed plans, recomputed witness, full semantic preimage, exact
receipts, fixed layout, component verification, append-only chain, bounded
cleanup, deterministic tests, and non-interference barriers address those
threats without claiming source or legal meaning.

A later session must stop for owner decision instead of changing this contract
if implementation requires a real source or adapter; network, DNS, browser,
provider, credential, terms acceptance, paid call, contact, private or land
data; AI; notification; publication; remote operation; dependency installation;
database, backend, service, queue, daemon, scheduler, telemetry; application,
pipeline, artifact, B9/B10, K0, S0, or release integration; D0 semantics;
dynamic loading; a broader filesystem root; a 65th generation; deletion of
sealed history; a new capability; or a weaker Windows safety/durability claim.

It must also stop if implementation requires hostile concurrent path-race
resistance, power-loss durability, parent-directory synchronization, a
no-follow/open-at primitive, or any platform outside the exact profile. Those
properties are intentionally not claimed by O0 `1.0.0`; adding one is a
successor contract and separately reviewed mechanism, not an implementation
workaround.

It must also stop if O0 would infer a Nation relationship, jurisdiction,
relevance, legal effect, rights, consent, affiliation, interest, eligibility,
impact, deletion, withdrawal, amendment, correction, supersession, urgency, or
other semantic change; if any high- or medium-severity contract defect remains;
or if exact conformance cannot be proven within the separately authorized
implementation boundary.
