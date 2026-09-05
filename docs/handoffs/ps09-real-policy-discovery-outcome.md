# Real-policy discovery local outcome

Run `POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`, 2026-09-05. This is the outcome
record for the owner's adopted [launch](ps09-real-policy-discovery-launch.md).
The [execution journal](../development/PS09-REAL-POLICY-DISCOVERY-01.md) records
the implementation, independent reviews, repairs and custody checkpoints.

Current disposition: final browser validation in progress. Corpus, evaluation,
offline replay, both controlled source-failure exercises, local build/serve,
HTTP checks and the full repository check pass. The browser connector is empty;
the earlier owner-approved local Chromium alternative is installed and is now
being exercised with a fresh isolated context.

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

## Demonstrations using retained identities

1. Search `HB 1018` and select `work-wa-2025-26-hb1018`. Compare
   `version-wa-2025-26-hb1018-original` with
   `version-wa-2025-26-hb1018-session`. Inspect exact unchanged text that moved
   between source positions. Equal ordinal paths are not provision identity.
2. Inspect `work-wa-2021-22-hb1812`, original and session versions, then the
   `research-finding-wa-version-change` finding. Its reviewed consultation
   paragraph changes, while the HB1018 pair carries over. Unaligned occurrences
   are not automatically classified as added or repealed provisions.
3. Open `version-fr-2023-01483-publication` and its explicit relationship to
   `version-fr-2020-23984-publication`. Apply a 2023 source-availability cutoff.
   `version-fr-2026-16965-publication` is excluded; its later proposed-rule
   status is not an enacted or effective status. The cited 2001 rule remains
   an unresolved target because that instrument is not retained.
4. Use institutional-procedure comparison for EO13175
   (`version-fr-00-29003-publication`), Washington SB6175
   (`version-wa-2011-12-sb6175-session`) and SB5141
   (`version-wa-2021-22-sb5141-session`). Inspect analyst codes linked to source
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
external bodies are never committed. eCFR and other unqualified candidates
remain source-specific gaps.

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

Starting branch/HEAD: `main` / `39d738a`. The implementation baseline is
`8e40df6`; final validation and commit identities will be recorded here when
verified. Protected owner inputs and retired EV01 evidence retain their
existing custody boundary. No remote, push, publication, account, paid call,
contact, secret change, private-data input, optional AI provider or notification
operation was performed.

PS09-02 originating identity/scenario acceptance remains unresolved. PS09-06
release acceptance, broader geographic/scenario evidence, visual browser
verification and separately closed external operations remain outside a claim
that this bounded functional slice proves the entire product complete.
