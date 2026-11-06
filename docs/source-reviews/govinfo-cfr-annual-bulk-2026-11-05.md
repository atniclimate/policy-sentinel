# GovInfo CFR annual edition, bulk data (static index source)

Accessed: 2026-11-05. Owner approval of this use: D-125 (the CFR authority
chain comes from the official CFR annual edition on GovInfo; eCFR is current
reference only). Conditions: `docs/development/full09-index-conditions-2026-11-05.md`.

## What it is

The Code of Federal Regulations annual edition, published by the Office of the
Federal Register (National Archives) and the Government Publishing Office, as
XML volumes in the GovInfo Bulk Data Repository. Each title is revised once a
year: titles 1 to 16 as of January 1, 17 to 27 as of April 1, 28 to 41 as of
July 1, 42 to 50 as of October 1. An annual edition is a snapshot, not proof of
current law; the page says which edition and revision date it shows.

- Collection page: https://www.govinfo.gov/app/collection/cfr
- Bulk data: https://www.govinfo.gov/bulkdata/CFR (directory listings in
  `/bulkdata/json/CFR/...` and `/bulkdata/xml/CFR/...`; an `Accept` header
  matching the form is needed, or the listing can answer 406)
- Guide: https://github.com/usgpo/bulk-data
- General GovInfo review: `govinfo-api-2026-07-31.md` (reuse, failure behavior)

## Fields used

Part-level authority and source wording only (the `AUTH` and `SOURCE` elements
directly under a part, heading and text), the part number, the volume's
revision wording ("Revised as of ..."), and the volume's own table of contents
for the count identity in condition D1. Not used: section text, headings,
editorial notes, per-section amendment citations, subpart-level authority
(counted only).

## Access

- Authentication: none for bulk data. The GovInfo API path needs an
  api.data.gov key and is used only for a part the bulk volume lacks (D-125).
- Rate limits: none numeric documented for bulk data. This build spaces
  requests at least one second apart, never retries, and stops on the first
  non-200 answer or non-XML content.
- Budget for the 0.9.1 build: at most 60 requests in all (listings and volumes).
- CORS: not relevant; the fetch runs at build time in Node, never in the page.
- Cadence: one edition per title per year; the freshness check reports a new
  edition.

## Reuse and attribution

GovInfo policy (summarized in `govinfo-api-2026-07-31.md`): United States
Government works are generally in the public domain, but a publication can
contain copyrighted material used with permission; customary credit goes to
the originating body. The manifest's `rights.statementText` needs the owner's
own reading of https://www.govinfo.gov/about/policies (condition B5); until
then no CFR shard is published as current.

## Known failure behavior

On 2026-07-31 the bulk root answered HTTP 200 with an HTML page titled
"Govinfo Bulkdata Service Error". Status alone is not enough: the build checks
the content type and the XML root before parsing, and treats anything else as
`failureStage: fetch`.

## Observed in this build

Three bounded calls on 2026-11-05 (04:07 UTC on 2026-11-06), no key, no retry:

- `GET /bulkdata/json/CFR/2026/title-25`: 404 with a JSON body. The 2026 edition
  of title 25 (revised as of April 1, 2026) was not yet in bulk data.
- `GET /bulkdata/json/CFR/2025/title-25`: 200 JSON, a `files` list with each
  entry's `justFileName` and `link`: `CFR-2025-title25-vol1.xml`,
  `CFR-2025-title25-vol2.xml`, and a whole-title zip `CFR-2025-title-25.zip`.
  One zip per title means one request per title for the index.
- `GET /bulkdata/CFR/2025/title-25/CFR-2025-title25-vol1.xml`: 200 `text/xml`,
  6,181,052 bytes, SHA-256
  `522b6409f1f5a941b39a69065ce05bc89b45c8e4e083ba0edfded7c6ff0c2304`.

Structure of the volume (root `CFRDOC`): the front matter states "Revised as of
April 1, 2025". A part is `PART` with `EAR` ("Pt. 1"), `HD SOURCE="HED"` ("PART
1—..."), `CONTENTS`, then `AUTH` (an `HD` reading "Authority:" and a `P` with the
text) and `SOURCE` (an `HD` reading "Source:" and a `P`), both optional (part 1
has no `SOURCE`). Each chapter's table of contents is `CHAPTER/TOC` with
`CHAPTI` lists of `PT` (a part number or a range such as "294-299") followed by
`SUBJECT` (the part name) or `RESERVED` ("[Reserved]"). In this volume: 114
`PART`, 114 `PT`, 110 `AUTH`, 128 `SOURCE` (some below part level), 40
`RESERVED`, 494 `SUBPART` (one with its own `AUTH`), 19 `SECAUTH`. Raw bytes
stay in the build's scratch folder outside the repository.
