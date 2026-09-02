# Agent and tool operating model

Status: current development guidance. This document organizes execution; it
does not authorize work, open a gate, accept evidence, or supersede
[`AGENTS.md`](../../AGENTS.md), [`ROADMAP.yaml`](../../ROADMAP.yaml), or a
binding product contract.

## Operating rules

1. Start from the live repository. Read every applicable `AGENTS.md`, read the
   roadmap completely, and reconcile the branch, HEAD, status, worktrees,
   remotes, relevant history, gates, and protected evidence before mutation.
2. Name one bounded capability or evidence question. Record its starting and
   terminal states, exact authority, allowed paths, protected paths,
   dependencies, fixtures, tests, and stop conditions.
3. Keep authority, integration, shared files, roadmap state, commits, and the
   terminal disposition with one lead. Subagent findings are review input, not
   authority or completion evidence.
4. Begin delegated work read-only. Publish a path-level change manifest before
   any write lease. A lease owns a complete non-overlapping file or dependency
   closure; two agents never edit the same closure concurrently.
5. Use `rg` and `rg --files` for discovery, read-only Git for history and
   identity, `apply_patch` for authored edits, and only the Node/npm scripts
   committed in [`package.json`](../../package.json) for repository validation.
6. Use synthetic inputs unless exact task authority and accepted originating
   evidence permit otherwise. Never turn geography, keywords, arithmetic,
   model output, or an agent report into sovereign identity, membership,
   association, legal applicability, rights impact, or source activation.
7. Update the roadmap at material checkpoints and before compaction or a long
   pause. Preserve exactly one `in_progress` item while local roadmap work is
   active and zero only at a validated terminal state or genuine impasse.
8. End with an independent review, proportional checks, the required broader
   validation, a local checkpoint when authorized, and one exact terminal
   disposition. Local completion is not publication.

## Installed and repository-owned capabilities

| Capability | Intended use | Proof boundary |
| --- | --- | --- |
| `rg`, `rg --files` | Fast path and text discovery. | Finds matching bytes; it does not establish authority, completeness, or semantic correctness. |
| Read-only Git commands | Establish branch, HEAD, status, history, diffs, worktrees, remotes, and protected identities. | Reports repository state only. Local commits require task authority, and remote operations remain separately gated under `AGENTS.md`. |
| `apply_patch` | Make reviewable edits inside an assigned write lease. | Does not grant permission for the target or prove the edit correct. Hook coverage depends on runtime event delivery. |
| Node and npm scripts in `package.json` | Parse, validate, test, scan, build, and inspect repository-owned surfaces. | Each command proves only its declared checks. `npm run check` is broad local validation, not source activation, browser proof, publication, or legal review. |
| Five lifecycle hooks in [`.codex/hooks.json`](../../.codex/hooks.json) | Recovery, compaction durability, pre-tool guardrails, focused post-edit checks, and one-shot stop continuation. | Synchronous cooperative guardrails, not a security boundary or acceptance suite. Runtime trust, event delivery, and tool-name mapping must be verified in the active Codex surface. |
| [`policy-sentinel-source-review`](../../.agents/skills/policy-sentinel-source-review/SKILL.md) | Reusable source-authority, contract, coverage, privacy, reuse, lifecycle, and activation review. | Procedure only. It cannot authorize source access, accept terms, decide a gate, or prove coverage. Do not invoke it for ordinary code review. |
| [`source_evidence_auditor`](../../.codex/agents/source-evidence-auditor.toml) | Registered read-only source-evidence review role. | Configuration parsing or selector discovery does not prove that a given session spawned the role. Its report is not source acceptance. |
| [`sovereignty_adversarial_reviewer`](../../.codex/agents/sovereignty-adversarial-reviewer.toml) | Registered read-only adversarial review role. | Read-only configuration is a default, not an authority boundary. Its verdict is not owner acceptance. |

Architecture steward, schema steward, UI reviewer, accessibility reviewer,
test reviewer, and coordinator are task assignments, not permanent installed
roles. Create them through the active run's bounded delegation mechanism and
state their read/write authority explicitly. A browser surface, a custom-role
selector, or an installed global skill validator is optional and environmental
unless verified in the current session; record an unavailable check rather
than inventing a substitute.

## What the hooks prove

| Hook | Mechanical behavior | It does not prove |
| --- | --- | --- |
| `SessionStart` | On a delivered matching event, validates and loads the roadmap and emits bounded HEAD, status, focus, next-action, and closed-boundary context without reading chat history. | It does not block startup, read every authority, detect every contradiction, or prove implementation. |
| `PreCompact` | Blocks a delivered compaction event when the roadmap is invalid or the worktree is dirty without an active roadmap item. | It does not write a checkpoint, commit, distinguish owner changes, or run the full suite. |
| `PreToolUse` | For matching `Bash` or `apply_patch` events, denies enumerated destructive Git, closed remote/credential/notification/canary commands and enumerated sensitive, outside, or frozen patch paths. | Regex and path checks do not cover alternate tool names, nested interpreters, programmatic writes, generic network access, every command spelling, or every product gate. They never create authority. |
| `PostToolUse` | After a matching `apply_patch`, runs diff/format checks and conditionally selects roadmap, foundation, and source-boundary checks; it warns when a binding planning edit may need ledger reconciliation. | It does not observe shell edits, check every documentation link, validate skill or custom-role discovery, run browser checks, or replace `npm run check`. |
| `Stop` | Requests at most one continuation for an invalid ledger, an active item, or a dirty untracked stopping state. Its recursion guard permits the second stop. | It does not guarantee a clean state, repair or commit work, finish an item, or validate product acceptance. |

`npm run hooks:test` verifies repository handler/config behavior. It does not
prove that hooks are trusted or that the active client delivered every event.
After cloning or changing hooks, inspect and trust their exact definitions in
the active Codex surface and record whether a real event probe was performed.

## Work-class staffing and routing

“Task-assigned” below means a bounded role created for the run; it does not
name an installed custom role. All rows use one lead and a reviewer who did not
author the reviewed closure.

| Work class | Lead and specialists | Independent review | Skill, hooks, and tools |
| --- | --- | --- | --- |
| Repository/product reconciliation | Repository lead; task-assigned backbone, product, schema, roadmap, and workflow readers. | Fresh task-assigned contradiction reviewer; add `sovereignty_adversarial_reviewer` when authority or non-claim language changes. | No source skill by default. Use all five hooks, `rg`, read-only Git, `apply_patch`, roadmap/format checks, and the final `npm run check`. |
| Schema or contract development | Schema lead; task-assigned producer, consumer, fixture, and migration readers. | Task-assigned schema consumer plus `sovereignty_adversarial_reviewer` for epistemic or identity fields. | Source skill only when a provider contract is materially involved. Use all hooks, foundation validation, focused tests, type checking, source-boundary scan, and full validation. |
| Source-adapter development | Adapter lead; `source_evidence_auditor`; task-assigned contract, fixture, lifecycle, and health reviewers. | `sovereignty_adversarial_reviewer` and a task-assigned adapter reviewer. | Use the source-review skill, all hooks, source-boundary scan, foundation validation, focused adapter/pipeline tests, and full validation. Source access itself needs exact authority. |
| Canonical-corpus and lifecycle work | Engine/corpus lead; task-assigned schema, provenance, identity, deduplication, and lifecycle specialists. | `sovereignty_adversarial_reviewer` plus a fresh task-assigned contract reviewer. | No source skill unless source behavior changes. Use all hooks, foundation validation, focused pipeline tests, type checking, source scan, deterministic checks, and full validation. |
| Regional registry, geography, or taxonomy work | Registry/taxonomy lead; `source_evidence_auditor` for originating rosters or authorities; task-assigned identity, geography, and mapping specialists. | `sovereignty_adversarial_reviewer` and a fresh mapping reviewer. | Use the source-review skill for source-derived claims, all hooks, foundation validation, negative fixtures, source scan, and full validation. Do not introduce another capability unless the exact task verifies and authorizes it. |
| Output-adapter and UI work | Output/UI lead; task-assigned corpus-contract, accessibility, interaction, and artifact reviewers. | Fresh task-assigned factual-noninterference reviewer; add `sovereignty_adversarial_reviewer` for why-shown or authority presentation. | No source skill by default. Use all hooks, focused unit/accessibility tests, type checking, build, artifact validation, and full validation. Browser evidence is optional only when the required surface is actually available. |
| Acceptance-scenario qualification | Acceptance lead; task-assigned use-case, fixture, traceability, and coverage reviewers. | Fresh reviewer independent of scenario authors; add the registered adversarial role for sovereign or relevance assertions. | Source skill only for new source evidence. Use all hooks, targeted acceptance tests, foundation/source checks as applicable, and full validation. |
| Security, privacy, accessibility, and release hardening | Hardening lead; task-assigned privacy, security, accessibility, artifact, and operations reviewers. | Fresh task-assigned release reviewer plus the registered adversarial role where data visibility or authority is involved. | No source skill unless source handling changes. Use all hooks, source scan, lint, type checking, accessibility tests, build/artifact validation, diff inspection, and full validation. Publication and remotes remain separate gates. |
| Independent review and terminal handoff | Coordinator who owns no specialist conclusion by fiat; task-assigned evidence integrator. | A fresh reviewer remains read-only throughout and returns approval or a finite defect list. | No source skill unless reviewing a source claim. Use `rg`, read-only Git, every applicable repository check, protected-identity verification, all hooks, and the exact terminal-report contract. |

## Path, evidence, and stop matrix

Paths below are routing examples, not authorization. The task manifest is
always narrower when it names exact paths.

| Work class | Typical allowed closure | Protected boundary | Required evidence and stop/escalation |
| --- | --- | --- | --- |
| Repository/product reconciliation | Current root/navigation, current `docs/`, roadmap validator/tests, and development guidance named by the manifest. | Owner inputs, historical evidence bodies, K0/S0/O0, schemas/runtime/source unless separately leased. | Authority map, congruence matrix, link/path proof, roadmap evidence, protected identities. Stop on accepted-authority conflict, unstable Git truth, or unavoidable protected edit. |
| Schema or contract development | Exact schemas, catalog, synthetic examples/fixtures, validators, focused tests, and mechanical consumers named together. | Unleased consumers, provider data, protected contracts, real Nation configurations, dependencies. | Unique IDs, resolved references, valid/invalid fixtures, producer/consumer agreement, migration posture, deterministic identity. Stop if compatibility needs unauthorized runtime behavior or migration. |
| Source-adapter development | One reviewed adapter closure: source review, registry entry, contract, synthetic fixtures, adapter, health/LKG behavior, and tests. | Credentials, raw responses, private/contact/land fields, other adapters, deployment/publication. | Current primary evidence, field allowlist, access/terms/rate/reuse record, lifecycle/coverage limits, malformed/privacy/failure/LKG tests. Stop at any closed access, terms, credential, cost, contact, or reproduction gate. |
| Canonical-corpus and lifecycle work | Exact engine/pipeline contracts, synthetic fixtures, transformations, and focused tests. | Output factual copies, hidden inference, source bodies, unconverged K0/S0/O0, unrelated UI. | Stable source/record/corpus identity, provenance and event survival, deterministic output, negative epistemic cases. Stop if a derived assertion becomes an authority claim or protected convergence is required. |
| Regional registry, geography, or taxonomy work | Exact registry/membership/recognition assertion, mapping, synthetic fixture, validator, and test closure. | Inferred membership, sensitive geometry, land status, universal recognition assumptions, real unapproved profiles. | Originating roster/identity evidence where required, time/version provenance, authority precedence, unmapped behavior, negative inference tests. Stop when evidence cannot support the exact relation or count. |
| Output-adapter and UI work | One adapter/view, styles/assets, accessibility fixtures/tests, build and artifact validation named by the task. | Canonical fact mutation, browser provider calls, telemetry, private visibility, deployment. | Same corpus/record identity, typed why-shown display, keyboard/a11y evidence, deterministic artifact, no unexpected network. Stop on factual drift, unavailable required browser proof, or new publication behavior. |
| Acceptance-scenario qualification | Exact scenario contract, synthetic or authorized fixtures, traceability matrix, tests, and evidence report. | Product-wide completion claims, unsupported production data, other scenario implementations. | Starting/terminal user state, requirement-to-test trace, coverage/status labels, counterexamples, repeatable results. Stop when passing requires hidden context, unsupported inference, or an unopened gate. |
| Security, privacy, accessibility, and release hardening | Exact scanners, tests, notices, artifact/build configuration, and current hardening docs authorized by the task. | Secrets, private inputs, release/push/deploy, dependency or CI changes without exact authority. | Secret/private-data scan, accessible interaction proof, artifact allowlist/hashes, closed-gate verification, exact residual risk. Stop before any external or destructive action or when required proof is unavailable. |
| Independent review and terminal handoff | Read-only repository/diff/evidence surfaces; only the lead may repair within the published manifest. | Reviewer writes, new capability, source access, owner decisions, history rewriting. | Path-cited verdict, finite defects and closure criteria, final HEAD/status, commands/results, proof limits, gates, exact next action. Stop success on any unresolved material defect. |

## Validation and evidence discipline

Choose the smallest focused checks during editing and the complete required
matrix before a durable completion claim. Available commands include:

```powershell
npm run hooks:test
npm run validate:roadmap
npm run validate:backbone
npm run format:check
npm run lint
npm run typecheck
npm run validate:foundation
npm run scan:source
npm test
npm run test:a11y
npm run build
npm run validate:artifact
npm run check
```

Record the exact command, exit result, counts or artifact identity when
meaningful, and what the command cannot prove. Check changed-path scope with
Git, run `git diff --check`, and verify protected identities whenever the task
names them. If a required browser, role selector, or environment-installed
validator is unavailable, record the skip and its acceptance consequence; do
not substitute a different surface silently.

## Context conservation and handoff

- Keep the roadmap and a dated coordination/handoff artifact sufficient to
  recover without chat history.
- Before compaction or a long pause, reconcile current focus, completed and
  remaining work, gates, leases, changed paths, validation debt, and the next
  command. Run `npm run validate:roadmap`.
- Do not compact while an undocumented write lease or unrecorded material
  finding exists. After recovery, reread authority and verify Git state before
  continuing.
- Commit only authorized paths after validation. When the ledger must cite the
  implementation commit, use a follow-up ledger commit rather than amending.
- A fresh-session handoff must contain the exact capability, start/end state,
  authority and gates, HEAD/status, canonical paths, allowed/protected paths,
  roles and leases, fixtures/tests, validation, proof limits, stop conditions,
  terminal dispositions, and copy-paste launch prompt.

Every terminal report states: one exact disposition; starting and ending
branch/HEAD/status; authority and gate state; capability or evidence delta;
agents and leases; changed paths and commits; commands and exact outcomes;
skips and proof limits; protected-evidence verification; remaining blockers;
forbidden operations confirmed absent; handoff path; and the exact next owner
action.

## Reusable run templates

- [Development sprint](templates/DEVELOPMENT-SPRINT.md)
- [Long run](templates/LONG-RUN.md)
- [Review-only run](templates/REVIEW-ONLY.md)
- [Evidence-gated run](templates/EVIDENCE-GATED-RUN.md)
