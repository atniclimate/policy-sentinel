# Real-policy discovery: session-cutoff continuation

Prepared 2026-09-05 after the session usage limit interrupted final browser
acceptance. The owner requested subagent triage, bounded fixes and a fresh
session handoff. This is a continuation of the already adopted
[full launch](ps09-real-policy-discovery-launch.md), not a new acquisition run.
The [outcome inventory](ps09-real-policy-discovery-outcome.md) and
[execution journal](../development/PS09-REAL-POLICY-DISCOVERY-01.md) retain the
implemented corpus, evaluation, findings and historical checkpoints.

## Exact cutoff

- PS09-03 and PS09-04 are complete only for the adopted bounded slice.
  PS09-05 is the sole `in_progress` item and remains unfinished. The owner
  requested this pause; it is not a source or permission impasse.
- `main` started at `39d738a`. Baseline implementation is `8e40df6`, expanded
  corpus/replay/search/output validation is `c9e84d8`. Cutoff repairs and this
  continuation were committed as `5d25167` (18 exact owned paths). A following
  ledger-only checkpoint may be the current HEAD. The 33 protected owner inputs
  remain untracked and preserved.
- The actual Chromium report at external path
  `review/browser/run-20260905144640878/report.json`, SHA
  `f956628141531ef150c1495d2c28be466a874d411cb62765f05ef1a643db1ab5`,
  records 23 passing assertions and 14 screenshots. **It is not accepted as
  completed browser validation.** Its old overflow check compared document
  width with an already expanded `innerWidth`: mobile configured at 390 CSS
  pixels expanded to 539 in the workbench and 628 in the dossier.
- Axe reported zero violations but retained 146 incomplete contrast node
  occurrences across three scans, not necessarily 146 unique defects:
  10 desktop cross-government `bgOverlap`, 117 mobile dossier obscured/obscuring
  nodes, and 19 mobile evidence-export partially obscured nodes. Inspect these;
  zero violations alone does not close this evidence gap.
- Independent review accepted the other strengthened functional oracles:
  exact served bytes, keyboard search and skip/focus return, source/context/class
  filters, known-date/future/unknown behavior, same-work and cross-government
  comparisons, support/contrary citations, dossier/JSON and observed page-network
  boundaries. The report retains 48 same-origin page/context requests across
  four isolated contexts, with no observed blocked/failed requests or runtime
  errors. This is not a system-wide network capture.

## Bounded repairs and validation

The built-profile global skip defect was fixed by aligning the workbench main
and internal links to `main-content`, retaining the static first skip link.
Loading/error mains are now focusable. The integration regression exercises
replacement of the loading main; 11 focused tests pass.

The corrected-oracle diagnostic at
`review/browser/run-20260905155808642/report.json`, SHA
`e293cdc6379427c65eef0f687b49a7255371b37a7bb1a957c88a1ad32aec8b04`,
passes desktop and fails mobile. Configured/client/visual width is 390 at
scale 1 while document/inner width is 539. One `.pw-snippet` text range reaches
541.546875px with `white-space: pre-wrap` and normal overflow wrapping.
The worker changed that class to `overflow-wrap: anywhere`, preserving its text.

The browser harness uses an explicitly supplied installed Playwright core
1.61.1 (Apache-2.0), Chromium 149.0.7827.55 and repository axe-core 4.12.1.
Its literal package load and resolved-entry equality preserve the existing S0
import-boundary checks. No package installation or lockfile change was needed.

Cutoff triage completed the worker's harness/workbench CSS repair and the lead's
research-output stylesheet repair. All worker write leases are returned.
The dossier/evidence stylesheet now permits long text to wrap and uses
border-box sizing. The corrected viewport oracle compares configured width
with layout, document and visual-viewport dimensions and scale; it fails
during early smoke checks. Any remaining axe incomplete yields an explicit
needs-review outcome rather than a passing report.
No `overflow:hidden` or other clipping workaround is an acceptable repair.
The repaired output is `build-215d11d8f2538a434ed92a0ba0dc83d1`, manifest SHA
`5dfe331dc39b09f6849c353097bb99296f713f2f12601d32bb9f926b7ba4ba3d`,
12 files and 19,619,873 bytes, with the unchanged discovery corpus. The global
skip repair plus workbench/import focused checks pass (18/18; final import
rerun 9/9).

The repaired-output smoke report, completed at 16:07:58 UTC, is
`review/browser/run-20260905160742146/report.json`, SHA
`9629dacf022b45f6534031e56c48ef1ff28d4f20f559f108b4fd625267b0ba80`.
All 13 scoped checks pass, with six screenshots. Workbench, dossier and
evidence pages each retain configured/client/document/inner/visual widths of
1440 desktop and 390 mobile pixels at scale 1, without element or text-range
overflow. All six axe scans have zero violations and zero incomplete rules or
nodes. The two isolated page contexts record 24 same-origin requests and zero
blocked/failed/external requests, page errors or console errors. The lead
inspected the repaired mobile dossier and evidence screenshots. This report
correctly records `mode: smoke_only`, `outcome: smoke_passed` and
`acceptanceComplete: false`; the full interaction journeys and desktop
cross-government contrast state still require fresh-session acceptance.
The independent evaluator verified the report and all six PNG hashes/sizes,
rechecked the geometry, axe arrays and network totals, and accepted this
limited smoke scope with full browser acceptance explicitly unfinished.

After all cutoff code repairs, `npm run check` exited zero: 1,516/1,516 unit
tests in 92 files, 99 policy tests, 18 hook tests, 13 legacy corpus tests and
30 spine tests with one Windows file-symlink skip. Format, lint, types,
runtime, roadmap/backbone, source scan and ordinary build/artifact all pass.
The ordinary synthetic artifact is `synthetic-8c965f0f020b3a25e8d9`, three
records, 575 recognition entries and eight validated assets. Protected custody
was rechecked: 76/76 identities, all three retired EV01 hashes and the unchanged
lockfile pass. No source requests or corpus changes were made by cutoff triage.

Before these last responsive repairs, `npm run check` passed in actual
PowerShell: 1,516/1,516 unit tests in 92 files, 99/99 policy tests, 18 hook tests,
13 legacy corpus tests and 30 spine tests with one Windows file-symlink skip.
Format, lint, types, roadmap/backbone, source scan and ordinary build/artifact
passed. Two historical hook symlink probes also reported host unavailability.
Ordinary synthetic build: `synthetic-80f21ec92c33bc1b03a7`, three records,
575 recognition entries, eight validated assets. These results do not prove
the subsequent CSS repairs or final browser acceptance.

## Custody and commands

Owned external run root: `I:\policy-sentinel-corpus-real-policy\discovery-01`.
The corpus has 210 works, 215 versions/renditions, 21,209 segments, 193 events,
11 relationships, nine reviewed analyses and three provisional findings.
The gold subset has 14 works and 19 versions. Discovery content digest:
`c9628a10139baf8457eff13279f8b286b3fb6852a77c2d6263b689c0fa027ca1`.
Serialized corpus SHA:
`7e9ee67f61432e7a3c1d087f63c8747286bb09bab5580d34078ee27ead0c16fe`.

Acquisition ended at 423 complete GET attempts, zero retries and
37,589,489 encoded/decoded bytes across two qualified source families and four
actual hosts. No acquisition is needed to fix or validate the UI. Preserve all
source objects, receipts, original evaluation freezes and omission-repair
archives. Do not rerun curation or research enrichment casually: their review
timestamps are evidence. All 76 protected owner/historical generated identities
and the three retired EV01 identities matched; 33 owner inputs remain untracked.

Frozen evaluation over the final discovery passes 66/66 identifiers,
14/14 supporting-version questions, 7/7 multi-document sets, 25/27 passages
(92.6%; unchanged 90% threshold), 30/30 exact citation replays and required
temporal/unknown checks. The two misses and original first-pass results are in
the [evaluation record](../development/ps09-real-policy-evaluation.md).
Final result SHA:
`4650800dfc89d1795f8f966ef0e7ba92daa7a676633df7a0bd96abe1163e8633`.
CSS/harness-only repairs do not justify retuning or repeating this evaluation.

The last pre-responsive-repair served output is
`build-445fc56f9abd77ac1d7762b95c28cafc`, manifest
`2a4460f0a5e1b41e2b0100e1c4639511551f0dc6ae8a5382cc75cb9ea84d77d6`,
12 files and 19,619,803 bytes. It is superseded by repaired build `215d11d8`
above. At handoff, `http://127.0.0.1:4181/` serves that repaired build from
the exact owned Node process PID 25480. Check the actual process and current
output pointer in the fresh session; rebuild and replace only the exact owned
server when needed. Never serve the corpus root.

```powershell
npm run policy:replay -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --name discovery
npm run policy:build:local -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --name discovery
npm run policy:serve:local -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --port 4181
```

Run the registered browser command against that served build:

```powershell
$policyRun = 'I:\policy-sentinel-corpus-real-policy\discovery-01'
$policyPlaywright = 'C:\dev\GeoBase\node_modules\.pnpm\playwright-core@1.61.1\node_modules\playwright-core'
$policyBrowser = 'C:\Users\PatrickFreeland\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe'
npm run policy:verify:browser -- --corpus-root $policyRun --playwright-core $policyPlaywright --browser $policyBrowser
```

The command installs nothing, changes no output pointer, blocks other origins
and writes immutable reports/screenshots only under the external `review/browser/`
namespace. A full run exhaustively paginates the 215-version mobile population
and can take several minutes. Append `--smoke-only` to first check geometry
and axe on the desktop/mobile workbench, dossier and evidence pages. That mode
records `acceptanceComplete: false` even when its scoped checks pass. Preserve
failures; fix early geometry first.
Print-media screenshots do not prove PDF pagination or a native print dialog.
This v2 local profile provides JSON/dossier exports, not CSV. No screen-reader
session or universal accessibility certification has been completed.

## Startup prompt for the fresh session

Continue `POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01` in `I:\policy-sentinel`
from this cutoff. The owner already adopted the full original launch and now
requests continuation of its unfinished demonstrated outcome. Preserve that
authorization; do not reopen a product interview or request permission for
the already authorized local repairs, builds, browser checks and commits.

1. Read applicable AGENTS.md, the complete ROADMAP.yaml, this handoff, the
   outcome and journal. Recover the binding launch/contracts through the
   backbone without restarting historical instructions. Verify Git, runtime,
   protected custody, actual output/server and outstanding write leases.
   Continue the existing goal if present; otherwise create the original bounded
   workbench goal without a token budget.
2. Keep PS09-05 the sole active item. Use bounded subagents for a concrete
   responsive/browser repair and an independent evidence review. Publish exact
   leases; tell workers they are not alone and must preserve others' changes.
   The lead owns shared output code, package/ledger and commits. Do not rely
   on an errored or incomplete agent report as acceptance.
3. Inspect the cutoff repairs, rebuild the same sealed discovery output and
   run the corrected early fixed-width smoke checks. Diagnose any remaining
   overflow by offending element and geometry. Retain legible full evidence
   and access to table content; do not hide overflow to get a pass.
4. Close the 146 earlier axe incomplete node occurrences through repaired rerun evidence
   or explicit, reproducible manual contrast/visibility adjudication. Preserve
   the original report. Inspect actual desktop/mobile screenshots, including
   comparison, dossier and evidence pages. Do not equate zero axe violations
   with complete accessibility evidence or accept auto-scaled mobile captures.
5. Rerun the full strengthened browser journeys against the exact approved
   rebuilt bytes. Verify actual same-work HB1812 original/session and
   cross-government EO13175/HB1018-original comparisons, evidence/omissions,
   dates, all filters, findings/counterevidence, dossier/JSON and page-network
   constraints. Independently review the final report and any manual findings.
6. Run required focused checks and `npm run check` after final product changes.
   Keep the ordinary synthetic artifact separate. No source acquisition,
   corpus re-curation or retrieval retuning is needed for this remaining work.
   Both controlled source-failure simulations already pass within their stated
   scope; do not claim automatic refresh or power-loss durability.
7. Only after objective acceptance, complete the bounded PS09-05 outcome,
   checkpoint zero active items, and leave the entire PS09 program blocked on
   PS09-02. PS09-06 is still gated and has unfinished identity/scenario inputs;
   do not activate it. Historical G-LOCAL-BROWSER retains its separate ordinary
   app/CSV scope; scoped v2 acceptance does not close that historical gate.
   Commit exact owned paths and update the outcome/journal/recovery pointers.
   Return the working URL/launch command, measured findings and limits, replay
   command, local commits and remaining release work.

Source gaps remain eCFR's access-consent predicate, Governor 403/incomplete
policy review and optional unqualified OLRC. Credentialed APIs remain closed;
qualified GovInfo keyless direct text is distinct. Preserve the two excluded
Washington bodies, seven disclosed broad omissions, unknown publication dates,
`general_jurisdiction`/`Unclassified` labels and unresolved identity facts.
Remote/push/publication/distribution, credentials/affirmative terms, paid/contact,
private data, new AI-provider calls, notifications and K0/S0/O0 convergence stay
closed. Do not revive EV01 or spend an old operation again.
