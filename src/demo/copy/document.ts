// Document model (src/demo/document.ts): wording shared by the PDF and the
// print view, the data actor entries and the duplicate-listing label.
// Headings are Title Case, labels and body are sentence case.
export const documentCopy = {
  /** Printed for a missing data actor entry or an unread text receipt. A fixed literal: do not reword. */
  notRecorded: "Not recorded",
  actorLabels: {
    name: "Name",
    role: "Role",
    organization: "Organization or Nation",
    sharingWith: "Sharing with",
    purpose: "Purpose",
  },
  docEyebrow: (version: string) => `Policy Sentinel ${version}, working demo`,
  docTitle: "Cited Policies",
  docContentsTitle: "Policies in This List",
  /** A document sentence, not the page's instruction to add a policy. */
  docEmpty: "No policies are cited in this list.",
  docProvenanceTitle: "Provenance",
  docActorsTitle: "Data Actors and Sharing",
  /** Printed on the cover and again over the data actor section, so it names no position on the page. */
  docActorsIntro:
    "The data actor entries in this document were typed by the person who prepared this list. The demo does not verify them.",
  docSoftwareTitle: "Software",
  docTool: (version: string) =>
    `Policy Sentinel demo ${version}, in development`,
  docReferencesTitle: "References",
  docSovereigntyTitle: "Data Provenance and Sovereignty Notes",
  docSovereignty: [
    "The material this demo searches and cites is public policy published by government sources. The Tiered Sovereign Data Framework (TSDF) 0.9.8, a pre-release standard published by the Affiliated Tribes of Northwest Indians, treats documented public federal and state sources as Tier 0 (T0), subject to each source's conditions. Tier 0 is the framework's open tier: material formally released for public access by an authorized source. The demo has no Tribal code source and no Tribal government source. It searches federal and state government sources only. A federal source can itself publish a Tribal government document, such as an ordinance printed in a Federal Register notice, and the demo does not detect or exclude one.",
    "Notes and data actor entries were written by the person who prepared this list. The demo does not classify them or say who they belong to, and it claims no certification under the framework and no conformance with it.",
    "Results are keyword matches and general-jurisdiction records. They establish no relationship to any Nation.",
    "Verify every citation at its official source.",
  ],
  /** A source that gives no date is stated as a gap, never left out. */
  docDateNotStated: "Not stated",
  docAssessment: (assessment: string) => `Rule assessment: ${assessment}`,
  docPassageNote: (note: string) => `Note: ${note}`,
  docFingerprint: (sha256: string, bytes: number) =>
    `SHA-256 ${sha256} (${bytes.toLocaleString("en-US")} bytes)`,
  docLabels: {
    preparedBy: "Prepared by",
    generated: "Generated",
    identifier: "Identifier",
    source: "Source",
    issuingBody: "Issuing body",
    type: "Type",
    date: "Date",
    officialUrl: "Official URL",
    where: "Where",
    limit: "Limit",
    rule: "Rule",
    check: "Check",
    reference: "Reference",
    metadataRetrieved: "Metadata retrieved",
    textReadFrom: "Text read from",
    textRetrieved: "Text retrieved",
    fingerprint: "Fingerprint",
    extractor: "Extractor",
    parserConfig: "Parser configuration SHA-256",
    demoRules: "Demo rules",
    alsoListedBy: "Also listed by",
    tool: "Tool",
    responsible: "Responsible person for this use",
    sourcesRead: "Sources cited",
    foundBy: "Found by",
  },
  /**
   * One Found by value per search that listed a cited document. Draft ID, and
   * its tracker title when the page supplies it (D-112); never the sponsor. The
   * committee area is not applied to results, so it is not named.
   */
  docFoundBy: {
    draft: (id: string, title?: string) =>
      `Suggested search for NCAI draft ${id}${title ? ` (${title})` : ""}`,
    typed: "Typed search",
    area: "Policy area menu search",
    /** Find related: an identifier the record's own source stated, looked up exactly. */
    record: (source: string, identifier: string) =>
      `Identifier lookup from ${source} record ${identifier}`,
    /** `where` is the source, then the collection searched, if any. */
    search: (seed: string, terms: string, where: string) =>
      `${seed}: ${terms} (${where})`,
    /**
     * A name search's terms are the tracker's sponsor, so they stay out of the
     * export. The draft title may be exported (D-112) and appears on the row's
     * other Found by lines; this line names the draft by ID only.
     */
    nameSearch: (id: string, where: string) =>
      `Name search for the sponsor listed on NCAI draft ${id} (${where})`,
    /** The same, from a seed with no draft ID, such as the policy area menu. */
    nameSearchFrom: (seed: string, where: string) =>
      `${seed}: name search for a sponsor listed on an NCAI draft (${where})`,
    nameCaution:
      "This was a name search. A name match is unreviewed and does not show that this document applies to, or concerns, that Tribe or organization.",
  },
} as const;
