# Policy Sentinel development plan revision

This revision makes a usable offline analyst workflow the next product milestone.
It records the owner's 2026-10-06 directions after completed optimization O1/O2
and defines the implementation sequence, source acceptance and release evidence.
D-086 adopts the owner directions in this document. Planning completion is not
implementation, source activation or release completion.

## Owner decisions and their scope

| Direction | Planning interpretation |
| --- | --- |
| Offline analyst workflow with a monitoring subagent | Deliver an intermediate pilot that can search a bounded corpus, assemble exact evidence, review and revise a finding, save and reopen the case, and produce a cited output. A bounded read-only workflow monitor reviews the interface and final journeys. |
| More efficient dependencies | Put reproducibility and execution-authority preparation early; make source survey precede catalog population and storage planning consume its findings. Use explicit dependencies instead of conflicting wave labels. |
| APIs fully implemented and tested | Each required API must pass actual source retrieval through custody, extraction, normalization, offline search and exact evidence export, plus controlled failure tests. Discover and integrate additional policy and legal-document sources where needed. A stub, fixture or catalog row does not complete an integration. |
| Offline state and local expansion | Bound acquisition needing offline processing to Washington, Oregon, Idaho and the owner-selected areas associated with the named AK, CA, MT and NV planning communities below. Whole-state public APIs should include those states; nationwide API capability and identifiers remain in scope. These are operational coverage choices, not an ATNI membership or Nation-territory determination. |
| Actual acquisition to establish size | Acquire useful, reviewed public material in measured batches. The owner confirmed a ceiling of 50 GB for the total managed footprint: originals, renditions, indexes, outputs and temporary processing. This is a ceiling, not a fill target. |
| Public and local deployment roles | The online product uses public sources; local instances additionally integrate authorized Tribal documents and context. Public-only independent installations follow software/source licenses. Authorization is required for private/shared data and participation in ATNI interoperability. |
| ATNI and shared data | The owner states ATNI local interoperability assessment is already authorized. Do not ask for that blanket authority again. Contribution to a shared pool requires the contributor's agreement and the recipient/use scope it permits; local assessment authority does not itself publish or share a Tribe's data. |
| Intertribal resolutions | Include public resolutions of ATNI, NCAI, USET and other identified, Tribally authorized intertribal convening organizations. Attribute the issuing organization and source-stated adoption/version status; never infer each member Nation's position or consent. |

Two clarifications were expressly confirmed in this session:
authorization attaches to private/shared data and ATNI interoperability, and the
50 GB ceiling is total managed data. The owner subsequently defined the AK/CA/MT focus through named planning
communities and explicitly added Nevada. Whole-state public API coverage should
include WA, OR, ID, AK, CA, MT and NV when suitable interfaces exist. The
operational selection is not an assertion of ATNI membership or complete
territory.

| State | Owner-provided planning labels |
| --- | --- |
| AK | Organized Village of Kassan; Tlingit & Haida Indian Tribes; Metlakatla Tribe |
| CA | Hoopa Valley Tribe; Karuk Tribe; Smith River Rancheria; Yurok Tribe |
| MT | Blackfeet Nation; Chippewa Cree Tribe of the Rocky Boy Reservation; Confederated Tribes of Salish & Kootenai; Crow Tribe |
| NV | Shoshone-Paiute Tribes; Summit Lake Paiute Tribe |

Preserve these labels verbatim as owner selections. Resolve canonical official
identities and aliases before real configuration; do not silently correct,
merge or treat this list as a verified roster. Broad public landbase context
guides which state/local source jurisdictions to examine. It does not create a
record-to-Nation link, a legal boundary, or permission to publish geometry.
Translate that context into a finite source/jurisdiction manifest before intake;
real Nation-specific deployment configuration remains outside the repository.

## Product outcome and deployment boundaries

The adopted local release still proves four outcomes: a non-owner Tribal staff
member uses a second-machine offline deployment; another operator adds a
non-Washington source; a successor restores and replays the evidence package;
and a peer application exchanges a synthetic context and citations. See the
[1.0 local definition](2026-09-24-definition-of-done-general-development.md).
The offline pilot is an earlier usable increment, not a claim that all four
demonstrations or the entire release are complete.

Public source availability is the starting point for qualification, not a
reproduction license. Preserve source-specific access/reuse evidence and allowed
output fields. Public outputs use approved public material; source code, private
data, public artifacts and custody storage remain distinct. No raw corpus belongs
in Git. The current demo is an interaction reference and a separately deployed
surface; its checks do not establish general-engine acceptance.

Local cases and documents remain local unless an explicit selected export or
agreement permits a transfer under applicable source, data and recipient
authority. Selecting export never overrides those restrictions.
A deliberate case save is user-authored storage,
not automatic query logging. Public/private/shared classification follows the
document and its derivatives into indexes, search results and every export.
Classify authored cases, questions, notes and findings independently from their
sources: public citations do not make confidential Tribal analysis public.
Combine source and authored-material restrictions conservatively at every
search, output and transfer boundary.

For the D-074/D-075 ambiguity, the implementation proposal is: a user-declared
Nation may be used inside an authorized local deployment; general off-deployment
v1 remains Nation-free. Authorized ATNI-local assessment can evaluate a separately
versioned ATNI context profile. Any later cross-deployment Nation field requires
an explicit profile, recipient authority and agreement. User declaration never
creates an evidence-backed Nation-record relationship. The profile distinction
must be finalized in the authority/contract task before implementing a changed
wire contract.

## Sequence and bounded work

The ledger is the executable order. This sequence explains the purpose and
finish conditions; it does not let a completed handoff reactivate old runs.

| Stage | Existing work and added preparation | Result required before advancing |
| --- | --- | --- |
| 1 Reliable starting point | GD-26 and current-summary reconciliation | Receipt-free source-snapshot checks and a finite denied-command test matrix; unchanged environment limitations remain visible. Resolve the ignored local-settings format failure by a scoped format/check-boundary decision, without committing local settings or weakening deny rules. |
| 2 Authority and source preparation | GD-31 local authority/operation-contract task; GD-17 finite initial matrix; GD-18 storage report and initial budget | Encode the new public-acquisition and ATNI-assessment scope separately from historical zero-budget gates; define an exact initial source/API set, dates, formats, allowed hosts, coverage, rate/request/byte bounds, custody location and checks. Source-specific qualification is operational work under the recorded grant, not a repeated generic permission request. |
| 3 Essential engine seams and bounded storage | GD-04 through GD-10 in dependency order; GD-09 identifiers; GD-12 catalog after survey; added offline-search/storage preparation | Enforced module/private boundaries, replay preserved, catalog usable, and a bounded projection or persistent local index that does not load the entire custody store in the browser. Version successor contracts before emitting jurisdictions unsupported by retained schemas. |
| 4 Usable analyst pilot | GD-25, required output/intake work, representative source integration packets | A small real public corpus from at least one federal, one selected regional and one intertribal source supports the complete offline case workflow and three output styles. Use synthetic private/shared material until user-supplied inputs and agreements are available. This pilot does not substitute for the full required API set. |
| 5 Measured expansion and interoperability | Required API packets; regional offline imports; GD-11/13/14 and state mappings; GD-19/20/21/22/23; GD-16 and peer conformance | Complete the named integration set, calibrate storage with acquired data, exercise authorized local Tribal inputs and ATNI-local assessment, and verify permission-aware transfer where an actual agreement exists. Grow by usefulness and measured cost within the cap. |
| 6 Release acceptance and delivery | GD-15, GD-27, explicit PS09 acceptance consolidation | An installable package and a complete release acceptance record are distinct. Account for every required capability and all four human/peer demonstrations, registry version and unresolved PS09 requirement. Public general-engine delivery is a separately represented output operation, not inferred from a local test. |

Do not hold the first usable workflow hostage to acquiring the entire regional
archive, integrating every possible API, or starting a shared-pool service.
Conversely, do not mark a required integration complete because an alternate
source made the pilot usable. Freeze the finite required integration set and
record additions as explicit scope changes.

GD-17 now delivers the finite initial matrix: the five federal families, the
seven selected states and ATNI/NCAI/USET resolution collections, with explicit
gaps and a small pilot subset. GD-33 retains the remaining nationwide survey
(all 50 states, DC, territories and county platform classes) as release work.
GD-12 catalog and GD-18 initial budget depend on GD-17, not GD-33. The pilot
requires qualified selected rows and a measured budget; neither an unfinished
nationwide survey nor an unrelated source-specific block delays that subset.

## Sources and integration acceptance

The source matrix records jurisdiction, publisher and authority class, document
family, official endpoint/locator, format, date/version coverage, retrieval and
reuse conditions, credentials, review expiry, failure behavior, and public/local
delivery permissions. Keep discovery, reviewed interface, fixture-tested adapter,
live-verified acquisition, searchable corpus and output acceptance as separate
evidence columns.

Start with the five already planned federal families: Federal Register, GovInfo,
eCFR, Congress.gov and Regulations.gov. Survey official state legislature,
statute/code, administrative-rule/register, court/opinion and selected local
ordinance sources. Record source-class gaps explicitly. A third-party discovery
catalog may locate an official record but cannot silently replace its authority.

API-supported nationwide sources may remain national. Offline-heavy state/local
growth follows the owner-selected region. Statewide California, Alaska, Montana or Nevada texts
can be included as statewide instruments needed by the selected regional
workflow; preserve their actual issuer jurisdiction and never relabel them as a
local or Nation-specific instrument. The source/jurisdiction manifest must precede
geographically bounded bulk intake. Use public source geography only to select
coverage; preserve uncertainty and obtain user confirmation when a locality
cannot be resolved without inventing a Nation boundary.

Public intertribal resolution collections identified on 2026-10-06:

| Publisher | Official discovery entry | Current planning evidence |
| --- | --- | --- |
| ATNI | [Resolution table](https://atnitribes.org/resolution-table/) and [process](https://atnitribes.org/resolutions/) | Official search-index evidence identifies the collection; direct table fetch timed out. Stable retrieval, adoption fields, pagination and reuse remain to be qualified. |
| NCAI | [Resolutions](https://www.ncai.org/resolutions) | Official page identifies organizational resolutions and an incomplete historical archive. Inspect adopted records separately from submissions in progress. |
| USET and USET SPF | [Resolutions](https://www.usetinc.org/resources/resolutions/) | Official page lists the resolution collection and thematic categories. Preserve USET versus USET SPF as actually stated by each document. |
| Other intertribal convening organizations | Official publisher selected in the source matrix | Verify the organization's publishing authority and the public resolution collection before adding it. No generic membership or authorization inference. |

These are discovery findings, not accepted adapters or acquired policy corpora.
Do not collect contact-person fields from resolution indexes. An organizational
resolution is not automatically Tribal law, legislation, binding legal effect,
or the position of every participating Nation.

Every required integration must demonstrate:

1. A real successful acquisition through the integration's declared, reviewed
   route, bounded and recorded with dates, versions, bytes and provenance.
   An API requirement must exercise that API end to end. Direct-document or
   manual import may complete its own document-source integration, never an
   API integration; blocked credentials keep that API incomplete.
2. Exact source identity through custody, extraction, normalized records,
   offline retrieval and a replayable exported quotation.
3. Representative formats, missing/malformed fields, pagination and duplicate
   behavior; bounded retry, timeout and resume; source-specific stale/unavailable
   behavior. Controlled failure injection is labeled separately from observed
   live responses; do not induce provider rate-limit failures to test a client.
4. Version and date distinctions, corrections, withdrawn/superseded material and
   unresolved citation targets without invented legal currentness.
5. A source health/coverage receipt with excluded ranges and unsupported classes.
   Fixture-only or credential-blocked required APIs remain incomplete.
6. Review of the final permitted output, not only the downloaded response.

Current profile expiry is not renewed by this plan. Current primary documentation,
reuse evidence and reviewed successor profiles precede dispatch. New paid access,
account/credential registration, affirmative third-party contracts or contact
remain separate operations when not covered by an existing owner authorization.

## Storage and search at the intended scale

Use 50,000,000,000 bytes as the 50 GB planning ceiling. Inventory all
project-managed policy roots before adding material, including retained
historical custody; do not delete or mutate sealed evidence to fit the budget.
Report originals, text/OCR renditions, metadata, persistent indexes, cases/exports
and temporary peak working space. Duplicate/staging space and index rebuilds
count while they exist. Shared contributions count too.

The old 35/10/5 GB allocation is a starting estimate to replace with measurements,
not a second allowance. Reserve actual free disk space and capacity for an atomic
write/rebuild before admission. Never relax the current production 20 GiB
post-write floor or 10 GiB run ceiling merely because the project cap is 50 GB;
a successor implementation needs explicit bounds and refusal tests. Stop new
admission before either the project budget or actual-disk limit would be exceeded.
No automatic custody eviction or destructive cleanup is selected.

Begin with a small useful acquired batch and measure its actual retained and
peak bytes. Expand by source/format batches, updating forecasts from those
measurements. Source counts, time coverage, record counts, bytes per rendition
and extraction failures accompany estimates. An inventory/report can be built
before acquisition; empirical capacity calibration occurs with the new authorized
intake, avoiding a circular dependency.

The existing workbench uses a checksum-pinned single corpus file capped at
128 MiB and presents at most 1,000 results; its in-memory passage index is useful
existing capability. It is not a 50 GB store design. Select persistent search or
bounded corpus projections using the retained corpus and then the acquired
pilot. Bound browser payloads, memory, index growth and temporary rebuild space.
Record cold/warm timings and workload identity; the prior incomplete 2,000-work
measurement is a test to finish, not a passing baseline.

## Analyst workflow and output acceptance

Preserve implemented exact-identifier/phrase and passage search, filters,
version comparison and evidence-backed relationships. Add the missing case
workflow: question, corpus snapshot, selected document versions/passages,
analyst notes, supporting/contrary/missing evidence, review state and revisions.
Save explicitly, close, reopen and revise without losing evidence bindings.
Changed or missing source versions must require visible review rather than
silently rewriting saved findings.

Search must expose source, jurisdiction, document type, date basis, coverage and
unclassified material. A zero-result search must remain distinguishable from a
failed, unavailable or unsearched source. Show stable identifiers and exact
version dates. Citation candidates resolve to a specific work/version and
locator or remain visibly unresolved/ambiguous; similar wording is not enough.
Source-stated amendment/repeal scope cannot be promoted from a provision to an
entire instrument.

Three useful styles share one evidence model:

- Citation packet: selected passages, stable source/version identities, locators,
  retrieval dates and attributed analyst notes.
- Comparison matrix: selected instruments or versions, exact text differences
  or reviewed comparison dimensions, uncertainty and supporting references.
- Research memo: question, declared source population, provisional finding,
  supporting/contrary/missing evidence and the next verification step.

Style changes cannot alter facts or evidence. Start from accessible HTML,
printable output and portable JSON/CSV where supported; implement PDF with
verified evidence parity and render checks. Editable-document export is later
unless a pilot user need justifies it. The demo's omission of counterevidence
does not transfer into engine research output.

Freeze a finite pilot journey/query set before tuning, including exact citation,
phrase/topic retrieval, historical cutoff, ambiguous cross-reference, missing
source, conflicting evidence, case save/reopen, offline restart and each output
style. Add local Tribal and shared-agreement journeys when those inputs exist.
Every exported quotation must replay to the retained rendition and locator;
every private/reuse/temporal exclusion must pass. Include an all-public-source
case containing a private analyst note: public/shared export must exclude or
deny the restricted content according to its permitted recipient scope.
Record search relevance,
latency and memory against the named workload before adopting numeric targets.
User usability acceptance must include task completion, recoverable errors and
the participant's understanding of output limits.

Disable external networking for the offline acceptance run after intake; queries,
case reopen and exports must use local assets. Verify keyboard access, readable
long documents, Unicode names, tables and page breaks. Public online tests and
local offline tests retain separate receipts.

## Interoperability and agreement governed sharing

The owner-confirmed ATNI local assessment may inspect the intended local
interoperability and prepare synthetic exchanges without reopening its blanket
authorization. Identify each participating local deployment, supported profiles
and permitted inputs before any real transfer. Independently deployed public-only
instances require no new per-instance owner permission; access to ATNI or Tribal
private/shared data and ATNI interoperability remains authorization-dependent.

A shared contribution needs a package/version and agreement identifying the
contributor, recipients, purpose, allowed fields, onward sharing/export, retention,
expiry and withdrawal behavior. Verify both sender and receiver. Store agreement
references and permission state with derived indexes and outputs. Test mixed
public/private selections, expired/revoked permissions, corrupt packages and
denied recipients. Revocation governs future access/exports and rebuild/purge
obligations; it cannot claim already distributed copies disappeared.

A future shared pool must not become a pilot prerequisite without a contributor,
agreement and demonstrated workflow need. No private payload, agreement contents,
contact list or geometry enters the public repository or publication artifact.

## Release evidence and remaining determinations

Prepare a claim-by-claim PS09-to-1.0 crosswalk before changing the release root:
retained requirement, evidence already usable, new evidence needed, replacement
acceptance if explicitly changed, and the owning work item. Completing the
recognition registry does not complete all PS09 identity/scenario evidence.
Resolve registry v0/v1 naming in the release contract; do not turn either version
label into acceptance. Every Part B capability and A1-A4 demonstration must be
represented even if an installable package can be prepared earlier.

Regional county/municipal general-jurisdiction documents need a deliberate
successor eligibility rule: the retained contract admits a county record only
when it explicitly names a Nation. The proposed successor would admit scoped
official local instruments as general_jurisdiction while continuing to require
exact source evidence for any Nation relationship. Keep this proposed change
visible for determination; neither silently filter away required local coverage
nor bypass the existing contract.

Pending details are limited to the concrete source/jurisdiction manifest for the
owner-selected communities, the county eligibility successor, the versioned ATNI versus general
interop profile, source-specific missing credentials/terms where encountered,
and evidence supplied by external registry owners or independent demonstrators.
Continue independent preparation while a detail blocks only its dependent work.

## Review roles and checkpoint discipline

The integrator owns the ledger, shared contracts, source/operation admission,
validation selection and commits. One workflow monitor is read-only at the
interface checkpoint and the final pilot journeys. It reports the failed journey,
reproduction, user impact, evidence and responsible work item; it does not repeat
full suites, add sources or expand scope. One adversarial reviewer checks the
bounded candidate and its evidence. Neither role accepts a source or substitutes
for the independent human demonstrations.

Reuse unchanged verification evidence only with matching inputs and conditions.
Run focused tests during work and one appropriate combined checkpoint. Preserve
baseline failures and environmental limitations. O1/O2 remain complete; O3-O7
are not automatically activated by this revision. The current full test/build
result is reusable context, while GD-26's distinct fresh-snapshot obligations
remain unfinished.

This planning session changes no product code, schema, source profile, credential,
corpus or deployment. It prepares the next local tasks and encodes the owner's
new directions without misrepresenting historical zero-budget gates. See the
[next-session handoff](../handoffs/2026-10-06-development-realignment-next-session.md)
and [adversarial review](../audits/2026-10-06-development-plan-adversarial-review.md).
