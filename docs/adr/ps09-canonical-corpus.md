# ADR: one Policy Sentinel 0.9 corpus and release graph

Status: accepted Run 1 implementation decision under
`POLICY-SENTINEL-0.9-RUN-01-REPOSITORY-CONVERGENCE-AND-CORPUS-SPINE`.
Reconciliation anchor: `0ff44349c37b60006ee34475319a86ec5a87e9e0`.
This is not Run 2, real-source admission, or release acceptance.

Current addendum, 2026-09-05: the owner has adopted the full
[real-policy launch](../handoffs/ps09-real-policy-discovery-launch.md) prepared at
`39d738a` and instructed implementation under
`POLICY-SENTINEL-REAL-POLICY-DISCOVERY-01`. Its
[execution journal](../development/PS09-REAL-POLICY-DISCOVERY-01.md) records the
bounded successor closure, exact leases, source decisions and actual validation.
The Run 1 decisions and synthetic proof below remain historical compatibility
evidence; this addendum does not rewrite or extend their consumed authority.

## Decision and evidence boundary

The single active product path is PS09-01 through PS09-06 in
[`ROADMAP.yaml`](../../ROADMAP.yaml), with conditional repair/hardening runs
PS09-07/08. `PS09-06-LOCAL-RC` is the sole local release root. Legacy B1-B10,
broad PNW-00 through PNW-10 and the narrower real-source child lane retain
their item identities, statuses and dated evidence as archived accounting;
they are not additional release prerequisite graphs. The
[`component disposition`](../development/ps09-convergence.v1.json) accounts for
every anchored item. An adopted fallback is a visible gap, not an adapter.

The 0.9 target is a bounded representative PNW/ATNI-facing cohort and contrasting
scenarios, not a claim to an authoritative complete 59-member ATNI roster. A
complete-current-membership badge still requires exact originating evidence.
Recognition, membership, sovereign identity, reservation, BIA agency, source
association, relevance, jurisdiction and legal effect remain distinct. Crow
Tribal government is not a reservation or BIA agency identity; Fort Peck and
Fort Belknap are not interchangeable. Nevada is not automatically included.
Duwamish is excluded from the owner-selected initial cohort, not erased from
history or adjudicated by this engine. Native Hawaiian and nationwide models
are later compatible directions. Run 1 introduces no real identity facts.

## One implemented path, explicit compatibility migration

The ordinary build now routes its existing three fixtures through
[`synthetic-corpus-path.mjs`](../../src/pipeline/synthetic-corpus-path.mjs) and
the existing [`analyzed-corpus.mjs`](../../src/pipeline/analyzed-corpus.mjs),
then feeds validated corpus records to the unchanged artifact contract. A
comparison test proves artifact-document equality for equal generation time.
The app, dossier and CSV consume that artifact; no second facts/health store is
introduced. `PolicyRecord 1.4`, artifact 1.4 and source registry 1.19 are retained.

AnalyzedCorpus schema 1.0 keeps its narrow synthetic general-jurisdiction
semantics. Explicit schema 1.1 requires
`synthetic_application_compatibility`, the exact three canonical fixture
digests, registry and taxonomy pins, complete field provenance and unchanged
semantic policy validation. It preserves the county's exact synthetic Nation
evidence and the synthetic landmark accord rather than falsifying those facts
to fit the old profile. Missing, extra, duplicated, mutated or resealed inputs
fail closed. This closed fixture profile is a compatibility test, not a generic
real input or arbitrary synthetic-record admission mechanism.

Both versions reject real corpora with
`REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED`. The existing
RealSourceLifecycleBundle 1.0 is Federal-Register-specific, not a source-neutral
real lifecycle engine. Its historical contract, receipts, digest-drift block
and unissued FR-A1 remain untouched. K0/S0/O0 remain frozen and excluded from
runtime dependencies; their closed convergence gates are unchanged.

## Minimal object, identity and citation spine

The Windows-only [`corpus store`](../../src/pipeline/corpus-store.mjs) stores
caller-supplied synthetic bytes under SHA-256 fan-out paths. Portable custody
contains relative digest-derived paths only. The external root is selected
explicitly at the CLI or via `POLICY_SENTINEL_CORPUS_ROOT`; no root is silently
created by the ordinary build. The reviewed Run 1 instance is
`I:\policy-sentinel-corpus`, outside source control and public artifacts.

The store rejects repository/ancestor roots, UNC/device/ADS/reserved-name,
traversal, case-alias and overlong paths; it checks Windows reparse attributes,
hard links, volumes, byte quotas, free-space reserve, inventory and concurrency.
It copies data and identities before awaiting. Exclusive operation locks,
fsynced staging, same-volume promotion and immutable reservation receipts bound
replay. Dead-PID recovery quarantines incomplete work. Invalid/live/reused PIDs
or interrupted recovery guards require explicit operator custody; no automatic
lock theft or deletion of ambiguous evidence occurs. Recovery reservations may
conservatively retain quota and are not acquisition proof.

This requires an exclusively operator-controlled root. Node pathname operations
cannot defeat a privileged concurrent filesystem writer; mode bits are not a
Windows ACL guarantee. Time limits are cooperative between filesystem calls
plus a bounded native probe, not a hard deadline against a stalled kernel.
Atomic rename and file fsync are not proof against every hardware power loss.
The selected dependency is Node 24.19.0/npm 12.0.2 on Windows x64, using built-in
Node modules and the fixed Windows PowerShell executable. No dependency was added.

[`CuratedDocumentPack 1.0`](../../schemas/curated-document-pack.schema.v1.json)
and its [`runtime`](../../src/pipeline/curated-document-pack.mjs) reference
the existing corpus record and source-evidence binding, not duplicate records,
events, health, or lifecycle. Source/interface/operation, document and version
identities, object/rendition digests, parser/config version, UTF-8 byte-range
segments, context/text hashes and deterministic index support replay. A
proceeding is explicitly unknown; a document version is not a proceeding.
Published/effective/updated/data-as-of/retrieved dates retain source semantics;
issued/filed/signed/enacted/reviewed dates remain unknown without evidence.
Validation is not human review and a status label is not legal effect.

Only strict UTF-8 plain text, deterministic line-ending normalization and exact
title/available-summary citation are implemented. BOM, invalid UTF-8, prohibited
control bytes, recognized leading document signatures and ambiguous/missing
segments are rejected. This is not comprehensive file-format detection; literal
markup within accepted UTF-8 remains inert text. OCR, layout extraction,
PDF/HTML/XML/archive parsing and all transport are unsupported. Prompt-like
source text is inert data, never instructions. References are source-attested
within the synthetic trust domain only. Future deterministic-rule, human-review
and machine-suggested-unaccepted categories are vocabulary, not live capabilities.
Every network operation is denied before any URL is accessed; tests of unsafe
schemes, hosts or headers prove universal denial, not a working SSRF-safe fetcher.

Qualification, admission, acquisition, analysis eligibility, artifact eligibility
and publication are separate. These packs allow owned-fixture local caching,
analysis and full text only; excerpts, exports and public redistribution remain
prohibited. The ordinary synthetic artifact is its existing reviewed output
boundary; it does not publish the pack, raw object, rendition or index. Future
real local caching and public reuse require separate source-specific evidence.

## Remaining work and acceptance

Run 2's bounded synthetic identity/authority/scenario contracts are validated;
actual identity and broader scenario acceptance remains blocked. The adopted
launch authorizes its PS09-03/04/05 local corpus, acquisition, analysis and output
closure independently of those missing identity facts. Roadmap schema 1.6
retains PS09-02 as an explicit PS09-06 prerequisite. Source-specific current
evidence and runner readiness still precede dispatch; no Run 1 test supplies
terms, activation, freshness or coverage evidence.

The real successor must preserve one canonical evidence-bearing corpus and
version its contracts explicitly. Reviewed source objects and derived evidence
stay in a separately owned external run namespace; only reviewed `local-output/`
may be explicitly served on `127.0.0.1`. Ordinary builds remain synthetic and
cannot admit real input by relabeling a retained fixture profile. Integrated
real acquisition, replay, search, temporal/cross-context comparison and governed
output remain acceptance work until demonstrated in the execution journal.
Run 6 still requires its exact gate and scenario, security, accessibility,
provenance, coverage and local RC evidence. No AI, map/land data, private input, contact,
credentials, paid operations, notification, remote or publication authority opens.

Recovery requires full live roadmap reading and reconciliation before action,
not replaying an old prompt. The [Run 1 handoff](../handoffs/ps09-run-01-convergence.md)
records measured outcomes, review findings and the next exact gate.
