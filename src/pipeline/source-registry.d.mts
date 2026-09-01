import type { SourceRegistry } from "../shared/contracts";

export function assertSourceRegistrySemantics<T extends SourceRegistry>(
  sourceRegistry: T,
): T;
