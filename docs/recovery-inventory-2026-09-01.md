# R0 custody recovery inventory

Status: reviewed and checkpointed 2026-09-01.

## Baseline and authority

The pre-mutation baseline was local commit
`f6eb61f265823f25be6cabddc379e5461ebd44ba` with 73 unstaged paths: 51
modified tracked files and 22 untracked files represented by 11 short-status
roots. The long-running program's earlier 21-file/10-root count described the
tree before that program file itself became the twenty-second untracked file.

The owner supplied both report files and instructed Codex to execute the
long-running program. That instruction authorized local R0 inventory, repair,
reconciliation, reproduction, and checkpoints. It did not open any remote,
publication, credential, terms, provider, paid/contact, private/land, AI, or
notification gate. K0 and S0 remain post-R0 owner decisions.

No path remained unattributed after content, dependency, Git-history, roadmap,
test, and artifact review. Git could not identify the human author of unstaged
hunks; the provenance below is functional custody, not a claim of authorship.

## Path manifest

Each group applies the listed custody fields to every path beneath it. `M`
means modified relative to the baseline commit and `A` means untracked at the
baseline.

### Ledger, documentation, and owner reports — 12 paths

- Likely work: mixed D-042 through D-045, B8 ledger catch-up, H-HANDOFF, and
  owner-supplied R0 reports.
- Class: ledger, binding/supporting documentation, source review, and reports.
- Relationship to baseline: later work-item evidence and execution guidance;
  the two report files had no Git history.
- Provenance status: clear after owner instruction and repository review.
- Dependencies: these documents describe the implementation groups below;
  `ROADMAP.yaml` is the canonical status ledger.
- Checkpoint: implementation documentation in `a47b380`; terminal ledger in
  `7974906`; authority/report handoff in `5fd48ed`.
- Unresolved custody question: none.

Paths:

- `M ROADMAP.yaml`
- `M docs/architecture.md`
- `M docs/continuation-prompt.md`
- `M docs/data-contract.md`
- `M docs/data-governance.md`
- `M docs/decision-register.md`
- `M docs/source-coverage.md`
- `M docs/source-feasibility.md`
- `M docs/source-reviews/washington-centennial-accord-2026-07-31.md`
- `M docs/ux-spec.md`
- `A docs/policy-sentinel-sol-ultra-deep-dive-prompt.md`
- `A docs/policy-sentinel-long-running-development-program-2026-09-01.md`

### Shared implementation collision set — 10 paths

- Likely work: D-042 Accord model, D-044 Nation pre-gate hardening, and D-045
  URL/focus hardening.
- Class: schema, validator, pipeline, shared contract, client, and tests.
- Relationship to baseline: interleaved compatible additions in the same files.
- Provenance status: clear by exact symbols, fixtures, tests, and roadmap
  acceptance evidence.
- Dependencies: the modified files import or validate new files from the
  exclusive groups below; they cannot form safe path-only partial commits.
- Checkpoint: one atomic recovered implementation, `a47b380`.
- Unresolved custody question: none.

Paths:

- `M schemas/artifact.schema.v1.json`
- `M scripts/validate-artifact.mjs`
- `M src/pipeline/artifact.mjs`
- `M src/pipeline/policy-validation.mjs`
- `M src/shared/contracts.ts`
- `M tests/pipeline/artifact-validator-hardening.test.mjs`
- `M src/app/App.tsx`
- `M src/app/components/RecordCard.tsx`
- `M tests/app/accessibility.test.tsx`
- `M tests/app/federal-register-ux.test.tsx`

### B2 Nation pre-gate exclusive set — 5 paths

- Likely work: D-044 / B2-PREGATE-HARDENING.
- Class: production/synthetic Nation policy, type declaration, integration, and
  negative tests.
- Relationship to baseline: new fail-closed Nation collection boundary and its
  pipeline aggregation.
- Provenance status: clear.
- Dependencies: artifact validation imports the new policy module; the
  aggregate test invokes its Node suite.
- Checkpoint: `a47b380`.
- Unresolved custody question: none.

Paths:

- `M src/pipeline/policy-validation.d.mts`
- `M tests/pipeline/pipeline.test.ts`
- `A src/pipeline/nation-collection-policy.d.mts`
- `A src/pipeline/nation-collection-policy.mjs`
- `A tests/pipeline/nation-collection-policy.test.mjs`

### B4 URL and focus exclusive set — 3 paths

- Likely work: D-045 / B4-UX-PREGATE-HARDENING.
- Class: client routing/control code and tests.
- Relationship to baseline: additive hash-state, selection, focus restoration,
  and Nation-picker clear behavior.
- Provenance status: clear.
- Dependencies: shared App, RecordCard, accessibility, and Federal UX files are
  in the collision set.
- Checkpoint: `a47b380`.
- Unresolved custody question: none.

Paths:

- `M src/app/components/NationPicker.tsx`
- `M src/app/routing.ts`
- `A tests/app/routing.test.ts`

### B5 Accord model and disabled adapter set — 43 paths

- Likely work: D-042/D-043 / B5-WA-ACCORDS.
- Class: registry, schemas, synthetic fixtures, disabled adapter, client model,
  pipeline/LKG integration, and tests.
- Relationship to baseline: record/artifact 1.4 and registry 1.19 migration,
  plus a bounded GOIA adapter retained disabled.
- Provenance status: clear by the fictional fixture, exact adapter contract,
  fake transport/DNS tests, and source review.
- Dependencies: the registry points to the new fixture and adapter; client and
  pipeline tests require the 1.4 shared collision set.
- Checkpoint: `a47b380`.
- Unresolved custody question: none. Provider activation and Nation signatory
  association remain separately closed, not custody questions.

Paths:

- `M config/sources.v1.json`
- `M fixtures/records/county-explicit.valid.json`
- `M fixtures/records/general-jurisdiction.valid.json`
- `M fixtures/sources/synthetic-refresh.valid.json`
- `A fixtures/records/intergovernmental-accord.valid.json`
- `A fixtures/sources/washington-centennial-accord/centennial-accord.valid.html`
- `M schemas/record.schema.v1.json`
- `M schemas/source.schema.v1.json`
- `M scripts/validate-foundation.mjs`
- `M src/adapters/federal-register/normalize.ts`
- `M src/adapters/supreme-court-opinions-curated/normalize.ts`
- `M src/adapters/washington-governor-executive-orders/normalize.ts`
- `M tests/adapters/federal-register/adapter.test.ts`
- `M tests/adapters/supreme-court-opinions-curated/normalize.test.ts`
- `M src/app/csv.ts`
- `M src/app/data.ts`
- `M src/app/policy.ts`
- `M src/app/present.ts`
- `M src/app/types.ts`
- `M src/pipeline/last-known-good.mjs`
- `M tests/app/compact-record-contract.test.ts`
- `M tests/app/csv.test.ts`
- `M tests/app/data-integrity.test.ts`
- `M tests/app/judicial-context.test.tsx`
- `M tests/app/policy.test.ts`
- `A tests/app/accord-context.test.tsx`
- `M tests/pipeline/artifact-schema-compatibility.test.ts`
- `M tests/pipeline/last-known-good-hardening.test.mjs`
- `M tests/pipeline/pipeline.test.mjs`
- `M tests/pipeline/source-registry.test.mjs`
- `A src/adapters/washington-centennial-accord/constants.ts`
- `A src/adapters/washington-centennial-accord/errors.ts`
- `A src/adapters/washington-centennial-accord/index.ts`
- `A src/adapters/washington-centennial-accord/normalize.ts`
- `A src/adapters/washington-centennial-accord/query-contract.ts`
- `A src/adapters/washington-centennial-accord/response-contract.ts`
- `A src/adapters/washington-centennial-accord/transport.ts`
- `A tests/adapters/washington-centennial-accord/adapter.test.ts`
- `A tests/adapters/washington-centennial-accord/normalize.test.ts`
- `A tests/adapters/washington-centennial-accord/query-contract.test.ts`
- `A tests/adapters/washington-centennial-accord/response-contract.test.ts`
- `A tests/adapters/washington-centennial-accord/test-helpers.ts`
- `A tests/adapters/washington-centennial-accord/transport.test.ts`

The group counts are disjoint and sum to 73. Generated `dist/` output was
ignored and was not part of the custody baseline or any commit.

## R0 checkpoint and validation disposition

The collision analysis rejected speculative hunk-level feature partitioning.
The accepted sequence was:

1. `a47b380` — atomic August contract, Accord, Nation, and UX recovery;
2. `7974906` — LWS terminal accounting plus exact-set validator regression;
3. `5fd48ed` — final R0 documentation/ledger checkpoint: authority reconciliation,
   reports, inventory, and current evidence.

Current rerun evidence, not the historical August claims:

- `npm run check`: 51 Vitest files and 758 tests passed; the build emitted 3
  synthetic records, 575 synthetic Nations, and 8 verified artifact assets
  under build ID `synthetic-44968aef1314a19e30fc`.
- Two fixed-time artifact replays produced the same build ID and byte-identical
  hashes for all 9 generated JSON files.
- The final build contains 12 files, no source maps, no credential signatures,
  only `.invalid` synthetic data hosts, and no prohibited public-data keys.
- `npm ls --all --parseable` reported a valid 338-path dependency tree;
  `npm audit --offline --json` reported zero known vulnerabilities.
- The exact in-app Browser backend remained unavailable after documented
  discovery troubleshooting. The available Brave extension was not substituted,
  so `G-LOCAL-BROWSER` remains pending.

R0 changes opened no external gate and made no production-source or public-beta
claim.
