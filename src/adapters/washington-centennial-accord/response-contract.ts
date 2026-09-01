import {
  ErrorCodes,
  parse,
  type DefaultTreeAdapterMap,
  type ParserError,
} from "parse5";

import {
  GOIA_ACCORD_HTML_POLICY,
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_PATH,
  GOIA_ACCORD_URL,
  WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION,
} from "./constants";
import { GoiaAccordContractError } from "./errors";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

export interface GoiaAccordProjection {
  pageTitle: typeof GOIA_ACCORD_METADATA.pageTitle;
  instrumentTitle: typeof GOIA_ACCORD_METADATA.instrumentTitle;
  statePartyName: typeof GOIA_ACCORD_METADATA.statePartyName;
  stateExecutingLabel: typeof GOIA_ACCORD_METADATA.stateExecutingLabel;
  stateSignatoryLabel: typeof GOIA_ACCORD_METADATA.stateSignatoryLabel;
  tribalPartyName: typeof GOIA_ACCORD_METADATA.tribalPartyName;
  tribalSignatoryLabel: typeof GOIA_ACCORD_METADATA.tribalSignatoryLabel;
  executionSourceLabel: typeof GOIA_ACCORD_METADATA.executionSourceLabel;
  executionDate: typeof GOIA_ACCORD_METADATA.executionDate;
  officialUrl: typeof GOIA_ACCORD_URL;
  articleDirectElementCount: 26;
}

export interface GoiaAccordPage {
  contractVersion: typeof WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION;
  pageUrl: typeof GOIA_ACCORD_URL;
  projection: Readonly<GoiaAccordProjection>;
}

interface TraversalEntry {
  node: Node;
  depth: number;
}

function contractError(
  code: ConstructorParameters<typeof GoiaAccordContractError>[0],
  path: string,
): never {
  throw new GoiaAccordContractError(code, path);
}

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function isHtmlElement(node: Node): node is Element {
  return isElement(node) && node.namespaceURI === HTML_NAMESPACE;
}

function childNodes(node: Node): Node[] {
  const children =
    "childNodes" in node ? ([...node.childNodes] as unknown as Node[]) : [];
  if ("content" in node) {
    children.push(...(node.content.childNodes as unknown as Node[]));
  }
  return children;
}

function semanticChildNodes(node: Node): Node[] {
  if (isHtmlElement(node) && node.tagName === "template") {
    return [];
  }
  return "childNodes" in node
    ? ([...node.childNodes] as unknown as Node[])
    : [];
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

function structuralDescendants(node: Node): Node[] {
  const result: Node[] = [];
  const stack = childNodes(node).reverse();
  while (stack.length > 0) {
    const current = stack.pop() as Node;
    result.push(current);
    stack.push(...childNodes(current).reverse());
  }
  return result;
}

function attribute(element: Element, name: string): string | null {
  return (
    element.attrs.find((candidate) => candidate.name === name)?.value ?? null
  );
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
      ["script", "style", "template"].includes(current.tagName)
    ) {
      continue;
    }
    stack.push(...semanticChildNodes(current).reverse());
  }
  return fragments.join("").normalize("NFC").replace(/\s+/gu, " ").trim();
}

function hasDisallowedControl(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point !== undefined && (point <= 0x1f || point === 0x7f)) {
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
    if (nodeCount > GOIA_ACCORD_HTML_POLICY.maximumDomNodes) {
      contractError("limit_exceeded", "$document.nodes");
    }
    if (depth > GOIA_ACCORD_HTML_POLICY.maximumDomDepth) {
      contractError("limit_exceeded", "$document.depth");
    }
    if (isElement(node)) {
      if (
        node.attrs.length > GOIA_ACCORD_HTML_POLICY.maximumAttributesPerElement
      ) {
        contractError("limit_exceeded", "$document.elementAttributes");
      }
      attributeCount += node.attrs.length;
      if (attributeCount > GOIA_ACCORD_HTML_POLICY.maximumDomAttributes) {
        contractError("limit_exceeded", "$document.attributes");
      }
    } else if ("value" in node) {
      textCodeUnits += node.value.length;
      if (textCodeUnits > GOIA_ACCORD_HTML_POLICY.maximumTextCodeUnits) {
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
    errors.length > GOIA_ACCORD_HTML_POLICY.maximumParseErrors ||
    errors.some(({ code }) => code !== ErrorCodes.duplicateAttribute)
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
    contractError("unexpected_structure", "$document.article.html");
  }
}

function occurrences(value: string, fragment: string): number {
  let count = 0;
  let offset = 0;
  while (true) {
    const next = value.indexOf(fragment, offset);
    if (next < 0) {
      return count;
    }
    count += 1;
    offset = next + fragment.length;
  }
}

function assertDirectElementContract(body: Element): readonly Element[] {
  const directElements = body.childNodes.filter(isHtmlElement);
  if (
    directElements.length !==
    GOIA_ACCORD_HTML_POLICY.requiredArticleBodyDirectElements
  ) {
    contractError("inconsistent_value", "$article.body.directElements");
  }
  const tagCounts = new Map<string, number>();
  for (const [index, element] of directElements.entries()) {
    if (!["h2", "h3", "p"].includes(element.tagName)) {
      contractError(
        "unexpected_structure",
        `$article.body.directElements[${index}]`,
      );
    }
    tagCounts.set(element.tagName, (tagCounts.get(element.tagName) ?? 0) + 1);
    const text = collapseVisibleText(element);
    if (
      text === "" ||
      text.length > GOIA_ACCORD_HTML_POLICY.maximumDirectElementTextCodeUnits ||
      hasDisallowedControl(text)
    ) {
      contractError("invalid_value", `$article.body.directElements[${index}]`);
    }
  }
  if (
    tagCounts.get("h2") !== 1 ||
    tagCounts.get("h3") !== 5 ||
    tagCounts.get("p") !== 20
  ) {
    contractError("inconsistent_value", "$article.body.directElementKinds");
  }
  return directElements;
}

function assertArticleMetadata(body: Element): void {
  const directElements = assertDirectElementContract(body);
  const titleHeadings = directElements.filter(
    (element) =>
      element.tagName === "h2" &&
      collapseVisibleText(element) === GOIA_ACCORD_METADATA.instrumentTitle,
  );
  if (titleHeadings.length !== 1) {
    contractError(
      titleHeadings.length === 0 ? "missing_field" : "duplicate_value",
      "$article.instrumentTitle",
    );
  }

  const articleText = collapseVisibleText(body);
  if (
    articleText.length > GOIA_ACCORD_HTML_POLICY.maximumArticleTextCodeUnits ||
    hasDisallowedControl(articleText)
  ) {
    contractError("limit_exceeded", "$article.text");
  }
  for (const [field, fragment] of Object.entries({
    stateExecutingLabel: GOIA_ACCORD_METADATA.stateExecutingLabel,
    stateSignatoryLabel: GOIA_ACCORD_METADATA.stateSignatoryLabel,
    tribalPartyName: GOIA_ACCORD_METADATA.tribalPartyName,
    tribalSignatoryLabel: GOIA_ACCORD_METADATA.tribalSignatoryLabel,
    executionSourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
  })) {
    if (occurrences(articleText, fragment) < 1) {
      contractError("missing_field", `$article.${field}`);
    }
  }
  const executionParagraphs = directElements.filter(
    (element) =>
      element.tagName === "p" &&
      collapseVisibleText(element).includes(
        GOIA_ACCORD_METADATA.executionSourceLabel,
      ),
  );
  if (executionParagraphs.length !== 1) {
    contractError(
      executionParagraphs.length === 0 ? "missing_field" : "duplicate_value",
      "$article.executionEvent",
    );
  }

  const forbidden = new Set([
    "a",
    "button",
    "embed",
    "form",
    "iframe",
    "img",
    "input",
    "map",
    "object",
    "script",
    "style",
    "svg",
    "table",
    "template",
    "textarea",
  ]);
  if (
    structuralDescendants(body).some(
      (node) => isHtmlElement(node) && forbidden.has(node.tagName),
    )
  ) {
    contractError("unexpected_structure", "$article.embeddedContent");
  }
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function assertGoiaAccordProjection(
  value: unknown,
): GoiaAccordProjection {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    contractError("invalid_type", "$projection");
  }
  const projection = value as Record<string, unknown>;
  const expected = [
    "articleDirectElementCount",
    "executionDate",
    "executionSourceLabel",
    "instrumentTitle",
    "officialUrl",
    "pageTitle",
    "stateExecutingLabel",
    "statePartyName",
    "stateSignatoryLabel",
    "tribalPartyName",
    "tribalSignatoryLabel",
  ];
  const keys = Object.keys(projection).sort(compareCodeUnits);
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    contractError("unexpected_field", "$projection");
  }
  const canonical = {
    pageTitle: GOIA_ACCORD_METADATA.pageTitle,
    instrumentTitle: GOIA_ACCORD_METADATA.instrumentTitle,
    statePartyName: GOIA_ACCORD_METADATA.statePartyName,
    stateExecutingLabel: GOIA_ACCORD_METADATA.stateExecutingLabel,
    stateSignatoryLabel: GOIA_ACCORD_METADATA.stateSignatoryLabel,
    tribalPartyName: GOIA_ACCORD_METADATA.tribalPartyName,
    tribalSignatoryLabel: GOIA_ACCORD_METADATA.tribalSignatoryLabel,
    executionSourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
    executionDate: GOIA_ACCORD_METADATA.executionDate,
    officialUrl: GOIA_ACCORD_URL,
    articleDirectElementCount: 26,
  } as const;
  if (
    Object.entries(canonical).some(
      ([key, expectedValue]) => projection[key] !== expectedValue,
    )
  ) {
    contractError("inconsistent_value", "$projection");
  }
  return { ...canonical };
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

export function goiaAccordSourceRecordId(): string {
  return GOIA_ACCORD_METADATA.fallbackIdentifier;
}

export function parseGoiaAccordPage(html: string): Readonly<GoiaAccordPage> {
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

  const elements = descendants(document).filter(isHtmlElement);
  const pageTitles = elements.filter(
    (element) =>
      element.tagName === "h1" &&
      collapseVisibleText(element) === GOIA_ACCORD_METADATA.pageTitle,
  );
  if (pageTitles.length !== 1) {
    contractError(
      pageTitles.length === 0 ? "missing_field" : "duplicate_value",
      "$document.pageTitle",
    );
  }
  const articles = elements.filter(
    (element) =>
      element.tagName === "article" &&
      attribute(element, "about") === GOIA_ACCORD_PATH,
  );
  if (articles.length !== 1) {
    contractError(
      articles.length === 0 ? "missing_field" : "duplicate_value",
      "$document.canonicalArticle",
    );
  }
  const article = articles[0] as Element;
  if (
    structuralDescendants(article).some(
      (node) => isHtmlElement(node) && node.tagName === "template",
    )
  ) {
    contractError("unexpected_structure", "$article.embeddedContent");
  }
  const bodies = descendants(article)
    .filter(isHtmlElement)
    .filter((element) => attribute(element, "property") === "schema:text");
  if (bodies.length !== 1) {
    contractError(
      bodies.length === 0 ? "missing_field" : "duplicate_value",
      "$article.body",
    );
  }
  const body = bodies[0] as Element;
  assertParseErrors(parseErrors, [pageTitles[0] as Element, article, body]);
  assertArticleMetadata(body);

  return deepFreeze({
    contractVersion: WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION,
    pageUrl: GOIA_ACCORD_URL,
    projection: assertGoiaAccordProjection({
      pageTitle: GOIA_ACCORD_METADATA.pageTitle,
      instrumentTitle: GOIA_ACCORD_METADATA.instrumentTitle,
      statePartyName: GOIA_ACCORD_METADATA.statePartyName,
      stateExecutingLabel: GOIA_ACCORD_METADATA.stateExecutingLabel,
      stateSignatoryLabel: GOIA_ACCORD_METADATA.stateSignatoryLabel,
      tribalPartyName: GOIA_ACCORD_METADATA.tribalPartyName,
      tribalSignatoryLabel: GOIA_ACCORD_METADATA.tribalSignatoryLabel,
      executionSourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
      executionDate: GOIA_ACCORD_METADATA.executionDate,
      officialUrl: GOIA_ACCORD_URL,
      articleDirectElementCount: 26,
    }),
  });
}
