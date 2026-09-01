/** @jsxImportSource preact */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, render, screen, within } from "@testing-library/preact";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import {
  S0_EXPLANATION,
  S0_EXPLANATION_ID,
  S0_JURISDICTION_HEADERS,
  S0_JURISDICTION_HEADING,
  S0_SPATIAL_HEADERS,
  S0_SPATIAL_HEADING,
} from "../../../src/experimental/spatial/constants";
import {
  createSpatialEvidenceInput,
  createSpatialEvidenceViewModel,
} from "../../../src/experimental/spatial/evidence-view";
import { createJurisdictionEvidence } from "../../../src/experimental/spatial/jurisdiction-evidence";
import { createSpatialObservation } from "../../../src/experimental/spatial/observation";
import { createSpatialRelation } from "../../../src/experimental/spatial/relation";
import type { ImmutableSpatialEvidenceViewModel } from "../../../src/experimental/spatial/types";
import { S0EvidenceTableRenderer } from "./evidence-table-renderer";

afterEach(cleanup);

function viewModel(
  includeJurisdiction = true,
): ImmutableSpatialEvidenceViewModel {
  const common = {
    layerVersion: "1.0.0",
    axisOrder: ["synthetic_x", "synthetic_y"] as const,
    resolution: 1,
    observedTimeValue: {
      kind: "date_time" as const,
      value: "3785-01-01T00:00:00Z",
    },
    validTimeValue: { kind: "date" as const, value: "3785-01-02" },
    coverage: "complete_fixture_extent" as const,
    uncertainty: { state: "certain" as const },
    retrievedAt: "3785-01-03T00:00:00Z",
  };
  const subject = createSpatialObservation({
    ...common,
    fixtureSlug: "fixture-1101",
    geometry: { minimum: [-4, -4], maximum: [0, 0] },
  });
  const object = createSpatialObservation({
    ...common,
    fixtureSlug: "fixture-1102",
    geometry: { minimum: [0, 0], maximum: [4, 4] },
  });
  const relation = createSpatialRelation(subject, object, { tolerance: 0 });
  const jurisdictionEvidence = includeJurisdiction
    ? [
        createJurisdictionEvidence({
          fixtureSlug: "fixture-1103",
          retrievedAt: "3785-01-03T00:00:00Z",
        }),
      ]
    : [];
  return createSpatialEvidenceViewModel(
    createSpatialEvidenceInput({
      observations: [object, subject],
      relations: [relation],
      jurisdictionEvidence,
    }),
  );
}

function multiRowFixture() {
  const common = {
    layerVersion: "1.0.0",
    resolution: 1,
    observedTimeValue: {
      kind: "date_time" as const,
      value: "3785-01-01T00:00:00Z",
    },
    validTimeValue: { kind: "date" as const, value: "3785-01-02" },
    coverage: "complete_fixture_extent" as const,
    uncertainty: { state: "certain" as const },
    retrievedAt: "3785-01-03T00:00:00Z",
  };
  const first = createSpatialObservation({
    ...common,
    fixtureSlug: "fixture-1111",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry: { minimum: [-8, -8], maximum: [-4, -4] },
  });
  const second = createSpatialObservation({
    ...common,
    fixtureSlug: "fixture-1112",
    axisOrder: ["synthetic_y", "synthetic_x"],
    geometry: { minimum: [0, 0], maximum: [4, 4] },
  });
  const forward = createSpatialRelation(first, second, { tolerance: 0 });
  const reverse = createSpatialRelation(second, first, { tolerance: 0 });
  const expectedRelations = [forward, reverse].sort((left, right) =>
    left.relationId < right.relationId ? -1 : 1,
  );
  const callerRelations = [...expectedRelations].reverse();

  const jurisdictionFirst = createJurisdictionEvidence({
    fixtureSlug: "fixture-1113",
    retrievedAt: "3785-01-03T00:00:00Z",
  });
  const jurisdictionSecond = createJurisdictionEvidence({
    fixtureSlug: "fixture-1114",
    retrievedAt: "3785-01-03T00:00:00Z",
  });
  const expectedJurisdiction = [jurisdictionFirst, jurisdictionSecond].sort(
    (left, right) =>
      left.jurisdictionEvidenceId < right.jurisdictionEvidenceId ? -1 : 1,
  );
  const callerJurisdiction = [...expectedJurisdiction].reverse();
  const observationIndex = new Map(
    [first, second].map((entry) => [entry.observationId, entry]),
  );

  return {
    viewModel: createSpatialEvidenceViewModel(
      createSpatialEvidenceInput({
        observations: [second, first],
        relations: callerRelations,
        jurisdictionEvidence: callerJurisdiction,
      }),
    ),
    callerRelationIds: callerRelations.map((relation) => relation.relationId),
    expectedRelationIds: expectedRelations.map(
      (relation) => relation.relationId,
    ),
    expectedSpatialRowHeaders: expectedRelations.map(
      (relation) =>
        observationIndex.get(relation.subject.observationId)!.featureId,
    ),
    callerJurisdictionIds: callerJurisdiction.map(
      (evidence) => evidence.jurisdictionEvidenceId,
    ),
    expectedJurisdictionIds: expectedJurisdiction.map(
      (evidence) => evidence.jurisdictionEvidenceId,
    ),
    expectedJurisdictionRowHeaders: expectedJurisdiction.map(
      (evidence) => evidence.featureId,
    ),
  };
}

function expectScopedTable(
  table: HTMLTableElement,
  headers: readonly string[],
  columnCount: number,
): void {
  const columnHeaders = within(table).getAllByRole("columnheader");
  expect(columnHeaders.map((header) => header.textContent)).toEqual(headers);
  for (const header of columnHeaders) {
    expect(header.tagName).toBe("TH");
    expect(header).toHaveAttribute("scope", "col");
  }

  const bodyRows = table.querySelectorAll("tbody > tr");
  expect(bodyRows).toHaveLength(1);
  const rowHeader = within(bodyRows[0] as HTMLTableRowElement).getByRole(
    "rowheader",
  );
  expect(rowHeader.tagName).toBe("TH");
  expect(rowHeader).toHaveAttribute("scope", "row");
  expect(bodyRows[0]!.children).toHaveLength(columnCount);
  expect(bodyRows[0]!.querySelectorAll(":scope > td")).toHaveLength(
    columnCount - 1,
  );
}

describe("S0 test-only accessible evidence table renderer", () => {
  it("renders the exact document order, visible explanation, captions, and scoped native tables", () => {
    const { container } = render(
      <S0EvidenceTableRenderer viewModel={viewModel()} />,
    );
    expect([...container.children].map((element) => element.tagName)).toEqual([
      "H1",
      "P",
      "TABLE",
      "H2",
      "TABLE",
    ]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      S0_SPATIAL_HEADING,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      S0_JURISDICTION_HEADING,
    );

    const explanation = container.querySelector(`#${S0_EXPLANATION_ID}`);
    expect(explanation).not.toBeNull();
    expect(explanation).toBeVisible();
    expect(explanation).toHaveTextContent(S0_EXPLANATION);
    expect(explanation?.tagName).toBe("P");

    const tables = screen.getAllByRole("table") as HTMLTableElement[];
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.tagName).toBe("TABLE");
      expect(table).toHaveAttribute("aria-describedby", S0_EXPLANATION_ID);
      expect(
        container.querySelector(`#${table.getAttribute("aria-describedby")}`),
      ).toBe(explanation);
      expect(table.querySelectorAll(":scope > caption")).toHaveLength(1);
      expect(table.querySelectorAll(":scope > thead > tr")).toHaveLength(1);
      expect(table.querySelectorAll(":scope > tbody > tr")).toHaveLength(1);
    }
    expect(tables[0]!.caption?.textContent).toBe(S0_SPATIAL_HEADING);
    expect(tables[1]!.caption?.textContent).toBe(S0_JURISDICTION_HEADING);
    expectScopedTable(tables[0]!, S0_SPATIAL_HEADERS, 12);
    expectScopedTable(tables[1]!, S0_JURISDICTION_HEADERS, 7);

    expect(tables[0]).toHaveTextContent("Touches");
    expect(tables[0]).not.toHaveTextContent("administrative-unit");
    expect(tables[1]).toHaveTextContent("explicit_synthetic_source_statement");
    expect(tables[1]).toHaveTextContent(
      "Impossible synthetic source statement:",
    );
  });

  it("preserves stable multi-row projection order in both native table bodies", () => {
    const fixture = multiRowFixture();
    expect(fixture.callerRelationIds).toEqual(
      [...fixture.expectedRelationIds].reverse(),
    );
    expect(fixture.callerJurisdictionIds).toEqual(
      [...fixture.expectedJurisdictionIds].reverse(),
    );
    expect(fixture.viewModel.spatialTable.rows.map((row) => row.id)).toEqual(
      fixture.expectedRelationIds,
    );
    expect(
      fixture.viewModel.jurisdictionSection?.rows.map((row) => row.id),
    ).toEqual(fixture.expectedJurisdictionIds);

    render(<S0EvidenceTableRenderer viewModel={fixture.viewModel} />);
    const tables = screen.getAllByRole("table") as HTMLTableElement[];
    const spatialRows = [
      ...tables[0]!.querySelectorAll<HTMLTableRowElement>("tbody > tr"),
    ];
    const jurisdictionRows = [
      ...tables[1]!.querySelectorAll<HTMLTableRowElement>("tbody > tr"),
    ];
    expect(spatialRows).toHaveLength(2);
    expect(jurisdictionRows).toHaveLength(2);

    expect(
      spatialRows.map(
        (row) => row.querySelector(":scope > th[scope='row']")?.textContent,
      ),
    ).toEqual(fixture.expectedSpatialRowHeaders);
    expect(
      jurisdictionRows.map(
        (row) => row.querySelector(":scope > th[scope='row']")?.textContent,
      ),
    ).toEqual(fixture.expectedJurisdictionRowHeaders);
    expect(
      spatialRows.map((row) =>
        [...row.children].map((cell) => cell.textContent),
      ),
    ).toEqual(fixture.viewModel.spatialTable.rows.map((row) => [...row.cells]));
    expect(
      jurisdictionRows.map((row) =>
        [...row.children].map((cell) => cell.textContent),
      ),
    ).toEqual(
      fixture.viewModel.jurisdictionSection!.rows.map((row) => [...row.cells]),
    );

    for (const row of [...spatialRows, ...jurisdictionRows]) {
      expect(row.firstElementChild?.tagName).toBe("TH");
      expect(row.firstElementChild).toHaveAttribute("scope", "row");
      for (const cell of [...row.children].slice(1)) {
        expect(cell.tagName).toBe("TD");
      }
    }
  });

  it("has no automated accessibility violations or prohibited visual/interactive descendants", async () => {
    const { container } = render(
      <S0EvidenceTableRenderer viewModel={viewModel()} />,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );

    expect(
      container.querySelectorAll(
        "a, abbr, button, canvas, input, map, select, svg, textarea, [aria-hidden='true'], [contenteditable], [hidden], [role='button'], [role='link'], [style], [tabindex], [title]",
      ),
    ).toHaveLength(0);

    const rendererSource = readFileSync(
      resolve("tests/experimental/spatial/evidence-table-renderer.tsx"),
      "utf8",
    );
    const viewSource = readFileSync(
      resolve("src/experimental/spatial/evidence-view.ts"),
      "utf8",
    );
    expect(rendererSource).not.toMatch(
      /\bon(?:Click|Input|Change|KeyDown|KeyUp|Pointer|Mouse|Touch|Submit|Focus|Blur)\s*=/,
    );
    expect(`${rendererSource}\n${viewSource}`).not.toMatch(
      /\b(?:document|window|fetch|localStorage|sessionStorage|setInterval|setTimeout|WebSocket|EventSource|useEffect|useReducer|useState)\b/,
    );
  });

  it("omits both jurisdiction elements for an empty validated collection", () => {
    const { container } = render(
      <S0EvidenceTableRenderer viewModel={viewModel(false)} />,
    );
    expect([...container.children].map((element) => element.tagName)).toEqual([
      "H1",
      "P",
      "TABLE",
    ]);
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.queryByText(S0_JURISDICTION_HEADING)).not.toBeInTheDocument();
  });
});
