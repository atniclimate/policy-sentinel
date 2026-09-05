# Policy Sentinel: fresh-session recovery and forward plan

Prepared 2026-09-04 local time, following EV01 terminal commit
`9d7cbb6ca13fe4938e8daa16c39b41642d623245`. This is the current recovery guide.
It records local diagnostic results and recommendations, not a new source
operation grant or a completed evidence review.

## Start here

**Use a bounded operation per noninteractive invocation for the next proposed
evidence runner. Prove the actual launch and recovery behavior before asking
for source-request approval. Do not restart EV01.**

The owner's request for this handoff authorizes this local documentation and
diagnostic preparation. It does not renew EV01, authorize a source request,
start a later PS09 run, or implement the proposed runner. The previous failure
was ours: we designed a run around persistent standard input and approved its
internal tests without testing that interface through the actual shell tool.
The remedy should simplify execution while preserving evidence and authority.

A fresh session should first read this guide, then `AGENTS.md` and the complete
live `ROADMAP.yaml`. Verify Git and custody before relying on any snapshot below.
The [backbone](../PROJECT-BACKBONE.md) is the authority index; the
[durable prompt](../continuation-prompt.md) supplies general recovery rules.

## Exact starting state and custody

At this handoff's preparation start: branch `main`, HEAD
`9d7cbb6ca13fe4938e8daa16c39b41642d623245`, one worktree, clean tracked
worktree/index, 33 protected untracked inputs, and no configured remote.
Its parent is the packet preparation commit
`a116fa70bb07660d21010ec80f8c7b510be3f093`.

The live ledger has 77 items and 53 gates: 36 complete, zero in progress,
one archived ready, 18 blocked, two deferred and 20 not started. PS09-02 and
the canonical finish state are blocked. The sole ready item, archived
`PNW-05-SOURCE-PACK`, is not an execution grant. `PS09-06-LOCAL-RC` remains the
sole local release root. Documentation preparation does not reactivate an
exhausted run or change these statuses, dependencies or gates.

All 33 protected untracked inputs (32 owner direction documents and one synthetic
CSV with unproven producer) and 43 prerelease evidence files matched their
recorded byte lengths and SHA-256 hashes at startup. Use the
manifest's **`byteLength`**, not a nonexistent `bytes` property, when checking
lengths. Build outputs in the manifest are dated observations and are not part
of these 76 immutable files.

| Protected item | Identity |
| --- | --- |
| [Custody manifest](../development/ps09-run-01-custody.json) | 21,724 bytes; SHA-256 `c440a663dc0678cb5619541adb49599a77b69b2e31bda62ab8d27ae921db8221` |
| `package-lock.json` | SHA-256 `9629185a1e801b5ddb1c3422fc819eb1552b97ab7663cfa5984dae114192646f` |
| EV01 `observer.mjs` | 25,088 bytes; SHA-256 `49c4838d7f36f3009fbd7079b7948db37c606e5b2d8724511cafb2a0db9f3faa` |
| EV01 `offline-checks.mjs` | 16,809 bytes; SHA-256 `4776ec930d55f4aaef543ed6b66ff7695f8ef91a3400e08057f50227b3720292` |
| EV01 `operation-ledger.json` | 478 bytes; SHA-256 `6756d37ed27b23c86c0ccefb50761db3cdb02cbbd2eaa5d707bf93ea97a98cb5` |

The three EV01 files reside in ignored `.cache/ps09-ev-01/`. There are no
operation receipts. Preserve that directory without execution, repair, deletion,
backfill or reuse. Its ledger's `active` marker is an interrupted snapshot;
the confirmed exit and [terminal handoff](ps09-ev-01-evidence-review.md) govern
recovery. Do not rerun its offline file: its last assertion requires the earlier
two-file prelaunch inventory, which intentionally no longer exists.

Preserve the historical 27-request prerelease ledger, all D3/R6/R7 and
PF-01 through PF-17 evidence, and the unissued closed FR-A1 operation. Preserve
K0/S0/O0, all owner inputs and any external synthetic corpus root. No expired
request allocation can be transferred to a new packet.

## What failed, and what did not

| Finding | Evidence and practical consequence |
| --- | --- |
| The actual launch interface was untested | The 43 passing checks imported helper functions and used synthetic transport. They did not prove standard-input lifetime through `exec_command`. |
| Standard input ended before dispatch | The observer wrote its initial ledger at `2026-09-05T04:56:25.767Z`, emitted ready, received no operation command and exited 1. It reserved no operation and never called transport. |
| The packet made that local failure terminal | EV01's approved rule says interruption ends the run. Its zero-attempt failure ended that grant; it did not consume five request reservations. |
| We initially overread the byte budget | Requiring a physical wire/native-buffer quota added a premise absent from the packet. Review corrected this to all decrypted response-body bytes delivered to the bounded observer, including rejected/discarded bytes. |
| Privacy and claim selectors needed real review | Review found omitted restrictive navigation/control text, split contact fields, hidden values, unbounded name context and an inferred publisher. Those finite cases were repaired in the frozen helper; synthetic success still supplied no source fact. |
| Existing recovery entry points lagged behind | The old continuation/backbone pages led back to synthetic Run 2. This handoff updates their route to EV01's terminal evidence and the measured local diagnostics. |
| Ignored helpers still enter ordinary lint | This session's `npm run check` stopped at 74 lint errors in the two preserved EV01 helpers. Git ignores `.cache/`, but ESLint does not; its Node globals override covers `scripts/**/*.mjs`. An exact-directory exclusion diagnostic passes, while the unmodified full check remains failed. |

No source was accessed. EV01 provides no evidence of provider refusal, restrictive
terms, outage, absent Crow entry, changed RCW section or impossible bounded
transport. It did not establish current policy permissions or accepted identity,
membership, scenario, citation, source qualification or activation evidence.

The original [packet](ps09-run-02-real-evidence-entry-packet.md),
[coordination record](../development/PS09-EV-01-COORDINATION.md) and
[source report](../source-reviews/ps09-ev-01-identity-scenario-evidence.md)
remain historical evidence. Do not rewrite them to describe this later recovery
work as part of EV01.

## New local launch evidence

These synthetic shell probes ran in this session, before drafting, using Node
24.19.0/npm 12.0.2 on Windows x64. They contain no source URL, network call,
provider data or file-writing operation. They did not invoke the EV01 helper.

| Probe | Real result | What it establishes |
| --- | --- | --- |
| Default noninteractive stdin with a readline loop | EOF, zero commands, tool exit 1 | Reproduces the failed input-lifetime assumption with inert input handling. |
| `tty: true` using the default shell | Process creation failed; OS error `-1073283067`, message-format error 317 | A persistent terminal was not available through this attempted tool surface. No child or source operation ran. |
| Minimal TTY launch with an explicit Windows PowerShell request | Same process-creation failure; the reported launcher still used `pwsh.exe` | Changing the requested shell did not establish a working TTY. The tool's precise failure cause remains unproven. |
| One-shot argv with an exact synthetic command | One command accepted, exit 0 | Argument delivery and normal completion work without persistent stdin. |
| One-shot PowerShell pipe with one complete synthetic command | One command accepted before EOF, exit 0 | Preloaded input also works; it does not prove interactive continuation. |
| Wrong argv with native `process.exit(3)` alone | Rejection marker, tool exit 1 | Do not assume the default shell preserves the exact child failure code. |
| Same wrong argv plus `exit $LASTEXITCODE` | Rejection marker, tool exit 3 | Explicit native-exit forwarding preserves the intended code in this surface. |

The following exact positive argv probe is safe to repeat as a local diagnostic:

```powershell
node --input-type=module -e 'const expected="SYNTHETIC_ACK";if(process.argv.length!==2||process.argv[1]!==expected){console.log("SYNTHETIC_ARGV_REJECTED");process.exit(3)}console.log(JSON.stringify({probe:"one_shot_argv",commandsReceived:1,networkRequests:0,fileWrites:0}))' SYNTHETIC_ACK
exit $LASTEXITCODE
```

To reproduce the validated rejection/exit-forwarding check:

```powershell
node --input-type=module -e 'if(process.argv.length!==2||process.argv[1]!=="SYNTHETIC_ACK"){console.log("SYNTHETIC_ARGV_REJECTED_BEFORE_DISPATCH");process.exit(3)}' SYNTHETIC_WRONG
exit $LASTEXITCODE
```

These are tool-interface diagnostics, not new repository commands or validation
of an evidence runner. Network/file-write counters describe the intentionally
absent operations in the probe code; they are not packet capture or OS auditing.
No durable restart, locking, crash recovery, source parser or live transport was
implemented or validated by these probes. In particular, **`tty: true` is not
a demonstrated fix**.

## Recommended execution design for a new packet

Use a small source-neutral, one-operation command with exact operation IDs,
fixed approved URL bindings and bounded output. Avoid keeping a process alive
while humans review policy text. Prefer a repository-owned, independently tested
harness if the next local readiness scope approves its exact files and command
surface; a newly ignored one-use helper is possible but harder to reproduce and
maintain. Do not restore or modify either retired observer.

The next design should specify these transitions before implementation:

| State/event | Proposed treatment, requiring inclusion in the new packet |
| --- | --- |
| Offline preflight | Separate synthetic scratch custody and a network-denying transport; no live ledger or request allocation is armed. |
| Live initialization | After exact owner approval, create a fresh exclusive run root and bind packet, helper/config/runtime hashes, URLs, budget and expiry. |
| Normal operation invocation | Validate argv and prerequisite review, acquire one exclusive writer, then fsync an irreversible operation reservation before DNS/TLS/request activity. |
| Completed request | Write minimized receipt and monotonic accounting, release the lock and exit. The next approved unattempted operation may run in another process only if the new packet explicitly allows it. |
| Human policy review | Run outside the observer process. Bind the source review decision to its operation, exact receipt/view digest, reviewer and intended use. No success flag alone grants permission. |
| Pre-reservation local failure | Permit bounded repair/relaunch only if expressly included in the new packet and absence of reservation/network dispatch is demonstrable. Do not retroactively apply this to EV01. |
| Reserved or ambiguous attempt | Keep the operation consumed; never retry automatically, clear its latch, reset quota or infer zero bytes. Preserve evidence and require the packet's explicit recovery disposition. |
| Failed source prerequisite | Block that dependent content operation; continue an independent already-authorized source only within the same packet's permitted lifecycle. |

Avoid a resume flag that can reopen an arbitrary ledger. The implementation must
prove exact run identity, allowed state transitions, unchanged helper/packet
bindings, exclusive custody, monotonic counters and the handling of torn writes,
stale locks and ambiguous exits. A readable `active` string or dead PID is not
enough. A normal process exit and an interrupted request need different semantics.

Retain finite request, time, body/chunk, host/URL and view limits. Count failed
and aborted observations honestly. State the accounting layer explicitly; do
not promise a physical wire quota. Use existing reviewed transport/custody
patterns where they fit, without inheriting source authority or past grants.

Useful read-only code references are the reserve-once path in
[`refresh-federal-register-prerelease.mjs`](../../scripts/refresh-federal-register-prerelease.mjs),
Windows custody handling in [`corpus-store.mjs`](../../src/pipeline/corpus-store.mjs),
and bounded streaming in the retained
[`transport.ts`](../../src/adapters/washington-governor-executive-orders/transport.ts).
These are implementation precedents to assess, not commands to execute or proof
that their current behavior meets a new packet's exact requirements.

Include ordinary validation compatibility in the next local readiness scope.
The smallest identified lint repair is an exact retired-directory exclusion in
[`eslint.config.js`](../../eslint.config.js), if that path is included in the
scope. Preserve the frozen helpers and lint rules. A broader `.cache/**` boundary
is another explicit design choice, not needed merely to fix this known gap.
The unmodified `npm run check` must then pass; the additional exclusion-only lint
diagnostic in this handoff is not a substitute. No lint configuration changed
during this documentation task.

Evaluate these yield risks locally before freezing the next helper:

- EV01 rejected chunked or missing-length HTTP responses. That may produce a
  transport gap even for an otherwise inspectable page; current provider framing
  is unknown. Prefer reviewed standard HTTP handling if it can enforce the
  chosen accounting boundary, or explicitly accept the conservative rejection.
- Whole-page contact/hidden-control screens may reject a policy page before a
  safe view is emitted. Design source-specific complete policy extraction and
  omission reporting with synthetic adversarial examples; do not loosen privacy
  or silently omit unfavorable clauses to obtain a positive result.
- Withheld policy-link destinations and script-dependent text can make use
  unresolved. Record relevant missing URLs for a later exact action; never follow
  them opportunistically. Mere script presence is not proof of dynamic policy.
- Per-text-node locators and a placeholder for every link consume the bounded
  policy view. Test logical-block locators and a separate bounded link inventory
  for lower overhead without losing policy text or omission evidence.
- A one-shot memory-only view can disappear after a truncated tool response or
  broken stdout. Test a maximum-sized synthetic view through the actual launcher
  and chosen output budget, including UTF-8, a late restriction, explicit
  beginning/end markers and a digest. Missing or truncated output leaves review
  unresolved and cannot enable a dependent request, even if its receipt succeeds.
- Exact fixed line patterns can miss legitimate wrapped names/headings or source
  dates. Cover representative layouts and fail closed on ambiguous context;
  neither a substring nor a hash establishes identity or complete policy review.
- A body digest without retained permitted bytes is not replayable citation
  custody. Decide the required claim and evidence retention before acquisition;
  do not collect metadata and later discover that acceptance requires a different
  rendition, complete source bytes or rights that were outside the packet.

## Options and decision

| Option | Benefit | Limitation / recommendation |
| --- | --- | --- |
| One operation per invocation with durable accounting | Uses the working argv boundary; review can occur between processes; isolates outcomes. | **Recommended design for local readiness.** Durable recovery and network behavior remain to be implemented and tested under a defined scope. |
| Repair a persistent interactive runner | Retains the old conversational command model. | Not recommended now: TTY launch failed, and it couples review latency to process survival. Requires new positive evidence before reconsideration. |
| Owner-supplied official documents or permitted exports | May avoid brittle web-page acquisition for a bounded claim. | Optional later alternative. Requires exact provenance, currentness, custody and reuse decisions; no upload or new source action is requested by this handoff. |

No option removes the originating-evidence, identity separation, privacy,
source-specific use or publication boundaries. The persistent process,
blanket zero-attempt termination and Content-Length-only parser were engineering
choices we put into EV01, not inherent sovereignty/product requirements. We
must honor that closed packet and design the next one more carefully.

## Next session: finite course of work

1. **Recover and define local readiness.** Reconcile this handoff, full roadmap,
   live Git and protected hashes. Publish a narrow path manifest for a no-network
   readiness task. Identify any reused code and the exact prospective command,
   fixture, test and documentation closure. This guide itself grants no new
   implementation lease. Obtain or recover that local scope before edits beyond
   handoff/diagnostic preparation; include the known lint-scope repair and ordinary
   validation compatibility. Do not request network approval yet.
2. **Prove the real command boundary first.** Exercise the actual shell command,
   argv validation, native exit propagation, receipt output and bounded failure
   without network. Verify complete maximum-sized view delivery and fail closed
   on truncated/missing output. Then test durable reservation and normal cross-process
   continuation using synthetic custody. Keep preflight custody separate from
   the future live run.
3. **Finish the runner's finite review.** Cover duplicate/out-of-order operations,
   crash before/after reservation, sync failure, lock contention, deadline expiry,
   partial body accounting, malformed framing/UTF-8, privacy, late restrictions,
   missing policy context, exact list boundaries and altered document identity.
   Test the launched process as well as imported functions. Fix and close concrete
   defects once; avoid adding speculative requirements unrelated to the packet.
   Pass the unmodified repository check before calling local readiness complete.
4. **Prepare the exact evidence packet.** Bind the tested invocation, source
   questions, URLs/hosts, limits, output retention, metadata allowlist, new run
   path, digests, review prerequisites and explicit recovery semantics. Keep
   policy review before each dependent content request. The original five URLs
   are candidate locators, not a standing allowlist; reuse requires fresh exact
   authority and retained pre-access evidence review.
5. **Request one concrete network decision.** Only after local readiness and the
   reviewable packet are complete, ask the owner to approve its exact operation
   scope. No repeated approval is needed for operations already covered by that
   future grant and its valid prerequisites. Unknown source access/use still
   blocks the affected operation; do not reopen a general product interview.
6. **Deliver source-specific evidence and stop accurately.** Record observed,
   unattempted, failed and unknown states separately. Preserve independent
   progress within the grant. Return to a terminal ledger and report actual
   capability/claim gains; a metadata review alone cannot complete full PS09-02.

The next useful deliverable is a proven no-network runner and a concrete new
packet, not another large planning-only milestone. If the local implementation
scope is not yet granted, make that small readiness manifest reviewable first.

## Remaining product work, independent of the launch repair

| Canonical stage | Existing evidence | Still required |
| --- | --- | --- |
| PS09-01 | Run 1 integrated the exact synthetic corpus profile into the retained artifact/application path. | Preserve compatibility; no real source admission follows. |
| PS09-02 | Synthetic identity/authority contract and nine `owner_plan_only` candidate manifests passed their local packet. | Exact claim-specific originating identity/scenario evidence, source dates/versions, use rights, custody/citations and acceptance. EV01 added none. |
| PS09-03 / PS09-04 | Retained disabled adapters, contract families and dated source reviews are reuse candidates. | Separately gated federal/PNW real-source qualification, lifecycle/corpus integration and honest coverage/health/LKG. |
| PS09-05 | Existing synthetic app/dossier/CSV is a retained output baseline. | Common search, persona and document/web/app/structured output contracts over the accepted corpus. |
| PS09-06 | Sole intended local release root. | Objective scenario, replay, provenance, security, accessibility, browser and integrated acceptance evidence. Publication remains a later exact gate. |

Read the [corpus ADR](../adr/ps09-canonical-corpus.md),
[Run 2 checkpoint](ps09-run-02-identity-authority-scenarios.md),
[candidate manifests](../development/ps09-run-02-candidate-manifests.md),
[project brief](../project-brief.md), [PNW acceptance](../pnw-scope-and-acceptance.md)
and [decision register](../decision-register.md) for the binding requirements.
The corpus still rejects real inputs with
`REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED`. Do not turn the synthetic CAS or
a source-registry toggle into an admission shortcut.

For the formerly selected questions: a dated Crow notice entry would not prove
current recognition, ATNI membership, a BIA relationship or a full 575-entity
reconciliation. RCW section metadata would not prove current controlling law,
legal effect, a project outcome or a Nation association. Government/reservation/
agency concepts and Fort Peck/Fort Belknap candidates remain separate. Current
ATNI membership evidence gates that claim, not unrelated general-jurisdiction
work. No scenario or required cohort member is removed to make the review easier.

## This handoff's ownership, validation and stop

The lead owns exactly five tracked paths: this file, `AGENTS.md`,
`docs/PROJECT-BACKBONE.md`, `docs/continuation-prompt.md` and `ROADMAP.yaml`.
Only current recovery/status links and handoff evidence change in the existing
four files. All delegates are read-only: full-ledger/backbone reader, engineering
postmortem reviewer and sovereignty/process reviewer. No skill grants source
access; no new source feasibility claim is made in this task.

Local shell probes are inline, synthetic and write no task files. The EV01
directory and its files remain untouched. Runtime, roadmap and backbone baseline
checks passed, and all 76 protected identities plus pinned custody were verified.
The full roadmap reader covered all 5,896 starting lines. Final checks, independent
review and the local checkpoint are described below.

No source request, remote, push, publication, registration, terms acceptance,
credential change, paid/contact action, private data, optional AI generation,
notification, historical-evidence mutation or later-run execution occurs.
Stop before an unleased implementation, unapproved operation or protected custody
conflict; record the exact gap and continue independent authorized local work.

## Final validation and checkpoint

The handoff is complete; **the unmodified full repository check is not green**.
Its remaining failure is the recorded lint traversal of retired EV01 custody.
This is validation debt for the next local implementation scope, not evidence
that the documentation changed runtime behavior or that PS09-02 is complete.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Exit 1 at lint: 74 errors in the two frozen EV01 helpers. Runtime, formatting and all 18 hook tests passed before that stop; subsequent stages were run separately below. |
| `npm run lint -- --ignore-pattern '.cache/ps09-ev-01/**'` | Exit 0. Explicit additional diagnostic excluding only the retired directory; ordinary lint remains unresolved. |
| `npm run typecheck` | Exit 0. |
| `npm run validate:roadmap` | Exit 0; 77 items, 53 gates, 14 sources, 23 binding paths; all status counts unchanged. |
| `npm run validate:backbone` | Exit 0; schema references and recovery-document links resolve. |
| `npm run scan:source` | Exit 0; 493 source files checked. |
| `npm test` | Exit 0: foundation validation, 13 corpus tests, 30 passing spine tests with one host-limited skip, and 1,507 unit tests across 91 files. |
| `npm run build` | Exit 0, including artifact validation: three synthetic records, 575 synthetic Nations and eight verified assets; build `synthetic-4afc66e973bc854b6455`. |
| Protected custody and diff review | All 76 protected files, custody-manifest/package-lock pins and three EV01 file identities match. Only the five listed documentation/ledger paths enter the checkpoint. |

The initial standalone format check failed on new roadmap wrapping; it was
repaired before the full check's formatting pass. The spine skip reflects
unavailable unprivileged Windows file-symlink creation; junction and hard-link
cases passed. Hook tests also reported unavailable historical/dangling-symlink
branches. No browser check was performed for this documentation-only change;
unit/app tests and a synthetic build do not constitute new browser or real-source
acceptance. No external corpus verification was invoked.

Independent final reviews passed: `/root/handoff_boundary` reconciled the entire
starting ledger and unchanged status/gate/dependency semantics;
`/root/ev01_sovereignty` reviewed authority and non-claims;
`/root/packet_mechanics` reviewed launch, recovery and output completeness.
The engineering finding about truncated output was incorporated before its
pass. Its later lint-scope diagnosis is retained as an explicit unresolved
repository-check gap, with the proposed repair above. All reviewers were read-only.

The local checkpoint uses branch `main` and commit subject
`docs: add fresh-session recovery and forward plan`. Resolve its exact identity
from Git without relying on chat history:

```powershell
git log -1 --format='%H %s' -- docs/handoffs/ps09-fresh-session-recovery-and-forward-plan.md
git status --short
```

The expected committed state is a clean tracked worktree/index, the same 33
protected untracked inputs, the preserved ignored EV01 directory, zero active
roadmap items and no remote. Reconcile that state in the fresh session; the
roadmap's last-durable-checkpoint field intentionally identifies the verified
preparation baseline `9d7cbb6...`, while this document's Git history identifies
the newer handoff checkpoint.

Disposition: `PS09_FRESH_SESSION_HANDOFF_READY_NO_NEW_SOURCE_AUTHORITY`.
The next owner action is to start a fresh session with the prompt below. Its
first concrete output is the narrow local readiness manifest, including the
runner and lint-scope repair; a new source decision comes only after that scoped
implementation and its exact packet are reviewable.

## Copy-paste fresh-session prompt

```text
Continue in I:\policy-sentinel from
docs/handoffs/ps09-fresh-session-recovery-and-forward-plan.md.

Read AGENTS.md, the full live ROADMAP.yaml and the linked terminal evidence.
Reconcile Git, the 76 protected identities and the three immutable EV01 files.
EV01 ended before any source request and cannot restart; its stale active ledger
does not authorize execution. PS09-02 remains blocked and later runs stay closed.

First make the smallest local readiness task concrete: a one-operation-per-
invocation runner using the verified argv boundary and explicit native-exit
forwarding. Publish its exact code/test/docs/command path manifest and distinguish
already authorized local preparation from any new implementation scope. Do not
assume tty:true works. Exercise the actual launched process, synthetic durable
reservations, complete bounded output and recovery before proposing live acquisition.
Include the recorded lint-scope repair and pass the unmodified npm run check.
Do not execute or
modify the retired EV01 helper or ledger.

Preserve source-specific access/use, complete safe policy review, exact identity
context, minimized retention and non-inference boundaries. Keep normal completed
operations distinct from interrupted/ambiguous attempts in the proposed new
packet. Reuse reviewed source-neutral mechanisms where suitable, without inheriting
source authority or old request grants. Avoid a broad product interview or a
new planning framework.

Finish the bounded local work that is authorized, record real check outcomes,
and produce one exact fresh evidence packet only after the runner is reviewable
and its local scope is satisfied. Request source-operation approval only as the
final step for that concrete packet. This prompt does not authorize network,
real-source admission, activation, a later PS09 run, remote or publication.
```
