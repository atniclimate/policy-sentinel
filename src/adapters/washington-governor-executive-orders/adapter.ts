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
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
  WASHINGTON_GOVERNOR_HTML_POLICY,
} from "./constants";
import {
  assertWashingtonGovernorExecutiveOrdersSourceConfig,
  normalizeWashingtonGovernorExecutiveOrder,
} from "./normalize";
import { buildWashingtonGovernorExecutiveOrdersIndexUrl } from "./query-contract";
import {
  washingtonGovernorSourceRecordId,
  type WashingtonGovernorExecutiveOrder,
} from "./response-contract";
import {
  fetchWashingtonGovernorExecutiveOrdersIndex,
  type WashingtonGovernorTransportDependencies,
} from "./transport";

interface ActiveInventory {
  buildId: string;
  contextFingerprint: string;
  retrievedAt: string;
  coverageThrough: string;
  rows: readonly Readonly<WashingtonGovernorExecutiveOrder>[];
  bySourceRecordId: ReadonlyMap<
    string,
    Readonly<WashingtonGovernorExecutiveOrder>
  >;
  rowIndexBySourceRecordId: ReadonlyMap<string, number>;
  ready: boolean;
  fetchedSourceRecordIds: Set<string>;
  issuedFetches: WeakSet<FetchResult>;
  normalizedSourceRecordIds: Set<string>;
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
      "Washington Governor executive-order adapter state is not JSON-serializable.",
    );
  }
  return result;
}

function assertAdapterContext(context: BuildContext): string {
  assertWashingtonGovernorExecutiveOrdersSourceConfig(context.source);
  if (
    typeof context.buildId !== "string" ||
    context.buildId.trim() === "" ||
    context.previousCursor !== null
  ) {
    throw new Error(
      "Washington Governor executive-order build requires a nonblank build ID and no provider cursor.",
    );
  }
  const generatedAt = new Date(context.generatedAt);
  if (
    Number.isNaN(generatedAt.getTime()) ||
    generatedAt.toISOString() !== context.generatedAt
  ) {
    throw new Error(
      "Washington Governor executive-order build time must be a normalized UTC timestamp.",
    );
  }
  buildWashingtonGovernorExecutiveOrdersIndexUrl();
  return stableJson(context);
}

function fixedFailure(
  context: BuildContext,
  failureStage: SourceRefreshFailure["failureStage"],
  publicMessage: string,
): SourceRefreshFailure {
  return {
    ok: false,
    sourceId: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
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
      source.id === WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID
        ? context.source
        : source,
    ),
  };
}

export class WashingtonGovernorExecutiveOrdersAdapter implements PublicSourceAdapter {
  readonly sourceId = WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID;
  readonly adapterId = WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID;
  readonly adapterVersion =
    WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION;

  readonly #dependencies: WashingtonGovernorTransportDependencies;
  #contractContextFingerprint: string | null = null;
  #activeInventory: ActiveInventory | null = null;

  constructor(dependencies: WashingtonGovernorTransportDependencies = {}) {
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
        `Washington Governor executive-order ${stage} requires a completed inventory for the identical build context.`,
      );
    }
    return inventory;
  }

  async checkContract(context: BuildContext): Promise<AdapterContractHealth> {
    this.#invalidateState();
    try {
      this.#contractContextFingerprint = assertAdapterContext(context);
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
          "Washington Governor executive-order source configuration did not match the reviewed contract.",
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
        "Washington Governor executive-order discovery requires a successful contract check for the identical build context.",
      );
    }
    this.#contractContextFingerprint = null;

    let active: ActiveInventory | null = null;
    try {
      const index = await fetchWashingtonGovernorExecutiveOrdersIndex(
        context.generatedAt.slice(0, 10),
        this.#dependencies,
      );
      const coverageThrough = index.rows
        .map(({ issuedDate }) => issuedDate)
        .sort(compareCodeUnits)
        .at(-1);
      if (
        coverageThrough === undefined ||
        index.rows.length < 1 ||
        index.rows.length > WASHINGTON_GOVERNOR_HTML_POLICY.maximumRows
      ) {
        throw new Error(
          "Washington Governor executive-order inventory cardinality is invalid.",
        );
      }

      const bySourceRecordId = new Map<
        string,
        Readonly<WashingtonGovernorExecutiveOrder>
      >();
      const rowIndexBySourceRecordId = new Map<string, number>();
      const references = index.rows.map((row, rowIndex) => {
        const sourceRecordId = washingtonGovernorSourceRecordId(row);
        if (bySourceRecordId.has(sourceRecordId)) {
          throw new Error(
            "Washington Governor executive-order inventory repeated a compound identity.",
          );
        }
        bySourceRecordId.set(sourceRecordId, row);
        rowIndexBySourceRecordId.set(sourceRecordId, rowIndex);
        return {
          sourceRecordId,
          officialUrl: row.officialPdfUrl,
          sourceUpdatedAt: null,
          cursor: null,
        } satisfies SourceReference;
      });

      active = {
        buildId: context.buildId,
        contextFingerprint,
        retrievedAt: context.generatedAt,
        coverageThrough,
        rows: index.rows,
        bySourceRecordId,
        rowIndexBySourceRecordId,
        ready: false,
        fetchedSourceRecordIds: new Set(),
        issuedFetches: new WeakSet(),
        normalizedSourceRecordIds: new Set(),
      };
      this.#activeInventory = active;
      for (const reference of references) {
        yield reference;
      }
      if (this.#activeInventory !== active) {
        throw new Error(
          "Washington Governor executive-order discovery state changed before iteration completed.",
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
      const row = inventory.bySourceRecordId.get(reference.sourceRecordId);
      if (
        row === undefined ||
        inventory.fetchedSourceRecordIds.has(reference.sourceRecordId) ||
        reference.officialUrl !== row.officialPdfUrl ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "Washington Governor executive-order reference differs from its validated inventory.",
        );
      }
      const result: FetchResult = {
        reference: { ...reference },
        body: structuredClone(row),
        retrievedAt: inventory.retrievedAt,
      };
      inventory.fetchedSourceRecordIds.add(reference.sourceRecordId);
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
      const sourceRecordId = fetched.reference.sourceRecordId;
      const expected = inventory.bySourceRecordId.get(sourceRecordId);
      const rowIndex = inventory.rowIndexBySourceRecordId.get(sourceRecordId);
      if (
        expected === undefined ||
        rowIndex === undefined ||
        !inventory.issuedFetches.has(fetched) ||
        inventory.normalizedSourceRecordIds.has(sourceRecordId) ||
        fetched.retrievedAt !== inventory.retrievedAt ||
        fetched.reference.officialUrl !== expected.officialPdfUrl ||
        fetched.reference.sourceUpdatedAt !== null ||
        fetched.reference.cursor !== null ||
        stableJson(fetched.body) !== stableJson(expected)
      ) {
        throw new Error(
          "Washington Governor executive-order normalization requires one unmodified fetch result from the active inventory.",
        );
      }
      inventory.issuedFetches.delete(fetched);
      const record = normalizeWashingtonGovernorExecutiveOrder(expected, {
        source: context.source,
        retrievedAt: inventory.retrievedAt,
        coverageThrough: inventory.coverageThrough,
        rowIndex,
      });
      inventory.normalizedSourceRecordIds.add(sourceRecordId);
      if (inventory.normalizedSourceRecordIds.size === inventory.rows.length) {
        this.#activeInventory = null;
      }
      return [record];
    } catch (error) {
      this.#invalidateState();
      throw error;
    }
  }
}

export function createWashingtonGovernorExecutiveOrdersAdapter(
  dependencies: WashingtonGovernorTransportDependencies = {},
): WashingtonGovernorExecutiveOrdersAdapter {
  return new WashingtonGovernorExecutiveOrdersAdapter(dependencies);
}

export interface WashingtonGovernorRefreshValidator {
  validate(
    records: PolicyRecord[],
  ): readonly PolicyRecord[] | Promise<readonly PolicyRecord[]>;
}

export async function refreshWashingtonGovernorExecutiveOrdersSourceWithTaxonomy(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: WashingtonGovernorRefreshValidator,
  taxonomy: TaxonomyConfig,
): Promise<SourceRefreshResult> {
  try {
    assertAdapterContext(context);
    if (
      Object.getPrototypeOf(adapter) !==
        WashingtonGovernorExecutiveOrdersAdapter.prototype ||
      adapter.checkContract !==
        WashingtonGovernorExecutiveOrdersAdapter.prototype.checkContract ||
      adapter.discover !==
        WashingtonGovernorExecutiveOrdersAdapter.prototype.discover ||
      adapter.fetch !==
        WashingtonGovernorExecutiveOrdersAdapter.prototype.fetch ||
      adapter.normalize !==
        WashingtonGovernorExecutiveOrdersAdapter.prototype.normalize ||
      adapter.sourceId !== WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID ||
      adapter.adapterId !== WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID ||
      adapter.adapterVersion !==
        WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION
    ) {
      throw new Error(
        "Washington Governor executive-order refresh received the wrong adapter implementation.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Washington Governor executive-order contract validation failed.",
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
        "Washington Governor executive-order contract receipt is invalid.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "contract",
      "Washington Governor executive-order contract validation failed.",
    );
  }

  const references: SourceReference[] = [];
  try {
    const identities = new Set<string>();
    for await (const reference of adapter.discover(context)) {
      if (
        identities.has(reference.sourceRecordId) ||
        reference.sourceUpdatedAt !== null ||
        reference.cursor !== null
      ) {
        throw new Error(
          "Washington Governor executive-order discovery returned a duplicate or stateful reference.",
        );
      }
      identities.add(reference.sourceRecordId);
      references.push(reference);
    }
    if (
      references.length < 1 ||
      references.length > WASHINGTON_GOVERNOR_HTML_POLICY.maximumRows
    ) {
      throw new Error(
        "Washington Governor executive-order discovery returned an invalid row count.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "discovery",
      "Washington Governor executive-order index discovery failed.",
    );
  }

  const records: PolicyRecord[] = [];
  for (const reference of references) {
    let fetched: FetchResult;
    try {
      fetched = await adapter.fetch(reference, context);
      if (stableJson(fetched.reference) !== stableJson(reference)) {
        throw new Error(
          "Washington Governor executive-order fetch changed its source reference.",
        );
      }
    } catch {
      return fixedFailure(
        context,
        "fetch",
        "Washington Governor executive-order metadata retrieval failed.",
      );
    }

    try {
      const normalized = await adapter.normalize(fetched, context);
      const record = normalized[0];
      if (
        normalized.length !== 1 ||
        record === undefined ||
        record.source.id !== WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID ||
        record.source.recordId !== reference.sourceRecordId ||
        `${record.sourceDocumentIdentifier}@${record.dates.published}` !==
          reference.sourceRecordId ||
        record.urls.officialFullText !== reference.officialUrl
      ) {
        throw new Error(
          "Washington Governor executive-order normalization cardinality or identity differs from discovery.",
        );
      }
      records.push(record);
    } catch {
      return fixedFailure(
        context,
        "normalize",
        "Washington Governor executive-order normalization failed.",
      );
    }
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
            `${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID}@${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION}` ||
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
        "Washington Governor executive-order validation barrier did not return the unchanged record set.",
      );
    }
  } catch {
    return fixedFailure(
      context,
      "validation",
      "Washington Governor executive-order record validation failed.",
    );
  }

  const health: SourceHealth = {
    sourceId: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
    status: "healthy",
    checkedAt: context.generatedAt,
    dataAsOf: context.generatedAt,
    lastSuccessfulRetrievalAt: context.generatedAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: records.length,
    failureStage: null,
    message: null,
  };
  return {
    ok: true,
    records,
    health,
  };
}
