import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  statfs,
} from "node:fs/promises";
import https from "node:https";
import { isIP } from "node:net";
import {
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";
import { types } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { withPreservedCleanup } from "./policy-assurance.mjs";

export const POLICY_LIMITS = Object.freeze({
  attempts: 2000,
  encodedBytes: 2 * 1024 ** 3,
  decodedBytes: 2 * 1024 ** 3,
  responseBytes: 64 * 1024 ** 2,
  bodyBytes: 63 * 1024 ** 2,
  runBytes: 10 * 1024 ** 3,
  freeBytes: 20 * 1024 ** 3,
  spacingMs: 2000,
  deadlineMs: 60000,
});
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const DEFAULT_ACCEPT =
  "text/html,application/xml,text/xml,text/plain,application/json";
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const fail = (code) => {
  throw new Error(code);
};
const reservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const safeId = (id) =>
  typeof id === "string" &&
  /^[a-z0-9][a-z0-9-]{0,95}$/.test(id) &&
  !reservedName.test(id);
const hashId = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((k) => keys.includes(k));
const count = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max;
const timestamp = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));
function snapshot(value, ancestors = new Set()) {
  if (value === null || ["string", "boolean", "number"].includes(typeof value))
    return value;
  if (
    !value ||
    typeof value !== "object" ||
    types.isProxy(value) ||
    ancestors.has(value) ||
    ![Object.prototype, Array.prototype, null].includes(
      Object.getPrototypeOf(value),
    )
  )
    fail("PLAIN_JSON_REQUIRED");
  ancestors.add(value);
  const result = Array.isArray(value) ? [] : {};
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    )
      fail("PLAIN_JSON_REQUIRED");
    result[key] = snapshot(descriptor.value, ancestors);
  }
  ancestors.delete(value);
  return result;
}
const within = (base, path) => {
  const rel = relative(base, path);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
};
const repoRoot = resolve(import.meta.dirname, "../..");

async function safePath(path, allowMissing = false) {
  if (typeof path !== "string") fail("UNSAFE_PATH");
  if (
    process.platform === "win32" &&
    (!/^[A-Za-z]:[\\/]/.test(path) ||
      path.startsWith("\\") ||
      path.length > 240 ||
      path
        .slice(3)
        .split(/[\\/]/)
        .some(
          (p) =>
            !p ||
            p === "." ||
            p === ".." ||
            /[<>:"|?*]/.test(p) ||
            /[. ]$/.test(p) ||
            reservedName.test(p) ||
            [...p].some((c) => c.charCodeAt(0) < 32),
        ))
  )
    fail("UNSAFE_WINDOWS_NAMESPACE");
  const target = resolve(path);
  const root = parse(target).root;
  let cursor = root;
  for (const piece of relative(root, target).split(sep).filter(Boolean)) {
    cursor = join(cursor, piece);
    try {
      const st = await lstat(cursor);
      if (
        st.isSymbolicLink() ||
        (!st.isDirectory() && !st.isFile()) ||
        (st.isFile() && st.nlink !== 1)
      )
        fail("UNSAFE_PATH");
    } catch (error) {
      if (!(allowMissing && error.code === "ENOENT")) throw error;
    }
  }
  return target;
}

async function atomic(path, bytes) {
  await safePath(dirname(path));
  await safePath(path, true);
  const temp = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temp, "wx");
  await withPreservedCleanup(
    async () => {
      await handle.writeFile(bytes);
      await handle.sync();
    },
    () => handle.close(),
  );
  await rename(temp, path);
}

async function json(path) {
  await safePath(path);
  if ((await lstat(path)).size > 16 * 1024 ** 2) fail("METADATA_SIZE_LIMIT");
  return JSON.parse(await readFile(path, "utf8"));
}
async function windowsProbe(root) {
  if (process.platform !== "win32") return;
  const request = { version: "1.0", nonce: randomUUID(), root };
  // Fixed shell code receives paths only as JSON. A nonce-bound acknowledgement
  // is emitted only after the full existing ancestor and descendant inventory.
  const script = [
    "$ErrorActionPreference='Stop'; try { [Console]::InputEncoding=[Text.UTF8Encoding]::new($false,$true);$s=[Console]::In.ReadToEnd();if([string]::IsNullOrWhiteSpace($s)){exit 45};",
    "$r=$s|ConvertFrom-Json;if($null-eq $r -or $r-is [array] -or (@($r.PSObject.Properties.Name|Sort-Object)-join ',')-cne 'nonce,root,version' -or $r.version-isnot [string] -or $r.version-cne '1.0' -or $r.root-isnot [string] -or $r.root-notmatch '^[A-Za-z]:[\\\\/]' -or $r.root.Length-gt 240 -or $r.nonce-isnot [string] -or $r.nonce-cnotmatch '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'){exit 45};",
    "$p=$r.root;while($p){if(Test-Path -LiteralPath $p){$i=Get-Item -Force -LiteralPath $p;if(($i.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne 0){exit 42}};$p=[IO.Path]::GetDirectoryName($p)};",
    "$q=[Collections.Generic.Queue[string]]::new();if(Test-Path -LiteralPath $r.root){$q.Enqueue($r.root)};$n=0;while($q.Count){foreach($e in [IO.Directory]::EnumerateFileSystemEntries($q.Dequeue())){$n++;if($n-gt 30000){exit 43};$i=Get-Item -Force -LiteralPath $e;if(($i.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne 0){exit 42};if($i.PSIsContainer){$q.Enqueue($e)}}};",
    "[Console]::Out.Write((@{version='1.0';nonce=$r.nonce;complete=$true;entries=$n}|ConvertTo-Json -Compress));exit 0}catch{exit 44}",
  ].join("");
  await new Promise((resolveProbe, reject) => {
    const systemRoot = process.env.SystemRoot;
    if (!systemRoot || !/^[A-Z]:\\[^<>:"|?*]+$/.test(systemRoot))
      fail("WINDOWS_PROBE_CONFIGURATION");
    let child;
    let settled = false;
    let delivered = false;
    let closed = false;
    let outputBytes = 0;
    let stderrBytes = 0;
    const stdout = [];
    const finish = (code, terminate = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (terminate && child) {
        // Only this owned child is addressed. Failure/timeout does not assert
        // confirmed process termination; rejection does not await its close.
        try {
          child.kill();
        } catch {
          // Preserve the fixed primary failure even when termination fails.
        }
      }
      if (code) reject(new Error(code));
      else resolveProbe();
    };
    const timer = setTimeout(() => finish("WINDOWS_PROBE_TIMEOUT", true), 5000);
    const accept = () => {
      if (settled || !closed || !delivered) return;
      let response;
      try {
        response = JSON.parse(Buffer.concat(stdout).toString("utf8"));
      } catch {
        finish("WINDOWS_PROBE_OUTPUT");
        return;
      }
      if (
        stderrBytes !== 0 ||
        !exact(response, ["version", "nonce", "complete", "entries"]) ||
        response.version !== request.version ||
        response.nonce !== request.nonce ||
        response.complete !== true ||
        !count(response.entries, 30000)
      ) {
        finish("WINDOWS_PROBE_OUTPUT");
        return;
      }
      finish();
    };
    const collect = (bytes, stderr = false) => {
      if (settled) return;
      outputBytes += bytes.length;
      if (outputBytes > 1024) {
        finish("WINDOWS_PROBE_OUTPUT_LIMIT", true);
        return;
      }
      if (stderr) stderrBytes += bytes.length;
      else stdout.push(Buffer.from(bytes));
    };
    try {
      child = spawn(
        join(
          systemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        ),
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch {
      finish("WINDOWS_PROBE_SPAWN");
      return;
    }
    child.stdout.on("data", (bytes) => collect(bytes));
    child.stderr.on("data", (bytes) => collect(bytes, true));
    child.stdout.on("error", () => finish("WINDOWS_PROBE_OUTPUT", true));
    child.stderr.on("error", () => finish("WINDOWS_PROBE_OUTPUT", true));
    child.stdin.on("error", () => finish("WINDOWS_PROBE_INPUT", true));
    child.on("error", () => finish("WINDOWS_PROBE_SPAWN", true));
    child.on("close", (code, signal) => {
      if (settled) return;
      if (signal) finish("WINDOWS_PROBE_SIGNAL");
      else if (code !== 0)
        finish(
          code === 45
            ? "WINDOWS_PROBE_INPUT"
            : "WINDOWS_REPARSE_OR_INVENTORY_REJECTED",
        );
      else {
        closed = true;
        accept();
      }
    });
    try {
      child.stdin.end(JSON.stringify(request), (error) => {
        if (error) finish("WINDOWS_PROBE_INPUT", true);
        else {
          delivered = true;
          accept();
        }
      });
    } catch {
      finish("WINDOWS_PROBE_INPUT", true);
    }
  });
}
async function diskUse(root) {
  let bytes = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    await safePath(path);
    if (entry.isDirectory()) bytes += await diskUse(path);
    else bytes += (await lstat(path)).size;
  }
  return bytes;
}

function runLimits(manifest) {
  if (manifest.version === "1.0.0") return POLICY_LIMITS;
  return {
    ...POLICY_LIMITS,
    ...manifest.limits,
    // Leave one maximum transport chunk inside the reservation when a stream
    // crosses its payload limit. The response reservation is never exceeded.
    bodyBytes: manifest.limits.responseBytes - 65536,
  };
}

function validateManifest(manifest, forDispatch = false) {
  const bounded = manifest?.version === "1.1.0";
  if (
    !exact(manifest, [
      "version",
      "runId",
      "trustDomain",
      "profiles",
      "targets",
      ...(bounded ? ["limits"] : []),
    ]) ||
    !["1.0.0", "1.1.0"].includes(manifest.version) ||
    !safeId(manifest.runId) ||
    !["real_source_local", "synthetic_test_only"].includes(manifest.trustDomain)
  )
    fail("INVALID_MANIFEST");
  if (bounded) {
    const limits = manifest.limits;
    if (
      !exact(limits, [
        "attempts",
        "encodedBytes",
        "decodedBytes",
        "responseBytes",
        "spacingMs",
        "deadlineMs",
        "retries",
      ]) ||
      !count(limits.attempts, 12) ||
      limits.attempts < 1 ||
      !count(limits.encodedBytes, 32 * 1024 ** 2) ||
      !count(limits.decodedBytes, 32 * 1024 ** 2) ||
      !count(limits.responseBytes, 8 * 1024 ** 2) ||
      limits.responseBytes <= 65536 ||
      limits.responseBytes > limits.encodedBytes ||
      limits.responseBytes > limits.decodedBytes ||
      !count(limits.spacingMs, 2147483647) ||
      limits.spacingMs < 15000 ||
      !count(limits.deadlineMs, 30000) ||
      limits.deadlineMs < 1 ||
      limits.retries !== 0
    )
      fail("INVALID_RUN_LIMITS");
  }
  if (
    !Array.isArray(manifest.profiles) ||
    manifest.profiles.length > 4 ||
    !Array.isArray(manifest.targets)
  )
    fail("INVALID_MANIFEST");
  if (
    bounded &&
    (!manifest.targets.length ||
      manifest.targets.length > manifest.limits.attempts)
  )
    fail("INVALID_TARGET_BUDGET");
  const hosts = new Set();
  const ids = new Set();
  for (const profile of manifest.profiles) {
    if (
      !exact(profile, ["id", "hosts", "pathPrefixes", "review", "uses"]) ||
      !safeId(profile.id) ||
      ids.has(profile.id) ||
      !Array.isArray(profile.hosts) ||
      !profile.hosts.length ||
      !Array.isArray(profile.pathPrefixes) ||
      !profile.pathPrefixes.length ||
      profile.pathPrefixes.some(
        (p) =>
          typeof p !== "string" ||
          !p.startsWith("/") ||
          p === "/" ||
          /[\\?#]/.test(p) ||
          /%(?:2e|2f|5c|00)/i.test(p),
      ) ||
      !exact(profile.review, [
        "reviewer",
        "reviewedAt",
        "expiresAt",
        "evidenceUrls",
      ]) ||
      typeof profile.review.reviewer !== "string" ||
      !profile.review.reviewer ||
      !timestamp(profile.review.reviewedAt) ||
      !timestamp(profile.review.expiresAt) ||
      Date.parse(profile.review.expiresAt) <=
        Date.parse(profile.review.reviewedAt) ||
      !Array.isArray(profile.review.evidenceUrls) ||
      !profile.review.evidenceUrls.length ||
      profile.review.evidenceUrls.some(
        (u) => typeof u !== "string" || !u.startsWith("https://"),
      ) ||
      !exact(profile.uses, [
        "capture",
        "analysis",
        "excerpts",
        "localDisplay",
        "localExport",
        "publicRedistribution",
      ]) ||
      profile.uses.capture !== true ||
      profile.uses.analysis !== true ||
      typeof profile.uses.excerpts !== "boolean" ||
      !["full_text", "excerpt", "metadata_link"].includes(
        profile.uses.localDisplay,
      ) ||
      !["full_text", "excerpt", "metadata_link", "prohibited"].includes(
        profile.uses.localExport,
      ) ||
      profile.uses.publicRedistribution !== "prohibited"
    )
      fail("UNREVIEWED_PROFILE");
    if (
      forDispatch &&
      (Date.parse(profile.review.expiresAt) <= Date.now() ||
        Date.parse(profile.review.reviewedAt) > Date.now())
    )
      fail("EXPIRED_PROFILE");
    ids.add(profile.id);
    for (const host of profile.hosts) {
      if (host !== host.toLowerCase() || host.includes(":") || isIP(host))
        fail("INVALID_HOST");
      hosts.add(host);
    }
  }
  if (hosts.size > 10) fail("HOST_BUDGET");
  const urls = new Set();
  const operations = new Set();
  for (const target of manifest.targets) {
    if (
      !exact(target, [
        "profileId",
        "url",
        "expectedIdentity",
        "mediaTypes",
        ...(bounded ? ["operationId"] : []),
      ]) ||
      (bounded &&
        (!safeId(target.operationId) || operations.has(target.operationId))) ||
      urls.has(target.url) ||
      typeof target.expectedIdentity !== "string" ||
      !target.expectedIdentity ||
      target.expectedIdentity.length > 500 ||
      !Array.isArray(target.mediaTypes) ||
      !target.mediaTypes.length
    )
      fail("INVALID_TARGET");
    const profile = manifest.profiles.find((p) => p.id === target.profileId);
    const url = new URL(target.url);
    if (
      !profile ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      /%(?:2e|2f|5c|00)/i.test(target.url) ||
      target.url.includes("\\") ||
      [...url.searchParams.keys()].some((k) =>
        /token|key|secret|password|auth|signature|credential/i.test(k),
      ) ||
      !profile.hosts.includes(url.hostname) ||
      !profile.pathPrefixes.some((p) => url.pathname.startsWith(p))
    )
      fail("TARGET_OUTSIDE_PROFILE");
    // application/pdf is stored as opaque immutable bytes only: this module
    // never parses or extracts text from PDF content.
    if (
      target.mediaTypes.some(
        (x) =>
          ![
            "text/html",
            "text/plain",
            "text/xml",
            "application/xml",
            "application/json",
            "application/pdf",
          ].includes(x),
      )
    )
      fail("UNSUPPORTED_MEDIA");
    urls.add(target.url);
    if (bounded) operations.add(target.operationId);
  }
  return manifest;
}

const reservationKeys = [
  "operationId",
  "url",
  "retryOf",
  "state",
  "startedAt",
  "reservedBytes",
  "manifestDigest",
  "profileId",
];
const receiptKeys = [
  ...reservationKeys,
  "completedAt",
  "finalUrl",
  "status",
  "mediaType",
  "encodedBytes",
  "decodedBytes",
  "conservativeByteCharge",
  "objectDigest",
  "objectPath",
  "expectedIdentity",
  "errorCode",
  "transient",
  "retryAfter",
];
function validateEntry(entry, id, manifest) {
  const limits = runLimits(manifest);
  const bounded = manifest.version === "1.1.0";
  const target = manifest.targets.find((v) => v.url === entry?.url);
  if (
    !safeId(id) ||
    entry?.operationId !== id ||
    !target ||
    (bounded && (target.operationId !== id || entry.retryOf !== null)) ||
    target.profileId !== entry.profileId ||
    !timestamp(entry.startedAt) ||
    entry.reservedBytes !== limits.responseBytes ||
    !hashId(entry.manifestDigest) ||
    !(entry.retryOf === null || safeId(entry.retryOf))
  )
    fail("INVALID_OPERATION_ENTRY");
  if (entry.state === "reserved") {
    if (!exact(entry, reservationKeys)) fail("INVALID_RESERVATION");
    return;
  }
  if (
    !exact(entry, receiptKeys) ||
    !["complete", "failed", "ambiguous"].includes(entry.state) ||
    !timestamp(entry.completedAt) ||
    Date.parse(entry.completedAt) < Date.parse(entry.startedAt) ||
    entry.finalUrl !== entry.url ||
    !count(
      entry.encodedBytes,
      bounded ? limits.responseBytes : limits.encodedBytes,
    ) ||
    !count(
      entry.decodedBytes,
      bounded ? limits.responseBytes : limits.decodedBytes,
    ) ||
    typeof entry.conservativeByteCharge !== "boolean" ||
    typeof entry.transient !== "boolean" ||
    entry.expectedIdentity !== target.expectedIdentity ||
    !(
      entry.status === null ||
      (count(entry.status, 599) && entry.status >= 100)
    ) ||
    !(entry.mediaType === null || typeof entry.mediaType === "string") ||
    !(entry.errorCode === null || typeof entry.errorCode === "string") ||
    !(entry.retryAfter === null || typeof entry.retryAfter === "string")
  )
    fail("INVALID_RECEIPT");
  if (entry.state === "complete") {
    if (
      entry.status !== 200 ||
      !hashId(entry.objectDigest) ||
      entry.objectPath !== `objects/${entry.objectDigest}.bin` ||
      entry.errorCode !== null ||
      entry.encodedBytes !== entry.decodedBytes ||
      entry.decodedBytes >
        (bounded ? limits.bodyBytes : limits.responseBytes) ||
      entry.transient ||
      entry.conservativeByteCharge ||
      !target.mediaTypes.includes(
        entry.mediaType?.split(";", 1)[0].trim().toLowerCase(),
      )
    )
      fail("INVALID_COMPLETE_RECEIPT");
  } else if (
    entry.objectDigest !== null ||
    entry.objectPath !== null ||
    !entry.errorCode ||
    (bounded &&
      (!entry.conservativeByteCharge ||
        entry.encodedBytes !== limits.responseBytes ||
        entry.decodedBytes !== limits.responseBytes))
  )
    fail("INVALID_FAILED_RECEIPT");
}
function validateLedger(ledger, manifest) {
  const limits = runLimits(manifest);
  if (
    !count(ledger.attempts, limits.attempts) ||
    !count(ledger.encodedBytes, limits.encodedBytes) ||
    !count(ledger.decodedBytes, limits.decodedBytes) ||
    !ledger.operations ||
    typeof ledger.operations !== "object" ||
    Array.isArray(ledger.operations)
  )
    fail("INVALID_LEDGER_COUNTERS");
  const hosts = manifest.profiles.flatMap((p) => p.hosts);
  for (const values of [ledger.lastStarts, ledger.cooldowns])
    if (
      !values ||
      typeof values !== "object" ||
      Array.isArray(values) ||
      Object.entries(values).some(([k, v]) => !hosts.includes(k) || !count(v))
    )
      fail("INVALID_HOST_CLOCK");
  let encodedBytes = 0;
  let decodedBytes = 0;
  let pending = 0;
  for (const [id, entry] of Object.entries(ledger.operations)) {
    validateEntry(entry, id, manifest);
    if (
      entry.retryOf &&
      (!ledger.operations[entry.retryOf] ||
        ledger.operations[entry.retryOf].state !== "failed" ||
        !ledger.operations[entry.retryOf].transient ||
        ledger.operations[entry.retryOf].url !== entry.url)
    )
      fail("INVALID_RETRY_CHAIN");
    if (entry.state === "reserved") pending += 1;
    encodedBytes +=
      entry.state === "reserved" ? entry.reservedBytes : entry.encodedBytes;
    decodedBytes +=
      entry.state === "reserved" ? entry.reservedBytes : entry.decodedBytes;
  }
  if (
    pending > 1 ||
    encodedBytes !== ledger.encodedBytes ||
    decodedBytes !== ledger.decodedBytes ||
    Object.keys(ledger.operations).length !== ledger.attempts
  )
    fail("COUNTER_MISMATCH");
}
function cooldownUntil(retryAfter, completedAt) {
  if (retryAfter === null || retryAfter === undefined) return 0;
  const maximum = 8640000000000000;
  const base = Date.parse(completedAt);
  if (/^\d+$/.test(String(retryAfter)))
    return Math.min(
      maximum,
      base + Math.min(Number(retryAfter), (maximum - base) / 1000) * 1000,
    );
  const parsed = Date.parse(retryAfter);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(parsed, maximum))
    : base + 60000;
}
async function verifyObject(root, receipt) {
  if (!receipt.objectDigest) return;
  const path = await safePath(join(root, receipt.objectPath));
  if ((await lstat(path)).size !== receipt.decodedBytes)
    fail("OBJECT_DIGEST_MISMATCH");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest("hex") !== receipt.objectDigest)
    fail("OBJECT_DIGEST_MISMATCH");
}

export async function initializePolicyRun(root, manifest) {
  manifest = snapshot(manifest);
  validateManifest(manifest, true);
  await safePath(root, true);
  root = resolve(root);
  if (
    within(repoRoot, root) ||
    within(root, repoRoot) ||
    root === parse(root).root
  )
    fail("ROOT_MUST_BE_EXTERNAL");
  await windowsProbe(root);
  await mkdir(root, { recursive: true });
  if ((await readdir(root)).length) fail("ROOT_NOT_EMPTY");
  const manifestDigest = digest(jsonBytes(manifest));
  await atomic(
    join(root, "owner.json"),
    jsonBytes({
      version: manifest.version,
      runId: manifest.runId,
      trustDomain: manifest.trustDomain,
      createdAt: new Date().toISOString(),
      ...(manifest.version === "1.1.0" ? { manifestDigest } : {}),
    }),
  );
  for (const folder of ["objects", "receipts", "work", "review", "manifests"])
    await mkdir(join(root, folder));
  await atomic(
    join(root, "manifests", `${manifestDigest}.json`),
    jsonBytes(manifest),
  );
  await atomic(
    join(root, "ledger.json"),
    jsonBytes({
      version: "1.0.0",
      runId: manifest.runId,
      manifestDigest,
      attempts: 0,
      encodedBytes: 0,
      decodedBytes: 0,
      lastStarts: {},
      cooldowns: {},
      operations: {},
    }),
  );
  return { runId: manifest.runId, manifestDigest, root };
}

export async function openPolicyRun(root) {
  root = await safePath(root);
  if (within(repoRoot, root) || within(root, repoRoot))
    fail("ROOT_MUST_BE_EXTERNAL");
  await windowsProbe(root);
  const owner = await json(join(root, "owner.json"));
  const ledger = await json(join(root, "ledger.json"));
  const bounded = owner?.version === "1.1.0";
  if (
    !exact(owner, [
      "version",
      "runId",
      "trustDomain",
      "createdAt",
      ...(bounded ? ["manifestDigest"] : []),
    ]) ||
    !["1.0.0", "1.1.0"].includes(owner.version) ||
    (bounded &&
      (!hashId(owner.manifestDigest) ||
        owner.manifestDigest !== ledger?.manifestDigest)) ||
    !timestamp(owner.createdAt) ||
    !safeId(owner.runId) ||
    !exact(ledger, [
      "version",
      "runId",
      "manifestDigest",
      "attempts",
      "encodedBytes",
      "decodedBytes",
      "lastStarts",
      "cooldowns",
      "operations",
    ]) ||
    owner.runId !== ledger.runId ||
    ledger.version !== "1.0.0" ||
    !hashId(ledger.manifestDigest)
  )
    fail("CUSTODY_IDENTITY_MISMATCH");
  const manifestPath = join(root, "manifests", `${ledger.manifestDigest}.json`);
  await safePath(manifestPath);
  const bytes = await readFile(manifestPath);
  if (digest(bytes) !== ledger.manifestDigest) fail("MANIFEST_DIGEST_MISMATCH");
  const manifest = validateManifest(JSON.parse(bytes));
  if (
    manifest.runId !== owner.runId ||
    manifest.trustDomain !== owner.trustDomain ||
    manifest.version !== owner.version
  )
    fail("CUSTODY_IDENTITY_MISMATCH");
  validateLedger(ledger, manifest);
  const history = new Map([[ledger.manifestDigest, manifest]]);
  for (const entry of Object.values(ledger.operations)) {
    if (bounded && entry.manifestDigest !== owner.manifestDigest)
      fail("HISTORICAL_MANIFEST_BINDING_MISMATCH");
    if (!history.has(entry.manifestDigest)) {
      const historicalPath = await safePath(
        join(root, "manifests", `${entry.manifestDigest}.json`),
      );
      const historicalBytes = await readFile(historicalPath);
      if (digest(historicalBytes) !== entry.manifestDigest)
        fail("HISTORICAL_MANIFEST_DIGEST_MISMATCH");
      const historical = validateManifest(JSON.parse(historicalBytes));
      if (
        historical.runId !== owner.runId ||
        historical.version !== manifest.version ||
        historical.trustDomain !== owner.trustDomain ||
        JSON.stringify(historical.profiles) !==
          JSON.stringify(manifest.profiles)
      )
        fail("HISTORICAL_MANIFEST_BINDING_MISMATCH");
      history.set(entry.manifestDigest, historical);
    }
    const historicalTarget = history
      .get(entry.manifestDigest)
      .targets.find((v) => v.url === entry.url);
    if (
      !historicalTarget ||
      JSON.stringify(historicalTarget) !==
        JSON.stringify(manifest.targets.find((v) => v.url === entry.url))
    )
      fail("HISTORICAL_TARGET_BINDING_MISMATCH");
  }
  return { root, owner, ledger, manifest };
}

async function locked(root, action) {
  await safePath(root);
  const path = join(root, "operation.lock");
  const handle = await open(path, "wx").catch(() =>
    fail("RUN_LOCKED_RECOVER_EXPLICITLY"),
  );
  return withPreservedCleanup(
    async () => {
      await handle.writeFile(
        jsonBytes({ pid: process.pid, token: randomUUID() }),
      );
      await handle.sync();
      return await action();
    },
    async () => {
      // A failed close leaves an ambiguous lock for explicit recovery; never
      // remove a lock that may still have an open writer.
      await handle.close();
      await rm(path);
    },
  );
}

export async function admitPolicyTargets(root, manifest) {
  manifest = snapshot(manifest);
  return locked(root, async () => {
    const run = await openPolicyRun(root);
    validateManifest(manifest, true);
    if (
      run.manifest.version === "1.1.0" ||
      manifest.version !== run.manifest.version
    )
      fail("FROZEN_MANIFEST_NEW_RUN_REQUIRED");
    if (
      manifest.runId !== run.manifest.runId ||
      manifest.trustDomain !== run.manifest.trustDomain ||
      JSON.stringify(manifest.profiles) !==
        JSON.stringify(run.manifest.profiles)
    )
      fail("PROFILE_REVIEW_CHANGED_NEW_RUN_REQUIRED");
    for (const target of run.manifest.targets)
      if (
        !manifest.targets.some(
          (v) => JSON.stringify(v) === JSON.stringify(target),
        )
      )
        fail("MANIFEST_HISTORY_REMOVAL");
    const manifestDigest = digest(jsonBytes(manifest));
    await atomic(
      join(root, "manifests", `${manifestDigest}.json`),
      jsonBytes(manifest),
    );
    run.ledger.manifestDigest = manifestDigest;
    await atomic(join(root, "ledger.json"), jsonBytes(run.ledger));
    return { manifestDigest, targets: manifest.targets.length };
  });
}

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  // This adapter pins IPv4 DNS only; IPv6, including transition aliases, is
  // deliberately unsupported until a separately tested range policy exists.
  return false;
}

async function networkTransport({ url, signal, accept, onHeaders, onChunk }) {
  const parsed = new URL(url);
  const addresses = await lookup(parsed.hostname, {
    all: true,
    verbatim: true,
    family: 4,
  });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    fail("UNSAFE_DNS");
  signal.throwIfAborted();
  const selected = addresses[0];
  return new Promise((resolveResponse, reject) => {
    const request = https.get(
      parsed,
      {
        signal,
        agent: false,
        highWaterMark: 65536,
        headers: {
          "User-Agent": "PolicySentinelLocalResearch/0.9",
          Accept: accept,
          "Accept-Encoding": "identity",
        },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [selected]);
          else callback(null, selected.address, selected.family);
        },
      },
      (response) => {
        try {
          onHeaders({
            status: response.statusCode,
            mediaType: String(response.headers["content-type"] ?? ""),
            encoding: String(
              response.headers["content-encoding"] ?? "identity",
            ),
            contentLength: response.headers["content-length"],
            retryAfter: response.headers["retry-after"],
          });
        } catch (error) {
          response.destroy(error);
          reject(error);
          return;
        }
        response.on("data", (chunk) => {
          try {
            onChunk(chunk);
          } catch (error) {
            response.destroy(error);
            reject(error);
          }
        });
        response.on("end", resolveResponse);
        response.on("error", reject);
        response.on("aborted", () => reject(new Error("TRUNCATED_RESPONSE")));
      },
    );
    request.on("error", reject);
  });
}

export async function acquirePolicyObject(
  root,
  {
    operationId,
    url,
    retryOf = null,
    syntheticTransport = null,
    crashAfterReservation = false,
    crashStage = null,
    syntheticDeadlineMs = null,
  } = {},
) {
  if (!safeId(operationId)) fail("INVALID_OPERATION_ID");
  return locked(root, async () => {
    const run = await openPolicyRun(root);
    const { ledger, manifest } = run;
    const bounded = manifest.version === "1.1.0";
    const limits = runLimits(manifest);
    validateManifest(manifest, true);
    for (const [id, entry] of Object.entries(ledger.operations))
      if (
        entry.state !== "reserved" &&
        JSON.stringify(await json(join(root, "receipts", `${id}.json`))) !==
          JSON.stringify(entry)
      )
        fail("LEDGER_RECEIPT_MISMATCH");
    if (Object.hasOwn(ledger.operations, operationId))
      fail("OPERATION_ALREADY_RESERVED");
    if (Object.values(ledger.operations).some((o) => o.state === "reserved"))
      fail("UNSETTLED_RESERVATION");
    const target = manifest.targets.find((v) => v.url === url);
    if (!target) fail("URL_NOT_IN_FROZEN_MANIFEST");
    if (bounded && target.operationId !== operationId)
      fail("OPERATION_TARGET_MISMATCH");
    if (bounded && retryOf !== null) fail("RETRY_NOT_AUTHORIZED");
    const synthetic = run.owner.trustDomain === "synthetic_test_only";
    if (
      synthetic !== Boolean(syntheticTransport) ||
      (!synthetic &&
        (crashAfterReservation ||
          crashStage ||
          syntheticDeadlineMs !== null)) ||
      (syntheticDeadlineMs !== null &&
        (!count(syntheticDeadlineMs, limits.deadlineMs) ||
          syntheticDeadlineMs < 1)) ||
      (crashStage && !["response", "object", "receipt"].includes(crashStage))
    )
      fail("TRANSPORT_TRUST_MISMATCH");
    if (retryOf) {
      const previous = ledger.operations[retryOf];
      if (
        !previous ||
        previous.url !== url ||
        previous.state !== "failed" ||
        !previous.transient ||
        Object.values(ledger.operations).filter(
          (o) => o.url === url && o.retryOf,
        ).length >= 2
      )
        fail("RETRY_NOT_AUTHORIZED");
    } else if (Object.values(ledger.operations).some((o) => o.url === url))
      fail("EXPLICIT_RETRY_REQUIRED");
    if (
      ledger.attempts >= limits.attempts ||
      ledger.encodedBytes + limits.responseBytes > limits.encodedBytes ||
      ledger.decodedBytes + limits.responseBytes > limits.decodedBytes
    )
      fail("ACQUISITION_BUDGET_EXHAUSTED");
    const usage = await diskUse(root);
    const disk = await statfs(root);
    if (
      usage + limits.responseBytes > limits.runBytes ||
      Number(disk.bavail) * Number(disk.bsize) - limits.responseBytes <
        limits.freeBytes
    )
      fail("DISK_BUDGET_EXHAUSTED");
    const host = new URL(url).hostname;
    if ((ledger.cooldowns[host] ?? 0) > Date.now()) fail("RETRY_AFTER_ACTIVE");
    // A reservation precedes ledger persistence and DNS. For bounded runs,
    // waiting from completion also spaces actual requests across all hosts.
    const spacingAnchor = bounded
      ? Math.max(
          0,
          ...Object.values(ledger.lastStarts),
          ...Object.values(ledger.operations).map((entry) =>
            Date.parse(entry.completedAt ?? entry.startedAt),
          ),
        )
      : (ledger.lastStarts[host] ?? 0);
    const waitMs = Math.max(0, spacingAnchor + limits.spacingMs - Date.now());
    if (bounded && waitMs > 2147483647) fail("INVALID_HOST_CLOCK");
    await delay(waitMs);
    if (bounded) validateManifest(manifest, true);
    const startedAt = new Date().toISOString();
    const reservation = {
      operationId,
      url,
      retryOf,
      state: "reserved",
      startedAt,
      reservedBytes: limits.responseBytes,
      manifestDigest: ledger.manifestDigest,
      profileId: target.profileId,
    };
    ledger.operations[operationId] = reservation;
    ledger.attempts += 1;
    ledger.encodedBytes += limits.responseBytes;
    ledger.decodedBytes += limits.responseBytes;
    ledger.lastStarts[host] = Date.now();
    await atomic(join(root, "ledger.json"), jsonBytes(ledger));
    if (crashAfterReservation) process.exit(86);
    let encodedBytes = 0;
    let decodedBytes = 0;
    let headers = null;
    let outcome = "complete";
    let errorCode = null;
    let unknownBytes = false;
    const chunks = [];
    const controller = new globalThis.AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("OPERATION_DEADLINE")),
      syntheticDeadlineMs ?? limits.deadlineMs,
    );
    const accept = target.mediaTypes.includes("application/pdf")
      ? `${DEFAULT_ACCEPT},application/pdf`
      : DEFAULT_ACCEPT;
    try {
      const transmission = (syntheticTransport ?? networkTransport)({
        url,
        signal: controller.signal,
        accept,
        onHeaders: (value) => {
          controller.signal.throwIfAborted();
          headers = value;
          const type = value.mediaType.split(";", 1)[0].trim().toLowerCase();
          if (
            value.status !== 200 ||
            value.encoding !== "identity" ||
            !target.mediaTypes.includes(type) ||
            (value.contentLength !== undefined &&
              (!/^\d+$/.test(String(value.contentLength)) ||
                Number(value.contentLength) > limits.bodyBytes))
          ) {
            unknownBytes = true;
            fail(
              value.status !== 200
                ? `HTTP_${value.status}`
                : "RESPONSE_CONTRACT_REJECTED",
            );
          }
        },
        onChunk: (chunk) => {
          controller.signal.throwIfAborted();
          if (!headers) fail("BODY_BEFORE_HEADERS");
          const bytes = Buffer.from(chunk);
          if (bytes.length > 65536) {
            unknownBytes = true;
            fail("TRANSPORT_CHUNK_LIMIT");
          }
          encodedBytes += bytes.length;
          decodedBytes += bytes.length;
          if (
            encodedBytes > limits.bodyBytes ||
            decodedBytes > limits.bodyBytes
          )
            fail("RESPONSE_BYTE_LIMIT");
          chunks.push(bytes);
        },
      });
      await Promise.race([
        transmission,
        new Promise((_resolve, reject) =>
          controller.signal.addEventListener(
            "abort",
            () => reject(new Error("OPERATION_DEADLINE")),
            { once: true },
          ),
        ),
      ]);
      if (
        !headers ||
        (headers.contentLength !== undefined &&
          Number(headers.contentLength) !== encodedBytes)
      )
        fail("TRUNCATED_RESPONSE");
    } catch (error) {
      outcome = "failed";
      if (controller.signal.aborted) unknownBytes = true;
      errorCode = controller.signal.aborted
        ? "OPERATION_DEADLINE"
        : String(error.message)
            .replace(/[^a-zA-Z0-9_ -]/g, "")
            .slice(0, 120);
    } finally {
      clearTimeout(timeout);
    }
    if (crashStage === "response") process.exit(87);
    // A rejected/unread response is charged its full reservation. No body or
    // archive decompression occurs; unsupported encodings fail closed.
    if (bounded && outcome === "failed") unknownBytes = true;
    if (unknownBytes) encodedBytes = decodedBytes = limits.responseBytes;
    let objectDigest = null;
    let objectPath = null;
    if (outcome === "complete") {
      const bytes = Buffer.concat(chunks);
      objectDigest = digest(bytes);
      objectPath = `objects/${objectDigest}.bin`;
      const path = join(root, objectPath);
      try {
        await safePath(path);
        if (digest(await readFile(path)) !== objectDigest)
          fail("EXISTING_OBJECT_CORRUPT");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await atomic(path, bytes);
      }
    }
    if (crashStage === "object") process.exit(88);
    const retryAfter = headers?.retryAfter;
    const completedAt = new Date().toISOString();
    if (retryAfter !== undefined)
      ledger.cooldowns[host] = Math.max(
        cooldownUntil(retryAfter, completedAt),
        ledger.cooldowns[host] ?? 0,
      );
    const receipt = {
      ...reservation,
      state: outcome,
      completedAt,
      finalUrl: url,
      status: headers?.status ?? null,
      mediaType: headers?.mediaType ?? null,
      encodedBytes,
      decodedBytes,
      conservativeByteCharge: unknownBytes,
      objectDigest,
      objectPath,
      expectedIdentity: target.expectedIdentity,
      errorCode,
      transient:
        outcome === "failed" &&
        (headers?.status === 429 ||
          [500, 502, 503, 504].includes(headers?.status) ||
          [
            "OPERATION_DEADLINE",
            "TRUNCATED_RESPONSE",
            "ECONNRESET",
            "ETIMEDOUT",
          ].some((x) => errorCode?.includes(x))),
      retryAfter: retryAfter ?? null,
    };
    await atomic(
      join(root, "receipts", `${operationId}.json`),
      jsonBytes(receipt),
    );
    if (crashStage === "receipt") process.exit(89);
    ledger.encodedBytes += encodedBytes - limits.responseBytes;
    ledger.decodedBytes += decodedBytes - limits.responseBytes;
    ledger.operations[operationId] = receipt;
    await atomic(join(root, "ledger.json"), jsonBytes(ledger));
    return receipt;
  });
}

export async function recoverPolicyRun(root) {
  await safePath(root);
  const lockPath = join(root, "operation.lock");
  try {
    const lock = await json(lockPath);
    if (!Number.isSafeInteger(lock.pid) || lock.pid < 1) fail("INVALID_LOCK");
    try {
      process.kill(lock.pid, 0);
      fail("LOCK_OWNER_STILL_ALIVE");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await rm(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return locked(root, async () => {
    const run = await openPolicyRun(root);
    const recovered = [];
    for (const [id, entry] of Object.entries(run.ledger.operations)) {
      if (entry.state !== "reserved") continue;
      let receipt;
      try {
        receipt = await json(join(root, "receipts", `${id}.json`));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        receipt = {
          ...entry,
          state: "ambiguous",
          completedAt: new Date().toISOString(),
          finalUrl: entry.url,
          status: null,
          mediaType: null,
          encodedBytes: entry.reservedBytes,
          decodedBytes: entry.reservedBytes,
          conservativeByteCharge: true,
          objectDigest: null,
          objectPath: null,
          expectedIdentity: run.manifest.targets.find(
            (v) => v.url === entry.url,
          ).expectedIdentity,
          errorCode: "INTERRUPTED_AFTER_RESERVATION",
          transient: false,
          retryAfter: null,
        };
        await atomic(join(root, "receipts", `${id}.json`), jsonBytes(receipt));
      }
      validateEntry(receipt, id, run.manifest);
      if (
        reservationKeys.some(
          (key) => key !== "state" && receipt[key] !== entry[key],
        )
      )
        fail("INVALID_RECOVERY_RECEIPT");
      await verifyObject(root, receipt);
      if (receipt.retryAfter !== null) {
        const host = new URL(receipt.url).hostname;
        run.ledger.cooldowns[host] = Math.max(
          cooldownUntil(receipt.retryAfter, receipt.completedAt),
          run.ledger.cooldowns[host] ?? 0,
        );
      }
      run.ledger.encodedBytes += receipt.encodedBytes - entry.reservedBytes;
      run.ledger.decodedBytes += receipt.decodedBytes - entry.reservedBytes;
      run.ledger.operations[id] = receipt;
      recovered.push({ operationId: id, state: receipt.state });
    }
    await atomic(join(root, "ledger.json"), jsonBytes(run.ledger));
    return { recovered, attempts: run.ledger.attempts };
  });
}

export async function readPolicyReceipt(
  root,
  operationId,
  { offset = 0, length = 12000 } = {},
) {
  if (
    !safeId(operationId) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > 24000
  )
    fail("INVALID_REVIEW_RANGE");
  const run = await openPolicyRun(root);
  const receipt = run.ledger.operations[operationId];
  if (!receipt || receipt.state === "reserved") fail("NO_COMPLETE_RECEIPT");
  if (
    JSON.stringify(
      await json(join(root, "receipts", `${operationId}.json`)),
    ) !== JSON.stringify(receipt)
  )
    fail("LEDGER_RECEIPT_MISMATCH");
  if (!receipt.objectPath) return { receipt, review: null };
  const expectedPath = `objects/${receipt.objectDigest}.bin`;
  if (receipt.objectPath !== expectedPath) fail("OBJECT_PATH_MISMATCH");
  const path = await safePath(join(root, expectedPath));
  const bytes = await readFile(path);
  if (digest(bytes) !== receipt.objectDigest) fail("OBJECT_DIGEST_MISMATCH");
  return {
    receipt,
    review: {
      offset,
      length: Math.min(length, Math.max(0, bytes.length - offset)),
      totalBytes: bytes.length,
      nextOffset: Math.min(offset + length, bytes.length),
      text: bytes.subarray(offset, offset + length).toString("utf8"),
    },
  };
}

export async function verifyPolicyRun(root) {
  const run = await openPolicyRun(root);
  let encodedBytes = 0;
  let decodedBytes = 0;
  let objects = 0;
  for (const [id, entry] of Object.entries(run.ledger.operations)) {
    if (!safeId(id) || id !== entry.operationId || entry.state === "reserved")
      fail("UNSETTLED_OR_INVALID_OPERATION");
    const receipt = await json(join(root, "receipts", `${id}.json`));
    if (JSON.stringify(receipt) !== JSON.stringify(entry))
      fail("LEDGER_RECEIPT_MISMATCH");
    encodedBytes += receipt.encodedBytes;
    decodedBytes += receipt.decodedBytes;
    if (receipt.objectDigest) {
      if (
        !/^[a-f0-9]{64}$/.test(receipt.objectDigest) ||
        receipt.objectPath !== `objects/${receipt.objectDigest}.bin`
      )
        fail("OBJECT_PATH_MISMATCH");
      const path = await safePath(join(root, receipt.objectPath));
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(path)) hash.update(chunk);
      if (
        hash.digest("hex") !== receipt.objectDigest ||
        (await lstat(path)).size !== receipt.decodedBytes
      )
        fail("OBJECT_DIGEST_MISMATCH");
      objects += 1;
    }
  }
  if (
    encodedBytes !== run.ledger.encodedBytes ||
    decodedBytes !== run.ledger.decodedBytes ||
    Object.keys(run.ledger.operations).length !== run.ledger.attempts
  )
    fail("COUNTER_MISMATCH");
  return {
    runId: run.owner.runId,
    attempts: run.ledger.attempts,
    objects,
    encodedBytes,
    decodedBytes,
    diskBytes: await diskUse(root),
    valid: true,
  };
}

export async function writePolicyDerived(
  root,
  relativePath,
  bytes,
  { replace = true } = {},
) {
  if (
    typeof replace !== "boolean" ||
    typeof relativePath !== "string" ||
    !/^(?:work|review|local-output)\/[a-zA-Z0-9_./-]+$/.test(relativePath) ||
    relativePath
      .split("/")
      .some((p) => !p || p === "." || p === ".." || reservedName.test(p)) ||
    !Buffer.isBuffer(bytes) ||
    bytes.length > 128 * 1024 ** 2
  )
    fail("INVALID_DERIVED_OUTPUT");
  return locked(root, async () => {
    await openPolicyRun(root);
    const target = join(root, relativePath);
    await safePath(target, true);
    if (!within(resolve(root), target)) fail("DERIVED_PATH_ESCAPE");
    if (!replace) {
      const exists = await lstat(target).then(
        () => true,
        (error) => {
          if (error.code === "ENOENT") return false;
          throw error;
        },
      );
      if (exists) fail("DERIVED_OUTPUT_ALREADY_EXISTS");
    }
    const disk = await statfs(root);
    if (
      (await diskUse(root)) + bytes.length > POLICY_LIMITS.runBytes ||
      Number(disk.bavail) * Number(disk.bsize) - bytes.length <
        POLICY_LIMITS.freeBytes
    )
      fail("DISK_BUDGET_EXHAUSTED");
    await mkdir(dirname(target), { recursive: true });
    await atomic(target, bytes);
    return { path: relativePath, digest: digest(bytes), bytes: bytes.length };
  });
}
