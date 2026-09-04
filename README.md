# Policy Sentinel

Policy Sentinel is a configurable, sovereignty-centered policy monitoring and
source-reference engine. It watches bounded authoritative sources, explains why
records are shown, preserves source-supported change, and produces governed
outputs without implying a legal conclusion or a complete account of a
Nation's interests.

## Project status

This repository retains its approved **Phase B local implementation** history,
the bounded 2026-09-02 PNW product-space planning rebase, and the subsequent
repository-backbone alignment. The owner approved Gate A on July 30, 2026. The
current local increment contains a static TypeScript application backed by
synthetic fixtures, versioned source and artifact contracts, a fail-closed
artifact pipeline, and a build-time adapter that independently validates all
577 displayed list-entry paragraphs in the current official recognition
notice. The notice states 575 entities but does not provide a row-level
reconciliation between that total and its displayed list, so the live Nation
registry now fails closed pending exact originating-source evidence.

The static application, dossier, CSV, and artifact are current output
implementations/precursors, not the whole engine or a general adapter suite.
The present development definition of done is a general engine for the PNW/ATNI
region and the intended 59 current ATNI Member Tribes, once an authoritative
current roster exists. Nationwide United States packs remain the longer-term
direction.

The Nez Perce habitat/endangered-species scenario is one golden use case for
proving this general design. It is neither a standalone application nor a
source of accepted production facts.

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
- support an authoritatively sourced current 59-member ATNI region across
  Washington, Oregon, Idaho, western Montana, northern California, and
  southeast Alaska without hard-coded Nation/state branches;
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
- a municipal or city policy index for the public beta;
- a repository for non-public agreements or unpublished Tribal material; or
- an outbound notification or user-tracking service.

## Local setup

Requirements: Node.js 22 or later and npm.

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

```powershell
npm run dev
npm run hooks:test
npm run validate:roadmap
npm run validate:backbone
npm test
npm run test:a11y
npm run build
npm run source:bia
npm run source:federal-register:prerelease
npm run --silent source:wa-lws:canary -- --help
```

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
local Codex runs easier to recover and harder to leave in an ambiguous state:

- `SessionStart` adds a short recovery brief from validated `ROADMAP.yaml`, Git
  status, and the next-action queue without reading the chat transcript;
- `PreCompact` requires a valid roadmap and, when the material worktree is
  dirty, an active work item before compaction; exact hash-verified untracked
  owner-direction custody is not treated as unfinished repository work;
- `PreToolUse` denies destructive Git operations, closed external mutations,
  sensitive paths, path aliases, and inactive frozen review or contract
  evidence. The active real-source lane has one update-only exception for its
  exact ignored observer helper while committed and working authority match
  and no attempt latch exists;
- `PostToolUse` runs focused formatting, roadmap, foundation, and
  source-boundary checks after `apply_patch`, selected from the changed paths;
  and
- `Stop` requests one continuation when the ledger is invalid, work remains in
  progress, or the material stopping state is dirty. Its recursion guard allows
  the second stop attempt.

The hooks are synchronous local guardrails. They do not read transcript files,
make network calls, send notifications, commit changes, or replace the full
`npm run check` completion gate. Run `npm run hooks:test` for their focused
contract tests. Post-edit hook checks never execute an unapproved ignored
observer; changed observer bytes require fresh independent review before a
self-test or request. Codex requires the exact project hook definitions to be
reviewed and trusted; after cloning or changing them, use `/hooks` to inspect
and trust the repository hook layer. See the
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

Repository-local Codex support is intentionally narrow: the five lifecycle
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
