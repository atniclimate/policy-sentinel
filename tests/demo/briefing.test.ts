// The Briefing export (design section 2): a second template from the same
// document model. Decision dates, source-stated changes since the last check,
// open evidence gaps and questions, every item cited, no recommendation, and
// the Grants.gov attribution whenever a Grants.gov item is in it.
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildPdf } from "../../src/demo/pdf";
import { ieeeReference } from "../../src/demo/citations";
import { COPY } from "../../src/demo/copy";
import { briefing as B } from "../../src/demo/copy/briefing";
import { buildDocument, trackingState } from "../../src/demo/document";
import type { BriefingCheck, DocBlock } from "../../src/demo/document";
import { followItem, localDay } from "../../src/demo/follow";
import type { Followed } from "../../src/demo/follow";
import { emptyActors, reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import type { DemoCitation, DemoIssue } from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { citation, policy, statedCitation } from "./frontend-fixtures";

const VERSION = "0.9.1";
const GENERATED = new Date("2099-01-08T12:00:00Z");
const FOLLOWED = new Date("2099-01-02T12:00:00Z");

const ABSENT: DemoIssue = {
  id: "consultation_absent-1",
  type: "consultation_absent",
  label: "No consultation wording",
  quote: "No consultation wording matched.",
  locator: "whole text",
  rule: "Absence rule.",
  limits: "Missing wording does not show that no consultation occurred.",
  check: "Read the whole record.",
};

function grantRow(): DemoCitation {
  return {
    ...citation("2099-00020", "Example Grant Opportunity"),
    sourceId: "grants",
    identifier: "EX-2099-001",
    kind: "Posted",
    officialUrl: "https://www.grants.gov/search-results-detail/1",
    applicationsCloseOn: "2099-03-15",
  };
}

/** A read record with a stated closing date and two marked passages, an unread undated one, and a grant. */
function report(): ReportState {
  const read = policy("a", statedCitation());
  const first = { ...read, issues: [...read.issues, ABSENT] };
  const unread: DemoCitation = {
    ...citation("2099-00002", "Example Unread Notice"),
    date: null,
    commentsCloseWithheld: true,
  };
  const grant = grantRow();
  const key = keyOf(first.citation);
  return {
    cited: {
      [key]: {
        citation: first.citation,
        policy: first,
        note: "",
        alternates: [],
        foundBy: [
          {
            sourceId: "federal-register",
            terms: "water",
            seed: { kind: "typed" },
          },
        ],
      },
      [keyOf(unread)]: {
        citation: unread,
        policy: null,
        note: "",
        alternates: [],
      },
      [keyOf(grant)]: {
        citation: grant,
        policy: null,
        note: "",
        alternates: [],
      },
    },
    marks: {
      [key]: Object.fromEntries(
        first.issues.map((issue) => [issue.id, { on: true, note: "" }]),
      ),
    },
    actors: emptyActors(),
  };
}

function followed(): Followed {
  return followItem(
    statedCitation(),
    "docket",
    "Docket No. 990101-0001",
    FOLLOWED,
  )!;
}

const texts = (blocks: readonly DocBlock[]) =>
  blocks.map((block) =>
    "text" in block ? block.text : "value" in block ? block.value : "",
  );

/** The block texts between one h2 and the next. */
function section(blocks: readonly DocBlock[], title: string): string[] {
  const start = blocks.findIndex((b) => b.kind === "h2" && b.text === title);
  expect(start).toBeGreaterThan(-1);
  const rest = blocks.slice(start + 1);
  const end = rest.findIndex((b) => b.kind === "h2");
  return texts(end < 0 ? rest : rest.slice(0, end));
}

function build(checks: readonly BriefingCheck[] = [], state = report()) {
  return buildDocument({
    version: VERSION,
    generatedAt: GENERATED,
    entries: reportEntries(state),
    actors: state.actors,
    template: "briefing",
    checks,
  });
}

describe("tracking states", () => {
  const item = followed();
  it("keeps new, unchanged, not checked, unavailable and no longer listed apart", () => {
    const checked = (fresh: readonly DemoCitation[]) => ({
      state: "checked" as const,
      since: "2099-01-02",
      fresh,
      undated: 0,
      more: false,
    });
    expect(trackingState({ item, check: checked([citation()]) })).toBe("new");
    expect(trackingState({ item, check: checked([]) })).toBe("unchanged");
    expect(trackingState({ item })).toBe("not_checked");
    expect(trackingState({ item, check: { state: "waiting" } })).toBe(
      "not_checked",
    );
    expect(
      trackingState({
        item,
        check: { state: "unavailable", reason: "Offline." },
      }),
    ).toBe("unavailable");
    expect(trackingState({ item, check: checked([]), listed: false })).toBe(
      "no_longer_listed",
    );
  });
});

describe("briefing export", () => {
  it("is its own template and leaves the Cited Policies document unchanged", () => {
    const state = report();
    const input = {
      version: VERSION,
      generatedAt: GENERATED,
      entries: reportEntries(state),
      actors: state.actors,
    };
    expect(buildDocument(input)).toEqual(
      buildDocument({ ...input, template: "citations" }),
    );
    const model = build();
    expect(model.title).toBe(`${B.title}, ${localDay(GENERATED)}`);
    expect(model.runningHead).toBe(B.title);
    expect(model.footer).toBe(COPY.limitsShort(VERSION));
    expect(texts(model.blocks)).toContain(B.lede);
  });

  it("lists the stated decision dates in date order, each cited", () => {
    const dates = section(build().blocks, B.datesTitle);
    expect(dates).toEqual([
      `${COPY.commentsClose("2099-02-01", "Federal Register")} [1]`,
      `${COPY.applicationsClose("2099-03-15", "Grants.gov")} [3]`,
    ]);
  });

  it("states the open evidence gaps, each cited", () => {
    const gaps = section(build().blocks, B.gapsTitle);
    expect(gaps).toEqual(
      expect.arrayContaining([
        B.gaps.textNotRead(2),
        B.gaps.dateNotStated(2),
        B.gaps.closeWithheld(2, "Federal Register"),
        B.gaps.foundByNotRecorded(2),
        B.gaps.textNotRead(3),
      ]),
    );
    expect(gaps).not.toContain(B.gaps.textNotRead(1));
  });

  it("asks questions, never recommends, and cites each", () => {
    const questions = section(build().blocks, B.questionsTitle);
    expect(questions).toContain(B.questions.closeDate("2099-02-01", 1));
    expect(questions).toContain(B.questions.consultationAbsent(1));
    for (const text of questions) {
      expect(text).toMatch(/\[\d+\]/);
      expect(text).not.toMatch(/\b(should|must|recommend)/i);
    }
  });

  it("reports source-stated changes since the last check with their state, last checked and data-as-of", () => {
    const item = { ...followed(), lastChecked: "2099-01-05T12:00:00.000Z" };
    const fresh = {
      ...citation("2099-00030", "Example Newer Notice"),
      date: "2099-01-06",
    };
    const changes = section(
      build([
        {
          item,
          check: {
            state: "checked",
            since: "2099-01-05",
            fresh: [fresh],
            undated: 1,
            more: true,
          },
          dataAsOf: "2099-01-08",
        },
        { item: { ...item, id: "other", value: "0648-AA00", kind: "rin" } },
      ]).blocks,
      B.changesTitle,
    );
    // The followed record is cited [1]; the new listing gets the next free reference.
    expect(changes).toEqual(
      expect.arrayContaining([
        `${B.followed("docket", "Docket No. 990101-0001", "Federal Register")} [1]`,
        `${COPY.follow.states.new}. ${COPY.follow.stateHelp.new}`,
        COPY.follow.lastCheckedLine(localDay("2099-01-05T12:00:00.000Z")),
        COPY.follow.dataAsOfLine("2099-01-08"),
        B.newListing(
          "Example Newer Notice",
          "2099-01-06",
          "Federal Register",
          4,
        ),
        COPY.follow.undated(1),
        COPY.follow.more,
        `${COPY.follow.states.not_checked}. ${COPY.follow.stateHelp.not_checked}`,
        COPY.follow.dataAsOfLine(null),
      ]),
    );
    const refs = build([
      {
        item,
        check: {
          state: "checked",
          since: "2099-01-05",
          fresh: [fresh],
          undated: 0,
          more: false,
        },
      },
    ]).blocks.filter((b) => b.kind === "ref");
    expect(refs[3]).toEqual({
      kind: "ref",
      number: 4,
      text: ieeeReference(fresh),
    });
  });

  it("cites a followed record outside the list and states an unavailable check as a gap", () => {
    const state = report();
    const other = {
      ...followed(),
      record: { ...citation("2099-00040", "Example Followed Rule") },
    };
    const model = build(
      [{ item: other, check: { state: "unavailable", reason: "Offline." } }],
      state,
    );
    const what = B.followed(
      "docket",
      "Docket No. 990101-0001",
      "Federal Register",
    );
    expect(section(model.blocks, B.changesTitle)).toContain(`${what} [4]`);
    expect(section(model.blocks, B.gapsTitle)).toContain(
      B.gaps.trackingUnavailable(what, 4),
    );
    expect(
      section(
        build([
          {
            item: other,
            check: {
              state: "checked",
              since: "2099-01-02",
              fresh: [],
              undated: 0,
              more: false,
            },
            listed: false,
          },
        ]).blocks,
        B.questionsTitle,
      ),
    ).toContain(B.questions.noLongerListed(what, 4));
  });

  it("carries the Grants.gov attribution only when a Grants.gov item is in it", () => {
    expect(texts(build().blocks)).toContain(COPY.grants.attribution);
    const state = report();
    for (const key of Object.keys(state.cited))
      if (state.cited[key].citation.sourceId === "grants")
        delete state.cited[key];
    expect(texts(build([], state).blocks)).not.toContain(
      COPY.grants.attribution,
    );
    const grantNew = build(
      [
        {
          item: followed(),
          check: {
            state: "checked",
            since: "2099-01-02",
            fresh: [grantRow()],
            undated: 0,
            more: false,
          },
        },
      ],
      state,
    );
    expect(texts(grantNew.blocks)).toContain(COPY.grants.attribution);
  });

  it("goes through the PDF builder unchanged, as its own document", async () => {
    const state = report();
    const bytes = await buildPdf({
      version: VERSION,
      generatedAt: GENERATED,
      entries: reportEntries(state),
      actors: state.actors,
      template: "briefing",
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe(build([], state).title);
  });

  it("says plainly when there is nothing to report in a section", () => {
    const model = build([], {
      cited: {},
      marks: {},
      actors: emptyActors(),
    });
    const all = texts(model.blocks);
    expect(all).toEqual(
      expect.arrayContaining([
        B.datesNone,
        B.changesNone,
        B.gapsNone,
        B.questionsNone,
      ]),
    );
  });
});
