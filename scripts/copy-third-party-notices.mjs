// Copies THIRD-PARTY-NOTICES.md byte for byte into the Pages artifact as
// docs/THIRD-PARTY-NOTICES.txt, so Pages serves it as plain text (T1.8).
// The demo build calls copyThirdPartyNotices(); run directly, it copies once.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const NOTICES_SOURCE = "THIRD-PARTY-NOTICES.md";
export const NOTICES_TARGET = "docs/THIRD-PARTY-NOTICES.txt";

/** Returns the absolute path written. Throws if the source is missing. */
export function copyThirdPartyNotices(root = REPO) {
  const to = join(root, NOTICES_TARGET);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(root, NOTICES_SOURCE), to);
  return to;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(`Copied ${NOTICES_SOURCE} to ${copyThirdPartyNotices()}`);
}
