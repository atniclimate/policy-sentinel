# Status

As of 2026-10-13. The **search upgrade and audit repairs are not deployed**.
The D-099 audit/fix/review loop has closed six demonstrated defects;
the final full check passed. Product direction and safeguards remain in
[AGENTS.md](../AGENTS.md); milestone order is in [PLAN.md](PLAN.md).

## Current state

- Recorded public 0.6.1 maintenance publication: pull request 9, merge
  `e47ebba`, on 2026-10-13. The previously recorded Worker is
  `969d1a24-f4de-4706-9fa9-24feae5f2503`. The audit made no remote request,
  deployment or publication; all 17 public runtime files remain unchanged.
- The public demo searches Federal Register, GovInfo and Regulations.gov by
  topic on the first page. Congress.gov and Washington retain exact-reference
  lookup; Oregon and Idaho remain integration gaps.
- The review branch contains the search upgrade at `a37c994`: paired inclusive
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

No provider calls were made in this audit. The preceding search session's two
Federal Register calls checked dated pages one and two. GovInfo and
Regulations.gov live date/continuation checks remain pending because no local
api.data.gov binding is available. Historical Congress route acceptance was not
probed. Local tests do not establish those live results or release acceptance.

D-100 authorizes the reviewed repair commit and its push to `demo/live-pages`.
Pull request, merge, deployment and publication still need separate owner
authorization. Deploy and verify the compatible Worker before publishing the
new search page. Do not repeat the completed maintenance publication or restart
the search implementation.

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
