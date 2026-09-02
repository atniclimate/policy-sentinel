# PNW-03 geography and rights coordination ledger

Status: complete local coordination ledger for the exact owner-authorized
synthetic PNW-03 tranche. It grants no source, real-geography, private-data,
convergence, remote, publication, or successor authority.

## Frozen design decision

PNW-03 adds a separate closed `GeographyRightsBundle 1.0.0` beside the unchanged
PNW-01 `ProjectionProfileBundle 1.0.0`. Exact versioned references bind the new
catalog to PNW-01 bundle, region, deployment, persona, output, and authority
seams. The new runtime validates the complete graph atomically before emitting a
detached, recursively frozen, deterministic single-context projection.

Geographic relations and rights frames remain governed objects outside
`PolicyRecord`. Observed and effective time use explicit known, open, or unknown
bounds. Authority roles, evidence, review, custody/derivation, visibility, and
sensitivity remain distinct. Geometry is optional and opaque; no coordinates,
bounds, centroids, digests, tiles, counts, or format-specific payloads are
admissible. Mixed inputs restrict the whole object to their most restrictive
class, and an invalid visibility downgrade rejects. A public projection returns
only authorized relation/frame references and a non-comprehensive disclosure
state; it exposes no geometry reference, withheld identifier, withheld count,
or absence claim.

The exact six PNW-01 non-claims remain unchanged. PNW-03 adds closed allowed- and
forbidden-inference vocabularies; no relation or frame can establish identity,
membership, ownership, land status, jurisdiction, legal applicability, rights
impact, consultation, consent, eligibility, urgency, remedy, outcome, or
community position.

## Predeclared acceptance and failure behavior

- Positive strata: multiple relation kinds in one fictional deployment;
  distinct service/co-management configuration in another; optional geometry
  and frames; known/open/unknown temporal bounds; supersession; public and
  exactly authorized restricted projections.
- Schema failures: missing/unknown fields; malformed identities, versions,
  dates, citations, classifications, non-claims, inference tokens; geometry or
  legal-claim payload injection.
- Semantic failures: duplicate or wrong-kind identities; dangling, cross-version,
  cross-deployment, cross-region, or cross-persona references; authority-role
  substitution; temporal inversion/cycles; inference overlap; mixed-evidence or
  geometry restriction downgrade.
- Projection failures: unauthorized persona/output/visibility, cross-deployment
  selection, and any attempted visibility escalation. Failure is atomic and
  errors expose only stable codes and structural paths.
- Compatibility: PNW-01 schema, runtime, fixture bytes, projections, and
  `PolicyRecord 1.4` facts remain unchanged; K0/S0/O0 stay unimported.
- Determinism: every set-like collection is sorted, outputs are canonical and
  recursively frozen, input order does not affect bytes, and repeated fixed
  inputs yield identical hashes.
- Fixture realism barrier: only obvious fictional `synthetic-*` identities,
  `.invalid` citations, impossible places, and opaque non-coordinate references;
  no real community, authority, geography, law, treaty, membership, or private
  data.

## Exact path and ownership ledger

| Agent | Read paths / assignment | Prohibited paths | Write lease / expected output | Dependency | Status / validation owed |
| --- | --- | --- | --- | --- | --- |
| 1 repository verifier | Git, roadmap, hooks, skills, handoffs, schemas, generated boundaries | all writes, network, remotes | none; starting-state and path report | none | complete; findings accepted |
| 2 spatial reviewer | S0 contracts/types/reviews and PNW seams | S0/K0/O0 edits or imports, GIS work | none; compatibility report | none | PASS; both findings closed; no GIS, S0 coupling, payload leak, or universal-geography defect found |
| 3 sovereignty reviewer | authority, evidence, privacy, visibility, non-claims | implementation writes, real identities/data | none; finite adversarial register | none | PASS; all five findings closed; bounded A01-A24 rescan found no new material defect |
| 4 schema/runtime | PNW-01 schema/runtime and versioning | tests, fixtures, roadmap, docs, shared/protected contracts | `schemas/geography-rights.schema.v1.json`; `src/engine/geography-rights-contracts.ts`; `src/engine/geography-rights.ts`; `src/engine/index.ts` | frozen design | Complete; both finite repair rounds closed and Agent 6 approved final bytes |
| 5 fixtures/tests | PNW-01 fixture/test conventions | runtime, schema, roadmap, docs, config/timeouts | `fixtures/engine/geography-rights.synthetic.valid.json`; `fixtures/engine/geography-rights-malformed.invalid.json`; `tests/engine/geography-rights-schema.test.ts`; `tests/engine/geography-rights.test.ts`; `tests/engine/geography-rights-non-interference.test.ts` | frozen design and Agent 4 exports | Second counterexample set complete; PNW-03 90/90, PNW-01 45/45, foundation 17 schema-invalid plus 47 runtime-boundary cases passed; no commit |
| lead | all critical contracts and final integration | owner packet, K0/S0/O0, sources, remotes, publication | `ROADMAP.yaml`; `scripts/validate-foundation.mjs`; `scripts/validate-backbone.mjs`; `tests/pipeline/backbone-validator.test.mjs`; `docs/architecture.md`; `docs/data-contract.md`; `docs/PROJECT-BACKBONE.md`; `docs/continuation-prompt.md`; this ledger; `docs/handoffs/pnw-geography-rights-implementation-2026-09-02.md` | Agents 1-6 reports | Complete; terminal validation and implementation commit passed; evidence commit contains this final ledger |
| 6 final auditor | frozen diff, evidence, artifacts, protected identities | every write and preferred-verdict coaching | none; exact `APPROVE_PNW_03` or finite `REJECT_PNW_03` | focused candidate complete | `APPROVE_PNW_03`; no material defect register after replaying all current and prior exploit families |

## Accepted and rejected findings

Accepted: use a separate additive schema; preserve public-only PNW-01; keep S0
conceptual and isolated; use opaque geometry references; enforce role-specific
authority, exact references, whole-object restriction, fixed non-claims,
reference-only outputs, and synthetic-only fixtures.

Rejected: widening PNW-01 `1.0.0`; importing S0/K0/O0; co-opting
`jurisdictionReferences`; putting relations or frames in `PolicyRecord` or
`whyShown`; treating persona visibility as factual truth; emitting restricted
identifiers/counts; accepting real data or a concrete GIS/output adapter.

Any material contract change or path outside this ledger requires renewed scope
review before mutation.

Post-implementation findings are not waived. The first candidate was rejected
until it permits rights-frame-only operation without dummy geography, gives
supersession exact known closure, preserves immutable authority identity/class
and region scope, refuses PNW-01 candidate authority upgrade, forces one linear
version lineage, and enforces approved use through grant, request, and frame.

Agent 6 then rejected the repaired candidate on three additional material
findings. The exact selected PNW-01 jurisdiction authority reference must itself
be `synthetic_demo`; a reused authority identity ID may not change version to
launder class, deployment, or scope; and frame sources plus required relation,
frame, and geometry reviews must bind to the governed object's exact evidence
identities. These findings are active under the existing frozen leases. No
completion claim is permitted until their counterexamples pass and the same
auditor returns exact `APPROVE_PNW_03` on the final bytes.

The finite repair is now implemented without changing the schema shape or path
manifest. Candidate-jurisdiction authority, authority-ID version laundering,
unrelated frame-source identity, and relation/frame/geometry evidence-review
substitution all reject under pinned codes and structural paths. Evidence-bound
synthetic attestations replaced the earlier shared-attestation shortcut. The
three focused suites pass 86 of 86 tests, the PNW-01 suites pass 45 of 45, and
foundation validation passes 17 schema-invalid plus 45 runtime-boundary PNW-03
cases. These are repair checks, not independent approval.

Agent 6's fresh audit reproduced and closed every prior exploit, then rejected
two adjacent ambiguities. PNW-01-valid profiles can contain distinct
jurisdiction assertions with the same asserting-authority reference, so a
first-match lookup allowed sorted jurisdiction ID to choose between demo and
candidate authority. Separately, the bundle's own composite identity was not
registered beside governed member identities, allowing a projected relation to
share it. The finite closure is an exact-one jurisdiction match and bundle-wide
cross-kind identity registration, with candidate-first, candidate-last,
duplicate-demo, and member-collision counterexamples. No finding is waived.

The second finite repair now requires exactly one jurisdiction assertion for an
authority binding: zero is cross-region, multiple is an invalid authority
binding, and one candidate is unauthorized. All share the stable authority-scope
path. The bundle's composite identity is also pre-registered in the local
cross-kind catalog, so relation and frame collisions reject at `$bundle`.
Expanded immutable/atomic counterexamples pass in 90 of 90 focused tests, 45 of
45 PNW-01 regression tests, and foundation's 17 schema-invalid plus 47
runtime-boundary PNW-03 cases. At that checkpoint, independent re-audit
remained owed.

Agent 6 returned exact `APPROVE_PNW_03` on those repaired final candidate bytes
with no material defect register. The read-only audit replayed all jurisdiction
match states and permutations; bundle collisions against every catalog kind,
deployment binding, and nested persona grant; every earlier authority,
source/evidence, review, temporal, visibility, inference, immutability, and
determinism family; and the path, owner-file, protected-contract, import, and
artifact boundaries. At that approval checkpoint, full repository validation
and both commits remained lead work and were not implied by the approval; their
terminal evidence follows.

## Terminal validation and commit evidence

- Exact `APPROVE_PNW_03`: no material defect register after all current and
  prior exploit families.
- Hooks: 9 of 9. Focused PNW-03: 90 of 90. PNW-01: 45 of 45.
- Foundation: 10 schemas, 17 schema-invalid and 47 runtime-boundary PNW-03
  cases. Backbone: 11 IDs and 715 references.
- Formatting, lint, typecheck, roadmap, source-boundary, diff, protected import,
  secret/private-field, geometry-payload, dependency, and artifact scans passed.
- Serialized `npm test`: 77 files and 1,134 tests in 109.56 seconds. Final
  serialized `npm run check`: the same 77/1,134 in 120.96 seconds followed by a
  valid 3-record, 575-synthetic-Nation, 8-asset build at
  `synthetic-dc95034d5da20cf35284`.
- Fixed-input determinism: two complete 12-file builds matched by path, size,
  and SHA-256 at build ID `synthetic-6be99d5d673a93404590`.
- The ordinary parallel wrapper contention and two failed serialized attempts
  are recorded in the terminal handoff with their isolated passing evidence;
  no timeout or test configuration changed.
- Implementation commit:
  `712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a`. The separate evidence commit is
  the terminal commit containing this ledger and completed `ROADMAP.yaml`.

Process deviation: Agent 5 started one unauthorized nested read-only helper.
The lead interrupted it immediately. Agent 5 confirmed that helper made no
edits and that no helper output was accepted. No additional delegation is
permitted. The final auditor independently verified the path boundary and found
no observable helper effect.
