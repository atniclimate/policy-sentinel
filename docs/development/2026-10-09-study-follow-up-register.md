# Policy Sentinel study follow-up register

Prepared 2026-10-09 at `426981e`, following the first finite roadless pilot and
the owner's request for a GPT-6.1-sol implementation prompt. This register
preserves future work; it is not source qualification, dispatch authority or a
claim that the study gaps have been resolved.

The adopted local follow-up is described in the
[search refinement and review guidance prompt](../handoffs/2026-10-09-search-refinement-review-guidance-prompt.md).
The [pilot journal](2026-10-08-roadless-real-source-pilot.md) owns artifact
locations, digests and validation receipts. `ROADMAP.yaml` owns execution status.
The implementation checkpoint is tracked as GD55. Accepted GD25/GD35/GD54 and
the unfinished GD27 release retain their separate status. No new source
operation is part of GD55.

## Engineering sequence

| Order | Work | Completion evidence still needed |
| --- | --- | --- |
| 1 | Explicit all-terms refinement alongside legacy broad search | Real narrowing on a controlled fixture; supported parent context preserved separately; mode survives discovery save/reopen; filters and citations stay intact. |
| 2 | Review guidance tied to actual retrieval eligibility | Specific dependencies and reasons; direct source/review navigation; explicit review changes eligibility; challenges/stale bindings withdraw unsupported context; history and privacy survive. |
| 3 | Reusable complete browser journey | A committed synthetic regression through import, analyst registration, source review, refined search, assertion/review, gap/follow-up, exports and reopen. Keyboard/mobile, private notes, revision binding and zero outside-loopback requests included. |

Steps 1 and 2 have local contracts, UI and synthetic regression coverage at
GD55; their final validation receipts belong in the ledger. Step 3 is still
open. Existing workspace tests cover individual operations, and the external
pilot browser report 08 passed before this implementation. This session's
changed-control browser check covers refinement selection and review navigation,
focus, contrast and mobile layout; it does not constitute the committed
end-to-end journey in step 3.
Reuse `scripts/verify-policy-browser.mjs`, existing fixtures and package commands;
adapt its assumptions deliberately because its current full journey treats
downloads as unexpected. Do not copy the entire external pilot harness or add a
second browser framework. The next code session must test its changed UI, but
need not turn all remaining journeys into one new automation program.

The GD55 regressions cover saved search semantics, review/retrieval agreement,
attribution, already-direct context, and temporal/restricted evidence exclusions
with controlled fixtures. The remaining step 3 should combine them into a
browser journey, including export and reopen across a fresh page context.
Autosave/recovery, bulk review and a new query language are not current scope.

## Nine study gaps that remain open

These are the IDs in the saved real study. Each already has a reciprocal
`follow-up-*` discovery; preserve those links and identities when extending it.

| Gap ID | Needed to resolve it |
| --- | --- |
| `gap-independent-review` | A real analyst reviews exact extraction, interpretations and procedural links. Software or another model must not impersonate that decision. |
| `gap-later-actions` | Check later official actions after the retained September 11, 2026 notice through an explicitly recorded search cutoff; preserve negative coverage and failures. |
| `gap-eis-evidence` | Retain actual environmental review documents and tables with alternatives, baselines, units, spatial scale, uncertainty and exact versioned locators. |
| `gap-nation-consultation` | Independently originating public evidence of a named Nation's invitation, meeting participation, submission, response or outcome, distinguished by event. |
| `gap-intertribal-sources` | Originating ATNI/NCAI/USET or USET SPF materials with exact issuer, document/adoption status, dates and scope; no inherited member-Nation positions. |
| `gap-regional-scope` | Explicit regional applicability evidence; a geographic text match cannot establish legal jurisdiction, homeland or a regional effect. |
| `gap-authority-matrix` | Governing instruments and evidence connecting both endpoints of each statutory/procedural dependency. The retained matrix is empty. |
| `gap-context-review` | Actual review of the supporting passages and procedural relationships; test distinctions between already-direct, withheld and absent context. |
| `gap-common-origin` | A documented original-and-republication set. Three distinct instruments do not exercise duplicate corroboration. |

All nine gaps above remain open after GD55. Its review UI supplies a path to
attributed analyst decisions, but it has not reviewed the real study. The first
study has no individual Nation participants, intertribal positions,
environmental metric tuples, authority relationships or common-origin groups.
These absences describe its three-document scope, not non-occurrence. The saved
study is revision 3; its seven original products intentionally bind revision 2,
before a synthetic private-note check. That is not evidence of an export bug.

## Ranked document and data searches for a later research run

Prioritize complete evidence chains over a large document count. First complete
the roadless proceeding, then add contrasting instruments and jurisdictions.
Each row is a proposed search, not a finding that the documents exist or that a
service is activated. The next session should refine this packet without
dispatching it as part of the code task.

| Priority | Search and originating sources | Evidence to retain and intended result |
| --- | --- | --- |
| 1 | Search exact docket `FS-2025-0001`, RIN `0596-AD66`, retained FR document identifiers and title variants in qualified Federal Register/GovInfo and Forest Service collections. Check both later actions after 2026-09-11 and linked antecedents. | Parent/action identifiers; publication, source-effective and observation dates; extension/correction/withdrawal/final-action text; historical deadline chain. Produce an updated procedural timeline with a bounded coverage statement, not an unsupported current-law conclusion. |
| 2 | Follow originating Forest Service project links to the actual draft/final EIS, supplements, errata, appendices, alternative comparison tables, response-to-comments and any record of decision. Use EPA's EIS index as another discovery route. | EIS/project identifiers and version; page/table/row/column locators; alternative and baseline; metric/unit; reported versus calculated value; scale, range and uncertainty; references to technical data. Produce a parameter-preserving comparison table. A notice or summary does not replace the EIS. |
| 3 | Find publicly released agency consultation notices, invitations, meeting records, Tribal impact statements and responses, then independently locate participating Nations' own official public records where available. | Event type and date, issuer, named participants, exact attribution, relationship to docket and preceding/following events. Invitation is not attendance; aggregate reporting is not proof for each Nation. Produce an attributed consultation register. |
| 4 | Search the originating ATNI, NCAI and USET/USET SPF resolution libraries by `roadless`, `forest`, `Tongass`, consultation terms and cited resolution IDs. Trace explicit cross-endorsements only when documented. | Resolution number; organization and issuing body; submitted/adopted/amended/withdrawn status; adoption date; operative text and cited predecessors. Keep drafts and final positions separate, and repeated organizational statements within their documented origin. |
| 5 | Follow exact authority citations from the retained instruments to official statutory, regulatory, executive, judicial and agency-procedure records using already permitted routes. | Exact provision, version/date, both linked subjects and the source statement establishing the connection. Produce an authority matrix that distinguishes a citation, agency assertion and independently supported dependency. Access-gated APIs are not a required workaround. |
| 6 | For WA/OR/ID/AK/CA/MT/NV, search official registers, legislatures, environmental/forestry agencies and relevant public government instruments for explicit connections to the selected federal proceeding. Start with one WA/OR Cascades example and one contrasting ID or AK example if evidence supports them. | State instrument identifier, adopted/proposed status, exact federal dependency, geographic applicability statement and source locator. No thematic similarity, proximity, land geometry or membership inference. Missing evidence stays a gap rather than forcing one record per state. |
| 7 | Select a known originating statement and an explicitly identified official republication or attachment, plus one genuinely separate statement on the same issue. | Origin links, document/work identity, version differences and attributed passages. Prove duplicate copies do not increase corroboration, while preserving separately authored evidence. Identical text alone does not establish the whole provenance chain. |
| 8 | Follow technical references to small, documented public nonspatial tables or data dictionaries needed to interpret the EIS metrics. After one complete chain, select a second policy topic/source format that exercises the same workflow. | Schema, units, time coverage, methodology, revision, missing-value definitions and limits on cross-alternative comparison. Prefer tables actually supporting a studied claim; avoid indiscriminate dataset downloads or joining incomparable measures. |

### Concrete next research packet — prepared, not dispatched

Use the saved study's linked `follow-up-*` discoveries. For each selected lead,
record the exact collection and observed capability before dispatch; the date
scope below is a proposed search boundary, not a claim of complete holdings.
Keep a finite request, byte and storage forecast per source under the total
managed ceiling. A failed or capped search must retain its tested scope and
failure rather than become a negative finding.

| Priority / study gap and question | Originating family; query or identifier; proposed date scope | Required evidence and expected product | Qualification or access condition; roadmap owner |
| --- | --- | --- | --- |
| 1 · `gap-later-actions`, `gap-context-review`: what preceded or followed the retained notice? | Federal Register, GovInfo and Forest Service; exact `FS-2025-0001`, `0596-AD66`, retained FR/GovInfo identifiers and title variants; search antecedents through an explicit future observation cutoff, with a separate window after 2026-09-11. | Exact parent/action identifier, status wording, source publication/effective/observed dates, deadline text, version and passage locator; an attributed procedural timeline and searched-coverage statement. | Qualify each collection's identifier/full-text mode, pagination, use terms and finite operations at GD47/GD33/GD36, then GD37/GD38; prior GD54 operations are spent. |
| 2 · `gap-eis-evidence`: what do the actual environmental analyses report? | Originating Forest Service project publications, with EPA EIS index only as a discovery route; project/docket identifier, EIS, supplement, errata and record-of-decision terms; initial proceeding period through the recorded cutoff. | Document version and page/table/row/column, alternative, baseline, metric/unit, spatial scale, range, uncertainty and method; a source-faithful alternatives table. | Qualify project links, extraction/reproduction rights, EPA access challenge and document size before GD37/GD38; do not replace the EIS with a notice summary. |
| 3 · `gap-nation-consultation`: which participation events have exact public evidence? | Forest Service consultation publications and separately originating official Nation publications; docket plus invitation, meeting, submission and response terms; proceeding period through cutoff. | Issuer, event type/date, named participant, verbatim attribution, exact locator and relationship to preceding/following events; an attributed consultation register. | Public-only source qualification at GD47/GD33/GD36; no private material, personal contacts, inferred Nation stance or expanded Regulations.gov comments under GD43. |
| 4 · `gap-intertribal-sources`: what final organizational positions exist? | Originating ATNI, NCAI and USET/USET SPF resolution collections; `roadless`, `forest`, `Tongass`, consultation and cited resolution IDs; year/event windows first, then recorded cutoff. | Issuer/body, resolution number, adoption/amendment status and date, operative text, predecessor/cross-endorsement locator; a versioned organizational-position register. | Qualify each host, completeness, linked-library terms and accessible interface under GD47/GD33/GD36 before finite GD37/GD38; ATNI direct retrieval previously failed. |
| 5 · `gap-authority-matrix`: which exact governing links are supported? | Official statute, regulation, executive, court and agency-procedure sources cited by retained instruments; exact provision/citation and both endpoint identifiers; provision history through cutoff. | Provision version/date, statement naming both endpoints, source and passage locators, relationship type and review state; an authority matrix that distinguishes citation, agency assertion and supported dependency. | Qualify each originating route at GD47/GD33/GD36; API-specific GD39–GD43 gates apply where used. Do not turn a citation into a legal-effect conclusion. |
| 6 · `gap-regional-scope`: is any regional instrument explicitly linked? | Official WA/OR register or agency records first, then an ID or AK contrast if evidence supports it; exact docket/RIN plus `roadless` and instrument identifiers; proceeding period through cutoff. | State instrument ID, status/date, exact federal connection and applicability wording with locator; a contrasting regional-source comparison or a scoped unresolved gap. | Qualify each government collection and rights at GD47/GD33/GD36, dispatch only under GD37/GD38; no proximity, land or membership inference and no forced record per state. |
| 7 · `gap-common-origin`: can an original, official republication and independent statement be traced? | Originating publication and a named official republication/attachment discovered by exact title or identifier; original issue through republication date. | Original/copy link, digest, work/version identity, attributed passage and separate author's evidence; a common-origin test set without false corroboration. | Qualify both copies' provenance and reuse at GD47/GD33/GD36 before finite GD37/GD38; matching text alone is insufficient. |
| 8 · `gap-eis-evidence`: which small supporting datasets explain a claim? | Technical tables or data dictionaries explicitly cited by the qualified EIS, followed by one separately scoped contrasting topic; exact table/reference identifiers and stated coverage period. | Schema, units, time coverage, revision, methodology, missing-value rules and comparable alternatives; a bounded nonspatial data interpretation and extraction-effort receipt. | Qualify the exact table/source and size at GD47/GD33/GD36 before GD37/GD38; no indiscriminate downloads or incomparable joins. |

`gap-independent-review` is a human work item across the packet: a registered
analyst must review the existing 18 cited passages and six model-authored
assertions, challenge unsupported interpretations, and record rationale in a new
study revision. Software cannot close that gap. The two context gaps remain
open until exact passages, proceedings and links receive attributed review.

Useful later data tests include a scanned document or complex table, an amended
instrument, an unresolved citation, unavailable source and common-origin copy.
Choose examples by the untested behavior they expose, with explicit reuse and
extraction permission. Measure extraction accuracy and review effort before
building a generalized OCR/table pipeline. Use a second topic to detect
roadless-specific assumptions; it need not expand geographic or private scope.

## Source entry points and access distinctions

The following are discovery leads checked on 2026-10-09, not accepted adapter
contracts. A visible keyword box does not prove document full-text search,
complete historical coverage, stable automation or reproduction rights.

- [NCAI resolutions](https://www.ncai.org/resolutions) provides keyword and
  event/year discovery and describes its collection as incomplete in some
  years. Its linked resource library is a distinct host requiring its own
  qualification. Capture final adoption status from the originating document.
- [USET resolutions](https://www.usetinc.org/resources/resolutions/) links
  resolution searches and subject collections. Preserve whether the issuing
  body is USET or USET SPF; do not treat them as an interchangeable author.
- [ATNI resolutions](https://atnitribes.org/resolutions/) is an originating
  lead. Search results exposed the page, but direct retrieval failed in this
  preparation session. No availability, completeness or interface acceptance is
  established by that result.
- [EPA EIS database](https://cdxapps.epa.gov/cdx-enepa-II/public/action/eis/search)
  is a discovery lead surfaced by official-domain search. Its indexed page
  describes date/agency/state and identifier fields, a 500-result maximum and
  a document-download challenge. Direct page retrieval failed here. Verify
  these conditions before qualifying a route; no automated access is presumed.
- The Forest Service roadless landing page also failed direct retrieval in this
  session. Recover the originating project links from the retained evidence or
  current official navigation; do not silently substitute an unofficial mirror.

For every candidate service, distinguish actual topical, full-text, metadata,
identifier, cached and unavailable modes. Record tested query, collections,
coverage dates, observation time, result cap/pagination, failures and whether
text or metadata was searched. A general web result is discovery evidence, not
proof that a product adapter supports that search.

Current GD43 scope excludes Regulations.gov comments/submissions and requires
its exact access conditions. The consultation recommendation does not authorize
bulk comment collection or bypass that contract. Prefer independently published
official government or organization records; record an unresolved need if the
necessary submission exists only on an excluded route. A later source-specific
scope decision can address it. Do not collect personal contact fields.

## Durable next packet and roadmap ownership

For each selected search, record: study gap/question ID; originating collection;
query and exact identifiers; date range and cutoff basis; retrieval capability;
document types and expected fields; source qualification/reuse status; finite
request/byte/storage forecast; intended evidence product; and stop/failure
behavior. Reuse the existing discovery and operation contracts. Keep proposed,
qualified, acquired, extracted, reviewed and exported states distinct.

The useful next research deliverable is an updated proceeding timeline, an
alternatives evidence table, an attributed consultation register and an authority
matrix, each carrying unresolved gaps. Schedule a human review of the existing
18 passages before presenting their interpretations as accepted. Seek evidence
that challenges assertions as well as supporting it; empty findings keep their
collection/date scope.

Map source qualification to GD47/GD33/GD36, finite acquisition and broader pilot
acceptance to GD37/GD38, and API-specific work to GD39-GD43 as applicable. The
frozen GD54 run is not reusable authority. Preserve GD53's unresolved historical
acceptance and GD27's release obligations. Step 3 is a follow-up to GD25 and
requires its own honest execution/acceptance record, not retroactive completion.

D-086/D-087 already adopt the broader public-source direction; repeating a
blanket authorization question is unnecessary. Source-specific qualification,
finite operation conditions, exact ungranted external actions and the
50,000,000,000-byte total managed ceiling still apply. The pilot's last measured
inventory was 954,056,203 bytes, a historical measurement rather than current
free capacity. GD55 changed no source activation or acquisition ledger and
admitted no newly browsed material into the study or corpus.
