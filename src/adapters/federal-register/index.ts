import sourceRegistry from "../../../config/sources.v1.json";
import taxonomy from "../../../config/taxonomy.v1.json";

import type {
  AdapterContractHealth,
  BuildContext,
  FetchResult,
  PublicSourceAdapter,
  SourceReference,
  SourceRefreshFailure,
  SourceRefreshResult,
} from "../../pipeline/source-adapter";
import { validateRecordSetPolicy } from "../../pipeline/policy-validation.mjs";
import type {
  PolicyRecord,
  SourceHealth,
  SourceRegistry,
  TaxonomyConfig,
} from "../../shared/contracts";
import { FEDERAL_REGISTER_ORIGIN, FEDERAL_REGISTER_PATHS } from "./constants";
import {
  FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY,
  federalRegisterPublicArtifactRange,
} from "./artifact-policy";
import type { FederalRegisterDateRange } from "./query-contract";
import {
  FEDERAL_REGISTER_ADAPTER_ID,
  FEDERAL_REGISTER_ADAPTER_VERSION,
  FEDERAL_REGISTER_SOURCE_ID,
  assertFederalRegisterSourceConfig,
  normalizeFederalRegisterInventory,
} from "./normalize";
import {
  retrieveFederalRegisterInventory,
  type FederalRegisterInventory,
  type FederalRegisterRetrievalDependencies,
} from "./retrieval";
import {
  assertFederalRegisterOpenApiProjection,
  parseFederalRegisterCorrectionDocumentNumber,
  parseFederalRegisterDocument,
  type FederalRegisterDocument,
} from "./response-contract";
import { fetchFederalRegisterJson } from "./transport";

export {
  FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY,
  assertFederalRegisterPublicArtifactRange,
  federalRegisterArtifactCoverageNotes,
  federalRegisterPublicArtifactRange,
} from "./artifact-policy";
export {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
  FEDERAL_REGISTER_RESPONSE_POLICY,
} from "./constants";
export {
  FEDERAL_REGISTER_ADAPTER_ID,
  FEDERAL_REGISTER_ADAPTER_VERSION,
  FEDERAL_REGISTER_IDENTITY_RULE,
  FEDERAL_REGISTER_SOURCE_ID,
  federalRegisterStableRecordId,
  normalizeFederalRegisterDocument,
  normalizeFederalRegisterInventory,
} from "./normalize";
export {
  assertFederalRegisterDateRange,
  buildFederalRegisterSearchUrl,
  shouldSplitFederalRegisterDateRange,
  splitFederalRegisterDateRange,
  validateFederalRegisterNextPageUrl,
} from "./query-contract";
export {
  FederalRegisterRetrievalError,
  retrieveFederalRegisterInventory,
  selectFederalRegisterIssueAuditDates,
} from "./retrieval";
export {
  FederalRegisterContractError,
  assertFederalRegisterOpenApiProjection,
  parseFederalRegisterCorrectionDocumentNumber,
  parseFederalRegisterDailyFacet,
  parseFederalRegisterDocument,
  parseFederalRegisterDocumentBatch,
  parseFederalRegisterFacet,
  parseFederalRegisterIssueInventory,
  parseFederalRegisterSearchPage,
  reconcileFederalRegisterCorrections,
} from "./response-contract";
export {
  FederalRegisterTransportError,
  fetchFederalRegisterJson,
} from "./transport";

export type { FederalRegisterNormalizationInput } from "./normalize";
export type {
  FederalRegisterDateRange,
  FederalRegisterNextPage,
  FederalRegisterNextPageContext,
} from "./query-contract";
export type {
  FederalRegisterInventory,
  FederalRegisterIssueEvidence,
  FederalRegisterRetrievalDependencies,
  FederalRegisterRetrievalErrorCode,
} from "./retrieval";
export type {
  FederalRegisterAgency,
  FederalRegisterCfrReference,
  FederalRegisterCfrTopic,
  FederalRegisterContractErrorCode,
  FederalRegisterDailyFacet,
  FederalRegisterDailyFacetEntry,
  FederalRegisterDateBounds,
  FederalRegisterDocument,
  FederalRegisterDocumentBatch,
  FederalRegisterDocumentType,
  FederalRegisterIssueInventory,
  FederalRegisterRelatedDocument,
  FederalRegisterRelatedDocuments,
  FederalRegisterSearchPage,
  FederalRegisterSearchPageContext,
} from "./response-contract";
export type {
  FederalRegisterFetchLike,
  FederalRegisterResponseKind,
  FederalRegisterTransportDependencies,
  FederalRegisterTransportErrorCode,
} from "./transport";

interface ActiveInventory {
  buildId: string;
  contextFingerprint: string;
  retrievedAt: string;
  coverageRange: FederalRegisterDateRange;
  correctionBoundaryExcludedCount: number;
  documents: readonly FederalRegisterDocument[];
  byDocumentNumber: ReadonlyMap<string, FederalRegisterDocument>;
  ready: boolean;
  issuedFetches: WeakSet<FetchResult>;
  normalizedDocumentNumbers: Set<string>;
  normalizedByDocumentNumber: ReadonlyMap<string, PolicyRecord> | null;
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
    throw new Error("Federal Register state is not JSON-serializable.");
  }
  return serialized;
}

function assertAdapterContext(context: BuildContext): string {
  assertFederalRegisterSourceConfig(context.source);
  if (
    typeof context.buildId !== "string" ||
    context.buildId.trim() === "" ||
    context.previousCursor !== null
  ) {
    throw new Error(
      "Federal Register build requires a nonblank build ID and no persisted provider cursor.",
    );
  }
  const generatedAt = new Date(context.generatedAt);
  if (
    Number.isNaN(generatedAt.getTime()) ||
    generatedAt.toISOString() !== context.generatedAt
  ) {
    throw new Error(
      "Federal Register build time must be a normalized UTC timestamp.",
    );
  }
  return stableJson(context);
}

const PUBLIC_DOCUMENT_TYPES: ReadonlySet<FederalRegisterDocument["type"]> =
  new Set(["Rule", "Proposed Rule", "Notice", "Presidential Document"]);

function publicCandidateDocuments(
  documents: readonly FederalRegisterDocument[],
  range: FederalRegisterDateRange,
): {
  documents: FederalRegisterDocument[];
  correctionBoundaryExcludedCount: number;
} {
  const allDocuments = new Map(
    documents.map((document) => [document.document_number, document]),
  );
  const candidates = new Map(
    documents
      .filter(
        (document) =>
          document.publication_date >= range.start &&
          document.publication_date <= range.end &&
          PUBLIC_DOCUMENT_TYPES.has(document.type) &&
          (document.agencies.length > 0 || document.agency_names.length > 0),
      )
      .map((document) => [document.document_number, document]),
  );

  const dependents = new Map<string, Set<string>>();
  const removalSeeds = new Set<string>();
  const boundarySeeds = new Set<string>();
  for (const [documentNumber, document] of candidates) {
    const correctionTargets = [
      ...(document.correction_of === null
        ? []
        : [
            parseFederalRegisterCorrectionDocumentNumber(
              document.correction_of,
            ),
          ]),
      ...document.corrections.map((url) =>
        parseFederalRegisterCorrectionDocumentNumber(url),
      ),
    ];
    for (const target of correctionTargets) {
      const targetDependents = dependents.get(target) ?? new Set<string>();
      targetDependents.add(documentNumber);
      dependents.set(target, targetDependents);
      if (!candidates.has(target)) {
        removalSeeds.add(documentNumber);
        const targetDocument = allDocuments.get(target);
        if (
          targetDocument !== undefined &&
          (targetDocument.publication_date < range.start ||
            targetDocument.publication_date > range.end)
        ) {
          boundarySeeds.add(documentNumber);
        }
      }
    }
  }

  const dependentClosure = (seeds: ReadonlySet<string>): Set<string> => {
    const closure = new Set(seeds);
    const queue = [...seeds];
    for (let index = 0; index < queue.length; index += 1) {
      const removed = queue[index] as string;
      for (const dependent of dependents.get(removed) ?? []) {
        if (!closure.has(dependent)) {
          closure.add(dependent);
          queue.push(dependent);
        }
      }
    }
    return closure;
  };
  const removals = dependentClosure(removalSeeds);
  const boundaryRemovals = dependentClosure(boundarySeeds);
  for (const removed of removals) {
    candidates.delete(removed);
  }

  return {
    documents: documents.filter(({ document_number }) =>
      candidates.has(document_number),
    ),
    correctionBoundaryExcludedCount: [...boundaryRemovals].filter((id) =>
      removals.has(id),
    ).length,
  };
}

function fixedFailure(
  context: BuildContext,
  failureStage: SourceRefreshFailure["failureStage"],
  publicMessage: string,
): SourceRefreshFailure {
  return {
    ok: false,
    sourceId: FEDERAL_REGISTER_SOURCE_ID,
    checkedAt: context.generatedAt,
    failureStage,
    publicMessage,
  };
}

function validationSourceRegistry(context: BuildContext): SourceRegistry {
  const canonical = sourceRegistry as unknown as SourceRegistry;
  return {
    ...canonical,
    sources: canonical.sources.map((source) =>
      source.id === FEDERAL_REGISTER_SOURCE_ID ? context.source : source,
    ),
  };
}

export class FederalRegisterAdapter implements PublicSourceAdapter {
  readonly sourceId = FEDERAL_REGISTER_SOURCE_ID;
  readonly adapterId = FEDERAL_REGISTER_ADAPTER_ID;
  readonly adapterVersion = FEDERAL_REGISTER_ADAPTER_VERSION;

  readonly #dependencies: FederalRegisterRetrievalDependencies;
  #contractContextFingerprint: string | null = null;
  #activeInventory: ActiveInventory | null = null;

  constructor(dependencies: FederalRegisterRetrievalDependencies = {}) {
    this.#dependencies = dependencies;
  }

  #invalidateState(): void {
    this.#contractContextFingerprint = null;
    this.#activeInventory = null;
  }

  #readyInventory(context: BuildContext, stage: "fetch" | "normalize") {
    const contextFingerprint = assertAdapterContext(context);
    const inventory = this.#activeInventory;
    if (
      inventory === null ||
      !inventory.ready ||
      inventory.buildId !== context.buildId ||
      inventory.contextFingerprint !== contextFingerprint
    ) {
      this.#invalidateState();
      throw new Error(
        `Federal Register ${stage} requires a completed reconciled inventory for the identical build context.`,
      );
    }
    return inventory;
  }

  async checkContract(context: BuildContext): Promise<AdapterContractHealth> {
    this.#invalidateState();
    try {
      const contextFingerprint = assertAdapterContext(context);
      const url = new URL(
        FEDERAL_REGISTER_PATHS.openApi,
        FEDERAL_REGISTER_ORIGIN,
      );
      const contract = await fetchFederalRegisterJson(
        url,
        "openApi",
        this.#dependencies,
      );
      assertFederalRegisterOpenApiProjection(contract);
      this.#contractContextFingerprint = contextFingerprint;
      return {
        ok: true,
        checkedAt: context.generatedAt,
        message: null,
      };
    } catch {
      this.#invalidateState();
      return {
        ok: false,
        checkedAt: context.generatedAt,
        message:
          "Federal Register API contract did not match the reviewed projection.",
      };
    }
  }

  async *discover(context: BuildContext): AsyncIterable<SourceReference> {
    let contextFingerprint: string;
    try {
      contextFingerprint = assertAdapterContext(context);
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
    this.#activeInventory = null;
    if (this.#contractContextFingerprint !== contextFingerprint) {
      this.#invalidateState();
      throw new Error(
        "Federal Register discovery requires a successful contract check for the identical build context.",
      );
    }
    this.#contractContextFingerprint = null;

    let active: ActiveInventory | null = null;
    try {
      const range = federalRegisterPublicArtifactRange(
        context.generatedAt,
        context.source.coverage,
      );
      const inventory: FederalRegisterInventory =
        await retrieveFederalRegisterInventory(range, this.#dependencies);
      const candidateSelection = publicCandidateDocuments(
        inventory.documents,
        range,
      );
      const { documents } = candidateSelection;
      if (documents.length === 0) {
        throw new Error(
          "Federal Register reconciled inventory contains no eligible public beta records.",
        );
      }
      if (
        documents.length >
        FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.maximumCandidateDocuments
      ) {
        throw new Error(
          "Federal Register eligible public candidates exceed the versioned artifact record budget.",
        );
      }
      const byDocumentNumber = new Map<string, FederalRegisterDocument>();
      const references = documents.map((document) => {
        if (byDocumentNumber.has(document.document_number)) {
          throw new Error(
            "Federal Register reconciled inventory contains a duplicate document number.",
          );
        }
        byDocumentNumber.set(document.document_number, document);
        return {
          sourceRecordId: document.document_number,
          officialUrl: document.html_url,
          sourceUpdatedAt: null,
          cursor: null,
        } satisfies SourceReference;
      });
      active = {
        buildId: context.buildId,
        contextFingerprint,
        retrievedAt: inventory.retrievedAt,
        coverageRange: range,
        correctionBoundaryExcludedCount:
          candidateSelection.correctionBoundaryExcludedCount,
        documents,
        byDocumentNumber,
        ready: false,
        issuedFetches: new WeakSet(),
        normalizedDocumentNumbers: new Set(),
        normalizedByDocumentNumber: null,
      };
      this.#activeInventory = active;

      for (const reference of references) {
        yield reference;
      }
      if (this.#activeInventory !== active) {
        throw new Error(
          "Federal Register discovery state changed before iteration completed.",
        );
      }
      active.ready = true;
    } catch (error) {
      this.#invalidateState();
      throw error;
    } finally {
      if (
        active !== null &&
        !active.ready &&
        this.#activeInventory === active
      ) {
        this.#invalidateState();
      }
    }
  }

  async fetch(
    reference: SourceReference,
    context: BuildContext,
  ): Promise<FetchResult> {
    try {
      const inventory = this.#readyInventory(context, "fetch");
      const document = inventory.byDocumentNumber.get(reference.sourceRecordId);
      if (
        document === undefined ||
        reference.officialUrl !== document.html_url ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "Federal Register source reference differs from the reconciled inventory.",
        );
      }
      const fetched: FetchResult = {
        reference: { ...reference },
        body: structuredClone(document),
        retrievedAt: inventory.retrievedAt,
      };
      inventory.issuedFetches.add(fetched);
      return fetched;
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
  }

  async normalize(
    fetched: FetchResult,
    context: BuildContext,
  ): Promise<PolicyRecord[]> {
    try {
      const inventory = this.#readyInventory(context, "normalize");
      if (
        !inventory.issuedFetches.has(fetched) ||
        fetched.retrievedAt !== inventory.retrievedAt ||
        fetched.reference.sourceUpdatedAt !== null ||
        fetched.reference.cursor !== null ||
        inventory.normalizedDocumentNumbers.has(
          fetched.reference.sourceRecordId,
        )
      ) {
        throw new Error(
          "Federal Register normalization requires an unconsumed fetch result issued by the active inventory.",
        );
      }
      inventory.issuedFetches.delete(fetched);

      const document = parseFederalRegisterDocument(fetched.body);
      const expected = inventory.byDocumentNumber.get(
        fetched.reference.sourceRecordId,
      );
      if (
        expected === undefined ||
        fetched.reference.officialUrl !== expected.html_url ||
        stableJson(document) !== stableJson(expected)
      ) {
        throw new Error(
          "Federal Register fetched document differs from its reconciled source reference.",
        );
      }

      if (inventory.normalizedByDocumentNumber === null) {
        const normalized = normalizeFederalRegisterInventory(
          inventory.documents,
          {
            source: context.source,
            retrievedAt: inventory.retrievedAt,
            coverageRange: inventory.coverageRange,
            correctionBoundaryExcludedCount:
              inventory.correctionBoundaryExcludedCount,
          },
        );
        const normalizedByDocumentNumber = new Map(
          normalized.map((record) => [record.source.recordId, record]),
        );
        if (
          normalizedByDocumentNumber.size !== inventory.documents.length ||
          inventory.documents.some(
            ({ document_number }) =>
              !normalizedByDocumentNumber.has(document_number),
          )
        ) {
          throw new Error(
            "Federal Register normalized inventory differs from the reconciled candidate set.",
          );
        }
        inventory.normalizedByDocumentNumber = normalizedByDocumentNumber;
      }

      const record = inventory.normalizedByDocumentNumber.get(
        expected.document_number,
      );
      if (record === undefined) {
        throw new Error(
          "Federal Register normalized inventory is missing the fetched document.",
        );
      }
      inventory.normalizedDocumentNumbers.add(expected.document_number);
      if (
        inventory.normalizedDocumentNumbers.size === inventory.documents.length
      ) {
        this.#activeInventory = null;
      }
      return [record];
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
  }
}

export function createFederalRegisterAdapter(
  dependencies: FederalRegisterRetrievalDependencies = {},
): FederalRegisterAdapter {
  return new FederalRegisterAdapter(dependencies);
}

export interface FederalRegisterRefreshValidator {
  validate(
    records: PolicyRecord[],
  ): readonly PolicyRecord[] | Promise<readonly PolicyRecord[]>;
}

export async function refreshFederalRegisterSource(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: FederalRegisterRefreshValidator,
): Promise<SourceRefreshResult> {
  try {
    assertAdapterContext(context);
    if (
      Object.getPrototypeOf(adapter) !== FederalRegisterAdapter.prototype ||
      adapter.checkContract !==
        FederalRegisterAdapter.prototype.checkContract ||
      adapter.discover !== FederalRegisterAdapter.prototype.discover ||
      adapter.fetch !== FederalRegisterAdapter.prototype.fetch ||
      adapter.normalize !== FederalRegisterAdapter.prototype.normalize ||
      adapter.sourceId !== FEDERAL_REGISTER_SOURCE_ID ||
      adapter.adapterId !== FEDERAL_REGISTER_ADAPTER_ID ||
      adapter.adapterVersion !== FEDERAL_REGISTER_ADAPTER_VERSION
    ) {
      throw new Error(
        "Federal Register refresh received the wrong adapter implementation.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Federal Register contract validation failed.",
    );
  }

  try {
    const contract = await adapter.checkContract(context);
    if (
      contract.ok !== true ||
      contract.checkedAt !== context.generatedAt ||
      contract.message !== null
    ) {
      throw new Error(
        "Federal Register contract check did not produce the expected success receipt.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Federal Register contract validation failed.",
    );
  }

  const references: SourceReference[] = [];
  try {
    const sourceRecordIds = new Set<string>();
    for await (const reference of adapter.discover(context)) {
      if (
        sourceRecordIds.has(reference.sourceRecordId) ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "Federal Register discovery returned a duplicate or stateful reference.",
        );
      }
      sourceRecordIds.add(reference.sourceRecordId);
      references.push(reference);
    }
    if (references.length === 0) {
      throw new Error(
        "Federal Register discovery returned no eligible records for its reviewed historical range.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "discovery",
      "Federal Register inventory reconciliation failed.",
    );
  }

  const records: PolicyRecord[] = [];
  for (const reference of references) {
    let fetched: FetchResult;
    try {
      fetched = await adapter.fetch(reference, context);
      if (stableJson(fetched.reference) !== stableJson(reference)) {
        throw new Error(
          "Federal Register fetch changed its reconciled source reference.",
        );
      }
    } catch {
      return fixedFailure(
        context,
        "fetch",
        "Federal Register document retrieval failed.",
      );
    }

    try {
      const normalized = await adapter.normalize(fetched, context);
      if (
        normalized.length !== 1 ||
        normalized[0]?.source.id !== FEDERAL_REGISTER_SOURCE_ID ||
        normalized[0]?.source.recordId !== reference.sourceRecordId ||
        normalized[0]?.sourceDocumentIdentifier !== reference.sourceRecordId
      ) {
        throw new Error(
          "Federal Register normalization cardinality or identity differs from discovery.",
        );
      }
      records.push(normalized[0]);
    } catch {
      return fixedFailure(
        context,
        "normalize",
        "Federal Register normalization failed.",
      );
    }
  }
  if (records.length !== references.length) {
    return fixedFailure(
      context,
      "normalize",
      "Federal Register normalization failed.",
    );
  }
  try {
    validateRecordSetPolicy(records, {
      sourceRegistry: validationSourceRegistry(context),
      taxonomy: taxonomy as unknown as TaxonomyConfig,
    });
    const beforeValidation = stableJson(records);
    const validated = await validator.validate(records);
    if (
      validated !== records ||
      stableJson(records) !== beforeValidation ||
      records.some(
        (record) =>
          record.dataQuality.state !== "validated" ||
          record.dataQuality.validatedAt !== record.dates.retrieved ||
          record.dataQuality.validator !==
            `${FEDERAL_REGISTER_ADAPTER_ID}@${FEDERAL_REGISTER_ADAPTER_VERSION}` ||
          record.dataQuality.issues.length !== 0 ||
          record.sourceHealth.status !== "healthy" ||
          record.sourceHealth.checkedAt !== record.dates.retrieved ||
          record.sourceHealth.lastSuccessfulRetrievalAt !==
            record.dates.retrieved ||
          record.sourceHealth.usingLastKnownGood ||
          record.sourceHealth.message !== null,
      )
    ) {
      throw new Error(
        "Federal Register validation barrier did not return the unchanged validated record set.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "validation",
      "Federal Register record validation failed.",
    );
  }

  const dataAsOf =
    records
      .map(({ sourceHealth }) => sourceHealth.dataAsOf)
      .sort()
      .at(-1) ?? null;
  const lastSuccessfulRetrievalAt =
    records
      .map(({ dates }) => dates.retrieved)
      .sort()
      .at(-1) ?? context.generatedAt;
  const health: SourceHealth = {
    sourceId: FEDERAL_REGISTER_SOURCE_ID,
    status: "healthy",
    checkedAt: context.generatedAt,
    dataAsOf,
    lastSuccessfulRetrievalAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: records.length,
    failureStage: null,
    message: null,
  };
  return { ok: true, records, health };
}
