# Plan

Status of this plan: it is the agent's proposal, adopted as the working plan under D-095 (the owner's direction of 2026-10-10 on demo follow-ups and planning). The items in the owner-decision list in [`STATUS.md`](STATUS.md) (the release definition, the scope deferrals that partly reverse rulings of 2026-09-22, 2026-09-24 and 2026-10-06, and archiving the ledger) take effect as written only when the owner confirms them. Until then nothing deferred is deleted and no earlier ruling is treated as revoked.

## The goal

A Tribal policy, natural resources or legal staff member opens one page, searches official federal and state sources and public Tribal and intertribal publications together, and sees for each result what it is, where it came from, when it was retrieved and why it was shown. They can read the passages that matter, keep notes, export a cited document, follow a rule, bill or docket, and (on their own machine, offline) add their own documents. The full statement and the safeguards are in [`AGENTS.md`](../AGENTS.md).

## What this plan replaces

`ROADMAP.yaml` and its validators, the earlier plans and the operating model are retained record. They stay unchanged, are still validated mechanically, and are not the working plan. Engine parts built for those plans (the text extractor, the acquisition runner, custody, search) are pulled in when a milestone needs them, not finished for their own sake.

## Milestones

Immediate acceptance correction under D-109: selecting an NCAI draft resolution
must automatically load source-cited policy and case matches into Results. The
published panel, optional search buttons and state/court directories do not meet
that requirement. The local repair (2026-10-19, unpublished) loads the draft's
first policy search; case matches are not yet loaded automatically. Then inspect the deployed unlocked selection-to-Results
workflow and the reported missing state-policy/judiciary experience; then fix
the demonstrated gaps. Verify selection, replacement of prior-draft results,
source identity, why-shown context and distinct empty/unavailable outcomes.
Unavailable state or court coverage must remain explicit. This requirement
does not bypass source qualification or establish legal relevance.

Each milestone is done when its checks pass on the real service and the result is written in `STATUS.md`. Every source is added one at a time, live call first, and the trimmed response shape of that call becomes the test fixture. The full check runs once before anything is published.

D-102 sets the immediate sequence: verification of existing browser workflows, demonstrated repairs and independent re-review, then documentation and capability planning informed by staff workflows. The public demo, synthetic local workbench/studies and retained synthetic app have separate evidence; current results and remaining limits are in [STATUS.md](STATUS.md). The owner has supplied consultation and climate-funding research tasks, assessed below. Dedicated interface polish and deeper accessibility evaluation follow broader functionality; existing accessibility safeguards and functional keyboard/focus checks remain. This changes work order, not source gates or the unresolved release definition.

### 1. Published and true

- A person can: use the rebuilt page at the public address.
- Checks: a live search for a joint rule shows one merged row; current search, document, report and export workflows pass browser verification, with actual browser/engine coverage stated. Blocked and untested cases stay explicit. Dedicated assistive-technology evaluation remains scheduled after broader functionality under D-102.
- Builds on: `demo/` and `worker/`. D-101 published the reviewed search upgrade and audit repairs through pull request 10, merge `981ecad`; D-102 has now exercised dated pagination and focus against the live service. Outside-user acceptance remains outstanding.
- Needs the owner: participation in later user/assistive-technology checks; each later Worker deployment and runtime publication needs separate authorization.

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

- Future publication outside D-103, and each later Worker deployment.
- One sentence allowing the existing api.data.gov key for engine work.
- The eCFR terms, the Oregon terms and contact with Idaho.
- A license. The repository is public and has none.
- Any Nation's private or Nation-specific material.
- Recruiting the first outside user.
- Standing permission for future pull requests; D-103 covers this reviewed publication only.
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
| 1 | Reliably use the published search, report and local study workflows. | D-102 browser evidence covers current merging, notes, replacement searches, controlled failures, exports and study filtering. The maintained runner now derives separate policy and source counts from the response; dated append/focus checks passed live. Keep the surface and engine limits in STATUS explicit. | Federal Register, GovInfo and Regulations.gov dated pages one/two passed the bounded D-102 browser batch. Congress and Washington remain reference lookups. The direct Congress page returned 403 without retry. New local Worker repairs would need their own live evidence. |
| 2 | Read one additional federal family with an exact document version. | Reuse the Worker transport, `src/demo/validation.ts` and the document/receipt model. Start with bills/public laws; one known item per route, exact official identity/version, clear metadata-only versus text-read status, and a receipt for every quoted passage. Distinct bill versions remain distinct. | Research originating-agency fields, versions, dates, reuse and failures first. Engine key use remains an owner decision; deployments need their own approval. |
| 3 | Return to a followed item and understand what changed. | Reuse report-state and lifecycle code after functional browser closure and capability assessment. A saved item must recover with its original identity and provenance, show source-supported change, and disclose unavailable refreshes. This capability is not implemented by session report restoration. | Confirm following in the release and any refreshed public metadata index. Do not silently change session-only notes into persistent user storage. |
| 4, later | Use and share a cited report with assistive technology. | After broader functionality, run the dedicated interface/accessibility pass under D-102. Test semantic HTML print view and PDF from the same `buildDocument` output, including headings, reading order, quotes, notes and provenance. Choose accessible HTML or tagged PDF from demonstrated need. Existing keyboard/focus and automated regression checks continue now; no silent loss of unsupported characters. | A real screen-reader user and PDF/print viewer checks remain necessary. The PDF is untagged; Print view is the existing fallback, not a verified accessible-PDF substitute. |

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

## Staff workflow capability assessment (2026-10-13)

The owner supplied two real research tasks. This assessment scopes product work;
it does not answer the funding or legal questions or activate another source.

The first asks which Tribes in Washington and Oregon were consulted, how
consultation occurred and what evidence was supplied. The owner clarified that
the staff member needs discovery and deeper understanding of water and forestry
policy, with a Roadless Rule focus; the initial question referred to Section 106.
First discover and distinguish the relevant rules, then identify each exact
statute, agency, docket and version. Do not assume that every consultation record
belongs to Section 106 or treat that section number as an identified rule.
The acceptance task is a cited evidence table
that separates invitation, response, meeting participation and agency disposition.
Each named Nation needs the exact official passage and URL. An invitation,
geographic location, search hit or missing record cannot establish participation
or absence of consultation. Restricted submissions stay outside the public tool.

The second asks about FY27 Tribal Community Resilience funding, source-stated
award amounts and eligibility, executive actions and litigation, staffing changes,
and affected or restored climate/environmental programs. It also asks about
25 U.S.C. § 117c, domestic-content waivers, imported technology, tariffs and
litigation authorities. A useful result needs an explicit as-of date and separate
evidence for requests, enacted appropriations, notices, selections, obligations
and disbursements. Court orders need their date, scope, later orders and appeal
status; staffing effects need their own evidence. Funding authority, procurement
waivers, import restrictions, tariffs and possible litigation authorities require
separate citations. One provision must not be converted into a combined eligibility,
exemption or litigation conclusion. The supplied § 117c citation identifies a
research target, not an accepted funding route.

| Capability | What exists and what remains | Smallest useful acceptance task |
| --- | --- | --- |
| Versioned federal text | The demo has source-aware search, document identity, text receipts, selected passages and report exports. Complete funding, statute, executive-action and court-order coverage is missing; a metadata hit is not a verified text version. | Qualify one originating source and route, then compare two exact versions with independent citations and retrieval dates. Keep proposals, final instruments and subsequent court orders distinct. Existing source, terms, credential and publication gates apply. |
| Follow and new since | Session report restoration and engine lifecycle components exist. The public demo has no implemented followed-item refresh or change feed. | Save one exact item, introduce a known new official version, refresh explicitly, show both versions and source-supported differences, then show an unavailable refresh without implying no change. The release/index decisions remain open. |
| Washington topic discovery | `worker/src/index.ts` supports bill/biennium reference lookup and introduced-text reading. The official topic-search link is external; its results are not integrated. | Review a permitted topic interface, then find one known bill by topic and carry its exact version into a cited report. This needs source qualification before implementation. |
| Oregon, Idaho and regional coverage | Oregon and Idaho are explicit integration gaps. Federal records may discuss regional matters but do not establish complete regional or Nation coverage. | For the identified consultation rule, inventory official federal and state consultation records, then qualify one missing source at a time. Oregon terms and Idaho contact remain owner decisions; intertribal publications never imply every member Nation's position. |
| Local studies and offline use | `PolicyWorkbench` and `StudyWorkspace` support checksummed local evidence, analyst-authored procedural/consultation records, review, saved-study import and seven study products. Synthetic browser checks exercise them. Turnkey offline installation and a staff member's disconnected task remain unverified. | Load an approved package with the network disabled, resume an exported study, produce a cited local output and correctly explain missing evidence. Public output must continue filtering Restricted material and source text whose reuse contract prohibits redistribution. |

Next proposed slice: discover the relevant water, forestry and Roadless Rule
instruments and assemble a bounded official-source consultation inventory before
choosing a new adapter. In parallel,
define one FY27 funding program's evidence trail from appropriation through award.
These are research and acceptance specifications, not authorization to acquire
private material, add a public source or implement legal-status labels.

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
