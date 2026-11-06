// @vitest-environment node
// Modes (design section 2): only the mode goes in the URL, Committee libraries
// exists only with an approved library, and a mode sets panels and the export.
import { describe, expect, it } from "vitest";
import {
  MODE_DEFAULTS,
  availableModes,
  modeFromHash,
  modeHash,
  modeUrl,
} from "../../src/demo/mode";

describe("modes", () => {
  it("offers Committee libraries only when an approved library exists", () => {
    expect(availableModes(false)).toEqual(["research", "grants", "tracking"]);
    expect(availableModes(true)).toEqual([
      "research",
      "grants",
      "tracking",
      "committee",
    ]);
  });

  it("reads the mode from the fragment and falls back to Research", () => {
    expect(modeFromHash("#mode=grants", false)).toBe("grants");
    expect(modeFromHash("#mode=tracking", false)).toBe("tracking");
    expect(modeFromHash("", false)).toBe("research");
    expect(modeFromHash("#mode=unknown", false)).toBe("research");
    expect(modeFromHash("#mode=committee", false)).toBe("research");
    expect(modeFromHash("#mode=committee", true)).toBe("committee");
    expect(modeFromHash("#q=water&mode=grants", false)).toBe("grants");
  });

  it("writes only the mode in the fragment", () => {
    expect(modeHash("grants")).toBe("#mode=grants");
    expect(modeHash("research")).toBe("#mode=research");
  });

  it("keeps search words out of the whole URL it builds", () => {
    const url = modeUrl(
      "https://example.org/demo/?q=water%20quality#q=salmon&mode=research",
      "tracking",
    );
    expect(url).toBe("https://example.org/demo/#mode=tracking");
    expect(url).not.toMatch(/water|salmon|q=/);
    expect(
      modeUrl(
        "https://example.org/demo/?theme=light&embed=1&q=water",
        "grants",
      ),
    ).toBe("https://example.org/demo/?embed=1&theme=light#mode=grants");
  });

  it("changes default panels and the export template only", () => {
    for (const defaults of Object.values(MODE_DEFAULTS))
      expect(Object.keys(defaults).sort()).toEqual(["panels", "template"]);
    expect(MODE_DEFAULTS.research.template).toBe("citations");
    expect(MODE_DEFAULTS.tracking.template).toBe("briefing");
    expect(MODE_DEFAULTS.tracking.panels).toContain("following");
  });
});
