# General development session 1 outcome: governance and refactor wave 1

Prepared by the lead session (Claude Opus 5.5) that executed the owner's
session-1 launch prompt on branch `realign/general-development`. It records
what changed, every commit, the commands run and their real outcomes, and every
gate that stays closed. It authorizes nothing by itself; the decision register
and `ROADMAP.yaml` carry the authority.

Sections below the ledger are completed at step 8.

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
- Wave 1 wall time: GD-01 about 25 minutes (lane 18, verifier 7), GD-02 about
  61 minutes (lane 26, verifier 35), GD-03 about 14 minutes (lane 8, verifier
  6), each including at least two full `npm test` runs.
