# ATNI Climate interop: Policy Sentinel IO guide

## 1. Status and authority

This guide describes a pathway that is specified but not implemented, not
adopted, and not represented in `../../ROADMAP.yaml` or
[`../decision-register.md`](../decision-register.md). It is preparation for a
future implementation session, not implementation authority. Nothing in this
file authorizes writing code, adding a listener, opening a port, or changing
Policy Sentinel's public/local corpus boundary.

The pathway is specified in the land-use-analyzer (LUA) repository:

- `I:/land-use-analyzer/docs/integration/ATNI_CLIMATE_NO_SAVE_INTEROPERABILITY_2026-09-15.md`
  ("ATNI Climate no-save interoperability pathway"), dated 2026-09-15. Its own
  header states the design's status plainly: "implementation design, not an
  implemented bridge, ratified disclosure expansion, source admission, or
  deployment approval."
- `I:/land-use-analyzer/docs/integration/ATNI_CLIMATE_INTEROP_IMPLEMENTATION_HANDOFF_2026-09-15.md`,
  a paste-ready assignment for a future session covering all five named peer
  apps, including work package D ("Policy Sentinel and plan-assessor
  adapters").
- `I:/land-use-analyzer/docs/schemas/atni_climate_interop_v1.schema.json`, the
  closed JSON Schema for the `atni-climate-interop/1` wire protocol.
- `I:/land-use-analyzer/webapp/src/lib/interop/protocol.ts` and
  `I:/land-use-analyzer/webapp/src/lib/interop/lua-adapter.ts`, the concrete
  TypeScript types and LUA's own (in-progress) adapter scaffolding.

Peer-side implementation status: LUA has protocol type definitions
(`protocol.ts`) and adapter scaffolding (`lua-adapter.ts`) under
`webapp/src/lib/interop/`, but the design documents describe this as a
transport and schema layer, not a finished cross-app bridge. No Policy
Sentinel adapter exists in any repository as of this writing.

`I:/land-use-analyzer/docs/integration/ATNI_CLIMATE_INTEROP_SOURCE_SNAPSHOT_2026-09-15.json`
pinned Policy Sentinel at commit `d23a43aad0989ed1d7cb6c0bbc6f543f4ef0ee48` when
it inspected `AGENTS.md`, `src/app/csv.ts`, `src/app/policy.ts`,
`src/app/PolicyWorkbench.tsx`, `src/pipeline/policy-local-output.mjs`, and the
two `docs/makah-demo/` files. Policy Sentinel's current `HEAD` is `a1ee988`,
two commits later. The snapshot itself says a hash mismatch "means review
drift, not overwrite or automatic rejection of newer work." Treat every file
description below as re-verified against the current tree by this guide, not
as inherited from the snapshot.

Implementing this pathway requires its own recorded adoption before any code
lands: a `../decision-register.md` entry plus a corresponding
`../../ROADMAP.yaml` item, the same pattern that D-068 and D-069 used before
the Makah demo federal-acquisition work began (see
[`../handoffs/makah-demo-02-federal-acquisition-outcome.md`](../handoffs/makah-demo-02-federal-acquisition-outcome.md)).
It also requires an explicit owner instruction naming this exact pathway. This
guide is not that instruction.

## 2. What Policy Sentinel accepts (`policy.search-context/1`)

The spec's "policy-sentinel adapter" section defines an inbound
`policy.search-context/1` profile carrying only supported explicit
search/filter criteria over an approved loaded corpus: existing
topic/category/source IDs, date bounds, explicit textual search where
supported, and caller-selected general-jurisdiction criteria.

Policy Sentinel's current filter model, read from
[`../../src/app/policy.ts`](../../src/app/policy.ts), is `SearchCriteria`
consumed by `filterRecords`, `recordMatchesPolicy`, and `whyShownFor`. It
supports: `categoryIds`/`subcategoryIds` (taxonomy membership), `query` (free
text against a precomputed `searchText` field), `jurisdictions`,
`documentTypes`, `statuses`, `sources`, `relevanceBases`, `dateFrom`, and
`dateThrough`. Relevance to a Nation is computed by `recordAvailableForNation`
from `jurisdiction.level` and explicit `nationAssociations`, never from
geometry.

Two distinct corpora exist and must never be treated as one filter contract:

- The public synthetic app, whose records are loaded and normalized by
  `../../src/app/data.ts` (`loadArtifacts`, `normalizeRecord`) from
  `data/manifest.json`, `data/nations.json`, `data/taxonomy.json`, and
  `data/index/records.json`, all same-origin fetches. This is the surface
  `policy.ts`'s `SearchCriteria` filters.
- The reviewed local workbench, produced by
  [`../../src/pipeline/policy-local-output.mjs`](../../src/pipeline/policy-local-output.mjs)
  (`writeLocalOutput`, `readLocalOutput`, `createLoopbackOutputServer`). This
  file is currently dirty with unrelated pending edits; any future interop
  work touching it must coordinate with whoever owns that change, not silently
  overwrite it.

An adapter must validate a caller's `policy.search-context/1` request against
the specific model of whichever corpus it targets. Do not pretend the public
synthetic filter contract and the reviewed local workbench filter contract are
the same shape.

The spec's explicit prohibition list for this profile, quoted from
`I:/land-use-analyzer/docs/integration/ATNI_CLIMATE_NO_SAVE_INTEROPERABILITY_2026-09-15.md`
section 5: "This profile contains no parcel IDs, coordinates, bbox, ownership,
land status, Nation inferred from a map, or attachment carrying those
fields." The same section requires: "Construct the query at the sender with
its own allowed purpose and no prohibited lineage payload; if its derivation
remains restricted and the recipient cannot accept that restriction, refuse
the route. Stripping fields is not a tier downgrade." Restriction labels
travel with a query if the sender derived it from restricted context; an
adapter must reject a destination that cannot honor that label rather than
silently dropping the restriction to make the payload look public.

Errors an adapter must return, and when, using the codes defined in
`atni_climate_interop_v1.schema.json`:

| Code | When |
| --- | --- |
| `UNSUPPORTED_PROFILE` | A profile other than `policy.search-context/1` or `policy.citations/1` is requested of this adapter. |
| `INVALID_PAYLOAD` | The request body fails schema or contains a prohibited field (geometry, parcel ID, coordinates, bbox, ownership, land status, map-inferred Nation). |
| `PURPOSE_NOT_ALLOWED` | A restricted-derivation query targets a destination whose purpose/audience cannot accept that restriction. |
| `TIER_NOT_ALLOWED` | The request's classification tier exceeds what this route permits (no T3 transfer ever; T1/T2 real transfers stay disabled absent an explicit audience/purpose/retention grant). |
| `OUT_OF_COVERAGE` | The requested corpus identity, jurisdiction, or date range is outside what the targeted corpus (public or local) actually holds. |
| `NOT_READY` | The targeted corpus or a required source is not currently loaded/available. |

## 3. What Policy Sentinel returns (`policy.citations/1`)

Outbound `policy.citations/1` projects: record IDs, official titles where
allowed, source IDs/URLs, dates, citation/evidence locators, why-shown, source
health, native schema identifier, and coverage limitations. The spec requires
resolving required details "through the existing verified hydration path;
do not export an incomplete compact record as complete evidence."

Policy Sentinel's existing hydration path is `loadRecordDetail` in
[`../../src/app/data.ts`](../../src/app/data.ts): it fetches a record's
`detailPath`, verifies the detail asset's `generatedAt` matches the loaded
artifact's manifest, verifies the detail record's `internalId`,
`source.id`, `sourceDocumentIdentifier`, and `officialSource` URL all match
the compact index record, and verifies a full `compactIntegrityProjection`
and `recordHealthIntegrityProjection` equality before accepting the detail
record. An interop citation export must hydrate through this same function
rather than exporting the compact index record directly, so that title,
jurisdiction, judicial/accord context, and source health are the verified
versions.

CSV export must reuse the existing formula-neutralization logic in
[`../../src/app/csv.ts`](../../src/app/csv.ts): `neutralizeSpreadsheetFormula`
prefixes any cell beginning with `=`, `+`, `-`, or `@` (after leading
whitespace) with a single quote, and `csvCell`/`serializeCsv` quote every
field and double internal quotes. `selectedRecordsCsv` is the existing
column set (`why_shown`, `relevance_basis`, `source_health`, `retrieved_at`,
etc.) that already matches most of what `policy.citations/1` needs to carry;
a citation-export adapter should call this function rather than reimplement
CSV serialization.

Readiness values for this profile use the shared enum:
`complete`, `partial`, `not_analyzed`, `unavailable`, `synthetic_only`. A
zero-result search-context query must still return the corpus's actual
`readiness`/coverage/health state, not an empty success that implies nothing
is wrong.

Synthetic versus reviewed-real labelling: the public artifact's
`ArtifactManifest.synthetic` flag (read by `normalizeManifest` in
`data.ts`) and the local workbench's own provenance markers must both survive
into the exported `classification.synthetic` field of any `policy.citations/1`
artifact manifest. Never relabel a synthetic public-app record as reviewed
real local output, or vice versa.

What Policy Sentinel never does through this pathway, per the spec's section
5 policy-sentinel adapter text: "No query activates a disabled source, starts
acquisition, changes Nation evidence, or creates an applicability finding.
Public delivery cannot consume a private adapter." Also never mix records
from the public synthetic corpus and the reviewed local workbench in one
response, and never consume the unimplemented private GIS proposal in
`../makah-demo/`.

## 4. Transport and session rules Policy Sentinel must honor

These rules come from spec sections 3 and 6 and apply to any future Policy
Sentinel adapter regardless of which corpus it serves:

- Browser transport is an explicitly connected `MessageChannel`: a known
  window reference sends a `connect` handshake to one exact configured
  origin and transfers a single `MessagePort`. The receiver checks both
  `event.origin` and `event.source`, the configured peer identity, protocol
  version, and the active connection attempt before accepting the port. No
  wildcard origins, suffix matching, opaque `null` origins, or discovery by
  broadcasting.
- No persistence: no `localStorage`, `sessionStorage`, `IndexedDB`, or
  service-worker cache may hold handoff payloads. Memory handles die with
  the session.
- Every artifact manifest carries a `sha256`; verify it before parsing or
  using the bytes, and before any state mutation. A hash mismatch is
  `INTEGRITY_MISMATCH` and fails before mutation.
- Resource ceilings from `LIMITS` in `protocol.ts` and the schema: 64 KiB
  handshake/control header, 10 MiB structured JSON artifact, 8 attachments
  and 50 MiB total attachment bytes per request, 100,000 coordinate pairs
  cap (not applicable to this adapter, which accepts no geometry), 30-second
  normal call deadline, 5-minute maximum for a negotiated long operation,
  5-second handshake deadline, 15-minute session idle expiry.
- Duplicate-request semantics: the same `request_id` with the same bytes
  returns the recorded result while retained; the same ID with different
  bytes fails. After response eviction, never silently re-execute a
  remembered mutating ID; require a fresh explicit call.
- Storage mode is declared in `SessionCapabilities.storage` as exactly
  `memory_only` or `managed_run_artifacts`. A Policy Sentinel adapter over
  the public synthetic corpus should declare `memory_only`.

The spec is explicit that Policy Sentinel's existing loopback server
(`createLoopbackOutputServer` in `policy-local-output.mjs`, bound to
`127.0.0.1`) "is not a general cross-app upload endpoint," and that no CORS
`*` header, and no serving of the corpus root or acquisition objects, is
permitted. Any interop adapter over the reviewed local workbench must not
repurpose or widen that server's existing narrow contract
(serving only `local-output/` on explicit `127.0.0.1` invocation, per
[`../data-governance.md`](../data-governance.md)).

## 5. Seams in this repository today

| File | What it provides today | What would need to change |
| --- | --- | --- |
| [`../../src/app/policy.ts`](../../src/app/policy.ts) | `SearchCriteria` type, `filterRecords`, `recordMatchesPolicy`, `whyShownFor`, `recordAvailableForNation`, `recordEventDate` over the public synthetic corpus. | A validated projector from `policy.search-context/1` into `SearchCriteria`, rejecting any field this type has no slot for (geometry, parcel IDs). |
| [`../../src/app/csv.ts`](../../src/app/csv.ts) | `selectedRecordsCsv`, `neutralizeSpreadsheetFormula`, `serializeCsv` for the public corpus's record set. | Reuse as-is for `policy.citations/1` CSV export; add a metadata companion artifact per the spec's manifest requirements. |
| [`../../src/app/data.ts`](../../src/app/data.ts) | `loadArtifacts` (same-origin fetch and validation of the public artifact bundle), `loadRecordDetail` (the verified hydration path), `normalizeRecord`. | An interop export path must call `loadRecordDetail` rather than exporting compact records; no changes needed to the functions themselves. |
| [`../../src/app/PolicyWorkbench.tsx`](../../src/app/PolicyWorkbench.tsx) | UI surface for the reviewed local corpus workbench (separate from the public synthetic app). | Would need its own adapter path if the local workbench, not the public app, becomes the interop receiving surface (see open decision in section 9). |
| [`../../src/pipeline/policy-local-output.mjs`](../../src/pipeline/policy-local-output.mjs) | `writeLocalOutput`, `readLocalOutput`, `createLoopbackOutputServer`, `replayReviewedCorpus` for the reviewed local workbench. Read-only for this guide; **currently dirty with unrelated pending edits** (also touched by `tests/pipeline/policy-assurance.test.mjs`). | Any interop work here must coordinate with the pending edit's owner before adding new exports or endpoints; do not overwrite in-flight work. |

## 6. Proposed implementation shape (not authority)

The implementation handoff's work package D proposes these paths for a future
session, adjustable to current repository convention:

- `src/interop/search-context.ts`: pure validator/projector from
  `policy.search-context/1` into the existing `SearchCriteria` shape, with no
  network or DOM side effects.
- `src/interop/citation-export.ts`: pure projector from a hydrated
  `PublicRecord` set into `policy.citations/1` artifacts (JSON manifest plus
  CSV via `selectedRecordsCsv`).
- `tests/interop/`: synthetic conformance fixtures only; no real corpus
  content, no natural names or addresses.

Sequencing: build and test the pure validators and projectors first. Do not
wire a live `MessageChannel` listener until a separate wiring decision is
made and recorded, per the spec's implementation-order guidance (step 4 of
its section 8 covers the policy/plan-assessor adapters, after the shared
protocol, LUA, and GeoBase/TCR work).

A capabilities response for this adapter, if implemented, would advertise
exactly two profiles (`policy.search-context/1` import, `policy.citations/1`
export) and `storage: "memory_only"` in its `SessionCapabilities`, per the
schema's `capabilities` definition and `emptyCapabilities()` in
`protocol.ts`. Fixtures for this response are conformance evidence only; a
fixture is not an implemented capability until an active adapter serves it,
per the spec's section 3 note: "A fixture profile is not an implemented peer
capability; advertisements come from active adapters."

## 7. Acceptance checklist for a future session

Reproduce the implementation handoff's minimum scenario 4 (section 4): "Policy
Sentinel consumes an explicit valid search context and returns verified
source citations over its permitted corpus. Reject geometry, parcel fields,
unsupported filters, wrong corpus identity and forged Nation relevance. A
zero-result query retains scope/coverage limitations."

Negative cases to exercise, drawn from the same handoff section 4:

- A geometry- or parcel-bearing payload is rejected (`INVALID_PAYLOAD`)
  before any state mutation.
- A request naming the wrong corpus identity (public vs. reviewed local) is
  rejected (`OUT_OF_COVERAGE` or `INVALID_PAYLOAD`, not silently served from
  the other corpus).
- A forged or map-inferred Nation-relevance claim is rejected rather than
  accepted as `explicit_nation_reference`.
- An unsupported filter field is rejected, not silently dropped.
- A zero-result query still returns accurate `readiness` and source-health
  state rather than an ambiguous empty success.

Policy Sentinel's own gates, per [`../../AGENTS.md`](../../AGENTS.md):

- `npm test` must pass.
- `npm run validate:roadmap` if `ROADMAP.yaml` changes (a new item and gate,
  following the D-068/D-069 pattern, must precede any implementation work).
- `npm run validate:backbone` must pass if documentation links change.
- No new dependency; the interop client/schema types can be vendored or
  reimplemented locally rather than importing the LUA package, since no
  publishable shared package exists.

## 8. Relationship to the Makah demo track

The Makah demo track is a separate, non-PS09 effort. Under D-069
(`../decision-register.md`), Policy Sentinel acquired eight federal documents
plus two GovInfo metadata files, recorded in
[`../handoffs/makah-demo-02-federal-acquisition-outcome.md`](../handoffs/makah-demo-02-federal-acquisition-outcome.md).
That outcome's terminal disposition is
`MAKAH_DEMO_02_ACQUIRED_REVIEWED_NOT_ADMITTED`: the documents are held as
custody only, not admitted, activated, excerpted, exported, or published, and
no `nationAssociations` value exists for them.

None of those eight documents are in any loaded corpus (public synthetic or
reviewed local workbench) today. They cannot be returned as
`policy.citations/1` citations through this interop pathway until admitted
under the source-specific `G-J` decisions the outcome document identifies as
the next owner actions, and until the `G-BIA-IDENTITY` prerequisite is met
before any Nation association is recorded.

The private GIS proposal in `../makah-demo/01-current-functionality-and-gis-boundary.yaml`
and `../makah-demo/02-parcel-jurisdiction-and-citation-export.yaml` remains
unimplemented and gated. Both files' own headers state they authorize
nothing and describe an illustrative, unadopted schema sketch. This interop
pathway does not ratify them, matching the spec's own statement in section 5:
"The private GIS proposal in `docs/makah-demo/` stays unimplemented and
gated; this exchange pathway does not ratify it."

## 9. Open owner decisions

- Whether and when to record a decision-register entry and `ROADMAP.yaml`
  item adopting this pathway, following the D-068/D-069 precedent.
- Which corpus identity (public synthetic artifact vs. reviewed local
  workbench) is exposed first, and whether both are ever exposed through the
  same adapter or only one.
- Whether the public synthetic app or the reviewed local workbench is the
  receiving surface for `policy.search-context/1` (they have distinct filter
  contracts and distinct governance; see section 2).
- Origin and peer configuration: which exact caller origin(s) are configured,
  and how that configuration is stored and reviewed.
- What audience and purpose apply to any `local_context` classification
  (versus `synthetic_conformance`), since real T1/T2 transfers stay disabled
  absent an explicit audience/purpose/retention grant per spec section 6.
