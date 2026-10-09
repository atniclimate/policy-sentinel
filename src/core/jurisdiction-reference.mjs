const fail = () => {
  throw new TypeError("Invalid jurisdiction association");
};
export const US_STATE_NAMES = Object.freeze({
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "United States Virgin Islands",
  UM: "United States Minor Outlying Islands",
});
export const US_STATE_CODES = Object.freeze(Object.keys(US_STATE_NAMES));
const text = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const keys = (value, required, optional = []) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    fail();
};
const freeze = (value) => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
export function isJurisdictionRef(value) {
  if (typeof value !== "string") return false;
  if (/^(?:us|us-state:[A-Z]{2}|us-county:[0-9]{5})$/u.test(value)) return true;
  const match = /^(?:nation|body):([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(value);
  return match !== null && match[1].length <= 64;
}
/** Validates declared syntax and evidence shape, never registry membership or legal applicability. */
export function parseJurisdictionAssociation(jsonText, expectedRecordRef) {
  if (
    typeof jsonText !== "string" ||
    jsonText.length > 32768 ||
    !text(expectedRecordRef, 1024)
  )
    fail();
  let value;
  try {
    value = JSON.parse(jsonText);
  } catch {
    fail();
  }
  keys(value, ["jurisdictionRef", "basis", "evidence", "reviewState"]);
  if (
    !isJurisdictionRef(value.jurisdictionRef) ||
    !["issuing_authority", "source_stated_scope"].includes(value.basis) ||
    !["unreviewed", "reviewed", "rejected"].includes(value.reviewState)
  )
    fail();
  keys(value.evidence, ["url", "locator"], ["exactSubject"]);
  if (
    !text(value.evidence.url, 4096) ||
    !text(value.evidence.locator, 1024) ||
    /[\\\s]/u.test(value.evidence.url)
  )
    fail();
  let url;
  try {
    url = new globalThis.URL(value.evidence.url);
  } catch {
    fail();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.includes(".") ||
    /^(?:\d+\.|\[)/u.test(url.hostname) ||
    [...url.searchParams.keys()].some((key) =>
      /token|secret|password|credential|signature|api[-_]?key/iu.test(key),
    )
  )
    fail();
  const exact = value.evidence.exactSubject;
  if (exact !== undefined) {
    keys(exact, ["recordRef", "ref", "text"]);
    if (
      exact.recordRef !== expectedRecordRef ||
      exact.ref !== value.jurisdictionRef ||
      !text(exact.text, 8192)
    )
      fail();
  }
  const nation = value.jurisdictionRef.startsWith("nation:");
  if (
    (nation ||
      (value.basis === "source_stated_scope" &&
        value.reviewState === "reviewed")) &&
    exact === undefined
  )
    fail();
  if (nation && value.reviewState !== "reviewed") fail();
  return freeze(value);
}

/** Literal state identity only: an ordinary postal abbreviation does not prove a jurisdiction. */
export function hasStateJurisdictionEvidence(ref, sourceText) {
  if (
    typeof ref !== "string" ||
    !/^us-state:[A-Z]{2}$/.test(ref) ||
    typeof sourceText !== "string"
  )
    return false;
  const name = US_STATE_NAMES[ref.slice(9)];
  if (!name) return false;
  if (
    new RegExp("(^|[^a-z0-9:-])" + ref + "($|[^a-z0-9:-])", "u").test(
      sourceText,
    )
  )
    return true;
  let statement = sourceText.replace(/\s+/gu, " ");
  for (const longer of Object.values(US_STATE_NAMES).filter(
    (candidate) => candidate !== name && candidate.includes(name),
  ))
    statement = statement.replace(
      new RegExp("\\b" + longer + "\\b", "giu"),
      " ",
    );
  if (ref === "us-state:WA")
    statement = statement.replace(
      /\bWashington(?:,\s*|\s+)(?:D\.?\s*C\.?|District of Columbia)(?=\W|$)/giu,
      " ",
    );
  return new RegExp("\\b" + name + "\\b", "iu").test(statement);
}
