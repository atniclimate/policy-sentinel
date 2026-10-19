import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { courtLinks, ncaiSearches } from "../src/demo/ncai-2026.ts";
import {
  openNcaiDrafts,
  parseNcaiDrafts,
  sealNcaiDrafts,
} from "../src/demo/ncai-vault.ts";

const vaultPath = fileURLToPath(
  new URL("../src/demo/ncai-2026.vault.json", import.meta.url),
);
const ID = /^PSC-26-\d{3}$/;
const BILL = /^(hr|s|hjres|sjres|hconres|sconres|hres|sres) \d{1,5} \d{2,3}$/;

const USAGE = [
  "Seal or open the NCAI 2026 drafts vault (src/demo/ncai-2026.vault.json).",
  "The password is read from the NCAI_DEMO_PASSWORD environment variable.",
  "",
  "Usage:",
  "  node scripts/ncai-vault.mjs seal <plaintext.json>",
  "  node scripts/ncai-vault.mjs open <out.json>",
  "",
].join("\n");

/** Checks a plaintext draft list before sealing; returns counts only. */
export function checkNcaiDrafts(value) {
  const drafts = parseNcaiDrafts(value);
  const seen = new Set();
  let searches = 0;
  let links = 0;
  for (const draft of drafts) {
    const fail = (rule) => {
      throw new Error(`${draft.id}: ${rule}`);
    };
    if (!ID.test(draft.id)) fail("id must match PSC-26-NNN");
    if (seen.has(draft.id)) fail("id is not unique");
    seen.add(draft.id);
    for (const search of ncaiSearches(draft)) {
      const query = search.query;
      if (query.trim() !== query || query.length < 2 || query.length > 200)
        fail("each search must be trimmed and 2 to 200 characters");
      if (search.group === "bill" && !BILL.test(query))
        fail("each bill must be a Congress.gov reference such as hr 1 119");
      searches += 1;
    }
    for (const link of courtLinks(draft)) {
      if (!link.url.startsWith("https://www.courtlistener.com/?"))
        fail("each court link must be a CourtListener search");
      links += 1;
    }
  }
  return { drafts: drafts.length, searches, links };
}

async function main([command, file]) {
  if ((command !== "seal" && command !== "open") || !file) {
    process.stderr.write(USAGE);
    return 2;
  }
  const password = process.env.NCAI_DEMO_PASSWORD;
  if (!password) {
    process.stderr.write("NCAI_DEMO_PASSWORD is not set.\n");
    return 1;
  }
  if (command === "seal") {
    const drafts = JSON.parse(await readFile(resolve(file), "utf8"));
    const counts = checkNcaiDrafts(drafts);
    const vault = await sealNcaiDrafts(drafts, password);
    await writeFile(vaultPath, `${JSON.stringify(vault, null, 2)}\n`);
    process.stdout.write(
      `Sealed ${counts.drafts} drafts (${counts.searches} searches, ${counts.links} court links) into src/demo/ncai-2026.vault.json.\n`,
    );
    return 0;
  }
  const drafts = await openNcaiDrafts(
    JSON.parse(await readFile(vaultPath, "utf8")),
    password,
  );
  // flag "wx" refuses to overwrite an existing file.
  await writeFile(resolve(file), `${JSON.stringify(drafts, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`Opened ${drafts.length} drafts into ${file}.\n`);
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    // A JSON syntax message quotes the input, so it is not printed.
    const message =
      error instanceof SyntaxError
        ? "the input is not valid JSON"
        : error instanceof Error
          ? error.message
          : String(error);
    process.stderr.write(`ncai-vault failed: ${message}\n`);
    process.exitCode = 1;
  }
}
