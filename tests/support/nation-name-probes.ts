/**
 * Nation-name probes generated at test time (design T1.2 and T1.8, index
 * conditions G3). The names come only from the committed BIA fixture
 * fixtures/sources/bia/recognition-structure.html, parsed by the adapter's own
 * parseRecognitionEntries; no file written for these probes holds a real
 * Nation name. The full recognition collection is not in the repository, so
 * this is the probe set the fixture allows.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseRecognitionEntries } from "../../src/adapters/bia/recognition-registry";

export type ProbeVariant =
  | "exact"
  | "lower"
  | "upper"
  | "leading_the"
  | "trailing_state"
  | "in_sentence"
  | "consultation";

export interface NationNameProbe {
  /** The probe text a guard is run over. */
  text: string;
  /** The name as it appears inside text (after any case change). */
  name: string;
  nameStart: number;
  nameEnd: number;
  variant: ProbeVariant;
}

const FIXTURE = resolve(
  process.cwd(),
  "fixtures/sources/bia/recognition-structure.html",
);

/** The text with its trailing parenthetical notes removed. */
function head(text: string): string {
  let out = text.trim();
  while (out.endsWith(")")) {
    let depth = 0;
    let open = -1;
    for (let i = out.length - 1; i >= 0; i -= 1) {
      if (out[i] === ")") depth += 1;
      else if (out[i] === "(" && --depth === 0) {
        open = i;
        break;
      }
    }
    if (open <= 0) break;
    out = out.slice(0, open).trim();
  }
  return out;
}

/** Each entry's exact text, plus the name without its trailing notes. */
export function nationNameBases(): string[] {
  const entries = parseRecognitionEntries(
    readFileSync(FIXTURE, "utf8"),
    "html",
  );
  const bases = new Set<string>();
  for (const { exactText } of entries) {
    bases.add(exactText);
    const name = head(exactText);
    if (name) bases.add(name);
  }
  return [...bases];
}

function probe(
  variant: ProbeVariant,
  before: string,
  name: string,
  after: string,
): NationNameProbe {
  return {
    text: before + name + after,
    name,
    nameStart: before.length,
    nameEnd: before.length + name.length,
    variant,
  };
}

export function nationNameProbeCases(): NationNameProbe[] {
  const cases: NationNameProbe[] = [];
  for (const base of nationNameBases()) {
    cases.push(probe("exact", "", base, ""));
    cases.push(probe("lower", "", base.toLowerCase(), ""));
    cases.push(probe("upper", "", base.toUpperCase(), ""));
    if (!/^the\s/i.test(base))
      cases.push(probe("leading_the", "the ", base, ""));
    cases.push(probe("trailing_state", "", base, " Oregon"));
    cases.push(
      probe("in_sentence", "Washington staff asked about ", base, " in Idaho"),
    );
    cases.push(probe("consultation", "", base, " consultation"));
  }
  return cases;
}

export function nationNameProbes(): string[] {
  return nationNameProbeCases().map((c) => c.text);
}

/**
 * Synthetic names only, never a real Nation (decision 10 tests). None holds a
 * structural anchor word, so only the hashes can catch them.
 */
export const SYNTHETIC_PROBE_NAMES: readonly string[] = [
  "The Example Valley Sample Council",
  ...Array.from(
    { length: 575 },
    (_, i) => `Synthetic Probe Entity ${String(i).padStart(3, "0")}`,
  ),
];

/**
 * A full list for hashed-probe tests: the fixture bases plus the synthetic
 * names, enough entries for the full-list rule (G3). No import of the Node
 * scripts here, since jsdom tests load this module too.
 */
export const fullProbeNames = (): string[] => [
  ...nationNameBases(),
  ...SYNTHETIC_PROBE_NAMES,
];
