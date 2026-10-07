# GD-17 initial source survey checkpoint

Date: 2026-10-07. Branch: `demo/live-pages`.
Starting HEAD: `a5aadf11b6cc828b7f0f0a1c24890808b7dfc954`.

## Scope and current state

The owner continued after pickup of the GD-26 checkpoint. GD-17 is the selected
bounded documentation task under D-086/D-087. Its [development record](../development/gd17-initial-source-survey-2026-10-07.md)
links the federal, seven state and public Tribal/intertribal source matrices
and records write leases, source gaps, the pilot shortlist and required APIs.

The documentation and independent review are complete; the local implementation
checkpoint and terminal ledger bookkeeping are pending. GD-17 remains the sole
`in_progress` item until that bookkeeping records the actual implementation SHA.
No new source is dispatch-ready, no API integration is completed, and no source
payload has been acquired by this survey. Public documentation/index research
is evidence for planning only.

## Verification and preservation

Before edits, the complete required general-engine context was read and both
`npm run validate:roadmap` and `npm run validate:backbone` passed. Startup ledger:
116 items, 61 gates, 14 sources; 53 complete, 7 ready, 22 blocked, 2 deferred,
32 not_started and zero in_progress. Backbone: 22 schemas/IDs, 1,346 references,
146 Markdown documents and 911 local links.

All 36 pre-existing untracked files matched the previous checkpoint's recorded
path/SHA-256 inventory. No active Git operation, index lock or competing tracked
edit was found. Protected paths, historical profiles and sealed external
custody remain outside the write leases. Rechecking the inventory after writing
the survey found 36 preserved files and zero hash mismatches.

Independent source-evidence review found one P2 wording issue: the draft called
the preparation shortlist qualified. The repaired text explicitly reports an
empty newly dispatch-ready subset, and the reviewer confirmed closure and a
pass for documentation scope. Independent contradiction/sovereignty review
passed without a material defect. Neither review grants activation authority or
independently re-fetches blocked sources.

Current receipts:

| Check | Actual result |
| --- | --- |
| `npm run validate:roadmap` | Passed active state: 53 complete, 1 in_progress, 6 ready, 22 blocked, 2 deferred, 32 not_started |
| `npm run validate:backbone` | Passed: 22 schemas/IDs, 1,346 references, 158 Markdown documents, 983 local links |
| `npm run test:roadmap` | 473 passed; zero failures or skips |
| `npm run scan:source` | Passed: 648 tracked paths and 696 source files before staging the new documentation |
| `npm run validate:knowledge` | Exit 0; historical sidecar retains 17 explicitly stale document observations, no index rewritten |
| `npm run format:files -- <leased paths>` | Exit 0; formats ROADMAP.yaml. Repository `.prettierignore` intentionally excludes docs, whose reviewed wrapping is preserved |
| `git diff --check` | Passed |

The first active-state roadmap check rejected retained terminal recovery roots.
They were corrected to exactly GD-17 and PS09-02; the subsequent validator and
473-test suite passed. No validator/schema change or bypass was used.
Active validation receipt: `C:/dev/_scratch/policy-sentinel/gd17-2026-10-07/validation-active.json`.

Unchanged-code evidence remains in the [GD-26 handoff](2026-10-07-gd26-reproducible-checks.md):
47/47 hook tests and fresh-snapshot tests, 106 Vitest files with 1,763 passing
tests and 80 existing skips, lint/source scan and synthetic build receipts.
Those are carried receipts for unchanged inputs, not tests rerun by this
documentation survey. The global ignored `settings.local.json` formatting
failure remains visible and untouched; aggregate `npm run check` is not claimed.

## Boundaries and recovery

No profile renewal, provider-payload acquisition, registration, terms acceptance,
private-data transfer, paid call, contact, secret change, optional AI generation,
notification, push or deployment is authorized by this checkpoint. Known
NCAI/USET/eCFR/Oregon source-specific conditions remain visible. Historical
GovInfo/WA direct profiles expired 2026-10-05 and were not renewed. D-086/D-087
directions remain adopted; do not request the same blanket authorization again.

After this documentation task passes review, the terminal update must promote
both GD-18 and GD-33 to ready. GD-18 is the next lowest-priority ready item:
inventory managed storage and implement the measured capacity report under the
50,000,000,000-byte total cap, without acquiring or deleting source material.
GD-31 represents successor manifests before later dispatch. Required APIs and
the three-family pilot remain future implementation/acceptance work. Full
nationwide survey completion remains GD-33; PS09 identity/release gates and
K0/S0/O0 convergence remain unchanged.
