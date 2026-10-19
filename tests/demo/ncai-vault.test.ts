// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { NcaiDraft } from "../../src/demo/ncai-2026";
import {
  NcaiVaultError,
  openNcaiDrafts,
  parseNcaiDrafts,
  sealNcaiDrafts,
  type NcaiVault,
} from "../../src/demo/ncai-vault";
// @ts-expect-error vault script has no declaration file
import { checkNcaiDrafts } from "../../scripts/ncai-vault.mjs";

const PASSWORD = "synthetic-test-passphrase";
const ITERATIONS = 100_000;
const DRAFTS: readonly NcaiDraft[] = [
  {
    id: "PSC-26-001",
    title: "Example draft on water",
    sponsor: "Example Tribe",
    status: "Do Pass",
    committee: "Example Committee",
    topics: ["water quality"],
    bills: ["hr 1234"],
    names: ["Example Tribe"],
  },
  {
    id: "PSC-26-002",
    title: "Example draft on forests",
    sponsor: "Example Council",
    status: "Pending",
    note: "Synthetic note.",
    cases: ['"example forest"'],
  },
];

async function code(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(NcaiVaultError);
  return (error as NcaiVaultError).code;
}

function parseCode(value: unknown) {
  try {
    parseNcaiDrafts(value);
  } catch (error) {
    return (error as NcaiVaultError).code;
  }
  return "parsed";
}

describe("NCAI drafts vault", () => {
  let vault: NcaiVault;
  beforeAll(async () => {
    vault = await sealNcaiDrafts(DRAFTS, PASSWORD, ITERATIONS);
  });
  afterEach(() => vi.restoreAllMocks());

  it("opens what it seals", async () => {
    expect(vault).toMatchObject({
      version: 1,
      kdf: "PBKDF2-SHA256",
      cipher: "AES-256-GCM",
      iterations: ITERATIONS,
    });
    expect(JSON.stringify(vault)).not.toContain("Example");
    expect(await openNcaiDrafts(vault, PASSWORD)).toEqual(DRAFTS);
  });

  it("refuses a wrong or empty password", async () => {
    expect(await code(openNcaiDrafts(vault, "not-the-password"))).toBe(
      "wrong_password",
    );
    expect(await code(openNcaiDrafts(vault, ""))).toBe("wrong_password");
  });

  it("refuses a tampered ciphertext", async () => {
    const bytes = Buffer.from(vault.ciphertext, "base64");
    bytes[0] ^= 1;
    const tampered = { ...vault, ciphertext: bytes.toString("base64") };
    expect(await code(openNcaiDrafts(tampered, PASSWORD))).toBe(
      "wrong_password",
    );
  });

  it.each([
    ["importKey", "OperationError", "bad_vault"],
    ["importKey", "NotSupportedError", "bad_vault"],
    ["deriveKey", "OperationError", "bad_vault"],
    ["deriveKey", "NotSupportedError", "bad_vault"],
    ["decrypt", "OperationError", "wrong_password"],
    ["decrypt", "InvalidAccessError", "bad_vault"],
  ] as const)("reports %s %s as %s", async (method, name, expected) => {
    vi.spyOn(globalThis.crypto.subtle, method).mockRejectedValueOnce(
      new DOMException("Synthetic crypto failure", name),
    );
    expect(await code(openNcaiDrafts(vault, PASSWORD))).toBe(expected);
  });

  it("reports an unexpected decrypt failure as bad_vault", async () => {
    vi.spyOn(globalThis.crypto.subtle, "decrypt").mockRejectedValueOnce(
      new Error("Synthetic crypto failure"),
    );
    expect(await code(openNcaiDrafts(vault, PASSWORD))).toBe("bad_vault");
  });

  it.each([
    ["invalid JSON", new TextEncoder().encode("not JSON")],
    ["a non-draft value", new TextEncoder().encode('{"drafts":[]}')],
    ["invalid UTF-8", new Uint8Array([0xff])],
  ])("reports bad_data after decrypting %s", async (_, plaintext) => {
    const encrypt = globalThis.crypto.subtle.encrypt.bind(
      globalThis.crypto.subtle,
    );
    vi.spyOn(globalThis.crypto.subtle, "encrypt").mockImplementationOnce(
      (algorithm, key) => encrypt(algorithm, key, plaintext),
    );
    const malformed = await sealNcaiDrafts(DRAFTS, PASSWORD, ITERATIONS);
    expect(await code(openNcaiDrafts(malformed, PASSWORD))).toBe("bad_data");
  });

  it.each([
    ["not an object", () => null],
    ["wrong version", (v: NcaiVault) => ({ ...v, version: 2 })],
    ["extra key", (v: NcaiVault) => ({ ...v, extra: "unexpected" })],
    [
      "missing field",
      (v: NcaiVault) =>
        Object.fromEntries(Object.entries(v).filter(([k]) => k !== "salt")),
    ],
    ["bad base64", (v: NcaiVault) => ({ ...v, iv: "not base64!" })],
    ["low iterations", (v: NcaiVault) => ({ ...v, iterations: 1_000 })],
    ["high iterations", (v: NcaiVault) => ({ ...v, iterations: 20_000_000 })],
    [
      "short iv",
      (v: NcaiVault) => ({ ...v, iv: Buffer.alloc(8).toString("base64") }),
    ],
    [
      "short ciphertext",
      (v: NcaiVault) => ({
        ...v,
        ciphertext: Buffer.alloc(16).toString("base64"),
      }),
    ],
  ])("rejects a malformed vault: %s", async (_, change) => {
    expect(await code(openNcaiDrafts(change(vault), PASSWORD))).toBe(
      "bad_vault",
    );
  });

  it("uses a fresh salt and IV for every seal", async () => {
    const again = await sealNcaiDrafts(DRAFTS, PASSWORD, ITERATIONS);
    expect(again.salt).not.toBe(vault.salt);
    expect(again.iv).not.toBe(vault.iv);
    expect(again.ciphertext).not.toBe(vault.ciphertext);
  });

  it("refuses to seal without a password", async () => {
    await expect(sealNcaiDrafts(DRAFTS, "", ITERATIONS)).rejects.toThrow(
      "A password is required",
    );
  });

  it.each([99_999, 10_000_001, 100_000.5, NaN])(
    "refuses to seal with invalid iterations: %s",
    async (iterations) => {
      await expect(
        sealNcaiDrafts(DRAFTS, PASSWORD, iterations),
      ).rejects.toThrow(RangeError);
    },
  );

  it("refuses to seal malformed drafts", async () => {
    expect(
      await code(
        sealNcaiDrafts([{ ...DRAFTS[0], title: "" }], PASSWORD, ITERATIONS),
      ),
    ).toBe("bad_data");
  });
});

describe("NCAI draft parsing", () => {
  const base = DRAFTS[1];

  it.each([
    ["unknown key", [{ ...base, extra: "x" }]],
    ["number title", [{ ...base, title: 7 }]],
    ["non-array", { drafts: [base] }],
    ["empty id", [{ ...base, id: "" }]],
    ["empty list entry", [{ ...base, topics: [""] }]],
    ...["committee", "subcommittee", "note"].map<[string, unknown]>((key) => [
      `non-text ${key}`,
      [{ ...base, [key]: 7 }],
    ]),
    ...["topics", "bills", "cases", "names"].flatMap<[string, unknown]>(
      (key) => [
        [`non-list ${key}`, [{ ...base, [key]: "not a list" }]],
        [`non-text ${key} entry`, [{ ...base, [key]: [7] }]],
      ],
    ),
  ])("rejects %s as bad data", (_, value) => {
    expect(parseCode(value)).toBe("bad_data");
  });
});

describe("checkNcaiDrafts", () => {
  it("counts the searches and court links of a valid set", () => {
    expect(checkNcaiDrafts(DRAFTS)).toEqual({
      drafts: 2,
      searches: 7,
      links: 4,
    });
  });

  it.each([
    ["duplicate id", [DRAFTS[0], { ...DRAFTS[1], id: "PSC-26-001" }], /unique/],
    ["long query", [{ ...DRAFTS[1], topics: ["x".repeat(201)] }], /200/],
    ["malformed bill", [{ ...DRAFTS[0], bills: ["H.R. 12"] }], /bill/],
  ])("rejects a %s", (_, drafts, rule) => {
    expect(() => checkNcaiDrafts(drafts)).toThrow(rule);
  });
});
