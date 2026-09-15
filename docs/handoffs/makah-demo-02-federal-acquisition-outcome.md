# Makah demo launch 02 outcome: schema 1.9 ledger representation and bounded federal candidate acquisition

Prepared 2026-09-15 by the lead session (Claude Fable 5.1, high effort) that
executed the [federal acquisition launch](makah-demo-02-federal-acquisition-launch.md)
after the owner adopted D-068 and approved D-069. It records what was built,
what was fetched, how each object was verified, and every gate that remains
closed. It authorizes nothing. Token: `MAKAH_DEMO_02_FEDERAL_CANDIDATE_ACQUISITION`.

## Terminal disposition

`MAKAH_DEMO_02_ACQUIRED_REVIEWED_NOT_ADMITTED`

All three tracks completed: the schema 1.9 ledger representation, the two
bounded runner changes, and one acquisition of exactly the eight approved
federal documents plus the two optional GovInfo package metadata files. Ten
ledgered GETs, ten complete receipts, zero retries, zero failures. Nothing is
admitted, activated, excerpted, exported or published; no
`nationAssociations` value exists; no PS09 item, gate, release root or
external boundary changed.

## Start and end state

| Item | Value |
| --- | --- |
| Branch | `main`, one worktree, no remote, no stash |
| Start commit | `edb508481a8719f294e5802c6e68b3b576760175` (True up continuity pointers to the Makah demo federal acquisition launch) |
| Implementation commit | recorded in the follow-up section at the end of this file |
| Pre-existing uncommitted, unrelated changes preserved untouched | `src/pipeline/policy-local-output.mjs`, `tests/pipeline/policy-assurance.test.mjs` |
| Protected owner inputs | the untracked owner direction inputs remained untracked and unmodified |
| Pre-mutation validation | `npm run validate:runtime` (Node 24.19.0, npm 12.0.2, win32 x64), `npm run validate:roadmap` (79 work items, 55 gates, zero `in_progress`), `npm run validate:backbone` (22 schemas, 121 Markdown files, 819 local links) all passed at `edb5084` |
| Owner deferral noted | the provenance record's Honor section (`authority`, `consent`, `sovereign_tier`) stays uncurated by owner decision until the demos are functional |

## Track 1: ledger representation (schema 1.9)

`ROADMAP.yaml` moved from schema `1.8` to `1.9` with two work items
(`MAKAH-DEMO-01-GROUNDWORK-DISCOVERY-SCOUTS`, priority 296, `complete`;
`MAKAH-DEMO-02-FEDERAL-CANDIDATE-ACQUISITION`, priority 297, `in_progress`
during the run), two approved gates (`G-MAKAH-DEMO-01` bound to the groundwork
launch prompt, `G-MAKAH-DEMO-02` bound to this packet and D-069 with the exact
ten-request, three-host, zero-retry ceiling), `completion_scope.makah_demo`
(`accounting: non_release_local_maintenance`) and `finish_states.makah_demo`.
`scripts/validate-roadmap.mjs` gained a `makahDemo` branch in the 1.7/1.8
pattern: the four new identities are excluded from every frozen 1.8 digest,
the two gates are the only new gate identities admitted, the two items are
pinned by priority, class, dependency, gate and status rules, neither may be a
dependency of any other item, and an active Makah item is the only permitted
`in_progress` item alongside the blocked PS09 finish. `tests/pipeline/roadmap-validator.test.mjs`
adds the 1.9 fixture family and strips the Makah identities from the 1.7/1.8
fixtures so every earlier assertion still runs unchanged.

## Track 2: bounded runner changes

- `src/pipeline/policy-custody.mjs`: `application/pdf` joins the allowed
  target media types; the `Accept` header (now the exported `DEFAULT_ACCEPT`)
  gains `,application/pdf` only for targets that declare it; the existing
  content-type check rejects a mismatch with a failed receipt and a
  conservative full-reservation charge; bytes are stored as the same
  immutable `objects/<sha256>.bin`; no parsing or text extraction exists.
  `tests/pipeline/policy-custody-pdf.test.mjs` covers manifest acceptance,
  the Accept rule, a complete opaque PDF acquisition, mismatch in both
  directions, declared-length and streamed byte ceilings, ledger accounting
  and non-regression (7 tests).
- `config/policy-sources.v2.mjs`: profile `federal-court-opinions-direct`
  (`cdn.ca9.uscourts.gov`, `www.wawd.uscourts.gov`; `/datastore/opinions/`,
  `/sites/wawd/files/`; review evidence: the two courts' privacy pages;
  expires 2026-10-15; `uses` identical to GovInfo) and the factory
  `makahDemoFederalManifest("makah-demo-02")` with exactly the ten packet
  targets. The discovery-01 manifest is unchanged (its profiles are sliced to
  the original two). `scripts/prepare-policy-run.mjs` accepts
  `--manifest makah-demo-02`; the default remains discovery-01.
  `tests/pipeline/makah-demo-manifest.test.mjs` pins the ten URLs, media
  types, hosts, profile fit, custody acceptance and the argument contract
  (9 tests). Both new test files are registered in `package.json`'s
  `test:policy` script, the one path outside the packet's lease table that
  this run touched; it is a one-line registration so `npm test` executes the
  new suites.
- New [court datastore source review](../source-reviews/federal-court-opinion-datastores-2026-09-15.md):
  privacy pages located for both courts, no reuse statement located on
  either host (recorded as "not located"), robots permits both paths, the
  Western District file declares a 10 second crawl delay. The federal actions
  review status is now "acquired (bounded, D-069), not admitted"; one
  feasibility row and one coverage row record the run as bounded local
  evidence, not coverage.

## Track 3: the acquisition run

External root `I:\policy-sentinel-corpus-real-policy\makah-demo-02`
(never inside the repository), run id `makah-demo-02`, trust domain
`real_source_local`, manifest digest
`7ee5dc4a5051e9157b259673c4bda632986c60d2b3ef5002368e238dbbd864a9`, sealed
before the first request. One operation per runner invocation, Route A first,
then Route B, then the two optional metadata targets. Every request was the
first and only attempt for its URL.

| Op | Receipt | Status | Media type | Bytes | Object SHA-256 | Completed (UTC) |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `fr-2024-12669` | 200 | text/html | 321,576 | `470faf11feabb615e9b871d2c64190c3aa3a7cb396408b3f154a5d6d1d847f4a` | 2026-09-15T14:55:08.025Z |
| A2 | `fr-2019-06337` | 200 | text/html | 147,329 | `fa4e9c194525183eddb963ca1f93cd37682f2beae86dc75355c56c7c827a5a0b` | 2026-09-15T14:55:09.979Z |
| A3 | `fr-2026-09372` | 200 | text/html | 16,077 | `942633494d96472eff43a0e5e575e7a7f58775002356466f969cb2f129dc2582` | 2026-09-15T14:55:11.956Z |
| A4 | `fr-2015-20888` | 200 | text/html | 9,130 | `4f7fe6fa666e585afe40fa6842a5dc9a9b070d66bc923ce67e3fe557a4409446` | 2026-09-15T14:55:13.945Z |
| B1 | `statute-12-pg939` | 200 | application/pdf | 1,122,216 | `64fb6c118a36f120195c4bbb2958f0f4063ba9c359a8eb93dd02074315d8e4ad` | 2026-09-15T14:55:55.391Z |
| B2 | `uscourts-ca9-15-35824` | 200 | application/pdf | 672,713 | `25d11c6adf170cf0d906542d7f2cb4dcb6fc7cb47f56b2b475e4e15ef8b9351b` | 2026-09-15T14:55:56.775Z |
| B3 | `ca9-13-35474` | 200 | application/pdf | 252,123 | `31f890c75cb62a6c2d5e798c69dd314f4c54faaa303d58c99f224cfb860d09eb` | 2026-09-15T14:55:57.468Z |
| B4 | `wawd-09-01` | 200 | application/pdf | 2,035,657 | `257b7bed6916737ad0e7b8db491827eeed437ea66a2a64fa0eb9f866a36277a6` | 2026-09-15T14:56:00.673Z |
| M1 | `mods-statute-12` | 200 | application/xml | 4,025,743 | `151de62f879ba1f144cf075bc70a6a4ca929853c4782d09bd7a7b3acc007896f` | 2026-09-15T14:56:02.189Z |
| M2 | `mods-uscourts-ca9-15-35824` | 200 | application/xml | 15,742 | `716cf70c1ab53792bf1d39f031d39a1f1d1d6b9f5f335f290b6a52dc289fd43f` | 2026-09-15T14:56:03.498Z |

Totals: 10 attempts, 10 complete, 0 failed, 0 retries, 8,618,306 encoded and
decoded bytes, 3 hosts, 2 source families. `bounded-operation-runner.mjs verify`
returned `valid: true` with 10 objects and matching counters. The ceilings in
the packet (10 GETs, 64 MiB per response, 60 second deadline, three hosts)
were not approached.

### Item review per object

Identity was checked locally from the acquired bytes (no network, no text
printed beyond fixed markers), digests were recomputed, and each object was
screened for the content classes that must never reach an output. The same
facts are bound to the provenance record's acquisition evidence items.

| Receipt | Identity | Privacy screen (inside the object only) | Reuse basis |
| --- | --- | --- | --- |
| `fr-2024-12669` | Confirmed from bytes: `[FR Doc. 2024-12669 ...]`, volume 89 number 118 header, page 51600 in the header line, names the Tribe | FOR FURTHER INFORMATION CONTACT block and a telephone-shaped string present | NARA/GovInfo edition policy per the 2026-09-02 review; metadata and link |
| `fr-2019-06337` | Confirmed from bytes: `[FR Doc. 2019-06337 ...]`, volume 84 number 66, page 13604 in the header line, names the Tribe | same block present | same |
| `fr-2026-09372` | Confirmed from bytes: `[FR Doc. 2026-09372 ...]`, volume 91 number 91, page 25865 in the header line, names the Tribe | same block present | same |
| `fr-2015-20888` | Confirmed from bytes: `[FR Doc. 2015-20888 ...]`, volume 80 number 165, page 51836 in the header line, names the Tribe | same block with a telephone line present | same |
| `statute-12-pg939` | PDF 1.4, multi-page granule (five page objects observed by the reviewer), compressed streams; confirmed by the exact granule URL and the acquired STATUTE-12 MODS constituent titled as the 1855 Makah treaty | none detectable; text not extracted | GovInfo policies; metadata and link |
| `uscourts-ca9-15-35824` | PDF 1.6, 27 pages, compressed; confirmed by the exact URL and the acquired package MODS (docket 15-35824, institutional parties including the Makah Indian Tribe as appellant) | counsel and signature content assumed present; text not extracted | GovInfo policies; court reuse terms not located; metadata and link |
| `ca9-13-35474` | PDF 1.4, 59 pages, compressed, effectively empty Info title and a short non-identity XMP title; rests on the exact datastore URL and the lead's first-page read recorded in the groundwork session | `/s/` signature marker present | court reuse terms not located; metadata and link |
| `wawd-09-01` | PDF 1.5; XMP title names the 09-01 findings and memorandum; `09-01` and the Tribe's name present in bytes | party, witness, counsel and signature content assumed present | court reuse terms not located; metadata and link |
| `mods-statute-12`, `mods-uscourts-ca9-15-35824` | Package identifiers present; identity evidence only | institutional party lists only | GovInfo policies |

None of the ten objects is displayed, excerpted, exported or served. The
FederalRegister.gov and GovInfo APIs were not used; `FR-A1` remains unissued.

### Provenance record

`docs/development/makah-demo/tsdf-provenance-record-2026-09-15.json` gained,
for entries S-017, S-018, S-019, S-020, S-001, S-006, S-004 and S-007, an
`artifacts` item with the external object path and SHA-256, an
`Acquisition record` evidence item pointing at the receipt with the identity
verification text above, a dated `Source download` access record, and a field
link; S-001 and S-006 additionally carry their package MODS as `Other`
artifacts with `Repository` access records. `metadata_history.events` gained
ten `Acquisition` events (receipt path, object digest, exact `completedAt`)
and one `Review` event. The record re-validates against the schema copy after
the additions and after Prettier formatting. The `honor` section was not
touched: `authority`, `consent` and `sovereign_tier` remain the literal
"Not recorded" by owner decision.

## Roles, models and leases

| Role | Agent | Model | Outcome |
| --- | --- | --- | --- |
| Lead | session | Fable 5.1, high | Ledger, source reviews, provenance record, backbone, all runs and receipts, this handoff |
| Roadmap validator worker | `general-purpose` | `sonnet` | `scripts/validate-roadmap.mjs`, `tests/pipeline/roadmap-validator.test.mjs`; lease returned |
| Runtime worker (PDF media type) | `general-purpose` | `sonnet` | `src/pipeline/policy-custody.mjs`, `tests/pipeline/policy-custody-pdf.test.mjs`; lease returned; 7/7 and 99/99 policy tests |
| Profile and manifest worker | `general-purpose` | `sonnet` | `config/policy-sources.v2.mjs`, `scripts/prepare-policy-run.mjs`, `tests/pipeline/makah-demo-manifest.test.mjs`; lease returned; 9/9 and 17/17 runner tests |
| Privacy and provenance reviewer | `general-purpose`, read-only | inherited (Fable 5.1) | findings recorded below |
| Reference lookups | lead (four read-only page reads on the two court hosts, three robots files) | Fable 5.1 | recorded in the court datastore review |

The manifest factory and media-type contract were frozen by the lead before
the runtime and profile workers were dispatched in parallel with disjoint
leases; no worker issued a request.

## Privacy and provenance review

A task-assigned read-only reviewer (inherited Fable 5.1) audited every
changed and new repository file, the ten receipts, the ledger and the objects
(locally, printing only markers) after the acquisition. It returned
`PASS_WITH_MINOR_REPAIRS` with no material finding: no document text, contact
block, telephone number, email address, personal name or signature content
entered any repository file; every provenance artifact digest, receipt
locator and access record matches its receipt; the Honor section is
byte-identical to HEAD; exactly the ten packet URLs were fetched once each
with `retryOf: null` and no redirect; no PS09, release-root, `FR-A1`,
`G-B-GRANTS` or external-boundary text changed; and no code path can turn a
stored PDF into text. Dispositions:

| Id | Finding | Disposition |
| --- | --- | --- |
| F-04, F-05, F-06 | Page counts for two PDFs and the title description of the datastore PDF were overstated in the identity text | Closed: corrected in the provenance record evidence and the table above (27 pages; multi-page granule; empty Info title with a non-identity XMP title). No identity conclusion changed |
| F-09 | Federal Register "page marker" wording was loose; the page number sits in the header line for three of the four objects | Closed: reworded in the record and above |
| F-11 | Gate `G-MAKAH-DEMO-02` evidence said "ten URLs tabulated" where the packet tabulates eight and names the two metadata files in prose | Closed: reworded in `ROADMAP.yaml` |
| F-08 | Ledger end state and the outcome placeholders were unreconciled while the review ran | Closed by the follow-up section below |
| F-07 | The court profile's machine-readable `uses` (`excerpts: true`, `localDisplay`/`localExport: full_text`, as the packet required) exceed what the court review supports, since no reuse terms were located | **Owner item.** The lead did not change the sealed profile: this run produced no display, excerpt or export of any object, and the court review states the stricter documentary boundary. The owner may narrow the profile's `uses` to `metadata_link` before any later run that would display or export these objects, or record acceptance of the review's boundary as sufficient |
| F-10, F-12, F-13 | Privacy screens are non-exhaustive by design; robots observations are network facts the reviewer could not re-verify offline; the runner's text-window review helper is pre-existing and rejects PDF extraction | Noted; no change |

## Commands and actual outcomes

Focused results during the run (each copied from the terminal):

```
node scripts/validate-roadmap.mjs
Roadmap validation passed: 81 work items, 57 gates, 14 sources, 23 binding paths; statuses {"complete":42,"in_progress":1,"ready":1,"blocked":18,"deferred":2,"not_started":17}.
npm run test:roadmap            tests 441, pass 441, fail 0
npm run test:policy             tests 115, pass 115, fail 0   (99 existing + 7 PDF + 9 manifest)
node --test tests/pipeline/policy-custody-pdf.test.mjs      tests 7, pass 7
node --test tests/pipeline/makah-demo-manifest.test.mjs     tests 9, pass 9
node --test tests/pipeline/bounded-operation-runner.test.mjs tests 17, pass 17
npm run validate:backbone       22 JSON Schemas, 22 schema IDs, 1346 $refs, 123 Markdown files, 830 local links
npm run validate:foundation     passed (19 schemas)
npm run scan:source             583 tracked paths and 621 source files checked
node scripts/bounded-operation-runner.mjs verify --root I:\policy-sentinel-corpus-real-policy\makah-demo-02
{"runId":"makah-demo-02","attempts":10,"objects":10,"encodedBytes":8618306,"decodedBytes":8618306,"diskBytes":8644119,"valid":true}
```

The terminal serialized `npm run check` result and the commit record follow
in the last section.

## Gates confirmed closed and operations confirmed absent

No remote, push, Pages, publication, credential, terms acceptance, paid call,
third-party contact, private material, optional AI generation, notification,
dependency addition, PS09 gate change or release-root change occurred.
`FR-A1` was not issued; `G-B-GRANTS` and `G-B-GOVINFO` were not touched;
K0/S0/O0 remain outside product dependencies; `PS09-06-LOCAL-RC` is untouched;
no `nationAssociations` value exists. The next owner action is a
source-specific `G-J` decision for each acquired document and the identity
prerequisite `G-BIA-IDENTITY` before any Nation association; a successor run
requires its own packet.
