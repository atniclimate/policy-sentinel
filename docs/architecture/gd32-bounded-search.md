# Bounded offline search for the pilot

Status: GD-32 design and synthetic measurement protocol, 2026-10-07. This does
not implement projection delivery, admit sources or accept the local release.
Authority and unmet outcomes remain in [ROADMAP.yaml](../../ROADMAP.yaml) and
the [successor crosswalk](../development/gd31-release-acceptance-crosswalk.md).

## Selected design

Use immutable, bounded canonical corpus projections for the next pilot. Keep
the existing in-memory search index within one validated projection. Introduce
persistent search only after measurements demonstrate a need and its own
implementation and evidence contract is reviewed. The managed 50 GB footprint
includes originals, renditions, historical custody, cases, indexes and rebuilds;
it is not a browser payload allowance or a measured search capacity.

The current application loader rejects a corpus above 128 MiB and admits only
the checksum-pinned real-source local profile over HTTP on 127.0.0.1. The search
API returns at most 1,000 hits; its total counts eligible matches in the loaded
corpus. A synthetic measurement harness must remain separate from that loader.
Neither ceiling establishes complete source coverage or an acceptable memory
footprint on every analyst computer. Do not raise either ceiling in this item.

Select a projection by explicit source and time population, using a versioned
deterministic rule. Its manifest must pin the parent corpus content digest,
projection content digest, file SHA-256, byte count, rule version, retained
stable identities, exclusions and coverage observations. Cases pin the manifest
and parent snapshot rather than silently following a mutable latest pointer.
Changing a selection produces a new projection and a reviewable binding delta.

Retain the full dependency closure of selected works, versions, captures,
source profiles, renditions, evidence segments, field provenance and included
events. Preserve original stable IDs, UTF-8 spans and digests. Never rewrite
source text to fit a browser budget. Validate the projected graph and refuse
oversized or unresolved required evidence. Relationships crossing the selected
population must be explicitly omitted or unresolved; they cannot turn into
negative assertions about an unsearched population. Projection code and its
negative fixtures belong to GD-35 and later delivery items.

The search view must disclose selected versus unsearched populations, their
source/data-as-of times, exclusions, returned/total counts and truncation. Healthy,
degraded last-known-good, unavailable and unsearched states remain distinct.
A zero-result statement applies only to the successfully searched projection.
Last-known-good content retains its original timestamp and digest. Reopening a
case whose pinned projection is missing must request explicit binding review;
it must not substitute a newer version or lose the original evidence reference.

Cases and authored notes carry permissions independently of source visibility.
A private note attached to public evidence remains private. Recipient review
applies separately to each case, note and output; public citations never confer
permission to share analyst research. Nation relationships still require exact
official evidence, and keyword search never creates taxonomy or legal claims.

## Named measurement protocol

`measure:search` is a new finite synthetic protocol. It imports only pure fixture
and oracle exports from the historical engineering script; it never executes,
resumes or changes that ended runner. Run it against a fresh explicitly owned
external directory. No source traffic or generated payload belongs in Git.

| Workload | Population | Queries | Repetitions |
| --- | --- | --- | --- |
| synthetic-100 | 100 works/versions, 400 evidence segments | 16 fixed cases | 3 warmups, 10 recorded |
| synthetic-500 | 500 works/versions, 2,000 segments | same cases | same |
| synthetic-2000 | 2,000 works/versions, 8,000 segments | same cases | same |

Queries are exact identifier `SYNTH-0000`, quoted phrase `copper lantern phrase`,
no-match `zzzznomatchzzzz` and empty browse, each unfiltered or as of 2026-06-01
using source availability, corpus observation or source effectiveness. Exact
identifier matching boosts the exact work; it does not exclude other lexical
matches sharing the identifier tokens. Every case requests 20 hits and four
passages. The fixture includes unknown, partial, future and late-observed dates
and exact multibyte café text. These are authored synthetic dates and labels.

Before timing, independent expected identities, temporal eligibility, ordering
and byte-for-byte citation replay must pass. Pin the fixture file SHA-256,
canonical digest, counts, maximum segment bytes and complete result digests.
Verify the pins again during repetitions; checksums alone cannot establish an
oracle. Stable version, rendition and segment IDs and exact UTF-8 spans must
survive serialization, parse and search.

Measure JSON decode/graph validation, index construction and each query. A cold
query uses a fresh index; it is not an OS-cache-cold process or cold disk read.
A warm query reuses a built index with its temporal cache primed. Use a fresh
child process per population. Report setup and case wall time separately from
the timed phases. Keep all ten observations, median, minimum and maximum;
ten repetitions do not support a p99 claim. RSS/heap observations are phase
samples; process high-water RSS includes setup and the rest of the child.

Each child has a 120-second watchdog including a five-second reaping reserve;
the parent has a 600-second total ceiling. Retain pre-timing pins and completed
partial observations if a watchdog expires. A killed or failed case is incomplete,
not a fast result. Stop further dispatch if ownership/reaping is unconfirmed.
Generation has a finite byte/file ceiling and never deletes historical output.

For rebuild space, actually retain a synthetic parent input, old projection,
staged replacement and manifests/oracles simultaneously. Record the logical
bytes of those files and the replacement's distinct digest. This is a measured
coexistence footprint for that fixture, not a persistent index size, physical
allocation peak, disk reservation or calibration for real 50 GB inputs. The
existing GD-18 managed inventory and free-space refusal remain separate.

The browser workload uses the same checksum-pinned payload and 16 result
oracles. Serve only its synthetic files and the two search modules on an owned
loopback endpoint. An installed runtime must be explicitly pinned and no browser
download or persistent user profile is needed. Block non-allowlisted requests
and service workers. Measure fetch bytes, digest verification, UTF-8/JSON decode,
index build and cold/warm queries. Replay citation bytes and compare each result
digest against the pre-timing Node oracle. Report observed browser heap only
when the runtime exposes a supported metric; missing memory evidence is
`unavailable`, never zero. Report browser/runtime versions and cleanup outcomes.
This verifies a search harness, not the application's loader, UI, accessibility
or analyst journeys. A missing installed runtime produces an incomplete browser
measurement and no invented timing or memory figure.

Browser API lookup (2026-10-07) used the find-docs CLI route, then primary
documentation to close gaps: [routing](https://playwright.dev/docs/api/class-browsercontext#browser-context-route),
[contexts and versions](https://playwright.dev/docs/api/class-browser), and
[page evaluation](https://playwright.dev/docs/api/class-page#page-evaluate).
The pinned historical package is 1.61.1; current unversioned API documentation
does not establish that an absent installation works. The harness's optional
[performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)
sample is deprecated and unreliable. Label it an estimate and never use it as
an acceptance metric; supported browser memory measurement remains open.

## Frozen analyst journey acceptance set

These twelve journeys are acceptance fixtures for subsequent implementation,
not demonstrations performed by this design item. All three output styles use
one evidence model and retain citations, coverage, review state and permissions.

| ID | Analyst action | Required evidence |
| --- | --- | --- |
| J01 | Search exact identifier and replay a café passage | Stable version/rendition/segment and exact UTF-8 byte span; visible selected population |
| J02 | Search phrase/topic, then browse a capped result set | Deterministic ranking, 1,000 ceiling, returned/total and explicit truncation; no inferred category |
| J03 | Repeat the same query under all three historical bases | Known/unknown/partial/future date exclusions and source wording remain distinct |
| J04 | Follow ambiguous or cross-projection references | Unresolved targets remain visible; no inferred relationship or missing-population claim |
| J05 | Search healthy, degraded, unavailable and unsearched populations | Pinned LKG digest/original data-as-of; zero matches restricted to searched population |
| J06 | Review supporting, contrary and missing evidence across revisions | Separate versions and conflict/missing state; source-supported statements only |
| J07 | Save a case, close, restart offline and reopen it | Original snapshot and evidence bindings replay; changed/missing bindings require review |
| J08 | Attach a private authored note to a public source and test recipient denial | Independent note/case permissions; public citation does not declassify research |
| J09 | Export a citation packet | Reviewed exact passages, stable identifiers, literal official URLs, reuse and coverage limits |
| J10 | Export a comparison matrix | Same reviewed evidence model; contrary/missing evidence and review state retained |
| J11 | Export a research memo | Same evidence/citation/permission rules; no legal-effect conclusion or automatic AI |
| J12 | Request discovery explicitly from an annotation | Deliberate reviewed request; private research excluded from transmission; duplicates, no results and failures recorded |

The synthetic search fixture cannot demonstrate case persistence, multi-version
conflict handling, output styles, permission delivery, long documents, browser
accessibility or official-source relevance. Those need their own implementation
fixtures and later acquired pilot calibration. The present design freezes the
questions and measurements; it cannot satisfy GD-25, GD-35, GD-38 or A1-A4.
