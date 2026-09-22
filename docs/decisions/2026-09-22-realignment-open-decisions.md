# Realignment open decisions (2026-09-22)

Status: open questions for the owner, raised by the
[general development audit](../audits/2026-09-22-general-dev-audit.md) and the
[module boundaries design](../architecture/module-boundaries.md). Nothing here
is decided or applied. A ruling becomes authoritative when it is recorded in
[`../decision-register.md`](../decision-register.md) (the canonical register)
and, where it creates work, represented in [`../../ROADMAP.yaml`](../../ROADMAP.yaml).
Makah demo material placement is already decided (it stays in place), so it is
not listed here.

Completions without a dated record: none. Both Makah demo items have commit
evidence and commit timestamps: `554e105` at 2026-09-15T06:33:24-07:00 and
`07d5fb2` at 2026-09-15T08:18:30-07:00. They are now recorded as
`completed_on` in the ledger.

## RD-01 General-development ledger representation and refactor gate

**Question.** Should the ledger gain a schema 1.10 representation that admits
exactly the proposed items GD-00 through GD-16 and the gates G-GENERAL-DEV-01,
G-GD-NATIONWIDE-CONTRACT and G-GD-INTEROP? And should the `AGENTS.md` ledger
rule be amended so that general-development work can be selected at all?

**What it affects.** `ROADMAP.yaml`; `scripts/validate-roadmap.mjs`, which
under 1.9 freezes work-item and gate identities by digest (`:773-793`), rejects
unknown gates (`:483-490`) and permits only PS09, publication and named
maintenance items to be active (`:2975-2980`); `tests/pipeline/roadmap-validator.test.mjs`;
and the rule in `AGENTS.md` ("Select only within the authorized canonical PS09
graph; an archived ready item is not an execution grant", in "Durable execution
ledger"). Without this decision no refactor or nationwide step can start.

**Options.**

1. Approve the 1.10 representation as proposed (module boundaries section 9.4)
   and approve G-GENERAL-DEV-01 for a local, synthetic refactor with a zero
   acquisition budget and no source activation, private data, publication or
   release authority. GD-13 and GD-16 stay behind their own closed gates.
2. Approve the representation but keep G-GENERAL-DEV-01 closed for now. Every
   GD item then shows as `blocked` (checked).
3. Make general development a new release root beside, or instead of,
   `PS09-06-LOCAL-RC`. This is a larger change to the single-release-root rule
   (D-063).
4. Defer. Planning stays in the design document only.

**Recommended default.** Option 1. Implement it the house way: a
decision-register entry, then the validator extension and fixture tests
admitting exactly these identities, then the ledger change. Proposed rule text
to replace the quoted `AGENTS.md` sentence (not applied): "Select only within an
authorized canonical graph: the PS09 graph, or the general-development graph
under G-GENERAL-DEV-01 once represented. An archived ready item is not an
execution grant." Keep general development non-release until a separate release
decision, so D-063's single release root is untouched.

## RD-02 The two pre-existing uncommitted modifications

**Question.** What happens to the uncommitted changes to
`src/pipeline/policy-local-output.mjs` (cleanup preservation in `readOwnedFile`)
and `tests/pipeline/policy-assurance.test.mjs` (eight associated cases)? They
predate this session and belong to earlier work.

**What it affects.** Refactor steps GD-05 and GD-06 move exactly this code
(`readOwnedFile` moves to intake replay). Moving it while the edit is
uncommitted would either absorb unreviewed work into the refactor or overwrite
it. The baseline `npm test` ran with the edits present and passed.

**Options.**

1. The owner, or the session that wrote the edits, reviews and commits them as
   their own commit before GD-05.
2. Discard them.
3. Let the refactor session adopt them explicitly as step GD-05's first commit,
   with review.

**Recommended default.** Option 1. The edits pass the current suite, and a
separate commit keeps their provenance clear.

## RD-03 Backbone validation fails on a private, git-excluded note

**Question.** How should `npm run validate:backbone` stop failing on
`.local/handoff/HANDOFF.md`? That is the private handoff from the 2026-09-19
review session. It is excluded through `.git/info/exclude` and links to
`../../../policy-sentinel-review/2026-09-19/...`.

**What it affects.** The backbone gate in this working checkout (audit F-01).
It fails at baseline and after this session's changes, for this reason only.
The validator walks every on-disk Markdown file outside `.cache`, `.git`,
`coverage`, `dist` and `node_modules`, including git-excluded ones
(`scripts/validate-backbone.mjs:16-22, 698-703, 793-796`). This session did not
touch the note.

**Options.**

1. Move the note out of the repository, next to the evidence it links to
   (`I:\policy-sentinel-review\2026-09-19\`). No code change.
2. Rewrite the note's four links as plain code paths.
3. Change the validator to skip untracked git-excluded files. This is a code
   change and narrows the authored-inventory check.
4. Add `.local` to the validator's ignored directories. Also a code change.

**Recommended default.** Option 1. It keeps the validator strict and the note
intact.

## RD-04 Private land-context seam versus the land-data rule wording

**Question.** How should the ledger of decisions reconcile the Makah demo
private-context contracts with the `AGENTS.md` land-data rule and D-010's
wording? The contracts are `LandParcel` (land-status types including
`tribal_trust`, `tribal_fee`, `allotted_trust` and `reservation_fee`),
`LandBoundary`, `CitationExport` with its `parcel` scope, `resolveParcelQuery`
and a synthetic `AuthorizedPrivateContextAdapter`. The rule under "AI, privacy,
and security" says "Do not add maps, parcel geometry, ownership, trust-land,
fee-land, Tribally owned parcel, or sensitive land content". D-010 allows an
adapter that is "documented but unimplemented".

**What it affects.** The wording of `AGENTS.md`, D-010 and D-068, and how future
sessions read the seam (audit C-2, F-10). The code holds no land data and
follows D-068. No boundary is weaker today; the issue is that the documents
disagree about what exists.

**Options.**

1. Record a clarification in the decision register, with no rule text change:
   the rule governs data and public builds. D-068's geometry-free,
   synthetic-only contracts may exist in this repository as inert references
   that no module or public build may import. The boundary test (GD-02)
   enforces that. D-010's "unimplemented" means no real private adapter exists.
2. Amend the rule's text in `AGENTS.md` to name the D-068 exception.
3. Move the seam to a private repository. This conflicts with the current
   placement ruling and is not recommended.

**Recommended default.** Option 1. The rule stays exactly as written, and the
boundary test makes the clarification verifiable.

## RD-05 Nationwide public contract (superseding D-004's three-state coverage)

**Question.** D-004 fixes initial coverage at federal plus Washington, Oregon
and Idaho. Should it be superseded so that coverage is declared per source and
per jurisdiction through `JurisdictionRef` (`us`, `us-state:<USPS>`,
`us-county:<FIPS>`), with no fixed state list?

**What it affects.**

- The WA/OR/ID enum in `schemas/record.schema.v1.json:1335-1348`,
  `schemas/artifact.schema.v1.json:73-80` (and `:512`, `:544`, `:1069`) and
  `schemas/source.schema.v1.json:136`.
- The runtime filters in `src/app/data.ts:156` and
  `src/pipeline/nation-collection-policy.mjs:4`.
- The public coverage notice.
- D-004, and D-064's "nationwide ... later-compatible" wording.
- Proposed item GD-13, which sits behind G-GD-NATIONWIDE-CONTRACT.

Until this is decided, nationwide coverage exists only as the identifier model
and the local-corpus work (GD-09, GD-11, GD-12).

**Options.**

1. Supersede D-004 as above, through versioned successor contracts with
   migration fixtures (a `PolicyRecord` successor and an artifact package
   successor), gated by G-GD-NATIONWIDE-CONTRACT.
2. Widen the enum to all states in place. This is faster, but it keeps a closed
   list and breaks the additive-versioning rule in `docs/architecture.md`
   ("Schema changes are additive within a version where possible").
3. Keep the public app at three states and pursue nationwide coverage only in
   the local v2 corpus.

**Recommended default.** Option 1. It keeps coverage honest per source and
avoids a new hardcoded list.

## RD-06 Shapefile-driven cross-app pipeline (O-023)

**Question.** Which reading of O-023 should be adopted? O-023 asks Policy
Sentinel to identify "the policies attached within the shapefile for the
identified land use metadata".

**What it affects.** Whether any interop work (GD-16 behind G-GD-INTEROP)
happens; the `EXT-PRIVATE` boundary and gate `G-G`; D-010; the IO guide; and
the land-use-analyzer, TCR-policy-scanner and plan-assessor adapters (module
boundaries section 7). Audit section 4 gives the verdict: O-023 as written is
not feasible within the current boundaries, and the profiles themselves are
feasible with named changes NC-1 through NC-7.

**Options.**

1. **Design A, sender-side criteria.** land-use-analyzer keeps the shapefiles.
   The user runs a separate public topic search; land-use-analyzer sends
   `policy.search-context/1` with state/county identifiers, topics and dates.
   Policy Sentinel returns `policy.citations/1` and a jurisdiction-and-topic
   dossier. Version 1 carries no Nation criterion, the adapter is memory-only,
   and restricted-tier requests are refused. Any join back to parcels stays
   inside land-use-analyzer. No boundary changes.
2. **Design B, a Tribe-owned private deployment.** A separate private
   repository runs a real private-context adapter over Tribe-held data,
   importing the public engine. This needs the supplying Tribe's and the
   owner's approval under EXT-PRIVATE, G-G and D-010.
3. **Adopt O-023 as written.** Policy Sentinel would ingest geometry and parcel
   attributes. That requires amending D-010, EXT-PRIVATE, G-G and the profile's
   prohibition list. Not recommended.
4. Defer.

**Recommended default.** Option 1, recorded as D-071, which then opens
G-GD-INTEROP for the pure validator and projector only (no live listener) once
GD-06, GD-08, GD-09 and GD-10 are complete. Policy Sentinel authors pinned,
closed schemas for both profiles under `schemas/interop/` and offers them to
land-use-analyzer, which remains the specification owner. Design B stays
available as a separate, later Tribe-led decision.

## RD-07 Shared Nation reference across ATNI Climate applications

**Question.** Should the ATNI Climate applications converge on one Nation
reference? The candidate is `nation:<slug>` bound to the recognition notice:
FR Doc. 2026-01899, 91 FR 4102, with a per-entry locator. The TCR-policy-scanner
successor already keys five Nations this way. plan-assessor keys `tribe_slug`
plus the same FR document. Policy Sentinel's Nation IDs are synthetic today.

**What it affects.** Any Nation criterion or Nation association exchanged over
interop; the `JurisdictionRef` tribal kind (GD-09); the three sibling
repositories. It depends on G-BIA-IDENTITY, the 577-to-575 reconciliation, which
is still pending.

**Options.**

1. Adopt the notice-bound reference as the cross-application key after
   G-BIA-IDENTITY is satisfied, and exchange no Nation criterion until then.
2. Adopt it now, provisionally, with synthetic slugs only.
3. Let each application keep its own key, with reviewed crosswalks.

**Recommended default.** Option 1. It matches the rule that a Nation
relationship needs exact official evidence, and it keeps interop version 1
Nation-free.
