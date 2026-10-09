import sourceRegistry from "../../../config/sources.v1.json";

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
import {
  SUPREME_COURT_HTML_POLICY,
  SUPREME_COURT_OPINIONS_ADAPTER_ID,
  SUPREME_COURT_OPINIONS_ADAPTER_VERSION,
  SUPREME_COURT_OPINIONS_SOURCE_ID,
  SUPREME_COURT_SELECTED_OPINION,
} from "./constants";
import {
  assertSupremeCourtSourceConfig,
  normalizeSupremeCourtOpinion,
} from "./normalize";
import { buildSupremeCourtTermIndexUrl } from "./query-contract";
import {
  supremeCourtSourceRecordId,
  type SupremeCourtOpinionProjection,
} from "./response-contract";
import {
  fetchSupremeCourtTermIndex,
  type SupremeCourtTransportDependencies,
} from "./transport";

interface ActiveInventory {
  buildId: string;
  contextFingerprint: string;
  retrievedAt: string;
  termHeading: string;
  row: Readonly<SupremeCourtOpinionProjection>;
  sourceRecordId: string;
  ready: boolean;
  fetched: boolean;
  issuedFetches: WeakSet<FetchResult>;
  normalized: boolean;
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
      "Supreme Court curated-opinion adapter state is not JSON-serializable.",
    );
  }
  return result;
}

function assertAdapterContext(context: BuildContext): string {
  assertSupremeCourtSourceConfig(context.source);
  if (
    typeof context.buildId !== "string" ||
    context.buildId.trim() === "" ||
    context.previousCursor !== null
  ) {
    throw new Error(
      "Supreme Court curated-opinion build requires a nonblank build ID and no provider cursor.",
    );
  }
  const generatedAt = new Date(context.generatedAt);
  if (
    Number.isNaN(generatedAt.getTime()) ||
    generatedAt.toISOString() !== context.generatedAt ||
    context.generatedAt.slice(0, 10) <
      SUPREME_COURT_SELECTED_OPINION.decisionDate
  ) {
    throw new Error(
      "Supreme Court curated-opinion build time must be a normalized post-decision UTC timestamp.",
    );
  }
  buildSupremeCourtTermIndexUrl();
  return stableJson(context);
}

function fixedFailure(
  context: BuildContext,
  failureStage: SourceRefreshFailure["failureStage"],
  publicMessage: string,
): SourceRefreshFailure {
  return {
    ok: false,
    sourceId: SUPREME_COURT_OPINIONS_SOURCE_ID,
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
      source.id === SUPREME_COURT_OPINIONS_SOURCE_ID ? context.source : source,
    ),
  };
}

export class SupremeCourtCuratedOpinionsAdapter implements PublicSourceAdapter {
  readonly sourceId = SUPREME_COURT_OPINIONS_SOURCE_ID;
  readonly adapterId = SUPREME_COURT_OPINIONS_ADAPTER_ID;
  readonly adapterVersion = SUPREME_COURT_OPINIONS_ADAPTER_VERSION;

  readonly #dependencies: SupremeCourtTransportDependencies;
  #contractContextFingerprint: string | null = null;
  #activeInventory: ActiveInventory | null = null;

  constructor(dependencies: SupremeCourtTransportDependencies = {}) {
    this.#dependencies = dependencies;
  }

  #invalidateState(): void {
    this.#contractContextFingerprint = null;
    this.#activeInventory = null;
  }

  #readyInventory(
    context: BuildContext,
    stage: "fetch" | "normalize",
  ): ActiveInventory {
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
        `Supreme Court curated-opinion ${stage} requires a completed inventory for the identical build context.`,
      );
    }
    return inventory;
  }

  async checkContract(context: BuildContext): Promise<AdapterContractHealth> {
    this.#invalidateState();
    try {
      this.#contractContextFingerprint = assertAdapterContext(context);
      return { ok: true, checkedAt: context.generatedAt, message: null };
    } catch {
      this.#invalidateState();
      return {
        ok: false,
        checkedAt: context.generatedAt,
        message:
          "Supreme Court curated-opinion source configuration did not match the reviewed contract.",
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
        "Supreme Court curated-opinion discovery requires a successful contract check for the identical build context.",
      );
    }
    this.#contractContextFingerprint = null;

    let active: ActiveInventory | null = null;
    try {
      const index = await fetchSupremeCourtTermIndex(this.#dependencies);
      if (
        index.rows.length !== 1 ||
        index.dataRowCount !== SUPREME_COURT_HTML_POLICY.maximumDataRows
      ) {
        throw new Error(
          "Supreme Court curated-opinion inventory cardinality is invalid.",
        );
      }
      const row = index.rows[0];
      const sourceRecordId = supremeCourtSourceRecordId(row);
      active = {
        buildId: context.buildId,
        contextFingerprint,
        retrievedAt: context.generatedAt,
        termHeading: index.termHeading,
        row,
        sourceRecordId,
        ready: false,
        fetched: false,
        issuedFetches: new WeakSet(),
        normalized: false,
      };
      this.#activeInventory = active;
      yield {
        sourceRecordId,
        officialUrl: row.boundVolumeUrl,
        sourceUpdatedAt: null,
        cursor: null,
      };
      if (this.#activeInventory !== active) {
        throw new Error(
          "Supreme Court curated-opinion discovery state changed before iteration completed.",
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
      if (
        inventory.fetched ||
        reference.sourceRecordId !== inventory.sourceRecordId ||
        reference.officialUrl !== inventory.row.boundVolumeUrl ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "Supreme Court curated-opinion reference differs from its validated inventory.",
        );
      }
      const result: FetchResult = {
        reference: { ...reference },
        body: structuredClone(inventory.row),
        retrievedAt: inventory.retrievedAt,
      };
      inventory.fetched = true;
      inventory.issuedFetches.add(result);
      return result;
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
        inventory.normalized ||
        !inventory.issuedFetches.has(fetched) ||
        fetched.reference.sourceRecordId !== inventory.sourceRecordId ||
        fetched.reference.officialUrl !== inventory.row.boundVolumeUrl ||
        fetched.reference.sourceUpdatedAt !== null ||
        fetched.reference.cursor !== null ||
        fetched.retrievedAt !== inventory.retrievedAt ||
        stableJson(fetched.body) !== stableJson(inventory.row)
      ) {
        throw new Error(
          "Supreme Court curated-opinion normalization requires one unmodified fetch result from the active inventory.",
        );
      }
      inventory.issuedFetches.delete(fetched);
      inventory.normalized = true;
      const record = normalizeSupremeCourtOpinion(inventory.row, {
        source: context.source,
        retrievedAt: inventory.retrievedAt,
        termHeading: inventory.termHeading,
      });
      this.#activeInventory = null;
      return [record];
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
  }
}

export function createSupremeCourtCuratedOpinionsAdapter(
  dependencies: SupremeCourtTransportDependencies = {},
): SupremeCourtCuratedOpinionsAdapter {
  return new SupremeCourtCuratedOpinionsAdapter(dependencies);
}

export interface SupremeCourtRefreshValidator {
  validate(
    records: PolicyRecord[],
  ): readonly PolicyRecord[] | Promise<readonly PolicyRecord[]>;
}

export async function refreshSupremeCourtCuratedOpinionsSourceWithTaxonomy(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: SupremeCourtRefreshValidator,
  taxonomy: TaxonomyConfig,
): Promise<SourceRefreshResult> {
  try {
    assertAdapterContext(context);
    if (
      Object.getPrototypeOf(adapter) !==
        SupremeCourtCuratedOpinionsAdapter.prototype ||
      adapter.checkContract !==
        SupremeCourtCuratedOpinionsAdapter.prototype.checkContract ||
      adapter.discover !==
        SupremeCourtCuratedOpinionsAdapter.prototype.discover ||
      adapter.fetch !== SupremeCourtCuratedOpinionsAdapter.prototype.fetch ||
      adapter.normalize !==
        SupremeCourtCuratedOpinionsAdapter.prototype.normalize ||
      adapter.sourceId !== SUPREME_COURT_OPINIONS_SOURCE_ID ||
      adapter.adapterId !== SUPREME_COURT_OPINIONS_ADAPTER_ID ||
      adapter.adapterVersion !== SUPREME_COURT_OPINIONS_ADAPTER_VERSION
    ) {
      throw new Error(
        "Supreme Court curated-opinion refresh received the wrong adapter implementation.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Supreme Court curated-opinion contract validation failed.",
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
        "Supreme Court curated-opinion contract receipt is invalid.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Supreme Court curated-opinion contract validation failed.",
    );
  }

  let reference: SourceReference;
  try {
    const references: SourceReference[] = [];
    for await (const discovered of adapter.discover(context)) {
      references.push(discovered);
    }
    if (
      references.length !== 1 ||
      references[0]?.sourceUpdatedAt !== null ||
      references[0]?.cursor !== null
    ) {
      throw new Error(
        "Supreme Court curated-opinion discovery returned an invalid inventory.",
      );
    }
    reference = references[0];
  } catch {
    return fixedFailure(
      context,
      "discovery",
      "Supreme Court curated-opinion index discovery failed.",
    );
  }

  let fetched: FetchResult;
  try {
    fetched = await adapter.fetch(reference, context);
    if (stableJson(fetched.reference) !== stableJson(reference)) {
      throw new Error(
        "Supreme Court curated-opinion fetch changed its source reference.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "fetch",
      "Supreme Court curated-opinion metadata retrieval failed.",
    );
  }

  let records: PolicyRecord[];
  try {
    records = await adapter.normalize(fetched, context);
    const record = records[0];
    if (
      records.length !== 1 ||
      record === undefined ||
      record.source.id !== SUPREME_COURT_OPINIONS_SOURCE_ID ||
      record.source.recordId !== reference.sourceRecordId ||
      record.sourceDocumentIdentifier !==
        SUPREME_COURT_SELECTED_OPINION.docketNumber ||
      record.judicialContext?.citations[0]?.sourceUrl !==
        reference.officialUrl ||
      record.urls.officialFullText !== null
    ) {
      throw new Error(
        "Supreme Court curated-opinion normalization cardinality or identity differs from discovery.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "normalize",
      "Supreme Court curated-opinion normalization failed.",
    );
  }

  try {
    validateRecordSetPolicy(records, {
      sourceRegistry: validationSourceRegistry(context),
      taxonomy,
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
            `${SUPREME_COURT_OPINIONS_ADAPTER_ID}@${SUPREME_COURT_OPINIONS_ADAPTER_VERSION}` ||
          record.dataQuality.issues.length !== 0 ||
          record.sourceHealth.status !== "healthy" ||
          record.sourceHealth.checkedAt !== record.dates.retrieved ||
          record.sourceHealth.dataAsOf !== record.dates.retrieved ||
          record.sourceHealth.lastSuccessfulRetrievalAt !==
            record.dates.retrieved ||
          record.sourceHealth.usingLastKnownGood ||
          record.sourceHealth.message !== null,
      )
    ) {
      throw new Error(
        "Supreme Court curated-opinion validation barrier did not return the unchanged record set.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "validation",
      "Supreme Court curated-opinion record validation failed.",
    );
  }

  const health: SourceHealth = {
    sourceId: SUPREME_COURT_OPINIONS_SOURCE_ID,
    status: "healthy",
    checkedAt: context.generatedAt,
    dataAsOf: context.generatedAt,
    lastSuccessfulRetrievalAt: context.generatedAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: 1,
    failureStage: null,
    message: null,
  };
  return { ok: true, records, health };
}
