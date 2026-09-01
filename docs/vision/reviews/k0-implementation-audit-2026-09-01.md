# K0 implementation audit

Date: 2026-09-01

Final disposition: **PASS** from cooperative, adversarial, and focused
projection-accounting review. No K0 acceptance blocker remains.

Scope: local-only K0 lifecycle/assertion contracts, runtime validation,
synthetic fixtures, and the declared-lossy PolicyRecord 1.4 projection. The
review used only already-installed local tools. It did not edit or test S0,
contact a source, use a provider, access the network, or alter an external gate.

## Cooperative review

The cooperative review first found three blocking seams:

1. derived assertion input IDs outside the evidence set received text
   validation but not the exact K0 fact-ID grammar;
2. WHATWG URL parsing accepted raw URI lexemes that the assertion schema
   rejected; and
3. projection dereferenced malformed base-record fields before the unchanged
   PolicyRecord 1.4 schema validator could refuse them.

It later challenged a transient repository-only context redesign because it
would have drifted from the frozen data-only context contract and Nation
preservation boundary.

Closure:

- one runtime fact-ID validator now covers references and every derived input;
- runtime HTTPS validation uses the same installed full URI format as Ajv;
- target schema validation precedes unsafe dereference, while independently
  observable base identity, specialization, and relationship classifications
  use shape-safe inspection;
- the data-only validation context remains in the contract, its canonical
  digest is bound into the frozen policy and result, and a repository-owned
  allowlist supplies the authority boundary; and
- the current allowlist authorizes only the committed registry/taxonomy with a
  null Nation collection. A Nation-bearing context fails closed pending its own
  explicit review rather than changing Nation rules.

Final cooperative disposition: **PASS**, with all seven owner audit items and
all review-discovered seams closed.

## Adversarial review

The adversarial review produced concrete counterexamples for:

- a fact-digest failure suppressing independently observable policy/target
  refusals;
- scalar receipts naming multiple provenance facts when PolicyRecord emitted
  only one provenance entry;
- a caller-fabricated permissive source registry;
- event-ID tie-breaking across equal/overlapping events that differed in actor,
  source status, another temporal assertion, evidence, or exact label-fact
  provenance; and
- a loss pointer naming absent `/sourceStatus` on non-status events.

Closure:

- policy shape/context and target validation occur independently before bundle
  replay, so fact- and outer-digest failures retain every safely observable
  refusal code;
- `addProvenance` returns the single deterministic fact actually emitted;
  receipts retain every decision input but list only emitted facts in
  `provenanceFactIds`;
- the validator rejects any context digest outside the repository authorization
  allowlist even if a caller recomputes the policy digest;
- semantic event equivalence includes the selected exact `eventLabelFactId`,
  actor, source status, all four time assertions, and evidence, while excluding
  only event-identifier fact identity; and
- the non-status loss points to present `/eventType`; present but omitted status
  continues to point to exact `/sourceStatus`.

The final counterexample used distinct same-text/same-URL label facts with
different source paths and one shared broad evidence set. The repaired
projection cleared history and emitted per-event ordering losses.

Final adversarial disposition after repair and re-review: **PASS**.

## Projection-accounting review

The focused accounting review independently verified:

- exact recomputation of every receipt's base/output value and provenance
  digests;
- a complete, non-overlapping partition of source facts between receipt inputs
  and source-fact losses;
- top-level assertion and event temporal/source-status facet coverage;
- runtime resolvability of every nonempty receipt and loss source pointer;
- sorted/unique facts, references, receipts, losses, codes, and replay output;
- honest one-fact emitted provenance for multi-fact same-value decisions;
- bundle-global event/fact losses and universal relationship refusal using each
  relationship's own endpoints; and
- canonical equality of protected PolicyRecord 1.4 fields plus successful use
  of the unchanged schema and semantic validators.

A literal fixture-wide loss snapshot was judged unnecessary because the exact
partition, pointer-resolution, uniqueness, sorting, and targeted semantic tests
are generalized rather than record-specific.

Final projection-accounting disposition: **PASS**.

## Reviewed local evidence

- `npm run test:unit -- tests/kernel`: **PASS**, 8 files and 85 tests.
- `npm run typecheck`: **PASS**.
- `npm run lint`: **PASS**, zero warnings on the reviewed implementation.
- `npm run format:check`: **PASS** on the reviewed implementation.
- `npm run validate:foundation`: **PASS**, 5 schemas, 10 categories, 33
  subcategories, 3 valid fixtures, and 5 negative policy checks.

The root checkpoint report records the separately rerun full `npm test` and
`npm run check` evidence after this review document and the canonical ledger are
finalized.
