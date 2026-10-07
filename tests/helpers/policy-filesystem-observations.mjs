import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";

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
