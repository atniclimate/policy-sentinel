/** @jsxImportSource preact */

import axe from "axe-core";
import { render } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import { NationPicker } from "../../src/app/components/NationPicker";
import { PolicySelector } from "../../src/app/components/PolicySelector";
import { RecordCard } from "../../src/app/components/RecordCard";
import { emptyCriteria } from "../../src/app/routing";
import type { Nation, PublicRecord, Taxonomy } from "../../src/app/types";

const nation: Nation = {
  id: "nation:synthetic-a",
  officialName: "Synthetic Nation A",
  aliases: ["Synthetic A"],
  coveredStateCodes: ["WA"],
};

const taxonomy: Taxonomy = {
  version: "1.0.0",
  categories: [
    {
      id: "synthetic-policy",
      label: "Synthetic policy",
      subcategories: [
        {
          id: "synthetic-subcategory",
          label: "Synthetic subcategory",
          description: "Synthetic description for accessibility testing.",
        },
      ],
    },
  ],
};

const record: PublicRecord = {
  internalId: "psr:synthetic:accessibility",
  officialTitle: "Official synthetic accessibility record",
  sourceDocumentIdentifier: "SYN-A11Y",
  documentType: "notice",
  source: {
    id: "synthetic-source",
    name: "Synthetic Official Source",
  },
  jurisdiction: {
    level: "federal",
    name: "United States",
    stateCode: null,
  },
  issuingBodies: ["Synthetic Public Agency"],
  status: {
    normalized: "active",
    sourceLabel: "Open",
    asOf: "2026-07-30",
  },
  dates: {
    introduced: null,
    published: "2026-07-30",
    updated: null,
    lastAction: null,
    deadline: null,
    effective: null,
    retrieved: "2026-07-30T12:00:00Z",
  },
  urls: {
    officialSource: "https://official.example.invalid/SYN-A11Y",
    officialFullText: null,
  },
  texts: {
    officialSummary: null,
    sourceExcerpt: null,
    officialLanguage: null,
    detailPath: null,
  },
  sponsors: [],
  committees: [],
  actionHistory: [],
  statusHistory: [],
  officialSubjects: [],
  taxonomyMemberships: [],
  isUnclassified: true,
  relevance: [
    {
      basis: "general_jurisdiction",
      label: "General federal jurisdiction",
    },
  ],
  nationIds: [],
  nationAssociations: [],
  landmark: {
    isLandmark: false,
    criterionCodes: [],
    officialEvidence: [],
  },
  historical: {
    isHistorical: false,
  },
  dataQuality: {
    state: "validated",
    issues: [],
  },
  sourceHealth: {
    status: "healthy",
    dataAsOf: "2026-07-30",
    lastSuccessfulRetrievalAt: "2026-07-30T12:00:00Z",
    usingLastKnownGood: false,
    message: null,
  },
  change: {
    kind: "unchanged",
    urgentAlert: null,
  },
  aiSummary: {
    exists: false,
    label: "AI-generated source summary",
  },
  fieldProvenance: [],
  searchText:
    "official synthetic accessibility record synthetic official source",
};

describe("accessible discovery controls", () => {
  it("has no automated axe violations in the core selection and result controls", async () => {
    const criteria = {
      ...emptyCriteria(),
      nationId: nation.id,
      allPolicyAreas: true,
    };
    const { container } = render(
      <main>
        <h1>Policy Sentinel synthetic accessibility fixture</h1>
        <NationPicker
          nations={[nation]}
          value={nation.id}
          onChange={() => undefined}
        />
        <PolicySelector
          taxonomy={taxonomy}
          value={criteria}
          onChange={() => undefined}
        />
        <h2>Matching source records</h2>
        <RecordCard
          record={record}
          criteria={criteria}
          fromPath="/search"
          whyShown={{
            basis: "general_jurisdiction",
            label: "General jurisdiction, not Nation-specific",
          }}
          selected={false}
          onSelectionChange={() => undefined}
        />
      </main>,
    );

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );
  });
});
