# Status

As of 2026-10-13. **This release publishes the search upgrade and six audit
repairs under D-101.** The compatible Worker is deployed and its bounded live
search checks passed. Product direction and safeguards remain in
[AGENTS.md](../AGENTS.md); milestone order is in [PLAN.md](PLAN.md).

## Current state

- The preceding 0.6.1 maintenance publication was pull request 9, merge
  `e47ebba`. This release's 17 runtime files match the reviewed production
  artifact exactly. Pages serves `main:/docs` through the normal pull-request path.
- Worker `583cd4ab-f99b-4ffc-9d7b-c9d73466df18` serves 100% of traffic from
  2026-10-13 at 21:01:53 UTC. Its source is `350329f`; existing secrets,
  configured sources and the 60-per-minute rate limit are unchanged.
- The demo searches Federal Register, GovInfo and Regulations.gov by topic,
  with inclusive source-date filters and explicit Load more. Congress.gov and Washington retain exact-reference
  lookup; Oregon and Idaho remain integration gaps.
- The release includes the search upgrade at `a37c994`: paired inclusive
  source-date filters, ten-listing pages, explicit Load more, retained search
  criteria and citations, and distinct unavailable/not-searched outcomes.
  Federal Register and GovInfo stop at 50 pages/500 listings each;
  Regulations.gov stops at 20 pages/200. GovInfo cursors stay opaque, and its
  dated query accepts only the documented narrow plain-word composition.
- Six reviewed audit repairs: reject junctions in artifact output paths
  before replacement; retain every permitted alternate citation on report
  reload; reset new study material to Restricted after an imported study is
  rebound; correct historical Congress ordinals; report known exhaustion before
  a numeric page cap; and enlarge wrapped alternate-link targets.
- The repairs add no source, dependency, credential use, search history,
  telemetry, private-data route, legal conclusion or inferred Nation
  relationship. The 38 pre-existing untracked owner documents remain untouched.

## Verification and next step

Each defect has a failing regression or browser receipt and a passing repair.
Focused suites passed: 57 artifact tests, 158 report/export tests, 146 Worker
tests and 15 study tests. Independent reviewers checked the actual fixes and
callers; no substantiated locally fixable finding remains from this audit.

Chrome passed 19 synthetic browser checks, including restored provenance,
keyboard navigation through alternate links, study rebinding, saved Restricted
material and public-export filtering. Five settled accessibility scans passed
across the report's desktop/narrow light/dark views and the study workspace.
Screenshots were inspected. There were no page errors or external requests.
The private production demo build passed its 17-file artifact scan; before/after
SHA-256 checks confirmed all 17 existing public runtime files unchanged.
The final `npm run check` passed: 2,556 unit tests in 120 files, 48 hook tests,
the retained validation stages, source-boundary scan and synthetic build/artifact
checks. Native file-symlink fixtures were unavailable on this Windows host;
junction and hard-link checks ran. These results do not establish live acceptance.

The D-101 deployment check made seven search calls: dated pages one and two
for Federal Register, GovInfo and Regulations.gov, plus `hr 1 101` for Congress.
All passed criteria, identity, continuation and response-header checks. Each
paged source returned 20 distinct identifiers. Federal Register publication
dates and Regulations.gov posted dates were in range. GovInfo's publication
filter and displayed issue date retain their different meanings. Congress
returned the corrected `101st` citation and URL; one direct official-page
request returned 403, so direct route acceptance remains unverified. No retry
was made. These finite checks do not establish ongoing service availability.

D-100 committed and pushed the reviewed repairs as `350329f`. D-101 authorizes
the compatible Worker deployment and this Pages publication, including its
commit, push and normal pull-request/merge path. The next product work remains
the milestone order in PLAN; do not repeat the completed implementation or audit.

## Open owner decisions

1. First real release: public tool with one outside user, or the offline package
   with four demonstrations? Version 0.6.1 remains a development maintenance release.
2. Following: part of that release, and may the service keep a refreshed index of
   official public metadata with no user data?
3. May the existing api.data.gov key be used for engine work? Accept eCFR and
   Oregon terms and approve contact with Idaho?
4. Nation picker in the release, or typed terms only?
5. Defer the nationwide survey, area resolver, sibling-app interchange and 50 GB
   corpus past the release? Earlier rulings are not silently revoked.
6. Archive ROADMAP and its validators? Until answered they stay unchanged.
7. Standing permission for future public-page pull requests, a repository license,
   and the first outside user? The D-098 maintenance publication is complete.
8. Tribal government documents printed by a federal source are not detected today.
   Filter, flag or leave them? Open since D-094.

## Known gaps

- Outside-user acceptance, Safari,
  Firefox, a real screen reader, physical printing and PDF-viewer checks remain.
  The PDF is untagged; unsupported characters stop export with Print view offered
  as the existing fallback.
- Engine APIs retain separate qualification and credential gates. The GovInfo and
  Washington acquisition profiles expired on 2026-10-05; this work does not renew
  them or resume completed acquisition.
- Public and local results establish no legal meaning or inferred Nation
  relationship. Source-specific freshness and coverage limits remain.
