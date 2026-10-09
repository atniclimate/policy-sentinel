/** @jsxImportSource preact */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyWorkspace } from "../../src/app/StudyWorkspace";
import type {
  ConfiguredSourceCoverage,
  StudyWorkspaceProps,
} from "../../src/app/StudyWorkspace";
import {
  MAX_RESEARCH_STUDY_BYTES,
  captureStudyPassage,
  createResearchStudy,
  parseResearchStudy,
  readResearchStudyRevision,
  reviseResearchStudy,
  serializeResearchStudy,
} from "../../src/core/research-study.mjs";
import type { ResearchStudy } from "../../src/core/research-study.mjs";
import { createAnalyzedCorpusV2 } from "../../src/pipeline/analyzed-corpus-v2.mjs";
import type {
  AnalyzedCorpus,
  AnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  createPolicySearchIndex,
  searchPolicyCorpus,
} from "../../src/engine/policy-search.mjs";
// @ts-expect-error The authored Node fixture seals the shared v2 corpus contract.
import * as authored from "../pipeline/analyzed-corpus-v2.test.mjs";
// @ts-expect-error Authored synthetic fixture is shared with Node contract tests.
import { createSyntheticResearchStudyFixture } from "../../fixtures/study/research-study.mjs";

const { syntheticCorpusV2, syntheticCorpusV2Input } = authored;
const NativeURL = globalThis.URL;
let downloads: Blob[];
let downloadNames: string[];
beforeEach(() => {
  downloads = [];
  downloadNames = [];
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL(blob: Blob) {
        downloads.push(blob);
        return "blob:local-study-test";
      }
      static revokeObjectURL() {}
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadNames.push(this.download);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function props(
  corpus: AnalyzedCorpus = syntheticCorpusV2(),
): StudyWorkspaceProps {
  const selected = corpus.segments.find(
    (segment) => segment.renditionId === "rendition-a-new",
  )!;
  return {
    corpus,
    searchResults: searchPolicyCorpus(createPolicySearchIndex(corpus), {
      query: "within 30 days",
    }),
    searchRequest: { query: "within 30 days" },
    selectedSegmentId: selected.id,
    onOpenPassage: vi.fn(),
    onSearch: vi.fn(),
  };
}
function input(form: HTMLElement, label: string, text: string) {
  fireEvent.input(within(form).getByLabelText(label), {
    target: { value: text },
  });
}
function select(form: HTMLElement, label: string, selected: string) {
  fireEvent.change(within(form).getByLabelText(label), {
    target: { value: selected },
  });
}
function chooseFirst(form: HTMLElement, label: string) {
  const field = within(form).getByLabelText(label) as HTMLSelectElement;
  const option = [...field.options].find((item) => item.value !== "")!;
  option.selected = true;
  fireEvent.change(field);
  return option.value;
}
function editor(title: string) {
  const summary = screen.getByText(title, { selector: "summary", exact: true });
  const details = summary.parentElement as HTMLDetailsElement;
  details.open = true;
  return within(details).getByRole("form", { name: title });
}
async function submit(form: HTMLElement) {
  fireEvent.submit(form);
  await waitFor(() =>
    expect(
      screen.queryByText("Validating local study…"),
    ).not.toBeInTheDocument(),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}
async function create(title = "Regional procedural study") {
  const form = screen.getByRole("form", { name: "Create research study" });
  input(form, "Study title", title);
  input(form, "Nonpersonal local analyst label", "local analyst A");
  expect(
    within(form).getByLabelText("Study title and analyst label visibility"),
  ).toHaveValue("restricted");
  await submit(form);
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
}
function file(text: string) {
  const result = new File([text], "study.json", { type: "application/json" });
  Object.defineProperty(result, "text", {
    value: vi.fn().mockResolvedValue(text),
  });
  return result;
}
async function resume(text: string) {
  fireEvent.change(screen.getByLabelText("Resume study JSON"), {
    target: { files: [file(text)] },
  });
  await waitFor(() =>
    expect(
      screen.queryByText("Validating local study…"),
    ).not.toBeInTheDocument(),
  );
}
function blobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}
async function backup(corpus: AnalyzedCorpus) {
  const count = downloads.length;
  fireEvent.click(
    screen.getByRole("button", { name: "Save study JSON", exact: true }),
  );
  await waitFor(() => expect(downloads).toHaveLength(count + 1));
  const text = await blobText(downloads.at(-1)!);
  return { text, study: await parseResearchStudy(text, corpus) };
}
async function seed(
  corpus: AnalyzedCorpus,
  title = "Saved research study",
): Promise<ResearchStudy> {
  const study = await createResearchStudy(
    {
      id: "study-saved",
      title,
      createdAt: "2026-10-01T00:00:00Z",
      sensitivity: "public",
      actor: {
        id: "analyst-local",
        label: "local analyst",
        kind: "analyst",
        sensitivity: "public",
      },
    },
    corpus,
  );
  const passage = await captureStudyPassage(
    {
      id: "passage-saved",
      segmentId: props(corpus).selectedSegmentId!,
      actorId: "analyst-local",
      createdAt: "2026-10-01T00:00:01Z",
      sensitivity: "public",
    },
    corpus,
  );
  return reviseResearchStudy(
    study,
    {
      updatedAt: "2026-10-01T00:00:01Z",
      actorId: "analyst-local",
      records: [
        { collection: "passages", record: passage },
        {
          collection: "questions",
          record: {
            id: "question-saved",
            actorId: "analyst-local",
            createdAt: "2026-10-01T00:00:01Z",
            provenance: "analyst_authored",
            reviewState: "unreviewed",
            sensitivity: "public",
            parentQuestionId: null,
            text: "What changed?",
            theme: "Procedure",
            status: "open",
            discoveryGeographies: [],
          },
        },
      ],
    },
    corpus,
  );
}

describe("persistent local study workspace", () => {
  it("guides an unreviewed parent link into the attributed review form", async () => {
    const { corpus, study } = (await createSyntheticResearchStudyFixture()) as {
      corpus: AnalyzedCorpusV2;
      study: ResearchStudy;
    };
    const relation = study.authorityRelationships[0];
    const pending = await reviseResearchStudy(
      study,
      {
        updatedAt: "2026-10-08T23:00:00Z",
        actorId: study.updatedBy,
        records: [
          {
            collection: "authorityRelationships",
            record: { ...relation, reviewState: "unreviewed" },
          },
        ],
      },
      corpus,
    );
    const searchRequest = {
      query: "roadless Cascades",
      matchMode: "all_terms" as const,
    };
    render(
      <StudyWorkspace
        {...props()}
        corpus={corpus}
        searchRequest={searchRequest}
        searchResults={searchPolicyCorpus(
          createPolicySearchIndex(corpus),
          searchRequest,
        )}
        selectedSegmentId={corpus.segments[0].id}
      />,
    );
    await resume(await serializeResearchStudy(pending, corpus));
    expect(
      screen.getByRole("heading", { name: "Context review guidance" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Review authority-regional" })[0],
    );
    const target = within(editor("Review a study item")).getByLabelText(
      "Item to review",
    ) as HTMLSelectElement;
    expect(target).toHaveValue(relation.id);
    expect(target).toHaveFocus();
  });
  it("explicitly joins a rule-managed model study and preserves its authorship when editing", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    const settings = props();
    const rule = {
      id: "rule-local",
      label: "Local study assembly rule",
      kind: "rule",
      sensitivity: "restricted",
    } as const;
    const model = {
      id: "model-local",
      label: "Model interpretation",
      kind: "model",
      sensitivity: "restricted",
    } as const;
    const initial = await createResearchStudy(
      {
        id: "study-model",
        title: "Model-authored pilot",
        createdAt: "2026-10-01T00:00:00Z",
        actor: rule,
      },
      settings.corpus,
    );
    const question = {
      id: "question-model",
      actorId: model.id,
      createdAt: "2026-10-01T00:00:01Z",
      provenance: "model_interpretation",
      reviewState: "unreviewed",
      sensitivity: "restricted",
      text: "What changed in the proceeding?",
      parentQuestionId: null,
      theme: "Procedure",
      status: "open",
      discoveryGeographies: [],
    } as const;
    const saved = await reviseResearchStudy(
      initial,
      {
        updatedAt: question.createdAt,
        actorId: rule.id,
        records: [
          { collection: "actors", record: model },
          { collection: "questions", record: question },
        ],
      },
      settings.corpus,
    );
    render(<StudyWorkspace {...settings} />);
    await resume(await serializeResearchStudy(saved, settings.corpus));
    expect(screen.getByLabelText("Acting analyst")).toBeDisabled();
    expect(
      within(editor("Update question status")).getByRole("button", {
        name: "Save question status",
      }),
    ).toBeDisabled();
    expect((await backup(settings.corpus)).study.actors).toEqual(saved.actors);
    const joinForm = editor("Join study as local analyst");
    expect(
      within(joinForm).getByLabelText("Local analyst label visibility"),
    ).toHaveValue("restricted");
    input(joinForm, "Nonpersonal local analyst label", "local analyst B");
    await submit(joinForm);
    const joined = (await backup(settings.corpus)).study;
    const analyst = joined.actors.find((item) => item.kind === "analyst")!;
    expect(analyst).toMatchObject({
      label: "local analyst B",
      kind: "analyst",
      sensitivity: "restricted",
    });
    expect(screen.getByLabelText("Acting analyst")).toHaveValue(analyst.id);
    expect(
      screen.getByLabelText("New authored material visibility"),
    ).toHaveValue("restricted");
    expect(joined.questions).toEqual(saved.questions);
    expect(joined.actors.slice(0, saved.actors.length)).toEqual(saved.actors);
    expect(joined.updatedBy).toBe(rule.id);
    expect(joined.revision).toBe(saved.revision + 1);
    const form = editor("Update question status");
    select(form, "Question status", "answered");
    await submit(form);
    const edited = (await backup(settings.corpus)).study;
    expect(edited.questions[0]).toEqual({ ...question, status: "answered" });
    expect(edited.questions[0].actorId).toBe(model.id);
    expect(edited.questions[0].provenance).toBe("model_interpretation");
    expect(edited.updatedBy).toBe(analyst.id);
    expect(edited.revisions.slice(0, saved.revisions.length)).toEqual(
      saved.revisions,
    );
    expect(await readResearchStudyRevision(edited, saved.revision)).toEqual(
      saved,
    );
    expect(network).not.toHaveBeenCalled();
  });

  it("keeps a model-only study readable without inventing an analyst or revision authority", async () => {
    const settings = props();
    const saved = await createResearchStudy(
      {
        id: "study-model-only",
        title: "Model-only study",
        createdAt: "2026-10-01T00:00:00Z",
        actor: {
          id: "model-only",
          label: "Model interpretation",
          kind: "model",
          sensitivity: "restricted",
        },
      },
      settings.corpus,
    );
    render(<StudyWorkspace {...settings} />);
    await resume(await serializeResearchStudy(saved, settings.corpus));
    expect(
      screen.getByText(
        /no saved analyst or rule actor authorized to register an analyst/u,
      ),
    ).toBeInTheDocument();
    expect(
      within(editor("Join study as local analyst")).getByRole("button", {
        name: "Join study",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Prepare knowledge products" }),
    ).not.toBeDisabled();
    expect((await backup(settings.corpus)).study).toEqual(saved);
  });

  it("completes the analyst loop and resumes exact evidence, authorship, review, and private notes", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    const settings = props();
    render(<StudyWorkspace {...settings} />);
    await create();
    expect(
      screen.getByLabelText("New authored material visibility"),
    ).toHaveValue("restricted");
    let form = editor("Add research question");
    input(form, "Research question", "How does the response process change?");
    input(form, "Analytical theme", "Response procedures");
    input(form, "Discovery geography labels (comma separated)", "Cascades, WA");
    await submit(form);
    await submit(editor("Save discovery query"));
    fireEvent.click(screen.getByRole("button", { name: /Frog.s-eye/ }));
    form = editor("Retain a discovered source");
    input(
      form,
      "Reason for retaining source",
      "Direct wording about the response period",
    );
    await submit(form);
    await submit(editor("Capture an exact source block"));
    await waitFor(() =>
      expect(
        screen.getByText(/The council must review proposals within 30 days/, {
          selector: "blockquote",
        }),
      ).toBeInTheDocument(),
    );
    form = editor("Write an evidence-based assertion");
    input(
      form,
      "Analyst assertion",
      "The later source adds a response period.",
    );
    chooseFirst(form, "Supporting passages");
    await submit(form);
    form = editor("Review a study item");
    const assertionOption = [
      ...(within(form).getByLabelText("Item to review") as HTMLSelectElement)
        .options,
    ].find((option) => option.textContent?.includes("The later source"))!;
    select(form, "Item to review", assertionOption.value);
    select(form, "Review decision", "accepted");
    input(form, "Review rationale", "Checked against the original block.");
    await submit(form);
    form = editor("Add a private analyst note");
    select(form, "Note target", assertionOption.value);
    input(
      form,
      "Private analyst note",
      "Private working hypothesis, never source evidence.",
    );
    await submit(form);
    fireEvent.click(screen.getByRole("button", { name: /Moon.s-eye/ }));
    form = editor("Record unresolved gap");
    input(form, "Unresolved evidence gap", "Need evidence of implementation.");
    await submit(form);
    form = editor("Follow up a gap");
    chooseFirst(form, "Gap to follow up");
    input(form, "Follow-up query", "response implementation");
    await submit(form);
    const saved = await backup(settings.corpus);
    for (const discovery of saved.study.discoveries)
      expect(discovery.searchScope).toEqual({
        matchMode: "any_terms",
        temporal: null,
        governmentContext: null,
        jurisdictionRef: null,
        instrumentClass: null,
      });
    expect(saved.study.questions[0].discoveryGeographies).toEqual([
      "Cascades",
      "WA",
    ]);
    expect(saved.study.candidates[0].versionId).toBe("version-a-new");
    expect(saved.study.passages[0].citation.segmentId).toBe(
      settings.selectedSegmentId,
    );
    expect(saved.study.passages[0].provenance).toBe("source_content");
    expect(saved.study.assertions[0].reviewState).toBe("accepted");
    expect(saved.study.assertions[0].provenance).toBe("analyst_authored");
    expect(saved.study.annotations[0].sensitivity).toBe("restricted");
    expect(saved.study.gaps[0].followUpDiscoveryId).toBe(
      saved.study.discoveries[1].id,
    );
    expect(saved.study.discoveries[1].followUpGapId).toBe(
      saved.study.gaps[0].id,
    );
    cleanup();
    render(<StudyWorkspace {...settings} />);
    await resume(saved.text);
    expect(
      screen.getByText("Private working hypothesis, never source evidence."),
    ).toBeInTheDocument();
    const runButtons = screen.getAllByRole("button", {
      name: "Run saved discovery",
    });
    fireEvent.click(runButtons.at(-1)!);
    expect(settings.onSearch).toHaveBeenCalledWith({
      query: "response implementation",
      matchMode: "any_terms",
    });
    expect(network).not.toHaveBeenCalled();
  });

  it("saves and resumes all active discovery filters for queries and gap follow-ups", async () => {
    const original = props();
    const work = original.corpus.works[0];
    const settings = {
      ...original,
      searchRequest: {
        query: "within 30 days",
        matchMode: "all_terms" as const,
        sourceProfileId: work.sourceProfileId,
        governmentContext: work.governmentContext,
        jurisdictionRef: "body:synthetic-council",
        instrumentClass: work.instrumentClass,
        asOf: "2026-10-01",
        basis: "corpus_observed" as const,
      },
    };
    render(<StudyWorkspace {...settings} />);
    await create("Scoped discovery study");
    let form = editor("Add research question");
    input(
      form,
      "Research question",
      "Which source was available at this cutoff?",
    );
    input(form, "Analytical theme", "Historical scope");
    await submit(form);
    await submit(editor("Save discovery query"));
    form = editor("Record unresolved gap");
    input(
      form,
      "Unresolved evidence gap",
      "Find the response in the same scope.",
    );
    await submit(form);
    form = editor("Follow up a gap");
    chooseFirst(form, "Gap to follow up");
    input(form, "Follow-up query", "response implementation");
    await submit(form);
    const saved = await backup(settings.corpus);
    const expectedScope = {
      matchMode: "all_terms",
      temporal: { asOf: "2026-10-01", basis: "corpus_observed" },
      governmentContext: work.governmentContext,
      jurisdictionRef: "body:synthetic-council",
      instrumentClass: work.instrumentClass,
    };
    expect(saved.study.discoveries).toHaveLength(2);
    for (const discovery of saved.study.discoveries)
      expect(discovery.searchScope).toEqual(expectedScope);
    cleanup();
    const resumed = props(settings.corpus);
    render(<StudyWorkspace {...resumed} />);
    await resume(saved.text);
    for (const button of screen.getAllByRole("button", {
      name: "Run saved discovery",
    }))
      fireEvent.click(button);
    for (const discovery of saved.study.discoveries)
      expect(resumed.onSearch).toHaveBeenCalledWith({
        ...settings.searchRequest,
        query: discovery.query,
      });
  });

  it("labels legacy discovery filters as unrecorded without inheriting the current search scope", async () => {
    const settings = {
      ...props(),
      searchRequest: {
        query: "different",
        jurisdictionRef: "body:synthetic-current-filter",
        asOf: "2026-10-07",
        basis: "source_effective" as const,
      },
    };
    const initial = await seed(settings.corpus, "Legacy discovery study");
    const legacy = await reviseResearchStudy(
      initial,
      {
        actorId: "analyst-local",
        updatedAt: "2026-10-01T00:00:02Z",
        records: [
          {
            collection: "discoveries",
            record: {
              id: "discovery-legacy",
              actorId: "analyst-local",
              createdAt: "2026-10-01T00:00:02Z",
              provenance: "analyst_authored",
              reviewState: "unreviewed",
              sensitivity: "restricted",
              questionId: "question-saved",
              query: "legacy scope query",
              sourceIds: [],
              followUpGapId: null,
              status: "planned",
            },
          },
        ],
      },
      settings.corpus,
    );
    render(<StudyWorkspace {...settings} />);
    await resume(await serializeResearchStudy(legacy, settings.corpus));
    expect(
      screen.getByText(/Search scope was not recorded/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Run saved discovery" }),
    );
    expect(settings.onSearch).toHaveBeenCalledWith({
      query: "legacy scope query",
      matchMode: "any_terms",
    });
  });

  it("rejects oversized and malformed resumes without losing the current study", async () => {
    const settings = props();
    render(<StudyWorkspace {...settings} />);
    await create("Keep this study");
    const oversized = file("{}");
    Object.defineProperty(oversized, "size", {
      value: MAX_RESEARCH_STUDY_BYTES + 1,
    });
    fireEvent.change(screen.getByLabelText("Resume study JSON"), {
      target: { files: [oversized] },
    });
    await screen.findByRole("alert");
    expect(oversized.text).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Keep this study" }),
    ).toBeInTheDocument();
    await resume("{invalid json");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Keep this study" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Rebind imported study to this corpus",
      }),
    ).not.toBeInTheDocument();
  });

  it("requires explicit rebind across corpora and preserves the previous study until it succeeds", async () => {
    const original = syntheticCorpusV2() as AnalyzedCorpusV2;
    const saved = await seed(original, "Imported different-corpus study");
    const changed = createAnalyzedCorpusV2({
      ...syntheticCorpusV2Input(),
      id: "different-corpus",
    });
    const settings = props(changed);
    render(<StudyWorkspace {...settings} />);
    await create("Current study");
    await resume(await serializeResearchStudy(saved, original));
    expect(
      screen.getByRole("heading", { name: "Current study" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Imported different-corpus study",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Rebind imported study to this corpus",
      }),
    );
    await screen.findByRole("heading", {
      name: "Imported different-corpus study",
    });
    const rebound = (await backup(changed)).study;
    expect(rebound.passages[0].bindingStatus).toBe("review_required");
    expect(rebound.passages[0].citation.corpusDigest).toBe(
      original.contentDigest,
    );
    expect(rebound.corpusDigest).toBe(changed.contentDigest);
  });

  it("captures structured procedural, consultation and environmental evidence through field forms", async () => {
    const settings = props();
    const initial = await seed(settings.corpus);
    render(<StudyWorkspace {...settings} />);
    await resume(await serializeResearchStudy(initial, settings.corpus));
    fireEvent.click(screen.getByRole("button", { name: /Bird.s-eye/ }));
    const statement = settings.corpus.renditions.find(
      (row) => row.id === "rendition-a-new",
    )!.text;
    const proof = (form: HTMLElement) => {
      input(form, "Exact supporting source statement", statement);
      chooseFirst(form, "Supporting saved passages");
    };
    let form = editor("Add governing proceeding");
    input(form, "Proceeding title", "Synthetic Policy Alpha");
    select(form, "Proceeding document versions", "version-a-new");
    proof(form);
    await submit(form);
    form = editor("Add regulatory action");
    chooseFirst(form, "Action proceeding");
    select(form, "Regulatory action type", "final_rule");
    input(form, "Source date (YYYY, YYYY-MM, or YYYY-MM-DD)", "2022-01-01");
    input(form, "Original source date wording", "Effective 2022-01-01");
    proof(form);
    await submit(form);
    form = editor("Add consultation event");
    select(form, "Consultation event type", "notice");
    select(form, "Participation attribution scope", "aggregate");
    input(
      form,
      "Exact agency, organization, or Nation name in source",
      "council",
    );
    select(form, "Source-documented role", "agency");
    proof(form);
    await submit(form);
    form = editor("Add environmental impact evidence");
    input(form, "Alternative identifier", "A");
    input(form, "Baseline year", "2022");
    input(form, "Resource metric", "proposals");
    input(form, "Exact metric value or range", "30");
    input(form, "Measurement unit", "days");
    proof(form);
    await submit(form);
    const saved = (await backup(settings.corpus)).study;
    expect(saved.actions[0].date.value).toBe("2022-01-01");
    expect(saved.consultations[0].participants[0].scope).toBe("aggregate");
    expect(saved.actors.some((actor) => actor.kind === "tribal_nation")).toBe(
      false,
    );
    expect(saved.environmentalEvidence[0]).toMatchObject({
      alternativeId: "A",
      baselineYear: 2022,
      metric: "proposals",
      value: "30",
      unit: "days",
      versionId: "version-a-new",
      provenance: "extracted_evidence",
    });
    expect(saved.environmentalEvidence[0].passageIds).toEqual([
      "passage-saved",
    ]);
  });

  it.each([
    ["restricted", "public", "public-study"],
    ["public", "public", "study-filename"],
    ["restricted", "local", "study-filename"],
  ] as const)(
    "uses the filtered identity in every %s study's %s download filename",
    async (sensitivity, audience, expectedId) => {
      const settings = props();
      const initial = await createResearchStudy(
        {
          id: "study-filename",
          title: "Synthetic study title",
          createdAt: "2026-10-01T00:00:00Z",
          sensitivity,
          actor: {
            id: "analyst-local",
            label: "Synthetic analyst",
            kind: "analyst",
            sensitivity,
          },
        },
        settings.corpus,
      );
      render(<StudyWorkspace {...settings} />);
      await resume(await serializeResearchStudy(initial, settings.corpus));
      select(
        screen.getByRole("region", { name: "Persistent research study" }),
        "Export audience",
        audience,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Prepare knowledge products" }),
      );
      const buttons = await screen.findAllByRole("button", {
        name: /^Download /,
      });
      for (const button of buttons) fireEvent.click(button);
      expect(downloadNames).toEqual(
        [
          "dossier.html",
          "evidence.csv",
          "timeline.csv",
          "authority.csv",
          "gaps.csv",
          "graph.json",
          "provenance.json",
        ].map((name) => `${expectedId}-${audience}-${name}`),
      );
      if (audience === "public" && sensitivity === "restricted") {
        for (const blob of downloads)
          expect(await blobText(blob)).not.toContain(initial.id);
      }
    },
  );

  it("downloads public filtered products separately from the local private-note backup", async () => {
    const settings = props();
    const initial = await seed(settings.corpus);
    render(<StudyWorkspace {...settings} />);
    await resume(await serializeResearchStudy(initial, settings.corpus));
    const form = editor("Add a private analyst note");
    chooseFirst(form, "Note target");
    input(form, "Private analyst note", "DO NOT EXPORT this private note");
    await submit(form);
    select(
      screen.getByRole("region", { name: "Persistent research study" }),
      "Export audience",
      "public",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare knowledge products" }),
    );
    await screen.findByRole("button", {
      name: "Download machine-readable provenance",
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Download machine-readable provenance",
      }),
    );
    const exported = await blobText(downloads.at(-1)!);
    expect(exported).not.toContain("DO NOT EXPORT");
    expect(exported).not.toContain("The council must review");
    expect(exported).toContain('"audience": "public"');
    expect((await backup(settings.corpus)).text).toContain("DO NOT EXPORT");
  });

  it("explains empty-result coverage and real service limits with accessible keyboard controls", async () => {
    const settings = props();
    const empty = searchPolicyCorpus(createPolicySearchIndex(settings.corpus), {
      query: "no matching invented term",
    });
    const sourceCoverage: ConfiguredSourceCoverage = {
      catalogId: "configured-test",
      asOf: "2026-10-08T00:00:00Z",
      managedStorageCeilingBytes: 50_000_000_000,
      sources: [
        {
          id: "synthetic-unavailable",
          label: "Synthetic unavailable collection",
          publisher: "Synthetic agency",
          lifecycle: "discovery",
          reviewStatus: "unqualified",
          discoveryRegions: ["NV"],
          declaredCapabilities: [
            { mode: "identifier_lookup", state: "unavailable" },
          ],
          availableCapabilities: [],
          regionalInterface: {
            state: "NV",
            assessedOn: "2026-10-07",
            requirement: "interface_disposition",
            disposition: "interface_gap",
            note: "The official index does not establish API availability.",
            evidence: [
              {
                observedOn: "2026-10-06",
                url: "https://example.test/official-index",
              },
            ],
          },
          coverage: {
            documented: {
              from: null,
              through: null,
              completeness: "unknown",
              note: "No acquisition has occurred.",
            },
          },
          blockers: [
            {
              code: "qualification",
              detail: "Qualification remains outstanding.",
            },
          ],
        },
      ],
      limitations: [
        "Configured source coverage is not a claim of acquisition.",
      ],
    };
    const { container } = render(
      <StudyWorkspace
        {...settings}
        searchResults={empty}
        searchRequest={{
          query: "no matching invented term",
          sourceProfileId: "profile-a",
        }}
        sourceCoverage={sourceCoverage}
        projection={{
          parentCorpusDigest: settings.corpus.contentDigest,
          corpusDigest: settings.corpus.contentDigest,
          selection: {
            sourceProfileIds: ["profile-a"],
            from: "2022-01-01",
            through: "2022-12-31",
          },
          directlySelectedVersionIds: ["version-a-new"],
          retainedVersionIds: ["version-a-new", "version-a-old", "version-b"],
          excludedVersionIds: [],
          coverage: [
            {
              sourceProfileId: "profile-a",
              selected: true,
              searched: true,
              retained: true,
              status: "healthy",
              dataAsOf: "2026-09-03",
            },
            {
              sourceProfileId: "profile-b",
              selected: false,
              searched: false,
              retained: true,
              status: "healthy",
              dataAsOf: "2026-09-03",
            },
          ],
          limitations: ["Retained dependencies extend beyond direct matches."],
        }}
      />,
    );
    expect(
      screen.getByText(/No matches in this search do not establish/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Regional interface review: NV/)).toHaveTextContent(
      "Interface qualification · interface gap. Assessed 2026-10-07.",
    );
    expect(
      screen.getByText(/official index does not establish API/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Interface evidence", hidden: true }),
    ).toHaveAttribute("href", "https://example.test/official-index");
    expect(
      screen.getByText(/Synthetic publisher a: searched/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Synthetic publisher b: not searched/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Requested publication date range: 2022-01-01 through 2022-12-31/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 directly selected versions; 3 retained versions/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/profile-b: not selected, unsearched, retained/),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    screen.getByLabelText("Study title").focus();
    await user.tab();
    expect(
      screen.getByLabelText("Nonpersonal local analyst label"),
    ).toHaveFocus();
    await user.type(
      screen.getByLabelText("Nonpersonal local analyst label"),
      "keyboard analyst",
    );
    expect(
      screen.getByLabelText("Nonpersonal local analyst label"),
    ).toHaveValue("keyboard analyst");
    expect(
      screen.getByText(
        /Synthetic unavailable collection: discovery, unqualified/,
      ),
    ).toBeInTheDocument();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations.map(({ id, help }) => ({ id, help }))).toEqual([]);
  });
});
