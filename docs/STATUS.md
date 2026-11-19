# Status

As of 2026-11-19 (Pacific, early). The live page is the **0.9.7 demo update**,
served by GitHub Pages from `main` (PR 31, merge commit be454c6, 2026-11-19
08:16:00 UTC; Pages built it at 08:16:24 UTC). The demo Worker runs version
f6033355-2826-4579-a5e3-0f79f7f74d53, built from 63326cb; the rollback version
is 8726fa96-87b2-4623-9df4-4dc5b21509eb. These are demo updates, not the D-123
pre-release.

**Suggestions (0.9.7, D-177 to D-187).** A staff member can start typing a
law, an agency, a topic or an executive order the way people say it:

- 466 Federal Register agency names and 888 topic names
  (`docs/demo-data/vocab/`, D-180). Choosing one fills the box; it filters
  nothing.
- 143 law names from the exact wording of the OLRC Popular Names table, 26
  with an acronym a Federal Register document prints as "Name (ACRONYM)"
  (`config/law-aliases.v1.json`, built by `scripts/build-law-aliases.mjs`,
  D-181, D-184). Choosing a law searches its official name and links the U.S.
  Code section.
- Executive orders: "Executive Order", "E.O.", "EO" and "XO" forms read as one
  kind, looked up on the Federal Register by the order's own number; the page
  says how many listings were left out, and an order before 1994 is not
  covered (D-177).
- 91 plain phrases, each pointing to an exact official topic or agency name
  (`config/plain-phrases.v1.json`, D-185).
- One agency name that includes two Nations' everyday names is held out by a
  hashed list (D-186, owner undecided).

Earlier: issue search and the 11-entry issue table (0.9.4 to 0.9.6), all seven
Worker sources verified at release 2026-11-18 (0.9.5), 575 settled (D-175).

## Next session goal

Continue building toward the first real release, and end with one
comprehensive test-and-fix pass so the next update (0.9.8, D-179) is ready to
publish. The launch prompt, prepared from a whole-project review, is
`C:\dev\_handoff\policy-sentinel\NEXT-SESSION-PROMPT-0.9.8-build-and-harden.md`;
the review itself is `C:\dev\_handoff\policy-sentinel\PROJECT-REVIEW-2026-11-19.md`.
Known candidates, in order:

1. A design, for the owner's ruling before any build, for narrowing a search
   by general terms and by Tribe (D-186). It must keep safeguard 1 and
   reconcile the Nation picker rule (D-152: never filters).
2. Suggestion follow-ups: the 18 official names the Nation-name check leaves
   out (for example the topic "Indians"); CFR title names (no approved
   source); law rows the builder could not read (list citations such as
   "42 U.S.C. 1996, 1996a"); 12 acronyms with no official statement found;
   agency and topic names as real Federal Register filters.
3. Carried from 2026-11-18: `issuesInText` on the page; the bill-text Worker
   route (D-166, design first); "Section 106" also matching other laws'
   section 106; the Federal Register's 10,000 cap shown as exact; a policy
   read opening with ruler lines; a Washington bill's opening is its front
   matter; Regulations.gov identifier lookups (D-139); `demo/main.tsx` is over
   4,200 lines.
4. Still queued: Wave 3 (Tier 2 rows 12 to 17 of the
   [Full 0.9 design](development/full09-design-2026-11-05.md)), boundary C,
   the terms reads (D-135, D-138, D-140, D-141), the U.S. Code and CFR index
   files.

Nothing is merged, deployed or published without a fresh owner command.

## Open owner decisions

1. Narrowing by general terms and by Tribe (D-186): the design comes first.
   Until then the held-out agency name stays out.
2. The 18 official names the Nation-name check leaves out: name them in
   through an exact-label list, as was done for five law titles, or not.
3. Codex: the guarded Codex write launch was refused by the host's permission
   classifier on 2026-11-18. A permission rule for that command, or no Codex
   lanes.
4. Idaho (D-157), Parallel monitors (D-149), NCAI reply (D-150), the
   feature's name (D-163), D-165's wording, flagged review rows, the 61
   plain-phrase rows not approved, PLAN "Later" deferrals, the SAM.gov
   download (D-140), and acceptance for 1.0 (D-147).

## Verification

- `npm run check` exit 0 on the 0.9.7 tree (199 files, 3,947 passed, 16
  skipped; artifact validation passed).
- One sovereignty review of the whole change: three blocking findings (the
  agency name above, two Treaty-named acts shown as approved by rule, a
  partial lookup called complete), each fixed with a regression test; narrow
  recheck clean.
- Browser verifier 87 of 87 on the local build and on the live page (it now
  types an agency's name and chooses it by keyboard). One more live look: the
  executive-order lookup for 13175 listed 65 FR 67249 and said 8 listings were
  left out; one search sent.
- Live calls this session: 45 keyless Federal Register requests (1 lookup
  shape, 3 list fetches, 41 acronym searches), 2 to OLRC (one 404), 1 to
  GovInfo, and the verifier's budget twice plus one search.

## Not done, and carried limits

- The Codex screen of D-142 did not run; the owner approved the rows (D-184,
  D-185). No Codex lane ran.
- No U.S. Code or CFR index file is acquired; eCFR stays a link-out. A law
  name's U.S. Code citation is the table's own wording, which for a restated
  title can be the earlier classification.
- An order that more than 100 later orders mention may not be found by the
  one request; the page then says further pages could not be established.
- A case followed before 0.9.3 keeps "Case name not shown" until followed
  again.

## Records

- Session handoff: `C:\dev\_handoff\policy-sentinel\HANDOFF.md` (top section).
- This session's scratch: `C:\dev\_scratch\policy-sentinel\autocomplete-2026-11-18\`
  (review tables, acquisition reports, check and verifier logs).
- [Decision register](decision-register.md) through D-187;
  [demo status](DEMO-STATUS.md) for the live page's history.
