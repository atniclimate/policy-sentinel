# Source coverage

Status: Phase A coverage contract, updated 2026-07-31. Policy Sentinel will show records only after a source adapter, provenance rules, and the actual loaded range pass validation. This document does not claim that data has already been ingested.

## Public beta geography

- The selector contains all 575 federally recognized Nations from the current annual BIA recognition list.
- Public policy-source coverage is federal plus Washington, Oregon, and Idaho.
- A Nation outside Washington, Oregon, or Idaho receives federal records only and this notice: **“State and county source coverage in this beta is limited to Washington, Oregon, and Idaho. Results for this Nation currently show federal sources only.”**
- A state or federal record that does not explicitly name the selected Nation may appear only as **General jurisdiction**. It must not be described as Nation-specific.
- County records require an exact Nation mention in the official record and a stored evidence passage/field plus official URL. Location, territory, maps, land records, and keyword matches are never relationship evidence.
- Official Tribal-government documents are opt-in source registries governed by the publishing Nation's authority and terms. They do not enlarge the implied coverage of other Nations.
- Municipal and city sources, private agreements, non-official Tribal materials, maps, parcels, and all public land-context data are outside the beta.

The Nation-to-Washington/Oregon/Idaho crosswalk is not yet approved. Recognition, a mailing address, or TLD map geometry does not prove a Nation's policy geography. Until a reviewed source supplies that crosswalk, the implementation must not silently decide which state notice applies.

## Planned coverage matrix

Ranges below describe what primary sources make available, not a promise that every item in the range is present. Each public source row must display its own `verified_from`, `verified_through`, `data_as_of`, `retrieved_at`, health, and limitations from the built artifact.

| Jurisdiction / source family | Primary source and observed source range | Beta treatment | Confidence / release condition |
|---|---|---|---|
| Nation baseline | [2026 annual recognition notice](https://www.federalregister.gov/documents/2026/01/30/2026-01899/indian-entities-recognized-by-and-eligible-to-receive-services-from-the-united-states-bureau-of): exactly 575 federally recognized Nations; annual plus interim corrections under [73 IAM 3](https://www.bia.gov/sites/default/files/dup/assets/public/raca/manual/pdf/73-iam-3_indian-entities-list_final_signed_508.pdf). | Selector names and approved aliases only. No contacts, addresses, or geometry. Stable internal IDs must survive annual name corrections. | **High for recognition count; unresolved for state crosswalk.** Release requires hard-count, duplicate, correction, and alias review. |
| Federal legislation | [Congress.gov coverage](https://www.congress.gov/help/coverage-dates) is field-specific: actions/summaries/policy areas generally 1973-present; bill text generally 1993-present; legislative subjects generally 2009-present. GovInfo bills generally start with the 103rd Congress and public/private laws with the 104th. | Proposed, active, committee, enacted, and historical bills/laws. Exact official policy-area/subject mappings only. Older records remain searchable and may have fewer fields. | **High within documented field ranges after API-key approval.** No single “complete since” date may be shown for all fields. |
| Federal Register / executive and regulatory notices | [Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1): documented from 1994; first observed issue 1994-01-03. [GovInfo Federal Register](https://www.govinfo.gov/help/fr): 1936-present official editions. The [2026-07-31 review](source-reviews/federal-register-api-2026-07-31.md) verified a current 10,000-result search window. | Notices, proposed/final rules, executive actions, and implementation material. Use conservative date slices below 2,000 records for compatibility, preserve exact corrections/relationships, and pair informational API discovery with verified GovInfo links where available. | **High for documented ranges after adapter validation.** The source remains disabled until G-J contract, count, history, provenance, health, and artifact tests pass. |
| Regulations.gov | [Regulations.gov v4](https://open.gsa.gov/api/regulationsgov/) exposes current dockets/documents; no single guaranteed historical start or completeness statement was found. | Later docket/document enrichment. No public comments. Actual earliest/latest dates are calculated per successful build. | **Medium.** API-key approval, contract tests, and measured-range disclosure required. |
| Federal grants | [Grants.gov API](https://www.grants.gov/api/api-guide) covers searchable active/forecast opportunities; historical completeness is not promised. | Active/forecast funding opportunities and exact deadlines/status. Tribal eligibility is a general source-defined basis, not proof of relevance to a named Nation. | **High for current results; low/unknown for history.** Show measured range and required attribution. |
| U.S. Supreme Court / federal courts | [Supreme Court opinions and bound volumes](https://www.supremecourt.gov/opinions/boundvolumes.aspx) are primary; GovInfo [USCOURTS](https://www.govinfo.gov/help/uscourts) is selected/incomplete and generally 2004-present. Official Library of Congress U.S. Reports fill selected earlier Supreme Court history. | Curated Supreme Court landmarks first; selected federal decisions with court/docket/reporter/status provenance. No claim of comprehensive federal litigation coverage. | **High for individual verified opinions; low for corpus completeness.** Slip/substitute/bound status must be tracked. |
| DOI administrative decisions | [IBIA chronological index](https://www.doi.gov/oha/organization/ibia/Chronological-Index-of-Decisions): 1970-present. IBLA dispositive-order access is principally 2007-present and is a separate source. | Curated administrative decisions, exact official citations and links. | **High for indexed IBIA decisions; source-specific elsewhere.** |
| Washington legislation | [Washington LWS](https://wslwebservices.leg.wa.gov/): 1991-92 biennium to present for documented services. [Session Laws](https://leg.wa.gov/state-laws-and-rules/state-laws-rcw/session-laws/) extend to 1854 through a separate archive. | LWS supplies the normalized current/historical legislative stream. Pre-LWS session laws are link-first unless a record meets landmark criteria. No category assignment without an exact official mapped label. | **High for LWS range; medium for older archive metadata.** Contract/count tests required. |
| Washington rules and executive material | [Washington State Register](https://leg.wa.gov/state-laws-and-rules/washington-state-register/): 1978-present archive. | Register notices and rules through a document adapter; exact loaded range shown. | **Medium pending file/index continuity tests.** |
| Washington accords | GOIA publishes the [1989 Centennial Accord](https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord) and related official materials. | Small reviewed landmark registry. General-jurisdiction/landmark only until an official signed copy or official signatory list supports each Nation association. | **High for the accord page and date; unresolved for complete signatory evidence.** |
| Oregon legislation | [Oregon OData](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx): observed structured sessions from 2007-present. OLIS website archives cover 1995-2006 separately; earlier material is archive/link-first. | Structured records only after the Acceptable Use Agreement gate. Older material is listed/linked and source-range labeled; no opaque scraper. | **Technically high, operationally blocked** until owner-approved agreement/credential handling. |
| Oregon rules | [Oregon Administrative Rules publications](https://sos.oregon.gov/archives/administrative-rules/Pages/publications-reports.aspx) provide current rules and Oregon Bulletins; an exact continuous historical range has not yet been verified. | Source-specific current rules/rulemaking adapter after archive measurement. | **Medium.** Publish only measured ranges; do not infer completeness from the current index. |
| Oregon courts | [Oregon appellate publications](https://www.courts.oregon.gov/publications/Pages/default.aspx) provide digital opinions principally from January 1998-present. Earlier official access is not a uniform, free digital corpus. | Official appellate opinions with exact publication status; earlier records link-first when an official primary copy is available. | **High for individual verified files; medium for range completeness.** |
| Idaho legislation | Official session pages expose online legislation approximately 1998-present, but no official stable API/feed/bulk contract was found. | No automated beta records until a structured official path or written permission exists. Display the Idaho legislative-source gap rather than silently scrape HTML. | **Blocked source contract.** |
| Idaho rules and executive material | [Idaho Administrative Rules](https://adminrules.idaho.gov/latest-bulletins/): monthly bulletin archive 1995-present, annual code archive 1996-present, executive orders in the bulletin. | Source-specific document adapter can proceed independently from blocked Idaho legislation. | **Medium-high after continuity and document-rights validation.** |
| Idaho courts | [Idaho appellate opinions](https://isc.idaho.gov/appeals-court/opinions) provide current and archived Supreme Court/Court of Appeals opinions; dependable online coverage is principally from the mid-2010s. | Official opinions only. Court staff summaries are metadata aids, not the opinion. | **High per verified opinion; medium/low for historic completeness.** |
| Tribal-government documents | No central official corpus or common date range. Coverage begins and ends per approved Nation-owned or officially designated publication source. | Small allowlisted pilots; metadata/link-first where reproduction terms are unclear. Non-public and unofficial documents are excluded. | **Source-specific.** Each registry entry requires authority, terms, range, cadence, and correction contact review. |
| County policies/ordinances | No common source or range. Coverage exists only for individually verified official final records that explicitly name a Nation. | Reviewed records with exact mention evidence. No geographic, land, or keyword inference. | **Record-specific only.** An agenda or search result is discovery, not sufficient evidence. |

## Historical-range model

Every generated source manifest must carry:

- source identifier and issuing authority;
- documented source range, with citation and confidence;
- actual earliest and latest validated record in the artifact;
- field-specific ranges where a field starts later than the source;
- retrieval time, source update time when supplied, and data-as-of time;
- health state (`healthy`, `degraded`, `unavailable`), last success, and failure reason;
- known omissions, pagination ceilings, terms gates, and whether older material is link-only.

The interface and dossier use these values directly. “All years” means all validated years for the selected sources, never universal historical coverage. A failed refresh keeps last-known-good data with the prior data-as-of date and a visible freshness warning; a first-run failure shows the source as unavailable and contributes no records.

## Historic and landmark treatment

Before 1980, non-landmark records are normally listed with exact citation, date, source metadata, and official link rather than expanded summaries.

A record is landmark-eligible only when:

1. it is a documented treaty, court decision, statute, or public state/federal intergovernmental accord;
2. an official primary identifier, date, status, and official source link are verified;
3. it meets written inclusion criteria based on its documented role, or an official source identifies it as foundational; and
4. any Nation-specific association has separate exact official evidence.

Selection as a landmark is editorial metadata with written provenance, not a legal conclusion or rights-impact finding.

Two researched examples illustrate the rule:

- The Centennial Accord's [official GOIA text](https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord) supports its 1989 date and public state-Tribal accord status. The page does not provide sufficient evidence to attach every current Washington Nation, so Nation links await a signed instrument or official signatory list.
- For the Boldt litigation, an official online copy of the original 1974 district-court decision was not located in Phase A. Record the reporter citation, *United States v. Washington*, 384 F. Supp. 312 (W.D. Wash. 1974), and link an official copy only when verified. The later U.S. Supreme Court decision is available in the official [443 U.S. 658 volume PDF](https://tile.loc.gov/storage-services/service/ll/usrep/usrep443/usrep443658/usrep443658.pdf). Do not substitute commercial or unofficial text for the missing primary copy.

## Visitor-facing coverage behavior

- The coverage matrix is available from every search route and records the active source set and actual ranges.
- Result cards show `why shown`: **Explicit Nation reference**, **General jurisdiction**, **Landmark**, or another exact source-defined basis.
- A selected Nation never changes a general record into a Nation-specific record.
- `Unclassified and other records` remains searchable by official title, source, jurisdiction, and permissible official text/index.
- Dossiers repeat the selected Nation/policy criteria, generated time, data-as-of times, sources, source-health warnings, historical limitations, and not-legal-advice notice.
- No count, empty result, or missing source is described as proof that no relevant policy exists.
