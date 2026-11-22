# S0 synthetic spatial-observation contract decision packet

Status: frozen `1.0.0` after independent cooperative and adversarial PASS on
2026-09-01. S0 implementation is outside this contract-only checkpoint.

Authority: local synthetic-only S0 approval recorded in `ROADMAP.yaml` under
`G-S0-SYNTHETIC`. This packet does not authorize real geometry, a source or
provider request, a map, an upload, persistence, private or land-related data,
location telemetry, infrastructure, publication, or release-scope convergence.

## Purpose, conformance, and architectural boundary

S0 is a removable evidence bridge for reproducible geometric observations over
deliberately impossible fixtures. It demonstrates that geometry can remain an
observation without becoming identity, jurisdiction, relevance, legal effect,
or another protected semantic conclusion.

The frozen S0 contract version is `1.0.0`. `MUST`, `MUST NOT`, `SHOULD`, and
`MAY` are normative. An S0 implementation conforms only when its schema,
runtime validator, constructors, derivation, projection, and tests all enforce
this packet. TypeScript types alone are not validation.

The earlier untracked `0.1.0` text was a candidate with no implementation or
consumer. `1.0.0` is the first frozen implementation contract. `experimental`
describes isolation and removability; it does not weaken version enforcement.

S0 imports these frozen K0 assertion `1.0.0` primitives without extending or
changing them:

- `SourceQualifiedIdentity`, `SourceProvenance`, and `SourceFact`;
- `FactReference`, `SupportedEvidence`, and supported `TemporalAssertion`;
- `TemporalValue` and the exact K0 date/date-time/interval validation rules;
- exact K0 fact identity and fact-digest replay;
- exact K0 `DerivedAssertion`; and
- `ps-c14n-json-1`, immutable canonical cloning, and lowercase SHA-256.

S0 does not create another provenance, evidence-state, temporal, or fact-digest
vocabulary. It uses the existing K0 predicates only with their literal
meanings. A complete synthetic spatial fragment is a rendition and therefore
uses `rendition_digest`; its observation and valid times use `observed_time`
and `valid_time`. S0 never relabels geometry or a jurisdiction statement as an
event, relationship, status, equivalence, actor, or legal conclusion.

S0 is not imported by the application, public artifact pipeline, record
contract, source registry, Nation contract, or K0 lifecycle bundle. Removing
its future schemas, modules, fixtures, tests, and foundation registrations MUST
leave the existing product behavior, public build bytes, and release graph
unchanged.

## Constants, namespaces, and the sole URL exception

Every top-level S0 domain object -- `SpatialObservation`, `SpatialRelation`, and
`JurisdictionEvidence` -- fixes these markers:

- `contractVersion: "1.0.0"`;
- `experimental: true`;
- `synthetic: true`; and
- `fixtureClass: "impossible_synthetic_geometry"`.

The exact source and presentation constants are:

- source ID: `s0-impossible`;
- adapter ID: `s0-impossible-fixture`;
- adapter version: `1.0.0`;
- attribution: `Policy Sentinel impossible synthetic fixture`;
- fixture usage basis:
  `Repository-authored impossible synthetic fixture; no external source or reuse grant.`;
- coordinate-space ID:
  `urn:policy-sentinel:crs:impossible-grid:1.0.0`;
- representation: `axis_aligned_integer_box_v1`;
- axes, in canonical named-axis order: `synthetic_x`, `synthetic_y`;
- unit: `impossible_unit`;
- topology rule ID: `s0-axis-aligned-box-topology`;
- topology rule version: `1.0.0`; and
- interpretation: `geometric_relation_only`.

`fixtureSlug` matches exactly `^fixture-[0-9]{4}$`. The fixed word and
four-digit suffix are identifiers only; alphabetic or otherwise semantic
suffixes are invalid. Its exact source-qualified identity and provenance URL
are:

```text
sourceIdentity.sourceId       = s0-impossible
sourceIdentity.sourceRecordId = s0-impossible:fixture:<fixtureSlug>
sourceUrl                     = https://policy-sentinel.invalid/fixtures/s0/1.0.0/<fixtureSlug>.json
```

The URL has no port, credentials, query, fragment, percent encoding, or other
host. It is the sole S0 HTTP(S) lexical value and exists only because frozen K0
`SourceProvenance` requires an absolute credential-free HTTPS URI. The
`policy-sentinel.invalid` host is a non-resolving repository sentinel, not a
locator, permission, or fetch target. Every other HTTP(S) value is invalid.
No S0 code may call `fetch`, DNS, a provider, or another network surface.

Layer IDs match `s0-impossible:layer:<fixtureSlug>`. Feature IDs match
`s0-impossible:feature:<fixtureSlug>`. Administrative-unit IDs match
`s0-impossible:administrative-unit:<fixtureSlug>`. Layer versions match exactly
`^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$`; prerelease and
build metadata are invalid. Observation, relation, and jurisdiction-evidence
IDs are content-derived below. Real place names, Nation IDs, policy-record IDs,
GeoJSON, URLs other than the sentinel provenance URL, and free-form properties
are invalid.

Every S0 date, date-time, and interval endpoint, including K0 fact values,
provenance `retrievedAt`, and rendered shared-valid-time values, MUST have year
`3785`. `sourceUpdatedAt` is exactly `null`. `retrievedAt` is provenance
custody time; `observedTime` is a separately sourced observation time; neither
may substitute for `validTime`, and their values need not be equal.

## Canonicalization, ordering, and rejection boundary

All digest preimages below are exact JSON objects with exactly the displayed
keys. A digest is lowercase SHA-256 over the UTF-8 bytes emitted by
`ps-c14n-json-1`. That canonicalization sorts object keys by Unicode code point,
preserves array order, and rejects non-JSON values, custom prototypes, cycles,
sparse/accessor/non-enumerable/symbol properties, non-finite or unsafe numbers,
and negative zero.

K0's path-specific collection behavior does not sort arbitrary S0 arrays.
S0 MUST explicitly order every set-like array before canonicalization:

- K0 fact-reference arrays by `factId` using Unicode code-point order;
- `(factId, factDigest)` input pairs by `factId`, keeping each digest with its
  ID and never sorting the digest array independently;
- observation, relation, and jurisdiction-evidence collections by their stable
  IDs; and
- perturbation classifications by the fixed relation enum order only when a
  diagnostic projection needs an array.

Caller order is semantic only for the subject and object of a relation and for
the two coordinates stored in a declared axis order. No other input order may
change an ID, digest, result, or presentation row order.

Validation is fail-closed in this order:

1. JSON value, plain prototype, exact keys, markers, constants, namespace,
   string, integer, URL, and year rules;
2. coordinate-space, axis-order, bounds, resolution, coverage, uncertainty,
   and geometry-presence rules;
3. geometry-digest replay;
4. pre-fact fragment, observation digest, and observation-ID replay;
5. K0 provenance, fact ID, fact digest, predicate/value, temporal assertion,
   and evidence-reference replay;
6. collection uniqueness and exact reference resolution;
7. shared-valid-time, relation identity, K0 input-pair, topology, tolerance,
   uncertainty, and unknown-reason replay; and
8. K0 assertion ID and result-digest replay.

A failure at any stage is invalid input and produces no `SpatialRelation`.
Malformed axes, a future coordinate-space ID, out-of-domain or off-resolution
bounds, illegal matrix combinations, digest or ID mismatch, unresolved or
misaligned facts, duplicate IDs, self-relations, and result mismatch MUST NOT
be converted into `unknown`.

## Impossible coordinate and geometry contract

S0 accepts only `axis_aligned_integer_box_v1`. It is not GeoJSON and has no
feature collection, ring, polygon, properties, upload, parser, or provider
representation.

The coordinate space is fixed to the constants above and the integer domain
`[-32, 32]`. `axisOrder` is exactly either
`["synthetic_x", "synthetic_y"]` or
`["synthetic_y", "synthetic_x"]`. A non-null box stores
`minimum: [first, second]` and `maximum: [first, second]` in that declared
storage order. Named-axis normalization resolves the two arrays to
`synthetic_x` and `synthetic_y` before topology.

`resolution` is the exact sampling increment of the source fragment. It is a
safe integer from `1` through `8`, inclusive. Every present named-axis boundary
MUST be divisible by the resolution, and each minimum MUST be strictly less
than its corresponding maximum. Resolution is not uncertainty and does not
silently enlarge tolerance.

For a present geometry, `geometryDigest` is the digest of exactly:

```json
{
  "contractVersion": "1.0.0",
  "coordinateSpaceId": "urn:policy-sentinel:crs:impossible-grid:1.0.0",
  "axes": ["synthetic_x", "synthetic_y"],
  "axisOrder": ["synthetic_x", "synthetic_y"],
  "unit": "impossible_unit",
  "representation": "axis_aligned_integer_box_v1",
  "normalizedBounds": {
    "synthetic_x": { "minimum": -1, "maximum": 1 },
    "synthetic_y": { "minimum": -1, "maximum": 1 }
  },
  "resolution": 1
}
```

The numbers and `axisOrder` shown are placeholders for the validated input;
the keys and shape are literal. The declared storage axis order therefore
changes the geometry digest even when normalized named-axis bounds are equal.
Topology uses only normalized bounds, so storage axis order cannot change a
relation result. Observation identity, fixture metadata, retrieval time,
coverage, uncertainty, and relation tolerance are not geometry-digest inputs.
A supplied mismatch is invalid.

## Synthetic fragment custody and dependency order

Each `SpatialObservation` is backed by one exact, pre-fact synthetic source
fragment. Its logical bytes are the canonical bytes of exactly:

```json
{
  "contractVersion": "1.0.0",
  "experimental": true,
  "synthetic": true,
  "fixtureClass": "impossible_synthetic_geometry",
  "fragmentClass": "spatial_observation",
  "fixtureSlug": "fixture-0001",
  "sourceIdentity": {
    "sourceId": "s0-impossible",
    "sourceRecordId": "s0-impossible:fixture:fixture-0001"
  },
  "layerId": "s0-impossible:layer:fixture-0001",
  "layerVersion": "1.0.0",
  "featureId": "s0-impossible:feature:fixture-0001",
  "coordinateSpace": {
    "id": "urn:policy-sentinel:crs:impossible-grid:1.0.0",
    "axes": ["synthetic_x", "synthetic_y"],
    "axisOrder": ["synthetic_x", "synthetic_y"],
    "unit": "impossible_unit",
    "representation": "axis_aligned_integer_box_v1"
  },
  "geometry": { "minimum": [-1, -1], "maximum": [1, 1] },
  "geometryDigest": "<lowercase-sha256-or-null>",
  "resolution": 1,
  "observedTimeValue": {
    "kind": "date_time",
    "value": "3785-01-01T00:00:00Z"
  },
  "validTimeValue": { "kind": "date", "value": "3785-01-01" },
  "coverage": "complete_fixture_extent",
  "uncertainty": { "state": "certain" },
  "attribution": "Policy Sentinel impossible synthetic fixture",
  "usageBasis": "Repository-authored impossible synthetic fixture; no external source or reuse grant."
}
```

Values shown are placeholders except for fixed constants. Geometry and its
digest are both null when the validity matrix requires absence. The fragment
MUST NOT contain an observation ID or digest, K0 provenance, a fact ID or fact
digest, a fact reference, or a K0 `TemporalAssertion`; those values depend on
the fragment digest and would create a cycle.

The construction dependency graph is frozen:

1. normalize named-axis bounds and compute or validate `geometryDigest`;
2. construct the exact pre-fact fragment above;
3. compute `observationDigest` from its canonical bytes;
4. set `observationId` to
   `s0-impossible:observation:<observationDigest>`;
5. construct and replay the three exact K0 facts below with
   `sourceContentDigest` equal to `observationDigest`;
6. construct the two supported K0 temporal assertions from their exact facts;
   and
7. construct, canonically clone, and recursively freeze the closed observation
   wrapper.

The closed `factManifest` contains exactly:

| Key | K0 predicate | K0 value | `sourcePath` |
| --- | --- | --- | --- |
| `fragmentDigestFact` | `rendition_digest` | `sha256_digest` equal to `observationDigest` | `$` |
| `observedTimeFact` | `observed_time` | exact `observedTimeValue` | `$.observedTimeValue` |
| `validTimeFact` | `valid_time` | exact `validTimeValue` | `$.validTimeValue` |

Every fact has the exact observation `sourceIdentity`; the sentinel URL for
its `fixtureSlug`; year-3785 `retrievedAt`; null `sourceUpdatedAt`; the fixed
adapter ID/version; `sourceContentDigest` equal to `observationDigest`; and
`validationState: "validated"`. Its K0 fact ID is exactly:

```text
k0:fact:<sourceId>:<base64url(sourceRecordId)>:<base64url(sourcePath)>:<predicate>:<observationDigest>
```

Base64url is unpadded RFC 4648 over exact UTF-8. `factDigest` is the K0 digest
of the complete canonical fact excluding only `factDigest`. Source-content,
geometry, observation, and fact digests are distinct concepts even when the
fragment rendition fact intentionally carries the observation digest as its
typed value.

The three provenance objects MUST be identical in every field except their
exact `sourcePath`; in particular, they use the same `retrievedAt`.

`observedTime` is a supported K0 `TemporalAssertion` whose value equals the
observed-time fact and whose evidence contains exactly that fact reference.
`validTime` has the same rule for the valid-time fact. Unsupported temporal
evidence is outside S0 `1.0.0`; it is invalid rather than silently converted to
a value. `observedTimeValue` is exactly a K0 date-time point; it is never a date
or interval. `validTimeValue` may be any valid K0 temporal value. The fragment
digest fact binds coverage, uncertainty, resolution, geometry/null, geometry
digest/null, identity, and both temporal values without inventing a K0 spatial
predicate.

## `SpatialObservation` and its complete validity matrix

`SpatialObservation` is a recursively closed object containing exactly:

- the four S0 markers;
- `observationId` and `observationDigest` as constructed above;
- `fixtureSlug`, exact K0 `sourceIdentity`, `layerId`, `layerVersion`, and
  `featureId`;
- the coordinate-space declaration and declared storage axis order;
- nullable box `geometry` and nullable `geometryDigest`;
- `resolution`;
- supported K0 `observedTime` and `validTime` assertions;
- `coverage` and `uncertainty`;
- exact `attribution` and `usageBasis`; and
- the exact three-entry K0 `factManifest`.

Coverage is one of `complete_fixture_extent`, `partial_fixture_extent`,
`missing_fixture_geometry`, and `unknown`. Observation uncertainty is exactly
`{ state: "certain" }` or
`{ state: "uncertain", reason: <reason> }`, where the reason is one of
`fixture_limitation`, `coverage_limitation`, `coordinate_limitation`, and
`temporal_limitation`. `tolerance_ambiguity` is relation-only and is invalid on
an observation.

The cross-product is closed by this matrix; no omitted combination is valid:

| Coverage | Geometry | Geometry digest | Uncertainty | Relation eligibility |
| --- | --- | --- | --- | --- |
| `complete_fixture_extent` | present and valid | present and exact | `certain` | eligible after pair/time/tolerance checks |
| `complete_fixture_extent` | present and valid | present and exact | `uncertain` with `fixture_limitation`, `coordinate_limitation`, or `temporal_limitation` | valid observation; relation is unknown |
| `partial_fixture_extent` | present and valid | present and exact | `uncertain` with `coverage_limitation` | valid observation; relation is unknown |
| `missing_fixture_geometry` | null | null | `uncertain` with `coverage_limitation` | valid observation; relation is unknown |
| `unknown` | present and valid | present and exact | `uncertain` with `coverage_limitation` | valid observation; relation is unknown |

Resolution remains required and valid from `1` through `8` even when geometry
is null because it describes the declared source-fragment sampling increment.
Geometry and digest must be present together or null together. A present digest
must replay. Complete coverage with null geometry, partial or unknown coverage
with null geometry, missing coverage with present geometry, certain incomplete
coverage, `coverage_limitation` on complete coverage, or any other row is
invalid.

## Shared valid time

Relation derivation computes shared valid time independently of geometry and
records it even when an earlier unknown reason wins. It resolves the two exact
`validTimeFact` references before computation. `SharedValidTime` is this closed
union:

```text
{ state: "overlap", value: <K0 TemporalValue>, factReferences: <two refs> }
{ state: "indeterminate", reason: "mixed_precision", factReferences: <two refs> }
{ state: "disjoint", factReferences: <two refs> }
```

The two references are the sorted unique subject/object valid-time fact
references. Each must resolve to the corresponding observation fact, replay,
use predicate `valid_time`, and equal that observation's supported K0 value.

A point is treated as the same inclusive start and end. For two values of the
same precision:

1. the intersection start is the later non-null start, or the only non-null
   start; it is null only when both starts are null;
2. the intersection end is the earlier non-null end, or the only non-null end;
   it is null only when both ends are null;
3. when compared endpoints are equal, their output inclusivity is logical AND;
4. date endpoints compare lexically; date-time endpoints compare by exact
   represented instant under K0;
5. equal date-time instants with different valid offset lexemes retain the
   lexicographically smaller complete input lexeme, making subject/object order
   irrelevant;
6. a start after an end is disjoint; equal bounds are disjoint if either is
   exclusive and otherwise collapse to a point; and
7. one open output bound remains open. Open bounds are representable and are
   not automatically indeterminate.

Each temporal value has one precision: a point's `kind`, or the `kind` of an
interval's present endpoint; frozen K0 already requires two present interval
endpoints to share a kind. Date and date-time precision are never converted. If
the two values have different precision, the result is
`indeterminate/mixed_precision`. No midnight, offset, retrieval-time,
observed-time, or precision fallback exists.

## `SpatialRelation`: references, K0 seam, and digests

`SpatialRelation` is an outer S0 closed receipt containing exactly:

- the four S0 markers and `relationId`;
- ordered `subject` and `object` observation references;
- `relation`: `intersects`, `contains`, `within`, `touches`, `disjoint`, or
  `unknown`;
- exact `sharedValidTime`;
- exact `algorithm` with ID, version, canonicalization version, tolerance, and
  unit;
- one nested, schema-exact K0 `DerivedAssertion`;
- exact relation `uncertainty` and nullable `unknownReason`; and
- the fixed interpretation.

An observation reference is exactly:

```json
{
  "observationId": "s0-impossible:observation:<sha256>",
  "observationDigest": "<sha256>",
  "geometryDigest": "<sha256-or-null>"
}
```

It must resolve to exactly one validated observation and match all three
fields. Subject and object IDs MUST differ. Distinct observations MAY have the
same geometry digest; equal valid boxes classify as `intersects`. Exact
duplicate collection entries, duplicate stable IDs, or one stable ID paired
with another digest are rejected rather than deduplicated.

The relation-identity preimage is exactly:

```json
{
  "contractVersion": "1.0.0",
  "subject": { "observationId": "<id>", "observationDigest": "<sha256>", "geometryDigest": "<sha256-or-null>" },
  "object": { "observationId": "<id>", "observationDigest": "<sha256>", "geometryDigest": "<sha256-or-null>" },
  "algorithm": {
    "id": "s0-axis-aligned-box-topology",
    "version": "1.0.0",
    "canonicalizationVersion": "ps-c14n-json-1",
    "tolerance": 0,
    "unit": "impossible_unit"
  }
}
```

The subject/object references and tolerance are input values; the other values
are constants. If `R` is its digest:

```text
relationId                   = s0-impossible:relation:<R>
derivedAssertion.assertionId = k0:spatial_relation:<R>
derivedAssertion.assertionClass = spatial_relation
derivedAssertion.ruleId      = s0-axis-aligned-box-topology
derivedAssertion.ruleVersion = 1.0.0
```

Caller subject/object order is never sorted. Reversal therefore creates a
different relation and K0 assertion ID. Reversal maps `contains` to `within`
and `within` to `contains`; `intersects`, `touches`, `disjoint`, and every
unknown reason are symmetric.

The K0 assertion inputs are the exact six facts in the two observation fact
manifests. The six `(factId, factDigest)` pairs are sorted by fact ID; IDs and
digests are emitted as parallel arrays in that pair order. They must be unique,
each fact must replay, and every input must belong to one of the two resolved
observations. Equal fact digests are an invalid collision; digests are never
deduplicated or independently sorted.

Every valid S0 relation, including `relation: "unknown"`, has K0 evidence
`supported` with fact references exactly equal to those six sorted input pairs.
The facts support the deterministic outcome that the geometric predicate is
unknown and why; K0 `unknown` is not used to hide an outer result. The relation
contains no alternate predicate when it is unknown.

The nested assertion fixes `canonicalizationVersion: "ps-c14n-json-1"` and
`validationState: "validated"`. Its `resultDigest` is the digest of the entire
closed `SpatialRelation` after removing only the nested
`derivedAssertion.resultDigest` property. No other field is omitted. A validator
reconstructs that exact preimage and rejects a mismatch.

Collection rules are fail-closed. Observation, relation, and jurisdiction
evidence arrays must be lexically ID-sorted and unique; unsorted input is
rejected by validators and sorted only by explicit collection constructors.
An exact duplicate is still a duplicate error. Reordered object keys or
constructor collection order replay to identical canonical bytes after the
explicit sort. Mutation of an input after construction cannot alter a frozen
result.

## Exact topology and whole-relation tolerance

For normalized boxes, define overlap on each axis as:

```text
min(subject.maximum, object.maximum) - max(subject.minimum, object.minimum)
```

At tolerance zero, classification is exact and mutually exclusive:

1. a negative overlap on either axis is `disjoint`;
2. otherwise, zero overlap on either axis is `touches`, including corner
   contact;
3. with positive overlap on both axes, subject is `contains` exactly when its
   minimum is less than the object's minimum and its maximum is greater than
   the object's maximum on both named axes;
4. the exact four-inequality converse is `within`; and
5. equality and every other positive-area overlap are `intersects`.

`tolerance` is a safe integer from `0` through `2`, inclusive, in
`impossible_unit`. It is independent of resolution. Positive tolerance does
not buffer a box or strengthen a relation.

For one box and tolerance `t`, its admissible whole-box perturbations are all
boxes produced by independently adding an integer delta in `[-t, t]` to each
of its four normalized boundaries, retaining only candidates whose boundaries
remain in `[-32, 32]` and whose minimum remains strictly below its maximum on
both axes. Perturbed boundaries need not remain resolution-aligned; resolution
describes the recorded sample, while tolerance describes the closed
hypothetical uncertainty set. The zero-delta box is always included.

The relation perturbation set is the Cartesian product of all admissible
subject boxes and all admissible object boxes. Classify each complete pair with
the tolerance-zero rules. If every pair has the same class, return that class.
If two or more classes occur, return `unknown/tolerance_ambiguity`. An
optimization is conforming only when tests prove it extensionally equal to this
oracle; evaluation may stop after the second distinct class.

At `t = 2`, one box has at most `5^4 = 625` pre-filter candidates and a
relation has at most `390625` candidate pairs. Arithmetic uses only checked
integer addition, subtraction, comparison, and bounded counters. Candidate
coordinates lie initially in `[-34, 34]` before domain rejection, so no unsafe
integer or doubled-tolerance operation exists. Because the zero perturbation is
included, a singleton classification equals the exact result and tolerance can
never silently produce a stronger different result.

## Unknown results and total precedence

Only validated observations can produce a valid-but-unknown result. Derivation
collects applicable conditions and selects the first exact reason in this total
order, independent of subject/object order or short-circuit implementation:

1. `missing_geometry`;
2. `partial_coverage`;
3. `unknown_coverage`;
4. `observation_uncertain`;
5. `resolution_mismatch`;
6. `valid_time_mixed_precision`;
7. `valid_time_disjoint`; and
8. `tolerance_ambiguity`.

Missing, partial, and unknown coverage are selected when either observation has
that state. `observation_uncertain` applies to any remaining complete but
uncertain observation. `resolution_mismatch` applies when the two valid
resolutions differ. The next two mirror the independently computed
`sharedValidTime`. Tolerance is evaluated only when every earlier condition is
absent.

A determinate result requires `uncertainty: { state: "certain" }` and
`unknownReason: null`. `relation: "unknown"` requires
`uncertainty: { state: "uncertain", reason: <same unknown reason> }` and that
non-null reason. No valid object may disagree across these fields.

Invalid axis order, coordinate-space marker, time value, fact, reference, ID,
or digest is intentionally absent from the unknown-reason vocabulary because
it rejects input before relation evaluation.

## Separately evidenced `JurisdictionEvidence`

`JurisdictionEvidence` is a closed synthetic source-evidence object, never a
spatial result. It has the four S0 markers, a content-derived ID, fixture slug,
source identity, feature ID, administrative-unit ID, exact source label and
statement, statement digest, the fixed source-only semantics, exact
attribution/usage basis, a two-fact K0 manifest, and exact supported evidence.

The source label is exactly:

```text
Policy Sentinel impossible synthetic administrative statement
```

The statement fragment is a synthetic source instrument. Its `sourceLabel` is
the exact title of that instrument and has no jurisdictional, legal, or
lifecycle meaning. Its statement is generated exactly, with no free text, from
its two validated IDs:

```text
Impossible synthetic source statement: <featureId> is assigned to <administrativeUnitId> in this fixture only.
```

The pre-fact statement fragment contains exactly the four S0 markers,
`fragmentClass: "jurisdiction_statement"`, fixture slug, source identity,
feature ID, administrative-unit ID, exact source label, exact statement,
`syntheticLevel: "impossible_administrative_unit"`,
`evidenceBasis: "explicit_synthetic_source_statement"`,
`derivation: "source_citation_only_not_spatial"`,
`reviewState: "validated_synthetic_fixture"`, attribution, and usage basis. It
contains no evidence ID, digest, provenance, fact, observation, or relation.

`statementDigest` is the digest of that exact fragment and
`jurisdictionEvidenceId` is
`s0-impossible:jurisdiction-evidence:<statementDigest>`. The K0 fact manifest is
exactly:

- `titleFact`: predicate `instrument_title`, value equal to the synthetic
  source instrument's truthful exact title in `sourceLabel`, source path
  `$.sourceLabel`; and
- `fragmentDigestFact`: predicate `rendition_digest`, value equal to
  `statementDigest`, source path `$`.

Both facts use the statement source identity, sentinel URL, year-3785
`retrievedAt`, null `sourceUpdatedAt`, fixed adapter, and
`sourceContentDigest` equal to `statementDigest`. The exact supported evidence
references both facts in fact-ID order. K0 supplies custody and exact bytes;
S0, not K0, owns the limited statement interpretation.

The two provenance objects are identical in every field except their exact
`sourcePath`, including the same `retrievedAt`.

Its schema and runtime validator forbid geometry, geometry digests,
observation or relation IDs, PolicyRecord or Nation IDs, relevance,
applicability, legal effect, rights, consent, affiliation, interest,
eligibility, and impact. No function accepts a `SpatialObservation` or
`SpatialRelation` to construct it. Presentation may place it beside spatial
evidence only under the separate heading fixed below.

## Accessible canonical evidence projection

S0 exposes a pure view-model function and a test-only Preact table renderer.
There is no map, canvas, color scale, click handler, interactive descendant,
`tabindex`, telemetry, automatic refresh, application route, or source link.

The view-model input is the recursively closed object
`{ observations, relations, jurisdictionEvidence }`. It accepts at most 64
observations, 64 relations, and 16 jurisdiction-evidence entries; revalidates
and clones each entry; rejects extra keys, duplicate IDs, unresolved
references, and unsorted validator input; and receives no PolicyRecord, Nation,
artifact, source registry, callback, or executable validator. A constructor MAY
accept the same items in arbitrary collection order only to return the exact
ID-sorted closed input.

Document order is exact:

1. heading `Impossible synthetic spatial evidence`;
2. explanation element with ID `s0-spatial-explanation`;
3. spatial table; and
4. heading `Separate administrative/source evidence - not derived from
   geometry`; and
5. jurisdiction table.

Items 4 and 5 are both omitted when the validated jurisdiction-evidence input
array is empty.

The exact explanation is:

> Impossible synthetic geometric relation only. It does not establish
> jurisdiction, Nation association, policy relevance, legal applicability,
> rights, consent, affiliation, interest, eligibility, or impact.

The spatial table caption is `Impossible synthetic spatial evidence`. Every
table has `aria-describedby="s0-spatial-explanation"`. Spatial rows are ordered
by relation ID; subject remains before object. Scoped column headers, in exact
order, are:

1. `Subject feature`;
2. `Object feature`;
3. `Geometric result`;
4. `Shared valid time`;
5. `Coordinate space`;
6. `Axis order`;
7. `Resolution`;
8. `Tolerance`;
9. `Coverage`;
10. `Uncertainty`;
11. `Algorithm`;
12. `Attribution`.

Determinate relation labels are `Intersects`, `Contains`, `Within`, `Touches`,
and `Disjoint`. Unknown result text is exact:

| Reason | Cell text |
| --- | --- |
| `missing_geometry` | `Unknown - missing fixture geometry.` |
| `partial_coverage` | `Unknown - partial fixture coverage.` |
| `unknown_coverage` | `Unknown - fixture coverage is unknown.` |
| `observation_uncertain` | `Unknown - an observation is uncertain.` |
| `resolution_mismatch` | `Unknown - observation resolutions differ.` |
| `valid_time_mixed_precision` | `Unknown - valid-time precision differs.` |
| `valid_time_disjoint` | `Unknown - observations have no shared valid time.` |
| `tolerance_ambiguity` | `Unknown - permitted whole-box perturbations yield more than one relation.` |

The subject and object cells contain their exact feature IDs. The coordinate
space cell contains the exact coordinate-space ID. Axis order renders exactly
`Subject: [<first>, <second>]; object: [<first>, <second>].` Resolution renders
exactly
`Subject: <integer> impossible_unit; object: <integer> impossible_unit.`
Tolerance renders exactly `<integer> impossible_unit`. Coverage renders exactly
`Subject: <coverage>; object: <coverage>.` Uncertainty renders exactly
`Subject: <state-or-state(reason)>; object: <state-or-state(reason)>; relation: <state-or-state(reason)>.`
using the exact enum tokens without localization.

An overlap displays the exact date/date-time lexeme. An interval displays
exactly `<left><start>, <end><right>`, where `<left>`/`<right>` are `[`/`]` for
inclusive or `(`/`)` for exclusive. An open start renders `(-infinity` and an
open end renders `+infinity)`; open endpoints therefore always use the
exclusive delimiter because they have no inclusivity bit. Indeterminate time displays
`No shared valid time - mixed date/date-time precision.` Disjoint time displays
`No shared valid time - disjoint valid times.` Algorithm renders
`s0-axis-aligned-box-topology 1.0.0`. Attribution renders the fixed constant.

The jurisdiction table caption and preceding heading are both exactly
`Separate administrative/source evidence - not derived from geometry`.
Jurisdiction rows are ordered by jurisdiction-evidence ID. Its scoped headers,
in exact order, are `Feature`, `Administrative unit`, `Source label`,
`Exact synthetic statement`, `Evidence basis`, `Review state`, and
`Attribution`.

Both tables use native caption, table, row, and header semantics; every header
has the proper row/column scope. No state is communicated only through color,
position, tooltip, abbreviation, or hidden text.

## Structural non-interference and removability

S0 uses cumulative barriers:

1. Only validators accept `unknown`. Constructors accept closed S0-specific
   inputs. Relation derivation accepts exactly two revalidated observations and
   `{ tolerance }`; jurisdiction construction accepts only its statement
   fields/facts and cannot accept a spatial object by structural duck typing.
2. Experimental schemas and validators are recursively closed. They reject the
   exact recursive protected keys `nationId`, `nationIds`, `officialName`,
   `authorizedAliases`, `recognitionBaselineVersion`, `stateCoverage`,
   `nationAssociations`, `jurisdiction`, `issuingBodies`, `officialSubjects`,
   `taxonomyMemberships`, `relevance`, `landmark`, `legalEffect`,
   `legalApplicability`, `rights`, `consent`, `affiliation`, `interest`,
   `eligibility`, and `impact`, wherever injected.
3. Before/after tests digest the complete Nation collection root and, relative
   to each Nation object, these diagnostic pointers: `/id`, `/officialName`,
   `/authorizedAliases`, `/recognitionBaselineVersion`, and `/stateCoverage`.
4. Before/after tests digest the complete PolicyRecord collection root and,
   relative to each PolicyRecord object, these diagnostic pointers:
   `/internalId`, `/source`, `/documentType`, `/jurisdiction`, `/issuingBodies`, `/officialSubjects`,
   `/taxonomyMemberships`, `/relevance`, `/nationAssociations`, `/landmark`,
   `/status`, `/dates`, `/fieldProvenance`, and
   `/sourceDocumentRelationships`. Root equality remains the acceptance rule;
   pointer digests are diagnostics, not a weaker substitute.
5. The unchanged PolicyRecord `1.4.0` schema rejects attempted root properties
   `spatialObservation`, `spatialRelation`, and `jurisdictionEvidence`.
6. S0 modules may import only local S0 modules, the frozen
   `src/kernel/assertions/index.ts` public seam, and `preact` in the test-only
   renderer. They may not import `src/app`, `src/shared/contracts.ts`,
   `src/pipeline`, `src/adapters`, `src/contracts`, or
   `src/kernel/lifecycle`. No production barrel, application entry, route,
   pipeline, artifact builder, record policy, source registry, Nation module,
   or K0 lifecycle module may import or export S0.
7. Existing artifact inventory validation MUST reject injected exact paths
   `dist/data/spatial.json` and `dist/data/experimental/spatial.json` as
   unmanifested. The built tree MUST contain neither a path segment
   `experimental` or `spatial` nor the markers `s0-impossible:`,
   `impossible_synthetic_geometry`, or `s0-axis-aligned-box-topology`.
8. No S0 asset, manifest entry, source-map content, route, or dynamic import is
   emitted. The production browser graph remains identical.

The removal proof deletes only the S0 schema/source/fixture/test paths and their
additive foundation-registration entries, reruns `npm run check`, and compares
the sorted relative-path/SHA-256 inventory of two fixed-time `dist/` builds
before and after removal. Every path and hash MUST be identical. No current
product file may require a compensating edit.

## File and dependency boundary for the later implementation session

The later S0 implementation is limited to:

- `schemas/experimental/spatial-observation.schema.v1.json`;
- `schemas/experimental/spatial-relation.schema.v1.json`;
- `schemas/experimental/jurisdiction-evidence.schema.v1.json`;
- `src/experimental/spatial/*`;
- `fixtures/experimental/spatial/*`;
- `tests/experimental/spatial/*`; and
- additive foundation validation and binding review evidence.

It MUST NOT modify `package.json`, a lockfile, current record or artifact
schema, application entry or routes, artifact construction, policy validation,
source registry, adapters, Nation contracts, K0 `1.0.0`, or release
dependencies. Existing Ajv, Vitest, Preact, and deterministic finite
enumeration are sufficient; no GIS or property-testing dependency is allowed.

## Bounded required tests

The implementation acceptance suite includes:

- strict schema/runtime structural parity for every JSON-Schema-expressible
  constraint, plus runtime-only semantic invariants and replay; representative,
  missing, malformed, prototype, extra-key, namespace, URL, year,
  negative-zero, semantic fixture-slug, and layer-version prerelease/build
  rejection cases;
- fact-custody DAG, K0 fact ID/digest, temporal fact/reference, observation ID,
  geometry digest, relation ID, assertion ID, input-pair alignment,
  result-digest, mismatch, duplicate, collision, immutable-input, and replay
  tests;
- every row and every invalid near-miss in the observation validity matrix;
- point/interval, open-bound, exclusive-touch, equal-instant/different-offset,
  mixed-precision, and disjoint shared-valid-time cases;
- exact topology, equality, edge/corner touch, strict containment, axis-order,
  resolution mismatch, and whole-relation tolerance cases;
- every unknown-reason combination with the fixed total precedence;
- exact accessibility labels/order/captions/scopes/explanation association,
  empty-jurisdiction behavior, no interaction, and no color-only meaning;
- separate jurisdiction fact custody and constructor rejection of observations
  and relations; and
- schema, import, constructor, record, artifact, bundle, protected-key,
  protected-pointer, build-marker, and removal non-interference barriers.

Property work is deterministic and bounded:

- exact topology enumerates at resolution `1` the 100 normalized boxes whose
  boundaries are selected from `[-2, -1, 0, 1, 2]`, all 10,000 ordered box
  pairs, and all four subject/object storage-axis-order pairs: exactly 40,000
  classifications;
- the positive-tolerance oracle uses at most 64 fixed, named relation cases and
  at most 390,625 streamed candidate-pair classifications per case, stopping
  after a second class when possible, for an absolute ceiling of 25,000,000
  candidate-pair classifications;
- full-domain `-32`/`32`, resolutions `1`/`8`, translations, and scale factors
  `1`/`2` use at most 256 fixed cases and run only when transformed coordinates,
  resolution, and tolerance remain within contract bounds; and
- no test forms the full-domain box Cartesian product, uses randomness or an
  unrecorded seed, or adds a property-test dependency.

Symmetry, contains/within duality, exact `t = 0`, translation/scale behavior,
exclusivity, axis-order invariance of topology, and tolerance non-strengthening
are asserted over those bounded sets.

## Threat model and stop conditions

The principal misuse is converting geometric coincidence into authority,
association, applicability, relevance, rights, or impact. Concrete attacks are
forged IDs or digests; swapped axes; duplicate or unresolved references;
equal-geometry endpoint confusion; coverage laundering into disjointness;
date-to-midnight coercion; open-bound loss; tolerance overflow or exhaustion;
geometry-to-statement laundering; free-text or real-name smuggling; prototype
or protected-key injection; a duck-typed constructor bypass; hidden unknown or
disclaimer text; and import, artifact, source-map, or route leakage. Exact
custody, closed schemas, ordered replay, the validity matrix, total unknown
precedence, bounded whole-box perturbation, fixed text projection, independent
source-statement evidence, and cumulative non-interference barriers reject or
contain each attack.

Stop for owner review rather than changing this contract if implementation
requires changing frozen K0 `1.0.0`; a real coordinate, source, administrative
or natural boundary; private, land-related, Nation-supplied or user-supplied
data; upload or File API; browser persistence; fetch; provider; credential; GIS
or map dependency; backend; database; service; public artifact path;
application route; telemetry; remote operation; publication; or K0/S0
convergence with the existing release.

Also stop if geometry would filter a policy, construct or change a Nation
association, populate official jurisdiction, infer source or policy relevance,
make an applicability/impact statement, weaken provenance or ambiguity, or
change any current gate, evidence root, accepted fallback, or release scope.
