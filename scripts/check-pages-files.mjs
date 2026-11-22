import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUMMARY_TERMS } from "../src/demo/summaries.ts";

// GitHub Pages serves every file under docs/, including unlinked files.
export function checkPagesFiles(directory) {
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "demo-data", "manifest.json"), "utf8"),
  );
  const expected = new Set([
    ".nojekyll",
    "index.html",
    "THIRD-PARTY-NOTICES.txt",
    "demo-data/manifest.json",
    "source-reviews/local-catalog-evidence.md",
    ...manifest.files
      .filter((entry) => entry.sha256)
      .map((entry) => `demo-data/${entry.path}`),
    ...Object.values(SUMMARY_TERMS).map(({ note }) =>
      note.replace(/^docs\//, ""),
    ),
  ]);
  let count = 0;
  function visit(relativeDirectory) {
    for (const entry of readdirSync(path.join(directory, relativeDirectory), {
      withFileTypes: true,
    })) {
      const relative = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(relative);
        continue;
      }
      const builtAsset =
        /^demo-assets\/[\w.-]+-[\w-]{8}\.(?:js|css|woff2|ttf|png)$/.test(
          relative,
        );
      if (!entry.isFile() || (!expected.delete(relative) && !builtAsset)) {
        throw new Error(`Unexpected file in the Pages directory: ${relative}`);
      }
      count++;
    }
  }
  visit("");
  if (expected.size)
    throw new Error(`Missing Pages files: ${[...expected].join(", ")}`);
  return count;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = fileURLToPath(new URL("../docs/", import.meta.url));
  console.log(
    `Verified ${checkPagesFiles(directory)} files in the Pages directory.`,
  );
}
