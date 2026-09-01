import { describe, expect, it } from "vitest";

import {
  GOIA_ACCORD_URL,
  assertGoiaAccordUrl,
  buildGoiaAccordUrl,
} from "../../../src/adapters/washington-centennial-accord";

describe("GOIA Centennial Accord exact query contract", () => {
  it("constructs only the literal canonical HTTPS page", () => {
    expect(buildGoiaAccordUrl().href).toBe(GOIA_ACCORD_URL);
    expect(assertGoiaAccordUrl(GOIA_ACCORD_URL).href).toBe(GOIA_ACCORD_URL);
  });

  it.each([
    "http://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord",
    "https://user@goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord",
    "https://goia.wa.gov:443/state-tribal-relations-centennial-accord/centennial-accord",
    `${GOIA_ACCORD_URL}?page=1`,
    `${GOIA_ACCORD_URL}#accord`,
    `${GOIA_ACCORD_URL}/`,
    "https://www.goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord",
  ])("rejects URL drift: %s", (url) => {
    expect(() => assertGoiaAccordUrl(url)).toThrow(/differs/);
  });
});
