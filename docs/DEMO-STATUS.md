# Live demo status

Updated 2026-10-19. Policy Sentinel 0.7.0 adds the NCAI 2026 draft resolutions
menu under D-104 and D-105. Records below that say 0.2.0, 0.6.0 or 0.6.1
describe earlier checkpoints.
This page records maintenance of the separately authorized
public demo under D-083, D-084, D-093, D-094, D-095, D-098, D-101, D-102, D-103, D-104, D-105, D-106, D-107 and D-108 in the
[decision register](decision-register.md). Project state and the working plan
are in [STATUS.md](STATUS.md) and [PLAN.md](PLAN.md).

GovInfo, Congress.gov and Regulations.gov were switched on in the demo on
2026-10-10 and passed one bounded live check each. The interface, document and
provenance update below is public: the owner merged pull request 7 into `main`
as `e295957` on 2026-10-11 at 00:39:34 UTC, the Pages build of that commit
finished at 00:39:56 UTC, and its stylesheet was read back from the public
address. That build is source commit `c602468`. The D-095 follow-ups were then
published through pull request 8 at `4d320bc`, whose tree matches `085ec25`.
Pages finished that build on 2026-10-11 at 02:12:57 UTC. The public header was
read back as 0.6.0 on 2026-10-13; the seal and ATNI Climate citation are public.
The 0.6.1 maintenance update was subsequently published through pull request 9
as `e47ebba` on 2026-10-13; the prior session verified all 17 runtime files
against the reviewed build. D-101 then deployed the compatible Worker and
published the search/audit release recorded next.
Earlier maintenance and validation receipts remain below as historical
evidence; statements there that the three keyed sources are switched off, and
descriptions of the earlier interface, describe earlier checkpoints.

## Seeded discovery, release 0.8.0, 2026-10-20 (D-109, D-110, D-111)

Choosing an NCAI draft runs its planned searches and fills grouped Results:
Policies and Rules (the first topic on the checked federal sources);
Legislation (GovInfo BILLS and PLAW); Bills Named in the Title (Congress.gov);
and Court Opinions (GovInfo USCOURTS, Ninth Circuit and USREPORTS). At most 10
automatic requests, and Results names every source asked, including GovInfo and
Congress.gov when unchecked. Each row says why it was shown; each search shows
its own outcome. Sponsor-name searches run only on request and are worded apart.
Answers are held in tab memory, so re-choosing a draft sends nothing except to a
source that was unavailable. A cited row's export lists how it was found, with
the draft ID but never its title. Typed searches, examples and area chips share
the same plan code. The Worker is unchanged. State results remain external
links. Real-vault unlock and the owner's own look at the live flow are the
acceptance test. Checks are in [current status](STATUS.md).

## NCAI draft resolutions, release 0.7.0, 2026-10-19 (D-104, D-105)

**Acceptance correction (D-109):** the published 0.7.0 page did not load
policies into Results when a draft was chosen. Release 0.8.0 above replaces
that behavior.

The D-107 context expansion adds GovInfo bill/resolution, public-law and Ninth
Circuit searches, manually chosen seven-state policy/case directories, official
federal ruling/calendar links and NILL case bulletins. Terms stay in the panel
until a reader starts a search; choosing a state sends nothing. External links
do not establish integrated state or schedule coverage, legal status, relevance
or a Nation relationship. The [source review](source-reviews/ncai-context-research-2026-10-19.md)
records eleven research lanes and the five bounded live GovInfo probes.

D-108 authorizes publication of this expansion. The rebuilt artifact contains
17 runtime files; three replaced bundles were removed. The counts-only vault
scan validates generated queries against the existing 200-character limit and
reports zero plaintext hits across all 81 drafts. No private terms were exposed
or resealed. Synthetic unlocked-panel keyboard and desktop/narrow axe checks
passed; real-vault browser acceptance is still excluded. Current release state
and full-check evidence are in [STATUS.md](STATUS.md).

[PR 14](https://github.com/atniclimate/policy-sentinel/pull/14) published the
expansion as `2cfb485` at 2026-10-19 19:29:46 UTC; Pages finished at 19:30:12 UTC.
Its tree matches reviewed source `9807b63`. The full check passed with 2,649
unit tests in 124 files, 48 hook tests, all pipeline stages and the validated
synthetic build; two native Windows file-symlink tests remain skipped.
Readback at 19:30:42–19:30:47 UTC matched all 17 runtime files. Chromium passed
seven publication checks using those verified bytes and a synthetic catalog,
including keyboard opening, empty-password handling, Escape focus restoration
and two axe scans with zero violations. Two screenshots were inspected; no page
errors occurred. The batch made 17 static GETs, no retries and no provider calls,
then closed its browser. It did not unlock the real vault or exercise live
backend behavior. No Worker deployment was needed.

The follow-up bug-fix session implements items 1–6: private CLI
output confinement, accurate crypto errors, verbatim menu statuses, cancelled
unlock handling and keyboard-accessible unavailable chips, with synthetic
regressions. The local Pages artifact now includes these fixes. The fresh full
check passed with 2,645 unit tests; the rebuild and counts-only plaintext scan
passed, with zero hits across 17 runtime files. Three replaced bundles were
removed with `git rm`. Current verification and publication gates are in
[STATUS.md](STATUS.md). Under D-106,
[PR 12](https://github.com/atniclimate/policy-sentinel/pull/12) merged as
`178f89f` at 2026-10-19 18:21:17 UTC. Pages finished at 18:21:46 UTC;
the merge tree matches reviewed source commit `a715da7`.

All 17 published runtime files matched the reviewed build byte-for-byte.
Chromium 153.0.8010.12 passed seven checks using those verified files from a
route cache and one mocked catalog: visible version, locked state, keyboard
opening, empty-password prompt, Escape focus restoration and two axe states
with no violations. Screenshots were inspected. The batch made 17 static GETs,
no retries and no provider calls; there were no page errors. The browser closed
and no server was created. Real-vault unlocking and live backend behavior were
not exercised by this publication check; the password-dependent items remain
excluded.

The header has an NCAI button. A shared access password opens an encrypted
copy of the 81 entries on the NCAI 2026 Annual Resolutions Tracker, read
2026-10-19, grouped by the tracker's committee and subcommittee. Each entry
shows the tracker's verbatim recommendation, committee, sponsor affiliation and
notes, and offers suggested searches: federal topics, bills named in the title
(119th Congress), GovInfo court opinions (USCOURTS for current federal opinions,
including open cases; USREPORTS for Supreme Court opinions through 2018),
outbound CourtListener opinion and docket searches for other courts, recent
Supreme Court opinions and pending cases,
and a sponsor-name search labeled as unreviewed text matches. A policy-area
chooser offers each committee area's searches after unlocking. Public links to
NCAI and ATNI adopted resolutions and the NILL Tribal Law Gateway show without
the password.

The repository holds only `src/demo/ncai-2026.vault.json` (AES-256-GCM, key
from PBKDF2-SHA256, 600,000 iterations). The plaintext snapshot is kept in the
ignored `private/` directory and the password is not recorded; maintainers seal
and open the file with `scripts/ncai-vault.mjs` and `NCAI_DEMO_PASSWORD`. A
password-free artifact check runs through
`node scripts/ncai-vault.mjs scan private/ncai-2026.json` after the demo build;
it reports only draft, needle, file and hit counts. A
shared password deters casual access and indexing; it is not strong protection.
Once pushed, the encrypted file stays in public Git history; removing it later
stops new distribution but recalls nothing.
NCAI permission was requested by email on 2026-10-19 and is pending; NCAI
AssetBank files are not fetched. Source notes:
[the tracker](source-reviews/ncai-2026-resolutions-tracker-2026-10-19.md) and
[court references](source-reviews/court-opinion-references-2026-10-19.md).
No Worker change or deployment: the court searches use the allowlisted GovInfo
host, and CourtListener is reached only by links the reader opens.

## Review publication, 2026-10-13 (D-103)

The owner authorized committing, pushing and publishing the reviewed browser
verification changes. The release includes the maintained runner's failure and
request guards, regression tests, retained-App checkbox sizing and updated
capability records. The fresh full check passed with 2,558 unit tests in 121
files, all pipeline stages and the validated synthetic build; checked files were
unchanged. Two native file-symlink checks remain skipped on this Windows host.
Publication uses the normal pull-request path to `main:/docs`, followed by
static-byte and browser verification. Demo runtime files and the Worker
are unchanged; this release requires no Worker deployment.

## Browser verification, 2026-10-13 (D-102)

The current published demo passed two bounded Chrome 155.0.8059.40 browser
journeys using the installed Playwright 1.63.0. The dated/reference journey
passed 32 checks: Federal Register, GovInfo and Regulations.gov each returned
two pages with 20 distinct identifiers, accurate added-listing counts, retained
DOM rows and keyboard focus. Inclusive date checks passed where the displayed
date has that meaning; GovInfo's publication/issue distinction remained visible.
Washington reference lookup and its text receipt passed. Congress returned the
correct historical ordinal and canonical URL, but its direct official page
returned 403 without retry. That page's acceptance remains unverified.

The maintained report journey passed all 83 checks, including independent policy
and source counts, text receipts, selected passages and notes, PDF provenance,
browser print lifecycle, theme changes, compact/embed views, keyboard focus and
the exercised accessibility scans. The two stale count expectations recorded
under D-101 are repaired; the previously unreached live append/focus cases are
now reached and passing. Original failed receipts remain retained.

Request guards were tested locally before live execution. They reject unknown
routes and excess calls, refuse redirects before following them, and preserve a
failed receipt when transport fails. Neither browser transport nor failed
provider requests are retried. The policy-browser batch used at most 13 upstream
requests; three citation lookups for workflow clarification bring the session
upper bound to 16 of 20. The two browser journeys used three catalog requests
and 27 static requests. Upstream counts are conservative code-derived bounds,
not measurements at the provider. These finite results do not establish ongoing
availability, full coverage or outside-user acceptance.

Local synthetic Chrome and installed Windows WebKit runs cover controlled
failures and data boundaries separately. WebKit is not an actual Safari run;
Chromium-only PDF/print operations are not attributed to it. Local workbench,
study and retained-App evidence, repairs and remaining limits are summarized in
[STATUS.md](STATUS.md). No demo runtime or Worker change, deployment or
publication was made during D-102.

The extended synthetic matrix exercised 18 supported workflow groups per engine.
Windows WebKit's advertised Print view fallback preserves report content after a
PDF-module load failure, but direct PDF retry after ordinary reload still fails.
An isolated test with the exact generated Vite 8.2.0 helper reproduces that
interaction in Windows WebKit 26.6. It is a retained failed path, not a successful
PDF retry. The fallback's synthetic print events establish UI/content behavior;
they do not establish a saved WebKit PDF or an operating-system print dialog.

## Search and audit release, 2026-10-13 (D-101)

Pull request 10 published the search upgrade and six reviewed audit repairs below.
It merged as `981ecad` on 2026-10-13 at 21:05:47 UTC; Pages finished at
21:06:47 UTC. All 17 served runtime files matched the independently reviewed
production artifact. The compatible Worker was deployed first: version
`583cd4ab-f99b-4ffc-9d7b-c9d73466df18`, source `350329f`, serving 100% from
2026-10-13 at 21:01:53 UTC. No configured source, secret, rate limit or
observability setting changed. D-101's release commit, push and normal
pull-request/merge path to Pages from `main:/docs` are complete.

Seven bounded live search calls passed: pages one and two of `water` for the
inclusive 2025 range on Federal Register, GovInfo and Regulations.gov, and
`hr 1 101` on Congress. Each paged source returned 20 distinct identifiers with
matching search criteria and valid continuation. Federal Register publication
dates and Regulations.gov posted dates were in range; GovInfo's publication
filter remains distinct from displayed issue dates. Health, configured keyed
sources, CORS and response headers passed. The corrected Congress API citation
and URL passed, but a separate direct official-page request returned 403.
Direct route acceptance remains unverified; no retry was made. These checks do
not establish continuing upstream availability or outside-user acceptance.

The full repository and browser evidence below applies to unchanged inputs.
Fresh release formatting, lint, typecheck, source scan and artifact checks pass.
Earlier statements that deployment or keyed checks are pending describe their
checkpoints; D-101 and the live results above supersede those specific limits.

Live browser verification retains two outdated test expectations. Run 01 passed
19 checks, then supplied a page number where the assertion needed the added
listing count. Run 02 completed with 93 passing checks and one failed assertion
for the previous combined source/count announcement. The current separate
announcement and source/count rows were inspected independently. Citation,
report restoration, PDF/print and embed checks passed, as did eight settled
accessibility scans; no browser console errors were recorded. These receipts are
not all-pass runs. Dated append DOM/focus checks were not reached live.

D-102 subsequently executed the browser work recorded above and assessed the
owner's supplied staff workflows in [PLAN.md](PLAN.md). Dedicated interface
polish and deeper accessibility evaluation follow broader functionality, with
existing regression safeguards retained.

## Audit repairs, 2026-10-13 (reviewed)

The D-099 audit/fix/review loop closed six demonstrated defects. For the demo,
report reload now retains all alternate listings allowed by the search bounds;
historical Congress citations and URLs use the correct ordinal; known numeric
result exhaustion takes precedence over the page cap; and alternate-source
links have targets at least 24 pixels high. Connected local repairs reject
junctions before replacing artifact output and reset new authored material to
Restricted when an imported study is rebound to another corpus.

The focused report/export, Worker, artifact and study suites passed 158, 146,
57 and 15 tests respectively. Independent re-review closed every finding.
Chrome passed 19 synthetic checks and five settled accessibility scans,
including desktop/narrow report views in both themes, keyboard links, restored
provenance, study rebinding and public-export filtering. Screenshots were
inspected; no page errors or external requests occurred. A private production
build passed the 17-file artifact scan, and all 17 public runtime files retained
their exact SHA-256 hashes. The final `npm run check` passed: 2,556 unit tests
in 120 files, 48 hook tests, retained validation stages, source-boundary scan
and synthetic build/artifact checks. Native file-symlink fixtures were unavailable
on this host; junction and hard-link checks ran.

This audit made zero provider calls. D-100 authorizes the reviewed repair commit
and its push to `demo/live-pages`; pull request, merge, deployment and publication
still need separate owner authorization. Keyed GovInfo/Regulations.gov checks
and historical Congress route acceptance remain unverified. The compatible
Worker must be deployed and verified before the new search page is published.

## Search upgrade, 2026-10-13 (not deployed)

The local page adds paired inclusive source-date filters and per-source Load more.
Federal Register and GovInfo have 50-page/500-listing limits; Regulations.gov has
20-page/200-listing limits at ten results per request. Congress.gov and Washington
retain reference lookup. The original Federal Register-only default remains.

Every new search request carries its complete criteria and continuation context.
The page validates the Worker's echo, so an older Worker cannot silently ignore
dates or paging. Deploy the compatible Worker before publishing this page, with
the owner's separate approval of each external action.

Results show their submitted criteria and separate loaded-listing counts from
source totals. Appends preserve row identity, precedence and order; citations,
receipts, selected passages, notes and data actor entries retain their saved
snapshots. A failed page retains the loaded results and its cursor for explicit
retry. Replacement submissions cancel and supersede pending work. Errors and
unsupported criteria have distinct outcomes.

GovInfo dated queries accept ASCII alphanumeric words separated by spaces,
without Boolean operators or punctuation. The documented grouping/range grammar
supports this narrow composition; it has not yet been checked through a keyed
local route. Its publication-date filter and displayed source-issued date have
different meanings. Missing, malformed or cyclic cursors stop with unknown
continuation. Undated provider syntax remains available.

Washington and Oregon offer manual official-site search links; Idaho offers an
official session gateway whose search UI remains unverified. The links forward
no typed terms. These are external handoffs and activate no adapter.

Focused frontend (55), merge/report (93) and transport/contract (211) tests pass.
Local Chrome passed 48 checks, including keyboard paging, failed-page retry,
replacement searches, retained saved snapshots, PDF and print evidence. Eight
settled accessibility scans reported no violations; there were no page errors
or external requests. The independent boundary review is closed. A private
production build passed the 17-file demo artifact scan; all 17 existing public
runtime files remain unchanged. The final `npm run check` passed with 2,542 unit
tests in 120 files, 48 hook tests, all retained validation stages and the synthetic
build/artifact checks. These checks do not establish deployed or outside-user
acceptance.

Two bounded Federal Register searches through the local Worker checked pages one
and two with an inclusive 2025 range. Both returned ten results, all 20 identifiers
were distinct and every date was in range. There was no retry or third-page call.
No local keyed binding is available, so GovInfo and Regulations.gov live date and
continuation checks remain pending. D-099 authorizes a scoped source commit and
normal review-branch push, followed by the next local audit/fix/review session.
Worker deployment, pull request, merge and Pages publication remain separately
gated; no runtime publication has occurred for this feature.

The full-suite follow-up also repaired a workspace review timestamp race: review
creation and its revision now use the same timestamp. A clock-advancing regression
and all 15 workspace tests pass. All 43 history tests pass with a 15-second
allowance for the existing 128-revision case; its assertions and the global
timeout are unchanged.

## Maintenance update 0.6.1, 2026-10-13

D-098 authorizes this patch version, scoped commits, push and publication through
the normal pull-request path. The demo and its exported document take the version
from the package manifest; there is no Worker or source activation change.

The audit repaired oversized local-response cancellation, reduced repeated
output scans, removed obsolete uninstalled hook code and corrected stale startup
guidance. PDF and AST test reliability improved without weakening assertions.
The full check passed with 2,419 unit tests in 119 files and 48 hook tests, plus
the synthetic build and boundary checks. Local keyboard and citation/report
checks had no automated WCAG A/AA violation in settled views. These checks do not
replace outside-user acceptance.

The 0.6.1 build passed its generated-asset scan, typecheck, lint, formatting,
source-boundary scan and documentation validators. Generated JavaScript differs
only in the version and import hashes. Browser inspection confirmed the new
version, keyboard dialog controls, no page errors and zero automated WCAG A/AA
violations with a synthetic catalog and no external requests.

One bounded live browser run on 0.6.0 passed 16 checks, including successful
catalog loading, dialog accessibility and ten Federal Register search results.
The runner then encountered `Network.getResponseBody: No data found for resource`
while reading a response body and stopped. No retry was made. The full live
acceptance, including document export and the embedded view, remains incomplete.
The observed failure was in browser automation; it does not establish a provider
or application defect.

At this maintenance checkpoint, search refinement was the owner's next focus.
The local search upgrade above now gives source failures distinct outcomes; the
published maintenance page still has the earlier behavior.
Historical statements below that publication was pending are superseded by the
deployment facts above; all other limits retain their stated scope.

## Follow-ups under D-095, 2026-10-10

- Version 0.6.0, shown on the page and in the document.
- The Policy Sentinel reference names ATNI Climate as author and the Affiliated
  Tribes of Northwest Indians as publisher. The README attribution paragraph
  says the same.
- The ATNI seal (`atni-seal-on-dark.png` from the ATNI design system, copied
  unchanged) is in the page header and at the top right of the document cover.
  On phones the title sets in two lines beside it so the header keeps its
  height. The design system's own notes name a different seal file for light
  grounds; the one file the owner supplied is used everywhere and darkened on
  light grounds.
- The Worker allows 60 requests per minute per address, up from 30, with an
  in-memory fallback of 80, up from 40.
- Body typeface: an exploration of the ATNI design system found that its
  2026-10-04 web ruling names Roboto or Poppins and ranks neither, so Roboto
  stays. `@pdf-lib/fontkit` stays.

335 demo tests, typecheck, lint, the source scan and the real demo build pass
with these changes. The header was checked in a browser at four widths in both
themes with no automated accessibility violation on first load.

Worker version `969d1a24-f4de-4706-9fa9-24feae5f2503`, built from source commit
`79d263b`, serves 100% of traffic from 2026-10-11 at 01:22:50 UTC. The owner's
instruction to raise the rate is the authority for this deployment. The
deployment reports the binding at 60 requests per 60 seconds. One source
catalog read afterward showed the same five live sources; no search was made.

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

Worker deployment and live check of the match keys. Worker version
`dd22a664-101a-49a3-984b-cad69de53f49`, built from source commit `c5907f1`,
serves 100% of traffic from 2026-10-11 at 00:10:07 UTC with owner approval. No
source, credential or Worker setting changed. Four requests followed, at 00:10
UTC: the source catalog (the three keyed sources live, the state source named
Washington State Legislature) and one phrase search of each of the Federal
Register, GovInfo and Regulations.gov for a recent joint health-coverage rule.
All three returned Federal Register document 2026-20447 with the same match
key, so the rule the merge depends on holds for real responses from all three
sources.

That check also showed what invented responses had not: Regulations.gov lists a
joint rule once per agency docket, three listings of one document in this case,
and the first merge rule would have left two of them as extra rows. The page
now merges every listing that shares the document number, from the same source
or another, and names same-source listings by their identifiers. This is a
page-side change with its own tests (330 demo tests pass); the Worker did not
change again. The page-level merge on live responses is still to be seen on the
published page.

Known limits and items not done:

- The page is not yet published, and the live acceptance run has not happened.
  Until the page is published, the public site is the earlier interface running
  against the new Worker, which it tolerates.
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
