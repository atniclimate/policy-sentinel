// Source qualification: docs/source-reviews/real-policy-direct-2026-09-05.md.
// Templates are documented canary targets; availability/identity is not
// accepted until the accounted response and item review pass.
const review = (evidenceUrls) => ({
  reviewer: "Policy Sentinel source-evidence reviewer and implementation lead",
  reviewedAt: "2026-09-05T00:00:00Z",
  expiresAt: "2026-10-05T00:00:00Z",
  evidenceUrls,
});
const uses = {
  capture: true,
  analysis: true,
  excerpts: true,
  localDisplay: "full_text",
  localExport: "full_text",
  publicRedistribution: "prohibited",
};
export const directSourceProfiles = [
  {
    id: "govinfo-direct",
    hosts: ["www.govinfo.gov"],
    pathPrefixes: [
      "/content/pkg/",
      "/metadata/pkg/",
      "/metadata/granule/",
      "/app/details/",
      "/bulkdata/",
    ],
    review: review([
      "https://www.govinfo.gov/about/policies",
      "https://www.govinfo.gov/developers",
      "https://www.govinfo.gov/help/fr",
      "https://www.govinfo.gov/help/bills",
    ]),
    uses: { ...uses },
  },
  {
    id: "washington-legislative-text",
    hosts: ["leg.wa.gov", "app.leg.wa.gov", "lawfilesext.leg.wa.gov"],
    pathPrefixes: [
      "/state-laws-and-rules/state-laws-rcw/session-laws/",
      "/biennium/",
      "/bi/tld/documentsearchresults",
      "/billsummary/",
    ],
    review: review([
      "https://leg.wa.gov/state-laws-and-rules/state-laws-rcw/session-laws/",
      "https://leg.wa.gov/privacy-notice/",
      "https://leg.wa.gov/disclaimer/",
      "https://copyright.gov/comp3/chap300/ch300-copyrightable-authorship.pdf",
    ]),
    uses: { ...uses },
  },
];
const target = (profileId, url, expectedIdentity) => ({
  profileId,
  url,
  expectedIdentity,
  mediaTypes: ["text/html"],
});
export const directCanaryTargets = [
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2020-10-29/html/2020-23984.htm",
    "2020-23984",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2023-01-27/html/2023-01483.htm",
    "2023-01483",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2026-08-20/html/2026-16965.htm",
    "2026-16965",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2000-12-12/html/00-31253.htm",
    "00-31253",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2004-07-06/html/04-15218.htm",
    "04-15218",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2000-11-09/html/00-29003.htm",
    "00-29003",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/content/pkg/FR-2021-01-25/html/2021-01765.htm",
    "2021-01765",
  ),
  target(
    "govinfo-direct",
    "https://www.govinfo.gov/app/details/BILLS-119hr7695ih",
    "BILLS-119hr7695ih",
  ),
  ...[2012, 2021, 2022, 2023, 2025].map((year) =>
    target(
      "washington-legislative-text",
      `https://leg.wa.gov/state-laws-and-rules/state-laws-rcw/session-laws/session-law-chapters-by-year/${year}/`,
      `Washington session law chapter index ${year}`,
    ),
  ),
  ...[
    ["2021-22", "1812"],
    ["2021-22", "5141"],
    ["2025-26", "1018"],
    ["2011-12", "6175"],
    ["2023-24", "1216"],
    ["2021-22", "5126"],
    ["2025-26", "5015"],
  ].map(([biennium, name]) =>
    target(
      "washington-legislative-text",
      `https://app.leg.wa.gov/bi/tld/documentsearchresults?biennium=${biennium}&documentType=1&name=${name}`,
      `Washington bill inventory ${name} ${biennium}`,
    ),
  ),
];
export function initialDirectManifest(runId = "real-policy-discovery-01") {
  return {
    version: "1.0.0",
    runId,
    trustDomain: "real_source_local",
    profiles: directSourceProfiles,
    targets: directCanaryTargets,
  };
}
