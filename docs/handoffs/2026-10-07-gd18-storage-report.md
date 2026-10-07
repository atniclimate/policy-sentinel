# GD-18 measured storage and capacity report

Date: 2026-10-07. Branch: `demo/live-pages`.
Starting HEAD: `b470385c056a0fad56f6a3557c7fcd5f2fd3fe70`.
Implementation checks and actual inventory are complete. Local commit and
terminal ledger bookkeeping remain pending until recorded below.

## Capability and limits

The owner requested continued functional implementation after the initial
source survey. GD-18 adds `npm run storage:report -- --manifest <local.json>`
and `--json` output, with a strict documented manifest and an offline test
suite included in `npm test`. It inventories declared managed roots using file
metadata, without opening source bodies or mutation-capable custody APIs.

The report accounts for originals, renditions, metadata, indexes, cases/exports,
temporary files and unclassified bytes. Existing runs are subdivisions, never
extra totals. Proposed retained bytes and concurrent staging/rebuild copies
share the 50,000,000,000-byte cap. Independent 10 GiB run and 20 GiB free-disk
limits remain; concurrent projections on the same filesystem are aggregated.
Missing, unstable, inaccessible, linked, aliased or truncated inventories cannot
return a positive forecast. Fixed error codes and configured opaque labels keep
storage paths, source names and document content out of output.

This is a logical-byte planning report, not an atomic filesystem snapshot,
reservation, source-admission decision or production-runner retrofit. It does
not prove whole-machine coverage or search performance. No acquisition,
automatic eviction, relocation, source reclassification or publication occurs.
The [development record](../development/gd18-storage-report-2026-10-07.md)
contains the exact write leases, declared inventory scope and hypothetical
source/format forecast assumptions. The [README](../../README.md#measured-storage-and-capacity-planning)
describes invocation, manifest fields and exit statuses.

## Measured baseline and verification

At **2026-10-07T08:57:34.806Z**, all twelve declared roots completed:
**558,104,040 logical bytes in 15,628 storage files**. The development record
contains root/category totals, run subtotals and the declared coverage. Historical
custody, unadmitted loose files, review/support overhead, archive copies and the
two initially overlooked repository namespaces are included. Unknown storage
classes remain counted, with no document-count or source-coverage inference.

The explicitly hypothetical three-format forecast adds 2,264,924,160 retained
and simultaneous copy bytes, for a projected **2,823,028,200 bytes**. It fits the
50 GB cap and run limits, but returns **`FREE_SPACE_FLOOR`**, forecast **refused**,
CLI exit **2**: the C: support volume has **15,024,418,816 bytes (13.9926 GiB)**
free, below 20 GiB. I: has at least 248,247,316,480 bytes free. The report applies
the floor conservatively to every managed filesystem even when a scenario
proposes no writes there; this does not imply an I: shortage or change the
production runner's target-only checks. Do not omit support storage or silently
relax the floor to produce a pass. No cleanup or movement occurred.

The local manifest and aggregate report are under
`C:/dev/_scratch/policy-sentinel/gd18-2026-10-07/`. The report was saved after
the scan; later logs/report bytes are outside that observation. Metadata checks
are not an atomic snapshot. Source-evidence aggregate agreement (43 files,
49,730 bytes) is not checksum proof; no custody bodies were read or rehashed.

Independent scope/privacy review passed. Code review's two Windows root/run
alias findings were repaired and independently closed. The late explicit
repository artifact exceptions also passed independent review. Final focused
suite: **29 passing tests, zero skipped**, including fourteen native-probe
failure modes with exact refusal assertions.

| Check | Actual result |
| --- | --- |
| `npm test` | Passed all component suites, then 106 Vitest files with 1,763 passing tests and 80 existing skips. Storage was 28/28 in this run. |
| `npm run test:storage` | Final code: 29/29 passed after the narrow repository-namespace allowance; no broad-suite rerun is claimed for that isolated delta. |
| `npm run lint` | Passed full lint again on final code. |
| `npm run typecheck` / `npm run validate:runtime` | Passed; selected Node 24.19.0, npm 12.0.2, Windows x64. |
| `npm run hooks:test` | 47/47 passed. |
| `npm run validate:roadmap` / `npm run validate:backbone` | Passed active state; final terminal receipt follows ledger closeout. |
| `npm run validate:knowledge` | Exit 0; retained 17 explicitly stale observations, no index rewritten. |
| `npm run scan:source` | Passed; staged final scope is verified before commit. |
| `npm run build` / included artifact validation | Passed: 3 synthetic records, 575 synthetic Nations, 8 assets; `synthetic-26b38f9cec3dba92d47c`. |
| `npm run format:check` | Exit 1 only for the pre-existing ignored local-settings file; scoped formatting passed. |

The known global formatting failure in ignored `.claude/settings.local.json`
remains outside the lease. Do not alter it, silently omit the failure or claim
aggregate `npm run check` success. The 36 pre-existing untracked user files
remain protected; the current check finds all 36 hashes unchanged and is repeated
at staging. No UI, accessibility, source-adapter or public-output behavior changed.

## Recovery and next work

GD-18 is the sole active work item until measured evidence and final validation
are recorded. After completion, promote GD-31 successor authority manifests and
release acceptance crosswalk, and GD-32 bounded offline storage/search design,
to ready. GD-31 is the next lowest-priority-number ready item. The subsequent
search design must lead to the finite analyst journey and measured implementation
tasks represented by that crosswalk; this report alone does not deliver them.

The adopted D-086/D-087 direction does not require another blanket approval.
Successor contracts must preserve the actual source-specific access/reuse gaps,
closed ungranted external operations and historical gates. No source review was
renewed and no new source became dispatch-ready in GD-18. The completed real and
Makah custody runs remain sealed; the public demo, K0/S0/O0, private material,
sibling repositories, runtime profiles and source contracts remain unchanged.

Recover through `docs/continuation-prompt.md`, the complete general-engine read
order and the live ledger. Verify branch/HEAD/status and run roadmap/backbone
validators before the next task's edits. Keep machine-local manifests, raw
aggregate reports and check logs outside Git. No remote push was performed.
