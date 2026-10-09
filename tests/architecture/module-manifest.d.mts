export type ModuleName = "core" | "intake" | "context" | "output" | "private";

export const MODULES: readonly ModuleName[];

export const PRIVATE_MODULE_FILES: readonly string[];
export const PRIVATE_BARREL_PATH: string;
export const PUBLIC_ENTRY_PATHS: readonly string[];
export const COMPOSITION_ROOT_PATHS: readonly string[];
export const COMPOSITION_DECLARATION_PATHS: readonly string[];

export interface LegacyFacadeBinding {
  readonly target: string;
  readonly resolvedTargets: readonly string[];
  readonly importedName: string;
  readonly exportedName: string;
  readonly typeOnly: boolean;
}

export const LEGACY_FACADE_BINDINGS: Readonly<
  Record<string, readonly LegacyFacadeBinding[]>
>;

export function isOutsideEveryModule(repoPath: string): boolean;
export function isCompositionRoot(repoPath: string): boolean;
export function isCompositionDeclaration(repoPath: string): boolean;
export function isPrivateModuleFile(repoPath: string): boolean;
export function isPrivateBarrel(repoPath: string): boolean;
export function isForbiddenFromPublicEntry(repoPath: string): boolean;
export function moduleOf(repoPath: string): ModuleName | null;
export function isOutputLocalWorkbenchPath(repoPath: string): boolean;

export function isAllowedModuleEdge(edge: {
  fromModule: ModuleName | null;
  fromPath: string;
  toModule: ModuleName | null;
}): boolean;

export interface AllowlistedViolation {
  readonly from: string;
  readonly to: string;
  readonly note: string;
}

export const ALLOWLISTED_VIOLATIONS: readonly AllowlistedViolation[];
