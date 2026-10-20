# Status

As of 2026-10-20. **Release 0.9.0 (Release B of seeded discovery) is checked,
built and committed; the demo Worker is deployed (D-112); the page publishes
through PR 17 (D-113).** The owner accepted 0.8.0's draft-to-Results flow
(D-112, "seems to work"). Publication evidence for 0.9.0 is recorded below
once observed.

## What a person can do in 0.9.0

- Everything in 0.8.0: choosing an NCAI draft fills grouped Results (Policies
  and Rules, Legislation, Bills Named in the Title, Court Opinions). There are
  at most 10 automatic requests, each row says why it was shown, and
  sponsor-name searches run only on request.
- Federal Register rows show "Comments close <date>, as stated by Federal
  Register" and the Federal Register's own topics, verbatim, plus their docket,
  RIN and CFR-part identifiers.
- "Find related" on a row runs exact identifier lookups (same docket, same RIN,
  same CFR part) only within the source that stated each identifier. It keeps
  only listings that state the identifier and counts the rest apart. Results
  say a shared identifier does not show that one document governs another.
- A document-type filter (Rule, Proposed Rule, Notice, Presidential Document)
  applies to the Federal Register. Every other search says the filter was not
  applied.
- The exported report may carry the NCAI draft title (D-112); sponsor-name
  terms stay out.
- Regulations.gov lookups, type filter and comment dates stay off behind
  `REGULATIONS_V2_CONFIRMED` until its terms page is read and its shapes are
  confirmed live. Its rows say "This demo does not show Regulations.gov comment
  dates yet."

## Verification

- Release B was built in one workflow: contract v2, title export, record seed
  and page lanes, a synthetic browser run, and three review rounds on
  correctness and compatibility, sovereignty and Worker security. The driver
  fixed what survived. Identifier lookups now filter where answers settle, so
  each count matches its rows and left-out listings are stated. Regulations.gov
  rows state that their dates are not shown.
- Synthetic-vault Chromium: 29 of 29 groups passed, including the Release B
  groups, desktop and narrow axe with zero violations, and no provider calls.
- `npm run check` passed at 2026-10-20 13:41:41 UTC: 2,813 tests in 125 files.
  16 Regulations.gov v2 tests are skipped behind the flag; the two native
  symlink skips are as before.
- Federal Register probe before building (2 calls, 11:32 UTC) recorded the field
  shapes.
- Worker deployed from `66a3420` as version
  `f6e2b85a-70b2-418b-a539-9dfa6650fc7a` (wrangler 4.151.3), tagged
  `66a3420`. The previous version `583cd4ab-f99b-4ffc-9d7b-c9d73466df18` is the
  rollback target.
- After deployment, the live verifier on the published 0.8.0 page: 78 of 83
  passed, including search and policy read through the new Worker. The 5
  failures compare the page's 0.8.0 version label with the local 0.9.0 package
  version, and resolve once 0.9.0 is published.
- Five bounded live Worker calls (13:43 UTC, no retry): a v2 Federal Register
  search carried all five new fields; the docket lookup returned the one exact
  document; the CFR lookup worked; v1 GovInfo (key path) worked; and v1 echoed
  no v2 fields.
- `npm run demo:build` passed; superseded hashed assets removed. Counts-only
  scan: 81 drafts, 173 needles, 17 files, zero hits.
- Receipts: `C:/dev/_scratch/policy-sentinel/ncai-discovery-20261019/release/`.

## Not done, and carried limits

- Regulations.gov v2: read its terms page, make one bounded call per field
  through the Worker, then switch on `REGULATIONS_V2_CONFIRMED` with its tests.
- Nits: an old "Added ..." notice can stay in the banner; the exported report
  leaves out a row's closing date, topics and identifiers; "Docket: Docket No."
  repeats the FR's own text.
- Carried from earlier releases: Oregon and Idaho integration gaps; D-106 items
  7-8 ("Arizona" and "Sioux" reseal); NCAI reuse permission; untagged PDFs;
  Windows WebKit Tab and PDF-retry failures; no Safari, Firefox, screen-reader,
  physical-print or outside-user acceptance; no offline or followed-item
  acceptance; expired engine acquisition profiles.

## Next bounded work

Merge PR 17 and verify the 0.9.0 publication. Then the Regulations.gov v2
switch-on above. After that, the staff tasks in [PLAN.md](PLAN.md):
consultation discovery for water, forestry and the Roadless Rule, and FY27
funding research.

## Open owner decisions

1. First real release: public tool with an outside user, or the offline package
   with four demonstrations? 0.9.0 remains a development demo.
2. Is following part of that release, and may a refreshed official-metadata index
   be kept with no user data?
3. Engine use of the existing api.data.gov key; eCFR/Oregon terms; Idaho contact.
4. Nation picker or typed terms only?
5. Defer nationwide survey, area resolver, sibling-app interchange and the 50 GB
   corpus? Earlier rulings remain in force.
6. Archive ROADMAP and its validators? They remain unchanged meanwhile.
7. Standing publication permission, repository license and first outside user.
   D-113 covers this release only.
8. Filter, flag or leave Tribal-government documents printed by federal sources?
9. NCAI's reply on tracker/AssetBank reuse (requested 2026-10-19), convention
   refresh and retirement after final actions.
