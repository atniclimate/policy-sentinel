import { createHash, webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPolicyLocalBundle,
  loadPolicyLocalCorpus,
} from "../../src/app/policy-local-loader";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
const response = (text: string, declared = byteLength(text)) =>
  new Response(text, { headers: { "content-length": String(declared) } });

function fixture(projected = false, schemaVersion = "2.0.0") {
  const corpus = {
    kind: "analyzed_corpus",
    schemaVersion,
    ...(schemaVersion === "2.1.0"
      ? {
          $schema:
            "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.1.json",
          works: [{ id: "work-a", jurisdictionRefs: [] }],
        }
      : {}),
    trustDomain: "real_source_local",
    contentDigest: "a".repeat(64),
    versions: [{ id: "version-a" }],
    segments: [{ id: "segment-a" }],
  };
  const corpusText = JSON.stringify(corpus);
  const projection = {
    kind: "bounded_search_projection",
    schemaVersion: "1.0.0",
    ruleVersion: "whole-work-evidence-closure/1",
    parentCorpusDigest: "b".repeat(64),
    corpusDigest: corpus.contentDigest,
    fileDigest: hash(corpusText),
    bytes: byteLength(corpusText),
    selection: {
      sourceProfileIds: ["profile-a"],
      from: null,
      through: null,
      maxBytes: 128 * 1024 ** 2,
      dateBasis: "publication_overlap",
    },
    directlySelectedVersionIds: ["version-a"],
    retainedVersionIds: ["version-a"],
    retainedSegmentIds: ["segment-a"],
    excludedVersionIds: [],
    omittedRelationshipIds: [],
    omittedAnalysisIds: [],
    omittedFindingIds: [],
    coverage: [],
    limitations: [],
    contentDigest: "c".repeat(64),
  };
  const projectionText = JSON.stringify(projection);
  const profile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: hash(corpusText),
    corpusBytes: byteLength(corpusText),
    publication: "closed",
    ...(projected
      ? {
          searchProjection: {
            file: "search-projection.json",
            fileDigest: hash(projectionText),
            bytes: byteLength(projectionText),
            parentCorpusDigest: projection.parentCorpusDigest,
          },
        }
      : {}),
  };
  const bodies = new Map([
    ["./local-profile.json", JSON.stringify(profile)],
    ["./corpus.json", corpusText],
    ["./search-projection.json", projectionText],
  ]);
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    expect(options?.credentials).toBe("omit");
    return response(bodies.get(path) ?? "");
  });
  vi.stubGlobal("fetch", fetchMock);
  return { corpus, projection, profile, bodies, fetchMock };
}

beforeEach(() => {
  vi.stubGlobal("location", { hostname: "127.0.0.1", protocol: "http:" });
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => vi.unstubAllGlobals());

describe("sealed local corpus bundle loader", () => {
  it.each([false, true])(
    "loads only the known 2.1 successor through the existing sealed profile (projected=%s)",
    async (projected) => {
      const current = fixture(projected, "2.1.0");
      await expect(loadPolicyLocalBundle()).resolves.toEqual({
        corpus: current.corpus,
        projection: projected ? current.projection : null,
      });
      const unknown = fixture(projected, "2.2.0");
      await expect(loadPolicyLocalBundle()).rejects.toThrow(
        "Local corpus identity mismatch",
      );
      expect(unknown.fetchMock).toHaveBeenCalledTimes(2);
      const badSchema = fixture(projected, "2.1.0");
      const text = JSON.stringify({
        ...badSchema.corpus,
        $schema: "https://example.invalid/unreviewed-schema.json",
      });
      badSchema.bodies.set("./corpus.json", text);
      Object.assign(badSchema.profile, {
        corpusFileDigest: hash(text),
        corpusBytes: byteLength(text),
      });
      badSchema.bodies.set(
        "./local-profile.json",
        JSON.stringify(badSchema.profile),
      );
      await expect(loadPolicyLocalBundle()).rejects.toThrow(
        "Local corpus identity mismatch",
      );
    },
  );
  it("preserves legacy corpus-only profiles and wrapper behavior", async () => {
    const current = fixture();
    await expect(loadPolicyLocalBundle()).resolves.toEqual({
      corpus: current.corpus,
      projection: null,
    });
    await expect(loadPolicyLocalCorpus()).resolves.toEqual(current.corpus);
    expect(current.fetchMock.mock.calls.map((call) => call[0])).not.toContain(
      "./search-projection.json",
    );
    for (const call of current.fetchMock.mock.calls)
      expect(call[1]).toEqual({
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      });
  });

  it("loads the checksum-bound projection and exact retained evidence identities", async () => {
    const current = fixture(true);
    await expect(loadPolicyLocalBundle()).resolves.toEqual({
      corpus: current.corpus,
      projection: current.projection,
    });
    expect(current.fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects non-loopback delivery before making requests", async () => {
    const current = fixture();
    vi.stubGlobal("location", { hostname: "localhost", protocol: "http:" });
    await expect(loadPolicyLocalBundle()).rejects.toThrow(
      "Local loopback profile required",
    );
    expect(current.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized, negative or unpinned sidecar profiles before fetching content", async () => {
    for (const descriptor of [
      { bytes: 8 * 1024 ** 2 + 1 },
      { bytes: -1 },
      { file: "../secret.json" },
      { fileDigest: "invalid" },
    ]) {
      const current = fixture(true);
      Object.assign(current.profile.searchProjection!, descriptor);
      current.bodies.set(
        "./local-profile.json",
        JSON.stringify(current.profile),
      );
      await expect(loadPolicyLocalBundle()).rejects.toThrow(
        "Invalid local projection profile",
      );
      expect(current.fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("retains the 128 MiB corpus ceiling", async () => {
    const current = fixture();
    current.profile.corpusBytes = 128 * 1024 ** 2 + 1;
    current.bodies.set("./local-profile.json", JSON.stringify(current.profile));
    await expect(loadPolicyLocalBundle()).rejects.toThrow(
      "Invalid local profile",
    );
    expect(current.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects changed sidecar bytes, even when the byte count remains the same", async () => {
    const current = fixture(true);
    current.bodies.set(
      "./search-projection.json",
      current.bodies
        .get("./search-projection.json")!
        .replace("profile-a", "profile-z"),
    );
    await expect(loadPolicyLocalBundle()).rejects.toThrow(
      "Local projection checksum mismatch",
    );
  });

  it("rejects a rehashed sidecar bound to another corpus or retained population", async () => {
    for (const change of [
      { corpusDigest: "d".repeat(64) },
      { parentCorpusDigest: "d".repeat(64) },
      { retainedSegmentIds: [] },
      { retainedVersionIds: [] },
    ]) {
      const current = fixture(true);
      const forged = JSON.stringify({ ...current.projection, ...change });
      current.bodies.set("./search-projection.json", forged);
      Object.assign(current.profile.searchProjection!, {
        fileDigest: hash(forged),
        bytes: byteLength(forged),
      });
      current.bodies.set(
        "./local-profile.json",
        JSON.stringify(current.profile),
      );
      await expect(loadPolicyLocalBundle()).rejects.toThrow(
        "Local projection identity mismatch",
      );
    }
  });

  it("bounds actual profile bytes even if content-length understates them", async () => {
    fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(" ".repeat(64 * 1024 + 1), 1)),
    );
    await expect(loadPolicyLocalBundle()).rejects.toThrow(
      "Local response exceeds byte ceiling",
    );
  });

  it("checks declared and actual corpus byte counts", async () => {
    const current = fixture();
    current.fetchMock.mockImplementation(async (path) =>
      path === "./corpus.json"
        ? response(current.bodies.get(path)!, 1)
        : response(current.bodies.get(path)!),
    );
    await expect(loadPolicyLocalBundle()).rejects.toThrow(
      "Local corpus unavailable",
    );
  });
});
