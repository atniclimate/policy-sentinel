// The call and byte budget table holds (design section 3 T1.3): opening a
// record or an index hop makes only same-origin static fetches and no keyed
// call; an expansion makes exactly one Worker call, and only on a press.
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { h } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkedRecordsPanel } from "../../demo/app/LinkedRecordsPanel";
import type { ChainExpansionId } from "../../demo/app/LinkedRecordsPanel";
import { createIndexLoader } from "../../src/demo/index-loader";
import type {
  CfrAuthorityShard,
  UscSourceCreditShard,
} from "../../src/demo/index-types";
import {
  CALL_BUDGET,
  cfrPartLinks,
  citationsInText,
  recordLinks,
  uscSectionLinks,
} from "../../src/demo/links";
import {
  blocks,
  cfrBytes,
  frRecord,
  manifest,
  NOW,
  SOURCES,
  uscBytes,
} from "./fixtures/chain";
import { idle } from "./fixtures/chain/panel-props";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const WORKER = "https://policy-sentinel-demo.example.workers.dev";

/** A fetch stub that records each URL and answers static shards by path. */
function recorder() {
  const urls: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    const bytes = url.endsWith("cfr/title-99.json")
      ? cfrBytes
      : url.endsWith("usc/title-99.json")
        ? uscBytes
        : new TextEncoder().encode("{}");
    return Promise.resolve(new Response(new Uint8Array(bytes)));
  });
  return { urls, fetch };
}

const isStatic = (url: string) =>
  url.startsWith("./demo-data/") &&
  new URL(url, location.href).origin === location.origin;

describe("call and byte budget", () => {
  it("loads nothing keyed automatically and gives each expansion one keyed call", () => {
    for (const row of Object.values(CALL_BUDGET)) {
      if (row.automatic) expect(row.keyedCalls).toBe(0);
      expect(row.worstCaseBytes).toBeGreaterThanOrEqual(0);
      expect(row.cache).not.toBe("");
      expect(row.truncation).not.toBe("");
    }
    for (const id of [
      "expand_govinfo_related",
      "expand_congress_related_bills",
    ] as const) {
      expect(CALL_BUDGET[id]).toMatchObject({
        keyedCalls: 1,
        keylessCalls: 0,
        staticFetches: 0,
        automatic: false,
      });
    }
  });

  it("opens a record with no fetch at all", () => {
    const { urls, fetch } = recorder();
    vi.stubGlobal("fetch", fetch);
    recordLinks(frRecord, SOURCES);
    citationsInText(blocks, frRecord);
    expect(urls).toHaveLength(CALL_BUDGET.open_record.staticFetches);
    expect(CALL_BUDGET.open_record.keyedCalls).toBe(0);
  });

  it("opens a CFR part and a U.S.C. section with one same-origin static fetch each", async () => {
    const { urls, fetch } = recorder();
    vi.stubGlobal("fetch", fetch);
    const loader = createIndexLoader(manifest, { fetch });
    const cfr = await loader.load<CfrAuthorityShard>("cfr/title-99.json");
    expect(cfr.state).toBe("current");
    if (cfr.state === "current")
      expect(cfrPartLinks(cfr.data, "100", cfr.file, NOW)).not.toBeNull();
    expect(urls).toHaveLength(CALL_BUDGET.open_cfr_part.staticFetches);

    const usc = await loader.load<UscSourceCreditShard>("usc/title-99.json");
    if (usc.state === "current")
      expect(
        uscSectionLinks(usc.data, "/us/usc/t99/s1001", usc.file, NOW),
      ).not.toBeNull();
    expect(urls).toHaveLength(
      CALL_BUDGET.open_cfr_part.staticFetches +
        CALL_BUDGET.open_usc_section.staticFetches,
    );
    expect(urls.every(isStatic)).toBe(true);
    expect(urls.some((u) => u.startsWith(WORKER))).toBe(false);
    // Reopening the same part is served from memory.
    await loader.load("cfr/title-99.json");
    expect(urls).toHaveLength(2);
  });

  it("makes exactly one Worker call per expansion press and none before it", () => {
    const { urls, fetch } = recorder();
    const onExpand = (id: ChainExpansionId) =>
      void fetch(`${WORKER}/api/related?family=${id}`);
    render(h(LinkedRecordsPanel, { rows: [], expansions: idle, onExpand }));
    expect(urls).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show related records stated by GovInfo",
      }),
    );
    expect(urls).toEqual([`${WORKER}/api/related?family=govinfo_related`]);
    expect(urls).toHaveLength(CALL_BUDGET.expand_govinfo_related.keyedCalls);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show related bills stated by Congress.gov",
      }),
    );
    expect(urls).toHaveLength(
      CALL_BUDGET.expand_govinfo_related.keyedCalls +
        CALL_BUDGET.expand_congress_related_bills.keyedCalls,
    );
  });
});
