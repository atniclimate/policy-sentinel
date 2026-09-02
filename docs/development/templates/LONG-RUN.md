# Long-run template

Status: reusable, non-authoritative template. It coordinates a bounded run; it
does not authorize its objective. Begin with [`AGENTS.md`](../../../AGENTS.md),
the complete [`ROADMAP.yaml`](../../../ROADMAP.yaml), binding contracts, live
Git, and the
[agent and tool operating model](../AGENT-AND-TOOL-OPERATING-MODEL.md).

## Run contract

- Objective and exact roadmap root: `<one bounded outcome>`
- Owner authority and closed gates: `<citations and states>`
- Starting branch, HEAD, parent, status, worktrees, and remotes: `<values>`
- Starting capability: `<observable truth>`
- Terminal capability: `<observable acceptance state>`
- Dependencies and evidence: `<exact roadmap/contracts/artifacts>`
- Allowed paths and generated families: `<closed list and generators>`
- Protected paths and forbidden operations: `<closed list>`
- Required fixtures, tests, compatibility, migration, privacy, and failure
  behavior: `<objective contract>`
- Completion and stop conditions: `<finite conditions>`
- Allowed terminal dispositions: `<exact strings>`

## Coordination ledger

For each agent record: bounded question; allowed reads; prohibited paths;
expected evidence; dependency; initial read-only status; later write lease, if
any; accepted/rejected/escalated findings; and validation owed.

Use one lead coordinator. Specialist names are task assignments unless they
are the registered `source_evidence_auditor` or
`sovereignty_adversarial_reviewer`. Invoke the repository
`policy-sentinel-source-review` skill only for a materially new or changed
source review. Set concurrency to the verified session limit and use waves
when the topology is larger. Do not nest delegation unless the task explicitly
requires it.

## Phases

1. **Authority and checkpoint:** read all governing instructions and the
   roadmap; reconcile Git, preceding handoffs, gates, protected identities,
   current behavior, generators, commands, and owner changes. Run the smallest
   starting checks.
2. **Read-only fan-out:** launch bounded independent inventories. The lead
   reads critical authorities directly and does not delegate decisions.
3. **Convergence design:** classify discrepancies and publish a path-level
   manifest containing the current defect, authoritative result, semantic or
   mechanical effect, compatibility impact, validation, owner, dependencies,
   and decision/evidence needs.
4. **Write leases:** assign non-overlapping complete file or dependency
   closures. Reserve shared root, roadmap, decision, integration, commit, and
   handoff surfaces to the lead unless one whole file is explicitly leased.
5. **Implementation and integration:** use `apply_patch` for authored edits,
   repository generators for generated files, and focused checks per closure.
   Revoke leases before lead integration.
6. **Independent audit:** a reviewer who authored none of the candidate
   closure inspects the entire diff and returns approval or a finite defect
   list with exact closure evidence.
7. **Validation and checkpoint:** run `git diff --check`, changed-path and
   protected-identity checks, applicable focused commands, and the required
   serialized `npm run check`. Record environmental skips and their impact.
8. **Roadmap, commit, and handoff:** set truthful terminal state, validate the
   ledger, commit only authorized paths, add commit evidence in a follow-up
   ledger commit, validate the final handoff against final HEAD, return one
   disposition, and stop.

## Context conservation

Before compaction or a long pause, update the roadmap and coordination ledger
with current focus, completed closures, active/revoked leases, changed paths,
gates, decisions, validation debt, protected identities, and the exact next
command. Run `npm run validate:roadmap`. On recovery, reread authority and
verify HEAD/status before trusting the checkpoint; never reconstruct state
from chat memory.

## Validation record

| Surface | Command/check | Exact result | Proof limit |
| --- | --- | --- | --- |
| `<surface>` | `<repository-native command>` | `<exit/count/hash>` | `<what remains unproved>` |

Use only commands present in `package.json`. The five hooks do not replace
manual authority review, independent audit, full validation, or a commit.
Custom-role configuration does not prove spawn visibility. Treat browser
surfaces and global skill validators as optional/environmental until verified.

## Terminal handoff contract

The final report and fresh-session handoff include: exact disposition;
starting/ending branch, HEAD, parent, status and commits; capability delta;
authority and gates; canonical paths; agents, findings and leases; changed and
protected paths; fixtures/tests; command outcomes and proof limits; skipped
checks; remaining blockers; forbidden operations absent; exact next tranche;
and next owner action. A launch prompt repeats the exact allowed/prohibited
paths, sequencing, validation, stop conditions, and dispositions, but does not
repeat completed discovery or silently authorize the next tranche.
