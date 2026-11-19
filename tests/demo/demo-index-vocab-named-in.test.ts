// @vitest-environment node
// The 18 official Federal Register agency and topic names the Nation-name
// check left out for a general word ("Indians", "Community", "Islands")
// that names no Nation on the recognition list (D-191, 2026-11-19). None of
// these ids or labels names a real Nation; the held-out id stays unnamed in
// every assertion (D-186, D-192).
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  hashedProbe,
  probeHashFile,
} from "../../scripts/demo-index/common.mjs";
import { validateDemoIndex } from "../../scripts/demo-index/validate.mjs";
import {
  HELD_OUT_SHA256,
  NAMED_IN,
  mapFrAgencies,
  mapFrTopics,
} from "../../scripts/demo-index/vocab.mjs";
import { SYNTHETIC_PROBE_NAMES } from "../support/nation-name-probes";
import {
  removeTemps,
  tempDir,
  vocabFile,
  writeIndex,
} from "./fixtures/demo-index/build-index";

afterEach(removeTemps);

const sha256 = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

const AGENCY_LABELS: Record<string, string> = {
  "community-development-financial-institutions-fund":
    "Community Development Financial Institutions Fund",
  "community-living-administration": "Community Living Administration",
  "corporation-for-national-and-community-service":
    "Corporation for National and Community Service",
  "national-civilian-community-corps": "National Civilian Community Corps",
  "rural-housing-and-community-development-service":
    "Rural Housing and Community Development Service",
  "special-trustee-for-american-indians-office":
    "Special Trustee for American Indians Office",
};

const TOPIC_LABELS: Record<string, string> = {
  indians: "Indians",
  "loan-programs-housing-community-development":
    "Loan Programs-Housing and Community Development",
  "grant-programs-housing-community-development":
    "Grant Programs-Housing and Community Development",
  "virgin-islands": "Virgin Islands",
  "community-development": "Community Development",
  "northern-mariana-islands": "Northern Mariana Islands",
  "community-facilities": "Community Facilities",
  "community-development-block-grants": "Community Development Block Grants",
  "pacific-islands-trust-territory": "Pacific Islands Trust Territory",
  "wake-island": "Wake Island",
  "midway-islands": "Midway Islands",
  "community-action-programs": "Community Action Programs",
};

function agencyAnswer(labels: Record<string, string>) {
  return Object.entries(labels).map(([slug, name], i) => ({
    id: i + 1,
    slug,
    name,
    short_name: null,
    parent_id: null,
  }));
}

function topicAnswer(labels: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(labels).map(([slug, name]) => [slug, { count: 1, name }]),
  );
}

describe("the 18 named-in Federal Register vocabulary entries (D-191)", () => {
  it("keeps each named-in agency and topic id with its label in the report", () => {
    const { file: agencyFile, report: agencyReport } = mapFrAgencies(
      agencyAnswer(AGENCY_LABELS),
      [],
    );
    expect(agencyFile.entries.map((e) => e.id).sort()).toEqual(
      Object.keys(AGENCY_LABELS).sort(),
    );
    for (const [id, label] of Object.entries(AGENCY_LABELS))
      expect(agencyReport.namedIn).toContainEqual({ id, label });
    expect(agencyReport.dropped).toEqual([]);

    const { file: topicFile, report: topicReport } = mapFrTopics(
      topicAnswer(TOPIC_LABELS),
      [],
    );
    expect(topicFile.entries.map((e) => e.id).sort()).toEqual(
      Object.keys(TOPIC_LABELS).sort(),
    );
    for (const [id, label] of Object.entries(TOPIC_LABELS))
      expect(topicReport.namedIn).toContainEqual({ id, label });
    expect(topicReport.dropped).toEqual([]);
  });

  it("holds exactly 18 ids, 6 agencies and 12 topics, none on the held-out hash list", () => {
    expect(NAMED_IN.fr_agency).toHaveLength(6);
    expect(NAMED_IN.fr_topic).toHaveLength(12);
    expect(NAMED_IN.fr_agency.length + NAMED_IN.fr_topic.length).toBe(18);
    for (const [kind, ids] of Object.entries(NAMED_IN))
      for (const id of ids)
        expect(
          (HELD_OUT_SHA256 as Record<string, readonly string[]>)[kind] ?? [],
        ).not.toContain(sha256(id));
  });

  it("still drops a named-in label that actually contains an injected probe name", () => {
    const probeName = SYNTHETIC_PROBE_NAMES[0]!;
    const { report } = mapFrTopics(
      {
        "community-development": {
          count: 1,
          name: `Community Development: ${probeName} Fund`,
        },
      },
      [probeName],
    );
    expect(report.dropped).toEqual([
      { id: "community-development", reason: "nation_name_probe" },
    ]);
    expect(report.namedIn).toEqual([]);
  });

  it("still drops a named-in label that hits the hashed recognition list, with a whole probe", () => {
    const hashOnlyName = "Hash Only Synthetic Entity";
    const probe = hashedProbe(probeHashFile([hashOnlyName], 1), "test");
    const { report } = mapFrAgencies(
      [
        {
          id: 1,
          slug: "community-living-administration",
          name: `Community Living Administration ${hashOnlyName} Program`,
        },
      ],
      probe,
    );
    expect(report.dropped).toEqual([
      {
        id: "community-living-administration",
        reason: "nation_name_probe",
      },
    ]);
    expect(report.namedIn).toEqual([]);
  });

  it("still drops a NOT named-in id with the same kind of label", () => {
    const { report } = mapFrAgencies(
      [
        {
          id: 1,
          slug: "example-community-board",
          name: "Example Community Board",
        },
      ],
      [],
    );
    expect(report.dropped).toEqual([
      { id: "example-community-board", reason: "nation_name_probe" },
    ]);
    expect(report.namedIn).toEqual([]);
  });

  it("still drops a named-in entry with a URL in its label", () => {
    const { report } = mapFrAgencies(
      [
        {
          id: 1,
          slug: "community-living-administration",
          name: "Community Living Administration https://example.org",
        },
      ],
      [],
    );
    expect(report.dropped).toEqual([
      { id: "community-living-administration", reason: "url" },
    ]);
    expect(report.namedIn).toEqual([]);
  });

  it("still drops the held-out id as held_out even though it carries no named-in id, and the validator still refuses a file that carries it", () => {
    // A synthetic held-out list for this test only; the committed one never
    // names its entry, and this test names none either.
    const list = {
      fr_agency: [sha256("community-living-administration")],
    };
    const { file, report } = mapFrAgencies(
      [
        {
          id: 1,
          slug: "community-living-administration",
          name: "Community Living Administration",
        },
      ],
      [],
      list,
    );
    expect(file.entries).toEqual([]);
    expect(report.dropped).toEqual([{ id: "(held out)", reason: "held_out" }]);
    expect(report.namedIn).toEqual([]);

    const dir = tempDir();
    const vfile = vocabFile();
    vfile.kind = "fr_agency";
    vfile.entries = [
      {
        id: "community-living-administration",
        label: "Community Living Administration",
        shortLabel: null,
        parentId: null,
      },
    ];
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: vfile }]);
    const result = validateDemoIndex(dir, { heldOutList: list });
    expect(result.errors).toContain(
      "vocab/fr-agencies.json: holds a held-out entry (G3)",
    );
  });

  it("validates a vocabulary file holding a named-in entry", () => {
    const dir = tempDir();
    const file = vocabFile();
    file.kind = "fr_agency";
    file.entries = [
      {
        id: "community-living-administration",
        label: "Community Living Administration",
        shortLabel: null,
        parentId: null,
      },
    ];
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: file }]);
    expect(validateDemoIndex(dir).errors).toEqual([]);
  });

  it("validates a named-in entry whose own id is an anchor word (the real topic id)", () => {
    const dir = tempDir();
    const file = vocabFile();
    file.kind = "fr_topic";
    file.entries = [
      { id: "indians", label: "Indians", shortLabel: null, parentId: null },
    ];
    writeIndex(dir, [{ path: "vocab/fr-topics.json", value: file }]);
    expect(validateDemoIndex(dir).errors).toEqual([]);
  });

  it("still refuses the same label under a non-named-in id", () => {
    const dir = tempDir();
    const file = vocabFile();
    file.kind = "fr_agency";
    file.entries = [
      {
        id: "other-community-office",
        label: "Community Living Administration",
        shortLabel: null,
        parentId: null,
      },
    ];
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: file }]);
    expect(validateDemoIndex(dir).errors.join("\n")).toMatch(
      /Nation-name probe hit/,
    );
  });

  it("still refuses a named-in id placed in the other kind's file", () => {
    const dir = tempDir();
    const file = vocabFile();
    // "community-living-administration" is named in for fr_agency, not fr_topic.
    file.kind = "fr_topic";
    file.entries = [
      {
        id: "community-living-administration",
        label: "Community Living Administration",
        shortLabel: null,
        parentId: null,
      },
    ];
    writeIndex(dir, [{ path: "vocab/fr-topics.json", value: file }]);
    expect(validateDemoIndex(dir).errors.join("\n")).toMatch(
      /Nation-name probe hit/,
    );
  });

  it("still refuses any other label with a structural hit in a file that also carries a named-in entry", () => {
    const dir = tempDir();
    const file = vocabFile();
    file.kind = "fr_agency";
    file.entries = [
      {
        id: "community-living-administration",
        label: "Community Living Administration",
        shortLabel: null,
        parentId: null,
      },
      {
        id: "example-community-board",
        label: "Example Community Board",
        shortLabel: null,
        parentId: null,
      },
    ];
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: file }]);
    expect(validateDemoIndex(dir).errors.join("\n")).toMatch(
      /Nation-name probe hit/,
    );
  });
});
