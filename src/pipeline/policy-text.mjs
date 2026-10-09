// Build-time extraction only. parse5 8.0.1 (MIT); saxes 6.0.0 (ISC).
// Reviewed parser options/entity handling and exact-version license on 2026-09-05.
// Neither dependency executes markup or retrieves external resources here.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { TextDecoder } from "node:util";
import { URL } from "node:url";
import { parse } from "parse5";
import { SaxesParser } from "saxes";

const CONFIG = Object.freeze({
  html: "parse5@8.0.1:scriptingDisabled:locationsEnabled",
  xml: "saxes@6.0.0:xmlns:XML1.0:noDTD:noPI:noCustomEntities",
  encoding: "UTF-8-fatal",
  offsets: "canonical-rendition-UTF8-bytes-half-open",
  whitespace: "flow-collapse:pre-LF:blocks-double-LF",
  controls:
    "govinfo-NUL-line-runs-or-bounded-Presidential-frontmatter-omit:v2:other-controls-forbidden",
  printedPages: "govinfo-standalone-page-marker-to-locator:running-header-omit",
  amendmentMarkers: "[[INSERTION]];[[/INSERTION]];[[DELETION]];[[/DELETION]]",
  filtering:
    "policy-text-exclusions-v3:coordinate-token-boundaries:sentence-period",
  identity: "policy-text-source-identity-v2:bounded-legacy-underline-header",
  washingtonInventory:
    "unique-var-model-strict-JSON:documents-Bills-SessionLaws-htm:exact-work-and-substitute-suffix:v2",
  maxBytes: 32 * 1024 * 1024,
  maxNodes: 200000,
  maxDepth: 160,
});
export const POLICY_TEXT_PARSER = Object.freeze({
  id: "policy-text",
  version: "1.0.0",
  configDigest: createHash("sha256")
    .update(JSON.stringify(CONFIG))
    .digest("hex"),
});
const ACTIVE = new Set(
  "script style iframe frame frameset object embed applet svg math canvas template noscript form input button select textarea audio video source track link base".split(
    " ",
  ),
);
const CHROME = new Set(["header", "footer", "nav", "aside"]);
const BLOCK = new Set(
  "p div section article main h1 h2 h3 h4 h5 h6 pre ul ol li dl dt dd blockquote table thead tbody tfoot tr address hr bill billsection sectionnumber sectioncaption paragraph para title heading shorttitle billheading billtitle enactment clause row".split(
    " ",
  ),
);
const HEADINGS = new Set(
  "h1 h2 h3 h4 h5 h6 title heading shorttitle billheading billtitle sectioncaption".split(
    " ",
  ),
);
const CONTACT =
  /\b(?:FOR FURTHER INFORMATION CONTACT|CONTACT INFORMATION|PERSONAL CONTACT|STAFF CONTACT)\s*:/i;
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/i;
const PHONE =
  /(?:\+?1[ .-]?)?(?:\(\d{3}\)[ .-]?|\b\d{3}[ .-])\d{3}[ .-]\d{4}\b|\b(?:phone|telephone|tel|fax)\s*:\s*\+?[\d .()/-]{7,}/i;
const PRIVATE_LOCATION =
  /\b(?:parcel|tax[ -]lot|assessor(?:'s)?)\s*(?:identification|identifier|id\b|number|no\.|#)|\b(?:latitude|longitude)\s*[:=]\s*[+-]?\d|(?<![A-Za-z0-9_.])[+-]?\d{1,2}\.\d{3,}\s*[,;]\s*[+-]?\d{1,3}\.\d{3,}(?![A-Za-z0-9_]|\.\d)|\b\d{1,3}[°º]\s*\d[^\n]{0,20}\b[NEWS]\b|\bT\.?\s*\d{1,3}\s*[NS]\s*[,; ]+R\.?\s*\d{1,3}\s*[EW]\b|\b(?:legal description|metes and bounds)\s*:/i;
const ERROR_TITLE =
  /(?:^(?:404|403|500|502|503)$|access denied|request (?:blocked|rejected)|page not found|service unavailable|internal server error|just a moment|verify you are human|captcha|404\s+not found|403\s+forbidden|502\s+bad gateway)/i;

function fail(code) {
  const error = new Error(`Policy text extraction rejected: ${code}`);
  error.code = code;
  throw error;
}
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function safeUrl(value, base) {
  try {
    if (
      typeof value !== "string" ||
      value.length > 4096 ||
      [...value].some((c) => c.charCodeAt(0) < 32)
    )
      return null;
    const url = new URL(value, base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes(".") ||
      url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".local") ||
      /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
      url.hostname.includes(":")
    )
      return null;
    if (
      EMAIL.test(url.pathname + url.search) ||
      /(?:token|password|secret|api[_-]?key)=/i.test(url.search)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
function decode(bytes, mediaType, sourceKind, exclusions) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > CONFIG.maxBytes
  )
    fail("INVALID_BYTES");
  const charset = /charset\s*=\s*["']?([^;\s"']+)/i.exec(mediaType)?.[1];
  if (charset && !/^(?:utf-8|utf8|us-ascii)$/i.test(charset))
    fail("UNSUPPORTED_ENCODING");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8");
  }
  const pieces = [];
  const firstPage = text.indexOf("[[Page ");
  const executiveHeading = text.indexOf("Executive Order ");
  const presidentialFrontmatter =
    sourceKind === "govinfo_fr" &&
    /\[Federal Register Volume \d+[^\n]*\]/.test(text.slice(0, 2048)) &&
    /\[Presidential Documents\]/.test(text.slice(0, 2048)) &&
    firstPage > 0 &&
    firstPage < 2048 &&
    executiveHeading > firstPage &&
    executiveHeading < firstPage + 256 &&
    [...text.slice(0, firstPage)].filter((c) => c.charCodeAt(0) === 0).length <=
      32;
  let retainedStart = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 32 || [9, 10, 13].includes(code)) continue;
    const start = index;
    if (code !== 0 || sourceKind !== "govinfo_fr") fail("CONTROL_CHARACTER");
    while (text.charCodeAt(index + 1) === 0) index++;
    if (
      !(presidentialFrontmatter && index < firstPage) &&
      (index === start ||
        (!["\n", "\r"].includes(text[start - 1]) &&
          !["\n", "\r"].includes(text[index + 1])))
    )
      fail("CONTROL_CHARACTER");
    exclusions.push({
      reason: "source_nul_delimiter",
      sourceLocator: `source:utf8-byte[${Buffer.byteLength(text.slice(0, start), "utf8")}]`,
      count: index - start + 1,
    });
    pieces.push(text.slice(retainedStart, start));
    retainedStart = index + 1;
  }
  if (pieces.length) text = pieces.join("") + text.slice(retainedStart);
  if (
    text.includes("[[INSERTION]]") ||
    text.includes("[[DELETION]]") ||
    text.includes("[[/INSERTION]]") ||
    text.includes("[[/DELETION]]")
  )
    fail("RESERVED_AMENDMENT_MARKER");
  if (/<!\s*ENTITY\b/i.test(text) || /<!DOCTYPE[^>]*\[/i.test(text))
    fail("DTD_ENTITY_FORBIDDEN");
  return text;
}
function htmlTree(text, warnings) {
  const errors = new Set();
  const root = parse(text, {
    scriptingEnabled: false,
    sourceCodeLocationInfo: true,
    onParseError(error) {
      errors.add(error.code);
    },
  });
  // HTML doctypes are inert declarations, including legacy PUBLIC declarations.
  // parse5 has no external DTD/resource resolver. Internal subsets are rejected above.
  for (const code of [...errors].sort())
    if (code !== "missing-doctype") warnings.add(`html_parse:${code}`);
  return root;
}
function xmlTree(text) {
  if (/<!DOCTYPE/i.test(text)) fail("DTD_ENTITY_FORBIDDEN");
  const encoding = /^\s*<\?xml[^?]*encoding\s*=\s*["']([^"']+)/i.exec(
    text,
  )?.[1];
  if (encoding && !/^utf-?8$/i.test(encoding)) fail("UNSUPPORTED_ENCODING");
  const root = { nodeName: "#document", childNodes: [] };
  const stack = [root];
  let count = 1;
  const parser = new SaxesParser({
    xmlns: true,
    defaultXMLVersion: "1.0",
    forceXMLVersion: true,
  });
  parser.on("error", () => fail("MALFORMED_XML"));
  parser.on("doctype", () => fail("DTD_ENTITY_FORBIDDEN"));
  parser.on("processinginstruction", () =>
    fail("XML_PROCESSING_INSTRUCTION_FORBIDDEN"),
  );
  parser.on("opentag", (tag) => {
    if (++count > CONFIG.maxNodes || stack.length > CONFIG.maxDepth)
      fail("STRUCTURE_LIMIT");
    const node = {
      tagName: tag.local.toLowerCase(),
      nodeName: tag.name,
      attrs: Object.values(tag.attributes).map((attr) => ({
        name: attr.local.toLowerCase(),
        value: attr.value,
      })),
      childNodes: [],
    };
    stack.at(-1).childNodes.push(node);
    stack.push(node);
  });
  const addText = (value) => {
    if (++count > CONFIG.maxNodes) fail("STRUCTURE_LIMIT");
    stack.at(-1).childNodes.push({ nodeName: "#text", value });
  };
  parser.on("text", addText);
  parser.on("cdata", addText);
  parser.on("closetag", () => stack.pop());
  parser.write(text).close();
  return root;
}
function annotate(root) {
  const nodes = [];
  const pending = [{ node: root, path: "", depth: 0 }];
  while (pending.length) {
    const { node, path, depth } = pending.pop();
    if (nodes.length >= CONFIG.maxNodes || depth > CONFIG.maxDepth)
      fail("STRUCTURE_LIMIT");
    node.path = path || "/";
    node.attr = Object.fromEntries(
      (node.attrs ?? []).map(({ name, value }) => [name.toLowerCase(), value]),
    );
    nodes.push(node);
    const counters = new Map();
    const children = (node.childNodes ?? []).map((child) => {
      const name = child.tagName ?? child.nodeName;
      const index = (counters.get(name) ?? 0) + 1;
      counters.set(name, index);
      return {
        node: child,
        path: `${path}/${name}[${index}]`,
        depth: depth + 1,
      };
    });
    for (let index = children.length - 1; index >= 0; index--)
      pending.push(children[index]);
  }
  for (let index = nodes.length - 1; index >= 0; index--)
    nodes[index].hasBlock = (nodes[index].childNodes ?? []).some(
      (child) => BLOCK.has(child.tagName) || child.hasBlock,
    );
  return nodes;
}
function rawText(node) {
  if (node.nodeName === "#text") return node.value;
  if (ACTIVE.has(node.tagName)) return "";
  return (node.childNodes ?? []).map(rawText).join("");
}
function normalize(text, pre = false) {
  return pre
    ? text
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .trim()
    : text.replace(/\s+/g, " ").trim();
}
function removal(node) {
  if (ACTIVE.has(node.tagName)) return "active_markup";
  if (CHROME.has(node.tagName)) return "page_chrome";
  if (node.tagName === "address") return "personal_contact_block";
  const attr = node.attr;
  if (
    "hidden" in attr ||
    attr["aria-hidden"] === "true" ||
    /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr.style ?? "")
  )
    return "hidden_content";
  if (
    /\b(?:navigation|banner|contentinfo)\b/i.test(attr.role ?? "") ||
    /(?:^|[\s_-])(?:navbar|navigation|footer|header|cookie|breadcrumb|social|contact)(?:$|[\s_-])/i.test(
      `${attr.id ?? ""} ${attr.class ?? ""}`,
    )
  )
    return "page_chrome";
  return null;
}
function marker(node) {
  if (
    ["del", "strike", "s"].includes(node.tagName) ||
    /text-decoration(?:-line)?\s*:[^;]*line-through/i.test(
      node.attr.style ?? "",
    )
  )
    return "DELETION";
  if (
    ["ins", "u"].includes(node.tagName) ||
    /text-decoration(?:-line)?\s*:[^;]*underline/i.test(node.attr.style ?? "")
  )
    return "INSERTION";
  return null;
}

function strictModelJson(scriptText, start) {
  if (scriptText[start] !== "{") fail("INVENTORY_MODEL_NOT_JSON");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let end = -1;
  for (let index = start; index < scriptText.length; index++) {
    const char = scriptText[index];
    if (index - start > 8 * 1024 * 1024) fail("INVENTORY_MODEL_LIMIT");
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") {
      if (++depth > CONFIG.maxDepth) fail("INVENTORY_MODEL_LIMIT");
    } else if (char === "}" || char === "]") {
      if (--depth === 0) {
        end = index + 1;
        break;
      }
    }
  }
  if (end < 0 || !/^\s*;/.test(scriptText.slice(end)))
    fail("INVENTORY_MODEL_NOT_JSON");
  const literal = scriptText.slice(start, end);
  let value;
  try {
    value = JSON.parse(literal);
  } catch {
    fail("INVENTORY_MODEL_NOT_JSON");
  }
  // Duplicate object keys are not allowed to choose between conflicting source values.
  const stack = [];
  for (const match of literal.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\],:]/g)) {
    const token = match[0];
    if (token === "{") stack.push({ keys: new Set(), expectingKey: true });
    else if (token === "[") stack.push(null);
    else if (token === "}" || token === "]") stack.pop();
    else if (token === "," && stack.at(-1)) stack.at(-1).expectingKey = true;
    else if (token === ":" && stack.at(-1)) stack.at(-1).expectingKey = false;
    else if (token.startsWith('"') && stack.at(-1)?.expectingKey) {
      const key = JSON.parse(token);
      if (stack.at(-1).keys.has(key)) fail("INVENTORY_DUPLICATE_JSON_KEY");
      stack.at(-1).keys.add(key);
      stack.at(-1).expectingKey = false;
    }
  }
  return value;
}
function modelDeclarations(scriptText, node) {
  const declarations = [];
  let state = "code";
  let escaped = false;
  for (let index = 0; index < scriptText.length; index++) {
    const char = scriptText[index];
    const next = scriptText[index + 1];
    if (state === "line_comment") {
      if (char === "\n") state = "code";
      continue;
    }
    if (state === "block_comment") {
      if (char === "*" && next === "/") {
        state = "code";
        index++;
      }
      continue;
    }
    if (state !== "code") {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === state) state = "code";
      continue;
    }
    if (char === "/" && next === "/") {
      state = "line_comment";
      index++;
    } else if (char === "/" && next === "*") {
      state = "block_comment";
      index++;
    } else if (["'", '"', "`"].includes(char)) state = char;
    else if (
      (char === "v" || char === "l" || char === "c") &&
      !/[A-Za-z0-9_$]/.test(scriptText[index - 1] ?? "")
    ) {
      const match = /^(var|let|const)\s+model\s*=\s*/.exec(
        scriptText.slice(index),
      );
      if (match) {
        if (match[1] !== "var") fail("INVENTORY_MODEL_DECLARATION");
        declarations.push({ node, scriptText, start: index + match[0].length });
        index += match[0].length - 1;
      }
    }
  }
  return declarations;
}
function inventoryData(
  nodes,
  expectedIdentity,
  sourceUrl,
  exclusions,
  warnings,
) {
  const expected = /^Washington bill inventory (\d{4}) (\d{4}-\d{2})$/.exec(
    expectedIdentity,
  );
  if (!expected) return null;
  const declarations = [];
  for (const node of nodes.filter((entry) => entry.tagName === "script")) {
    const scriptText = (node.childNodes ?? [])
      .map((child) => child.value ?? "")
      .join("");
    declarations.push(...modelDeclarations(scriptText, node));
  }
  if (!declarations.length) return null;
  if (declarations.length !== 1) fail("AMBIGUOUS_INVENTORY_MODEL");
  const declaration = declarations[0];
  const model = strictModelJson(declaration.scriptText, declaration.start);
  const url = new URL(sourceUrl);
  if (
    !model ||
    typeof model !== "object" ||
    Array.isArray(model) ||
    String(model.billNumber) !== expected[1] ||
    model.biennium !== expected[2] ||
    url.searchParams.get("name") !== expected[1] ||
    url.searchParams.get("biennium") !== expected[2]
  )
    fail("SOURCE_IDENTITY_MISMATCH");
  if (!Array.isArray(model.documents) || model.documents.length > 1000)
    fail("INVALID_INVENTORY_DOCUMENTS");
  const baseLocator = `${declaration.node.path}::json-pointer=`;
  const documents = [];
  const ids = new Set();
  const field = (row, name, nullable = false) => {
    const value = row[name];
    if (nullable && (value === null || value === undefined)) return null;
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 2048 ||
      EMAIL.test(value) ||
      PHONE.test(value) ||
      PRIVATE_LOCATION.test(value) ||
      [...value].some((char) => char.charCodeAt(0) < 32)
    )
      fail("INVALID_INVENTORY_METADATA");
    return value;
  };
  for (const [index, row] of model.documents.entries()) {
    const sourceLocator = `${baseLocator}/documents/${index}`;
    if (!row || typeof row !== "object" || Array.isArray(row))
      fail("INVALID_INVENTORY_DOCUMENT");
    if (
      !["Bills", "Session Laws"].includes(row.documentType) ||
      row.extension !== ".htm"
    ) {
      exclusions.push({
        reason: "unselected_inventory_rendition",
        sourceLocator,
        count: 1,
      });
      continue;
    }
    if (
      row.documentClass !== "Bills" ||
      row.biennium !== expected[2] ||
      !new RegExp(`^${expected[1]}(?:-S[2-9]?)?$`).test(String(row.displayNum))
    )
      fail("SOURCE_IDENTITY_MISMATCH");
    const path = field(row, "path");
    const safe = safeUrl(path);
    if (!safe) fail("UNSAFE_INVENTORY_DOCUMENT_URL");
    const parsed = new URL(safe);
    const pathPattern = new RegExp(
      `^/biennium/${expected[2]}/Htm/Bills/(?:[^/]+/)*${expected[1]}(?:[-.][A-Za-z0-9-]+)*\\.htm$`,
      "i",
    );
    if (
      parsed.hostname !== "lawfilesext.leg.wa.gov" ||
      parsed.search ||
      parsed.hash ||
      /%2f|%5c/i.test(parsed.pathname) ||
      !pathPattern.test(parsed.pathname)
    )
      fail("UNSAFE_INVENTORY_DOCUMENT_URL");
    if (!Number.isSafeInteger(row.id) || row.id <= 0 || ids.has(row.id))
      fail("INVALID_INVENTORY_DOCUMENT_ID");
    ids.add(row.id);
    const sourceMetadata = {
      id: row.id,
      name: field(row, "name"),
      biennium: row.biennium,
      description: field(row, "description"),
      shortFriendlyName: field(row, "shortFriendlyName", true),
      longFriendlyName: field(row, "longFriendlyName", true),
      documentClass: row.documentClass,
      documentType: row.documentType,
      extension: row.extension,
      effectiveDate: field(row, "effectiveDate", true),
      lastModifiedDate: field(row, "lastModifiedDate", true),
      dateSemantics: "unqualified_provider_metadata",
    };
    documents.push({
      url: safe,
      text: `${sourceMetadata.name} — ${sourceMetadata.description}`,
      sourceLocator: `${sourceLocator}/path`,
      sourceMetadata,
    });
  }
  if (!documents.length) fail("NO_SELECTED_INVENTORY_DOCUMENTS");
  warnings.add(
    "inventory_dates_are_unqualified_provider_metadata_not_legal_effect_or_validated_publication",
  );
  warnings.add("inventory_retrieval_does_not_establish_completeness");
  exclusions.push({
    reason: "unselected_inventory_root_fields",
    sourceLocator: `${baseLocator}/`,
    count: Object.keys(model).filter(
      (key) => !["billNumber", "biennium", "documents"].includes(key),
    ).length,
  });
  return {
    documents,
    sourceLocator: `${baseLocator}/billNumber`,
    billNumber: expected[1],
    biennium: expected[2],
  };
}
function identityMatch(sourceKind, expected, blocks, title, url) {
  if (typeof expected !== "string" || !expected.trim() || expected.length > 256)
    fail("INVALID_EXPECTED_IDENTITY");
  if (
    ERROR_TITLE.test(title) ||
    blocks
      .slice(0, 2)
      .some((block) => ERROR_TITLE.test(block.text) && block.text.length < 300)
  )
    fail("SOURCE_ERROR_PAGE");
  const haystack = blocks.map((block) => block.text).join("\n");
  let block;
  let sourceValue = expected;
  if (sourceKind === "govinfo_fr") {
    if (!/^(?:\d{2}|\d{4})-\d{1,6}$/.test(expected))
      fail("INVALID_EXPECTED_IDENTITY");
    block = blocks.find((entry) =>
      [
        ...entry.text.matchAll(
          /(?:^|\n|\[)FR\s+Doc\.?\s*(?:No\.?\s*:?\s*)?((?:\d{2}|\d{4})-\d{1,6})(?!\d)/gi,
        ),
      ].some((match) => match[1] === expected),
    );
    const otherIds = [
      ...haystack.matchAll(
        /(?:^|\n|\[)FR\s+Doc\.?\s*(?:No\.?\s*:?\s*)?((?:\d{2}|\d{4})-\d{1,6})(?!\d)/gi,
      ),
    ].map((match) => match[1]);
    if (otherIds.some((id) => id !== expected))
      fail("AMBIGUOUS_SOURCE_IDENTITY");
  } else if (sourceKind === "washington_index") {
    const session = /^Washington session law chapter index (\d{4})$/.exec(
      expected,
    );
    const inventory = /^Washington bill inventory (\d{4}) (\d{4}-\d{2})$/.exec(
      expected,
    );
    if (session) {
      block = blocks.find(
        (entry) =>
          /session\s+law|chapter/i.test(entry.text) &&
          entry.text.includes(session[1]),
      );
      if (
        !block &&
        /session\s+law|chapter/i.test(title) &&
        title.includes(session[1])
      )
        block = blocks.find((entry) => /chapter/i.test(entry.text));
    } else if (inventory) {
      const parsedUrl = new URL(url);
      // An inventory is a discovery result, never a bill-content rendition.
      if (
        parsedUrl.searchParams.get("name") !== inventory[1] ||
        parsedUrl.searchParams.get("biennium") !== inventory[2]
      )
        fail("SOURCE_IDENTITY_MISMATCH");
      block = blocks.find(
        (entry) =>
          entry.text.includes(inventory[1]) &&
          /bill|HB|SB|document/i.test(entry.text),
      );
    } else fail("INVALID_EXPECTED_IDENTITY");
  } else {
    const bill =
      /^(?:Washington )?((?:E2?S|2?S|E)?(?:HB|SB)|House Bill|Senate Bill)?\s*(\d{4})(?:\s+(\d{4}-\d{2}))?$/i.exec(
        expected,
      );
    const chapter =
      /^(?:Washington )?(?:chapter|c\.?)(?:\s*)(\d+)[,\s]+(?:Laws of\s+)?(\d{4})$/i.exec(
        expected,
      );
    if (bill) {
      const sourceHeaders = blocks.slice(0, 11).flatMap((entry) =>
        [
          ...entry.text.matchAll(
            /(?:^|\n)\s*(?:_{3,}\s*)?(?:CERTIFICATION OF ENROLLMENT\s+)?((?:E2?S|2?S|E)?(?:HB|SB)|(?:ENGROSSED\s+|SECOND\s+|SUBSTITUTE\s+)*(?:HOUSE|SENATE)\s+BILL)\s*(?:No\.?\s*)?(\d{4})(?!\d)/gi,
          ),
        ].map((match) => ({
          entry,
          prefix: match[1],
          number: match[2],
          value: match[0].trim(),
        })),
      );
      const chamber = (prefix) =>
        /HOUSE|HB$/i.test(prefix) ? "house" : "senate";
      const expectedChamber = bill[1] ? chamber(bill[1]) : null;
      if (
        sourceHeaders.some(
          (header) =>
            header.number !== bill[2] ||
            (expectedChamber && chamber(header.prefix) !== expectedChamber),
        )
      )
        fail("AMBIGUOUS_SOURCE_IDENTITY");
      const variant = (prefix) =>
        /^(?:E2?S|2?S|E)?(?:HB|SB)$/i.test(prefix)
          ? prefix.toUpperCase()
          : `${/ENGROSSED/i.test(prefix) ? "E" : ""}${/SECOND/i.test(prefix) ? "2" : ""}${/SUBSTITUTE/i.test(prefix) ? "S" : ""}${chamber(prefix) === "house" ? "HB" : "SB"}`;
      const expectedVariant =
        bill[1] && !/^(?:HB|SB|House Bill|Senate Bill)$/i.test(bill[1])
          ? variant(bill[1])
          : null;
      const sourceHeader = sourceHeaders.find(
        (header) => header.number === bill[2],
      );
      if (
        sourceHeader &&
        expectedVariant &&
        variant(sourceHeader.prefix) !== expectedVariant
      )
        fail("SOURCE_IDENTITY_MISMATCH");
      block = sourceHeader?.entry;
      if (sourceHeader) sourceValue = sourceHeader.value;
      // A source body header, not a later policy cross-reference, establishes identity.
      if (bill[3] && !haystack.includes(bill[3]) && !url.includes(bill[3]))
        block = undefined;
    } else if (chapter) {
      const chapterHeaders = blocks.slice(0, 11).flatMap((entry) =>
        [
          ...entry.text.matchAll(
            /(?:^|\n)\s*(?:CERTIFICATION OF ENROLLMENT\s+)?CHAPTER\s+(\d+),?\s+(?:LAWS OF\s+)?(\d{4})\b/gi,
          ),
        ].map((match) => ({
          entry,
          number: match[1],
          year: match[2],
          value: match[0].trim(),
        })),
      );
      if (
        chapterHeaders.some(
          (header) =>
            header.number !== chapter[1] || header.year !== chapter[2],
        )
      )
        fail("AMBIGUOUS_SOURCE_IDENTITY");
      const chapterHeader = chapterHeaders.find(
        (header) => header.number === chapter[1] && header.year === chapter[2],
      );
      block = chapterHeader?.entry;
      if (chapterHeader) sourceValue = chapterHeader.value;
    } else fail("INVALID_EXPECTED_IDENTITY");
  }
  if (!block) fail("SOURCE_IDENTITY_MISMATCH");
  if (sourceKind === "washington_index") sourceValue = block.text;
  return {
    expected,
    matched: true,
    sourceValue,
    sourceLocator: block.locator.value,
  };
}

/** Deterministic extraction of already acquired bytes. No network or custody operations. */
export function extractPolicyText({
  bytes,
  mediaType,
  sourceKind,
  url,
  expectedIdentity,
  excludedBlockLocators = [],
}) {
  if (
    !Array.isArray(excludedBlockLocators) ||
    excludedBlockLocators.length > 200 ||
    excludedBlockLocators.some(
      (value) =>
        typeof value !== "string" ||
        value.length > 2048 ||
        !value.startsWith("/"),
    ) ||
    new Set(excludedBlockLocators).size !== excludedBlockLocators.length
  )
    fail("INVALID_REVIEWED_EXCLUSIONS");
  const selectedExclusions = [...excludedBlockLocators].sort();
  if (
    !["govinfo_fr", "washington_bill", "washington_index"].includes(sourceKind)
  )
    fail("UNSUPPORTED_SOURCE_KIND");
  if (
    typeof mediaType !== "string" ||
    ![
      "text/html",
      "application/xhtml+xml",
      "application/xml",
      "text/xml",
    ].includes(mediaType.split(";")[0].trim().toLowerCase())
  )
    fail("UNSUPPORTED_MEDIA_TYPE");
  const sourceUrl = safeUrl(url);
  if (!sourceUrl) fail("UNSAFE_SOURCE_URL");
  const exclusions = [];
  const source = decode(bytes, mediaType, sourceKind, exclusions);
  const warnings = new Set();
  const root =
    mediaType.split(";")[0].trim().toLowerCase() === "text/html"
      ? htmlTree(source, warnings)
      : xmlTree(source);
  const nodes = annotate(root);
  const inventory =
    sourceKind === "washington_index"
      ? inventoryData(nodes, expectedIdentity, sourceUrl, exclusions, warnings)
      : null;
  const titleNode = nodes.find((node) => node.tagName === "title");
  const title = titleNode ? normalize(rawText(titleNode)) : "";
  if (ERROR_TITLE.test(title)) fail("SOURCE_ERROR_PAGE");
  const mains = nodes.filter((node) => node.tagName === "main");
  if (mains.length > 1) fail("AMBIGUOUS_MAIN_CONTENT");
  const contentRoot =
    mains[0] ?? nodes.find((node) => node.tagName === "body") ?? root;
  const links = [];
  const drafts = [];
  const exclude = (reason, sourceLocator, count = 1) =>
    exclusions.push({ reason, sourceLocator, count });
  const inline = (node) => {
    if (node.nodeName === "#text") return node.value;
    if (node.nodeName.startsWith("#")) return "";
    const reason = removal(node);
    if (reason) {
      exclude(reason, node.path);
      return "";
    }
    if (node.tagName === "br") return "\n";
    const text = (node.childNodes ?? [])
      .map(inline)
      .join(node.tagName === "tr" ? " | " : "");
    if (node.tagName === "a" && node.attr.href) {
      const candidate = safeUrl(node.attr.href, sourceUrl);
      if (candidate)
        links.push({
          url: candidate,
          text: normalize(text),
          sourceLocator: node.path,
        });
      else exclude("unsafe_link", node.path);
    }
    const change = marker(node);
    if (change) {
      warnings.add("amendment_markup_preserved_as_explicit_markers");
      return `[[${change}]]${text}[[/${change}]]`;
    }
    return text;
  };
  const walk = (node) => {
    if (node.nodeName === "#text") {
      const text = normalize(node.value);
      if (text)
        drafts.push({
          text,
          path: node.path,
          kind: "paragraph",
          headingLevel: 0,
        });
      return;
    }
    const reason = removal(node);
    if (reason) {
      exclude(reason, node.path);
      return;
    }
    if (
      ["head"].includes(node.tagName) ||
      (node.nodeName.startsWith("#") && node.nodeName !== "#document")
    )
      return;
    const children = node.childNodes ?? [];
    const nestedBlocks = node.hasBlock;
    if (marker(node) && nestedBlocks) fail("UNSUPPORTED_BLOCK_AMENDMENT");
    if (node.tagName === "pre") {
      const chunks = normalize(inline(node), true).split(/\n[ \t]*\n/);
      chunks.forEach((text, index) => {
        if (text.trim())
          drafts.push({
            text: text.trim(),
            path: `${node.path}/paragraph[${index + 1}]`,
            kind: "preformatted",
            headingLevel: 0,
          });
      });
    } else if (
      BLOCK.has(node.tagName) &&
      (!nestedBlocks || node.tagName === "tr")
    ) {
      const text = normalize(inline(node));
      if (text)
        drafts.push({
          text,
          path: node.path,
          kind: HEADINGS.has(node.tagName)
            ? "heading"
            : node.tagName === "tr"
              ? "table_row"
              : "paragraph",
          headingLevel: /^h[1-6]$/.test(node.tagName)
            ? Number(node.tagName[1])
            : HEADINGS.has(node.tagName)
              ? 2
              : 0,
        });
    } else {
      let run = [];
      let runIndex = 0;
      const flush = () => {
        const text = normalize(run.map(inline).join(""));
        if (text)
          drafts.push({
            text,
            path: `${node.path}/text-run[${++runIndex}]`,
            kind: "paragraph",
            headingLevel: 0,
          });
        run = [];
      };
      for (const child of children) {
        if (BLOCK.has(child.tagName) || child.hasBlock) {
          flush();
          walk(child);
        } else run.push(child);
      }
      flush();
    }
  };
  if (inventory) exclude("unselected_inventory_dom", contentRoot.path);
  else walk(contentRoot);
  if (inventory) {
    drafts.push({
      text: `Washington bill inventory ${inventory.billNumber} ${inventory.biennium}`,
      path: inventory.sourceLocator,
      kind: "heading",
      headingLevel: 1,
    });
    for (const document of inventory.documents) {
      const metadata = document.sourceMetadata;
      drafts.push({
        text: [
          metadata.name,
          metadata.description,
          metadata.longFriendlyName,
          `documentType: ${metadata.documentType}`,
          metadata.effectiveDate
            ? `effectiveDate (unqualified provider metadata): ${metadata.effectiveDate}`
            : null,
          metadata.lastModifiedDate
            ? `lastModifiedDate (unqualified provider metadata): ${metadata.lastModifiedDate}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        path: document.sourceLocator.replace(/\/path$/, ""),
        kind: "paragraph",
        headingLevel: 0,
      });
      links.push(document);
    }
  }
  const blocks = [];
  const headings = [];
  let contactSection = false;
  let printedPageLabel = null;
  let byteOffset = 0;
  const foundExclusions = new Set();
  for (const draft of drafts) {
    if (selectedExclusions.includes(draft.path)) {
      foundExclusions.add(draft.path);
      exclude("reviewed_reuse_omission", draft.path);
      warnings.add("reviewed_passages_omitted_from_search_display_and_export");
      continue;
    }
    if (sourceKind === "govinfo_fr") {
      const page = /^\[\[Page ([0-9]+)\]\]$/.exec(draft.text);
      if (page) {
        printedPageLabel = page[1];
        exclude("printed_page_marker_to_locator", draft.path);
        continue;
      }
      if (
        /^Federal Register\s*\/\s*Vol\.\s*\d+/.test(draft.text) &&
        draft.text.length < 500
      ) {
        exclude("running_page_header", draft.path);
        continue;
      }
    }
    const changes = [];
    for (const match of draft.text.matchAll(
      /\[\[(\/?)(INSERTION|DELETION)\]\]/g,
    )) {
      if (match[1]) {
        if (changes.pop() !== match[2]) fail("UNSUPPORTED_BLOCK_AMENDMENT");
      } else changes.push(match[2]);
    }
    if (changes.length) fail("UNSUPPORTED_BLOCK_AMENDMENT");
    if (CONTACT.test(draft.text)) contactSection = true;
    else if (
      contactSection &&
      (/^(?:SUPPLEMENTARY INFORMATION|SUMMARY|DATES|ADDRESSES|AUTHORITY|BACKGROUND|I\.|II\.|III\.)\s*[:.]/.test(
        draft.text,
      ) ||
        draft.kind === "heading")
    )
      contactSection = false;
    const reason = contactSection
      ? "personal_contact_section"
      : EMAIL.test(draft.text) || PHONE.test(draft.text)
        ? "personal_contact_block"
        : PRIVATE_LOCATION.test(draft.text)
          ? "prohibited_location_block"
          : null;
    if (reason) {
      exclude(reason, draft.path);
      continue;
    }
    if (draft.headingLevel) {
      headings.length = Math.min(headings.length, draft.headingLevel - 1);
      headings.push(draft.text);
    }
    const startByte = byteOffset;
    const endByte = startByte + Buffer.byteLength(draft.text, "utf8");
    blocks.push({
      startByte,
      endByte,
      text: draft.text,
      kind: draft.kind,
      locator: {
        type: "structural_path",
        value: draft.path,
        headingPath: [...headings],
        printedPageLabel,
        physicalPageIndex: null,
      },
    });
    byteOffset = endByte + 2;
  }
  if (foundExclusions.size !== selectedExclusions.length)
    fail("REVIEWED_EXCLUSION_LOCATOR_MISSING");
  if (!blocks.length) fail("EMPTY_POLICY_TEXT");
  const text = blocks.map((block) => block.text).join("\n\n");
  const identity = inventory
    ? {
        expected: expectedIdentity,
        matched: true,
        sourceValue: inventory.billNumber,
        sourceLocator: inventory.sourceLocator,
      }
    : identityMatch(sourceKind, expectedIdentity, blocks, title, sourceUrl);
  const sourceMetadataCandidates = [];
  if (
    title &&
    !EMAIL.test(title) &&
    !PHONE.test(title) &&
    !PRIVATE_LOCATION.test(title)
  )
    sourceMetadataCandidates.push({
      field: "title",
      value: title,
      sourceLocator: titleNode.path,
    });
  sourceMetadataCandidates.push({
    field: "sourceIdentifier",
    value: identity.sourceValue,
    sourceLocator: identity.sourceLocator,
  });
  for (const block of blocks) {
    for (const match of block.text.matchAll(
      /(?:^|\n)(AGENCY|ACTION|DATES|SUMMARY):\s*([^\n]+(?:\n(?![A-Z][A-Z ]+:)[^\n]+)*)/g,
    ))
      sourceMetadataCandidates.push({
        field: match[1].toLowerCase(),
        value: match[2].trim(),
        sourceLocator: block.locator.value,
      });
  }
  const excludedPaths = exclusions
    .filter(
      (entry) =>
        entry.reason.includes("contact") ||
        entry.reason.includes("location") ||
        entry.reason === "reviewed_reuse_omission",
    )
    .map((entry) => entry.sourceLocator);
  const safeLinks = links.filter(
    (link) =>
      !EMAIL.test(link.text) &&
      !PHONE.test(link.text) &&
      !PRIVATE_LOCATION.test(link.text) &&
      !excludedPaths.some((path) =>
        link.sourceLocator.startsWith(
          path.replace(/\/(?:paragraph|text-run)\[\d+\]$/, ""),
        ),
      ),
  );
  if (
    exclusions.some(
      (entry) =>
        entry.reason.includes("contact") || entry.reason.includes("location"),
    )
  )
    warnings.add("searchable_text_contains_documented_exclusions");
  warnings.add(
    "metadata_candidates_require_source_review_and_field_provenance",
  );
  if (sourceKind === "washington_index")
    warnings.add("discovery_index_not_policy_instrument");
  const shortFederalSerial =
    sourceKind === "govinfo_fr" &&
    /^(?:\d{2}|\d{4})-\d{1,3}$/.test(expectedIdentity);
  return freeze({
    parser: {
      ...POLICY_TEXT_PARSER,
      ...(selectedExclusions.length || shortFederalSerial
        ? {
            configDigest: createHash("sha256")
              .update(
                JSON.stringify({
                  base: POLICY_TEXT_PARSER.configDigest,
                  ...(shortFederalSerial
                    ? { identityContract: "exact-fr-short-serial-v1" }
                    : {}),
                  excludedBlockLocators: selectedExclusions,
                }),
              )
              .digest("hex"),
          }
        : {}),
    },
    excludedBlockLocators: selectedExclusions,
    text,
    blocks,
    sourceMetadataCandidates,
    links: safeLinks,
    exclusions,
    warnings: [...warnings].sort(),
    identity,
  });
}
