# Status

As of 2026-10-23 (Pacific). **Release 0.10.1 is published** (D-116). The page
was published through PR 19, merged as `2597846` at 2026-10-24 03:44:07 UTC.
The demo Worker is version `93192de1-9556-4f81-907e-35ace346728d`, deployed
from `51df81b`; the rollback target is `2465b6f7-6791-4505-aa3c-87f7f9779a74`
(0.10.0). Development continues under D-114.

## What a person can do on the live page

- Follow a docket, RIN or document; the list stays in this browser, exports and
  imports as a file, and "Check for new" (on request, at most 10 lookups) shows
  "New since <date>" in the reader's calendar day, or says a lookup was
  unavailable. "Last checked" always advances; when the source holds more
  listings than were loaded, the page points to the official source.
- Export comment closing dates as a calendar file (.ics), and a cited document
  dated by the reader's calendar day.
- Search Grants.gov forecasted and posted funding opportunities, with an
  optional filter on its exact Tribal government and Tribal organization
  labels (HHS attribution shown). A forecast's estimated date is never shown as
  "Applications close".
- Open "Unified Agenda entries for RIN <RIN>" from any row with a RIN.
- When an official source asks the demo to wait, the page says so instead of
  blaming the visitor; all visitors share one allowance for the api.data.gov
  key (15 calls a minute).

## Audit of 2026-10-23 (Jev-assisted)

Four read-only lanes found 20 findings plus 5 smaller ones. Jev scored each
claim and, after the fixes, answered "fixed? yes/no" (13 yes, 4 unsettled, 0
no; every fix has a regression test). Findings 1-12, 15 and 17-20 are fixed;
13, 14 and 16 (copies of canonical JSON, SHA-256 and JSON guards) were
de-duplicated into `src/core/canonical-json.mjs`, `src/engine/pure-sha256.mjs`
and `src/contracts/json-guards.ts`. Engine fixes: a Nation's authorized names
and "<State> County" never count as state evidence; contact sections end only
at named Federal Register captions; Federal Register data-as-of is retrieval
time; the publish validator checks asset source tags. Scores and inputs:
`C:/dev/_scratch/policy-sentinel/ponytail-audit-20261023/`.

## Verification (2026-10-23 Pacific, 2026-10-24 UTC)

- `npm run check` exit 0 at 20:42 Pacific: 2,887 tests passed, 16 skipped (the
  Regulations.gov v2 flag); sealed corpus replay unchanged.
- Sovereignty review of the Nation-evidence and contact fixes: its two findings
  (an upper-case sub-label releasing an official's address; aliases and case)
  are fixed with regression tests before the check.
- Readback: all 17 runtime files byte-match `2597846`. Live verifier: 83 of 83.
  One keyed GovInfo search through the new Worker: 200.

## Not done, and carried limits

- Regulations.gov v2 stays off: its API terms page renders empty. Comment end
  dates are UTC timestamps for 11:59:59 PM Eastern, held back.
- Kept on purpose by the refactor: copies whose inputs are not plain JSON or
  whose errors differ (listed in the lane reports); `scripts/source-pack.ts`
  stays pinned. `policy-search.mjs` source hashes in measurement records will
  differ on the next measurement run.
- Recovery now clears a torn (empty) lock; a recovery run at the instant a live
  writer creates its lock could clear it. Recovery is explicit, by hand.
- Left out of the audit report: a repeated Washington fetch, a Worker in-memory
  counter, a quadratic curation lookup, Windows case collisions (fail closed),
  unused `export` keywords. The Cache API on `workers.dev` is unconfirmed.
- Unified Agenda data beyond the link needs an approved output boundary.
  USAspending terms unread; Oregon OData needs the owner to accept its
  Acceptable Use Agreement; Idaho has no API (contact needed).
- Carried: Oregon and Idaho integration gaps; D-106 items 7-8; NCAI reuse
  permission; untagged PDFs; Windows WebKit failures; no Safari, Firefox,
  screen-reader, print or outside-user acceptance. The verifier needs
  `PLAYWRIGHT_CORE` and `--executable`.
- The governance edits (`AGENTS.md` with the D-114 wording, `CLAUDE.md`,
  `.claude/settings.json` and the Codex hook and its test, both allowing
  `gh pr create`) are committed as `d88a070` on `demo/live-pages`, not yet on
  `main`. The untracked owner documents under `docs/` stay uncommitted.

## Next bounded work

Owner use of 0.10.1 on the live page. Then the Regulations.gov decision below,
or the taxonomy review.

## Open owner decisions

1. Merge `demo/live-pages` (the governance commit and the 0.10.1 record) into
   `main`?
2. Regulations.gov: switch on docket lookup and type filter on the User Notice
   reading? Show comment end dates as the Eastern calendar day?
3. Taxonomy proposal: which rows to approve; Tribal topics as a facet; model
   judgment reference metadata for climate adaptation (D-114).
4. Unified Agenda index as a new public output (Government levels affected)?
5. Oregon OData Acceptable Use Agreement; Idaho contact.
6. Keep or cancel the weekly Parallel monitors.
7. Carried from earlier: first real release definition; following in that
   release; engine use of the api.data.gov key and eCFR/Oregon terms; Nation
   picker; deferrals; archiving ROADMAP; standing publication permission and
   license; Tribal documents in federal results; NCAI reply.
