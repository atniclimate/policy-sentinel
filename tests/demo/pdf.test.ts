// @vitest-environment node
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildPdf } from "../../src/demo/pdf";
import type { PdfInput } from "../../src/demo/pdf";

/** Pull the shown text out of a PDF made by pdf-lib with standard fonts. */
function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const parts: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body = Buffer.from(match[1], "latin1");
    try {
      body = inflateSync(body);
    } catch {
      /* stored as is */
    }
    const content = body.toString("latin1");
    for (const hex of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      parts.push(Buffer.from(hex[1], "hex").toString("latin1"));
    }
  }
  return parts.join("\n");
}

const input: PdfInput = {
  version: "0.2.0",
  generatedAt: new Date("2099-01-07T12:00:00Z"),
  entries: [
    {
      citation: {
        sourceId: "federal-register",
        identifier: "99 FR 100 (FR Doc. 2099-00001)",
        title: "Example Water Quality Provisions",
        issuingBody: "Example Department",
        kind: "Proposed Rule",
        date: "2099-01-05",
        officialUrl: "https://www.federalregister.gov/d/2099-00001",
        textUrl:
          "https://www.govinfo.gov/content/pkg/FR-2099-01-05/html/2099-00001.htm",
        retrievedAt: "2099-01-07T11:59:00.000Z",
        summary: null,
        textAvailable: true,
      },
      receipt: {
        sha256: "a".repeat(64),
        bytes: 1234,
        retrievedAt: "2099-01-07T11:59:00.000Z",
        textUrl:
          "https://www.govinfo.gov/content/pkg/FR-2099-01-05/html/2099-00001.htm",
      },
      note: "Useful for the consultation section ‘draft’ 中",
      issues: [
        {
          issue: {
            id: "consultation_language-1",
            type: "consultation_language",
            label: "Consultation wording",
            quote:
              "The Department invites government-to-government consultation.",
            locator: "/p[1]",
            rule: "rule",
            limits:
              "Wording only. It does not show that consultation happened.",
            check: "check",
          },
          note: "Ask the program office.",
        },
      ],
    },
    {
      citation: {
        sourceId: "govinfo",
        identifier: "PLAW-999publ1",
        title: "A Public Law Without Text Read",
        issuingBody: "Congress",
        kind: "Public Law",
        date: null,
        officialUrl: "https://www.govinfo.gov/app/details/PLAW-999publ1",
        textUrl: null,
        retrievedAt: "2099-01-07T11:59:00.000Z",
        summary: null,
        textAvailable: false,
      },
      receipt: null,
      note: "",
      issues: [],
    },
  ],
};

describe("PDF export", () => {
  it("builds a PDF with the version, limits, citations, URLs and quoted passages", async () => {
    const bytes = await buildPdf(input);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const text = pdfText(bytes).split(/\s+/).join(" ");
    expect(text).toContain("Policy Sentinel 0.2.0, in development");
    expect(text).toContain("Generated 2099-01-07");
    expect(text).toMatch(/not legal advice/i);
    expect(text).toMatch(/incomplete or delayed/);
    expect(text).toMatch(/miss passages or misread/);
    expect(text).toContain("Example Water Quality Provisions");
    expect(text).toContain("99 FR 100 (FR Doc. 2099-00001)");
    expect(text).toContain("https://www.federalregister.gov/d/2099-00001");
    expect(text).toContain(
      "The Department invites government-to-government consultation.",
    );
    expect(text).toContain("Ask the program office.");
    expect(text).toContain("2099-01-07T11:59:00.000Z");
    expect(text).toContain("SHA-256");
    expect(text).toContain("The demo did not read the text of this source");
  });

  it("leaves counterevidence out and repeats the footer on every page", async () => {
    const text = pdfText(await buildPdf(input));
    expect(text.toLowerCase()).not.toContain("counterevidence");
    const footers =
      text.match(
        /Policy Sentinel 0\.2\.0, in development\. Not legal advice\./g,
      ) ?? [];
    expect(footers.length).toBeGreaterThanOrEqual(3);
  });

  it("does not throw on characters the standard font cannot encode", async () => {
    await expect(buildPdf(input)).resolves.toBeInstanceOf(Uint8Array);
  });

  it("wraps very long tokens and long lists across pages", async () => {
    const long = {
      ...input,
      entries: Array.from({ length: 12 }, () => input.entries[0]),
    };
    const bytes = await buildPdf(long);
    const pages = (
      Buffer.from(bytes)
        .toString("latin1")
        .match(/\/Type\s*\/Page\b/g) ?? []
    ).length;
    expect(pages).toBeGreaterThan(12);
  });
});
