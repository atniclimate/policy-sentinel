# Policy Sentinel

Policy Sentinel is a sovereignty-centered public policy discovery and
source-reference project for Tribal government leadership and staff, policy
staff, grants staff, and program staff. It is being designed as a static public
GitHub Pages application that helps a visitor find and cite official records
without implying a legal conclusion or a complete account of a Nation's
interests.

## Project status

This repository is in **Phase B: local implementation**. The owner approved
Gate A on July 30, 2026. The current local increment contains a static
TypeScript application backed by synthetic fixtures, versioned source and
artifact contracts, a fail-closed artifact pipeline, and a build-time adapter
that independently validates all 577 displayed list-entry paragraphs in the current
official recognition notice. The notice states 575 entities but does not
provide a row-level reconciliation between that total and its displayed list,
so the live Nation registry now fails closed pending exact originating-source
evidence.

This is not a completed public beta. Production record-source adapters,
large-scale index benchmarks, publication review, a remote repository, GitHub
Pages, and a release are still pending. Gate A did not authorize a remote,
push, Pages, API registration, provider-term acceptance, paid use, third-party
contact, optional AI generation, outbound notifications, or private material.

Current progress, dependencies, source blocks, acceptance evidence, and the
course through a local release candidate are maintained in the validated
[`ROADMAP.yaml`](ROADMAP.yaml). The external publication step remains
separately blocked. A fresh Sol Ultra session can resume from
[the durable continuation prompt](docs/continuation-prompt.md).

## Intended public beta

The beta is intended to:

- offer a searchable, keyboard-accessible selector for the current baseline of
  575 federally recognized Nations;
- provide federal coverage for every selected Nation and additional source
  coverage for Washington, Oregon, and Idaho only where a viable official
  source has been validated;
- support legislation, statutes, regulations, executive material, grants,
  litigation and decisions, public intergovernmental agreements, qualifying
  county records, and officially published Tribal government documents;
- provide guided Nation search, policy-area browsing, and a landmark timeline;
- expose coverage, freshness, source health, provenance, and the exact basis on
  which each result is shown; and
- create print-ready source dossiers and CSV exports from selected records.

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
private material must not be committed. Generated public data may exist only in
an approved Pages deployment artifact and is public once deployed.

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
roadmap and foundation, runs the source-boundary scan plus unit and
accessibility tests, builds the static application, emits an ignored synthetic
artifact under `dist/data`, and validates its hashes and contracts.

Useful focused commands:

```powershell
npm run dev
npm run validate:roadmap
npm test
npm run test:a11y
npm run build
npm run source:bia
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

`npm run --silent source:wa-lws:canary -- --help` describes the separately
invoked Washington Legislative Web Services canary. It accepts exactly one of
two repository-owned scenarios: the previously executed
`known_bill_legislation_v1` `GetLegislation` request or the unexecuted
`legislation_by_year_v1` scenario whose internal request is fixed to
`GetLegislationByYear(2025)`. Each requires exact `--execute` and `--scenario`
flags, makes at most one keyless build-time request with no retry, emits one
closed aggregate JSON line, and writes no response or record. The yearly report
contains no request year, identifier, source string, typed item, or completeness
claim. The command is not part of `npm run check`, does not enable the disabled
source, and does not establish complete coverage. Run it only when the exact
bounded live source check is intended.

Key documents:

- [Canonical implementation roadmap](ROADMAP.yaml)
- [Sol Ultra continuation prompt](docs/continuation-prompt.md)
- [Project brief](docs/project-brief.md)
- [Source feasibility](docs/source-feasibility.md)
- [Data governance](docs/data-governance.md)
- [Architecture](docs/architecture.md)
- [Source coverage](docs/source-coverage.md)
- [UX specification](docs/ux-spec.md)
- [MVP plan and stop/go gates](docs/mvp-plan.md)
- [Decision register](docs/decision-register.md)

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
