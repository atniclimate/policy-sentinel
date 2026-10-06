import type {
  DemoErrorResponse,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
} from "../src/demo/types";

const DEFAULT_API = "https://policy-sentinel-demo.atniclimate.workers.dev";

/** The service address. A local address may be given with ?api= for testing. */
export function apiBase(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("api");
    if (
      override &&
      /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(override)
    )
      return override;
  } catch {
    /* use the default */
  }
  return DEFAULT_API;
}

export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly kind: "service" | "limited" | "source",
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiFailure("service", "service");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiFailure("service", "service");
  }
  if (response.status === 429) throw new ApiFailure("limited", "limited");
  const record = body as { ok?: boolean };
  if (!response.ok || record.ok === false) {
    throw new ApiFailure(
      (body as DemoErrorResponse).message ?? "The source did not answer.",
      "source",
    );
  }
  return body as T;
}

export async function loadSources(): Promise<DemoSource[]> {
  const data = await get<{ sources: DemoSource[] }>("/api/sources");
  return data.sources;
}

export function search(
  source: string,
  query: string,
  page: number,
): Promise<DemoSearchResponse> {
  const params = new URLSearchParams({ source, q: query, page: String(page) });
  return get<DemoSearchResponse>(`/api/search?${params.toString()}`);
}

export function readPolicy(
  source: string,
  id: string,
): Promise<DemoPolicyResponse> {
  const params = new URLSearchParams({ source, id });
  return get<DemoPolicyResponse>(`/api/policy?${params.toString()}`);
}

/** The id the policy endpoint expects for a citation. */
export function policyId(citation: {
  sourceId: string;
  identifier: string;
}): string {
  if (citation.sourceId === "federal-register") {
    const match = /FR Doc\. ([A-Za-z0-9-]+)\)?$/.exec(citation.identifier);
    return match ? match[1] : citation.identifier;
  }
  if (citation.sourceId === "washington") {
    const match = /^(HB|SB) (\d+), (\d{4}-\d{2})/.exec(citation.identifier);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : citation.identifier;
  }
  return citation.identifier;
}
