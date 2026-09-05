import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { types } from "node:util";
import { clearTimeout, setTimeout } from "node:timers";

// This store has no acquisition transport. The caller supplies bounded synthetic
// bytes. Its root must be exclusively controlled by the local operator: Node's
// pathname APIs cannot defend against a privileged, concurrent filesystem writer.
const DIGEST = /^[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const MAX_PATH = 240;
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayByteLength = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "byteLength",
).get;
const typedArrayBuffer = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "buffer",
).get;
const typedArraySet = typedArrayPrototype.set;
const DEFAULT_LIMITS = Object.freeze({
  maxObjectBytes: 1024 * 1024,
  maxGlobalBytes: 80 * 1024 ** 3,
  maxSourceBytes: 8 * 1024 ** 3,
  minFreeBytes: 20 * 1024 ** 3,
  maxEntries: 10000,
  operationTimeoutMs: 30000,
  maxConcurrentOperations: 1,
});
const ERROR_CODES = new Set([
  "INVALID_CONFIGURATION",
  "UNSUPPORTED_PLATFORM",
  "UNSAFE_PATH",
  "PATH_ALIAS",
  "UNSAFE_LINK",
  "INVALID_INPUT",
  "SYNTHETIC_ONLY",
  "OBJECT_LIMIT",
  "GLOBAL_QUOTA",
  "SOURCE_QUOTA",
  "FREE_SPACE_FLOOR",
  "INVENTORY_LIMIT",
  "TIME_LIMIT",
  "CONCURRENCY_LIMIT",
  "STORE_BUSY",
  "STORE_CLOSED",
  "OBJECT_NOT_FOUND",
  "OBJECT_INTEGRITY",
  "RECEIPT_INTEGRITY",
  "OPERATION_CONFLICT",
  "RECOVERY_REQUIRED",
  "IO_FAILURE",
]);

export class CorpusStoreError extends Error {
  constructor(code) {
    const safeCode = ERROR_CODES.has(code) ? code : "IO_FAILURE";
    super(`Corpus store rejected operation: ${safeCode}`);
    this.name = "CorpusStoreError";
    this.code = safeCode;
    this.stack = `${this.name}: ${this.message}`;
  }
}

function fail(code) {
  throw new CorpusStoreError(code);
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.length <= 48 &&
    ID.test(value) &&
    !RESERVED.test(value)
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function copySyntheticBytes(value, maxBytes) {
  // Intrinsics inspect the typed-array slots without reading caller properties.
  // Shared buffers cannot provide an immutable snapshot against another thread.
  if (!types.isUint8Array(value)) fail("INVALID_INPUT");
  let byteLength;
  try {
    if (!types.isArrayBuffer(typedArrayBuffer.call(value)))
      fail("INVALID_INPUT");
    byteLength = typedArrayByteLength.call(value);
  } catch {
    fail("INVALID_INPUT");
  }
  if (byteLength < 1 || byteLength > maxBytes) fail("OBJECT_LIMIT");
  const bytes = Buffer.allocUnsafe(byteLength);
  try {
    typedArraySet.call(bytes, value);
  } catch {
    fail("INVALID_INPUT");
  }
  if (bytes.length !== byteLength || bytes.length > maxBytes)
    fail("OBJECT_LIMIT");
  return bytes;
}

function objectPath(digest) {
  return `objects/sha256/${digest.slice(0, 2)}/${digest.slice(2, 4)}/${digest}`;
}

function safeRoot(value) {
  if (
    typeof value !== "string" ||
    value.length > 120 ||
    !/^[A-Z]:\\/.test(value) ||
    value.includes("/") ||
    value.startsWith("\\") ||
    value.endsWith("\\") ||
    path.win32.normalize(value) !== value
  ) {
    fail("UNSAFE_PATH");
  }
  const parts = value.slice(3).split("\\");
  if (
    parts.length === 0 ||
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        /[^\x20-\x7e]|[<>:"|?*]/.test(part) ||
        /[. ]$/.test(part) ||
        RESERVED.test(part),
    )
  ) {
    fail("UNSAFE_PATH");
  }
  return value;
}

function isWithin(candidate, parent) {
  const lowerCandidate = candidate.toLowerCase();
  const lowerParent = parent.toLowerCase();
  return (
    lowerCandidate === lowerParent ||
    lowerCandidate.startsWith(`${lowerParent}\\`)
  );
}

async function existsStat(file) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function checkEntry(stat, directory) {
  if (stat.isSymbolicLink() || (!directory && stat.nlink !== 1)) {
    fail("UNSAFE_LINK");
  }
  if (directory ? !stat.isDirectory() : !stat.isFile()) fail("UNSAFE_PATH");
}

function timeGuard(limit) {
  const started = process.hrtime.bigint();
  return () => {
    if (process.hrtime.bigint() - started >= BigInt(limit) * 1000000n) {
      fail("TIME_LIMIT");
    }
  };
}

async function entries(directory, limit, checkTime) {
  const result = [];
  const handle = await fs.opendir(directory);
  try {
    for (;;) {
      checkTime();
      const entry = await handle.read();
      if (!entry) break;
      result.push(entry.name);
      if (result.length > limit) fail("INVENTORY_LIMIT");
    }
  } finally {
    await handle.close();
  }
  const seen = new Set();
  for (const name of result) {
    const folded = name.toLowerCase();
    if (seen.has(folded)) fail("PATH_ALIAS");
    seen.add(folded);
  }
  return result.sort();
}

async function ensurePath(
  absolute,
  create,
  limits,
  checkTime,
  directory = true,
) {
  if (absolute.length > MAX_PATH) fail("UNSAFE_PATH");
  let current = path.parse(absolute).root;
  checkEntry(await fs.lstat(current), true);
  const parts = absolute.slice(current.length).split(path.sep);
  for (let index = 0; index < parts.length; index += 1) {
    checkTime();
    const names = await entries(current, limits.maxEntries, checkTime);
    const part = parts[index];
    const alias = names.find(
      (name) => name.toLowerCase() === part.toLowerCase(),
    );
    if (alias && alias !== part) fail("PATH_ALIAS");
    current = path.join(current, part);
    let stat = await existsStat(current);
    const isDirectory = index < parts.length - 1 || directory;
    if (!stat) {
      if (!create || !isDirectory) return null;
      await fs.mkdir(current);
      stat = await fs.lstat(current);
    }
    checkEntry(stat, isDirectory);
  }
  return fs.lstat(absolute);
}

function sanitized(error) {
  return error instanceof CorpusStoreError
    ? error
    : new CorpusStoreError("IO_FAILURE");
}

// Node lstat does not expose all Windows reparse tags. This fixed, bounded
// Windows-native probe rejects the ReparsePoint attribute before walking a
// directory; paths arrive as JSON on stdin, never as PowerShell source. No source
// content, environment values, command output or absolute paths enter receipts.
const ATTRIBUTE_PROBE = `
$ErrorActionPreference = 'Stop'
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $cursor = [System.IO.Path]::GetPathRoot($request.root)
  $parts = $request.root.Substring($cursor.Length).Split([char]'\\')
  foreach ($part in $parts) {
    $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { exit 42 }
    $cursor = [System.IO.Path]::Combine($cursor, $part)
    if (-not [System.IO.Directory]::Exists($cursor)) {
      if ([System.IO.File]::Exists($cursor)) { exit 44 }
      exit 0
    }
  }
  $queue = New-Object 'System.Collections.Generic.Queue[string]'
  $queue.Enqueue($request.root)
  $count = 0
  while ($queue.Count -gt 0) {
    $directory = $queue.Dequeue()
    $item = Get-Item -LiteralPath $directory -Force -ErrorAction Stop
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { exit 42 }
    foreach ($entry in [System.IO.Directory]::EnumerateFileSystemEntries($directory)) {
      $count += 1
      if ($count -gt $request.maxEntries) { exit 43 }
      $item = Get-Item -LiteralPath $entry -Force -ErrorAction Stop
      if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { exit 42 }
      if (($item.Attributes -band [System.IO.FileAttributes]::Directory) -ne 0) { $queue.Enqueue($entry) }
    }
  }
  exit 0
} catch { exit 44 }
`;

async function rejectWindowsReparsePoints(root, limits, checkTime) {
  checkTime();
  const windowsDirectory = process.env.SystemRoot;
  if (!windowsDirectory || !/^[A-Z]:\\[^<>:"|?*]+$/.test(windowsDirectory)) {
    fail("INVALID_CONFIGURATION");
  }
  const executable = path.join(
    windowsDirectory,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", ATTRIBUTE_PROBE],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    let outputBytes = 0;
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        child.kill();
      },
      Math.min(limits.operationTimeoutMs, 5000),
    );
    const discardOutput = (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 1024) child.kill();
    };
    child.stdout.on("data", discardOutput);
    child.stderr.on("data", discardOutput);
    child.stdin.on("error", () => {});
    child.once("error", () => {
      clearTimeout(timer);
      reject(new CorpusStoreError("IO_FAILURE"));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (timedOut) reject(new CorpusStoreError("TIME_LIMIT"));
      else if (code === 42) reject(new CorpusStoreError("UNSAFE_LINK"));
      else if (code === 43) reject(new CorpusStoreError("INVENTORY_LIMIT"));
      else if (code !== 0 || outputBytes !== 0)
        reject(new CorpusStoreError("IO_FAILURE"));
      else resolve();
    });
    child.stdin.end(JSON.stringify({ root, maxEntries: limits.maxEntries }));
  });
  checkTime();
}

/**
 * A local, synthetic-only Windows content-addressed store. All manifests use
 * digest-derived relative paths. Receipt reservations precede promotion, so a
 * crash can conservatively consume quota but cannot mint acquired-object proof.
 * No hidden network, parser, public artifact, or real-source authority exists.
 */
export async function openCorpusStore(configuration) {
  try {
    if (process.platform !== "win32") fail("UNSUPPORTED_PLATFORM");
    if (
      !configuration ||
      typeof configuration !== "object" ||
      Object.keys(configuration).some(
        (key) => !["root", "repositoryRoot", "limits"].includes(key),
      )
    ) {
      fail("INVALID_CONFIGURATION");
    }
    const root = safeRoot(configuration.root);
    const repositoryRoot = safeRoot(configuration.repositoryRoot);
    if (isWithin(root, repositoryRoot) || isWithin(repositoryRoot, root)) {
      fail("UNSAFE_PATH");
    }
    const overrides = configuration.limits ?? {};
    if (
      typeof overrides !== "object" ||
      Array.isArray(overrides) ||
      Object.keys(overrides).some((key) => !(key in DEFAULT_LIMITS))
    ) {
      fail("INVALID_CONFIGURATION");
    }
    const limits = Object.freeze({ ...DEFAULT_LIMITS, ...overrides });
    if (
      Object.entries(limits).some(
        ([key, value]) =>
          !Number.isSafeInteger(value) ||
          (key === "minFreeBytes" ? value < 0 : value <= 0),
      ) ||
      limits.maxConcurrentOperations !== 1 ||
      limits.maxObjectBytes > 16 * 1024 * 1024 ||
      limits.operationTimeoutMs > 30000 ||
      limits.maxEntries > 100000 ||
      limits.maxObjectBytes > limits.maxSourceBytes ||
      limits.maxSourceBytes > limits.maxGlobalBytes
    ) {
      fail("INVALID_CONFIGURATION");
    }
    let closed = false;
    let active = false;
    const lockPath = path.join(root, ".corpus-lock.json");
    const recoveryLockPath = path.join(root, ".corpus-recovery.json");
    const initialCheck = timeGuard(limits.operationTimeoutMs);
    await rejectWindowsReparsePoints(root, limits, initialCheck);
    await ensurePath(root, true, limits, initialCheck);
    const rootDevice = (await fs.lstat(root)).dev;

    const absolute = (relative) => {
      const value = path.join(root, ...relative.split("/"));
      if (!isWithin(value, root) || value.length > MAX_PATH)
        fail("UNSAFE_PATH");
      return value;
    };

    const validateFile = async (relative, checkTime) => {
      const target = absolute(relative);
      const stat = await ensurePath(target, false, limits, checkTime, false);
      if (stat && stat.dev !== rootDevice) fail("UNSAFE_PATH");
      return stat;
    };

    const readBounded = async (relative, maxBytes, checkTime, missingCode) => {
      checkTime();
      const stat = await validateFile(relative, checkTime);
      if (!stat) fail(missingCode);
      if (stat.size > maxBytes) fail("OBJECT_LIMIT");
      const handle = await fs.open(absolute(relative), "r");
      try {
        const opened = await handle.stat();
        checkEntry(opened, false);
        if (
          opened.dev !== stat.dev ||
          opened.ino !== stat.ino ||
          opened.size !== stat.size
        ) {
          fail("OBJECT_INTEGRITY");
        }
        // Allocate only the reviewed size, then probe once for an extra byte.
        const bytes = Buffer.alloc(stat.size);
        let offset = 0;
        while (offset < bytes.length) {
          checkTime();
          const result = await handle.read(
            bytes,
            offset,
            bytes.length - offset,
          );
          if (result.bytesRead === 0) fail("OBJECT_INTEGRITY");
          offset += result.bytesRead;
        }
        const extra = await handle.read(Buffer.alloc(1), 0, 1);
        if (extra.bytesRead !== 0) fail("OBJECT_INTEGRITY");
        checkTime();
        return bytes;
      } finally {
        await handle.close();
      }
    };

    const writeNew = async (relative, bytes, checkTime) => {
      const target = absolute(relative);
      await ensurePath(path.dirname(target), true, limits, checkTime);
      checkTime();
      const handle = await fs.open(target, "wx", 0o600);
      try {
        const stat = await handle.stat();
        checkEntry(stat, false);
        if (stat.dev !== rootDevice) fail("UNSAFE_PATH");
        await handle.writeFile(bytes);
        await handle.sync();
        checkTime();
      } finally {
        await handle.close();
      }
    };

    const promote = async (from, to, checkTime) => {
      await validateFile(from, checkTime);
      await ensurePath(path.dirname(absolute(to)), true, limits, checkTime);
      if (await validateFile(to, checkTime)) fail("OPERATION_CONFLICT");
      checkTime();
      // Both locations are under the validated, exclusively locked root and on
      // its device. Never overwrite an existing target or follow a provider name.
      await fs.rename(absolute(from), absolute(to));
    };

    const lock = async (recover, checkTime) => {
      await rejectWindowsReparsePoints(root, limits, checkTime);
      await ensurePath(root, false, limits, checkTime);
      if (await existsStat(recoveryLockPath)) fail("STORE_BUSY");
      let handle;
      try {
        handle = await fs.open(lockPath, "wx", 0o600);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (!recover) fail("STORE_BUSY");
        // Serialize stale-lock recovery itself: two recoverers must never both
        // unlink a lock after one has replaced it. An interrupted recovery guard
        // is deliberately NOT auto-stolen and requires exact operator custody.
        let recoveryHandle;
        try {
          recoveryHandle = await fs.open(recoveryLockPath, "wx", 0o600);
        } catch (recoveryError) {
          if (recoveryError.code === "EEXIST") fail("STORE_BUSY");
          throw recoveryError;
        }
        try {
          await recoveryHandle.writeFile(JSON.stringify({ pid: process.pid }));
          await recoveryHandle.sync();
          const bytes = await readBounded(
            ".corpus-lock.json",
            256,
            checkTime,
            "RECOVERY_REQUIRED",
          );
          let prior;
          try {
            prior = JSON.parse(bytes.toString("utf8"));
          } catch {
            fail("RECOVERY_REQUIRED");
          }
          if (
            !exactKeys(prior, ["pid", "nonce"]) ||
            !Number.isSafeInteger(prior.pid) ||
            prior.pid <= 0 ||
            typeof prior.nonce !== "string" ||
            !/^[a-f0-9-]{36}$/.test(prior.nonce)
          ) {
            fail("RECOVERY_REQUIRED");
          }
          try {
            process.kill(prior.pid, 0);
            fail("STORE_BUSY");
          } catch (probeError) {
            if (probeError.code !== "ESRCH") fail("STORE_BUSY");
          }
          // Permission errors, invalid locks, active or recycled PIDs block.
          await fs.unlink(lockPath);
          try {
            handle = await fs.open(lockPath, "wx", 0o600);
          } catch (replacementError) {
            if (replacementError.code === "EEXIST") fail("STORE_BUSY");
            throw replacementError;
          }
        } finally {
          await recoveryHandle.close();
          await fs.unlink(recoveryLockPath);
        }
      }
      const nonce = randomUUID();
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, nonce }));
        await handle.sync();
      } finally {
        await handle.close();
      }
      return async () => {
        const bytes = await readBounded(
          ".corpus-lock.json",
          256,
          () => {},
          "RECOVERY_REQUIRED",
        );
        let current;
        try {
          current = JSON.parse(bytes.toString("utf8"));
        } catch {
          fail("RECOVERY_REQUIRED");
        }
        if (current.pid !== process.pid || current.nonce !== nonce) {
          fail("RECOVERY_REQUIRED");
        }
        await fs.unlink(lockPath);
      };
    };

    const operate = async (operation, recover = false) => {
      if (closed) fail("STORE_CLOSED");
      if (active) fail("CONCURRENCY_LIMIT");
      active = true;
      let release;
      let outcome;
      let failure;
      try {
        const checkTime = timeGuard(limits.operationTimeoutMs);
        release = await lock(recover, checkTime);
        outcome = await operation(checkTime);
      } catch (error) {
        failure = sanitized(error);
      }
      try {
        if (release) await release();
      } catch (error) {
        failure = sanitized(error);
      }
      active = false;
      if (failure) throw failure;
      return outcome;
    };

    const scan = async (checkTime) => {
      const files = [];
      let visited = 0;
      const visit = async (relative, depth) => {
        if (depth > 6) fail("UNSAFE_PATH");
        const target = relative ? absolute(relative) : root;
        await ensurePath(target, false, limits, checkTime);
        for (const name of await entries(
          target,
          limits.maxEntries,
          checkTime,
        )) {
          visited += 1;
          if (visited > limits.maxEntries) fail("INVENTORY_LIMIT");
          if (
            !relative &&
            [".corpus-lock.json", ".corpus-recovery.json"].includes(name)
          )
            continue;
          if (
            /[^a-z0-9.-]/.test(name) ||
            /[. ]$/.test(name) ||
            name === "." ||
            name === ".." ||
            RESERVED.test(name)
          ) {
            fail("UNSAFE_PATH");
          }
          const child = relative ? `${relative}/${name}` : name;
          const stat = await fs.lstat(absolute(child));
          checkEntry(stat, stat.isDirectory());
          if (stat.dev !== rootDevice) fail("UNSAFE_PATH");
          if (stat.isDirectory()) await visit(child, depth + 1);
          else files.push({ relativePath: child, byteLength: stat.size });
        }
      };
      await visit("", 0);
      const objects = [];
      const reservations = [];
      const incomplete = [];
      let totalBytes = 0;
      for (const file of files) {
        totalBytes += file.byteLength;
        if (!Number.isSafeInteger(totalBytes)) fail("GLOBAL_QUOTA");
        const match =
          /^objects\/sha256\/([a-f0-9]{2})\/([a-f0-9]{2})\/([a-f0-9]{64})$/.exec(
            file.relativePath,
          );
        if (match) {
          const digest = match[3];
          if (
            match[1] !== digest.slice(0, 2) ||
            match[2] !== digest.slice(2, 4)
          ) {
            fail("OBJECT_INTEGRITY");
          }
          const bytes = await readBounded(
            file.relativePath,
            limits.maxObjectBytes,
            checkTime,
            "OBJECT_NOT_FOUND",
          );
          if (sha256(bytes) !== digest) fail("OBJECT_INTEGRITY");
          objects.push({ sha256: digest, ...file });
          continue;
        }
        if (
          /^receipts\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(file.relativePath)
        ) {
          const bytes = await readBounded(
            file.relativePath,
            1024,
            checkTime,
            "RECEIPT_INTEGRITY",
          );
          let value;
          try {
            value = JSON.parse(bytes.toString("utf8"));
          } catch {
            fail("RECEIPT_INTEGRITY");
          }
          if (
            !exactKeys(value, [
              "kind",
              "synthetic",
              "sourceId",
              "operationId",
              "sha256",
              "byteLength",
            ]) ||
            value.kind !== "synthetic_object_reservation" ||
            value.synthetic !== true ||
            !validId(value.sourceId) ||
            !value.sourceId.startsWith("synthetic-") ||
            !validId(value.operationId) ||
            !DIGEST.test(value.sha256) ||
            !Number.isSafeInteger(value.byteLength) ||
            value.byteLength <= 0 ||
            value.byteLength > limits.maxObjectBytes ||
            file.relativePath !==
              `receipts/${value.sourceId}/${value.operationId}.json` ||
            JSON.stringify(value) + "\n" !== bytes.toString("utf8")
          ) {
            fail("RECEIPT_INTEGRITY");
          }
          reservations.push(value);
          continue;
        }
        if (
          /^(?:work|quarantine)\/[a-z0-9-]+\.(?:object|receipt)\.part$/.test(
            file.relativePath,
          )
        ) {
          incomplete.push(file);
          continue;
        }
        fail("UNSAFE_PATH");
      }
      const sourceMap = new Map();
      for (const reservation of reservations) {
        const sourceObjects = sourceMap.get(reservation.sourceId) ?? new Map();
        const previous = sourceObjects.get(reservation.sha256);
        if (previous !== undefined && previous !== reservation.byteLength) {
          fail("RECEIPT_INTEGRITY");
        }
        sourceObjects.set(reservation.sha256, reservation.byteLength);
        sourceMap.set(reservation.sourceId, sourceObjects);
        const object = objects.find(
          (entry) => entry.sha256 === reservation.sha256,
        );
        if (object && object.byteLength !== reservation.byteLength) {
          fail("RECEIPT_INTEGRITY");
        }
      }
      const sources = [...sourceMap.entries()]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([sourceId, sourceObjects]) => ({
          sourceId,
          reservedBytes: [...sourceObjects.values()].reduce(
            (sum, size) => sum + size,
            0,
          ),
          objectDigests: [...sourceObjects.keys()].sort(),
        }));
      return { objects, reservations, incomplete, totalBytes, sources };
    };

    return Object.freeze({
      async putSynthetic(input) {
        if (closed) fail("STORE_CLOSED");
        if (active) fail("CONCURRENCY_LIMIT");
        if (
          input &&
          (typeof input === "object" || typeof input === "function")
        ) {
          if (types.isProxy(input)) fail("INVALID_INPUT");
          const descriptors = Object.getOwnPropertyDescriptors(input);
          if (
            Reflect.ownKeys(descriptors).some(
              (key) =>
                typeof key !== "string" || !("value" in descriptors[key]),
            )
          )
            fail("INVALID_INPUT");
          // Never retain caller-owned identities across an await or invoke getters.
          input = Object.fromEntries(
            Object.entries(descriptors).map(([key, descriptor]) => [
              key,
              descriptor.value,
            ]),
          );
        }
        if (!input || input.synthetic !== true) fail("SYNTHETIC_ONLY");
        if (
          !exactKeys(input, [
            "sourceId",
            "operationId",
            "synthetic",
            "bytes",
          ]) ||
          !validId(input.sourceId) ||
          !input.sourceId.startsWith("synthetic-") ||
          !validId(input.operationId)
        ) {
          fail("INVALID_INPUT");
        }
        // Copy before awaiting: caller mutation cannot alter the acquired bytes.
        const bytes = copySyntheticBytes(input.bytes, limits.maxObjectBytes);
        const digest = sha256(bytes);
        return operate(async (checkTime) => {
          const before = await scan(checkTime);
          if (
            before.incomplete.some((file) =>
              file.relativePath.startsWith("work/"),
            )
          ) {
            fail("RECOVERY_REQUIRED");
          }
          const reservation = {
            kind: "synthetic_object_reservation",
            synthetic: true,
            sourceId: input.sourceId,
            operationId: input.operationId,
            sha256: digest,
            byteLength: bytes.length,
          };
          const receiptBytes = Buffer.from(JSON.stringify(reservation) + "\n");
          const prior = before.reservations.find(
            (entry) =>
              entry.sourceId === input.sourceId &&
              entry.operationId === input.operationId,
          );
          if (prior && JSON.stringify(prior) !== JSON.stringify(reservation)) {
            fail("OPERATION_CONFLICT");
          }
          const existing = before.objects.find(
            (entry) => entry.sha256 === digest,
          );
          const source = before.sources.find(
            (entry) => entry.sourceId === input.sourceId,
          );
          const addedSourceBytes = source?.objectDigests.includes(digest)
            ? 0
            : bytes.length;
          if (
            (source?.reservedBytes ?? 0) + addedSourceBytes >
            limits.maxSourceBytes
          ) {
            fail("SOURCE_QUOTA");
          }
          const addedBytes =
            (existing ? 0 : bytes.length) + (prior ? 0 : receiptBytes.length);
          if (before.totalBytes + addedBytes > limits.maxGlobalBytes)
            fail("GLOBAL_QUOTA");
          const space = await fs.statfs(root, { bigint: true });
          if (
            space.bavail * space.bsize - BigInt(addedBytes) <
            BigInt(limits.minFreeBytes)
          ) {
            fail("FREE_SPACE_FLOOR");
          }
          const attempt = randomUUID();
          const objectStage = `work/${attempt}.object.part`;
          const receiptStage = `work/${attempt}.receipt.part`;
          if (!existing) await writeNew(objectStage, bytes, checkTime);
          if (!prior) {
            await writeNew(receiptStage, receiptBytes, checkTime);
            await promote(
              receiptStage,
              `receipts/${input.sourceId}/${input.operationId}.json`,
              checkTime,
            );
          }
          if (!existing)
            await promote(objectStage, objectPath(digest), checkTime);
          const stored = await readBounded(
            objectPath(digest),
            limits.maxObjectBytes,
            checkTime,
            "OBJECT_NOT_FOUND",
          );
          if (sha256(stored) !== digest) fail("OBJECT_INTEGRITY");
          return Object.freeze({
            schemaVersion: "1.0.0",
            kind: "synthetic_object_receipt",
            status: existing ? "already_present" : "stored",
            synthetic: true,
            sourceId: input.sourceId,
            operationId: input.operationId,
            sha256: digest,
            byteLength: bytes.length,
            objectPath: objectPath(digest),
          });
        });
      },

      async readObject(digest) {
        if (typeof digest !== "string" || !DIGEST.test(digest))
          fail("INVALID_INPUT");
        return operate(async (checkTime) => {
          const bytes = await readBounded(
            objectPath(digest),
            limits.maxObjectBytes,
            checkTime,
            "OBJECT_NOT_FOUND",
          );
          if (sha256(bytes) !== digest) fail("OBJECT_INTEGRITY");
          return bytes;
        });
      },

      async inventory() {
        return operate(async (checkTime) => {
          const result = await scan(checkTime);
          return {
            schemaVersion: "1.0.0",
            kind: "synthetic_corpus_inventory",
            synthetic: true,
            totalBytes: result.totalBytes,
            objects: result.objects,
            sources: result.sources,
            pendingReservations: result.reservations.filter(
              (receipt) =>
                !result.objects.some(
                  (object) => object.sha256 === receipt.sha256,
                ),
            ),
            incomplete: result.incomplete,
          };
        });
      },

      async recover() {
        return operate(async (checkTime) => {
          const before = await scan(checkTime);
          const moved = [];
          for (const file of before.incomplete) {
            if (!file.relativePath.startsWith("work/")) continue;
            const target = file.relativePath.replace(/^work\//, "quarantine/");
            await promote(file.relativePath, target, checkTime);
            moved.push({ relativePath: target, byteLength: file.byteLength });
          }
          return {
            schemaVersion: "1.0.0",
            kind: "synthetic_recovery_receipt",
            synthetic: true,
            status: moved.length
              ? "quarantined_incomplete"
              : "no_incomplete_work",
            quarantined: moved,
          };
        }, true);
      },

      async close() {
        if (active) fail("STORE_BUSY");
        closed = true;
      },
    });
  } catch (error) {
    throw sanitized(error);
  }
}
