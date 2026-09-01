/** @jsxImportSource preact */

import type {
  EvidenceTableRow,
  ImmutableSpatialEvidenceViewModel,
} from "../../../src/experimental/spatial/types";

interface EvidenceTableProps {
  caption: string;
  ariaDescribedBy: string;
  headers: readonly string[];
  rows: readonly EvidenceTableRow[];
}

function EvidenceTable({
  caption,
  ariaDescribedBy,
  headers,
  rows,
}: EvidenceTableProps) {
  return (
    <table aria-describedby={ariaDescribedBy}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row.cells[0]}</th>
            {row.cells.slice(1).map((cell, index) => (
              <td key={`${row.id}:${String(index + 1)}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function S0EvidenceTableRenderer({
  viewModel,
}: {
  viewModel: ImmutableSpatialEvidenceViewModel;
}) {
  return (
    <>
      <h1>{viewModel.heading}</h1>
      <p id={viewModel.explanationId}>{viewModel.explanation}</p>
      <EvidenceTable
        caption={viewModel.spatialTable.caption}
        ariaDescribedBy={viewModel.spatialTable.ariaDescribedBy}
        headers={viewModel.spatialTable.headers}
        rows={viewModel.spatialTable.rows}
      />
      {viewModel.jurisdictionSection === null ? null : (
        <>
          <h2>{viewModel.jurisdictionSection.heading}</h2>
          <EvidenceTable
            caption={viewModel.jurisdictionSection.caption}
            ariaDescribedBy={viewModel.jurisdictionSection.ariaDescribedBy}
            headers={viewModel.jurisdictionSection.headers}
            rows={viewModel.jurisdictionSection.rows}
          />
        </>
      )}
    </>
  );
}
