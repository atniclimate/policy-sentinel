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

// Attach rejection observation in the same turn as scheduling the task.
export function observeCleanup(tasks, operation, action) {
  tasks.push(
    Promise.resolve()
      .then(action)
      .then(
        () => null,
        (error) => ({ operation, code: boundedFailure(error) }),
      ),
  );
}

export async function sealBrowserReport({
  report,
  failure,
  smokeOnly,
  close,
  downloadTasks,
  persist,
  now = () => new Date().toISOString(),
}) {
  const cleanupErrors = [];
  try {
    await close();
  } catch (error) {
    cleanupErrors.push({
      operation: "browser_close",
      code: boundedFailure(error),
    });
  }
  // Closing drains browser events. Inspect every cancellation result, including
  // tasks appended while an earlier task was settling.
  for (let index = 0; index < downloadTasks.length; index++) {
    try {
      const issue = await downloadTasks[index];
      if (issue) cleanupErrors.push(issue);
    } catch (error) {
      cleanupErrors.push({
        operation: "download_cancel",
        code: boundedFailure(error),
      });
    }
  }
  report.cleanupErrors = cleanupErrors;
  report.finishedAt = now();
  const incomplete = report.contexts.flatMap((context) =>
    (context.accessibility ?? []).flatMap((scan) => scan.incomplete),
  );
  report.accessibilityReview = {
    unresolvedRules: incomplete.length,
    unresolvedNodes: incomplete.reduce(
      (sum, entry) => sum + entry.nodes.length,
      0,
    ),
  };
  report.passed =
    !failure && cleanupErrors.length === 0 && incomplete.length === 0;
  report.acceptanceComplete = !smokeOnly && report.passed;
  report.outcome =
    failure || cleanupErrors.length
      ? "failed"
      : incomplete.length
        ? "needs_accessibility_review"
        : smokeOnly
          ? "smoke_passed"
          : "passed";
  let persistenceError;
  try {
    return await persist(report);
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
