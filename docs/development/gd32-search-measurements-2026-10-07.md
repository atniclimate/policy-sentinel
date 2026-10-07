# GD-32 synthetic search measurement record

Status: both finite attempts ended incomplete, 2026-10-07. This is measurement evidence for the
[bounded search design](../architecture/gd32-bounded-search.md), not delivery,
source qualification, analyst journey acceptance or local release acceptance.
The [autonomous run record](2026-10-07-autonomous-run.md) records authority,
leases, preserved failures and independent review.

The new `measure:search` protocol runs once in the fresh external namespace
`C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07/search-01`. Its parent and
each child have finite generation budgets; maximum aggregate attempted output
is 256 MiB/256 files. Each case has a 120-second watchdog including a five-second
reaping reserve, and the total ceiling is 600 seconds. No historical measurement
runner or provider acquisition is executed. No output is removed or replaced.

Selected runtime validation passed for Windows x64 Node 24.19.0/npm 12.0.2.
Before dispatch, independent read-only review passed the ownership, watchdog,
accounting, result-cap and citation-oracle controls. All nine focused tests pass
after final repairs; final lint passes. Host CPU was observed at 97% immediately
before dispatch. This is not a demonstrated quiet timing window.

The fixture contains 100, 500 or 2,000 authored works/versions, with four exact
UTF-8 evidence segments each. Sixteen fixed queries span identifier, phrase,
no-match and browse under unfiltered and three temporal bases. Three warmups
precede ten recorded repetitions. A separate 1,000-hit browse-cap assertion
checks full authored population/order and exact passage replay. Pins and
independent expected evidence are established before timing. Cold means a fresh
index, not a cleared operating-system cache.

Implementation and fixture hashes are retained in the external
`measurement-implementation-pins.json`; the final browser-script hash is in
`browser-implementation-pin.json`. Per-case oracle files pin payload SHA-256,
canonical digest, population, query specifications and expected result digests.
These external authored synthetic artifacts are reproducibility evidence and
are not committed corpus data. Awaited filesystem/report writes cannot be
represented as bounded if they never settle.

| Workload | Status | Timing, memory and rebuild evidence |
| --- | --- | --- |
| synthetic-100 | Complete | 27.665 s case wall; 752,135-byte payload; ten recorded repetitions and rebuild replay pass |
| synthetic-500 | Incomplete: CASE_WATCHDOG | 115.321 s case wall; child exited with SIGTERM and reaping confirmed; three warmups plus one recorded repetition retained |
| synthetic-2000 | Incomplete: CASE_WATCHDOG | 115.169 s case wall; child exited with SIGTERM and reaping confirmed; pre-timing setup did not finish |
| browser: same pinned populations | Incomplete: installed runtime unavailable | 100/500 payload pins verified; 2,000 setup absent; no browser or listener started |

For synthetic-100, median decode/graph validation is 205.36 ms and index build
is 13.79 ms. Cold-query medians range from 2.67 to 79.89 ms and warm-query
medians range from 3.90 to 10.94 ms across the sixteen
named queries; each median comes from its own ten observations. This range is
not a combined percentile or service-level commitment. Actual simultaneous
parent/old/staged/committed payloads and manifests/oracle occupy 3,019,328
logical bytes, excluding progress logs, runtime files and filesystem overhead.
Process high-water RSS sampled at that rebuild point is
301,780,992 bytes and includes the fixture, validation, indexes and measurement
process, not just one retained search index. The payload's maximum segment is
63 bytes: this short-document fixture does not establish real-document scaling.

Synthetic-500 pins a 3,760,135-byte payload and its pre-timing oracle. Its one
recorded repetition is a partial observation; the required ten-repetition
summary and completed rebuild evidence are unavailable. Do not compute a passing
median or extrapolate capacity from its timeout. Detailed observations remain
in the immutable progress files.

Synthetic-2000 has no pinned input or completed progress file. Its watchdog
failure therefore supplies neither search timing, browser payload size nor
stable-binding acceptance for that population. Overall Node command exits 1;
the parent records 258.260 seconds of wall time and confirms all owned child
exits. No child remains unconfirmed and no historical output was cleaned up.

The ended Node namespace contains 31 files and 8,177,492 logical bytes. This is
an inventory of this owned synthetic namespace, not the total managed footprint.

The browser attempt uses only the new synthetic namespace and the installed
runtime arguments already named in the run manifest. It cannot admit synthetic
input to the application's real-source-only loader. Missing runtime or missing
setup pins remain incomplete. The browser command exits 2 and records
`INSTALLED_BROWSER_RUNTIME_UNAVAILABLE`; its 2,000-work row records
`BROWSER_CASE_INCOMPLETE`. Browser and server cleanup are `not_started`, because
neither resource was launched. Browser timing, supported memory, UI,
accessibility and all twelve analyst journeys remain unmeasured until actual
evidence exists. The optional deprecated heap estimate is never an acceptance
metric. The managed 50 GB footprint is not a measured search capacity.

GD-31 mandatory acceptance remains pending after retained native probe failures.
GD-32 remains the sole active item. All 493 repaired roadmap regressions and
final lint, typecheck, roadmap/backbone and source-boundary checks pass. Global
formatting fails only on protected ignored local settings. Independent evidence
reconciliation passes. Final full `npm test` exits 1: corpus 13 pass; spine
30 pass/one unchanged privilege skip; policy 138 pass/five native probe timeouts.
Later full-suite phases do not run. This record does not mark either item complete.
