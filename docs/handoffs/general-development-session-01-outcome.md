# General development session 1 outcome: governance and refactor wave 1

Prepared by the lead session (Claude Opus 5.5) that executed the owner's
session-1 launch prompt on branch `realign/general-development`. It records
what changed, every commit, the commands run and their real outcomes, and every
gate that stays closed. It authorizes nothing by itself; the decision register
and `ROADMAP.yaml` carry the authority.

## Terminal disposition

`GD_SESSION_01_GOVERNANCE_AND_WAVE_1_COMPLETE`

Governance steps 1 to 6 and refactor wave 1 are done. The owner's rulings are
in the decision register as D-071 to D-079; `AGENTS.md` carries the two
amended rule sentences; `ROADMAP.yaml` is at schema 1.10 with the
general-development graph admitted by rule. GD-01 (characterization tests),
GD-02 (module boundary test) and GD-03 (boundary-guard tests) are complete,
each with a `gd-lane` implementation and a `gate-verifier` PASS. The ledger
ends at a terminal checkpoint with zero `in_progress` items. No production
source file changed in wave 1; nothing was pushed, tagged, merged or rebased;
no network acquisition, source activation, credential, private data or land
field was involved.

## Start and end state

| Item | Value |
| --- | --- |
| Branch | `realign/general-development`, one worktree, no remote |
| Start commit | `ab6aefd` (Record phase 3 commit in the audit session ledger) |
| End commit | the commit that adds this completed document, directly after `e07c5c4`; recover it with `git log -1 -- docs/handoffs/general-development-session-01-outcome.md` |
| Working tree at end | only the pre-existing untracked owner inputs under `docs/` (34 files including `docs/policy-sentinel-selected-records.csv` and `docs/development/GRAND-DEMO-20260914-POLICY-CLEANUP.md`), untouched |
| Ledger at end | schema 1.10; 105 work items, 61 gates; complete 47, in_progress 0, ready 8, blocked 21, deferred 2, not_started 27 |
| Runtime | Windows x64, Node 24.19.0, npm 12.0.2 |

## What changed

- **Housekeeping:** the private 2026-09-19 handoff note moved out of the
  repository (RL-03); the two pre-existing modifications committed as adopted
  work (RL-02); the owner's drop-in files committed with two formatting
  repairs (S1-F1, S1-F2).
- **Decision register:** D-071 to D-079 transcribe RL-01, RL-04 to RL-11; O-023
  closed in modified form by D-074; status lines on D-004 and D-010.
- **Rules:** `AGENTS.md` ledger sentence (D-071) and land-data sentence
  (D-072).
- **Ledger schema 1.10:** the admit-by-rule validator extension, 32 new
  validator test cases, four gates, 24 items GD-00 to GD-23.
- **Wave 1 (tests only, no production code):**
  `tests/pipeline/policy-local-output-replay.test.mjs` (GD-01),
  `tests/architecture/module-manifest.mjs`, `.d.mts` and
  `module-boundaries.test.ts` plus the extended Makah non-interference scan
  (GD-02), `tests/core/boundary-guard.test.ts` (GD-03).
- **Continuation prompt:** the ledger-status paragraph now describes schema
  1.10 and the wave 1 checkpoint.

## Commits

| Commit | Committed | Purpose |
| --- | --- | --- |
| `0409392` | 2026-09-24T08:41:05-07:00 | Adopt pre-existing: readOwnedFile cleanup preservation and eight cases (RL-02) |
| `5f73162` | 2026-09-24T08:41:20-07:00 | Adopt owner-supplied realignment files: rulings, addendum, instruction files (RL-13) |
| `d8a670a` | 2026-09-24T08:42:52-07:00 | Transcribe realignment rulings RL-01 to RL-11 as D-071 to D-079 |
| `9a25d76` | 2026-09-24T08:43:31-07:00 | Amend the AGENTS.md ledger and land-data rules per D-071 and D-072 |
| `3499feb` | 2026-09-24T09:00:40-07:00 | Represent general development at roadmap schema 1.10, admitted by rule |
| `260bc47` | 2026-09-24T09:02:33-07:00 | Activate GD-01 characterization tests in the ledger |
| `b32d5f6` | 2026-09-24T09:28:45-07:00 | GD-01: characterization tests for local-output replay, write and read |
| `33aff12` | 2026-09-24T09:31:28-07:00 | Record GD-01 complete in the ledger |
| `5345a0c` | 2026-09-24T09:33:19-07:00 | Activate GD-02 module boundary test in the ledger |
| `2093cf3` | 2026-09-24T10:36:08-07:00 | GD-02: module manifest and boundary test (report mode) with enforcing public-entry reachability |
| `43c9a25` | 2026-09-24T10:38:17-07:00 | Record GD-02 complete and promote wave 2 items to ready |
| `3f8d77e` | 2026-09-24T10:38:49-07:00 | Activate GD-03 boundary-guard tests in the ledger |
| `ac8ff44` | 2026-09-24T10:53:31-07:00 | GD-03: shared boundary-guard tests, written before the GD-04 guard |
| `e07c5c4` | 2026-09-24T10:54:30-07:00 | Record GD-03 complete and close refactor wave 1 in the ledger |
| (this commit) | see `git log` | Complete the session 1 outcome and update the continuation prompt |

Nothing was pushed, tagged, merged, rebased or amended. No remote exists.

## Commands and real outcomes

| Command | Baseline (at `ab6aefd`) | Final |
| --- | --- | --- |
| `npm test` | exit 0 in 289 s; node suites 13/13, 30+1 skipped/31, 115/115, 100/100, 26/26, 129/129, 31/31; Vitest 97 files, 1617 tests | exit 0 in 248 s; node suites 13/13, 30+1 skipped/31, 121/121, 100/100, 26/26, 129/129, 31/31; Vitest 99 files, 1622 passed and 80 skipped (the GD-03 guard tests awaiting GD-04) |
| `npm run validate:roadmap` | exit 0; 81 items, 57 gates; complete 43, in_progress 0, ready 1, blocked 18, deferred 2, not_started 17 | exit 0; 105 items, 61 gates; complete 47, in_progress 0, ready 8, blocked 21, deferred 2, not_started 27 |
| `npm run validate:backbone` | exit 1: four `.local/handoff/HANDOFF.md` link escapes and two agent-file raw-HTML findings (S1-F1) | exit 0; 22 schemas, 1346 refs, 134 Markdown files, 854 local links |
| `npm run build` | not run at baseline | exit 0 in 2 s; 3 records, 575 Nations, 8 assets; build ID `synthetic-dfa2c35b892e2d450e03` |

Typecheck, lint, format:check and scan:source passed at every step
(`gate-verifier` ran them three times; the lead ran them at step 6).
`npm run hooks:test` passed 18/18 at step 6. Logs are in
`C:\dev\_scratch\policy-sentinel\session-01\`.

## Roles, agents and leases

- Lead (this session): governance steps 1 to 6, every ledger and register
  edit, every commit, and two small repairs inside lane-owned files after
  verification (GD-01 temporary path, GD-02 missing-directory skip narrowed).
- `gd-lane` (three runs, one per wave 1 step): each edited only its step's
  files; GD-02 added one companion `.d.mts` beyond its row, accepted. No lane
  staged or committed.
- `gate-verifier` (three runs): read-only, each PASS. One verifier command
  briefly created `I:\dummy` outside the repository and deleted it; confirmed
  absent.
- `source-scout`: not used (per the launch prompt).
- All leases returned; no subagent is running.

## Findings

- **S1-F1:** the owner-supplied agent files failed `validate:backbone`
  (placeholders read as raw HTML). Repaired with code spans.
- **S1-F2:** `CLAUDE.md` and the three agents failed `format:check` as
  supplied. Repaired with Prettier (reflow only).
- **S1-F3:** `docs/PROJECT-BACKBONE.md` (lines 10 and 259) and
  `docs/architecture/module-boundaries.md` section 9.4 still say the ledger is
  at schema 1.9 with general development unrepresented. Left for GD-15; the
  continuation prompt flags it.
- **S1-F4:** the design's GD-03 row ("tests written first") and "standing
  checks stay green" conflict for a guard that does not yet exist. Resolved by
  skip-until-present tests (80 skipped until GD-04).
- **S1-F5:** the ledger's statuses differ from the launch prompt's prediction
  in four places (GD-17 and GD-18 ready; GD-19 and GD-23 not_started; GD-22's
  authorization gate); reasons are in the step 6 ledger entry.
- **S1-F6:** five loose PDFs sit at the root of
  `I:\policy-sentinel-corpus-real-policy`, outside any run root; not opened.

## Gates still closed and operations confirmed absent

Closed and unchanged: `G-GD-NATIONWIDE-CONTRACT`, `G-GD-INTEROP` (new this
session); `G-PS09-RUN-06`, `G-PS09-RUN-07`, `G-PS09-RUN-08`, `G-PS09-RC`
(local release); `G-K0-S0-CONVERGENCE`, `G-O0-CONVERGENCE` (vision
convergence); `G-B`, `G-B-GRANTS`, `G-B-CONGRESS`, `G-B-GOVINFO`,
`G-B-REGULATIONS`, `G-B-OR-OJD`, `G-B-OR-OARD`, `G-B-OR-GOVERNOR`, `G-C`
(credentials and terms); `G-E`, `G-E-LICENSE`, `G-E-REMOTE-PUSH`,
`G-E-PAGES`, `G-E-PUBLISH` (remote and publication); `G-F` (paid or licensed
sources); `G-G` (private or Nation-supplied material); `G-H` (AI summaries);
`G-I` (outbound notification); `G-PNW-COMMUNITY-AUTHORITY`,
`G-PNW-SOURCE-ACTIVATION`. Still pending evidence: `G-BIA-IDENTITY`, `G-J`,
`G-D`, `G-RC`, `G-LOCAL-BROWSER` and the other evidence gates. All six
external boundaries (`EXT-GITHUB`, `EXT-CREDENTIALS`, `EXT-COST-CONTACT`,
`EXT-PRIVATE`, `EXT-AI`, `EXT-NOTIFY`) stay closed. PS09-02 stays blocked and
PS09-06 unstarted.

Confirmed absent this session: push, tag, merge, rebase, amend, remote;
network acquisition or any provider request; source admission or activation;
credentials; private data; land fields; new JSON under `config/`; any change
under `src/kernel`, `src/experimental`, `docs/vision` or the private-context
files.

The two v2 source reviews in `config/policy-sources.v2.mjs` expire 2026-10-05
(`govinfo-direct` and `washington-legislative-text`) and 2026-10-15
(`federal-court-opinions-direct`). Nothing here acquires anything; no action
taken.

## Next bounded action

- **Session R (RL-14):** GD-17 (nationwide source survey, documentation only,
  with the `source-scout` agent writing to `docs/source-reviews/nationwide/`)
  and GD-18 (storage capacity model and `storage:report`). First step: activate
  GD-17 in the ledger, then run `source-scout` for the federal family first
  (Federal Register, GovInfo, eCFR, Regulations.gov, Congress.gov).
- **Session 2 (RL-14):** wave 2 (GD-04 core boundary guard, which turns on the
  80 skipped GD-03 tests; GD-05 intake replay move; GD-07 research output
  split; GD-08 relevance extraction; GD-09 jurisdiction model), then wave 3
  (GD-06, GD-10). First step: activate GD-04, the lowest-priority ready item.
- Owner questions that shape those sessions: addendum section 12 (see the
  answers below) and the reconciliation of the operating model with the Claude
  Code agents (answer 5).

## Session ledger

Entries are appended at each checkpoint. After a context reset, recover from
this ledger, `git log` and `ROADMAP.yaml`.

### Preconditions

- Checkout: branch `realign/general-development`, HEAD
  `ab6aefdfe15fd7e5830ff37b8e1ec2dc036db32b` (the ledger follow-up after
  `6eb8947`). `git status --short` showed the four tracked modifications
  (`AGENTS.md`, `docs/continuation-prompt.md`,
  `src/pipeline/policy-local-output.mjs`,
  `tests/pipeline/policy-assurance.test.mjs`) and the untracked `.claude/`,
  `CLAUDE.md`, the rulings, the addendum, 34 owner-direction inputs under
  `docs/` and `docs/policy-sentinel-selected-records.csv`.
- Owner drop-ins: all present. `CLAUDE.md`, `AGENTS.md`,
  `docs/continuation-prompt.md`,
  `docs/decisions/2026-09-22-realignment-rulings.md`,
  `docs/architecture/general-development-addendum-2026-09-22.md`,
  `.claude/agents/gd-lane.md`, `gate-verifier.md`, `source-scout.md`. None
  missing.
- `git diff 6eb8947 -- AGENTS.md`: one hunk (`@@ -1,74 +1,24 @@`) that ends
  above `## Purpose and phase gate` (line 23 now, line 73 before). Every rule
  line below the heading is unchanged. Precondition passed.
- `git diff 6eb8947 -- docs/continuation-prompt.md`: the rewrite carries the
  three PS09 and Makah recovery paragraphs that moved out of `AGENTS.md`. Not
  carried into the new prompt or into `AGENTS.md`, listed here for the owner to
  decide (not restored):
  1. The old opening "Current state (2026-09-15)" paragraph (Makah launch 02
     executed, schema 1.9, ten receipts).
  2. The old "Latest PS09 recovery" paragraph's pointers to the
     [engineering review 02 journal](../development/PS09-ENGINEERING-REVIEW-02.md)
     and [acceptance delta](../development/ps09-engineering-review-02-acceptance-delta.md).
  3. The old "Prior recovery" paragraph pointing at the
     [knowledge assurance journal](../development/PS09-KNOWLEDGE-ASSURANCE-01.md).
  4. The old "Discovery recovery" details: the discovery execution journal
     pointer, the ten axe incompletes closed by manual review, and the
     preserved-history list (adopted launch, research synthesis, earlier
     recovery guide, EV01 terminal handoff, Run 1 and Run 2 packets cannot
     resume).
  5. The old Makah paragraph's pointers to `schemas/makah-demo-doc.schema.v1.json`,
     the Fable 5.1 launch prompt, the TSDF provenance record location and the
     machine-only stage package path.
  6. Five whole sections: "Start and recover" (model selection note, the
     seven-step recovery read list including the corpus ADR, component
     dispositions, Run 1 coordination and custody manifest), "Current authority
     and single completion graph", "Product and implementation boundary" (Crow,
     Fort Peck/Fort Belknap, Nevada, Duwamish cohort notes; AnalyzedCorpus 1.1
     and CAS boundaries), "Frozen source and external boundaries" (do not repeat
     D3, R6, R7 or PF-01 to PF-17; do not issue FR-A1; the 27-request ledger
     and 43-file evidence set), and "Validation, custody and terminal handoff"
     (32 owner inputs, historical dispositions). Much of this is restated in
     `AGENTS.md` rules or the ROADMAP ledger, but not all of it (for example
     the "do not repeat D3/R6/R7/PF-01 to PF-17" instruction survives only in
     `ROADMAP.yaml` item evidence).
- Parent instruction files: `I:\AGENTS.md` exists (workspace policy, 1,327
  bytes); `I:\CLAUDE.md` does not exist; the user-level
  `~/.claude/CLAUDE.md` exists. Contents and conflicts are in "Answers for the
  owner".
- Logs: `C:\dev\_scratch\policy-sentinel\session-01\`.
- Baseline (Node 24.19.0, npm 12.0.2):
  - `npm test`: exit 0 in 289 s. Node suites: corpus 13/13, spine 30 passed
    plus 1 skipped of 31, policy 115/115, assurance 100/100, backbone 26/26,
    tier1 129/129, knowledge 31/31. Vitest: 97 files, 1617 tests passed.
  - `npm run validate:roadmap`: exit 0. 81 work items, 57 gates, 14 sources,
    23 binding paths; complete 43, in_progress 0, ready 1, blocked 18,
    deferred 2, not_started 17.
  - `npm run validate:backbone`: exit 1 with six issues. Four are the expected
    `.local/handoff/HANDOFF.md` link escapes. **Finding S1-F1:** the other two
    are new: `.claude/agents/gate-verifier.md uses 3 raw HTML tag(s)` and
    `.claude/agents/gd-lane.md uses 2 raw HTML tag(s)`. The angle-bracket
    placeholders (`<session-name>`, `<step-id>`, `<base>`, `<n>`, `<root>`)
    in plain prose are read as raw HTML by the validator's Markdown rule.

### Step 1: rulings read-through

- RL-01, ledger representation and refactor gate: D-071 in the register; the
  `AGENTS.md` ledger sentence; `scripts/validate-roadmap.mjs` and
  `tests/pipeline/roadmap-validator.test.mjs` for schema 1.10;
  `ROADMAP.yaml` (four gates, GD-00 to GD-23); the PS09 consolidation intent is
  recorded in D-071 as an intent only.
- RL-02, the two pre-existing modifications: step 3 commit of
  `src/pipeline/policy-local-output.mjs` and
  `tests/pipeline/policy-assurance.test.mjs`.
- RL-03, the private handoff note: step 2 move to
  `I:\policy-sentinel-review\2026-09-19\HANDOFF.md` and the
  `.git/info/exclude` line.
- RL-04, private context as a user-supplied module: D-072 (supersedes D-010's
  "documented but unimplemented" wording; D-068 keeps its scope); the added
  `AGENTS.md` data-rule sentence; gate G-GD-PRIVATE-CONTEXT; GD-02 classifies
  the seam files as module `private`. Module code itself is later sessions
  (GD-19, GD-23).
- RL-05, nationwide public contract: D-073 (supersedes D-004); gate
  G-GD-NATIONWIDE-CONTRACT stays closed; the contract work is GD-13 (later
  session).
- RL-06, area-based policy and the shapefile pipeline: D-074 (Design A
  generalized); O-023 closed in modified form by D-074; gate G-GD-INTEROP stays
  closed; the resolver and interop work are GD-16, GD-19 and GD-21 (later
  sessions).
- RL-07, shared Nation reference: D-075; GD-22 blocked on G-BIA-IDENTITY
  (later session, and the registry repository is outside this repository).
- RL-08, designations: D-076; GD-20 (later session).
- RL-09, storage budget and holding policy: D-077; GD-18 (session R).
- RL-10, Tribal law only as user-supplied data: D-078; bounds GD-17 (session R)
  and GD-23 (later session).
- RL-11, Canadian First Nations reserved: D-079; reservations land in GD-09 and
  GD-22 (later sessions).
- RL-12, Makah demo material: already applied; nothing touched this session.
- RL-13, instruction files and agents: the owner already created `CLAUDE.md`,
  trimmed `AGENTS.md` and added the three agents; this session commits them
  (see the step 3 entry) and uses `gd-lane` and `gate-verifier` in step 7.
- RL-14, session plan: this session is governance plus wave 1; session R
  (GD-17, GD-18), session 2 (waves 2 and 3) and session 3 (wave 4 and gated
  items) are later sessions.

No commit for step 1.

### Step 2: private handoff note (RL-03)

- Moved `.local/handoff/HANDOFF.md` to
  `I:\policy-sentinel-review\2026-09-19\HANDOFF.md` with `Move-Item` (the
  directory already existed). SHA-256 before and after is identical:
  `f7913fe1c0c284663db9fe1469e4b9445092b63ffe8afbe4264d934605acf1b0`. The empty
  `.local\handoff\` directory was left in place.
- Removed the `/.local/handoff/HANDOFF.md` line from `.git/info/exclude` (local,
  untracked file).
- S1-F1 repair: the backbone still failed on the two agent files after the
  move. The three placeholder-bearing paths and commands were wrapped in code
  spans in `.claude/agents/gd-lane.md` and `.claude/agents/gate-verifier.md`; no
  word changed.
- **Finding S1-F2:** `npm run format:check` failed on four owner drop-ins,
  `CLAUDE.md` and the three agent files, before any edit of mine to two of
  them. `npx prettier --write` on those four files reflowed lines only (and
  folded each agent `description` into a multi-line YAML scalar, which parses to
  the same string; checked with the `yaml` parser). No wording changed.
- `npm run validate:backbone`: exit 0 (22 schemas, 22 IDs, 1346 refs, 134
  Markdown files, 850 local links). `npm run format:check`: exit 0.
- Nothing to commit for the move itself (the note was never tracked; the
  exclude file is local). The formatting repairs are committed with the owner
  drop-ins in step 3.

### Step 3: pre-existing modifications (RL-02) and owner drop-ins

- Plain-language description of the diff (RL-02):
  1. `readOwnedFile` in `src/pipeline/policy-local-output.mjs` now runs its
     stat-and-read body through `withPreservedCleanup` from
     `policy-assurance.mjs` instead of `try/finally`, plus that one import.
  2. Effect: when both the read and the handle close fail, both errors are
     kept (the close error no longer hides the read error).
  3. `tests/pipeline/policy-assurance.test.mjs` adds eight cases (four stages
     times close succeeding or failing) that run the actual function body.
  4. This is exactly the "cleanup preservation in `readOwnedFile`" plus
     "eight associated cleanup cases" that the 2026-09-19 handoff lists
     (lines 179-181 of the moved note), and nothing more.
- Commit `0409392` "Adopt pre-existing: readOwnedFile cleanup preservation and
  eight cases" (the two files only).
- Commit `5f73162` "Adopt owner-supplied realignment files: rulings, addendum,
  instruction files": the rulings, the addendum, `CLAUDE.md`, the `AGENTS.md`
  top rewrite, the rewritten continuation prompt and the three agents, as
  supplied plus the S1-F1 and S1-F2 formatting repairs. None of these paths is
  in the protected owner-input custody list
  (`scripts/owner-input-custody.mjs`); committing them first lets the step 5
  `AGENTS.md` diff show only the two rule sentences. The launch prompt did not
  name this commit explicitly; it is recorded here as lead judgment.

### Step 4: decision register

- New section "General development decisions" in `docs/decision-register.md`
  after the Makah demo decisions, with nine rows: D-071 (RL-01, schema 1.10,
  `G-GENERAL-DEV-01` and the PS09 consolidation intent), D-072 (RL-04, private
  context as a user-supplied module), D-073 (RL-05, nationwide public
  contract), D-074 (RL-06, Design A generalized and the area resolver), D-075
  (RL-07, standalone Nation registry), D-076 (RL-08, designation registry),
  D-077 (RL-09, storage holding policy), D-078 (RL-10, Tribal law only
  user-supplied), D-079 (RL-11, Canadian First Nations reserved).
- Status lines only on existing entries: O-023 "closed 2026-09-22, adopted in
  modified form by D-074 (RL-06)"; D-004 "three-state coverage superseded by
  D-073"; D-010 "documented but unimplemented wording superseded by D-072". No
  entry was renumbered and no other existing text changed.
- `npm run validate:backbone`: exit 0 (853 local links). Prettier check on the
  two changed documents: clean.
- Commit recorded in the step 5 entry.

### Step 5: AGENTS.md rule sentences

- Step 4 was commit `d8a670a`.
- Ledger rule (RL-01): "Select only within the authorized canonical PS09 graph;
  an archived ready item is not an execution grant." became "Select only
  within an authorized canonical graph: the PS09 graph, or the
  general-development graph under G-GENERAL-DEV-01 once represented. An
  archived ready item is not an execution grant. (D-071)"
- Data rule (RL-04): after "Public builds must reject private adapter inputs."
  added "A locally run deployment may process such content only when the user
  supplies it, under the private-context module rules in
  `docs/architecture/general-development-addendum-2026-09-22.md`; a public
  build never can. (D-072)"
- `git diff -- AGENTS.md` shows only those two hunks. No test or hook pins the
  old sentence text. `npm run validate:backbone` exit 0; `npm run format:check`
  exit 0.
- Commit recorded in the step 6 entry.

### Step 6: schema 1.10 (RL-01, D-071)

- Step 5 was commit `9a25d76`.
- Design: admit-by-rule worked; the enumerated 1.7 to 1.9 fallback was not
  needed. The rule lives in `scripts/validate-roadmap.mjs` in one block placed
  before the frozen digests. An item under milestone `General development` is
  admitted when its id matches `GD-nn-NAME`, it carries
  `work_class: general_development_local`, a `decision_ref` that matches a
  `| D-nnn |` row of `docs/decision-register.md`, an `authorization_gate` among
  the four named gates, and dependencies only on other general-development
  items. Only those admitted items and the four named gates are filtered out
  of the frozen 1.8 identity digests and the preserved-historical-identity
  list; every other milestone still hashes to the frozen values. A frozen item
  relabelled into the milestone fails the id pattern; any other new identity
  fails the freeze; a fifth `G-GD-*` gate is an unknown gate.
- Extra invariants the rule enforces: no non-general-development item may
  depend on a general-development item or use one of the four gates; a
  complete item needs a 40-hex `completion_commit` and an ISO 8601
  `completed_on`; `G-GENERAL-DEV-01` and `G-GD-PRIVATE-CONTEXT`, when approved,
  must hold their exact zero-budget synthetic scopes, and any approved
  general-development gate must keep a zero acquisition budget and no
  activation, private data, publication or release authority; a closed one
  needs `unblocks_only_when`; `completion_scope.general_development` is
  `non_release_local_development`; an active general-development item may be the
  one `in_progress` item beside the blocked PS09 graph, must be the
  lowest-priority-number ready general-development item, and keeps
  `resumable_roots: [active, PS09-02]`; general-development roots join the
  terminal `next_actions` accounting.
- Tests first (`tests/pipeline/roadmap-validator.test.mjs`): a new schema 1.10
  block with 31 cases (live ledger via actual CLI and module, an active item, a
  planning-act item with no validator change, and 28 rejections including
  missing, unresolvable and ruling-id `decision_ref`, wrong or missing gate,
  wrong `work_class`, frozen-milestone tampering three ways, a fifth gate,
  gate-scope drift, closed-gate and completion-record defects, hidden roots,
  skipped lower-priority work, and a 1.9 ledger carrying these identities).
  Older fixtures now strip the general-development graph in the shared
  `withoutMakahDemo` chain, so every 1.7, 1.8 and 1.9 assertion runs unchanged
  on its own schema's shape. Three live-state lines changed: the live schema
  assertion (`1.9` to `1.10`), the synthetic convergence registry filter (skip
  `GD-` ids), and the 1.8 and 1.9 "closed gates are exactly these 26"
  assertions, now scoped to non-general-development gates with the same 26-id
  list, while the 1.10 block asserts the four gates and their states exactly.
  Nothing was deleted or skipped.
- `ROADMAP.yaml`: schema 1.10; four gates (`G-GENERAL-DEV-01` and
  `G-GD-PRIVATE-CONTEXT` approved with exact zero-budget scopes;
  `G-GD-NATIONWIDE-CONTRACT` and `G-GD-INTEROP` closed with
  `unblocks_only_when`); `completion_scope.general_development`; GD-00 to GD-23
  at priorities 310 to 333 with dependencies, `decision_ref`, acceptance lines
  from design section 9.1 and addendum section 11, and the blocked-item fields;
  GD-00 complete at `6eb8947` (`completed_on` 2026-09-22T11:03:28-07:00 from
  `git show -s --format=%cI`; evidence cites `fff7990` 10:46:14, `20d0056`
  10:53:50 and the follow-up `ab6aefd` 11:03:38); `current_focus` and
  `next_actions` list the nine incomplete roots in priority order.
- **Where the ledger differs from the launch prompt's predicted statuses, and
  why** (lead judgment, recorded for the owner):
  1. GD-17 (nationwide source survey) and GD-18 (storage capacity model) are
     `ready`, not `not_started`: they depend only on GD-00, which is complete,
     and the ledger's readiness rule forces a dependency-complete item under an
     approved gate to `ready`.
  2. GD-19 (area resolver) and GD-23 (user-supplied source class) are
     `not_started`, not `blocked`: the validator's `blocked` status requires a
     named gate or boundary as the blocker, and their gate
     (`G-GD-PRIVATE-CONTEXT`) is approved; what holds them is unfinished
     dependencies, which the vocabulary calls `not_started`. GD-19's
     acceptance records that its geometry dependency needs the owner's
     answer to addendum section 12, question 3 before it starts.
  3. GD-22 (Nation registry binding) uses `G-GENERAL-DEV-01` as its
     authorization gate and is `blocked_by: [G-BIA-IDENTITY]`: the addendum
     table names G-BIA-IDENTITY as its gate, but the RL-01 rule requires one of
     the four general-development gates.
  4. GD-00 (realignment audit and design) carries `G-GENERAL-DEV-01` for
     accounting only (the design table says "none"); its evidence says the gate
     authorized none of that work retroactively.
  5. GD-16 (interop adapter) also depends on GD-21 (PolicyContext v1), per the
     addendum.
- Results: `npm run validate:roadmap` exit 0: 105 work items, 61 gates, 14
  sources, 23 binding paths; complete 44, in_progress 0, ready 6, blocked 21,
  deferred 2, not_started 32. `node --test
  tests/pipeline/roadmap-validator.test.mjs`: 473/473 in 26.9 s (441 before).
  `npm test`: exit 0 in 244 s, node suites unchanged from baseline, Vitest 97
  files and 1617 tests. `npm run format:check`, `lint`, `typecheck`,
  `validate:backbone` (853 links) and `hooks:test` (18/18): all exit 0.
- Commit recorded in the step 7 entry.

### Step 7: wave 1, sequential

- Step 6 was commit `3499feb`.
- GD-01 (characterization tests) marked `in_progress`, focus set to GD-01 with
  `resumable_roots: [GD-01, PS09-02]`; `npm run validate:roadmap` passed
  (in_progress 1, ready 5). Commit `260bc47`.
- GD-01 lane (`gd-lane` agent): added
  `tests/pipeline/policy-local-output-replay.test.mjs` (six cases over
  synthetic run roots in temporary directories) and registered it in
  `test:policy`; reported test:policy 121/121, test:assurance 100/100,
  `npm test` exit 0, lint, typecheck, format and scan:source green. The lane
  said "7 test blocks"; the file has six, a miscount only.
- GD-01 verification (`gate-verifier`, base `260bc47`): PASS. Only the two
  owned paths changed; protected and private-context paths unchanged; npm
  test, typecheck, lint, format:check, both validators, scan:source and build
  exit 0; both pinned non-interference tests in the passing set. It noted one
  made-up absolute path on `I:` in the test (never touched, the selection is
  rejected first); the lead moved it under the temporary directory inside the
  owned file and reran the file (6/6), lint and Prettier.
- Commit `b32d5f6` (GD-01 implementation, 2026-09-24T09:28:45-07:00). Ledger:
  GD-01 complete with that commit and time; no item newly unblocked (GD-05
  still needs GD-02); focus null at a wave checkpoint;
  `npm run validate:roadmap` passed (complete 45, ready 5). Commit `33aff12`.
- GD-02 (module boundary test) activated at commit `5345a0c`.
- GD-02 lane: added `tests/architecture/module-manifest.mjs`,
  `tests/architecture/module-boundaries.test.ts` and, beyond its row,
  `tests/architecture/module-manifest.d.mts` (a type declaration the `.mjs`
  needs for `tsc`; accepted as the design's `.mjs`/`.d.mts` pairing and
  recorded here as a scope note); extended the Makah non-interference scan.
  Report mode with 16 allowlisted violations (config coupling and seam
  bundling from audit 2.6); reachability enforcing and passing (19 files
  walked from `src/main.tsx`, 16 from `scripts/build-synthetic-artifact.mjs`);
  `npm test` exit 0 with Vitest 98 files and 1621 tests.
- GD-02 verification (`gate-verifier`, base `5345a0c`): PASS, allowlist checked
  in both directions, reachability not allowlisted, no Makah assertion removed.
  Its minor note: the lane's missing-directory skip also covered `src/app` and
  `src/pipeline`. The lead narrowed the skip to `src/modules` and `src/core`
  only (a missing `src/app` or `src/pipeline` still throws) and reran
  typecheck, lint and the two suites (10/10). The verifier also reported that
  one of its own commands briefly created `I:\dummy`, which it deleted; the
  lead confirmed it is absent.
- Commit `2093cf3` (GD-02 implementation, 2026-09-24T10:36:08-07:00). Ledger:
  GD-02 complete; GD-05, GD-07, GD-08 and GD-09 promoted to `ready` (their
  dependencies are now complete); focus null at a wave checkpoint with eleven
  roots; `npm run validate:roadmap` passed (complete 46, ready 8). Commit
  `43c9a25`.
- GD-03 (boundary-guard tests) activated at commit `3f8d77e`. Lead design for
  the lane: the tests target a guard that GD-04 builds later, and GD-04 does
  not own the test file, so the file pins the expected key set now (always on)
  and the guard-behavior tests skip only while `src/core/boundary-guard.mjs` is
  absent, running automatically once GD-04 creates it.
- GD-03 lane: added `tests/core/boundary-guard.test.ts`; 77-key union (two
  lists imported, the unexported record-guard list extracted from source
  text); Part A 1 test passing, Part B 80 tests skipped; Part B contract:
  `PROTECTED_KEYS` export and a throwing `rejectProtectedKeys`. `npm test`
  exit 0 (Vitest 99 files, 1622 passed, 80 skipped).
- GD-03 verification (`gate-verifier`, base `3f8d77e`): PASS; `src/core/` does
  not exist; the skip condition is exactly the module's absence; skip counts
  are 80 plus the one existing spine skip.
- Commit `ac8ff44` (GD-03 implementation, 2026-09-24T10:53:31-07:00). Ledger:
  GD-03 complete; GD-04 promoted to `ready`; wave 1 done, focus null with a
  terminal reason and eleven roots; `npm run validate:roadmap` passed
  (complete 47, in_progress 0, ready 8, blocked 21, deferred 2,
  not_started 27).
- Wave 1 wall time, activation commit to implementation commit: GD-01 about 26
  minutes (lane 18, verifier 7), GD-02 about 63 minutes (lane 26, verifier
  35), GD-03 about 15 minutes (lane 8, verifier 6), each including at least two
  full `npm test` runs.
- Commit `e07c5c4` closed wave 1 in the ledger.

### Step 8: handoff

- `docs/continuation-prompt.md`: the ledger-status paragraph now describes
  schema 1.10, the wave 1 checkpoint, the next sessions and the stale backbone
  text (S1-F3).
- This document completed: disposition, state, commits, commands, roles,
  findings, gates, next action and the answers below.
- `npm run build`: exit 0 in 2 s. Final `npm test` and validators: see
  "Commands and real outcomes".

## Answers for the owner

### 1. Parent instruction files

- `I:\AGENTS.md` (1,327 bytes, workspace policy): I: is a maturity workspace
  for established projects; task scope grants authority for normal work in the
  active project; inspection requests are read-only; "Do not impose generic
  role, path, conductor-only, or read-only restrictions that the task did not
  request"; preserve unrelated changes; normal local git allowed, pushes,
  history rewrites, remote changes and broad resets need an explicit request;
  "Network and provider use is allowed when required. Paid calls require
  explicit authorization and any active project control."
- `I:\CLAUDE.md`: does not exist.
- `~/.claude/CLAUDE.md` (user level): Windows 11 machine facts; the user's
  shell is PowerShell 7 and user-facing commands should be PowerShell with
  Windows paths; the Bash tool runs Git Bash; three recorded traps (heredoc
  bodies are escape-processed, a doubled backslash collapses to one even in
  single quotes, paste placeholders are labels); working rules (write
  multi-line content with the Write tool, edit with the Edit tool, forward
  slashes in Bash paths). A `/graphify` skill note.
- Conflicts:
  1. `I:\AGENTS.md` says network and provider use is allowed when required and
     warns against imposing read-only or role restrictions the task did not
     request. The repository `AGENTS.md` keeps network, source activation,
     credentials and remotes behind closed gates, and the repository agents
     are read-only or path-leased by design. `I:\AGENTS.md` itself says
     project contracts may add stable domain invariants, so the repository
     rules govern here. No change needed, but a reader should know the parent
     file is more permissive.
  2. Claude Code does not read `AGENTS.md` files at all; it reads `CLAUDE.md`
     files in this directory and its parents plus `~/.claude/CLAUDE.md`. So
     `I:\AGENTS.md` reaches Codex sessions but not Claude Code sessions (there
     is no `I:\CLAUDE.md` importing it). The repository `CLAUDE.md` imports
     `@AGENTS.md` from this repository only; imports inside a parent
     `CLAUDE.md` would not be expanded from this working directory.
  3. `~/.claude/CLAUDE.md` asks for PowerShell syntax in user-facing commands;
     the repository files use PowerShell paths and `npm` commands, which is
     consistent. No conflict with the repository rules.

### 2. The .claude/ directory as found

- Found: `.claude/agents/` with `gd-lane.md`, `gate-verifier.md` and
  `source-scout.md` only. No `settings.json`, no `settings.local.json`, no
  hooks, no commands, no skills. (During the session Claude Code's own
  runtime appended its standard `**/.claude/...` runtime-state lines to
  `.git/info/exclude`; that is harness bookkeeping, not repository content.)
- Hooks that exist are Codex hooks: `.codex/hooks.json` registers a
  SessionStart recovery hook and a PreToolUse closed-gate guard (matchers
  `Bash|exec_command|apply_patch`) that both run `scripts/codex-hooks.mjs`.
  Claude Code does not read `.codex/hooks.json`, so none of these guards run
  in a Claude Code session. The only hook that ran in this session was the
  user-level `~/.claude/hooks/block-heredoc-backslash.py` (it blocked three
  Bash calls, two from the lead and one from a verifier; each was rephrased or
  dropped).
- `npm run hooks:test` runs `tests/hooks/codex-hooks.test.mjs` (18 tests,
  all passing): bounded SessionStart context from the validated ledger; denial
  of closed remote/publication, credential, secret, notification, spent-canary
  and destructive-history commands; protected-custody and owner-input paths;
  unsafe staging; Windows launcher parsing. It proves the Codex handler's
  behavior, not that any client delivers the events.
- Conflicts with the three agents: none in the files themselves. Two gaps:
  (a) the Codex guard is the repository's only mechanical closed-gate denial
  and it is inactive under Claude Code, so the agents rely on their written
  rules; (b) finding S1-F1 and S1-F2 (placeholders read as raw HTML, and
  Prettier formatting) were repaired in the committed agent files.

### 3. Shell and log redirects

- The user's shell is PowerShell 7. Claude Code's Bash tool runs Git Bash
  (`/bin/bash.exe`), with the user-level heredoc/backslash guard in front of it.
- CLAUDE.md gives the log location but no redirect syntax. Probed this session:
  Git Bash `> C:/dev/_scratch/policy-sentinel/session-01/x.log 2>&1` works;
  a single-quoted backslash path `'C:\dev\_scratch\...\x.log'` works;
  PowerShell `npm run validate:roadmap *> C:\dev\_scratch\...\x.log` works.
  An unquoted backslash path in Git Bash would be mangled (backslashes are
  escapes), so in Bash use forward slashes. Every log in this session used the
  forward-slash form.

### 4. Durations, skips and flaky tests

- `npm test`: 289 s at baseline, 244 s after step 6, both exit 0 (the
  verifier's runs were similar). `npm run build`: exit 0 in about 2 s (Vite
  build plus the synthetic artifact build and validation).
- Skipped: exactly one, in `test:spine`: "file symlinks are rejected by the
  native reparse probe", skipped because Windows has not granted unprivileged
  file-symlink creation on this machine; junction and hard-link tests run.
- Flaky: none observed this session. The ledger records a known one: the
  Vitest pipeline wrapper (`tests/pipeline/pipeline.test.ts`, which runs seven
  node test files including the roadmap validator tests inside one Vitest
  test with a 45 s deadline) has timed out under parallel worker contention in
  earlier sessions; `test:unit` now runs Vitest with `--maxWorkers=1`. The
  roadmap validator file alone takes about 27 s, so it is the largest part of
  that 45 s budget.

### 5. Operating model versus the three agents

| Topic | `docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md` | The three agents | Fit |
| --- | --- | --- | --- |
| Authority | One lead keeps authority, integration, shared files, roadmap state and commits | `gd-lane` never stages or commits; the main session commits | Consistent |
| Write leases | A published path manifest before any write lease; one closure per agent | `gd-lane` owns exactly its step row's files and stops if it needs another | Consistent; the design's step table is the manifest |
| Independent review | A reviewer who did not author the closure, plus the registered `sovereignty_adversarial_reviewer` for identity, authority or privacy-boundary work | `gate-verifier` runs the standing checks and byte-identity checks; nobody plays the adversarial sovereignty role | Gap: no Claude equivalent of the adversarial reviewer |
| Tools | `rg`, `apply_patch`, Codex hooks, Codex TOML roles | Read/Grep/Glob/Edit/Write/Bash; no hooks active under Claude Code | The model names Codex-only surfaces |
| Validation | Serialize expensive full validation on this machine | `gd-lane` runs `npm test` and the verifier runs it again | Duplicate full runs (about 4 to 5 minutes each per step) |
| Research | Source access needs exact authority; the source-review skill is procedure only | `source-scout` reads documentation only, accepts no terms, writes nothing | Consistent with `local_phase_b` read-only public research |
| Stop contract | Stop on an unresolved material defect; record skips | Each agent stops and reports; `gate-verifier` never fixes | Consistent |

Proposed reconciliation (a small documentation change, not made in this
session): add a "Claude Code" subsection to the operating model that maps
`gd-lane` to a bounded write lease whose manifest is the step row,
`gate-verifier` to proportional and standing-check verification (explicitly
not the independent sovereignty review), and adds a read-only
`sovereignty-reviewer` agent for work classes the table routes to
`sovereignty_adversarial_reviewer` (GD-09, GD-13, GD-19 to GD-23 will need
it); state that `.codex/hooks.json` does not run under Claude Code; and let
`gd-lane` run focused checks only, leaving the one full serialized `npm test`
and build to `gate-verifier`.

### 6. Disk usage (for GD-18)

| Path | Size |
| --- | --- |
| Repository `I:\policy-sentinel` (total) | 194 MB (0.19 GB) |
| of which `node_modules` | 173 MB |
| of which `.git` | 7 MB |
| of which `dist` | about 1 MB (ignored build output) |
| of which `generated-data`, `.cache` | about 1 MB each (under 1 MB) |
| `I:\policy-sentinel-corpus-real-policy` (external custody) | 205 MB (0.20 GB); holds run roots `discovery-01` and `makah-demo-02` plus five loose PDFs at its root, outside any run root (not opened; worth an owner look) |
| `I:\policy-sentinel-corpus` | about 1 MB |
| `I:\policy-sentinel-review` | 192 MB (0.19 GB) |
| `I:\policy-sentinel-knowledge-assurance` | 48 MB |
| `I:\policy-sentinel-organization-review` | about 1 MB |
| `I:\ATNI-annual-convention-2026\ga-demonstration\policy-sentinel` | 21 MB |
| `C:\dev\_scratch\policy-sentinel` and `...-audit` | about 1 MB each |
| I: drive | 954 GB, 460 GB used, 495 GB free (the RL-09 ruling assumed about 450 GB free) |
| C: drive | 226 GB, 37 GB free |

Everything this repository references totals about 0.7 GB, well inside the
50 GB budget in D-077.

### 7. The five offline source contracts (for GD-17)

All five are disabled in `config/sources.v1.json` with `adapter: null`, carry
no coverage, and emit no record, health or last-known-good data.

| Contract | What it records today | What activation needs |
| --- | --- | --- |
| `src/contracts/congress` (registry `congress-gov`) | Keyless relative-query contract and strict synthetic response fragments for Congresses, sessions, bills and law references, sponsors, committees, actions, summary structure, exact subjects, titles and text-format links; 3 impossible-identity fixtures; review 2026-07-31 | An api.data.gov key (`build_secret`), so `G-B-CONGRESS` (owner approval of registration, terms and key handling), then live canaries for envelope, pagination, nullability and rate (5,000 per hour published; 10 per minute Library guidance) |
| `src/contracts/govinfo` (`govinfo`) | Keyless query, repository-owned cursor pagination and synthetic response contracts for BILLS, FR and selected USCOURTS, with rendition-bound SHA-256 and 503 handling; 5 fixtures | An api.data.gov key, `G-B-GOVINFO`; a collection dimension for health and last-known-good, or whole-source degradation. (The separate v2 runner profile `govinfo-direct` fetches public www.govinfo.gov content without a key; its review expires 2026-10-05.) |
| `src/contracts/regulations-gov` (`regulations-gov`) | Keyless query, complete pagination, docket/document/attachment, same-document mutation and rate-limit projections; comments and personal fields excluded; 5 fixtures | An api.data.gov key and GET-specific terms, `G-B-REGULATIONS`; live requiredness, mutation and rate verification; an artifact representation for dockets and attachments |
| `src/contracts/oregon-odata` (`oregon-legislature-odata`) | Offline contract 1.0: repository-owned logical metadata and impossible year-3785 fixtures for sessions, measures, sponsors, committees, actions, votes, versions and statuses | The acceptable-use agreement, account and credential, `G-C`; live metadata and OLIS reconciliation |
| `src/contracts/washington-lws` (`washington-lws`) | SOAP contract 1.1 for six known-bill operations plus the synthetic-only year query, bounded transport, a canary observer and a refresh-capability matrix; keyless | No credential needed, but blocked on `G-WA-LWS-DISCOVERY`: no population-discovery operation fits (the one 2025 year canary failed the parser as `invalid_soap`) |

For the nationwide survey: three of the five need an api.data.gov key, which
stays behind `EXT-CREDENTIALS`; D-072 allows only environment-variable
placeholders in configuration. Washington needs a discovery contract, not a
key. Oregon needs an agreement.

### 8. How the 1.10 extension works

In plain language: the validator used to accept only an exact, frozen list of
work items and gates. Schema 1.10 adds one rule for one milestone. Any item
under "General development" is accepted if it is shaped correctly: an ID like
`GD-24-NAME`, the work class `general_development_local`, a `decision_ref`
that names a row that really exists in `docs/decision-register.md`, one of
four named gates as its authorization gate, and dependencies only on other
general-development items. Those items, and the four gates, are set aside
before the old identity freeze is checked; everything else must still match
the frozen fingerprints exactly, so nobody can slip a new PS09 item or gate in
under the new rule. Approved general-development gates must keep a zero
acquisition budget and no activation, private-data, publication or release
authority. To add a general-development item later, write a register entry and
add the item to the ledger; no validator change is needed.

Where it lives: `scripts/validate-roadmap.mjs`, the block that starts at the
comment "Schema 1.10 general-development admission (D-071)" (after the
cycle check and before the frozen 1.8 digests), plus small filters in the
frozen-digest, preserved-identity, completion-membership and active-focus
checks. The tests are the "schema 1.10" block in
`tests/pipeline/roadmap-validator.test.mjs`.

### 9. Things the audit did not cover

- Stale current-state text: `docs/PROJECT-BACKBONE.md` lines 10 and 259 and
  `docs/architecture/module-boundaries.md` section 9.4 still say the ledger is
  at schema 1.9 and general development is not represented. GD-15 owns the
  architecture and backbone documents; until then the continuation prompt
  (updated this session) is the current-state source. The ledger's
  `binding_documents` row still calls `docs/continuation-prompt.md` a "Sol
  Ultra long-running execution handoff".
- The operating model names only Codex surfaces (question 5).
- The owner-supplied `CLAUDE.md` and agents failed `format:check` and the
  backbone raw-HTML rule as supplied (S1-F1, S1-F2; repaired).
- TODO, FIXME and HACK markers in tracked `src`, `scripts`, `tests` and
  `config`: none.
- Largest tracked files: `fixtures/engine/identity-authority-scenarios.synthetic.valid.json`
  (531 KB), the TSDF provenance record (378 KB), `ROADMAP.yaml` (376 KB and
  growing with every evidence entry), `package-lock.json` (186 KB),
  `src/engine/real-source-lifecycle.ts` (172 KB),
  `tests/pipeline/roadmap-validator.test.mjs` (126 KB),
  `src/engine/taxonomy.ts` (125 KB). The ledger and its validator are the
  fastest-growing; the validator test file already uses about 27 s of the
  45 s pipeline-wrapper budget.
- Dependencies: `npm ls --all` reports a valid tree (runtime dependencies
  `parse5` 8.0.1 and `preact`; the rest are dev dependencies). No online
  `npm audit` was run because it would contact the registry.
- Two untracked files beside the owner inputs are not in the protected
  owner-input list: `docs/development/GRAND-DEMO-20260914-POLICY-CLEANUP.md`
  and `docs/Policy-Sentinel-Adversarial-Review-and-Decision-Log-2026-09-05 (1).md`
  (a duplicate-looking copy). Both were left untouched.
- Source reviews expire soon: the shared review for the v2 profiles
  `govinfo-direct` and `washington-legislative-text` expires 2026-10-05 and
  the `federal-court-opinions-direct` review expires 2026-10-15
  (`config/policy-sources.v2.mjs`). After expiry the runner refuses dispatch
  with `EXPIRED_PROFILE`. Nothing in this session acquires anything; no
  action taken.

### 10. The three open questions in addendum section 12

1. Registry repository shape. Recommended default: one repository
   (`atni-nation-registry`) with two datasets and separate version lines, as
   the addendum proposes. One release pipeline, one digest-pinning habit for
   consumers, and the Nation registry's G-BIA-IDENTITY gate does not hold up
   designation releases if each dataset versions independently. Split later
   only if the two need different maintainers or access rules.
2. Wave concurrency versus "exactly one in_progress". Recommended default:
   keep the rule for now and run lanes sequentially, as this session did.
   Wave 1 took 15 to 63 minutes of wall time per step (about 104 minutes in
   all), most of it at least two full `npm test` runs per step; parallel lanes would run full suites at the same time
   and hit the 45 s pipeline-wrapper deadline that has flaked under contention
   before. If the owner wants parallel waves, amend the rule to "one
   in_progress item per named lane, lanes listed in current_focus, disjoint
   file sets" and have the validator check disjointness from the step rows;
   that is a ledger schema change (a register entry plus validator work).
3. Geometry dependency. Recommended default: decide when GD-19 starts, with a
   short comparison recorded in the register: a pinned, offline, pure
   JavaScript library whose install makes no network calls at runtime, with
   separate small readers per format (shapefile, GeoPackage via SQLite in
   WebAssembly, GeoJSON, KML). Prefer the smallest combination that covers
   the five formats, record each package's version, license and advisory
   check, and keep it a dependency of the private module only so the public
   build cannot import it (the GD-02 reachability test enforces that).
