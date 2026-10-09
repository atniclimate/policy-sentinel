import type { AnalyzedCorpus } from "../pipeline/analyzed-corpus-v2.mjs";
import type { SearchProjectionManifest } from "../modules/output/local-workbench/search-projection.mjs";

const MAX_CORPUS_BYTES = 128 * 1024 ** 2;
const MAX_PROJECTION_BYTES = 8 * 1024 ** 2;
const digestPattern = /^[a-f0-9]{64}$/;
const fetchOptions = {
  credentials: "omit",
  cache: "no-store",
  redirect: "error",
} as const;
const decode = (bytes: Uint8Array) =>
  JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
const hash = async (bytes: Uint8Array<ArrayBuffer>) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

async function boundedBytes(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = response.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) > maxBytes)
  )
    throw new Error("Local response exceeds byte ceiling");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Local response body unavailable");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error("Local response exceeds byte ceiling");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function pinnedFile(
  path: string,
  size: number,
  digest: string,
  label: string,
) {
  const response = await fetch(path, fetchOptions);
  if (
    !response.ok ||
    response.headers.get("content-length") === null ||
    Number(response.headers.get("content-length")) !== size
  )
    throw new Error(`Local ${label} unavailable`);
  const bytes = await boundedBytes(response, size);
  if (bytes.byteLength !== size || (await hash(bytes)) !== digest)
    throw new Error(`Local ${label} checksum mismatch`);
  return bytes;
}

export interface PolicyLocalBundle {
  readonly corpus: AnalyzedCorpus;
  readonly projection: SearchProjectionManifest | null;
}

/** Loads the corpus and optional bounded-search scope from the sealed loopback output. */
export async function loadPolicyLocalBundle(): Promise<PolicyLocalBundle> {
  if (location.hostname !== "127.0.0.1" || location.protocol !== "http:")
    throw new Error("Local loopback profile required");
  const response = await fetch("./local-profile.json", fetchOptions);
  if (!response.ok) throw new Error("Local profile unavailable");
  const profile = decode(await boundedBytes(response, 64 * 1024));
  if (
    !profile ||
    profile.kind !== "policy_local_profile" ||
    profile.schemaVersion !== "1.0.0" ||
    profile.trustDomain !== "real_source_local" ||
    profile.corpusFile !== "corpus.json" ||
    profile.publication !== "closed" ||
    !digestPattern.test(profile.corpusDigest) ||
    !digestPattern.test(profile.corpusFileDigest) ||
    !Number.isSafeInteger(profile.corpusBytes) ||
    profile.corpusBytes < 1 ||
    profile.corpusBytes > MAX_CORPUS_BYTES ||
    Object.keys(profile).some(
      (key) =>
        ![
          "kind",
          "schemaVersion",
          "trustDomain",
          "corpusDigest",
          "corpusFile",
          "corpusFileDigest",
          "corpusBytes",
          "publication",
          "searchProjection",
        ].includes(key),
    )
  )
    throw new Error("Invalid local profile");
  const descriptor = profile.searchProjection;
  if (
    descriptor !== undefined &&
    (!descriptor ||
      descriptor.file !== "search-projection.json" ||
      !digestPattern.test(descriptor.fileDigest) ||
      !digestPattern.test(descriptor.parentCorpusDigest) ||
      !Number.isSafeInteger(descriptor.bytes) ||
      descriptor.bytes < 1 ||
      descriptor.bytes > MAX_PROJECTION_BYTES ||
      Object.keys(descriptor).some(
        (key) =>
          !["file", "fileDigest", "bytes", "parentCorpusDigest"].includes(key),
      ))
  )
    throw new Error("Invalid local projection profile");
  const corpus = decode(
    await pinnedFile(
      "./corpus.json",
      profile.corpusBytes,
      profile.corpusFileDigest,
      "corpus",
    ),
  ) as AnalyzedCorpus;
  if (
    corpus.kind !== "analyzed_corpus" ||
    !["2.0.0", "2.1.0"].includes(corpus.schemaVersion) ||
    (corpus.schemaVersion === "2.1.0" &&
      corpus.$schema !==
        "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.1.json") ||
    corpus.trustDomain !== "real_source_local" ||
    corpus.contentDigest !== profile.corpusDigest
  )
    throw new Error("Local corpus identity mismatch");
  if (descriptor === undefined) return { corpus, projection: null };
  const projection = decode(
    await pinnedFile(
      "./search-projection.json",
      descriptor.bytes,
      descriptor.fileDigest,
      "projection",
    ),
  ) as SearchProjectionManifest;
  // Selection correctness is replayed against the reviewed parent by readLocalOutput.
  // Here the profile pins the exact sidecar bytes and its delivered corpus identity.
  if (
    !projection ||
    projection.kind !== "bounded_search_projection" ||
    projection.schemaVersion !== "1.0.0" ||
    projection.ruleVersion !== "whole-work-evidence-closure/1" ||
    projection.parentCorpusDigest !== descriptor.parentCorpusDigest ||
    projection.corpusDigest !== corpus.contentDigest ||
    projection.fileDigest !== profile.corpusFileDigest ||
    projection.bytes !== profile.corpusBytes ||
    !digestPattern.test(projection.contentDigest) ||
    !Array.isArray(projection.coverage) ||
    !Array.isArray(projection.limitations) ||
    !projection.selection ||
    projection.selection.dateBasis !== "publication_overlap" ||
    !Array.isArray(projection.selection.sourceProfileIds) ||
    !projection.selection.sourceProfileIds.length ||
    JSON.stringify(projection.retainedVersionIds) !==
      JSON.stringify(corpus.versions.map((row) => row.id).sort()) ||
    JSON.stringify(projection.retainedSegmentIds) !==
      JSON.stringify(corpus.segments.map((row) => row.id).sort())
  )
    throw new Error("Local projection identity mismatch");
  return { corpus, projection };
}

/** Compatibility entry point for callers that need only the delivered corpus. */
export async function loadPolicyLocalCorpus(): Promise<AnalyzedCorpus> {
  return (await loadPolicyLocalBundle()).corpus;
}
