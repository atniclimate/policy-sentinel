# Washington Centennial Accord source and reproduction review

Accessed: 2026-07-31

Implementation state: researched in source-registry 1.12.0; registered disabled
with `adapter: null`; no production records

External authorization: none required for the reviewed public pages

Activation state: closed. The official page supports one general-jurisdiction
landmark candidate, but the current record model cannot preserve accord parties,
an executed date, source status, supersession review, and metadata-only landmark
evidence without forcing them into fields with different meanings.

## Primary sources

- [GOIA Centennial Accord](https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord)
- [GOIA State Tribal Relations / Centennial Accord hub](https://goia.wa.gov/state-tribal-relations-centennial-accord)
- [Millennium Agreement hub](https://goia.wa.gov/state-tribal-relations-centennial-accord/millennium-agreement)
- [Millennium Agreement text](https://goia.wa.gov/state-tribal-relations-centennial-accord/millennium-agreement/institutionalizing-government-government-relationship-preparation-new-millennium)
- [Millennium Agreement press release](https://goia.wa.gov/state-tribal-relations-centennial-accord/millennium-agreement/millennium-agreement-press-release)
- [Government-to-Government Implementation Guidelines](https://goia.wa.gov/state-tribal-relations-centennial-accord/millennium-agreement/executive-summary-government-government-implementation-guidelines)
- [RCW 43.376.500](https://app.leg.wa.gov/RCW/default.aspx?cite=43.376.500)
- [RCW 43.376.900](https://app.leg.wa.gov/RCW/default.aspx?cite=43.376.900)
- [GOIA privacy notice and disclaimer](https://goia.wa.gov/privacy-notice)
- [WSDOT Centennial Accord Plan](https://wsdot.wa.gov/sites/default/files/2021-10/WSDOTCentennialAccordPlan5mb.pdf)
- [2026 Senate final bill report for SSB 6034](https://lawfilesext.leg.wa.gov/biennium/2025-26/Pdf/Bill%20Reports/Senate/6034-S%20SBR%20FBR%2026.pdf)

GOIA is the originating state publisher for the reviewed Accord page. Current
RCW 43.376.500 creates GOIA as a cabinet agency and assigns it responsibility
for annual meetings to implement the Centennial Accords. The statute and
current hub support the continuing institutional framework, but neither is
converted into a legal-effect determination for the 1989 instrument.

## Identity, title, and date

The canonical page supplies:

- page title `Centennial Accord`;
- official instrument title
  `Centennial Accord between the Federally Recognized Indian Tribes in
  Washington State and the State of Washington`; and
- an exact dated execution event on 1989-08-04.

No official accord number or citation is supplied. Drupal node `678` identifies
the current web-page record, not the instrument, and must never be presented as
an Accord identifier. A future adapter would need a reviewed fallback identity
rule that distinguishes the exact page title, canonical path, and execution date
from an invented official number.

The page does not label 1989-08-04 as a publication or effective date and
supplies no source update timestamp. Those fields remain null. The date must be
retained as an executed/signed event under an accord-specific date role rather
than coerced into publication or effectiveness.

## Parties, status, and Nation evidence

The page identifies two collective sides:

- the State of Washington, through its governor; and
- the federally recognized Indian tribes of Washington that signed the Accord.

The page does not name a governor, Nation, individual signatory, or complete
signatory set and contains no signature block or signed facsimile. Its historical
statement that 26 federally recognized tribes existed in Washington does not say
that all 26 signed. It also cannot be joined to a current count or directory.

The official WSDOT plan appendix reports 24 original Tribal representatives and
three later signers. The 2026 Senate final bill report instead describes 26
original signers and gives different years for later signers. Neither is the
signed instrument. Their disagreement reinforces the fail-closed rule; no names
from either source were retained and neither supports a Nation association.

The repository also lacks an approved live Nation registry while its 577
displayed recognition-list paragraphs remain unreconciled with the required
575. Therefore a valid public `nationId` association cannot be created even if
later signature evidence identifies a Nation. The only current treatment is
state `general_jurisdiction` plus a visible limitation; there are zero Nation
associations.

The page says the parties executed the Accord and agreed to be bound. That is an
execution event, not a separately structured current source-status field. A
future record may preserve source language such as `Executed` only through a
reviewed accord-status rule and must normalize it to `unknown`; it must never
infer `active`, `effective`, rights, jurisdiction, or a legal conclusion.

## Millennium Agreement and supersession

The 1999 press release describes the Millennium Agreement as an affirmation and
day-to-day implementation of the Centennial Accord. The implementation
guidelines call the Centennial Accord the foundation, and the Agreement text
continues the relationship it established. These official pages do not support
a `superseded` label.

They also do not constitute a complete amendment or supersession history. The
current relationship vocabulary supports only corrections and a generic related
document, not `supersedes` or `superseded_by`. No relationship edge or negative
completeness claim is created. A later Millennium record remains separate and
requires its own complete party, date, identity, reproduction, and source
contract.

## Landmark and reproduction treatment

The exact official title and execution evidence establish a public state
intergovernmental accord candidate under criterion
`public-state-federal-accord`. The page is an official HTML transcription, not
a signed scan.

GOIA's privacy notice covers site data collection, public access, security, and
a disclaimer. It supplies no content-reuse license, full-text permission,
mandatory attribution wording, or warranty of accuracy or timeliness. Public
availability and public-record access are not republication permission,
particularly for a jointly created state-Tribal instrument.

The publication boundary is therefore:

- descriptive attribution to
  `Washington Governor's Office of Indian Affairs`;
- exact title, date-role metadata, collective party metadata, and official
  links only after the model can preserve those roles;
- no body excerpt, summary, full text, signature image, or provider corpus;
- `Unclassified` with no official subject mapping;
- no AI output; and
- no representative names, contacts, registration information, maps, parcels,
  land detail, or territory-based inference.

The current landmark structure requires a `SourceText` value, while this source
is metadata-and-links-only. A later compatible model needs a reviewed
metadata-evidence option rather than using copied body language merely to make
the schema pass.

## Bounded structural observation

One exact, aggregate-only request to the canonical page sent
`Accept-Encoding: identity`, no credentials, and no referrer. It returned
exact-URL HTTP 200 UTF-8 HTML with no `Content-Length`, 88,747 bytes in 44
nonempty chunks. The inert `parse5` observation counted 1,416 DOM nodes, 1,034
attributes, maximum depth 23, 36,108 text code units, and six
`duplicate-attribute` parse errors outside the target article. No response body
was written or retained.

The page had exactly one HTML article with the canonical `about` path and one
article body marked `property="schema:text"`. That body had 8,909 normalized
characters and 26 direct elements: one exact title heading, five ordered
section headings, and 20 paragraphs. It contained no nested link, table, form,
image, script, template, or signature block. The surrounding Drupal shell had
96 links, 32 scripts, and one form, including contact, directory, and map
navigation; none is an eligible source field.

The observation-only SHA-256 of collapsed, trimmed article text was
`b9465ea683c80274270a032ca81cbb9e9a1da1235ac2af2ad7f2b1aca7bd4900`.
This is structural evidence, not permission to store or reproduce the text.

## Access, transport, health, and failure

No account, key, API registration, access-triggered terms acceptance, paid
request, documented numeric limit, retry policy, SLA, checksum, update cadence,
or browser contract was found. The page has no observed CORS authorization.
GOIA's privacy notice says ordinary browsing can log network and request
metadata. Any implementation remains one weekly build-time request with no
cookies, credentials, referrer, user input, link traversal, or browser call.

A future transport must construct the one literal HTTPS URL internally, reject
userinfo, alternate hosts, ports, query, fragment, redirect, and DNS resolution
to nonpublic space, request identity encoding, require exact final URL and HTTP
200 UTF-8 HTML, and enforce fixed 30-second, 128-KiB, 512-chunk, DOM, attribute,
depth, text, and parse-error ceilings. It must parse only the unique canonical
article, retain only an allowlisted projection and hashes, zero provider bytes,
and sanitize every failure.

`washington-centennial-accord` is an independent health and last-known-good
boundary. After activation, a failed refresh may use only that source's
checksum-validated prior public shard and must preserve its original data-as-of
time. Without one, omit the source and mark it unavailable. While disabled it
appears in no public coverage, health, record, or artifact.

## Implementation decision

Source-registry schema 1.3 adds `official_page` for an originating official
document page that is neither an API, feed, export, nor index. Registry 1.11
registers `washington-centennial-accord` independently, disabled with
`adapter: null`, exact single-record coverage 1989-08-04, one runtime host,
metadata-and-links reproduction, and no subject mapping.

Adapter work is evidence-blocked until a versioned accord-specific record-model
decision:

1. preserves parties/signatories with their exact source roles instead of
   displaying them as issuing bodies;
2. preserves an executed/signed date without converting it into publication,
   effectiveness, or a generic undifferentiated date;
3. represents narrative execution evidence without inventing a formal current
   source status;
4. supports reviewed supersession states and typed relationships without
   implying a complete history;
5. supports metadata-only landmark evidence and validates reproduction policy;
6. records a title-based fallback identity rule explicitly; and
7. keeps unresolved signatories at general jurisdiction with zero Nation
   associations and a visible limitation.

No parser or adapter scaffold is created merely to satisfy a checkbox. The
source remains a truthful planned-source gap until that model and its synthetic,
UI, provenance, privacy, health, and LKG tests pass.
