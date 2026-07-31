# 2026 BIA recognition-notice review

Review date: 2026-07-31

Status: transcription verified; 575-identity reconciliation blocked

## Decision

Do not emit or publish a live Nation registry from the 2026 notice yet.

Two independent reviews verified the notice's stated total of 575 and the same
ordered inventory of 577 displayed list-entry paragraphs: 348 in the
contiguous section and 229 in the Alaska section. The current notice provides
no row-level reconciliation from those paragraphs to its stated 575 entities.
Selecting, excluding, or merging rows merely to make the arithmetic reach 575
would be an inference about recognition or grouping, which Policy Sentinel
forbids.

The previous adapter removed only `Arctic Village` and `Village of Venetie`,
treated them as aliases of the Native Village of Venetie Tribal Government, and
kept every Pribilof row. That asymmetric rule reaches 575 but is not stated in
the current notice. It has been removed.

## Primary sources

All sources were accessed on 2026-07-31.

- [Federal Register metadata API](https://www.federalregister.gov/api/v1/documents/2026-01899.json)
- [Federal Register structured HTML](https://www.federalregister.gov/documents/full_text/html/2026/01/30/2026-01899.html)
- [Federal Register structured XML](https://www.federalregister.gov/documents/full_text/xml/2026/01/30/2026-01899.xml)
- [GovInfo HTML rendition](https://www.govinfo.gov/content/pkg/FR-2026-01-30/html/2026-01899.htm)
- [Official GovInfo PDF](https://www.govinfo.gov/content/pkg/FR-2026-01-30/pdf/2026-01899.pdf)
- [2022 notice and clarification](https://www.govinfo.gov/content/pkg/FR-2022-01-28/html/2022-01789.htm)
- [January 2023 notice and clarification](https://www.govinfo.gov/content/pkg/FR-2023-01-12/html/2023-00504.htm)
- [August 2023 withdrawal and return](https://www.govinfo.gov/content/pkg/FR-2023-08-11/html/2023-17195.htm)
- [December 2024 notice](https://www.govinfo.gov/content/pkg/FR-2024-12-11/html/2024-29005.htm)

The current metadata identifies FR Doc. 2026-01899, publication date
2026-01-30, and pages 4102-4106. At review time, the Federal Register API
returned `correction_of: null` and an empty `corrections` array. The adapter
requires both values and forces a new review if either changes.

## Independent methods

### Structured-source inventory

The implementation method bounded FederalRegister.gov structured HTML between
the two exact list headings, retained only list paragraphs, removed unprinted
page controls, decoded entities, normalized to NFC, joined inline text,
collapsed whitespace runs to one space, removed whitespace immediately after
`(`, before `)`, and before `,.;:`, and trimmed each value. It did not
editorially change stored punctuation.

Results:

| Check | Result |
| --- | ---: |
| Contiguous paragraphs | 348 |
| Alaska paragraphs | 229 |
| Total displayed paragraphs | 577 |
| Distinct paragraph identifiers | 577 |
| Stated entities | 575 |
| Paragraphs containing `(See...)` | 5 |
| `(See...)` clauses | 6 |

The SHA-256 of the resulting 577 paragraph values in source order, joined by
LF without a trailing LF, is
`c33e84713c51fe3b58f53ec8a17ee865d2cf82e12716a09b9e9273b3e41306be`.
The adapter enforces this ordered digest and the section counts, so a reordered,
missing, substituted, or newly corrected row requires a new review.

The GovInfo check applies the same visible-text normalization to the rendition,
then converts every em dash to the GovInfo comparison form `--`. It bounds the
string from the first character of the contiguous-section heading to the
character before `[FR Doc. 2026-01899`, trims that bounded string, and hashes
its UTF-8 bytes. The enforced SHA-256 is
`f80718946ce77076470427b2bac13a14e1548913eae710270c7975fb88aa9ce1`.
This second digest includes both headings and all intervening list text.

### Official-edition reconstruction

An independent reviewer used Python 3.13.14 and `pypdf` 6.8.0 default text
extraction on zero-based PDF pages 1-4, corresponding to printed pages
4103-4106. The reconstruction removed each Federal Register page header and
the text from `VerDate Sep<11>2014` onward, joined a line break immediately
following a hyphen, en dash, or em dash without inserting a space, applied NFC
and the same whitespace and punctuation-spacing rules described above, and
bounded the result from the exact contiguous-section heading to the character
before `[FR Doc. 2026–01899`.

The normalized bounded PDF contains 23,560 characters and has SHA-256
`dfa72322ff97074eddbb303566e8a4b8957012033fd4f0ec20eb6fbb3a1f9786`.
After converting right apostrophes to ASCII apostrophes, en dashes to ASCII
hyphens, and case-folding for comparison only, all 577 structured entries
matched sequentially with both headings, one-space gaps between all entries,
and no unmatched tail. The LF-joined comparison-normalized entry sequence,
without a trailing LF, has SHA-256
`3fa7b37aec0dee75c14ae02903a3e1e20c234ffea42fd405c31fe8e1aa63c84c`.

The exact representation differences affect 15 rows: 14 PDF right-apostrophe
forms versus structured ASCII apostrophes, plus the PDF en dash in
`Seneca–Cayuga`. Lumbee's PDF extraction also renders
`SUPPLEMENTARY INFORMATION` in small capitals. Both renditions preserve the
same four em dashes. The official PDF byte SHA-256 was
`088059e414371ea9443c0350d6efad06db43d44d44d50e382f70014cdfc66911`;
the GovInfo HTML byte SHA-256 was
`bc6974ce2bc56c49f9930f382411c87a2f049e9a923a2164d972467e0a97e274`.
These byte hashes are review evidence, not runtime pins: harmless provider
markup can change while the ordered normalized inventory remains the same.

The runtime check requires the stated total, both ordered headings, the bounded
GovInfo digest, and every entry in section order. A global substring match is
insufficient because it could accept a name appearing outside the list or
conceal reordering.

## Grouping discrepancy

The six disputed Alaska paragraphs consist of two grouping-form rows and four
component/cross-reference rows:

- Native Village of Venetie Tribal Government, with Arctic Village and Village
  of Venetie in parentheses
- Pribilof Islands Aleut Communities, with St. George Island and Saint Paul
  Island in parentheses
- Aleut Community of St. Paul Island, pointing to the Pribilof grouping row and
  carrying a nested previous-name pointer
- Arctic Village, pointing to the Venetie grouping row
- St. George Island, pointing to the Pribilof grouping row
- Village of Venetie, pointing to the Venetie grouping row

The 2022 and January 2023 notices explicitly placed the two grouping
descriptions outside the official count and counted the four component rows.
The August 2023 notice then expressly withdrew that clarification and returned
both grouping entities to the List while continuing to display the component
rows and state the unchanged total. The 2024 notice displays 576 paragraphs
while stating 574, and the 2026 notice displays 577 while stating 575. The
superseded clarification therefore cannot be silently applied to the current
notice, but the later notices do not supply a replacement row-level
reconciliation.

All six paragraphs remain source evidence. None is called an alias, duplicate,
or non-Nation by Policy Sentinel until an originating BIA source provides the
exact current mapping.

## Other adjudicated cases

- The Capitan Grande paragraph remains one source paragraph. Barona and Viejas
  are not split merely because they occur inside a semicolon-delimited
  parenthetical. The 2022 list's displayed paragraphs already match its stated
  section counts without a Capitan adjustment.
- Minnesota Chippewa, Te-Moak, Paiute Indian Tribe of Utah, Pit River, Washoe,
  Wichita and Affiliated Tribes, Venetie, and Pribilof group text is preserved
  without generic constituent expansion.
- Lumbee's `(See Supplementary Information...)` is an eligibility pointer, not
  an alias or a reason to remove the row.
- The nested St. Paul previous-name pointer survives normalization.
- `PuliklaTribe` remains uncorrected because that no-space form appears in the
  current source.
- Parentheses that are part of a present name, such as Muscogee (Creek) and
  Gay Head (Aquinnah), are not generically stripped.

The notice says the correct current name precedes prior-name or `aka`
parentheticals. The source-paragraph inventory preserves the entire paragraph;
it is not yet a canonical current-name/alias crosswalk. Stable IDs and
authorized alias carry-forward remain downstream work after the identity gate.

## Punctuation representation

The official PDF uses typographic right apostrophes in 14 list rows and an en
dash in `Seneca–Cayuga`, while the structured HTML/XML uses ASCII apostrophes
and an ASCII hyphen. Both representations contain em dashes in several names.

The parser preserves the structured rendition as its machine transcription and
uses only whitespace normalization plus em-dash-to-double-hyphen equivalence
when comparing it with GovInfo HTML. It does not normalize all PDF typographic
differences or silently rewrite stored source text. A future display-name
crosswalk must choose and cite its representation explicitly.

## Auxiliary TLD check

Only non-contact identity fields were queried from the current public BIA
Tribal Leaders Directory as a supplementary check. On 2026-07-31, the official
[ArcGIS layer](https://services1.arcgis.com/UxqqIfhng71wUT9x/arcgis/rest/services/TribalLeadership_Directory/FeatureServer/0?f=pjson)
reported 588 records, `maxRecordCount: 2000`, and a last edit time of
2026-07-30T10:00:30.417Z. The identity-only query used
`returnGeometry=false`, ordered by `OBJECTID`, and requested only `OBJECTID`,
`tribefullname`, `tribe`, `tribealternatename`, and `tribalcomponent` for names
containing `Venetie`, `Pribilof`, `St. Paul`, `St. George`, or
`Arctic Village`. It returned six corresponding records, OIDs 5, 11, 155, 185,
189, and 224. Two directory names differ from the annual paragraphs, further
showing that the TLD cannot adjudicate the notice.

The [BIA directory page](https://www.bia.gov/service/tribal-leaders-directory)
states 575 as of 2026-01-30, while BIA's
[dataset disclaimer](https://www.bia.gov/service/tribal-leaders-directory/tld-csvexcel-dataset)
says the directory is not the official recognition list. The 588-row layer
therefore cannot reconcile the annual notice. No TLD contacts, addresses,
coordinates, geometry, or raw response were retained.

## Fail-closed behavior and regressions

- `npm run source:bia` verifies the live transcript but exits unsuccessfully at
  the unresolved identity gate and writes no registry.
- Any future output path is restricted to ignored
  `.cache/source-validation/bia/`, outside the deployable `dist/` tree. The
  source-boundary scan also forbids tracking `.cache/`, and command startup
  removes the exact legacy `dist/source-validation/bia/nations.json` target.
- No non-synthetic BIA artifact builder is enabled: live construction always
  terminates at the identity gate. The compatible v1 artifact schema is not
  publication authorization. Before any production builder is enabled, a
  versioned semantic gate must tie every official name and alias to its field
  provenance, source identifier, exact list entry, section, baseline citation,
  review evidence, and validation counts; property presence alone is
  insufficient.
- Fixtures cover all six disputed rows, nested pointers, hidden page controls,
  entity decoding, em dashes, apostrophes, ampersands, meaningful parentheses,
  Capitan/Minnesota/Te-Moak grouping, Lumbee, and `PuliklaTribe`.
- Tests reject count drift, duplicate disputed rows, unordered GovInfo
  comparison, an unreviewed 577-row digest, linked or colliding staging output,
  and output outside the ignored BIA staging subtree.

## Unblocking evidence

The identity gate can open only when current originating BIA evidence
unambiguously maps the displayed source paragraphs to the stated 575 entities
and the mapping passes two independent reviews. Until then there is no
last-known-good public Nation shard, the live registry is unavailable, the
application remains synthetic, and state coverage remains unresolved. Resolving
this technical source gate would not authorize publication: the separate
owner-controlled remote, Pages, release, and publication gates remain closed
until the owner approves those exact actions.
