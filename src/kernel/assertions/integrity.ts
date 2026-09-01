export type IntegrityReplayFailure =
  "fact_digest_mismatch" | "bundle_digest_mismatch";

/**
 * A typed integrity failure keeps digest replay distinct from structural or
 * semantic contract rejection. Consumers must not classify errors by message.
 */
export class IntegrityReplayError extends TypeError {
  readonly failure: IntegrityReplayFailure;

  constructor(failure: IntegrityReplayFailure, path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "IntegrityReplayError";
    this.failure = failure;
  }
}

export function isIntegrityReplayError(
  value: unknown,
): value is IntegrityReplayError {
  return value instanceof IntegrityReplayError;
}
