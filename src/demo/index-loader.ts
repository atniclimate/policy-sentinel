/**
 * Loads one static index shard listed in the manifest bundled at demo:build
 * (index conditions C3, D2 to D4). Same-origin static files only: the path
 * must be a manifest path under ./demo-data/. The fetched bytes are hashed
 * with the pure SHA-256 and compared with the manifest; a mismatch or a fetch
 * failure gives index_unavailable, which the page shows with the live link.
 */
import { sha256Hex } from "../engine/pure-sha256.mjs";
import { chain } from "./copy/chain.ts";
import type { IndexFile, IndexManifest } from "./index-types.ts";

export type ShardResult<T> =
  | {
      readonly state: "current" | "retained_after_failed_refresh";
      readonly file: IndexFile;
      readonly data: T;
    }
  | {
      readonly state: "unavailable" | "withdrawn" | "index_unavailable";
      readonly file: IndexFile | null;
    };

export interface IndexLoader {
  load<T>(path: string): Promise<ShardResult<T>>;
}

export const DEMO_DATA_BASE = "./demo-data/";
// Condition A1: only these directories, one level deep, .json files. The
// schema's chapter names may hold capitals ("title-42-ch-55A").
const PATH_RE = /^(?:vocab|cfr|usc)\/[A-Za-z0-9-]+\.json$/;
const MAX_SHARD_BYTES = 1_572_864; // demo-index.schema.v1.json

export function createIndexLoader(
  manifest: IndexManifest,
  options: { fetch?: typeof fetch; base?: string } = {},
): IndexLoader {
  const fetchImpl = options.fetch ?? ((url, init) => fetch(url, init));
  const base = options.base ?? DEMO_DATA_BASE;
  const cache = new Map<string, Promise<ShardResult<unknown>>>();

  async function read(path: string): Promise<ShardResult<unknown>> {
    const file = manifest.files.find((f) => f.path === path) ?? null;
    if (!file || file.status === "unavailable")
      return { state: "unavailable", file };
    if (file.status === "withdrawn") return { state: "withdrawn", file };
    const failed = { state: "index_unavailable", file } as const;
    const size = file.sizeBytes;
    if (
      !PATH_RE.test(path) ||
      !file.sha256 ||
      size === null ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > MAX_SHARD_BYTES
    )
      return failed;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetchImpl(base + path, {
        mode: "same-origin",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        void res.body?.cancel().catch(() => undefined);
        return failed;
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      const reader = res.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.byteLength > size - offset) {
            void reader.cancel().catch(() => undefined);
            return failed;
          }
          bytes.set(value, offset);
          offset += value.byteLength;
        }
      } finally {
        reader.releaseLock();
      }
      if (offset !== size || sha256Hex(bytes) !== file.sha256) return failed;
      const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
      return { state: file.status, file, data };
    } catch {
      return failed;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    load<T>(path: string) {
      let pending = cache.get(path);
      if (!pending) {
        pending = read(path);
        cache.set(path, pending);
        // A failed fetch may be tried again on the next open.
        void pending.then((r) => {
          if (r.state === "index_unavailable") cache.delete(path);
        });
      }
      return pending as Promise<ShardResult<T>>;
    },
  };
}

/**
 * The sentence the page shows, with the live link, in place of a shard's
 * rows; null when the rows show (their own as-of and stale sentence carry the
 * rest, including a retained file's original as-of).
 */
export function shardNotice(result: ShardResult<unknown>): string | null {
  switch (result.state) {
    case "current":
    case "retained_after_failed_refresh":
      return null;
    case "unavailable":
      return chain.notYetAvailable;
    case "withdrawn":
      return chain.withdrawn(result.file?.withdrawnOn ?? chain.dateNotStated);
    case "index_unavailable":
      return chain.indexUnavailable;
  }
}
