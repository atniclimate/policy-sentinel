import {
  parseJurisdictionAssociation,
  US_STATE_CODES,
  hasStateJurisdictionEvidence,
} from "./jurisdiction-reference.mjs";

export const PUBLIC_CONTRACT_VERSION = "2.0.0";
const fail = (reason) => {
  throw new TypeError(`Public successor rejected: ${reason}`);
};
const copy = (jsonText) => {
  if (typeof jsonText !== "string" || jsonText.length > 8 * 1024 ** 2)
    fail("bounded JSON text required");
  return JSON.parse(jsonText);
};
export function publicJurisdictionAssociation(jurisdiction, recordRef) {
  if (
    !jurisdiction ||
    typeof jurisdiction !== "object" ||
    Array.isArray(jurisdiction)
  )
    fail("jurisdiction object required");
  const required = [
    "level",
    "name",
    "jurisdictionRef",
    "basis",
    "evidence",
    "reviewState",
    "review",
  ];
  if (
    required.some((key) => !Object.hasOwn(jurisdiction, key)) ||
    Object.keys(jurisdiction).some(
      (key) => ![...required, "generalJurisdictionOnly"].includes(key),
    )
  )
    fail("closed jurisdiction shape required");
  if (
    jurisdiction.generalJurisdictionOnly !== undefined &&
    typeof jurisdiction.generalJurisdictionOnly !== "boolean"
  )
    fail("general-jurisdiction classification must be explicit");
  const { jurisdictionRef, basis, evidence, reviewState, review } =
    jurisdiction;
  const association = parseJurisdictionAssociation(
    JSON.stringify({ jurisdictionRef, basis, evidence, reviewState }),
    recordRef,
  );
  const prefix = {
    federal: "us",
    state: "us-state:",
    county: "us-county:",
    municipal: "body:",
    tribal: "nation:",
    other: "body:",
  }[jurisdiction.level];
  if (
    !prefix ||
    (prefix === "us"
      ? jurisdictionRef !== prefix
      : !jurisdictionRef.startsWith(prefix))
  )
    fail("jurisdiction kind/ref mismatch");
  if (
    jurisdictionRef.startsWith("us-state:") &&
    !US_STATE_CODES.includes(jurisdictionRef.slice(9))
  )
    fail("unknown state identifier");
  if (
    jurisdictionRef.startsWith("nation:") &&
    !jurisdictionRef.startsWith("nation:synthetic-")
  )
    fail("real Nation registry binding is not enabled");
  if (typeof jurisdiction.name !== "string" || !jurisdiction.name.trim())
    fail("jurisdiction label required");
  if (jurisdiction.name.length > 256) fail("jurisdiction label exceeds bound");
  if (
    review !== null &&
    (!review ||
      typeof review !== "object" ||
      Array.isArray(review) ||
      Object.keys(review).sort().join(",") !== "reviewedAt,reviewer" ||
      typeof review.reviewer !== "string" ||
      !review.reviewer.trim() ||
      review.reviewer.length > 256 ||
      typeof review.reviewedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(review.reviewedAt) ||
      !Number.isFinite(Date.parse(review.reviewedAt)))
  )
    fail("attributed jurisdiction review required");
  if (
    reviewState === "reviewed" &&
    (review === null ||
      !evidence.exactSubject ||
      !evidence.exactSubject.text.includes(jurisdiction.name))
  )
    fail(
      "reviewed jurisdiction requires exact named subject and attributed review",
    );
  if (
    jurisdictionRef.startsWith("us-state:") &&
    (!hasStateJurisdictionEvidence(jurisdictionRef, jurisdiction.name) ||
      (reviewState === "reviewed" &&
        !hasStateJurisdictionEvidence(
          jurisdictionRef,
          evidence.exactSubject.text,
        )))
  )
    fail("state evidence does not identify the referenced state");
  return association;
}

/** Produces a migration candidate, not admission. Callers must validate the legacy input and successor schema + policy before use. Supplied evidence is never inferred from a place or organization. */
export function migratePublicRecordV2(jsonText, jurisdictionJsonText) {
  const record = copy(jsonText);
  if (record.schemaVersion !== "1.4.0") fail("legacy record 1.4 required");
  const jurisdiction = copy(jurisdictionJsonText);
  const association = publicJurisdictionAssociation(
    jurisdiction,
    record.internalId,
  );
  if (association.reviewState !== "reviewed")
    fail("reviewed migration evidence required");
  if (
    jurisdiction.generalJurisdictionOnly !==
    (record.nationAssociations.length === 0)
  )
    fail("migration changes Nation attribution");
  if (!Array.isArray(record.fieldProvenance))
    fail("legacy provenance required");
  const exact = association.evidence.exactSubject;
  const sourceTexts = [
    record.officialTitle,
    record.sourceDocumentIdentifier,
    record.status?.sourceLabel,
    ...(record.issuingBodies ?? []).map((row) => row.officialName),
    record.texts?.officialSummary?.text,
    record.texts?.sourceExcerpt?.text,
  ];
  if (
    !exact ||
    !sourceTexts.some(
      (text) => typeof text === "string" && text.includes(exact.text),
    )
  )
    fail("migration evidence is not present in original source fields");
  if (
    ![record.urls.officialSource, record.urls.officialFullText].includes(
      association.evidence.url,
    )
  )
    fail("migration evidence URL is not an official source URL");
  if (
    Date.parse(jurisdiction.review.reviewedAt) <
      Date.parse(record.dates.retrieved) ||
    Date.parse(jurisdiction.review.reviewedAt) >
      Date.parse(record.dataQuality.validatedAt)
  )
    fail("migration review is outside retrieval/validation history");
  const previous = record.jurisdiction;
  const previousJurisdictionProvenance = record.fieldProvenance.filter((row) =>
    row.field.startsWith("/jurisdiction/"),
  );
  record.jurisdiction = jurisdiction;
  record.schemaVersion = PUBLIC_CONTRACT_VERSION;
  record.fieldProvenance = record.fieldProvenance.filter(
    (row) => !row.field.startsWith("/jurisdiction/"),
  );
  const leaves = (value, pointer) =>
    Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === "object"
        ? leaves(child, `${pointer}/${key}`)
        : [[`${pointer}/${key}`, child]],
    );
  for (const [field] of leaves(jurisdiction, "/jurisdiction").filter(
    ([field]) => !field.startsWith("/jurisdiction/review"),
  ))
    record.fieldProvenance.push({
      field,
      sourcePath: association.evidence.locator,
      sourceId: record.source.id,
      sourceRecordId: record.source.recordId,
      sourceUrl: association.evidence.url,
      retrievedAt: record.dates.retrieved,
      sourceUpdatedAt:
        (record.dates.updated ?? record.dates.published) === null
          ? null
          : (record.dates.updated ?? record.dates.published).includes("T")
            ? (record.dates.updated ?? record.dates.published)
            : `${record.dates.updated ?? record.dates.published}T00:00:00Z`,
      adapterId: record.source.adapterId,
      transformation: "deterministic_mapping",
      transformRuleId: "explicit-jurisdiction-binding-v2",
      validationState: "validated",
    });
  record.fieldProvenance.sort((a, b) => a.field.localeCompare(b.field));
  return {
    record,
    receipt: {
      from: "1.4.0",
      to: PUBLIC_CONTRACT_VERSION,
      recordId: record.internalId,
      previousJurisdiction: previous,
      previousJurisdictionProvenance,
      validationState: "requires_schema_and_policy_validation",
      jurisdictionEvidence: association.evidence,
    },
  };
}

/** Produces a source-registry candidate; validate the legacy input and successor schema + registry semantics before admission. */
export function migrateSourceRegistryV2(
  jsonText,
  jurisdictionBindingsJsonText,
) {
  const registry = copy(jsonText),
    bindings = copy(jurisdictionBindingsJsonText);
  if (registry.schemaVersion !== "1.3.0" || !Array.isArray(registry.sources))
    fail("legacy source registry required");
  const ids = registry.sources.map((row) => row.id);
  if (
    Object.keys(bindings).length !== ids.length ||
    ids.some((id) => !Object.hasOwn(bindings, id))
  )
    fail("exact source bindings required");
  for (const source of registry.sources) {
    const binding = publicJurisdictionAssociation(
      bindings[source.id],
      source.id,
    );
    if (source.enabled && binding.reviewState !== "reviewed")
      fail("enabled source requires reviewed jurisdiction evidence");
    source.jurisdiction = bindings[source.id];
  }
  return {
    ...registry,
    $schema: "../schemas/source.schema.v2.json",
    schemaVersion: PUBLIC_CONTRACT_VERSION,
    registryVersion: PUBLIC_CONTRACT_VERSION,
  };
}

/** Namespace-only migration preserves the original crosswalk evidence and classification. */
export function migrateNationCoverageV2(nation) {
  if (nation.stateCoverage.jurisdictionRefs !== undefined) return nation;
  const { states, evidence, ...coverage } = nation.stateCoverage;
  if (
    !Array.isArray(states) ||
    states.some((state) => !["WA", "OR", "ID"].includes(state))
  )
    fail("validated legacy state coverage required");
  return {
    ...nation,
    stateCoverage: {
      ...coverage,
      jurisdictionRefs: states.map((state) => `us-state:${state}`),
      ...(evidence === undefined
        ? {}
        : {
            evidence: evidence.map(({ state, ...row }) => ({
              ...row,
              jurisdictionRef: `us-state:${state}`,
            })),
          }),
    },
  };
}
