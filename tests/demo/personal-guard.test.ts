import { describe, expect, it } from "vitest";

import {
  hasPersonalPattern,
  personalPatternHits,
  type PersonalPatternKind,
} from "../../src/demo/personal-guard";

function kinds(text: string): PersonalPatternKind[] {
  return personalPatternHits(text).map((h) => h.kind);
}

describe("D-068 personal-pattern guard (synthetic values only)", () => {
  it.each([
    ["Send comments to staffer.example@agency.example.gov today", "email"],
    ["write to a.b+c@example.org", "email"],
    ["Call (555) 010-0199 for details", "phone"],
    ["Call 555-010-0199", "phone"],
    ["phone: +1 555 010 0199", "phone"],
    ["Telephone: 555.010.0199", "phone"],
    ["direct line: 555 010 0199", "phone"],
    ["main office, ext. 4412", "phone"],
    ["extension 21", "phone"],
    ["dial x4412", "phone"],
    ["Mr. Example spoke", "person_title"],
    ["Ms Sample replied", "person_title"],
    ["Dr. Example Sample", "person_title"],
    ["Hon. Example presided", "person_title"],
    ["Mrs. Sample", "person_title"],
    ["Contact: Example Sample, Program Analyst", "person_title"],
    [
      "FOR FURTHER INFORMATION CONTACT: Example Q. Sample, Office of Testing",
      "person_title",
    ],
    [
      "For further information contact Example Sample at the office",
      "person_title",
    ],
    ["1234 Example Street, Sampletown, WA 98501", "postal_block"],
    [
      "mail to 55 Sample Ave. Suite 200, Example City, Oregon 97301-1234",
      "postal_block",
    ],
    ["P.O. Box 123, Sampleville, ID 83702", "postal_block"],
    // R2-2: a name in capitals.
    ["CONTACT: JANE SAMPLEPERSON", "person_title"],
    ["MR. SAMPLEPERSON", "person_title"],
    ["MR SAMPLEPERSON", "person_title"],
    ["MRS SAMPLEPERSON", "person_title"],
    [
      "AUTHORITY: 25 U.S.C. 5301 et seq. PROGRAM CONTACT: JANE SAMPLEPERSON",
      "person_title",
    ],
    // R2-4: an en dash separator, and a spelled-out address.
    ["(555) 010–0101", "phone"],
    ["555‐010‐0101", "phone"],
    ["jane.sampleperson [at] example.gov", "email"],
    ["sampleperson (at) example (dot) gov", "email"],
  ] as const)("flags %s", (text, kind) => {
    expect(kinds(text)).toContain(kind);
    expect(hasPersonalPattern(text)).toBe(true);
  });

  it("returns offsets that locate the hit in the text", () => {
    const text = "Write to staffer.example@agency.example.gov now";
    const [hit] = personalPatternHits(text);
    expect(hit).toBeDefined();
    if (!hit) return;
    expect(text.slice(hit.start, hit.end)).toBe(
      "staffer.example@agency.example.gov",
    );
  });

  it.each([
    "Office of Regional Programs, Example Agency",
    "Bureau of Indian Affairs, Office of Trust Services",
    "Contact: Office of Tribal Relations",
    "Docket EPA-HQ-OW-2021-0602",
    "RIN 1076-AF81",
    "25 CFR 900.6 and 40 CFR part 131",
    "89 FR 12345, June 24, 2024",
    "ZIP code 98501",
    "98501-1234",
    "FR Doc. 2024-12669",
    "Pub. L. 93-638, 88 Stat. 2203",
    "3 x 4 grid",
    "Director of the Office of Testing",
    // R2-2: capitalized headings with no name after them.
    "AUTHORITY: 25 U.S.C. 5301 et seq.",
    "AUTHORITIES: 25 U.S.C. 5304(l) and P. L. 117-58.",
    // R2-6: state rule numbers are not phone numbers.
    "OAR 340-041-0001",
    "under WAC 173-201-0100 and OAR 340-041-0001",
    "MS Gulf Coast states and MR basin programs",
  ])("leaves %s alone", (text) => {
    expect(personalPatternHits(text)).toEqual([]);
    expect(hasPersonalPattern(text)).toBe(false);
  });

  it("sorts hits by start and reports each", () => {
    const text = "Mr. Example at 555-010-0199 or ex@example.org";
    const hits = personalPatternHits(text);
    expect(hits.map((h) => h.kind)).toEqual(["person_title", "phone", "email"]);
    const starts = hits.map((h) => h.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});
