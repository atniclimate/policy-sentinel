import { describe, expect, it } from "vitest";

import {
  SUPREME_COURT_TERM_URL,
  assertSupremeCourtTermIndexUrl,
  buildSupremeCourtTermIndexUrl,
} from "../../../src/adapters/supreme-court-opinions-curated";

describe("Supreme Court curated-opinion query contract", () => {
  it("constructs only the exact reviewed October Term 2018 URL", () => {
    expect(buildSupremeCourtTermIndexUrl().href).toBe(SUPREME_COURT_TERM_URL);
    expect(assertSupremeCourtTermIndexUrl(SUPREME_COURT_TERM_URL).href).toBe(
      SUPREME_COURT_TERM_URL,
    );
  });

  it.each([
    "https://www.supremecourt.gov/opinions/slipopinion/19",
    "https://www.supremecourt.gov/opinions/slipopinion/18/",
    "https://www.supremecourt.gov/opinions/slipopinion/18?term=18",
    "https://www.supremecourt.gov/opinions/slipopinion/18#16-1498",
    "http://www.supremecourt.gov/opinions/slipopinion/18",
    "https://supremecourt.gov/opinions/slipopinion/18",
    "https://www.supremecourt.gov.example.invalid/opinions/slipopinion/18",
    "https://user@www.supremecourt.gov/opinions/slipopinion/18",
    "https://www.supremecourt.gov:444/opinions/slipopinion/18",
  ])("rejects URL drift: %s", (candidate) => {
    expect(() => assertSupremeCourtTermIndexUrl(candidate)).toThrow(
      /differs from the reviewed exact term page/,
    );
  });
});
