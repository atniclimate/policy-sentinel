import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ReadableStream } from "node:stream/web";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  parseFederalRegisterTier1Document,
  serializeFederalRegisterTier1Document,
} from "../../../src/adapters/federal-register/tier1-contract.mjs";
let activeFetchHarness = async () => {
  throw new Error("Tier-1 test fetch harness is not configured");
};
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "fetch",
);
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  writable: true,
  value: (...arguments_) => activeFetchHarness(...arguments_),
});
const tier1Transport =
  await import("../../../src/adapters/federal-register/tier1-transport.mjs?tier1-node-test-harness");
if (originalFetchDescriptor === undefined) {
  delete globalThis.fetch;
} else {
  Object.defineProperty(globalThis, "fetch", originalFetchDescriptor);
}
const {
  FEDERAL_REGISTER_TIER1_REQUEST_POLICY,
  FEDERAL_REGISTER_TIER1_REQUEST_URL,
  FederalRegisterTier1TransportError,
  fetchFederalRegisterTier1Document:
    fetchFederalRegisterTier1DocumentFromPlatform,
} = tier1Transport;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const fixtureText = await readFile(
  path.join(
    projectRoot,
    "fixtures/sources/federal-register/tier1-document.synthetic.valid.json",
  ),
  "utf8",
);
const fixtureValue = JSON.parse(fixtureText);
const compactFixtureText = JSON.stringify(fixtureValue);
const encoder = new TextEncoder();
const { AbortSignal, Response } = globalThis;

const EXPECTED_FIELDS = [
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
];
const EXPECTED_URL = `https://www.federalregister.gov/api/v1/documents/2026-16965.json?${EXPECTED_FIELDS.map(
  (field) => `fields%5B%5D=${field}`,
).join("&")}`;

async function fetchFederalRegisterTier1Document(dependencies) {
  let fetchImpl;
  try {
    if (
      arguments.length === 1 &&
      dependencies !== null &&
      typeof dependencies === "object" &&
      !Array.isArray(dependencies) &&
      Reflect.ownKeys(dependencies).length === 1
    ) {
      const descriptor = Object.getOwnPropertyDescriptor(
        dependencies,
        "fetchImpl",
      );
      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.enumerable === true &&
        typeof descriptor.value === "function"
      ) {
        fetchImpl = descriptor.value;
      }
    }
  } catch {
    fetchImpl = undefined;
  }
  if (fetchImpl === undefined) {
    return fetchFederalRegisterTier1DocumentFromPlatform(dependencies);
  }
  activeFetchHarness = fetchImpl;
  try {
    return await fetchFederalRegisterTier1DocumentFromPlatform();
  } finally {
    activeFetchHarness = async () => {
      throw new Error("Tier-1 test fetch harness is not configured");
    };
  }
}

function jsonResponse(
  text = compactFixtureText,
  { status = 200, headers = {}, chunks = null } = {},
) {
  const body =
    chunks === null
      ? encoder.encode(text)
      : new ReadableStream({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        });
  return bindRequestUrl(
    new Response(body, {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-encoding": "identity",
        ...headers,
      },
    }),
  );
}

function responseFromBytes(bytes, options = {}) {
  return bindRequestUrl(
    new Response(bytes, {
      status: options.status ?? 200,
      headers: {
        "content-type": "application/json",
        "content-encoding": "identity",
        ...(options.headers ?? {}),
      },
    }),
  );
}

function bindRequestUrl(response, value = EXPECTED_URL) {
  Object.defineProperty(response, "url", {
    configurable: true,
    value,
  });
  return response;
}

async function rejectsTransport(promise, code, category, status = null) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof FederalRegisterTier1TransportError);
    assert.equal(error.code, code);
    assert.equal(error.category, category);
    assert.equal(error.status, status);
    return true;
  });
}

function chunks(bytes, count) {
  const output = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((bytes.length * index) / count);
    const end = Math.floor((bytes.length * (index + 1)) / count);
    output.push(bytes.slice(start, end));
  }
  return output;
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") {
    return;
  }
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) {
    assertDeepFrozen(nested);
  }
}

test("constructs only the frozen FR-A1 GET envelope and never fetches rendition targets", async () => {
  assert.equal(FEDERAL_REGISTER_TIER1_REQUEST_URL, EXPECTED_URL);
  assert.deepEqual(FEDERAL_REGISTER_TIER1_REQUEST_POLICY, {
    requestId: "FR-A1",
    method: "GET",
    host: "www.federalregister.gov",
    path: "/api/v1/documents/2026-16965.json",
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
  assert.equal(Object.isFrozen(FEDERAL_REGISTER_TIER1_REQUEST_POLICY), true);

  const calls = [];
  const result = await fetchFederalRegisterTier1Document({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse();
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, EXPECTED_URL);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.referrer, "");
  assert.equal(calls[0].init.referrerPolicy, "no-referrer");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.deepEqual(calls[0].init.headers, {
    Accept: "application/json",
    "Accept-Encoding": "identity",
    "User-Agent": "Policy-Sentinel-LocalPrerelease/1.0",
  });
  const headerNames = Object.keys(calls[0].init.headers).map((name) =>
    name.toLowerCase(),
  );
  for (const forbidden of ["authorization", "cookie", "referer", "x-api-key"]) {
    assert.equal(headerNames.includes(forbidden), false);
  }
  assert.equal(new URL(calls[0].url).username, "");
  assert.equal(new URL(calls[0].url).password, "");
  assert.equal(new URL(calls[0].url).searchParams.size, 23);
  assert.deepEqual(
    new URL(calls[0].url).searchParams.getAll("fields[]"),
    EXPECTED_FIELDS,
  );

  assert.equal(result.primary.document_number, "2026-16965");
  assert.deepEqual(result.replay, result.primary);
  assert.notStrictEqual(result.replay, result.primary);
  assert.notStrictEqual(result.replay.agencies, result.primary.agencies);
  assert.equal(
    serializeFederalRegisterTier1Document(result.primary),
    serializeFederalRegisterTier1Document(result.replay),
  );
  assertDeepFrozen(result);
});

test("returns only two independent projections and one sanitized aggregate receipt", async () => {
  const bytes = encoder.encode(compactFixtureText);
  const expectedDigest = createHash("sha256").update(bytes).digest("hex");
  const result = await fetchFederalRegisterTier1Document({
    fetchImpl: async () => responseFromBytes(bytes),
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "primary",
    "receipt",
    "replay",
  ]);
  assert.deepEqual(result.receipt, {
    requestId: "FR-A1",
    methodClass: "GET",
    hostClass: "federal_register_api",
    statusCategory: "2xx",
    mediaCategory: "application_json_utf8_identity",
    attemptCount: 1,
    retryCount: 0,
    redirectCount: 0,
    byteCount: bytes.byteLength,
    chunkCount: 1,
    pageCount: 1,
    itemCount: 1,
    sha256: expectedDigest,
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(compactFixtureText), false);
  assert.equal(Object.hasOwn(result, "bytes"), false);
  assert.equal(Object.hasOwn(result, "body"), false);
  assert.equal(Object.hasOwn(result.receipt, "url"), false);
});

test("zeroes streamed response chunks after making the replay projections", async () => {
  const sourceChunk = encoder.encode(compactFixtureText);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sourceChunk);
      controller.close();
    },
  });
  const result = await fetchFederalRegisterTier1Document({
    fetchImpl: async () =>
      bindRequestUrl(
        new Response(stream, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-encoding": "identity",
          },
        }),
      ),
  });
  assert.equal(result.primary.document_number, "2026-16965");
  assert.equal(
    sourceChunk.every((value) => value === 0),
    true,
  );
});

test("accepts exactly 65,536 bytes and at most 64 chunks", async () => {
  const compactBytes = encoder.encode(compactFixtureText);
  const padding = " ".repeat(65_536 - compactBytes.byteLength);
  const exactBytes = encoder.encode(`${compactFixtureText}${padding}`);
  assert.equal(exactBytes.byteLength, 65_536);
  const exactChunks = chunks(exactBytes, 64);
  const result = await fetchFederalRegisterTier1Document({
    fetchImpl: async () =>
      jsonResponse("", {
        chunks: exactChunks,
        headers: { "content-length": "65536" },
      }),
  });
  assert.equal(result.receipt.byteCount, 65_536);
  assert.equal(result.receipt.chunkCount, 64);
});

test("rejects declared, streamed, and chunk-count limit violations", async () => {
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () =>
        jsonResponse("{}", { headers: { "content-length": "65537" } }),
    }),
    "response_too_large",
    "byte_ceiling_exceeded",
    200,
  );
  const oversized = new Uint8Array(65_537);
  oversized.fill(0x20);
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () => jsonResponse("", { chunks: [oversized] }),
    }),
    "response_too_large",
    "byte_ceiling_exceeded",
    200,
  );
  const fixtureBytes = encoder.encode(compactFixtureText);
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () =>
        jsonResponse("", { chunks: chunks(fixtureBytes, 65) }),
    }),
    "chunk_limit",
    "chunk_ceiling_exceeded",
    200,
  );
});

test("rejects invalid and mismatched Content-Length without retry", async () => {
  for (const declared of ["01", "1.5", "-1", "NaN", "999999999999999999999"]) {
    let calls = 0;
    await rejectsTransport(
      fetchFederalRegisterTier1Document({
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse("{}", {
            headers: { "content-length": declared },
          });
        },
      }),
      "content_length",
      "invalid_content_length",
      200,
    );
    assert.equal(calls, 1);
  }
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () =>
        jsonResponse(compactFixtureText, {
          headers: { "content-length": "1" },
        }),
    }),
    "content_length",
    "content_length_mismatch",
    200,
  );
});

test("classifies JSON 400, HTML 404, 429 stop, redirects, and other statuses without body disclosure", async () => {
  const cases = [
    [400, "application/json", "bad_request", "json_400"],
    [404, "text/html", "not_found", "html_404"],
    [429, "application/json", "rate_limited", "rate_limited_stop"],
    [500, "application/json", "http_status", "non_success_status"],
    [302, "text/html", "redirect", "redirect_denied"],
  ];
  for (const [status, type, code, category] of cases) {
    let calls = 0;
    let cancelled = false;
    const body = new ReadableStream({
      pull() {},
      cancel() {
        cancelled = true;
      },
    });
    const response = bindRequestUrl(
      new Response(body, {
        status,
        headers: {
          "content-type": type,
          "retry-after": "provider-secret-header",
        },
      }),
    );
    await assert.rejects(
      fetchFederalRegisterTier1Document({
        fetchImpl: async () => {
          calls += 1;
          return response;
        },
      }),
      (error) => {
        assert.ok(error instanceof FederalRegisterTier1TransportError);
        assert.equal(error.code, code);
        assert.equal(error.category, category);
        assert.equal(error.status, status);
        assert.equal(error.message.includes("provider-secret"), false);
        return true;
      },
    );
    assert.equal(calls, 1);
    assert.equal(cancelled, true);
  }
});

test("rejects followed or cross-URL responses even when status is 200", async () => {
  for (const [property, value] of [
    ["redirected", true],
    ["url", ""],
    ["url", "https://example.test/followed"],
  ]) {
    const response = jsonResponse();
    Object.defineProperty(response, property, {
      configurable: true,
      value,
    });
    await rejectsTransport(
      fetchFederalRegisterTier1Document({ fetchImpl: async () => response }),
      "redirect",
      "redirect_denied",
      200,
    );
  }
});

test("requires exact JSON media, UTF-8 charset, and identity content encoding", async () => {
  const mediaCases = [
    ["text/html", "identity", "content_type", "json_media_required"],
    [
      "application/problem+json",
      "identity",
      "content_type",
      "json_media_required",
    ],
    [
      "application/json; charset=iso-8859-1",
      "identity",
      "content_type",
      "utf8_json_media_required",
    ],
    [
      "application/json; charset=utf-8; profile=x",
      "identity",
      "content_type",
      "json_media_required",
    ],
    [
      "application/json",
      "gzip",
      "content_encoding",
      "identity_encoding_required",
    ],
  ];
  for (const [type, encoding, code, category] of mediaCases) {
    await rejectsTransport(
      fetchFederalRegisterTier1Document({
        fetchImpl: async () =>
          jsonResponse(compactFixtureText, {
            headers: {
              "content-type": type,
              "content-encoding": encoding,
            },
          }),
      }),
      code,
      category,
      200,
    );
  }
  await assert.doesNotReject(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () =>
        jsonResponse(compactFixtureText, {
          headers: {
            "content-type": 'Application/JSON; Charset="UTF-8"',
            "content-encoding": "IDENTITY",
          },
        }),
    }),
  );
});

test("rejects malformed UTF-8, BOM, JSON duplicates, wrappers, and contract drift", async () => {
  const invalidCases = [
    [new Uint8Array([0xc3, 0x28]), "invalid_utf8", "invalid_utf8"],
    [
      new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode(compactFixtureText)]),
      "invalid_utf8",
      "utf8_bom_forbidden",
    ],
    [encoder.encode("{"), "invalid_json", "invalid_or_duplicate_json"],
    [
      encoder.encode(
        compactFixtureText.replace('"title":', '"title":"duplicate", "title":'),
      ),
      "invalid_json",
      "invalid_or_duplicate_json",
    ],
    [
      encoder.encode(`[${compactFixtureText}]`),
      "contract_rejected",
      "tier1_contract_rejected",
    ],
  ];
  for (const [bytes, code, category] of invalidCases) {
    await rejectsTransport(
      fetchFederalRegisterTier1Document({
        fetchImpl: async () => responseFromBytes(bytes),
      }),
      code,
      category,
      200,
    );
  }
  const drifted = globalThis.structuredClone(fixtureValue);
  drifted.abstract = "excluded";
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () => jsonResponse(JSON.stringify(drifted)),
    }),
    "contract_rejected",
    "tier1_contract_rejected",
    200,
  );
});

test("enforces one 30-second whole-operation deadline and performs no retry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let calls = 0;
    let settled = false;
    const pending = fetchFederalRegisterTier1Document({
      fetchImpl: async (_url, init) => {
        calls += 1;
        return await new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("provider abort detail")),
            { once: true },
          );
        });
      },
    });
    void pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    context.mock.timers.tick(29_999);
    await Promise.resolve();
    assert.equal(settled, false);
    context.mock.timers.tick(1);
    await rejectsTransport(pending, "timeout", "deadline_exceeded");
    assert.equal(calls, 1);
  } finally {
    context.mock.timers.reset();
  }

  let networkCalls = 0;
  await assert.rejects(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error("credential=must-not-escape");
      },
    }),
    (error) =>
      error instanceof FederalRegisterTier1TransportError &&
      error.code === "network" &&
      error.category === "network_failure" &&
      !error.message.includes("credential"),
  );
  assert.equal(networkCalls, 1);
});

test("rejects dependency and response-shape escape hatches", async () => {
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () => jsonResponse(),
      requestUrl: "https://example.test/escape",
    }),
    "invalid_dependency",
    "transport_arguments_forbidden",
  );
  await rejectsTransport(
    fetchFederalRegisterTier1Document({ fetchImpl: null }),
    "invalid_dependency",
    "transport_arguments_forbidden",
  );
  await rejectsTransport(
    fetchFederalRegisterTier1Document({ fetchImpl: async () => null }),
    "invalid_response",
    "invalid_response_metadata",
  );
  await rejectsTransport(
    fetchFederalRegisterTier1Document({
      fetchImpl: async () =>
        bindRequestUrl(
          new Response(null, {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
    }),
    "invalid_response",
    "missing_response_body",
    200,
  );
});

test("the transport projections remain independently acceptable to the contract", async () => {
  const result = await fetchFederalRegisterTier1Document({
    fetchImpl: async () => jsonResponse(),
  });
  const primary = parseFederalRegisterTier1Document(result.primary);
  const replay = parseFederalRegisterTier1Document(result.replay);
  assert.deepEqual(primary, replay);
  assert.notStrictEqual(primary, replay);
});
