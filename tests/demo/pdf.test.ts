// @vitest-environment node
import { readFileSync } from "node:fs";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
} from "pdf-lib";
import type { PDFFont, PDFRawStream } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REQUEST_TIMEOUT_MS } from "../../demo/api";
import { loadPdfFonts } from "../../demo/pdf-fonts";
import { atniReferences } from "../../src/demo/citations";
import { COPY } from "../../src/demo/copy";
import { buildDocument } from "../../src/demo/document";
import {
  buildPdf,
  embed,
  PdfEncodingError,
  pdfSafe,
  wrap,
} from "../../src/demo/pdf";
import type { PdfFonts, PdfInput } from "../../src/demo/pdf";
import { emptyActors, reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import type { DemoIssue } from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { listing } from "./fixtures";
import { citation, policy } from "./frontend-fixtures";

const VERSION = "0.2.0";
// Characters that are invisible or look like another one are built from their code points.
const DECOMPOSED_E_ACUTE = `e${String.fromCodePoint(0x301)}`;
const NON_BREAKING_HYPHEN_WORD = `word${String.fromCodePoint(0x2011)}word`;
const FI_LIGATURE = String.fromCodePoint(0xfb01);
const FRACTION_SLASH = String.fromCodePoint(0x2044);
const UNMAPPED = String.fromCodePoint(0xfffd);
const font = (name: string) =>
  new Uint8Array(
    readFileSync(new URL(`../../demo/fonts/${name}.ttf`, import.meta.url)),
  );
const FONTS: PdfFonts = {
  title: font("LeagueSpartan-SemiBold"),
  body: font("LexendDeca-Regular"),
  bold: font("LexendDeca-SemiBold"),
};
const MODES: [string, PdfFonts | undefined][] = [
  ["the embedded document fonts", FONTS],
  ["the Helvetica fallback", undefined],
];

interface Shown {
  readonly text: string;
  readonly y: number;
}
interface Page {
  readonly shown: Shown[];
  readonly content: string;
}

/**
 * The strings drawn on each page, in drawing order, read the way a PDF reader
 * reads them: through each embedded font's ToUnicode map, or as Windows-1252
 * bytes for the standard fonts.
 */
async function pdfPages(bytes: Uint8Array): Promise<Page[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const decode = (stream: unknown) =>
    Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString(
      "latin1",
    );
  const winAnsi = new TextDecoder("windows-1252");
  return doc.getPages().map((page) => {
    const maps = new Map<string, Map<string, string>>();
    const fonts = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
    for (const [name, value] of fonts.entries()) {
      const toUnicode = doc.context
        .lookup(value, PDFDict)
        .lookup(PDFName.of("ToUnicode"));
      if (!toUnicode) continue;
      const map = new Map<string, string>();
      for (const [, glyph, text] of decode(toUnicode).matchAll(
        /<([0-9a-f]{4})> <([0-9a-f]+)>/gi,
      ))
        map.set(
          glyph.toLowerCase(),
          Buffer.from(text, "hex").swap16().toString("utf16le"),
        );
      maps.set(name.toString(), map);
    }
    const contents = page.node.Contents();
    const content = (
      contents instanceof PDFArray
        ? contents.asArray().map((item) => doc.context.lookup(item))
        : [contents]
    )
      .map(decode)
      .join("\n");
    const shown: Shown[] = [];
    let map: Map<string, string> | undefined;
    let y = 0;
    for (const [, name, baseline, hex] of content.matchAll(
      /(\/\S+) [\d.]+ Tf|([\d.]+) Tm|<([0-9a-f]*)> Tj/gi,
    )) {
      if (name) map = maps.get(name);
      else if (baseline) y = Number(baseline);
      else if (map)
        shown.push({
          text: (hex.toLowerCase().match(/.{4}/g) ?? [])
            .map((glyph) => map!.get(glyph) ?? UNMAPPED)
            .join(""),
          y,
        });
      else shown.push({ text: winAnsi.decode(Buffer.from(hex, "hex")), y });
    }
    return { shown, content };
  });
}

const squash = (text: string) => text.replace(/\s+/g, "");
/** What closes every page: the running head after the first page, then the footer and the page number. */
const furniture = (index: number, count: number) => [
  ...(index ? [COPY.docTitle, `Policy Sentinel ${VERSION}`] : []),
  COPY.limitsShort(VERSION),
  `Page ${index + 1} of ${count}`,
];
/** The report text without page furniture, so a block that crosses a page reads whole. */
function bodyText(pages: Page[]): string {
  return squash(
    pages
      .flatMap((page, index) =>
        page.shown.slice(0, -furniture(index, pages.length).length),
      )
      .map((line) => line.text)
      .join(""),
  );
}

const ABSENT: DemoIssue = {
  id: "consultation_absent-1",
  type: "consultation_absent",
  label: "No consultation wording",
  quote: "No wording matched.",
  locator: "whole text",
  rule: "Absence rule.",
  limits: "Missing wording does not show that no consultation occurred.",
  check: "Read the whole record.",
};

/** A read Federal Register policy listed by two more sources, and an unread GovInfo listing. */
function report(
  note = "Useful for the consultation section ‘draft’ café",
  issues?: readonly DemoIssue[],
): ReportState {
  const base = policy("a", { ...citation(), matchKey: "fr:2099-00001" });
  const first = { ...base, issues: issues ?? base.issues };
  const second = { ...listing("govinfo", "2099-00002", null), date: null };
  const key = keyOf(first.citation);
  return {
    cited: {
      [key]: {
        citation: first.citation,
        policy: first,
        note,
        alternates: [listing("govinfo"), listing("regulations")],
      },
      [keyOf(second)]: {
        citation: second,
        policy: null,
        note: "",
        alternates: [],
      },
    },
    marks: {
      [key]: Object.fromEntries(
        first.issues.map((issue) => [
          issue.id,
          { on: true, note: "Ask the program office." },
        ]),
      ),
    },
    actors: {
      name: "Sam Example",
      role: "Policy analyst",
      organization: "Example Office",
      sharingWith: "Example working group",
      purpose: "Briefing preparation",
    },
  };
}

function input(state = report(), fonts?: PdfFonts): PdfInput {
  return {
    version: VERSION,
    generatedAt: new Date("2099-01-08T12:00:00Z"),
    entries: reportEntries(state),
    actors: state.actors,
    fonts,
  };
}

describe("PDF export", () => {
  it.each(MODES)(
    "shows every block of the document model in order with %s",
    async (_, fonts) => {
      const bytes = await buildPdf(input(report(), fonts));
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
      const text = bodyText(await pdfPages(bytes));
      let cursor = 0;
      const follows = (value: string) => {
        const at = text.indexOf(squash(value), cursor);
        expect(at, value).toBeGreaterThanOrEqual(0);
        cursor = at + squash(value).length;
      };
      for (const block of buildDocument(input()).blocks) {
        if (block.kind === "break" || block.kind === "rule") continue;
        if (block.kind === "field") {
          follows(block.label);
          follows(block.value);
        } else if (block.kind === "ref") {
          follows(`[${block.number}]`);
          follows(block.text);
        } else
          follows(
            block.kind === "eyebrow" ? block.text.toUpperCase() : block.text,
          );
      }
      // Nothing is drawn that the model does not hold.
      expect(text.slice(cursor)).toBe("");
    },
  );

  it.each(MODES)(
    "shows the version, limits, receipts, data actors, references and other listings with %s",
    async (_, fonts) => {
      const text = bodyText(
        await pdfPages(await buildPdf(input(report(), fonts))),
      );
      for (const value of [
        "POLICY SENTINEL 0.2.0, WORKING DEMO",
        "Generated2099-01-08",
        COPY.limits(VERSION),
        "Example Water Policy",
        "99 FR 100 (FR Doc. 2099-00001)",
        "https://www.federalregister.gov/d/2099-00001",
        "The Department invites consultation in snapshot a.",
        "Note: Ask the program office.",
        "Useful for the consultation section ‘draft’ café",
        "2099-01-07T11:59:00.000Z",
        `SHA-256 ${"a".repeat(64)} (1,234 bytes)`,
        "policy-text 2.0.0",
        "c".repeat(64),
        "demo-rules-1.0.0",
        "Rule: Exact consultation wording.",
        "Check: Read the official record.",
        COPY.pdfTextNotRead,
        "Prepared by Sam Example, Policy analyst",
        "Organization or Nation Example Office",
        "Sharing with Example working group",
        "Purpose Briefing preparation",
        "Responsible person for this use Sam Example",
        "Sources cited Federal Register, GovInfo",
        "Also listed by GovInfo: https://www.govinfo.gov/app/details/FR-2099-01-05/2099-00001",
        "Also listed by Regulations.gov: https://www.regulations.gov/document/EX-2099-00001",
        `[3]${atniReferences(VERSION)[0]}`,
        `[4]${atniReferences(VERSION)[1]}`,
        ...COPY.docSovereignty,
      ])
        expect(text).toContain(squash(value));
      expect(text.toLowerCase()).not.toContain("counterevidence");
    },
  );

  it("prints Not recorded for data actor entries that are missing", async () => {
    const state = { ...report(), actors: emptyActors() };
    const text = bodyText(await pdfPages(await buildPdf(input(state, FONTS))));
    expect(text).toContain(squash("Prepared by Not recorded Organization"));
    expect(text).toContain(squash("Purpose Not recorded Software"));
  });

  it.each(MODES)(
    "builds the same bytes for the same input with %s",
    async (_, fonts) => {
      const first = await buildPdf(input(report(), fonts));
      const second = await buildPdf(input(report(), fonts));
      expect(Buffer.compare(first, second)).toBe(0);
    },
  );

  it("embeds the document fonts when they are supplied and Helvetica when they are not", async () => {
    const raw = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");
    const embedded = raw(await buildPdf(input(report(), FONTS)));
    expect(embedded).toMatch(/\/BaseFont \/LeagueSpartan-SemiBold/);
    expect(embedded).toMatch(/\/BaseFont \/LexendDeca-Regular/);
    expect(embedded).toMatch(/\/BaseFont \/LexendDeca-SemiBold/);
    expect(embedded).not.toMatch(/\/BaseFont \/Helvetica/);
    const fallback = raw(await buildPdf(input()));
    expect(fallback).toMatch(/\/BaseFont \/Helvetica-Bold/);
    expect(fallback).not.toMatch(/Lexend|Spartan/);
  });

  it("falls back to Helvetica when the supplied font files cannot be used", async () => {
    const broken = new Uint8Array([1, 2, 3]);
    const bytes = await buildPdf(
      input(report(), { title: broken, body: broken, bold: broken }),
    );
    expect(Buffer.compare(bytes, await buildPdf(input()))).toBe(0);
  });

  it("records the title, subject, creator, language and dates", async () => {
    const doc = await PDFDocument.load(await buildPdf(input()), {
      updateMetadata: false,
    });
    expect(doc.getTitle()).toBe("Cited Policies, 2099-01-08");
    expect(doc.getSubject()).toBe(COPY.limitsShort(VERSION));
    expect(doc.getAuthor()).toBe("Policy Sentinel demo");
    expect(doc.getCreator()).toBe("Policy Sentinel 0.2.0 (in development)");
    expect(doc.getProducer()).toBe("pdf-lib");
    expect(doc.catalog.get(PDFName.of("Lang"))?.toString()).toBe("(en-US)");
    expect(doc.getCreationDate()).toEqual(new Date("2099-01-08T12:00:00Z"));
    expect(doc.getModificationDate()).toEqual(new Date("2099-01-08T12:00:00Z"));
  });

  it.each(["中", "Ω", DECOMPOSED_E_ACUTE, NON_BREAKING_HYPHEN_WORD, "🙂"])(
    "refuses characters Helvetica cannot display without silently replacing them: %s",
    async (note) => {
      await expect(buildPdf(input(report(note)))).rejects.toBeInstanceOf(
        PdfEncodingError,
      );
    },
  );

  it.each(["中", DECOMPOSED_E_ACUTE, NON_BREAKING_HYPHEN_WORD, "🙂"])(
    "refuses characters the embedded fonts cannot display without falling back to Helvetica: %s",
    async (note) => {
      await expect(buildPdf(input(report(note), FONTS))).rejects.toBeInstanceOf(
        PdfEncodingError,
      );
    },
  );

  // Letters and a combining mark that the page shows on screen and the PDF refuses.
  it.each(["02B7", "0294", "026C", "019B", "0313"])(
    "names the character it refuses in a data actor entry: U+%s",
    async (hex) => {
      const character = String.fromCodePoint(Number.parseInt(hex, 16));
      const state = report();
      const actors = { ...state.actors, organization: `Example x${character}` };
      for (const [, fonts] of MODES)
        await expect(
          buildPdf(input({ ...state, actors }, fonts)),
        ).rejects.toMatchObject({ name: "PdfEncodingError", character });
    },
  );

  it("shows characters the embedded fonts have and Helvetica does not", async () => {
    // Omega, two Hungarian letters, the fi ligature character, L with middle dot and a fraction slash.
    const note = `Ω őű ${FI_LIGATURE} Ŀ 3${FRACTION_SLASH}4 official`;
    const text = bodyText(
      await pdfPages(await buildPdf(input(report(note), FONTS))),
    );
    expect(text).toContain(squash(note));
  });

  it.each(MODES)(
    "wraps very long tokens and paginates a long report with the running head and footer on the right pages with %s",
    async (_, fonts) => {
      const token = `https://example.invalid/${"abcdef".repeat(150)}`;
      const base = report(`${token} ${"A long note. ".repeat(150)}`);
      const [key, entry] = Object.entries(base.cited)[0];
      const cited = Object.fromEntries(
        Array.from({ length: 3 }, (_, index) => {
          const c = {
            ...entry.citation,
            identifier: `99 FR ${100 + index} (FR Doc. 2099-0000${index + 1})`,
          };
          return [
            keyOf(c),
            {
              ...entry,
              citation: c,
              policy: { ...entry.policy!, citation: c },
            },
          ];
        }),
      );
      const marks = Object.fromEntries(
        Object.keys(cited).map((k) => [k, base.marks[key]]),
      );
      const pages = await pdfPages(
        await buildPdf(input({ ...base, cited, marks }, fonts)),
      );
      expect(pages.length).toBeGreaterThan(6);
      expect(bodyText(pages)).toContain(token);

      pages.forEach((page, index) => {
        const closing = furniture(index, pages.length);
        const tail = page.shown.slice(-closing.length);
        expect(tail.map((line) => line.text)).toEqual(closing);
        // The report text stays between the running head and the footer.
        const footer = tail.at(-1)!.y;
        const head = index ? tail[0].y : 792;
        const body = page.shown.slice(0, -closing.length);
        expect(body.length).toBeGreaterThan(0);
        for (const line of body) {
          expect(line.y).toBeGreaterThan(footer + 12);
          expect(line.y).toBeLessThan(head - 12);
        }
      });
      // The cover has no running head.
      expect(pages[0].shown.map((line) => line.text)).not.toContain(
        `Policy Sentinel ${VERSION}`,
      );
    },
  );

  it("never leaves a heading at the foot of a page, whatever the length of the text above it", async () => {
    const headings = new Set(
      buildDocument(input()).blocks.flatMap((block) =>
        block.kind === "h2" || block.kind === "h3" ? [block.text] : [],
      ),
    );
    for (let lines = 0; lines < 40; lines++) {
      const note = `A note. ${"One more sentence of a note. ".repeat(lines * 3)}`;
      const pages = await pdfPages(await buildPdf(input(report(note))));
      for (const [index, page] of pages.entries()) {
        const body = page.shown.slice(
          0,
          -furniture(index, pages.length).length,
        );
        expect(headings.has(body.at(-1)!.text), `${lines}: ${index}`).toBe(
          false,
        );
      }
    }
  });

  it("sets a quotation on a tint and labels an absence assessment without representing it as a quotation", async () => {
    const tint = /0\.9568\d* 0\.9686\d* 0\.9843\d* rg/;
    const quoted = await pdfPages(await buildPdf(input()));
    expect(quoted[1].shown.map((line) => line.text)).toContain(
      "The Department invites consultation in snapshot a.",
    );
    expect(quoted[1].content).toMatch(tint);

    const assessed = await pdfPages(
      await buildPdf(input(report("A note.", [ABSENT]))),
    );
    expect(assessed[1].shown.map((line) => line.text)).toContain(
      "Rule assessment: No wording matched.",
    );
    expect(assessed.map((page) => page.content).join("\n")).not.toMatch(tint);
  });
});

/**
 * The plain rule for where a line breaks: measure every candidate line whole.
 * wrap() has to give the same lines without measuring a line again for each word.
 */
function wholeLineWrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
  tracking = 0,
): string[] {
  const measure = (value: string) =>
    font.widthOfTextAtSize(value, size) + tracking * value.length;
  const lines: string[] = [];
  let line = "";
  const flush = () => {
    if (line) lines.push(line);
    line = "";
  };
  for (let word of pdfSafe(text, font).split(" ").filter(Boolean)) {
    while (measure(word) > width) {
      let cut = word.length - 1;
      while (cut > 1 && measure(word.slice(0, cut)) > width) cut--;
      flush();
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) line = candidate;
    else {
      flush();
      line = word;
    }
  }
  flush();
  return lines.length ? lines : [""];
}

describe("PDF line breaks", () => {
  /** The faces as the PDF embeds them. */
  const faces = async (fonts?: PdfFonts) =>
    embed(await PDFDocument.create(), fonts);

  it.each(MODES)(
    "fall where measuring every whole line puts them with %s",
    async (_, fonts) => {
      const token = `https://example.invalid/${"abcdef".repeat(20)}`;
      const texts = buildDocument(
        input(report(`${token} ${"A long note, with a pause. ".repeat(30)}`)),
      ).blocks.flatMap((block) =>
        block.kind === "field"
          ? [block.label, block.value]
          : "text" in block
            ? [block.text]
            : [],
      );
      for (const font of new Set(Object.values(await faces(fonts))))
        for (const [size, width, tracking] of [
          [9.6, 504, 0],
          [8.4, 100, 0],
          [34, 504, -0.85],
        ])
          for (const text of texts)
            expect(wrap(text, font, size, width, tracking), text).toEqual(
              wholeLineWrap(text, font, size, width, tracking),
            );
    },
  );

  it("are found by measuring a paragraph in proportion to its length, however long its lines are", async () => {
    const { body } = await faces(FONTS);
    const text = "A sentence of plain words for a long note. ".repeat(60);
    const measured = vi.spyOn(body, "widthOfTextAtSize");
    expect(wrap(text, body, 9.6, 504).length).toBeGreaterThan(10);
    const characters = measured.mock.calls.reduce(
      (sum, [value]) => sum + value.length,
      0,
    );
    expect(characters).toBeLessThan(3 * text.length);
  });
});

describe("document fonts for the PDF", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fetches the three font files shipped with the page", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: URL) => {
      requested.push(String(url));
      return new Response(new Uint8Array([requested.length]));
    });
    await expect(loadPdfFonts()).resolves.toEqual({
      title: new Uint8Array([1]),
      body: new Uint8Array([2]),
      bold: new Uint8Array([3]),
    });
    expect(requested.map((url) => url.split("/").at(-1))).toEqual([
      "LeagueSpartan-SemiBold.ttf",
      "LexendDeca-Regular.ttf",
      "LexendDeca-SemiBold.ttf",
    ]);
  });

  it.each([
    [
      "a request fails",
      async () => {
        throw new TypeError("offline");
      },
    ],
    ["a file is missing", async () => new Response("", { status: 404 })],
  ])("returns undefined when %s", async (_, fetch) => {
    vi.stubGlobal("fetch", fetch);
    await expect(loadPdfFonts()).resolves.toBeUndefined();
  });

  // Like the browser's fetch: a stalled request or body ends only when its signal aborts.
  const stalled = (signal?: AbortSignal | null) =>
    new Promise<never>((_, reject) =>
      signal?.addEventListener("abort", () => reject(new Error("aborted"))),
    );
  it.each([
    [
      "a request never answers",
      (_: URL, init?: RequestInit) => stalled(init?.signal),
    ],
    [
      "a file never finishes arriving",
      async (_: URL, init?: RequestInit) => ({
        ok: true,
        arrayBuffer: () => stalled(init?.signal),
      }),
    ],
  ])(
    "returns undefined once the request limit passes when %s",
    async (_, fetch) => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", fetch);
      let fonts: unknown = "still waiting";
      void loadPdfFonts().then((value) => {
        fonts = value;
      });
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
      expect(fonts).toBe("still waiting");
      await vi.advanceTimersByTimeAsync(1);
      expect(fonts).toBeUndefined();
    },
  );
});
