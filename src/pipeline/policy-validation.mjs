import { URL } from "node:url";

import { isProtectedKey } from "../core/boundary-guard.mjs";
import { publicJurisdictionAssociation } from "../core/public-contract-v2.mjs";

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
  "/judicialContext",
  "/accordContext",
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
  "/sourceDocumentRelationships",
  "/officialSubjects",
  "/taxonomyMemberships",
  "/isUnclassified",
  "/relevance",
  "/nationAssociations",
  "/landmark",
  "/historical",
];

// The strict shared guard also protects these private-context fact names.
// PolicyRecord requires them at its canonical root. Exempt only their exact
// root spellings here, and continue checking every child with the shared guard.
const CANONICAL_RECORD_ROOT_KEYS = new Set([
  "jurisdiction",
  "issuingBodies",
  "officialSubjects",
  "taxonomyMemberships",
  "relevance",
  "nationAssociations",
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
  const roots =
    record.schemaVersion === "2.0.0"
      ? [
          ...SOURCE_DERIVED_ROOTS.filter(
            (root) => !root.startsWith("/jurisdiction/"),
          ),
          "/jurisdiction",
        ]
      : SOURCE_DERIVED_ROOTS;
  for (const root of roots) {
    const value = getAtPointer(record, root);
    collectPrimitivePointers(value, root, pointers);
  }
  return [...new Set(pointers)]
    .filter(
      (pointer) =>
        record.schemaVersion !== "2.0.0" ||
        !pointer.startsWith("/jurisdiction/review"),
    )
    .sort();
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
    const canonicalRoot = path === "" && CANONICAL_RECORD_ROOT_KEYS.has(key);
    if (!canonicalRoot && isProtectedKey(key)) {
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
  record.sourceDocumentRelationships.forEach((relationship, index) => {
    urls.push([
      `/sourceDocumentRelationships/${index}/targetUrl`,
      relationship.targetUrl,
    ]);
  });
  record.judicialContext?.citations.forEach((citation, index) => {
    urls.push([
      `/judicialContext/citations/${index}/sourceUrl`,
      citation.sourceUrl,
    ]);
  });
  record.accordContext?.parties.forEach((party, partyIndex) => {
    party.roles.forEach((role, roleIndex) => {
      urls.push([
        `/accordContext/parties/${partyIndex}/roles/${roleIndex}/sourceUrl`,
        role.sourceUrl,
      ]);
    });
  });
  if (record.accordContext !== null) {
    urls.push([
      "/accordContext/executionEvent/sourceUrl",
      record.accordContext.executionEvent.sourceUrl,
    ]);
    urls.push([
      "/accordContext/statusReview/sourceUrl",
      record.accordContext.statusReview.sourceUrl,
    ]);
    record.accordContext.supersessionReview.sourceUrls.forEach(
      (sourceUrl, index) => {
        urls.push([
          `/accordContext/supersessionReview/sourceUrls/${index}`,
          sourceUrl,
        ]);
      },
    );
  }
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

function validateSourceDocumentRelationships(record, issues) {
  const seenEdges = new Set();
  for (const [
    index,
    relationship,
  ] of record.sourceDocumentRelationships.entries()) {
    const label = `/sourceDocumentRelationships/${index}`;
    if (relationship.targetSourceRecordId === record.source.recordId) {
      issues.push(`${label} targets its own source record`);
    }

    const edgeKey = `${relationship.relationshipType}\u0000${relationship.targetSourceRecordId}`;
    if (seenEdges.has(edgeKey)) {
      issues.push(
        `${label} duplicates the ${relationship.relationshipType} relationship to ${relationship.targetSourceRecordId}`,
      );
    }
    seenEdges.add(edgeKey);
  }
}

function validateReciprocalRelationshipGraph(records, issues) {
  const recordsBySourceIdentity = new Map(
    records.map((record) => [recordIdentityKey(record), record]),
  );
  const reciprocalTypes = new Map([
    ["corrects", "corrected_by"],
    ["corrected_by", "corrects"],
    ["supersedes", "superseded_by"],
    ["superseded_by", "supersedes"],
    ["substitutes", "substituted_by"],
    ["substituted_by", "substitutes"],
  ]);

  for (const record of records) {
    for (const [
      index,
      relationship,
    ] of record.sourceDocumentRelationships.entries()) {
      const reciprocalType = reciprocalTypes.get(relationship.relationshipType);
      if (
        reciprocalType === undefined ||
        relationship.targetSourceRecordId === record.source.recordId
      ) {
        continue;
      }

      const targetIdentity = `${record.source.id}\u0000${relationship.targetSourceRecordId}`;
      const targetRecord = recordsBySourceIdentity.get(targetIdentity);
      const label = `${record.internalId}: /sourceDocumentRelationships/${index}`;
      if (targetRecord === undefined) {
        issues.push(
          `${label} targets missing same-source record ${record.source.id}/${relationship.targetSourceRecordId}`,
        );
        continue;
      }

      const hasReciprocalEdge = targetRecord.sourceDocumentRelationships.some(
        (candidate) =>
          candidate.relationshipType === reciprocalType &&
          candidate.targetSourceRecordId === record.source.recordId,
      );
      if (!hasReciprocalEdge) {
        issues.push(
          `${label} lacks reciprocal ${reciprocalType} relationship from ${targetRecord.internalId}`,
        );
      }
    }
  }
}

function validateJudicialContext(record, issues) {
  const isJudicial = ["court_decision", "administrative_decision"].includes(
    record.documentType,
  );
  if (!isJudicial) {
    if (record.judicialContext !== null) {
      issues.push("non-judicial record cannot contain judicial context");
    }
    return;
  }

  const context = record.judicialContext;
  if (context === null) {
    issues.push("judicial record lacks judicial context");
    return;
  }

  const expectedKind =
    record.documentType === "court_decision" ? "court" : "administrative_body";
  if (context.adjudicatingBody.kind !== expectedKind) {
    issues.push("judicial record adjudicating-body kind does not match type");
  }
  if (
    !record.issuingBodies.some(
      ({ sourceId, officialName }) =>
        sourceId === context.adjudicatingBody.sourceId &&
        officialName === context.adjudicatingBody.officialName,
    )
  ) {
    issues.push(
      "judicial record adjudicating body is not preserved as an issuing body",
    );
  }

  const retrievedOn = record.dates.retrieved.slice(0, 10);
  if (
    context.publicationStatus.asOf < context.decisionDate ||
    context.publicationStatus.asOf > retrievedOn
  ) {
    issues.push(
      "judicial publication-status date falls outside decision-to-retrieval bounds",
    );
  }
  if (
    context.revisionReview.reviewedOn < context.decisionDate ||
    context.revisionReview.reviewedOn > retrievedOn
  ) {
    issues.push(
      "judicial revision review date falls outside decision-to-retrieval bounds",
    );
  }

  const revisionRelationships = new Set([
    "corrects",
    "corrected_by",
    "supersedes",
    "superseded_by",
    "substitutes",
    "substituted_by",
  ]);
  const hasRevisionRelationship = record.sourceDocumentRelationships.some(
    ({ relationshipType }) => revisionRelationships.has(relationshipType),
  );
  if (
    context.revisionReview.state === "relationships_recorded" &&
    !hasRevisionRelationship
  ) {
    issues.push(
      "judicial revision review claims relationships without a typed edge",
    );
  }
  if (
    context.revisionReview.state === "no_separate_relationship_exposed" &&
    hasRevisionRelationship
  ) {
    issues.push(
      "judicial revision review denies separate relationships despite a typed edge",
    );
  }
}

function validateAccordContext(record, sourceConfig, issues) {
  const isAccord = record.documentType === "intergovernmental_accord";
  if (!isAccord) {
    if (record.accordContext !== null) {
      issues.push("non-accord record cannot contain accord context");
    }
    if (record.status.sourceLabel === null || record.status.asOf === null) {
      issues.push("non-accord record lacks source status fields");
    }
    return;
  }

  const context = record.accordContext;
  if (context === null) {
    issues.push("intergovernmental accord lacks accord context");
    return;
  }
  if (record.issuingBodies.length !== 0) {
    issues.push("accord parties cannot be relabeled as issuing bodies");
  }
  if (record.legislativeContext !== null || record.judicialContext !== null) {
    issues.push("accord cannot contain legislative or judicial context");
  }
  if (
    record.status.normalized !== "unknown" ||
    record.status.sourceLabel !== null ||
    record.status.asOf !== null
  ) {
    issues.push("accord generic status must remain unknown and unlabeled");
  }
  if (
    context.statusReview.currentStatus !== "not_established" ||
    context.statusReview.evidenceKind !== "narrative_execution_language"
  ) {
    issues.push("accord status review cannot assert a current status");
  }
  if (
    record.dates.introduced !== null ||
    record.dates.published !== null ||
    record.dates.lastAction !== null ||
    record.dates.deadline !== null ||
    record.dates.effective !== null
  ) {
    issues.push("accord execution cannot be copied into a generic record date");
  }

  const retrievedOn = record.dates.retrieved.slice(0, 10);
  const executionDate = context.executionEvent.date;
  if (executionDate > retrievedOn) {
    issues.push("accord execution date is after retrieval");
  }
  for (const [label, reviewedOn] of [
    ["status", context.statusReview.reviewedOn],
    ["supersession", context.supersessionReview.reviewedOn],
  ]) {
    if (reviewedOn < executionDate || reviewedOn > retrievedOn) {
      issues.push(
        `accord ${label} review date falls outside execution-to-retrieval bounds`,
      );
    }
  }

  const partyIdentities = new Set();
  for (const [partyIndex, party] of context.parties.entries()) {
    const identity = `${party.sourceId ?? ""}\u0000${party.officialName}`;
    if (partyIdentities.has(identity)) {
      issues.push(`accord party ${partyIndex} duplicates a party identity`);
    }
    partyIdentities.add(identity);
    const normalizedRoles = party.roles.map(({ normalized }) => normalized);
    if (new Set(normalizedRoles).size !== normalizedRoles.length) {
      issues.push(`accord party ${partyIndex} repeats a normalized role`);
    }
  }

  const nationParties = new Map(
    context.parties
      .filter(({ sourceId }) => sourceId?.startsWith("nation:"))
      .map((party) => [party.sourceId, party]),
  );
  for (const [nationId, party] of nationParties) {
    const association = record.nationAssociations.find(
      (candidate) => candidate.nationId === nationId,
    );
    if (
      association === undefined ||
      association.officialNationName !== party.officialName ||
      association.validationState !== "validated"
    ) {
      issues.push(
        `accord Nation party ${nationId} lacks a matching validated association`,
      );
    }
  }
  for (const association of record.nationAssociations) {
    const party = nationParties.get(association.nationId);
    if (
      party === undefined ||
      party.officialName !== association.officialNationName
    ) {
      issues.push(
        `accord Nation association ${association.nationId} lacks an exact party`,
      );
    }
  }

  const supersessionTypes = new Set([
    "supersedes",
    "superseded_by",
    "substitutes",
    "substituted_by",
  ]);
  const hasSupersessionRelationship = record.sourceDocumentRelationships.some(
    ({ relationshipType }) => supersessionTypes.has(relationshipType),
  );
  if (
    context.supersessionReview.state === "relationships_recorded" &&
    !hasSupersessionRelationship
  ) {
    issues.push(
      "accord supersession review claims relationships without a typed edge",
    );
  }
  if (
    context.supersessionReview.state === "no_relationship_established" &&
    hasSupersessionRelationship
  ) {
    issues.push(
      "accord supersession review denies an established typed relationship",
    );
  }

  const identity = context.instrumentIdentity;
  if (identity.kind === "source_provided") {
    if (
      identity.sourceIdentifier !== record.sourceDocumentIdentifier ||
      identity.fallbackRuleId !== null
    ) {
      issues.push("accord source-provided identity does not match the record");
    }
  } else {
    if (
      identity.sourceIdentifier !== null ||
      typeof identity.fallbackRuleId !== "string" ||
      identity.fallbackRuleId.trim() === ""
    ) {
      issues.push("accord project fallback identity is incomplete");
    }
    const identifierProvenance = record.fieldProvenance.find(
      ({ field }) => field === "/sourceDocumentIdentifier",
    );
    if (
      identifierProvenance === undefined ||
      identifierProvenance.transformation !== "deterministic_mapping" ||
      identifierProvenance.transformRuleId !== identity.fallbackRuleId
    ) {
      issues.push(
        "accord project fallback identifier lacks its deterministic provenance rule",
      );
    }
    if (sourceConfig.adapter?.identityRule !== identity.fallbackRuleId) {
      issues.push(
        "accord project fallback identity rule differs from source registry",
      );
    }
  }
}

function validateNationPolicy(record, knownNations, knownNationIds, issues) {
  const isCounty = record.jurisdiction.level === "county";
  const successor = record.schemaVersion === "2.0.0";
  const isStateOrFederal = (
    successor
      ? ["state", "federal", "county", "municipal", "other"]
      : ["state", "federal"]
  ).includes(record.jurisdiction.level);
  const explicitRelevance = record.relevance.some(
    ({ basis }) => basis === "explicit_nation_reference",
  );
  const generalRelevance = record.relevance.some(
    ({ basis }) => basis === "general_jurisdiction",
  );

  if (!successor && isCounty && record.nationAssociations.length === 0) {
    issues.push("county record has no explicit Nation association");
  }
  if (!successor && isCounty && !explicitRelevance) {
    issues.push("county record lacks explicit_nation_reference relevance");
  }
  if (!successor && isCounty && record.jurisdiction.generalJurisdictionOnly) {
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

  const associatedNationIds = new Set();
  record.nationAssociations.forEach((association, index) => {
    const label = `nationAssociations/${index}`;
    if (associatedNationIds.has(association.nationId)) {
      issues.push(`${label} duplicates a Nation association`);
    }
    associatedNationIds.add(association.nationId);
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
    if (
      ![record.urls.officialSource, record.urls.officialFullText].includes(
        association.evidenceUrl,
      )
    ) {
      issues.push(`${label} evidence URL is not an official record URL`);
    }

    const knownNation = knownNations?.get(association.nationId);
    if (knownNations && knownNation === undefined) {
      issues.push(`${label} references an unknown Nation ID`);
    } else if (knownNation !== undefined) {
      if (association.officialNationName !== knownNation.officialName) {
        issues.push(
          `${label} official Nation name does not match the validated collection`,
        );
      }
      const officialIdentities = [
        knownNation.officialName,
        ...knownNation.authorizedAliases,
      ];
      if (
        !officialIdentities.some((identity) =>
          association.evidenceText.includes(identity),
        )
      ) {
        issues.push(
          `${label} evidence does not contain an exact official name or authorized alias`,
        );
      }
    } else if (knownNationIds && !knownNationIds.has(association.nationId)) {
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
    if (
      record.schemaVersion === "2.0.0" &&
      entry.field.startsWith("/jurisdiction/") &&
      !entry.field.startsWith("/jurisdiction/review") &&
      (entry.sourceUrl !== record.jurisdiction.evidence.url ||
        entry.retrievedAt !== record.dates.retrieved ||
        entry.sourceUpdatedAt !== sourceUpdatedAt(record))
    )
      issues.push(
        `${label} jurisdiction provenance does not match its source capture`,
      );
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

function validateLandmarkPolicy(record, sourceConfig, issues) {
  const landmarkRelevance = record.relevance.some(
    ({ basis }) => basis === "landmark",
  );
  if (!record.landmark.isLandmark) {
    if (landmarkRelevance) {
      issues.push("non-landmark record cannot claim landmark relevance");
    }
    return;
  }

  if (record.landmark.reviewState !== "approved") {
    issues.push("landmark review state is not approved");
  }
  if (!landmarkRelevance) {
    issues.push("landmark record lacks landmark relevance");
  }
  if ((record.landmark.criterionCodes ?? []).length === 0) {
    issues.push("landmark record lacks an approved criterion code");
  }

  const criterionDocumentTypes = new Map([
    ["documented-court-decision", "court_decision"],
    ["treaty", "treaty"],
    ["statute", "statute"],
    ["public-state-federal-accord", "intergovernmental_accord"],
  ]);
  for (const criterion of record.landmark.criterionCodes ?? []) {
    const expectedDocumentType = criterionDocumentTypes.get(criterion);
    if (
      expectedDocumentType !== undefined &&
      record.documentType !== expectedDocumentType
    ) {
      issues.push(
        `landmark criterion ${criterion} does not match document type ${record.documentType}`,
      );
    }
    if (
      criterion === "public-state-federal-accord" &&
      !["state", "federal"].includes(record.jurisdiction.level)
    ) {
      issues.push(
        "public-state-federal-accord landmark has an unsupported jurisdiction level",
      );
    }
  }

  const eventDate =
    record.judicialContext?.decisionDate ??
    record.accordContext?.executionEvent.date ??
    record.dates.published ??
    record.dates.effective ??
    record.status.asOf;
  if (eventDate === null) {
    issues.push("landmark record lacks a verified official date");
  }

  const evidence = record.landmark.officialEvidence ?? [];
  if (evidence.length === 0) {
    issues.push("landmark record lacks official evidence");
  }
  const landmarkRelevanceEntries = record.relevance.filter(
    ({ basis }) => basis === "landmark",
  );
  if (
    evidence.length > 0 &&
    !landmarkRelevanceEntries.some((entry) =>
      evidence.some(({ sourceUrl }) => sourceUrl === entry.sourceUrl),
    )
  ) {
    issues.push("landmark relevance is not bound to its official evidence URL");
  }
  if (
    sourceConfig.publication.reproduction === "metadata_and_links" &&
    evidence.some((entry) => typeof entry.text === "string")
  ) {
    issues.push(
      "metadata-and-links source cannot publish copied landmark evidence text",
    );
  }
  const retrievedOn = record.dates.retrieved.slice(0, 10);
  evidence.forEach((entry, index) => {
    if (
      typeof entry.sourceDate === "string" &&
      entry.sourceDate > retrievedOn
    ) {
      issues.push(`landmark evidence ${index} date is after retrieval`);
    }
  });
}

function validateHistoricalPolicy(record, issues) {
  const eventDate =
    record.judicialContext?.decisionDate ??
    record.accordContext?.executionEvent.date ??
    record.dates.published;
  const eventYear = eventDate === null ? null : Number(eventDate.slice(0, 4));
  if (
    eventYear !== null &&
    eventYear < 1980 &&
    !record.historical.isHistorical
  ) {
    issues.push("pre-1980 record must be marked historical");
  }
  if (
    eventYear !== null &&
    eventYear < 1980 &&
    !record.landmark.isLandmark &&
    record.historical.pre1980Treatment !== "list_and_link"
  ) {
    issues.push("non-landmark pre-1980 record must use list_and_link");
  }
  if (
    eventYear !== null &&
    eventYear < 1980 &&
    record.landmark.isLandmark &&
    record.historical.pre1980Treatment !== "landmark_detail"
  ) {
    issues.push("pre-1980 landmark must use landmark_detail");
  }
  if (
    eventYear !== null &&
    eventYear >= 1980 &&
    record.historical.pre1980Treatment !== "not_applicable"
  ) {
    issues.push(
      "post-1979 record must use not_applicable historical treatment",
    );
  }
  if (
    !record.landmark.isLandmark &&
    record.historical.pre1980Treatment === "landmark_detail"
  ) {
    issues.push("non-landmark record cannot use landmark_detail treatment");
  }
  if (
    record.landmark.isLandmark &&
    record.historical.pre1980Treatment === "landmark_detail" &&
    (record.landmark.officialEvidence ?? []).length === 0
  ) {
    issues.push("landmark detail lacks official inclusion evidence");
  }
  if (
    eventYear !== null &&
    eventYear < 1980 &&
    !record.landmark.isLandmark &&
    (record.texts.officialSummary !== null ||
      record.texts.sourceExcerpt !== null ||
      record.texts.officialLanguage !== undefined ||
      record.texts.detailAsset.availability === "permitted_static_asset")
  ) {
    issues.push(
      "non-landmark pre-1980 record must remain metadata-and-link only",
    );
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
  { sourceConfig, taxonomy, knownNations = null, knownNationIds = null },
) {
  const issues = [];
  if (record.schemaVersion === "2.0.0") {
    try {
      const association = publicJurisdictionAssociation(
        record.jurisdiction,
        record.internalId,
      );
      const exact = association.evidence.exactSubject;
      const sourceTexts = [
        record.officialTitle,
        record.sourceDocumentIdentifier,
        record.status.sourceLabel,
        ...record.issuingBodies.map((row) => row.officialName),
        record.texts.officialSummary?.text,
        record.texts.sourceExcerpt?.text,
      ];
      if (
        association.reviewState !== "reviewed" ||
        !exact ||
        !sourceTexts.some(
          (text) => typeof text === "string" && text.includes(exact.text),
        )
      )
        issues.push("jurisdiction requires reviewed exact source evidence");
      if (
        ![record.urls.officialSource, record.urls.officialFullText].includes(
          association.evidence.url,
        )
      )
        issues.push("jurisdiction evidence URL is not an official record URL");
      if (
        association.jurisdictionRef.startsWith("nation:") &&
        !record.nationAssociations.some(
          (row) =>
            row.nationId === association.jurisdictionRef &&
            row.evidenceText.includes(exact?.text ?? ""),
        )
      )
        issues.push(
          "Nation jurisdiction lacks independently documented Nation attribution",
        );
      const configured = publicJurisdictionAssociation(
        sourceConfig.jurisdiction,
        sourceConfig.id,
      );
      if (
        association.basis === "issuing_authority" &&
        (configured.basis !== "issuing_authority" ||
          configured.reviewState !== "reviewed" ||
          configured.jurisdictionRef !== association.jurisdictionRef)
      )
        issues.push(
          "issuing jurisdiction does not match reviewed source authority",
        );
      if (
        association.jurisdictionRef.startsWith("nation:") &&
        !sourceConfig.synthetic
      )
        issues.push("real Nation registry binding is not enabled");
      const reviewedAt = Date.parse(record.jurisdiction.review?.reviewedAt);
      if (
        !Number.isFinite(reviewedAt) ||
        reviewedAt < Date.parse(record.dates.retrieved) ||
        reviewedAt > Date.parse(record.dataQuality.validatedAt)
      )
        issues.push(
          "jurisdiction review is outside retrieval/validation history",
        );
    } catch (error) {
      issues.push(error.message);
    }
  }
  try {
    assertStableRecordId(record.internalId);
    toUrlSafeId(record.internalId);
  } catch (error) {
    issues.push(error.message);
  }
  if (!sourceConfig.enabled) {
    issues.push("record source is disabled in the source registry");
  }
  if (sourceConfig.adapter === null) {
    issues.push("record source has no configured adapter");
  } else if (
    record.source.id !== sourceConfig.id ||
    record.source.adapterId !== sourceConfig.adapter.id ||
    record.source.adapterVersion !== sourceConfig.adapter.version
  ) {
    issues.push(
      "record source/adapter identity does not match source registry",
    );
  }
  validateNationPolicy(record, knownNations, knownNationIds, issues);
  validateJudicialContext(record, issues);
  validateAccordContext(record, sourceConfig, issues);
  validateSourceUrls(record, sourceConfig, issues);
  validateSourceDocumentRelationships(record, issues);
  validateTaxonomyPolicy(record, taxonomy, sourceConfig, issues);
  validateProvenance(record, sourceConfig, issues);
  validateLandmarkPolicy(record, sourceConfig, issues);
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
  const expectedVersion =
    sourceRegistry.schemaVersion === "2.0.0" ? "2.0.0" : "1.4.0";
  if (records.some((record) => record.schemaVersion !== expectedVersion))
    issues.push("record schema version does not match source registry");
  const sourceConfigs = new Map(
    sourceRegistry.sources.map((source) => [source.id, source]),
  );
  const knownNations = nations.length === 0 ? null : new Map();
  if (knownNations !== null) {
    for (const nation of nations) {
      if (knownNations.has(nation.id)) {
        issues.push(`Nation lookup duplicates ID: ${nation.id}`);
      }
      knownNations.set(nation.id, nation);
    }
  }
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
        knownNations,
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

  validateReciprocalRelationshipGraph(records, issues);

  if (issues.length > 0) {
    throw new PolicyValidationError(issues);
  }
  return records;
}
