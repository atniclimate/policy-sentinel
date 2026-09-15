# Makah demo scout report C3: regulatory and legislative material

Accessed: 2026-09-15

Prepared under the Makah demo launch packet
([`docs/handoffs/makah-demo-fable-5.1-launch-prompt.md`](../../handoffs/makah-demo-fable-5.1-launch-prompt.md)),
Track C3. A task-assigned read-only scout produced the raw findings; the lead
opened every kept URL on 2026-09-15 and, for Federal Register documents, read
the GovInfo official-edition PDF page directly.

Implementation state: research report only; no source registry entry,
adapter, record, copied text, Nation association or public artifact output.
The four disabled Washington contracts and the closed Federal Register review
are the starting map; nothing here reactivates them.

External authorization: none requested or granted. Boundary observation for
the owner: the scout retrieved document metadata through FederalRegister.gov's
keyless public JSON endpoints because the HTML pages returned a bot-check
redirect. Those were read-only research reads, not product-runner operations;
no bytes were retained, no ledger request was consumed, and the closed FR-A1
identifier was not issued. The lead's verification used GovInfo PDFs instead.

## Reconciliation summary

| Scout item | Lead verification | Disposition |
| --- | --- | --- |
| FR 2024-12669 final rule | GovInfo PDF page 51600 read; 89 FR 51600, June 18, 2024, NMFS, names Makah Indian Tribe | Kept |
| FR 2019-06337 proposed rule | GovInfo PDF page 13604 read; 84 FR 13604, April 5, 2019, names Makah Indian Tribe | Kept |
| FR 2026-09372 OCNMS notice | GovInfo PDF pages 25865 to 25866 read; 91 FR 25865, May 12, 2026; page 25866 names the Makah Tribe and the 1855 Treaty of Neah Bay | Kept |
| FR 2015-20888 HEARTH Act approval | GovInfo PDF page 51836 read; 80 FR 51836, August 26, 2015, BIA, names Makah Indian Tribe | Kept |
| FR 2011-27947 OCNMS regulations | Not opened by the lead; scout could not confirm Makah naming | Listed as `secondary_only` |
| NOAA Fisheries action page | Opened (also in C2) | Kept |
| RCW 43.376, 70A.65.305, 36.70A.210, 36.70A.040; WAC 173-26-221 | Each section page opened; none names the Makah Tribe | Kept as general_jurisdiction |
| Centennial Accord page | Already reviewed 2026-07-31; not re-opened | Cross-referenced only |
| Centennial Accord Agency Highlights, WDFW policy, Ecology 1706027 PDFs | Unreadable to the scout | `not_located` |
| Clallam County Hazard Mitigation Plan Update page | Opened; lists Makah Tribe on the steering committee; FEMA letter July 14, 2025; adoption resolutions pending | Kept |
| Clallam County Shoreline Master Program page | Opened; names no tribe | Kept as general_jurisdiction |
| Clallam 2019 hazard plan (mrsc.org copy), 1995 comprehensive plan FEIS, countywide planning policies PDF, county code host | Not readable or third-party hosted | `not_located` |
| Jefferson County | No record naming the Makah Tribe located | Gap recorded |
| Makah Law and Order Code Title 9 resolution | PDF page 1 read; Resolution 01-12 of the Makah Tribal Council, enacted January 9, 2012 | Kept; signatory names not carried |
| Makah Law and Order Code Chapter 5B | Not opened by the lead | Dropped: outside the demo's land, jurisdiction and policy-monitoring scope; existence noted only |
| Makah Coastal Zone Management Program (1978) | GovInfo CZIC page opened | Kept |

## Findings

```yaml
# Federal
- title: Regulations Governing the Taking of Marine Mammals (final rule)
  issuer: National Marine Fisheries Service, National Oceanic and Atmospheric Administration, Department of Commerce
  identifier: FR Doc. 2024-12669; 89 FR 51600; Docket No. 240604-0152; RIN 0648-BI58
  url: https://www.govinfo.gov/content/pkg/FR-2024-06-18/pdf/2024-12669.pdf
  accessed: 2026-09-15
  date_of_record: 2024-06-18
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: Federal Register edition content; NARA reproduction policy applies as recorded in the 2026-09-02 Federal Register review
  relevance_basis: the summary states NMFS is waiving the MMPA moratorium to allow the Makah Indian Tribe to conduct a limited ceremonial and subsistence hunt of Eastern North Pacific gray whales in accordance with the Treaty of Neah Bay of 1855
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Regulations Governing the Taking of Marine Mammals (proposed rule)
  issuer: National Marine Fisheries Service, NOAA, Department of Commerce
  identifier: FR Doc. 2019-06337; 84 FR 13604; Docket No. 190212104-9261-01; RIN 0648-BI58
  url: https://www.govinfo.gov/content/pkg/FR-2019-04-05/pdf/2019-06337.pdf
  accessed: 2026-09-15
  date_of_record: 2019-04-05
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: as above
  relevance_basis: the summary states NMFS received a request from the Makah Indian Tribe for a waiver of the MMPA moratorium and announces a hearing before an administrative law judge
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Notice of Availability of a Draft Management Plan and Draft Environmental Assessment for the Olympic Coast National Marine Sanctuary; Request for Public Comment
  issuer: Office of National Marine Sanctuaries, National Ocean Service, NOAA, Department of Commerce
  identifier: FR Doc. 2026-09372; 91 FR 25865; RTID 0648-XF712
  url: https://www.govinfo.gov/content/pkg/FR-2026-05-12/pdf/2026-09372.pdf
  accessed: 2026-09-15
  date_of_record: 2026-05-12
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: as above
  relevance_basis: the background section states the sanctuary lies within the usual and accustomed fishing areas of four coastal tribes and that these rights were reserved by treaties the United States signed with the Makah Tribe under the 1855 Treaty of Neah Bay
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: HEARTH Act Approval of Makah Indian Tribe of the Makah Indian Reservation Regulations
  issuer: Bureau of Indian Affairs, Department of the Interior
  identifier: FR Doc. 2015-20888; 80 FR 51836
  url: https://www.govinfo.gov/content/pkg/FR-2015-08-26/pdf/2015-20888.pdf
  accessed: 2026-09-15
  date_of_record: 2015-08-26
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: as above
  relevance_basis: the notice states that on August 18, 2015, the Bureau of Indian Affairs approved the Makah Indian Tribe of the Makah Indian Reservation leasing regulations under the HEARTH Act
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Olympic Coast National Marine Sanctuary Regulations Revisions
  issuer: Office of National Marine Sanctuaries, NOAA
  identifier: FR Doc. 2011-27947
  url: https://www.federalregister.gov/documents/2011/11/01/2011-27947/olympic-coast-national-marine-sanctuary-regulations-revisions
  accessed: 2026-09-15
  date_of_record: 2011-11-01
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the abstract the scout retrieved discusses Indian tribes' objectives in permit issuance without naming a tribe; the lead did not open the document
  evidence_status: secondary_only
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Formal Rulemaking on Proposed MMPA Waiver and Hunt Regulations Governing Gray Whale Hunts by the Makah Tribe
  issuer: NOAA Fisheries, West Coast Region
  identifier: Docket NOAA-NMFS-2019-0037
  url: https://www.fisheries.noaa.gov/action/formal-rulemaking-proposed-mmpa-waiver-and-hunt-regulations-governing-gray-whale-hunts-makah
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the page indexes the proposed rule, final rule, environmental impact statements, hearing record and a 2025 notice of receipt of application, each with its Federal Register citation
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

# Washington State (all general_jurisdiction; none names the Makah Tribe)
- title: Chapter 43.376 RCW, Government-to-Government Relationship with Indian Tribes
  issuer: Washington State Legislature
  identifier: RCW 43.376 (sections .010 through .060, .500 through .530, .900); most recent amendment 2026 c 245
  url: https://app.leg.wa.gov/rcw/default.aspx?cite=43.376&full=true
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: no
  jurisdiction_level: state
  terms_or_reproduction: page footer states "Copyright 2025. All Rights Reserved."; reuse basis not located
  relevance_basis: the chapter states consultation duties toward federally recognized Indian tribes whose traditional lands and territories included parts of Washington
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: RCW 70A.65.305, Tribal consultation
  issuer: Washington State Legislature
  identifier: RCW 70A.65.305; 2022 c 253 s 1; 2024 c 375 s 8004
  url: https://app.leg.wa.gov/RCW/default.aspx?cite=70A.65.305
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: no
  jurisdiction_level: state
  terms_or_reproduction: as above
  relevance_basis: the section requires agencies that allocate funding or administer grant programs to offer early, meaningful, and individual consultation with any affected federally recognized tribe
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: RCW 36.70A.210, Countywide planning policies
  issuer: Washington State Legislature
  identifier: RCW 36.70A.210; 2022 c 252 s 6
  url: https://app.leg.wa.gov/rcw/default.aspx?cite=36.70A.210
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: no
  jurisdiction_level: state
  terms_or_reproduction: as above
  relevance_basis: the section states that federal agencies and federally recognized Indian tribes whose reservation or ceded lands lie within the county shall be invited to participate in the countywide planning policy adoption process
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: RCW 36.70A.040, Who must plan; Tribal participation
  issuer: Washington State Legislature
  identifier: RCW 36.70A.040(8); 2022 c 252 s 1
  url: https://app.leg.wa.gov/rcw/default.aspx?cite=36.70a.040
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: no
  jurisdiction_level: state
  terms_or_reproduction: as above
  relevance_basis: subsection (8) states that federally recognized Indian tribes may voluntarily choose to participate in the county or regional planning process
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: WAC 173-26-221, General master program provisions
  issuer: Washington State Department of Ecology
  identifier: WAC 173-26-221; WSR 17-17-016 (Order 15-06), effective 2017-09-07
  url: https://app.leg.wa.gov/wac/default.aspx?cite=173-26-221
  accessed: 2026-09-15
  date_of_record: 2017-09-07
  names_makah_explicitly: no
  jurisdiction_level: state
  terms_or_reproduction: as above
  relevance_basis: the rule refers to affected Indian tribes in its archaeological-resource, critical saltwater habitat and critical freshwater habitat provisions
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

# Clallam and Jefferson County
- title: Hazard Mitigation Plan Update
  issuer: Clallam County
  identifier: none stated
  url: https://www.clallamcountywa.gov/1822/Hazard-Mitigation-Plan-Update
  accessed: 2026-09-15
  date_of_record: 2025-07-14 (FEMA letter date shown)
  names_makah_explicitly: yes
  jurisdiction_level: county
  terms_or_reproduction: page footer states the site is protected by reCAPTCHA with Google policies; county reuse terms not located
  relevance_basis: the page lists the Makah Tribe among the government entities on the multi-jurisdictional hazard mitigation steering committee and states FEMA found the plan meets requirements on July 14, 2025, pending adoption resolutions; this is a web page, not an adopted final record
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Shoreline Master Program
  issuer: Clallam County
  identifier: Clallam County Code Title 35
  url: https://www.clallamcountywa.gov/1366/Shoreline-Master-Program
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: no
  jurisdiction_level: county
  terms_or_reproduction: not located
  relevance_basis: the page links the shoreline code title, state guidelines and program documents and names no tribe
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Jefferson County official records naming the Makah Tribe
  issuer: Jefferson County
  identifier: none
  url: not located
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: unknown
  jurisdiction_level: county
  terms_or_reproduction: not located
  relevance_basis: no Jefferson County record naming the Makah Tribe was located by the scout
  evidence_status: not_located
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

# Makah Tribe official publications
- title: Resolution No. 01-12 of the Makah Tribal Council, Revised Makah Exclusion Act 9.4.10 Emergency Exclusion (Makah Law and Order Code, Title 9)
  issuer: Makah Tribal Council
  identifier: Resolution 01-12; amends Title 9 enacted by Resolutions 168-03A (2004), 181-08 (2008) and 118-10 (2010)
  url: https://makah.com/wp-content/uploads/2021/11/MLOC-Title-9-Exclusion.pdf
  accessed: 2026-09-15
  date_of_record: 2012-01-09
  names_makah_explicitly: yes
  jurisdiction_level: tribal
  terms_or_reproduction: not located
  relevance_basis: the resolution's first page states it was enacted by the Makah Tribal Council on January 9, 2012 and amends Title 9 of the Makah Law and Order Code; only the resolution page was read, and no exclusion-list content or signatory detail was captured
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Makah Coastal Zone Management Program
  issuer: Makah Tribal Council (prepared by a planning contractor with Washington Department of Ecology and NOAA funding)
  identifier: CZIC ht393-w37-p32-1978
  url: https://www.govinfo.gov/content/pkg/CZIC-ht393-w37-p32-1978/html/CZIC-ht393-w37-p32-1978.htm
  accessed: 2026-09-15
  date_of_record: 1978-10-01
  names_makah_explicitly: yes
  jurisdiction_level: tribal
  terms_or_reproduction: page states the document is property of the Coastal Services Center library; no reuse restriction located
  relevance_basis: the document identifies itself as a coastal zone management program prepared for the Makah Tribal Council in 1978
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]
```

## Landing pages observed

- Federal Register: HTML pages return a bot-check redirect to automated
  readers; GovInfo official-edition PDFs at
  `govinfo.gov/content/pkg/FR-<date>/pdf/<doc>.pdf` resolved directly.
  NOAA Fisheries action pages index one rulemaking with its citations.
- Washington: `app.leg.wa.gov` serves each RCW and WAC section as a stable
  page with session-law history; there is no on-domain full-text search.
- Clallam County: a CivicPlus site with topic landing pages linking
  DocumentCenter PDFs; the codified code host returned HTTP 403 to the scout.
- Makah Tribe: `makah.com` publishes code titles, resolutions and notices as
  PDFs under `/wp-content/uploads/` with no visible search interface.

## Gaps and refusals

- No current federal critical-habitat rule naming the Makah Tribe and no
  USACE Seattle District notice with a resolvable Makah-specific URL were
  located.
- Federal Register documents carry named agency contacts and phone numbers in
  their "for further information" blocks; none was carried.
- The Title 9 resolution page carries signatures and names; none was carried.
- No exclusion-list, parcel, trust-status or cultural-site content was sought
  or recorded.

## URLs opened by the lead

GovInfo PDFs for FR 2024-12669, 2019-06337, 2026-09372 and 2015-20888; NOAA
Fisheries action page; app.leg.wa.gov pages for RCW 43.376, 70A.65.305,
36.70A.210, 36.70A.040 and WAC 173-26-221; Clallam County Hazard Mitigation
Plan Update and Shoreline Master Program pages; makah.com Title 9 PDF;
GovInfo CZIC 1978 page. The scout opened 31 URLs, listed in the session's raw
report.
