import { describe, expect, it } from "vitest";

import {
  GOIA_ACCORD_HTML_POLICY,
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_URL,
  GoiaAccordContractError,
  assertGoiaAccordProjection,
  parseGoiaAccordPage,
} from "../../../src/adapters/washington-centennial-accord";
import { goiaAccordFixture, replaceExactly } from "./test-helpers";

function errorFor(html: string): GoiaAccordContractError {
  try {
    parseGoiaAccordPage(html);
  } catch (error) {
    expect(error).toBeInstanceOf(GoiaAccordContractError);
    return error as GoiaAccordContractError;
  }
  throw new Error("expected contract failure");
}

describe("GOIA Centennial Accord bounded HTML contract", () => {
  it("projects only the reviewed metadata from a clearly fictional fixture", () => {
    expect(goiaAccordFixture).toContain("fictional-year-3785");
    expect(goiaAccordFixture).toContain("no provider prose");
    const page = parseGoiaAccordPage(goiaAccordFixture);
    expect(page).toEqual({
      contractVersion: "1.0.0",
      pageUrl: GOIA_ACCORD_URL,
      projection: {
        pageTitle: GOIA_ACCORD_METADATA.pageTitle,
        instrumentTitle: GOIA_ACCORD_METADATA.instrumentTitle,
        statePartyName: GOIA_ACCORD_METADATA.statePartyName,
        stateExecutingLabel: GOIA_ACCORD_METADATA.stateExecutingLabel,
        stateSignatoryLabel: GOIA_ACCORD_METADATA.stateSignatoryLabel,
        tribalPartyName: GOIA_ACCORD_METADATA.tribalPartyName,
        tribalSignatoryLabel: GOIA_ACCORD_METADATA.tribalSignatoryLabel,
        executionSourceLabel: GOIA_ACCORD_METADATA.executionSourceLabel,
        executionDate: "1989-08-04",
        officialUrl: GOIA_ACCORD_URL,
        articleDirectElementCount: 26,
      },
    });
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.projection)).toBe(true);
    expect(JSON.stringify(page)).not.toContain("3785");
    expect(JSON.stringify(page)).not.toContain("provider prose");
  });

  it.each([
    [
      'about="/state-tribal-relations-centennial-accord/centennial-accord"',
      'about="/fictional/not-canonical"',
      "missing_field",
      "$document.canonicalArticle",
    ],
    [
      'property="schema:text"',
      'property="fictional:text"',
      "missing_field",
      "$article.body",
    ],
    [
      "<h1>Centennial Accord</h1>",
      "<h1>Fictional altered title</h1>",
      "missing_field",
      "$document.pageTitle",
    ],
    [
      "Federally Recognized Indian Tribes",
      "Fictional Altered Governments",
      "missing_field",
      "$article.instrumentTitle",
    ],
    [
      GOIA_ACCORD_METADATA.stateExecutingLabel,
      "Fictional altered state party",
      "missing_field",
      "$article.stateExecutingLabel",
    ],
    [
      "have executed this Accord",
      "did not execute this fictional instrument",
      "missing_field",
      "$article.executionSourceLabel",
    ],
  ])(
    "fails closed when reviewed metadata drifts: %s",
    (search, replacement, code, path) => {
      expect(
        errorFor(replaceExactly(goiaAccordFixture, search, replacement)),
      ).toMatchObject({
        code,
        path,
      });
    },
  );

  it("rejects duplicate canonical articles, bodies, titles, and execution events", () => {
    const articleStart = goiaAccordFixture.indexOf("    <article");
    const articleEnd =
      goiaAccordFixture.indexOf("    </article>") + "    </article>".length;
    const article = goiaAccordFixture.slice(articleStart, articleEnd);
    expect(
      errorFor(goiaAccordFixture.replace("  </body>", `${article}\n  </body>`)),
    ).toMatchObject({
      code: "duplicate_value",
      path: "$document.canonicalArticle",
    });
    expect(
      errorFor(
        goiaAccordFixture.replace("<body>", "<body><h1>Centennial Accord</h1>"),
      ),
    ).toMatchObject({
      code: "duplicate_value",
      path: "$document.pageTitle",
    });
    const duplicateBody = replaceExactly(
      goiaAccordFixture,
      '      <div property="schema:text">',
      '      <div property="schema:text"></div><div property="schema:text">',
    );
    expect(errorFor(duplicateBody)).toMatchObject({
      code: "duplicate_value",
      path: "$article.body",
    });
    const duplicateEvent = replaceExactly(
      goiaAccordFixture,
      "Fictional sentinel 3785-10; no source body copied.",
      GOIA_ACCORD_METADATA.executionSourceLabel,
    );
    expect(errorFor(duplicateEvent)).toMatchObject({
      code: "duplicate_value",
      path: "$article.executionEvent",
    });
  });

  it("rejects direct-element grammar drift and embedded active or linked content", () => {
    expect(
      errorFor(
        replaceExactly(
          goiaAccordFixture,
          "<p>Fictional sentinel 3785-18; no official subject.</p>",
          "<section>Fictional sentinel 3785-18; no official subject.</section>",
        ),
      ),
    ).toMatchObject({ code: "unexpected_structure" });
    expect(
      errorFor(
        replaceExactly(
          goiaAccordFixture,
          "Fictional sentinel 3785-13; no embedded link.",
          '<a href="https://example.invalid">fictional link</a>',
        ),
      ),
    ).toMatchObject({
      code: "unexpected_structure",
      path: "$article.embeddedContent",
    });
    expect(
      errorFor(
        replaceExactly(
          goiaAccordFixture,
          "</article>",
          '<template><article about="/state-tribal-relations-centennial-accord/centennial-accord"></article></template></article>',
        ),
      ),
    ).toMatchObject({ code: "unexpected_structure" });
  });

  it("bounds DOM nodes, attributes, depth, text, and parse errors", () => {
    const tooManyNodes = goiaAccordFixture.replace(
      "</body>",
      `${"<i></i>".repeat(GOIA_ACCORD_HTML_POLICY.maximumDomNodes)}</body>`,
    );
    expect(errorFor(tooManyNodes)).toMatchObject({
      code: "limit_exceeded",
      path: "$document.nodes",
    });

    const tooManyAttributes = goiaAccordFixture.replace(
      "<body>",
      `<body><i ${Array.from(
        { length: GOIA_ACCORD_HTML_POLICY.maximumAttributesPerElement + 1 },
        (_, index) => `data-f${index}="x"`,
      ).join(" ")}></i>`,
    );
    expect(errorFor(tooManyAttributes)).toMatchObject({
      code: "limit_exceeded",
      path: "$document.elementAttributes",
    });

    const aggregateAttributes = Array.from(
      { length: 48 },
      (_, element) =>
        `<i ${Array.from(
          { length: GOIA_ACCORD_HTML_POLICY.maximumAttributesPerElement },
          (_unused, attribute) => `data-f${element}-${attribute}="x"`,
        ).join(" ")}></i>`,
    ).join("");
    expect(
      errorFor(
        goiaAccordFixture.replace("<body>", `<body>${aggregateAttributes}`),
      ),
    ).toMatchObject({
      code: "limit_exceeded",
      path: "$document.attributes",
    });

    const tooDeep = goiaAccordFixture
      .replace(
        "<body>",
        `<body>${"<i>".repeat(GOIA_ACCORD_HTML_POLICY.maximumDomDepth + 1)}`,
      )
      .replace(
        "</body>",
        `${"</i>".repeat(GOIA_ACCORD_HTML_POLICY.maximumDomDepth + 1)}</body>`,
      );
    expect(errorFor(tooDeep)).toMatchObject({
      code: "limit_exceeded",
      path: "$document.depth",
    });

    const tooMuchText = goiaAccordFixture.replace(
      "<body>",
      `<body>${"x".repeat(GOIA_ACCORD_HTML_POLICY.maximumTextCodeUnits)}`,
    );
    expect(errorFor(tooMuchText)).toMatchObject({
      code: "limit_exceeded",
      path: "$document.text",
    });

    const outsideDuplicateAttribute = goiaAccordFixture.replace(
      "<body>",
      '<body><div data-fixture="a" data-fixture="b"></div>',
    );
    expect(() => parseGoiaAccordPage(outsideDuplicateAttribute)).not.toThrow();
    const tooManyParseErrors = goiaAccordFixture.replace(
      "<body>",
      `<body>${'<i data-fixture="a" data-fixture="b"></i>'.repeat(
        GOIA_ACCORD_HTML_POLICY.maximumParseErrors + 1,
      )}`,
    );
    expect(errorFor(tooManyParseErrors)).toMatchObject({
      code: "unexpected_structure",
      path: "$document.html",
    });
    const insideDuplicateAttribute = goiaAccordFixture.replace(
      '<div property="schema:text">',
      '<div property="schema:text" data-fixture="a" data-fixture="b">',
    );
    expect(errorFor(insideDuplicateAttribute)).toMatchObject({
      code: "unexpected_structure",
      path: "$document.article.html",
    });
  });

  it("rejects mutated or widened typed projections", () => {
    const valid = parseGoiaAccordPage(goiaAccordFixture).projection;
    expect(assertGoiaAccordProjection(structuredClone(valid))).toEqual(valid);
    expect(() =>
      assertGoiaAccordProjection({ ...valid, providerText: "forbidden" }),
    ).toThrow(/contract failed/);
    expect(() =>
      assertGoiaAccordProjection({ ...valid, executionDate: "1989-08-05" }),
    ).toThrow(/contract failed/);
  });
});
