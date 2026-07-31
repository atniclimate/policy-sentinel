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

export const STATIC_ARTIFACT_BUDGET_V1: Readonly<StaticArtifactBudget>;

export function generateSyntheticNations(): Nation[];

export function createArtifactDocuments(input: {
  records: PolicyRecord[];
  nations: Nation[];
  taxonomy: TaxonomyConfig;
  sourceRegistry: SourceRegistry;
  generatedAt: string;
  synthetic?: boolean;
  artifactBudget?: StaticArtifactBudget;
  sourceHealth?: SourceHealth[];
}): Map<string, unknown>;

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
