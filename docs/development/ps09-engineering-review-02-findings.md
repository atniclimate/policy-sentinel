# H02 engineering findings and simplification proposals

This is a finite delta to the completed
[assurance findings](ps09-knowledge-findings.yaml), not a second roadmap.
Planning/review date: 2026-09-05. The adopted prompt and actual checkpoints are
in [the journal](PS09-ENGINEERING-REVIEW-02.md). Original finding dispositions
remain intact. Root and independent reviewers inspected actual callers and
test registration across the five requested areas. No policy source was queried.

Root owns this reconciliation and the repair integration; the engineering and
authority/evidence reviewers are read-only. Work status and review status remain
separate: focused repair review has passed; final integrated acceptance is recorded
in the journal and outcome after the required check. Production locators below
refer to the H02 implementation revision recorded by the outcome, with raw tested
file hashes in the journal rather than an invented self-containing commit pin.

## Retained finding dispositions

The original register's implementation dispositions, rather than its historical
preparation_state fields, control this reconciliation. No closed item is reopened
without a new reproduction. These groups preserve every imported ID and point to
its existing individual evidence; they do not create new work items.

| Original IDs | Retained work status | H02 reconciliation |
| --- | --- | --- |
| FA-01; BG-01, BG-02, BG-03, BG-04, BG-05; BG-06; BG-07 | complete | Historical schema/authority repairs remain fixed; new schema 1.8 fixtures independently preserve their exact objects and closed gates. The original grouped BG-01..05 topic-mapping limitation remains explicit. |
| FA-02; CW-01, CW-02, CW-03 | complete | Existing finite crosswalk and corrected synthetic-profile/membership/taxonomy distinctions are retained by the new complete delta enumeration. This is plan coverage, not product acceptance. |
| FA-03; ROOT-04 | complete | Raw versus canonical hashes and historical versus current pins remain distinct; terminal raw-byte verification and unchanged catalog pins preserve their evidence. |
| FA-04; PILOT-01 | complete | Existing ten-question pilot and repaired source-selection evidence remain historical. No new pilot, held-out result or human reading acceptance is claimed. |
| ENG-01; ENG-06 | complete | All four previously omitted suites remain registered; the isolated intended runtime/CA oracle and historical runtime pin are unchanged. Current execution-graph review is below. |
| ENG-02; ENG-03; ER-01; ER-02 | complete | Existing rejection, primary/cleanup and redaction repairs remain covered. ER-04 below adds a distinct never-settling-cleanup guarantee without rewriting prior browser evidence. |
| ENG-04; ROOT-03; KG-01; KN-01, KN-02, KN-03, KN-04 | complete | Knowledge parser, identity, graph, UTF-8 and owned-publication safeguards remain in their actual callers and registered regressions; crash/concurrent-writer limits remain. |
| ENG-05; ROOT-01; ROOT-02 | complete | Native command outcomes and bounded aggregate diagnostics remain required. H02 does not execute acquisition children; existing injected/synthetic regressions retain their narrow proof. ER02-EVID-01 records this run's separate evidence-recording limitation. |
| ER-03; ER-04 | deferred at prior checkpoint | Explicitly adopted H02 reproductions and bounded repairs supersede only these two prior deferred dispositions; final scoped status/results are in the journal and outcome. |
| D-01 | deferred | Graphify remains no-go; no installation, integration or execution. |
| B-UI | blocked | Actual Obsidian application and human reading acceptance remain unproved; synthetic generation is not a substitute. |

## Findings and dispositions

| Finding | Evidence and implication | Disposition and next proof |
| --- | --- | --- |
| ER-03, medium verified failure | Actual policy-custody windowsProbe accepted stdin failure followed by exit zero and empty output. This can mistake an unexecuted inventory for a successful check. | Authorized bounded repair: explicit input delivery plus nonce-bound complete acknowledgement, bounded child outcomes and actual-module/native synthetic regressions. Final hashes/results belong in the journal; this does not qualify a source or prove hostile concurrent-writer safety. |
| ER-04, low verified failure | Actual sealBrowserReport awaited close/cancellation without a total deadline. A never-settling close prevented the owned report attempt in the first regression. | Authorized bounded repair: one finite cleanup collection/deadline, observed late settlements, detached immutable snapshot, separate primary/cleanup/write evidence and actual CLI redaction/nonzero checks. Does not prove process termination, bound earlier screenshot/context-close operations, or bound never-settling persistence. |
| ER02-ENG-01, medium untested risk | [policy-local-output.mjs](../../src/pipeline/policy-local-output.mjs) readOwnedFile awaits close in finally; a close failure could replace a primary read/stat failure. | Deferred, no repair in this lease. First reproduce dual failure at the actual function, then propose exact preservation semantics and caller regressions under later adoption. No observed historical data loss is claimed. |
| ER02-ENG-02, low untested risk | [knowledge validation](../../src/knowledge/validate.mjs) resolves powershell.exe through PATH, unlike the fixed absolute custody probe. | Deferred hardening/portability proposal. First prove environment resolution and supported Windows behavior with isolated inputs; no exploit or historical mis-resolution is claimed. |
| ER02-DOC-01, low documentation drift | data-contract described v2 integration as pending, counted 16 top-level schemas/14 foundation schemas, and used blanket unimplemented successor wording after bounded v2 local acceptance. | Narrow documentation correction to 18 top-level/16 foundation schemas and 1,297 references; distinguish retained 1.x, accepted local v2 and unresolved general four-output acceptance. No contract/schema/taxonomy mutation. |
| ER02-EVID-01, low development-evidence gap | The first measurement-harness focused failure was observed in tool output, but its original standalone log and pre-repair draft/input hashes were not captured. A later card-oracle typo, accounting-Boolean failure and intermediate native Unicode failure also have tool-observation records rather than complete original log/code pins. | Retain explicitly labeled reconstructed observations and null missing hashes; do not fabricate a first-draft pin. Later exact reviewed code/test/log hashes and pre-timing benchmark input/oracle pins establish their own evidence. The missing original identities are acknowledged, unrecoverable local process limitations, not benchmark or product proof. |
| ER02-ENG-03, low verified integration failure | Full check 02 identifies scripts/measure-engineering.mjs:554 at executed raw revision 89291727: its fixed builtin import(moduleName) is not statically auditable under the existing S0 guard. | Complete: nine literal lazy loaders preserve order and all denial/restoration semantics. The unchanged guard passes 9/9, measurement tests pass 14/14 and full check 03 passes. Original script and failed log are retained; no measurement is attributed to the final revision. |
| ER02-ENG-04, low verified lint failure | Full check 01 reports 17 no-undef Node-global references in the ER-04 source/test and coupled ER-03 test. Exact original locators and raw inputs are retained by the journal/check log. | Complete: explicit globalThis qualification preserves injected VM keys and clocks; lint and 92 assurance tests pass, followed by full check 03. Actual review reverses only that diff to reproduce previously accepted hashes. No lint rule or configuration exception. |

Current bounded work status for ER-03, ER-04 and ER02-DOC-01 is complete;
their actual scoped review recommendations are PASS and root accepts the
demonstrated repair/documentation behavior. ER02-ENG-01 and ER02-ENG-02 remain
deferred. ER02-EVID-01 is an explicit retained evidence limitation, not a claim
that unavailable first-draft identities were recovered. H02 terminal review
and its precise disposition belong to the journal and outcome.

## Reviewed behavior retained

Search and temporal operations require validated immutable corpus input. Their
source_available, corpus_observed and source_effective cutoffs retain unknown and
future evidence distinctions; metadata-only records cannot acquire invented
passages. Exact bytes, source/capture/rendition/citation references and bounded
cache behavior remain part of the reviewed path. No new correctness defect was
observed; that is not exhaustive correctness or real scenario acceptance.

Local build/output/custody guards protect distinct transitions: opening a run,
binding source profiles and captures, sealing, input/output checksums, replay,
owned writes and quotas. Repeated ownership checks are not redundant merely
because their syntax resembles one another. writeLocalOutput requires its
real_source_local contract; synthetic fixtures cannot be relabeled to obtain a
measurement. This run does not replay or write the preserved real output.

The pre-change execution graph contains 27 tracked .test.mjs files, all reachable
through check: hooks (1), corpus (1), spine (3), policy (9), assurance (1),
backbone (1), tier1 (3), knowledge (1), and nested pipeline checks (7). The nested
roadmap suite runs once in ordinary npm test. H02 adds the two registered
assurance test files; targeted aliases do not add a second ordinary execution.
The v2 fixture module deliberately guards suite registration when imported.
TypeScript allowJs is false, so .mjs modules are outside typecheck; runtime
fixtures and lint are material evidence. Broader checkJs migration is deferred.

Knowledge validation, navigation and publication were reviewed through their
actual callers. Git and native PowerShell startup are plausible cost contributors
and require observed attribution. Publication rollback tests establish caught
failure behavior, not operating-system crash durability or hostile-writer
recovery. Generic synthetic measurements do not establish human reading-view
usability or the Policy Sentinel-specific custody-reference path.

## Ranked simplification proposals — no implementation

Exactly three proposals follow. Benefit is provisional until measurements and
specific proof justify later selection. None reduces an authority or custody
check, and none is a present execution grant.

| Rank and candidate | Boundary, callers and tests | Migration / rollback | Benefit and reason to defer |
| --- | --- | --- | --- |
| 1. Shared pure temporal evidence eligibility helper | policy-search.mjs and PolicyWorkbench.tsx both express known-segment/cutoff rules. Keep source_available/corpus_observed/source_effective time bases, unknown/future behavior, visibility and exact citation eligibility. Existing search/temporal/UI fixtures require shared parity negatives. | Freeze truth-table fixtures first; migrate UI consumer first while comparing results against the existing engine; then one helper under reviewed inputs. Revert helper and imports together if any eligibility or passage difference appears. | Reduces semantic drift between search and UI. No measured speedup or defect proves urgency; defer until isolated parity design is adopted. |
| 2. Shared bounded Windows request/acknowledgement primitive | policy-custody windowsProbe and knowledge/validate native probes have different full-inventory versus selected-path obligations. Preserve each required inventory, absolute-runtime decision, reparse handling, bounds and fixed diagnostics. ER-03 tests and knowledge ownership/rollback tests remain independent. | Document each protocol and trust boundary first; add actual-module equivalence and malformed/native fixtures before changing the knowledge caller. Keep the current caller available for an exact revert. | May consolidate child lifecycle handling and make measured startup attribution clearer. Defer because knowledge PATH risk is unproven and batching could erase distinct stage checks. |
| 3. Separate authored v2 fixture factory from test registration | analyzed-corpus-v2.test.mjs exports fixtures consumed by search, temporal, local-output and research-output tests. Preserve fixture content, validation coverage, test count and imported registration guards. | Pin current fixture hashes and execution graph, move only the factory/import closure, and compare selected fixture outputs plus full suite reachability. Roll back factory and all imports together. | Improves clarity and can avoid incidental setup in dedicated tooling. Startup benefit is unmeasured; the measurement harness uses its own bounded factory without refactoring production/test consumers. |

Actual results and finite proof gaps are recorded separately in the
[measurement protocol/results](ps09-engineering-review-02-measurements.md) and
[acceptance delta](ps09-engineering-review-02-acceptance-delta.md).
