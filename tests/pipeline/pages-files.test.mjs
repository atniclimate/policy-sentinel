import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkPagesFiles } from "../../scripts/check-pages-files.mjs";
import { SUMMARY_TERMS } from "../../src/demo/summaries.ts";

test("Pages includes the cited notes and refuses an unlinked working document", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "pages-files-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = [
    "index.html",
    ".nojekyll",
    "THIRD-PARTY-NOTICES.txt",
    "demo-data/manifest.json",
    "source-reviews/local-catalog-evidence.md",
    "demo-assets/fontkit.es-abcdefgh.js",
    ...Object.values(SUMMARY_TERMS).map(({ note }) =>
      note.slice("docs/".length),
    ),
  ];
  for (const file of files) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.endsWith(".json") ? '{"files":[]}' : "");
  }
  assert.equal(checkPagesFiles(root), files.length);
  await writeFile(path.join(root, "working-notes.md"), "");
  assert.throws(() => checkPagesFiles(root), /Unexpected file.*working-notes/);
  await rm(path.join(root, "working-notes.md"));
  await rm(path.join(root, files.at(-1)));
  assert.throws(() => checkPagesFiles(root), /Missing Pages files/);
});
