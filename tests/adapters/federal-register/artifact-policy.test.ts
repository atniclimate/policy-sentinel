import { describe, expect, it } from "vitest";

import {
  FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY,
  assertFederalRegisterPublicArtifactRange,
  federalRegisterArtifactCoverageNotes,
  federalRegisterPublicArtifactRange,
} from "../../../src/adapters/federal-register/artifact-policy";

const documentedCoverage = {
  from: "1994-01-03",
  through: null,
} as const;

describe("Federal Register public artifact policy", () => {
  it("selects an inclusive rolling 31-calendar-day UTC window", () => {
    expect(
      federalRegisterPublicArtifactRange(
        "2026-07-31T23:59:59.000Z",
        documentedCoverage,
      ),
    ).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
    expect(FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY).toMatchObject({
      rollingCalendarDays: 31,
      maximumCandidateDocuments: 4_000,
    });
  });

  it("handles leap days and clamps to the documented source start", () => {
    expect(
      federalRegisterPublicArtifactRange(
        "2024-03-15T00:00:00.000Z",
        documentedCoverage,
      ),
    ).toEqual({
      start: "2024-02-14",
      end: "2024-03-15",
    });
    expect(
      federalRegisterPublicArtifactRange(
        "1994-01-10T12:00:00.000Z",
        documentedCoverage,
      ),
    ).toEqual({
      start: "1994-01-03",
      end: "1994-01-10",
    });
  });

  it("rejects oversized or out-of-coverage normalization ranges", () => {
    expect(() =>
      assertFederalRegisterPublicArtifactRange(
        { start: "2026-06-30", end: "2026-07-31" },
        documentedCoverage,
      ),
    ).toThrow(/rolling-window policy/);
    expect(() =>
      assertFederalRegisterPublicArtifactRange(
        { start: "1994-01-01", end: "1994-01-03" },
        documentedCoverage,
      ),
    ).toThrow(/outside documented source coverage/);
  });

  it("labels emitted coverage as a bounded slice rather than full history", () => {
    const notes = federalRegisterArtifactCoverageNotes({
      start: "2026-07-01",
      end: "2026-07-31",
    });
    expect(notes).toContain("bounded rolling beta slice");
    expect(notes).toContain("not complete 1994-present coverage");
    expect(notes).toContain(FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.id);
  });
});
