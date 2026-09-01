import { Buffer } from "node:buffer";

import { sourceDerivedLeafPointers } from "../../pipeline/policy-validation.mjs";
import type {
  FieldProvenance,
  PolicyRecord,
  SourceConfig,
} from "../../shared/contracts";
import {
  SUPREME_COURT_DOCUMENT_FORM_LABEL,
  SUPREME_COURT_OPINIONS_ADAPTER_ID,
  SUPREME_COURT_OPINIONS_ADAPTER_VERSION,
  SUPREME_COURT_OPINIONS_IDENTITY_RULE,
  SUPREME_COURT_OPINIONS_SOURCE_ID,
  SUPREME_COURT_PUBLICATION_LABEL,
  SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS,
  SUPREME_COURT_SELECTED_OPINION,
  SUPREME_COURT_TERM_HEADING,
  SUPREME_COURT_TERM_URL,
} from "./constants";
import {
  assertSupremeCourtOpinionProjection,
  supremeCourtSourceRecordId,
  type SupremeCourtOpinionProjection,
} from "./response-contract";

const DECISION_DATE_RULE = "supreme-court-decision-date-v1";
const DOCUMENT_TYPE_RULE = "supreme-court-opinion-document-type-v1";
const DOCUMENT_FORM_RULE = "supreme-court-opinion-form-v1";
const STATUS_RULE = "supreme-court-decided-status-v1";
const PUBLICATION_RULE = "supreme-court-bound-volume-publication-v1";
const REVISION_REVIEW_RULE = "supreme-court-revision-review-v1";
const GENERAL_JURISDICTION_RULE = "supreme-court-general-jurisdiction-v1";
const LANDMARK_RULE = "supreme-court-documented-decision-landmark-v1";
const RECORD_POLICY_RULE = "supreme-court-curated-record-policy-v2";
const REPRODUCTION_BASIS =
  "Metadata from the selected Supreme Court term index and its exact Court-supplied bound-volume fragment only. The linked file is the complete U.S. Reports volume, not a retained or case-only asset.";
const LANDMARK_EVIDENCE_LABEL =
  "Washington State Dept. of Licensing v. Cougar Den, Inc.; docket 16-1498; decided 2019-03-19; 586 U.S. 347.";
const SELECTED_COVERAGE_NOTES =
  "One exact October Term 2018 row for Washington State Dept. of Licensing v. Cougar Den, Inc., docket 16-1498, decided 2019-03-19, and reported at 586 U.S. 347. This does not claim complete October Term 2018, Supreme Court, federal-court, or U.S. Reports coverage.";

type ProvenanceSpec = Pick<
  FieldProvenance,
  "sourcePath" | "transformation" | "transformRuleId"
>;

export interface SupremeCourtNormalizationInput {
  source: SourceConfig;
  retrievedAt: string;
  termHeading: string;
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
    throw new Error(
      "Supreme Court curated-opinion value is not JSON-serializable.",
    );
  }
  return result;
}

function assertIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(
      "Supreme Court curated-opinion retrieval time must be a normalized UTC timestamp.",
    );
  }
  return value;
}

const REVIEWED_SOURCE = {
  id: SUPREME_COURT_OPINIONS_SOURCE_ID,
  name: "Curated U.S. Supreme Court Opinions",
  provider: "Supreme Court of the United States",
  synthetic: false,
  enabled: true,
  adapter: {
    id: SUPREME_COURT_OPINIONS_ADAPTER_ID,
    version: SUPREME_COURT_OPINIONS_ADAPTER_VERSION,
    module: "src/adapters/supreme-court-opinions-curated/index.ts",
    identityRule: SUPREME_COURT_OPINIONS_IDENTITY_RULE,
  },
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
  },
  access: {
    method: "official_index",
    officialDocumentationUrl: SUPREME_COURT_TERM_URL,
    accessedOn: "2026-07-31",
    allowedHosts: ["www.supremecourt.gov"],
    authentication: "none",
    rateLimit:
      "The Court publishes no numeric request limit, API, retry rule, SLA, or checksum. Its robots.txt permits the opinion-index path and specifies Crawl-delay: 1. A first adapter is limited to one exact, no-retry term-index GET and must not fetch the linked full bound-volume PDF.",
    browserRuntimeAllowed: false,
  },
  coverage: {
    from: SUPREME_COURT_SELECTED_OPINION.decisionDate,
    through: SUPREME_COURT_SELECTED_OPINION.decisionDate,
    cadence:
      "One fixed, already-bound opinion-index row is checked weekly and build-time only; this is not a current slip-opinion feed.",
    limitations:
      "Adapter 1.1 implements only Washington State Dept. of Licensing v. Cougar Den, Inc., docket 16-1498, decided 2019-03-19, citation 586 U.S. 347, as an approved metadata-only documented-court-decision landmark and does not claim complete Supreme Court, landmark, or U.S. Reports coverage. The exact current row links to the entire bound Volume 586 rather than an individual case PDF. The adapter retains only allowlisted institutional-party metadata, landmark review metadata, and the exact bound-volume fragment; it does not retrieve or retain any Justice or author, syllabus, opinion text, counsel or personal name, facts, land detail, party inference, legal-effect claim, or Nation association. The source remains disabled pending source-specific G-J evidence validation.",
  },
  publication: {
    attribution: "Supreme Court of the United States",
    termsUrl:
      "https://www.supremecourt.gov/policies/web_policies_and_notices.aspx",
    reproduction: "metadata_and_links",
    failureMode: "last_known_good",
    requiredProvenancePointers: SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS,
  },
  officialSubjectMappings: [],
} as const;

export function assertSupremeCourtSourceConfig(
  source: SourceConfig,
): NonNullable<SourceConfig["adapter"]> {
  if (stableJson(source) !== stableJson(REVIEWED_SOURCE)) {
    throw new Error(
      "Supreme Court curated-opinion source configuration differs from the reviewed enabled runtime contract.",
    );
  }
  return source.adapter as NonNullable<SourceConfig["adapter"]>;
}

export function supremeCourtOpinionStableRecordId(
  row: Pick<SupremeCourtOpinionProjection, "docketNumber" | "reporterCitation">,
): string {
  return `psr:${SUPREME_COURT_OPINIONS_SOURCE_ID}:${Buffer.from(
    supremeCourtSourceRecordId(row),
    "utf8",
  ).toString("base64url")}`;
}

function rowSpecs(
  row: SupremeCourtOpinionProjection,
): Map<string, ProvenanceSpec> {
  const rowPath = `$opinionTables[${row.tableIndex}].rows[${row.dataRowIndex}]`;
  const policy = (
    sourcePath: string,
    transformRuleId: string,
  ): ProvenanceSpec => ({
    sourcePath,
    transformation: "deterministic_mapping",
    transformRuleId,
  });
  const copied = (sourcePath: string): ProvenanceSpec => ({
    sourcePath,
    transformation: "copied",
    transformRuleId: null,
  });
  const normalized = (
    sourcePath: string,
    transformRuleId: string,
  ): ProvenanceSpec => ({
    sourcePath,
    transformation: "normalized",
    transformRuleId,
  });
  return new Map<string, ProvenanceSpec>([
    ["/officialTitle", copied(`${rowPath}.cells[3].a[0].text`)],
    ["/sourceDocumentIdentifier", copied(`${rowPath}.cells[2].text`)],
    [
      "/documentType",
      policy("$adapterPolicy.documentType", DOCUMENT_TYPE_RULE),
    ],
    [
      "/jurisdiction/level",
      copied(
        "$sourceRegistry.sources[supreme-court-opinions-curated].jurisdiction.level",
      ),
    ],
    [
      "/jurisdiction/name",
      copied(
        "$sourceRegistry.sources[supreme-court-opinions-curated].jurisdiction.name",
      ),
    ],
    [
      "/jurisdiction/generalJurisdictionOnly",
      policy(
        "$adapterPolicy.generalJurisdictionOnly",
        GENERAL_JURISDICTION_RULE,
      ),
    ],
    [
      "/issuingBodies/0/officialName",
      copied(
        "$sourceRegistry.sources[supreme-court-opinions-curated].provider",
      ),
    ],
    [
      "/judicialContext/adjudicatingBody/kind",
      policy("$adapterPolicy.adjudicatingBody.kind", DOCUMENT_TYPE_RULE),
    ],
    [
      "/judicialContext/adjudicatingBody/officialName",
      copied(
        "$sourceRegistry.sources[supreme-court-opinions-curated].provider",
      ),
    ],
    ["/judicialContext/docketNumbers/0", copied(`${rowPath}.cells[2].text`)],
    [
      "/judicialContext/citations/0/kind",
      policy("$adapterPolicy.citation.kind", PUBLICATION_RULE),
    ],
    ["/judicialContext/citations/0/value", copied(`${rowPath}.cells[5].text`)],
    [
      "/judicialContext/citations/0/sourceUrl",
      normalized(`${rowPath}.cells[3].a[0].@href`, PUBLICATION_RULE),
    ],
    [
      "/judicialContext/decisionDate",
      normalized(`${rowPath}.cells[1].text`, DECISION_DATE_RULE),
    ],
    [
      "/judicialContext/documentForm/normalized",
      policy("$document.h3", DOCUMENT_FORM_RULE),
    ],
    [
      "/judicialContext/documentForm/sourceLabel",
      normalized("$document.h3", DOCUMENT_FORM_RULE),
    ],
    [
      "/judicialContext/publicationStatus/normalized",
      policy(`${rowPath}.cells[3].a[0].@href`, PUBLICATION_RULE),
    ],
    [
      "/judicialContext/publicationStatus/sourceLabel",
      policy(`${rowPath}.cells[3].a[0].@href`, PUBLICATION_RULE),
    ],
    [
      "/judicialContext/publicationStatus/asOf",
      policy("$retrieval.retrievedAt", PUBLICATION_RULE),
    ],
    [
      "/judicialContext/revisionReview/state",
      policy(`${rowPath}.cells[0].elements`, REVISION_REVIEW_RULE),
    ],
    [
      "/judicialContext/revisionReview/reviewedOn",
      policy("$retrieval.retrievedAt", REVISION_REVIEW_RULE),
    ],
    ["/status/normalized", policy("$document.h3", STATUS_RULE)],
    ["/status/sourceLabel", copied("$document.h3")],
    [
      "/status/asOf",
      normalized(`${rowPath}.cells[1].text`, DECISION_DATE_RULE),
    ],
    ["/urls/officialSource", copied("$request.url")],
    [
      "/isUnclassified",
      policy("$adapterPolicy.isUnclassified", RECORD_POLICY_RULE),
    ],
    [
      "/relevance/0/basis",
      policy("$adapterPolicy.relevance.basis", GENERAL_JURISDICTION_RULE),
    ],
    [
      "/relevance/0/label",
      policy("$adapterPolicy.relevance.label", GENERAL_JURISDICTION_RULE),
    ],
    ["/relevance/0/sourceUrl", copied("$request.url")],
    [
      "/relevance/0/evidence",
      policy("$adapterPolicy.relevance.evidence", GENERAL_JURISDICTION_RULE),
    ],
    [
      "/relevance/1/basis",
      policy("$landmarkReview.relevance.basis", LANDMARK_RULE),
    ],
    [
      "/relevance/1/label",
      policy("$landmarkReview.relevance.label", LANDMARK_RULE),
    ],
    ["/relevance/1/sourceUrl", copied("$request.url")],
    [
      "/relevance/1/evidence",
      policy("$landmarkReview.relevance.evidence", LANDMARK_RULE),
    ],
    ["/landmark/isLandmark", policy("$landmarkReview.approved", LANDMARK_RULE)],
    [
      "/landmark/criterionCodes/0",
      policy("$landmarkReview.criterionCodes[0]", LANDMARK_RULE),
    ],
    [
      "/landmark/reviewState",
      policy("$landmarkReview.reviewState", LANDMARK_RULE),
    ],
    [
      "/landmark/officialEvidence/0/sourceLabel",
      normalized(rowPath, LANDMARK_RULE),
    ],
    ["/landmark/officialEvidence/0/sourceUrl", copied("$request.url")],
    [
      "/landmark/officialEvidence/0/sourceDate",
      normalized(`${rowPath}.cells[1].text`, DECISION_DATE_RULE),
    ],
    [
      "/landmark/officialEvidence/0/reproductionBasis",
      policy(
        "$sourceRegistry.sources[supreme-court-opinions-curated].publication.reproduction",
        LANDMARK_RULE,
      ),
    ],
    [
      "/historical/isHistorical",
      policy("$adapterPolicy.historical", RECORD_POLICY_RULE),
    ],
    [
      "/historical/pre1980Treatment",
      policy("$adapterPolicy.historical", RECORD_POLICY_RULE),
    ],
  ]);
}

function provenanceEntries(
  record: PolicyRecord,
  row: SupremeCourtOpinionProjection,
  retrievedAt: string,
): FieldProvenance[] {
  const specs = rowSpecs(row);
  const pointers = sourceDerivedLeafPointers(record);
  if (
    pointers.length !== specs.size ||
    pointers.some((pointer) => !specs.has(pointer))
  ) {
    throw new Error(
      "Supreme Court curated-opinion provenance projection is incomplete.",
    );
  }
  return pointers
    .map((field) => {
      const spec = specs.get(field);
      if (spec === undefined) {
        throw new Error(
          "Supreme Court curated-opinion provenance specification is missing.",
        );
      }
      return {
        field,
        ...spec,
        sourceId: SUPREME_COURT_OPINIONS_SOURCE_ID,
        sourceRecordId: record.source.recordId,
        sourceUrl: SUPREME_COURT_TERM_URL,
        retrievedAt,
        sourceUpdatedAt: null,
        adapterId: SUPREME_COURT_OPINIONS_ADAPTER_ID,
        validationState: "validated",
      } satisfies FieldProvenance;
    })
    .sort((left, right) => compareCodeUnits(left.field, right.field));
}

function publicationSourceLabel(
  row: Pick<SupremeCourtOpinionProjection, "boundVolumeUrl">,
): typeof SUPREME_COURT_PUBLICATION_LABEL {
  if (row.boundVolumeUrl !== SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl) {
    throw new Error(
      "Supreme Court curated-opinion publication link differs from the reviewed bound volume.",
    );
  }
  return SUPREME_COURT_PUBLICATION_LABEL;
}

function revisionReviewState(
  row: Pick<SupremeCourtOpinionProjection, "revisionElementExposed">,
): "no_separate_relationship_exposed" {
  if (row.revisionElementExposed) {
    throw new Error(
      "Supreme Court curated-opinion sequence cell exposes an unreviewed revision element.",
    );
  }
  return "no_separate_relationship_exposed";
}

export function normalizeSupremeCourtOpinion(
  row: Readonly<SupremeCourtOpinionProjection>,
  input: SupremeCourtNormalizationInput,
): PolicyRecord {
  const adapter = assertSupremeCourtSourceConfig(input.source);
  const retrievedAt = assertIsoDateTime(input.retrievedAt);
  const validatedRow = assertSupremeCourtOpinionProjection(row);
  if (
    input.termHeading !== SUPREME_COURT_TERM_HEADING ||
    retrievedAt.slice(0, 10) < validatedRow.decisionDate ||
    validatedRow.tableIndex !== 1 ||
    validatedRow.dataRowIndex !== 41
  ) {
    throw new Error(
      "Supreme Court curated-opinion row differs from the reviewed normalization scope.",
    );
  }

  const record: PolicyRecord = {
    schemaVersion: "1.4.0",
    internalId: supremeCourtOpinionStableRecordId(validatedRow),
    source: {
      id: input.source.id,
      name: input.source.name,
      provider: input.source.provider,
      recordId: supremeCourtSourceRecordId(validatedRow),
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      coverage: {
        from: SUPREME_COURT_SELECTED_OPINION.decisionDate,
        through: SUPREME_COURT_SELECTED_OPINION.decisionDate,
        notes: SELECTED_COVERAGE_NOTES,
      },
      attribution: input.source.publication.attribution,
    },
    officialTitle: validatedRow.caseName,
    sourceDocumentIdentifier: validatedRow.docketNumber,
    documentType: "court_decision",
    jurisdiction: {
      ...input.source.jurisdiction,
      generalJurisdictionOnly: true,
    },
    issuingBodies: [
      {
        sourceId: null,
        officialName: "Supreme Court of the United States",
      },
    ],
    legislativeContext: null,
    judicialContext: {
      adjudicatingBody: {
        kind: "court",
        sourceId: null,
        officialName: "Supreme Court of the United States",
      },
      docketNumbers: [validatedRow.docketNumber],
      citations: [
        {
          kind: "reporter",
          value: validatedRow.reporterCitation,
          sourceUrl: validatedRow.boundVolumeUrl,
        },
      ],
      decisionDate: validatedRow.decisionDate,
      documentForm: {
        normalized: "opinion",
        sourceLabel: SUPREME_COURT_DOCUMENT_FORM_LABEL,
      },
      publicationStatus: {
        normalized: "bound_volume",
        sourceLabel: publicationSourceLabel(validatedRow),
        asOf: retrievedAt.slice(0, 10),
      },
      revisionReview: {
        state: revisionReviewState(validatedRow),
        reviewedOn: retrievedAt.slice(0, 10),
      },
    },
    accordContext: null,
    status: {
      normalized: "decided",
      sourceLabel: input.termHeading,
      asOf: validatedRow.decisionDate,
    },
    dates: {
      introduced: null,
      published: null,
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: retrievedAt,
    },
    urls: {
      officialSource: SUPREME_COURT_TERM_URL,
      officialFullText: null,
    },
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
        label: "General federal jurisdiction — not Nation-specific",
        sourceUrl: SUPREME_COURT_TERM_URL,
        evidence:
          "No separately validated exact named-Nation relationship evidence was established for this record; none was inferred from the caption, subject, parties, or official link.",
      },
      {
        basis: "landmark",
        label: "Verified documented court decision; not Nation-specific",
        sourceUrl: SUPREME_COURT_TERM_URL,
        evidence:
          "The official Court index supplies the exact title, docket, decision date, permanent reporter citation, and Court-supplied bound-volume link required by the approved documented-court-decision criterion.",
      },
    ],
    nationAssociations: [],
    landmark: {
      isLandmark: true,
      criterionCodes: ["documented-court-decision"],
      reviewState: "approved",
      officialEvidence: [
        {
          sourceLabel: LANDMARK_EVIDENCE_LABEL,
          sourceUrl: SUPREME_COURT_TERM_URL,
          sourceDate: validatedRow.decisionDate,
          reproductionBasis: REPRODUCTION_BASIS,
        },
      ],
    },
    historical: {
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    },
    dataQuality: {
      state: "validated",
      validatedAt: retrievedAt,
      validator: `${SUPREME_COURT_OPINIONS_ADAPTER_ID}@${SUPREME_COURT_OPINIONS_ADAPTER_VERSION}`,
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
    aiSummary: {
      exists: false,
      label: "AI-generated source summary",
    },
    fieldProvenance: [],
  };
  record.fieldProvenance = provenanceEntries(record, validatedRow, retrievedAt);
  return record;
}

export const SUPREME_COURT_NORMALIZATION_RULES = Object.freeze({
  decisionDate: DECISION_DATE_RULE,
  documentType: DOCUMENT_TYPE_RULE,
  documentForm: DOCUMENT_FORM_RULE,
  status: STATUS_RULE,
  publication: PUBLICATION_RULE,
  revisionReview: REVISION_REVIEW_RULE,
  generalJurisdiction: GENERAL_JURISDICTION_RULE,
  recordPolicy: RECORD_POLICY_RULE,
} as const);
