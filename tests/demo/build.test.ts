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
// Synthetic stand-ins: the format signature, then bytes that are no real font.
const woff2 = Buffer.from("wOF2 synthetic bytes");
const ttf = Buffer.concat([
  Buffer.from([0, 1, 0, 0]),
  Buffer.from("synthetic"),
]);
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
  it("does not scan font bytes as text", () => {
    const root = fixture();
    // Binary font data can match a text pattern by chance; that must not refuse a build.
    writeFileSync(
      join(root, "demo-assets", "font.woff2"),
      Buffer.concat([woff2, Buffer.from("//# sourceMappingURL=font.map")]),
    );
    expect(scanDemoOutput(root)).toEqual({ generatedFiles: 3 });
    // The same bytes under a scanned name are still refused.
    writeFileSync(
      join(root, "demo-assets", "font.css"),
      "/*# sourceMappingURL=font.map */",
    );
    expect(() => scanDemoOutput(root)).toThrow(/prohibited content/);
  });
  it("refuses other asset types and files that are not the font they claim", () => {
    for (const [name, bytes] of [
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
