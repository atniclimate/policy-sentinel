/* global document, getComputedStyle */
// End-to-end check of the live demo in a real browser, against the deployed Worker.
// Usage: node scripts/verify-demo-browser.mjs --url <page url> --out <folder>
// Needs playwright-core (set PLAYWRIGHT_CORE to its folder) and pdftotext on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

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
const require = createRequire(import.meta.url);
const core =
  process.env.PLAYWRIGHT_CORE ??
  "C:/Users/PatrickFreeland/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core";
const { chromium } = require(core);
const axeSource = readFileSync(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
);

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const response = await page.goto(url, { waitUntil: "networkidle" });
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

// Select a policy and read issues.
await page
  .locator(".result")
  .first()
  .getByRole("button", { name: /Show issues/ })
  .click();
await page.locator(".issue").first().waitFor({ timeout: 45000 });
const issues = await page.locator(".issue").count();
check(
  "issues identified on the selected policy",
  issues > 0,
  `${issues} issues`,
);
const receipt = await page.locator("dl.receipt code").innerText();
check("receipt carries a SHA-256", /^[0-9a-f]{64}$/.test(receipt.trim()));

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
check("PDF carries the citation title", flat.includes(firstTitle.slice(0, 30)));
check(
  "PDF carries an official URL",
  /https:\/\/www\.federalregister\.gov\/d\//.test(flat),
);
check(
  "PDF carries a retrieved-at date",
  /Retrieved\s+20\d\d-\d\d-\d\dT/.test(flat),
);
check(
  "PDF carries the quoted passage and notes",
  flat.includes("Passage note from the browser check.") &&
    flat.includes("Policy note from the browser check."),
);
check("PDF omits counterevidence", !/counterevidence/i.test(flat));
await page.screenshot({ path: join(out, "desktop-1280.png"), fullPage: true });

// Accessibility, with the results and issues on screen.
await page.addScriptTag({ content: axeSource });
const axe = await page.evaluate(() =>
  // eslint-disable-next-line no-undef
  axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }),
);
check(
  "axe finds no WCAG A/AA violations (desktop)",
  axe.violations.length === 0,
  axe.violations.map((v) => `${v.id}x${v.nodes.length}`).join(", "),
);

// Keyboard: tab reaches the search box and a visible focus ring exists.
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
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length} passed, ${failed.length} failed`,
);
process.exit(failed.length ? 1 : 0);
