# S0 implementation audit

Date: 2026-09-01

Contract: `docs/vision/s0-spatial-contract.md` version `1.0.0`, 41,506 bytes,
SHA-256
`ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.

Scope: the three experimental schemas; every file under
`src/experimental/spatial`, `fixtures/experimental/spatial`, and
`tests/experimental/spatial`; the additive S0 blocks in
`scripts/validate-foundation.mjs`; the Phase 1 traceability/removal design; and
the S0-only roadmap evidence. Review was local and synthetic only. It used no
network, browser, provider, remote, dependency mutation, real spatial data, or
product integration.

## Disposition

PASS for cooperative and final adversarial implementation review. No high- or
medium-severity finding remains. The exact removal proof and final validation
sequence were intentionally not claimed by the reviewers and remained for the
coordinator after this disposition.

The final Sol Ultra auditor read the complete frozen contract, reconstructed
review findings S0-R01 through S0-R19, K0 public assertion seam, all current S0
implementation and evidence files, and the authorized working-tree boundary.
Its first pass found no high finding and six medium findings. The same auditor
then re-read every repair and independently closed all six.

## Cooperative findings and repairs

Earlier bounded reviews found and closed these implementation or evidence
issues:

1. Observation fact-shape checks initially enforced K0 semantics before the
   geometry and observation digest stages. Shallow Stage 1 inspection and
   combined corruptions now prove the frozen order.
2. Relation validation initially constructed or validated later semantic
   results before their predecessors. Stages 6, 7a through 7d, and 8 are now
   separate and have combined-failure regressions.
3. Shared-time tests omitted a preserved open end and reversed reference
   evidence; relation custody omitted missing, extra, and third-observation
   six-pair attacks. All are explicit, and normalized bounds now expose a
   recursively immutable type without mutable casts.
4. Jurisdiction evidence initially compared cross-fact retrieval times before
   statement digest and evidence-ID replay. Exact statement replay now wins,
   with a combined forged-digest, forged-ID, mismatched-time regression.
5. Test-only TypeScript inference and one existing runtime/declaration mismatch
   were contained inside their tests. No production declaration or K0/product
   file changed.

No cooperative high or medium finding remains.

## Final adversarial findings and closure

### 1. Relation Stage 1 constants and lexical namespaces

Initial severity: medium. Nested K0 derived-assertion constants and shared-time
references had only generic text checks before later replay.

Closure: `relation.ts` now enforces only the complete Stage 1 closed shape,
exact constants, assertion namespace, K0 fact-ID grammar, and lowercase digest
grammar. `temporal.ts` applies the public K0 fact-reference lexical validator to
each shared-time reference. Resolution, shared-time replay, ordered relation
identity, six-pair alignment, topology, assertion identity, and result replay
remain in Stages 6 through 8. Combined attacks prove the Stage 1 error wins.

### 2. Full schema/runtime parity

Initial severity: medium. The original parity suite sampled primitives and used
Ajv-only full-object mutations.

Closure: the deterministic catalog now invokes each full runtime validator
against real constructor outputs and exact relation observation context. It
contains 388 schema-invalid mutations across 17 keyword families, 37 explicit
closed structural roots, and 67 required union/matrix/attack branch tags. Seven
schema-valid semantic or replay corruptions are separately required to fail
runtime. Catalog preflight validates every entry's domain, family, tags,
constructor, and mutator. No schema/runtime mismatch was found.

### 3. Observation custody and malformed-input evidence

Initial severity: medium. Several exact fact/provenance attacks, unsupported or
multiple temporal evidence, geometry/digest asymmetry, and named GeoJSON attacks
were not explicit runtime regressions.

Closure: one bounded 20-case table covers predicate, value, path, identity,
retrieval, adapter, content digest, fact ID/digest, cross-fact provenance,
temporal evidence, both presence asymmetries, future contract version, Polygon,
FeatureCollection, and `properties` attacks. K0-valid mutations are rebuilt so
the tests reach exact S0 custody rather than failing only on stale K0 digests.

### 4. Accessible multi-row ordering and uncertainty text

Initial severity: medium. Projection and DOM tests used only one row, and two
observation uncertainty reasons lacked exact cell evidence.

Closure: reversed caller arrays now produce two relation rows and two
jurisdiction rows whose complete cell arrays, stable IDs, subject/object order,
native row headers, scopes, and `td` sequences are asserted in both the pure
view and test-only Preact DOM. All four observation uncertainty reasons and all
required time forms have exact text assertions.

### 5. Direct experimental-schema imports

Initial severity: medium. The reverse-import scanner recognized S0 source paths
but not direct imports of the three experimental schema JSON files.

Closure: the scanner names exactly those three schema paths and permits them
only from the canonical `scripts/validate-foundation.mjs` registration. It
rejects production static, type, export, dynamic, require, HTML, configuration,
query, fragment, normalized-spelling, lookalike-validator, and S0-source attacks.
AST inventory proves the sole current consumer has exactly the three intended
literal registrations.

### 6. Shared dependency junction cleanup

Initial severity: medium. The pre-implementation removal design did not
explicitly require unlinking the disposable worktree's shared dependency
junction before removing the worktree.

Closure: the design now freezes and verifies the main root, dependency target,
proof root, junction path, reparse type, and exact target. Cleanup must occur
outside the proof worktree, reverify the junction, unlink only that junction
nonrecursively, verify link absence and survival of the shared target, and only
then ask Git to remove the verified worktree. Generic recursive cleanup is
forbidden while the junction exists. Any drift or unlink anomaly stops cleanup.

## Repaired targeted evidence

The coordinator's serialized repair reruns passed:

- schema/runtime parity: 1 file, 10 tests;
- observation custody: 1 file, 62 tests;
- temporal: 1 file, 7 tests;
- relation custody: 1 file, 20 tests;
- evidence view: 1 file, 8 tests;
- accessibility: 1 file, 4 tests;
- import boundary: 1 file, 9 tests; and
- TypeScript typecheck.

One parity harness run first exposed two catalog-construction bugs, and its
first repaired run then exceeded only Vitest's default five-second deadline at
6.214 seconds. The field-shift bugs were corrected, catalog metadata gained
preflight checks, and the bounded catalog received a 30-second test deadline.
The independent rerun passed in 5.74 seconds of test time. These were test
harness failures; no schema/runtime mismatch surfaced.

## Boundary reconciliation

The closing auditor found zero unauthorized changed paths. The contract, K0,
PolicyRecord 1.4, current record and artifact schemas, package manifests,
application, pipeline, adapters, source and Nation configuration, artifact
construction, and release scope remained unchanged. No S0 production barrel,
route, browser graph, pipeline, artifact, source registry, Nation module, or K0
lifecycle import was introduced.

The review disposition does not authorize or imply convergence, real spatial
data, GIS infrastructure, product integration, publication, external access,
or another program phase. `G-K0-S0-CONVERGENCE` remains closed.
