import { publicJurisdictionAssociation } from "../core/public-contract-v2.mjs";

export function assertSourceRegistrySemantics(sourceRegistry) {
  const sourceIds = new Set();
  const adapterIds = new Set();

  for (const source of sourceRegistry.sources) {
    if (sourceRegistry.schemaVersion === "2.0.0") {
      const association = publicJurisdictionAssociation(
        source.jurisdiction,
        source.id,
      );
      if (source.enabled && association.reviewState !== "reviewed")
        throw new Error("enabled source jurisdiction must be reviewed");
      if (
        association.jurisdictionRef.startsWith("nation:") &&
        !source.synthetic
      )
        throw new Error("real Nation registry binding is not enabled");
      if (
        association.reviewState === "reviewed" &&
        source.access.accessedOn &&
        source.jurisdiction.review.reviewedAt.slice(0, 10) <
          source.access.accessedOn
      )
        throw new Error(
          "source jurisdiction review precedes documentation access",
        );
      if (
        !source.access.allowedHosts.includes(
          new globalThis.URL(association.evidence.url).hostname,
        )
      )
        throw new Error(
          "source jurisdiction evidence is outside registered hosts",
        );
    }
    if (sourceIds.has(source.id)) {
      throw new Error(`duplicate source registry ID: ${source.id}`);
    }
    sourceIds.add(source.id);

    if (source.adapter === null) {
      continue;
    }
    if (adapterIds.has(source.adapter.id)) {
      throw new Error(`duplicate adapter ID: ${source.adapter.id}`);
    }
    adapterIds.add(source.adapter.id);
  }

  return sourceRegistry;
}
