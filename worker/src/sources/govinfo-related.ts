/**
 * GovInfo related records, expanded only when a person presses for them
 * (design T1.3): one keyed call per press, cached in the Worker by the
 * validated access id. Each relation keeps GovInfo's own name for it and is
 * shown under "Stated by the source" (basis `source_field`). Only the
 * allowlisted fields below reach the cache or the page.
 */
import { cachedJson } from "../cache";
import {
  DemoError,
  badUpstream,
  officialFetch,
  parseJson,
  record,
  requiredText,
  spendKey,
} from "./shared";
import type { Env } from "./shared";
import type {
  GovInfoRelation,
  GovInfoRelations,
} from "../../../src/demo/types";

// The answer shapes are the shared version 3 contract in src/demo/types.ts.
export type {
  GovInfoRelation,
  GovInfoRelations,
} from "../../../src/demo/types";

export const HOSTS: readonly string[] = ["api.govinfo.gov"];

const ACCESS_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const COLLECTION = /^[A-Z]{2,12}$/;
/** Records shown per press; the total the source lists is stated beside them. */
export const MAX_RELATED = 20;

function checkInput(accessId: string): void {
  if (!ACCESS_ID.test(accessId))
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
  return cachedJson(env, "govinfo-related", accessId, async () => {
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
