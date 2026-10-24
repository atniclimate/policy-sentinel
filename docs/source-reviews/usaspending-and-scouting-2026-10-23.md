# USAspending and Parallel source scouting

Access date: 2026-10-23 (Pacific). Development research under D-114: Parallel
Search found the pages; each statement below names the official page it comes
from. Leads only. No source here is added to the demo or the engine.

## USAspending (api.usaspending.gov)

- <https://api.usaspending.gov/docs/endpoints>: "Endpoints do not currently
  require authorization." Fits the FY27 task's need to keep obligations and
  outlays apart: `POST /api/v2/search/spending_by_award/` (fields `Award Amount`,
  `Total Outlays`), `POST /api/v2/search/spending_over_time/` (`*_Obligations`
  and nullable `*_Outlays`), `GET /api/v2/references/cfda/totals/<CFDA>/`,
  `GET /api/v2/awards/last_updated/` for data-as-of.
- Rate limit: a project contributor states in
  <https://github.com/fedspendingtransparency/usaspending-api/issues/4459>
  "a global rate limit that applies to most endpoints of 1,000 request in 300
  seconds". Not on an official page.
- Open: terms and attribution (usaspending.gov is client-rendered and was not
  readable); the full `recipient_type_names` values. Tribal recipient labels
  reported by third parties ("Indian Tribe (Federally Recognized)", "Tribal
  Government") are registrant or agency designations, never identity facts,
  and stay unconfirmed until one bounded live call.

## Leads from scouting (official pages found, still to be read in full)

| Gap | What was found | Next step |
| --- | --- | --- |
| Oregon legislation | Official OData API: <https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx>. Use requires electronic acceptance of the Acceptable Use Agreement: <https://www.oregonlegislature.gov/citizen_engagement/Documents/OLODataAcceptableUseAgreement.pdf> | The owner reads and accepts or declines the agreement |
| Oregon rules | Secretary of State OAR search and publications pages; no API or reuse terms found | Ask the Archives Division |
| Idaho legislation | HTML lists only, for example <https://legislature.idaho.gov/sessioninfo/2026/legislation/minidata/>; no API or feed found | Contact the Legislative Services Office (owner) |
| eCFR | <https://www.ecfr.gov/reader-aids/ecfr-developer-resources>: "No API keys are needed" | Read the API documentation and any terms |
| Unified Agenda terms | <https://www.reginfo.gov/public/jsp/Utilities/privacy.myjsp> | Read in full |
| Intertribal resolutions | <https://atnitribes.org/resolution-table/>, <https://www.ncai.org/resolutions>, <https://www.usetinc.org/resources/resolutions/> | Per-publisher reuse terms; NCAI reply pending (STATUS decision 9) |

## Monitors (Parallel, weekly, development only)

Seven event-stream monitors watch for changes to the Regulations.gov, Federal
Register, GovInfo, Congress.gov, Grants.gov and Washington Legislature
interfaces and terms, and for a new Unified Agenda edition. Monitor IDs and
events stay in the developer scratch space; run
`node scripts/dev-ai/parallel-scout.mjs monitors:events` to read them. An
event is a lead to re-read the official page, never a change to a source note
by itself.
