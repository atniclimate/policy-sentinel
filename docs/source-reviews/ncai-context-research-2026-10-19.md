# NCAI context: federal courts, legislation and regional state research

Access date: 2026-10-19. Eleven independent research lanes examined Supreme
Court sources; Ninth Circuit sources; GovInfo courts; Washington; federal
dockets/libraries; Oregon/Idaho; Alaska; California; Montana/Nevada; public-topic
case leads; and federal legislative libraries. An additional independent review
found no substantiated Must/Should finding in the local change. This is a demo
source-reference expansion, not an
engine source activation or an NCAI resolution-to-policy crosswalk.

## Implemented boundary

The existing NCAI panel gains GovInfo searches for published federal bill and
resolution versions, public slip laws, and opinions from courts in the Ninth
Circuit. Each uses the selected draft's existing hand-picked terms only when
the reader presses its button. Research did not access or reseal private drafts.
For D-108 publication, the existing vault CLI subsequently read its approved
private input for the counts-only release scan; no terms were exposed or resealed.

The seven-state directory follows the owner's scope in PLAN milestone 5:
Washington, Oregon, Idaho, Alaska, California, Montana and Nevada. The reader
chooses the state; sponsor, geography and committee never choose it. Policy and
court terms are available to copy into external manual searches. Static links
use `noopener noreferrer`, with no automatic requests, embedding, previews,
search strings, telemetry or new Worker hosts. External sites can log searches
the reader submits there. State results and court schedules are not ingested.
Neither links nor text matches establish relevance, legal effect, current law,
Nation association, ATNI membership or an NCAI position.

The original [court-reference review](court-opinion-references-2026-10-19.md)
continues to govern CourtListener and NILL links. The registry, engine contracts,
expired acquisition profiles and existing source gates are unchanged. Selected
engine build range is none; newly emitted engine records are zero.

## GovInfo: the integrated route

Current primary documentation:
[USCOURTS](https://www.govinfo.gov/help/uscourts),
[USREPORTS](https://www.govinfo.gov/help/usreports),
[BILLS](https://www.govinfo.gov/help/bills),
[PLAW](https://www.govinfo.gov/help/plaw),
[operators](https://www.govinfo.gov/help/search-operators),
[search API](https://www.govinfo.gov/features/search-service-overview), and
[policies](https://www.govinfo.gov/about/policies).

USCOURTS is selected, incomplete federal appellate/district/bankruptcy/national
court coverage, generally since 2004. Court-location state filters would miss
Ninth Circuit appellate records, whose state can be N/A; the new regional
search uses the documented `circuit:9`. Packages identify cases and granules
identify opinions; the existing Worker preserves both in document identifiers.
No calendar, complete docket, finality or subsequent-treatment contract exists.
USREPORTS is the separate historical Supreme Court collection; the retained
review documents volumes 2 through 586, ending in 2018.

BILLS provides published versions from the 103rd Congress (1993–1994);
PLAW provides public/private slip laws from the 104th (1995–1996). The new
public-law preset adds `lawtype:public`. A proposed bill, enacted slip law and
current amended code are distinct. This slice returns metadata and official
links, not opinion or statute text.

The documented operator precedence evaluates AND before OR. The previous
`collection:USCOURTS AND <words>` allowed an OR alternative to escape the
collection. Every generated collection query now wraps its topic expression
in parentheses. A synthetic regression failed before this repair and passed
afterward.

Five no-retry calls through the existing approved demo Worker passed at
18:44:59–18:45:01 UTC. No key was read, registered or moved. Each returned ten
records, all in its requested collection, with official GovInfo detail URLs:

| Query | Reported matches | Observed identity |
| --- | ---: | --- |
| `collection:USCOURTS AND (tribal OR consultation)` | 158529 | 10 package/granule pairs |
| `collection:USREPORTS AND (tribal OR consultation)` | 1359 | 10 package/granule pairs |
| `collection:USCOURTS AND circuit:9 AND (tribal)` | 5078 | 10 package/granule pairs |
| `collection:BILLS AND (tribal)` | 23138 | 10 package identifiers |
| `collection:PLAW AND lawtype:public AND (tribal)` | 614 | 10 package identifiers |

Counts are dated provider match counts, not numbers of cases or coverage proofs.
The retained response shape is the existing synthetic DemoCitation fixture:
`sourceId`, `identifier`, `title`, `issuingBody`, `kind`, `date`, `officialUrl`,
`textUrl`, `retrievedAt`, `summary`, `textAvailable`, `matchKey`. No response
bodies or real captions were retained. All five exposed `continuation.kind=more`;
no second page was requested. The circuit field itself is not returned by the
Worker: documentation plus successful query acceptance verifies the route, not
an independent audit of every result's circuit assignment.

Authentication remains the existing Worker secret. Numeric API limits in the
prior review were not refreshed. Browser-provider CORS is unnecessary. Existing
timeouts, cursor validation and unavailable-versus-empty behavior are unchanged.
Government works and embedded third-party material have different reuse rights;
no new body redistribution, personal/contact fields or raw docket narrative is
introduced. Engine GovInfo qualification and key gates remain separate.

## Official federal rulings and schedules

| Source | Evidence checked and link-only disposition |
| --- | --- |
| Supreme Court | [2026 opinions](https://www.supremecourt.gov/opinions/slipopinion/26), [orders](https://www.supremecourt.gov/orders/ordersofthecourt/26), [docket search](https://www.supremecourt.gov/docket/docket.aspx), [calendars/lists](https://www.supremecourt.gov/oral_arguments/calendarsandlists.aspx). Date, docket, caption, revision and publication fields are distinct. Slip opinions and orders are mutable; volume/part placeholders are not permanent reporter citations. Docket documentation describes coverage from the 2001 Term. Calendar PDFs and individual dockets were not opened. |
| Ninth Circuit | [Official court](https://www.ca9.uscourts.gov/) and [privacy policy](https://www.ca9.uscourts.gov/privacy-policy/). Navigation identifies decisions/cases/hearings; direct discovery/calendar contracts remain unverified. Further direct access stopped on the policy's express monitoring-consent wording. No conclusion that monitoring grants reuse permission. The retained direct-opinion profile expired 2026-10-15; historical catalog labels do not renew it. |
| W.D. Washington | [Today's calendar](https://www.wawd.uscourts.gov/calendar/today) exposes time/case/judge columns and warns of changes. No calendar rows, party details or judges are retained. |
| D.D.C. | [Calendar directory](https://www.dcd.uscourts.gov/court-calendars) links daily/date-range surfaces. Downstream CM/ECF and media endpoints were not examined. |
| Other courts/PACER | [Official court directory](https://www.uscourts.gov/about-federal-courts/court-role-and-structure/court-website-links) is navigation, not national schedule coverage. [PACER opinion information](https://pacer.uscourts.gov/find-case/court-opinions) distinguishes free opinions for registered users from paid docket/search access. No account or PACER operation was used. |

The Supreme Court [robots policy](https://www.supremecourt.gov/robots.txt)
specifies a one-second crawl delay and disallows `/rss/`, `/images/` and `/cdn/`.
No RSS connector is proposed. Its [notices](https://www.supremecourt.gov/policies/web_policies_and_notices.aspx)
and [privacy policy](https://www.supremecourt.gov/policies/privacy_notice.aspx)
describe monitoring/request logging, not a bulk-reproduction contract. New
transport rates, CORS, terms/reuse, cancellation/time-zone semantics and refresh
contracts remain unknown or unqualified for calendar ingestion. A scheduled
event is not proof of occurrence, disposition, finality or continued listing.

## State source notes

All entries are external manual discovery. Unknown API/rate/CORS/reuse contracts
remain unknown; no public-field ingestion allowlist beyond resource labels and
URLs is approved. Failed requests were not retried. Source-specific health or
last-known-good shards are not created by a directory link.

| State | Official source surfaces and known limits |
| --- | --- |
| Washington | [Bill topical index](https://app.leg.wa.gov/bi/topicalindex), [document search](https://leg.wa.gov/search), [RCW](https://apps.leg.wa.gov/rcw/), [WAC](https://apps.leg.wa.gov/wac/), [opinions](https://www.courts.wa.gov/opinions/), [Supreme Court calendar](https://www.courts.wa.gov/appellate_trial_courts/supreme/calendar/) checked. No documented keyword-prefill URL was established. Opinion help supports manual words/phrases/case numbers, dates, court and publication selection. Slip opinions can change. The [court notice](https://www.courts.wa.gov/?fa=home.notice) discloses search-term logging; the [legislative notice](https://leg.wa.gov/privacy-notice/) distinguishes third-party copyright. Existing LWS discovery and appellate citation/revision gates remain closed. |
| Oregon | [Legislative information](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx), [Supreme Court](https://www.courts.oregon.gov/publications/sc/Pages/default.aspx), [Court of Appeals](https://www.courts.oregon.gov/publications/coa/Pages/default.aspx), [rules](https://sos.oregon.gov/archives/administrative-rules/pages/default.aspx) are retained locators, not refreshed. No Oregon request was made. Separate OData agreement/credential, OJD, OARD and Governor access/reuse gates remain closed; no alternate-host workaround. Prior observations (OData 2007 onward; separate older OLIS archive) are not complete or current coverage. |
| Idaho | [Supreme Court](https://isc.idaho.gov/cases-opinions/isc-opinions) has keyword/year/type controls and separates staff summaries from opinions; [appeals index](https://isc.idaho.gov/cases-opinions/ica-opinions) is a retained locator. [Sitemap](https://isc.idaho.gov/sitemap) exposes calendar navigation; target not verified. [Rules](https://adminrules.idaho.gov/) reports a document-search issue, with rules since 1996/Bulletins since 1995 declared. [2026 legislation](https://legislature.idaho.gov/sessioninfo/2026/legislation/) was tool-blocked and stays labeled unverified. Stable legislative automation, appellate citation/revision and ICAR 32 bulk-use evidence remain missing. |
| Alaska | [Court calendar](https://courts.alaska.gov/trialcourts/calendars.htm) and [regulation overview](https://ltgov.alaska.gov/information/regulations/) retrieved. [Appellate directory](https://courts.alaska.gov/appellate/), [library](https://courts.alaska.gov/library/aklegal.htm), [bills/laws](https://www.akleg.gov/basis/Home/BillsandLaws) had indexed official support but direct availability was not established. Library links to separately operated case-law search; no downstream contract checked. Calendar updates/change warnings are not case-status evidence. |
| California | [Bill search](https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml), [codes](https://leginfo.legislature.ca.gov/faces/codes.xhtml), [published opinions](https://courts.ca.gov/opinions/publishedcitable-opinions), [Supreme Court calendar](https://supreme.courts.ca.gov/case-information/oral-arguments/oral-arguments-calendar) are official indexed/referenced locators; direct requests failed. Indexed [Judicial Council terms](https://courts.ca.gov/es/node/33320) state access/use acceptance and prohibit bots/data mining; further court access stopped. Published and unpublished collections remain distinct. No automatic request or opinion copy is authorized. |
| Montana | [Bill Explorer](https://bills.legmt.gov/) returned its app shell; interactive search untested. [Code](https://mca.legmt.gov/bills/mca/index.html) labels its edition 2025, updated August 2026. [Clerk](https://courts.mt.gov/clerk/) and [daily orders/opinions](https://courts.mt.gov/external/orders/dailyorders) provide docket/document navigation. No complete range, calendar or reuse contract established. |
| Nevada | [Legislative search](https://www.leg.state.nv.us/Site/Search/search.html), [NRS](https://www.leg.state.nv.us/nrs/), [appellate court](https://nvcourts.gov/supreme), [calendar](https://nvcourts.gov/calendar) retrieved. General legislative website search uses Google; bill/session searches differ. Appellate opinions link to ACIS, not an approved ingestion interface. No individual hearing/currentness check. |

Existing state reviews in this directory and `nationwide/` remain retained
evidence, not superseded source approval. New adapters need individual bounded
contracts for identity/version/date fields, privacy, reuse, lifecycle, failures,
fixtures and source-isolated health. Neither parent-court location nor a state
selection establishes an exact Nation relationship.

## Research libraries and public-topic case leads

Federal legislative research also has two later integration candidates:
[GovInfo USCODE](https://www.govinfo.gov/help/uscode) describes a virtual
collection from 1994 onward, while [STATUTE](https://www.govinfo.gov/help/statute)
is the Statutes at Large collection from volume 1 (1789); its collection code is
`STATUTE`, not `STAT`. The [Office of the Law Revision Counsel downloads](https://uscode.house.gov/download.html),
[currency](https://uscode.house.gov/currency.html) and
[classification tables](https://uscode.house.gov/classification/tables.html)
separate code editions from amendments awaiting classification. The checked
currency page reported Public Law 119-121, October 9, 2026. None of these routes
was query-tested or added to the panel: edition, currency and document identity
need a bounded check before presenting results. The official
[CRS product directory](https://www.congress.gov/crs-products) was blocked and
was not retried. No inferred reuse permission or mirror workaround follows.

[CourtListener](https://wiki.free.law/c/courtlistener/help/api/rest/v4/search)
documents the existing outward opinion (`type=o`) and RECAP (`type=r`) searches.
Its [coverage](https://wiki.free.law/c/courtlistener/help/data-coverage/federal-cases-and-filings)
does not guarantee every filing, a current docket or future hearing information.
No token/API operation was used. [NILL bulletins](https://www.narf.org/nill/bulletins/)
provide selective federal/state Indian-law discovery, normally weekly; their
[policy](https://www.narf.org/nill/bulletins/about.html) does not promise complete
coverage. Current bulletin targets returned no extractable content. NILL is not
the issuing court; no Tribal-law or bulletin collection/republication is added.

The following are manual research leads for the public water, forestry/Roadless
Rule and funding topics already in STATUS. They are not mapped to encrypted
NCAI drafts, placed in application records, or assessed for legal effect. No
opinion bodies, counsel contacts, party enrichment or sensitive land details
are retained. Later proceedings, current status and schedules are unverified.

| Case lead | Dated metadata evidence and uncertainty |
| --- | --- |
| State of Alaska v. USDA | D.C. Circuit 17-5260, decision 2021-11-16; [GovInfo indexed opinion header](https://www.govinfo.gov/content/pkg/USCOURTS-caDC-17-05260/pdf/USCOURTS-caDC-17-05260-0.pdf). Official [Federal Register indexed notice](https://www.govinfo.gov/content/pkg/FR-2021-11-23/pdf/2021-25467.pdf) places this docket in Roadless Rule history. Index evidence only; PDFs not opened. |
| Climate United Fund v. Citibank, N.A. | D.D.C. 1:25-cv-00698; [GovInfo package](https://www.govinfo.gov/app/details/USCOURTS-dcd-1_25-cv-00698), citation date 2025-04-16. Indexed metadata; direct extraction was empty. Date is not an independently verified filing time; no specific Tribal-program relationship established. |
| National Council of Nonprofits v. OMB | D.D.C. 1:25-cv-00239-LLA, document 30, filed 2025-02-03; [indexed memorandum header](https://www.govinfo.gov/content/pkg/USCOURTS-dcd-1_25-cv-00239/pdf/USCOURTS-dcd-1_25-cv-00239-0.pdf) identifies OMB M-25-13 and federal assistance. General funding-process lead only; PDF not opened. |
| Swinomish Indian Tribal Comm'y v. Department of Ecology | Washington Supreme Court 87672-0, filed 2013-10-03; [court metadata sheet](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.showOpinion&filename=876720MAJ) directly checked and listed by [Ecology's water-case index](https://www.ecology.wa.gov/water-shorelines/water-supply/water-rights/case-law). Court warns of revision for publication. No Nation-association field created. |
| Squaxin Island Tribe v. Department of Ecology | Washington Court of Appeals II, 42710-9, filed 2013-11-13; [court metadata sheet](https://www.courts.wa.gov/opinions/index.cfm?fa=opinions.showOpinion&filename=427109MAJ) directly checked and listed by the same Ecology index. Revision warning remains; docket is not a reporter citation. No Nation-association field created. |

## Next bounded work

Local verification: 71 focused NCAI/frontend tests, typecheck, lint,
format:check and the source-boundary scan passed. Synthetic Chromium 153.0.8010.12 exercised eight
browser check groups, including keyboard navigation, seven manual state choices,
explicit GovInfo activation, desktop/narrow axe scans (zero violations) and
no horizontal overflow. Four viewport screenshots were inspected. The first
run found undersized federal-directory links; the existing link spacing rules
were extended to the NCAI lists, then the checks passed. No automatic provider
request, page error or private-vault access occurred. Browser evidence and failed
harness/accessibility receipts are retained outside the publication directory.
Real-vault and non-Chromium acceptance remain unverified. D-108 subsequently
authorized release checks and publication; current state is in [STATUS.md](../STATUS.md).

Publication validation also reuses `checkNcaiDrafts` inside the existing
counts-only artifact scan. It rejects generated queries beyond the Worker's
200-character limit without printing the draft or query. A synthetic regression
failed before the guard and passed afterward; all 75 vault tests passed. The
real release scan checked 81 drafts and 17 runtime files with zero plaintext
hits and no overlength generated queries. A stale search-count expectation in
the first full run was corrected; that failed run remains separate evidence.

Prioritize a separately qualified official opinion or schedule contract over a
general scraper. Washington's existing demo bill-reference reader can follow
manual topic discovery; integrated Washington topic search still requires its
own permitted interface. Oregon terms, Idaho structured legislative access,
California automation restrictions and CourtListener credentials remain separate
gates. Calendar ingestion also needs cancellation, time-zone, event-date,
source-update and privacy rules. Do not convert these research findings into
claims of live state coverage or automatic case monitoring.
