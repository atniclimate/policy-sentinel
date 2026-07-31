import {
  ErrorCodes,
  parse,
  type DefaultTreeAdapterMap,
  type ParserError,
} from "parse5";

import {
  WASHINGTON_GOVERNOR_CELL_CLASSES,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WASHINGTON_GOVERNOR_FILTER_LABEL,
  WASHINGTON_GOVERNOR_FILTER_VALUE,
  WASHINGTON_GOVERNOR_HTML_POLICY,
  WASHINGTON_GOVERNOR_ORIGIN,
  WASHINGTON_GOVERNOR_PDF_PATH_PREFIX,
  WASHINGTON_GOVERNOR_REQUIRED_ANCHOR,
  WASHINGTON_GOVERNOR_SELECTED_FROM,
  WASHINGTON_GOVERNOR_SELECTED_STATUS,
  WASHINGTON_GOVERNOR_STATUS_FILTER_LABEL,
  WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE,
  WASHINGTON_GOVERNOR_STATUS_OPTIONS,
  WASHINGTON_GOVERNOR_TABLE_HEADERS,
} from "./constants";
import { WashingtonGovernorContractError } from "./errors";

type Node = DefaultTreeAdapterMap["node"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];
type Element = DefaultTreeAdapterMap["element"];
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

export interface WashingtonGovernorExecutiveOrder {
  number: string;
  issuedDateSourceText: string;
  issuedDate: string;
  title: string;
  sourceStatus: typeof WASHINGTON_GOVERNOR_SELECTED_STATUS;
  governor: typeof WASHINGTON_GOVERNOR_FILTER_LABEL;
  officialPdfUrl: string;
}

export interface WashingtonGovernorExecutiveOrderIndex {
  contractVersion: typeof WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION;
  indexUrl: typeof WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL;
  displayedTotal: number;
  rows: readonly Readonly<WashingtonGovernorExecutiveOrder>[];
}

export interface WashingtonGovernorIndexContractContext {
  maximumIssuedDate: string;
}

interface TraversalEntry {
  node: Node;
  depth: number;
}

function contractError(
  code: ConstructorParameters<typeof WashingtonGovernorContractError>[0],
  path: string,
): never {
  throw new WashingtonGovernorContractError(code, path);
}

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function isHtmlElement(node: Node): node is Element {
  return isElement(node) && node.namespaceURI === HTML_NAMESPACE;
}

function childNodes(node: Node): Node[] {
  const result =
    "childNodes" in node ? ([...node.childNodes] as unknown as Node[]) : [];
  if ("content" in node) {
    result.push(...(node.content.childNodes as unknown as Node[]));
  }
  return result;
}

function semanticChildNodes(node: Node): Node[] {
  if (isHtmlElement(node) && node.tagName === "template") {
    return [];
  }
  return "childNodes" in node
    ? ([...node.childNodes] as unknown as Node[])
    : [];
}

function elementChildren(node: ParentNode | Element): Element[] {
  return node.childNodes.filter(isElement);
}

function descendants(node: Node, includeRoot = false): Node[] {
  const result: Node[] = [];
  const stack = includeRoot ? [node] : semanticChildNodes(node).reverse();
  while (stack.length > 0) {
    const current = stack.pop() as Node;
    result.push(current);
    stack.push(...semanticChildNodes(current).reverse());
  }
  return result;
}

function attribute(element: Element, name: string): string | null {
  return (
    element.attrs.find((candidate) => candidate.name === name)?.value ?? null
  );
}

function hasAttribute(element: Element, name: string): boolean {
  return element.attrs.some((candidate) => candidate.name === name);
}

function classTokens(element: Element): Set<string> {
  return new Set(
    (attribute(element, "class") ?? "")
      .split(/\s+/u)
      .filter((token) => token !== ""),
  );
}

function hasClasses(element: Element, required: readonly string[]): boolean {
  const classes = classTokens(element);
  return required.every((requiredClass) => classes.has(requiredClass));
}

function collapseVisibleText(node: Node): string {
  const fragments: string[] = [];
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop() as Node;
    if ("value" in current) {
      fragments.push(current.value);
      continue;
    }
    if (
      isElement(current) &&
      (current.tagName === "script" ||
        current.tagName === "style" ||
        current.tagName === "template")
    ) {
      continue;
    }
    stack.push(...childNodes(current).reverse());
  }
  return fragments.join("").normalize("NFC").replace(/\s+/gu, " ").trim();
}

function assertIsoDate(value: string, path: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    contractError("invalid_value", path);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    contractError("invalid_value", path);
  }
  return value;
}

function parseIssuedDate(sourceText: string, path: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(sourceText);
  if (match === null) {
    contractError("invalid_value", path);
  }
  return assertIsoDate(`${match[3]}-${match[1]}-${match[2]}`, path);
}

function assertOrderNumber(
  value: string,
  issuedDate: string,
  path: string,
): string {
  if (!/^\d{2}-\d{2}$/u.test(value)) {
    contractError("invalid_value", path);
  }
  if (value.slice(0, 2) !== issuedDate.slice(2, 4)) {
    contractError("inconsistent_value", path);
  }
  return value;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasDisallowedControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

function assertParserBounds(document: Node): void {
  let nodeCount = 0;
  let attributeCount = 0;
  let textCodeUnits = 0;
  const stack: TraversalEntry[] = [{ node: document, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop() as TraversalEntry;
    nodeCount += 1;
    if (nodeCount > WASHINGTON_GOVERNOR_HTML_POLICY.maximumDomNodes) {
      contractError("limit_exceeded", "$document.nodes");
    }
    if (depth > WASHINGTON_GOVERNOR_HTML_POLICY.maximumDomDepth) {
      contractError("limit_exceeded", "$document.depth");
    }
    if (isElement(node)) {
      attributeCount += node.attrs.length;
      if (
        attributeCount > WASHINGTON_GOVERNOR_HTML_POLICY.maximumDomAttributes
      ) {
        contractError("limit_exceeded", "$document.attributes");
      }
    } else if ("value" in node) {
      textCodeUnits += node.value.length;
      if (
        textCodeUnits > WASHINGTON_GOVERNOR_HTML_POLICY.maximumTextCodeUnits
      ) {
        contractError("limit_exceeded", "$document.text");
      }
    }
    stack.push(
      ...childNodes(node)
        .reverse()
        .map((child) => ({ node: child, depth: depth + 1 })),
    );
  }
}

function assertParseErrors(
  errors: readonly ParserError[],
  targetView: Element,
): void {
  if (
    errors.length > WASHINGTON_GOVERNOR_HTML_POLICY.maximumParseErrors ||
    errors.some(({ code }) => code !== ErrorCodes.duplicateAttribute)
  ) {
    contractError("unexpected_structure", "$document.html");
  }
  const location = targetView.sourceCodeLocation;
  if (
    location !== null &&
    location !== undefined &&
    errors.some(
      ({ startOffset }) =>
        startOffset >= location.startOffset && startOffset < location.endOffset,
    )
  ) {
    contractError("unexpected_structure", "$view.html");
  }
}

function assertSelectOptionContract(
  view: Element,
  selectName: string,
  selectedValue: string,
  selectedLabel: string,
  path: string,
): Element {
  const selects = descendants(view)
    .filter(isHtmlElement)
    .filter(
      (element) =>
        element.tagName === "select" &&
        attribute(element, "name") === selectName,
    );
  if (selects.length !== 1) {
    contractError(
      selects.length === 0 ? "missing_field" : "duplicate_value",
      path,
    );
  }
  const select = selects[0] as Element;
  const options = descendants(select)
    .filter(isHtmlElement)
    .filter((element) => element.tagName === "option");
  const selected = options.filter((option) => hasAttribute(option, "selected"));
  if (
    selected.length !== 1 ||
    attribute(selected[0] as Element, "value") !== selectedValue ||
    collapseVisibleText(selected[0] as Element) !== selectedLabel
  ) {
    contractError("inconsistent_value", `${path}.selected`);
  }
  return select;
}

function assertFilterContract(view: Element): void {
  const governor = assertSelectOptionContract(
    view,
    "governor",
    WASHINGTON_GOVERNOR_FILTER_VALUE,
    WASHINGTON_GOVERNOR_FILTER_LABEL,
    "$view.filters.governor",
  );
  const governorOptions = descendants(governor)
    .filter(isHtmlElement)
    .filter((element) => element.tagName === "option");
  const selectedGovernor = governorOptions.filter(
    (option) =>
      attribute(option, "value") === WASHINGTON_GOVERNOR_FILTER_VALUE &&
      collapseVisibleText(option) === WASHINGTON_GOVERNOR_FILTER_LABEL,
  );
  const anyGovernor = governorOptions.filter(
    (option) =>
      attribute(option, "value") === WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE &&
      collapseVisibleText(option) === WASHINGTON_GOVERNOR_STATUS_FILTER_LABEL,
  );
  if (selectedGovernor.length !== 1 || anyGovernor.length !== 1) {
    contractError("inconsistent_value", "$view.filters.governor.options");
  }

  const status = assertSelectOptionContract(
    view,
    "field_executive_order_status_target_id",
    WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE,
    WASHINGTON_GOVERNOR_STATUS_FILTER_LABEL,
    "$view.filters.status",
  );
  const statusOptions = descendants(status)
    .filter(isHtmlElement)
    .filter((element) => element.tagName === "option");
  const observed = new Map<string, string>();
  for (const option of statusOptions) {
    const value = attribute(option, "value");
    if (value === null || observed.has(value)) {
      contractError("duplicate_value", "$view.filters.status.options");
    }
    observed.set(value, collapseVisibleText(option));
  }
  const expected = new Map<string, string>([
    [
      WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE,
      WASHINGTON_GOVERNOR_STATUS_FILTER_LABEL,
    ],
    ...WASHINGTON_GOVERNOR_STATUS_OPTIONS.map(
      ({ value, label }) => [value, label] as const,
    ),
  ]);
  if (
    observed.size !== expected.size ||
    [...expected].some(([value, label]) => observed.get(value) !== label)
  ) {
    contractError("inconsistent_value", "$view.filters.status.options");
  }
}

function assertNoPager(view: Element): void {
  for (const node of descendants(view)) {
    if (!isElement(node)) {
      continue;
    }
    const hasPagerClass = [...classTokens(node)].some(
      (token) =>
        token === "pager" ||
        token.startsWith("pager-") ||
        token.startsWith("pager__"),
    );
    const href = node.tagName === "a" ? attribute(node, "href") : null;
    if (hasPagerClass || (href !== null && /(?:\?|&)page=/u.test(href))) {
      contractError("prohibited_html", "$view.pager");
    }
  }
}

function assertCellShape(
  cell: Element,
  expectedTag: "th" | "td",
  requiredSpecificClass: string | null,
  path: string,
): void {
  if (
    cell.namespaceURI !== HTML_NAMESPACE ||
    cell.tagName !== expectedTag ||
    hasAttribute(cell, "colspan") ||
    hasAttribute(cell, "rowspan")
  ) {
    contractError("unexpected_structure", path);
  }
  if (
    requiredSpecificClass !== null &&
    !hasClasses(cell, ["views-field", requiredSpecificClass])
  ) {
    contractError("unexpected_structure", `${path}.class`);
  }
}

function assertTableHeaders(table: Element): Element {
  const sections = elementChildren(table);
  if (
    sections.length !== 2 ||
    sections.some((section) => section.namespaceURI !== HTML_NAMESPACE) ||
    sections[0]?.tagName !== "thead" ||
    sections[1]?.tagName !== "tbody"
  ) {
    contractError("unexpected_structure", "$view.table.sections");
  }
  const thead = sections[0] as Element;
  const tbody = sections[1] as Element;
  const headerRows = elementChildren(thead);
  if (headerRows.length !== 1 || headerRows[0]?.tagName !== "tr") {
    contractError("unexpected_structure", "$view.table.thead.rows");
  }
  const cells = elementChildren(headerRows[0] as Element);
  if (cells.length !== WASHINGTON_GOVERNOR_TABLE_HEADERS.length) {
    contractError("unexpected_structure", "$view.table.headers");
  }
  cells.forEach((cell, index) => {
    assertCellShape(cell, "th", null, `$view.table.headers[${index}]`);
    if (
      collapseVisibleText(cell) !== WASHINGTON_GOVERNOR_TABLE_HEADERS[index]
    ) {
      contractError("inconsistent_value", `$view.table.headers[${index}]`);
    }
  });
  return tbody;
}

function assertPlainTextCell(cell: Element, path: string): string {
  if (descendants(cell).some(isElement)) {
    contractError("unexpected_structure", path);
  }
  const value = collapseVisibleText(cell);
  if (value === "") {
    contractError("missing_field", path);
  }
  return value;
}

function validatePdfUrl(rawHref: string, number: string, path: string): string {
  if (
    rawHref.length === 0 ||
    rawHref.length > 2_048 ||
    !rawHref.startsWith(WASHINGTON_GOVERNOR_PDF_PATH_PREFIX) ||
    rawHref.includes("\\") ||
    rawHref.includes("?") ||
    rawHref.includes("#") ||
    /%(?:0[0-9a-f]|2f|5c)/iu.test(rawHref) ||
    !rawHref.endsWith(".pdf")
  ) {
    contractError("invalid_value", path);
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawHref);
  } catch {
    contractError("invalid_value", path);
  }
  if (
    !decoded.startsWith(WASHINGTON_GOVERNOR_PDF_PATH_PREFIX) ||
    decoded.includes("\\") ||
    hasDisallowedControl(decoded) ||
    decoded.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    contractError("invalid_value", path);
  }
  const filename = decoded.slice(decoded.lastIndexOf("/") + 1);
  const escapedNumber = number.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (
    !new RegExp(`(?:^|[^0-9])${escapedNumber}(?:[^0-9]|$)`, "u").test(filename)
  ) {
    contractError("inconsistent_value", path);
  }

  let url: URL;
  try {
    url = new URL(rawHref, WASHINGTON_GOVERNOR_ORIGIN);
  } catch {
    contractError("invalid_value", path);
  }
  if (
    url.origin !== WASHINGTON_GOVERNOR_ORIGIN ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.startsWith(WASHINGTON_GOVERNOR_PDF_PATH_PREFIX) ||
    !url.pathname.endsWith(".pdf")
  ) {
    contractError("invalid_value", path);
  }
  return url.href;
}

function parseRow(
  row: Element,
  index: number,
  maximumIssuedDate: string,
): WashingtonGovernorExecutiveOrder {
  const path = `$view.table.rows[${index}]`;
  const cells = elementChildren(row);
  if (
    row.namespaceURI !== HTML_NAMESPACE ||
    row.tagName !== "tr" ||
    cells.length !== WASHINGTON_GOVERNOR_CELL_CLASSES.length
  ) {
    contractError("unexpected_structure", path);
  }
  cells.forEach((cell, cellIndex) =>
    assertCellShape(
      cell,
      "td",
      WASHINGTON_GOVERNOR_CELL_CLASSES[cellIndex] as string,
      `${path}.cells[${cellIndex}]`,
    ),
  );

  const issuedDateSourceText = assertPlainTextCell(
    cells[1] as Element,
    `${path}.issuedDate`,
  );
  const issuedDate = parseIssuedDate(
    issuedDateSourceText,
    `${path}.issuedDate`,
  );
  if (
    issuedDate < WASHINGTON_GOVERNOR_SELECTED_FROM ||
    issuedDate > maximumIssuedDate
  ) {
    contractError("invalid_value", `${path}.issuedDate`);
  }
  const number = assertOrderNumber(
    assertPlainTextCell(cells[0] as Element, `${path}.number`),
    issuedDate,
    `${path}.number`,
  );

  const titleCell = cells[2] as Element;
  const titleElements = descendants(titleCell).filter(isElement);
  const anchors = titleElements.filter((element) => element.tagName === "a");
  if (anchors.length !== 1 || titleElements.length !== 1) {
    contractError("unexpected_structure", `${path}.title`);
  }
  const anchor = anchors[0] as Element;
  const title = collapseVisibleText(anchor);
  if (
    title === "" ||
    [...title].length >
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumTitleCodePoints ||
    hasDisallowedControl(title) ||
    collapseVisibleText(titleCell) !== title
  ) {
    contractError("invalid_value", `${path}.title`);
  }
  const rawHref = attribute(anchor, "href");
  if (rawHref === null) {
    contractError("missing_field", `${path}.officialPdfUrl`);
  }
  const officialPdfUrl = validatePdfUrl(
    rawHref,
    number,
    `${path}.officialPdfUrl`,
  );

  const sourceStatus = assertPlainTextCell(
    cells[3] as Element,
    `${path}.sourceStatus`,
  );
  if (sourceStatus !== WASHINGTON_GOVERNOR_SELECTED_STATUS) {
    contractError("invalid_value", `${path}.sourceStatus`);
  }
  const governor = assertPlainTextCell(cells[4] as Element, `${path}.governor`);
  if (governor !== WASHINGTON_GOVERNOR_FILTER_LABEL) {
    contractError("inconsistent_value", `${path}.governor`);
  }
  if (
    descendants(cells[5] as Element).some(isElement) ||
    collapseVisibleText(cells[5] as Element) !== ""
  ) {
    contractError("unexpected_field", `${path}.edit`);
  }

  return {
    number,
    issuedDateSourceText,
    issuedDate,
    title,
    sourceStatus,
    governor,
    officialPdfUrl,
  };
}

export function assertWashingtonGovernorExecutiveOrderProjection(
  value: unknown,
  maximumIssuedDate: string,
): WashingtonGovernorExecutiveOrder {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    contractError("invalid_type", "$row");
  }
  const row = value as Record<string, unknown>;
  const expectedKeys = [
    "governor",
    "issuedDate",
    "issuedDateSourceText",
    "number",
    "officialPdfUrl",
    "sourceStatus",
    "title",
  ];
  const observedKeys = Object.keys(row).sort(compareCodeUnits);
  if (
    observedKeys.length !== expectedKeys.length ||
    observedKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    contractError("unexpected_field", "$row");
  }
  if (Object.values(row).some((field) => typeof field !== "string")) {
    contractError("invalid_type", "$row");
  }

  const maximum = assertIsoDate(
    maximumIssuedDate,
    "$context.maximumIssuedDate",
  );
  const issuedDateSourceText = row.issuedDateSourceText as string;
  const issuedDate = parseIssuedDate(
    issuedDateSourceText,
    "$row.issuedDateSourceText",
  );
  if (
    row.issuedDate !== issuedDate ||
    issuedDate < WASHINGTON_GOVERNOR_SELECTED_FROM ||
    issuedDate > maximum
  ) {
    contractError("inconsistent_value", "$row.issuedDate");
  }
  const number = assertOrderNumber(
    row.number as string,
    issuedDate,
    "$row.number",
  );
  const title = row.title as string;
  if (
    title === "" ||
    title.normalize("NFC") !== title ||
    title.replace(/\s+/gu, " ").trim() !== title ||
    [...title].length >
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumTitleCodePoints ||
    hasDisallowedControl(title)
  ) {
    contractError("invalid_value", "$row.title");
  }
  if (row.sourceStatus !== WASHINGTON_GOVERNOR_SELECTED_STATUS) {
    contractError("invalid_value", "$row.sourceStatus");
  }
  if (row.governor !== WASHINGTON_GOVERNOR_FILTER_LABEL) {
    contractError("inconsistent_value", "$row.governor");
  }

  let absoluteUrl: URL;
  try {
    absoluteUrl = new URL(row.officialPdfUrl as string);
  } catch {
    contractError("invalid_value", "$row.officialPdfUrl");
  }
  const validatedUrl = validatePdfUrl(
    absoluteUrl.pathname,
    number,
    "$row.officialPdfUrl",
  );
  if (validatedUrl !== row.officialPdfUrl) {
    contractError("inconsistent_value", "$row.officialPdfUrl");
  }

  return {
    number,
    issuedDateSourceText,
    issuedDate,
    title,
    sourceStatus: WASHINGTON_GOVERNOR_SELECTED_STATUS,
    governor: WASHINGTON_GOVERNOR_FILTER_LABEL,
    officialPdfUrl: validatedUrl,
  };
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function washingtonGovernorSourceRecordId(
  row: Pick<WashingtonGovernorExecutiveOrder, "number" | "issuedDate">,
): string {
  return `${row.number}@${row.issuedDate}`;
}

export function parseWashingtonGovernorExecutiveOrdersIndex(
  html: string,
  context: WashingtonGovernorIndexContractContext,
): Readonly<WashingtonGovernorExecutiveOrderIndex> {
  if (typeof html !== "string") {
    contractError("invalid_type", "$document");
  }
  if (html === "") {
    contractError("missing_field", "$document");
  }
  const maximumIssuedDate = assertIsoDate(
    context.maximumIssuedDate,
    "$context.maximumIssuedDate",
  );
  if (maximumIssuedDate < WASHINGTON_GOVERNOR_SELECTED_FROM) {
    contractError("invalid_value", "$context.maximumIssuedDate");
  }

  const parseErrors: ParserError[] = [];
  const document = parse(html, {
    onParseError: (error) => parseErrors.push(error),
    sourceCodeLocationInfo: true,
  });
  assertParserBounds(document);

  const targetViews = descendants(document)
    .filter(isHtmlElement)
    .filter(
      (element) =>
        element.tagName === "div" &&
        hasClasses(element, [
          "view",
          "view-executive-orders",
          "view-id-executive_orders",
          "view-display-id-executive_order_list_block",
        ]),
    );
  if (targetViews.length !== 1) {
    contractError(
      targetViews.length === 0 ? "missing_field" : "duplicate_value",
      "$view",
    );
  }
  const view = targetViews[0] as Element;
  assertParseErrors(parseErrors, view);
  assertFilterContract(view);
  assertNoPager(view);

  const viewHeaders = descendants(view)
    .filter(isHtmlElement)
    .filter(
      (element) =>
        element.tagName === "div" && classTokens(element).has("view-header"),
    );
  if (viewHeaders.length !== 1) {
    contractError(
      viewHeaders.length === 0 ? "missing_field" : "duplicate_value",
      "$view.displayedTotal",
    );
  }
  const countMatch = /^Displaying 1 - (\d{1,2}) of (\d{1,2})$/u.exec(
    collapseVisibleText(viewHeaders[0] as Element),
  );
  if (countMatch === null) {
    contractError("invalid_value", "$view.displayedTotal");
  }
  const displayedEnd = Number(countMatch[1]);
  const displayedTotal = Number(countMatch[2]);

  const tables = descendants(view)
    .filter(isHtmlElement)
    .filter((element) => element.tagName === "table");
  if (tables.length !== 1) {
    contractError(
      tables.length === 0 ? "missing_field" : "duplicate_value",
      "$view.table",
    );
  }
  const table = tables[0] as Element;
  if (
    !hasClasses(table, [
      "table",
      "table-bordered",
      "table-striped",
      "tablesaw",
      "cols-6",
    ])
  ) {
    contractError("unexpected_structure", "$view.table.class");
  }
  const tbody = assertTableHeaders(table);
  const rowElements = elementChildren(tbody).filter(
    (element) => element.tagName === "tr",
  );
  if (
    rowElements.length !== elementChildren(tbody).length ||
    rowElements.length < 1 ||
    rowElements.length > WASHINGTON_GOVERNOR_HTML_POLICY.maximumRows ||
    displayedEnd !== rowElements.length ||
    displayedTotal !== rowElements.length
  ) {
    contractError("inconsistent_value", "$view.table.rows");
  }

  const rows = rowElements.map((row, index) =>
    parseRow(row, index, maximumIssuedDate),
  );
  const identities = new Set<string>();
  for (const row of rows) {
    const identity = washingtonGovernorSourceRecordId(row);
    if (identities.has(identity)) {
      contractError("duplicate_value", "$view.table.rows.identity");
    }
    identities.add(identity);
  }
  if (
    !rows.some(
      ({ number, issuedDate }) =>
        number === WASHINGTON_GOVERNOR_REQUIRED_ANCHOR.number &&
        issuedDate === WASHINGTON_GOVERNOR_REQUIRED_ANCHOR.issuedDate,
    )
  ) {
    contractError("missing_field", "$view.table.rows.requiredAnchor");
  }

  rows.sort(
    (left, right) =>
      compareCodeUnits(right.issuedDate, left.issuedDate) ||
      compareCodeUnits(left.number, right.number),
  );
  return deepFreeze({
    contractVersion: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION,
    indexUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
    displayedTotal,
    rows,
  });
}
