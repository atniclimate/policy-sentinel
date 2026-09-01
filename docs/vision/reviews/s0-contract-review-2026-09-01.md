# S0 synthetic spatial contract review

Date: 2026-09-01

Current disposition: **PASS; contract `1.0.0` frozen.** Independent cooperative
and adversarial review found no residual high- or medium-severity issue. This
record does not authorize S0 implementation.

Reviewed contract: `docs/vision/s0-spatial-contract.md`.

## Provenance of this issue register

### Repository-recorded facts

Before mutation, `ROADMAP.yaml` recorded that the preserved S0 draft had seven
unresolved specification issues. The draft was untracked, exactly 13,307 bytes,
and had SHA-256
`ca5486e67b43c049e8f6d1c51e9c5b9e34508084a04a90b32c8369a46d7b5d2b`.
Neither that draft nor any committed review file enumerated the original seven.
A repository-wide search found no other enumeration.

The membership, wording, order, and severity of the historical seven are
therefore unknowable from repository evidence. This record does not reconstruct
or claim to reproduce that missing historical list.

### Independently reconstructed findings

The identifiers below were created on 2026-09-01 for this review. They combine
the owner's seven required blocker classes with additional issues independently
found by cooperative, adversarial, and K0-interface review. They are a new issue
register, not “the original seven.”

## Review method and scope

Three read-only reviews were conducted independently before contract edits:

- a cooperative implementability and scope review;
- an adversarial compatibility, overclaim, ambiguity, and bypass review; and
- a frozen K0 assertion/interface and roadmap-accounting audit.

Each reviewer read the owner-required K0/S0 documents and the frozen K0
assertion, identity, canonicalization, integrity, and temporal implementation
contracts. No reviewer edited implementation files, accessed a source or
network, or treated agent assertion as completion evidence.

The baseline audit confirmed `main` at
`816709b6385ea7d8edf36711d72b55b5d022d7d3`, the exact untracked draft, no
remote, all three named K0 commits, K0 complete, S0 ready, zero active items,
and closed `G-K0-S0-CONVERGENCE`. The required S0 activation changed only S0 to
`in_progress`, matching current focus and active local-release accounting; the
four existing release blockers/evidence roots remain unchanged.

## Independently reconstructed issue register

| ID | Initial severity | Finding | Frozen resolution | Status |
| --- | --- | --- | --- | --- |
| `S0-R01` | high | The draft substituted observation IDs and geometry digests for K0 `DerivedAssertion` fact IDs and fact digests. | The relation is now an outer S0 receipt with a nested schema-exact K0 assertion. Its inputs are six replayed K0 facts, sorted as ID/digest pairs; its K0 assertion ID/class/rule/evidence and result digest are exact. | Resolved; PASS. |
| `S0-R02` | high | S0 prohibited every HTTP locator although K0 provenance mandates HTTPS, and geometry, time, coverage, and statements lacked truthful fact custody. | One non-resolving `policy-sentinel.invalid` URL family is the sole lexical exception. Pre-fact observation and statement renditions have exact canonical digests; legitimate `rendition_digest`, `observed_time`, `valid_time`, and truthful title facts bind them without lifecycle-label abuse. | Resolved; PASS. |
| `S0-R03` | high | Observation/relation identity, digest preimages, direction, duplicates, mismatches, references, and replay were not frozen. | The contract fixes a cycle-free construction DAG, literal preimages, content-derived IDs, ordered references, reverse-direction behavior, duplicate/self/collision rejection, aligned K0 inputs, validation order, and the sole result-digest exclusion. | Resolved; PASS. |
| `S0-R04` | high | Shared valid time had no closed representation or complete intersection rules for precision, offsets, open/exclusive bounds, disjointness, and evidence. | A three-variant shared-time union binds both exact facts. Point/interval intersection, equal-instant lexical selection, inclusivity, open bounds, mixed precision, disjointness, and forbidden fallbacks are total. | Resolved; PASS. |
| `S0-R05` | high | Coverage, geometry, digest, uncertainty, and resolution combinations were incomplete; invalid axis/space states were mislabeled as valid unknowns. | A complete validity matrix closes every combination. Resolution/lattice semantics are exact; invalid structure and integrity reject before evaluation; the valid unknown vocabulary and precedence are total. | Resolved; PASS. |
| `S0-R06` | high | The “any boundary pair” tolerance heuristic was unsound, unbounded, and exposed unsafe doubled arithmetic. | Tolerance is bounded to `0..2`. The normative oracle classifies the complete Cartesian product of valid whole-box perturbations, includes zero perturbation, caps candidates, uses checked small-integer arithmetic, and returns ambiguity only for multiple whole-relation classes. | Resolved; PASS. |
| `S0-R07` | high | Accessibility and non-interference claims lacked exact inputs, order, labels, constructors, protected paths, import barriers, artifact probes, and removal proof. | The contract fixes bounded closed view input, document/table order, captions, headers, labels, unknown text, disclaimer association, constructor/import/export barriers, recursive forbidden keys, protected root/pointer digests, exact artifact probes, build markers, and byte-identical removal acceptance. | Resolved; PASS. |
| `S0-R08` | medium | Attribution omitted a usage/reuse basis, and year/retrieved/observed/valid semantics were ambiguous. | Exact attribution and repository-authored usage-basis constants are mandatory. All S0 temporal lexemes use year 3785, `sourceUpdatedAt` is null, and retrieval, observation, and validity remain distinct without fallback. | Resolved; PASS. |
| `S0-R09` | medium | “Exhaustive finite-box” properties implied an impractical full-domain Cartesian product and had no deterministic case budget. | Exact topology is capped at 40,000 classifications; tolerance uses at most 64 named cases and a 390,625-pair per-case oracle; full-domain extremes/transforms are capped at 256 cases; randomness and new property dependencies are forbidden. | Resolved; PASS. |
| `S0-R10` | medium | The threat model did not enumerate integrity, laundering, precision, resource, constructor, accessibility, import, or artifact attacks. | The contract names each attack and binds it to exact fail-closed custody, validation, projection, perturbation, and non-interference controls plus unchanged owner stop conditions. | Resolved; PASS. |
| `S0-R11` | medium | The exact pre-fact example used a fixture slug that disagreed with its layer and feature IDs. | The example now uses `fixture-0001` consistently in the slug, source record, layer ID, and feature ID. | Resolved; PASS. |
| `S0-R12` | medium | Protected diagnostic pointers were not explicitly relative to each object and named nonexistent PolicyRecord `/recordType`. | Collection roots remain the acceptance digests; diagnostic pointers are explicitly per-object and use the real `/documentType` field. | Resolved; PASS. |
| `S0-R13` | medium | Exact document order omitted the jurisdiction heading that the next clause required. | The heading and table are exact items 4 and 5 and are jointly omitted for an empty validated array. | Resolved; PASS. |
| `S0-R14` | medium | The `instrument_title` fact could be read as repurposing a lifecycle predicate for jurisdiction semantics. | The statement fragment is explicitly a synthetic source instrument; `sourceLabel` is its truthful exact title and supports no jurisdictional, legal, or lifecycle meaning. | Resolved; PASS. |
| `S0-R15` | medium | Open interval rendering did not freeze delimiters for null endpoints. | Open starts render `(-infinity` and open ends render `+infinity)`; null endpoints always use exclusive delimiters. | Resolved; PASS. |
| `S0-R16` | medium/high boundary | Free-form alphabetic fixture slugs could smuggle real or semantic names into IDs and display. | The exact `^fixture-[0-9]{4}$` namespace and required negative cases reject alphabetic and semantic slugs. | Resolved; PASS. |
| `S0-R17` | medium | Literal schema/runtime parity demanded JSON Schema express semantic replay and cross-object invariants that it cannot represent. | Parity is exact for JSON-Schema-expressible structure; runtime validation separately owns semantic invariants and replay. | Resolved; PASS. |
| `S0-R18` | medium | Full SemVer layer versions allowed free-form prerelease/build text. | Layer versions use an exact numeric-only three-component grammar; prerelease/build metadata and negative cases are closed. | Resolved; PASS. |
| `S0-R19` | medium | “Every S0 object” accidentally required top-level markers on nested S0 and frozen K0 shapes. | The marker rule now names only the three top-level S0 domain objects. | Resolved; PASS. |

## Initial cooperative findings

Initial disposition: **FAIL**.

The cooperative reviewer found seven high-severity implementation blockers and
five medium/low contract gaps. Its principal counterexamples were impossible
K0 input shapes, cyclic or unrepresentable custody, identity drift, undefined
temporal intersections, incomplete observation combinations, irrelevant-boundary
tolerance ambiguity, duck-typed constructor and artifact leakage, and
effectively unbounded property enumeration.

After cross-review with the K0 interface auditor, the cooperative reviewer
confirmed that a stronger K0-preserving seam exists: treat each complete
synthetic fragment literally as a rendition, bind its complete digest through
a K0 `rendition_digest` fact, use exact temporal facts, and retain an outer S0
receipt with a nested K0 assertion. The candidate uses that approach rather
than adding an S0 fact/digest/evidence vocabulary.

Final cooperative disposition: **PASS**. The reviewer re-read the complete
contract, replayed the initial counterexamples, and found zero residual high-
or medium-severity findings. PASS was reconfirmed on the frozen 41,506-byte
contract with SHA-256
`ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.

## Initial adversarial findings

Initial disposition: **FAIL**.

The adversarial reviewer reported eight high-severity and four medium-severity
classes, including concrete counterexamples for K0 grammar failure, URL/fact
custody contradiction, direction and digest tampering, open-bound and
equal-instant temporal behavior, invalid/unknown confusion, irrelevant-axis
tolerance ambiguity, constructor/artifact bypass, and a roughly
18.7-trillion-pair reading of the prior exhaustive requirement.

Cross-review converged on two additional invariants now in the candidate:

- the source-fragment preimage is explicitly pre-fact and the construction DAG
  prevents observation-ID/provenance/fact-reference cycles; and
- every valid relation, including an unknown geometric outcome, uses K0
  `supported` evidence over exact source facts because those facts support that
  deterministic unknown outcome and no hidden alternate value exists.

Final adversarial disposition: **PASS**. The reviewer replayed every initial
attack and acceptance condition and found zero residual high- or
medium-severity findings. PASS was reconfirmed on the same frozen 41,506-byte
contract and SHA-256.

The remediation re-review also found `S0-R11` through `S0-R19`. These are
independently reconstructed findings discovered during this session, not the
missing historical seven. Each was corrected before the final cooperative and
adversarial PASS.

## K0 and scope disposition

The frozen contract requires no K0 `1.0.0` change, new predicate, external
dependency, real or externally sourced geometry, source/provider/network
access, credential, private or land data, Nation data, map, upload,
persistence, backend, database, AI, notification, remote, publication, or
product/release integration. It does not weaken provenance, ambiguity,
non-interference, Nation rules, a gate, an accepted fallback, or an evidence
root. No owner stop condition has been triggered.

## Validation and final disposition

Cooperative disposition: **PASS**. Adversarial disposition: **PASS**. Residual
high-severity findings: zero. Residual medium-severity findings: zero.

The pre-commit validation checkpoint passed:

- `npm run validate:roadmap`: 49 work items, 33 gates, 14 sources, and 17
  binding paths; status counts were 25 complete, 1 in progress, 0 ready, 14
  blocked, 0 deferred, and 9 not started;
- `npm run test:unit -- tests/pipeline/pipeline.test.ts`: 1 test file and 1 test
  passed;
- `npm run format:check`: all matched files passed Prettier;
- `npm run lint`: passed with zero warnings; and
- `npm run check`: formatting, lint, type checking, roadmap validation,
  source-boundary scanning, foundation validation, all 59 test files and 843
  tests, build, and artifact validation passed. The synthetic-only artifact had
  3 records, exactly 575 Nations, and 8 verified assets. Build IDs are
  invocation-specific because generated artifact assets embed the invocation
  generation time, so no transient build ID is asserted as a durable contract
  fact.

The lead must complete the staged diff/status inspection, verify implementation
directory absence, create the focused local contract-freeze commit, and report
those exact outcomes at the commit checkpoint.
