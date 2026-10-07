# Continuation prompt: current state for a fresh session

The October public demo is a separate maintenance and publication surface under
D-083/D-084. Recover [its current status](DEMO-STATUS.md) before demo work. The
local-only historical grants below retain their own scope; they neither revoke
that demo exception nor authorize new acquisition or general-engine publication.

General-engine plan updated 2026-10-07 under D-086/D-087; startup routing remains
under D-085. `AGENTS.md` holds the rules; this file holds where the engine is,
what to read, and what a fresh session does first. Historical launch, cutoff
and outcome documents remain preserved; their execution grants do not resume
through this file.

## Scope-specific startup context

General-engine work, shared extractor work, ledger graph changes, and uncertain
or mixed scope require the complete `ROADMAP.yaml` and the full ordered context
below. Shared code stays on this route even when its caller is the demo. Branch
names and the hook's five-action summary do not determine task scope.

For a task confined to the existing demo surface, read applicable instructions,
`docs/DEMO-STATUS.md`, the explicitly selected plan and matching recovery handoff,
and the following complete closure from the full YAML:

1. Current focus and terminal reason, plus the explicitly selected work item.
2. Every dependency recursively by item ID, every referenced authorization gate
   and decision (including D-083/D-084 for the demo exception), and the complete
   acceptance, evidence and blocker fields for those items.
3. The task's allowed and protected paths, validation obligations, and exact
   current authority. A completed or unselected demo record does not supply a
   new active task or reopen a completed grant.

If references are missing, authority or current state is inconsistent, or the
closure or scope is uncertain, complete the full read before implementation.
Full reading does not itself resolve an authority conflict. Both routes retain
the existing full-ledger validators before repository edits and every substantive
source, privacy, publication and acceptance gate. This rule reduces context only
for narrow demo work; it does not reduce validation or authorize new work.

## Current state (2026-10-07): general development

The non-PS09 Makah demo track was delivered at the ATNI Annual Convention and
is finished. The project has returned to general engine development, with
nationwide coverage (Tribal, federal and state sources across the United
States) treated as a core capability, not an extension.

The realignment session on branch `realign/general-development` (commits
`fff7990` audit, `20d0056` design, `6eb8947` realignment, plus a ledger
follow-up) produced three documents; the owner then ruled on their open
questions and added directions. For the full-context route, read in this order
before implementation:

1. `ROADMAP.yaml` (the canonical ledger; read it completely).
2. `docs/audits/2026-09-22-general-dev-audit.md`: the code as it actually is,
   baseline results, contract drift, the O-023 assessment and the
   severity-ordered findings.
3. `docs/architecture/module-boundaries.md`: the intake, context and output
   module contracts, the ecosystem map, the interop conformance tables and
   the refactor handoff (section 9).
4. `docs/architecture/general-development-addendum-2026-09-22.md`: Module 4
   (private context, user-supplied), the area resolver, PolicyContext v1, the
   designation registry, the Nation registry binding, the storage holding
   policy and the added work items.
5. `docs/decisions/2026-09-22-realignment-open-decisions.md` (the questions)
   and `docs/decisions/2026-09-22-realignment-rulings.md` (the owner's
   answers, RL-01 to RL-14).
6. `docs/decisions/2026-09-24-definition-of-done-general-development.md` and
   `docs/decisions/2026-10-06-development-plan-revision.md`: retained release
   demonstrations, latest owner scope and revised implementation sequence.
7. `docs/handoffs/2026-10-06-development-realignment-next-session.md`: bounded
   realignment sequence, protected evidence and checks.
8. `docs/handoffs/2026-10-07-gd26-reproducible-checks.md`: completed GD-26
   checkpoint, validation limits and next-task recovery.
9. `docs/handoffs/2026-10-07-gd17-initial-source-survey.md`: initial source
   survey, qualification gaps and current validation/next-task state.
10. `docs/handoffs/2026-10-07-gd18-storage-report.md`: measured storage command,
    inventory, conservative forecast refusal and next-task recovery.
11. `docs/development/gd31-release-acceptance-crosswalk.md`,
    `docs/development/gd31-operation-packets.md` and
    `docs/architecture/gd31-successor-contracts.md`: current release closure,
    blocked finite preparation manifests and synthetic boundary contracts.
    Recover `docs/handoffs/2026-10-07-gd31-successor-contracts.md` for the
    incomplete local checkpoint and exact validation failures.

Historical foundation: general-development session 1 applied RL-01. The rulings are
D-071 to D-079 in `docs/decision-register.md`, and the historical roadmap used schema
1.10: milestone "General development" (GD-00 to GD-23) is admitted by rule
behind four gates, `G-GENERAL-DEV-01` and `G-GD-PRIVATE-CONTEXT` approved for
local synthetic work, `G-GD-NATIONWIDE-CONTRACT` and `G-GD-INTEROP` closed.
Every other milestone keeps its frozen identities. Refactor wave 1 (GD-01
characterization tests, GD-02 module boundary test, GD-03 boundary-guard
tests) is complete. GD-24 archive/consolidation and GD-29 optimization O1/O2
are also complete. D-086 reorders pending work: GD-26 reproducible checks,
GD-17 initial survey, GD-18 measured capacity, GD-31 authority/manifest/release
crosswalk, and GD-32 bounded storage/search design precede bulk expansion.
GD-33 retains the complete nationwide survey without delaying the pilot.
The ledger's `current_focus` and `next_actions` own active/terminal status;
Recover session 1's historical detail from
[its outcome](handoffs/general-development-session-01-outcome.md).
`docs/architecture/module-boundaries.md` section 9.4 retains historical
pre-ruling design text pending GD-15; the current ledger and D-086 sequence
control execution.

D-082 settled the registry repository shape and sequential waves. The geometry
dependency is selected when GD-19 starts. D-086 records the 50 GB total cap,
public/private authorization distinction, ATNI local assessment authority and
the owner-selected AK/CA/MT/NV planning communities. Remaining contract and
source-specific details are listed in the revision; do not reopen settled
questions. Schema 1.11 preserves the historical four GD gates and represents
successor implementation, measured public acquisition, ATNI local assessment
and release acceptance separately. `GD-27-LOCAL-RELEASE-PACKAGE` is the current
general-engine release root; the crosswalk retains unmet PS09 obligations.
Neither that implementation requirement nor a source
qualification gap means the owner must repeat the adopted blanket direction.

D-087 accepts both former open choices: county/municipal discovery without a
Nation-name requirement and an optional selected Nation criterion in a versioned
authorized ATNI exchange. It distinguishes official public Tribal publications
from restricted internal policies and adds annotation-guided discovery requests
to GD-25. Read the updated plan and handoff; do not reopen these product choices.
GD-26 reproducible checks are complete at implementation commit `a3ac31a`;
recover [the checkpoint handoff](handoffs/2026-10-07-gd26-reproducible-checks.md).
Both hook runs pass 47/47 and the complete committed Bash deny inventory is
tested through the production matcher. The separate ignored-settings formatting
failure remains visible. GD-17 initial source survey is complete at `b839a56`;
recover its handoff above. It records a contract-preparation shortlist and an
empty newly dispatch-ready pilot subset. No policy payload was acquired, no
profile renewed and no API integration accepted. GD-18 measured storage capacity
is complete at implementation commit `8dc3985`. Its read-only command passes
29 focused tests and independent review. All twelve
declared roots total 558,104,040 bytes. The hypothetical forecast correctly
refuses because the included C: support volume is below the 20 GiB disk floor;
this is not an I: shortage and does not block GD-31/GD-32 preparation. Both
GD-31 is implemented and independently reviewed at local checkpoint `b6145f6`,
but is not complete: full npm test repeatedly failed at unchanged Windows
custody/native-probe deadlines under observed host contention. It is ready for
validation recovery, with zero active items; do not redo the preparation work
or infer completion from the 37 focused contract and 492 roadmap passes.
The test:spine command now serializes its same three files without relaxing
assertions or timeouts. Failed logs remain visible. GD-32 is ready and follows
GD-31's acceptance; no source dispatch has occurred.
GD-33 full nationwide survey is also ready. The full A3 restore/replay
demonstration remains future acceptance work.

## What a fresh session does first

1. Confirm the checkout: `git branch --show-current`, `git rev-parse HEAD`,
   `git status --short`. Compare against the explicitly selected plan and the
   matching surface's current handoff. For October demo work, start with
   `docs/DEMO-STATUS.md` and any private recovery explicitly selected by the
   current task or its plan;
   for general-engine work use the selected ledger item and corresponding
   handoff. Do not choose a plan by filename date or resume a completed grant.
2. Run `npm run validate:roadmap` and `npm run validate:backbone`. Both must
   pass before any edit; if one fails, the failure is the first finding.
3. Follow the scope-specific startup context rule above. Shared extractor,
   general-engine, ledger graph and uncertain or mixed work take the full route.
4. Select work only from the ledger, under the rules in `AGENTS.md`
   ("Durable execution ledger"). A design document, an addendum or a handoff
   is not an execution grant.
5. Keep the session ledger and the handoff as `CLAUDE.md` describes.

## Frozen source and external boundaries

- Do not repeat the consumed requests D3, R6, R7 or PF-01 to PF-17, and do
  not issue FR-A1.
- Preserve the 27-issued-request ledger and the immutable 43-file ignored
  evidence custody.
- The two v2 source reviews in `config/policy-sources.v2.mjs` expire on
  2026-10-05 (`govinfo-direct`, `washington-legislative-text`) and 2026-10-15
  (`federal-court-opinions-direct`).
- After expiry the runner refuses dispatch with `EXPIRED_PROFILE` (fails
  closed) until a new source review is recorded.

## Historical pointers

- PS09 engineering review 02:
  [journal](development/PS09-ENGINEERING-REVIEW-02.md) and
  [acceptance delta](development/ps09-engineering-review-02-acceptance-delta.md).
- PS09 knowledge assurance:
  [journal](development/PS09-KNOWLEDGE-ASSURANCE-01.md).
- Real-policy discovery:
  [execution journal](development/PS09-REAL-POLICY-DISCOVERY-01.md) and the
  [axe disposition](handoffs/ps09-real-policy-discovery-outcome.md#browser-repair-and-review-evidence)
  (ten preserved axe incompletes closed by a separate manual review).
- Makah demo: [document schema](../schemas/makah-demo-doc.schema.v1.json),
  [Fable 5.1 launch prompt](handoffs/makah-demo-fable-5.1-launch-prompt.md),
  [TSDF provenance record](development/makah-demo/tsdf-provenance-record-2026-09-15.json),
  and the machine-only convention stage package at
  `I:\ATNI-annual-convention-2026\ga-demonstration\policy-sentinel`.
- PS09 Run 1: [corpus ADR](adr/ps09-canonical-corpus.md),
  [component dispositions](development/ps09-convergence.v1.json) and
  [custody manifest](development/ps09-run-01-custody.json).
- Legacy archive (GD-24, D-080): `I:\policy-sentinel-archive`, copy-only,
  index `ARCHIVE-INDEX.md` SHA-256
  `8651713844eec390efcf17348daa506c626402b208f9344056e985c6a0c8694b`.

## Historical recoveries (moved here from the top of `AGENTS.md`, unchanged)

Current PS09 recovery: the bounded engineering review H-ENGINEERING-REVIEW-02 is
complete. Start with the [local outcome](handoffs/ps09-engineering-review-02-outcome.md)
and live `ROADMAP.yaml`; there are zero active items and all worker leases are
returned. ER-03/ER-04 repairs and full checks pass. Five synthetic measurement
cases completed; search at 2,000 works remains explicitly incomplete. The
[claim/evidence matrix](development/ps09-engineering-review-02-evidence-matrix.md)
recommends a broader finite PS09-02 tranche for separate exact adoption and
source review; it supplies no originating identity or scenario evidence. The
[prior knowledge assurance](handoffs/ps09-knowledge-assurance-outcome.md)
remains complete. The
[next PS09-02 evidence packet](handoffs/ps09-02-next-evidence-packet.md)
is an unexecuted proposal requiring exact later adoption and source review.
This completed maintenance scope cannot authorize acquisition or release work.

Discovery recovery: the bounded cutoff continuation is complete. Start with the
[local outcome](handoffs/ps09-real-policy-discovery-outcome.md) and live
`ROADMAP.yaml`. PS09-05 has scoped browser acceptance, including a separate
hash-bound manual disposition for ten preserved axe incompletes. There are zero
active items; the PS09 program remains blocked on PS09-02 identity/scenario
evidence. PS09-06 stays unstarted and gated. Preserve the sealed corpus; the
[cutoff prompt](handoffs/ps09-real-policy-cutoff-continuation.md) is historical.

Makah demo track (finished, non-PS09). Both items are complete on commit
evidence: groundwork at `554e105` and the bounded federal acquisition at
`07d5fb2`, with the ledger follow-up at `a1ee988`, all on 2026-09-15. Recover
the [groundwork outcome](handoffs/makah-demo-01-groundwork-outcome.md) and
the [acquisition outcome](handoffs/makah-demo-02-federal-acquisition-outcome.md).
[`docs/makah-demo/`](makah-demo/) holds the non-authorizing descriptive
documents (start at
[`00-llm-usage-manifest.yaml`](makah-demo/00-llm-usage-manifest.yaml)).
By owner ruling, all Makah demo material stays where it is; the audit
inventories it. D-068, D-069 and D-070 retain their recorded scope.
Acquisition is custody, not admission: no acquired document is admitted,
activated, excerpted or published, and the ten objects in the external
`makah-demo-02` namespace stay custody only. Per-document `G-J` decisions and
the `G-BIA-IDENTITY` prerequisite still precede any use or Nation association.
The provenance record's Honor section stays owner-curated and deferred. The
[ATNI Climate interop IO guide](development/atni-climate-interop-io-guide.md)
(`policy.search-context/1` in, `policy.citations/1` out) remains specified, not
implemented and not adopted. Open fact O-023, the owner's shapefile-driven
cross-app pipeline, is assessed in audit section 4, was decision RD-06 in the
decisions file, and is closed in modified form by ruling RL-06.

The 2026-09-19 external deep review (evidence at
`I:\policy-sentinel-review\2026-09-19\`) is preserved as evidence. Its
priorities are not roadmap authority; its findings on analyst workflows,
repeatability by another person and reuse on a second corpus are inputs to
general-development planning.
