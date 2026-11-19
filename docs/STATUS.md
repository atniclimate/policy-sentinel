# Status

As of 2026-11-18 (Pacific). The live page is the **0.9.5 demo update**, served
by GitHub Pages from `main`: the 0.9.1 build (the Full 0.9 build, D-118 to
D-133), the Example Issue (0.9.2), court case names (0.9.3), issue search
(0.9.4, PR 28, merge commit 9a18cf5) and the source release record (0.9.5,
PR 29, merge commit f19a116). The demo Worker runs version
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
rows found only by a name search are not counted). The committed table holds
the Section 106 consultation issue and the BAAJA bill (D-171). The Search pane
heading is "Policy issues", because the "Issues" pane lists passages in a
policy.

**Verified sources (0.9.5, D-172 to D-174):** all seven Worker sources read
"Enabled, verified at release 2026-11-18", from one bounded release check each
and, for GovInfo, its court opinions and Grants.gov, a re-probe after the
Worker deployment that fixed them.

## Next session goal

Ship the rest of the issue table and harden what the checks found. In order:

1. The exact 575-name list (D-168, O-001, G-BIA-IDENTITY). The 2026 notice
   parses to 577 paragraphs against a stated 575; the owner held the
   577-paragraph hash file. Until a reconciliation the owner accepts exists, the
   nine drafted rows stay in scratch (path under Records), and so do the alias
   and phrase tables' rows.
2. The open review notes on issue search (Records: review summary): the bare
   name "Section 106" also matches other laws' section 106 when typed with
   them; "Executive Order 13175" and "NAGPRA" may be stated officially, which
   would change D-169 and D-170 (ask the owner); one scratch row cites a search
   URL as its official page; `issuesInText` is built and tested but not on the
   page yet; the G3 exception is keyed by id only.
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

1. The exact 575-name list (D-168): how the two extra paragraphs of the 2026
   recognition notice are reconciled, or whether some other source settles it.
   It gates every issue, alias and phrase row beyond D-171's two.
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
- Browser verifier: 83 of 83 on the local build and on the live page, at 0.9.4
  and at 0.9.5.

## Not done, and carried limits

- Nine drafted issue rows wait for the 575 list; the law alias and plain-phrase
  tables still ship empty. No index shard is acquired; eCFR stays a link-out.
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
- [Decision register](decision-register.md) through D-174;
  [demo status](DEMO-STATUS.md) for the live page's history.
