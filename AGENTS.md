# AGENTS.md

Rules for every agent that works in this repository, Claude Code and Codex alike. Claude Code reads this file through `CLAUDE.md`. It says what the product is, what never changes, what needs the owner and how to work. It holds no project state; that lives in `docs/STATUS.md`.

## What this is

Policy Sentinel is a policy monitoring and source-reference tool for Tribal policy, natural resources and legal staff, and the ATNI Climate staff who support them. These are people who must keep up with federal and state policy without a research department.

The end goal: a staff member opens one page and searches official federal and state sources, and public Tribal and intertribal publications, together. Every result says what it is, which official source it came from, when it was retrieved and why it was shown. They can open a policy, see the passages that deserve attention (consultation wording, deadlines, Tribal references), keep those with their own notes, and export a cited document that carries its provenance. They can follow a rule, bill or docket and see what is new when they return. A Nation that wants to add its own documents runs the same tool on its own machine, offline, and that material never leaves it.

The tool never says what a policy legally means for a Nation, never links a record to a Nation without exact official evidence, and keeps nothing about its users.

Coverage grows one source at a time, federal first. Nationwide coverage stays the owner's stated direction (2026-09-22); `docs/PLAN.md` sets the order. Proposed meaning of a first real release (the owner confirms it): a Tribal policy staff member who is not the owner completes a real task on the public tool without help and states correctly what the result does and does not establish, every source the page calls live has been checked against the real service, and the page says plainly what it does not cover.

## Where to look first

1. [`docs/STATUS.md`](docs/STATUS.md): the current state, what is live, the next step, the open owner decisions. One page, overwritten each session.
2. [`docs/PLAN.md`](docs/PLAN.md): the milestones with their acceptance checks, what needs the owner, what is deferred.
3. Then only the code and documents the task touches. [`docs/DEMO-STATUS.md`](docs/DEMO-STATUS.md) covers the live demo, [`docs/decision-register.md`](docs/decision-register.md) holds the owner's rulings in order, and [`docs/PROJECT-BACKBONE.md`](docs/PROJECT-BACKBONE.md) indexes everything else.

`ROADMAP.yaml`, its validators, the operating model and the older handoffs are retained record. They stay unchanged and are still validated mechanically, but they are not the working plan. Do not edit `ROADMAP.yaml`. Read the record for a specific fact, never as a start-up routine. Whether to archive it is an owner decision listed in `docs/STATUS.md`.

## Safeguards

These do not change with process. An owner direction about how to work relaxes none of them. If you cannot tell whether a sentence is a safeguard or overhead, treat it as a safeguard.

### 1. Nation relationships need exact evidence

- A public Nation relationship requires exact evidence in an official source plus its URL. Never infer it from AI, keywords, geography, sponsors, eligibility, territory, maps or land.
- Official county and municipal instruments may be discovered without naming a Nation (D-087, the owner ruling of 2026-10-07 on local-government eligibility). A Nation relationship still needs exact official evidence. An agenda item alone does not prove final or executed status.
- State, federal and local records without exact Nation evidence are labeled `general_jurisdiction`, never Nation-specific.
- Official public Tribal-government publications are eligible public sources. Private or internal access restrictions follow the record and its derivatives; Tribal authorship alone does not make a record private.
- Federal recognition is not organization membership. The retained United States federal-recognition collection must validate to exactly 575 before that collection is published; this is not a universal engine rule. The BIA Tribal Leaders Directory is supplementary, not the recognition authority.

### 2. No legal conclusions

- Never add a field or label that implies a rights, legal-effect, jurisdiction, eligibility, or comprehensive land-interest determination. Preserve source language rather than converting it into a legal conclusion.
- Category mappings are deterministic, versioned mappings from exact official subject or topic labels, and keep their provenance. Keyword-only classification is forbidden. Under D-114 (owner ruling of 2026-10-23 on AI-assisted development), Jev judgments may support classification as reference metadata that keeps its question, model version and probability, labeled as a model judgment and kept apart from the official-label map. Unmapped records stay `Unclassified` and searchable.
- Record every source-derived field's provenance, retrieval time, source update time when available, and validation state.
- Before 1980, non-landmark records are normally metadata-and-link entries. Landmark treatment requires the documented criteria in `docs/project-brief.md`.

### 3. Privacy, AI and secrets

- The public application works fully without AI and makes no browser-side LLM calls.
- Optional AI summaries may be generated only in a separately approved build-time step. Show them only in details, label them exactly `AI-generated source summary`, cite their inputs, and follow the content restrictions in `docs/data-governance.md`.
- No secrets, private endpoints, personal data or credentials in client code, source maps, assets, commits, logs, fixtures or documentation. Actions secrets are never safe for a browser.
- No telemetry, search logging, tracking pixels or automatic data transmission in anything public.
- Development may use TypeSafe (Jev) and Parallel on public data, and local development may log searches (D-114). Their keys stay in the developer's environment, their code stays out of `src/`, `demo/` and `worker/`, and public output never depends on them.

### 4. Land, maps and private context

- No maps, parcel geometry, ownership, trust-land, fee-land, Tribally owned parcel, or sensitive land content. Public builds must reject private adapter inputs.
- A locally run deployment may process such content only when the user supplies it, under the private-context rules in `docs/architecture/general-development-addendum-2026-09-22.md` (D-072, the owner ruling on private context). A public build never can. The private-context files stay unreachable from the public application entry and the synthetic artifact build; tests check this.
- A hidden path in a public repository or deployment is not private. Never commit generated public data, raw responses, caches, AI summaries, credentials, private data, or real Nation-specific configuration.

### 5. Official sources, read before use

- Before declaring an adapter viable, read the current primary documentation. Record in a short note the originating URL, access date, fields, date range, authentication, rate limits, use and attribution terms, cadence, CORS constraints and known failure behavior.
- Prefer the originating agency, legislature, court, county or Nation. Data.gov is a discovery catalog, not the final authority when an originating source exists.
- No opaque scraper as a primary production source. If no stable, permitted interface exists, record the gap and stop at its gate.
- Whitelist normalized fields. Do not retain provider tokens, personal contact fields, comments, land information, or unrelated raw response content.
- A public URL does not authorize republication. Verify official-text reproduction and excerpt rights source by source.
- The browser never calls a provider or holds a key. Engine retrieval is build-time. The one exception is the demo Worker (safeguard 6).

### 6. External actions go through the owner

- Use local Git for local work and the `gh` CLI for every GitHub operation, beginning with `gh auth status`. No native GitHub plugin, browser-only GitHub workflow or alternate integration. Destructive and unrelated external operations stay denied by `.claude/settings.json` and the command hook.
- An explicit in-session owner command naming the exact action and target authorizes that single action for the current task; no prelaunch variable or repeated approval is required. Without that command, never push, merge, open a pull request, deploy, create or change a remote or release, enable Pages, change a secret, register a key or account, accept provider terms, spend money, contact a third party, use private or Nation-specific data, generate optional AI output, send a notification, or publish. Routine command-hook exceptions only defer to host permissions; they do not grant authorization.
- Approval for one action does not extend to the next. A passing check is not approval. Approval is not source qualification or implementation acceptance.
- Demo exception. Under D-083 (owner ruling of 2026-10-06 on the live public demo), D-084 (the same day, on its rule checks and publication path), D-093 (2026-10-10, switching on GovInfo, Congress.gov and Regulations.gov), D-094 (2026-10-10, interface, document and provenance) and D-095 (2026-10-10, demo follow-ups and planning), the live demo page and its Cloudflare Worker (`demo/`, `worker/`, built into `docs/` and served by GitHub Pages from `main`) may be committed, deployed with the owner's approval of each deployment, and may call an exact allowlist of official hosts at run time with the owner's api.data.gov key held as a Worker secret. The page never holds a key. The current-session driver may push or merge only when the owner explicitly commands that exact action and target in-session. This covers the demo only; it opens no engine source, acquisition, publication or private-data gate.

### 7. History and the repository

- One writer to the Git index: the main session. Subagents edit files and never stage or commit.
- Never use `--no-verify`, rewrite history, create tags or change remotes. Dates on records come from the record itself (a commit timestamp, a receipt), not from today.
- `src/kernel/**`, `src/experimental/**`, `docs/vision/**` and the K0, S0 and O0 contract files (kernel lifecycle, spatial experiment, orchestration) stay untouched, and nothing in the product depends on them; tests enforce this. The sealed 2.0 corpus replays unchanged.
- The retained v1 public record, artifact and source contracts admit only WA, OR and ID state codes. The public 2.0 successor (D-086, D-087, D-088) carries evidence-bearing jurisdiction references; legacy defaults stay fixed.
- The sibling repositories `I:\land-use-analyzer`, `I:\TCR-policy-scanner` and `I:\cap-assessor` are read-only from here. Never list, read or search `I:\cap-assessor\pilot`; it holds sealed records.
- Keep the repository lean: code, schemas, taxonomy and source configuration, documentation, synthetic fixtures, notices, tests and approved deployment configuration. Generate provider data in approved external or ephemeral build space. The finished real-policy run may retain reviewed immutable source objects and derived evidence in its separately owned external namespace. Only its reviewed `local-output/` directory may be served explicitly on `127.0.0.1`; never serve the corpus root or acquisition objects. Ordinary builds are synthetic and network-free. Place validated public output only in the approved Pages artifact. A new document, web-module, application or structured adapter needs its own approved output and delivery boundary.

### 8. Say what is true

- Unavailable is never shown as empty, and stale is never shown as current. When a source refresh fails, use only a checksum-validated prior public shard from the same adapter's last approved output artifact, label it stale/degraded, and keep its original data-as-of time. If there is none, omit the source and mark it unavailable.
- Completion is shown by the real thing, not by a checkbox, a scaffold or an agent report. Do not call the product complete because planning or scaffolding exists.

## What needs the owner

Everything listed in safeguard 6, plus private or Nation-specific material and any definition of done. The specific pending approvals are in `docs/PLAN.md`; the open decisions are in `docs/STATUS.md`.

- Read an owner direction for its evident purpose, not its narrowest wording. "Run probes" means run probes, within the bounds the owner set.
- Ask only for real outside actions, batched as yes or no questions. Do not reopen a general product interview. Record a source-specific block and continue other work.
- Do not decide an open owner decision silently, and do not stop work that does not depend on it.

## How to work

Do the smallest task that satisfies the request, and preserve unrelated and concurrent changes. This method replaces the earlier read order, leases, per-checkpoint ledger entries and standing-check rituals.

- Start in minutes: this file, `docs/STATUS.md`, `git status` and the last ten commits, then only the code the task touches. No validators before an edit, no full roadmap read.
- Plan once, in one short spec: what a person will see, files by lane, two to four checks that prove it, the live-call budget, and what needs the owner. Run parallel lanes (subagents or workflows) when their files are disjoint.
- Test what branches: parsers, merging, privacy filters, exports, plus one regression test for each real defect. Run focused tests while editing. Run the type check, lint and the source-boundary scan before a commit. A contract or taxonomy change also needs `npm test`.
- Verify against the real thing. Anything that parses an outside service gets one bounded live call before it is called done, and any interface is looked at in a browser. State the call budget first, do not retry, never provoke a rate limit. Keep the trimmed response shape as the test fixture.
- Run the full check (`npm run check`) once, before anything is published or deployed. It must pass, the affected interface must work by keyboard with no automated accessibility violation, and the artifact must hold no secrets, private data, land fields or raw corpora.
- Review once per coherent change, at the risk boundary: before anything public, and for identity, geography, private context or a new source's terms. No review for refactors or records.
- Record little. Overwrite `docs/STATUS.md` at the end of a session. One decision-register row per owner decision, at most 60 words: date, the owner's words, a one-line reading. One short note per source. A handoff file only when work spans sessions.
- Report in five lines: what a person can now do, how it was checked, what is not done, what needs the owner, the link.

## Commands

Windows x64, Node 24.19.0, npm 12.0.2 (`npm run validate:runtime`).

```powershell
npm ci
npm test                  # every test stage; use a focused test while editing
npm run typecheck
npm run lint
npm run format:check
npm run scan:source       # source-boundary scan
npm run build             # synthetic static build into dist/, then artifact validation
npm run check             # the full check, once before publishing or deploying
npm run validate:roadmap  # record checks, kept and run by check
npm run validate:backbone
npm run validate:knowledge
npm run hooks:test
npm run test:spine        # synthetic corpus spine
npm run demo:dev          # the demo page locally
npm run demo:build        # builds docs/index.html and docs/demo-assets/
npm run demo:worker:dev   # local Worker on http://127.0.0.1:8787
npm run demo:worker:deploy  # deploys policy-sentinel-demo; needs the owner's approval
node scripts/verify-demo-browser.mjs --url https://atniclimate.github.io/policy-sentinel/ --out NEW-FOLDER
```

## Where the history is

Git log, and the retained record: `ROADMAP.yaml`, `docs/handoffs/`, `docs/development/`, the owner's rulings in `docs/decision-register.md`, and the earlier state narrative in `docs/continuation-prompt.md` at commit `c602468`. Completed grants and handoffs do not resume. The earlier definitions of done (`docs/project-brief.md`, `docs/decisions/2026-09-24-definition-of-done-general-development.md`) stay on record, and none is treated as revoked until the owner confirms the release definition in `docs/PLAN.md`. The product and governance contracts (`docs/data-governance.md`, `docs/pnw-scope-and-acceptance.md`, `docs/data-contract.md`) stay in force.
