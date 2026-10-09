/** Map validated source labels only; title, body and analyst text are not inputs. */
export function mapOfficialSubjects(taxonomy, source, officialSubjects) {
  const memberships = [];
  const evidence = [];
  const seen = new Set();
  const categories = new Map(
    taxonomy.categories.map((category) => [
      category.id,
      new Set(category.subcategories.map(({ id }) => id)),
    ]),
  );
  for (const rule of taxonomy.mappingPolicy.sourceMappings) {
    if (
      rule.sourceId !== source.id ||
      rule.provenance.validationState !== "validated" ||
      !source.officialSubjectMappings.includes(rule.id)
    )
      continue;
    for (const subject of officialSubjects) {
      if (
        subject.scheme !== rule.officialSubjectScheme ||
        subject.label !== rule.officialSubjectValue
      )
        continue;
      for (const target of rule.targets) {
        if (
          !categories.has(target.categoryId) ||
          (target.subcategoryId !== undefined &&
            !categories.get(target.categoryId).has(target.subcategoryId))
        )
          throw new TypeError("Official subject mapping has an unknown target");
        const key = JSON.stringify([
          rule.id,
          target.categoryId,
          target.subcategoryId ?? null,
        ]);
        if (seen.has(key)) continue;
        seen.add(key);
        memberships.push({
          categoryId: target.categoryId,
          subcategoryId: target.subcategoryId ?? null,
          mappingRuleId: rule.id,
          taxonomyVersion: taxonomy.taxonomyVersion,
          officialSubjectLabels: [subject.label],
        });
        evidence.push({
          mappingRuleId: rule.id,
          taxonomyVersion: taxonomy.taxonomyVersion,
          sourceId: source.id,
          officialSubject: { ...subject },
          mappingProvenance: { ...rule.provenance },
        });
      }
    }
  }
  return {
    taxonomyMemberships: memberships,
    isUnclassified: memberships.length === 0,
    mappingEvidence: evidence,
  };
}
