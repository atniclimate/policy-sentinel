# Oregon Legislature OData offline contract review — 2026-07-31

Implementation state: repository-owned offline contract 1.0; source disabled in
source-registry 1.16.0 with `adapter: null`; live access remains blocked by
`G-C`.

## Scope and access boundary

This checkpoint uses only the public-documentation findings already recorded in
the repository. It made no request to the Oregon OData endpoint or `$metadata`,
did not open or accept the agreement, did not register an account, did not use
or obtain a credential, and did not copy a provider response. The fixtures are
impossible, repository-authored synthetic data from the year 3785 and use no
provider envelope.

The previously reviewed official references are:

- the [Oregon Legislative Data page](https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx);
- the documented [OData service root](https://api.oregonlegislature.gov/odata/odataservice.svc/)
  and [`$metadata` resource](https://api.oregonlegislature.gov/odata/odataservice.svc/$metadata),
  neither requested for this checkpoint;
- the official [Oregon Legislative OData model](https://www.oregonlegislature.gov/citizen_engagement/Documents/OLOData-Model.pdf);
  and
- the official [Acceptable Use Agreement](https://www.oregonlegislature.gov/citizen_engagement/Documents/OLODataAcceptableUseAgreement.pdf),
  retained only as the closed-gate terms reference.

Access date for the repository's reviewed documentation evidence is 2026-07-31.
The documentation covers measures, actions, versions, sponsors, committees,
sessions, votes/status-related legislative data, and related OLIS material. The
earliest OData session observed during the earlier review was 2007. That is not
an official completeness guarantee or an exact-date lower bound. OLIS archives
for 1995–2006 are a separate path, and earlier material remains
archive-and-link-first.

The agreement governs access, credentials, nonsharing, and suspension. No
numeric request quota is published. The source describes data updates about
every five minutes and a full refresh once daily between 5 p.m. and 6 a.m.
Pacific. Previously observed CORS behavior is not a contractual guarantee and
does not authorize browser use; Policy Sentinel remains build-time only. No
live response, error, pagination, retry, deletion, ordering, checksum, or
availability behavior is established by this offline checkpoint.

## Repository-owned logical metadata

Contract 1.0 deliberately defines an internal projection instead of guessing
the provider's entity-set names, casing, response wrapper, exact field names,
or live nullability. The synthetic metadata fixture declares these logical
entities and no others:

| Logical entity | Identity | Nullable projection fields | Retained relationship fields |
|---|---|---|---|
| sessions | `sessionId` | `startDate`, `endDate` | none |
| measures | `measureId` | `title`, `relatingToText`, `statusId` | session; optional current status |
| sponsors | `sponsorId` | `roleLabel` | measure |
| committees | `committeeId` | `chamberLabel` | session |
| actions | `actionId` | `occurredAt`, `committeeId` | measure; optional committee |
| votes | `voteId` | action, committee, date/result, four aggregate counts | measure; optional action and committee |
| versions | `versionId` | `publishedAt` | measure |
| statuses | `statusId` | `asOf` | measure |

Every object rejects unknown fields. Every nullable field must still be present
with either a validated value or explicit `null`; omission is not silently
coerced. IDs must be unmistakably synthetic, unique, and strictly ordered
across repository-owned pages. Pages begin at one, point only to the next
sequential page, end with an explicit `null`, and are bounded to 16 pages, 250
items per page, and 2,000 items per logical entity. Those limits are repository
safety policy, not claims about Oregon's service.

Foreign keys must resolve across the complete synthetic traversal. Committee
relationships must remain in the measure's session, a vote's optional action
must belong to the same measure, a measure's selected status must belong to
that measure, action sequences must be unique per measure, and version labels
must be unique per measure. A session before 2007 is rejected because this
contract has no reviewed basis for projecting older OData history; that does
not assert completeness from 2007 forward.

## Fit with the public record contract

The offline DTO is not a `PolicyRecord`, provider provenance, source-health
receipt, coverage artifact, or last-known-good shard.

| Logical source concept | Possible future record fit | Current gap or prohibition |
|---|---|---|
| measure identity, number, title | source record identity, document identifier, official title | A null title cannot satisfy required `officialTitle`; no record may be emitted. Live identity rules remain unverified. |
| session | `legislativeContext.session` | Live label, chamber, and session identity still require reconciliation. |
| sponsor and committee names | `sponsors` and `committees` | Only allowlisted official display names and IDs may survive. Contact, membership, and testimony data are excluded. |
| action label and date | `actionHistory` | The record requires an official source URL for every event; the offline projection intentionally has none. |
| selected and historical status labels | current status and `statusHistory` | Normalized status rules, a required current `asOf`, official event URLs, and completeness remain unverified. Missing values cannot be invented. |
| versions | no first-class version collection | Do not force versions into text, actions, or source-document relationships. A schema decision is required before publication. |
| votes | no first-class vote collection | Do not turn aggregate counts or result labels into action/status/legal-effect conclusions. Individual-voter data is not retained. |
| `Relating To Clause` text | source-language detail only, if later authorized | It is not a controlled official subject. It cannot drive taxonomy, Nation association, relevance, or a legal conclusion. |
| OLIS links and source paths | URLs and field provenance after live review | Exact provider paths, official link roles, retrieval time, source update time, and field-level provenance do not exist in synthetic evidence. |

Statewide records without exact official Nation evidence remain
`general_jurisdiction`, with no Nation association. No exact official subject
mapping has been reviewed, so any future record remains `Unclassified` unless
a separate deterministic mapping is approved.

## Privacy, failure, and lifecycle boundaries

The allowlist excludes committee public testimony, contact fields, addresses,
individual-voter detail, attachments, raw response bodies, comments, land
information, and unrelated free text. Tests inject representative email,
phone, testimony, voter-name, and land fields and require rejection.

Contract failures include metadata drift, missing or unexpected fields, invalid
nullability or dates, duplicate or unstable identity order, incomplete or
over-budget pagination, unresolved or cross-session relationships, duplicate
per-measure action/version identities, and pre-2007 history. All fail closed.

Source-registry 1.16.0 records `oregon-legislature-odata` as disabled with
`adapter: null`, null exact-date coverage, `build_secret` authentication, and
metadata-and-links-only reproduction intent. Because the source is disabled,
it emits no coverage entry, source health, record, manifest source ID, or
last-known-good shard. If `G-C` later opens, live metadata, field names,
nullability, pagination, identities, history, links, privacy behavior,
refresh/credential rules, OLIS reconciliation, health, and atomic
last-known-good handling must all be reviewed before activation.

## Contract artifacts

- `src/contracts/oregon-odata/`: constants, canonical logical metadata,
  allowlisted parser, cross-entity checks, and typed errors; no request,
  transport, environment, or adapter surface.
- `fixtures/sources/oregon-odata/metadata.valid.json`: canonical
  repository-owned logical metadata.
- `fixtures/sources/oregon-odata/resource-bundle.valid.json`: impossible
  synthetic sessions, measures, sponsors, committees, actions, votes,
  versions, and statuses, including explicit nulls and a two-page traversal.
- `fixtures/sources/oregon-odata/resource-bundle-malformed.invalid.json`:
  representative excluded contact data.
- `tests/contracts/oregon-odata/offline-contract.test.ts`: metadata, identity,
  nullability, pagination, privacy, relationship, unsupported-history,
  no-inference, and no-network coverage.

`G-C` remains closed. This contract completion does not approve or implement
the live adapter.
