import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import {
  CorpusStoreError,
  openCorpusStore,
} from "../../src/pipeline/corpus-store.mjs";

const repositoryRoot = fileURLToPath(
  new URL("../../", import.meta.url),
).replace(/[\\/]$/, "");
const windows = process.platform === "win32";
const baseLimits = {
  maxObjectBytes: 1024,
  maxSourceBytes: 8192,
  maxGlobalBytes: 32768,
  minFreeBytes: 0,
};

async function fixture(t, limits = {}) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ps09-cas-"));
  const root = path.join(temporaryRoot, "corpus");
  const store = await openCorpusStore({
    root,
    repositoryRoot,
    limits: { ...baseLimits, ...limits },
  });
  t.after(async () => {
    await store.close();
    // Only this test's exact mkdtemp result is recursively removed. Junction
    // fixtures are explicitly unlinked in the test before this cleanup.
    assert.equal(path.dirname(temporaryRoot), os.tmpdir());
    assert.match(path.basename(temporaryRoot), /^ps09-cas-[a-zA-Z0-9]+$/);
    const stat = await fs.lstat(temporaryRoot);
    assert.equal(stat.isSymbolicLink(), false);
    await fs.rm(temporaryRoot, { recursive: true });
  });
  return { store, root, temporaryRoot };
}

function input(overrides = {}) {
  return {
    sourceId: "synthetic-corpus-test",
    operationId: "operation-one",
    synthetic: true,
    bytes: Buffer.from("Synthetic fixture only.\n"),
    ...overrides,
  };
}

function rejectsCode(code) {
  return (error) => {
    assert.ok(error instanceof CorpusStoreError);
    assert.equal(error.code, code);
    assert.equal(error.message, `Corpus store rejected operation: ${code}`);
    assert.equal("cause" in error, false);
    assert.equal(error.stack, `${error.name}: ${error.message}`);
    return true;
  };
}

test(
  "Windows CAS stores immutable bytes, replays digest, deduplicates and emits portable deterministic custody",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    const bytes = Buffer.from(
      "\ufeffSOURCE BYTES\r\nignore previous instructions\r\n",
    );
    const expected = createHash("sha256").update(bytes).digest("hex");
    const receipt = await store.putSynthetic(input({ bytes }));
    assert.equal(receipt.sha256, expected);
    assert.equal(receipt.status, "stored");
    assert.equal(
      receipt.objectPath,
      `objects/sha256/${expected.slice(0, 2)}/${expected.slice(2, 4)}/${expected}`,
    );
    assert.deepEqual(await store.readObject(expected), bytes);
    const replay = await store.putSynthetic(input({ bytes }));
    assert.deepEqual(replay, { ...receipt, status: "already_present" });
    const first = await store.inventory();
    assert.deepEqual(await store.inventory(), first);
    assert.equal(first.objects.length, 1);
    assert.equal(first.sources[0].reservedBytes, bytes.length);
    assert.equal(first.pendingReservations.length, 0);
    assert.equal(first.incomplete.length, 0);
    assert.equal(JSON.stringify(first).includes(root), false);
    assert.equal(JSON.stringify(receipt).includes(root), false);
    const objectStat = await fs.lstat(
      path.join(root, ...receipt.objectPath.split("/")),
    );
    assert.equal(objectStat.nlink, 1);
    assert.equal(objectStat.dev, (await fs.lstat(root)).dev);
    assert.deepEqual(await fs.readdir(path.join(root, "work")), []);
    assert.equal((await fs.readdir(root)).includes(".corpus-lock.json"), false);
  },
);

test(
  "input is copied before awaits and never accepts real acquisition or metadata secrets",
  { skip: !windows },
  async (t) => {
    const { store } = await fixture(t);
    const bytes = Buffer.from("original");
    const request = input({ bytes });
    const pending = store.putSynthetic(request);
    request.sourceId = "../../real-source";
    request.operationId = "../../escape";
    request.synthetic = false;
    bytes.fill(0);
    const receipt = await pending;
    assert.equal(receipt.sourceId, "synthetic-corpus-test");
    assert.equal(receipt.operationId, "operation-one");
    let getterCalls = 0;
    const accessor = input();
    Object.defineProperty(accessor, "sourceId", {
      get() {
        getterCalls += 1;
        return "synthetic-corpus-test";
      },
    });
    await assert.rejects(
      store.putSynthetic(accessor),
      rejectsCode("INVALID_INPUT"),
    );
    assert.equal(getterCalls, 0);
    await assert.rejects(
      store.putSynthetic(new Proxy(input(), {})),
      rejectsCode("INVALID_INPUT"),
    );
    assert.equal(
      (await store.readObject(receipt.sha256)).toString(),
      "original",
    );
    await assert.rejects(
      store.putSynthetic(input({ synthetic: false })),
      rejectsCode("SYNTHETIC_ONLY"),
    );
    await assert.rejects(
      store.putSynthetic(input({ sourceId: "federal-register" })),
      rejectsCode("INVALID_INPUT"),
    );
    await assert.rejects(
      store.putSynthetic(input({ authorization: "Bearer secret" })),
      rejectsCode("INVALID_INPUT"),
    );
    await assert.rejects(
      store.putSynthetic(input({ bytes: "not bytes" })),
      rejectsCode("INVALID_INPUT"),
    );
    await assert.rejects(
      store.putSynthetic(input({ operationId: "../../secret" })),
      rejectsCode("INVALID_INPUT"),
    );
    await assert.rejects(
      store.putSynthetic(input({ operationId: "nul" })),
      rejectsCode("INVALID_INPUT"),
    );
    await assert.rejects(
      store.readObject("../credential"),
      rejectsCode("INVALID_INPUT"),
    );
  },
);

test(
  "intrinsic byte bounds reject spoofed sizes and proxies before object or receipt promotion",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    let calls = 0;
    const unexpectedHook = () => {
      calls += 1;
      throw new Error("Bearer secret-value I:\\private");
    };
    const oversized = new Uint8Array(baseLimits.maxObjectBytes + 1);
    Object.defineProperty(oversized, "byteLength", { value: 1 });
    const empty = new Uint8Array(0);
    Object.defineProperty(empty, "byteLength", { value: 1 });
    const proxy = new Proxy(new Uint8Array(1), {
      get: unexpectedHook,
      getPrototypeOf: unexpectedHook,
    });
    const revoked = Proxy.revocable(new Uint8Array(1), {});
    revoked.revoke();
    const shared = new Uint8Array(new SharedArrayBuffer(1));
    Object.defineProperty(shared, "buffer", { value: new ArrayBuffer(1) });
    for (const [bytes, code] of [
      [oversized, "OBJECT_LIMIT"],
      [empty, "OBJECT_LIMIT"],
      [proxy, "INVALID_INPUT"],
      [revoked.proxy, "INVALID_INPUT"],
      [shared, "INVALID_INPUT"],
      [Object.create(Uint8Array.prototype), "INVALID_INPUT"],
    ]) {
      await assert.rejects(
        store.putSynthetic(input({ bytes })),
        rejectsCode(code),
      );
      const inventory = await store.inventory();
      assert.deepEqual(inventory.objects, []);
      assert.deepEqual(inventory.sources, []);
      assert.deepEqual(inventory.pendingReservations, []);
      assert.deepEqual(inventory.incomplete, []);
      assert.deepEqual(await fs.readdir(root), []);
    }
    const original = Buffer.from("intrinsic snapshot");
    const bytes = new Uint8Array(original);
    for (const key of [
      "byteLength",
      "buffer",
      "byteOffset",
      "length",
      "valueOf",
      "constructor",
      Symbol.iterator,
      Symbol.toPrimitive,
    ]) {
      Object.defineProperty(bytes, key, { get: unexpectedHook });
    }
    const receipt = await store.putSynthetic(input({ bytes }));
    assert.equal(receipt.byteLength, original.length);
    assert.deepEqual(await store.readObject(receipt.sha256), original);
    assert.equal(calls, 0);
  },
);

test(
  "root validation rejects repository overlap, path traversal, Win32 aliases, ADS, devices and excessive paths",
  { skip: !windows },
  async () => {
    const badRoots = [
      repositoryRoot,
      `${repositoryRoot}\\inside`,
      "I:\\",
      "I:\\safe\\..\\elsewhere",
      "I:\\corpus:stream",
      "I:\\corpus.",
      "I:\\corpus ",
      "I:\\NUL\\corpus",
      "I:\\COM1.txt\\corpus",
      "I:\\LPT9\\corpus",
      "I:\\corpus\\.\\child",
      "I:\\corpus\u2028path",
      "I:\\corpus\\\\child",
      "I:/corpus",
      "i:\\corpus",
      "\\\\server\\share\\corpus",
      "\\\\?\\I:\\corpus",
      `I:\\${"x".repeat(121)}`,
    ];
    for (const root of badRoots) {
      await assert.rejects(
        openCorpusStore({ root, repositoryRoot }),
        rejectsCode("UNSAFE_PATH"),
      );
    }
  },
);

test(
  "existing root and ancestor case aliases are rejected",
  { skip: !windows },
  async (t) => {
    const { root, temporaryRoot } = await fixture(t);
    await assert.rejects(
      openCorpusStore({
        root: root.replace(/corpus$/, "CORPUS"),
        repositoryRoot,
      }),
      rejectsCode("PATH_ALIAS"),
    );
    const parentAlias = path.join(
      temporaryRoot.replace("ps09-cas", "PS09-CAS"),
      "second",
    );
    await assert.rejects(
      openCorpusStore({ root: parentAlias, repositoryRoot }),
      rejectsCode("PATH_ALIAS"),
    );
  },
);

test(
  "junction roots and descendants fail closed without touching their targets",
  { skip: !windows },
  async (t) => {
    const { store, root, temporaryRoot } = await fixture(t);
    const target = path.join(temporaryRoot, "outside");
    await fs.mkdir(target);
    const linkRoot = path.join(temporaryRoot, "linked-corpus");
    const descendant = path.join(root, "objects");
    await fs.symlink(target, linkRoot, "junction");
    await fs.symlink(target, descendant, "junction");
    try {
      await assert.rejects(
        openCorpusStore({ root: linkRoot, repositoryRoot }),
        rejectsCode("UNSAFE_LINK"),
      );
      await assert.rejects(
        store.putSynthetic(input()),
        rejectsCode("UNSAFE_LINK"),
      );
      assert.deepEqual(await fs.readdir(target), []);
    } finally {
      await fs.unlink(linkRoot);
      await fs.unlink(descendant);
    }
  },
);

test(
  "hard-linked object and staged files are rejected",
  { skip: !windows },
  async (t) => {
    const { store, root, temporaryRoot } = await fixture(t);
    const receipt = await store.putSynthetic(input());
    const objectFile = path.join(root, ...receipt.objectPath.split("/"));
    const alias = path.join(temporaryRoot, "hard-link");
    await fs.link(objectFile, alias);
    try {
      await assert.rejects(
        store.readObject(receipt.sha256),
        rejectsCode("UNSAFE_LINK"),
      );
      await assert.rejects(store.inventory(), rejectsCode("UNSAFE_LINK"));
    } finally {
      await fs.unlink(alias);
    }
    const stage = path.join(root, "work", `${randomUUID()}.object.part`);
    await fs.link(objectFile, stage);
    try {
      await assert.rejects(store.recover(), rejectsCode("UNSAFE_LINK"));
    } finally {
      await fs.unlink(stage);
    }
  },
);

test(
  "file symlinks are rejected by the native reparse probe",
  { skip: !windows },
  async (t) => {
    const { store, root, temporaryRoot } = await fixture(t);
    const target = path.join(temporaryRoot, "outside-file");
    const link = path.join(root, "linked-file");
    await fs.writeFile(target, "outside synthetic bytes");
    try {
      await fs.symlink(target, link, "file");
    } catch (error) {
      if (error.code === "EPERM") {
        t.skip(
          "Windows has not granted unprivileged file-symlink creation; junction and hard-link tests remain live.",
        );
        return;
      }
      throw error;
    }
    try {
      await assert.rejects(store.inventory(), rejectsCode("UNSAFE_LINK"));
      assert.equal(
        await fs.readFile(target, "utf8"),
        "outside synthetic bytes",
      );
    } finally {
      await fs.unlink(link);
    }
  },
);

test(
  "native probe treats shell punctuation as literal path data and object case aliases fail closed",
  { skip: !windows },
  async (t) => {
    const { store, root, temporaryRoot } = await fixture(t);
    const literalRoot = path.join(temporaryRoot, "literal-'[$(probe)]");
    const literalStore = await openCorpusStore({
      root: literalRoot,
      repositoryRoot,
      limits: baseLimits,
    });
    try {
      assert.equal((await literalStore.putSynthetic(input())).status, "stored");
    } finally {
      await literalStore.close();
    }
    const receipt = await store.putSynthetic(input());
    const objectFile = path.join(root, ...receipt.objectPath.split("/"));
    const uppercase = path.join(
      path.dirname(objectFile),
      receipt.sha256.toUpperCase(),
    );
    await fs.rename(objectFile, uppercase);
    try {
      await assert.rejects(
        store.readObject(receipt.sha256),
        rejectsCode("PATH_ALIAS"),
      );
    } finally {
      await fs.rename(uppercase, objectFile);
    }
  },
);

test(
  "object corruption and malformed or path-bearing reservation metadata fail closed",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    const receipt = await store.putSynthetic(input());
    const objectFile = path.join(root, ...receipt.objectPath.split("/"));
    await fs.writeFile(objectFile, "corrupted");
    await assert.rejects(
      store.readObject(receipt.sha256),
      rejectsCode("OBJECT_INTEGRITY"),
    );
    await assert.rejects(
      store.putSynthetic(input()),
      rejectsCode("OBJECT_INTEGRITY"),
    );
    await fs.writeFile(objectFile, input().bytes);
    const receiptFile = path.join(
      root,
      "receipts",
      input().sourceId,
      `${input().operationId}.json`,
    );
    await fs.writeFile(
      receiptFile,
      JSON.stringify({ absolutePath: root, cookie: "sensitive" }),
    );
    await assert.rejects(store.inventory(), rejectsCode("RECEIPT_INTEGRITY"));
  },
);

test(
  "object size, global quota, free-space floor and per-source deduplicated ownership are bounded",
  { skip: !windows },
  async (t) => {
    const { store } = await fixture(t, {
      maxObjectBytes: 8,
      maxSourceBytes: 8,
    });
    await assert.rejects(
      store.putSynthetic(input({ bytes: Buffer.alloc(9) })),
      rejectsCode("OBJECT_LIMIT"),
    );
    await assert.rejects(
      store.putSynthetic(input({ bytes: Buffer.alloc(0) })),
      rejectsCode("OBJECT_LIMIT"),
    );
    const receipt = await store.putSynthetic(
      input({ bytes: Buffer.from("12345678") }),
    );
    await store.putSynthetic(
      input({
        bytes: Buffer.from("12345678"),
        operationId: "another-operation",
      }),
    );
    await assert.rejects(
      store.putSynthetic(
        input({ bytes: Buffer.from("other"), operationId: "second-object" }),
      ),
      rejectsCode("SOURCE_QUOTA"),
    );
    await store.putSynthetic(
      input({ sourceId: "synthetic-second", bytes: Buffer.from("12345678") }),
    );
    const inventory = await store.inventory();
    assert.equal(inventory.objects.length, 1);
    assert.deepEqual(
      inventory.sources.map((source) => source.reservedBytes),
      [8, 8],
    );
    assert.equal(inventory.sources[1].objectDigests[0], receipt.sha256);
    const quota = await fixture(t, {
      maxObjectBytes: 8,
      maxSourceBytes: 8,
      maxGlobalBytes: 8,
    });
    await assert.rejects(
      quota.store.putSynthetic(input({ bytes: Buffer.from("12345678") })),
      rejectsCode("GLOBAL_QUOTA"),
    );
    const floor = await fixture(t, { minFreeBytes: Number.MAX_SAFE_INTEGER });
    await assert.rejects(
      floor.store.putSynthetic(input()),
      rejectsCode("FREE_SPACE_FLOOR"),
    );
  },
);

test(
  "operation identities are immutable and concurrency is bounded across handles",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    await store.putSynthetic(input());
    await assert.rejects(
      store.putSynthetic(input({ bytes: Buffer.from("different") })),
      rejectsCode("OPERATION_CONFLICT"),
    );
    const pending = store.inventory();
    await assert.rejects(store.inventory(), rejectsCode("CONCURRENCY_LIMIT"));
    await pending;
    const other = await openCorpusStore({
      root,
      repositoryRoot,
      limits: baseLimits,
    });
    try {
      await fs.writeFile(
        path.join(root, ".corpus-lock.json"),
        JSON.stringify({ pid: process.pid, nonce: randomUUID() }),
      );
      await assert.rejects(
        other.putSynthetic(input()),
        rejectsCode("STORE_BUSY"),
      );
      await assert.rejects(store.recover(), rejectsCode("STORE_BUSY"));
      await fs.unlink(path.join(root, ".corpus-lock.json"));
    } finally {
      await other.close();
    }
    await store.close();
    await assert.rejects(store.inventory(), rejectsCode("STORE_CLOSED"));
  },
);

test(
  "bounded inventory and timeout fail closed; unsupported concurrency configuration is refused",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    for (const limits of [
      { maxConcurrentOperations: 2 },
      { operationTimeoutMs: 30001 },
      { maxObjectBytes: 17 * 1024 * 1024 },
    ]) {
      await assert.rejects(
        openCorpusStore({ root, repositoryRoot, limits }),
        rejectsCode("INVALID_CONFIGURATION"),
      );
    }
    // A one millisecond deadline covers root/ancestor validation too and cannot
    // silently acquire an object after a slow filesystem operation returns.
    await assert.rejects(
      openCorpusStore({
        root,
        repositoryRoot,
        limits: { ...baseLimits, operationTimeoutMs: 1 },
      }),
      rejectsCode("TIME_LIMIT"),
    );
    await fs.mkdir(path.join(root, "work"));
    for (let count = 0; count < 5; count += 1) {
      await fs.writeFile(
        path.join(root, "work", `${randomUUID()}.object.part`),
        "partial",
      );
    }
    // Root traversal includes ancestors, so a tiny limit can reject there before
    // inventory. Either path must fail before acquisition or promotion.
    await assert.rejects(
      openCorpusStore({
        root,
        repositoryRoot,
        limits: { ...baseLimits, maxEntries: 1 },
      }),
      rejectsCode("INVENTORY_LIMIT"),
    );
    await assert.rejects(
      store.putSynthetic(input()),
      rejectsCode("RECOVERY_REQUIRED"),
    );
  },
);

test(
  "interrupted process staging is quarantined, never promoted, and restart is safe",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    const attempt = randomUUID();
    const childCode = `
    import * as fs from 'node:fs/promises';
    import process from 'node:process';
    import path from 'node:path';
    import {setInterval} from 'node:timers';
    const root = ${JSON.stringify(root)};
    await fs.writeFile(path.join(root, '.corpus-lock.json'), JSON.stringify({pid:process.pid,nonce:${JSON.stringify(randomUUID())}}), {flag:'wx'});
    await fs.mkdir(path.join(root, 'work'));
    await fs.writeFile(path.join(root, 'work', ${JSON.stringify(`${attempt}.object.part`)}), 'unpromoted synthetic bytes', {flag:'wx'});
    setInterval(() => {}, 1000);
    process.stdout.write('staged');
  `;
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", childCode],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    t.after(() => child.kill());
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.stdout.once("data", resolve);
      child.once("exit", (code) => {
        if (code !== null && code !== 0)
          reject(new Error(`fixture child exited ${code}`));
      });
    });
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await stopped;
    const receipt = await store.recover();
    assert.equal(receipt.status, "quarantined_incomplete");
    assert.deepEqual(receipt.quarantined, [
      { relativePath: `quarantine/${attempt}.object.part`, byteLength: 26 },
    ]);
    assert.equal((await store.inventory()).objects.length, 0);
    assert.deepEqual(await fs.readdir(path.join(root, "work")), []);
    assert.equal((await store.putSynthetic(input())).status, "stored");
    assert.equal((await store.recover()).status, "no_incomplete_work");
  },
);

test(
  "ambiguous locks are preserved and pending receipt reservations cannot masquerade as acquisitions",
  { skip: !windows },
  async (t) => {
    const { store, root } = await fixture(t);
    const lockFile = path.join(root, ".corpus-lock.json");
    await fs.writeFile(lockFile, "unreadable interruption");
    await assert.rejects(store.recover(), rejectsCode("RECOVERY_REQUIRED"));
    assert.equal(
      await fs.readFile(lockFile, "utf8"),
      "unreadable interruption",
    );
    await fs.unlink(lockFile);
    const recoveryGuard = path.join(root, ".corpus-recovery.json");
    await fs.writeFile(
      recoveryGuard,
      "interrupted recovery is not auto-stolen",
    );
    await assert.rejects(store.recover(), rejectsCode("STORE_BUSY"));
    await assert.rejects(
      store.putSynthetic(input()),
      rejectsCode("STORE_BUSY"),
    );
    assert.equal(
      await fs.readFile(recoveryGuard, "utf8"),
      "interrupted recovery is not auto-stolen",
    );
    await fs.unlink(recoveryGuard);
    const receipt = await store.putSynthetic(input());
    const objectFile = path.join(root, ...receipt.objectPath.split("/"));
    await fs.unlink(objectFile);
    const inventory = await store.inventory();
    assert.equal(inventory.objects.length, 0);
    assert.equal(inventory.pendingReservations.length, 1);
    assert.equal(inventory.sources[0].reservedBytes, input().bytes.length);
    await assert.rejects(
      store.readObject(receipt.sha256),
      rejectsCode("OBJECT_NOT_FOUND"),
    );
    assert.equal((await store.putSynthetic(input())).status, "stored");
  },
);
