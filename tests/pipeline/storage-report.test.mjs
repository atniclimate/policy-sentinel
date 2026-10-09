import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import {
  createStorageReport,
  STORAGE_LIMITS,
  validateStorageManifest,
} from "../../src/pipeline/storage-report.mjs";

const GIB = 1024 ** 3;
const free =
  (bytes = 100 * GIB) =>
  async () => ({ bavail: BigInt(bytes), bsize: 1n });
const fast = { probeWindows: async () => {}, io: { statfs: free() } };
async function fixture(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "ps-storage-"));
  t.after(async () => {
    assert.equal(path.dirname(base), os.tmpdir());
    assert.match(path.basename(base), /^ps-storage-[A-Za-z0-9]+$/);
    assert.equal((await fs.lstat(base)).isSymbolicLink(), false);
    await fs.rm(base, { recursive: true });
  });
  const roots = [];
  for (const id of ["first", "second"]) {
    const root = path.join(base, id);
    await fs.mkdir(root);
    roots.push({
      id,
      path: root,
      categories: [],
      runs: [{ id: "run", path: ".", state: "existing" }],
    });
  }
  const manifest = { version: "1.0.0", roots: [roots[0]], projections: [] };
  return { base, roots, manifest };
}
const projection = (bytes, rootId = "first", extra = {}) => ({
  id: "growth",
  rootId,
  runId: "run",
  retainedBytes: bytes,
  temporaryBytes: 0,
  ...extra,
});

test("counts every regular file, longest category prefix, and unmapped files", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0];
  await fs.mkdir(path.join(root.path, "objects", "temp"), { recursive: true });
  await fs.writeFile(path.join(root.path, "objects", "a"), "abc");
  await fs.writeFile(path.join(root.path, "objects", "temp", "b"), "de");
  await fs.writeFile(path.join(root.path, "private-name-never-emitted"), "f");
  root.categories = [
    { path: "objects", category: "originals" },
    { path: "objects/temp", category: "temporary" },
  ];
  const report = await createStorageReport(manifest, fast);
  assert.equal(report.status, "complete");
  assert.equal(report.totalBytes, 6);
  assert.deepEqual(report.roots[0].categories.originals, {
    bytes: 3,
    files: 1,
  });
  assert.deepEqual(report.roots[0].categories.temporary, {
    bytes: 2,
    files: 1,
  });
  assert.deepEqual(report.roots[0].categories.unclassified, {
    bytes: 1,
    files: 1,
  });
  assert.deepEqual(report.roots[0].runs, [
    { id: "run", state: "existing", bytes: 6, files: 3 },
  ]);
  assert.equal(report.forecast.status, "not_evaluated");
  assert.ok(!JSON.stringify(report).includes(root.path));
  assert.ok(!JSON.stringify(report).includes("private-name"));
});

test("strict manifest rejects extras, traversal, overlap, duplicate routes and unsafe estimates", async (t) => {
  const { manifest, roots } = await fixture(t);
  const cases = [
    { ...manifest, extra: true },
    { ...manifest, roots: [] },
    { ...manifest, roots: [roots[0], { ...roots[0], id: "alias" }] },
    {
      ...manifest,
      roots: [
        roots[0],
        { ...roots[1], path: path.join(roots[0].path, "nested") },
      ],
    },
    {
      ...manifest,
      roots: [{ ...roots[0], path: path.parse(roots[0].path).root }],
    },
    {
      ...manifest,
      roots: [
        {
          ...roots[0],
          categories: [{ path: "../escape", category: "metadata" }],
        },
      ],
    },
    {
      ...manifest,
      roots: [
        {
          ...roots[0],
          categories: [
            { path: ".", category: "metadata" },
            { path: ".", category: "temporary" },
          ],
        },
      ],
    },
    {
      ...manifest,
      roots: [
        {
          ...roots[0],
          runs: [
            ...roots[0].runs,
            { id: "other", path: "child", state: "planned" },
          ],
        },
      ],
    },
    { ...manifest, projections: [projection(-1)] },
    { ...manifest, projections: [projection(1.1)] },
    { ...manifest, projections: [projection(Number.MAX_SAFE_INTEGER + 1)] },
    { ...manifest, projections: [projection(1, "missing")] },
  ];
  for (const candidate of cases)
    assert.throws(() => validateStorageManifest(candidate), {
      code: "INVALID_MANIFEST",
    });
  const repository = path.resolve(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  assert.throws(
    () =>
      validateStorageManifest({
        ...manifest,
        roots: [{ ...roots[0], path: repository }],
      }),
    { code: "INVALID_MANIFEST" },
  );
  assert.doesNotThrow(() =>
    validateStorageManifest({
      ...manifest,
      roots: [{ ...roots[0], path: path.join(repository, "dist") }],
    }),
  );
});

test("planned runs require absence; existing runs require directories", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0];
  root.runs = [{ id: "future", path: "future/nested", state: "planned" }];
  manifest.projections = [projection(2, "first", { runId: "future" })];
  assert.equal(
    (await createStorageReport(manifest, fast)).forecast.status,
    "within_limits",
  );
  root.runs[0].state = "existing";
  assert.ok(
    (await createStorageReport(manifest, fast)).reasons.includes(
      "RUN_STATE_MISMATCH",
    ),
  );
  root.runs = [{ id: "future", path: ".", state: "planned" }];
  assert.ok(
    (await createStorageReport(manifest, fast)).reasons.includes(
      "RUN_STATE_MISMATCH",
    ),
  );
});

test("run equality is allowed, combined retained plus temporary exceeding it is refused", async (t) => {
  const { manifest } = await fixture(t);
  manifest.projections = [
    projection(STORAGE_LIMITS.runBytes - 1, "first", { temporaryBytes: 1 }),
  ];
  assert.equal(
    (await createStorageReport(manifest, fast)).forecast.status,
    "within_limits",
  );
  manifest.projections.push(projection(1, "first", { id: "second-growth" }));
  assert.ok(
    (await createStorageReport(manifest, fast)).forecast.reasons.includes(
      "RUN_LIMIT",
    ),
  );
});

test("all roots and projections contribute to decimal managed limit", async (t) => {
  const { manifest, roots } = await fixture(t);
  manifest.roots = roots;
  // Several disjoint runs keep each projection below the separate run ceiling.
  for (const root of roots)
    root.runs = [0, 1, 2].map((n) => ({
      id: "run-" + n,
      path: "run-" + n,
      state: "planned",
    }));
  manifest.projections = roots.flatMap((root, i) =>
    root.runs.map((run, n) =>
      projection(n === 2 ? 5_000_000_000 : 10_000_000_000, root.id, {
        id: "growth-" + i + "-" + n,
        runId: run.id,
      }),
    ),
  );
  let report = await createStorageReport(manifest, fast);
  assert.equal(report.forecast.projectedManagedBytes, 50_000_000_000);
  assert.equal(report.forecast.status, "within_limits");
  manifest.projections[0].temporaryBytes = 1;
  report = await createStorageReport(manifest, fast);
  assert.ok(report.forecast.reasons.includes("MANAGED_LIMIT"));
});

test("shared filesystem uses conservative available minimum and aggregates growth", async (t) => {
  const { manifest, roots } = await fixture(t);
  manifest.roots = roots;
  manifest.projections = [
    projection(GIB),
    projection(GIB, "second", { id: "other" }),
  ];
  const io = {
    statfs: async (root) => ({
      bavail: BigInt((root === roots[0].path ? 23 : 22) * GIB),
      bsize: 1n,
    }),
  };
  assert.equal(
    (await createStorageReport(manifest, { ...fast, io })).forecast.status,
    "within_limits",
  );
  manifest.projections[0].temporaryBytes = 1;
  assert.ok(
    (
      await createStorageReport(manifest, { ...fast, io })
    ).forecast.reasons.includes("FREE_SPACE_FLOOR"),
  );
});

test("separate filesystem growth does not consume another filesystem free space", async (t) => {
  const { manifest, roots } = await fixture(t);
  manifest.roots = roots;
  manifest.projections = [
    projection(GIB),
    projection(GIB, "second", { id: "other" }),
  ];
  const io = {
    statfs: free(21 * GIB),
    lstat: async (filename, options) => {
      const value = await fs.lstat(filename, options);
      if (path.basename(filename).toLowerCase() === roots[1].id)
        value.dev += 1n;
      return value;
    },
  };
  assert.equal(
    (await createStorageReport(manifest, { ...fast, io })).forecast.status,
    "within_limits",
  );
});

test("missing and inaccessible roots are incomplete with sanitized errors", async (t) => {
  const { manifest } = await fixture(t);
  manifest.projections = [projection(1)];
  const io = {
    lstat: async () => {
      throw Object.assign(new Error("secret-person-path-and-token"), {
        code: "EACCES",
      });
    },
  };
  const report = await createStorageReport(manifest, { ...fast, io });
  assert.equal(report.status, "incomplete");
  assert.equal(report.forecast.status, "refused");
  assert.ok(report.forecast.reasons.includes("INCOMPLETE_INVENTORY"));
  assert.ok(!JSON.stringify(report).includes("secret-person"));
  manifest.roots[0].path += "-missing";
  assert.equal(
    (await createStorageReport(manifest, fast)).status,
    "incomplete",
  );
});

test("hard-linked files are refused, never counted as independent managed objects", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0].path;
  await fs.writeFile(path.join(root, "one"), "data");
  await fs.link(path.join(root, "one"), path.join(root, "two"));
  assert.ok(
    (await createStorageReport(manifest, fast)).reasons.includes("UNSAFE_LINK"),
  );
});

test("junction/symlink targets are not traversed; native Windows probe rejects them", async (t) => {
  const { manifest, roots } = await fixture(t);
  const link = path.join(roots[0].path, "link");
  await fs.writeFile(path.join(roots[1].path, "never-read"), "private");
  await fs.symlink(
    roots[1].path,
    link,
    process.platform === "win32" ? "junction" : "dir",
  );
  try {
    const report = await createStorageReport(manifest, {
      io: { statfs: free() },
    });
    assert.equal(report.status, "incomplete");
    assert.ok(report.reasons.includes("UNSAFE_LINK"));
    assert.equal(report.totalBytes, 0);
  } finally {
    await fs.unlink(link);
  }
});

test("real native guard inventories hidden literal metacharacter paths without exposing names", async (t) => {
  const { manifest } = await fixture(t);
  const nested = path.join(manifest.roots[0].path, "nested [one] $() `");
  await fs.mkdir(nested);
  const filename = path.join(nested, ".private-name [one]");
  await fs.writeFile(filename, "1234");
  if (process.platform === "win32") {
    const hidden = spawnSync(
      path.join(
        process.env.SystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$ErrorActionPreference='Stop';$p=[Console]::In.ReadToEnd();[IO.File]::SetAttributes($p,([IO.File]::GetAttributes($p)-bor [IO.FileAttributes]::Hidden))",
      ],
      { windowsHide: true, input: filename, encoding: "utf8", timeout: 30000 },
    );
    assert.equal(hidden.error, undefined);
    assert.equal(hidden.status, 0);
  }
  const report = await createStorageReport(manifest, {
    io: { statfs: free() },
  });
  assert.equal(report.status, "complete", JSON.stringify(report));
  assert.equal(report.totalBytes, 4);
  assert.ok(!JSON.stringify(report).includes("private-name"));
});

test(
  "native attribute probe rejects a file link before reading its target",
  { skip: process.platform !== "win32" },
  async (t) => {
    const { manifest, roots } = await fixture(t);
    const target = path.join(roots[1].path, "private-target");
    const link = path.join(roots[0].path, "file-link");
    await fs.writeFile(target, "must not be inventoried");
    try {
      await fs.symlink(target, link, "file");
    } catch (error) {
      if (["EPERM", "EACCES"].includes(error.code)) {
        t.skip("Host does not permit creating symbolic file links");
        return;
      }
      throw error;
    }
    try {
      let scans = 0;
      const report = await createStorageReport(manifest, {
        io: {
          statfs: free(),
          opendir: async () => {
            scans++;
            throw new Error("native guard must refuse before inventory");
          },
        },
      });
      assert.equal(report.status, "incomplete");
      assert.ok(report.reasons.includes("UNSAFE_LINK"));
      assert.equal(report.totalBytes, 0);
      assert.equal(scans, 0);
    } finally {
      await fs.unlink(link);
    }
  },
);

test(
  "native attribute traversal enforces entry and depth bounds before Node inventory",
  { skip: process.platform !== "win32" },
  async (t) => {
    const { manifest } = await fixture(t);
    const root = manifest.roots[0].path;
    await fs.mkdir(path.join(root, "nested", "deeper"), { recursive: true });
    await fs.writeFile(path.join(root, "one"), "1");
    for (const limit of [{ maxEntries: 1 }, { maxDepth: 1 }]) {
      let scans = 0;
      const report = await createStorageReport(manifest, {
        ...limit,
        io: {
          statfs: free(),
          opendir: async () => {
            scans++;
            throw new Error("native guard must refuse before inventory");
          },
        },
      });
      assert.equal(report.status, "incomplete");
      assert.ok(report.reasons.includes("INVENTORY_LIMIT"));
      assert.equal(report.totalBytes, 0);
      assert.equal(scans, 0);
    }
  },
);

test("entry and depth limits fail closed with observed partial counts", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0].path;
  await fs.writeFile(path.join(root, "a"), "a");
  await fs.writeFile(path.join(root, "b"), "b");
  assert.ok(
    (
      await createStorageReport(manifest, { ...fast, maxEntries: 1 })
    ).reasons.includes("INVENTORY_LIMIT"),
  );
  await fs.mkdir(path.join(root, "nested", "deeper"), { recursive: true });
  assert.ok(
    (
      await createStorageReport(manifest, { ...fast, maxDepth: 1 })
    ).reasons.includes("INVENTORY_LIMIT"),
  );
  await assert.rejects(
    () => createStorageReport(manifest, { maxEntries: 250001 }),
    { code: "INVALID_OPTIONS" },
  );
});

test("deadline expires without positive forecast", async (t) => {
  const { manifest } = await fixture(t);
  manifest.projections = [projection(0)];
  let ticks = 0;
  const report = await createStorageReport(manifest, {
    ...fast,
    timeoutMs: 1,
    now: () => ticks++,
  });
  assert.ok(report.reasons.includes("TIME_LIMIT"));
  assert.equal(report.forecast.status, "refused");
});

test("file metadata mutation between observations fails closed", async (t) => {
  const { manifest } = await fixture(t);
  const filename = path.join(manifest.roots[0].path, "changing");
  await fs.writeFile(filename, "abc");
  let reads = 0;
  const io = {
    statfs: free(),
    lstat: async (name, options) => {
      const value = await fs.lstat(name, options);
      if (name === filename && ++reads > 1) value.mtimeNs += 1n;
      return value;
    },
  };
  assert.ok(
    (await createStorageReport(manifest, { ...fast, io })).reasons.includes(
      "INVENTORY_CHANGED",
    ),
  );
});

test("root identity mutation and alias roots fail closed", async (t) => {
  const { manifest, roots } = await fixture(t);
  manifest.roots = roots;
  const first = await fs.lstat(roots[0].path, { bigint: true });
  let opens = 0;
  const io = {
    lstat: async (name, options) => {
      const value = await fs.lstat(name, options);
      if (name === roots[1].path) {
        value.dev = first.dev;
        value.ino = first.ino;
      }
      return value;
    },
    opendir: async () => {
      opens++;
      throw new Error("must not scan");
    },
  };
  const report = await createStorageReport(manifest, { ...fast, io });
  assert.ok(report.reasons.includes("ROOT_ALIAS"));
  assert.equal(opens, 0);
});

test("unsafe numeric disk and forecast totals are never serialized imprecisely", async (t) => {
  const { manifest } = await fixture(t);
  const disk = await createStorageReport(manifest, {
    ...fast,
    io: {
      statfs: async () => ({
        bavail: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        bsize: 1n,
      }),
    },
  });
  assert.ok(disk.reasons.includes("NUMERIC_OVERFLOW"));
  assert.equal(disk.roots[0].disk.availableBytes, null);
  manifest.projections = [
    projection(Number.MAX_SAFE_INTEGER, "first", { temporaryBytes: 1 }),
  ];
  const report = await createStorageReport(manifest, fast);
  assert.equal(report.forecast.projectedManagedBytes, null);
  assert.equal(report.forecast.status, "refused");
  assert.ok(report.forecast.reasons.includes("NUMERIC_OVERFLOW"));
});

test("unavailable disk statistics make the whole report incomplete", async (t) => {
  const { manifest } = await fixture(t);
  manifest.projections = [projection(0)];
  const report = await createStorageReport(manifest, {
    ...fast,
    io: {
      statfs: async () => {
        throw new Error("sensitive volume failure");
      },
    },
  });
  assert.equal(report.status, "incomplete");
  assert.equal(report.forecast.status, "refused");
  assert.equal(report.roots[0].disk, null);
  assert.ok(!JSON.stringify(report).includes("sensitive"));
});

test("existing run bytes count against projected run and managed totals", async (t) => {
  const { manifest } = await fixture(t);
  await fs.writeFile(path.join(manifest.roots[0].path, "retained"), "x");
  manifest.projections = [projection(STORAGE_LIMITS.runBytes)];
  const report = await createStorageReport(manifest, fast);
  assert.equal(
    report.forecast.projectedManagedBytes,
    STORAGE_LIMITS.runBytes + 1,
  );
  assert.ok(report.forecast.reasons.includes("RUN_LIMIT"));
});

test("cross-device entries and special files refuse the inventory", async (t) => {
  const { manifest } = await fixture(t);
  const filename = path.join(manifest.roots[0].path, "entry");
  await fs.writeFile(filename, "x");
  for (const kind of ["device", "special"]) {
    const io = {
      statfs: free(),
      lstat: async (name, options) => {
        const value = await fs.lstat(name, options);
        if (name === filename) {
          if (kind === "device") value.dev += 1n;
          else value.isFile = () => false;
        }
        return value;
      },
    };
    const report = await createStorageReport(manifest, { ...fast, io });
    assert.ok(
      report.reasons.includes(
        kind === "device" ? "UNSAFE_LINK" : "UNSAFE_FILE_TYPE",
      ),
    );
  }
});

test("directory changes and planned-run appearance during inventory are incomplete", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0].path;
  let observations = 0;
  const io = {
    statfs: free(),
    lstat: async (name, options) => {
      const value = await fs.lstat(name, options);
      if (name === root && ++observations > 2) value.mtimeNs += 1n;
      return value;
    },
  };
  assert.ok(
    (await createStorageReport(manifest, { ...fast, io })).reasons.includes(
      "INVENTORY_CHANGED",
    ),
  );
  manifest.roots[0].runs = [{ id: "run", path: "future", state: "planned" }];
  let probes = 0;
  const report = await createStorageReport(manifest, {
    ...fast,
    probeWindows: async () => {
      if (++probes === 1) await fs.mkdir(path.join(root, "future"));
    },
  });
  assert.ok(report.reasons.includes("INVENTORY_CHANGED"));
});

test("available space decrease during traversal is retained conservatively", async (t) => {
  const { manifest } = await fixture(t);
  manifest.projections = [projection(GIB)];
  let calls = 0;
  const report = await createStorageReport(manifest, {
    ...fast,
    io: {
      statfs: async () => ({
        bavail: BigInt((++calls === 1 ? 22 : 20) * GIB),
        bsize: 1n,
      }),
    },
  });
  assert.equal(report.roots[0].disk.availableBytes, 20 * GIB);
  assert.ok(report.forecast.reasons.includes("FREE_SPACE_FLOOR"));
});

test("canonical protected roots and alternate root spellings fail before traversal", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0].path;
  const repository = path.resolve(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  for (const target of [
    repository,
    os.homedir(),
    path.join(path.dirname(root), "canonical-other"),
  ]) {
    let scans = 0;
    const io = {
      realpath: async (name) => (name === root ? target : fs.realpath(name)),
      opendir: async () => {
        scans++;
        throw new Error("must not scan");
      },
    };
    const report = await createStorageReport(manifest, { ...fast, io });
    assert.equal(report.status, "incomplete");
    assert.ok(
      report.reasons.includes(
        target === repository || target === os.homedir()
          ? "PROTECTED_ROOT"
          : "ROOT_ALIAS",
      ),
    );
    assert.equal(scans, 0);
  }
});

test("run and category aliases cannot make retained bytes disappear from accounting", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0];
  const actual = path.join(root.path, "retained-run");
  const alias = path.join(root.path, "run-short");
  await fs.mkdir(actual);
  await fs.writeFile(path.join(actual, "retained"), "x");
  const io = {
    statfs: free(),
    lstat: (name, options) => fs.lstat(name === alias ? actual : name, options),
    realpath: (name) => fs.realpath(name === alias ? actual : name),
  };
  root.runs = [{ id: "run", path: "run-short", state: "existing" }];
  manifest.projections = [projection(STORAGE_LIMITS.runBytes)];
  let report = await createStorageReport(manifest, { ...fast, io });
  assert.ok(report.reasons.includes("PATH_ALIAS"));
  assert.equal(report.forecast.status, "refused");
  root.runs[0].path = "retained-run";
  report = await createStorageReport(manifest, { ...fast, io });
  assert.equal(report.roots[0].runs[0].bytes, 1);
  assert.ok(report.forecast.reasons.includes("RUN_LIMIT"));
  root.categories = [{ path: "run-short", category: "originals" }];
  assert.ok(
    (await createStorageReport(manifest, { ...fast, io })).reasons.includes(
      "PATH_ALIAS",
    ),
  );
});

test("alias-prone path components are rejected before filesystem access", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0];
  for (const part of [
    ".",
    "..",
    "trailing.",
    "trailing ",
    "CON",
    "aux.txt",
    "LPT1",
    "COM¹.txt",
    "CONOUT$",
  ]) {
    if (process.platform === "win32") {
      const candidate = {
        ...manifest,
        roots: [
          { ...root, path: root.path + path.sep + part + path.sep + "child" },
        ],
      };
      assert.throws(() => validateStorageManifest(candidate), {
        code: "INVALID_MANIFEST",
      });
    }
    assert.throws(
      () =>
        validateStorageManifest({
          ...manifest,
          roots: [
            {
              ...root,
              categories: [{ path: part + "/child", category: "metadata" }],
            },
          ],
        }),
      { code: "INVALID_MANIFEST" },
    );
    assert.throws(
      () =>
        validateStorageManifest({
          ...manifest,
          roots: [
            {
              ...root,
              runs: [{ id: "run", path: part + "/child", state: "planned" }],
            },
          ],
        }),
      { code: "INVALID_MANIFEST" },
    );
  }
});

test("only documented repository artifact namespaces are admitted", async (t) => {
  const { manifest } = await fixture(t);
  const root = manifest.roots[0];
  const repository = path.resolve(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  for (const relativePath of [
    "dist",
    ".cache",
    ".cache/ps09-ev-01",
    "generated-data/real-source-prerelease",
  ]) {
    assert.doesNotThrow(() =>
      validateStorageManifest({
        ...manifest,
        roots: [{ ...root, path: path.join(repository, relativePath) }],
      }),
    );
  }
  for (const relativePath of [
    "src",
    "generated-data",
    "generated-data/other",
    "generated-data/real-source-prerelease-other",
    ".cache-other",
  ]) {
    const protectedPath = path.join(repository, relativePath);
    assert.throws(
      () =>
        validateStorageManifest({
          ...manifest,
          roots: [{ ...root, path: protectedPath }],
        }),
      { code: "INVALID_MANIFEST" },
    );
    let scans = 0;
    const report = await createStorageReport(manifest, {
      ...fast,
      io: {
        realpath: (name) =>
          name === root.path ? protectedPath : fs.realpath(name),
        opendir: async () => {
          scans++;
          throw new Error("must not scan");
        },
      },
    });
    assert.ok(report.reasons.includes("PROTECTED_ROOT"));
    assert.equal(scans, 0);
  }
});

test(
  "native probe failures never produce a complete inventory or positive forecast",
  { skip: process.platform !== "win32" },
  async (t) => {
    const { manifest } = await fixture(t);
    manifest.projections = [projection(0)];
    for (const mode of [
      "spawn",
      "bad-nonce",
      "malformed",
      "oversized",
      "stderr-oversized",
      "stderr",
      "child-error",
      "stdout-error",
      "stderr-error",
      "stdin-error",
      "stdin-lost",
      "nonzero",
      "signal",
      "timeout",
    ]) {
      let spawned = 0;
      const spawnProbe = (_executable, _args, options) => {
        spawned++;
        assert.equal(options.windowsHide, true);
        assert.deepEqual(options.stdio, ["pipe", "pipe", "pipe"]);
        if (mode === "spawn") throw new Error("sensitive native failure");
        const child = new EventEmitter();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.stdin = new EventEmitter();
        child.kill = () => true;
        child.stdin.end = (json, callback) => {
          const request = JSON.parse(json);
          process.nextTick(() => {
            if (mode !== "stdin-lost") callback();
            if (mode === "timeout") return;
            if (mode === "child-error")
              child.emit("error", new Error("sensitive spawn"));
            else if (mode === "stdin-error")
              child.stdin.emit("error", new Error("sensitive stdin"));
            else if (mode === "stdout-error")
              child.stdout.emit("error", new Error("sensitive stdout"));
            else if (mode === "stderr-error")
              child.stderr.emit("error", new Error("sensitive stderr"));
            else if (mode === "oversized")
              child.stdout.write(Buffer.alloc(1025));
            else if (mode === "stderr-oversized")
              child.stderr.write(Buffer.alloc(1025));
            else if (mode === "stderr")
              child.stderr.write("sensitive native error");
            else
              child.stdout.write(
                mode === "malformed"
                  ? "{"
                  : JSON.stringify({
                      nonce: mode === "bad-nonce" ? "wrong" : request.nonce,
                      complete: true,
                      entries: 0,
                    }),
              );
            child.emit(
              "close",
              mode === "nonzero" ? 44 : 0,
              mode === "signal" ? "SIGTERM" : null,
            );
          });
        };
        return child;
      };
      const report = await createStorageReport(manifest, {
        io: { statfs: free() },
        spawnProbe,
        timeoutMs: 100,
      });
      assert.equal(report.status, "incomplete", mode);
      assert.equal(spawned, 1, mode);
      assert.ok(
        report.reasons.includes(
          mode === "stdin-lost" || mode === "timeout"
            ? "TIME_LIMIT"
            : "WINDOWS_PROBE_FAILED",
        ),
        mode,
      );
      assert.equal(report.forecast.status, "refused", mode);
      assert.ok(!JSON.stringify(report).includes("sensitive"), mode);
    }
  },
);
