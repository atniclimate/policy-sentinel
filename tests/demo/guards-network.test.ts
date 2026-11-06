// @vitest-environment node
// Safeguard 3 and design rule 4 as a failing check: the page and the Worker name
// no host outside the Worker allowlist, the page's own origins and a reviewed
// list of official link-out hosts; no model, analytics or advertising host; no
// beacon, tracking pixel or third-party script.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED_HOSTS } from "../../worker/src/index";

const ROOTS = ["demo", "src/demo", "worker/src"];
const TEXT = /\.(?:ts|tsx|mts|js|mjs|html|css|json)$/;

/** The page, the Worker and their local and cache-key addresses. */
const OWN_HOSTS = [
  "atniclimate.github.io",
  "policy-sentinel-demo.atniclimate.workers.dev",
  "cache.policy-sentinel-demo.invalid",
  "localhost",
  "127.0.0.1",
];

/**
 * Link-out hosts in today's code, reviewed 2026-11-05: official government,
 * court and legislature sites, the ATNI and project pages, the NCAI draft
 * list's published sheet and its CourtListener searches, and the SVG
 * namespace in styles.css (an identifier, never fetched). A new host here
 * needs the same review.
 */
const REVIEWED_LINK_OUT = [
  "adminrules.idaho.gov",
  "app.leg.wa.gov",
  "apps.leg.wa.gov",
  "atnitribes.org",
  "bills.legmt.gov",
  "courts.alaska.gov",
  "courts.ca.gov",
  "courts.mt.gov",
  "docs.google.com",
  "github.com",
  "isc.idaho.gov",
  "leg.wa.gov",
  "legislature.idaho.gov",
  "leginfo.legislature.ca.gov",
  "ltgov.alaska.gov",
  "mca.legmt.gov",
  "narf.org",
  "nvcourts.gov",
  "open.gsa.gov",
  "sos.oregon.gov",
  "supreme.courts.ca.gov",
  "uscode.house.gov",
  "www.akleg.gov",
  "www.ca9.uscourts.gov",
  "www.congress.gov",
  "www.courtlistener.com",
  "www.courts.oregon.gov",
  "www.courts.wa.gov",
  "www.dcd.uscourts.gov",
  // The Interior Board of Indian Appeals page, from the courts lane (step 8).
  "www.doi.gov",
  "www.ecfr.gov",
  "www.federalregister.gov",
  "www.govinfo.gov",
  "www.grants.gov",
  "www.leg.state.nv.us",
  "www.narf.org",
  "www.ncai.org",
  "www.oregonlegislature.gov",
  "www.reginfo.gov",
  "www.regulations.gov",
  "www.supremecourt.gov",
  "www.uscourts.gov",
  "www.w3.org",
  "www.wawd.uscourts.gov",
];

/** Model, analytics, tag and advertising services: never named anywhere. */
const FORBIDDEN =
  /openai|anthropic|claude\.ai|generativelanguage|gemini|mistral|cohere|huggingface|typesafe|parallel\.ai|google-analytics|googletagmanager|analytics|doubleclick|googlesyndication|adservice|adsystem|segment\.(?:io|com)|mixpanel|amplitude|hotjar|plausible|matomo|clarity\.ms|sentry|newrelic|datadog|facebook|fbcdn|tiktok|linkedin|twitter|pixel/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const sources = ROOTS.flatMap(files)
  .filter((path) => TEXT.test(path))
  .map((path) => ({ path, text: readFileSync(path, "utf8") }));

function hostsIn(text: string): string[] {
  return [...text.matchAll(/\bhttps?:\/\/([A-Za-z0-9.-]+)/g)]
    .map((m) => m[1].toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

describe("network guard", () => {
  it("scans the page and Worker code", () => {
    expect(sources.some((s) => s.path.endsWith("main.tsx"))).toBe(true);
    expect(sources.some((s) => s.path.endsWith("index.ts"))).toBe(true);
    expect(hostsIn("x https://api.example.gov/y").at(0)).toBe(
      "api.example.gov",
    );
  });

  it("names only allowlisted, own or reviewed link-out hosts", () => {
    const permitted = new Set([
      ...ALLOWED_HOSTS,
      ...OWN_HOSTS,
      ...REVIEWED_LINK_OUT,
    ]);
    const outside = sources.flatMap(({ path, text }) =>
      hostsIn(text)
        .filter((host) => !permitted.has(host))
        .map((host) => `${path}: ${host}`),
    );
    expect(outside).toEqual([]);
  });

  it("keeps model, analytics and advertising hosts out of every list and file", () => {
    const lists = [...ALLOWED_HOSTS, ...OWN_HOSTS, ...REVIEWED_LINK_OUT];
    expect(lists.filter((host) => FORBIDDEN.test(host))).toEqual([]);
    const named = sources.flatMap(({ path, text }) =>
      hostsIn(text)
        .filter((host) => FORBIDDEN.test(host))
        .map((host) => `${path}: ${host}`),
    );
    expect(named).toEqual([]);
    expect(FORBIDDEN.test("www.google-analytics.com")).toBe(true);
    expect(FORBIDDEN.test("api.openai.com")).toBe(true);
  });

  it("sends no beacon, pixel or third-party script", () => {
    const patterns: [string, RegExp][] = [
      ["sendBeacon", /\bsendBeacon\b/],
      ["new Image()", /\bnew\s+Image\s*\(/],
      ["script element", /createElement\(\s*["'`]script["'`]/],
      ["iframe", /<iframe\b|createElement\(\s*["'`]iframe["'`]/i],
      ["remote image", /<img\b[^>]*\bsrc\s*=\s*["'{`]\s*https?:/i],
      ["remote script", /<script\b[^>]*\bsrc\s*=\s*["']\s*(?:https?:)?\/\//i],
      [
        "remote stylesheet",
        /<link\b[^>]*\bhref\s*=\s*["']\s*(?:https?:)?\/\//i,
      ],
      ["remote import", /\bimport\s*\(\s*["'`]https?:/],
    ];
    const css: [string, RegExp][] = [
      ["CSS remote url", /\burl\(\s*["']?\s*(?:https?:)?\/\//],
      ["CSS @import", /@import\s/],
    ];
    const hits = sources.flatMap(({ path, text }) =>
      [...patterns, ...(/\.(?:css|html)$/.test(path) ? css : [])]
        .filter(([, pattern]) => pattern.test(text))
        .map(([name]) => `${path}: ${name}`),
    );
    expect(hits).toEqual([]);
  });

  it("loads only the page's own module script", () => {
    const html = readFileSync("demo/index.html", "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    expect(scripts).toEqual(['<script type="module" src="./main.tsx">']);
  });
});
