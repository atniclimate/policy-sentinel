export const MIN_SPACING_MS: number;
export const USAGE: string;
export class UsageError extends Error {}

export interface AcquireOptions {
  command: "cfr" | "vocab" | "uslm";
  dryRun: boolean;
  keepRaw: boolean;
  title?: number;
  edition?: number;
  volumes?: number[] | null;
  only?: "fr-agencies" | "fr-topics" | null;
  termsRead?: string;
  releasePoint?: string;
  workDir: string | null;
  report: string | null;
  rightsFile: string | null;
  nationNames: string | null;
}
export interface PlannedRequest {
  label: string;
  url: string;
  accept: string;
  types: readonly string[];
  maxBytes: number;
}

export function parseAcquireArgs(argv: readonly string[]): AcquireOptions;
export function planRequests(options: AcquireOptions): PlannedRequest[];
export function installIndexFiles(
  dataDir: string,
  writes: readonly { path: string; bytes: Uint8Array }[],
): void;
export function runAcquire(
  argv: readonly string[],
  deps?: {
    fetch?: (url: string, init?: RequestInit) => Promise<Response>;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    log?: (line: string) => void;
    dataDir?: string;
    repoRoot?: string;
    minSpacingMs?: number;
    /** Tests only: the hash file used when no --nation-names is given. */
    probeHashPath?: string;
  },
): Promise<{
  exitCode: number;
  plan?: PlannedRequest[];
  report?: Record<string, unknown>;
}>;
