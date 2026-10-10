# Live demo status

Updated 2026-10-10. Policy Sentinel 0.2.0 is in development. This page records
maintenance of the separately authorized public demo under D-083, D-084, D-093
and D-094 in the [decision register](decision-register.md). General engine work
remains in [ROADMAP.yaml](../ROADMAP.yaml).

GovInfo, Congress.gov and Regulations.gov were switched on in the demo on
2026-10-10 and passed one bounded live check each. The interface, document and
provenance update below is built and committed locally at `d48626d`; its Worker
deployment, its publication and its live acceptance run are not yet done and
are recorded here when they happen. Earlier maintenance and validation receipts
remain below as historical evidence; statements there that the three keyed
sources are switched off, and descriptions of the earlier interface, describe
earlier checkpoints.

## Interface, document and provenance update, 2026-10-10

Owner direction D-094. Source commits `05050d8` (shared logic), `98a74ce`
(interface, document, Worker) and `d48626d` (review fixes and the rebuilt
`docs/` output). [The handoff](handoffs/2026-10-10-demo-interface-document-update.md)
holds the session ledger.

What changed for a person using the page:

- The page is a four-pane frame (Search, Results, Issues, Report) in the ATNI
  Climate dark style with a light theme switch. It fills the window with no
  page scroll at 1366 by 768 and larger; panes scroll on their own. On a phone
  it is one pane at a time behind a chip row. Description, limits, privacy and
  source notes are in one "About and Limits" dialog. A footer line carries the
  short disclaimers and the Tiered Sovereign Data Framework 0.9.8 link.
- Search scope is either federal sources, chosen with checkboxes, or one state
  from a drop-down. Each checked federal source is asked separately and reports
  its own count or failure. Congress.gov is skipped unless the terms are one
  bill reference.
- When official sources return the same Federal Register document number, one
  row is shown: the Federal Register record when that source lists it, then
  GovInfo, then Regulations.gov. The other listings stay linked. Matching is
  the exact shared number only. The Worker adds that number as a match key; the
  Regulations.gov field (`frDocNum`) was confirmed in the provider's OpenAPI
  specification on 2026-10-10.
- Export and Print view require five data actor entries typed by the person
  exporting: name, role, organization or Nation, sharing with, and purpose.
  They stay in the browser tab and the exported file and are not verified.
- The PDF and the print view render one shared document: cover with the data
  actor entries, one section per policy with a provenance block, a Data Actors
  and Sharing section, numbered IEEE-style references, and Data Provenance and
  Sovereignty Notes. The PDF embeds League Spartan and Lexend Deca and falls
  back to Helvetica when the font files cannot be loaded.

Statements corrected by independent review, now on the page and in the document:

- The demo has no Tribal code source and no Tribal government source, and
  searches federal and state government sources only. A federal source can
  itself publish a Tribal government document, such as an ordinance printed in
  a Federal Register notice, and the demo does not detect or exclude one. The
  earlier sentence on this page that the demo "uses no" such documents was
  stronger than the code. Whether to filter such results is an open owner
  decision.
- Showing issues for a policy, or citing it, sends that policy's public
  identifier to the demo service, which may keep the text it read, by
  identifier, for up to a day. Searches are still not logged or saved.
- The framework notice claims no certification or conformance and does not say
  who a person's notes or entries belong to.
- The Policy Sentinel reference carries the title, version and repository
  address only. An author and publisher line waits for the owner, because the
  README describes this project as independent.

Checks at `d48626d`, all on local synthetic material with no request to the
deployed Worker or any government host:

| Check | Result |
| --- | --- |
| Demo tests | 329 passed in 11 files. |
| Full `npm run check` | Exit 0 on the final tree with these records: every validation and test stage passed, 2,398 unit tests in 119 files, and the ordinary synthetic build and artifact validation. |
| Scripted pointer and keyboard walk | 394 of 394 checks in 12 runs at 1920 by 1080, 1366 by 768 and 390 by 844, both themes, run before the last wording edits. |
| Automated accessibility | No WCAG 2.0, 2.1 or 2.2 A or AA violation in 138 state runs. |
| Acceptance script, built page against a local mock | 82 of 82, after the last edits; request budget unchanged at two catalog reads, one search and one policy read. |
| Protected paths | Byte-identical to `e3f4c64`; private-context files unreachable from both demo entries. |

Five independent reviews (code, accessibility, design, sovereignty and privacy,
security) confirmed 46 findings after a second agent challenged each one; 12
more were rejected. All confirmed majors are fixed.

Known limits and items not done:

- Merging is proven with invented responses only. It is not proven until the
  deployed Worker returns one document from two sources.
- Not checked: Safari, Firefox, a screen reader, a physical print, and the PDF
  in Acrobat, Preview or pdf.js.
- The exported PDF is not tagged for screen readers; the dialog says so.
- Letters outside the embedded PDF fonts, including letters used in some
  Indigenous-language names, stop the PDF export with a message naming the
  character; Print view is the fallback.
- A search of four federal sources uses four of the 30 requests allowed per
  address per minute. The limit is unchanged.
- A very long list can hold the page for seconds while the PDF is built.
- One new dependency, `@pdf-lib/fontkit` 1.1.1, pinned exactly. It has had no
  release since 2020 and ships no licence text beside its MIT declaration.

## Keyed federal sources switched on, 2026-10-10

Under D-093 the owner registered an api.data.gov key and stored it as a Worker
secret. The key is held only by the Worker and is never sent to the page.

- GovInfo: keyword search. Results are metadata and an official link.
- Regulations.gov: document search. Results are metadata and an official link.
  A phrase needs quotation marks; unquoted words match separately.
- Congress.gov: lookup of one bill by reference, such as `hr 1234 119`. It has
  no keyword search in the demo.

The demo does not read policy text from these three sources, so it runs no rule
checks on them. Results are keyword matches and general-jurisdiction records.
They do not establish a relationship to any Nation.

The first live GovInfo search failed validation: the service returns the
issuing bodies as a list and returns documents inside a package (granules),
which the Worker had only met in invented test responses. Source commit
`ef47304` accepts the list and cites a granule by package and granule, so the
title, identifier and official link describe the same document. A regression
test uses the response shape recorded from the service on 2026-10-10. The 152
demo tests, type checking, lint and the source-boundary scan passed.

Worker version `3e41b801-3018-487d-a590-4417824f8d11` was deployed on
2026-10-10. Checks at 18:37 UTC: the source list reported all three as live;
one GovInfo phrase search returned 10 results of 1,460; one Regulations.gov
phrase search reported 228; one Congress.gov lookup returned HR 1 of the 119th
Congress. The public page itself did not change and was not rechecked in a
browser. These finite checks do not establish continuing provider availability,
rate-limit behavior under load, or source qualification for the general engine;
G-B-GOVINFO, G-B-CONGRESS and G-B-REGULATIONS remain closed there.

## Worker rate-limit maintenance, 2026-10-09

Source commit `66e8df0e446c541db27ead73e392620a9e24324d` stops search and
policy-read requests before contacting an official source when the configured
rate-limit binding fails. The service returns HTTP 429; its health and source
catalog routes remain available. A regression test checks the failure response
and confirms that no upstream request occurs.

Worker version `367b993d-dd60-4d34-975f-d0771af22445` serves 100% of traffic
from 2026-10-09 at 19:26:27 UTC. Bounded health and Federal Register metadata
search checks passed, including response shape, allowed-origin CORS headers,
security headers and the retrieval timestamp. The configured rate limit remains 30
requests per 60 seconds; no source, credential or Worker setting changed.
The failure path was tested synthetically; no production limiter outage or
sustained-load test was performed.

The unchanged source passed 81 Worker tests and 495 roadmap-validator tests,
plus roadmap, backbone and source-boundary validation. The change review found
no actionable findings. This commit also repairs the blocked-roadmap test
fixture and excludes two existing Git-ignored local files from formatting;
the older formatting-failure statements below describe earlier checkpoints.
The source fix is included in public `main` commit
`73e7c7e3e15e64deb8c586d6a1d4dcf040283d04`, whose Pages build completed on
2026-10-09 at 19:07:00 UTC. General-engine release acceptance remains separate.

## Audit-fix release, 2026-10-08

Published commit `01b5e2d3e42ba1c6e7ccb5bcc640b0f2f9e47d00` contains only the
five reviewed fixes, their tests, a missing-favicon repair and rebuilt demo
assets. Unrelated general-engine development commits were excluded. GitHub
Pages finished building that commit at 21:24:45 UTC. The published Git tree
matches the independently reviewed local release tree exactly.

Worker version `abcc306e-91d2-4064-9b2b-bba569c0bcf0` serves 100% of traffic.
The deployed PDF confirms `demo-rules-1.0.2`. No source, credential or account
setting changed. The release build, source-boundary scan, type checking and
150 demo tests passed. Chrome passed all 39 deployed checks, including live
search/read, citations and notes, PDF evidence, printing, accessibility,
keyboard focus, mobile layouts, embed mode and no console errors.

The existing lockfile reports seven development-dependency advisories; the
production-dependency audit reports zero. No dependency versions changed.
Browser checks do not establish comprehensive source coverage or general-engine
release readiness. Citation-format drift is covered by synthetic regression
tests rather than forced against live source responses.

## Public page and source coverage

- [Open the demo](https://atniclimate.github.io/policy-sentinel/). GitHub Pages
  serves the `docs/` directory on `main`. The page source is in `demo/`;
  `npm run demo:build` generates its entry and assets.
- The page uses the
  [demo service](https://policy-sentinel-demo.atniclimate.workers.dev), whose
  source is in `worker/`. It retrieves material from an exact list of official
  government hosts, refuses redirects and limits requests and document size.
- Federal Register search reads official text from GovInfo. Washington
  Legislature lookup reads original bill text by bill number and biennium.
  Other bill versions are outside this demo lookup.
- GovInfo search, Congress.gov bill lookup and Regulations.gov search are on
  from 2026-10-10 through the owner's api.data.gov key (D-093), as metadata and
  links only. See the section above for what was checked.
- Oregon and Idaho remain unavailable in the demo. Their recorded source gaps
  and access boundaries remain in place.

The source list reports which adapters are configured. It does not establish
that an upstream service is answering at that moment. If the list cannot be
loaded, the page shows an unchecked state and offers a retry. A failed policy
read does not become a finding that wording is absent.

The authorized material is public Tier 0 (T0) policy material. The demo has no
Tribal code source and no Tribal government source; a federal source can still
publish a Tribal government document, and the demo does not detect or exclude
one (corrected 2026-10-10, see the update section above). It makes no
Nation-specific relationship, rights, legal-effect or eligibility determination.

## What changed

Overlapping requests now preserve the selected policy and the evidence saved
with each citation. Removing a citation clears its selected passages and notes;
a late response cannot restore it. Damaged browser storage can recover valid
entries, and printing uses the current report even when storage is unavailable
or full.

The service and browser validate response shape and identity, bound response
size and waiting time, and keep failure messages separate from successful
results. Search requests bypass application caching and logging. An optional
policy cache uses validated document and extractor/rule identities; cache
failure does not discard a completed source read. The service uses temporary
in-memory address counters to limit requests. Hosting and source providers have
their own service policies. Citations and notes stay in the browser tab unless
the person using it exports or prints them.

Automated checks now examine complete retained sentences before forming short
excerpts. They recognize layout-hyphenated wording while keeping the source
wording in the quoted passage. The rule version is `demo-rules-1.0.1`.
Consultation wording, Tribal references, dates, cross-references and status
signals remain automated demo flags. An absence check is labelled as a rule
assessment. These are not Policy Sentinel's reviewed findings or legal advice.

Portable Document Format (PDF) exports retain source identity, official links,
separate metadata and text retrieval times, the text fingerprint, extractor and
rule versions, selected passages, locations and notes. Missing text receipts
are explicit. Characters the export font cannot display stop that export with
a clear message; Print view provides the browser-font fallback. The report
continues to omit counterevidence, as authorized for this demo.

## Local acceptance evidence

The following checks used local synthetic material. They do not establish live
provider availability or acceptance of a deployed build.

| Check | Result |
| --- | --- |
| Focused demo tests | 141 passed across seven files. |
| Main Chromium browser journey | 39 of 39 checks passed, Chromium 153.0.8010.12. |
| Installed Chrome browser journey | 39 of 39 checks passed, Chrome 154.0.8037.98. |
| Installed WebKit browser journey | 33 of 33 applicable checks passed, WebKit 26.5. Chromium-only browser-PDF/print checks are excluded. |
| Extended browser cases | All 20 cases passed across the initial run and scoped corrective reruns; earlier failures remain recorded. |
| Downloaded and browser-rendered reports | 29 pages across 10 PDF files inspected visually, including every page of a 16-page report. No blocking clipping, overlap, missing-glyph, blank-page or readability defect was observed. |

Browser checks covered the complete keyboard journey and focus return, source
outages and retries, rate limiting, malformed replies, empty extraction,
damaged or refused storage, retained notes, export and print. Ordinary and
compact layouts passed at 320 and 390 pixels. Bundled Chromium also verified
actual browser zoom at 200% and 400%, a browser default font of 24 pixels, and
reduced-motion presentation. A source-grid overflow found with enlarged text at 320 pixels was
repaired and the affected layouts were checked again. Automated accessibility
checks found no tested Web Content Accessibility Guidelines A/AA violations;
that result is limited to the exercised states.

The rendered reports cover minimal and multiple-record exports, long titles,
links, notes and passages, supported accented characters, browser-font Unicode
fallback, and printing after storage failures. This does not establish every
script or font on every computer. Brave was unavailable at the inspected
installation locations. Native screen-reader speech and operating-system
printer dialogs or physical printing were not assessed. WebKit print lifecycle
was not established; its passing count must not be used as that evidence.

## Measured PDF improvement

The only adopted performance change finds the largest fitting part of a long
PDF token without repeatedly measuring every shorter prefix. Three serial
before/after pairs, with alternating order and initial/revisit runs, reduced
the long-report generation median from **493 ms to 50 ms** in the final
build comparison, about 90%. The typical-report median was 6.5 ms before and
6.1 ms after.
Timing varied substantially across samples; these numbers describe the tested
long-token workload, not a general speed claim.

With fixed report metadata, minimal, typical and long outputs retained exactly
the same PDF bytes and extracted text. These are local report-generation
measurements, not a promise about every device, provider response time or
deployed Worker processor limits.

## Repository checks and retained failures

The quiet starting `npm test` stopped with four historical local-policy test
failures: two source-profile fixtures had expired on 2026-10-05, and two local
corpus replays encountered available storage below the existing reserve of
20 gibibytes.
No expired profile was renewed, reserve lowered or ended acquisition resumed.
The remaining child suites were then run separately.

The starting unit suite recorded 1,652 passes, 80 skips and three failures:
a pipeline timeout, a Federal Register interface wait, and an import-boundary
check in the demo browser runner. The runner import defect was repaired.
The pipeline and interface checks passed in isolated follow-ups, as did the
five timeout cases recorded by the previous session. Those isolated passes do
not turn a failed combined run into a passing one. The starting format check
also failed on an unchanged local settings file outside this work.

The final unit suite passed all 106 files: 1,763 tests passed and 80 existing
contract placeholders remained skipped. Runtime, hooks, lint, type checking,
roadmap, backbone, knowledge, foundation, corpus, spine, assurance and Tier 1
checks passed. Both the ordinary synthetic build/artifact validation and demo
build passed. The four historical policy failures and local-settings formatting
failure remained. All required child commands were run despite those failures;
the combined repository result remains failed.

The initial final source scan stopped because Git still listed three obsolete
assets before their reviewed deletions were staged. The scan then passed on the
final staged inventory; no scanner predicate was relaxed.
Local demo acceptance does not establish general engine release readiness.

## Publication record

The implementation is commit `3a037f9cd7350cbc96fd7a185756c58984b6ab6e`.
GitHub Pages build 1265628829 completed for that commit. The browser then
verified the exact entry, stylesheet, application script and PDF script against
the reviewed build. The outgoing `docs/` inventory contains 141 tracked files;
unrelated untracked planning files and private assessment evidence were excluded.

The active Worker version is `48c514b8-df5e-417f-91b7-8d2954f94d5d`,
confirmed at 100% in deployment `8f317b84-d10f-4240-a63f-ba92b6336e6e`
on 2026-10-07 at 01:38 UTC. No source, credential or account setting changed.

The live browser sequence finished at 01:39 UTC with 234 checks passed. It
searched Federal Register once for the example `Executive Order 13175` and
read the first readable result, FR document 2025-23880. That is a search result,
not a claim that the result is Executive Order 13175. It then looked up
Washington HB 1100 in the 2025-26 biennium and read its as-introduced text.
Both records retained their exact identities and evidence receipts through
citation, notes, downloaded PDF and browser print. Compact navigation preserved
the saved report; locally blocking source discovery left it readable and
exportable with source availability marked unchecked.

The browser observed six successful Worker calls and 11 Pages requests, plus
one locally aborted Worker call for the outage check. There were no retries.
The code implies at most five official upstream calls for that sequence;
upstream counts, processor time and provider bytes were not observed at the edge.
Actual live PDF visual inspection is recorded in the private release receipt.
This finite result does not establish continuing provider availability.

The deployed Worker account plan and large-document processor use remain
unverified; local parser wall time cannot establish them. Existing byte and
time limits remain in force. The project license choice remains an owner
decision; the earlier Python project's license has not been inherited. Compact
mode remains available through `?embed=1`, but integration with the separate
TERRA showcase is not established by these checks.
