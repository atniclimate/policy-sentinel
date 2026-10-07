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

const forbidden = [
  /api[_-]?key["']?\s*[:=]\s*["'][A-Za-z0-9]{16,}/i,
  /X-Api-Key["']?\s*:\s*["'][A-Za-z0-9]{16,}/i,
  /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /[A-Za-z]:[\\/]+(?:Users|dev|policy-sentinel|ATNI-TERRA)[\\/]+/i,
  /sourceMappingURL\s*=/,
  /Passage note from the browser check\./,
  /Policy note from the browser check\./,
];

export function scanDemoOutput(root) {
  const targets = [join(root, "index.html")];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("demo build refused: linked asset");
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && /\.(?:js|css)$/.test(entry.name))
        targets.push(file);
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
  return { generatedFiles: targets.length };
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
