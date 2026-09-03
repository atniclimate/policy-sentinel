export const FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER = "2026-16965";

export const FEDERAL_REGISTER_TIER1_FIELDS = Object.freeze([
  "document_number",
  "title",
  "type",
  "subtype",
  "publication_date",
  "effective_on",
  "comments_close_on",
  "signing_date",
  "citation",
  "volume",
  "start_page",
  "end_page",
  "agencies",
  "docket_ids",
  "regulation_id_numbers",
  "cfr_references",
  "topics",
  "cfr_topics",
  "html_url",
  "pdf_url",
  "json_url",
  "full_text_xml_url",
  "raw_text_url",
]);

const DOCUMENT_TYPES = Object.freeze([
  "Rule",
  "Proposed Rule",
  "Notice",
  "Presidential Document",
  "Uncategorized Document",
]);
const DOCUMENT_TYPE_SET = new Set(DOCUMENT_TYPES);
const TOP_LEVEL_KEYS = new Set(FEDERAL_REGISTER_TIER1_FIELDS);
const AGENCY_KEYS = Object.freeze([
  "raw_name",
  "name",
  "id",
  "slug",
  "parent_id",
  "url",
  "json_url",
]);
const FEDERAL_REGISTER_ORIGIN = "https://www.federalregister.gov";
const GOVINFO_ORIGIN = "https://www.govinfo.gov";
const ECFR_ORIGIN = "https://www.ecfr.gov";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ARRAY_INDEX_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const MAXIMUM_JSON_DEPTH = 32;
const MAXIMUM_JSON_TEXT_LENGTH = 65_536;

export class FederalRegisterTier1ContractError extends TypeError {
  constructor(code, path, detail) {
    super(`Federal Register Tier-1 contract ${code} at ${path}: ${detail}`);
    this.name = "FederalRegisterTier1ContractError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, detail) {
  throw new FederalRegisterTier1ContractError(code, path, detail);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function captureJsonValue(value, path, ancestors, depth) {
  if (depth > MAXIMUM_JSON_DEPTH) {
    fail("invalid_json", path, "JSON nesting exceeds the Tier-1 ceiling");
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(value) ||
      Object.is(value, -0)
    ) {
      fail("invalid_json", path, "number is not a finite safe integer");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("invalid_json", path, "value is outside the JSON data model");
  }
  if (ancestors.has(value)) {
    fail("invalid_json", path, "cyclic data is forbidden");
  }
  ancestors.add(value);
  try {
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      prototype !== (isArray ? Array.prototype : Object.prototype) &&
      !(prototype === null && !isArray)
    ) {
      fail("invalid_json", path, "container is not a plain JSON container");
    }

    const keys = Reflect.ownKeys(value);
    const entries = [];
    let length = null;
    if (isArray) {
      const descriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !Number.isSafeInteger(descriptor.value) ||
        descriptor.value < 0
      ) {
        fail("invalid_json", path, "array length is invalid");
      }
      length = descriptor.value;
    }

    for (const key of keys) {
      if (typeof key !== "string") {
        fail("invalid_json", path, "symbol properties are forbidden");
      }
      if (isArray && key === "length") {
        continue;
      }
      if (
        isArray &&
        (!ARRAY_INDEX_PATTERN.test(key) || Number(key) >= length)
      ) {
        fail("invalid_json", path, "array has a non-index property");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        fail("invalid_json", path, "only enumerable data properties are valid");
      }
      entries.push([
        key,
        captureJsonValue(
          descriptor.value,
          isArray ? `${path}[${key}]` : `${path}.${key}`,
          ancestors,
          depth + 1,
        ),
      ]);
    }

    if (isArray) {
      entries.sort(([left], [right]) => Number(left) - Number(right));
      if (entries.length !== length) {
        fail("invalid_json", path, "sparse arrays are forbidden");
      }
      return entries.map(([key, nested], index) => {
        if (Number(key) !== index) {
          fail("invalid_json", path, "sparse arrays are forbidden");
        }
        return nested;
      });
    }
    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

function captureJsonSnapshot(value) {
  try {
    return deepFreeze(captureJsonValue(value, "$", new WeakSet(), 0));
  } catch {
    fail(
      "invalid_json",
      "$",
      "input could not be captured as one detached plain-JSON snapshot",
    );
  }
}

function object(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_type", path, "expected a plain object");
  }
  return value;
}

function exactKeys(value, path, required, optional = []) {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail("unexpected_field", `${path}.${key}`, "field is outside Tier-1");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      fail("missing_field", `${path}.${key}`, "required field is absent");
    }
  }
}

function text(value, path, maximumLength = 16_384) {
  if (typeof value !== "string") {
    fail("invalid_type", path, "expected a string");
  }
  if (
    value.length === 0 ||
    value.trim().length === 0 ||
    value.length > maximumLength ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 0x1f || codePoint === 0x7f;
    })
  ) {
    fail("invalid_value", path, "string is blank, unsafe, or too long");
  }
  return value;
}

function nullableText(value, path, maximumLength = 16_384) {
  return value === null ? null : text(value, path, maximumLength);
}

function integer(value, path, minimum, maximum) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < minimum ||
    value > maximum
  ) {
    fail("invalid_value", path, "expected a bounded safe integer");
  }
  return value;
}

function nullableInteger(value, path, minimum, maximum) {
  return value === null ? null : integer(value, path, minimum, maximum);
}

function date(value, path) {
  const parsed = text(value, path, 10);
  const match = DATE_PATTERN.exec(parsed);
  if (match === null) {
    fail("invalid_value", path, "expected an ISO calendar date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > monthLengths[month - 1]
  ) {
    fail("invalid_value", path, "expected a real ISO calendar date");
  }
  return parsed;
}

function nullableDate(value, path) {
  return value === null ? null : date(value, path);
}

function array(value, path, maximumItems) {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumItems) {
    fail("limit_exceeded", path, "array exceeds the Tier-1 item ceiling");
  }
  return value;
}

function uniqueStrings(value, path, maximumItems, maximumLength) {
  const parsed = array(value, path, maximumItems).map((item, index) =>
    text(item, `${path}[${index}]`, maximumLength),
  );
  if (new Set(parsed).size !== parsed.length) {
    fail("duplicate_value", path, "array contains a duplicate string");
  }
  return parsed;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort(compareCodeUnits)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function requireUniqueObjects(values, path) {
  const identities = values.map(canonicalJson);
  if (new Set(identities).size !== identities.length) {
    fail("duplicate_value", path, "array contains a duplicate object");
  }
  return values;
}

function httpsUrl(value, path) {
  const raw = text(value, path, 8_192);
  let parsed;
  try {
    parsed = new globalThis.URL(raw);
  } catch {
    fail("invalid_url", path, "expected an absolute HTTPS URL");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.hash !== "" ||
    parsed.href !== raw
  ) {
    fail("invalid_url", path, "URL violates the canonical HTTPS boundary");
  }
  return parsed;
}

function exactUrl(value, path, origin, pathname, search = "") {
  const parsed = httpsUrl(value, path);
  if (
    parsed.origin !== origin ||
    parsed.pathname !== pathname ||
    parsed.search !== search
  ) {
    fail("invalid_url", path, "URL host or typed path does not match Tier-1");
  }
  return parsed.href;
}

function parseAgencyEnvelopeUrl(value, path, slug, kind) {
  const parsed = httpsUrl(value, path);
  const prefix = kind === "page" ? "/agencies/" : "/api/v1/agencies/";
  const pathSlug = parsed.pathname.slice(prefix.length);
  if (
    parsed.origin !== FEDERAL_REGISTER_ORIGIN ||
    parsed.search !== "" ||
    !parsed.pathname.startsWith(prefix) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathSlug) ||
    (slug !== undefined && pathSlug !== slug)
  ) {
    fail("invalid_url", path, "agency envelope URL is outside its typed path");
  }
  return pathSlug;
}

function parseAgency(value, path) {
  const parsed = object(value, path);
  exactKeys(parsed, path, ["raw_name"], AGENCY_KEYS.slice(1));
  const agency = {
    raw_name: text(parsed.raw_name, `${path}.raw_name`, 1_024),
  };
  if (Object.hasOwn(parsed, "name")) {
    agency.name = text(parsed.name, `${path}.name`, 1_024);
  }
  if (Object.hasOwn(parsed, "id")) {
    agency.id = integer(parsed.id, `${path}.id`, 1, Number.MAX_SAFE_INTEGER);
  }
  if (Object.hasOwn(parsed, "slug")) {
    agency.slug = text(parsed.slug, `${path}.slug`, 256);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agency.slug)) {
      fail("invalid_value", `${path}.slug`, "agency slug is not canonical");
    }
  }
  if (Object.hasOwn(parsed, "parent_id")) {
    agency.parent_id = nullableInteger(
      parsed.parent_id,
      `${path}.parent_id`,
      1,
      Number.MAX_SAFE_INTEGER,
    );
  }
  const pageEnvelopeSlug = Object.hasOwn(parsed, "url")
    ? parseAgencyEnvelopeUrl(parsed.url, `${path}.url`, agency.slug, "page")
    : null;
  const apiEnvelopeSlug = Object.hasOwn(parsed, "json_url")
    ? parseAgencyEnvelopeUrl(
        parsed.json_url,
        `${path}.json_url`,
        agency.slug,
        "api",
      )
    : null;
  if (
    pageEnvelopeSlug !== null &&
    apiEnvelopeSlug !== null &&
    pageEnvelopeSlug !== apiEnvelopeSlug
  ) {
    fail(
      "inconsistent_field",
      path,
      "agency page and API envelope paths identify different slugs",
    );
  }
  return agency;
}

function parseCfrScalar(value, path) {
  if (value === null) {
    return null;
  }
  return typeof value === "number"
    ? integer(value, path, 0, 100_000)
    : text(value, path, 64);
}

function parseCfrReference(value, path) {
  const parsed = object(value, path);
  exactKeys(parsed, path, ["chapter", "citation_url", "part", "title"]);
  const chapter = parseCfrScalar(parsed.chapter, `${path}.chapter`);
  const part = parseCfrScalar(parsed.part, `${path}.part`);
  const title = integer(parsed.title, `${path}.title`, 1, 50);
  let citationUrl = null;
  if (parsed.citation_url !== null) {
    const url = httpsUrl(parsed.citation_url, `${path}.citation_url`);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.origin !== ECFR_ORIGIN ||
      url.search !== "" ||
      segments[0] !== "current" ||
      segments[1] !== `title-${title}` ||
      (chapter !== null && !segments.includes(`chapter-${String(chapter)}`)) ||
      (part !== null && !segments.includes(`part-${String(part)}`))
    ) {
      fail(
        "invalid_url",
        `${path}.citation_url`,
        "eCFR citation URL does not match its title and part",
      );
    }
    citationUrl = url.href;
  }
  return { chapter, citation_url: citationUrl, part, title };
}

function parseCfrTopic(value, path) {
  const parsed = object(value, path);
  exactKeys(parsed, path, ["cfr_part", "topics", "cfr_title"], ["cfr_chapter"]);
  const result = {
    cfr_part: text(parsed.cfr_part, `${path}.cfr_part`, 64),
    topics: uniqueStrings(parsed.topics, `${path}.topics`, 128, 512),
    cfr_title: integer(parsed.cfr_title, `${path}.cfr_title`, 1, 50),
  };
  if (result.topics.length === 0) {
    fail("invalid_value", `${path}.topics`, "CFR topic group cannot be empty");
  }
  if (Object.hasOwn(parsed, "cfr_chapter")) {
    result.cfr_chapter = nullableText(
      parsed.cfr_chapter,
      `${path}.cfr_chapter`,
      64,
    );
  }
  return result;
}

function parseTypedLinks(parsed, documentNumber, publicationDate) {
  const [year, month, day] = publicationDate.split("-");
  const datePath = `${year}/${month}/${day}`;
  const htmlUrl = httpsUrl(parsed.html_url, "$.html_url");
  const htmlPrefix = `/documents/${datePath}/${documentNumber}/`;
  const htmlSlug = htmlUrl.pathname.slice(htmlPrefix.length);
  if (
    htmlUrl.origin !== FEDERAL_REGISTER_ORIGIN ||
    htmlUrl.search !== "" ||
    !htmlUrl.pathname.startsWith(htmlPrefix) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(htmlSlug)
  ) {
    fail(
      "invalid_url",
      "$.html_url",
      "HTML URL does not match the exact document identity and date",
    );
  }

  const jsonUrl = exactUrl(
    parsed.json_url,
    "$.json_url",
    FEDERAL_REGISTER_ORIGIN,
    `/api/v1/documents/${documentNumber}`,
    `?publication_date=${publicationDate}`,
  );
  const pdfUrl =
    parsed.pdf_url === null
      ? null
      : exactUrl(
          parsed.pdf_url,
          "$.pdf_url",
          GOVINFO_ORIGIN,
          `/content/pkg/FR-${publicationDate}/pdf/${documentNumber}.pdf`,
        );
  const fullTextXmlUrl =
    parsed.full_text_xml_url === null
      ? null
      : exactUrl(
          parsed.full_text_xml_url,
          "$.full_text_xml_url",
          FEDERAL_REGISTER_ORIGIN,
          `/documents/full_text/xml/${datePath}/${documentNumber}.xml`,
        );
  const rawTextUrl =
    parsed.raw_text_url === null
      ? null
      : exactUrl(
          parsed.raw_text_url,
          "$.raw_text_url",
          FEDERAL_REGISTER_ORIGIN,
          `/documents/full_text/text/${datePath}/${documentNumber}.txt`,
        );
  return {
    html_url: htmlUrl.href,
    pdf_url: pdfUrl,
    json_url: jsonUrl,
    full_text_xml_url: fullTextXmlUrl,
    raw_text_url: rawTextUrl,
  };
}

export function parseFederalRegisterTier1Document(value) {
  const snapshot = captureJsonSnapshot(value);
  const parsed = object(snapshot, "$");
  exactKeys(parsed, "$", FEDERAL_REGISTER_TIER1_FIELDS);
  if (Object.keys(parsed).length !== TOP_LEVEL_KEYS.size) {
    fail("invalid_value", "$", "Tier-1 document key cardinality changed");
  }

  const documentNumber = text(parsed.document_number, "$.document_number", 64);
  if (documentNumber !== FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER) {
    fail(
      "identity_mismatch",
      "$.document_number",
      "response is not the selected FR-A1 document",
    );
  }
  const type = text(parsed.type, "$.type", 64);
  if (!DOCUMENT_TYPE_SET.has(type)) {
    fail("invalid_value", "$.type", "document type is outside the closed enum");
  }
  const publicationDate = date(parsed.publication_date, "$.publication_date");
  const volume = nullableInteger(parsed.volume, "$.volume", 1, 9_999);
  const startPage = nullableInteger(
    parsed.start_page,
    "$.start_page",
    0,
    10_000_000,
  );
  const endPage = nullableInteger(parsed.end_page, "$.end_page", 0, 10_000_000);
  if (
    (startPage === null) !== (endPage === null) ||
    (startPage !== null && endPage !== null && startPage > endPage)
  ) {
    fail(
      "inconsistent_field",
      "$.start_page",
      "start and end pages must be a coherent nullable pair",
    );
  }
  const citation = nullableText(parsed.citation, "$.citation", 512);
  if (citation !== null) {
    const match = /^([1-9]\d{0,3}) FR ([1-9]\d{0,7})$/.exec(citation);
    if (
      match === null ||
      volume === null ||
      startPage === null ||
      Number(match[1]) !== volume ||
      Number(match[2]) !== startPage
    ) {
      fail(
        "inconsistent_field",
        "$.citation",
        "citation must agree with the retained volume and start page",
      );
    }
  }

  const agencies = requireUniqueObjects(
    array(parsed.agencies, "$.agencies", 64).map((agency, index) =>
      parseAgency(agency, `$.agencies[${index}]`),
    ),
    "$.agencies",
  );
  if (agencies.length === 0) {
    fail(
      "invalid_value",
      "$.agencies",
      "at least one exact nonblank agency raw_name is required",
    );
  }
  const agencyIds = agencies
    .map((agency) => agency.id)
    .filter((id) => id !== undefined);
  const agencySlugs = agencies
    .map((agency) => agency.slug)
    .filter((slug) => slug !== undefined);
  if (
    new Set(agencyIds).size !== agencyIds.length ||
    new Set(agencySlugs).size !== agencySlugs.length
  ) {
    fail(
      "duplicate_value",
      "$.agencies",
      "agency identity axes must be unique within the document",
    );
  }
  const docketIds = uniqueStrings(parsed.docket_ids, "$.docket_ids", 64, 512);
  if (docketIds.length !== 0) {
    fail(
      "identity_mismatch",
      "$.docket_ids",
      "FR-A1 must preserve the observed structured empty docket array",
    );
  }
  const cfrReferencesValue =
    parsed.cfr_references === null
      ? null
      : requireUniqueObjects(
          array(parsed.cfr_references, "$.cfr_references", 128).map(
            (reference, index) =>
              parseCfrReference(reference, `$.cfr_references[${index}]`),
          ),
          "$.cfr_references",
        );
  const cfrTopicsValue =
    parsed.cfr_topics === null
      ? null
      : requireUniqueObjects(
          array(parsed.cfr_topics, "$.cfr_topics", 128).map((topic, index) =>
            parseCfrTopic(topic, `$.cfr_topics[${index}]`),
          ),
          "$.cfr_topics",
        );
  const links = parseTypedLinks(parsed, documentNumber, publicationDate);
  const regulationIdNumbers = uniqueStrings(
    parsed.regulation_id_numbers,
    "$.regulation_id_numbers",
    128,
    512,
  );
  if (
    regulationIdNumbers.some(
      (identifier) => !/^[0-9]{4}-[A-Z0-9]{4}$/.test(identifier),
    )
  ) {
    fail(
      "invalid_value",
      "$.regulation_id_numbers",
      "RIN values must use the reviewed provider identifier shape",
    );
  }

  return deepFreeze({
    document_number: documentNumber,
    title: text(parsed.title, "$.title"),
    type,
    subtype: nullableText(parsed.subtype, "$.subtype", 512),
    publication_date: publicationDate,
    effective_on: nullableDate(parsed.effective_on, "$.effective_on"),
    comments_close_on: nullableDate(
      parsed.comments_close_on,
      "$.comments_close_on",
    ),
    signing_date: nullableDate(parsed.signing_date, "$.signing_date"),
    citation,
    volume,
    start_page: startPage,
    end_page: endPage,
    agencies,
    docket_ids: docketIds,
    regulation_id_numbers: regulationIdNumbers,
    cfr_references: cfrReferencesValue,
    topics: uniqueStrings(parsed.topics, "$.topics", 256, 512),
    cfr_topics: cfrTopicsValue,
    ...links,
  });
}

export function serializeFederalRegisterTier1Document(value) {
  return canonicalJson(parseFederalRegisterTier1Document(value));
}

function utf8ByteLength(value) {
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      length += 1;
    } else if (codeUnit <= 0x7ff) {
      length += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      length += 4;
      index += 1;
    } else {
      length += 3;
    }
    if (length > MAXIMUM_JSON_TEXT_LENGTH) {
      return length;
    }
  }
  return length;
}

function parseJsonSyntax(textValue) {
  let index = 0;

  const syntax = () => {
    throw new SyntaxError("invalid Tier-1 JSON syntax");
  };
  const whitespace = () => {
    while (
      textValue[index] === " " ||
      textValue[index] === "\n" ||
      textValue[index] === "\r" ||
      textValue[index] === "\t"
    ) {
      index += 1;
    }
  };
  const stringToken = () => {
    if (textValue[index] !== '"') {
      syntax();
    }
    const start = index;
    index += 1;
    while (index < textValue.length) {
      const character = textValue[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(textValue.slice(start, index));
        } catch {
          syntax();
        }
      }
      if (character === "\\") {
        index += 2;
      } else {
        index += 1;
      }
    }
    syntax();
  };
  const value = (depth) => {
    if (depth > MAXIMUM_JSON_DEPTH) {
      syntax();
    }
    whitespace();
    const character = textValue[index];
    if (character === '"') {
      return stringToken();
    }
    if (character === "{") {
      index += 1;
      whitespace();
      const result = Object.create(null);
      const keys = new Set();
      if (textValue[index] === "}") {
        index += 1;
        return result;
      }
      while (index < textValue.length) {
        whitespace();
        const key = stringToken();
        if (keys.has(key)) {
          syntax();
        }
        keys.add(key);
        whitespace();
        if (textValue[index] !== ":") {
          syntax();
        }
        index += 1;
        result[key] = value(depth + 1);
        whitespace();
        if (textValue[index] === "}") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") {
          syntax();
        }
        index += 1;
      }
      syntax();
    }
    if (character === "[") {
      index += 1;
      whitespace();
      const result = [];
      if (textValue[index] === "]") {
        index += 1;
        return result;
      }
      while (index < textValue.length) {
        result.push(value(depth + 1));
        whitespace();
        if (textValue[index] === "]") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") {
          syntax();
        }
        index += 1;
      }
      syntax();
    }
    for (const [literal, parsed] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ]) {
      if (textValue.startsWith(literal, index)) {
        index += literal.length;
        return parsed;
      }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      textValue.slice(index),
    );
    if (match === null) {
      syntax();
    }
    index += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) {
      syntax();
    }
    return number;
  };

  const parsed = value(0);
  whitespace();
  if (index !== textValue.length) {
    syntax();
  }
  return parsed;
}

export function parseFederalRegisterTier1DocumentJson(textValue) {
  if (
    typeof textValue !== "string" ||
    textValue.length === 0 ||
    textValue.length > MAXIMUM_JSON_TEXT_LENGTH ||
    utf8ByteLength(textValue) > MAXIMUM_JSON_TEXT_LENGTH
  ) {
    fail(
      "invalid_json",
      "$",
      "JSON text is absent or outside the byte ceiling",
    );
  }
  let parsed;
  try {
    parsed = parseJsonSyntax(textValue);
  } catch {
    fail(
      "invalid_json",
      "$",
      "JSON text is malformed or contains a duplicate object member",
    );
  }
  return parseFederalRegisterTier1Document(parsed);
}
