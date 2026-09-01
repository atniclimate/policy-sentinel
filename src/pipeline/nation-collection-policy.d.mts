import type { NationCollection } from "../shared/contracts";

export const EXPECTED_NATION_COUNT: 575;

export class NationCollectionPolicyError extends Error {
  readonly issues: string[];
}

export function validateNationCollectionPolicy(
  document: unknown,
  options: { manifestSynthetic: boolean },
): string[];

export function assertNationCollectionPolicy<T extends NationCollection>(
  document: T,
  options: { manifestSynthetic: boolean },
): T;
