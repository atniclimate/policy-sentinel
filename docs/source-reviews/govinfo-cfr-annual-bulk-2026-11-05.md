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
own reading of https://www.govinfo.gov/about/policies (condition B5). For the
0.9.8 build an agent read the page (next section) and wrote the record, which
the index schema can only label `readByRole: owner`. The owner confirmed the
passage on 2026-11-19 (D-195), so the label is now true and the CFR files are
published as current.

## Policies and bulk-data pages, read word for word (D-141)

Read on 2026-11-19 under the owner's ruling on the GovInfo policies wording
(D-141) and the fetch approval of the same day (D-190). One request per page,
no retry; none blocked the read.

https://www.govinfo.gov/about/policies, under "Public Domain & Copyright
Notice", after the lead-in "Title 17, Section 105, United States Code, provides
that:". This passage is the manifest's rights statement, checked against the
saved page character for character:

> Copyright protection under this title is not available for any work of the
> United States Government, but the United States Government is not precluded
> from receiving and holding copyrights transferred to it by assignment,
> bequest, or otherwise. The intent of the section is to place in the public
> domain all work of the United States Government, which is defined in 17
> U.S.C. § 101 as work prepared by an officer or employee of the United States
> Government as part of the person's official duties. By virtue of the
> foregoing, public documents can generally be reprinted without legal
> restriction. However, Government publications may contain copyrighted
> material which was used with permission of the copyright owner. Publication
> in a Government document does not authorize any use or appropriation of such
> copyright material without consent of the owner. Since the Government
> Publishing Office serves merely as a printing and distribution agency for
> Government publications and has no jurisdiction over their content or subject
> matter, it is advisable to consult with the originating department or agency,
> or its successor, prior to reprinting any given publication. In those
> instances in which permission to reprint material from Government
> publications is granted, customary credit should be given to the Government
> department or agency which prepared the material.

The same page says its images are licensed and "are not in the public domain";
the index carries no image.

https://www.govinfo.gov/bulkdata/ states: "GPO makes select collections
available in bulk in a machine-readable format (i.e. XML) via our Bulk Data
Repository." It states no condition of use, rate limit or attribution rule.
The guide it points to, https://github.com/usgpo/bulk-data, states: "If
crawling the xml and json endpoints programmatically, you should ensure that
you set the appropriate accept headers in your request, or you may see a 406
response." https://www.govinfo.gov/robots.txt disallows no `/bulkdata/` path
and lists the bulk-data sitemaps, the CFR one among them.

Reading: these statements allow a small derived index of part-level
"Authority:" and "Source:" wording with credit to the issuing agency, which
each row already names. The rights record gives the passage above, the
policies address and the read date 2026-11-19. The read was made by an agent
under D-141; the owner confirmed the wording on 2026-11-19 (D-195).

## Known failure behavior

On 2026-07-31 the bulk root answered HTTP 200 with an HTML page titled
"Govinfo Bulkdata Service Error". Status alone is not enough: the build checks
the content type and the XML root before parsing, and treats anything else as
`failureStage: fetch`.

## Observed in the 0.9.1 build (2026-11-05)

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

## Observed in the 0.9.8 build (2026-11-19, D-190)

Eleven requests, no key, no retry, raw files kept outside the repository:

- `GET /bulkdata/json/CFR/2026`: 200. The 2026 edition held 14 titles and none
  of 25, 36, 40, 43 or 50, so each index file is built from the 2025 edition.
- For each of the five titles, one listing and one whole-title zip
  (`CFR-2025-title-N.zip`): all 200. Title 40's zip was 27,537,122 bytes.
- Shapes the builder had not met in title 25, each now read and tested
  (`tests/demo/demo-index-cfr-shapes.test.ts`): running heads printed
  "PT. 1001", "Pt.3100" and "Pt 3140"; five-digit parts (43 CFR 10000); an
  empty running head, where the part's own heading states the number (43 CFR
  3000); a subtitle that lists its parts in its own contents (43 CFR subtitle
  A); a part repeated in a later volume with the same Authority and Source
  lines (50 CFR 17); and an Authority line that cites a U.S. Code note ("25
  U.S.C. 5130 note", 25 CFR 83).
- Title 40: volume 9 of the 2025 edition states "Revised as of July 1, 2024".
  It holds only the continuation of part 60, with no part-level line, so the
  index leaves that volume out and its manifest entry names the 34 volumes it
  read. Volume 18 was not in the listing or the zip. Volume 17 is "Parts 64 to
  71" and volume 19 is "Parts 79 to 80", so parts 72 to 78 are not in the
  index file; the page says "Not in the index file" for them and links the
  official text. The file's own count of expected parts comes from the volumes
  read, so it does not show this gap.
- Title 50: the listing held volumes 1, 2, 6 and 9 to 13 only. The volumes it
  lacked are continuations of part 17.
- Results: title 25, 154 parts ("Revised as of April 1, 2025"); title 36, 166
  parts ("Revised as of July 1, 2025"); title 40, 320 parts ("Revised as of
  July 1, 2025"); title 43, 179 parts and title 50, 87 parts ("Revised as of
  October 1, 2025"). An Authority or Source line that the Nation-name check
  flags is left out and counted, never shown as absent: three in title 25, two
  in title 40, one in title 43.
- Four of the five first runs failed after their download on one of the shapes
  above. Each index file was then built from the kept download through the
  same acquisition code, with no second request; its manifest entry carries
  the time of the original request.
