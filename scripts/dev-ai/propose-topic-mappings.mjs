// Development-only (D-114): Jev drafts Federal Register topic -> taxonomy
// subcategory candidates for people to review. Nothing here is a mapping until
// a reviewer adds it to config/taxonomy.v1.json with review provenance; the
// product keeps mapping only from exact official labels.
//
//   node scripts/dev-ai/propose-topic-mappings.mjs [--since 2024-01-01] [--min 20]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { askJev, band, LOG_DIR } from "./clients.mjs";

const { values } = parseArgs({
  options: {
    since: { type: "string", default: "2024-01-01" },
    min: { type: "string", default: "20" },
    concurrency: { type: "string", default: "6" },
  },
});
const taxonomy = JSON.parse(
  readFileSync(
    new URL("../../config/taxonomy.v1.json", import.meta.url),
    "utf8",
  ),
);
const subcategories = taxonomy.categories.flatMap((category) =>
  category.subcategories.map((sub) => ({ category, sub })),
);

const facetUrl = new URL(
  "https://www.federalregister.gov/api/v1/documents/facets/topic",
);
facetUrl.searchParams.set("conditions[publication_date][gte]", values.since);
const response = await fetch(facetUrl, {
  headers: { "user-agent": "PolicySentinelDev/0.9 (taxonomy proposal)" },
});
if (!response.ok) throw new Error(`Federal Register facets ${response.status}`);
const facets = await response.json();
const topics = Object.entries(facets)
  .map(([slug, value]) => ({ slug, name: value.name, count: value.count }))
  .filter((topic) => topic.name && topic.count >= Number(values.min))
  .sort((a, b) => b.count - a.count);
console.log(
  `${topics.length} topics with at least ${values.min} documents since ${values.since}`,
);

async function judge(topic) {
  const questions = Object.fromEntries(
    subcategories.map(({ category, sub }) => [
      sub.id,
      {
        type: "noul",
        instructions: `Do documents with the Federal Register topic in \`topic\` usually fall within the policy area "${category.label}: ${sub.label}" (${sub.description})?`,
        criteria: {
          true: "Most documents with this topic are about this policy area.",
          false:
            "Documents with this topic are mostly about something else, or touch this area only now and then.",
        },
      },
    ]),
  );
  const result = await askJev({ state: { topic: topic.name }, questions });
  return subcategories.map(({ category, sub }) => ({
    categoryId: category.id,
    subcategoryId: sub.id,
    noul: result.answers[sub.id]?.noul,
  }));
}

const proposals = [];
for (let i = 0; i < topics.length; i += Number(values.concurrency)) {
  const batch = topics.slice(i, i + Number(values.concurrency));
  const judged = await Promise.all(batch.map(judge));
  batch.forEach((topic, n) => {
    const candidates = judged[n]
      .filter((t) => typeof t.noul === "number" && band(t.noul) !== "no")
      .sort((a, b) => b.noul - a.noul)
      .map((t) => ({ ...t, reading: band(t.noul) }));
    proposals.push({ ...topic, candidates });
  });
  process.stdout.write(
    `${Math.min(i + batch.length, topics.length)}/${topics.length}\r`,
  );
}

const out = join(LOG_DIR, "fr-topic-mapping-proposals.json");
writeFileSync(
  out,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      model: "jev-1.14.0",
      taxonomyVersion: taxonomy.taxonomyVersion,
      facetQuery: facetUrl.href,
      status: "proposal-for-review",
      proposals,
    },
    null,
    2,
  ),
);
const mapped = proposals.filter((p) =>
  p.candidates.some((c) => c.reading === "yes"),
);
console.log(
  `\n${mapped.length} of ${proposals.length} topics have at least one yes candidate; ${out}`,
);
