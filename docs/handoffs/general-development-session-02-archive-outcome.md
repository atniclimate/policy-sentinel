# General development session 2 outcome: legacy archive and consolidation

Prepared by the lead session (Claude Opus 5.5) that executed the owner's
session-2 launch prompt on branch `realign/general-development`. The owner
was away for the run; the launch prompt's rules decided, and a hold was the
answer whenever material was unclear. This document authorizes nothing by
itself; the decision register and `ROADMAP.yaml` carry the authority.

Status: in progress. The sections below the session ledger are completed at
step 8.

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
