# Washington Legislative Web Services contract review

Status: current primary-source research and repository-owned synthetic
known-bill and year-enumeration-candidate contracts complete; source remains
disabled with `adapter: null`; one known-bill exchange was reduced to aggregate
evidence and no provider content or public record was persisted

Access date: 2026-07-31

## Decision

Washington Legislative Web Services (LWS) is a public, no-registration
SOAP/XML interface. A repository-owned contract now covers a bounded
six-operation known-bill slice and one disabled synthetic year-enumeration
candidate, but it is not yet a complete local build-time adapter: broader live
response behavior, complete refresh discovery, normalization, provenance,
health, and last-known-good behavior remain unresolved. The official material
does not require an account or key and does not identify an access-triggered
terms action. No credential or terms-acceptance gate is therefore opened by
this review.

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

The following extracted sequence is the durable repository evidence for
contract version 1.1. `?` means WSDL `minOccurs=0`; unmarked fields have
`minOccurs=1`. `[]?` means an optional array wrapper whose items are
`0..unbounded` and nillable. Field order below is schema order, not a proposed
display order.

| WSDL structure | Exact field sequence and XML Schema type |
| --- | --- |
| `ShortLegislationType` | `ShortLegislationType?: string`; `LongLegislationType?: string` |
| `LegislationInfo` | `Biennium?: string`; `BillId?: string`; `BillNumber: int`; `SubstituteVersion: int`; `EngrossedVersion: int`; `ShortLegislationType?: ShortLegislationType`; `OriginalAgency?: string`; `Active: boolean`; `DisplayNumber?: string` |
| `LegislativeStatus` | `BillId?: string`; `HistoryLine?: string`; `ActionDate: dateTime`; `AmendedByOppositeBody: boolean`; `PartialVeto: boolean`; `Veto: boolean`; `AmendmentsExist: boolean`; `Status?: string` |
| `Companion` | `Biennium?: string`; `BillId?: string`; `Status?: string` |
| `Legislation` after inherited `LegislationInfo` | `StateFiscalNote: boolean`; `LocalFiscalNote: boolean`; `Appropriations: boolean`; `RequestedByGovernor: boolean`; `RequestedByBudgetCommittee: boolean`; `RequestedByDepartment: boolean`; `RequestedByOther: boolean`; `ShortDescription?: string`; `Request?: string`; `IntroducedDate: dateTime`; `CurrentStatus?: LegislativeStatus`; `Sponsor?: string`; `PrimeSponsorID: int`; `LongDescription?: string`; `LegalTitle?: string`; `Companions?: ArrayOfCompanion[]?` |
| `LegislativeEntity` | `Id: int`; `Name?: string`; `LongName?: string`; `Agency?: string`; `Acronym?: string` |
| `Sponsor` after inherited `LegislativeEntity` | `Type?: string`; `Order: int`; `Phone?: string`; `Email?: string`; `FirstName?: string`; `LastName?: string` |
| `Committee` after inherited `LegislativeEntity` | `Phone?: string` |
| `CommitteeReferral` | `LegislationInfo?: LegislationInfo`; `Committee?: Committee`; `ReferredDate: dateTime` |
| `LegislativeDocument` | `Name?: string`; `ShortFriendlyName?: string`; `Biennium?: string`; `LongFriendlyName?: string`; `Description?: string`; `Type?: string`; `Class?: string`; `HtmUrl?: string`; `HtmCreateDate: dateTime`; `HtmLastModifiedDate: dateTime`; `PdfUrl?: string`; `PdfCreateDate: dateTime`; `PdfLastModifiedDate: dateTime`; `BillId?: string` |
| `SessionLaw` | `ChapterNumber: int`; `Year: int`; `LegislativeSession?: string`; `LegislatureNumber: int`; `EffectiveDate: dateTime`; `MultipleEffectiveDates: boolean`; `BillId?: string`; `Biennium?: string`; `BillTitle?: string`; `PartialVeto: boolean`; `Veto: boolean`; `LegTypeId: int` |

The selected operation messages are also pinned independently of implementation
constants:

| Operation | HTTPS service path | Request sequence | Result |
| --- | --- | --- | --- |
| `GetLegislation` | `/legislationservice.asmx` | `biennium: string`; `billNumber: int` | optional `ArrayOfLegislation` |
| `GetLegislationByYear` | `/legislationservice.asmx` | `year: int` | optional `ArrayOfLegislationInfo` |
| `GetLegislativeStatusChangesByBillId` | `/legislationservice.asmx` | `biennium: string`; `billId: string`; `beginDate: dateTime`; `endDate: dateTime` | optional `ArrayOfLegislativeStatus` |
| `GetSponsors` | `/legislationservice.asmx` | `biennium: string`; `billId: string` | optional `ArrayOfSponsor` |
| `GetCommitteeReferralsByBill` | `/committeeactionservice.asmx` | `biennium: string`; `billNumber: int` | optional `ArrayOfCommitteeReferral` |
| `GetDocuments` | `/legislativedocumentservice.asmx` | `biennium: string`; `namedLike: string` | optional `ArrayOfLegislativeDocument` |
| `GetSessionLawByBillId` | `/sessionlawservice.asmx` | `biennium: string`; `billId: string` | optional singular `SessionLaw` whose fields occur directly in the result element |

Each SOAP action is the target namespace
`http://WSLWebServices.leg.wa.gov/` followed by the exact operation name.
The WSDL SHA-256 inventory above binds these extracted tables to the inspected
official documents; the tests independently pin every selected endpoint/action
and at least one required and optional field rule in each returned structure.

Notable inconsistencies include:

- `GetLegislationByYear` takes `year: xsd:int`, while its help prose
  incorrectly says the input is a `2005-06` biennium;
- one CommitteeService description misspells `biennium`;
- the bill-number status-change help says “current status” even though its
  inputs include a date range and its output is an array;
- `Vote.VOte` has anomalous case; and
- current WSDL fields differ materially from the old dictionary.

Structural requiredness, optional omission, `xsi:nil`, empty/missing results,
field duplication/order, size, and request-identity echoes are pinned by the
synthetic contract and remain bounded live-canary questions. Record-level
identity, uniqueness, and duplicate semantics are deliberately not inferred:
the response layer preserves repeated items until live evidence establishes a
source-specific identity rule.

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
remain live-canary questions. The current parser treats malformed XML,
unexpected envelopes, unknown or duplicate structural fields, request/response
identity-echo mismatch, and unbounded payloads as failures. It preserves
successful `missing` and `empty` result states and repeated operation items
without calling them failures or deduplicating them. A later adapter must not
normalize or publish repeated items until bounded live evidence establishes
their identity semantics; transport faults or unusable required evidence still
fail the refresh.

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

Contract version 1.1 selects SOAP 1.1 over HTTPS, retains exactly six known-bill
operations:

- `GetLegislation`;
- `GetLegislativeStatusChangesByBillId`;
- `GetSponsors`;
- `GetCommitteeReferralsByBill`;
- `GetDocuments`; and
- `GetSessionLawByBillId`.

It adds `GetLegislationByYear` only as a disabled population-enumeration
candidate. The official
[`GetLegislationByYear` operation page](https://wslwebservices.leg.wa.gov/legislationservice.asmx?op=GetLegislationByYear),
reviewed 2026-07-31, describes summary information for all bills active during
a year and separate substitute versions. Its formal SOAP member is
`year: xsd:int`, while its help prose incorrectly says a `2005-06` biennium.
The wire type wins: the contract accepts only a bounded integer and never
coerces a biennium string.

The request contract uses an exact endpoint and SOAP-action allowlist, exact
operation parameters, canonical biennia, bounded identifiers, and a maximum
31-day normalized-UTC status window. Its low-level year validator accepts only
integers from 1799 through 3999 so impossible synthetic input remains possible;
the separate refresh capability records only 2025 and 2026 as reviewed initial
canary candidates and does not claim that either is supported. No live
enumeration entry point exists. The operation-descriptor allowlist is frozen at
both levels at runtime, and the flat XML limit policy is runtime-frozen, so an
importing consumer cannot mutate endpoint paths, wrapper names, item caps, or
parser budgets. Decision D-025 records the explicit build-time `saxes@6.0.0`
dependency. XML bytes are bounded before strict UTF-8 decoding and
namespace-aware event parsing. The parser rejects XML 1.1, DTDs, non-predefined
entity declarations, processing instructions, comments, CDATA,
XInclude/unknown namespaces, SOAP 1.2, SOAP headers, unexpected
elements/attributes, mixed content, partial documents, and responses above
versioned byte, depth, node, attribute, scalar, aggregate-text, collection, and
URL limits.

The response contract enforces the reviewed WSDL sequence and requiredness for
all seven operations, distinguishes missing, empty, present, and sanitized
fault results, and retains typed bill/version, year-enumeration identity,
status, sponsor, committee, document, session-law, effective-date, and veto
evidence. It discards sponsor and
committee contact fields plus reviewed free-text fields from the returned
projection, rejects unknown or duplicate structural fields and
`xsi:nil="true"` resources, and accepts `xsi:nil="false"` as non-nil. Every
response is parsed with its canonical originating request and any explicit
response identity echo must agree. Repeated operation items are preserved
because provider uniqueness rules remain unverified. Document links are
accepted only in the conspicuous repository-owned
`/synthetic/3785-86/SYNTHETIC-*.(html|pdf)` fixture shape; no live rendition
host or path has been approved. Provider fault code, text, actor text, and
detail content are not returned; the DTO exposes only a generic fault category
and bounded presence flags.

Repository fixtures use impossible biennium `3785-86`, bill number `999991`,
and `SYNTHETIC-*` identifiers. The manifest binds every one of the six
representative responses and the separate SOAP fault by filename, operation,
role, and SHA-256. It also lists exact prohibited contact sentinels; loading
proves those values are present in the digest-bound inputs before reporting
that they are absent from the returned projection. The reviewed fixture bundle
requires those exact seven repository resources, marks provider identity
behavior unverified, labels its inventory as fixture inventory rather than
provenance, and fixes governance at `general_jurisdiction`, empty Nation
evidence, no official subjects or taxonomy memberships, and `Unclassified`.
Repository attributes pin every Washington fixture XML file to LF bytes so
Windows checkout conversion cannot silently invalidate the reviewed digests.
The bundle is a test loader for exact repository fixtures, not an aggregate
production rule: the lower response contract separately preserves legitimate
missing or empty results.

The versioned refresh-capability matrix records why those six operations cannot
discover a population or form a unified mutation feed. Its complete exported
graph is runtime-frozen, including point-operation entries and seed arrays, the
selected candidate, formal request entries, and reviewed canary years:

| Known-bill operation | Required prior seed | Bounded scope |
| --- | --- | --- |
| `GetLegislation` | biennium and bill number | one known-bill snapshot |
| `GetLegislativeStatusChangesByBillId` | biennium, bill ID, and date window | status history for one known bill only |
| `GetSponsors` | biennium and bill ID | sponsors for one known bill only |
| `GetCommitteeReferralsByBill` | biennium and bill number | referrals for one known bill only |
| `GetDocuments` | biennium and exact document-name input | one known document-name lookup only |
| `GetSessionLawByBillId` | biennium and bill ID | session-law lookup for one known bill only |

Each has `populationDiscovery: none`. Numeric bill-range probing is forbidden,
and bill-specific status windows are not a complete change inventory.
`GetLegislationInfoIntroducedSince` is not a terminal alternative: its sole
`sinceDate` input has no end bound or biennium partition, its returned
`LegislationInfo` has no introduced date with which to reconcile cutoff
membership, and it cannot discover later status, document, committee,
amendment, vote, session-law, correction, deletion, or disappearance changes.

The year-enumeration fixture is deliberately separate from that one-bill
bundle. It uses impossible year `3785`, four synthetic `LegislationInfo` rows,
sparse optionals, two versions sharing a bill number, and one exact repeated
row. Its separate manifest binds the one XML resource by SHA-256 and fixes
population completeness as not established, historical completeness as not
documented, no unified mutation feed, forbidden numeric bill scanning,
`general_jurisdiction`, empty Nation/subject/mapping evidence, and
`Unclassified`. The parser preserves its order and exact duplicate and rejects
nil items, malformed or unknown structure, missing required fields, and a
2,049th item rather than truncating the 2,048-item repository budget. Any
present returned biennium must independently be canonical odd-year `YYYY-YY`
within 1799 through 3999, and every returned bill number must remain within 1
through 999,999.

That selection is a bounded, restartable year-keyed query candidate, not a
partition or completeness decision. LWS documents no pagination, total, row
cap, terminal marker, response data-as-of value, deletion signal, ordering,
uniqueness, cross-year overlap behavior, prefile coverage, or request-year echo.
The contract therefore does not infer a returned biennium from the integer
request year; the independent biennium and bill-number source-value bounds are
not an identity echo. It also does not deduplicate rows, select an active
winner, treat `Active` as legal status, or use legislation type, original
agency, display number, or version flags for taxonomy, Nation evidence, legal
effect, eligibility, or jurisdiction. The one aggregate canary did not
establish that the fixed-year response fits the current byte/item/schema
boundaries, and even a structurally accepted response could not establish
annual or biennial exhaustiveness.

The generic repository network transport remains enabled only for the six
known-bill operations. Its module-private exhaustive default-deny decision
rejects `GetLegislationByYear` years 3785, 2025, and 2026 before resolving or
calling `fetch`. A separately reviewed direct helper owns the one fixed 2025
canary request, accepts only transport dependencies, and reaches the private
prepared-request core; it takes no request, year, URL, header, mode, or bypass
flag, reduces the typed result inside `transport.ts`, returns only a frozen
closed aggregate, and is omitted from the general Washington contract barrel.
No exported function returns the yearly request, receipt, or items. The fixed
yearly helper has now run exactly once; no request, receipt, typed provider
result, or raw body was retained.
The transport constructs each enabled reviewed request internally. Its policy
and sanitized error-code allowlist are runtime-frozen, preventing changes to
its accepted media type, user agent, chunk ceiling, deadline, attempt count, or
error vocabulary. It makes one credential-free attempt, refuses automatic
redirects and a changed
or empty final URL, requires HTTP 200, accepts only `text/xml` with no charset
or UTF-8 and either no `Content-Encoding` or `identity`, and applies a single
30-second deadline using cancellation during retrieval and monotonic
elapsed-time checks before and after bounded parsing. The body must be between
1 byte and 2 MiB in at most 4,096 non-empty chunks and is parsed immediately.
Every response-byte buffer retained by the transport is zeroed before release;
unread bodies or remainders are canceled, and no response-byte buffer is
returned or persisted. Non-200 bodies are canceled unread; therefore this
boundary makes no claim about their SOAP-fault content or retryability. Errors
expose only repository-defined categories, an optional numeric HTTP status,
and static messages.

The repository also has a manual aggregate-only observer. Its first internally
fixed scenario uses `GetLegislation`, biennium `2025-26`, and bill number
`1001`. The official
[HB 1001 page](https://app.leg.wa.gov/billsummary?BillNumber=1001&Year=2025),
reviewed 2026-07-31, identifies `HB 1001 - 2025-26`, its current version, and
activity in both regular sessions. The Legislature's
[bill guidance](https://leg.wa.gov/bills-meetings-and-session/bills/), reviewed
the same day, says each bill number is associated with one legislative
biennium and defines a biennium as the two-year period beginning in an
odd-numbered year. These public HTML pages establish a low-scope current
known-bill input; they do not establish the LWS response contract.

Report contract 1.1 adds the exact nonnumeric
`--execute --scenario legislation_by_year_v1` command. It maps only to the
fixed 2025 helper; the help text and report expose no request year. Either exact
three-argument scenario authorizes at most one sequential request attempt with
no retry and accepts no dynamic bill, biennium, year, date, URL, header, output,
environment, logger, or persistence value. The complete per-scenario policy is
runtime-frozen and binds operation, item ceiling, optional-field count, date
allowance, and identity-evidence semantics. The scenario executor is
module-private, omitted from the general Washington contract barrel, and
callable only after the exact command path succeeds.

The report records execution authorization separately from the actual
zero-or-one request count. The launcher disables `.env` loading. The report is
cloned to a plain-data snapshot before exact-key runtime validation and
serialization. The known-bill shape retains its bounded item, optional-field,
and date-shape aggregates. The yearly shape contains only returned-item count,
whether that count is below or at the 2,048-item repository limit, aggregate
null/value counts across the five optional top-level fields, accepted
HTTP/byte aggregates, and a timing bucket. Fixed interpretation markers label
the response a single bounded response and leave request-year echo, uniqueness,
ordering, completeness, active winner, historical range, and production
viability unassessed. Neither shape can contain the request year, transport
receipt, typed result items, identifiers, provider strings, exact dates,
URLs/hosts, raw XML, error text, stack, cause, or partial aggregate. Missing,
empty, present, sanitized HTTP-200 fault, and rejected transport outcomes
remain distinct. Expectation success requires one attempted, HTTP-200, present,
non-empty, structurally accepted response; it does not establish any fixed
non-assessment dimension.

Before either scenario's first execution, its observer checkpoint made no
corresponding LWS bill/data request and retained no provider response.

## First aggregate live-canary evidence

The fixed observer ran once on 2026-07-31. It made one request with no retry and
reported a successful HTTP 200 response in under one second; declared and
received sizes were both 1,877 bytes. The SOAP result was present with one item,
and the reviewed request-identity echo fields were accepted. Of the ten
allowlisted optional top-level fields, one was null and nine had values. Two
date lexemes were observed; both lacked a timezone and fractional seconds, and
neither used UTC nor an explicit offset. No raw XML, typed response item,
provider string, exact date, request content, or network error was printed or
persisted.

This establishes only that the selected SOAP 1.1 endpoint, action, response
envelope, transport constraints, parser, and identity-echo checks interoperated
for one current known-bill request. It does not establish which optional field
was absent, date-zone or instant semantics, field requiredness across records,
ordering, uniqueness, historical operation ranges, empty-result or fault
behavior, complete discovery, or another operation's binding. Date values must
therefore remain source lexical values and must not be converted to UTC until a
separate official semantic basis exists.

## First yearly-discovery aggregate evidence

The exact `legislation_by_year_v1` command ran once on 2026-07-31 for its
internally fixed `GetLegislationByYear(2025)` request. It made one request with
no retry and returned its one closed report without persistence. The report
recorded execution authorization, one request attempt, zero retries, elapsed
time under one second, HTTP 200, `outcome: rejected`, `expectationMet: false`,
no SOAP observation, null declared and received byte fields, and the
repository-owned failure category `invalid_soap`.

`invalid_soap` is emitted only after the response passes the preceding reviewed
HTTP status, media-type, content-encoding, nonempty bounded-body, stream-chunk,
declared-length, and deadline checks and then fails the bounded SOAP parser. The
category intentionally collapses all parser failures. It does not distinguish
provider XML or schema behavior, an unsupported response variant, source
contract drift, a repository contract mismatch, a parser defect, a collection
or field limit, or another rejected SOAP-contract condition. The null byte
fields are deliberately undisclosed by the rejected-report privacy shape, not
evidence that the response had no body. No raw XML, response byte, transport
receipt, typed item, identifier, provider string, exact date, request value,
parse detail, or response body was printed or persisted.

The attempt produced neither an accepted SOAP success nor an accepted SOAP
fault. It supplies no result-state, item-count, optional-field, budget-state,
request-year-echo, returned-biennium, ordering, uniqueness, active-version,
completeness, historical-range, source-health, or production-viability
evidence. HTTP 200 alone does not establish SOAP contract fit. The operation
remains disabled, source-registry 1.8.0 retains `adapter: null`, and this exact
scenario must not be retried under the current ledger.

`GetDocuments` remains deliberately unreachable: the current parser accepts
only the impossible synthetic document-link shape, so actual rendition hosts
and paths require a separately reviewed in-boundary classifier before a live
document scenario can be useful.

The checkpoint does not enumerate a complete bill population, establish live
requiredness or URL hosts, normalize a `PolicyRecord`, emit provider retrieval
evidence, implement source health, or create a checksum-validated
last-known-good shard. Those are later adapter work, not implied by the
synthetic contract or transport.

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

## Remaining live questions for the adapter checkpoint

Bounded no-auth evidence must still establish or narrow:

1. empty-result and fault behavior for the selected binding, plus exact
   request/response behavior for each other required operation;
2. supported biennia and earliest/latest successful range per required
   operation rather than one all-LWS range;
3. required, optional, missing, empty, nil, default, unknown, and malformed
   field behavior;
4. bill, version, document, status, committee, sponsor, and session-law
   identity, uniqueness, ordering, and reconciliation;
5. date-zone meaning for the now-observed timezone-absent lexemes, precision,
   sentinel values, inclusive boundaries, and concurrent-update behavior;
6. the exact cause of the yearly parser rejection and a complete refresh design
   despite unbounded arrays and the absence of a unified mutation feed or
   pagination;
7. response sizes, item counts, latency, timeouts, and conservative request
   budgets;
8. document link hosts, redirects, stability, authentication, and format/date
   behavior;
9. personal/contact and free-text field behavior despite the broad schemas;
10. transport and application failure precedence, transient classification,
    and source-health/LKG policy; and
11. whether a stable official machine interface exists for Topical Index
    assignments under a separately reviewed source contract.
