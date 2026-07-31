# Washington State Register source and reproduction review

Accessed: 2026-07-31

Implementation state: researched in source-registry 1.8.0; registered disabled
with `adapter: null`; no production records

External authorization: none required for the reviewed public pages and files

Activation state: closed. A narrow build-time metadata-and-links contract is
plausible, but the repository does not yet contain its parser, transport,
normalizer, health receipt, or last-known-good integration.

## Primary sources

- [Washington State Register](https://leg.wa.gov/state-laws-and-rules/washington-state-register/)
- [Official Register description](https://leg.wa.gov/media/gp4bdjsf/description.htm)
- [2026-2027 closing-date and publication calendar](https://leg.wa.gov/media/04cbinv3/closing-date-calendar.pdf)
- [Official-publication statement](https://leg.wa.gov/media/lklg25lk/officialstatement.htm)
- [Specialty-publications statement](https://leg.wa.gov/media/hgqfipwp/specialtypublications.htm)
- [Issue index](https://lawfilesext.leg.wa.gov/law/wsr/WsrByIssue.htm)
- [Filing-type index for 2026](https://lawfilesext.leg.wa.gov/law/wsr/2026/WSRDocsByType26.htm)
- [Official identifier and action key](https://leg.wa.gov/media/vvxb5flh/keytotable.htm)
- [WAC 1-21-040, filing schedule](https://app.leg.wa.gov/WAC/default.aspx?cite=1-21-040)
- [WAC 1-21-170, rulemaking forms](https://app.leg.wa.gov/WAC/default.aspx?cite=1-21-170)
- [RCW 34.08.020, Register contents](https://app.leg.wa.gov/RCW/default.aspx?cite=34.08.020)
- [RCW 34.08.040, legal and evidentiary effect](https://app.leg.wa.gov/RCW/default.aspx?cite=34.08.040)
- [RCW 34.08.905, 1978 effective date](https://app.leg.wa.gov/RCW/default.aspx?cite=34.08.905)
- [Legislature disclaimer](https://leg.wa.gov/disclaimer/)
- [Legislature privacy and copyright notice](https://leg.wa.gov/privacy-notice/)

The Register landing page identifies the Register as the official publication
for state-agency rulemaking and says the certified PDF documents on the Code
Reviser site are official. The official-publication statement says the Code
Reviser maintains every filed document and can certify originals. That does
not establish that every original or historical filing is available through
one online surface.

RCW 34.08.020 establishes a broader content boundary than rules alone. Register
issues can include proposed and adopted rules, executive orders, emergency
proclamations, public-meeting notices, court rules, and other material. A
Register section or agency label therefore cannot by itself establish a
document's normalized type or legal effect.

## Publication eligibility

The official description says the Register is distributed on the first and
third Wednesdays of each month. The annual calendar separately identifies
filing cutoffs, publication dates, hearing dates, and first-action dates. A
filing cutoff, certification timestamp, URL appearing online, or landing-page
“current through” date is not the issue's publication date.

This distinction was material on the access date:

- the landing page and issue index exposed issue `26-15`;
- a `26-15` grouped PDF was already accessible and certified on 2026-07-30;
- the official calendar schedules issue `26-15` for publication on
  2026-08-05; and
- the same calendar identifies issue `26-14` as published on 2026-07-15.

As of 2026-07-31, `26-14` is therefore the latest safely eligible issue.
Future retrieval must bind issue eligibility to a reviewed official publication
calendar and reject a page or filing whose scheduled publication is after the
build time. It must not infer publication from availability.

## Archive surfaces and range

The official issue index currently exposes 49 year rows, from 1978 through
2026. The structure is not uniform:

| Period or surface | Reviewed boundary |
|---|---|
| 1978-1996 | Primarily issue-level PDFs in the separate `1978-1996` directory. A uniform filing-level machine contract was not found. |
| 1997 forward | Annual alphabetical index links are available, but the current-year index is cumulative and mutable. |
| 2000 forward | Annual filing-type index surfaces are available. |
| Through issue 05-18 | The reviewed issue route is an issue PDF. |
| Issue 05-19 forward | The issue index says grouped-by-agency filing pages are available. |
| Current annual WAC/WSR table | Organized by filing year, which is not necessarily publication year. |
| Historical scanned filings | Explicitly excludes electronically filed documents and is not a comprehensive discovery source. |

The source registry leaves `coverage.from` null rather than turning a year-only
archive observation into an exact date. The documented archive begins with
1978 material, but the first exact publication date and a safe uniform
record-level contract remain unestablished. A first adapter must declare the
exact scheduled issue or issue range it actually loaded and must not advertise
1978-present record completeness.

Observed recent routes, not a documented API schema, follow these patterns:

```text
/law/wsr/YYYY/II/YY-II.htm
/law/wsr/YYYY/II/YY-II-NNN.htm
/law/wsrpdf/YYYY/II/YY-II-NNN.pdf
/law/wsr/YYYY/II/YY-IITYPE.pdf
```

The reviewed indexes emit `http://` links even though the same
`lawfilesext.leg.wa.gov` resources are available over HTTPS. Any future
transport must construct and validate the reviewed HTTPS form internally; it
must never follow or publish a plaintext link merely because the page emitted
one.

No official RSS, Atom, XML, JSON feed, documented public API, pagination
contract, checksum, schema version, or change-notification mechanism was
located.

## Identifiers, stages, and dates

The official key says the WSR number identifies the issue and its final serial
identifies the document. Real identifiers are not limited to
`YY-II-NNN`: `05-24-099A` is a distinct official filing from `05-24-099`.
Future parsing must preserve the exact source identifier and cover
letter-suffixed forms with evidence rather than a guessed grammar.

An issue page can repeat the same WSR identifier on multiple agency rows.
Those rows are not automatically distinct filings. Exact-ID deduplication is
required, and repeated rows must agree on every retained value. The enclosing
issue can also contain a holdover filing whose WSR identifier names an earlier
issue, so issue-page location cannot replace document identity.

Reviewed issue sections include:

| Code | Source description |
|---|---|
| `PREP` | Preproposal |
| `PROP` | Proposed |
| `EXPE` | Expedited |
| `PERM` | Permanent |
| `EMER` | Emergency |
| `MISC` | Miscellaneous |

WAC 1-21-170 separately identifies forms including CR-101, CR-102, CR-103P,
CR-103E, CR-104, and CR-105. Section codes and forms are source stages, not a
complete lifecycle model and not deterministic taxonomy subjects.

Dates require field-specific treatment:

- scheduled issue publication comes from the official annual calendar;
- a filing date/time is optional because reviewed filings can omit the usual
  `[Filed ...]` line;
- permanent and emergency indexes can expose an effective date, but it must be
  retained only where the reviewed source explicitly supplies it;
- a hearing date is not an effective date or deadline unless the source says
  so; and
- WAC 1-21-040 says the governing rule controls if a calendar conflicts.

No date is inferred from a URL, issue number, certification stamp, page order,
or neighboring filing.

## Corrections, relationships, and completeness

The reviewed sources do not provide a complete public correction-history or
rulemaking-case feed. WAC 1-21-008 allows prepublication correction or
withdrawal through the Code Reviser. Other governing provisions allow
continuances, withdrawal, supplemental notice, emergency refiling, and
different effective-date behavior.

Each filing must therefore remain one source document and source stage.
Relationships may be created only from an explicit, reviewed source statement
such as a specific prior WSR reference, withdrawal, replacement, or adoption
under notice. Agency, WAC number, title words, date proximity, or issue
co-location cannot create a relationship.

An individual HTML page can also contain a Reviser's Note pointing elsewhere
for the full material. Such a note disproves the assumption that each page is
a complete filing. Until a bounded contract handles that condition, the
candidate must fail closed rather than expose partial text or claim a complete
official rendition.

The `MISC` section is heterogeneous. A filing associated with the Governor is
not necessarily an executive order. An executive action requires an exact
source heading and identifier; agency label, `MISC`, topic words, or publisher
identity are insufficient.

## Proposed allowlist and prohibited content

A future metadata-and-links contract may retain only:

- exact WSR identifier;
- exact source heading or title when a reviewed structural field supplies it;
- exact source agency label without treating it as a stable agency ID;
- issue identifier and scheduled publication date;
- reviewed section/type and form labels;
- explicit filed, hearing, or effective dates with their source labels;
- exact official HTML and certified-PDF links;
- explicit, typed WSR relationships that pass reciprocal and identity checks;
- retrieval time and field-level provenance; and
- validation state.

Individual filings routinely contain personal names, postal addresses, phone
numbers, email addresses, hearing links and passcodes, free text, and sometimes
geographic or land-related detail. Raw HTML/PDF bodies, contact fields,
comments, hearing credentials, unrelated free text, maps, and land content
must never enter the repository, normalized records, artifacts, logs, or
failure messages.

No exact official subject mapping was validated. All future records remain
`Unclassified`. State records remain `general_jurisdiction` with no Nation
association unless the exact individual official source supplies separately
validated Nation evidence. Keywords, the source agency, geography, WAC
coverage, or a generic reference to Tribes cannot create an association.

## Reproduction and attribution

The Legislature privacy/copyright notice says the site may contain
third-party copyrighted material and recommends obtaining permission for
reuse. No WSR bulk-reuse license, full-text republication permission, API terms,
or mandatory attribution wording was located. The disclaimer also disclaims
accuracy, reliability, and timeliness warranties.

The current decision is therefore:

- metadata and exact official links only;
- descriptive attribution to
  `Washington State Register / Washington State Code Reviser's Office`;
- no excerpt or full-text reproduction;
- no retained provider corpus; and
- no inference that public availability supplies republication rights.

## Transport, cadence, health, and failure

Public reviewed pages required no account, key, form submission, terms
acceptance, or paid request. No numeric rate limit, retry policy, SLA,
response-size promise, or provider backoff contract was published.

A future adapter must be build-time only and use a repository-owned exact
origin/path allowlist, no redirect, one low-concurrency attempt per bounded
request, strict HTML/PDF media types, byte/item/issue/deadline ceilings, and
sanitized failures. It must not depend on CORS or make browser-side requests.

`washington-state-register` is an independent source-health and
last-known-good boundary. It must not share a shard with Washington LWS or the
Governor's executive-order index. A failed refresh may use only that source's
checksum-validated prior public shard; without one, omit it and mark it
unavailable after activation. Disabled sources do not appear in public
coverage or health.

## Implementation decision

The smallest defensible next increment is a current-calendar, published-issue,
metadata-and-links contract for issue `05-19` or later. Synthetic tests must
cover at least:

- a published issue and a future-but-online issue;
- duplicate and conflicting duplicate WSR rows;
- a letter-suffixed identifier;
- an optional filing timestamp;
- a holdover filing whose ID names another issue;
- a Reviser's Note or incomplete rendition;
- explicit and absent source relationships;
- a `MISC` Governor record that is not an executive order;
- unsafe hosts, plaintext links, unknown types, malformed dates, and
  byte/item/time limits; and
- complete privacy-field and raw-body exclusion.

The uniform 1978-present PDF/OCR problem, complete correction history, stable
agency identity, full-text rights, and complete executive-order recognition
remain separate unresolved contracts. Registry 1.8.0 therefore records this
source as disabled with `adapter: null`.
