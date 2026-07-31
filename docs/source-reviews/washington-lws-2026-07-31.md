# Washington Legislative Web Services contract review

Status: current primary-source research complete; source remains disabled with
no adapter or public records

Access date: 2026-07-31

## Decision

Washington Legislative Web Services (LWS) is a public, no-registration
SOAP/XML interface that is suitable for a local build-time adapter only after
repository-owned request, response, bounds, privacy, fault, provenance, health,
and last-known-good contracts pass. The official material does not require an
account or key and does not identify an access-triggered terms action. No
credential or terms-acceptance gate is therefore opened by this review.

That technical viability is narrower than the prior Phase A claim:

- LWS does not publish one historical start that applies to every service;
- only LegislativeDocumentService explicitly documents availability back to
  the `1991-92` biennium, while the separate Detailed Legislative Reports UI
  says bill information is available back to 1991;
- the current WSDLs have unbounded arrays, no pagination, no rate or response
  size limit, no typed fault declarations, and no time-zone contract;
- the WSDLs expose personal/contact and unbounded free-text fields that Policy
  Sentinel must not retain;
- the service has no official bill-subject or topic operation; and
- free access and public visibility do not establish text-republication rights.

The safe publication boundary is metadata and official links. Every record
must remain `general_jurisdiction` with no Nation relationship unless a separate
official source supplies exact Nation evidence. Every record remains
`Unclassified` unless the separate official Topical Index receives its own
stable machine-interface and exact-label mapping review.

## Research method and non-actions

This review used only official Washington Legislature material:

- [LWS overview, support, change, and technical policies](https://wslwebservices.leg.wa.gov/)
- [detailed service catalog](https://wslwebservices.leg.wa.gov/lwsDetails.htm)
- the nine current service pages and WSDL documents listed below
- [Washington Legislature bills and biennium guidance](https://leg.wa.gov/bills-meetings-and-session/bills/)
- [Detailed Legislative Reports](https://app.leg.wa.gov/bi/home/)
- [Topical Index](https://app.leg.wa.gov/bi/topicalindex)
- [Topical Index help](https://leg.wa.gov/help/detailed-legislative-reports-help/?chapter=5ee2cf66-9ac8-4c97-9eca-da20480f4622)
- [legislative-document help](https://leg.wa.gov/help/detailed-legislative-reports-help/?chapter=9d0c8400-14f7-4de1-be0a-5b0cfcda6bae)
- [session-law archive](https://leg.wa.gov/state-laws-and-rules/state-laws-rcw/session-laws/)
- [privacy and copyright notice](https://leg.wa.gov/privacy-notice/)
- [general disclaimer](https://leg.wa.gov/disclaimer/)

The WSDL and legacy Word data-dictionary bytes were inspected in memory to
record their shape, size, and SHA-256. No raw WSDL, dictionary, provider
response, bill, document, person, contact field, or cache was persisted. No
service data operation, test page, form, account, contact, notification signup,
paid action, credential action, or terms-acceptance action was invoked.

## Current service and WSDL inventory

The catalog identifies nine services. Each current WSDL returned HTTP 200 over
HTTPS with content type `text/xml; charset=utf-8`.

| Service | Formal WSDL | Bytes | Unique operations | SHA-256 |
| --- | --- | ---: | ---: | --- |
| AmendmentService | [`amendmentservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/amendmentservice.asmx?WSDL) | 8,167 | 1 | `14e927bd01ce16e67c625fcc6332cbed93fa465dd591dbdb7a4b708f918d85ac` |
| CommitteeMeetingService | [`committeemeetingservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/committeemeetingservice.asmx?WSDL) | 18,998 | 3 | `6437645518193a61454e8e2e088ee45e3ca6b04ba02fa2fb122e217f90cf28f8` |
| CommitteeActionService | [`committeeactionservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/committeeactionservice.asmx?WSDL) | 100,162 | 17 | `c081b053bfeaaf45dd1442a3e7f651388bf98575d00d22d2061d19fdc5931fc7` |
| CommitteeService | [`committeeservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/committeeservice.asmx?WSDL) | 36,830 | 8 | `65d073f19f9d56ecad7e49c395c25a0f3f996798f702699b16d9a99620cc85fb` |
| LegislationService | [`legislationservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/legislationservice.asmx?WSDL) | 196,890 | 38 | `a432d52a01ddba46b65e42500b7eabea6f9c1e89647ff3f30ce1cca28e1a0719` |
| LegislativeDocumentService | [`legislativedocumentservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/legislativedocumentservice.asmx?WSDL) | 24,105 | 4 | `f91c9292eafcf75361672cfd689c6182b1bbed02e48422fa9027ab210d4ae5b8` |
| RcwCiteAffectedService | [`rcwciteaffectedservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/rcwciteaffectedservice.asmx?WSDL) | 13,517 | 2 | `2983af4ffd25a2a0fa1f7c09d433cc60594cafbe51fb1a7ad7b2e3b49a0369a8` |
| SessionLawService | [`sessionlawservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/sessionlawservice.asmx?WSDL) | 30,560 | 5 | `516a5f9938946b175c375fd4f83ff68b8ca3b0ac9bcbb4bc15a527f7d6bdfad2` |
| SponsorService | [`sponsorservice.asmx?WSDL`](https://wslwebservices.leg.wa.gov/sponsorservice.asmx?WSDL) | 20,302 | 4 | `0c74a4c84a09fecbc650e1d896d297f1f3a1cc86569e21f69646b916107abd6e` |

The WSDL query is the bare token `?WSDL`; `?WSDL=` is not equivalent and
currently produces the official error page. Any future documentation fetch
must construct the exact reviewed form.

All nine WSDLs:

- use target namespace `http://WSLWebServices.leg.wa.gov/`; this HTTP value is
  an XML namespace identifier, not permission to downgrade HTTPS transport;
- expose the same HTTPS `.asmx` address through SOAP 1.1, SOAP 1.2, HTTP GET,
  and form-encoded HTTP POST bindings;
- define SOAP document/literal messages over the standard SOAP HTTP transport;
- form SOAP actions as
  `http://WSLWebServices.leg.wa.gov/{operation-or-message-name}`;
- contain their schema inline and declare no external WSDL/XSD import;
- declare no WS-Security policy, API key, account, service-version value,
  cursor, pagination, quota, response-size bound, or typed `wsdl:fault`; and
- generally model array items as optional, unbounded, and nillable.

The overview describes SOAP request-response messages, but the formal WSDLs
also publish HTTP GET and form-POST bindings. Policy Sentinel should select one
reviewed SOAP binding rather than silently switching among transports. XML
parsing must prohibit DTDs, external entities, XInclude, and network
resolution.

## Legacy data dictionary

The catalog says it was last updated on 2006-11-13 and links a binary
Word 97-2003 [data dictionary](https://wslwebservices.leg.wa.gov/WebServiceDataDictionary.doc).
The file returned 113,664 bytes with SHA-256
`634b8bb98c4c685567038cea2686235380f5f0a4cba5302b97f1912e9d6c8563`.
Its server `Last-Modified` value was 2026-04-28, but that transport timestamp
does not establish that the contents were substantively updated.

The dictionary's displayed biennium list stops in 2007-08. It supplies useful
legacy field explanations and length hints, but the current WSDL:

- adds fields absent from the dictionary;
- spells current `AmendmentsExist` differently from the dictionary's
  `AmendmentExists`;
- contains the exact case-sensitive `Vote.VOte` typo; and
- places no `maxLength` facets on its strings.

The WSDL is therefore the current structural authority. Dictionary meanings
remain supporting, stale, non-exhaustive evidence and cannot be used as current
requiredness, bound, or vocabulary claims.

## Operation inventory

### LegislationService

The 38 operations cover:

- amendments by year or biennium;
- hearings, sponsors, roll calls, RCW cites, session-law chapter, current
  status, and legislation types;
- bill detail by biennium and bill number, or by request number;
- summary or detailed legislation by year, introduced-since time, or prefiled
  state;
- three status-change histories by bill number, bill ID, or date range;
- historical recap categories;
- chamber passage, legislative passage, enrollment, governor signed/veto/
  partial-veto, and house-of-origin states; and
- an untyped SharePoint-oriented bill-list `DataSet`.

The exact operation names are:

```text
GetAmendmentsForYear
GetAmendmentsForBiennium
GetHearings
GetLegislationByRequestNumber
GetRcwCitesAffected
GetSessionLawChapter
GetSponsors
GetRollCalls
GetCurrentStatus
GetLegislationTypes
GetTotalLegislationIntroducedByDateRange
GetLegislation
GetLegislationIntroducedSince
GetPrefiledLegislation
GetLegislativeStatusChangesByBillNumber
GetLegislativeStatusChangesByBillId
GetLegislationHistoricalRecapCategoriesByLegislationNumber
GetLegislativeStatusChangesByDateRange
GetLegislationByYear
GetLegislationInfoIntroducedSince
GetPreFiledLegislationInfo
GetHouseLegislationPassedHouse
GetHouseLegislationPassedSenate
GetSenateLegislationPassedSenate
GetSenateLegislationPassedHouse
GetLegislationPassedLegislature
GetLegislationPassedLegislatureWithinTimeFrame
GetLegislationPassedHouse
GetLegislationPassedSenate
GetLegislationGovernorSigned
GetLegislationGovernorVeto
GetLegislationGovernorPartialVeto
GetPublishedEnrolledLegislation
GetLegislationPassedHouseWithinTimeFrame
GetLegislationPassedSenateWithinTimeFrame
GetLegislationNotYetIntroducedInHouseOfOrigin
GetLegislationPassedOriginalBodyAndNotIntroducedInOppositeBody
GetLegislativeBillListFeatureData
```

The three status-change variants repeat the WSDL port-type operation name
`GetLegislativeStatusChanges` and rely on distinct message names and SOAP
actions. A future client must bind explicitly to the `ByBillNumber`,
`ByBillId`, or `ByDateRange` message; generic code generation may collide.

`GetDocumentClasses` returns `ArrayOfAnyType`.
`GetLegislativeBillListFeatureData` returns an inline .NET `DataSet`/diffgram.
Neither untyped surface belongs in the strict initial adapter.

### Other services

- AmendmentService: `GetAmendments`.
- CommitteeMeetingService: `GetCommitteeMeetings`,
  `GetRevisedCommitteeMeetings`, and `GetCommitteeMeetingItems`.
- CommitteeActionService: committee referral and executive-action operations,
  twelve source-status-specific committee report operations,
  `GetLegislationReportedOutOfCommittee`, and
  `GetLegislationScheduledHearingsByCommittee`.
- CommitteeService: current and biennium-specific House/Senate committee and
  committee-member operations.
- LegislativeDocumentService: `GetDocumentsByClass`, `GetDocuments`,
  `GetDocumentClasses`, and `GetAllDocumentsByClass`.
- RcwCiteAffectedService: `GetLegislationAffectingRcwCite` and
  `GetLegislationAffectingRcw`.
- SessionLawService: session law by bill, bill ID, or initiative; bill by
  chapter; and chapters by year.
- SponsorService: House, Senate, combined sponsor, and requester operations by
  biennium.

This inventory does not make every operation necessary or safe for the first
adapter. The initial contract should use the smallest reviewed subset that can
prove bill/version identity, exact source status/history, sponsors, committees,
documents, and enacted/effective/veto metadata without loading unrelated
personal or free-text content.

## Biennium and historical coverage

The [official bills page](https://leg.wa.gov/bills-meetings-and-session/bills/)
defines a legislative biennium as a two-year period beginning in an
odd-numbered year and says a bill number is associated with that bill for one
biennium. Operation prose uses strings such as `2005-06`. The WSDL itself
declares these inputs as optional strings and supplies no regex, odd-year rule,
minimum, maximum, or enumeration. Repository request builders must require and
validate the canonical `YYYY-YY` form independently.

Historical evidence is field- and surface-specific:

- LegislativeDocumentService explicitly says its four operations have
  information back to `1991-92`;
- Detailed Legislative Reports says its report data is available back to
  1991;
- the LegislationService WSDL and operation help do not publish an earliest
  supported biennium for all legislation, status, sponsor, committee, or
  session-law fields; and
- the separate session-law archive reaches 1854, but it is a link-first
  publication source, not proof that the LWS SessionLawService covers that
  range.

The old blanket “1991-92 to present for LWS” claim is therefore withdrawn.
Before a production adapter makes a range claim, bounded live validation must
measure the earliest and latest successful biennium separately for every
required operation and disclose documented, selected, and actual emitted
ranges.

## Request and response schema

Important current WSDL structures include:

| Structure | Reviewed fields |
| --- | --- |
| `LegislationInfo` | `Biennium`, `BillId`, `BillNumber`, substitute and engrossed version integers, exact legislation type, original chamber/agency, active flag, display number |
| `Legislation` | the summary identity plus fiscal/appropriation/request flags, short and long descriptions, request, introduction date, current status, sponsor string and prime-sponsor ID, legal title, companions |
| `LegislativeStatus` | `BillId`, source `HistoryLine`, `ActionDate`, opposite-body amendment, partial-veto, veto, amendment-exists flags, and exact source `Status` |
| `SessionLaw` | chapter, year, legislative session/number, effective date, multiple-effective-date flag, bill identity/biennium/title, veto flags, legislation-type ID |
| `LegislativeDocument` | names, biennium, description, exact type/class, HTML/PDF URLs and separate create/last-modified dates, `BillId` |
| `Amendment` | bill identity, session, type, floor number/action/date, sponsor/drafter strings, description, document-exists flag, HTML/PDF URLs, agency |
| committee structures | committee/action/referral/recommendation identities and labels, meeting and hearing dates, cancellation/revision state, member signatures |
| roll-call structures | bill/biennium/chamber, motion, sequence, vote date, counts, member list, exact vote enum |
| `RcwCiteAffected` | exact RCW citation and source action label |

Strings and complex fields are generally `minOccurs=0`. Integers, booleans, and
date-times are generally `minOccurs=1`. Arrays are generally optional and
contain zero or more nillable items with no maximum. This is formal schema
metadata, not proof of live omission, null, default-value, empty-array,
ordering, uniqueness, or maximum behavior.

Notable inconsistencies include:

- `GetLegislationByYear` takes `year: xsd:int`, while its help prose
  incorrectly says the input is a `2005-06` biennium;
- one CommitteeService description misspells `biennium`;
- the bill-number status-change help says “current status” even though its
  inputs include a date range and its output is an array;
- `Vote.VOte` has anomalous case; and
- current WSDL fields differ materially from the old dictionary.

Every required, optional, nullable, empty, missing, malformed, duplicate,
ordering, size, and identifier rule remains a synthetic-contract requirement
and then a bounded live-canary question.

## Identity, versions, dates, and history

`GetLegislation` takes biennium plus numeric bill number and returns an array
because substitute or engrossed versions can appear separately. `BillId`,
`SubstituteVersion`, `EngrossedVersion`, legislation type, original
chamber/agency, active state, and display number must survive as distinct
source concepts.

The WSDL does not document:

- `BillId` syntax, cross-biennium uniqueness, reuse, reassignment, deletion, or
  tombstones;
- stable ordering or duplicate behavior in version arrays;
- whether active status identifies one and only one version;
- how companions affect identity;
- whether current status and status history reconcile completely; or
- correction and disappearance behavior.

A stable Policy Sentinel identity must include source, canonical biennium, and
the validated source bill/version identity. It must not be inferred by parsing
a display string before live evidence establishes the rule.

Distinct source dates include introduction, status action, floor action,
hearing/meeting/revision, referral, document HTML/PDF create and last modified,
session-law effective, and vote dates. The WSDL uses `xsd:dateTime` but states
no time zone, precision, daylight-saving, sentinel/default, or inclusivity
rules. No date may be converted into legal-effect or deadline advice.

`GetLegislationIntroducedSince` covers introductions, not every later mutation.
The status-change operations cover selected status history, while document,
committee, amendment, vote, and session-law changes have separate retrieval
surfaces. LWS publishes no unified complete change inventory or response-level
data-as-of time. A weekly refresh must reconcile independent operation results
and may not treat an introduced-since call as a complete incremental feed.

## Subjects, taxonomy, and Nation evidence

None of the nine WSDLs exposes a bill subject or topic service/field.
Descriptions, legal titles, document classes/types, historical recap
`Category`, committees, RCW citations, sponsors, and status/action prose are
not substitutes.

The separate official Topical Index says Code Reviser indexers assign maintained
subject headings to bills. No documented stable bulk or machine interface for
those assignments was found. It requires a separate source contract before any
exact-label taxonomy mapping. Until then:

- `officialSubjectMappings` is empty;
- all LWS records are `Unclassified`; and
- no keyword, title, description, committee, sponsor, geography, RCW cite, or
  recap category may populate taxonomy.

The same fields cannot prove a Nation relationship. State legislation remains
`general_jurisdiction` unless an official record explicitly names a Nation and
the exact evidence and URL are retained. The unresolved Nation-to-state
crosswalk also means LWS cannot decide which Nations receive Washington
coverage.

## Privacy and field allowlist

The WSDLs expose fields that exceed Policy Sentinel's public purpose:

- sponsor/member phone, email, first name, and last name;
- committee phone;
- meeting address, city, state, ZIP, and contact information;
- amendment drafter and other person strings;
- member signatures and roll-call member names;
- meeting notes, descriptions, and other open text; and
- untyped `any`/diffgram content.

The initial adapter must structurally reject unknown extensions and discard
contact, address, testimony/participation, note, and unrelated person-profile
fields before normalization. It may retain only the minimum official
sponsor/member identity and legislative role required by the public record
contract, without phone, email, address, biography, or profile content.

## Authentication, rates, runtime, and limits

The LWS overview offers the service free of charge to interested parties. The
current WSDL, service pages, and sample request shapes declare no API key,
account, token, authorization header, or security policy. Documentation GETs
returned no authentication challenge. The documents do not promise that
unauthenticated access is permanent.

No numeric quota, pagination contract, row cap, maximum date range, concurrency
limit, request/response byte limit, timeout, retry policy, or backoff rule is
published. The support policy says response performance varies with requested
date ranges, concurrent access, and network capacity and asks consumers to
avoid requesting more data than necessary.

Browser runtime use is forbidden regardless of observed transport behavior.
Documentation responses did not include an
`Access-Control-Allow-Origin` header, but CORS observations are not a contract
in either direction. All future retrieval remains bounded, low-concurrency,
build-time work with repository byte, item, date-window, timeout, and request
budgets.

## Cadence, availability, changes, and faults

LWS describes its data as real-time and aims for 24/7 availability. It also:

- expects temporary outages;
- makes no performance or response-time guarantee;
- prioritizes services needed to operate the Legislature;
- promises reasonable support effort, not resolution;
- gives production-change notice 30 days in advance only when possible and may
  make accuracy/completeness-critical changes sooner;
- supports only the current service version and treats backward compatibility
  as best effort; and
- may change staging without notice.

Receiving change notices requires third-party contact and supplying contact
information; that action remains closed and was not taken.

The technical overview and service pages say invalid, null, empty, malformed
biennium, processing, and unexpectedly missing singular results can produce
SOAP faults. The WSDL declares no typed faults. Exact SOAP version, HTTP status,
fault code, actor/role, detail body, transient/permanent classification,
partial-result behavior, retryability, timeout, and outage-health signaling
remain live-canary questions. A parser must treat malformed XML, unexpected
envelopes, unknown fields, duplicate identities, partial required-operation
success, and unbounded payloads as failures.

## Use, attribution, and reproduction

The overview says the service is free and intended to make legislative
information available, but also says its policy content is not a legally
binding agreement and may change. No separate LWS automated-use license,
redistribution grant, or required attribution statement was found.

The Legislature's privacy/copyright notice warns that site content can include
third-party copyrighted material and recommends obtaining permission help. The
general disclaimer disclaims accuracy, reliability, and timeliness. Official
document help permits viewing, saving, printing, and sending HTML and describes
PDFs as official line-for-line copies, but does not grant blanket
republication rights.

Policy Sentinel therefore:

- attributes metadata to `Washington State Legislature`;
- links the official HTML/PDF supplied by the source;
- retains no full text or excerpt pending document-specific rights review;
- never describes website or LWS metadata as certified legal advice; and
- keeps session-law/RCW archival publication rights separate from LWS access.

## Repository contract and safe failure decision

The researched source registry entry remains disabled with `adapter: null`.
No public artifact record, coverage row, or source-health row is emitted for a
disabled source.

The next adapter checkpoint should prove, using impossible synthetic data:

- canonical HTTPS endpoint and SOAP action allowlists;
- exact operation-specific request shapes and biennium/date bounds;
- SOAP 1.1 or 1.2 envelope, namespace, message-name, result, and fault parsing;
- bill/biennium/version identity, exact status/history, sponsors, committees,
  documents, distinct dates, session-law/effective/veto fields, missing values,
  duplicates, and bounds;
- strict field allowlists excluding personal/contact and untyped content;
- keyless official URL hygiene;
- `general_jurisdiction`, empty Nation evidence, no subjects/mappings, and
  `Unclassified`; and
- source-level health and checksum-validated last-known-good behavior.

The current normalized record schema has no first-class bill-version/rendition
collection, veto model, RCW/session-law relationship type, or structured
biennium boundary. The current artifact health and LKG state is source-level,
not operation- or biennium-level. Until a versioned schema decision adds those
dimensions, source-contract evidence must not be forced into unrelated public
fields, and any required operation/biennium failure must conservatively
fail/degrade Washington LWS as a whole.

There is no deployed last-known-good Washington LWS shard. Before one exists,
any failed or incomplete refresh omits the source. A future source-unavailable
public notice also requires the separate planned-source disclosure mechanism;
disabled registry entries are not present in the current artifact.

## Live-only questions for the adapter checkpoint

A bounded no-auth live canary must still establish:

1. exact SOAP envelope, content type, action, response, empty-result, and fault
   behavior for the selected binding;
2. supported biennia and earliest/latest successful range per required
   operation rather than one all-LWS range;
3. required, optional, missing, empty, nil, default, unknown, and malformed
   field behavior;
4. bill, version, document, status, committee, sponsor, and session-law
   identity, uniqueness, ordering, and reconciliation;
5. date time zones, precision, sentinel values, inclusive boundaries, and
   concurrent-update behavior;
6. complete refresh design despite unbounded arrays and the absence of a
   unified mutation feed or pagination;
7. response sizes, item counts, latency, timeouts, and conservative request
   budgets;
8. document link hosts, redirects, stability, authentication, and format/date
   behavior;
9. personal/contact and free-text field behavior despite the broad schemas;
10. transport and application failure precedence, transient classification,
    and source-health/LKG policy; and
11. whether a stable official machine interface exists for Topical Index
    assignments under a separately reviewed source contract.
