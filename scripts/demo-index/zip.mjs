// A small bounded zip reader: the central directory, stored or deflated
// entries, CRC-checked. No zip64, no encryption; anything else is refused.
import { crc32, inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
export const ZIP_LIMITS = Object.freeze({
  maxEntries: 500,
  maxEntryBytes: 400 * 1024 * 1024,
});

/** The zip's entries: [{ name, method, compressedSize, size, crc, offset }]. */
export function listZipEntries(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== LOCAL)
    throw new Error("not a zip archive");
  const floor = Math.max(0, buffer.length - 22 - 0xffff);
  let end = -1;
  for (let i = buffer.length - 22; i >= floor; i -= 1)
    if (buffer.readUInt32LE(i) === EOCD) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("zip end record not found");
  const count = buffer.readUInt16LE(end + 10);
  const size = buffer.readUInt32LE(end + 12);
  let at = buffer.readUInt32LE(end + 16);
  if (count > ZIP_LIMITS.maxEntries)
    throw new Error("zip has too many entries");
  if (at + size > end) throw new Error("zip central directory out of range");
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    if (at + 46 > end || buffer.readUInt32LE(at) !== CENTRAL)
      throw new Error("zip central directory is malformed");
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const crc = buffer.readUInt32LE(at + 16);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const entrySize = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const offset = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    if (flags & 1) throw new Error("zip entry is encrypted");
    if (
      compressedSize === 0xffffffff ||
      entrySize === 0xffffffff ||
      offset === 0xffffffff
    )
      throw new Error("zip64 is not supported");
    entries.push({
      name,
      method,
      compressedSize,
      size: entrySize,
      crc,
      offset,
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** The bytes of one listed entry, inflated and CRC-checked. */
export function readZipEntry(buffer, entry) {
  if (entry.size > ZIP_LIMITS.maxEntryBytes)
    throw new Error("zip entry too large");
  const at = entry.offset;
  if (at + 30 > buffer.length || buffer.readUInt32LE(at) !== LOCAL)
    throw new Error("zip local header is malformed");
  const start =
    at + 30 + buffer.readUInt16LE(at + 26) + buffer.readUInt16LE(at + 28);
  const data = buffer.subarray(start, start + entry.compressedSize);
  if (data.length !== entry.compressedSize)
    throw new Error("zip entry is truncated");
  let bytes;
  if (entry.method === 0) bytes = Buffer.from(data);
  else if (entry.method === 8)
    bytes = inflateRawSync(data, { maxOutputLength: entry.size + 1 });
  else throw new Error(`zip method ${entry.method} is not supported`);
  if (bytes.length !== entry.size) throw new Error("zip entry size mismatch");
  if (crc32(bytes) !== entry.crc) throw new Error("zip entry CRC mismatch");
  return bytes;
}
