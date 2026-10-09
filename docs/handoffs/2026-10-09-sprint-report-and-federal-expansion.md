# Policy Sentinel sprint report and federal expansion

Recorded 2026-10-09 for sprint closeout and the next development session.
Policy Sentinel has a working local research engine, a narrower public demo,
and demonstrated bounded real-data collections. The general-engine release
remains unfinished. This report preserves the delivered capability assessment;
the federal expansion below records the owner's subsequent direction D-091.

## Sprint checkpoint

The development branch `demo/live-pages` was pushed from `4ba852a` to
`7af7e7902dfcb105fafa77f1f7d5a976f4044db1`, including all 48 pending commits.
GitHub's branch reference matched that commit, and the tracked worktree was
clean. The separately published public demo on `main` was unchanged.

The last implementation commit, `cd069298b90d070828206a87e7262ae3fd5c64c1`,
fixed restricted study identifiers in public export filenames, prototype-named
search URL keys, and repeated serialization during study-history replay.
The 1,001-revision import measurement improved from 4.35 seconds to 1.90 seconds,
preserving saved bytes and integrity checks. All 2,219 unit tests, the other
`npm test` stages, synthetic build and artifact validation passed. Runtime,
types, lint, hooks, roadmap, backbone, knowledge and source-boundary checks
also passed. Repository-wide formatting still flags the pre-existing ignored
local settings file; the existing Windows file-symlink permission skip remains.
See the [audit repair record](2026-10-09-audit-repairs.md).

## Current capabilities

| Capability | Implemented behavior |
| --- | --- |
| Policy search | Exact identifiers, quoted phrases, ranked passages, broad matching and explicit all-terms matching. Filters include source, instrument, jurisdiction and historical-date scope. Supported context is distinguished from direct matches. |
| Persistent research studies | Questions, discoveries, selected passages, assertions, reviews, gaps and follow-up requests; explicit save/reopen, revision history and binding to an exact corpus version. Changed bindings require renewed evidence review. |
| Evidence inspection | Exact quotations with source, version and location provenance; version comparison; supporting and contrary evidence; explicit missing evidence and incomplete search coverage. |
| Procedural analysis | Historical and extended deadlines, proceeding relationships and attributed consultation events. Aggregate agency statements do not establish individual Nation participation. |
| Structured analysis | Environmental alternatives, units and baselines; evidence-backed authority relationships; common-origin copies distinguished from independent corroboration. Some capabilities have synthetic rather than real-pilot examples. |
| Research outputs | HTML dossier; evidence, timeline, authority and gap CSVs; graph and provenance JSON. Public exports filter restricted notes and dependent content according to source permissions. Explicit local study backups retain their own visibility boundary. |
| Acquisition and storage | Bounded acquisition, immutable captures, receipts, checksum verification, offline replay and explicit stale/unavailable handling. Storage accounting includes a 50 GB total managed footprint. This ceiling is not demonstrated full-scale capacity. |
| Public demo | Federal policy search, Washington original-bill lookup by number and biennium, selected passages, browser-local citations and notes, PDF export and printing. |

The engine works without AI calls. Source evidence, model-authored
interpretations and human review have distinct provenance. It does not infer
legal effect, rights, eligibility or Nation relationships from keywords or
geography. See [the implemented architecture](../architecture.md) and
[the public demo status](../DEMO-STATUS.md).

## Sources and retained data

| Source or collection | Data types and demonstrated access | Current limits |
| --- | --- | --- |
| Federal Register and GovInfo direct documents | Rules, proposed rules, notices, executive orders and procedural dates in the demo and bounded local acquisitions. | Direct-document retrieval does not complete the general-engine API integrations. |
| Washington Legislature | Selected bill versions and session laws in the local corpus; original-bill lookup in the demo. | General legislative population discovery remains unfinished. |
| Historical local discovery corpus | 210 works, 215 versions and 21,209 evidence segments: seven federal instruments, seven selected Washington works and 196 additional Washington 2025 session-law works. | Selected population, documented extraction omissions and incomplete dates; no comprehensive regional coverage. |
| Recent roadless pilot | Three federal instruments: original rule, later proposal and deadline extension. Three captured documents, 18 selected passages, a persistent study and seven products. | Six model-authored assertions lack human review, and nine research gaps remain open. |
| Federal APIs | Federal Register, GovInfo, eCFR, Congress.gov and Regulations.gov are planned integration families. | General-engine end-to-end integration remains incomplete; several have unresolved credential, access or terms conditions. |
| State, local and judicial sources | Catalog candidates include legislation, statutes, administrative rules, opinions and local-government instruments. | Most have no implemented retrieval capability or activation. |
| Tribal and intertribal publications | Official public Tribal-government publications are eligible for review; ATNI, NCAI, USET and USET SPF resolutions are identified for qualification. | No broadly populated operational collection is established. Issuing organizations and individual Nations must retain distinct attribution. |

The source catalog has 46 entries: three retained direct-document profiles and
43 discovery entries. These are not 46 active feeds. Do not add the historical
and recent collections into a deduplicated total without checking overlap.
The roadless pilot contains no human review decisions, individual Nation
participants, intertribal positions, environmental metric tuples, authority
relationships or common-origin groups, although the engine can represent those
evidence types.

Sources: [historical corpus outcome](ps09-real-policy-discovery-outcome.md),
[roadless pilot](../development/2026-10-08-roadless-real-source-pilot.md),
[source catalog](../../config/source-catalog.v1.mjs).

## Geographic coverage

- Demonstrated holdings comprise selected United States federal material and
  Washington records, without comprehensive federal or statewide coverage.
- Selected regional expansion covers Washington, Oregon, Idaho, Alaska,
  California, Montana and Nevada. Catalog entries retain qualification gaps.
- Successor contracts provide nationwide jurisdiction representation. A
  populated, qualified nationwide collection remains unfinished.
- There is no comprehensive all-Nation corpus, completed production
  Nation-registry binding or established exact ATNI membership coverage.
- The public demo exposes federal and Washington access. Oregon and Idaho
  remain unavailable in that surface.

The implemented recognition transcription remains evidence-blocked and emits
no production Nation registry. Federal recognition is not ATNI membership;
the retained 575-count validation rule does not establish either a complete
operational registry or a universal engine invariant. See
[the data contract](../data-contract.md).

## Remaining planned work

At the reported checkpoint the general-development ledger contains 31 complete
items and 26 remaining: six ready, seven blocked and thirteen not started.
These counts include different-sized tasks and are not a percentage of product
completion. The remaining work includes:

| Area | Remaining work |
| --- | --- |
| Federal document expansion | The explicit next-session priority below: public laws, congressional bills and resolutions, proposed budgets and federal court rulings, including access, APIs and reliability. |
| Source qualification and integration | Complete the nationwide survey, qualify seven-state interfaces, and implement federal and selected regional API integrations. |
| Broader real-data pilot | Qualify, acquire and independently accept federal, regional and intertribal material; expand measured custody to Washington and at least two other selected states. |
| Classification and identity | Designation registry, production Nation-registry binding, and exact official-label mappings for every activated state. |
| Private local inputs | User-supplied source class, private custody workflow, area resolver and PolicyContext validation. |
| Interoperability | Pure context/citation exchange adapter, authorized ATNI profile and peer conformance demonstration. |
| Research completeness | Missing roadless evidence and human review: later actions, actual environmental analyses, consultation evidence, intertribal positions and governing relationships. |
| Workflow regression coverage | A reusable committed browser journey through import, review, refined search, follow-up, exports and reopen. |
| Release acceptance | Installable offline candidate; independent second-machine, source-operator, restore/replay and peer demonstrations; retained identity/scenario acceptance. |

Recording D-091 adds ready planning item GD-57, bringing the current count to
31 complete and 27 remaining (seven ready, seven blocked, thirteen not started).
The [roadmap](../../ROADMAP.yaml) owns current status. The general-engine
release package GD-27 remains blocked. The designation registry was the next
independent ready item before D-091; the owner's federal-session priority now
controls session startup without completing or canceling that item.

## Federal expansion for the next session

The owner explicitly directed the next session to focus on federal document
expansion, data access abilities, APIs and source reliability. Include the four
document families below alongside the existing federal regulatory material.
The named routes are candidates to assess, not newly qualified sources or
claims of currently available API collections.

| Required family | Candidate originating routes to assess | Evidence and distinctions to preserve |
| --- | --- | --- |
| Public laws | GovInfo law and Statutes at Large routes; Congress.gov enactment relationships. | Public-law number, Congress, enactment date, source rendition, citations and links to originating bills. Preserve slip-law versus compiled/statutory versions; a retrieved enactment is not a determination of current law. |
| Congressional bills and resolutions | Congress.gov and GovInfo bill/resolution metadata and text routes. | Chamber, Congress, instrument type/number, introduced and subsequent text versions, actions, dates, related measures and official status. Distinguish simple, concurrent and joint resolutions; do not treat every resolution or passed chamber action as an enacted law. |
| Proposed budgets | Official OMB/White House budget publications, agency budget justifications and GovInfo where supported; congressional budget resolutions through their originating legislative routes. | Fiscal year, proposing body, release/revision, request or proposal status, document/table locator, amounts, units and accounting basis. Distinguish executive requests, agency justifications, congressional budget resolutions, appropriations and enacted funding. Record machine-readable tables separately from PDF-only evidence. |
| Federal court rulings | Official Supreme Court and lower-federal-court publications; GovInfo USCOURTS where qualified; other official court access routes only after their actual conditions are assessed. | Issuing court, docket/case identifier, citation, decision date, opinion/order type, version and corrections, publication status and exact text locator. Record participating-court/date gaps; distinguish rulings from docket entries and summaries. Preserve redaction and privacy boundaries. |

Assess each document family and collection separately for:

1. **Access capability:** topical/full-text/metadata/identifier search,
   enumeration, pagination, date coverage, collections, rendition formats,
   downloads, structured tables, update/change signals and exact citation
   replay. Record documented, implemented, tested and unavailable capabilities
   separately. A successful document URL is not a working population API.
2. **Access conditions:** current originating documentation, authentication,
   registration, quotas/rate limits, allowed automation, use/reproduction and
   attribution terms, privacy projection, and route-specific blockers. Reuse
   existing credentials only within their actual authorization; no credentials
   or provider payloads belong in Git or reports.
3. **Reliability:** finite observed requests and outcomes, response validation,
   latency/timeouts, rate-limit behavior, bounded retries where authorized,
   duplicates, pagination loops, truncation, missing fields, mutable versions,
   corrupt or missing renditions, identifier stability and upstream outages.
   Separate live observations from synthetic failure tests. A short probe is
   not an uptime guarantee.
4. **Recovery and cost:** checksum-bound same-source last-known-good output,
   stale/unavailable labeling, resumable accounting without repeating spent
   operations, and measured request/byte/storage/extraction budgets within the
   existing total managed footprint.

The next-session deliverable is a collection-level access and reliability
matrix for all four families, with evidence URLs and dates, actual capability
states, gaps, proposed integration order, reusable code paths and a finite
implementation/validation packet. Reconcile it with GD-33, GD-39 through GD-43,
the direct federal-court profile and GD-27 release obligations. Represent any
additional budget or court work explicitly before implementation; do not force
all federal work into the Federal Register task or mark GovInfo integration
complete from a direct-document probe.

This recording session acquires no documents and opens no new credential,
terms, paid, private-data, contact, notification or deployment operation. The
adopted public-acquisition direction remains in force; current source
qualification, exact finite operations and measured capacity precede dispatch.
Historical source runs and spent operation manifests do not resume.

## Next session startup

Read the [continuation prompt](../continuation-prompt.md), its full required
context, this report and D-091 in the [decision register](../decision-register.md).
Verify branch/HEAD and preserve owner work. Select ready GD-57 and start with the federal expansion
access and reliability matrix, then reconcile the authorized implementation
sequence in the ledger. Do not automatically start unrelated designation or
regional work ahead of this owner-selected focus. No work item is active at
this documentation checkpoint; existing implementation statuses remain intact.

The report reflects repository evidence, retained acquisition receipts and the
verified branch push. It does not establish fresh provider availability,
nationwide completeness, large real-corpus performance or release acceptance.
