import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashJson(value) {
  const content = serializeJson(value);
  return {
    content,
    sha256: sha256Bytes(Buffer.from(content, "utf8")),
    sizeBytes: Buffer.byteLength(content, "utf8"),
  };
}

export function deriveBuildId(assets) {
  const identity = assets
    .map(({ path, sha256 }) => `${path}\u0000${sha256}`)
    .sort()
    .join("\n");
  return `synthetic-${sha256Bytes(identity).slice(0, 20)}`;
}
