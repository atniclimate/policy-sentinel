import { directSourceProfiles } from "./policy-sources.v2.mjs";
import { regionalInterfaceRegister } from "./regional-interface-register.v1.mjs";

// GD-17 reviewed documentation and discovery leads, not renewed access profiles.
// Official locators below are evidence, never a retrieval allowlist. No source
// is activated here; omitted Montana/Nevada local issuers remain explicit gaps.
const modes = ["topical", "full_text", "metadata", "identifier_only", "cached"];
const features = [
  "parent_proceeding",
  "docket_id",
  "rin",
  "consultation_event",
  "statutory_dependency",
  "environmental_alternative",
  "geographic_applicability",
];
const declarations = (known, evidenceUrls, state = "documented") =>
  modes.map((mode) => ({
    mode,
    state: known.includes(mode) ? state : "unknown",
    evidenceUrls: known.includes(mode) ? [...evidenceUrls] : [],
  }));

const discoveryRows = [
  {
    id: "federal-register-api",
    label: "Federal Register published-document API",
    publisher: "Office of the Federal Register / NARA",
    region: "US",
    recordKinds: ["regulatory_proceedings"],
    url: "https://www.archives.gov/federal-register/faqs",
    authorityClass: "federal",
    interfaceKind: "api",
    evidenceRecord: "docs/source-reviews/nationwide/federal-2026-10-07.md",
    modes: ["topical"],
    from: "1994-01-01",
    note: "Documented API search since 1994; no selected or emitted successor collection.",
    block:
      "Retained adapter is disabled; successor API terms, privacy, rendition and lifecycle evidence remain unresolved.",
  },
  {
    id: "govinfo-api",
    label: "GovInfo package/granule API",
    publisher: "U.S. Government Publishing Office",
    region: "US",
    recordKinds: ["regulatory_proceedings", "legislation", "opinions"],
    url: "https://www.govinfo.gov/developers",
    authorityClass: "federal",
    interfaceKind: "api",
    evidenceRecord: "docs/source-reviews/nationwide/federal-2026-10-07.md",
    modes: ["identifier_only"],
    credentialEnv: "GOVINFO_API_KEY",
    note: "Collection-specific: FR since 1936, BILLS since 1993, selected incomplete USCOURTS generally since 2004. These are not one guaranteed API range.",
    block:
      "Registration and credentialed API use remain closed; direct imports do not qualify the API.",
    gate: "G-B-GOVINFO",
  },
  {
    id: "ecfr-api",
    label: "eCFR historical regulatory data",
    publisher: "Office of the Federal Register / NARA and GPO",
    region: "US",
    recordKinds: ["rules"],
    url: "https://www.archives.gov/federal-register/faqs",
    authorityClass: "federal",
    interfaceKind: "api",
    evidenceRecord: "docs/source-reviews/nationwide/federal-2026-10-07.md",
    terms: "blocked",
    note: "NARA describes website searches since 2017; exact API history remains unknown.",
    block:
      "Retained access-consent condition must be resolved before another eCFR host request.",
    gate: "G-J",
  },
  {
    id: "congress-api",
    label: "Congress.gov API",
    publisher: "Library of Congress",
    region: "US",
    recordKinds: ["legislation"],
    url: "https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/",
    authorityClass: "federal",
    interfaceKind: "api",
    evidenceRecord: "docs/source-reviews/nationwide/federal-2026-10-07.md",
    modes: ["identifier_only"],
    credentialEnv: "CONGRESS_API_KEY",
    note: "Field-specific historical coverage remains dated evidence; current coverage-page verification was unavailable.",
    block:
      "Registration, credentialed access, live envelopes, paging and field-specific reuse remain unresolved.",
    gate: "G-B-CONGRESS",
  },
  {
    id: "regulations-gov-api",
    label: "Regulations.gov governmental document/docket API",
    publisher: "GSA Federal eRulemaking service",
    region: "US",
    recordKinds: ["regulatory_proceedings"],
    url: "https://open.gsa.gov/api/regulationsgov/",
    authorityClass: "federal",
    interfaceKind: "api",
    evidenceRecord: "docs/source-reviews/nationwide/federal-2026-10-07.md",
    modes: ["identifier_only"],
    features: ["docket_id", "parent_proceeding"],
    credentialEnv: "REGULATIONS_GOV_API_KEY",
    note: "Agency-dependent participation; guaranteed historical start is unknown. Public comments and attachments are excluded.",
    block:
      "GET-specific terms, registration/key and exact privacy projection remain unresolved; Comment API is excluded.",
    gate: "G-B-REGULATIONS",
  },
  {
    id: "wa-legislative-web-services",
    label: "Washington Legislative Web Services",
    publisher: "Washington Legislature",
    region: "WA",
    recordKinds: ["legislation"],
    url: "https://wslwebservices.leg.wa.gov/",
    interfaceKind: "api",
    modes: ["identifier_only", "metadata"],
    note: "SOAP legislation/status/document services; session-law browse range beginning 1854 is separate from API coverage.",
    block:
      "Spent yearly discovery canary was unsuccessful; current service qualification and finite population contract remain unresolved.",
    gate: "G-WA-LWS-DISCOVERY",
  },
  {
    id: "wa-statutes",
    label: "Washington Revised Code",
    publisher: "Washington Legislature",
    region: "WA",
    recordKinds: ["statutes"],
    url: "https://leg.wa.gov/state-laws-and-rules/state-laws-rcw/",
    note: "Annual codification and archives; no qualified edition completeness.",
    block:
      "RCW compilation rights and edition/update semantics require separate qualification.",
  },
  {
    id: "wa-rules-register",
    label: "Washington rules and State Register",
    publisher: "Washington Legislature / Code Reviser",
    region: "WA",
    recordKinds: ["rules"],
    url: "https://leg.wa.gov/state-laws-and-rules/",
    from: "1978-01-01",
    note: "Retained WSR archive evidence since 1978; grouped filings since issue 05-19, not complete lifecycle coverage.",
    block:
      "Duplicate filing identities, titles, compilation rights and lifecycle reconciliation remain unresolved.",
  },
  {
    id: "wa-appellate-opinions",
    label: "Washington appellate opinions",
    publisher: "Washington Courts",
    region: "WA",
    recordKinds: ["opinions"],
    url: "https://www.courts.wa.gov/opinions/",
    from: "2013-02-22",
    note: "Advertised slip-opinion indexes; official reports replace slips and subsequent edits can change them.",
    block:
      "Official citation, current-version and revision links remain unresolved.",
    gate: "G-WA-APPELLATE-CITATION-REVISION-CONTRACT",
  },
  {
    id: "wa-clallam-local",
    label: "Clallam County instrument discovery",
    publisher: "Clallam County",
    region: "WA",
    recordKinds: ["local_instruments"],
    url: "https://www.clallamcountywa.gov/1822/Hazard-Mitigation-Plan-Update",
    authorityClass: "county",
    note: "An in-progress plan page is a discovery lead, not a final instrument.",
    block:
      "Finality, exact document route and reuse remain unqualified; no Nation relationship is asserted.",
  },
  {
    id: "wa-jefferson-local",
    label: "Jefferson County instrument discovery",
    publisher: "Jefferson County",
    region: "WA",
    recordKinds: ["local_instruments"],
    url: "https://www.co.jefferson.wa.us/",
    authorityClass: "county",
    terms: "blocked",
    note: "Retained 2026-09-15 portal discovery only.",
    block:
      "The prior portal required a published shared credential; no credential action is authorized.",
  },
  {
    id: "or-legislative-odata",
    label: "Oregon legislative OData",
    publisher: "Oregon Legislature",
    region: "OR",
    recordKinds: ["legislation"],
    url: "https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx",
    interfaceKind: "api",
    from: "2007-01-01",
    terms: "blocked",
    note: "Retained structured range begins 2007; 1995–2006 OLIS is separate.",
    block:
      "Exact agreement/account/credential action and live schema/pagination reconciliation remain closed.",
    gate: "G-C",
  },
  {
    id: "or-statutes",
    label: "Oregon Revised Statutes discovery",
    publisher: "Oregon Legislature",
    region: "OR",
    recordKinds: ["statutes"],
    url: "https://www.oregonlegislature.gov/",
    block:
      "No ORS edition, machine route or publication/reproduction contract is qualified; OData does not qualify ORS.",
  },
  {
    id: "or-administrative-rules",
    label: "Oregon administrative rules and Bulletin",
    publisher: "Oregon Secretary of State",
    region: "OR",
    recordKinds: ["rules"],
    url: "https://sos.oregon.gov/archives/administrative-rules/pages/default.aspx",
    terms: "blocked",
    from: "2017-11-01",
    through: "2026-07-31",
    note: "Retained Bulletin labels only; proposed notices and final AON filings have distinct identity.",
    block:
      "Access-as-acceptance gate remains closed across covered executive-agency alternate hosts.",
    gate: "G-B-OR-OARD",
  },
  {
    id: "or-appellate-opinions",
    label: "Oregon appellate opinions",
    publisher: "Oregon Judicial Department",
    region: "OR",
    recordKinds: ["opinions"],
    url: "https://www.courts.oregon.gov/",
    terms: "blocked",
    block:
      "Access-triggered terms and commercial-copy restrictions remain unresolved; no OJD/OCLC traversal.",
    gate: "G-B-OR-OJD",
  },
  {
    id: "or-multnomah-local",
    label: "Multnomah County board instruments",
    publisher: "Multnomah County",
    region: "OR",
    recordKinds: ["local_instruments"],
    url: "https://multco.us/services/board-documents?page=0",
    authorityClass: "county",
    from: "2020-01-01",
    note: "Board index declares 2020 onward; index dates are not final-text or completeness evidence.",
    block:
      "Finality, pagination completion, stable machine contract and third-party permissions remain unqualified.",
  },
  {
    id: "id-legislation",
    label: "Idaho legislation discovery",
    publisher: "Idaho Legislature",
    region: "ID",
    recordKinds: ["legislation"],
    url: "https://idaho.gov/government/legislative-branch/",
    block:
      "Official directory lead only; current structured bill contract was not qualified after a research-tool retrieval failure.",
  },
  {
    id: "id-statutes",
    label: "Idaho statutes discovery",
    publisher: "Idaho Legislature",
    region: "ID",
    recordKinds: ["statutes"],
    url: "https://idaho.gov/government/laws-public-safety/",
    block:
      "Exact code edition, section identity, history and reuse remain unverified.",
  },
  {
    id: "id-administrative-rules",
    label: "Idaho administrative rules",
    publisher: "Idaho Administrative Rules",
    region: "ID",
    recordKinds: ["rules"],
    url: "https://adminrules.idaho.gov/",
    from: "1993-01-01",
    note: "Declared cumulative rulemaking since 1993, Bulletins since 1995, annual rules since 1996; technical search issue acknowledged.",
    block:
      "PDF extraction/lifecycle conflicts and publication rights remain unresolved; no effective-date inference.",
  },
  {
    id: "id-appellate-opinions",
    label: "Idaho appellate opinions",
    publisher: "Idaho Supreme Court / Court of Appeals",
    region: "ID",
    recordKinds: ["opinions"],
    url: "https://isc.idaho.gov/cases-opinions/isc-opinions",
    note: "Retained separate court indexes have noncomprehensive observed lower dates; no declared JSON API.",
    block:
      "Citation, finality, amendment history and ICAR 32 bulk-distribution treatment remain unresolved.",
    gate: "G-ID-APPELLATE-CITATION-FINALITY-CONTRACT",
  },
  {
    id: "id-kootenai-local",
    label: "Kootenai County ordinance discovery",
    publisher: "Kootenai County",
    region: "ID",
    recordKinds: ["local_instruments"],
    url: "https://www.kcgov.us/144/Find",
    authorityClass: "county",
    block:
      "Originating directory pointer only; provider policy, final instruments and amendment history are unqualified.",
  },
  {
    id: "ak-legislation",
    label: "Alaska BASIS legislation discovery",
    publisher: "Alaska Legislature",
    region: "AK",
    recordKinds: ["legislation"],
    url: "https://akleg.gov/laa/lio.php",
    note: "Official indexed description of BASIS and nightly Folio; no verified API or export contract.",
    block:
      "Metadata privacy, version reconciliation and a declared machine route remain unresolved.",
  },
  {
    id: "ak-statutes",
    label: "Alaska statutes and session-law discovery",
    publisher: "Alaska Legislature",
    region: "AK",
    recordKinds: ["statutes"],
    url: "https://www.akleg.gov/basis/Home/Law",
    note: "Indexed session-law labels 1981–2025 and resolves 1983–2025 do not establish current statute coverage.",
    block:
      "Direct current edition, historical renditions and reuse contract remain unverified.",
  },
  {
    id: "ak-regulations",
    label: "Alaska regulation process and notices",
    publisher: "Alaska Lieutenant Governor",
    region: "AK",
    recordKinds: ["rules"],
    url: "https://ltgov.alaska.gov/information/regulations/",
    block:
      "Process overview only; no finite notice interface, history or text license qualified. General timing explanations cannot establish individual effective dates.",
  },
  {
    id: "ak-appellate-opinions",
    label: "Alaska appellate opinions",
    publisher: "Alaska Court System",
    region: "AK",
    recordKinds: ["opinions"],
    url: "https://courts.alaska.gov/appellate/",
    note: "Indexed slip-release and reporter-replacement evidence; library ranges are not opinion completeness.",
    block:
      "Direct documentation, citation/revision linkage, safe captions and exact opinion range remain unverified.",
  },
  {
    id: "ak-juneau-local",
    label: "Juneau adopted legislation discovery",
    publisher: "City and Borough of Juneau",
    region: "AK",
    recordKinds: ["local_instruments"],
    url: "https://juneau.org/clerk/adopted-legislation?pagenum=1",
    authorityClass: "municipal",
    note: "Indexed adopted-instrument list; displayed titles may omit adoption amendments.",
    block:
      "Final-instrument, pagination and reuse evidence remain unqualified after research-tool timeout; no Nation relationship is inferred.",
  },
  {
    id: "ca-legislation",
    label: "California legislation and download discovery",
    publisher: "California Legislative Counsel",
    region: "CA",
    recordKinds: ["legislation"],
    url: "https://www.leginfo.ca.gov/",
    from: "1993-01-01",
    through: "2016-11-30",
    note: "Legacy archive only; its Downloadable Data Files pointer does not verify the current site's contract.",
    block:
      "Current site returned a tool-level 403; present export schema, scope, access and policies remain unverified.",
  },
  {
    id: "ca-statutes",
    label: "California Codes discovery",
    publisher: "California Legislative Counsel",
    region: "CA",
    recordKinds: ["statutes"],
    url: "https://leginfo.legislature.ca.gov/",
    block:
      "Current code edition, export/update semantics and exact text-output permission remain unqualified.",
  },
  {
    id: "ca-rules-register",
    label: "California regulatory notices and CCR discovery",
    publisher: "California Office of Administrative Law",
    region: "CA",
    recordKinds: ["rules"],
    url: "https://oal.ca.gov/publications/ccr/",
    note: "CCR contractor updates, Title 24 and proposed Notice Register are distinct; online register TOCs since 2018 do not establish codified coverage.",
    block:
      "First-party and contractor terms, identities, lifecycle and reuse require separate qualification.",
  },
  {
    id: "ca-appellate-opinions",
    label: "California published opinions",
    publisher: "California Courts",
    region: "CA",
    recordKinds: ["opinions"],
    url: "https://courts.ca.gov/opinions/publishedcitable-opinions?page=1",
    note: "Indexed rolling 120-day as-filed slip window; corrected Official Reports are a separate third-party route.",
    block:
      "Direct contract, revision/citation semantics, archive scope and third-party rights remain unqualified.",
  },
  {
    id: "ca-humboldt-local",
    label: "Humboldt County instrument discovery",
    publisher: "Humboldt County",
    region: "CA",
    recordKinds: ["local_instruments"],
    url: "https://humboldtgov.org/829/Learn-About",
    authorityClass: "county",
    block:
      "County pointer to contractor/agenda routes only; final adoption, provider policy and privacy-safe instrument selection remain unqualified.",
  },
  {
    id: "mt-legislation",
    label: "Montana Bill Explorer discovery",
    publisher: "Montana Legislature",
    region: "MT",
    recordKinds: ["legislation"],
    url: "https://www.legmt.gov/",
    block:
      "Indexed discovery only; current declared machine/export route, session coverage and lifecycle semantics remain unqualified.",
  },
  {
    id: "mt-statutes",
    label: "Montana Code Annotated discovery",
    publisher: "Montana Legislature",
    region: "MT",
    recordKinds: ["statutes"],
    url: "https://mca.legmt.gov/bills/mca/index.html",
    note: "Indexed MCA 2025, updated August 2026; edition year and update date remain distinct.",
    block:
      "Direct verification, amendment lineage, rights and edition completeness remain unresolved.",
  },
  {
    id: "mt-rules-register",
    label: "Montana ARM and Register",
    publisher: "Montana Secretary of State",
    region: "MT",
    recordKinds: ["rules"],
    url: "https://sosmt.gov/arm",
    from: "2007-01-01",
    note: "Indexed newer MAR archive since 2007; adopted ARM and proposal/adoption notices remain distinct.",
    block:
      "Supported machine contract, exact cadence and rights unverified. Pre-2007 contact route remains outside scope.",
  },
  {
    id: "mt-appellate-opinions",
    label: "Montana Supreme Court opinions",
    publisher: "Montana Clerk of Supreme Court",
    region: "MT",
    recordKinds: ["opinions"],
    url: "https://www.courts.mt.gov/clerk/",
    note: "Indexed date/type/case search and daily decision leads, not a verified machine query contract.",
    block:
      "Exact opinion range, typed revisions, official citation and safe caption projection remain unqualified.",
  },
  {
    id: "nv-legislation",
    label: "Nevada session laws and bill discovery",
    publisher: "Nevada Legislative Counsel Bureau",
    region: "NV",
    recordKinds: ["legislation"],
    url: "https://www.leg.state.nv.us/Law1.html",
    block:
      "Official library lead; current NELIS machine contract, complete session/status relationships and reuse remain unqualified.",
  },
  {
    id: "nv-statutes",
    label: "Nevada Revised Statutes discovery",
    publisher: "Nevada Legislative Counsel Bureau",
    region: "NV",
    recordKinds: ["statutes"],
    url: "https://www.leg.state.nv.us/nrs/",
    note: "Library labels NRS 2025/2026 revision 1; state-enacted city charters are not municipal instruments.",
    block:
      "Revision lineage, codification history and reproduction rights remain unqualified.",
  },
  {
    id: "nv-rules-register",
    label: "Nevada Register and NAC discovery",
    publisher: "Nevada Legislative Counsel Bureau",
    region: "NV",
    recordKinds: ["rules"],
    url: "https://www.leg.state.nv.us/register/",
    note: "Indexed proposed/revised/adopted/approved/emergency/temporary labels do not establish legal effect.",
    block:
      "Machine route, lifecycle relationships, complete coverage, cadence and text reuse remain unqualified.",
  },
  {
    id: "nv-appellate-opinions",
    label: "Nevada Supreme Court advance opinions",
    publisher: "Nevada Supreme Court",
    region: "NV",
    recordKinds: ["opinions"],
    url: "https://nvcourts.gov/supreme/decisions/advance_opinions/",
    block:
      "Official route redirected to an inaccessible ACIS query. Current canonical index and revision/publication semantics remain unverified; no opaque query is retained.",
  },
  {
    id: "atni-resolutions",
    label: "ATNI organizational resolutions",
    publisher: "Affiliated Tribes of Northwest Indians",
    region: "US",
    recordKinds: ["organizational_resolutions"],
    url: "https://atnitribes.org/resolution-table/",
    authorityClass: "intergovernmental",
    evidenceRecord:
      "docs/source-reviews/nationwide/tribal-intertribal-2026-10-07.md",
    note: "Indexed organizational table labels include 2026; archive bounds unknown. Passed labels may conflict with tabled-file descriptions.",
    block:
      "Direct index, rights, robots/access, adoption/version state and finite document selection remain unresolved.",
  },
  {
    id: "ncai-resolutions",
    label: "NCAI organizational resolutions",
    publisher: "National Congress of American Indians",
    region: "US",
    recordKinds: ["organizational_resolutions"],
    url: "https://archive.ncai.org/terms-of-use",
    authorityClass: "intergovernmental",
    evidenceRecord:
      "docs/source-reviews/nationwide/tribal-intertribal-2026-10-07.md",
    terms: "blocked",
    note: "Current resolutions route and archive bounds not newly verified.",
    block:
      "Visiting-as-agreement terms and restricted use triggered a source-specific access stop across unresolved current/archive host applicability.",
  },
  {
    id: "uset-resolutions",
    label: "USET organizational resolutions",
    publisher: "United South and Eastern Tribes",
    region: "US",
    recordKinds: ["organizational_resolutions"],
    url: "https://www.usetinc.org/resources/resolutions/",
    authorityClass: "intergovernmental",
    evidenceRecord:
      "docs/source-reviews/nationwide/tribal-intertribal-2026-10-07.md",
    terms: "blocked",
    from: "1969-01-01",
    note: "Index declares 1969–Present; holdings not enumerated. USET and USET SPF issuers require distinct record attribution.",
    block:
      "Service-use-as-agreement policy triggered a source-specific stop; reproduction and machine contract remain unresolved.",
  },
  {
    id: "uset-spf-resolutions",
    label: "USET SPF organizational resolutions",
    publisher: "USET Sovereignty Protection Fund",
    region: "US",
    recordKinds: ["organizational_resolutions"],
    url: "https://www.usetinc.org/resources/resolutions/",
    authorityClass: "intergovernmental",
    evidenceRecord:
      "docs/source-reviews/nationwide/tribal-intertribal-2026-10-07.md",
    terms: "blocked",
    note: "Shared index does not establish USET SPF-specific date coverage; issuing body must be resolved per record.",
    block:
      "Shared-host access-policy/reuse stop remains; no USET or member Nation position is inferred from USET SPF.",
  },
];

function discovery(row) {
  const evidenceUrls = [row.url];
  return {
    id: row.id,
    label: row.label,
    publisher: row.publisher,
    authorityClass: row.authorityClass ?? "state",
    attributionScope: "publisher_only",
    // Registry/identity qualification is separate from this discovery label.
    publishingJurisdiction: null,
    discoveryRegions: [row.region],
    recordKinds: row.recordKinds,
    interfaceKind: row.interfaceKind ?? "html",
    lifecycle: "discovery",
    review: {
      reviewer: "GD-17 source review",
      reviewedAt: "2026-10-07T00:00:00Z",
      expiresAt: null,
      evidenceUrls,
    },
    evidenceRecord:
      row.evidenceRecord ??
      "docs/source-reviews/nationwide/" +
        row.region.toLowerCase() +
        "-2026-10-07.md",
    terms: row.terms ?? "unresolved",
    credentials: row.credentialEnv
      ? { kind: "environment_variable", environmentVariable: row.credentialEnv }
      : { kind: "unknown" },
    implementedCapabilities: [],
    capabilities: declarations(row.modes ?? [], evidenceUrls),
    evidenceFeatures: features.map((name) => ({
      name,
      state: row.features?.includes(name) ? "documented" : "unknown",
      evidenceUrls: row.features?.includes(name) ? [...evidenceUrls] : [],
    })),
    coverage: {
      documented: {
        from: row.from ?? null,
        through: row.through ?? null,
        completeness: row.from ? "partial" : "unknown",
        note:
          row.note ??
          "Documented range unknown; this discovery review selected and emitted no records.",
      },
      selected: null,
      emitted: null,
    },
    cadence:
      "No product refresh schedule qualified; see the dated source review.",
    blockers: [
      {
        code:
          row.terms === "blocked"
            ? "terms-blocked"
            : row.credentialEnv
              ? "credential-gate"
              : "qualification-evidence-required",
        detail: row.block,
        gateRef: row.gate ?? null,
      },
    ],
    profile: null,
    activation: null,
  };
}

const retainedLabels = {
  "govinfo-direct": [
    "GovInfo historical direct-document profile",
    "U.S. Government Publishing Office",
    "federal",
    "US",
    ["regulatory_proceedings", "legislation"],
  ],
  "washington-legislative-text": [
    "Washington historical legislative-text profile",
    "Washington Legislature",
    "state",
    "WA",
    ["legislation"],
  ],
  "federal-court-opinions-direct": [
    "Federal court historical direct-opinion profile",
    "Issuing federal court, resolved per document",
    "federal",
    "US",
    ["opinions"],
  ],
};
function retainedProfile(original) {
  const profile = globalThis.structuredClone(original);
  const [label, publisher, authorityClass, region, recordKinds] =
    retainedLabels[profile.id];
  return {
    id: profile.id,
    label,
    publisher,
    authorityClass,
    attributionScope: "publisher_only",
    publishingJurisdiction: null,
    discoveryRegions: [region],
    recordKinds,
    interfaceKind:
      profile.id === "federal-court-opinions-direct" ? "pdf" : "html",
    lifecycle: "qualified",
    review: globalThis.structuredClone(profile.review),
    evidenceRecord: "docs/handoffs/ps09-real-policy-discovery-outcome.md",
    terms: "cleared",
    credentials: { kind: "none" },
    implementedCapabilities: ["identifier_only"],
    capabilities: declarations(
      ["identifier_only"],
      profile.review.evidenceUrls,
      "verified",
    ),
    evidenceFeatures: features.map((name) => ({
      name,
      state: "unknown",
      evidenceUrls: [],
    })),
    coverage: {
      documented: {
        from: null,
        through: null,
        completeness: "unknown",
        note: "Finite historical direct targets only; no whole-collection search or current API coverage is implied.",
      },
      selected: null,
      emitted: null,
    },
    cadence: "Historical operation ended; no recurring refresh is authorized.",
    blockers: [
      {
        code: "historical-operation-ended",
        detail:
          "Retained profile supports historical manifest replay. Its review is unchanged; a successor source-specific operation is required for new retrieval.",
        gateRef: null,
      },
    ],
    profile,
    activation: null,
  };
}

export const sourceCatalog = {
  $schema:
    "https://policy-sentinel.invalid/schemas/source-catalog.schema.v1.json",
  schemaVersion: "1.0.0",
  catalogId: "regional-federal-intertribal-discovery",
  trustDomain: "real_source_local",
  managedStorageCeilingBytes: 50_000_000_000,
  regionalInterfaces: regionalInterfaceRegister,
  sources: [
    ...directSourceProfiles.map(retainedProfile),
    ...discoveryRows.map(discovery),
  ],
};
