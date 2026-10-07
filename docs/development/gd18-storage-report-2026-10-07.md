# GD-18 measured storage report

Started 2026-10-07 from `b470385c056a0fad56f6a3557c7fcd5f2fd3fe70` on
`demo/live-pages`. The owner requested continued implementation for functional
improvement. GD-18 is the lowest-priority-number ready item; GD-17 is complete.
The full general-engine context was read in this conversation and reused after
checking the new checkpoint. Both required startup validators pass.

## Bounded capability and authority

Implement a read-only `storage:report` command for explicit project-managed
roots. Measure logical file bytes and categories without reading document
contents. Forecast concurrent retained growth and temporary rebuild space
against 50,000,000,000 bytes, separately preserving the 10 GiB per-run limit
and 20 GiB post-write disk floor. Missing/unstable/inaccessible/linked or
truncated inventory cannot produce a positive capacity result. A report is
planning evidence; it cannot admit source material or bypass runner checks.

Authority is local general development under G-GENERAL-DEV-01 and the adopted
D-086 storage direction. D-087 public-source decisions remain unchanged.
No acquisition, profile renewal, terms acceptance, registration, private-data
content inspection, transfer, deletion/relocation, remote push or publication.
No historical corpus is opened through mutation-capable custody APIs.

## Path leases and review

- Storage implementation worker: `src/pipeline/storage-report.mjs` and
  `tests/pipeline/storage-report.test.mjs` only.
- Root: `scripts/report-storage.mjs`,
  `tests/pipeline/storage-report-cli.test.mjs`, `package.json`, `README.md`,
  `ROADMAP.yaml`, `docs/continuation-prompt.md`, this record and
  `docs/handoffs/2026-10-07-gd18-storage-report.md`. Root is sole Git writer.
- Context/roots auditor and storage-code explorer: read-only. Independent
  reviewers will inspect the implementation, refusal behavior and preservation.

Protected: existing custody/runner/source modules, source configuration,
schemas, kernel/experimental/vision, demo/Worker, sibling repositories, sealed
custody and all 36 pre-existing untracked files. New aggregate reports and
machine-local manifests live outside Git under the task's scratch directory;
source bodies, private names, hashes and per-file inventories never enter the
report. No implicit whole-drive or sibling-repository scan is permitted.

The storage manifest names roots explicitly. Known project roots from the
earlier outcome records include real and synthetic custody, review/assurance
evidence, retained convention output and the managed archive. Separate support
roots and repository build output need explicit accounting; they are not
automatically classified as policy originals. Unknown files still count. A
configured root's absence is an accounting gap, not zero usage. No actual cold
drive/NAS path has been documented. Documented paths do not authorize content
inspection of the private or unadmitted material they may contain.

## Implementation and verification plan

The new module is isolated from `openCorpusStore` and `openPolicyRun`, which
can create locks or read custody content. It uses bounded stat/directory
operations, rejects overlapping roots and unsafe links, keeps category/run
subtotals within the one parent inventory, and groups forecasts sharing a disk.
No production runner or source-admission behavior changes in GD-18.

Node 24 filesystem documentation was checked through the find-docs workflow's
Context7 MCP route (no CLI installation). [Node filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html)
documents streamed directory iteration/closure, lstat symbolic-link semantics
and bigint filesystem statistics. Metadata checks are not a filesystem snapshot
or a defense against privileged concurrent path replacement; scan quiescent
roots and fail on detected change.

Tests must cover exact/over-limit totals, simultaneous projections, per-run and
shared-disk limits, overlaps, missing roots, partial traversal, unsafe links,
sanitized errors and no body/path disclosure. Run the committed focused suite,
then standing lint/type/test/build/source/roadmap/backbone checks. Preserve the
known ignored-local-settings global formatting failure, recording its exact
effect rather than editing that file or claiming aggregate success.

After synthetic validation, run a finite metadata-only inventory of the
documented managed roots. Report measured bytes separately from forecast
assumptions, with no provider/document count or capacity claim inferred from
opaque storage files. GD-31 successor contracts and GD-32 storage/search design
become ready only after GD-18 passes acceptance. GD-31 is the next item.

## Implementation checkpoint and review

The standalone module and CLI are written, with `storage:report` and
`test:storage` wired into the documented command surface. Initial focused tests
passed 24/24, including native Windows plain-directory success and junction
refusal. Independent scope/privacy review passed. Independent code review found
two material Windows alias cases: canonical root aliases could bypass a lexical
protected-path boundary, and run aliases could lose a retained run subtotal.
Both require repair and regression coverage before actual inventory or acceptance.
Additional native-probe failure coverage is being added. No completion claim is
made from this intermediate checkpoint.

The subsequent repair reapplies repository/home boundaries to canonical paths
and verifies root metadata identity. Every existing run/category prefix must
match the canonical root plus its declared relative path; aliases refuse the
forecast. Unsafe Windows components are rejected. Root short spelling remains
permitted after these checks because this host's temporary path uses one.
Independent re-review closed both defects with no new material finding. The
strengthened final focused suite passes 28/28, zero skipped, including fourteen
native child-failure modes that assert invocation and exact failure reasons.

## Declared baseline and forecast protocol

The local manifest at
`C:/dev/_scratch/policy-sentinel/gd18-2026-10-07/managed-roots.local.json`
declares twelve previously documented project-owned locations: real custody,
synthetic custody, review, knowledge assurance, organization review, convention
output, archive, task scratch, audit scratch, repository `dist` output, frozen
`generated-data/real-source-prerelease` evidence and repository `.cache` support
data. The last two were caught by an additional documentation-only coverage
audit before any actual inventory. Both exist as ordinary directories. The
frozen 43-file source evidence and EV01 helpers remain untouched; historical
byte counts are not substituted for the new measurement. The module permits
only these three named repository data namespaces, with canonical boundary
checks; it does not permit scanning the repository root or neighboring code.
The two known real-run subdivisions are counted within their parent, not added
again. All support overhead and unmatched files count conservatively toward the
same total. No cold drive/NAS location is known; no drive discovery is performed.

Only documented structural prefixes in the real-run roots receive a storage
category; opaque synthetic blobs and unknown historical/support files stay
unclassified. The five loose unadmitted PDFs in the real parent still count,
without their names, contents or hashes being inspected or emitted. Neither
metadata traversal nor a category changes privacy, admission or reuse status.

The forecast uses these explicit **hypothetical byte assumptions**, with no
document-count, coverage or usefulness prediction. They are planning scenarios,
not selected packet ceilings, acquired source sizes or replacement source reviews.
GD-31 must select actual finite manifests; later admitted measurements replace
these assumptions. All amounts below are MiB (1,048,576 bytes).

| Candidate format scenario | Originals | Renditions | Metadata | Indexes | Cases/exports | Retained addition | Concurrent staging/rebuild copy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Federal official text/XML | 100 | 100 | 25 | 100 | 25 | 350 | 350 |
| Regional legislature PDFs | 500 | 50 | 25 | 50 | 25 | 650 | 650 |
| Reserved intertribal PDF slot | 50 | 10 | 5 | 10 | 5 | 80 | 80 |

The three additions total 1,080 MiB retained plus 1,080 MiB simultaneous peak
copies, or **2,264,924,160 bytes** above the measured baseline. Their separate
planned run paths must remain absent; the report creates none. The intertribal
slot remains source-blocked despite its inclusion in this capacity exercise.
Doubling each retained addition reserves a full proposed-copy rebuild in this
example; a full existing-corpus rebuild would need its own additional estimate.
The forecast does not equate text bytes with search/browser memory or usable
documents. Bounded offline search and those measurements remain GD-32.

Run the actual inventory after test/build activity stops. Capture report output
in memory, then save it outside Git only after the scan completes, so writing
the report does not mutate the scanned scratch root during observation. A
complete result covers these declared roots at observation time only; detected
gaps must stay visible, with no passing forecast from partial accounting.

## Measured result and acceptance evidence

Observed **2026-10-07T08:57:34.806Z** (2026-10-07 01:57 Pacific), after the
full test/build run and final code checks stopped. All twelve declared roots
completed, with no inventory reasons: **558,104,040 logical bytes in 15,628
files**, or 1.11620808% of the total managed cap. File counts are storage entries,
not policy documents, admitted records, coverage or useful search results.

| Opaque root label | Logical bytes | Files |
| --- | ---: | ---: |
| real | 211,394,771 | 1,168 |
| synthetic | 98,415 | 17 |
| review | 177,822,059 | 11,592 |
| assurance | 48,681,338 | 662 |
| organization | 523,487 | 18 |
| convention | 21,157,752 | 66 |
| archive | 2,897,714 | 241 |
| scratch | 93,792,838 | 1,767 |
| audit | 538,536 | 19 |
| build | 418,304 | 12 |
| source-evidence | 49,730 | 43 |
| repository-cache | 729,096 | 23 |
| **Total** | **558,104,040** | **15,628** |

The known real-run subtotals are 196,815,407 bytes (1,140 files) and 8,644,119
bytes (23 files), both within the unchanged 10 GiB ceiling. They are already
included in `real`. The three hypothetical run directories remain absent.

| Structural storage category | Logical bytes | Files |
| --- | ---: | ---: |
| originals | 46,207,795 | 433 |
| renditions | 4,484,578 | 27 |
| metadata | 42,894,707 | 626 |
| cases/exports | 86,045,748 | 86 |
| unclassified | 378,471,212 | 14,456 |
| indexes / temporary | 0 matched | 0 matched |

Zero matched index/temporary files does not establish absence: bundled and
unmatched derivatives stay fully counted in other categories or unclassified.
The observed baseline replaces the historical 35/10/5 GB allocation and rough
document-size assumptions for this planning checkpoint. It supports no new
per-document source-size estimate; those remain for admitted calibration.

The three format scenarios project **2,823,028,200 bytes** including all
simultaneous proposed copies. They fit the managed cap and projected run limits,
but the report correctly returns **`forecast.status = refused`**, reason
**`FREE_SPACE_FLOOR`**, and CLI exit **2**. The C: support filesystem has
**15,024,418,816 bytes free (13.9926 GiB)**, below the required
21,474,836,480 bytes. The observed minimum on I: is **248,247,316,480 bytes**;
the refusal is not evidence of an I: shortage. All example additions target I:.

This report conservatively requires the disk floor on every declared managed
filesystem, including one receiving zero proposed writes. It is stricter than
a target-only runner check and does not modify production enforcement. No
cleanup, relocation or acquisition is needed to complete GD-18; GD-31/GD-32
preparation can proceed with this truthful refusal. No positive admission or
available-capacity guarantee is claimed from the logical cap remainder.

The raw aggregate report is outside Git at
`C:/dev/_scratch/policy-sentinel/gd18-2026-10-07/managed-storage-report.json`.
It was written after the observation and therefore does not count itself or
later check logs in that snapshot. No source body, name, hash or per-file list
was emitted or saved. The source-evidence count/bytes agree with the historical
43-file aggregate; this is not hash-identity verification. Source and custody
files were only inspected through read-only metadata operations.

Final-code focused suite: **29 passed, zero skipped**. The late explicit
repository-namespace allowance was independently reviewed and then rechecked
with full lint and this focused suite. The earlier full `npm test` passed all
component suites (storage was then 28/28) and **106 Vitest files, 1,763 passed,
80 existing skips**. The late change is isolated to the storage module and its
test; no broad-suite rerun is claimed after that narrow delta. Runtime,
47/47 hooks, typecheck, roadmap/backbone, knowledge validation, source scan,
synthetic build and artifact validation pass. The build contains 3 synthetic
records, 575 synthetic Nations and 8 verified assets, build ID
`synthetic-26b38f9cec3dba92d47c`.

Global `npm run format:check` exits 1 solely for ignored
`.claude/settings.local.json`; scoped formatting passes. That file is unchanged,
and aggregate `npm run check` success is not claimed. Check logs and JSON
receipts are in the same external task directory. Independent implementation
and scope/privacy reviews have no unresolved material findings. The reviews
explicitly accept complete inventory plus an honestly refused forecast.

## Local checkpoint and next item

Implementation committed at **`8dc3985e373aaf79d0e352eee8fe60284250ccd0`**,
**2026-10-07T02:00:33-07:00**. All ten staged paths belong to the declared
lease; the pre-commit source scan passed at 666 tracked paths and 702 source
files. Both diff whitespace checks passed. All 36 pre-existing untracked files
retained their SHA-256 hashes and remained untracked. No protected runtime,
source configuration, historical custody content or user file was changed.

The subsequent local bookkeeping checkpoint marks GD-18 complete, promotes
GD-31 and GD-32 to ready and leaves zero active items. GD-31 successor authority
manifests/release crosswalk is next; it represents the already-adopted owner
direction and finite later implementation, not new blanket permission.
The [handoff](../handoffs/2026-10-07-gd18-storage-report.md) carries recovery,
capacity limitations and final ledger receipts. No push or deployment occurred.
