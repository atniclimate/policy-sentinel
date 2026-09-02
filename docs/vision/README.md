# Additive vision custody index

Status: current navigation and status index. The linked contracts, reviews, and
reports retain their own historical wording and custody. This index does not
change their bytes, acceptance, convergence, or product relationship.

## Current states

| Phase | Current state | Canonical artifacts | Product effect |
| --- | --- | --- | --- |
| K0 lifecycle/assertions | implemented, independently reviewed, `complete` | [contract](k0-lifecycle-contract.md), [contract review](reviews/k0-contract-review-2026-09-01.md), [implementation report](reports/k0-implementation-2026-09-01.md), [implementation audit](reviews/k0-implementation-audit-2026-09-01.md) | none while `G-K0-S0-CONVERGENCE` is closed |
| S0 spatial experiment | implemented, independently reviewed, `complete`; impossible-fixture-only | [contract](s0-spatial-contract.md), [contract review](reviews/s0-contract-review-2026-09-01.md), [traceability](reports/s0-phase-1-traceability-2026-09-01.md), [implementation report](reports/s0-implementation-2026-09-01.md), [implementation audit](reviews/s0-implementation-audit-2026-09-01.md) | none; no real geometry, land, map, provider, or product integration while convergence is closed |
| O0 orchestration | repaired byte-sealed `1.0.0` candidate, blocked at contract review; unaccepted and unimplemented | [candidate](o0-orchestration-contract.md), [initial review](reviews/o0-contract-review-2026-09-01.md), [repair closure](reviews/o0-contract-repair-closure-2026-09-01.md) | none while review/acceptance/implementation and `G-O0-CONVERGENCE` remain closed |
| D0 change intelligence | historical proposal only | [historical development program](../policy-sentinel-long-running-development-program-2026-09-01.md) | no roadmap item, schema, fixture, implementation, authority, or dependency |

The live status, gates, and evidence are in [`ROADMAP.yaml`](../../ROADMAP.yaml).
The general PNW engine may reuse a separately accepted idea only after the
existing convergence gate and an exact product-integration decision. PNW
planning did not converge K0, S0, or O0.

## Protected contract identities

The roadmap validator protects these normalized LF/no-BOM identities:

| Contract | Bytes | SHA-256 | Additional identity |
| --- | ---: | --- | --- |
| K0 | 28,667 | `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d` | frozen accepted contract |
| S0 | 41,506 | `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888` | frozen accepted contract |
| O0 | 116,551 | `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381` | Git blob `39a340d04f87017a7ebdb2ac3585682048e323ed` |

Do not modernize these contract bodies to reflect later implementation status.
Use this index, the roadmap, and dated reviews for current navigation. A change
to a protected byte, status, or dependency requires its exact existing gate and
cannot be hidden inside product or documentation cleanup.

## Historical supporting material

- [`policy-sentinel-long-running-development-program-2026-09-01.md`](../policy-sentinel-long-running-development-program-2026-09-01.md)
  is a superseded strategy proposal; its K0/S0/O0/D0 sequence is not the
  current execution queue.
- [`policy-sentinel-sol-ultra-deep-dive-prompt.md`](../policy-sentinel-sol-ultra-deep-dive-prompt.md)
  is a completed diagnostic prompt, not an executable current handoff.
- [`recovery-inventory-2026-09-01.md`](../recovery-inventory-2026-09-01.md)
  is custody evidence for its stated checkpoint, not current Git status.
