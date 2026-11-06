import { COPY } from "../../src/demo/copy";
import { buildDocument } from "../../src/demo/document";
import type { DocBlock } from "../../src/demo/document";
import { reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import SEAL from "../logos/atni-seal-on-dark.png";

/** The one mapping from document blocks to elements; all wording comes from the model. */
function docBlock(block: DocBlock, index: number) {
  switch (block.kind) {
    case "title":
      return <h1 key={index}>{block.text}</h1>;
    case "h2":
      return <h2 key={index}>{block.text}</h2>;
    case "h3":
      return <h3 key={index}>{block.text}</h3>;
    case "quote":
      return <blockquote key={index}>{block.text}</blockquote>;
    case "field":
      return (
        <p class="doc-field" key={index}>
          <b>{block.label}</b>{" "}
          <span class={block.mono ? "mono" : undefined}>{block.value}</span>
        </p>
      );
    case "ref":
      return (
        <p class="doc-ref" key={index}>
          <b>[{block.number}]</b> <span>{block.text}</span>
        </p>
      );
    case "rule":
      return <hr key={index} />;
    case "break":
      return <div class="doc-break" key={index} />;
    default:
      return (
        // As in the PDF, only the placeholder for a missing note is set quieter.
        <p
          class={`doc-${block.kind}${block.text === COPY.pdfNoNote ? " is-empty" : ""}`}
          key={index}
        >
          {block.text}
        </p>
      );
  }
}

/** The cited document as the browser prints it, from the same model as the PDF. */
export function PrintView({ report }: { report: ReportState }) {
  const model = buildDocument({
    version: __APP_VERSION__,
    generatedAt: new Date(),
    entries: reportEntries(report),
    actors: report.actors,
  });
  return (
    <div class="print-only">
      <img
        class="doc-seal"
        src={SEAL}
        alt={COPY.sealAlt}
        width="54"
        height="54"
      />
      {model.blocks.map(docBlock)}
      {/* shortcut: the footer prints once at the end, not on every page; the PDF carries the running header and footer. */}
      <p class="doc-small doc-foot">{model.footer}</p>
    </div>
  );
}
