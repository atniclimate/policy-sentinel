// The static index acquisition (index conditions A3, A5, D1, D2, I2 as
// adjusted by D-125). The only code that fetches for docs/demo-data. Never
// run by build, check, demo:build or test; the main session runs it within
// the stated call budget.
import {
  closeSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";

import { canonicalJson } from "../../src/core/canonical-json.mjs";
import { sha256Bytes } from "../../src/pipeline/hashing.mjs";
import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns.ts";
import { calendarDate } from "../../src/demo/local-day.ts";
import { buildCfrShard } from "./cfr.mjs";
import { cfrArchive, listsCfrArchive } from "./cfr-listing.mjs";
import {
  ACQUIRE_VERSION,
  REPO_ROOT,
  INCOMPLETE_PROBE,
  StageError,
  isFullProbe,
  insideRepo,
  loadNationProbe,
  loadProbeNames,
  manifestBytes,
  sanitizeMessage,
  shardBytes,
} from "./common.mjs";
import { buildUslmShard } from "./uslm.mjs";
import { schemaErrors, validateDemoIndex } from "./validate.mjs";
import { mapFrAgencies, mapFrTopics } from "./vocab.mjs";
import { listZipEntries, readZipEntry } from "./zip.mjs";

export const MIN_SPACING_MS = 1100;
const MiB = 1024 * 1024;
const JSON_TYPES = ["application/json"];
const ZIP_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
];

export const USAGE = `usage: node scripts/acquire-demo-index.mjs <command> [options]
  cfr   --title N --edition YYYY [--volumes 1,2]   GovInfo CFR annual edition (bulk listing + title zip)
  vocab [--only fr-agencies|fr-topics]              Federal Register agencies and topics
  uslm  --title N --release-point 119-136 --terms-read YYYY-MM-DD   OLRC USLM title zip
common: --dry-run | --work-dir <outside repo> --report <new file outside repo> --rights-file <json>
        [--nation-names <reviewed recognition notice HTML>; default: the committed hash file] [--keep-raw]`;

const SOURCES = {
  cfr: {
    id: "govinfo-cfr-annual",
    name: "GovInfo bulk data, Code of Federal Regulations annual edition",
    urlTemplate:
      "https://www.govinfo.gov/bulkdata/CFR/{year}/title-{title}/CFR-{year}-title-{title}.zip",
    // The edition the rows quote; eCFR's current text is a different source and date.
    linkTemplate: "https://www.govinfo.gov/bulkdata/CFR/{year}/title-{title}",
  },
  uslm: {
    id: "olrc-uslm",
    name: "Office of the Law Revision Counsel, United States Code (USLM)",
    urlTemplate:
      "https://uscode.house.gov/download/releasepoints/us/pl/{congress}/{law}/xml_usc{title}@{releasePoint}.zip",
    linkTemplate:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title{title}-section{section}&num=0&edition=prelim",
  },
  "fr-agencies": {
    id: "federal-register-api",
    name: "Federal Register API, agencies",
    urlTemplate: "https://www.federalregister.gov/api/v1/agencies",
    linkTemplate: "https://www.federalregister.gov/agencies/{id}",
  },
  "fr-topics": {
    id: "federal-register-api",
    name: "Federal Register API, topics",
    urlTemplate:
      "https://www.federalregister.gov/api/v1/documents/facets/topic",
    linkTemplate: "https://www.federalregister.gov/topics/{id}",
  },
};

export class UsageError extends Error {}

const pad2 = (n) => String(n).padStart(2, "0");

/** Parse and check the command line; refuses "current" and unpinned inputs. */
export function parseAcquireArgs(argv) {
  const [command, ...rest] = argv;
  // D-135: eCFR's versioner path is robots-disallowed, so nothing here fetches it.
  if (command === "ecfr")
    throw new UsageError(
      "ecfr is refused: the owner ruled out fetching eCFR's versioner path (D-135). eCFR stays a link-out; CFR text comes from the GovInfo annual edition (cfr).",
    );
  if (!["cfr", "vocab", "uslm"].includes(command)) throw new UsageError(USAGE);
  const sourceFlags = {
    cfr: ["title", "edition", "volumes"],
    vocab: ["only"],
    uslm: ["title", "terms-read", "release-point"],
  };
  const { values, tokens } = parseArgs({
    args: rest,
    strict: true,
    tokens: true,
    options: {
      ...Object.fromEntries(
        sourceFlags[command].map((name) => [name, { type: "string" }]),
      ),
      "dry-run": { type: "boolean", default: false },
      "work-dir": { type: "string" },
      report: { type: "string" },
      "rights-file": { type: "string" },
      "nation-names": { type: "string" },
      "keep-raw": { type: "boolean", default: false },
    },
  });
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name))
      throw new UsageError(
        `Option --${token.name} was supplied more than once.`,
      );
    seen.add(token.name);
  }
  const options = {
    command,
    dryRun: values["dry-run"],
    keepRaw: values["keep-raw"],
  };
  if (command !== "vocab") {
    if (
      !/^\d{1,2}$/.test(values.title ?? "") ||
      Number(values.title) < 1 ||
      Number(values.title) > 54
    )
      throw new UsageError("--title N is required (a title number)");
    options.title = Number(values.title);
    if (command !== "uslm" && options.title > 50)
      throw new UsageError("a CFR title is 1 to 50");
  }
  if (command === "cfr") {
    if (!/^\d{4}$/.test(values.edition ?? ""))
      throw new UsageError('--edition YYYY is required; "current" is refused');
    options.edition = Number(values.edition);
    options.volumes = null;
    if (values.volumes !== undefined) {
      if (!/^\d{1,2}(?:,\d{1,2})*$/.test(values.volumes))
        throw new UsageError("--volumes is a list such as 1,2");
      options.volumes = [
        ...new Set(values.volumes.split(",").map(Number)),
      ].sort((a, b) => a - b);
    }
  }
  if (command === "vocab") {
    if (
      values.only !== undefined &&
      !["fr-agencies", "fr-topics"].includes(values.only)
    )
      throw new UsageError("--only is fr-agencies or fr-topics");
    options.only = values.only ?? null;
  }
  if (command === "uslm") {
    if (!calendarDate(values["terms-read"]))
      throw new UsageError(
        "--terms-read YYYY-MM-DD is required: the source's terms must be read first",
      );
    options.termsRead = values["terms-read"];
    const point = values["release-point"] ?? "";
    if (!/^\d{2,3}-\d{1,4}(?:not\d{1,4})?$/.test(point))
      throw new UsageError(
        '--release-point such as 119-136 or 119-60not43 is required; "current" is refused',
      );
    options.releasePoint = point;
  }
  if (!options.dryRun) {
    for (const name of ["work-dir", "report"])
      if (!values[name])
        throw new UsageError(`--${name} is required unless --dry-run`);
    if (!values["rights-file"])
      throw new UsageError(
        "--rights-file is required: no file is marked current without the owner's reading",
      );
  }
  options.workDir = values["work-dir"] ? resolve(values["work-dir"]) : null;
  options.report = values.report ? resolve(values.report) : null;
  options.rightsFile = values["rights-file"]
    ? resolve(values["rights-file"])
    : null;
  options.nationNames = values["nation-names"]
    ? resolve(values["nation-names"])
    : null;
  return options;
}

/** The exact requests a run makes, in order. */
export function planRequests(options) {
  const { command, title } = options;
  if (command === "cfr") {
    const archive = cfrArchive(options.edition, title);
    return [
      {
        label: "listing",
        url: archive.listingUrl,
        accept: "application/json",
        types: JSON_TYPES,
        maxBytes: MiB,
      },
      {
        label: "zip",
        url: archive.zipUrl,
        accept: "application/zip",
        types: ZIP_TYPES,
        maxBytes: 300 * MiB,
      },
    ];
  }
  if (command === "vocab") {
    return ["fr-agencies", "fr-topics"]
      .filter((name) => !options.only || options.only === name)
      .map((name) => ({
        label: name,
        url: SOURCES[name].urlTemplate,
        accept: "application/json",
        types: JSON_TYPES,
        maxBytes: 16 * MiB,
      }));
  }
  const [congress, law] = options.releasePoint.split("-");
  return [
    {
      label: "zip",
      url: `https://uscode.house.gov/download/releasepoints/us/pl/${congress}/${law}/xml_usc${pad2(title)}@${options.releasePoint}.zip`,
      accept: "application/zip",
      types: ZIP_TYPES,
      maxBytes: 400 * MiB,
    },
  ];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Request one planned URL: no retry; stop on a non-200 or a wrong content type. */
async function fetchPlanned(request, ctx) {
  const wait =
    ctx.lastRequestAt === null
      ? 0
      : ctx.minSpacingMs - (ctx.now() - ctx.lastRequestAt);
  if (wait > 0) await ctx.sleep(wait);
  ctx.lastRequestAt = ctx.now();
  ctx.used += 1;
  if (ctx.windowStart === null)
    ctx.windowStart = new Date(ctx.now()).toISOString();
  const controller = new AbortController();
  let reader;
  async function download() {
    let response;
    try {
      response = await ctx.fetch(request.url, {
        headers: { Accept: request.accept },
        redirect: "error",
        signal: controller.signal,
      });
    } catch {
      throw new StageError(
        "fetch",
        `the ${request.label} request did not complete`,
      );
    }
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => {});
      throw controller.signal.reason;
    }
    reader = response.body?.getReader();
    if (response.status !== 200)
      throw new StageError(
        "fetch",
        `the ${request.label} request answered ${response.status}`,
      );
    const type = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!request.types.includes(type))
      throw new StageError(
        "fetch",
        `the ${request.label} request answered ${type || "no content type"}`,
      );
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > request.maxBytes)
      throw new StageError("fetch", `the ${request.label} answer is too large`);
    const chunks = [];
    let length = 0;
    try {
      while (reader) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        length += chunk.byteLength;
        if (length > request.maxBytes)
          throw new StageError(
            "fetch",
            `the ${request.label} answer is too large`,
          );
        chunks.push(chunk);
      }
    } catch (error) {
      if (error instanceof StageError) throw error;
      throw new StageError(
        "fetch",
        `the ${request.label} answer was interrupted`,
      );
    }
    if (controller.signal.aborted) throw controller.signal.reason;
    return Buffer.concat(chunks, length);
  }
  let timer;
  const deadline = new Promise((_, reject) => {
    // The largest permitted title ZIP is 400 MiB. Bound the entire download.
    timer = setTimeout(
      () =>
        reject(
          new StageError("fetch", `the ${request.label} request timed out`),
        ),
      5 * 60_000,
    );
  });
  let bytes;
  try {
    bytes = await Promise.race([download(), deadline]);
  } catch (error) {
    controller.abort();
    void reader?.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    reader?.releaseLock();
  }
  ctx.lastRequestAt = ctx.now();
  ctx.windowEnd = new Date(ctx.now()).toISOString();
  // Downloaded bytes live only in the work directory, outside the repository.
  const raw = join(
    ctx.workDir,
    `raw-${ctx.used}-${basename(new URL(request.url).pathname) || "answer"}`,
  );
  writeFileSync(raw, bytes, { flag: "wx" });
  ctx.rawFiles.push(raw);
  return bytes;
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new StageError("fetch", `the ${label} answer is not JSON`);
  }
}

async function acquireCfr(options, ctx) {
  const [listingRequest, zipRequest] = planRequests(options);
  const listing = parseJsonBytes(
    await fetchPlanned(listingRequest, ctx),
    "listing",
  );
  if (!listsCfrArchive(listing, cfrArchive(options.edition, options.title)))
    throw new StageError(
      "fetch",
      "the listing does not name the title zip at its expected address",
    );
  const zip = await fetchPlanned(zipRequest, ctx);
  let volumes;
  try {
    const wanted = new RegExp(
      `^CFR-${options.edition}-title${options.title}-vol(\\d+)\\.xml$`,
    );
    volumes = listZipEntries(zip)
      .map((entry) => ({
        entry,
        volume: Number(wanted.exec(basename(entry.name))?.[1]),
      }))
      .filter(
        ({ volume }) =>
          volume && (!options.volumes || options.volumes.includes(volume)),
      )
      .sort((a, b) => a.volume - b.volume);
    const totalBytes = volumes.reduce((sum, { entry }) => sum + entry.size, 0);
    if (totalBytes > 512 * MiB)
      throw new Error("selected volumes exceed 512 MiB uncompressed");
  } catch (error) {
    throw new StageError(
      "fetch",
      `the title zip could not be read: ${error.message}`,
    );
  }
  const found = volumes.map((v) => v.volume);
  if (
    found.length === 0 ||
    (options.volumes && options.volumes.some((v) => !found.includes(v)))
  )
    throw new StageError("fetch", "the title zip lacks a requested volume");
  let built;
  try {
    built = buildCfrShard(readCfrVolumes(zip, volumes), {
      title: options.title,
      editionYear: options.edition,
      names: ctx.names,
    });
  } catch (error) {
    if (error instanceof StageError) throw error;
    throw new StageError(
      "normalize",
      `a volume could not be parsed: ${error.message}`,
    );
  }
  const source = {
    ...SOURCES.cfr,
    requestCount: 2,
    retrievedAt: ctx.windowEnd,
    rights: ctx.rights,
    editionYear: options.edition,
    revisedAsOfText: built.shard.revisedAsOfText,
    volumes: built.shard.volumes,
  };
  return [
    {
      path: `cfr/title-${options.title}.json`,
      value: built.shard,
      source,
      report: built.report,
    },
  ];
}

function* readCfrVolumes(zip, volumes) {
  for (const { entry, volume } of volumes) {
    let xml;
    try {
      xml = readZipEntry(zip, entry).toString("utf8");
    } catch (error) {
      throw new StageError(
        "fetch",
        `the title zip could not be read: ${error.message}`,
      );
    }
    yield { volume, xml };
  }
}

async function acquireVocab(options, ctx) {
  const out = [];
  for (const request of planRequests(options)) {
    const json = parseJsonBytes(
      await fetchPlanned(request, ctx),
      request.label,
    );
    const mapped =
      request.label === "fr-agencies"
        ? mapFrAgencies(json, ctx.names)
        : mapFrTopics(json, ctx.names);
    if (!mapped.file.entries.length)
      throw new StageError(
        "normalize",
        `the ${request.label} vocabulary has no usable entries`,
      );
    const { id, name, urlTemplate, linkTemplate } = SOURCES[request.label];
    out.push({
      path: `vocab/${request.label}.json`,
      value: mapped.file,
      source: {
        id,
        name,
        urlTemplate,
        linkTemplate,
        requestCount: 1,
        retrievedAt: ctx.windowEnd,
        rights: ctx.rights,
      },
      report: mapped.report,
    });
  }
  return out;
}

async function acquireUslm(options, ctx) {
  const [request] = planRequests(options);
  const zip = await fetchPlanned(request, ctx);
  let xml;
  try {
    const entry = listZipEntries(zip).find(
      (e) => basename(e.name) === `usc${pad2(options.title)}.xml`,
    );
    if (!entry) throw new Error("the title XML is missing");
    xml = readZipEntry(zip, entry).toString("utf8");
  } catch (error) {
    throw new StageError(
      "fetch",
      `the title zip could not be read: ${error.message}`,
    );
  }
  let built;
  try {
    built = buildUslmShard(xml, {
      title: options.title,
      releasePoint: options.releasePoint,
      names: ctx.names,
    });
  } catch (error) {
    if (error instanceof StageError) throw error;
    throw new StageError(
      "normalize",
      `the title could not be parsed: ${error.message}`,
    );
  }
  const source = {
    ...SOURCES.uslm,
    requestCount: 1,
    retrievedAt: ctx.windowEnd,
    rights: ctx.rights,
    releasePoint: options.releasePoint,
    publicationName: built.shard.publicationName,
    currentThroughText: built.shard.currentThroughText,
    upstreamSha256: sha256Bytes(zip),
    upstreamBytes: zip.length,
  };
  return [
    {
      path: `usc/title-${options.title}.json`,
      value: built.shard,
      source,
      report: built.report,
    },
  ];
}

const entryKey = (entry) => entry.part ?? entry.identifier ?? entry.id;

function diffEntries(before, after) {
  const old = new Map(
    (before?.entries ?? []).map((e) => [entryKey(e), canonicalJson(e)]),
  );
  const now = new Map(
    after.entries.map((e) => [entryKey(e), canonicalJson(e)]),
  );
  let added = 0;
  let changed = 0;
  for (const [key, text] of now) {
    if (!old.has(key)) added += 1;
    else if (old.get(key) !== text) changed += 1;
  }
  const removed = [...old.keys()].filter((key) => !now.has(key)).length;
  return { added, removed, changed };
}

const asOf = (source) =>
  source
    ? (source.revisedAsOfText ??
      source.releasePoint ??
      source.pointInTimeDate ??
      `retrieved ${source.retrievedAt}`)
    : null;
const summary = (entry) =>
  entry && {
    status: entry.status,
    sha256: entry.sha256,
    sizeBytes: entry.sizeBytes,
    entryCount: entry.entryCount,
    asOf: asOf(entry.source),
  };

/** Write the files then the manifest, after the whole new index validated in a staging copy. */
function stageAndValidate(dataDir, workDir, writes, manifest, probe) {
  const stageDir = mkdtempSync(join(workDir, "stage-"));
  try {
    cpSync(dataDir, stageDir, { recursive: true });
    for (const { path, bytes } of writes) {
      mkdirSync(dirname(join(stageDir, path)), { recursive: true });
      writeFileSync(join(stageDir, path), bytes);
    }
    writeFileSync(join(stageDir, "manifest.json"), manifestBytes(manifest));
    return validateDemoIndex(stageDir, { probe, staleAsWarning: true });
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

// A recovery can run long after the original install. Recheck every component
// before reading, replacing or removing a path recorded in the journal.
function unlinkedPath(base, parts) {
  let current = base;
  for (const part of parts) {
    current = join(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (stat) {
      const canonical = realpathSync.native(current);
      if (
        stat.isSymbolicLink() ||
        relative(dirname(current), dirname(canonical)) !== ""
      )
        throw new Error(
          "A linked path cannot be used in an index transaction.",
        );
      current = canonical;
    }
  }
  return current;
}

// Keep the undo record outside Pages, on the same volume as the index. SQLite's
// exclusive lock spans acquisition and is released by the OS if the writer dies.
function openIndexJournal(dataDir) {
  const absolute = resolve(dataDir);
  const drive = parse(absolute).root;
  const root = realpathSync.native(
    unlinkedPath(drive, relative(drive, absolute).split(sep)),
  );
  const parent = dirname(root);
  const cacheRoot =
    basename(parent).toLowerCase() === "docs" ? dirname(parent) : parent;
  const state = unlinkedPath(cacheRoot, [
    ".cache",
    "index-install",
    sha256Bytes(Buffer.from(root)),
  ]);
  mkdirSync(state, { recursive: true });
  const db = new DatabaseSync(unlinkedPath(state, ["undo.sqlite"]));
  const scratch = join(state, "replacement");
  const targetFor = (path) => {
    if (
      typeof path !== "string" ||
      !path.split("/").every((part) => /^[a-z0-9][a-z0-9._-]*$/i.test(part))
    )
      throw new Error("Invalid file path in the index transaction.");
    return unlinkedPath(root, path.split("/"));
  };
  const replace = (target, bytes) => {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(scratch, bytes, { flag: "wx" });
    renameSync(scratch, target);
  };
  const restore = () => {
    rmSync(scratch, { force: true });
    // Replaying the same backups is safe even if the last recovery was interrupted.
    for (const { path, bytes } of db
      .prepare("SELECT path, bytes FROM undo ORDER BY rowid")
      .iterate()) {
      const target = targetFor(path);
      if (bytes === null) {
        if (existsSync(target)) rmSync(target);
      } else if (!existsSync(target) || !readFileSync(target).equals(bytes)) {
        replace(target, bytes);
      }
    }
    db.exec("DELETE FROM undo");
  };
  try {
    db.exec(
      "PRAGMA locking_mode=EXCLUSIVE; PRAGMA auto_vacuum=FULL; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS undo (path TEXT PRIMARY KEY, bytes BLOB); COMMIT",
    );
    restore();
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    close: () => db.close(),
    install(writes) {
      // Commit the complete previous generation before touching the first shard.
      db.exec("BEGIN");
      try {
        const save = db.prepare("INSERT INTO undo (path, bytes) VALUES (?, ?)");
        for (const { path } of writes) {
          const target = targetFor(path);
          save.run(path, existsSync(target) ? readFileSync(target) : null);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      try {
        for (const { path, bytes } of writes) replace(targetFor(path), bytes);
        db.exec("DELETE FROM undo");
      } catch (error) {
        restore();
        throw error;
      }
    },
  };
}

export function installIndexFiles(dataDir, writes) {
  const journal = openIndexJournal(dataDir);
  try {
    journal.install(writes);
  } finally {
    journal.close();
  }
}

/**
 * Run the acquisition. `deps` (for tests): fetch, now (ms), sleep, log,
 * dataDir, repoRoot, minSpacingMs.
 */
export async function runAcquire(argv, deps = {}) {
  const log = deps.log ?? console.log;
  let options;
  try {
    options = parseAcquireArgs(argv);
  } catch (error) {
    log(error.message);
    return { exitCode: 2 };
  }
  const plan = planRequests(options);
  if (options.dryRun) {
    for (const request of plan) log(`GET ${request.url}`);
    log(
      `${plan.length} requests planned, at least ${MIN_SPACING_MS} ms apart, no retry; nothing fetched (--dry-run)`,
    );
    return { exitCode: 0, plan };
  }
  const repoRoot = deps.repoRoot ?? REPO_ROOT;
  const dataDir = deps.dataDir ?? join(repoRoot, "docs", "demo-data");
  for (const [name, path] of [
    ["--work-dir", options.workDir],
    ["--report", options.report],
  ])
    if (insideRepo(path, repoRoot)) {
      log(`${name} must be outside the repository`);
      return { exitCode: 2 };
    }
  // G3: every file is probed with the full recognition list. With no plain
  // notice, the committed hash file is the probe (D-175).
  const probe = options.nationNames
    ? loadProbeNames(options.nationNames)
    : loadNationProbe({ hashPath: deps.probeHashPath });
  if (!isFullProbe(probe)) {
    log(`${INCOMPLETE_PROBE}; nothing fetched`);
    return { exitCode: 2 };
  }
  let rights = null;
  if (options.rightsFile) {
    rights = readJson(options.rightsFile);
    const problems = schemaErrors("sourceRights", rights);
    if (problems.length) {
      log(`--rights-file is not a rights record: ${problems.join("; ")}`);
      return { exitCode: 2 };
    }
  }
  let journal;
  try {
    journal = openIndexJournal(dataDir);
  } catch (error) {
    log(
      `the local index could not be locked or recovered; nothing fetched: ${error.message}`,
    );
    return { exitCode: 1 };
  }
  try {
    return await acquireLocked({
      options,
      deps,
      dataDir,
      rights,
      probe,
      plan,
      log,
      journal,
    });
  } finally {
    journal.close();
  }
}

async function acquireLocked({
  options,
  deps,
  dataDir,
  rights,
  probe,
  plan,
  log,
  journal,
}) {
  // A stale file must stay refreshable; demo:build and check still enforce C3.
  const before = validateDemoIndex(dataDir, { probe, staleAsWarning: true });
  if (!before.ok) {
    log(
      `the committed index is invalid; nothing fetched: ${before.errors.slice(0, 3).join("; ")}`,
    );
    return { exitCode: 1 };
  }
  const manifestPath = join(dataDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const targetPaths =
    options.command === "vocab"
      ? plan.map((r) => `vocab/${r.label}.json`)
      : [
          `${options.command === "cfr" ? "cfr" : "usc"}/title-${options.title}.json`,
        ];
  for (const path of targetPaths) {
    const entry = manifest.files.find((f) => f.path === path);
    if (!entry || entry.status === "withdrawn") {
      log(
        `${path} is ${entry ? "withdrawn" : "not a planned file"}; nothing fetched`,
      );
      return { exitCode: 2 };
    }
  }

  mkdirSync(options.workDir, { recursive: true });
  const ctx = {
    fetch: deps.fetch ?? globalThis.fetch,
    now: deps.now ?? (() => Date.now()),
    sleep: deps.sleep ?? ((ms) => new Promise((done) => setTimeout(done, ms))),
    minSpacingMs: deps.minSpacingMs ?? MIN_SPACING_MS,
    lastRequestAt: null,
    used: 0,
    windowStart: null,
    windowEnd: null,
    workDir: options.workDir,
    rawFiles: [],
    // The whole probe when it carries hashes, so wordingProblem checks them too.
    names: probe.hashes ? probe : probe.names,
    rights,
  };
  const report = {
    command: options.command,
    pinned: {
      title: options.title ?? null,
      edition: options.edition ?? null,
      volumes: options.volumes ?? null,
      releasePoint: options.releasePoint ?? null,
      termsRead: options.termsRead ?? null,
    },
    requests: { planned: plan.length, used: 0 },
    retrievalWindow: null,
    probes: {
      source: probe.source,
      entryCount: probe.entryCount,
      nameCount: probe.names.length,
    },
    files: [],
    outcome: "failed",
    failure: null,
    validator: null,
  };
  const stamp = () => new Date(ctx.now()).toISOString();
  let exitCode = 1;
  let reportFd;
  try {
    mkdirSync(dirname(options.report), { recursive: true });
    reportFd = openSync(options.report, "wx");
  } catch (error) {
    log(
      error.code === "EEXIST"
        ? "--report already exists; choose a new file"
        : "--report could not be created; nothing fetched",
    );
    return { exitCode: 2 };
  }
  try {
    const next = structuredClone(manifest);
    const writes = [];
    const acquired =
      options.command === "cfr"
        ? await acquireCfr(options, ctx)
        : options.command === "vocab"
          ? await acquireVocab(options, ctx)
          : await acquireUslm(options, ctx);
    for (const item of acquired) {
      const bytes = shardBytes(item.value);
      const entry = next.files.find((f) => f.path === item.path);
      const prior = summary(entry);
      const previous = existsSync(join(dataDir, item.path))
        ? readJson(join(dataDir, item.path))
        : null;
      Object.assign(entry, {
        status: "current",
        sha256: sha256Bytes(bytes),
        sizeBytes: bytes.length,
        entryCount: item.value.entries.length,
        source: item.source,
        patternSetVersion: PATTERN_SET_VERSION,
        lastRefreshAttemptAt: stamp(),
        failureStage: null,
        message: null,
        withdrawnOn: null,
        staleAcknowledgedOn: null,
      });
      writes.push({ path: item.path, bytes });
      report.files.push({
        path: item.path,
        before: prior,
        after: summary(entry),
        entries: diffEntries(previous, item.value),
        details: item.report,
      });
    }
    next.generatedAt = stamp();
    next.generatedBy = {
      script: "scripts/acquire-demo-index.mjs",
      version: ACQUIRE_VERSION,
    };
    const checked = stageAndValidate(
      dataDir,
      options.workDir,
      writes,
      next,
      probe,
    );
    report.validator = checked.ok ? "pass" : checked.errors.slice(0, 20);
    if (!checked.ok)
      throw new StageError(
        "validation",
        "the refreshed index did not validate",
      );
    journal.install([
      ...writes,
      { path: "manifest.json", bytes: manifestBytes(next) },
    ]);
    report.outcome = "written";
    exitCode = 0;
  } catch (error) {
    const stage = error instanceof StageError ? error.stage : "packaging";
    const message =
      error instanceof StageError
        ? sanitizeMessage(error.message)
        : "Local index packaging failed.";
    report.failure = { stage, message };
    // D2: only the manifest records the failure; the committed file stays byte-identical.
    const failed = structuredClone(manifest);
    for (const path of targetPaths) {
      const entry = failed.files.find((f) => f.path === path);
      if (entry.status === "current")
        entry.status = "retained_after_failed_refresh";
      Object.assign(entry, {
        lastRefreshAttemptAt: stamp(),
        failureStage: stage,
        message,
      });
    }
    failed.generatedAt = stamp();
    const checked = stageAndValidate(
      dataDir,
      options.workDir,
      [],
      failed,
      probe,
    );
    if (checked.ok)
      journal.install([
        { path: "manifest.json", bytes: manifestBytes(failed) },
      ]);
    else report.failure.manifestNotUpdated = checked.errors.slice(0, 5);
    log(`refresh failed at ${stage}: ${message}`);
  } finally {
    report.requests.used = ctx.used;
    report.retrievalWindow = ctx.windowStart
      ? { start: ctx.windowStart, end: ctx.windowEnd }
      : null;
    try {
      writeFileSync(reportFd, `${JSON.stringify(report, null, 2)}\n`);
    } finally {
      closeSync(reportFd);
      if (!options.keepRaw)
        for (const raw of ctx.rawFiles) rmSync(raw, { force: true });
    }
  }
  log(
    `${report.outcome}: ${ctx.used} of ${plan.length} requests used; report ${options.report}`,
  );
  return { exitCode, report };
}
