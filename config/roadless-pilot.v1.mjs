// Fresh D-089 operation; source qualification is not a grant to repeat a spent run.
export function roadlessPilotManifest() {
  const documents = [
    ["parent", "2001-01-12", "01-726"],
    ["proposal", "2026-08-20", "2026-16965"],
    ["extension", "2026-09-11", "2026-18648"],
  ];
  return {
    version: "1.1.0",
    runId: "roadless-real-pilot-20261008-01",
    trustDomain: "real_source_local",
    limits: {
      attempts: 3,
      encodedBytes: 24 * 1024 ** 2,
      decodedBytes: 24 * 1024 ** 2,
      responseBytes: 8 * 1024 ** 2,
      spacingMs: 15000,
      deadlineMs: 30000,
      retries: 0,
    },
    profiles: [
      {
        id: "govinfo-roadless-20261008",
        hosts: ["www.govinfo.gov"],
        pathPrefixes: documents.map(
          ([, date, id]) => `/content/pkg/FR-${date}/html/${id}.htm`,
        ),
        review: {
          reviewer: "Policy Sentinel D-089 independent source-evidence review",
          reviewedAt: "2026-10-09T06:06:16Z",
          expiresAt: "2026-10-10T00:00:00Z",
          evidenceUrls: [
            "https://www.govinfo.gov/robots.txt",
            "https://www.govinfo.gov/about/policies",
            "https://www.govinfo.gov/help/fr",
            "https://www.govinfo.gov/developers",
            "https://www.archives.gov/federal-register/faqs",
          ],
        },
        uses: {
          capture: true,
          analysis: true,
          excerpts: true,
          localDisplay: "full_text",
          localExport: "full_text",
          publicRedistribution: "prohibited",
        },
      },
    ],
    targets: documents.map(([role, date, id]) => ({
      profileId: "govinfo-roadless-20261008",
      url: `https://www.govinfo.gov/content/pkg/FR-${date}/html/${id}.htm`,
      expectedIdentity: id,
      mediaTypes: ["text/html"],
      operationId: `roadless-${role}-001`,
    })),
  };
}
