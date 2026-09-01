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

const SOURCE_ID = "synthetic-state-accord";
const NATION_ID = "nation:synthetic-a";
const GENERATED_AT = "2026-07-31T12:00:00.000Z";
const OFFICIAL_SOURCE =
  "https://accord.example.invalid/source/synthetic-state-accord";
const STATUS_SOURCE =
  "https://accord.example.invalid/source/synthetic-state-accord/history";
const FALLBACK_RULE_ID = "synthetic-state-accord-fallback-v1";

const accordContext = {
  parties: [
    {
      sourceId: "government:synthetic-state",
      partyKind: "government",
      officialName: "Synthetic State Government",
      roles: [
        {
          normalized: "executing_party",
          sourceLabel: "State executing party",
          sourceUrl: OFFICIAL_SOURCE,
        },
      ],
    },
    {
      sourceId: null,
      partyKind: "collective_governments",
      officialName: "Synthetic Intergovernmental Council",
      roles: [
        {
          normalized: "executing_party",
          sourceLabel: "Council executing parties",
          sourceUrl: OFFICIAL_SOURCE,
        },
      ],
    },
  ],
  executionEvent: {
    role: "executed",
    date: "1974-08-04",
    sourceLabel: "Accord executed August 4, 1974",
    sourceUrl: OFFICIAL_SOURCE,
  },
  statusReview: {
    currentStatus: "not_established",
    evidenceKind: "narrative_execution_language",
    sourceLabel: "Official narrative execution history",
    sourceUrl: STATUS_SOURCE,
    reviewedOn: "2026-07-31",
  },
  supersessionReview: {
    state: "no_relationship_established",
    scope: "reviewed_official_sources_only",
    reviewedOn: "2026-07-31",
    sourceUrls: [OFFICIAL_SOURCE, STATUS_SOURCE],
  },
  instrumentIdentity: {
    kind: "project_fallback",
    sourceIdentifier: null,
    fallbackRuleId: FALLBACK_RULE_ID,
  },
};

const compactRecord = {
  id: "psr:synthetic-state-accord:accord-1974",
  detailPath: "details/synthetic-state-accord.json",
  sourceDocumentIdentifier: "SYNTHETIC-STATE-ACCORD-1974",
  officialTitle: "Synthetic State Accord",
  documentType: "intergovernmental_accord",
  jurisdiction: {
    level: "state",
    name: "Synthetic State",
    stateCode: "WA",
    generalJurisdictionOnly: true,
  },
  issuingBodies: [],
  judicialContext: null,
  accordContext,
  status: {
    normalized: "unknown",
    sourceLabel: null,
    asOf: null,
  },
  source: {
    id: SOURCE_ID,
    name: "Synthetic State Accord Archive",
    provider: "Synthetic State Government",
  },
  dates: {
    published: null,
    updated: null,
    lastAction: null,
    deadline: null,
  },
  urls: {
    officialSource: OFFICIAL_SOURCE,
    officialFullText: null,
  },
  taxonomyMemberships: [],
  isUnclassified: true,
  nationIds: [],
  relevance: [
    {
      basis: "general_jurisdiction",
      label: "General synthetic-state jurisdiction; not Nation-specific",
    },
    {
      basis: "landmark",
      label: "Verified public state-federal accord; not Nation-specific",
      sourceUrl: OFFICIAL_SOURCE,
      evidence: "The reviewed official page identifies the public accord.",
    },
  ],
  landmark: { isLandmark: true },
  change: {
    kind: "unchanged",
    firstSeenAt: GENERATED_AT,
    lastSeenAt: GENERATED_AT,
    urgentAlert: null,
  },
};

const detailRecord = {
  schemaVersion: "1.4.0",
  internalId: compactRecord.id,
  officialTitle: compactRecord.officialTitle,
  sourceDocumentIdentifier: compactRecord.sourceDocumentIdentifier,
  documentType: compactRecord.documentType,
  source: {
    id: SOURCE_ID,
    name: compactRecord.source.name,
    provider: compactRecord.source.provider,
    recordId: compactRecord.sourceDocumentIdentifier,
    adapterId: "synthetic-state-accord-adapter",
    adapterVersion: "1.0.0",
    coverage: {
      from: "1974-08-04",
      through: "1974-08-04",
      notes: "One exact synthetic public accord record.",
    },
    attribution: "Synthetic State Government",
  },
  jurisdiction: compactRecord.jurisdiction,
  issuingBodies: [],
  legislativeContext: null,
  judicialContext: null,
  accordContext,
  status: compactRecord.status,
  dates: {
    introduced: null,
    published: null,
    updated: null,
    lastAction: null,
    deadline: null,
    effective: null,
    retrieved: GENERATED_AT,
  },
  urls: compactRecord.urls,
  texts: {
    officialSummary: null,
    sourceExcerpt: null,
    officialLanguage: null,
    detailAsset: {
      availability: "official_link_only",
      path: null,
      reproductionBasis:
        "Metadata and official links only; no accord text is reproduced.",
    },
  },
  sponsors: [],
  committees: [],
  actionHistory: [],
  statusHistory: [],
  sourceDocumentRelationships: [],
  officialSubjects: [],
  taxonomyMemberships: [],
  isUnclassified: true,
  relevance: compactRecord.relevance,
  nationAssociations: [],
  landmark: {
    isLandmark: true,
    criterionCodes: ["public-state-federal-accord"],
    reviewState: "approved",
    officialEvidence: [
      {
        sourceLabel:
          "Synthetic State Accord; collectively executed by the reviewed governmental parties on 1974-08-04.",
        sourceUrl: OFFICIAL_SOURCE,
        sourceDate: "1974-08-04",
        reproductionBasis: "Metadata and official links only.",
      },
    ],
  },
  historical: { isHistorical: true, pre1980Treatment: "landmark_detail" },
  dataQuality: {
    state: "validated",
    validatedAt: GENERATED_AT,
    issues: [],
  },
  sourceHealth: {
    status: "healthy",
    checkedAt: GENERATED_AT,
    dataAsOf: GENERATED_AT,
    lastSuccessfulRetrievalAt: GENERATED_AT,
    usingLastKnownGood: false,
    message: "Exact synthetic accord record matched the contract.",
  },
  change: compactRecord.change,
  aiSummary: { exists: false, label: "AI-generated source summary" },
  fieldProvenance: [
    {
      field: "/sourceDocumentIdentifier",
      sourcePath: "project fallback identity",
      sourceId: SOURCE_ID,
      sourceRecordId: compactRecord.sourceDocumentIdentifier,
      sourceUrl: OFFICIAL_SOURCE,
      retrievedAt: GENERATED_AT,
      sourceUpdatedAt: null,
      adapterId: "synthetic-state-accord-adapter",
      transformation: "deterministic_mapping",
      transformRuleId: FALLBACK_RULE_ID,
      validationState: "validated",
    },
  ],
};

function installArtifactFetch() {
  const documents = new Map<string, unknown>([
    [
      "manifest.json",
      {
        artifactVersion: "1.4.0",
        recordSchemaVersion: "1.4.0",
        buildId: "synthetic-accord-ui",
        generatedAt: GENERATED_AT,
        dataAsOf: GENERATED_AT,
        recordCount: 1,
        synthetic: true,
      },
    ],
    [
      "coverage.json",
      {
        entries: [
          {
            sourceId: SOURCE_ID,
            sourceName: compactRecord.source.name,
            provider: compactRecord.source.provider,
            jurisdiction: compactRecord.jurisdiction,
            from: "1974-08-04",
            through: "1974-08-04",
            documentedFrom: "1974-08-04",
            documentedThrough: "1974-08-04",
            recordFrom: "1974-08-04",
            recordThrough: "1974-08-04",
            recordCount: 1,
            cadence: "Fixed synthetic record; weekly build-time check.",
            recordTypes: ["intergovernmental_accord"],
            status: "limited",
            limitation: "One exact synthetic accord record only.",
          },
        ],
      },
    ],
    [
      "source-health.json",
      {
        sources: [
          {
            sourceId: SOURCE_ID,
            sourceName: compactRecord.source.name,
            status: "healthy",
            checkedAt: GENERATED_AT,
            dataAsOf: GENERATED_AT,
            lastSuccessfulRetrievalAt: GENERATED_AT,
            usingLastKnownGood: false,
            stale: false,
            recordCount: 1,
            failureStage: null,
            message: "Exact synthetic accord record matched the contract.",
          },
        ],
      },
    ],
    [
      "nations.json",
      {
        nations: [
          {
            id: NATION_ID,
            officialName: "Synthetic Nation A",
            authorizedAliases: [],
            stateCoverage: { states: ["WA"], federalOnly: false },
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
    ["index/records.json", { records: [compactRecord] }],
    [
      compactRecord.detailPath,
      { generatedAt: GENERATED_AT, record: detailRecord },
    ],
  ]);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
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
    }),
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.location.hash = "#/";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Accord context UX", () => {
  it("searches and dates the Accord by reviewed party and execution metadata", async () => {
    installArtifactFetch();
    window.location.hash = `#/timeline?nation=${encodeURIComponent(NATION_ID)}&areas=all&q=${encodeURIComponent("Council executing parties")}&from=1974-08-04&through=1974-08-04`;

    const { container } = render(<App />);

    await screen.findByRole("heading", {
      name: compactRecord.officialTitle,
      level: 3,
    });
    const card = container.querySelector(".result-card");
    expect(card?.textContent).toContain("Accord parties");
    expect(card?.textContent).toContain("Synthetic State Government");
    expect(card?.textContent).toContain("Synthetic Intergovernmental Council");
    expect(card?.textContent).toContain("Current status");
    expect(card?.textContent).toContain("Not stated by source");
    expect(card?.textContent).toContain("Executed");
    expect(card?.textContent).toContain("Aug 4, 1974");
    expect(card?.textContent).not.toContain("Issuing body");
    expect(card?.textContent).not.toContain("Source status");
  });

  it("renders bounded Accord metadata and carries every boundary into the dossier", async () => {
    installArtifactFetch();
    window.location.hash = `#/record/${encodeURIComponent(compactRecord.id)}?nation=${encodeURIComponent(NATION_ID)}&areas=all&return=%2Ftimeline`;
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const { container } = render(<App />);

    await screen.findByRole("heading", {
      name: compactRecord.officialTitle,
      level: 1,
    });
    expect(
      screen.getByRole("heading", { name: "Accord metadata", level: 2 }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain(
      "Reviewed fallback instrument identity",
    );
    expect(container.textContent).toContain(FALLBACK_RULE_ID);
    expect(container.textContent).toContain("Narrative execution evidence");
    expect(container.textContent).toContain("Supersession review");
    expect(container.textContent).toContain("Not stated by source");
    expect(container.textContent).not.toContain("Issuing body");
    expect(container.textContent).not.toContain("Source status");
    expect(
      screen.getAllByRole("link", { name: /Reviewed official source/ }),
    ).toHaveLength(2);

    const roleEvidence = screen.getAllByRole("link", {
      name: /State executing party/,
    })[0];
    expect(roleEvidence).toHaveAttribute("href", OFFICIAL_SOURCE);
    roleEvidence.focus();
    expect(roleEvidence).toHaveFocus();
    fireEvent.keyDown(roleEvidence, { key: "Enter" });

    fireEvent.click(screen.getByLabelText("Select for dossier and CSV"));
    fireEvent.click(
      screen.getByRole("button", { name: "Print selected dossier" }),
    );
    await waitFor(() => expect(print).toHaveBeenCalledOnce());

    const dossier = container.querySelector("#print-dossier");
    expect(dossier?.textContent).toContain("Accord parties");
    expect(dossier?.textContent).toContain("State executing party");
    expect(dossier?.textContent).toContain(OFFICIAL_SOURCE);
    expect(dossier?.textContent).toContain("Narrative execution evidence");
    expect(dossier?.textContent).toContain("Supersession review");
    expect(dossier?.textContent).toContain("Current-status boundary");
    expect(dossier?.textContent).toContain("Relationship boundary");
    expect(dossier?.textContent).toContain("Nation-association boundary");
    expect(dossier?.textContent).not.toContain(
      "Exact Nation-reference evidence",
    );

    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      accessibility.violations.map(({ id, help }) => ({ id, help })),
    ).toEqual([]);
  });
});
