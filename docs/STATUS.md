# Status

As of 2026-10-19. **Release 0.7.0 (NCAI 2026 draft resolutions) is reviewed,
checked and built on `demo/live-pages`, ready for the owner's push and merge.**
Under D-104 and D-105 the demo gains a password-gated NCAI menu, described in
[DEMO-STATUS.md](DEMO-STATUS.md). The drafts ship only as an encrypted file;
the password and plaintext are not in the repository. The pre-publication
review (sovereignty, security, interface, records, gate verifier; each finding
adversarially checked) found no must-fix item. Its five should-fix items are
repaired: truthful search-origin and "nothing is sent" wording, a record that a
pushed vault stays in public history, the menu closing when focus or a click
leaves it, focus on re-picking a draft, and D-105 at 60 words. The full
`npm run check` passed on 2026-10-19 (2,583 unit tests in 123 files, 48 hook
tests; the two known file-symlink skips). The rebuilt Pages artifact holds no
draft title, note, topic or private path. Not done: unlocked-menu browser check
of the repairs (needs the password; covered by a frontend test), and the
sponsor-derived words "Arizona" (PSC-26-025) and "Sioux" (PSC-26-047) remain in
two searches until the owner reseals. The public page and Worker are unchanged
from the D-103 state below until the owner pushes and merges.

From 2026-10-13: **The published search and report workflows passed the bounded
live browser batch.** D-102 browser review has a qualified closeout with the
WebKit limits below. The fresh D-103 full repository check passed after all
verifier repairs. D-103 authorizes committing and publishing the reviewed
changes through the existing pull-request and Pages path.
The owner supplied two staff workflows, now assessed in
[PLAN.md](PLAN.md). Product safeguards remain in [AGENTS.md](../AGENTS.md).

## Current state

- The public demo runtime is unchanged from PR 10, merge `981ecad`, published 2026-10-13 at
  21:06:47 UTC. The release readback matched all 17 reviewed runtime files.
  Worker `583cd4ab-f99b-4ffc-9d7b-c9d73466df18`, source `350329f`, remains deployed.
- Federal Register, GovInfo and Regulations.gov support topic search, inclusive
  source-date filters and explicit Load more. Congress.gov and Washington remain
  reference lookups. Oregon and Idaho are integration gaps.
- D-102 changes are prepared for publication under D-103. The retained App's facet checkboxes
  now meet the tested 24-pixel target size. The demo browser runner derives the
  separate policy/source counts from its response and bounds network requests,
  redirects and failures. The local runner's description now states its actual
  scope. No demo runtime or Worker code changed; the Worker needs no deployment.
- The follow-up ponytail review closed three verifier defects: unhandled response
  timeouts, rejected normalized local API origins and overwriting earlier output.
  Catalog/search/policy waits now handle failures together with their trigger;
  output requires a new directory. Two maintained regression tests cover the
  controls and preservation of prior evidence. Independent re-review found no
  remaining Must/Should finding in this change.

## Verification

Chrome 155.0.8059.40 passed 32 live dated/reference checks and 83 live report
checks using Playwright 1.63.0. Each topic source appended ten distinct listings
to twenty, preserving existing DOM rows and keyboard focus. Dates, continuation,
Washington text identity/receipt and the historical Congress reference passed.
The direct Congress page returned 403 without retry; its acceptance is still
unverified. Report checks retained passages, notes and provenance through PDF
and browser print, with passing keyboard, narrow-layout and exercised axe checks.
All eight pages of the two live PDFs were visually inspected. They remain
untagged; a nearly empty final print page is a nonblocking pagination limitation.

The browser batch used at most 13 upstream policy requests. Three workflow
citation lookups bring the conservative session upper bound to 16 of 20, with
zero failed-provider retries, three catalog requests and 27 static requests.
Counts are not edge/provider measurements. These finite checks do not establish
ongoing availability or complete source coverage.

Synthetic browser verification uses separate built artifacts, loopback-only
serving and blocked external requests. Retained App Chrome and Windows WebKit
26.6 passed 18 workflow groups each, including filtering, exact source evidence,
selection, CSV/dossier output, degraded/unavailable states and accessibility.
The original checkbox target-size failure and passing repair are retained;
independent review found no remaining issue with that repair. Initial Tab link
traversal remains blocked in Windows WebKit; explicitly focused activation is
not a substitute for that check. WebKit is not actual Safari acceptance.

The extended synthetic demo exercised 18 supported workflow groups in each
engine, including hostile input, source failures, cursor/identity boundaries,
storage recovery and the advertised Print view fallback after PDF-module failure.
Windows WebKit's direct PDF retry after that failure still fails after reload;
a minimal reproduction using the generated Vite 8.2.0 helper isolates that
interaction. The passing fallback does not turn direct retry into a passing case.

The synthetic local workbench/study matrix passed 21 of 21 groups in Chrome and
20 of 21 in Windows WebKit, whose strict narrow document-width check failed.
Both engines exercised all seven study products and saved-study import, inspected
80 downloaded files, checked review/history and rebind behavior, and rejected
unsupported participant attribution. Public outputs omit Restricted material and
source text whose reuse contract prohibits redistribution. Keyboard and both axe
scans passed in each engine. No study product code or CSS was changed.

Independent review found no remaining substantiated in-scope Must/Should repair;
all planned current workflow cases were reached or explicitly inapplicable.
The retained failures below prevent an unconditional all-browser pass. Original
failed harness receipts remain evidence; corrected assertions do not erase them.
The fresh D-103 `npm run check` passed: 2,558 unit tests in 121 files, 48 hook tests,
the pipeline stages, source-boundary checks and validated synthetic build.
Two native file-symlink tests were skipped because this Windows host cannot
create those links; passing junction/hard-link checks do not replace them.
Checked files were unchanged during the run, which finished at
2026-10-14 00:04:28 UTC (2026-10-13 local time).
The verifier repairs also passed their two focused tests and independent review.
One earlier test child returned native Windows status
`0xC0000409`; the retained failed receipt is not counted as a pass. Independent
verification and a bounded rerun passed without weakening assertions; the native
cause remains unknown. The fresh full run includes these verifier repairs and
made no provider calls. Existing print pagination and WebKit blank-scroll
polish remain logged for the later interface pass.

## Staff tasks and next work

The consultation task is discovery of water, forestry and Roadless Rule policy
affecting Washington/Oregon research, followed by a cited inventory of invited
and participating Tribes, process and submitted evidence. The initial Section 106
reference remains unidentified. Discovery must distinguish exact instruments;
geography, invitations and missing search results do not establish participation.

The second task concerns FY27 Tribal Community Resilience funding and amounts,
executive actions and litigation, staffing effects, related climate programs,
25 U.S.C. § 117c, procurement waivers, imports, tariffs and litigation authorities.
These questions require dated official evidence across distinct funding and
legal processes. No current funding or legal answer was established in D-102.
[PLAN.md](PLAN.md) separates existing capabilities, missing implementation,
unverified behavior, source gates and the next small acceptance tasks.

The proposed next slice is a bounded official-source
inventory for the consultation task and one funding program. This is a proposal;
it adds no source, acquisition, credential or publication authority. Dedicated
interface polish and deeper accessibility work remain after broader functionality
under D-102. Existing keyboard/focus safeguards continue throughout.

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
   and the first outside user? D-103 authorizes this reviewed change's commit,
   push and Pages publication; standing permission remains open.
8. Tribal government documents printed by a federal source are not detected today.
   Filter, flag or leave them? Open since D-094.
9. NCAI's reply on republishing the tracker snapshot and on access to its
   AssetBank resolution files (requested 2026-10-19). D-105 is revisited when
   NCAI answers. Refresh the snapshot during the convention, and retire it
   after final actions?

## Remaining limits

- Outside-user acceptance, actual Safari/Firefox, a real screen reader, physical
  printing and external PDF-viewer checks remain. The untagged PDF and Print view
  fallback do not establish accessibility conformance.
- Windows WebKit retains direct-PDF retry and initial Tab traversal limits. The
  local study's strict document-width check also fails after desktop-to-narrow
  resize, leaving blank horizontal scroll space while controls remain visible
  and keyboard usable. No tested scoped CSS candidate fixed it; the failed
  geometry check remains explicit for the later interface pass.
- Offline installation, disconnected staff acceptance and a live followed-item
  refresh are unverified or missing. Session report restoration is not following.
- Engine APIs retain their qualification and credential gates. GovInfo and
  Washington acquisition profiles expired on 2026-10-05; D-102 does not renew
  them or resume completed acquisition.
- Public and local outputs establish no legal meaning, eligibility determination
  or inferred Nation relationship. Exact evidence, reuse and privacy boundaries
  continue to apply to records and their derivatives.
