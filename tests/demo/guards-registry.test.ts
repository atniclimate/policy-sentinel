// @vitest-environment node
// Safeguard 5 and design rule 7 as a failing check: every registered source
// module declares its exact hosts, every one of them is allowlisted, and each
// module's response normalizer (exercised end to end through the Worker's
// search route) keeps contact fields out of the answer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasPersonalPattern } from "../../src/demo/personal-guard";
import worker, { ALLOWED_HOSTS, SOURCE_REGISTRY } from "../../worker/src/index";
import type { Env } from "../../worker/src/index";
import {
  FR_SEARCH_JSON,
  GRANTS_LIVE_TRIBAL,
  REGULATIONS_V2_JSON,
} from "./fixtures";

const ORIGIN = "https://atniclimate.github.io";
let visitor = 0;

/** Synthetic contact data: an address, a number and a name no one holds. */
const EMAIL = "contact.person@example.org";
const PHONE = "(555) 010-0199";
const NAME = "Jordan Q. Sample";
const CONTACT = {
  contactEmail: EMAIL,
  contactPhone: PHONE,
  contactName: NAME,
  agencyContactEmail: EMAIL,
  agencyContactPhone: PHONE,
  agencyContactName: NAME,
  pointOfContact: { name: NAME, email: EMAIL, phone: PHONE },
  contacts: [{ fullName: NAME, emailAddress: EMAIL, phoneNumber: PHONE }],
  sponsors: [{ fullName: NAME, firstName: "Jordan", lastName: "Sample" }],
};
const withContact = <T extends object>(row: T) => ({ ...row, ...CONTACT });

/** The modules this guard drives through a synthetic upstream answer. */
const CHECKED: Record<
  string,
  { q: string; host: string; answer: unknown; env: Env }
> = {
  "federal-register": {
    q: "water",
    host: "www.federalregister.gov",
    answer: {
      ...FR_SEARCH_JSON,
      results: FR_SEARCH_JSON.results.map(withContact),
    },
    env: {},
  },
  govinfo: {
    q: "water",
    host: "api.govinfo.gov",
    answer: {
      count: 1,
      results: [
        withContact({
          title: "Example Package",
          packageId: "PKG-1",
          dateIssued: "2099-01-05",
          governmentAuthor: ["Example Department"],
          collectionCode: "FR",
        }),
      ],
    },
    env: { DATA_GOV_API_KEY: "synthetic-key" },
  },
  regulations: {
    q: "water",
    host: "api.regulations.gov",
    answer: {
      ...REGULATIONS_V2_JSON,
      data: REGULATIONS_V2_JSON.data.map((row) => ({
        ...withContact(row),
        attributes: withContact(row.attributes),
      })),
    },
    env: { DATA_GOV_API_KEY: "synthetic-key" },
  },
  congress: {
    q: "hr 1234 119",
    host: "api.congress.gov",
    answer: {
      bill: withContact({
        type: "HR",
        number: "1234",
        congress: 119,
        title: "Synthetic Bill Identity Test",
        introducedDate: "2025-01-05",
        originChamber: "House",
        latestAction: { text: "Referred to a committee." },
      }),
    },
    env: { DATA_GOV_API_KEY: "synthetic-key" },
  },
  grants: {
    q: "climate",
    host: "api.grants.gov",
    answer: {
      ...GRANTS_LIVE_TRIBAL,
      data: {
        ...GRANTS_LIVE_TRIBAL.data,
        oppHits: GRANTS_LIVE_TRIBAL.data.oppHits.map(withContact),
      },
    },
    env: {},
  },
};

/**
 * Not driven here, with the reason: Washington's search answer is the bill's
 * own citation, built from the query and the bill document's HTML, which has
 * no structured contact field to inject; its read text goes through the
 * passage guard in the document tests.
 */
const NOT_CHECKED: Record<string, string> = {
  washington: "HTML bill document, no structured response fields",
};

beforeEach(() => {
  vi.stubGlobal("caches", { default: undefined });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("source registry guard", () => {
  const modules = Object.entries(SOURCE_REGISTRY);

  it("covers every registered module, either driven or listed with a reason", () => {
    expect(modules.length).toBeGreaterThan(0);
    for (const [id] of modules)
      expect(id in CHECKED || id in NOT_CHECKED, id).toBe(true);
    for (const id of [...Object.keys(CHECKED), ...Object.keys(NOT_CHECKED)])
      expect(id in SOURCE_REGISTRY, id).toBe(true);
  });

  it.each(modules)(
    "%s declares exact allowlisted hosts and a search",
    (_id, module) => {
      expect(Array.isArray(module.HOSTS)).toBe(true);
      expect(module.HOSTS.length).toBeGreaterThan(0);
      for (const host of module.HOSTS) {
        expect(host).toMatch(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/);
        expect(ALLOWED_HOSTS.has(host)).toBe(true);
      }
      expect(typeof module.search).toBe("function");
    },
  );

  it("allowlists exactly the hosts the modules declare", () => {
    expect([...ALLOWED_HOSTS].sort()).toEqual(
      [...new Set(modules.flatMap(([, m]) => m.HOSTS))].sort(),
    );
  });

  it("checks for the planted values", () => {
    const planted = JSON.stringify(CONTACT);
    expect(planted).toContain(EMAIL);
    expect(hasPersonalPattern(`${EMAIL} ${PHONE}`)).toBe(true);
  });

  it.each(Object.entries(CHECKED))(
    "%s keeps an email, a phone and a contact name out of its answer",
    async (source, { q, host, answer, env }) => {
      const sent: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: URL | string) => {
          sent.push(new URL(String(input)).host);
          return new Response(JSON.stringify(answer), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }),
      );
      const res = await worker.fetch(
        new Request(
          `https://demo.example/api/search?${new URLSearchParams({ source, q })}`,
          {
            headers: {
              Origin: ORIGIN,
              "cf-connecting-ip": `2001:db8::5${(++visitor).toString(16)}`,
            },
          },
        ),
        env,
      );
      expect(res.status).toBe(200);
      expect(sent).toContain(host);
      const body = await res.text();
      expect(JSON.parse(body).results.length).toBeGreaterThan(0);
      for (const planted of [EMAIL, PHONE, NAME, "Sample", "Jordan"])
        expect(body).not.toContain(planted);
    },
  );
});
