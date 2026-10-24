// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error build script has no declaration file
import { scanDemoOutput } from "../../scripts/finish-demo-build.mjs";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ps-demo-scan-"));
  roots.push(root);
  mkdirSync(join(root, "demo-assets", "nested"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    '<script src="demo-assets/app.js"></script>',
  );
  writeFileSync(join(root, "demo-assets", "app.js"), 'console.info("demo");');
  return root;
}
// Synthetic stand-ins: the format signature, then bytes that are no real font or image.
const woff2 = Buffer.from("wOF2 synthetic bytes");
const ttf = Buffer.concat([
  Buffer.from([0, 1, 0, 0]),
  Buffer.from("synthetic"),
]);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const png = Buffer.concat([pngSignature, Buffer.from("synthetic")]);
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
describe("generated demo boundary", () => {
  it("scans nested and unreferenced assets without reading historical docs", () => {
    const root = fixture();
    writeFileSync(
      join(root, "historical.md"),
      "Preserved record outside generated demo scan.",
    );
    writeFileSync(
      join(root, "demo-assets", "nested", "safe.js"),
      "export const x = 1;",
    );
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 3 });
    writeFileSync(
      join(root, "demo-assets", "nested", "safe.js"),
      'const api_key="abcdefghijklmnopqrstuvwxyz";',
    );
    expect(() => scanDemoOutput(root)).toThrow(/prohibited content/);
  });
  it("rejects source maps and unexpected payload files", () => {
    const root = fixture();
    writeFileSync(join(root, "demo-assets", "raw.json"), "{}");
    expect(() => scanDemoOutput(root)).toThrow(/unexpected asset type/);
  });
  it("rejects source map directives and generated local paths", () => {
    for (const text of [
      "//# sourceMappingURL=app.map",
      "C:\\Users\\Example\\private.txt",
      JSON.stringify("C:\\Users\\Example\\private.txt"),
      JSON.stringify({ api_key: "abcdefghijklmnop" }),
      'fetch("https://api.regulations.gov/v4/documents?api_key=AbCdEf0123456789AbCdEf01")',
      'url.searchParams.set("api_key","AbCdEf0123456789AbCdEf01")',
      'headers.set("X-Api-Key", "AbCdEf0123456789AbCdEf01")',
    ]) {
      const root = fixture();
      writeFileSync(join(root, "demo-assets", "app.js"), text);
      expect(() => scanDemoOutput(root)).toThrow(/prohibited content/);
    }
  });
  it("accepts web and document fonts and counts them", () => {
    const root = fixture();
    writeFileSync(
      join(root, "demo-assets", "roboto-400-latin-Ab12Cd34.woff2"),
      woff2,
    );
    writeFileSync(
      join(root, "demo-assets", "nested", "LexendDeca-Regular-Ef56Gh78.ttf"),
      ttf,
    );
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 4 });
  });
  it("accepts a PNG image and counts it", () => {
    const root = fixture();
    writeFileSync(join(root, "demo-assets", "seal-Ab12Cd34.png"), png);
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 3 });
  });
  it("does not scan font or image bytes as text", () => {
    const root = fixture();
    // Binary data can match a text pattern by chance; that must not refuse a build.
    const chance = Buffer.from("//# sourceMappingURL=font.map");
    writeFileSync(
      join(root, "demo-assets", "font.woff2"),
      Buffer.concat([woff2, chance]),
    );
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 3 });
    writeFileSync(
      join(root, "demo-assets", "seal.png"),
      Buffer.concat([png, chance]),
    );
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 4 });
    // The same bytes under a scanned name are still refused.
    writeFileSync(
      join(root, "demo-assets", "font.css"),
      "/*# sourceMappingURL=font.map */",
    );
    expect(() => scanDemoOutput(root)).toThrow(/prohibited content/);
  });
  it("refuses other asset types and files that are not the font or image they claim", () => {
    for (const [name, bytes] of [
      ["seal.PNG", png],
      ["seal.jpg", png],
      ["seal.gif", png],
      ["seal.svg", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")],
      ["seal.webp", png],
      ["notes.png", Buffer.from("plain text under an image name")],
      ["swapped.png", ttf],
      ["cut.png", pngSignature.subarray(0, 4)],
      ["empty.png", Buffer.alloc(0)],
      ["swapped.ttf", png],
      ["font.woff", woff2],
      ["font.otf", ttf],
      ["font.eot", ttf],
      ["font.TTF", ttf],
      ["OFL-roboto.txt", Buffer.from("license text")],
      ["app.js.map", Buffer.from("{}")],
      ["notes.ttf", Buffer.from("plain text under a font name")],
      ["swapped.woff2", ttf],
      ["swapped.ttf", woff2],
      ["empty.woff2", Buffer.alloc(0)],
    ] as const) {
      const root = fixture();
      writeFileSync(join(root, "demo-assets", name), bytes);
      expect(() => scanDemoOutput(root), name).toThrow(/unexpected asset type/);
    }
  });
  it("refuses fonts reached through a link", () => {
    const root = fixture();
    const outside = join(root, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "font.ttf"), ttf);
    // A junction needs no privilege on Windows; elsewhere it is an ordinary directory link.
    symlinkSync(outside, join(root, "demo-assets", "fonts"), "junction");
    expect(() => scanDemoOutput(root)).toThrow(/linked asset/);
  });
});
