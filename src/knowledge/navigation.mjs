import path from "node:path";
import { parseYaml, fail } from "./validate.mjs";

export const filename = (id) => `${id.replaceAll(":", "--")}.md`;
// Encode literal punctuation in rendered prose. No source text is interpreted
// as Markdown/HTML, wikilinks, embeds, tags or a template expression.
export const literal = (value) =>
  String(value)
    .replace(
      /[&<>[\]!*_`{}#|\\~$()]/g,
      (character) => `&#${character.codePointAt(0)};`,
    )
    .replaceAll("\r", "")
    .replaceAll("\n", " ");
const property = (value) =>
  String(value)
    .replaceAll("[", "［")
    .replaceAll("]", "］")
    .replaceAll("<", "＜")
    .replaceAll(">", "＞")
    .replace(/[\r\n]/g, " ");
const link = (id, title) => `[${literal(title)}](${filename(id)})`;
const properties = (values) =>
  `---\n${Object.entries(values)
    .map(
      ([key, value]) =>
        `${key}: ${JSON.stringify(typeof value === "string" ? property(value) : value)}`,
    )
    .join("\n")}\n---\n`;

export function buildNavigation(model) {
  const { profile, catalog, entries, references, sources, report } = model;
  const byPath = new Map(
    catalog.documents.map((record) => [record.path, record.id]),
  );
  const records = new Map(
    [...catalog.documents, ...entries.entries, ...references.references].map(
      (record) => [record.id, record],
    ),
  );
  const edges = [];
  let omittedUncatalogedTargets = 0;
  const add = (
    from,
    to,
    origin,
    evidence,
    type = "links_to",
    scope = "Navigation only; no authority or acceptance implied.",
  ) => edges.push({ from, to, type, origin, evidence, scope });
  for (const record of catalog.documents) {
    if (!record.path.endsWith(".md")) continue;
    const content = sources.get(record.id).current;
    // Conservatively omit comments, code and HTML lines before identifying
    // supported inline Markdown links. Omission is safer than inventing edges.
    const withoutCode = content
      .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
      .replace(
        /(^|\n) {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n {0,3}\2[^\n]*(?=\n|$)/g,
        "\n",
      )
      .replace(/^(?: {4}|\t|\s*<)[^\n]*$/gm, "")
      .replace(/`+[^`\n]*`+/g, "");
    for (const match of withoutCode.matchAll(
      /(?<![!\\])\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      const raw = match[1].replace(/^<|>$/g, "");
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("#")) continue;
      let destination;
      try {
        destination = decodeURIComponent(raw.split("#")[0]);
      } catch {
        omittedUncatalogedTargets += 1;
        continue;
      }
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(record.path), destination),
      );
      if (byPath.has(target))
        add(record.id, byPath.get(target), "explicit_markdown", {
          document: record.id,
          destination: target,
          freshness: report.observations.find((item) => item.id === record.id)
            .content_observation,
        });
      else omittedUncatalogedTargets += 1;
    }
  }
  for (const registry of profile.registry_links) {
    const record = records.get(registry.document);
    const bytes = sources.get(registry.document).current;
    const data = record.path.endsWith(".json")
      ? JSON.parse(bytes)
      : parseYaml(bytes, "navigation registry");
    if (registry.selector === "components_evidence") {
      if (!Array.isArray(data.components))
        fail("reviewed component registry has no components");
      for (const component of data.components) {
        if (!Array.isArray(component.evidence))
          fail("component registry evidence is malformed");
        for (const target of component.evidence)
          if (byPath.has(target))
            add(registry.document, byPath.get(target), "reviewed_registry", {
              document: registry.document,
              component: component.id,
              selector: registry.selector,
            });
      }
    } else {
      const visit = (value, locator) => {
        if (typeof value === "string") {
          for (const [target, id] of byPath) {
            // Only a literal path with token boundaries, never keyword similarity.
            const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (
              new RegExp(`(?:^|[\\s\x60(])${escaped}(?=$|[\\s\x60).,;])`).test(
                value,
              )
            )
              add(registry.document, id, "reviewed_registry", {
                document: registry.document,
                selector: registry.selector,
                locator,
              });
          }
        } else if (Array.isArray(value))
          value.forEach((item, index) => visit(item, `${locator}/${index}`));
        else if (value && typeof value === "object")
          for (const [key, child] of Object.entries(value))
            visit(child, `${locator}/${key}`);
      };
      visit(data, "");
    }
  }
  for (const record of entries.entries)
    for (const locator of record.sources)
      add(record.id, locator.document, "curated_source_locator", locator);
  for (const record of references.references) {
    if (record.inherited_from)
      add(record.id, record.inherited_from, "inherited_bibliography", {
        document: record.inherited_from,
        section: record.inherited_section,
      });
    for (const id of record.related_entries ?? [])
      add(record.id, id, "curated_reference_relation", {
        reference: record.id,
      });
  }
  for (const relation of profile.relations)
    add(
      relation.from,
      relation.to,
      "explicit_scoped_relation",
      relation.evidence,
      relation.type,
      relation.scope,
    );
  const graph = {
    schema_version: "1.0.0",
    project: profile.project,
    scope:
      "Catalog records only; omitted uncataloged destinations are neither absent evidence nor deletion candidates.",
    omitted_uncataloged_targets: omittedUncatalogedTargets,
    nodes: [...records.keys()].sort(),
    edges: [
      ...new Map(edges.map((edge) => [JSON.stringify(edge), edge])).values(),
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  };
  const files = new Map();
  const addFile = (name, content) => {
    if (
      [...files.keys()].some(
        (existing) => existing.toLowerCase() === name.toLowerCase(),
      )
    )
      fail("generated filename case-fold collision");
    files.set(name, content);
  };
  const notice =
    "Generated one-way metadata projection. Edit the repository YAML, not this card. Local reading only; source qualification, work status and acceptance remain with their named owners.\n";
  for (const record of [...records.values()].sort((a, b) =>
    a.id.localeCompare(b.id, "en"),
  )) {
    const observation = report.observations.find(
      (item) => item.id === record.id,
    );
    const kind = record.id.split(":")[1];
    const freshness = observation
      ? observation.content_observation
      : "historical_metadata_observation";
    let body = properties({
      knowledge_id: record.id,
      project: profile.project,
      kind,
      title: record.title,
      freshness,
      raw_observation: observation?.raw_observation ?? "not_applicable",
      evidence_maturity:
        record.evidence_maturity ??
        record.document_lifecycle_observation ??
        record.verification,
      export_disposition: "local_only_metadata_projection",
      publish: false,
    });
    body += `\n# ${literal(record.title)}\n\n${notice}\n`;
    if (observation) {
      body += `Current-file observation: **${freshness}**; ${observation.raw_observation}. Historical Git pin: verified.\n\n`;
      body += `Repository location: ${literal(record.path)}. Read the current source using the repository backbone or editor. Historical citation: ${record.source_revision}; Git blob ${record.git_pin.oid}.\n\n`;
      body += `Purpose: ${literal(record.purpose)}\n\nObserved lifecycle: ${literal(record.document_lifecycle_observation)}. This remains a dated observation.\n\n`;
      body += `Raw seed SHA-256: ${record.working_file_sha256}\n\nGit blob SHA-256: ${record.git_pin.sha256}\n\n`;
    } else if (kind === "knowledge") {
      body += `${literal(record.summary)}\n\nObserved scope: ${literal(record.observed_scope)}\n\nEvidence maturity: ${literal(record.evidence_maturity)}. Product activation: none.\n\nLimits:\n\n${record.limits.map((limit) => `- ${literal(limit)}`).join("\n")}\n\nPossible reuse: ${literal(record.proposed_reuse)}\n\n`;
      body += `Historical source locators:\n\n${record.sources.map((source) => `- ${link(source.document, records.get(source.document).title)} — ${literal(source.section)}, line ${source.observed_line}, pinned revision ${catalog.source_revision}. Current freshness is shown on the source card.`).join("\n")}\n\n`;
    } else {
      body += `Verification: ${literal(record.verification)}\n\nUse: ${literal(record.useful_for)}\n\nReference URL (literal; no automatic request): ${literal(record.url)}\n\n`;
      body += `Limits:\n\n${(record.limits ?? ["Inherited bibliography requires fresh primary review before publication."]).map((limit) => `- ${literal(limit)}`).join("\n")}\n\n`;
    }
    const outgoing = [
      ...new Set(
        graph.edges
          .filter((edge) => edge.from === record.id)
          .map((edge) => edge.to),
      ),
    ];
    body += `Navigation links (links_to unless the graph records an explicitly scoped relation):\n\n${outgoing.map((id) => `- ${link(id, records.get(id).title)}`).join("\n") || "No cataloged outgoing links."}\n\n[Reading index](INDEX.md)\n`;
    addFile(filename(record.id), body);
  }
  let index = `# ${literal(profile.project)} reading index\n\n${notice}\nHistorical metadata is pinned to ${catalog.source_revision}; ${report.stale_documents} current raw observations are stale. A stale observation is visible evidence to review, not an automatic pin refresh.\n\n`;
  index += `## Authority owners\n\n${Object.entries(profile.authority_owners)
    .map(
      ([role, id]) => `- ${literal(role)}: ${link(id, records.get(id).title)}`,
    )
    .join("\n")}\n\n`;
  for (const kind of ["document", "knowledge", "reference"]) {
    index += `## ${kind}\n\n${[...records.values()]
      .filter((record) => record.id.split(":")[1] === kind)
      .map(
        (record) =>
          `- ${link(record.id, record.title)}${kind === "document" ? ` — ${report.observations.find((item) => item.id === record.id).content_observation}` : ""}`,
      )
      .join("\n")}\n\n`;
    addFile(
      `${kind}.base`,
      `filters:\n  and:\n    - 'file.ext == "md"'\n    - 'note.project == "${profile.project}"'\n    - 'note.kind == "${kind}"'\nviews:\n  - type: table\n    name: ${kind}\n    order:\n      - file.name\n      - note.title\n      - note.freshness\n      - note.evidence_maturity\n`,
    );
  }
  addFile("INDEX.md", index);
  addFile("navigation.json", `${JSON.stringify(graph, null, 2)}\n`);
  addFile("validation.json", `${JSON.stringify(report, null, 2)}\n`);
  return { files, graph };
}
