import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { TextDecoder, types } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sourceSchema from "../../../schemas/source.schema.v1.json" with { type: "json" };
import { assertSourceRegistrySemantics } from "../../pipeline/source-registry.mjs";

export const CURATED_DOCUMENT_PACK_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/curated-document-pack.schema.v1.json";
export const CURATED_DOCUMENT_PACK_SCHEMA_VERSION = "1.0.0";

const MAX_BYTES = 65_536;
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayByteLength = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "byteLength",
).get;
const typedArrayBuffer = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "buffer",
).get;
const typedArraySet = typedArrayPrototype.set;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const INPUT_KEYS = [
  "corpus",
  "sourceRegistry",
  "recordId",
  "objectReceipt",
  "bytes",
  "packId",
  "documentId",
  "documentVersionId",
  "generatedAt",
];
const MANIFEST_KEYS = [
  "$schema",
  "schemaVersion",
  "kind",
  "id",
  "version",
  "contentDigest",
  "synthetic",
  "trustDomain",
  "generatedAt",
  "corpusRef",
  "registryRef",
  "recordRef",
  "interface",
  "boundaries",
  "object",
  "rendition",
  "document",
  "segments",
  "assertions",
  "reuse",
  "index",
  "indexDigest",
  "publication",
];
const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
const validateSourceSchema = ajv.compile(sourceSchema);

export class CuratedDocumentPackError extends TypeError {
  constructor(code) {
    super(`Curated document pack rejected: ${code}`);
    this.name = "CuratedDocumentPackError";
    this.code = code;
  }
}

function fail(code) {
  throw new CuratedDocumentPackError(code);
}

function strictKeys(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    types.isProxy(value) ||
    Array.isArray(value)
  ) {
    fail("INVALID_SHAPE");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length)
    fail("INVALID_SHAPE");
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      fail("INVALID_SHAPE");
    }
  }
}

function capture(value, budget = { nodes: 0, chars: 0 }, depth = 0) {
  budget.nodes += 1;
  if (depth > 40 || budget.nodes > 100_000) fail("JSON_RESOURCE_LIMIT");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    budget.chars += value.length;
    if (budget.chars > 4_000_000 || !value.isWellFormed())
      fail("JSON_RESOURCE_LIMIT");
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || types.isProxy(value)) fail("NON_JSON_INPUT");
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    fail("NON_JSON_INPUT");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail("NON_JSON_INPUT");
  if (Array.isArray(value)) {
    if (value.length > 100_000 || ownKeys.length !== value.length + 1)
      fail("NON_JSON_INPUT");
    return Array.from({ length: value.length }, (_, index) => {
      const descriptor = descriptors[index];
      if (!descriptor?.enumerable || !("value" in descriptor))
        fail("NON_JSON_INPUT");
      return capture(descriptor.value, budget, depth + 1);
    });
  }
  const result = {};
  for (const key of ownKeys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !("value" in descriptor))
      fail("NON_JSON_INPUT");
    Object.defineProperty(result, key, {
      value: capture(descriptor.value, budget, depth + 1),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function digest(value) {
  return hash(Buffer.from(canonical(value), "utf8"));
}

function freeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function stableId(value) {
  if (typeof value !== "string" || value.length > 128 || !ID.test(value))
    fail("INVALID_ID");
  return value;
}

function timestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  ) {
    fail("INVALID_TIMESTAMP");
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString() !== value.replace(/(?<!\.\d{3})Z$/, ".000Z")
  ) {
    fail("INVALID_TIMESTAMP");
  }
  return value;
}

function copyBytes(value) {
  // No caller length, buffer, conversion, iterator or species hooks are read.
  if (!types.isUint8Array(value)) fail("INVALID_BYTES");
  let byteLength;
  try {
    if (!types.isArrayBuffer(typedArrayBuffer.call(value)))
      fail("INVALID_BYTES");
    byteLength = typedArrayByteLength.call(value);
  } catch {
    fail("INVALID_BYTES");
  }
  if (byteLength < 1 || byteLength > MAX_BYTES) fail("OBJECT_BYTE_LIMIT");
  const bytes = Buffer.allocUnsafe(byteLength);
  try {
    typedArraySet.call(bytes, value);
  } catch {
    fail("INVALID_BYTES");
  }
  if (bytes.length !== byteLength || bytes.length > MAX_BYTES)
    fail("OBJECT_BYTE_LIMIT");
  return bytes;
}

function extractText(bytes) {
  if (
    bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ||
    bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xfe])) ||
    bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))
  )
    fail("ENCODING_BOM_UNSUPPORTED");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8");
  }
  for (const character of text) {
    const code = character.codePointAt(0);
    if ((code < 32 && ![9, 10, 13].includes(code)) || code === 127) {
      fail("NON_TEXT_CONTENT");
    }
  }
  if (/^\s*(?:%PDF-|<!doctype\s+html|<html\b|<\?xml\b|\{\\rtf)/iu.test(text)) {
    fail("UNSUPPORTED_RENDITION_FORMAT");
  }
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function contentRef(value) {
  return {
    kind: value.kind,
    id: value.id,
    version: value.version,
    contentDigest: value.contentDigest,
  };
}

function validateReceipt(receipt, bytes, sourceId) {
  strictKeys(receipt, [
    "schemaVersion",
    "kind",
    "status",
    "synthetic",
    "sourceId",
    "operationId",
    "sha256",
    "byteLength",
    "objectPath",
  ]);
  const sha256 = hash(bytes);
  if (
    receipt.schemaVersion !== "1.0.0" ||
    receipt.kind !== "synthetic_object_receipt" ||
    !["stored", "already_present"].includes(receipt.status) ||
    receipt.synthetic !== true ||
    receipt.sourceId !== sourceId ||
    receipt.sha256 !== sha256 ||
    receipt.byteLength !== bytes.length ||
    receipt.objectPath !==
      `objects/sha256/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}`
  )
    fail("OBJECT_RECEIPT_MISMATCH");
  stableId(receipt.operationId);
}

function findSegment(bytes, text, field, renditionDigest) {
  if (typeof text !== "string" || text.length < 1)
    fail("MISSING_CITATION_TEXT");
  const expected = Buffer.from(text, "utf8");
  const start = bytes.indexOf(expected);
  if (start < 0 || bytes.indexOf(expected, start + 1) !== -1)
    fail("CITATION_MISSING_OR_AMBIGUOUS");
  const end = start + expected.length;
  const textDigest = hash(expected);
  return {
    id: `segment-${digest({ field, renditionDigest, start, end, textDigest })}`,
    renditionDigest,
    textDigest,
    locator: { type: "utf8_byte_range", start, end },
    contextDigest: hash(
      bytes.subarray(Math.max(0, start - 32), Math.min(bytes.length, end + 32)),
    ),
    field,
  };
}

export function serializeCuratedDocumentPack(manifest) {
  const safe = capture(manifest);
  strictKeys(safe, MANIFEST_KEYS);
  if (!DIGEST.test(safe.contentDigest ?? "")) fail("MANIFEST_DIGEST_MISMATCH");
  const { contentDigest, ...body } = safe;
  if (digest(body) !== contentDigest) fail("MANIFEST_DIGEST_MISMATCH");
  return `${canonical(safe)}\n`;
}

/** No transport exists in Run 1; URL/DNS/redirect metadata cannot activate it. */
export function denyCuratedNetworkOperation() {
  fail("NETWORK_OPERATION_CLOSED");
}

export function createCuratedDocumentPackRuntime({ parseAnalyzedCorpus }) {
  function createInternal(input) {
    strictKeys(input, INPUT_KEYS);
    const bytes = copyBytes(input.bytes);
    const safe = capture(
      Object.fromEntries(
        INPUT_KEYS.filter((key) => key !== "bytes").map((key) => [
          key,
          input[key],
        ]),
      ),
    );
    const corpus = parseAnalyzedCorpus(safe.corpus);
    if (
      corpus.synthetic !== true ||
      corpus.trustDomain !== "synthetic_test_only"
    )
      fail("REAL_SOURCE_AUTHORITY_CLOSED");
    const registry = safe.sourceRegistry;
    if (!validateSourceSchema(registry)) fail("INVALID_SOURCE_REGISTRY");
    assertSourceRegistrySemantics(registry);
    const entry = corpus.recordEntries.find(
      ({ recordId }) => recordId === safe.recordId,
    );
    if (!entry) fail("CORPUS_RECORD_NOT_FOUND");
    const record = entry.record;
    const source = registry.sources.find(({ id }) => id === record.source.id);
    if (
      !source?.synthetic ||
      !source.enabled ||
      source.access.method !== "fixture" ||
      source.access.authentication !== "none" ||
      source.access.browserRuntimeAllowed !== false ||
      source.provider !== record.source.provider ||
      source.adapter?.id !== record.source.adapterId ||
      source.adapter.version !== record.source.adapterVersion
    )
      fail("SOURCE_REGISTRY_BINDING_MISMATCH");
    validateReceipt(safe.objectReceipt, bytes, source.id);
    stableId(safe.packId);
    stableId(safe.documentId);
    stableId(safe.documentVersionId);
    if (safe.documentId === safe.documentVersionId)
      fail("DOCUMENT_VERSION_ID_COLLISION");
    timestamp(safe.generatedAt);
    const text = extractText(bytes);
    const renditionBytes = Buffer.from(text, "utf8");
    const renditionDigest = hash(renditionBytes);
    const fields = [["/officialTitle", record.officialTitle]];
    if (record.texts.officialSummary !== null)
      fields.push([
        "/texts/officialSummary/text",
        record.texts.officialSummary.text,
      ]);
    const segments = fields.map(([field, value]) =>
      findSegment(renditionBytes, value, field, renditionDigest),
    );
    const assertions = segments.map((segment) => {
      const provenance = record.fieldProvenance.find(
        ({ field }) => field === segment.field,
      );
      if (!provenance || provenance.validationState !== "validated")
        fail("CITATION_PROVENANCE_REQUIRED");
      return {
        id: `assertion-${digest({ recordDigest: entry.recordDigest, segmentId: segment.id })}`,
        mode: "source_attested",
        accepted: true,
        recordId: entry.recordId,
        field: segment.field,
        segmentIds: [segment.id],
        authorityRef: {
          sourceEvidenceBindingRef: entry.sourceEvidenceBindingRef,
          provenanceDigest: entry.provenanceDigest,
          field: segment.field,
        },
      };
    });
    const index = segments.map(({ id, field, textDigest }) => ({
      segmentId: id,
      field,
      textDigest,
    }));
    const manifest = {
      $schema: CURATED_DOCUMENT_PACK_SCHEMA_ID,
      schemaVersion: CURATED_DOCUMENT_PACK_SCHEMA_VERSION,
      kind: "curated_document_pack",
      id: safe.packId,
      version: "1.0.0",
      synthetic: true,
      trustDomain: "synthetic_test_only",
      generatedAt: safe.generatedAt,
      corpusRef: contentRef(corpus),
      registryRef: {
        registryVersion: registry.registryVersion,
        digest: digest(registry),
      },
      recordRef: {
        recordId: entry.recordId,
        recordDigest: entry.recordDigest,
        sourceEvidenceBindingRef: entry.sourceEvidenceBindingRef,
      },
      interface: {
        id: `${source.id}-utf8-fixture`,
        sourceId: source.id,
        provider: source.provider,
        kind: "synthetic_utf8_fixture",
        operationId: safe.objectReceipt.operationId,
        networkRequests: 0,
      },
      boundaries: {
        qualification: "synthetic_test_only",
        admission: "synthetic_test_only",
        activation: "synthetic_test_only",
        acquisition: "synthetic_fixture_only",
        analysisEligibility: "synthetic_test_only",
        artifactEligibility: "non_public_ignored_prerelease",
        publication: "closed",
      },
      object: {
        sha256: safe.objectReceipt.sha256,
        byteLength: bytes.length,
        objectPath: safe.objectReceipt.objectPath,
      },
      rendition: {
        id: `rendition-${renditionDigest}`,
        inputDigest: safe.objectReceipt.sha256,
        sha256: renditionDigest,
        byteLength: renditionBytes.length,
        parser: {
          id: "strict-utf8-lf",
          version: "1.0.0",
          configDigest: digest({
            encoding: "UTF-8",
            lineEndings: "LF",
            bom: "reject",
            maxBytes: MAX_BYTES,
          }),
        },
        encoding: "UTF-8",
        lineEndings: "LF",
        authorityRole: "synthetic_fixture",
        reviewState: "synthetic_test_only",
      },
      document: {
        id: safe.documentId,
        sourceDocumentIdentifier: record.sourceDocumentIdentifier,
        documentType: record.documentType,
        sourceStatusLabel: record.status.sourceLabel,
        versionId: safe.documentVersionId,
        proceedingId: null,
        dates: {
          issued: null,
          published: record.dates.published,
          filed: null,
          signed: null,
          enacted: null,
          effective: record.dates.effective,
          updated: record.dates.updated,
          dataAsOf: record.sourceHealth.dataAsOf,
          retrieved: record.dates.retrieved,
          reviewed: null,
        },
      },
      segments,
      assertions,
      reuse: {
        localCache: "allowed",
        localAnalysis: "allowed",
        localFullText: "allowed",
        excerpt: "prohibited",
        export: "prohibited",
        publicRedistribution: "prohibited",
        refresh: "manual_revalidation",
      },
      index,
      indexDigest: digest(index),
      publication: {
        state: "closed",
        boundary: "non_public_ignored_prerelease",
      },
    };
    manifest.contentDigest = digest(manifest);
    return { manifest: freeze(manifest), renditionBytes };
  }

  function createCuratedDocumentPack(input) {
    try {
      return createInternal(input);
    } catch (error) {
      if (error instanceof CuratedDocumentPackError) throw error;
      fail("INVALID_DOCUMENT_PACK");
    }
  }

  function replayCuratedDocumentPack(input) {
    try {
      strictKeys(input, [
        "manifest",
        "corpus",
        "sourceRegistry",
        "objectBytes",
        "renditionBytes",
      ]);
      const manifest = capture(input.manifest);
      serializeCuratedDocumentPack(manifest);
      const rebuilt = createInternal({
        corpus: input.corpus,
        sourceRegistry: input.sourceRegistry,
        recordId: manifest.recordRef.recordId,
        objectReceipt: {
          schemaVersion: "1.0.0",
          kind: "synthetic_object_receipt",
          status: "already_present",
          synthetic: true,
          sourceId: manifest.interface.sourceId,
          operationId: manifest.interface.operationId,
          ...manifest.object,
        },
        bytes: input.objectBytes,
        packId: manifest.id,
        documentId: manifest.document.id,
        documentVersionId: manifest.document.versionId,
        generatedAt: manifest.generatedAt,
      });
      const renditionBytes = copyBytes(input.renditionBytes);
      if (!renditionBytes.equals(rebuilt.renditionBytes))
        fail("RENDITION_REPLAY_MISMATCH");
      if (canonical(manifest) !== canonical(rebuilt.manifest))
        fail("MANIFEST_REPLAY_MISMATCH");
      return freeze({
        kind: "curated_document_pack_replay",
        packDigest: manifest.contentDigest,
        corpusRef: manifest.corpusRef,
        recordRef: manifest.recordRef,
        indexDigest: manifest.indexDigest,
        citations: manifest.segments.map((segment) => ({
          segmentId: segment.id,
          field: segment.field,
          renditionDigest: segment.renditionDigest,
          textDigest: segment.textDigest,
          locator: segment.locator,
        })),
      });
    } catch (error) {
      if (error instanceof CuratedDocumentPackError) throw error;
      fail("INVALID_DOCUMENT_PACK");
    }
  }

  return { createCuratedDocumentPack, replayCuratedDocumentPack };
}
