import { describe, expect, it } from "vitest";

import correctionFixture from "../../../fixtures/sources/federal-register/document-correction.valid.json";
import originalFixture from "../../../fixtures/sources/federal-register/document-original.valid.json";
import withdrawalFixture from "../../../fixtures/sources/federal-register/document-withdrawal.valid.json";
import { buildFederalRegisterSearchUrl } from "../../../src/adapters/federal-register/query-contract";
import { retrieveFederalRegisterInventory } from "../../../src/adapters/federal-register/retrieval";
import type { FederalRegisterFetchLike } from "../../../src/adapters/federal-register/transport";

interface SyntheticDocumentOverrides {
  type?: "Rule" | "Proposed Rule" | "Notice" | "Presidential Document";
}

function syntheticDocument(
  documentNumber: string,
  publicationDate: string,
  page: number,
  overrides: SyntheticDocumentOverrides = {},
): Record<string, unknown> {
  const [year, month, day] = publicationDate.split("-");
  return {
    ...structuredClone(originalFixture),
    document_number: documentNumber,
    title: `Synthetic Federal Register document ${documentNumber}`,
    type: overrides.type ?? "Notice",
    subtype: null,
    abstract: "Synthetic contract fixture text.",
    action: null,
    dates: null,
    publication_date: publicationDate,
    effective_on: null,
    comments_close_on: null,
    signing_date: null,
    citation: `999 FR ${page}`,
    volume: 999,
    start_page: page,
    end_page: page,
    agencies: [{ raw_name: "Synthetic Test Agency" }],
    agency_names: ["Synthetic Test Agency"],
    docket_ids: [],
    regulation_id_numbers: [],
    topics: [],
    cfr_topics: [],
    cfr_references: [],
    correction_of: null,
    corrections: [],
    related_documents: {},
    disposition_notes: null,
    html_url: `https://www.federalregister.gov/documents/${year}/${month}/${day}/${documentNumber}/synthetic-document`,
    pdf_url: null,
    json_url: `https://www.federalregister.gov/api/v1/documents/${documentNumber}?publication_date=${publicationDate}`,
    mods_url: null,
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function searchEnvelope(
  count: number,
  results: readonly Record<string, unknown>[],
  nextPageUrl: string | null = null,
): Record<string, unknown> {
  const envelope: Record<string, unknown> = {
    description: "Synthetic Federal Register search response.",
    count,
  };
  if (count > 0) {
    envelope.total_pages = Math.ceil(count / 1_000);
    envelope.results = results;
  }
  if (nextPageUrl !== null) {
    envelope.next_page_url = nextPageUrl;
  }
  return envelope;
}

function batchEnvelope(
  results: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return {
    count: results.length,
    results,
  };
}

function issueEnvelope(
  publicationDate: string,
  documentNumbers: readonly string[],
): Record<string, unknown> {
  const groups: Array<Record<string, unknown>> = [];
  for (let index = 0; index < documentNumbers.length; index += 100) {
    groups.push({
      subject_1: "Synthetic issue subject",
      document_numbers: documentNumbers.slice(index, index + 100),
    });
  }
  return {
    meta: { publication_date: publicationDate },
    agencies: [
      {
        name: "Synthetic Test Agency",
        slug: "synthetic-test-agency",
        document_categories: [
          {
            type: "Notices",
            documents: groups,
          },
        ],
      },
    ],
  };
}

function nextPageUrl(
  range: { start: string; end: string },
  cursor: string,
): string {
  const url = buildFederalRegisterSearchUrl(range);
  url.searchParams.set("search_after_cursor", cursor);
  return url.href;
}

function providerNextPageUrl(
  range: { start: string; end: string },
  cursor: string,
  pageNumber = 2,
): string {
  const url = new URL(nextPageUrl(range, cursor));
  url.pathname = "/api/v1/documents";
  url.searchParams.set("format", "json");
  url.searchParams.set("page", String(pageNumber));
  return url.href;
}

const fixedDependencies = {
  now: () => new Date("2026-07-31T12:00:00.000Z"),
  random: () => 0,
  sleep: async () => undefined,
};

describe("Federal Register reconciled retrieval", () => {
  it("fails before search when the selected facet exceeds the public candidate budget", async () => {
    const range = { start: "2026-07-01", end: "2026-07-31" };
    let searchAttempted = false;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.end]: { count: 4_001, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        searchAttempted = true;
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    await expect(
      retrieveFederalRegisterInventory(range, {
        ...fixedDependencies,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "candidate_budget" });
    expect(searchAttempted).toBe(false);
  });

  it("reconciles two-page search, daily facets, replay, and issue inventory", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const documents = Array.from({ length: 1_001 }, (_, index) =>
      syntheticDocument(
        `TST-2026-${String(index + 1).padStart(5, "0")}`,
        range.start,
        index + 1,
      ),
    );
    const ids = documents.map(
      ({ document_number: documentNumber }) => documentNumber as string,
    );
    const cursorUrl = providerNextPageUrl(range, "SYNTHETIC-CURSOR-1000");
    const requestedUrls: string[] = [];
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      requestedUrls.push(url.href);
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: documents.length, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return url.searchParams.has("search_after_cursor")
          ? jsonResponse(
              searchEnvelope(documents.length, documents.slice(1_000)),
            )
          : jsonResponse(
              searchEnvelope(
                documents.length,
                documents.slice(0, 1_000),
                cursorUrl,
              ),
            );
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ids));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(inventory.documents).toHaveLength(1_001);
    expect(inventory.documents[0]?.document_number).toBe("TST-2026-00001");
    expect(inventory.documents.at(-1)?.document_number).toBe("TST-2026-01001");
    expect(inventory.issueEvidence).toEqual([
      {
        publicationDate: range.start,
        uniqueDocumentCount: 1_001,
        occurrenceCount: 1_001,
      },
    ]);
    expect(inventory.retrievedAt).toBe("2026-07-31T12:00:00.000Z");
    expect(inventory.requestCount).toBe(7);
    expect(
      requestedUrls.filter((url) => url.includes("search_after_cursor")),
    ).toHaveLength(2);
    expect(requestedUrls).not.toContain(cursorUrl);
    expect(requestedUrls.join("\n")).not.toContain("excerpts");
  });

  it("discards a saturated parent probe and merges deterministic child ranges", async () => {
    const range = { start: "2026-07-30", end: "2026-07-31" };
    const childDocuments = new Map([
      ["2026-07-30", syntheticDocument("TST-2026-90001", "2026-07-30", 1)],
      ["2026-07-31", syntheticDocument("TST-2026-90002", "2026-07-31", 2)],
    ]);
    const parentProbe = Array.from({ length: 1_000 }, (_, index) =>
      syntheticDocument(
        `PRB-2026-${String(index + 1).padStart(5, "0")}`,
        "2026-07-30",
        index + 10,
      ),
    );
    let parentProbes = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          "2026-07-30": { count: 1, name: "07/30/2026" },
          "2026-07-31": { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        const start = url.searchParams.get("conditions[publication_date][gte]");
        const end = url.searchParams.get("conditions[publication_date][lte]");
        if (start !== end) {
          parentProbes += 1;
          return jsonResponse(
            searchEnvelope(
              2_000,
              parentProbe,
              nextPageUrl(range, "DISCARDED-PARENT-CURSOR"),
            ),
          );
        }
        const document = childDocuments.get(start ?? "");
        if (!document) {
          throw new Error("Unexpected synthetic child date");
        }
        return jsonResponse(searchEnvelope(1, [document]));
      }
      const issueDate = /\/issues\/(\d{4}-\d{2}-\d{2})\.json$/.exec(
        url.pathname,
      )?.[1];
      const document = childDocuments.get(issueDate ?? "");
      if (document && issueDate) {
        return jsonResponse(
          issueEnvelope(issueDate, [document.document_number as string]),
        );
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(parentProbes).toBe(1);
    expect(
      inventory.documents.map(
        ({ document_number: documentNumber }) => documentNumber,
      ),
    ).toEqual(["TST-2026-90001", "TST-2026-90002"]);
    expect(inventory.requestCount).toBe(9);
  });

  it("fails a saturated single-day window without following its cursor", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const probe = Array.from({ length: 1_000 }, (_, index) =>
      syntheticDocument(
        `SAT-2026-${String(index + 1).padStart(5, "0")}`,
        range.start,
        index + 1,
      ),
    );
    let cursorRequests = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 2_000, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        if (url.searchParams.has("search_after_cursor")) {
          cursorRequests += 1;
        }
        return jsonResponse(
          searchEnvelope(
            2_000,
            probe,
            nextPageUrl(range, "UNSPLITTABLE-CURSOR"),
          ),
        );
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    await expect(
      retrieveFederalRegisterInventory(range, {
        ...fixedDependencies,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "unsplittable_window" });
    expect(cursorRequests).toBe(0);
  });

  it("retries the whole snapshot after a same-count identifier swap", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const documentA = syntheticDocument("TST-2026-91001", range.start, 1);
    const documentB = syntheticDocument("TST-2026-91002", range.start, 2);
    let searchCalls = 0;
    const sequence = [documentA, documentB, documentA, documentA];
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        const document = sequence[searchCalls];
        searchCalls += 1;
        if (!document) {
          throw new Error("Unexpected synthetic search replay");
        }
        return jsonResponse(searchEnvelope(1, [document]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["TST-2026-91001"]));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(searchCalls).toBe(4);
    expect(
      inventory.documents.map(({ document_number }) => document_number),
    ).toEqual(["TST-2026-91001"]);
    expect(inventory.requestCount).toBe(8);
  });

  it("retries when a stable identifier changes whitelisted metadata", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const stale = syntheticDocument("TST-2026-91501", range.start, 1);
    const current = structuredClone(stale);
    current.title = "Synthetic Federal Register document with current metadata";
    let searchCalls = 0;
    const sequence = [stale, current, current, current];
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        const document = sequence[searchCalls];
        searchCalls += 1;
        if (!document) {
          throw new Error("Unexpected synthetic metadata replay");
        }
        return jsonResponse(searchEnvelope(1, [document]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["TST-2026-91501"]));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(searchCalls).toBe(4);
    expect(inventory.documents[0]?.title).toBe(current.title);
    expect(inventory.requestCount).toBe(8);
  });

  it("retries the snapshot when a cursor page changes the reported count", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const documents = Array.from({ length: 1_001 }, (_, index) =>
      syntheticDocument(
        `CNT-2026-${String(index + 1).padStart(5, "0")}`,
        range.start,
        index + 1,
      ),
    );
    const ids = documents.map(
      ({ document_number: documentNumber }) => documentNumber as string,
    );
    const cursorUrl = nextPageUrl(range, "COUNT-DRIFT-CURSOR");
    let searchCalls = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: documents.length, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        searchCalls += 1;
        if (url.searchParams.has("search_after_cursor")) {
          return searchCalls === 2
            ? jsonResponse(searchEnvelope(1_000, []))
            : jsonResponse(
                searchEnvelope(documents.length, documents.slice(1_000)),
              );
        }
        return jsonResponse(
          searchEnvelope(
            documents.length,
            documents.slice(0, 1_000),
            cursorUrl,
          ),
        );
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ids));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(searchCalls).toBe(6);
    expect(inventory.documents).toHaveLength(1_001);
    expect(inventory.requestCount).toBe(10);
  });

  it("fetches, replays, and preserves correction and related targets outside the discovery range", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const correction = structuredClone(correctionFixture);
    const withdrawal = structuredClone(withdrawalFixture);
    const original = structuredClone(originalFixture);
    const antecedent = syntheticDocument("TST-2026-00002", "2026-07-01", 90);
    antecedent.title = "Synthetic Antecedent Notice";
    antecedent.action = "Synthetic antecedent notice.";
    const discovered = [correction, withdrawal];
    const discoveredIds = discovered.map(
      ({ document_number }) => document_number,
    );
    let exactBatchCalls = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 2, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(2, discovered));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, discoveredIds));
      }
      if (
        url.pathname === "/api/v1/documents/TST-2026-00001,TST-2026-00002.json"
      ) {
        exactBatchCalls += 1;
        expect(url.searchParams.getAll("fields[]")).toContain(
          "related_documents",
        );
        return jsonResponse(
          batchEnvelope(
            exactBatchCalls === 1
              ? [antecedent, original]
              : [original, antecedent],
          ),
        );
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(exactBatchCalls).toBe(2);
    expect(
      inventory.documents.map(({ document_number }) => document_number),
    ).toEqual([
      "TST-2026-00002",
      "TST-2026-00001",
      "C1-TST-2026-00001",
      "TST-2026-00003",
    ]);
    expect(inventory.requestCount).toBe(7);
  });

  it("uses a validated batch anchor for one missing correction target", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const correction = structuredClone(correctionFixture);
    const original = structuredClone(originalFixture);
    let exactBatchCalls = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(1, [correction]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["C1-TST-2026-00001"]));
      }
      if (
        url.pathname ===
        "/api/v1/documents/C1-TST-2026-00001,TST-2026-00001.json"
      ) {
        exactBatchCalls += 1;
        return jsonResponse(batchEnvelope([original, correction]));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(exactBatchCalls).toBe(2);
    expect(
      inventory.documents.map(({ document_number }) => document_number),
    ).toEqual(["TST-2026-00001", "C1-TST-2026-00001"]);
    expect(inventory.requestCount).toBe(7);
  });

  it("fails closed when an exact relationship target changes during replay", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const correction = structuredClone(correctionFixture);
    const original = structuredClone(originalFixture);
    const changedOriginal = structuredClone(original);
    changedOriginal.title = "Synthetic original with changed exact metadata";
    let exactBatchCalls = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(1, [correction]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["C1-TST-2026-00001"]));
      }
      if (
        url.pathname ===
        "/api/v1/documents/C1-TST-2026-00001,TST-2026-00001.json"
      ) {
        exactBatchCalls += 1;
        return jsonResponse(
          batchEnvelope([
            exactBatchCalls % 2 === 0 ? changedOriginal : original,
            correction,
          ]),
        );
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    await expect(
      retrieveFederalRegisterInventory(range, {
        ...fixedDependencies,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "snapshot_drift" });
    expect(exactBatchCalls).toBe(4);
  });

  it("counts retry attempts as provider requests", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const document = syntheticDocument("TST-2026-91801", range.start, 1);
    let facetAttempts = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        facetAttempts += 1;
        if (facetAttempts === 1) {
          return new Response(null, { status: 503 });
        }
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(1, [document]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["TST-2026-91801"]));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(facetAttempts).toBe(3);
    expect(inventory.requestCount).toBe(6);
  });

  it("fails before exact lookup when relationship closure exceeds its target budget", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const document = syntheticDocument("TST-2026-91901", range.start, 1);
    const related = Array.from({ length: 1_001 }, (_, index) => {
      const documentNumber = `REL-2025-${String(index + 1).padStart(5, "0")}`;
      return {
        document_number: documentNumber,
        relationship_type: "synthetic_related_document",
        html_url: `/d/${documentNumber}`,
        action: null,
        publication_date: "2025-01-02",
        title: `Synthetic related document ${documentNumber}`,
        docket_number: null,
      };
    });
    document.related_documents = {
      "TST-RELATIONSHIP-GROUP-1": related.slice(0, 1_000),
      "TST-RELATIONSHIP-GROUP-2": related.slice(1_000),
    };
    let exactLookupAttempted = false;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(1, [document]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(issueEnvelope(range.start, ["TST-2026-91901"]));
      }
      if (url.pathname.startsWith("/api/v1/documents/")) {
        exactLookupAttempted = true;
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    await expect(
      retrieveFederalRegisterInventory(range, {
        ...fixedDependencies,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "relationship_budget" });
    expect(exactLookupAttempted).toBe(false);
  });

  it("does not follow a null-labeled docket match as a semantic relationship", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const document = syntheticDocument("TST-2026-91902", range.start, 1);
    document.related_documents = {
      "TST-NO-SEMANTIC-LABEL": [
        {
          document_number: "REL-2025-00001",
          relationship_type: null,
          html_url: "/d/REL-2025-00001",
          action: null,
          publication_date: "2025-01-02",
          title: "Synthetic unlabeled docket match",
          docket_number: "TST-NO-SEMANTIC-LABEL",
        },
      ],
    };
    let exactLookupAttempted = false;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        return jsonResponse(searchEnvelope(1, [document]));
      }
      if (url.pathname === `/api/v1/issues/${range.start}.json`) {
        return jsonResponse(
          issueEnvelope(range.start, [document.document_number as string]),
        );
      }
      if (/\/api\/v1\/documents\/.+\.json$/.test(url.pathname)) {
        exactLookupAttempted = true;
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    const inventory = await retrieveFederalRegisterInventory(range, {
      ...fixedDependencies,
      fetchImpl,
    });

    expect(inventory.documents).toHaveLength(1);
    expect(exactLookupAttempted).toBe(false);
  });

  it.each([
    ["title", "Synthetic mismatched embedded antecedent title"],
    ["action", "Synthetic mismatched embedded antecedent action."],
  ] as const)(
    "fails closed when embedded related-document %s differs from its exact target",
    async (field, mismatchedValue) => {
      const range = { start: "2026-07-31", end: "2026-07-31" };
      const withdrawal = structuredClone(withdrawalFixture);
      const antecedent = syntheticDocument("TST-2026-00002", "2026-07-01", 90);
      antecedent.title = "Synthetic Antecedent Notice";
      antecedent.action = "Synthetic antecedent notice.";
      const related = withdrawal.related_documents["TST-DOCKET-0003"]?.[0];
      if (!related) {
        throw new Error(
          "Synthetic withdrawal fixture lacks its related document",
        );
      }
      related[field] = mismatchedValue;
      let exactBatchCalls = 0;
      const fetchImpl: FederalRegisterFetchLike = async (input) => {
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        if (url.pathname.endsWith("/facets/daily.json")) {
          return jsonResponse({
            [range.start]: { count: 1, name: "07/31/2026" },
          });
        }
        if (url.pathname === "/api/v1/documents.json") {
          return jsonResponse(searchEnvelope(1, [withdrawal]));
        }
        if (url.pathname === `/api/v1/issues/${range.start}.json`) {
          return jsonResponse(
            issueEnvelope(range.start, [withdrawal.document_number]),
          );
        }
        if (
          url.pathname ===
          "/api/v1/documents/TST-2026-00002,TST-2026-00003.json"
        ) {
          exactBatchCalls += 1;
          return jsonResponse(batchEnvelope([withdrawal, antecedent]));
        }
        throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
      };

      await expect(
        retrieveFederalRegisterInventory(range, {
          ...fixedDependencies,
          fetchImpl,
        }),
      ).rejects.toMatchObject({ code: "snapshot_drift" });
      expect(exactBatchCalls).toBe(4);
    },
  );

  it("fails without output after the second snapshot drift", async () => {
    const range = { start: "2026-07-31", end: "2026-07-31" };
    const documentA = syntheticDocument("TST-2026-92001", range.start, 1);
    const documentB = syntheticDocument("TST-2026-92002", range.start, 2);
    let searchCalls = 0;
    const sequence = [documentA, documentB, documentA, documentB];
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.pathname.endsWith("/facets/daily.json")) {
        return jsonResponse({
          [range.start]: { count: 1, name: "07/31/2026" },
        });
      }
      if (url.pathname === "/api/v1/documents.json") {
        const document = sequence[searchCalls];
        searchCalls += 1;
        return jsonResponse(searchEnvelope(1, [document]));
      }
      throw new Error(`Unexpected synthetic request path: ${url.pathname}`);
    };

    await expect(
      retrieveFederalRegisterInventory(range, {
        ...fixedDependencies,
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "snapshot_drift",
    });
    expect(searchCalls).toBe(4);
  });
});
