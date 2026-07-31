# Policy Sentinel

Policy Sentinel is a sovereignty-centered public policy discovery and
source-reference project for Tribal government leadership and staff, policy
staff, grants staff, and program staff. It is being designed as a static public
GitHub Pages application that helps a visitor find and cite official records
without implying a legal conclusion or a complete account of a Nation's
interests.

## Project status

This repository is in **Phase A: foundation, source feasibility, and
implementation planning**. It contains documentation, versioned contracts, and
synthetic validation fixtures. It does not yet contain ingestion adapters, a
production interface, generated policy data, a remote repository, or a Pages
deployment. A folder and plan are not a completed Policy Sentinel product.

Implementation must not begin until the owner approves the
[MVP plan](docs/mvp-plan.md). That approval will not, by itself, authorize a
GitHub remote, a push, Pages, API registration, acceptance of provider terms,
paid use, third-party contact, or use of private material.

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

## Local foundation setup

Requirements: Node.js 22 or later and npm.

```powershell
npm ci
npm test
```

`npm test` validates both JSON Schemas, the ten-category taxonomy, synthetic
record fixtures, and selected negative governance cases. There is no application
development server or production build in Phase A.

Key documents:

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
