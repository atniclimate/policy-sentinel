# PNW-04 governed taxonomy implementation handoff

Status: complete local PNW-04 implementation and evidence checkpoint; separate
exact owner authorization is required for every successor or external action.

## Authority and starting checkpoint

The owner supplied
`docs/13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md` as preserved
untracked direction: 43,718 bytes, SHA-256
`e82c88fddd781e2fffccb8871c1dc30502ebf7838d0efb167d4a50a6e6e0555a`.
It exactly authorized a local synthetic PNW-04 governed-taxonomy tranche. It
did not authorize real ATNI, NCAI, Nation, source-native, policy, legal, or
community taxonomy content; a source or adapter; private data; K0/S0/O0
convergence; dependency changes; remote work; publication; deployment;
credentials; paid/contact work; AI; notification; UI; or a successor.

The run began in `I:\policy-sentinel` on `main` at
`d0f201eddd31a941b7d1ec40d64a11d526f5063c`, parent
`712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a`. PNW-01 implementation
`2ca77547675c3f757fb951bbbe800acba964ddc8`, PNW-03 implementation
`712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a`, and PNW-03 evidence
`d0f201eddd31a941b7d1ec40d64a11d526f5063c` reconciled exactly. One worktree
existed, no remote was configured, tracked/staged state was clean, and exactly
14 owner packet paths `docs/00-*` through `docs/13-*` were untracked. PNW-04
was ready with PNW-01 complete; PNW-05 was independently ready but
unauthorized; PNW-02 remained blocked on originating 59-member roster evidence.

The lead read the complete roadmap and binding authority set, froze the exact
19-path manifest and disjoint leases in
`docs/development/PNW-04-TAXONOMY-COORDINATION-2026-09-02.md`, and kept PNW-04
as the sole `in_progress` item until validated implementation commit
`8fd1931bf05e6ab3bc93f5d25b18030101fd7269` existed.

## Implemented capability

The additive closed schema ID is
`https://policy-sentinel.invalid/schemas/taxonomy-bundle.schema.v1.json` and the
contract is `TaxonomyBundle 1.0.0`. It is separate from the unchanged retained
taxonomy v1 and `PolicyRecord 1.4`; a project-general concept stores only an
exact retained taxonomy category/subcategory reference and creates no second
label truth or migration.

In plain language, the bundle keeps five kinds of vocabulary space separate:

- the project's retained general categories;
- exact-scheme language supplied by a source;
- a generic regional-organization vocabulary;
- a generic national-organization vocabulary; and
- deployment-local community configuration.

The regional/national roles are generic synthetic analogues, not real ATNI or
NCAI data or hard-coded engine branches. Each namespace has one exact owner,
scope, version, and state. A source-native namespace additionally names one
exact official-subject scheme. The same label or concept-local ID may occur in
different namespaces or schemes without becoming the same concept. Because v1
has no namespace-predecessor field, it accepts only one version of each stable
namespace ID per bundle.

Authority bindings separate identity, class, role, and scope. Vocabulary
owners, source classifiers, community configurators, analyst assigners,
crosswalk authorizers, evidence providers, and reviewers cannot substitute
merely because they share a scope. Evidence kind, supplier identity/class/scope,
review subject/evidence set, reviewer identity/scope, observation time, review
time, lifecycle state, and public visibility close each governed object.

`monitoring_crosswalk` is the only relation. It travels directly from a
source-native, regional-organization, national-organization, or
community-deployment concept to one or more project-general references. It
never traverses in reverse or through another edge and performs no keyword,
label, fuzzy, locale, embedding, model, or equivalence resolution. Every direct
many-to-many target survives deterministic projection; semantic duplicates,
conflicts, wrong direction, wrong authority/scope, broken lineage, and inactive
or unreviewed states reject or remain nonprojectable.

Assignments distinguish `source_provided`, `authority_configured`,
`analyst_reviewed`, `unmapped`, `not_assessed`, and `unclassified`. Source
labels preserve exact `(sourceId, scheme, label)` and match both the canonical
record and exact source namespace. `unmapped` is checked against every eligible
edge in the full deployment binding before persona filtering, so restricted
visibility cannot manufacture absence. `unclassified` only mirrors a valid
record with an empty retained membership array and `isUnclassified: true`;
unknown, unavailable, invalid, pending, disputed, rejected, withdrawn,
superseded, expired, or future-reviewed input never becomes Unclassified.

The runtime first accepts only plain acyclic JSON with canonical array state.
It schema-validates every PolicyRecord 1.4 input, enforces the exact retained
membership/Unclassified invariant, reconstructs the PNW-01 `EngineProjection`
from its records/profile, and requires byte identity with that canonical
projection. It then validates the complete taxonomy/profile/deployment/persona/
output graph before returning a detached, recursively frozen reference-only
projection. Failure is atomic and returns a stable code plus structural,
value-safe path without leaking caller-controlled property names.

Output contains no records, labels, corpus, `whyShown`, geography, rights,
hidden counts, legal conclusions, positions, recommendations, or catalog
payloads. It contains only exact record, assignment, concept, crosswalk,
authority, evidence, and review references, request context, and
`authorized_subset_not_comprehensive`. Canonical serialization recursively
sorts keys and uses explicit ordinal composite ordering.

Every crosswalk, assignment, and classification repeats the exact 13-value
non-claim tuple. It is not evidence of identity, recognition, organization
membership, source-record association, relevance/`whyShown`, semantic
equivalence, endpoint endorsement, legal effect, consultation,
affiliation/consent, eligibility, urgency/recommended action, or a Nation or
other constituency position.

## Synthetic fixtures, review, and validation

The valid fixture uses only invented `synthetic-*` identities, neutral labels,
public `.invalid` citations, and synthetic-demo PNW-01 profiles. It contains 26
authority bindings, seven namespaces, 17 concepts, seven evidence references,
23 reviews, 11 crosswalks, 12 assignments, and two deployment bindings. No
real organization, Nation, committee, resolution, agency, source content,
policy, law, treaty, place, or community configuration appears.

The malformed family contains 82 exact cases: 22 schema-invalid, 55 semantic,
and five projection-boundary cases. The three focused suites contain 118
assertions: 85 schema/adversarial, 27 runtime, and six non-interference. They
cover composite/cross-kind identity, source-scheme separation, authority and
evidence substitution, hierarchy/lineage/cycles, direction/conflict, review
time, every inactive state, honest unmapped/Unclassified behavior, forged
PNW-01 projections, authorization, hidden array state, caller mutation,
atomicity, recursive freezing, canonical replay/permutation, retained-v1 and
PolicyRecord compatibility, PNW-01 byte identity, PNW-03 isolation, forbidden
imports/fields, and artifact exclusion.

Preliminary Agent 3 review first rejected forged PNW-01 projection acceptance,
namespace-version drift, cross-scheme source rebinding, and schema/runtime JSON
parity. Preliminary Agent 2 review independently rejected evidence and
assignment authority substitution, future-review approval, grant-induced false
`unmapped`, and caller-controlled error paths. The bounded repairs closed every
counterexample. On re-frozen bytes, the reviewers returned
`PRELIMINARY_PNW04_SCHEMA_PASS` and
`PRELIMINARY_PNW04_SOVEREIGNTY_PASS`, each after an independent 118-of-118
focused run.

The distinct final Agent 6 independently reviewed the candidate and returned
exact `APPROVE_PNW_04` with no material defect register or closure criteria.
After the implementation commit, the same auditor returned exact
`POST_COMMIT_PNW04_VERIFIED` for its tree, scope, candidate hashes, parent, and
protected identities.

Terminal validation evidence:

- PNW-04 focused suites: three files, 118 tests passed;
- PNW-01 regression suites: three files, 45 tests passed;
- PNW-03 regression suites: three files, 90 tests passed;
- foundation: 11 schemas, with 22 schema-invalid and 60 runtime-boundary
  PNW-04 cases classified correctly;
- final backbone: 12 schema resources/IDs, 807 references, 62 canonical
  Markdown files, and 246 local links;
- hooks: nine tests passed; the Node-only backbone validator: nine tests passed;
- formatting, lint, typecheck, source-boundary scan, roadmap validation,
  artifact validation, and `git diff --check` passed;
- the single terminal serialized `npm run check` passed 80 files and 1,252
  tests in 141.92 seconds, then produced a valid artifact;
- terminal normal artifact: three records, exactly 575 synthetic Nations, eight
  verified assets, 12 total `dist` files, no source maps, no PNW-04 markers,
  and build ID `synthetic-43431d31265d101afccd`; and
- two complete fixed-input builds at `2026-09-02T17:00:00.000Z` matched all 12
  relative paths, byte sizes, and SHA-256 values at build ID
  `synthetic-6be99d5d673a93404590`.

The known ordinary parallel full-test contention was not rerun. No timeout or
test configuration changed. Diagnostics were preserved: an early attempt to
select the Node-only backbone test through Vitest selected no files and was
rerun with `node --test`; pre-integration fixture times, six expected paths, and
one ordering expectation were corrected; initial formatter findings were
repaired; and lint's rejection of a control-character regex was resolved with
an equivalent explicit character-code check. The final serialized check passed
on its first and only terminal invocation.

Browser interaction was inapplicable because no application, UI, route,
browser behavior, public artifact contract, or deployed surface changed. The
unchanged application accessibility suites still passed inside the full check.
This is structural synthetic capability evidence, not source, roster, real
taxonomy, production-classification, completeness, or release evidence.

## Exact path and commit boundary

Implementation commit
`8fd1931bf05e6ab3bc93f5d25b18030101fd7269` has parent
`d0f201eddd31a941b7d1ec40d64a11d526f5063c` and contains exactly these 14
paths:

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

The separate roadmap/evidence commit contains only:

- `ROADMAP.yaml`;
- `docs/PROJECT-BACKBONE.md`;
- `docs/continuation-prompt.md`;
- `docs/development/PNW-04-TAXONOMY-COORDINATION-2026-09-02.md`; and
- this handoff.

There was no path substitution. No generated `dist/**`, cache, package,
lockfile, source/configuration, real data, owner input, remote, or publication
path was committed. The evidence commit is the terminal `HEAD` reported after
its creation because a commit cannot embed its own hash.

## Protected state, limitations, and next boundary

Canonical protected identities remain unchanged and unimported:

- K0: 28,667 bytes, SHA-256
  `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d`, Git
  blob `fc42d19220ff354405f1325e2451ea40e8ca247d`;
- S0: 41,506 bytes, SHA-256
  `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`, Git
  blob `52ecbd7895748d02e757a1fb6f91e6764ac8c6ff`; and
- O0: 116,551 canonical LF bytes, SHA-256
  `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381`, Git
  blob `39a340d04f87017a7ebdb2ac3585682048e323ed`.

On this Windows checkout, O0's raw working file remains CRLF-expanded to
117,080 bytes with raw SHA-256
`0f61c8d4b8da9f339b39ce3460358d5a89cad5c3d5e17b249161a9f876966d5f`;
canonical Git bytes, clean-filter blob identity, and `git diff` prove no content
change. K0/S0/O0 convergence gates remain closed. The retained taxonomy v1,
PolicyRecord 1.4, PNW-01, and PNW-03 contracts/fixtures/runtime remain
unchanged; `src/engine/index.ts` only adds PNW-04 exports.

All 14 owner packet files remain untracked and directive 13 remains at its
starting size/hash. No remote exists. No source was accessed or activated; no
terms were accepted; no credentials, payments, contact, private data, AI,
notification, telemetry, publication, deployment, or successor work occurred.

PNW-04 is complete with zero active work items. PNW-05 remains ready but is not
authorized. PNW-02 remains blocked on a current ATNI-authorized originating
59-member roster plus separately verified sovereign identities; federal
recognition is not organization membership. PNW-07 remains not started because
PNW-05 is incomplete. The four retained B-series roots remain unchanged.

The exact next owner decision is whether to authorize one specific successor
tranche—currently PNW-05 is the only dependency-ready PNW item—or to supply the
originating evidence needed to unblock PNW-02. Neither action is implied or
started here.

Terminal disposition:
`PNW_04_TAXONOMY_COMPLETE_NEXT_AUTHORIZATION_REQUIRED`.
