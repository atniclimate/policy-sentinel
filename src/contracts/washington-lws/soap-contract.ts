import {
  SOAP_11_NAMESPACE,
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
  WASHINGTON_LWS_ORIGIN,
  WASHINGTON_LWS_SERVICE_NAMESPACE,
  WASHINGTON_LWS_XML_POLICY,
  XML_SCHEMA_INSTANCE_NAMESPACE,
  type WashingtonLwsOperation,
} from "./constants";
import { failWashingtonLwsContract } from "./errors";
import {
  parseWashingtonLwsXmlDocument,
  type WashingtonLwsXmlElement,
} from "./xml-contract";
import {
  buildWashingtonLwsSoapRequest,
  type WashingtonLwsRequestInput,
  type WashingtonLwsSoapRequest,
} from "./request-contract";

export interface WashingtonLwsLegislationType {
  short: string | null;
  long: string | null;
}

export interface WashingtonLwsStatus {
  billId: string | null;
  historyLine: string | null;
  actionDate: string;
  amendedByOppositeBody: boolean;
  partialVeto: boolean;
  veto: boolean;
  amendmentsExist: boolean;
  sourceStatus: string | null;
}

export interface WashingtonLwsCompanion {
  biennium: string | null;
  billId: string | null;
  sourceStatus: string | null;
}

export interface WashingtonLwsLegislationInfo {
  biennium: string | null;
  billId: string | null;
  billNumber: number;
  substituteVersion: number;
  engrossedVersion: number;
  legislationType: WashingtonLwsLegislationType | null;
  originalAgency: string | null;
  active: boolean;
  displayNumber: string | null;
}

export interface WashingtonLwsLegislation extends WashingtonLwsLegislationInfo {
  shortDescription: string | null;
  introducedDate: string;
  currentStatus: WashingtonLwsStatus | null;
  sponsor: string | null;
  primeSponsorId: number;
  legalTitle: string | null;
  companions: WashingtonLwsCompanion[] | null;
}

export interface WashingtonLwsSponsor {
  id: number;
  name: string | null;
  longName: string | null;
  agency: string | null;
  acronym: string | null;
  sourceType: string | null;
  order: number;
}

export interface WashingtonLwsCommittee {
  id: number;
  name: string | null;
  longName: string | null;
  agency: string | null;
  acronym: string | null;
}

export interface WashingtonLwsCommitteeReferral {
  legislationInfo: WashingtonLwsLegislationInfo | null;
  committee: WashingtonLwsCommittee | null;
  referredDate: string;
}

export interface WashingtonLwsLegislativeDocument {
  name: string | null;
  shortFriendlyName: string | null;
  biennium: string | null;
  longFriendlyName: string | null;
  sourceType: string | null;
  sourceClass: string | null;
  htmlUrl: string | null;
  htmlCreatedAt: string;
  htmlModifiedAt: string;
  pdfUrl: string | null;
  pdfCreatedAt: string;
  pdfModifiedAt: string;
  billId: string | null;
}

export interface WashingtonLwsSessionLaw {
  chapterNumber: number;
  year: number;
  legislativeSession: string | null;
  legislatureNumber: number;
  effectiveDate: string;
  multipleEffectiveDates: boolean;
  billId: string | null;
  biennium: string | null;
  billTitle: string | null;
  partialVeto: boolean;
  veto: boolean;
  legislationTypeId: number;
}

export interface WashingtonLwsOperationResultMap {
  GetLegislation: WashingtonLwsLegislation[];
  GetLegislationByYear: WashingtonLwsLegislationInfo[];
  GetLegislativeStatusChangesByBillId: WashingtonLwsStatus[];
  GetSponsors: WashingtonLwsSponsor[];
  GetCommitteeReferralsByBill: WashingtonLwsCommitteeReferral[];
  GetDocuments: WashingtonLwsLegislativeDocument[];
  GetSessionLawByBillId: WashingtonLwsSessionLaw | null;
}

export interface WashingtonLwsSoapFault {
  category: "unclassified_provider_fault";
  codeLexicalDiscarded: true;
  actorPresent: boolean;
  detailPresent: boolean;
  providerTextDiscarded: true;
}

export type WashingtonLwsSoapResponse<
  O extends WashingtonLwsOperation = WashingtonLwsOperation,
> =
  | {
      kind: "success";
      operation: O;
      request: WashingtonLwsSoapRequest;
      resultState: "missing" | "empty" | "present";
      result: WashingtonLwsOperationResultMap[O];
    }
  | {
      kind: "fault";
      operation: O;
      request: WashingtonLwsSoapRequest;
      fault: WashingtonLwsSoapFault;
    };

interface FieldDefinition<T> {
  name: string;
  optional: boolean;
  parse: (element: WashingtonLwsXmlElement, path: string) => T;
}

type ParsedFields = Record<string, unknown>;

const INT32_MINIMUM = -2_147_483_648;
const INT32_MAXIMUM = 2_147_483_647;
const XSD_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))?$/;
const REVIEWED_SYNTHETIC_DOCUMENT_PATH =
  /^\/synthetic\/3785-86\/SYNTHETIC-[A-Z0-9-]+\.(?:html|pdf)$/;

function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function elementPath(parent: string, local: string, index?: number): string {
  return `${parent}.${local}${index === undefined ? "" : `[${index}]`}`;
}

function assertElement(
  element: WashingtonLwsXmlElement,
  uri: string,
  local: string,
  path: string,
): void {
  if (element.uri !== uri) {
    failWashingtonLwsContract(
      "unexpected_namespace",
      path,
      `expected the reviewed namespace for ${local}`,
    );
  }
  if (element.local !== local) {
    failWashingtonLwsContract("unexpected_field", path, `expected ${local}`);
  }
}

function assertNoAttributes(
  element: WashingtonLwsXmlElement,
  path: string,
): void {
  if (element.attributes.length !== 0) {
    failWashingtonLwsContract(
      "unexpected_field",
      `${path}.@${element.attributes[0]?.local ?? "attribute"}`,
      "attributes are outside this element contract",
    );
  }
}

function assertComplexElement(
  element: WashingtonLwsXmlElement,
  path: string,
): void {
  assertNoAttributes(element, path);
  if (element.text !== "") {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "complex element contains character data",
    );
  }
}

function scalarText(
  element: WashingtonLwsXmlElement,
  path: string,
  maximumLength: number = WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength,
): string {
  assertNoAttributes(element, path);
  if (element.children.length !== 0) {
    failWashingtonLwsContract(
      "invalid_type",
      path,
      "expected scalar character data",
    );
  }
  if (element.text.length > maximumLength) {
    failWashingtonLwsContract(
      "limit_exceeded",
      path,
      "scalar exceeds its field-specific text budget",
    );
  }
  return element.text;
}

function sourceString(
  element: WashingtonLwsXmlElement,
  path: string,
  maximumLength: number = 8_192,
): string {
  return scalarText(element, path, maximumLength);
}

function sourceIdentifier(
  element: WashingtonLwsXmlElement,
  path: string,
): string {
  return scalarText(
    element,
    path,
    WASHINGTON_LWS_XML_POLICY.maximumIdentifierLength,
  );
}

function xsdInt(element: WashingtonLwsXmlElement, path: string): number {
  const lexical = scalarText(element, path, 16);
  if (!/^-?(?:0|[1-9]\d*)$/.test(lexical)) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected an xsd:int lexical value",
    );
  }
  const parsed = Number(lexical);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < INT32_MINIMUM ||
    parsed > INT32_MAXIMUM
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "integer is outside xsd:int bounds",
    );
  }
  return parsed;
}

function nonnegativeInt(
  element: WashingtonLwsXmlElement,
  path: string,
): number {
  const parsed = xsdInt(element, path);
  if (parsed < 0) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected a nonnegative source integer",
    );
  }
  return parsed;
}

function positiveInt(element: WashingtonLwsXmlElement, path: string): number {
  const parsed = xsdInt(element, path);
  if (parsed < 1) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected a positive source integer",
    );
  }
  return parsed;
}

function canonicalBiennium(
  element: WashingtonLwsXmlElement,
  path: string,
): string {
  const value = sourceIdentifier(element, path);
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match === null) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected a canonical source biennium",
    );
  }
  const start = Number(match[1]);
  const endSuffix = Number(match[2]);
  if (
    start < 1799 ||
    start > 3999 ||
    start % 2 !== 1 ||
    (start + 1) % 100 !== endSuffix
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected an odd-year two-year source biennium",
    );
  }
  return value;
}

function boundedBillNumber(
  element: WashingtonLwsXmlElement,
  path: string,
): number {
  const parsed = positiveInt(element, path);
  if (parsed > 999_999) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "source bill number exceeds the reviewed bound",
    );
  }
  return parsed;
}

function xsdBoolean(element: WashingtonLwsXmlElement, path: string): boolean {
  const lexical = scalarText(element, path, 5);
  if (lexical === "true" || lexical === "1") {
    return true;
  }
  if (lexical === "false" || lexical === "0") {
    return false;
  }
  failWashingtonLwsContract(
    "invalid_value",
    path,
    "expected an xsd:boolean lexical value",
  );
}

function xsdDateTime(element: WashingtonLwsXmlElement, path: string): string {
  const lexical = scalarText(element, path, 64);
  const match = XSD_DATE_TIME.exec(lexical);
  if (match === null) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected an xsd:dateTime lexical value",
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const zoneHour = match[9] === undefined ? 0 : Number(match[9]);
  const zoneMinute = match[10] === undefined ? 0 : Number(match[10]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInGregorianMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    zoneHour > 14 ||
    zoneMinute > 59 ||
    (zoneHour === 14 && zoneMinute !== 0)
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "date-time contains an invalid calendar or clock component",
    );
  }
  return lexical;
}

function parseFields(
  element: WashingtonLwsXmlElement,
  path: string,
  definitions: readonly FieldDefinition<unknown>[],
): ParsedFields {
  assertComplexElement(element, path);
  const result: ParsedFields = {};
  let childIndex = 0;
  for (const definition of definitions) {
    const child = element.children[childIndex];
    if (
      child !== undefined &&
      child.uri === WASHINGTON_LWS_SERVICE_NAMESPACE &&
      child.local === definition.name
    ) {
      const childPath = elementPath(path, definition.name);
      result[definition.name] = definition.parse(child, childPath);
      childIndex += 1;
      continue;
    }
    if (!definition.optional) {
      failWashingtonLwsContract(
        "missing_field",
        elementPath(path, definition.name),
        "required WSDL field is missing or out of order",
      );
    }
    result[definition.name] = null;
  }
  const unexpected = element.children[childIndex];
  if (unexpected !== undefined) {
    const duplicate = definitions.some(({ name }) => name === unexpected.local);
    failWashingtonLwsContract(
      duplicate ? "duplicate_value" : "unexpected_field",
      elementPath(path, unexpected.local, childIndex),
      duplicate
        ? "field is duplicated or out of WSDL sequence"
        : "field is outside the reviewed WSDL projection",
    );
  }
  return result;
}

function field<T>(
  name: string,
  parse: FieldDefinition<T>["parse"],
  optional = false,
): FieldDefinition<T> {
  return { name, optional, parse };
}

const LEGISLATION_INFO_FIELDS = [
  field("Biennium", canonicalBiennium, true),
  field("BillId", sourceIdentifier, true),
  field("BillNumber", boundedBillNumber),
  field("SubstituteVersion", nonnegativeInt),
  field("EngrossedVersion", nonnegativeInt),
  field("ShortLegislationType", parseLegislationType, true),
  field("OriginalAgency", sourceString, true),
  field("Active", xsdBoolean),
  field("DisplayNumber", sourceString, true),
] as const satisfies readonly FieldDefinition<unknown>[];

function parseLegislationType(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsLegislationType {
  const values = parseFields(element, path, [
    field("ShortLegislationType", sourceString, true),
    field("LongLegislationType", sourceString, true),
  ]);
  return {
    short: values.ShortLegislationType as string | null,
    long: values.LongLegislationType as string | null,
  };
}

function legislationInfoFromFields(
  values: ParsedFields,
): WashingtonLwsLegislationInfo {
  return {
    biennium: values.Biennium as string | null,
    billId: values.BillId as string | null,
    billNumber: values.BillNumber as number,
    substituteVersion: values.SubstituteVersion as number,
    engrossedVersion: values.EngrossedVersion as number,
    legislationType:
      values.ShortLegislationType as WashingtonLwsLegislationType | null,
    originalAgency: values.OriginalAgency as string | null,
    active: values.Active as boolean,
    displayNumber: values.DisplayNumber as string | null,
  };
}

function parseLegislationInfo(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsLegislationInfo {
  return legislationInfoFromFields(
    parseFields(element, path, LEGISLATION_INFO_FIELDS),
  );
}

function parseStatus(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsStatus {
  const values = parseFields(element, path, [
    field("BillId", sourceIdentifier, true),
    field(
      "HistoryLine",
      (entry, entryPath) => sourceString(entry, entryPath, 4_096),
      true,
    ),
    field("ActionDate", xsdDateTime),
    field("AmendedByOppositeBody", xsdBoolean),
    field("PartialVeto", xsdBoolean),
    field("Veto", xsdBoolean),
    field("AmendmentsExist", xsdBoolean),
    field("Status", sourceString, true),
  ]);
  return {
    billId: values.BillId as string | null,
    historyLine: values.HistoryLine as string | null,
    actionDate: values.ActionDate as string,
    amendedByOppositeBody: values.AmendedByOppositeBody as boolean,
    partialVeto: values.PartialVeto as boolean,
    veto: values.Veto as boolean,
    amendmentsExist: values.AmendmentsExist as boolean,
    sourceStatus: values.Status as string | null,
  };
}

function parseCompanion(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsCompanion {
  const values = parseFields(element, path, [
    field("Biennium", sourceIdentifier, true),
    field("BillId", sourceIdentifier, true),
    field("Status", sourceString, true),
  ]);
  return {
    biennium: values.Biennium as string | null,
    billId: values.BillId as string | null,
    sourceStatus: values.Status as string | null,
  };
}

function parseCompanions(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsCompanion[] {
  assertComplexElement(element, path);
  if (element.children.length > 128) {
    failWashingtonLwsContract(
      "limit_exceeded",
      path,
      "companion collection exceeds the repository budget",
    );
  }
  return element.children.map((child, index) => {
    const childPath = elementPath(path, "Companion", index);
    assertElement(
      child,
      WASHINGTON_LWS_SERVICE_NAMESPACE,
      "Companion",
      childPath,
    );
    return parseCompanion(nonNilElement(child, childPath), childPath);
  });
}

function discardString(element: WashingtonLwsXmlElement, path: string): null {
  sourceString(element, path);
  return null;
}

function parseLegislation(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsLegislation {
  const values = parseFields(element, path, [
    ...LEGISLATION_INFO_FIELDS,
    field("StateFiscalNote", xsdBoolean),
    field("LocalFiscalNote", xsdBoolean),
    field("Appropriations", xsdBoolean),
    field("RequestedByGovernor", xsdBoolean),
    field("RequestedByBudgetCommittee", xsdBoolean),
    field("RequestedByDepartment", xsdBoolean),
    field("RequestedByOther", xsdBoolean),
    field("ShortDescription", sourceString, true),
    field("Request", discardString, true),
    field("IntroducedDate", xsdDateTime),
    field("CurrentStatus", parseStatus, true),
    field("Sponsor", sourceString, true),
    field("PrimeSponsorID", nonnegativeInt),
    field("LongDescription", discardString, true),
    field("LegalTitle", sourceString, true),
    field("Companions", parseCompanions, true),
  ]);
  return {
    ...legislationInfoFromFields(values),
    shortDescription: values.ShortDescription as string | null,
    introducedDate: values.IntroducedDate as string,
    currentStatus: values.CurrentStatus as WashingtonLwsStatus | null,
    sponsor: values.Sponsor as string | null,
    primeSponsorId: values.PrimeSponsorID as number,
    legalTitle: values.LegalTitle as string | null,
    companions: values.Companions as WashingtonLwsCompanion[] | null,
  };
}

function legislativeEntityFields(): readonly FieldDefinition<unknown>[] {
  return [
    field("Id", nonnegativeInt),
    field("Name", sourceString, true),
    field("LongName", sourceString, true),
    field("Agency", sourceString, true),
    field("Acronym", sourceString, true),
  ];
}

function parseSponsor(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsSponsor {
  const values = parseFields(element, path, [
    ...legislativeEntityFields(),
    field("Type", sourceString, true),
    field("Order", nonnegativeInt),
    field("Phone", discardString, true),
    field("Email", discardString, true),
    field("FirstName", discardString, true),
    field("LastName", discardString, true),
  ]);
  return {
    id: values.Id as number,
    name: values.Name as string | null,
    longName: values.LongName as string | null,
    agency: values.Agency as string | null,
    acronym: values.Acronym as string | null,
    sourceType: values.Type as string | null,
    order: values.Order as number,
  };
}

function parseCommittee(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsCommittee {
  const values = parseFields(element, path, [
    ...legislativeEntityFields(),
    field("Phone", discardString, true),
  ]);
  return {
    id: values.Id as number,
    name: values.Name as string | null,
    longName: values.LongName as string | null,
    agency: values.Agency as string | null,
    acronym: values.Acronym as string | null,
  };
}

function parseCommitteeReferral(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsCommitteeReferral {
  const values = parseFields(element, path, [
    field("LegislationInfo", parseLegislationInfo, true),
    field("Committee", parseCommittee, true),
    field("ReferredDate", xsdDateTime),
  ]);
  return {
    legislationInfo:
      values.LegislationInfo as WashingtonLwsLegislationInfo | null,
    committee: values.Committee as WashingtonLwsCommittee | null,
    referredDate: values.ReferredDate as string,
  };
}

function referenceUrl(element: WashingtonLwsXmlElement, path: string): string {
  const lexical = scalarText(
    element,
    path,
    WASHINGTON_LWS_XML_POLICY.maximumUrlLength,
  );
  let url: URL;
  try {
    url = new URL(lexical);
  } catch {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "document reference is not an absolute URL",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== new URL(WASHINGTON_LWS_ORIGIN).hostname ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !REVIEWED_SYNTHETIC_DOCUMENT_PATH.test(url.pathname)
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "document reference is outside the reviewed synthetic-only URL shape",
    );
  }
  return url.href;
}

function parseLegislativeDocument(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsLegislativeDocument {
  const values = parseFields(element, path, [
    field("Name", sourceString, true),
    field("ShortFriendlyName", sourceString, true),
    field("Biennium", sourceIdentifier, true),
    field("LongFriendlyName", sourceString, true),
    field("Description", discardString, true),
    field("Type", sourceString, true),
    field("Class", sourceString, true),
    field("HtmUrl", referenceUrl, true),
    field("HtmCreateDate", xsdDateTime),
    field("HtmLastModifiedDate", xsdDateTime),
    field("PdfUrl", referenceUrl, true),
    field("PdfCreateDate", xsdDateTime),
    field("PdfLastModifiedDate", xsdDateTime),
    field("BillId", sourceIdentifier, true),
  ]);
  return {
    name: values.Name as string | null,
    shortFriendlyName: values.ShortFriendlyName as string | null,
    biennium: values.Biennium as string | null,
    longFriendlyName: values.LongFriendlyName as string | null,
    sourceType: values.Type as string | null,
    sourceClass: values.Class as string | null,
    htmlUrl: values.HtmUrl as string | null,
    htmlCreatedAt: values.HtmCreateDate as string,
    htmlModifiedAt: values.HtmLastModifiedDate as string,
    pdfUrl: values.PdfUrl as string | null,
    pdfCreatedAt: values.PdfCreateDate as string,
    pdfModifiedAt: values.PdfLastModifiedDate as string,
    billId: values.BillId as string | null,
  };
}

function parseSessionLaw(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsSessionLaw {
  const values = parseFields(element, path, [
    field("ChapterNumber", nonnegativeInt),
    field("Year", nonnegativeInt),
    field("LegislativeSession", sourceString, true),
    field("LegislatureNumber", nonnegativeInt),
    field("EffectiveDate", xsdDateTime),
    field("MultipleEffectiveDates", xsdBoolean),
    field("BillId", sourceIdentifier, true),
    field("Biennium", sourceIdentifier, true),
    field("BillTitle", sourceString, true),
    field("PartialVeto", xsdBoolean),
    field("Veto", xsdBoolean),
    field("LegTypeId", nonnegativeInt),
  ]);
  return {
    chapterNumber: values.ChapterNumber as number,
    year: values.Year as number,
    legislativeSession: values.LegislativeSession as string | null,
    legislatureNumber: values.LegislatureNumber as number,
    effectiveDate: values.EffectiveDate as string,
    multipleEffectiveDates: values.MultipleEffectiveDates as boolean,
    billId: values.BillId as string | null,
    biennium: values.Biennium as string | null,
    billTitle: values.BillTitle as string | null,
    partialVeto: values.PartialVeto as boolean,
    veto: values.Veto as boolean,
    legislationTypeId: values.LegTypeId as number,
  };
}

function nilValue(element: WashingtonLwsXmlElement): string | null {
  const nil = element.attributes.find(
    ({ uri, local }) =>
      uri === XML_SCHEMA_INSTANCE_NAMESPACE && local === "nil",
  );
  return nil?.value ?? null;
}

function nonNilElement(
  element: WashingtonLwsXmlElement,
  path: string,
): WashingtonLwsXmlElement {
  const nil = nilValue(element);
  if (nil === "true") {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "xsi:nil=true is not an eligible contract resource",
    );
  }
  if (nil !== "false") {
    return element;
  }
  return {
    ...element,
    attributes: element.attributes.filter(
      ({ uri, local }) =>
        uri !== XML_SCHEMA_INSTANCE_NAMESPACE || local !== "nil",
    ),
  };
}

function parseArrayResult<T>(
  result: WashingtonLwsXmlElement,
  operation: WashingtonLwsOperation,
  parseItem: (element: WashingtonLwsXmlElement, path: string) => T,
): T[] {
  const descriptor = WASHINGTON_LWS_OPERATION_DESCRIPTORS[operation];
  const path = `$.Envelope.Body.${descriptor.responseElement}.${descriptor.resultElement}`;
  assertElement(
    result,
    WASHINGTON_LWS_SERVICE_NAMESPACE,
    descriptor.resultElement,
    path,
  );
  assertComplexElement(result, path);
  if (result.children.length > descriptor.maximumItems) {
    failWashingtonLwsContract(
      "limit_exceeded",
      path,
      "operation result exceeds its item budget",
    );
  }
  return result.children.map((item, index) => {
    const itemPath = elementPath(path, descriptor.itemElement, index);
    assertElement(
      item,
      WASHINGTON_LWS_SERVICE_NAMESPACE,
      descriptor.itemElement,
      itemPath,
    );
    return parseItem(nonNilElement(item, itemPath), itemPath);
  });
}

function parseOperationResult<O extends WashingtonLwsOperation>(
  operation: O,
  result: WashingtonLwsXmlElement,
): WashingtonLwsOperationResultMap[O] {
  switch (operation) {
    case "GetLegislation":
      return parseArrayResult(
        result,
        operation,
        parseLegislation,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetLegislationByYear":
      return parseArrayResult(
        result,
        operation,
        parseLegislationInfo,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetLegislativeStatusChangesByBillId":
      return parseArrayResult(
        result,
        operation,
        parseStatus,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetSponsors":
      return parseArrayResult(
        result,
        operation,
        parseSponsor,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetCommitteeReferralsByBill":
      return parseArrayResult(
        result,
        operation,
        parseCommitteeReferral,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetDocuments":
      return parseArrayResult(
        result,
        operation,
        parseLegislativeDocument,
      ) as WashingtonLwsOperationResultMap[O];
    case "GetSessionLawByBillId": {
      const descriptor = WASHINGTON_LWS_OPERATION_DESCRIPTORS[operation];
      const path = `$.Envelope.Body.${descriptor.responseElement}.${descriptor.resultElement}`;
      assertElement(
        result,
        WASHINGTON_LWS_SERVICE_NAMESPACE,
        descriptor.resultElement,
        path,
      );
      const nonNilResult = nonNilElement(result, path);
      return parseSessionLaw(
        nonNilResult,
        path,
      ) as WashingtonLwsOperationResultMap[O];
    }
  }
}

function parseSoapFault(
  request: WashingtonLwsSoapRequest,
  fault: WashingtonLwsXmlElement,
): WashingtonLwsSoapResponse {
  const path = "$.Envelope.Body.Fault";
  assertElement(fault, SOAP_11_NAMESPACE, "Fault", path);
  assertComplexElement(fault, path);
  const values = parseUnqualifiedFaultFields(fault, path);
  void values.faultcode;
  void values.faultstring;
  void values.faultactor;
  return {
    kind: "fault",
    operation: request.operation,
    request,
    fault: {
      category: "unclassified_provider_fault",
      codeLexicalDiscarded: true,
      actorPresent: values.faultactor !== null,
      detailPresent: values.detail,
      providerTextDiscarded: true,
    },
  };
}

function parseUnqualifiedFaultFields(
  fault: WashingtonLwsXmlElement,
  path: string,
): {
  faultcode: string;
  faultstring: string;
  faultactor: string | null;
  detail: boolean;
} {
  const definitions: Array<{
    name: string;
    optional: boolean;
    parse: (element: WashingtonLwsXmlElement, path: string) => unknown;
  }> = [
    {
      name: "faultcode",
      optional: false,
      parse: (element, fieldPath) => scalarText(element, fieldPath, 256),
    },
    {
      name: "faultstring",
      optional: false,
      parse: (element, fieldPath) =>
        scalarText(
          element,
          fieldPath,
          WASHINGTON_LWS_XML_POLICY.maximumFaultTextLength,
        ),
    },
    {
      name: "faultactor",
      optional: true,
      parse: (element, fieldPath) =>
        scalarText(
          element,
          fieldPath,
          WASHINGTON_LWS_XML_POLICY.maximumUrlLength,
        ),
    },
    {
      name: "detail",
      optional: true,
      parse: (element, fieldPath) => {
        assertComplexElement(element, fieldPath);
        if (element.children.length !== 0) {
          failWashingtonLwsContract(
            "unexpected_field",
            fieldPath,
            "structured SOAP fault detail is not reviewed",
          );
        }
        return true;
      },
    },
  ];
  const result: Record<string, unknown> = {};
  let index = 0;
  for (const definition of definitions) {
    const child = fault.children[index];
    if (
      child !== undefined &&
      child.uri === "" &&
      child.local === definition.name
    ) {
      result[definition.name] = definition.parse(
        child,
        elementPath(path, definition.name),
      );
      index += 1;
    } else if (!definition.optional) {
      failWashingtonLwsContract(
        "missing_field",
        elementPath(path, definition.name),
        "required SOAP fault field is missing or out of order",
      );
    } else {
      result[definition.name] = null;
    }
  }
  const unexpected = fault.children[index];
  if (unexpected !== undefined) {
    failWashingtonLwsContract(
      "unexpected_field",
      elementPath(path, unexpected.local, index),
      "SOAP fault field is outside the reviewed shape",
    );
  }
  return {
    faultcode: result.faultcode as string,
    faultstring: result.faultstring as string,
    faultactor: result.faultactor as string | null,
    detail: result.detail === true,
  };
}

function assertRequestBoundIdentity(
  requestInput: WashingtonLwsRequestInput,
  response: WashingtonLwsSoapResponse,
): void {
  if (response.kind !== "success") {
    return;
  }
  const mismatch = (path: string): never =>
    failWashingtonLwsContract(
      "inconsistent_value",
      path,
      "response identity does not match the canonical originating request",
    );

  switch (requestInput.operation) {
    case "GetLegislation":
      for (const [index, legislation] of (
        response.result as WashingtonLwsLegislation[]
      ).entries()) {
        if (
          legislation.billNumber !== requestInput.billNumber ||
          (legislation.biennium !== null &&
            legislation.biennium !== requestInput.biennium)
        ) {
          mismatch(`$.response.result[${index}]`);
        }
      }
      break;
    case "GetLegislationByYear":
      // The formal request is an integer year, while the help prose describes a
      // biennium. The response exposes no reviewed request-year echo, so no
      // inferred year/biennium identity check is allowed at this boundary.
      break;
    case "GetLegislativeStatusChangesByBillId":
      for (const [index, status] of (
        response.result as WashingtonLwsStatus[]
      ).entries()) {
        if (status.billId !== null && status.billId !== requestInput.billId) {
          mismatch(`$.response.result[${index}].billId`);
        }
      }
      break;
    case "GetSponsors":
      // The WSDL response has no request-identity echo to reconcile.
      break;
    case "GetCommitteeReferralsByBill":
      for (const [index, referral] of (
        response.result as WashingtonLwsCommitteeReferral[]
      ).entries()) {
        if (
          referral.legislationInfo !== null &&
          (referral.legislationInfo.billNumber !== requestInput.billNumber ||
            (referral.legislationInfo.biennium !== null &&
              referral.legislationInfo.biennium !== requestInput.biennium))
        ) {
          mismatch(`$.response.result[${index}].legislationInfo`);
        }
      }
      break;
    case "GetDocuments":
      for (const [index, document] of (
        response.result as WashingtonLwsLegislativeDocument[]
      ).entries()) {
        if (
          document.biennium !== null &&
          document.biennium !== requestInput.biennium
        ) {
          mismatch(`$.response.result[${index}].biennium`);
        }
      }
      break;
    case "GetSessionLawByBillId": {
      const sessionLaw = response.result as WashingtonLwsSessionLaw | null;
      if (
        sessionLaw !== null &&
        ((sessionLaw.billId !== null &&
          sessionLaw.billId !== requestInput.billId) ||
          (sessionLaw.biennium !== null &&
            sessionLaw.biennium !== requestInput.biennium))
      ) {
        mismatch("$.response.result");
      }
      break;
    }
  }
}

export function parseWashingtonLwsSoapExchange<
  O extends WashingtonLwsOperation,
>(
  requestInput: Extract<WashingtonLwsRequestInput, { operation: O }>,
  value: unknown,
): WashingtonLwsSoapResponse<O> {
  const request = buildWashingtonLwsSoapRequest(requestInput);
  const operation = request.operation as O;
  const root = parseWashingtonLwsXmlDocument(value);
  const envelopePath = "$.Envelope";
  assertElement(root, SOAP_11_NAMESPACE, "Envelope", envelopePath);
  assertComplexElement(root, envelopePath);
  if (
    root.children.length !== 1 ||
    root.children[0]?.uri !== SOAP_11_NAMESPACE ||
    root.children[0].local !== "Body"
  ) {
    failWashingtonLwsContract(
      "unexpected_field",
      envelopePath,
      "SOAP Envelope must contain exactly one Body and no Header",
    );
  }
  const body = root.children[0];
  const bodyPath = "$.Envelope.Body";
  assertComplexElement(body, bodyPath);
  if (body.children.length !== 1 || body.children[0] === undefined) {
    failWashingtonLwsContract(
      "invalid_value",
      bodyPath,
      "SOAP Body must contain exactly one response or Fault",
    );
  }
  const payload = body.children[0];
  if (payload.uri === SOAP_11_NAMESPACE && payload.local === "Fault") {
    return parseSoapFault(request, payload) as WashingtonLwsSoapResponse<O>;
  }

  const descriptor = WASHINGTON_LWS_OPERATION_DESCRIPTORS[operation];
  const responsePath = `$.Envelope.Body.${descriptor.responseElement}`;
  assertElement(
    payload,
    WASHINGTON_LWS_SERVICE_NAMESPACE,
    descriptor.responseElement,
    responsePath,
  );
  assertComplexElement(payload, responsePath);
  if (payload.children.length === 0) {
    const response = {
      kind: "success",
      operation,
      request,
      resultState: "missing",
      result: (operation === "GetSessionLawByBillId"
        ? null
        : []) as WashingtonLwsOperationResultMap[O],
    } as const;
    assertRequestBoundIdentity(requestInput, response);
    return response;
  }
  if (payload.children.length !== 1 || payload.children[0] === undefined) {
    failWashingtonLwsContract(
      "duplicate_value",
      responsePath,
      "response contains multiple result elements",
    );
  }
  const parsed = parseOperationResult(operation, payload.children[0]);
  const isEmpty = Array.isArray(parsed) && parsed.length === 0;
  const response = {
    kind: "success",
    operation,
    request,
    resultState: isEmpty ? "empty" : "present",
    result: parsed,
  } as WashingtonLwsSoapResponse<O>;
  assertRequestBoundIdentity(requestInput, response);
  return response;
}
