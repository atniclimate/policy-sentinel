import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { readLocalOutput } from "../src/pipeline/policy-local-output.mjs";
import { digest, writePolicyDerived } from "../src/pipeline/policy-custody.mjs";
import {
  observeCleanup,
  sealBrowserReport,
} from "../src/pipeline/policy-assurance.mjs";

const downloadCancellationTasks = [];

// Uses an explicitly supplied, already installed standards-based runtime. This
// command installs nothing, runs no source requests and changes no output pointer.
const rawArgs = process.argv.slice(2);
const smokeOnly = rawArgs.at(-1) === "--smoke-only";
const args = smokeOnly ? rawArgs.slice(0, -1) : rawArgs;
assert.deepEqual(
  args.filter((_, n) => n % 2 === 0),
  ["--corpus-root", "--playwright-core", "--browser"],
);
assert.equal(args.length, 6);
const [root, runtimeRoot, executablePath] = [args[1], args[3], args[5]].map(
  (value) => resolve(value),
);
const origin = "http://127.0.0.1:4181";
const runtime = JSON.parse(
  await readFile(join(runtimeRoot, "package.json"), "utf8"),
);
assert.equal(runtime.name, "playwright-core");
assert.equal(runtime.version, "1.61.1");
assert.equal(runtime.license, "Apache-2.0");
const require = createRequire(join(runtimeRoot, "index.js"));
assert.equal(require.resolve("playwright-core"), join(runtimeRoot, "index.js"));
const { chromium } = require("playwright-core");
const axeSource = await readFile(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
);
const axePackage = JSON.parse(
  await readFile(
    new URL("../node_modules/axe-core/package.json", import.meta.url),
    "utf8",
  ),
);
const output = await readLocalOutput(root);
const corpus = JSON.parse(output.files.get("corpus.json").toString("utf8"));
const report = {
  kind: "actual_local_browser_acceptance",
  version: "1.0.0",
  mode: smokeOnly ? "smoke_only" : "full_acceptance",
  scope: smokeOnly
    ? "Built workbench, dossier and evidence pages: desktop/mobile geometry, axe and page network only. Full user journeys are not exercised."
    : "Full desktop/mobile user journeys and built-page checks.",
  startedAt: new Date().toISOString(),
  origin,
  buildId: output.manifest.buildId,
  manifestDigest: output.manifestDigest,
  corpusDigest: corpus.contentDigest,
  corpusCounts: {
    works: corpus.works.length,
    versions: corpus.versions.length,
    segments: corpus.segments.length,
  },
  runtime: {
    package: runtime.name,
    version: runtime.version,
    license: runtime.license,
    axeVersion: axePackage.version,
  },
  controls: {
    freshContext: true,
    persistentUserProfile: false,
    serviceWorkers: "block",
    bypassCSP: false,
    allowedOrigin: origin,
    sourceNavigation: false,
    outputPointerMutation: false,
  },
  limitations: [
    "Observed network totals cover page/context requests, not a system-wide browser-internal packet capture.",
    "Automated axe and explicit keyboard/focus journeys do not certify every accessibility criterion or a screen-reader session.",
    "This local profile exposes dossier and JSON exports; no CSV export is implemented or claimed.",
    "Research and comparison cases are selected deterministically from this approved corpus, not from a new blind evaluation population.",
  ],
  checks: [],
  screenshots: [],
  contexts: [],
};
const artifactBase = `review/browser/run-${report.startedAt.replaceAll(/[^0-9]/g, "")}`;
const analyzed = new Set(corpus.analyses.map((entry) => entry.versionId));
const chain = corpus.works
  .map((work) => ({
    work,
    versions: corpus.versions.filter(
      (version) => version.workId === work.id && analyzed.has(version.id),
    ),
  }))
  .filter((entry) => entry.versions.length >= 2)
  .sort((a, b) => a.work.id.localeCompare(b.work.id))[0];
assert.ok(chain, "A reviewed same-work procedure comparison is required");
const versions = chain.versions
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .slice(0, 2);
report.selectedVersionIds = versions.map((entry) => entry.id);
const segmentMap = new Map(corpus.segments.map((entry) => [entry.id, entry]));
const workMap = new Map(corpus.works.map((entry) => [entry.id, entry]));
const renditionMap = new Map(
  corpus.renditions.map((entry) => [entry.id, entry]),
);
let browser;
let activePage;
let failure;
async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    report.checks.push({
      name,
      passed: true,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    throw error;
  }
}
async function triageCheck(name, fn) {
  await check(name, fn).catch((error) => {
    failure ??= error;
  });
}
async function screenshot(page, name, fullPage = false) {
  const bytes = await page.screenshot({
    type: "png",
    fullPage,
    animations: "disabled",
  });
  const artifact = await writePolicyDerived(
    root,
    `${artifactBase}/${name}.png`,
    bytes,
    { replace: false },
  );
  report.screenshots.push(artifact);
  process.stdout.write(
    `${JSON.stringify({ screenshot: artifact.path, digest: artifact.digest })}\n`,
  );
}
async function reviewContrastOverlap(page, name, incomplete) {
  const reviews = [];
  for (const rule of incomplete) {
    if (rule.id !== "color-contrast") continue;
    for (const node of rule.nodes) {
      if (
        ![...node.any, ...node.all, ...node.none].some(
          (check) => check.data?.messageKey === "bgOverlap",
        )
      )
        continue;
      const review = { target: node.target, originalRule: rule.id };
      reviews.push(review);
      if (node.target.length !== 1 || typeof node.target[0] !== "string") {
        review.error = "Target requires unsupported nested-frame/shadow review";
        continue;
      }
      const target = page.locator(node.target[0]);
      if ((await target.count()) !== 1) {
        review.error = "Original target no longer resolves uniquely";
        continue;
      }
      review.beforeScroll = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          scroll: { x: globalThis.scrollX, y: globalThis.scrollY },
          viewport: {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight,
          },
          element: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          },
        };
      });
      await target.evaluate((element) => {
        element.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "instant",
        });
      });
      review.visibility = await target.evaluate((element) => {
        const describe = (node) => ({
          tag: node.tagName,
          id: node.id,
          class: node.className,
        });
        const rectValue = (rect) => ({
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
        const ancestors = [];
        for (let current = element; current; current = current.parentElement) {
          const style = globalThis.getComputedStyle(current);
          ancestors.push({
            ...describe(current),
            color: style.color,
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            opacity: style.opacity,
            filter: style.filter,
            backdropFilter: style.backdropFilter,
            mixBlendMode: style.mixBlendMode,
            backgroundBlendMode: style.backgroundBlendMode,
            visibility: style.visibility,
            display: style.display,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
          });
        }
        const style = globalThis.getComputedStyle(element);
        const walker = globalThis.document.createTreeWalker(
          element,
          globalThis.NodeFilter.SHOW_TEXT,
        );
        const textRects = [];
        while (walker.nextNode()) {
          const text = walker.currentNode;
          if (!text.textContent.trim()) continue;
          const range = globalThis.document.createRange();
          range.selectNodeContents(text);
          for (const rect of range.getClientRects()) {
            if (rect.width <= 0 || rect.height <= 0) continue;
            const inViewport =
              rect.left >= 0 &&
              rect.right <= globalThis.innerWidth &&
              rect.top >= 0 &&
              rect.bottom <= globalThis.innerHeight;
            const points = inViewport
              ? [0.1, 0.5, 0.9].map((fraction) => {
                  const x = rect.left + rect.width * fraction;
                  const y = rect.top + rect.height / 2;
                  const top = globalThis.document.elementFromPoint(x, y);
                  return {
                    x,
                    y,
                    unobscured: Boolean(
                      top && (top === element || element.contains(top)),
                    ),
                    topElement: top ? describe(top) : null,
                  };
                })
              : [];
            textRects.push({ ...rectValue(rect), inViewport, points });
          }
        }
        // Keep whole-text range evidence above unchanged. A line-end range can
        // cover hanging whitespace, so independently identify every character
        // covering an obscured sample instead of treating it as hidden glyphs.
        const obscuredSamples = textRects.flatMap((rect) =>
          rect.points.filter((point) => !point.unobscured),
        );
        const characterWalker = globalThis.document.createTreeWalker(
          element,
          globalThis.NodeFilter.SHOW_TEXT,
        );
        const characterGeometry = [];
        let textNodeIndex = 0;
        while (characterWalker.nextNode()) {
          const text = characterWalker.currentNode;
          let offset = 0;
          for (const character of text.textContent) {
            const range = globalThis.document.createRange();
            range.setStart(text, offset);
            range.setEnd(text, offset + character.length);
            const rects = [...range.getClientRects()].map((rect) => {
              const positive = rect.width > 0 && rect.height > 0;
              const inViewport =
                positive &&
                rect.left >= 0 &&
                rect.right <= globalThis.innerWidth &&
                rect.top >= 0 &&
                rect.bottom <= globalThis.innerHeight;
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              const top = inViewport
                ? globalThis.document.elementFromPoint(x, y)
                : null;
              return {
                ...rectValue(rect),
                positive,
                inViewport,
                point: {
                  x,
                  y,
                  unobscured: Boolean(
                    top && (top === element || element.contains(top)),
                  ),
                  topElement: top ? describe(top) : null,
                },
              };
            });
            characterGeometry.push({
              character,
              codePoint: `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
              whitespace: /\s/u.test(character),
              textNodeIndex,
              startUtf16: offset,
              endUtf16: offset + character.length,
              rects,
            });
            offset += character.length;
          }
          textNodeIndex += 1;
        }
        const nonWhitespaceCharacters = characterGeometry.filter(
          (entry) => !entry.whitespace,
        );
        return {
          text: element.textContent,
          viewport: {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight,
          },
          scroll: { x: globalThis.scrollX, y: globalThis.scrollY },
          element: rectValue(element.getBoundingClientRect()),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          ancestors,
          textRects,
          allTextRectsInViewport:
            textRects.length > 0 && textRects.every((rect) => rect.inViewport),
          allSampledPointsUnobscured:
            textRects.length > 0 &&
            textRects.every(
              (rect) =>
                rect.inViewport &&
                rect.points.every((point) => point.unobscured),
            ),
          characterVisibility: {
            scope:
              "Per-character layout rectangles and center-point element hit tests; this does not inspect individual rasterized glyph pixels.",
            nonWhitespaceCharacters,
            allNonWhitespaceCharactersRenderedAndUnobscured:
              nonWhitespaceCharacters.length > 0 &&
              nonWhitespaceCharacters.every(
                (entry) =>
                  entry.rects.length > 0 &&
                  entry.rects.every(
                    (rect) =>
                      rect.positive && rect.inViewport && rect.point.unobscured,
                  ),
              ),
            originallyObscuredSamples: obscuredSamples.map((point) => ({
              point,
              coveringCharacters: characterGeometry.filter((entry) =>
                entry.rects.some(
                  (rect) =>
                    rect.positive &&
                    point.x >= rect.left &&
                    point.x <= rect.right &&
                    point.y >= rect.top &&
                    point.y <= rect.bottom,
                ),
              ),
            })),
          },
        };
      });
      const screenshotName = `${name}-contrast-review-${reviews.length}`;
      await screenshot(page, screenshotName);
      review.screenshot = report.screenshots.at(-1).path;
      review.targetedScan = await page.evaluate(async (selector) => {
        const result = await globalThis.axe.run(
          globalThis.document.querySelector(selector),
          {
            runOnly: { type: "rule", values: ["color-contrast"] },
          },
        );
        return {
          violations: result.violations,
          incomplete: result.incomplete,
          passes: result.passes,
          inapplicable: result.inapplicable,
        };
      }, node.target[0]);
    }
  }
  if (reviews.length) {
    report.contexts.at(-1).contrastFollowups ??= [];
    report.contexts.at(-1).contrastFollowups.push({
      originalScan: name,
      disposition: "independent_review_required",
      scope:
        "Original incomplete targets scrolled into view, sampled for occlusion, photographed and rescanned individually. Original incomplete results remain unresolved.",
      reviews,
    });
  }
}
async function axe(page, name) {
  // Automation evaluation leaves the served CSP intact; no script tag or
  // bypassCSP option is used to load the installed diagnostic library.
  await page.evaluate(axeSource);
  const result = await page.evaluate(async () => {
    const result = await globalThis.axe.run(globalThis.document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    return {
      violations: result.violations,
      incomplete: result.incomplete,
      passes: result.passes.length,
      inapplicable: result.inapplicable.length,
    };
  });
  report.contexts.at(-1).accessibility ??= [];
  report.contexts.at(-1).accessibility.push({ name, ...result });
  await reviewContrastOverlap(page, name, result.incomplete);
  assert.equal(result.violations.length, 0, `AXE_VIOLATIONS_${name}`);
}
async function noHorizontalOverflow(page) {
  const configuredWidth = page.viewportSize().width;
  const layout = await page.evaluate((configuredWidth) => {
    const rendered = (node) => {
      const style = globalThis.getComputedStyle(node);
      if (["hidden", "collapse"].includes(style.visibility)) return false;
      for (let current = node; current; current = current.parentElement) {
        const ancestorStyle = globalThis.getComputedStyle(current);
        if (
          ancestorStyle.display === "none" ||
          ancestorStyle.contentVisibility === "hidden"
        )
          return false;
        if (current.tagName === "DETAILS" && !current.open) {
          const summary = [...current.children].find(
            (child) => child.tagName === "SUMMARY",
          );
          if (node !== current && !summary?.contains(node)) return false;
        }
      }
      return node.getClientRects().length > 0;
    };
    const exceedsViewport = (rect) =>
      rect.width > 0 && (rect.left < -1 || rect.right > configuredWidth + 1);
    return {
      configuredWidth,
      innerWidth: globalThis.innerWidth,
      clientWidth: globalThis.document.documentElement.clientWidth,
      visualViewport: globalThis.visualViewport
        ? {
            width: globalThis.visualViewport.width,
            scale: globalThis.visualViewport.scale,
          }
        : null,
      width: globalThis.document.documentElement.scrollWidth,
      overflow: [...globalThis.document.querySelectorAll("body *")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rendered(node) && exceedsViewport(rect);
        })
        .slice(0, 20)
        .map((node) => ({
          tag: node.tagName,
          class: node.className,
          id: node.id,
          parentClass: node.parentElement?.className,
          width: node.getBoundingClientRect().width,
          left: node.getBoundingClientRect().left,
          right: node.getBoundingClientRect().right,
          whiteSpace: globalThis.getComputedStyle(node).whiteSpace,
          overflowWrap: globalThis.getComputedStyle(node).overflowWrap,
          minWidth: globalThis.getComputedStyle(node).minWidth,
        })),
      textOverflow: (() => {
        const walker = globalThis.document.createTreeWalker(
          globalThis.document.body,
          globalThis.NodeFilter.SHOW_TEXT,
        );
        const offenders = [];
        while (walker.nextNode() && offenders.length < 20) {
          const node = walker.currentNode;
          if (!node.textContent.trim() || !rendered(node.parentElement))
            continue;
          const range = globalThis.document.createRange();
          range.selectNodeContents(node);
          const rects = [...range.getClientRects()].filter(exceedsViewport);
          if (rects.length)
            offenders.push({
              tag: node.parentElement.tagName,
              class: node.parentElement.className,
              id: node.parentElement.id,
              left: Math.min(...rects.map((rect) => rect.left)),
              right: Math.max(...rects.map((rect) => rect.right)),
              sample: node.textContent.slice(0, 160),
              whiteSpace: globalThis.getComputedStyle(node.parentElement)
                .whiteSpace,
              overflowWrap: globalThis.getComputedStyle(node.parentElement)
                .overflowWrap,
            });
        }
        return offenders;
      })(),
    };
  }, configuredWidth);
  report.contexts.at(-1).layouts ??= [];
  report.contexts.at(-1).layouts.push({ url: page.url(), ...layout });
  assert.ok(layout.width <= configuredWidth + 1, "PAGE_HORIZONTAL_OVERFLOW");
  assert.ok(
    Math.abs(layout.clientWidth - configuredWidth) <= 1,
    "LAYOUT_VIEWPORT_WIDTH_MISMATCH",
  );
  assert.ok(
    Math.abs(layout.innerWidth - configuredWidth) <= 1,
    "EXPANDED_LAYOUT_VIEWPORT",
  );
  if (layout.visualViewport) {
    assert.ok(
      Math.abs(layout.visualViewport.width - configuredWidth) <= 1,
      "VISUAL_VIEWPORT_WIDTH_MISMATCH",
    );
    assert.ok(
      Math.abs(layout.visualViewport.scale - 1) < 0.001,
      "UNEXPECTED_VIEWPORT_SCALING",
    );
  }
  assert.deepEqual(layout.overflow, [], "VISIBLE_ELEMENT_HORIZONTAL_OVERFLOW");
  assert.deepEqual(layout.textOverflow, [], "VISIBLE_TEXT_HORIZONTAL_OVERFLOW");
}
async function openContext(name, viewport, mobile) {
  const context = await browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    acceptDownloads: false,
  });
  const observations = {
    name,
    viewport,
    requests: [],
    blocked: [],
    failed: [],
    pageErrors: [],
    consoleErrors: [],
    responses: [],
    downloads: [],
    responseDigests: [],
  };
  const digestTasks = [];
  report.contexts.push(observations);
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      observations.blocked.push({
        url: request.url(),
        type: request.resourceType(),
      });
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  await context.routeWebSocket("**/*", (socket) => {
    observations.blocked.push({ url: socket.url(), type: "websocket" });
    socket.close();
  });
  context.on("request", (request) =>
    observations.requests.push({
      url: request.url(),
      type: request.resourceType(),
      method: request.method(),
    }),
  );
  context.on("requestfailed", (request) =>
    observations.failed.push({
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  context.on("response", (response) => {
    observations.responses.push({
      url: response.url(),
      status: response.status(),
    });
    const url = new URL(response.url());
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const expected = output.files.get(file);
    if (url.origin === origin && expected && expected.length < 2 * 1024 ** 2) {
      digestTasks.push(
        response
          .body()
          .then((bytes) => {
            observations.responseDigests.push({
              file,
              digest: digest(bytes),
              expectedDigest: digest(expected),
              valid: bytes.equals(expected),
            });
          })
          .catch((error) => {
            observations.responseDigests.push({
              file,
              valid: false,
              error: error.message,
            });
          }),
      );
    }
  });
  context.on("page", (page) => {
    page.on("pageerror", (error) =>
      observations.pageErrors.push(error.message),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        observations.consoleErrors.push(message.text());
    });
    page.on("download", (download) => {
      observations.downloads.push(download.suggestedFilename());
      observeCleanup(downloadCancellationTasks, "download_cancel", () =>
        download.cancel(),
      );
    });
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(20000);
  return { context, page, observations, digestTasks };
}
async function search(page, query) {
  await page
    .getByRole("searchbox", { name: "Identifier, title, or question" })
    .fill(query);
  await page
    .getByRole("searchbox", { name: "Identifier, title, or question" })
    .press("Enter");
  await page
    .getByRole("heading", { name: "Matching source versions" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Matching source versions" })
      .evaluate((node) => node === globalThis.document.activeElement),
    true,
  );
}
async function resetFilters(page) {
  for (const label of [
    /^Source\b/,
    /^Government context\b/,
    /^Instrument class\b/,
  ])
    await page.getByRole("combobox", { name: label }).selectOption("");
  await page.getByLabel("As of date", { exact: true }).fill("");
}
async function allResultIds(page) {
  const more = page.getByRole("button", {
    name: "Show 20 more versions",
    exact: true,
  });
  let pages = 0;
  while (await more.count()) {
    assert.ok(pages++ < 100, "Pagination must terminate");
    await more.click();
  }
  const labels = await page.locator(".pw-select-version").allTextContents();
  return labels
    .map((label) => {
      const name = label
        .trim()
        .replace(/^Select /, "")
        .replace(/ for comparison$/, "");
      const matches = corpus.versions.filter(
        (version) => version.sourceVersionIdentifier === name,
      );
      assert.equal(
        matches.length,
        1,
        "Visible version label must resolve uniquely in this acceptance population",
      );
      return matches[0].id;
    })
    .sort();
}
async function verifyProcedureTable(page, selected) {
  const region = page.getByRole("region", {
    name: "Institutional procedure comparison",
    exact: true,
  });
  await region.waitFor();
  const text = await region.textContent();
  assert.ok(text.includes("source-linked-institutional-code-comparison"));
  assert.ok(
    text.includes(
      "An uncoded dimension is unknown, not evidence that a procedure is absent.",
    ),
  );
  const selectedAnalyses = corpus.analyses.filter((entry) =>
    selected.some((version) => version.id === entry.versionId),
  );
  assert.equal(selectedAnalyses.length, 2);
  const dimensions = [
    "actor",
    "action",
    "object",
    "modality",
    "trigger",
    "condition",
    "exception",
    "procedure",
    "review_requirement",
    "time_constraint",
  ];
  let unknowns = 0;
  for (const dimension of dimensions) {
    const row = region.getByRole("row").filter({
      has: page.getByRole("rowheader", {
        name: dimension.replaceAll("_", " "),
        exact: true,
      }),
    });
    assert.equal(await row.count(), 1);
    for (const analysis of selectedAnalyses) {
      const observation = row.locator("td > div").filter({
        has: page.locator("strong", { hasText: analysis.versionId }),
      });
      assert.equal(await observation.count(), 1);
      const observed = await observation.textContent();
      const codes = analysis.codes.filter(
        (entry) => entry.dimension === dimension,
      );
      assert.ok(
        observed.includes(
          `${analysis.versionId}: ${codes.length ? "coded" : "not coded unknown"}`,
        ),
      );
      for (const code of codes) assert.ok(observed.includes(code.value));
      for (const value of [
        analysis.method.id,
        analysis.method.version,
        analysis.reviewer.name,
        analysis.uncertainty,
      ])
        assert.ok(observed.includes(value));
      if (!codes.length) unknowns += 1;
    }
  }
  assert.ok(
    unknowns > 0,
    "Acceptance pair must exercise uncoded unknown dimensions",
  );
  return region;
}
async function evidence(page, trigger, expectedSegmentId) {
  await trigger.focus();
  await page.keyboard.press("Enter");
  const region = page.getByRole("region", {
    name: "Source evidence",
    exact: true,
  });
  await region.waitFor();
  assert.equal(
    await region
      .getByRole("heading", { name: "Source evidence" })
      .evaluate((node) => node === globalThis.document.activeElement),
    true,
  );
  const segmentId = await region
    .locator("dt", { hasText: /^Segment ID$/ })
    .evaluate((node) => node.nextElementSibling.textContent.trim());
  const segment = segmentMap.get(segmentId);
  assert.ok(segment, "Evidence segment belongs to approved corpus");
  if (expectedSegmentId) assert.equal(segmentId, expectedSegmentId);
  const rendition = renditionMap.get(segment.renditionId);
  const sourceText = Buffer.from(rendition.text)
    .subarray(segment.startByte, segment.endByte)
    .toString("utf8");
  const quote = await region.locator("blockquote").textContent();
  const characters = [...sourceText];
  assert.ok(characters.length > 0);
  assert.equal(
    quote,
    characters.slice(0, 1200).join("") + (characters.length > 1200 ? "…" : ""),
  );
  assert.equal(
    await region
      .getByText(
        "The displayed excerpt is truncated; the citation identifies the complete retained block.",
        { exact: true },
      )
      .count(),
    characters.length > 1200 ? 1 : 0,
  );
  const version = corpus.versions.find(
    (entry) => entry.id === rendition.versionId,
  );
  const profile = corpus.sourceProfiles.find(
    (entry) => entry.id === workMap.get(version.workId).sourceProfileId,
  );
  const expand = region.getByRole("button", {
    name: "Read the complete source block",
    exact: true,
  });
  assert.equal(
    await expand.count(),
    characters.length > 1200 && profile.uses.localDisplay === "full_text"
      ? 1
      : 0,
  );
  if (await expand.count()) {
    await expand.press("Enter");
    assert.equal(
      await region.locator("blockquote").textContent(),
      characters.slice(0, 200000).join("") +
        (characters.length > 200000 ? "…" : ""),
    );
  }
  const capture = corpus.captures.find(
    (entry) => entry.id === rendition.captureId,
  );
  assert.equal(
    await region
      .getByRole("link", { name: "Open originating source (new tab)" })
      .getAttribute("href"),
    capture.finalUrl,
  );
  if (rendition.omittedSourceLocators.length) {
    const text = await region.textContent();
    assert.ok(
      rendition.omittedSourceLocators.every((locator) =>
        text.includes(locator),
      ),
      "All retained omission boundaries are displayed",
    );
  }
  await region
    .getByText("Capture and replay evidence", { exact: true })
    .click();
  assert.ok((await region.textContent()).includes(segment.textDigest));
  const limitations = region.getByText("Rendition limitations and omissions", {
    exact: true,
  });
  if (await limitations.count()) {
    await limitations.press("Enter");
    assert.equal(
      await limitations.evaluate((node) => node.parentElement.open),
      true,
    );
  }
  return region;
}
try {
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-sync",
      "--no-default-browser-check",
    ],
  });
  report.runtime.browserVersion = browser.version();
  // Capture both viewport baselines before interaction checks can stop a run.
  for (const [name, viewport, mobile] of [
    ["desktop-smoke", { width: 1440, height: 1000 }, false],
    ["mobile-smoke", { width: 390, height: 844 }, true],
  ]) {
    const { context, page, digestTasks } = await openContext(
      name,
      viewport,
      mobile,
    );
    const initial = await page.goto(`${origin}/`, { waitUntil: "networkidle" });
    assert.equal(initial.status(), 200);
    const csp = initial.headers()["content-security-policy"];
    assert.ok(
      csp && !csp.includes("unsafe-inline") && !csp.includes("unsafe-eval"),
    );
    await page
      .getByRole("heading", { name: "Policy evidence workbench", exact: true })
      .waitFor();
    await screenshot(page, name);
    if (smokeOnly) {
      await triageCheck(
        `${name}: workbench configured viewport geometry`,
        async () => noHorizontalOverflow(page),
      );
      await triageCheck(`${name}: workbench axe`, async () =>
        axe(page, `${name}-workbench`),
      );
      for (const file of ["dossier.html", "evidence.html"]) {
        const response = await page.goto(`${origin}/${file}`, {
          waitUntil: "networkidle",
        });
        assert.equal(response.status(), 200);
        await page.locator("h1").waitFor();
        await screenshot(page, `${name}-${file.replace(".html", "")}`);
        await triageCheck(
          `${name}: ${file} configured viewport geometry`,
          async () => noHorizontalOverflow(page),
        );
        await triageCheck(`${name}: ${file} axe`, async () =>
          axe(page, `${name}-${file}`),
        );
      }
    } else {
      await check(`${name}: configured viewport geometry`, async () =>
        noHorizontalOverflow(page),
      );
    }
    await Promise.all(digestTasks);
    await context.close();
    activePage = null;
  }
  for (const [name, viewport, mobile] of smokeOnly
    ? []
    : [
        ["desktop", { width: 1440, height: 1000 }, false],
        ["mobile", { width: 390, height: 844 }, true],
      ]) {
    const { context, page, observations, digestTasks } = await openContext(
      name,
      viewport,
      mobile,
    );
    await check(`${name}: approved built assets and CSP`, async () => {
      const response = await page.goto(`${origin}/`, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200);
      const csp = response.headers()["content-security-policy"];
      assert.ok(
        csp && !csp.includes("unsafe-inline") && !csp.includes("unsafe-eval"),
      );
      observations.csp = csp;
      await page
        .getByRole("heading", {
          name: "Policy evidence workbench",
          exact: true,
        })
        .waitFor();
      await Promise.all(digestTasks);
      assert.ok(observations.responseDigests.every((entry) => entry.valid));
      for (const file of ["index.html", "local-profile.json"])
        assert.ok(
          observations.responseDigests.some(
            (entry) => entry.file === file && entry.valid,
          ),
        );
      assert.ok(
        observations.responseDigests.some(
          (entry) => /\.js$/.test(entry.file) && entry.valid,
        ),
      );
      assert.ok(
        observations.responseDigests.some(
          (entry) => /\.css$/.test(entry.file) && entry.valid,
        ),
      );
      assert.ok(
        (await page.locator("footer").textContent()).includes(
          corpus.contentDigest,
        ),
      );
      assert.ok(
        observations.responses.some(
          (entry) => entry.url.endsWith("/corpus.json") && entry.status === 200,
        ),
      );
      assert.ok(
        observations.responses.some(
          (entry) =>
            /\/assets\/.*\.css$/.test(entry.url) && entry.status === 200,
        ),
      );
    });
    await screenshot(page, `${name}-initial`);
    await check(
      `${name}: responsive layout and automated accessibility`,
      async () => {
        await noHorizontalOverflow(page);
        await axe(page, `${name}-initial`);
      },
    );
    await check(`${name}: keyboard skip focus`, async () => {
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .getByRole("link", { name: "Skip to main content" })
          .evaluate((node) => node === globalThis.document.activeElement),
        true,
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page
          .locator("main")
          .evaluate((node) => node === globalThis.document.activeElement),
        true,
      );
      await page.getByRole("link", { name: "Skip to policy search" }).focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await page
          .locator("#main-content")
          .evaluate((node) => node === globalThis.document.activeElement),
        true,
      );
    }).catch((error) => {
      // Skip navigation is independent of search and evidence. Retain the
      // failing result while exercising those other paths in the same run.
      failure ??= error;
    });
    await check(`${name}: keyboard search and result focus`, async () => {
      await search(page, chain.work.sourceIdentifier);
      assert.ok(
        (await page.locator(".pw-result-card").first().textContent()).includes(
          "Why shown: exact source identifier",
        ),
      );
      for (const version of versions)
        assert.equal(
          await page
            .getByRole("checkbox", {
              name: `Select ${version.sourceVersionIdentifier} for comparison`,
              exact: true,
            })
            .count(),
          1,
        );
    });
    await check(
      `${name}: exact evidence, custody and focus return`,
      async () => {
        const trigger = page
          .getByRole("button", { name: /^Inspect passage 1 ·/ })
          .first();
        const region = await evidence(page, trigger);
        const limitations = region.getByText(
          "Rendition limitations and omissions",
          { exact: true },
        );
        if (await limitations.count()) {
          const list = limitations.locator("..").locator("ul");
          await list.evaluate((node) =>
            node.scrollIntoView({
              block: "center",
              inline: "nearest",
              behavior: "instant",
            }),
          );
          const view = await list.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            return {
              warnings: [...node.children].map((child) => child.textContent),
              viewport: {
                width: globalThis.innerWidth,
                height: globalThis.innerHeight,
              },
              scroll: { x: globalThis.scrollX, y: globalThis.scrollY },
              list: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
              },
            };
          });
          assert.ok(
            view.list.left >= 0 && view.list.right <= view.viewport.width,
          );
          assert.ok(
            view.list.top >= 0 && view.list.bottom <= view.viewport.height,
            "Evidence warning list requires additional bounded screenshots if taller than the viewport",
          );
          await screenshot(page, `${name}-evidence-limitations`);
          observations.evidenceDisclosureViews ??= [];
          observations.evidenceDisclosureViews.push({
            ...view,
            screenshot: report.screenshots.at(-1).path,
          });
        }
        await region
          .getByRole("heading", { name: "Source evidence" })
          .scrollIntoViewIfNeeded();
        await screenshot(page, `${name}-evidence`);
        await noHorizontalOverflow(page);
        await axe(page, `${name}-evidence`);
        await region
          .getByRole("button", { name: "Close evidence" })
          .press("Enter");
        assert.equal(
          await trigger.evaluate(
            (node) => node === globalThis.document.activeElement,
          ),
          true,
        );
      },
    );
    await check(`${name}: source filter and explicit date cutoff`, async () => {
      await resetFilters(page);
      await search(page, "");
      assert.deepEqual(
        await allResultIds(page),
        corpus.versions.map((entry) => entry.id).sort(),
      );
      for (const [label, field] of [
        [/^Source\b/, "sourceProfileId"],
        [/^Government context\b/, "governmentContext"],
        [/^Instrument class\b/, "instrumentClass"],
      ]) {
        await resetFilters(page);
        const value = chain.work[field];
        const expected = corpus.versions
          .filter((version) => workMap.get(version.workId)[field] === value)
          .map((entry) => entry.id)
          .sort();
        assert.ok(
          expected.length > 0 && expected.length < corpus.versions.length,
        );
        await page.getByRole("combobox", { name: label }).selectOption(value);
        await search(page, "");
        assert.deepEqual(await allResultIds(page), expected);
      }
      const dated = corpus.versions
        .filter(
          (version) =>
            version.dates.publication.precision === "day" &&
            ["unknown", "day"].includes(version.dates.sourceVersion.precision),
        )
        .map((version) => ({
          version,
          date: [
            version.dates.publication.value,
            version.dates.sourceVersion.value,
          ]
            .filter(Boolean)
            .sort()
            .at(-1),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const earlier = dated[0];
      const later = dated.findLast(
        (entry) =>
          entry.date > earlier.date &&
          workMap.get(entry.version.workId).sourceProfileId ===
            workMap.get(earlier.version.workId).sourceProfileId,
      );
      assert.ok(
        later,
        "Known earlier and later dates from one profile are required",
      );
      await resetFilters(page);
      await page
        .getByRole("combobox", { name: /^Source\b/ })
        .selectOption(workMap.get(earlier.version.workId).sourceProfileId);
      await page.getByLabel("As of date", { exact: true }).fill(earlier.date);
      await search(page, "");
      assert.equal(
        await page
          .getByRole("checkbox", {
            name: `Select ${earlier.version.sourceVersionIdentifier} for comparison`,
            exact: true,
          })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("checkbox", {
            name: `Select ${later.version.sourceVersionIdentifier} for comparison`,
            exact: true,
          })
          .count(),
        0,
      );
      assert.ok(
        (await page.locator(".pw-notice").allTextContents())
          .join(" ")
          .includes(`${later.version.id}: future source version`),
      );
      const unknown = chain.versions.find(
        (version) =>
          version.dates.publication.value === null &&
          version.dates.sourceVersion.value === null,
      );
      assert.ok(unknown, "Unknown source availability must remain explicit");
      await page
        .getByRole("combobox", { name: /^Source\b/ })
        .selectOption(chain.work.sourceProfileId);
      await search(page, chain.work.sourceIdentifier);
      const diagnostics = (
        await page.locator(".pw-notice").allTextContents()
      ).join(" ");
      assert.ok(
        diagnostics.includes(`${unknown.id}: unknown source availability`),
      );
      assert.ok(
        !diagnostics.includes(later.version.id),
        "Date diagnostics must obey the selected source filter",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Compare text versions", exact: true })
          .isDisabled(),
        true,
      );
      await resetFilters(page);
      await search(page, chain.work.sourceIdentifier);
    });
    await check(
      `${name}: same-work text and institutional comparisons`,
      async () => {
        for (const version of versions) {
          const checkbox = page.getByRole("checkbox", {
            name: `Select ${version.sourceVersionIdentifier} for comparison`,
            exact: true,
          });
          await checkbox.focus();
          await page.keyboard.press("Space");
          assert.equal(await checkbox.isChecked(), true);
        }
        await page
          .getByRole("button", { name: "Compare text versions", exact: true })
          .press("Enter");
        const text = page.getByRole("region", {
          name: "Text comparison result",
          exact: true,
        });
        await text.waitFor();
        const comparisonText = await text.textContent();
        assert.ok(
          versions.every((version) => comparisonText.includes(version.id)),
        );
        assert.ok(
          (await text.textContent()).includes(
            "Unaligned blocks do not establish corresponding provisions",
          ),
        );
        const unchanged = text.locator("summary", {
          hasText: "Unchanged exact text matches",
        });
        await unchanged.press("Enter");
        assert.ok(
          await unchanged
            .locator("..")
            .getByRole("button", { name: /^Before evidence/ })
            .count(),
        );
        assert.ok(
          await unchanged
            .locator("..")
            .getByRole("button", { name: /^After evidence/ })
            .count(),
        );
        await page
          .getByRole("button", {
            name: "Compare institutional procedures",
            exact: true,
          })
          .press("Enter");
        const procedures = await verifyProcedureTable(page, versions);
        assert.ok(
          await procedures
            .getByRole("button", { name: /^Read evidence/ })
            .count(),
        );
        await procedures.scrollIntoViewIfNeeded();
        await screenshot(page, `${name}-procedures`);
        await noHorizontalOverflow(page);
        await axe(page, `${name}-comparisons`);
      },
    );
    await check(
      `${name}: cross-government institutional comparison`,
      async () => {
        const first = corpus.analyses[0];
        const firstVersion = corpus.versions.find(
          (version) => version.id === first.versionId,
        );
        const second = corpus.analyses.find(
          (analysis) =>
            workMap.get(
              corpus.versions.find(
                (version) => version.id === analysis.versionId,
              ).workId,
            ).governmentContext !==
            workMap.get(firstVersion.workId).governmentContext,
        );
        assert.ok(second, "Different government contexts are required");
        const pair = [
          firstVersion,
          corpus.versions.find((version) => version.id === second.versionId),
        ];
        await resetFilters(page);
        await search(page, "");
        await allResultIds(page);
        for (const version of pair) {
          const checkbox = page.getByRole("checkbox", {
            name: `Select ${version.sourceVersionIdentifier} for comparison`,
            exact: true,
          });
          await checkbox.focus();
          await page.keyboard.press("Space");
          assert.equal(await checkbox.isChecked(), true);
        }
        assert.equal(
          await page
            .getByRole("button", { name: "Compare text versions", exact: true })
            .isDisabled(),
          true,
        );
        await page
          .getByRole("button", {
            name: "Compare institutional procedures",
            exact: true,
          })
          .press("Enter");
        const procedures = await verifyProcedureTable(page, pair);
        assert.ok(pair.every((version) => workMap.has(version.workId)));
        const text = await procedures.textContent();
        for (const version of pair)
          assert.ok(
            text.includes(workMap.get(version.workId).governmentContext),
          );
        report.crossGovernmentVersionIds = pair.map((version) => version.id);
        await procedures.scrollIntoViewIfNeeded();
        await screenshot(page, `${name}-cross-government`);
        await noHorizontalOverflow(page);
        await axe(page, `${name}-cross-government`);
      },
    );
    await check(
      `${name}: provisional finding and counterevidence drilldown`,
      async () => {
        const findings = page.getByRole("region", {
          name: "Provisional findings and counterevidence",
          exact: true,
        });
        assert.equal(
          await findings.locator("article").count(),
          corpus.findings.length,
        );
        const first = corpus.findings[0];
        const buttons = findings
          .locator("article")
          .first()
          .getByRole("button", { name: /^Read evidence/ });
        for (const [index, id] of [
          [0, first.supportingSegmentIds[0]],
          [first.supportingSegmentIds.length, first.contrarySegmentIds[0]],
        ]) {
          assert.ok(
            id,
            "A source-linked support and contrary passage is required",
          );
          const trigger = buttons.nth(index);
          const region = await evidence(page, trigger, id);
          await region
            .getByRole("button", { name: "Close evidence" })
            .press("Enter");
          assert.equal(
            await trigger.evaluate(
              (node) => node === globalThis.document.activeElement,
            ),
            true,
          );
        }
        const coverage = page.getByRole("region", {
          name: "Coverage and source health",
          exact: true,
        });
        assert.equal(
          await coverage.locator("article").count(),
          corpus.coverage.length,
        );
      },
    );
    await check(
      `${name}: dossier, evidence anchors and JSON exports`,
      async () => {
        assert.equal(
          await page
            .getByRole("link", { name: "Open corpus JSON", exact: true })
            .getAttribute("href"),
          "./corpus.json",
        );
        await page
          .getByRole("link", { name: "Open local dossier", exact: true })
          .click();
        await page.waitForURL(`${origin}/dossier.html`);
        assert.equal(
          await page.locator("#source-facts article").count(),
          corpus.relationships.length,
        );
        assert.equal(
          await page.locator("#procedure-coding article").count(),
          corpus.analyses.length,
        );
        assert.equal(
          await page.locator("#findings article").count(),
          corpus.findings.length,
        );
        await noHorizontalOverflow(page);
        await axe(page, `${name}-dossier`);
        await screenshot(page, `${name}-dossier`);
        const links = await page
          .locator('a[href^="evidence.html#"]')
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute("href")),
          );
        assert.ok(links.length > 0);
        assert.ok(links.every((href) => segmentMap.has(href.split("#")[1])));
        await page.locator('a[href^="evidence.html#"]').first().click();
        const id = new URL(page.url()).hash.slice(1);
        const article = page.locator(`[id="${id}"]`);
        await article.waitFor();
        const segment = segmentMap.get(id);
        const rendition = renditionMap.get(segment.renditionId);
        assert.equal(
          await article.locator("blockquote").textContent(),
          Buffer.from(rendition.text)
            .subarray(segment.startByte, segment.endByte)
            .toString("utf8"),
        );
        await noHorizontalOverflow(page);
        await axe(page, `${name}-evidence-export`);
        await screenshot(page, `${name}-evidence-export`);
        await page.goto(`${origin}/dossier.html`);
        await page.emulateMedia({ media: "print" });
        assert.equal(await page.locator("h1").isVisible(), true);
        await screenshot(page, `${name}-dossier-print`);
        await page.emulateMedia({ media: "screen" });
        for (const file of ["research.json", "corpus.json"]) {
          assert.equal(await page.locator(`a[href="${file}"]`).count(), 1);
          // Hash inside the actual browser response, avoiding Chromium's small
          // inspector body cache for the full export. No body is logged.
          const exported = await page.evaluate(async (file) => {
            const response = await globalThis.fetch(file, {
              credentials: "omit",
              cache: "no-store",
              redirect: "error",
            });
            const bytes = await response.arrayBuffer();
            const hash = await globalThis.crypto.subtle.digest(
              "SHA-256",
              bytes,
            );
            return {
              status: response.status,
              bytes: bytes.byteLength,
              digest: [...new Uint8Array(hash)]
                .map((value) => value.toString(16).padStart(2, "0"))
                .join(""),
            };
          }, `./${file}`);
          assert.equal(exported.status, 200);
          assert.equal(exported.bytes, output.files.get(file).length);
          assert.equal(exported.digest, digest(output.files.get(file)));
          observations.exports ??= [];
          observations.exports.push({ file, ...exported });
        }
      },
    );
    await check(`${name}: page network and runtime errors`, async () => {
      assert.deepEqual(observations.blocked, []);
      assert.deepEqual(observations.failed, []);
      assert.deepEqual(observations.pageErrors, []);
      assert.deepEqual(observations.consoleErrors, []);
      assert.deepEqual(observations.downloads, []);
      assert.ok(
        observations.requests.every(
          (entry) => new URL(entry.url).origin === origin,
        ),
      );
      assert.ok(observations.responses.every((entry) => entry.status === 200));
    });
    await Promise.all(digestTasks);
    await context.close();
    activePage = null;
  }
  await check("all contexts: exact served bytes and page network", async () => {
    for (const observations of report.contexts) {
      for (const key of [
        "blocked",
        "failed",
        "pageErrors",
        "consoleErrors",
        "downloads",
      ])
        assert.deepEqual(observations[key], []);
      assert.ok(
        observations.requests.every(
          (entry) => new URL(entry.url).origin === origin,
        ),
      );
      assert.ok(observations.responses.every((entry) => entry.status === 200));
      assert.ok(observations.responseDigests.every((entry) => entry.valid));
    }
    report.networkTotals = {
      contexts: report.contexts.length,
      pageRequests: report.contexts.reduce(
        (sum, entry) => sum + entry.requests.length,
        0,
      ),
      blocked: 0,
      failed: 0,
      pageErrors: 0,
      consoleErrors: 0,
      externalPageRequests: 0,
    };
  });
} catch (error) {
  failure = error;
  report.failure = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  if (activePage && !activePage.isClosed())
    await screenshot(activePage, "failure").catch((error) => {
      report.screenshotError = error.message;
    });
} finally {
  try {
    const artifact = await sealBrowserReport({
      report,
      failure,
      smokeOnly,
      close: () => browser?.close(),
      downloadTasks: downloadCancellationTasks,
      persist: (value) =>
        writePolicyDerived(
          root,
          `${artifactBase}/report.json`,
          Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
          { replace: false },
        ),
    });
    process.stdout.write(
      `${JSON.stringify({ report: artifact.path, digest: artifact.digest, passed: report.passed, checks: report.checks.length, screenshots: report.screenshots.length })}\n`,
    );
  } catch {
    process.exitCode = 1;
    process.stdout.write(
      `${JSON.stringify({ passed: false, failure: Boolean(failure), cleanupErrors: report.cleanupErrors, persistenceError: report.persistenceError })}\n`,
    );
  }
}
if (!report.passed) process.exitCode = 1;
