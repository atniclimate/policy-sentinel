import type {
  AccordContext,
  ArtifactBundle,
  ArtifactManifest,
  CoverageEntry,
  HistoryEvent,
  JudicialContext,
  LandmarkEvidence,
  Nation,
  NationAssociation,
  PublicRecord,
  Relevance,
  SourceDocumentRelationship,
  SourceHealthEntry,
  SourceText,
  Taxonomy,
  TaxonomyMembership,
} from "./types";

type JsonObject = Record<string, unknown>;

const DETAIL_ASSET_PATH = /^details\/[A-Za-z0-9_-]+\.json$/;
const FETCHABLE_DETAIL_ASSET_PATH = /^data\/details\/[A-Za-z0-9_-]+\.json$/;

const objectValue = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const stringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const nullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const booleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const nonnegativeInteger = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;

const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const isHttpsUrl = (value: string): boolean => {
  try {
    return value.startsWith("https://") && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const hasExactlyKeys = (value: JsonObject, keys: string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
};

const isSafeAccordUrl = (value: string): boolean => {
  if (!isHttpsUrl(value)) return false;
  const parsed = new URL(value);
  const authority = value.slice("https://".length).split(/[/?#]/, 1)[0];
  const hostAndPort = authority.split("@").at(-1) ?? "";
  const hasExplicitPort = hostAndPort.startsWith("[")
    ? hostAndPort.includes("]:")
    : hostAndPort.includes(":");
  return (
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.port === "" &&
    !hasExplicitPort
  );
};

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === "string") return item;
          const object = objectValue(item);
          return stringValue(
            object.officialName ??
              object.name ??
              object.label ??
              object.value ??
              object.sourceLabel,
          );
        })
        .filter(Boolean)
    : [];

const arrayPayload = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const object = objectValue(payload);
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[];
  }
  return [];
};

const assetUrl = (path: string): string => {
  const url = new URL(path, document.baseURI);
  if (url.origin !== window.location.origin) {
    throw new Error(`Refused a cross-origin artifact request for ${path}.`);
  }
  return url.toString();
};

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(assetUrl(path), {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const normalizeNation = (value: unknown): Nation | null => {
  const item = objectValue(value);
  const coverage = objectValue(item.coverage);
  const stateCoverage = objectValue(item.stateCoverage);
  const id = stringValue(item.id ?? item.internalId ?? item.nationId);
  const officialName = stringValue(
    item.officialName ?? item.official_name ?? item.name ?? item.label,
  );
  if (!id || !officialName) return null;

  const aliases = stringArray(
    item.authorizedAliases ?? item.authorized_aliases ?? item.aliases,
  );
  const coveredStateCodes = [
    ...stringArray(
      item.coveredStateCodes ??
        item.stateCodes ??
        item.states ??
        coverage.coveredStateCodes ??
        coverage.stateCodes ??
        coverage.states ??
        stateCoverage.states,
    ),
  ]
    .map((state) => state.toUpperCase())
    .filter((state) => ["WA", "OR", "ID"].includes(state));

  return {
    id,
    officialName,
    aliases: [...new Set(aliases.filter((alias) => alias !== officialName))],
    coveredStateCodes: [...new Set(coveredStateCodes)],
  };
};

const normalizeSourceText = (value: unknown): SourceText | null => {
  if (typeof value === "string" && value.length > 0) return { text: value };
  const item = objectValue(value);
  const text = stringValue(item.text ?? item.value);
  if (!text) return null;
  return {
    text,
    sourceUrl: nullableString(item.sourceUrl ?? item.url) ?? undefined,
    sourceDate: nullableString(item.sourceDate ?? item.date),
    reproductionBasis:
      nullableString(item.reproductionBasis ?? item.reuseBasis) ?? undefined,
  };
};

const normalizeLandmarkEvidence = (value: unknown): LandmarkEvidence | null => {
  const item = objectValue(value);
  const text = nullableString(item.text);
  const sourceLabel = nullableString(item.sourceLabel);
  const sourceUrl = stringValue(item.sourceUrl);
  const reproductionBasis = stringValue(item.reproductionBasis);
  const sourceDate =
    item.sourceDate === null ? null : stringValue(item.sourceDate);
  if (
    (text === null) === (sourceLabel === null) ||
    !isHttpsUrl(sourceUrl) ||
    !reproductionBasis ||
    (sourceDate !== null && !isRealDate(sourceDate))
  ) {
    return null;
  }
  return {
    ...(text === null ? {} : { text }),
    ...(sourceLabel === null ? {} : { sourceLabel }),
    sourceUrl,
    sourceDate,
    reproductionBasis,
  };
};

const normalizeHistory = (value: unknown): HistoryEvent[] => {
  const events: HistoryEvent[] = [];
  if (!Array.isArray(value)) return events;
  for (const event of value) {
    const item = objectValue(event);
    const sourceLabel = stringValue(
      item.sourceLabel ?? item.label ?? item.action,
    );
    if (!sourceLabel) continue;
    events.push({
      date: nullableString(item.date),
      sourceLabel,
      sourceUrl: nullableString(item.sourceUrl ?? item.url) ?? undefined,
    });
  }
  return events;
};

const normalizeSourceDocumentRelationships = (
  value: unknown,
): SourceDocumentRelationship[] => {
  const relationships: SourceDocumentRelationship[] = [];
  if (!Array.isArray(value)) return relationships;

  for (const relationship of value) {
    const item = objectValue(relationship);
    const relationshipType = stringValue(item.relationshipType);
    if (
      relationshipType !== "corrects" &&
      relationshipType !== "corrected_by" &&
      relationshipType !== "supersedes" &&
      relationshipType !== "superseded_by" &&
      relationshipType !== "substitutes" &&
      relationshipType !== "substituted_by" &&
      relationshipType !== "related_document"
    ) {
      continue;
    }
    const targetSourceRecordId = stringValue(item.targetSourceRecordId);
    const targetUrl = stringValue(item.targetUrl);
    const sourceLabel = stringValue(item.sourceLabel);
    if (!targetSourceRecordId || !targetUrl || !sourceLabel) continue;

    relationships.push({
      relationshipType,
      targetSourceRecordId,
      targetUrl,
      sourceLabel,
    });
  }
  return relationships;
};

const normalizeJudicialContext = (value: unknown): JudicialContext | null => {
  const item = objectValue(value);
  if (Object.keys(item).length === 0) return null;

  const body = objectValue(item.adjudicatingBody);
  const bodyKind = stringValue(body.kind);
  const bodyName = stringValue(body.officialName);
  const decisionDate = stringValue(item.decisionDate);
  const documentForm = objectValue(item.documentForm);
  const documentFormNormalized = stringValue(documentForm.normalized);
  const documentFormSourceLabel = stringValue(documentForm.sourceLabel);
  const publicationStatus = objectValue(item.publicationStatus);
  const publicationNormalized = stringValue(publicationStatus.normalized);
  const publicationSourceLabel = stringValue(publicationStatus.sourceLabel);
  const publicationAsOf = stringValue(publicationStatus.asOf);
  const revisionReview = objectValue(item.revisionReview);
  const revisionState = stringValue(revisionReview.state);
  const revisionReviewedOn = stringValue(revisionReview.reviewedOn);
  const bodySourceId = body.sourceId;

  if (bodySourceId !== null && typeof bodySourceId !== "string") {
    return null;
  }

  if (
    !Array.isArray(item.docketNumbers) ||
    item.docketNumbers.length === 0 ||
    item.docketNumbers.length > 10 ||
    !item.docketNumbers.every(
      (docket): docket is string =>
        typeof docket === "string" && docket.length > 0,
    ) ||
    new Set(item.docketNumbers).size !== item.docketNumbers.length
  ) {
    return null;
  }
  const docketNumbers = item.docketNumbers;

  if (
    !Array.isArray(item.citations) ||
    item.citations.length === 0 ||
    item.citations.length > 10
  ) {
    return null;
  }
  const citations: JudicialContext["citations"] = [];
  for (const citation of item.citations) {
    const candidate = objectValue(citation);
    const kind = stringValue(candidate.kind);
    const citationValue = stringValue(candidate.value);
    const sourceUrl = stringValue(candidate.sourceUrl);
    if (
      Object.keys(candidate).length === 0 ||
      !["reporter", "neutral", "official_other"].includes(kind) ||
      !citationValue ||
      !isHttpsUrl(sourceUrl)
    ) {
      return null;
    }
    citations.push({
      kind: kind as JudicialContext["citations"][number]["kind"],
      value: citationValue,
      sourceUrl,
    });
  }
  if (
    new Set(citations.map((citation) => JSON.stringify(citation))).size !==
    citations.length
  ) {
    return null;
  }

  if (
    !["court", "administrative_body"].includes(bodyKind) ||
    !bodyName ||
    docketNumbers.length === 0 ||
    citations.length === 0 ||
    !isRealDate(decisionDate) ||
    ![
      "opinion",
      "order",
      "judgment",
      "memorandum",
      "decision",
      "other",
    ].includes(documentFormNormalized) ||
    !documentFormSourceLabel ||
    ![
      "slip_opinion",
      "amended",
      "withdrawn",
      "preliminary_print",
      "bound_volume",
      "final",
      "published",
      "unpublished",
      "unknown",
    ].includes(publicationNormalized) ||
    !publicationSourceLabel ||
    !isRealDate(publicationAsOf) ||
    !["no_separate_relationship_exposed", "relationships_recorded"].includes(
      revisionState,
    ) ||
    !isRealDate(revisionReviewedOn)
  ) {
    return null;
  }

  return {
    adjudicatingBody: {
      kind: bodyKind as JudicialContext["adjudicatingBody"]["kind"],
      sourceId: bodySourceId,
      officialName: bodyName,
    },
    docketNumbers,
    citations,
    decisionDate,
    documentForm: {
      normalized:
        documentFormNormalized as JudicialContext["documentForm"]["normalized"],
      sourceLabel: documentFormSourceLabel,
    },
    publicationStatus: {
      normalized:
        publicationNormalized as JudicialContext["publicationStatus"]["normalized"],
      sourceLabel: publicationSourceLabel,
      asOf: publicationAsOf,
    },
    revisionReview: {
      state: revisionState as JudicialContext["revisionReview"]["state"],
      reviewedOn: revisionReviewedOn,
    },
  };
};

const normalizeAccordContext = (value: unknown): AccordContext | null => {
  const item = objectValue(value);
  if (
    !hasExactlyKeys(item, [
      "parties",
      "executionEvent",
      "statusReview",
      "supersessionReview",
      "instrumentIdentity",
    ]) ||
    !Array.isArray(item.parties) ||
    item.parties.length < 2 ||
    item.parties.length > 50
  ) {
    return null;
  }

  const parties: AccordContext["parties"] = [];
  for (const value of item.parties) {
    const party = objectValue(value);
    if (
      !hasExactlyKeys(party, [
        "sourceId",
        "partyKind",
        "officialName",
        "roles",
      ]) ||
      (party.sourceId !== null &&
        (typeof party.sourceId !== "string" || party.sourceId.length === 0)) ||
      !["government", "collective_governments"].includes(
        stringValue(party.partyKind),
      ) ||
      typeof party.officialName !== "string" ||
      party.officialName.trim().length === 0 ||
      !Array.isArray(party.roles) ||
      party.roles.length === 0 ||
      party.roles.length > 4
    ) {
      return null;
    }

    const roles: AccordContext["parties"][number]["roles"] = [];
    for (const value of party.roles) {
      const role = objectValue(value);
      const normalized = stringValue(role.normalized);
      const sourceLabel = stringValue(role.sourceLabel);
      const sourceUrl = stringValue(role.sourceUrl);
      if (
        !hasExactlyKeys(role, ["normalized", "sourceLabel", "sourceUrl"]) ||
        !["executing_party", "signatory_party"].includes(normalized) ||
        sourceLabel.trim().length === 0 ||
        !isSafeAccordUrl(sourceUrl)
      ) {
        return null;
      }
      roles.push({
        normalized:
          normalized as AccordContext["parties"][number]["roles"][number]["normalized"],
        sourceLabel,
        sourceUrl,
      });
    }
    if (
      new Set(roles.map(({ normalized }) => normalized)).size !== roles.length
    ) {
      return null;
    }
    parties.push({
      sourceId: party.sourceId as string | null,
      partyKind:
        party.partyKind as AccordContext["parties"][number]["partyKind"],
      officialName: party.officialName,
      roles,
    });
  }
  if (
    new Set(
      parties.map(({ sourceId, officialName }) =>
        JSON.stringify([sourceId, officialName]),
      ),
    ).size !== parties.length
  ) {
    return null;
  }

  const executionEvent = objectValue(item.executionEvent);
  const executionRole = stringValue(executionEvent.role);
  const executionDate = stringValue(executionEvent.date);
  const executionSourceLabel = stringValue(executionEvent.sourceLabel);
  const executionSourceUrl = stringValue(executionEvent.sourceUrl);
  if (
    !hasExactlyKeys(executionEvent, [
      "role",
      "date",
      "sourceLabel",
      "sourceUrl",
    ]) ||
    !["executed", "signed"].includes(executionRole) ||
    !isRealDate(executionDate) ||
    executionSourceLabel.trim().length === 0 ||
    !isSafeAccordUrl(executionSourceUrl)
  ) {
    return null;
  }

  const statusReview = objectValue(item.statusReview);
  const statusSourceLabel = stringValue(statusReview.sourceLabel);
  const statusSourceUrl = stringValue(statusReview.sourceUrl);
  const statusReviewedOn = stringValue(statusReview.reviewedOn);
  if (
    !hasExactlyKeys(statusReview, [
      "currentStatus",
      "evidenceKind",
      "sourceLabel",
      "sourceUrl",
      "reviewedOn",
    ]) ||
    statusReview.currentStatus !== "not_established" ||
    statusReview.evidenceKind !== "narrative_execution_language" ||
    statusSourceLabel.trim().length === 0 ||
    !isSafeAccordUrl(statusSourceUrl) ||
    !isRealDate(statusReviewedOn)
  ) {
    return null;
  }

  const supersessionReview = objectValue(item.supersessionReview);
  const supersessionState = stringValue(supersessionReview.state);
  const supersessionReviewedOn = stringValue(supersessionReview.reviewedOn);
  if (
    !hasExactlyKeys(supersessionReview, [
      "state",
      "scope",
      "reviewedOn",
      "sourceUrls",
    ]) ||
    !["no_relationship_established", "relationships_recorded"].includes(
      supersessionState,
    ) ||
    supersessionReview.scope !== "reviewed_official_sources_only" ||
    !isRealDate(supersessionReviewedOn) ||
    !Array.isArray(supersessionReview.sourceUrls) ||
    supersessionReview.sourceUrls.length === 0 ||
    supersessionReview.sourceUrls.length > 10 ||
    !supersessionReview.sourceUrls.every(
      (sourceUrl): sourceUrl is string =>
        typeof sourceUrl === "string" && isSafeAccordUrl(sourceUrl),
    ) ||
    new Set(supersessionReview.sourceUrls).size !==
      supersessionReview.sourceUrls.length
  ) {
    return null;
  }

  const instrumentIdentity = objectValue(item.instrumentIdentity);
  const identityKind = stringValue(instrumentIdentity.kind);
  if (
    !hasExactlyKeys(instrumentIdentity, [
      "kind",
      "sourceIdentifier",
      "fallbackRuleId",
    ]) ||
    !["source_provided", "project_fallback"].includes(identityKind) ||
    (identityKind === "source_provided" &&
      (typeof instrumentIdentity.sourceIdentifier !== "string" ||
        instrumentIdentity.sourceIdentifier.length === 0 ||
        instrumentIdentity.fallbackRuleId !== null)) ||
    (identityKind === "project_fallback" &&
      (instrumentIdentity.sourceIdentifier !== null ||
        typeof instrumentIdentity.fallbackRuleId !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(instrumentIdentity.fallbackRuleId)))
  ) {
    return null;
  }

  return {
    parties,
    executionEvent: {
      role: executionRole as AccordContext["executionEvent"]["role"],
      date: executionDate,
      sourceLabel: executionSourceLabel,
      sourceUrl: executionSourceUrl,
    },
    statusReview: {
      currentStatus: "not_established",
      evidenceKind: "narrative_execution_language",
      sourceLabel: statusSourceLabel,
      sourceUrl: statusSourceUrl,
      reviewedOn: statusReviewedOn,
    },
    supersessionReview: {
      state: supersessionState as AccordContext["supersessionReview"]["state"],
      scope: "reviewed_official_sources_only",
      reviewedOn: supersessionReviewedOn,
      sourceUrls: [...supersessionReview.sourceUrls],
    },
    instrumentIdentity:
      identityKind === "source_provided"
        ? {
            kind: "source_provided",
            sourceIdentifier: instrumentIdentity.sourceIdentifier as string,
            fallbackRuleId: null,
          }
        : {
            kind: "project_fallback",
            sourceIdentifier: null,
            fallbackRuleId: instrumentIdentity.fallbackRuleId as string,
          },
  };
};

const issuingBodiesRepresentAdjudicatingBody = (
  value: unknown,
  normalized: string[],
  context: JudicialContext,
): boolean => {
  const { officialName, sourceId } = context.adjudicatingBody;
  if (!normalized.includes(officialName) || !Array.isArray(value)) return false;

  if (value.every((entry) => typeof entry === "string")) {
    return value.includes(officialName);
  }

  if (
    !value.every(
      (entry) =>
        entry !== null && typeof entry === "object" && !Array.isArray(entry),
    )
  ) {
    return false;
  }

  return value.some((entry) => {
    const body = objectValue(entry);
    return body.officialName === officialName && body.sourceId === sourceId;
  });
};

const normalizeMemberships = (value: unknown): TaxonomyMembership[] =>
  Array.isArray(value)
    ? value
        .map((membership) => {
          const item = objectValue(membership);
          const categoryId = stringValue(item.categoryId ?? item.category);
          if (!categoryId) return null;
          return {
            categoryId,
            subcategoryId: nullableString(
              item.subcategoryId ?? item.subcategory,
            ),
            officialSubjectLabels: stringArray(item.officialSubjectLabels),
          };
        })
        .filter(
          (membership): membership is TaxonomyMembership => membership !== null,
        )
    : [];

const normalizeRelevance = (value: unknown): Relevance[] => {
  const entries: Relevance[] = [];
  if (!Array.isArray(value)) return entries;
  for (const entry of value) {
    const item = objectValue(entry);
    const basis = stringValue(item.basis);
    if (
      ![
        "explicit_nation_reference",
        "general_jurisdiction",
        "landmark",
        "source_defined",
      ].includes(basis)
    ) {
      continue;
    }
    entries.push({
      basis: basis as Relevance["basis"],
      label: stringValue(item.label, basis.replaceAll("_", " ")),
      sourceUrl: nullableString(item.sourceUrl) ?? undefined,
      evidence: nullableString(item.evidence) ?? undefined,
    });
  }
  return entries;
};

const normalizeAssociations = (value: unknown): NationAssociation[] => {
  const associations: NationAssociation[] = [];
  if (!Array.isArray(value)) return associations;
  for (const entry of value) {
    const item = objectValue(entry);
    const nationId = stringValue(item.nationId);
    const officialNationName = stringValue(item.officialNationName);
    const evidenceText = stringValue(item.evidenceText);
    const evidenceUrl = stringValue(item.evidenceUrl);
    if (!nationId || !officialNationName || !evidenceText || !evidenceUrl) {
      continue;
    }
    associations.push({
      nationId,
      officialNationName,
      basis: stringValue(item.basis),
      evidenceText,
      evidenceUrl,
      evidenceLocation: nullableString(item.evidenceLocation) ?? undefined,
      validationState: nullableString(item.validationState) ?? undefined,
    });
  }
  return associations;
};

export const normalizeRecord = (value: unknown): PublicRecord | null => {
  const item = objectValue(value);
  const source = objectValue(item.source);
  const sourceCoverage = objectValue(source.coverage);
  const jurisdiction = objectValue(item.jurisdiction);
  const status = objectValue(item.status);
  const dates = objectValue(item.dates);
  const urls = objectValue(item.urls);
  const texts = objectValue(item.texts);
  const detailAsset = objectValue(texts.detailAsset);
  const landmark = objectValue(item.landmark);
  const historical = objectValue(item.historical);
  const dataQuality = objectValue(item.dataQuality);
  const sourceHealth = objectValue(item.sourceHealth);
  const change = objectValue(item.change);
  const urgent = objectValue(change.urgentAlert);
  const ai = objectValue(item.aiSummary);
  const taxonomyMemberships = normalizeMemberships(item.taxonomyMemberships);
  const relevance = normalizeRelevance(item.relevance);
  const isLandmark = booleanValue(
    landmark.isLandmark ?? item.isLandmark,
    false,
  );
  const landmarkCriterionCodes = stringArray(landmark.criterionCodes);
  const landmarkReviewState = nullableString(landmark.reviewState);
  const rawLandmarkEvidence = Array.isArray(landmark.officialEvidence)
    ? landmark.officialEvidence
    : [];
  const landmarkEvidence = rawLandmarkEvidence
    .map(normalizeLandmarkEvidence)
    .filter((evidence): evidence is LandmarkEvidence => evidence !== null);
  const isDetailRecord = typeof item.schemaVersion === "string";

  const internalId = stringValue(item.internalId ?? item.stableId ?? item.id);
  const officialTitle = stringValue(
    item.officialTitle ?? item.title ?? item.official_title,
  );
  if (!internalId || !officialTitle) return null;
  if (isDetailRecord && item.schemaVersion !== "1.4.0") return null;
  if (
    isLandmark !== relevance.some(({ basis }) => basis === "landmark") ||
    (isDetailRecord &&
      isLandmark &&
      (landmarkReviewState !== "approved" ||
        landmarkCriterionCodes.length === 0 ||
        landmarkCriterionCodes.length !==
          new Set(landmarkCriterionCodes).size ||
        landmarkEvidence.length === 0 ||
        landmarkEvidence.length !== rawLandmarkEvidence.length ||
        !relevance
          .filter(({ basis }) => basis === "landmark")
          .some(({ sourceUrl }) =>
            landmarkEvidence.some(
              (evidence) => evidence.sourceUrl === sourceUrl,
            ),
          ))) ||
    (isDetailRecord &&
      !isLandmark &&
      (Object.hasOwn(landmark, "criterionCodes") ||
        Object.hasOwn(landmark, "reviewState") ||
        Object.hasOwn(landmark, "officialEvidence")))
  ) {
    return null;
  }

  const documentType = stringValue(
    item.documentType ?? item.type,
    "other_official_record",
  );
  const sourceDocumentIdentifier = stringValue(
    item.sourceDocumentIdentifier ??
      item.sourceId ??
      source.recordId ??
      internalId,
  );
  const criterionDocumentTypes = new Map([
    ["documented-court-decision", "court_decision"],
    ["treaty", "treaty"],
    ["statute", "statute"],
    ["public-state-federal-accord", "intergovernmental_accord"],
  ]);
  const allowedLandmarkCriteria = new Set([
    ...criterionDocumentTypes.keys(),
    "officially-identified-foundational",
  ]);
  if (
    isDetailRecord &&
    isLandmark &&
    landmarkCriterionCodes.some(
      (criterion) =>
        !allowedLandmarkCriteria.has(criterion) ||
        (criterionDocumentTypes.has(criterion) &&
          criterionDocumentTypes.get(criterion) !== documentType),
    )
  ) {
    return null;
  }
  const issuingBodies = stringArray(item.issuingBodies);
  const judicialContext = normalizeJudicialContext(item.judicialContext);
  const accordContext = normalizeAccordContext(item.accordContext);
  const isJudicial = ["court_decision", "administrative_decision"].includes(
    documentType,
  );
  if (!isJudicial && item.judicialContext !== null) return null;
  if (isJudicial) {
    if (!judicialContext) return null;
    const expectedKind =
      documentType === "court_decision" ? "court" : "administrative_body";
    if (
      judicialContext.adjudicatingBody.kind !== expectedKind ||
      !issuingBodiesRepresentAdjudicatingBody(
        item.issuingBodies,
        issuingBodies,
        judicialContext,
      )
    ) {
      return null;
    }
  }
  const isAccord = documentType === "intergovernmental_accord";
  const accordGenericDateFields = [
    "introduced",
    "published",
    "lastAction",
    "deadline",
    "effective",
  ] as const;
  const accordHasGenericDate = accordGenericDateFields.some((field) => {
    const legacyField = {
      introduced: "introducedDate",
      published: "publishedDate",
      lastAction: "lastActionDate",
      deadline: "deadlineDate",
      effective: "effectiveDate",
    }[field];
    const candidate = dates[field] ?? item[legacyField];
    return candidate !== undefined && candidate !== null;
  });
  if (
    !Object.hasOwn(item, "accordContext") ||
    (isAccord &&
      (!accordContext ||
        issuingBodies.length !== 0 ||
        item.judicialContext !== null ||
        (isDetailRecord && item.legislativeContext !== null) ||
        accordHasGenericDate ||
        status.normalized !== "unknown" ||
        status.sourceLabel !== null ||
        status.asOf !== null ||
        (accordContext.instrumentIdentity.kind === "source_provided" &&
          accordContext.instrumentIdentity.sourceIdentifier !==
            sourceDocumentIdentifier))) ||
    (!isAccord &&
      (item.accordContext !== null ||
        typeof status.sourceLabel !== "string" ||
        typeof status.asOf !== "string"))
  ) {
    return null;
  }

  const officialSummary = normalizeSourceText(
    texts.officialSummary ?? item.officialSummary,
  );
  const sourceExcerpt = normalizeSourceText(
    texts.sourceExcerpt ?? item.sourceExcerpt,
  );
  const officialLanguage = normalizeSourceText(
    texts.officialLanguage ?? item.officialLanguage,
  );
  const sourceDocumentRelationships = normalizeSourceDocumentRelationships(
    item.sourceDocumentRelationships,
  );
  const nationAssociations = normalizeAssociations(item.nationAssociations);
  const nationIds = [
    ...new Set([
      ...stringArray(item.nationIds),
      ...nationAssociations.map((association) => association.nationId),
    ]),
  ];
  if (accordContext) {
    const retrievedAt = nullableString(dates.retrieved ?? item.retrievedAt);
    if (
      accordContext.statusReview.reviewedOn <
        accordContext.executionEvent.date ||
      accordContext.supersessionReview.reviewedOn <
        accordContext.executionEvent.date ||
      (retrievedAt !== null &&
        (accordContext.executionEvent.date > retrievedAt.slice(0, 10) ||
          accordContext.statusReview.reviewedOn > retrievedAt.slice(0, 10) ||
          accordContext.supersessionReview.reviewedOn >
            retrievedAt.slice(0, 10))) ||
      (isDetailRecord && !retrievedAt)
    ) {
      return null;
    }
    if (isDetailRecord || Object.hasOwn(item, "sourceDocumentRelationships")) {
      const hasSupersessionRelationship = sourceDocumentRelationships.some(
        ({ relationshipType }) =>
          relationshipType === "supersedes" ||
          relationshipType === "superseded_by",
      );
      if (
        hasSupersessionRelationship !==
        (accordContext.supersessionReview.state === "relationships_recorded")
      ) {
        return null;
      }
    }
    if (
      isDetailRecord &&
      accordContext.instrumentIdentity.kind === "project_fallback"
    ) {
      const identifierProvenance = Array.isArray(item.fieldProvenance)
        ? item.fieldProvenance
            .map(objectValue)
            .find(({ field }) => field === "/sourceDocumentIdentifier")
        : undefined;
      if (
        !identifierProvenance ||
        identifierProvenance.transformation !== "deterministic_mapping" ||
        identifierProvenance.transformRuleId !==
          accordContext.instrumentIdentity.fallbackRuleId
      ) {
        return null;
      }
    }
    const nationParties = new Map(
      accordContext.parties
        .filter(({ sourceId }) => sourceId?.startsWith("nation:"))
        .map((party) => [party.sourceId as string, party]),
    );
    if (
      nationIds.length !== nationParties.size ||
      nationIds.some((nationId) => !nationParties.has(nationId)) ||
      (isDetailRecord &&
        (nationAssociations.length !== nationParties.size ||
          nationAssociations.some((association) => {
            const party = nationParties.get(association.nationId);
            return (
              !party ||
              association.validationState !== "validated" ||
              association.officialNationName !== party.officialName
            );
          })))
    ) {
      return null;
    }
  }

  const record: PublicRecord = {
    internalId,
    officialTitle,
    sourceDocumentIdentifier,
    documentType,
    source: {
      id: stringValue(source.id ?? item.sourceKey, "unknown-source"),
      name: stringValue(
        source.name ?? item.sourceName,
        "Official source not named",
      ),
      provider:
        nullableString(source.provider ?? item.sourceProvider) ?? undefined,
      attribution: nullableString(source.attribution) ?? undefined,
      coverageFrom: nullableString(sourceCoverage.from),
      coverageThrough: nullableString(sourceCoverage.through),
      coverageNotes: nullableString(sourceCoverage.notes) ?? undefined,
    },
    jurisdiction: {
      level: stringValue(
        jurisdiction.level ?? item.jurisdictionLevel,
        "unknown",
      ),
      name: stringValue(
        jurisdiction.name ?? item.jurisdictionName,
        "Jurisdiction not named",
      ),
      stateCode:
        nullableString(
          jurisdiction.stateCode ?? item.stateCode,
        )?.toUpperCase() ?? null,
      generalJurisdictionOnly: booleanValue(
        jurisdiction.generalJurisdictionOnly,
        false,
      ),
    },
    issuingBodies,
    judicialContext,
    accordContext,
    status: {
      normalized: stringValue(
        status.normalized ?? item.normalizedStatus,
        "unknown",
      ),
      sourceLabel: nullableString(status.sourceLabel ?? item.sourceStatus),
      asOf: nullableString(status.asOf ?? item.statusAsOf),
    },
    dates: {
      introduced: nullableString(dates.introduced ?? item.introducedDate),
      published: nullableString(dates.published ?? item.publishedDate),
      updated: nullableString(dates.updated ?? item.updatedDate),
      lastAction: nullableString(dates.lastAction ?? item.lastActionDate),
      deadline: nullableString(dates.deadline ?? item.deadlineDate),
      effective: nullableString(dates.effective ?? item.effectiveDate),
      retrieved: nullableString(dates.retrieved ?? item.retrievedAt),
    },
    urls: {
      officialSource: stringValue(
        urls.officialSource ?? item.officialSourceUrl,
      ),
      officialFullText: nullableString(
        urls.officialFullText ?? item.officialFullTextUrl,
      ),
    },
    texts: {
      officialSummary,
      sourceExcerpt,
      officialLanguage,
      detailPath: (() => {
        const path = nullableString(
          detailAsset.path ?? item.detailPath ?? item.detailAssetPath,
        );
        return path && DETAIL_ASSET_PATH.test(path) ? `data/${path}` : null;
      })(),
      detailAvailability: nullableString(detailAsset.availability),
      detailReproductionBasis: nullableString(
        detailAsset.reproductionBasis ?? detailAsset.reuseBasis,
      ),
    },
    sponsors: stringArray(item.sponsors),
    committees: stringArray(item.committees),
    actionHistory: normalizeHistory(item.actionHistory),
    statusHistory: normalizeHistory(item.statusHistory),
    sourceDocumentRelationships,
    officialSubjects: stringArray(item.officialSubjects),
    taxonomyMemberships,
    isUnclassified: booleanValue(item.isUnclassified, false),
    relevance,
    nationIds,
    nationAssociations,
    landmark: {
      isLandmark,
      criterionCodes: landmarkCriterionCodes,
      reviewState: landmarkReviewState === "approved" ? "approved" : undefined,
      officialEvidence: landmarkEvidence,
    },
    historical: {
      isHistorical: booleanValue(
        historical.isHistorical ?? item.isHistorical,
        false,
      ),
      pre1980Treatment:
        nullableString(historical.pre1980Treatment) ?? undefined,
    },
    dataQuality: {
      state: stringValue(dataQuality.state, "unknown"),
      validatedAt: nullableString(dataQuality.validatedAt) ?? undefined,
      issues: stringArray(dataQuality.issues),
    },
    sourceHealth: {
      status: stringValue(sourceHealth.status, "unknown"),
      dataAsOf: nullableString(sourceHealth.dataAsOf),
      lastSuccessfulRetrievalAt: nullableString(
        sourceHealth.lastSuccessfulRetrievalAt,
      ),
      usingLastKnownGood: booleanValue(sourceHealth.usingLastKnownGood, false),
      message: nullableString(sourceHealth.message),
    },
    change: {
      kind: stringValue(change.kind, "unchanged"),
      firstSeenAt: nullableString(change.firstSeenAt) ?? undefined,
      lastSeenAt: nullableString(change.lastSeenAt) ?? undefined,
      urgentAlert:
        Object.keys(urgent).length > 0
          ? {
              basis: stringValue(urgent.basis, "source_status"),
              label: stringValue(urgent.label, "Source alert"),
              date: nullableString(urgent.date),
            }
          : null,
    },
    aiSummary: booleanValue(ai.exists, false)
      ? {
          exists: true,
          label: stringValue(ai.label, "AI-generated source summary"),
          text: stringValue(ai.text),
          generatedAt: nullableString(ai.generatedAt) ?? undefined,
          model: nullableString(ai.model) ?? undefined,
          buildId: nullableString(ai.buildId) ?? undefined,
          validationState: nullableString(ai.validationState) ?? undefined,
          citedInputs: Array.isArray(ai.citedInputs)
            ? ai.citedInputs.map((input) => {
                const citation = objectValue(input);
                return {
                  field: nullableString(citation.field) ?? undefined,
                  sourceUrl: nullableString(citation.sourceUrl) ?? undefined,
                  sourceDate: nullableString(citation.sourceDate),
                };
              })
            : [],
        }
      : {
          exists: false,
          label: stringValue(ai.label, "AI-generated source summary"),
        },
    fieldProvenance: Array.isArray(item.fieldProvenance)
      ? item.fieldProvenance.map((entry) => {
          const provenance = objectValue(entry);
          return {
            field: stringValue(provenance.field),
            sourceUrl: nullableString(provenance.sourceUrl) ?? undefined,
            retrievedAt: nullableString(provenance.retrievedAt) ?? undefined,
            sourceUpdatedAt: nullableString(provenance.sourceUpdatedAt),
            validationState:
              nullableString(provenance.validationState) ?? undefined,
          };
        })
      : [],
    searchText: "",
  };

  record.searchText = [
    stringValue(item.searchText ?? item.officialSearchText),
    record.officialTitle,
    record.source.name,
    record.source.provider,
    record.judicialContext?.adjudicatingBody.officialName,
    record.judicialContext?.docketNumbers.join(" "),
    record.judicialContext?.citations.map(({ value }) => value).join(" "),
    record.judicialContext?.documentForm.sourceLabel,
    record.judicialContext?.publicationStatus.sourceLabel,
    record.accordContext?.parties
      .map(({ officialName, roles }) =>
        [officialName, ...roles.map(({ sourceLabel }) => sourceLabel)].join(
          " ",
        ),
      )
      .join(" "),
    record.accordContext?.executionEvent.sourceLabel,
    record.accordContext?.statusReview.sourceLabel,
    record.texts.officialSummary?.text,
    record.texts.sourceExcerpt?.text,
    record.texts.officialLanguage?.text,
    record.landmark.officialEvidence
      .map((evidence) => evidence.text ?? evidence.sourceLabel)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  return record;
};

const normalizeManifest = (payload: unknown): ArtifactManifest => {
  const item = objectValue(payload);
  const statistics = objectValue(item.statistics);
  const artifactVersion = stringValue(item.artifactVersion);
  if (artifactVersion !== "1.4.0") {
    throw new Error(
      `This application requires artifact package 1.4.0; received ${
        artifactVersion || "an unversioned package"
      }.`,
    );
  }
  const recordSchemaVersion = stringValue(item.recordSchemaVersion);
  if (recordSchemaVersion !== "1.4.0") {
    throw new Error(
      `This application requires record schema 1.4.0; received ${
        recordSchemaVersion || "an unversioned record schema"
      }.`,
    );
  }
  const generatedAt = nullableString(item.generatedAt ?? item.builtAt);
  if (!generatedAt) {
    throw new Error("Artifact package 1.4.0 is missing its build timestamp.");
  }
  return {
    artifactVersion,
    recordSchemaVersion,
    buildId: stringValue(item.buildId ?? item.version, "unknown-build"),
    generatedAt,
    dataAsOf: nullableString(item.dataAsOf ?? item.data_as_of),
    recordCount:
      typeof item.recordCount === "number"
        ? item.recordCount
        : typeof statistics.recordCount === "number"
          ? statistics.recordCount
          : null,
    synthetic: booleanValue(
      item.synthetic ?? item.syntheticData ?? item.fixtureOnly,
      false,
    ),
  };
};

const normalizeTaxonomy = (payload: unknown): Taxonomy => {
  const item = objectValue(payload);
  return {
    version: stringValue(item.taxonomyVersion ?? item.version, "unknown"),
    categories: arrayPayload(payload, ["categories"])
      .map((category) => {
        const entry = objectValue(category);
        const id = stringValue(entry.id);
        const label = stringValue(entry.label ?? entry.name);
        if (!id || !label) return null;
        return {
          id,
          label,
          subcategories: arrayPayload(entry.subcategories, ["items"])
            .map((subcategory) => {
              const child = objectValue(subcategory);
              const childId = stringValue(child.id);
              const childLabel = stringValue(child.label ?? child.name);
              if (!childId || !childLabel) return null;
              return {
                id: childId,
                label: childLabel,
                description: stringValue(child.description),
              };
            })
            .filter(
              (
                child,
              ): child is {
                id: string;
                label: string;
                description: string;
              } => child !== null,
            ),
        };
      })
      .filter(
        (
          category,
        ): category is {
          id: string;
          label: string;
          subcategories: Array<{
            id: string;
            label: string;
            description: string;
          }>;
        } => category !== null,
      ),
  };
};

const normalizeCoverage = (payload: unknown): CoverageEntry[] =>
  arrayPayload(payload, ["entries", "sources", "coverage", "items"]).map(
    (entry) => {
      const item = objectValue(entry);
      const dateRange = objectValue(item.dateRange ?? item.historicalRange);
      const jurisdiction = objectValue(item.jurisdiction);
      const sourceId = stringValue(item.sourceId ?? item.id, "unknown-source");
      return {
        sourceId,
        sourceName: stringValue(
          item.sourceName ?? item.name,
          humanizeSourceId(sourceId),
        ),
        provider: stringValue(item.provider, "Issuing authority not provided"),
        jurisdictions: stringArray(
          item.jurisdictions ?? item.coveredJurisdictions,
        ).concat(
          stringValue(jurisdiction.name)
            ? [stringValue(jurisdiction.name)]
            : [],
        ),
        from: nullableString(item.from ?? item.dateFrom),
        through: nullableString(item.through ?? item.dateThrough),
        documentedFrom: nullableString(item.documentedFrom ?? dateRange.from),
        documentedThrough: nullableString(
          item.documentedThrough ?? dateRange.through,
        ),
        recordFrom: nullableString(item.recordFrom),
        recordThrough: nullableString(item.recordThrough),
        recordCount: nonnegativeInteger(item.recordCount),
        cadence: stringValue(item.cadence, "Cadence not provided"),
        recordTypes: stringArray(item.recordTypes),
        status: stringValue(item.status, "range-limited"),
        limitation: stringValue(
          item.limitation ?? item.limitations ?? item.notes,
        ),
      };
    },
  );

const humanizeSourceId = (value: string): string =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeHealth = (payload: unknown): SourceHealthEntry[] =>
  arrayPayload(payload, ["sources", "health", "items"]).map((entry) => {
    const item = objectValue(entry);
    return {
      sourceId: stringValue(item.sourceId ?? item.id, "unknown-source"),
      sourceName: stringValue(
        item.sourceName ?? item.name,
        humanizeSourceId(
          stringValue(item.sourceId ?? item.id, "unknown-source"),
        ),
      ),
      status: stringValue(item.status, "unknown"),
      dataAsOf: nullableString(item.dataAsOf),
      lastSuccessfulRetrievalAt: nullableString(
        item.lastSuccessfulRetrievalAt ?? item.lastSuccess,
      ),
      usingLastKnownGood: booleanValue(item.usingLastKnownGood, false),
      message: nullableString(item.message),
    };
  });

export const loadArtifacts = async (): Promise<ArtifactBundle> => {
  const paths = [
    "data/manifest.json",
    "data/coverage.json",
    "data/source-health.json",
    "data/nations.json",
    "data/taxonomy.json",
    "data/index/records.json",
  ] as const;

  const results = await Promise.allSettled(paths.map(fetchJson));
  const values = new Map<string, unknown>();
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const path = paths[index];
    if (result.status === "fulfilled") {
      values.set(path, result.value);
    } else {
      warnings.push(
        `Could not load ${path}: ${
          result.reason instanceof Error
            ? result.reason.message
            : "unknown error"
        }`,
      );
    }
  });

  for (const required of paths) {
    if (!values.has(required)) {
      const failure = warnings.find((warning) => warning.includes(required));
      throw new Error(
        `The required same-origin artifact ${required} is unavailable.${
          failure ? ` ${failure}` : ""
        }`,
      );
    }
  }

  const manifest = normalizeManifest(values.get("data/manifest.json"));
  const nations = arrayPayload(values.get("data/nations.json"), [
    "nations",
    "items",
  ])
    .map(normalizeNation)
    .filter((nation): nation is Nation => nation !== null)
    .sort((a, b) => a.officialName.localeCompare(b.officialName));
  const taxonomy = normalizeTaxonomy(values.get("data/taxonomy.json"));
  const recordEntries = arrayPayload(values.get("data/index/records.json"), [
    "records",
    "items",
  ]);
  const records = recordEntries.map((entry, index) => {
    const record = normalizeRecord(entry);
    if (!record) {
      throw new Error(
        `The public index artifact contains an invalid record at position ${index}.`,
      );
    }
    return record;
  });
  for (const record of records) {
    record.artifactGeneratedAt = manifest.generatedAt;
  }

  for (const record of records) {
    for (const membership of record.taxonomyMemberships) {
      const category = taxonomy.categories.find(
        (candidate) => candidate.id === membership.categoryId,
      );
      if (!category) {
        throw new Error(
          `The public index and taxonomy artifacts are inconsistent: record ${record.internalId} uses unknown category ${membership.categoryId}.`,
        );
      }
      if (
        membership.subcategoryId !== null &&
        !category.subcategories.some(
          (subcategory) => subcategory.id === membership.subcategoryId,
        )
      ) {
        throw new Error(
          `The public index and taxonomy artifacts are inconsistent: record ${record.internalId} uses unknown category/subcategory pair ${membership.categoryId}/${membership.subcategoryId}.`,
        );
      }
    }

    const expectedUnclassified = record.taxonomyMemberships.length === 0;
    if (record.isUnclassified !== expectedUnclassified) {
      throw new Error(
        `The public index artifact is inconsistent: record ${record.internalId} must set isUnclassified to ${expectedUnclassified}.`,
      );
    }
  }

  if (nations.length === 0) {
    throw new Error("The Nation artifact contains no usable entries.");
  }
  if (taxonomy.categories.length === 0) {
    throw new Error("The taxonomy artifact contains no usable categories.");
  }

  const coverage = normalizeCoverage(values.get("data/coverage.json"));
  const sourceHealth = normalizeHealth(values.get("data/source-health.json"));
  const sourceHealthById = new Map<string, SourceHealthEntry>();
  for (const health of sourceHealth) {
    if (sourceHealthById.has(health.sourceId)) {
      throw new Error(
        `The source health artifact contains duplicate entries for ${health.sourceId}.`,
      );
    }
    sourceHealthById.set(health.sourceId, health);
  }
  for (const record of records) {
    const health = sourceHealthById.get(record.source.id);
    if (!health) {
      throw new Error(
        `The public index and source health artifacts are inconsistent: source ${record.source.id} has no health entry.`,
      );
    }
    record.sourceHealth = {
      status: health.status,
      dataAsOf: health.dataAsOf,
      lastSuccessfulRetrievalAt: health.lastSuccessfulRetrievalAt,
      usingLastKnownGood: health.usingLastKnownGood,
      message: health.message,
    };
  }

  return {
    manifest,
    nations,
    taxonomy,
    records,
    coverage,
    sourceHealth,
    warnings,
  };
};

export const loadRecordDetail = async (
  record: PublicRecord,
): Promise<PublicRecord> => {
  if (!record.texts.detailPath) {
    throw new Error("The compact index does not provide a detail asset path.");
  }
  if (!FETCHABLE_DETAIL_ASSET_PATH.test(record.texts.detailPath)) {
    throw new Error("The compact index provides an invalid detail asset path.");
  }
  const payload = await fetchJson(record.texts.detailPath);
  const root = objectValue(payload);
  const detailGeneratedAt = nullableString(root.generatedAt);
  if (
    !record.artifactGeneratedAt ||
    detailGeneratedAt !== record.artifactGeneratedAt
  ) {
    throw new Error(
      "The detail asset build timestamp does not match the loaded artifact.",
    );
  }
  const normalized = normalizeRecord(root.record ?? payload);
  if (!normalized) {
    throw new Error("The detail asset did not contain a usable record.");
  }
  if (normalized.internalId !== record.internalId) {
    throw new Error("The detail asset ID does not match the requested record.");
  }
  if (normalized.source.id !== record.source.id) {
    throw new Error("The detail asset source does not match the index record.");
  }
  if (normalized.sourceDocumentIdentifier !== record.sourceDocumentIdentifier) {
    throw new Error(
      "The detail asset source document identifier does not match the index record.",
    );
  }
  if (normalized.officialTitle !== record.officialTitle) {
    throw new Error("The detail asset title does not match the index record.");
  }
  if (normalized.urls.officialSource !== record.urls.officialSource) {
    throw new Error(
      "The detail asset official source URL does not match the index record.",
    );
  }
  if (
    JSON.stringify(compactIntegrityProjection(normalized)) !==
    JSON.stringify(compactIntegrityProjection(record))
  ) {
    throw new Error(
      "The detail asset compact fields do not match the index record.",
    );
  }
  if (
    JSON.stringify(recordHealthIntegrityProjection(normalized)) !==
    JSON.stringify(recordHealthIntegrityProjection(record))
  ) {
    throw new Error(
      "The detail asset source health does not match the loaded artifact.",
    );
  }
  normalized.artifactGeneratedAt = record.artifactGeneratedAt;
  normalized.texts.detailPath = record.texts.detailPath;
  normalized.sourceHealth = { ...record.sourceHealth };
  return normalized;
};

const compactIntegrityProjection = (record: PublicRecord) => ({
  internalId: record.internalId,
  sourceDocumentIdentifier: record.sourceDocumentIdentifier,
  officialTitle: record.officialTitle,
  documentType: record.documentType,
  jurisdiction: record.jurisdiction,
  issuingBodies: record.issuingBodies,
  judicialContext: record.judicialContext,
  accordContext: record.accordContext,
  status: record.status,
  source: {
    id: record.source.id,
    name: record.source.name,
    provider: record.source.provider,
  },
  dates: {
    published: record.dates.published,
    updated: record.dates.updated,
    lastAction: record.dates.lastAction,
    deadline: record.dates.deadline,
  },
  urls: {
    officialSource: record.urls.officialSource,
  },
  taxonomyMemberships: record.taxonomyMemberships
    .map(({ categoryId, subcategoryId }) => ({ categoryId, subcategoryId }))
    .sort(
      (left, right) =>
        left.categoryId.localeCompare(right.categoryId) ||
        (left.subcategoryId ?? "").localeCompare(right.subcategoryId ?? ""),
    ),
  isUnclassified: record.isUnclassified,
  nationIds: [...record.nationIds].sort(),
  relevance: record.relevance,
  landmark: {
    isLandmark: record.landmark.isLandmark,
  },
  change: record.change,
});

const recordHealthIntegrityProjection = (record: PublicRecord) => ({
  status: record.sourceHealth.status,
  usingLastKnownGood: record.sourceHealth.usingLastKnownGood,
  message: record.sourceHealth.message,
});
