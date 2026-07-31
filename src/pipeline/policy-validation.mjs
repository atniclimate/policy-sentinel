import { URL } from "node:url";

import {
  assertStableRecordId,
  recordIdentityKey,
  toUrlSafeId,
} from "./identity.mjs";

const SOURCE_DERIVED_ROOTS = [
  "/officialTitle",
  "/sourceDocumentIdentifier",
  "/documentType",
  "/jurisdiction/level",
  "/jurisdiction/name",
  "/jurisdiction/stateCode",
  "/jurisdiction/generalJurisdictionOnly",
  "/issuingBodies",
  "/legislativeContext",
  "/status/normalized",
  "/status/sourceLabel",
  "/status/asOf",
  "/dates/introduced",
  "/dates/published",
  "/dates/updated",
  "/dates/lastAction",
  "/dates/deadline",
  "/dates/effective",
  "/urls/officialSource",
  "/urls/officialFullText",
  "/texts/officialSummary",
  "/texts/sourceExcerpt",
  "/sponsors",
  "/committees",
  "/actionHistory",
  "/statusHistory",
  "/officialSubjects",
  "/taxonomyMemberships",
  "/isUnclassified",
  "/relevance",
  "/nationAssociations",
  "/landmark",
  "/historical",
];

const FORBIDDEN_NORMALIZED_KEYS = new Set([
  "legalconclusion",
  "legaldetermination",
  "rightsimpact",
  "rightsdetermination",
  "inferredrelevance",
  "inferrednation",
  "inferrednationrelationship",
  "keywordrelevance",
  "geographyrelevance",
  "parcel",
  "parcelid",
  "parcelgeometry",
  "geometry",
  "coordinates",
  "latitude",
  "longitude",
  "landownership",
  "trustland",
  "feeland",
  "triballyownedparcel",
  "propertyownership",
  "mapdata",
  "privatelandcontext",
]);

export class PolicyValidationError extends Error {
  constructor(issues) {
    super(
      `policy validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
    this.name = "PolicyValidationError";
    this.issues = issues;
  }
}

function escapeJsonPointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function getAtPointer(value, pointer) {
  if (pointer === "") {
    return value;
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], value);
}

function collectPrimitivePointers(value, pointer, result) {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectPrimitivePointers(item, `${pointer}/${index}`, result);
    });
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectPrimitivePointers(
        child,
        `${pointer}/${escapeJsonPointerSegment(key)}`,
        result,
      );
    }
    return;
  }
  result.push(pointer);
}

export function sourceDerivedLeafPointers(record) {
  const pointers = [];
  for (const root of SOURCE_DERIVED_ROOTS) {
    const value = getAtPointer(record, root);
    collectPrimitivePointers(value, root, pointers);
  }
  return [...new Set(pointers)].sort();
}

function sourceUpdatedAt(record) {
  const value = record.dates.updated ?? record.dates.published;
  if (value === null) {
    return null;
  }
  return value.includes("T") ? value : `${value}T00:00:00Z`;
}

/**
 * Synthetic fixtures are already normalized, so this records their fixture
 * JSON pointers as the source paths. Production adapters must create their own
 * provenance during normalization and must not call this helper.
 */
export function completeSyntheticProvenance(record) {
  const clone = globalThis.structuredClone(record);
  const existing = new Set(clone.fieldProvenance.map(({ field }) => field));
  for (const field of sourceDerivedLeafPointers(clone)) {
    if (existing.has(field)) {
      continue;
    }
    clone.fieldProvenance.push({
      field,
      sourcePath: `$fixture${field}`,
      sourceId: clone.source.id,
      sourceRecordId: clone.source.recordId,
      sourceUrl: clone.urls.officialSource,
      retrievedAt: clone.dates.retrieved,
      sourceUpdatedAt: sourceUpdatedAt(clone),
      adapterId: clone.source.adapterId,
      transformation: "copied",
      transformRuleId: null,
      validationState: "validated",
    });
  }
  clone.fieldProvenance.sort((a, b) => a.field.localeCompare(b.field));
  return clone;
}

function validateForbiddenKeys(value, path, issues) {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateForbiddenKeys(item, `${path}/${index}`, issues),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
    if (FORBIDDEN_NORMALIZED_KEYS.has(normalized)) {
      issues.push(`${path}/${key} is a forbidden public field`);
    }
    validateForbiddenKeys(child, `${path}/${key}`, issues);
  }
}

function validateRegisteredHttpsUrl(value, field, allowedHosts, issues) {
  if (typeof value !== "string") {
    issues.push(`${field} is not an HTTPS URL`);
    return;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    issues.push(`${field} is not a valid URL`);
    return;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== ""
  ) {
    issues.push(`${field} is not an approved HTTPS source URL`);
    return;
  }
  if (!allowedHosts.has(hostname)) {
    issues.push(
      `${field} hostname ${hostname || "(missing)"} is not registered for source`,
    );
  }
}

function validateSourceUrls(record, sourceConfig, issues) {
  const allowedHosts = new Set(
    sourceConfig.access.allowedHosts.map((hostname) => hostname.toLowerCase()),
  );
  const urls = [
    ["/urls/officialSource", record.urls.officialSource],
    ["/urls/officialFullText", record.urls.officialFullText],
    [
      "/texts/officialSummary/sourceUrl",
      record.texts.officialSummary?.sourceUrl,
    ],
    ["/texts/sourceExcerpt/sourceUrl", record.texts.sourceExcerpt?.sourceUrl],
  ];

  record.actionHistory.forEach((event, index) => {
    urls.push([`/actionHistory/${index}/sourceUrl`, event.sourceUrl]);
  });
  record.statusHistory.forEach((event, index) => {
    urls.push([`/statusHistory/${index}/sourceUrl`, event.sourceUrl]);
  });
  record.officialSubjects.forEach((subject, index) => {
    urls.push([`/officialSubjects/${index}/sourceUrl`, subject.sourceUrl]);
  });
  record.relevance.forEach((relevance, index) => {
    urls.push([`/relevance/${index}/sourceUrl`, relevance.sourceUrl]);
  });
  record.nationAssociations.forEach((association, index) => {
    urls.push([
      `/nationAssociations/${index}/evidenceUrl`,
      association.evidenceUrl,
    ]);
  });
  (record.landmark.officialEvidence ?? []).forEach((evidence, index) => {
    urls.push([
      `/landmark/officialEvidence/${index}/sourceUrl`,
      evidence.sourceUrl,
    ]);
  });
  if (record.aiSummary.exists) {
    record.aiSummary.citedInputs.forEach((citation, index) => {
      urls.push([
        `/aiSummary/citedInputs/${index}/sourceUrl`,
        citation.sourceUrl,
      ]);
    });
  }
  record.fieldProvenance.forEach((provenance, index) => {
    urls.push([`/fieldProvenance/${index}/sourceUrl`, provenance.sourceUrl]);
  });

  for (const [field, value] of urls) {
    if (value !== null && value !== undefined) {
      validateRegisteredHttpsUrl(value, field, allowedHosts, issues);
    }
  }
}

function validateNationPolicy(record, knownNationIds, issues) {
  const isCounty = record.jurisdiction.level === "county";
  const isStateOrFederal = ["state", "federal"].includes(
    record.jurisdiction.level,
  );
  const explicitRelevance = record.relevance.some(
    ({ basis }) => basis === "explicit_nation_reference",
  );
  const generalRelevance = record.relevance.some(
    ({ basis }) => basis === "general_jurisdiction",
  );

  if (isCounty && record.nationAssociations.length === 0) {
    issues.push("county record has no explicit Nation association");
  }
  if (isCounty && !explicitRelevance) {
    issues.push("county record lacks explicit_nation_reference relevance");
  }
  if (isCounty && record.jurisdiction.generalJurisdictionOnly) {
    issues.push("county record cannot be labeled general jurisdiction");
  }

  if (isStateOrFederal && record.nationAssociations.length === 0) {
    if (!record.jurisdiction.generalJurisdictionOnly) {
      issues.push(
        "state/federal record without Nation evidence must be general jurisdiction",
      );
    }
    if (!generalRelevance) {
      issues.push(
        "state/federal record without Nation evidence lacks general_jurisdiction relevance",
      );
    }
  }

  if (isStateOrFederal && record.nationAssociations.length > 0) {
    if (record.jurisdiction.generalJurisdictionOnly) {
      issues.push(
        "state/federal record with explicit Nation evidence cannot be general-jurisdiction-only",
      );
    }
    if (!explicitRelevance) {
      issues.push(
        "state/federal record with Nation evidence lacks explicit_nation_reference relevance",
      );
    }
  }

  record.nationAssociations.forEach((association, index) => {
    const label = `nationAssociations/${index}`;
    if (
      association.basis === "issuing_government" &&
      record.jurisdiction.level !== "tribal"
    ) {
      issues.push(
        `${label} uses issuing_government outside a tribal jurisdiction`,
      );
    } else if (
      association.basis !== "explicit_mention" &&
      association.basis !== "issuing_government"
    ) {
      issues.push(`${label} uses an unsupported association basis`);
    }
    if (isCounty && association.basis !== "explicit_mention") {
      issues.push(`${label} county association must use explicit_mention`);
    }
    if (
      association.validationState !== "validated" ||
      association.evidenceText.trim() === "" ||
      association.evidenceLocation.trim() === "" ||
      !association.evidenceUrl.startsWith("https://")
    ) {
      issues.push(`${label} lacks validated exact official evidence`);
    }
    if (knownNationIds && !knownNationIds.has(association.nationId)) {
      issues.push(`${label} references an unknown Nation ID`);
    }
  });
}

function validateTaxonomyPolicy(record, taxonomy, sourceConfig, issues) {
  const categoryIds = new Set(taxonomy.categories.map(({ id }) => id));
  const subcategoryIds = new Map(
    taxonomy.categories.flatMap((category) =>
      category.subcategories.map((subcategory) => [
        subcategory.id,
        category.id,
      ]),
    ),
  );
  const officialSubjects = new Set(
    record.officialSubjects.map(
      ({ scheme, label }) => `${scheme}\u0000${label}`,
    ),
  );
  const rules = new Map(
    taxonomy.mappingPolicy.sourceMappings.map((rule) => [rule.id, rule]),
  );

  if ((record.taxonomyMemberships.length === 0) !== record.isUnclassified) {
    issues.push("Unclassified flag does not match taxonomy membership count");
  }

  record.taxonomyMemberships.forEach((membership, index) => {
    const label = `taxonomyMemberships/${index}`;
    if (!categoryIds.has(membership.categoryId)) {
      issues.push(`${label} references an unknown category`);
    }
    if (
      membership.subcategoryId !== null &&
      subcategoryIds.get(membership.subcategoryId) !== membership.categoryId
    ) {
      issues.push(`${label} references an invalid category/subcategory pair`);
    }
    if (
      membership.officialSubjectLabels.some(
        (officialLabel) =>
          !record.officialSubjects.some(({ label }) => label === officialLabel),
      )
    ) {
      issues.push(`${label} cites a label absent from officialSubjects`);
    }

    const rule = rules.get(membership.mappingRuleId);
    if (
      !rule ||
      rule.sourceId !== record.source.id ||
      rule.provenance.validationState !== "validated"
    ) {
      issues.push(`${label} lacks a registered source-specific mapping rule`);
      return;
    }
    if (
      membership.officialSubjectLabels.some(
        (officialLabel) => officialLabel !== rule.officialSubjectValue,
      )
    ) {
      issues.push(`${label} was not produced from an exact registered label`);
    }
    if (
      !officialSubjects.has(
        `${rule.officialSubjectScheme}\u0000${rule.officialSubjectValue}`,
      )
    ) {
      issues.push(`${label} has no exact official subject scheme/value match`);
    }
    if (
      !rule.targets.some(
        (target) =>
          target.categoryId === membership.categoryId &&
          (target.subcategoryId ?? null) === membership.subcategoryId,
      )
    ) {
      issues.push(`${label} is not an output of its mapping rule`);
    }
    if (!sourceConfig.officialSubjectMappings.includes(rule.id)) {
      issues.push(`${label} uses a mapping rule not enabled for its source`);
    }
  });
}

function validateProvenance(record, sourceConfig, issues) {
  const entriesByField = new Map();
  for (const [index, entry] of record.fieldProvenance.entries()) {
    const label = `fieldProvenance/${index}`;
    if (
      entry.sourceId !== record.source.id ||
      entry.sourceRecordId !== record.source.recordId ||
      entry.adapterId !== record.source.adapterId
    ) {
      issues.push(`${label} does not match the record source identity`);
    }
    if (entry.validationState !== "validated") {
      issues.push(`${label} is not validated`);
    }
    if (!entry.field.startsWith("/")) {
      issues.push(`${label} has an invalid JSON Pointer`);
    }
    if (!entriesByField.has(entry.field)) {
      entriesByField.set(entry.field, []);
    }
    entriesByField.get(entry.field).push(entry);
  }

  for (const pointer of sourceDerivedLeafPointers(record)) {
    if (!entriesByField.has(pointer)) {
      issues.push(`source-derived field ${pointer} lacks exact provenance`);
    }
  }
  for (const pointer of sourceConfig.publication.requiredProvenancePointers) {
    if (!entriesByField.has(pointer)) {
      issues.push(`source-required field ${pointer} lacks provenance`);
    }
  }
}

function validateHistoricalPolicy(record, issues) {
  const publishedYear =
    record.dates.published === null
      ? null
      : Number(record.dates.published.slice(0, 4));
  if (
    publishedYear !== null &&
    publishedYear < 1980 &&
    !record.landmark.isLandmark &&
    record.historical.pre1980Treatment !== "list_and_link"
  ) {
    issues.push("non-landmark pre-1980 record must use list_and_link");
  }
  if (
    record.landmark.isLandmark &&
    record.historical.pre1980Treatment === "landmark_detail" &&
    !record.landmark.sourceUrl
  ) {
    issues.push("landmark detail lacks an official inclusion source");
  }
}

function validateAiPolicy(record, issues) {
  if (!record.aiSummary.exists) {
    return;
  }
  if (record.aiSummary.text.includes("—")) {
    issues.push("AI summary contains an em dash");
  }
  if (
    /\b(legal conclusion|rights determination|rights impact|nation-specific relevance)\b/i.test(
      record.aiSummary.text,
    )
  ) {
    issues.push(
      "AI summary contains a forbidden conclusion or relevance claim",
    );
  }
}

export function validateRecordPolicy(
  record,
  { sourceConfig, taxonomy, knownNationIds = null },
) {
  const issues = [];
  try {
    assertStableRecordId(record.internalId);
    toUrlSafeId(record.internalId);
  } catch (error) {
    issues.push(error.message);
  }
  if (
    record.source.id !== sourceConfig.id ||
    record.source.adapterId !== sourceConfig.adapter.id ||
    record.source.adapterVersion !== sourceConfig.adapter.version
  ) {
    issues.push(
      "record source/adapter identity does not match source registry",
    );
  }
  validateNationPolicy(record, knownNationIds, issues);
  validateSourceUrls(record, sourceConfig, issues);
  validateTaxonomyPolicy(record, taxonomy, sourceConfig, issues);
  validateProvenance(record, sourceConfig, issues);
  validateHistoricalPolicy(record, issues);
  validateAiPolicy(record, issues);
  validateForbiddenKeys(record, "", issues);
  if (issues.length > 0) {
    throw new PolicyValidationError(issues);
  }
  return record;
}

export function validateRecordSetPolicy(
  records,
  { sourceRegistry, taxonomy, nations = [] },
) {
  const issues = [];
  const sourceConfigs = new Map(
    sourceRegistry.sources.map((source) => [source.id, source]),
  );
  const nationIds =
    nations.length === 0 ? null : new Set(nations.map(({ id }) => id));
  const internalIds = new Set();
  const sourceIdentities = new Set();
  const detailIds = new Set();

  for (const [index, record] of records.entries()) {
    const sourceConfig = sourceConfigs.get(record.source.id);
    if (!sourceConfig) {
      issues.push(`record ${index} references an unregistered source`);
      continue;
    }
    try {
      validateRecordPolicy(record, {
        sourceConfig,
        taxonomy,
        knownNationIds: nationIds,
      });
    } catch (error) {
      if (error instanceof PolicyValidationError) {
        issues.push(
          ...error.issues.map(
            (issue) => `${record.internalId ?? `record ${index}`}: ${issue}`,
          ),
        );
      } else {
        throw error;
      }
    }

    if (internalIds.has(record.internalId)) {
      issues.push(`duplicate internal ID: ${record.internalId}`);
    }
    internalIds.add(record.internalId);

    const identity = recordIdentityKey(record);
    if (sourceIdentities.has(identity)) {
      issues.push(
        `duplicate source identity: ${record.source.id}/${record.source.recordId}`,
      );
    }
    sourceIdentities.add(identity);

    try {
      const detailId = toUrlSafeId(record.internalId);
      if (detailIds.has(detailId)) {
        issues.push(`detail-path collision for ${record.internalId}`);
      }
      detailIds.add(detailId);
    } catch {
      // The per-record validator already reports the invalid ID.
    }
  }

  if (issues.length > 0) {
    throw new PolicyValidationError(issues);
  }
  return records;
}
