import {
  GOVINFO_COLLECTION_COVERAGE,
  GOVINFO_CONTRACT_COLLECTIONS,
  GOVINFO_CONTRACT_VERSION,
  GOVINFO_COURT_BODY_TYPES,
  GOVINFO_COURT_TYPES,
  GOVINFO_FIXITY_ALGORITHMS,
  GOVINFO_QUERY_POLICY,
  GOVINFO_RENDITION_FORMATS,
  GOVINFO_RENDITION_PATHS,
  GOVINFO_RENDITION_SCOPES,
  GOVINFO_RESOURCE_PROJECTION_KIND,
  GOVINFO_RETRY_DIRECTIVE_KIND,
  GOVINFO_RETRY_OPERATIONS,
  GOVINFO_RETRY_POLICY,
  GOVINFO_SOURCE_ID,
  GOVINFO_SYNTHETIC_NOTICE,
  type GovInfoContractCollection,
  type GovInfoCourtBodyType,
  type GovInfoCourtType,
  type GovInfoFixityAlgorithm,
  type GovInfoRenditionFormat,
  type GovInfoRenditionScope,
  type GovInfoRetryOperation,
} from "./constants";

export type GovInfoContractErrorCode =
  | "duplicate_value"
  | "inconsistent_response"
  | "invalid_type"
  | "invalid_url"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field";

export class GovInfoContractError extends Error {
  readonly code: GovInfoContractErrorCode;
  readonly path: string;

  constructor(code: GovInfoContractErrorCode, path: string, message: string) {
    super(`GovInfo contract ${code} at ${path}: ${message}`);
    this.name = "GovInfoContractError";
    this.code = code;
    this.path = path;
  }
}

export interface GovInfoCoverageProjection {
  collectionCode: GovInfoContractCollection;
  scope: string;
  range: string;
  completeness: string;
  granuleAvailability: string;
}

export interface GovInfoPackageProjection {
  collectionCode: GovInfoContractCollection;
  packageId: string;
  title?: string;
  lastModified: string;
  dateIssued: string;
  dateIngested: string;
}

export interface GovInfoGranuleProjection {
  granuleId: string;
  parentPackageId: string;
  title?: string;
  granuleClass?: string;
  lastModified: string;
  dateIssued: string;
  dateIngested: string;
}

export type GovInfoModsIdentifierType =
  "package-id" | "granule-id" | "document-number";

export interface GovInfoModsIdentifier {
  type: GovInfoModsIdentifierType;
  value: string;
}

export interface GovInfoModsProjection {
  recordIdentifier: string;
  dateIssued: string;
  identifiers: GovInfoModsIdentifier[];
  title?: string;
  governmentAuthors?: string[];
  publisher?: string;
  language?: string;
  court?: GovInfoCourtProjection;
}

export interface GovInfoCourtProjection {
  courtCode: string;
  courtType: GovInfoCourtType;
  bodyType: GovInfoCourtBodyType;
}

export interface GovInfoRenditionLink {
  scope: GovInfoRenditionScope;
  format: GovInfoRenditionFormat;
  objectIdentifier: string;
  url: string;
}

export interface GovInfoPublicLinks {
  detailsUrl?: string;
  formats: GovInfoRenditionLink[];
}

export interface GovInfoLocalTransportSha256 {
  digest: string;
  scope: GovInfoRenditionScope;
  format: GovInfoRenditionFormat;
  renditionUrl: string;
}

export interface GovInfoProviderPremisFixity {
  algorithm: GovInfoFixityAlgorithm;
  digest: string;
  objectIdentifier: string;
  bindingStatus: "unverified_binding";
}

export interface GovInfoIntegrityProjection {
  localTransportSha256?: GovInfoLocalTransportSha256;
  providerPremisFixity?: GovInfoProviderPremisFixity;
}

export interface GovInfoSyntheticResourceProjection {
  contractVersion: typeof GOVINFO_CONTRACT_VERSION;
  fixtureNotice: typeof GOVINFO_SYNTHETIC_NOTICE;
  kind: typeof GOVINFO_RESOURCE_PROJECTION_KIND;
  sourceId: typeof GOVINFO_SOURCE_ID;
  stableId: string;
  coverage: GovInfoCoverageProjection;
  package: GovInfoPackageProjection;
  granule?: GovInfoGranuleProjection;
  mods: GovInfoModsProjection;
  links?: GovInfoPublicLinks;
  integrity: GovInfoIntegrityProjection;
}

export interface GovInfoLocalAttemptPolicy {
  maximumAttempts: number;
  maximumElapsedSeconds: number;
}

export interface GovInfoSyntheticRetryDirective {
  contractVersion: typeof GOVINFO_CONTRACT_VERSION;
  fixtureNotice: typeof GOVINFO_SYNTHETIC_NOTICE;
  kind: typeof GOVINFO_RETRY_DIRECTIVE_KIND;
  sourceId: typeof GOVINFO_SOURCE_ID;
  directiveOrigin: "repository_policy";
  providerEnvelope: false;
  statusCode: 503;
  operation: GovInfoRetryOperation;
  retryAfterSeconds: number;
  localAttemptPolicy: GovInfoLocalAttemptPolicy;
}

export type GovInfoProviderFixityBindingState =
  "unverified_binding" | "provider_fixity_absent";

type JsonObject = Record<string, unknown>;
type ItemParser<T> = (value: unknown, path: string) => T;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SYNTHETIC_COURT_CODE_PATTERN = /^SYNTHETIC-[A-Z0-9]{2,16}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MODS_IDENTIFIER_TYPES = [
  "package-id",
  "granule-id",
  "document-number",
] as const;
const DIGEST_LENGTHS = {
  MD5: 32,
  "SHA-1": 40,
  "SHA-256": 64,
  "SHA-512": 128,
} as const satisfies Record<GovInfoFixityAlgorithm, number>;

function fail(
  code: GovInfoContractErrorCode,
  path: string,
  message: string,
): never {
  throw new GovInfoContractError(code, path, message);
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

function member<T extends string>(
  value: unknown,
  path: string,
  members: readonly T[],
): T {
  const parsed = boundedString(value, path, 128);
  if (!members.includes(parsed as T)) {
    fail("invalid_value", path, "value is outside the reviewed vocabulary");
  }
  return parsed as T;
}

function calendarDate(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 10);
  const match = DATE_PATTERN.exec(parsed);
  if (!match) {
    fail("invalid_value", path, "expected an ISO calendar date");
  }
  const [year, month, day] = match.slice(1).map(Number);
  const reconstructed = new Date(Date.UTC(year, month - 1, day));
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
    fail("invalid_value", path, "expected a UTC date-time");
  }
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map(Number);
  const reconstructed = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );
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

function list<T>(
  value: unknown,
  path: string,
  maximumLength: number,
  parser: ItemParser<T>,
): T[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumLength) {
    fail("limit_exceeded", path, "array exceeds the contract limit");
  }
  return value.map((entry, index) => parser(entry, `${path}[${index}]`));
}

function optional<T>(
  value: JsonObject,
  key: string,
  path: string,
  parser: ItemParser<T>,
): T | undefined {
  return Object.hasOwn(value, key)
    ? parser(value[key], `${path}.${key}`)
    : undefined;
}

function assertUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    fail("duplicate_value", path, "duplicate retained identity");
  }
}

function resourceIdentifier(value: unknown, path: string): string {
  const parsed = boundedString(
    value,
    path,
    GOVINFO_QUERY_POLICY.maximumIdentifierLength,
  );
  if (!IDENTIFIER_PATTERN.test(parsed) || !parsed.includes("SYNTHETIC")) {
    fail(
      "invalid_value",
      path,
      "expected a clearly synthetic bounded GovInfo identifier",
    );
  }
  return parsed;
}

function parsePublicUrl(value: unknown, path: string): URL {
  const text = boundedString(
    value,
    path,
    GOVINFO_QUERY_POLICY.maximumUrlLength,
  );
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail("invalid_url", path, "expected an absolute URL");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "www.govinfo.gov" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail(
      "invalid_url",
      path,
      "expected a credential-free canonical www.govinfo.gov URL",
    );
  }
  return parsed;
}

function parseCoverage(
  value: unknown,
  collectionCode: GovInfoContractCollection,
  path: string,
): GovInfoCoverageProjection {
  const source = object(value, path);
  exactKeys(source, path, [
    "collectionCode",
    "scope",
    "range",
    "completeness",
    "granuleAvailability",
  ]);
  exactString(source.collectionCode, `${path}.collectionCode`, collectionCode);
  const expected = GOVINFO_COLLECTION_COVERAGE[collectionCode];
  return {
    collectionCode,
    scope: exactString(source.scope, `${path}.scope`, expected.scope),
    range: exactString(source.range, `${path}.range`, expected.range),
    completeness: exactString(
      source.completeness,
      `${path}.completeness`,
      expected.completeness,
    ),
    granuleAvailability: exactString(
      source.granuleAvailability,
      `${path}.granuleAvailability`,
      expected.granuleAvailability,
    ),
  };
}

function parsePackage(value: unknown, path: string): GovInfoPackageProjection {
  const source = object(value, path);
  const collectionCode = member(
    source.collectionCode,
    `${path}.collectionCode`,
    GOVINFO_CONTRACT_COLLECTIONS,
  );
  const retainedKeys = [
    "collectionCode",
    "packageId",
    "lastModified",
    "dateIssued",
    "dateIngested",
  ] as const;
  exactKeys(
    source,
    path,
    collectionCode === "USCOURTS" ? retainedKeys : [...retainedKeys, "title"],
  );
  const packageId = resourceIdentifier(source.packageId, `${path}.packageId`);
  if (!packageId.startsWith(`${collectionCode}-`)) {
    fail(
      "inconsistent_response",
      `${path}.packageId`,
      "package identifier and collection disagree",
    );
  }
  return {
    collectionCode,
    packageId,
    ...(collectionCode === "USCOURTS"
      ? {}
      : { title: boundedString(source.title, `${path}.title`, 8_192) }),
    lastModified: utcDateTime(source.lastModified, `${path}.lastModified`),
    dateIssued: calendarDate(source.dateIssued, `${path}.dateIssued`),
    dateIngested: calendarDate(source.dateIngested, `${path}.dateIngested`),
  };
}

function parseGranule(
  value: unknown,
  packageId: string,
  collectionCode: GovInfoContractCollection,
  path: string,
): GovInfoGranuleProjection {
  const source = object(value, path);
  const retainedKeys = [
    "granuleId",
    "parentPackageId",
    "lastModified",
    "dateIssued",
    "dateIngested",
  ] as const;
  exactKeys(
    source,
    path,
    collectionCode === "USCOURTS" ? retainedKeys : [...retainedKeys, "title"],
    collectionCode === "USCOURTS" ? [] : ["granuleClass"],
  );
  const granuleId = resourceIdentifier(source.granuleId, `${path}.granuleId`);
  exactString(source.parentPackageId, `${path}.parentPackageId`, packageId);
  const title =
    collectionCode === "USCOURTS"
      ? undefined
      : boundedString(source.title, `${path}.title`, 8_192);
  const granuleClass =
    collectionCode === "USCOURTS"
      ? undefined
      : optional(source, "granuleClass", path, (entry, entryPath) =>
          boundedString(entry, entryPath, 128),
        );
  return {
    granuleId,
    parentPackageId: packageId,
    ...(title === undefined ? {} : { title }),
    ...(granuleClass === undefined ? {} : { granuleClass }),
    lastModified: utcDateTime(source.lastModified, `${path}.lastModified`),
    dateIssued: calendarDate(source.dateIssued, `${path}.dateIssued`),
    dateIngested: calendarDate(source.dateIngested, `${path}.dateIngested`),
  };
}

function parseModsIdentifier(
  value: unknown,
  path: string,
): GovInfoModsIdentifier {
  const source = object(value, path);
  exactKeys(source, path, ["type", "value"]);
  return {
    type: member(source.type, `${path}.type`, MODS_IDENTIFIER_TYPES),
    value: boundedString(
      source.value,
      `${path}.value`,
      GOVINFO_QUERY_POLICY.maximumIdentifierLength,
    ),
  };
}

function parseCourtProjection(
  value: unknown,
  path: string,
): GovInfoCourtProjection {
  const source = object(value, path);
  exactKeys(source, path, ["courtCode", "courtType", "bodyType"]);
  const courtCode = boundedString(source.courtCode, `${path}.courtCode`, 26);
  if (!SYNTHETIC_COURT_CODE_PATTERN.test(courtCode)) {
    fail(
      "invalid_value",
      `${path}.courtCode`,
      "expected a clearly synthetic opaque court code",
    );
  }
  return {
    courtCode,
    courtType: member(
      source.courtType,
      `${path}.courtType`,
      GOVINFO_COURT_TYPES,
    ),
    bodyType: member(
      source.bodyType,
      `${path}.bodyType`,
      GOVINFO_COURT_BODY_TYPES,
    ),
  };
}

function parseMods(
  value: unknown,
  pkg: GovInfoPackageProjection,
  granule: GovInfoGranuleProjection | undefined,
  path: string,
): GovInfoModsProjection {
  const source = object(value, path);
  const isCourt = pkg.collectionCode === "USCOURTS";
  exactKeys(
    source,
    path,
    isCourt
      ? ["recordIdentifier", "dateIssued", "identifiers", "court"]
      : [
          "recordIdentifier",
          "title",
          "dateIssued",
          "governmentAuthors",
          "identifiers",
        ],
    isCourt ? [] : ["publisher", "language"],
  );
  const targetIdentifier = granule?.granuleId ?? pkg.packageId;
  const targetDateIssued = granule?.dateIssued ?? pkg.dateIssued;
  exactString(
    source.recordIdentifier,
    `${path}.recordIdentifier`,
    targetIdentifier,
  );
  exactString(source.dateIssued, `${path}.dateIssued`, targetDateIssued);
  const identifiers = list(
    source.identifiers,
    `${path}.identifiers`,
    16,
    parseModsIdentifier,
  );
  assertUnique(
    identifiers.map(({ type }) => type),
    `${path}.identifiers`,
  );
  const byType = new Map(identifiers.map((entry) => [entry.type, entry.value]));
  if (byType.get("package-id") !== pkg.packageId) {
    fail(
      "inconsistent_response",
      `${path}.identifiers`,
      "MODS package identity is missing or inconsistent",
    );
  }
  if (
    (granule !== undefined && byType.get("granule-id") !== granule.granuleId) ||
    (granule === undefined && byType.has("granule-id"))
  ) {
    fail(
      "inconsistent_response",
      `${path}.identifiers`,
      "MODS granule identity is inconsistent",
    );
  }
  if (isCourt) {
    if (byType.has("document-number")) {
      fail(
        "inconsistent_response",
        `${path}.identifiers`,
        "USCOURTS retains only opaque package and granule identities",
      );
    }
    return {
      recordIdentifier: targetIdentifier,
      dateIssued: targetDateIssued,
      identifiers,
      court: parseCourtProjection(source.court, `${path}.court`),
    };
  }
  const targetTitle = granule?.title ?? pkg.title;
  if (targetTitle === undefined) {
    fail(
      "inconsistent_response",
      `${path}.title`,
      "non-court MODS title has no retained package or granule title",
    );
  }
  exactString(source.title, `${path}.title`, targetTitle);
  const governmentAuthors = list(
    source.governmentAuthors,
    `${path}.governmentAuthors`,
    32,
    (entry, entryPath) => boundedString(entry, entryPath, 512),
  );
  assertUnique(governmentAuthors, `${path}.governmentAuthors`);
  const publisher = optional(source, "publisher", path, (entry, entryPath) =>
    boundedString(entry, entryPath, 512),
  );
  const language = optional(source, "language", path, (entry, entryPath) => {
    const parsed = boundedString(entry, entryPath, 16);
    if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(parsed)) {
      fail("invalid_value", entryPath, "expected a bounded language tag");
    }
    return parsed;
  });
  return {
    recordIdentifier: targetIdentifier,
    dateIssued: targetDateIssued,
    identifiers,
    title: targetTitle,
    governmentAuthors,
    ...(publisher === undefined ? {} : { publisher }),
    ...(language === undefined ? {} : { language }),
  };
}

function parseRenditionLink(
  value: unknown,
  packageId: string,
  expectedScope: GovInfoRenditionScope,
  expectedObjectIdentifier: string,
  path: string,
): GovInfoRenditionLink {
  const source = object(value, path);
  exactKeys(source, path, ["scope", "format", "objectIdentifier", "url"]);
  const scope = member(source.scope, `${path}.scope`, GOVINFO_RENDITION_SCOPES);
  if (scope !== expectedScope) {
    fail(
      "inconsistent_response",
      `${path}.scope`,
      `expected a ${expectedScope} rendition for this projection`,
    );
  }
  const format = member(
    source.format,
    `${path}.format`,
    GOVINFO_RENDITION_FORMATS,
  );
  const objectIdentifier = boundedString(
    source.objectIdentifier,
    `${path}.objectIdentifier`,
    GOVINFO_QUERY_POLICY.maximumIdentifierLength,
  );
  if (objectIdentifier !== expectedObjectIdentifier) {
    fail(
      "inconsistent_response",
      `${path}.objectIdentifier`,
      `rendition is not bound to the projected ${expectedScope}`,
    );
  }
  const url = parsePublicUrl(source.url, `${path}.url`);
  const rendition = GOVINFO_RENDITION_PATHS[format];
  const expectedPath = `/content/pkg/${packageId}/${rendition.directory}/${objectIdentifier}.${rendition.extension}`;
  if (url.pathname !== expectedPath) {
    fail(
      "inconsistent_response",
      `${path}.url`,
      "rendition URL does not match its format and object identity",
    );
  }
  return { scope, format, objectIdentifier, url: url.href };
}

function parseLinks(
  value: unknown,
  pkg: GovInfoPackageProjection,
  granule: GovInfoGranuleProjection | undefined,
  path: string,
): GovInfoPublicLinks {
  const source = object(value, path);
  exactKeys(source, path, ["formats"], ["detailsUrl"]);
  const expectedScope = granule === undefined ? "package" : "granule";
  const expectedObjectIdentifier = granule?.granuleId ?? pkg.packageId;
  const formats = list(
    source.formats,
    `${path}.formats`,
    16,
    (entry, entryPath) =>
      parseRenditionLink(
        entry,
        pkg.packageId,
        expectedScope,
        expectedObjectIdentifier,
        entryPath,
      ),
  );
  assertUnique(
    formats.map(({ scope, format }) => `${scope}\0${format}`),
    `${path}.formats`,
  );
  const detailsUrl = optional(
    source,
    "detailsUrl",
    path,
    (entry, entryPath) => {
      const url = parsePublicUrl(entry, entryPath);
      const expectedPath = granule
        ? `/app/details/${pkg.packageId}/${granule.granuleId}`
        : `/app/details/${pkg.packageId}`;
      if (url.pathname !== expectedPath) {
        fail(
          "inconsistent_response",
          entryPath,
          "details URL does not match the retained identity",
        );
      }
      return url.href;
    },
  );
  return {
    ...(detailsUrl === undefined ? {} : { detailsUrl }),
    formats,
  };
}

function parseHexDigest(value: unknown, path: string, length: number): string {
  const parsed = boundedString(value, path, length);
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(parsed)) {
    fail("invalid_value", path, "expected a lowercase hexadecimal digest");
  }
  return parsed;
}

function parseLocalTransportSha256(
  value: unknown,
  links: GovInfoPublicLinks | undefined,
  path: string,
): GovInfoLocalTransportSha256 {
  const source = object(value, path);
  exactKeys(source, path, ["digest", "scope", "format", "renditionUrl"]);
  const scope = member(source.scope, `${path}.scope`, GOVINFO_RENDITION_SCOPES);
  const format = member(
    source.format,
    `${path}.format`,
    GOVINFO_RENDITION_FORMATS,
  );
  const renditionUrl = parsePublicUrl(
    source.renditionUrl,
    `${path}.renditionUrl`,
  ).href;
  const advertisedMatches =
    links?.formats.filter(
      (link) =>
        link.scope === scope &&
        link.format === format &&
        link.url === renditionUrl,
    ) ?? [];
  if (advertisedMatches.length !== 1) {
    fail(
      "inconsistent_response",
      `${path}.renditionUrl`,
      "local digest must bind to exactly one advertised rendition URL, format, and scope",
    );
  }
  const digest = boundedString(source.digest, `${path}.digest`, 64);
  if (!SHA256_PATTERN.test(digest)) {
    fail("invalid_value", `${path}.digest`, "expected a SHA-256 digest");
  }
  return { digest, scope, format, renditionUrl };
}

function parseProviderPremisFixity(
  value: unknown,
  path: string,
): GovInfoProviderPremisFixity {
  const source = object(value, path);
  exactKeys(source, path, [
    "algorithm",
    "digest",
    "objectIdentifier",
    "bindingStatus",
  ]);
  const algorithm = member(
    source.algorithm,
    `${path}.algorithm`,
    GOVINFO_FIXITY_ALGORITHMS,
  );
  const objectIdentifier = boundedString(
    source.objectIdentifier,
    `${path}.objectIdentifier`,
    GOVINFO_QUERY_POLICY.maximumIdentifierLength,
  );
  return {
    algorithm,
    digest: parseHexDigest(
      source.digest,
      `${path}.digest`,
      DIGEST_LENGTHS[algorithm],
    ),
    objectIdentifier,
    bindingStatus: exactString(
      source.bindingStatus,
      `${path}.bindingStatus`,
      "unverified_binding",
    ),
  };
}

export function getGovInfoProviderFixityBindingState(
  integrity: GovInfoIntegrityProjection,
): GovInfoProviderFixityBindingState {
  const provider = integrity.providerPremisFixity;
  return provider?.bindingStatus ?? "provider_fixity_absent";
}

function parseIntegrity(
  value: unknown,
  links: GovInfoPublicLinks | undefined,
  path: string,
): GovInfoIntegrityProjection {
  const source = object(value, path);
  exactKeys(source, path, [], ["localTransportSha256", "providerPremisFixity"]);
  const localTransportSha256 = optional(
    source,
    "localTransportSha256",
    path,
    (entry, entryPath) => parseLocalTransportSha256(entry, links, entryPath),
  );
  const providerPremisFixity = optional(
    source,
    "providerPremisFixity",
    path,
    parseProviderPremisFixity,
  );
  return {
    ...(localTransportSha256 === undefined ? {} : { localTransportSha256 }),
    ...(providerPremisFixity === undefined ? {} : { providerPremisFixity }),
  };
}

export function parseGovInfoSyntheticResource(
  value: unknown,
  path = "$",
): GovInfoSyntheticResourceProjection {
  const source = object(value, path);
  exactKeys(
    source,
    path,
    [
      "contractVersion",
      "fixtureNotice",
      "kind",
      "sourceId",
      "stableId",
      "coverage",
      "package",
      "mods",
      "integrity",
    ],
    ["granule", "links"],
  );
  const pkg = parsePackage(source.package, `${path}.package`);
  const granule = optional(source, "granule", path, (entry, entryPath) =>
    parseGranule(entry, pkg.packageId, pkg.collectionCode, entryPath),
  );
  if (pkg.collectionCode === "BILLS" && granule !== undefined) {
    fail(
      "inconsistent_response",
      `${path}.granule`,
      "BILLS granules are outside this repository contract",
    );
  }
  const coverage = parseCoverage(
    source.coverage,
    pkg.collectionCode,
    `${path}.coverage`,
  );
  const expectedStableId = granule
    ? `govinfo:${pkg.packageId}:${granule.granuleId}`
    : `govinfo:${pkg.packageId}`;
  const stableId = exactString(
    source.stableId,
    `${path}.stableId`,
    expectedStableId,
  );
  const mods = parseMods(source.mods, pkg, granule, `${path}.mods`);
  const links = optional(source, "links", path, (entry, entryPath) =>
    parseLinks(entry, pkg, granule, entryPath),
  );
  const integrity = parseIntegrity(
    source.integrity,
    links,
    `${path}.integrity`,
  );
  return {
    contractVersion: exactString(
      source.contractVersion,
      `${path}.contractVersion`,
      GOVINFO_CONTRACT_VERSION,
    ),
    fixtureNotice: exactString(
      source.fixtureNotice,
      `${path}.fixtureNotice`,
      GOVINFO_SYNTHETIC_NOTICE,
    ),
    kind: exactString(
      source.kind,
      `${path}.kind`,
      GOVINFO_RESOURCE_PROJECTION_KIND,
    ),
    sourceId: exactString(
      source.sourceId,
      `${path}.sourceId`,
      GOVINFO_SOURCE_ID,
    ),
    stableId,
    coverage,
    package: pkg,
    ...(granule === undefined ? {} : { granule }),
    mods,
    ...(links === undefined ? {} : { links }),
    integrity,
  };
}

export function parseGovInfoSyntheticRetryDirective(
  value: unknown,
  path = "$",
): GovInfoSyntheticRetryDirective {
  const source = object(value, path);
  exactKeys(source, path, [
    "contractVersion",
    "fixtureNotice",
    "kind",
    "sourceId",
    "directiveOrigin",
    "providerEnvelope",
    "statusCode",
    "operation",
    "retryAfterSeconds",
    "localAttemptPolicy",
  ]);
  if (source.providerEnvelope !== false) {
    fail(
      "invalid_value",
      `${path}.providerEnvelope`,
      "retry policy must never masquerade as a provider envelope",
    );
  }
  const statusCode = boundedInteger(
    source.statusCode,
    `${path}.statusCode`,
    503,
    503,
  ) as 503;
  const operation = member(
    source.operation,
    `${path}.operation`,
    GOVINFO_RETRY_OPERATIONS,
  );
  const retryAfterSeconds = boundedInteger(
    source.retryAfterSeconds,
    `${path}.retryAfterSeconds`,
    1,
    GOVINFO_RETRY_POLICY.maximumRetryAfterSeconds,
  );
  const policySource = object(
    source.localAttemptPolicy,
    `${path}.localAttemptPolicy`,
  );
  exactKeys(policySource, `${path}.localAttemptPolicy`, [
    "maximumAttempts",
    "maximumElapsedSeconds",
  ]);
  const localAttemptPolicy = {
    maximumAttempts: boundedInteger(
      policySource.maximumAttempts,
      `${path}.localAttemptPolicy.maximumAttempts`,
      1,
      GOVINFO_RETRY_POLICY.maximumAttempts,
    ),
    maximumElapsedSeconds: boundedInteger(
      policySource.maximumElapsedSeconds,
      `${path}.localAttemptPolicy.maximumElapsedSeconds`,
      1,
      GOVINFO_RETRY_POLICY.maximumElapsedSeconds,
    ),
  };
  if (
    retryAfterSeconds * localAttemptPolicy.maximumAttempts >
    localAttemptPolicy.maximumElapsedSeconds
  ) {
    fail(
      "inconsistent_response",
      `${path}.localAttemptPolicy`,
      "retry schedule exceeds the local elapsed-time bound",
    );
  }
  return {
    contractVersion: exactString(
      source.contractVersion,
      `${path}.contractVersion`,
      GOVINFO_CONTRACT_VERSION,
    ),
    fixtureNotice: exactString(
      source.fixtureNotice,
      `${path}.fixtureNotice`,
      GOVINFO_SYNTHETIC_NOTICE,
    ),
    kind: exactString(
      source.kind,
      `${path}.kind`,
      GOVINFO_RETRY_DIRECTIVE_KIND,
    ),
    sourceId: exactString(
      source.sourceId,
      `${path}.sourceId`,
      GOVINFO_SOURCE_ID,
    ),
    directiveOrigin: exactString(
      source.directiveOrigin,
      `${path}.directiveOrigin`,
      "repository_policy",
    ),
    providerEnvelope: false,
    statusCode,
    operation,
    retryAfterSeconds,
    localAttemptPolicy,
  };
}
