/** @jsxImportSource preact */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/preact";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";

const SOURCE_ID = "federal-register";
const NATION_ID = "nation:synthetic-a";

const coverage = {
  artifactType: "coverage",
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-31T12:00:00.000Z",
  notices: ["Synthetic UI contract fixture only."],
  entries: [
    {
      sourceId: SOURCE_ID,
      sourceName: "Federal Register",
      provider: "Office of the Federal Register",
      jurisdiction: {
        level: "federal",
        name: "United States",
        stateCode: null,
      },
      from: "2026-07-01",
      through: "2026-07-31",
      documentedFrom: "1994-01-03",
      documentedThrough: null,
      recordFrom: "2026-07-01",
      recordThrough: "2026-07-31",
      recordCount: 55,
      cadence: "Federal business days; build-time retrieval only.",
      recordTypes: ["notice"],
      status: "limited",
      limitation: "Only the selected July 2026 artifact window is included.",
    },
  ],
};

const health = {
  artifactType: "source-health",
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-31T12:00:00.000Z",
  sources: [
    {
      sourceId: SOURCE_ID,
      sourceName: "Federal Register",
      status: "healthy",
      checkedAt: "2026-07-31T12:00:00.000Z",
      dataAsOf: "2026-07-31T00:00:00.000Z",
      lastSuccessfulRetrievalAt: "2026-07-31T12:00:00.000Z",
      usingLastKnownGood: false,
      stale: false,
      recordCount: 55,
      failureStage: null,
      message: "Healthy retrieval with a deliberately bounded artifact range.",
    },
  ],
};

const compactRecord = (index: number) => {
  const suffix = String(index).padStart(3, "0");
  const id = `psr:federal-register:2026-${suffix}`;
  return {
    id,
    detailPath: `details/fr-${suffix}.json`,
    sourceDocumentIdentifier: `2026-${suffix}`,
    officialTitle: `Synthetic Federal Register notice ${suffix}`,
    documentType: "notice",
    jurisdiction: {
      level: "federal",
      name: "United States",
      stateCode: null,
      generalJurisdictionOnly: true,
    },
    issuingBodies: ["Synthetic Federal Agency"],
    status: {
      normalized: "unknown",
      sourceLabel: "Notice",
      asOf: "2026-07-31",
    },
    source: {
      id: SOURCE_ID,
      name: "Federal Register",
      provider: "Office of the Federal Register",
    },
    dates: {
      published: "2026-07-31",
      updated: null,
      lastAction: null,
      deadline: null,
    },
    urls: {
      officialSource: `https://www.federalregister.gov/d/2026-${suffix}`,
      officialFullText: null,
    },
    taxonomyMemberships: [],
    isUnclassified: true,
    nationIds: [],
    relevance: [
      {
        basis: "general_jurisdiction",
        label: "General federal jurisdiction; not Nation-specific",
      },
    ],
    landmark: { isLandmark: false },
    change: { kind: "unchanged", urgentAlert: null },
  };
};

const detailRecord = (compact: ReturnType<typeof compactRecord>) => ({
  schemaVersion: "1.1.0",
  internalId: compact.id,
  officialTitle: compact.officialTitle,
  sourceDocumentIdentifier: compact.sourceDocumentIdentifier,
  documentType: compact.documentType,
  source: {
    id: SOURCE_ID,
    name: "Federal Register",
    provider: "Office of the Federal Register",
    recordId: compact.sourceDocumentIdentifier,
    adapterId: "federal-register-adapter",
    adapterVersion: "1.0.0",
    coverage: {
      from: "2026-07-01",
      through: "2026-07-31",
      notes:
        "The API range is broader than this selected public artifact window.",
    },
    attribution: "Office of the Federal Register and the issuing agency.",
  },
  jurisdiction: compact.jurisdiction,
  issuingBodies: [{ officialName: "Synthetic Federal Agency" }],
  status: compact.status,
  dates: {
    introduced: null,
    published: "2026-07-31",
    updated: null,
    lastAction: null,
    deadline: null,
    effective: null,
    retrieved: "2026-07-31T12:00:00.000Z",
  },
  urls: compact.urls,
  texts: {
    officialSummary: {
      text: "Synthetic official source summary.",
      sourceUrl: compact.urls.officialSource,
      sourceDate: "2026-07-31",
    },
    sourceExcerpt: null,
    officialLanguage: null,
    detailAsset: { path: null },
  },
  sponsors: [],
  committees: [],
  actionHistory: [],
  statusHistory: [],
  sourceDocumentRelationships: [
    {
      relationshipType: "related_document",
      targetSourceRecordId: "2026-RELATED",
      targetUrl: "https://www.federalregister.gov/d/2026-RELATED",
      sourceLabel: "exact_source_relationship_label",
    },
  ],
  officialSubjects: [],
  taxonomyMemberships: [],
  isUnclassified: true,
  relevance: compact.relevance,
  nationAssociations: [],
  landmark: { isLandmark: false },
  historical: { isHistorical: false, pre1980Treatment: "not_applicable" },
  dataQuality: {
    state: "validated",
    validatedAt: "2026-07-31T12:00:00.000Z",
    issues: [],
  },
  sourceHealth: {
    status: "healthy",
    checkedAt: "2026-07-31T12:00:00.000Z",
    dataAsOf: "2026-07-31T00:00:00.000Z",
    lastSuccessfulRetrievalAt: "2026-07-31T12:00:00.000Z",
    usingLastKnownGood: false,
    message: null,
  },
  change: {
    kind: "unchanged",
    firstSeenAt: "2026-07-31T12:00:00.000Z",
    lastSeenAt: "2026-07-31T12:00:00.000Z",
    urgentAlert: null,
  },
  aiSummary: { exists: false, label: "AI-generated source summary" },
  fieldProvenance: [],
});

function installArtifactFetch(
  records: ReturnType<typeof compactRecord>[],
  options: { missingDetailPaths?: string[] } = {},
) {
  const missingDetailPaths = new Set(options.missingDetailPaths ?? []);
  const documents = new Map<string, unknown>([
    [
      "manifest.json",
      {
        buildId: "synthetic-fr-ux",
        generatedAt: "2026-07-31T12:00:00.000Z",
        dataAsOf: "2026-07-31T00:00:00.000Z",
        recordCount: records.length,
        synthetic: true,
      },
    ],
    ["coverage.json", coverage],
    ["source-health.json", health],
    [
      "nations.json",
      {
        nations: [
          {
            id: NATION_ID,
            officialName: "Synthetic Nation A",
            authorizedAliases: [],
            stateCoverage: { states: [], federalOnly: true },
          },
        ],
      },
    ],
    [
      "taxonomy.json",
      {
        taxonomyVersion: "1.0.0",
        categories: [
          {
            id: "synthetic-policy",
            label: "Synthetic policy",
            subcategories: [],
          },
        ],
      },
    ],
    ["index/records.json", { records }],
  ]);
  for (const record of records) {
    const path = record.detailPath;
    if (!missingDetailPaths.has(path)) {
      documents.set(path, { record: detailRecord(record) });
    }
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, document.baseURI);
    if (
      url.origin !== window.location.origin ||
      !url.pathname.includes("/data/")
    ) {
      throw new Error(`Unexpected runtime request: ${url.href}`);
    }
    const key = url.pathname.split("/data/")[1] ?? "";
    const value = documents.get(key);
    return value === undefined
      ? new Response(null, { status: 404 })
      : new Response(JSON.stringify(value), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.location.hash = "#/";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Federal Register artifact UX", () => {
  it("shows healthy bounded coverage and loads results in 50-record increments", async () => {
    const records = Array.from({ length: 55 }, (_, index) =>
      compactRecord(index + 1),
    );
    const fetchMock = installArtifactFetch(records);
    window.location.hash = `#/unclassified?nation=${encodeURIComponent(NATION_ID)}&areas=all`;

    const { container } = render(<App />);

    await screen.findByRole("heading", {
      name: "Synthetic Nation A",
      level: 2,
    });
    expect(container.textContent).toContain("selected artifact window");
    expect(container.textContent).toContain("documented source range");
    expect(container.textContent).toContain(
      "Only the selected July 2026 artifact window is included.",
    );
    expect(
      screen.getAllByRole("link", { name: "Open record details" }),
    ).toHaveLength(50);

    fireEvent.click(
      screen.getByRole("button", { name: "Load 5 more records" }),
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "Open record details" }),
      ).toHaveLength(55),
    );
    expect(
      screen.getByRole("button", { name: "All matching records loaded" }),
    ).toBeDisabled();
    expect(
      fetchMock.mock.calls.every(([input]) => {
        const raw =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const url = new URL(raw, document.baseURI);
        return (
          url.origin === window.location.origin &&
          url.pathname.includes("/data/")
        );
      }),
    ).toBe(true);
  });

  it("renders detail relationships and carries coverage, health, and attribution into the dossier", async () => {
    const record = compactRecord(1);
    installArtifactFetch([record]);
    window.location.hash = `#/record/${encodeURIComponent(record.id)}?nation=${encodeURIComponent(NATION_ID)}&areas=all&return=%2Funclassified`;
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const { container } = render(<App />);

    await screen.findByRole("heading", {
      name: record.officialTitle,
      level: 1,
    });
    expect(container.textContent).toContain(
      "Office of the Federal Register and the issuing agency.",
    );
    expect(container.textContent).toContain(
      "The API range is broader than this selected public artifact window.",
    );
    expect(container.textContent).toContain("exact_source_relationship_label");
    expect(screen.getByRole("link", { name: /2026-RELATED/ })).toHaveAttribute(
      "href",
      "https://www.federalregister.gov/d/2026-RELATED",
    );

    fireEvent.click(screen.getByLabelText("Select for dossier and CSV"));
    fireEvent.click(
      screen.getByRole("button", { name: "Print selected dossier" }),
    );
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    const dossier = container.querySelector("#print-dossier");
    expect(dossier?.textContent).toContain("Selected-source coverage");
    expect(dossier?.textContent).toContain("documented source range");
    expect(dossier?.textContent).toContain("Source attribution");
    expect(dossier?.textContent).toContain(
      "Healthy retrieval with a deliberately bounded artifact range.",
    );

    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      accessibility.violations.map(({ id, help }) => ({ id, help })),
    ).toEqual([]);
  });

  it("aborts CSV and dossier output when any selected detail cannot be validated", async () => {
    const records = [compactRecord(1), compactRecord(2)];
    installArtifactFetch(records, {
      missingDetailPaths: [records[1].detailPath],
    });
    window.location.hash = `#/unclassified?nation=${encodeURIComponent(NATION_ID)}&areas=all`;
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:synthetic-output");

    render(<App />);
    await screen.findByRole("heading", {
      name: "Synthetic Nation A",
      level: 2,
    });
    for (const checkbox of screen.getAllByLabelText(
      "Select for dossier and CSV",
    )) {
      fireEvent.click(checkbox);
    }
    await screen.findByRole("heading", {
      name: "2 selected across current browser session",
      level: 3,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Download selected CSV" }),
    );
    await screen.findByText(
      /CSV export canceled: 1 of 2 selected detail assets/,
    );
    expect(screen.getByText(/No CSV was created/)).toBeInTheDocument();
    expect(createObjectUrl).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Print source dossier" }),
    );
    await screen.findByText(
      /Dossier preparation canceled: 1 of 2 selected detail assets/,
    );
    expect(
      screen.getByText(/No dossier was created or printed/),
    ).toBeInTheDocument();
    expect(document.querySelector("#print-dossier")).toBeNull();
    expect(print).not.toHaveBeenCalled();
  });
});
