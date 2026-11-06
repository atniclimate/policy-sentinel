// The static index acquisition (index conditions A3, A5, D1, D2, I2 as
// adjusted by D-125). The only code that fetches for docs/demo-data. Never
// run by build, check, demo:build or test; the main session runs it within
// the stated call budget.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { parseArgs } from "node:util";

import { canonicalJson } from "../../src/core/canonical-json.mjs";
import { sha256Bytes } from "../../src/pipeline/hashing.mjs";
import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns.ts";
import { buildCfrShard } from "./cfr.mjs";
import {
  ACQUIRE_VERSION,
  REPO_ROOT,
  FULL_PROBE_ENTRIES,
  StageError,
  isFullProbe,
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
  ecfr  --title N --terms-read YYYY-MM-DD           eCFR "up to date as of" (current reference)
  uslm  --title N --release-point 119-136 --terms-read YYYY-MM-DD   OLRC USLM title zip
common: --dry-run | --work-dir <outside repo> --report <outside repo> --rights-file <json>
        --nation-names <recognition notice HTML, all 575 entries> [--keep-raw]`;

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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad2 = (n) => String(n).padStart(2, "0");

/** Parse and check the command line; refuses "current" and unpinned inputs. */
export function parseAcquireArgs(argv) {
  const [command, ...rest] = argv;
  if (!["cfr", "vocab", "ecfr", "uslm"].includes(command))
    throw new UsageError(USAGE);
  const { values } = parseArgs({
    args: rest,
    strict: true,
    options: {
      title: { type: "string" },
      edition: { type: "string" },
      volumes: { type: "string" },
      only: { type: "string" },
      "terms-read": { type: "string" },
      "release-point": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      "work-dir": { type: "string" },
      report: { type: "string" },
      "rights-file": { type: "string" },
      "nation-names": { type: "string" },
      "keep-raw": { type: "boolean", default: false },
    },
  });
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
  if (command === "ecfr" || command === "uslm") {
    if (!DATE.test(values["terms-read"] ?? ""))
      throw new UsageError(
        "--terms-read YYYY-MM-DD is required: the source's terms must be read first",
      );
    options.termsRead = values["terms-read"];
  }
  if (command === "uslm") {
    const point = values["release-point"] ?? "";
    if (!/^\d{2,3}-\d{1,4}$/.test(point))
      throw new UsageError(
        '--release-point such as 119-136 is required; "current" is refused',
      );
    options.releasePoint = point;
  }
  if (!options.dryRun) {
    for (const name of ["work-dir", "report"])
      if (!values[name])
        throw new UsageError(`--${name} is required unless --dry-run`);
    // eCFR too: D-125 adjustment 1 uses it only after its terms are read (N17).
    if (!values["rights-file"])
      throw new UsageError(
        "--rights-file is required: no file is marked current without the owner's reading",
      );
    if (!values["nation-names"])
      throw new UsageError(
        `--nation-names is required: every file is probed with all ${FULL_PROBE_ENTRIES} recognition entries (G3)`,
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
    const year = options.edition;
    return [
      {
        label: "listing",
        url: `https://www.govinfo.gov/bulkdata/json/CFR/${year}/title-${title}`,
        accept: "application/json",
        types: JSON_TYPES,
        maxBytes: MiB,
      },
      {
        label: "zip",
        url: `https://www.govinfo.gov/bulkdata/CFR/${year}/title-${title}/CFR-${year}-title-${title}.zip`,
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
  if (command === "ecfr") {
    return [
      {
        label: "titles",
        url: "https://www.ecfr.gov/api/versioner/v1/titles.json",
        accept: "application/json",
        types: JSON_TYPES,
        maxBytes: MiB,
      },
    ];
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

function insideRepo(path, repoRoot) {
  const rel = relative(resolve(repoRoot), resolve(path));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
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
  let response;
  try {
    response = await ctx.fetch(request.url, {
      headers: { Accept: request.accept },
      redirect: "error",
    });
  } catch {
    throw new StageError(
      "fetch",
      `the ${request.label} request did not complete`,
    );
  }
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
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > request.maxBytes)
    throw new StageError("fetch", `the ${request.label} answer is too large`);
  ctx.lastRequestAt = ctx.now();
  ctx.windowEnd = new Date(ctx.now()).toISOString();
  // Downloaded bytes live only in the work directory, outside the repository.
  const raw = join(
    ctx.workDir,
    `raw-${ctx.used}-${basename(new URL(request.url).pathname) || "answer"}`,
  );
  writeFileSync(raw, bytes);
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
  const zipName = `CFR-${options.edition}-title-${options.title}.zip`;
  const file =
    Array.isArray(listing?.files) &&
    listing.files.find((f) => f?.justFileName === zipName);
  if (!file || file.link !== zipRequest.url)
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
      .sort((a, b) => a.volume - b.volume)
      .map(({ entry, volume }) => ({
        volume,
        xml: readZipEntry(zip, entry).toString("utf8"),
      }));
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
    built = buildCfrShard(volumes, {
      title: options.title,
      editionYear: options.edition,
      volumes: options.volumes,
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
    volumes: options.volumes,
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
function stageAndValidate(dataDir, stageDir, writes, manifest, probe) {
  rmSync(stageDir, { recursive: true, force: true });
  cpSync(dataDir, stageDir, { recursive: true });
  for (const { path, bytes } of writes) {
    mkdirSync(dirname(join(stageDir, path)), { recursive: true });
    writeFileSync(join(stageDir, path), bytes);
  }
  writeFileSync(join(stageDir, "manifest.json"), manifestBytes(manifest));
  return validateDemoIndex(stageDir, {
    names: probe.names,
    probeSource: probe.source,
  });
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
  const probe = loadProbeNames(options.nationNames ?? undefined);
  if (!isFullProbe(probe)) {
    log(
      `--nation-names holds ${probe.entryCount} recognition entries, not the full list of ${FULL_PROBE_ENTRIES}; nothing fetched`,
    );
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
  const before = validateDemoIndex(dataDir, {
    names: probe.names,
    probeSource: probe.source,
  });
  if (!before.ok) {
    log(
      `the committed index is invalid; nothing fetched: ${before.errors.slice(0, 3).join("; ")}`,
    );
    return { exitCode: 1 };
  }
  const manifestPath = join(dataDir, "manifest.json");
  const manifest = readJson(manifestPath);
  const targetPaths =
    options.command === "ecfr"
      ? [`cfr/title-${options.title}.json`]
      : options.command === "vocab"
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
    names: probe.names,
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
  try {
    const next = structuredClone(manifest);
    const writes = [];
    if (options.command === "ecfr") {
      const [request] = plan;
      const json = parseJsonBytes(
        await fetchPlanned(request, ctx),
        request.label,
      );
      const row =
        Array.isArray(json?.titles) &&
        json.titles.find((t) => t?.number === options.title);
      const asOfText = row?.up_to_date_as_of;
      if (typeof asOfText !== "string" || !DATE.test(asOfText))
        throw new StageError(
          "normalize",
          "the titles list does not state an up to date as of date",
        );
      const entry = next.files.find((f) => f.path === targetPaths[0]);
      entry.currentReference = {
        sourceId: "ecfr",
        upToDateAsOfText: asOfText,
        retrievedAt: ctx.windowEnd,
      };
      report.files.push({
        path: entry.path,
        currentReference: entry.currentReference,
      });
    } else {
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
    }
    next.generatedAt = stamp();
    next.generatedBy = {
      script: "scripts/acquire-demo-index.mjs",
      version: ACQUIRE_VERSION,
    };
    const checked = stageAndValidate(
      dataDir,
      join(options.workDir, "stage"),
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
    for (const { path, bytes } of writes) {
      mkdirSync(dirname(join(dataDir, path)), { recursive: true });
      writeFileSync(join(dataDir, path), bytes);
    }
    writeFileSync(manifestPath, manifestBytes(next));
    report.outcome = "written";
    exitCode = 0;
  } catch (error) {
    const stage = error instanceof StageError ? error.stage : "packaging";
    const message = sanitizeMessage(error.message);
    report.failure = { stage, message };
    if (options.command !== "ecfr") {
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
        join(options.workDir, "stage"),
        [],
        failed,
        probe,
      );
      if (checked.ok) writeFileSync(manifestPath, manifestBytes(failed));
      else report.failure.manifestNotUpdated = checked.errors.slice(0, 5);
    }
    log(`refresh failed at ${stage}: ${message}`);
  } finally {
    report.requests.used = ctx.used;
    report.retrievalWindow = ctx.windowStart
      ? { start: ctx.windowStart, end: ctx.windowEnd }
      : null;
    rmSync(join(options.workDir, "stage"), { recursive: true, force: true });
    if (!options.keepRaw)
      for (const raw of ctx.rawFiles) rmSync(raw, { force: true });
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }
  log(
    `${report.outcome}: ${ctx.used} of ${plan.length} requests used; report ${options.report}`,
  );
  return { exitCode, report };
}
