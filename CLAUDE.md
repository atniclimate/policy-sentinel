# CLAUDE.md

Claude Code does not read `AGENTS.md` by itself, so it is imported here. This
file adds Claude Code notes only.

@AGENTS.md

## Session start

Start in minutes: `docs/STATUS.md`, `git status --short`,
`git log --oneline -10`, then only the code the task touches. No full roadmap
read and no validators before an edit. If the checkout does not match
`docs/STATUS.md`, say so first.

## Working notes

- The deny list in `.claude/settings.json` stays (push, remote, tag, rebase,
  merge, amend, hard reset, `gh pr`, `gh release`, `gh secret`, `curl`, `wget`,
  `rm -rf`, edits to sibling and corpus repositories, reads of the sealed
  `pilot` directory). When a command is denied, switch tools or ask the owner.
  Do not rephrase the same trick or edit the list.
- The main session is the only writer to the Git index. Subagents and workflows
  edit files on disjoint paths; the main session stages by explicit path and
  commits.
- Use subagents or workflows for disjoint lanes and for the one review at the
  risk boundary, not for single-file reads. Subagents do not spawn subagents.
  Project agents are in `.claude/agents/`: `gd-lane`, `gate-verifier`,
  `source-scout`, `sovereignty-reviewer` and `legacy-inventory`.
- Sibling repositories `I:\land-use-analyzer`, `I:\TCR-policy-scanner` and
  `I:\cap-assessor` are read-only: read interface code and docs, never edit,
  install or commit there. In `I:\cap-assessor` the `pilot\` directory holds
  sealed records. Never list, read, glob or search inside it, and keep it out of
  every recursive search.
- Scratch files and logs go in
  `C:\dev\_scratch\policy-sentinel\<session-name>\`. Read back the summary and
  the failing lines, and quote a failing assertion instead of pasting a log.
- Dates on records come from the record (`git show -s --format=%cI <sha>`). File
  names use `Get-Date -Format yyyy-MM-dd`.

## Reporting

Five lines, as set out in `AGENTS.md` under "How to work". Pair every ID with
its plain-language name. Use plain ASCII and no em dashes. Name every decision
still waiting on the owner.
