import { describe, expect, it, vi } from "vitest";
import { createIndexLoader, shardNotice } from "../../src/demo/index-loader";
import { cfrPartLinks } from "../../src/demo/links";
import type { CfrAuthorityShard } from "../../src/demo/index-types";
import {
  cfrBytes,
  cfrFile,
  cfrShard,
  manifest,
  manifestOf,
  NOW,
} from "./fixtures/chain";

const ok = (bytes: Uint8Array) =>
  Promise.resolve(new Response(new Uint8Array(bytes)));

describe("index loader", () => {
  it("fetches a listed shard from ./demo-data/, checks its hash and parses it", async () => {
    const fetch = vi.fn(() => ok(cfrBytes));
    const loader = createIndexLoader(manifest, { fetch });
    const result = await loader.load<CfrAuthorityShard>("cfr/title-99.json");
    expect(fetch).toHaveBeenCalledWith("./demo-data/cfr/title-99.json");
    expect(result.state).toBe("current");
    if (result.state === "current") expect(result.data).toEqual(cfrShard);
    expect(shardNotice(result)).toBeNull();
    // Cached by path for the page session.
    await loader.load("cfr/title-99.json");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows index unavailable for a tampered shard (D4)", async () => {
    const tampered = cfrBytes.slice();
    tampered[10] ^= 1;
    const loader = createIndexLoader(manifest, { fetch: () => ok(tampered) });
    const result = await loader.load("cfr/title-99.json");
    expect(result.state).toBe("index_unavailable");
    expect(shardNotice(result)).toBe("Index unavailable");
  });

  it("shows index unavailable on a fetch failure or an error status, and tries again on the next open", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockImplementation(() => ok(cfrBytes));
    const loader = createIndexLoader(manifest, { fetch });
    expect((await loader.load("cfr/title-99.json")).state).toBe(
      "index_unavailable",
    );
    expect((await loader.load("cfr/title-99.json")).state).toBe(
      "index_unavailable",
    );
    expect((await loader.load("cfr/title-99.json")).state).toBe("current");
  });

  it("names each file state without fetching what is not there (D2, D3, J)", async () => {
    const fetch = vi.fn(() => ok(cfrBytes));
    const loader = createIndexLoader(manifest, { fetch });
    const unavailable = await loader.load("usc/title-98.json");
    expect(unavailable.state).toBe("unavailable");
    expect(shardNotice(unavailable)).toBe("Not yet available");
    const unlisted = await loader.load("usc/title-50.json");
    expect(shardNotice(unlisted)).toBe("Not yet available");
    const withdrawn = await loader.load("cfr/title-97.json");
    expect(shardNotice(withdrawn)).toBe(
      "Withdrawn on 2099-02-15 while the source's terms are reviewed",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a retained file with its original as-of and retrieval time (D2)", async () => {
    const loader = createIndexLoader(manifest, { fetch: () => ok(cfrBytes) });
    const result = await loader.load<CfrAuthorityShard>("cfr/title-96.json");
    expect(result.state).toBe("retained_after_failed_refresh");
    expect(shardNotice(result)).toBeNull();
    if (result.state !== "retained_after_failed_refresh") return;
    const [row] = cfrPartLinks(result.data, "100", result.file, NOW) ?? [];
    expect(row).toMatchObject({
      asOfText: "Revised as of April 1, 2099",
      retrievedAt: "2099-02-01T10:00:00-08:00",
    });
  });

  it("fetches only same-origin manifest paths", async () => {
    const fetch = vi.fn(() => ok(cfrBytes));
    const loader = createIndexLoader(
      manifestOf([
        { ...cfrFile, path: "../secrets.json" },
        { ...cfrFile, path: "https://example.org/cfr.json" },
      ]),
      { fetch },
    );
    expect((await loader.load("../secrets.json")).state).toBe(
      "index_unavailable",
    );
    expect((await loader.load("https://example.org/cfr.json")).state).toBe(
      "index_unavailable",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
