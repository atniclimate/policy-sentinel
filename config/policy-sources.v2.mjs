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
