# PNW-04 governed taxonomy coordination ledger

Status: complete local implementation/evidence checkpoint; contract and path
manifest were frozen before implementation writes and remained bounded.

## Authority, eligibility, and starting truth

The preserved owner directive
`docs/13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md` is 43,718 bytes,
has SHA-256
`e82c88fddd781e2fffccb8871c1dc30502ebf7838d0efb167d4a50a6e6e0555a`,
and authorizes exactly a local synthetic `PNW-04-TAXONOMY` tranche. It does not
authorize real taxonomy or organization content, source access, PNW-02 or
PNW-05, adapters, private data, K0/S0/O0 convergence, a dependency change,
remote work, publication, deployment, credentials, paid/contact work, AI, or
notification.

The run began on `main` at
`d0f201eddd31a941b7d1ec40d64a11d526f5063c`, parent
`712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a`. PNW-01 implementation
`2ca77547675c3f757fb951bbbe800acba964ddc8` and PNW-03 implementation
`712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a` plus evidence checkpoint
`d0f201eddd31a941b7d1ec40d64a11d526f5063c` reconcile with Git. There was one
worktree, no remote, clean tracked/staged state, and exactly 14 untracked owner
files (`docs/00-*` through `docs/13-*`). `PNW-04-TAXONOMY` was `ready`, its
PNW-01 dependency was complete, PNW-05 remained independently ready, and
PNW-02 remained roster-evidence blocked. Baselines passed: roadmap at 63 items,
41 gates, 14 sources, and 23 binding paths; backbone at 11 schema files/IDs,
715 references, 61 canonical Markdown files, and 240 local links; foundation
at 10 schemas with the existing PNW-01 and PNW-03 negative inventories.

No repository skill applies to the mutation. In particular, source review is
inapplicable because no source is being proposed, accessed, or activated. Local
Git, repository scripts, read-only inspection, and bounded agents are the only
tools. Existing hooks remain binding and unchanged.

Protected starting identities are:

- K0: 28,667 bytes, SHA-256
  `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d`,
  Git blob `fc42d19220ff354405f1325e2451ea40e8ca247d`;
- S0: 41,506 bytes, SHA-256
  `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`,
  Git blob `52ecbd7895748d02e757a1fb6f91e6764ac8c6ff`; and
- O0: 116,551 canonical LF bytes, SHA-256
  `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381`,
  Git blob `39a340d04f87017a7ebdb2ac3585682048e323ed`. The Windows working file is
  CRLF-expanded to 117,080 bytes with raw SHA-256
  `0f61c8d4b8da9f339b39ce3460358d5a89cad5c3d5e17b249161a9f876966d5f`;
  that is not a content change.

## Frozen positive capability and compatibility posture

Add one closed, synthetic-only `TaxonomyBundle 1.0.0` beside the retained
taxonomy v1. The accepted v1 configuration and schema remain the sole truth for
legacy `PolicyRecord.taxonomyMemberships`, `isUnclassified`, application data,
artifact generation, and last-known-good behavior. The new bundle references
that vocabulary by exact version/category/subcategory identity; it does not
copy its labels or silently migrate legacy memberships.

The PNW-04 runtime consumes an already accepted PNW-01 `EngineProjection` and
the exact PNW-01 profile bundle to validate deployment, persona, output,
record, source, region, and public-view closure. It returns a separate
reference-only taxonomy projection. It never creates or changes a record,
membership, relevance reason, `whyShown`, Nation association, PNW-01 view, or
PNW-03 object. There is no PNW-03 dependency and no geography/rights object may
be taxonomy evidence.

Public exports are frozen as:

- `TAXONOMY_BUNDLE_SCHEMA_ID` and `TAXONOMY_BUNDLE_SCHEMA_VERSION`;
- closed readonly taxonomy contract types;
- `REQUIRED_TAXONOMY_NONCLAIMS`;
- `TaxonomyValidationError` with stable `code` and structural `path` and no
  hidden identifier in its message;
- `parseTaxonomyBundle(value)`;
- `createTaxonomyProjection(profileBundle, engineProjection, bundle, request)`;
- `serializeTaxonomyProjection(projection)`.

Parsing and projection accept only plain acyclic JSON values without accessors,
symbols, sparse arrays, inherited enumerable state, or non-finite numbers.
Validation completes before a detached recursively frozen canonical value is
returned. Any late error returns no partial output and mutates neither inputs
nor earlier outputs.

## Frozen input model

The top-level bundle has the exact schema ID, `schemaVersion: 1.0.0`, stable
`id@version`, `synthetic: true`, exact `profileBundleRef`, and these closed
catalogs: `authorityBindings`, `namespaces`, `concepts`,
`evidenceReferences`, `reviewAttestations`, `crosswalks`, `assignments`, and
`deploymentBindings` with nested persona grants.

Every non-concept catalog object has a globally unique `id@version`, including
the bundle and nested grants. Reuse across kinds rejects. A concept identity is
`namespace id@version + concept id@version`; the same local concept ID may
exist in different namespaces and must not collapse. All references are exact,
typed, and closed. Labels never resolve a reference.

Authority bindings carry a stable authority identity, role, class, and a
closed scope: bundle-wide, exact source plus region pack, exact region pack, or
exact deployment plus region pack. One authority identity may have several
roles, but its class and scope cannot change across versions. Classes are
generic synthetic project, source, regional-organization,
national-organization, community, and analyst classes. Roles separately cover
vocabulary ownership, crosswalk authorization, source classification,
community configuration, analyst assignment, evidence provision, and review.
Role/class/scope matrices reject authority laundering.

Namespaces have stable `id@version`, one role—`project_general`,
`source_native`, `regional_organization`, `national_organization`, or
`community_deployment`—one exact owner binding, exact scope, active or retired
status, and one vocabulary version. `project_general` references retained
taxonomy `1.0.0`; `source_native` is bound to an exact source available in its
PNW-01 region; `community_deployment` is bound to exactly one synthetic-demo
deployment. Organization roles are generic engine roles, not ATNI/NCAI
branches.

Concepts are namespace-scoped and versioned. A retained-general concept stores
only an exact taxonomy version/category/subcategory reference and derives no
replacement label. An authority-native concept stores an exact code, preferred
label, ordered alternate labels, description, optional same-namespace parent,
lifecycle state, and optional immediate predecessor. Within one namespace,
exact preferred/alternate label ambiguity rejects; identical labels and local
IDs across namespaces remain distinct. No trimming, normalization, case
folding, locale collation, keyword lookup, fuzzy lookup, model lookup, or
semantic equality exists. Parent self-reference, wrong namespace, dangling
parentage, and cycles reject.

Evidence is synthetic, public, versioned, supplied by an exact authority
binding, typed as source documentation, authority configuration, or analyst
review, cites only canonical HTTPS `.invalid` material with a locator and
observed time, and has one explicit availability state: `observed`,
`not_observed`, `unknown`, `unavailable`, or `outside_coverage`.

Reviews are synthetic, public, versioned, bind an exact reviewer authority to
one exact crosswalk or assignment and its exact evidence set, have a reviewed
time, kind, and one state: `accepted`, `pending`, `disputed`, `rejected`, or
`withdrawn`. Evidence/review substitution rejects. An accepted governed object
requires at least one exact accepted review; nonaccepted review never becomes
acceptance.

Crosswalks are explicit direct edges from exactly one source concept to one or
more target concepts. The only v1 mapping kind is `monitoring_crosswalk`; it
does not assert equivalence. Allowed direction pairs are only
`source_native|regional_organization|national_organization|community_deployment
-> project_general`. A mapping stores exact authorizer, evidence, reviews,
scope, observed time, inclusive effective date range, lifecycle state, optional
immediate predecessor, public visibility, and fixed non-claims. No reverse or
transitive traversal is performed. All direct many-to-many targets survive.
Self/reverse/other direction, duplicate target, duplicate semantic source/
target/scope edge under another lineage, undeclared conflict, wrong authority,
or wrong-scope references reject. A disputed edge is explicit and
nonprojectable; the engine never chooses a winner.

Same-ID mapping and concept versions form one immediate-predecessor semantic
version chain. Roots have no predecessor; later versions name the immediately
prior version; no gaps, forks, self-reference, or cycles are allowed. Stable
kind, namespace, endpoints, authority, and scope cannot change. A predecessor
must be `superseded`; only the unique eligible leaf may be active. Pending,
disputed, rejected, withdrawn, superseded, and expired mappings remain explicit
and never project as active.

Assignments bind exactly one record reference and deployment to exact concept
and target-namespace references, authority, evidence, reviews, observed time,
state, public visibility, and non-claims. The closed assignment kinds are
`source_provided`, `authority_configured`, `analyst_reviewed`, `unmapped`,
`unclassified`, and `not_assessed`. Source-provided assignments retain exact
`(sourceId, scheme, label)` and must match the canonical record and a
source-native namespace; authority-configured assignments are owned by the
exact community deployment; analyst-reviewed assignments require analyst
authority and review. `unmapped` is an explicit assessed concept with no
eligible direct edge to its named target namespace. `unclassified` has no
concept and only mirrors a valid legacy record with empty memberships and
`isUnclassified: true`. `not_assessed` is explicit and has no concept. Only
accepted assignments project; other assignment lifecycle states remain
distinct and nonprojectable. Invalid input is never recovered as a state.

Each deployment binding names the exact PNW-01 deployment and region, the
authorized namespace, crosswalk, and assignment references, and exact nested
persona grants. Each grant binds one exact PNW-01 persona, its output adapters,
and an authorized subset of those references. Cross-deployment, cross-region,
candidate-authority, wrong-persona, wrong-output, dangling, or unauthorized
references reject the entire request.

## Frozen output, ordering, and state behavior

The request selects exact deployment, persona, output adapter, public
visibility, and fixed `asOf` date. The output contains only schema version,
exact profile and taxonomy bundle references, the request context,
`authorized_subset_not_comprehensive`, and sorted classification references.
Each classification reference contains a record ID, assignment reference and
kind, resolution state, exact source/target concept references, crosswalk,
authority, evidence and review references, and fixed non-claims. It contains no
catalog object, label rewrite, record copy, hidden count/digest, geography,
rights frame, reason, position, legal conclusion, or recommendation.

Resolution states are `mapped`, `unmapped`, `not_assessed`, and
`unclassified`. `mapped` means only accepted direct edges eligible on `asOf`;
`unmapped` means only the exact valid assessed scope has no eligible accepted
direct edge; `not_assessed` is an explicit assignment; and `unclassified`
mirrors the exact legacy record condition for this projection scope. Unknown,
not-observed, outside-coverage, unavailable, pending, disputed, rejected,
withdrawn, superseded, and expired states are not converted to `unclassified`.
Absence is never an assertion that no relevant classification exists.

The exact ordered PNW-04 non-claim tuple on every crosswalk, assignment, and
emitted classification is:

1. `not_identity_evidence`;
2. `not_recognition_evidence`;
3. `not_organization_membership_evidence`;
4. `not_source_record_association_evidence`;
5. `not_a_why_shown_basis`;
6. `not_semantic_equivalence`;
7. `not_endpoint_authority_endorsement`;
8. `not_legal_effect_evidence`;
9. `not_consultation_evidence`;
10. `not_affiliation_consent_or_endorsement_evidence`;
11. `not_program_or_grant_eligibility_evidence`;
12. `not_urgency_priority_or_recommended_action`; and
13. `not_a_nation_position`.

PNW-01's ordered six non-claims remain unchanged. Taxonomy cannot create
identity, recognition, membership, source association, relevance/`whyShown`,
semantic equivalence, endpoint endorsement, legal applicability/effect,
consultation, rights impact, affiliation/consent, eligibility, urgency,
recommended action, or Nation/community/organization position.

All set-like bundle and output arrays sort by explicit ordinal UTF-16 code-unit
comparison over exact composite identity. No `localeCompare`, implicit map/set
iteration, or input insertion order is accepted. Classification output order is
record ID, source concept composite reference, target concept composite
reference, crosswalk reference, then assignment reference. Alternate labels
are the only user-authored ordered list. Canonical serialization recursively
sorts object keys ordinally. Fixed identical inputs must serialize byte-for-byte
identically.

## Frozen fixture and adversarial contract

The valid fixture uses only `synthetic-*` identities, neutral invented labels,
and `.invalid` citations. It contains the retained general namespace with
several exact references and a one-to-many domain case; one source-native,
regional-organization, and national-organization namespace; two distinct
community/deployment namespaces; a community-A term mapping to several general
concepts; a community-B term explicitly unmapped; active reviewed and
pending/rejected/withdrawn or superseded mappings; explicit
source-provided/configured/analyst-reviewed/unmapped/unclassified assignments;
and exact evidence/review/authority bindings. No real organization, Nation,
source, committee, policy, law, agreement, treaty, place, or community label is
permitted.

The malformed inventory and focused tests must pin exact codes/paths for:
unknown fields; duplicate/colliding identities of every kind; dangling,
wrong-kind, wrong-namespace, wrong-deployment, wrong-region, wrong-authority,
cross-bundle, and cross-persona/output references; alias ambiguity; invalid
parentage/cycles; reversed direction; duplicate/conflicting edges; invalid
time/version/supersession; review/evidence substitution; projection of every
inactive state; source-label rewrite; organization override of community
scope; mutation; label/ID collision; forbidden inference; keyword promotion;
unmapped absence claims; invalid-to-Unclassified fallback; hidden leakage;
locale/insertion-order dependence; late atomic failure; and real-content or
schema-graph omission. Tests also pin one-depth-only behavior, all direct
many-to-many targets, input/prior-output immutability, recursive freezing,
canonical replay, PNW-01 record/view byte identity, PNW-03 byte/behavior
identity, and unchanged artifact content.

JSON Schema owns closed shape, required/optional fields, unions, constants,
enums, formats, bounds, and basic uniqueness. Runtime owns composite/cross-kind
identity, reference closure, role/class/scope matrices, retained-v1 references,
label ambiguity, hierarchy and lineage graphs, semantic edge conflict,
evidence/review binding, assignment/record compatibility, projection
authorization, lifecycle eligibility, normalization, atomicity, and freeze.

## Frozen path manifest and leases

No path substitution is used. The 19 authorized paths are:

Implementation commit (14):

- `schemas/taxonomy-bundle.schema.v1.json`;
- `src/engine/taxonomy-contracts.ts`;
- `src/engine/taxonomy.ts`;
- `src/engine/index.ts`;
- `fixtures/engine/taxonomy.synthetic.valid.json`;
- `fixtures/engine/taxonomy-malformed.invalid.json`;
- `tests/engine/taxonomy-schema.test.ts`;
- `tests/engine/taxonomy.test.ts`;
- `tests/engine/taxonomy-non-interference.test.ts`;
- `scripts/validate-foundation.mjs`;
- `scripts/validate-backbone.mjs`;
- `tests/pipeline/backbone-validator.test.mjs`;
- `docs/architecture.md`; and
- `docs/data-contract.md`.

Evidence commit (5):

- `ROADMAP.yaml`;
- `docs/PROJECT-BACKBONE.md`;
- `docs/continuation-prompt.md`;
- this coordination ledger; and
- `docs/handoffs/pnw-taxonomy-implementation-2026-09-02.md`.

Write leases after this freeze are disjoint:

- Agent 4: additive schema, taxonomy contracts, taxonomy runtime, and additive
  engine-index exports only;
- Agent 5: the two taxonomy fixtures and three taxonomy focused tests only;
- lead: validators, backbone owner-file exclusion test, shared architecture and
  data-contract text, roadmap/index/continuation, this ledger, handoff,
  integration, validation, and commits;
- Agents 1-3 and final Agent 6: read-only.

No agent may commit, update the roadmap, edit shared paths, launch another
agent, or expand a lease. Any material contract change or path outside this
manifest requires renewed scope review before mutation.

## Interim adversarial findings and bounded repair record

The first integrated candidate was intentionally held short of approval while
Agents 2 and 3 exercised the frozen trust boundaries. Their read-only probes
found finite material gaps; none was waived or converted into a completion
claim:

- an object shaped like an `EngineProjection` could bypass exact PNW-01 record,
  Unclassified, reason, and view bytes;
- a source-native concept was not bound to one exact official-subject scheme,
  and a second version of one namespace stable ID could change its owner/scope;
- arrays could carry non-index own state that canonicalization dropped, and the
  runtime stable-ID minimum did not match the schema;
- same-scope but different-identity evidence suppliers and community/source
  assignment authorities could substitute for the governing authority;
- a review dated after the requested `asOf` could support emitted output, and a
  persona grant could hide an eligible deployment edge and manufacture a false
  `unmapped` result; and
- an arbitrary unexpected property name was repeated in the validation path.

The first repair now validates PolicyRecord 1.4, enforces the exact retained
membership/Unclassified invariant, requires the complete PNW-01 view shape,
and accepts only a projection reproduced byte-for-byte by the pure PNW-01
engine. Three explicit forged-projection regressions raised the focused total
from 86 to 89 passing assertions. A second bounded repair remains active for
the other findings. Agent 6 has not been launched and no final-candidate or
committed-tree approval exists yet.

### Frozen-contract amendment A — trust-boundary closure

Before the second repair write, the lead reconciled the reviewers' concrete
counterexamples against directive 13 and the already frozen semantics. This
amendment narrows acceptance; it does not add a capability, path, authority,
source, real content, dependency, output, external operation, or successor:

- every namespace carries `officialSubjectScheme`; it is exact nonempty source
  language only for `source_native` and `null` for all other roles. A
  source-provided assignment's scheme must equal that namespace value. No
  inference, normalization, or mapping from label/code/ID is permitted;
- because bundle v1 has no namespace predecessor field, one stable namespace ID
  may occur at only one version in a bundle. Namespace-version history is a
  successor-contract question, not an implicit owner/scope migration;
- cited evidence must have the required kind and a supplier whose authority
  identity, class, and scope exactly match the governed object's authority.
  Source and community assignment authorities must likewise match their exact
  namespace owner's authority identity; analyst assignment remains separately
  and explicitly analyst-qualified;
- an accepted review supports output only on or before the request `asOf` date.
  `unmapped` is evaluated against all eligible edges in the exact deployment
  binding before persona/output filtering, so access filtering cannot create a
  false absence statement; and
- JSON arrays may contain only canonical in-range indices, runtime stable IDs
  use the schema's three-character minimum, and arbitrary unexpected property
  names are redacted to a stable structural validation path.

Agents 3 and 2 supplied the read-only counterexamples and finite closure
criteria. The lead retained the existing schema version because no accepted or
committed PNW-04 contract exists yet, kept the exact 19-path manifest, and
renewed only Agents 4 and 5's existing disjoint leases for implementation and
regression tests. Final independent review must assess the amended bytes.

### Preliminary repair closure

Agent 3's first integrated review rejected four finite classes: forged PNW-01
projection acceptance, namespace stable-ID drift, source-scheme rebinding, and
runtime/schema plain-JSON or stable-ID mismatch. Agent 2 separately rejected
same-scope evidence substitution, source/community assignment-authority
laundering, future-review approval, grant-induced false `unmapped`, and
caller-controlled error-path disclosure. These were review findings, not Agent
6 or owner dispositions.

Agent 4 repaired only its schema/contracts/runtime lease. Agent 5 repaired only
its fixture/test lease. The final synthetic fixture has 26 authority bindings,
seven namespaces, 17 concepts, seven evidence references, 23 reviews, 11
crosswalks, 12 assignments, and two deployment bindings. The malformed family
has 82 cases: 22 schema cases and 60 runtime-boundary cases (55 semantic and
five projection). Focused coverage is 118 assertions: 85 schema/adversarial,
27 runtime, and six non-interference.

On the re-frozen candidate, Agent 3 returned
`PRELIMINARY_PNW04_SCHEMA_PASS` after reproducing closure of all four classes;
Agent 2 returned `PRELIMINARY_PNW04_SOVEREIGNTY_PASS` after reproducing closure
of all five probes and rescanning the ten authority/non-inference risks. Both
independently ran 118 of 118 focused assertions and reported no remaining
material defect. The re-frozen runtime SHA-256 is
`9c9cafdfbdd2a2ed1668157bf27642cf6d825d510291cc9f45c809e72a7d6b3a`.
This remains preliminary evidence only; the distinct Agent 6 audit and terminal
serialized repository check are still required.

Integration diagnostics were retained: an early Vitest-script invocation of
the Node-only backbone test selected no files and was rerun correctly with
`node --test`; initial fixture review times, six malformed expected paths, and
one deterministic ordering expectation were repaired rather than weakening
runtime checks; the first formatting check named three worker files and was
fixed mechanically; and later lint rejected a control-character regular
expression, which was replaced with an equivalent explicit character-code
check. After the final repair, formatting, lint, typecheck, foundation,
backbone, hooks, source scan, focused PNW-04, PNW-01, and PNW-03 checks pass.

## Predeclared audit questions and roadmap effects

Acceptance asks whether every endpoint retains its own authority; all edges
obey the closed direction matrix; no label or shared target creates equality;
community configuration remains deployment-local; exact source labels survive;
every emitted target traces through assignment, edge, authority, evidence,
review, version, scope, and time; inactive and invalid states never become
active or `Unclassified`; output is an authorized non-comprehensive
reference-only subset; inputs and predecessors remain unchanged; canonical
bytes survive permutations; and no real or forbidden content entered the
repository or artifact.

During implementation exactly PNW-04 is `in_progress`. Completion may change it
to `complete`, return to zero active items, and update evidence. It does not
change any gate, resolve PNW-02, activate PNW-05 or PNW-07, or mechanically
unblock another item because PNW-07 still also depends on PNW-05. PNW-05 stays
ready but unauthorized.

## Terminal reconciliation

The final candidate schema, contracts, runtime, valid fixture, and malformed
fixture SHA-256 values were respectively
`bcea309441c7582a494fc9940556fac2eadc2635a1e88634c129e18f76ee1bed`,
`ec6fae6348051cdebc0a3570dc571821100734a3e736a8dd1dbd28ce2cdec44e`,
`9c9cafdfbdd2a2ed1668157bf27642cf6d825d510291cc9f45c809e72a7d6b3a`,
`16e1b1f9c6ee6256167e3b4fa22335a5d4fbf69a33e071beadd7004063147fb3`,
and `0d0f272c16c356e5b05bd01f0afea7953c0bfd056ad8072cc111920fe8b9a754`.
Agent 6 independently returned exact `APPROVE_PNW_04` with no material defect
register or closure criteria.

The single terminal serialized `npm run check` passed formatting, lint,
typecheck, roadmap, backbone, source scanning, foundation, 80 test files and
1,252 tests in 141.92 seconds, then built and validated three records, exactly
575 synthetic Nations, eight hashed assets, and 12 `dist` files at build ID
`synthetic-43431d31265d101afccd`. No source map or PNW-04 marker entered the
artifact. Two isolated complete builds at fixed generated time
`2026-09-02T17:00:00.000Z` matched all 12 paths, sizes, and SHA-256 values at
build ID `synthetic-6be99d5d673a93404590`.

Implementation commit
`8fd1931bf05e6ab3bc93f5d25b18030101fd7269`, parent
`d0f201eddd31a941b7d1ec40d64a11d526f5063c`, contains exactly the 14
predeclared implementation paths. Agent 6 then returned exact
`POST_COMMIT_PNW04_VERIFIED`. The separate evidence commit contains exactly the
five predeclared evidence paths and is the terminal HEAD recorded by the final
report.

K0, S0, and O0 retained their canonical byte counts, SHA-256 values, and Git
blobs recorded above. Retained taxonomy v1, PolicyRecord 1.4, PNW-01, PNW-03,
packages, sources/configuration, owner inputs, and closed gates remained
protected. Exactly 14 owner files remain untracked, there is one worktree and
no remote, and no forbidden external operation occurred. PNW-04 is complete at
`PNW_04_TAXONOMY_COMPLETE_NEXT_AUTHORIZATION_REQUIRED`; PNW-05 remains ready
but unauthorized, PNW-02 remains evidence-blocked, and no successor began.
