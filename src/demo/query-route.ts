/**
 * Query router (design T1.2): the readings an input could be, in order, the
 * first being the default suggestion. Pure and deterministic: no network, no
 * storage, no history. Plain words are left to the keyword search.
 *
 * Jurisdiction comes only from explicit words in the query (design rule 6).
 * Nation-name shapes, treaty titles and case captions are masked first; a full
 * state name outside a masked span counts; the postal codes WA, OR and ID
 * count only in capitals right next to a bill form; "or", "id" and "wa" never
 * count. A bill number with no state named chooses nothing: every plausible
 * state (and Congress where the form allows) is offered as a choice.
 *
 * Law names come only from the alias table passed in (design rule 8).
 *
 * Erasable TypeScript with explicit .ts imports, so Node can load it.
 */
import { findCitations } from "./cite-patterns.ts";
import { router as copy } from "./copy/router.ts";
import type { LawAliasFile } from "./index-types.ts";
import { maskProtectedSpans, type ProtectedSpan } from "./nation-mask.ts";

export type ReadingKind =
  | "docket"
  | "rin"
  | "fr_document"
  | "fr_citation"
  | "cfr"
  | "usc"
  | "public_law"
  | "statute"
  | "us_reports"
  | "federal_bill"
  | "state_bill"
  | "state_code"
  | "court_docket"
  | "law_name";

export type RouteJurisdiction = "federal" | "WA" | "OR" | "ID" | null;
export type RouteAction =
  "live_lookup" | "static_index" | "link_out" | "not_covered";

export interface RouteReading {
  kind: ReadingKind;
  identifier: string;
  jurisdiction: RouteJurisdiction;
  action: RouteAction;
  label: string;
}

export interface QueryRoute {
  input: string;
  readings: readonly RouteReading[];
  ambiguous: boolean;
  plainWords: boolean;
  maskedSpans: readonly { start: number; end: number; kind: string }[];
}

type State = "WA" | "OR" | "ID";

/**
 * The action table. live_lookup: a Worker route exists or is built in this
 * release (Federal Register document, docket and RIN; CFR part through the
 * Federal Register; federal bill through Congress.gov; Washington bill; court
 * docket and U.S. Reports through GovInfo). static_index: read from the shipped
 * index (U.S.C. sections and the law names that resolve to them; the CFR part
 * authority panel also reads the index once the part opens). link_out: the
 * official state site, for state codes and for Oregon and Idaho bills until
 * their routes exist. not_covered: everything else. Where a kind has two
 * entries, the condition picks: a federal bill needs a Congress number, a
 * state bill is live for Washington only, and a court docket is live for the
 * circuits only. A Supreme Court docket is not covered: GovInfo's USCOURTS
 * collection holds no Supreme Court packages, and the Court's own site is not
 * a source until its robots and terms are read (N19).
 */
type ActionEntry = RouteAction | Readonly<Record<string, RouteAction>>;
export const READING_ACTIONS: Readonly<Record<ReadingKind, ActionEntry>> =
  Object.freeze<Record<ReadingKind, ActionEntry>>({
    docket: "live_lookup",
    rin: "live_lookup",
    fr_document: "live_lookup",
    fr_citation: "not_covered",
    cfr: "live_lookup",
    usc: "static_index",
    public_law: "not_covered",
    statute: "not_covered",
    us_reports: "live_lookup",
    federal_bill: {
      with_congress: "live_lookup",
      without_congress: "not_covered",
    },
    state_bill: { WA: "live_lookup", OR: "link_out", ID: "link_out" },
    state_code: "link_out",
    court_docket: {
      supreme_court: "not_covered",
      circuit: "live_lookup",
      district: "not_covered",
      state: "not_covered",
    },
    law_name: "static_index",
  });

const action = (kind: ReadingKind, condition?: string): RouteAction => {
  const entry = READING_ACTIONS[kind];
  return typeof entry === "string"
    ? entry
    : (entry[condition ?? ""] ?? "not_covered");
};

interface Claim {
  start: number;
  end: number;
  readings: RouteReading[];
  /** True when the readings are alternatives with nothing chosen. */
  unchosen: boolean;
}

/** Highest Congress number accepted; the current one is the 119th. */
const MAX_CONGRESS = 130;

// Not inside a word, a decimal, a path or a dashed identifier.
const B = String.raw`(?<![\w.:/-])`;
const E = String.raw`(?![\w-])`;

const DOCKET = new RegExp(
  String.raw`(?<![\w-])[A-Za-z]{2,}(?:-[A-Za-z0-9]{1,10}){0,4}-(?:19|20)\d{2}-\d{4,6}(?:-\d{4})?${E}`,
  "g",
);
const RIN = new RegExp(String.raw`${B}\d{4}-[A-Za-z]{2}\d{2}${E}`, "g");
const FR_DOCUMENT = new RegExp(
  String.raw`${B}(?:199[4-9]|20\d{2})-\d{4,5}${E}`,
  "g",
);
const PL_NO_DOTS = new RegExp(
  String.raw`${B}PL\s*(\d{1,3})\s*[-–]\s*(\d{1,4})${E}`,
  "gi",
);
const PL_BARE = new RegExp(String.raw`${B}(\d{3})-(\d{1,4})${E}`, "g");
const US_NO_DOTS = new RegExp(
  String.raw`${B}(\d{1,3})\s+US\s+(\d{1,4})${E}`,
  "g",
);
const DISTRICT_DOCKET = new RegExp(
  String.raw`${B}\d{1,2}:\d{2}-(?:cv|cr|mc|md|mj)-\d{3,6}${E}`,
  "gi",
);
const APPELLATE_DOCKET = new RegExp(String.raw`${B}(\d{2})-(\d{1,5})${E}`, "g");

/** Code forms cite-patterns does not parse: WAC, OAR, IDAPA, chapters, lower case. */
const CODE_FORMS: readonly { re: RegExp; code: string; state: State }[] = [
  {
    re: new RegExp(
      String.raw`${B}RCW\s+(?:§\s*)?(\d{1,2}[A-Z]?\.\d{1,3}[A-Z]?(?:\.\d{1,4}[A-Z0-9]*)?)(?![\w.])`,
      "gi",
    ),
    code: "RCW",
    state: "WA",
  },
  {
    re: /\bchapter\s+(\d{1,2}[A-Z]?\.\d{1,3}[A-Z]?)\s+RCW\b/gi,
    code: "RCW",
    state: "WA",
  },
  {
    re: new RegExp(
      String.raw`${B}WAC\s+(?:§\s*)?(\d{1,3}[A-Z]?-\d{1,4}[A-Z]?(?:-\d{1,5}[A-Z]?)?)${E}`,
      "gi",
    ),
    code: "WAC",
    state: "WA",
  },
  {
    re: /\bchapter\s+(\d{1,3}[A-Z]?-\d{1,4}[A-Z]?)\s+WAC\b/gi,
    code: "WAC",
    state: "WA",
  },
  {
    re: new RegExp(
      String.raw`${B}ORS\s+(?:§\s*|chapter\s+)?(\d{1,3}[A-Z]?(?:\.\d{1,4}[A-Z0-9]*)?)(?![\w.])`,
      "gi",
    ),
    code: "ORS",
    state: "OR",
  },
  {
    re: new RegExp(String.raw`${B}OAR\s+(\d{3}-\d{3}(?:-\d{4})?)${E}`, "gi"),
    code: "OAR",
    state: "OR",
  },
  {
    re: new RegExp(
      String.raw`${B}Idaho\s+Code\s*(?:§§?\s*|[Ss]ections?\s+)?(\d{1,2}[A-Z]?-\d{1,5}[A-Z]?)${E}`,
      "gi",
    ),
    code: "Idaho Code",
    state: "ID",
  },
  {
    re: new RegExp(
      String.raw`${B}IDAPA\s+(\d{2}(?:\.\d{2}){1,3}(?:\.\d{3})?)(?![\w.])`,
      "gi",
    ),
    code: "IDAPA",
    state: "ID",
  },
];
const CODE_STATE: Readonly<Record<string, State>> = {
  rcw: "WA",
  ors: "OR",
  idaho_code: "ID",
};
const CODE_NAME: Readonly<Record<string, string>> = {
  rcw: "RCW",
  ors: "ORS",
  idaho_code: "Idaho Code",
};

// Longer bill forms first so "H.R." wins over "H" and "S.J.Res." over "S".
const BILL = new RegExp(
  String.raw`(?<![\w.])(?<form>H\.?\s?J\.?\s?Res\.?|S\.?\s?J\.?\s?Res\.?|H\.?\s?Con\.?\s?Res\.?|S\.?\s?Con\.?\s?Res\.?|H\.?\s?Res\.?|S\.?\s?Res\.?|H\.?\s?R\.?|H\.?\s?B\.?|S\.?\s?B\.?|House\s+Bill|Senate\s+Bill|H|S\.?)\s*(?:No\.?\s*)?(?<num>\d{1,5})(?![\w-])(?:\s*,?\s*\(?(?:(?<bien>(?:19|20)\d{2}-\d{2})|(?<cong>\d{2,3})(?:st|nd|rd|th)?(?:\s+Congress)?)\)?(?![\w-]))?`,
  "gi",
);
const CONGRESS_HINT =
  /\b(\d{2,3})(?:st|nd|rd|th)\s+Congress\b|\bCongress\s+(\d{2,3})\b/i;
const FEDERAL_WORDS =
  /\b(?:Congress|congressional|U\.S\.\s+(?:House|Senate))\b/i;
// A place named after a state (Washington County, Oregon City) is not the state.
const STATE_NAME =
  /\b(Washington|Oregon|Idaho)\b(?!\s*,?\s*D\.?\s?C\b)(?!\s+(?:County|City|Falls|Trail|State\s+(?:University|College))\b)/gi;
const STATE_OF: Readonly<Record<string, State>> = {
  washington: "WA",
  oregon: "OR",
  idaho: "ID",
};

type BillForm = "house" | "senate" | "idaho_house" | "s_form" | "federal";
const FEDERAL_TYPE: readonly [RegExp, string][] = [
  [/^H\.?\s?J\.?\s?Res\.?$/i, "hjres"],
  [/^S\.?\s?J\.?\s?Res\.?$/i, "sjres"],
  [/^H\.?\s?Con\.?\s?Res\.?$/i, "hconres"],
  [/^S\.?\s?Con\.?\s?Res\.?$/i, "sconres"],
  [/^H\.?\s?Res\.?$/i, "hres"],
  [/^S\.?\s?Res\.?$/i, "sres"],
  [/^H\.?\s?R\.?$/i, "hr"],
];

/** Number ranges per state and chamber (design T1.2). */
const RANGES: Readonly<
  Record<State, { house: [number, number]; senate: [number, number] }>
> = {
  WA: { house: [1000, 2999], senate: [5000, 6999] },
  OR: { house: [2001, 4999], senate: [1, 1999] },
  ID: { house: [1, 999], senate: [1001, 1999] },
};
const inRange = (n: number, [lo, hi]: [number, number]) => n >= lo && n <= hi;

const COURT_CODE = /\bca(1[01]|[1-9]|dc|fc)\b/gi;
const CIRCUIT_NAME =
  /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|1st|2d|2nd|3d|3rd|4th|5th|6th|7th|8th|9th|10th|11th|d\.\s?c\.|federal|fed\.)\s+cir(?:cuit\b|\.)/gi;
const CIRCUIT_CODE: Readonly<Record<string, string>> = {
  first: "ca1",
  "1st": "ca1",
  second: "ca2",
  "2d": "ca2",
  "2nd": "ca2",
  third: "ca3",
  "3d": "ca3",
  "3rd": "ca3",
  fourth: "ca4",
  "4th": "ca4",
  fifth: "ca5",
  "5th": "ca5",
  sixth: "ca6",
  "6th": "ca6",
  seventh: "ca7",
  "7th": "ca7",
  eighth: "ca8",
  "8th": "ca8",
  ninth: "ca9",
  "9th": "ca9",
  tenth: "ca10",
  "10th": "ca10",
  eleventh: "ca11",
  "11th": "ca11",
  "d.c.": "cadc",
  "d. c.": "cadc",
  federal: "cafc",
  "fed.": "cafc",
};
const SUPREME_COURT = /\b(?:supreme\s+court|scotus)\b/gi;
const STATE_SUPREME =
  /\b(washington|oregon|idaho)\s+(?:state\s+)?supreme\s+court\b|\bsupreme\s+court\s+of\s+(washington|oregon|idaho)\b/i;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const federal = (
  kind: ReadingKind,
  identifier: string,
  label: string,
  condition?: string,
): RouteReading => ({
  kind,
  identifier,
  jurisdiction: "federal",
  action: action(kind, condition),
  label,
});

export function routeQuery(
  input: string,
  options?: { aliases?: LawAliasFile },
): QueryRoute {
  const { masked, spans } = maskProtectedSpans(input);
  const claims: Claim[] = [];
  const claim = (
    start: number,
    end: number,
    readings: RouteReading[],
    unchosen = false,
  ) => {
    if (claims.some((c) => start < c.end && c.start < end)) return;
    claims.push({ start, end, readings, unchosen });
  };
  const scan = (
    re: RegExp,
    make: (m: RegExpExecArray) => RouteReading[] | null,
  ) => {
    for (const m of input.matchAll(re)) {
      const readings = make(m as RegExpExecArray);
      if (readings) claim(m.index, m.index + m[0].length, readings);
    }
  };

  // Law names from the reviewed table, longest first.
  const entries = [...(options?.aliases?.entries ?? [])].sort(
    (a, b) => b.popularName.length - a.popularName.length,
  );
  for (const alias of entries) {
    const re = new RegExp(
      String.raw`(?<![\w])${escapeRe(alias.popularName).replace(/\s+/g, String.raw`\s+`)}(?![\w])`,
      "gi",
    );
    scan(re, () => [
      federal(
        "law_name",
        alias.popularName,
        copy.lawName(
          alias.popularName,
          alias.citations.map((c) => c.text),
        ),
      ),
    ]);
  }

  scan(DOCKET, (m) => {
    const id = m[0].toUpperCase();
    return [federal("docket", id, copy.docket(id))];
  });

  for (const c of findCitations(citationCase(input))) {
    const end = c.start + c.text.length;
    switch (c.kind) {
      case "usc": {
        const id = copy.usc(c.title, c.section, c.etSeq);
        claim(c.start, end, [federal("usc", id, id)]);
        break;
      }
      case "cfr": {
        const id = `${c.title} CFR ${c.section ?? c.part}`;
        claim(c.start, end, [
          federal("cfr", id, copy.cfr(c.title, c.part, c.section)),
        ]);
        break;
      }
      case "pl":
        claim(c.start, end, [
          federal(
            "public_law",
            `Pub. L. ${c.congress}-${c.number}`,
            copy.publicLaw(c.congress, c.number),
          ),
        ]);
        break;
      case "stat":
        claim(c.start, end, [
          federal(
            "statute",
            `${c.volume} Stat. ${c.page}`,
            copy.statute(c.volume, c.page),
          ),
        ]);
        break;
      case "fr":
        claim(c.start, end, [
          federal(
            "fr_citation",
            `${c.volume} FR ${c.page}`,
            copy.frCitation(c.volume, c.page),
          ),
        ]);
        break;
      case "us_reports":
        claim(c.start, end, [
          federal(
            "us_reports",
            `${c.volume} U.S. ${c.page}`,
            copy.usReports(c.volume, c.page),
          ),
        ]);
        break;
      case "rcw":
      case "ors":
      case "idaho_code": {
        const code = CODE_NAME[c.kind] ?? c.kind;
        claim(c.start, end, [
          {
            kind: "state_code",
            identifier: `${code} ${c.section}`,
            jurisdiction: CODE_STATE[c.kind] ?? null,
            action: action("state_code"),
            label: copy.stateCode(code, c.section),
          },
        ]);
        break;
      }
      default:
        break; // short forms and act hrefs are not readings
    }
  }

  for (const form of CODE_FORMS) {
    scan(form.re, (m) => {
      const section = (m[1] ?? "").toUpperCase();
      return [
        {
          kind: "state_code",
          identifier: `${form.code} ${section}`,
          jurisdiction: form.state,
          action: action("state_code"),
          label: copy.stateCode(form.code, section),
        },
      ];
    });
  }

  scan(PL_NO_DOTS, (m) => [publicLaw(Number(m[1]), Number(m[2]))]);
  scan(US_NO_DOTS, (m) => {
    const id = `${m[1]} U.S. ${m[2]}`;
    return [
      federal("us_reports", id, copy.usReports(Number(m[1]), Number(m[2]))),
    ];
  });

  // Bills.
  const namedStates = new Set<State>();
  for (const m of masked.matchAll(STATE_NAME))
    namedStates.add(STATE_OF[(m[1] ?? "").toLowerCase()] as State);
  const congressHint = CONGRESS_HINT.exec(input);
  const hintedCongress = congressHint
    ? Number(congressHint[1] ?? congressHint[2])
    : null;
  const bills = [...input.matchAll(BILL)];
  for (const m of bills) {
    const start = m.index;
    const end = start + m[0].length;
    const g = m.groups ?? {};
    const formText = (g.form ?? "").replace(/\s+/g, " ");
    const number = Number(g.num);
    let cong = g.cong ? Number(g.cong) : hintedCongress;
    if (cong !== null && (cong < 1 || cong > MAX_CONGRESS)) cong = null;
    const fedType = FEDERAL_TYPE.find(([re]) => re.test(formText))?.[1];
    const form: BillForm = fedType
      ? "federal"
      : /^S\.?$/i.test(formText)
        ? "s_form"
        : /^H$/i.test(formText)
          ? "idaho_house"
          : /^(?:H\.?\s?B\.?|House Bill)$/i.test(formText)
            ? "house"
            : "senate";
    const states = new Set(namedStates);
    const postal = postalNextTo(masked, start, end, bills);
    if (postal) states.add(postal);
    const federalNamed =
      g.cong !== undefined ||
      hintedCongress !== null ||
      FEDERAL_WORDS.test(masked);

    const candidates: RouteReading[] = [];
    const stateReading = (state: State, chamber: "house" | "senate") => {
      if (!inRange(number, RANGES[state][chamber])) return;
      const prefix = chamber === "house" ? "H" : "S";
      const biennium =
        state === "WA" && g.bien && washingtonBiennium(g.bien)
          ? g.bien
          : undefined;
      const id =
        state === "ID"
          ? `${prefix}${String(number).padStart(4, "0")}`
          : `${prefix}B ${number}${biennium ? ` ${biennium}` : ""}`;
      candidates.push({
        kind: "state_bill",
        identifier: id,
        jurisdiction: state,
        action: action("state_bill", state),
        label: copy.stateBill(
          state,
          state === "ID" ? id : `${prefix}B ${number}`,
          biennium,
        ),
      });
    };
    const federalReading = (type: string) => {
      if (number < 1 || number > 9999) return;
      candidates.push(
        federal(
          "federal_bill",
          cong === null ? `${type} ${number}` : `${type} ${number} ${cong}`,
          copy.federalBill(type, number, cong),
          cong === null ? "without_congress" : "with_congress",
        ),
      );
    };
    if (form === "federal") federalReading(fedType as string);
    else if (form === "house" || form === "senate")
      for (const state of ["WA", "OR", "ID"] as const)
        stateReading(state, form);
    else if (form === "idaho_house") stateReading("ID", "house");
    else {
      stateReading("ID", "senate");
      federalReading("s");
    }
    if (!candidates.length) continue;
    if (form === "federal") {
      claim(start, end, candidates);
      continue;
    }
    const evidence = (r: RouteReading) =>
      r.jurisdiction === "federal"
        ? federalNamed
        : states.has(r.jurisdiction as State);
    const named = states.size > 0 || federalNamed;
    const chosen = named ? candidates.filter(evidence) : candidates;
    if (named && !chosen.length) {
      claim(start, end, []); // the named state's range does not fit
      continue;
    }
    claim(start, end, chosen, !named);
  }

  // Court dockets.
  const courts = namedCourts(input, masked, spans);
  scan(DISTRICT_DOCKET, (m) => [
    {
      kind: "court_docket",
      identifier: m[0].toLowerCase(),
      jurisdiction: null,
      action: action("court_docket", "district"),
      label: copy.districtDocket(m[0].toLowerCase()),
    },
  ]);
  for (const m of input.matchAll(APPELLATE_DOCKET)) {
    const id = m[0];
    const tail = m[2] ?? "";
    const readings: RouteReading[] = [];
    if (courts.state) {
      readings.push({
        kind: "court_docket",
        identifier: id,
        jurisdiction: courts.state,
        action: action("court_docket", "state"),
        label: copy.stateCourtDocket(courts.state, id),
      });
    }
    if (courts.supreme)
      readings.push(
        federal(
          "court_docket",
          id,
          copy.supremeCourtDocket(id),
          "supreme_court",
        ),
      );
    for (const code of courts.circuits)
      readings.push(
        federal("court_docket", id, copy.circuitDocket(code, id), "circuit"),
      );
    if (readings.length) {
      claim(m.index, m.index + id.length, readings);
      continue;
    }
    // No court named: every reading the number could be, nothing chosen.
    const congress = Number(m[1]);
    if (tail.length <= 3 && congress >= 1)
      readings.push(publicLaw(congress, Number(tail)));
    if (tail.length <= 4)
      readings.push(
        federal(
          "court_docket",
          id,
          copy.supremeCourtDocket(id),
          "supreme_court",
        ),
      );
    readings.push(
      federal("court_docket", id, copy.unnamedCircuitDocket(id), "circuit"),
    );
    claim(m.index, m.index + id.length, readings, true);
  }
  scan(PL_BARE, (m) => {
    const congress = Number(m[1]);
    return congress >= 100 && congress <= MAX_CONGRESS
      ? [publicLaw(congress, Number(m[2]))]
      : null;
  });

  scan(RIN, (m) => {
    const id = m[0].toUpperCase();
    return [federal("rin", id, copy.rin(id))];
  });
  scan(FR_DOCUMENT, (m) => [
    federal("fr_document", m[0], copy.frDocument(m[0])),
  ]);

  claims.sort((a, b) => a.start - b.start);
  const readings = claims.flatMap((c) => c.readings);
  return {
    input,
    readings,
    ambiguous:
      readings.length > 1 ||
      claims.some((c) => c.unchosen && c.readings.length > 0),
    plainWords: readings.length === 0,
    maskedSpans: spans.map(({ start, end, kind }) => ({ start, end, kind })),
  };
}

const CITE_ABBREVIATION =
  /(?<![\w.])(?:u\.\s?s\.\s?c\.|c\.\s?f\.\s?r\.|u\.\s?s\.|p\.\s?l\.|usc|cfr|fr|rcw|ors)(?![\w])/gi;

/**
 * The shared patterns read code names in their printed case; typed queries are
 * often lower case. Same length out as in, so offsets still hold.
 */
function citationCase(text: string): string {
  return text
    .replace(CITE_ABBREVIATION, (m) => m.toUpperCase())
    .replace(/(?<![\w.])stat\./gi, "Stat.")
    .replace(/(?<![\w.])fed\.(\s?)reg\./gi, "Fed.$1Reg.")
    .replace(
      /(?<![\w.])pub(lic)?(\.?\s?)l(aw)?(?![a-z])/gi,
      (_m, lic?: string, sep = "", aw?: string) =>
        `Pub${lic ? "lic" : ""}${sep}L${aw ? "aw" : ""}`,
    )
    .replace(/(?<![\w.])idaho(\s+)code\b/gi, "Idaho$1Code");
}

function publicLaw(congress: number, number: number): RouteReading {
  return federal(
    "public_law",
    `Pub. L. ${congress}-${number}`,
    copy.publicLaw(congress, number),
  );
}

/** A Washington biennium starts in an odd year: 2025-26. */
function washingtonBiennium(text: string): boolean {
  const start = Number(text.slice(0, 4));
  return start % 2 === 1 && Number(text.slice(5)) === (start + 1) % 100;
}

/**
 * WA, OR or ID in capitals right before or after the bill, outside masked
 * spans. A code that sits between two bills ("HB 2500 OR HB 2600") is a
 * conjunction as likely as a state, so it does not count.
 */
function postalNextTo(
  masked: string,
  start: number,
  end: number,
  bills: readonly RegExpExecArray[],
): State | null {
  const billEndsAt = (pos: number) =>
    bills.some((b) => {
      const bEnd = b.index + b[0].length;
      return bEnd <= pos && /^[\s,(]*$/.test(masked.slice(bEnd, pos));
    });
  const billStartsAt = (pos: number) =>
    bills.some(
      (b) => b.index >= pos && /^[\s,)]*$/.test(masked.slice(pos, b.index)),
    );
  const before = /(?<![^\s(,])(WA|OR|ID)[\s,.)]*$/.exec(masked.slice(0, start));
  const after = /^[\s,(]*(WA|OR|ID)(?![\w])/.exec(masked.slice(end));
  const fromBefore = before && !billEndsAt(before.index) ? before[1] : null;
  const fromAfter =
    after && !billStartsAt(end + after[0].length) ? after[1] : null;
  return ((fromBefore ?? fromAfter) as State | null | undefined) ?? null;
}

function namedCourts(
  input: string,
  masked: string,
  spans: readonly ProtectedSpan[],
): { supreme: boolean; circuits: string[]; state: State | null } {
  const stateCourt = STATE_SUPREME.exec(masked);
  const state = stateCourt
    ? (STATE_OF[(stateCourt[1] ?? stateCourt[2] ?? "").toLowerCase()] ?? null)
    : null;
  // A supreme court named in a query that also names a Nation may be that
  // Nation's court, whatever punctuation sits between them, so the U.S.
  // Supreme Court is not chosen then (over-masking is the safe direction).
  // Any protected span counts: a Nation name merged into a caption or treaty
  // title keeps the earlier span's kind, so the kind alone cannot be trusted.
  const namesNation = spans.length > 0;
  const supremeMentions = namesNation
    ? 0
    : [...masked.matchAll(SUPREME_COURT)].filter(
        (m) => !/\btribal\s+$/i.test(masked.slice(0, m.index)),
      ).length;
  const circuits = new Set<string>();
  for (const m of input.matchAll(COURT_CODE))
    circuits.add(`ca${(m[1] ?? "").toLowerCase()}`);
  for (const m of input.matchAll(CIRCUIT_NAME)) {
    const code = CIRCUIT_CODE[(m[1] ?? "").toLowerCase()];
    if (code) circuits.add(code);
  }
  return {
    // A state supreme court named once is not the U.S. Supreme Court.
    supreme: supremeMentions > (state ? 1 : 0),
    circuits: [...circuits],
    state,
  };
}
