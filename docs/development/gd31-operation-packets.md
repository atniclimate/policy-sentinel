# GD-31 finite source and operation preparation

Date: 2026-10-07. The [closed preparation packet](gd31-operation-packets.v1.json)
represents the adopted D-086/D-087 scope. It is validated by foundation checks
against [the successor schema](../../schemas/development-authority.schema.v1.json).
**Dispatch-ready rows: zero. Dispatch is forbidden by this contract.**
No host was accessed, source review renewed, target acquired or existing runner
profile changed in this preparation. The [GD-17 survey](gd17-initial-source-survey-2026-10-07.md)
supplies carried dated findings, not fresh transport or rights evidence.

## Finite candidate set and bounds

| Packet | Required interface and selected population | Preparation ceiling | Qualification / execution owner |
| --- | --- | --- | --- |
| Pilot federal | GovInfo direct government-authored FR instruments; at most three exact instruments, not the keyed API | 12 total attempts, 32 MiB total | GD-36 / GD-37 |
| Pilot regional | Washington official bill versions/session laws; at most three exact instruments, excluding RCW/WAC compilations | 12 total attempts, 32 MiB total | GD-36 / GD-37 |
| Pilot intertribal | ATNI resolutions; at most three exact adopted/version-identified instruments, no inferred member-Nation positions | 12 total attempts, 32 MiB total | GD-36 / GD-37 |
| Federal Register API | A finite date/identifier query through the actual API | 16 total attempts, 128 MiB total | GD-39 |
| GovInfo API | A finite FR collection/package/granule API selection | 16 total attempts, 128 MiB total | GD-40 |
| eCFR API | A finite title/part/as-of API selection | 16 total attempts, 128 MiB total | GD-41 |
| Congress.gov API | A finite congress/measure/version API selection | 16 total attempts, 128 MiB total | GD-42 |
| Regulations.gov API | A finite governmental document/docket GET selection, excluding comments/submissions/attachments | 16 total attempts, 128 MiB total | GD-43 |
| Washington LWS API | A finite session/year population after enumeration-contract resolution | 16 total attempts, 128 MiB total | GD-47 / GD-44 |
| Oregon legislative OData | A finite legislative population after its exact access/terms gate | 16 total attempts, 128 MiB total | GD-47 / GD-44 |

All ceilings include failed attempts and pagination. Each response is at most
8 MiB; retries are zero; concurrency is one; at most four attempts per minute;
each request has a 30-second deadline. These are conservative preparation
ceilings, not claims about provider limits or permissions. The eventual source
review may narrow them. A larger population or ceiling requires an explicit
versioned packet change and independent review, not hidden pagination or retry.

The prospective selection window is 2025-01-01 through 2026-10-07. This is
neither a complete history nor an emitted coverage range. Exact targets and
their official advertised renditions have **not** been selected. The packet's
`officialUrls` are carried publisher/interface locators or reviewed base-route
candidates, not authorized GET requests. Host policy, exact path, query fields,
redirects, target IDs, formats and version dates must be bound in a later
dispatch manifest; arbitrary traversal is forbidden. None of these locators
establishes current endpoint viability. Query credentials and secret values
must never appear in this packet or its eventual public evidence.

The five federal APIs and two named state APIs form the fixed initial required
API set. ID, AK, CA, MT and NV are explicit unresolved statewide-interface
cells owned by GD-47, not imaginary APIs. That task freezes a versioned per-state
API, non-API or gap disposition; each newly required API gets its own acceptance
row in GD-44. The seven-state coverage goal is preserved even when an interface
is blocked. Direct documents, manual imports, a successful alternate API and
synthetic fixtures cannot satisfy another required API's acceptance.

## Storage, custody and output

The carried GD-18 observation is 558,104,040 logical managed bytes across twelve
declared roots at 2026-10-07T08:57:34.806Z. It is not a fresh reservation. The
preparation allocates at most 992 MiB aggregate source bytes and a conservative
4 GiB additional peak for acquisition, renditions, staging, indexes and outputs.
It does not predict measured per-record cost or reserve disk space.

The included C support volume had 15,024,418,816 bytes free, below the unchanged
20 GiB floor. The packet preserves this limiting observation and a refused
forecast. I: was not the limiting volume. A new full managed-root inventory,
per-volume projection, sufficient actual free space and an atomic write/rebuild
reservation precede dispatch. Do not omit support storage, delete sealed
evidence or silently relax the floor to produce a pass. The total cap is
50,000,000,000 bytes, including historical holdings and simultaneous copies;
the independent per-run cap is 10 GiB.

`unbound-gd31-successor` is an opaque unbound namespace, not a directory to create.
Future custody must be a separately owned external namespace with fresh
operation IDs and receipts; historical runs, review expiry and the 27-issued
request ledger remain untouched. Only an independently reviewed local-output
directory may be served on loopback, never corpus/acquisition roots. No raw data
or real Nation configuration belongs in Git.

All output allowlists are empty and reuse is pending. Source-specific review
must approve capture, extraction, local display, excerpt/export and any public
reuse independently. Proposed fields are only those in the closed contract;
unknown provider fields, contacts, comments, signatures, personal/land/cultural
material, secrets and private research are rejected. Issuer, subject and access
remain distinct. Source-stated draft/adopted/version dates cannot become legal
effect or a Nation relationship. Public citations do not make authored notes
public; apply both source and authored permission sets to every export.

## Per-operation prerequisites and acceptance

The machine packet uses the schema reason categories (`authority`, `access`,
`reuse`, `interface`, `credentials`, `coverage`, `capacity`, `expired_review`
and `contract_migration`); these categories summarize, rather than replace, the
specific unresolved facts below. Federal rows carry preparation scope `us`,
Washington rows `us-state:WA`, and Oregon `us-state:OR`. These describe source
selection only, not record applicability or a jurisdiction determination. ATNI
is an organizational publisher, not a jurisdiction, so its list remains empty;
no member Nation, territory or consent is inferred.

| Row | Exact unresolved preparation facts |
| --- | --- |
| Pilot GovInfo direct | Exact instrument targets, current host policy, expired profile and item-specific reuse. |
| Pilot Washington direct | Exact session/instrument targets, current reuse review and expired profile. |
| Pilot ATNI | Unverified direct interface, adoption/version evidence, access/reuse and exact targets. |
| Federal Register API | Successor review, historical R7 drift and exact query manifest. |
| GovInfo API | Closed G-B-GOVINFO credential/access gate, exact collection route and current review. |
| eCFR API | Unresolved access consent, unverified current API route and exact title/date selection. |
| Congress.gov API | Closed G-B-CONGRESS credential/access gate, current runtime host review and exact congress query. |
| Regulations.gov API | Closed G-B-REGULATIONS credential/access gate, GET terms review and exact document query. |
| Washington LWS API | Unresolved population enumeration contract, exact query manifest and current review. |
| Oregon OData API | Closed Oregon terms gate, current interface review and exact query manifest. |

Every row additionally lacks an exact external namespace binding and an
implemented reviewed successor runner, and carries the refused storage forecast.
These remain `contract_migration` and `capacity` blocks; valid preparation JSON
does not clear any of them.

Every row needs a current source-specific review, access/rights and host-policy
resolution, exact finite manifest, reviewed successor runner, focused fixtures
and a passing fresh capacity check. GD-31 does not dispatch and the historical
runner does not consume this preparation packet. A later adapter/runner change
must enforce the approved operation contract and refuse missing, expired,
oversized, cross-host, unauthorized or duplicate/spent operations before I/O.

GovInfo, Congress.gov and Regulations.gov retain their specific credential/terms
gates. eCFR retains the exact access-consent stop; NCAI/USET cannot silently
substitute for the ATNI gap. Oregon terms remain source-specific. Current
GovInfo/WA direct profiles remain expired, with no implicit renewal.

Real integration acceptance requires actual retrieval through the named API or
document route, immutable custody, extraction, normalized source/field/version
provenance, offline search and a replayable exported quotation under permitted
reuse. Each source must cover representative/missing/malformed fields,
pagination/duplicates/partial results, identity/version drift, source isolation,
bounded timeout/resume and controlled failure injection. Never induce provider
rate-limit failures. Stale fallback requires a checksum-validated approved shard
from the same adapter and original as-of time; absent prior output means
unavailable with no records. Record date/format exclusions and unknown coverage.

GD-38 proves the real three-family pilot separately. GD-39 through GD-44 prove
each required API. GD-45 proves Washington plus two other selected-state custody
populations; GD-46 owns each activated state's exact-label taxonomy mapping.
The [release crosswalk](gd31-release-acceptance-crosswalk.md) retains all
remaining implementation and independent human/peer demonstrations.
