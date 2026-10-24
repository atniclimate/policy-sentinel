# Status

As of 2026-10-23 (Pacific). **Release 0.10.0 is published** (D-115). The page
was published through PR 18, merged as `68a826c` at 2026-10-24 02:24:45 UTC;
Pages built it at 02:25:07 UTC. The demo Worker is version
`2465b6f7-6791-4505-aa3c-87f7f9779a74`, deployed from `adad603`; the rollback
target is `f6e2b85a-70b2-418b-a539-9dfa6650fc7a`. Development continues under
D-114.

## What a person can do on the live page

- Follow a docket, RIN or document; the list stays in this browser, exports and
  imports as a file, and "Check for new" (on request, at most 10 lookups) shows
  "New since <date>" in the reader's calendar day or says a lookup was
  unavailable. When the source holds more listings than were loaded, the next
  check counts from the same day.
- Export comment closing dates as a calendar file (.ics).
- Search Grants.gov for forecasted and posted funding opportunities, with an
  optional filter for opportunities listed for Tribal governments or Tribal
  organizations (exact Grants.gov labels, HHS attribution shown). A forecast's
  estimated date is never shown as "Applications close". Results count
  policies and funding opportunities apart.
- Open "Unified Agenda entries for RIN <RIN>" from any row with a RIN.
- Read short Federal Register rules whose GovInfo text has line-start NULs
  (digest `fr-header-line-nul-v1`); Federal Register searches with no match no
  longer fail.
- Passage rules `demo-rules-1.1.0` (deadline false hits 28% to 12%; measured
  offline with Jev, `docs/development/2026-10-23-jev-rule-audit.md`; Jev never
  runs in the page).

## Verification (2026-10-23 Pacific, 2026-10-24 UTC)

- `npm run check` exit 0 at 19:18 Pacific: 2,874 unit tests passed, 16 skipped
  (the Regulations.gov v2 flag), all stages. Hook tests re-run after the deny
  list change: 88 of 88. Log:
  `C:/dev/_scratch/policy-sentinel/release-0.10.0-20261023/check.log`.
- One risk-boundary review (sovereignty reviewer): pass; its three findings
  (forecast close date, filter line without Grants.gov, last-checked with more
  listings) were fixed before the check.
- Readback: all 17 runtime files byte-match `68a826c`
  (`published-receipt-0.10.0.json`). Live verifier (Chromium 1243): 83 of 83
  after scoping its source checkbox locator to the sources group. One live
  Grants.gov call through the deployed Worker: 200, 9 Tribal-filtered rows.
- Incident: between the Worker deploy and the Pages build (about 5 minutes),
  the 0.9.0 page rejected the Worker's 8-source list (unknown source, limit 7).
  A future new source needs the page published with the Worker, or a page that
  ignores unknown sources first.

## Not done, and carried limits

- Regulations.gov v2 stays off: its API terms page renders empty even through
  Parallel Extract. Comment end dates are UTC timestamps for 11:59:59 PM
  Eastern, held back until the owner rules.
- Nit: Grants.gov placeholder close dates show as stated.
- Noted from review: the standing weekly Parallel monitors from
  `scripts/dev-ai/parallel-scout.mjs` are a lasting third-party subscription;
  imported follow files may carry an unused `listedEligibility` field.
- Unified Agenda data beyond the link needs an approved output boundary.
- USAspending terms unread; Oregon OData needs the owner to accept its
  Acceptable Use Agreement; Idaho has no API (contact needed).
- Carried: Oregon and Idaho integration gaps; D-106 items 7-8; NCAI reuse
  permission; untagged PDFs; Windows WebKit failures; no Safari, Firefox,
  screen-reader, print or outside-user acceptance. The verifier needs
  `PLAYWRIGHT_CORE` and `--executable`; no project copy of playwright-core.
- Uncommitted owner work: `.claude/settings.json` (now also without
  `gh pr create`), `AGENTS.md` (including the D-114 wording), `CLAUDE.md`,
  `scripts/codex-hooks.mjs` and its test (now allowing `gh pr create`), and the
  untracked owner documents under `docs/`.

## Next bounded work

Owner use of 0.10.0 on the live page. Then the Regulations.gov decision below,
or the taxonomy review.

## Open owner decisions

1. Commit the governance edits (`AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`,
   the Codex hook and its test)?
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
