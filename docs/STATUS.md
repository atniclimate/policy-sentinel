# Status

## Planning session of 2026-11-05 (D-118)

The owner set the Full 0.9 scope (D-118). A research swarm (nine source lanes
with Parallel search and alternates, adversarial verification, a code map, Jev
query typing, TERRA interop, a completeness critic) and four raw-byte follow-up
lanes produced
[`source-reviews/full09-source-survey-2026-11-05.md`](source-reviews/full09-source-survey-2026-11-05.md).
The design, reviewed by an Opus logic review, the sovereignty reviewer (FAIL on
draft 2, six blocking items, all addressed) and a Codex adversary (NO-GO on
draft 1, addressed), is
[`development/full09-design-2026-11-05.md`](development/full09-design-2026-11-05.md)
(draft 4). Key finding: the policy chain can be built from part-level CFR
authority and source wording and OLRC U.S. Code source credits.

The owner then answered every gate (D-119 to D-125): the release is **0.9.1**
under the TERRA phase scheme, with ATNI ratification making 1.0 (D-120);
safeguards stay on and ship as automated checks (D-121); Oregon OLIS agreement
accepted for ATNI ([note](source-reviews/oregon-olis-odata-aua-2026-11-05.md),
D-119); interim license PolyForm Noncommercial 1.0.0 for code and CC BY-NC-SA
4.0 for documentation (D-122); keys move to the program account before
pre-release ([keys and access](KEYS-AND-ACCESS.md), D-123); gate answers and
three committee-library pilots (D-124); static index files on the
[approved conditions](development/full09-index-conditions-2026-11-05.md), with
the GovInfo CFR annual edition as the chain source (D-125). The planning records
and license are merged into `main` (PR 21 and the session's closing pull
request); the live page is unchanged at 0.10.1.

Next bounded work: the Full 0.9 build run in a fresh session, from the launch
prompt and owner-answers file kept outside the repository in
`C:/dev/_scratch/policy-sentinel/full09-plan-20261105/`. The owner's browser
reading (eCFR, Office of the Federal Register and OLRC terms, Supreme Court
robots and terms, the SAM.gov CSV, Regulations.gov) can come during the run.
Open decisions 1, 4 (Oregon), 5 and the license below are now answered; Idaho
remains open.

## Release 0.10.1 state

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
  `gh pr create`) are committed as `d88a070` and merged into `main` through PR
  20 (`4b397fe`, 2026-10-24 05:38 UTC, D-117); Pages rebuilt and all 17 runtime
  files still byte-match 0.10.1. The untracked owner documents under `docs/`
  stay uncommitted.

## Next bounded work

Owner use of 0.10.1 on the live page. Then the Regulations.gov decision below,
or the taxonomy review.

## Open owner decisions

1. Regulations.gov: switch on docket lookup and type filter on the User Notice
   reading? Show comment end dates as the Eastern calendar day?
2. Taxonomy proposal: which rows to approve; Tribal topics as a facet; model
   judgment reference metadata for climate adaptation (D-114).
3. Unified Agenda index as a new public output (Government levels affected)?
4. Oregon OData Acceptable Use Agreement; Idaho contact.
5. Keep or cancel the weekly Parallel monitors.
6. Carried from earlier: first real release definition; following in that
   release; engine use of the api.data.gov key and eCFR/Oregon terms; Nation
   picker; deferrals; archiving ROADMAP; standing publication permission and
   license; Tribal documents in federal results; NCAI reply.
