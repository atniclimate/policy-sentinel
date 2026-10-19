import { spawnSync } from "node:child_process";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
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
const repositoryPath = fileURLToPath(new URL("../", import.meta.url));
const ID = /^PSC-26-\d{3}$/;
const BILL = /^(hr|s|hjres|sjres|hconres|sconres|hres|sres) \d{1,5} \d{2,3}$/;

const USAGE = [
  "Seal or open the NCAI 2026 drafts vault (src/demo/ncai-2026.vault.json).",
  "The password is read from the NCAI_DEMO_PASSWORD environment variable.",
  "",
  "Usage:",
  "  node scripts/ncai-vault.mjs seal <plaintext.json>",
  "  node scripts/ncai-vault.mjs open <private/out.json>",
  "  node scripts/ncai-vault.mjs scan <plaintext.json>",
  "Open writes only new, Git-ignored files under this checkout's private/ directory.",
  "Scan checks the built demo artifact without a password and reports only counts.",
  "",
].join("\n");

async function privateOutputPath(file) {
  const output = resolve(file);
  const withinPrivate = relative(resolve(repositoryPath, "private"), output);
  if (
    !withinPrivate ||
    withinPrivate === ".." ||
    withinPrivate.startsWith(`..${sep}`) ||
    isAbsolute(withinPrivate)
  )
    throw new Error(
      "Open output must be inside this checkout's private/ directory.",
    );
  if (withinPrivate.includes(":"))
    throw new Error("Open output must not name a file stream.");
  const root = await realpath(repositoryPath);
  for (
    let parent = dirname(output);
    relative(repositoryPath, parent);
    parent = dirname(parent)
  ) {
    const info = await lstat(parent);
    if (
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      relative(
        await realpath(parent),
        resolve(root, relative(repositoryPath, parent)),
      )
    )
      throw new Error("Open output must not pass through linked directories.");
  }
  // Without --no-index, tracked paths are never considered ignored.
  const ignored = spawnSync(
    "git",
    ["-C", repositoryPath, "check-ignore", "--quiet", "--", output],
    { windowsHide: true },
  );
  if (ignored.status !== 0)
    throw new Error("Open output must be Git-ignored and untracked.");
  return output;
}

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

async function scanNcaiArtifact(file) {
  const source = resolve(file);
  if (!(await lstat(source)).isFile()) throw new Error("Invalid scan input.");
  const drafts = parseNcaiDrafts(JSON.parse(await readFile(source, "utf8")));
  if (!drafts.length) throw new Error("Invalid scan input.");
  checkNcaiDrafts(drafts);
  const needles = [
    ...new Set([
      ...drafts
        .flatMap((draft) => [draft.title, draft.note, ...(draft.topics ?? [])])
        .filter((text) => typeof text === "string" && text.length > 12),
      "private/",
      "private\\",
      basename(source),
      source,
      source.replaceAll("\\", "/"),
    ]),
  ].map((text) => [text, JSON.stringify(text).slice(1, -1)]);
  let files = 0;
  let hits = 0;
  async function scan(path) {
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error("Linked artifact path.");
    if (info.isDirectory()) {
      for (const entry of await readdir(path)) await scan(resolve(path, entry));
      return;
    }
    if (!info.isFile() || info.nlink !== 1)
      throw new Error("Invalid artifact file.");
    const content = await readFile(path, "utf8");
    const decoded = content.replace(
      /\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
      (_, unicode, hex) => String.fromCharCode(parseInt(unicode ?? hex, 16)),
    );
    files += 1;
    hits += needles.filter((forms) =>
      forms.some(
        (needle) => content.includes(needle) || decoded.includes(needle),
      ),
    ).length;
  }
  const docs = resolve(repositoryPath, "docs");
  const index = resolve(docs, "index.html");
  const assets = resolve(docs, "demo-assets");
  const docsInfo = await lstat(docs);
  if (
    docsInfo.isSymbolicLink() ||
    !docsInfo.isDirectory() ||
    !(await lstat(index)).isFile() ||
    !(await lstat(assets)).isDirectory()
  )
    throw new Error("Invalid artifact layout.");
  await scan(index);
  await scan(assets);
  return { drafts: drafts.length, needles: needles.length, files, hits };
}

async function main([command, file]) {
  if (!["seal", "open", "scan"].includes(command) || !file) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (command === "scan") {
    try {
      const counts = await scanNcaiArtifact(file);
      process.stdout.write(`${JSON.stringify(counts)}\n`);
      return counts.hits ? 1 : 0;
    } catch {
      throw new Error("Artifact scan could not complete.");
    }
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
  const output = await privateOutputPath(file);
  const drafts = await openNcaiDrafts(
    JSON.parse(await readFile(vaultPath, "utf8")),
    password,
  );
  // flag "wx" refuses to overwrite an existing file.
  await writeFile(output, `${JSON.stringify(drafts, null, 2)}\n`, {
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
