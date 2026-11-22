// Scan generated demo files. Historical Markdown is a separate, tracked Pages
// publication surface; release review inventories it without copying local notes.
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  lstatSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { copyThirdPartyNotices } from "./copy-third-party-notices.mjs";
import {
  FORBIDDEN_OUTPUT as forbidden,
  INCOMPLETE_PROBE,
  isFullProbe,
  loadNationProbe,
} from "./demo-index/common.mjs";
import { validateDemoIndex } from "./demo-index/validate.mjs";

// Fonts and PNG images are binary and are not text-scanned, so each must open
// with the signature of the format its name claims.
const signatures = {
  woff2: Buffer.from("wOF2"),
  ttf: Buffer.from([0, 1, 0, 0]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

// The static index (index conditions K1): the validator's full check, which
// also applies the forbidden list (G7) to the manifest and every present file.
// Absent until the first build lays it down.
// Index files need the full Nation-name list (G3): the committed hash file, or
// the plain list named by DEMO_NATION_NAMES.
function scanDemoData(root, { now, probe } = {}) {
  const data = join(root, "demo-data");
  if (!existsSync(data)) return 0;
  if (lstatSync(data).isSymbolicLink())
    throw new Error("demo build refused: linked index directory");
  probe ??= loadNationProbe({
    namesPath: process.env.DEMO_NATION_NAMES || undefined,
  });
  const result = validateDemoIndex(data, { now, probe });
  if (!result.ok)
    throw new Error(
      `demo build refused: demo index invalid: ${result.errors.slice(0, 3).join("; ")}`,
    );
  if (result.fileCount > 0 && !isFullProbe(probe))
    throw new Error(
      `demo build refused: ${result.fileCount} index files present; ${INCOMPLETE_PROBE}`,
    );
  return result.fileCount + 1; // + 1 is the manifest
}

export function scanDemoOutput(root, options = {}) {
  const indexFiles = scanDemoData(root, options);
  const targets = [join(root, "index.html")];
  let binaries = 0;
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      const signature = signatures[/\.(woff2|ttf|png)$/.exec(entry.name)?.[1]];
      if (entry.isSymbolicLink())
        throw new Error("demo build refused: linked asset");
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && /\.(?:js|css)$/.test(entry.name))
        targets.push(file);
      else if (
        entry.isFile() &&
        signature &&
        readFileSync(file).subarray(0, signature.length).equals(signature)
      )
        binaries += 1;
      else throw new Error("demo build refused: unexpected asset type");
    }
  }
  const assets = join(root, "demo-assets");
  if (lstatSync(assets).isSymbolicLink())
    throw new Error("demo build refused: linked asset directory");
  visit(assets);
  for (const file of targets) {
    if (lstatSync(file).isSymbolicLink())
      throw new Error("demo build refused: linked entry");
    const text = readFileSync(file, "utf8");
    if (forbidden.some((pattern) => pattern.test(text))) {
      throw new Error(
        "demo build refused: prohibited content in generated output",
      );
    }
  }
  return { generatedFiles: targets.length + binaries + indexFiles };
}

// After the Vite build: lay the third-party notices into the Pages folder
// (T1.8), scan the generated output, and keep .nojekyll so Pages serves files as they are.
export function finishDemoBuild(repoRoot, emittedFiles) {
  copyThirdPartyNotices(repoRoot);
  const docs = join(repoRoot, "docs");
  const result = scanDemoOutput(docs);
  const nojekyll = join(docs, ".nojekyll");
  if (!existsSync(nojekyll)) writeFileSync(nojekyll, "");
  if (emittedFiles) {
    // Vite owns hashed files in this directory. Its output includes lazy chunks,
    // fonts and images even when index.html does not reference them directly.
    const assets = join(docs, "demo-assets");
    for (const entry of readdirSync(assets, { withFileTypes: true })) {
      if (
        entry.isFile() &&
        /-[\w-]{8}\.(?:js|css|woff2|ttf|png)$/.test(entry.name) &&
        !emittedFiles.has(`demo-assets/${entry.name}`)
      ) {
        unlinkSync(join(assets, entry.name));
        result.generatedFiles--;
      }
    }
  }
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const repo = fileURLToPath(new URL("..", import.meta.url));
  let emittedFiles;
  if (process.argv.includes("--build")) {
    const { build } = await import("vite");
    const built = await build({
      configFile: join(repo, "vite.demo.config.ts"),
    });
    const outputs = Array.isArray(built) ? built : [built];
    emittedFiles = new Set(
      outputs.flatMap(({ output }) => output.map(({ fileName }) => fileName)),
    );
    if (
      !emittedFiles.has("index.html") ||
      ![...emittedFiles].some((name) => name.startsWith("demo-assets/"))
    )
      throw new Error("Demo build did not emit its entry page and assets.");
  }
  const result = finishDemoBuild(repo, emittedFiles);
  console.log(
    `Demo build checked ${result.generatedFiles} generated files.`,
  );
}
