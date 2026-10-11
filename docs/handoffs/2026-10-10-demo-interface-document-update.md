# Demo: keyed federal sources, interface, document and provenance update

Owner directions on 2026-10-10, recorded verbatim in the
[decision register](../decision-register.md): D-093 (switch on GovInfo,
Congress.gov and Regulations.gov in the demo) and D-094 (state drop-down,
multi-select federal sources with duplicate handling, restyle from the ATNI
convention polish folder, document citations and provenance, required data
actor entries, a Tiered Sovereign Data Framework notice, a frame that fills the
page, and a tight mobile layout with the description behind a button).

Starting checkpoint: `920b245` on `demo/live-pages`. This is demo-surface work
under D-083 and D-084. No general-engine gate opened; G-B-GOVINFO, G-B-CONGRESS
and G-B-REGULATIONS stay closed for the general engine.

## Scope and safeguards

Changed paths: `demo/`, `src/demo/`, `worker/src/index.ts`, `tests/demo/`,
`scripts/finish-demo-build.mjs`, `scripts/verify-demo-browser.mjs`, the built
`docs/index.html` and `docs/demo-assets/`, `package.json` and
`package-lock.json` (one dependency), and the records named below. Protected
kernel, experimental, vision, pipeline and contract paths are byte-identical to
`e3f4c64`. Untracked owner documents under `docs/` were not touched. No agent
registered a key, accepted provider terms, handled the key value, pushed, or
merged.

Fonts are self-hosted copies under the SIL Open Font License, with the licence
texts beside them in `demo/fonts/`: League Spartan, Roboto and Noto Sans from
the owner's dashboard project, and League Spartan and Lexend Deca static faces
from the ATNI design system folder. The page makes no third-party request.

## Session ledger

| Checkpoint | Commit | What finished |
| --- | --- | --- |
| D-093 Worker fix | `ef47304` | GovInfo search accepts the live response shape (issuing bodies as a list, documents inside a package). Deployed with owner approval as Worker version `3e41b801-3018-487d-a590-4417824f8d11`. |
| D-093 record | `e3f4c64` | Decision row and demo status. Reached `main` through pull request 6 (`bccbba6`), pushed by the owner. |
| D-094 foundation | `05050d8` | Match key on citations, precedence merging, IEEE-style references, one document model, data actor entries in the saved report (saved version 3; version 2 still restores). Decision row D-094. |
| D-094 build | `98a74ce` | Four-pane interface, both themes, About and Limits dialog, footer line, PDF and print view from the shared document, Worker match keys, font-aware build scan, acceptance script for the new interface. Adds `@pdf-lib/fontkit` 1.1.1. |
| D-094 review fixes | `d48626d` | Fixes from five independent reviews, the Worker-to-page seam test, rebuilt `docs/`, three stale bundles removed. |
| Records | `c5907f1` | Demo status, ledger evidence on GD-28 (existing demo assessment, repairs and local validation), README demo paragraph, this handoff. |
| Worker deployment | `c5907f1` deployed | Worker version `dd22a664-101a-49a3-984b-cad69de53f49` at 100% from 2026-10-11 00:10:07 UTC, with owner approval. Four bounded live requests: all three sources returned Federal Register document 2026-20447 with one match key. |
| Same-source listings | this commit | The live check showed Regulations.gov lists a joint rule once per agency docket. The page now merges every listing that shares the document number and names same-source listings by identifier. 330 demo tests pass; `docs/` rebuilt; the built page passes the acceptance dry run 82 of 82 against a local mock. |

Work was run as three workflows (foundation, build, review) with lanes on
disjoint files; the main session staged and committed. Evidence, screenshots
and rendered PDF pages are outside the repository under
`C:\dev\_scratch\policy-sentinel\demo-restyle-2026-10-10\`.

## Evidence

All of it uses local synthetic material; no request went to the deployed Worker
or a government host during D-094 work.

- 329 demo tests pass in 11 files. At the build checkpoint the test files were
  compared one by one with `05050d8`: 110 test cases had become 143 and no file
  had lost one.
- `npm run check` exited 0 on the final tree with these records: runtime,
  format, hook tests, lint, typecheck, roadmap, backbone, knowledge and source
  scan validation, every `npm test` stage including 2,398 unit tests in 119
  files, and the ordinary synthetic build with artifact validation. A read-only
  gate check before the last five wording edits found the protected paths
  byte-identical and the private-context files unreachable from both demo
  entries.
- A scripted pointer and keyboard walk passed 394 of 394 checks in 12 runs at
  three sizes in both themes, with no page scroll at the two desktop sizes, no
  request to another host, and no automated accessibility violation in 138
  state runs.
- The acceptance script passed 82 of 82 against the built page and a local
  mock, with its request budget unchanged.
- Five independent reviews confirmed 46 findings after each was challenged by a
  second agent; 12 were rejected. Every confirmed major is fixed.
- Primary documentation read on 2026-10-10: the Regulations.gov OpenAPI
  specification defines `frDocNum` in the document list response as the Federal
  Register document number; the published Tiered Sovereign Data Framework 0.9.8
  text says documented public federal and state sources are Tier 0, subject to
  source conditions.

## Not done, and what is next

1. The Worker is deployed. The owner pushes `demo/live-pages` and merges to
   `main`; the agent session cannot push or open a pull request under the
   recorded deny settings.
2. After the page is published, run the bounded live acceptance script once
   against it, look at one live multi-source search to see the merged row on
   the page, and record versions, times and counts in
   [the demo status](../DEMO-STATUS.md).
3. Not checked by anyone: Safari, Firefox, a screen reader, a physical print,
   and the PDF in Acrobat, Preview or pdf.js.

## Owner decisions open

- The author and publisher line for the Policy Sentinel reference, and whether
  the README attribution paragraph (independent project, no endorsement
  implied) should change with it.
- Whether results that are Tribal government documents printed by a federal
  source should be filtered, flagged or left as they are (D-083).
- Whether to keep `@pdf-lib/fontkit` (unmaintained since 2020, no licence text
  shipped) or return the PDF to Helvetica.
- Body typeface on the page: Roboto under the 2026-10-04 web typography ruling,
  or Lexend Deca as in the convention polish folder.
- Whether the Worker's 30 requests per minute per address should rise now that
  one search can use four.
- Confirmation of the three other readings recorded in D-094 (source order for
  duplicates, the five data actor entries, the reference format).

## Gates that stay closed

Every general-engine source, acquisition, publication and private-data gate.
The demo exception under D-083, D-084, D-093 and D-094 covers the demo page, its
Worker and its exported document only.
