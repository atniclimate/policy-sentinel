# Status

As of 2026-11-19 (Pacific). The live page is still the **0.9.7 demo update**,
served by GitHub Pages from `main` (PR 31, merge commit be454c6). The demo
Worker runs version f6033355-2826-4579-a5e3-0f79f7f74d53; the rollback version
is 8726fa96-87b2-4623-9df4-4dc5b21509eb. These are demo updates, not the D-123
pre-release.

**0.9.8 is built and checked locally. It is not published.** Branch
`demo/live-pages` holds local commits above ead4438, the pushed head. Nothing
is pushed, merged or deployed, and the version files still say 0.9.7; the
publishing step sets 0.9.8 and builds the Pages artifact.

On the local 0.9.8 build a staff member can:

- Read true source statements: why Oregon is off (ATNI Climate accepted the
  data service agreement on 2026-11-05; the demo has not made its first
  checked request), and "10,000 or more" when the Federal Register stops
  counting.
- Open a rule or a bill and see which listed issues its own citations name,
  matched by citation only (D-164).
- Follow a rule to its CFR part's "Authority:" line, then to a U.S. Code
  section that line cites and its source credit, quoted word for word from
  index files beside the page (D-190): CFR titles 25, 36, 40, 43 and 50 (2025
  annual edition), U.S. Code titles 25 and 33 (release point 119-142). Not in
  the index: 40 CFR parts 72 to 78 (volume 18 was not in the edition's files)
  and U.S. Code titles 16 and 42.
- Narrow a Federal Register search by that source's own agency or topic,
  chosen by keyboard from the suggestions (D-188). The other sources say they
  are not narrowed, and a listing is shown only when its own fields state that
  agency or topic.
- Type a Tribe's name with a word such as Tribe, Nation, Band, Village or
  Community: the search is a name search, and every row says a name match does
  not show that the document concerns that Tribe (D-189). About and Limits
  states what is not recognized.
- Be offered 472 Federal Register agency names and 900 topic names, the 18
  named in on 2026-11-19 among them (D-191). One agency name stays held out
  (D-192).

## Next session goal

Publish 0.9.8 when the owner commands it, then start the 575-name mapping
(G-BIA-IDENTITY, D-194). The launch prompt is
`C:\dev\_handoff\policy-sentinel\NEXT-SESSION-PROMPT-0.9.8-publish-and-bia-identity.md`.
Publishing, in order: the owner's answer to decision 1 below; the version set
to 0.9.8 and the Pages artifact built; `npm run check`; the Worker deployed
first (it changed); then push, pull request and merge; then the live verifier
and a `DEMO-STATUS.md` section.

Nothing is merged, deployed or published without a fresh owner command.

## Open owner decisions

1. Confirm the GovInfo policies passage. The CFR rights record in
   `docs/demo-data/manifest.json` quotes https://www.govinfo.gov/about/policies
   as read by an agent on 2026-11-19; index condition B5 needs the owner's own
   confirmation. Until then the five CFR files are not published as current.
2. Publish 0.9.8: one command for each action (Worker deployment, push, pull
   request merge).
3. One more request to OLRC for U.S. Code title 16. The first run failed in
   the builder and its raw file was not kept; the builder now reads that shape.
4. Which chapters of U.S. Code title 42 to index. The whole title builds to
   9.4 MB, over the 1.5 MiB limit for one index file.
5. Confirm four index schema changes made to read the real editions: an
   optional note on a U.S. Code citation, five-digit CFR parts, zero to 16
   transfer targets, a transfer note of up to 6,000 characters.
6. G-BIA-IDENTITY (D-194): which two of the six disputed Alaska paragraphs do
   not count toward 575 under D-175.
7. Local commit afd934b holds nine real Nation names in one test file; the
   next commit replaces them with made-up names. History is not rewritten.
   Publish the branch as it is, or rebuild it on the owner's order.
8. Codex permission rule (D-193): the owner adds it, or tells an agent to.
9. Carried: Idaho (D-157), Parallel monitors (D-149), NCAI reply (D-150), the
   feature's name (D-163), D-165's wording, flagged review rows, the 61
   plain-phrase rows not approved, PLAN "Later" deferrals, the SAM.gov download
   (D-140), and acceptance for 1.0 (D-147).

## Verification

- `npm run check` exit 0 on bb2fe28 (210 test files, 4,078 passed, 16 skipped;
  artifact validation passed). One later source commit only adds general words
  and an "of the" case to the name rule; its focused tests, the type check and
  lint passed. The publishing step runs the full check again after the version
  change.
- Browser verifier 100 of 100 on the local build with the local Worker (it
  now reads a U.S. Code section from the index, follows a looked-up rule to
  its CFR part's Authority line and a cited section's source credit, and
  narrows a name-shaped search by keyboard). Each run: 2 catalog reads, 3
  searches, 2 policy reads.
- One sovereignty review of the whole change, in three parts: four blocking
  findings (real Nation names in one test file; a typed name search exported
  with NCAI sponsor wording; the name rule missed case captions, treaty titles
  and Village or Community names; the CFR rights record's owner-read label).
  Three are fixed with tests and a narrow recheck found them closed; the
  fourth is owner decision 1. Six should-fix points fixed in the same commit.
- Live calls this session: 15 of the 19 approved index requests (4 to OLRC,
  11 to GovInfo); 6 keyless Federal Register requests (two freshness, two
  narrowing shape checks, two list fetches); two verifier runs through the
  local Worker; documentation reads of GovInfo's policies, bulk-data and
  robots pages.

## Not done, and carried limits

- Not published: the page, the Worker and the index files are local only.
- U.S. Code titles 16 and 42 and 40 CFR parts 72 to 78 are not in the index;
  the page says "Not in the index file" and links the official text.
- The CFR manifest entries carry no upstream hash (the schema allows one for
  OLRC only).
- A name typed alone, or only with a word such as Island, is not recognized as
  a name. The Worker narrows by any well-formed entry id; the held-out name is
  kept out of the page's lists only.
- Choosing a narrowing is not announced to a screen reader, and its line sits
  below the filters. Not checked with a screen reader.
- No Codex lane ran (D-193's rule is not added). The 575-name mapping (D-194)
  is not started: it waits for decision 6.
- Carried: the bill-text Worker route (D-166), Regulations.gov identifier
  lookups (D-139), a policy read opening with ruler lines, `demo/main.tsx`
  over 4,300 lines, Wave 3 of the Full 0.9 design.

## Records

- Session handoff: `C:\dev\_handoff\policy-sentinel\HANDOFF.md` (top section).
- This session's scratch: `C:\dev\_scratch\policy-sentinel\build-harden-2026-11-19\`
  (check and verifier logs, acquisition reports, kept raw downloads, the
  narrowing design, review notes).
- [Decision register](decision-register.md) through D-194;
  [demo status](DEMO-STATUS.md) for the live page's history.
