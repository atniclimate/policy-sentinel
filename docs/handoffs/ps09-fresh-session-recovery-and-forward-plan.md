# Policy Sentinel: fresh-session recovery and forward plan

Prepared 2026-09-04 local time, following EV01 terminal commit
`9d7cbb6ca13fe4938e8daa16c39b41642d623245`; refreshed 2026-09-05 from the
committed handoff at `6844c05236dcd375fec79530cd7341ca410c258b`.
The owner subsequently approved recommendations 1–5 for the next session on
2026-09-05, binding the seven-path synthetic runner scope reviewed at
`f45f96e11d592141bbb4517ec4574f7faaccfeb6`. This is the current recovery and
approved startup guide. Implementation starts in the next session; this
checkpoint records the approval only. No source-operation grant or completed
evidence review follows. Original checks below retain their dates.

## Start here

**The next session may implement the approved seven-path synthetic runner scope
without requesting that approval again. Use one operation per noninteractive
invocation and prove actual shell launch, custody and recovery. Do not restart
EV01 or access a source.**

The initial handoff request authorized documentation and diagnostic preparation.
The later exact owner approval, recorded below, adds only the next-session local
synthetic implementation scope. It does not renew EV01, authorize a source
request or start a later PS09 run. The previous failure was ours: we designed a
run around persistent standard input and approved its internal tests without
testing that interface through the actual shell tool. The remedy should
simplify execution while preserving evidence and authority.

A fresh session should first read this guide, then `AGENTS.md` and the complete
live `ROADMAP.yaml`. Verify Git and custody before relying on any snapshot below.
The [backbone](../PROJECT-BACKBONE.md) is the authority index; the
[durable prompt](../continuation-prompt.md) supplies general recovery rules.

## Original starting state and custody

At this handoff's original preparation start: branch `main`, HEAD
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

## Original local launch evidence (2026-09-04)

These synthetic shell probes ran in the original handoff session, using Node
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

## Longer-term course beyond the approved synthetic scope

This sequence spans separate local scopes and a later source-operation decision.
The approved next-session seven-path scope below covers synthetic launch, custody
and output readiness only. HTTP framing/transport, source-specific extraction,
policy/identity review and an executable evidence packet are outside that scope;
define and obtain their exact local authority before implementing them. Steps
4–6 cannot follow merely because the synthetic runner passes.

1. **Recover approved local readiness.** Reconcile this handoff, full roadmap,
   live Git and protected hashes. Review the exact seven-path synthetic manifest
   below, including reused code, command/test paths and the narrow lint repair.
   Recover the owner's recorded recommendations 1–5 approval below and its exact
   scope binding. Implementation starts in the next session; do not request that
   same approval again. Do not request network approval yet.
2. **Prove the real command boundary first.** Exercise the actual shell command,
   argv validation, native exit propagation, receipt output and bounded failure
   without network. Verify complete maximum-sized view delivery and fail closed
   on truncated/missing output. Then test durable reservation and normal cross-process
   continuation using synthetic custody. Keep preflight custody separate from
   the future live run.
3. **Finish each approved scope's finite review.** The approved synthetic scope
   covers duplicate/out-of-order operations, crash before/after reservation,
   sync failure, lock contention, deadline expiry, malformed/bounded UTF-8 and
   late restrictions in synthetic output. Test the launched process as well as
   imported functions and pass the unmodified repository check. Later transport
   and source-specific work must separately cover partial body accounting,
   malformed framing, privacy, missing policy context, exact list boundaries
   and altered document identity. Fix finite findings within each exact scope;
   synthetic custody success does not discharge the later review.
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

The approved next-session implementation deliverable is the bounded synthetic
runner specified below. A concrete executable source packet follows the
separately defined transport, source-policy and retention work; it is not this
scope's deliverable.

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

## Original handoff ownership, validation and stop

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

## Original validation and checkpoint (2026-09-04)

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
The original next action was a fresh-session recovery and narrow local
readiness manifest. That proposed manifest is now concrete below. It remains
separate from implementation authorization and a future source decision.

## Recovery recheck (2026-09-05)

Starting branch `main`, HEAD `6844c05236dcd375fec79530cd7341ca410c258b`,
parent `9d7cbb6ca13fe4938e8daa16c39b41642d623245`, one worktree, clean tracked
worktree/index, the same 33 protected untracked inputs and no configured
remote. Read-only local Git configuration established the remote inventory;
no GitHub operation was needed. The current ledger has 5,918 starting lines;
its 77 items, 53 gates and all status counts match the original terminal state.

The lead's current write scope is **only this handoff and `ROADMAP.yaml`**.
This refresh adds measured diagnostics, the proposed scope below and an updated
startup prompt. It does not edit any code or command, update the original EV01
records, or activate a canonical work item. Ledger changes record recovery
evidence and the last verified durable commit; PS09-02 and the finish state
remain blocked with zero active work items.

| Recheck | Actual result and limit |
| --- | --- |
| Runtime | `npm run validate:runtime` exited 0: Node 24.19.0, npm 12.0.2, Windows x64. |
| Ledger/backbone baseline | `npm run validate:roadmap` exited 0 with unchanged counts; `npm run validate:backbone` exited 0 with 17 schemas/IDs, 1,271 references, 86 Markdown files and 451 local links. |
| Protected custody | All 33 owner inputs and 43 prerelease evidence files match `byteLength` and SHA-256; custody manifest, package-lock and all three EV01 pins above match. The EV01 inventory is exactly the same three files. No helper was executed. |
| Actual one-shot argv | The positive command printed one accepted synthetic command and exited 0. |
| Actual rejected argv | The wrong-command probe printed `SYNTHETIC_ARGV_REJECTED_BEFORE_DISPATCH`; explicit `exit $LASTEXITCODE` preserved tool exit 3. |
| Actual noninteractive stdin | A fresh inert readline loop observed EOF with zero commands and exited 1. No persistent input was established. |
| Bounded UTF-8 output | With `max_output_tokens: 9000`, the real `exec_command` response contained the complete expected 8,192-byte synthetic view, beginning/end markers, and a restriction at its end; exit 0. Captured text matched the independently reconstructed expected text character for character. |

The output probe emitted SHA-256
`4ad762833065fa1d9c85f5da786b6ea68aa1a99671964530d1f55b4fa5d5a780`.
Its deterministic body was 350 repetitions of `SYNTHETIC café 漢字` plus a
newline, ASCII padding to the declared byte bound, and the final line
`SYNTHETIC LATE RESTRICTION: DO NOT AUTHORIZE A SOURCE REQUEST.`
The orchestration layer checked the complete tool result before emitting its
short diagnostic summary. This proves that particular tool-capture boundary;
it does not prove human policy review, every output size/budget, a new runner's
maximum view, replayable source custody or truncation recovery. No source text
was generated or read. The inline probes contain no network or file-write
operation. Their counters are code observations, not an OS-level traffic audit.
TTY availability was not retested; its previously failed attempts remain dated
evidence, not a proposed fix.

## Approved bounded local runner scope

**Approved for the next session; implementation has not started.** On 2026-09-05
the owner answered the five-question approval request exactly:

> Approve recommendations 1–5 for the next session.

That answer approves the seven-path scope as reviewed at commit
`f45f96e11d592141bbb4517ec4574f7faaccfeb6`, including the five recommendations
recorded here. The approved handoff's committed Git blob is
`dc592e147c8f905b53e16592062e774d68bcd0c2`, 42,592 bytes, SHA-256
`4d536122287f131f36ff3db2bd59e36aec4228cc065f594886f652df2631d388`.
These identities bind the original committed scope; they do not describe this
updated file's working-copy bytes or create a new request grant.

| Approved recommendation | Exact effect |
| --- | --- |
| 1. Seven-file implementation | Build the local synthetic runner, tests, commands, documentation and ledger updates within the seven tracked paths below. |
| 2. Synthetic scratch custody | Create fresh isolated, bounded test directories beneath `.cache/ps09-runner-synthetic/`; preserve EV01, historical evidence and protected inputs. |
| 3. Narrow lint repair | Add only the `.cache/ps09-ev-01/**` ESLint exclusion while preserving both frozen helpers and existing lint rules. |
| 4. Autonomous local execution | Make routine engineering decisions, implement, test, obtain independent read-only review, repair finite findings and commit locally without repeated confirmation within scope. Escalate only when a necessary change exceeds that scope. |
| 5. Completion and stopping conditions | Require actual PowerShell launch tests, durable reservation/crash-recovery tests, complete bounded-output checks, preserved custody, independent review and a passing unmodified `npm run check`. Finish with a committed handoff of real outcomes and remaining source-preparation gaps. |

The owner's later exact instruction supersedes the earlier documentation-only
wording in [AGENTS.md](../../AGENTS.md) and older recovery entry points solely for
this bounded local scope. Those files remain outside the seven-file write lease;
no edit to them or repeated owner approval is needed to recover this grant.
All source, later-run, convergence and external-operation gates remain closed
under their existing terms. Approval recording in this session does not start
or consume the next-session implementation scope.

The bounded capability is a source-neutral, one-operation-per-invocation runner
with a synthetic transport, exclusive scratch custody, durable reservations,
bounded complete output and honest cross-process outcomes. During this scope,
all operation IDs and input data are synthetic. There is no live mode, free-form
URL argument, source parser or real transport. This small scope proves the
launch/custody mechanism. Real transport, source-specific policy extraction and
an executable source packet remain subsequent, separately defined work; passing
this scope alone would not make source acquisition ready.

| Exact approved tracked path | Approved change for the next session |
| --- | --- |
| `scripts/bounded-operation-runner.mjs` | New synthetic-only command and source-neutral reservation/custody/output logic; validate exact argv and fail before dispatch for unknown operations. |
| `tests/pipeline/bounded-operation-runner.test.mjs` | Synthetic fixtures embedded in the test; import-level and child-process tests, crash injection, custody rejection and complete-output assertions. |
| `package.json` | Add `runner:synthetic` and `test:runner`; include `test:runner` in the ordinary `npm test` chain. No dependency changes. |
| `README.md` | Document the two commands, exact PowerShell exit forwarding, scratch custody, synthetic proof limits and terminal recovery. |
| `eslint.config.js` | Add only `.cache/ps09-ev-01/**` to global ignores, preserving the retired helper bytes and all lint rules. |
| `docs/handoffs/ps09-fresh-session-recovery-and-forward-plan.md` | Record approved scope, actual implementation/test results, hashes, residual gaps and the next concrete action. |
| `ROADMAP.yaml` | Record exact local authorization, one active canonical work item while that authorized scope is running, then its terminal evidence and remaining block. Do not open a later PS09 or source gate. |

New test custody may exist only beneath a fresh exclusive child of
`.cache/ps09-runner-synthetic/`, with deliberately synthetic bytes. Resolve and
check the absolute child path before writing or cleaning it; reject a symlink,
junction, hard-link alias or pre-existing unbound run directory. Never use an
arbitrary existing root, an external corpus root, EV01 or historical prerelease
custody. No scratch code, provider input or receipt enters Git. The package lock,
dependencies, source/adapters, schemas, taxonomy, app, hooks, deployment files,
owner inputs, all 76 protected identities and retired EV01 files remain outside
the approved mutation scope.

Approved command design, **not implemented yet**. Register these commands in
the next session before invoking them:

```powershell
npm run test:runner
exit $LASTEXITCODE
```

```powershell
npm run runner:synthetic -- --run SYNTHETIC-LAUNCH-01 --operation SYNTHETIC-OP-01
exit $LASTEXITCODE
```

`runner:synthetic` would invoke `node scripts/bounded-operation-runner.mjs`;
`test:runner` would invoke
`node --test tests/pipeline/bounded-operation-runner.test.mjs`. Each runner
invocation performs at most one declared synthetic operation and exits. A
completed operation permits only the next declared unattempted operation in
the same bound synthetic run; a duplicate, reservation without completion,
stale lock or ambiguous exit never permits an automatic retry. Fresh test
scenarios use distinct run IDs and do not reset an existing reservation.

Acceptance is finite:

1. Test positive, missing, extra and incorrect argv, noninteractive launch,
   native failure-code forwarding, complete receipt/output delivery and a
   failed/broken output channel through the actual PowerShell tool command.
2. Verify reservations are synced before synthetic dispatch; concurrent
   invocations cannot both dispatch; completed operations survive process exit
   without resetting IDs, counters, bindings or prerequisites.
3. Inject crashes before/after reservation, sync failure, torn or changed
   records, stale locks, expired deadlines and duplicate/out-of-order requests.
   Preserve a reserved or ambiguous operation as consumed and retain evidence.
4. Test bounded UTF-8 views with a late restriction, explicit markers/digests,
   maximum bytes and deliberately truncated/missing output. Output success is
   distinct from a policy-review decision; synthetic data cannot confer source
   authority. No durable human-review authorization is claimed here.
5. Verify zero source dispatch capability, strict scratch-path containment and
   unchanged protected identities. Run focused tests, independent actual-code
   review and the unmodified `npm run check`, including its new test command.

The lead owns the seven-file closure and integration. An independent reviewer
remains read-only and returns a finite defect list or pass after inspecting the
actual changes and launched-process evidence. Stop at an unleased dependency,
protected-file conflict, source/parser requirement or unresolved material
failure; record the exact limitation without upgrading local proof to source
readiness. This approved scope adds no product milestone or release root.

## Pre-approval refresh validation and checkpoint (2026-09-05)

The refresh changes only this handoff and `ROADMAP.yaml`. No runner or lint
configuration was implemented. The full-ledger/backbone reader
`/root/recovery_ledger` read all 5,918 starting ledger lines, checked validator
constraints and confirmed unchanged canonical status/gate/dependency semantics.
The independent read-only reviewer `/root/handoff_review` found conflicting
immediate versus longer-term deliverable wording. The earlier course now
explicitly separates future transport, policy and executable-packet work from
the proposed synthetic runner scope. The reviewer reread the repaired diff and
returned pass with no remaining material findings before the local checkpoint.
Both reviewers remained read-only; their findings were reconciled with the
lead's actual diagnostics and validation results.

| Refresh command / check | Actual result |
| --- | --- |
| `npm run check` | First attempt exited 1 at formatting; the new roadmap wrapping was repaired. The second attempt passed runtime, formatting and all 18 hook tests, then exited 1 at the same 74 lint errors in the two frozen EV01 helpers. |
| `npm run lint -- --ignore-pattern '.cache/ps09-ev-01/**'` | Exit 0, confirming the isolated exclusion diagnostic again. This does not change ordinary lint or make `npm run check` pass. |
| `npm run validate:roadmap` | Exit 0: 77 items, 53 gates, 14 sources, 23 binding paths; all status counts unchanged. |
| `npm run validate:backbone` | Exit 0 after the refresh: 17 schemas/IDs, 1,271 references, 86 Markdown files, 452 local links. |
| `npm run scan:source` | Exit 0: 460 tracked paths and 493 source files checked. |
| `git diff --check` | Exit 0; the diff contains only the two authorized paths. |
| Final custody recheck | 76 protected files and all five manifest/lock/EV01 pins match; EV01 still contains exactly its three frozen files. |

The hook suite reported unavailable historical/dangling-symlink regression
branches on this host. No TTY or browser test, external corpus replay, unit suite,
typecheck or build was rerun in this documentation-only refresh. The full-check
chain stopped before those later stages; the earlier successful separate results
remain dated in the original table and are not new passes. Synthetic probes
establish only their stated shell/output boundaries. Durable runner custody,
source transport, complete source-policy review, accepted identity/scenario
evidence and all later product acceptance remain outstanding.

The local checkpoint subject is
`docs: refresh recovery diagnostics and scoped runner handoff`. Resolve its
actual commit with `git log -1 --format='%H %s' --` followed by this handoff's
repository-relative path. Its expected terminal state is branch `main`, a clean
tracked worktree/index and the same 33 protected untracked inputs. The ledger's
last-durable-checkpoint field now names the verified starting handoff commit
`6844c05236dcd375fec79530cd7341ca410c258b`, not an uncreated self-reference.

Disposition: `PS09_FRESH_SESSION_HANDOFF_READY_NO_NEW_SOURCE_AUTHORITY`.
Source requests, runner implementation, historical-custody mutations and all
closed external operations remain absent. At that checkpoint, the next owner
decision was whether to approve the seven-path local synthetic scope. The later
approval recorded above resolves that exact decision. No source-operation
approval was sought or received.

## Owner approval checkpoint (2026-09-05)

Disposition: `PS09_LOCAL_SYNTHETIC_RUNNER_APPROVED_FOR_NEXT_SESSION`.
The owner approved all five recommendations exactly as recorded above. The
current task records that approval in **only this handoff and `ROADMAP.yaml`**;
the next session implements it. No runner, test, command, lint change or scratch
directory has been created by this approval-recording task.

Starting branch `main`, HEAD `f45f96e11d592141bbb4517ec4574f7faaccfeb6`,
clean tracked worktree/index and the same 33 protected untracked inputs.
Runtime, roadmap and backbone baselines passed. All 76 protected file identities,
the five manifest/lock/EV01 pins and the exact three-file EV01 inventory matched.
The historical approved handoff's Git blob, byte length and SHA-256 above were
computed from its committed bytes using read-only Git, separately from the live
file. The approval record does not change any work-item status, dependency,
release root or gate state. It adds only this exact local authorization to the
existing Run 2 gate history; consumed Run 2 and EV01 grants remain consumed.

The next session must first recover this approval, validate runtime/roadmap/
backbone, reconcile Git and custody, and record current HEAD before mutation.
There is no need to reopen the product interview or repeat recommendations 1–5.
At activation, change only the existing canonical PS09-02 accounting within
the approved ledger path:

| Ledger field | While the approved local work is active |
| --- | --- |
| PS09-02 `status` | `in_progress` |
| PS09-02 `blocked_by` | Retain `[G-PS09-RUN-02]` for the residual real-evidence/operation block; the existing regression factory also relies on this field. |
| `current_focus.work_item` | `PS09-02-IDENTITY-AUTHORITY-SCENARIOS` |
| `current_focus.terminal_reason` | `null` |
| `current_focus.resumable_roots` | `[PS09-02-IDENTITY-AUTHORITY-SCENARIOS]` |
| `finish_states.ps09.current_state` | `in_progress` |
| `finish_states.ps09.blocked_by` | Remove this field or set `[]` while the finish state is active. |
| `next_actions` | Keep exactly one entry targeting PS09-02 and describe the active local scope. |
| `G-PS09-RUN-02.state` | Keep `approved`; rely only on the separately recorded seven-path local grant. |

Run `npm run validate:roadmap` after activation. At local closeout, restore
PS09-02 and canonical finish to `blocked`, with finish blocker
`[PS09-02-IDENTITY-AUTHORITY-SCENARIOS]`, null focus and an accurate terminal
reason. Keep the residual item blocker and the same root/next-action identity.
Do not mark full PS09-02 complete or advance PS09-03 from synthetic runner proof.
One item is active during local execution; zero are active at this scheduled
approval checkpoint and at the later validated local terminal checkpoint.

The read-only ledger reviewer `/root/recovery_ledger` inspected the validator,
live-derived regression and hook routing and found no unavoidable need for an
eighth implementation path. This is a code assessment, not a dynamically tested
activation or proof of hook delivery in the next session. Approved scratch
creation and bounded cleanup belong in the reviewed runner/test commands;
do not hand-edit scratch or change hooks. If an actual necessary repair crosses
the approved scope, record the concrete issue and seek that exact additional
scope while continuing independent authorized work.

Approval-record validation:

| Command / check | Actual result |
| --- | --- |
| `npm run validate:runtime` | Exit 0: Node 24.19.0, npm 12.0.2, Windows x64. |
| `npm run validate:roadmap` | Exit 0: 77 items, 53 gates, 14 sources, 23 binding paths; counts remain 36 complete, zero active, one archived ready, 18 blocked, two deferred and 20 not started. |
| `npm run validate:backbone` | Exit 0: 17 schemas/IDs, 1,271 references, 86 Markdown files, 452 local links. |
| `npm run scan:source` | Exit 0: 460 tracked paths and 493 source files checked. |
| `npm run check` | Exit 1 at the same 74 lint errors in the two frozen EV01 helpers, after runtime, formatting and all 18 hook tests passed. The narrow lint repair is approved for the next session and was not performed now. |
| `git diff --check` | Exit 0; only the two authorized documentation/ledger paths change. |
| Final custody recheck | All 76 protected files, all five manifest/lock/EV01 pins and the exact three-file EV01 inventory still match after validation. |
| Independent review | `/root/handoff_review` returned pass with no material findings on the two-file approval record. It verified all five recommendations, scope binding, timing, no repeated approval and preserved closed gates. Both reviewers remained read-only. |

The first standalone format check caught two new roadmap wrapping issues;
both were repaired before the full check's formatting pass. Hook tests reported
unavailable historical/dangling-symlink regression branches. The full check
stopped before typecheck, unit tests and build; none was separately rerun for
this approval-only update. No new browser, TTY, runner, network or external
corpus check was performed. Earlier diagnostics retain their original dates
and limits. The approval is recorded and ready; runner readiness remains to be
proved in the next session.

The approval checkpoint uses the local commit subject
`docs: record approved next-session synthetic runner scope`. Resolve its exact
identity from this handoff's Git history. The ledger names verified predecessor
`f45f96e11d592141bbb4517ec4574f7faaccfeb6` as its last durable checkpoint.
No source, real transport/parser, later PS09 run, publication, external operation
or protected-custody mutation is authorized by this record. The next user action
is to start the next session with the prompt below.

## Copy-paste fresh-session prompt

The owner has already approved the exact local scope. Paste this prompt into
the next session to begin that authorized work; no repeat approval is needed.
Source operations require a later, separately reviewable packet and decision.

```text
Continue in I:\policy-sentinel from
docs/handoffs/ps09-fresh-session-recovery-and-forward-plan.md.

The owner approved recommendations 1–5 for this next session on 2026-09-05.
Recover the "Approved bounded local runner scope" and approval checkpoint in
the handoff. The approved scope was reviewed at commit
f45f96e11d592141bbb4517ec4574f7faaccfeb6; its committed handoff SHA-256 is
4d536122287f131f36ff3db2bd59e36aec4228cc065f594886f652df2631d388.
Verify that historical binding separately from the updated live handoff. The
approval covers exactly its seven tracked paths, bounded synthetic scratch work,
narrow lint exclusion, tests, independent read-only review, routine engineering
decisions, finite repairs, documentation, ledger updates and local commits.
Proceed autonomously within that scope; do not request the same approval again.
Record current Git/custody state before editing. Do not broaden the manifest.

Read AGENTS.md, the full live ROADMAP.yaml and the linked terminal evidence.
Reconcile Git, the 76 protected identities and the three immutable EV01 files.
EV01 ended before any source request and cannot restart; its stale active ledger
does not authorize execution. PS09-02 remains blocked and later runs stay closed.

Implement the scoped one-operation-per-invocation runner using exact synthetic
argv, explicit native-exit forwarding and a synthetic transport. Give every
scratch scenario its own bound run identity. No live mode, free-form source URL,
source parser or real transport is authorized. Do not assume tty:true works.
Test the actual PowerShell-launched process, durable reservations, exclusive
custody, complete bounded UTF-8 output, normal cross-process completion and
ambiguous/crashed attempts. Never automatically retry a reserved operation.

Add the exact retired-directory lint exclusion without editing either retired
helper. Register/document the two scoped npm commands; pass their focused tests
and the unmodified npm run check. Obtain independent read-only actual-code
review and repair finite findings within the scope. Preserve unrelated changes,
all protected identities, source-specific use/review and non-inference rules.

Use the approval checkpoint's exact ledger activation/terminal guidance. Keep
one canonical item active during the authorized local work with consistent
finish/focus accounting; return PS09-02 to its real-evidence block at the terminal
checkpoint. Record exact outcomes, commits, custody checks, skips and remaining
gaps in the handoff and roadmap. Do not claim this synthetic runner makes a source
packet executable: real transport, policy extraction/review, claim-specific
custody and new source-operation authority remain outstanding.

This prompt authorizes no source access, real-source admission or activation,
later PS09 run, remote, publication, credential/terms change, paid/contact action,
private data, optional AI generation or outbound notification. Do not execute or
modify the retired EV01 helper or ledger, reuse an expired grant, or activate an
archived ready lane. Finish this finite local scope and report its exact result.
```
