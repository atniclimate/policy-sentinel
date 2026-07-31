# Decision register

## How to use this register

This file records product decisions that later sessions must not silently
reopen. `Final` decisions require owner approval to change. Assumptions and
implementation facts may be resolved with dated primary evidence, but their
resolution must be recorded here and in affected versioned configuration.
Source-specific blockers do not block unrelated sources.

Last reviewed: 2026-07-30.

## Final decisions

| ID | Decision |
| --- | --- |
| D-001 | Policy Sentinel is a new, independent project. The earlier [`atniclimate/policy-sentinel`](https://github.com/atniclimate/policy-sentinel) repository is historical reference only; copy neither its code nor its software design. |
| D-002 | The public beta serves Tribal government leadership and policy, grants, and program staff. It is a source-reference and discovery tool, not legal advice, a comprehensive legal database, a rights-impact engine, or a substitute for official sources. |
| D-003 | The Nation selector uses the current Bureau of Indian Affairs 575-Nation recognition baseline. It is keyboard-accessible, single-select by default, and searches official names and authorized aliases only. Comparison is an explicit advanced mode after the single-Nation flow works. |
| D-004 | Initial coverage is federal plus Washington, Oregon, and Idaho. A Nation outside those three states receives federal results and a clear state-coverage notice. The site exposes source-specific coverage and historical ranges and never implies universal coverage. |
| D-005 | A public Nation-to-record link requires exact evidence from the official source. AI, keywords, geography, territory, maps, and land data cannot create that link. County records require an explicit Nation mention in the official record. State and federal records without one are labeled `general jurisdiction`, never Nation-specific. |
| D-006 | The model supports bills and statutes in proposed, active, committee, enacted, and historical states; regulatory and executive material; grants; litigation and administrative decisions; public state/federal accords; eligible county records; and officially published Tribal government documents. Municipal and city sources, non-public agreements, and unofficially published Tribal materials are excluded from the public beta. |
| D-007 | Category membership is many-to-many and driven by versioned configuration. Only a deterministic map from exact official subject headings or topic labels may populate categories. No AI or keyword-only categorization is allowed. Unmapped valid records remain `Unclassified` and globally discoverable. |
| D-008 | Actual historical range is shown per source. Before 1980, non-landmarks are usually listed and linked rather than summarized. Landmark treatment requires the written criteria and verified official evidence for a treaty, court decision, statute, or public state/federal accord, or an official foundational designation. |
| D-009 | The public site works fully without AI and makes no browser-side LLM calls. Optional summaries are generated only at approved build time, appear only in details, carry the exact label `AI-generated source summary`, cite official inputs, preserve model/build provenance, contain no em dash, and make no legal conclusion, rights determination, relevance claim, or unsupported assertion. |
| D-010 | Public data and relevance logic exclude maps, parcel geometry, ownership, trust/fee-land data, Tribally owned parcel data, and sensitive land context. A documented but unimplemented adapter may connect explicitly authorized data only in a separate private deployment, with no bundled data, credentials, sample locations, telemetry, automatic transmission, or automatic export path. |
| D-011 | Refresh is weekly with a manual workflow-dispatch option. Builds expose data-as-of time, per-source health, new/changed badges, and deterministic urgent deadline/status alerts. A failure retains labeled last-known-good data. The beta sends no outbound alerts and collects no telemetry or search logs. |
| D-012 | GitHub Pages is a static delivery target. The repository remains lean and contains no raw corpora, API caches, generated public policy data, generated AI summaries, real Nation configuration, private data, or secrets. Generated public data exists only in the deployment artifact and is understood to be public. Large details are separate on-demand static assets. |
| D-013 | Every source-derived field carries field-level provenance, retrieval time, source update time when available, transform/mapping versions, and validation state. Exact official values remain distinct from normalized display values. No field may imply a legal conclusion or unsupported relationship. |
| D-014 | The primary interface has guided Nation search, policy-area browsing, and a landmark timeline. Ten top-level policy areas use checkboxes or selectable cards, not a multi-select dropdown. A parent means all its records unless selected subcategories narrow it; `All policy areas` and `Unclassified and other records` are explicit choices. |
| D-015 | Results use short cards with official title, document type, jurisdiction, status, source, updated date, and `why shown`. Filters require explicit apply behavior. Details may show permitted official language, action and status history, sponsors, committees, provenance, links, and the optional AI summary. |
| D-016 | Selected records support CSV and a browser-print dossier before any server PDF system. Every dossier includes selection criteria, generated and data-as-of times, source list, coverage limits, exact source metadata/language, alerts, and the not-legal-advice notice. |
| D-017 | Semantic HTML, keyboard navigation, visible focus, responsive layout, plain labels, accessibility tests, and a native Nation-select fallback are mandatory. No hover-only behavior or auto-submit filters. |
| D-018 | Full official text or long abstracts are published only when source terms allow. Otherwise use an exact citation, a permitted short source excerpt, and the official full-text link. |
| D-019 | Local Git is the version-control system. All GitHub operations use `gh`; native GitHub plugins, alternate integrations, and browser-only GitHub workflows are prohibited. Remote creation, push, Pages, beta publication, secrets changes, account/API registration, forms, charges, and third-party contact require explicit approval. |
| D-020 | Phase A creates plans, schemas, configuration, synthetic fixtures, and a durable local validation workflow only. It does not implement ingestion, a production UI, a live Pages site, a remote, or publishing. Phase B must not begin without the gate below. |

## Working assumptions

| ID | Assumption | Resolution rule |
| --- | --- | --- |
| A-001 | The annual recognition notice controls the 575 baseline; the Tribal Leaders Directory is auxiliary and does not establish recognition. | Reconcile every displayed Nation to the annual notice. Use an alias only when an official source documents it. |
| A-002 | Project-owned stable Nation and record IDs are necessary because source identifiers and names can change. | Keep source IDs separately and document any redirect or merge without deleting history. |
| A-003 | Missing fields are unknown or unavailable, not negative facts. | Never infer a value; preserve the source's omission and validation state. |
| A-004 | Source coverage dates are heterogeneous and can change. | Derive and publish per-source coverage from validated evidence rather than one global start date. |
| A-005 | A lean static TypeScript build with schema-validated artifacts is the preferred implementation, subject to Phase B approval and search/index benchmarks. | Add a service or dependency only when a measured static requirement cannot be met and record the justification first. |

## Open implementation facts

| ID | Fact to resolve | Current evidence and next verification |
| --- | --- | --- |
| O-001 | Exact parsing and stable crosswalk for all 575 names, authorized aliases, and state coverage. | The [2026 recognition notice](https://www.federalregister.gov/documents/2026/01/30/2026-01899/indian-entities-recognized-by-and-eligible-to-receive-services-from-the-united-states-bureau-of) states 575; grouping and cross-references require a validated parser and a hard-count fixture. Do not import TLD contacts or geometry. |
| O-002 | Final client index/shard sizes, full-text method, and detail-asset boundaries. | Benchmark with synthetic fixtures before selecting an index dependency. Preserve the compact initial index and on-demand details either way. |
| O-003 | Exact deterministic definitions for new/changed badges and urgent deadline/status alerts. | Specify source-field comparisons, time zones, thresholds, and test cases before public use; do not use AI urgency scoring. |
| O-004 | Congressional and federal metadata field availability across time. | Validate the [Congress.gov coverage dates](https://www.congress.gov/help/coverage-dates), GovInfo package/granule fields, pagination, and source identifiers with source-specific fixtures. |
| O-005 | Washington category mapping. | [Legislative Web Services](https://wslwebservices.leg.wa.gov/) exposes legislative records but no validated bulk subject field. Keep records `Unclassified` until an exact official Topical Index mapping can be acquired and tested. |
| O-006 | Oregon machine-readable historical start and allowed credential workflow. | The [Oregon data page](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx) and its acceptable-use agreement require an owner-approved terms/credential decision; verify observed OData history against official archives after that gate. |
| O-007 | Idaho structured legislative coverage. | Idaho publishes official session pages but no stable documented API, feed, schema, rate policy, or bulk contract was found. Do not disguise HTML scraping as an API. |
| O-008 | Exact official signatories for the Centennial Accord and other accords. | The [Washington Centennial Accord page](https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord) verifies the public accord but does not provide a validated complete signatory list. Treat it as general-jurisdiction/landmark until each Nation link has official evidence. |
| O-009 | Primary online source package for the 1974 Boldt decision. | The official original PDF was not located in this review. Preserve the reporter citation and use the official 1979 U.S. Reports opinion as later primary context; do not substitute unofficial full text or invent Nation associations. |
| O-010 | Court, county, Tribal-government, treaty, compact, and administrative-decision republication rules. | Approve sources individually. Public availability does not by itself authorize bulk reuse or full-text republication. |
| O-011 | Public repository license and exact independent-project attribution language. | Owner selects the license before remote publication. Preserve ATNI historical attribution and avoid any endorsement claim. |
| O-012 | Exhaustive provenance completeness checking beyond JSON Schema shape. | Phase B must add a semantic walk that proves every source-derived leaf has a matching provenance entry and tests adapter-specific transforms. |

## Source and authorization blockers

| ID | Blocker | Effect |
| --- | --- | --- |
| B-001 | Oregon OData access is governed by an acceptable-use agreement and credential/non-sharing conditions. | No acceptance, registration, credentials, or live adapter until explicitly approved. Other Oregon official link-based research may continue. |
| B-002 | No stable permitted Idaho legislative machine interface is currently documented. | Mark automation `blocked_source_contract`; show the gap in coverage. A structured official export or documented interface needs later verification and possibly owner-approved contact. |
| B-003 | Congress.gov, GovInfo, Regulations.gov, NARA, and some other interfaces require keys or accounts. | Fixtures and adapter contracts may be designed locally, but no registration or secret setup occurs without source-specific approval. Secrets never enter the client or repository. |
| B-004 | PACER can incur fees and exposes privacy/redaction concerns; third-party court services have separate licenses and limits. | Excluded unless the owner separately approves the source, terms, cost, privacy controls, and authority hierarchy. |
| B-005 | County and Tribal-government sources are heterogeneous and may restrict reuse. | Enable only a reviewed official source with explicit Nation evidence and permitted use. Discovery pages or search results alone are insufficient. |
| B-006 | Remote creation, push, Actions secrets, Pages, and public beta release are not authorized in Phase A. | Work remains local until a later explicit remote-operation approval. |
| B-007 | Full-text republication rights may be absent or unclear even for an official public page. | Publish citation, permitted excerpt, and official link only; quarantine content if even that use is unclear. |

## Stop/go gates

| Gate | Required approval or evidence | What it authorizes |
| --- | --- | --- |
| G-A | Owner approves the written Phase A plan. | Begin Phase B local implementation only. It does not authorize any other gate. |
| G-B | Owner explicitly approves the named registration, acceptable-use agreement, API key, or secret workflow after terms review. | Use that one source in approved local or Actions scope. |
| G-C | Owner explicitly approves the named paid call, form, or third-party contact. | Perform only that identified action and record its outcome. |
| G-D | Owner explicitly approves remote creation/push and separately approves Pages/publication and any Actions secrets. | Perform the named GitHub operations using `gh` only. |
| G-E | All enabled sources pass schema, semantic, provenance, attribution, accessibility, failure, freshness, and coverage-notice acceptance tests. | Present a release candidate for public-beta approval; it does not itself publish. |
| G-F | A Nation supplies or authorizes specific private material and the owner approves a separate private-deployment control plan. | Implement or activate only that private adapter outside the public build. |

The single approval needed to start the next phase is **G-A: approve Phase B
local implementation under the final MVP plan**. That approval does not include
remote operations, publishing, registrations, terms acceptance, paid services,
third-party contact, or private-data use.

## Historical repository inspection

On 2026-07-30, `gh repo view atniclimate/policy-sentinel` reported
`isArchived: false`, although the project brief describes that repository as
archived. The owner-directed treatment controls: it remains read-only historical
reference regardless of the GitHub flag. Its public files were inspected through
`gh`; it was not cloned, modified, or used as an architecture or code source.

## Change control

1. Cite dated primary evidence for a source-fact correction.
2. Record the affected decision, assumption, blocker, schema, taxonomy, mapping,
   coverage range, and acceptance tests before changing behavior.
3. Owner approval is required for a `Final` decision, scope expansion, new public
   data class, loosened evidence rule, new external authorization, or movement
   across a stop/go gate.
4. Version schema and taxonomy changes. A breaking schema change increments the
   major version; compatible additions increment the minor version. A mapping
   change records its own version and review provenance.
5. Never silently reclassify records, create Nation relationships, expand
   historical coverage, or weaken a public/private boundary.
