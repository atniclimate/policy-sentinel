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

The complete O0 `1.0.0` runtime export set is exactly:

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
disabled-source, retry, or validation override; forced promotion;
accept-with-warning; semantic compare; rollback; migration; history edit;
candidate rewrite; or normalized-record editor.

Each capability accepts one recursively closed object and returns one
recursively frozen receipt. `compilePlan`, `inspectObject`, `validateObject`,
and `verifyCustody` are read-only. `executePlan` consumes an exact sealed
`execution_preparation` receipt from `compilePlan`. `promoteCandidate` consumes
an exact sealed `promotion_preparation` receipt from `verifyCustody` or the
sealed preparation embedded in a successful execution result.
`resumePromotion` consumes an exact sealed `resume_preparation` receipt from
`verifyCustody`. `abortStaging` consumes an exact sealed
`cleanup_preparation` receipt from `verifyCustody`. Each state-changing call
revalidates the preparation, root, compatibility tuple, candidate custody,
chain, and expected predecessor immediately before its first mutation and emits
one immutable result receipt.

A receipt envelope contains exactly `receiptKind`, `receiptVersion`,
`receiptId`, `compatibility`, and `payload`. `receiptVersion` is `1.0.0`.
`receiptId` is `o0:<receiptKind>:sha256:<digest>`, where the digest is SHA-256 of
the canonical object containing exactly `receiptKind`, `receiptVersion`,
`compatibility`, and `payload`. The allowed receipt kinds are
`execution_preparation`, `run_result`, `inspection_result`,
`validation_result`, `custody_verification`, `promotion_preparation`,
`promotion_result`, `resume_preparation`, `resume_result`,
`cleanup_preparation`, `cleanup_result`, `completeness_rejection`, and
`source_outcome`. A sealed receipt has a replaying ID, a closed and recursively
frozen in-memory value, and, when durable, bytes that completed the custody
write protocol below. Receipt replay, wrong-kind use, stale predecessor state,
or a changed root rejects before mutation.

For a source- or object-scoped receipt, `compatibility` is the one exact tuple
defined below. For `execution_preparation` and `run_result`, it is the closed
object containing `scope: "run"` and `sourceTuples`, a source-ID-sorted array of
objects containing exactly `sourceId` and that source's complete tuple. This is
a closed union; a single tuple cannot stand in for a run and a run tuple array
cannot stand in for one source.

Receipt payload property sets are exact:

| Receipt kind | Payload properties |
| --- | --- |
| `execution_preparation` | `runId`, `repositoryRoot`, `o0Root`, `rootKey`, `sourcePlanDigests`, `expectedChainTips`, `budgetProfile`, `state: "prepared"` |
| `run_result` | `runId`, `sourceOutcomeReceiptIds`, `candidateReferences`, `attemptCount`, `logicalRunClose`, `resultCode` |
| `source_outcome` | `runId`, `sourceId`, `sourceRevision`, `attempts`, `candidateReferences`, `promotionPreparationReceiptId`, `resultCode` |
| `completeness_rejection` | `completenessMode`, `reason`, `retryable`, `candidateId` |
| `inspection_result` | `objectKind`, `objectId`, `observedByteLength`, `observedByteDigest`, `state`, `failureCode` |
| `validation_result` | `objectKind`, `objectId`, `state`, `failureCodes` |
| `custody_verification` | `repositoryRoot`, `o0Root`, `sourceKey`, `candidateId`, `verifiedChainTip`, `requestedAction`, `state`, `failureCode` |
| `promotion_preparation` | `repositoryRoot`, `o0Root`, `sourceId`, `sourceKey`, `candidateId`, `objectSealDigest`, `generation`, `generationKey`, `expectedPredecessor`, `state: "prepared"` |
| `promotion_result` | the promotion-manifest payload frozen below |
| `resume_preparation` | the promotion-preparation properties plus `orphanPreparationReceiptId` and `state: "resume_prepared"` |
| `resume_result` | `promotionReceiptId`, `candidateId`, `generation`, `resultCode` |
| `cleanup_preparation` | `repositoryRoot`, `o0Root`, `sourceKey`, `preparationKey`, `ownedEntries`, `state: "cleanup_prepared"` |
| `cleanup_result` | `preparationKey`, `removedEntries`, `remainingEntries`, `resultCode` |

Arrays named as IDs, references, failure codes, chain tips, or entries are
sorted and unique. `attempts` is ordered by attempt ordinal and contains only
the bounded transcript fields and events defined below. Nullable values are
null, never absent. `resultCode`, `state`, `failureCode`, `requestedAction`, and
`objectKind` values are closed by the producing capability and the explicit
codes in this contract; no free-text diagnostic is durable.

## Exact compatibility and frozen K0 seam

Every durable plan, candidate, source outcome, run, promotion, resume operation,
and LKG lineage binds one exact compatibility tuple containing exactly:

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

Each entry contains exactly `id`, `version`, and `digest`; `sourceContract` also
contains `sourceId` and `sourceRevision`. The O0 contract entry is
`policy-sentinel-o0-contract`, version `1.0.0`, and the SHA-256 of the exact
separately accepted contract bytes. Until acceptance records that digest, no O0
implementation or durable O0 object is authorized.

The canonicalization entry is the profile and digest stated above. Every other
entry is supplied by a closed, fixture-only compiled registry and MUST replay
against the exact bound bytes. Equality means byte-for-byte equality of every
string and digest. SemVer ordering or compatibility is never inferred.

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

O0 imports K0 only through `src/kernel/assertions/index.ts`. Validated K0
references remain opaque pairs of object ID, object digest, object kind, and
validation-receipt ID. O0 may replay their structure and digest but MUST NOT
reinterpret their predicate, value, evidence, time, status, legal meaning,
Nation association, jurisdiction, relevance, rights, eligibility, or impact.

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
and single hyphens. These namespaces, the closed compiled registry, and the
absence of any transport capability reject real sources.

A run manifest contains one through eight source plans. Each source plan
contains exactly `compatibility`, `fixtureSemanticDigest`,
`populationScopeReference`, `logicalClock`, and `admissionState`.
`compatibility` is the source's complete exact tuple.
`populationScopeReference` contains exactly `identity`, `version`, and
`digest`, with the same grammar and preimage as the witness scope below.
`fixtureSemanticDigest` is SHA-256 of the canonical object containing exactly
the fixture-registry, fixture-executor, and source-contract tuple entries; the
complete population-scope reference; and `fixtureItems`, a member-ID-sorted
array containing each member ID, exact fixture byte length, and fixture byte
digest. O0 recomputes it from the bound bytes before admission.
`admissionState` must be `fixture_enabled`. There is no disabled-source
override. Two plans with the same `sourceId`, whether or not their revisions
differ, are duplicate source plans. `compilePlan` rejects the complete run
before executor invocation or filesystem mutation if any duplicate exists.
After uniqueness validation, source plans are sorted by `sourceId`.

`sourcePlanDigest` is SHA-256 of the canonical complete source plan. The
compiled-run identity preimage contains exactly
`runManifestVersion: "o0-run-manifest-1"`, the run-scoped compatibility object,
`logicalClock`, `budgetProfile: "o0-fixture-budget-v1"`, and the sorted complete
source plans. If its canonical digest is `R`, `runId` is
`o0:run:sha256:<R>` and `runKey` is `R`. The durable run manifest contains
exactly `runId` and that identity preimage; its ID must replay.

The fixture executor is selected only by exact ID, version, and digest from a
closed compile-time map. No path, module name, function, callback, URL, or
adapter is caller supplied. The registry, registry schema, executor, source
contract, candidate schema, validation profile, and run/promotion schema bytes
are all independently digested and tuple-bound.

`logicalClock` contains exactly `clockId`, `epoch`, and `tickUnit`. `clockId` is
`o0-logical-clock-1`; `epoch` is a valid date-time in the exact lexical form
`YYYY-MM-DDTHH:mm:ss.sssZ`; and `tickUnit` is `logical_step`. A logical-time
value contains exactly those three fields plus `tick`, an integer from 0 through
255. Wall time, monotonic process time, file times, completion order, and thread
scheduling never enter a durable semantic object. Run open is tick 0. For the
zero-based sorted source index `s`, one-based attempt ordinal `a`, and event
code `e` from 0 through 7, the event tick is
`1 + 32*s + 8*(a-1) + e`. Event codes in order are `attempt_started`,
`executor_invoked`, `executor_returned`, `witness_recomputed`,
`candidate_validated`, `candidate_sealed`, `outcome_closed`, and
`attempt_closed`. Run close is tick 255. A transcript is sorted by source ID,
attempt ordinal, then event code even when physical execution completes in a
different order.

Each `attempts` entry contains exactly `attemptOrdinal`, `events`, `resultCode`,
and `failureCode`. Each event contains exactly `eventCode`, `logicalTime`, and
`evidenceDigest`; the digest covers the closed bounded stage result and never a
raw exception or response. `failureCode` is null on success and `resultCode` is
one closed value from the vocabulary below. Event count and order are exact;
the array begins with `attempt_started`, ends with `attempt_closed`, and contains
the strictly increasing event-code subsequence for stages actually reached.
Repeated, out-of-order, omitted reached-stage, or impossible later-stage events
reject the receipt.

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
or reuse another source's material. Run and source-outcome receipts list source
outcomes by source ID and candidate references as sorted unique arrays. A
duplicate candidate reference within an outcome or across the run is a
structural rejection, not a deduplication opportunity.

The closed failure-code vocabulary is exactly `invalid_input`,
`duplicate_source_plan`, `fixture_source_disabled`, `compatibility_mismatch`,
`budget_exceeded`, `promotion_chain_limit`, `unsafe_filesystem`,
`executor_unavailable_before_population`,
`executor_interrupted_before_population`, `staging_interrupted_before_seal`,
`incomplete_population_mode`, `complete_snapshot_witness_invalid`,
`candidate_validation_failed`, `duplicate_candidate_reference`,
`custody_integrity_failure`, `stale_predecessor`, `orphan_not_resumable`,
`cleanup_not_safe`, `cleanup_partial`, and `platform_proof_unavailable`.
The closed success/result vocabulary is exactly `prepared`,
`candidate_prepared`, `reused_verified`, `already_current`, `promoted`,
`resumed`, `cleaned`, `partial_cleanup`, `rejected`, `completed`, and
`completed_with_source_failures`. Inspection/validation/custody states are
exactly `valid`, `invalid`, `verified`, and `unverified`; requested actions are
exactly `verify`, `promote`, `resume`, and `cleanup`; object kinds are exactly
`candidate`, `run`, `promotion`, `receipt`, and `staging`. A capability uses
only the subset applicable to its receipt. Durable stack traces, exception
messages, OS error text, and arbitrary strings are forbidden.

## Complete-snapshot-only admission

The recognized completeness modes are exactly `complete_snapshot`,
`partial_snapshot`, `delta`, and `unknown_completeness`. Only
`complete_snapshot` may form a candidate or reach promotion/LKG logic.
Each other mode emits a `completeness_rejection` receipt with exactly
`completenessMode`, `reason: "incomplete_population_mode"`,
`retryable: false`, and `candidateId: null`. It writes no candidate object or
promotion preparation.

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

`expectedPopulation` contains exactly `count`, `sortedIdentityDigest`,
`evidence`, and `evidenceDigest`. `count` is from 0 through 256.
`sortedIdentityDigest` is SHA-256 of the canonical sorted unique array of the
registry's exact member IDs. `evidence` contains exactly
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
`observedMemberIdentities` is sorted and contains only IDs parsed from that
payload. `observedMemberCount` equals its length; `declaredMemberCount` must
equal it. `memberIdentityDigest` is SHA-256 of the canonical identity array.

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

`observedPopulationIdentities` is the sorted concatenation of all segment
identities after duplicate detection. `observedPopulationCount` is the sum of
segment observed counts before deduplication. `uniquePopulationCount` is the
length of the unique sorted array. `duplicateCount` counts repeated observed
IDs; `missingCount` counts registry identities not observed; and
`unresolvedCount` counts observed IDs absent from the registry or not resolved
to exactly one tuple-bound fixture item.

`reconciliation` contains exactly `recomputedExpectedCount`,
`recomputedObservedCount`, `recomputedUniqueCount`,
`recomputedSortedIdentityDigest`, `recomputedPopulationScopeDigest`,
`recomputedSegmentSequenceDigest`, `recomputedTerminalEvidenceDigest`,
`countReconciled`, `identityReconciled`, `scopeReconciled`,
`segmentsReconciled`, and `terminationReconciled`. The segment-sequence digest
covers the complete ordered `segments` array. Each Boolean must be true and
must result from O0's own recomputation, not an executor assertion.

Admission requires zero duplicate, missing, and unresolved members;
`nonTruncated: true`; `nonTimedOut: true`; and `budgetsExhausted: false`.
Failure of any complete-witness field produces a non-retryable
`complete_snapshot_witness_invalid` source outcome, no candidate identity, and
no promotion preparation.

## Emission partition and absence semantics

Only after the complete witness passes may O0 validate candidate output.
`populationPartition` contains exactly `emitted`, `excluded`, and
`documentedLoss`. `emitted` is member-ID-sorted. Each entry contains exactly a
fixture member ID and a sorted unique array of `logicalItemIds`. `excluded` is
member-ID-sorted. Each entry contains exactly `memberIdentity`,
`reason: "documented_source_contract_exclusion"`,
`sourceContractRuleId`, `sourceContractRuleVersion`,
`sourceContractRuleDigest`, and `evidenceDigest`. The rule and evidence must
replay against the exact tuple-bound source contract.

Emitted and excluded member IDs are individually unique, disjoint, and their
union is exactly the witnessed expected population. `documentedLoss` is either
the closed object containing `state: "none"`, `excludedCount: 0`,
`excludedIdentityDigest`, and `exclusionDigest`, or the same four properties
with `state: "documented"` and a positive `excludedCount`. The identity digest
covers the canonical excluded member-ID array; the exclusion digest covers the
complete canonical `excluded` array. The `none` variant uses the digests of
empty canonical arrays.

Zero emitted records are valid only after the complete-population witness
passes. For a nonempty witnessed population, every nonemitted identity MUST
have one documented source-contract exclusion. No generic filter, warning,
keyword, relevance decision, or silent loss is permitted.

Candidate metadata contains exactly `candidateKind`, `semanticDataAsOf`,
`absenceSemantics`, `emittedMemberCount`, `excludedMemberCount`,
`logicalItemCount`, and `assetCount`. `candidateKind` is
`fixture_complete_snapshot`. `semanticDataAsOf` is either
`{ "state": "not_supplied" }` or
`{ "state": "declared", "logicalTime": <closed logical-clock value> }` and
must be supplied by the fixture contract, never wall time. `absenceSemantics`
is exactly `none`. Absence never establishes deletion, withdrawal, correction,
amendment, supersession, legal effect, or any other semantic change.

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

`opaqueK0References` is sorted by `referenceId`. Each entry contains exactly
`referenceId`, `objectKind`, `objectId`, `objectDigest`,
`validationReceiptId`, `k0PublicInterfaceVersion`, and
`k0PublicInterfaceDigest`. IDs and digests must resolve through the frozen K0
seam. O0 retains no copied K0 value or semantic label.

`assets` is sorted by `logicalPath`. An entry contains exactly `logicalPath`,
`role`, `mediaType`, `byteLength`, and `byteDigest`. Logical paths are unique,
relative POSIX paths of at most eight segments. A segment is 1 through 64
lowercase ASCII letters, digits, dots, underscores, or hyphens; it cannot be
`.` or `..`, begin or end with a dot or space, contain two adjacent dots, or be
a Windows device name under case folding. Roles are exactly `candidate_data`,
`candidate_index`, or `candidate_evidence`. Media types are exactly
`application/json`, `application/x-ndjson`, or `application/octet-stream`.
Byte length and SHA-256 are recomputed from the exact asset bytes.

Every logical item and asset must pass the exact tuple-bound candidate schema
and validation profile before identity or sealing. Validation is fail-closed;
unknown fields, raw response envelopes, provider tokens, contact or personal
data, private data, land data, real source content, and the protected semantic
claims outside O0's responsibility are rejected. A candidate-validation failure
is non-retryable and produces no sealed object or promotion preparation. O0
does not edit, repair, normalize, or accept-with-warning any item.

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
  byte. Any mismatch for the claimed ID is `custody_integrity_failure` and no
  fallback object is used.
- If the fully verified candidate is already the unique current chain tip,
  promotion returns `already_current` and appends no receipt.
- A fully verified sealed candidate with no promotion is an orphan. It may
  resume only with its exact sealed preparation receipt and only if the current
  verified predecessor is unchanged from that preparation.
- A partial or unsealed object is never a candidate, never reusable, and never
  promotable. It is eligible only for verified staging cleanup.
- A sealed orphan is retained. Deleting it is outside O0 `1.0.0`.

No exact duplicate is silently deduplicated at an input boundary. Reuse is a
post-seal custody result reached only after full independent verification.

## Dedicated root and fixed physical layout

The caller supplies absolute `repositoryRoot` and `o0Root` paths. The repository
root must contain an ordinary `.gitignore` whose active rules include the exact
line `.cache/`. The O0 root must resolve exactly to:

```text
<repositoryRoot>/.cache/o0/<rootKey>
```

`rootKey` is SHA-256 of the canonical object containing exactly
`rootPurpose: "o0-fixture-custody"` and the exact O0-contract,
K0-public-interface, canonicalization-profile, fixture-registry-schema,
run-manifest-schema, and promotion-manifest-schema tuple entries. It is recorded
in the run preparation.
Each supplied absolute path is at most 512 UTF-8 bytes, uses one ordinary drive-
absolute Windows form, has no extended-device or UNC prefix, and has no empty,
dot, dot-dot, ADS, reserved-device, trailing-dot, or trailing-space component.
The repository root, `.cache`, `o0`, and root-key directory must already exist
as ordinary, non-reparse directories before planning. O0 never creates or
selects a broader root. The root is dedicated to that exact root profile; every
source-specific tuple remains independently bound by its object. The root is
not `dist`, `.git`, the repository root, or an ancestor of any of them.

The only top-level children and layouts are:

```text
staging/<sourceKey>/<preparationKey>/candidate-manifest
staging/<sourceKey>/<preparationKey>/assets/<assetDigest>
staging/<sourceKey>/<preparationKey>/seal
objects/sha256/<candidateDigest>/candidate-manifest
objects/sha256/<candidateDigest>/assets/<assetDigest>
objects/sha256/<candidateDigest>/seal
runs/<runKey>/run-manifest
runs/<runKey>/receipts/<receiptDigest>
promotions/<sourceKey>/<generationKey>/commit
```

Fixed names appear exactly as shown. Every variable physical component is a
bare lowercase SHA-256 digest. `sourceKey` is the SHA-256 of the canonical
object containing only `sourceId`; it is stable across source revisions.
Candidate, preparation, run, and receipt keys are the digest portion of their
respective IDs. `generationKey` is SHA-256 of the canonical object containing
exactly `sourceKey` and the one-based `generation`. Logical asset paths remain
only in the candidate manifest; physical asset names are their byte digests. No
managed relative path exceeds eight components.

All inputs are resolved against the already verified root. Component-by-
component `lstat` and realpath checks must prove exact containment and exact
case before every read or mutation. Managed relative input rejects absolute,
rooted, drive-qualified, drive-relative, UNC, device, namespace, ADS/colon,
slash/backslash-mixed, empty, `.`, `..`, percent-encoded, NUL, control-character,
trailing-dot, trailing-space, and case-alias forms. The absolute caller-supplied
Windows root may have its one expected drive prefix; no managed relative input
may have one.

Every component and target rejects symbolic links, junctions, mount points,
reparse points, hard links or link count other than one, alternate data streams,
file-identity aliasing, case-fold collisions, and Windows reserved device names.
Reads use a no-follow primitive, retain the opened handle, compare handle
identity to the verified component, enforce the byte limit while reading, and
reverify identity after reading. Directory enumeration is bounded and rejects
unknown names rather than ignoring them.

## Candidate custody and filesystem durability

All capacity, compatibility, path, root, chain, and preparation checks occur
before executor invocation or filesystem mutation. A write is no-clobber and
same-volume. For each file O0 must create a new staging file, write all bytes,
sync the file, close it, reopen without following, reread it within the byte
budget, recompute length and digest, compare handle identity, close it, and sync
the containing directory before treating the file as prepared. Assets precede
the manifest. The seal is written last. It contains exactly
`sealVersion: "o0-candidate-object-seal-1"`, `candidateId`,
`candidateManifestByteLength`, `candidateManifestByteDigest`, and `assets`,
where `assets` is the physical asset-digest-sorted array of exact byte lengths
and digests. The seal does not include or digest itself.

An immutable candidate is published only after the complete staging subtree
passes another component walk and byte replay. Publication uses a no-clobber,
same-volume atomic rename to its content-addressed object directory, followed
by parent-directory synchronization and a complete reopen/reread/reverify.
Promotion cannot reference staging; it references only an immutable verified
object.

Atomic visibility and power-loss durability are different claims. Atomic
rename alone proves only visibility. A later Windows implementation MUST prove,
with the exact supported Node runtime and filesystem, that its file and parent-
directory sync sequence provides the frozen durability claim. If Node or the
filesystem cannot prove no-follow behavior, same-volume identity, no-clobber
publication, parent durability, reparse rejection, or post-crash recovery, the
implementation stops for owner review; it may not weaken this contract or
rename atomicity as durability.

## Per-source promotion and chain ceiling

Promotion is per `sourceKey` and append-only. The envelope binds the complete
compatibility tuple. Its `promotion_result` payload contains exactly
`promotionManifestVersion: "o0-promotion-manifest-1"`, `sourceId`, `sourceKey`,
`candidateId`, `generation`, `predecessor`, `preparationReceiptId`,
`objectSealDigest`, `logicalCommittedAt`, and `commitState: "committed"`.
`predecessor` is null only for generation 1; otherwise it contains exactly
`promotionReceiptId`, `candidateId`, and `generation` for the prior receipt.
`logicalCommittedAt` is a closed logical-time value. The envelope's non-self-
referential `receiptId` is the promotion ID. The complete canonical envelope is
stored as the fixed `commit` file in a prepared `generationKey` directory.
No-clobber same-volume publication of that complete directory is the commit.
Two writers naming the same generation necessarily target the same slot; only
one publication can succeed. The loser reopens and verifies the published slot,
then returns `already_current` only for the same fully verified candidate or a
stale-predecessor failure for a different candidate. It never creates a fork.

A verified chain begins at one generation 1 receipt, increments by exactly one,
has exact predecessor IDs and candidates, contains no gap, fork, duplicate,
dangling receipt, unknown file, or invalid candidate, and has exactly one tip.
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

Automatic cleanup is limited to a preparation-receipt-owned subtree at
`staging/<sourceKey>/<preparationKey>`. It may contain only the fixed names
above, at most 64 asset files, and at most 70 total ordinary entries. Every
entry must be within the exact subtree, named as expected, single-link,
non-reparse, non-aliased, and either listed with its verified digest in the
preparation receipt or be the one verified unsealed partial file named by the
failure result. A seal, content-addressed object, run receipt, promotion receipt,
unknown file, link, mount, reparse point, or ownership mismatch makes the
subtree ineligible.

`abortStaging` first performs a bounded component walk without recursion across
unverified entries. Only after the complete walk proves the exact ordinary
subtree does it unlink listed files, then empty fixed directories, bottom-up,
without following. It emits a cleanup result naming every removed identity.
Any verification or deletion failure leaves all not-yet-removed material
untouched and reports the partial cleanup exactly; it never switches to generic
recursive removal. Cleanup cannot touch another source, another preparation,
or any sealed candidate or promotion.

## Frozen resource and adversarial-evidence budgets

The budget profile is exactly `o0-fixture-budget-v1`, with inclusive ceilings:

| Resource | Ceiling |
| --- | ---: |
| Sources per run | 8 |
| Attempts per source | 3 |
| Attempts per run | 24 |
| Fixture items per source | 256 |
| Candidate assets per source | 64 |
| Logical candidate items per source | 512 |
| Fixture input bytes per source | 8,388,608 (8 MiB) |
| Staged candidate bytes per source | 16,777,216 (16 MiB) |
| Canonical bytes per manifest or receipt | 1,048,576 (1 MiB) |
| Managed relative path depth | 8 |
| Verified promotion-chain length | 64 |
| Injectable promotion filesystem operations | 64 |
| Deterministic cases per test file | 10,000 |
| Focused test deadline where explicitly needed | 30 seconds |

Each count and byte total is checked before allocation, executor invocation, or
the mutation it bounds. Exactly-at-limit cases are valid; limit-plus-one cases
reject. Fixture-input bytes are the sum of the exact tuple-bound registry entry,
source-contract fixture data, executor fixture data, payload, selector-token,
and continuation-token bytes available to one source plan, with identical bound
bytes counted once even if a permitted retry rereads them. Staged-candidate
bytes are the candidate-manifest, asset, and seal bytes in that source's staging
subtree. Logical item count is the sum of the unique `logicalItemIds` in emitted
partition entries. Path depth counts root-relative components. A transcript
stores bounded codes, IDs, counts, and digests, never an unbounded raw response
or stack corpus.

A later implementation's post-verification promotion publication protocol may
contain at most 64 injectable filesystem operations. The count begins after the
read-only candidate and chain verification and ends after publication, parent
sync, reopen, and final verification. Each invoked `open`, `write`, `sync`,
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
`node:path`. Test-only modules may additionally use `node:assert/strict`,
`node:os`, and `node:test`. No child process, network, HTTP, DNS, browser,
database, timer, worker, or dynamic-module API is allowed.

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

While `G-O0-CONVERGENCE` is closed:

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
| `A02` | Compile one through eight exact fixture source plans; bind every registry/executor/contract/schema/profile/K0 component; reject a disabled or dynamically supplied executor; reject same-source duplicate plans before executor invocation or mutation. |
| `A03` | Accept representative one-segment, multi-segment, and zero-population `complete_snapshot` witnesses only after recomputing every scope, boundary, expected, selector, payload, member, continuation, terminal, count, identity, and reconciliation digest/value. |
| `A04` | For `partial_snapshot`, emit the exact closed non-retryable completeness receipt with null candidate ID and prove no candidate or promotion preparation exists. |
| `A05` | Apply the identical closed behavior to `delta`. |
| `A06` | Apply the identical closed behavior to `unknown_completeness`. |
| `A07` | Once any incomplete mode or population member is emitted, prove the source transaction performs no later retry into `complete_snapshot`; prove only the three before-population/before-seal retry codes are retryable. |
| `A08` | Mutate, one field at a time, witness version/mode/revision/fixture digest/scope/boundary/expected count and evidence/ordinal/selector/payload/count/identity/continuation/terminal/reconciliation/duplicate/missing/unresolved/truncation/timeout/budget fields; every mutation fails closed with no candidate ID. |
| `A09` | Cover empty population, fully emitted population, valid documented exclusions, zero emission after a nonempty complete witness, missing exclusion, overlap, duplicate, extra/unresolved member, rule/evidence mismatch, documented-loss replay, and exact `absenceSemantics: "none"`. |
| `A10` | Replay arbitrary physical source/attempt completion orders and the three fixed retry codes; canonical run/source receipts, logical ticks, candidate IDs, and unaffected source outcomes remain identical and source-isolated. |
| `A11` | Golden-test every field of the complete semantic identity preimage and exact runtime candidate-ID formula, including all compatibility entries, witness, boundary, partition/loss, opaque K0 references, metadata, and sorted asset descriptors. |
| `A12` | Mutate every semantic field and prove the ID changes; mutate each exactly listed run/attempt/completion-order/filesystem/promotion/correction-custody/LKG operational field and prove the ID does not. A source-semantic correction must change the ID. |
| `A13` | Test asset path/role/media type/length/digest and manifest tampering. The same claimed ID with different bytes or semantic preimage is `custody_integrity_failure`, never reuse or overwrite. |
| `A14` | Reject repeated candidate references within one outcome or run before promotion, including exact duplicates and cross-source collision claims. |
| `A15` | Fully verify a prior byte-identical sealed object and return `reused_verified` with zero writes and unchanged byte/file identities; every incomplete verification path fails. |
| `A16` | When the candidate is the unique verified current tip, return `already_current`, append no promotion, and leave generation and inventory unchanged. |
| `A17` | Resume a fully verified sealed orphan only with its exact sealed preparation and unchanged expected predecessor; reject missing, altered, wrong-root, wrong-tuple, replayed, and stale-predecessor preparations. |
| `A18` | Prove partial/unsealed orphans are never reusable or promotable and are only eligible for the exact verified staging-cleanup path; sealed orphans remain retained. |
| `A19` | Enumerate the eight exports and preparation/result kinds. Every state-changing export rejects unsealed, tampered, wrong-kind, stale, or cross-root evidence before mutation and emits a replaying immutable result. |
| `A20` | Verify genesis and multi-generation per-source chains, exact predecessor publication, unique tip/current derivation, source isolation, and rejection of gap/fork/duplicate/dangling/unknown/corrupt material without rollback. |
| `A21` | Cover empty chain to generation 1, generation 63 to 64, and verified current generation 64. At 64, `promotion_chain_limit` occurs before executor invocation or any mutation; generation 65 is never named. |
| `A22` | Prove no automatic GC, pruning, compaction, checkpoint substitution, renumbering, rewrite, sealed-candidate/promotion deletion, or rollback path exists and all historical bytes remain. |
| `A23` | Exercise receipt-owned ordinary single-link staging cleanup, every link/reparse/alias/ownership/unknown/sealed attack, the 70-entry ceiling, failure-after-each-unlink behavior, and proof that unverifiable material is not traversed or deleted. |
| `A24` | Change one field at a time across the complete exact compatibility tuple on plans, candidates, runs, promotions, resumes, and chains. Reject every mismatch; prove no SemVer fallback, migration, reinterpretation, translation, or historical recomputation. |
| `A25` | Prove the exported set is exactly the eight names and scan for CLI/package scripts, schedulers, daemons, workers, prompts, callbacks, overrides, compare/rollback/migration/history-edit/record-edit surfaces. |
| `A26` | For every `o0-fixture-budget-v1` resource, accept the exact ceiling and reject ceiling plus one before the bounded operation. Enforce at most 10,000 deterministic cases per file and explicit 30-second focused deadlines only where needed; reject random evidence as acceptance. |
| `A27` | Cover attempts 1 through 3 per source and 24 per run, attempt 4/25 rejection, bounded transcript bytes, fixed retry vocabulary, immutable source-outcome/run receipts, and one-source failure without cross-source mutation or relabeling. |
| `A28` | Verify the exact caller root, `.cache/` ignore rule, four top-level areas, fixed layout, digest-only variable physical names, logical asset-path grammar, containment, case identity, and depth 8/depth 9 boundary. |
| `A29` | On supported Windows filesystems, reject traversal, absolute/drive-relative managed paths, UNC/device/namespace/ADS inputs, trailing dot/space, reserved names, case aliases, symlinks, junctions, mount/reparse points, hard links, file-identity aliases, and no-follow races. |
| `A30` | Prove no-clobber write/sync/close/reopen/reread/reverify/seal, same-volume publication, immutable post-publication replay, exact predecessor commit, distinct atomic-visibility and power-loss claims, and failure at each of at most 64 fixed filesystem-operation ordinals. Stop if the platform cannot prove a frozen claim. |
| `A31` | Enforce O0-to-K0-only imports, all reverse barriers, fixed runtime/test Node-module allowlists, protected-root nonmutation, planted marker and path absence from `dist`, fixed-time build-inventory equality, and detached-worktree removal with safe junction cleanup. |
| `A32` | Validate the exact additive stages, authorization ceiling, stage/status consistency, completion-group exclusivity, required convergence metadata, closed-gate direct/transitive dependency rejection, O0 additive-only membership, exact four release roots, release-accounting invariance for blocked/ready/in-progress/review-blocked/implementation-blocked/complete O0 states, additive-removal rejection, and D0 absence. The roadmap validator must not parse this prose or simulate O0 runtime semantics. |

## Threat model and stop conditions

The principal threats are completeness laundering; retrying partial output into
a complete claim; semantic candidate collisions; forged K0 references; tuple
drift; duplicate plans or candidates; cross-source mutation; object rewrite;
stale-predecessor resume; promotion fork or rollback; chain exhaustion bypass;
unbounded transcripts; traversal, case, link, reparse, hard-link, ADS, device,
or no-follow attacks; rename/durability overclaim; cleanup escape; production
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

It must also stop if O0 would infer a Nation relationship, jurisdiction,
relevance, legal effect, rights, consent, affiliation, interest, eligibility,
impact, deletion, withdrawal, amendment, correction, supersession, urgency, or
other semantic change; if any high- or medium-severity contract defect remains;
or if exact conformance cannot be proven within the separately authorized
implementation boundary.
