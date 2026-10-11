import {
  BlendMode,
  PDFDocument,
  StandardFonts,
  rgb,
  setCharacterSpacing,
} from "pdf-lib";
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import { COPY } from "./copy";
import { buildDocument } from "./document";
import type { DocBlock, DocInput } from "./document";

export interface PdfFonts {
  readonly title: Uint8Array;
  readonly body: Uint8Array;
  readonly bold: Uint8Array;
}

export interface PdfInput extends DocInput {
  /** League Spartan SemiBold, Lexend Deca Regular and Lexend Deca SemiBold. Without them the PDF uses Helvetica. */
  readonly fonts?: PdfFonts;
  /** The seal for the cover, as PNG bytes. Without it, or when the bytes cannot be read, the cover has no image. */
  readonly seal?: Uint8Array;
}

// Letter page in the ATNI light document style. Sizes, spacing and colors
// follow the report style in the convention polish folder (report.css).
const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const CONTENT = PAGE.width - MARGIN * 2;
const COVER_TOP = 72;
const BODY_TOP = 68;
const FOOT = 32;
const LABEL = 112; // label column of a table row
const GUTTER = 12; // between a label or a bar and the text beside it
const ROW_PAD = 4;
const BOX_PAD = 6;
const REF_INDENT = 28;
const SEAL = 54; // the seal on the cover, square
const KEEP_WHOLE = 300; // a section up to this tall is not split across pages
const hex = (value: number) =>
  rgb((value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
const INK = hex(0x010b13);
const BODY = hex(0x3b3b3b);
const META = hex(0x636363);
const RED = hex(0xe13d33); // rules and marks only, never small text
const RED_ALT = hex(0xb02821);
const GREY = hex(0x98a1b4);
const HAIR = hex(0xe7ecf3);
const TINT = hex(0xf4f7fb);

export class PdfEncodingError extends Error {
  /** `character` is the first character the PDF font cannot display. */
  constructor(readonly character: string) {
    super(
      "This report contains characters the PDF font cannot display. Use Print view to save it as PDF.",
    );
    this.name = "PdfEncodingError";
  }
}

/** Collapse layout whitespace; refuse unsupported text instead of changing it. */
export function pdfSafe(text: string, font: PDFFont): string {
  const allowed = new Set(font.getCharacterSet());
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 63;
    if (code === 0x20 || code === 0x09) out += " ";
    else if (code === 0x0a || code === 0x0d) out += " ";
    else if (code === 0xa0 || code === 0x202f) out += " ";
    // An embedded font may carry combining marks, but nothing here places one over its letter.
    else if (allowed.has(code) && !/\p{M}/u.test(char)) out += char;
    else throw new PdfEncodingError(char);
  }
  return out;
}

/** `tracking` is letter spacing in points. */
export function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
  tracking = 0,
): string[] {
  const measure = (value: string) =>
    font.widthOfTextAtSize(value, size) + tracking * value.length;
  const lines: string[] = [];
  const words = pdfSafe(text, font)
    .split(" ")
    .filter((w) => w.length > 0);
  let line = "";
  let lineWidth = 0;
  const flush = () => {
    if (line) lines.push(line);
    line = "";
  };
  for (let word of words) {
    if (line) {
      // The line grows by a space and the word. Measured after the last
      // character of the line, that growth includes any kerning across the
      // space, so the sum is the width of the whole line without measuring
      // the line again for every word.
      const end = line.slice(-1);
      const grown = lineWidth + measure(`${end} ${word}`) - measure(end);
      if (grown <= width) {
        line = `${line} ${word}`;
        lineWidth = grown;
        continue;
      }
      flush();
    }
    lineWidth = measure(word);
    // Break very long tokens (URLs, hashes) by character.
    while (lineWidth > width) {
      // Glyph advances are positive. Find the same largest fitting prefix
      // without remeasuring every longer prefix.
      let cut = 1;
      let low = 1;
      let high = word.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (measure(word.slice(0, mid)) <= width) {
          cut = mid;
          low = mid + 1;
        } else high = mid - 1;
      }
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
      lineWidth = measure(word);
    }
    line = word;
  }
  flush();
  return lines.length ? lines : [""];
}

interface Style {
  readonly font: PDFFont;
  readonly size: number;
  readonly lead: number;
  readonly color: RGB;
  /** Space above, dropped at the top of a page. */
  readonly before: number;
  /** Letter spacing in em. */
  readonly tracking?: number;
  /** A heading stays on the page with the start of what follows it. */
  readonly keep?: boolean;
}

/** Lines that stay together on one page. */
interface Chunk {
  readonly height: number;
  readonly draw: (top: number) => void;
}

interface Item {
  readonly before: number;
  readonly keep?: boolean;
  readonly chunks: readonly Chunk[];
}

/** Line ranges that keep the first two and the last two lines of a block together. */
function groups(count: number): [number, number][] {
  if (count <= 3) return [[0, count]];
  const out: [number, number][] = [[0, 2]];
  for (let i = 2; i < count - 2; i++) out.push([i, i + 1]);
  out.push([count - 2, count]);
  return out;
}

export async function embed(doc: PDFDocument, fonts?: PdfFonts) {
  if (!fonts) {
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const body = await doc.embedFont(StandardFonts.Helvetica);
    return { title: bold, body, bold };
  }
  doc.registerFontkit((await import("@pdf-lib/fontkit")).default);
  // No ligatures, alternates or composition: one glyph for each character, so
  // the text a reader copies or searches is the text shown and tracking counts true.
  const options = {
    subset: true,
    features: { liga: false, calt: false, ccmp: false },
  };
  return {
    title: await doc.embedFont(fonts.title, options),
    body: await doc.embedFont(fonts.body, options),
    bold: await doc.embedFont(fonts.bold, options),
  };
}

async function render(input: PdfInput, fonts?: PdfFonts): Promise<Uint8Array> {
  const model = buildDocument(input);
  const doc = await PDFDocument.create();
  const { title, body, bold } = await embed(doc, fonts);
  // Seal bytes that cannot be read leave the cover without an image.
  const seal =
    input.seal && (await doc.embedPng(input.seal).catch(() => undefined));
  const S = {
    eyebrow: {
      font: body,
      size: 8.4,
      lead: 12,
      color: RED_ALT,
      before: 0,
      tracking: 0.08,
      keep: true,
    },
    title: {
      font: title,
      size: 34,
      lead: 36,
      color: INK,
      before: 4,
      tracking: -0.025,
      keep: true,
    },
    lede: { font: body, size: 12, lead: 17, color: BODY, before: 0 },
    h2: {
      font: title,
      size: 19,
      lead: 22,
      color: INK,
      before: 24,
      tracking: -0.02,
      keep: true,
    },
    h3: {
      font: bold,
      size: 10.5,
      lead: 14,
      color: INK,
      before: 14,
      keep: true,
    },
    p: { font: body, size: 9.6, lead: 14.4, color: BODY, before: 5 },
    small: { font: body, size: 8, lead: 11.6, color: META, before: 3 },
    quote: { font: body, size: 9.2, lead: 13.4, color: INK, before: 4 },
    assessment: { font: body, size: 9.2, lead: 13.4, color: BODY, before: 4 },
    note: { font: body, size: 9.6, lead: 14.4, color: BODY, before: 4 },
    label: { font: bold, size: 8.4, lead: 13, color: INK, before: 0 },
    value: { font: body, size: 9.2, lead: 13, color: BODY, before: 0 },
    // No monospace face is supplied; machine values are set one step smaller.
    mono: { font: body, size: 8.2, lead: 13, color: BODY, before: 0 },
    ref: { font: body, size: 8.8, lead: 12.8, color: BODY, before: 6 },
    refNumber: { font: bold, size: 8.8, lead: 12.8, color: RED_ALT, before: 0 },
    meta: { font: body, size: 7.6, lead: 10.6, color: META, before: 0 },
  } satisfies Record<string, Style>;

  doc.setTitle(model.title);
  doc.setAuthor("Policy Sentinel demo");
  doc.setSubject(model.footer);
  doc.setCreator(`Policy Sentinel ${input.version} (in development)`);
  doc.setProducer("pdf-lib");
  doc.setLanguage("en-US");
  doc.setCreationDate(input.generatedAt);
  doc.setModificationDate(input.generatedAt);

  const widthOf = (text: string, s: Style) =>
    s.font.widthOfTextAtSize(text, s.size);
  const pageLabel = (number: number, count: number) =>
    `Page ${number} of ${count}`;
  // The footer text wraps beside the widest page label a report can have.
  const footer = wrap(
    model.footer,
    S.meta.font,
    S.meta.size,
    CONTENT - widthOf(pageLabel(9999, 9999), S.meta) - 18,
  );
  const footRule = FOOT + footer.length * S.meta.lead + 6;
  const bottom = footRule + 16;

  let page!: PDFPage;
  let y = 0;
  let fresh = true; // nothing is drawn on this page yet
  const newPage = () => {
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - (doc.getPageCount() === 1 ? COVER_TOP : BODY_TOP);
    fresh = true;
  };

  /** One line that is already safe for its font. The cap height sits in the middle of the line. */
  const drawLine = (text: string, x: number, top: number, s: Style) => {
    const spacing = (s.tracking ?? 0) * s.size;
    if (spacing) page.pushOperators(setCharacterSpacing(spacing));
    page.drawText(text, {
      x,
      y: top - (s.lead + s.size * 0.7) / 2,
      size: s.size,
      font: s.font,
      color: s.color,
    });
    if (spacing) page.pushOperators(setCharacterSpacing(0));
  };
  const rule = (at: number, color: RGB) =>
    page.drawLine({
      start: { x: MARGIN, y: at },
      end: { x: PAGE.width - MARGIN, y: at },
      thickness: 0.75,
      color,
    });

  const lines = (value: string, s: Style, indent = 0): Chunk[] => {
    const wrapped = wrap(
      value,
      s.font,
      s.size,
      CONTENT - indent,
      (s.tracking ?? 0) * s.size,
    );
    return groups(wrapped.length).map(([from, to]) => ({
      height: (to - from) * s.lead,
      draw: (top) =>
        wrapped
          .slice(from, to)
          .forEach((line, index) =>
            drawLine(line, MARGIN + indent, top - index * s.lead, s),
          ),
    }));
  };
  const text = (value: string, s: Style): Item => ({
    before: s.before,
    keep: s.keep,
    chunks: lines(value, s),
  });

  /** An indented block with a bar on its left edge: a quotation on a tint, or an assessment without one. */
  const boxed = (value: string, s: Style, bar: RGB, fill?: RGB): Item => {
    const wrapped = wrap(value, s.font, s.size, CONTENT - GUTTER * 2);
    return {
      before: s.before,
      chunks: groups(wrapped.length).map(([from, to]) => {
        const above = from === 0 ? BOX_PAD : 0;
        const below = to === wrapped.length ? BOX_PAD : 0;
        const height = above + (to - from) * s.lead + below;
        return {
          height,
          draw: (top) => {
            // A later chunk overlaps the one above it so no seam shows in the fill.
            const box = {
              x: MARGIN,
              y: top - height,
              height: height + (from === 0 ? 0 : 0.5),
            };
            if (fill)
              page.drawRectangle({ ...box, width: CONTENT, color: fill });
            page.drawRectangle({ ...box, width: 2, color: bar });
            wrapped
              .slice(from, to)
              .forEach((line, index) =>
                drawLine(
                  line,
                  MARGIN + GUTTER,
                  top - above - index * s.lead,
                  s,
                ),
              );
          },
        };
      }),
    };
  };

  /** A label and its value as one table row. `first` opens a run of rows. */
  const field = (
    block: Extract<DocBlock, { kind: "field" }>,
    first: boolean,
  ): Item => {
    const value = block.mono ? S.mono : S.value;
    const labels = wrap(
      block.label,
      S.label.font,
      S.label.size,
      LABEL - GUTTER,
    );
    const values = wrap(block.value, value.font, value.size, CONTENT - LABEL);
    const count = Math.max(labels.length, values.length);
    return {
      before: first ? 8 : 0,
      chunks: groups(count).map(([from, to]) => {
        const above = from === 0 ? ROW_PAD : 0;
        const below = to === count ? ROW_PAD : 0;
        const height = above + (to - from) * value.lead + below;
        return {
          height,
          draw: (top) => {
            // A run of rows opens under an ink rule, and so does its continuation on a new page.
            if ((first && from === 0) || fresh) rule(top, INK);
            const lineTop = (index: number) =>
              top - above - (index - from) * value.lead;
            // The whole label is drawn before the value, so copied text reads in order.
            // The smaller label shares the value's baseline.
            for (let index = from; index < Math.min(to, labels.length); index++)
              drawLine(
                labels[index],
                MARGIN,
                lineTop(index) - 0.35 * (value.size - S.label.size),
                S.label,
              );
            for (let index = from; index < Math.min(to, values.length); index++)
              drawLine(values[index], MARGIN + LABEL, lineTop(index), value);
            if (to === count) rule(top - height, HAIR);
          },
        };
      }),
    };
  };

  const item = (
    block: Exclude<DocBlock, { kind: "break" }>,
    previous?: DocBlock,
  ): Item => {
    switch (block.kind) {
      case "field":
        return field(block, previous?.kind !== "field");
      case "ref": {
        const [first, ...rest] = lines(block.text, S.ref, REF_INDENT);
        const number = pdfSafe(`[${block.number}]`, S.refNumber.font);
        return {
          before: S.ref.before,
          chunks: [
            {
              height: first.height,
              draw: (top) => {
                drawLine(number, MARGIN, top, S.refNumber);
                first.draw(top);
              },
            },
            ...rest,
          ],
        };
      }
      case "rule":
        return {
          before: 8,
          chunks: [{ height: 8, draw: (top) => rule(top, HAIR) }],
        };
      case "eyebrow":
        return text(block.text.toUpperCase(), S.eyebrow);
      case "title": {
        const heading = text(block.text, S.title);
        // The short red rule under a cover title.
        const mark: Chunk = {
          height: 20,
          draw: (top) =>
            page.drawRectangle({
              x: MARGIN,
              y: top - 9,
              width: 42,
              height: 2.25,
              color: RED,
            }),
        };
        return { ...heading, chunks: [...heading.chunks, mark] };
      }
      case "quote":
        return boxed(block.text, S.quote, RED_ALT, TINT);
      case "assessment":
        return boxed(block.text, S.assessment, GREY);
      case "note":
        // The placeholder for a missing note is quieter than a note.
        return text(
          block.text,
          block.text === COPY.pdfNoNote ? { ...S.note, color: META } : S.note,
        );
      case "small":
        // The sentence that stands in for missing passages is set apart from the note above it.
        return text(
          block.text,
          previous?.kind === "note" ? { ...S.small, before: 10 } : S.small,
        );
      default:
        return text(block.text, S[block.kind]);
    }
  };

  const items = model.blocks.map((block, index) =>
    block.kind === "break" ? null : item(block, model.blocks[index - 1]),
  );
  /** The height of a heading and everything under it, up to the next heading or page break. */
  const section = (index: number) => {
    let total = 0;
    for (let at = index; at < items.length; at++) {
      const next = items[at];
      if (!next || (at > index && next.keep)) break;
      total += next.before;
      for (const chunk of next.chunks) total += chunk.height;
    }
    return total;
  };
  newPage();
  // The seal takes the top right corner of the cover, clear of the eyebrow, the title and its rule.
  // It is a light grey line mark made for a dark ground: drawn twice, the second
  // time multiplied over the first, it darkens for the white page.
  if (seal) {
    const at = {
      x: PAGE.width - MARGIN - SEAL,
      y: y - SEAL,
      width: SEAL,
      height: SEAL,
    };
    page.drawImage(seal, at);
    page.drawImage(seal, { ...at, blendMode: BlendMode.Multiply });
  }
  items.forEach((current, index) => {
    if (!current) {
      if (!fresh) newPage();
      return;
    }
    current.chunks.forEach((chunk, part) => {
      const before = part === 0 ? current.before : 0;
      let need = before + chunk.height;
      // A heading takes the start of what follows with it, and a short section moves whole.
      if (part === current.chunks.length - 1)
        for (let at = index; items[at]?.keep && items[at + 1]; at++)
          need += items[at + 1]!.before + items[at + 1]!.chunks[0].height;
      const whole = part === 0 && current.keep ? section(index) : 0;
      if (whole <= KEEP_WHOLE) need = Math.max(need, whole);
      if (!fresh && y - need < bottom) newPage();
      if (!fresh) y -= before;
      chunk.draw(y);
      y -= chunk.height;
      fresh = false;
    });
  });

  // Running head on every page after the first, footer on every page.
  const head = pdfSafe(model.runningHead, S.meta.font);
  const product = pdfSafe(`Policy Sentinel ${input.version}`, S.meta.font);
  const right = (value: string, top: number) =>
    drawLine(value, PAGE.width - MARGIN - widthOf(value, S.meta), top, S.meta);
  doc.getPages().forEach((current, index, all) => {
    page = current;
    if (index > 0) {
      const top = PAGE.height - 34;
      drawLine(head, MARGIN, top, S.meta);
      right(product, top);
      rule(top - S.meta.lead - 5, HAIR);
    }
    rule(footRule, HAIR);
    footer.forEach((line, row) =>
      drawLine(line, MARGIN, footRule - 6 - row * S.meta.lead, S.meta),
    );
    right(pageLabel(index + 1, all.length), footRule - 6);
  });

  return doc.save({ useObjectStreams: false });
}

export async function buildPdf(input: PdfInput): Promise<Uint8Array> {
  if (input.fonts) {
    try {
      return await render(input, input.fonts);
    } catch (error) {
      if (error instanceof PdfEncodingError) throw error;
      // The font files could not be used: build the same document with the standard faces.
    }
  }
  return render(input);
}
