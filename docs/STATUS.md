# Status

As of 2026-11-18 (Pacific). The live page is the **0.9.6 demo update**, served
by GitHub Pages from `main`: the 0.9.1 build (the Full 0.9 build, D-118 to
D-133), the Example Issue (0.9.2), court case names (0.9.3), issue search
(0.9.4, PR 28, merge commit 9a18cf5), the source release record (0.9.5,
PR 29, merge commit f19a116) and the full issue table (0.9.6, PR 30, merge
commit 9b59688, D-175 and D-176). The demo Worker runs version
8726fa96-87b2-4623-9df4-4dc5b21509eb, built from 50a3813; the rollback version
is 6feff3b5-0e45-4692-8c33-90ec4bf0f7c3. These are demo updates, not the D-123
pre-release.

**Issue search (0.9.4, D-161 to D-171):** a reviewed table
(`config/issues.v1.json`, schema `schemas/issues.schema.v1.json`) of issues (a
subject, its names, the identifiers it rests on), bills that carry issues, and
bill sections listed with an issue, each citing an identifier the issue rests
on or listed on the owner's review. The search box offers an entry by name;
choosing it runs its searches in sections. After any search, issues sharing an
identifier stated in the results' own fields are offered (never from words;
rows found only by a name search are not counted). The table holds 11
entries (9 issues, 2 bills; D-167, D-176). The Search pane heading is "Policy
issues", because the "Issues" pane lists passages in a policy.

**575 (D-175):** the owner ruled that 575 is the number of federally
recognized Tribes. The 2026 notice prints 577 paragraphs because two Alaska
groupings are listed with their members. The committed
`config/nation-name-probes.sha256.v1.json` hashes every listed name (never a
name itself) with count 575, so the G3 check runs on every issue, alias and
phrase row. A later notice gets its own recognition-registry entry, and its
stated total replaces 575.

**Verified sources (0.9.5, D-172 to D-174):** all seven Worker sources read
"Enabled, verified at release 2026-11-18", from one bounded release check each
and, for GovInfo, its court opinions and Grants.gov, a re-probe after the
Worker deployment that fixed them.

## Next session goal

An engineering session (D-178), with autocomplete and suggestions as its major
aspect: the machinery is built, but the vocabulary files were never acquired
(the index manifest lists all 12 files unavailable), and the law alias and
plain-phrase tables are empty. Executive orders get their own reading ("EO",
"E.O.", "XO", D-177). The launch prompt, written for Fable 5.2 at xhigh with
Codex (`gpt-6.2-astra`, `ultra`) for heavy coding through the guarded route,
is `C:\dev\_handoff\policy-sentinel\NEXT-SESSION-PROMPT-autocomplete-engineering.md`.
The next published update is 0.9.7 (D-179). In order:

1. Autocomplete: the three vocabulary files through
   `scripts/acquire-demo-index.mjs`, the executive-order reading, the OLRC
   alias fetch and screens (D-134, D-142, D-143), plain phrases, ranking tests.
   With 575 settled (D-175), G3 no longer holds these back. The recognition
   collection's own row-by-row reconciliation (G-BIA-IDENTITY, the Nation
   picker) can follow the same ruling, but that is its own piece of work.
2. The open review notes on issue search: the bare name "Section 106" also
   matches other laws' section 106 when typed with them; "Executive Order
   13175" and "NAGPRA" may be stated officially, which would change D-169 and
   D-170 (ask the owner); `issuesInText` is built and tested but not on the
   page yet (the opened document's cited issues).
3. The bill-text Worker route (D-166): read federal bill text by section from
   GovInfo so issues inside any bill come up from its citations. Design first,
   then the owner's command to deploy.
4. Loose ends from the release checks: the Federal Register reports at most
   10,000 results and the page shows that as exact; a policy read's opening can
   start with ruler lines; a Washington bill's opening is its front matter; the
   two dates GovInfo gives one court case; the Congress.gov related-bills button
   and the Grants.gov eligibility filter and forecast detail were not probed;
   Regulations.gov identifier lookups stay off (D-139 closing dates and the
   terms read first); the grants note in `/api/sources` still says the
   opportunity text is not read (ATNI-ResIST pins that response); the ATNI-ResIST
   502 did not reproduce for words, and "91 FR 57841" was not probed.
5. Still queued behind it: Wave 3 (Tier 2 rows 12 to 17 of the
   [Full 0.9 design](development/full09-design-2026-11-05.md)), boundary C, the
   terms reads (D-135, D-138, D-140, D-141), the OLRC alias fetch and screens
   (D-134, D-142, D-143), the Federal Register source note line (D-136).

Nothing is merged, deployed or published without a fresh owner command.

## Open owner decisions

1. Names: D-177 says EO, E.O., XO and NAGPRA count; whether the table records
   "Executive Order 13175" and "NAGPRA" as official (with the page that states
   them) or keeps `people_use`; and whether "NICWA", the National Indian Child
   Welfare Association, is used at all (an organization's name, not a law's).
2. Idaho (D-157): register with Open States (Plural Policy, Inc., for-profit)
   or keep the gap. Note:
   `C:\dev\_scratch\policy-sentinel\full09-build-2026-11-05\carried-review\IDAHO-SOURCE.md`.
3. Parallel monitors (D-149): delete the seven weekly monitors, or say yes to
   one bounded delete command.
4. NCAI reply (D-150): decides whether the intertribal snapshot stays.
5. The feature's name: the page says "Policy issues" and "Issue:"; the owner
   left naming open (D-163).
6. D-165's wording: the page says "Listed with this issue" where the owner's
   words said "under"; "under" is on the forbidden-word list (design rule 2).
7. Flagged review rows (D-142, D-143), PLAN "Later" deferrals, the SAM.gov
   download (D-140), and acceptance for 1.0 (D-147: the T1.7 walk, the
   outside-user test, the ATNI 1.0 license, ATNI ratification).

## Verification

- Issue search (7eac055) and source fixes (9e8bc75): `npm run check` exit 0 on
  the 9e8bc75 tree (195 files, 3,861 passed, 16 skipped; artifact validation
  passed), and again on the 0.9.5 source tree (same counts).
- One sovereignty review of issue search: one blocking finding (name searches
  in the shared-issues panel), fixed with a regression test; the notes not
  fixed are listed under Next session goal.
- Live calls this session, each within a stated budget, through the deployed
  Worker: 30 issue searches (all answered; the CFR lookups for 25 CFR 23 and
  25 CFR 900 kept nothing before the fix), 19 release checks, 4 re-probes plus
  3 redone (D-174), and the browser verifier's 4 per run.
- Browser verifier: 83 of 83 on the local build and on the live page, at 0.9.4,
  0.9.5 and 0.9.6.
- 0.9.6 (D-175, D-176): `npm run check` exit 0 on its source tree (195 files,
  3,861 passed, 16 skipped); PR 30 merged as 9b59688 at 2026-11-19 06:21:36
  UTC, Pages built it at 06:22:13 UTC. The verifier does not press an issue;
  the 11 entries' searches were each live-checked once earlier the same day.

## Not done, and carried limits

- The law alias and plain-phrase tables still ship empty. One water-quality
  docket (EPA-HQ-OW-2015-0174) was left out of the table because its recorded
  page was a search URL. No index shard is acquired; eCFR stays a link-out.
- Wave 3 is not started.
- A case followed before 0.9.3 keeps its "Case name not shown" title until
  followed again; a saved entry reopened after a reload says its in-text
  citations were not kept.

## Records

- Session handoff: `C:\dev\_handoff\policy-sentinel\HANDOFF.md` (top section)
  and the next launch prompt beside it.
- This session's scratch: `C:\dev\_scratch\policy-sentinel\issue-search-2026-11-18\`
  (SPEC.md, TABLE-REVIEW.md, NAMES.md, issues.rows.v1.json, logs) and the
  release receipts in `C:\dev\_scratch\policy-sentinel\release-check-2026-11-18\`.
- [Decision register](decision-register.md) through D-179;
  [demo status](DEMO-STATUS.md) for the live page's history.
