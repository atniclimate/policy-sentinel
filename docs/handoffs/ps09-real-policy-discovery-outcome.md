# Real-policy discovery local outcome

Run `POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`, 2026-09-05. This is the outcome
record for the owner's adopted [launch](ps09-real-policy-discovery-launch.md).
The [execution journal](../development/PS09-REAL-POLICY-DISCOVERY-01.md) records
the implementation, independent reviews, repairs and custody checkpoints.

Current disposition: **bounded local workbench closure accepted through PS09-05**.
The cutoff continuation repaired mobile limitation-label wrapping and completed
browser validation with a separate independent manual disposition for ten
preserved axe incompletes. Corpus, frozen evaluation, offline replay, controlled
source-failure exercises and the final repository check pass. There are zero
active work items. The PS09 program remains blocked on PS09-02 identity/scenario
evidence; PS09-06 is unstarted and gated. The earlier rejected reports are retained; the
[cutoff continuation handoff](ps09-real-policy-cutoff-continuation.md) records
their exact failures and the already adopted local repair scope.

## Launch and replay

Run from `I:\policy-sentinel` using the selected Node 24.19.0/npm 12.0.2 runtime:

```powershell
npm run policy:replay -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --name discovery
npm run policy:build:local -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --name discovery
npm run policy:serve:local -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --port 4181
```

Open `http://127.0.0.1:4181/`. The dossier is `/dossier.html`, its exact evidence
is `/evidence.html`, and the structured research export is `/research.json`.
All views derive from the same canonical corpus. The local server admits only
its verified output files. Source objects and review files remain external and
are not HTTP routes. Ordinary `npm run build` still produces synthetic output.

The reviewed output is `build-9c79fb4da90fa2097c91ae61bae9b067`, manifest SHA-256
`ec13bd7878c4a4456e70701709f1c1ffe96c32c1893fd7207e2d646b9f9156c9`, containing
12 files and 19,619,912 bytes. The registered local build command exited zero.
Node PID 13708 serves it on 127.0.0.1:4181 at this checkpoint; verify the actual
process and output pointer before replacing a future server. Independent byte
comparison with the cutoff output confirms that corpus, research, dossier,
evidence, local profile and dossier stylesheet are unchanged. The workbench
stylesheet now wraps long limitation labels with `overflow-wrap: anywhere`.

## Browser repair and review evidence

Run the installed browser harness against that exact served output:

```powershell
npm run policy:verify:browser -- --corpus-root I:\policy-sentinel-corpus-real-policy\discovery-01 --playwright-core C:\dev\GeoBase\node_modules\.pnpm\playwright-core@1.61.1\node_modules\playwright-core --browser C:\Users\PatrickFreeland\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe
```

The runtime is Playwright core 1.61.1, Chromium 149.0.7827.55 and axe-core 4.12.1.
No installation or lockfile change was required. Reports and PNGs are immutable
under the external run root's `review/browser/`; they contain source excerpts
and are not committed or served. Append `--smoke-only` for the smaller diagnostic.
Fresh repaired-build smoke `run-20260905164101800/report.json`, SHA-256
`92d2d38fe9457bc6282e855d011371e89a6cb7a9c19616f38181f96f4d141cae`, passes
13 checks, six screenshots and six axe scans without violations or incompletes.

Preserved full report `run-20260905162640052/report.json`, SHA-256
`c9218c0182c6b1cfd4afaf8fd2b335606b0e7527bdfed40a563caca4dd254dbd`, records
25 passing journeys but ten desktop contrast incompletes and two mobile label
text ranges beyond 390px. The follow-up `run-20260905164217415/report.json`, SHA
`f8bf390a0cd2548f6c74491a1b1d92945ee99216ba546d72d4d1be6b40ee6c5d`, has
25 passing journeys and all 14 geometry checks clear, with 28 screenshots.
It still exits 1: ten original and ten targeted axe node checks remain
`bgOverlap` incompletes. Independent review additionally required a centered
mobile warning-list screenshot and character-level evidence for one narrow
text-range hit-test mismatch. The final harness records those diagnostics while
preserving the original range observations and both layers of axe incompletes.

Final report: `review/browser/run-20260905165432392/report.json`, 2,517,831 bytes,
SHA-256 `23891ff83aec1ad1e299dbc5b6df81341c201c47703155c6f327e01505c5f639`.
The lead and independent acceptance auditor verified its hash, all 28 PNG
hashes/lengths, build/manifest/corpus binding, all 25 passing journeys and 14
geometry observations with exact configured/client/document/inner/visual widths
of 1440 desktop and 390 mobile pixels at scale 1. Visible element and text
overflow arrays are empty at both viewport edges. All three opened mobile
warnings fit within x=37–353 and y=343.953125–492.734375 in the 390×844 viewport.
Their screenshot SHA is
`aeaabd2aa245c6e7b4db30e4f91cc1beffeaf912fa68c2f62f7e5d4ec0f8657c`.

The journeys verify keyboard skip/search/focus return, exact evidence and
omissions, source/context/class and mixed filters, known/future/unknown dates,
HB1812 original/session text comparison, EO13175/HB1018-original institutional
comparison, findings and counterevidence, dossier/evidence anchors and exact
JSON exports. Four isolated contexts record 48 same-origin page requests and
zero blocked, failed or external requests, page errors or console errors.

Eleven of twelve full axe scans have zero violations and incompletes. The
desktop cross-government scan retains ten `bgOverlap` nodes; all ten targeted
rescans also remain incomplete, with zero violations and zero passes each.
The immutable raw report therefore correctly retains command exit 1,
`outcome: needs_accessibility_review`, `passed: false` and
`acceptanceComplete: false`. The separate manual disposition below supplies
the bounded acceptance evidence permitted by the cutoff continuation.

The manual-review method binds the original exact selector and text in the
external report to its centered screenshot, viewport/scroll and text rectangles,
computed foreground and full background ancestry, font, opacity, image/filter/
blend properties, and per-character center-point hit tests. Character records
retain Unicode code points and UTF-16 offsets; original obscured samples retain
the characters whose rectangles cover them. These are layout measurements,
supplemented by screenshot inspection, rather than rasterized-glyph analysis.
Each target must be independently adjudicated; diagnostics cannot automatically
turn a `needs_accessibility_review` report into a pass.

The ten targets use the selector template
`li:nth-child(R) > .pw-result-card > .pw-passages > li:nth-child(P) > .pw-snippet`.
Their exact source text remains in the external report. Screenshot numbers use
the filename `desktop-cross-government-contrast-review-N.png` in the same run.

| N | Result R | Passage P | Visible non-whitespace characters | Manual disposition |
| --- | --- | --- | --- | --- |
| 1 | 23 | 2 | 184/184 | Resolved |
| 2 | 34 | 1 | 252/252 | Resolved |
| 3 | 41 | 2 | 252/252 | Resolved |
| 4 | 72 | 1 | 164/164 | Resolved |
| 5 | 131 | 2 | 252/252 | Resolved |
| 6 | 135 | 1 | 252/252 | Resolved |
| 7 | 167 | 1 | 112/112 | Resolved |
| 8 | 192 | 2 | 248/248 | Resolved |
| 9 | 209 | 3 | 122/122 | Resolved |
| 10 | 212 | 2 | 94/94 | Resolved |

**Manual disposition, 2026-09-05: all ten exact residual nodes resolved.**
The independent read-only acceptance auditor recommended bounded acceptance;
the lead adopted that finding within the already authorized local scope. Each
target matches exactly one original incomplete node, and reconstructed character
sequences match its retained text. All 1,932 non-whitespace characters have
positive, in-viewport rectangles and unobscured center-point hits. All ten
sealed screenshots were independently inspected and are legible without visible
occlusion. The opened mobile warnings and desktop/mobile comparison, dossier
and evidence captures were also visually reviewed.

Every target uses normal 16.64px/400 text with foreground `rgb(23,44,41)` over
the first opaque card background `rgb(255,254,249)`. Ancestor opacity is 1,
without background images, filters or blend effects. Applying sRGB relative
luminance and `(Llighter + 0.05) / (Ldarker + 0.05)` yields
**14.556094011405364:1**, independently calculated, above the 4.5:1 normal-text
criterion. Target 10's sole failed whole-range sample at
(899.0359375, 486.59375) maps only to `U+0020`, UTF-16 `[98,99)`; its character
center is unobscured. This explains that sample only. No common cause is
asserted for all ten axe incompletes, and neither scan layer is relabeled clean.
The disposition is bound to this build, report, text and screenshots; a changed
build or target requires fresh evidence. It does not provide owner release
approval or universal accessibility certification.

The owner subsequently relayed a second session's independent read-only review
of this exact final run. That session accepts the tested scope through manual
adjudication, confirms the 25 journeys and resolved ten contrast nodes/mobile
warnings, and changed no files. The owner instructed final validation,
documentation and local commit while preserving the raw automated false result.

## Repository validation and proof limits

After the final product CSS change, `npm run check` exited zero: 1,516 unit tests
in 92 files, 99 policy tests, 18 hook tests, 13 legacy corpus tests and 30 spine
tests, with one Windows file-symlink skip. Two historical hook symlink probes
report host unavailability. Runtime, formatting, lint, types, roadmap/backbone,
source scan and build/artifact stages pass. The ordinary synthetic artifact is
`synthetic-e749dc2d2c6bffc42ad2`: three records, exactly 575 recognition entries
and eight verified assets. Focused workbench/import validation passed 18 tests.
The final capture-only harness follow-up passes formatting, lint and syntax.
The repeated full `npm run check` after that follow-up also exits zero with the
same test counts and all stages passing; its final synthetic artifact is
`synthetic-c6a4c9980cbefd6178c7` (three records, 575 recognition entries, eight
verified assets). Documentation/ledger formatting, roadmap/backbone validation
and source-boundary checks pass again before the local commits. Terminal
validation exposed a negative roadmap fixture coupled to live progress; its
small repair uses an explicitly valid schema-1.6 baseline and preserves the
exact identity-dependency rejection. `npm run test:roadmap` passes 3/3 against
the restored terminal ledger; formatting, lint and independent review pass.
The validator itself is unchanged.

The checks cover the local v2 workbench, JSON, dossier and evidence views.
They do not establish PS09-02 identity/scenario acceptance, PS09-06 release
acceptance, CSV behavior in the historical application, a screen-reader session,
universal accessibility certification, native printing or PDF pagination.
Page/context network observations are not system-wide network capture. Controlled
source-failure projections demonstrate checksum-bound stale reuse and omission
without prior proof; they do not implement scheduled refresh or prove power-loss
durability. Historical `G-LOCAL-BROWSER` retains its separate ordinary app/CSV
scope. Publication and every separately closed external operation remain closed.

## Demonstrations using retained identities

1. Search `HB 1018` and select the two named original/session version cards
   for `work-wa-2025-26-hb1018` (the work has three retained versions).
   Choose **Compare text versions** to compare
   `version-wa-2025-26-hb1018-original` with
   `version-wa-2025-26-hb1018-session`. Inspect exact unchanged text that moved
   between source positions. Equal ordinal paths are not provision identity.
2. Inspect `work-wa-2021-22-hb1812`, original and session versions, then the
   `research-finding-wa-version-change` finding. Its reviewed consultation
   paragraph changes, while the HB1018 pair carries over. Unaligned occurrences
   are not automatically classified as added or repealed provisions.
3. Open `version-fr-2023-01483-publication` and its explicit relationship to
   `version-fr-2020-23984-publication`. Apply source-availability cutoff
   `2023-12-31`.
   `version-fr-2026-16965-publication` is excluded; its later proposed-rule
   status is not an enacted or effective status. The cited 2001 rule remains
   an unresolved target because that instrument is not retained.
4. Use institutional-procedure comparison for EO13175
   (`version-fr-00-29003-publication`), Washington SB6175
   (`version-wa-2011-12-sb6175-session`) and SB5141
   (`version-wa-2021-22-sb5141-session`) in two pairwise comparisons:
   EO13175 with SB6175, then SB6175 with SB5141. Inspect analyst codes linked to source
   passages for actors and reporting destinations, plus uncoded dimensions
   such as trigger. These are provisional reviewed descriptions, with no
   inferred Nation association or legal equivalence.

## Corpus and coverage

The final discovery contains 210 work identities, 215 versions, 215 retained
text renditions, 21,209 evidence segments and 193 source-stated date events.
The gold subset contains 14 works and 19 versions across final rules, a proposed
rule, executive orders and bills. Its federal and Washington contexts connect
regulatory history with consultation, siting and institutional procedures.
Four works have multiple versions (HB1018, HB1812, SB5141 and SB6175); three
chains are covered by the frozen evaluation questions. These remain separate
from relationships between different instruments.

Seven federal instruments use qualified GovInfo HTML renditions. Seven gold
Washington works span selected 2012, 2021–2023 and 2025 material. The broader
sample adds 196 Washington 2025 session-law works from a fixed chapter-order
sample of chapters 1–200. Chapter 1's initiative and chapter 2's salary schedule
fall outside the chosen numeric-bill interface. Of 198 eligible captured bills,
SB5128 is deferred for ambiguous amendment markup and HB1389 for extraction
truncation caused by a blank statutory form. Seven accepted broad renditions
have explicitly located conservative-filter omissions, including false
positives involving citations and blank forms. Omitted text cannot support an
absence conclusion.

All works remain `general_jurisdiction` and `Unclassified`. Washington
publication/source-version dates remain unknown; unqualified whole-document
effective headers are separate events. Partial vetoes and section-specific
dates require source inspection. An effective-event cutoff does not calculate
current law or apply repeal effects. Neither exact ATNI membership nor
comprehensive regional coverage has been established.

The run made 423 accounted GET attempts, all complete, with zero retries and
37,589,489 encoded and decoded bytes. Two qualified source families use four
actual acquisition hosts: `www.govinfo.gov`, `leg.wa.gov`, `app.leg.wa.gov` and
`lawfilesext.leg.wa.gov`. These counts are below the adopted four
family, ten host, 2,000 request and 2 GiB encoded/decoded ceilings. Retained
external bodies are never committed. The
[dated source review](../source-reviews/real-policy-direct-2026-09-05.md) and
[source profiles](../../config/policy-sources.v2.mjs) record the exact interfaces,
allowed local uses and restrictions. eCFR remains blocked by its reviewed
privacy access-consent predicate. The Governor route returned 403 and its
complete policy review was unavailable. OLRC remains unqualified and optional.
These gaps do not authorize an unreviewed fallback. Public redistribution of
the accepted local corpus remains closed.

## Evaluation and findings

The [independent evaluation](../development/ps09-real-policy-evaluation.md)
preserves 18 frozen questions, four originally reserved questions, original
failures and repaired regressions. The final expanded population passes:

| Measure | Result |
| --- | --- |
| Exact identifier assertions | 66/66 |
| Complete supporting-version questions | 14/14 |
| Required supporting-version instances | 21/21 |
| Multi-document questions | 7/7 |
| Supporting passages | 25/27 (92.6%; frozen threshold 90%) |
| Unique citation replays | 30/30 |
| Required temporal/unknown checks and no automatic answer output | Pass |

The initial untuned baseline recovered 19/27 passages and 6/7 multi-document
sets. Its reserved passage subset recovered 3/4; the repaired regression
recovers 4/4. Two final passage misses remain: FR 04-15218 paragraph 89 ranks
127 in the pooled result, and HB1216 div194 is absent. Small purposive samples
do not establish general retrieval quality. No threshold was lowered.
Unsupported cases test retrieval behavior and the absence of automatic answer
generation; they do not measure a generated-answer system's abstention accuracy.

A separately frozen omission-metadata repair preserves every source byte,
parser recipe, text segment, question, expected span and timestamp. Exact
before/after rankings and scores match. The old corpus and evaluation remain
archived externally; the repair addendum identifies the corrected gold.

The corpus carries 11 explicit source-linked relationships, nine reviewed
institutional analyses and three falsifiable findings:

- Selected consultation mechanisms assign different actors, triggers and
  reporting destinations. This does not establish equivalent enforceable rights
  or measured compliance.
- The retained roadless sequence does not establish a monotonic improvement
  in consultation practice or outcomes. Source status and agency statements
  support a limited chronology, with missing consultation/outcome evidence.
- The two reviewed Washington bill pairs contain both wording change and exact
  carryover. Two pairs do not establish a general legislative trend.

Each finding retains its population, supporting and contrary evidence, rival
explanations, missing evidence and next disconfirming test. Research coding is
limited to that reviewed population, not projected onto all 210 works.

## Identities and remaining acceptance

Discovery content digest:
`c9628a10139baf8457eff13279f8b286b3fb6852a77c2d6263b689c0fa027ca1`.
Serialized SHA:
`7e9ee67f61432e7a3c1d087f63c8747286bb09bab5580d34078ee27ead0c16fe`.
Final evaluation result SHA:
`4650800dfc89d1795f8f966ef0e7ba92daa7a676633df7a0bd96abe1163e8633`.

Original launch branch/HEAD: `main` / `39d738a`, with implementation baseline
`8e40df6`. This cutoff continuation starts from `main` / `51f0b8a` after cutoff
repair commit `5d25167`. The verified ending implementation checkpoint is
`main` / `ee229150c8698fc76a5297256452f341f8bb4b2d`, parent
`51f0b8a33aeb666ec7ff82855cbf7d9e6bb06a3f`: exactly 13 reviewed owned files,
883 insertions and 163 deletions. Independent commit review confirms that
the index and tracked worktree are clean, with only the 33 protected inputs
untracked. This following three-file ledger/journal/outcome checkpoint records
the actual implementation SHA without rewriting history. All worker leases
are returned. The `browser_repair_review`
worker implemented the CSS/harness diagnostics and final roadmap test fixture;
the independent
`acceptance_auditor` and its ledger reviewer remained read-only. The lead owns
shared documentation, build/server, final review and commits.

All 76 protected owner/historical evidence identities, the 21,724-byte custody
manifest, unchanged lockfile and three retired EV01 files were independently
rechecked and match. The 33 owner inputs remain untracked; no generated corpus,
report, source excerpt or real configuration enters the commit. The canonical
ledger now has 39 complete, 18 blocked, 17 not started, two deferred, one archived
ready and zero active items. No remote, push, publication, account, paid call,
contact, secret change, private-data input, optional AI provider or notification
operation was performed.

PS09-02 originating identity/scenario acceptance remains unresolved. PS09-06
release acceptance, broader geographic/scenario evidence and separately closed
external operations remain outside this bounded functional slice. The next
owner action is to select an exact PS09-02 originating-evidence/scenario packet
with bounded operation, custody and review authority; PS09-06 requires its own
later authorization after prerequisites are accepted. A fresh session should
read this outcome, the journal and complete roadmap, verify Git and custody,
and preserve the terminal state. Local replay/inspection remains available;
do not restart acquisition or the completed cutoff startup.
