# S0 synthetic spatial-observation implementation report

Disposition: `STOPPED_S0_BOUNDARY_REQUIRED`.

The frozen S0 `1.0.0` implementation, its cooperative and adversarial review,
the deterministic bounded tests, the isolated removal proof, and the final
implementation-state full check all pass. The stop occurs only at the required
terminal roadmap transition: the existing pipeline roadmap regression test
hard-codes S0's temporary activation state, but that test is outside the
owner-authorized S0 file boundary. S0 therefore remains `in_progress` in the
ledger rather than being falsely marked complete or paired with a known failing
repository test.

## Authority and verified starting state

The implementation session began at repository root `I:\policy-sentinel` on
branch `main`, clean HEAD
`383cc13a7e8e30db031f590a1c2d128a35a81b27`, with no configured remote. The
frozen contract was exactly 41,506 bytes and had SHA-256
`ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.
Its Git blob remained `52ecbd7895748d02e757a1fb6f91e6764ac8c6ff` from the
starting checkpoint through the implementation checkpoint.

The ledger had S0 as its sole `in_progress` work item, K0 complete and
immutable, `G-S0-SYNTHETIC` approved, and `G-K0-S0-CONVERGENCE` closed. The
session used only installed local executables and committed package scripts.
It performed no network, DNS, fetch, browser, remote, provider, credential,
terms, paid, contact, publication, notification, AI, or real-data operation.
The `policy-sentinel.invalid` URL was handled only as a lexical sentinel.

## Implemented boundary

Focused implementation commit
`a7e4c142975304b45c87848c9dc07e991b5fd078` has the exact starting checkpoint
as its parent. It changes 41 authorized paths, with 18,845 insertions and 6
deletions:

- three recursively closed experimental schemas for `SpatialObservation`,
  `SpatialRelation`, and separately evidenced `JurisdictionEvidence`;
- nine modules under `src/experimental/spatial/` for constants, closed types,
  structural validation, observation custody, temporal derivation, topology,
  relation derivation, jurisdiction evidence, and the evidence view model;
- 12 deliberately impossible synthetic fixtures, including representative,
  missing, uncertain, malformed, relation, jurisdiction, topology, and exact
  presentation cases;
- 12 Vitest files plus one test-only Preact renderer under
  `tests/experimental/spatial/`;
- only the additive three-schema compile and fixture registrations in
  `scripts/validate-foundation.mjs`;
- the Phase 1 traceability report, final implementation audit, and S0-only
  roadmap evidence.

There is no production barrel. No application entry, route, product module,
artifact builder, pipeline, source registry, adapter, Nation module, K0
lifecycle module, current schema, package manifest, or lockfile imports or
exports S0.

## Contract and traceability coverage

`docs/vision/reports/s0-phase-1-traceability-2026-09-01.md` maps normative
clauses `S0-C01` through `S0-C48` and review findings `S0-R01` through
`S0-R19` to schema enforcement, runtime validation, construction or derivation,
fixtures, positive tests, and negative or adversarial tests. It separately
identifies schema-expressible structure and runtime-only semantics, replay,
prototype, integrity, non-interference, and removal invariants.

The final parity catalog submits 388 full-object schema-invalid mutations
across 17 schema keyword families, 37 closed-object roots, and 67 required
branch tags to both Ajv and the structural runtime validators. Seven
schema-valid semantic-only mutations are separately rejected by the full
runtime validators. Observation custody has 20 named tamper families in
addition to the complete matrix, digest, identity, temporal, K0 fact, cloning,
and freezing tests.

The implementation provides literal replay for geometry, observation,
relation assertion, relation result, jurisdiction statement, and stable-ID
digests. It uses the frozen K0 public assertion seam only. Validation remains
fail-closed and ordered; malformed data is never converted to `unknown`.
Subject and object order remains semantic, with symmetry limited to the
contract's declared relations and unknown reasons.

## Review findings and repairs

The Phase 1 schema/runtime, observation/K0-custody, and temporal/topology
reviewers found no contract defect. Later cooperative reviews found narrow
test-evidence and validation-order gaps; each was repaired within the
authorized S0 paths and rerun in isolation.

The final independent adversarial auditor found zero high-severity defects and
six medium implementation/evidence gaps:

1. nested assertion constants and reference grammar were enforced too late;
2. full-object schema/runtime parity evidence was incomplete;
3. observation custody lacked named attack cases;
4. accessibility evidence covered only a single row and not every uncertainty
   rendering;
5. the reverse-import scanner missed direct schema JSON imports; and
6. the removal design did not make shared-junction cleanup sufficiently
   fail-closed.

All six were repaired. The same auditor re-read the resulting implementation
and tests and reported zero residual high- or medium-severity findings in
`docs/vision/reviews/s0-implementation-audit-2026-09-01.md`.

Two further independent read-only terminal-state audits found no S0 contract or
implementation defect. Both identified the same out-of-bound roadmap-test
coupling described below.

## Deterministic bounded property evidence

The heavy topology/tolerance suite ran alone with one worker and recorded:

- exactly 40,000 tolerance-zero classifications;
- 10,000 cached reversal, duality, and exclusivity assertions;
- 36 bounded valid transforms;
- 32 fixed named positive-tolerance cases;
- 3,531,403 streamed oracle candidate-pair classifications;
- a 4,383,720 implementation-pair ceiling;
- 7,915,123 combined bounded candidate-pair work; and
- a maximum of 390,625 candidates in any one case.

No random generator, unrecorded seed, full-domain Cartesian product, buffered
candidate corpus, new dependency, or ceiling increase was used. Positive
tolerance streaming stopped only after the contract permitted a second
distinct class to establish ambiguity.

## Accessibility evidence

The pure view model and test-only Preact renderer reproduce the frozen document
order and exact text fixture. The visible heading and spatial table caption are
`Impossible synthetic spatial evidence`. The explanation is associated through
`aria-describedby` and expressly states that the geometry does not establish
jurisdiction, Nation association, policy relevance, legal applicability,
rights, consent, affiliation, interest, eligibility, or impact.

The spatial table uses the exact 12-column order. The separate administrative
section uses the exact heading and caption `Separate administrative/source
evidence - not derived from geometry` and its exact seven-column order. Native
`table`, `caption`, `thead`, `tbody`, `th scope="col"`, and
`th scope="row"` semantics are asserted. Multi-row source order, every
relation, every unknown-reason label, all supported time/coverage/uncertainty
renderings, and empty-jurisdiction omission are tested. Axe passes. Negative
tests prove there is no map, canvas, color scale, control, interaction, source
link, browser state, automatic refresh, route, or telemetry.

## Non-interference and removal proof

The protected-data suite pins the ordered 21-key prohibition and rejects 252
schema/runtime mutations across the three S0 objects and four recursive
locations. It preserves complete Nation and `PolicyRecord 1.4` roots and every
required diagnostic pointer through a full S0 workflow. The unchanged record
schema still rejects the three proposed spatial root properties.

The import suite parses all nine S0 modules and the reverse production, script,
executable-config, JSON-config, and HTML graphs. It allows only local S0 imports,
the frozen public K0 assertion seam, the three exact foundation schema imports,
and Preact in the test renderer. Planted static, type-only, re-export, dynamic,
CommonJS, nonliteral, lifecycle, product, and schema-import violations fail.

The artifact suite rejects both exact injected S0 paths and scans every output
path and byte, manifest entry, raw hash, route, source map, dynamic import, and
Rollup module. The final 12-file implementation-state `dist/` inventory had
digest `eb04c9f5874a75f0d0ed787610f4a64570ca978f41374d6e433325cb3ac5bff0`,
zero forbidden path segments, zero S0 build markers, zero source maps, and 8
manifest assets. The observed build ID was
`synthetic-9e7d37e6daaee3fe4213`; invocation-specific build IDs are not treated as
durable product facts.

The final isolated removal proof used an LF-preserving detached worktree at the
implementation commit and only the already-installed dependency tree. Its
baseline `npm run check` passed 71 files and 999 tests. It removed exactly 37
tracked S0 schema/source/fixture/test files and restored only
`scripts/validate-foundation.mjs` to the parent blob. Its reduced
`npm run check` passed 59 files and 843 tests. Both fixed-time complete `dist/`
inventories had 12 files and identical sorted path/SHA-256 digest
`67e44fa9254fc62ffdb3fabc0ef206afe175cbfa129ab59768bef6baf6804845`.
The dependency junction was verified, unlinked nonrecursively, and shown not to
affect its target before Git removed the disposable worktree. Main remained
clean and unchanged.

Removal-proof harness history is retained rather than hidden. The first
disposable checkout inherited global CRLF conversion and stopped on formatting
before S0 removal; cleanup was safe. An earlier long orchestration continued
after its output was truncated, so a concurrent diagnostic test saw 11 S0
modules disappear during the intended disposable removal; the serialized
proofs passed and main was never involved. Two later harness assertions stopped
safely on PowerShell junction-target and empty-comparison handling before the
final passing proof. None was a product or contract failure.

## Validation commands and outcomes

The controlled targeted sequence passed:

- schema/runtime suites: 2 files, 18 tests;
- observation custody: 1 file, 62 tests;
- temporal: 1 file, 7 tests;
- isolated topology/tolerance: 1 file, 12 tests;
- relation custody: 1 file, 20 tests;
- jurisdiction evidence: 1 file, 6 tests;
- evidence view: 1 file, 8 tests;
- accessibility: 1 file, 4 tests;
- protected-data non-interference: 1 file, 6 tests;
- import non-interference: 1 file, 9 tests; and
- artifact/build non-interference: 1 file, 4 tests.

After the passing removal proof, the ordered final sequence produced:

- `npm run validate:foundation`: pass; 8 schemas, 10 categories, 33
  subcategories, 3 current record fixtures, 5 negative policy checks, 7 valid
  S0 fixtures, and 3 invalid S0 fixtures;
- `npm run validate:roadmap`: pass; 49 work items, 33 gates, 14 sources, 17
  binding paths, with S0 still the sole `in_progress` item;
- the first `npm run format:check`: stopped only on the newly appended
  `ROADMAP.yaml` evidence; `npm run format` changed only that authorized file,
  and the repeated format check passed;
- `npm run lint`: pass with zero warnings;
- `npm run typecheck`: pass;
- `npm run scan:source`: pass across 327 tracked paths and 327 source files;
- `npm test` with process-local `VITEST_MAX_WORKERS=1`: pass, 71 files and 999
  tests in 110.28 seconds; and
- isolated `npm run check` with the same process-local worker control: pass for
  formatting, lint, typecheck, roadmap, source scan, foundation, all 71 files
  and 999 tests in 96.59 seconds, Vite build, 3 synthetic records, exactly 575
  Nations, 8 hashed assets, and artifact validation.

Earlier timeout and invocation evidence is also retained. A schema review
exceeded only a 30-second reporting yield; isolated suites passed. One
unsupported `--minWorkers` command exited before collection and was replaced by
the supported installed Vitest invocation. Bounded relation and evidence-view
tests exceeded the default five-second deadline under contention and passed
alone with explicit 30-second test deadlines. The repaired parity catalog took
6.214 seconds against the default deadline and then passed in 5.74 seconds with
its explicit bounded deadline. Two default-worker full checks passed 998 of 999
tests but the unchanged pipeline wrapper exceeded its 20-second deadline at
21.203 and 22.706 seconds; the exact test passed alone in 4.98 seconds, and the
single-worker full checks above passed. No timeout was reported as a product
failure or used to weaken a test.

## Dependency, data, and Git review

`package.json` remains 1,962 bytes with SHA-256
`7577da7dc20755fb82a805acb12ea9f7c7b8d0289fcc56544e74631faf5635d2`.
`package-lock.json` remains 185,611 bytes with SHA-256
`88bccd37edaec8e7b29e11d2a264e04f210968e5641bf2907e0aeaf24bef5c4c`.
No dependency manifest or installed dependency was changed. No `npx`, install,
update, `npm ci`, download, networked audit, or documentation command ran.

The frozen K0 assertion schema, lifecycle schema, record schema, artifact
schema, public assertion index, shared contracts, and application entry retain
their starting SHA-256 values. A baseline-to-implementation diff has zero
unauthorized paths and `git diff --check` passes. There is still no configured
remote. All fixtures and output remain deliberately impossible and synthetic;
no real coordinate, place, Nation, source, boundary, geometry, land, private,
or user-supplied data was introduced.

## Terminal boundary and next owner decision

A coherent terminal ledger would set `S0-SPATIAL` to `complete`, set
`current_focus.work_item` to null with a non-empty terminal reason, and return
`finish_states.local_release_candidate.current_state` to `blocked` while
retaining the exact four existing roots: `B2-REVIEW`, `B4-FR-UX`,
`B5-WA-LWS-ADAPTER`, and `B5-WA-RULES`. The current roadmap validator accepts
that state with 26 complete, 0 in progress, 0 ready, 14 blocked, 0 deferred,
and 9 not started. It does not require a production or release change.

However, `tests/pipeline/roadmap-validator.test.mjs` lines 28 through 35
hard-code the live activation snapshot: S0 `in_progress`, current focus S0, and
local release `in_progress`. The test reads the live roadmap, runs under
`npm test`, and would deterministically fail after the required terminal
transition. No `ROADMAP.yaml`-only state can satisfy both the terminal ledger
rules and those opposite assertions.

That pipeline test is outside the frozen implementation allowlist in contract
lines 753 through 769. Editing it without explicit owner authority would itself
violate the S0 boundary. Leaving a known failing final check or claiming
completion while S0 remains active would be equally false.

The next owner decision is therefore narrow: authorize or reject an edit only
to `tests/pipeline/roadmap-validator.test.mjs` so its live-state assertions
reflect the terminal-blocked ledger while preserving its synthetic regression
fixtures. Until that exact boundary is opened, S0 remains implemented,
reviewed, removal-proven, and locally checkpointed but not ledger-complete.
`G-K0-S0-CONVERGENCE`, all four evidence blockers, the B9/B10 chain, and the
local-release scope remain unchanged. No O0, D0, convergence, integration,
production source, real geometry, or later phase has begun.
