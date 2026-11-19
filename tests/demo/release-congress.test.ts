// Release check 2026-11-18 for Congress.gov: the live answer shape (values synthetic) and the missing-reference path.
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../worker/src/index";
import { searchValue } from "../../src/demo/validation";
import type { Env } from "../../worker/src/sources/shared";

const KEYED = { DATA_GOV_API_KEY: "synthetic-key" } as unknown as Env;
const ORIGIN = "http://localhost:5211";

// Trimmed from the live answer of 2026-11-18, with synthetic values.
const BILL = {
  bill: {
    type: "HR",
    number: "8800",
    congress: 119,
    title: "Synthetic Authorization Act",
    introducedDate: "2026-05-13",
    originChamber: "House",
    latestAction: { actionDate: "2026-06-01", text: "Received in the Senate." },
    sponsors: [{ fullName: "Example Party" }],
  },
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function post(q: string) {
  return worker.fetch(
    new Request("https://worker.test/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ source: "congress", q, page: "1" }),
    }),
    KEYED,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Congress.gov release check", () => {
  it("answers a POSTed bill lookup in the shape the page validates, with one call", async () => {
    const fetchMock = vi.fn(async () => reply(BILL));
    vi.stubGlobal("fetch", fetchMock);
    const res = await post("hr 8800 119");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(
      "api.congress.gov/v3/bill/119/hr/8800",
    );
    const checked = searchValue(body, "congress", "hr 8800 119", 1, undefined);
    expect(checked.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      identifier: "HR 8800, 119th Congress",
      kind: "Bill",
      issuingBody: "House",
      date: "2026-05-13",
      textUrl: null,
      textAvailable: false,
      matchKey: null,
      summary: "Latest action: Received in the Senate.",
    });
    expect(body.continuation).toEqual({
      kind: "stopped",
      reason: "not_applicable",
    });
    // Sponsors and other fields are not carried.
    expect(JSON.stringify(body)).not.toContain("Example Party");
  });

  it("answers a bill that does not exist as a definite 404 not_found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ error: "none" }, 404)),
    );
    const res = await post("hr 9998 101");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "not_found",
      status: "error",
    });
  });
});
