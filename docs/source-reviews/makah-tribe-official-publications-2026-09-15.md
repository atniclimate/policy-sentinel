# Makah Tribe official publications source review

Accessed: 2026-09-15

Implementation state: documented candidate family; no source registry entry,
adapter, record, copied text, Nation association or public artifact output.
Zero product-runner requests were issued; observations come from read-only
research reads recorded in
[the C3 scout report](../development/makah-demo/scout-regulatory-legislative-2026-09-15.md).

External authorization: none requested or granted. This review does not
qualify, admit, activate or acquire the source.

## Originating authority and landing surface

| Attribute | Observation |
| --- | --- |
| Originating authority | Makah Tribal Council as the enacting body named on the observed resolution. The `makah.com` domain was observed as the host; its status as the Nation's official or designated publication host was not verified by any page or statement in this session and is recorded as a gap below |
| Exact landing URLs observed | `https://makah.com/wp-content/uploads/2021/11/MLOC-Title-9-Exclusion.pdf` (Resolution 01-12, enacted 2012-01-09, amending Title 9 of the Makah Law and Order Code); a Legal Notices index page and further code-title PDFs under `/wp-content/uploads/` were seen by the scout but not individually reviewed |
| Historical convenience copy | `https://www.govinfo.gov/content/pkg/CZIC-ht393-w37-p32-1978/html/CZIC-ht393-w37-p32-1978.htm` (Makah Coastal Zone Management Program, 1978, GovInfo CZIC collection) |
| Names the Makah Tribe in the official record | Yes: the resolution states it is enacted by the Makah Tribal Council; this is the issuing government identifying itself, which under D-005 still requires a separately accepted originating identity record before any `nationAssociations` value is emitted |
| Excerpt and reproduction terms | Not located on the documents or landing pages. Public availability does not authorize reproduction; each document needs the publishing Nation's terms confirmed before any excerpt |
| Interface | Static PDFs behind a WordPress upload path; no index feed, API, sitemap contract, search interface or documented cadence observed |

## Feasibility matrix columns

| Column | Observation |
| --- | --- |
| Coverage, fields, and historical range | Individual resolutions and code titles with resolution number, enactment date, subject line and amendment history on the face of the document; the observed range is 2004 (referenced) to 2012 (observed) plus a 1978 planning document. No completeness claim is possible |
| Permitted use and attribution | Cite the Makah Tribal Council and the exact document; metadata and official link only until the Tribe's reuse terms are confirmed. Respect the publishing Nation's sovereignty over its own documents |
| Authentication and rate limits | None observed; no numeric limit published |
| CORS and static-site constraint | Build-time reviewed allowlist only, never a general crawl or browser retrieval |
| Update cadence | Irregular and undocumented |
| Failure behavior | Disable on authority, terms or structure ambiguity; retain prior metadata only while still authorized; corrections from the publishing Nation receive priority review |
| What would be captured | Resolution number, enactment date, subject line, code title reference, official URL, retrieval time |
| What would be refused | Full text, exclusion lists or any named individual, signatures, sensitive, ceremonial or unpublished material, anything not on the official domain |

## Gaps

- No machine-readable index or terms statement was located; a per-document
  reuse decision is required.
- One resolution page and one 1978 planning document were observed; the
  family's actual extent is unknown.
- Chapter 5B of the Law and Order Code was reported by the scout on the same
  domain; the lead did not open it, and it is outside this demo's scope.
- Publication authority for the `makah.com` domain is unverified: no page
  identifying it as the Tribe's official or designated publication host was
  observed. Establishing that is the first step of any later source review.

## Priority and status

Reviewed, not admitted. Priority P4 pilot only after source-by-source review,
consistent with the existing "Officially published Tribal government
documents" feasibility row. Gates: `G-J` for source-specific evidence, and
the exact-identity prerequisite `G-BIA-IDENTITY` before any Nation record can
exist for the association to attach to. No allowlist was stated at launch, so
no acquisition of any kind is authorized by this review.
