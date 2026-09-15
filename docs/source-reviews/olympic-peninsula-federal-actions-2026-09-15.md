# Olympic Peninsula federal actions source review

Accessed: 2026-09-15

Implementation state: documented candidate set within an already-reviewed
source family; no source registry change, adapter change, record, copied
text, Nation association or public artifact output. The retained disabled
`federal-register` adapter, the closed 2026-09-02 admission review and the
spent prerelease lane are unchanged; `FR-A1` was not issued. Zero
product-runner requests were issued; observations come from read-only
research reads recorded in
[the C2](../development/makah-demo/scout-legal-precedent-2026-09-15.md) and
[C3](../development/makah-demo/scout-regulatory-legislative-2026-09-15.md)
scout reports, each verified by the lead against GovInfo official-edition
PDFs.

External authorization: none requested or granted.

## Originating authorities and landing surfaces

| Attribute | Observation |
| --- | --- |
| Originating authorities | National Marine Fisheries Service and Office of National Marine Sanctuaries (NOAA, Department of Commerce); Bureau of Indian Affairs (Department of the Interior); United States Court of Appeals for the Ninth Circuit; United States District Court for the Western District of Washington; for the 1855 treaty, the United States (ratified by the Senate, proclaimed by the President) as published in the Statutes at Large |
| Exact landing URLs observed | GovInfo official-edition PDFs for FR Doc. 2024-12669 (89 FR 51600), 2019-06337 (84 FR 13604), 2026-09372 (91 FR 25865) and 2015-20888 (80 FR 51836); NOAA Fisheries action page for docket NOAA-NMFS-2019-0037; Ninth Circuit opinion datastore PDFs for No. 13-35474 (2016, 2017); GovInfo USCOURTS PDF for No. 15-35824; Western District PDF for Subproceeding 09-01; Western District special-case notices page |
| Names the Makah Tribe in the official record | Yes for every listed document except the special-case notices page, which identifies the case, and the 2011 sanctuary rule, which the lead did not open. Naming is exact evidence that the document names the Tribe; under D-005 a `nationAssociations` value still requires an accepted originating identity record and a separately reviewed adapter |
| Excerpt and reproduction terms | Federal Register edition content follows the NARA reproduction policy already recorded in the 2026-09-02 review; it does not extend to linked dockets or attachments. Court opinions and GovInfo court documents carry a GPO authentication seal without an explicit reuse statement; treat as metadata-and-link until reviewed per source |
| Interfaces | FederalRegister.gov HTML returned a bot-check redirect to automated readers; GovInfo official-edition PDFs resolved directly; NOAA action pages are curated per-rulemaking indexes; court opinion datastores are per-case PDFs with no discovery contract |

## Exact-document candidates (not an allowlist)

No allowlist exists. Listing here is input to a later owner decision; each
entry is one exact document at one official URL.

| Candidate | Official URL | Names the Tribe |
| --- | --- | --- |
| 89 FR 51600, final rule, 2024-06-18 | `https://www.govinfo.gov/content/pkg/FR-2024-06-18/pdf/2024-12669.pdf` | Yes |
| 84 FR 13604, proposed rule, 2019-04-05 | `https://www.govinfo.gov/content/pkg/FR-2019-04-05/pdf/2019-06337.pdf` | Yes |
| 91 FR 25865, OCNMS draft management plan notice, 2026-05-12 | `https://www.govinfo.gov/content/pkg/FR-2026-05-12/pdf/2026-09372.pdf` | Yes |
| 80 FR 51836, HEARTH Act approval, 2015-08-26 | `https://www.govinfo.gov/content/pkg/FR-2015-08-26/pdf/2015-20888.pdf` | Yes |
| Ninth Circuit No. 13-35474 opinion, 2016-06-27 | `https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf` | Yes, in caption |
| Ninth Circuit No. 15-35824 opinion, 2017-10-23 | `https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf` | Yes, in caption |
| W.D. Wash. Subproceeding 09-01 findings, 2015-07-09 | `https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf` | Yes |
| 12 Stat. 939, Treaty with the Makah Tribe, 1855 | `https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf` | Yes |

## Feasibility matrix columns

| Column | Observation |
| --- | --- |
| Coverage, fields, and historical range | Exact documents from 1855 to 2026; no coverage claim beyond the listed items |
| Permitted use and attribution | Cite the issuing agency or court and the official edition; metadata, exact citation and official link; bounded source language only after per-source review |
| Authentication and rate limits | GovInfo PDF links and court datastores need no key; the GovInfo API remains behind `G-B-GOVINFO`; FederalRegister.gov API terms and rates remain unknown per O-021 |
| CORS and static-site constraint | Build-time only; the observed bot-check on HTML pages is a dated observation |
| Update cadence | Document-specific; corrections appear as new documents |
| Failure behavior | Fail closed on identity, citation, rendition, terms or digest drift; no last-known-good exists for these items |
| What would be captured | Document number, FR citation, agency, action type, dates, title, official URL, retrieval time, exact naming location |
| What would be refused | "For further information contact" blocks with named officials and phone numbers, docket attachments, comment content, counsel and signature blocks in court documents |

## Gaps

- The 1974 Boldt decision body remains unlocated at any official URL.
- The 2011 sanctuary regulations revision was not opened by the lead and its
  Makah naming is unknown.
- No current critical-habitat rule or USACE Seattle District notice naming
  the Tribe was located.

## Priority and status

Reviewed, not admitted. Priority P1 for the exact-document candidates as a
future bounded, per-document metadata-and-link tranche. Gates: `G-J` per
source; `G-PNW-05-FR-TIER1-QUALIFICATION` remains unresolved for the Federal
Register adapter; `G-B-GOVINFO` for any API use; `G-BIA-IDENTITY` before any
Nation association. No allowlist was stated at launch, so no acquisition is
authorized by this review.
