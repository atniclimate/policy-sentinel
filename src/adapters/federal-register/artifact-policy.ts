import type { SourceConfig } from "../../shared/contracts";
import {
  assertFederalRegisterDateRange,
  type FederalRegisterDateRange,
} from "./query-contract";

export const FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY = {
  id: "federal-register-public-artifact-window-v1",
  version: "1.0.0",
  rollingCalendarDays: 31,
  maximumCandidateDocuments: 4_000,
} as const;

function normalizedUtcDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `Federal Register artifact policy received an invalid date: ${value}`,
    );
  }
  return parsed;
}

export function federalRegisterPublicArtifactRange(
  generatedAt: string,
  coverage: Pick<SourceConfig["coverage"], "from" | "through">,
): FederalRegisterDateRange {
  const parsedGeneratedAt = new Date(generatedAt);
  if (
    Number.isNaN(parsedGeneratedAt.getTime()) ||
    parsedGeneratedAt.toISOString() !== generatedAt
  ) {
    throw new Error(
      "Federal Register artifact range requires a normalized UTC build time.",
    );
  }
  if (coverage.from === null) {
    throw new Error(
      "Federal Register source registration lacks a reviewed coverage start.",
    );
  }

  const generatedDate = generatedAt.slice(0, 10);
  const end =
    coverage.through !== null && coverage.through < generatedDate
      ? coverage.through
      : generatedDate;
  const rollingStart = normalizedUtcDate(end);
  rollingStart.setUTCDate(
    rollingStart.getUTCDate() -
      (FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.rollingCalendarDays - 1),
  );
  const rollingStartDate = rollingStart.toISOString().slice(0, 10);
  const start =
    coverage.from > rollingStartDate ? coverage.from : rollingStartDate;
  if (start > end) {
    throw new Error(
      "Federal Register coverage range is empty at the build time.",
    );
  }
  return assertFederalRegisterDateRange({ start, end });
}

export function assertFederalRegisterPublicArtifactRange(
  range: FederalRegisterDateRange,
  coverage: Pick<SourceConfig["coverage"], "from" | "through">,
): FederalRegisterDateRange {
  const validated = assertFederalRegisterDateRange(range);
  if (
    coverage.from === null ||
    validated.start < coverage.from ||
    (coverage.through !== null && validated.end > coverage.through)
  ) {
    throw new Error(
      "Federal Register artifact range falls outside documented source coverage.",
    );
  }
  const start = normalizedUtcDate(validated.start);
  const end = normalizedUtcDate(validated.end);
  const calendarDays =
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (
    calendarDays > FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.rollingCalendarDays
  ) {
    throw new Error(
      "Federal Register artifact range exceeds the versioned rolling-window policy.",
    );
  }
  return validated;
}

export function federalRegisterArtifactCoverageNotes(
  range: FederalRegisterDateRange,
): string {
  const validated = assertFederalRegisterDateRange(range);
  return (
    `This artifact contains eligible Federal Register records selected from ` +
    `${validated.start} through ${validated.end} under ` +
    `${FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.id}; it is a bounded rolling beta ` +
    `slice, not complete 1994-present coverage. The API documents coverage since ` +
    `1994, with the first observed issue on 1994-01-03. Historical ` +
    `Uncategorized Document entries and records without an exact issuing body ` +
    `are excluded from public candidates.`
  );
}
