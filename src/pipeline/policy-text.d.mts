import type { PolicyLocator } from "./analyzed-corpus-v2.mjs";
export const POLICY_TEXT_PARSER: Readonly<{
  id: "policy-text";
  version: "1.0.0";
  configDigest: string;
}>;
export interface PolicyTextInput {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly sourceKind: "govinfo_fr" | "washington_bill" | "washington_index";
  readonly url: string;
  /** FR document number; WA bill number/name with optional biennium; Chapter N, YYYY;
   * or Washington session law chapter index YYYY / Washington bill inventory N YYYY-YY. */
  readonly expectedIdentity: string;
  /** Exact reviewed structural blocks omitted from this rendition; every locator must exist. */
  readonly excludedBlockLocators?: readonly string[];
}
export interface ExtractedPolicyText {
  readonly excludedBlockLocators: readonly string[];
  readonly parser: typeof POLICY_TEXT_PARSER;
  readonly text: string;
  readonly blocks: readonly {
    /** Half-open byte positions in UTF-8 encoding of the returned text, not source HTML/XML. */
    readonly startByte: number;
    readonly endByte: number;
    readonly text: string;
    readonly kind: "heading" | "paragraph" | "preformatted" | "table_row";
    readonly locator: PolicyLocator;
  }[];
  readonly sourceMetadataCandidates: readonly {
    readonly field: string;
    readonly value: string;
    readonly sourceLocator: string;
  }[];
  /** Advertised links only. A caller must independently approve host/path and transport. */
  readonly links: readonly {
    readonly url: string;
    readonly text: string;
    readonly sourceLocator: string;
    readonly sourceMetadata?: Readonly<{
      id: number;
      name: string;
      biennium: string;
      description: string;
      shortFriendlyName: string | null;
      longFriendlyName: string | null;
      documentClass: "Bills";
      documentType: "Bills" | "Session Laws";
      extension: ".htm";
      effectiveDate: string | null;
      lastModifiedDate: string | null;
      dateSemantics: "unqualified_provider_metadata";
    }>;
  }[];
  readonly exclusions: readonly {
    readonly reason: string;
    readonly sourceLocator: string;
    readonly count: number;
  }[];
  readonly warnings: readonly string[];
  readonly identity: Readonly<{
    expected: string;
    matched: true;
    sourceValue: string;
    sourceLocator: string;
  }>;
}
export function extractPolicyText(input: PolicyTextInput): ExtractedPolicyText;
