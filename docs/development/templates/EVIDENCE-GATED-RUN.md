# Evidence-gated run template

Status: reusable, non-authoritative template. It preserves an exact evidence
boundary while allowing independent authorized work. Read
[`AGENTS.md`](../../../AGENTS.md), the complete
[`ROADMAP.yaml`](../../../ROADMAP.yaml), relevant contracts, and the
[agent and tool operating model](../AGENT-AND-TOOL-OPERATING-MODEL.md).

## Gate contract

- Gate ID, owner, and current state: `<exact roadmap entry>`
- Governed claim or capability: `<what must remain blocked>`
- Why current evidence is insufficient: `<path/source-cited fact>`
- Exact originating authority required: `<authority, surface, date/version>`
- Minimum evidence fields: `<identity, provenance, temporal scope,
  completeness/reconciliation, terms/reuse, review, hash or receipt>`
- Source access authority: `<explicitly authorized exact access | not
  authorized; no access>`
- Prohibited inference: `<for example arithmetic, search snippets, third-party
  copies, names, keywords, geography, model output, or prior agent reports>`
- Independent work allowed around the gate: `<closed list of tasks/paths>`
- Protected/prohibited paths and actions: `<closed list>`
- Stop/escalation conditions: `<unsafe access, conflicting authorities,
  credentials/terms/cost/contact, privacy, reproduction, or validation defect>`
- Allowed terminal dispositions: `<exact strings>`

Public visibility, a successful request, a fixture, CORS, or an adapter does
not authorize access, establish reuse rights, activate a source, or prove
coverage. Unknown, unavailable, not observed, not assessed, outside coverage,
and absent remain distinct.

## Roles and leases

- Lead/gate custodian: `<owns authority decision, shared files, roadmap, and
  terminal disposition>`
- `source_evidence_auditor`: `<bounded read-only question, when applicable>`
- `sovereignty_adversarial_reviewer`: `<independent inference and non-claim
  challenge, when applicable>`
- Task-assigned contract/fixture/implementation specialists: `<bounded work>`
- Source-review skill: `<required for a materially new or changed source
  review; procedure only>`
- Write leases: `<non-overlapping paths for work that cannot alter the gate>`
- Concurrency and order: `<verified slot limit and dependencies>`

Do not delegate owner authority, terms acceptance, source activation, or gate
state. Begin all subagents read-only and grant a write lease only after the
lead publishes the allowed work-around-the-gate manifest.

## Execution

1. Reconcile the gate, Git, roadmap, prior evidence, source review, protected
   identities, and exact access authority. Run `npm run validate:roadmap`.
2. Record the evidence request before any permitted access: authority, URL or
   repository surface, method, budgets, fields, storage/logging boundary,
   terms/credentials/cost/contact conditions, and failure behavior.
3. If access is not exactly authorized or would itself accept terms/cross a
   gate, do not access the source. Record the gap and continue only the listed
   independent work.
4. Keep fixtures synthetic unless accepted evidence permits otherwise. Never
   retain raw responses, private/contact/land fields, credentials, or
   unrelated provider content.
5. Test representative, missing, malformed, duplicate, stale, privacy-bearing,
   and failure behavior appropriate to the bounded contract. Do not label a
   passing fixture as production evidence.
6. Have an independent reviewer challenge the provenance, completeness,
   inference boundary, gate effect, and claimed terminal state.
7. Run focused commands and the required broader validation. The installed hooks
   are guardrails only; hook success is not evidence acceptance.
8. The lead updates the roadmap only when exact accepted evidence supports the
   transition. Otherwise keep the gate closed, record useful completed work
   separately, checkpoint authorized paths, return one disposition, and stop.

## Evidence record

| Field | Exact value |
| --- | --- |
| Originating authority and surface | `<value>` |
| Access date/version and temporal scope | `<value>` |
| Observed bytes/fields and provenance | `<value>` |
| Authentication, terms, cost/contact, rate, reuse, and attribution | `<value>` |
| Completeness/reconciliation and known failures | `<value>` |
| Stored/committed material and exclusions | `<value>` |
| Independent review and closure evidence | `<value>` |
| Gate remains closed or exact accepted transition | `<value>` |

## Checkpoint and report

Before compaction, record current focus, gate state, evidence obtained or still
missing, completed independent work, active/revoked leases, changed paths,
validation debt, and exact next command; run `npm run validate:roadmap`.

Return: one exact disposition; starting/ending branch, HEAD and status; gate
and authority; evidence observed and still absent; prohibited inferences
avoided; agents/leases; useful capability delta outside the gate; changed
paths/commits; commands and results; proof limits/skips; protected evidence;
forbidden operations absent; handoff; and the exact owner/evidence action
required. Do not continue into gated implementation or another tranche.
