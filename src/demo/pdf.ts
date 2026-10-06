import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import { COPY } from "./copy";
import type { DemoCitation, DemoIssue, DemoReceipt } from "./types";

export interface PdfIssue {
  readonly issue: DemoIssue;
  readonly note: string;
}

export interface PdfEntry {
  readonly citation: DemoCitation;
  readonly receipt: DemoReceipt | null;
  readonly note: string;
  readonly issues: readonly PdfIssue[];
}

export interface PdfInput {
  readonly version: string;
  readonly generatedAt: Date;
  readonly entries: readonly PdfEntry[];
}

const PAGE = { width: 612, height: 792 };
const MARGIN = 56;
const FOOTER_SPACE = 44;
const INK = rgb(0.13, 0.15, 0.14);
const MUTED = rgb(0.34, 0.37, 0.35);
const RULE = rgb(0.72, 0.75, 0.73);
const ACCENT = rgb(0.2, 0.36, 0.3);

/** Replace anything the standard font cannot encode, so export never throws. */
export function pdfSafe(text: string, font: PDFFont): string {
  const allowed = new Set(font.getCharacterSet());
  let out = "";
  for (const char of text.normalize("NFC")) {
    const code = char.codePointAt(0) ?? 63;
    if (code === 0x20 || code === 0x09) out += " ";
    else if (code === 0x0a || code === 0x0d) out += " ";
    else if (code === 0x2011 || code === 0x2010) out += "-";
    else if (code === 0xa0 || code === 0x202f) out += " ";
    else if (allowed.has(code)) out += char;
    else out += "?";
  }
  return out;
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  const words = pdfSafe(text, font)
    .split(" ")
    .filter((w) => w.length > 0);
  let line = "";
  const flush = () => {
    if (line) lines.push(line);
    line = "";
  };
  for (let word of words) {
    // Break very long tokens (URLs, hashes) by character.
    while (font.widthOfTextAtSize(word, size) > width) {
      let cut = word.length - 1;
      while (
        cut > 1 &&
        font.widthOfTextAtSize(word.slice(0, cut), size) > width
      )
        cut -= 1;
      flush();
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      flush();
      line = word;
    }
  }
  flush();
  return lines.length ? lines : [""];
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly italic: PDFFont,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + FOOTER_SPACE) this.newPage();
  }
  gap(points: number) {
    this.y -= points;
  }
  text(
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      lead?: number;
    } = {},
  ) {
    const font = options.font ?? this.regular;
    const size = options.size ?? 10.5;
    const indent = options.indent ?? 0;
    const lead = options.lead ?? size * 1.38;
    const width = PAGE.width - MARGIN * 2 - indent;
    for (const line of wrap(value, font, size, width)) {
      this.ensure(lead);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - size,
        size,
        font,
        color: options.color ?? INK,
      });
      this.y -= lead;
    }
  }
  rule() {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 3 },
      end: { x: PAGE.width - MARGIN, y: this.y - 3 },
      thickness: 0.6,
      color: RULE,
    });
    this.y -= 10;
  }
  field(label: string, value: string) {
    const size = 9.5;
    const labelWidth = 92;
    const width = PAGE.width - MARGIN * 2 - labelWidth;
    const lines = wrap(value || "Not stated", this.regular, size, width);
    this.ensure(size * 1.4);
    this.page.drawText(pdfSafe(label, this.bold), {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.bold,
      color: MUTED,
    });
    for (const line of lines) {
      this.ensure(size * 1.4);
      this.page.drawText(line, {
        x: MARGIN + labelWidth,
        y: this.y - size,
        size,
        font: this.regular,
        color: INK,
      });
      this.y -= size * 1.4;
    }
  }
}

function dateLabel(value: string | null): string {
  return value ?? "Not stated in the text the demo read";
}

export async function buildPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const generated = input.generatedAt.toISOString().slice(0, 10);

  doc.setTitle(`${COPY.pdfTitle}, ${generated}`);
  doc.setAuthor("Policy Sentinel demo");
  doc.setSubject(COPY.limitsShort(input.version));
  doc.setCreator(`Policy Sentinel ${input.version} (in development)`);
  doc.setProducer("pdf-lib");
  doc.setLanguage("en-US");
  doc.setCreationDate(input.generatedAt);
  doc.setModificationDate(input.generatedAt);

  const w = new Writer(doc, regular, bold, italic);

  // Cover
  w.gap(40);
  w.text(COPY.pdfTitle, { font: bold, size: 26, color: ACCENT, lead: 32 });
  w.gap(4);
  w.text(`Prepared with Policy Sentinel ${input.version}, in development`, {
    font: bold,
    size: 12,
  });
  w.text(`Generated ${generated}`, { size: 11, color: MUTED });
  w.gap(12);
  w.rule();
  w.text(COPY.pdfIntro, { size: 11 });
  w.gap(10);
  w.text(COPY.limitsTitle, { font: bold, size: 12, color: ACCENT });
  w.text(COPY.limits(input.version), { size: 11 });
  w.gap(14);
  w.text("Policies in this list", { font: bold, size: 12, color: ACCENT });
  input.entries.forEach((entry, index) => {
    w.text(
      `${index + 1}. ${entry.citation.title} (${entry.citation.identifier})`,
      { size: 10.5, indent: 8 },
    );
  });

  // Body
  for (const [index, entry] of input.entries.entries()) {
    w.newPage();
    const c = entry.citation;
    w.text(`${index + 1}. ${c.title}`, {
      font: bold,
      size: 15,
      color: ACCENT,
      lead: 19,
    });
    w.gap(6);
    w.field("Identifier", c.identifier);
    w.field("Issuing body", c.issuingBody);
    w.field("Type", c.kind);
    w.field("Date", dateLabel(c.date));
    w.field("Official URL", c.officialUrl);
    if (c.textUrl) w.field("Text read from", c.textUrl);
    w.field("Retrieved", c.retrievedAt);
    if (entry.receipt)
      w.field(
        "Fingerprint",
        `SHA-256 ${entry.receipt.sha256} (${entry.receipt.bytes.toLocaleString("en-US")} bytes)`,
      );
    w.gap(6);
    w.rule();
    w.text(COPY.pdfNotesLabel, { font: bold, size: 10.5, color: ACCENT });
    w.text(entry.note.trim() || COPY.pdfNoNote, {
      size: 10.5,
      font: entry.note.trim() ? regular : italic,
    });
    w.gap(8);
    if (entry.issues.length === 0) {
      w.text(c.textAvailable ? COPY.pdfNoPassages : COPY.pdfTextNotRead, {
        size: 10,
        font: italic,
        color: MUTED,
      });
    }
    for (const { issue, note } of entry.issues) {
      w.gap(4);
      w.ensure(60);
      w.text(`${issue.label}`, { font: bold, size: 10.5, color: ACCENT });
      w.text(`“${issue.quote}”`, { size: 10.5, indent: 10 });
      w.text(`Where: ${issue.locator}`, {
        size: 8.5,
        indent: 10,
        color: MUTED,
      });
      w.text(`Limit: ${issue.limits}`, { size: 8.5, indent: 10, color: MUTED });
      if (note.trim())
        w.text(`Note: ${note.trim()}`, { size: 10, indent: 10, font: italic });
    }
  }

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const left = pdfSafe(COPY.limitsShort(input.version), regular);
    const right = `Page ${i + 1} of ${pages.length}`;
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 18 },
      end: { x: PAGE.width - MARGIN, y: MARGIN + 18 },
      thickness: 0.5,
      color: RULE,
    });
    page.drawText(left, {
      x: MARGIN,
      y: MARGIN + 4,
      size: 8,
      font: regular,
      color: MUTED,
    });
    page.drawText(right, {
      x: PAGE.width - MARGIN - regular.widthOfTextAtSize(right, 8),
      y: MARGIN + 4,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return doc.save({ useObjectStreams: false });
}
