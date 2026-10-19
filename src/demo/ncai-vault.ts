/**
 * The encrypted file that carries the NCAI 2026 drafts (D-105). PBKDF2-SHA256
 * turns the shared password into an AES-256-GCM key; the browser opens the file
 * and scripts/ncai-vault.mjs seals it. Only erasable TypeScript and type
 * imports, so Node can load this file directly.
 */
import type { NcaiDraft } from "./ncai-2026";

export interface NcaiVault {
  readonly version: 1;
  readonly kdf: "PBKDF2-SHA256";
  readonly cipher: "AES-256-GCM";
  readonly iterations: number;
  /** Standard base64. */
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

export const NCAI_VAULT_ITERATIONS = 600_000;

export type NcaiVaultErrorCode = "wrong_password" | "bad_vault" | "bad_data";

const MESSAGES: Record<NcaiVaultErrorCode, string> = {
  wrong_password: "The password did not open the NCAI drafts.",
  bad_vault: "The NCAI drafts file is not a valid vault.",
  bad_data: "The NCAI drafts file holds data that is not a draft list.",
};

export class NcaiVaultError extends Error {
  readonly code: NcaiVaultErrorCode;

  constructor(code: NcaiVaultErrorCode, message = MESSAGES[code]) {
    super(message);
    this.name = "NcaiVaultError";
    this.code = code;
  }
}

const VAULT_KEYS = "cipher,ciphertext,iterations,iv,kdf,salt,version";
const AAD = new TextEncoder().encode("policy-sentinel/ncai-2026/v1");
const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const validIterations = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 100_000 &&
  (value as number) <= 10_000_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: unknown): Uint8Array<ArrayBuffer> | undefined {
  if (typeof text !== "string" || !BASE64.test(text)) return undefined;
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: "encrypt" | "decrypt",
): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

/** Encrypts the drafts under the password with a fresh salt and IV. */
export async function sealNcaiDrafts(
  drafts: readonly NcaiDraft[],
  password: string,
  iterations = NCAI_VAULT_ITERATIONS,
): Promise<NcaiVault> {
  if (!password) throw new Error("A password is required to seal the drafts.");
  if (!validIterations(iterations))
    throw new RangeError("Iterations must be an integer from 100000 to 1e7.");
  const plaintext = new TextEncoder().encode(
    JSON.stringify(parseNcaiDrafts(drafts)),
  );
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations, "encrypt");
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD },
    key,
    plaintext,
  );
  return {
    version: 1,
    kdf: "PBKDF2-SHA256",
    cipher: "AES-256-GCM",
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

function readVault(vault: unknown) {
  const v = isPlainObject(vault) ? vault : {};
  const salt = fromBase64(v.salt);
  const iv = fromBase64(v.iv);
  const ciphertext = fromBase64(v.ciphertext);
  if (
    Object.keys(v).sort().join() !== VAULT_KEYS ||
    v.version !== 1 ||
    v.kdf !== "PBKDF2-SHA256" ||
    v.cipher !== "AES-256-GCM" ||
    !validIterations(v.iterations) ||
    salt?.length !== 16 ||
    iv?.length !== 12 ||
    !ciphertext ||
    ciphertext.length < 17
  )
    throw new NcaiVaultError("bad_vault");
  return { iterations: v.iterations, salt, iv, ciphertext };
}

/** Decrypts and checks a vault; every failure is an NcaiVaultError. */
export async function openNcaiDrafts(
  vault: unknown,
  password: string,
): Promise<readonly NcaiDraft[]> {
  const { iterations, salt, iv, ciphertext } = readVault(vault);
  if (!password) throw new NcaiVaultError("wrong_password");
  let key: CryptoKey;
  try {
    key = await deriveKey(password, salt, iterations, "decrypt");
  } catch {
    throw new NcaiVaultError("bad_vault");
  }
  let plaintext: ArrayBuffer;
  try {
    plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: AAD },
      key,
      ciphertext,
    );
  } catch (error) {
    throw new NcaiVaultError(
      error instanceof DOMException && error.name === "OperationError"
        ? "wrong_password"
        : "bad_vault",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
    );
  } catch {
    throw new NcaiVaultError("bad_data");
  }
  return parseNcaiDrafts(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const REQUIRED = ["id", "title", "sponsor", "status"] as const;
const OPTIONAL_TEXT = ["committee", "subcommittee", "note"] as const;
const LISTS = ["topics", "bills", "cases", "names"] as const;
const KNOWN = new Set<string>([...REQUIRED, ...OPTIONAL_TEXT, ...LISTS]);

/** Checks a draft list strictly and copies only the known keys. */
export function parseNcaiDrafts(value: unknown): readonly NcaiDraft[] {
  if (!Array.isArray(value))
    throw new NcaiVaultError("bad_data", "The drafts are not a list.");
  return value.map((item: unknown, index) => {
    const bad = (key: string) =>
      new NcaiVaultError("bad_data", `Draft ${index + 1}: invalid ${key}.`);
    if (!isPlainObject(item)) throw bad("entry");
    const unknown = Object.keys(item).find((key) => !KNOWN.has(key));
    if (unknown !== undefined) throw bad("key");
    const draft: Record<string, string | string[]> = {};
    for (const key of REQUIRED) {
      const field = item[key];
      if (!isText(field)) throw bad(key);
      draft[key] = field;
    }
    for (const key of OPTIONAL_TEXT) {
      const field = item[key];
      if (field === undefined) continue;
      if (typeof field !== "string") throw bad(key);
      draft[key] = field;
    }
    for (const key of LISTS) {
      const field = item[key];
      if (field === undefined) continue;
      if (!Array.isArray(field) || !field.every(isText)) throw bad(key);
      draft[key] = [...field];
    }
    return draft as unknown as NcaiDraft;
  });
}
