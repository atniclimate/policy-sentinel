export function serializeJson(value: unknown): string;
export function sha256Bytes(value: string | Uint8Array): string;
export function hashJson(value: unknown): {
  readonly content: string;
  readonly sha256: string;
  readonly sizeBytes: number;
};
export function deriveBuildId(
  assets: readonly { readonly path: string; readonly sha256: string }[],
): string;
