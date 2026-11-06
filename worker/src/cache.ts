/**
 * The Worker's one Cache API helper, for policy reads, related records, court
 * lookups and related bills. Only a validated public identity becomes a key;
 * search words never do. A cache failure never fails the answer.
 */
import type { Env } from "./sources/shared";

const CACHE_TTL = 86_400;

/** Cache an allowlisted answer by a validated identity. */
export async function cachedJson<T>(
  env: Env,
  namespace: string,
  identity: string,
  produce: () => Promise<T>,
): Promise<T> {
  // Version-scoped so a guard tightened by a deploy is never served from an older entry.
  const version = env.CF_VERSION_METADATA?.id ?? "local";
  const key = new Request(
    `https://cache.policy-sentinel-demo.invalid/${encodeURIComponent(version)}/${namespace}/${encodeURIComponent(identity)}`,
  );
  let store: Cache | undefined;
  try {
    store =
      typeof caches === "undefined"
        ? undefined
        : (caches as unknown as { default?: Cache }).default;
    const hit = await store?.match(key);
    if (hit) return (await hit.json()) as T;
  } catch {
    // Retrieval stays available when the cache cannot be read.
  }
  const value = await produce();
  try {
    await store?.put(
      key,
      new Response(JSON.stringify(value), {
        headers: {
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
          "Content-Type": "application/json",
        },
      }),
    );
  } catch {
    // A completed official-source read is useful even when caching fails.
  }
  return value;
}
