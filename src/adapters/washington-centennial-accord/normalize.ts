import { createHash } from "node:crypto";

import sourceRegistry from "../../../config/sources.v1.json";

import { sourceDerivedLeafPointers } from "../../pipeline/policy-validation.mjs";
import type {
  FieldProvenance,
  PolicyRecord,
  SourceConfig,
  SourceRegistry,
} from "../../shared/contracts";
import {
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS,
  GOIA_ACCORD_URL,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION,
  WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
  WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
} from "./constants";
import {
  assertGoiaAccordProjection,
  goiaAccordSourceRecordId,
  type GoiaAccordProjection,
} from "./response-contract";

const DOCUMENT_TYPE_RULE = "goia-accord-document-type-v1";
const PARTY_ROLE_RULE = "goia-accord-collective-party-role-v1";
const EXECUTION_DATE_RULE = "goia-accord-execution-date-v1";
const STATUS_RULE = "goia-accord-current-status-not-established-v1";
const SUPERSESSION_RULE = "goia-accord-supersession-review-v1";
const GENERAL_JURISDICTION_RULE = "goia-accord-no-nation-inference-v1";
const LANDMARK_RULE = "goia-accord-reviewed-landmark-v1";
const RECORD_POLICY_RULE = "goia-accord-metadata-only-policy-v1";
const REPRODUCTION_BASIS =
  "GOIA supplies no content-reuse license; only reviewed metadata and the canonical official link are retained.";
const COVERAGE_NOTES =
  "One selected GOIA transcription of the Centennial Accord dated 1989-08-04. This does not claim a signed facsimile, individual signatory set, complete accord registry, current legal status, or complete amendment and supersession history.";
const REVIEWED_SOURCE_FINGERPRINT =
  "dbbc22bccef344e05762ff1e999071f19f811581335dd7197f61e3f6730bb695";

type ProvenanceSpec = Pick<
  FieldProvenance,
  "sourcePath" | "transformation" | "transformRuleId"
>;

export interface GoiaAccordNormalizationInput {
  source: SourceConfig;
  retrievedAt: string;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  const result = JSON.stringify(value, (_key, nested) => {
    if (
      nested === null ||
      typeof nested !== "object" ||
      Array.isArray(nested)
    ) {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).sort(
        ([left], [right]) => compareCodeUnits(left, right),
      ),
    );
  });
  if (result === undefined) {
    throw new Error("GOIA Centennial Accord value is not JSON-serializable.");
  }
  return result;
}

function assertIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(
      "GOIA Centennial Accord retrieval time must be normalized UTC.",
    );
  }
  if (value.slice(0, 10) < GOIA_ACCORD_METADATA.executionDate) {
    throw new Error(
      "GOIA Centennial Accord retrieval cannot predate its execution event.",
    );
  }
  return value;
}

function registeredSource(): SourceConfig {
  const registry = sourceRegistry as unknown as SourceRegistry;
  const source = registry.sources.find(
    ({ id }) => id === WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
  );
  if (source === undefined) {
    throw new Error("GOIA Centennial Accord source is not registered.");
  }
  const fingerprint = createHash("sha256")
    .update(stableJson(source), "utf8")
    .digest("hex");
  if (fingerprint !== REVIEWED_SOURCE_FINGERPRINT) {
    throw new Error(
      "GOIA Centennial Accord registered source differs from the reviewed contract.",
    );
  }
  return source;
}

export function assertGoiaAccordSourceConfig(
  source: SourceConfig,
): NonNullable<SourceConfig["adapter"]> {
  const canonical = registeredSource();
  const expected = { ...canonical, enabled: true };
  if (
    stableJson(source) !== stableJson(expected) ||
    source.adapter?.id !== WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID ||
    source.adapter.version !== WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION ||
    source.adapter.identityRule !==
      WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE ||
    stableJson(source.publication.requiredProvenancePointers) !==
      stableJson(GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS)
  ) {
    throw new Error(
      "GOIA Centennial Accord source configuration differs from the reviewed enabled runtime contract.",
    );
  }
  return source.adapter;
}

export function goiaAccordStableRecordId(): string {
  return `psr:${WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID}:${Buffer.from(
    goiaAccordSourceRecordId(),
    "utf8",
  ).toString("base64url")}`;
}

function copied(sourcePath: string): ProvenanceSpec {
  return { sourcePath, transformation: "copied", transformRuleId: null };
}

function mapped(sourcePath: string, transformRuleId: string): ProvenanceSpec {
  return {
    sourcePath,
    transformation: "deterministic_mapping",
    transformRuleId,
  };
}

function normalized(
  sourcePath: string,
  transformRuleId: string,
): ProvenanceSpec {
  return { sourcePath, transformation: "normalized", transformRuleId };
}

function provenanceSpec(field: string): ProvenanceSpec {
  if (field === "/officialTitle") {
    return copied("$article.body.h2");
  }
  if (field === "/sourceDocumentIdentifier") {
    return mapped(
      "$adapterIdentity.titleExecutionUrl",
      WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
    );
  }
  if (field === "/documentType") {
    return mapped("$adapterPolicy.documentType", DOCUMENT_TYPE_RULE);
  }
  if (field.startsWith("/jurisdiction/")) {
    return field === "/jurisdiction/generalJurisdictionOnly"
      ? mapped(
          "$adapterPolicy.generalJurisdictionOnly",
          GENERAL_JURISDICTION_RULE,
        )
      : copied(
          `$sourceRegistry.sources[${WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID}]${field}`,
        );
  }
  if (field.startsWith("/accordContext/parties/")) {
    if (field.endsWith("/sourceUrl")) {
      return copied("$request.url");
    }
    if (field.endsWith("/officialName") || field.endsWith("/sourceLabel")) {
      return copied("$article.collectivePartyMetadata");
    }
    return mapped("$adapterPolicy.collectivePartyRoles", PARTY_ROLE_RULE);
  }
  if (field.startsWith("/accordContext/executionEvent/")) {
    if (field.endsWith("/sourceUrl")) {
      return copied("$request.url");
    }
    if (field.endsWith("/sourceLabel")) {
      return copied("$article.executionEvent");
    }
    return normalized("$article.executionEvent", EXECUTION_DATE_RULE);
  }
  if (field.startsWith("/accordContext/statusReview/")) {
    if (field.endsWith("/sourceUrl")) {
      return copied("$request.url");
    }
    if (field.endsWith("/sourceLabel")) {
      return copied("$article.executionEvent");
    }
    return mapped("$adapterPolicy.statusReview", STATUS_RULE);
  }
  if (field.startsWith("/accordContext/supersessionReview/")) {
    return field.includes("/sourceUrls/")
      ? copied("$request.url")
      : mapped("$reviewedSourceScope.supersession", SUPERSESSION_RULE);
  }
  if (field.startsWith("/accordContext/instrumentIdentity/")) {
    return mapped(
      "$adapterIdentity.titleExecutionUrl",
      WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
    );
  }
  if (field.startsWith("/status/")) {
    return mapped("$adapterPolicy.genericStatus", STATUS_RULE);
  }
  if (field === "/urls/officialSource") {
    return copied("$request.url");
  }
  if (field === "/isUnclassified") {
    return mapped("$adapterPolicy.isUnclassified", RECORD_POLICY_RULE);
  }
  if (field.startsWith("/relevance/")) {
    return field.endsWith("/sourceUrl")
      ? copied("$request.url")
      : mapped(
          "$reviewedEditorialPolicy.relevance",
          field.startsWith("/relevance/1/")
            ? LANDMARK_RULE
            : GENERAL_JURISDICTION_RULE,
        );
  }
  if (field.startsWith("/landmark/")) {
    if (field.endsWith("/sourceUrl")) {
      return copied("$request.url");
    }
    if (field.endsWith("/sourceDate")) {
      return normalized("$article.executionEvent", EXECUTION_DATE_RULE);
    }
    if (field.endsWith("/sourceLabel")) {
      return normalized("$article.metadata", LANDMARK_RULE);
    }
    return mapped("$landmarkReview", LANDMARK_RULE);
  }
  if (field.startsWith("/historical/")) {
    return mapped("$adapterPolicy.historical", RECORD_POLICY_RULE);
  }
  throw new Error(
    `GOIA Centennial Accord provenance path is not mapped: ${field}`,
  );
}

function provenanceEntries(
  record: PolicyRecord,
  retrievedAt: string,
): FieldProvenance[] {
  return sourceDerivedLeafPointers(record)
    .map((field) => ({
      field,
      ...provenanceSpec(field),
      sourceId: WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
      sourceRecordId: record.source.recordId,
      sourceUrl: GOIA_ACCORD_URL,
      retrievedAt,
      sourceUpdatedAt: null,
      adapterId: WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
      validationState: "validated" as const,
    }))
    .sort((left, right) => compareCodeUnits(left.field, right.field));
}

export function normalizeGoiaAccord(
  projection: Readonly<GoiaAccordProjection>,
  input: GoiaAccordNormalizationInput,
): PolicyRecord {
  const adapter = assertGoiaAccordSourceConfig(input.source);
  const retrievedAt = assertIsoDateTime(input.retrievedAt);
  const metadata = assertGoiaAccordProjection(projection);
  const reviewedOn = retrievedAt.slice(0, 10);
  const role = (
    normalizedRole: "executing_party" | "signatory_party",
    sourceLabel: string,
  ) => ({
    normalized: normalizedRole,
    sourceLabel,
    sourceUrl: GOIA_ACCORD_URL,
  });

  const record: PolicyRecord = {
    schemaVersion: "1.4.0",
    internalId: goiaAccordStableRecordId(),
    source: {
      id: input.source.id,
      name: input.source.name,
      provider: input.source.provider,
      recordId: goiaAccordSourceRecordId(),
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      coverage: {
        from: metadata.executionDate,
        through: metadata.executionDate,
        notes: COVERAGE_NOTES,
      },
      attribution: input.source.publication.attribution,
    },
    officialTitle: metadata.instrumentTitle,
    sourceDocumentIdentifier: GOIA_ACCORD_METADATA.fallbackIdentifier,
    documentType: "intergovernmental_accord",
    jurisdiction: {
      ...input.source.jurisdiction,
      generalJurisdictionOnly: true,
    },
    issuingBodies: [],
    legislativeContext: null,
    judicialContext: null,
    accordContext: {
      parties: [
        {
          sourceId: null,
          partyKind: "government",
          officialName: metadata.statePartyName,
          roles: [
            role("executing_party", metadata.stateExecutingLabel),
            role("signatory_party", metadata.stateSignatoryLabel),
          ],
        },
        {
          sourceId: null,
          partyKind: "collective_governments",
          officialName: metadata.tribalPartyName,
          roles: [
            role("executing_party", metadata.tribalPartyName),
            role("signatory_party", metadata.tribalSignatoryLabel),
          ],
        },
      ],
      executionEvent: {
        role: "executed",
        date: metadata.executionDate,
        sourceLabel: metadata.executionSourceLabel,
        sourceUrl: GOIA_ACCORD_URL,
      },
      statusReview: {
        currentStatus: "not_established",
        evidenceKind: "narrative_execution_language",
        sourceLabel: metadata.executionSourceLabel,
        sourceUrl: GOIA_ACCORD_URL,
        reviewedOn,
      },
      supersessionReview: {
        state: "no_relationship_established",
        scope: "reviewed_official_sources_only",
        reviewedOn,
        sourceUrls: [GOIA_ACCORD_URL],
      },
      instrumentIdentity: {
        kind: "project_fallback",
        sourceIdentifier: null,
        fallbackRuleId: WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
      },
    },
    status: { normalized: "unknown", sourceLabel: null, asOf: null },
    dates: {
      introduced: null,
      published: null,
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: retrievedAt,
    },
    urls: { officialSource: GOIA_ACCORD_URL, officialFullText: null },
    texts: {
      officialSummary: null,
      sourceExcerpt: null,
      detailAsset: {
        availability: "official_link_only",
        path: null,
        reproductionBasis: REPRODUCTION_BASIS,
      },
    },
    sponsors: [],
    committees: [],
    actionHistory: [],
    statusHistory: [],
    sourceDocumentRelationships: [],
    officialSubjects: [],
    taxonomyMemberships: [],
    isUnclassified: true,
    relevance: [
      {
        basis: "general_jurisdiction",
        label: "General Washington jurisdiction — signatories unresolved",
        sourceUrl: GOIA_ACCORD_URL,
        evidence:
          "The reviewed page identifies only collective parties and no exact individual Nation signatory set; no Nation relationship is inferred.",
      },
      {
        basis: "landmark",
        label: "Approved public state intergovernmental accord landmark",
        sourceUrl: GOIA_ACCORD_URL,
        evidence:
          "The originating state page supplies the exact instrument title, collective parties, and dated execution event required by the reviewed public-state-federal-accord criterion.",
      },
    ],
    nationAssociations: [],
    landmark: {
      isLandmark: true,
      criterionCodes: ["public-state-federal-accord"],
      reviewState: "approved",
      officialEvidence: [
        {
          sourceLabel: `${metadata.instrumentTitle}; executed ${metadata.executionDate}`,
          sourceUrl: GOIA_ACCORD_URL,
          sourceDate: metadata.executionDate,
          reproductionBasis: REPRODUCTION_BASIS,
        },
      ],
    },
    historical: { isHistorical: false, pre1980Treatment: "not_applicable" },
    dataQuality: {
      state: "validated",
      validatedAt: retrievedAt,
      validator: `${WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID}@${WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION}`,
      issues: [],
    },
    sourceHealth: {
      status: "healthy",
      checkedAt: retrievedAt,
      dataAsOf: retrievedAt,
      lastSuccessfulRetrievalAt: retrievedAt,
      usingLastKnownGood: false,
      message: null,
    },
    change: {
      firstSeenAt: retrievedAt,
      lastSeenAt: retrievedAt,
      kind: "new",
      urgentAlert: null,
    },
    aiSummary: { exists: false, label: "AI-generated source summary" },
    fieldProvenance: [],
  };
  record.fieldProvenance = provenanceEntries(record, retrievedAt);
  return record;
}

export const GOIA_ACCORD_NORMALIZATION_RULES = Object.freeze({
  documentType: DOCUMENT_TYPE_RULE,
  partyRole: PARTY_ROLE_RULE,
  executionDate: EXECUTION_DATE_RULE,
  status: STATUS_RULE,
  supersession: SUPERSESSION_RULE,
  generalJurisdiction: GENERAL_JURISDICTION_RULE,
  landmark: LANDMARK_RULE,
  recordPolicy: RECORD_POLICY_RULE,
} as const);
