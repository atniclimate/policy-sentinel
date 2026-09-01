# S0 Phase 1 contract-to-code traceability

Date: 2026-09-01

Disposition: Phase 1 PASS. The frozen S0 contract is implementable through the
frozen K0 public assertion seam without a contract or K0 change. This report is
the required pre-implementation matrix; it records intended enforcement and
test ownership, not completion evidence.

Frozen contract: `docs/vision/s0-spatial-contract.md`, version `1.0.0`, 41,506
bytes, SHA-256
`ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`.

## Frozen file ownership

Only the coordinator integrates shared or overlapping work.

| Owner | Exclusive paths |
| --- | --- |
| Coordinator/shared integration | `src/experimental/spatial/constants.ts`, `src/experimental/spatial/types.ts`, `src/experimental/spatial/validation.ts`, shared test helpers, S0 reports/reviews, additive foundation registration integration, roadmap evidence |
| Schema/runtime-parity reviewer | the three authorized `schemas/experimental/*.schema.v1.json` files and `tests/experimental/spatial/schema-runtime-*.test.ts` |
| Observation/K0-custody implementer | `src/experimental/spatial/observation.ts`, `fixtures/experimental/spatial/observation-*`, `tests/experimental/spatial/observation-custody.test.ts` |
| Temporal/topology/tolerance implementer | `src/experimental/spatial/temporal.ts`, `topology.ts`, `relation.ts`, relation/topology fixtures, and `tests/experimental/spatial/{temporal,topology,relation,tolerance-bounded}.test.ts` |
| Jurisdiction/accessibility implementer | `src/experimental/spatial/jurisdiction-evidence.ts`, `evidence-view.ts`, jurisdiction/view fixtures, the test-only Preact renderer, and jurisdiction/accessibility tests |
| Non-interference/removal reviewer | read-only review plus coordinator-integrated tests under `tests/experimental/spatial/non-interference*.test.ts`; the isolated removal proof is run by the coordinator |
| Final adversarial auditor | read-only final audit and `docs/vision/reviews/s0-implementation-audit-2026-09-01.md` findings supplied to the coordinator |

No production barrel is planned. Every S0 source module may import only another
local S0 module or `src/kernel/assertions/index.ts`; only the test renderer may
also import `preact`.

Every proposed implementation file is within the owner-authorized boundary:
the three experimental schemas, `src/experimental/spatial/*`,
`fixtures/experimental/spatial/*`, `tests/experimental/spatial/*`, the smallest
additive blocks in `scripts/validate-foundation.mjs`, S0 reports/review evidence,
and S0-only roadmap evidence.

## Normative clause matrix

The clause IDs below cover every normative section and frozen literal rule in
contract order. “Schema” means JSON-Schema-expressible structure. “Runtime” also
includes construction, derivation, replay, and projection behavior.

| Clause | Contract lines | Schema enforcement | Runtime/construction enforcement | Fixture and positive evidence | Negative/adversarial evidence |
| --- | --- | --- | --- | --- | --- |
| `S0-C01` Authority and synthetic-only boundary | 3-9 | Markers/constants admit only impossible synthetic objects | No network, provider, real data, GIS, map, upload, persistence, integration, or publication surface | All fixtures use year 3785 and impossible namespaces | Source/import scans reject network and real/GIS/product vocabulary |
| `S0-C02` Versioned conformance | 13-25 | `contractVersion` is exactly `1.0.0`; strict closed schemas | Runtime validators, constructors, derivation, projection, and tests all replay the contract; types are never treated as validation | Schema-created representatives pass runtime | Type casts, future versions, extra keys, and scaffold-only objects fail |
| `S0-C03` Frozen K0 seam and vocabulary | 27-42 | K0 facts, evidence, temporal assertions, provenance, and derived assertion use refs to assertion schema `1.0.0` | Imports only the public assertion seam; uses literal `rendition_digest`, `observed_time`, and `valid_time`; creates no parallel vocabulary | Exact K0 facts and supported evidence validate | Lifecycle imports, new predicate/state/time/provenance shapes, and semantic relabeling fail scans/tests |
| `S0-C04` Isolation and removability | 44-48 | Experimental schema IDs only | No application, artifact, record, source, Nation, or lifecycle consumer | Production graph and fixed-time build inventory remain unchanged | Reverse-import, bundle-marker, artifact-path, and removal proofs |
| `S0-C05` Top-level markers and fixed constants | 50-75 | Exact marker and constant `const` values on only the three domain roots | Shared constants are derived, not caller supplied | Representative observation, relation, and jurisdiction fixtures | Marker/constant mutation and nested-marker injection fail |
| `S0-C06` Slug, identity, namespaces, and sentinel URL | 77-102 | Anchored numeric slug, exact derived-ID grammars, numeric SemVer, and sole sentinel URL grammar | One slug must agree across source record, layer, feature, admin unit, URL, and generated text; URL is never resolved | `fixture-0001` family fixture | Alphabetic/semantic slug, mismatch, port, credentials, query, fragment, percent encoding, host/path, real name/ID/URL fail |
| `S0-C07` Year 3785 and temporal separation | 104-108 | Every S0 temporal lexeme refines K0 to year 3785; `sourceUpdatedAt` is null | Retrieval, observation, and validity remain distinct and may differ; no fallback/substitution | Unequal retrieved/observed/valid fixture values | Other-year, non-null update, or substituted times fail |
| `S0-C08` Canonical JSON rejection boundary | 110-118 | JSON structures and number types/ranges | K0 `assertJsonValue`, canonical digest, and immutable canonical clone reject non-JSON values and recursively freeze detached results | Reordered object keys replay identically | Prototype, cycle, accessor, non-enumerable, symbol, sparse/extended array, non-finite/unsafe number, and negative zero fail |
| `S0-C09` Set-like ordering | 119-132 | Cardinality and `uniqueItems` where expressible | Explicit Unicode-code-point sorting of fact refs/pairs and stable-ID collections; fact ID/digest pairs remain inseparable; subject/object and axis coordinate order remain semantic | Arbitrary constructor collection order returns canonical ID order | Unsorted validator input, duplicates, independently sorted digests, and endpoint sorting fail |
| `S0-C10` Eight-stage fail-closed validation | 134-153 | Structural stages 1-2 | Validators execute stages 1-8 in order; any failure produces no relation and never becomes unknown | Ordered replay of valid fixtures | Combined corruptions prove matrix before geometry replay, geometry before observation replay, facts before references/topology, and result replay last |
| `S0-C11` Sole geometry representation | 155-159 | Only `axis_aligned_integer_box_v1`, closed box shape, no properties | No GeoJSON/parser/provider representation exists | Integer-box fixtures | GeoJSON, feature collection, polygon/ring/properties/upload shapes fail |
| `S0-C12` Coordinate domain and named axes | 161-167 | Domain `[-32,32]`, fixed axes, exactly two storage orders, two-item arrays | Normalize stored coordinates to named x/y axes before topology | Both storage orders for equal named bounds | Unknown/duplicate/reversed canonical axes, wrong tuple length, off-domain values fail |
| `S0-C13` Resolution and valid bounds | 169-173 | Safe integer resolution `1..8`; resolution-conditioned multiples where encoded | All present boundaries divide by resolution; named minima are strictly less than maxima | Resolution 1 and 8 boundary cases | Fractional/unsafe/0/9 resolution, off-lattice, equal/reversed bounds fail |
| `S0-C14` Geometry digest | 175-199 | Present geometry/digest pair and lowercase digest grammar | Digest literal preimage including declared axis order and normalized bounds; replay before observation replay; topology ignores storage order | Pinned digest and equal-normalized/different-axis-order fixtures | Supplied mismatch and omitted/extra preimage-field attacks fail |
| `S0-C15` Exact pre-fact observation fragment | 201-247 | Wrapper fields specialize the values required to reconstruct the fragment | Constructs exact literal fragment with geometry/null and no cyclic observation/fact/provenance/assertion fields | Pinned fragment canonical bytes/digest | Cycle-field and fragment-shape injection fail |
| `S0-C16` Observation dependency DAG | 249-261 | Output has derived fields in closed locations | Normalize/digest geometry, fragment/digest, ID, three facts, two assertions, wrapper clone/freeze in exact order | Constructor replay test | Caller-supplied derived field and reordered/cyclic construction attacks fail |
| `S0-C17` Exact three-fact manifest and provenance | 263-287 | Exact manifest keys; specialized K0 predicates, value kinds, paths, provenance constants | Uses K0 `createSourceFact`; exact identity/URL/retrieved time/content digest; provenance objects equal except path | Pinned three fact IDs/digests and K0 schema acceptance | Wrong predicate/value/path/identity/URL/time/adapter/content/fact ID/digest or provenance divergence fails |
| `S0-C18` Supported observation times | 289-297 | Supported assertions only; observed value is date-time; valid value is any K0 temporal value; one reference each | Assertion value equals fact value and exact fact reference; unsupported evidence rejected | Date, date-time, closed/open interval valid-time cases | Unsupported/multiple/wrong references and value drift fail |
| `S0-C19` Closed `SpatialObservation` | 301-313 | Exact recursively closed wrapper | Revalidate, canonical-clone, recursively freeze | Representative wrapper fixture | Missing/extra/protected field at every depth fails |
| `S0-C20` Coverage and observation uncertainty | 315-321 | Exact coverage/reason enums; no observation `tolerance_ambiguity` | Closed union validation | Complete/partial/missing/unknown fixture variants | Unknown token and relation-only reason fail |
| `S0-C21` Complete observation validity matrix | 323-339 | Seven explicit valid branches cover every listed row | Same matrix enforced before digest replay | All seven combinations pass | Every stated near miss and omitted cross-product combination fails |
| `S0-C22` Shared-valid-time union and custody | 341-357 | Exact overlap/indeterminate/disjoint union; two refs | Resolve both exact valid-time facts, replay them, require equality, sort unique refs, compute regardless of earlier unknown reason | Shared-time representative cases | Wrong/unresolved/duplicate reference or fact mismatch fails |
| `S0-C23` Temporal intersection | 358-381 | Year-3785 K0 temporal output shapes | Same-precision intersection, AND inclusivity, lexical date compare, exact-instant date-time compare, lexical-minimum equal-instant lexeme, open bounds, disjoint/equal collapse, no precision conversion | Points, intervals, open, inclusive/exclusive, offset-equivalent cases | Midnight/retrieval/observed/precision fallback and open-bound loss fail |
| `S0-C24` Closed relation and observation references | 383-412 | Exact outer fields, relation enum, and three-field observation refs | Resolve each ref exactly once; match three fields; reject self, duplicate IDs, digest collision; equal geometry remains valid | Same-geometry distinct observations classify intersects | Unknown/misaligned/duplicate/self references fail |
| `S0-C25` Relation identity and direction | 414-445 | Exact algorithm object and ID grammars | Digest literal ordered identity preimage; derive relation/assertion IDs; never sort endpoints; implement only declared reversal symmetry/duality | Reversal and tolerance identity tests | Endpoint sorting or wrong symmetric mapping fails |
| `S0-C26` Exact six-fact K0 alignment | 447-458 | Six input IDs/digests and six supported references | Replay all facts; create six unique inseparable pairs; sort by fact ID; require ownership by the two observations and evidence exactly equal all inputs | Exact assertion fixture | Missing/extra/subset/third-observation fact, independent digest sorting, duplicate digest collision fail |
| `S0-C27` Assertion/result digest and collections | 460-472 | Specialized exact K0 derived assertion and stable-ID collection shapes | Result digest removes only nested `resultDigest`; exact replay; validator collections are sorted/unique, constructors sort; inputs cannot mutate results | Pinned result digest and key-order replay | Any-field tamper, additional omission, unsorted/duplicate collection, post-construction mutation fail |
| `S0-C28` Exact zero-tolerance topology | 474-491 | Determinate relation enum | Negative overlap, then zero touch, then strict four-bound contains/within, else intersects; mutually exclusive | Equality, area overlap, edge/corner touch, strict containment | Non-strict containment, rule reorder, axis leakage fail |
| `S0-C29` Whole-relation tolerance | 493-518 | Safe integer tolerance `0..2` and fixed unit | Stream all admissible four-boundary whole-box perturbation pairs, retain domain/order-valid candidates, allow off-resolution coordinates, include zero delta, stop only on second class | Named stable and ambiguous tolerance cases | Buffering, boundary-pair heuristic, resolution filtering, overflow/exhaustion, strengthening fail |
| `S0-C30` Total unknown precedence and consistency | 520-549 | Eight explicit unknown branches tie relation, uncertainty, reason, shared-time/null-digest implications; determinate branch is certain/null | Collect all applicable states, select fixed precedence, evaluate tolerance last; malformed input rejects | Each reason alone and competing-reason cases | Coverage laundering, short-circuit shared-time omission, field disagreement, invalid-as-unknown fail |
| `S0-C31` Separate jurisdiction statement | 551-581 | Closed fields and exact label/generated statement/source-only semantic constants | Generate statement from validated feature/admin IDs; construct exact pre-fact fragment with no spatial inputs | Representative statement fixture | Free text, modified title/statement/semantics, spatial field injection fail |
| `S0-C32` Jurisdiction digest, ID, facts, and evidence | 583-601 | Exact ID/digest, two specialized facts, two supported refs | Digest exact fragment, derive ID, create/replay title and rendition facts, exact evidence and provenance equality | Pinned statement/fact/evidence replay | Wrong path/predicate/value/digest/reference/provenance fails |
| `S0-C33` Jurisdiction constructor isolation | 603-608 | Extra/protected/spatial semantic fields closed | Constructor accepts only statement-specific input and never an observation/relation; geometry cannot substantiate evidence | Direct statement construction | Observation/relation duck typing and forbidden semantic fields fail |
| `S0-C34` Bounded closed view input | 610-623 | Domain schemas revalidate entries; no fourth schema | Exact wrapper keys; max 64/64/16; reject unsorted/duplicate/unresolved; constructor sorts and returns closed input; pure projection only | Sorted representative view | Extra key, over-limit, unresolved, unsorted, callback/record/Nation/artifact/source input fail |
| `S0-C35` Document order, explanation, empty jurisdiction | 625-642 | N/A | Fixed view-model strings/order and renderer DOM order; jointly omit jurisdiction heading/table when empty | Empty/non-empty renderer fixtures | Missing/reordered/hidden disclaimer or orphan jurisdiction heading/table fails |
| `S0-C36` Spatial table semantics and columns | 643-659 | N/A | Caption, `aria-describedby`, relation-ID row order, subject/object order, and twelve exact scoped headers | Exact snapshot/DOM assertions | Header/caption/order/scope/association mutation fails |
| `S0-C37` Relation labels and unknown text | 661-673 | N/A | Fixed determinate labels and eight exact unknown sentences | All result labels | Alternate, abbreviated, hidden, or missing unknown text fails |
| `S0-C38` Spatial cell and time rendering | 675-692 | N/A | Exact feature/CRS/axis/resolution/tolerance/coverage/uncertainty/algorithm/attribution strings; point/interval/open/mixed/disjoint time rules | Every temporal/uncertainty form | Localization, wrong delimiter, infinity, unit, order, or fallback fails |
| `S0-C39` Jurisdiction table and native semantics | 694-703 | N/A | Exact heading/caption, seven scoped headers, ID row order, native table/caption/row/header elements; no color-only meaning | DOM and accessibility assertions | Link/control/tooltip/hidden/color-only substitute fails |
| `S0-C40` Constructor and recursive protected-key barriers | 707-719 | Recursive closed schemas and protected-key guard | Only validators take `unknown`; closed constructor inputs; recursive protected-key scan | Clean constructors | Each of the exact 21 protected keys at root/nested K0/S0/array object depths fails |
| `S0-C41` Nation and PolicyRecord digest barriers | 720-729 | N/A | Digest complete baseline roots before/after and exact diagnostic pointers per object; roots are acceptance | Unchanged synthetic baseline collections | Any root/pointer mutation fails with diagnostics |
| `S0-C42` Record and import boundaries | 730-738 | Existing unchanged PolicyRecord schema remains closed | Prove three root spatial properties rejected; static imports allow only local S0/public K0/preact-test and no reverse production import/export | Allowed import graph | Lifecycle/app/shared/pipeline/adapter/contract/production-barrel imports or record fields fail |
| `S0-C43` Artifact, marker, and browser-graph barriers | 739-745 | Existing artifact inventory remains unchanged | Injected exact paths reject as unmanifested; dist path segments and markers absent; no route/asset/manifest/source map/dynamic import | Clean fixed-time build inventory | Exact injected paths, forbidden path segments/markers, bundle imports fail |
| `S0-C44` Exact removal proof | 747-751 | N/A | In a recoverable isolated worktree, remove only S0 paths and restore only additive foundation registration; rerun check; compare sorted fixed-time dist relative-path/SHA-256 inventories byte-for-byte | Before/after inventory equality | Any path/hash delta or compensating product edit fails proof |
| `S0-C45` File/dependency boundary | 753-769 | Only three new schemas | Diff allowlist; package/lock/current schemas/app/pipeline/source/Nation/K0/release hashes unchanged; no new GIS/property dependency | Final diff/dependency audit | Out-of-scope path or dependency drift triggers stop |
| `S0-C46` Required bounded acceptance tests | 771-795 | Schema/runtime parity for expressible constraints | Separate semantic/replay, custody, matrix, temporal, topology, unknown, jurisdiction, accessibility, and non-interference suites | Targeted suite sequence | Every listed malformed/adversarial family has a named regression |
| `S0-C47` Deterministic property ceilings | 797-815 | N/A | Exactly 40,000 zero-tolerance classifications; at most 64 named tolerance cases, 390,625 pairs/case, 25,000,000 total; at most 256 valid transforms; no randomness/full-domain product | Counters and symmetry/duality/exclusivity/transform invariants | Ceiling, seed/randomness, full-domain, and non-strengthening guards fail |
| `S0-C48` Threat model and stop conditions | 817-843 | Closed vocabularies exclude attack fields | Tests bind every named attack to a fail-closed control; coordinator stops on any prohibited capability or semantic/integration drift | Final cooperative/adversarial PASS | Forgery, axis/reference/time/coverage/tolerance/constructor/a11y/import/artifact attacks and all owner stop conditions are audited |

## Reconstructed review finding coverage

| Finding | Frozen enforcement and evidence route |
| --- | --- |
| `S0-R01` | `S0-C17`, `C26`, and `C27`: exact K0 facts, aligned six-pair assertion inputs/evidence, and outer result replay; substitution counterexamples in custody/relation tests. |
| `S0-R02` | `S0-C03`, `C06`, `C15`, `C17`, and `C32`: sole lexical sentinel URL, pre-fact renditions, and truthful rendition/time/title custody; network-symbol/import scans. |
| `S0-R03` | `S0-C08`-`C10`, `C14`-`C17`, and `C24`-`C27`: literal preimages, DAG, stable IDs, direction, duplicate/collision/mismatch/reference/result replay. |
| `S0-R04` | `S0-C22`-`C23`: closed shared-time union and total fact-bound intersection including offsets/open/exclusive/mixed/disjoint cases. |
| `S0-R05` | `S0-C10`-`C13` and `C20`-`C21`: complete matrix, lattice semantics, and invalid-before-unknown boundary. |
| `S0-R06` | `S0-C29` and `C47`: bounded complete whole-box Cartesian oracle, safe counters, zero inclusion, and heuristic/buffering counterexamples. |
| `S0-R07` | `S0-C34`-`C44`: bounded closed view, exact accessible output, constructors, protected data, imports, records, artifacts, browser graph, and removal. |
| `S0-R08` | `S0-C05`-`C07`, `C17`, and `C38`: exact attribution/usage basis, year 3785, null update, distinct time semantics, and presentation. |
| `S0-R09` | `S0-C47`: exact deterministic enumeration budgets and explicit prohibition of randomness/full-domain products. |
| `S0-R10` | `S0-C48` plus adversarial cases attached to every matrix row. |
| `S0-R11` | `S0-C06` and `C15`: one slug derives and replays source record, layer, feature, URL, and fragment. |
| `S0-R12` | `S0-C41`: complete roots are acceptance digests; real per-object PolicyRecord `/documentType` and all exact pointers are diagnostics. |
| `S0-R13` | `S0-C35` and `C39`: jurisdiction heading and table are exact items four/five and jointly omitted when empty. |
| `S0-R14` | `S0-C31`-`C33`: source label is the exact synthetic instrument title; the K0 title fact supplies custody only, with source-only S0 semantics. |
| `S0-R15` | `S0-C23` and `C38`: null endpoints preserved; open start/end render with fixed exclusive delimiters. |
| `S0-R16` | `S0-C06`: exact four-digit numeric slug and semantic/alphabetic negative cases. |
| `S0-R17` | `S0-C02`, `C08`, `C46`: parity is asserted only for schema-expressible structure; semantic/replay and non-JSON runtime invariants are separately tested. |
| `S0-R18` | `S0-C06`: numeric-only three-component layer SemVer and prerelease/build/leading-zero negatives. |
| `S0-R19` | `S0-C05`: markers occur on only the three top-level domain roots; nested K0/S0 marker injection fails closure. |

## Schema-expressible versus runtime-only freeze

Schema-expressible invariants are: JSON types; exact required keys; recursive
closure; top-level markers; constants; enums; finite union consistency;
identifier, digest, slug, URL, year, and numeric-only SemVer grammars; fixed
array lengths/orders; integer ranges; resolution-conditioned multiples;
geometry/digest nullability; the complete observation matrix; specialized K0
fact predicates/value kinds/paths/provenance constants; manifest/evidence/input
cardinalities; shared-time variants; relation/uncertainty/reason finite
agreement; algorithm/interpretation; jurisdiction statement/title/source-only
constants; and recursive protected property names on ordinary JSON objects.

Runtime-only invariants are: plain prototypes and the full non-JSON rejection
surface; cross-field slug/ID/URL/statement equality; named-axis normalization;
strict minima; digest and stable-ID replay; exact K0 fact/provenance/value/
reference custody; identical provenance except source path; lexical sortedness
and stable-ID uniqueness; exact temporal intersection; reference resolution and
subject/object inequality; six inseparable input pairs and exact evidence;
topology; perturbation streaming/counters; total unknown precedence;
constructor isolation; canonical cloning/freezing/non-mutation; view bounds and
presentation; import/record/artifact/browser barriers; and the removal proof.

Parity tests compare schemas to a structural runtime layer only. A structurally
valid object with a well-formed but incorrect digest is intentionally
schema-valid and full-runtime-invalid; semantic and replay checks therefore have
their own adversarial layer.

## Removal-proof design frozen before implementation

The coordinator will create an isolated detached Git worktree at the focused S0
implementation checkpoint and link only the already-installed local
`node_modules` directory. Before creating that link, the resolved main-worktree
root, resolved dependency target, and proposed sibling proof-worktree root are
frozen and checked: both source paths must exist, the proof root must not exist,
and the proof root must be neither the repository root nor inside it. The link
path must initially be absent. After creating the Windows junction, its reparse
type and resolved target must exactly equal the frozen main-worktree
`node_modules`; an ordinary directory, symbolic link, or different target
fails the proof before any removal. A baseline `npm run check` and fixed-time
build will be inventoried in memory. In that isolated worktree only, `git rm`
will remove the three S0 schema files and the complete experimental S0 source,
fixture, and test directories; `scripts/validate-foundation.mjs` will be
restored from the implementation commit's parent, which is required to differ
only by the additive S0 registrations. S0 reports remain.

The reduced tree must pass `npm run check`. A second build will then be
normalized with the committed artifact builder's `--generated-at` option using
the same fixed year-3785 timestamp. Sorted relative-path/SHA-256 inventories of
the complete `dist/` trees must be identical. The proof fails on any extra
change, check failure, path delta, or hash delta. The isolated worktree is
recoverable from its checkpoint and is removed only after its absolute path is
reverified; no main-worktree S0 content is deleted or moved.

Cleanup is a separate fail-closed step. After leaving the proof worktree as the
process working directory, the coordinator must reverify the exact junction
path, reparse type, and frozen target; unlink only that junction
nonrecursively; verify that the link is absent and the shared dependency target
still exists; and only then ask Git to remove the already-verified worktree.
Generic recursive filesystem cleanup is forbidden while the junction exists.
Any target drift, failed unlink, or remaining reparse point stops cleanup for
owner review instead of traversing or deleting shared dependency state.

## Phase 1 review disposition

Three independent read-only reviews covered schema/runtime parity,
observation/K0 custody, and temporal/topology/tolerance. Each independently
verified the authorized starting state, read the complete frozen contract and
review, inspected the K0 public seam, made no mutation or network/dependency
operation, and found no high- or medium-severity ambiguity or frozen-contract
defect. Implementation may proceed under this matrix.
