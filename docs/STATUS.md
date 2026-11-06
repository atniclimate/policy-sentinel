# Status

As of 2026-11-06 (Pacific). The live page is the **0.9.1 demo update** (the
Full 0.9 build, D-118 to D-133), merged into `main` through PR 23 (merge
commit 21b647f) and served by GitHub Pages. The demo Worker runs version
3c228775-c1ab-4905-9ea4-d0c766b5a16b, built from a124968; the rollback version
is 93192de1-9556-4f81-907e-35ace346728d. This is a demo update, not the D-123
pre-release.

## Next session goal

Build Wave 3 (Tier 2 rows 12 to 18 of the
[Full 0.9 design](development/full09-design-2026-11-05.md); row 18, the Supreme
Court RSS, is dropped under D-137) on `demo/live-pages`, then boundary C. Also
run the queued work from the owner's answers of 2026-11-06 (D-134 to D-157):

- the terms reads for Regulations.gov, SAM.gov, the GovInfo policies and the
  eCFR metadata paths, each into its source note (D-135, D-138, D-140, D-141);
- the Nation-name hash file build from the recognition notice, 575 names, plain
  list in scratch only (D-144);
- the alias fetch from OLRC under its stated budget, then the screens and the
  full review table (D-134, D-142, D-143);
- one line in the Federal Register source note stating the keyless API reading
  as the standing rule (D-136).

Done means:

- each Tier 2 row is live-checked once within a stated call budget, or recorded
  as blocked at its gate with the reason;
- `npm run check` passes once on the final tree;
- the sovereignty review of the Wave 3 diff has no open blocking finding;
- `scripts/verify-demo-browser.mjs` passes on a `demo:build` served locally;
- the owner's walk steps for the T1.7 staff tasks are written.

Nothing is merged, deployed or published without a fresh owner command. The
launch prompt is in the private handoff folder (Records, below).

## Open owner decisions

The owner's answers of 2026-11-06 are recorded as D-134 to D-157. The terms
reads they queue (Regulations.gov, SAM.gov, the GovInfo policies, the eCFR
metadata paths) are session work, listed under "Next session goal", not owner
items. Still open for the owner:

1. Idaho (D-157): the source search found no strictly non-profit API. Open
   States (Plural Policy, Inc., for-profit) is free, with no attribution
   required, an unconfirmed rate limit and discretionary blocking; the Idaho
   Legislature has no API. Decide whether to register with Open States anyway.
   Note: `C:\dev\_scratch\policy-sentinel\full09-build-2026-11-05\carried-review\IDAHO-SOURCE.md`.
2. Parallel monitors (D-149): delete the seven weekly monitors in Parallel's
   console, or say yes to one bounded delete command.
3. NCAI reply (D-150): the reply, or none by 1.0, decides whether the
   intertribal snapshot stays.
4. Flagged review rows: the alias and plain-phrase rows that carry a flag or
   fall in a judgment class (D-142, D-143) come in the full review table when
   it arrives; they stay out unless named in.
5. PLAN "Later" deferrals: reviewed in the pull request for the PLAN rewrite
   (the owner's note of 2026-11-06; no decision row covers it).
6. SAM.gov download (D-140): if the terms read finds a keyless public CSV with
   an Authorizations column, the owner is asked first, with the file name and
   size, before any download.
7. Acceptance for 1.0 (D-147): the owner's T1.7 walk, the outside-user test,
   the ATNI 1.0 license and ATNI ratification. G-BIA-IDENTITY (the 575
   collection validates exactly) is on the 1.0 critical path with the Nation
   picker (D-152).

Also still carried, not owner-blocking: the taxonomy proposal and Unified Agenda
output (Tier 3 after the reginfo terms are read).

## Published in this update (0.9.1)

- Tier 1 of the Full 0.9 design on its
  [index conditions](development/full09-index-conditions-2026-11-05.md):
  search contract version 3 (versions 1 and 2 unchanged for ATNI-ResIST); one
  search box that reads citations, bills, dockets and law names and abstains
  when a query could mean more than one thing; the Cited and Linked Records
  panel; Grants.gov authority wording; GovInfo court opinions and U.S. Reports;
  modes, the Briefing export and freshness notices.
- Wave 2b (D-126 to D-132): note citations, acronyms and enacted-title marks
  on law aliases (table still empty); hashed Nation-name probes; Supreme Court
  case names verbatim; relation names from the owner-approved list (D-133);
  the source's own summary, collapsed and guarded; ranked suggestions with a
  bounded typo pass; the plain-phrase table, empty.
- Two audit rounds (36 and 20 confirmed findings). Among them: every Worker
  cache entry is keyed to the deployed version; Nation names before a closing
  apostrophe and organization names joined by "of" are masked; person-naming
  court captions are withheld in every GovInfo lane; withheld, cut and
  not-kept rows are stated in the panel and in exports alike; one retrieval day
  is shown everywhere; the Congress.gov latest action passes the personal
  guard.
- The planning records were aligned for agent sessions: one session start, one
  owner-decision list (this one), current rule pointers in the agent files.

## Verification

- `npm run check` exit 0 at e2bfb4b: 184 test files, 3,823 tests passed, 16
  skipped; roadmap, backbone, knowledge, runtime, source-boundary and artifact
  validation passed. After it, one label fix and browser-verifier selector
  updates (5f246ae) passed their focused tests, typecheck, lint and the
  source-boundary scan.
- Pre-public sovereignty review over 566c0b2..HEAD: no Nation-linking, land,
  secret or telemetry finding; its privacy items are fixed.
- `scripts/verify-demo-browser.mjs` against the build served locally, calling
  the deployed Worker: 83 passed, 0 failed, including axe (no WCAG A/AA
  violations in the dialog and in both themes) and the keyboard focus checks.
- Live: Pages built 21b647f at 16:35 UTC; the verifier against
  https://atniclimate.github.io/policy-sentinel/ passed 83 of 83 (header 0.9.1),
  and all 18 runtime files matched the committed build on readback.
- Not yet run: the owner's own walk of the T1.7 staff tasks.

## Not done, and carried limits

- The law alias table and the plain-phrase table ship empty (the alias fetch,
  screens and hash file are queued above). No index shard is acquired. eCFR
  stays a link-out.
- Wave 3 (Tier 2: Oregon, Washington, committee libraries, local documents,
  interop, treaty link target) is not started.
- `worker/src/sources/govinfo.ts` does not use GovInfo's count to decide
  whether more results follow; the courts lane does.
- A saved entry reopened after a reload says its in-text citations were not
  kept; re-reading them automatically would cost one Worker call per open.

## Records

- Session handoff: `C:\dev\_handoff\policy-sentinel\HANDOFF.md` (read its top
  section) and the launch prompt beside it.
- Build ledger: `C:\dev\_scratch\policy-sentinel\full09-build-2026-11-05\LEDGER.md`
  (sections from "Ponytail audit 1" on cover this update).
- [Decision register](decision-register.md) through D-157;
  [demo status](DEMO-STATUS.md) for the live page's history.
