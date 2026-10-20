import { searchCriteria } from "../../src/demo/search-contract";
import type {
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
} from "../../src/demo/types";

export const sources: DemoSource[] = (
  [
    ["federal-register", "Federal Register", "federal", "live"],
    ["govinfo", "GovInfo", "federal", "live"],
    ["congress", "Congress.gov", "federal", "live"],
    ["regulations", "Regulations.gov", "federal", "live"],
    ["washington", "Washington State Legislature", "state", "live"],
    ["oregon", "Oregon Legislature", "state", "not_available"],
  ] as const
).map(([id, label, level, status]) => ({
  id,
  label,
  level,
  status,
  note:
    status === "live"
      ? "Synthetic test source."
      : "Synthetic gap: not enabled.",
}));

export function citation(
  id = "2099-00001",
  title = "Example Water Policy",
): DemoCitation {
  return {
    sourceId: "federal-register",
    identifier: `99 FR 100 (FR Doc. ${id})`,
    title,
    issuingBody: "Example Department",
    kind: "Proposed Rule",
    date: "2099-01-05",
    officialUrl: `https://www.federalregister.gov/d/${id}`,
    textUrl: null,
    retrievedAt: "2099-01-07T11:59:00.000Z",
    summary: null,
    textAvailable: true,
    matchKey: null,
  };
}

/** A Federal Register record with every contract v2 field its source states. */
export function statedCitation(
  id = "2099-00010",
  title = "Example Groundfish Rule",
): DemoCitation {
  return {
    ...citation(id, title),
    commentsCloseOn: "2099-02-01",
    docketIds: ["Docket No. 990101-0001"],
    rins: ["0648-AA00"],
    cfrRefs: [{ title: 50, part: "660" }],
    topics: ["Fisheries", "Reporting and recordkeeping requirements"],
  };
}

/** A Regulations.gov document with its own docket id and closing date. */
export function regulationsRecord(
  title = "Example Water Docket Document",
): DemoCitation {
  return {
    ...citation("2099-00020", title),
    sourceId: "regulations",
    identifier: "EPA-HQ-OW-2099-0001-0001",
    officialUrl:
      "https://www.regulations.gov/document/EPA-HQ-OW-2099-0001-0001",
    textAvailable: false,
    commentsCloseOn: "2099-03-15",
    docketIds: ["EPA-HQ-OW-2099-0001"],
  };
}

/** The Federal Register document `id` as another federal source lists it. */
export function listing(
  sourceId: "govinfo" | "regulations",
  id = "2099-00001",
): DemoCitation {
  return {
    ...citation(id),
    sourceId,
    identifier: `${sourceId}-${id}`,
    officialUrl: `https://www.${sourceId}.gov/document/${id}`,
    textAvailable: false,
    matchKey: `fr:${id}`,
  };
}

export function policy(hash = "a", c = citation()): DemoPolicyResponse {
  const textUrl = `https://www.govinfo.gov/content/pkg/FR-2099-01-05/html/${/FR Doc\. ([\w-]+)/.exec(c.identifier)![1]}.htm`;
  return {
    ok: true,
    citation: { ...c, textUrl },
    receipt: {
      sha256: hash.repeat(64),
      bytes: 1234,
      retrievedAt: c.retrievedAt,
      textUrl,
    },
    engine: {
      parser: "policy-text",
      parserVersion: "2.0.0",
      parserConfigDigest: "c".repeat(64),
      rulesVersion: "demo-rules-1.0.0",
    },
    blockCount: 1,
    characterCount: 100,
    opening: "A synthetic opening passage.",
    exclusions: [],
    warnings: [],
    issues: [
      {
        id: "consultation_language-1",
        type: "consultation_language",
        label: "Consultation wording",
        quote: `The Department invites consultation in snapshot ${hash}.`,
        locator: "/p[1]",
        rule: "Exact consultation wording.",
        limits: "Wording does not show that consultation occurred.",
        check: "Read the official record.",
      },
    ],
  };
}

export function searchResult(
  results = [citation()],
  query = "water",
  source = "federal-register",
): DemoSearchResponse {
  return {
    ok: true,
    source,
    query,
    page: 1,
    total: results.length,
    criteria: searchCriteria(source, query, 1),
    continuation: {
      kind: "stopped",
      reason:
        source === "congress" || source === "washington"
          ? "not_applicable"
          : source === "govinfo"
            ? "unknown"
            : "complete",
    },
    results,
    retrievedAt: "2099-01-07T11:59:00.000Z",
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
