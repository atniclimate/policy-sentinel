import { createHash, webcrypto } from "node:crypto";
import { vi } from "vitest";

export function bindFixtureAssets(
  documents: Map<string, unknown>,
  prefix = "",
) {
  vi.stubGlobal("crypto", webcrypto);
  const manifest = documents.get(`${prefix}manifest.json`) as
    { assets?: unknown[] } | undefined;
  if (!manifest || "assets" in manifest) return;
  manifest.assets = [...documents]
    .filter(([path]) => path !== `${prefix}manifest.json`)
    .map(([path, value]) => ({
      path: path.slice(prefix.length),
      sha256: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
    }));
}
