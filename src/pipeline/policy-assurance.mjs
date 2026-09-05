// Local failure accounting. Diagnostics expose fixed categories, never response
// bodies, child stderr, URLs, environment values or arbitrary exception text.
export function boundedFailure(error) {
  const allowed = new Set([
    "ENOENT",
    "EACCES",
    "EPERM",
    "ENOSPC",
    "EIO",
    "ETIMEDOUT",
    "ENOBUFS",
  ]);
  return allowed.has(error?.code) ? error.code : "UNCLASSIFIED_FAILURE";
}

export function childFailure(child) {
  if (child.error)
    return { kind: "spawn_or_timeout", code: boundedFailure(child.error) };
  if (child.signal)
    return {
      kind: "signal",
      code: /^SIG[A-Z0-9]{1,10}$/.test(child.signal)
        ? child.signal
        : "UNKNOWN_SIGNAL",
    };
  if (child.status === 0) return null;
  return {
    kind:
      child.status === 2
        ? "accounted_operation_failure"
        : "unsettled_or_local_failure",
    code: "CHILD_NONZERO_OR_MISSING_EXIT",
  };
}

export async function withPreservedCleanup(action, cleanup) {
  let result;
  let primary;
  let failed = false;
  try {
    result = await action();
  } catch (error) {
    primary = error;
    failed = true;
  }
  let cleanupFailed = false;
  let cleanupError;
  try {
    await cleanup();
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  }
  if (failed && cleanupFailed)
    throw new AggregateError(
      [primary, cleanupError],
      "PRIMARY_AND_CLEANUP_FAILURE",
      { cause: primary },
    );
  if (cleanupFailed) throw cleanupError;
  if (failed) throw primary;
  return result;
}

const cleanupCollections = new WeakMap();

export function createCleanupCollection() {
  const handle = Object.freeze({});
  cleanupCollections.set(handle, {
    closed: false,
    sealing: false,
    entries: [],
  });
  return handle;
}

function observeEntry(operation, action) {
  const entry = { operation, settled: false, issue: null };
  // Both outcomes are observed in the scheduling turn, including after closure.
  entry.promise = Promise.resolve()
    .then(action)
    .then(
      () => {
        entry.settled = true;
      },
      (error) => {
        entry.issue = { operation, code: boundedFailure(error) };
        entry.settled = true;
      },
    );
  return entry;
}

export function observeCleanup(handle, operation, action) {
  const collection = cleanupCollections.get(handle);
  if (
    !collection ||
    operation !== "download_cancel" ||
    typeof action !== "function"
  )
    throw new Error("INVALID_CLEANUP_COLLECTION_OR_OPERATION");
  const entry = observeEntry(operation, action);
  if (collection.closed) return false;
  collection.entries.push(entry);
  return true;
}

function freezeSnapshot(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeSnapshot(child);
    Object.freeze(value);
  }
  return value;
}

export async function sealBrowserReport({
  report,
  failure,
  smokeOnly,
  close,
  downloadTasks,
  persist,
  now = () => new Date().toISOString(),
  cleanupBudgetMs = 5000,
}) {
  const collection = cleanupCollections.get(downloadTasks);
  if (
    !collection ||
    collection.sealing ||
    collection.closed ||
    !Number.isInteger(cleanupBudgetMs) ||
    cleanupBudgetMs < 1 ||
    cleanupBudgetMs > 5000
  )
    throw new Error("INVALID_BROWSER_SEAL_BOUNDARY");
  collection.sealing = true;
  const closeEntry = observeEntry("browser_close", close);
  const deadlineAt = globalThis.performance.now() + cleanupBudgetMs;
  const timeout = Symbol("cleanup_deadline");
  let timer;
  const deadline = new Promise((resolve) => {
    timer = globalThis.setTimeout(() => resolve(timeout), cleanupBudgetMs);
  });
  let deadlineReached = false;
  try {
    for (;;) {
      const pending = [closeEntry, ...collection.entries].filter(
        (entry) => !entry.settled,
      );
      // Continuously appended microtasks must not starve the timer callback.
      if (globalThis.performance.now() >= deadlineAt) {
        deadlineReached = true;
        break;
      }
      if (!pending.length) break;
      if (
        (await Promise.race([
          deadline,
          ...pending.map((entry) => entry.promise),
        ])) === timeout
      ) {
        deadlineReached = true;
        break;
      }
      // A settling action may append another cancellation. Re-read the collection.
    }
  } finally {
    globalThis.clearTimeout(timer);
    collection.closed = true;
  }
  const entries = [closeEntry, ...collection.entries];
  const cleanupErrors = entries.flatMap((entry) =>
    !entry.settled
      ? [{ operation: entry.operation, code: "ETIMEDOUT" }]
      : entry.issue
        ? [entry.issue]
        : [],
  );
  if (deadlineReached && entries.every((entry) => entry.settled))
    cleanupErrors.push({ operation: "cleanup_deadline", code: "ETIMEDOUT" });
  // Browser events may still arrive after the deadline. They can change the live
  // observations, but cannot change this detached, recursively frozen snapshot.
  const snapshot = globalThis.structuredClone(report);
  snapshot.cleanupErrors = cleanupErrors;
  snapshot.cleanupSettlement = {
    budgetMs: cleanupBudgetMs,
    deadlineReached,
    pendingAtDeadline: entries.filter((entry) => !entry.settled).length,
    collectionClosed: true,
    terminationConfirmed: false,
  };
  snapshot.finishedAt = now();
  const incomplete = snapshot.contexts.flatMap((context) =>
    (context.accessibility ?? []).flatMap((scan) => scan.incomplete),
  );
  snapshot.accessibilityReview = {
    unresolvedRules: incomplete.length,
    unresolvedNodes: incomplete.reduce(
      (sum, entry) => sum + entry.nodes.length,
      0,
    ),
  };
  snapshot.passed =
    !failure &&
    !deadlineReached &&
    cleanupErrors.length === 0 &&
    incomplete.length === 0;
  snapshot.acceptanceComplete = !smokeOnly && snapshot.passed;
  snapshot.outcome =
    failure || deadlineReached || cleanupErrors.length
      ? "failed"
      : incomplete.length
        ? "needs_accessibility_review"
        : smokeOnly
          ? "smoke_passed"
          : "passed";
  for (const field of [
    "cleanupErrors",
    "cleanupSettlement",
    "finishedAt",
    "accessibilityReview",
    "passed",
    "acceptanceComplete",
    "outcome",
  ])
    report[field] = globalThis.structuredClone(snapshot[field]);
  freezeSnapshot(snapshot);
  let persistenceError;
  try {
    // Persistence is owned and awaited; a timeout must not abandon a live write.
    return await persist(snapshot);
  } catch (error) {
    persistenceError = error;
    report.passed = false;
    report.acceptanceComplete = false;
    report.outcome = "failed";
    report.persistenceError = {
      operation: "report_write",
      code: boundedFailure(error),
    };
  }
  const errors = [
    ...(failure ? [failure] : []),
    ...cleanupErrors.map(
      (issue) => new Error(`${issue.operation}:${issue.code}`),
    ),
    persistenceError,
  ];
  throw new AggregateError(errors, "BROWSER_REPORT_PERSISTENCE_FAILED", {
    cause: failure ?? persistenceError,
  });
}
