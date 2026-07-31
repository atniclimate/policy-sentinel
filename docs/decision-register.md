# Decision register

## How to use this register

This file records product decisions that later sessions must not silently
reopen. `Final` decisions require owner approval to change. Assumptions and
implementation facts may be resolved with dated primary evidence, but their
resolution must be recorded here and in affected versioned configuration.
Source-specific blockers do not block unrelated sources.

Last reviewed: 2026-07-31.

## Current phase authorization

The owner approved Gate G-A on 2026-07-30. Phase B local implementation under
`docs/mvp-plan.md` may proceed. This approval does not include any other gate:
remote operations, publication, API registration, secrets, provider-term
acceptance, paid or licensed access, third-party contact, private material,
optional AI generation, and outbound notifications remain unauthorized.

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
| D-021 | On 2026-07-30 the owner approved Phase B local implementation under the MVP plan. All later source, credential, remote/publication, paid, private-data, AI, and notification gates remain independent and closed. |
| D-022 | `ROADMAP.yaml` is the canonical machine-readable ledger for current progress, dependencies, evidence, blockers, and remaining work through finish. Binding Markdown documents continue to define product and acceptance requirements. Future sessions validate and update the roadmap at material checkpoints and before context compaction; closed external gates are recorded rather than reopened as a general interview. |
| D-023 | Source-registry v1.5 records research, versioned adapter implementation, and activation as separate facts. A disabled source may have no adapter or an implemented adapter that cannot yet emit public records; every non-synthetic entry carries a primary-source access date, enabled sources require a versioned adapter, and disabled source IDs are excluded from and rejected by generated artifacts. |
| D-024 | Artifact package 1.1 adds optional schema-v1 compact-index and coverage metadata while preserving package-1.0 validation fixtures. Static policy v1 uses a bounded 31-day Federal Register window plus fail-closed byte ceilings, keeps coverage separate from health, requires authoritative health receipts for enabled non-synthetic sources, and validates declared and actual file sizes before reading asset bodies. |

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
| O-001 | Publication review and durable crosswalk for all 575 official names, authorized aliases, name changes, grouping, and state coverage. | Two independent methods verified that the [2026 recognition notice](https://www.federalregister.gov/documents/2026/01/30/2026-01899/indian-entities-recognized-by-and-eligible-to-receive-services-from-the-united-states-bureau-of) states 575 entities while displaying 577 ordered list-entry paragraphs: 348 contiguous and 229 Alaska. The [August 2023 notice](https://www.govinfo.gov/content/pkg/FR-2023-08-11/html/2023-17195.htm) withdrew the 2022 and January 2023 count clarification and returned the Venetie and Pribilof grouping entities; the current notice supplies no row-level reconciliation from its displayed paragraphs to its stated total. The former Venetie-only alias rule was unsupported and has been removed. The adapter now verifies the transcription and fails closed without emitting a registry. Exact originating-source identity evidence, then the stable-ID, official-alias, and state crosswalk, remain required. TLD contacts, addresses, and geometry stay excluded. |
| O-002 | Final client index/shard sizes and full-text method at representative public-data scale. | Federal Register measurement now supports a bounded first policy: the complete 2026-07-01 through 2026-07-31 candidate reconciled 2,319 provider documents to 2,316 eligible records and measured 4,614,723 bytes of index, 4,802,344 bytes of initial non-detail JSON, 62,874,286 bytes of details, and 67,676,630 total hashed bytes. One valid detail was 439,763 bytes because 220 scheme-distinct official subjects required 697 provenance entries; the next largest was 168,633 bytes. Static-artifact v1 therefore fails closed at 6 MiB index, 8 MiB initial non-detail JSON, a measured pre-release 512 KiB per detail, 128 MiB aggregate details, and 136 MiB total. The UI incrementally reveals 50 results and loads details on demand. Multi-source release-candidate measurement, browser performance evidence, and any later index sharding decision remain open. |
| O-003 | Exact deterministic definitions for new/changed badges and urgent deadline/status alerts. | Specify source-field comparisons, time zones, thresholds, and test cases before public use; do not use AI urgency scoring. |
| O-004 | Congressional and federal metadata field availability across time. | The [2026-07-31 Congress.gov review](source-reviews/congress-gov-api-2026-07-31.md) records field-specific website ranges and synthetic identity/resource contracts. The separate [2026-07-31 GovInfo review](source-reviews/govinfo-api-2026-07-31.md) records collection-specific package/granule, rendition, MODS, PREMIS, pagination, fixity, and historical gaps. Live requiredness/nullability, cursor termination, actual fixity-to-rendition binding, and cross-source relationships still require separately approved canaries; Congress.gov record identities and GovInfo publication-package identities remain distinct. The current artifact model has only source-level health/LKG, so GovInfo activation also requires a versioned collection dimension or conservative whole-source degradation. |
| O-005 | Washington category mapping. | [Legislative Web Services](https://wslwebservices.leg.wa.gov/) exposes legislative records but no validated bulk subject field. Keep records `Unclassified` until an exact official Topical Index mapping can be acquired and tested. |
| O-006 | Oregon machine-readable historical start and allowed credential workflow. | The [Oregon data page](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx) and its acceptable-use agreement require an owner-approved terms/credential decision; verify observed OData history against official archives after that gate. |
| O-007 | Idaho structured legislative coverage. | Idaho publishes official session pages but no stable documented API, feed, schema, rate policy, or bulk contract was found. Do not disguise HTML scraping as an API. |
| O-008 | Exact official signatories for the Centennial Accord and other accords. | The [Washington Centennial Accord page](https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord) verifies the public accord but does not provide a validated complete signatory list. Treat it as general-jurisdiction/landmark until each Nation link has official evidence. |
| O-009 | Primary online source package for the 1974 Boldt decision. | The official original PDF was not located in this review. Preserve the reporter citation and use the official 1979 U.S. Reports opinion as later primary context; do not substitute unofficial full text or invent Nation associations. |
| O-010 | Court, county, Tribal-government, treaty, compact, and administrative-decision republication rules. | Approve sources individually. Public availability does not by itself authorize bulk reuse or full-text republication. |
| O-011 | Public repository license and exact independent-project attribution language. | `RELEASE-LICENSE` and `G-E-LICENSE` preserve this as a prepublication owner decision. Record the selection before remote creation, preserve ATNI historical attribution, and avoid any endorsement claim. |
| O-012 | Provenance completeness across each future production adapter. | The shared contract now semantically proves that every declared source-derived record leaf has exact provenance and fails closed on omissions. Each production adapter still requires transform-specific provenance fixtures and review. |
| O-013 | Grants.gov pagination, nullability, current-deadline/time-zone semantics, canonical opportunity URL, and reliable history shape. | The [2026-07-31 primary-source review](source-reviews/grants-gov-api-2026-07-31.md) found sample-only REST responses, no formal OpenAPI schema, conflicting request examples, and no documented completeness or stable-pagination guarantee. Resolve these only with bounded live canaries after the owner approves the exact current terms and build-time operation through G-B-GRANTS. |

## Source and authorization blockers

| ID | Blocker | Effect |
| --- | --- | --- |
| B-001 | Oregon OData access is governed by an acceptable-use agreement and credential/non-sharing conditions. | No acceptance, registration, credentials, or live adapter until explicitly approved. Other Oregon official link-based research may continue. |
| B-002 | No stable permitted Idaho legislative machine interface is currently documented. | Mark automation `blocked_source_contract`; show the gap in coverage. A structured official export or documented interface needs later verification and possibly owner-approved contact. |
| B-003 | Congress.gov, GovInfo, Regulations.gov, NARA, and some other interfaces require keys or accounts. | Fixtures and adapter contracts may be designed locally, but no registration or secret setup occurs without source-specific approval. Secrets never enter the client or repository. |
| B-004 | PACER can incur fees and exposes privacy/redaction concerns; third-party court services have separate licenses and limits. | Excluded unless the owner separately approves the source, terms, cost, privacy controls, and authority hierarchy. |
| B-005 | County and Tribal-government sources are heterogeneous and may restrict reuse. | Enable only a reviewed official source with explicit Nation evidence and permitted use. Discovery pages or search results alone are insufficient. |
| B-006 | Remote creation, push, Actions secrets, Pages, and public beta release remain unauthorized during current Phase B local work. | Work remains local until a later explicit remote-operation approval. |
| B-007 | Full-text republication rights may be absent or unclear even for an official public page. | Publish citation, permitted excerpt, and official link only; quarantine content if even that use is unclear. |
| B-008 | Grants.gov documents common API routes as no-auth, but its current terms state that API access or use constitutes acceptance. The published REST pages are sample-only and do not establish several required contract semantics. | No API request, XML-body retrieval, synthetic substitute contract, adapter implementation, or activation until the owner explicitly approves the then-current terms and exact build-time operation through G-B-GRANTS. Treat the blocked adapter as an accepted source block, keep Grants.gov visibly unavailable, and do not make unrelated local work or release acceptance depend on future authorization. |

## Stop/go gates

| Gate | Required approval or evidence | What it authorizes |
| --- | --- | --- |
| G-A | **Approved 2026-07-30.** Owner approves the written Phase A plan. | Begin Phase B local implementation only. It does not authorize any other gate. |
| G-B | Owner explicitly approves the named provider's current terms, API operation, account registration, key, token, or secret workflow. The parent gate remains closed; each source uses a scoped child gate such as `G-B-GRANTS`, `G-B-CONGRESS`, `G-B-GOVINFO`, or `G-B-REGULATIONS`, so approval never spills to another source. | Use only that source and exact approved terms, operation, credential, and local or Actions scope. |
| G-C | Owner explicitly approves the exact current Oregon OData agreement, account action, credential handling, and refresh constraints. | Connect the Oregon OData adapter within that approved scope. |
| G-D | Read-only research validates a stable, permitted, official Idaho structured source requiring no registration, or the owner approves a specific inquiry. | Implement the validated public source locally, or perform only the approved inquiry. If neither path is available, retain the visible gap. |
| G-E | Owner explicitly approves the named remote, push, Pages, workflow, secret, or publication operations. The parent remains closed; `G-E-LICENSE`, `G-E-REMOTE-PUSH`, `G-E-PAGES`, and `G-E-PUBLISH` are independent prepublication gates. | Perform only the exact approved GitHub operation with `gh`; no narrower approval spills into the next operation. |
| G-F | Owner explicitly approves the named third-party, licensed, or paid source, current terms, expected cost, and intended fields. | Use only that approved provider and scope. |
| G-G | A Nation supplies or authorizes specific private material and the owner approves a separate private-deployment control plan. | Implement or activate only that private adapter outside the public build. |
| G-H | Owner approves the model/provider, budget, input set, retention terms, build-only workflow, and review rules. | Generate optional detail summaries only; core operation remains AI-free. |
| G-I | Owner approves the recipient, channel, event, content, and workflow. | Send only that outbound notification. Public-beta alerts remain in-site and in-dossier. |
| G-J | Current primary evidence and tests validate one source's terms, attribution, schema, official status, provenance, health, and coverage behavior. | Enable that source locally. This evidence gate is source-specific and does not authorize an external action. |
| G-RC | Every required local outcome and enabled source passes integrated schema, semantic, provenance, attribution, accessibility, failure, freshness, security, and coverage acceptance. | Mark a local release candidate accepted; it does not publish. |

Gate G-A is satisfied by its recorded approval. The next approval depends on
the exact blocked action: G-B for named provider terms, an API operation,
registration, or secret; G-C for Oregon OData terms; G-D only when Idaho
contact is required; G-E for remote or publication work; G-F for a third-party,
licensed, or paid source; G-G for private material; G-H for optional AI; or G-I
for outbound notification. G-J and G-RC are evidence gates resolved through
validation, not general product questions. None is implied by the Phase B
approval.

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
6. Update and validate `ROADMAP.yaml` whenever implementation status,
   dependencies, evidence, source blocks, or the exact next action changes.
