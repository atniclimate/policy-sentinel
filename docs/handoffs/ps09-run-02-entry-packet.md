# PS09 Run 2 entry packet: identity, authority and candidate scenarios

Status: proposed bounded entry packet, prepared 2026-09-04 for owner review.
`G-PS09-RUN-02` remains closed. Preparing this packet implements no Run 2
capability and changes no source or release gate.

## Decision requested

Approve the local contract and candidate-manifest scope below under
`POLICY-SENTINEL-0.9-RUN-02-PNW-IDENTITY-AUTHORITY-AND-SCENARIO-MANIFESTS`.
That approval would permit the listed local edits, synthetic tests, independent
review and local commits. It would not authorize source requests or real
identity population. No particular approval phrase is required, but the owner
must approve this packet's bounded scope.

The owner's instruction, "Let's continue to the next step," supports preparing
this reviewable packet. The accepted [Run 1 handoff](ps09-run-01-convergence.md)
requires an exact entry packet before implementation. The [corpus ADR](../adr/ps09-canonical-corpus.md),
[PNW acceptance contract](../pnw-scope-and-acceptance.md) and decisions D-063
through D-065 in the [decision register](../decision-register.md) control over
broader historical planning prose.

This proposal deliberately exposes a remaining dependency: local synthetic
contracts can establish evidence handling and candidate scenarios, but cannot
resolve unsupported official identities. Full `PS09-02` completion still needs
its required identity and scenario evidence. That evidence needs a separate,
exactly bounded authorization where it is not already accepted in local custody.
This packet neither supplies that authorization nor moves a source operation
from a later run into Run 2.

## Starting checkpoint and immutable inputs

Preparation started on `main` at
`92ac09f6608cb544648fd0ecd2f16d91647a1fad`, the closeout directly following
implementation `b5dcda3df41f389b5b302709c2675b994d20c6c8` and its parent
`0ff44349c37b60006ee34475319a86ec5a87e9e0`. The tracked worktree and index were
clean; 33 protected inputs were untracked. One worktree and no remote were
present. Run 1 is complete; `PS09-02-IDENTITY-AUTHORITY-SCENARIOS` is blocked;
`PS09-06-LOCAL-RC` remains the sole local release root.

The [Run 1 custody manifest](../development/ps09-run-01-custody.json) identifies
all 33 protected inputs and the 43 immutable historical provider-evidence files.
Its exact preparation identity is 21,724 bytes, SHA-256
`c440a663dc0678cb5619541adb49599a77b69b2e31bda62ab8d27ae921db8221`.
All 76 protected file lengths and hashes matched before packet drafting.
The starting roadmap SHA-256 is
`790267537636315e3980d189c6ccf9611ba949fa8bc94d5da6c1aea0b43a41da`;
the package-lock SHA-256 is
`9629185a1e801b5ddb1c3422fc819eb1552b97ab7663cfa5984dae114192646f`.
Tracked contract inputs are pinned to the starting commit; startup must
reconcile any intervening owner changes rather than overwrite them.

The following custody entries supply planning direction. Their names carry
2026-09-05, later than this preparation date; neither those dates nor their
reported source observations establish current originating facts.

| Input under `docs/` | Bytes | SHA-256 | Planning use |
| --- | --- | --- | --- |
| `Policy-Sentinel-0.9-Long-Run-Session-Briefs-2026-09-05.md` | 32,480 | `1ad9c0da7f7289e856d62fa91b154a6e584691c06d9ce18dd939df8e13a3b2ca` | Run 2 contract and negative-test candidates |
| `Policy-Sentinel-0.9-Program-Plan-2026-09-05.md` | 25,014 | `b6d12527a0550e35b5b5315c15251f58a701ae69e911bc33b517309f35958a9b` | Sections 1, 3.1 and 12: scope and cohort seeds |
| `Policy-Sentinel-PNW-Research-and-Test-Case-Catalog-2026-09-05.md` | 36,384 | `82c45788e51be6e127796fd6f2d0a2d48895b7f234e2ff3faf9ffc244979e152` | Sections 2-8 and 10-12: six graphs, sentinels and integrity cases |
| `Policy-Sentinel-Adversarial-Review-and-Decision-Log-2026-09-05.md` | 17,405 | `c8ced347228ea732ec2986214dd6e15d164a083afc14cb486daac1444b8d1358` | D-0.9-011: retained cohort decisions |
| `Policy-Sentinel-Fresh-Codex-Onboarding-and-Run-1-Kickoff-2026-09-05.md` | 17,373 | `54f320051ae392a8e52f491d484251aa46824afec7cb51635530f5053386d797` | Section 2: scope correction; Run 1 authority only |

Other protected inputs remain governed by the same custody manifest. The
duplicate adversarial log ending ` (1).md` is preserved; its earlier open
Duwamish/Nevada questions do not reopen the later recorded decisions. The
selected-record CSV remains untracked synthetic output with unproven producer
identity and is excluded from acceptance fixtures. No owner-input file is a
runtime dependency or a source of official identity assertions.

## Bounded cohort and assertion scope

The proposed candidate universe comprises the six graphs and three sentinels
below across Washington, Oregon, Idaho, northern California, southeast Alaska
and selected Montana contexts. It also preserves separate owner-selected Crow,
Fort Peck and Fort Belknap identity-context slots. These are planning labels;
they are not accepted official names, verified membership, deployment authority
or source-record associations. No closed named Nation list was supplied, and
this packet does not invent one.

Duwamish remains excluded from the initial product cohort without a recognition,
membership, historical or legal conclusion. Nevada is not automatically added
from directory appearance. The Nez Perce scenario remains a candidate without
a required engine branch. Nationwide and Native Hawaiian compatibility permits
empty vocabulary/extension boundaries only, with no fabricated entities or
status. Canadian expansion remains outside this scope.

The contract must keep stable project entity identity, source-attested names
and aliases, recognition, organization membership, owner cohort inclusion,
record association, consultation-list inclusion, treaty/instrument relation,
administrative office, geographic concept and deployment authority distinct.
Crow government, reservation concept and BIA agency cannot share one identity.
Fort Peck and Fort Belknap cannot merge through shared terminology. ATNI, NCAI,
Nation, originating agency, analyst and owner configuration have different
assertion authority; organization statements do not become member positions.

Every assertion must identify its subject, relation, object, authority system,
evidence reference, evidence/retrieval dates, as-of time, source update time
when supplied, review state, visibility and allowed use. Unknown dates remain
explicitly unknown. Recognition and membership assertions require stable
assertion/version identities, authority-system and jurisdiction namespaces,
and temporal validity distinct from retrieval and as-of dates. Candidate labels
cannot enter fields reserved for accepted official identities. `unknown`,
`unavailable`, `outside_coverage`,
`not_observed`, `not_assessed`, `disputed` and `rejected` must remain distinct;
none means false or current by default. These are proposed contract values,
not new roadmap statuses.

A Nation-specific record association requires exact evidence in the official
record itself and its official URL, bound to the accepted entity and exact
official name or separately evidenced accepted alias. Recognition or membership
evidence cannot substitute for that record evidence. County eligibility requires
the official county record's explicit Nation mention; an agenda item alone
cannot establish final or executed status. Synthetic fixtures must test the
equivalent exact reference/authority bindings without introducing real claims.

Accepted assertions in the proposed local scope are limited to the existing
owner scope decisions and declared synthetic test facts. Real recognition,
membership, treaty, consultation, signatory, status, geographic and legal
assertions remain unaccepted unless separately evidenced and authorized.
Source-stated counts and enumerated structures remain separate. The planning
brief's 57/59 and 575/577 pairs may motivate explicitly synthetic discrepancy
tests; they are not verified public counts. The retained application's
575-row synthetic/recognition compatibility boundary stays unchanged and does
not become a universal engine or cohort invariant.

## Six candidate graphs and three sentinels

The IDs below are proposed planning identifiers. All real document candidates
have `owner_plan_only` evidence status, unknown accepted identity/version and
unknown current source state. Candidate titles, identifiers and source families
come from the custody-bound catalog sections cited above. They are discovery
requirements, not validated hits, approved URLs or an acquisition allowlist.

| ID | Candidate scope and document identifiers to preserve | Expected distinctions and required negative cases |
| --- | --- | --- |
| `PS09-SC-A` | Nooksack-Sumas/Whatcom flood and water governance: county adopted plan and update, transboundary framework, technical report, WRIA 1 case `24-2-80000-37`, Nation-origin code/statements, disaster notice and treaty context | County/state/Nation/transboundary speakers stay separate. Adopted plan, draft update and project design differ. Filename is not execution evidence; participation is not consent; treaty context does not prove applicability. City materials remain future candidates outside the retained beta output. |
| `PS09-SC-B` | Washington clean-energy siting and consultation: RCW 80.50, SHB 2496, E2SHB 1216, EFSEC policy/WAC, programmatic EIS families, Horse Heaven candidate docket and court matter `104877-7` | Statute, session law, rule, policy, project EIS, agency decision, party filing and court opinion differ. Preserve the catalog's reported `EF-210011`/`EF-220011` inconsistency and the separate petition-filename spelling `ED-210011`; do not alias them automatically. Consultation or certification does not prove consent, construction or operation. |
| `PS09-SC-C` | Oregon data centers/large loads/PGE-PUC/Hillsboro: HB 3546, UE 430, UM 2377 and its order chain, inter-Tribal testimony, HB 2021, HB 4084, local case `CDCA-004-26` | Filing, testimony, tariff, order, reconsideration and local action retain independent dates/status. No future filing text is invented. Inter-Tribal testimony is not a member-Nation position. Oregon access/terms gaps and municipal-output exclusions remain explicit. |
| `PS09-SC-D` | Roadless/Idaho exception/Tongass/Section 106: candidate FR document `2026-16965`, docket `FS-2025-0001`, earlier rule and court instruments, ACHP process material and Lava Ridge status chain | Proposal, final rule, codification and exception differ. Applicant contact is not government consultation. Termination of a consultation route is not project denial or consent. No sensitive-site or land data enters the test or output. |
| `PS09-SC-E` | Montana-Idaho-Washington transmission/storage: BPA project and planning material, DOE study, Avista UE-230793 and AVU-E-24-13, candidate Order 36826 and CX-032662 | Study, proposal, application, acknowledgment, approval, construction and operation differ. Completed plan is not closed proceeding. Interstate is not international. Utility claims do not become agency findings or rights. |
| `PS09-SC-F` | Cascade Renewable Transmission: separate USACE EIS/scoping, Oregon energy and Washington EFSEC project candidates | Same-project identity requires evidence across separate proceedings. Preliminary application/EIS does not prove permits or approval. Its suggested match to the owner's river-powerline example remains an unconfirmed research inference; approving candidate inclusion does not confirm that match. |
| `PS09-GS-KLAMATH` | Northern California/Oregon Klamath: DOI MOU, FERC `P-14803-001`/`P-2082-063`, EIS, surrender, completion/restoration and first-party statements | Parties, signatures, agreement, order, physical completion and ongoing work differ. MOU is not statute or basin-wide consent. |
| `PS09-GS-MONTANA` | Western Montana preferred CSKT compact sentinel: DNRC summary, Water Court `WC-0001-C-2021`, federal instrument and first-party material | A dated summary cannot override a later instrument; actual chronology remains unknown until verified. Exclude service-list personal data and general rights/jurisdiction conclusions. Crow/Fort Peck/Fort Belknap remain additional distinct context slots. |
| `PS09-GS-ALASKA` | Southeast Alaska Tongass/entity sentinel: earlier and proposed rule instruments, court context and separate Tribe/corporation/consortium/service-region concepts | Executive direction/proposal is not a final amendment. ANCSA corporation is not Tribal government. Demographic labels do not establish citizenship/status. No universal lower-48 reservation/treaty assumption or legal geography conclusion. |

The six graphs collectively cover the required contrasting strata: A supplies
coastal treaty/fisheries/habitat questions; A/E/F inland or transboundary
resources; C/F the Oregon context; E and the Montana sentinel selected Montana;
the Klamath sentinel northern California; D and the Alaska sentinel southeast
Alaska. C's general-jurisdiction regulatory sequence and the Alaska entity
distinctions test authority structures without assuming a treaty predicate.
This is a planned test mapping, not coverage evidence. Scenario G, Oregon
wildfire, remains a lower-priority optional candidate and does not become a
seventh mandatory graph.

For each row, the later local manifest must enumerate candidate document slots,
speaker/issuer and proceeding/version distinctions, expected relations,
must-not-hit/merge assertions, date/status transitions, citation requirements,
coverage gaps, reuse/visibility and refresh expectations. Store facts once and
reference them; manifest projections cannot supply a second corpus, health or
lifecycle store. Missing candidate identifiers remain explicit gaps rather
than invented identifiers. Real exact-byte citation checks remain pending
until accepted originating objects exist; synthetic references must resolve
exactly within their synthetic trust domain.

## Proposed implementation paths and responsibility

The current preparation lease is only this packet and the `PS09-02` evidence
and next-action text in `ROADMAP.yaml`. All work-item statuses and gates remain
unchanged. The following paths are proposed for the later approved local scope;
listing them grants no present write lease. No paths outside this list may be
added silently.

| Responsibility | Proposed exact paths |
| --- | --- |
| Lead: authority, ledger and recovery prose | `AGENTS.md`, `ROADMAP.yaml`, `docs/PROJECT-BACKBONE.md`, `docs/project-brief.md`, `docs/pnw-scope-and-acceptance.md`, `docs/decision-register.md`, `docs/continuation-prompt.md`, `docs/handoffs/ps09-run-02-entry-packet.md` |
| Lead: versioned interface and canonical integration | `schemas/identity-authority-scenarios.schema.v1.json`, `src/engine/identity-authority-scenarios-contracts.ts`, `src/engine/index.ts`, `scripts/validate-foundation.mjs`, `docs/data-contract.md`, `docs/architecture.md` |
| Bounded runtime worker after interface freeze | `src/engine/identity-authority-scenarios.ts` |
| Bounded synthetic fixture/test worker after interface freeze | `fixtures/engine/identity-authority-scenarios.synthetic.valid.json`, `fixtures/engine/identity-authority-scenarios-malformed.invalid.json`, `tests/engine/identity-authority-scenarios-schema.test.ts`, `tests/engine/identity-authority-scenarios.test.ts`, `tests/engine/identity-authority-scenarios-non-interference.test.ts` |
| Lead: candidate manifests, custody/leases and terminal report | `docs/development/ps09-run-02-candidate-manifests.md`, `docs/development/PS09-RUN-02-COORDINATION.md`, `docs/handoffs/ps09-run-02-identity-authority-scenarios.md` |

Schema/runtime patterns may be reused from the existing pure engine contracts;
geographic evidence does not become identity evidence. No import or schema
reference into frozen K0, S0 or O0 is permitted. Existing versioned contracts,
real-source lifecycle/receipts, the source registry, taxonomy, corpus pipeline,
application, artifact schemas, command surface and dependencies remain outside
the proposed write scope. In particular, do not add product JSON configuration
to evade or change S0's frozen inventory. Real named candidate labels belong
only in planning documentation; executable fixtures use unmistakably synthetic
identities and `.invalid` citations. No real Nation-specific configuration,
source body, pack object, local corpus path or private material enters Git.

The lead owns shared interfaces and serial integration. Specialists start
read-only and receive complete, disjoint file leases only after approval and
interface review. They must preserve other agents' and owner changes. Fresh
engineering and sovereignty reviewers own no implementation paths and return
finite findings. Reviewer approval is not owner acceptance or source authority.

## Tests, acceptance and stop contract

The proposed synthetic suite must verify:

1. Strict schema compilation, closed keys, unique typed IDs, exact references,
   schema/runtime agreement, deterministic serialization, detached immutable
   results and explicit unknown temporal/evidence states. Cross-jurisdiction
   assertions cannot collide through a shared authority-system label.
2. Recognition cannot create membership, treaty rights or eligibility;
   membership cannot create recognition, source association, consent or Nation
   position; owner selection cannot rewrite source assertions. Count/entry
   discrepancies cannot delete or merge identities or gate unrelated records.
   Expired membership cannot become an undated current badge. Recognition or
   membership evidence cannot replace exact official-record evidence and URL
   for a Nation association; county mention/status rules remain independently
   enforced. Evidence bound to a different record must be rejected.
3. Crow government/reservation/agency cannot merge; Fort Peck/Fort Belknap
   cannot merge through an alias; Duwamish exclusion cannot determine status;
   consultation-list inclusion cannot create recognition; ANCSA/demographic
   concepts cannot create government identity, citizenship or status.
4. Geography, keywords, shared title, affiliation and model-like text cannot
   create identity, currentness, source authority, legal applicability, rights
   impact or member positions. Nation, ATNI, NCAI and source taxonomy authority
   cannot overwrite each other; unmapped material remains Unclassified.
5. Each graph has positive, negative, stale-status, unavailable-source,
   changed-version and exact synthetic citation expectations. Distinguish
   official/convenience rendition roles, agency/party statements, proposal/final
   action and document/proceeding status. Unknown is not negative; unavailable
   is not outside coverage. No future document text or unverified status is
   generated.
6. Restricted/private fields, personal/contact/service-list information,
   source bodies and land/geometry content are rejected at the proposed public
   boundary. Synthetic privacy tests do not authorize private input. No I/O,
   provider/model calls, side effects or protected-family dependencies occur.
7. Candidate manifests and persona/output references cannot mutate retained
   facts, taxonomy, lifecycle, why-shown, limitations or artifact documents.
   Passing synthetic graphs cannot set source-qualified, admitted, activated,
   real-scenario-accepted, release-ready or published states.

On later approval, recover current Git/custody and read the full live roadmap
before implementation; record the exact approval and limited path leases.
Maintain one authorized active canonical item during implementation. Reconcile
baseline runtime, roadmap, backbone and full `npm run check` results. Use the
committed focused command surface during editing, including:

```powershell
npm run test:unit -- tests/engine/identity-authority-scenarios-schema.test.ts tests/engine/identity-authority-scenarios.test.ts tests/engine/identity-authority-scenarios-non-interference.test.ts
npm run check
```

The full check includes `npm test`, build and artifact validation. Do not mark
a contract change validated if these fail. The local scope changes no UI;
existing accessibility/keyboard tests remain mandatory, while a new browser
claim requires a new measured browser check. Verify equal-generation artifact
non-interference, source boundaries and all 76 immutable file identities before
closeout. Recompute final Git/status/counts and preserve failures/skips with
their actual scope. Synthetic evidence must never be described as real-source
or full scenario acceptance.

All source/domain/request/byte budgets for this packet and proposed local scope
are zero. No source-interface qualification, acquisition allowlist, operation
grant, provider-body capture, adapter activation or real lifecycle integration
is authorized. Historical D3/R6/R7 and PF-01 through PF-17 remain consumed;
FR-A1 remains unissued. No external corpus-root operation is necessary here.
No remote, push, publication, registration, credentials, terms acceptance,
paid/contact action, private-data use, optional AI or notification is included.

Stop the affected claim when evidence is missing, stale, disputed or outside
scope. Preserve the reason and continue independent authorized work. Exact
ATNI membership uncertainty is not a general engine or fixed-count cohort gate.
Stop the session before an unlisted write, source request, protected-custody
change, required overlapping owner edit, unsupported real identity assertion,
legal conclusion or expanded cohort decision. Do not resolve those by changing
fixtures, weakening existing tests or accepting an agent's assertion.

The local scope may finish with validated contracts and candidate manifests
while required real identity evidence remains unresolved. Record that bounded
capability separately and keep `PS09-02` incomplete with exact blockers;
`RUN_02_PNW_IDENTITY_AND_SCENARIO_FOUNDATION_COMPLETE` is not available from
synthetic-only proof. No successor becomes authorized automatically. Preserve
the single canonical release graph; do not add a parallel mandatory release
lane or treat the archived ready item as executable.

## Preparation validation and handoff

Before drafting, runtime, roadmap and backbone validation passed on Node
24.19.0/npm 12.0.2 Windows x64. The ledger has 77 items: 36 complete, zero in
progress, one archived ready, 18 blocked, two deferred and 20 not started;
53 gates remain unchanged. Protected-custody verification matched all 76 files.
After review repairs, `npm run format:check`, `npm run validate:roadmap`,
`npm run validate:backbone`, `npm run scan:source` and `git diff --check` all
exited zero. Backbone validation found 16 schema IDs, 1,201 references,
78 authored Markdown files and 375 local links. The source scan checked
443 tracked paths and 477 source files before this packet was staged.
Repeated protected-custody verification matched all 76 files.

Preparation reviewers were read-only: `handoff_git_check` for engineering and
paths, `run2_owner_scope` for owner direction, and `run2_gate_review` in the
sovereignty adversarial role. Review repairs preserved three distinct candidate
docket spellings and made temporal/jurisdiction assertion identity and exact
record-association evidence explicit. Both final engineering and sovereignty
reviews report no remaining material findings. Their verdicts concern this
packet, not implemented contracts or owner acceptance.

No implementation write lease, additional skill, source-review procedure or
external service was needed for preparation; no source was evaluated as viable
and no external request was made. Full runtime tests, build, browser checks and
external-root replay were not rerun for this documentation-only checkpoint.
Run 1's recorded test/browser evidence remains dated historical evidence.

The preparation commit is the local Git commit containing this packet and the
two narrow roadmap text changes. It preserves all prior commits and records
no gate, dependency, work-item status or release-root change. Its exact SHA is
recoverable from local Git; only these two paths belong in the commit. All
protected inputs remain untracked, and immutable provider evidence stays
ignored. No runtime, schema, configuration, dependency or artifact path changed.

Terminal disposition:
`RUN_02_ENTRY_PACKET_PREPARED_AWAITING_OWNER_APPROVAL`.

The next owner action is approval of this exact local scope. That approval is
the final preparation boundary, not an implied approval already present in
the ledger or this document.
