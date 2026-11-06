/**
 * Search box suggestions and query readings (design T1.2). Labels name the
 * identifier and the official system it belongs to; none states what a record
 * means or relates a record to a Nation.
 */
const CIRCUITS: Readonly<Record<string, string>> = {
  ca1: "First Circuit",
  ca2: "Second Circuit",
  ca3: "Third Circuit",
  ca4: "Fourth Circuit",
  ca5: "Fifth Circuit",
  ca6: "Sixth Circuit",
  ca7: "Seventh Circuit",
  ca8: "Eighth Circuit",
  ca9: "Ninth Circuit",
  ca10: "Tenth Circuit",
  ca11: "Eleventh Circuit",
  cadc: "D.C. Circuit",
  cafc: "Federal Circuit",
};

const STATE_NAMES = { WA: "Washington", OR: "Oregon", ID: "Idaho" } as const;

const BILL_TYPES: Readonly<Record<string, string>> = {
  hr: "H.R.",
  s: "S.",
  hjres: "H.J.Res.",
  sjres: "S.J.Res.",
  hconres: "H.Con.Res.",
  sconres: "S.Con.Res.",
  hres: "H.Res.",
  sres: "S.Res.",
};

const CODE_NAMES: Readonly<Record<string, string>> = {
  RCW: "Revised Code of Washington",
  WAC: "Washington Administrative Code",
  ORS: "Oregon Revised Statutes",
  OAR: "Oregon Administrative Rules",
  "Idaho Code": "Idaho Code",
  IDAPA: "Idaho Administrative Code",
};

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

export const router = {
  listLabel: "Suggestions",
  searchedAsWords: "Searched as words",
  suggestion: "Suggestion:",
  chooseReading: "This could be more than one thing. Choose one:",
  /** A bare number with one plausible reading: nothing was named, so nothing is chosen for the person. */
  confirmReading:
    "No state or court was named. Choose this reading to search it:",
  agencyNote: "Federal Register agency",
  topicNote: "Federal Register topic",
  cfrTitleNote: "CFR title",
  lawNote: "Popular name in the U.S. Code",
  linkOutNote: "Opens the official site",
  notCoveredNote: "Not covered in this release",
  circuitName: (code: string) => CIRCUITS[code] ?? "Court of appeals",
  docket: (id: string) => `Docket ${id}`,
  rin: (id: string) => `RIN ${id}`,
  frDocument: (id: string) => `Federal Register document ${id}`,
  frCitation: (volume: number, page: number) =>
    `${volume} FR ${page}, a Federal Register page`,
  cfr: (title: number, part: string, section: string | null) =>
    section ? `${title} CFR ${section}` : `${title} CFR part ${part}`,
  usc: (title: number, section: string, etSeq: boolean, note = false) =>
    `${title} U.S.C. ${section}${etSeq ? " et seq." : ""}${note ? " note" : ""}`,
  publicLaw: (congress: number, number: number) =>
    `Pub. L. ${congress}-${number}, a public law number`,
  statute: (volume: number, page: number) =>
    `${volume} Stat. ${page}, Statutes at Large`,
  usReports: (volume: number, page: number) =>
    `${volume} U.S. ${page}, U.S. Reports`,
  federalBill: (type: string, number: number, congress: number | null) =>
    `${BILL_TYPES[type] ?? type} ${number}, ${
      congress === null
        ? "Congress number not given (add one, such as 119)"
        : `${ordinal(congress)} Congress`
    }`,
  stateBill: (state: keyof typeof STATE_NAMES, id: string, biennium?: string) =>
    `${STATE_NAMES[state]} ${id}${biennium ? `, ${biennium} biennium` : ""}`,
  stateCode: (code: string, section: string) =>
    `${code} ${section}, ${CODE_NAMES[code] ?? code}`,
  supremeCourtDocket: (id: string) => `Supreme Court docket ${id}`,
  circuitDocket: (code: string, id: string) =>
    `${CIRCUITS[code] ?? "Court of appeals"} docket ${id}`,
  unnamedCircuitDocket: (id: string) =>
    `Court of appeals docket ${id}, court not named`,
  districtDocket: (id: string) => `District court docket ${id}`,
  stateCourtDocket: (state: keyof typeof STATE_NAMES, id: string) =>
    `${STATE_NAMES[state]} Supreme Court docket ${id}`,
  lawName: (
    name: string,
    citations: readonly string[],
    titleAsEnacted = false,
  ) =>
    `${name}${titleAsEnacted ? " (title as enacted)" : ""}, ${citations.join("; ")}`,
};
