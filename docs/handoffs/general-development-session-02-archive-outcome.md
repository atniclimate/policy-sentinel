# General development session 2 outcome: legacy archive and consolidation

Prepared by the lead session (Claude Opus 5.5) that executed the owner's
session-2 launch prompt on branch `realign/general-development`. The owner
was away for the run; the launch prompt's rules decided, and a hold was the
answer whenever material was unclear. This document authorizes nothing by
itself; the decision register and `ROADMAP.yaml` carry the authority.

## Terminal disposition

`GD_SESSION_02_ARCHIVE_COMPLETE_WITH_HOLDS`

Steps 1 to 8 are done. The four drop-ins are committed; the definition of
done is edited per owner answer 4; D-080 to D-082 are in the register;
GD-24 to GD-27 were added by planning act with zero validator changes; the
operating model has its Claude Code section; the stale schema 1.9 lines and
the continuation prompt are updated. GD-24 (legacy archive and consolidation)
is `complete`: 17 locations inventoried and hashed, 172 public files copied
and verified, seven T0 digests and an index written, all outside the
repository at `I:\policy-sentinel-archive`. Both sovereignty reviews failed
once and passed after their findings were applied. No git bundle was created:
all four legacy repositories are holds. The ledger ends at a terminal
checkpoint with zero `in_progress` items. Nothing was pushed, tagged, merged,
rebased or amended; no source location was changed; no network was used.

## Start and end state

| Item | Value |
| --- | --- |
| Branch | `realign/general-development`, one worktree, no remote (read-only `git config --get-regexp '^remote\.'` returns nothing) |
| Start commit | `ed5c7ce` (session 1 outcome) |
| End commit | the commit that adds this completed document, directly after `ecb625d`; recover it with `git log -1 -- docs/handoffs/general-development-session-02-archive-outcome.md` |
| Working tree at end | only the pre-existing untracked owner inputs under `docs/` (unchanged); `.claude/settings.local.json` now excluded in `.git/info/exclude` |
| Ledger at end | schema 1.10; 109 work items, 61 gates; complete 48, in_progress 0, ready 9, blocked 22, deferred 2, not_started 28 |
| Archive | `I:\policy-sentinel-archive`: 241 files, 2,897,714 bytes at close (240 files and 2,893,059 bytes when the index was written; `inventory\git-state-final.txt` was added after it) |
| Runtime | Windows x64, Node 24.19.0, npm 12.0.2 |

## What changed

- Repository (governance only): the four owner drop-ins; one definition-of-done
  row split into two and one addendum section 7 row; D-080, D-081, D-082 and
  "Resolved by D-082" under addendum section 12; ledger items GD-24 to GD-27;
  the operating model's "Claude Code" section; three stale status sentences;
  two continuation-prompt sections plus the archive pointer; this outcome.
- Outside the repository: `I:\policy-sentinel-archive` with `inventory\`,
  `copies\` (three copies), `digests\` (seven) and `ARCHIVE-INDEX.md`.
- No change under `src/`, `schemas/`, `config/`, `fixtures/` or `tests/`; no
  validator or script change.

## Commits

| Commit | Committed | Purpose |
| --- | --- | --- |
| `aef7d2e` | 2026-09-24T16:50:02-07:00 | Adopt Claude Code mechanical gates, two agents and the definition of done (step 1a) |
| `dd4708e` | 2026-09-24T16:50:35-07:00 | Split the federal-plus-three-states done row; add the international instruments class (1b) |
| `cdd0c14` | 2026-09-24T16:52:32-07:00 | Record D-080, D-081 and D-082 (1c) |
| `12ff591` | 2026-09-24T16:57:45-07:00 | Add GD-24 to GD-27 by planning act, no validator change (1d) |
| `121894b` | 2026-09-24T16:58:13-07:00 | Operating model Claude Code section (1e) |
| `c760446` | 2026-09-24T17:00:03-07:00 | Replace the stale schema 1.9 status lines (1f) |
| `0db5a4d` | 2026-09-24T17:01:57-07:00 | Continuation prompt: frozen boundaries and historical pointers (1g) |
| `19b02c4` | 2026-09-24T17:03:46-07:00 | Activate GD-24 (step 2) |
| `67fedee` | 2026-09-24T17:36:59-07:00 | Record the read-only inventory (step 3) |
| `803ee92` | 2026-09-24T17:48:13-07:00 | Record the sovereignty review; trim held-item descriptions (step 4) |
| `71da30f` | 2026-09-24T17:49:33-07:00 | Record the verified archive copies (step 5) |
| `18251d1` | 2026-09-24T18:04:13-07:00 | Record the digests and their review (step 6) |
| `e479662` | 2026-09-24T18:05:22-07:00 | Archive pointer in the continuation prompt; step 7 entry (GD-24 completion commit) |
| `ecb625d` | 2026-09-24T18:07:24-07:00 | Record GD-24 complete in the ledger |
| (this commit) | see `git log` | Complete the session 2 outcome (step 8) |

## Commands and real outcomes

| Command | Baseline (at `ed5c7ce`) | Final |
| --- | --- | --- |
| `npm run validate:roadmap` | exit 0; 105 items, 61 gates; complete 47, in_progress 0, ready 8, blocked 21, deferred 2, not_started 27 | exit 0; 109 items, 61 gates; complete 48, in_progress 0, ready 9, blocked 22, deferred 2, not_started 28 |
| `npm run validate:backbone` | exit 0; 22 schemas, 1346 refs, 137 Markdown files, 854 local links | exit 0; 22 schemas, 1346 refs, 138 Markdown files, 868 local links |
| `npm test` | exit 0; node suites 13/13, 30 plus 1 skipped of 31, 121/121, 100/100, 26/26, 129/129, 31/31; Vitest 99 files, 1622 passed and 80 skipped | exit 0; node suites 13/13, 30 plus 1 skipped of 31, 121/121, 100/100, 26/26, 129/129, 31/31; Vitest 99 files, 1622 passed and 80 skipped (unchanged) |
| `node --test tests/pipeline/roadmap-validator.test.mjs` | not run at baseline | 473/473 after the planning act, with GD-24 active, and at the terminal ledger |
| `npm run format:check` | exit 1 on two owner drop-ins (reflowed) and the local `.claude/settings.local.json` (S2-F2) | the same local file only; every committed file passes `prettier --check` |
| `npm run test:knowledge`, `npm run test:backbone` | not run at baseline | 31/31 and 26/26 after step 1f |

Logs: `C:\dev\_scratch\policy-sentinel\session-02\`.

## Roles, agents and leases

- Lead: every repository and archive write, every commit, every disposition.
- `legacy-inventory`: fifteen read-only runs (fourteen locations and one
  factual extraction for digest 04). Four misreported hashes and one missed
  Nation-specific content (S2-F8); three had reads refused by the PII
  classifier and did not retry.
- `sovereignty-reviewer`: two reviews, each FAIL then PASS after the lead
  applied every finding.
- `gd-lane`, `gate-verifier`, `source-scout` and built-in agents: not used.
- One settings deny rule fired as designed (`Bash(git remote *)` on a
  read-only `git remote -v`); the lead switched to `git config`. One
  user-level hook fired (heredoc with a backslash); the lead switched to the
  Edit tool.
- All agents have returned; no lease is open.

## Findings

S2-F1 to S2-F9 are recorded in the ledger below: S2-F1 tier vocabulary not in
`docs/data-governance.md`; S2-F2 `format:check` fails on the local settings
file; S2-F3 two sentences still call addendum section 12 open; S2-F4 the focus
rule blocks session R before wave 2; S2-F5 recovery roots deeper than stated;
S2-F6 the log folder is a legacy git repository; S2-F7 a stopped process kept
writing; S2-F8 inventory agent reliability; S2-F9 two hand-typed hashes caught
by a mechanical check.

## Gates still closed and operations confirmed absent

Unchanged: `G-GD-NATIONWIDE-CONTRACT` and `G-GD-INTEROP` closed;
`G-GENERAL-DEV-01` and `G-GD-PRIVATE-CONTEXT` approved with zero budgets;
`G-PS09-RUN-06`, `-07`, `-08` and `G-PS09-RC` closed; `G-K0-S0-CONVERGENCE`
and `G-O0-CONVERGENCE` closed; `G-B` and its children, `G-C`, `G-E` and its
children, `G-F`, `G-G`, `G-H`, `G-I`, `G-PNW-COMMUNITY-AUTHORITY` and
`G-PNW-SOURCE-ACTIVATION` closed; `G-BIA-IDENTITY`, `G-J`, `G-D`, `G-RC` and
`G-LOCAL-BROWSER` pending evidence. All six external boundaries closed.
PS09-02 blocked, PS09-06 unstarted.

Confirmed absent: push, tag, merge, rebase, amend, remote; any network use
(no `gh`, no fetch, no install); any provider request; any write, move,
rename or delete in D:\, C:\dev, F:\ or a legacy location (only this
session's log files in the designated `session-02` folder); any held item
copied; any credential-shaped file opened; any change under `src/`,
`schemas/`, `config/`, `fixtures/` or `tests/`; any Nation-specific, custody
or private material written into the repository or the archive.

## Next bounded action

- **Session 3 (GD-17 survey and GD-18 storage model, documentation only):**
  first a one-row planning act that moves GD-17 and GD-18 ahead of the ready
  wave 2 items (as done for GD-24; finding S2-F4), then activate GD-17 and run
  `source-scout` on the federal family.
- **Session 4:** start with GD-26 (reproducible checks), moved ahead of wave 2
  by the same kind of planning act, then wave 2 from GD-04 (answer 9).

## Session ledger

Entries are appended at each checkpoint. After a context reset, recover from
this ledger, `git log` and `ROADMAP.yaml`.

### Preconditions

- Checkout: branch `realign/general-development`, HEAD
  `ed5c7ce13dd01e32710a88d0c4a7a13d6fcb2018` (the commit that completed the
  session 1 outcome). `git status --short` showed only untracked files: the
  four owner drop-ins (`.claude/settings.json`,
  `.claude/agents/sovereignty-reviewer.md`,
  `.claude/agents/legacy-inventory.md`,
  `docs/decisions/2026-09-24-definition-of-done-general-development.md`) and
  the 34 pre-existing owner inputs under `docs/`.
- Drop-ins: all four present. `.claude/settings.local.json` also exists;
  `/.claude/settings.local.json` was added to `.git/info/exclude` (local,
  untracked file).
- Working directories: `D:\` lists without a prompt (top level only, names
  recorded in the discovery log); `I:\policy-sentinel-archive` exists and is
  empty.
- Logs: `C:\dev\_scratch\policy-sentinel\session-02\`.
- Baseline (Node 24.19.0, npm 12.0.2): `npm run validate:roadmap` exit 0 (105
  work items, 61 gates, 14 sources, 23 binding paths; complete 47,
  in_progress 0, ready 8, blocked 21, deferred 2, not_started 27).
  `npm run validate:backbone` exit 0 (22 schemas, 22 IDs, 1346 refs, 137
  Markdown files, 854 local links). `npm test`: see the step 1a entry.
- Reading done before any edit: `docs/continuation-prompt.md`, `ROADMAP.yaml`
  (all 7,249 lines), the session 1 outcome, the realignment rulings, the
  definition of done, the addendum (all sections), the operating model, the
  data-governance public/private section, the two new agent files and
  `.claude/settings.json`.
- **Finding S2-F1:** the launch prompt points to "the tiering vocabulary in
  `docs/data-governance.md` (T0 to T3)". That file contains no tier
  vocabulary. The only in-repository definition is
  `docs/development/makah-demo/reference-lookup-2026-09-15.md` lines 53 to 61,
  which quotes the local TSDF standard
  (`C:\dev\TieredSovereignDataFramework\standard\TSDF-Standard-v0.95.md`,
  version 0.9.5): T0 formally and publicly released by the sovereign entity,
  T1 community network access, T2 negotiated partner access, T3 sovereign
  restricted, and section 3.2 "data with an uncertain or unclassified
  classification must default to T3". This session uses that vocabulary and
  the T3 default as the basis for "hold when unclear".

### Step 1a: commit the four drop-ins

- `npm run format:check` exit 1 on three files. Two are owner drop-ins:
  `.claude/agents/sovereignty-reviewer.md` and
  `.claude/agents/legacy-inventory.md`. `npx prettier --write` on those two
  reflowed lines only and folded each `description` into a multi-line YAML
  scalar; a whitespace-normalized comparison shows identical words, and the
  `yaml` parser returns identical frontmatter before and after.
  `.claude/settings.json` and the definition-of-done file were already clean.
- **Finding S2-F2:** the third file is `.claude/settings.local.json`, the
  local Claude Code permission file. It is excluded from Git (precondition 2)
  and is not committed, but `prettier --check .` reads the file system and
  Prettier does not read `.git/info/exclude`, so `npm run format:check` fails
  on any machine where the harness writes that file. Not changed here (it is
  the harness's own file and the harness rewrites it). Candidate repair for
  GD-26 (reproducible checks): add `.claude/settings.local.json` to
  `.prettierignore`.
- `npm run validate:backbone` exit 0 (22 schemas, 1346 refs, 138 Markdown
  files, 854 local links).
- Commit: "Adopt Claude Code mechanical gates, two agents and the definition of
  done" (the four drop-ins plus this ledger).

### Step 1b: definition of done, one row change (owner answer 4)

- Step 1a was commit `aef7d2e`.
- Part B of the definition file: the row "Live bounded custody for federal
  sources plus at least three states ..." is replaced by two rows: (i)
  federal families fully wired (catalog rows for Federal Register, GovInfo,
  eCFR, Regulations.gov and Congress.gov, credential placeholders where a key
  is required, live bounded custody for the keyless ones), mapped to GD-12 and
  a new decision after GD-17; (ii) starting state custody for at least three
  states, with no larger number until GD-18 reports the measured weight of a
  full federal plus 50-state current-text corpus and of the international
  instruments class, mapped to GD-18 and the same decision. The notes column
  wording is the lead's (the owner's answer gave the capability text and the
  mapping only).
- Addendum section 7 table: one row added, class "International and
  transboundary instruments", with the owner's starting points and note.
- `npm run validate:backbone` exit 0; Prettier check clean on both files.

### Step 1c: decision register D-080 to D-082

- Step 1b was commit `dd4708e`.
- D-080 to D-089 were unused anywhere in the repository (checked with grep
  over Markdown, YAML and source) before the edit.
- Three rows appended to the "General development decisions" table after
  D-079: D-080 (legacy archive and consolidation), D-081 (definition of done
  for general development, the PS09-06-LOCAL-RC consolidation into GD-27
  recorded as the plan for a later planning session, the first acquisition
  decision deferred until GD-17 and GD-18 report), D-082 (Claude Code
  operating environment and the closure of addendum section 12). Each row
  says what it does not authorize.
- Addendum section 12: "Resolved by D-082." added to each of the three
  questions.
- **Finding S2-F3:** two existing sentences still call addendum section 12 open:
  the end of D-075 ("the registry repository shape is an open owner question
  (addendum section 12)") and `docs/continuation-prompt.md` line 54 ("Open
  owner decisions after the rulings: addendum section 12 ..."). This
  session's authority covers neither edit (D-075 is an existing row; step 1g
  adds sections only), so both are left as found and recorded here. D-082
  supersedes them.
- `npm run validate:backbone` exit 0 (855 local links); Prettier clean.

### Step 1d: planning act, GD-24 to GD-27

- Step 1c was commit `cdd0c14`.
- Four items added under milestone "General development", work class
  `general_development_local`, gate `G-GENERAL-DEV-01`:
  GD-24-LEGACY-ARCHIVE-AND-CONSOLIDATION (D-080, depends GD-00, `ready`),
  GD-25-ANALYST-RESEARCH-LOOP (D-081, depends GD-06, GD-07, GD-10,
  `not_started`), GD-26-REPRODUCIBLE-CHECKS (D-081, depends GD-00, `ready`),
  GD-27-LOCAL-RELEASE-PACKAGE (D-081, depends GD-10, GD-13, GD-15, GD-19,
  GD-21, GD-22, GD-25, GD-26, `blocked` by `G-GD-NATIONWIDE-CONTRACT` with
  `safe_fallback`, `unblocks_only_when` and one evidence line, which the
  validator requires of every blocked item). `current_focus.resumable_roots`
  and `next_actions` now list the 14 incomplete roots in priority order, and
  one sentence was added to `current_focus.objective`.
- Priority placement (lead judgment): the validator requires strictly
  increasing priorities in file order (`scripts/validate-roadmap.mjs` lines
  602 to 612) and an active general-development item must be the
  lowest-priority-number ready general-development item (lines 3200 to 3212).
  Appended after GD-23, GD-24 would get 334 and could not be activated in step
  2 while GD-04 (314) and the other wave 2 items are ready. GD-24 is therefore
  inserted before GD-00 at priority 309, which also states the owner's
  sequencing (the archive runs first). GD-25, GD-26 and GD-27 are appended at
  334, 335 and 336.
- First validator run rejected GD-27 ("blocked without evidence"); adding the
  evidence line fixed it. The second rejected the terminal
  `resumable_roots` and printed the exact expected order; the edit above
  matched it.
- Results: `npm run validate:roadmap` exit 0: 109 work items, 61 gates, 14
  sources, 23 binding paths; complete 47, in_progress 0, ready 10, blocked 22,
  deferred 2, not_started 28. `node --test
  tests/pipeline/roadmap-validator.test.mjs`: 473/473 in 31.2 s. `git diff`
  shows no change under `scripts/` or `tests/`. One Prettier reflow of the
  edited `objective` paragraph.
- **Proof of the D-071 design:** the validator accepted the four new items
  with zero validator changes and zero test changes. The one constraint the
  planning act had to respect was priority placement.
- **Finding S2-F4:** the same focus rule blocks RL-14's session R as planned.
  GD-17 (327) and GD-18 (328) are `ready`, but while any of GD-04, GD-05,
  GD-07, GD-08 or GD-09 (314 to 319) is `ready`, the validator rejects GD-17
  or GD-18 as the active item. Session R therefore cannot start before wave 2
  unless a planning act moves GD-17 and GD-18 to lower priority numbers (the
  same move made here for GD-24; general-development priorities are not
  frozen) or wave 2 lands first. Recorded for the owner; nothing changed.

### Step 1e: operating model, Claude Code subsection

- Step 1d was commit `12ff591`.
- New section "Claude Code" in
  `docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md`, after "What the hooks
  prove", as session 1 answer 5 proposed: `.codex/hooks.json` does not run
  under Claude Code and the `.claude/settings.json` deny rules are the
  mechanical floor; a five-row table maps `gd-lane`, `gate-verifier`,
  `sovereignty-reviewer`, `legacy-inventory` and `source-scout` to their roles
  and boundaries; lanes run focused checks and the verifier runs the one full
  serialized `npm test` and build.
- `npm run validate:backbone` exit 0 (857 local links); Prettier clean.

### Step 1f: stale schema 1.9 status lines

- Step 1e was commit `121894b`.
- `docs/PROJECT-BACKBONE.md` opening paragraph (formerly lines 10 to 12) and
  the general-development row of the workstream table (formerly line 259),
  and the first sentence of `docs/architecture/module-boundaries.md` section
  9.4: each "schema 1.9 cannot represent" statement is replaced by one
  sentence: represented at schema 1.10 on 2026-09-24 (commit `3499feb`,
  committed 2026-09-24T09:00:40-07:00 per `git show -s --format=%cI`),
  admitted by rule under D-071; see `ROADMAP.yaml`. No other text changed;
  the section 9.4 heading "(not applied)" and its closing sentence about the
  enumerated pattern stay for GD-15's full rewrite.
- No test, script or source file pins the replaced text (grep). `npm run
  validate:backbone` exit 0; `npm run test:knowledge` 31/31;
  `npm run test:backbone` 26/26; Prettier clean.

### Step 1g: continuation prompt sections

- Step 1f was commit `c760446`.
- `docs/continuation-prompt.md` gains two sections after "What a fresh session
  does first": "Frozen source and external boundaries" (four lines: do not
  repeat D3, R6, R7 or PF-01 to PF-17; do not issue FR-A1; preserve the
  27-request ledger and the 43-file ignored evidence custody; the two v2
  reviews expire 2026-10-05 and 2026-10-15, confirmed at
  `config/policy-sources.v2.mjs` lines 7 and 63, after which dispatch fails
  with `EXPIRED_PROFILE`, `src/pipeline/policy-custody.mjs` line 386) and
  "Historical pointers" (the five pointer sets session 1 found missing,
  recovered from the pre-rewrite prompt at `6eb8947`; every linked file
  confirmed to exist; the axe disposition is the "Browser repair and review
  evidence" section of the discovery outcome; the stage package is a code
  path because it is outside the repository).
- `npm run validate:backbone` exit 0 (868 local links, 11 new);
  `npm run test:knowledge` 31/31; Prettier clean.

### Step 2: activate GD-24

- Step 1g was commit `0db5a4d`.
- GD-24 (legacy archive and consolidation) set `in_progress`;
  `current_focus.work_item` GD-24, `terminal_reason` null,
  `resumable_roots` `[GD-24, PS09-02]` as the validator requires for an active
  general-development item, `last_durable_checkpoint` `0db5a4d`, and the
  objective rewritten for the active item (it no longer calls addendum section
  12 open).
- `npm run validate:roadmap` exit 0: 109 items; complete 47, in_progress 1,
  ready 9, blocked 22, deferred 2, not_started 28. `node --test
  tests/pipeline/roadmap-validator.test.mjs` 473/473 with the active ledger.

### Step 3a: discovery (read-only)

- Step 2 was commit `19b02c4`.
- Bounded directory-name search, `Get-ChildItem -Directory -Recurse -Depth 3
  -Force -ErrorAction SilentlyContinue` (PowerShell 7), case-insensitive
  pattern `policy-sentinel|policy_sentinel|policysentinel|sentinel|esa-policy|esa_policy|nez-perce|nezperce|makah|atniclimate`.
  Logs: `discovery-D.log` (3,402 directories scanned, 7 matches),
  `discovery-C-dev.log` (6,214 scanned, 5 matches), `discovery-F.log` (962
  scanned, 2 matches). No content scan was run.
- Matches, reduced to distinct roots: `D:\Projects\policy-sentinel`,
  `D:\Projects\nez-perce-policy-sentinel`, `D:\Projects\esa-policy-analyzer`
  (all three git repositories), `D:\tcr-policy-scanner-archive\T1\sentinel-routed`,
  `D:\Claude-Workspace\.claude\projects\D--Projects-esa-policy-analyzer`
  (Claude Code session transcripts), `C:\dev\TCR-policy-scanner\outputs\spike-makah-internal`,
  `C:\dev\TCR-policy-scanner\outputs\spike-makah-review` (empty),
  `C:\dev\_scratch\policy-sentinel` (a git repository),
  `C:\dev\_scratch\policy-sentinel-audit`, `F:\projects\Nations\makah-tribe`
  and `F:\projects\Nations\nez-perce-tribe` (each holds only an empty
  `Raw-Data` directory). The two `src\policy_sentinel` and
  `src\nez_perce_policy_sentinel` matches sit inside their parent roots.
- **Finding S2-F5:** the recovery roots the owner named are not at the top of
  F:\. They are `F:\atni-phase2\sources\F_recovery` and
  `F:\atni-phase2\sources\Recovery` (with intake copies under
  `F:\_intake\`). The name search listed their directory names to its depth
  limit and matched nothing inside them; nothing there was opened.
- **Finding S2-F6:** `C:\dev\_scratch\policy-sentinel`, the log directory
  that `CLAUDE.md` and the launch prompt prescribe, is itself a legacy git
  repository (a clone of `atniclimate/policy-sentinel` at the same HEAD as
  `D:\Projects\policy-sentinel`, plus an old `src\policy_sentinel` package).
  The session-01 and session-02 log folders are untracked files inside that
  repository's working tree. This session keeps writing its logs there because
  the owner designated it; the before and after git states are compared on
  HEAD, refs and tracked files, and the only untracked additions are under
  `session-02\`. Recommendation: move the log root to a directory that is not
  inside a repository (for example `C:\dev\_scratch\policy-sentinel-logs\`).
- Git state of the four legacy repositories, read with
  `git -c safe.directory=* --no-optional-locks` so no index refresh is
  written: `I:\policy-sentinel-archive\inventory\git-state-before.txt`.
- Hashed manifests: every file under every root, excluding `node_modules`,
  `dist`, `.cache`, `coverage`, `__pycache__`, `.venv`, `pilot` and `.git`
  (recorded by path and size only), written by a Node script that never
  follows links and never opens credential-shaped names, to
  `I:\policy-sentinel-archive\inventory\raw\<label>.tsv`. Summaries:
  `3a-hash-summary.jsonl`. A first Git Bash version was stopped after ten
  minutes (about 1.6 files per second); its partial output was deleted and
  replaced by the Node run.

| Label | Root | Files | Bytes | Credential-shaped |
| --- | --- | --- | --- | --- |
| d-policy-sentinel | `D:\Projects\policy-sentinel` | 1,409 | 46,226,155 | 6 |
| d-nez-perce-policy-sentinel | `D:\Projects\nez-perce-policy-sentinel` | 43 | 591,930 | 0 |
| d-esa-policy-analyzer | `D:\Projects\esa-policy-analyzer` | 35 | 623,655 | 0 |
| d-tcr-archive-sentinel-routed | `D:\tcr-policy-scanner-archive\T1\sentinel-routed` | 323 | 13,219,758 | 0 |
| d-claude-transcripts-esa | `D:\Claude-Workspace\.claude\projects\D--Projects-esa-policy-analyzer` | 56 | 13,633,189 | 0 |
| c-tcr-spike-makah-internal | `C:\dev\TCR-policy-scanner\outputs\spike-makah-internal` | 14 | 405,865 | 0 |
| c-tcr-spike-makah-review | `C:\dev\TCR-policy-scanner\outputs\spike-makah-review` | 0 | 0 | 0 |
| c-scratch-policy-sentinel | `C:\dev\_scratch\policy-sentinel` (session logs excluded) | 87 | 98,828 | 0 |
| c-scratch-policy-sentinel-audit | `C:\dev\_scratch\policy-sentinel-audit` | 19 | 538,536 | 0 |
| f-nations-makah-tribe | `F:\projects\Nations\makah-tribe` | 0 | 0 | 0 |
| f-nations-nez-perce-tribe | `F:\projects\Nations\nez-perce-tribe` | 0 | 0 | 0 |
| i-corpus-real-policy | `I:\policy-sentinel-corpus-real-policy` | 1,168 | 211,394,771 | 0 |
| i-corpus | `I:\policy-sentinel-corpus` | 17 | 98,415 | 0 |
| i-review | `I:\policy-sentinel-review` | 646 | 11,827,893 | 0 |
| i-knowledge-assurance | `I:\policy-sentinel-knowledge-assurance` | 594 | 48,671,869 | 0 |
| i-organization-review | `I:\policy-sentinel-organization-review` | 18 | 523,487 | 0 |
| i-convention-ga-policy-sentinel | `I:\ATNI-annual-convention-2026\ga-demonstration\policy-sentinel` | 66 | 21,157,752 | 0 |

### Step 3c: the five loose PDFs (owner answer 3)

Opened with the Read tool (first pages) and `pdfinfo` for page counts. They
sit at the root of `I:\policy-sentinel-corpus-real-policy`, outside both run
roots, with modification times of 2026-09-05 between 22:07 and 22:09 UTC; no
run receipt names them. None is a public government document, so all five
are holds under owner answer 3. They are listed by path and SHA-256 and left
in place; nothing is quoted. Individual author names in the PDF metadata are
not recorded.

| File | Title (as shown) | Publisher | Date | Pages | SHA-256 | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `2025.08.06-Earthjustice-et-al-CWA-401-2025-Comments28.pdf` | Public comment letter on an EPA request for comment, docket EPA-HQ-OW-2025-0272 | Earthjustice and Native American Rights Fund | 2025-08-06 | 28 | `2f7a3c0f79a6b745c80c6a07e9ca48e5d36b7c0ac8a68b6931c9d272077416ea` | hold: Nation-specific; not a government document |
| `CTS FY26 President's Budget Request Analysis as of 05.03.25.pdf` | Analysis of the President's Budget Request to Congress | Coalition for Tribal Sovereignty | 2025-05-03 | 5 | `f0e94d40040de886442ec708b2106e89bc7493be9eb0ad7db7f1b039cec910ea` | hold: advocacy analysis, not a government document |
| `Chuckwalla Tribal Letter_4_7_24.pdf` | Letter (title as in the file name) | Tribal governments (not named here) | April 2025 | 3 | `3d8951fab3c8b21893ab52309ed9cc6692fe8df599835769327b287a9907e92a` | hold: Nation-specific; not a government document |
| `JOINT-INDIAN-COUNTRY-ECON-POLICY-BRIEF-ADMINISTRATION-FINAL-2-11-26.pdf` | Tribal Economic Development: Indian Country's Policy Priorities for the Federal Government | joint brief of Native organizations | February 2026 | 10 | `7e2e5397867a04092027a67d152a182fa881dbd147176c2d927d5f87e6a6b84b` | hold: organizational policy brief, not a government document |
| High Country News article PDF (the file name begins with a typographic quote: "Quite frustrating_ what it's like to have a treaty with the United States - High Country News.pdf") | "Quite frustrating: what it's like to have a treaty with the United States" | High Country News | 2026-08-14 | 13 | `0a20184045cb41ae1a8325c5f119135a1946304adc4f300f5e14b200758db801` | hold: copyrighted news article, not a government document |

Descriptions in this table were trimmed after sovereignty review finding F5
(kind, publisher, date and pages only).

Later cross-check (step 3b): the five PDFs total 5,935,245 bytes and 59 pages,
which matches the input totals recorded in a held 2026-09-05 study folder
under `I:\policy-sentinel-knowledge-assurance\2026-09-05\` (not quoted). They
appear to have been placed in the custody root by hand rather than acquired by
the runner: no receipt names them.

### Step 3b: legacy-inventory agents

- Fourteen `legacy-inventory` agents, at most three at a time, one per
  non-empty location (the two `D:\Projects` git repositories plus the
  esa-policy-analyzer repository, the TCR archive folder, the transcripts
  folder, the TCR Makah spike folder, the two `C:\dev\_scratch` folders, and
  the six known I:\ locations, the two smallest in one agent). The three empty
  locations were recorded by the lead. Every report and the lead's
  disposition are in `I:\policy-sentinel-archive\inventory\working-notes.md`.
- **Finding S2-F7:** the stopped Git Bash hasher had not fully exited; it
  appended 327 duplicate rows to `d-policy-sentinel.tsv` after the Node run.
  No hasher process remained at 17:24; the manifest was regenerated and
  reproduced the first Node tree digest (`f23df7d3...`). No other manifest was
  affected.
- **Finding S2-F8 (agent reliability):** four agents misreported hashes (three
  said the 64-character manifest hashes had 65 characters, one printed
  truncated 63-character hashes while calling them full); one called a
  directory generic that is byte-identical to Nation-specific files; one
  proposed `hold: false` for files it classified as
  Nation-specific. The lead checked every such claim against the manifests;
  the manifests govern and every hash in the inventory comes from them.
- Three agents had reads refused by the auto-mode PII classifier (memory notes
  in the transcripts folder, `restricted-scratch` in the knowledge-assurance
  study, two Makah demo files in the stage package). None retried; those items
  are held by path.

### Step 3d: merged inventory

- Written by the lead: `I:\policy-sentinel-archive\inventory\inventory-2026-09-24.md`
  (method, per-location table with tree digests, git state, hold list, the
  five PDFs, copy plan) and `inventory-2026-09-24.yaml` (4,520 rows, one per
  file plus excluded directories and empty locations; SHA-256
  `f7682a86f7c314c9d80675d9b3c4b7c66ed9848bcc9f4708e4e4948add347358`, parses
  with the `yaml` package, every hash 64 hex characters), with
  `summary-2026-09-24.json` and `raw\`.
- Totals: 17 locations, 4,495 files, 369,012,103 bytes. Rows by
  classification: public_engine 185, planning 152, research 39, generated
  2,154, acquisition_custody 1,193, pilot_nation_specific 413,
  credential_shaped 6, git_metadata 8, unknown 370. Rows with hold true:
  2,999.
- Hold list (location or subtree level): the Nez Perce deployment repository,
  the esa-policy-analyzer repository, the TCR archive folder, the transcripts
  folder, the TCR Makah spike folders, the two F:\ Nation folders, one audit
  sibling report, six credential-shaped cache names, and all six known I:\
  locations (with `HANDOFF.md` and the Tribe-centered study folders called out).
- Proposed copies (pending step 4): 87 source files from
  `D:\Projects\policy-sentinel`, 87 from `C:\dev\_scratch\policy-sentinel`,
  two files from the audit folder; two git bundles. **Superseded by step 4
  below; the hash and totals above are also superseded.**

### Step 4: classification review (sovereignty-reviewer)

- Step 3 was commit `67fedee`.
- First pass: **FAIL** with ten findings. F1: `CLAUDE.md` in both legacy
  engine copies names a Nation's deployment repository. F2:
  `scripts/sovereignty-guard.sh` in both copies hard-codes Nation names as
  configuration. F6: every commit of both repositories carries an individual's
  email in author metadata. F3 to F5: held-item descriptions in the inventory,
  the working notes and this ledger said more than a hold reason needs. F7 to
  F9: reason text and one classification. F10: rights and legal-effect
  language and a T1 export assumption in the legacy scaffold (relevant only to
  a future merge).
- Applied in full: the four files became holds (pilot_nation_specific); both
  git bundles became holds and will not be created (every commit carries at
  least one of the two held files and the author email); descriptions trimmed
  in all three documents; reasons corrected; the template made public_engine
  in both copies; F10 kept for digest 07.
- Second pass: **PASS**. The reviewer confirmed the YAML flags and reasons, a
  name search of about 50 Nation names over both 85-file sets with no match,
  and no remaining over-description; its three record notes (this entry, two
  superseded lines in the working notes, one wording fix) were applied.
- Inventory after review: `inventory-2026-09-24.yaml` SHA-256
  `33e49cc0d115645c2d968e2ce82f71e53ddf12d0b5e896fbb09e58adf80d7d97`, 4,520
  rows; public_engine 182, planning 151, research 39, generated 2,154,
  acquisition_custody 1,193, pilot_nation_specific 417, credential_shaped 6,
  git_metadata 8, unknown 370; hold true 3,005.
- Copy set: 85 files from `D:\Projects\policy-sentinel` (80,033 bytes), 85
  from `C:\dev\_scratch\policy-sentinel` (82,849 bytes), `checklist.md` and
  `sibling-plan-assessor.md` from the audit folder (5,319 bytes). No bundles.

### Step 5: copy

- Step 4 was commit `803ee92`.
- Robocopy (`/E /COPY:DAT /DCOPY:T /R:0 /W:0 /XJ`, excluding `node_modules`,
  `dist`, `.cache`, `coverage`, `__pycache__`, `.venv`, `pilot`, `.git`, the
  three tool caches, the session log folders, credential-shaped names, and the
  two held files by full path so the public template `CLAUDE.md` still
  copies) into `I:\policy-sentinel-archive\copies\<label>\`. Exit code 1 for
  all three (files copied, no failures). Logs:
  `copy-d-policy-sentinel.log`, `copy-c-scratch-policy-sentinel.log`,
  `copy-c-scratch-policy-sentinel-audit.log`.
- Verification (every copied file hashed and matched to the inventory YAML):
  d-policy-sentinel 85 of 85 (80,033 bytes), c-scratch-policy-sentinel 85 of
  85 (82,849 bytes), audit 2 of 2 (5,319 bytes); 0 mismatches, 0 missing, 0
  extra (`5-verify-copies.json`). The held `CLAUDE.md` and
  `scripts\sovereignty-guard.sh` are absent from both copies; the template
  `examples\tribe-deployment-template\CLAUDE.md` is present.
- `COPY-MANIFEST.yaml` written in each copy (source path, date, file count,
  bytes, verification, `bundle_path: null` with the hold reason, git state,
  exclusions). No `git bundle` was created (held in step 4); generated items
  were not copied.
- Source locations after copying (`inventory\git-state-after-copy.txt`):
  every HEAD, ref, commit count and index modification time is identical to
  `git-state-before.txt` for all four legacy repositories. The only status
  difference is in `C:\dev\_scratch\policy-sentinel`, 99 to 110 untracked
  lines, all of them this session's own log files under `session-02\` (the
  designated log folder, finding S2-F6).

### Step 6: digests

- Step 5 was commit `71da30f`.
- Seven digests written by the lead under `I:\policy-sentinel-archive\digests\`,
  each tier T0 at the top: 01 development history, 02 methods and evidence
  model, 03 sovereignty constraints and decisions, 04 source research
  compendium (with "Weight estimate inputs for GD-18"), 05 lessons learned, 06
  pilot history, 07 legacy divergence report (states that no merge was
  performed). One read-only `legacy-inventory` agent extracted the facts of the
  31 source reviews and 5 research documents for digest 04; every hash in
  every digest was computed by the lead.
- **Finding S2-F9 (lead error, caught):** writing digests 05 and 06 by hand,
  the lead twice completed a 64-character hash from a 12-character prefix it
  had seen, producing two fabricated hashes. A checker
  (`check-digest-hashes.mjs`) now requires every 64-hex string in the digests
  and the inventory to equal a hash the lead computed (hash logs, raw
  manifests, git state); both were corrected and the check reports 0 unknown.
  The lead also verified three legacy quotes against the archived copies and
  corrected one that the sovereignty review had paraphrased.
- Digest review (sovereignty-reviewer): first pass **FAIL**, ten findings: two
  overstatements of Nation evidence in digest 04 (a dropped exception in a
  quoted line; a paragraph asserting that several reviews name a Nation, cite
  gates they do not cite, and describe a Nation position the source says is
  not covered), three descriptions of held material beyond kind (digests 01,
  04, 02 and 06, including receipt-derived custody figures and a link between
  a held study folder and the five PDFs), and five accuracy fixes. All ten
  applied; the held-study link was also removed from the inventory, the
  working notes and this ledger. Second pass: **PASS**; its two wording notes
  were applied.

### Step 7: index and close-out

- Step 6 was commit `18251d1`.
- `I:\policy-sentinel-archive\ARCHIVE-INDEX.md` generated from computed
  hashes (what the archive is, layout, provenance, hold list, digest hashes,
  inventory and manifest hashes, the copy-only rule and the canonical tree):
  SHA-256 `8651713844eec390efcf17348daa506c626402b208f9344056e985c6a0c8694b`.
  Digest hashes: 01 `2f1eab230ab8439ce3911eaf2be4071c090b6c0159686319cc91db983d61fbaa`,
  02 `1a566cb45586dcd0b4100916d463c3ee17d7014f940d89a4e17ce02a984d735e`,
  03 `54a1c583532dce501dddaeefd2e3db2c45d5cee59763af9c58d87c64042f58dc`,
  04 `284139585d0a3d7472fd42bdfc246f5aa196c229599bde8239936d66cae9aebe`,
  05 `eeb30d1b8c75b1b02caa3ea1dc1f8eb54f5fb09eab986cbba2f8d0ab7343a93a`,
  06 `2ac21a2241feb6c62a0f2f8ea2c4062de6e17536d7d359911eab1a33d5e349c6`,
  07 `c2a674a8e1d4de95c5e8867903f2a86dcb198823905cb9f51d57d7f78ba3e8e8`.
- Archive on disk: 240 files, 2,893,059 bytes. I: drive free space after
  copying: 531,406,290,944 bytes.
- `docs/continuation-prompt.md` "Historical pointers" gains one line naming
  the archive path and the index hash.
- GD-24 is completed in the ledger by the follow-up commit that cites this
  one.

### Step 8: outcome

- GD-24 completion was commit `ecb625d` (completion commit `e479662`,
  `completed_on` 2026-09-24T18:05:22-07:00 from `git show -s --format=%cI`).
  Terminal ledger validated (109 items, zero in progress); validator tests
  473/473.
- Final legacy git state (`inventory\git-state-final.txt`): HEAD, refs,
  remotes, commit counts and index modification times identical to the
  starting snapshot for all four repositories.
- This document completed; the final `npm test` result is in "Commands and
  real outcomes".

## Answers for the owner

### 1. Held items, reasons and recommendations

| Held item | Hold reason | Recommendation |
| --- | --- | --- |
| `D:\Projects\nez-perce-policy-sentinel` (43 files, 4 commits) | Nation-specific deployment repository | Belongs in a private deployment repository if the Nation authorizes it; otherwise leave out. Its generic planning research could be copied after owner review. |
| `D:\Projects\esa-policy-analyzer` (35 files, 18 commits, 14 uncommitted paths) | Nation-specific planning | Leave out; its generic setup documents could be copied after owner review. |
| `CLAUDE.md` and `scripts\sovereignty-guard.sh` in both legacy engine copies | Name a Nation's deployment repository; hard-code Nation names as configuration | Copy after owner review (the owner decides whether an ATNI-published denylist of Nation names may be archived). |
| Git bundles of `D:\Projects\policy-sentinel` and `C:\dev\_scratch\policy-sentinel` | History carries the two files above and an individual's email in author metadata | Copy after owner review; the history stays intact in place meanwhile. |
| `D:\Claude-Workspace\.claude\projects\D--Projects-esa-policy-analyzer` | Unreviewed conversation transcripts | Leave out; review privately if ever needed. |
| `D:\tcr-policy-scanner-archive\T1\sentinel-routed` | Sibling-project (TCR) material outside D-080 scope | Leave out; it belongs to the TCR archive. Note that something wrote there at 2026-09-24T23:40Z during this session. |
| `C:\dev\TCR-policy-scanner\outputs\spike-makah-internal` and `spike-makah-review` | Sibling-project material about one Nation; possible T2 or T3 | Leave out; needs a tier ruling in TCR Policy Scanner's own custody. |
| `F:\projects\Nations\makah-tribe`, `F:\projects\Nations\nez-perce-tribe` | Nation-named; each holds only an empty directory | Leave out. |
| `C:\dev\_scratch\policy-sentinel-audit\sibling-tcr-policy-scanner.md` | Names Nations as corpus keys of a sibling repository | Leave out, or copy after owner review. |
| Six credential-shaped cache files in `D:\Projects\policy-sentinel\.mypy_cache` | Credential-shaped names (third-party type caches) | Leave out. |
| `I:\policy-sentinel-corpus-real-policy` and `I:\policy-sentinel-corpus` | Acquisition custody (real and synthetic) | Leave out; referenced by hash by design. |
| The five loose PDFs | Not government documents (answer 2) | Leave out of the archive; consider moving them out of the custody root to a study-inputs location, since no receipt names them. |
| `I:\policy-sentinel-review` (with `HANDOFF.md`) | Known location; private note (RL-03) | Leave out; referenced by hash. |
| `I:\policy-sentinel-knowledge-assurance` | Known location; its two Tribe-centered study folders are Nation-specific and possibly T2 or T3 | Leave out; the study folders belong in a private deployment repository or owner custody. |
| `I:\policy-sentinel-organization-review` | Known location (no sensitive content found) | Could be copied after owner review. |
| `I:\ATNI-annual-convention-2026\ga-demonstration\policy-sentinel` | Machine-only stage package with custody-derived output | Leave out. |

### 2. The five loose PDFs

All five sit at the root of `I:\policy-sentinel-corpus-real-policy`, outside
both run roots, and no receipt names them. None is a public government
document, so all five are holds (owner answer 3), listed by SHA-256 and left
in place: a public comment letter on an EPA docket (Earthjustice and Native
American Rights Fund, 2025-08-06, 28 pages, Nation-specific); an advocacy
analysis of the President's budget request (Coalition for Tribal Sovereignty,
2025-05-03, 5 pages); a letter from Tribal governments (April 2025, 3 pages,
Nation-specific); a joint policy brief of Native organizations (February 2026,
10 pages); and a High Country News article (2026-08-14, 13 pages). Their
totals match the input set recorded in a held 2026-09-05 study folder in the
knowledge-assurance location. Hashes are in the step 3c table.

### 3. Salvage candidates, ranked (digest 07)

1. The plan-assessor interface facts in the copied `sibling-plan-assessor.md`:
   GD-16 (interop pure adapter) and demonstration A4.
2. LegiScan as a discovery catalog to evaluate (CourtListener is already
   listed): GD-17 (nationwide source survey). No code.
3. OSS governance files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG),
   rewritten, not copied: RELEASE-LICENSE or GD-27 (local release package).
4. The bracketed private-deployment template, rewritten under D-072: GD-27 and
   GD-23 (user-supplied source class).
5. Deadline and alert hooks: none now (outside 1.0; open fact O-003).
6. Graph and TCR export hooks: none (superseded by `policy.citations/1`).
7. CI and Dependabot configuration: none (no remote; EXT-GITHUB closed).
8. The TSDF gate stub and the rights-frame issue template: reject.

D-001 bars copying the legacy code or design; every candidate is an input to
an existing item's own review, not a merge. No merge was performed.

### 4. Legacy statements that contradict current authority

- `copies\d-policy-sentinel\.github\ISSUE_TEMPLATE\rights-frame.md` line 15:
  "Treaty rights are jurisdictional baseline, not policy preference." Against
  `AGENTS.md`: "Never add a field or label that implies a rights,
  legal-effect, jurisdiction, eligibility, or comprehensive land-interest
  determination."
- `copies\d-policy-sentinel\README.md` line 5: the engine "analyzes them for
  rights implications and status changes". Same `AGENTS.md` rule, and D-002
  (not "a rights-impact engine").
- `copies\d-policy-sentinel\src\policy_sentinel\tsdf\gate.py` lines 6 and 7:
  "Only Tier 0 (T0) and Tier 1 (T1) data may be exported." Against the TSDF
  vocabulary in `docs/development/makah-demo/reference-lookup-2026-09-15.md`
  lines 55 to 57 ("T1 is community network access") and addendum section 4
  (a tier above T1 is refused off-deployment; T1 is not public).
- The held legacy planning repositories commit Nation-specific planning,
  against `AGENTS.md`: "Never commit ... real Nation-specific configuration"
  (not quoted, per the hold).
- Current documents still disagreeing with D-082 (not legacy): the end of
  D-075 and `docs/continuation-prompt.md` line 54 still call addendum section
  12 open (S2-F3).

### 5. Should the archive itself be a git repository?

No, as the default proposed. The archive's integrity comes from the hashed
inventory, the per-copy manifests and the index, whose SHA-256 is recorded in
the canonical repository (`docs/continuation-prompt.md`). A git repository
there would invite commits and a remote for material that includes copies of
another repository, and every held item would still have to be excluded by
hand. If versioning is wanted later, store only a new index hash in the
canonical repository for each archive revision. Bundles, if the owner
releases them, fit inside the current layout (`bundles\`).

### 6. Archive size and free space

241 files, 2,897,714 bytes (2.9 MB) at close. The I: drive had
531,406,290,944 bytes free after copying and 531,404,754,944 bytes free at
close (used: 492,799,107,072 bytes after copying).

### 7. The planning act, in one sentence

The four new general-development items GD-24 to GD-27 were added to
`ROADMAP.yaml` under decisions D-080 and D-081 with zero changes to the
validator or its tests, which accepted them and still passes 473 of 473; the
only constraint was choosing priority numbers so the item meant to run first
could be activated.

### 8. First-pass weight estimate for GD-18 (an estimate for GD-18 to replace)

Inputs the record holds (digest 04 cites each): discovery-01, 423 objects,
37,589,489 bytes, 210 works, sealed corpus 19,240,268 bytes; makah-demo-02,
four PDFs of 1,122,216, 672,713, 252,123 and 2,035,657 bytes; GovInfo Federal
Register HTML renditions (11 captures, mean 112,927 bytes, measured this
session from the custody manifest); one Federal Register GovInfo PDF of
260,175 bytes; the Federal Register daily facet of 1,005,337 documents from
1994-01-03 to 2026-07-31; the addendum's reference-tier figure of 1 to 2 KB
per record and "two hundred thousand records per year".

Derived per-work sizes: HTML object mean 88,864 bytes and 2.01 objects per
work, so 179,000 bytes of HTML custody per work; derived analyzed corpus
91,620 bytes per work; PDF object mean 1,020,677 bytes.

| Scenario | HTML or text custody | PDF custody | Derived corpus |
| --- | --- | --- | --- |
| Reference tier only (metadata, locator, hash): Federal Register history | 1.0 to 2.0 GB | same | none |
| Reference tier only: 200,000 records per year | 0.2 to 0.4 GB per year | same | none |
| Federal Register full history, 1,005,337 documents | 113.5 GB | 261.6 GB (one observed PDF size) to 1.03 TB (four-PDF mean) | 92.1 GB |
| Annual flow, 200,000 documents per year | 35.8 GB per year | 204.1 GB per year | 18.3 GB per year |
| Federal plus 50 states plus DC current text, assuming 10,000 documents per jurisdiction (520,000) | 93.1 GB | 530.8 GB | 47.6 GB |
| The same, assuming 50,000 per jurisdiction (2,600,000) | 465.4 GB | 2.65 TB | 238.2 GB |
| What fits the D-077 caps (35 GB custody, 10 GB derived) | about 195,000 works | about 34,000 works | about 109,000 works (binds first) |

Assumptions and limits: the per-jurisdiction counts of 10,000 and 50,000 are
assumptions, not record figures; the record holds no size or count for the
U.S. Code, the CFR, state codes or administrative codes, and none for the
international instruments class. Washington session-law HTML (a measured mean
of about 31 KB) is much smaller than bill pages (about 147 KB), so the mix
matters. Custody and derived figures come from one Washington-heavy run and
four PDFs. Conclusion for GD-18 to test: a full federal plus 50-state
current-text corpus does not fit the D-077 custody cap in any scenario, while
a reference-first index of it does.

### 9. Where session 4 should start, and GD-26

Start session 4 with GD-26 (reproducible checks), then wave 2 from GD-04. GD-26
is small and ready. It makes `npm test` and the hook tests pass on a fresh
checkout (the deep review's Appendix A failure), and it can absorb S2-F2 (add
`.claude/settings.local.json` to `.prettierignore`). It also tests the
`.claude/settings.json` deny rules, one of which fired correctly this session.
Doing it before wave 2 means every wave 2 lane is verified by reproducible
checks. One ledger step is needed first. GD-26 sits at priority 335, behind
the ready wave 2 items, and the focus rule selects the lowest ready number. A
one-item planning act must move it ahead, for example to priority 308 before
GD-24, just as session 2 placed GD-24. Session 3 (GD-17 and GD-18) needs the
same move (S2-F4).
