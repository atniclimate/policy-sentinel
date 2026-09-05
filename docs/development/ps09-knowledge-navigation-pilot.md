# Knowledge navigation pilot

Predeclared before first generated reading view or timing run, 2026-09-05.
This is an agent retrieval pilot, not a human usability study. Native Obsidian
control is unavailable in this session; application rendering, keyboard behavior
and human comprehension remain unproven. No personal vault is involved.

## Frozen questions and answer key

| ID | Question | Required answer and exact source |
| --- | --- | --- |
| Q01 | Who owns current work status? | ROADMAP.yaml; the catalog does not own it. `knowledge/catalog.yaml` authority_owners.work_status and `ROADMAP.yaml` current_focus. |
| Q02 | What prevents local RC? | PS09-02 identity/scenario evidence; PS09-06 remains unstarted. `ROADMAP.yaml` finish_states.ps09 and `docs/handoffs/ps09-real-policy-discovery-outcome.md`, Identities and remaining acceptance. |
| Q03 | Was the final browser automation clean? | Raw false/needs_accessibility_review; separate exact ten-node manual disposition bound to the existing build. `docs/handoffs/ps09-real-policy-discovery-outcome.md`, Browser repair and review evidence. |
| Q04 | Can acquisition restart from unused ceilings? | No; authority ended. Only reviewed local-output may be served on loopback. Same outcome, Launch and replay; `AGENTS.md`, Repository and artifact boundary. |
| Q05 | Does recognition establish ATNI membership? | No; originating membership evidence is separate and no fixed count defines the cohort. `docs/pnw-scope-and-acceptance.md`, cohort/authority contract. |
| Q06 | Do O0's different raw and canonical hashes prove damage? | No; raw CRLF and canonical LF identities differ. O0 stays sealed/unaccepted. `ROADMAP.yaml` O0 seal and `docs/development/ps09-run-01-custody.json`; catalog O0 pin has its own declared domain. |
| Q07 | What is the citation chain? | Output to analysis/citation/segment/rendition/captured object; hashes are byte identity, not truth or reuse permission. `docs/adr/ps09-canonical-corpus.md`, Minimal object, identity and citation spine. |
| Q08 | What does 25/27 measure? | Supporting spans pooled in top20 after repair, with two misses; disclosed reserved cases are regressions. `docs/development/ps09-real-policy-evaluation.md`, Final expanded discovery regression. |
| Q09 | Do the three findings cover all works or prove diffusion? | No; two provisional and one null, bounded evidence only. `docs/handoffs/ps09-real-policy-discovery-outcome.md`, Evaluation and findings. |
| Q10 | Are inherited bibliography entries publication-reviewed? | Seven require fresh primary review. `knowledge/references.yaml` inherited records and `knowledge/entries.yaml` research limits. |

## Method and acceptance fixed in advance

Run the same ten questions against (A) backbone plus `rg` and (B) the detached
index/cards, then open the exact authoritative source. Record per-question
machine retrieval milliseconds with a monotonic clock, and a separate root
source-correctness judgment against the frozen key. Timings include local lookup
and source read, exclude model reasoning, and are an agent retrieval proxy.
They are not human answer times or statistical evidence of a speed improvement.

Require 10/10 source-correct answers, zero invented authority or acceptance,
and visible stale pins with historical citations still verifiable. Practical
limits: each lookup <=60 seconds; generation <=60 seconds; one controlled source
revision requires <=5 authored metadata edits and <=5 minutes of active upkeep.
No speedup threshold is required. If either route fails the answer key or a
limit, retain the failure and diagnose it; do not change these criteria.

The controlled revision will append one current navigation sentence to README
after the first run. Regenerate and repeat all ten questions without silently
refreshing source pins. Measure generation/upkeep and verify README freshness
retains a visible stale flag and changes its reported current hash while its
historical Git citation remains valid. README is already stale from the command
surface edits; a second stale state is not presented as a new match-to-stale
transition. Other ongoing
editorial edits precede the first run; pause those edits during both pilot runs.

## Results

First execution stopped with exit1 at Q06: the measurement script looked for
O0's seal in the custody registry instead of ROADMAP, which was already in the
frozen answer key. The original `pilot-01.log` remains preserved. The script
was corrected to the exact ROADMAP canonical seal; no question, answer or
threshold changed. Repaired first run and post-revision run both exited0.

Root opened the generated cards and original source evidence, and checked all
ten answers against the frozen key: 10/10 source-correct for each route in both
runs; zero invented authority or acceptance. The script itself verifies only
lookup/source identities, not semantic truth. Q10's bibliography is found by
`rg` despite lacking a direct backbone link; its generated reference card exposes
the inherited, unreviewed state. Cards point to original sources without copying
their bodies. O0 remains unaccepted and the browser report remains raw false.

| Question | First backbone/rg ms | First view ms | After revision backbone/rg ms | After revision view ms |
| --- | --- | --- | --- | --- |
| Q01 | 28.53 | 1.13 | 32.91 | 2.68 |
| Q02 | 24.80 | 0.92 | 47.39 | 2.80 |
| Q03 | 28.46 | 0.75 | 37.79 | 3.44 |
| Q04 | 38.68 | 1.86 | 45.28 | 3.15 |
| Q05 | 30.34 | 2.02 | 34.21 | 2.95 |
| Q06 | 25.33 | 1.26 | 44.59 | 2.85 |
| Q07 | 28.31 | 1.74 | 27.17 | 2.58 |
| Q08 | 28.11 | 3.40 | 39.76 | 2.89 |
| Q09 | 22.97 | 0.46 | 26.17 | 1.93 |
| Q10 | 22.05 | 0.49 | 33.32 | 2.29 |
| Total | 277.58 | 14.02 | 368.59 | 27.55 |

All lookups meet the predeclared60-second limit. These compare a known-path
`rg` child plus source read with a known-ID index/card/source read; process
startup and file cache affect the numbers. They exclude reasoning and measure
neither natural-language search nor human answer time. No general speedup or
usability claim follows from this small convenience sample.

First generation took7.338 seconds; regeneration8.564 seconds, both below60.
The controlled README sentence required zero metadata edits and8.965 seconds
of active edit/regeneration upkeep, below five edits/five minutes. Both views
show12 stale documents. README's current raw SHA changed from
`371c933cb4695ac5705f3895c56c2a9eee84aed7583d72d492b117ca50d94697` to
`691a398d7e394a51ca029e46800cd2d52095d875c576d36b8f11c9e6d941dc52`;
its historical Git SHA remains
`59baf3dda19e0e844b907be8698079600d69e96fff2bba3d499cb75ece86c3e8`.
All historical pins/47 locators remain verified; no silent refresh occurred.

Each view contains83 files/332583 bytes including its manifest. First manifest
SHA is `814e7ef183426a0824f8aaa8e3e1da12c64e6759a7d52dfa28bdc873058dc973`;
second is `c99a459ec81818d5c3fcb4c05d8ac329d0bf32c012e334bf895ad958ef52173a`.
The owned namespace preserves both generation logs/timings, first manifest and
validation report, and `pilot-01-repair.log`/`pilot-02.log` with individual source
hashes/lines. Later current-document edits require explicit regeneration; these
two pilot identities remain dated evidence. No native Obsidian or human study
was performed. Caught interruption/ownership tests are separate from this pilot.
