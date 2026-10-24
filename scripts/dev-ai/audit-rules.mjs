// Development-only audit of the demo passage rules (src/demo/rules.ts) with
// Jev (D-114). It reads real Federal Register rules from the official API and
// GovInfo, runs the same extractor and rules the Worker runs, and asks Jev one
// judgment per rule hit, plus one per Tribal sentence the consultation rule
// missed. Jev never ships: the output is a report for improving the regexes.
//
//   node scripts/dev-ai/audit-rules.mjs [--tribal 20] [--general 20]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { extractPolicyText } from "../../src/pipeline/policy-text.mjs";
import { identifyIssues, splitSentences } from "../../src/demo/rules.ts";
import { askJev, band, LOG_DIR } from "./clients.mjs";

const { values } = parseArgs({
  options: {
    tribal: { type: "string", default: "20" },
    general: { type: "string", default: "20" },
    since: { type: "string", default: "2025-01-01" },
  },
});
const CACHE = join(LOG_DIR, "fr-cache");
mkdirSync(CACHE, { recursive: true });
const UA = "PolicySentinelDev/0.9 (rule audit; development only)";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function officialBytes(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  await pause(400); // sequential and polite; no retry
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(path, bytes);
  return bytes;
}

async function listDocuments(term, count) {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.set("per_page", String(count));
  url.searchParams.set("order", "newest");
  url.searchParams.append("conditions[type][]", "RULE");
  url.searchParams.append("conditions[type][]", "PRORULE");
  url.searchParams.set("conditions[publication_date][gte]", values.since);
  if (term) url.searchParams.set("conditions[term]", term);
  for (const f of [
    "document_number",
    "title",
    "type",
    "publication_date",
    "agencies",
  ])
    url.searchParams.append("fields[]", f);
  const bytes = await officialBytes(
    url.href,
    `list-${term || "general"}-${count}-${values.since}.json`,
  );
  return JSON.parse(new TextDecoder().decode(bytes)).results ?? [];
}

// Each question is one judgment; the sentence goes in its own question.
const QUESTIONS = {
  any_consult: (s) => ({
    type: "noul",
    instructions: `Does this sentence describe a consultation process between a government agency and another party? Sentence: "${s}"`,
    criteria: {
      true: "The sentence says an agency consulted, will consult, must consult, or invited consultation with Tribes, States, another agency, or the public.",
      false:
        "The sentence uses the word in another sense, such as hiring consultants, consulting a reference or website, or a person consulting a doctor.",
    },
  }),
  tribal_consult: (s) => ({
    type: "noul",
    instructions: `Does this sentence describe consultation or coordination between a federal agency and Tribal governments? Sentence: "${s}"`,
    criteria: {
      true: "The sentence says the agency consulted, coordinated, met, engaged or invited consultation with Tribes or Tribal governments, or states whether the rule has Tribal implications under Executive Order 13175.",
      false:
        "The sentence mentions Tribes without describing any consultation, coordination or Tribal-implications finding, for example a definition or a list of eligible entities.",
    },
  }),
  tribe_meaning: (s) => ({
    type: "noul",
    instructions: `Does "Tribe" or "Tribal" in this sentence refer to American Indian or Alaska Native Tribes or Tribal governments? Sentence: "${s}"`,
    criteria: {
      true: "The word refers to Indian Tribes, Alaska Native villages, Tribal governments, Tribal lands or Tribal members.",
      false:
        "The word refers to something else, such as a group of people in general, an organization's name, or a non-Native group.",
    },
  }),
  deadline: (s) => ({
    type: "noul",
    instructions: `Does this sentence give a date by which something must happen or on which something takes effect? Sentence: "${s}"`,
    criteria: {
      true: "The sentence sets a comment deadline, an effective date, a compliance date, or another date by which something must be done.",
      false:
        "The dates in the sentence only record past events, such as when a document was published, a comment period that already closed, or a meeting that was held.",
    },
  }),
  status: (s) => ({
    type: "noul",
    instructions: `Does this sentence state the rulemaking status of this or a related document? Sentence: "${s}"`,
    criteria: {
      true: "The sentence says a document is proposed, final, interim final, withdrawn, rescinded, corrected, or that a comment period is extended or reopened.",
      false:
        "The matched word is used in another sense, such as final meaning last, or a general statement that does not say any document's status.",
    },
  }),
};
const FOR_TYPE = {
  consultation_language: ["any_consult", "tribal_consult"],
  tribal_reference: ["tribe_meaning"],
  date_or_deadline: ["deadline"],
  status_signal: ["status"],
};
const TRIBAL = /\b(?:Indian\s+Tribal?|Indian\s+Tribes?|Tribal|Tribes?)\b/i;
const CONSULT =
  /\bconsult(?:ation|ations|ed|ing|s)?\b|government-to-government|\btribal implications\b|\b(?:E\.?O\.?|Executive Order)\s*13175\b/i;
const HEADING = /13175|tribal|consultation/i;
const MAX_QUESTIONS = 60;
const MAX_MISS_CANDIDATES = 25;

async function ask(doc, items) {
  const answers = {};
  for (let i = 0; i < items.length; i += MAX_QUESTIONS) {
    const questions = Object.fromEntries(
      items.slice(i, i + MAX_QUESTIONS).map((item) => [item.id, item.q]),
    );
    const result = await askJev({
      state: {
        document: {
          title: doc.title,
          type: doc.type,
          agencies: (doc.agencies ?? []).map((a) => a.name).filter(Boolean),
        },
      },
      questions,
    });
    Object.assign(answers, result.answers);
  }
  return answers;
}

const rows = [];
const misses = [];
const headings = [];
const failures = [];
const tribalDocs = await listDocuments("tribal consultation", +values.tribal);
const generalDocs = await listDocuments("", +values.general);
const seen = new Set();
for (const [pool, doc] of [
  ...tribalDocs.map((d) => ["tribal", d]),
  ...generalDocs.map((d) => ["general", d]),
]) {
  if (seen.has(doc.document_number)) continue;
  seen.add(doc.document_number);
  const id = doc.document_number;
  try {
    const textUrl = `https://www.govinfo.gov/content/pkg/FR-${doc.publication_date}/html/${id}.htm`;
    const bytes = await officialBytes(textUrl, `${id}.htm`);
    const extracted = extractPolicyText({
      bytes,
      mediaType: "text/html",
      sourceKind: "govinfo_fr",
      url: textUrl,
      expectedIdentity: id,
    });
    const blocks = extracted.blocks.map((block) => ({
      text: block.text,
      locator: block.locator.headingPath.length
        ? `${block.locator.headingPath.join(" > ")} (${block.locator.value})`
        : block.locator.value,
      headingPath: block.locator.headingPath,
    }));
    const issues = identifyIssues(blocks, { kind: doc.type, title: doc.title });
    const items = [];
    for (const issue of issues) {
      for (const name of FOR_TYPE[issue.type] ?? []) {
        items.push({
          id: `${issue.id}__${name}`,
          q: QUESTIONS[name](issue.quote),
          issue,
          name,
        });
      }
    }
    // Recall: Tribal sentences the consultation rule did not match.
    const missPool = splitSentences(blocks)
      .filter((s) => TRIBAL.test(s.searchable) && !CONSULT.test(s.searchable))
      .slice(0, MAX_MISS_CANDIDATES);
    missPool.forEach((s, n) =>
      items.push({
        id: `miss_${n}`,
        q: QUESTIONS.tribal_consult(s.text.slice(0, 600)),
        sentence: s,
      }),
    );
    const answers = items.length ? await ask(doc, items) : {};
    for (const item of items) {
      const noul = answers[item.id]?.noul;
      if (typeof noul !== "number") {
        failures.push({ id, item: item.id, reason: "no answer" });
        continue;
      }
      if (item.issue) {
        rows.push({
          doc: id,
          pool,
          type: item.issue.type,
          question: item.name,
          noul,
          reading: band(noul),
          quote: item.issue.quote,
          locator: item.issue.locator,
        });
      } else if (band(noul) !== "no") {
        misses.push({
          doc: id,
          pool,
          noul,
          reading: band(noul),
          sentence: item.sentence.text.slice(0, 600),
          locator: item.sentence.locator,
          ruleSaidAbsent: issues.some((i) => i.type === "consultation_absent"),
        });
      }
    }
    const docHeadings = [
      ...new Set(blocks.flatMap((b) => b.headingPath)),
    ].filter((h) => HEADING.test(h));
    headings.push({
      doc: id,
      pool,
      type: doc.type,
      absent: issues.some((i) => i.type === "consultation_absent"),
      consultationHeadings: docHeadings,
    });
    console.log(`${id} ${pool}: ${items.length} questions`);
  } catch (error) {
    failures.push({ id, reason: String(error.message ?? error) });
    console.log(`${id} failed: ${error.message}`);
  }
}

const summary = {};
for (const row of rows) {
  const key = `${row.type}/${row.question}`;
  summary[key] ??= { yes: 0, no: 0, unsettled: 0 };
  summary[key][row.reading] += 1;
}
const out = join(
  LOG_DIR,
  `rule-audit-${new Date().toISOString().slice(0, 10)}.json`,
);
writeFileSync(
  out,
  JSON.stringify(
    { model: "jev-1.14.0", summary, rows, misses, headings, failures },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { summary, misses: misses.length, failures: failures.length, out },
    null,
    2,
  ),
);
