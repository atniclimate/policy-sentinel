import { describe, expect, it } from "vitest";
import {
  ACTOR_FIELDS,
  attachPolicy,
  emptyActors,
  emptyReport,
  MAX_ACTOR_TEXT,
  missingActorFields,
  removeFromReport,
  reportEntries,
  restoreReport,
  serializeReport,
} from "../../src/demo/report-state";
import type { DataActors, ReportState } from "../../src/demo/report-state";
import type { DemoCitation } from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { listing } from "./fixtures";
import { citation, policy } from "./frontend-fixtures";

const NO_ALTERNATES: DemoCitation[] = [];
const KEPT_NOTICE = /Valid citations and notes were kept/;
const ACTORS: DataActors = {
  name: "Sam Example",
  role: "Policy analyst",
  organization: "Example Office",
  sharingWith: "Example working group",
  purpose: "Briefing preparation",
};

function saved() {
  const p = policy();
  const key = keyOf(p.citation);
  return {
    cited: {
      [key]: {
        citation: p.citation,
        policy: p,
        note: "Keep this policy note.",
        alternates: NO_ALTERNATES,
      },
    },
    marks: {
      [key]: {
        [p.issues[0].id]: { on: true, note: "Keep this passage note." },
      },
    },
    actors: emptyActors(),
  };
}

/** The report as an earlier version wrote it: no match keys, alternates or data actors. */
function legacy(report: ReportState, version?: number): string {
  return JSON.stringify(
    { version, cited: report.cited, marks: report.marks },
    (key, value: unknown) =>
      key === "matchKey" || key === "alternates" ? undefined : value,
  );
}

/** A report whose one citation was merged with listings from two other sources. */
function merged(): ReportState {
  const matchKey = "fr:2099-00001";
  const p = policy("a", { ...citation(), matchKey });
  const key = keyOf(p.citation);
  return {
    cited: {
      [key]: {
        citation: p.citation,
        policy: p,
        note: "Keep this policy note.",
        alternates: [listing("govinfo"), listing("regulations")],
      },
    },
    marks: {
      [key]: {
        [p.issues[0].id]: { on: true, note: "Keep this passage note." },
      },
    },
    actors: { ...ACTORS },
  };
}

describe("citation report recovery and evidence binding", () => {
  it.each([
    "null",
    "[]",
    "{}",
    "{",
    JSON.stringify({ version: 900, cited: {}, marks: {} }),
    JSON.stringify({ version: 4, cited: {}, marks: {}, actors: emptyActors() }),
  ])("recovers safely from an invalid stored root: %s", (raw) => {
    const restored = restoreReport(raw);
    expect(restored.report).toEqual(emptyReport());
    expect(restored.notice).not.toBe("");
  });

  it("migrates validated v1 and v2 snapshots without discarding old rules or notes", () => {
    const original = saved();
    expect(legacy(original)).not.toMatch(/matchKey|alternates|actors/);
    expect(restoreReport(legacy(original))).toEqual({
      report: original,
      notice: "",
    });
    expect(restoreReport(legacy(original, 2))).toEqual({
      report: original,
      notice: "",
    });
    const encoded = serializeReport(original);
    expect(JSON.parse(encoded).version).toBe(3);
    expect(restoreReport(encoded).report).toEqual(original);
  });

  it("keeps valid entries while rejecting unsafe URLs, invalid entries and orphan marks", () => {
    const original = saved();
    const bad = citation("2099-00002");
    const raw = {
      ...original,
      cited: {
        ...original.cited,
        invalid: null,
        [keyOf(bad)]: {
          citation: { ...bad, officialUrl: "javascript:alert(1)" },
          policy: null,
          note: "unsafe",
        },
      },
      marks: {
        ...original.marks,
        orphan: { bad: { on: true, note: "orphan" } },
      },
    };
    const restored = restoreReport(JSON.stringify(raw));
    expect(restored.report).toEqual(original);
    expect(restored.notice).toMatch(KEPT_NOTICE);
  });

  it("keeps the citation note but drops a mismatched policy and its marks", () => {
    const original = saved();
    const key = Object.keys(original.cited)[0];
    original.cited[key].policy = {
      ...original.cited[key].policy,
      receipt: {
        ...original.cited[key].policy.receipt,
        textUrl: "https://www.govinfo.gov/another-document",
      },
    };
    const restored = restoreReport(JSON.stringify(original));
    expect(restored.report.cited[key].note).toBe("Keep this policy note.");
    expect(restored.report.cited[key].policy).toBeNull();
    expect(restored.report.marks[key]).toBeUndefined();
    expect(restored.notice).not.toBe("");
  });

  it("will not replace frozen evidence, erase a note or resurrect a removed citation", () => {
    const original = saved();
    const key = Object.keys(original.cited)[0];
    expect(attachPolicy(original, key, policy("b"))).toBe(original);
    const unread = {
      cited: {
        [key]: {
          citation: citation(),
          policy: null,
          note: "Typed while reading.",
          alternates: NO_ALTERNATES,
        },
      },
      marks: {},
      actors: emptyActors(),
    };
    expect(attachPolicy(unread, key, policy()).cited[key].note).toBe(
      "Typed while reading.",
    );
    const removed = removeFromReport(original, key);
    expect(removed).toEqual(emptyReport());
    expect(attachPolicy(removed, key, policy())).toBe(removed);
  });

  it("projects one receipt, engine, quote and note set for every output", () => {
    const original = saved();
    const entry = reportEntries(original)[0];
    expect(entry.receipt).toEqual(policy().receipt);
    expect(entry.engine).toEqual(policy().engine);
    expect(entry.issues).toEqual([
      { issue: policy().issues[0], note: "Keep this passage note." },
    ]);
    expect(entry.note).toBe("Keep this policy note.");
  });

  it.each([
    ["99 FR 100 (FR Doc. 2099-00001)", "FR Doc. 2099-00001"],
    ["FR Doc. 2099-00001", "99 FR 100 (FR Doc. 2099-00001)"],
  ])(
    "attaches the same document despite citation formatting: %s",
    (savedId, fetchedId) => {
      const c = { ...citation(), identifier: savedId };
      const fetched = policy("a", { ...citation(), identifier: fetchedId });
      const before = structuredClone(fetched);
      const key = keyOf(c);
      const original = {
        cited: {
          [key]: {
            citation: c,
            policy: null,
            note: "Keep my note.",
            alternates: NO_ALTERNATES,
          },
        },
        marks: {},
        actors: emptyActors(),
      };
      const attached = attachPolicy(original, key, fetched);
      expect(attached.cited[key].citation.identifier).toBe(savedId);
      expect(attached.cited[key].note).toBe("Keep my note.");
      expect(attached.cited[key].policy?.receipt).toEqual(fetched.receipt);
      expect(attached.cited[key].policy?.issues).toEqual(fetched.issues);
      expect(fetched).toEqual(before);
      expect(restoreReport(serializeReport(attached))).toEqual({
        report: attached,
        notice: "",
      });
      expect(attachPolicy(attached, key, policy("b"))).toBe(attached);
      expect(
        attachPolicy(original, key, policy("b", citation("2099-00002"))),
      ).toBe(original);
      expect(
        attachPolicy(original, key, {
          ...fetched,
          citation: { ...fetched.citation, sourceId: "govinfo" },
        }),
      ).toBe(original);
    },
  );
});

describe("data actors", () => {
  it("lists the five entries in their fixed order, starting empty", () => {
    expect(ACTOR_FIELDS).toEqual([
      "name",
      "role",
      "organization",
      "sharingWith",
      "purpose",
    ]);
    expect(MAX_ACTOR_TEXT).toBe(300);
    expect(emptyActors()).toEqual({
      name: "",
      role: "",
      organization: "",
      sharingWith: "",
      purpose: "",
    });
    expect(emptyActors()).not.toBe(emptyActors());
    expect(emptyReport().actors).toEqual(emptyActors());
  });

  it("names every entry that is blank after trimming, in field order", () => {
    expect(missingActorFields(emptyActors())).toEqual([...ACTOR_FIELDS]);
    expect(missingActorFields(ACTORS)).toEqual([]);
    expect(
      missingActorFields({ ...ACTORS, purpose: " \n\t", role: "" }),
    ).toEqual(["role", "purpose"]);
  });

  it("saves and restores the entries with the citations", () => {
    const original = merged();
    const encoded = serializeReport(original);
    expect(JSON.parse(encoded).actors).toEqual(ACTORS);
    expect(restoreReport(encoded)).toEqual({ report: original, notice: "" });
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["a list", []],
    ["a wrong type", { ...ACTORS, name: 5 }],
    ["a missing entry", { ...ACTORS, purpose: undefined }],
    ["an over-long entry", { ...ACTORS, role: "x".repeat(MAX_ACTOR_TEXT + 1) }],
  ])(
    "restores damaged entries (%s) as empty and keeps the citations",
    (_case, actors) => {
      const original = merged();
      const restored = restoreReport(
        JSON.stringify({ ...original, version: 3, actors }),
      );
      expect(restored.report).toEqual({ ...original, actors: emptyActors() });
      expect(restored.notice).toMatch(KEPT_NOTICE);
    },
  );

  it("accepts an entry at the length limit and keeps blank entries blank", () => {
    const original = {
      ...merged(),
      actors: { ...emptyActors(), name: "x".repeat(MAX_ACTOR_TEXT) },
    };
    expect(restoreReport(serializeReport(original))).toEqual({
      report: original,
      notice: "",
    });
  });
});

describe("official addresses in saved citations", () => {
  const FR = "https://www.federalregister.gov/d/2099-00002";
  function restoreWith(sourceId: string, officialUrl: string) {
    const original = saved();
    const added = { ...citation("2099-00002"), sourceId, officialUrl };
    const restored = restoreReport(
      JSON.stringify({
        version: 3,
        ...original,
        cited: {
          ...original.cited,
          [keyOf(added)]: {
            citation: added,
            policy: null,
            note: "",
            alternates: [],
          },
        },
      }),
    );
    return { original, added, restored };
  }

  // The document prints the address as text, so it must be the one address and nothing more.
  it.each([
    ["a second address after a space", `${FR} https://attacker.example/login`],
    [
      "a backslash before another host",
      "https://www.federalregister.gov\\@attacker.example/d/2099-00002",
    ],
    [
      "a second address in the query",
      `${FR}?next=https://attacker.example/login`,
    ],
    [
      "a second address in the fragment",
      `${FR}#https://attacker.example/login`,
    ],
    ["a line break and more text", `${FR}\nSee https://attacker.example`],
    ["a leading space", ` ${FR}`],
    [
      "no slashes after the scheme",
      "https:www.federalregister.gov/d/2099-00002",
    ],
    ["an upper-case host", "https://WWW.FEDERALREGISTER.GOV/d/2099-00002"],
    ["the default port written out", FR.replace(".gov/", ".gov:443/")],
    ["a path the parser rewrites", `${FR}/../2099-00003`],
  ])("refuses an official address with %s", (_case, officialUrl) => {
    const { original, restored } = restoreWith("federal-register", officialUrl);
    expect(restored.report).toEqual(original);
    expect(restored.notice).toMatch(KEPT_NOTICE);
  });

  it.each([
    ["federal-register", FR],
    ["govinfo", "https://www.govinfo.gov/app/details/FR-2099-01-05/2099-00002"],
    [
      "regulations",
      "https://www.regulations.gov/document/EXA-HQ-2099-0001-0001",
    ],
    [
      "congress",
      "https://www.congress.gov/bill/119th-congress/house-bill/1234",
    ],
    [
      "washington",
      "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1100.htm",
    ],
  ])(
    "keeps the address shape the demo service builds for %s",
    (sourceId, officialUrl) => {
      const { added, restored } = restoreWith(sourceId, officialUrl);
      expect(restored.notice).toBe("");
      expect(restored.report.cited[keyOf(added)].citation.officialUrl).toBe(
        officialUrl,
      );
    },
  );
});

describe("alternate listings of a cited document", () => {
  it("returns the alternates with each report entry", () => {
    expect(reportEntries(merged())[0].alternates).toEqual([
      listing("govinfo"),
      listing("regulations"),
    ]);
    expect(reportEntries(saved())[0].alternates).toEqual([]);
  });

  it.each([
    ["another document", [listing("govinfo", "2099-00002")]],
    ["no shared identifier", [listing("govinfo", "2099-00001", null)]],
    ["the cited source itself", [listing("federal-register")]],
    [
      "an unsafe link",
      [{ ...listing("govinfo"), officialUrl: "javascript:alert(1)" }],
    ],
    [
      "a malformed identifier",
      [{ ...listing("govinfo"), matchKey: "fr:2099 00001" }],
    ],
    ["not a citation", [null]],
    ["not a list", { 0: listing("govinfo") }],
    ["missing", undefined],
  ])("drops a saved alternate that is %s", (_case, alternates) => {
    const original = merged();
    const key = Object.keys(original.cited)[0];
    const raw = structuredClone(original) as unknown as {
      cited: Record<string, { alternates: unknown }>;
    };
    raw.cited[key].alternates = alternates;
    const restored = restoreReport(JSON.stringify({ version: 3, ...raw }));
    expect(restored.report.cited[key]).toEqual({
      ...original.cited[key],
      alternates: [],
    });
    expect(restored.report.marks).toEqual(original.marks);
    expect(restored.report.actors).toEqual(ACTORS);
    expect(restored.notice).toMatch(KEPT_NOTICE);
  });

  it("keeps the valid alternates beside a bad one, never a second listing from one source, and at most three", () => {
    const original = merged();
    const key = Object.keys(original.cited)[0];
    const restoreWith = (alternates: unknown[]) =>
      restoreReport(
        JSON.stringify({
          ...original,
          version: 3,
          cited: { [key]: { ...original.cited[key], alternates } },
        }),
      );
    const mixed = restoreWith([
      listing("govinfo"),
      listing("regulations", "2099-00002"),
    ]);
    expect(mixed.report.cited[key].alternates).toEqual([listing("govinfo")]);
    expect(mixed.notice).toMatch(KEPT_NOTICE);

    const repeated = restoreWith([listing("govinfo"), listing("govinfo")]);
    expect(repeated.report.cited[key].alternates).toEqual([listing("govinfo")]);
    expect(repeated.notice).toMatch(KEPT_NOTICE);

    const three = [
      listing("govinfo"),
      listing("regulations"),
      listing("congress"),
    ];
    expect(restoreWith(three)).toEqual({
      report: {
        ...original,
        cited: { [key]: { ...original.cited[key], alternates: three } },
      },
      notice: "",
    });
    const four = restoreWith([...three, listing("govinfo")]);
    expect(four.report.cited[key].alternates).toEqual(three);
    expect(four.notice).toMatch(KEPT_NOTICE);
  });

  it("drops every alternate of a citation that has no shared identifier", () => {
    const original = saved();
    const key = Object.keys(original.cited)[0];
    const restored = restoreReport(
      JSON.stringify({
        ...original,
        version: 3,
        cited: {
          [key]: { ...original.cited[key], alternates: [listing("govinfo")] },
        },
      }),
    );
    expect(restored.report).toEqual(original);
    expect(restored.notice).toMatch(KEPT_NOTICE);
  });

  it("keeps data actors and the other citations' alternates when a citation is removed", () => {
    const original = merged();
    const key = Object.keys(original.cited)[0];
    const other = citation("2099-00002", "Second Policy");
    const both: ReportState = {
      ...original,
      cited: {
        ...original.cited,
        [keyOf(other)]: {
          citation: other,
          policy: null,
          note: "",
          alternates: [],
        },
      },
    };
    const removed = removeFromReport(both, keyOf(other));
    expect(removed).toEqual(original);
    expect(removeFromReport(both, key).actors).toEqual(ACTORS);
    expect(removeFromReport(both, key).cited).toEqual({
      [keyOf(other)]: both.cited[keyOf(other)],
    });
  });

  it("keeps data actors, alternates and the saved shared identifier when the text is attached", () => {
    const original = merged();
    const key = Object.keys(original.cited)[0];
    const unread: ReportState = {
      ...original,
      cited: { [key]: { ...original.cited[key], policy: null } },
      marks: {},
    };
    // The policy read may come back without the identifier the search result carried.
    const attached = attachPolicy(unread, key, policy("a", citation()));
    expect(attached.actors).toEqual(ACTORS);
    expect(attached.cited[key].alternates).toEqual(
      original.cited[key].alternates,
    );
    expect(attached.cited[key].citation.matchKey).toBe("fr:2099-00001");
    expect(attached.cited[key].policy?.receipt).toEqual(policy().receipt);
    expect(restoreReport(serializeReport(attached))).toEqual({
      report: attached,
      notice: "",
    });
  });
});
