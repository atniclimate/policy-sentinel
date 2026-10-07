# Continuation prompt: current state for a fresh session

The October public demo is a separate maintenance and publication surface under
D-083/D-084. Recover [its current status](DEMO-STATUS.md) before demo work. The
local-only historical grants below retain their own scope; they neither revoke
that demo exception nor authorize new acquisition or general-engine publication.

Updated 2026-09-22. This is the single current-state document for Policy
Sentinel. `AGENTS.md` holds the rules; this file holds where the project is,
what to read, and what a fresh session does first. Historical launch, cutoff
and outcome documents remain preserved; their execution grants do not resume
through this file.

## Current state (2026-09-22): general development

The non-PS09 Makah demo track was delivered at the ATNI Annual Convention and
is finished. The project has returned to general engine development, with
nationwide coverage (Tribal, federal and state sources across the United
States) treated as a core capability, not an extension.

The realignment session on branch `realign/general-development` (commits
`fff7990` audit, `20d0056` design, `6eb8947` realignment, plus a ledger
follow-up) produced three documents; the owner then ruled on their open
questions and added directions. Read, in this order, before any
implementation:

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

Ledger status: general-development session 1 applied RL-01. The rulings are
D-071 to D-079 in `docs/decision-register.md`, and `ROADMAP.yaml` is at schema
1.10: milestone "General development" (GD-00 to GD-23) is admitted by rule
behind four gates, `G-GENERAL-DEV-01` and `G-GD-PRIVATE-CONTEXT` approved for
local synthetic work, `G-GD-NATIONWIDE-CONTRACT` and `G-GD-INTEROP` closed.
Every other milestone keeps its frozen identities. Refactor wave 1 (GD-01
characterization tests, GD-02 module boundary test, GD-03 boundary-guard
tests) is complete, and the ledger is at a terminal checkpoint with zero
active items. Ready next: session R (GD-17 nationwide source survey, GD-18
storage capacity model) and session 2 (wave 2: GD-04, GD-05, GD-07, GD-08,
GD-09). The ledger's `current_focus` and `next_actions` say what is next;
recover that session's detail from
[its outcome](handoffs/general-development-session-01-outcome.md). Note that
`docs/PROJECT-BACKBONE.md` and `docs/architecture/module-boundaries.md`
section 9.4 still describe the pre-ruling schema 1.9 state until GD-15
updates them.

Open owner decisions after the rulings: addendum section 12 (registry
repository shape, wave concurrency versus the one-`in_progress` rule, the
geometry dependency).

## What a fresh session does first

1. Confirm the checkout: `git branch --show-current`, `git rev-parse HEAD`,
   `git status --short`. Compare against the last session handoff under
   `docs/handoffs/`.
2. Run `npm run validate:roadmap` and `npm run validate:backbone`. Both must
   pass before any edit; if one fails, the failure is the first finding.
3. Read the documents in the order above.
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
