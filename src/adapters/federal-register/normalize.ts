import { Buffer } from "node:buffer";

import type {
  FieldProvenance,
  HistoryEvent,
  OfficialSubject,
  PolicyRecord,
  SourceConfig,
  SourceDocumentRelationship,
} from "../../shared/contracts";
import type {
  FederalRegisterDocument,
  FederalRegisterRelatedDocument,
} from "./response-contract";
import { reconcileFederalRegisterCorrections } from "./response-contract";

export const FEDERAL_REGISTER_SOURCE_ID = "federal-register" as const;
export const FEDERAL_REGISTER_ADAPTER_ID = "federal-register-adapter" as const;
export const FEDERAL_REGISTER_ADAPTER_VERSION = "1.0.0" as const;
export const FEDERAL_REGISTER_IDENTITY_RULE =
  "federal-register-document-number-v1" as const;

const REVIEWED_FEDERAL_REGISTER_SOURCE = {
  id: FEDERAL_REGISTER_SOURCE_ID,
  name: "Federal Register",
  provider: "Office of the Federal Register",
  synthetic: false,
  enabled: true,
  adapter: {
    id: FEDERAL_REGISTER_ADAPTER_ID,
    version: FEDERAL_REGISTER_ADAPTER_VERSION,
    module: "src/adapters/federal-register/index.ts",
    identityRule: FEDERAL_REGISTER_IDENTITY_RULE,
  },
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
  },
  access: {
    method: "api",
    officialDocumentationUrl:
      "https://www.federalregister.gov/developers/documentation/api/v1",
    accessedOn: "2026-07-31",
    allowedHosts: ["www.federalregister.gov", "www.govinfo.gov"],
    authentication: "none",
    rateLimit:
      "No numeric request-rate limit was published on 2026-07-31. The documented page-size maximum is 1,000 and the observed search window is 10,000 results, so retrieval must use deterministic date slicing.",
    browserRuntimeAllowed: false,
  },
  coverage: {
    from: "1994-01-03",
    through: null,
    cadence:
      "Federal Register issues are published on federal business days; Policy Sentinel retrieval is build-time only.",
    limitations:
      "The API documents coverage since 1994. The first observed issue is 1994-01-03; early records may lack individual PDFs, and API HTML/XML renditions are informational rather than the official edition. The historical Uncategorized Document type is reconciled for source completeness but is not an eligible public-record candidate; no missing issuing body is inferred.",
  },
  publication: {
    attribution:
      "Office of the Federal Register and the issuing agency; link the official PDF on GovInfo when available.",
    termsUrl:
      "https://www.federalregister.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site",
    reproduction: "reviewed_excerpt",
    failureMode: "last_known_good",
    requiredProvenancePointers: [
      "/officialTitle",
      "/sourceDocumentIdentifier",
      "/documentType",
      "/jurisdiction/name",
      "/status/sourceLabel",
      "/urls/officialSource",
    ],
  },
  officialSubjectMappings: [],
} as const;

const DOCUMENT_TYPE_RULE = "federal-register-document-type-v1";
const RELATIONSHIP_RULE = "federal-register-relationship-v1";
const GENERAL_JURISDICTION_RULE = "federal-register-general-jurisdiction-v1";
const RECORD_POLICY_RULE = "federal-register-record-policy-v1";
const REPRODUCTION_BASIS =
  "Federal Register material reproduced under the reviewed 1 CFR 2.6 boundary.";

type ProvenanceTransformation = FieldProvenance["transformation"];

interface ProvenanceSpec {
  sourcePath: string;
  transformation: ProvenanceTransformation;
  transformRuleId: string | null;
}

export interface FederalRegisterNormalizationInput {
  source: SourceConfig;
  retrievedAt: string;
}

interface RelationshipWithProvenance {
  value: SourceDocumentRelationship;
  fields: {
    relationshipType: ProvenanceSpec;
    targetSourceRecordId: ProvenanceSpec;
    targetUrl: ProvenanceSpec;
    sourceLabel: ProvenanceSpec;
  };
}

interface HistoryWithProvenance {
  value: HistoryEvent;
  fields: {
    date?: ProvenanceSpec;
    sourceLabel: ProvenanceSpec;
    sourceUrl: ProvenanceSpec;
  };
}

interface SubjectWithProvenance {
  value: OfficialSubject;
  sourcePath: string;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  const serialized = JSON.stringify(value, (_key, nested) => {
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
  if (serialized === undefined) {
    throw new Error(
      "Federal Register source configuration is not JSON-serializable.",
    );
  }
  return serialized;
}

export function assertFederalRegisterSourceConfig(
  source: SourceConfig,
): NonNullable<SourceConfig["adapter"]> {
  const invariants = {
    id: source.id,
    name: source.name,
    provider: source.provider,
    synthetic: source.synthetic,
    enabled: source.enabled,
    adapter: source.adapter,
    jurisdiction: source.jurisdiction,
    access: source.access,
    coverage: source.coverage,
    publication: source.publication,
    officialSubjectMappings: source.officialSubjectMappings,
  };
  if (stableJson(invariants) !== stableJson(REVIEWED_FEDERAL_REGISTER_SOURCE)) {
    throw new Error(
      "Federal Register source configuration differs from the reviewed enabled registration.",
    );
  }
  return source.adapter as NonNullable<SourceConfig["adapter"]>;
}

function assertNormalizationContext(input: FederalRegisterNormalizationInput): {
  source: SourceConfig;
  retrievedAt: string;
  adapter: NonNullable<SourceConfig["adapter"]>;
} {
  const { source } = input;
  const adapter = assertFederalRegisterSourceConfig(source);

  const parsed = new Date(input.retrievedAt);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== input.retrievedAt
  ) {
    throw new Error(
      "Federal Register retrieval time must be a normalized UTC timestamp.",
    );
  }
  return {
    source,
    retrievedAt: input.retrievedAt,
    adapter,
  };
}

export function federalRegisterStableRecordId(documentNumber: string): string {
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/.test(documentNumber)) {
    throw new Error(
      "Federal Register document number is not valid for the versioned identity rule.",
    );
  }
  return `psr:${FEDERAL_REGISTER_SOURCE_ID}:${Buffer.from(
    documentNumber,
    "utf8",
  ).toString("base64url")}`;
}

function documentType(
  value: FederalRegisterDocument["type"],
): PolicyRecord["documentType"] {
  switch (value) {
    case "Rule":
      return "regulation";
    case "Proposed Rule":
      return "proposed_rule";
    case "Notice":
      return "notice";
    case "Presidential Document":
      return "executive_action";
    case "Uncategorized Document":
      throw new Error(
        "Uncategorized Federal Register documents are outside the reviewed public beta record types.",
      );
  }
}

function correctionDocumentNumber(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Federal Register correction URL is invalid.");
  }
  const match =
    /^\/api\/v1\/documents\/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)(?:\.json)?$/.exec(
      url.pathname,
    );
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.federalregister.gov" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    match === null
  ) {
    throw new Error(
      "Federal Register correction URL is outside the exact document API path.",
    );
  }
  return match[1];
}

function relatedDocumentUrl(related: FederalRegisterRelatedDocument): string {
  if (
    related.html_url !== `/d/${related.document_number}` &&
    related.html_url !==
      `https://www.federalregister.gov/d/${related.document_number}`
  ) {
    throw new Error(
      "Federal Register related-document URL does not match its document number.",
    );
  }
  return new URL(related.html_url, "https://www.federalregister.gov").href;
}

function relationshipInventory(
  document: FederalRegisterDocument,
): RelationshipWithProvenance[] {
  const relationships: RelationshipWithProvenance[] = [];
  if (document.correction_of !== null) {
    relationships.push({
      value: {
        relationshipType: "corrects",
        targetSourceRecordId: correctionDocumentNumber(document.correction_of),
        targetUrl: document.correction_of,
        sourceLabel: "correction_of",
      },
      fields: {
        relationshipType: {
          sourcePath: "$.correction_of",
          transformation: "deterministic_mapping",
          transformRuleId: RELATIONSHIP_RULE,
        },
        targetSourceRecordId: {
          sourcePath: "$.correction_of",
          transformation: "normalized",
          transformRuleId: RELATIONSHIP_RULE,
        },
        targetUrl: {
          sourcePath: "$.correction_of",
          transformation: "copied",
          transformRuleId: null,
        },
        sourceLabel: {
          sourcePath: "$.correction_of",
          transformation: "deterministic_mapping",
          transformRuleId: RELATIONSHIP_RULE,
        },
      },
    });
  }

  document.corrections.forEach((correctionUrl, index) => {
    relationships.push({
      value: {
        relationshipType: "corrected_by",
        targetSourceRecordId: correctionDocumentNumber(correctionUrl),
        targetUrl: correctionUrl,
        sourceLabel: "corrections",
      },
      fields: {
        relationshipType: {
          sourcePath: `$.corrections[${index}]`,
          transformation: "deterministic_mapping",
          transformRuleId: RELATIONSHIP_RULE,
        },
        targetSourceRecordId: {
          sourcePath: `$.corrections[${index}]`,
          transformation: "normalized",
          transformRuleId: RELATIONSHIP_RULE,
        },
        targetUrl: {
          sourcePath: `$.corrections[${index}]`,
          transformation: "copied",
          transformRuleId: null,
        },
        sourceLabel: {
          sourcePath: `$.corrections[${index}]`,
          transformation: "deterministic_mapping",
          transformRuleId: RELATIONSHIP_RULE,
        },
      },
    });
  });

  for (const [docketLabel, relatedDocuments] of Object.entries(
    document.related_documents,
  )) {
    relatedDocuments.forEach((related, index) => {
      if (related.relationship_type === null) {
        return;
      }
      const sourcePath = `$.related_documents[${JSON.stringify(
        docketLabel,
      )}][${index}]`;
      relationships.push({
        value: {
          relationshipType: "related_document",
          targetSourceRecordId: related.document_number,
          targetUrl: relatedDocumentUrl(related),
          sourceLabel: related.relationship_type,
        },
        fields: {
          relationshipType: {
            sourcePath: `${sourcePath}.relationship_type`,
            transformation: "deterministic_mapping",
            transformRuleId: RELATIONSHIP_RULE,
          },
          targetSourceRecordId: {
            sourcePath: `${sourcePath}.document_number`,
            transformation: "copied",
            transformRuleId: null,
          },
          targetUrl: {
            sourcePath: `${sourcePath}.html_url`,
            transformation: "normalized",
            transformRuleId: RELATIONSHIP_RULE,
          },
          sourceLabel: {
            sourcePath: `${sourcePath}.relationship_type`,
            transformation: "copied",
            transformRuleId: null,
          },
        },
      });
    });
  }

  relationships.sort(
    (left, right) =>
      compareCodeUnits(
        left.value.relationshipType,
        right.value.relationshipType,
      ) ||
      compareCodeUnits(
        left.value.targetSourceRecordId,
        right.value.targetSourceRecordId,
      ) ||
      compareCodeUnits(left.value.sourceLabel, right.value.sourceLabel) ||
      compareCodeUnits(
        left.fields.targetSourceRecordId.sourcePath,
        right.fields.targetSourceRecordId.sourcePath,
      ),
  );
  const deduplicated: RelationshipWithProvenance[] = [];
  const seen = new Map<string, RelationshipWithProvenance>();
  for (const relationship of relationships) {
    const key = `${relationship.value.relationshipType}\u0000${relationship.value.targetSourceRecordId}`;
    if (relationship.value.targetSourceRecordId === document.document_number) {
      throw new Error(
        "Federal Register document contains a self-referential source relationship.",
      );
    }
    const previous = seen.get(key);
    if (previous !== undefined) {
      if (
        previous.value.targetUrl !== relationship.value.targetUrl ||
        previous.value.sourceLabel !== relationship.value.sourceLabel
      ) {
        throw new Error(
          "Federal Register document contains conflicting normalized source relationships.",
        );
      }
      continue;
    }
    seen.set(key, relationship);
    deduplicated.push(relationship);
  }
  return deduplicated;
}

function actionInventory(
  document: FederalRegisterDocument,
): HistoryWithProvenance[] {
  const actions: HistoryWithProvenance[] = [];
  if (document.action !== null) {
    actions.push({
      value: {
        date: null,
        sourceLabel: document.action,
        sourceUrl: document.html_url,
      },
      fields: {
        sourceLabel: {
          sourcePath: "$.action",
          transformation: "copied",
          transformRuleId: null,
        },
        sourceUrl: {
          sourcePath: "$.html_url",
          transformation: "copied",
          transformRuleId: null,
        },
      },
    });
  }
  if (document.dates !== null) {
    actions.push({
      value: {
        date: null,
        sourceLabel: document.dates,
        sourceUrl: document.html_url,
      },
      fields: {
        sourceLabel: {
          sourcePath: "$.dates",
          transformation: "copied",
          transformRuleId: null,
        },
        sourceUrl: {
          sourcePath: "$.html_url",
          transformation: "copied",
          transformRuleId: null,
        },
      },
    });
  }
  if (document.signing_date !== null) {
    actions.push({
      value: {
        date: document.signing_date,
        sourceLabel: "signing_date",
        sourceUrl: document.html_url,
      },
      fields: {
        date: {
          sourcePath: "$.signing_date",
          transformation: "copied",
          transformRuleId: null,
        },
        sourceLabel: {
          sourcePath: "$.signing_date",
          transformation: "deterministic_mapping",
          transformRuleId: RECORD_POLICY_RULE,
        },
        sourceUrl: {
          sourcePath: "$.html_url",
          transformation: "copied",
          transformRuleId: null,
        },
      },
    });
  }
  return actions;
}

function subjectInventory(
  document: FederalRegisterDocument,
): SubjectWithProvenance[] {
  const subjects: SubjectWithProvenance[] = document.topics.map(
    (label, index) => ({
      value: {
        scheme: "Federal Register topic",
        label,
        sourceUrl: document.html_url,
      },
      sourcePath: `$.topics[${index}]`,
    }),
  );
  (document.cfr_topics ?? []).forEach((cfrTopic, cfrIndex) => {
    cfrTopic.topics.forEach((label, topicIndex) => {
      subjects.push({
        value: {
          scheme: "Federal Register CFR topic",
          label,
          sourceUrl: document.html_url,
        },
        sourcePath: `$.cfr_topics[${cfrIndex}].topics[${topicIndex}]`,
      });
    });
  });

  subjects.sort(
    (left, right) =>
      compareCodeUnits(left.value.scheme, right.value.scheme) ||
      compareCodeUnits(left.value.label, right.value.label),
  );
  const seen = new Set<string>();
  return subjects.filter(({ value }) => {
    const key = `${value.scheme}\u0000${value.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function setStaticProvenance(
  specs: Map<string, ProvenanceSpec>,
  document: FederalRegisterDocument,
): void {
  const copied = (field: string, sourcePath: string): void => {
    specs.set(field, {
      sourcePath,
      transformation: "copied",
      transformRuleId: null,
    });
  };
  const mapped = (
    field: string,
    sourcePath: string,
    transformRuleId = RECORD_POLICY_RULE,
  ): void => {
    specs.set(field, {
      sourcePath,
      transformation: "deterministic_mapping",
      transformRuleId,
    });
  };
  copied("/officialTitle", "$.title");
  copied("/sourceDocumentIdentifier", "$.document_number");
  mapped("/documentType", "$.type", DOCUMENT_TYPE_RULE);
  mapped("/jurisdiction/level", "$sourceRegistry.jurisdiction.level");
  mapped("/jurisdiction/name", "$sourceRegistry.jurisdiction.name");
  mapped(
    "/jurisdiction/generalJurisdictionOnly",
    "$adapterPolicy.generalJurisdiction",
    GENERAL_JURISDICTION_RULE,
  );
  mapped("/status/normalized", "$adapterPolicy.status");
  copied(
    "/status/sourceLabel",
    document.action === null ? "$.type" : "$.action",
  );
  copied("/status/asOf", "$.publication_date");
  copied("/dates/published", "$.publication_date");
  if (document.comments_close_on !== null) {
    copied("/dates/deadline", "$.comments_close_on");
  }
  if (document.effective_on !== null) {
    copied("/dates/effective", "$.effective_on");
  }
  copied("/urls/officialSource", "$.html_url");
  if (document.pdf_url !== null) {
    copied("/urls/officialFullText", "$.pdf_url");
  }

  if (document.abstract !== null) {
    copied("/texts/officialSummary/text", "$.abstract");
    copied("/texts/officialSummary/sourceUrl", "$.html_url");
    copied("/texts/officialSummary/sourceDate", "$.publication_date");
    mapped(
      "/texts/officialSummary/reproductionBasis",
      "$adapterPolicy.reproduction",
    );
  }
  if (document.disposition_notes !== null) {
    copied("/texts/sourceExcerpt/text", "$.disposition_notes");
    copied("/texts/sourceExcerpt/sourceUrl", "$.html_url");
    copied("/texts/sourceExcerpt/sourceDate", "$.publication_date");
    mapped(
      "/texts/sourceExcerpt/reproductionBasis",
      "$adapterPolicy.reproduction",
    );
  }
  mapped("/texts/detailAsset/availability", "$adapterPolicy.reproduction");
  mapped("/texts/detailAsset/reproductionBasis", "$adapterPolicy.reproduction");
  mapped(
    "/isUnclassified",
    "$taxonomy.mappingPolicy + $.topics + $.cfr_topics",
  );
  mapped(
    "/relevance/0/basis",
    "$adapterPolicy.generalJurisdiction",
    GENERAL_JURISDICTION_RULE,
  );
  mapped(
    "/relevance/0/label",
    "$adapterPolicy.generalJurisdiction",
    GENERAL_JURISDICTION_RULE,
  );
  copied("/relevance/0/sourceUrl", "$.html_url");
  mapped(
    "/relevance/0/evidence",
    "$adapterPolicy.generalJurisdiction",
    GENERAL_JURISDICTION_RULE,
  );
  mapped("/landmark/isLandmark", "$adapterPolicy.landmark");
  mapped("/historical/isHistorical", "$adapterPolicy.historical");
  mapped("/historical/pre1980Treatment", "$adapterPolicy.historical");
}

function provenanceEntries(
  specs: Map<string, ProvenanceSpec>,
  source: SourceConfig,
  document: FederalRegisterDocument,
  retrievedAt: string,
): FieldProvenance[] {
  return [...specs.entries()]
    .map(([field, spec]) => ({
      field,
      sourcePath: spec.sourcePath,
      sourceId: source.id,
      sourceRecordId: document.document_number,
      sourceUrl: document.json_url,
      retrievedAt,
      sourceUpdatedAt: null,
      adapterId: FEDERAL_REGISTER_ADAPTER_ID,
      transformation: spec.transformation,
      transformRuleId: spec.transformRuleId,
      validationState: "validated" as const,
    }))
    .sort((left, right) => compareCodeUnits(left.field, right.field));
}

function normalizeReconciledFederalRegisterDocument(
  document: FederalRegisterDocument,
  input: FederalRegisterNormalizationInput,
): PolicyRecord {
  const { source, retrievedAt, adapter } = assertNormalizationContext(input);
  if (document.agencies.length === 0 && document.agency_names.length === 0) {
    throw new Error(
      "Federal Register document has no issuing agency and cannot satisfy the public record contract.",
    );
  }

  const relationships = relationshipInventory(document);
  const actions = actionInventory(document);
  const subjects = subjectInventory(document);
  const specs = new Map<string, ProvenanceSpec>();
  setStaticProvenance(specs, document);

  const issuingBodies =
    document.agencies.length > 0
      ? document.agencies.map((agency, index) => {
          if (agency.id !== undefined) {
            specs.set(`/issuingBodies/${index}/sourceId`, {
              sourcePath: `$.agencies[${index}].id`,
              transformation: "normalized",
              transformRuleId: RECORD_POLICY_RULE,
            });
          }
          specs.set(`/issuingBodies/${index}/officialName`, {
            sourcePath: `$.agencies[${index}].raw_name`,
            transformation: "copied",
            transformRuleId: null,
          });
          return {
            sourceId: agency.id === undefined ? null : String(agency.id),
            officialName: agency.raw_name,
          };
        })
      : document.agency_names
          .map((officialName, sourceIndex) => ({ officialName, sourceIndex }))
          .filter(
            ({ officialName }, index, names) =>
              names.findIndex(
                ({ officialName: candidate }) => candidate === officialName,
              ) === index,
          )
          .map(({ officialName, sourceIndex }, index) => {
            specs.set(`/issuingBodies/${index}/officialName`, {
              sourcePath: `$.agency_names[${sourceIndex}]`,
              transformation: "copied",
              transformRuleId: null,
            });
            return {
              sourceId: null,
              officialName,
            };
          });

  actions.forEach((action, index) => {
    if (action.fields.date !== undefined) {
      specs.set(`/actionHistory/${index}/date`, action.fields.date);
    }
    specs.set(`/actionHistory/${index}/sourceLabel`, action.fields.sourceLabel);
    specs.set(`/actionHistory/${index}/sourceUrl`, action.fields.sourceUrl);
  });
  relationships.forEach((relationship, index) => {
    for (const [field, spec] of Object.entries(relationship.fields)) {
      specs.set(`/sourceDocumentRelationships/${index}/${field}`, spec);
    }
  });
  subjects.forEach((subject, index) => {
    specs.set(`/officialSubjects/${index}/scheme`, {
      sourcePath: subject.sourcePath,
      transformation: "deterministic_mapping",
      transformRuleId: RECORD_POLICY_RULE,
    });
    specs.set(`/officialSubjects/${index}/label`, {
      sourcePath: subject.sourcePath,
      transformation: "copied",
      transformRuleId: null,
    });
    specs.set(`/officialSubjects/${index}/sourceUrl`, {
      sourcePath: "$.html_url",
      transformation: "copied",
      transformRuleId: null,
    });
  });

  const dataAsOf = `${document.publication_date}T00:00:00Z`;
  const record: PolicyRecord = {
    schemaVersion: "1.1.0",
    internalId: federalRegisterStableRecordId(document.document_number),
    source: {
      id: source.id,
      name: source.name,
      provider: source.provider,
      recordId: document.document_number,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      coverage: {
        from: source.coverage.from,
        through: source.coverage.through,
        notes: source.coverage.limitations,
      },
      attribution: source.publication.attribution,
    },
    officialTitle: document.title,
    sourceDocumentIdentifier: document.document_number,
    documentType: documentType(document.type),
    jurisdiction: {
      level: source.jurisdiction.level,
      name: source.jurisdiction.name,
      stateCode: source.jurisdiction.stateCode,
      generalJurisdictionOnly: true,
    },
    issuingBodies,
    legislativeContext: null,
    status: {
      normalized: "unknown",
      sourceLabel: document.action ?? document.type,
      asOf: document.publication_date,
    },
    dates: {
      introduced: null,
      published: document.publication_date,
      updated: null,
      lastAction: null,
      deadline: document.comments_close_on,
      effective: document.effective_on,
      retrieved: retrievedAt,
    },
    urls: {
      officialSource: document.html_url,
      officialFullText: document.pdf_url,
    },
    texts: {
      officialSummary:
        document.abstract === null
          ? null
          : {
              text: document.abstract,
              sourceUrl: document.html_url,
              sourceDate: document.publication_date,
              reproductionBasis: REPRODUCTION_BASIS,
            },
      sourceExcerpt:
        document.disposition_notes === null
          ? null
          : {
              text: document.disposition_notes,
              sourceUrl: document.html_url,
              sourceDate: document.publication_date,
              reproductionBasis: REPRODUCTION_BASIS,
            },
      detailAsset: {
        availability: "official_link_only",
        path: null,
        reproductionBasis:
          "Metadata, reviewed Federal Register language, and official links only.",
      },
    },
    sponsors: [],
    committees: [],
    actionHistory: actions.map(({ value }) => value),
    statusHistory: [],
    sourceDocumentRelationships: relationships.map(({ value }) => value),
    officialSubjects: subjects.map(({ value }) => value),
    taxonomyMemberships: [],
    isUnclassified: true,
    relevance: [
      {
        basis: "general_jurisdiction",
        label: "General federal jurisdiction — not Nation-specific",
        sourceUrl: document.html_url,
        evidence:
          "No exact Nation association was established by this adapter.",
      },
    ],
    nationAssociations: [],
    landmark: {
      isLandmark: false,
    },
    historical: {
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    },
    dataQuality: {
      state: "validated",
      validatedAt: retrievedAt,
      validator: `${FEDERAL_REGISTER_ADAPTER_ID}@${FEDERAL_REGISTER_ADAPTER_VERSION}`,
      issues: [],
    },
    sourceHealth: {
      status: "healthy",
      checkedAt: retrievedAt,
      dataAsOf,
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
    aiSummary: {
      exists: false,
      label: "AI-generated source summary",
    },
    fieldProvenance: [],
  };
  record.fieldProvenance = provenanceEntries(
    specs,
    source,
    document,
    retrievedAt,
  );
  return record;
}

export function normalizeFederalRegisterDocument(
  document: FederalRegisterDocument,
  input: FederalRegisterNormalizationInput,
  correctionInventory: readonly FederalRegisterDocument[] = [document],
): PolicyRecord {
  if (!correctionInventory.includes(document)) {
    throw new Error(
      "Federal Register correction inventory does not contain the normalized document.",
    );
  }
  reconcileFederalRegisterCorrections(correctionInventory);
  return normalizeReconciledFederalRegisterDocument(document, input);
}

export function normalizeFederalRegisterInventory(
  documents: readonly FederalRegisterDocument[],
  input: FederalRegisterNormalizationInput,
): PolicyRecord[] {
  reconcileFederalRegisterCorrections(documents);
  const records = documents.map((document) =>
    normalizeReconciledFederalRegisterDocument(document, input),
  );
  const identities = new Set<string>();
  for (const record of records) {
    if (identities.has(record.source.recordId)) {
      throw new Error(
        "Federal Register normalization received a duplicate document number.",
      );
    }
    identities.add(record.source.recordId);
  }
  return records.sort(
    (left, right) =>
      compareCodeUnits(
        left.dates.published ?? "",
        right.dates.published ?? "",
      ) || compareCodeUnits(left.source.recordId, right.source.recordId),
  );
}
