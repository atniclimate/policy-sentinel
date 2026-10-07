/* global document, getComputedStyle, window */
// End-to-end check of the live demo in a real browser, against the deployed Worker.
// Usage: node scripts/verify-demo-browser.mjs --url <page url> --out <folder>
// Needs playwright-core (set PLAYWRIGHT_CORE to its folder) and pdftotext on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);
const url = args.url;
const out = args.out;
if (!url || !out) {
  console.error("Usage: --url <page url> --out <folder>");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
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
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on(
    "console",
    (m) => m.type() === "error" && consoleErrors.push(m.text()),
  );
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  const sourceResponse = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/sources",
  );
  const response = await page.goto(url, { waitUntil: "networkidle" });
  const sourceReply = await sourceResponse;
  check(
    "source service returned a successful response",
    sourceReply.ok() &&
      (await sourceReply.json()).sources?.some(
        (s) => s.id === "washington" && s.status === "live",
      ),
  );
  check(
    "page loads with status 200",
    response?.status() === 200,
    String(response?.status()),
  );
  const version = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).version;
  check(
    "page names the version and development status",
    (await page.locator(".status").innerText()).includes(
      `Policy Sentinel ${version} is in development`,
    ),
  );
  check(
    "service answers (sources load with Washington live)",
    (await page
      .locator("label.source", { hasText: "Washington Legislature" })
      .locator(".badge")
      .innerText()) === "Live",
  );

  // Search, through the deployed Worker.
  await page.getByRole("button", { name: "Executive Order 13175" }).click();
  await page.locator(".result").first().waitFor({ timeout: 30000 });
  const resultCount = await page.locator(".result").count();
  check(
    "federal register search returns results",
    resultCount > 0,
    `${resultCount} results`,
  );
  const firstTitle = await page.locator(".result h3").first().innerText();

  // Select a policy and bind all output assertions to this exact response.
  const policyResponse = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/policy",
  );
  await page
    .locator(".result")
    .first()
    .getByRole("button", { name: /Show issues/ })
    .click();
  await page.locator(".issue").first().waitFor({ timeout: 45000 });
  const expectedPolicy = await (await policyResponse).json();
  const issues = await page.locator(".issue").count();
  check(
    "issues identified on the selected policy",
    issues > 0,
    `${issues} issues`,
  );
  const screenHash = await page.locator("dl.receipt code").first().innerText();
  check(
    "screen receipt equals the retrieved policy hash",
    screenHash.trim() === expectedPolicy.receipt.sha256,
  );

  // Cite it, include a passage, annotate.
  await page
    .locator(".result")
    .first()
    .getByRole("button", { name: /Add to my citations/ })
    .click();
  await page.locator(".cited li").first().waitFor();
  await page.locator(".issue").first().getByLabel("Include in PDF").check();
  await page
    .locator(".issue")
    .first()
    .getByLabel("Your note on this passage")
    .fill("Passage note from the browser check.");
  await page
    .locator(".cited li textarea")
    .first()
    .fill("Policy note from the browser check.");

  // Export PDF.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.getByRole("button", { name: "Export PDF" }).click(),
  ]);
  const pdfPath = join(out, "export.pdf");
  await download.saveAs(pdfPath);
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
  });
  const flat = text.replace(/\s+/g, " ");
  check(
    "PDF names the version and development status",
    flat.includes(`Policy Sentinel ${version}, in development`),
  );
  check(
    "PDF carries the limitations",
    /not legal advice/i.test(flat) &&
      /incomplete or delayed/.test(flat) &&
      /miss passages or misread/.test(flat),
  );
  check(
    "PDF carries the citation title",
    flat.includes(firstTitle.replace(/\s+/g, " ")),
  );
  check(
    "PDF carries an official URL",
    /https:\/\/www\.federalregister\.gov\/d\//.test(flat),
  );
  check(
    "PDF carries a retrieved-at date",
    flat.includes(
      `Metadata retrieved ${expectedPolicy.citation.retrievedAt}`,
    ) && flat.includes(`Text retrieved ${expectedPolicy.receipt.retrievedAt}`),
  );
  check(
    "PDF carries the quoted passage and notes",
    flat.includes("Passage note from the browser check.") &&
      flat.includes("Policy note from the browser check."),
  );
  const compactText = text.replace(/\s+/g, "");
  for (const [name, expected] of Object.entries({
    source: expectedPolicy.citation.sourceId,
    identifier: expectedPolicy.citation.identifier,
    officialUrl: expectedPolicy.citation.officialUrl,
    hash: expectedPolicy.receipt.sha256,
    textUrl: expectedPolicy.receipt.textUrl,
    textRetrieved: expectedPolicy.receipt.retrievedAt,
    parser: expectedPolicy.engine.parser,
    parserVersion: expectedPolicy.engine.parserVersion,
    parserConfig: expectedPolicy.engine.parserConfigDigest,
    rules: expectedPolicy.engine.rulesVersion,
    quote: expectedPolicy.issues[0].quote,
    locator: expectedPolicy.issues[0].locator,
    limits: expectedPolicy.issues[0].limits,
  }))
    check(
      `PDF retains selected ${name}`,
      compactText.includes(String(expected).replace(/\s+/g, "")),
    );
  check("PDF omits counterevidence", !/counterevidence/i.test(flat));
  await page.evaluate(() => {
    window.__printEvents = [];
    window.addEventListener("beforeprint", () =>
      window.__printEvents.push("beforeprint"),
    );
    window.addEventListener("afterprint", () =>
      window.__printEvents.push("afterprint"),
    );
  });
  await page.getByRole("button", { name: "Print view", exact: true }).click();
  receipt.printButtonEvents = await page.evaluate(() => window.__printEvents);
  if (selectedBrowser !== "webkit") {
    const printed = join(out, "browser-print.pdf");
    await page.pdf({ path: printed, format: "Letter", printBackground: true });
    const printedText = execFileSync("pdftotext", ["-layout", printed, "-"], {
      encoding: "utf8",
    }).replace(/\s+/g, "");
    for (const [name, expected] of Object.entries({
      hash: expectedPolicy.receipt.sha256,
      quote: expectedPolicy.issues[0].quote,
      note: "Policy note from the browser check.",
      rules: expectedPolicy.engine.rulesVersion,
      config: expectedPolicy.engine.parserConfigDigest,
    }))
      check(
        `browser print retains ${name}`,
        printedText.includes(expected.replace(/\s+/g, "")),
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

  // Accessibility, with the results and issues on screen.
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(() =>
    axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }),
  );
  check(
    "axe finds no WCAG A/AA violations (desktop)",
    axe.violations.length === 0,
    axe.violations.map((v) => `${v.id}x${v.nodes.length}`).join(", "),
  );

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

  // Narrow screens: no horizontal scroll.
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
    if (width === 390)
      await page.screenshot({
        path: join(out, "mobile-390.png"),
        fullPage: true,
      });
  }

  // Embed mode.
  await page.setViewportSize({ width: 800, height: 700 });
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}embed=1`, {
    waitUntil: "networkidle",
  });
  check(
    "embed mode hides the long introduction",
    (await page.locator(".intro").count()) === 0,
  );
  await page.screenshot({ path: join(out, "embed.png"), fullPage: true });

  check(
    "no console errors",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(" | "),
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
