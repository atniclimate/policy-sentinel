# Review-only run template

Status: reusable, non-authoritative template. This run permits no mutation.
Read [`AGENTS.md`](../../../AGENTS.md), the complete
[`ROADMAP.yaml`](../../../ROADMAP.yaml), relevant binding contracts, and the
[agent and tool operating model](../AGENT-AND-TOOL-OPERATING-MODEL.md).

## Review boundary

- Exact evidence questions: `<finite questions>`
- Authority order and relevant gates: `<citations and states>`
- Starting branch, HEAD, status, worktrees, and remotes: `<values>`
- Allowed read paths: `<closed list>`
- Protected or unavailable paths: `<closed list>`
- Accepted evidence standard: `<bytes, Git identity, test, artifact, source,
  or contract requirement>`
- Explicit exclusions: no edits, `apply_patch`, generated output, commit,
  source activation, credential/private access, owner decision, remote action,
  publication, or notification.
- Stop conditions: `<missing authority/evidence, unsafe access, unstable state,
  or question outside scope>`
- Required verdict vocabulary: `<exact allowed verdicts/dispositions>`

## Roles

- Review lead: `<integrates evidence without authoring a result by fiat>`
- Task-assigned readers: `<question, paths, expected evidence>`
- Registered role, if relevant:
  `<source_evidence_auditor | sovereignty_adversarial_reviewer | none>`
- Source-review skill: `<use only when the question is a materially new or
  changed source review>`
- Independent challenger: `<different from the evidence integrator>`

All roles remain read-only. Agent reports are leads to reproducible evidence,
not acceptance.

## Method

1. Reconcile Git and the exact authority before opening supporting material.
2. Use `rg`, `rg --files`, and read-only Git to inventory bytes, claims,
   dependencies, and history.
3. Run only repository commands already known to be read-only and relevant to
   the question. Do not run a build, generator, source probe, or command that
   writes even ignored output unless the governing task separately permits it.
4. Test each claim against direct repository or accepted originating evidence.
   Distinguish observed fact, repository inference, unresolved gap, and
   prohibited inference.
5. Have the independent challenger reproduce material findings and search for
   counterexamples.

## Findings format

| ID / severity | Claim and classification | Exact path/source evidence | Reproduction | Impact | Closure criterion |
| --- | --- | --- | --- | --- | --- |
| `<ID / materiality>` | `<agreement, drift, mismatch, conflict, or gap>` | `<path:line, commit, hash, test, or accepted source>` | `<read-only steps>` | `<capability/gate effect>` | `<finite evidence required>` |

Silence is not approval. `PASS` requires every material question to have
reproducible supporting evidence and no unresolved counterexample. Use
`INCONCLUSIVE` or the governing non-success disposition when required evidence
is absent; never convert absence into a negative fact.

## Report

Return: one exact verdict/disposition; starting and ending Git state; questions
answered; agents and proof; path/source-cited findings; commands and exact
outcomes; environmental skips; hook/client proof limits; protected identities;
unresolved gaps; forbidden operations confirmed absent; and finite closure or
next-owner criteria. No file, roadmap status, gate, or capability changes in a
review-only run.
