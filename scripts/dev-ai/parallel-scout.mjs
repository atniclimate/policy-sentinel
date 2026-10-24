// Development-only Parallel runs (D-114): source scouting, terms/docs
// monitors, and lead research. Results are leads for a person to verify at
// the originating source; nothing here becomes a record or reaches public output.
//
//   node scripts/dev-ai/parallel-scout.mjs scout
//   node scripts/dev-ai/parallel-scout.mjs monitors:create | monitors:events
//   node scripts/dev-ai/parallel-scout.mjs research <name>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  LOG_DIR,
  parallelGet,
  parallelPost,
  parallelSearch,
} from "./clients.mjs";

const [command, name] = process.argv.slice(2);
const save = (file, value) => {
  const path = join(LOG_DIR, file);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
};

// Sources earlier source reviews could not settle, and where a stable
// official interface might exist.
const SCOUTS = [
  {
    id: "oregon-legislature-api",
    objective:
      "Find the Oregon State Legislature's official machine-readable interface (OData API or bulk data) for bills, measures and legislative documents, and its terms of use",
    queries: [
      "Oregon Legislature OData API",
      "OLIS API terms of use",
      "oregonlegislature.gov data download",
    ],
    domains: ["oregonlegislature.gov", "oregon.gov"],
  },
  {
    id: "oregon-rules-terms",
    objective:
      "Find the Oregon Secretary of State terms of use or reuse policy for the Oregon Administrative Rules and Oregon Bulletin, and any API or bulk download",
    queries: [
      "Oregon Administrative Rules database terms",
      "Oregon Bulletin download",
      "OARD reuse policy",
    ],
    domains: ["sos.oregon.gov", "secure.sos.state.or.us", "oregon.gov"],
  },
  {
    id: "idaho-legislature-data",
    objective:
      "Find the Idaho Legislature's official data access for bills and session laws (API, RSS, bulk files) and the office to contact about reuse",
    queries: [
      "Idaho Legislature bill data API",
      "Idaho legislation RSS feed",
      "legislature.idaho.gov data",
    ],
    domains: ["legislature.idaho.gov", "idaho.gov"],
  },
  {
    id: "ecfr-api-terms",
    objective:
      "Find the eCFR API documentation and its terms of use, rate limits and reuse conditions",
    queries: [
      "eCFR API documentation",
      "ecfr.gov developer terms",
      "eCFR API rate limit",
    ],
    domains: ["ecfr.gov", "federalregister.gov", "archives.gov"],
  },
  {
    id: "usaspending-terms",
    objective:
      "Find USAspending.gov terms of use, data use and attribution policy, and API rate limit statements",
    queries: [
      "USAspending terms of use",
      "USAspending API rate limit",
      "USAspending data attribution",
    ],
    domains: [
      "usaspending.gov",
      "fiscal.treasury.gov",
      "github.com/fedspendingtransparency",
    ],
  },
  {
    id: "reginfo-terms",
    objective:
      "Find reginfo.gov's disclaimer, privacy or terms page that governs reuse of Unified Agenda data, and any statement about automated downloads",
    queries: [
      "reginfo.gov disclaimer",
      "reginfo.gov privacy policy",
      "Unified Agenda data reuse",
    ],
    domains: ["reginfo.gov", "gsa.gov"],
  },
  {
    id: "intertribal-resolutions",
    objective:
      "Find the official public pages where ATNI, NCAI and USET publish their adopted resolutions, with how each lists, dates and numbers them and any terms of use",
    queries: [
      "ATNI resolutions",
      "NCAI resolutions database",
      "USET resolutions",
    ],
    domains: ["atnitribes.org", "ncai.org", "usetinc.org"],
  },
  {
    id: "grants-gov-opportunity-url",
    objective:
      "Find the official Grants.gov page URL pattern for a single funding opportunity and the field in the Grants.gov API for additional information on eligibility",
    queries: [
      "Grants.gov search-results-detail opportunity",
      "Grants.gov additional information on eligibility field",
      "fetchOpportunity response fields",
    ],
    domains: ["grants.gov", "simpler.grants.gov"],
  },
];

// Pages whose changes can break an adapter or change what we may display.
const MONITORS = [
  [
    "regulations-gov-api",
    "Changes to the Regulations.gov API documentation, versions, fields or terms of use",
    ["open.gsa.gov/api/regulationsgov", "regulations.gov", "api.data.gov"],
  ],
  [
    "federal-register-api",
    "Changes to the Federal Register API documentation, fields, rate limits or developer terms",
    ["federalregister.gov"],
  ],
  [
    "govinfo-api",
    "Changes to the GovInfo API, its collections, rate limits or terms",
    ["govinfo.gov", "github.com/usgpo"],
  ],
  [
    "congress-gov-api",
    "Changes to the Congress.gov API: new endpoints, field changes, deprecations or terms",
    ["api.congress.gov", "github.com/LibraryOfCongress"],
  ],
  [
    "grants-gov-api",
    "Changes to the Grants.gov API (search2, fetchOpportunity) or its terms of use, or the move to Simpler.Grants.gov",
    ["grants.gov", "simpler.grants.gov"],
  ],
  [
    "unified-agenda",
    "Publication of a new edition of the Unified Agenda of Regulatory and Deregulatory Actions or changes to its XML download",
    ["reginfo.gov"],
  ],
  [
    "washington-legislature-services",
    "Changes to the Washington State Legislature web services or legislative data terms",
    ["leg.wa.gov"],
  ],
];

// Lead research: the owner's staff tasks in docs/PLAN.md.
const RESEARCH = {
  "fy27-tribal-resilience": {
    processor: "core",
    input:
      "For federal fiscal year 2027, list source-stated facts about funding for Tribal climate resilience programs (for example the BIA Tribal Climate Resilience program and related EPA, FEMA, USDA and DOE programs serving Tribes). Separate each fact by kind: budget request, enacted appropriation, funding notice, award selection, obligation, disbursement, court order, staffing change, or program termination or restoration. Give the as-of date the source states.",
    domains: [".gov"],
  },
  "roadless-consultation": {
    processor: "core",
    input:
      "For the USDA Forest Service rulemaking to rescind the 2001 Roadless Area Conservation Rule (2025-2026), list source-stated facts about Tribal consultation: consultation invitations, listening sessions or meetings held with Tribes, the agency's stated consultation dates, and any statement in the rule or its documents about Executive Order 13175. Give the as-of date the source states.",
    domains: [".gov"],
  },
};

const LEAD_SCHEMA = {
  type: "json",
  json_schema: {
    type: "object",
    properties: {
      leads: {
        type: "array",
        items: {
          type: "object",
          properties: {
            statement: {
              type: "string",
              description: "What the source states, close to its own words",
            },
            kind: { type: "string" },
            as_of: {
              type: "string",
              description: "Date the source states, YYYY-MM-DD if known",
            },
            source_url: { type: "string" },
            publisher: { type: "string" },
          },
          required: ["statement", "kind", "as_of", "source_url", "publisher"],
          additionalProperties: false,
        },
      },
    },
    required: ["leads"],
    additionalProperties: false,
  },
};

if (command === "scout") {
  const out = [];
  for (const scout of SCOUTS) {
    const result = await parallelSearch({
      objective: scout.objective,
      search_queries: scout.queries,
      mode: "advanced",
      advanced_settings: {
        source_policy: { include_domains: scout.domains },
        excerpt_settings: { max_chars_per_result: 1500 },
        max_results: 8,
      },
    });
    out.push({
      id: scout.id,
      objective: scout.objective,
      results: result.results,
      warnings: result.warnings,
    });
    console.log(scout.id, (result.results ?? []).length);
  }
  console.log(save("scout-results.json", out));
} else if (command === "monitors:create") {
  const file = join(LOG_DIR, "monitors.json");
  const existing = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : {};
  for (const [id, query, domains] of MONITORS) {
    if (existing[id]) continue;
    const monitor = await parallelPost("/v1/monitors", {
      type: "event_stream",
      frequency: "1w",
      processor: "lite",
      settings: {
        query,
        advanced_settings: { source_policy: { include_domains: domains } },
      },
      metadata: { external_id: `policy-sentinel-dev:${id}` },
    });
    existing[id] = monitor.monitor_id ?? monitor.id ?? monitor;
    console.log(id, JSON.stringify(existing[id]));
    save("monitors.json", existing);
  }
} else if (command === "monitors:events") {
  const monitors = JSON.parse(
    readFileSync(join(LOG_DIR, "monitors.json"), "utf8"),
  );
  const out = {};
  for (const [id, monitorId] of Object.entries(monitors))
    out[id] = await parallelGet(`/v1/monitors/${monitorId}/events`);
  console.log(save("monitor-events.json", out));
} else if (command === "research" && RESEARCH[name]) {
  const spec = RESEARCH[name];
  const run = await parallelPost("/v1/tasks/runs", {
    input: spec.input,
    processor: spec.processor,
    task_spec: { output_schema: LEAD_SCHEMA },
    source_policy: { include_domains: spec.domains },
  });
  console.log("run", run.run_id);
  const result = await parallelGet(
    `/v1/tasks/runs/${run.run_id}/result?timeout=600`,
  );
  console.log(save(`research-${name}.json`, result));
} else {
  console.log(
    "commands: scout | monitors:create | monitors:events | research <" +
      Object.keys(RESEARCH).join("|") +
      ">",
  );
}
