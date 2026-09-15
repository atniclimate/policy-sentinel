# Makah demo groundwork outcome: MAKAH_DEMO_01_GROUNDWORK_DATA_DISCOVERY_AND_SCOUTS

Prepared 2026-09-15 by the lead session (Claude Fable 5.1, high effort) that
executed the
[launch packet](makah-demo-fable-5.1-launch-prompt.md) after the owner
launched it with "and go" and no URL allowlist. This is the Track D4 terminal
handoff. It records what exists, what was verified by which command, what
was reconciled or rejected, and every gate that remains closed. It authorizes
nothing.

## Terminal disposition

`MAKAH_DEMO_01_OWNER_ALLOWLIST_OR_SCOPE_DECISION_REQUIRED`

Track A groundwork is implemented and validated for its stated scope, Tracks
B and C are complete as reviews and reconciled reports, and Track D2 and D4
are done. Track D1 (the roadmap work item and gate) could not be executed
without an unlisted path, and four owner decisions are open. Nothing here
authorizes acquisition, source activation, a private deployment, publication
or a successor run.

## Start and end state

| Item | Value |
| --- | --- |
| Branch | `main`, no worktrees, no stash, no staged paths at start |
| Start commit | `3659cedfd15cf16c22b31f1b890690275ca1cea4` (Point continuity docs at the prepared Makah demo launch packet) |
| Implementation commit | recorded in the follow-up section at the end of this file |
| Pre-existing uncommitted, unrelated changes preserved untouched | `src/pipeline/policy-local-output.mjs`, `tests/pipeline/policy-assurance.test.mjs` (a cleanup refactor plus tests, 32/32 passing under `node --test`; not part of this packet, not staged) |
| Protected owner inputs | 33 untracked owner direction inputs and one CSV remained untracked and unmodified |
| Roadmap | `current_focus.work_item` was and remains `null`; `ROADMAP.yaml` unchanged; `npm run validate:roadmap` passes with 79 work items, 55 gates, zero `in_progress` |

## Owner decisions required next (exact)

1. **Ledger representation.** `scripts/validate-roadmap.mjs` at schema 1.8
   freezes the work-item and gate identity lists by SHA-256 digest, so the
   packet's `MAKAH-DEMO-01-GROUNDWORK-DISCOVERY-SCOUTS` item and
   `G-MAKAH-DEMO-01` gate fail validation as written. Adding them requires a
   schema 1.9 change to `scripts/validate-roadmap.mjs` and
   `tests/pipeline/roadmap-validator.test.mjs`, neither of which was in the
   packet's lease table; per the packet's stop rule the claim ended with this
   record and the roadmap was not touched. Decide whether to authorize that
   validator change (the house pattern used for H01 at 1.7 and H02 at 1.8),
   or to leave this track outside the ledger.
2. **D-068.** Adopt, amend or reject the proposed decision-register entry
   covering agency-level public contact fields and the private-only
   boundary and parcel contracts. The sovereignty reviewer's C4-01 holds that
   the land-status vocabulary and synthetic adapter landed ahead of the
   decision; the lead's position is that the launched packet specified both
   and that the enum is a private-only schema vocabulary, not land content.
3. **Research API read.** The C3 scout retrieved Federal Register document
   metadata through FederalRegister.gov's keyless JSON endpoints, whose terms
   and rates the project records as unknown (O-021). It was a read-only
   research read, retained no bytes, consumed no ledger request and did not
   issue `FR-A1`; the lead verified every kept document against GovInfo
   official-edition PDFs instead. Acknowledge or record a rule for future
   scouts.
4. **Acquisition allowlist.** The federal actions source review lists eight
   exact official documents as candidates, not an allowlist. Any acquisition
   needs an exact allowlist, source-specific `G-J` evidence and, for Nation
   associations, `G-BIA-IDENTITY`.

## Interpretation stated at launch

"Source operation" in the packet was read as a product-runner request that
consumes a ledger budget. Zero such requests were issued. Read-only public
research by scouts and the lead's citation-verification reads are the
"read-only public research" the packet permits at launch. Counts: the three
scouts opened 27, 20 and 31 URLs respectively (listed in their raw reports);
the lead opened 42 URLs during reconciliation and boundary-source review,
including 11 PDFs read by first page. No download of any dataset, no form,
account, terms acceptance, contact or API registration occurred. Grants.gov
was not touched.

## Paths written

Lead-owned: `schemas/land-boundary.schema.v1.json`,
`schemas/land-parcel.schema.v1.json`, `schemas/citation-export.schema.v1.json`,
`src/engine/index.ts`, `scripts/validate-foundation.mjs`,
`docs/data-contract.md`, `docs/architecture.md`, `docs/decision-register.md`,
`docs/source-feasibility.md`, `docs/source-coverage.md`,
`docs/makah-demo/00-llm-usage-manifest.yaml` (outcome pointer only), the five
source reviews `docs/source-reviews/{makah-tribe-official-publications,clallam-county,jefferson-county,olympic-peninsula-federal-actions,public-boundary-reference-sources}-2026-09-15.md`,
the four reports under `docs/development/makah-demo/`
(`scout-funding`, `scout-legal-precedent`, `scout-regulatory-legislative`,
`sovereignty-review`, all `-2026-09-15.md`), and this file.

Runtime worker lease (returned): `src/engine/land-boundary-contracts.ts`,
`src/engine/land-parcel-contracts.ts`, `src/engine/citation-export-contracts.ts`,
`src/engine/parcel-query.ts`, `src/engine/authorized-private-context-adapter.ts`.

Fixture/test worker lease (returned): `fixtures/engine/land-boundary.synthetic.valid.json`,
`fixtures/engine/land-boundary-malformed.invalid.json`,
`fixtures/engine/land-parcel.synthetic.valid.json`,
`fixtures/engine/land-parcel-malformed.invalid.json`,
`fixtures/engine/citation-export.synthetic.valid.json`,
`tests/engine/land-boundary.test.ts`, `tests/engine/land-parcel.test.ts`,
`tests/engine/citation-export.test.ts`, `tests/engine/parcel-query.test.ts`,
`tests/engine/makah-demo-non-interference.test.ts`.

After both leases returned, the lead applied the sovereignty-review repairs
across schemas, runtime, fixtures and tests. No path outside the packet's
table was written except this lead-authored note of the paths that could not
be written (the roadmap validator and its tests). `docs/PROJECT-BACKBONE.md`
was not edited: the packet adds its row only on adoption.

## Roles, models and leases

| Role | Agent | Model | Outcome |
| --- | --- | --- | --- |
| Lead | session | Fable 5.1, high | Interface freeze, reconciliation, repairs, ledger, handoff |
| C1 funding scout | `general-purpose` | `sonnet` | Report returned; 8 kept after lead verification, 2 `not_located` |
| C2 legal precedent scout | `general-purpose` | `sonnet` | Report returned; 11 kept, 3 `secondary_only`, 2 `not_located` |
| C3 regulatory scout | `general-purpose` | `sonnet` | Report returned; 15 kept, 1 `secondary_only`, 1 dropped as out of scope, several `not_located` |
| C4 sovereignty adversarial reviewer | `general-purpose`, read-only | inherited (Fable 5.1) | 14 findings, FAIL pending four closures; 12 closed by the lead, 2 open as owner items, 2 by-design limits recorded |
| Track A runtime worker | `general-purpose` | `sonnet` | Five modules implemented; one Edit-tool escape incident self-repaired and reported |
| Track A fixture/test worker | `general-purpose` | `sonnet` | Five fixtures and five suites; 93 tests passing before the lead's repair pass |

Deviation from the packet: C4 was dispatched after C1 to C3 returned and
the schemas existed, because its brief reviews their outputs; the three
research scouts ran concurrently in one message as required.

## Track A: what was implemented and what it does not do

- `LandBoundary 1.0.0`: opaque external reference plus digest and format;
  no inline coordinates at any depth; sensitivity classes `internal`,
  `restricted`, `privileged` (no `public`); Tribal-supplied material must be
  at least `restricted`; synthetic and private trust domains cannot mix.
- `LandParcel 1.0.0`: letter-led prefixed `parcelId`; co-existing land-status
  types each requiring official evidence; ordered non-exclusive jurisdiction
  layers where a tribal layer requires a `nationId` and others require null;
  no single winning jurisdiction field.
- `CitationExport 1.0.0`: scope by parcel (carrying the parcel's own layers)
  or by layers; agency-level `issuingAuthority` with contact fields that each
  require their own `fieldProvenance` entry reused from `PolicyRecord 1.4`;
  finite personal-shape guard over the name and contact fields;
  `whyAssociated` must agree with the scope layer it cites.
- `resolveParcelQuery`: union over layers; a tribal layer matches only a
  validated `nationAssociations` entry with the same `nationId`; a county-only
  parcel can never produce a Nation basis; results carry a per-layer
  `whyAssociated` display basis and fixed non-claims.
- `AuthorizedPrivateContextAdapter`: typed synchronous interface plus one
  synthetic in-memory implementation that rejects any real input with
  `REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER`; `PrivateView` carries
  `deploymentProfile: "private"` and its trust domain.
- Not done, by design: no shapefile or GeoJSON ingestion, no file or network
  I/O, no dependency added, no real adapter, no application or artifact
  integration, no real geometry, parcel, contact or source data anywhere.

## Commands and actual outcomes

Focused engine suites after the sovereignty repairs:

```
npx vitest run tests/engine/land-boundary.test.ts tests/engine/land-parcel.test.ts tests/engine/citation-export.test.ts tests/engine/parcel-query.test.ts tests/engine/makah-demo-non-interference.test.ts
 Test Files  5 passed (5)
      Tests  101 passed (101)
```

```
npx tsc --noEmit            (exit 0, no output)
npx eslint src/engine tests/engine --max-warnings=0   (exit 0, no output)
```

Malformed fixture families as pinned by the schema tests and counted by the
foundation validator: land boundary 17 cases (13 schema-layer including 3
protected-key, 4 semantic); land parcel 21 cases (15 schema-layer including
3 protected-key, 6 semantic). Citation-export negatives are inline in its
suite.

Artifact non-interference: the ordinary builder embeds the wall-clock
`generatedAt`, so byte identity was proved at a fixed timestamp. The
pre-change tree (commit `3659ced`, checked out in a throwaway worktree that
was removed afterwards) and the current tree were each built with
`node scripts/build-synthetic-artifact.mjs --generated-at 2026-09-15T00:00:00Z`;
all nine files under the output directory matched byte for byte, both builds
reporting build ID `synthetic-f610f584ba3127f578e3` and `manifest.json`
SHA-256 `ed9407a829a21095035125abec6d8a986ad3477112da976c7a9ef59e59630dca`.
`makah-demo-non-interference.test.ts` additionally proves that the builder,
the application and the pipeline reference none of the new modules or
fixtures.

Full check (`npm run check`, second run, after this file existed; the first
run stopped only at the backbone link check because this file was not yet
written):

```
Runtime validation passed: Node 24.19.0, npm 12.0.2, win32 x64.
Roadmap validation passed: 79 work items, 55 gates, 14 sources, 23 binding paths; statuses {"complete":41,"in_progress":0,"ready":1,"blocked":18,"deferred":2,"not_started":17}.
Backbone validation passed: 22 JSON Schemas, 22 schema IDs, 1346 $refs, 119 Markdown files, and 805 local links.
Foundation validation passed: 19 schemas, ... and 1 valid plus 10 schema-invalid plus 3 protected-key plus 4 runtime-boundary land boundary checks, 1 valid plus 12 schema-invalid plus 3 protected-key plus 6 runtime-boundary land parcel checks, 1 valid citation export check.
 Test Files  97 passed (97)
      Tests  1617 passed (1617)
Artifact validation passed: 3 records, 575 Nations, 8 verified assets.
exit=0
```

Format check, hooks test, lint, typecheck, knowledge validation and the
source-boundary scan all passed inside that run. The scratchpad log is not a
repository artifact; the lines above are copied from it.

## Track B: source reviews and their gates

| Review | Conclusion | Gate |
| --- | --- | --- |
| Makah Tribe official publications | reviewed, not admitted; publication authority of the observed domain unverified | `G-J`, `G-BIA-IDENTITY` |
| Clallam County | `gap`: no adopted county record naming the Makah Tribe observed | `G-J`, `G-BIA-IDENTITY` |
| Jefferson County | `gap`: no record naming the Makah Tribe located | `G-J`; portal credential under `EXT-CREDENTIALS` |
| Olympic Peninsula federal actions | reviewed, not admitted; eight exact-document candidates | `G-J`, `G-PNW-05-FR-TIER1-QUALIFICATION`, `G-B-GOVINFO`, `G-BIA-IDENTITY` |
| Public boundary reference sources | `gap` for terms; reference only | `G-G`, `EXT-PRIVATE`, D-010 |

Additive rows were added to `docs/source-feasibility.md` (five) and
`docs/source-coverage.md` (two). No registry entry, adapter, record or
coverage was created; `config/sources.v1.json` is unchanged.

## Track C: reconciliation summary

Every kept item was opened by the lead at its originating URL; court,
treaty and Federal Register PDFs were read by first page. Rejections and
downgrades are tabulated at the top of each report. Personal contact data
seen on funder pages, in Federal Register contact blocks and on a Tribal
resolution page was deliberately not carried. The sovereignty review is at
`docs/development/makah-demo/sovereignty-review-2026-09-15.md`.

## Gates confirmed closed and operations confirmed absent

No remote, push, Pages, publication, credential, terms acceptance, paid call,
third-party contact, private material, optional AI generation, notification,
dependency addition, PS09 gate change or release-root change occurred. `FR-A1`
was not issued; `G-B-GRANTS` was not touched; K0/S0/O0 remain outside product
dependencies; `PS09-06-LOCAL-RC` is untouched.

## Follow-up: final check and commit record

Filled in after the final `npm run check` and the local commit.
