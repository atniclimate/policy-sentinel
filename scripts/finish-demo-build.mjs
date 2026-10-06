// After the demo build: make sure GitHub Pages serves docs/ as plain files,
// and refuse to finish if a secret-looking string reached the published page.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const docs = new URL("../docs/", import.meta.url);
const nojekyll = new URL(".nojekyll", docs);
if (!existsSync(nojekyll)) writeFileSync(nojekyll, "");

const assets = new URL("demo-assets/", docs);
const targets = [
  new URL("index.html", docs).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  ...readdirSync(assets).map((f) =>
    join(assets.pathname.replace(/^\/([A-Za-z]:)/, "$1"), f),
  ),
];
const forbidden = [
  /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{16,}/i,
  /X-Api-Key["']?\s*:\s*["'][A-Za-z0-9]{16,}/i,
  /[A-Za-z]:\\Users\\/,
  /I:\\policy-sentinel/,
];
for (const file of targets) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      console.error(`demo build refused: ${file} matches ${pattern}`);
      process.exit(1);
    }
  }
}
console.log(
  `demo build checked: ${targets.length} published files, no secrets or local paths`,
);
