# Development plan adversarial review

Reviewed 2026-10-06 for the [development revision](../decisions/2026-10-06-development-plan-revision.md)
and [next-session handoff](../handoffs/2026-10-06-development-realignment-next-session.md).
The root integrator owns changes. A read-only sovereignty adversarial reviewer
examined the plan; separate read-only context and workflow agents checked ledger
dependencies and implemented workflow boundaries. They performed no acquisition,
code changes or delegated acceptance.

## Findings and disposition

| Finding | Priority | Change made |
| --- | --- | --- |
| Public sources do not make analyst questions, notes or findings public | P1 | The plan classifies authored material independently and combines restrictions at search/export/share boundaries. A private note on public citations is an explicit negative journey. GD-25 and GD-31 carry the obligation; selecting export cannot override source or recipient permissions. |
| A manual official-document import could falsely satisfy an API requirement | P1 | Each required API must exercise its declared API route end to end. Manual/direct-document import has separate acceptance; missing credentials leave the API incomplete. The definition of done, plan, handoff and GD-31 packet criteria agree. |
| Requiring the full nationwide survey before catalog/pilot would delay usable delivery | P2 | GD-17 is the finite initial five-federal-family, seven-state and ATNI/NCAI/USET matrix. GD-33 retains all-state/DC/territory survey completion for release. GD-12 and GD-18 depend on the initial matrix, while GD-27 also depends on GD-33. A source-specific block need not delay a qualified pilot subset. |

The same reviewer performed a finite closure check across the plan, handoff,
definition of done and ledger. All three findings are addressed; no material
remaining issue was found. GD-26 becomes the next selected implementation item
after the GD-30 planning checkpoint closes.

The reviewer also confirmed that the draft preserves Nevada and the exact
owner-provided planning labels; does not infer membership or Nation-policy
relationships from geography; counts temporary peaks within 50,000,000,000 bytes;
recognizes existing ATNI assessment authority; distinguishes public installations
from private/shared-data authorization; attributes resolutions to their issuing
organizations; and keeps county-contract and release-root changes explicit.

## Implementation evidence used for planning

The workflow assessment inspected the existing passage search, local loader,
workbench and research outputs. Deterministic exact/phrase search, filters,
version comparison, evidence-backed relations and reviewed output already exist.
The browser loader's 128 MiB single-corpus limit and 1,000 displayed results do
not establish 50 GB capacity. Case authoring/save/reopen, broader document styles
and production private/shared workflows require additional work. The earlier
2,000-work search measurement remains incomplete.

The ledger review identified the existing priority gaps, the missing release
prerequisites and the distinction between active resumable roots and all
next-action roots. The revised graph starts with GD-26, separates initial and
complete source survey work, and adds authority/manifest/crosswalk and bounded
search design tasks. These preparation tasks must represent later implementation
and acquisition packets; completing a design is not completing the product.

## Verification boundary

This checkpoint changes documentation and the ledger only. Roadmap and backbone
validators passed at startup, after graph admission and on the final candidate.
The candidate source-boundary scan passed (646 tracked paths, 682 source files).
The ledger passes scoped Prettier checking and staged diff checks pass. Markdown
preserves repository wrapping under the existing formatter exclusion; its local
links passed backbone validation. Terminal-ledger validation follows the actual
implementation commit before closeout.
Runtime, schemas, source profiles, permissions and data remain outside this edit.
The prior ignored local-settings formatting failure remains a known separate
GD-26 concern; no full-suite or new product-test result is claimed here.

A semantic comparison preserves all 104 other pre-existing ledger work items
and every gate and non-focus ledger section. Seven pending items are deliberately
revised and four are added. All 36 pre-existing untracked files match their
baseline SHA-256 values. Product, schema and runtime files are unchanged.

County general-jurisdiction eligibility, the exact ATNI versus general interop
profile, finite locality/source manifests and source-specific access details
remain concrete follow-up determinations. They do not reopen the owner's settled
50 GB, public-instance or ATNI-local-assessment answers.
