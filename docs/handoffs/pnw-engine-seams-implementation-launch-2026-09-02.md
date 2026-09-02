# PNW-01 engine-seams implementation launch handoff

Status: current, owner-gated execution contract prepared 2026-09-02. This
handoff does not authorize implementation. It becomes executable only when the
owner says exactly that `PNW-01-ENGINE-SEAMS` is authorized under this file's
paths, tests, stop conditions, and no-other-gate boundary.

## North star and present definition of done

Policy Sentinel is a configurable, sovereignty-centered engine that watches
bounded authoritative policy sources, explains why material was surfaced, and
produces governed outputs without converting inference into sovereign,
jurisdictional, legal, or community authority.

The present development definition of done is the general engine proven across
the PNW/ATNI region and the intended 59 current ATNI Member Tribes after an
originating roster exists. Nationwide United States packs are later work. The
Nez Perce habitat/endangered-species scenario is one golden use case in a
materially contrasting suite, not a standalone application, a hard-coded
branch, or accepted production fact.

Documents, web modules, applications, and structured exports are adapters over
one analyzed corpus. The current static app, dossier, CSV, and artifact are
implemented precursors. They are not yet a common output-adapter suite or a
public PNW product.

## Authority and checkpoint identity

Authority order and navigation are defined by the
[project backbone](../PROJECT-BACKBONE.md). At the start of the repository
congruence run:

- branch: `main`;
- HEAD: `ee499673854605ca3c58800dfbee828ff82d9df0`;
- parent: `210f50195ef8fedf97a114965d0b676cd3771aab`;
- relevant commits:
  - `210f50195ef8fedf97a114965d0b676cd3771aab` — `docs: rebase product space around PNW engine`;
  - `ee499673854605ca3c58800dfbee828ff82d9df0` — `docs: record terminal PNW rebase checkpoint`;
- tracked status: clean; and
- untracked status: the preserved owner packet `docs/00-*` through
  `docs/11-*`, which is not implementation or commit input.

The terminal congruence checkpoint is the current `main` HEAD containing this
handoff and the completed `H-REPOSITORY-BACKBONE` ledger evidence. A Git commit
cannot contain its own SHA without changing that SHA. Therefore the final
owner report records the exact terminal SHA, while a fresh run must resolve and
record the same value with `git rev-parse HEAD` and its exact parent with
`git rev-parse HEAD^`. Stop if HEAD is not a descendant of the two commits above,
if unexplained tracked changes already exist, or if an unexplained
remote/worktree appears. The untracked owner packet is preserved input for this
workspace, not a launch dependency: if present, leave it untouched and
unstaged; if absent in a later clone/session, use the committed backbone,
roadmap, handoff, and exact new owner authorization.

The congruence checkpoint changed only this authorized repository-backbone
closure:

- `AGENTS.md`, `README.md`, `ROADMAP.yaml`, and `package.json`;
- `docs/PROJECT-BACKBONE.md`, `docs/architecture.md`,
  `docs/continuation-prompt.md`, `docs/data-contract.md`,
  `docs/data-governance.md`, `docs/decision-register.md`, `docs/mvp-plan.md`,
  `docs/project-brief.md`, `docs/source-coverage.md`,
  `docs/source-feasibility.md`, and `docs/ux-spec.md`;
- historical status banners in
  `docs/policy-sentinel-long-running-development-program-2026-09-01.md` and
  `docs/policy-sentinel-sol-ultra-deep-dive-prompt.md`;
- `docs/vision/README.md`;
- `docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md`, the dated coordination
  ledger, and the four files under `docs/development/templates/`;
- this handoff;
- `scripts/validate-backbone.mjs` and `scripts/validate-roadmap.mjs`; and
- `tests/pipeline/backbone-validator.test.mjs` and
  `tests/pipeline/roadmap-validator.test.mjs`.

No owner-packet, source, product-runtime, schema, fixture, configuration,
dependency, lock, protected-contract, generated, deployment, or remote path
was part of the congruence mutation closure.

## Canonical backbone map

| Responsibility | Canonical path |
| --- | --- |
| Execution, Git, gates, validation | [`AGENTS.md`](../../AGENTS.md) |
| Live status, dependencies, evidence, next queue | [`ROADMAP.yaml`](../../ROADMAP.yaml) |
| Authority and navigation | [`docs/PROJECT-BACKBONE.md`](../PROJECT-BACKBONE.md) |
| Product mission and combined acceptance | [`docs/project-brief.md`](../project-brief.md) |
| PNW scope and regional acceptance | [`docs/pnw-scope-and-acceptance.md`](../pnw-scope-and-acceptance.md) |
| Current/target architecture | [`docs/architecture.md`](../architecture.md) |
| Schemas, logical contracts, compatibility, migration | [`docs/data-contract.md`](../data-contract.md) |
| Provenance, epistemic, privacy, and visibility rules | [`docs/data-governance.md`](../data-governance.md) |
| Decisions and open gates | [`docs/decision-register.md`](../decision-register.md) |
| Source envelope and dated evidence | [`docs/source-coverage.md`](../source-coverage.md) and [`docs/source-feasibility.md`](../source-feasibility.md) |
| Retained application UX | [`docs/ux-spec.md`](../ux-spec.md) |
| Retained B1-B10 plan | [`docs/mvp-plan.md`](../mvp-plan.md) |
| K0/S0/O0 custody | [`docs/vision/README.md`](../vision/README.md) |
| Roles, tools, leases, and run patterns | [`docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md`](../development/AGENT-AND-TOOL-OPERATING-MODEL.md) |
| Product-space mapping | [`pnw-product-space-rebase-2026-09-02.md`](pnw-product-space-rebase-2026-09-02.md) |

## Current capability and roadmap truth

The current repository implements and validates a static Preact app, print
dossier, CSV serializer, hash routes, search/filter/detail behavior, a
fail-closed artifact pipeline, `PolicyRecord 1.4`, source registry `1.19`, and
artifact package `1.4` over three synthetic records and exactly 575 explicitly
synthetic Nation rows. Four real-source adapters are implemented and tested but
disabled. Five other source families are contract-only or offline. The BIA
parser validates 577 displayed notice paragraphs but emits no reconciled
575-identity registry.

There is no `src/engine/`, region pack, community deployment profile, persona
projection, `CommunityRelevanceAssertion`, common engine projection,
`OutputAdapter<T>`, canonical analyzed corpus, authoritative current ATNI
registry, public beta, remote, workflow, deployment, or publication.

At the aligned checkpoint:

- `H-REPOSITORY-BACKBONE` is complete and no work item is active;
- retained local release remains blocked on exactly `B2-REVIEW`, `B4-FR-UX`,
  `B5-WA-LWS-ADAPTER`, and `B5-WA-RULES`;
- PNW regional completion remains blocked on exactly
  `PNW-01-ENGINE-SEAMS` and `PNW-02-REGIONAL-REGISTRY`;
- `PNW-01-ENGINE-SEAMS` depends only on completed `PNW-00-RECONCILE` and is
  blocked solely by closed `G-PNW-IMPLEMENTATION`;
- `PNW-02-REGIONAL-REGISTRY` also depends on PNW-01 and is independently
  evidence-blocked by `G-PNW-ATNI-59-ROSTER`; and
- PNW-03 through PNW-10 remain not started behind their recorded dependencies.

Read the complete roadmap and run its validator for exact current counts. The
expected aligned count is 63 work items: 29 complete, 0 in progress, 0 ready,
17 blocked, 0 deferred, and 17 not started, with 41 gates and 14 sources.

## Accepted decisions and gates

The following are settled for this tranche:

- sovereign identity, federal recognition, and organization membership remain
  separate evidence-bearing relations;
- 59 is the owner-directed intended ATNI member target and 575 is the stated
  federal-recognition collection total; neither proves the other;
- record identity, source facts, lifecycle, taxonomy, associations,
  provenance, review, visibility, and output presentation remain distinct;
- `whyShown` must be typed and configuration-supported and must never imply
  legal applicability, rights impact, jurisdiction, comprehensive coverage, or
  a community position;
- profiles in this tranche are impossible/repository-authored synthetic data;
  and
- PNW-01 is additive and compatibility-conscious, not a rewrite or migration.

Still-open gates include:

- `G-PNW-IMPLEMENTATION`: closed until the owner authorizes exactly this
  tranche;
- `G-PNW-ATNI-59-ROSTER`: pending current originating ATNI roster evidence;
- deployment-specific community authority and spatial evidence gates;
- K0, S0, and O0 convergence/review gates; and
- every source-access, credential, terms, paid/contact, private-data,
  optional-AI, outbound-notification, remote, release, Pages, and publication
  gate not already satisfied for its exact recorded purpose.

Authorizing PNW-01 opens only `G-PNW-IMPLEMENTATION` for this one synthetic
tranche. It does not open or satisfy any other gate.

## Protected and publication boundaries

The next run must verify and preserve these contracts byte-for-byte in Git.
The identities below are SHA-256 over normalized LF/no-BOM repository bytes;
verify from `git show HEAD:<path>` or apply the same newline normalization so a
Windows CRLF checkout does not create a false mismatch:

| Contract | SHA-256 | Status |
| --- | --- | --- |
| `docs/vision/k0-lifecycle-contract.md` | `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d` | K0 complete, additive, nonconverged |
| `docs/vision/s0-spatial-contract.md` | `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888` | S0 complete, impossible-synthetic, nonconverged |
| `docs/vision/o0-orchestration-contract.md` | `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381` | repaired byte-sealed candidate; unaccepted and unimplemented |

The O0 Git blob at the preceding terminal rebase is
`39a340d04f87017a7ebdb2ac3585682048e323ed`. D0 is a historical proposal only
and has no roadmap item, schema, runtime, or authority.

No remote, push, PR, tag, release, workflow, Pages operation, publication,
source activation/access, credential operation, private-data action, or
external communication belongs to PNW-01. Local completion is not publication.

## Exact first implementation tranche

### Why PNW-01 is next

`PNW-01-ENGINE-SEAMS` is the first incomplete dependency shared by the
regional geography/rights, taxonomy, and source-pack branches. It establishes
the configuration seam needed to prove the engine is not overfit to one Nation,
region, persona, or output without waiting for the evidence-blocked ATNI roster.
It is therefore a dependency root, not merely an interesting task. O0 is not a
substitute: it remains an unaccepted candidate behind separate review and
convergence gates.

### Starting capability

The pipeline builds validated `PolicyRecord 1.4` values and one static
application artifact. Application logic directly selects records for a
Nation-oriented view. No general region/deployment/persona configuration,
reference-only engine projection, or common output-adapter interface exists.

### Terminal capability

A pure deterministic engine accepts unchanged validated `PolicyRecord 1.4`
values and one validated repository-authored synthetic profile bundle. It
stores a record once and produces two materially different synthetic
region/deployment/persona views containing record references only. Every
reference has a typed configuration-supported reason containing a rule or
configuration ID and version, an evidence reference, review state, temporal
scope, and explicit non-claims. A narrow pure `OutputAdapter<T>` interface can
consume a selected validated projection. No concrete output adapter is built.

This terminal state is not an analyzed corpus, production PNW profile, source
adapter, roster, UI, output implementation, release, or publication claim.

### Exact allowed paths

Only these paths may change:

- `src/engine/contracts.ts`
- `src/engine/projection.ts`
- `src/engine/index.ts`
- `schemas/projection-profile.schema.v1.json`
- `fixtures/engine/projection-profiles.synthetic.valid.json`
- `fixtures/engine/projection-profiles-malformed.invalid.json`
- `tests/engine/projection-schema.test.ts`
- `tests/engine/projection.test.ts`
- `tests/engine/projection-non-interference.test.ts`
- `scripts/validate-foundation.mjs`
- `docs/architecture.md`
- `ROADMAP.yaml`

The lead owns all writes. Read-only subagents receive no write lease. No other
path may change without stopping for a new owner decision.

### Prohibited paths and behavior

Do not change `package.json`, any lock file, `docs/data-contract.md`, existing
record/source/artifact/Nation schemas or fixtures, `config/`, `src/app/`,
`src/adapters/`, `src/contracts/`, `src/pipeline/`, `src/kernel/`,
`src/experimental/`, K0/S0/O0, hooks, skills, roles, workflows, deployment,
publication, or owner packet files. Do not add a dependency.

Do not use real Nations, an ATNI roster, Nez Perce facts, provider records,
network/source access, real geography, rights evidence, non-public visibility,
AI, keyword inference, legal or urgency inference, community-position claims,
or a concrete document/web/app/structured output implementation.

### Required contracts

Define closed, readonly, versioned forms of:

- `RegionPack`: stable ID/version, exact known source IDs, taxonomy-version
  IDs, and authority-qualified synthetic jurisdiction references;
- `CommunityDeploymentProfile`: stable ID/version, `synthetic_demo` or
  `candidate` authority state, one region-pack reference, and deterministic
  watch-rule references;
- `PersonaProjection`: stable ID/version, public-only visibility, and output
  adapter IDs that cannot alter facts;
- `CommunityRelevanceAssertion`: allowed typed basis, rule/configuration ID and
  version, evidence reference, review state, temporal scope, and explicit
  non-claims;
- `ProjectedRecordReference` and `DeploymentView`: record IDs only, grouped by
  deployment/persona with no copied record;
- `EngineProjection`: one unchanged `PolicyRecord[]` plus deterministic
  reference-only views; and
- `OutputAdapter<T>`: stable ID/version plus a pure
  `produce(projection, viewId)` boundary, with no concrete adapter.

The JSON Schema validates the synthetic profile bundle. Runtime code parses
only validated shapes, rejects unknown/duplicate/cross-profile references, and
does not import presentation, source-adapter, K0, S0, or O0 modules.

### Fixtures, tests, and evidence

The valid fixture must contain at least two materially different impossible
synthetic region/deployment/persona configurations that can reference the same
existing synthetic record for distinct configuration-supported reasons. The
malformed fixture family must cover malformed IDs and versions, duplicates,
unknown source/taxonomy/profile/rule/output references, unsupported visibility,
and invalid cross-profile links. Keep all data obviously synthetic.

Objective tests must prove:

1. valid profiles pass and every malformed case fails closed without a partial
   projection;
2. fixed inputs produce byte-stable canonical output regardless of set-like
   input order;
3. every input record's canonical bytes/digest are unchanged;
4. the same record exists once and both views reference it by stable ID;
5. changing deployment/persona configuration requires no source-adapter change;
6. every reason carries the required configuration, evidence, review,
   temporal, and non-claim fields;
7. unknown source and taxonomy references reject;
8. persona/output choices cannot mutate source identity, taxonomy,
   associations, lifecycle/history, status, or provenance;
9. engine imports exclude app presentation, adapters, K0, S0, and O0; and
10. every existing test and artifact behavior remains unchanged.

### Compatibility, migration, privacy, and failure behavior

This is an additive seam. Keep `PolicyRecord 1.4`, artifact package `1.4`,
source registry `1.19`, current app types, and current generated artifact bytes
compatible and unchanged. No stored value is migrated, renamed, duplicated, or
reclassified. The profile schema begins at its own `1.0.0`; any future semantic
break requires a new version, fixture migration, consumer review, and roadmap
decision.

Reject unknown fields and references, duplicate stable IDs, unsupported
authority/visibility states, invalid temporal scopes, missing non-claims, and
any attempt to copy/mutate a record. Fail atomically and deterministically.
Never make best-effort guesses. The engine consumes no private data, land
geometry, credentials, personal/contact fields, raw provider bodies, or
non-public profile values, and emits no telemetry or network call.

### Required successful terminal roadmap shape

Do not rediscover or improvise the post-tranche ledger. If and only if all
PNW-01 acceptance evidence passes, the terminal roadmap must have exactly this
shape:

- `G-PNW-IMPLEMENTATION` is `approved` with the exact owner authorization as
  evidence; no other gate changes;
- `PNW-01-ENGINE-SEAMS` is `complete` with objective implementation, test,
  review, and commit evidence;
- `PNW-02-REGIONAL-REGISTRY` remains `blocked` solely by
  `G-PNW-ATNI-59-ROSTER`;
- `PNW-03-GEOGRAPHY-RIGHTS`, `PNW-04-TAXONOMY`, and
  `PNW-05-SOURCE-PACK` are promoted to `ready` because their PNW-01 dependency
  is complete; this status does not authorize them in the completed run;
- `PNW-06-LIFECYCLE-REFRESH` through `PNW-10-REGIONAL-RC` remain
  `not_started` behind their incomplete dependencies;
- `current_focus.work_item` is `null`, its terminal reason states that PNW-01
  completed and successor work needs separate exact authorization, and its
  four retained legacy `resumable_roots` remain unchanged;
- `finish_states.pnw_regional_engine.current_state` is `in_progress` with no
  `blocked_by` field, because useful dependency-ready PNW work exists but no
  successor is active;
- `finish_states.repository_backbone` stays `complete`, the retained local
  release stays `blocked`, and public beta stays `blocked`; and
- `next_actions` contains these eight roots exactly once in priority order:
  `B2-REVIEW`, `B4-FR-UX`, `B5-WA-LWS-ADAPTER`, `B5-WA-RULES`,
  `PNW-02-REGIONAL-REGISTRY`, `PNW-03-GEOGRAPHY-RIGHTS`,
  `PNW-04-TAXONOMY`, and `PNW-05-SOURCE-PACK`.

Expected aggregate work-item counts are 63 total: 30 `complete`, 0
`in_progress`, 3 `ready`, 16 `blocked`, 0 `deferred`, and 14 `not_started`.
The roadmap validator has a regression for this zero-active successful stop.
If the observed graph cannot take this shape without changing another item,
gate, dependency, or path, stop with a non-success disposition.

## Assigned execution model

Use one `gpt-5.6-sol` Ultra lead writer and at most three bounded read-only
subagents, consistent with the verified four-slot environment:

1. architecture/schema reader: inspect the allowed contract closure and
   existing record/schema consumers, then return finite interface/reference
   risks;
2. deterministic/non-interference test reader: design counterexamples and
   expected proofs without editing; and
3. independent sovereignty/adversarial reviewer: after integration, inspect
   the entire candidate diff and return `APPROVE_PNW_01` or a finite defect
   list with closure evidence.

The lead owns `ROADMAP.yaml`, integration, every write, validation, commits,
and the terminal disposition. Subagent findings are evidence leads, not
authority or completion. Do not nest delegation.

The repository source-review skill is not applicable because this tranche must
not introduce or access a source. If a source claim becomes necessary, stop;
do not broaden the run. Use all five current hooks after reviewing/trusting the
exact definitions. Their tests prove handler/config behavior only—not client
trust, event delivery, security containment, acceptance, or completion.

## Execution and validation sequence

1. Verify owner authorization contains the exact PNW-01/no-other-gate wording.
2. Read `AGENTS.md`, the complete `ROADMAP.yaml`, the project backbone, PNW
   contract, data-contract catalog, architecture, this handoff, and relevant
   schemas/runtime/tests. Reconcile Git and protected hashes.
3. Run `npm run validate:roadmap`, `npm run validate:backbone`, and
   `npm run validate:foundation` before mutation.
4. Set only `G-PNW-IMPLEMENTATION` to `approved`, mark only PNW-01
   `in_progress`, set it as `current_focus`, and validate the ledger.
5. Launch the two bounded read-only design/test readers. Publish a path manifest
   and implement the smallest complete increment only in the allowed paths.
6. Run focused checks after each material change:

   ```powershell
   npm run validate:foundation
   npm run test:unit -- tests/engine/projection-schema.test.ts tests/engine/projection.test.ts tests/engine/projection-non-interference.test.ts
   npm run typecheck
   npm run scan:source
   ```

7. Freeze the candidate and run the independent read-only reviewer. Repair
   only finite defects inside the same path boundary and obtain approval.
8. Run `git diff --check`, `npm run hooks:test`, `npm run format:check`,
   `npm run lint`, `npm run typecheck`, `npm run validate:roadmap`,
   `npm run validate:backbone`, `npm run validate:foundation`,
   `npm run scan:source`, `npm test`, `npm run build`,
   `npm run validate:artifact`, and finally a serialized
   `VITEST_MAX_WORKERS=1 npm run check`. Record exact counts and artifact ID.
9. Verify protected hashes, no forbidden imports/fields/paths, no remote or
   external operation, exact diff/stage contents, and unchanged existing
   artifact behavior.
10. Mark PNW-01 complete only from objective evidence. Promote dependency-ready
    successor items into the exact successful terminal roadmap shape above,
    leave zero items in progress, and do not begin a successor tranche. Commit
    only allowed paths; cite the implementation commit in a follow-up
    ROADMAP-only commit without amending history.
11. Return one exact PNW-01 disposition and stop.

If PowerShell is used for the serialized command, save and restore any existing
`VITEST_MAX_WORKERS` value rather than leaving a session-wide environment
change. A browser rerun is not required because PNW-01 cannot change UI paths;
record that bounded skip. Do not claim deterministic generated-byte identity
unless the exact repeated-build evidence supports it.

## Context conservation and stop conditions

Before any compaction or long pause, update the roadmap with HEAD/status,
current focus, completed work, remaining questions, agents, gates, changed
paths, validation debt, and the exact next command; then run both roadmap and
backbone validators. After recovery, reread authority and recheck Git before
continuing. Do not rely on chat memory.

Stop without expanding scope if:

- exact PNW-01 owner authorization is absent or ambiguous;
- the starting tree has unexplained tracked changes or protected hash drift;
- implementation needs any path outside the exact list;
- a real roster/profile/Nation/source/geography/rights/private value or network
  call appears necessary;
- compatibility requires a record, artifact, app, source, K0/S0/O0, dependency,
  or migration change;
- a typed reason would imply association, legal applicability, rights impact,
  jurisdiction, urgency, comprehensive coverage, or community position;
- schema/runtime parity, determinism, non-interference, source scan, tests,
  build, artifact validation, or independent review has an unresolved material
  defect; or
- a later item would need to start to make the ledger pass.

Allowed terminal dispositions for the implementation run are exactly:

- `PNW_01_ENGINE_SEAMS_COMPLETE_NEXT_AUTHORIZATION_REQUIRED`
- `PNW_01_ENGINE_SEAMS_OWNER_DECISION_REQUIRED`
- `PNW_01_ENGINE_SEAMS_REJECTED_MATERIAL_DEFECTS`

## Copy-paste launch prompt for a fresh session

```text
Use gpt-5.6-sol at Ultra effort in I:\policy-sentinel.

The owner authorizes exactly PNW-01-ENGINE-SEAMS under docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md: its exact capability, twelve allowed paths, synthetic fixtures, tests, compatibility/privacy/failure rules, stop conditions, and no-other-gate boundary. This authorization does not extend to PNW-02 or later work, source/network access, K0/S0/O0 convergence, dependencies, app/artifact/source changes, remotes, deployment, or publication.

Begin with repository truth, not chat memory. Read AGENTS.md and ROADMAP.yaml completely, then docs/PROJECT-BACKBONE.md, docs/pnw-scope-and-acceptance.md, docs/data-contract.md, docs/architecture.md, docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md, and the complete launch handoff. Reconcile main, exact HEAD and parent, status, worktrees, remotes, relevant commits, any present owner-packet preservation, and the protected K0/S0/O0 hashes. The packet itself is not required once its direction is committed. Run npm run validate:roadmap, npm run validate:backbone, and npm run validate:foundation before mutation. Stop if authority or repository truth differs materially.

Open only G-PNW-IMPLEMENTATION for this tranche, mark only PNW-01 in progress, and publish the exact path manifest. Use one lead writer. Launch bounded read-only architecture/schema and deterministic/non-interference readers; after integration use a separate read-only sovereignty/adversarial reviewer. Do not use the source-review skill because no source work is allowed. Do not nest delegation or give a subagent a write lease.

Implement the smallest complete additive seam: readonly RegionPack, CommunityDeploymentProfile, PersonaProjection, CommunityRelevanceAssertion, ProjectedRecordReference, DeploymentView, EngineProjection, and pure OutputAdapter<T> contracts; a closed 1.0.0 synthetic profile-bundle schema; atomic validation; and deterministic reference-only projection. Reuse unchanged validated PolicyRecord 1.4 material. Store each record once. Prove two materially different impossible synthetic views can reference the same record for distinct typed configuration-supported reasons. Do not create a concrete output adapter.

Change only: src/engine/contracts.ts; src/engine/projection.ts; src/engine/index.ts; schemas/projection-profile.schema.v1.json; fixtures/engine/projection-profiles.synthetic.valid.json; fixtures/engine/projection-profiles-malformed.invalid.json; tests/engine/projection-schema.test.ts; tests/engine/projection.test.ts; tests/engine/projection-non-interference.test.ts; scripts/validate-foundation.mjs; docs/architecture.md; ROADMAP.yaml. No other path is authorized.

Exercise every representative, missing, malformed, duplicate, unknown-reference, unsupported-visibility, deterministic-order, unchanged-record-digest, same-record-two-views, configuration-independence, nonclaim, forbidden-import, privacy, and failure case specified in the handoff. Preserve PolicyRecord 1.4, artifact 1.4, source registry 1.19, existing app/artifact behavior, every protected contract, and every closed gate.

Use the focused and full validation sequence in the handoff, obtain independent APPROVE_PNW_01, verify exact diff/stage paths and protected hashes, and commit only authorized changes. Use a follow-up ROADMAP-only commit for implementation-commit evidence; never amend. At the terminal checkpoint mark PNW-01 complete only if evidence passes, then apply the handoff's exact successful roadmap shape: PNW-02 blocked; PNW-03/04/05 ready but not authorized or started; PNW-06 through PNW-10 not started; PNW finish in_progress; zero current focus; and the exact eight-root next_actions queue. Stop for separate owner authorization. Report exact Git state, capability delta, agents, files, commits, commands/results/counts/artifact ID, proof limits/skips, gates, protected evidence, blockers, and next owner action.

Return exactly one: PNW_01_ENGINE_SEAMS_COMPLETE_NEXT_AUTHORIZATION_REQUIRED, PNW_01_ENGINE_SEAMS_OWNER_DECISION_REQUIRED, or PNW_01_ENGINE_SEAMS_REJECTED_MATERIAL_DEFECTS. Do not begin another tranche.
```

## Exact owner action required

To launch, the owner must say:

`Authorize exactly PNW-01-ENGINE-SEAMS under docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md, including its allowed paths, tests, stop conditions, and no other gate or action.`

Anything broader, anticipatory, or implicit leaves `G-PNW-IMPLEMENTATION`
closed.
