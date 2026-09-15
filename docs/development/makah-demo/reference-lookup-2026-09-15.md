# Makah demo reference metadata lookup (search agent, 2026-09-15)

Accessed: 2026-09-15

A task-assigned read-only lookup agent (`general-purpose`, model `haiku`)
searched for bibliographic metadata on the sources already verified by the
lead. Its findings are recorded here so the TSDF provenance record can cite
them as evidence distinct from lead verification. Nothing below was
re-opened by the lead; each fact carries the status the agent reported.
`observed_at_url` means the agent states it read the fact at that URL;
`search_snippet_only` means it saw the fact only in a search result. No
personal contact information was requested or recorded; panel judge names
reported for one opinion were not carried.

Implementation state: documentation only; no source registry entry,
acquisition, record or Nation association.

## Document metadata

| Source entry | Fact | Value | Status | URL |
| --- | --- | --- | --- | --- |
| 89 FR 51600 (FR Doc. 2024-12669) | Page range | 51600 to 51642 | observed_at_url | `https://www.govinfo.gov/content/pkg/FR-2024-06-18/html/2024-12669.htm` |
| 84 FR 13604 (FR Doc. 2019-06337) | Page range | 13604 to 13624 | observed_at_url | `https://www.govinfo.gov/content/pkg/FR-2019-04-05/html/2019-06337.htm` |
| 91 FR 25865 (FR Doc. 2026-09372) | Page range | 25865 to 25867 | observed_at_url | `https://www.govinfo.gov/content/pkg/FR-2026-05-12/html/2026-09372.htm` |
| 80 FR 51836 (FR Doc. 2015-20888) | Page range | 51836 to 51837 | observed_at_url | `https://www.federalregister.gov/documents/2015/08/26/2015-20888/hearth-act-approval-of-makah-indian-tribe-of-the-makah-indian-reservation-regulations` |
| 12 Stat. 939 | Page range; GovInfo package | 939 to 940; `STATUTE-12` | observed_at_url | `https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf` |
| Ninth Circuit No. 13-35474 (2016) | Reporter citation | 827 F.3d 836 | secondary (commercial reporter site) | not an official URL; not carried as an observation |
| Ninth Circuit No. 15-35824 (2017) | Reporter citation; GovInfo package | 873 F.3d 1157; `USCOURTS-ca9-15-35824` | observed_at_url per the agent | `https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf` |
| W.D. Wash. Subproceeding 09-01 | Reporter citation | Not recorded | not located | |
| Supreme Court No. 17-1592 | Denial citation | 139 S. Ct. 106 | search_snippet_only | |
| Makah Coastal Zone Management Program (1978) | Preparer and place; page count | Pacific Rim Planners, Inc., Seattle, Washington; approximately 108 pages | observed_at_url | `https://www.govinfo.gov/content/pkg/CZIC-ht393-w37-p32-1978/html/CZIC-ht393-w37-p32-1978.htm` |

The GovInfo HTML renditions listed for the four Federal Register documents
are the official-edition text renditions that the existing `govinfo-direct`
source profile already permits; they are the acquisition route named in the
federal acquisition launch.

## Organization places (as printed on each organization's own site)

| Organization | Place | Status | URL |
| --- | --- | --- | --- |
| Northwest Area Foundation | St. Paul, Minnesota | observed_at_url | `https://www.nwaf.org/` |
| First Nations Development Institute | Longmont, Colorado | observed_at_url | `https://www.firstnations.org/` |
| NDN Collective | Rapid City, South Dakota | observed_at_url | `https://www.ndncollective.org/` |
| Seventh Generation Fund for Indigenous Peoples | McKinleyville, California | observed_at_url | `https://7genfund.org/` |
| Wilburforce Foundation | Seattle, Washington | observed_at_url | `https://wilburforce.org/` |
| Common Counsel Foundation (Native Voices Rising) | Oakland, California | observed_at_url | `https://www.commoncounsel.org/` |
| M.J. Murdock Charitable Trust | Vancouver, Washington | observed_at_url | `https://murdocktrust.org/` |
| Rose Foundation for Communities and the Environment | Oakland, California | observed_at_url | `https://rosefdn.org/` |

## TSDF classification reference

A separate read-only lookup in the local Tiered Sovereign Data Framework
repository (`C:\dev\TieredSovereignDataFramework\standard\TSDF-Standard-v0.95.md`,
version 0.9.5, revised 2026-07-14) reports: T0 is data formally and
publicly released by the sovereign Indigenous entity; T1 is community
network access; T2 is negotiated partner access; T3 is sovereign restricted;
and section 3.2 states that data with an uncertain or unclassified
classification must default to T3. Local Contexts labels are selected only
by the originating community and are never auto-assigned. The provenance
record therefore leaves `sovereign_tier` as "Not recorded" and notes the T3
default handling rule pending a human classification. The renderer terms
"D1" and "D4", the `handling_profile` vocabulary and the `entry_id` format
were not found in the local copies.
