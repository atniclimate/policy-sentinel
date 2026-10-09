import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import taxonomy from "../../../config/taxonomy.v1.json";
import * as legacy from "../../../src/adapters/washington-governor-executive-orders";
import * as direct from "../../../src/adapters/washington-governor-executive-orders/adapter";
import * as configured from "../../../scripts/configured-source-refresh";
import type { TaxonomyConfig } from "../../../src/shared/contracts";
import * as policyValidation from "../../../src/pipeline/policy-validation.mjs";

import sourceRegistry from "../../../config/sources.v1.json";
import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WashingtonGovernorExecutiveOrdersAdapter,
  createWashingtonGovernorExecutiveOrdersAdapter,
  refreshWashingtonGovernorExecutiveOrdersSource,
  type WashingtonGovernorFetchLike,
} from "../../../src/adapters/washington-governor-executive-orders";
import type {
  BuildContext,
  SourceReference,
} from "../../../src/pipeline/source-adapter";
import { mergeSourceRefresh } from "../../../src/pipeline/last-known-good.mjs";
import type {
  PolicyRecord,
  SourceConfig,
  SourceHealth,
} from "../../../src/shared/contracts";

const fixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/washington-governor-executive-orders/current-term.valid.html",
  ),
  "utf8",
);

function enabledContext(): BuildContext {
  const source = structuredClone(
    sourceRegistry.sources.find(
      ({ id }) => id === "washington-governor-executive-orders",
    ),
  ) as unknown as SourceConfig;
  source.enabled = true;
  return {
    buildId: "impossible-synthetic-governor-build",
    generatedAt: "2099-01-03T00:00:00.000Z",
    source,
    previousCursor: null,
  };
}

function htmlResponse(html = fixture): Response {
  const response = new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  });
  return response;
}

function fixtureFetch(html = fixture): {
  fetch: WashingtonGovernorFetchLike;
  mock: ReturnType<typeof vi.fn<WashingtonGovernorFetchLike>>;
} {
  const mock = vi.fn<WashingtonGovernorFetchLike>(async () =>
    htmlResponse(html),
  );
  return { fetch: mock, mock };
}

const unchangedValidator = {
  validate(records: PolicyRecord[]): readonly PolicyRecord[] {
    return records;
  },
};

describe("configured refresh composition", () => {
  it("preserves the complete legacy surface and adapter identities", () => {
    expect(Object.keys(legacy).sort()).toEqual([
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID",
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION",
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION",
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_IDENTITY_RULE",
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL",
      "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID",
      "WASHINGTON_GOVERNOR_FILTER_LABEL",
      "WASHINGTON_GOVERNOR_FILTER_VALUE",
      "WASHINGTON_GOVERNOR_HTML_POLICY",
      "WASHINGTON_GOVERNOR_NORMALIZATION_RULES",
      "WASHINGTON_GOVERNOR_REQUIRED_ANCHOR",
      "WASHINGTON_GOVERNOR_SELECTED_FROM",
      "WASHINGTON_GOVERNOR_SELECTED_STATUS",
      "WASHINGTON_GOVERNOR_USER_AGENT",
      "WashingtonGovernorContractError",
      "WashingtonGovernorExecutiveOrdersAdapter",
      "WashingtonGovernorTransportError",
      "assertWashingtonGovernorExecutiveOrderProjection",
      "assertWashingtonGovernorExecutiveOrdersIndexUrl",
      "assertWashingtonGovernorExecutiveOrdersSourceConfig",
      "buildWashingtonGovernorExecutiveOrdersIndexUrl",
      "createWashingtonGovernorExecutiveOrdersAdapter",
      "fetchWashingtonGovernorExecutiveOrdersIndex",
      "normalizeWashingtonGovernorExecutiveOrder",
      "parseWashingtonGovernorExecutiveOrdersIndex",
      "refreshWashingtonGovernorExecutiveOrdersSource",
      "washingtonGovernorExecutiveOrderStableRecordId",
      "washingtonGovernorSourceRecordId",
    ]);
    expect(legacy.WashingtonGovernorExecutiveOrdersAdapter).toBe(
      direct.WashingtonGovernorExecutiveOrdersAdapter,
    );
    expect(legacy.createWashingtonGovernorExecutiveOrdersAdapter).toBe(
      direct.createWashingtonGovernorExecutiveOrdersAdapter,
    );
    expect(legacy.refreshWashingtonGovernorExecutiveOrdersSource).toBe(
      configured.refreshWashingtonGovernorExecutiveOrdersSource,
    );
  });

  it("binds canonical taxonomy and preserves direct refresh results", async () => {
    const context = enabledContext();
    const injectedTaxonomy = structuredClone(
      taxonomy,
    ) as unknown as TaxonomyConfig;
    const policyBarrier = vi.spyOn(policyValidation, "validateRecordSetPolicy");
    const externalValidator = vi.fn((records: PolicyRecord[]) => {
      expect(policyBarrier.mock.calls.length).toBe(
        externalValidator.mock.calls.length,
      );
      return records;
    });
    try {
      const configuredResult =
        await configured.refreshWashingtonGovernorExecutiveOrdersSource(
          createWashingtonGovernorExecutiveOrdersAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          { validate: externalValidator },
        );
      const directResult =
        await direct.refreshWashingtonGovernorExecutiveOrdersSourceWithTaxonomy(
          createWashingtonGovernorExecutiveOrdersAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          { validate: externalValidator },
          injectedTaxonomy,
        );
      expect(configuredResult.ok).toBe(true);
      expect(directResult).toEqual(configuredResult);
      expect(externalValidator).toHaveBeenCalledTimes(2);
      expect(policyBarrier).toHaveBeenCalledTimes(2);
      expect(policyBarrier.mock.calls[0]?.[1].taxonomy).toBe(taxonomy);
      expect(policyBarrier.mock.calls[1]?.[1].taxonomy).toBe(injectedTaxonomy);
      for (const [, options] of policyBarrier.mock.calls) {
        expect(
          options.sourceRegistry.sources.find(
            ({ id }) => id === context.source.id,
          ),
        ).toBe(context.source);
      }
    } finally {
      policyBarrier.mockRestore();
    }
  });

  it("keeps mandatory policy refusal ahead of caller validation on both routes", async () => {
    const context = enabledContext();
    const externalValidator = vi.fn((records: PolicyRecord[]) => records);
    const policyBarrier = vi
      .spyOn(policyValidation, "validateRecordSetPolicy")
      .mockImplementation(() => {
        throw new Error("Synthetic mandatory policy refusal");
      });
    try {
      const configuredResult =
        await configured.refreshWashingtonGovernorExecutiveOrdersSource(
          createWashingtonGovernorExecutiveOrdersAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          { validate: externalValidator },
        );
      const directResult =
        await direct.refreshWashingtonGovernorExecutiveOrdersSourceWithTaxonomy(
          createWashingtonGovernorExecutiveOrdersAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          { validate: externalValidator },
          taxonomy as unknown as TaxonomyConfig,
        );
      expect(configuredResult).toMatchObject({
        ok: false,
        failureStage: "validation",
      });
      expect(directResult).toEqual(configuredResult);
      expect(policyBarrier).toHaveBeenCalledTimes(2);
      expect(externalValidator).not.toHaveBeenCalled();
    } finally {
      policyBarrier.mockRestore();
    }
  });
});

async function references(
  adapter: WashingtonGovernorExecutiveOrdersAdapter,
  context: BuildContext,
): Promise<SourceReference[]> {
  const values: SourceReference[] = [];
  for await (const reference of adapter.discover(context)) {
    values.push(reference);
  }
  return values;
}

describe("Washington Governor executive-order adapter lifecycle", () => {
  it("refreshes atomically with one index request and no PDF-body request", async () => {
    const transport = fixtureFetch();
    const context = enabledContext();
    const result = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: transport.fetch,
      }),
      context,
      unchangedValidator,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful synthetic refresh");
    }
    expect(transport.mock).toHaveBeenCalledTimes(1);
    expect(transport.mock.mock.calls.map(([input]) => String(input))).toEqual([
      WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
    ]);
    expect(result.records).toHaveLength(2);
    expect(result.records.map(({ source }) => source.recordId)).toEqual([
      "99-01@2099-01-02",
      "25-01@2025-01-15",
    ]);
    expect(
      result.records.every(
        (record) =>
          record.texts.officialSummary === null &&
          record.texts.sourceExcerpt === null &&
          record.nationAssociations.length === 0 &&
          record.taxonomyMemberships.length === 0,
      ),
    ).toBe(true);
    expect(result.health).toEqual({
      sourceId: "washington-governor-executive-orders",
      status: "healthy",
      checkedAt: context.generatedAt,
      dataAsOf: context.generatedAt,
      lastSuccessfulRetrievalAt: context.generatedAt,
      usingLastKnownGood: false,
      stale: false,
      recordCount: 2,
      failureStage: null,
      message: null,
    });
  });

  it("checks the fixed local contract before making the sole discovery request", async () => {
    const transport = fixtureFetch();
    const context = enabledContext();
    const adapter = createWashingtonGovernorExecutiveOrdersAdapter({
      fetch: transport.fetch,
    });
    await expect(adapter.checkContract(context)).resolves.toEqual({
      ok: true,
      checkedAt: context.generatedAt,
      message: null,
    });
    expect(transport.mock).not.toHaveBeenCalled();
    const discovered = await references(adapter, context);
    expect(transport.mock).toHaveBeenCalledTimes(1);
    expect(discovered).toEqual([
      {
        sourceRecordId: "99-01@2099-01-02",
        officialUrl:
          "https://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf",
        sourceUpdatedAt: null,
        cursor: null,
      },
      {
        sourceRecordId: "25-01@2025-01-15",
        officialUrl:
          "https://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-25-01.pdf",
        sourceUpdatedAt: null,
        cursor: null,
      },
    ]);
  });

  it("requires identical context and a fully consumed discovery iterator", async () => {
    const context = enabledContext();
    const firstAdapter = createWashingtonGovernorExecutiveOrdersAdapter({
      fetch: fixtureFetch().fetch,
    });
    await expect(references(firstAdapter, context)).rejects.toThrow(
      /requires a successful contract check/,
    );

    const secondAdapter = createWashingtonGovernorExecutiveOrdersAdapter({
      fetch: fixtureFetch().fetch,
    });
    await secondAdapter.checkContract(context);
    const iterator = secondAdapter.discover(context)[Symbol.asyncIterator]();
    const first = await iterator.next();
    expect(first.done).toBe(false);
    await iterator.return?.();
    await expect(
      secondAdapter.fetch(first.value as SourceReference, context),
    ).rejects.toThrow(/requires a completed inventory/);

    const thirdAdapter = createWashingtonGovernorExecutiveOrdersAdapter({
      fetch: fixtureFetch().fetch,
    });
    await thirdAdapter.checkContract(context);
    const complete = await references(thirdAdapter, context);
    const changed = { ...context, buildId: "changed-build" };
    await expect(thirdAdapter.fetch(complete[0]!, changed)).rejects.toThrow(
      /identical build context/,
    );
  });

  it("rejects reference, duplicate-fetch, and fetched-body tampering", async () => {
    const context = enabledContext();
    const wrongReferenceAdapter =
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch().fetch,
      });
    await wrongReferenceAdapter.checkContract(context);
    const wrongReferenceInventory = await references(
      wrongReferenceAdapter,
      context,
    );
    await expect(
      wrongReferenceAdapter.fetch(
        {
          ...wrongReferenceInventory[0]!,
          officialUrl: "https://governor.wa.gov/unreviewed.pdf",
        },
        context,
      ),
    ).rejects.toThrow(/differs from its validated inventory/);

    const duplicateFetchAdapter =
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch().fetch,
      });
    await duplicateFetchAdapter.checkContract(context);
    const duplicateFetchInventory = await references(
      duplicateFetchAdapter,
      context,
    );
    await duplicateFetchAdapter.fetch(duplicateFetchInventory[0]!, context);
    await expect(
      duplicateFetchAdapter.fetch(duplicateFetchInventory[0]!, context),
    ).rejects.toThrow(/differs from its validated inventory/);

    const bodyAdapter = createWashingtonGovernorExecutiveOrdersAdapter({
      fetch: fixtureFetch().fetch,
    });
    await bodyAdapter.checkContract(context);
    const bodyInventory = await references(bodyAdapter, context);
    const fetched = await bodyAdapter.fetch(bodyInventory[0]!, context);
    (fetched.body as { title: string }).title = "REJECTED_FETCH_BODY_SENTINEL";
    await expect(bodyAdapter.normalize(fetched, context)).rejects.toThrow(
      /one unmodified fetch result/,
    );
  });

  it("returns fixed source-wide failures for each reachable refresh barrier", async () => {
    const context = enabledContext();

    const contract = await refreshWashingtonGovernorExecutiveOrdersSource(
      {} as never,
      context,
      unchangedValidator,
    );
    expect(contract).toMatchObject({
      ok: false,
      failureStage: "contract",
      publicMessage:
        "Washington Governor executive-order contract validation failed.",
    });

    const discovery = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch(fixture.replace(">Number<", ">REJECTED_SENTINEL<"))
          .fetch,
      }),
      context,
      unchangedValidator,
    );
    expect(discovery).toMatchObject({
      ok: false,
      failureStage: "discovery",
      publicMessage:
        "Washington Governor executive-order index discovery failed.",
    });
    expect(JSON.stringify(discovery)).not.toContain("REJECTED_SENTINEL");

    const originalFetch =
      WashingtonGovernorExecutiveOrdersAdapter.prototype.fetch;
    let fetchCalls = 0;
    const fetchSpy = vi
      .spyOn(WashingtonGovernorExecutiveOrdersAdapter.prototype, "fetch")
      .mockImplementation(async function (
        this: WashingtonGovernorExecutiveOrdersAdapter,
        reference,
        buildContext,
      ) {
        fetchCalls += 1;
        if (fetchCalls === 2) {
          throw new Error("synthetic fetch failure");
        }
        return originalFetch.call(this, reference, buildContext);
      });
    try {
      const fetchFailure = await refreshWashingtonGovernorExecutiveOrdersSource(
        createWashingtonGovernorExecutiveOrdersAdapter({
          fetch: fixtureFetch().fetch,
        }),
        context,
        unchangedValidator,
      );
      expect(fetchFailure).toMatchObject({
        ok: false,
        failureStage: "fetch",
        publicMessage:
          "Washington Governor executive-order metadata retrieval failed.",
      });
      expect(fetchCalls).toBe(2);
      expect("records" in fetchFailure).toBe(false);
      expect("health" in fetchFailure).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }

    const originalNormalize =
      WashingtonGovernorExecutiveOrdersAdapter.prototype.normalize;
    let normalizeCalls = 0;
    const normalizeSpy = vi
      .spyOn(WashingtonGovernorExecutiveOrdersAdapter.prototype, "normalize")
      .mockImplementation(async function (
        this: WashingtonGovernorExecutiveOrdersAdapter,
        fetched,
        buildContext,
      ) {
        normalizeCalls += 1;
        if (normalizeCalls === 2) {
          throw new Error("synthetic normalize failure");
        }
        return originalNormalize.call(this, fetched, buildContext);
      });
    try {
      const normalizeFailure =
        await refreshWashingtonGovernorExecutiveOrdersSource(
          createWashingtonGovernorExecutiveOrdersAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          unchangedValidator,
        );
      expect(normalizeFailure).toMatchObject({
        ok: false,
        failureStage: "normalize",
        publicMessage:
          "Washington Governor executive-order normalization failed.",
      });
      expect(normalizeCalls).toBe(2);
      expect("records" in normalizeFailure).toBe(false);
      expect("health" in normalizeFailure).toBe(false);
    } finally {
      normalizeSpy.mockRestore();
    }

    const validation = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch().fetch,
      }),
      context,
      {
        validate(records) {
          return structuredClone(records);
        },
      },
    );
    expect(validation).toMatchObject({
      ok: false,
      failureStage: "validation",
      publicMessage:
        "Washington Governor executive-order record validation failed.",
    });
  });

  it("rejects validator mutation even when it returns the same array", async () => {
    const result = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch().fetch,
      }),
      enabledContext(),
      {
        validate(records) {
          records[0]!.officialTitle = "MUTATED_VALIDATOR_SENTINEL";
          return records;
        },
      },
    );
    expect(result).toMatchObject({
      ok: false,
      failureStage: "validation",
    });
    expect(JSON.stringify(result)).not.toContain("MUTATED_VALIDATOR_SENTINEL");
  });

  it("uses only same-source last-known-good state and otherwise becomes unavailable", async () => {
    const context = enabledContext();
    const successful = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch().fetch,
      }),
      context,
      unchangedValidator,
    );
    if (!successful.ok) {
      throw new Error("expected successful synthetic refresh");
    }
    const failed = await refreshWashingtonGovernorExecutiveOrdersSource(
      createWashingtonGovernorExecutiveOrdersAdapter({
        fetch: fixtureFetch(fixture.replace(">Number<", ">REJECTED_SENTINEL<"))
          .fetch,
      }),
      {
        ...context,
        generatedAt: "2099-01-10T00:00:00.000Z",
      },
      unchangedValidator,
    );
    expect(failed.ok).toBe(false);

    const merged = mergeSourceRefresh({
      sourceId: "washington-governor-executive-orders",
      refresh: failed,
      previousRecords: successful.records,
      previousHealth: successful.health,
    });
    expect(merged.records).toHaveLength(2);
    expect(merged.health).toMatchObject({
      sourceId: "washington-governor-executive-orders",
      status: "degraded",
      checkedAt: "2099-01-10T00:00:00.000Z",
      dataAsOf: "2099-01-03T00:00:00.000Z",
      lastSuccessfulRetrievalAt: "2099-01-03T00:00:00.000Z",
      usingLastKnownGood: true,
      stale: true,
      recordCount: 2,
      failureStage: "discovery",
    });
    expect(
      merged.records.every(
        ({ sourceHealth }) =>
          sourceHealth.status === "degraded" &&
          sourceHealth.dataAsOf === "2099-01-03T00:00:00.000Z" &&
          sourceHealth.usingLastKnownGood,
      ),
    ).toBe(true);

    const unavailable = mergeSourceRefresh({
      sourceId: "washington-governor-executive-orders",
      refresh: failed,
    });
    expect(unavailable).toMatchObject({
      records: [],
      health: {
        sourceId: "washington-governor-executive-orders",
        status: "unavailable",
        recordCount: 0,
        usingLastKnownGood: false,
      },
    });

    const foreignRecord = structuredClone(
      successful.records[0],
    ) as PolicyRecord;
    foreignRecord.source.id = "washington-state-register";
    const foreignHealth = {
      ...structuredClone(successful.health),
      sourceId: "washington-state-register",
    } satisfies SourceHealth;
    expect(() =>
      mergeSourceRefresh({
        sourceId: "washington-governor-executive-orders",
        refresh: failed,
        previousRecords: [foreignRecord],
        previousHealth: successful.health,
      }),
    ).toThrow(/previous records do not match requested source/);
    expect(() =>
      mergeSourceRefresh({
        sourceId: "washington-governor-executive-orders",
        refresh: failed,
        previousRecords: successful.records,
        previousHealth: foreignHealth,
      }),
    ).toThrow(/previous health does not match requested source/);
  });
});
