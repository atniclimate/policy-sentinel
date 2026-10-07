// @vitest-environment node
import { describe, expect, it } from "vitest";
import { COPY, EXAMPLES } from "../../src/demo/copy";
import { identifyIssues, splitSentences } from "../../src/demo/rules";

const blocks = [
  {
    locator: "/p[1]",
    text: "The Department consulted with affected governments before drafting this proposal.",
  },
  {
    locator: "/p[2]",
    text: "Comments must be received on or before March 2, 2099. The final\nrule would take effect on July 1, 2099.",
  },
  {
    locator: "/p[3]",
    text: "This action is authorized by 42 U.S.C. 7401 and implements 40 CFR 131.10. The Department has reviewed Executive Order 13175 and concludes that this proposal has Tribal implications.",
  },
  {
    locator: "/p[4]",
    text: "The Department would rescind the earlier guidance and withdraw the notice.",
  },
];

describe("demo rules", () => {
  const issues = identifyIssues(blocks, {
    kind: "Proposed Rule",
    title: "Example",
  });
  const types = new Set(issues.map((i) => i.type));

  it("identifies each rule type from exact text", () => {
    expect(types).toEqual(
      new Set([
        "consultation_language",
        "tribal_reference",
        "date_or_deadline",
        "status_signal",
        "cross_reference",
      ]),
    );
  });

  it("quotes text that is present in the source blocks", () => {
    const source = blocks.map((b) => b.text.replace(/\s+/g, " ")).join(" ");
    for (const issue of issues) {
      expect(source).toContain(issue.quote.replace(/…$/, ""));
    }
  });

  it("gives every issue a rule, a limit, a next check and a locator", () => {
    for (const issue of issues) {
      expect(issue.rule.length).toBeGreaterThan(20);
      expect(issue.limits.length).toBeGreaterThan(20);
      expect(issue.check.length).toBeGreaterThan(20);
      expect(issue.locator).toMatch(/^\/p\[\d\]$/);
    }
  });

  it("reports absence of consultation wording for a rule, with its limits", () => {
    const quiet = identifyIssues(
      [
        {
          locator: "/p[1]",
          text: "The fee for a standard filing is unchanged this year.",
        },
      ],
      { kind: "Rule", title: "Fees" },
    );
    const absent = quiet.find((i) => i.type === "consultation_absent");
    expect(absent?.limits).toMatch(
      /Absence in this extract is not absence in the record/,
    );
  });

  it("does not report absence for a notice", () => {
    const quiet = identifyIssues(
      [
        {
          locator: "/p[1]",
          text: "The meeting is held on a weekday afternoon.",
        },
      ],
      { kind: "Notice", title: "Meeting" },
    );
    expect(quiet.find((i) => i.type === "consultation_absent")).toBeUndefined();
  });

  it("retains lowercase and short fragments as evidence", () => {
    const sentences = splitSentences([
      {
        locator: "/p[1]",
        text: "raised in the previous meetings. A full sentence ends here.",
      },
    ]);
    expect(sentences.map((s) => s.text)).toEqual([
      "raised in the previous meetings.",
      "A full sentence ends here.",
    ]);
  });

  it.each([
    "consultation",
    "consultation is required here.",
    `${"A long provision contains detail ".repeat(20)}and consultation is required.`,
  ])(
    "does not infer absence from short, lowercase, or long source wording: %s",
    (text) => {
      const actual = identifyIssues(
        [
          { locator: "/p[1]", text },
          {
            locator: "/p[2]",
            text: "The filing fee stays unchanged this year.",
          },
        ],
        { kind: "Rule", title: "Example" },
      );
      expect(actual.some((i) => i.type === "consultation_absent")).toBe(false);
      const passage = actual.find((i) => i.type === "consultation_language")!;
      expect(passage.quote).toContain("consultation");
      expect(passage.quote.length).toBeLessThanOrEqual(420);
      expect(text).toContain(passage.quote);
      expect(passage.locator).toBe("/p[1]");
    },
  );

  it("keeps late cross-reference and status matches in their source excerpts", () => {
    const text = `${"The provision adds context ".repeat(24)}with a final rule under 40 CFR 131.10.`;
    const actual = identifyIssues([{ locator: "/p[1]", text }], {
      kind: "Notice",
      title: "Example",
    });
    expect(actual.find((i) => i.type === "cross_reference")?.quote).toContain(
      "40 CFR 131.10",
    );
    expect(actual.find((i) => i.type === "status_signal")?.quote).toContain(
      "final rule",
    );
    for (const i of actual) expect(text).toContain(i.quote);
  });

  it("does not claim absence from empty extraction", () => {
    expect(
      identifyIssues([{ locator: "/p[1]", text: "  " }], {
        kind: "Rule",
        title: "Example",
      }),
    ).toEqual([]);
  });

  it("is deterministic", () => {
    expect(
      identifyIssues(blocks, { kind: "Proposed Rule", title: "Example" }),
    ).toEqual(issues);
  });
});

describe("public copy", () => {
  it("has no em dashes in page or rule prose", () => {
    const strings: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") strings.push(value);
      else if (typeof value === "function")
        strings.push(
          String(
            (value as (...a: never[]) => unknown)(
              "0.2.0" as never,
              1 as never,
              "x" as never,
            ),
          ),
        );
      else if (value && typeof value === "object")
        Object.values(value).forEach(walk);
    };
    walk(COPY);
    walk(EXAMPLES);
    const issues = identifyIssues(blocks, { kind: "Rule", title: "x" });
    issues.forEach((i) => walk([i.rule, i.limits, i.check, i.label]));
    for (const text of strings) expect(text).not.toContain("—");
  });

  it("names the version and the development status", () => {
    expect(COPY.limits("0.2.0")).toMatch(/0\.2\.0 is in development/);
    expect(COPY.limits("0.2.0")).toMatch(/not legal advice/i);
    expect(COPY.limits("0.2.0")).toMatch(/incomplete or delayed/);
    expect(COPY.limits("0.2.0")).toMatch(/miss passages or misread/);
    expect(COPY.limits("0.2.0")).toMatch(
      /Verify everything against the official source/,
    );
  });
});

it("detects layout-hyphenated wording while quoting source words", () => {
  const text =
    "A prefatory fragment. " +
    "background ".repeat(70) +
    "consulta-\ntion is required and Executive Or-\nder 13175 is cited.";
  const found = identifyIssues([{ text, locator: "/p[1]" }], {
    kind: "Rule",
    title: "Example",
  });
  expect(found.some((i) => i.type === "consultation_absent")).toBe(false);
  expect(
    found.find((i) => i.type === "consultation_language")?.quote,
  ).toContain("consulta- tion");
  expect(found.find((i) => i.type === "cross_reference")?.quote).toContain(
    "Executive Or- der 13175",
  );
  for (const i of found) expect(text.replace(/\s+/g, " ")).toContain(i.quote);
});
it("retains distinct references beyond the first quote window", () => {
  const text =
    "Executive Order 13175 " +
    "background ".repeat(70) +
    "and 42 U.S.C. 7401 are cited.";
  const found = identifyIssues([{ text, locator: "/p[1]" }], {
    kind: "Notice",
    title: "Example",
  }).filter((i) => i.type === "cross_reference");
  expect(found).toHaveLength(2);
  expect(found[0].quote).toContain("Executive Order 13175");
  expect(found[1].quote).toContain("42 U.S.C. 7401");
});
