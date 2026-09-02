# Project brief

## Mission

Policy Sentinel is a configurable, sovereignty-centered policy monitoring and
source-reference engine for rights-holding communities. It watches bounded
authoritative sources, explains why material was surfaced, preserves
source-supported change, and produces governed outputs. It does not decide
what the material legally means for a Nation.

The present development definition of done is a general engine capable of
supporting the PNW/ATNI region and the intended 59 current ATNI Member Tribes,
once an authoritative current roster exists. Nationwide United States coverage
is the longer-term direction. The complete binding scope and acceptance
contract is [`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md).

This is a new, independent project. The earlier public
`atniclimate/policy-sentinel` repository is historical reference only. Its
software design and code are not inherited.

## Current phase

Phase A established the local repository, written design, source feasibility,
versioned data contracts, starting taxonomy, and validation workflow. The owner
approved Phase B local implementation on 2026-07-30. The 2026-09-02 product-space
rebase retains that work as implementation evidence while separating engine,
region, deployment, persona, and output concerns. Current progress,
dependencies, and remaining work are recorded in
[`ROADMAP.yaml`](../ROADMAP.yaml). Remote publishing, API registration,
provider-term acceptance, paid or third-party actions, private data, optional
AI generation, and outbound notifications remain outside current authority.

## Current application-adapter baseline

The sections below preserve requirements already implemented, contracted, or
planned for the static application. They are one application-adapter baseline,
not the complete PNW engine definition of done.

### People and flows

- The current application contract selects one Nation from a separately
  validated United States federal-recognition baseline.
- Comparison is an explicit advanced mode and is implemented only after the
  single-Nation flow works.
- The three dashboard entry points are guided Nation search, policy-area
  browsing, and a landmark timeline.
- Visitors can search globally; filter by jurisdiction, document type, status,
  date, source, and relevance basis; review short result cards; open on-demand
  details; select records; print a dossier; and download CSV.

### Geography and coverage

- The existing Nation-collection contract targets exactly 575 federally
  recognized entities and remains future nationwide-scale recognition
  evidence. It is not an ATNI membership registry.
- Current additional source research and implementation is concentrated in
  Washington, Oregon, and Idaho. The PNW completion target also includes
  western Montana, northern California, and southeast Alaska; those contexts
  currently remain explicit gaps.
- For a Nation outside those three states, show federal results only and a
  plain coverage notice.
- Every source shows its real historical range, range confidence, data-as-of
  date, and health. Never imply universal or complete coverage.
- A state or federal record that does not explicitly name a Nation may appear
  only as a clearly labeled general-jurisdiction record.
- A county record may appear only when its official record explicitly names
  the selected Nation. Location, territory, land, maps, and keywords are not
  evidence.
- Municipal and city policy sources are excluded from the public beta.

An official, auditable relation will control state or regional treatment.
Neither an address nor a map point in the Tribal Leaders Directory establishes
legal or geographic interest. Federal recognition, ATNI membership, and state
or regional relations remain separate evidence-bearing concepts.

### Eligible records

The model and roadmap support:

- proposed, active, committee-stage, enacted, and historical bills and
  statutes;
- regulations, rulemakings, executive actions, notices, and implementation
  material;
- grant and funding opportunities;
- litigation, court decisions, and administrative decisions;
- public state or federal intergovernmental accords and agreements;
- county policies and ordinances with an explicit official Nation mention; and
- officially published Tribal government documents.

Non-public agreements and Tribal materials that are not officially published
are excluded. A private deployment may use documents explicitly supplied or
authorized by a Tribe, but those documents can never enter a public build.

### Historical and landmark treatment

Actual source range always controls. Before 1980, a non-landmark record is
normally listed with an exact citation and official link rather than a new
summary.

Detailed landmark treatment requires all of the following:

1. the record is a documented court decision, treaty, statute, or public
   state/federal intergovernmental accord, or an official source identifies it
   as foundational;
2. an official title or citation, date, issuing body, and official evidence
   URL are verified;
3. an approved criterion code and review state are recorded;
4. any Nation association is supported independently by exact official
   evidence; and
5. reproduction and excerpt treatment is allowed by the source.

The Boldt decision and Washington Centennial Accord are research cases, not
templates for invented facts. The original 1974 Boldt decision remains labeled
as lacking an online official primary copy until one is verified. The
Centennial Accord remains general/landmark unless official signatory evidence
supports individual Nation links.

### Nation relationship and category integrity

- Public Nation associations are source-explicit. AI-derived,
  geography-derived, land-derived, and keyword-derived associations are
  prohibited.
- Every association stores exact evidence, its official URL, source identifier,
  and validation state.
- Policy categories are populated only by a versioned deterministic map from
  exact official source subject headings or official topic labels.
- The taxonomy supports many-to-many membership and is configuration, not UI
  code.
- An absent or ambiguous official subject leaves the record `Unclassified`.
  It remains discoverable through title, source, jurisdiction, and permitted
  full-text search.

### AI summaries

- The Pages application works fully without AI and makes no browser-side LLM
  calls.
- AI summaries are optional, pre-generated build inputs only.
- A summary appears only after a detail view opens and is labeled
  `AI-generated source summary`.
- It is professional, succinct, objective, and contains no em dash, legal
  conclusion, rights determination, relevance claim, or unsupported assertion.
- Its model/build provenance, cited official inputs, source dates, and source
  links appear beside it.
- If no approved summary exists, show official metadata and permitted official
  language only.

### Land and sensitive information

The public beta contains no map, parcel geometry, ownership, trust-land,
fee-land, Tribally owned parcel, or sensitive land context. Land information
is never used to filter or infer public results.

The architecture documents an unimplemented opt-in adapter boundary for a
separate private deployment. It contains no data, credentials, example
locations, telemetry, or automatic export path. The public interface must not
suggest that its results represent a Nation's full land interests.

### Refresh and alerts

- Public data refreshes weekly, with a manual workflow-dispatch option.
- The application shows data-as-of dates, per-source health and freshness,
  new/changed badges, and urgent deadline or status alerts.
- Urgent alerts appear only in the site and dossier. No email, text, Slack, or
  other outbound notification is authorized.
- A failed refresh preserves checksum-validated last-known-good public data,
  its original data-as-of date, and a degraded/stale label. It never presents
  stale data as current.

### Current static application output

- GitHub Pages is the delivery target; there is no runtime backend requirement.
- The public repository remains lean and contains no raw corpora, cached API
  responses, generated policy data, generated AI summaries, real
  Nation-specific configuration, private data, or secrets.
- Generated public data is placed only in an approved deployment artifact and
  is publicly inspectable.
- The first result index stays compact. Large detail records are separate
  static assets fetched on demand.
- Full official language or long abstracts are shown in collapsible details
  only when source terms permit it. Otherwise show an exact citation, a short
  permitted source excerpt, and the official full-text link.
- No telemetry, search logging, tracking pixels, or automatic user-data
  transmission is allowed.

### User experience

- Nation selection is searchable, keyboard accessible, single-select by
  default, and has a reliable native fallback. Search uses official names and
  authorized aliases only.
- The ten top-level policy areas are visible checkboxes or selectable cards,
  not a multi-select drop-down. A category can reveal optional subcategory
  checkboxes. With no subcategory selected, its parent means all records in the
  category; chosen subcategories narrow it.
- `All policy areas` is explicit. `Unclassified and other records` has a
  visible route.
- Result cards show official title, document type, jurisdiction, status,
  source, updated date, and `why shown`.
- Details may show permitted source language, official abstracts, action and
  status history, sponsors, committees, source links, provenance, and an
  optional AI summary.
- Dossiers contain exact source metadata and permitted source language,
  selection criteria, generated time, data-as-of time, source list, coverage
  limitations, and the not-legal-advice notice.
- CSV exports selected records. Printing uses browser printing and a dedicated
  print stylesheet before any server-side PDF is considered.
- Semantic HTML, keyboard navigation, visible focus, responsive layout,
  plain-language controls, and accessibility tests are required. Filters do
  not auto-submit and behavior is never hover-only.

## Required data contract

The versioned record contract must preserve stable internal and source IDs;
exact official title and identifier; record type, jurisdiction, issuer,
session/congress, and status; all available relevant dates; official source and
full-text URLs; permitted official text; sponsors, committees, actions, and
status history; official subjects and deterministic mappings; relevance basis
and exact Nation evidence; coverage and historical status; data quality and
source health; field-level provenance; and optional AI-summary provenance.

No field may imply a legal conclusion or a relationship unsupported by its
source. The concrete Phase A contract is documented in
[`data-contract.md`](data-contract.md).

## Definition of done

### Phase A

Phase A is done when all required documents, the human-readable taxonomy, the
versioned record and taxonomy schemas, synthetic fixtures, and the local
validation command exist; current primary-source evidence and gaps are cited;
the validator passes; no disallowed implementation or external mutation has
occurred; and the owner receives one explicit Phase B approval gate.

### PNW regional engine

The PNW regional engine is done only when every dimension in
[`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md) passes, including
the authoritative current ATNI roster, general engine seams, differentiating
PNW contexts, one analyzed corpus, required output-adapter classes, contrasting
acceptance scenarios, and integrated release evidence. Existing B1-B10 work is
reusable evidence but does not establish those outcomes by itself.

### Published application

The current product public beta requires the PNW regional engine and retained
application release scopes to be complete, followed by separate publication
authorization. Within that combined boundary, it is done only when:

1. the 575-Nation registry is validated against the current recognition notice;
2. the single-Nation flow and federal-only notice work before comparison mode;
3. every enabled source passes its contract, terms, provenance, history,
   health, and last-known-good tests;
4. all record, category, Nation-link, historical, AI, and sensitive-data rules
   above are enforced in generated artifacts;
5. the three entry points, filters, global search, details, dossiers, and CSV
   work without AI;
6. accessibility, keyboard, responsive, print, performance, security, and
   prohibited-data tests pass;
7. the visible coverage matrix and all freshness/health states match the
   artifact;
8. a production artifact has been reviewed for secrets, private data, and
   source-use compliance; and
9. the owner separately authorizes the GitHub remote and Pages publication.

Passing Phase A, a synthetic artifact, or local PNW completion does not satisfy
the publication gate.
