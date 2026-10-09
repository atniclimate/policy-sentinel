import { describe, expect, it } from "vitest";
import taxonomy from "../../config/taxonomy.v1.json";
import { mapOfficialSubjects } from "../../src/modules/context/official-subject-mapping.mjs";
import type { TaxonomyConfig } from "../../src/shared/contracts";

const configured = taxonomy as TaxonomyConfig;
const source = {
  id: "synthetic-federal",
  officialSubjectMappings: ["synthetic-federal-forestry-v1"],
};
const subject = {
  scheme: "synthetic-official-topic",
  label: "Synthetic Forestry",
  sourceUrl: "https://synthetic-federal.invalid/instrument",
};

describe("exact official subject mapping", () => {
  it("preserves source and versioned mapping evidence without mutating inputs", () => {
    const before = JSON.stringify([configured, source, subject]);
    const result = mapOfficialSubjects(configured, source, [subject, subject]);
    expect(result.isUnclassified).toBe(false);
    expect(result.taxonomyMemberships).toEqual([
      {
        categoryId: "natural-resources-conservation-wildlife",
        subcategoryId: "forestry-land-management",
        mappingRuleId: "synthetic-federal-forestry-v1",
        taxonomyVersion: "1.0.0",
        officialSubjectLabels: [subject.label],
      },
    ]);
    expect(result.mappingEvidence).toEqual([
      {
        mappingRuleId: "synthetic-federal-forestry-v1",
        taxonomyVersion: "1.0.0",
        sourceId: source.id,
        officialSubject: subject,
        mappingProvenance:
          configured.mappingPolicy.sourceMappings[0].provenance,
      },
    ]);
    result.mappingEvidence[0].officialSubject.label = "changed";
    expect(JSON.stringify([configured, source, subject])).toBe(before);
  });

  it("keeps wrong source, scheme, case, whitespace, partial and missing labels unclassified", () => {
    for (const candidate of [
      { ...subject, scheme: "different" },
      { ...subject, label: "synthetic forestry" },
      { ...subject, label: "Synthetic Forestry " },
      { ...subject, label: "Forestry" },
      { ...subject, label: "Synthetic Forestry and Wildlife" },
    ])
      expect(
        mapOfficialSubjects(configured, source, [candidate]).isUnclassified,
      ).toBe(true);
    expect(
      mapOfficialSubjects(configured, { ...source, id: "different" }, [subject])
        .isUnclassified,
    ).toBe(true);
    expect(mapOfficialSubjects(configured, source, []).isUnclassified).toBe(
      true,
    );
    expect(
      mapOfficialSubjects(
        configured,
        { ...source, officialSubjectMappings: [] },
        [subject],
      ).isUnclassified,
    ).toBe(true);
  });

  it("refuses unreviewed mappings and invalid targets while preserving many-to-many assignments", () => {
    const input = structuredClone(configured);
    const rule = input.mappingPolicy.sourceMappings[0];
    rule.provenance.validationState = "pending";
    expect(mapOfficialSubjects(input, source, [subject]).isUnclassified).toBe(
      true,
    );
    rule.provenance.validationState = "validated";
    rule.targets.push({ categoryId: "climate-energy-policy" });
    expect(
      mapOfficialSubjects(input, source, [subject]).taxonomyMemberships,
    ).toHaveLength(2);
    rule.targets.push({ categoryId: "missing" });
    expect(() => mapOfficialSubjects(input, source, [subject])).toThrow(
      "unknown target",
    );
  });
});
