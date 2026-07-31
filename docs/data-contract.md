# Versioned data contract

## Files and status

The Phase A contracts are:

- [`record.schema.v1.json`](../schemas/record.schema.v1.json), normalized
  record schema version `1.0.0`;
- [`taxonomy.schema.v1.json`](../schemas/taxonomy.schema.v1.json), taxonomy
  schema version `1.0.0`; and
- [`taxonomy.v1.json`](../config/taxonomy.v1.json), the editable ten-category,
  33-subcategory starting taxonomy;
- [`source.schema.v1.json`](../schemas/source.schema.v1.json), compatible v1
  source-registry schema version `1.1.0`;
- [`sources.v1.json`](../config/sources.v1.json), source registry version
  `1.1.0`; and
- [`artifact.schema.v1.json`](../schemas/artifact.schema.v1.json), static
  artifact schema version `1.0.0`.

These contracts support Phase B local implementation; their presence is not
evidence that a production source is enabled or a public dataset exists.
`npm test` compiles the schemas in strict mode, validates the source registry,
taxonomy, and synthetic fixtures, and proves selected invalid governance cases
are rejected.

Source-registry version `1.1.0` distinguishes researched configuration from
activation. A disabled source may have `adapter: null`; an enabled source must
have a versioned adapter. Every non-synthetic source records the date its cited
contract and terms were accessed. Disabled sources and their identifiers are
rejected from coverage, health, manifests, and records rather than appearing as
an unavailable public source.

## Record groups

The normalized record preserves:

| Group | Contract |
|---|---|
| Identity | Schema version, stable opaque internal ID, source ID, exact source record ID, exact official title, and source-specific document identifier. |
| Classification | Document type, jurisdiction and level, issuing bodies, session/congress context, normalized and exact source status, official subjects, zero-or-more taxonomy memberships, and explicit `isUnclassified`. |
| Dates | Introduction, publication, update, action, deadline, retrieval, and any source-defined dates, without inventing absent values. |
| Links and language | Registered official landing/full-text URLs, official summary or abstract, and only permitted source-language excerpts or full text. |
| Legislative/process detail | Sponsors, committees, actions, status history, versions, and source timestamps when supplied. |
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
12. no raw response, credential, personal contact, private, parcel, ownership,
    map, or sensitive land field survives normalization.

Validation failures quarantine the candidate record from the new artifact; they
do not silently coerce, categorize, associate, or drop it. The source health
manifest reports aggregate failure and the prior valid public shard remains
eligible for last-known-good handling.

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

## Versioning

The artifact manifest names the record, taxonomy, mapping, source-registry, and
build versions. Additive compatible changes can increment the minor version.
Breaking field or meaning changes require a new major schema, migration and
backward-compatibility fixtures, and an explicit decision-register entry.
Historical artifacts are interpreted under the versions recorded at their
build time.
