# Makah demo launch prompt: groundwork, bounded data retrieval and research scouts

Prepared 2026-09-15 for the next Claude Code session running Claude Fable 5.1 at
high effort. Research baseline: `main` at the commit containing this file and
`docs/makah-demo/`. This document is a prepared launch packet. It becomes
execution authority only when the owner launches the session with it and
states any allowlist below. Until then its scope is proposed, not adopted.

Status on preparation: `docs/makah-demo/00-llm-usage-manifest.yaml`,
`01-current-functionality-and-gis-boundary.yaml`,
`02-parcel-jurisdiction-and-citation-export.yaml` and
`schemas/makah-demo-doc.schema.v1.json` exist and validate. They establish the
baseline this launch builds on: no real geometry intake, no parcel model, no
Clallam/Jefferson county source, no NGO/foundation funding source, and no
agency office/address/phone fields exist today. `ROADMAP.yaml`
`current_focus.work_item` is `null`.

## Decision requested

Launch the bounded scope below under
`MAKAH_DEMO_01_GROUNDWORK_DATA_DISCOVERY_AND_SCOUTS`. Launching permits:

- local contract, fixture, test and documentation work for the three
  capabilities in `docs/makah-demo/` (private land-boundary intake, parcel
  jurisdiction layering, citation/agency-metadata export), all synthetic in Git;
- read-only public research by task-assigned scouts, producing feasibility
  and evidence reports in the proposed paths;
- bounded source discovery for the Makah / Clallam / Jefferson / Washington /
  federal scope, shaped as source reviews and a candidate allowlist for a
  later exact acquisition decision;
- one new `ROADMAP.yaml` work item, one proposed decision-register entry, and
  local commits of the listed paths.

Launching does not authorize: any GET against a source not in an owner-stated
allowlist; Grants.gov API use (gate `G-B-GRANTS`, terms acceptance); real
geometry, parcel, ownership, trust/fee or land data in Git or any public
artifact; a Nation association without exact official-record evidence; personal
contact data; a remote, push, Pages, credential, paid call, third-party
contact, private material, optional AI generation or notification. Every
closed gate in `AGENTS.md` stays closed. The owner may state an exact URL
allowlist at launch; absent one, every source operation in this packet is
zero-request and stops at the review artifact.

## Reading order at session start

1. `AGENTS.md` fully; then the durable rules in `docs/PROJECT-BACKBONE.md`,
   especially the authority order.
2. `ROADMAP.yaml` completely. Confirm `current_focus.work_item` is still
   `null` before adding the work item in this packet. If it is not, stop and
   report; do not create a second active item.
3. `docs/makah-demo/00-llm-usage-manifest.yaml`, then `01-…`, then `02-…`.
   Honor their `nonClaims`, `authorizes: []` and `illustrative_only_not_adopted`
   markers exactly as the manifest instructs.
4. `docs/decision-register.md` (D-010 and the Grants.gov entries O-013/B-008),
   `docs/source-feasibility.md` (evaluation rules and matrix columns),
   `docs/development/AGENT-AND-TOOL-OPERATING-MODEL.md` (leases, read-only
   start, stop contract), `docs/architecture.md` (private extension boundary,
   `AuthorizedPrivateContextAdapter`, `OutputAdapter<T>`), and
   `docs/data-contract.md` (schema-change discipline).
5. `docs/source-reviews/boldt-decision-2026-07-31.md` and
   `docs/15B-CASE-EXAMPLE-01-LUMMI-POINT-ROBERTS-BROADBAND.md` as the existing
   examples of a documented source gap and a case example, respectively.
6. `docs/development/ps09-real-policy-systems-research-2026-09-05.md` header,
   as the house pattern for a research report produced by subagents.

Then reconcile Git status, worktrees, staged paths and the protected owner
inputs before any write. Run `npm run validate:runtime`,
`npm run validate:roadmap` and `npm run validate:backbone` before mutation.

## Authority and boundaries the whole session must hold

- Geography, parcel data, keywords, maps, agent reports and model output never
  become identity, membership, Nation association, jurisdiction, applicability,
  rights impact, land status or source activation. A polygon may only narrow a
  query; the exact-evidence rule still decides what is shown and why.
- D-010 governs. Real boundary or parcel data, including public Census
  TIGER/Line AIANNH or county GIS layers, lives only in an owner-owned external
  private root and only if the owner supplies or approves it. It is never
  committed, never enters `dist/`, and is served only through the existing
  explicit local `127.0.0.1` profile. Executable fixtures use unmistakably
  synthetic geometry and `.invalid` citations.
- A county record is eligible only when the official county record itself
  names the Nation. State and federal records without exact Nation evidence
  are `general_jurisdiction`.
- Agency contact fields are agency-level, officially published, and
  non-personal: an office's public line or public mailing address, never a
  named individual, direct line or email. Until the proposed decision-register
  entry is adopted, these fields exist only in fixtures and the export schema
  draft, never populated from a real source.
- No source is qualified, admitted, activated or acquired by a scout report,
  passing test, schema or roadmap entry. Those remain separate later states.
- Subagent findings are review input, not authority or completion evidence.
  The lead reconciles every claim against the cited path or URL before it
  enters a committed document.

## Track A: implementation groundwork (synthetic, local)

Goal: turn the two illustrative sketches into reviewable, versioned, tested
contracts without admitting real data. Do this after the interface freeze and
before any specialist write lease.

A1. `schemas/land-boundary.schema.v1.json` (new). A private-only boundary
    contract: `boundaryId`, `crs` (EPSG string), `geometryRef` (opaque
    reference to an external private object, never inline coordinates in a
    public-boundary object), `sensitivity` (`public|internal|restricted|privileged`,
    Tribal-supplied defaults to `restricted`), `sourceEvidence`,
    `nonClaims` (fixed), and a `deploymentProfile` that must equal `private`.
    Reject inline coordinates when `sensitivity` is not `public`; reject the
    record schema's protected keys anywhere inside. Do not widen S0's frozen
    `axis_aligned_integer_box_v1`; this is a separate contract.

A2. `schemas/land-parcel.schema.v1.json` (new). The `LandParcel` sketch from
    `docs/makah-demo/02-…` made strict: `parcelId` (opaque, not a bare APN),
    `landStatusTypes` (array, the enum in the sketch plus `unknown`),
    `landStatusEvidence[]`, `jurisdictionLayers[]` (ordered, non-exclusive:
    `level`, `authorityName`, `evidenceUrl`, `evidenceDate`),
    `boundaryRef` (nullable reference to A1), `sensitivity`, `nonClaims`.
    Never a single winning jurisdiction field.

A3. `schemas/citation-export.schema.v1.json` (new). The `citationExport`
    sketch made strict, reusing `fieldProvenance` from
    `schemas/record.schema.v1.json` by `$ref` where possible. `issuingAuthority`
    gains `administrativeOffice`, `publicAddress`, `publicPhone`, each
    requiring its own `fieldProvenance` entry and each carrying
    `contactScope: agency_public_only`. Add `scope` (`parcelId` or
    `jurisdictionLayers` plus `asOf`) and the fixed `nonClaims`.

A4. Pure engine contracts in `src/engine/` mirroring the existing
    `identity-authority-scenarios-contracts.ts` pattern: types, strict
    validation, deterministic serialization, no I/O. A `resolveParcelQuery`
    function that maps `jurisdictionLayers` to the existing `PolicyRecord`
    filters (`jurisdiction`, `nationAssociations`, `officialSubjects`,
    `taxonomyMemberships`), unions across layers, and returns a per-record
    `whyAssociated` basis pointing at the exact layer and `evidenceUrl`. It
    must never emit an applicability statement.

A5. Private adapter interface only: `src/engine/authorized-private-context-adapter.ts`
    declaring `assertDeploymentIsPrivate`, `verifyWrittenAuthorization`,
    `connectLocally`, `enrichPrivateView` as typed contracts with a
    synthetic in-memory implementation used only by tests. No file, network
    or shapefile parsing dependency is added. A `.shp/.dbf/.prj` or GeoJSON
    build-time ingestion step is documented as a follow-on in the handoff, not
    implemented, unless the owner adds a dependency approval at launch.

A6. Fixtures and tests under `fixtures/engine/` and `tests/engine/`:
    valid synthetic, malformed, and non-interference cases. Required negative
    cases: inline real-looking coordinates rejected at the public boundary;
    a parcel with only a county layer cannot produce a Nation association;
    two layers never collapse to one; `publicPhone` without provenance is
    rejected; a personal-looking contact value (name-shaped, direct-line
    labeled) is rejected; the ordinary synthetic artifact build is byte-identical
    before and after these modules exist.

A7. Documentation: `docs/data-contract.md` and `docs/architecture.md`
    additive rows; a proposed decision-register entry (see Track D); the new
    roadmap work item; and the terminal handoff.

## Track B: bounded source discovery for the demo scope

Goal: produce source reviews and a candidate allowlist, not a corpus. Zero
requests unless the owner states an allowlist at launch. Each review is a
dated `docs/source-reviews/<slug>-2026-09-<dd>.md` using the eight
`docs/source-feasibility.md` columns plus: originating authority, exact
landing URL, access date, whether it names the Makah Tribe in the official
record, excerpt/reproduction terms, and what would be captured versus refused.

Candidate families to review, each as a separate slug, none pre-approved:

- Makah Tribe official publications: Tribal Council resolutions, codes and
  ordinances, and comprehensive/hazard plans that the Tribe itself publishes.
  Only officially published Tribal government documents are eligible; nothing
  unpublished, ceremonial, or sensitive.
- Clallam County and Jefferson County: code, comprehensive plan, shoreline
  master program, hazard mitigation plan, and commissioner records, each
  eligible only where the official county record names the Makah Tribe.
- Washington State: the four already-configured but disabled sources
  (register, governor executive orders, Centennial Accord, Legislative Web
  Services) plus GOIA consultation material, RCW 43.376 and the Growth
  Management Act consultation provisions, and Ecology/DNR/WDFW actions that
  name the Makah Tribe. Reuse the existing disabled contracts; do not create a
  duplicate registry entry.
- Federal: Federal Register documents naming the Makah Tribe or the Olympic
  Coast National Marine Sanctuary; NOAA Fisheries actions on the Makah
  whaling waiver; BIA Northwest Region and Puget Sound Agency notices;
  Olympic National Park/ONF actions; USACE Seattle District actions naming the
  Makah Tribe. `federal-register` already has an implemented, disabled
  adapter and a closed prerelease lifecycle; do not reopen FR-A1 or any spent
  identifier.
- Public boundary reference sources, review only: Census TIGER/Line AIANNH,
  BIA Land Area Representations, county parcel/GIS portals, WA DNR. Record
  terms and format. Any download is a separate owner decision and lands only
  in the private root.

Every review ends with a `Priority and status` value and names its gate. A
review may conclude `gap` or `refused`; that is a valid outcome.

## Track C: task-assigned research scouts

Scouts are task-assigned read-only roles under the operating model, not
installed roles. Dispatch all four in one message so they run in parallel.
Each receives this section, the boundaries above, and its own brief; none
receives a write lease. Each returns one bounded report (target under 1,500
words) that the lead reconciles before anything is committed. Use the
`general-purpose` agent type with `WebSearch`/`WebFetch` and read-only repo
tools, at the model assigned in "Subagent model and effort assignments"
below; the Brave search MCP is acceptable for discovery, but every retained
citation must resolve to an originating or official URL, not a search
snippet.

Common report shape (every scout, every item):

```
- title: exact official title
  issuer: originating body (agency, court, legislature, county, Nation, foundation)
  identifier: docket / citation / bill / rule / program number, or "none stated"
  url: originating URL
  accessed: YYYY-MM-DD
  date_of_record: YYYY-MM-DD or "unknown"
  names_makah_explicitly: yes | no | unknown
  jurisdiction_level: federal | state | county | tribal | ngo | unknown
  terms_or_reproduction: what the source states, or "not located"
  relevance_basis: one sentence, phrased as an observation, never as applicability
  evidence_status: observed_at_url | secondary_only | not_located
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]
```

Items with `evidence_status: secondary_only` may be listed but must be
flagged and cannot enter a source review as an observation.

C1. Funding scout: NGO, foundation and intermediary funding. Distinct from the
    closed Grants.gov review; do not re-review Grants.gov or touch its API.
    Look for currently open or recurring programs from private foundations,
    Native-led intermediaries and regional funders relevant to Tribal policy
    monitoring, climate resilience, treaty resource management, legal capacity
    and civic technology in the PNW. Candidate starting points, all unverified
    and to be confirmed at their own official pages: Potlatch Fund, Northwest
    Area Foundation, First Nations Development Institute, NDN Collective,
    Native Americans in Philanthropy, Seventh Generation Fund, Wilburforce
    Foundation, Bullitt Foundation successor programs, Kresge Environment,
    Kellogg Foundation. Record program name, eligibility as stated, deadline
    or cadence, amount range as stated, and the official program URL. Output
    a proposed `docs/source-feasibility.md` row per viable family and a
    `docs/development/makah-demo/scout-funding-2026-09-<dd>.md` report. This
    scout finds opportunities; it never applies, registers, contacts or
    accepts terms.

C2. Legal and historical precedent scout: jurisprudence and instruments that
    bear on the Makah Tribe, the Olympic Peninsula and Clallam/Jefferson
    County. Candidate targets, to be confirmed at official reporters or court
    sites: the Treaty of Neah Bay (1855); United States v. Washington (Boldt,
    1974) and its subproceedings including the culvert case affirmed in 2018;
    Makah Indian Tribe v. Quileute Indian Tribe (9th Cir. 2017) on usual and
    accustomed grounds; Anderson v. Evans (9th Cir. 2002) and the later NOAA
    MMPA waiver decision on Makah whaling; Washington v. Washington State
    Commercial Passenger Fishing Vessel Ass'n (1979); relevant Ninth Circuit
    and Western District of Washington decisions naming the Makah Tribe.
    Prefer official court sites, GovInfo, and the reporter of record; law-review
    or encyclopedia summaries are `secondary_only`. Preserve the existing Boldt
    source-gap finding; do not relabel it resolved without an originating copy.
    Output `docs/development/makah-demo/scout-legal-precedent-2026-09-<dd>.md`.

C3. Regulatory and legislative scout: current and recent regulatory and
    legislative material naming the Makah Tribe or its geography. Candidate
    targets: Federal Register documents (Olympic Coast National Marine
    Sanctuary, NOAA Fisheries, BIA, USFWS, ONP); Washington bills and session
    laws on Tribal consultation, GMA, shoreline, and hazard planning; WAC and
    RCW provisions; Clallam and Jefferson County ordinances and resolutions
    that name the Makah Tribe; Centennial Accord agreements. Use the existing
    disabled Washington contracts and the Federal Register review as the
    starting map so the report extends rather than duplicates them. Output
    `docs/development/makah-demo/scout-regulatory-legislative-2026-09-<dd>.md`.

C4. Sovereignty adversarial reviewer (read-only, finite findings): reviews
    C1-C3 reports and the Track A schema drafts for any sentence that turns an
    observation into identity, membership, association, jurisdiction, rights,
    land status, consent, or applicability; any personal contact or sensitive
    land content; any unverifiable citation; and any place a candidate label
    entered a field reserved for accepted identity. Returns findings only;
    the lead repairs. Mirror the installed `sovereignty_adversarial_reviewer`
    boundaries: cannot authorize source access, accept terms, decide a gate or
    prove coverage.

## Track D: ledger, decision and handoff

D1. Add one `ROADMAP.yaml` work item with the existing field set (`id`,
    `priority`, `milestone`, `title`, `status`, `dependencies`,
    `authorization_gate`, `blocked_by`, `safe_fallback`, `unblocks_only_when`,
    `acceptance`, `evidence`): id `MAKAH-DEMO-01-GROUNDWORK-DISCOVERY-SCOUTS`,
    status `in_progress` on launch, gate `G-MAKAH-DEMO-01`, and set
    `current_focus.work_item` to it. Keep exactly one active item. Do not
    alter any PS09 item, gate, or the `PS09-06-LOCAL-RC` release root. Run
    `npm run validate:roadmap` before committing.

D2. Propose, do not adopt, a decision-register entry in the register's own
    two-column shape: `D-<next>` covering agency-level public contact fields
    (permitted: office name, published public address and phone with
    provenance; forbidden: any individual's name, direct line, email) and the
    private-only status of land-boundary and parcel contracts as a
    D-010-consistent extension. Mark it `proposed` in prose; the owner adopts.

D3. Add a row for this launch in `docs/PROJECT-BACKBONE.md`'s responsibility
    map only on adoption, with a boundary column stating what it does not
    authorize.

D4. Terminal handoff at `docs/handoffs/makah-demo-01-groundwork-outcome.md`:
    exact start/end commits, paths written, tests run with real outcomes,
    scout report locations, reconciled versus rejected findings, source
    reviews produced with their gates, the candidate allowlist proposed for a
    later exact acquisition decision, and every gate that remains closed.

## Proposed paths and leases

Listing a path grants no present write lease; the lead assigns disjoint
leases after the interface freeze. No path outside this list may be added
silently; a needed unlisted path stops the session for an owner decision.

| Responsibility | Proposed exact paths |
| --- | --- |
| Lead: authority, ledger, handoff | `ROADMAP.yaml`, `docs/decision-register.md`, `docs/PROJECT-BACKBONE.md`, `docs/handoffs/makah-demo-01-groundwork-outcome.md`, `docs/makah-demo/00-llm-usage-manifest.yaml` (add `related_launch_prompt` and outcome pointers only) |
| Lead: versioned interfaces | `schemas/land-boundary.schema.v1.json`, `schemas/land-parcel.schema.v1.json`, `schemas/citation-export.schema.v1.json`, `src/engine/index.ts`, `scripts/validate-foundation.mjs`, `docs/data-contract.md`, `docs/architecture.md` |
| Runtime worker after freeze | `src/engine/land-boundary-contracts.ts`, `src/engine/land-parcel-contracts.ts`, `src/engine/citation-export-contracts.ts`, `src/engine/parcel-query.ts`, `src/engine/authorized-private-context-adapter.ts` |
| Fixture/test worker after freeze | `fixtures/engine/land-boundary.synthetic.valid.json`, `fixtures/engine/land-boundary-malformed.invalid.json`, `fixtures/engine/land-parcel.synthetic.valid.json`, `fixtures/engine/land-parcel-malformed.invalid.json`, `fixtures/engine/citation-export.synthetic.valid.json`, `tests/engine/land-boundary.test.ts`, `tests/engine/land-parcel.test.ts`, `tests/engine/citation-export.test.ts`, `tests/engine/parcel-query.test.ts`, `tests/engine/makah-demo-non-interference.test.ts` |
| Source discovery (Track B) | `docs/source-reviews/makah-tribe-official-publications-2026-09-<dd>.md`, `docs/source-reviews/clallam-county-2026-09-<dd>.md`, `docs/source-reviews/jefferson-county-2026-09-<dd>.md`, `docs/source-reviews/olympic-peninsula-federal-actions-2026-09-<dd>.md`, `docs/source-reviews/public-boundary-reference-sources-2026-09-<dd>.md`, additive rows in `docs/source-feasibility.md` and `docs/source-coverage.md` |
| Scouts (read-only; lead writes reconciled reports) | `docs/development/makah-demo/scout-funding-2026-09-<dd>.md`, `docs/development/makah-demo/scout-legal-precedent-2026-09-<dd>.md`, `docs/development/makah-demo/scout-regulatory-legislative-2026-09-<dd>.md`, `docs/development/makah-demo/sovereignty-review-2026-09-<dd>.md` |

Frozen K0/S0/O0 contracts, `schemas/geography-rights.schema.v1.json`,
`config/sources.v1.json` (no new registry entry this run), the taxonomy, the
corpus pipeline, the application, artifact schemas, `package.json`
dependencies and the command surface stay outside the write scope unless the
owner adds one at launch.

## Tests and acceptance

The session is complete for Track A only when all of the following hold with
real command output recorded in the handoff:

1. Strict schema compilation for the three new schemas; closed keys; exact
   `$ref` reuse of `fieldProvenance`; schema/runtime agreement; deterministic
   serialization.
2. Public-boundary rejection of inline coordinates for non-public
   sensitivity, of protected record keys, of personal-shaped contact values,
   and of any contact field lacking provenance.
3. `resolveParcelQuery` unions layers, never intersects to one, and every
   result carries a `whyAssociated` with an exact layer and `evidenceUrl`; a
   county-only layer yields no Nation association.
4. Non-interference: the ordinary synthetic build's artifact hashes are
   unchanged; no new module is imported by the application or artifact
   builder; no I/O, provider or model call occurs in the new modules.
5. `npm run check` passes, including format, lint, typecheck, roadmap,
   backbone, source scan, unit and accessibility tests, build and artifact
   validation.

Focused commands during editing:

```powershell
npm run test:unit -- tests/engine/land-boundary.test.ts tests/engine/land-parcel.test.ts tests/engine/citation-export.test.ts tests/engine/parcel-query.test.ts tests/engine/makah-demo-non-interference.test.ts
npm run validate:roadmap
npm run validate:backbone
npm run check
```

Tracks B and C are complete when every planned review and scout report exists
with its access dates, every retained item has an originating URL or an
explicit `not_located`, the sovereignty review's findings are repaired or
recorded as open, and no item was promoted past `reviewed`.

## Subagent model and effort assignments

The lead runs Fable 5.1 at high effort for the whole session. Every other
role is tuned to the cheapest model that holds its quality bar; the lead
re-checks every kept citation and owns every write, so a scout's model is a
cost decision, not an evidence decision. Pass `model` per `Agent` call.
Effort for a subagent comes from its agent definition and cannot be set per
call; the defaults below are acceptable, and an owner who wants lower-effort
scouts may add a project agent definition with `model: sonnet` and a medium
effort rather than overriding it in the prompt.

| Role | Agent type | Model | Why |
| --- | --- | --- | --- |
| Lead (interfaces, reconciliation, ledger, handoff) | session | Fable 5.1, high | Judgment-heavy: interface freeze, non-claim discipline, gate boundaries |
| C1 funding scout | `general-purpose` | `sonnet` | Search-and-report against official program pages; precision over depth |
| C2 legal precedent scout | `general-purpose` | `sonnet` | Same; the official-versus-secondary distinction is a rule in its brief, not a reasoning task |
| C3 regulatory/legislative scout | `general-purpose` | `sonnet` | Same; extends existing disabled contracts rather than designing |
| C4 sovereignty adversarial reviewer | `general-purpose`, read-only tools | `fable` (inherit) | Finds the sentence that turns an observation into a determination; needs the lead's model |
| Track A runtime worker (after freeze) | `general-purpose` | `sonnet` | Implements against a frozen interface mirroring an existing pattern |
| Track A fixture/test worker (after freeze) | `general-purpose` | `sonnet` | Mechanical once the negative-case list above is fixed |
| Path/symbol lookups during reconciliation | `Explore` | `haiku` | Single targeted lookups only; never for review or analysis |

Do not use `opus` or `fable` for a scout to "be safe"; the safety comes from
the lead's reconciliation step and the C4 review, both already on Fable. Do
not use `haiku` for anything that produces a citation or a fixture.

## Fable 5.1 execution guidance

- Plan first, in the ledger: write the roadmap item and the lease table before
  any schema byte. Freeze the three schema interfaces before dispatching
  runtime or fixture work.
- Dispatch the four scouts in a single message so they run concurrently, each
  with a self-contained brief (they have no session context). Give each the
  report shape verbatim and a word ceiling. Do not read their transcripts;
  read only the returned report.
- Reconcile before recording. For every scout item you keep, open the cited
  URL or path yourself. A scout summary is not evidence; a snippet is not an
  observation.
- Keep context small: prefer focused tests over full `npm run check` until the
  end; write intermediate notes into the proposed report files, not into the
  conversation; recover from `ROADMAP.yaml` and Git after any compaction,
  never from remembered chat.
- Verify before claiming. No "complete", "passing" or "validated" without the
  command and its actual output in the handoff. Preserve failures and skips
  with their scope.
- Prefer stopping to guessing. Missing evidence, a needed unlisted path, an
  ambiguous owner boundary, or a real-data question all end the affected claim
  with a recorded reason; unrelated authorized work continues.
- Never resolve a failing test by weakening it, changing a fixture to pass, or
  accepting an agent's assertion.

## Stop contract

Stop the session before: any request to a URL not on an owner-stated
allowlist; committing or building any real geometry, parcel, ownership or
land-status data; writing any personal contact value; asserting a Nation
association, jurisdiction, land status, rights impact or applicability;
changing a PS09 gate or the release root; adding a dependency; an unlisted
path write; or any remote, publication, credential, paid, contact, private-
data, AI-generation or notification action. Record the reason and the exact
next owner decision needed.

## Terminal dispositions

Use exactly one of the following in the outcome handoff, followed by what
remains open:

- `MAKAH_DEMO_01_GROUNDWORK_VALIDATED_SCOUTS_RECONCILED_ACQUISITION_GATED`
- `MAKAH_DEMO_01_GROUNDWORK_PARTIAL_REPAIR_REQUIRED`
- `MAKAH_DEMO_01_OWNER_ALLOWLIST_OR_SCOPE_DECISION_REQUIRED`
- `MAKAH_DEMO_01_STOPPED_BEFORE_UNAUTHORIZED_OPERATION`

None of these authorizes acquisition, source activation, a private
deployment, publication or a successor run. The next owner action after a
validated outcome is an exact acquisition allowlist and a decision on the
proposed decision-register entry.

Terminal disposition of this preparation:
`MAKAH_DEMO_01_LAUNCH_PROMPT_PREPARED_AWAITING_OWNER_LAUNCH`.
