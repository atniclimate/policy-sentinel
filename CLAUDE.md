# CLAUDE.md

Claude Code does not read `AGENTS.md` by itself, so it is imported here. This
file adds Claude Code notes only.

@AGENTS.md

## Working notes

- The deny list in `.claude/settings.json` stays for remote changes, tag,
  rebase, amend, hard reset, unrelated `gh pr`/`gh release` mutations,
  credentials, `curl`, `wget`, `rm -rf`, edits to sibling and corpus
  repositories, and reads of the sealed `pilot` directory. Routine commit,
  merge, push, pull-request merge, release create/edit, workflow run/rerun, and
  package publish commands defer to host permissions; the exact in-session owner
  command supplies scope, not this list. When a command is denied, inspect the
  denial and follow the applicable host policy; never bypass it with another
  tool or rephrase the command. Do not edit the list to work around a denial.
- The main session is the only writer to the Git index. Subagents and workflows
  edit files on disjoint paths; the main session stages by explicit path and
  commits.
- Use subagents or workflows for disjoint lanes and for the one review at the
  risk boundary, not for single-file reads. Use a workflow when two or more
  lanes run in one step. Subagents do not spawn subagents. Project agents in
  `.claude/agents/`: `gd-lane` for one lane on a listed file set;
  `gate-verifier` at a wave boundary and before publishing;
  `sovereignty-reviewer` at the risk boundary, split for a large diff into
  identity and jurisdiction, privacy, and wording and provenance; `source-scout`
  for a source note's documentation read; `legacy-inventory` for one legacy
  location. A lane that adds a source module or a config file is a
  general-purpose agent given `gd-lane` rules 1 to 7, the land-field ban of rule
  8, the row's approved host and its source note; the main session wires shared
  files.
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
