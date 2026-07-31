import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadArtifacts,
  loadRecordDetail,
  normalizeRecord,
} from "../../src/app/data";

const SOURCE_ID = "synthetic-source";

const compactRecord = () => ({
  id: "psr:synthetic:record-1",
  detailPath: "details/record_1.json",
  officialTitle: "Synthetic official record",
  sourceDocumentIdentifier: "SYN-1",
  documentType: "notice",
  source: {
    id: SOURCE_ID,
    name: "Synthetic Official Source",
    provider: "Synthetic Public Agency",
  },
  issuingBodies: ["Synthetic Public Agency"],
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
  },
  status: { normalized: "active", sourceLabel: "Open", asOf: "2026-07-31" },
  dates: { published: "2026-07-31", retrieved: "2026-07-31T12:00:00Z" },
  urls: {
    officialSource: "https://official.example.invalid/records/SYN-1",
  },
  taxonomyMemberships: [
    {
      categoryId: "category-a",
      subcategoryId: "subcategory-a",
    },
  ],
  isUnclassified: false,
  relevance: [
    {
      basis: "general_jurisdiction",
      label: "General federal jurisdiction",
    },
  ],
});

const rootAssets = (records: unknown[] = [compactRecord()]) =>
  new Map<string, unknown>([
    [
      "data/manifest.json",
      {
        buildId: "synthetic-integrity",
        generatedAt: "2026-07-31T12:00:00Z",
        dataAsOf: "2026-07-31T00:00:00Z",
        recordCount: records.length,
      },
    ],
    ["data/coverage.json", { entries: [] }],
    [
      "data/source-health.json",
      {
        sources:
          records.length === 0
            ? []
            : [
                {
                  sourceId: SOURCE_ID,
                  sourceName: "Synthetic Official Source",
                  status: "degraded",
                  dataAsOf: "2026-07-30T00:00:00Z",
                  lastSuccessfulRetrievalAt: "2026-07-30T12:00:00Z",
                  usingLastKnownGood: true,
                  message: "Using a validated prior public shard.",
                },
              ],
      },
    ],
    [
      "data/nations.json",
      {
        nations: [
          {
            id: "nation:synthetic",
            officialName: "Synthetic Nation",
            stateCoverage: { states: [], federalOnly: true },
          },
        ],
      },
    ],
    [
      "data/taxonomy.json",
      {
        taxonomyVersion: "1.0.0",
        categories: [
          {
            id: "category-a",
            label: "Category A",
            subcategories: [
              {
                id: "subcategory-a",
                label: "Subcategory A",
                description: "Synthetic taxonomy entry.",
              },
            ],
          },
        ],
      },
    ],
    ["data/index/records.json", { records }],
  ]);

const installAssetFetch = (assets: Map<string, unknown>) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const pathname = new URL(raw, document.baseURI).pathname;
    const entry = [...assets.entries()].find(([path]) =>
      pathname.endsWith(`/${path}`),
    );
    return entry
      ? new Response(JSON.stringify(entry[1]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("same-origin artifact integrity", () => {
  it("requires every root artifact and never synthesizes coverage or health", async () => {
    const incomplete = rootAssets([]);
    incomplete.delete("data/coverage.json");
    installAssetFetch(incomplete);

    await expect(loadArtifacts()).rejects.toThrow(
      "required same-origin artifact data/coverage.json",
    );

    installAssetFetch(rootAssets([]));
    const bundle = await loadArtifacts();
    expect(bundle.coverage).toEqual([]);
    expect(bundle.sourceHealth).toEqual([]);
  });

  it("overlays source health onto compact records by exact source ID", async () => {
    installAssetFetch(rootAssets());

    const bundle = await loadArtifacts();

    expect(bundle.records[0].sourceHealth).toEqual({
      status: "degraded",
      dataAsOf: "2026-07-30T00:00:00Z",
      lastSuccessfulRetrievalAt: "2026-07-30T12:00:00Z",
      usingLastKnownGood: true,
      message: "Using a validated prior public shard.",
    });
  });

  it.each([
    {
      label: "unknown category",
      membership: {
        categoryId: "unknown-category",
        subcategoryId: "subcategory-a",
      },
      message: "uses unknown category unknown-category",
    },
    {
      label: "unknown category/subcategory pair",
      membership: {
        categoryId: "category-a",
        subcategoryId: "unknown-subcategory",
      },
      message:
        "uses unknown category/subcategory pair category-a/unknown-subcategory",
    },
  ])(
    "rejects a mixed artifact with an $label",
    async ({ membership, message }) => {
      const record = compactRecord();
      record.taxonomyMemberships = [membership];
      installAssetFetch(rootAssets([record]));

      await expect(loadArtifacts()).rejects.toThrow(message);
    },
  );

  it("rejects an index classification flag inconsistent with its memberships", async () => {
    const record = compactRecord();
    record.taxonomyMemberships = [];
    record.isUnclassified = false;
    installAssetFetch(rootAssets([record]));

    await expect(loadArtifacts()).rejects.toThrow(
      "must set isUnclassified to true",
    );
  });
});

describe("detail asset integrity", () => {
  it("accepts only canonical relative detail paths", () => {
    expect(normalizeRecord(compactRecord())?.texts.detailPath).toBe(
      "data/details/record_1.json",
    );

    for (const detailPath of [
      "../manifest.json",
      "data/details/record_1.json",
      "details/../../manifest.json",
      "https://outside.example.invalid/detail.json",
      "details/record.1.json",
      "details/record_1.json?variant=other",
    ]) {
      expect(
        normalizeRecord({ ...compactRecord(), detailPath })?.texts.detailPath,
      ).toBeNull();
    }
  });

  it("rejects an invalid in-memory detail path before fetching", async () => {
    const record = normalizeRecord(compactRecord());
    expect(record).not.toBeNull();
    if (!record) return;
    record.texts.detailPath = "https://outside.example.invalid/detail.json";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadRecordDetail(record)).rejects.toThrow(
      "invalid detail asset path",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "internal ID",
      "ID does not match",
      (detail: ReturnType<typeof compactRecord>) => {
        detail.id = "psr:synthetic:different";
      },
    ],
    [
      "source ID",
      "source does not match",
      (detail: ReturnType<typeof compactRecord>) => {
        detail.source.id = "different-source";
      },
    ],
    [
      "source document identifier",
      "source document identifier does not match",
      (detail: ReturnType<typeof compactRecord>) => {
        detail.sourceDocumentIdentifier = "DIFFERENT";
      },
    ],
    [
      "official title",
      "title does not match",
      (detail: ReturnType<typeof compactRecord>) => {
        detail.officialTitle = "Different official title";
      },
    ],
    [
      "official source URL",
      "official source URL does not match",
      (detail: ReturnType<typeof compactRecord>) => {
        detail.urls.officialSource =
          "https://official.example.invalid/records/DIFFERENT";
      },
    ],
  ])(
    "rejects a detail whose %s differs from the index",
    async (_label, message, mutate) => {
      const record = normalizeRecord(compactRecord());
      expect(record).not.toBeNull();
      if (!record) return;
      const detail = structuredClone(compactRecord());
      mutate(detail);
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({ record: detail }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      );

      await expect(loadRecordDetail(record)).rejects.toThrow(message);
    },
  );
});
