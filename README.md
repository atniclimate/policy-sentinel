# Policy Sentinel

Policy Sentinel is a configurable, sovereignty-centered policy monitoring and
source-reference engine. It watches bounded authoritative sources, explains why
records are shown, preserves source-supported change, and produces governed
outputs without implying a legal conclusion or a complete account of a
Nation's interests.

## Project status

The owner adopted the [real-policy discovery launch](docs/handoffs/ps09-real-policy-discovery-launch.md)
at `39d738a`. Its bounded local implementation is active in the
[execution journal](docs/development/PS09-REAL-POLICY-DISCOVERY-01.md).
The historical status below describes the synthetic baseline; the current
ledger identifies implemented and still-pending successor capabilities.

Development commands added for that scope: `npm run test:policy` runs the v2
contract, temporal, extraction and acquisition checks; `npm run test:roadmap`
runs ledger migration and rejection regressions with direct diagnostics;
`npm run policy:runner -- <command>`
invokes one bounded custody operation; `npm run format:files -- <paths>` formats
explicitly owned files. Runner commands are `init`, `acquire`, `read`, `recover`
and `verify`, with `--root <external-owned-run-root>`; `status` reads counters
and `admit` appends reviewed exact targets without changing source profiles.
`npm run policy:prepare -- --root <external-owned-run-root>` creates an empty
owned run from the reviewed direct-source configuration. Acquisition additionally
requires `--operation <id> --url <exact-reviewed-url>`. Synthetic preflight uses
the same operation core with an explicitly synthetic root and `--synthetic`.
`npm run policy:extract -- --root <root> --operation <id> --kind <source-kind>`
creates a deterministic, privacy-filtered rendition pending item review in the
external run. Optional `--show <1-20>` exposes bounded extracted blocks for review.
`npm run policy:admit:links -- --root <root> --operation <inventory-id>` appends
only advertised HTML bill/session-law targets from a retained, verified Washington
inventory and records their exact source pointers; body acceptance remains separate.
`npm run policy:admit:candidates -- --root <root>` appends reviewed discovery
candidates from the source configuration to an existing owned run, preserving all
historical manifests and previously admitted exact targets.
`npm run policy:curate:gold -- --root <root>` applies the authored gold review
selectors to retained objects, replays their extraction, and produces external
review descriptors, evidence index, and a validated v2 corpus. It makes no requests.

The authorized 0.9 Run 1 has completed repository convergence and a minimal
local synthetic corpus/citation spine. Its exact acceptance evidence is in
[`ROADMAP.yaml`](ROADMAP.yaml) and the
[Run 1 handoff](docs/handoffs/ps09-run-01-convergence.md). Later runs remain
closed. `PS09-06-LOCAL-RC` is the single local release root; B1-B10, PNW, and
the exhausted real-source child lane retain historical evidence without
creating additional release roots.

The ordinary static build now routes its same three synthetic records through
the existing analyzed-corpus module's explicit 1.1 compatibility profile. The
app, dossier, CSV, and artifact retain their existing public contract. A local
Windows content-addressed store and curated document packs prove synthetic
object, rendition, document/version, segment, and exact citation replay.
Neither real source admission nor a production Nation registry is implemented.

The static application, dossier, CSV, and artifact are current output
implementations/precursors, not the whole engine or a general adapter suite.
The 0.9 target is a general engine for a bounded owner-selected PNW/ATNI-facing
cohort and representative scenarios. Exact current membership is a separate
source-evidence claim, not a fixed-count product gate. Real public information
is a first-class intended capability; the current runnable path is synthetic.
Nationwide United States and Native Hawaiian support remain later directions.

The Nez Perce habitat/endangered-species scenario is a retained candidate.
Six deep scenario graphs and geographic sentinels are planned for later runs;
Run 2 must bind their identities, evidence states, and acceptance manifests.
No scenario supplies accepted production facts merely by appearing in a plan.

This is not a completed PNW engine or public beta. Production source
activation, remaining record-source adapters, large-scale index benchmarks,
publication review, a remote repository, GitHub Pages, and a release are still
pending. Gate A did not authorize a remote, push, Pages, API registration,
provider-term acceptance, paid use, third-party contact, optional AI
generation, outbound notifications, or private material.

Current progress, dependencies, source blocks, acceptance evidence, and the
course through a local release candidate are maintained in the validated
[`ROADMAP.yaml`](ROADMAP.yaml). The external publication step remains
separately blocked. Start repository navigation with the
[project backbone](docs/PROJECT-BACKBONE.md). A fresh implementation session
must use the [durable continuation prompt](docs/continuation-prompt.md) and live
`ROADMAP.yaml` for recovery. The PNW-01 launch handoff is historical evidence;
the currently active bounded lane is named by `current_focus` and cannot be
expanded by an older handoff.

## Intended PNW engine

The present product is intended to:

- keep sovereign identity, recognition, and ATNI membership as separate
  evidence-bearing relations;
- support an owner-selected regional cohort across Washington, Oregon, Idaho,
  northern California, southeast Alaska, and selected Montana contexts,
  including Crow, Fort Peck, and Fort Belknap, without hard-coded Nation/state
  branches or treating a directory as product membership;
- support legislation, statutes, regulations, executive material, grants,
  litigation and decisions, public intergovernmental agreements, qualifying
  county records, and officially published Tribal government documents;
- provide guided Nation search, policy-area browsing, and a landmark timeline;
- expose coverage, freshness, source health, provenance, and the exact basis on
  which each result is shown; and
- emit one analyzed corpus through document, web-module, application, and
  structured-output adapters without factual drift.

The existing 575-entity federal-recognition contract remains valuable future
nationwide-scale evidence. It is not ATNI membership evidence or proof of a
production registry.

The initial editable taxonomy is in
[`config/taxonomy.v1.json`](config/taxonomy.v1.json). It supports many-to-many
membership. Public categories may be populated only through deterministic
mappings from official source labels. Unmapped records remain discoverable as
`Unclassified`.

## Source philosophy

Originating agencies, legislatures, courts, and Nations are the preferred
authorities. Data.gov may help discover a source but is not substituted for an
available originating source. Each source is evaluated for coverage, fields,
terms, authentication, rate limits, history, update cadence, and failure
behavior before an adapter is approved.

Nation-to-record relationships are published only when an official source
explicitly supports them. Geography, land information, AI, and keyword matches
are not relationship evidence. State and federal records without exact Nation
evidence are labeled as general-jurisdiction records. County records require an
exact Nation mention in the official county record.

The public application will work without AI and will make no browser-side LLM
calls. An approved build may optionally add a source-grounded summary to a
record detail view; absence of that summary never removes core functionality.

## Public and private boundary

The public repository may contain source code, documentation, schemas,
taxonomy and source configuration, synthetic fixtures, notices, and deployment
configuration. Raw corpora, cached provider responses, generated policy data,
generated AI summaries, real Nation-specific configuration, credentials, and
private material must not be committed. For the retained static application,
generated public data may exist only in an approved Pages deployment artifact
and is public once deployed. Each future document, web-module, application, or
structured adapter requires its own approved output and delivery boundary.

The public beta excludes maps, parcel geometry, land ownership, trust-land,
fee-land, Tribally owned parcel, and sensitive land data. A future private
deployment may connect documents or land context that a Tribe explicitly
supplies or authorizes, through an opt-in adapter boundary documented in
[the architecture](docs/architecture.md). No such adapter is implemented here,
and private data must never enter the public build.

## Non-goals

Policy Sentinel is not:

- legal advice, a legal research service, or a comprehensive legal database;
- a rights-impact, jurisdiction, eligibility, or land-interest determination
  engine;
- a substitute for the cited official source;
- a municipal or city policy index in the retained static beta artifact;
- a repository for non-public agreements or unpublished Tribal material; or
- an outbound notification or user-tracking service.

## Local setup

Requirements: Windows x64 Node.js 24.19.0 and npm 12.0.2, as pinned in
`package.json`. Historical acquisition evidence retains its original runtime.

```powershell
npm ci
npm run check
```

`npm run check` checks formatting, lints, type-checks, validates the YAML
roadmap, schema/link backbone, and foundation, runs the source-boundary scan
plus unit and accessibility tests, builds the static application, emits an
ignored synthetic artifact under `dist/data`, and validates its hashes and
contracts.

Useful focused commands:

The adopted local discovery run also registers `policy:replay`,
`policy:build:local`, and `policy:serve:local`. These explicit commands use the
owned external run and do not acquire source data:

```powershell
npm run policy:replay -- --corpus-root I:/policy-sentinel-corpus-real-policy/discovery-01 --name discovery
npm run policy:build:local -- --corpus-root I:/policy-sentinel-corpus-real-policy/discovery-01 --name discovery
npm run policy:serve:local -- --corpus-root I:/policy-sentinel-corpus-real-policy/discovery-01 --port 4181
```

Replay verifies retained receipt/object hashes, parser recipes, exact evidence,
and the reviewed corpus seal. Build emits the explicit local application profile
only inside that run's `local-output/`; serve loads checksum-verified output
entries on the chosen loopback port (default `127.0.0.1:4179`). It has no directory fallback and cannot serve raw
objects or review files. A corpus selected with `--name discovery` must have its
own reviewed input and seal. Ordinary `npm run build` remains synthetic.
The [local outcome](docs/handoffs/ps09-real-policy-discovery-outcome.md) gives
actual corpus demonstrations, evaluation results, coverage and proof limits;
the execution journal retains the implementation checkpoints.

`policy:prepare:broad -- --root <root> --phase inventories` freezes the bounded
Washington chapter sample from the retained index. `policy:acquire:batch --
--root <root> --phase inventories --count 50` dispatches at most 50 separately
accounted one-operation processes and skips all prior attempts. After inventory
capture, preparation with `--phase bodies` admits only actual advertised HTML
links; acquisition uses the same phase. Neither command retries a failed or
ambiguous attempt. `policy:curate:discovery -- --root <root>` validates retained
body identity, source headers and filtered text into a separately sealed corpus.
`policy:enrich -- --corpus-root <root>` resolves a reviewed external research
recipe against the stable gold corpus and writes its evidence-linked output.
All these commands require the already adopted local run and its owned external
root; they do not authorize publication or a new source family.

`policy:evaluate -- --root <root> --label <unique-label> --name gold` runs the
independently frozen evaluation, writes an immutable result under owned review
custody, and returns a nonzero exit for measured acceptance misses. `--name research` or
`--name discovery` tests that separately labeled population only if every frozen
gold source entity survives unchanged. Baseline, repaired and broadened results
remain separate; the frozen questions and passages are never committed.
Discovery curation also replays the sealed research recipe before combining its
explicit evidence links, analyses and findings with the broader document set.

`policy:simulate:failure -- --corpus-root <root> --source <sourceProfileId>`
replays the approved local output and exercises its output adapter with two
controlled failure projections: checksum-bound same-source stale reuse with
original timestamps, and source unavailability without prior proof. The command
is read-only, makes no source request and changes no local output pointer.
It demonstrates controlled failure behavior; it does not schedule or implement
automatic source refresh.

`policy:verify:browser` takes `--corpus-root`, `--playwright-core` and `--browser`
arguments after `--` and verifies the served discovery output
on `127.0.0.1:4181` in isolated desktop/mobile Chromium contexts. It requires
an explicitly supplied existing Playwright core runtime and browser; it installs
nothing and makes no source request. Screenshots and the run report stay in the
owned external `review/browser/` namespace. This is the previously approved local
browser alternative, separate from the browser connector. The outcome handoff
records actual results and runtime identities.

Append `--smoke-only` for a short desktop/mobile workbench, dossier and evidence
layout/accessibility diagnostic before the full interaction run. It checks the
configured viewport, never treats automatic mobile expansion as a pass, and
reports incomplete accessibility checks as needing review. A passing smoke run
does not complete the full browser acceptance.

```powershell
npm run dev
npm run validate:runtime
npm run hooks:test
npm run validate:roadmap
npm run validate:backbone
npm test
npm run test:corpus
npm run test:spine
npm run test:a11y
npm run build
```

For an explicit synthetic local-store replay, use
`npm run corpus:verify -- --root <external-root>` or set
`POLICY_SENTINEL_CORPUS_ROOT`. The ordinary build never creates that root.
The [corpus ADR](docs/adr/ps09-canonical-corpus.md) defines supported UTF-8
plain-text behavior, Windows custody limits, and unsupported parsers.
Historical source commands below are documentation, not current request
authority: D3, R6, R7, and PF-01 through PF-17 are spent, and FR-A1 is closed.

`npm run source:bia` reads the cited official recognition notice and validates
its ordered 577-paragraph transcription against GovInfo. Independent review
found that the notice states 575 entities without providing a row-level
reconciliation from its 577 displayed list-entry paragraphs, so the command
currently fails closed and writes no registry. If that primary-source gap is
resolved, output remains restricted to ignored
`.cache/source-validation/bia/nations.json`, outside `dist/`. The command does
not register an API, ingest policy records, alter a remote, or publish data.

`npm run source:federal-register:prerelease` defaults to a no-fetch, no-write
qualification proposal. Its preparation modes write only no-clobber files
under ignored `generated-data/real-source-prerelease/`. The `--acquire` mode is
a separate, expiring local-pilot gate: it accepts only the fixed `FR-A1`
request, requires a reviewed byte manifest plus complete lifecycle approvals,
runs only as a fresh direct Node v24.14.1 process, consumes a permanent local
attempt latch before transport loading, permits no retry, and keeps publication
closed. It is not part of `npm run check` or the ordinary network-free build.

`npm run --silent source:wa-lws:canary -- --help` describes the separately
invoked Washington Legislative Web Services canary. It accepts exactly one of
two repository-owned scenarios. The known-bill
`known_bill_legislation_v1` scenario succeeded once. The fixed
`legislation_by_year_v1` scenario ran once and returned HTTP 200, but the body
was rejected as `invalid_soap`; it must not be rerun under the current ledger.
Each exact `--execute` and `--scenario` invocation permits at most one keyless
build-time request with no retry, emits one closed aggregate JSON line, and
writes no response or record. The yearly report contains no request year,
identifier, source string, typed item, or completeness claim. The command is
not part of `npm run check`, does not enable the disabled source, and does not
establish complete coverage.

## Codex lifecycle hooks

Repository-scoped hooks in [`.codex/hooks.json`](.codex/hooks.json) make long
local Codex runs easier to recover while enforcing only boundaries that are
objective at command time:

- `SessionStart` adds a short recovery brief from validated `ROADMAP.yaml`, Git
  status, and the next-action queue without reading the chat transcript. It
  also runs after built-in compaction so work can continue from durable state;
  and
- `PreToolUse` denies closed remote, publication, credential, notification, and
  spent-canary operations; unsafe staging; a small high-risk Git set; private
  or generated custody; preserved owner inputs; and inactive frozen evidence.
  Ordinary PowerShell, Node, WSL, diagnostics, compound commands, external
  reads, and normal workspace mutations are not placed behind an allowlist.

`PreCompact`, `PostToolUse`, and `Stop` are intentionally not installed.
Compaction must not be vetoed by repository state, validations belong in the
explicit command surface, and a stop hook must not create continuation loops.
The two hooks are synchronous cooperative guardrails, not a shell parser,
permission system, security boundary, or replacement for `npm run check`.
Run `npm run hooks:test` for their focused contract tests. Codex requires the
exact project hook definitions to be reviewed and trusted; after cloning or
changing them, use `/hooks` to inspect and trust the repository hook layer. See
the
[official Codex hooks reference](https://learn.chatgpt.com/docs/hooks) for the
runtime and trust model.

Key documents:

- [Canonical repository backbone](docs/PROJECT-BACKBONE.md)
- [Canonical implementation roadmap](ROADMAP.yaml)
- [PNW product scope and acceptance](docs/pnw-scope-and-acceptance.md)
- [PNW rebase mapping, evidence gaps, and first tranche](docs/handoffs/pnw-product-space-rebase-2026-09-02.md)
- [Exact owner-gated PNW-01 launch handoff](docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md)
- [Sol Ultra continuation prompt](docs/continuation-prompt.md)
- [Project brief](docs/project-brief.md)
- [Schema and logical-contract catalog](docs/data-contract.md)
- [Agent and tool operating model](docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md)
- [K0/S0/O0 custody index](docs/vision/README.md)
- [Source feasibility](docs/source-feasibility.md)
- [Data governance](docs/data-governance.md)
- [Architecture](docs/architecture.md)
- [Source coverage](docs/source-coverage.md)
- [UX specification](docs/ux-spec.md)
- [MVP plan and stop/go gates](docs/mvp-plan.md)
- [Decision register](docs/decision-register.md)

Repository-local Codex support is intentionally narrow: the two lifecycle
hooks remain the mechanical guardrails; one source-review skill lives under
`.agents/skills`; and two read-only reviewer roles are registered in
`.codex/config.toml`. These aids do not grant source access, decide gates, edit
authoritative files, or constitute completion evidence.

## Attribution

This independent project draws lessons from the earlier public
[`atniclimate/policy-sentinel`](https://github.com/atniclimate/policy-sentinel)
project and acknowledges its ATNI Climate Resilience Program context. No code
or software architecture from that project has been copied into this
repository. Historical attribution does not imply current endorsement of this
project or its future data.

## Disclaimer

Policy Sentinel is a source-reference and discovery tool. It is not legal
advice, does not determine rights or legal effect, does not guarantee complete
or current coverage, and is not a substitute for reviewing official sources or
obtaining qualified advice.
