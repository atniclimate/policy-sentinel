# Status

As of 2026-10-13. The **search upgrade is tested locally and not deployed**, on the
0.6.1 maintenance baseline. Current product direction and safeguards remain in
[AGENTS.md](../AGENTS.md); milestone order is in [PLAN.md](PLAN.md).

## Current state

- The recorded public 0.6.1 maintenance publication is pull request 9, merge
  `e47ebba`, on 2026-10-13. The prior session verified all 17 public runtime
  files against the reviewed build. This session has not changed public assets
  or deployed the Worker.
- The published demo searches Federal Register, GovInfo and Regulations.gov by
  topic on the first page. Congress.gov and Washington remain exact-reference
  lookups. Oregon and Idaho remain integration gaps. The deployed Worker remains
  `969d1a24-f4de-4706-9fa9-24feae5f2503`.
- Locally, paired inclusive date controls translate to Federal Register publication
  dates, Regulations.gov posted dates and GovInfo publication-date ranges. GovInfo
  accepts a narrow plain-word dated query; ambiguous expressions are explicitly
  not searched. Congress cannot apply the date range; Washington retains its
  bill/biennium and introduced-version lookup.
- Each searchable source has explicit Load more, ten listings per request. Federal
  Register and GovInfo stop at 50 pages/500 listings each; Regulations.gov at
  20 pages/200. Counts distinguish loaded listings, merged rows and source totals.
  GovInfo cursors are opaque; unknown continuation is never called exhausted.
- Results retain submitted criteria while the form changes. Replacement searches
  cancel prior work. Failed pages retain rows and the unconsumed continuation for
  explicit retry. Unavailable and not searched remain distinct from no matches.
- Exact identifiers alone merge listings. Appends preserve row order and identity;
  a later Federal Register primary does not replace a saved citation, receipt,
  passage selection or note, or permit a duplicate citation.
- State links open official external portals/gateways without forwarding terms.
  No new source, dependency, persistent search history, engine credential grant,
  private-data path or provider host was added. PDF/print evidence models remain
  unchanged.

## Verification and next step

The focused frontend suite passed 55 tests; the merge/report suites passed 93;
the transport/Worker/contract suites passed 211. Local Chrome passed 48 browser
checks, including keyboard paging, retained citations, PDF and print evidence;
eight settled accessibility scans reported no violations. The browser run had
no page errors or external requests. The independent boundary review is closed.
A private production demo build passed the 17-file artifact scan, and all 17
existing public runtime files remain unchanged. The final `npm run check` passed:
2,542 unit tests in 120 files, 48 hook tests, the retained validation stages and
the synthetic build/artifact checks. These checks do not establish live acceptance.

An earlier full run exposed a workspace review timestamp race and a five-second
timeout in the existing 128-revision history test. Review creation now shares
one timestamp with its saved revision; a clock-advancing regression reproduces
the defect and passes with the fix. All 15 workspace and 43 history tests pass.
Only the long-history case has a 15-second allowance; its assertions and the
global timeout are unchanged.

Two Federal Register requests through the local Worker checked pages one and
two with an inclusive 2025 date range: both returned ten results, with 20 unique
identifiers and every date in range. No retry or third page was requested.
No local api.data.gov binding is available, so GovInfo and Regulations.gov date
and continuation checks against their real services remain pending. No deployment
or key extraction is authorized to close those gaps.

Continue with the owner's repository audit/fix/review loop under D-099, starting
with the search change and its connected behavior. D-099 also authorizes the
scoped source commit and normal push to the review branch. Worker deployment,
pull request, merge and public-page publication remain separately gated.
The new page requires the new Worker search contract; deploy and
verify that compatible Worker before publishing the page.
The previous maintenance publication authority is complete and does not cover
this feature's external actions.

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

- Keyed live verification, public deployment, outside-user acceptance, Safari,
  Firefox, a real screen reader, physical printing and PDF-viewer checks remain.
  The PDF is untagged; unsupported characters stop export with Print view offered
  as the existing fallback.
- Engine APIs retain separate qualification and credential gates. The GovInfo and
  Washington acquisition profiles expired on 2026-10-05; this work does not renew
  them or resume completed acquisition.
- Public and local results establish no legal meaning or inferred Nation
  relationship. Source-specific freshness and coverage limits remain.
