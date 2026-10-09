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
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_URL,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION,
  WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
} from "./constants";
import { assertGoiaAccordSourceConfig, normalizeGoiaAccord } from "./normalize";
import { buildGoiaAccordUrl } from "./query-contract";
import {
  assertGoiaAccordProjection,
  goiaAccordSourceRecordId,
  type GoiaAccordProjection,
} from "./response-contract";
import {
  fetchGoiaAccordPage,
  type GoiaAccordTransportDependencies,
} from "./transport";

interface ActiveInventory {
  buildId: string;
  contextFingerprint: string;
  retrievedAt: string;
  projection: Readonly<GoiaAccordProjection>;
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
      "GOIA Centennial Accord adapter state is not JSON-serializable.",
    );
  }
  return result;
}

function assertAdapterContext(context: BuildContext): string {
  assertGoiaAccordSourceConfig(context.source);
  if (
    typeof context.buildId !== "string" ||
    context.buildId.trim() === "" ||
    context.previousCursor !== null
  ) {
    throw new Error(
      "GOIA Centennial Accord build requires a nonblank build ID and no provider cursor.",
    );
  }
  const generatedAt = new Date(context.generatedAt);
  if (
    Number.isNaN(generatedAt.getTime()) ||
    generatedAt.toISOString() !== context.generatedAt ||
    context.generatedAt.slice(0, 10) < GOIA_ACCORD_METADATA.executionDate
  ) {
    throw new Error(
      "GOIA Centennial Accord build time must be normalized post-execution UTC.",
    );
  }
  buildGoiaAccordUrl();
  return stableJson(context);
}

function fixedFailure(
  context: BuildContext,
  failureStage: SourceRefreshFailure["failureStage"],
  publicMessage: string,
): SourceRefreshFailure {
  return {
    ok: false,
    sourceId: WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
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
      source.id === WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID
        ? context.source
        : source,
    ),
  };
}

export class WashingtonCentennialAccordAdapter implements PublicSourceAdapter {
  readonly sourceId = WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID;
  readonly adapterId = WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID;
  readonly adapterVersion = WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION;

  readonly #dependencies: GoiaAccordTransportDependencies;
  #contractContextFingerprint: string | null = null;
  #activeInventory: ActiveInventory | null = null;

  constructor(dependencies: GoiaAccordTransportDependencies = {}) {
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
    const fingerprint = assertAdapterContext(context);
    const inventory = this.#activeInventory;
    if (
      inventory === null ||
      !inventory.ready ||
      inventory.buildId !== context.buildId ||
      inventory.contextFingerprint !== fingerprint
    ) {
      this.#invalidateState();
      throw new Error(
        `GOIA Centennial Accord ${stage} requires a completed inventory for the identical build context.`,
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
          "GOIA Centennial Accord source configuration did not match the reviewed contract.",
      };
    }
  }

  async *discover(context: BuildContext): AsyncIterable<SourceReference> {
    let fingerprint: string;
    try {
      fingerprint = assertAdapterContext(context);
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
    this.#activeInventory = null;
    if (this.#contractContextFingerprint !== fingerprint) {
      this.#invalidateState();
      throw new Error(
        "GOIA Centennial Accord discovery requires a successful contract check for the identical context.",
      );
    }
    this.#contractContextFingerprint = null;

    let active: ActiveInventory | null = null;
    try {
      const page = await fetchGoiaAccordPage(this.#dependencies);
      const projection = assertGoiaAccordProjection(page.projection);
      active = {
        buildId: context.buildId,
        contextFingerprint: fingerprint,
        retrievedAt: context.generatedAt,
        projection,
        ready: false,
        fetched: false,
        issuedFetches: new WeakSet(),
        normalized: false,
      };
      this.#activeInventory = active;
      yield {
        sourceRecordId: goiaAccordSourceRecordId(),
        officialUrl: GOIA_ACCORD_URL,
        sourceUpdatedAt: null,
        cursor: null,
      };
      if (this.#activeInventory !== active) {
        throw new Error(
          "GOIA Centennial Accord discovery state changed before completion.",
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
        reference.sourceRecordId !== goiaAccordSourceRecordId() ||
        reference.officialUrl !== GOIA_ACCORD_URL ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "GOIA Centennial Accord reference differs from the validated inventory.",
        );
      }
      const result: FetchResult = {
        reference: { ...reference },
        body: structuredClone(inventory.projection),
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
        fetched.reference.sourceRecordId !== goiaAccordSourceRecordId() ||
        fetched.reference.officialUrl !== GOIA_ACCORD_URL ||
        fetched.reference.sourceUpdatedAt !== null ||
        fetched.reference.cursor !== null ||
        fetched.retrievedAt !== inventory.retrievedAt ||
        stableJson(fetched.body) !== stableJson(inventory.projection)
      ) {
        throw new Error(
          "GOIA Centennial Accord normalization requires the unmodified active fetch result.",
        );
      }
      inventory.issuedFetches.delete(fetched);
      inventory.normalized = true;
      const record = normalizeGoiaAccord(inventory.projection, {
        source: context.source,
        retrievedAt: inventory.retrievedAt,
      });
      this.#activeInventory = null;
      return [record];
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
  }
}

export function createWashingtonCentennialAccordAdapter(
  dependencies: GoiaAccordTransportDependencies = {},
): WashingtonCentennialAccordAdapter {
  return new WashingtonCentennialAccordAdapter(dependencies);
}

export interface GoiaAccordRefreshValidator {
  validate(
    records: PolicyRecord[],
  ): readonly PolicyRecord[] | Promise<readonly PolicyRecord[]>;
}

export async function refreshWashingtonCentennialAccordSourceWithTaxonomy(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: GoiaAccordRefreshValidator,
  taxonomy: TaxonomyConfig,
): Promise<SourceRefreshResult> {
  try {
    assertAdapterContext(context);
    if (
      Object.getPrototypeOf(adapter) !==
        WashingtonCentennialAccordAdapter.prototype ||
      adapter.checkContract !==
        WashingtonCentennialAccordAdapter.prototype.checkContract ||
      adapter.discover !==
        WashingtonCentennialAccordAdapter.prototype.discover ||
      adapter.fetch !== WashingtonCentennialAccordAdapter.prototype.fetch ||
      adapter.normalize !==
        WashingtonCentennialAccordAdapter.prototype.normalize ||
      adapter.sourceId !== WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID ||
      adapter.adapterId !== WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID ||
      adapter.adapterVersion !== WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION
    ) {
      throw new Error("GOIA Centennial Accord refresh got the wrong adapter.");
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "GOIA Centennial Accord contract validation failed.",
    );
  }

  try {
    const contract = await adapter.checkContract(context);
    if (
      !contract.ok ||
      contract.checkedAt !== context.generatedAt ||
      contract.message !== null
    ) {
      throw new Error("GOIA Centennial Accord contract receipt is invalid.");
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "GOIA Centennial Accord contract validation failed.",
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
      references[0]?.sourceRecordId !== goiaAccordSourceRecordId() ||
      references[0].officialUrl !== GOIA_ACCORD_URL ||
      references[0].sourceUpdatedAt !== null ||
      references[0].cursor !== null
    ) {
      throw new Error("GOIA Centennial Accord discovery was not exact.");
    }
    reference = references[0];
  } catch {
    return fixedFailure(
      context,
      "discovery",
      "GOIA Centennial Accord page discovery failed.",
    );
  }

  let fetched: FetchResult;
  try {
    fetched = await adapter.fetch(reference, context);
    if (stableJson(fetched.reference) !== stableJson(reference)) {
      throw new Error("GOIA Centennial Accord fetch changed its reference.");
    }
  } catch {
    return fixedFailure(
      context,
      "fetch",
      "GOIA Centennial Accord metadata retrieval failed.",
    );
  }

  let records: PolicyRecord[];
  try {
    records = await adapter.normalize(fetched, context);
    const record = records[0];
    if (
      records.length !== 1 ||
      record === undefined ||
      record.source.id !== WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID ||
      record.source.recordId !== reference.sourceRecordId ||
      record.urls.officialSource !== reference.officialUrl ||
      record.urls.officialFullText !== null ||
      record.issuingBodies.length !== 0 ||
      record.nationAssociations.length !== 0 ||
      !record.jurisdiction.generalJurisdictionOnly ||
      !record.isUnclassified
    ) {
      throw new Error(
        "GOIA Centennial Accord normalization violated its bounded governance scope.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "normalize",
      "GOIA Centennial Accord normalization failed.",
    );
  }

  try {
    validateRecordSetPolicy(records, {
      sourceRegistry: validationSourceRegistry(context),
      taxonomy,
    });
    const before = stableJson(records);
    const validated = await validator.validate(records);
    if (
      validated !== records ||
      stableJson(records) !== before ||
      records.some(
        (record) =>
          record.dataQuality.state !== "validated" ||
          record.dataQuality.validatedAt !== record.dates.retrieved ||
          record.dataQuality.validator !==
            `${WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID}@${WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION}` ||
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
        "GOIA Centennial Accord validation barrier changed or weakened the record set.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "validation",
      "GOIA Centennial Accord record validation failed.",
    );
  }

  const health: SourceHealth = {
    sourceId: WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
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
