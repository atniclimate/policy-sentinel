import { describe, expect, it, vi } from "vitest";

import {
  SUPREME_COURT_SELECTED_OPINION,
  SUPREME_COURT_TERM_URL,
  SupremeCourtCuratedOpinionsAdapter,
  createSupremeCourtCuratedOpinionsAdapter,
  refreshSupremeCourtCuratedOpinionsSource,
} from "../../../src/adapters/supreme-court-opinions-curated";
import type {
  BuildContext,
  SourceReference,
} from "../../../src/pipeline/source-adapter";
import { mergeSourceRefresh } from "../../../src/pipeline/last-known-good.mjs";
import type { PolicyRecord, SourceHealth } from "../../../src/shared/contracts";
import {
  fixtureFetch,
  supremeCourtContext,
  supremeCourtFixture,
} from "./test-helpers";

const unchangedValidator = {
  validate(records: PolicyRecord[]): readonly PolicyRecord[] {
    return records;
  },
};

async function references(
  adapter: SupremeCourtCuratedOpinionsAdapter,
  context: BuildContext,
): Promise<SourceReference[]> {
  const values: SourceReference[] = [];
  for await (const reference of adapter.discover(context)) {
    values.push(reference);
  }
  return values;
}

describe("Supreme Court curated-opinion adapter lifecycle", () => {
  it("refreshes atomically with one term-index GET and zero bound-volume requests", async () => {
    const transport = fixtureFetch();
    const context = supremeCourtContext();
    const result = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({ fetch: transport.fetch }),
      context,
      unchangedValidator,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful synthetic refresh");
    }
    expect(transport.mock).toHaveBeenCalledTimes(1);
    expect(transport.mock.mock.calls.map(([input]) => String(input))).toEqual([
      SUPREME_COURT_TERM_URL,
    ]);
    expect(
      transport.mock.mock.calls.some(
        ([input]) =>
          String(input) === SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl,
      ),
    ).toBe(false);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      source: {
        recordId: "16-1498@586 U.S. 347",
      },
      judicialContext: {
        decisionDate: "2019-03-19",
        citations: [
          {
            value: "586 U.S. 347",
            sourceUrl: SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl,
          },
        ],
      },
      urls: { officialSource: SUPREME_COURT_TERM_URL, officialFullText: null },
      nationAssociations: [],
      taxonomyMemberships: [],
      landmark: {
        isLandmark: true,
        criterionCodes: ["documented-court-decision"],
        reviewState: "approved",
      },
    });
    expect(result.health).toEqual({
      sourceId: "supreme-court-opinions-curated",
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
  });

  it("checks the fixed local contract before its sole discovery request", async () => {
    const transport = fixtureFetch();
    const context = supremeCourtContext();
    const adapter = createSupremeCourtCuratedOpinionsAdapter({
      fetch: transport.fetch,
    });
    await expect(adapter.checkContract(context)).resolves.toEqual({
      ok: true,
      checkedAt: context.generatedAt,
      message: null,
    });
    expect(transport.mock).not.toHaveBeenCalled();
    await expect(references(adapter, context)).resolves.toEqual([
      {
        sourceRecordId: "16-1498@586 U.S. 347",
        officialUrl: SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl,
        sourceUpdatedAt: null,
        cursor: null,
      },
    ]);
    expect(transport.mock).toHaveBeenCalledTimes(1);
  });

  it("requires identical context and a completely consumed discovery iterator", async () => {
    const context = supremeCourtContext();
    const unchecked = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await expect(references(unchecked, context)).rejects.toThrow(
      /requires a successful contract check/,
    );

    const partial = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await partial.checkContract(context);
    const iterator = partial.discover(context)[Symbol.asyncIterator]();
    const first = await iterator.next();
    expect(first.done).toBe(false);
    await iterator.return?.();
    await expect(
      partial.fetch(first.value as SourceReference, context),
    ).rejects.toThrow(/requires a completed inventory/);

    const changed = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await changed.checkContract(context);
    const complete = await references(changed, context);
    await expect(
      changed.fetch(complete[0]!, { ...context, buildId: "changed-build" }),
    ).rejects.toThrow(/identical build context/);
  });

  it("rejects reference, duplicate-fetch, and fetched-body tampering", async () => {
    const context = supremeCourtContext();

    const wrongReference = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await wrongReference.checkContract(context);
    const wrongInventory = await references(wrongReference, context);
    await expect(
      wrongReference.fetch(
        {
          ...wrongInventory[0]!,
          officialUrl:
            "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=547",
        },
        context,
      ),
    ).rejects.toThrow(/differs from its validated inventory/);

    const duplicate = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await duplicate.checkContract(context);
    const duplicateInventory = await references(duplicate, context);
    await duplicate.fetch(duplicateInventory[0]!, context);
    await expect(
      duplicate.fetch(duplicateInventory[0]!, context),
    ).rejects.toThrow(/differs from its validated inventory/);

    const tampered = createSupremeCourtCuratedOpinionsAdapter({
      fetch: fixtureFetch().fetch,
    });
    await tampered.checkContract(context);
    const tamperedInventory = await references(tampered, context);
    const fetched = await tampered.fetch(tamperedInventory[0]!, context);
    (fetched.body as { caseName: string }).caseName =
      "REJECTED_FETCH_BODY_SENTINEL";
    await expect(tampered.normalize(fetched, context)).rejects.toThrow(
      /one unmodified fetch result/,
    );
  });

  it("returns fixed source-wide failures for reachable refresh barriers", async () => {
    const context = supremeCourtContext();
    await expect(
      refreshSupremeCourtCuratedOpinionsSource(
        {} as never,
        context,
        unchangedValidator,
      ),
    ).resolves.toMatchObject({
      ok: false,
      failureStage: "contract",
      publicMessage:
        "Supreme Court curated-opinion contract validation failed.",
    });

    const discovery = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({
        fetch: fixtureFetch(
          supremeCourtFixture.replace(
            "Opinions of the Court - 2018",
            "REJECTED_DISCOVERY_SENTINEL",
          ),
        ).fetch,
      }),
      context,
      unchangedValidator,
    );
    expect(discovery).toMatchObject({
      ok: false,
      failureStage: "discovery",
      publicMessage: "Supreme Court curated-opinion index discovery failed.",
    });
    expect(JSON.stringify(discovery)).not.toContain(
      "REJECTED_DISCOVERY_SENTINEL",
    );

    const originalFetch = SupremeCourtCuratedOpinionsAdapter.prototype.fetch;
    const fetchSpy = vi
      .spyOn(SupremeCourtCuratedOpinionsAdapter.prototype, "fetch")
      .mockImplementation(async function (
        this: SupremeCourtCuratedOpinionsAdapter,
        reference,
        buildContext,
      ) {
        await originalFetch.call(this, reference, buildContext);
        throw new Error("synthetic fetch barrier failure");
      });
    try {
      await expect(
        refreshSupremeCourtCuratedOpinionsSource(
          createSupremeCourtCuratedOpinionsAdapter({
            fetch: fixtureFetch().fetch,
          }),
          context,
          unchangedValidator,
        ),
      ).resolves.toMatchObject({
        ok: false,
        failureStage: "fetch",
        publicMessage:
          "Supreme Court curated-opinion metadata retrieval failed.",
      });
    } finally {
      fetchSpy.mockRestore();
    }

    const validation = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({ fetch: fixtureFetch().fetch }),
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
      publicMessage: "Supreme Court curated-opinion record validation failed.",
    });
  });

  it("rejects validator mutation even when it returns the same array", async () => {
    const result = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({ fetch: fixtureFetch().fetch }),
      supremeCourtContext(),
      {
        validate(records) {
          records[0]!.officialTitle = "MUTATED_VALIDATOR_SENTINEL";
          return records;
        },
      },
    );
    expect(result).toMatchObject({ ok: false, failureStage: "validation" });
    expect(JSON.stringify(result)).not.toContain("MUTATED_VALIDATOR_SENTINEL");
  });

  it("uses only same-source last-known-good state and otherwise becomes unavailable", async () => {
    const context = supremeCourtContext();
    const successful = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({ fetch: fixtureFetch().fetch }),
      context,
      unchangedValidator,
    );
    if (!successful.ok) {
      throw new Error("expected successful synthetic refresh");
    }
    const failed = await refreshSupremeCourtCuratedOpinionsSource(
      createSupremeCourtCuratedOpinionsAdapter({
        fetch: fixtureFetch(
          supremeCourtFixture.replace(
            "Opinions of the Court - 2018",
            "REJECTED_LKG_SENTINEL",
          ),
        ).fetch,
      }),
      { ...context, generatedAt: "2026-08-07T20:00:00.000Z" },
      unchangedValidator,
    );
    expect(failed.ok).toBe(false);

    const merged = mergeSourceRefresh({
      sourceId: "supreme-court-opinions-curated",
      refresh: failed,
      previousRecords: successful.records,
      previousHealth: successful.health,
    });
    expect(merged.records).toHaveLength(1);
    expect(merged.health).toMatchObject({
      sourceId: "supreme-court-opinions-curated",
      status: "degraded",
      checkedAt: "2026-08-07T20:00:00.000Z",
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
        sourceId: "supreme-court-opinions-curated",
        refresh: failed,
      }),
    ).toMatchObject({
      records: [],
      health: {
        sourceId: "supreme-court-opinions-curated",
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
        sourceId: "supreme-court-opinions-curated",
        refresh: failed,
        previousRecords: [foreignRecord],
        previousHealth: successful.health,
      }),
    ).toThrow(/previous records do not match requested source/);
    expect(() =>
      mergeSourceRefresh({
        sourceId: "supreme-court-opinions-curated",
        refresh: failed,
        previousRecords: successful.records,
        previousHealth: foreignHealth,
      }),
    ).toThrow(/previous health does not match requested source/);
  });
});
