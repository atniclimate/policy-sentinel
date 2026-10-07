# GD-31 successor preparation contracts

Status: local preparation under D-086 and D-087. This document specifies the
bounded contracts implemented in [the schema](../../schemas/development-authority.schema.v1.json)
and [pure validator](../../src/core/development-authority.mjs). It does not
implement acquisition, a public record successor, a wire adapter, source
activation, source qualification, sharing or publication. GD-13, GD-16, GD-21
and GD-22 retain their implementation and acceptance obligations.

## Authority and compatibility

The [development revision](../decisions/2026-10-06-development-plan-revision.md)
is the current direction. Historical zero-budget operation contracts remain
unchanged; preparation under the new direction never resumes an old run. Every
root object has `dispatchAllowed: false`. No API in this module performs I/O,
opens a listener, writes a corpus or invokes a transport.

Retained PolicyRecord 1.4, artifact/source v1 and AnalyzedCorpus 2.0 contracts
are not widened. A later reviewed public successor must introduce evidence-bound
jurisdiction references, replace the retained county Nation-name prerequisite
and municipal exclusion, provide positive and refusal migration fixtures, and
preserve retained data/replay compatibility before emitting new output. This
preparation contract does not itself make a new jurisdiction emit-able.

## Closed preparation objects

All inputs are JSON strings bounded to 1,048,576 characters. JSON Schema draft
2020-12 enforces closed objects, bounded arrays, dates, fixed versions and
explicit fields. The parser takes an explicit UTC `now`; it does not inspect
the system clock. Unknown keys at every object level fail closed. The schema
contains three distinct root kinds, rather than combining unrelated specimens.

### Source preparation

`source_preparation` carries a packet ID, D-086/D-087 decision references,
synthetic labeling, measured storage and one to 32 proposed sources. Each
source identifies its publisher authority class, access classification, proposed
jurisdiction references, document family, HTTPS official URLs, interface kinds,
date window, finite bounds, review state, output whitelist and custody namespace.
These are reviewed preparation claims; the schema cannot prove a URL is official
or that a reference actually establishes a reproduction right.

Bounds are total request attempts (including retries), retries per request,
total bytes, maximum bytes per response, requests per minute, timeout and
concurrency. Request and byte totals are independent ceilings; a later runner
must enforce both before transport. An URL carrying user information, query
parameters or fragments is refused at this stage. Sources needing query-based
API requests must represent a reviewed base endpoint; a later operation manifest
must separately validate request construction, allowed paths and parameters.
A namespace is an opaque identifier, not authorization to create a directory.

Review states distinguish `pending`, `blocked` and `reviewed_preparation`.
Unresolved jurisdiction lists may remain empty in pending/blocked preparation.
Reviewed governmental preparation requires a nonempty scope; an intertribal
organization may retain an empty list because its identity is not a jurisdiction.
No Nation jurisdiction or membership is inferred to fill an empty list.
Blocked rows require enumerated reasons. A reviewed preparation row needs
unexpired evidence references, reviewed reuse, nonempty allowed output fields,
positive finite bounds and a complete measured storage inventory. Metadata-only
reuse forbids quotations. Restricted rows cannot become reviewed public-source
preparation. This is package completeness, not source approval: the eligibility
API always returns `sourceQualified: false` and `dispatchAllowed: false`.

Public county, municipal and Tribal-government publications are eligible for
public-source discovery without a Nation-name condition. Public intertribal
publications are eligible as the issuing organization's publications, not as
each member Nation's position. Access is independent of issuer and subject:
restricted governmental or operational records remain restricted. Eligibility
establishes neither a Nation relationship nor instrument finality. The API
returns both as `not_established`; source evidence, normalization and successor
record contracts must establish any later claims. Draft/adopted/version status
must remain source-stated; an agenda alone is not evidence of final action.

Storage fixes the total managed cap at 50,000,000,000 bytes, the run maximum at
10 GiB and the post-write floor at 20 GiB. Managed bytes must include retained
historical originals, renditions, metadata, indexes, cases and exports across
all managed roots. Peak additional bytes include simultaneous acquisition,
staging, extraction and rebuild copies, and cannot undercount the proposed
source byte ceilings. Reviewed preparation fails without inventory evidence, if
managed plus peak exceeds the cap, or if remaining disk space falls below the
floor. Pending/blocked packets can preserve a measured deficit honestly; parsing
them never turns that deficit into a positive capacity forecast. No deletion,
eviction, cleanup or expanded allowance follows from this contract.

### Exchange preparation and migration

The common candidate uses the retained identifier `policy.search-context/1`;
its closed shape contains no Nation field. The separately versioned ATNI
candidate is `policy.search-context.atni/1`, with an optional
`selectedNation { id, provenance: user_declared, deliberate: true }`. These
names identify local preparation specimens, not implemented or negotiated peer
wire profiles. Existing protocol envelope, checksum, capability, hydration and
citation-output obligations remain with GD-16 and peer conformance.

Both forms contain exact corpus kind/ID/digest, recipient ID, `policy_search`
purpose, `memory_only` storage, sensitivity, and explicit criteria: jurisdiction,
topic and source IDs, date window and bounded query. Unsupported filters,
attachments, geometry and land-status keys are rejected. Nation identifiers
cannot be smuggled through jurisdiction IDs. Query heuristics reject familiar
coordinate/APN/address forms, but are not proof that arbitrary prose is public.
Private derivation and tiers above T1 are refused, not downgraded by stripping
fields. Every exchange assessment is synthetic only; real exchange is not
implemented.

ATNI specimens, and T1 common specimens, require separately supplied closed
authorization evidence bound to profile, recipient, purpose and active validity
window. Its scope is exactly `local_synthetic_assessment`; revoked or mismatched
evidence is refused. Selecting a Nation additionally requires membership in a
separately supplied synthetic registry whose computed digest matches both its
declared digest and the independent authorization evidence. The SHA-256 preimage
is UTF-8 JSON without whitespace or a trailing newline, with keys in this exact
order: `kind: "gd31_synthetic_nation_registry"`, `schemaVersion: "1.0.0"`,
`synthetic`, and `nationIds`. Nation IDs are unique ASCII slugs sorted in ascending
code-unit order. The digest field itself is excluded. This domain/version binding
covers classification and the entire membership set; changing membership while
retaining the pin, or replacing its digest without changing authorized evidence,
is refused. Input key ordering and Nation array ordering do not change the pin.
Slug syntax alone is not canonical identity proof. Real registry
qualification and registry publication remain GD-22/external evidence work.
Neither an authorization specimen nor a registry specimen is a new real grant.

A selected Nation expresses only a deliberate search criterion. It proves no
affiliation, representation authority, ATNI membership, policy applicability or
source-evidenced relationship. Migration from ATNI to common fails if a Nation
is present unless the caller explicitly chooses `removeNation: true`; it returns
a migration receipt reporting removal. Common-to-ATNI migration requires the
ATNI assessment evidence. Migration preserves corpus, criteria and sensitivity;
it cannot erase private derivation to create an exchangeable context. Independent
permission evaluation remains required and is not replaced by this migration.

### Independent permission specimens

`restriction_set` requires explicit nonempty `source` and `authored` permission
arrays. Each records classification, an agreement reference for private/shared
material, recipients, purposes, allowed fields, onward-sharing permission,
retention duration, validity and withdrawal state. An explicitly public authored
permission still must be supplied when there are no restricted authored notes;
omission cannot silently mean public. Agreement content never belongs here.

The evaluator intersects every source and authored permission for the proposed
recipient, purpose, field set, retention and onward-sharing choice. Expiry,
withdrawal or a denial on either side denies the whole prepared selection. A
public-source case with a private analyst note therefore remains constrained by
the note's independent permissions. This conservative evaluator does not redact
or serialize an output; later output code must either create a separately
reviewed permitted selection or refuse the transfer.

The returned `assessmentWouldPermit` describes synthetic conformance only.
`dispatchAllowed` remains false even for a positive result. Authenticating real
agreements, verifying both deployments, preserving restrictions through indexes
and exports, withdrawal/rebuild obligations and actual transfer remain separate
implementation work. No result claims that previously distributed copies can be
recalled.

## Verification and remaining work

[The synthetic fixture](../../fixtures/development/authority.synthetic.valid.json)
uses a fictional county endpoint and synthetic review/storage references.
[The focused tests](../../tests/pipeline/development-authority.test.mjs) cover
strict schema compilation; public local/Tribal eligibility; source review,
reuse and capacity refusals; malformed and unsupported input; scoped ATNI
selection; registry mismatch; explicit migration; private derivation; and
independent source/authored restrictions. Run `npm run test:development-authority`.

These checks are preparation evidence, not a live source test, negotiated peer
exchange, API integration, external registry acceptance or public contract
migration. The operation packet must remain blocked until its source-specific
qualification, capacity, contract and successor-runner requirements are actually
satisfied. Further owner blanket approval is not a substitute for those checks.
