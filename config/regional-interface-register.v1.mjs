// GD-47 finite scope, using GD-17 evidence without renewing source clearance.
// These are discovery dispositions, not accepted jurisdictions or access grants.
const evidence = (state, url, observation, observedOn = "2026-10-07") => ({
  url,
  record: `docs/source-reviews/nationwide/${state.toLowerCase()}-2026-10-07.md`,
  observedOn,
  observation,
});

export const regionalInterfaceRegister = {
  version: "1.0.0",
  registerId: "gd47-seven-state-interfaces",
  assessedOn: "2026-10-07",
  entries: [
    {
      state: "WA",
      sourceId: "wa-legislative-web-services",
      requirement: "required_api",
      disposition: "api_candidate",
      evidence: [
        evidence(
          "WA",
          "https://wslwebservices.leg.wa.gov/",
          "direct_documentation",
        ),
      ],
      note: "Required SOAP candidate. Current documentation describes legislation, status/history and document links; the spent yearly discovery canary failed. A known-bill response and direct document imports do not establish population discovery or complete this API integration. G-WA-LWS-DISCOVERY remains unresolved.",
    },
    {
      state: "OR",
      sourceId: "or-legislative-odata",
      requirement: "required_api",
      disposition: "api_candidate",
      evidence: [
        evidence(
          "OR",
          "https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx",
          "retained_documentation",
          "2026-07-31",
        ),
      ],
      note: "Required OData candidate using retained July evidence, not a renewed review. The structured range beginning 2007 is distinct from OLIS 1995–2006. Agreement/account/credential action, provider schema and pagination remain blocked or unverified under G-C; offline fixtures and direct documents do not complete API integration.",
    },
    {
      state: "ID",
      sourceId: "id-legislation",
      requirement: "interface_disposition",
      disposition: "interface_gap",
      evidence: [
        evidence(
          "ID",
          "https://idaho.gov/government/legislative-branch/",
          "official_index",
        ),
      ],
      note: "Official directory discovery only. The legislative host could not be retrieved by the research tool; a current declared structured bill interface, coverage and reuse remain unknown. This is neither a finding that no API exists nor a denial of public access.",
    },
    {
      state: "AK",
      sourceId: "ak-legislation",
      requirement: "interface_disposition",
      disposition: "interface_gap",
      evidence: [
        evidence("AK", "https://akleg.gov/laa/lio.php", "official_index"),
      ],
      note: "The official indexed description names BASIS bill data and nightly Folio. No current official API/export contract was qualified; third-party API references do not qualify one. Machine access, metadata privacy and version reconciliation remain unresolved, not proof that no API exists.",
    },
    {
      state: "CA",
      sourceId: "ca-legislation",
      requirement: "interface_disposition",
      disposition: "interface_gap",
      evidence: [
        evidence("CA", "https://www.leginfo.ca.gov/", "direct_documentation"),
      ],
      note: "The 1993–2016 legacy archive stopped updating on 2016-11-30 and points to current Downloadable Data Files. The current host returned a tool-level 403; export schema, scope, authentication, limits and policy remain unverified. The legacy archive is not current coverage or an accepted export contract.",
    },
    {
      state: "MT",
      sourceId: "mt-legislation",
      requirement: "interface_disposition",
      disposition: "interface_gap",
      evidence: [evidence("MT", "https://www.legmt.gov/", "official_index")],
      note: "Official indexed Bill Explorer discovery describes documents, status and hearings. Direct retrieval timed out; a declared API/export route, session coverage and lifecycle remain unqualified. The timeout establishes neither source denial nor absence of an API. No local-government issuer has been selected.",
    },
    {
      state: "NV",
      sourceId: "nv-legislation",
      requirement: "interface_disposition",
      disposition: "interface_gap",
      evidence: [
        evidence(
          "NV",
          "https://www.leg.state.nv.us/Law1.html",
          "direct_documentation",
        ),
      ],
      note: "The official law library links session laws; a current NELIS machine contract remains unqualified. Bill versions, enacted chapters and special sessions require distinct identities and status evidence. Machine access, complete coverage and reuse remain gaps; no local-government issuer has been selected.",
    },
  ],
};
