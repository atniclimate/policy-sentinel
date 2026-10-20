# Status

As of 2026-10-19. **The NCAI context expansion was published under D-108.
The D-109 draft-to-Results repair is implemented locally, not published.**
D-109 records the reported missing state-policy and judiciary experience and
the requirement for selecting a draft resolution to load policy matches into
Results automatically. D-107 requested regional state
policy research, court/legislation searches and more than ten research agents,
prioritizing federal rulings and schedules. Eleven research agents completed
their assignments; one additional agent reviewed the local implementation.

## D-109 repair, local and unpublished (2026-10-19, later session)

Choosing an NCAI draft now runs its first suggested topic search on the checked
federal sources (its first named bill when it has no topic) and loads Results.
Results name the draft, the submitted terms and why they ran ("a text match,
not a finding"). A draft with no search, or whose source is off, clears the
previous draft's results and says why. Changing drafts replaces results; the
search panel's other presets carry the draft label too. Code: `openDraft` and
`runSearch` in `demo/main.tsx`, `draftSearch` in `src/demo/ncai-2026.ts`.

Checks: 579 demo tests (one new results test, one new `draftSearch` test, two
tests updated for the reversed no-search-on-select rule), typecheck, lint,
Prettier on changed files and the source-boundary scan passed. A synthetic-vault
Chromium 153 run passed seven groups: keyboard choice loads labeled Results
with distinct results/unavailable/empty/not-searched rows, draft switching
replaces results, a termless draft clears them with no request, desktop and
narrow axe with zero violations, narrow Results focused with no overflow, and no
provider calls or page errors. Receipt and screenshots:
`C:/dev/_scratch/policy-sentinel/ncai-autoload-20261019/browser-aNe0UN/`.

Not done: the live page is still 0.7.0 without this change; publishing needs
`npm run demo:build`, the full check, review and the owner's push/merge command.
Case matches are not loaded automatically (one click in the panel). Real-vault
unlock and the owner's reported display problem remain unverified. Search
matches still imply no legal relevance or Nation relationship.

## This session

- NCAI draft panels now offer GovInfo federal bill/resolution, public-law and
  Ninth Circuit opinion searches using their existing hand-picked terms. Grouped
  expressions fix the defect where an OR term could escape a collection filter.
- Readers choose WA, OR, ID, AK, CA, MT or NV and copy context terms into official
  state research sites. No state is inferred from a sponsor. These are external
  links, not ingested state results. Official federal opinion/docket/calendar
  links and NILL case bulletins support further research; schedules are not searched.
- The [source review](source-reviews/ncai-context-research-2026-10-19.md) records
  eleven research lanes, current primary documentation, five public-topic case
  leads, access/reuse gaps and what can be wired through the existing demo Worker.
  No new adapter, provider host, account, credential or engine collection was activated.
- The approved vault CLI read the private draft input only for a counts-only
  artifact/query validation scan; no terms were exposed or resealed. The vault,
  Worker and owner-supplied untracked documents are unchanged. The 17-file Pages
  artifact is published through [PR 14](https://github.com/atniclimate/policy-sentinel/pull/14).

## Verification

The 71 focused NCAI/frontend tests passed, including query grouping, the blank
initial state choice and explicit search activation. Typecheck, lint,
format:check and the source-boundary scan passed. Five bounded, no-retry GovInfo searches through the
existing Worker returned the requested collections; response bodies were not
retained. Counts and their limits are in the source review.

A synthetic-vault Chromium build passed eight browser check groups: keyboard
state selection and links, all seven state directories without automatic
requests, federal directory keyboard opening, desktop and narrow axe scans with
zero violations, narrow layout without horizontal overflow, and explicit
activation of the three new presets. Four viewport screenshots were inspected.
The initial link target-size defect was repaired and rechecked. Synthetic browser
checks made no provider calls; the temporary server and browser were closed.
Independent risk review found no substantiated Must/Should finding.

The first full check caught a stale vault-test search count (7 instead of 11).
It is fixed. The release scan now reuses the existing generated-query validator;
an overlength synthetic query failed before that repair and passes its rejection
test afterward. All 75 vault tests pass. The approved counts-only scan checked
81 drafts, 173 needles and 17 runtime files with zero plaintext hits, and
validated every generated query against the existing 200-character limit.
The final `npm run check` passed at 2026-10-19 19:28:50 UTC: 2,649 unit tests
in 124 files, 48 hook tests, all pipeline stages and the validated synthetic
build. Two native Windows file-symlink tests were skipped. Independent artifact
review found no Must/Should finding. The real-vault unlocked workflow and
non-Chromium browsers remain outside this publication check.

## Publication and carried limits

[PR 14](https://github.com/atniclimate/policy-sentinel/pull/14) merged as
`2cfb485` at 2026-10-19 19:29:46 UTC; Pages finished at 19:30:12 UTC. Its tree
matched reviewed source `9807b63`. Readback at 19:30:42–19:30:47 UTC matched
all 17 published runtime files byte-for-byte. Chromium 153.0.8010.12 passed
seven publication checks, including keyboard opening, empty-password handling,
Escape focus restoration and two axe scans with zero violations. Two screenshots
were inspected. The browser rendered those verified bytes with a synthetic
catalog; the batch made 17 static GETs, no retries and no provider calls. No page
errors occurred, the browser closed and no server was created. This does not
establish real-vault unlock or new live backend acceptance. The Worker remains
`583cd4ab-f99b-4ffc-9d7b-c9d73466df18`, source `350329f`.

- Federal Register, GovInfo and Regulations.gov support topics, source-date
  filters and Load more; Congress.gov and Washington are reference lookups.
  Oregon and Idaho remain integration gaps. A directory does not close them.
- D-106 items 7–8 remain excluded: removing "Arizona" (PSC-26-025) and "Sioux"
  (PSC-26-047) needs the owner's reseal; real unlocked-menu acceptance needs the
  owner's password. NCAI reuse/AssetBank permission is still pending.
- D-102/D-103 live search/report checks passed within their bounded requests;
  the direct Congress destination returned 403 without retry. PDFs remain
  untagged, with a nearly empty final print page in one exercised case.
- Windows WebKit retains initial Tab traversal and direct-PDF retry failures;
  the local study's strict narrow document-width check also failed. WebKit is
  not actual Safari acceptance. Physical printing, actual Safari/Firefox,
  screen-reader and outside-user acceptance remain unverified.
- Offline installation/disconnected acceptance and a live followed-item refresh
  remain missing or unverified. Session report restoration is not following.
- Engine source qualification and credential gates remain. GovInfo/Washington
  acquisition profiles expired 2026-10-05; the direct Ninth Circuit opinion
  profile expired 2026-10-15. This research renews none of them.

## Next bounded work

Publish the D-109 repair above once the owner commands it, then confirm it in
the real unlocked flow; publication success alone must not close it. After that, use the source review's dated leads
to choose one official opinion or schedule contract for a separate source
qualification. Washington topic discovery remains
manual until a permitted interface is qualified. Oregon terms, Idaho structured
legislative access, California automation restrictions and CourtListener account
requirements remain separate gates. Case leads have not been checked for later
history, current status, legal effect or a relationship to an encrypted draft.

The staff tasks in [PLAN.md](PLAN.md) remain consultation discovery for water,
forestry and the Roadless Rule, and FY27 Tribal Community Resilience/funding
research, including executive actions, litigation and 25 U.S.C. § 117c. Exact
evidence must distinguish invitations, participation and separate funding/legal
processes. No current funding or legal answer is established by this session.

## Open owner decisions

1. First real release: public tool with an outside user, or the offline package
   with four demonstrations? 0.7.0 remains a development demo.
2. Is following part of that release, and may a refreshed official-metadata index
   be kept with no user data?
3. Engine use of the existing api.data.gov key; eCFR/Oregon terms; Idaho contact.
4. Nation picker or typed terms only?
5. Defer nationwide survey, area resolver, sibling-app interchange and the 50 GB
   corpus? Earlier rulings remain in force.
6. Archive ROADMAP and its validators? They remain unchanged meanwhile.
7. Standing publication permission, repository license and first outside user.
   D-106 covered the previous publication; D-107 covers this local research and
   implementation. D-108 authorizes publication and closeout of this expansion;
   standing permission for unrelated future releases remains open.
8. Filter, flag or leave Tribal-government documents printed by federal sources?
9. NCAI's reply on tracker/AssetBank reuse (requested 2026-10-19), convention
   refresh and retirement after final actions.
