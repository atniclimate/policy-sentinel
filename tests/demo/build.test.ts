// @vitest-environment node
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  finishDemoBuild,
  scanDemoOutput,
  // @ts-expect-error build script has no declaration file
} from "../../scripts/finish-demo-build.mjs";
import {
  hashedProbe,
  loadProbeNames,
  probeHashFile,
} from "../../scripts/demo-index/common.mjs";
import {
  fullProbeNames,
  nationNameProbes,
} from "../support/nation-name-probes";
import {
  cfrShard,
  vocabFile,
  writeIndex,
  type FixtureFile,
} from "./fixtures/demo-index/build-index";

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
  describe("static index under demo-data (K1, K5)", () => {
    const shard = () => ({ path: "cfr/title-25.json", value: cfrShard() });
    const indexed = (
      files: FixtureFile[],
      tweak?: Parameters<typeof writeIndex>[2],
    ) => {
      const root = fixture();
      writeIndex(join(root, "demo-data"), files, tweak);
      return root;
    };
    // A full list given as hashes only (decision 10).
    const names = fullProbeNames();
    const probe = hashedProbe(probeHashFile(names, names.length), "synthetic");
    it("accepts a manifested shard and counts the index files", () => {
      expect(scanDemoOutput(indexed([shard()]), { probe })).toEqual({
        generatedFiles: 4,
      });
    });
    it("refuses index files when the Nation-name probe is short (G3)", () => {
      const short = loadProbeNames();
      expect(() =>
        scanDemoOutput(indexed([shard()]), { probe: short }),
      ).toThrow(
        /1 index files present, but the Nation-name probes hold \d+ entries, not the full list of 575 \(G3\)/,
      );
      expect(scanDemoOutput(indexed([]), { probe: short })).toEqual({
        generatedFiles: 3,
      });
    });
    it("refuses an unmanifested shard", () => {
      const root = indexed([]);
      writeFileSync(join(root, "demo-data", "cfr-title-99.json"), "{}");
      expect(() => scanDemoOutput(root)).toThrow(/demo index invalid/);
      const listedNot = indexed([]);
      mkdirSync(join(listedNot, "demo-data", "cfr"));
      writeFileSync(join(listedNot, "demo-data", "cfr", "title-25.json"), "{}");
      expect(() => scanDemoOutput(listedNot)).toThrow(
        /not listed in the manifest/,
      );
    });
    it("refuses a hash mismatch", () => {
      const root = indexed([{ ...shard(), entry: { sha256: "e".repeat(64) } }]);
      expect(() => scanDemoOutput(root)).toThrow(/hash mismatch/);
    });
    it("refuses a raw XML string", () => {
      const value = cfrShard();
      value.entries[0].authorityText = "<AUTH><P>5 U.S.C. 301.</P></AUTH>";
      expect(() =>
        scanDemoOutput(indexed([{ path: "cfr/title-25.json", value }])),
      ).toThrow(/demo index invalid/);
    });
    it("refuses an oversize file", () => {
      const value = vocabFile();
      value.entries = Array.from({ length: 3000 }, (_, i) => ({
        id: `agency-${String(i).padStart(5, "0")}`,
        label: `Synthetic agency ${"x".repeat(170)} ${i}`,
        shortLabel: null,
        parentId: null,
      }));
      const root = indexed([{ path: "vocab/fr-agencies.json", value }]);
      expect(() => scanDemoOutput(root)).toThrow(/over 512 KiB/);
    });
    it("refuses a Nation-name probe", () => {
      const value = vocabFile();
      value.entries[0].label = nationNameProbes().find((p) => p.length <= 200)!;
      const root = indexed([{ path: "vocab/fr-agencies.json", value }]);
      expect(() => scanDemoOutput(root, { probe })).toThrow(
        /Nation-name probe hit/,
      );
    });
    it("refuses a stale manifest from 2027 and accepts an acknowledged one", () => {
      const stale = (ack: string | null) =>
        indexed([{ ...shard(), entry: { staleAcknowledgedOn: ack } }], (m) => {
          m.files[0].source!.retrievedAt = "2026-05-01T00:00:00Z";
        });
      const now = new Date("2027-03-01T00:00:00Z");
      expect(() => scanDemoOutput(stale(null), { now })).toThrow(
        /older than 180 days/,
      );
      expect(scanDemoOutput(stale("2027-02-28"), { now, probe })).toEqual({
        generatedFiles: 4,
      });
    });
    it("applies the forbidden list to every index file", () => {
      const root = indexed([shard()]);
      const file = join(root, "demo-data", "cfr", "title-25.json");
      writeFileSync(file, "//# sourceMappingURL=x.map");
      expect(() => scanDemoOutput(root)).toThrow(/demo build refused/);
    });
    it("refuses an index directory reached through a link", () => {
      const root = fixture();
      const outside = join(root, "outside-index");
      writeIndex(outside, []);
      symlinkSync(outside, join(root, "demo-data"), "junction");
      expect(() => scanDemoOutput(root)).toThrow(/linked index directory/);
    });
  });
  it("finishes the build by laying the third-party notices into the Pages folder (T1.8)", () => {
    const repo = mkdtempSync(join(tmpdir(), "ps-demo-finish-"));
    roots.push(repo);
    const docs = join(repo, "docs");
    mkdirSync(join(docs, "demo-assets"), { recursive: true });
    writeFileSync(join(docs, "index.html"), "<p>synthetic</p>");
    writeFileSync(join(docs, "demo-assets", "app.js"), "export {};");
    const notices = "# Third-party notices\r\n\r\nSynthetic, MIT\n";
    writeFileSync(join(repo, "THIRD-PARTY-NOTICES.md"), notices);
    expect(finishDemoBuild(repo)).toEqual({ generatedFiles: 2 });
    expect(readFileSync(join(docs, "THIRD-PARTY-NOTICES.txt"), "utf8")).toBe(
      notices,
    );
    expect(existsSync(join(docs, ".nojekyll"))).toBe(true);
    const missing = mkdtempSync(join(tmpdir(), "ps-demo-finish-"));
    roots.push(missing);
    mkdirSync(join(missing, "docs", "demo-assets"), { recursive: true });
    writeFileSync(join(missing, "docs", "index.html"), "");
    expect(() => finishDemoBuild(missing)).toThrow();
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
