// Scan generated demo files. Historical Markdown is a separate, tracked Pages
// publication surface; release review inventories it without copying local notes.
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  lstatSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FORBIDDEN_OUTPUT as forbidden } from "./demo-index/common.mjs";
import { validateDemoIndex } from "./demo-index/validate.mjs";

// Fonts and PNG images are binary and are not text-scanned, so each must open
// with the signature of the format its name claims.
const signatures = {
  woff2: Buffer.from("wOF2"),
  ttf: Buffer.from([0, 1, 0, 0]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

// The static index (index conditions K1): the validator's full check, then
// the forbidden list over every file. Absent until the first build lays it down.
function scanDemoData(root, now) {
  const data = join(root, "demo-data");
  if (!existsSync(data)) return 0;
  if (lstatSync(data).isSymbolicLink())
    throw new Error("demo build refused: linked index directory");
  const result = validateDemoIndex(data, now ? { now } : {});
  if (!result.ok)
    throw new Error(
      `demo build refused: demo index invalid: ${result.errors.slice(0, 3).join("; ")}`,
    );
  const files = ["manifest.json", ...listed(data)];
  for (const file of files) {
    const text = readFileSync(join(data, file), "utf8");
    if (forbidden.some((pattern) => pattern.test(text)))
      throw new Error("demo build refused: prohibited content in demo index");
  }
  return files.length;
}

function listed(data) {
  const manifest = JSON.parse(
    readFileSync(join(data, "manifest.json"), "utf8"),
  );
  return manifest.files
    .filter(
      (f) =>
        f.status === "current" || f.status === "retained_after_failed_refresh",
    )
    .map((f) => f.path);
}

export function scanDemoOutput(root, options = {}) {
  const indexFiles = scanDemoData(root, options.now);
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

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const docs = fileURLToPath(new URL("../docs/", import.meta.url));
  const result = scanDemoOutput(docs);
  const nojekyll = join(docs, ".nojekyll");
  if (!existsSync(nojekyll)) writeFileSync(nojekyll, "");
  console.log(
    `demo build checked: ${result.generatedFiles} generated files; tracked historical docs require separate publication review`,
  );
}
