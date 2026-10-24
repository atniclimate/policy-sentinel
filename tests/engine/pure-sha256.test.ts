import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../src/engine/pure-sha256.mjs";

describe("pure SHA-256", () => {
  it("matches node:crypto across padding boundaries for typed and plain byte arrays", () => {
    for (const length of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const bytes = Uint8Array.from(
        { length },
        (_, index) => (index * 37) % 256,
      );
      const expected = createHash("sha256").update(bytes).digest("hex");
      expect(sha256Hex(bytes), `length ${length}`).toBe(expected);
      expect(sha256Hex([...bytes]), `length ${length}`).toBe(expected);
    }
  });
});
