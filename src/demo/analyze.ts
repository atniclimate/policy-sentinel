import {
  POLICY_TEXT_PARSER,
  extractPolicyText,
} from "../pipeline/policy-text.mjs";
import { sha256Bytes } from "../pipeline/hashing.mjs";
import { DEMO_RULES_VERSION, identifyIssues } from "./rules";
import type {
  DemoCitation,
  DemoEngineInfo,
  DemoPolicyResponse,
  TextBlock,
} from "./types";

export interface AnalyzeInput {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly sourceKind: "govinfo_fr" | "washington_bill";
  readonly textUrl: string;
  readonly expectedIdentity: string;
  readonly citation: DemoCitation;
  readonly retrievedAt: string;
}

export const ENGINE_INFO: DemoEngineInfo = {
  parser: POLICY_TEXT_PARSER.id,
  parserVersion: POLICY_TEXT_PARSER.version,
  parserConfigDigest: POLICY_TEXT_PARSER.configDigest,
  rulesVersion: DEMO_RULES_VERSION,
};

const EXCLUSION_LABELS: Record<string, string> = {
  personal_contact_section: "Contact section left out",
  personal_contact_block: "Contact details left out",
  prohibited_location_block: "Location details left out",
  printed_page_marker_to_locator: "Page markers folded into locators",
  running_page_header: "Running page headers left out",
};

/**
 * Runs Policy Sentinel's own text extractor over official bytes, then the demo
 * rules over the extracted blocks. Contact details and location details are
 * dropped by the extractor before any rule sees the text.
 */
export function analyzePolicy(input: AnalyzeInput): DemoPolicyResponse {
  const extracted = extractPolicyText({
    bytes: input.bytes,
    mediaType: input.mediaType,
    sourceKind: input.sourceKind,
    url: input.textUrl,
    expectedIdentity: input.expectedIdentity,
  });
  const blocks: TextBlock[] = extracted.blocks.map((block) => ({
    text: block.text,
    locator: block.locator.headingPath.length
      ? `${block.locator.headingPath.join(" > ")} (${block.locator.value})`
      : block.locator.value,
  }));
  const issues = identifyIssues(blocks, {
    kind: input.citation.kind,
    title: input.citation.title,
  });
  const exclusionCounts = new Map<string, number>();
  for (const item of extracted.exclusions) {
    const label = EXCLUSION_LABELS[item.reason] ?? item.reason;
    exclusionCounts.set(label, (exclusionCounts.get(label) ?? 0) + item.count);
  }
  const opening = blocks
    .map((b) => b.text.replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 60 && !/^\[Federal Register/.test(t))
    .slice(0, 2)
    .join(" ")
    .slice(0, 600);
  return {
    ok: true,
    citation: { ...input.citation, textUrl: input.textUrl },
    receipt: {
      sha256: sha256Bytes(input.bytes),
      bytes: input.bytes.byteLength,
      retrievedAt: input.retrievedAt,
      textUrl: input.textUrl,
    },
    engine: ENGINE_INFO,
    blockCount: blocks.length,
    characterCount: extracted.text.length,
    issues,
    exclusions: [...exclusionCounts].map(([reason, count]) => ({
      reason,
      count,
    })),
    warnings: [...extracted.warnings],
    opening,
  };
}

/** Title line for a Washington bill: the "AN ACT Relating to" caption. */
export function washingtonCaption(bytes: Uint8Array): string | null {
  const text = new TextDecoder("utf-8").decode(bytes);
  const match = /AN\s+ACT\s+Relating\s+to([\s\S]{3,400}?);/i.exec(
    text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "),
  );
  return match ? `Relating to${match[1].replace(/\s+/g, " ")}` : null;
}
