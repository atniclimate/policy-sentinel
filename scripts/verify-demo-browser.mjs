/* global axe, document, getComputedStyle, window */
// End-to-end check of the live demo in a real browser, against the deployed Worker.
// Usage: node scripts/verify-demo-browser.mjs --url <page url> --out <folder>
// Needs playwright-core (set PLAYWRIGHT_CORE to its folder) and pdftotext on PATH.
// Request budget, enforced before each request: source catalog twice (page and embed),
// one search and one policy read.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
// Control names and document wording come from the page's own modules (Node
// strips their types on import), so a reworded label cannot strand this script.
import {
  atniReferences,
  ieeeReference,
  SOURCE_LABELS,
} from "../src/demo/citations.ts";
import { COPY, EXAMPLES } from "../src/demo/copy.ts";

const TSDF_URL =
  "https://atniclimate.github.io/TieredSovereignDataFramework/#overview";
const REPO_URL = "https://github.com/atniclimate/policy-sentinel";

function requestGuard(pageUrl) {
  const target = new URL(pageUrl);
  const override = target.searchParams.get("api");
  const apiOrigin =
    override &&
    /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(override)
      ? new URL(override).origin
      : "https://policy-sentinel-demo.atniclimate.workers.dev";
  const limits = { "/api/sources": 2, "/api/search": 1, "/api/policy": 1 };
  const calls = Object.fromEntries(
    Object.keys(limits).map((path) => [path, 0]),
  );
  const staticRequests = { count: 0, limit: 80 };
  return {
    calls,
    staticRequests,
    permit(raw, method, type) {
      const request = new URL(raw);
      if (method !== "GET") return false;
      if (
        request.origin === apiOrigin &&
        Object.hasOwn(limits, request.pathname)
      ) {
        if (calls[request.pathname] >= limits[request.pathname]) return false;
        calls[request.pathname] += 1;
        return true;
      }
      const staticAllowed =
        request.origin === target.origin &&
        !request.pathname.startsWith("/api/") &&
        (["document", "script", "stylesheet", "image", "font"].includes(type) ||
          (type === "fetch" && /\.(?:ttf|woff2?|png)$/.test(request.pathname)));
      if (!staticAllowed || staticRequests.count >= staticRequests.limit)
        return false;
      staticRequests.count += 1;
      return true;
    },
  };
}

function searchOutcomes(reply, outcome, sourceRows) {
  const policies = new Set(
    reply.results.map(
      (item) => item.matchKey ?? `${item.sourceId}:${item.identifier}`,
    ),
  ).size;
  return (
    outcome === COPY.resultsListed(policies) &&
    sourceRows.some(
      (row) =>
        row.label === SOURCE_LABELS[reply.source] &&
        row.value === COPY.resultsCount(reply.results.length, reply.total),
    )
  );
}

function responseDuring(page, path, action) {
  return Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === path,
    ),
    Promise.resolve().then(action),
  ]);
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);
const url = args.url;
const out = args.out;
if (args["self-test"] === "true") {
  const reply = {
    source: "federal-register",
    results: [
      { sourceId: "federal-register", identifier: "one", matchKey: null },
    ],
    total: 7,
  };
  const row = {
    label: "Federal Register",
    value: "1 listings loaded; 7 reported by source",
  };
  assert(searchOutcomes(reply, "1 policy listed.", [row]));
  assert(!searchOutcomes(reply, "2 policies listed.", [row]));
  assert(
    !searchOutcomes(reply, "1 policy listed.", [
      { ...row, value: "1 listings loaded; 8 reported by source" },
    ]),
  );
  assert(
    !searchOutcomes(reply, "1 policy listed.", [{ ...row, label: "GovInfo" }]),
  );
  const mergedReply = {
    ...reply,
    total: null,
    results: [
      { ...reply.results[0], identifier: "a", matchKey: "fr:2099-00001" },
      { ...reply.results[0], identifier: "b", matchKey: "fr:2099-00001" },
      { ...reply.results[0], identifier: "c" },
    ],
  };
  const mergedRows = [{ ...row, value: "3 listings loaded" }];
  assert(searchOutcomes(mergedReply, "2 policies listed.", mergedRows));
  assert(!searchOutcomes(mergedReply, "3 policies listed.", mergedRows));
  const guard = requestGuard(
    "http://127.0.0.1:4185/?api=http://127.0.0.1:4185",
  );
  assert(!guard.permit("https://example.invalid/api/search", "GET", "fetch"));
  assert(!guard.permit("http://127.0.0.1:4185/api/search", "POST", "fetch"));
  assert(guard.permit("http://127.0.0.1:4185/api/search", "GET", "fetch"));
  assert(!guard.permit("http://127.0.0.1:4185/api/search", "GET", "fetch"));
  assert(!guard.permit("http://127.0.0.1:4185/api/unknown", "GET", "fetch"));
  for (const [path, limit] of [
    ["sources", 2],
    ["policy", 1],
  ]) {
    for (let count = 0; count < limit; count++)
      assert(guard.permit(`http://127.0.0.1:4185/api/${path}`, "GET", "fetch"));
    assert(!guard.permit(`http://127.0.0.1:4185/api/${path}`, "GET", "fetch"));
  }
  assert(
    guard.permit("http://127.0.0.1:4185/demo-assets/main.js", "GET", "script"),
  );
  for (let count = 1; count < 80; count += 1)
    assert(
      guard.permit(
        "http://127.0.0.1:4185/demo-assets/main.js",
        "GET",
        "script",
      ),
    );
  assert(
    !guard.permit("http://127.0.0.1:4185/demo-assets/main.js", "GET", "script"),
  );
  assert.equal(guard.staticRequests.count, 80);
  for (const origin of ["http://localhost:80", "http://127.0.0.1:00080"]) {
    const normalized = requestGuard(`http://127.0.0.1/?api=${origin}`);
    assert(
      normalized.permit(`${new URL(origin).origin}/api/search`, "GET", "fetch"),
    );
  }
  const unhandled = [];
  const observeUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", observeUnhandled);
  try {
    const missingResponse = new Error("Response timeout");
    await assert.rejects(
      responseDuring(
        { waitForResponse: () => Promise.reject(missingResponse) },
        "/api/search",
        () => new Promise(() => {}),
      ),
      (error) => error === missingResponse,
    );
    const triggerFailure = new Error("Action failed");
    let rejectResponse;
    const pendingResponse = new Promise((_, reject) => {
      rejectResponse = reject;
    });
    await assert.rejects(
      responseDuring(
        { waitForResponse: () => pendingResponse },
        "/api/policy",
        () => {
          throw triggerFailure;
        },
      ),
      (error) => error === triggerFailure,
    );
    rejectResponse(missingResponse);
    const response = { url: () => "http://127.0.0.1/api/sources" };
    assert.deepEqual(
      await responseDuring(
        {
          waitForResponse: (matches) => {
            assert(matches(response));
            return Promise.resolve(response);
          },
        },
        "/api/sources",
        () => "navigation response",
      ),
      [response, "navigation response"],
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", observeUnhandled);
  }
  console.log(
    "PASS source/count, request guard and response/trigger controls; no browser or network opened.",
  );
  process.exit(0);
}
if (!url || !out) {
  console.error("Usage: --url <page url> --out <folder>");
  process.exit(2);
}
mkdirSync(dirname(resolve(out)), { recursive: true });
mkdirSync(out);
const coreRoot = process.env.PLAYWRIGHT_CORE
  ? resolve(process.env.PLAYWRIGHT_CORE)
  : null;
const require = createRequire(
  coreRoot ? join(coreRoot, "index.js") : import.meta.url,
);
if (
  coreRoot &&
  (JSON.parse(readFileSync(join(coreRoot, "package.json"), "utf8")).name !==
    "playwright-core" ||
    require.resolve("playwright-core") !== join(coreRoot, "index.js"))
)
  throw new Error(
    "PLAYWRIGHT_CORE must resolve to the installed playwright-core package.",
  );
const { chromium, webkit } = require("playwright-core");
const axeSource = readFileSync(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
);

const results = [];
const receipt = {
  startedAt: new Date().toISOString(),
  url,
  browser: args.browser ?? "chromium",
  results,
  completed: false,
};
const persist = () =>
  writeFileSync(join(out, "receipt.json"), JSON.stringify(receipt, null, 2));
persist();
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  persist();
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

const flat = (value) => String(value).replace(/\s+/g, " ").trim();
const compact = (value) => String(value).replace(/\s+/g, "");
/** Names of the facts a text does not carry: a string as written, or a pattern. */
const lacks = (text, facts) =>
  Object.entries(facts)
    .filter(([, fact]) =>
      fact instanceof RegExp ? !fact.test(text) : !text.includes(flat(fact)),
    )
    .map(([name]) => name)
    .join(", ");
// -raw keeps each label beside its value; -layout pairs the two columns of a
// field table by position and mispairs them. Xpdf builds default to Latin-1.
const pdfText = (file) =>
  execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", file, "-"], {
    encoding: "utf8",
  });

let browser;
try {
  if (args["fail-probe"] === "true") {
    check(
      "controlled failing child",
      false,
      "Intentional receipt/exit probe; no browser or network opened.",
    );
    throw new Error("CONTROLLED_FAILURE");
  }
  const selectedBrowser = args.browser ?? "chromium";
  const executablePath = args.executable;
  if (!["chromium", "chrome", "brave", "webkit"].includes(selectedBrowser))
    throw new Error("Unsupported browser selection");
  if (selectedBrowser === "brave" && !executablePath)
    throw new Error("Brave requires its installed executable via --executable");
  if (executablePath && !existsSync(executablePath))
    throw new Error(`Installed ${selectedBrowser} unavailable`);
  browser = await (selectedBrowser === "webkit" ? webkit : chromium).launch({
    ...(executablePath
      ? { executablePath }
      : selectedBrowser === "chrome"
        ? { channel: "chrome" }
        : {}),
  });
  receipt.browserVersion = browser.version();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    serviceWorkers: "block",
  });
  const guard = requestGuard(url);
  const blockedRequests = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (
      !guard.permit(request.url(), request.method(), request.resourceType())
    ) {
      blockedRequests.push(
        new URL(request.url()).origin + new URL(request.url()).pathname,
      );
      await route.abort();
      return;
    }
    try {
      const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        blockedRequests.push(
          `Redirect blocked: ${new URL(request.url()).origin}${new URL(request.url()).pathname}`,
        );
        await route.abort();
        return;
      }
      await route.fulfill({ response });
    } catch {
      blockedRequests.push(
        `Transport failed: ${new URL(request.url()).origin}${new URL(request.url()).pathname}`,
      );
      await route.abort().catch(() => {});
    }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on(
    "console",
    (m) => m.type() === "error" && consoleErrors.push(m.text()),
  );
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  const calls = guard.calls;
  receipt.requests = calls;
  receipt.staticRequests = guard.staticRequests;
  receipt.blockedRequests = blockedRequests;

  // Waits that answer instead of throwing, so one missing thing is one failed check.
  const appears = (locator) =>
    locator.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    );
  const holds = (condition, arg) =>
    page.waitForFunction(condition, arg, { timeout: 5000 }).then(
      () => true,
      () => false,
    );
  const themeIs = (theme) =>
    holds((name) => document.documentElement.dataset.theme === name, theme);
  const opensApart = async (link, href) =>
    (await link.getAttribute("href")) === href &&
    (await link.getAttribute("target")) === "_blank" &&
    /noopener/.test((await link.getAttribute("rel")) ?? "") &&
    /noreferrer/.test((await link.getAttribute("rel")) ?? "");
  const runAxe = async (name) => {
    const { violations } = await page.evaluate(() =>
      axe.run(document, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      }),
    );
    check(
      name,
      violations.length === 0,
      violations.map((v) => `${v.id}x${v.nodes.length}`).join(", "),
    );
  };
  /** Panes on screen, width left unused beside them, and how far the page itself scrolls. */
  const frame = () =>
    page.evaluate(() => ({
      panes: [...document.querySelectorAll("main > .pane")].filter(
        (pane) => pane.getClientRects().length,
      ).length,
      spare:
        window.innerWidth -
        document.querySelector("main").getBoundingClientRect().width,
      scrollX:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      scrollY:
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    }));

  const [sourceReply, response] = await responseDuring(
    page,
    "/api/sources",
    () => page.goto(url, { waitUntil: "networkidle" }),
  );
  const catalog = sourceReply.ok()
    ? ((await sourceReply.json()).sources ?? [])
    : [];
  const federal = catalog.filter((s) => s.level === "federal");
  const states = catalog.filter((s) => s.level === "state");
  check(
    "source service returned a successful response",
    catalog.some((s) => s.id === "washington" && s.status === "live"),
  );
  // The page shows the service's label and the document prints SOURCE_LABELS: one name for each source.
  const renamed = catalog.filter((s) => s.label !== SOURCE_LABELS[s.id]);
  check(
    "source service names each source as the document does",
    catalog.length > 0 && renamed.length === 0,
    renamed.map((s) => `${s.id}: ${s.label}`).join(", "),
  );
  check(
    "page loads with status 200",
    response?.status() === 200,
    String(response?.status()),
  );
  const version = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).version;
  const heading = flat(await page.locator("header h1").innerText());
  check(
    "header names the product, the demo and the version, on the dark theme",
    [COPY.appName, COPY.appMode, version].every((part) =>
      heading.includes(part),
    ) && (await themeIs("dark")),
    heading,
  );
  await page.addScriptTag({ content: axeSource });

  // Footer strip: the short limits and the framework line in the bottom corner.
  const foot = page.getByRole("contentinfo");
  const footGaps = lacks(flat(await foot.innerText()), {
    "working demo": /working demo/i,
    "in development": /in development/i,
    "sources incomplete": /sources incomplete/i,
    "not legal advice": /not legal advice/i,
    "no tracking": /no tracking/i,
  });
  check(
    "footer strip states the limits and links the framework",
    footGaps === "" &&
      (await opensApart(
        foot.getByRole("link", { name: COPY.tsdfLink, exact: true }),
        TSDF_URL,
      )),
    footGaps,
  );

  // About and Limits dialog.
  const aboutButton = page.getByRole("button", {
    name: COPY.aboutButton,
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: COPY.aboutButton });
  const dialogShutWithFocusBack = () =>
    holds(
      (opener) =>
        !document.querySelector("dialog").open &&
        document.activeElement?.textContent === opener,
      COPY.aboutButton,
    );
  await aboutButton.click();
  check("About and Limits opens as a dialog", await appears(dialog));
  const aboutGaps = lacks(flat(await page.locator("dialog").innerText()), {
    status: `Policy Sentinel ${version} is in development`,
    "working demo": /working demo/i,
    "not legal advice": /not legal advice/i,
    coverage: /incomplete and may be delayed/,
    "automated rules": /automated demo rules/,
    "no Nation relationship": /establish no relationship to any Nation/,
    privacy: /no tracking, analytics, or cookies/,
    framework: /Tiered Sovereign Data Framework \(TSDF\) 0\.9\.8/,
    tier: /Tier 0 \(T0\)/,
    ...Object.fromEntries(
      catalog.flatMap((s) => [
        [`${s.id} label`, s.label],
        [`${s.id} note`, s.note],
      ]),
    ),
  });
  check(
    "dialog states what the demo is, its limits, each source, privacy and the framework",
    aboutGaps === "" &&
      (await opensApart(
        dialog.getByRole("link", { name: COPY.tsdfLink, exact: true }),
        TSDF_URL,
      )) &&
      (await opensApart(
        dialog.getByRole("link", { name: COPY.repoLink, exact: true }),
        REPO_URL,
      )),
    aboutGaps,
  );
  await runAxe("axe finds no WCAG A/AA violations (dialog open)");
  await dialog
    .getByRole("button", { name: COPY.aboutClose, exact: true })
    .click();
  check(
    "Close shuts the dialog and returns focus to its button",
    await dialogShutWithFocusBack(),
  );
  await aboutButton.click();
  await page.keyboard.press("Escape");
  check(
    "Escape shuts the dialog and returns focus to its button",
    await dialogShutWithFocusBack(),
  );

  // Search scope: federal checkboxes, then the state select. No request is made here.
  const scopeChips = page.getByRole("group", { name: COPY.scopeLabel });
  const federalChip = scopeChips.getByRole("button", {
    name: COPY.scopeFederal,
    exact: true,
  });
  const stateChip = scopeChips.getByRole("button", {
    name: COPY.scopeState,
    exact: true,
  });
  const searchButton = page.getByRole("button", {
    name: COPY.searchButton,
    exact: true,
  });
  let federalOk =
    (await federalChip.getAttribute("aria-pressed")) === "true" &&
    (await page
      .getByRole("group", { name: COPY.sourcesLegend })
      .getByRole("checkbox")
      .count()) === federal.length;
  for (const s of federal) {
    const box = page.getByRole("checkbox", { name: s.label });
    const live = s.status === "live";
    federalOk &&=
      (await box.isEnabled()) === live &&
      (await box.isChecked()) === (live && s.id === "federal-register");
  }
  check(
    "federal scope has one checkbox per source: only live ones can be checked, Federal Register is",
    federalOk,
  );
  await stateChip.click();
  const stateSelect = page.getByLabel(COPY.stateLabel, { exact: true });
  const stateNote = page.locator("#state-note");
  check(
    "state scope lists every state source in one select",
    (await appears(stateSelect)) &&
      (await stateChip.getAttribute("aria-pressed")) === "true" &&
      (
        await stateSelect
          .locator("option")
          .evaluateAll((options) => options.map((option) => option.value))
      ).join() === states.map((s) => s.id).join(),
  );
  check(
    "service answers (sources load with Washington live)",
    (await stateSelect.inputValue()) === "washington" &&
      flat(await stateNote.locator(".status").innerText()) === COPY.liveTitle,
  );
  const offState = states.find((s) => s.status !== "live");
  if (offState) {
    await stateSelect.selectOption(offState.id);
    check(
      "a state that is not available stays selectable, shows its note and turns Search off",
      (await stateSelect.inputValue()) === offState.id &&
        flat(await stateNote.innerText()).includes(flat(offState.note)) &&
        (await searchButton.isDisabled()) &&
        (await searchButton.getAttribute("aria-describedby")) === "state-note",
      offState.label,
    );
  } else
    check(
      "a state that is not available stays selectable, shows its note and turns Search off",
      true,
      "not exercised: every state source is live",
    );
  await federalChip.click();

  // Search, through the deployed Worker: one request, to the Federal Register.
  const example = EXAMPLES[0];
  const [searchResponse] = await responseDuring(page, "/api/search", () =>
    page.getByRole("button", { name: example.label, exact: true }).click(),
  );
  const rows = page.locator(".result");
  await rows.first().waitFor({ timeout: 30000 });
  const resultCount = await rows.count();
  check(
    "federal register search returns results",
    resultCount > 0,
    `${resultCount} results`,
  );
  const outcome = flat(
    await page.locator(".pane-results").getByRole("status").innerText(),
  );
  const searchReply = await searchResponse.json();
  const sourceRows = await page
    .locator(".source-outcomes > li > .row")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        label: row.querySelector(".row-k")?.textContent.trim(),
        value: row.querySelector(".row-v")?.textContent.trim(),
      })),
    );
  check(
    "results announce policy count and separately name source loaded/provider counts",
    searchOutcomes(searchReply, outcome, sourceRows),
    JSON.stringify({ outcome, sourceRows }),
  );
  const firstTitle = await rows.first().locator("h3").innerText();

  // Select a policy and bind all output assertions to this exact response.
  const [policyResponse] = await responseDuring(page, "/api/policy", () =>
    rows.first().getByRole("button", { name: COPY.showIssues }).click(),
  );
  const issueItems = page.locator(".issue");
  await issueItems.first().waitFor({ timeout: 45000 });
  const expectedPolicy = await policyResponse.json();
  const { citation, engine, receipt: textReceipt } = expectedPolicy;
  const issue = expectedPolicy.issues[0];
  check(
    "Show issues brings the Issues pane to the front",
    (await page.locator(".shell").getAttribute("data-pane")) === "issues" &&
      (await page.locator(".pane-issues").isVisible()),
  );
  const issues = await issueItems.count();
  check(
    "issues identified on the selected policy",
    issues > 0,
    `${issues} issues`,
  );
  const screenHash = await page.locator("dl.receipt code").first().innerText();
  check(
    "screen receipt equals the retrieved policy hash",
    screenHash.trim() === textReceipt.sha256,
  );

  // Cite it, include a passage, annotate. The text already read is reused: no second read.
  const passageNote = "Passage note from the browser check.";
  const policyNote = "Policy note from the browser check.";
  await rows.first().getByRole("button", { name: COPY.addCitation }).click();
  const reportChip = page.getByRole("button", {
    name: COPY.paneChip(COPY.paneLabels.report, 1),
    exact: true,
  });
  check(
    "adding a citation updates the Report chip count",
    await appears(reportChip),
  );
  await issueItems.first().getByLabel(COPY.includeInPdf).check();
  await issueItems.first().getByLabel(COPY.issueNote).fill(passageNote);
  await reportChip.click();
  check(
    "the Report chip brings the Report pane to the front in place of Issues",
    (await appears(page.locator(".pane-report"))) &&
      !(await page.locator(".pane-issues").isVisible()),
  );
  await page.getByLabel(COPY.citationNote).first().fill(policyNote);

  // Export waits for the five data actor entries.
  const actors = {
    name: "Browser Check",
    role: "Acceptance check",
    organization: "Example Organization",
    sharingWith: "Nobody; this is a test file",
    purpose: "Automated acceptance check of the demo page.",
  };
  const exportButton = page.getByRole("button", {
    name: COPY.exportPdf,
    exact: true,
  });
  const exportStatus = page
    .getByRole("region", { name: COPY.exportTitle, exact: true })
    .getByRole("status");
  await exportButton.click();
  const refusal = flat(await exportStatus.innerText());
  check(
    "export waits for the data actor entries, names them and moves focus to the first",
    refusal ===
      COPY.actorsMissing(Object.values(COPY.actorLabels).join(", ")) &&
      (await holds(() => document.activeElement?.id === "actor-name")),
    refusal,
  );
  for (const [field, value] of Object.entries(actors))
    await page.getByLabel(COPY.actorLabels[field], { exact: true }).fill(value);
  const entered = COPY.actorsCount(5, 5);
  check(
    "data actor entries read as complete once filled",
    flat(
      await page
        .getByRole("region", { name: COPY.actorsTitle, exact: true })
        .innerText(),
    ).includes(entered),
    entered,
  );

  // Export PDF.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    exportButton.click(),
  ]);
  const pdfPath = join(out, "export.pdf");
  await download.saveAs(pdfPath);
  const pdfBytes = readFileSync(pdfPath).toString("latin1");
  check(
    "PDF embeds the document fonts",
    /LeagueSpartan/.test(pdfBytes) && /LexendDeca/.test(pdfBytes),
  );
  const text = pdfText(pdfPath);
  const flatText = flat(text);
  // The running head and the footer are drawn last on each page. Without them a
  // passage that runs over a page break stays in one piece.
  const runningHead = `${COPY.docTitle} Policy Sentinel ${version}`;
  const body = compact(
    text
      .split(/[\n\f]/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line !== runningHead &&
          !(
            line.startsWith(COPY.limitsShort(version)) &&
            /Page \d+ of \d+$/.test(line)
          ),
      )
      .join("\n"),
  );
  check(
    "PDF names the version and development status",
    flatText.includes(`Policy Sentinel ${version}, in development`) &&
      flatText.toLowerCase().includes(COPY.docEyebrow(version).toLowerCase()),
  );
  check(
    "PDF carries the limitations",
    /not legal advice/i.test(flatText) &&
      /incomplete and may be delayed/.test(flatText) &&
      /miss passages or misread/.test(flatText),
  );
  check("PDF carries the citation title", body.includes(compact(firstTitle)));
  check(
    "PDF carries an official URL",
    /https:\/\/www\.federalregister\.gov\/d\//.test(body),
  );
  check(
    "PDF carries the quoted passage and notes",
    flatText.includes(passageNote) && flatText.includes(policyNote),
  );
  const L = COPY.docLabels;
  const A = COPY.actorLabels;
  const sourceLabel = SOURCE_LABELS[citation.sourceId];
  const [tsdfReference, toolReference] = atniReferences(version);
  // Each entry is a label and its value as the document sets them, side by side.
  for (const [name, expected] of Object.entries({
    "selected identifier": `${L.identifier}${citation.identifier}`,
    "selected source": `${L.source}${sourceLabel}`,
    "selected officialUrl": `${L.officialUrl}${citation.officialUrl}`,
    "selected quote": issue.quote,
    "selected locator": `${L.where}: ${issue.locator}`,
    "selected limits": `${L.limit}: ${issue.limits}`,
    "selected rule": `${L.rule}: ${issue.rule}`,
    "selected check": `${L.check}: ${issue.check}`,
    "provenance reference": `${COPY.docProvenanceTitle}${L.reference}[1]`,
    "provenance metadataRetrieved": `${L.metadataRetrieved}${citation.retrievedAt}`,
    "provenance textUrl": `${L.textReadFrom}${textReceipt.textUrl}`,
    "provenance textRetrieved": `${L.textRetrieved}${textReceipt.retrievedAt}`,
    "provenance hash": `${L.fingerprint}${COPY.docFingerprint(textReceipt.sha256, textReceipt.bytes)}`,
    "provenance parser": `${L.extractor}${engine.parser} ${engine.parserVersion}`,
    "provenance parserConfig": `${L.parserConfig}${engine.parserConfigDigest}`,
    "provenance rules": `${L.demoRules}${engine.rulesVersion}`,
    "cover preparer": `${L.preparedBy}${actors.name}, ${actors.role}`,
    "cover contents": `${COPY.docContentsTitle}1. ${firstTitle} [1]`,
    "data actor name": `${COPY.docActorsTitle}${COPY.docActorsIntro}${L.preparedBy}${actors.name}`,
    "data actor role": `${A.role}${actors.role}`,
    "data actor organization": `${A.organization}${actors.organization}`,
    "data actor sharingWith": `${A.sharingWith}${actors.sharingWith}`,
    "data actor purpose": `${A.purpose}${actors.purpose}`,
    "software tool": `${COPY.docSoftwareTitle}${L.tool}${COPY.docTool(version)}`,
    "software responsible person": `${L.responsible}${actors.name}`,
    "software sources": `${L.sourcesRead}${sourceLabel}`,
    "reference 1, the policy": `${COPY.docReferencesTitle}[1]${ieeeReference(citation)}`,
    "reference 2, the framework": `[2]${tsdfReference}`,
    "reference 3, the tool": `[3]${toolReference}`,
  }))
    check(`PDF retains ${name}`, body.includes(compact(expected)));
  const noteGaps = lacks(flatText, {
    heading: COPY.docSovereigntyTitle,
    "public policy": /public policy published by government sources/,
    framework:
      /Tiered Sovereign Data Framework \(TSDF\) 0\.9\.8, a pre-release standard/,
    tier: /Tier 0 \(T0\)/,
    // The demo has no Tribal source, and it cannot promise that a federal source carries no Tribal government document.
    "no Tribal source": /no Tribal code source and no Tribal government source/,
    "Tribal documents in federal sources": /does not detect or exclude/,
    "no certification": /claims no certification/,
    "no Nation relationship": /establish no relationship to any Nation/,
    verify: /Verify every citation at its official source/,
  });
  check(
    "PDF carries the data provenance and sovereignty notes",
    noteGaps === "",
    noteGaps,
  );
  check("PDF omits counterevidence", !/counterevidence/i.test(flatText));
  await page.evaluate(() => {
    window.__printEvents = [];
    window.addEventListener("beforeprint", () =>
      window.__printEvents.push("beforeprint"),
    );
    window.addEventListener("afterprint", () =>
      window.__printEvents.push("afterprint"),
    );
  });
  await page.getByRole("button", { name: COPY.printView, exact: true }).click();
  // Print view loads the document faces before it prints; wait for them too.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  receipt.printButtonEvents = await page.evaluate(() => window.__printEvents);
  if (selectedBrowser !== "webkit") {
    const printed = join(out, "browser-print.pdf");
    await page.pdf({ path: printed, format: "Letter", printBackground: true });
    const printedText = compact(pdfText(printed));
    for (const [name, expected] of Object.entries({
      hash: textReceipt.sha256,
      quote: issue.quote,
      note: policyNote,
      rules: engine.rulesVersion,
      config: engine.parserConfigDigest,
      preparer: `${L.preparedBy}${actors.name}, ${actors.role}`,
      "framework reference": tsdfReference,
      "sovereignty notes": COPY.docSovereigntyTitle,
    }))
      check(
        `browser print retains ${name}`,
        printedText.includes(compact(expected)),
      );
    receipt.printEvents = await page.evaluate(() => window.__printEvents);
    check(
      "real browser print lifecycle fires and restores screen",
      receipt.printEvents.includes("beforeprint") &&
        receipt.printEvents.includes("afterprint") &&
        (await page.getByRole("searchbox").isVisible()),
    );
  }
  await page.screenshot({
    path: join(out, "desktop-1280.png"),
    fullPage: true,
  });

  // The desktop frame: every pane the width has room for, the full width used, no page scroll.
  for (const [width, height, panes] of [
    [1366, 768, 3],
    [1920, 1080, 4],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(650); // past the 450 ms pane fade, so axe below measures contrast at rest
    const seen = await frame();
    check(
      `frame fills ${width}x${height} with ${panes} panes and no page scroll`,
      seen.panes === panes &&
        seen.spare < 1 &&
        seen.scrollX <= 0 &&
        seen.scrollY <= 0,
      JSON.stringify(seen),
    );
  }

  // Accessibility in both themes, with results, issues and the report on screen.
  await runAxe("axe finds no WCAG A/AA violations (desktop, dark theme)");
  await page.screenshot({ path: join(out, "desktop-1920.png") });
  await page
    .getByRole("button", { name: COPY.themeLight, exact: true })
    .click();
  check("theme switch turns the page light", await themeIs("light"));
  await runAxe("axe finds no WCAG A/AA violations (desktop, light theme)");
  await page.screenshot({ path: join(out, "desktop-1920-light.png") });
  await page.getByRole("button", { name: COPY.themeDark, exact: true }).click();
  check("theme switch returns to dark", await themeIs("dark"));

  // Start at a known control, then verify keyboard movement and visible focus.
  await page.getByRole("searchbox").focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const style = el ? getComputedStyle(el) : null;
    return {
      tag: el?.tagName,
      outline: style?.outlineStyle,
      width: style?.outlineWidth,
    };
  });
  check(
    "keyboard focus is visible",
    focused.outline !== "none" && focused.width !== "0px",
    JSON.stringify(focused),
  );

  // Narrow screens: no horizontal scroll, one pane at a time.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    check(
      `no horizontal scroll at ${width}px`,
      overflow <= 0,
      `overflow ${overflow}`,
    );
    if (width === 390) {
      await page
        .getByRole("button", {
          name: COPY.paneChip(COPY.paneLabels.search, null),
          exact: true,
        })
        .click();
      check(
        "narrow layout shows one pane at a time, switched by its chip, with no footer strip",
        (await appears(page.locator(".pane-search"))) &&
          (await frame()).panes === 1 &&
          !(await foot.isVisible()),
      );
      await page.screenshot({
        path: join(out, "mobile-390.png"),
        fullPage: true,
      });
    }
  }

  // Embed mode.
  await page.setViewportSize({ width: 800, height: 700 });
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}embed=1`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({ path: join(out, "embed.png"), fullPage: true });
  await aboutButton.click();
  check(
    "embed mode drops the footer strip and keeps the limits in the dialog",
    (await page.locator("footer").count()) === 0 &&
      (await appears(dialog)) &&
      /not legal advice/i.test(await page.locator("dialog").innerText()),
  );

  check(
    "no console errors",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(" | "),
  );
  receipt.requests = calls;
  check(
    "no request exceeded the pre-request allowlist or budget",
    blockedRequests.length === 0,
    blockedRequests.join(" | "),
  );
  check(
    "request budget kept: source catalog twice, one search, one policy read",
    calls["/api/sources"] === 2 &&
      calls["/api/search"] === 1 &&
      calls["/api/policy"] === 1,
    JSON.stringify(calls),
  );
  receipt.completed = true;
} catch (error) {
  check("runner completed without exception", false, String(error));
} finally {
  try {
    await browser?.close();
  } catch (error) {
    check("browser cleanup", false, String(error));
  }
  receipt.endedAt = new Date().toISOString();
  persist();
}
const failed = results.filter((r) => !r.ok);
receipt.passed = receipt.completed && failed.length === 0;
persist();
console.log(
  `\n${results.length - failed.length} passed, ${failed.length} failed`,
);
process.exit(failed.length ? 1 : 0);
