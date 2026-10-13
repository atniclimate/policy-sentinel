# Plan

Status of this plan: it is the agent's proposal, adopted as the working plan under D-095 (the owner's direction of 2026-10-10 on demo follow-ups and planning). The items in the owner-decision list in [`STATUS.md`](STATUS.md) (the release definition, the scope deferrals that partly reverse rulings of 2026-09-22, 2026-09-24 and 2026-10-06, and archiving the ledger) take effect as written only when the owner confirms them. Until then nothing deferred is deleted and no earlier ruling is treated as revoked.

## The goal

A Tribal policy, natural resources or legal staff member opens one page, searches official federal and state sources and public Tribal and intertribal publications together, and sees for each result what it is, where it came from, when it was retrieved and why it was shown. They can read the passages that matter, keep notes, export a cited document, follow a rule, bill or docket, and (on their own machine, offline) add their own documents. The full statement and the safeguards are in [`AGENTS.md`](../AGENTS.md).

## What this plan replaces

`ROADMAP.yaml` and its validators, the earlier plans and the operating model are retained record. They stay unchanged, are still validated mechanically, and are not the working plan. Engine parts built for those plans (the text extractor, the acquisition runner, custody, search) are pulled in when a milestone needs them, not finished for their own sake.

## Milestones

Each milestone is done when its checks pass on the real service and the result is written in `STATUS.md`. Every source is added one at a time, live call first, and the trimmed response shape of that call becomes the test fixture. The full check runs once before anything is published.

### 1. Published and true

- A person can: use the rebuilt page at the public address.
- Checks: a live search for a joint rule shows one merged row; a person tries Safari, Firefox and a screen reader.
- Builds on: `demo/` and `worker/`. The 0.6.1 maintenance update was published through pull request 9 under D-098. D-101 publishes the reviewed search upgrade and audit repairs; the compatible Worker and bounded keyed date/continuation checks passed. Outside-user acceptance and the checks by a person remain outstanding.
- Needs the owner: participation in the browser and assistive-technology checks; each later Worker deployment and runtime publication needs separate authorization.

### 2. Federal families

- A person can: find public laws, bills and resolutions, budget documents, court opinions and rules, and read their text.
- Checks: one known item of each family is found with its official link. Each route has had one bounded live call, and its recorded response shape (trimmed, not a raw dump) is the test fixture.
- Builds on: the Worker handlers, the [federal access and reliability plan](development/gd57-federal-expansion-access-reliability-2026-10-09.md) of 2026-10-09 and its [five proposed probes](development/gd60-federal-probes-and-local-refresh-plan-2026-10-09.md). The engine's federal API items are merged into this milestone.
- Needs the owner: a yes to use the existing api.data.gov key for engine work; the eCFR terms.

### 3. Follow and see change

- A person can: follow a rule, bill or docket and see "new since" when they return.
- Checks: a followed docket shows a new document after one appears. The list stays in the browser or in an exported file.
- Builds on: `src/demo/report-state.ts` and the engine's lifecycle code.
- Needs the owner: decision 2 in `STATUS.md`. A browser-held list needs nothing more. A small refreshed public index built with the engine's runner needs the owner's yes.

### 4. First outside user: the first real release (proposed)

- A person can: complete a real task unaided.
- Checks: a Tribal policy staff member who is not the owner does so and states correctly what the result does and does not establish. Every source the page calls live has been checked against the real service, and the page says plainly what it does not cover.
- Builds on: milestones 1 to 3.
- Needs the owner: confirming this definition, a license, and recruiting the outside user.

### 5. The region

- A person can: search Washington by topic, then Oregon, Idaho and the four other states named in D-086 (the owner's plan revision of 2026-10-06: Alaska, California, Montana, Nevada), and read ATNI, NCAI and USET resolutions.
- Checks: each state returns real results or says on the page why not. A resolution names its issuer and implies no member Nation's position.
- Builds on: the source catalog and the source reviews in `docs/source-reviews/`.
- Needs the owner: the Oregon terms and contact with Idaho.

### 6. Own documents, offline

- A person can: install on their own machine, add their own documents, and search and export with no network.
- Checks: demonstration A1 as written in the [definition of done of 2026-09-24](decisions/2026-09-24-definition-of-done-general-development.md): a Tribal staff member who is not the owner installs from the release package, loads the baseline bundle, supplies their own area file and documents, runs one area query and one topic query, receives a dossier with citations and why-shown entirely offline, and states what it does and does not establish.
- Builds on: the local workbench, the runner and custody.
- Needs the owner: any Nation's private material stays with that Nation; the owner approves the outside user.

## Needs the owner

These are real outside actions or decisions. Nothing else on this plan waits for the owner.

- Future publication outside D-101, and each later Worker deployment.
- One sentence allowing the existing api.data.gov key for engine work.
- The eCFR terms, the Oregon terms and contact with Idaho.
- A license. The repository is public and has none.
- Any Nation's private or Nation-specific material.
- Recruiting the first outside user.
- Standing permission for future pull requests; D-101 covers this search release only.
- Confirming or changing decisions 1 to 8 in `STATUS.md`: the release definition, following and a refreshed public index, the key and terms, the Nation picker, the deferrals below, archiving the ledger, pull requests and license, and Tribal documents in federal results.

## Audit follow-through (2026-10-13)

The search work selected under D-098 is implemented and locally verified: plain
keywords, source-aware date refinement, continuation beyond the first page and
distinct failure outcomes. Congress and Washington remain bill-reference
lookups until a keyword interface is qualified. The D-099 repository
audit/fix/review loop closed six demonstrated defects in this change and
connected behavior; current verification is in [STATUS.md](STATUS.md).
Source gates and release acceptance criteria are unchanged. Detailed
session preparation stays outside the public repository.

The D-096 local review/fix/review loop covers the demo, local loading, cited
outputs and developer startup instructions. It does not establish release
acceptance. Verification results and remaining defects are in [STATUS.md](STATUS.md).
Prioritize these small development steps within the milestones above:

| Order | What a person gains | Existing code and acceptance check | Research or owner dependency |
| --- | --- | --- | --- |
| 1 | Reach results beyond the first ten from a searchable source. | Implemented and locally verified in `demo/main.tsx`, `demo/api.ts` and the Worker. Audit continuation, exact-ID merging, retained notes, failed-page retry and replacement searches before deployment. | Federal Register dated paging passed two live calls. GovInfo and Regulations.gov keyed live checks remain pending; Congress and Washington remain reference lookups. A compatible Worker must precede page publication. |
| 2 | Read one additional federal family with an exact document version. | Reuse the Worker transport, `src/demo/validation.ts` and the document/receipt model. Start with bills/public laws; one known item per route, exact official identity/version, clear metadata-only versus text-read status, and a receipt for every quoted passage. Distinct bill versions remain distinct. | Research originating-agency fields, versions, dates, reuse and failures first. Engine key use remains an owner decision; deployments need their own approval. |
| 3 | Use and share a cited report with assistive technology. | Test the existing semantic HTML print view and PDF from the same `buildDocument` output. Check keyboard navigation, headings, reading order, exact quotes, notes and provenance; no silent loss of unsupported characters. Choose standalone accessible HTML or tagged PDF only after this check identifies the actual need. | A real screen-reader user and PDF/print viewer checks remain necessary. The current PDF is untagged; Print view is the existing fallback, not a verified accessible-PDF substitute. |
| 4 | Return to a followed item and understand what changed. | Reuse report-state and lifecycle code after milestone 1 acceptance. A saved item must recover with its original identity and provenance, show source-supported change, and disclose unavailable refreshes. | Confirm following in the release and any refreshed public metadata index. Do not silently change session-only notes into persistent user storage. |

Focused primary research read during the audit: GovInfo's
[Search Service](https://www.govinfo.gov/features/search-service-overview)
documents `offsetMark` pagination and package/granule choices;
[Congressional Bills](https://www.govinfo.gov/help/bills) documents versioned
bill identifiers and available text formats. These are research inputs, not
source qualification or live-route acceptance. For output design,
[Section508.gov's PDF guidance](https://www.section508.gov/create/pdfs/)
prioritizes HTML where practical and separate testing of each format;
[W3C PDF techniques](https://www.w3.org/WAI/WCAG21/Techniques/)
describe tagging and reading-order methods. These inform the proposed checks
and do not establish this tool's accessibility conformance.

Metadata titles, abstracts and latest-action descriptions stay distinct from
exact quoted passages. Every quoted passage retains its locator and text
receipt; no output supplies legal meaning or inferred Nation relationships.

Developer environment follow-up: profile Vitest's environment/setup cost before
changing concurrency or test environments. The first integrated unit run during
this audit took 666.53 seconds, including 255.73 seconds attributed to environment
setup and 45.32 seconds to setup files. This single run is diagnostic evidence,
not a benchmark. Identify pure-module suites whose imports do not require browser
globals, then evaluate selective Node environments with the same assertions.
Require a repeatable timing improvement and a passing full check before adopting
the change; keep browser-dependent tests in their browser environment.

## Later

Deferred, not deleted. Each item stays on record and returns when a milestone needs it or the owner asks. The deferrals in the first six rows partly reverse rulings of 2026-09-22 (nationwide coverage), 2026-09-24 (the definition of done) and 2026-10-06 (D-086), so they take effect only when the owner confirms them.

- The 50-state source survey and nationwide coverage beyond the selected states. Nationwide coverage stays the owner's stated direction.
- The designation registry, the policy context schema and the area resolver. Place-aware search, which the owner raised on 2026-10-10 as "scan these relative to Crow Agency" (D-093), is parked here, not dropped.
- The sibling-app interchange (policy context in, citations out, for land-use-analyzer and plan-assessor) and demonstration A4.
- Demonstrations A2 (an operator prepares a state other than Washington) and A3 (a successor restores and replays the evidence package).
- Growth of the managed corpus toward 50 GB and measured public acquisition beyond what a milestone needs (D-086).
- Nation registry binding, unless the release has a Nation picker (decision 4).
- Native Hawaiian support, which stays a later-compatible direction.
- Optional AI summaries, which need their own approved build-time step.
- The carry-forward of nine old scenario claims and the release crosswalk (GD-31, the release acceptance crosswalk): they served a plan no longer followed and stay as record.
- The ledger items that belong to earlier plans (the 2026-10-10 assessment counted 81): archived with the ledger if the owner confirms decision 6.
- The frozen kernel and experimental code stays idle and untouched.
