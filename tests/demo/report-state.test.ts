import { describe, expect, it } from "vitest";
import {
  attachPolicy,
  emptyReport,
  removeFromReport,
  reportEntries,
  restoreReport,
  serializeReport,
} from "../../src/demo/report-state";
import { keyOf } from "../../src/demo/validation";
import { citation, policy } from "./frontend-fixtures";

function saved() {
  const p = policy();
  const key = keyOf(p.citation);
  return {
    cited: {
      [key]: {
        citation: p.citation,
        policy: p,
        note: "Keep this policy note.",
      },
    },
    marks: {
      [key]: {
        [p.issues[0].id]: { on: true, note: "Keep this passage note." },
      },
    },
  };
}

describe("citation report recovery and evidence binding", () => {
  it.each([
    "null",
    "[]",
    "{}",
    "{",
    JSON.stringify({ version: 900, cited: {}, marks: {} }),
  ])("recovers safely from an invalid stored root: %s", (raw) => {
    const restored = restoreReport(raw);
    expect(restored.report).toEqual(emptyReport());
    expect(restored.notice).not.toBe("");
  });

  it("migrates validated v1 snapshots without discarding old rules or notes", () => {
    const original = saved();
    expect(restoreReport(JSON.stringify(original))).toEqual({
      report: original,
      notice: "",
    });
    const encoded = serializeReport(original);
    expect(JSON.parse(encoded).version).toBe(2);
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
    expect(restored.notice).toMatch(/Valid citations and notes were kept/);
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
        },
      },
      marks: {},
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
        cited: { [key]: { citation: c, policy: null, note: "Keep my note." } },
        marks: {},
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
