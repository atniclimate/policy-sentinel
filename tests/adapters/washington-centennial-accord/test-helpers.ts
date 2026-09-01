import { readFileSync } from "node:fs";
import path from "node:path";

import { vi } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import {
  GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS,
  GOIA_ACCORD_URL,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION,
  WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
  type GoiaAccordFetchLike,
} from "../../../src/adapters/washington-centennial-accord";
import type { BuildContext } from "../../../src/pipeline/source-adapter";
import type { SourceConfig } from "../../../src/shared/contracts";

export const goiaAccordFixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/washington-centennial-accord/centennial-accord.valid.html",
  ),
  "utf8",
);

export function enabledGoiaAccordSource(): SourceConfig {
  const source = structuredClone(
    sourceRegistry.sources.find(
      ({ id }) => id === "washington-centennial-accord",
    ),
  ) as unknown as SourceConfig;
  source.enabled = true;
  source.adapter = {
    id: WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
    version: WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION,
    module: "src/adapters/washington-centennial-accord/index.ts",
    identityRule: WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
  };
  source.publication.requiredProvenancePointers = [
    ...GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS,
  ];
  return source;
}

export function goiaAccordContext(): BuildContext {
  return {
    buildId: "impossible-synthetic-goia-accord-build",
    generatedAt: "2026-08-03T20:00:00.000Z",
    source: enabledGoiaAccordSource(),
    previousCursor: null,
  };
}

export function responseWithUrl(
  body: BodyInit | null,
  {
    status = 200,
    url = GOIA_ACCORD_URL,
    headers = {},
  }: {
    status?: number;
    url?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const response = new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      ...headers,
    },
  });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: url,
  });
  return response;
}

export function htmlResponse(
  html = goiaAccordFixture,
  options: Parameters<typeof responseWithUrl>[1] = {},
): Response {
  return responseWithUrl(html, options);
}

export function fixtureTransport(html = goiaAccordFixture): {
  fetch: GoiaAccordFetchLike;
  mock: ReturnType<typeof vi.fn<GoiaAccordFetchLike>>;
  resolveHostname: () => Promise<readonly string[]>;
} {
  const mock = vi.fn<GoiaAccordFetchLike>(async () => htmlResponse(html));
  return {
    fetch: mock,
    mock,
    resolveHostname: async () => ["93.184.216.34"],
  };
}

export function replaceExactly(
  value: string,
  search: string,
  replacement: string,
): string {
  if (!value.includes(search)) {
    throw new Error(`synthetic fixture token not found: ${search}`);
  }
  return value.replace(search, replacement);
}
