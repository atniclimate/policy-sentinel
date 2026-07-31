import type { RelevanceBasis, SearchCriteria } from "./types";

export interface Route {
  path: string;
  params: URLSearchParams;
  recordId: string | null;
}

export const emptyCriteria = (): SearchCriteria => ({
  nationId: "",
  allPolicyAreas: false,
  categoryIds: [],
  subcategoryIds: {},
  query: "",
  jurisdictions: [],
  documentTypes: [],
  statuses: [],
  sources: [],
  relevanceBases: [],
  dateFrom: "",
  dateThrough: "",
  sort: "updated-desc",
});

const listParam = (params: URLSearchParams, key: string): string[] =>
  (params.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export const parseRoute = (hash = window.location.hash): Route => {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [rawPath, rawQuery = ""] = (raw || "/").split("?", 2);
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const recordMatch = path.match(/^\/record\/(.+)$/);
  let recordId: string | null = null;
  if (recordMatch) {
    try {
      recordId = decodeURIComponent(recordMatch[1]);
    } catch {
      recordId = null;
    }
  }
  return {
    path,
    params: new URLSearchParams(rawQuery),
    recordId,
  };
};

export const criteriaFromParams = (params: URLSearchParams): SearchCriteria => {
  const subcategoryIds: Record<string, string[]> = {};
  for (const pair of listParam(params, "sub")) {
    const separator = pair.indexOf(":");
    if (separator < 1) continue;
    const categoryId = pair.slice(0, separator);
    const subcategoryId = pair.slice(separator + 1);
    if (!subcategoryId) continue;
    subcategoryIds[categoryId] = [
      ...(subcategoryIds[categoryId] ?? []),
      subcategoryId,
    ];
  }

  const areas = listParam(params, "areas");
  const sort = params.get("sort");

  return {
    nationId: params.get("nation") ?? "",
    allPolicyAreas: areas.includes("all"),
    categoryIds: areas.filter((area) => area !== "all"),
    subcategoryIds,
    query: params.get("q") ?? "",
    jurisdictions: listParam(params, "jurisdiction"),
    documentTypes: listParam(params, "type"),
    statuses: listParam(params, "status"),
    sources: listParam(params, "source"),
    relevanceBases: listParam(params, "relevance").filter((basis) =>
      [
        "explicit_nation_reference",
        "general_jurisdiction",
        "landmark",
        "source_defined",
      ].includes(basis),
    ) as RelevanceBasis[],
    dateFrom: params.get("from") ?? "",
    dateThrough: params.get("through") ?? "",
    sort: sort === "event-asc" || sort === "title" ? sort : "updated-desc",
  };
};

const setList = (
  params: URLSearchParams,
  key: string,
  values: string[],
): void => {
  if (values.length > 0) params.set(key, values.join(","));
};

export const paramsFromCriteria = (
  criteria: SearchCriteria,
): URLSearchParams => {
  const params = new URLSearchParams();
  if (criteria.nationId) params.set("nation", criteria.nationId);
  setList(
    params,
    "areas",
    criteria.allPolicyAreas ? ["all"] : criteria.categoryIds,
  );
  setList(
    params,
    "sub",
    Object.entries(criteria.subcategoryIds).flatMap(
      ([categoryId, subcategories]) =>
        subcategories.map((subcategoryId) => `${categoryId}:${subcategoryId}`),
    ),
  );
  if (criteria.query) params.set("q", criteria.query);
  setList(params, "jurisdiction", criteria.jurisdictions);
  setList(params, "type", criteria.documentTypes);
  setList(params, "status", criteria.statuses);
  setList(params, "source", criteria.sources);
  setList(params, "relevance", criteria.relevanceBases);
  if (criteria.dateFrom) params.set("from", criteria.dateFrom);
  if (criteria.dateThrough) params.set("through", criteria.dateThrough);
  if (criteria.sort !== "updated-desc") params.set("sort", criteria.sort);
  return params;
};

export const routeHash = (path: string, criteria?: SearchCriteria): string => {
  const params = criteria
    ? paramsFromCriteria(criteria)
    : new URLSearchParams();
  const query = params.toString();
  return `#${path}${query ? `?${query}` : ""}`;
};

export const recordHash = (
  recordId: string,
  criteria: SearchCriteria,
  fromPath: string,
): string => {
  const params = paramsFromCriteria(criteria);
  params.set("return", fromPath);
  return `#/record/${encodeURIComponent(recordId)}?${params.toString()}`;
};

export const navigate = (hash: string): void => {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
};
