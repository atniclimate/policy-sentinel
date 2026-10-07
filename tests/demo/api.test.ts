// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiFailure,
  loadSources,
  readPolicy,
  REQUEST_TIMEOUT_MS,
  search,
} from "../../demo/api";
import { policy, searchResult, sources } from "./frontend-fixtures";

const answer = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("demo API response boundary", () => {
  it.each([
    {},
    { ok: true, sources: [] },
    { ok: true, sources: [null] },
    { ok: true, sources: [sources[0], sources[0]] },
  ])("rejects malformed source catalogs", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(body)));
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
  });

  it("accepts and projects a valid source catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(answer({ ok: true, sources })),
    );
    await expect(loadSources()).resolves.toEqual(sources);
  });

  it("recognizes an HTML rate-limit response before decoding JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<h1>Rate limited</h1>", { status: 429 }),
        ),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "limited" });
  });

  it("rejects a search response belonging to a different query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(answer(searchResult([], "other query"))),
    );
    await expect(search("federal-register", "water", 1)).rejects.toBeInstanceOf(
      ApiFailure,
    );
  });

  it("rejects a policy belonging to a different identifier and unsafe official links", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(answer(policy()))
      .mockResolvedValueOnce(
        answer({
          ...policy(),
          citation: {
            ...policy().citation,
            officialUrl: "https://attacker.example/policy",
          },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      readPolicy("federal-register", "2099-99999"),
    ).rejects.toMatchObject({ kind: "service" });
    await expect(
      readPolicy("federal-register", "2099-00001"),
    ).rejects.toMatchObject({ kind: "service" });
  });

  it("returns a validated matching policy with unchanged evidence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(policy())));
    await expect(readPolicy("federal-register", "2099-00001")).resolves.toEqual(
      policy(),
    );
  });

  it("preserves distinct metadata and text retrieval timestamps", async () => {
    const response = {
      ...policy(),
      receipt: { ...policy().receipt, retrievedAt: "2099-01-07T12:00:00.000Z" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(response)));
    await expect(readPolicy("federal-register", "2099-00001")).resolves.toEqual(
      response,
    );
  });

  it("cancels a declared oversized body before reading it", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { headers: { "Content-Length": "2000001" } }),
        ),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("bounds undeclared response bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(" ".repeat(2_000_001))),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
  });

  it("aborts a stalled response at the deadline", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal as AbortSignal;
            signal.addEventListener(
              "abort",
              () => reject(new Error("Aborted")),
              { once: true },
            );
          }),
      ),
    );
    const result = loadSources();
    const rejected = expect(result).rejects.toMatchObject({ kind: "service" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(signal?.aborted).toBe(true);
    await rejected;
  });

  it("passes explicit cancellation through to fetch", async () => {
    const controller = new AbortController();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal as AbortSignal;
            signal.addEventListener(
              "abort",
              () => reject(new Error("Aborted")),
              { once: true },
            );
          }),
      ),
    );
    const result = loadSources(controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ kind: "service" });
    expect(signal?.aborted).toBe(true);
  });
});
