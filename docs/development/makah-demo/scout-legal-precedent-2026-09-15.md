# Makah demo scout report C2: legal and historical precedent

Accessed: 2026-09-15

Prepared under the Makah demo launch packet
([`docs/handoffs/makah-demo-fable-5.1-launch-prompt.md`](../../handoffs/makah-demo-fable-5.1-launch-prompt.md)),
Track C2. A task-assigned read-only scout produced the raw findings; the lead
opened every kept URL on 2026-09-15 and read the first page of each court and
statute PDF directly before it entered this file.

Implementation state: research report only; no source registry entry,
adapter, record, copied text, Nation association or public artifact output.

External authorization: none requested or granted. PACER was not used.

Every item below is an observation of what an official document says about
itself (caption, party list, date, identifier). None is a holding, a rights
determination, a jurisdiction finding, a land-status statement, or a Nation
association in the product sense; a caption naming a Nation is exact evidence
that the document names it, and nothing more.

## Reconciliation summary

| Scout item | Lead verification | Disposition |
| --- | --- | --- |
| Treaty with the Makah Tribe, 12 Stat. 939 | GovInfo PDF page 939 read; title, Neah Bay, January 31, 1855, ratified March 8, 1859, proclaimed April 18, 1859 confirmed | Kept |
| NARA catalog NAID 176960703 | Page unreadable to the scout | `not_located` |
| Boldt 1974 decision body | WAWD special-case page opened; only docket batches and 1975 to 2012 orders are linked | Gap preserved; unchanged from the 2026-07-31 review |
| Ninth Circuit 13-35474 opinion (2016) | PDF page 1 read; caption lists Makah Indian Tribe; FOR PUBLICATION, OPINION | Kept |
| Ninth Circuit 13-35474 order (2017) | PDF page 1 read; same caption; ORDER | Kept |
| Ninth Circuit 15-35824, Makah v. Quileute | GovInfo PDF page 1 read; Makah Indian Tribe as Plaintiff-Appellant; filed 10/23/2017 | Kept |
| WAWD Subproceeding 09-01 findings | PDF page 1 read; Document 21063 filed 07/09/15; introduction states the subproceeding was brought at the request of the Makah Indian Tribe | Kept |
| Supreme Court docket 17-1592 | Opened; petition denied October 1, 2018 | Kept |
| 443 U.S. 658 | Already reviewed in the Boldt gap review; not re-opened | Cross-referenced only |
| NOAA Fisheries rulemaking action page | Opened; eight Federal Register citations listed | Kept |
| NOAA recommended decision (2021) | Opened; title and date confirmed | Kept |
| Solicitor General brief, No. 90-1595 | Opened; title, docket, term confirmed | Kept |
| Anderson v. Evans; Makah v. Verity; Makah v. Clallam County (1968) | No official-site copy located | `secondary_only`; listed for completeness, cannot enter a source review |
| Culvert-case Supreme Court affirmance (2018) | Not opened; the scout reported it from secondary sources | Not listed as an item |

## Findings

```yaml
- title: Treaty between the United States of America and the Makah Tribe of Indians (Treaty with the Makah Tribe, Jan. 31, 1855)
  issuer: United States; ratified by the Senate March 8, 1859; proclaimed April 18, 1859
  identifier: 12 Stat. 939
  url: https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf
  accessed: 2026-09-15
  date_of_record: 1855-01-31
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: GPO "Authenticated U.S. Government Information" seal; no explicit reuse statement located
  relevance_basis: the Statutes at Large page heading reads "Treaty with the Makah Tribe" and the preamble states the treaty was concluded at Neah Bay, Washington Territory, on January 31, 1855
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: "snippet-derived, unverified: Ratified Indian Treaty 286, Makah, Neah Bay, Washington Territory"
  issuer: National Archives and Records Administration
  identifier: NAID 176960703
  url: https://catalog.archives.gov/id/176960703
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the catalog page returned no readable content on three attempts; its title is known only from search snippets
  evidence_status: not_located
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: United States v. Washington, Final Decision I
  issuer: United States District Court for the Western District of Washington
  identifier: 384 F. Supp. 312 (W.D. Wash. 1974); No. C70-9213
  url: not located
  accessed: 2026-09-15
  date_of_record: 1974-02-12
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the court's special-case page links pre-CM/ECF docket batches and controlling orders from 1975 to 2012 but not the 1974 decision body, so the 2026-07-31 source gap stands
  evidence_status: not_located
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Special Case Notices, United States of America et al. v. State of Washington et al.
  issuer: United States District Court for the Western District of Washington
  identifier: C70-9213-RSM
  url: https://www.wawd.uscourts.gov/special-case-notices
  accessed: 2026-09-15
  date_of_record: unknown
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the page lists three docket-sheet batches (entries 1 to 4888, 4889 to 10106, 10107 to 13268) covering 1970 to 1993 and controlling orders from 1975 to 2012
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: United States of America et al. v. State of Washington (opinion)
  issuer: United States Court of Appeals for the Ninth Circuit
  identifier: No. 13-35474; D.C. Nos. 2:01-sp-00001-RSM, 2:70-cv-09213-RSM
  url: https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf
  accessed: 2026-09-15
  date_of_record: 2016-06-27
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the caption, marked FOR PUBLICATION and OPINION, lists Makah Indian Tribe among the plaintiffs-appellees against the State of Washington
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: United States of America et al. v. State of Washington (order)
  issuer: United States Court of Appeals for the Ninth Circuit
  identifier: No. 13-35474; D.C. Nos. 2:01-sp-00001-RSM, 2:70-cv-09213-RSM
  url: https://cdn.ca9.uscourts.gov/datastore/opinions/2017/05/19/13-35474.pdf
  accessed: 2026-09-15
  date_of_record: 2017-05-19
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the caption, marked FOR PUBLICATION and ORDER, lists Makah Indian Tribe among the plaintiffs-appellees
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Makah Indian Tribe v. Quileute Indian Tribe; Quinault Indian Nation
  issuer: United States Court of Appeals for the Ninth Circuit
  identifier: No. 15-35824; D.C. Nos. 2:09-sp-00001-RSM, 2:70-cv-09213-RSM
  url: https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf
  accessed: 2026-09-15
  date_of_record: 2017-10-23
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: GPO authenticated seal; no explicit reuse statement located
  relevance_basis: the caption names Makah Indian Tribe as Plaintiff-Appellant and Quileute Indian Tribe and Quinault Indian Nation as Respondents-Appellees, filed 10/23/2017
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Findings of Fact and Conclusions of Law and Memorandum Order, Subproceeding No. 09-01
  issuer: United States District Court for the Western District of Washington at Seattle
  identifier: No. C70-9213, Subproceeding No. 09-01, Document 21063
  url: https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf
  accessed: 2026-09-15
  date_of_record: 2015-07-09
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the introduction states the subproceeding is before the court pursuant to the request of the Makah Indian Tribe to determine the usual and accustomed fishing grounds of the Quileute Indian Tribe and the Quinault Indian Nation
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Makah Indian Tribe v. Quileute Indian Tribe, et al. (docket)
  issuer: Supreme Court of the United States
  identifier: No. 17-1592
  url: https://www.supremecourt.gov/docket/docketfiles/html/public/17-1592.html
  accessed: 2026-09-15
  date_of_record: 2018-10-01
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the docket page records the petition as denied on October 1, 2018, from the Ninth Circuit
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Formal Rulemaking on Proposed MMPA Waiver and Hunt Regulations Governing Gray Whale Hunts by the Makah Tribe
  issuer: NOAA Fisheries, West Coast Region
  identifier: Docket NOAA-NMFS-2019-0037
  url: https://www.fisheries.noaa.gov/action/formal-rulemaking-proposed-mmpa-waiver-and-hunt-regulations-governing-gray-whale-hunts-makah
  accessed: 2026-09-15
  date_of_record: unknown (page indexes 2019 through 2025 actions)
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the page lists eight Federal Register citations including the proposed rule at 84 FR 13604 (04/05/2019), the final rule at 89 FR 51600 (06/18/2024) and a notice of receipt of application at 90 FR 12711 (03/19/2025)
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Recommended Decision on Proposed Waiver and Regulations Governing the Taking of Eastern North Pacific Gray Whales by the Makah Tribe
  issuer: NOAA administrative hearing (hosted by NOAA Fisheries)
  identifier: none stated
  url: https://www.fisheries.noaa.gov/resource/document/recommended-decision-proposed-waiver-and-regulations-governing-taking-eastern
  accessed: 2026-09-15
  date_of_record: 2021-09-24
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the document states it concerns a request by the Makah Indian Tribe of Neah Bay, Washington, to hunt Eastern North Pacific gray whales
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Brief for the United States in Opposition, Makah Indian Tribe v. United States of America, et al.
  issuer: Office of the Solicitor General, United States Department of Justice
  identifier: No. 90-1595, October Term 1990
  url: https://www.justice.gov/osg/media/228836/dl
  accessed: 2026-09-15
  date_of_record: 1991-06
  names_makah_explicitly: yes
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: the brief's title page names the Makah Indian Tribe as petitioner
  evidence_status: observed_at_url
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Anderson v. Evans
  issuer: United States Court of Appeals for the Ninth Circuit
  identifier: 314 F.3d 1006 (9th Cir. 2002), amended 350 F.3d 815 (9th Cir. 2003)
  url: not located
  accessed: 2026-09-15
  date_of_record: 2002-12-20
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: no copy was located on ca9.uscourts.gov or GovInfo USCOURTS, whose holdings do not reach 2002
  evidence_status: secondary_only
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Makah Indian Tribe v. Verity
  issuer: United States Court of Appeals for the Ninth Circuit
  identifier: 910 F.2d 555 (9th Cir. 1990)
  url: not located
  accessed: 2026-09-15
  date_of_record: 1990-07-31
  names_makah_explicitly: unknown
  jurisdiction_level: federal
  terms_or_reproduction: not located
  relevance_basis: no official-site copy located
  evidence_status: secondary_only
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]

- title: Makah Indian Tribe et al. v. Clallam County et al.
  issuer: Supreme Court of the State of Washington
  identifier: 73 Wn.2d 677, 440 P.2d 442 (1968)
  url: not located
  accessed: 2026-09-15
  date_of_record: 1968-05-02
  names_makah_explicitly: unknown
  jurisdiction_level: state
  terms_or_reproduction: not located
  relevance_basis: the courts.wa.gov opinion archive does not reach 1968; only third-party copies were found
  evidence_status: secondary_only
  non_claims: [no jurisdiction/rights/applicability/land-status/membership determination]
```

## Gaps and refusals

- The 1974 Boldt decision body remains a documented source gap; nothing in
  this report resolves it and no secondary copy may be used.
- Anderson v. Evans, Makah v. Verity and the 1968 state case exist only as
  secondary copies and cannot enter a source review.
- FederalRegister.gov HTML returned a bot-check page to the scout; Federal
  Register citations above come from NOAA's own action page and were
  separately confirmed by the lead against GovInfo official-edition PDFs in
  the C3 report.
- Court PDFs show judge, counsel and party names as captions; no contact
  detail was captured.

## URLs opened by the lead

GovInfo 12 Stat. 939 PDF; WAWD special-case notices; Ninth Circuit 13-35474
opinion (2016) and order (2017) PDFs; GovInfo USCOURTS 15-35824 PDF; WAWD
Subproceeding 09-01 PDF; Supreme Court docket 17-1592; NOAA Fisheries
rulemaking action page; NOAA recommended decision page; Solicitor General brief
No. 90-1595. The scout opened 20 URLs, listed in the session's raw report.
