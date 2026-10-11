# Status

As of 2026-10-10 on branch `demo/live-pages`: source commit `79d263b`, plus the planning rewrite this page is committed with. This page is overwritten at the end of every session, never appended to. Older state narrative is in Git history.

## Goal

Policy Sentinel lets Tribal policy, natural resources and legal staff, and the ATNI Climate staff who support them, search official federal and state sources and public Tribal and intertribal publications together, read the passages that matter, keep notes and export a cited document, with every result traced to its official source. It never says what a policy legally means for a Nation, never links a record to a Nation without exact official evidence, and keeps nothing about its users. The full statement is in [`AGENTS.md`](../AGENTS.md).

## Current milestone

Milestone 1 of 6 in [`docs/PLAN.md`](PLAN.md): published and true. The rebuilt demo page is public: the owner merged pull request 7 on 2026-10-11 at 00:39 UTC. The D-095 follow-ups (version, seal, citation) and the planning rewrite are committed locally and wait for the owner's next push and merge. The live acceptance run and the browser checks by a person have not happened.

## What is live

| Item | State |
| --- | --- |
| Project version | 0.6.0, in development (D-095, the owner's direction of 2026-10-10 on demo follow-ups and planning). |
| Public page | `https://atniclimate.github.io/policy-sentinel/` serves the rebuilt interface as built at `c602468` (merge commit `e295957` on `main`, Pages build finished 2026-10-11 00:39:56 UTC; its stylesheet was read back from the public address). It shows version 0.2.0 and has no seal until the next merge. |
| Local, not yet public | Commits `79d263b` and later on `demo/live-pages`: version 0.6.0, the ATNI seal, the ATNI Climate citation, and the planning rewrite. 335 demo tests pass. The full check exited 0 on the tree this page is committed with, on the second of two runs (see known breakage). The acceptance script passed 82 of 82 against a local mock at `c602468`; it was not rerun after the seal was added. |
| Worker | `policy-sentinel-demo` version `969d1a24-f4de-4706-9fa9-24feae5f2503`, at 100% of traffic since 2026-10-11 01:22:50 UTC, built from `79d263b`. It allows 60 requests per minute per address. GovInfo, Congress.gov and Regulations.gov are live through the owner's api.data.gov key, held as a Worker secret. One bounded live check on the previous version showed all three sources return the same Federal Register document number for one joint rule. |

## Next step

1. The owner pushes `demo/live-pages` and merges it to `main` again, to publish the follow-ups. Agents cannot push or merge.
2. Then run the bounded live acceptance script against the public page one time (its document checks expect the 0.6.0 wording, so it waits for step 1), look at one live multi-source search for the merged row, and record versions, times and counts in `docs/DEMO-STATUS.md`.
3. Then milestone 2, the federal families, one family at a time, live call first.

## Open owner decisions

1. First real release: the public tool with one outside user (recommended), or the offline package with four demonstrations? And its version number (0.6.x is the working version)?
2. Following: is following a rule, bill or docket part of that release, and may the service keep a refreshed index of official public metadata, with no user data?
3. Key and terms: may the existing api.data.gov key be used for engine work? Does the owner accept the eCFR and Oregon terms and approve contact with Idaho?
4. Nation picker in the release, or typed terms only?
5. Defer the nationwide survey, area resolver, sibling-app interchange and 50 GB corpus past the release? This partly reverses rulings of 2026-09-22, 2026-09-24 and 2026-10-06.
6. Archive `ROADMAP.yaml` and its validators? Until answered they stay unchanged and are validated.
7. May agents open pull requests for the public page? Which license (the repository is public and has none)? Who is the first outside user?
8. Tribal government documents printed by a federal source, such as an ordinance in a Federal Register notice, are not detected today. Filter, flag or leave them? Open since D-094.

## Known breakage and gaps

- Until the next merge, the public page is one build behind the Worker (no seal, version shown as 0.2.0, title-only Policy Sentinel reference). It works against the newer Worker.
- Not checked by anyone: Safari, Firefox, a screen reader, a physical print, and the PDF in Acrobat, Preview or pdf.js.
- The PDF is not tagged for screen readers. Letters outside the embedded fonts, including some in Indigenous-language names, stop the PDF export with a message; Print view is the fallback. A very long list can hold the page for seconds while the PDF is built.
- Engine side, per the 2026-10-10 assessment and not re-verified here: the federal API integrations beyond the demo Worker are plans and tests on invented responses with no bounded live check, and the acquisition runner's GovInfo and Washington source profiles expired on 2026-10-05, so it refuses requests to them. The demo is unaffected.
- The Codex session-start hook (`scripts/codex-hooks.mjs`) still tells Codex to follow the continuation prompt's old scope-specific context rule. That rule is retired. Change the hook text and its test when convenient.
- One intermittent test: in the first of two full check runs on 2026-10-10, `tests/app/StudyWorkspace.test.tsx` ("completes the analyst loop and resumes exact evidence") failed with a study validation alert. It passed alone and in the second full run (2,404 of 2,404). It is outside the demo and was not investigated or fixed.
- Three engine source adapters still send `0.2` in their user agent strings, pinned by their tests. They are outside the demo and were left at the old version.
- Small design notes waiting on the owner: the phone header sets the title in two lines beside the seal; the design system names a different seal file for light grounds than the one supplied; its rule that body text on a dark ground uses weight 500 is not applied (the page uses 400); Roboto stays as the body face because the design system ranks neither Roboto nor Poppins.
