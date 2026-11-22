import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

// Child-process custody tests need a real volume with the production reserve.
export async function createCustodyTestDirectory(t) {
  const parent =
    process.env.POLICY_SENTINEL_TEST_CUSTODY_PARENT ??
    dirname(resolve(import.meta.dirname, "../.."));
  assert.ok(isAbsolute(parent), "Test custody parent must be absolute");
  const prefix = join(resolve(parent), "policy-custody-test-");
  const directory = await fs.mkdtemp(prefix);
  t.after(async () => {
    assert.ok(resolve(directory).startsWith(prefix));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}

// Test-process observations only: writes, traversal, checksums and custody remain
// real. Call from serial tests; restore both default and named builtin exports.
export function mockPolicyFilesystem(
  t,
  { availableBytes, fileSizes = new Map() },
) {
  const capacity = t.mock.method(fs, "statfs", async () => ({
    bavail: availableBytes,
    bsize: 1,
  }));
  const originalLstat = fs.lstat;
  const sizes = fileSizes.size
    ? t.mock.method(fs, "lstat", async (path, ...options) => {
        const result = await originalLstat(path, ...options);
        if (fileSizes.has(path)) result.size = fileSizes.get(path);
        return result;
      })
    : null;
  syncBuiltinESMExports();
  t.after(() => {
    capacity.mock.restore();
    sizes?.mock.restore();
    syncBuiltinESMExports();
  });
}
