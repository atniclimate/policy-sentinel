# Policy Sentinel — Sol Ultra Repository Deep Dive and Vision Reconciliation

Use this prompt from the root of the local repository at `I:\policy-sentinel` in a fresh GPT-5.6 Sol Ultra Codex session.

---

# Mission

Act as the senior software architect, evidence-governance reviewer, product strategist, and technical project lead for `policy-sentinel`.

I am returning to this project after a substantial pause. Conduct a repository-wide, evidence-grounded deep dive that reconstructs what the project actually is, what has been built and validated, why work stopped, how the current implementation and governance model relate to the renewed north-star vision below, and what the smallest coherent path forward should be.

This session is a diagnosis, architecture, and planning session. It is not authorization to resume implementation, clear evidence gates, activate sources, call providers, change project governance, commit changes, publish, deploy, or contact third parties. Inspect first, synthesize fully, and leave me with an owner-ready decision packet and an exact proposed next phase.

# Renewed north-star vision

`policy-sentinel` is envisioned as a multi-jurisdictional spatial policy-intelligence platform designed to track, aggregate, and synthesize regulatory and legislative actions across user-defined geographic boundaries.

Its long-term system modules are:

| Module | Core function | Intended scope |
| --- | --- | --- |
| Spatial Engine | Map-based boundary selection | Intersect user-provided or predefined geographies—states, counties, watersheds, Tribal lands, and custom polygons—with potentially relevant governing jurisdictions, while keeping spatial intersection distinct from legal authority, Nation interest, or policy applicability. |
| Ingestion Pipeline | Data harvesting and source ingestion | Acquire and normalize official federal, Tribal, state, county, and municipal policy material under explicit source, terms, reproduction, provenance, and refresh contracts. |
| Semantic Classifier | Issue categorization and tagging | Organize documents into target domains such as water rights, endangered species, and roadless policy using source-supported labels and carefully governed machine assistance. |
| Notification Engine | Subscriptions and alerts | Support user-controlled daily, weekly, or event-driven notifications for monitored topic–location pairs, with deterministic triggers and explicit delivery authorization. |
| Synthesis Engine | Contextual reporting | Produce evidence-linked cross-jurisdictional views, change and redline summaries, conflict or interaction hypotheses, and executive briefings without presenting generated analysis as law, fact, comprehensive coverage, or official-source replacement. |

Long-term capabilities may include:

- predefined and uploaded GIS boundaries, including GeoJSON and other reviewable geospatial formats;
- overlap views across federal, Tribal, state, county, municipal, watershed, and land-management geographies;
- policy lifecycle tracking from introduction and deliberation through rulemaking, enactment, amendment, correction, withdrawal, and supersession;
- a GIS-centered dashboard with policy status, source health, temporal change, and cross-tier overlays;
- user-controlled subscriptions through approved email, webhook, or API channels;
- executive briefings describing legislative intent, possible jurisdictional interaction, regulatory friction, and policy momentum, with every claim traceable to evidence and every uncertainty visible.

Treat this as a proposed north star to reconcile with repository truth. It is not permission to erase or silently broaden the current binding mission. In particular, determine which parts:

1. are already implemented or structurally anticipated;
2. preserve and deepen the existing product;
3. require new architecture or data contracts;
4. conflict with current governance, privacy, source, or authorization boundaries;
5. should be deferred, narrowed, or rejected;
6. require an explicit owner decision before they become roadmap commitments.

# Known prior state: starting hypothesis, not a substitute for repository evidence

The attached roadmap snapshot was schema version `1.1`, updated `2026-08-03`, with roadmap ID `policy-sentinel-through-finish`. It identified `ROADMAP.yaml` as the canonical machine-readable execution ledger and gave the last durable checkpoint as `f6eb61f`.

Its recorded status was:

- 24 work items complete;
- 14 blocked;
- 9 not started;
- 0 ready;
- 0 in progress;
- 0 deferred.

The recorded product was a local-first, sovereignty-centered, static public-policy discovery and source-reference application for Tribal Nations. It was explicitly not legal advice, a comprehensive legal database, a rights-impact engine, or a substitute for official sources. The established experience was single-Nation by default, with comparison as an explicit advanced mode. The intended public beta used weekly refresh, visible coverage and health, deterministic alerts and badges, federal-only results outside Washington/Oregon/Idaho, source-explicit public relationships, and AI summaries only as a separately governed detail-view capability.

The main recorded dependency chain was:

authoritative Nation identity reconciliation → stable Nation IDs and official aliases → official WA/OR/ID coverage crosswalk → Nation registry readiness → long-tail source pilots → production single-Nation acceptance → opt-in comparison and representative-scale validation → weekly/manual refresh → local release-candidate hardening → separately authorized license, remote, Pages, and publication operations.

The three recorded local-release-candidate blockers were:

1. `B2-REVIEW` / `G-BIA-IDENTITY`: the 2026 federal recognition notice stated 575 entities but exposed 577 ordered list-entry paragraphs. No authoritative row-level reconciliation existed. Arithmetic, grouping assumptions, TLD rows, aliases, geography, addresses, or third-party inference were forbidden substitutes.
2. `B4-FR-UX` / `G-LOCAL-BROWSER`: automated UI checks existed, but the required in-app Browser backend was unavailable. An unrelated browser surface was not accepted as substitute evidence.
3. `B5-WA-RULES` / `G-WA-REGISTER-FILING-CONTRACT`: the Washington State Register lacked a bounded, exact filing-page contract for title, agency, dates, duplicate and holdover reconciliation, Reviser’s Notes, privacy exclusions, official links, and whole-refresh budgets. The separately tested Washington Governor adapter remained disabled.

Additional recorded constraints included:

- Washington Legislative Web Services lacked a trustworthy population-discovery and reconciliation contract.
- Grants.gov, Congress.gov, GovInfo, Regulations.gov, Oregon source operations, optional AI generation, outbound notifications, private or Nation-supplied material, paid/licensed sources, third-party contact, GitHub operations, Pages, and publication were controlled by closed or source-specific gates.
- No production Nation registry, production policy corpus, public beta, remote creation, push, Pages deployment, or publication was authorized by the roadmap snapshot.
- Private, restricted, Nation-supplied, contact, ownership, and land-related data were excluded or left as disabled interfaces unless separately authorized for an exact deployment.
- Nation identity, Nation association, state coverage, legal effect, eligibility, authority, and interest could not be inferred from geography, names, keywords, addresses, or model output.
- Public availability did not automatically authorize copying, reproduction, or automated access.

Repository evidence may be newer. Reconcile it carefully. Do not force the repository to match this snapshot, and do not overwrite newer evidence with remembered state. If the repository disagrees, report the discrepancy, identify which authority appears newer, and stop before changing either.

# Governing principles

Preserve these principles unless current binding repository documents explicitly supersede them:

- Sovereignty, provenance, exact identity, source authority, replayability, and limits on inference are core product behavior.
- The platform may identify spatial overlap or potentially relevant jurisdiction, but spatial coincidence alone must never become a claim of Tribal affiliation, authority, legal applicability, policy impact, consent, interest, or rights.
- Distinguish `no matching evidence`, `source unavailable`, `source not monitored`, `source blocked`, `not yet reviewed`, `ambiguous`, and `not applicable` wherever the data model supports them.
- Keep source-provided facts separate from deterministic project derivations, probabilistic classifications, model-generated synthesis, and human editorial judgment.
- Every public assertion must have field-level or record-level provenance adequate for independent review.
- Coverage claims must expose range, source health, data-as-of time, last-known-good behavior, omissions, and known blind spots.
- Fail closed on uncertain identity, association, source permission, lifecycle status, legal meaning, or private/sensitive content.
- Creativity should improve the expression and usability of what is supportably true; it must not manufacture certainty.
- Urgency should sharpen priorities, not lower evidentiary, accessibility, privacy, or security standards.
- A local release candidate is not a public beta. A disabled adapter is not source coverage. A fixture or schema is not production capability. A passing test is evidence only for the behavior that test actually exercises.

# Authority and safety boundary for this session

Operate read-only with respect to repository content and external systems.

Allowed:

- inspect all tracked and untracked repository files, Git metadata, local configuration, scripts, tests, fixtures, generated manifests, and prior reports;
- run read-only discovery commands;
- inspect dependency metadata and package scripts;
- run existing local validation only after inspecting the invoked scripts and establishing that they do not contact external systems, alter protected data, publish, deploy, install dependencies, rewrite tracked files, or depend on unavailable secrets;
- use parallel subagents for bounded read-only analysis;
- propose patches, documents, roadmap changes, architectures, tests, and experiments in the final report without applying them.

Not authorized:

- edit, create, delete, rename, format, or rewrite repository files;
- change `ROADMAP.yaml`, binding documents, gates, source status, or work-item status;
- commit, amend, tag, reset, clean, stash, merge, rebase, create branches/worktrees, alter remotes, push, open a pull request, run remote Actions, configure Pages, publish, or deploy;
- install or update dependencies, change the environment, modify Codex configuration, or install/enable hooks;
- make provider/API calls, browse blocked sources, replay sessions, accept terms, register accounts, use credentials, incur cost, or contact third parties;
- invoke AI-summary providers, send notifications, or activate any private, Nation-supplied, land-related, paid, licensed, or credentialed source path;
- substitute synthetic fixtures, cached data, arithmetic, spatial inference, model judgment, or prior agent statements for missing authoritative evidence;
- expose secrets, private data, ignored source bodies, sensitive paths, or raw material that the repository treats as non-public.

Before running any validation command, inspect its definition and transitive scripts. If its side effects are uncertain, do not run it; report the exact uncertainty. Inspect existing project hooks as untrusted executable policy before relying on them. Do not modify or enable hooks during this session.

# Sol Ultra orchestration protocol

Use the primary agent as coordinator and synthesizer. Delegate genuinely independent, bounded read-only investigations in parallel. Do not make every agent reread the entire repository without a reason. Give each agent exact directories, questions, constraints, and expected evidence format.

Spawn up to six specialist workstreams, adjusted to the repository’s actual shape:

1. **Authority, roadmap, and history auditor**
   - Read `AGENTS.md`, `ROADMAP.yaml`, the decision register, continuation/handoff documents, project brief, governance documents, and relevant Git history.
   - Reconstruct authority precedence, work-item truth, closed gates, dependency chains, stale documents, and unresolved owner decisions.
   - Return discrepancies with exact file references and commit evidence.

2. **Architecture and implementation cartographer**
   - Map application, build system, schemas, pipeline, adapters, artifact generation, frontend state, search/filter, dossier/CSV, and tests.
   - Trace representative end-to-end data flows from a source adapter through normalization and provenance into static artifacts and UI behavior.
   - Distinguish implemented production-capable logic, disabled logic, synthetic-only paths, scaffolding, dead code, and documentation-only intent.

3. **Source, ingestion, provenance, and lifecycle reviewer**
   - Examine source registry, adapter contracts, normalization, identifiers, dates, status/lifecycle semantics, reconciliation, last-known-good behavior, refresh design, and reproduction/privacy rules.
   - Build a source-by-source capability and blocker matrix.
   - Test whether the current record model can represent proposed legislative and regulatory lifecycle tracking without semantic coercion.

4. **Spatial and jurisdictional architecture reviewer**
   - Determine what geospatial code, schemas, boundary concepts, or interfaces actually exist.
   - Assess how custom polygons, official boundaries, watersheds, counties, states, Tribal lands, and overlapping jurisdictions could be introduced without turning geometric overlap into claims about identity, authority, applicability, rights, or Nation interest.
   - Identify required provenance, temporal versioning, coordinate-reference, boundary-source, and uncertainty contracts.

5. **Product, UX, accessibility, notification, and synthesis reviewer**
   - Evaluate the present single-Nation workflow, explicit comparison design, coverage/source-health communication, accessibility, mobile behavior, dossier/CSV, and user mental model.
   - Map the renewed dashboard, subscriptions, alerts, cross-tier analytics, redlines, and executive briefings to existing capabilities and closed gates.
   - Identify where deterministic features end and governed AI or outbound operations begin.

6. **Quality, privacy, security, and operational-readiness reviewer**
   - Review tests, type/lint/build checks, browser evidence, dependency/security practices, artifact allowlists, source maps/logs, CSV safety, privacy boundaries, secret handling, offline/local behavior, refresh isolation, and release/publication separation.
   - Identify untested claims, brittle checks, stale evidence, and risks introduced by the renewed spatial and synthesis vision.

Subagent rules:

- Read-only. No agent may edit files, run network operations, or make commits.
- Every finding must be labeled `OBSERVED`, `INFERRED`, or `PROPOSED`.
- Every `OBSERVED` claim must cite a repository-relative file, symbol/test, command result, or Git object.
- Record uncertainty and contradictory evidence rather than averaging it away.
- Do not mark anything complete from prose, scaffolding, fixtures, schemas, test names, or agent assertion alone.
- Return concise evidence packets to the coordinator; avoid pasting whole files.
- Wait for all assigned agents before synthesis. Resolve conflicts explicitly. If two agents disagree, inspect the primary evidence yourself.

# Required execution sequence

## Phase 0 — Establish repository and execution safety

1. Confirm the current working directory and repository root.
2. Read every applicable `AGENTS.md` before other repository actions.
3. Inspect `git status --short --branch`, current branch/HEAD, worktrees, recent decorated log, tags, and configured remotes without changing them.
4. Treat all pre-existing uncommitted and untracked content as owner work. Do not mutate it.
5. Inspect the repository tree, file-size distribution, languages, dependency manifests, generated/ignored areas, and likely binding documents.
6. Inspect Codex/project hooks and package scripts before executing them.
7. State whether the repository is safe for read-only deep-dive commands. If not, continue with file inspection where safe and explain the restriction.

## Phase 1 — Reconstruct canonical truth

Read the current versions of, at minimum, all files named by `ROADMAP.yaml` under `binding_documents`, including:

- `AGENTS.md`
- `ROADMAP.yaml`
- `README.md`
- `docs/project-brief.md`
- `docs/data-governance.md`
- `docs/architecture.md`
- `docs/source-coverage.md`
- `docs/ux-spec.md`
- `docs/mvp-plan.md`
- `docs/decision-register.md`
- `docs/source-feasibility.md`
- `docs/data-contract.md`
- `docs/continuation-prompt.md`
- the taxonomy, source registry, record/artifact/taxonomy schemas, and validation code that makes these documents executable.

Follow direct references to newer terminal reports, review artifacts, receipts, decisions, or supersession records. Do not read every archive indiscriminately; use Git chronology and explicit references to identify authoritative successors.

Recompute roadmap status from the current YAML, validate dependency and gate consistency, and compare it to implementation/test evidence. Identify stale snapshot prose, contradictory status, orphaned work, undocumented implementation, and evidence that no longer reproduces.

## Phase 2 — Verify current health conservatively

Inspect the commands behind `npm run validate:roadmap`, `npm run check`, and any narrower repository-defined validation. Run only local, non-networked, non-destructive checks whose side effects are understood. Prefer targeted checks first. Do not install missing packages or repair the environment.

For every command run, report:

- exact command;
- why it was safe and relevant;
- exit status;
- substantive results and counts;
- skipped/unavailable checks;
- whether it changed tracked or untracked files.

After validation, recheck Git status. Do not call a historical pass current evidence unless it was rerun successfully or clearly labeled historical.

The built-application browser gate may be tested only with the exact required backend described by current repository authority. Do not silently substitute another browser or automated surface.

## Phase 3 — Reconstruct the system as it exists

Produce an evidence-backed architecture map covering:

- domain and record model;
- Nation identity and association boundaries;
- source registry and adapter lifecycle;
- extraction, normalization, reconciliation, provenance, hashing, and last-known-good behavior;
- taxonomy and classification;
- artifact generation and static delivery;
- frontend state, filtering, search, details, dossier, CSV, accessibility, and network behavior;
- source health, coverage, temporal/lifecycle fields, alerts/badges, and refresh design;
- testing, security, privacy, and release controls.

Trace at least three representative flows:

1. a validated synthetic or enabled source record from input contract to UI;
2. a disabled or blocked source through its fail-closed behavior;
3. a Nation identity/association attempt through the unresolved BIA gate.

For each module and flow, identify current inputs, outputs, invariants, error states, trust boundary, tests, and missing production evidence.

## Phase 4 — Reconcile current product with the renewed vision

For every renewed module and major capability, create a matrix with:

- present repository capability;
- maturity: `production-evidenced`, `locally validated`, `synthetic-only`, `disabled`, `documented-only`, `absent`, or `unknown`;
- reusable architecture;
- material gaps;
- governance or authorization conflicts;
- recommended disposition: `PRESERVE`, `EVOLVE`, `ADD_LATER`, `DEFER`, `REJECT`, or `OWNER_DECISION`;
- prerequisite evidence and tests.

Pay special attention to these questions:

### Spatial Engine

- What is a legally and epistemically safe distinction among geometric intersection, jurisdictional relevance, official association, potential impact, and legal applicability?
- Can spatial features be introduced as a separate evidence layer so they never mutate Nation identity or source-explicit policy relationships?
- What official boundary sources, licensing/reuse terms, update cadence, temporal validity, topology checks, CRS rules, uncertainty fields, and user-upload isolation would be required?
- How should custom user polygons remain local/private, non-persistent, or separately governed?
- Which existing prohibition on land-related or private data applies, and what exact owner decisions would be required to change it?

### Ingestion and lifecycle

- Can the current source adapter and artifact model scale from static discovery to multi-tier lifecycle tracking?
- Does the record model distinguish introduced, debated, proposed, adopted, effective, amended, corrected, withdrawn, superseded, stayed, and unknown without conflation?
- How should transcripts, redlines, related instruments, and cross-source identity be modeled while preserving source custody and ambiguity?

### Semantic classification

- Which categories are source-provided, deterministic mappings, model-derived labels, or editorial judgments?
- How should confidence, abstention, ambiguity, multi-label classification, model/version lineage, review status, and evaluation be represented?
- How can the product remain useful when AI classification is disabled or unapproved?

### Notifications

- Which alert types can be computed deterministically from exact source dates/statuses?
- Which proposed notifications require closed outbound-channel authorization?
- How should deduplication, idempotency, expiry, corrections, delivery receipts, user consent, and source failure be modeled?

### Synthesis and contextual analytics

- Which outputs can be deterministic evidence views, and which require governed generative synthesis?
- Replace any unqualified “conflict matrix,” “impact,” “intent,” or “momentum score” with an explicit construct definition, evidence basis, uncertainty model, evaluation plan, and disclaimer—or recommend against the feature.
- Preserve quotations, citations, provenance, contradiction, uncertainty, source coverage, and human review.
- Define what the system must refuse to claim.

## Phase 5 — Design the next architecture and roadmap without implementing it

Propose a modular target architecture that grows from the strongest existing invariants instead of creating a competing system. Address:

- bounded contexts and module ownership;
- stable IDs and versioned contracts;
- separation of source facts, deterministic derivations, geospatial observations, classifications, synthesis, and user state;
- event/change representation and policy lifecycle;
- local/static deployment versus any future services;
- offline and fail-closed operation;
- public versus private deployments;
- source, boundary, model, and output provenance;
- observability and replay;
- test and evaluation layers;
- migration and compatibility with existing artifacts.

Then propose a phased roadmap. Do not rewrite the canonical roadmap. Include:

1. a **re-entry and truth-reconciliation phase**;
2. the smallest justified continuation of the existing Phase B dependency chain;
3. a **vision bridge** that validates spatial relevance without legal or identity inference;
4. later ingestion/lifecycle expansion;
5. deterministic subscriptions and change intelligence before outbound delivery;
6. governed semantic and synthesis experiments with explicit evals;
7. local release-candidate and separately authorized publication boundaries.

For every proposed phase include purpose, dependencies, exact deliverables, acceptance criteria, non-goals, evidence gates, test strategy, estimated complexity (`S/M/L/XL`, not calendar promises), parallelizable work, owner decisions, and stop conditions.

Identify one exact next microtask that is both authorized under current repository evidence and worth doing next. If no such task exists, say so and provide the smallest owner decision or originating evidence needed to reopen progress. Do not disguise blocked work as a coding task.

# Required final deliverable

Return a single self-contained deep-dive report. Lead with the outcome and write for both the project owner and a senior engineer. Use concise narrative plus tables where exact comparison helps.

The report must contain:

1. **Terminal disposition** — exactly one:
   - `DEEP_DIVE_COMPLETE_NO_MUTATION`
   - `STOPPED_REPOSITORY_INCONSISTENT`
   - `STOPPED_AUTHORITY_CONFLICT`
   - `STOPPED_ENVIRONMENT_BLOCKED`
2. **Executive narrative** — what Policy Sentinel is today, why work stopped, what remains valuable, and how the renewed vision changes the trajectory.
3. **Repository and authority facts** — root, branch, HEAD, worktree state, remotes, applicable instructions, canonical ledger, and authoritative checkpoint.
4. **Recomputed project status** — counts by state, active/ready/blocked items, dependency chain, and discrepancies from the prior snapshot.
5. **Current capability map** — implemented, validated, synthetic-only, disabled, blocked, documented-only, absent, and unknown.
6. **Architecture reconstruction** — modules, data flows, trust boundaries, invariants, and technical debt, with file/symbol/test references.
7. **Source and evidence matrix** — every registered source, its contract maturity, access/reproduction state, adapter state, public claim, blocker, and safe fallback.
8. **Blocker analysis** — root cause, exact missing evidence, what must not substitute for it, independently executable work, and safe recovery options.
9. **Vision-alignment matrix** — `PRESERVE`, `EVOLVE`, `ADD_LATER`, `DEFER`, `REJECT`, or `OWNER_DECISION` for each renewed module/capability.
10. **Proposed target architecture** — explicit separation of spatial observation, jurisdictional/source evidence, lifecycle facts, classification, notifications, and synthesis.
11. **Proposed phased roadmap** — dependency-aware, testable, governance-aware, and compatible with the current canonical ledger.
12. **Verification report** — exact commands and outcomes, plus checks not run and why.
13. **Risk register** — prioritize sovereignty/identity, legal overclaiming, source terms, privacy/land data, coverage illusion, lifecycle conflation, AI hallucination, notification error, static scale, secrets, and agent drift.
14. **Owner decision packet** — only decisions that materially change scope, governance, or authorization. For each, provide options, consequences, reversible default, and a recommendation.
15. **Exact next step** — one microtask or one evidence/owner gate, with acceptance criteria and stop condition.
16. **Proposed terminal handoff** — concise facts a fresh session would need, clearly labeled as a proposal and not written to the repository.

# Quality bar

- Evidence before conclusions; repository truth before remembered narrative.
- Facts, inferences, and proposals must never blur together.
- File references must be repository-relative and specific enough to verify.
- Do not expose hidden chain-of-thought. Give concise rationales, evidence, tradeoffs, and conclusions.
- Do not inflate progress. State exactly what is production-evidenced and what is not.
- Do not recommend a new service, database, model provider, GIS stack, or cloud architecture merely because it is fashionable. Derive needs from measured constraints and current design.
- Do not let the renewed vision erase the disciplined source-reference product already built. Prefer an evolutionary architecture with explicit migration seams.
- Do not ask broad questions that repository evidence can answer. Investigate first. Place remaining material questions in the owner decision packet.
- Do not end with “more research is needed” without naming the exact evidence, authority, source, test, or decision required.
- Wait for every delegated workstream, resolve disagreements, and perform a final adversarial self-review of the report before returning it.

Begin now with Phase 0. Do not implement or mutate the repository.
