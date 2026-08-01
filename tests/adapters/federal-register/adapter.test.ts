import { describe, expect, it, vi } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import correctionFixture from "../../../fixtures/sources/federal-register/document-correction.valid.json";
import historicalFixture from "../../../fixtures/sources/federal-register/document-historical.valid.json";
import openApiFixture from "../../../fixtures/sources/federal-register/openapi-projection.valid.json";
import originalFixture from "../../../fixtures/sources/federal-register/document-original.valid.json";
import {
  FederalRegisterAdapter,
  createFederalRegisterAdapter,
  refreshFederalRegisterSource,
} from "../../../src/adapters/federal-register";
import type {
  BuildContext,
  SourceReference,
} from "../../../src/pipeline/source-adapter";
import { mergeSourceRefresh } from "../../../src/pipeline/last-known-good.mjs";
import * as policyValidation from "../../../src/pipeline/policy-validation.mjs";
import type { PolicyRecord, SourceConfig } from "../../../src/shared/contracts";
import type { FederalRegisterFetchLike } from "../../../src/adapters/federal-register/transport";

const publicationDate = "1994-01-03";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function issueEnvelope(
  documentNumbers: string | readonly string[] = "TST-1994-00001",
): unknown {
  const identifiers =
    typeof documentNumbers === "string" ? [documentNumbers] : documentNumbers;
  return {
    meta: { publication_date: publicationDate },
    agencies: [
      {
        name: "Synthetic Historical Agency",
        slug: "synthetic-historical-agency",
        document_categories: [
          {
            type: "Notices",
            documents: [
              {
                subject_1: "Synthetic issue subject",
                document_numbers: identifiers,
              },
            ],
          },
        ],
      },
    ],
  };
}

function datedIssueEnvelope(
  date: string,
  documentNumbers: readonly string[],
): unknown {
  return {
    meta: { publication_date: date },
    agencies: [
      {
        name: "Synthetic Test Agency",
        slug: "synthetic-test-agency",
        document_categories: [
          {
            type: "Notices",
            documents: [
              {
                subject_1: "Synthetic issue subject",
                document_numbers: documentNumbers,
              },
            ],
          },
        ],
      },
    ],
  };
}

function uncategorizedDocument(): Record<string, unknown> {
  const document = structuredClone(historicalFixture) as unknown as Record<
    string,
    unknown
  >;
  document.document_number = "TST-1994-00002";
  document.title = "Synthetic Uncategorized Provider Entry";
  document.type = "Uncategorized Document";
  document.agencies = [];
  document.agency_names = [];
  document.citation = "59 FR 2";
  document.start_page = 2;
  document.end_page = 2;
  document.html_url =
    "https://www.federalregister.gov/documents/1994/01/03/TST-1994-00002/synthetic-uncategorized-provider-entry";
  document.json_url =
    "https://www.federalregister.gov/api/v1/documents/TST-1994-00002?publication_date=1994-01-03";
  return document;
}

function enabledContext(): BuildContext {
  const source = structuredClone(
    sourceRegistry.sources.find(({ id }) => id === "federal-register"),
  ) as unknown as SourceConfig;
  source.enabled = true;
  source.adapter = {
    id: "federal-register-adapter",
    version: "1.0.0",
    module: "src/adapters/federal-register/index.ts",
    identityRule: "federal-register-document-number-v1",
  };
  return {
    buildId: "synthetic-fr-build",
    generatedAt: "1994-01-03T23:59:59.000Z",
    source,
    previousCursor: null,
  };
}

function stableFetch(
  issueDocumentNumber = "TST-1994-00001",
): FederalRegisterFetchLike {
  return async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/v1/documentation.json") {
      return jsonResponse(openApiFixture);
    }
    if (url.pathname.endsWith("/facets/daily.json")) {
      return jsonResponse({
        [publicationDate]: { count: 1, name: "01/03/1994" },
      });
    }
    if (url.pathname === "/api/v1/documents.json") {
      return jsonResponse({
        description: "Synthetic historical search response.",
        count: 1,
        total_pages: 1,
        results: [historicalFixture],
      });
    }
    if (url.pathname === `/api/v1/issues/${publicationDate}.json`) {
      return jsonResponse(issueEnvelope(issueDocumentNumber));
    }
    throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
  };
}

function mixedEligibilityFetch(): FederalRegisterFetchLike {
  const uncategorized = uncategorizedDocument();
  return async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/v1/documentation.json") {
      return jsonResponse(openApiFixture);
    }
    if (url.pathname.endsWith("/facets/daily.json")) {
      return jsonResponse({
        [publicationDate]: { count: 2, name: "01/03/1994" },
      });
    }
    if (url.pathname === "/api/v1/documents.json") {
      return jsonResponse({
        description: "Synthetic mixed-eligibility search response.",
        count: 2,
        total_pages: 1,
        results: [historicalFixture, uncategorized],
      });
    }
    if (url.pathname === `/api/v1/issues/${publicationDate}.json`) {
      return jsonResponse(issueEnvelope(["TST-1994-00001", "TST-1994-00002"]));
    }
    throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
  };
}

function emptyInventoryFetch(): FederalRegisterFetchLike {
  return async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/v1/documentation.json") {
      return jsonResponse(openApiFixture);
    }
    if (url.pathname.endsWith("/facets/daily.json")) {
      return jsonResponse({});
    }
    if (url.pathname === "/api/v1/documents.json") {
      return jsonResponse({
        description: "Synthetic empty search response.",
        count: 0,
      });
    }
    throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
  };
}

function supplementalRelationshipFetch(): FederalRegisterFetchLike {
  const discovered = structuredClone(historicalFixture);
  const supplemental = structuredClone(historicalFixture);
  supplemental.document_number = "TST-2000-00001";
  supplemental.title = "Synthetic Supplemental Relationship Target";
  supplemental.publication_date = "2000-01-03";
  supplemental.citation = "65 FR 1";
  supplemental.volume = 65;
  supplemental.html_url =
    "https://www.federalregister.gov/documents/2000/01/03/TST-2000-00001/synthetic-supplemental-relationship-target";
  supplemental.json_url =
    "https://www.federalregister.gov/api/v1/documents/TST-2000-00001?publication_date=2000-01-03";
  discovered.related_documents = {
    "TST-SUPPLEMENTAL": [
      {
        document_number: supplemental.document_number,
        relationship_type: "refers_to_antecedent_by_citation",
        html_url: `/d/${supplemental.document_number}`,
        action: null,
        publication_date: supplemental.publication_date,
        title: supplemental.title,
        docket_number: "TST-SUPPLEMENTAL",
      },
    ],
  };

  return async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/v1/documentation.json") {
      return jsonResponse(openApiFixture);
    }
    if (url.pathname.endsWith("/facets/daily.json")) {
      return jsonResponse({
        [publicationDate]: { count: 1, name: "01/03/1994" },
      });
    }
    if (url.pathname === "/api/v1/documents.json") {
      return jsonResponse({
        description: "Synthetic relationship-closure search response.",
        count: 1,
        total_pages: 1,
        results: [discovered],
      });
    }
    if (url.pathname === `/api/v1/issues/${publicationDate}.json`) {
      return jsonResponse(issueEnvelope());
    }
    if (
      url.pathname.startsWith("/api/v1/documents/") &&
      url.pathname.includes(",") &&
      url.pathname.endsWith(".json")
    ) {
      return jsonResponse({
        count: 2,
        results: [discovered, supplemental],
      });
    }
    throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
  };
}

function correctionBoundaryFetch(): FederalRegisterFetchLike {
  const correction = structuredClone(correctionFixture);
  const original = structuredClone(originalFixture);
  const unrelated = structuredClone(originalFixture);
  unrelated.document_number = "ZZZ-2026-00004";
  unrelated.title = "Synthetic independent in-window notice";
  unrelated.publication_date = "2026-07-31";
  unrelated.citation = "91 FR 99999";
  unrelated.start_page = 99_999;
  unrelated.end_page = 99_999;
  unrelated.corrections = [];
  unrelated.html_url =
    "https://www.federalregister.gov/documents/2026/07/31/ZZZ-2026-00004/synthetic-independent-in-window-notice";
  unrelated.json_url =
    "https://www.federalregister.gov/api/v1/documents/ZZZ-2026-00004?publication_date=2026-07-31";
  unrelated.pdf_url =
    "https://www.govinfo.gov/content/pkg/FR-2026-07-31/pdf/ZZZ-2026-00004.pdf";
  unrelated.mods_url =
    "https://www.govinfo.gov/metadata/granule/FR-2026-07-31/ZZZ-2026-00004/mods.xml";

  return async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/v1/documentation.json") {
      return jsonResponse(openApiFixture);
    }
    if (url.pathname.endsWith("/facets/daily.json")) {
      return jsonResponse({
        "2026-07-31": { count: 2, name: "07/31/2026" },
      });
    }
    if (url.pathname === "/api/v1/documents.json") {
      return jsonResponse({
        description: "Synthetic correction-boundary search response.",
        count: 2,
        total_pages: 1,
        results: [correction, unrelated],
      });
    }
    if (url.pathname === "/api/v1/issues/2026-07-31.json") {
      return jsonResponse(
        datedIssueEnvelope("2026-07-31", [
          correction.document_number,
          unrelated.document_number,
        ]),
      );
    }
    if (
      url.pathname === "/api/v1/documents/C1-TST-2026-00001,TST-2026-00001.json"
    ) {
      return jsonResponse({
        count: 2,
        results: [original, correction],
      });
    }
    throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
  };
}

const fixedDependencies = {
  now: () => new Date("1994-01-03T23:59:59.000Z"),
  random: () => 0,
  sleep: async () => undefined,
};

describe("Federal Register public source adapter", () => {
  it("checks the contract, completes discovery, and normalizes only reconciled references", async () => {
    const context = enabledContext();
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });

    await expect(adapter.checkContract(context)).resolves.toEqual({
      ok: true,
      checkedAt: context.generatedAt,
      message: null,
    });
    const references: SourceReference[] = [];
    for await (const reference of adapter.discover(context)) {
      references.push(reference);
    }
    expect(references).toEqual([
      {
        sourceRecordId: "TST-1994-00001",
        officialUrl:
          "https://www.federalregister.gov/documents/1994/01/03/TST-1994-00001/synthetic-historical-notice",
        sourceUpdatedAt: null,
        cursor: null,
      },
    ]);

    const fetched = await adapter.fetch(references[0], context);
    const records = await adapter.normalize(fetched, context);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      schemaVersion: "1.3.0",
      sourceDocumentIdentifier: "TST-1994-00001",
      jurisdiction: {
        level: "federal",
        generalJurisdictionOnly: true,
      },
      status: { normalized: "unknown" },
      nationAssociations: [],
      source: {
        coverage: {
          from: "1994-01-03",
          through: "1994-01-03",
        },
      },
    });

    const rejectingAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    await rejectingAdapter.checkContract(context);
    const rejectingReferences: SourceReference[] = [];
    for await (const reference of rejectingAdapter.discover(context)) {
      rejectingReferences.push(reference);
    }
    await expect(
      rejectingAdapter.fetch(
        {
          ...rejectingReferences[0],
          officialUrl: "https://www.federalregister.gov.example/malicious",
        },
        context,
      ),
    ).rejects.toThrow(/differs from the reconciled inventory/);
  });

  it("yields no reference when late issue reconciliation fails twice", async () => {
    const context = enabledContext();
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch("TST-1994-99999"),
    });
    await adapter.checkContract(context);
    const references: SourceReference[] = [];

    await expect(
      (async () => {
        for await (const reference of adapter.discover(context)) {
          references.push(reference);
        }
      })(),
    ).rejects.toMatchObject({ code: "snapshot_drift" });
    expect(references).toEqual([]);
  });

  it("filters exact out-of-scope provider types only after full inventory reconciliation", async () => {
    const context = enabledContext();
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: mixedEligibilityFetch(),
    });

    await expect(adapter.checkContract(context)).resolves.toMatchObject({
      ok: true,
    });
    const references: SourceReference[] = [];
    for await (const reference of adapter.discover(context)) {
      references.push(reference);
    }

    expect(references.map(({ sourceRecordId }) => sourceRecordId)).toEqual([
      "TST-1994-00001",
    ]);
    expect(
      references.some(
        ({ sourceRecordId }) => sourceRecordId === "TST-1994-00002",
      ),
    ).toBe(false);
  });

  it("uses cross-range relationship targets only as reconciliation evidence", async () => {
    const context = enabledContext();
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: supplementalRelationshipFetch(),
    });

    await adapter.checkContract(context);
    const references: SourceReference[] = [];
    for await (const reference of adapter.discover(context)) {
      references.push(reference);
    }

    expect(references.map(({ sourceRecordId }) => sourceRecordId)).toEqual([
      "TST-1994-00001",
    ]);
    expect(
      references.some(
        ({ sourceRecordId }) => sourceRecordId === "TST-2000-00001",
      ),
    ).toBe(false);
  });

  it("discloses reciprocal correction records excluded at the rolling boundary", async () => {
    const context = enabledContext();
    context.buildId = "synthetic-fr-correction-boundary";
    context.generatedAt = "2026-08-30T23:59:59.000Z";
    const adapter = createFederalRegisterAdapter({
      now: () => new Date("2026-08-30T23:59:59.000Z"),
      random: () => 0,
      sleep: async () => undefined,
      fetchImpl: correctionBoundaryFetch(),
    });

    await expect(adapter.checkContract(context)).resolves.toMatchObject({
      ok: true,
    });
    const references: SourceReference[] = [];
    for await (const reference of adapter.discover(context)) {
      references.push(reference);
    }
    expect(references.map(({ sourceRecordId }) => sourceRecordId)).toEqual([
      "ZZZ-2026-00004",
    ]);

    const fetched = await adapter.fetch(references[0], context);
    const [record] = await adapter.normalize(fetched, context);
    expect(record.source.coverage).toMatchObject({
      from: "2026-07-31",
      through: "2026-08-30",
    });
    expect(record.source.coverage.notes).toContain(
      "excluded 1 otherwise eligible in-window record because the reciprocal correction component crossed the selected window boundary",
    );
  });

  it("binds every stage to one checked immutable context and exact fetched body", async () => {
    const context = enabledContext();
    const unchecked = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    const uncheckedIterable = unchecked.discover(context);
    const uncheckedDiscovery = uncheckedIterable[Symbol.asyncIterator]();
    await expect(uncheckedDiscovery.next()).rejects.toThrow(
      /successful contract check/,
    );

    const changedContextAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    await changedContextAdapter.checkContract(context);
    const changedContextReferences: SourceReference[] = [];
    for await (const reference of changedContextAdapter.discover(context)) {
      changedContextReferences.push(reference);
    }
    await expect(
      changedContextAdapter.fetch(changedContextReferences[0], {
        ...context,
        generatedAt: "1994-01-04T23:59:59.000Z",
      }),
    ).rejects.toThrow(/identical build context/);

    const tamperedBodyAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    await tamperedBodyAdapter.checkContract(context);
    const tamperedBodyReferences: SourceReference[] = [];
    for await (const reference of tamperedBodyAdapter.discover(context)) {
      tamperedBodyReferences.push(reference);
    }
    const fetched = await tamperedBodyAdapter.fetch(
      tamperedBodyReferences[0],
      context,
    );
    (fetched.body as Record<string, unknown>).title = "Tampered title";
    await expect(
      tamperedBodyAdapter.normalize(fetched, context),
    ).rejects.toThrow(/differs from its reconciled source reference/);
  });

  it("clears a prior inventory when a later contract check fails", async () => {
    const context = enabledContext();
    const baseFetch = stableFetch();
    let contractMatches = true;
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: async (input, init) => {
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        if (url.pathname === "/api/v1/documentation.json" && !contractMatches) {
          return jsonResponse({ changed: true });
        }
        return baseFetch(input, init);
      },
    });

    await adapter.checkContract(context);
    const references: SourceReference[] = [];
    for await (const reference of adapter.discover(context)) {
      references.push(reference);
    }
    contractMatches = false;
    await expect(adapter.checkContract(context)).resolves.toMatchObject({
      ok: false,
    });
    await expect(adapter.fetch(references[0], context)).rejects.toThrow(
      /completed reconciled inventory/,
    );
  });

  it("fails closed instead of reporting an empty reconciled range healthy", async () => {
    const context = enabledContext();
    const validator = vi.fn((records: PolicyRecord[]) => records);
    const result = await refreshFederalRegisterSource(
      createFederalRegisterAdapter({
        ...fixedDependencies,
        fetchImpl: emptyInventoryFetch(),
      }),
      context,
      { validate: validator },
    );

    expect(result).toMatchObject({
      ok: false,
      failureStage: "discovery",
    });
    expect(validator).not.toHaveBeenCalled();
  });

  it("runs the concrete record-set policy barrier before external validation", async () => {
    const context = enabledContext();
    const externalValidator = vi.fn((records: PolicyRecord[]) => records);
    const policyBarrier = vi
      .spyOn(policyValidation, "validateRecordSetPolicy")
      .mockImplementationOnce(() => {
        throw new Error("Synthetic internal policy rejection");
      });
    const result = await refreshFederalRegisterSource(
      createFederalRegisterAdapter({
        ...fixedDependencies,
        fetchImpl: stableFetch(),
      }),
      context,
      { validate: externalValidator },
    );
    expect(policyBarrier).toHaveBeenCalledOnce();
    policyBarrier.mockRestore();

    expect(result).toMatchObject({
      ok: false,
      failureStage: "validation",
    });
    expect(externalValidator).not.toHaveBeenCalled();
  });

  it("requires the exact private-state adapter implementation for refresh", async () => {
    class StructuralSubclass extends FederalRegisterAdapter {}

    const context = enabledContext();
    const fetchImpl = vi.fn(stableFetch());
    const result = await refreshFederalRegisterSource(
      new StructuralSubclass({ ...fixedDependencies, fetchImpl }),
      context,
      { validate: (records) => records },
    );

    expect(result).toMatchObject({
      ok: false,
      failureStage: "contract",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports healthy output only after an external validation barrier", async () => {
    const context = enabledContext();
    const retrievalCheckedAt = "1994-01-03T23:59:59.500Z";
    const validator = {
      validate: vi.fn((records: PolicyRecord[]) => {
        expect(records).toHaveLength(1);
        return records;
      }),
    };
    const adapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      now: () => new Date(retrievalCheckedAt),
      fetchImpl: stableFetch(),
    });

    const success = await refreshFederalRegisterSource(
      adapter,
      context,
      validator,
    );
    expect(success).toMatchObject({
      ok: true,
      health: {
        sourceId: "federal-register",
        status: "healthy",
        stale: false,
        usingLastKnownGood: false,
        recordCount: 1,
        checkedAt: retrievalCheckedAt,
      },
    });
    if (!success.ok) {
      throw new Error("Synthetic Federal Register setup did not succeed");
    }
    expect(success.records[0].sourceHealth.checkedAt).toBe(retrievalCheckedAt);
    expect(validator.validate).toHaveBeenCalledOnce();

    const rejectedAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    const rejected = await refreshFederalRegisterSource(
      rejectedAdapter,
      context,
      {
        validate: () => {
          throw new Error("Synthetic validation failure");
        },
      },
    );
    expect(rejected).toEqual({
      ok: false,
      sourceId: "federal-register",
      checkedAt: context.generatedAt,
      failureStage: "validation",
      publicMessage: "Federal Register record validation failed.",
    });

    const receiptAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    const wrongReceipt = await refreshFederalRegisterSource(
      receiptAdapter,
      context,
      {
        validate: (records) => [...records],
      },
    );
    expect(wrongReceipt).toMatchObject({
      ok: false,
      failureStage: "validation",
    });
  });

  it("hands a failed refresh to last-known-good merge semantics", async () => {
    const context = enabledContext();
    const successfulAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: stableFetch(),
    });
    const successful = await refreshFederalRegisterSource(
      successfulAdapter,
      context,
      { validate: (records) => records },
    );
    if (!successful.ok) {
      throw new Error("Synthetic Federal Register setup did not succeed");
    }

    const failedAdapter = createFederalRegisterAdapter({
      ...fixedDependencies,
      fetchImpl: async () => jsonResponse({ syntheticDrift: true }),
    });
    const failed = await refreshFederalRegisterSource(
      failedAdapter,
      {
        ...context,
        buildId: "synthetic-fr-failed-build",
        generatedAt: "1994-01-04T23:59:59.000Z",
      },
      { validate: (records) => records },
    );
    expect(failed).toMatchObject({
      ok: false,
      failureStage: "contract",
    });

    const merged = mergeSourceRefresh({
      sourceId: "federal-register",
      refresh: failed,
      previousRecords: successful.records,
      previousHealth: successful.health,
    });
    expect(merged.records).toHaveLength(1);
    expect(merged.health).toMatchObject({
      status: "degraded",
      stale: true,
      usingLastKnownGood: true,
      failureStage: "contract",
      dataAsOf: successful.health.dataAsOf,
    });
    expect(merged.records[0]?.sourceHealth).toMatchObject({
      status: "degraded",
      usingLastKnownGood: true,
    });
  });
});
