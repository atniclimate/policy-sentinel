# PS09 EV01 coordination

Status: terminal after a local launch failure, before any source request.
The single-use run cannot resume. See the [terminal handoff](../handoffs/ps09-ev-01-evidence-review.md).

## Historical approval and preflight snapshots

Everything below through the observer-preflight section records the run's
earlier state. Its then-current/future wording is historical, including active
work, pending validation and cleared initial inspections. The actual execution
and recovery section supersedes those snapshots: no execution clearance remains.

The owner's later **Approve** authorizes exactly the [EV01 packet](../handoffs/ps09-run-02-real-evidence-entry-packet.md)
at commit `a116fa70bb07660d21010ec80f8c7b510be3f093`, SHA-256
`ce59dbb8f17c866ede10b077b118e3af90dbec48f774ee061f0c5483b88b52ea`.
Token: `POLICY-SENTINEL-PS09-EV-01-IDENTITY-SCENARIO-EVIDENCE-REVIEW`.
The first clock observation after approval was `2026-09-05 04:29:07 UTC`
(September 4 locally); this is an observation, not an invented approval timestamp.
Execution will stop at terminal, an interruption or the packet's 24-hour expiry,
whichever occurs first. A conservative earlier local deadline will also apply.

This separate grant preserves the completed synthetic packet's zero-source
scope. It permits five conditional first-attempt GETs, three exact hosts,
3,670,016 response-body bytes, concurrency one, 30 seconds per attempt and
180 seconds of network activity. Exact URLs, individual limits and order remain
those in the approved packet. No redirect, retry, alternate URL or extra request
is permitted. Policy decisions precede dependent content requests. No BIA-host
operation, source admission, real corpus, publication or later run opens.

## Historical ownership and reviews

The lead alone owns these tracked paths:

- This coordination record.
- `docs/source-reviews/ps09-ev-01-identity-scenario-evidence.md`.
- `docs/handoffs/ps09-ev-01-evidence-review.md`.
- `ROADMAP.yaml`.

The exclusive ignored lease is `.cache/ps09-ev-01/`, with only `observer.mjs`,
`offline-checks.mjs`, `operation-ledger.json`, and the five operation-ID
`.receipt.json` files named in the packet. No temporary file or body/view file
is allowed. Freeze both helper files after independent preflight; receipts are
exclusive terminal creations, and only the same live run may update its owned
ledger. Interruption consumes any reserved attempt and ends all network/write
authority for recovery of that run.

Read-only assignments: `handoff_boundary` reconciled all 5,864 initial roadmap
lines and active/terminal validator mechanics; `packet_mechanics` reviews
engineering, custody, accounting and minimization; `evidence_proposal` reviews
source access, use and claims; a separate sovereignty reviewer will examine
the actual helper and evidence. Reviewers have no write or source-access lease.
The source-review skill supplies procedure, not owner authority. Its retained
source review found all three exact policy GETs eligible for bounded inspection;
neither dependent content GET is cleared yet.

Raw HTML stays in observer memory. Approved bounded inert source views alone
may appear in shell results and unchanged reviewer messages in this session;
those records are retained, not transient or guaranteed deletable. No view or
source prose belongs in a repository file or receipt. Files retain only the
packet's allowlisted impersonal metadata and review conclusions with provenance.

## Historical baseline and validation

Starting branch: `main`; one worktree, clean tracked worktree/index, 33 protected
untracked inputs and no remote. Runtime, roadmap and backbone validation passed
on Windows x64 Node 24.19.0/npm 12.0.2. All 76 protected owner/historical files
matched their custody lengths and hashes. The custody manifest remains 21,724
bytes at SHA-256 `c440a663dc0678cb5619541adb49599a77b69b2e31bda62ab8d27ae921db8221`;
package-lock remains `9629185a1e801b5ddb1c3422fc819eb1552b97ab7663cfa5984dae114192646f`.
The EV01 directory did not exist. Full PS09-02 remains unresolved; it is the
sole active work item only for this bounded execution. Terminal validation
will restore its blocked state and zero active items.

Helper review, exact digests, offline outcomes, operation accounting and final
validation remain pending. No success or source viability is asserted here.

## Historical observer preflight checkpoint

The exclusive directory and two helper files were created by this same run;
there is no operation ledger or receipt yet. The observer uses direct TLS with
a fixed 16,384-byte `onread` buffer. Every decrypted response-body byte delivered
to the observer is counted, including a rejected response's same-callback body
suffix. It reserves the entire fixed allocation before a request and stops
conservatively before another callback could exceed that allocation. It accepts
only complete numeric Content-Length framing, identity encoding and strict UTF-8
HTML; chunked or missing-length responses are rejected without an alternative
request. These conservative interface limits can leave a source unobserved.

The budget is an observer response-body metric, not a TCP/TLS wire quota or a
claim about encrypted/native buffers. Two independent local implementation
reviews reconciled this with the packet. An initial stronger physical-receipt
interpretation was withdrawn because the packet does not impose it. Installed
Node 24.19.0 forwards the fixed buffer to TLSWrap and invokes the callback
without the IncomingMessage readable queue. No provider was accessed to test it.

`node .cache/ps09-ev-01/offline-checks.mjs` initially passed 34 synthetic checks.
Source, engineering and sovereignty reviews required complete navigation/control
visibility, logical-block privacy screening, exact list/issuer boundaries,
typed notice metadata, publisher uncertainty, synchronous deadlines, tracing
guards and pre-issue receipt inventory checks. The expanded suite found a
signature-pattern boundary miss; after repair, all 41 checks passed with zero
network requests or writes. The synthetic session view included the complete
late restrictive clause, source locators and omission manifest. No source view
or raw body was emitted. The repaired candidate is undergoing final preflight.

The local conservative deadline is `2026-09-05T08:00:00Z`, earlier than the
packet's expiry. Ambient proxy/tracing/preload/credential-related transport
flags were checked by presence only and were absent; no values were printed.
The helper also rejects such flags and unexpected Node execution arguments.
Both helper files are ignored by Git. An intermediate format check identified
roadmap wrapping only; final checks remain required.

Final preflight closed all finite engineering, source and sovereignty findings.
The last two repairs restrict value attributes to visible static button labels
and constrain the publication header to numeric/weekday/date grammar. The lead
and each independent reviewer ran the final suite: 43 checks passed, exit zero,
no source requests or file writes. The helper files are now frozen at:

- `observer.mjs`: `49c4838d7f36f3009fbd7079b7948db37c606e5b2d8724511cafb2a0db9f3faa`.
- `offline-checks.mjs`: `4776ec930d55f4aaef543ed6b66ff7695f8ef91a3400e08057f50227b3720292`.

The exact live invocation is:

```powershell
node .cache/ps09-ev-01/observer.mjs live 49c4838d7f36f3009fbd7079b7948db37c606e5b2d8724511cafb2a0db9f3faa 4776ec930d55f4aaef543ed6b66ff7695f8ef91a3400e08057f50227b3720292
```

One persistent shell process receives the five exact operation commands
serially. Only `inspect` is cleared for the first three policy operations;
dependent requests require actual policy review or receive explicit skipped
receipts. No process restart or receipt repair is authorized.

## Actual execution and read-only recovery

The preceding paragraph describes the reviewed intended interface. The actual
launch used `exec_command` without `tty: true`. The noninteractive input stream
ended immediately: the observer created and synced its initial ledger, emitted
`ready` with zero network attempts, then exited 1 with
`local_stop_read_only_recovery_no_resume`. No operation command was delivered,
no operation was reserved, and the transport function was never called. This
was the lead's launch error, not a provider failure or a finding that bounded
TLS observation is infeasible. The 43 offline checks did not exercise the
real shell session's input lifetime; they were insufficient to validate launch.

The ledger creation time is `2026-09-05T04:56:25.767Z`. Read-only recovery found
exactly three ignored files:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `observer.mjs` | 25,088 | `49c4838d7f36f3009fbd7079b7948db37c606e5b2d8724511cafb2a0db9f3faa` |
| `offline-checks.mjs` | 16,809 | `4776ec930d55f4aaef543ed6b66ff7695f8ef91a3400e08057f50227b3720292` |
| `operation-ledger.json` | 478 | `6756d37ed27b23c86c0ccefb50761db3cdb02cbbd2eaa5d707bf93ea97a98cb5` |

The frozen helper files have their read-only attribute set. The untouched ledger
has `phase: active`, an empty operations array, and zero attempted operations,
reserved bytes, observed body bytes, network milliseconds and emitted source
view bytes. Its active marker is an interrupted initial state, not permission
to resume. The process exit and this terminal record govern recovery. There
are no operation receipts; none may be backfilled after interruption.

The [approved packet](../handoffs/ps09-run-02-real-evidence-entry-packet.md)
explicitly states: **"Interruption ends the run"**, and reopening the directory
permits **"read-only recovery, not further network or receipt writes."** This
stop comes from the owner-approved packet, not an additional skill requirement.
No automatic approval review rejected an operation. No retry, alternate launch,
source request, ledger repair or receipt creation followed the stop. Unused
allocations cannot be transferred to a new run. All five planned operations
remain unattempted; all source and claim decisions remain unresolved.

The lead's remaining lease covers only terminal reporting, roadmap restoration,
read-only custody verification, required repository checks and the local commit.
Independent final reviews and validation outcomes are recorded in the handoff.
