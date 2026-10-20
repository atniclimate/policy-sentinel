# Status

As of 2026-10-20. **Release 0.8.0 (seeded discovery) is checked, built and
committed for publication under D-111.** Choosing an NCAI draft now loads its
suggested policy, legislation, named-bill and court searches into grouped
Results. This answers D-109 (selecting a draft must load results) and D-110
(court searches run automatically, draft seeds fill the searches, and a general
discovery pattern). Publication evidence is recorded below once it is observed.

## What a person can do in 0.8.0

- Choose a draft and Results fill with up to four sections: Policies and Rules,
  Legislation, Bills Named in the Title, and Court Opinions. Automatic searches
  are the first topic on the checked federal sources, GovInfo BILLS and PLAW,
  the first named bill on Congress.gov, and GovInfo USCOURTS, Ninth Circuit and
  USREPORTS for the first case words. That is at most 10 requests, and a search
  held back by the limit offers "Search this too". Legislation and court
  searches use GovInfo and Congress.gov even when unchecked, and the page says so.
- Every row says why it was shown (the terms, source and collection, and the
  draft ID). A document found by several searches appears once, with every
  reason. Each search shows its own outcome: listed, no matches, unavailable or
  not searched, with the reason.
- Sponsor-name searches never run automatically and are worded apart, on the
  draft panel and on committee-area chips (safeguard 1).
- Re-choosing a draft replays the answers already held in the tab without new
  requests, and asks again only where a source was unavailable. Nothing new is
  stored in the browser.
- A cited row's export lists how it was found (seed, terms, source), from
  memory only. The draft title never appears in the export (owner decision 10).
- Typed searches, examples and area chips use the same plan code and keep their
  earlier single-list look.
- Code: `src/demo/discovery.ts` (plans, lanes, merge, cache), `draftPlan` in
  `src/demo/ncai-2026.ts`, and `demo/main.tsx`. The pattern and its Release B
  extension are in the
  [Release B source note](source-reviews/discovery-release-b-sources-2026-10-19.md).

## Verification

- Discovery was built in three workflows (D-110). Every lane had independent
  correctness review; sovereignty and accessibility/plain-language reviewers
  joined at the page boundary. The rounds fixed a sponsor-name search running as
  an ordinary policy lane, result order, stale-section holding, area-chip name
  wording and explicit "no federal source checked" outcomes. The final review's
  two findings were fixed.
- Synthetic-vault Chromium 153: the final run passed all 20 groups. They cover
  the exact automatic request set, sections and outcomes, cache replay and
  outage re-ask, draft switching, the no-search draft, panel buttons including
  already-run searches, sponsor wording, storage holding no draft ID or terms,
  State-to-Federal switching, section holding, desktop and narrow axe with zero
  violations, narrow first-screen layout, and no page errors or provider calls.
  Receipts are in `C:/dev/_scratch/policy-sentinel/ncai-discovery-20261019/browser-check/`.
- Probe (2026-10-20 06:14 UTC, 2 calls, no retry): GovInfo accepts a combined
  collection filter, but page 1 came from one collection only, so each
  collection is its own search.
- `npm run check` passed at 2026-10-20 09:22:35 UTC: 2,712 unit tests in 125
  files, all pipeline stages and the validated synthetic build (two tests
  skipped, as before). The version was then raised to 0.8.0 (package files
  only). `npm run demo:build` passed, and the three superseded hashed assets were
  removed. The approved counts-only scan found 81 drafts, 173 needles, 17 files
  and zero hits.

## Not done, and carried limits

- Real-vault unlock with the owner's password, and the owner's own look at the
  live flow, remain the acceptance test for D-109 and D-110.
- Release B (Worker): comment deadlines, docket, RIN and CFR-part expansion,
  Federal Register topics and the document-type filter. The source note confirms
  the Federal Register and Regulations.gov fields. Before code: one bounded call
  for field shapes, a direct read of the Regulations.gov terms page, and the
  owner's approval to deploy the Worker.
- Wide-screen nit: an old "Added ..." notice can stay in the banner after later
  draft switches. The bill lane outcome reads "Search: hr 1234 119" while its
  Why shown reads as a lookup.
- Carried from 0.7.0: Oregon and Idaho integration gaps; D-106 items 7-8
  ("Arizona" and "Sioux" reseal); NCAI reuse permission; untagged PDFs; Windows
  WebKit Tab and PDF-retry failures; no Safari, Firefox, screen-reader,
  physical-print or outside-user acceptance; no offline or followed-item
  acceptance; expired engine acquisition profiles.

## Next bounded work

Verify the 0.8.0 publication, then have the owner try it unlocked. Next block:
Release B as set out in the source note, starting with the Regulations.gov
terms read and one bounded shape call per new field, then the owner's approval
to deploy the Worker.

## Open owner decisions

1. First real release: public tool with an outside user, or the offline package
   with four demonstrations? 0.8.0 remains a development demo.
2. Is following part of that release, and may a refreshed official-metadata index
   be kept with no user data?
3. Engine use of the existing api.data.gov key; eCFR/Oregon terms; Idaho contact.
4. Nation picker or typed terms only?
5. Defer nationwide survey, area resolver, sibling-app interchange and the 50 GB
   corpus? Earlier rulings remain in force.
6. Archive ROADMAP and its validators? They remain unchanged meanwhile.
7. Standing publication permission, repository license and first outside user.
   D-111 covers this release only.
8. Filter, flag or leave Tribal-government documents printed by federal sources?
9. NCAI's reply on tracker/AssetBank reuse (requested 2026-10-19), convention
   refresh and retirement after final actions.
10. May the exported report include the NCAI draft title? Until then it carries
    the draft ID and search terms only.
11. Approve deploying the demo Worker for Release B once its checks pass.
