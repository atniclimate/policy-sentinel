# Versioned data contract

## Files and status

The Phase A contracts are:

- [`record.schema.v1.json`](../schemas/record.schema.v1.json), normalized
  record schema version `1.1.0`;
- [`taxonomy.schema.v1.json`](../schemas/taxonomy.schema.v1.json), taxonomy
  schema version `1.0.0`; and
- [`taxonomy.v1.json`](../config/taxonomy.v1.json), the editable ten-category,
  33-subcategory starting taxonomy;
- [`source.schema.v1.json`](../schemas/source.schema.v1.json), compatible v1
  source-registry schema version `1.1.0`;
- [`sources.v1.json`](../config/sources.v1.json), source registry version
  `1.5.0`; and
- [`artifact.schema.v1.json`](../schemas/artifact.schema.v1.json), static
  artifact schema version `1.0.0`.

These contracts support Phase B local implementation; their presence is not
evidence that a production source is enabled or a public dataset exists.
`npm test` compiles the schemas in strict mode, validates the source registry,
taxonomy, and synthetic fixtures, and proves selected invalid governance cases
are rejected.

Source-registry version `1.5.0` distinguishes researched configuration,
implemented adapters, and activation. A disabled source may have
`adapter: null` or a versioned adapter that is not authorized to emit public
records; an enabled source must have a versioned adapter. Every non-synthetic
source records the date its cited contract and terms were accessed. Disabled
sources and their identifiers are rejected from coverage, health, manifests,
and records rather than appearing as an unavailable public source. The
Grants.gov entry is disabled with no adapter because its current terms and live
contract canaries remain behind G-B-GRANTS. The Congress.gov entry is likewise
disabled with no adapter because registration, key handling, runtime-host
selection, and live response validation remain behind G-B-CONGRESS; its local
contract uses synthetic resource fragments only. GovInfo is also disabled with
no adapter: every reviewed API operation requires a query-bound key, and its
formal package/granule response schemas do not establish a safe live contract.
Its local contract preserves only repository-owned synthetic projections,
keeps GovInfo package/granule identity separate from Congress.gov identity, and
distinguishes local transport SHA-256 verification from optional provider
PREMIS fixity.

## Record groups

The normalized record preserves:

| Group | Contract |
|---|---|
| Identity | Schema version, stable opaque internal ID, source ID, exact source record ID, exact official title, and source-specific document identifier. |
| Classification | Document type, jurisdiction and level, issuing bodies, session/congress context, normalized and exact source status, official subjects, zero-or-more taxonomy memberships, and explicit `isUnclassified`. |
| Dates | Introduction, publication, update, action, deadline, retrieval, and any source-defined dates, without inventing absent values. |
| Links and language | Registered official landing/full-text URLs, official summary or abstract, and only permitted source-language excerpts or full text. |
| Legislative/process detail | Sponsors, committees, actions, status history, versions, and source timestamps when supplied. |
| Source-document relationships | Detail-only `corrects`, `corrected_by`, and `related_document` edges with the exact target source-record ID, official target URL, and originating source label. |
| Relevance | One or more explicit bases such as source-explicit Nation reference, general jurisdiction, landmark, or another registered source-defined basis. |
| Nation evidence | Internal Nation ID, exact official name or authorized alias found, exact evidence text/location, official evidence URL, evidence date, basis, and validation state. |
| History and quality | Actual source coverage range and confidence, pre-1980 treatment, landmark criteria/evidence, data quality, source health, freshness, change badge, and urgent alert metadata. |
| AI | Nullable detail-summary object with required label, model/build/policy provenance, cited official inputs, dates, and validation state. |
| Provenance | Per-field JSON Pointer, source ID/record ID/URL, retrieval time, source update time when available, transformation or mapping rule, and validation state. |

The schema includes no field for a legal conclusion, rights impact,
jurisdictional determination, land interest, or inferred Nation relationship.

## Semantic invariants

JSON Schema is one layer. Phase B semantic validation must additionally prove:

1. internal and compound source IDs are unique and stable;
2. every source-derived leaf field has a field-provenance entry;
3. every Nation association has exact official evidence and no inference flag;
4. every taxonomy membership cites exact official label(s), mapping-rule ID,
   mapping source, and taxonomy version;
5. zero taxonomy memberships means `isUnclassified: true`, while one or more
   means false;
6. county records contain an explicit Nation association and
   `explicit_nation_reference` relevance;
7. federal or state records with no Nation association are marked
   general-jurisdiction;
8. historic and landmark labels satisfy the written criteria;
9. excerpts and full text match the registered source-use decision;
10. deadlines and status alerts retain their exact source field and date;
11. AI text contains no em dash or forbidden conclusion/relevance assertion
    and has complete cited-input provenance; and
12. source-document relationships use registered official HTTPS URLs and
    contain neither self-relationships nor duplicate type/target edges;
13. every `corrects` or `corrected_by` relationship resolves within the same
    source record set and has the reciprocal correction edge; and
14. no raw response, credential, personal contact, private, parcel, ownership,
    map, or sensitive land field survives normalization.

Validation failures quarantine the candidate record from the new artifact; they
do not silently coerce, categorize, associate, or drop it. The source health
manifest reports aggregate failure and the prior valid public shard remains
eligible for last-known-good handling.

## Source-document relationships

`sourceDocumentRelationships` preserves only relationships explicitly supplied
by the originating source. `sourceLabel` retains the upstream relationship
field or label without converting it into a legal conclusion. A correction
record uses `corrects`; the corrected record uses `corrected_by`; both records
must be present in the validated same-source record set and point to each other.
`related_document` is generic and may remain one-way.

Relationships never synthesize a normalized status, change badge, legal effect,
or additional relationship. They are retained in detail records with exact
field provenance but excluded from compact indexes and search text.

## Stable IDs

An internal ID is derived by a versioned, source-specific identity rule from
stable official identifiers, then stored as an opaque value. Titles, URLs,
status, dates, and party names are not identity inputs unless the source has no
stable identifier and a reviewed fallback rule explicitly says so. Identity
rules and collision fixtures are versioned. A changed upstream ID creates an
audited alias or supersession, not an unnoticed duplicate.

## Provenance model

`fieldProvenance` is intentionally separate from displayed values so the
normalized record stays compact. Each entry points to one source-derived field
with an exact JSON Pointer and records:

- originating source and source record IDs;
- the exact official source URL;
- retrieval time and source update time when supplied;
- whether the value was copied, normalized, or deterministically mapped;
- the versioned transformation/mapping rule where applicable; and
- validation state and time.

One entry may not stand in for unrelated fields. A source group may share a
retrieval event, but every published source-derived leaf must be covered by an
exact pointer.

## Category membership

Mappings are source-specific configuration, not application logic. A mapping
rule accepts one or more exact official labels and can emit multiple category
and subcategory memberships. It records its rule ID, source, taxonomy version,
and official input labels. Free-text similarity, keyword rules, and AI
classification are invalid public mapping methods.

An official label that has no approved exact mapping leaves the record
`Unclassified`. This is a visible discovery state, not an error and not a
reason to exclude the record.

## Static coverage artifact

Every enabled source has one coverage entry. It keeps three ranges distinct:

- `documentedFrom` and `documentedThrough` describe the reviewed provider
  availability in the source registry;
- `from` and `through` describe the exact window selected for the candidate
  public artifact; and
- `recordFrom` and `recordThrough`, together with `recordCount`, describe the
  publication dates and count of validated records actually present.

All emitted records for one source must carry the same selected range, and each
actual record date must fall inside it. The packager rejects inconsistent or
out-of-bounds ranges. A non-synthetic source with a bounded window is
`limited` even when its refresh health is `healthy`; health and coverage are
different facts. Disabled source identifiers remain absent at every artifact
boundary.

Static artifact budget v1 is measured on the same deterministic UTF-8 JSON
serialization hashed by the manifest. Packaging fails closed before writing if
the compact index exceeds 6 MiB, hashed initial non-detail JSON (the manifest
self-file is excluded) exceeds 8 MiB, any detail exceeds 512 KiB, aggregate
details exceed 128 MiB, or all hashed assets exceed 136 MiB. Validation rejects
over-budget manifest declarations and actual filesystem sizes before reading
artifact asset bodies. The 512 KiB detail guard is a measured pre-release
amendment: the complete July 2026 Federal Register candidate contained one
439,763-byte subject-heavy detail, while the next largest was 168,633 bytes.
Both official-subject schemes and every exact leaf-provenance entry remain in
the record. No record or field is silently dropped to make an artifact fit.

Before parsing, validation requires a regular directory containing exactly the
manifested JSON inventory and its expected directories. Symbolic links,
non-regular entries, extra files, and missing assets fail closed. The manifest
is limited to 4 MiB and 20,000 hashed assets. Last-known-good reuse performs the
same inventory and budget checks, then reads bounded regular-file handles and
requires current schema, registry, taxonomy, policy, source-health, hash, and
compact/detail consistency.

Every enabled non-synthetic source supplies its authoritative refresh health
receipt to packaging. The artifact preserves `failureStage`, retrieval and
data-as-of timestamps, last-known-good use, stale state, record count, and the
neutral public message. A source with no validated current or last-known-good
records is unavailable and contributes no records. Synthetic-only builds may
derive health from their hand-authored records.

The public artifact accepts only coherent source-health combinations:

- `healthy` has current records, successful freshness timestamps, no fallback,
  no failure stage, no stale flag, and no message;
- `degraded` has validated last-known-good records, preserves their successful
  timestamps, and carries fallback, stale, failure-stage, and message fields;
  and
- `unavailable` has zero records, no successful freshness timestamps, no
  fallback, and a stale flag plus a neutral message.

## Versioning

The artifact manifest names the record, taxonomy, mapping, source-registry, and
build versions. Additive compatible changes can increment the minor version.
Current builds emit artifact package `1.1.0` and record schema `1.1.0`; artifact
schema `1.0.0` still accepts historical package `1.0.0` coverage, compact-index,
and manifest shapes for archival schema validation. The current client fails
closed on any package other than `1.1.0` before record normalization; it does
not synthesize missing compact identity or coverage fields from a legacy
package. A package-1.1 detail must share the loaded manifest build timestamp
and exactly reproduce the compact index projection; CSV and dossier hydration
abort on any mismatch.
Breaking field or meaning changes require a new major schema, migration and
backward-compatibility fixtures, and an explicit decision-register entry.
Historical artifacts are interpreted by matching-version software or an
explicitly tested migration under the versions recorded at build time.
