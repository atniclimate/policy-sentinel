import type { AnalyzedCorpusV2 } from "../pipeline/analyzed-corpus-v2.mjs";

/** Loads only the checksum-pinned projection validated by the explicit local build. */
export async function loadPolicyLocalCorpus(): Promise<AnalyzedCorpusV2> {
  if (location.hostname !== "127.0.0.1" || location.protocol !== "http:")
    throw new Error("Local loopback profile required");
  const profileResponse = await fetch("./local-profile.json", {
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
  });
  if (!profileResponse.ok) throw new Error("Local profile unavailable");
  const profile = await profileResponse.json();
  if (
    profile.kind !== "policy_local_profile" ||
    profile.schemaVersion !== "1.0.0" ||
    profile.trustDomain !== "real_source_local" ||
    profile.corpusFile !== "corpus.json" ||
    profile.publication !== "closed" ||
    !/^[a-f0-9]{64}$/.test(profile.corpusFileDigest) ||
    !Number.isSafeInteger(profile.corpusBytes) ||
    profile.corpusBytes > 128 * 1024 ** 2
  )
    throw new Error("Invalid local profile");
  const response = await fetch("./corpus.json", {
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
  });
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) !== profile.corpusBytes
  )
    throw new Error("Local corpus unavailable");
  const bytes = await response.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (
    bytes.byteLength !== profile.corpusBytes ||
    hash !== profile.corpusFileDigest
  )
    throw new Error("Local corpus checksum mismatch");
  const corpus = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as AnalyzedCorpusV2;
  if (
    corpus.kind !== "analyzed_corpus" ||
    corpus.schemaVersion !== "2.0.0" ||
    corpus.trustDomain !== "real_source_local" ||
    corpus.contentDigest !== profile.corpusDigest
  )
    throw new Error("Local corpus identity mismatch");
  return corpus;
}
