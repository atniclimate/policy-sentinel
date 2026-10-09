# Selected source documentation refresh

Observed on 2026-10-08 (America/Los_Angeles). Reviewer: D-088 source-review
engineering lane. Scope: a bounded check of existing GD-17/GD-47 candidate
documentation and explicit access stops, using the
[source-review skill](../../../.agents/skills/policy-sentinel-source-review/SKILL.md).
This record does not complete GD-36 or GD-47 source qualification, renew a
profile, or change catalog lifecycle, capabilities, expiry or activation.

The [catalog](../../../config/source-catalog.v1.mjs) and
[seven-state interface register](../../../config/regional-interface-register.v1.mjs)
remain unchanged. A documentation observation is distinct from a tested
retrieval contract. No source API operation, resolution document, policy PDF,
credentialed surface or provider acceptance action was dispatched. No raw
source response was written into the repository or an acquisition namespace.

## Current primary observations

The following URLs were requested only through the read-only research tool.
Its rendered results can be cached and are not acquisition receipts, raw
HTTP-header evidence or provider availability measurements. No credential was
supplied. A successful public documentation render does not prove that its
linked service is credential-free.

| Candidate | Exact official locator and observed result | Documented capability and coverage | Remaining disposition |
| --- | --- | --- | --- |
| Washington LWS | [Washington State Legislative Web Services](https://wslwebservices.leg.wa.gov/) returned readable documentation identifying the Washington Legislature. | Describes free real-time SOAP services, legislation/status/history, amendments, document names/types and HTML/PDF URLs, affected RCW citations, and session-law/effective-date/veto fields. Documentation supports metadata and identifier-oriented service claims; no topical/full-text query or finite session population was executed. No historical API start was established. | **Evidence blocked** for a successor contract. Existing identifier/metadata declarations remain documentation claims; spent discovery canary and G-WA-LWS-DISCOVERY are not renewed. |
| Idaho administrative rules | [Office of the Administrative Rules Coordinator](https://adminrules.idaho.gov/) returned readable documentation identifying its placement under Idaho's Governor/Division of Financial Management. | Explicitly describes search by agency, rule title, IDAPA number or general topic, while warning of a current technical issue affecting search/listings. Describes monthly Bulletins, annual rules archives from 1996, Bulletins from 1995 and cumulative rulemaking since 1993. These are different collections, not one verified complete range. | **Evidence blocked**. A future evidence update can distinguish documented topical/metadata/identifier search from operational availability. No search was executed; full-text behavior, machine route and restored service are unverified. |
| Montana legislation | [Montana Legislature](https://www.legmt.gov/) initially returned the official title/navigation and a [Bill Explorer](https://bills.legmt.gov/) link. Subsequent content-window requests returned tool internal errors. The linked application was not opened. | Confirms an originating discovery pointer only. No search/query, export/API, session range, pagination, status or revision contract was newly verified. | **Evidence blocked**. The prior timeout can be supplemented with this limited navigation observation; it cannot become an accepted machine interface or current coverage. |
| Nevada legislation/statutes/rules | [Nevada Law Library](https://www.leg.state.nv.us/Law1.html) returned readable definitions and collection navigation from the legislative host. | Distinguishes NRS codification, session legislation, NAC and Register documents. Shows NRS 2025/2026 R1, separate regular/special-session navigation from 1864 through 2025, chapter-number indexes and search links. Linked search behavior and complete holdings were not tested. | **Evidence blocked**. Collection and edition distinctions are re-observed; no NELIS API, full-text service, revision lineage or reuse contract is qualified. |
| Alaska legislation | [Legislative Information Offices](https://akleg.gov/laa/lio.php) returned a research-tool 403 failure. | No current capability or date range was newly verified. Prior BASIS/Folio descriptions remain dated evidence in the [Alaska review](ak-2026-10-07.md). | **Evidence blocked**. This is not a finding that the publisher denies public access or that no API exists. |
| California legislative publication | [Legislative Counsel Government Code chapter locator](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=GOV&division=2.&title=2.&part=1.&chapter=5.&article=) was unavailable through the research tool; no chapter content was returned. | No current download/export schema, permission statement, authentication condition or range was newly verified. The retired archive's separate bounds remain in the [California review](ca-2026-10-07.md). | **Evidence blocked**. No current contract may be inferred from the failed request or the legacy download pointer. |
| ATNI organizational resolutions | [Resolution process page](https://atnitribes.org/resolutions/) initially produced a titled page result; subsequent content reads returned internal errors and a tool-reported 400 timeout. The resolution table and linked instruments were not requested in this refresh. | No adoption process, table fields, archive range, search capability or reuse condition was newly verified from the inconsistent result. Earlier observations remain in the [intertribal review](tribal-intertribal-2026-10-07.md). | **Evidence blocked**. Do not treat the initial page title as direct index qualification or resolve passed/tabled conflicts from it. |

For WA, the documentation describes intended continuous availability, variable
response times, possible faults and changes to the currently supported service;
it supplies no new finite-population or numeric rate guarantee in this review.
The site footer reserves rights. Idaho and Nevada also display rights notices.
None of these notices establishes a grant for capture, analysis, display,
excerpt, export or redistribution. Those uses remain separately unqualified
for new operations. Attribution remains to the originating publisher and, for
an eventual instrument, its exact issuer and version.

For every row, robots/bulk-use rules, numeric request/rate/byte/retry ceilings,
stable pagination, CORS, complete historical coverage and text/excerpt reuse
are unknown or not reverified here. No product polling cadence is selected.
No browser dependency on a provider is proposed. Declared publication cadence
does not establish refresh health.

## Existing access stops were respected

No request was made to the following blocked source surfaces or their alternate
hosts. These are retained source-specific findings, not freshly checked terms.

| Candidate and retained locator | Exact prior evidence and unresolved condition |
| --- | --- |
| Oregon legislative OData: [data documentation](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx) and [acceptable-use agreement](https://www.oregonlegislature.gov/citizen_engagement/Documents/OLODataAcceptableUseAgreement.pdf) | [2026-07-31 OData review](../oregon-odata-offline-contract-2026-07-31.md): G-C covers the agreement/account/credential action. Provider schema, pagination and live reconciliation remain unverified. This does not transfer executive-agency terms to every Oregon publisher. |
| Oregon administrative rules and Governor: [statewide terms locator](https://www.oregon.gov/pages/terms-and-conditions.aspx) | [2026-07-31 rules/executive review](../oregon-rules-executive-2026-07-31.md): G-B-OR-OARD and G-B-OR-GOVERNOR preserve the recorded access-as-acceptance condition across covered executive-agency hosts. |
| Oregon court publications: [OJD policy locator](https://www.courts.oregon.gov/Pages/policies.aspx) | [2026-07-31 appellate review](../oregon-appellate-opinions-2026-07-31.md): G-B-OR-OJD preserves the recorded access-triggered terms and commercial-copy restrictions; no OJD/OCLC traversal occurred. |
| NCAI: [archive terms locator](https://archive.ncai.org/terms-of-use) | [2026-10-07 intertribal review](tribal-intertribal-2026-10-07.md#intertribal-organizational-publishers): visiting-as-agreement and limited-use conditions were recorded; applicability across current/archive hosts remains unresolved. No host was revisited to bypass that stop. |
| USET and USET SPF: [privacy-policy locator](https://www.usetinc.org/privacy-policy/) and [shared resolution index locator](https://www.usetinc.org/resources/resolutions/) | [2026-10-07 intertribal review](tribal-intertribal-2026-10-07.md#intertribal-organizational-publishers): service-use-as-agreement condition and unresolved reproduction/machine contract. The declared 1969–Present range is retained USET-index evidence, not newly enumerated holdings or USET SPF-specific coverage. |

## Narrow implementation implications

The existing unavailable-capability and gap presentation remains appropriate.
The only proposed follow-up evidence changes are the dated observations above:
WA service documentation; Idaho's expressly described search modes alongside
its failure notice; Montana's originating navigation link; Nevada's separate
collections/edition labels; and the tool-limited AK/CA/ATNI observations.
No row merits promotion to qualified or active from this refresh.

Official publisher names support attribution to those publishers only. They do
not establish a new jurisdiction registry binding, legal geographic scope,
Nation participation, homeland assertion, organizational membership or a
member Nation's position. ATNI, NCAI, USET and USET SPF must retain distinct
organizational attribution. Catalog publishing-jurisdiction bindings remain
unchanged.

Selected build ranges and emitted ranges are **none** for this refresh. No
source object, fixture, adapter, accepted last-known-good shard or acquisition
budget was created. Source-isolated failure behavior remains omission/unavailable
without a validated same-adapter prior shard, or stale/degraded reuse of that
prior shard with its original data-as-of time. Qualification still requires
source-specific access/reuse evidence, exact finite targets and versions,
privacy-safe fields, custody/budgets and independent contract review before
a new dispatch. These remaining source gates do not undo the implemented
catalog and qualification capabilities or create a prerequisite to their local
software acceptance.
