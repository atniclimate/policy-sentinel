import {
  CONGRESS_GOV_BILL_TYPES,
  CONGRESS_GOV_CONTRACT_VERSION,
  CONGRESS_GOV_PUBLIC_BILL_TYPE_SLUGS,
  CONGRESS_GOV_QUERY_POLICY,
  CONGRESS_GOV_REFERENCE_HOSTS,
  CONGRESS_GOV_SOURCE_ID,
  CONGRESS_GOV_SYNTHETIC_NOTICE,
  type CongressGovBillType,
} from "./constants";

export type CongressGovContractErrorCode =
  | "duplicate_value"
  | "inconsistent_response"
  | "invalid_type"
  | "invalid_url"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field";

export class CongressGovContractError extends Error {
  readonly code: CongressGovContractErrorCode;
  readonly path: string;

  constructor(
    code: CongressGovContractErrorCode,
    path: string,
    message: string,
  ) {
    super(`Congress.gov contract ${code} at ${path}: ${message}`);
    this.name = "CongressGovContractError";
    this.code = code;
    this.path = path;
  }
}

export interface CongressGovSession {
  chamber: string;
  number: number;
  startDate: string;
  endDate?: string;
}

export interface CongressGovCongress {
  name: string;
  startYear: string;
  endYear: string;
  sessions: CongressGovSession[];
}

export interface CongressGovSourceSystem {
  code: number;
  name: string;
}

export interface CongressGovAction {
  actionDate: string;
  actionCode?: string;
  sourceSystem?: CongressGovSourceSystem;
  text: string;
  type: string;
}

export interface CongressGovLatestAction {
  actionDate: string;
  text: string;
}

export interface CongressGovLawReference {
  number: string;
  type: "Public Law" | "Private Law";
}

export interface CongressGovBill {
  congress: number;
  introducedDate: string;
  latestAction: CongressGovLatestAction;
  legislationUrl: string;
  laws?: CongressGovLawReference[];
  number: string;
  originChamber: "House" | "Senate";
  originChamberCode: "H" | "S";
  title: string;
  type: Uppercase<CongressGovBillType>;
  updateDate: string;
  updateDateIncludingText: string;
  url: string;
}

export interface CongressGovSponsor {
  bioguideId: string;
  fullName: string;
  isByRequest: "Y" | "N";
}

export interface CongressGovCommitteeActivity {
  date?: string;
  name: string;
}

export interface CongressGovCommittee {
  activities: CongressGovCommitteeActivity[];
  chamber: string;
  name: string;
  systemCode: string;
  type: string;
  url: string;
}

export interface CongressGovSummary {
  actionDate: string;
  actionDesc: string;
  updateDate: string;
  versionCode: string;
}

export interface CongressGovPolicyArea {
  name: string;
}

export interface CongressGovLegislativeSubject {
  name: string;
  updateDate: string;
}

export interface CongressGovSubjects {
  policyArea?: CongressGovPolicyArea;
  legislativeSubjects: CongressGovLegislativeSubject[];
}

export interface CongressGovTitle {
  billTextVersionCode?: string;
  billTextVersionName?: string;
  title: string;
  titleType: string;
  titleTypeCode: number;
  updateDate: string;
}

export interface CongressGovTextFormat {
  type: string;
  url: string;
}

export interface CongressGovTextVersion {
  date: string;
  formats: CongressGovTextFormat[];
  type: string;
}

export interface CongressGovSyntheticBundle {
  contractVersion: typeof CONGRESS_GOV_CONTRACT_VERSION;
  fixtureNotice: typeof CONGRESS_GOV_SYNTHETIC_NOTICE;
  sourceId: typeof CONGRESS_GOV_SOURCE_ID;
  resourcePath: string;
  stableId: string;
  congressNumber: number;
  congress: CongressGovCongress;
  bill: CongressGovBill;
  sponsors?: CongressGovSponsor[];
  committees?: CongressGovCommittee[];
  actions?: CongressGovAction[];
  summaries?: CongressGovSummary[];
  subjects?: CongressGovSubjects;
  titles?: CongressGovTitle[];
  textVersions?: CongressGovTextVersion[];
}

type JsonObject = Record<string, unknown>;
type ItemParser<T> = (value: unknown, path: string) => T;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z$/;
const BILL_NUMBER_PATTERN = /^[1-9]\d{0,5}$/;
const LAW_NUMBER_PATTERN = /^[1-9]\d{0,2}-[1-9]\d{0,5}$/;
const BIOGUIDE_ID_PATTERN = /^[A-Z][0-9]{6}$/;
const SYSTEM_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9-]{1,31}$/;
const FORBIDDEN_CREDENTIAL_PARAMETERS = new Set([
  "api_key",
  "apikey",
  "access_key",
  "access_token",
  "key",
  "token",
]);

function fail(
  code: CongressGovContractErrorCode,
  path: string,
  message: string,
): never {
  throw new CongressGovContractError(code, path, message);
}

function object(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail("invalid_type", path, "expected a plain object");
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail("unexpected_field", `${path}.${key}`, "field is not retained");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      fail("missing_field", `${path}.${key}`, "required field is missing");
    }
  }
}

function boundedString(
  value: unknown,
  path: string,
  maximumLength = 16_384,
): string {
  if (typeof value !== "string") {
    fail("invalid_type", path, "expected a string");
  }
  if (value.length === 0 || value.trim().length === 0) {
    fail("invalid_value", path, "expected a nonblank string");
  }
  if (value.length > maximumLength) {
    fail("limit_exceeded", path, "string exceeds the contract limit");
  }
  return value;
}

function exactString<T extends string>(
  value: unknown,
  path: string,
  expected: T,
): T {
  if (value !== expected) {
    fail("invalid_value", path, `expected ${JSON.stringify(expected)}`);
  }
  return expected;
}

function boundedInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail("invalid_value", path, "expected a bounded safe integer");
  }
  return value;
}

function calendarDate(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 10);
  const match = DATE_PATTERN.exec(parsed);
  if (!match) {
    fail("invalid_value", path, "expected an ISO calendar date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const epoch = Date.UTC(year, month - 1, day);
  const reconstructed = new Date(epoch);
  if (
    reconstructed.getUTCFullYear() !== year ||
    reconstructed.getUTCMonth() + 1 !== month ||
    reconstructed.getUTCDate() !== day
  ) {
    fail("invalid_value", path, "expected a real ISO calendar date");
  }
  return parsed;
}

function utcDateTime(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 28);
  const match = UTC_DATE_TIME_PATTERN.exec(parsed);
  if (!match) {
    fail("invalid_value", path, "expected a real UTC date-time");
  }
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map(Number);
  const epoch = Date.UTC(year, month - 1, day, hour, minute, second);
  const reconstructed = new Date(epoch);
  if (
    reconstructed.getUTCFullYear() !== year ||
    reconstructed.getUTCMonth() + 1 !== month ||
    reconstructed.getUTCDate() !== day ||
    reconstructed.getUTCHours() !== hour ||
    reconstructed.getUTCMinutes() !== minute ||
    reconstructed.getUTCSeconds() !== second
  ) {
    fail("invalid_value", path, "expected a real UTC date-time");
  }
  return parsed;
}

function sourceDate(value: unknown, path: string): string {
  return typeof value === "string" && value.length === 10
    ? calendarDate(value, path)
    : utcDateTime(value, path);
}

function httpsReferenceUrl(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 2_048);
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    fail("invalid_url", path, "expected an absolute URL");
  }
  if (
    url.protocol !== "https:" ||
    !CONGRESS_GOV_REFERENCE_HOSTS.has(url.hostname) ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.hash !== ""
  ) {
    fail("invalid_url", path, "URL is outside reviewed official hosts");
  }
  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_CREDENTIAL_PARAMETERS.has(key.toLowerCase())) {
      fail("invalid_url", path, "credential-bearing URLs are forbidden");
    }
  }
  return url.href;
}

function ordinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function assertKeylessApiReference(
  value: string,
  path: string,
  apiCongressPath: string,
): URL {
  const url = new URL(value);
  const expectedPath =
    url.hostname === "api.data.gov"
      ? `/congress${apiCongressPath}`
      : apiCongressPath;
  if (
    !["api.congress.gov", "api.data.gov"].includes(url.hostname) ||
    url.pathname !== expectedPath
  ) {
    fail("inconsistent_response", path, "API URL identity does not match");
  }
  for (const key of url.searchParams.keys()) {
    if (key !== "format" || url.searchParams.getAll(key).length !== 1) {
      fail("invalid_url", path, "API URL has an unsupported query field");
    }
  }
  const format = url.searchParams.get("format");
  if (format !== null && format !== "json" && format !== "xml") {
    fail("invalid_url", path, "API URL format is unsupported");
  }
  return url;
}

function assertBillIdentityUrls(
  apiReference: string,
  legislationReference: string,
  congress: number,
  billType: CongressGovBillType,
  number: string,
  path: string,
): void {
  assertKeylessApiReference(
    apiReference,
    `${path}.url`,
    `/v3/bill/${congress}/${billType}/${number}`,
  );
  const legislationUrl = new URL(legislationReference);
  const expectedPath = `/bill/${ordinal(congress)}-congress/${CONGRESS_GOV_PUBLIC_BILL_TYPE_SLUGS[billType]}/${number}`;
  if (
    legislationUrl.hostname !== "www.congress.gov" ||
    legislationUrl.pathname !== expectedPath ||
    legislationUrl.search !== ""
  ) {
    fail(
      "inconsistent_response",
      `${path}.legislationUrl`,
      "durable public URL identity does not match",
    );
  }
}

function list<T>(
  value: unknown,
  path: string,
  maximumLength: number,
  parseItem: ItemParser<T>,
): T[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumLength) {
    fail("limit_exceeded", path, "array exceeds the contract limit");
  }
  return value.map((item, index) => parseItem(item, `${path}[${index}]`));
}

function assertUnique(
  values: readonly string[],
  path: string,
  label: string,
): void {
  if (new Set(values).size !== values.length) {
    fail("duplicate_value", path, `duplicate ${label}`);
  }
}

function optional<T>(
  value: JsonObject,
  key: string,
  path: string,
  parseValue: ItemParser<T>,
): T | undefined {
  return Object.hasOwn(value, key)
    ? parseValue(value[key], `${path}.${key}`)
    : undefined;
}

function parseSession(value: unknown, path: string): CongressGovSession {
  const source = object(value, path);
  exactKeys(source, path, ["chamber", "number", "startDate"], ["endDate"]);
  const startDate = calendarDate(source.startDate, `${path}.startDate`);
  const endDate = optional(source, "endDate", path, calendarDate);
  if (endDate !== undefined && endDate < startDate) {
    fail("inconsistent_response", path, "session date range is reversed");
  }
  return {
    chamber: boundedString(source.chamber, `${path}.chamber`, 64),
    number: boundedInteger(source.number, `${path}.number`, 1, 9),
    startDate,
    ...(endDate === undefined ? {} : { endDate }),
  };
}

export function parseCongressGovCongress(
  value: unknown,
  path = "$.congress",
): CongressGovCongress {
  const source = object(value, path);
  exactKeys(source, path, ["name", "startYear", "endYear", "sessions"]);
  const startYear = boundedString(source.startYear, `${path}.startYear`, 4);
  const endYear = boundedString(source.endYear, `${path}.endYear`, 4);
  if (
    !/^\d{4}$/.test(startYear) ||
    !/^\d{4}$/.test(endYear) ||
    Number(startYear) < 1789 ||
    Number(endYear) > 4001 ||
    Number(endYear) < Number(startYear)
  ) {
    fail(
      "invalid_value",
      path,
      "expected an ordered documented string year range",
    );
  }
  const sessions = list(source.sessions, `${path}.sessions`, 8, parseSession);
  assertUnique(
    sessions.map(({ chamber, number }) => `${chamber}\0${number}`),
    `${path}.sessions`,
    "session identity",
  );
  return {
    name: boundedString(source.name, `${path}.name`, 128),
    startYear,
    endYear,
    sessions,
  };
}

function parseSourceSystem(
  value: unknown,
  path: string,
): CongressGovSourceSystem {
  const source = object(value, path);
  exactKeys(source, path, ["code", "name"]);
  return {
    code: boundedInteger(source.code, `${path}.code`, 0, 999),
    name: boundedString(source.name, `${path}.name`, 128),
  };
}

export function parseCongressGovAction(
  value: unknown,
  path = "$.action",
): CongressGovAction {
  const source = object(value, path);
  exactKeys(
    source,
    path,
    ["actionDate", "text", "type"],
    ["actionCode", "sourceSystem"],
  );
  const actionCode = optional(source, "actionCode", path, (entry, entryPath) =>
    boundedString(entry, entryPath, 64),
  );
  const sourceSystem = optional(
    source,
    "sourceSystem",
    path,
    parseSourceSystem,
  );
  return {
    actionDate: calendarDate(source.actionDate, `${path}.actionDate`),
    ...(actionCode === undefined ? {} : { actionCode }),
    ...(sourceSystem === undefined ? {} : { sourceSystem }),
    text: boundedString(source.text, `${path}.text`, 65_536),
    type: boundedString(source.type, `${path}.type`, 128),
  };
}

function parseLatestAction(
  value: unknown,
  path: string,
): CongressGovLatestAction {
  const source = object(value, path);
  exactKeys(source, path, ["actionDate", "text"]);
  return {
    actionDate: calendarDate(source.actionDate, `${path}.actionDate`),
    text: boundedString(source.text, `${path}.text`, 65_536),
  };
}

function parseLawReference(
  value: unknown,
  path: string,
): CongressGovLawReference {
  const source = object(value, path);
  exactKeys(source, path, ["number", "type"]);
  const type = boundedString(source.type, `${path}.type`, 32);
  if (type !== "Public Law" && type !== "Private Law") {
    fail("invalid_value", `${path}.type`, "expected Public Law or Private Law");
  }
  const number = boundedString(source.number, `${path}.number`, 10);
  if (!LAW_NUMBER_PATTERN.test(number)) {
    fail(
      "invalid_value",
      `${path}.number`,
      "expected a Congress-law source number",
    );
  }
  return { number, type };
}

function parseBillType(
  value: unknown,
  path: string,
): Uppercase<CongressGovBillType> {
  const type = boundedString(value, path, 8);
  const documented = CONGRESS_GOV_BILL_TYPES.find(
    (candidate) => candidate.toUpperCase() === type,
  );
  if (documented === undefined) {
    fail("invalid_value", path, "expected a documented bill type");
  }
  return type as Uppercase<CongressGovBillType>;
}

export function parseCongressGovBill(
  value: unknown,
  path = "$.bill",
): CongressGovBill {
  const source = object(value, path);
  exactKeys(
    source,
    path,
    [
      "congress",
      "introducedDate",
      "latestAction",
      "legislationUrl",
      "number",
      "originChamber",
      "originChamberCode",
      "title",
      "type",
      "updateDate",
      "updateDateIncludingText",
      "url",
    ],
    ["laws"],
  );
  const number = boundedString(source.number, `${path}.number`, 6);
  if (!BILL_NUMBER_PATTERN.test(number)) {
    fail("invalid_value", `${path}.number`, "expected a positive bill number");
  }
  const congress = boundedInteger(
    source.congress,
    `${path}.congress`,
    1,
    CONGRESS_GOV_QUERY_POLICY.maximumCongress,
  );
  const type = parseBillType(source.type, `${path}.type`);
  const billType = type.toLowerCase() as CongressGovBillType;
  const originChamber = boundedString(
    source.originChamber,
    `${path}.originChamber`,
    6,
  );
  if (originChamber !== "House" && originChamber !== "Senate") {
    fail("invalid_value", `${path}.originChamber`, "expected House or Senate");
  }
  const originChamberCode = boundedString(
    source.originChamberCode,
    `${path}.originChamberCode`,
    1,
  );
  if (
    (originChamber === "House" && originChamberCode !== "H") ||
    (originChamber === "Senate" && originChamberCode !== "S")
  ) {
    fail(
      "inconsistent_response",
      `${path}.originChamberCode`,
      "chamber and chamber code disagree",
    );
  }
  const expectedOrigin = billType.startsWith("h")
    ? { chamber: "House", code: "H" }
    : { chamber: "Senate", code: "S" };
  if (
    originChamber !== expectedOrigin.chamber ||
    originChamberCode !== expectedOrigin.code
  ) {
    fail(
      "inconsistent_response",
      `${path}.originChamber`,
      "bill type and originating chamber disagree",
    );
  }
  const laws = optional(source, "laws", path, (entry, entryPath) =>
    list(entry, entryPath, 32, parseLawReference),
  );
  if (laws !== undefined) {
    assertUnique(
      laws.map(({ type, number: lawNumber }) => `${type}\0${lawNumber}`),
      `${path}.laws`,
      "law identity",
    );
    if (
      laws.some(
        ({ number: lawNumber }) =>
          Number(lawNumber.split("-", 1)[0]) !== congress,
      )
    ) {
      fail(
        "inconsistent_response",
        `${path}.laws`,
        "law and bill Congress identities disagree",
      );
    }
  }
  const legislationUrl = httpsReferenceUrl(
    source.legislationUrl,
    `${path}.legislationUrl`,
  );
  const url = httpsReferenceUrl(source.url, `${path}.url`);
  assertBillIdentityUrls(url, legislationUrl, congress, billType, number, path);
  return {
    congress,
    introducedDate: calendarDate(
      source.introducedDate,
      `${path}.introducedDate`,
    ),
    latestAction: parseLatestAction(
      source.latestAction,
      `${path}.latestAction`,
    ),
    legislationUrl,
    ...(laws === undefined ? {} : { laws }),
    number,
    originChamber,
    originChamberCode: originChamberCode as "H" | "S",
    title: boundedString(source.title, `${path}.title`, 8_192),
    type,
    updateDate: sourceDate(source.updateDate, `${path}.updateDate`),
    updateDateIncludingText: sourceDate(
      source.updateDateIncludingText,
      `${path}.updateDateIncludingText`,
    ),
    url,
  };
}

export function parseCongressGovSponsor(
  value: unknown,
  path = "$.sponsor",
): CongressGovSponsor {
  const source = object(value, path);
  exactKeys(
    source,
    path,
    [
      "bioguideId",
      "firstName",
      "fullName",
      "isByRequest",
      "lastName",
      "party",
      "state",
      "url",
    ],
    ["middleName"],
  );
  const bioguideId = boundedString(source.bioguideId, `${path}.bioguideId`, 7);
  if (!BIOGUIDE_ID_PATTERN.test(bioguideId)) {
    fail(
      "invalid_value",
      `${path}.bioguideId`,
      "expected a Bioguide identifier",
    );
  }
  const middleName = optional(source, "middleName", path, (entry, entryPath) =>
    boundedString(entry, entryPath, 128),
  );
  const isByRequest = boundedString(
    source.isByRequest,
    `${path}.isByRequest`,
    1,
  );
  if (isByRequest !== "Y" && isByRequest !== "N") {
    fail("invalid_value", `${path}.isByRequest`, "expected Y or N");
  }
  boundedString(source.firstName, `${path}.firstName`, 128);
  boundedString(source.lastName, `${path}.lastName`, 128);
  boundedString(source.party, `${path}.party`, 64);
  boundedString(source.state, `${path}.state`, 64);
  const sourceUrl = httpsReferenceUrl(source.url, `${path}.url`);
  assertKeylessApiReference(
    sourceUrl,
    `${path}.url`,
    `/v3/member/${bioguideId}`,
  );
  void middleName;
  return {
    bioguideId,
    fullName: boundedString(source.fullName, `${path}.fullName`, 256),
    isByRequest,
  };
}

function parseCommitteeActivity(
  value: unknown,
  path: string,
): CongressGovCommitteeActivity {
  const source = object(value, path);
  exactKeys(source, path, ["name"], ["date"]);
  const activityDate = optional(source, "date", path, calendarDate);
  return {
    ...(activityDate === undefined ? {} : { date: activityDate }),
    name: boundedString(source.name, `${path}.name`, 512),
  };
}

export function parseCongressGovCommittee(
  value: unknown,
  path = "$.committee",
): CongressGovCommittee {
  const source = object(value, path);
  exactKeys(source, path, [
    "activities",
    "chamber",
    "name",
    "systemCode",
    "type",
    "url",
  ]);
  const systemCode = boundedString(source.systemCode, `${path}.systemCode`, 32);
  if (!SYSTEM_CODE_PATTERN.test(systemCode)) {
    fail(
      "invalid_value",
      `${path}.systemCode`,
      "expected a bounded committee system code",
    );
  }
  const activities = list(
    source.activities,
    `${path}.activities`,
    512,
    parseCommitteeActivity,
  );
  const chamber = boundedString(source.chamber, `${path}.chamber`, 64);
  const routeChamber = {
    House: "house",
    Senate: "senate",
    Joint: "joint",
  }[chamber];
  if (routeChamber === undefined) {
    fail(
      "invalid_value",
      `${path}.chamber`,
      "expected House, Senate, or Joint",
    );
  }
  const url = httpsReferenceUrl(source.url, `${path}.url`);
  assertKeylessApiReference(
    url,
    `${path}.url`,
    `/v3/committee/${routeChamber}/${systemCode}`,
  );
  return {
    activities,
    chamber,
    name: boundedString(source.name, `${path}.name`, 512),
    systemCode,
    type: boundedString(source.type, `${path}.type`, 128),
    url,
  };
}

export function parseCongressGovSummary(
  value: unknown,
  path = "$.summary",
): CongressGovSummary {
  const source = object(value, path);
  exactKeys(source, path, [
    "actionDate",
    "actionDesc",
    "text",
    "updateDate",
    "versionCode",
  ]);
  boundedString(source.text, `${path}.text`, 262_144);
  return {
    actionDate: sourceDate(source.actionDate, `${path}.actionDate`),
    actionDesc: boundedString(source.actionDesc, `${path}.actionDesc`, 512),
    updateDate: sourceDate(source.updateDate, `${path}.updateDate`),
    versionCode: boundedString(source.versionCode, `${path}.versionCode`, 32),
  };
}

function parsePolicyArea(value: unknown, path: string): CongressGovPolicyArea {
  const source = object(value, path);
  exactKeys(source, path, ["name"]);
  return { name: boundedString(source.name, `${path}.name`, 256) };
}

function parseLegislativeSubject(
  value: unknown,
  path: string,
): CongressGovLegislativeSubject {
  const source = object(value, path);
  exactKeys(source, path, ["name", "updateDate"]);
  return {
    name: boundedString(source.name, `${path}.name`, 256),
    updateDate: sourceDate(source.updateDate, `${path}.updateDate`),
  };
}

export function parseCongressGovSubjects(
  value: unknown,
  path = "$.subjects",
): CongressGovSubjects {
  const source = object(value, path);
  exactKeys(source, path, ["legislativeSubjects"], ["policyArea"]);
  const policyArea = optional(source, "policyArea", path, parsePolicyArea);
  const legislativeSubjects = list(
    source.legislativeSubjects,
    `${path}.legislativeSubjects`,
    1_024,
    parseLegislativeSubject,
  );
  assertUnique(
    legislativeSubjects.map(({ name }) => name),
    `${path}.legislativeSubjects`,
    "exact legislative-subject label",
  );
  return {
    ...(policyArea === undefined ? {} : { policyArea }),
    legislativeSubjects,
  };
}

export function parseCongressGovTitle(
  value: unknown,
  path = "$.title",
): CongressGovTitle {
  const source = object(value, path);
  exactKeys(
    source,
    path,
    ["title", "titleType", "titleTypeCode", "updateDate"],
    ["billTextVersionCode", "billTextVersionName"],
  );
  const billTextVersionCode = optional(
    source,
    "billTextVersionCode",
    path,
    (entry, entryPath) => boundedString(entry, entryPath, 32),
  );
  const billTextVersionName = optional(
    source,
    "billTextVersionName",
    path,
    (entry, entryPath) => boundedString(entry, entryPath, 256),
  );
  return {
    ...(billTextVersionCode === undefined ? {} : { billTextVersionCode }),
    ...(billTextVersionName === undefined ? {} : { billTextVersionName }),
    title: boundedString(source.title, `${path}.title`, 8_192),
    titleType: boundedString(source.titleType, `${path}.titleType`, 256),
    titleTypeCode: boundedInteger(
      source.titleTypeCode,
      `${path}.titleTypeCode`,
      0,
      999,
    ),
    updateDate: sourceDate(source.updateDate, `${path}.updateDate`),
  };
}

function parseTextFormat(value: unknown, path: string): CongressGovTextFormat {
  const source = object(value, path);
  exactKeys(source, path, ["type", "url"]);
  return {
    type: boundedString(source.type, `${path}.type`, 128),
    url: httpsReferenceUrl(source.url, `${path}.url`),
  };
}

export function parseCongressGovTextVersion(
  value: unknown,
  path = "$.textVersion",
): CongressGovTextVersion {
  const source = object(value, path);
  exactKeys(source, path, ["date", "formats", "type"]);
  const formats = list(source.formats, `${path}.formats`, 32, parseTextFormat);
  assertUnique(
    formats.map(({ type, url }) => `${type}\0${url}`),
    `${path}.formats`,
    "text format",
  );
  return {
    date: sourceDate(source.date, `${path}.date`),
    formats,
    type: boundedString(source.type, `${path}.type`, 256),
  };
}

function parseOptionalList<T>(
  source: JsonObject,
  key: string,
  path: string,
  maximumLength: number,
  parseItem: ItemParser<T>,
): T[] | undefined {
  return optional(source, key, path, (value, itemPath) =>
    list(value, itemPath, maximumLength, parseItem),
  );
}

function assertTextVersionLinkIdentity(
  textVersions: readonly CongressGovTextVersion[],
  bill: CongressGovBill,
): void {
  const billType = bill.type.toLowerCase();
  const congressPathPrefix = `/${bill.congress}/bills/${billType}${bill.number}/`;
  const govInfoIdentity = `BILLS-${bill.congress}${billType}${bill.number}`;
  for (const [versionIndex, version] of textVersions.entries()) {
    for (const [formatIndex, format] of version.formats.entries()) {
      const url = new URL(format.url);
      const matches =
        (url.hostname === "www.congress.gov" &&
          url.pathname.startsWith(congressPathPrefix)) ||
        (url.hostname === "www.govinfo.gov" &&
          url.pathname.includes(govInfoIdentity));
      if (!matches) {
        fail(
          "inconsistent_response",
          `$.textVersions[${versionIndex}].formats[${formatIndex}].url`,
          "text link identity does not match the bill",
        );
      }
    }
  }
}

export function parseCongressGovSyntheticBundle(
  value: unknown,
): CongressGovSyntheticBundle {
  const path = "$";
  const source = object(value, path);
  exactKeys(
    source,
    path,
    [
      "contractVersion",
      "fixtureNotice",
      "sourceId",
      "resourcePath",
      "stableId",
      "congressNumber",
      "congress",
      "bill",
    ],
    [
      "sponsors",
      "committees",
      "actions",
      "summaries",
      "subjects",
      "titles",
      "textVersions",
    ],
  );
  const congressNumber = boundedInteger(
    source.congressNumber,
    "$.congressNumber",
    1,
    CONGRESS_GOV_QUERY_POLICY.maximumCongress,
  );
  const bill = parseCongressGovBill(source.bill);
  const billType = bill.type.toLowerCase() as CongressGovBillType;
  const expectedPath = `/v3/bill/${congressNumber}/${billType}/${bill.number}`;
  const resourcePath = boundedString(
    source.resourcePath,
    "$.resourcePath",
    256,
  );
  if (resourcePath !== expectedPath) {
    fail(
      "inconsistent_response",
      "$.resourcePath",
      "path identity does not match bill identity",
    );
  }
  if (bill.congress !== congressNumber) {
    fail(
      "inconsistent_response",
      "$.bill.congress",
      "bill and Congress identities disagree",
    );
  }
  const stableId = boundedString(source.stableId, "$.stableId", 128);
  const expectedStableId = `${CONGRESS_GOV_SOURCE_ID}:${congressNumber}:${billType}:${bill.number}`;
  if (stableId !== expectedStableId) {
    fail(
      "inconsistent_response",
      "$.stableId",
      "stable ID does not match the reviewed identity rule",
    );
  }

  const sponsors = parseOptionalList(
    source,
    "sponsors",
    path,
    1_024,
    parseCongressGovSponsor,
  );
  if (sponsors !== undefined) {
    assertUnique(
      sponsors.map(({ bioguideId }) => bioguideId),
      "$.sponsors",
      "Bioguide identity",
    );
  }
  const committees = parseOptionalList(
    source,
    "committees",
    path,
    512,
    parseCongressGovCommittee,
  );
  if (committees !== undefined) {
    assertUnique(
      committees.map(({ systemCode }) => systemCode),
      "$.committees",
      "committee system code",
    );
  }
  const actions = parseOptionalList(
    source,
    "actions",
    path,
    16_384,
    parseCongressGovAction,
  );
  if (actions !== undefined) {
    assertUnique(
      actions.map(
        ({ actionDate, actionCode, text }) =>
          `${actionDate}\0${actionCode ?? ""}\0${text}`,
      ),
      "$.actions",
      "action identity",
    );
  }
  const summaries = parseOptionalList(
    source,
    "summaries",
    path,
    512,
    parseCongressGovSummary,
  );
  const subjects = optional(source, "subjects", path, parseCongressGovSubjects);
  const titles = parseOptionalList(
    source,
    "titles",
    path,
    1_024,
    parseCongressGovTitle,
  );
  const textVersions = parseOptionalList(
    source,
    "textVersions",
    path,
    512,
    parseCongressGovTextVersion,
  );
  if (textVersions !== undefined) {
    assertTextVersionLinkIdentity(textVersions, bill);
  }

  return {
    contractVersion: exactString(
      source.contractVersion,
      "$.contractVersion",
      CONGRESS_GOV_CONTRACT_VERSION,
    ),
    fixtureNotice: exactString(
      source.fixtureNotice,
      "$.fixtureNotice",
      CONGRESS_GOV_SYNTHETIC_NOTICE,
    ),
    sourceId: exactString(
      source.sourceId,
      "$.sourceId",
      CONGRESS_GOV_SOURCE_ID,
    ),
    resourcePath,
    stableId,
    congressNumber,
    congress: parseCongressGovCongress(source.congress),
    bill,
    ...(sponsors === undefined ? {} : { sponsors }),
    ...(committees === undefined ? {} : { committees }),
    ...(actions === undefined ? {} : { actions }),
    ...(summaries === undefined ? {} : { summaries }),
    ...(subjects === undefined ? {} : { subjects }),
    ...(titles === undefined ? {} : { titles }),
    ...(textVersions === undefined ? {} : { textVersions }),
  };
}
