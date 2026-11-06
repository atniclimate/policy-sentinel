import type { Buffer } from "node:buffer";

export const ZIP_LIMITS: Readonly<{
  maxEntries: number;
  maxEntryBytes: number;
}>;
export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  crc: number;
  offset: number;
}
export function listZipEntries(buffer: Buffer): ZipEntry[];
export function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer;
