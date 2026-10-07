import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { setTimeout, clearTimeout } from "node:timers";

export const STORAGE_LIMITS = Object.freeze({
  managedBytes: 50_000_000_000,
  runBytes: 10 * 1024 ** 3,
  freeBytes: 20 * 1024 ** 3,
});
const CATEGORIES = [
  "originals",
  "renditions",
  "metadata",
  "indexes",
  "cases_exports",
  "temporary",
  "unclassified",
];
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const repository = path.resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const key = (value) =>
  process.platform === "win32" ? value.toLowerCase() : value;
const inside = (parent, child) =>
  child === parent || child.startsWith(parent + path.sep);
const exact = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
const label = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const controls = (value) =>
  [...value].some((character) => character.charCodeAt(0) < 32);
const aliasSegment = (value) =>
  value === "." ||
  value === ".." ||
  /[. ]$/.test(value) ||
  /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(
    value,
  );
const protectedRoot = (candidate, repositoryPath, homePath) =>
  candidate === key(path.parse(candidate).root) ||
  inside(candidate, repositoryPath) ||
  (inside(repositoryPath, candidate) &&
    // Explicitly named managed artifact namespaces only. This permits no
    // discovery or traversal of the source repository or generated-data parent.
    !["dist", ".cache", "generated-data/real-source-prerelease"].some(
      (relativePath) =>
        inside(key(path.join(repositoryPath, relativePath)), candidate),
    )) ||
  inside(candidate, homePath);
const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  throw error;
};
function relative(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 240 ||
    value.includes("\\") ||
    value.includes(":") ||
    controls(value) ||
    /[<>"|?*]/.test(value)
  )
    fail("INVALID_MANIFEST");
  if (value === ".") return value;
  if (value.split("/").some((part) => !part || aliasSegment(part)))
    fail("INVALID_MANIFEST");
  return value;
}
const withinRelative = (parent, child) =>
  parent === "." || child === parent || child.startsWith(parent + "/");

/** Validate explicit managed roots only; never discover roots from disk. */
export function validateStorageManifest(manifest) {
  if (
    !exact(manifest, ["version", "roots", "projections"]) ||
    manifest.version !== "1.0.0" ||
    !Array.isArray(manifest.roots) ||
    manifest.roots.length < 1 ||
    manifest.roots.length > 64 ||
    !Array.isArray(manifest.projections) ||
    manifest.projections.length > 1024
  )
    fail("INVALID_MANIFEST");
  const ids = new Set();
  const paths = [];
  for (const root of manifest.roots) {
    if (
      !exact(root, ["id", "path", "categories", "runs"]) ||
      !label(root.id) ||
      ids.has(root.id) ||
      typeof root.path !== "string" ||
      root.path.length > 240 ||
      !path.isAbsolute(root.path) ||
      controls(root.path) ||
      (process.platform === "win32" && !/^[A-Za-z]:[\\/]/.test(root.path)) ||
      !Array.isArray(root.categories) ||
      root.categories.length > 128 ||
      !Array.isArray(root.runs) ||
      root.runs.length > 128
    )
      fail("INVALID_MANIFEST");
    ids.add(root.id);
    if (
      root.path.split(/[\\/]/).some((part) => part === "." || part === "..") ||
      (process.platform === "win32" &&
        (/[:<>"|?*]/.test(root.path.slice(2)) ||
          root.path
            .slice(3)
            .split(/[\\/]/)
            .some((part) => part && aliasSegment(part))))
    )
      fail("INVALID_MANIFEST");
    const resolved = key(path.resolve(root.path));
    if (protectedRoot(resolved, key(repository), key(os.homedir())))
      fail("INVALID_MANIFEST");
    if (
      paths.some((prior) => inside(prior, resolved) || inside(resolved, prior))
    )
      fail("INVALID_MANIFEST");
    paths.push(resolved);
    const routes = new Set();
    for (const route of root.categories) {
      if (
        !exact(route, ["path", "category"]) ||
        !CATEGORIES.includes(route.category)
      )
        fail("INVALID_MANIFEST");
      const routeKey = key(relative(route.path));
      if (routes.has(routeKey)) fail("INVALID_MANIFEST");
      routes.add(routeKey);
    }
    const runs = new Set();
    const runPaths = [];
    for (const run of root.runs) {
      if (
        !exact(run, ["id", "path", "state"]) ||
        !label(run.id) ||
        runs.has(run.id) ||
        !["existing", "planned"].includes(run.state)
      )
        fail("INVALID_MANIFEST");
      runs.add(run.id);
      const runPath = key(relative(run.path));
      if (
        runPaths.some(
          (prior) =>
            withinRelative(prior, runPath) || withinRelative(runPath, prior),
        )
      )
        fail("INVALID_MANIFEST");
      runPaths.push(runPath);
    }
  }
  const projectionIds = new Set();
  for (const projection of manifest.projections) {
    if (
      !exact(projection, [
        "id",
        "rootId",
        "runId",
        "retainedBytes",
        "temporaryBytes",
      ]) ||
      !label(projection.id) ||
      projectionIds.has(projection.id) ||
      !count(projection.retainedBytes) ||
      !count(projection.temporaryBytes)
    )
      fail("INVALID_MANIFEST");
    projectionIds.add(projection.id);
    const root = manifest.roots.find(
      (candidate) => candidate.id === projection.rootId,
    );
    if (!root || !root.runs.some((run) => run.id === projection.runId))
      fail("INVALID_MANIFEST");
  }
  return JSON.parse(JSON.stringify(manifest));
}

// Fixed native attribute check. Paths are JSON stdin, never shell source.
const PROBE_SCRIPT = [
  "$ErrorActionPreference='Stop';try{[Console]::InputEncoding=[Text.UTF8Encoding]::new($false,$true);$r=[Console]::In.ReadToEnd()|ConvertFrom-Json;",
  "if($r.nonce-cnotmatch '^[a-f0-9-]{36}$' -or $r.root-notmatch '^[A-Za-z]:[\\\\/]' -or $r.maxEntries-lt 1 -or $r.maxEntries-gt 250000 -or $r.maxDepth-lt 1 -or $r.maxDepth-gt 64){exit 45};",
  "$p=$r.root;while($p){$i=Get-Item -Force -LiteralPath $p;if(($i.Attributes-band [IO.FileAttributes]::ReparsePoint)-ne 0){exit 42};$p=[IO.Path]::GetDirectoryName($p)};",
  "$q=[Collections.Generic.Queue[object]]::new();$q.Enqueue(@($r.root,0));$n=0;while($q.Count){$v=$q.Dequeue();foreach($e in [IO.Directory]::EnumerateFileSystemEntries($v[0])){$n++;if($n-gt $r.maxEntries){exit 43};$i=Get-Item -Force -LiteralPath $e;if(($i.Attributes-band [IO.FileAttributes]::ReparsePoint)-ne 0){exit 42};if($i.PSIsContainer){$d=$v[1]+1;if($d-gt $r.maxDepth){exit 43};$q.Enqueue(@($e,$d))}}};",
  "[Console]::Out.Write((@{nonce=$r.nonce;complete=$true;entries=$n}|ConvertTo-Json -Compress));exit 0}catch{exit 44}",
].join("");
async function probeWindows(root, limits, remaining, spawnChild = spawn) {
  if (process.platform !== "win32") return;
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !/^[A-Z]:\\[^<>:"|?*]+$/i.test(systemRoot))
    fail("WINDOWS_PROBE_FAILED");
  const request = {
    nonce: randomUUID(),
    root,
    maxEntries: limits.maxEntries,
    maxDepth: limits.maxDepth,
  };
  await new Promise((resolve, reject) => {
    let child;
    let done = false;
    let delivered = false;
    let closed = false;
    let bytes = 0;
    let errors = 0;
    const output = [];
    const finish = (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code) {
        try {
          child?.kill();
        } catch {
          /* owned child only */
        }
        reject(Object.assign(new Error(code), { code }));
      } else resolve();
    };
    const timer = setTimeout(
      () => finish("TIME_LIMIT"),
      Math.max(1, Math.min(remaining, 30000)),
    );
    const accept = () => {
      if (!delivered || !closed || done) return;
      try {
        const value = JSON.parse(Buffer.concat(output).toString("utf8"));
        if (
          errors ||
          !exact(value, ["nonce", "complete", "entries"]) ||
          value.nonce !== request.nonce ||
          value.complete !== true ||
          !count(value.entries) ||
          value.entries > limits.maxEntries
        )
          finish("WINDOWS_PROBE_FAILED");
        else finish();
      } catch {
        finish("WINDOWS_PROBE_FAILED");
      }
    };
    try {
      child = spawnChild(
        path.join(
          systemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        ),
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", PROBE_SCRIPT],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      const collect = (chunk, stderr) => {
        bytes += chunk.length;
        if (bytes > 1024) return finish("WINDOWS_PROBE_FAILED");
        if (stderr) errors += chunk.length;
        else output.push(Buffer.from(chunk));
      };
      child.stdout.on("data", (chunk) => collect(chunk, false));
      child.stderr.on("data", (chunk) => collect(chunk, true));
      for (const stream of [child.stdin, child.stdout, child.stderr])
        stream.on("error", () => finish("WINDOWS_PROBE_FAILED"));
      child.on("error", () => finish("WINDOWS_PROBE_FAILED"));
      child.on("close", (code, signal) => {
        if (signal || code !== 0)
          finish(
            code === 42
              ? "UNSAFE_LINK"
              : code === 43
                ? "INVENTORY_LIMIT"
                : "WINDOWS_PROBE_FAILED",
          );
        else {
          closed = true;
          accept();
        }
      });
      child.stdin.end(JSON.stringify(request), (error) => {
        if (error) finish("WINDOWS_PROBE_FAILED");
        else {
          delivered = true;
          accept();
        }
      });
    } catch {
      finish("WINDOWS_PROBE_FAILED");
    }
  });
}
const identity = (stat) => `${stat.dev}:${stat.ino}`;
const unchanged = (before, after) =>
  identity(before) === identity(after) &&
  before.size === after.size &&
  before.mtimeNs === after.mtimeNs &&
  before.ctimeNs === after.ctimeNs &&
  before.mode === after.mode &&
  before.nlink === after.nlink;
const safeNumber = (value) => (value <= MAX ? Number(value) : null);
const bucket = () => ({ bytes: 0n, files: 0n });
const serializeBucket = (value) => ({
  bytes: safeNumber(value.bytes),
  files: safeNumber(value.files),
});

/** Read-only observation, never a reservation, snapshot or dispatch authorization.
 * io/probeWindows/now are dependency seams for synthetic tests, not CLI inputs.
 */
export async function createStorageReport(input, options = {}) {
  const manifest = validateStorageManifest(input);
  const io = { ...fs, ...options.io };
  const now = options.now ?? Date.now;
  const limits = { maxEntries: 250000, maxDepth: 64, timeoutMs: 120000 };
  for (const name of Object.keys(limits)) {
    if (options[name] !== undefined) {
      if (
        !Number.isSafeInteger(options[name]) ||
        options[name] < 1 ||
        options[name] > limits[name]
      )
        fail("INVALID_OPTIONS");
      limits[name] = options[name];
    }
  }
  const deadline = now() + limits.timeoutMs;
  const check = () => {
    if (now() >= deadline) fail("TIME_LIMIT");
  };
  const nativeProbe =
    options.probeWindows ??
    ((root, limits, remaining) =>
      probeWindows(root, limits, remaining, options.spawnProbe));
  const reports = [];
  const prepared = [];
  const seenRoots = new Set();
  const seenCanonical = [];
  const globalReasons = new Set();
  let entries = 0;
  let total = 0n;
  // All root identities/aliases are checked before any root's contents are scanned.
  for (const root of manifest.roots) {
    const state = {
      root,
      total: 0n,
      categories: Object.fromEntries(
        CATEGORIES.map((category) => [category, bucket()]),
      ),
      runs: root.runs.map((run) => ({ ...run, ...bucket() })),
      reasons: new Set(),
      stat: null,
      available: null,
    };
    prepared.push(state);
    try {
      check();
      let cursor = path.resolve(root.path);
      while (true) {
        const stat = await io.lstat(cursor, { bigint: true });
        if (stat.isSymbolicLink() || !stat.isDirectory()) fail("UNSAFE_LINK");
        if (cursor === path.resolve(root.path)) state.stat = stat;
        const parent = path.dirname(cursor);
        if (parent === cursor) break;
        cursor = parent;
      }
      const canonical = key(await io.realpath(root.path));
      const canonicalRepository = key(await io.realpath(repository));
      const canonicalHome = key(await io.realpath(os.homedir()));
      if (protectedRoot(canonical, canonicalRepository, canonicalHome))
        fail("PROTECTED_ROOT");
      let canonicalStat;
      try {
        canonicalStat = await io.lstat(canonical, { bigint: true });
      } catch {
        fail("ROOT_ALIAS");
      }
      if (!unchanged(state.stat, canonicalStat)) fail("ROOT_ALIAS");
      if (
        seenRoots.has(identity(state.stat)) ||
        seenCanonical.some(
          (prior) => inside(prior, canonical) || inside(canonical, prior),
        )
      )
        fail("ROOT_ALIAS");
      seenRoots.add(identity(state.stat));
      seenCanonical.push(canonical);
      const inspectRelative = async (relativePath, directoryOnly) => {
        let stat = state.stat;
        let cursor = root.path;
        for (const segment of relativePath === "."
          ? []
          : relativePath.split("/")) {
          cursor = path.join(cursor, segment);
          try {
            stat = await io.lstat(cursor, { bigint: true });
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
            return undefined;
          }
          if (
            stat.isSymbolicLink() ||
            stat.dev !== state.stat.dev ||
            (directoryOnly && !stat.isDirectory())
          )
            fail("UNSAFE_LINK");
          const expected = key(
            path.join(canonical, path.relative(root.path, cursor)),
          );
          if (key(await io.realpath(cursor)) !== expected) fail("PATH_ALIAS");
        }
        return stat;
      };
      for (const route of root.categories)
        await inspectRelative(route.path, false);
      for (const run of root.runs) {
        const runStat = await inspectRelative(run.path, true);
        if (
          run.state === "existing" &&
          (!runStat || !runStat.isDirectory() || runStat.isSymbolicLink())
        )
          fail("RUN_STATE_MISMATCH");
        if (run.state === "planned" && runStat) fail("RUN_STATE_MISMATCH");
      }
    } catch (error) {
      state.reasons.add(
        error.code === "ROOT_ALIAS" ||
          error.code === "PATH_ALIAS" ||
          error.code === "PROTECTED_ROOT" ||
          error.code === "UNSAFE_LINK" ||
          error.code === "TIME_LIMIT" ||
          error.code === "RUN_STATE_MISMATCH"
          ? error.code
          : "ROOT_UNAVAILABLE",
      );
    }
  }
  if (prepared.some((state) => state.reasons.has("ROOT_ALIAS")))
    for (const state of prepared) state.reasons.add("ROOT_ALIAS");
  for (const state of prepared) {
    const { root } = state;
    try {
      if (state.reasons.size) continue;
      await nativeProbe(root.path, limits, deadline - now());
      check();
      const disk = await io.statfs(root.path, { bigint: true });
      if (
        typeof disk.bavail !== "bigint" ||
        typeof disk.bsize !== "bigint" ||
        disk.bavail < 0n ||
        disk.bsize <= 0n
      )
        fail("DISK_UNAVAILABLE");
      state.available = disk.bavail * disk.bsize;
      if (state.available > MAX) fail("NUMERIC_OVERFLOW");
      const seenFiles = new Set();
      const walk = async (directory, relativeDirectory, depth) => {
        check();
        if (depth > limits.maxDepth) fail("INVENTORY_LIMIT");
        const before = await io.lstat(directory, { bigint: true });
        if (
          before.isSymbolicLink() ||
          !before.isDirectory() ||
          before.dev !== state.stat.dev
        )
          fail("UNSAFE_LINK");
        const handle = await io.opendir(directory);
        for await (const entry of handle) {
          check();
          entries += 1;
          if (entries > limits.maxEntries) fail("INVENTORY_LIMIT");
          const entryPath = path.join(directory, entry.name);
          const relativePath = relativeDirectory
            ? relativeDirectory + "/" + entry.name
            : entry.name;
          const first = await io.lstat(entryPath, { bigint: true });
          if (first.isSymbolicLink() || first.dev !== state.stat.dev)
            fail("UNSAFE_LINK");
          if (first.isDirectory())
            await walk(entryPath, relativePath, depth + 1);
          else if (first.isFile()) {
            if (first.nlink !== 1n || seenFiles.has(identity(first)))
              fail("UNSAFE_LINK");
            const last = await io.lstat(entryPath, { bigint: true });
            if (!unchanged(first, last)) fail("INVENTORY_CHANGED");
            if (first.size < 0n) fail("NUMERIC_OVERFLOW");
            seenFiles.add(identity(first));
            const route = root.categories
              .filter((candidate) =>
                withinRelative(key(candidate.path), key(relativePath)),
              )
              .sort((a, b) => b.path.length - a.path.length)[0];
            const category =
              state.categories[route?.category ?? "unclassified"];
            category.bytes += first.size;
            category.files += 1n;
            const run = state.runs.find((candidate) =>
              withinRelative(key(candidate.path), key(relativePath)),
            );
            if (run) {
              run.bytes += first.size;
              run.files += 1n;
            }
            state.total += first.size;
            total += first.size;
            if (total > MAX) fail("NUMERIC_OVERFLOW");
          } else fail("UNSAFE_FILE_TYPE");
        }
        const after = await io.lstat(directory, { bigint: true });
        if (!unchanged(before, after)) fail("INVENTORY_CHANGED");
      };
      await walk(root.path, "", 0);
      for (const run of root.runs) {
        let stat;
        try {
          stat = await io.lstat(path.join(root.path, run.path), {
            bigint: true,
          });
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        if (run.state === "planned" && stat) fail("INVENTORY_CHANGED");
        if (
          run.state === "existing" &&
          (!stat || !stat.isDirectory() || stat.isSymbolicLink())
        )
          fail("INVENTORY_CHANGED");
      }
      if (!unchanged(state.stat, await io.lstat(root.path, { bigint: true })))
        fail("INVENTORY_CHANGED");
      await nativeProbe(root.path, limits, deadline - now());
      const finalDisk = await io.statfs(root.path, { bigint: true });
      if (
        typeof finalDisk.bavail !== "bigint" ||
        typeof finalDisk.bsize !== "bigint" ||
        finalDisk.bavail < 0n ||
        finalDisk.bsize <= 0n
      )
        fail("DISK_UNAVAILABLE");
      const finalAvailable = finalDisk.bavail * finalDisk.bsize;
      if (finalAvailable > MAX) fail("NUMERIC_OVERFLOW");
      if (finalAvailable < state.available) state.available = finalAvailable;
      check();
    } catch (error) {
      const allowed = [
        "TIME_LIMIT",
        "INVENTORY_LIMIT",
        "UNSAFE_LINK",
        "NUMERIC_OVERFLOW",
        "DISK_UNAVAILABLE",
        "INVENTORY_CHANGED",
        "UNSAFE_FILE_TYPE",
        "WINDOWS_PROBE_FAILED",
      ];
      state.reasons.add(
        allowed.includes(error.code) ? error.code : "INVENTORY_IO_FAILURE",
      );
    } finally {
      for (const reason of state.reasons) globalReasons.add(reason);
      reports.push({
        id: root.id,
        status: state.reasons.size ? "incomplete" : "complete",
        reasons: [...state.reasons],
        totalBytes: safeNumber(state.total),
        categories: Object.fromEntries(
          Object.entries(state.categories).map(([category, value]) => [
            category,
            serializeBucket(value),
          ]),
        ),
        runs: state.runs.map((run) => ({
          id: run.id,
          state: run.state,
          ...serializeBucket(run),
        })),
        disk:
          state.available === null
            ? null
            : { availableBytes: safeNumber(state.available) },
      });
    }
  }
  const forecast = {
    status: "not_evaluated",
    reasons: [],
    projectedManagedBytes: null,
  };
  if (manifest.projections.length) {
    const reasons = new Set();
    let growth = 0n;
    const devices = new Map();
    const runGrowth = new Map();
    for (const state of prepared) {
      if (!state.stat || state.available === null) continue;
      const device = String(state.stat.dev);
      const previous = devices.get(device);
      devices.set(device, {
        available: previous
          ? previous.available < state.available
            ? previous.available
            : state.available
          : state.available,
        growth: 0n,
      });
    }
    for (const projection of manifest.projections) {
      const amount =
        BigInt(projection.retainedBytes) + BigInt(projection.temporaryBytes);
      growth += amount;
      const state = prepared.find(
        (candidate) => candidate.root.id === projection.rootId,
      );
      const device = devices.get(String(state.stat?.dev));
      if (device) device.growth += amount;
      const runKey = projection.rootId + "/" + projection.runId;
      runGrowth.set(runKey, (runGrowth.get(runKey) ?? 0n) + amount);
    }
    const projected = total + growth;
    forecast.projectedManagedBytes = safeNumber(projected);
    if (projected > MAX) reasons.add("NUMERIC_OVERFLOW");
    if (globalReasons.size) reasons.add("INCOMPLETE_INVENTORY");
    if (projected > BigInt(STORAGE_LIMITS.managedBytes))
      reasons.add("MANAGED_LIMIT");
    for (const state of prepared)
      for (const run of state.runs)
        if (
          run.bytes + (runGrowth.get(state.root.id + "/" + run.id) ?? 0n) >
          BigInt(STORAGE_LIMITS.runBytes)
        )
          reasons.add("RUN_LIMIT");
    for (const device of devices.values())
      if (device.available - device.growth < BigInt(STORAGE_LIMITS.freeBytes))
        reasons.add("FREE_SPACE_FLOOR");
    forecast.status = reasons.size ? "refused" : "within_limits";
    forecast.reasons = [...reasons];
  }
  return {
    version: "1.0.0",
    status: globalReasons.size ? "incomplete" : "complete",
    reasons: [...globalReasons],
    limits: STORAGE_LIMITS,
    totalBytes: safeNumber(total),
    roots: reports,
    forecast,
  };
}
