import type {
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
} from "../../src/demo/types";

export const sources: DemoSource[] = [
  {
    id: "federal-register",
    label: "Federal Register",
    level: "federal",
    status: "live",
    note: "Synthetic test source.",
  },
  {
    id: "washington",
    label: "Washington Legislature",
    level: "state",
    status: "live",
    note: "Synthetic test source.",
  },
];

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
): DemoSearchResponse {
  return {
    ok: true,
    source: "federal-register",
    query,
    page: 1,
    total: results.length,
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
