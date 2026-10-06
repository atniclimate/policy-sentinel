# AGENTS.md

This file is the governing contract for every agent working in this
repository: rules, boundaries, commands and validation. It is not the place to
learn where the project is. Current state, the read order for a fresh session
and the historical recovery pointers live in
[`docs/continuation-prompt.md`](docs/continuation-prompt.md). Historical
grants remain historical: no completed launch, handoff or outcome document
resumes through this file.

Phase (2026-09-22): general development. The Makah demo track is finished and
its material stays where it is by owner ruling. Nationwide coverage (Tribal,
federal and state sources across the United States) is a core capability of
the general engine. Before any implementation, read
[`docs/continuation-prompt.md`](docs/continuation-prompt.md) and follow its
read order, which covers the
[general development audit](docs/audits/2026-09-22-general-dev-audit.md), the
[module boundaries design](docs/architecture/module-boundaries.md), the
[general development addendum](docs/architecture/general-development-addendum-2026-09-22.md),
the [realignment open decisions](docs/decisions/2026-09-22-realignment-open-decisions.md)
and the [realignment rulings](docs/decisions/2026-09-22-realignment-rulings.md).

## Purpose and phase gate

Policy Sentinel is a configurable, sovereignty-centered policy monitoring and
source-reference engine. Use `docs/PROJECT-BACKBONE.md` as the canonical
repository navigation and authority index. Preserve the product boundaries in
`docs/project-brief.md`, the PNW scope and acceptance contract in
`docs/pnw-scope-and-acceptance.md`, and the decisions in
`docs/decision-register.md`.

The completed bounded local run is
`POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`. On 2026-09-05 the owner instructed
execution of the full [real-policy launch](docs/handoffs/ps09-real-policy-discovery-launch.md)
prepared at `39d738a` and explicitly adopted its stated local scope. It
authorized the bounded runner, independently reviewed credential-free official
acquisition, local corpus and temporal analysis, search/workbench, governed
local outputs, tests, repairs and local commits within that launch's exact
source, host, request, byte, custody and privacy ceilings. Read the
[execution journal](docs/development/PS09-REAL-POLICY-DISCOVERY-01.md) for current
leases, accepted source profiles, operation accounting and measured evidence.
The adopted local workbench outcome is complete; acquisition has ended and
unused ceilings do not authorize a new run. Local replay and inspection use the
existing sealed corpus and reviewed output.
Approval is not source qualification or implementation acceptance. Recover
the live/terminal item from `ROADMAP.yaml` and the
[local outcome](docs/handoffs/ps09-real-policy-discovery-outcome.md).
Unresolved PS09-02 identity and scenario acceptance remains an explicit
PS09-06 prerequisite.

The completed historical local synthetic authorization was
`POLICY-SENTINEL-0.9-RUN-02-PNW-IDENTITY-AUTHORITY-AND-SCENARIO-MANIFESTS`.
The owner approved the exact [Run 2 entry packet](docs/handoffs/ps09-run-02-entry-packet.md)
with "Approve and go" on 2026-09-04. It permits only the listed local synthetic
contracts, candidate manifests, tests, reviews and local commits; its source,
domain, request and byte budgets are zero. Required real identity evidence
remains unresolved and synthetic proof cannot complete all of PS09-02. The
bounded packet is validated at [its terminal checkpoint](docs/handoffs/ps09-run-02-identity-authority-scenarios.md),
with no active work or remaining execution grant. Run 1 remains complete.
This approval does not authorize a later run or archived
ready lane. `PS09-06-LOCAL-RC` is the sole local
release root; retained B1-B10, PNW, and real-source prerelease statuses are
archived evidence, not parallel mandatory release graphs. Current PS09-03/04/05
authority is limited to the adopted launch; PS09-06/07/08 and every operation
outside that scope retain their exact owner gates. Earlier Gate A and tranche approvals
retain only their recorded scope. No current approval authorizes a remote repository, push, Pages
deployment, API registration, provider-term acceptance, paid call, third-party
contact, secret change, private-data use, optional AI generation, or outbound
notification. Keep every later stop/go gate closed until the owner approves
that exact action.

The separately approved EV01 evidence-review run subsequently ended at local
launch with zero source requests; its interrupted directory is read-only and
cannot resume. Recover [its terminal record](docs/handoffs/ps09-ev-01-evidence-review.md)
and the [fresh-session recovery guide](docs/handoffs/ps09-fresh-session-recovery-and-forward-plan.md).
The earlier recovery handoff request authorized local documentation and synthetic
diagnostic preparation only. The owner subsequently approved recommendations
1–5 for a next-session synthetic runner, then on 2026-09-05 requested a broader
real-policy direction, public research with subagents, and an implementation
prompt. Recover the [strategic research](docs/development/ps09-real-policy-systems-research-2026-09-05.md)
and [real-policy launch prompt](docs/handoffs/ps09-real-policy-discovery-launch.md)
before selecting the older startup. The `39d738a` preparation checkpoint
performed public read-only research and documentation without implementation
or product acquisition. The owner subsequently supplied and adopted that prompt;
its larger bounded local outcome is now complete. Historical grants remain
historical; do not reset them or mistake their synthetic limits for the new
product goal. Separately closed external operations retain their boundaries.

The 0.9 program targets one general engine with an owner-selected PNW/ATNI-facing
cohort and contrasting scenarios. Exact current ATNI membership requires
originating evidence only when that claim is made; no fixed membership count
defines the product cohort or gates unrelated general-jurisdiction work.
Federal recognition is not organization membership. Nationwide coverage
(Tribal, federal and state sources across the United States) is a core
capability of the general engine (owner direction, 2026-09-22). The current
public record, artifact and source contracts still admit only WA, OR and ID
state codes, and widening them is a gated contract change (decision RD-05).
Native Hawaiian support remains a later-compatible direction. Real public information
is an intended first-class capability; Run 1's implemented corpus path remains
synthetic and cannot admit or activate a real source. The current static
application and B1-B10 work are retained evidence, not the whole product.
K0/S0/O0 remain outside product dependencies while their convergence gates are
closed.

Do the smallest task that satisfies the request. Preserve unrelated and
concurrent changes.

## Durable execution ledger

- Read [`ROADMAP.yaml`](ROADMAP.yaml) completely at the start of every
  implementation session. It is the canonical ledger for current status,
  dependencies, evidence, blockers, and the course through finish. The
  Markdown documents remain the binding product and acceptance contracts.
- Reconcile roadmap claims with Git, tests, artifacts, browser checks, and
  current primary-source evidence. A checkbox, scaffold, or agent report is not
  completion evidence.
- Update the roadmap after every material checkpoint and before context
  compaction or a long pause. While local work is active, keep exactly one work
  item `in_progress`; a validated terminal local-release or genuine-impasse
  state has zero. Select the lowest-priority-number `ready` item whose
  dependencies are complete, and promote newly unblocked `not_started` items
  to `ready` in the same ledger update. Select only within an authorized
  canonical graph: the PS09 graph, or the general-development graph under
  G-GENERAL-DEV-01 once represented. An archived ready item is not an execution
  grant. (D-071)
- Use only the roadmap status vocabulary: `complete`, `in_progress`, `ready`,
  `blocked`, `deferred`, and `not_started`. Run `npm run validate:roadmap`
  before committing a ledger change.
- The initial brief answered all gates. Treat remote, publication, credential,
  terms, paid/contact, private-data, optional-AI, and outbound-notification
  gates as resolved **closed** constraints until the owner explicitly changes
  one exact operation. Do not reopen a general product interview. Record a
  source-specific block and continue independent ready work.
- Use [the durable continuation prompt](docs/continuation-prompt.md) for a
  fresh long-running implementation session. Local Git and `ROADMAP.yaml` must
  remain sufficient to recover after context compaction.
- Follow the
  [agent and tool operating model](docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md)
  for bounded roles, write leases, validation, context conservation, and stop
  contracts. It organizes work but cannot authorize it.
- Treat the
  [PNW rebase handoff](docs/handoffs/pnw-product-space-rebase-2026-09-02.md) as
  the durable product-space mapping, and the
  [PNW-01 launch handoff](docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md)
  as historical first-tranche evidence. The current convergence decision is
  [the corpus ADR](docs/adr/ps09-canonical-corpus.md); recover exact Run 1
  outcomes from [its handoff](docs/handoffs/ps09-run-01-convergence.md).

## Git and GitHub

- Use local Git for local version control.
- Use the `gh` CLI for **every** GitHub operation, including authentication,
  repository inspection, API calls, issues, pull requests, Actions, releases,
  remotes, and Pages. Begin a GitHub task with `gh auth status`.
- Do not use a native GitHub plugin, browser-only GitHub workflow, or alternate
  GitHub integration.
- Do not create or change a remote, push, publish, enable Pages, alter secrets,
  create releases, or rewrite history without explicit owner authorization.
- Exception by owner rulings D-083 and D-084 (2026-10-06): the live public demo
  (`demo/`, `worker/`, published from `docs/` on `main`) may be committed, pushed
  and served by GitHub Pages, and its Worker may call official hosts at runtime.
  That authority covers the demo only and does not open any other gate.
- Treat `atniclimate/policy-sentinel` as read-only historical reference.
  Inspect it with `gh` and public source files; do not copy its code or inherit
  its architecture by default. This describes the earlier Python project; after
  D-084 the `main` of that repository holds this project, and the earlier
  history stays in its log.
- Never commit generated public data, raw responses, caches, AI summaries,
  credentials, private data, or real Nation-specific configuration.

## Source verification

- Read current primary documentation before declaring an adapter viable.
  Record the originating source URL, access date, fields, date range,
  authentication, rate limits, use and attribution terms, cadence, CORS/static
  constraints, and known failure behavior.
- Prefer an originating agency, legislature, court, county, or Nation. Data.gov
  is a discovery catalog, not the final authority when an originating source
  exists.
- Do not make an opaque scraper the primary production source. If no stable,
  permitted interface exists, record the gap and stop at its gate.
- Use build-time retrieval only. Do not create browser dependencies on source
  APIs, even when current CORS headers allow them.
- Whitelist normalized fields. Do not retain provider tokens, personal contact
  fields, comments, land information, or unrelated raw response content.
- Verify official-text reproduction and excerpt rights source by source. A
  public URL does not automatically authorize republication.

## Non-negotiable data rules

- The retained United States federal-recognition collection used by the current
  application comes from the current annual recognition notice and must validate
  to exactly 575 before that collection is published. This is not a universal
  engine invariant or ATNI membership rule. The BIA Tribal Leaders Directory is
  supplementary and is not the recognition authority.
- A public Nation relationship requires exact evidence in an official source
  plus its URL. Never infer it from AI, keywords, geography, sponsors,
  eligibility, territory, maps, or land.
- A county record is eligible only when the official county record explicitly
  names the Nation. An agenda item alone does not prove final or executed
  status.
- State and federal records without exact Nation evidence must be labeled
  `general_jurisdiction`, never Nation-specific.
- Category mappings must be deterministic mappings from exact official subject
  or topic labels, be versioned, and retain mapping provenance. Keyword-only or
  AI classification is forbidden. Unmapped records remain `Unclassified` and
  searchable.
- Record every source-derived field's provenance, retrieval time, source update
  time when available, and validation state. Preserve source language rather
  than converting it into a legal conclusion.
- Before 1980, non-landmark records are normally metadata-and-link entries.
  Landmark treatment requires the documented criteria in the project brief.
- Never add a field or label that implies a rights, legal-effect, jurisdiction,
  eligibility, or comprehensive land-interest determination.

## AI, privacy, and security

- The public application must work fully without AI and must make no
  browser-side LLM calls.
- Optional AI summaries may be generated only in a separately approved
  build-time step. Show them only in details, label them exactly
  `AI-generated source summary`, cite their inputs, and enforce the content
  restrictions in `docs/data-governance.md`.
- No secrets, private endpoints, personal data, or credentials may appear in
  client code, source maps, assets, commits, logs, fixtures, or documentation.
  Actions secrets are never safe for a browser.
- No telemetry, search logging, tracking pixels, or automatic data
  transmission belongs in the public beta.
- Do not add maps, parcel geometry, ownership, trust-land, fee-land, Tribally
  owned parcel, or sensitive land content. Public builds must reject private
  adapter inputs. A locally run deployment may process such content only when
  the user supplies it, under the private-context module rules in
  `docs/architecture/general-development-addendum-2026-09-22.md`; a public
  build never can. (D-072)

## Repository and artifact boundary

Keep the source repository lean: code, schemas, taxonomy/source configuration,
documentation, synthetic fixtures, notices, tests, and approved deployment
configuration only. Generate provider data in approved external or ephemeral
build space. The current real-policy run may retain reviewed immutable source
objects and derived evidence in its separately owned external namespace.
Only its reviewed `local-output/` directory may be served explicitly on
`127.0.0.1`; never serve the corpus root or acquisition objects. Ordinary
builds remain synthetic and network-free. For the
retained static application, place validated public output only in the approved
Pages artifact. A future document, web-module, application, or structured
adapter requires its own approved output and delivery boundary; the adopted
launch supplies only its stated local workbench/dossier/export boundary. A hidden path
in a public repository or deployment is not private.

When a source refresh fails, use only a checksum-validated prior public shard
from the same adapter's last approved output artifact, label it stale/degraded,
and preserve its original data-as-of time. If no last-known-good shard exists,
omit that source and mark it unavailable. Never relabel stale data as current.

## Commands and validation

Current commands:

```powershell
npm ci
npm run validate:runtime
npm run hooks:test
npm run validate:roadmap
npm run validate:backbone
npm run format:check
npm run lint
npm run typecheck
npm run scan:source
npm test
npm run test:spine
npm run build
npm run validate:artifact
npm run check
```

The selected local runtime is Windows x64 Node 24.19.0 with npm 12.0.2.
`npm run corpus:verify -- --root <external-root>` is an explicit synthetic
custody/replay check; the ordinary build creates no external corpus root.
Historical source-observer runtime pins and consumed operation grants are not
changed by this selection.

`npm test` must pass before reporting a contract or taxonomy change complete.
It validates JSON Schema compilation in strict mode, taxonomy structure and
IDs, synthetic fixtures, governance invariants, negative cases, application
logic, and pipeline behavior. `npm run build` creates ignored static output in
`dist/` and validates the artifact. Use only scripts committed in
`package.json`; update this file and the README when the command surface
changes.

Validation is source-by-source and fail-closed. A change is complete only when:

1. primary documentation and terms remain valid;
2. contract fixtures cover representative, missing, and malformed fields;
3. schema plus semantic invariants pass;
4. source IDs, dates, URLs, mapping evidence, Nation evidence, and provenance
   survive normalization;
5. accessibility and keyboard behavior pass for affected UI;
6. secrets, private data, prohibited land fields, and raw corpora are absent;
7. last-known-good and source-health behavior is tested; and
8. generated artifacts, when authorized, contain only reviewed public fields.

Report what changed, commands and real outcomes, source gaps, assumptions, and
any gate that remains closed. Do not describe the product as complete merely
because planning or scaffolding exists.
