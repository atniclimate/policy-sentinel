# Project brief

## Mission

Policy Sentinel is a configurable, sovereignty-centered policy monitoring and
source-reference engine for rights-holding communities. It watches bounded
authoritative sources, explains why material was surfaced, preserves
source-supported change, and produces governed outputs. It does not decide
what the material legally means for a Nation.

The 0.9 definition of done is one general engine supporting a bounded,
owner-selected PNW/ATNI-facing cohort and contrasting scenarios. Exact current
ATNI membership is an independently evidenced claim, not the product's cohort
definition or a universal acquisition gate. Nationwide United States coverage is
a core general-engine capability under D-071; Native Hawaiian support remains
later-compatible. The [2026-10-06 revision](decisions/2026-10-06-development-plan-revision.md)
records the current implementation sequence, regional acquisition focus,
50 GB total ceiling and public/local deployment roles. The retained 0.9 scope and acceptance
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
[`ROADMAP.yaml`](../ROADMAP.yaml). The completed discovery authorization was
`POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`: on 2026-09-05 the owner instructed
execution of the [launch prepared at `39d738a`](handoffs/ps09-real-policy-discovery-launch.md)
and explicitly adopted its stated local scope. Its bounded runner, reviewed
credential-free official acquisition, corpus, temporal/cross-context analysis,
search, local workbench/dossier/export, testing, repairs and local commits were
bounded by that now-ended grant. The [execution journal](development/PS09-REAL-POLICY-DISCOVERY-01.md)
records exact leases, source predicates, counters and measured outcomes;
the [terminal outcome](handoffs/ps09-real-policy-discovery-outcome.md) supplies
measured acceptance. Current organization/engineering maintenance is separately
recorded in the [assurance journal](development/PS09-KNOWLEDGE-ASSURANCE-01.md)
with zero policy-source acquisition authority.

The earlier owner approval covered only the [Run 2 entry packet](handoffs/ps09-run-02-entry-packet.md)
for local synthetic identity/authority contracts and nine candidate manifests.
That bounded packet is now validated at [its checkpoint](handoffs/ps09-run-02-identity-authority-scenarios.md),
with no remaining work under that historical grant. Run 1's synthetic corpus spine remains validated. Required real identity and
scenario evidence is unresolved; synthetic proof does not complete PS09-02.
PS09-03/04/05 completed the adopted general-jurisdiction slice independently;
PS09-02 remains an unmet historical release prerequisite. Schema 1.11 carries
its claims into GD-53 and the current GD-27 local release root through the
[GD-31 crosswalk](development/gd31-release-acceptance-crosswalk.md).
Historical PS09 and other external gates retain their scope.
B1-B10, PNW, and the exhausted 2026-09-03 real-source child lane retain
archived evidence without imposing another release graph. Real public-source
use is intended product capability, with source-specific admission, operation,
analysis, display, export, and redistribution decisions still required.
Remote publishing, API registration,
provider-term acceptance, paid or third-party actions, private data, optional
AI generation, and outbound notifications remain outside current authority.

## Current application-adapter baseline

The sections below preserve the `39d738a` baseline and mixed-maturity requirements for the static
application. They are one application-adapter baseline, not the complete PNW
engine definition of done. Their current maturity is:

| Maturity | Current evidence |
| --- | --- |
| Integrated, synthetic only | The ordinary build passes its exact three existing fixtures through AnalyzedCorpus 1.1 into the retained artifact, application, dossier, CSV, source-health, and last-known-good contracts. The Nation rows remain 575 explicitly synthetic fixtures. |
| Implemented but disabled | Federal Register, Washington Governor executive orders, Washington Centennial Accord, and one curated Supreme Court adapter are validated but emit no public records. |
| Historical real-source evidence block | The Federal Register-specific lifecycle contract and narrow AnalyzedCorpus 1.0 child are implemented; the live vertical slice stopped on consumed R7 digest drift. No retry, FR-A1, real corpus, or activation is authorized. |
| Local corpus spine | Windows synthetic object custody and CuratedDocumentPack 1.0 implement strict UTF-8 rendition, document/version, evidence-segment and citation replay. Real acquisition, PDF/OCR/HTML parsing, and pack publication are unsupported. |
| Contract-only | Congress.gov, GovInfo, Regulations.gov, Oregon Legislature OData, and Washington LWS have synthetic contract evidence but no activated live adapter. |
| Proposed | Full PNW region, deployment, persona, common output-adapter suite, production refresh, and publication capabilities are not implemented. |

`ROADMAP.yaml` remains authoritative for item-level status and acceptance
evidence.

The current local workbench has its own adopted output boundary: reviewed
generated files stay under the owned external run's `local-output/`, served
only through explicit `127.0.0.1` invocation. The ordinary synthetic build
remains independent of real input. General-jurisdiction search, version and
cross-context comparison do not require a real Nation selection or membership
registry; their source evidence and uncertainty remain explicit. These local
capabilities must be demonstrated through the launch's acceptance rather than
inferred from the retained application baseline.

### People and flows

- The production application contract selects one Nation from a separately
  validated United States federal-recognition baseline. The current build uses
  an explicitly synthetic 575-row collection instead.
- Comparison is an explicit advanced-mode requirement. It is not enabled in the
  current application and may be implemented only after the single-Nation flow
  works.
- The three dashboard entry points are guided Nation search, policy-area
  browsing, and a landmark timeline.
- Visitors can search globally; filter by jurisdiction, document type, status,
  date, source, and relevance basis; review short result cards; open on-demand
  details; select records; print a dossier; and download CSV.

### Geography and coverage

- The existing Nation-collection contract targets exactly 575 federally
  recognized entities and remains future nationwide-scale recognition
  evidence. It is not an ATNI membership registry.
- Existing source research is concentrated in Washington, Oregon, and Idaho.
  The owner-selected 0.9 planning cohort also includes northern California,
  southeast Alaska, and Montana contexts including Crow, Fort Peck, and Fort
  Belknap. Run 2 must establish exact identity and scenario manifests; Run 1
  introduces no real identity facts. A Crow government, reservation, and BIA
  agency are distinct; Fort Peck and Fort Belknap cannot be merged. Nevada is
  not automatically included by directory appearance. The retained Duwamish
  cohort exclusion makes no recognition, membership, or legal determination.
- For a Nation outside those three states, show federal results only and a
  plain coverage notice.
- Every source shows its real historical range, range confidence, data-as-of
  date, and health. Never imply universal or complete coverage.
- A state or federal record that does not explicitly name a Nation may appear
  only as a clearly labeled general-jurisdiction record.
- D-087 admits official county and municipal instruments to general-engine
  discovery as general-jurisdiction records without a Nation-name requirement.
  Exact official evidence remains required for a Nation relationship; location,
  territory, land, maps and keywords cannot supply it. The retained static beta
  exclusions remain historical until successor schemas are implemented.
- Official public Tribal-government codes, ordinances, resolutions and policies
  are eligible public sources. Restricted internal governmental or operational
  policies may be incorporated by authorized Tribal users; external partners
  require permission for access and use. Public Tribal authorship alone creates
  no private-data or per-instance authorization requirement (D-087).

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

- The production application acceptance target is a weekly refresh with a
  manual workflow-dispatch option. No scheduled or manual deployment workflow
  currently exists.
- The current synthetic application and artifact contracts present data-as-of
  dates, per-source health and freshness, new/changed badges, and exact urgent
  deadline or status alerts when the validated artifact supplies them.
- Urgent alerts appear only in the site and dossier. No email, text, Slack, or
  other outbound notification is authorized.
- The local pipeline implements the rule that a failed refresh may preserve
  checksum-validated last-known-good public data, its original data-as-of date,
  and a degraded/stale label. A future deployment workflow must supply the
  approved prior artifact and must never present stale data as current.

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

### Single local 0.9 release candidate

This subsection records the retained historical acceptance. Current 1.0 local
acceptance is the [owner definition](decisions/2026-09-24-definition-of-done-general-development.md)
and [GD-31 claim crosswalk](development/gd31-release-acceptance-crosswalk.md),
represented by GD-27. Every unresolved historical claim survives in GD-53;
the package candidate and independent demonstrations are separate work items.

`PS09-06-LOCAL-RC` is complete only when the accepted scope in
[`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md) passes: the bounded
cohort and scenarios, real-source evidence and operation gates, immutable
renditions and exact citations, one corpus and common outputs, honest coverage,
and integrated Windows, browser, accessibility, privacy, security, and replay
evidence. Membership evidence is required for a membership claim. Existing
B1-B10 and PNW checkpoints are reusable evidence with explicit
[component dispositions](development/ps09-convergence.v1.json), not separate
mandatory release roots. Run 1 does not complete this six-run target.

### Published application

The retained public-beta contract below has the historical prerequisite
`PS09-06-LOCAL-RC`, followed by separately authorized license, remote, hosting,
and publication operations and public-profile review. It supplies no current
general-engine publication authority; a successor output operation must be
represented separately. Its retained historical acceptance is satisfied only when:

1. if the retained federal-recognition collection is published, its exact
   575-identity compatibility contract and current recognition evidence pass;
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
