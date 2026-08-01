import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadArtifacts,
  loadRecordDetail,
  normalizeRecord,
} from "../../src/app/data";

const SOURCE_ID = "synthetic-source";
const GENERATED_AT = "2026-07-31T12:00:00Z";

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
  judicialContext: null,
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

const judicialContext = () => ({
  adjudicatingBody: {
    kind: "court",
    sourceId: null,
    officialName: "Synthetic Supreme Court",
  },
  docketNumbers: ["SYN-DOCKET"],
  citations: [
    {
      kind: "reporter",
      value: "999 U.S. 1",
      sourceUrl: "https://official.example.invalid/opinions/999.pdf#page=1",
    },
  ],
  decisionDate: "2019-03-19",
  documentForm: {
    normalized: "opinion",
    sourceLabel: "Opinions of the Court",
  },
  publicationStatus: {
    normalized: "bound_volume",
    sourceLabel: "U.S. Reports, Volume 999",
    asOf: "2026-07-31",
  },
  revisionReview: {
    state: "no_separate_relationship_exposed",
    reviewedOn: "2026-07-31",
  },
});

const judicialCompactRecord = () => ({
  ...compactRecord(),
  documentType: "court_decision",
  issuingBodies: ["Synthetic Supreme Court"],
  judicialContext: judicialContext(),
});

const rootAssets = (records: unknown[] = [compactRecord()]) =>
  new Map<string, unknown>([
    [
      "data/manifest.json",
      {
        artifactVersion: "1.3.0",
        recordSchemaVersion: "1.3.0",
        buildId: "synthetic-integrity",
        generatedAt: GENERATED_AT,
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
  it("fails closed before normalization for a legacy artifact package", async () => {
    const legacy = rootAssets();
    const manifest = legacy.get("data/manifest.json") as Record<
      string,
      unknown
    >;
    manifest.artifactVersion = "1.0.0";
    installAssetFetch(legacy);

    await expect(loadArtifacts()).rejects.toThrow(
      "requires artifact package 1.3.0; received 1.0.0",
    );
  });

  it("fails closed before normalization for a legacy record schema", async () => {
    const legacy = rootAssets();
    const manifest = legacy.get("data/manifest.json") as Record<
      string,
      unknown
    >;
    manifest.recordSchemaVersion = "1.1.0";
    installAssetFetch(legacy);

    await expect(loadArtifacts()).rejects.toThrow(
      "requires record schema 1.3.0; received 1.1.0",
    );
  });

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
      label: "court decision without judicial context",
      record: { ...judicialCompactRecord(), judicialContext: null },
    },
    {
      label: "non-judicial record with judicial context",
      record: { ...judicialCompactRecord(), documentType: "notice" },
    },
    {
      label: "court decision with an administrative body kind",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          adjudicatingBody: {
            ...judicialContext().adjudicatingBody,
            kind: "administrative_body",
          },
        },
      },
    },
    {
      label: "court decision whose body is absent from issuing bodies",
      record: {
        ...judicialCompactRecord(),
        issuingBodies: ["Different Court"],
      },
    },
    {
      label: "impossible decision date",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          decisionDate: "2019-02-29",
        },
      },
    },
    {
      label: "impossible publication-status date",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          publicationStatus: {
            ...judicialContext().publicationStatus,
            asOf: "2026-07-32",
          },
        },
      },
    },
    {
      label: "non-ISO revision-review date",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          revisionReview: {
            ...judicialContext().revisionReview,
            reviewedOn: "07/31/2026",
          },
        },
      },
    },
    {
      label: "non-HTTPS citation URL",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          citations: [
            {
              ...judicialContext().citations[0],
              sourceUrl: "http://official.example.invalid/opinions/999.pdf",
            },
          ],
        },
      },
    },
    {
      label: "malformed docket mixed with a valid docket",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          docketNumbers: ["SYN-DOCKET", 42],
        },
      },
    },
    {
      label: "malformed citation mixed with a valid citation",
      record: {
        ...judicialCompactRecord(),
        judicialContext: {
          ...judicialContext(),
          citations: [
            ...judicialContext().citations,
            {
              kind: "reporter",
              value: "",
              sourceUrl:
                "https://official.example.invalid/opinions/malformed.pdf",
            },
          ],
        },
      },
    },
  ])("rejects a current package containing $label", async ({ record }) => {
    installAssetFetch(rootAssets([record]));

    await expect(loadArtifacts()).rejects.toThrow(
      "public index artifact contains an invalid record at position 0",
    );
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
  it("requires symmetric landmark relevance and reviewed detail evidence", () => {
    const landmarkCompact = {
      ...compactRecord(),
      relevance: [
        ...compactRecord().relevance,
        {
          basis: "landmark",
          label: "Verified landmark; not Nation-specific",
          sourceUrl: "https://official.example.invalid/records/SYN-1",
        },
      ],
      landmark: { isLandmark: true },
    };
    expect(normalizeRecord(landmarkCompact)).not.toBeNull();
    expect(
      normalizeRecord({
        ...landmarkCompact,
        relevance: compactRecord().relevance,
      }),
    ).toBeNull();

    const landmarkDetail = {
      ...landmarkCompact,
      schemaVersion: "1.3.0",
      landmark: {
        isLandmark: true,
        criterionCodes: ["officially-identified-foundational"],
        reviewState: "approved",
        officialEvidence: [
          {
            sourceLabel: "Synthetic reviewed landmark metadata.",
            sourceUrl: "https://official.example.invalid/records/SYN-1",
            sourceDate: "2026-07-31",
            reproductionBasis: "Metadata and official links only.",
          },
        ],
      },
    };
    expect(normalizeRecord(landmarkDetail)).not.toBeNull();
    expect(
      normalizeRecord({
        ...landmarkDetail,
        landmark: { ...landmarkDetail.landmark, officialEvidence: [] },
      }),
    ).toBeNull();
    expect(
      normalizeRecord({
        ...landmarkDetail,
        landmark: {
          ...landmarkDetail.landmark,
          criterionCodes: ["documented-court-decision"],
        },
      }),
    ).toBeNull();
    expect(
      normalizeRecord({
        ...landmarkDetail,
        landmark: {
          ...landmarkDetail.landmark,
          officialEvidence: [
            {
              ...landmarkDetail.landmark.officialEvidence[0],
              text: "A second mutually exclusive evidence representation.",
            },
          ],
        },
      }),
    ).toBeNull();
  });

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

  it("rejects a detail asset from a different artifact build", async () => {
    const record = normalizeRecord(compactRecord());
    expect(record).not.toBeNull();
    if (!record) return;
    record.artifactGeneratedAt = GENERATED_AT;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              generatedAt: "2026-07-30T12:00:00Z",
              record: compactRecord(),
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await expect(loadRecordDetail(record)).rejects.toThrow(
      "build timestamp does not match",
    );
  });

  it("rejects a detail whose compact projection differs from the index", async () => {
    const record = normalizeRecord(compactRecord());
    expect(record).not.toBeNull();
    if (!record) return;
    record.artifactGeneratedAt = GENERATED_AT;
    const detail = structuredClone(compactRecord());
    detail.issuingBodies = ["Different Issuing Body"];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ generatedAt: GENERATED_AT, record: detail }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await expect(loadRecordDetail(record)).rejects.toThrow(
      "compact fields do not match",
    );
  });

  it("rejects judicial metadata that differs between the index and detail", async () => {
    const indexed = {
      ...compactRecord(),
      documentType: "court_decision",
      issuingBodies: ["Synthetic Supreme Court"],
      judicialContext: {
        adjudicatingBody: {
          kind: "court",
          sourceId: null,
          officialName: "Synthetic Supreme Court",
        },
        docketNumbers: ["SYN-DOCKET"],
        citations: [
          {
            kind: "reporter",
            value: "999 U.S. 1",
            sourceUrl:
              "https://official.example.invalid/opinions/999.pdf#page=1",
          },
        ],
        decisionDate: "2019-03-19",
        documentForm: {
          normalized: "opinion",
          sourceLabel: "Opinions of the Court",
        },
        publicationStatus: {
          normalized: "bound_volume",
          sourceLabel: "U.S. Reports, Volume 999",
          asOf: "2026-07-31",
        },
        revisionReview: {
          state: "no_separate_relationship_exposed",
          reviewedOn: "2026-07-31",
        },
      },
    };
    const record = normalizeRecord(indexed);
    expect(record).not.toBeNull();
    if (!record) return;
    record.artifactGeneratedAt = GENERATED_AT;
    const detail = structuredClone(indexed);
    detail.judicialContext.citations[0].value = "999 U.S. 2";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ generatedAt: GENERATED_AT, record: detail }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await expect(loadRecordDetail(record)).rejects.toThrow(
      "compact fields do not match",
    );
  });

  it("rejects a judicial detail whose source-qualified body differs from the compact body", async () => {
    const context = {
      ...judicialContext(),
      adjudicatingBody: {
        ...judicialContext().adjudicatingBody,
        sourceId: "court:synthetic",
      },
    };
    const indexed = {
      ...judicialCompactRecord(),
      judicialContext: context,
    };
    const record = normalizeRecord(indexed);
    expect(record).not.toBeNull();
    if (!record) return;
    record.artifactGeneratedAt = GENERATED_AT;
    const detail = {
      ...structuredClone(indexed),
      issuingBodies: [
        {
          sourceId: "court:different",
          officialName: context.adjudicatingBody.officialName,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ generatedAt: GENERATED_AT, record: detail }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await expect(loadRecordDetail(record)).rejects.toThrow(
      "did not contain a usable record",
    );
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
      record.artifactGeneratedAt = GENERATED_AT;
      const detail = structuredClone(compactRecord());
      mutate(detail);
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({ generatedAt: GENERATED_AT, record: detail }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
        ),
      );

      await expect(loadRecordDetail(record)).rejects.toThrow(message);
    },
  );
});
