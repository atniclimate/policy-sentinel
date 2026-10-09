import type { NationV2 } from "../core/public-contract-v2.mjs";
import type { NationCollection } from "../shared/contracts";

export const EXPECTED_NATION_COUNT: 575;

export class NationCollectionPolicyError extends Error {
  readonly issues: string[];
}

export function validateNationCollectionPolicy(
  document: unknown,
  options: { manifestSynthetic: boolean },
): string[];

export function assertNationCollectionPolicy<
  T extends
    | NationCollection
    | (Omit<NationCollection, "schemaVersion" | "nations"> & {
        schemaVersion: "2.0.0";
        nations: NationV2[];
      }),
>(document: T, options: { manifestSynthetic: boolean }): T;
