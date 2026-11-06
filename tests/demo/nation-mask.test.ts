import { describe, expect, it } from "vitest";

import {
  maskProtectedSpans,
  type ProtectedSpan,
} from "../../src/demo/nation-mask";
import {
  nationNameBases,
  nationNameProbeCases,
} from "../support/nation-name-probes";

function covered(
  spans: readonly ProtectedSpan[],
  kind: ProtectedSpan["kind"],
  start: number,
  end: number,
  text: string,
): boolean {
  for (let i = start; i < end; i += 1) {
    if (/\s/.test(text[i] ?? "")) continue;
    if (!spans.some((s) => s.kind === kind && s.start <= i && i < s.end)) {
      return false;
    }
  }
  return true;
}

function maskedText(text: string, names?: readonly string[]): string {
  return maskProtectedSpans(text, names ? { names } : undefined).masked;
}

describe("Nation-name probes from the BIA fixture", () => {
  it("has the fixture's entries to probe", () => {
    expect(nationNameBases().length).toBeGreaterThanOrEqual(16);
  });

  it("covers every probe and variant with a nation_name span, structurally", () => {
    const misses: string[] = [];
    for (const c of nationNameProbeCases()) {
      const { spans } = maskProtectedSpans(c.text);
      if (!covered(spans, "nation_name", c.nameStart, c.nameEnd, c.text)) {
        misses.push(`${c.variant}: ${c.text}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it("keeps a state word outside the name in the sentence variant", () => {
    for (const c of nationNameProbeCases().filter(
      (p) => p.variant === "in_sentence",
    )) {
      const masked = maskedText(c.text);
      expect(masked.startsWith("Washington staff asked about")).toBe(true);
    }
  });

  it("masks a state word inside the name", () => {
    const withState = nationNameBases().filter((b) =>
      /\b(?:Minnesota|California|Nevada|North Carolina|Oklahoma)\b/.test(b),
    );
    expect(withState.length).toBeGreaterThan(0);
    for (const base of withState) {
      const masked = maskedText(`${base} consultation`);
      expect(masked).not.toMatch(
        /Minnesota|California|Nevada|North Carolina|Oklahoma/,
      );
      expect(masked.endsWith(" consultation")).toBe(true);
    }
  });
});

describe("structural shapes (synthetic)", () => {
  it.each([
    "Example Tribe",
    "Example Tribes of the Sample Reservation",
    "Sample Nation of Oregon",
    "Example Band of Indians",
    "Sample Pueblo",
    "Example Rancheria",
    "Confederated Example and Sample Tribes",
    "Example Indian Community",
    "Native Village of Sample",
    "Sample Colony",
    "Example Reservation",
    "Sample Band (previously listed as Example Band)",
  ])("masks the whole of %s", (name) => {
    const text = `Washington comment on ${name} today`;
    const { masked, spans } = maskProtectedSpans(text);
    const start = text.indexOf(name);
    expect(
      covered(spans, "nation_name", start, start + name.length, text),
    ).toBe(true);
    expect(masked.startsWith("Washington comment on")).toBe(true);
  });

  it("masks every fixture name with a plural possessive or closing quote", () => {
    for (const base of nationNameBases()) {
      const text = `${base}' consultation`;
      const { spans } = maskProtectedSpans(text);
      expect(covered(spans, "nation_name", 0, base.length, text), text).toBe(
        true,
      );
    }
  });

  it.each([
    ["Sample Washington Tribes' HB 2100", 25],
    ["Sample Washington Tribes’ HB 2100", 25],
    ["Sample Washington Tribes'. HB 2100", 26],
    ["Sample Washington Tribe's. HB 2100", 26],
    ["National Congress of American Indians S 1001", 37],
  ])("masks %s from its first word", (text, end) => {
    expect(maskProtectedSpans(text).spans).toEqual([
      { start: 0, end, kind: "nation_name" },
    ]);
  });

  it.each([
    ["Treaty of Example Point, 1855", "Treaty of Example Point, 1855"],
    ["the Treaty with the Sample 1855 text", "Treaty with the Sample 1855"],
    ["read the Treaty of Example Creek", "Treaty of Example Creek"],
  ])("masks the treaty title in %s", (text, title) => {
    const { spans } = maskProtectedSpans(text);
    const start = text.indexOf(title);
    expect(
      covered(spans, "treaty_title", start, start + title.length, text),
    ).toBe(true);
  });

  it.each([
    ["Washington v. Oregon", "Washington v. Oregon"],
    ["Washington v Oregon", "Washington v Oregon"],
    ["Sample vs Washington HB 2500", "Sample vs Washington"],
    [
      "see Example Party vs. Sample Agency, 123 F.3d 456",
      "Example Party vs. Sample Agency",
    ],
  ])("masks the case caption in %s", (text, caption) => {
    const { masked, spans } = maskProtectedSpans(text);
    const start = text.indexOf(caption);
    expect(
      covered(spans, "case_caption", start, start + caption.length, text),
    ).toBe(true);
    expect(masked).not.toMatch(/Washington|Oregon/);
  });

  it.each([
    "Indian Self-Determination and Education Assistance Act",
    "Bureau of Indian Affairs",
    "Washington tribal consultation",
    "25 CFR part 900 and 89 FR 12345",
    "nationwide determination under the coordination rule",
    "Rhode Island",
  ])("leaves %s unmasked", (text) => {
    const { masked, spans } = maskProtectedSpans(text);
    expect(spans).toEqual([]);
    expect(masked).toBe(text);
  });
});

describe("offsets and injected names", () => {
  it("preserves length and offsets and leaves the rest untouched", () => {
    const text = "Oregon notice for the Example Tribe (Sample) and Idaho";
    const { masked, spans } = maskProtectedSpans(text);
    expect(masked).toHaveLength(text.length);
    expect(spans.length).toBeGreaterThan(0);
    for (let i = 0; i < text.length; i += 1) {
      const inSpan = spans.some((s) => s.start <= i && i < s.end);
      if (!inSpan) expect(masked[i]).toBe(text[i]);
      else expect(masked[i]).toBe(" ");
    }
    expect(masked.startsWith("Oregon notice for")).toBe(true);
    expect(masked.endsWith(" and Idaho")).toBe(true);
  });

  it("matches injected names case-insensitively, NFC and whitespace-collapsed", () => {
    const name = "Sample Café People";
    const text = "Idaho:  sample   café people  , Oregon";
    const { masked, spans } = maskProtectedSpans(text, { names: [name] });
    expect(masked).toHaveLength(text.length);
    expect(spans).toContainEqual({
      start: text.indexOf("sample"),
      end: text.indexOf("people") + "people".length,
      kind: "nation_name",
    });
    expect(masked).toMatch(/^Idaho:/);
    expect(masked).toMatch(/, Oregon$/);
  });

  it("does not match an injected name inside a longer word", () => {
    const { spans } = maskProtectedSpans("resample the Samplers data", {
      names: ["Sample"],
    });
    expect(spans).toEqual([]);
  });

  it("returns no spans for empty text", () => {
    expect(maskProtectedSpans("")).toEqual({ masked: "", spans: [] });
  });
});
