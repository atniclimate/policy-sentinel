# Plan

This is the working plan, written as goals. It was adopted under D-095 and
revised on 2026-11-06 under D-153 to D-155, when the owner archived
`ROADMAP.yaml` and asked for a spine built around goals rather than strict
points. Each goal says what a Tribal staff member can do, why it matters, what
a session can run to show it is done, which owner gates remain and what is out
of scope. The owner confirmed the release definition (D-147) and the archiving
(D-153) on 2026-11-06. The parked goals at the end partly reverse rulings of
2026-09-22, 2026-09-24 and 2026-10-06, so they take effect when the owner
confirms them in the review of this rewrite. Until then nothing parked is
deleted and no earlier ruling is treated as revoked.

## The goal

A Tribal policy, natural resources or legal staff member opens one page,
searches official federal and state sources and public Tribal and intertribal
publications together, and sees for each result what it is, where it came from,
when it was retrieved and why it was shown. They can read the passages that
matter, keep notes, export a cited document, follow a rule, bill or docket,
and (on their own machine, offline) add their own documents. The full
statement and the safeguards are in [`AGENTS.md`](../AGENTS.md).

## How to read this plan

- A goal is done when its checks pass on the real service and the result is
  written in [`STATUS.md`](STATUS.md). Planning, scaffolding and an agent
  report are not completion.
- Every source is added one at a time, live call first. The trimmed response
  shape of that call becomes the test fixture. The full check runs once before
  anything is published.
- "Owner gates" name the real outside actions or decisions. The live list is
  "Open owner decisions" in [`STATUS.md`](STATUS.md). Every pull request,
  merge, publication and Worker deployment also needs an in-session command
  naming it (safeguard 6).
- `ROADMAP.yaml` is archived at
  [`archive/ROADMAP-2026-11-06.yaml`](archive/ROADMAP-2026-11-06.yaml); a
  comment-only pointer stays at the old path. Read the archive for a specific
  fact (a gate such as G-D, an item such as B8-ID-LEGISLATION), never as a
  start-up routine. The earlier plans and the operating model are retained
  record too. Engine parts built for those plans (the text extractor, the
  acquisition runner, custody, search) are pulled in when a goal needs them,
  not finished for their own sake.

## Where this stands: Full 0.9 (D-118)

The owner set the Full 0.9 scope on 2026-11-05: court case search, policy
chaining across treaties, laws, rules and decisions, Washington, Oregon and
Idaho law with monitoring, all sources live, context modes, best-fit search
with suggestions, local documents, and TERRA interoperability. It is Sentinel's
entry in the TERRA 0.9.x release candidate (mid-December 2026). The 0.9.1 demo
update is live. The reviewed design is
[`development/full09-design-2026-11-05.md`](development/full09-design-2026-11-05.md):
Tier 1 is a core release candidate built from keyless official sources and
existing hosts; Tier 2 additions land when their owner gate is answered (all
were answered by 2026-11-06); Tier 3 follows 0.9. The research behind it is in
[`source-reviews/full09-source-survey-2026-11-05.md`](source-reviews/full09-source-survey-2026-11-05.md).
Full 0.9 acceptance is the staff-task list in the design, section T1.7, walked
by the owner.

Acceptance correction under D-109 and D-110: selecting an NCAI draft resolution
must automatically load source-cited policy, legislation and case matches into
Results. Release 0.8.0 implemented this as seeded discovery (D-111); the owner
accepted the live flow on 2026-10-20 (D-112). Unavailable state or court
coverage stays explicit. This does not bypass source qualification or
establish legal relevance. Release B (0.9.0, D-112, D-113) added Federal
Register comment closing dates, topics, exact-identifier "Find related" and the
document-type filter, as the
[Release B source note](source-reviews/discovery-release-b-sources-2026-10-19.md)
sets out.

Before Full 0.9, D-102 set the sequence: verification of existing browser
workflows, demonstrated repairs and independent re-review, then documentation
and capability planning informed by staff workflows. The public demo,
synthetic local workbench and studies, and retained synthetic app have separate
evidence; current results and limits are in [`STATUS.md`](STATUS.md). Dedicated
interface polish and deeper accessibility evaluation follow broader
functionality; existing accessibility safeguards and functional keyboard and
focus checks remain.

## Goals

### 1. Published and true

- **Goal.** A staff member uses the rebuilt page at the public address and can
  trust what it shows.
- **Why it matters.** Everything else rests on a page that merges, cites and
  fails honestly.
- **Done means.**
  - A live search for a joint rule shows one merged row.
  - Current search, document, report and export workflows pass browser
    verification (`scripts/verify-demo-browser.mjs`), with the actual browser
    and engine coverage stated. Blocked and untested cases stay explicit.
  - Search keeps plain keywords, source-aware date refinement, continuation
    beyond the first page and distinct failure outcomes (D-098, D-102 browser
    evidence). Congress and Washington stay bill-reference lookups until a
    keyword interface is qualified.
  - Metadata titles, abstracts and latest-action descriptions stay distinct
    from exact quoted passages; every quoted passage keeps its locator and text
    receipt; no output supplies legal meaning or an inferred Nation
    relationship.
- **Owner gates.** Participation in later user and assistive-technology checks;
  each Worker deployment and runtime publication, by command.
- **Out of scope.** Dedicated assistive-technology evaluation (parked below).
- **Builds on.** `demo/` and `worker/`. D-101 published the reviewed search
  upgrade and audit repairs through pull request 10 (merge `981ecad`).
  Outside-user acceptance is goal 4.

### 2. Federal families

- **Goal.** A staff member finds public laws, bills and resolutions, budget
  documents, court opinions, rules and the laws and regulations they cite, and
  reads their text.
- **Why it matters.** Policy chains run through all of these; a gap in one
  breaks the chain.
- **Done means.**
  - One known item of each family is found with its official link.
  - Each route has had one bounded live call; its trimmed response shape is the
    test fixture.
  - Read an additional federal family with an exact document version: start
    with bills and public laws; distinct bill versions stay distinct; metadata
    only versus text read is stated; every quoted passage has a receipt.
  - Regulations.gov turns on (`REGULATIONS_V2_CONFIRMED`) only after the API
    terms page and User Notice are read verbatim into the source note and one
    bounded call per lane passes (D-138). The page shows the closing date as
    Regulations.gov's statement, the Eastern calendar day with the zone named,
    never a computed deadline; reports and exports carry the exact instant as
    given (D-139).
- **Owner gates.** One ask is open: the SAM.gov download is asked first, with
  file name and size (D-140). None other is open for keys or terms:
  build-time engine use of the api.data.gov key is allowed now, each source
  within its source note's terms, budget and retention, and the browser never
  holds it (D-156). Terms answered: OLRC (D-134), eCFR link-out (D-135),
  Office of the Federal Register keyless API (D-136), GovInfo policies wording
  (D-141), SAM.gov (D-140: small build-time table for named listings after
  the download is asked first; large batches defer N9). The D-123 move of keys to the program account still
  precedes the pre-release.
- **Out of scope.** Fetching eCFR's robots-disallowed versioner path; the
  Supreme Court RSS (dropped, D-137); the Unified Agenda output (Tier 3, after
  the reginfo terms are read); Congress and Washington keyword search.
- **Builds on.** The Worker handlers, the
  [federal access and reliability plan](development/gd57-federal-expansion-access-reliability-2026-10-09.md)
  and its [five probes](development/gd60-federal-probes-and-local-refresh-plan-2026-10-09.md).
  GovInfo's [Search Service](https://www.govinfo.gov/features/search-service-overview)
  documents `offsetMark` pagination and package and granule choices;
  [Congressional Bills](https://www.govinfo.gov/help/bills) documents versioned
  bill identifiers and text formats. These are research inputs, not source
  qualification. The Federal Register dated pages, GovInfo and Regulations.gov
  passed the bounded D-102 browser batch; the direct Congress page returned 403
  without retry.

### 3. Follow and see change

- **Goal.** A staff member follows a rule, bill or docket and sees what is new
  when they return.
- **Why it matters.** Policy work is watching, and no one has time to re-search
  everything.
- **Done means.**
  - A followed docket shows a new document after one appears. The list stays in
    the browser or in an exported file.
  - A saved item recovers with its original identity and provenance, shows
    source-supported change, and says when a refresh is unavailable instead of
    implying no change.
  - Session-only notes are never silently turned into persistent user storage.
- **Owner gates.** The owner's T1.7 acceptance walk of the 0.9.1 page. The
  refreshed public index question is closed (D-148): the D-125 static builder
  covers citation indexes and the browser-held list covers what is new. The
  follow outcome stays open until the walk passes.
- **Out of scope.** Any account, server-side follow list or telemetry.
- **Builds on.** `src/demo/report-state.ts` and the engine's lifecycle code. The
  browser-held list shipped in 0.10.0 (D-114, D-115).

### 4. First outside user: the 1.0 test

- **Goal.** A Tribal policy staff member who is not the owner completes a real
  task on the public tool unaided and states correctly what the result does and
  does not establish.
- **Why it matters.** It is the only proof that the tool works for the people
  it is for. The owner confirmed this definition on 2026-11-06 (D-147): the
  outside-user test plus ATNI ratification (D-120). The D-123 pre-release comes
  first.
- **Done means.**
  - The outside-user test passes, and the page says plainly what it does not
    cover.
  - Every source the page calls live has been checked against the real service.
  - The Nation picker works as browser-held context that never filters, ranks
    or claims a record-to-Nation link, and its sovereignty review has no open
    blocking finding (D-152).
  - G-BIA-IDENTITY is met only on the archive gate's terms: current
    originating BIA evidence gives an unambiguous row-level reconciliation of
    the notice's 577 displayed list-entry paragraphs to its stated 575
    entities, and that mapping passes two independent reviews. Arithmetic,
    TLD rows, grouping assumptions, aliases, geography or third-party contact
    cannot substitute for exact official evidence. A name count does not meet
    the gate: the exactly-575 name list and its hash file (D-144) do not
    satisfy G-BIA-IDENTITY. Separately, the retained federal-recognition
    collection must validate to exactly 575 before it is published (safeguard
    1). For the D-144 build step, a session fetches the current notice once
    (one Federal Register API fetch), builds the plain list in ephemeral
    scratch outside the repository, requires exactly 575 names, commits only
    the hash file and deletes the plain list; the list is never committed or
    logged. Until the hash file is committed the first phrase row cannot
    land.
  - Tribal documents printed in federal sources stay in and are flagged
    "issued by" the issuing body exactly as printed; the record stays
    `general_jurisdiction` unless an exact official field names the Nation; the
    name feeds no filter, ranking or why-shown, pinned by a test (D-151).
- **Owner gates.** The owner's T1.7 walk; recruiting the outside user and
  running the test; the 1.0 license set by ATNI (D-122 set the interim
  license); ATNI ratification; the NCAI reply (if NCAI says no, or there is no
  reply by 1.0, the intertribal snapshot stops being served and the page says
  its reuse terms were not confirmed, D-150). Any Nation's private or
  Nation-specific material. Code touching Nation identity or private context
  is reviewed for sovereignty before it is pushed; each push still needs the
  owner's command (D-146, safeguard 6). A Tribe's own public (T0) information is fair to
  use; nothing private, internal or restricted; seeing a name never
  establishes a record-to-Nation link.
- **Out of scope.** Treating federal recognition as organization membership;
  using the BIA Tribal Leaders Directory as the recognition authority; any
  legal-effect label.
- **Builds on.** Goals 1 to 3.

### 5. The region

- **Goal.** A staff member searches Washington by topic, then Oregon, Idaho and
  the four other states named in D-086 (Alaska, California, Montana, Nevada),
  and reads ATNI, NCAI and USET resolutions.
- **Why it matters.** The staff it serves work across state lines and cannot
  rely on federal sources alone.
- **Done means.**
  - Each state returns real results or says on the page why not.
  - A resolution names its issuer and implies no member Nation's position.
  - Idaho (G-D, O-007, B-002): a session finds a free non-profit legislative
    data source covering Idaho, writes its source note and gives the owner the
    registration link (D-157). The page keeps stating the gap until a bounded
    live call works. Official Idaho session pages publish no stable documented
    API, feed, schema, rate policy or bulk contract (B-002, O-007); HTML
    scraping is never disguised as an API, automation stays marked
    `blocked_source_contract`, and the gap shows in coverage. G-D is met only
    by read-only discovery and validation of a stable, permitted, official
    no-registration source. If contact is required, EXT-COST-CONTACT stays
    closed and the visible source gap is the accepted fallback (B-002: contact
    needs later verification and possibly owner-approved contact). The D-157
    route (a registered non-profit aggregator such as Open States) is not
    G-D: it is a third-party source under gate G-F, Tier 3, and needs its own
    source note and the owner's registration. Safeguard 5 prefers the
    originating source.
  - Supreme Court: the page states plainly that decisions after volume 586 are
    not in the demo, with a link to the Court's opinions page. GovInfo U.S.
    Reports stays the only Supreme Court source (D-137).
- **Owner gates.** Registering for the Idaho source's API (the owner does this
  from the link the session supplies); contact with Idaho only if the source
  needs it. The Oregon OLIS agreement was accepted under D-119.
- **Out of scope.** The 50-state survey (parked); an opaque scraper as a
  primary source.
- **Builds on.** The source catalog and the notes in `docs/source-reviews/`.

### 6. Own documents, offline

- **Goal.** A staff member installs the tool on their own machine, adds their
  own documents, and searches and exports with no network.
- **Why it matters.** A Nation that wants to use its own documents must be able
  to do so with that material never leaving it.
- **Done means.** Demonstration A1 as written in the
  [definition of done of 2026-09-24](decisions/2026-09-24-definition-of-done-general-development.md):
  a Tribal staff member who is not the owner installs from the release package,
  loads the baseline bundle, supplies their own area file and documents, runs
  one area query and one topic query, receives a dossier with citations and
  why-shown entirely offline, and states what it does and does not establish.
- **Owner gates.** Any Nation's private material stays with that Nation; the
  owner approves the outside user.
- **Out of scope.** Any public build touching private context, maps, parcel
  geometry or land content (safeguard 4).
- **Builds on.** The local workbench, the runner and custody.

### 7. Staff research tasks

The owner supplied two real research tasks on 2026-10-13. They scope product
work; they do not answer the funding or legal questions or activate another
source. Proposed slice, now after Full 0.9 (D-118): discover the relevant
water, forestry and Roadless Rule instruments and assemble a bounded
official-source consultation inventory before choosing a new adapter, and in
parallel define one FY27 funding program's evidence trail from appropriation
through award. These are research and acceptance specifications, not
authorization to acquire private material, add a public source or implement
legal-status labels.

- **Goal A.** A staff member finds which Tribes in Washington and Oregon were
  consulted on water and forestry policy (Roadless Rule focus), how, and what
  evidence was supplied. First discover and distinguish the relevant rules, then
  identify each exact statute, agency, docket and version. Do not assume every
  consultation record belongs to Section 106.
- **Goal B.** A staff member traces FY27 Tribal Community Resilience funding:
  source-stated award amounts and eligibility, executive actions and
  litigation, staffing changes, affected or restored programs, and 25 U.S.C.
  117c, domestic-content waivers, imported technology, tariffs and litigation
  authorities.
- **Why it matters.** They are the real questions behind the tool.
- **Done means.**
  - Goal A: a cited evidence table that separates invitation, response,
    meeting participation and agency disposition. Each named Nation has the
    exact official passage and URL. An invitation, location, search hit or
    missing record never establishes participation or absence of consultation.
    Restricted submissions stay outside the public tool.
  - Goal B: an explicit as-of date and separate evidence for requests, enacted
    appropriations, notices, selections, obligations and disbursements. Court
    orders carry date, scope, later orders and appeal status; staffing effects
    their own evidence; funding authority, waivers, import restrictions,
    tariffs and litigation authorities their own citations. One provision is
    never converted into a combined eligibility, exemption or litigation
    conclusion. The supplied 117c citation is a research target, not an
    accepted funding route.
  - The smallest useful acceptance tasks per capability are below.
- **Owner gates.** Oregon and Idaho terms and contact as in goal 5; any
  restricted or Nation-specific submission.
- **Out of scope.** Answering the funding or legal questions in the tool.

Capability assessment of 2026-10-13 (what existed then; later releases added
the browser-held follow list and the Washington bill lookups):

| Capability | Smallest useful acceptance task |
| --- | --- |
| Versioned federal text | Qualify one originating source and route, then compare two exact versions with independent citations and retrieval dates. Keep proposals, final instruments and later court orders distinct. Source, terms, credential and publication gates apply. |
| Follow and new since | Save one exact item, introduce a known new official version, refresh explicitly, show both versions and source-supported differences, then show an unavailable refresh without implying no change. |
| Washington topic discovery | Review a permitted topic interface, then find one known bill by topic and carry its exact version into a cited report. Needs source qualification first. |
| Oregon, Idaho and regional coverage | For the identified consultation rule, inventory official federal and state consultation records, then qualify one missing source at a time. Intertribal publications never imply every member Nation's position. |
| Local studies and offline use | Load an approved package with the network disabled, resume an exported study, produce a cited local output and correctly explain missing evidence. Public output keeps filtering Restricted material and source text whose reuse contract prohibits redistribution. |

## Parked goals

Deferred, not deleted. Each returns when its trigger fires or the owner asks.

- **Nationwide coverage.** The 50-state source survey and coverage beyond the
  selected states. Nationwide coverage stays the owner's stated direction.
  Trigger: the seven-state region (goal 5) is real, or the owner asks.
- **Place-aware search.** The designation registry, the policy context schema
  and the area resolver. The owner's "scan these relative to Crow Agency"
  (2026-10-10, D-093) is parked here, not dropped. Trigger: the owner asks, or
  demonstration A1 (goal 6) needs the area query.
- **Sibling-app interchange.** Policy context in, citations out, for
  land-use-analyzer and plan-assessor, and demonstration A4. Trigger: the
  interop profiles in the Full 0.9 design are accepted and the owner decides
  O-023.
- **Other demonstrations.** A2 (an operator prepares a state other than
  Washington) and A3 (a successor restores and replays the evidence package).
  Trigger: a second operator or an owner request.
- **Corpus growth.** Growth of the managed corpus toward 50 GB and measured
  public acquisition beyond what a goal needs (D-086). Trigger: a goal needs
  more than it holds.
- **Shared Nation registry.** The Nation picker (goal 4) is now in 1.0 and
  depends on the exact 575 collection. Binding the wider shared registry
  (`atni-nation-registry`, D-075) waits until that collection validates.
- **Native Hawaiian support.** A later-compatible direction. Trigger: the owner
  asks.
- **Optional AI summaries.** Need their own approved build-time step.
- **Accessible cited output.** Use and share a cited report with assistive
  technology. Trigger: broader functionality is done (D-102). Test the semantic
  HTML print view and the PDF from the same `buildDocument` output (headings,
  reading order, quotes, notes, provenance) and choose accessible HTML or
  tagged PDF from demonstrated need. A real screen-reader user and PDF and
  print viewer checks are needed. The PDF is untagged; Print view is the
  existing fallback, not a verified accessible PDF. Keyboard, focus and
  automated regression checks continue now; no silent loss of unsupported
  characters. Guidance read:
  [Section508.gov PDF guidance](https://www.section508.gov/create/pdfs/) and
  [W3C PDF techniques](https://www.w3.org/WAI/WCAG21/Techniques/) inform the
  checks; they establish no conformance.
- **Unified Agenda output.** Tier 3, after the reginfo terms are read.
- **Tribal publications as a source.** Tier 3, one publisher at a time
  (D-151). Official public Tribal-government publications are eligible; each
  needs its own source note.
- **Large SAM.gov batches.** N9 defers if the work needs a large batch (D-140).
- **Taxonomy proposal.** Independent of the phrase table. Trigger: the owner
  reviews the proposal.
- **Other Tier 3 items.** Treaty links beyond exact Statutes at Large start
  pages and the rest of section 6 of the Full 0.9 design.
- **Test speed.** Profile Vitest's environment and setup cost before changing
  concurrency or environments. One integrated unit run took 666.53 seconds,
  255.73 of them environment setup and 45.32 setup files; this is diagnostic,
  not a benchmark. Find pure-module suites that do not need browser globals and
  try selective Node environments with the same assertions. Adopt only with a
  repeatable timing gain and a passing full check; browser-dependent tests keep
  their browser environment.
- **Retained record.** The carry-forward of nine old scenario claims and the
  release crosswalk (GD-31): they served a plan no longer followed and stay as
  record. The ledger items that belonged to earlier plans (the 2026-10-10
  assessment counted 81) went to the archive with `ROADMAP.yaml` (D-153). The
  frozen kernel and experimental code stays idle and untouched.

## Owner gates, in one place

Real outside actions or decisions. Nothing else on this plan waits for the
owner. The live list is "Open owner decisions" in [`STATUS.md`](STATUS.md).

- Each push, pull request, merge, publication and Worker deployment, by an
  in-session command naming it (safeguard 6).
- The SAM.gov download, asked first with file name and size (D-140).
- The T1.7 acceptance walk, the outside-user test, the 1.0 license set by ATNI
  and ATNI ratification.
- The NCAI reply; the Idaho API registration; deleting the seven weekly
  Parallel monitors in Parallel's console, or a yes to one bounded delete
  command (D-149).
- Reviews that stay with the owner: flagged alias and plain-phrase rows (person
  names, treaty words, Nation-mask hits, judgment classes), D-142 and D-143.
- Any Nation's private or Nation-specific material.
- Confirming the parked goals above.
