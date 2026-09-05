import Ajv from "ajv";

const text = { type: "string", minLength: 1, maxLength: 8192 };
const hash = { type: "string", pattern: "^[a-f0-9]{64}$" };
const revision = { type: "string", pattern: "^[a-f0-9]{40}$" };
const id = {
  type: "string",
  pattern:
    "^[a-z][a-z0-9-]{0,47}:(document|knowledge|reference):[A-Za-z0-9][A-Za-z0-9-]{0,79}$",
};
const list = (items, minItems = 1, maxItems = 512) => ({
  type: "array",
  items,
  minItems,
  maxItems,
  uniqueItems: true,
});
const object = (properties, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const owners = object(
  Object.fromEntries(
    [
      "navigation",
      "work_status",
      "decisions",
      "product",
      "scope_acceptance",
      "data_governance",
      "component_dispositions",
      "protected_inputs",
    ].map((key) => [key, id]),
  ),
);
const adoption = object({
  source_artifact: text,
  source_artifact_sha256: hash,
  source_hash_domain: { const: "raw_file_bytes" },
  metadata_authority: { const: "sidecar_navigation_only" },
  export_disposition: { const: "local_only_metadata_projection" },
});
const common = {
  schema_version: { const: "1.0.0" },
  project: { type: "string", pattern: "^[a-z][a-z0-9-]{0,47}$" },
  source_revision: revision,
  authority: text,
  publication_status: { const: "local_review_package_not_reviewed_for_export" },
  adoption,
};
const document = object({
  id,
  path: text,
  title: text,
  observed_role: text,
  document_lifecycle_observation: text,
  purpose: text,
  source_revision: revision,
  working_file_sha256: hash,
  metadata_review: { const: "curated_proposal" },
  publication_status: { const: "not_reviewed_for_export" },
  git_pin: object({
    hash_domain: { const: "git_blob_bytes" },
    oid: revision,
    sha256: hash,
  }),
});
const locator = object({
  document: id,
  section: text,
  observed_line: { type: "integer", minimum: 1, maximum: 1000000 },
});
const entry = object({
  id,
  kind: {
    enum: [
      "method",
      "research_question",
      "governance_method",
      "developer_lesson",
      "developer_method",
      "experimental_method",
      "application_idea",
    ],
  },
  title: text,
  summary: text,
  evidence_maturity: {
    enum: [
      "reported_bounded_implementation",
      "reported_repair_with_limits",
      "reported_small_sample_analysis",
      "reported_evaluation_practice",
      "reported_metadata_repair",
      "reported_bounded_corpus_evidence",
      "reported_controlled_failure_check",
      "unproven_research_question",
      "reported_synthetic_contracts_real_acceptance_unresolved",
      "recorded_architectural_correction",
      "recorded_failed_launch_and_successor_design",
      "documented_operating_practice",
      "recorded_browser_repair_and_manual_disposition",
      "isolated_experiment_not_converged",
      "isolated_synthetic_experiment_not_converged",
      "historical_proposal_only",
      "synthetic_fixture",
    ],
  },
  observed_scope: text,
  limits: list(text),
  proposed_reuse: text,
  tags: list(text, 1, 32),
  sources: list(locator, 1, 32),
  extraction_review: { const: "curated_seed_not_a_new_acceptance_decision" },
  product_activation: { const: "none" },
  publication_status: { const: "not_reviewed_for_export" },
});
const reference = object(
  {
    id,
    kind: text,
    title: text,
    publisher: text,
    url: text,
    inspected_revision: revision,
    version_observation: text,
    verification: text,
    accessed: text,
    useful_for: text,
    limits: list(text),
    evidence: list(text),
    author_short: text,
    year: { type: "integer", minimum: 1600, maximum: 2100 },
    doi: text,
    inherited_from: id,
    inherited_section: text,
    related_entries: list(id),
    version_note: text,
  },
  ["id", "kind", "title", "url", "verification", "useful_for"],
);

export const schemas = {
  catalog: object({
    ...common,
    observed_at: text,
    source_root_alias: text,
    authority_owners: owners,
    editorial_policy: list(text),
    documents: list(document, 1, 256),
  }),
  entries: object({
    ...common,
    observed_at: text,
    source_resolution: text,
    entries: list(entry, 1, 256),
  }),
  references: object({
    ...common,
    review_date: text,
    references: list(reference, 1, 256),
  }),
  profile: object({
    schema_version: { const: "1.0.0" },
    project: common.project,
    source_root_alias: text,
    authority_owners: owners,
    allowed_source_paths: list(text, 1, 256),
    protected_inputs_registry: { type: ["string", "null"] },
    registry_links: list(
      object({
        document: id,
        selector: { enum: ["components_evidence", "exact_catalog_paths"] },
        review: { const: "reviewed_navigation_only" },
      }),
      0,
      16,
    ),
    relations: list(
      object({
        from: id,
        to: id,
        type: { enum: ["evidenced_by", "supersedes_in_scope", "disputed"] },
        evidence: locator,
        scope: text,
      }),
      0,
      64,
    ),
    output_protocol: { const: "owned_detached_vault_v1" },
    adaptation: text,
  }),
};
const ajv = new Ajv({ strict: true, allErrors: true });
const validators = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]),
);
export function assertSchema(name, value) {
  const validate = validators[name];
  if (!validate || !validate(value)) {
    throw new Error(
      `knowledge ${name} schema rejected: ${ajv.errorsText(validate?.errors, { separator: "; " })}`,
    );
  }
}
