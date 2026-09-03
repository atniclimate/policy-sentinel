# PNW-05 synthetic source-pack core handoff

Date: 2026-09-02  
Parent work item: `PNW-05-SOURCE-PACK`  
Completed slice: `PNW-05-SOURCE-PACK-CORE`  
Disposition: `PNW_05_SOURCE_PACK_CORE_COMPLETE_SOURCE_ONBOARDING_AUTHORIZATION_REQUIRED`

## Outcome and boundary

Policy Sentinel now has one closed `SourcePackBundle 1.0.0` structural contract
and a pure planner for synthetic-test source membership, exact admission proof,
declared coverage, independently scoped availability and health, typed
non-absence gaps, requester disclosure, canonical serialization, fingerprints,
and mechanical replay compatibility. It is reference-only, deterministic,
detached, recursively frozen, and incapable of source I/O.

This checkpoint does not qualify, accept, activate, access, fetch, ingest,
retain, transform, redistribute, refresh, cache, or publish any real source. It
does not establish real contract terms, authority, coverage, currentness,
completeness, association, relevance, geography, rights impact, legal
applicability, community position, or source health. It does not implement
PNW-06 lifecycle/last-known-good behavior, PNW-07 analyzed-corpus behavior, a
browser dependency, an output adapter, a public artifact, or K0/S0/O0
convergence.

Parent `PNW-05-SOURCE-PACK` therefore remains non-complete and `ready` only for
a separately authorized named-source onboarding tranche. PNW-06 and PNW-07
remain `not_started`; `G-PNW-SOURCE-ACTIVATION` and every remote, publication,
credential, terms, paid/contact, private-data, AI, notification, deployment,
and convergence gate remain closed.

## Identity, admission, and projection model

- Schema ID:
  `https://policy-sentinel.invalid/schemas/source-pack-bundle.schema.v1.json`;
  schema and bundle version `1.0.0`.
- Trust and lifecycle are exactly `synthetic_test_only` and
  `synthetic_test_configuration`.
- A source is the exact existing-registry pair `(sourceId,
  sourceRegistryVersion)`. The runtime admits only registry entries already
  marked synthetic with fixture access and a fixture adapter; pack-local source
  truth and real/mixed identities reject.
- One admission requires the exact source pair, current test-qualified contract,
  typed single-primary-consumer evidence, declared coverage, configuration
  authority, exact accepted reviews, source/jurisdiction/access context,
  deployment/region/persona/output tuple, independent requested-operation
  grant, and three required availability plus three required health scopes.
- Contract fingerprints and review evidence are exact joins. Every root
  configuration authority is used. Accepted reviews have exactly one admission
  consumer; pending/rejected reviews have none. Global validation closes these
  joins even for unconsumed reviews.
- Availability and health remain separate. `unknown` is not `not_observed`;
  unavailable, disabled, not admitted, outside coverage, partial, unknown
  coverage, not assessed, degraded, and failed remain distinct. The latest fact
  at or before the explicit `asOf` wins; future facts are ignored and conflicting
  equal-time facts reject.
- Partial coverage can serve a requested slot but always emits a visible
  `partial` non-absence gap unless another eligible covered binding closes that
  slot. Multiple partial sources never become complete.
- PNW-03 geographic/rights and PNW-04 source-native taxonomy objects are optional
  exact public predecessor references only. They cannot create admission,
  coverage, source association, relevance, rights, jurisdiction, legal effect,
  or activation.
- Access is evaluated before identity-bearing output. Hidden bindings cannot
  affect visible identities, counts, reasons, timestamps, ordering, serialized
  bytes, or requester fingerprint, including a hidden-only global bundle-version
  change.
- The whole graph, including globally unique deployment/profile/region tuples,
  is validated before traversal. A late error emits no partial projection.
  Parsed bundles and plans are deep detached and recursively frozen; inputs,
  prior plans, predecessor objects, and other deployments cannot be mutated.
- Canonical set ordering is Unicode code-point ordinal. A pure browser-safe
  SHA-256 implementation fingerprints authorized plan bytes. The module has no
  network client, `fetch`, timer, implicit clock, Node hashing, or external
  dependency.

## Synthetic evidence strata

The representative valid bundle contains:

| Catalog | Count |
| --- | ---: |
| source contexts | 4 |
| jurisdiction contexts | 2 |
| access contexts | 4 |
| authority bindings | 5 |
| evidence receipts | 16 |
| contract receipts | 3 |
| coverage declarations | 5 |
| review attestations | 10 |
| admission receipts | 5 |
| availability observations | 15 |
| health observations | 15 |
| source bindings | 5 |
| deployment bindings | 2 |

The malformed inventory contains 53 predeclared cases: 18 schema-invalid, 31
semantic, and 4 projection-boundary cases. The matrix proves two eligible
sources, two distinct state-context roles and jurisdictions, a neutral regional
role, partial usefulness with an explicit gap, context-isolated unavailability,
and separate disabled/not-admitted behavior. It uses only existing canonical
synthetic fixture source IDs. No real source, provider, organization, Nation,
community, policy, law, case, grant, endpoint, geography, land, person, contact,
credential, raw response, or private data was used.

## Review and repairs

The repository `policy-sentinel-source-review` skill supplied the authority,
contract, coverage, privacy, reuse, lifecycle, and activation-boundary review
procedure. Because this tranche forbade source access and real-source evidence,
it did not qualify a provider or open a gate.

Agents 4 and 5 wrote only their disjoint frozen implementation leases; the lead
integrated exports, validators, supporting docs, roadmap/evidence, and commits.
All other reviewers were read-only. There were no one-to-one path substitutions
and no lease expansion.

The first independent Agent 6 audit returned `REJECT_PNW_05_CORE` for four
finite defects: contract-fingerprint/evidence substitution, future review use,
an inert singleton root authority, and insufficiently stable error-path proof.
Those were repaired with exact fingerprint joins, review-time checks, an exact
used authority set, stable redacted paths, and adversarial tests.

A contract reviewer then closed restricted predecessor disclosure,
unknown/not-observed collapse, admission review closure and proof time, hidden
global bundle-version leakage, partial-gap omission, persona/output mismatch,
and reusable evidence receipts. Renewed Agent 6 passes found and closed an
unconsumed cross-source review authority join, an unconsumed
cross-jurisdiction coverage review join, and duplicate deployment-scope lookup
ambiguity. The final candidate received exact `APPROVE_PNW_05_CORE`. After the
implementation commit, Agent 6 returned exact
`POST_COMMIT_PNW05_CORE_VERIFIED` for that tree.

## Validation evidence

- Focused PNW-05 command: three files, 83 tests passed.
- Predecessor regressions: nine PNW-01/03/04 files, 253 tests passed.
- Foundation: 12 compiled contract schemas; the source-pack group passed one
  valid, 18 schema-invalid, and 35 runtime-boundary cases. The artifact schema
  remains the thirteenth backbone schema ID and is validated separately.
- Direct Node backbone-validator suite: 9 of 9 passed. Hooks: 9 of 9 passed.
- Formatting, lint, typecheck, roadmap validation, backbone validation,
  source-boundary scanning, `git diff --check`, and artifact validation passed.
- Two ordinary parallel full-check attempts each reached 82 passing files and
  1,334 passing tests before only the unchanged 20-second nested
  `tests/pipeline/pipeline.test.ts` wrapper timed out while its child process
  took approximately 28-29 seconds. The exact isolated pipeline test passed 1
  of 1 in 8.11 seconds. Diagnostic runs excluding PNW-05 non-interference, and
  then all three PNW-05 suites, reproduced the same wrapper contention. No
  timeout or test configuration changed, and the ordinary parallel command was
  not rerun for ceremony.
- The required terminal command preserved and restored the process environment
  around `VITEST_MAX_WORKERS=1 npm run check`. It passed formatting, lint,
  typecheck, roadmap/backbone/source/foundation validation, all 83 files and
  1,335 tests in 113.18 seconds, then built and validated 3 records, exactly 575
  synthetic Nations, and 8 assets at build ID
  `synthetic-91006af61ddfe9888fcb`.
- Browser/UI/accessibility testing was inapplicable: no application, route,
  interaction, browser source dependency, or public-output behavior changed.

Final backbone validation after this handoff records 13 JSON Schemas, 13 unique
schema IDs, 924 `$ref` occurrences, 64 canonical Markdown files, and 260 local
links. Final roadmap validation records 63 work items, 41 gates, 14 sources, 23
binding paths, 32 complete, zero in progress, one ready, 16 blocked, zero
deferred, and 14 not started.

## Artifact and deterministic-build evidence

The ordinary artifact contains no source-pack configuration, identity,
contract, evidence, coverage, review, admission, fixture, slot, gap, or test
marker. Two complete direct fixed-input builds at
`2026-09-02T18:00:00.000Z` produced the same build ID
`synthetic-c1d8d821528cac1f7efa` and matched every relative path, byte size, and
SHA-256 value:

| Relative path | Bytes | SHA-256 |
| --- | ---: | --- |
| `coverage.json` | 2,709 | `a44203f18bdf476f8762546faebabd8a81630ff92c223bc7e52ff8209e604fb6` |
| `details/cHNyOnN5bnRoZXRpYy1jb3VudHk6b3JkaW5hbmNlLTAwMQ.json` | 27,483 | `4a2117cf449856c1a7c5e74bde614029cf2c1a0edb7bef1ce023a7a6d0757dfa` |
| `details/cHNyOnN5bnRoZXRpYy1mZWRlcmFsOnJlY29yZC0wMDE.json` | 19,785 | `608d3acf754d5f7775dcee121d7adb308542269c451d0c1fe4cfe1b00f7de2b6` |
| `details/cHNyOnN5bnRoZXRpYy1zdGF0ZS1hY29yZDpzeW50aGV0aWMtYWNjb3JkLTE5NzQ.json` | 38,554 | `726cddf4ffe9ce32d86b7262068923ab44cb0bad387bd998dc63c7ae2fbb38e7` |
| `index/records.json` | 8,399 | `d5002e2ad58504ba8c21682c567c8c2976b9ade866e50b5ace7d0a004a4a2fff` |
| `manifest.json` | 2,683 | `a2b0a97c430cc32c4aac77403b165da56bb7f64b627b71601670fc1fab93a31a` |
| `nations.json` | 174,613 | `e4e50ca6c7e5bdfee06a0b458fc87748fb36d30aded457b669ae40b1838fd38a` |
| `source-health.json` | 1,345 | `e9cff297d966ba800c85c3ad47b8acfae7d57c0a536552e7284f4f509178a725` |
| `taxonomy.json` | 10,363 | `327e4520a577e64f40b83cefbea9d18b4a22f32c87719ff5b09d4dcb5828c70d` |

The temporary generated files were removed after comparison. No generated
public data, raw response, cache, or source-pack fixture was committed.

## Git and custody

The run began on `main` at
`45c8756163dafa96e17bc17d31aefe16e11d1a25`, parent
`8fd1931bf05e6ab3bc93f5d25b18030101fd7269`, with one worktree, zero remotes,
and clean tracked/staged state. PNW-01 implementation/evidence commits
`2ca77547675c3f757fb951bbbe800acba964ddc8` /
`e1285c7eea66a0e948fd511fdb4ea54fcb8bc852`, PNW-03
`712bb5fe8d56fdd49a0d139e0455c5f30e3bdc1a` /
`d0f201eddd31a941b7d1ec40d64a11d526f5063c`, and PNW-04
`8fd1931bf05e6ab3bc93f5d25b18030101fd7269` /
`45c8756163dafa96e17bc17d31aefe16e11d1a25` remain ancestors with their exact
accepted path manifests and evidence.

Implementation commit `6f1475dfb72a432ccfe65b16e65035df25a933d3`,
parent `45c8756163dafa96e17bc17d31aefe16e11d1a25`, tree
`210a1d78befe12c54d06eba4b5f888f533079b39`, contains exactly:

1. `schemas/source-pack-bundle.schema.v1.json`
2. `src/engine/source-pack-contracts.ts`
3. `src/engine/source-pack.ts`
4. `src/engine/index.ts`
5. `fixtures/engine/source-pack.synthetic.valid.json`
6. `fixtures/engine/source-pack-malformed.invalid.json`
7. `tests/engine/source-pack-schema.test.ts`
8. `tests/engine/source-pack.test.ts`
9. `tests/engine/source-pack-non-interference.test.ts`
10. `scripts/validate-foundation.mjs`
11. `scripts/validate-backbone.mjs`
12. `tests/pipeline/backbone-validator.test.mjs`
13. `docs/architecture.md`
14. `docs/data-contract.md`

The separate evidence commit contains exactly:

1. `ROADMAP.yaml`
2. `docs/PROJECT-BACKBONE.md`
3. `docs/continuation-prompt.md`
4. `docs/development/PNW-05-SOURCE-PACK-CORE-COORDINATION-2026-09-02.md`
5. `docs/handoffs/pnw-source-pack-core-2026-09-02.md`

All 15 owner-supplied untracked inputs from `docs/00-READ-FIRST.md` through
`docs/14-CODEX-PNW-05-SOURCE-PACK-CORE-LONG-RUN.md` remain byte-identical,
unstaged, and uncommitted; their exact starting/end manifest is in the
coordination ledger. K0 remains blob
`fc42d19220ff354405f1325e2451ea40e8ca247d`, 28,667 bytes, SHA-256
`30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d`;
S0 remains blob `52ecbd7895748d02e757a1fb6f91e6764ac8c6ff`, 41,506 bytes,
SHA-256 `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888`;
O0 remains blob `39a340d04f87017a7ebdb2ac3585682048e323ed`, 116,551 canonical LF
bytes, SHA-256
`f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381`.

No network, source, credential, paid/contact, dependency, private/person-bearing,
remote, push, deployment, publication, notification, optional-AI, or
convergence operation occurred.

## Exact next authority required

The minimum next authorization is not general permission to “continue PNW-05.”
It must name one bounded source-onboarding tranche and authorize review of that
source's current originating primary documentation. Before any implementation
or activation decision, the review must record source authority, exact
interface and fields, history/date range, authentication, rate limits, use and
reproduction rights, attribution, privacy/exclusions, cadence, lifecycle and
failure behavior, coverage boundaries, build-time/static/CORS constraints,
public-field whitelist, and known gaps. Any access, registration, terms
acceptance, credential, paid call, third-party contact, real-content retention,
adapter implementation, activation, remote, or publication operation still
requires its own exact owner authorization.
