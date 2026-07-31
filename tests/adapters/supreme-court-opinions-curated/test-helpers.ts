import { readFileSync } from "node:fs";
import path from "node:path";

import { vi } from "vitest";

import sourceRegistry from "../../../config/sources.v1.json";
import {
  SUPREME_COURT_OPINIONS_ADAPTER_ID,
  SUPREME_COURT_OPINIONS_ADAPTER_VERSION,
  SUPREME_COURT_OPINIONS_IDENTITY_RULE,
  SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS,
  SUPREME_COURT_TERM_URL,
  type SupremeCourtFetchLike,
} from "../../../src/adapters/supreme-court-opinions-curated";
import type { BuildContext } from "../../../src/pipeline/source-adapter";
import type { SourceConfig } from "../../../src/shared/contracts";

export const supremeCourtFixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/supreme-court-opinions-curated/october-term-2018.valid.html",
  ),
  "utf8",
);

export function enabledSupremeCourtSource(): SourceConfig {
  const source = structuredClone(
    sourceRegistry.sources.find(
      ({ id }) => id === "supreme-court-opinions-curated",
    ),
  ) as unknown as SourceConfig;
  source.enabled = true;
  source.adapter = {
    id: SUPREME_COURT_OPINIONS_ADAPTER_ID,
    version: SUPREME_COURT_OPINIONS_ADAPTER_VERSION,
    module: "src/adapters/supreme-court-opinions-curated/index.ts",
    identityRule: SUPREME_COURT_OPINIONS_IDENTITY_RULE,
  };
  source.publication.requiredProvenancePointers = [
    ...SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS,
  ];
  return source;
}

export function supremeCourtContext(): BuildContext {
  return {
    buildId: "impossible-synthetic-supreme-court-build",
    generatedAt: "2026-07-31T20:00:00.000Z",
    source: enabledSupremeCourtSource(),
    previousCursor: null,
  };
}

export function responseWithUrl(
  body: BodyInit | null,
  {
    status = 200,
    url = SUPREME_COURT_TERM_URL,
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
  html = supremeCourtFixture,
  options: Parameters<typeof responseWithUrl>[1] = {},
): Response {
  return responseWithUrl(html, options);
}

export function fixtureFetch(html = supremeCourtFixture): {
  fetch: SupremeCourtFetchLike;
  mock: ReturnType<typeof vi.fn<SupremeCourtFetchLike>>;
} {
  const mock = vi.fn<SupremeCourtFetchLike>(async () => htmlResponse(html));
  return { fetch: mock, mock };
}

export function replaceExactly(
  value: string,
  search: string,
  replacement: string,
): string {
  const first = value.indexOf(search);
  if (first < 0) {
    throw new Error(`synthetic fixture token not found: ${search}`);
  }
  const result = value.replace(search, replacement);
  if (result === value) {
    throw new Error(`synthetic fixture token was not replaced: ${search}`);
  }
  return result;
}
