# Unified Agenda XML (reginfo.gov)

Access date: 2026-10-23 (Pacific). Candidate source for rules agencies plan to
issue. Not added to the demo or the engine.

## Originating URLs

- Index of editions: <https://www.reginfo.gov/public/do/eAgendaXmlReport>.
- Edition file: `https://www.reginfo.gov/public/do/XMLViewFileAction?f=REGINFO_RIN_DATA_<pubId>.xml`,
  `pubId` = `YYYYMM` with `04` spring and `10` fall. The newest listed is
  `REGINFO_RIN_DATA_202510.xml` ("2026 Data").
- Per-RIN page: `https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=<pubId>&RIN=<RIN>`.
  A wrong `pubId` returns HTTP 200 with a list of editions, not the record.
- Agency intake form: `https://www.reginfo.gov/public/jsp/regform/RID_Form_Fall_2025.docx`
  ("If Yes, check affected governments ... State Local Tribal Federal").

## Interface

- One XML file per edition, no key, no documented rate limit, no schema
  published. The streamed response had no `access-control-allow-origin`
  header, so it is build-time only. No per-RIN API exists.
- The first 3.9 MB of the 202510 file (streamed 2026-10-24 UTC, 872 records)
  shows root `REGINFO_RIN_DATA`, records `RIN_INFO`, and elements `RIN`,
  `PUBLICATION/PUBLICATION_ID`, `AGENCY` and `PARENT_AGENCY` (`CODE`, `NAME`,
  `ACRONYM`), `RULE_TITLE`, `ABSTRACT` (HTML in CDATA), `PRIORITY_CATEGORY`,
  `RIN_STATUS`, `RULE_STAGE`, `MAJOR`, `UNFUNDED_MANDATE_LIST`, `CFR_LIST/CFR`,
  `LEGAL_AUTHORITY_LIST/LEGAL_AUTHORITY`, `LEGAL_DLINE_LIST/LEGAL_DLINE_INFO`
  (`DLINE_TYPE`, `DLINE_ACTION_STAGE`, `DLINE_DATE`, `DLINE_DESC`),
  `TIMETABLE_LIST/TIMETABLE` (`TTBL_ACTION`, `TTBL_DATE`, `FR_CITATION`),
  `RFA_REQUIRED`, `SMALL_ENTITY_LIST`, `GOVT_LEVEL_LIST/GOVT_LEVEL`,
  `FEDERALISM`, `ENERGY_AFFECTED`, `RELATED_RIN_LIST` (`RELATED_RIN`,
  `RIN_RELATION`), `PUBLIC_COMMENT_URL`, `RPLAN_INFO`, and
  `AGENCY_CONTACT_LIST/CONTACT` (personal names, phones, emails: never kept).
- `GOVT_LEVEL` is one literal value per element. Counts in that sample: None
  584, Federal 124, Undetermined 122, State 65, Local 39, Tribal 27.
- Timetable dates can be month-only (`07/00/2026`); keep them as stated.

## Limits for display

"Tribal" in `GOVT_LEVEL` is the agency's own checkbox on its intake form for
that edition. It names no Nation and is not a determination of effect. Show it
as "Government levels affected, as the agency reported: State, Tribal" with the
RIN, agency and edition, and label any record `general_jurisdiction`.

## Open

- Terms: <https://www.reginfo.gov/public/jsp/Utilities/privacy.myjsp> and the
  disclaimer page were found through Parallel Search but not yet read in full.
- Delivery: an edition index would be new generated public data. Serving it
  needs the owner's approval of an output boundary (AGENTS.md safeguard 7).
