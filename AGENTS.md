# AGENTS.md

## Purpose and phase gate

Policy Sentinel is a sovereignty-centered public policy discovery and
source-reference tool. Preserve the product boundaries in
`docs/project-brief.md` and the decisions in `docs/decision-register.md`.

Phase A contains plans, contracts, and synthetic fixtures only. Do not begin
Phase B implementation until the owner explicitly approves
`docs/mvp-plan.md`. Phase B approval alone does not authorize a remote
repository, push, Pages deployment, API registration, provider-term
acceptance, paid call, third-party contact, secret change, or private-data use.

Do the smallest task that satisfies the request. Preserve unrelated and
concurrent changes.

## Git and GitHub

- Use local Git for local version control.
- Use the `gh` CLI for **every** GitHub operation, including authentication,
  repository inspection, API calls, issues, pull requests, Actions, releases,
  remotes, and Pages. Begin a GitHub task with `gh auth status`.
- Do not use a native GitHub plugin, browser-only GitHub workflow, or alternate
  GitHub integration.
- Do not create or change a remote, push, publish, enable Pages, alter secrets,
  create releases, or rewrite history without explicit owner authorization.
- Treat `atniclimate/policy-sentinel` as read-only historical reference.
  Inspect it with `gh` and public source files; do not copy its code or inherit
  its architecture by default.
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

- The Nation baseline comes from the current annual federal recognition notice
  and must validate to exactly 575 before publication. The BIA Tribal Leaders
  Directory is supplementary and is not the recognition authority.
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
  adapter inputs.

## Repository and artifact boundary

Keep the source repository lean: code, schemas, taxonomy/source configuration,
documentation, synthetic fixtures, notices, tests, and approved deployment
configuration only. Generate provider data in ephemeral build space and place
validated public output only in the approved Pages artifact. A hidden path in a
public repository or deployment is not private.

When a source refresh fails, use only a checksum-validated prior public shard
from the last deployed artifact, label it stale/degraded, and preserve its
original data-as-of time. If no last-known-good shard exists, omit that source
and mark it unavailable. Never relabel stale data as current.

## Commands and validation

Current Phase A commands:

```powershell
npm ci
npm test
```

`npm test` must pass before reporting a contract or taxonomy change complete.
It validates JSON Schema compilation in strict mode, taxonomy structure and
IDs, synthetic fixtures, governance invariants, and negative cases.

When Phase B introduces application code, add and document package scripts for
format checking, linting, type checking, unit tests, accessibility tests,
production build, artifact validation, and browser tests. Use only scripts
committed in `package.json`; update this file and the README when the command
surface changes.

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
