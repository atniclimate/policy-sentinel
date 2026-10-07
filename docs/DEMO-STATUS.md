# Live demo status

Updated 2026-10-06. Policy Sentinel 0.2.0 is in development. This page records
maintenance of the separately authorized public demo under D-083 and D-084 in
the [decision register](decision-register.md). General engine work remains in
[ROADMAP.yaml](../ROADMAP.yaml).

The maintenance candidate has passed the demo checks and full unit suite
described below. Publication and verification of the deployed candidate are
pending. The existing public deployment must not be assumed to contain these
changes.

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
- GovInfo search, Congress.gov and Regulations.gov remain switched off. Their
  local tests use invented responses; those tests do not establish live access
  or source acceptance. No credential, account or provider terms were added or
  changed in this maintenance work.
- Oregon and Idaho remain unavailable in the demo. Their recorded source gaps
  and access boundaries remain in place.

The source list reports which adapters are configured. It does not establish
that an upstream service is answering at that moment. If the list cannot be
loaded, the page shows an unchecked state and offers a retry. A failed policy
read does not become a finding that wording is absent.

The authorized material is public Tier 0 (T0) policy material. This demo uses no
Tribal codes or Tribal government documents. It makes no Nation-specific
relationship, rights, legal-effect or eligibility determination.

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

The Worker version confirmed at the start of this maintenance run was
`180deb6c-e72b-4eea-861c-51aa3259ce99`. It is a starting observation, not the
identity of the maintenance candidate.

| Required final evidence | Status |
| --- | --- |
| Final maintenance commit | Pending: record the exact commit. |
| Final repository and demo checks | Full unit suite: 1,763 passed, 80 skipped. Demo tests: 141 passed. Four baseline policy failures and unrelated local-settings formatting failure remain; the staged source scan passed. |
| Public artifact review | Pending: record the exact outgoing files and entry/asset digests. |
| Pages publication | Pending: record the deployed commit/build and verified entry/asset identities. |
| Worker publication | Pending: record the active version and verification time. |
| Bounded live acceptance | Pending: record the official-source requests actually made and their outcomes. |
| Checks after publication | Pending: verify the public page and Worker together and record any source gap. |

The deployed Worker account plan and large-document processor use remain
unverified; local parser wall time cannot establish them. Existing byte and
time limits remain in force. The project license choice remains an owner
decision; the earlier Python project's license has not been inherited. Compact
mode remains available through `?embed=1`, but integration with the separate
TERRA showcase is not established by these checks.
