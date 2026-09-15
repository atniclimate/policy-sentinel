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
  // Source review: docs/source-reviews/federal-court-opinion-datastores-2026-09-15.md (lead-owned).
  {
    id: "federal-court-opinions-direct",
    hosts: ["cdn.ca9.uscourts.gov", "www.wawd.uscourts.gov"],
    pathPrefixes: ["/datastore/opinions/", "/sites/wawd/files/"],
    review: {
      reviewer:
        "Policy Sentinel source-evidence reviewer and implementation lead",
      reviewedAt: "2026-09-15T00:00:00Z",
      expiresAt: "2026-10-15T00:00:00Z",
      evidenceUrls: [
        "https://www.ca9.uscourts.gov/privacy-policy/",
        "https://www.wawd.uscourts.gov/privacy",
      ],
    },
    uses: { ...uses },
  },
];
const discoveryProfiles = directSourceProfiles.slice(0, 2);
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
    profiles: discoveryProfiles,
    targets: directCanaryTargets,
  };
}

// Authorized by D-069 and docs/handoffs/makah-demo-02-federal-acquisition-launch.md;
// exactly these URLs, one GET each, no retry; targets 9 and 10 are optional
// metadata within the same ceiling; the identity is the document, the
// rendition is chosen by route.
const makahTarget = (profileId, url, expectedIdentity, mediaTypes) => ({
  profileId,
  url,
  expectedIdentity,
  mediaTypes,
});
export function makahDemoFederalManifest(runId = "makah-demo-02") {
  return {
    version: "1.0.0",
    runId,
    trustDomain: "real_source_local",
    profiles: [
      directSourceProfiles.find((profile) => profile.id === "govinfo-direct"),
      directSourceProfiles.find(
        (profile) => profile.id === "federal-court-opinions-direct",
      ),
    ],
    targets: [
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/FR-2024-06-18/html/2024-12669.htm",
        "FR Doc. 2024-12669 (89 FR 51600, final rule, 2024-06-18)",
        ["text/html"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/FR-2019-04-05/html/2019-06337.htm",
        "FR Doc. 2019-06337 (84 FR 13604, proposed rule, 2019-04-05)",
        ["text/html"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/FR-2026-05-12/html/2026-09372.htm",
        "FR Doc. 2026-09372 (91 FR 25865, notice, 2026-05-12)",
        ["text/html"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/FR-2015-08-26/html/2015-20888.htm",
        "FR Doc. 2015-20888 (80 FR 51836, notice, 2015-08-26)",
        ["text/html"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf",
        "12 Stat. 939, Treaty with the Makah Tribe, 1855 (GovInfo STATUTE-12 page 939)",
        ["application/pdf"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf",
        "Ninth Circuit No. 15-35824, opinion, 2017-10-23 (GovInfo USCOURTS-ca9-15-35824)",
        ["application/pdf"],
      ),
      makahTarget(
        "federal-court-opinions-direct",
        "https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf",
        "Ninth Circuit No. 13-35474, opinion, 2016-06-27",
        ["application/pdf"],
      ),
      makahTarget(
        "federal-court-opinions-direct",
        "https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf",
        "W.D. Wash. C70-9213 Subproceeding 09-01, findings of fact and conclusions of law, 2015-07-09",
        ["application/pdf"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/metadata/pkg/STATUTE-12/mods.xml",
        "GovInfo MODS metadata for package STATUTE-12 (identity evidence)",
        ["text/xml", "application/xml"],
      ),
      makahTarget(
        "govinfo-direct",
        "https://www.govinfo.gov/metadata/pkg/USCOURTS-ca9-15-35824/mods.xml",
        "GovInfo MODS metadata for package USCOURTS-ca9-15-35824 (identity evidence)",
        ["text/xml", "application/xml"],
      ),
    ],
  };
}
