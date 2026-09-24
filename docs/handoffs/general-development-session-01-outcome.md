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
