/** Immutable sorted union of normalized protected key spellings. */
export const PROTECTED_KEYS: readonly string[];
/** Lowercase and remove every character outside ASCII letters and digits. */
export function normalizeProtectedKey(key: string): string;
export function isProtectedKey(key: string): boolean;
/** Reject protected own keys recursively; accessor properties fail closed. */
export function rejectProtectedKeys(value: unknown): void;
