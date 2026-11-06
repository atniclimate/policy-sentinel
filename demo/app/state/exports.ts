// The files the page builds and hands to the browser, and its print path. The
// page checks each export may run and says how it went; these only build.
import { buildCalendar } from "../../../src/demo/calendar";
import type { DocInput } from "../../../src/demo/document";
import { localDay, serializeFollows } from "../../../src/demo/follow";
import type { Followed } from "../../../src/demo/follow";
import type { ExportTemplate } from "../../../src/demo/mode";
import type { DataActors } from "../../../src/demo/report-state";
import type { DemoCitation } from "../../../src/demo/types";
import { loadPdfFonts, loadPdfSeal } from "../../pdf-fonts";

/** Hands a file built in this page to the browser's downloads. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const today = () => localDay(new Date());

/**
 * The cited document (or, with template "briefing", the Briefing) as a PDF,
 * from the entries and actors the print view shows. A character the PDF
 * faces cannot show rejects with PdfEncodingError.
 */
export async function downloadPdf(
  entries: DocInput["entries"],
  actors: DataActors,
  template: ExportTemplate = "citations",
  checks?: DocInput["checks"],
) {
  const [{ buildPdf }, fonts, seal] = await Promise.all([
    import("../../../src/demo/pdf"),
    loadPdfFonts(),
    loadPdfSeal(),
  ]);
  const bytes = await buildPdf({
    version: __APP_VERSION__,
    generatedAt: new Date(),
    entries,
    actors,
    template,
    checks,
    fonts,
    seal,
  });
  download(
    new Blob([bytes as BlobPart], { type: "application/pdf" }),
    template === "briefing"
      ? `policy-sentinel-briefing-${today()}.pdf`
      : `policy-sentinel-citations-${today()}.pdf`,
  );
}

/** Comment closing dates as a calendar file, from rows `calendarRows` kept. */
export function downloadCalendar(rows: readonly DemoCitation[]) {
  download(
    new Blob([buildCalendar(rows, new Date())], {
      type: "text/calendar",
    }),
    `policy-sentinel-comment-dates-${today()}.ics`,
  );
}

/** The followed list as the file Import reads back. */
export function downloadFollows(list: readonly Followed[]) {
  download(
    new Blob([serializeFollows(list)], {
      type: "application/json",
    }),
    `policy-sentinel-following-${today()}.json`,
  );
}

/** Opens the browser's print dialog on the print view. */
export async function openPrint() {
  // The document faces load on first use; fetch them before the print dialog opens.
  await Promise.all(
    ["400", "600"].map((weight) =>
      document.fonts?.load(`${weight} 1em "Lexend Deca"`),
    ),
  ).catch(() => undefined);
  window.print();
}
