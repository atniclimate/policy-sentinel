const RECORD_HEALTH_FIELDS = [
  "status",
  "checkedAt",
  "usingLastKnownGood",
  "message",
];

function fail(label, health, reason) {
  throw new Error(`${label} ${reason}: ${health.sourceId}`);
}

function hasMessage(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function assertArtifactSourceHealthState({
  health,
  sourceRecords,
  label = "artifact source-health",
}) {
  if (
    health === null ||
    typeof health !== "object" ||
    Array.isArray(health) ||
    !Array.isArray(sourceRecords)
  ) {
    throw new TypeError(`${label} state input is invalid`);
  }

  if (health.recordCount !== sourceRecords.length) {
    fail(label, health, "record count mismatch");
  }

  if ((health.status === "unavailable") !== (sourceRecords.length === 0)) {
    fail(label, health, "unavailable state mismatch");
  }

  for (const record of sourceRecords) {
    if (
      RECORD_HEALTH_FIELDS.some(
        (field) => record.sourceHealth[field] !== health[field],
      )
    ) {
      fail(label, health, "receipt differs from record health");
    }
  }

  if (sourceRecords.length === 0) {
    if (
      health.dataAsOf !== null ||
      health.lastSuccessfulRetrievalAt !== null ||
      health.usingLastKnownGood !== false ||
      health.stale !== true ||
      !hasMessage(health.message)
    ) {
      fail(label, health, "unavailable receipt is inconsistent");
    }
    return;
  }

  if (health.dataAsOf === null || health.lastSuccessfulRetrievalAt === null) {
    fail(label, health, "available receipt lacks successful freshness");
  }

  if (health.status === "healthy") {
    if (
      health.usingLastKnownGood !== false ||
      health.stale !== false ||
      health.failureStage !== null ||
      health.message !== null
    ) {
      fail(label, health, "healthy receipt is inconsistent");
    }
    return;
  }

  if (health.status === "degraded") {
    if (
      health.usingLastKnownGood !== true ||
      health.stale !== true ||
      health.failureStage === null ||
      !hasMessage(health.message)
    ) {
      fail(label, health, "degraded receipt is inconsistent");
    }
    return;
  }

  fail(label, health, "status cannot expose public records");
}
