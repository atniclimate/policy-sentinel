# Real-policy discovery evaluation protocol

Prepared 2026-09-05 by the independent evaluation reviewer for
`POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`. This protocol implements the
[adopted launch](../handoffs/ps09-real-policy-discovery-launch.md) and its
[research rationale](ps09-real-policy-systems-research-2026-09-05.md). It is
an acceptance procedure, not evidence that the workbench or a source has passed.

The practical thresholds below were communicated to the lead before source
body acquisition, gold question selection, or search tuning. The reviewer
owns this document and the later independent evaluation; implementers own
the application and search. Shared-workspace separation is a review convention,
not secure experimental blinding or independent legal expertise.

## Corpus and scenario selection

The initial candidate families are the catalogued Roadless/Tongass and
Section 106 regulatory sequence, connected through participation and review
procedures to Washington siting and government-to-government consultation
instruments. Candidate selection follows the source reviewer's current
interface and use decisions. No candidate title, historical catalog statement,
search snippet, or source-review report is itself accepted passage evidence.

Select 12–20 distinct instrument identities for deep review across at least
three instrument classes and federal plus Washington contexts. Count document
identities, versions, renditions, provision granules, search records, and
acquisition attempts separately. Multiple CFR sections cannot inflate one
regulatory instrument into many gold documents. Broader discovery records are
reported independently, aiming toward 200–1,000 after the gold path works.

At least three actual version/status chains need explicit source evidence.
Unknown predecessors, unlocated successors, and unresolved citations remain
visible. Similar titles, shared citations, a matching docket, publication
chronology, or a common subject cannot create a status relationship. The two
families do not discharge the broader regional scenario or identity outcomes.

## Independent evidence freeze

After accepted source objects exist, the reviewer reads the retained objects
and verifies each highest-value passage against its source rendition. Freeze
expectations before inspecting search ranks or tuning to the questions.
The minimum is 18 source-grounded questions, including:

- Six requiring multiple documents or versions, with at least three of those
  comparing governmental contexts.
- An explicit earlier as-of cutoff with future documents and source events
  that must not support the earlier-state result.
- Four unanswerable or plausible-distractor cases. Some can overlap other
  categories; the report shows the overlap and actual denominators.
- At least four questions reserved for the independent first integrated pass,
  including cross-document, cross-context, and unanswerable cases.

Freeze each question's wording, query/filter inputs, expected disposition,
document and version IDs, rendition/object digests, exact supporting and
contrary spans, and forbidden documents or versions. Evidence spans use the
canonical rendition's declared byte-offset convention, text digest, locator,
and surrounding-context digest. A repeated quote requires a distinct locator;
matching words alone cannot identify the cited occurrence.

Record why every expected passage is necessary and any acceptable alternative
evidence explicitly. Expectation authoring may use source structure and exact
identifier lookup. It must not use evaluated search results as its oracle.
Changes for parser or identity defects create a new freeze with an explained
diff; retain the earlier freeze and never revise expectations to hide a miss.

Keep source-derived gold questions, excerpts, and expected-span manifests in
the new run's owned external review namespace. Git stores this protocol,
authored synthetic tests, code, and aggregate evaluation reports. The lead
publishes the exact external write lease before the reviewer creates those
files. No corpus bodies or actual source excerpts enter Git.

The visible training portion and reserved portion receive separate digests.
The lead receives the digests, counts, coverage, and freeze timestamp before
tuning. Reserved questions and spans remain undisclosed until the first
integrated evaluation. The reviewer records the tested code/configuration
identity and corpus digest, executes once, preserves the initial result, then
reveals any repair case. Revealed cases become regressions; repaired results
cannot be described as untouched first-pass performance.

## Questions and observable tasks

The shared question set should exercise exact identifier and provision lookup;
responsible institutional actors; source-stated procedure, trigger, condition,
exception, review and time constraint; earlier/later text; explicit amendment
and citation links; issuer versus custodian; and cross-context comparison.
These are question families, not frozen answers. Actual questions must be
written from the accepted documents without manufacturing a desired pattern.

An answerable question passes only with its required evidence. A multi-document
question is not complete when one relevant document is found. Passage recovery,
document/version correspondence, and the adequacy of evidence for the question
are measured separately. No model-generated answer service is required or
authorized. The user can investigate through search, exact evidence, and
labeled reproducible comparisons.

For an unanswerable question, a lexical hit can still be useful. Passing means
the application preserves the unknown or unsupported conclusion and does not
promote that hit into proof. An empty search result alone is not an abstention
test. Distinguish no match, not in corpus, unavailable source, unreviewed
material, and insufficient evidence for a requested conclusion.

The as-of test states its temporal basis: source publication/text availability,
source-claimed effectiveness, or corpus observation. Capture time is not a
historical publication date. Partial and unknown dates remain explicit; a query
before the earliest evidenced version cannot silently select the latest or
earliest available version as historical truth. As-of leakage testing does not
establish generalization to unseen questions.

## Fixed practical thresholds

| Measure | Denominator and acceptance threshold |
| --- | --- |
| Exact identifier lookup | Every accepted gold document/version identifier; 100% correct top-1 identity, including namespaced identifiers that would otherwise collide. |
| Supporting-document retrieval | Answerable frozen questions; at least 90% recover every required document/version in the first 10 results. Report per-question misses and per-required-document recall. |
| Supporting-passage retrieval | All frozen required supporting spans; pooled recall of at least 90%, counting recovery within the first 20 returned segments for each question's declared query/filter inputs. Report both pooled span recall and per-question completeness. |
| Multi-document sufficiency | All six or more multi-document questions; report how many recover every required support, alongside missing supports. Apply the same 90% question threshold without dropping hard cases. |
| Exact citation replay | Every required gold supporting/contrary span and displayed gold citation; 100% binds to the frozen document/version, rendition digest, bytes and locator. |
| Version/event and temporal correctness | Every frozen lifecycle/as-of assertion; 100% correct source-supported date/status/version or explicit unknown. Zero future-evidence leakage. |
| Issuer, speaker and rendition status | Every gold identity; 100% correct supported role and source-status display, with unknowns where evidence is absent. |
| Unresolved links and abstention | Every frozen unresolved/ambiguous target and negative case; 100% preserves uncertainty and rejects unsupported conclusions. |
| Analytical claims | Every asserted comparison result and the three findings; 100% has reproducible method/input identity and adequate supporting evidence, without a forbidden authoritative conclusion. |
| Coverage | Exact counts, selected ranges, exclusions, incomplete histories and source health reconcile to the sealed corpus and output. |

Return the rank and exact IDs for every miss. Do not blend these measures into
one score. Report shared and reserved first-pass results separately, with
initial and repaired results separated. Do not silently lower a threshold after
seeing failures. This is a small purposive sample, with no claim of statistical
generality or comprehensive law coverage.

Apply percentage thresholds to the frozen denominator by rounding required
passes upward. For example, 90% of six multi-document questions requires all
six; 90% of fourteen answerable questions requires thirteen. An unevaluated
case remains a miss or explicit acceptance gap, not a removed denominator.

Unsupported authoritative assertions, invented dates, wrong-version results,
incorrect speaker attribution, false Nation associations, corrupted citation
replay, and material local-output boundary violations are completion blockers
even if retrieval thresholds pass.

## Analytical and output acceptance

Exercise two reproducible operations using the same canonical identities:
provision/version comparison and comparison of evidence-linked institutional
procedures or reference structures across contexts. An analytical code is an
assertion with method/version, input evidence, reviewer and uncertainty. It is
not a source-supplied field or an official taxonomy classification.

For each of three research-question findings, verify the comparison population,
denominator, method/version, supporting and contrary passages, missing evidence,
rival explanations and a disconfirming next test. A null result is acceptable.
Potential rivals include common upstream authority, boilerplate, rendition
changes, missing versions and selected-source bias. Chronology or similar text
does not establish influence, causation, legal effect or sovereign authority.

Verify identity, evidence and caveat parity across search results, the evidence
reader, version comparison, local dossier and structured export. The ordinary
synthetic/public build must not ingest real inputs. The explicit local build
must emit only reviewed fields under the run's owned `local-output/` namespace.
Serve that directory only on loopback; the corpus root and acquisition objects
must not be addressable through the server.

The built browser workflow must support general-jurisdiction full-text search,
source/date filtering, evidence inspection, version comparison and both
analytical operations. Check keyboard access, focus transitions, result
announcements, labels, readable unknown states, responsive layout and accessible
alternatives to any graph. Browser requests must stay same-origin with no
provider, LLM, telemetry or remote asset traffic. Record screenshots and actual
interaction evidence, or name an unavailable acceptance surface truthfully.

## Controlled adversarial acceptance

Retain meaningful authored synthetic tests through the production transport,
accounting, parsing, corpus and output cores. Do not substitute a parallel fake
runner for the real core. The acceptance inventory includes:

- Actual PowerShell noninteractive invocation and exit forwarding; reservation
  before dispatch; crash/restart around receipt and object promotion; completed
  operation with unavailable/truncated review output; recoverable retained reads
  without a repeated source request. Process-crash evidence does not establish
  sudden-power-loss durability.
- Encoded/decoded byte, deadline, corpus/free-space, request and concurrency
  ceilings; host cadence; `Retry-After`; bounded explicit retries; valid highly
  fragmented responses without an arbitrary chunk-count failure.
- Unsafe URL, credential-bearing URL, private/local address, redirect escape,
  MIME mismatch, XML entity/parser bomb, archive traversal/compression ratio/
  entry count, Windows path alias and custody-link attacks.
- Active HTML/PDF content, source-text prompt injection, secret/contact/land
  field leakage, redaction reconstruction, CSV formula injection, malformed or
  oversized input, provenance loss and corrupt object/index rejection.
- Duplicate titles with distinct identities, ambiguous citation targets,
  neighboring instruments sharing a printed page, conflicting source dates,
  proposal/final/effective confusion and issuer/custodian/party confusion.
- Source-isolated controlled failure. Reuse only checksum-valid same-source
  prior output with its original data-as-of and stale/degraded label; without
  eligible prior output, show unavailable. A corrupt or incompatible prior
  shard cannot serve as last-known-good.

Run focused checks while implementing. Before bounded completion, execute
`npm test`, `npm run check`, the ordinary build/artifact checks, explicit local
build/serve/replay commands through PowerShell, and affected built-browser and
accessibility checks. Ordinary checks remain offline and independent of the
external real corpus. Record actual commands, failures, repairs and omissions.

## Recorded first pass, 2026-09-05

The independent reviewer froze 18 source-authored questions at
`2026-09-05T12:55:26.761Z` against the accepted 14-work, 19-version,
3,298-segment, 10-event gold corpus. The generic search baseline had already
been implemented. The reviewer had not executed ranked search, inspected gold
query results, or supplied question-specific tuning inputs before the freeze.
This sequence does not claim that the questions predated baseline implementation.

The set contains 14 answerable and four unsupported/distractor questions;
seven require multiple documents or versions, including three federal/Washington
comparisons and three same-work version comparisons. Two cases exercise
temporal selection. Four questions were reserved until the independent first
pass, including two answerable comparisons and two unsupported cases. There
are 27 required supporting-span instances and seven contrary-span instances,
representing 30 distinct segments. The 66 identifier assertions cover canonical
and source document/version identifiers using 59 distinct query strings.

First search execution ran from `2026-09-05T12:59:27.829Z` through
`2026-09-05T12:59:31.650Z`. Each question used its frozen query and filters,
with ten document/version results and twenty passages per result. The frozen
passage metric pools those returned passages, sorts by descending supplied
score, breaks ties by document rank and then local passage rank, and takes the
first twenty. Supporting-passage denominators cover the answerable questions;
contrary evidence is replayed and assessed separately. No query, expected span,
cutoff, denominator, or threshold changed after the results were seen.

| Measure | Shared first pass | Reserved first pass | Combined result and threshold |
| --- | --- | --- | --- |
| Complete supporting versions in top 10 | 11/12 | 2/2 | 13/14 (92.9%); passes the required 13/14. |
| Required version instances recovered | 16/17 | 4/4 | 20/21; diagnostic instance recall. |
| Complete multi-document questions | 4/5 | 2/2 | 6/7 (85.7%); fails the required 7/7. |
| Required supporting spans in top 20 | 16/23 | 3/4 | 19/27 (70.4%); fails the required 25/27. |
| Questions with all supporting spans | 7/12 | 1/2 | 8/14; diagnostic question completeness. |
| Exact identifier top 1 | Shared identifier suite | Not a separate reserved suite | 66/66 (100%); passes. |

Six answerable questions miss at least one required passage. One cross-context
question also misses a required federal version in the first ten results.
Other misses include consultation, summary, publication-header, effective-date,
and action-status evidence. The immutable external result retains each exact
miss and its rank; a result outside the returned candidate set remains an
explicit miss. The baseline fails the passage and multi-document thresholds.

Both temporal cases preserve their required exclusions or unknown state: zero
forbidden future-version hits, zero future source-event leakage, and the
required Washington unknown publication state remains unknown. The four
unsupported cases produce source results and explicit review limitations,
with no automatic answer or legal conclusion output. This establishes a
bounded source/uncertainty behavior check, not generated-answer abstention
accuracy. Full source-status presentation, analysis, and output acceptance
remain separate checks. A source-filtered temporal result currently includes
an unrelated source in its diagnostic unknown/excluded lists; this was reported
for correction or explicit global labeling.

All 30 distinct supporting/contrary citations subsequently replayed exactly
across 18 source renditions: retained object bytes, deterministic parser recipe,
canonical rendition bytes, version, locator, quote and context digests, and
reader excerpt agree. The initial evaluator harness incorrectly compared
plain parser objects with the core's equal-valued null-prototype objects using
strict prototype-sensitive equality, leaving 30 replay checks incomplete.
The citation addendum corrects that evaluator comparison, preserves all byte
and value checks, and records 30/30 passes. No product code or gold evidence
changed, and search was not rerun. The initial record remains intact.

The first-pass reserved results were recorded before revealing the missed
cases to the implementation agent. Revealed cases now serve as regressions.
Any repaired result must be reported separately and cannot be described as
untouched reserved performance.

### Immutable external evidence and code pins

The files below remain under the owned external run root
`I:/policy-sentinel-corpus-real-policy/discovery-01`. Source excerpts and frozen
question text are not copied into Git.

| Evidence | SHA-256 or content digest |
| --- | --- |
| Gold corpus content digest | `e0a2edb5f3cc3c79305c4db1b1dcd36e7b051a637cb5428aae12a5af0e848105` |
| `work/gold-corpus.json` file | `6ed57af8d887e57dc82d7a5a689527483f8d064e657272ffae02367895916734` |
| `review/evaluation/freeze-v1.json` | `d81ebd287a02a1bfb355cdc85b46540433ca28bba9a8f8dfba8531c3bbec967c` |
| `review/evaluation/shared-freeze-v1.json` | `2712b4128d04f5e889426a8babdb97fbb8caba0ee5e6a143320578fafdfaf1b8` |
| `review/evaluation/reserved-freeze-v1.json` | `fd5f41cd3a3ac9c2afaa6d5bb8c8d3e38e2760a3641d161aa053e988afef88b2` |
| `review/evaluation/first-pass-v1.json` | `3f67d7c4e0a52902b6c1b7c5ed418b0acc61389a6b3797df4739a1f92405fb1a` |
| `review/evaluation/citation-addendum-v1.json` | `0bee9be156a66bc818c45ca629e92bfd7d410eeaa5a084faeace4e69103195c3` |
| Baseline `src/engine/policy-search.mjs` | `5704d19c2d3b98c9c3a18a35151670e1c813ab075a3180a4dd12c47ef52d0690` |
| Baseline `src/engine/temporal-operations.mjs` | `8f81cfa083f1c709068c7916c318e9189a8769c239fa0e9dd4c667ce9d61ce37` |
| Baseline `src/pipeline/analyzed-corpus-v2.mjs` | `6360b481c28cb96f51c98eb3fb382ada41c7a410d4903c7603f544412a45b0fd` |
| Baseline `src/pipeline/policy-text.mjs` | `bb92763a9aa58d6739dfa01e123e2c8ebe58cb54baf53743faace7e03a2ff6be` |

The first-pass and citation-addendum scripts ran offline through PowerShell
using the exported production search, parser, replay and custody APIs. All
evaluation writes used `writePolicyDerived` during the coordinated acquisition
pause. This record is not a completion claim for the local run or
`PS09-06-LOCAL-RC`: measured retrieval failures, independent analytical review,
eventual broader-corpus evaluation and remaining output/browser acceptance
still require their own evidence.
