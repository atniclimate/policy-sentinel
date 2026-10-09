import type {
  PolicyRecordV2,
  SourceRegistryV2,
  NationV2,
} from "../core/public-contract-v2.mjs";
import type {
  ArtifactManifest,
  Nation,
  PolicyRecord,
  SourceRegistry,
  SourceHealth,
  TaxonomyConfig,
} from "../shared/contracts";

export interface StaticArtifactBudget {
  version: "1.0.0";
  maxIndexBytes: number;
  maxInitialNonDetailBytes: number;
  maxIndividualDetailBytes: number;
  maxAllDetailsBytes: number;
  maxTotalAssetsBytes: number;
}

export interface ArtifactManifestLimits {
  version: "1.0.0";
  maxManifestBytes: number;
  maxHashedAssets: number;
}

export const STATIC_ARTIFACT_BUDGET_V1: Readonly<StaticArtifactBudget>;
export const ARTIFACT_MANIFEST_LIMITS_V1: Readonly<ArtifactManifestLimits>;

export function generateSyntheticNations(): Nation[];

export function createArtifactDocuments(input: {
  records: Array<PolicyRecord | PolicyRecordV2>;
  nations: Array<Nation | NationV2>;
  taxonomy: TaxonomyConfig;
  sourceRegistry: SourceRegistry | SourceRegistryV2;
  generatedAt: string;
  synthetic?: boolean;
  artifactBudget?: StaticArtifactBudget;
  manifestLimits?: ArtifactManifestLimits;
  sourceHealth?: SourceHealth[];
}): Map<string, unknown>;

export function assertArtifactManifestLimits(
  manifest: Pick<ArtifactManifest, "assets"> & Record<string, unknown>,
  limits?: ArtifactManifestLimits,
): {
  manifestBytes: number;
  hashedAssetCount: number;
};

export function assertStaticArtifactBudget(
  assets: ArtifactManifest["assets"],
  budget?: StaticArtifactBudget,
): {
  indexBytes: number;
  initialNonDetailBytes: number;
  maximumIndividualDetailBytes: number;
  allDetailsBytes: number;
  totalAssetsBytes: number;
};
