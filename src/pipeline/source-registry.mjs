export function assertSourceRegistrySemantics(sourceRegistry) {
  const sourceIds = new Set();
  const adapterIds = new Set();

  for (const source of sourceRegistry.sources) {
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
