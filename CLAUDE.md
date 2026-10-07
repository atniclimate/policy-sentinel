# CLAUDE.md

Claude Code reads this file automatically; it does not read `AGENTS.md`.
`AGENTS.md` is the governing contract for every agent in this repository and is
imported below so that both stay one source of truth. Nothing in this file
repeats or overrides a rule from it; this file only adds Claude Code operating
notes.

@AGENTS.md

## Start of session

- Read `docs/continuation-prompt.md` first and follow its scope-specific context
  rule. General-engine work, shared extractor work, ledger graph changes, and
  uncertain or mixed scope require the complete roadmap and full read order. A
  task confined to the existing demo surface requires the selected item's full
  recursive dependency, gate, decision, acceptance, evidence and blocker
  closure, current focus and terminal reason, applicable instructions and demo
  handoff. Missing references or inconsistent authority require the full-read
  route.
- Confirm the checkout (`git branch --show-current`, `git rev-parse HEAD`,
  `git status --short`) against the explicitly selected plan and the matching
  surface's current handoff. For October demo work, start with
  `docs/DEMO-STATUS.md` and any private recovery explicitly selected by the
  current task or its plan; for general-engine work use the continuation
  prompt's selected ledger item and corresponding handoff. Do not choose a plan
  by filename date or resume a completed grant. A completed or unselected demo
  record is not a new active task.
- Run `npm run validate:roadmap` and `npm run validate:backbone` before any
  edit. A failure is the first finding, not something to work around.

## Standing checks

`npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm run validate:roadmap`, `npm run validate:backbone`, `npm run scan:source`,
`npm run build`. Send long output to a log under
`C:\dev\_scratch\policy-sentinel\<session-name>\` and read back only the summary
and the failing lines. Quote a failing assertion; never paste a whole log into
the conversation.

## Git

- Use local Git for local work. External and history-changing actions remain
  closed unless covered by exact current owner authority. Follow `AGENTS.md` and
  D-083/D-084 for the existing demo exception; it does not authorize
  general-engine publication or new source/account operations. Do not infer
  publication authority from this startup file, a generic launch, or cached
  branch labels. Preserve the recorded deny settings, the ban on `--no-verify`,
  and no-force/no-history-rewrite boundaries. This amendment adds no authority
  to create tags or alter remotes.
- One commit per checkpoint. When a `ROADMAP.yaml` item changes status, run
  `npm run validate:roadmap` before that commit.
- The main session is the only writer to the Git index. Subagents edit files;
  the main session stages by explicit path and commits.

## Protected paths

`src/kernel/**`, `src/experimental/**`, `docs/vision/**` and the K0/S0/O0
contracts stay byte-identical while their convergence gates are closed. The
sealed 2.0 corpus must replay unchanged. The private-context files (Module 4 in
`docs/architecture/general-development-addendum-2026-09-22.md`) must be
unreachable from the public application entry and the synthetic artifact build.

## Sibling repositories

`I:\land-use-analyzer`, `I:\TCR-policy-scanner` and `I:\cap-assessor`
(plan-assessor) are read-only from this repository: read their interface code
and docs, never edit, install or commit there. In `I:\cap-assessor` the `pilot\`
directory holds sealed records that no model may read: never list, read, glob or
search inside it, and keep it out of every recursive search.

## Subagents

Project agents live in `.claude/agents/`: `gd-lane` (executes exactly one GD
step, owns only that step's files), `gate-verifier` (read-only standing checks
and byte-identity checks) and `source-scout` (read-only web research for the
nationwide source survey). Use them for disjoint lanes and verification, not for
simple searches or single-file reads. Subagents do not spawn subagents.

## Records

- Append a short ledger entry (what finished, commit sha, what is next) to the
  session's audit or outcome document at every checkpoint. After context
  compaction, recover from that ledger, the task list and `git log`.
- At session close, write the handoff under `docs/handoffs/` following the
  existing outcome documents there.
- Dated records take their dates from the record (a commit timestamp via
  `git show -s --format=%cI <sha>`, a receipt), never from today. File names use
  `Get-Date -Format yyyy-MM-dd`.

## Environment

Windows x64, PowerShell paths, Node 24.19.0, npm 12.0.2 (see `AGENTS.md`,
"Commands and validation"). External custody namespaces live outside the
repository (for example `I:\policy-sentinel-corpus-real-policy`); never serve or
copy their acquisition objects.

## Reporting

Pair every ID (GD-nn, RD-nn, RL-nn, D-nnn, gate names) with its plain-language
name. Plain ASCII, no em dashes. Say what changed, the commands run and their
real outcomes, and every gate that stays closed.
