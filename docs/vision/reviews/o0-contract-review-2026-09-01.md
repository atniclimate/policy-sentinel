# O0 orchestration contract candidate review

Date: 2026-09-01

Terminal disposition:
**`O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED`**.

This is an independent review record, not contract acceptance, repair,
implementation authorization, convergence authorization, or roadmap
advancement. The reviewed candidate remains byte-for-byte unchanged and is not
safe to present for owner acceptance until every material finding below is
closed by a separately authorized successor candidate and independent re-review.

## Reviewed candidate and custody result

The review began on branch `main` at
`8463df6e7e56962fd6b3ac7f0d78f44db7aa9a03`, with parent
`789ece12eb51164abfd3e11b7093644143e3c702`. The verified linear ancestry is:

```text
8463df6e7e56962fd6b3ac7f0d78f44db7aa9a03
789ece12eb51164abfd3e11b7093644143e3c702
c58625e3ebf4806952a09a61807712d31056b701
6f04b23a35a3aad7929b93702aaa3d0c31545df8
8aa6c8caac4b6fae9d5fb28bbd240fca64ebf007
```

The starting worktree and index were clean and no remote was configured. The
three O0 commits after the S0 checkpoint reconcile exactly as follows:

| Commit | Purpose | Changed paths |
| --- | --- | --- |
| `c58625e3ebf4806952a09a61807712d31056b701` | Activate generalized additive-stage governance | `ROADMAP.yaml`; `scripts/validate-roadmap.mjs`; `tests/pipeline/roadmap-validator.test.mjs` |
| `789ece12eb51164abfd3e11b7093644143e3c702` | Freeze the O0 contract candidate | `ROADMAP.yaml`; `docs/vision/o0-orchestration-contract.md` |
| `8463df6e7e56962fd6b3ac7f0d78f44db7aa9a03` | Record the O0 candidate checkpoint | `ROADMAP.yaml` |

No package manifest, lockfile, dependency, configuration, implementation,
application, pipeline implementation, source, artifact, K0, or S0 contract path
changed in that range. The candidate introduced at `789ece12` has the same Git
blob at `8463df6`.

Independent byte reconstruction produced:

- proposed version: `1.0.0`;
- UTF-8 length: 59,366 bytes;
- encoding details: no BOM, LF-only, final LF;
- SHA-256:
  `3ea10d753571f08f3e97d5c729d289c3d71e374d5fd91e68bd64c5e3c949f5d6`;
- Git blob ID: `28f127fb62b112001fbb49a7a1e57f53fe9d0d2a`;
- candidate ID:
  `o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6`.

The candidate-ID digest was independently replayed over the exact 59,448-byte
preimage:

```text
UTF-8("policy-sentinel:o0-contract-candidate:v1\n")
+ UTF-8("proposed-version:1.0.0\n")
+ UTF-8("byte-length:59366\n")
+ the exact 59,366 candidate bytes
```

The resulting SHA-256 is
`9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6`.
The 41-byte canonicalization profile and its stated digest replayed exactly. The
1,406-byte K0 compatibility manifest and digest
`65842e39c82bbaf4e0a7ff032f3a52922b5cba52c8edc959cbc913ea0dbf8e9f`
also replayed exactly. The frozen K0 and S0 contract SHA-256 values remain,
respectively,
`30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d`
and `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.

Custody lane result: **PASS**. The review verdict is not an evidence-invalid
stop; it is a substantive findings disposition.

## Independent review method

Four read-only lanes completed before this record was created:

1. Git ancestry, changed-path, byte, hash, blob, and candidate-ID custody.
2. Full normative reconstruction and contract-consistency review.
3. Roadmap, additive-stage, convergence, and release-accounting governance.
4. Adversarial implementation feasibility, crash recovery, concurrency, K0
   compatibility, and Windows filesystem proof.

Each substantive lane recorded its result before cross-lane reconciliation. The
custody lane passed. The normative, governance, and feasibility lanes each
independently returned findings. Agreement was based on reproduced evidence,
not omission. No lane edited the candidate or repaired a finding.

## Normative register and coverage

The normative lane read all 968 lines and all 59,366 bytes. It reviewed 386
prose sentence units, every fenced property list, 27 bullets, and 72 table rows.
The reconstructed register contains:

- 51 structured object/schema families with 293 named field slots;
- 8 capabilities and 13 receipt kinds;
- 11 compatibility-tuple entries and 44 digest/identity bindings;
- 4 completeness modes;
- 20 failure codes, 11 success/result codes, 4 validation/custody states, 4
  requested actions, and 5 declared object kinds;
- 34 normalized trigger-to-outcome or terminal branches;
- 13 resource ceilings and all acceptance rows `A01` through `A32`; and
- 59 individual operational field concepts excluded from candidate identity:
  7 run, 8 attempt, 17 filesystem, 11 promotion, 6 correction-custody, and 10
  LKG/projection fields.

The operative uppercase modal vocabulary contains 4 positive `MUST` clauses, 7
`MUST NOT` clauses, and 1 `MAY` clause after excluding glossary examples. The
register also covered declarative and lowercase-modal requirements. Prohibition
families were registered without summing overlapping entries: 37 responsibility
exclusions, 23 capability/override exclusions, 7 migration exclusions, 27 path
and link attack classes, 9 automatic history-mutation classes, 9 external API
classes, 30 reverse-import/integration target mentions, and 6 closed-convergence
rules.

Every normative section has at least one intended `A01`-`A32` row. Several rows
cannot be made objective without inventing semantics because of the material
gaps below; table presence is therefore not acceptance coverage.

## Material contract findings

### `O0-R01` — Capability and receipt algebra is not total

Lines 116-127 require each capability to accept one closed object and return one
receipt, while lines 150-166 declare exact payloads. Exact request shapes are
absent for `compilePlan`, `inspectObject`, `validateObject`, and
`verifyCustody`. Requested actions are not mapped to the four possible custody
or preparation receipts. The `execution_preparation` payload omits the complete
compiled source plans and run manifest needed by `executePlan`; `compilePlan` is
read-only, so the omitted input cannot be recovered from an exact durable
source. Line 121 says a promotion preparation is embedded in successful
execution, but the exact `run_result` and `source_outcome` payloads contain only
receipt IDs. `promotion_result` can encode only a committed promotion, not
`already_current` or rejection. Compilation rejection, resume failure, and
cleanup failure do not have total result variants. Line 163 also inherits
`state: "prepared"` and adds `state: "resume_prepared"` to an exact property set.

Closure requires an exact request/result matrix for all eight capabilities,
closed request schemas, exhaustive success/idempotent/failure receipt unions,
an unambiguous resume-state replacement rule, and complete execution input in
the preparation or an exact durable source.

### `O0-R02` — Multi-source run-global identity is underdetermined

Lines 143-154 use per-source compatibility tuples but one run root. Lines
251-295 give every source plan a logical clock while the compiled-run identity
and run-close event use one singular clock. Lines 646-650 derive one `rootKey`
from tuple members without requiring those members to be equal across sources.
Different source clocks or root-profile entries leave the run preimage, ticks,
root, and preparation non-reproducible.

Closure requires exact run-global fields and byte equality across every source
tuple/plan, or fully per-source clock and root semantics.

### `O0-R03` — Required nested shapes and digest targets are undefined

The contract does not freeze element schemas or comparators for
`sourcePlanDigests`, `expectedChainTips`, `verifiedChainTip`,
`expectedPredecessor`, or `ownedEntries` at lines 154-165. The event
`evidenceDigest` covers an unnamed closed stage result at lines 297-305, and
`objectSealDigest` has no exact byte preimage. Blanket sorted/unique wording at
lines 168-173 is insufficient for object-valued arrays.

Closure requires every nested property set, nullable variant, ordering key,
identity rule, and digest preimage.

### `O0-R04` — Complete-witness reconciliation is not reproducible

The `fixtureItems` preimage at lines 257-261 lacks exact member-object property
names. Lines 446-452 do not say whether detected duplicates remain in
`observedPopulationIdentities`. Lines 454-461 do not identify which identity set
`recomputedSortedIdentityDigest` covers or define the exact equations behind
the five reconciliation Booleans. A valid population may collapse some
differences, but the required `A08` mutation and rejection evidence cannot be
independently reproduced.

Closure requires exact item keys, duplicate treatment, all preimages, and every
reconciliation equation.

### `O0-R05` — Partition and candidate-count equations are incomplete

Lines 473-475 do not name the emitted member-ID property. The grammar and
cross-entry uniqueness of `logicalItemIds` are undefined. Candidate count fields
at lines 495-501 are never equated to partition lengths, the global logical-item
count, or the asset array; the count rule at lines 815-818 does not resolve
per-entry sum versus global union.

Closure requires exact property names, logical-item grammar and uniqueness, and
all count equations.

### `O0-R06` — Opaque K0 reference custody conflicts with the frozen seam

Lines 229-233 and 541-545 require K0 object kind, object ID, object digest,
reference ID, and validation-receipt ID. Lines 337-340 close `objectKind` to O0
candidate/run/promotion/receipt/staging values, which cannot represent K0 source
facts or derived assertions. The frozen K0 entrypoint exports validators but no
validation-receipt type or issuer. No `referenceId` preimage or receipt-to-byte
digest binding is defined.

Closure requires a separate exact K0-kind union, fact/assertion ID and digest
mapping, reference-ID preimage, and an exact issuer, storage, and verification
contract for a validation receipt without attributing a nonexistent receipt to
K0.

### `O0-R07` — Durable run and receipt custody is unspecified

Lines 138-140 use the conditional phrase "when durable" without classifying
receipt kinds. The fixed tree at lines 660-672 places receipts only below a run,
although custody, promotion, resume, and cleanup need not have a run key. The
candidate write protocol does not define run-manifest or receipt
staging/publication. Existing identical runs, partial run or receipt writes, and
same-run interruption/replay have no total transition.

Closure requires a durability classification and fixed path, write, seal,
replay, and crash rule for every durable object and receipt.

### `O0-R08` — Promotion and sealed-staging crash states are unreachable

The only permitted promotion path is the final generation directory at lines
660-672, but lines 741-742 require a complete directory to be prepared and then
atomically published. No temporary path, ownership receipt, or cleanup rule is
permitted. Separately, a crash after candidate seal but before object rename
leaves sealed staging that cleanup rejects at lines 776-778, receipt replay
rejects at lines 138-141, and no capability resumes.

Closure requires an exact same-volume promotion preparation layout and total
prepare/publish/crash/resume/cleanup transitions, including a recovery route for
sealed candidate staging through the closed capability surface.

### `O0-R09` — Output-dependent capacity checks contradict their timing

Lines 702-703 require all capacity checks before executor invocation. The
ceilings at lines 791-818 include manifest bytes, asset bytes, asset count, seal
bytes, and logical-item count that execution produces, while the plan binds no
exact output declarations.

Closure requires separation of statically knowable pre-invocation checks from
output checks before the allocation or mutation each check bounds, plus an
exact output-bounding interface.

### `O0-R10` — Byte-identical logical assets have no seal rule

Logical assets are unique by path at lines 547-555, physical assets are named by
byte digest at lines 674-681, and the seal contains a physical digest-sorted
array at lines 708-712. Two logical paths may have identical bytes, but the
contract neither forbids that state nor defines physical deduplication,
duplicate seal entries, or logical versus physical `assetCount`.

Closure requires either unique asset digests or exact deduplication, seal-array,
and count semantics.

### `O0-R11` — Cleanup ownership evidence cannot be represented

`cleanup_preparation.ownedEntries` has no entry schema at line 165. Lines
770-778 permit one unsealed partial file named by a failure result, but no exact
failure payload names such a file.

Closure requires exact owned-entry path/type/length/digest/identity fields and
the exact producing failure receipt.

### `O0-R12` — Promotion logical time is not derivable

Run and attempt ticks have a formula at lines 282-295, but required
`logicalCommittedAt` at lines 733-741 has no clock source or tick formula. Wall
time is forbidden, and resume/concurrent-writer behavior is undefined.

Closure requires the exact promotion clock and deterministic tick for ordinary,
concurrent, and resumed promotion.

### `O0-R13` — The Windows proof target is undefined and currently unreachable

Lines 721-728 require proof with the exact supported Node runtime and
filesystem, but neither is compatibility-bound. On the review host, Node
`v24.14.1` on `win32 x64` exposes no `O_NOFOLLOW`, `O_DIRECTORY`, or `O_SYNC`;
`node:fs` exposes no `openat` or `renameat`; and directory-handle `fsync` returned
`EPERM`. Under the allowed modules at lines 837-842, this cannot prove the
no-follow primitive or parent-directory durability required by lines 695-717.
The contract's stop rule is honest, but the successful implementation path is
not presently feasible.

Closure requires a named, compatibility-bound Windows/Node/filesystem proof
target and reproduced procedure, or a separately reviewed platform mechanism
and successor contract. Implementation may not weaken the requirement.

### `O0-R14` — The ignored-root predicate is not exact

Lines 638-640 require an active `.cache/` ignore line but do not define later
negations, nested ignore files, repository excludes, or the evaluator under the
closed runtime surface. Presence of one line does not prove the O0 subtree is
ignored.

Closure requires a deterministic repository-state predicate that proves the
exact O0 subtree is ignored.

### `O0-R15` — Protected fixture-content rejection has no deterministic oracle

Lines 557-563 require rejection of real source content, provider tokens,
personal/private/land data, and protected semantic claims, while lines 547-555
permit arbitrary `application/octet-stream` assets and the future validation
profiles are only digest-bound. Planted leakage markers prove absence from
build output, not synthetic provenance. Marker-bearing opaque bytes can still
carry prohibited content under the stated generic contract.

Closure requires a closed impossible-synthetic grammar and provenance rule for
every fixture item, logical item, and asset, or removal of opaque/unrestricted
content channels in favor of deterministic closed domains.

## Material roadmap-governance findings

### `O0-G01` — Durable additive phases can be deleted wholesale

The durable-ID checks at `scripts/validate-roadmap.mjs:483-495` and O0 checks at
lines 579-601 are conditional on the item being present. An adversarial fixture
that removed O0 from work items and additive scope and removed both O0 gates
passed with 49 items and 33 gates. Removing S0 and its additive membership also
passed. This violates durable additive accounting and the required
remove-an-existing-item negative.

Closure requires each durable additive ID and its required gates to exist and
remain in the additive group, plus whole-item/scope/gate deletion regressions.

### `O0-G02` — `pending_evidence` bypasses convergence isolation

At `scripts/validate-roadmap.mjs:603-636`, only gate state `closed` is treated as
non-converged. An adversarial fixture changed both O0 and K0/S0 convergence
gates to `pending_evidence` and added `RELEASE-PUBLISH -> O0-ORCHESTRATION`; it
passed without convergence approval. Direct and transitive rejection works
only while the gate is literally closed.

Closure requires an exact convergence-authorizing state and treatment of both
`closed` and `pending_evidence` as non-converged, with direct/transitive pending
gate negatives.

### `O0-G03` — Completed K0 and S0 are no longer terminally protected

The generalized checks at `scripts/validate-roadmap.mjs:558-576` enforce current
internal consistency but not durable terminal history. A coordinated S0 change
from `complete/completion` to `blocked/implementation_review` passed, and whole
S0 deletion passed. The prior live terminal assertions were removed from the
regression test, so this weakens K0/S0 validation and permits silent
reinterpretation of a frozen phase.

Closure requires a generalized durable-terminal invariant or exact K0/S0
terminal locks, with downgrade and deletion regressions.

## Nonmaterial and editorial findings

- The duplicate `dataBoundary` copy is redundant but equality-constrained and
  strengthens identity binding.
- `cleanup_partial` as a failure code and `partial_cleanup` as a result code may
  remain distinct once the total result mapping is defined.
- Regression negatives for `current_focus.resumable_roots` and `next_actions`
  were removed. The validator still rejected both adversarial mutations, so
  this is a test-coverage gap rather than a live bypass.
- Calling four K0 reference components "pairs" at lines 229-231 is editorially
  inaccurate; "tuple" or "record" would be clearer.
- Uppercase and lowercase modal wording is inconsistent but does not erase the
  declarative normative force.

## Coherent boundaries that remain intact

The four completeness modes, closed incomplete-mode result, no retry after an
incomplete population, and `absenceSemantics: "none"` are directionally
coherent. The candidate identity includes every required semantic binding
family and excludes the named operational families. Append-only per-source
lineage, the generation-64 ceiling, no rollback/history rewrite, and the closed
override surface are coherent at the responsibility-policy level.

O0 remains fixture-only, depends directly on K0 rather than S0, performs no D0
comparison or interpretation, and has no authorized product, source, pipeline,
artifact, B9/B10, publication, notification, or release integration. These
sound boundaries do not cure the incomplete state and evidence algebra.

## Roadmap and release reconciliation

The canonical roadmap at the reviewed checkpoint contains 50 work items, 35
gates, 14 sources, and 17 binding paths. Status counts are 26 `complete`, 0
`in_progress`, 0 `ready`, 15 `blocked`, 0 `deferred`, and 9 `not_started`.

`O0-ORCHESTRATION` appears only in
`completion_scope.local_release_candidate.additive_vision_phases`. It is
`blocked` at `contract_review`, depends directly only on `K0-LIFECYCLE`, and is
not a required release outcome. `G-O0-SYNTHETIC` is approved only through
`contract_freeze`; `G-O0-CONVERGENCE` and `G-K0-S0-CONVERGENCE` are closed.
Current focus is null. The contract candidate is
`byte_sealed_review_required`; the roadmap's prior review state remains
`not_authorized`, with no reviewed candidate, review artifact, or accepted
contract recorded because this review was not authorized to mutate the ledger.

The local release candidate remains blocked by exactly:

1. `B2-REVIEW`
2. `B4-FR-UX`
3. `B5-WA-LWS-ADAPTER`
4. `B5-WA-RULES`

Required, accepted-source, and publication completion groups are unchanged from
the S0 checkpoint. No non-additive work item has a dependency path to O0 while
the live convergence gates remain closed. O0's current state does not alter the
four live release roots, but findings `O0-G01` through `O0-G03` show that the
generalized validator does not preserve those guarantees under all allowed
adversarial ledger states.

## Adversarial cases examined

The review replayed byte and canonical preimages; semantic candidate mutation;
incomplete modes; witness duplicate/missing/unresolved cases; zero-output and
exclusion accounting; duplicate plans and candidate references; collision,
reuse, current-candidate, orphan, retry, and resume paths; every capability's
success/failure surface; generation 1, 63-to-64, and blocked generation 65;
compatibility mismatches; concurrent identical and differing promotion writers;
crashes before and after seal, rename, sync, commit, and result return; sealed
and unsealed staging recovery; path/link/reparse/hard-link/case/ADS/escape
attacks; opaque protected-content carriage; import and artifact leakage; and
closed/pending convergence plus additive deletion/downgrade mutations.

## Validation evidence

Before this record was created, read-only governance checks passed on the exact
candidate checkpoint:

- direct roadmap validator: 50 work items, 35 gates, 14 sources, 17 binding
  paths; status counts `26/0/0/15/0/9`;
- direct Node roadmap regression: 1 test passed;
- pipeline wrapper under default workers: 1 file and 1 test passed in 5.92
  seconds;
- pipeline wrapper with process-local serialized workers: 1 file and 1 test
  passed in 6.61 seconds; and
- direct seven-file pipeline suite: 105 tests passed in 5.50 seconds.

The previously documented 20-second pipeline-wrapper failures occurred only
under full-suite worker contention. Isolated, serialized, and direct runs pass
in approximately 5-7 seconds, distinguishing infrastructure contention from a
test or product failure. No deadline, assertion, configuration, or test was
weakened.

An isolated, no-remote local validation repository containing the exact
candidate plus this review record produced these additional results:

- direct `node scripts/validate-roadmap.mjs`: passed with the same counts;
- direct `node --test tests/pipeline/roadmap-validator.test.mjs`: 1 test
  passed in 3.17 seconds;
- `npm run test:unit -- tests/pipeline/pipeline.test.ts`: 1 file and 1 test
  passed in 8.78 seconds;
- `npm run validate:roadmap`: passed;
- `npm run format:check`: passed;
- `npm run lint`: passed with zero warnings;
- `npm run typecheck`: passed;
- `npm run scan:source`: passed for 330 tracked paths and 330 source files;
- the direct seven-file pipeline suite: 105 tests passed in 7.78 seconds; and
- default `npm run check`: formatting, lint, typecheck, roadmap, source scan,
  and foundation validation passed; 70 of 71 test files and 998 of 999 tests
  passed, with only the unchanged 20-second pipeline wrapper expiring under
  full-suite worker contention after 29.43 seconds.

The permitted process-local `VITEST_MAX_WORKERS=1` setting was then applied.
Serialized `npm run check` passed all 71 test files and all 999 tests in 120.60
seconds. Its build produced 3 synthetic records, exactly 575 Nations, and 8
hashed assets; artifact validation verified all 8 assets. The generated build
ID is invocation-specific and is not review evidence. Generated `dist/` output
remained only in the disposable validation copy.

## Final review conclusion

The candidate's identity and custody are valid, and its high-level boundary is
appropriately conservative. It nevertheless contains material undefined,
contradictory, unreachable, or currently unimplementable requirements. The
shared roadmap validator also admits three material governance bypasses. It is
therefore not safe to present for owner acceptance in its current exact bytes.

Exact terminal disposition:
**`O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED`**.

The smallest next action is a separately authorized, bounded contract and
governance repair session addressing only the enumerated closure criteria,
preserving this candidate and review record, producing a newly byte-sealed
candidate identity, and returning that successor for a new independent review.
This record does not authorize that repair, acceptance, implementation,
convergence, or any downstream work.
