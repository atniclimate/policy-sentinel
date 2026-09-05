# PS09 Run 1 repository convergence and corpus spine

Status: Run 1 complete after successful integrated validation and independent
final review. The sole local RC root remains blocked at Run 2; real-source
admission and publication stay closed.

Authority is the exact owner token
`POLICY-SENTINEL-0.9-RUN-01-REPOSITORY-CONVERGENCE-AND-CORPUS-SPINE`, recovered
with the supplied kickoff/design correction and recorded in
[coordination](../development/PS09-RUN-01-COORDINATION.md). The
[roadmap](../../ROADMAP.yaml) is the live execution ledger;
[ADR](../adr/ps09-canonical-corpus.md) records the implemented decision.

## Starting truth and preserved custody

The resumed session started on `main` at
`0ff44349c37b60006ee34475319a86ec5a87e9e0`, with one local worktree, no remote,
no submodule and no staged changes. The crash left uncommitted Run 1 code,
configuration, schema, ledger and coordination edits. Those edits were preserved
and reviewed rather than discarded or treated as acceptance evidence.

The [custody manifest](../development/ps09-run-01-custody.json) records exact
paths, byte lengths and SHA-256 identities for 32 protected owner-direction
inputs and the separate 2,409-byte `docs/policy-sentinel-selected-records.csv`.
All 33 were present, unchanged and Git-untracked on recovery. The CSV contains
synthetic selected-record output, with unproven producer/run identity; it is
preserved untracked, excluded from the corpus and canonical dependency graph,
and is neither a real-source export nor a golden acceptance fixture.

The 43 historical ignored Federal Register evidence files retain 49,730 bytes
and manifest SHA-256
`73401fdc8c060d443cab0e521c0fc9ae9ec067bcf0f1e75131f0411d2e460546`.
Historical D3/R6/R7 and PF-01 through PF-17 custody is immutable: 27 issued
requests, 10 accepted receipts, 17 rejected observations. FR-A1 remains unissued
and prohibited. Run 1 makes zero provider requests and acquires zero real objects.
Historical Node 24.14.1 source-observer evidence is not rerun on the new pin.
K0/S0/O0 contracts and convergence gates remain unchanged and outside product
dependencies. No owner-input bytes or generated corpus/provider bodies enter Git.

## Implemented delta and component decisions

The [component registry](../development/ps09-convergence.v1.json) gives an explicit
disposition, repository evidence and implementation effect for each of the 65
retained work items. `adopt` means the stated bounded behavior/evidence is reused;
`migrate` identifies its destination and any remaining gated work;
`compatibility_fixture` preserves isolated synthetic behavior; `defer` leaves the
named work closed; `reject_pending_review` prevents unaccepted O0 convergence.
A disabled source or completed no-source fallback remains a gap, not an adapter.
The 65 dispositions are 11 adopt, 18 migrate, 21 compatibility fixtures,
14 defer and one reject pending review (O0).

Schema 1.5 roadmap accounting has one canonical required path, PS09-01 through
PS09-06, and conditional PS09-07/08. `PS09-06-LOCAL-RC` is the sole local release
root. Historical B/PNW/prerelease item identities, statuses, dependencies and
dated evidence remain archived; their old finish snapshots are not current
prerequisites. Publication has its own exact gates after canonical acceptance.

The ordinary build feeds the same three fixture records through the existing
AnalyzedCorpus implementation using a closed schema 1.1
`synthetic_application_compatibility` profile. Exact fixture, source-registry
and taxonomy pins preserve the county's explicit synthetic Nation evidence and
the synthetic accord's landmark treatment. Schema 1.0 remains supported; both
profiles reject real inputs with `REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED`.
PolicyRecord 1.4, artifact 1.4 and source registry 1.19 remain the retained
contracts. The application, dossier and CSV still consume that one artifact
projection. No competing fact, health or lifecycle store was introduced.

The Windows object store provides bounded synthetic SHA-256 objects, exclusive
operation reservations, same-volume staging/promotion, quota and integrity
checks, and conservative interrupted-process quarantine. Intrinsic typed-array
validation snapshots bytes and identifiers before any asynchronous work;
spoofed lengths, accessors, proxies and shared buffers cannot bypass the cap.
CuratedDocumentPack 1.0 references corpus records and evidence bindings with
version-compatible identities, strict UTF-8 text renditions, deterministic
segments/indexes and replayable exact title/available-summary citations.

The only implemented parser is strict UTF-8 plain text with line-ending
normalization. It rejects invalid UTF-8, BOM, prohibited control bytes and
recognized leading document signatures. This is not comprehensive format
detection; literal markup can remain inert text. PDF, HTML/XML, OCR and archive
parsing and every network transport are unsupported. Future authority/review categories are
vocabulary, not implemented source qualification or machine analysis. Packs
permit owned synthetic fixture caching, local analysis and full display only;
excerpt, export and redistribution remain prohibited. No pack text, raw object,
local path or index enters the ordinary public artifact.

## Measured local replay and limits

The selected acceptance runtime is Node 24.19.0/npm 12.0.2, Windows x64. The
package lock changes runtime metadata only; no dependency was added or fetched.
`npm run validate:runtime` passes. The fixed native PowerShell executable is a
runtime dependency for Windows file-attribute checks.

The original reconciliation found `I:\policy-sentinel-corpus` absent. Crash
recovery later found seven objects and ten synthetic receipts there; it did not
assume the earlier absence was still true. A bounded read-only inventory checked
every file identity, then two separate `npm run corpus:verify -- --root
I:\policy-sentinel-corpus` invocations replayed all three packs and four exact
citations. Both succeeded with seven unique objects totaling 98,415 bytes, no
pending reservations and no incomplete work. Text/rendition bytes deduplicate.
The corpus content digest is
`dc1c014e893072bac5970b6588f1423db0052ed13ce959a2d46a46331bd97ff8`; its serialized
object is `a5d862963d7a7d73f088990bfe7e52a4d9dd268398f6310176f10d335f391b58`.

I: is healthy NTFS, 1,024,207,089,664 bytes total and 734,171,684,864 bytes free
at the recovery measurement. The selected configuration caps objects at 262,144
bytes, the store at 16,777,216 bytes, each source at 1,048,576 bytes, inventory at
4,096 entries and concurrency at one operation; it reserves 1,073,741,824 free
bytes and uses a 10-second cooperative operation bound. The CLI/env root is
explicit and outside the repository; the ordinary build never creates it.

The root requires exclusive operator control. Node pathname operations and mode
bits are not a Windows ACL security boundary against a privileged concurrent
writer. Cooperative deadlines cannot stop a stalled kernel operation; file fsync
and atomic rename do not guarantee every power-loss scenario. Ambiguous/reused
PID locks and interrupted recovery guards require operator custody, not automatic
deletion. The tests prove the implemented bounds, not broad production scale.

## Validation and independent review checkpoint

Fresh `npm run test:spine` after repair: 31 tests, 30 passed, zero failed, one
explicit Windows file-symlink privilege skip. Real junction and hard-link tests
pass. Tests cover byte spoofing and no promotion, quota/free-space limits,
concurrency, time/inventory bounds, interrupted processes, receipts, corruption,
canonical UTF-8 citations, incompatible corpus input and schema/runtime version
parity. Ordinary artifact equality at an equal generation time is tested.

Recovery reviewers identified intrinsic byte-bound bypasses, hard-coded pack
reference versions, legacy-driven roadmap finish accounting and stale authority
prose. Bounded workers repaired those under disjoint leases. The following
terminal evidence supersedes the earlier incomplete recovery checkpoints.

The first full check passed runtime, formatting, 18 hooks, lint, types, roadmap,
backbone, source scanning, foundation, 13 corpus tests and 30 spine tests with
the documented skip, then passed 1,406 of 1,407 Vitest tests. Its sole failure
was S0's frozen exact product JSON configuration inventory. The planning registry
was moved to `docs/development/ps09-convergence.v1.json`; local settings now live
in `config/local-corpus.v1.mjs`. Nine focused S0 isolation tests then passed
without changing any frozen S0 path. The full integrated retry passed.

Independent graph review also found a dot-segment alias bypass in registry
evidence. Canonical segments/realpath, single-link files and resolved owner-input
checks now reject dot, separator and link aliases. Independent no-write probes
confirmed closure. The actual component registry never contained such an alias.
The pipeline harness retains all assertions with a 45-second wrapper bound to
accommodate the added canonical graph CLI regression fixtures; its production
timeouts and source gates did not change.

Scoped independent engineering/security, graph and governance/sovereignty
reviews report no remaining material findings after the repairs. These are
review recommendations, not owner acceptance of later work. Final custody comparison confirms all 76 immutable input/evidence
files match. Disposable dist/cache baseline snapshots are regenerated artifacts,
not immutable provider evidence. Final package-lock SHA-256 is
`9629185a1e801b5ddb1c3422fc819eb1552b97ab7663cfa5984dae114192646f`.

The final `npm run check` exited zero. Runtime validation, formatting, lint,
type checking, roadmap/backbone/source-boundary checks and foundation validation
passed. The run passed 18 hook tests, 13 analyzed-corpus tests, 30 spine tests
and all 1,407 Vitest tests in 88 files. One spine file-symlink test was skipped
because Windows symlink privilege was unavailable; hook tests also reported
two unavailable symlink probe branches. Junction and hard-link checks ran.
The full suite includes application accessibility and keyboard checks.
Backbone validation found 16 schema IDs and 1,201 references. Build and artifact
validation passed with three synthetic records, 575 synthetic Nation rows and
eight verified assets, build ID `synthetic-7d80aab3233b3b005e23`.
The ignored final check log is `.cache/ps09-run-01-check-final.log`.

The local browser smoke used only `127.0.0.1:4179`. Keyboard skip navigation
focused main content; selecting Synthetic Nation 002 and applying filters
showed the synthetic federal record with `General jurisdiction; not
Nation-specific`. Selection enabled dossier/CSV controls and persisted through
record details. The 31-field provenance disclosure expanded, and returning to
results restored focus to the selected record link. Visual inspection found
the synthetic banner, record and source limitations legible. No external source
link was opened and no CSV was downloaded. The task tab was closed and the
verified task preview process was stopped; no task listener remains on 4179.

The final ledger has 77 items: 36 complete, zero in progress, one archived ready,
18 blocked, two deferred and 20 not started. The 17 PNW-prefixed items remain
seven complete, zero active, one archived ready, two blocked and seven not
started. PS09 has one complete, one blocked, two deferred and four not started.
The only next canonical root is `PS09-02-IDENTITY-AUTHORITY-SCENARIOS` behind
closed `G-PS09-RUN-02`; `PS09-06-LOCAL-RC` remains blocked by it. The old broad
PNW-05 ready status is historical evidence and supplies no execution authority.
All 53 gates retain their exact scope; no successor opens automatically.

The hook operating rules and bounded custom-agent leases were followed. No
additional skill, plugin, source review or external service was needed for this
local recovery. Independent engineering/security review recommends acceptance
of the final code with no material blocker. Its final wording recommendation
was applied: plain-text checks reject recognized signatures, not every possible
file format. The same precision correction is present in architecture and the
data-contract inventory. Final read-only reviewers were
`corpus_recovery_review` (engineering/security), `graph_recovery_review`
(canonical graph/registry), and `governance_recovery_review`
(governance/sovereignty/privacy/custody). Each recommends acceptance with no
remaining material finding. These recommendations do not accept later work.

After the terminal ledger change, `npm run test:unit --
tests/pipeline/pipeline.test.ts` passed its enclosing test and all child suites;
`npm run format:check`, `npm run validate:roadmap`, `npm run validate:backbone`
and `git diff --check` passed. Final local commit identities and the post-commit
custody/status check are recorded in the closeout entry below.

## Next exact entry packet

The next item is `PS09-02-IDENTITY-AUTHORITY-SCENARIOS`, behind closed
`G-PS09-RUN-02`. Its entry packet must name the bounded owner-selected cohort,
six candidate deep scenario graphs and geographic sentinels with evidence and
unknown states; distinguish governmental, reservation and BIA agency identity;
keep Crow, Fort Peck and Fort Belknap distinct; and apply the owner-selected
Duwamish scope exclusion without implying a legal or historical conclusion.
Exact current ATNI membership is a claim-specific originating-evidence gate,
not a universal release prerequisite. No real identity facts are seeded in Run 1.

Run 2 must specify exact paths, immutable input identities, accepted authority
and scenario assertions, negative fixtures, review and stop conditions before
implementation. Source-interface qualification, operation grants, actual real
acquisition and lifecycle integration belong to separately authorized later
runs. No general product interview, ATNI contact, credentials, source request,
terms acceptance, paid call, private data, AI generation, notification, map/land
data, remote, push or publication is authorized by this packet.

Do not automatically start Run 2 when Run 1 closes. The entry packet above is
the next decision boundary, not authorization to perform that work.

## Local commit and custody closeout

The implementation commit is
`b5dcda3df41f389b5b302709c2675b994d20c6c8` on `main`, directly after the starting
anchor `0ff44349c37b60006ee34475319a86ec5a87e9e0`. It contains exactly the 42
authorized code, schema, configuration, test and documentation paths. The
post-staging source-boundary scan passed at 443 tracked paths and 476 checked
source files; staged whitespace checks passed. Post-commit tracked status was
clean, with exactly the 33 unchanged protected inputs remaining untracked.
All 43 immutable ignored historical evidence files still match their hashes.
No generated object, provider body, real configuration or credential was staged.

This follow-up checkpoint changes only the roadmap, coordination log and this
handoff to record that measured commit and its outcome. Its identity is the Git
commit containing this closeout entry; it does not amend the implementation
commit or grant another run. Local Git has no remote, push or publication.

## Terminal disposition

`RUN_01_CONVERGED_REPOSITORY_AND_CORPUS_SPINE_COMPLETE`
