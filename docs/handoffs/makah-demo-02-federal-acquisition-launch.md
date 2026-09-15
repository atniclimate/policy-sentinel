# Makah demo launch 02: ledger representation and bounded federal candidate acquisition

Prepared 2026-09-15 for a fresh Claude Code session (Claude Fable 5.1, high
effort) after the owner adopted D-068 and approved D-069 ("allow acquisition
to acquire federal candidates"). Baseline: `main` at the commit containing
this file. Predecessor: the
[groundwork outcome](makah-demo-01-groundwork-outcome.md) and the
[federal actions source review](../source-reviews/olympic-peninsula-federal-actions-2026-09-15.md).

This packet is execution authority for exactly what D-069 permits and for the
local repository work listed below. It authorizes nothing else. Read it by
path; do not paste its body into a composer.

## Decision recorded

Token: `MAKAH_DEMO_02_FEDERAL_CANDIDATE_ACQUISITION`.

Owner decisions of 2026-09-15 that this packet executes:

- **D-068 adopted**: agency-level public contact fields and the private-only
  boundary and parcel contracts (see `docs/decision-register.md`).
- **D-069 approved**: one bounded acquisition of the eight exact federal
  documents below. The identity is the document; the rendition is chosen by
  route as stated in this packet.
- **Ledger representation**: the owner authorized the schema 1.9 change to
  `scripts/validate-roadmap.mjs` and its tests so the Makah demo track can
  hold a work item and gate without a second active item.

Not authorized: any other URL; any retry unless the lead records a specific
transport failure and the owner approves the retry; the FederalRegister.gov
or GovInfo APIs; publication, excerpting for output, republication of
document bodies; `nationAssociations` values (still `G-BIA-IDENTITY`); a
private deployment; a successor run. Every closed gate in `AGENTS.md` stays
closed. `FR-A1` stays unissued; `G-B-GRANTS` stays untouched.

## Reading order at session start

1. `AGENTS.md` fully; `docs/PROJECT-BACKBONE.md` authority order.
2. `ROADMAP.yaml` completely. Confirm `current_focus.work_item` is `null`.
3. `docs/decision-register.md` rows D-010, D-067, D-068, D-069.
4. `docs/handoffs/makah-demo-01-groundwork-outcome.md` (what exists, what
   was verified) and `docs/development/makah-demo/sovereignty-review-2026-09-15.md`.
5. `docs/handoffs/ps09-real-policy-discovery-launch.md` sections on custody,
   ledgering, ceilings and the external run namespace, and
   `docs/handoffs/ps09-real-policy-discovery-outcome.md` for the exact
   external root pattern (`I:\policy-sentinel-corpus-real-policy\discovery-01`).
6. `config/policy-sources.v2.mjs`, `src/pipeline/policy-custody.mjs`
   (manifest validation, media types, ceilings), `scripts/prepare-policy-run.mjs`,
   `scripts/bounded-operation-runner.mjs`.
7. `scripts/validate-roadmap.mjs` (schema 1.7 and 1.8 maintenance-lane
   pattern: `knowledgeAssurance`, `engineeringReview`, frozen digests) and
   `tests/pipeline/roadmap-validator.test.mjs`.
8. `docs/development/makah-demo/tsdf-provenance-record-2026-09-15.json` and
   its schema copy in the same directory; the acquisition updates it.

Then reconcile Git status, worktrees, staged paths and the protected owner
inputs. Run `npm run validate:runtime`, `npm run validate:roadmap` and
`npm run validate:backbone` before mutation. Note that the two pre-existing
uncommitted pipeline changes (`src/pipeline/policy-local-output.mjs`,
`tests/pipeline/policy-assurance.test.mjs`) are unrelated concurrent work;
preserve them unstaged unless the owner says otherwise.

## The eight documents (D-069)

| # | Document | Route | URL to fetch |
| --- | --- | --- | --- |
| 1 | 89 FR 51600, FR Doc. 2024-12669, final rule, 2024-06-18 | A (GovInfo HTML, supported today) | `https://www.govinfo.gov/content/pkg/FR-2024-06-18/html/2024-12669.htm` |
| 2 | 84 FR 13604, FR Doc. 2019-06337, proposed rule, 2019-04-05 | A | `https://www.govinfo.gov/content/pkg/FR-2019-04-05/html/2019-06337.htm` |
| 3 | 91 FR 25865, FR Doc. 2026-09372, notice, 2026-05-12 | A | `https://www.govinfo.gov/content/pkg/FR-2026-05-12/html/2026-09372.htm` |
| 4 | 80 FR 51836, FR Doc. 2015-20888, notice, 2015-08-26 | A | `https://www.govinfo.gov/content/pkg/FR-2015-08-26/html/2015-20888.htm` |
| 5 | 12 Stat. 939, Treaty with the Makah Tribe, 1855 | B (PDF; runner change) | `https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf` |
| 6 | Ninth Circuit No. 15-35824, opinion, 2017-10-23 | B | `https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf` |
| 7 | Ninth Circuit No. 13-35474, opinion, 2016-06-27 | B (new court-host profile) | `https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf` |
| 8 | W.D. Wash. C70-9213 Subproceeding 09-01, findings, 2015-07-09 | B (new court-host profile) | `https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf` |

Route A uses the official-edition HTML rendition that the existing
`govinfo-direct` profile and the runner's media-type list already permit;
the lead verified the PDF renditions of the same documents on 2026-09-15 and
the search agent observed the HTML renditions (see
`docs/development/makah-demo/reference-lookup-2026-09-15.md`). Route B needs
the two bounded code changes in Track 2 before any request. Optionally, and
within the same ceilings, the GovInfo MODS metadata XML for `STATUTE-12` and
`USCOURTS-ca9-15-35824` may be fetched under `/metadata/pkg/` (text/xml,
already permitted) as identity evidence; record them as separate targets.

Request ceiling for the whole packet: at most 10 GETs (8 documents plus the
2 optional metadata files), zero retries, one new run namespace, the
existing 64 MiB per-response and 60 second deadline limits, and hosts limited
to `www.govinfo.gov`, `cdn.ca9.uscourts.gov` and `www.wawd.uscourts.gov`.

## Track 1: ledger representation (schema 1.9)

Goal: represent the Makah demo track in `ROADMAP.yaml` the way H01 (1.7)
and H02 (1.8) were represented, without touching any PS09 item, gate, the
release root or the frozen historical identities.

1. `scripts/validate-roadmap.mjs`: add `const makahDemo = roadmap.schema_version === "1.9"`;
   accept exactly two new work items `MAKAH-DEMO-01-GROUNDWORK-DISCOVERY-SCOUTS`
   (status `complete`, evidence pointing at the groundwork outcome and commit
   `554e105`) and `MAKAH-DEMO-02-FEDERAL-CANDIDATE-ACQUISITION` (status
   `in_progress` on launch), two new gates `G-MAKAH-DEMO-01` (approved;
   owner instruction: the launch prompt path and "and go" on 2026-09-15) and
   `G-MAKAH-DEMO-02` (approved; D-069), a `completion_scope.makah_demo`
   with `accounting: non_release_local_maintenance` and a
   `finish_states.makah_demo` block, all in the exact shapes the 1.7/1.8
   blocks use. Extend the frozen-digest filters so the four new identities
   are excluded before hashing, exactly as `engineeringReviewId` is. Keep
   every 1.8 assertion intact for 1.8 fixtures. Neither item may be a
   dependency of any PS09 item.
2. `tests/pipeline/roadmap-validator.test.mjs`: add 1.9 fixtures mirroring
   the 1.8 cases (accepts the exact representation; rejects a third makah
   item, a renamed gate, a PS09 change, an `in_progress` makah item while a
   PS09 item is active, and a 1.8 ledger carrying makah identities).
3. `ROADMAP.yaml`: bump `schema_version` to `"1.9"`, add the items, gates,
   scope and finish state, set `current_focus.work_item` to the acquisition
   item, and add a `next_actions` entry for it. Run `npm run validate:roadmap`
   and `npm run test:roadmap` before committing.
4. Add the adoption row for this launch to `docs/PROJECT-BACKBONE.md`'s
   responsibility map with a boundary column.

## Track 2: bounded runner changes for Route B

Both changes are additive, tested, and touch no acquisition ledger.

1. `src/pipeline/policy-custody.mjs`: permit `application/pdf` as a target
   media type, accept it in the `Accept` header only for targets that declare
   it, verify the response `content-type` matches, store bytes as an
   immutable object exactly as HTML is stored, and perform no PDF parsing or
   text extraction (out of scope; `policy-text.mjs` is unchanged). Add
   focused tests in `tests/pipeline/` for accept, mismatch rejection, size
   ceiling and ledger accounting with synthetic bytes.
2. `config/policy-sources.v2.mjs`: add a profile
   `federal-court-opinions-direct` with hosts `cdn.ca9.uscourts.gov` and
   `www.wawd.uscourts.gov`, path prefixes `/datastore/opinions/` and
   `/sites/wawd/files/`, a `review` block citing the courts' own terms or
   privacy pages (locate and record the exact URLs; if none states reuse
   terms, record "not located" in a new
   `docs/source-reviews/federal-court-opinion-datastores-2026-09-<dd>.md`
   and keep `publicRedistribution: "prohibited"`), and `uses` identical to
   the GovInfo profile. Add a manifest factory
   `makahDemoFederalManifest(runId = "makah-demo-02")` returning the ten
   targets above with `mediaTypes` set per route, and let
   `scripts/prepare-policy-run.mjs` select it by an explicit `--manifest
   makah-demo-02` argument so the discovery-01 manifest is untouched.

## Track 3: the acquisition run

1. Create the external root `I:\policy-sentinel-corpus-real-policy\makah-demo-02`
   (never inside the repository), initialize it with the runner, and seal
   the manifest digest before the first request.
2. Route A first: four GETs. Verify identity (the FR document number appears
   in the bytes), record receipts, then Route B after Track 2 tests pass:
   four PDF GETs (plus the two optional metadata XML GETs).
3. Item review per object: identity confirmed, byte digest recorded, privacy
   screen recorded (the "for further information contact" blocks, counsel
   and signature blocks exist inside the objects and must never reach any
   output, excerpt or export), reuse basis recorded from the source review.
4. Update `docs/development/makah-demo/tsdf-provenance-record-2026-09-15.json`:
   for each acquired entry add an `artifacts` item (`Source PDF` or `Other`
   for HTML) with the external path and SHA-256, an `evidence` item of type
   `Acquisition record` pointing at the receipt, and an `Acquisition` event in
   `metadata_history.events` with the exact timestamp and time basis.
   Re-validate against the schema copy. The record's `honor` section stays
   human-curated; do not fill `authority`, `consent` or `sovereign_tier`.
5. Update the federal actions source review's status line to "acquired
   (bounded, D-069), not admitted" with the receipt identifiers, and add the
   run to `docs/source-coverage.md` as bounded local evidence, not coverage.

## Roles, models and leases

| Role | Agent type | Model | Lease |
| --- | --- | --- | --- |
| Lead | session | Fable 5.1, high | `ROADMAP.yaml`, `docs/decision-register.md`, `docs/PROJECT-BACKBONE.md`, source reviews, the provenance record, this packet's outcome handoff, manifest factory selection, all runs and receipts |
| Roadmap validator worker | `general-purpose` | `sonnet` | `scripts/validate-roadmap.mjs`, `tests/pipeline/roadmap-validator.test.mjs` |
| Runtime worker (PDF media type) | `general-purpose` | `sonnet` | `src/pipeline/policy-custody.mjs`, new focused test file under `tests/pipeline/` |
| Profile and manifest worker | `general-purpose` | `sonnet` | `config/policy-sources.v2.mjs`, `scripts/prepare-policy-run.mjs` |
| Privacy and provenance reviewer (after acquisition) | `general-purpose`, read-only | inherited (Fable 5.1) | none; findings only |
| Reference lookups | `Explore` or `general-purpose` | `haiku` | none; lookups only, never a retained citation without lead verification |

Freeze the manifest factory and media-type contract before dispatching the
runtime and profile workers; they run in parallel with disjoint leases. No
worker issues a request; only the lead runs the runner.

## Tests and acceptance

1. `npm run validate:roadmap` and `npm run test:roadmap` pass at schema 1.9
   with the two makah items and gates; every 1.8 assertion still passes on
   1.8 fixtures.
2. Focused runner tests pass; `npm run test:policy` passes; the synthetic
   artifact is byte-identical at a fixed `--generated-at` (repeat the
   worktree comparison recorded in the groundwork outcome).
3. Exactly the ledgered GETs occurred, each with a receipt; totals recorded
   in the outcome handoff; no retry.
4. The provenance record validates against its schema copy after the
   artifact and event additions; every acquired entry has a SHA-256.
5. `npm run check` passes.

## Stop contract

Stop before: any URL not in the table above; any retry; any parsing that
would emit document text into an output; any `nationAssociations` value;
any profile whose review evidence cannot be located; any PS09 or release-root
change; any remote, publication, credential, paid, contact, private-data,
AI-generation or notification action; a needed unlisted path. Record the
reason and the exact owner decision needed.

## Terminal dispositions

Use exactly one in `docs/handoffs/makah-demo-02-federal-acquisition-outcome.md`:

- `MAKAH_DEMO_02_ACQUIRED_REVIEWED_NOT_ADMITTED`
- `MAKAH_DEMO_02_PARTIAL_REPAIR_REQUIRED`
- `MAKAH_DEMO_02_OWNER_DECISION_REQUIRED`
- `MAKAH_DEMO_02_STOPPED_BEFORE_UNAUTHORIZED_OPERATION`

None admits, activates or publishes a source. The next owner action after a
validated outcome is a source-specific `G-J` decision for each acquired
document and the identity prerequisite `G-BIA-IDENTITY` before any Nation
association.

Terminal disposition of this preparation:
`MAKAH_DEMO_02_LAUNCH_PACKET_PREPARED_AWAITING_SESSION_START`.
