# K0 lifecycle contract decision packet

Status: frozen for K0 implementation after independent cooperative and
adversarial PASS reviews on 2026-09-01.

Authority: local synthetic-only K0 approval recorded in `ROADMAP.yaml` under
`G-K0-LIFECYCLE`. This packet does not authorize a source request, source
activation, credential, provider, AI operation, Nation-identity change,
publication, or release-scope convergence.

## Purpose and compatibility boundary

K0 is an additive contract kernel for source-custodied lifecycle evidence. It
does not replace `PolicyRecord 1.4`, alter its meaning, or become part of the
current public artifact. `PolicyRecord 1.4` remains the existing application
contract and receives K0 data only through the explicit projection described
below.

The K0 contract versions are:

- assertion primitives: `1.0.0`;
- lifecycle bundle: `1.0.0`;
- canonical JSON and digest algorithm: `ps-c14n-json-1`;
- compatibility projection: `policy-record-1.4-from-k0-1.0.1`.

These versions are independent of the existing record, artifact, taxonomy, and
source-registry versions.

## Frozen shared assertion seam proposed for review

K0 owns the generic primitives that S0 may later import. S0 must not create a
parallel provenance, time, uncertainty, or digest vocabulary.

### Source-qualified subjects

`SourceQualifiedIdentity` is exactly `{ sourceId, sourceRecordId }`. A stable
instrument ID is derived from both values. A source record from another source
always has another identity, even when reviewed evidence says the records may
describe the same instrument.

No contract contains an automatic-merge flag that can be enabled. Instrument
and equivalence contracts instead carry `automaticCrossSourceMerge: false` as a
constant invariant.

### Source provenance

`SourceProvenance` contains only:

- exact source identity and source record identity;
- exact lowercase, credential-free HTTPS source URL whose raw lexical form
  satisfies the same full URI format as the schema, and exact source
  path/locator;
- retrieval time and nullable source-updated time;
- adapter ID and version;
- SHA-256 source-content digest;
- validation state, fixed to `validated` for supported facts.

The source-content digest identifies the source bytes or synthetic fixture
fragment from which the fact was obtained. A separate fact digest covers the
canonical fact object. Neither digest licenses reproduction of source content.

### Evidence states

Every derived assertion uses exactly one evidence state:

- `supported`: one or more exact immutable source-fact references;
- `unknown`: no fact reference and reason `not_supplied` or `not_observed`;
- `insufficient_evidence`: cited facts exist but do not support the proposed
  assertion;
- `ambiguous_evidence`: cited facts support more than one non-conflicting
  reading and no reading is selected;
- `conflicting_evidence`: two or more cited facts conflict.

Only `supported` may carry a derived value. Unknown, insufficient, ambiguous,
and conflicting variants cannot hide a value in free-form metadata.
`EquivalenceAssertion` and `RelationshipAssertion` extend `DerivedAssertion`
and use this exact evidence union in addition to their separate reviewed
resolution/type fields.

### Time

`TemporalAssertion` keeps these dimensions in separate named fields:

- `observedTime`;
- `publishedTime`;
- `effectiveTime`;
- `validTime`.

A supported value is an exact ISO date, a canonical RFC 3339 profile date-time
with mandatory known offset, or an interval. The profile requires uppercase
`T` and `Z`, ordinary seconds `00` through `59`, and rejects the RFC 3339
unknown-offset form `-00:00`; input is rejected rather than normalized. An
interval has nullable `start` and `end`; each present
endpoint contains one exact date or date-time plus `inclusive: true|false`.
Both bounds cannot be null. Start must precede end under the rules below; equal
bounds are valid only when both are inclusive. Date precision is never
converted to midnight. Open bounds remain open. Unknown, insufficient,
ambiguous, and conflicting time evidence uses the same evidence states and
carries no invented value.

Comparison is frozen as follows:

- date compares lexically only with date;
- date-time compares by its represented instant only with date-time;
- date and date-time are incomparable, including when their displayed calendar
  date differs;
- an interval is before another value only when its closed/open end is proven
  strictly before the other's closed/open start under equal precision;
- equal endpoints overlap when both are inclusive and are non-overlapping when
  either touching endpoint is exclusive;
- an open bound, mixed precision, equal candidate point, or overlapping range
  is indeterminate rather than earlier/later.

Status-as-of accepts a date or date-time point only, never an interval. A
“latest” status exists only when one supported candidate is provably after every
other candidate. Otherwise projection refuses.

Array position is never event order. Chronology may be derived only when exact
temporal ranges do not overlap. Overlapping precision windows, open intervals,
or missing values remain concurrent or indeterminate. Stable event ID may break
an equal-time tie only when every modeled semantic facet other than event
identity is canonically equal, including actor, source status, all four time
dimensions, the selected exact event-label fact, and evidence. Event identifier
fact identity is the event identity exception and is not a semantic tie facet.

### Deterministic derivation

`DerivedAssertion` records its assertion ID and class, ordered and unique input
fact IDs and digests, rule ID and version, canonicalization version, result
digest, evidence state, and validation state. Every evidence reference must be
an exact ID/digest-aligned input, and every input fact ID must independently
satisfy the exact fact-ID grammar. Inputs may additionally include exact facts
used by the deterministic assertion but not claimed as evidence; this is
required when an `unknown` assertion binds a source-supplied label while its
evidence union correctly remains empty. It cannot claim source custody.

## Lifecycle contracts

### `SourceFact`

An immutable, source-custodied assertion with:

- stable fact ID;
- `assertionClass: source_fact`;
- source-qualified identity;
- an allowlisted predicate;
- one typed value (text, identifier, date, date-time, interval, or SHA-256
  digest);
- exact `SourceProvenance`;
- fact digest calculated over every field except the digest itself.

The predicate/value allowlist is frozen as follows:

| Predicate | Required value kind |
| --- | --- |
| `instrument_identifier` | `identifier` |
| `instrument_title` | `text` |
| `rendition_identifier` | `identifier` |
| `rendition_digest` | `sha256_digest` |
| `event_identifier` | `identifier` |
| `event_label` | `text` |
| `actor_label` | `text` |
| `source_status_label` | `text` |
| `observed_time` | `date`, `date_time`, or `interval` |
| `published_time` | `date`, `date_time`, or `interval` |
| `effective_time` | `date`, `date_time`, or `interval` |
| `valid_time` | `date`, `date_time`, or `interval` |
| `status_as_of` | `date` or `date_time` |
| `relationship_label` | `text` |
| `equivalence_label` | `text` |

No free-form predicate exists. Schema and semantic validation reject a value
kind that does not match its predicate.

Facts have no legal-effect, relevance, Nation, rights, interest, eligibility,
or impact field. Functions clone and recursively freeze validated inputs rather
than mutating caller objects.

### `PolicyInstrument`

A stable source-qualified identity with an exact source-identifier fact,
optional title fact, versioned identity rule, and supported evidence. Its ID is
derived only from the source ID and source record ID. Equivalence assertions do
not change it.

Stable IDs use unpadded RFC 4648 base64url of exact UTF-8 strings:

- instrument: `k0:instrument:<sourceId>:<base64url(sourceRecordId)>`;
- version: `k0:version:<sourceId>:<base64url(sourceRecordId)>:<base64url(renditionIdentifier)>:<full-renditionDigest>`;
- fact: `k0:fact:<sourceId>:<base64url(sourceRecordId)>:<base64url(sourcePath)>:<predicate>:<full-sourceContentDigest>`;
- event: `k0:event:<sourceId>:<base64url(sourceRecordId)>:<base64url(eventIdentifier)>`.

Equivalence and relationship assertion IDs are the lowercase SHA-256 digest of
their contract version, exact assertion type, fully source-qualified endpoints,
and sorted exact evidence-fact IDs, prefixed respectively with
`k0:equivalence:` or `k0:relationship:`. Metadata, title, URL, lifecycle state,
and array position are not identity inputs. Semantic validation recomputes and
rejects every supplied ID that differs.

### `InstrumentVersion`

A source-qualified rendition with:

- stable version ID and parent instrument ID;
- official rendition identifier fact;
- SHA-256 rendition digest fact;
- reproduction basis;
- distinct observed, published, effective, and valid temporal assertions;
- exact evidence and source custody.

Missing or conflicting dates remain explicit evidence states. A version does
not imply currentness, legal force, or superiority over another version.

### `LifecycleEvent`

An event has a stable ID, instrument and optional version references, an
allowlisted event type, exact source label fact, evidence state, and all four
time dimensions. `actor` is optional and absent when the source does not supply
one. When present it contains an exact `actor_label` fact and supported evidence;
issuing-body, party, sponsor, title, or relationship metadata cannot fill it.

The exact event enum is `introduction`, `hearing`, `committee_referral`,
`amendment`, `adoption`, `signature`, `publication`, `enactment`,
`effective_date`, `correction`, `withdrawal`, `stay`, `substitution`,
`supersession`, `decision`, `status_observation`, and `other`. Multiple events
and versions may overlap. No single “current state” is required.

An event may separately carry a `sourceStatus` observation only when an exact
`source_status_label` fact and an exact supported status-as-of temporal fact are
supplied. Event type, relationship type, effective date, publication date,
actor, array position, and retrieval time never substitute for that status
observation.

### `EquivalenceAssertion`

A reviewed or unresolved relation between two source-qualified instrument
identities. States are `reviewed_equivalent`, `reviewed_not_equivalent`,
`possible_equivalent`, and `unknown`. It preserves both identities and fixes
`automaticCrossSourceMerge` to `false`.

Resolution/evidence combinations are closed: `reviewed_equivalent` and
`reviewed_not_equivalent` require `supported`; `possible_equivalent` requires
`ambiguous_evidence`; and `unknown` requires shared evidence state `unknown`.
Every other cross-product is invalid.
The exact `equivalence_label` fact is always an aligned derived input and is
also evidence for every non-`unknown` resolution. An `unknown` resolution keeps
zero evidence references and does not convert its label into support.

### `RelationshipAssertion`

A typed relation over fully source-qualified instrument/version references.
Types are correction, amendment, withdrawal, stay, substitution, and
supersession. It extends `DerivedAssertion` and uses the exact shared evidence
states. The contract has no legal-effect or applicability field; K0 records
source relationship evidence, not a legal conclusion.

The endpoint shape is a closed union:

- correction: `subject` corrects `affected`;
- amendment: `subject` amends `affected`;
- substitution: `subject` substitutes for `affected`;
- supersession: `subject` supersedes `affected`;
- withdrawal: unary `affected` reference only;
- stay: unary `affected` reference only.

Binary endpoints must differ as fully qualified instrument/version references.
Withdrawal and stay do not invent another instrument, actor, inverse edge,
duration, current state, or legal consequence. A source label and its evidence
remain separate from endpoint semantics.
The exact `relationship_label` fact is always an aligned derived input and is
also evidence for every non-`unknown` relationship assertion. An `unknown`
relationship keeps zero evidence references and cannot treat its label as
support.

## Canonicalization and immutable replay

`ps-c14n-json-1`:

1. accepts JSON values only;
2. sorts object keys lexicographically by Unicode code point;
3. preserves array order except lifecycle collection arrays, which the bundle
   normalizer sorts by their stable IDs;
4. rejects duplicate IDs, `undefined`, sparse arrays, non-finite numbers,
   unsafe integers, negative zero, prototypes other than plain object/array,
   and cycles;
5. emits UTF-8 JSON with no insignificant whitespace;
6. computes lowercase SHA-256 hex digests.

Evidence-reference arrays must be unique and lexicographically sorted. Bundle
digest calculation excludes only the bundle's own digest field. Fact digest
calculation excludes only that fact's own digest field. Reordered object keys or
collection input order therefore replay to identical canonical bytes and
digests without making event array order meaningful.

## PolicyRecord 1.4 compatibility projection

The projection result is a closed union:

- `projected`: contains projection version, target record version, `lossy:
  true`, exact input bundle/instrument/base-record/validation-context/output-record
  digests, sorted
  per-item loss entries, sorted pointer-replacement receipts, and one cloned
  `PolicyRecord 1.4`; or
- `refused`: contains the same version and input identity plus sorted unique
  reason codes and blocking assertion IDs, and no `record` property.

The caller supplies an already valid base `PolicyRecord 1.4`, one exact K0
instrument ID, a frozen source-specific `PolicyRecord14ProjectionPolicy`, and
owner-selected data context containing the source registry, taxonomy, and an
optional complete Nation collection. It cannot supply executable validation
logic. The policy binds the exact canonical context digest, the result repeats
that digest, and the repository-owned validator additionally requires the
digest to appear in its repository authorization allowlist. Schema-valid
caller data and a caller-recomputed policy digest cannot authorize a new source
host or substitute another context. K0's current allowlist contains only the
committed source registry and taxonomy with a null Nation collection; a future
Nation-bearing context requires a separately reviewed repository authorization
without changing Nation validation rules. The validator schema-validates and
semantically checks the context, derives the source configuration from the
registry, and runs the unchanged PolicyRecord validators on isolated clones.
The source ID and source record ID must match. The projection does not search
equivalence assertions, select another source identity, or accept a merged
identity.

The projection policy is versioned and contains an allowlist from an exact
source-supplied status label to one existing `PolicyRecord.status.normalized`
value. K0 event types never map directly to normalized status. A projected
status requires all of:

1. a `LifecycleEvent.sourceStatus` observation;
2. an exact `source_status_label` fact from the same source-qualified identity;
3. a supported exact status-as-of value, kept distinct from observed,
   published, effective, and retrieved time;
4. one exact mapping in the supplied policy; and
5. an unambiguous latest status observation whose precision window does not
   overlap a different candidate.

An effective date does not imply effective status; signature does not imply
enactment; withdrawal or supersession evidence does not prove a whole
instrument's current status; and a relationship never synthesizes an inverse
or status. An explicitly source-labeled unknown may map to `unknown` only when
the status label and its true as-of value are themselves supported. System
uncertainty, missing evidence, or insufficient evidence never maps to
`unknown`.

Publication may populate `dates.published` and history without becoming a
status. Introduction and effective events may populate their matching date
fields only from their matching supported temporal dimensions. Every non-null
projected value receives provenance derived from the exact source fact and
projection rule. A null omission receives no output provenance. Existing Nation
associations, jurisdiction, issuing bodies, relevance,
taxonomy, landmark state, texts, source identity, and URLs remain
byte-equivalent to the base record.

The exhaustive field mapping is:

| K0 evidence | Target | Precision and behavior |
| --- | --- | --- |
| exact `sourceStatus` label + `status_as_of` + exact mapping policy | `/status/normalized`, `/status/sourceLabel`, `/status/asOf` | Required for projection. Date or date-time is copied lexically. Missing, unknown, insufficient, ambiguous, conflicting, unmapped, or non-latest evidence refuses; no other time is a fallback. |
| `introduction.validTime` | `/dates/introduced` | Exact date only. Date-time/interval/unknown writes `null`, removes provenance for the prior value, and emits a per-item loss; it is never truncated. |
| `publication.publishedTime` | `/dates/published` | Exact date only. Date-time/interval/unknown writes `null`, removes prior provenance, and emits a per-item loss. |
| `effective_date.effectiveTime` | `/dates/effective` | Exact date only. It does not affect status. Date-time/interval/unknown writes `null`, removes prior provenance, and emits a per-item loss. |
| latest provably ordered event `validTime` | `/dates/lastAction` | Exact date only. Mixed precision, overlap, date-time, interval, or indeterminate ordering writes `null`, removes prior provenance, and emits loss; it never invents a date. |
| every supported event | `/actionHistory` | Rebuilt only when every included event has a provable total temporal order; then sorted chronologically with stable ID used only for identical, semantically equivalent events. If total order is indeterminate, the projection writes `[]`, removes all prior history provenance, and emits a per-event loss rather than letting array order imply chronology. Label and URL come from the exact event-label fact. |
| every supported `sourceStatus` observation | `/statusHistory` | Rebuilt from exact status label/as-of facts. Any non-supported observation refuses rather than becoming history. |

This projection version rejects `intergovernmental_accord`, `court_decision`,
and `administrative_decision` base records because their 1.4 specializations
bind status/date semantics outside this generic one-record mapping. It does not
alter their existing contracts.

The only mutable `PolicyRecord 1.4` pointers are:

- `/status/normalized`, `/status/sourceLabel`, and `/status/asOf`;
- `/dates/introduced`, `/dates/published`, `/dates/effective`, and
  `/dates/lastAction`;
- `/actionHistory` and `/statusHistory`;
- `/fieldProvenance`, solely for provenance at the preceding changed leaves.

Those lifecycle pointers are deterministically replaced, not merged.
Projection first removes every provenance entry at or below each rebuilt root
(`/actionHistory` and `/statusHistory`) and at each replaced scalar pointer.
It then writes exactly one entry for every non-null primitive output leaf from
the exact same-source fact and projection rule. It copies `sourceUpdatedAt` only when the
fact provenance supplies it and otherwise writes null; it never derives that
value from another date. Provenance for a removed leaf cannot survive, and
duplicate or stale provenance cannot remain. Every other subtree is
canonical-byte-equal to the validated base.

Each pointer-replacement receipt is
`{ pointer, baseValueDigest, outputValueDigest, baseProvenanceDigest,
outputProvenanceDigest, assertionReferences, inputFactIds, provenanceFactIds,
ruleId, ruleVersion }`. An assertion reference names the exact assertion ID and
relative source pointer used by that replacement. Input facts were considered
by the replacement or omission decision; provenance facts are the sorted subset
actually cited by output provenance. When multiple exact same-value facts
support one scalar but PolicyRecord 1.4 can emit only one provenance entry, the
lexicographically first exact fact ID supplies that entry; every fact remains a
decision input, while only the emitted fact is named in `provenanceFactIds`.
Equal base/output value digests are valid
when a deterministic replacement refreshes provenance, whose separate digests
make that operation explicit. A null omission has no provenance fact IDs.
The envelope separately records canonical base and output record digests.
Existing `sourceDocumentRelationships` must be empty; otherwise this
one-record version refuses with
`base_relationship_graph_requires_batch_projection`. It emits no relationship
edge, never synthesizes an inverse, and never weakens reciprocal validation.

The compatible result must pass the unchanged record JSON Schema, unchanged
single-record `validateRecordPolicy`, and unchanged one-record-set
`validateRecordSetPolicy` with the base registry, taxonomy, and Nation context.
Any failure returns `target_record_1_4_validation_failed` and no partial record.

The projection refuses when:

- the base and instrument source-qualified identities differ;
- the base record is not schema `1.4.0`, has an excluded specialized shape, or
  has an existing relationship graph;
- a source-status candidate lacks an exact supported label or true status-as-of
  point time;
- no exact source-status mapping exists for a label the projection would need
  to use;
- competing source-status temporal windows overlap so current status is
  indeterminate (ordinary event-history overlap follows the declared omission
  and loss path instead of causing refusal);
- concurrent latest candidates differ or their source labels conflict;
- a relationship is ambiguous, insufficient, conflicting, or cannot be safely
  represented by the single normalized status;
- a cross-source relationship would need a PolicyRecord edge or provenance
  entry tied to another source;
- an attempted projection would change a protected non-lifecycle field; or
- the projected record fails the existing JSON Schema or semantic policy.

Correction, amendment, withdrawal, stay, substitution, and supersession remain
represented in K0. They never set normalized status. Projection `1.0.1`
refuses for every `RelationshipAssertion` anywhere in the supplied bundle,
including supported same-source assertions unrelated to the selected
instrument; it never silently omits one. Cross-source classification compares
the relationship's own endpoint source IDs. A
future version may project a same-source definite relationship only if the
complete reciprocal record set is supplied and passes the unchanged 1.4
relationship validator; it may never synthesize an inverse edge.

## File and dependency boundary

K0 implementation is limited to:

- `schemas/assertion.schema.v1.json`;
- `schemas/lifecycle.schema.v1.json`;
- `src/kernel/assertions/*`;
- `src/kernel/lifecycle/*`;
- the declaration-only TypeScript surface for the existing local
  `src/pipeline/source-registry.mjs` semantic validator;
- `fixtures/lifecycle/*`;
- `tests/kernel/assertions/*` and `tests/kernel/lifecycle/*`;
- foundation validation and binding documentation needed to register those
  additive contracts.

No runtime app entry, public artifact schema, existing record schema, source
registry, adapter, Nation contract, or dependency is changed. No new package is
required.

## Required tests

- strict JSON Schema compilation and representative/malformed fixtures;
- stable instrument and version identity across replay and input reordering;
- immutable provenance and digest-tamper rejection;
- actor supplied only from an exact fact;
- separate observed/published/effective/valid time and conflicting/missing date
  behavior;
- chronology without invented date precision;
- ambiguous and concurrent lifecycle states;
- correction, amendment, withdrawal, stay, substitution, and supersession;
- unresolved cross-source equivalence with automatic-merge rejection;
- byte-identical canonical replay;
- successful simple PolicyRecord 1.4 projection;
- declared loss and refusal cases for unsupported/ambiguous lifecycle evidence;
- projected-record schema and semantic compatibility;
- protected-field byte-equivalence and input non-mutation;
- rejection of legal/current-status, Nation, relevance, rights, interest,
  eligibility, and impact overclaims.

Every projected omission is one sorted entry
`{ assertionId, sourcePointer, targetPointer: string | null, lossCode }`;
`sourcePointer` is the exact relative RFC 6901 pointer, with the empty string
reserved for a whole-object omission, and `targetPointer` is null when
PolicyRecord 1.4 has no corresponding field. The four event temporal dimensions
are accounted separately and cannot collapse under one generic event loss.
Every lifecycle assertion and every unused fact is either represented by a
pointer-replacement receipt or named by a loss entry; there is no catch-all
loss. Relationship
assertions never appear in this list because they always refuse projection
`1.0.1`. The exhaustive loss-code vocabulary is:

- `source_fact_not_projected`;
- `instrument_metadata_not_projected`;
- `version_not_projected`;
- `equivalence_not_projected`;
- `actor_not_projected`;
- `non_status_event_not_projected_to_status`;
- `source_status_not_projected`;
- `temporal_precision_not_projected`;
- `temporal_interval_not_projected`;
- `temporal_assertion_not_projected`;
- `history_order_not_projected`.

For an event with no `sourceStatus` property,
`non_status_event_not_projected_to_status` points to the present `/eventType`
facet, never to the absent `/sourceStatus` property. A present but unreceipted
source-status observation uses exact `/sourceStatus` with
`source_status_not_projected`.

Refusal returns all applicable sorted unique codes and all directly blocking
assertion IDs. The exhaustive refusal-code vocabulary and mapping is:

| Condition | Code |
| --- | --- |
| structural/semantic lifecycle validation fails | `invalid_lifecycle_bundle` |
| fact or bundle digest does not replay | `input_digest_mismatch` |
| projection policy source/version/rule is not exact | `projection_policy_mismatch` |
| base schema is not exactly 1.4.0 | `base_record_schema_version_mismatch` |
| base and instrument source-qualified identities differ | `base_identity_mismatch` |
| Accord, court, or administrative specialization is supplied | `base_specialization_unsupported` |
| base relationship array is nonempty | `base_relationship_graph_requires_batch_projection` |
| no supported source-status observation exists | `missing_status_observation` |
| source-status evidence is unknown | `unknown_status_evidence` |
| source-status evidence is insufficient | `insufficient_status_evidence` |
| source-status evidence has multiple non-conflicting readings | `ambiguous_lifecycle_state` |
| source-status facts conflict | `conflicting_status_evidence` |
| status label lacks exact supported status-as-of | `missing_status_as_of` |
| exact source label has no exact policy mapping | `missing_status_mapping` |
| latest source-status observations overlap or tie incompatibly | `concurrent_unrepresentable_state` |
| multiple versions cannot be represented without selecting one | `version_cardinality_unrepresentable` |
| a relationship's own endpoints span source IDs | `cross_source_relationship_unrepresentable` |
| a relationship is unknown, insufficient, ambiguous, or conflicting | `uncertain_relationship_unrepresentable` |
| a relationship cannot be represented by the one-record target | `relationship_unrepresentable_in_one_record` |
| a pointer outside the mutable allowlist differs | `protected_field_mutation_detected` |
| exact changed-leaf provenance cannot replace stale entries | `provenance_replacement_failed` |
| unchanged 1.4 schema or policy validation fails | `target_record_1_4_validation_failed` |

A refused result never contains a partial record. Because all applicable codes
are returned in lexical order, no hidden precedence rule can change the result.

## Stop conditions

Stop for owner review rather than changing this contract if implementation
requires a real source, network, provider, credential, AI, new dependency,
backend, persistence, private/land data, Nation-identity or association change,
breaking PolicyRecord 1.4 change, release-scope convergence, or weaker existing
gate/fallback.
