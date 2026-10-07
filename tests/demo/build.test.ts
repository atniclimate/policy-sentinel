// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
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
});
