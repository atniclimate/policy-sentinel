// Reports when the static index needs a refresh (T1.8; D-125 refresh triggers).
// Reads docs/demo-data/manifest.json and the CFR shards it lists, changes
// nothing, and prints a refresh-recommended list. Checks: a newer CFR annual
// edition per title (GovInfo bulk listing for the next edition year), a new
// U.S. Code release point (only with --olrc-terms-read), presidential
// documents published since the index was retrieved (Federal Register API;
// new public laws show as a new U.S. Code release point), and a new Congress
// or session (from the date, no request).
//
// At most one request per check, 1.1 seconds apart, no retry; the first 403 or
// 429 stops every later request. --dry-run prints the planned requests and
// makes none.
//
//   node scripts/check-index-freshness.mjs [--dry-run] [--olrc-terms-read]
//        [--manifest docs/demo-data/manifest.json]
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SPACING_MS = 1100;
const TIMEOUT_MS = 20_000;
export const DEFAULT_MANIFEST = "docs/demo-data/manifest.json";
const OLRC_DOWNLOAD = "https://uscode.house.gov/download/download.shtml";

/** The Congress and session in progress on a date; each Congress opens January 3 of an odd year. */
export function congressAt(value) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const before3 = date.getUTCMonth() === 0 && date.getUTCDate() < 3;
  const since = (before3 ? year - 1 : year) - 1789;
  return { congress: Math.floor(since / 2) + 1, session: (since % 2) + 1 };
}

const day = (iso) => String(iso).slice(0, 10);

/** The earliest retrieval date of any file in the manifest, or its generation date. */
export function retrievedSince(manifest) {
  const dates = (manifest.files ?? [])
    .map((file) => file.source?.retrievedAt)
    .filter((value) => typeof value === "string")
    .map(day)
    .sort();
  return dates[0] ?? day(manifest.generatedAt);
}

/**
 * The checks to run, in order. A check with a `url` makes one request; one
 * without carries its answer already. `cfrTitle(file)` returns the shard's
 * title number, or null when the shard cannot be read.
 */
export function planChecks(
  manifest,
  { now = new Date(), olrcTermsRead = false, cfrTitle = () => null } = {},
) {
  const files = manifest.files ?? [];
  const checks = [];

  const editions = new Map();
  for (const file of files) {
    if (file.source?.id !== "govinfo-cfr-annual") continue;
    const title = cfrTitle(file);
    if (title === null) {
      checks.push({
        id: `cfr:${file.path}`,
        label: `CFR shard ${file.path}`,
        status: "not_checked",
        detail: "its title could not be read from the shard",
      });
      continue;
    }
    const year = Number(file.source.editionYear);
    editions.set(title, Math.max(year, editions.get(title) ?? 0));
  }
  for (const [title, year] of [...editions].sort((a, b) => a[0] - b[0])) {
    const next = year + 1;
    checks.push({
      id: `cfr:${title}`,
      label: `CFR title ${title} annual edition`,
      url: `https://www.govinfo.gov/bulkdata/json/CFR/${next}/title-${title}`,
      accept: "application/json",
      evaluate: (status, body) => {
        if (status === 404)
          return [
            "current",
            `no ${next} edition is listed yet; the index has ${year}`,
          ];
        if (status !== 200) return ["not_checked", `HTTP ${status}`];
        let listed;
        try {
          listed = JSON.parse(body).files;
        } catch {
          return ["not_checked", "the listing answer was not JSON"];
        }
        return Array.isArray(listed) && listed.length > 0
          ? [
              "refresh",
              `the ${next} edition is listed on GovInfo bulk data; the index has ${year}`,
            ]
          : ["not_checked", "the listing answer held no file list"];
      },
    });
  }

  const points = [
    ...new Set(
      files
        .filter((file) => file.source?.id === "olrc-uslm")
        .map((file) => file.source.releasePoint),
    ),
  ];
  const usc = { id: "usc", label: "U.S. Code release point" };
  if (!olrcTermsRead)
    checks.push({
      ...usc,
      status: "not_checked",
      detail: "not checked: terms unread",
    });
  else if (!points.length)
    checks.push({
      ...usc,
      status: "not_checked",
      detail: "no U.S. Code file in the manifest",
    });
  else
    checks.push({
      ...usc,
      url: OLRC_DOWNLOAD,
      accept: "text/html",
      evaluate: (status, body) => {
        if (status !== 200) return ["not_checked", `HTTP ${status}`];
        // Only the forms the acquirer accepts: 119-136 and 119-60not43.
        const found = /xml_uscAll@(\d{2,3}-\d{1,4}(?:not\d{1,4})?)\.zip/.exec(
          body,
        )?.[1];
        if (!found)
          return ["not_checked", "no release point found on the download page"];
        return points.every((point) => point === found)
          ? ["current", `release point ${found}`]
          : [
              "refresh",
              `release point ${found} is published; the index has ${points.join(", ")}`,
            ];
      },
    });

  const since = retrievedSince(manifest);
  const query = new URLSearchParams([
    ["per_page", "20"],
    ["order", "oldest"],
    ["conditions[type][]", "PRESDOCU"],
    ["conditions[publication_date][gte]", since],
    ["fields[]", "document_number"],
    ["fields[]", "publication_date"],
    ["fields[]", "presidential_document_type"],
  ]);
  checks.push({
    id: "presidential",
    label: `Presidential documents since ${since} (inclusive)`,
    url: `https://www.federalregister.gov/api/v1/documents.json?${query}`,
    accept: "application/json",
    evaluate: (status, body) => {
      if (status !== 200) return ["not_checked", `HTTP ${status}`];
      let count;
      try {
        count = JSON.parse(body).count;
      } catch {
        return ["not_checked", "the answer was not JSON"];
      }
      if (!Number.isSafeInteger(count) || count < 0)
        return ["not_checked", "the answer held no count"];
      return count === 0
        ? ["current", "none published"]
        : ["refresh", `${count} published in the Federal Register`];
    },
  });

  const then = congressAt(since);
  const today = congressAt(now);
  const ordinal = (n) =>
    `${n}${[11, 12, 13].includes(n % 100) ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
  const at = (c) => `${ordinal(c.congress)} Congress, session ${c.session}`;
  checks.push({
    id: "congress",
    label: "Congress and session",
    status:
      then.congress === today.congress && then.session === today.session
        ? "current"
        : "refresh",
    detail:
      then.congress !== today.congress
        ? `a new Congress: the ${at(today)}; the index was retrieved in the ${at(then)}`
        : then.session !== today.session
          ? `a new session: the ${at(today)}; the index was retrieved in session ${then.session}`
          : at(today),
  });
  return checks;
}

/** Runs the planned requests in order, spaced, once each; stops all requests after a 403 or 429. */
export async function runChecks(
  checks,
  {
    fetch = globalThis.fetch,
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  } = {},
) {
  const results = [];
  let stopped = null;
  let sent = 0;
  for (const check of checks) {
    const { id, label, url } = check;
    if (!url) {
      results.push({ id, label, status: check.status, detail: check.detail });
      continue;
    }
    if (stopped) {
      results.push({
        id,
        label,
        url,
        status: "not_checked",
        detail: `stopped after ${stopped}`,
      });
      continue;
    }
    if (sent++ > 0) await sleep(SPACING_MS);
    let status;
    let body;
    try {
      const response = await fetch(url, {
        headers: { Accept: check.accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = response.status;
      body = await response.text();
    } catch {
      results.push({
        id,
        label,
        url,
        status: "not_checked",
        detail: "the request failed",
      });
      continue;
    }
    if (status === 403 || status === 429) {
      stopped = `HTTP ${status} from ${new URL(url).host}`;
      results.push({
        id,
        label,
        url,
        status: "not_checked",
        detail: `HTTP ${status}; later requests stopped`,
      });
      continue;
    }
    const [verdict, detail] = check.evaluate(status, body);
    results.push({ id, label, url, status: verdict, detail });
  }
  return results;
}

const MARK = {
  current: "current",
  refresh: "refresh",
  not_checked: "not checked",
};

export function formatReport(results) {
  const lines = results.map(
    (r) => `- [${MARK[r.status]}] ${r.label}: ${r.detail}`,
  );
  const refresh = results.filter((r) => r.status === "refresh");
  lines.push(
    refresh.length
      ? `Refresh recommended:\n${refresh.map((r) => `  - ${r.label}: ${r.detail}`).join("\n")}`
      : "Refresh recommended: none",
  );
  return lines.join("\n");
}

export function formatPlan(checks) {
  return [
    "Dry run: no requests made.",
    ...checks.map((c) =>
      c.url
        ? `- ${c.label}: GET ${c.url}`
        : `- ${c.label}: no request (${MARK[c.status]}: ${c.detail})`,
    ),
  ].join("\n");
}

async function main(argv) {
  const flag = (name) => argv.includes(name);
  const at = argv.indexOf("--manifest");
  const path = resolve(at >= 0 ? argv[at + 1] : DEFAULT_MANIFEST);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    console.log(
      `No readable manifest at ${path}; the index has not been built.`,
    );
    return 1;
  }
  const cfrTitle = (file) => {
    try {
      const title = JSON.parse(
        readFileSync(join(dirname(path), file.path), "utf8"),
      ).title;
      return Number.isSafeInteger(title) && title > 0 ? title : null;
    } catch {
      return null;
    }
  };
  const checks = planChecks(manifest, {
    olrcTermsRead: flag("--olrc-terms-read"),
    cfrTitle,
  });
  console.log(
    `Index freshness for the manifest generated ${manifest.generatedAt}`,
  );
  if (flag("--dry-run")) {
    console.log(formatPlan(checks));
    return 0;
  }
  console.log(formatReport(await runChecks(checks)));
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main(process.argv.slice(2));
}
