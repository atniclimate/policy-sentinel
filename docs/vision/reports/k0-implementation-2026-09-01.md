# K0 lifecycle kernel implementation report

Status: independently reviewed, fully locally validated, and checkpointed in
focused local implementation commit `ba6c4b6`. This documentation-only
follow-up records that immutable commit in the canonical ledger.

Authority: `G-K0-LIFECYCLE` in `ROADMAP.yaml`. This report covers only the
additive, local, synthetic K0 phase. It does not activate K0 in the public
artifact, alter `PolicyRecord 1.4`, or add K0 to the existing release graph.

## Implemented contracts

K0 adds strict versioned schemas and matching runtime contracts for:

- `SourceFact`;
- `PolicyInstrument`;
- `InstrumentVersion`;
- `LifecycleEvent`;
- `EquivalenceAssertion`;
- `RelationshipAssertion`;
- lifecycle bundle `1.0.0`; and
- projection `policy-record-1.4-from-k0-1.0.1`.

The shared assertion seam implements source-qualified identities, immutable
source provenance, closed evidence states, separate observed, published,
effective, and valid temporal assertions, exact point and interval precision,
`ps-c14n-json-1`, lowercase SHA-256 digests, stable IDs, immutable canonical
cloning, and exact fact/digest binding.

Lifecycle validation recomputes every stable fact, instrument, version, event,
equivalence, relationship, derived-result, and bundle digest. Collection input
order never becomes chronology. Actor is absent unless an exact supported
`actor_label` fact supplies it. Source status remains separate from event type
and requires an exact source-status label plus supported point status-as-of
evidence.

All six relationship forms are closed and directional. Correction, amendment,
substitution, and supersession have binary subject/affected endpoints;
withdrawal and stay are unary. Every relationship/equivalence label is an exact
derived input and must also be evidence for non-unknown assertions. Unknown
assertions keep empty evidence and cannot promote their labels to support.

## Seven-item audit closure

1. **Schema/runtime parity.** Runtime validation now uses the exact schema
   grammars for K0 fact IDs, derived assertion IDs/classes, lowercase slug rule
   IDs, no-leading-zero semantic versions, exact non-whitespace/control-free
   text, and lowercase credential-free HTTPS URLs using the schema's full raw
   URI profile. Every derived input fact ID is validated even when it is not an
   evidence reference. Table-driven tests submit the same positive and negative
   values to Ajv and runtime validators.
2. **Digest-refusal classification.** Typed integrity replay errors distinguish
   fact/bundle digest failures from structural or semantic lifecycle failures.
   Projection maps integrity errors to `input_digest_mismatch`, structural
   errors to `invalid_lifecycle_bundle`, and continues collecting independently
   observable policy and target refusal codes after either a fact-integrity or
   outer bundle-digest mismatch.
3. **Absent-date provenance.** Missing, unknown, date-time, interval, or
   indeterminate date projections write null, clear stale provenance, and never
   cite an event-label fact as temporal evidence. Replacement receipts separate
   decision inputs from facts actually cited by output provenance.
4. **Target-validator trust.** The projection input no longer accepts a
   validator callback. A repository-owned validator schema-validates and
   semantically checks data-only registry, taxonomy, and optional Nation
   collection context; requires its canonical digest to match both the frozen
   policy and a repository authorization allowlist; derives the source config;
   then runs the unchanged record schema, `validateRecordPolicy`, and
   `validateRecordSetPolicy` against isolated clones of both base and output.
   Schema-invalid, semantic-invalid, mismatched, and caller-rebound permissive
   contexts fail closed without a record.
5. **Relationship evidence.** Relationship and equivalence labels must be exact
   aligned inputs and, for every non-unknown assertion, exact evidence. Tests
   reject an unrelated substituted evidence fact and reject unknown assertions
   that omit their label input.
6. **Compatibility-projection loss coverage.** Projection `1.0.1` uses
   bundle-global accounting. Every omitted source facet has an exact
   `sourcePointer`; all four temporal dimensions are distinct; all bundle events
   and unused facts are accounted; and every relationship anywhere in the
   bundle refuses. Pointer-replacement receipts include assertion references,
   input/provenance fact sets, value digests, and provenance digests, so an
   equal-value provenance refresh is explicit rather than hidden. Tests
   independently recompute all four receipt digests. Multi-fact same-value
   decisions retain all inputs but name only the fact actually emitted in
   PolicyRecord provenance. The envelope also digests the exact validation
   context used for the compatibility decision.
7. **RFC3339 schema/runtime parity.** Both layers enforce the same canonical
   profile: uppercase `T`/`Z`, mandatory known offset, seconds `00` through
   `59`, no whitespace/lowercase separators, and rejection of `-00:00`. Year
   zero remains valid and uses corrected proleptic-Gregorian ordering.

## PolicyRecord 1.4 compatibility and non-interference

The projection accepts one exact same-source K0 instrument, an exact versioned
status mapping policy, an independently valid base record, and validated
data-only target context. It returns a closed `projected` or `refused` envelope
outside the unchanged `PolicyRecord 1.4` shape.

A successful result is always `lossy: true`. Only the frozen lifecycle pointers
for status, selected dates, histories, and their provenance are replaced.
Canonical before/after comparison protects every other subtree. Tests prove
exact preservation of source identity, URLs, jurisdiction, issuing bodies,
texts, subjects, taxonomy, relevance, Nation associations, and landmark state.
Specialized Accord, court, and administrative records remain unsupported rather
than receiving inferred semantics.

Status comes only from an exact supported source label, true status-as-of point,
and exact versioned mapping. Event types, relationships, effective/publication
dates, retrieval time, and array order cannot set normalized status. Ambiguous,
conflicting, unknown, concurrent, unmapped, cross-source, uncertain
relationship, protected-field, provenance, digest, and target-validation
conditions fail closed without a partial record.

Post-implementation cooperative and adversarial review also required
shape-safe base classification before dereference, full-facet semantic equality
before event-ID tie-breaking, and resolvable loss pointers. Equal or overlapping
events that differ in their selected exact label fact, actor, source status,
another time dimension, or evidence therefore clear history and declare
ordering loss; a non-status event points its intentional non-mapping loss to
present `/eventType`, never absent `/sourceStatus`.

## Synthetic fixtures and current local evidence

The empty lifecycle fixture and all runtime fixture builders are synthetic. No
provider response, real policy record acquisition, Nation-specific
configuration, private data, land data, geometry, AI, credential, service,
database, notification, or network input is used.

Historical evidence is kept distinct: before K0 mutation, `npm run check`
passed 51 test files and 758 tests at HEAD `758b6bf`, producing synthetic build
`synthetic-40dd246e487a3988b367`.

Current post-audit evidence so far:

- `npm run test:unit -- tests/kernel`: 8 files, 85 tests, all passing;
- `npm run lint`: pass with zero warnings;
- `npm run typecheck`: pass;
- `npm test`: foundation validation passed with 5 schemas, 10 categories,
  33 subcategories, 3 valid fixtures, and 5 negative policy checks; all 59
  Vitest files and 843 tests passed.

The first post-ledger `npm run check` stopped at `format:check` because
`ROADMAP.yaml` required local Prettier normalization; no later step ran in that
attempt. After formatting that single file, `npm run validate:roadmap` passed
and the complete `npm run check` passed: formatting, lint, typecheck, roadmap,
source-boundary scan, all 59 files and 843 tests, production build, and artifact
validation. The artifact contains 3 synthetic records, exactly 575 synthetic
Nations, and 8 verified assets; build ID
`synthetic-0302f42f2c692a9120cc`.

## Independent implementation review

`docs/vision/reviews/k0-implementation-audit-2026-09-01.md` records the full
finding/repair trail. Cooperative review, adversarial counterexample review,
and focused projection-accounting review each returned **PASS** after re-review
of the final repairs. No reviewer edited implementation files or used network
access. The last adversarial counterexample—distinct exact label facts with the
same display tuple and shared broad evidence—now remains indeterminate instead
of allowing event-ID order.

## Scope, dependencies, and gates

No package manifest, lockfile, installed dependency, application entry, route,
public artifact contract/builder, source registry data, adapter, Nation
contract, Nation association rule, taxonomy data, source state, or release
prerequisite is intentionally changed. A declaration-only type surface was
added for the already-existing local source-registry semantic validator; no new
runtime dependency was added.

K0 remains additive behind closed convergence gate `G-K0-S0-CONVERGENCE`. It
does not satisfy or change `B2-REVIEW`, `B4-FR-UX`,
`B5-WA-LWS-ADAPTER`, `B5-WA-RULES`, the B9/B10 chain, or the local release
candidate. Every remote, publication, credential, provider, source, geometry,
private-data, land-data, AI, notification, and external-network gate remains
closed. The ledger intentionally retains K0 as the sole `in_progress` item so
its dependency rule does not move S0 from the owner's required `not_started`
state; the next owner decision is the K0 ledger transition, not S0 execution.
