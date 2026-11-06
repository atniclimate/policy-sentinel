# Policy Sentinel project backbone

A short index. It points at the current files and says where history lives. It
holds no status and no plan.

## Working set

1. [`AGENTS.md`](../AGENTS.md): what the product is, the safeguards, what needs
   the owner, how to work.
2. [`STATUS.md`](STATUS.md): the current state, the next step and the open
   owner decisions. Overwritten each session.
3. [`PLAN.md`](PLAN.md): the goals, what makes each one done, its owner gates,
   what is out of scope, and the parked goals.
4. [`DEMO-STATUS.md`](DEMO-STATUS.md): the live demo, newest first.
5. [`decision-register.md`](decision-register.md): the owner's rulings in
   order.

Everything else is read for a specific fact, never as a start-up routine.

## One-sentence product definition

Policy Sentinel is a configurable, sovereignty-centered engine that watches
bounded authoritative policy sources, explains why material was surfaced, and
produces governed outputs without converting inference into sovereign,
jurisdictional, legal, or community authority.

## Authority order

When two statements appear to conflict, use this order:

1. exact current owner direction and still-open owner gates, whether supplied
   in the present request or recorded in the repository;
2. live repository bytes, Git state, tests and artifacts for what is
   implemented or verified;
3. the binding product, governance, acceptance, architecture and contract
   owners below;
4. dated source reviews, for observations made on their stated access dates;
5. supporting reports and completed handoffs; then
6. historical proposals, superseded prompts and the archive.

Planning text is direction, not schema, implementation, source, acceptance or
publication evidence. An agent report is advice until reconciled by the lead.

## Current contracts and references

| Subject | File |
| --- | --- |
| Product mission, application contract, non-claims | [`project-brief.md`](project-brief.md) |
| Regional scope, authority and acceptance | [`pnw-scope-and-acceptance.md`](pnw-scope-and-acceptance.md) |
| Provenance, association, privacy, public and private rules | [`data-governance.md`](data-governance.md) |
| Schemas, field meanings, compatibility | [`data-contract.md`](data-contract.md) |
| Architecture: current bytes and target seams | [`architecture.md`](architecture.md) |
| Module design: intake, context, output | [`module-boundaries.md`](architecture/module-boundaries.md) |
| Declared source and geography coverage | [`source-coverage.md`](source-coverage.md) |
| Source evidence index; dated reviews are in `docs/source-reviews/` | [`source-feasibility.md`](source-feasibility.md) |
| Interaction and accessibility contract for the static app | [`ux-spec.md`](ux-spec.md) |
| The current build design (Full 0.9) | [`development/full09-design-2026-11-05.md`](development/full09-design-2026-11-05.md) |
| ATNI Climate interop pathway | [`development/atni-climate-interop-io-guide.md`](development/atni-climate-interop-io-guide.md) |
| Realignment audit and open calls (dated records) | [`audits/2026-09-22-general-dev-audit.md`](audits/2026-09-22-general-dev-audit.md), [`decisions/2026-09-22-realignment-open-decisions.md`](decisions/2026-09-22-realignment-open-decisions.md) |
| K0, S0, O0 custody (protected) | [`vision/README.md`](vision/README.md) |

## Engine target and non-claims

```text
authoritative sources -> bounded adapters -> source facts/events
  -> evidence-bearing relations and classifications -> analyzed corpus
  -> region + governed deployment + persona projections
  -> document | web module | application | structured output adapters
```

Identity, recognition, organization membership, source association,
geographic relation, community relevance, taxonomy authority, configured
rights frame, legal applicability, review state, visibility and output
projection are distinct. Geometry, keywords, AI, eligibility, ownership,
sponsorship or owner-supplied counts cannot silently create another relation.

No current output is legal advice, a comprehensive legal database, a rights- or
jurisdiction-impact determination, a complete statement of a Nation's
interests, or a substitute for its cited official source. Public outputs contain
no real land geometry, parcel or ownership data, private community material,
telemetry, browser-side AI, or outbound notifications.

## Where the code lives

- Application: `src/app/`, `src/main.tsx`. Demo page: `demo/`, `src/demo/`.
  Cloudflare Worker: `worker/`. Built demo: `docs/index.html` and
  `docs/demo-assets/`.
- Pipeline and policy enforcement: `src/pipeline/`. Source adapters:
  `src/adapters/`; offline contracts: `src/contracts/`. Engine seams:
  `src/engine/`.
- Schemas, config, synthetic fixtures, scripts and tests: `schemas/`,
  `config/`, `fixtures/`, `scripts/`, `tests/`.
- Repository knowledge tooling: `src/knowledge/` and `knowledge/`.
- Frozen, untouched: `src/kernel/`, `src/experimental/`, `docs/vision/`.
- `dist/` is generated and ignored; `.cache/` is ignored staging. Never
  hand-edit or commit either.

## Where the history is

- `docs/archive/`: the archived `ROADMAP.yaml`
  ([`archive/ROADMAP-2026-11-06.yaml`](archive/ROADMAP-2026-11-06.yaml), with a
  comment-only pointer left at the old path), the earlier
  [`mvp-plan.md`](archive/mvp-plan.md) and the earlier
  [`continuation-prompt.md`](archive/continuation-prompt.md).
- `docs/handoffs/` and `docs/development/`: completed runs, coordination
  records and journals (PS09, PNW-01 to PNW-05, the Makah demo track, the
  real-policy discovery run). Completed grants and handoffs do not resume and
  authorize nothing.
- `docs/audits/`, `docs/decisions/`, `docs/architecture/`,
  `docs/source-reviews/`: dated audits, decision records, designs and source
  reviews.
- [`archive/PROJECT-BACKBONE-2026-10-10.md`](archive/PROJECT-BACKBONE-2026-10-10.md):
  the retained record of the earlier, longer edition of this index (the
  2026-10-10 text), kept byte for byte apart from its relative links.

Open items the trimmed index no longer lists, still open in the retained
record: per-document `G-J` decisions and `G-BIA-IDENTITY` remain open owner
items (the gate is in [`PLAN.md`](PLAN.md)), and the BIA recognition-notice
parser validates the 577 displayed paragraphs and fails closed, with no
reconciled 575-identity production registry.
