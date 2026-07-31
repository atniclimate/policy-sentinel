import {
  ErrorCodes,
  parse,
  type DefaultTreeAdapterMap,
  type ParserError,
} from "parse5";

import {
  SUPREME_COURT_HEADER_DOM_ORDER,
  SUPREME_COURT_HTML_POLICY,
  SUPREME_COURT_OPINIONS_CONTRACT_VERSION,
  SUPREME_COURT_OPINION_TABLE_CLASS,
  SUPREME_COURT_OPINION_TABLE_DATA_ROW_COUNTS,
  SUPREME_COURT_ORIGIN,
  SUPREME_COURT_SELECTED_OPINION,
  SUPREME_COURT_TERM_HEADING,
  SUPREME_COURT_TERM_URL,
} from "./constants";
import { SupremeCourtContractError } from "./errors";

type Node = DefaultTreeAdapterMap["node"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];
type Element = DefaultTreeAdapterMap["element"];
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

export interface SupremeCourtOpinionProjection {
  tableIndex: number;
  dataRowIndex: number;
  revisionElementExposed: false;
  decisionDateSourceText: string;
  decisionDate: string;
  docketNumber: string;
  caseName: string;
  reporterCitation: string;
  boundVolumeUrl: string;
}

export interface SupremeCourtTermIndex {
  contractVersion: typeof SUPREME_COURT_OPINIONS_CONTRACT_VERSION;
  indexUrl: typeof SUPREME_COURT_TERM_URL;
  termHeading: typeof SUPREME_COURT_TERM_HEADING;
  dataRowCount: number;
  rows: readonly [Readonly<SupremeCourtOpinionProjection>];
}

interface TraversalEntry {
  node: Node;
  depth: number;
}

interface LocatedRow {
  tableIndex: number;
  dataRowIndex: number;
  row: Element;
  cells: readonly Element[];
}

function contractError(
  code: ConstructorParameters<typeof SupremeCourtContractError>[0],
  path: string,
): never {
  throw new SupremeCourtContractError(code, path);
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
  return node.childNodes.filter(isHtmlElement);
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
      isHtmlElement(current) &&
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

function hasDisallowedControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
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

function parseDecisionDate(sourceText: string, path: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/u.exec(sourceText);
  if (match === null) {
    contractError("invalid_value", path);
  }
  const month = (match[1] as string).padStart(2, "0");
  const day = (match[2] as string).padStart(2, "0");
  return assertIsoDate(`20${match[3]}-${month}-${day}`, path);
}

function assertParserBounds(document: Node): void {
  let nodeCount = 0;
  let attributeCount = 0;
  let textCodeUnits = 0;
  let tableCount = 0;
  const stack: TraversalEntry[] = [{ node: document, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop() as TraversalEntry;
    nodeCount += 1;
    if (nodeCount > SUPREME_COURT_HTML_POLICY.maximumDomNodes) {
      contractError("limit_exceeded", "$document.nodes");
    }
    if (depth > SUPREME_COURT_HTML_POLICY.maximumDomDepth) {
      contractError("limit_exceeded", "$document.depth");
    }
    if (isElement(node)) {
      attributeCount += node.attrs.length;
      if (attributeCount > SUPREME_COURT_HTML_POLICY.maximumDomAttributes) {
        contractError("limit_exceeded", "$document.attributes");
      }
      if (isHtmlElement(node) && node.tagName === "table") {
        tableCount += 1;
        if (tableCount > SUPREME_COURT_HTML_POLICY.maximumTables) {
          contractError("limit_exceeded", "$document.tables");
        }
      }
    } else if ("value" in node) {
      textCodeUnits += node.value.length;
      if (textCodeUnits > SUPREME_COURT_HTML_POLICY.maximumTextCodeUnits) {
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
  protectedElements: readonly Element[],
): void {
  if (
    errors.length > SUPREME_COURT_HTML_POLICY.maximumParseErrors ||
    errors.some(
      ({ code }) => code !== ErrorCodes.unexpectedCharacterInAttributeName,
    )
  ) {
    contractError("unexpected_structure", "$document.html");
  }
  const locations = protectedElements.map((element) => {
    const location = element.sourceCodeLocation;
    if (location === null || location === undefined) {
      contractError("unexpected_structure", "$document.locations");
    }
    return location;
  });
  if (
    errors.some(({ startOffset }) =>
      locations.some(
        ({ startOffset: start, endOffset: end }) =>
          startOffset >= start && startOffset < end,
      ),
    )
  ) {
    contractError("unexpected_structure", "$opinionTables.html");
  }
}

function assertCellShape(
  cell: Element,
  expectedTag: "th" | "td",
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
}

function assertPlainTextCell(cell: Element, path: string): string {
  if (descendants(cell).some(isElement)) {
    contractError("unexpected_structure", path);
  }
  const value = collapseVisibleText(cell);
  if (value === "") {
    contractError("missing_field", path);
  }
  if (
    [...value].length > SUPREME_COURT_HTML_POLICY.maximumTextCodePoints ||
    hasDisallowedControl(value)
  ) {
    contractError("invalid_value", path);
  }
  return value;
}

function assertReporterCitationCell(cell: Element, path: string): string {
  const nestedElements = descendants(cell).filter(isElement);
  if (
    cell.attrs.length !== 1 ||
    attribute(cell, "style") !== "text-align: center;" ||
    nestedElements.length !== 1
  ) {
    contractError("unexpected_structure", path);
  }
  const span = nestedElements[0] as Element;
  if (
    !isHtmlElement(span) ||
    span.tagName !== "span" ||
    span.attrs.length !== 1 ||
    attribute(span, "style") !== "white-space:nowrap;" ||
    descendants(span).some(isElement)
  ) {
    contractError("unexpected_structure", path);
  }
  const value = collapseVisibleText(span);
  if (
    value === "" ||
    collapseVisibleText(cell) !== value ||
    [...value].length > SUPREME_COURT_HTML_POLICY.maximumTextCodePoints ||
    hasDisallowedControl(value)
  ) {
    contractError("invalid_value", path);
  }
  return value;
}

function headerMatches(row: Element): boolean {
  const cells = elementChildren(row);
  return (
    cells.length === SUPREME_COURT_HEADER_DOM_ORDER.length &&
    cells.every(
      (cell, index) =>
        cell.tagName === "th" &&
        collapseVisibleText(cell) === SUPREME_COURT_HEADER_DOM_ORDER[index],
    )
  );
}

function rowsForOpinionTable(
  table: Element,
  tableIndex: number,
): readonly LocatedRow[] {
  const path = `$opinionTables[${tableIndex}]`;
  if (
    descendants(table).some(
      (node) =>
        isHtmlElement(node) && node.tagName === "table" && node !== table,
    )
  ) {
    contractError("unexpected_structure", `${path}.nestedTable`);
  }
  const rows = descendants(table)
    .filter(isHtmlElement)
    .filter((element) => element.tagName === "tr");
  if (
    rows.length < 2 ||
    rows.length > SUPREME_COURT_HTML_POLICY.maximumRowsPerOpinionTable
  ) {
    contractError("limit_exceeded", `${path}.rows`);
  }
  const headers = rows.filter(headerMatches);
  if (headers.length !== 1) {
    contractError(
      headers.length === 0 ? "missing_field" : "duplicate_value",
      `${path}.header`,
    );
  }
  const header = headers[0] as Element;
  elementChildren(header).forEach((cell, index) =>
    assertCellShape(cell, "th", `${path}.header.cells[${index}]`),
  );

  const dataRows = rows.filter((row) => row !== header);
  if (
    dataRows.length !== SUPREME_COURT_OPINION_TABLE_DATA_ROW_COUNTS[tableIndex]
  ) {
    contractError("inconsistent_value", `${path}.dataRowCount`);
  }
  return dataRows.map((row, dataRowIndex) => {
    const rowPath = `${path}.rows[${dataRowIndex}]`;
    const cells = elementChildren(row);
    if (
      row.namespaceURI !== HTML_NAMESPACE ||
      cells.length !== SUPREME_COURT_HEADER_DOM_ORDER.length
    ) {
      contractError("unexpected_structure", rowPath);
    }
    cells.forEach((cell, cellIndex) =>
      assertCellShape(cell, "td", `${rowPath}.cells[${cellIndex}]`),
    );
    return { tableIndex, dataRowIndex, row, cells };
  });
}

function validateBoundVolumeHref(rawHref: string, path: string): string {
  if (rawHref !== SUPREME_COURT_SELECTED_OPINION.rawBoundVolumeHref) {
    contractError("invalid_value", path);
  }
  let url: URL;
  try {
    url = new URL(rawHref, SUPREME_COURT_ORIGIN);
  } catch {
    contractError("invalid_value", path);
  }
  if (
    url.href !== SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl ||
    url.origin !== SUPREME_COURT_ORIGIN ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.pathname !== "/opinions/boundvolumes/586BV.pdf" ||
    url.hash !== "#page=546"
  ) {
    contractError("invalid_value", path);
  }
  return url.href;
}

function parseTargetRow(located: LocatedRow): SupremeCourtOpinionProjection {
  const { tableIndex, dataRowIndex, cells } = located;
  const path = `$opinionTables[${tableIndex}].rows[${dataRowIndex}]`;
  if (tableIndex !== 1 || dataRowIndex !== 41) {
    contractError("inconsistent_value", `${path}.table`);
  }
  cells.forEach((cell, index) => {
    if (attribute(cell, "class") !== null) {
      contractError("unexpected_structure", `${path}.cells[${index}].class`);
    }
  });

  const sequenceCell = cells[0] as Element;
  if (descendants(sequenceCell).some(isElement)) {
    contractError("unexpected_structure", `${path}.sequence`);
  }
  const revisionElementExposed = false as const;
  if (
    assertPlainTextCell(sequenceCell, `${path}.sequence`) !==
    SUPREME_COURT_SELECTED_OPINION.sequence
  ) {
    contractError("inconsistent_value", `${path}.sequence`);
  }
  const decisionDateSourceText = assertPlainTextCell(
    cells[1] as Element,
    `${path}.decisionDate`,
  );
  const decisionDate = parseDecisionDate(
    decisionDateSourceText,
    `${path}.decisionDate`,
  );
  if (
    decisionDateSourceText !==
      SUPREME_COURT_SELECTED_OPINION.decisionDateSourceText ||
    decisionDate !== SUPREME_COURT_SELECTED_OPINION.decisionDate
  ) {
    contractError("inconsistent_value", `${path}.decisionDate`);
  }
  const docketNumber = assertPlainTextCell(
    cells[2] as Element,
    `${path}.docketNumber`,
  );
  if (docketNumber !== SUPREME_COURT_SELECTED_OPINION.docketNumber) {
    contractError("inconsistent_value", `${path}.docketNumber`);
  }

  const nameCell = cells[3] as Element;
  const nameElements = descendants(nameCell).filter(isElement);
  const anchors = nameElements.filter(
    (element) => isHtmlElement(element) && element.tagName === "a",
  );
  if (nameElements.length !== 1 || anchors.length !== 1) {
    contractError("unexpected_structure", `${path}.caseName`);
  }
  const anchor = anchors[0] as Element;
  const anchorAttributeNames = anchor.attrs
    .map(({ name }) => name)
    .sort(compareCodeUnits);
  if (
    anchorAttributeNames.length !== 3 ||
    anchorAttributeNames[0] !== "href" ||
    anchorAttributeNames[1] !== "target" ||
    anchorAttributeNames[2] !== "title" ||
    attribute(anchor, "target") !== "_blank"
  ) {
    contractError("unexpected_structure", `${path}.caseName.link.attributes`);
  }
  const caseName = collapseVisibleText(anchor);
  if (
    caseName !== SUPREME_COURT_SELECTED_OPINION.caseName ||
    collapseVisibleText(nameCell) !== caseName ||
    hasDisallowedControl(caseName)
  ) {
    contractError("inconsistent_value", `${path}.caseName`);
  }
  const rawHref = attribute(anchor, "href");
  if (rawHref === null) {
    contractError("missing_field", `${path}.boundVolumeUrl`);
  }
  const boundVolumeUrl = validateBoundVolumeHref(
    rawHref,
    `${path}.boundVolumeUrl`,
  );

  if (
    assertPlainTextCell(cells[4] as Element, `${path}.principalOpinionCode`) !==
    SUPREME_COURT_SELECTED_OPINION.principalOpinionCode
  ) {
    contractError("inconsistent_value", `${path}.principalOpinionCode`);
  }
  const reporterCitation = assertReporterCitationCell(
    cells[5] as Element,
    `${path}.reporterCitation`,
  );
  if (
    !/^\d{1,3} U\.S\. \d{1,4}$/u.test(reporterCitation) ||
    reporterCitation !== SUPREME_COURT_SELECTED_OPINION.reporterCitation
  ) {
    contractError("inconsistent_value", `${path}.reporterCitation`);
  }

  return {
    tableIndex,
    dataRowIndex,
    revisionElementExposed,
    decisionDateSourceText,
    decisionDate,
    docketNumber,
    caseName,
    reporterCitation,
    boundVolumeUrl,
  };
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function assertSupremeCourtOpinionProjection(
  value: unknown,
): SupremeCourtOpinionProjection {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    contractError("invalid_type", "$row");
  }
  const row = value as Record<string, unknown>;
  const expectedKeys = [
    "boundVolumeUrl",
    "caseName",
    "dataRowIndex",
    "decisionDate",
    "decisionDateSourceText",
    "docketNumber",
    "reporterCitation",
    "revisionElementExposed",
    "tableIndex",
  ];
  const keys = Object.keys(row).sort(compareCodeUnits);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    contractError("unexpected_field", "$row");
  }
  if (
    row.tableIndex !== 1 ||
    !Number.isSafeInteger(row.dataRowIndex) ||
    row.dataRowIndex !== 41 ||
    row.revisionElementExposed !== false ||
    row.decisionDateSourceText !==
      SUPREME_COURT_SELECTED_OPINION.decisionDateSourceText ||
    row.decisionDate !== SUPREME_COURT_SELECTED_OPINION.decisionDate ||
    row.docketNumber !== SUPREME_COURT_SELECTED_OPINION.docketNumber ||
    row.caseName !== SUPREME_COURT_SELECTED_OPINION.caseName ||
    row.reporterCitation !== SUPREME_COURT_SELECTED_OPINION.reporterCitation ||
    row.boundVolumeUrl !== SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl
  ) {
    contractError("inconsistent_value", "$row");
  }
  return {
    tableIndex: 1,
    dataRowIndex: 41,
    revisionElementExposed: false,
    decisionDateSourceText:
      SUPREME_COURT_SELECTED_OPINION.decisionDateSourceText,
    decisionDate: SUPREME_COURT_SELECTED_OPINION.decisionDate,
    docketNumber: SUPREME_COURT_SELECTED_OPINION.docketNumber,
    caseName: SUPREME_COURT_SELECTED_OPINION.caseName,
    reporterCitation: SUPREME_COURT_SELECTED_OPINION.reporterCitation,
    boundVolumeUrl: SUPREME_COURT_SELECTED_OPINION.boundVolumeUrl,
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

export function supremeCourtSourceRecordId(
  row: Pick<SupremeCourtOpinionProjection, "docketNumber" | "reporterCitation">,
): string {
  return `${row.docketNumber}@${row.reporterCitation}`;
}

export function parseSupremeCourtTermIndex(
  html: string,
): Readonly<SupremeCourtTermIndex> {
  if (typeof html !== "string") {
    contractError("invalid_type", "$document");
  }
  if (html === "") {
    contractError("missing_field", "$document");
  }

  const parseErrors: ParserError[] = [];
  const document = parse(html, {
    onParseError: (error) => parseErrors.push(error),
    sourceCodeLocationInfo: true,
  });
  assertParserBounds(document);

  const headings = descendants(document)
    .filter(isHtmlElement)
    .filter(
      (element) =>
        element.tagName === "h3" &&
        collapseVisibleText(element) === SUPREME_COURT_TERM_HEADING,
    );
  if (headings.length !== 1) {
    contractError(
      headings.length === 0 ? "missing_field" : "duplicate_value",
      "$document.termHeading",
    );
  }
  const heading = headings[0] as Element;

  const opinionTables = descendants(document)
    .filter(isHtmlElement)
    .filter(
      (element) =>
        element.tagName === "table" &&
        attribute(element, "class") === SUPREME_COURT_OPINION_TABLE_CLASS &&
        attribute(element, "id") === null,
    );
  if (
    opinionTables.length !== SUPREME_COURT_HTML_POLICY.requiredOpinionTables
  ) {
    contractError(
      opinionTables.length < SUPREME_COURT_HTML_POLICY.requiredOpinionTables
        ? "missing_field"
        : "duplicate_value",
      "$document.opinionTables",
    );
  }
  assertParseErrors(parseErrors, [heading, ...opinionTables]);

  const locatedRows = opinionTables.flatMap((table, tableIndex) =>
    rowsForOpinionTable(table, tableIndex),
  );
  if (
    locatedRows.length < 1 ||
    locatedRows.length > SUPREME_COURT_HTML_POLICY.maximumDataRows
  ) {
    contractError("limit_exceeded", "$document.opinionTables.rows");
  }

  const targets = locatedRows.filter(
    ({ cells }) =>
      collapseVisibleText(cells[2] as Element) ===
      SUPREME_COURT_SELECTED_OPINION.docketNumber,
  );
  if (targets.length !== 1) {
    contractError(
      targets.length === 0 ? "missing_field" : "duplicate_value",
      "$document.opinionTables.target",
    );
  }
  const projection = parseTargetRow(targets[0] as LocatedRow);

  return deepFreeze({
    contractVersion: SUPREME_COURT_OPINIONS_CONTRACT_VERSION,
    indexUrl: SUPREME_COURT_TERM_URL,
    termHeading: SUPREME_COURT_TERM_HEADING,
    dataRowCount: locatedRows.length,
    rows: [projection],
  });
}
