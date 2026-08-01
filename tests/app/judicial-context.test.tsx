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

const SOURCE_ID = "supreme-court-opinions-curated";
const NATION_ID = "nation:synthetic-a";
const GENERATED_AT = "2026-07-31T12:00:00.000Z";
const OFFICIAL_SOURCE = "https://www.supremecourt.gov/opinions/slipopinion/18";
const CITATION_URL =
  "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=546";

const judicialContext = {
  adjudicatingBody: {
    kind: "court",
    sourceId: null,
    officialName: "Supreme Court of the United States",
  },
  docketNumbers: ["16-1498"],
  citations: [
    {
      kind: "reporter",
      value: "586 U.S. 347",
      sourceUrl: CITATION_URL,
    },
  ],
  decisionDate: "2019-03-19",
  documentForm: {
    normalized: "opinion",
    sourceLabel: "Opinions of the Court",
  },
  publicationStatus: {
    normalized: "bound_volume",
    sourceLabel: "U.S. Reports, Volume 586",
    asOf: "2026-07-31",
  },
  revisionReview: {
    state: "no_separate_relationship_exposed",
    reviewedOn: "2026-07-31",
  },
};

const compactRecord = {
  id: "psr:supreme-court-opinions-curated:16-1498-586-us-347",
  detailPath: "details/cougar-den.json",
  sourceDocumentIdentifier: "16-1498",
  officialTitle: "Washington State Dept. of Licensing v. Cougar Den, Inc.",
  documentType: "court_decision",
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
    generalJurisdictionOnly: true,
  },
  issuingBodies: ["Supreme Court of the United States"],
  judicialContext,
  status: {
    normalized: "decided",
    sourceLabel: "Opinions of the Court - 2018",
    asOf: "2019-03-19",
  },
  source: {
    id: SOURCE_ID,
    name: "Curated U.S. Supreme Court Opinions",
    provider: "Supreme Court of the United States",
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
      label: "General federal jurisdiction; not Nation-specific",
    },
    {
      basis: "landmark",
      label: "Verified documented court decision; not Nation-specific",
      sourceUrl: OFFICIAL_SOURCE,
      evidence:
        "The official Court index supplies the exact reviewed decision metadata.",
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
  schemaVersion: "1.3.0",
  internalId: compactRecord.id,
  officialTitle: compactRecord.officialTitle,
  sourceDocumentIdentifier: compactRecord.sourceDocumentIdentifier,
  documentType: compactRecord.documentType,
  source: {
    id: SOURCE_ID,
    name: compactRecord.source.name,
    provider: compactRecord.source.provider,
    recordId: "16-1498@586 U.S. 347",
    adapterId: "supreme-court-opinions-curated-adapter",
    adapterVersion: "1.1.0",
    coverage: {
      from: "2019-03-19",
      through: "2019-03-19",
      notes: "One exact institutional-party opinion-index row only.",
    },
    attribution: "Supreme Court of the United States",
  },
  jurisdiction: compactRecord.jurisdiction,
  issuingBodies: [
    {
      sourceId: null,
      officialName: "Supreme Court of the United States",
    },
  ],
  legislativeContext: null,
  judicialContext,
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
        "The citation link opens the complete U.S. Reports volume at the Court-supplied page fragment, not a case-only full-text file.",
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
    criterionCodes: ["documented-court-decision"],
    reviewState: "approved",
    officialEvidence: [
      {
        sourceLabel:
          "Washington State Dept. of Licensing v. Cougar Den, Inc.; docket 16-1498; decided 2019-03-19; 586 U.S. 347.",
        sourceUrl: OFFICIAL_SOURCE,
        sourceDate: "2019-03-19",
        reproductionBasis:
          "Metadata and official links only; no opinion text is reproduced.",
      },
    ],
  },
  historical: { isHistorical: false, pre1980Treatment: "not_applicable" },
  dataQuality: {
    state: "validated",
    validatedAt: GENERATED_AT,
    issues: [],
  },
  sourceHealth: {
    status: "healthy",
    checkedAt: GENERATED_AT,
    dataAsOf: "2019-03-19T00:00:00.000Z",
    lastSuccessfulRetrievalAt: GENERATED_AT,
    usingLastKnownGood: false,
    message: "Exact reviewed row matched the bounded source contract.",
  },
  change: compactRecord.change,
  aiSummary: { exists: false, label: "AI-generated source summary" },
  fieldProvenance: [],
};

function installArtifactFetch() {
  const documents = new Map<string, unknown>([
    [
      "manifest.json",
      {
        artifactVersion: "1.3.0",
        recordSchemaVersion: "1.3.0",
        buildId: "synthetic-judicial-ui",
        generatedAt: GENERATED_AT,
        dataAsOf: "2019-03-19T00:00:00.000Z",
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
            from: "2019-03-19",
            through: "2019-03-19",
            documentedFrom: "2019-03-19",
            documentedThrough: "2019-03-19",
            recordFrom: "2019-03-19",
            recordThrough: "2019-03-19",
            recordCount: 1,
            cadence: "Fixed reviewed row; weekly build-time check.",
            recordTypes: ["court_decision"],
            status: "limited",
            limitation: "One exact opinion-index row only.",
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
            dataAsOf: "2019-03-19T00:00:00.000Z",
            lastSuccessfulRetrievalAt: GENERATED_AT,
            usingLastKnownGood: false,
            stale: false,
            recordCount: 1,
            failureStage: null,
            message: "Exact reviewed row matched the bounded source contract.",
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

describe("judicial context UX", () => {
  it("shows a verified court landmark with citation and date on the timeline", async () => {
    installArtifactFetch();
    window.location.hash = `#/timeline?nation=${encodeURIComponent(NATION_ID)}&areas=all`;

    const { container } = render(<App />);

    await screen.findByRole("heading", {
      name: compactRecord.officialTitle,
      level: 3,
    });
    const card = container.querySelector(".result-card");
    expect(card?.textContent).toContain("Court");
    expect(card?.textContent).toContain("Supreme Court of the United States");
    expect(card?.textContent).toContain("Citation");
    expect(card?.textContent).toContain("586 U.S. 347");
    expect(card?.textContent).toContain("Decided");
    expect(card?.textContent).toContain("Mar 19, 2019");
    expect(card?.textContent).toContain(
      "Verified landmark; not Nation-specific",
    );
  });

  it("renders bounded decision metadata and carries its boundary into the dossier", async () => {
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
      screen.getByRole("heading", {
        name: "Court and decision metadata",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("16-1498");
    expect(container.textContent).toContain("Opinions of the Court");
    expect(container.textContent).toContain("U.S. Reports, Volume 586");
    expect(container.textContent).toContain(
      "not a complete subsequent-history, precedential-force, or legal-effect determination",
    );
    expect(container.textContent).toContain(
      "complete U.S. Reports volume at the Court-supplied page fragment",
    );
    expect(
      screen.getByRole("heading", {
        name: "Landmark inclusion evidence",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Documented Court Decision");
    expect(container.textContent).toContain("Project editorial review");
    expect(container.textContent).toContain(
      "Metadata and official links only; no opinion text is reproduced.",
    );
    expect(
      screen.getByRole("link", { name: /Verify official evidence/ }),
    ).toHaveAttribute("href", OFFICIAL_SOURCE);

    const citation = screen.getByRole("link", {
      name: /586 U\.S\. 347/,
    });
    expect(citation).toHaveAttribute("href", CITATION_URL);
    citation.focus();
    expect(citation).toHaveFocus();
    fireEvent.keyDown(citation, { key: "Enter" });

    fireEvent.click(screen.getByLabelText("Select for dossier and CSV"));
    fireEvent.click(
      screen.getByRole("button", { name: "Print selected dossier" }),
    );
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    const dossier = container.querySelector("#print-dossier");
    expect(dossier?.textContent).toContain("16-1498");
    expect(dossier?.textContent).toContain("586 U.S. 347");
    expect(dossier?.textContent).toContain(CITATION_URL);
    expect(dossier?.querySelector(`a[href="${CITATION_URL}"]`)).not.toBeNull();
    expect(dossier?.textContent).toContain(
      "not a complete subsequent-history, precedential-force, or legal-effect determination",
    );
    expect(dossier?.textContent).toContain(
      "complete U.S. Reports volume at the Court-supplied page fragment",
    );
    expect(dossier?.textContent).toContain("Landmark inclusion evidence");
    expect(dossier?.textContent).toContain("Documented Court Decision");
    expect(dossier?.textContent).toContain(
      "Metadata and official links only; no opinion text is reproduced.",
    );
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
