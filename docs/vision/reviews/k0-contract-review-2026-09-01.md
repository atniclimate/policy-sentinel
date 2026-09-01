# K0 lifecycle contract review

Disposition: PASS for local synthetic-only implementation.

Reviewed contract: `docs/vision/k0-lifecycle-contract.md`.

Review method: two independent read-only agents inspected the candidate against
the owner authorization, `PolicyRecord 1.4`, the current schema and semantic
validators, identity/provenance code, binding documentation, and the proposed
K0/S0 seam. One agent used a cooperative implementability lens; the other used
an adversarial overclaim, compatibility, and failure-mode lens.

## Cooperative findings and closure

The cooperative review initially blocked freezing because lifecycle event types
could be mistaken for normalized status, ambiguity and actor absence were not
fully closed, identity formulas and fact predicates were underspecified, unary
relationship direction was unclear, and projection mutation/validation rules
were incomplete.

The frozen contract resolves those findings by requiring a separate exact
source-status label and status-as-of fact plus a versioned exact mapping;
defining `ambiguous_evidence`; omitting actor unless a source fact supplies it;
freezing predicates, value kinds, ID formulas, time comparison, event enums and
relationship endpoints; and enumerating the projection's mutable pointers,
replacement receipts, validation path, loss codes, and refusal codes.

Final cooperative disposition: PASS with no remaining freeze blocker.

## Adversarial findings and closure

The adversarial review established that the scalar `PolicyRecord 1.4` status,
same-source definite relationship graph, and single-source field provenance
cannot absorb concurrent, ambiguous, cross-source, or uncertain K0 assertions.
It also found risks of invented midnight/time ordering, automatic identity
merge, stale provenance, partial projection, and silent relationship loss.

The frozen contract keeps all such evidence in K0; forbids status derivation
from event, relationship, date, array position, or retrieval time; preserves
date/date-time/interval precision; validates canonical immutable fact graphs;
never merges equivalence endpoints; universally refuses a v1 one-record
projection when a relationship assertion touches the instrument; replaces
provenance at whole rebuilt roots; and returns all sorted blocking/loss codes
without a partial record.

Final adversarial disposition: PASS. All six final freeze blockers were closed.

## Scope disposition

No review required a new dependency, real source, provider, network, credential,
AI, Nation-identity or association change, private/land data, persistence,
backend, publication, or release-scope convergence. No owner stop condition was
triggered.

