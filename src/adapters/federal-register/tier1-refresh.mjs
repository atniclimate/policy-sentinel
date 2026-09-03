/* global TextDecoder, URL, process, structuredClone */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";
import { registerHooks } from "node:module";

import {
  FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER,
  FEDERAL_REGISTER_TIER1_FIELDS,
} from "./tier1-contract.mjs";

const FIELD_QUERY = FEDERAL_REGISTER_TIER1_FIELDS.map(
  (field) => `fields%5B%5D=${encodeURIComponent(field)}`,
).join("&");
const FEDERAL_REGISTER_TIER1_REQUEST_URL = `https://www.federalregister.gov/api/v1/documents/${FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER}.json?${FIELD_QUERY}`;
const FEDERAL_REGISTER_TIER1_REQUEST_POLICY = Object.freeze({
  requestId: "FR-A1",
  method: "GET",
  host: "www.federalregister.gov",
  path: `/api/v1/documents/${FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER}.json`,
  maximumBytes: 65_536,
  maximumChunks: 64,
  maximumAttempts: 1,
  maximumPages: 1,
  maximumItems: 1,
  timeoutMilliseconds: 30_000,
  redirect: "manual",
  credentials: "omit",
  referrerPolicy: "no-referrer",
  accept: "application/json",
  acceptEncoding: "identity",
  userAgent: "Policy-Sentinel-LocalPrerelease/1.0",
});

const LIFECYCLE_URL = new URL(
  "../../engine/real-source-lifecycle.ts",
  import.meta.url,
);
const LIFECYCLE_CONTRACTS_URL = new URL(
  "../../engine/real-source-lifecycle-contracts.ts",
  import.meta.url,
);
const SOURCE_REGISTRY_URL = new URL(
  "../../../config/sources.v1.json",
  import.meta.url,
);
const MAXIMUM_REGISTRY_BYTES = 1_048_576;
const MAXIMUM_CAPTURE_NODES = 50_000;
const MAXIMUM_TEXT_BYTES = 1_048_576;
const MAXIMUM_KEY_BYTES = 262_144;
const MAXIMUM_ARRAY_ITEMS = 25_000;
const MAXIMUM_DEPTH = 64;

export function parseFederalRegisterTier1BoundedRegistryJson(textValue) {
  let index = 0;
  const budget = { nodes: 0, textBytes: 0, keyBytes: 0, arrayItems: 0 };
  const syntax = () => {
    throw new SyntaxError("invalid or duplicate JSON");
  };
  if (
    typeof textValue !== "string" ||
    textValue.length === 0 ||
    Buffer.byteLength(textValue, "utf8") > MAXIMUM_REGISTRY_BYTES ||
    textValue.charCodeAt(0) === 0xfeff
  ) {
    syntax();
  }
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
  const stringToken = (isKey = false) => {
    if (textValue[index] !== '"') syntax();
    const start = index;
    index += 1;
    while (index < textValue.length) {
      if (textValue[index] === '"') {
        index += 1;
        try {
          const parsed = JSON.parse(textValue.slice(start, index));
          const byteLength = Buffer.byteLength(parsed, "utf8");
          if (isKey) {
            budget.keyBytes += byteLength;
            if (budget.keyBytes > MAXIMUM_KEY_BYTES) syntax();
          } else {
            budget.textBytes += byteLength;
            if (budget.textBytes > MAXIMUM_TEXT_BYTES) syntax();
          }
          return parsed;
        } catch {
          syntax();
        }
      }
      index += textValue[index] === "\\" ? 2 : 1;
    }
    syntax();
  };
  const value = (depth) => {
    budget.nodes += 1;
    if (budget.nodes > MAXIMUM_CAPTURE_NODES || depth > MAXIMUM_DEPTH) syntax();
    whitespace();
    const character = textValue[index];
    if (character === '"') return stringToken();
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
        const key = stringToken(true);
        if (keys.has(key)) syntax();
        keys.add(key);
        whitespace();
        if (textValue[index] !== ":") syntax();
        index += 1;
        result[key] = value(depth + 1);
        whitespace();
        if (textValue[index] === "}") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") syntax();
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
        budget.arrayItems += 1;
        if (budget.arrayItems > MAXIMUM_ARRAY_ITEMS) syntax();
        result.push(value(depth + 1));
        whitespace();
        if (textValue[index] === "]") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") syntax();
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
    if (match === null) syntax();
    index += match[0].length;
    const parsed = Number(match[0]);
    if (!Number.isSafeInteger(parsed) || Object.is(parsed, -0)) syntax();
    return parsed;
  };
  const parsed = value(0);
  whitespace();
  if (index !== textValue.length) syntax();
  return parsed;
}

function sameFileSnapshot(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function readBoundedCanonicalSourceRegistry() {
  const invalid = () => {
    throw new TypeError("source registry violates the bounded file contract");
  };
  const before = lstatSync(SOURCE_REGISTRY_URL);
  if (
    before.isSymbolicLink() ||
    !before.isFile() ||
    before.nlink !== 1 ||
    before.size === 0 ||
    before.size > MAXIMUM_REGISTRY_BYTES
  ) {
    invalid();
  }
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  let descriptor;
  const content = Buffer.alloc(MAXIMUM_REGISTRY_BYTES + 1);
  let returned = false;
  try {
    descriptor = openSync(SOURCE_REGISTRY_URL, flags);
    const opened = fstatSync(descriptor);
    const openedPath = lstatSync(SOURCE_REGISTRY_URL);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      openedPath.isSymbolicLink() ||
      !openedPath.isFile() ||
      openedPath.nlink !== 1 ||
      !sameFileSnapshot(before, opened) ||
      !sameFileSnapshot(before, openedPath)
    ) {
      invalid();
    }
    let offset = 0;
    while (offset < content.byteLength) {
      const bytesRead = readSync(
        descriptor,
        content,
        offset,
        content.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const completed = fstatSync(descriptor);
    const completedPath = lstatSync(SOURCE_REGISTRY_URL);
    if (
      offset > MAXIMUM_REGISTRY_BYTES ||
      offset !== opened.size ||
      !sameFileSnapshot(opened, completed) ||
      completedPath.isSymbolicLink() ||
      !completedPath.isFile() ||
      completedPath.nlink !== 1 ||
      !sameFileSnapshot(opened, completedPath)
    ) {
      invalid();
    }
    returned = true;
    return content.subarray(0, offset);
  } finally {
    try {
      if (descriptor !== undefined) closeSync(descriptor);
    } finally {
      if (!returned) content.fill(0);
    }
  }
}

function loadCanonicalSourceRegistry() {
  const bytes = readBoundedCanonicalSourceRegistry();
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    bytes.fill(0);
    throw new TypeError("source registry violates the bounded UTF-8 contract");
  }
  let textValue;
  try {
    textValue = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally {
    bytes.fill(0);
  }
  const parsed = parseFederalRegisterTier1BoundedRegistryJson(textValue);
  return JSON.stringify(parsed);
}

// The repository is authored for Vite's bundler resolution. Direct Node use of
// this local-only CLI needs two narrowly scoped compatibility resolutions in
// order to call the accepted TypeScript lifecycle runtime rather than copying
// or weakening it here.
if (process.env.VITEST === undefined) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        specifier === "./real-source-lifecycle-contracts" &&
        context.parentURL?.startsWith(LIFECYCLE_URL.href)
      ) {
        return nextResolve(LIFECYCLE_CONTRACTS_URL.href, context);
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === SOURCE_REGISTRY_URL.href) {
        return {
          format: "module",
          shortCircuit: true,
          source: `export default JSON.parse(${JSON.stringify(
            loadCanonicalSourceRegistry(),
          )})`,
        };
      }
      return nextLoad(url, context);
    },
  });
}

const {
  assertRealSourceLifecycleCompatibility,
  evaluateRealSourceLifecycle,
  parseRealSourceLifecycleBundle,
  serializeRealSourceLifecycleBundle,
} = await import("../../engine/real-source-lifecycle.ts");

const DIGEST = /^[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const TIMESTAMP =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/;
const ZERO_DIGEST = "0".repeat(64);

export const FEDERAL_REGISTER_TIER1_CANDIDATE_BUNDLE_DIGEST =
  "8cc208b80a1ffe8ee90664ae506b22d1ddf300f00ed650c86aa1742814379b4b";
export const FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST =
  "027a9e24aaf23668adb93e4b9959ff02a8cff981bf565d8b7826a1d66fa0d865";
export const FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST =
  "835a3c002c401216946b508aff9060b57d4a5569f26e894f294c966bf6f16cf5";
export const FEDERAL_REGISTER_TIER1_GATE_EXPIRY = "2026-12-01T00:00:00Z";
export const FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT =
  "2026-09-03T11:54:01Z";
export const FEDERAL_REGISTER_TIER1_REJECTED_MANIFEST_DIGEST =
  "3a85bf0767d7db63b8dc3566d33250d70ef2b107af46392b47860516556c9d2d";
export const FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS = Object.freeze({
  maximumJsonFileBytes: MAXIMUM_REGISTRY_BYTES,
  maximumCaptureNodes: MAXIMUM_CAPTURE_NODES,
  maximumTextBytes: MAXIMUM_TEXT_BYTES,
  maximumKeyBytes: MAXIMUM_KEY_BYTES,
  maximumArrayItems: MAXIMUM_ARRAY_ITEMS,
  maximumDepth: MAXIMUM_DEPTH,
});

const AUTHORITY_BLUEPRINT = [
  {
    slot: "ofr_nara_service_operator",
    id: "federal-register-ofr-nara-service-operator-authority",
    role: "service_operator",
  },
  {
    slot: "ofr_nara_originating_publisher",
    id: "federal-register-ofr-nara-originating-publisher-authority",
    role: "originating_publisher",
  },
  {
    slot: "gpo_official_edition_custodian",
    id: "federal-register-gpo-official-edition-custodian-authority",
    role: "official_edition_custodian",
  },
  {
    slot: "source_reviewer",
    id: "federal-register-source-evidence-reviewer-authority",
    role: "source_evidence_reviewer",
  },
  {
    slot: "security_reviewer",
    id: "federal-register-security-reviewer-authority",
    role: "security_reviewer",
  },
  {
    slot: "sovereignty_reviewer",
    id: "federal-register-sovereignty-reviewer-authority",
    role: "sovereignty_reviewer",
  },
];

const SOURCE_EVIDENCE_BLUEPRINT = [
  {
    slot: "federal_register_documentation",
    id: "FR-D2",
    predecessorEvidenceId: "FR-D1",
    url: "https://www.federalregister.gov/api/v1/documentation.json",
    startedAt: "2026-09-03T12:47:42.741Z",
    endedAt: "2026-09-03T12:47:43.414Z",
    mediaCategory: "application_json_utf8_identity",
    byteCount: 230_046,
    chunkCount: 19,
    responseDigest:
      "06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71",
  },
  {
    slot: "nara_federal_register_faq",
    id: "FR-R4",
    predecessorEvidenceId: "FR-R1",
    url: "https://www.archives.gov/federal-register/faqs",
    startedAt: "2026-09-03T12:47:43.415Z",
    endedAt: "2026-09-03T12:47:43.727Z",
    mediaCategory: "html_utf8_identity",
    byteCount: 83_240,
    chunkCount: 8,
    responseDigest:
      "272f27476b26ff1ee8ab534cacbb29595a12aaf05625c3a0923e13b80387441e",
  },
  {
    slot: "govinfo_federal_register_help",
    id: "FR-R5",
    predecessorEvidenceId: "FR-R2",
    url: "https://www.govinfo.gov/help/fr",
    startedAt: "2026-09-03T12:47:43.727Z",
    endedAt: "2026-09-03T12:47:43.878Z",
    mediaCategory: "html_utf8_identity",
    byteCount: 112_041,
    chunkCount: 54,
    responseDigest:
      "6928c58b8617d0b012408eb835bbae0e8b5e7b3496d149552de0622281f0e1c4",
  },
];

export const FEDERAL_REGISTER_TIER1_POST_AUTHORITY_EVIDENCE_RECEIPTS =
  deepFreeze(
    SOURCE_EVIDENCE_BLUEPRINT.map((receipt) => ({
      ...receipt,
      method: "GET",
      statusCategory: "2xx",
      attemptCount: 1,
      redirectCount: 0,
      retryCount: 0,
      rawBytesRetained: 0,
    })),
  );

const PROVIDER_FACT_BLUEPRINT = [
  {
    id: "federal-register-source-identity-fact",
    factKind: "source_identity",
    authoritySlot: "ofr_nara_originating_publisher",
    support: ["federal_register_documentation", "nara_federal_register_faq"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[0].url,
    claimCode: "ofr-nara-published-document-api-service",
    accessState: "not_applicable",
  },
  {
    id: "federal-register-field-meaning-fact",
    factKind: "field_meaning",
    authoritySlot: "ofr_nara_service_operator",
    support: ["federal_register_documentation"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[0].url,
    claimCode: "openapi-includes-exact-tier1-selectors",
    accessState: "not_applicable",
  },
  {
    id: "federal-register-access-requirement-fact",
    factKind: "access_requirement",
    authoritySlot: "ofr_nara_service_operator",
    support: ["federal_register_documentation"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[0].url,
    claimCode: "dated-keyless-documentation-observation-only",
    accessState: "credentials_not_required",
  },
  {
    id: "federal-register-official-status-fact",
    factKind: "official_status",
    authoritySlot: "ofr_nara_originating_publisher",
    support: ["nara_federal_register_faq"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[1].url,
    claimCode: "ofr-nara-publication-and-gpo-distribution-roles",
    accessState: "not_applicable",
  },
  {
    id: "federal-register-reproduction-right-fact",
    factKind: "reproduction_right",
    authoritySlot: "ofr_nara_originating_publisher",
    support: ["nara_federal_register_faq"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[1].url,
    claimCode: "federal-register-edition-material-only-under-1-cfr-2-6",
    accessState: "not_applicable",
  },
  {
    id: "federal-register-rendition-custody-fact",
    factKind: "rendition_custody",
    authoritySlot: "gpo_official_edition_custodian",
    support: ["nara_federal_register_faq", "govinfo_federal_register_help"],
    evidenceUrl: SOURCE_EVIDENCE_BLUEPRINT[2].url,
    claimCode:
      "gpo-official-edition-custody-distinct-from-informational-renditions",
    accessState: "not_applicable",
  },
];

const CONTROL_KINDS = [
  "field_allowlist",
  "selected_range",
  "request_budget",
  "concurrency_limit",
  "time_limit",
  "byte_limit",
  "no_automatic_retry",
  "parser_fail_closed",
  "drift_policy",
  "lkg_retention",
  "artifact_isolation",
  "request_plan",
  "source_registry",
  "source_registry_entry",
  "deployment_scope",
  "region_scope",
  "persona_scope",
  "output_scope",
];

const UNKNOWN_KINDS = [
  "api_specific_privacy",
  "api_specific_terms",
  "change_notice",
  "formal_response_error_schema",
  "numeric_rate_limit",
  "paging_stability",
  "retry_backoff",
  "service_level",
  "snapshot_stability",
];

const REVIEW_BLUEPRINT = [
  ["qualification", "source_contract", "source_reviewer"],
  ["qualification", "source_evidence", "source_reviewer"],
  ["qualification", "sovereignty", "sovereignty_reviewer"],
  ["acquisition_grant", "source_contract", "source_reviewer"],
  ["acquisition_grant", "security", "security_reviewer"],
  ["acquisition_grant", "sovereignty", "sovereignty_reviewer"],
  ["admission", "source_evidence", "source_reviewer"],
  ["admission", "security", "security_reviewer"],
  ["admission", "sovereignty", "sovereignty_reviewer"],
  ["activation", "source_evidence", "source_reviewer"],
  ["activation", "security", "security_reviewer"],
  ["activation", "sovereignty", "sovereignty_reviewer"],
  ["binding", "security", "security_reviewer"],
  ["binding", "sovereignty", "sovereignty_reviewer"],
].map(([subject, reviewKind, reviewerSlot]) => ({
  subject,
  reviewKind,
  reviewerSlot,
}));

const SUBJECTS = {
  qualification: {
    kind: "qualification_receipt",
    id: "federal-register-tier1-qualification",
  },
  acquisition_grant: {
    kind: "operation_grant",
    id: "federal-register-tier1-acquisition-grant",
  },
  admission: {
    kind: "admission_receipt",
    id: "federal-register-tier1-admission",
  },
  activation: {
    kind: "activation_receipt",
    id: "federal-register-tier1-activation",
  },
  binding: {
    kind: "binding_receipt",
    id: "federal-register-tier1-binding",
  },
};

const APPROVAL_BLUEPRINT = [
  { role: "source", authoritySlot: "source_reviewer" },
  { role: "security", authoritySlot: "security_reviewer" },
  { role: "sovereignty", authoritySlot: "sovereignty_reviewer" },
];

const RESIDUAL_CONDITIONS = [
  "bounded_unpublished_local_use",
  "build_time_only",
  "impersonal_metadata_links_only",
  "keyless_read_only",
  "no_conflicting_affirmative_restriction",
  "no_private_contact_comment_attachment_or_sensitive_location",
];

export const FEDERAL_REGISTER_TIER1_LIFECYCLE_BLUEPRINT = deepFreeze({
  authorityReceiptCount: 7,
  providerFactCount: 6,
  projectControlCount: 18,
  unknownCount: 9,
  residualRiskCount: 2,
  reviewCount: 14,
  operationGrantCount: 1,
  expiry: FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
  residualAcceptedAt: FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
  authoritySlots: AUTHORITY_BLUEPRINT.map(({ slot, role }) => ({ slot, role })),
  reviewGates: REVIEW_BLUEPRINT,
  requestPlanDigest: FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
  fieldPolicyDigest: FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST,
  manifestState: "replacement_freeze_required",
});

export class FederalRegisterTier1RefreshGateError extends Error {
  constructor(code, path, detail) {
    super(
      `Federal Register Tier-1 refresh gate rejected at ${path}: ${detail}`,
    );
    this.name = "FederalRegisterTier1RefreshGateError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, detail) {
  throw new FederalRegisterTier1RefreshGateError(code, path, detail);
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function capturePlainJson(
  value,
  path = "$",
  seen = new Set(),
  depth = 0,
  budget = { nodes: 0, textBytes: 0, keyBytes: 0, arrayItems: 0 },
) {
  budget.nodes += 1;
  if (
    budget.nodes >
    FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumCaptureNodes
  ) {
    fail("INVALID_JSON", path, "input exceeds the JSON node budget");
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    budget.textBytes += Buffer.byteLength(value, "utf8");
    if (
      budget.textBytes >
      FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumTextBytes
    ) {
      fail("INVALID_JSON", path, "input exceeds the JSON text budget");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      fail("INVALID_JSON", path, "number must be a safe canonical integer");
    }
    return value;
  }
  if (
    typeof value !== "object" ||
    depth > FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumDepth
  ) {
    fail("INVALID_JSON", path, "value is not bounded plain JSON");
  }
  if (seen.has(value)) {
    fail("INVALID_JSON", path, "cyclic input is forbidden");
  }
  seen.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    const array = Array.isArray(value);
    if (
      (array && prototype !== Array.prototype) ||
      (!array && prototype !== Object.prototype && prototype !== null)
    ) {
      fail("INVALID_JSON", path, "custom prototypes are forbidden");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) {
      fail("INVALID_JSON", path, "symbol keys are forbidden");
    }
    for (const key of keys) {
      budget.keyBytes += Buffer.byteLength(key, "utf8");
      if (
        budget.keyBytes >
        FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumKeyBytes
      ) {
        fail("INVALID_JSON", path, "input exceeds the JSON key-byte budget");
      }
    }
    if (array) {
      const lengthDescriptor = descriptors.length;
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        lengthDescriptor.enumerable ||
        lengthDescriptor.configurable ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        fail("INVALID_JSON", path, "native array length descriptor required");
      }
      const length = lengthDescriptor.value;
      budget.arrayItems += length;
      if (
        length >
          FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumArrayItems ||
        budget.arrayItems >
          FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS.maximumArrayItems
      ) {
        fail("INVALID_JSON", path, "input exceeds the JSON array-item budget");
      }
      for (const key of keys) {
        if (
          key !== "length" &&
          (!/^(?:0|[1-9][0-9]*)$/.test(key) || Number(key) >= length)
        ) {
          fail("INVALID_JSON", path, "array custom properties are forbidden");
        }
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "sparse/accessor array rejected",
          );
        }
        result.push(
          capturePlainJson(
            descriptor.value,
            `${path}/${index}`,
            seen,
            depth + 1,
            budget,
          ),
        );
      }
      return result;
    }
    const result = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail(
          "INVALID_JSON",
          `${path}/${key}`,
          "hidden/accessor property rejected",
        );
      }
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: capturePlainJson(
          descriptor.value,
          `${path}/${key}`,
          seen,
          depth + 1,
          budget,
        ),
      });
    }
    return result;
  } catch (error) {
    if (error instanceof FederalRegisterTier1RefreshGateError) {
      throw error;
    }
    fail("INVALID_JSON", path, "input could not be captured deterministically");
  } finally {
    seen.delete(value);
  }
}

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value) {
  return sha256(canonical(value));
}

export const FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST = digestJson(
  FEDERAL_REGISTER_TIER1_REQUEST_POLICY,
);

function expectObject(value, path, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_INPUT", path, "plain object required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonical(actual) !== canonical(expected)) {
    fail("INVALID_INPUT", path, "object keys differ from the closed contract");
  }
  return value;
}

function expectArray(value, path, length) {
  if (
    !Array.isArray(value) ||
    (length !== undefined && value.length !== length)
  ) {
    fail("INVALID_INPUT", path, `array of length ${String(length)} required`);
  }
  return value;
}

function expectString(value, path) {
  if (typeof value !== "string") {
    fail("INVALID_INPUT", path, "string required");
  }
  return value;
}

function expectLiteral(value, expected, path) {
  if (value !== expected) {
    fail("MISMATCH", path, `expected ${JSON.stringify(expected)}`);
  }
  return expected;
}

function expectDigest(value, path) {
  if (typeof value !== "string" || !DIGEST.test(value)) {
    fail("INVALID_DIGEST", path, "lowercase SHA-256 required");
  }
  return value;
}

function expectTimestamp(value, path) {
  if (typeof value !== "string" || !TIMESTAMP.test(value)) {
    fail("INVALID_TIMESTAMP", path, "canonical second-precision UTC required");
  }
  const time = Date.parse(value);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().replace(".000Z", "Z") !== value
  ) {
    fail("INVALID_TIMESTAMP", path, "real canonical UTC instant required");
  }
  return value;
}

function expectPreciseTimestamp(value, path) {
  if (
    typeof value !== "string" ||
    !/^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/.test(
      value,
    )
  ) {
    fail(
      "INVALID_TIMESTAMP",
      path,
      "canonical millisecond-precision UTC required",
    );
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    fail("INVALID_TIMESTAMP", path, "real canonical UTC instant required");
  }
  return value;
}

function lifecycleAccessedAt(receipt) {
  const ended = Date.parse(receipt.endedAt);
  return new Date(Math.ceil(ended / 1000) * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

function expectIdentityRef(value, path) {
  const object = expectObject(value, path, ["id", "version", "digest"]);
  if (!ID.test(expectString(object.id, `${path}/id`))) {
    fail("INVALID_INPUT", `${path}/id`, "stable lowercase ID required");
  }
  if (!VERSION.test(expectString(object.version, `${path}/version`))) {
    fail("INVALID_INPUT", `${path}/version`, "semantic version required");
  }
  expectDigest(object.digest, `${path}/digest`);
  return object;
}

function before(left, right, path, detail) {
  if (Date.parse(left) >= Date.parse(right)) {
    fail("INVALID_CHRONOLOGY", path, detail);
  }
}

function atOrBefore(left, right, path, detail) {
  if (Date.parse(left) > Date.parse(right)) {
    fail("INVALID_CHRONOLOGY", path, detail);
  }
}

function exactRef(kind, id, contentDigest = ZERO_DIGEST) {
  return { kind, id, version: "1.0.0", contentDigest };
}

function scopeRef(scope) {
  return exactRef("lifecycle_scope", scope.id, scope.contentDigest);
}

function member(kind, id, scope) {
  return {
    kind,
    id,
    version: "1.0.0",
    contentDigest: ZERO_DIGEST,
    synthetic: false,
    scopeRef: scopeRef(scope),
  };
}

function validity(issuedAt) {
  return { issuedAt, expiresAt: FEDERAL_REGISTER_TIER1_GATE_EXPIRY };
}

function stripContentDigests(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripContentDigests);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "contentDigest")
      .map(([key, child]) => [key, stripContentDigests(child)]),
  );
}

const CATALOG_GROUPS = [
  "authorityReceipts",
  "evidenceReceipts",
  "reviewReceipts",
  "operationGrants",
  "qualificationReceipts",
  "admissionReceipts",
  "activationReceipts",
  "bindingReceipts",
  "artifactEligibilityReceipts",
  "coverageReceipts",
  "healthReceipts",
  "lkgReceipts",
];

function catalogKey(value) {
  return `${value.kind}:${value.id}@${value.version}`;
}

function updateCatalogReferences(value, digests, root = false) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => updateCatalogReferences(entry, digests));
    return;
  }
  if (
    !root &&
    typeof value.kind === "string" &&
    value.kind !== "lifecycle_scope" &&
    typeof value.id === "string" &&
    typeof value.version === "string" &&
    Object.hasOwn(value, "contentDigest")
  ) {
    const resolved = digests.get(catalogKey(value));
    if (resolved !== undefined) value.contentDigest = resolved;
  }
  Object.values(value).forEach((child) =>
    updateCatalogReferences(child, digests),
  );
}

function sealLifecycleBundle(bundle) {
  const members = CATALOG_GROUPS.flatMap((group) => bundle[group]);
  for (const value of members) {
    value.contentDigest = digestJson(stripContentDigests(value));
  }
  const digests = new Map(
    members.map((value) => [catalogKey(value), value.contentDigest]),
  );
  members.forEach((value) => updateCatalogReferences(value, digests, true));
  bundle.scope.authoritySetDigest = digestJson(
    bundle.authorityReceipts.map(({ contentDigest }) => contentDigest).sort(),
  );
  const scopePayload = structuredClone(bundle.scope);
  delete scopePayload.contentDigest;
  bundle.scope.contentDigest = digestJson(scopePayload);
  for (const value of members)
    value.scopeRef.contentDigest = bundle.scope.contentDigest;
  const payload = structuredClone(bundle);
  delete payload.contentDigest;
  bundle.contentDigest = digestJson(payload);
  return bundle;
}

function digestedRef(value) {
  return { id: value.id, version: value.version, digest: value.digest };
}

function controlTarget(scope, kind) {
  switch (kind) {
    case "field_allowlist":
      return structuredClone(scope.fieldPolicyRef);
    case "selected_range":
      return digestedRef(scope.selectedRange);
    case "request_budget":
    case "concurrency_limit":
    case "time_limit":
    case "byte_limit":
    case "no_automatic_retry":
    case "request_plan":
      return digestedRef(scope.requestPlan);
    case "parser_fail_closed":
      return structuredClone(scope.transformRef);
    case "drift_policy":
    case "lkg_retention":
      return structuredClone(scope.contractRef);
    case "artifact_isolation":
      return structuredClone(scope.artifactBoundaryRef);
    case "source_registry":
      return structuredClone(scope.source.sourceRegistryRef);
    case "source_registry_entry":
      return structuredClone(scope.source.sourceRegistryEntryRef);
    case "deployment_scope":
      return structuredClone(scope.deploymentRef);
    case "region_scope":
      return structuredClone(scope.regionPackRef);
    case "persona_scope":
      return structuredClone(scope.personaProjectionRef);
    case "output_scope":
      return structuredClone(scope.outputAdapterRef);
    default:
      fail("INTERNAL_CONTRACT", "/controlKind", "unknown control kind");
  }
}

function reviewId(subject, reviewKind) {
  return `federal-register-tier1-${subject.replaceAll("_", "-")}-${reviewKind.replaceAll("_", "-")}-review`;
}

function maxTimestamp(values) {
  return values.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest,
  );
}

function validateCandidateBase(candidate) {
  expectLiteral(
    candidate.contentDigest,
    FEDERAL_REGISTER_TIER1_CANDIDATE_BUNDLE_DIGEST,
    "/candidateBundle/contentDigest",
  );
  expectLiteral(
    candidate.lifecycleState,
    "evidence_blocked",
    "/candidateBundle/lifecycleState",
  );
  expectLiteral(
    candidate.authorityReceipts.length,
    1,
    "/candidateBundle/authorityReceipts",
  );
  expectLiteral(
    candidate.evidenceReceipts.length,
    11,
    "/candidateBundle/evidenceReceipts",
  );
  for (const group of CATALOG_GROUPS.slice(2)) {
    expectLiteral(candidate[group].length, 0, `/candidateBundle/${group}`);
  }
  expectLiteral(
    candidate.scope.requestPlan.digest,
    FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
    "/candidateBundle/scope/requestPlan/digest",
  );
  expectLiteral(
    candidate.scope.fieldPolicyRef.digest,
    FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST,
    "/candidateBundle/scope/fieldPolicyRef/digest",
  );
  const unknownKinds = candidate.evidenceReceipts
    .filter(({ evidenceClass }) => evidenceClass === "unknown")
    .map(({ unknownKind }) => unknownKind)
    .sort();
  if (canonical(unknownKinds) !== canonical([...UNKNOWN_KINDS].sort())) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/candidateBundle/evidenceReceipts",
      "candidate does not contain the exact nine fixed unknowns",
    );
  }
}

function parseBuildInput(value) {
  const input = capturePlainJson(value, "$buildInput");
  expectObject(input, "$buildInput", [
    "candidateBundle",
    "authorityEvidence",
    "sourceEvidence",
    "controlDocumentedAt",
    "receiptEvents",
    "reviewEvidence",
  ]);
  const authorityEvidence = expectArray(
    input.authorityEvidence,
    "/authorityEvidence",
    AUTHORITY_BLUEPRINT.length,
  );
  authorityEvidence.forEach((entry, index) => {
    const expected = AUTHORITY_BLUEPRINT[index];
    const object = expectObject(entry, `/authorityEvidence/${index}`, [
      "slot",
      "authorityIdentityRef",
      "issuedAt",
      "evidenceDigest",
    ]);
    expectLiteral(
      object.slot,
      expected.slot,
      `/authorityEvidence/${index}/slot`,
    );
    expectIdentityRef(
      object.authorityIdentityRef,
      `/authorityEvidence/${index}/authorityIdentityRef`,
    );
    expectTimestamp(object.issuedAt, `/authorityEvidence/${index}/issuedAt`);
    expectDigest(
      object.evidenceDigest,
      `/authorityEvidence/${index}/evidenceDigest`,
    );
    before(
      object.issuedAt,
      FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
      `/authorityEvidence/${index}/issuedAt`,
      "authority must begin before the closed expiry",
    );
  });
  const sourceEvidence = expectArray(
    input.sourceEvidence,
    "/sourceEvidence",
    SOURCE_EVIDENCE_BLUEPRINT.length,
  );
  sourceEvidence.forEach((entry, index) => {
    const expected = SOURCE_EVIDENCE_BLUEPRINT[index];
    const object = expectObject(entry, `/sourceEvidence/${index}`, [
      "slot",
      "id",
      "predecessorEvidenceId",
      "url",
      "startedAt",
      "endedAt",
      "method",
      "statusCategory",
      "mediaCategory",
      "byteCount",
      "chunkCount",
      "attemptCount",
      "redirectCount",
      "retryCount",
      "rawBytesRetained",
      "responseDigest",
    ]);
    expectLiteral(object.slot, expected.slot, `/sourceEvidence/${index}/slot`);
    expectLiteral(
      object.predecessorEvidenceId,
      expected.predecessorEvidenceId,
      `/sourceEvidence/${index}/predecessorEvidenceId`,
    );
    expectLiteral(object.id, expected.id, `/sourceEvidence/${index}/id`);
    expectLiteral(object.url, expected.url, `/sourceEvidence/${index}/url`);
    expectLiteral(
      expectPreciseTimestamp(
        object.startedAt,
        `/sourceEvidence/${index}/startedAt`,
      ),
      expected.startedAt,
      `/sourceEvidence/${index}/startedAt`,
    );
    expectLiteral(
      expectPreciseTimestamp(
        object.endedAt,
        `/sourceEvidence/${index}/endedAt`,
      ),
      expected.endedAt,
      `/sourceEvidence/${index}/endedAt`,
    );
    before(
      object.startedAt,
      object.endedAt,
      `/sourceEvidence/${index}`,
      "observation end must strictly follow its start",
    );
    for (const [key, literal] of [
      ["method", "GET"],
      ["statusCategory", "2xx"],
      ["mediaCategory", expected.mediaCategory],
      ["byteCount", expected.byteCount],
      ["chunkCount", expected.chunkCount],
      ["attemptCount", 1],
      ["redirectCount", 0],
      ["retryCount", 0],
      ["rawBytesRetained", 0],
    ]) {
      expectLiteral(object[key], literal, `/sourceEvidence/${index}/${key}`);
    }
    expectLiteral(
      expectDigest(
        object.responseDigest,
        `/sourceEvidence/${index}/responseDigest`,
      ),
      expected.responseDigest,
      `/sourceEvidence/${index}/responseDigest`,
    );
    before(
      lifecycleAccessedAt(object),
      FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
      `/sourceEvidence/${index}/endedAt`,
      "evidence must precede expiry",
    );
  });
  if (
    new Set(sourceEvidence.map(({ id }) => id)).size !== sourceEvidence.length
  ) {
    fail(
      "INVALID_EVIDENCE_ID",
      "/sourceEvidence",
      "replacement evidence IDs must be unique",
    );
  }
  expectTimestamp(input.controlDocumentedAt, "/controlDocumentedAt");
  const events = expectObject(input.receiptEvents, "/receiptEvents", [
    "qualificationIssuedAt",
    "acquisitionGrantIssuedAt",
    "admissionIssuedAt",
    "activationIssuedAt",
    "bindingIssuedAt",
    "lifecycleAsOf",
  ]);
  Object.entries(events).forEach(([key, timestamp]) =>
    expectTimestamp(timestamp, `/receiptEvents/${key}`),
  );
  const reviews = expectArray(
    input.reviewEvidence,
    "/reviewEvidence",
    REVIEW_BLUEPRINT.length,
  );
  reviews.forEach((entry, index) => {
    const expected = REVIEW_BLUEPRINT[index];
    const object = expectObject(entry, `/reviewEvidence/${index}`, [
      "subject",
      "reviewKind",
      "reviewerSlot",
      "reviewedAt",
      "issuedAt",
      "evidenceDigest",
    ]);
    expectLiteral(
      object.subject,
      expected.subject,
      `/reviewEvidence/${index}/subject`,
    );
    expectLiteral(
      object.reviewKind,
      expected.reviewKind,
      `/reviewEvidence/${index}/reviewKind`,
    );
    expectLiteral(
      object.reviewerSlot,
      expected.reviewerSlot,
      `/reviewEvidence/${index}/reviewerSlot`,
    );
    expectTimestamp(object.reviewedAt, `/reviewEvidence/${index}/reviewedAt`);
    expectTimestamp(object.issuedAt, `/reviewEvidence/${index}/issuedAt`);
    expectDigest(
      object.evidenceDigest,
      `/reviewEvidence/${index}/evidenceDigest`,
    );
    atOrBefore(
      object.reviewedAt,
      object.issuedAt,
      `/reviewEvidence/${index}`,
      "review receipt cannot be issued before the review occurred",
    );
    before(
      object.issuedAt,
      FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
      `/reviewEvidence/${index}/issuedAt`,
      "review must precede expiry",
    );
  });
  return input;
}

function stageReviews(reviewEvidence, subject) {
  return reviewEvidence.filter((entry) => entry.subject === subject);
}

function validateBuildChronology(input) {
  const authorityBySlot = new Map(
    input.authorityEvidence.map((entry) => [entry.slot, entry]),
  );
  const sourceBySlot = new Map(
    input.sourceEvidence.map((entry) => [entry.slot, entry]),
  );
  for (const fact of PROVIDER_FACT_BLUEPRINT) {
    const authority = authorityBySlot.get(fact.authoritySlot);
    for (const supportSlot of fact.support) {
      const evidence = sourceBySlot.get(supportSlot);
      before(
        authority.issuedAt,
        evidence.startedAt,
        `/sourceEvidence/${supportSlot}/startedAt`,
        "provider authority must be issued before, not after or at, the supporting access",
      );
    }
  }
  const events = input.receiptEvents;
  const evidenceLatest = maxTimestamp([
    input.controlDocumentedAt,
    ...input.sourceEvidence.map(lifecycleAccessedAt),
  ]);
  before(
    evidenceLatest,
    events.qualificationIssuedAt,
    "/receiptEvents/qualificationIssuedAt",
    "qualification must follow all provider evidence and authored controls",
  );

  const subjectIssuedAt = {
    qualification: events.qualificationIssuedAt,
    acquisition_grant: events.acquisitionGrantIssuedAt,
    admission: events.admissionIssuedAt,
    activation: events.activationIssuedAt,
    binding: events.bindingIssuedAt,
  };
  for (const [index, review] of input.reviewEvidence.entries()) {
    before(
      subjectIssuedAt[review.subject],
      review.reviewedAt,
      `/reviewEvidence/${index}/reviewedAt`,
      "review must strictly follow its subject issuance",
    );
    const authority = authorityBySlot.get(review.reviewerSlot);
    before(
      authority.issuedAt,
      review.reviewedAt,
      `/reviewEvidence/${index}/reviewedAt`,
      "reviewer authority must exist before review",
    );
  }
  const effective = (subject) =>
    maxTimestamp(
      stageReviews(input.reviewEvidence, subject).map(
        ({ issuedAt }) => issuedAt,
      ),
    );
  before(
    effective("qualification"),
    events.acquisitionGrantIssuedAt,
    "/receiptEvents/acquisitionGrantIssuedAt",
    "acquisition grant must follow qualification review closure",
  );
  before(
    effective("acquisition_grant"),
    events.admissionIssuedAt,
    "/receiptEvents/admissionIssuedAt",
    "admission must follow grant review closure",
  );
  before(
    FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
    events.admissionIssuedAt,
    "/receiptEvents/admissionIssuedAt",
    "admission must follow both owner residual decisions",
  );
  before(
    effective("admission"),
    events.activationIssuedAt,
    "/receiptEvents/activationIssuedAt",
    "activation must follow admission review closure",
  );
  before(
    effective("activation"),
    events.bindingIssuedAt,
    "/receiptEvents/bindingIssuedAt",
    "binding must follow activation review closure",
  );
  before(
    effective("binding"),
    events.lifecycleAsOf,
    "/receiptEvents/lifecycleAsOf",
    "declared bound state must follow binding review closure",
  );
  before(
    events.lifecycleAsOf,
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
    "/receiptEvents/lifecycleAsOf",
    "bound lifecycle must still be current before expiry",
  );
}

function parseProspectiveAuthorityInput(value) {
  const input = capturePlainJson(value, "$prospectiveAuthorityInput");
  expectObject(input, "$prospectiveAuthorityInput", [
    "candidateBundle",
    "authorityEvidence",
    "lifecycleAsOf",
  ]);
  expectArray(
    input.authorityEvidence,
    "/authorityEvidence",
    AUTHORITY_BLUEPRINT.length,
  ).forEach((entry, index) => {
    const expected = AUTHORITY_BLUEPRINT[index];
    const object = expectObject(entry, `/authorityEvidence/${index}`, [
      "slot",
      "authorityIdentityRef",
      "issuedAt",
      "evidenceDigest",
    ]);
    expectLiteral(
      object.slot,
      expected.slot,
      `/authorityEvidence/${index}/slot`,
    );
    expectIdentityRef(
      object.authorityIdentityRef,
      `/authorityEvidence/${index}/authorityIdentityRef`,
    );
    expectTimestamp(object.issuedAt, `/authorityEvidence/${index}/issuedAt`);
    expectDigest(
      object.evidenceDigest,
      `/authorityEvidence/${index}/evidenceDigest`,
    );
    before(
      object.issuedAt,
      FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
      `/authorityEvidence/${index}/issuedAt`,
      "prospective authority must begin before the fixed expiry",
    );
  });
  expectTimestamp(input.lifecycleAsOf, "/lifecycleAsOf");
  for (const [index, authority] of input.authorityEvidence.entries()) {
    atOrBefore(
      authority.issuedAt,
      input.lifecycleAsOf,
      `/authorityEvidence/${index}/issuedAt`,
      "prospective authority is not yet effective at lifecycleAsOf",
    );
  }
  before(
    input.lifecycleAsOf,
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
    "/lifecycleAsOf",
    "prospective authority graph must be current before expiry",
  );
  return input;
}

/**
 * Seals the seven-authority evidence-blocked graph before any replacement
 * D1/R1/R2 observation. It intentionally adds no provider fact, review, grant,
 * or positive lifecycle receipt and therefore cannot authorize acquisition.
 */
export function buildFederalRegisterTier1ProspectiveAuthorityGraph(value) {
  const input = parseProspectiveAuthorityInput(value);
  const candidate = parseRealSourceLifecycleBundle(input.candidateBundle);
  validateCandidateBase(candidate);
  const bundle = JSON.parse(serializeRealSourceLifecycleBundle(candidate));
  bundle.lifecycleAsOf = input.lifecycleAsOf;
  for (const [index, blueprint] of AUTHORITY_BLUEPRINT.entries()) {
    const evidence = input.authorityEvidence[index];
    bundle.authorityReceipts.push({
      ...member("authority_receipt", blueprint.id, bundle.scope),
      ...validity(evidence.issuedAt),
      authorityRole: blueprint.role,
      authorityIdentityRef: structuredClone(evidence.authorityIdentityRef),
      state: "accepted",
      supersededBy: null,
    });
  }
  sealLifecycleBundle(bundle);
  const parsed = parseRealSourceLifecycleBundle(bundle);
  expectLiteral(
    parsed.lifecycleState,
    "evidence_blocked",
    "/lifecycleBundle/lifecycleState",
  );
  expectLiteral(
    parsed.authorityReceipts.length,
    7,
    "/lifecycleBundle/authorityReceipts",
  );
  expectLiteral(
    parsed.evidenceReceipts.filter(
      ({ evidenceClass }) => evidenceClass === "provider_fact",
    ).length,
    0,
    "/lifecycleBundle/evidenceReceipts",
  );
  for (const group of CATALOG_GROUPS.slice(2)) {
    expectLiteral(parsed[group].length, 0, `/lifecycleBundle/${group}`);
  }
  const authorityEvidenceBindings = input.authorityEvidence.map(
    (entry, index) => {
      const receipt = parsed.authorityReceipts.find(
        ({ id }) => id === AUTHORITY_BLUEPRINT[index].id,
      );
      return {
        slot: entry.slot,
        authorityReceiptRef: exactRef(
          "authority_receipt",
          receipt.id,
          receipt.contentDigest,
        ),
        evidenceDigest: entry.evidenceDigest,
      };
    },
  );
  return deepFreeze({
    state: "prospective_authority_evidence_blocked",
    acquisitionAuthorized: false,
    lifecycleBundle: parsed,
    authorityEvidenceBindings,
  });
}

function authorityRefBySlot(bundle, slot) {
  const blueprint = AUTHORITY_BLUEPRINT.find((entry) => entry.slot === slot);
  if (blueprint === undefined) {
    fail("INTERNAL_CONTRACT", "/authorityReceipts", "unknown authority slot");
  }
  const receipt = bundle.authorityReceipts.find(
    ({ id }) => id === blueprint.id,
  );
  if (receipt === undefined) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/authorityReceipts",
      `missing exact authority receipt ${blueprint.id}`,
    );
  }
  return exactRef("authority_receipt", receipt.id, receipt.contentDigest);
}

function providerStatementDigest(fact, sourceBySlot, scope) {
  return digestJson({
    claimCode: fact.claimCode,
    factKind: fact.factKind,
    fieldPolicyRef: scope.fieldPolicyRef,
    requestPlanDigest: scope.requestPlan.digest,
    support: fact.support.map((slot) => sourceBySlot.get(slot)),
  });
}

/**
 * Builds the deterministic lifecycle graph only from explicit, already-issued
 * authority/review evidence. It performs no I/O and cannot authorize FR-A1 by
 * itself; three later whole-graph approvals remain mandatory.
 */
export function buildFederalRegisterTier1PreAcquisitionGraph(value) {
  const input = parseBuildInput(value);
  const candidate = parseRealSourceLifecycleBundle(input.candidateBundle);
  validateCandidateBase(candidate);
  validateBuildChronology(input);
  const bundle = JSON.parse(serializeRealSourceLifecycleBundle(candidate));
  bundle.lifecycleState = "bound";
  bundle.lifecycleAsOf = input.receiptEvents.lifecycleAsOf;

  for (const [index, blueprint] of AUTHORITY_BLUEPRINT.entries()) {
    const evidence = input.authorityEvidence[index];
    bundle.authorityReceipts.push({
      ...member("authority_receipt", blueprint.id, bundle.scope),
      ...validity(evidence.issuedAt),
      authorityRole: blueprint.role,
      authorityIdentityRef: structuredClone(evidence.authorityIdentityRef),
      state: "accepted",
      supersededBy: null,
    });
  }

  const authorityBySlot = new Map(
    AUTHORITY_BLUEPRINT.map((blueprint) => [
      blueprint.slot,
      bundle.authorityReceipts.find(({ id }) => id === blueprint.id),
    ]),
  );
  const sourceBySlot = new Map(
    input.sourceEvidence.map((entry) => [entry.slot, entry]),
  );
  const providerFacts = PROVIDER_FACT_BLUEPRINT.map((fact) => ({
    ...member("evidence_receipt", fact.id, bundle.scope),
    evidenceClass: "provider_fact",
    factKind: fact.factKind,
    authorityReceiptRef: exactRef(
      "authority_receipt",
      authorityBySlot.get(fact.authoritySlot).id,
    ),
    accessState: fact.accessState,
    restrictionState: "not_applicable",
    evidenceUrl: fact.evidenceUrl,
    accessedAt: maxTimestamp(
      fact.support.map((slot) => lifecycleAccessedAt(sourceBySlot.get(slot))),
    ),
    statementDigest: providerStatementDigest(fact, sourceBySlot, bundle.scope),
  }));
  bundle.evidenceReceipts.push(...providerFacts);

  const existingControl = bundle.evidenceReceipts.find(
    ({ evidenceClass, controlKind }) =>
      evidenceClass === "project_control" &&
      controlKind === "artifact_isolation",
  );
  for (const kind of CONTROL_KINDS) {
    if (kind === "artifact_isolation") continue;
    bundle.evidenceReceipts.push({
      ...member(
        "evidence_receipt",
        `federal-register-${kind.replaceAll("_", "-")}-control`,
        bundle.scope,
      ),
      evidenceClass: "project_control",
      controlKind: kind,
      controlRef: controlTarget(bundle.scope, kind),
      enforcementState: "fail_closed",
      documentedAt: input.controlDocumentedAt,
    });
  }

  const owner = bundle.authorityReceipts[0];
  const residuals = [
    [
      "federal-register-api-terms-residual-decision",
      "federal-register-api-terms-unknown",
    ],
    [
      "federal-register-api-privacy-residual-decision",
      "federal-register-api-privacy-unknown",
    ],
  ].map(([id, unknownId]) => ({
    ...member("evidence_receipt", id, bundle.scope),
    ...validity(FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT),
    evidenceClass: "residual_risk_decision",
    riskKind: "api_terms_or_privacy_not_located",
    ownerAuthorityRef: exactRef("authority_receipt", owner.id),
    unknownEvidenceRefs: [exactRef("evidence_receipt", unknownId)],
    acceptedAt: FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
    riskScope: {
      hosts: ["www.federalregister.gov"],
      methods: ["GET"],
      fieldPolicyRef: structuredClone(bundle.scope.fieldPolicyRef),
      outputBoundary: "ignored_local_prerelease_only",
    },
    conditions: [...RESIDUAL_CONDITIONS],
    state: "accepted",
    supersededBy: null,
  }));
  bundle.evidenceReceipts.push(...residuals);

  const qualification = {
    ...member("qualification_receipt", SUBJECTS.qualification.id, bundle.scope),
    ...validity(input.receiptEvents.qualificationIssuedAt),
    providerFactEvidenceRefs: providerFacts.map(({ id }) =>
      exactRef("evidence_receipt", id),
    ),
    projectControlEvidenceRefs: [
      exactRef("evidence_receipt", existingControl.id),
      ...CONTROL_KINDS.filter((kind) => kind !== "artifact_isolation").map(
        (kind) =>
          exactRef(
            "evidence_receipt",
            `federal-register-${kind.replaceAll("_", "-")}-control`,
          ),
      ),
    ],
    unknownEvidenceRefs: bundle.evidenceReceipts
      .filter(({ evidenceClass }) => evidenceClass === "unknown")
      .map(({ id }) => exactRef("evidence_receipt", id)),
    issuedByAuthorityRef: exactRef("authority_receipt", owner.id),
    reviewReceiptRefs: [],
    state: "qualified",
    supersededBy: null,
  };
  bundle.qualificationReceipts.push(qualification);

  const grant = {
    ...member("operation_grant", SUBJECTS.acquisition_grant.id, bundle.scope),
    ...validity(input.receiptEvents.acquisitionGrantIssuedAt),
    operation: "acquisition",
    requestPlanRef: digestedRef(bundle.scope.requestPlan),
    ownerAuthorityRef: exactRef("authority_receipt", owner.id),
    reviewReceiptRefs: [],
    state: "granted",
    supersededBy: null,
  };
  bundle.operationGrants.push(grant);

  const admission = {
    ...member("admission_receipt", SUBJECTS.admission.id, bundle.scope),
    ...validity(input.receiptEvents.admissionIssuedAt),
    qualificationReceiptRef: exactRef(
      "qualification_receipt",
      qualification.id,
    ),
    ownerAuthorityRef: exactRef("authority_receipt", owner.id),
    reviewReceiptRefs: [],
    residualRiskEvidenceRefs: residuals.map(({ id }) =>
      exactRef("evidence_receipt", id),
    ),
    state: "admitted",
    supersededBy: null,
  };
  bundle.admissionReceipts.push(admission);

  const activation = {
    ...member("activation_receipt", SUBJECTS.activation.id, bundle.scope),
    ...validity(input.receiptEvents.activationIssuedAt),
    admissionReceiptRef: exactRef("admission_receipt", admission.id),
    ownerAuthorityRef: exactRef("authority_receipt", owner.id),
    operationGrantRefs: [exactRef("operation_grant", grant.id)],
    reviewReceiptRefs: [],
    state: "active",
    supersededBy: null,
  };
  bundle.activationReceipts.push(activation);

  const binding = {
    ...member("binding_receipt", SUBJECTS.binding.id, bundle.scope),
    ...validity(input.receiptEvents.bindingIssuedAt),
    activationReceiptRef: exactRef("activation_receipt", activation.id),
    ownerAuthorityRef: exactRef("authority_receipt", owner.id),
    reviewReceiptRefs: [],
    state: "bound",
    supersededBy: null,
  };
  bundle.bindingReceipts.push(binding);

  const subjectMembers = {
    qualification,
    acquisition_grant: grant,
    admission,
    activation,
    binding,
  };
  for (const [index, blueprint] of REVIEW_BLUEPRINT.entries()) {
    const supplied = input.reviewEvidence[index];
    const subject = subjectMembers[blueprint.subject];
    const authority = authorityBySlot.get(blueprint.reviewerSlot);
    const review = {
      ...member(
        "review_receipt",
        reviewId(blueprint.subject, blueprint.reviewKind),
        bundle.scope,
      ),
      ...validity(supplied.issuedAt),
      reviewKind: blueprint.reviewKind,
      subject: {
        kind: subject.kind,
        ref: exactRef(subject.kind, subject.id),
      },
      reviewerAuthorityRef: exactRef("authority_receipt", authority.id),
      ownerAuthorityRef: exactRef("authority_receipt", owner.id),
      reviewedAt: supplied.reviewedAt,
      state: "accepted",
      supersededBy: null,
    };
    bundle.reviewReceipts.push(review);
    subject.reviewReceiptRefs.push(exactRef("review_receipt", review.id));
  }

  sealLifecycleBundle(bundle);
  const parsed = parseRealSourceLifecycleBundle(bundle);
  validateBoundBlueprint(parsed);
  const authorityEvidenceBindings = input.authorityEvidence.map(
    (entry, index) => {
      const receipt = parsed.authorityReceipts.find(
        ({ id }) => id === AUTHORITY_BLUEPRINT[index].id,
      );
      return {
        slot: entry.slot,
        authorityReceiptRef: exactRef(
          "authority_receipt",
          receipt.id,
          receipt.contentDigest,
        ),
        evidenceDigest: entry.evidenceDigest,
      };
    },
  );
  const reviewEvidenceBindings = input.reviewEvidence.map((entry, index) => {
    const blueprint = REVIEW_BLUEPRINT[index];
    const review = parsed.reviewReceipts.find(
      ({ id }) => id === reviewId(blueprint.subject, blueprint.reviewKind),
    );
    return {
      reviewReceiptRef: exactRef(
        "review_receipt",
        review.id,
        review.contentDigest,
      ),
      evidenceDigest: entry.evidenceDigest,
    };
  });
  return deepFreeze({
    lifecycleBundle: parsed,
    sourceEvidence: input.sourceEvidence,
    authorityEvidenceBindings,
    reviewEvidenceBindings,
  });
}

function validateBoundBlueprint(bundle) {
  const counts = {
    authorityReceipts: 7,
    reviewReceipts: 14,
    operationGrants: 1,
    qualificationReceipts: 1,
    admissionReceipts: 1,
    activationReceipts: 1,
    bindingReceipts: 1,
    artifactEligibilityReceipts: 0,
    coverageReceipts: 0,
    healthReceipts: 0,
    lkgReceipts: 0,
  };
  for (const [group, expected] of Object.entries(counts)) {
    expectLiteral(bundle[group].length, expected, `/lifecycleBundle/${group}`);
  }
  expectLiteral(
    bundle.lifecycleState,
    "bound",
    "/lifecycleBundle/lifecycleState",
  );
  expectLiteral(
    bundle.publication.state,
    "closed",
    "/lifecycleBundle/publication/state",
  );
  expectLiteral(
    bundle.publication.authorityReceiptRefs.length,
    0,
    "/lifecycleBundle/publication/authorityReceiptRefs",
  );
  const expectedAuthorities = [
    {
      id: "owner-local-prerelease-authority",
      authorityRole: "owner_configuration_authority",
    },
    ...AUTHORITY_BLUEPRINT.map(({ id, role: authorityRole }) => ({
      id,
      authorityRole,
    })),
  ];
  const actualAuthorities = bundle.authorityReceipts.map(
    ({ id, authorityRole }) => ({ id, authorityRole }),
  );
  if (canonical(actualAuthorities) !== canonical(expectedAuthorities)) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/authorityReceipts",
      "authority IDs, order, and roles differ from the exact seven-authority blueprint",
    );
  }
  const evidenceCounts = new Map();
  for (const receipt of bundle.evidenceReceipts) {
    evidenceCounts.set(
      receipt.evidenceClass,
      (evidenceCounts.get(receipt.evidenceClass) ?? 0) + 1,
    );
  }
  for (const [evidenceClass, expected] of [
    ["provider_fact", 6],
    ["dated_observation", 1],
    ["project_control", 18],
    ["unknown", 9],
    ["residual_risk_decision", 2],
  ]) {
    expectLiteral(
      evidenceCounts.get(evidenceClass) ?? 0,
      expected,
      `/lifecycleBundle/evidenceReceipts/${evidenceClass}`,
    );
  }
  const observation = bundle.evidenceReceipts.find(
    ({ evidenceClass }) => evidenceClass === "dated_observation",
  );
  expectLiteral(
    observation.operation,
    "acquisition",
    "/lifecycleBundle/evidenceReceipts/observation/operation",
  );
  expectLiteral(
    observation.resultState,
    "not_observed",
    "/lifecycleBundle/evidenceReceipts/observation/resultState",
  );
  const controls = bundle.evidenceReceipts.filter(
    ({ evidenceClass }) => evidenceClass === "project_control",
  );
  const expectedControls = CONTROL_KINDS.map((controlKind) => ({
    id:
      controlKind === "artifact_isolation"
        ? "federal-register-artifact-isolation-control"
        : `federal-register-${controlKind.replaceAll("_", "-")}-control`,
    controlKind,
  }));
  if (
    controls.some(
      ({ enforcementState }) => enforcementState !== "fail_closed",
    ) ||
    canonical(
      controls
        .map(({ id, controlKind }) => ({ id, controlKind }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ) !==
      canonical(
        expectedControls.sort((left, right) => left.id.localeCompare(right.id)),
      )
  ) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/evidenceReceipts",
      "all and only the 18 fail-closed controls are required",
    );
  }
  const facts = bundle.evidenceReceipts.filter(
    ({ evidenceClass }) => evidenceClass === "provider_fact",
  );
  const expectedFacts = PROVIDER_FACT_BLUEPRINT.map((fact) => ({
    id: fact.id,
    factKind: fact.factKind,
    authorityReceiptId: AUTHORITY_BLUEPRINT.find(
      ({ slot }) => slot === fact.authoritySlot,
    ).id,
  }));
  const actualFacts = facts.map(
    ({ id, factKind, authorityReceiptRef: { id: authorityReceiptId } }) => ({
      id,
      factKind,
      authorityReceiptId,
    }),
  );
  if (
    canonical(
      actualFacts.sort((left, right) => left.id.localeCompare(right.id)),
    ) !==
    canonical(
      expectedFacts.sort((left, right) => left.id.localeCompare(right.id)),
    )
  ) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/evidenceReceipts",
      "provider facts differ from the exact six-fact ceiling",
    );
  }
  const unknowns = bundle.evidenceReceipts.filter(
    ({ evidenceClass }) => evidenceClass === "unknown",
  );
  const expectedUnknowns = UNKNOWN_KINDS.map((unknownKind) => ({
    id: `federal-register-${unknownKind
      .replace("api_specific_", "api_")
      .replaceAll("_", "-")}-unknown`,
    unknownKind,
  }));
  if (
    canonical(
      unknowns
        .map(({ id, unknownKind }) => ({ id, unknownKind }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ) !==
    canonical(
      expectedUnknowns.sort((left, right) => left.id.localeCompare(right.id)),
    )
  ) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/evidenceReceipts",
      "unknown inventory differs from the fixed checklist",
    );
  }
  const grant = bundle.operationGrants[0];
  expectLiteral(
    grant.id,
    SUBJECTS.acquisition_grant.id,
    "/lifecycleBundle/operationGrants/0/id",
  );
  expectLiteral(
    grant.operation,
    "acquisition",
    "/lifecycleBundle/operationGrants/0/operation",
  );
  expectLiteral(
    grant.requestPlanRef.digest,
    FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
    "/lifecycleBundle/operationGrants/0/requestPlanRef/digest",
  );
  for (const [group, subject] of [
    ["qualificationReceipts", SUBJECTS.qualification],
    ["admissionReceipts", SUBJECTS.admission],
    ["activationReceipts", SUBJECTS.activation],
    ["bindingReceipts", SUBJECTS.binding],
  ]) {
    expectLiteral(
      bundle[group][0].id,
      subject.id,
      `/lifecycleBundle/${group}/0/id`,
    );
  }
  const expectedResidualIds = [
    "federal-register-api-privacy-residual-decision",
    "federal-register-api-terms-residual-decision",
  ];
  const actualResidualIds = bundle.evidenceReceipts
    .filter(({ evidenceClass }) => evidenceClass === "residual_risk_decision")
    .map(({ id }) => id)
    .sort();
  if (canonical(actualResidualIds) !== canonical(expectedResidualIds.sort())) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/evidenceReceipts",
      "residual decisions differ from the exact two owner exceptions",
    );
  }
  const expectedReviews = REVIEW_BLUEPRINT.map((entry) => ({
    id: reviewId(entry.subject, entry.reviewKind),
    reviewKind: entry.reviewKind,
    subjectId: SUBJECTS[entry.subject].id,
    reviewerAuthorityId: AUTHORITY_BLUEPRINT.find(
      ({ slot }) => slot === entry.reviewerSlot,
    ).id,
  }));
  const actualReviews = bundle.reviewReceipts.map((review) => ({
    id: review.id,
    reviewKind: review.reviewKind,
    subjectId: review.subject.ref.id,
    reviewerAuthorityId: review.reviewerAuthorityRef.id,
  }));
  if (canonical(actualReviews) !== canonical(expectedReviews)) {
    fail(
      "BLUEPRINT_MISMATCH",
      "/lifecycleBundle/reviewReceipts",
      "review IDs, subjects, kinds, or reviewer authorities differ from the exact 14-review blueprint",
    );
  }
}

function validateManifest(manifest, path) {
  const object = expectObject(manifest, path, [
    "id",
    "version",
    "byteLength",
    "sha256",
  ]);
  expectLiteral(
    object.id,
    "federal-register-tier1-companion-manifest",
    `${path}/id`,
  );
  expectLiteral(object.version, "1.0.0", `${path}/version`);
  if (!Number.isSafeInteger(object.byteLength) || object.byteLength <= 0) {
    fail(
      "INVALID_INPUT",
      `${path}/byteLength`,
      "positive manifest byte length required",
    );
  }
  expectDigest(object.sha256, `${path}/sha256`);
  if (object.sha256 === FEDERAL_REGISTER_TIER1_REJECTED_MANIFEST_DIGEST) {
    fail(
      "REJECTED_MANIFEST",
      `${path}/sha256`,
      "the superseded 3a85bf byte freeze is not approvable",
    );
  }
  return object;
}

function validateRequestBinding(request, bundle, path) {
  const object = expectObject(request, path, ["url", "policy", "policyDigest"]);
  expectLiteral(object.url, FEDERAL_REGISTER_TIER1_REQUEST_URL, `${path}/url`);
  if (
    canonical(object.policy) !==
    canonical(FEDERAL_REGISTER_TIER1_REQUEST_POLICY)
  ) {
    fail(
      "REQUEST_POLICY_MISMATCH",
      `${path}/policy`,
      "request policy differs from the frozen transport export",
    );
  }
  expectLiteral(
    object.policyDigest,
    FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST,
    `${path}/policyDigest`,
  );
  const plan = bundle.scope.requestPlan;
  const policy = object.policy;
  for (const [left, right, child] of [
    [plan.method, policy.method, "method"],
    [plan.host, policy.host, "host"],
    [plan.path, policy.path, "path"],
    [plan.ceilings.requestCount, policy.maximumAttempts, "requestCount"],
    [plan.ceilings.pageCount, policy.maximumPages, "pageCount"],
    [plan.ceilings.itemCount, policy.maximumItems, "itemCount"],
    [plan.ceilings.timeoutMs, policy.timeoutMilliseconds, "timeoutMs"],
    [plan.ceilings.responseBytes, policy.maximumBytes, "responseBytes"],
  ]) {
    if (left !== right)
      fail(
        "REQUEST_POLICY_MISMATCH",
        `${path}/${child}`,
        "lifecycle request plan and transport policy disagree",
      );
  }
}

function parseApproval(value, index, graph, manifest) {
  const path = `/approvals/${index}`;
  const expected = APPROVAL_BLUEPRINT[index];
  const object = expectObject(value, path, [
    "role",
    "reviewerSlot",
    "reviewerAuthorityRef",
    "reviewedAt",
    "issuedAt",
    "expiresAt",
    "evidenceDigest",
    "decision",
    "manifestDigest",
    "lifecycleBundleContentDigest",
    "lifecycleScopeContentDigest",
    "requestPlanDigest",
    "fieldPolicyDigest",
    "requestPolicyDigest",
  ]);
  expectLiteral(object.role, expected.role, `${path}/role`);
  expectLiteral(
    object.reviewerSlot,
    expected.authoritySlot,
    `${path}/reviewerSlot`,
  );
  expectLiteral(object.decision, "approved", `${path}/decision`);
  expectTimestamp(object.reviewedAt, `${path}/reviewedAt`);
  expectTimestamp(object.issuedAt, `${path}/issuedAt`);
  expectLiteral(
    object.expiresAt,
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
    `${path}/expiresAt`,
  );
  atOrBefore(
    object.reviewedAt,
    object.issuedAt,
    path,
    "approval cannot be issued before its review",
  );
  before(
    graph.lifecycleBundle.lifecycleAsOf,
    object.reviewedAt,
    `${path}/reviewedAt`,
    "whole-graph approval must follow the finalized declared graph state",
  );
  before(
    object.issuedAt,
    object.expiresAt,
    `${path}/issuedAt`,
    "approval must be current before the fixed expiry",
  );
  expectDigest(object.evidenceDigest, `${path}/evidenceDigest`);
  const expectedAuthorityRef = authorityRefBySlot(
    graph.lifecycleBundle,
    expected.authoritySlot,
  );
  if (
    canonical(object.reviewerAuthorityRef) !== canonical(expectedAuthorityRef)
  ) {
    fail(
      "REVIEWER_ROLE_MISMATCH",
      `${path}/reviewerAuthorityRef`,
      "approval does not resolve to the exact independent reviewer authority",
    );
  }
  for (const [key, expectedDigest] of [
    ["manifestDigest", manifest.sha256],
    ["lifecycleBundleContentDigest", graph.lifecycleBundle.contentDigest],
    ["lifecycleScopeContentDigest", graph.lifecycleBundle.scope.contentDigest],
    ["requestPlanDigest", FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST],
    ["fieldPolicyDigest", FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST],
    ["requestPolicyDigest", FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST],
  ]) {
    expectLiteral(object[key], expectedDigest, `${path}/${key}`);
  }
  return object;
}

export function assembleFederalRegisterTier1PreAcquisitionGate(
  graphValue,
  companionValue,
) {
  const graph = capturePlainJson(graphValue, "$graph");
  expectObject(graph, "$graph", [
    "lifecycleBundle",
    "sourceEvidence",
    "authorityEvidenceBindings",
    "reviewEvidenceBindings",
  ]);
  const lifecycleBundle = parseRealSourceLifecycleBundle(graph.lifecycleBundle);
  validateBoundBlueprint(lifecycleBundle);
  const parsedGraph = { ...graph, lifecycleBundle };
  const companion = capturePlainJson(companionValue, "$companion");
  expectObject(companion, "$companion", ["manifest", "approvals"]);
  const manifest = validateManifest(companion.manifest, "/manifest");
  const approvals = expectArray(companion.approvals, "/approvals", 3).map(
    (approval, index) => parseApproval(approval, index, parsedGraph, manifest),
  );
  const gate = {
    schemaVersion: "1.0.0",
    id: "federal-register-tier1-pre-acquisition-gate",
    version: "1.0.0",
    contentDigest: ZERO_DIGEST,
    state: "bound_pre_acquisition",
    expectedLifecycleBundleContentDigest: lifecycleBundle.contentDigest,
    expectedLifecycleScopeContentDigest: lifecycleBundle.scope.contentDigest,
    lifecycleBundle,
    sourceEvidence: graph.sourceEvidence,
    authorityEvidenceBindings: graph.authorityEvidenceBindings,
    reviewEvidenceBindings: graph.reviewEvidenceBindings,
    companionManifest: manifest,
    request: {
      url: FEDERAL_REGISTER_TIER1_REQUEST_URL,
      policy: structuredClone(FEDERAL_REGISTER_TIER1_REQUEST_POLICY),
      policyDigest: FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST,
    },
    approvals,
    publication: "closed",
  };
  const payload = structuredClone(gate);
  delete payload.contentDigest;
  gate.contentDigest = digestJson(payload);
  return parseGate(gate);
}

function validateExactBindings(gate) {
  expectArray(
    gate.sourceEvidence,
    "/sourceEvidence",
    SOURCE_EVIDENCE_BLUEPRINT.length,
  ).forEach((entry, index) => {
    const expected = SOURCE_EVIDENCE_BLUEPRINT[index];
    expectObject(entry, `/sourceEvidence/${index}`, [
      "slot",
      "id",
      "predecessorEvidenceId",
      "url",
      "startedAt",
      "endedAt",
      "method",
      "statusCategory",
      "mediaCategory",
      "byteCount",
      "chunkCount",
      "attemptCount",
      "redirectCount",
      "retryCount",
      "rawBytesRetained",
      "responseDigest",
    ]);
    expectLiteral(entry.slot, expected.slot, `/sourceEvidence/${index}/slot`);
    expectLiteral(
      entry.predecessorEvidenceId,
      expected.predecessorEvidenceId,
      `/sourceEvidence/${index}/predecessorEvidenceId`,
    );
    expectLiteral(entry.id, expected.id, `/sourceEvidence/${index}/id`);
    expectLiteral(entry.url, expected.url, `/sourceEvidence/${index}/url`);
    expectLiteral(
      entry.startedAt,
      expected.startedAt,
      `/sourceEvidence/${index}/startedAt`,
    );
    expectLiteral(
      entry.endedAt,
      expected.endedAt,
      `/sourceEvidence/${index}/endedAt`,
    );
    for (const [key, literal] of [
      ["method", "GET"],
      ["statusCategory", "2xx"],
      ["mediaCategory", expected.mediaCategory],
      ["byteCount", expected.byteCount],
      ["chunkCount", expected.chunkCount],
      ["attemptCount", 1],
      ["redirectCount", 0],
      ["retryCount", 0],
      ["rawBytesRetained", 0],
      ["responseDigest", expected.responseDigest],
    ]) {
      expectLiteral(entry[key], literal, `/sourceEvidence/${index}/${key}`);
    }
    expectLiteral(
      gate.lifecycleBundle.evidenceReceipts
        .filter(({ evidenceClass }) => evidenceClass === "provider_fact")
        .some(({ accessedAt }) => accessedAt === lifecycleAccessedAt(entry)),
      true,
      `/sourceEvidence/${index}/endedAt`,
    );
  });
  const sourceBySlot = new Map(
    gate.sourceEvidence.map((entry) => [entry.slot, entry]),
  );
  for (const fact of PROVIDER_FACT_BLUEPRINT) {
    const receipt = gate.lifecycleBundle.evidenceReceipts.find(
      ({ id }) => id === fact.id,
    );
    if (receipt === undefined) {
      fail(
        "BLUEPRINT_MISMATCH",
        "/lifecycleBundle/evidenceReceipts",
        `missing exact provider fact ${fact.id}`,
      );
    }
    expectLiteral(
      receipt.statementDigest,
      providerStatementDigest(fact, sourceBySlot, gate.lifecycleBundle.scope),
      `/lifecycleBundle/evidenceReceipts/${fact.id}/statementDigest`,
    );
  }
  expectArray(
    gate.authorityEvidenceBindings,
    "/authorityEvidenceBindings",
    AUTHORITY_BLUEPRINT.length,
  ).forEach((binding, index) => {
    expectObject(binding, `/authorityEvidenceBindings/${index}`, [
      "slot",
      "authorityReceiptRef",
      "evidenceDigest",
    ]);
    expectLiteral(
      binding.slot,
      AUTHORITY_BLUEPRINT[index].slot,
      `/authorityEvidenceBindings/${index}/slot`,
    );
    expectDigest(
      binding.evidenceDigest,
      `/authorityEvidenceBindings/${index}/evidenceDigest`,
    );
    const expectedRef = authorityRefBySlot(gate.lifecycleBundle, binding.slot);
    if (canonical(binding.authorityReceiptRef) !== canonical(expectedRef))
      fail(
        "AUTHORITY_EVIDENCE_MISMATCH",
        `/authorityEvidenceBindings/${index}/authorityReceiptRef`,
        "authority evidence does not bind the exact receipt",
      );
  });
  expectArray(
    gate.reviewEvidenceBindings,
    "/reviewEvidenceBindings",
    REVIEW_BLUEPRINT.length,
  ).forEach((binding, index) => {
    expectObject(binding, `/reviewEvidenceBindings/${index}`, [
      "reviewReceiptRef",
      "evidenceDigest",
    ]);
    expectDigest(
      binding.evidenceDigest,
      `/reviewEvidenceBindings/${index}/evidenceDigest`,
    );
    const blueprint = REVIEW_BLUEPRINT[index];
    const review = gate.lifecycleBundle.reviewReceipts.find(
      ({ id }) => id === reviewId(blueprint.subject, blueprint.reviewKind),
    );
    if (review === undefined) {
      fail(
        "BLUEPRINT_MISMATCH",
        "/lifecycleBundle/reviewReceipts",
        "missing exact lifecycle review receipt",
      );
    }
    const expectedRef = exactRef(
      "review_receipt",
      review.id,
      review.contentDigest,
    );
    if (canonical(binding.reviewReceiptRef) !== canonical(expectedRef))
      fail(
        "REVIEW_EVIDENCE_MISMATCH",
        `/reviewEvidenceBindings/${index}/reviewReceiptRef`,
        "review evidence does not bind the exact receipt",
      );
  });
}

function parseGate(value) {
  const gate = capturePlainJson(value, "$gate");
  expectObject(gate, "$gate", [
    "schemaVersion",
    "id",
    "version",
    "contentDigest",
    "state",
    "expectedLifecycleBundleContentDigest",
    "expectedLifecycleScopeContentDigest",
    "lifecycleBundle",
    "sourceEvidence",
    "authorityEvidenceBindings",
    "reviewEvidenceBindings",
    "companionManifest",
    "request",
    "approvals",
    "publication",
  ]);
  expectLiteral(gate.schemaVersion, "1.0.0", "/schemaVersion");
  expectLiteral(gate.id, "federal-register-tier1-pre-acquisition-gate", "/id");
  expectLiteral(gate.version, "1.0.0", "/version");
  expectLiteral(gate.state, "bound_pre_acquisition", "/state");
  expectLiteral(gate.publication, "closed", "/publication");
  expectDigest(gate.contentDigest, "/contentDigest");
  const payload = structuredClone(gate);
  delete payload.contentDigest;
  expectLiteral(gate.contentDigest, digestJson(payload), "/contentDigest");
  gate.lifecycleBundle = parseRealSourceLifecycleBundle(gate.lifecycleBundle);
  validateBoundBlueprint(gate.lifecycleBundle);
  expectLiteral(
    gate.expectedLifecycleBundleContentDigest,
    gate.lifecycleBundle.contentDigest,
    "/expectedLifecycleBundleContentDigest",
  );
  expectLiteral(
    gate.expectedLifecycleScopeContentDigest,
    gate.lifecycleBundle.scope.contentDigest,
    "/expectedLifecycleScopeContentDigest",
  );
  const manifest = validateManifest(
    gate.companionManifest,
    "/companionManifest",
  );
  validateRequestBinding(gate.request, gate.lifecycleBundle, "/request");
  validateExactBindings(gate);
  expectArray(gate.approvals, "/approvals", 3).forEach((approval, index) =>
    parseApproval(approval, index, gate, manifest),
  );
  return deepFreeze(gate);
}

/**
 * The acquisition boundary requires expectations held outside the gate file.
 * In particular, callers must pin the separately reviewed whole-gate digest,
 * replacement companion manifest, and all three reviewer-evidence digests.
 */
export function assertFederalRegisterTier1AcquisitionGate(
  gateValue,
  expectationValue,
) {
  const gate = parseGate(gateValue);
  const expectation = capturePlainJson(expectationValue, "$expectation");
  expectObject(expectation, "$expectation", [
    "gateContentDigest",
    "lifecycleBundleContentDigest",
    "lifecycleScopeContentDigest",
    "companionManifestDigest",
    "companionManifestByteLength",
    "sourceEvidenceIds",
    "approvalEvidenceDigests",
    "asOf",
  ]);
  expectLiteral(
    expectDigest(
      expectation.gateContentDigest,
      "/expectation/gateContentDigest",
    ),
    gate.contentDigest,
    "/expectation/gateContentDigest",
  );
  expectLiteral(
    expectDigest(
      expectation.lifecycleBundleContentDigest,
      "/expectation/lifecycleBundleContentDigest",
    ),
    gate.lifecycleBundle.contentDigest,
    "/expectation/lifecycleBundleContentDigest",
  );
  expectLiteral(
    expectDigest(
      expectation.lifecycleScopeContentDigest,
      "/expectation/lifecycleScopeContentDigest",
    ),
    gate.lifecycleBundle.scope.contentDigest,
    "/expectation/lifecycleScopeContentDigest",
  );
  expectLiteral(
    expectDigest(
      expectation.companionManifestDigest,
      "/expectation/companionManifestDigest",
    ),
    gate.companionManifest.sha256,
    "/expectation/companionManifestDigest",
  );
  expectLiteral(
    expectation.companionManifestByteLength,
    gate.companionManifest.byteLength,
    "/expectation/companionManifestByteLength",
  );
  const sourceEvidenceIds = expectArray(
    expectation.sourceEvidenceIds,
    "/expectation/sourceEvidenceIds",
    SOURCE_EVIDENCE_BLUEPRINT.length,
  );
  sourceEvidenceIds.forEach((id, index) => {
    expectLiteral(
      id,
      gate.sourceEvidence[index].id,
      `/expectation/sourceEvidenceIds/${index}`,
    );
  });
  const approvalDigests = expectArray(
    expectation.approvalEvidenceDigests,
    "/expectation/approvalEvidenceDigests",
    3,
  );
  approvalDigests.forEach((digest, index) => {
    expectDigest(digest, `/expectation/approvalEvidenceDigests/${index}`);
    expectLiteral(
      digest,
      gate.approvals[index].evidenceDigest,
      `/expectation/approvalEvidenceDigests/${index}`,
    );
  });
  const asOf = expectTimestamp(expectation.asOf, "/expectation/asOf");
  before(
    gate.lifecycleBundle.lifecycleAsOf,
    asOf,
    "/expectation/asOf",
    "acquisition assertion must follow the finalized lifecycle state",
  );
  before(
    asOf,
    FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
    "/expectation/asOf",
    "gate expired on 2026-12-01",
  );
  for (const [index, approval] of gate.approvals.entries()) {
    atOrBefore(
      approval.issuedAt,
      asOf,
      `/approvals/${index}/issuedAt`,
      "approval is not effective yet",
    );
  }
  const compatible = assertRealSourceLifecycleCompatibility(
    gate.lifecycleBundle,
    gate.lifecycleBundle.scope,
    expectation.lifecycleBundleContentDigest,
  );
  const evaluation = evaluateRealSourceLifecycle(compatible, {
    expectedScope: compatible.scope,
    expectedBundleContentDigest: compatible.contentDigest,
    requestedOperation: "acquisition",
    asOf,
    currentAttempt: "not_attempted",
    currentRevisionRef: null,
    requestedLkgRef: null,
  });
  if (
    !evaluation.canExecute ||
    evaluation.qualificationState !== "qualified" ||
    evaluation.admissionState !== "admitted" ||
    evaluation.activationState !== "active" ||
    evaluation.bindingState !== "bound" ||
    evaluation.operationGranted !== true ||
    evaluation.canEmitLocalArtifact !== false ||
    evaluation.canPublish !== false
  ) {
    fail(
      "LIFECYCLE_GATE_CLOSED",
      "/lifecycleBundle",
      `lifecycle evaluation is not exact bound pre-acquisition: ${evaluation.reasonCodes.join(",")}`,
    );
  }
  return deepFreeze(capturePlainJson(gate, "$validatedGate"));
}

export function serializeFederalRegisterTier1PreAcquisitionGate(gateValue) {
  return canonical(parseGate(gateValue));
}

export function createFederalRegisterTier1GateProposal() {
  return deepFreeze({
    schemaVersion: "1.0.0",
    mode: "qualification_proposal_only",
    acquisitionAuthorized: false,
    candidateBundleDigest: FEDERAL_REGISTER_TIER1_CANDIDATE_BUNDLE_DIGEST,
    requestPlanDigest: FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST,
    fieldPolicyDigest: FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST,
    companionManifestDigest: null,
    companionManifestState: "replacement_freeze_required",
    replacementSourceEvidenceIds:
      FEDERAL_REGISTER_TIER1_POST_AUTHORITY_EVIDENCE_RECEIPTS.map(
        ({ id }) => id,
      ),
    replacementSourceEvidenceState:
      "three_post_authority_serial_receipts_recorded_and_approved",
    requiredAuthorityCount: 7,
    requiredProviderFactCount: 6,
    requiredProjectControlCount: 18,
    requiredUnknownCount: 9,
    requiredResidualRiskCount: 2,
    requiredLifecycleReviewCount: 14,
    residualAcceptedAt: FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT,
    expiresAt: FEDERAL_REGISTER_TIER1_GATE_EXPIRY,
    provenanceBlocker:
      "FR-D2, FR-R4, and FR-R5 follow prospective provider authority; historical 11:44 observations remain ineligible and cannot be backdated",
    publication: "closed",
  });
}
