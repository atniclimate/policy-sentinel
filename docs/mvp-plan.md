# Policy Sentinel MVP implementation plan

Status: Gate A approved; retained B1-B10 contract. The current validated
terminal checkpoint has no active B-series work item.

Last reviewed for product-space governance: 2026-09-02. Source and implementation
evidence retains its recorded date.

This document remains the binding milestone and acceptance contract for the
retained B1-B10 implementation stream.
[`ROADMAP.yaml`](../ROADMAP.yaml) is the canonical ledger for current status,
dependencies, evidence, blockers, and next actions.

The 2026-09-02 product-space rebase makes the PNW/ATNI regional engine the
present product definition of done. B1-B10 identities, evidence, and gates are
preserved and mapped into PNW workstreams in
[`handoffs/pnw-product-space-rebase-2026-09-02.md`](handoffs/pnw-product-space-rebase-2026-09-02.md).
An old item marked complete may be reusable contract, research, implementation,
or accepted-fallback evidence; it does not thereby complete a broader PNW
capability. See [`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md).

## Authority boundary

Phase A ended when the owner approved Gate A on 2026-07-30. Phase B local
implementation may proceed only within this retained B1-B10 plan. That approval
did not itself authorize PNW-01. Later exact owner directives authorized and
completed PNW-01, PNW-03, PNW-04, and the synthetic PNW-05 core. The current
2026-09-03 authorization is a separate additive local real-source prerelease
child lane recorded in `ROADMAP.yaml`; it does not revise this retained B1-B10
acceptance stream or complete any broad PNW parent.

Approval of Phase B authorizes only local implementation described here, use of synthetic fixtures, and read-only access to official public sources that require neither registration nor acceptance of new terms. It does **not** authorize:

- a GitHub remote, push, pull request, Pages deployment, release, or public beta;
- API account or key registration, repository or Actions secrets, or credential changes;
- acceptance of Oregon Legislature terms or another source agreement;
- contact with Idaho officials, a source owner, a Nation, a court, or another third party;
- paid calls, subscriptions, licensed datasets, or browser-side provider use;
- use of private, restricted, Nation-supplied, or land-related material;
- outbound alerts or notifications; or
- optional AI-summary generation.

Each excluded action has its own stop/go gate below. No milestone may treat an unapproved or blocked source as covered.

## Current implementation checkpoint

- B1 is implemented as a local synthetic vertical slice and has passed automated accessibility checks plus desktop and mobile browser verification.
- B2 has a build-time parser for the official 2026 recognition notice that
  independently validates 577 ordered displayed list-entry paragraphs against
  the stated total of 575. After the August 2023 withdrawal of an earlier
  clarification, the current notice provides no row-level reconciliation
  between the displayed paragraphs and the stated total, so the adapter emits
  no Nation registry and B2 identity work is source-blocked.
- B3 is implemented for synthetic records, including compact indexes, separate detail assets, field provenance checks, fail-closed Nation and category rules, source health, artifact hashes, and last-known-good behavior.
- The Federal Register B4 adapter and bounded static artifact are implemented,
  validated, and registered disabled; required built-app browser evidence is
  blocked by the unavailable in-app Browser backend. Grants.gov research is
  complete and its adapter is blocked because API use accepts current provider
  terms and live canaries are required. No production policy records have been
  ingested or published.
- The Washington Governor executive-order and Centennial Accord adapters are
  implemented, tested, and registered disabled. Washington LWS remains a
  synthetic contract without accepted population discovery, and the Washington
  State Register remains a researched source with no adapter.
- The B6 metadata-only landmark contract and one-row Cougar Den pilot are
  implemented and validated while remaining disabled. B7's independent Oregon
  rule and executive review found that statewide access-triggered terms cover
  both OARD and the Governor index; both are registered disabled with no
  adapter. The separate Oregon Legislature OData offline contract now validates
  only repository-owned synthetic logical metadata and entity pages; its source
  is registered disabled with `adapter: null`, and live access remains closed.

## Retained Phase B source order

This order remains the binding B1-B10 source sequence when its exact item and
gate are active. It is not the current executable queue and does not authorize
source access. `ROADMAP.yaml` controls current next actions; the PNW completion
graph and its exact first tranche are separate.

1. BIA annual recognition list for the retained 575-entity United States
   federal-recognition collection; Tribal Leaders Directory only for validated
   public alias/supporting metadata, never contacts, geometry, or legal status.
2. Federal Register for the first no-key federal record adapter.
3. Grants.gov for active and forecast funding discovery only after its current
   access contract and terms are approved and verified. The 2026-07-31 review
   found that API use constitutes terms acceptance, so this source is blocked.
4. Congress.gov with GovInfo verification after their separate source-scoped API-registration gates; credential-free contract fixtures may proceed earlier.
5. Washington Legislative Web Services, followed by Washington State Register and verified Washington accord records.
6. Official federal and state courts plus curated landmark records.
7. Regulations.gov after its separate source-scoped API-key gate; credential-free contract fixtures may proceed earlier.
8. Oregon Legislature OData live access only after the Oregon terms and credential gate; its offline synthetic contract may proceed independently. Keep official Oregon rule and executive sources separately gated.
9. Idaho only after an official stable source contract or approved owner contact resolves the current automation gap.
10. Carefully reviewed administrative decisions, public state/federal intergovernmental agreements, officially published Tribal government documents, and county records.

If a credential or terms gate is not approved, work may proceed to the next ungated source. The coverage matrix must continue to show the skipped source as pending, blocked, or unavailable.

## Milestones and acceptance criteria

### Gate A: approve Phase B local implementation

**Stop:** Closed on 2026-07-30.

**Go:** The owner explicitly approved Phase B under this plan on 2026-07-30.

This is the only approval required to begin local implementation. All later external, credential, publication, paid, and private-data gates remain closed.

### B1: static application and synthetic vertical slice

Build a lean static TypeScript application using only schema-valid synthetic fixtures. Implement the three entry points, single-Nation workflow, taxonomy-driven selection, facets, result cards, on-demand detail assets, Unclassified route, selection, print dossier, and CSV export. Do not create a remote or ingest production records.

Acceptance criteria:

- the production build is a static directory with no server dependency;
- no category or Nation list is hard-coded in UI components;
- all public functions work without AI and no browser LLM call exists;
- the enhanced Nation selector and native fallback work from the same data;
- category and subcategory behavior matches `docs/ux-spec.md`;
- detail assets load separately from the compact result index;
- generated dossier and CSV contain only exact synthetic source fields;
- no telemetry, tracking, outbound notification, map, or land feature exists; and
- unit, fixture, accessibility, end-to-end, build-artifact, and security tests pass.

### B2: Nation registry

Implement a versioned build-time adapter for the current BIA annual recognition list. Produce a validated public Nation registry for the deployment artifact, with stable internal IDs, exact official names, source identifiers where available, source dates, retrieval time, and authorized aliases with their provenance. Reconcile any directory cross-reference or grouping without changing the official total.

Acceptance criteria:

- the enabled collection contains exactly 575 reviewed federal-recognition
  identities for the cited annual list;
- every entry traces to the exact official recognition-list evidence;
- aliases are accepted only from a documented authoritative source and never replace the official name;
- contacts, personal data, addresses not needed for display, maps, coordinates, geometry, parcels, and land fields are discarded;
- no Tribal Leaders Directory row count is treated as the legal recognition count;
- duplicate, cross-reference, renamed, and punctuation cases have reviewed fixtures; and
- an unresolved state-coverage designation produces federal-only behavior rather than an inferred state relationship.

### B3: adapter, artifact, and last-known-good framework

Implement a common build-time adapter boundary for discovery/fetch, source snapshot parsing, normalization, provenance, validation, health reporting, and artifact emission. Keep fetched source bodies and generated data out of Git. Define compact index shards, separate detail assets, a coverage/health manifest, and content hashes.

Acceptance criteria:

- every source-derived field has source ID, evidence URL, retrieval time, source update time when available, and validation state;
- source IDs are namespaced and internal IDs remain stable across unchanged builds;
- official subjects map only through versioned deterministic rules, many-to-many mappings are retained, and every unmapped record is Unclassified;
- Nation associations require source-explicit evidence; county associations fail closed without exact evidence;
- state/federal records lacking an explicit Nation reference are labeled general jurisdiction and not Nation-specific;
- Data.gov is used only to discover an originating official source and is never stored as the final authority when that source exists;
- an opaque or layout-dependent scraper is never the primary production source contract;
- staged source output must pass schema, semantic, count, duplicate, URL, date, and provenance checks before promotion;
- source-health and actual historical-range metadata accompany every shard; and
- build logs and artifacts pass secret and prohibited-field scans.

### B4: federal core sources

Implement Federal Register first. Grants.gov follows only if its current access
contract and terms pass the source-scoped G-B-GRANTS gate; the 2026-07-31
review found that API use constitutes acceptance, so the adapter remains
blocked. Build Congress.gov, GovInfo, and Regulations.gov contracts with
synthetic fixtures, but implement their live adapters only after their separate
scoped Gate B approvals.

Acceptance criteria:

- source-specific validation in the matrix below passes;
- pagination and historical slicing are deterministic and resumable;
- the first public index remains compact and long source language stays in permitted detail assets;
- official source dates and normalized dates remain distinguishable;
- source-provided eligibility or general jurisdiction is not converted into Nation-specific relevance;
- rate-limit, retry, and malformed-response tests do not discard last-known-good data; and
- each source is independently enableable and independently marked degraded.

### B5: Washington coverage

Implement Washington Legislative Web Services as the initial state legislative adapter. Add Washington State Register or executive material only through its own validated official adapter. Curate Centennial Accord and other public state/federal intergovernmental records from official signed or authoritative sources.

Acceptance criteria:

- SOAP/WSDL contract fixtures cover bills, versions, sponsors, committees, actions, status, effective dates, and missing fields;
- the declared legislative history begins at the source's verified range rather than implying coverage back to statehood;
- topical categorization remains Unclassified unless an exact official subject or topic label has an approved deterministic mapping;
- a state record without explicit Nation evidence is visibly general jurisdiction;
- an accord is not attached to all present-day Nations unless an official signatory source supports each link;
- draft, unsigned, superseded, and signed instruments are distinguished; and
- official links, source disclaimer, source health, and actual date ranges are displayed.

### B6: courts, decisions, and landmarks

Add official Supreme Court material, selected GovInfo USCOURTS material after Gate B, DOI IBIA decisions, and official Washington, Oregon, and Idaho appellate sources in validated increments. Curate landmarks under written inclusion criteria; do not substitute commercial summaries for missing official primary text.

Acceptance criteria:

- opinion status distinguishes slip, amended, withdrawn, bound, and final forms where sources expose it;
- court identity, docket, citation, decision date, official URL, and retrieval provenance are preserved;
- source limitations and historical gaps are explicit;
- pre-1980 non-landmarks default to citation-and-link treatment;
- every detailed landmark is a verified treaty, court decision, statute, or public state/federal accord meeting the inclusion criteria, or is identified as foundational by an official source;
- Boldt-related records cite the exact official material available and disclose when the original primary decision is not officially available online; and
- no headnote, staff summary, commercial editorial text, or unofficial copy is presented as the opinion itself.

### B7: Oregon coverage

**Stop:** Do not accept terms, create credentials, or connect to Oregon
Legislature OData without Gate C approval. Do not make another OARD or Oregon
Governor request while `G-B-OR-OARD` or `G-B-OR-GOVERNOR` is closed.

After approval, implement Oregon Legislature OData within its acceptable-use
terms and refresh window. Keep official Oregon rule/executive sources separate.
The [2026-07-31 offline OData review](source-reviews/oregon-odata-offline-contract-2026-07-31.md)
already supplies a credential-free repository contract for logical metadata,
sessions, measures, sponsors, committees, actions, votes, versions, and
statuses. It is not a provider envelope or live adapter and produces no public
record, health, coverage, provenance, or last-known-good data.
The [2026-07-31 non-OData review](source-reviews/oregon-rules-executive-2026-07-31.md)
found that Oregon's statewide terms cover Oregon-operated sites beyond the
`oregon.gov` hostname and make access acceptance. OARD and the Governor index
therefore remain source-specifically blocked; OARD's aggregate executive-order
document is not a record-level substitute.

Acceptance criteria:

- credentials remain build-time only and never enter client code, source maps, fixtures, logs, or artifacts;
- refresh scheduling respects the documented full-refresh window and incremental-use rules;
- electronic acceptance and any account restrictions are recorded;
- source data is labeled nonofficial where the source itself says so and links to the controlling official material;
- historical coverage starts at the verified source-specific date, with older archives represented separately;
- free-text “Relating To” language is not keyword-classified; only exact approved official-label mappings categorize records; and
- personal testimony/contact fields not needed for the product are excluded.

### B8: Idaho source resolution

**Stop:** The current official Idaho legislative site has no verified stable production API, feed, bulk schema, rate policy, or CORS contract. Do not disguise HTML or WordPress scraping as an API.

After Gate D approval, either validate an official structured source supplied by Idaho or make the approved inquiry. If neither occurs, retain a visible Idaho automation gap and link to official sources without claiming record coverage.

Acceptance criteria for any enabled Idaho adapter:

- the source owner, official endpoint, permitted use, schema, update cadence, historical range, and failure behavior are documented;
- sample records match official bill pages and certified source links;
- HTML layout scraping is not the primary production contract;
- official topic labels alone drive taxonomy mappings; and
- a failed source-contract test disables refresh and preserves last-known-good data.

### B9: controlled long-tail sources

Add official administrative decisions, signed public intergovernmental agreements, officially published Tribal government documents, and county records in small, reviewable source sets.

Acceptance criteria:

- every source has an official publisher/domain or a documented designated official host;
- reuse and excerpt terms are reviewed before full text is copied;
- public availability is not treated as permission for unrestricted reproduction;
- Tribal documents are included only when officially published, with source-specific correction/removal handling;
- no private agreement or unauthorized Tribal material enters the public pipeline;
- every county record contains exact official Nation-name evidence and a final/publication-status check;
- agendas, geography, territory, maps, land data, and keywords are never sufficient for Nation association; and
- source registry, coverage range, provenance, and health are visible.

### B10: beta hardening and release candidate

Complete comparison mode only after the single-Nation acceptance suite passes. Exercise weekly and manual refresh paths locally, source degradation, new/changed badges, exact urgent source alerts, print output, CSV output, and responsive/accessibility behavior.

Acceptance criteria:

- all enabled source adapters pass the common and source-specific gates;
- comparison never changes or infers an association basis;
- the site remains fully useful when every AI-summary field is absent;
- no browser request targets an API, LLM, telemetry, analytics, or notification endpoint;
- an artifact inventory proves that no secret, raw corpus, cached API response, generated AI summary, private configuration, personal data, or land-related field is present;
- print dossiers include criteria, generated time, data-as-of time, source list, health, limitations, exact source material, alerts, and disclaimer;
- CSV injection, quoting, encoding, and repeated-field tests pass;
- keyboard, screen-reader smoke, zoom/reflow, focus, contrast, and automated accessibility checks pass; and
- the release candidate is not published until Gate E.

## Source-by-source validation matrix

Every enabled adapter also passes the shared checks for schema validity, field provenance, stable IDs, duplicates, pagination, time zones, URL allowlists, deterministic taxonomy mapping, Nation-evidence rules, actual date-range reporting, permitted excerpts, retry/backoff, and last-known-good behavior.

| Source | Required validation before enablement |
| --- | --- |
| BIA annual recognition list | Match the notice's stated total of 575; reconcile cross-references and name changes; compare exact official names; record publication/effective dates; reject TLD contacts, geometry, and independent recognition claims. |
| Tribal Leaders Directory | Treat as supporting directory data only; verify any alias against an official field and provenance; document update time and row-count differences; exclude contact, address, map, and land fields. |
| Congress.gov | Gate B first; test congress/session boundaries, bill IDs, pagination, sponsors, committees, actions, summaries, subjects, policy areas, and text links against official pages; declare per-field historical ranges; exercise rate headers and 429 behavior. |
| Federal Register | Validate document numbers, types, agencies, publication/effective/comment dates, HTML/PDF links, corrections, withdrawals, conservative date slices below 2,000 results, the currently verified 10,000-result search window, and coverage from 1994; use GovInfo where an official edition is required; do not infer Nation relevance from search terms. |
| GovInfo | Gate B first; validate package/granule IDs, collection-specific ranges, MODS metadata, official formats, checksums where available, pagination, and 503/Retry-After handling; state incomplete USCOURTS coverage and collection-specific gaps. |
| Grants.gov | G-B-GRANTS first because API access or use accepts the current terms. After exact approval, validate opportunity ID/number, title, agency, status, eligibility, opening/closing/archive dates, synopsis, amendments, official URL, pagination, and current-deadline semantics against bounded live canaries; preserve exact eligibility codes as source-defined general eligibility; test 429 handling; include required Grants.gov attribution. |
| Regulations.gov | Gate B first; validate docket/document relationships, agency, subtype, posted/comment dates, status, title, attachments, pagination, rate headers, and mutable fields; document unknown historical completeness; do not ingest public comments in the beta. |
| Washington Legislative Web Services | Validate WSDL/operation contract, biennium boundaries, bill/version identifiers, sponsors, committees, actions, status, documents, effective/veto dates, missing official subjects, SOAP faults, and each required operation's field-specific historical range. Do not extend LegislativeDocumentService/Detailed Legislative Reports 1991 evidence to every LWS operation. |
| Washington State Register and executive sources | Validate issue/order identifiers, publication and effective dates, agency, rulemaking stage, official PDF/HTML links, corrections, and the source-specific range; keep each source's health separate. |
| Washington accords | Validate authoritative text, signing date, parties/signatories, signed/draft status, supersession, official URL, and inclusion basis; do not infer present-day signatories. |
| Oregon Legislature OData | Gates B and C first; contract-test `$metadata`, sessions, measures, sponsors, committees, actions, votes, versions, status and “Relating To” fields; respect refresh restrictions; reconcile samples to OLIS; declare the verified 2007-forward service range separately from older web archives. |
| Oregon rules/executive sources | Validate rule/order identifiers, agency, filing/publication/effective dates, current versus historical status, official text link, archive range, and correction behavior independently from legislative coverage. |
| Idaho Legislature | Gate D first; require a documented official structured contract; validate session boundaries, bill IDs, sponsors, committees, actions, status, text links, topic labels, rate/use rules, and historical range against official pages. If unavailable, publish the gap only. |
| Official courts and administrative decisions | Validate court/body, docket, citation, date, opinion/decision status, supersession, official source, text identity, and exact historical range; label incomplete collections; never substitute headnotes or commercial text. |
| Treaties and landmarks | Validate record type, authoritative identifier/citation, date, official source, written inclusion criterion, reproduction limits, and each Nation association independently; non-landmark pre-1980 records default to link-first presentation. |
| Official Tribal government sources | Review publisher authority and terms per source; validate document identity, publication/status date, official link, correction/removal path, and exact Nation relationship; copy no restricted or non-public material. |
| Official county sources | Validate official publisher, final/public status, record ID, date, exact Nation-name passage and evidence URL; reject geography, agenda-only, keyword-only, inferred, or land-derived matches. |

## Test strategy

### Fixtures and contracts

- Commit only synthetic fixtures and small hand-authored edge cases.
- Keep live responses, raw source corpora, caches, normalized production data, and generated summaries outside Git and out of test reports.
- Maintain valid and invalid fixtures for each schema version, source adapter, relevance basis, category mapping, historical rule, and source-health state.
- Record fixture provenance as synthetic so no fixture can be mistaken for an official record.
- Contract-test source schemas and fail closed on unknown required shapes; additive optional fields may be logged without exposing payloads.

### Unit and semantic tests

- Stable/internal ID generation and source-ID namespace.
- Date parsing, source-date preservation, deadlines, time zones, and pre-1980 behavior.
- Deterministic official-subject mapping, many-to-many membership, and Unclassified fallback.
- Exact Nation evidence, general-jurisdiction labels, landmark criteria, and county fail-closed rules.
- Provenance coverage for every source-derived field.
- Deduplication, status/change comparison, source health, and urgent source badge rules.
- CSV escaping/formula neutralization and print dossier content.
- AI-summary schema rules, citations, label, placement, and em-dash prohibition even when no summary generator is enabled.

### Integration and data-quality tests

- Stage each source independently, validate it, and merge only accepted shards.
- Check counts and material deltas against the previous successful build; require review for thresholds established per source.
- Sample normalized records against official pages across current, historical, amended/corrected, withdrawn, missing-field, and pagination-boundary cases.
- Reject records with broken official-source URLs, unsupported document types, missing critical provenance, invalid category targets, or unsupported Nation links.
- Verify that coverage and health manifests agree with emitted data and that no omitted source is described as current.

### Accessibility and end-to-end tests

- Use browser end-to-end tests for all three entry points, single-Nation selection, native fallback, policy semantics, facets, global search, Unclassified route, details, selection persistence, dossier, CSV, errors, and browser history.
- Run automated accessibility checks at representative routes and widths.
- Manually test keyboard-only operation, visible focus, screen-reader names/status announcements, 200% zoom, reflow, reduced motion, print preview, and no hover-only controls.
- Enable comparison tests only after the single-Nation suite is green.

### Security, privacy, and artifact tests

- Scan tracked files, logs, source maps, and final artifacts for keys, tokens, credentials, private endpoints, `.env` content, personal data, raw responses, hidden caches, generated AI summaries, and prohibited land fields.
- Inspect the built application's network behavior; only same-origin static public assets and deliberate official-source link navigation are allowed.
- Assert no analytics, telemetry, tracking pixel, service-worker transmission, browser API call, LLM call, or outbound notification path.
- Verify all external links use safe behavior and all rendered source text is escaped or sanitized.
- Keep dependency count lean; run lockfile, license, and vulnerability review before the release gate.

## Weekly refresh and last-known-good behavior

The eventual approved workflow runs weekly and supports manual `workflow_dispatch`. Each source refresh is isolated:

1. Retrieve into ephemeral staging.
2. Normalize and validate schema, semantics, provenance, counts, health, and source terms.
3. Compare with the prior successful public manifest to determine new and changed records.
4. Promote the source shard only if all source gates pass.
5. If retrieval or validation fails, reuse that source's prior validated public shard and retain its original data-as-of time.
6. Mark the source degraded, name the failure class without leaking payloads or secrets, and show last success and freshness.
7. If no last-known-good shard exists, omit that source's records and mark it unavailable.
8. If the overall artifact, coverage manifest, secret scan, or cross-source integrity check fails, do not deploy; the currently published artifact remains live.

A failed attempt never advances a source's data-as-of timestamp. The workflow emits health metadata and build diagnostics, but sends no email, text, Slack, webhook, or other outbound alert.

## Stop/go gates

| Gate | Stop condition | Approval needed for go |
| --- | --- | --- |
| A: Phase B | Phase A plan not approved | Owner explicitly approves Phase B local implementation under this plan. |
| B: API terms, registration, and secrets | A source requires terms acceptance, an account, API key, token, secret, or repository/Actions secret | Owner explicitly approves the named current terms, operation, registration, and credential placement that apply. Approval is per source through a scoped gate such as `G-B-GRANTS`, `G-B-CONGRESS`, `G-B-GOVINFO`, or `G-B-REGULATIONS`; it never spills to another source. Use `gh` for later GitHub secret operations. |
| B-OR: Oregon statewide website terms | OARD or the Oregon Governor index requires accepting statewide access terms | Owner explicitly approves the exact current terms and named build-time operation through `G-B-OR-OARD` or `G-B-OR-GOVERNOR`. Approval does not spill between those sources or into OData. |
| C: Oregon terms | OData requires acceptance, credentials, or nonsharing/use commitments | Owner approves the exact current agreement and account action after terms are presented. |
| D: Idaho source/contact | No stable official structured source has been verified | Read-only research may satisfy the gate by validating a stable, permitted, official no-registration source. If contact is required, the owner must approve the specific inquiry; no contact occurs before approval. Otherwise retain the visible gap. |
| E: remote and Pages | Work would select the public license, create a remote, push, enable Pages, publish an artifact, create a release, or alter GitHub settings | Owner approves the exact scoped step. `G-E-LICENSE`, `G-E-REMOTE-PUSH`, `G-E-PAGES`, and `G-E-PUBLISH` remain independent; all GitHub operations use `gh`. |
| F: third-party, licensed, or paid service | A source/provider is nonofficial, has material reuse limits, requires membership/payment, or would incur a charge | Owner approves the named provider, terms, expected cost, and intended fields before access. |
| G: private or Nation-supplied material | Material is non-public, restricted, Nation-supplied, land-related, or intended for a private deployment | The supplying or authorizing Tribe and owner explicitly authorize the exact private deployment and handling plan. It never enters the public repository or artifact. |
| H: optional AI | Summary generation needs a model/provider, credentials, cost, or input transmission | Owner approves the provider/model, budget, input set, retention terms, build-only workflow, and review rules. AI remains optional. |
| I: outbound notification | A workflow would message any person or service | Owner approves the recipient, channel, event, content, and workflow. Public beta alerts remain in-site and in-dossier only. |
| J: source/reuse validation | Current primary evidence and tests have not yet validated a source's terms, attribution, schema, official status, provenance, health, and coverage behavior | Satisfy this evidence gate independently before enabling each source. A material terms, schema, endpoint, attribution, or official-status change returns the source to pending, pauses that adapter, preserves last-known-good data, and requires owner/legal direction only when the new term creates an external obligation. |

## Definition of retained application-stream implementation complete

The retained application stream is implementation-complete only when the
approved source set, static application, schema/data validation, source health,
coverage disclosures, single-Nation workflow, advanced comparison, timeline,
detail assets, print dossier, CSV export, accessibility, security, and
last-known-good behavior meet their acceptance criteria. That state is evidence
for, but not equivalent to, PNW regional-engine completion.

Implementation-complete does not mean published. A folder, plan, passing fixture build, or local release candidate is not a public beta. Remote creation, push, Pages enablement, and publication remain behind Gate E.
