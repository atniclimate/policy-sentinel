// Synthetic local custody settings; no provider or experimental dependencies.
export default Object.freeze({
  schemaVersion: "1.0.0",
  rootEnvironmentVariable: "POLICY_SENTINEL_CORPUS_ROOT",
  defaultRoot: null,
  trustDomain: "synthetic_test_only",
  networkRequests: 0,
  limits: Object.freeze({
    maxObjectBytes: 262144,
    maxGlobalBytes: 16777216,
    maxSourceBytes: 1048576,
    minFreeBytes: 1073741824,
    maxEntries: 4096,
    operationTimeoutMs: 10000,
    maxConcurrentOperations: 1,
  }),
});
