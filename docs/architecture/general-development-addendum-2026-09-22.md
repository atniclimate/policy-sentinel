# General development addendum (2026-09-22)

Status: owner-directed design addendum to
`docs/architecture/module-boundaries.md`, written after the rulings in
`docs/decisions/2026-09-22-realignment-rulings.md`. It extends that design.
Where the two disagree, this addendum governs, and GD-15 folds it into the
architecture documents. Like the design it extends, it changes no code and
authorizes nothing by itself; the ledger does.

Section numbers in this file are its own. "Design section n" refers to
`module-boundaries.md`.

## 1. What changed since the design was written

| Change | Ruling | Effect on the design |
| --- | --- | --- |
| Private context is a user-supplied, first-class module | RL-04 | The private-context seam (design section 2, "outside every module") becomes Module 4 (section 2 below) |
| The area resolver is a core component | RL-06 | New component in Module 4 (section 3); PolicyContext replaces the prose of `policy.search-context/1` (section 4) |
| Ceded-territory and U&A boundaries are T0 designations | RL-08 | Designation registry (section 5) |
| Standalone Nation registry | RL-07 | Registry binding (section 6); the tribal `JurisdictionRef` kind is bound to it |
| Storage budget of about 50 GB, reference-first | RL-09 | Holding policy (section 8) |
| Tribal law only as user-supplied data | RL-10 | Survey scope (section 7) |
| Canadian First Nations reserved, not wired | RL-11 | Registry and `JurisdictionRef` reservations (section 6) |
| Ledger admits general development by rule | RL-01 | Schema 1.10 design (section 10) |

## 2. Module 4: private context (user-supplied)

**Purpose.** Everything a deployment processes that is not public: land
context (parcels, boundaries, land status, ownership) and private policy
corpora (a Nation's own codes, commercial or contractual policies). All of it
is supplied by the user of that deployment. The module exists so that "bring
your own data" is a supported path of the same engine, not a separate fork.

**Membership (in place).** `src/engine/land-boundary-contracts.ts`,
`land-parcel-contracts.ts`, `parcel-query.ts`,
`authorized-private-context-adapter.ts`, `citation-export-contracts.ts`, their
schemas under `schemas/`, fixtures under `fixtures/engine/` and tests under
`tests/engine/`. New code goes under `src/modules/private/`. The manifest
written in GD-02 classifies these as module `private` from the start.

| Contract | Definition |
| --- | --- |
| Accepts | User-supplied geometry files (section 3); user-supplied land attributes; user-supplied policy documents as a `user_supplied` source class into the deployment's private custody namespace (same immutable-object and receipt model as v2 custody, no network transport); the user's declared Nation. |
| Emits | A `PolicyContext` (section 4) for local resolution; private associations (record to parcel, record to private designation) that live only in the private namespace; private citations and dossiers written only to the deployment's own output location. |
| Must never | Be reachable from the public application entry or the public artifact build; write to the public artifact; send anything off the deployment; log queries or areas; infer a Nation from geometry; retain geometry outside the private namespace. |

**Dependency rule (replaces design section 2, rule 5).**

1. `private` imports `core`, `context` (identifier types and pure relevance
   functions) and `private`.
2. `output/local` (the local workbench, dossier and export paths) may import
   `private`.
3. `output/public` (the public application and the synthetic artifact build)
   may not import `private`, `src/engine/index.ts` (the barrel re-exports the
   seam) or any file under `src/modules/private/`.
4. The interop sender may import `private` only to build a `PolicyContext`
   whose `sensitivity.derivedFromPrivate` is `true`; the interop adapter
   refuses to transmit such a context off the deployment (section 4).

**Public-entry reachability test (added to GD-02).** From
`src/main.tsx` and `scripts/build-synthetic-artifact.mjs`, every file in
module `private` must be unreachable through the import graph. The test starts
in enforcing mode for this rule even while the general boundary test is in
report mode, because this rule is the proof that replaces "absence" (the
earlier design kept the seam out of the engine so the engine was free of land
handling by absence; with Module 4 inside, the reachability test and the
boundary guard are the proof).

**Data rules restated for the module.** No private data in the repository,
fixtures included (synthetic only); no private data in `dist/` or any Pages
artifact; no telemetry; the boundary guard (GD-04) runs at every module entry
so that private keys never cross into `core`, `context` or `output/public`
values.

## 3. Area resolver (Module 4 component)

**What it answers.** "What policies apply to this area, and why?" The answer
has four layers with different sensitivity:

1. Jurisdictions that contain or overlap the area (federal always; state;
   county; municipality; the user's Nation). Public boundaries.
2. Designations that overlay the area (flood hazard, critical habitat,
   wetlands, coastal zone, federal land units, wild and scenic corridors,
   ceded territory, usual and accustomed areas). Public geometry from the
   designation registry's sources (section 5).
3. Land status classes present (trust, fee, allotted, restricted). Sensitive;
   comes only from the user's own attributes or declaration.
4. Activity and topics (housing, energy, restoration). Taxonomy.

**Inputs.** Zipped shapefile, GeoPackage (`.gpkg`), GeoJSON, KML or KMZ, and
the secure ATNI-GeoPack. A GeoPack's tier labels are honored: any T2 or T3
input forces local-only resolution (`derivedFromPrivate: true`). Coordinate
reference systems are read from the file and reprojected in memory.

**Process.** Read geometry in memory; intersect with the public boundary and
designation layers (from the ATNI-GeoBase T0 baseline, or a bundled set of
public layers pinned by digest); emit a `PolicyContext`; discard the geometry
unless the user's private namespace is configured to keep it.

**Rules.**

- Never populates the Nation. It may suggest one from an AIANNH or LAR
  intersection for the user to confirm; the context carries a Nation only as
  `user_declared`. This keeps D-005 (geography cannot create a Nation link)
  intact for the context as well as for records.
- Land status classes come only from user-supplied attributes or user
  declaration, never from public layers, and appear as a set of classes with
  no counts and no identifiers.
- Output carries no parcel identifiers, coordinates, bounding boxes or counts.
- Every output is labelled informational and not a legal determination. The
  public sources the resolver relies on carry the same caveat: the Forest
  Service publishes its Royce cession layer "for informational purposes
  only" and states it may not be used to determine title, ownership,
  jurisdiction or boundaries; the resolver's dossier repeats that language.

**Comparable tools, for orientation.** The USFWS IPaC service takes a project
area and returns species, critical habitat and consultation guidance; EPA's
NEPAssist returns environmental overlays for a location. Both are useful
models for "area in, considerations out". The difference to preserve: those
services store the project area on their servers; the area resolver never
sends the area anywhere and never stores it outside the user's namespace.

**Implementation notes.** The resolver runs in Node in the local deployment
(a script and, later, the local workbench). It never runs in the public Pages
build. Spatial intersection needs a geometry dependency; it must be a pinned,
offline, pure JavaScript library with no network use, and the choice is
recorded in the decision register when GD-19 starts.

## 4. PolicyContext v1

Replaces the prose description of `policy.search-context/1` with a closed
schema owned by this repository (`schemas/interop/policy-context.schema.v1.json`,
GD-21). The profile id on the wire stays `policy.search-context/1`; its
payload is a PolicyContext.

| Field | Type | Rules |
| --- | --- | --- |
| `contextId` | random string | Never persisted by the resolver; not a session or user identifier |
| `corpus` | `{ kind: public_synthetic or reviewed_local or user_private, corpusId, digest }` | Resolution is validated against exactly this corpus |
| `jurisdictions` | `JurisdictionRef[]` | `us`, `us-state:<USPS>`, `us-county:<FIPS>`; `nation:<slug>` only with `provenance: user_declared` |
| `designations` | `{ code, registryVersion }[]` | Codes from the designation registry (section 5) |
| `landStatusClasses` | enum set | `tribal_trust`, `tribal_fee`, `allotted_trust`, `restricted_fee`, `reservation_fee`, `fee`, `public_federal`, `public_state`, `unknown`; classes only, no counts; local resolution only (never on the off-deployment wire in v1) |
| `topics` | taxonomy concept ids | From the governed taxonomy bundle |
| `activity` | optional enum | A small activity vocabulary (housing, energy, restoration, transportation, water, cultural resources, other), versioned with the taxonomy |
| `dateWindow` | `{ from, through }` | ISO dates |
| `query` | string | At most 500 characters; rejected when it matches coordinate-, APN-, bbox- or address-shaped tokens (NC-1) |
| `sensitivity` | `{ tier: T0 or T1 or T2 or T3, derivedFromPrivate: boolean }` | When `derivedFromPrivate` is true or tier is above T1, the interop adapter refuses to transmit the context off the deployment and the resolver runs locally only |

Wire rules for an off-deployment `policy.search-context/1` (unchanged in
spirit from the audit's NC-1 to NC-7): no `landStatusClasses`; no Nation unless
`user_declared`; no attachments; classification and provenance envelope
verified and never retained or echoed; `storage: memory_only`; unsupported
filters rejected, not ignored; readiness reported even for zero results.

`policy.citations/1` is unchanged from the design (design section 8.2), with
one addition: each citation may carry `appliesWhere: { designationCode }[]`
copied from the record, so a dossier can say "shown because the area
intersects a FEMA special flood hazard area".

## 5. Designation registry (shared contract with ATNI-GeoBase)

A designation is a named, publicly published overlay that triggers or
conditions policy. The registry holds identity and vocabulary; GeoBase holds
geometry keyed by the same code. Policy Sentinel maps codes to records
through a new record field, `appliesWhere`, with provenance.

**Entry shape.** `code`, `title`, `authority` (publisher), `geometrySource`
(URL, version or date, digest), `legalBasis` (citation), `status`
(`regulatory`, `adjudicated`, `informational`, `historical`), `tier` (T0 for
every public entry), `publisherDisclaimer` (verbatim), `policyTriggers`
(citation locators, filled by GD-14 and later mapping work), `version`.

**Starting entries** (illustrative; the registry itself is data, not this
document):

| Code | Authority and source | Legal basis | Status |
| --- | --- | --- | --- |
| `fema.nfhl.sfha` | FEMA National Flood Hazard Layer | 44 CFR 60.3; NFIP | regulatory |
| `usfws.critical_habitat` | USFWS ECOS critical habitat | ESA section 7; 50 CFR 402 | regulatory |
| `usfws.nwi.wetland` | USFWS National Wetlands Inventory | CWA 404 (jurisdictional determination remains USACE's) | informational |
| `noaa.czm.coastal_zone` | NOAA and state CZM programs | CZMA consistency | regulatory |
| `usgs.padus.federal_land` | PAD-US federal units (USFS, BLM, NPS, USFWS) | agency-specific | regulatory |
| `usfs.royce.ceded_land` | USFS "Tribal Lands Ceded to the United States" (digitized Royce 1899 maps, 718 polygons, cession number, tribe names, treaty citations) | the cited treaty or statute | historical, informational per publisher |
| `noaa.ua.pacific_coast` | 50 CFR 660.4 (Makah, Quileute, Hoh, Quinault U&A areas by coordinates; court-modifiable) | treaty right as adjudicated | adjudicated |
| `wa.ua.adjudicated` | U.S. v. Washington sub-proceedings as published | treaty right as adjudicated | adjudicated |
| `census.aiannh` | Census TIGER AIANNH | identification only | informational |
| `bia.lar` | BIA Land Area Representation | identification only | informational |

Rules: ceded-territory and U&A entries are T0 as published (RL-08) and are
distinct from T3 culturally sensitive data; an `adjudicated` entry carries its
case citation; an entry whose boundary is asserted but not adjudicated is
`informational` with the asserting publisher named; the engine never asserts a
boundary as a determination. Nation-land entries (`census.aiannh`, `bia.lar`)
identify an area for the user to confirm; they never create a Nation criterion
on their own (section 3).

**Ownership.** The registry data lives in the standalone registry repository
(section 6) as a second dataset with its own version line; GeoBase produces
and versions the geometry; each consumer pins both by digest. This is the
first instance of the shared data service the owner intended for the
ecosystem's common datasets.

## 6. Nation registry binding

Working name `atni-nation-registry`: schema, data, validator, releases pinned
by digest.

- Public tier (T0): every entity in the current annual recognition notice,
  keyed `nation:<slug>`, bound to the FR document number and a per-entry
  locator; aliases and preferred names with provenance (the Nation's own
  official publication wins for display); BIA region; states of land presence
  at coarse level from public LAR and AIANNH; ATNI membership flag with
  evidence and date, since membership is dynamic.
- `recognitionAuthority`: `us_federal` populated; `ca_first_nation` reserved
  with no entries (RL-11). `JurisdictionRef` reserves `ca` and
  `ca-province:<code>`.
- Internal tier: offices, contacts, engagement history. Lives in the ATNI
  engagement database keyed by the same slug; never ships in the registry.
- Gate: G-BIA-IDENTITY (the 577-to-575 reconciliation) is the registry's
  first release gate and finally has a home.
- Policy Sentinel binds the tribal `JurisdictionRef` kind (design section 5)
  to registry slugs in GD-22 and pins the registry digest.

## 7. Nationwide sources: survey scope and known interfaces (input to GD-17)

The survey produces `SourceDescriptor` drafts in the shape design section 4
defines, one document per jurisdiction under `docs/source-reviews/nationwide/`,
so that GD-12 can turn them into catalog rows. It reads documentation only;
it acquires nothing, accepts no terms and registers no keys.

| Class | Starting points | Notes |
| --- | --- | --- |
| Federal | Federal Register API; GovInfo API (FR, CFR, U.S. Code, bills, public laws); eCFR API; Regulations.gov API (key); Congress.gov API (key); agency publication pages | The repository already holds offline contracts for congress, govinfo and regulations-gov; the survey confirms currency and terms |
| Courts | CourtListener API (Free Law Project) | The curated SCOTUS adapter exists; lower courts are a gap to record |
| State | Open States v3 API (Plural; key required; states plus DC and Puerto Rico; bills, legislators, committees, events) and its bulk data; each legislature's own site; state administrative codes and registers | Open States is a discovery catalog, not an originating source: use it to find records, take custody from the originating legislature URL. Washington (lws) and Oregon (ODATA) contracts already exist |
| County and municipal | Platform classes: Municode (CivicPlus), American Legal Publishing, eCode360 (General Code), Legistar (Granicus); originating county sites on demand | Most platforms expose no public API; record each as a gap with its terms rather than scrape it |
| Tribal | Not surveyed for acquisition (RL-10) | A Nation supplies its own law as user-supplied data; discovery catalogs may be cited for the Nation's own use |
| International and transboundary instruments | UN publication of UNDRIP and related instruments; US treaty texts through GovInfo or the Statutes at Large; boundary-waters and Pacific Salmon Treaty texts from their commissions | Small class; surveyed for weight and terms, acquisition gated like any other source |

First pass covers federal, all 50 states, DC and the territories. Counties are
covered by platform class plus originating sites when a user's area demands.

## 8. Storage holding policy (about 50 GB on I:)

| Tier | Holds | Cap | Notes |
| --- | --- | --- | --- |
| Reference | Metadata, locator, content hash for every record discovered in scope | within budget (roughly 1 to 2 KB per record; two hundred thousand records per year is under 0.5 GB) | The nationwide index lives here |
| Custody | Immutable provider bytes and text renditions for admitted records | 35 GB | Admission only through an approved bounded run; no eviction, custody is immutable |
| Derived | Analyzed corpus, indexes, workbench output, research exports | 10 GB | Rebuildable from custody |
| Reserve | Headroom | 5 GB | Never allocated |

Rough capacity at the custody cap: a federal or state document is typically
0.1 to 0.3 MB as HTML or XML and 0.5 to 2 MB as PDF, plus a small text
rendition, so 35 GB holds on the order of thirty to one hundred thousand
full documents. That is a topic-scoped nationwide corpus, not everything.
GD-18 replaces these estimates with measured numbers from the survey and from
the existing custody namespace.

Enforcement: a `storage:report` script (GD-18) reports tier usage; the bounded
runner refuses a new admission that would exceed the custody cap; when the
cap is reached, the owner archives whole run roots to cold storage (an
external drive or NAS), keeping their receipts in place, before new
admissions. Cloud object storage is not considered until the owner opens a
gate for it.

## 9. Federation readiness and the T0 baseline bundle (direction only)

Each deployment is self-contained: its own custody namespace, its own private
namespace, pinned public baselines. A later ATNI-published baseline bundle
(the Nation registry, the designation registry, and boundary layer references
with digests), signed and fetched by federated deployments, would give a new
user the T0 data needed to run the applications while keeping
"bring your own data" for everything else. A push service for Tribes and
staff follows the same path. Both remain behind the remote and publication
gates and are recorded here as direction, not work.

## 10. Ledger: schema 1.10 admit-by-rule design (RL-01)

- Milestone "General development" is admitted by rule: an item is valid when
  it carries `work_class: general_development_local`, a `decision_ref` that
  resolves to a decision-register entry, and a gate from
  {G-GENERAL-DEV-01, G-GD-NATIONWIDE-CONTRACT, G-GD-INTEROP,
  G-GD-PRIVATE-CONTEXT}.
- The identity freeze by digest stays in force for every other milestone.
- Adding a general-development item later is a planning act (a register entry
  plus a ledger edit), not a validator change.
- Fallback: if the validator cannot express the rule without weakening the
  freeze elsewhere, use the 1.7 to 1.9 enumeration pattern and record why.

## 11. New and changed work items

Additions to design section 9.4 (the session assigns priorities in sequence
after GD-16):

| ID | Title | Depends on | Gate | Notes |
| --- | --- | --- | --- | --- |
| GD-17-NATIONWIDE-SOURCE-SURVEY | Nationwide source landscape survey (docs only) | GD-00 | G-GENERAL-DEV-01 | Session R; section 7 |
| GD-18-STORAGE-CAPACITY-MODEL | Storage capacity model, holding policy, `storage:report` | GD-00 | G-GENERAL-DEV-01 | Session R; section 8 |
| GD-19-AREA-RESOLVER | Area resolver in Module 4 (synthetic fixtures only) | GD-09, GD-10, GD-20, GD-21 | G-GD-PRIVATE-CONTEXT | Section 3 |
| GD-20-DESIGNATION-REGISTRY-CONTRACT | Designation registry schema, synthetic fixture, `appliesWhere` record field | GD-09 | G-GENERAL-DEV-01 | Section 5; shared with GeoBase |
| GD-21-POLICY-CONTEXT-V1 | PolicyContext v1 schema and validator | GD-09, GD-20 | G-GENERAL-DEV-01 | Section 4; GD-16 now depends on it |
| GD-22-NATION-REGISTRY-BINDING | Bind the tribal `JurisdictionRef` kind to `atni-nation-registry` | GD-09; registry v0 exists | G-BIA-IDENTITY | Section 6 |
| GD-23-USER-SUPPLIED-SOURCE-CLASS | `user_supplied` source class in the catalog and private custody namespace | GD-12 | G-GD-PRIVATE-CONTEXT | Section 2 |

Changes to existing items:

- GD-02 gains the public-entry reachability test (section 2) and classifies
  the seam files as module `private`.
- GD-12 gains credential placeholders (environment-variable references, never
  values) and the `user_supplied` authority class.
- GD-16 depends on GD-21 as well as GD-06, GD-08, GD-09 and GD-10.
- GD-15 folds this addendum into `docs/architecture.md`,
  `docs/PROJECT-BACKBONE.md` and `docs/data-contract.md`.

New gate: G-GD-PRIVATE-CONTEXT, approved for synthetic-fixture code work under
RL-04; real private data never enters this repository under any gate.

## 12. Open questions for the owner raised by this addendum

1. Registry repository shape: one repository holding both the Nation registry
   and the designation registry as separate datasets, or two repositories.
   Default: one repository, two datasets, separate version lines.
   Resolved by D-082.
2. Wave concurrency versus the ledger rule "exactly one work item
   `in_progress`" while local work is active. Parallel lanes in a wave
   violate it as written. Session 1 runs wave 1 sequentially to respect the
   rule; the owner decides whether to amend the rule for waves (for example,
   one `in_progress` item per lane, each lane's item named in the ledger) or
   keep sequential execution. Resolved by D-082.
3. Geometry dependency for the area resolver: a pinned, offline, pure
   JavaScript library is proposed; the owner may prefer a different choice.
   Resolved by D-082.
