export type JurisdictionRef =
  | "us"
  | `us-state:${string}`
  | `us-county:${string}`
  | `nation:${string}`
  | `body:${string}`;
export const US_STATE_CODES: readonly string[];
export interface JurisdictionEvidence {
  readonly url: string;
  readonly locator: string;
  readonly exactSubject?: {
    readonly recordRef: string;
    readonly ref: JurisdictionRef;
    readonly text: string;
  };
}
export interface JurisdictionAssociation {
  readonly jurisdictionRef: JurisdictionRef;
  readonly basis: "issuing_authority" | "source_stated_scope";
  readonly evidence: JurisdictionEvidence;
  readonly reviewState: "unreviewed" | "reviewed" | "rejected";
}
export function isJurisdictionRef(value: unknown): value is JurisdictionRef;
/** Shape validation only. Callers independently verify source text and authority. */
export function parseJurisdictionAssociation(
  jsonText: unknown,
  expectedRecordRef: string,
): Readonly<JurisdictionAssociation>;

export const US_STATE_NAMES: Readonly<Record<string, string>>;
export function hasStateJurisdictionEvidence(
  ref: unknown,
  sourceText: unknown,
): boolean;
