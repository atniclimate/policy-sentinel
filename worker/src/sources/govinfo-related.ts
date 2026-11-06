/**
 * GovInfo related records, expanded only when a person presses for them
 * (design T1.3): one keyed call per press, cached in the Worker by the
 * validated access id. Each relation keeps GovInfo's own name for it and is
 * shown under "Stated by the source" (basis `source_field`). Only the
 * allowlisted fields below reach the cache or the page.
 */
import { hasPersonalPattern } from "../../../src/demo/personal-guard";
import {
  DemoError,
  badUpstream,
  cleanText,
  isoDate,
  metadataId,
  officialFetch,
  parseJson,
  record,
  requiredText,
  spendKey,
} from "./shared";
import type { Env } from "./shared";
import type {
  GovInfoRelation,
  GovInfoRelatedRecords,
  GovInfoRelations,
  RelatedRecord,
} from "../../../src/demo/types";

// The answer shapes are the shared version 3 contract in src/demo/types.ts.
export type {
  GovInfoRelation,
  GovInfoRelatedRecords,
  GovInfoRelations,
  RelatedRecord,
} from "../../../src/demo/types";

export const HOSTS: readonly string[] = ["api.govinfo.gov"];

const CACHE_TTL = 86_400;
const CACHE_VERSION = "demo-related-1";
const ACCESS_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const COLLECTION = /^[A-Z]{2,12}$/;
/** Records shown per press; the total GovInfo lists is stated beside them. */
export const MAX_RELATED = 20;

/**
 * Cache an allowlisted answer by a validated identity. Search words never
 * become a key. A cache failure never fails the answer. Shared by the court
 * and Congress.gov related adapters.
 */
export async function cachedJson<T>(
  namespace: string,
  identity: string,
  produce: () => Promise<T>,
): Promise<T> {
  const key = new Request(
    `https://cache.policy-sentinel-demo.invalid/${namespace}/${CACHE_VERSION}/${encodeURIComponent(identity)}`,
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

function checkInput(accessId: string, collection?: string): void {
  if (
    !ACCESS_ID.test(accessId) ||
    (collection !== undefined && !COLLECTION.test(collection))
  )
    throw new DemoError(
      "bad_query",
      "That GovInfo identifier is not valid.",
      400,
    );
}

async function fetchRelated(env: Env, path: string): Promise<unknown | null> {
  const key = await spendKey(env);
  const { response, bytes } = await officialFetch(
    `https://api.govinfo.gov/related/${path}`,
    { headers: { "X-Api-Key": key } },
  );
  // GovInfo answers 404 for a record it lists nothing related to.
  if (response.status === 404) return null;
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `GovInfo answered with status ${response.status}.`,
    );
  return parseJson(bytes);
}

function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw badUpstream();
  return value;
}

/** The relations GovInfo lists for one package or granule, by name. */
export async function related(
  env: Env,
  accessId: string,
): Promise<GovInfoRelations> {
  checkInput(accessId);
  return cachedJson("govinfo-related", accessId, async () => {
    const data = await fetchRelated(env, encodeURIComponent(accessId));
    const relations: GovInfoRelation[] = [];
    if (data !== null) {
      for (const value of list(record(data).relationships, 50)) {
        const row = record(value);
        const relation = requiredText(row.relationship, 120);
        const collection = row.collection;
        if (typeof collection !== "string" || !COLLECTION.test(collection))
          throw badUpstream();
        if (
          !relations.some(
            (r) => r.relation === relation && r.collection === collection,
          )
        )
          relations.push({ relation, collection });
      }
    }
    return {
      ok: true,
      source: "govinfo",
      basis: "source_field",
      accessId,
      relations,
      retrievedAt: new Date().toISOString(),
    };
  });
}

/** The records GovInfo lists under one relation's collection. */
export async function relatedIn(
  env: Env,
  accessId: string,
  collection: string,
): Promise<GovInfoRelatedRecords> {
  checkInput(accessId, collection);
  return cachedJson(
    "govinfo-related",
    `${accessId}/${collection}`,
    async () => {
      const data = await fetchRelated(
        env,
        `${encodeURIComponent(accessId)}/${collection}`,
      );
      const rows = data === null ? [] : list(record(data).results, 500);
      const records = rows.slice(0, MAX_RELATED).map((value): RelatedRecord => {
        const row = record(value);
        const packageId = metadataId(row.packageId);
        const id =
          row.granuleId === undefined || row.granuleId === null
            ? packageId
            : `${packageId}/${metadataId(row.granuleId)}`;
        const title = cleanText(row.title, 400);
        return {
          identifier: id,
          title: title && !hasPersonalPattern(title) ? title : null,
          date: isoDate(row.dateIssued),
          officialUrl: `https://www.govinfo.gov/app/details/${id}`,
        };
      });
      return {
        ok: true,
        source: "govinfo",
        basis: "source_field",
        accessId,
        collection,
        records,
        total: rows.length,
        retrievedAt: new Date().toISOString(),
      };
    },
  );
}
