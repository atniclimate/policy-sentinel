import {
  canonicalizeJson,
  canonicalJsonDigest,
  createInstrumentId,
} from "../assertions";
import type { SourceQualifiedIdentity } from "../assertions";
import {
  LIFECYCLE_CONTRACT_VERSION,
  type InstrumentReference,
  type LifecycleReference,
  type RelationshipType,
} from "./types";

function requireSortedUniqueFactIds(
  evidenceFactIds: readonly string[],
): readonly string[] {
  const sorted = [...evidenceFactIds].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  if (sorted.some((factId, index) => factId === sorted[index - 1])) {
    throw new TypeError("evidence fact IDs must be unique");
  }
  if (sorted.some((factId) => factId.length === 0)) {
    throw new TypeError("evidence fact IDs must not contain empty strings");
  }
  return sorted;
}

function requireIdentity(identity: SourceQualifiedIdentity): void {
  if (identity.sourceId.length === 0 || identity.sourceRecordId.length === 0) {
    throw new TypeError("source-qualified identity fields must not be empty");
  }
}

function normalizedReference(
  reference: LifecycleReference,
): LifecycleReference {
  requireIdentity(reference.sourceIdentity);
  if (reference.instrumentId !== createInstrumentId(reference.sourceIdentity)) {
    throw new TypeError("reference instrument ID does not replay");
  }
  if (
    reference.entityType === "instrument_version" &&
    reference.versionId.length === 0
  ) {
    throw new TypeError("reference version ID must not be empty");
  }
  return reference;
}

export function createEquivalenceAssertionId(
  left: InstrumentReference,
  right: InstrumentReference,
  evidenceFactIds: readonly string[],
): string {
  const endpoints = [
    normalizedReference(left),
    normalizedReference(right),
  ].sort((first, second) => {
    const firstBytes = canonicalizeJson(first);
    const secondBytes = canonicalizeJson(second);
    return firstBytes < secondBytes ? -1 : firstBytes > secondBytes ? 1 : 0;
  });
  const digest = canonicalJsonDigest({
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    assertionType: "equivalence",
    endpoints,
    evidenceFactIds: requireSortedUniqueFactIds(evidenceFactIds),
  });
  return `k0:equivalence:${digest}`;
}

type RelationshipEndpoints =
  | {
      subject: LifecycleReference;
      affected: LifecycleReference;
    }
  | { affected: LifecycleReference };

export function createRelationshipAssertionId(
  relationshipType: RelationshipType,
  endpoints: RelationshipEndpoints,
  evidenceFactIds: readonly string[],
): string {
  const normalizedEndpoints =
    "subject" in endpoints
      ? {
          subject: normalizedReference(endpoints.subject),
          affected: normalizedReference(endpoints.affected),
        }
      : { affected: normalizedReference(endpoints.affected) };
  const digest = canonicalJsonDigest({
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    assertionType: relationshipType,
    endpoints: normalizedEndpoints,
    evidenceFactIds: requireSortedUniqueFactIds(evidenceFactIds),
  });
  return `k0:relationship:${digest}`;
}
