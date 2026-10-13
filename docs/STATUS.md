# Status

As of 2026-10-13. Policy Sentinel **0.6.1** is the maintenance update from the
completed local audit. The owner authorized its commit, push and GitHub Pages
publication under D-098. This page is overwritten each session; earlier state
and deployment checkpoints remain in Git history and [DEMO-STATUS.md](DEMO-STATUS.md).

## Goal

Policy Sentinel helps Tribal policy, natural resources and legal staff, and ATNI
Climate staff, find official policy, keep exact passages and notes, and export
cited documents. Results retain official-source provenance. The tool supplies no
legal conclusions or inferred Nation relationships. The full product direction
and safeguards are in [AGENTS.md](../AGENTS.md).

## Current functionality and release

- The [public demo](https://atniclimate.github.io/policy-sentinel/) searches
  Federal Register, GovInfo and Regulations.gov by words or phrases. Congress.gov
  and Washington support bill-reference lookups. Oregon and Idaho remain explicit
  coverage gaps. The interface currently retrieves only the first page per source.
- Federal Register and Washington supply readable text for deterministic passage
  checks. The other three federal sources supply metadata and official links.
  Exact shared Federal Register document numbers can merge listings; no inferred
  identity or Nation relationship is used.
- Users keep citations, selected passages and their own notes within the browser
  tab, then export a cited PDF or print view with provenance. Notes and data actor
  entries are not uploaded. The public application works without AI.
- The separate local workbench supports saved studies and richer cited outputs.
  Ordinary builds use synthetic records. Demo source access does not activate
  engine adapters or authorize private data in a public build.
- The 0.6.0 page, including the seal and ATNI Climate citation, was published by
  pull request 8 at `4d320bc`; Pages finished that build on 2026-10-11 at
  02:12:57 UTC. The public header was read back as 0.6.0 on 2026-10-13.
  Version 0.6.1 rebuilds the same demo interface and document with the patch number.
- The Worker remains the previously deployed version
  `969d1a24-f4de-4706-9fa9-24feae5f2503`. This update changes no Worker code,
  credentials, source activation or request allowance.

## Audit outcome

- Oversized local responses now fail promptly even if stream cancellation rejects
  or never settles. Both regression cases failed before the repair and now pass.
- Citation membership, evidence grouping and graph-edge deduplication use Set/Map
  indexes, preserving output order, exact identifiers and provenance. No measured
  wall-clock speedup is claimed.
- PDF wrapping tests share font setup and retain every comparison against the
  whole-line oracle. Three whole-repository AST tests have individual 15-second
  limits; assertions and the global timeout are unchanged.
- Startup context and README now direct current work to the user task, AGENTS,
  STATUS and PLAN. Obsolete uninstalled hook handlers were removed. The retained
  roadmap and its validators remain unchanged.
- One clean obsolete worktree was reconciled and retired; its branch and unique
  history remain. Only the active checkout remains registered.
- Engineering, feature and source/output reviews found no further actionable
  defects in the audited changes after repairs. Subsequent search planning found
  a separate source-error presentation defect, listed below for the next session.

Verification: the repaired tree passed `npm run check`, including 48 hook tests,
119 unit-test files with 2,419 passing tests, retained-record validators,
source-boundary checks, the synthetic build and artifact validation. Native
file-symlink fixtures were unavailable on the Windows host; junction and hard-link
tests ran. Local browser checks exercised keyboard search, details, citations and
report flow plus the local-corpus unavailable fallback, with zero automated WCAG
A/AA violations after transitions settled.

The 0.6.1 demo build, typecheck, lint, formatting, source-boundary scan and
documentation validators also passed. Its generated script changes were verified
as version/import-hash changes only. The built page showed 0.6.1 in a browser,
with working keyboard dialog controls, no page errors and zero automated WCAG
A/AA violations using a synthetic catalog and no external requests.

The bounded live browser run on 0.6.0 passed 16 checks, including the catalog,
dialog accessibility and a ten-result Federal Register search. It then stopped
on a browser protocol error while retrieving a response body. It was not retried;
the full live acceptance flow remains incomplete. This maintenance update is not
acceptance of the proposed first real release.

## Next step

The owner selected search improvements for the next implementation session:
ordinary keywords, source-aware year/date refinement, per-source continuation,
clear failure and coverage states, and an uninterrupted path to cited outputs.
Luna research and two Sol reviewers prepare that work without adding dependencies
or activating sources in this release. The durable product order and acceptance
checks remain in [PLAN.md](PLAN.md).

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
   and the first outside user? D-098 authorizes this maintenance publication.
8. Tribal government documents printed by a federal source are not detected today.
   Filter, flag or leave them? Open since D-094.

## Known gaps

- Search currently groups some upstream failures under "Nothing returned". The
  next search change must separate no matches, unavailable and not searched,
  preserve healthy results and validate continuation and date semantics.
- Safari, Firefox, a real screen reader, physical printing, and PDF viewers still
  need checks by a person. The PDF is untagged; unsupported characters stop export
  with a message and Print view as fallback. Long reports may take seconds.
- Engine API integrations beyond the demo retain separate qualification and
  credential gates. The previously assessed GovInfo and Washington acquisition
  profiles expired on 2026-10-05; no new engine acquisition was attempted here.
- The historical StudyWorkspace intermittent failure did not reproduce in focused
  or integrated audit runs; no speculative repair was made.
- Three engine source adapters retain their tested `0.2` user-agent strings.
  They are separate from the displayed application version.
- The existing phone-header layout, supplied seal variant and body typeface
  choices remain as recorded in [DEMO-STATUS.md](DEMO-STATUS.md).
