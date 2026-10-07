import {
  parseJurisdictionRegistry,
  parseJurisdictionSchemaInput,
} from "./registry";
import type { JurisdictionEvidence, JurisdictionRef } from "./registry";

/** A declared synthetic association, not an official authority determination. */
export interface JurisdictionAssociation {
  readonly $schema: string;
  readonly schemaVersion: "1.0.0";
  readonly synthetic: true;
  readonly recordRef: string;
  readonly jurisdictionRef: JurisdictionRef;
  readonly basis: "issuing_authority" | "source_stated_scope";
  readonly evidence: JurisdictionEvidence;
  readonly reviewState: "unreviewed" | "reviewed" | "rejected";
}

function refuse(code: string): never {
  throw new TypeError(`GD09_ASSOCIATION_${code}`);
}

/**
 * Parse two bounded JSON strings without inspecting caller-owned objects.
 * Registry membership resolves the target only; body members never inherit it.
 */
export function parseJurisdictionAssociation(
  jsonText: unknown,
  registryJsonText: unknown,
): Readonly<JurisdictionAssociation> {
  // The shared helper validates the closed schema and returns a deeply frozen
  // JSON snapshot. This cast conveys structural shape only, before semantics.
  const association = parseJurisdictionSchemaInput(
    jsonText,
    "association",
  ) as JurisdictionAssociation;
  const registry = parseJurisdictionRegistry(registryJsonText);
  const target = registry.entries.find(
    (entry) => entry.ref === association.jurisdictionRef,
  );
  if (!target) refuse("UNKNOWN_TARGET");

  const exactSubject = association.evidence.exactSubject;
  if (
    exactSubject &&
    (exactSubject.recordRef !== association.recordRef ||
      exactSubject.ref !== association.jurisdictionRef)
  ) {
    refuse("EXACT_SUBJECT_MISMATCH");
  }
  if (
    target.kind === "nation" &&
    (association.reviewState !== "reviewed" || !exactSubject)
  ) {
    refuse("NATION_REQUIRES_REVIEWED_EXACT_SUBJECT");
  }
  return association;
}
