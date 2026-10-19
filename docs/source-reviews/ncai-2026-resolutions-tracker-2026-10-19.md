# NCAI 2026 annual resolutions tracker source review

Accessed: 2026-10-19

Implementation state: demo-only, hand-checked, password-gated snapshot under
D-105; no engine source, adapter, acquisition, public record or automatic
refresh

External authorization: D-105 (owner ruling of 2026-10-19 on the NCAI 2026
draft resolutions) accepts the gated snapshot pending NCAI's answer to the
owner's permission request of 2026-10-19. Republication rights are unresolved.

## Primary sources

- [NCAI 2026 Annual Resolutions Tracker](https://docs.google.com/spreadsheets/d/e/2PACX-1vQjca-odamdI2VdMhaARZ8KEehvENUKav5RBVa2bgRMDpKiXSoFba1x-ZmwJOTgC3uIuQ7t0LdmdlVu/pubhtml?gid=1062135734&single=true)
- [2026 Annual Policy Resolutions in progress](https://www.ncai.org/news/2026-annual-policy-resolutions-in-progress)
- [83rd Annual Convention and Marketplace](https://www.ncai.org/event/83rd-annual-convention-and-marketplace)
- [NCAI resolutions](https://www.ncai.org/resolutions)
- [NCAI AssetBank robots policy](https://ncai.assetbank-server.com/robots.txt)
- [Google Docs Editors Help: publish a file](https://support.google.com/docs/answer/183965)

## Origin and authenticity

The tracker is a Google Sheets publish-to-web page. NCAI's news page, dated
2026-10-05, links to it from a "View resolutions in progress" button and says:
"The resolutions will be further updated throughout the Annual Convention."
The convention event page (2026-10-18 to 2026-10-22) links to the same host
with the same sentence. These two NCAI pages establish that the tracker is
NCAI's own publication. They do not establish a reuse license.

The tracker lists draft submissions under committee review. It is not the
archive of adopted NCAI resolutions, and an entry is not NCAI policy.

## Fields and layout at receipt

As recorded by the director, the tracker was read once on 2026-10-19 in a
browser session through the sheet's own tab-separated export. It is a visually
grouped sheet with one vertical block per entry, not one row per entry. Each
block carries these labels: Resolution #, Title (Original), Title (Proposed),
Sponsor, Sponsor Affiliation, Resolutions Committee Recommendation, then
committee and subcommittee cells and notes, then Subcommittee Recommendation,
Committee Recommendation and Final Action.

- 81 numbered entries, `PSC-26-001` through `PSC-26-081`.
- Every Title (Proposed), Subcommittee Recommendation, Committee
  Recommendation and Final Action cell was blank.
- Resolutions Committee Recommendation values include in order, out of order,
  late, withdrawn, tabled and under review, some in compound wording; one entry
  is deferred to the 2027 Executive Council Winter Session.
- Some committee and subcommittee cells are empty; notes record merges and
  referrals between entries.
- No entry links to a draft text.

Sponsor Affiliation lists Nations and other organizations alike. It records
what NCAI listed for a sponsor; it is not evidence of a Nation relationship to
any policy (safeguard 1).

## Date range and cadence

The tracker covers the 2026 Annual Convention cycle only. NCAI says it will be
updated throughout the convention. Google's help says changes to a published
file update the published version automatically, possibly after a few minutes,
and that the owner can stop publishing at any time. No change feed, version
history, checksum or update schedule is published.

## Access, authentication, rate limits and CORS

The published page needs no account, key or registration. There is no API and
no stated rate limit; the absence of a statement is not permission for
automated use. CORS was not tested and is not relied on, because the browser
never contacts Google or NCAI for this data.

## Use and attribution terms

The NCAI pages carry the footer "(c) 2026 National Congress of American
Indians. All Rights Reserved." and a privacy-policy link; no terms of use or
reuse license was found. Publishing to the web makes the sheet viewable; it is
not a grant of republication rights (safeguard 5). An independent adversarial
review on 2026-10-19 found the rights unresolved. Attribution: National
Congress of American Indians, 2026 Annual Resolutions Tracker, with the read
date.

## How Policy Sentinel uses it (D-105)

- A hand-checked snapshot keeps the verbatim Title (Original), Sponsor
  Affiliation, Resolutions Committee Recommendation, committee, subcommittee
  and notes. Individual sponsor names are omitted.
- Hand-picked search suggestions are added per draft. They are Policy Sentinel
  additions, not NCAI content. Committee labels describe the draft only and are
  never applied to search results. A text search for an affiliation's name
  returns text matches only; it is not evidence of a relationship.
- The snapshot is stored in the repository only as an encrypted file
  (`src/demo/ncai-2026.vault.json`; AES-256-GCM with a key from PBKDF2-SHA256
  at 600,000 iterations). The browser opens it with a password the owner shares
  with convention participants. The password and the plaintext are not in the
  repository.
- The browser never contacts Google or NCAI for this data.

A shared password deters casual access and search indexing; it is not strong
protection. Anyone who has it can read and share the data, and the password is
guessable.

## Failure and staleness

The snapshot is labeled with its read date, 2026-10-19, and goes stale as NCAI
updates the tracker; nothing refreshes it automatically. A newer read needs a
fresh hand check and a new sealed file. If NCAI stops publishing the sheet or
changes its layout, the existing snapshot keeps its original read date and
stays labeled as of that date. When NCAI publishes final actions, the drafts
need a deliberate retirement; a draft entry never becomes an adopted record.

## Adopted resolutions archive

Adopted resolutions are a separate NCAI archive at
<https://www.ncai.org/resolutions>, which describes holdings since 1944, notes
missing years, and links to `ncai.assetbank-server.com` for the documents. The
AssetBank robots policy read on 2026-10-19 is `User-agent: *` with
`Disallow: /`. Policy Sentinel does not fetch AssetBank. The owner's email of
2026-10-19 (16:05 UTC) to NCAI also asked about access to the AssetBank
resolution PDFs.

## Open owner items

- NCAI's answer on republishing the snapshot fields and on the AssetBank PDFs;
  D-105 is revisited when NCAI replies.
- Whether to refresh the snapshot during the convention, and its retirement
  after final actions.
