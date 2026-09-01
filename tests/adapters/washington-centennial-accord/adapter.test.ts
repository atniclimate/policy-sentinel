import { describe, expect, it } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import {
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_URL,
  WashingtonCentennialAccordAdapter,
  createWashingtonCentennialAccordAdapter,
  refreshWashingtonCentennialAccordSource,
} from "../../../src/adapters/washington-centennial-accord";
import { mergeSourceRefresh } from "../../../src/pipeline/last-known-good.mjs";
import type {
  BuildContext,
  SourceReference,
} from "../../../src/pipeline/source-adapter";
import type {
  PolicyRecord,
  SourceConfig,
  SourceHealth,
} from "../../../src/shared/contracts";
import {
  fixtureTransport,
  goiaAccordContext,
  goiaAccordFixture,
} from "./test-helpers";

const unchangedValidator = {
  validate(records: PolicyRecord[]): readonly PolicyRecord[] {
    return records;
  },
};

async function references(
  adapter: WashingtonCentennialAccordAdapter,
  context: BuildContext,
): Promise<SourceReference[]> {
  const result: SourceReference[] = [];
  for await (const reference of adapter.discover(context)) {
    result.push(reference);
  }
  return result;
}

describe("GOIA Centennial Accord adapter lifecycle", () => {
  it("refreshes atomically with one page GET and a metadata-only record", async () => {
    const transport = fixtureTransport();
    const context = goiaAccordContext();
    const result = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        fetch: transport.fetch,
        resolveHostname: transport.resolveHostname,
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
      GOIA_ACCORD_URL,
    ]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      source: { recordId: "centennial-accord@1989-08-04" },
      officialTitle: GOIA_ACCORD_METADATA.instrumentTitle,
      documentType: "intergovernmental_accord",
      issuingBodies: [],
      status: { normalized: "unknown", sourceLabel: null, asOf: null },
      urls: { officialSource: GOIA_ACCORD_URL, officialFullText: null },
      nationAssociations: [],
      taxonomyMemberships: [],
      isUnclassified: true,
    });
    expect(result.health).toEqual({
      sourceId: "washington-centennial-accord",
      status: "healthy",
      checkedAt: context.generatedAt,
      dataAsOf: context.generatedAt,
      lastSuccessfulRetrievalAt: context.generatedAt,
      usingLastKnownGood: false,
      stale: false,
      recordCount: 1,
      failureStage: null,
      message: null,
    });
    expect(JSON.stringify(result)).not.toContain("3785");
    expect(JSON.stringify(result)).not.toContain("provider prose");
  });

  it("checks the exact local contract before the sole discovery request", async () => {
    const transport = fixtureTransport();
    const context = goiaAccordContext();
    const adapter = createWashingtonCentennialAccordAdapter({
      fetch: transport.fetch,
      resolveHostname: transport.resolveHostname,
    });
    await expect(adapter.checkContract(context)).resolves.toEqual({
      ok: true,
      checkedAt: context.generatedAt,
      message: null,
    });
    expect(transport.mock).not.toHaveBeenCalled();
    await expect(references(adapter, context)).resolves.toEqual([
      {
        sourceRecordId: "centennial-accord@1989-08-04",
        officialUrl: GOIA_ACCORD_URL,
        sourceUpdatedAt: null,
        cursor: null,
      },
    ]);
    expect(transport.mock).toHaveBeenCalledTimes(1);
  });

  it("keeps the registered disabled source unable to refresh", async () => {
    const disabled = structuredClone(
      sourceRegistry.sources.find(
        ({ id }) => id === "washington-centennial-accord",
      ),
    ) as unknown as SourceConfig;
    expect(disabled.enabled).toBe(false);
    expect(disabled.adapter).toMatchObject({
      id: "washington-centennial-accord-adapter",
      version: "1.0.0",
    });
    const transport = fixtureTransport();
    const result = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        fetch: transport.fetch,
        resolveHostname: transport.resolveHostname,
      }),
      { ...goiaAccordContext(), source: disabled },
      unchangedValidator,
    );
    expect(result).toMatchObject({
      ok: false,
      sourceId: "washington-centennial-accord",
      failureStage: "contract",
    });
    expect(transport.mock).not.toHaveBeenCalled();
  });

  it("requires identical lifecycle context and unmodified issued values", async () => {
    const context = goiaAccordContext();
    const transport = fixtureTransport();
    const adapter = createWashingtonCentennialAccordAdapter({
      fetch: transport.fetch,
      resolveHostname: transport.resolveHostname,
    });
    await expect(references(adapter, context)).rejects.toThrow(
      /requires a successful contract check/,
    );
    await adapter.checkContract(context);
    const [reference] = await references(adapter, context);
    const changed = {
      ...context,
      buildId: "different-fictional-build",
    };
    await expect(
      adapter.fetch(reference as SourceReference, changed),
    ).rejects.toThrow(/identical build context/);

    const secondTransport = fixtureTransport();
    const second = createWashingtonCentennialAccordAdapter({
      fetch: secondTransport.fetch,
      resolveHostname: secondTransport.resolveHostname,
    });
    await second.checkContract(context);
    const [secondReference] = await references(second, context);
    const fetched = await second.fetch(
      secondReference as SourceReference,
      context,
    );
    (fetched.body as { executionDate: string }).executionDate = "1989-08-05";
    await expect(second.normalize(fetched, context)).rejects.toThrow(
      /unmodified active fetch result/,
    );
  });

  it("sanitizes source and validator failures into fixed refresh stages", async () => {
    const invalid = fixtureTransport(
      goiaAccordFixture.replace(
        "Centennial Accord</h1>",
        "FORBIDDEN_PROVIDER_DETAIL</h1>",
      ),
    );
    const failed = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        fetch: invalid.fetch,
        resolveHostname: invalid.resolveHostname,
      }),
      goiaAccordContext(),
      unchangedValidator,
    );
    expect(failed).toMatchObject({ ok: false, failureStage: "discovery" });
    expect(JSON.stringify(failed)).not.toContain("FORBIDDEN_PROVIDER_DETAIL");

    const valid = fixtureTransport();
    const validatorFailure = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        fetch: valid.fetch,
        resolveHostname: valid.resolveHostname,
      }),
      goiaAccordContext(),
      {
        validate() {
          throw new Error("FORBIDDEN_VALIDATOR_DETAIL");
        },
      },
    );
    expect(validatorFailure).toMatchObject({
      ok: false,
      failureStage: "validation",
    });
    expect(JSON.stringify(validatorFailure)).not.toContain(
      "FORBIDDEN_VALIDATOR_DETAIL",
    );
  });

  it("uses only same-source last-known-good state and otherwise becomes unavailable", async () => {
    const context = goiaAccordContext();
    const successful = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        ...fixtureTransport(),
      }),
      context,
      unchangedValidator,
    );
    if (!successful.ok) {
      throw new Error("expected successful synthetic refresh");
    }
    const brokenTransport = fixtureTransport(
      goiaAccordFixture.replace(
        "have executed this Accord",
        "REJECTED_LKG_SENTINEL",
      ),
    );
    const failed = await refreshWashingtonCentennialAccordSource(
      createWashingtonCentennialAccordAdapter({
        fetch: brokenTransport.fetch,
        resolveHostname: brokenTransport.resolveHostname,
      }),
      { ...context, generatedAt: "2026-08-10T20:00:00.000Z" },
      unchangedValidator,
    );
    expect(failed.ok).toBe(false);

    const merged = mergeSourceRefresh({
      sourceId: "washington-centennial-accord",
      refresh: failed,
      previousRecords: successful.records,
      previousHealth: successful.health,
    });
    expect(merged.records).toHaveLength(1);
    expect(merged.health).toMatchObject({
      sourceId: "washington-centennial-accord",
      status: "degraded",
      checkedAt: "2026-08-10T20:00:00.000Z",
      dataAsOf: context.generatedAt,
      lastSuccessfulRetrievalAt: context.generatedAt,
      usingLastKnownGood: true,
      stale: true,
      recordCount: 1,
      failureStage: "discovery",
    });
    expect(merged.records[0]?.sourceHealth).toMatchObject({
      status: "degraded",
      dataAsOf: context.generatedAt,
      usingLastKnownGood: true,
    });

    expect(
      mergeSourceRefresh({
        sourceId: "washington-centennial-accord",
        refresh: failed,
      }),
    ).toMatchObject({
      records: [],
      health: {
        sourceId: "washington-centennial-accord",
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
        sourceId: "washington-centennial-accord",
        refresh: failed,
        previousRecords: [foreignRecord],
        previousHealth: successful.health,
      }),
    ).toThrow(/previous records do not match requested source/);
    expect(() =>
      mergeSourceRefresh({
        sourceId: "washington-centennial-accord",
        refresh: failed,
        previousRecords: successful.records,
        previousHealth: foreignHealth,
      }),
    ).toThrow(/previous health does not match requested source/);
  });

  it("rejects forged adapter implementations before any source request", async () => {
    const transport = fixtureTransport();
    const real = createWashingtonCentennialAccordAdapter({
      fetch: transport.fetch,
      resolveHostname: transport.resolveHostname,
    });
    const forged = Object.create(real) as WashingtonCentennialAccordAdapter;
    const result = await refreshWashingtonCentennialAccordSource(
      forged,
      goiaAccordContext(),
      unchangedValidator,
    );
    expect(result).toMatchObject({ ok: false, failureStage: "contract" });
    expect(transport.mock).not.toHaveBeenCalled();
  });
});
