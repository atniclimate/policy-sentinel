# Full 0.9 source survey, 2026-11-05

Research for the Full 0.9 plan (D-118). Only facts seen in raw response bytes
or exact page text on 2026-11-05 are listed. This note qualifies no source,
opens no gate and accepts no terms. Each source still needs its own note, its
terms read and one bounded live call before it is declared viable. Lane notes
and raw fixtures are kept outside the repository, in the session scratch
folder `full09-plan-20261105`.

## Confirmed in raw bytes

| Source | Observed | Use it supports |
| --- | --- | --- |
| GovInfo help page for USCOURTS | Court codes `wawd`, `waed`, `ord`, `idd` (district) and `wawb`, `waeb`, `orb`, `idb` (bankruptcy) | District opinion search by `courtCode` |
| GovInfo feeds page | `uscourts-idd.xml`, `uscourts-ord.xml`, `uscourts-waed.xml` listed; no `uscourts-wawd.xml` | Keyless new-opinion detection except W.D. Wash. |
| GovInfo STATUTE collection (DEMO_KEY) | 138 packages; volumes 7 to 12 present; `dateIssued` is the session end date (vol. 7: 1845-03-03) | Statutes at Large links; never show `dateIssued` as a treaty date |
| Supreme Court slip-opinion RSS | `slipopinion_rss.aspx?TYear=25` (74 items) and `TYear=26` (1 item) return RSS although the RSS index lists only 17 to 23 | Current-term opinions, term derived from the calendar |
| Supreme Court docket JSON | `/RSS/Cases/JSON/25-1.json` returns JSON with `LowerCourt`, `LowerCourtCaseNumbers`, `ProceedingsandOrder` and attorney contact fields | Known dockets only; attorney fields must be dropped |
| District court ECF `rss_outside.pl` (W.D. Wash., E.D. Wash., D. Or.) | "Docket entries of type: all", including sealed-motion entries | Rejected as an opinion source |
| Washington per-bill RSS | `app.leg.wa.gov/billsummary/Home/Rss/1000/2025/House/False` returns RSS 2.0 status items | Following a Washington bill |
| Washington LWS `GetLegislativeStatusChangesByDateRange` (HTTP GET) | One day returned 1.3 MB, 3,181 rows | Too large for the Worker; per-bill calls instead |
| Library of Congress Statutes at Large item JSON | `rights` text differs by volume (vol. 11 carries a reprinted-copyright caveat) | Carry the rights statement verbatim per volume |
| Grants.gov `search2` and `fetchOpportunity` (keyless) | `cfdaList` on hits; `data.cfdas[]` with `cfdaNumber` and `programTitle`; no structured authority field; synopsis carries agency contact fields | Opportunity to Assistance Listing number; drop contacts |
| BIA Tribal Climate Resilience FY24 request for proposals | States an "AUTHORITIES:" list of public laws and U.S.C. sections; prints no Assistance Listing number | Quote stated authorities with the URL |
| USAspending `references/cfda/totals` | Empty body for 15.156 and 66.926 | Not used for 0.9 |
| eCFR part-level XML (25 CFR 900, 40 CFR 131) | `AUTH` ("25 U.S.C. 450f et seq.", "33 U.S.C. 1251 et seq.") and `SOURCE` at part level; section `CITA` amendments | CFR part to statute and to originating Federal Register citation |
| Federal Register rule JSON and XML | `cfr_references` keyless; `<AUTH>` present in 2024-28302, absent in 2026-21474 | Rule to CFR part; an authority line is optional |
| OLRC USLM XML, title 25 | `sourceCredit` with `ref@href` such as `/us/pl/93/638/s4` and `/us/stat/88/2204` | U.S.C. section to public law and Statutes at Large |

## Still unread (owner browser checks)

GovInfo link-service syntax for `/link/statute`; USAspending reuse terms; eCFR,
Office of the Federal Register and Caselaw Access Project terms (bot wall);
the SAM.gov Assistance Listings public CSV and its columns; the Assistance
Listing number for BIA Tribal Climate Resilience on SAM.gov; supremecourt.gov
robots and terms; the OLRC download page terms; the Oregon OLIS Acceptable Use
Agreement text.
