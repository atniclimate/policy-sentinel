import type { SourceRegistryV2 } from "../core/public-contract-v2.mjs";
import type { SourceRegistry } from "../shared/contracts";

export function assertSourceRegistrySemantics<
  T extends SourceRegistry | SourceRegistryV2,
>(sourceRegistry: T): T;
