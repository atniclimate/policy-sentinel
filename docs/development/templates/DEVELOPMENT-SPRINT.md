# Development sprint template

Status: reusable, non-authoritative template. Filling this out does not open a
gate. Reconcile it with [`AGENTS.md`](../../../AGENTS.md), the complete
[`ROADMAP.yaml`](../../../ROADMAP.yaml), binding contracts, and live Git before
mutation. Follow the
[agent and tool operating model](../AGENT-AND-TOOL-OPERATING-MODEL.md).

## Sprint contract

- Work item and milestone: `<exact roadmap ID>`
- Exact owner authority and still-closed gates: `<citations and states>`
- Starting branch, HEAD, parent, status, worktrees, and remotes: `<values>`
- One user or engine capability: `<single bounded capability>`
- Starting state: `<observable current behavior>`
- Terminal state: `<observable new behavior>`
- Dependencies and accepted evidence: `<exact items/paths>`
- Allowed paths: `<closed list>`
- Protected and prohibited paths/actions: `<closed list>`
- Required synthetic or authorized fixtures: `<cases>`
- Required tests and acceptance evidence: `<objective checks>`
- Stop/escalation conditions: `<authority, evidence, compatibility, privacy,
  source, environment, or validation boundaries>`
- Allowed terminal dispositions: `<copy exact dispositions from the governing
  task>`

## Roles and write leases

- Lead and shared-file owner: `<one person/agent>`
- Task-assigned specialists: `<bounded read questions and allowed paths>`
- Registered read-only role, if relevant:
  `<source_evidence_auditor | sovereignty_adversarial_reviewer | none>`
- Repository source-review skill: `<required only for a materially new or
  changed source review | not applicable>`
- Independent reviewer: `<must not author the reviewed closure>`
- Write map: `<one non-overlapping complete file/dependency closure per writer>`
- Concurrency limit and sequencing: `<environment limit; dependency order>`

Specialist labels are task assignments unless they match one of the two
registered roles above. Begin all delegated work read-only; publish the write
map before granting a lease.

## Execution sequence

1. Read authority and the roadmap completely; reconcile Git, evidence, gates,
   generated files, and the existing capability.
2. Run `npm run validate:roadmap`, then mark the authorized item
   `in_progress` and validate the ledger.
3. Write the path-level manifest and launch bounded read-only analysis.
4. Implement the smallest vertical increment through the assigned leases,
   using `apply_patch` for authored files and repository generators for
   generated outputs.
5. Add representative, missing, malformed, privacy-bearing, and failure cases
   required by the contract. Do not add live provider bodies or unsupported
   authority claims.
6. Run focused checks after each closure. Integrate through the lead, then run
   an independent review with finite closure criteria.
7. Run `git diff --check` and the applicable repository commands, ending with
   `npm run check` when required and locally safe. Record exact outcomes and
   proof limits.
8. Reconcile the roadmap to the true terminal state, validate it, commit only
   authorized paths, and use a follow-up roadmap commit for commit evidence.
9. Produce the terminal report and durable continuation handoff. Stop; do not
   advance to another tranche.

## Validation record

| Command/check | Required because | Exact result | Proves | Does not prove / skip consequence |
| --- | --- | --- | --- | --- |
| `<command>` | `<changed surface>` | `<exit/count/hash>` | `<bounded claim>` | `<limit>` |

The installed lifecycle hooks are cooperative guardrails. Hook tests do not prove
client trust/event delivery, product acceptance, source activation, browser
behavior, or publication. Label browser and environment-installed validators
optional until verified in the active session.

## Checkpoint and terminal report

Before compaction or a long pause, record the current item, HEAD/status,
completed work, remaining leases, gates, validation debt, and exact next
command; then run `npm run validate:roadmap`.

Return one allowed disposition and report: starting/ending branch, HEAD and
status; authority/gates; capability delta; agents/leases; fixtures and tests;
changed paths/commits; exact validation outcomes; skipped checks and proof
limits; protected evidence; remaining blockers; forbidden operations absent;
handoff path; and exact next owner action.
