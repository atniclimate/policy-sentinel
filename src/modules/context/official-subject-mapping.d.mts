import type {
  DeterministicMappingRule,
  OfficialSubject,
  TaxonomyConfig,
  TaxonomyMembership,
} from "../../shared/contracts";

export function mapOfficialSubjects(
  taxonomy: TaxonomyConfig,
  source: { id: string; officialSubjectMappings: readonly string[] },
  officialSubjects: readonly OfficialSubject[],
): {
  taxonomyMemberships: TaxonomyMembership[];
  isUnclassified: boolean;
  mappingEvidence: Array<{
    mappingRuleId: string;
    taxonomyVersion: string;
    sourceId: string;
    officialSubject: OfficialSubject;
    mappingProvenance: DeterministicMappingRule["provenance"];
  }>;
};
