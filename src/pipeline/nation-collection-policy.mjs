import { URL } from "node:url";

const EXPECTED_NATION_COUNT = 575;
const STATE_CODES = new Set(["WA", "OR", "ID"]);
const PRODUCTION_COLLECTION_FIELDS = [
  "registryVersion",
  "identityRule",
  "publicationReview",
  "validation",
  "sourceHealth",
];
const PRODUCTION_NATION_FIELDS = [
  "aliasProvenance",
  "sourceIdentifier",
  "officialListEntry",
  "section",
  "sourceEvidence",
  "fieldProvenance",
];
const REQUIRED_PRODUCTION_PROVENANCE = [
  "/id",
  "/officialName",
  "/recognitionBaselineVersion",
  "/sourceIdentifier",
  "/officialListEntry",
  "/section",
  "/sourceEvidence",
];
const ALLOWED_PROVENANCE_FIELDS = new Set([
  ...REQUIRED_PRODUCTION_PROVENANCE,
  "/authorizedAliases",
  "/stateCoverage",
]);
const PROHIBITED_KEYS = new Set([
  "acreage",
  "address",
  "city",
  "contact",
  "contactemail",
  "contactname",
  "coordinates",
  "email",
  "fax",
  "feeland",
  "geometry",
  "geography",
  "land",
  "landownership",
  "lands",
  "latitude",
  "location",
  "longitude",
  "mailingaddress",
  "mapdata",
  "ownership",
  "parcel",
  "parcelgeometry",
  "parcelid",
  "person",
  "personaldata",
  "phone",
  "physicaladdress",
  "postalcode",
  "privatedata",
  "reservation",
  "territory",
  "triballeadersdirectory",
  "triballyownedparcel",
  "trustland",
]);

export class NationCollectionPolicyError extends Error {
  constructor(issues) {
    super(
      `Nation collection policy validation failed:\n${issues
        .map((issue) => `- ${issue}`)
        .join("\n")}`,
    );
    this.name = "NationCollectionPolicyError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizedIdentity(value) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function isCanonicalIdentityText(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.normalize("NFC").replace(/\s+/g, " ").trim()
  );
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isIsoDateTime(value) {
  if (typeof value !== "string") {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isSafeHttpsUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname === "" ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.port !== ""
    ) {
      return false;
    }
    const credentialParameterNames = new Set([
      "access_token",
      "api_key",
      "apikey",
      "auth",
      "authorization",
      "key",
      "password",
      "secret",
      "token",
    ]);
    return [...parsed.searchParams.keys()].every(
      (key) => !credentialParameterNames.has(key.toLocaleLowerCase("en-US")),
    );
  } catch {
    return false;
  }
}

function inspectProhibitedKeys(value, path, issues) {
  if (!isObject(value) && !Array.isArray(value)) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectProhibitedKeys(item, `${path}/${index}`, issues),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9]/g, "");
    if (PROHIBITED_KEYS.has(normalizedKey)) {
      issues.push(`${path || "/"} contains prohibited field ${key}`);
    }
    inspectProhibitedKeys(child, `${path}/${key}`, issues);
  }
}

function requireString(value, label, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function validateBaseline(document, manifestSynthetic, issues) {
  const baseline = isObject(document.baseline) ? document.baseline : null;
  if (baseline === null) {
    issues.push("baseline must be an object");
    return {};
  }
  if (baseline.count !== EXPECTED_NATION_COUNT) {
    issues.push(`baseline count must be exactly ${EXPECTED_NATION_COUNT}`);
  }
  requireString(baseline.version, "baseline version", issues);
  requireString(baseline.authorityName, "baseline authority name", issues);
  if (!isSafeHttpsUrl(baseline.authorityUrl)) {
    issues.push("baseline authority URL must be a safe HTTPS URL");
  }
  if (typeof baseline.synthetic !== "boolean") {
    issues.push("baseline synthetic flag must be boolean");
  }
  if (typeof manifestSynthetic !== "boolean") {
    issues.push("manifest synthetic discriminator must be provided");
  } else if (baseline.synthetic !== manifestSynthetic) {
    issues.push("manifest and Nation baseline synthetic flags must match");
  }
  return baseline;
}

function validateStateEvidence(
  nation,
  label,
  provenanceByField,
  generatedAt,
  issues,
) {
  const coverage = nation.stateCoverage;
  if (!isObject(coverage)) {
    issues.push(`${label} state coverage must be an object`);
    return;
  }
  const states = Array.isArray(coverage.states) ? coverage.states : [];
  if (!Array.isArray(coverage.states)) {
    issues.push(`${label} state coverage states must be an array`);
  }
  const uniqueStates = new Set();
  for (const state of states) {
    if (!STATE_CODES.has(state)) {
      issues.push(
        `${label} has unsupported state coverage code ${String(state)}`,
      );
    }
    if (uniqueStates.has(state)) {
      issues.push(`${label} repeats state coverage code ${String(state)}`);
    }
    uniqueStates.add(state);
  }
  if (coverage.federalOnly !== (states.length === 0)) {
    issues.push(`${label} federal-only flag does not match state coverage`);
  }

  const evidence = Array.isArray(coverage.evidence) ? coverage.evidence : [];
  if (
    coverage.basis === "unresolved_no_reviewed_crosswalk" &&
    (states.length !== 0 ||
      coverage.federalOnly !== true ||
      evidence.length !== 0)
  ) {
    issues.push(`${label} unresolved state coverage must remain federal-only`);
  } else if (coverage.basis === "reviewed_official_crosswalk") {
    if (states.length === 0 || coverage.federalOnly !== false) {
      issues.push(
        `${label} reviewed state coverage must identify at least one state`,
      );
    }
    if (
      !Array.isArray(coverage.evidence) ||
      evidence.length !== states.length
    ) {
      issues.push(
        `${label} must carry one authoritative evidence item per state`,
      );
    }
    const evidenceStates = new Set();
    const allowedNames = new Set([
      nation.officialName,
      ...(Array.isArray(nation.authorizedAliases)
        ? nation.authorizedAliases
        : []),
    ]);
    for (const [index, item] of evidence.entries()) {
      const evidenceLabel = `${label} state evidence ${index}`;
      if (!isObject(item)) {
        issues.push(`${evidenceLabel} must be an object`);
        continue;
      }
      if (!states.includes(item.state) || evidenceStates.has(item.state)) {
        issues.push(
          `${evidenceLabel} does not uniquely match an accepted state`,
        );
      }
      evidenceStates.add(item.state);
      if (item.basis !== "reviewed_official_crosswalk") {
        issues.push(`${evidenceLabel} has an invalid evidence basis`);
      }
      if (
        !requireString(
          item.sourceNationName,
          `${evidenceLabel} source Nation name`,
          issues,
        ) ||
        !allowedNames.has(item.sourceNationName)
      ) {
        issues.push(
          `${evidenceLabel} source Nation name is not an authorized identity`,
        );
      }
      if (
        !requireString(
          item.evidenceText,
          `${evidenceLabel} exact text`,
          issues,
        ) ||
        !item.evidenceText.includes(item.sourceNationName ?? "")
      ) {
        issues.push(
          `${evidenceLabel} does not contain the exact source Nation name`,
        );
      }
      requireString(
        item.sourceIdentifier,
        `${evidenceLabel} source identifier`,
        issues,
      );
      if (!isSafeHttpsUrl(item.evidenceUrl)) {
        issues.push(`${evidenceLabel} URL must be a safe HTTPS URL`);
      }
      if (item.sourceDate !== null && !isIsoDate(item.sourceDate)) {
        issues.push(`${evidenceLabel} source date must be an ISO date or null`);
      }
      if (!isIsoDateTime(item.retrievedAt)) {
        issues.push(`${evidenceLabel} retrieval time must be an ISO date-time`);
      } else if (item.retrievedAt > generatedAt) {
        issues.push(
          `${evidenceLabel} retrieval time is after collection generation`,
        );
      }
      if (item.validationState !== "validated") {
        issues.push(`${evidenceLabel} must be validated`);
      }
      const coverageProvenance = provenanceByField.get("/stateCoverage") ?? [];
      if (
        !coverageProvenance.some(
          ({ sourceUrl }) => sourceUrl === item.evidenceUrl,
        )
      ) {
        issues.push(
          `${evidenceLabel} lacks matching state-coverage field provenance`,
        );
      }
    }
  } else if (coverage.basis !== "unresolved_no_reviewed_crosswalk") {
    issues.push(`${label} production state coverage has an unsupported basis`);
  }
}

function validateAliasEvidence(
  nation,
  label,
  provenanceByField,
  generatedAt,
  issues,
) {
  const aliases = Array.isArray(nation.authorizedAliases)
    ? nation.authorizedAliases
    : [];
  const evidence = Array.isArray(nation.aliasProvenance)
    ? nation.aliasProvenance
    : [];
  if (!Array.isArray(nation.aliasProvenance)) {
    issues.push(`${label} alias provenance must be an array`);
    return;
  }
  const evidenceByAlias = new Map();
  for (const [index, item] of evidence.entries()) {
    const evidenceLabel = `${label} alias evidence ${index}`;
    if (!isObject(item)) {
      issues.push(`${evidenceLabel} must be an object`);
      continue;
    }
    if (!aliases.includes(item.alias) || evidenceByAlias.has(item.alias)) {
      issues.push(
        `${evidenceLabel} does not uniquely match an authorized alias`,
      );
    }
    evidenceByAlias.set(item.alias, item);
    if (item.basis !== "official_cross_reference") {
      issues.push(`${evidenceLabel} has an invalid evidence basis`);
    }
    if (
      !requireString(
        item.evidenceText,
        `${evidenceLabel} exact text`,
        issues,
      ) ||
      !item.evidenceText.includes(item.alias ?? "")
    ) {
      issues.push(`${evidenceLabel} does not contain the exact alias`);
    }
    if (!isSafeHttpsUrl(item.evidenceUrl)) {
      issues.push(`${evidenceLabel} URL must be a safe HTTPS URL`);
    }
    if (!isIsoDateTime(item.retrievedAt)) {
      issues.push(`${evidenceLabel} retrieval time must be an ISO date-time`);
    } else if (item.retrievedAt > generatedAt) {
      issues.push(
        `${evidenceLabel} retrieval time is after collection generation`,
      );
    }
    if (item.validationState !== "validated") {
      issues.push(`${evidenceLabel} must be validated`);
    }
    const aliasProvenance = provenanceByField.get("/authorizedAliases") ?? [];
    if (
      !aliasProvenance.some(({ sourceUrl }) => sourceUrl === item.evidenceUrl)
    ) {
      issues.push(`${evidenceLabel} lacks matching alias field provenance`);
    }
  }
  for (const alias of aliases) {
    if (!evidenceByAlias.has(alias)) {
      issues.push(
        `${label} authorized alias ${JSON.stringify(alias)} lacks official evidence`,
      );
    }
  }
}

function validateFieldProvenance(nation, document, label, issues) {
  const entries = Array.isArray(nation.fieldProvenance)
    ? nation.fieldProvenance
    : [];
  if (!Array.isArray(nation.fieldProvenance) || entries.length === 0) {
    issues.push(`${label} field provenance must be a non-empty array`);
  }
  const byField = new Map();
  const exactEntries = new Set();
  for (const [index, entry] of entries.entries()) {
    const entryLabel = `${label} field provenance ${index}`;
    if (!isObject(entry)) {
      issues.push(`${entryLabel} must be an object`);
      continue;
    }
    if (!ALLOWED_PROVENANCE_FIELDS.has(entry.field)) {
      issues.push(
        `${entryLabel} references unsupported field ${String(entry.field)}`,
      );
    }
    if (!byField.has(entry.field)) {
      byField.set(entry.field, []);
    }
    byField.get(entry.field).push(entry);
    const exactKey = `${entry.field}\u0000${entry.sourceUrl}\u0000${entry.sourceDate}`;
    if (exactEntries.has(exactKey)) {
      issues.push(`${entryLabel} duplicates an exact provenance entry`);
    }
    exactEntries.add(exactKey);
    if (!isSafeHttpsUrl(entry.sourceUrl)) {
      issues.push(`${entryLabel} source URL must be a safe HTTPS URL`);
    }
    if (!isIsoDate(entry.sourceDate)) {
      issues.push(`${entryLabel} source date must be an ISO date`);
    }
    if (!isIsoDateTime(entry.retrievedAt)) {
      issues.push(`${entryLabel} retrieval time must be an ISO date-time`);
    } else if (entry.retrievedAt > document.generatedAt) {
      issues.push(
        `${entryLabel} retrieval time is after collection generation`,
      );
    }
    if (
      isIsoDate(entry.sourceDate) &&
      isIsoDateTime(entry.retrievedAt) &&
      entry.sourceDate > entry.retrievedAt.slice(0, 10)
    ) {
      issues.push(`${entryLabel} source date is after retrieval`);
    }
    if (
      ![
        "copied",
        "deterministic_mapping",
        "reconciled_official_cross_reference",
        "combined",
      ].includes(entry.transformation)
    ) {
      issues.push(`${entryLabel} has an unsupported transformation`);
    }
    if (entry.validationState !== "validated") {
      issues.push(`${entryLabel} must be validated`);
    }
  }

  for (const field of REQUIRED_PRODUCTION_PROVENANCE) {
    if (!byField.has(field)) {
      issues.push(`${label} source-derived field ${field} lacks provenance`);
    }
  }
  if (
    Array.isArray(nation.authorizedAliases) &&
    nation.authorizedAliases.length > 0 &&
    !byField.has("/authorizedAliases")
  ) {
    issues.push(`${label} authorized aliases lack field provenance`);
  }
  if (
    nation.stateCoverage?.basis === "reviewed_official_crosswalk" &&
    !byField.has("/stateCoverage")
  ) {
    issues.push(`${label} reviewed state coverage lacks field provenance`);
  }
  if (
    nation.stateCoverage?.basis === "unresolved_no_reviewed_crosswalk" &&
    byField.has("/stateCoverage")
  ) {
    issues.push(
      `${label} unresolved state coverage cannot claim field provenance`,
    );
  }

  const idProvenance = byField.get("/id") ?? [];
  if (
    idProvenance.length === 0 ||
    idProvenance.some(
      (entry) =>
        entry.transformation !== "deterministic_mapping" ||
        entry.transformRuleId !== document.identityRule?.id,
    )
  ) {
    issues.push(
      `${label} stable ID provenance must use the collection identity rule`,
    );
  }

  const baselineUrls = new Set([
    document.baseline?.authorityUrl,
    document.baseline?.structuredTranscriptionUrl,
    document.baseline?.officialTextUrl,
    document.baseline?.officialPdfUrl,
  ]);
  for (const field of REQUIRED_PRODUCTION_PROVENANCE.filter(
    (candidate) => candidate !== "/id",
  )) {
    for (const entry of byField.get(field) ?? []) {
      if (!baselineUrls.has(entry.sourceUrl)) {
        issues.push(
          `${label} ${field} provenance is not bound to the recognition baseline`,
        );
      }
    }
  }
  return byField;
}

function validateProductionNation(
  nation,
  index,
  document,
  sourceIdentifiers,
  paragraphIdentifiers,
  issues,
) {
  const label = `Nation ${index}`;
  for (const field of PRODUCTION_NATION_FIELDS) {
    if (!(field in nation)) {
      issues.push(`${label} lacks required production field ${field}`);
    }
  }
  requireString(nation.sourceIdentifier, `${label} source identifier`, issues);
  if (sourceIdentifiers.has(nation.sourceIdentifier)) {
    issues.push(
      `${label} duplicates source identifier ${String(nation.sourceIdentifier)}`,
    );
  }
  sourceIdentifiers.add(nation.sourceIdentifier);
  if (
    !requireString(
      nation.officialListEntry,
      `${label} official list entry`,
      issues,
    ) ||
    nation.officialListEntry !== nation.officialName
  ) {
    issues.push(
      `${label} official name must exactly match its reviewed list entry`,
    );
  }
  if (!["contiguous_48", "alaska"].includes(nation.section)) {
    issues.push(`${label} has an invalid recognition section`);
  }

  const evidence = Array.isArray(nation.sourceEvidence)
    ? nation.sourceEvidence
    : [];
  if (!Array.isArray(nation.sourceEvidence) || evidence.length === 0) {
    issues.push(`${label} source evidence must be a non-empty array`);
  }
  let bindsOfficialEntry = false;
  let bindsSourceIdentifier = false;
  for (const [evidenceIndex, item] of evidence.entries()) {
    const evidenceLabel = `${label} source evidence ${evidenceIndex}`;
    if (!isObject(item)) {
      issues.push(`${evidenceLabel} must be an object`);
      continue;
    }
    if (!requireString(item.exactText, `${evidenceLabel} exact text`, issues)) {
      continue;
    }
    if (item.exactText === nation.officialListEntry) {
      bindsOfficialEntry = true;
    }
    requireString(item.paragraphId, `${evidenceLabel} paragraph ID`, issues);
    if (item.paragraphId === nation.sourceIdentifier) {
      bindsSourceIdentifier = true;
    }
    if (paragraphIdentifiers.has(item.paragraphId)) {
      issues.push(
        `${evidenceLabel} reuses recognition paragraph ${String(item.paragraphId)}`,
      );
    }
    paragraphIdentifiers.add(item.paragraphId);
    if (item.section !== nation.section) {
      issues.push(`${evidenceLabel} section differs from its Nation identity`);
    }
    if (item.sourceUrl !== document.baseline?.structuredTranscriptionUrl) {
      issues.push(
        `${evidenceLabel} is not bound to the reviewed transcription`,
      );
    }
    if (item.officialTextUrl !== document.baseline?.officialTextUrl) {
      issues.push(
        `${evidenceLabel} official-text URL differs from the baseline`,
      );
    }
    if (item.officialPdfUrl !== document.baseline?.officialPdfUrl) {
      issues.push(
        `${evidenceLabel} official-PDF URL differs from the baseline`,
      );
    }
    for (const [urlLabel, url] of [
      ["source", item.sourceUrl],
      ["official text", item.officialTextUrl],
      ["official PDF", item.officialPdfUrl],
    ]) {
      if (!isSafeHttpsUrl(url)) {
        issues.push(
          `${evidenceLabel} ${urlLabel} URL must be a safe HTTPS URL`,
        );
      }
    }
  }
  if (!bindsOfficialEntry) {
    issues.push(
      `${label} source evidence does not contain its exact official list entry`,
    );
  }
  if (!bindsSourceIdentifier) {
    issues.push(
      `${label} source identifier does not identify its source evidence`,
    );
  }

  const provenanceByField = validateFieldProvenance(
    nation,
    document,
    label,
    issues,
  );
  validateAliasEvidence(
    nation,
    label,
    provenanceByField,
    document.generatedAt,
    issues,
  );
  validateStateEvidence(
    nation,
    label,
    provenanceByField,
    document.generatedAt,
    issues,
  );
}

function validateCommonNation(
  nation,
  index,
  baseline,
  identityOwners,
  nationIds,
  issues,
) {
  const label = `Nation ${index}`;
  if (!isObject(nation)) {
    issues.push(`${label} must be an object`);
    return false;
  }
  if (
    typeof nation.id !== "string" ||
    !/^nation:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nation.id)
  ) {
    issues.push(`${label} has a malformed Nation ID`);
  } else if (nationIds.has(nation.id)) {
    issues.push(`${label} duplicates Nation ID ${nation.id}`);
  }
  nationIds.add(nation.id);
  if (!isCanonicalIdentityText(nation.officialName)) {
    issues.push(
      `${label} official name is blank or not canonically normalized`,
    );
  }
  if (!Array.isArray(nation.authorizedAliases)) {
    issues.push(`${label} authorized aliases must be an array`);
  }
  if (nation.recognitionBaselineVersion !== baseline.version) {
    issues.push(
      `${label} recognition baseline version does not match the collection`,
    );
  }

  const labels = [
    [nation.officialName, "official name"],
    ...(Array.isArray(nation.authorizedAliases)
      ? nation.authorizedAliases.map((alias) => [alias, "authorized alias"])
      : []),
  ];
  const localLabels = new Set();
  for (const [value, kind] of labels) {
    if (!isCanonicalIdentityText(value)) {
      issues.push(`${label} ${kind} is blank or not canonically normalized`);
      continue;
    }
    const normalized = normalizedIdentity(value);
    if (localLabels.has(normalized)) {
      issues.push(`${label} repeats an official name or authorized alias`);
    }
    localLabels.add(normalized);
    const owner = identityOwners.get(normalized);
    if (owner !== undefined && owner !== nation.id) {
      issues.push(`${label} ${kind} collides with identity ${owner}`);
    } else {
      identityOwners.set(normalized, nation.id);
    }
  }

  if (!isObject(nation.stateCoverage)) {
    issues.push(`${label} state coverage must be an object`);
  }
  return true;
}

function validateProductionCollection(document, baseline, nations, issues) {
  for (const field of PRODUCTION_COLLECTION_FIELDS) {
    if (!(field in document)) {
      issues.push(`production Nation collection lacks ${field}`);
    }
  }
  if (
    !requireString(
      document.registryVersion,
      "production registry version",
      issues,
    ) ||
    !/^\d+\.\d+\.\d+$/.test(document.registryVersion ?? "")
  ) {
    issues.push("production registry version must use semantic versioning");
  }
  if (
    !isObject(document.identityRule) ||
    !requireString(document.identityRule?.id, "identity rule ID", issues) ||
    !/^\d+\.\d+\.\d+$/.test(document.identityRule?.version ?? "") ||
    !requireString(
      document.identityRule?.description,
      "identity rule description",
      issues,
    )
  ) {
    issues.push("production identity rule is incomplete or malformed");
  }
  const review = document.publicationReview;
  if (
    !isObject(review) ||
    review.state !== "completed" ||
    review.blocking !== false ||
    !requireString(
      review.reasonCode,
      "publication review reason code",
      issues,
    ) ||
    !requireString(review.note, "publication review note", issues) ||
    !isIsoDateTime(review.reviewedAt)
  ) {
    issues.push(
      "production Nation collection lacks a completed non-blocking review",
    );
  } else if (review.reviewedAt > document.generatedAt) {
    issues.push("production review is after collection generation");
  }
  for (const field of [
    "documentNumber",
    "publicationDate",
    "officialTextUrl",
    "officialPdfUrl",
    "structuredTranscriptionUrl",
  ]) {
    if (!(field in baseline)) {
      issues.push(`production recognition baseline lacks ${field}`);
    }
  }
  requireString(baseline.documentNumber, "baseline document number", issues);
  if (!isIsoDate(baseline.publicationDate)) {
    issues.push("baseline publication date must be an ISO date");
  } else if (baseline.publicationDate > document.generatedAt.slice(0, 10)) {
    issues.push("baseline publication date is after collection generation");
  }
  for (const [label, url] of [
    ["official text", baseline.officialTextUrl],
    ["official PDF", baseline.officialPdfUrl],
    ["structured transcription", baseline.structuredTranscriptionUrl],
  ]) {
    if (!isSafeHttpsUrl(url)) {
      issues.push(`baseline ${label} URL must be a safe HTTPS URL`);
    }
  }

  const sourceIdentifiers = new Set();
  const paragraphIdentifiers = new Set();
  nations.forEach((nation, index) => {
    if (isObject(nation)) {
      validateProductionNation(
        nation,
        index,
        document,
        sourceIdentifiers,
        paragraphIdentifiers,
        issues,
      );
    }
  });

  const validation = document.validation;
  if (!isObject(validation)) {
    issues.push("production validation summary must be an object");
  } else {
    if (validation.state !== "validated") {
      issues.push("production validation summary must be validated");
    }
    if (validation.rawEntryCount !== paragraphIdentifiers.size) {
      issues.push(
        "validation raw-entry count does not match unique source evidence",
      );
    }
    if (
      validation.reconciledNationCount !== EXPECTED_NATION_COUNT ||
      validation.uniqueIdCount !== EXPECTED_NATION_COUNT ||
      validation.uniqueOfficialNameCount !== EXPECTED_NATION_COUNT
    ) {
      issues.push(
        "validation summary does not attest exactly 575 unique identities",
      );
    }
    if (validation.transcriptCompared !== true) {
      issues.push("production validation must attest transcript comparison");
    }
    if (
      !Array.isArray(validation.reconciliationRuleIds) ||
      validation.reconciliationRuleIds.length === 0 ||
      new Set(validation.reconciliationRuleIds).size !==
        validation.reconciliationRuleIds.length
    ) {
      issues.push("production validation lacks unique reconciliation rule IDs");
    }
  }

  const health = document.sourceHealth;
  if (
    !isObject(health) ||
    health.status !== "healthy" ||
    health.usingLastKnownGood !== false ||
    health.message !== null ||
    !isIsoDateTime(health.checkedAt) ||
    !isIsoDate(health.dataAsOf) ||
    !isIsoDateTime(health.lastSuccessfulRetrievalAt)
  ) {
    issues.push(
      "production recognition source health must be current and healthy",
    );
  } else {
    if (health.checkedAt > document.generatedAt) {
      issues.push(
        "recognition source health check is after collection generation",
      );
    }
    if (health.lastSuccessfulRetrievalAt > document.generatedAt) {
      issues.push(
        "recognition source retrieval is after collection generation",
      );
    }
    if (health.lastSuccessfulRetrievalAt > health.checkedAt) {
      issues.push("recognition source retrieval is after its health check");
    }
    if (health.dataAsOf !== baseline.publicationDate) {
      issues.push(
        "recognition source data-as-of date does not match the baseline publication",
      );
    }
  }
}

function validateSyntheticCollection(document, nations, issues) {
  for (const field of PRODUCTION_COLLECTION_FIELDS) {
    if (field in document) {
      issues.push(
        `synthetic Nation collection cannot claim production field ${field}`,
      );
    }
  }
  nations.forEach((nation, index) => {
    if (!isObject(nation)) {
      return;
    }
    const label = `Nation ${index}`;
    for (const field of PRODUCTION_NATION_FIELDS) {
      if (field in nation) {
        issues.push(
          `${label} synthetic identity cannot claim production field ${field}`,
        );
      }
    }
    const coverage = isObject(nation.stateCoverage) ? nation.stateCoverage : {};
    if (coverage.basis !== "synthetic_fixture") {
      issues.push(
        `${label} synthetic state coverage must use synthetic_fixture`,
      );
    }
    const states = Array.isArray(coverage.states) ? coverage.states : [];
    if (!Array.isArray(coverage.states)) {
      issues.push(`${label} state coverage states must be an array`);
    }
    const uniqueStates = new Set();
    for (const state of states) {
      if (!STATE_CODES.has(state)) {
        issues.push(
          `${label} has unsupported state coverage code ${String(state)}`,
        );
      }
      if (uniqueStates.has(state)) {
        issues.push(`${label} repeats state coverage code ${String(state)}`);
      }
      uniqueStates.add(state);
    }
    if (coverage.federalOnly !== (states.length === 0)) {
      issues.push(`${label} federal-only flag does not match state coverage`);
    }
    if (
      "evidence" in coverage &&
      (!Array.isArray(coverage.evidence) || coverage.evidence.length !== 0)
    ) {
      issues.push(
        `${label} synthetic state coverage cannot claim official evidence`,
      );
    }
  });
}

export function validateNationCollectionPolicy(
  document,
  { manifestSynthetic } = {},
) {
  const issues = [];
  if (!isObject(document)) {
    return ["Nation collection must be an object"];
  }
  inspectProhibitedKeys(document, "", issues);
  if (document.artifactType !== "nation-collection") {
    issues.push("artifact type must be nation-collection");
  }
  if (document.schemaVersion !== "1.0.0") {
    issues.push("Nation collection schema version must be 1.0.0");
  }
  if (!isIsoDateTime(document.generatedAt)) {
    issues.push("Nation collection generatedAt must be an ISO date-time");
  }
  const baseline = validateBaseline(document, manifestSynthetic, issues);
  const nations = Array.isArray(document.nations) ? document.nations : [];
  if (!Array.isArray(document.nations)) {
    issues.push("nations must be an array");
  }
  if (nations.length !== EXPECTED_NATION_COUNT) {
    issues.push(
      `Nation collection must contain exactly ${EXPECTED_NATION_COUNT} identities`,
    );
  }

  const identityOwners = new Map();
  const nationIds = new Set();
  nations.forEach((nation, index) =>
    validateCommonNation(
      nation,
      index,
      baseline,
      identityOwners,
      nationIds,
      issues,
    ),
  );

  if (baseline.synthetic === true) {
    validateSyntheticCollection(document, nations, issues);
  } else if (baseline.synthetic === false) {
    validateProductionCollection(document, baseline, nations, issues);
  }
  return issues;
}

export function assertNationCollectionPolicy(document, options) {
  const issues = validateNationCollectionPolicy(document, options);
  if (issues.length > 0) {
    throw new NationCollectionPolicyError(issues);
  }
  return document;
}

export { EXPECTED_NATION_COUNT };
