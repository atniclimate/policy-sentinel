import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BIA_PUBLICATION_REVIEW,
  BIA_RECOGNITION_2026,
  BIA_RESPONSE_POLICY,
  buildBiaRegistryFromDocuments,
  fetchOfficialBiaRegistry,
  normalizeVisibleText,
  parseRecognitionEntries,
  reconcile2026RecognitionEntries,
  stableNationId,
  verifyGovInfoTranscript,
} from "../../../src/adapters/bia";
import type {
  FetchLike,
  RecognitionSourceDocuments,
} from "../../../src/adapters/bia";

const fixturePath = resolve(
  process.cwd(),
  "fixtures/sources/bia/recognition-structure.html",
);

const contiguousHeading =
  "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";
const alaskaHeading =
  "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";

const validMetadata = {
  document_number: BIA_RECOGNITION_2026.documentNumber,
  publication_date: BIA_RECOGNITION_2026.publicationDate,
  body_html_url: BIA_RECOGNITION_2026.structuredBodyUrl,
  pdf_url: BIA_RECOGNITION_2026.officialPdfUrl,
};

function response(
  body: string,
  contentType: string,
  contentLength?: number,
): Response {
  const headers = new Headers({ "Content-Type": contentType });
  if (contentLength !== undefined) {
    headers.set("Content-Length", String(contentLength));
  }
  return new Response(body, { status: 200, headers });
}

function injectedFetch(responses: {
  metadata?: Response;
  structured?: Response;
  official?: Response;
}): FetchLike {
  return async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === BIA_RECOGNITION_2026.metadataUrl) {
      return (
        responses.metadata ??
        response(JSON.stringify(validMetadata), "application/json")
      );
    }
    if (url === BIA_RECOGNITION_2026.structuredBodyUrl) {
      return responses.structured ?? response("<html></html>", "text/html");
    }
    if (url === BIA_RECOGNITION_2026.officialTextUrl) {
      return responses.official ?? response("<html></html>", "text/html");
    }
    throw new Error(`Unexpected test URL: ${url}`);
  };
}

function fullSyntheticDocuments(): RecognitionSourceDocuments {
  const contiguousNames = Array.from(
    { length: 300 },
    (_, index) => `Synthetic Contiguous Nation ${index + 1}`,
  );
  const alaskaNames = Array.from(
    { length: 274 },
    (_, index) => `Synthetic Alaska Nation ${index + 1}`,
  );
  const specialNames = [
    "Arctic Village (See Native Village of Venetie Tribal Government)",
    "Native Village of Venetie Tribal Government (Arctic Village and Village of Venetie)",
    "Village of Venetie (See Native Village of Venetie Tribal Government)",
  ];
  const paragraph = (name: string, id: string) =>
    `<p class="flush-paragraph flush-paragraph-1" id="${id}">${name}</p>`;
  const structuredBody = [
    `<h2>${contiguousHeading}</h2>`,
    ...contiguousNames.map((name, index) => paragraph(name, `p-c-${index}`)),
    `<h2>${alaskaHeading}</h2>`,
    ...alaskaNames.map((name, index) => paragraph(name, `p-a-${index}`)),
    ...specialNames.map((name, index) => paragraph(name, `p-special-${index}`)),
  ].join("\n");

  return {
    metadata: validMetadata,
    structuredBody,
    structuredFormat: "html",
    officialText: [
      "SUMMARY: This notice publishes the current list of 575 Tribal entities.",
      ...contiguousNames,
      ...alaskaNames,
      ...specialNames,
    ].join("\n"),
    retrievedAt: "2026-07-30T20:00:00.000Z",
  };
}

describe("BIA annual recognition-list adapter", () => {
  it("parses source paragraphs without retaining markup or hidden page controls", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");

    expect(entries).toHaveLength(5);
    expect(entries[0]).toMatchObject({
      exactText: "Synthetic Nation, Example",
      paragraphId: "p-contiguous",
      page: "1",
      section: "contiguous_48",
    });
    expect(entries.at(-1)?.exactText).toBe(
      "Synthetic S'Klallam Nation & Community",
    );
    expect(JSON.stringify(entries)).not.toMatch(
      /address|contact|email|geometry|latitude|longitude/i,
    );
  });

  it("reconciles only the two source-explicit Venetie cross references", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");
    const reconciled = reconcile2026RecognitionEntries(entries, 5, 3);

    expect(reconciled).toHaveLength(3);
    const canonical = reconciled.find((entry) =>
      entry.officialName.startsWith(
        "Native Village of Venetie Tribal Government",
      ),
    );
    expect(canonical?.authorizedAliases).toEqual([
      "Arctic Village",
      "Village of Venetie",
    ]);
    expect(canonical?.evidenceEntries).toHaveLength(3);
    expect(reconciled.map((entry) => entry.officialName)).not.toContain(
      "Arctic Village (See Native Village of Venetie Tribal Government)",
    );
  });

  it("fails closed on source count changes and duplicate reconciliation entries", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");

    expect(() => reconcile2026RecognitionEntries(entries, 6, 4)).toThrowError(
      /expected exactly 6/,
    );
    expect(() =>
      reconcile2026RecognitionEntries([...entries, entries[1]], 6, 4),
    ).toThrowError(/found 2/);
  });

  it("assigns deterministic opaque IDs and preserves meaningful punctuation", () => {
    const officialName = "Synthetic S'Klallam Nation & Community";
    expect(stableNationId(officialName)).toMatch(
      /^nation:bia-v1-[a-f0-9]{24}$/,
    );
    expect(stableNationId(`  ${officialName}  `)).toBe(
      stableNationId(officialName),
    );
    expect(stableNationId(officialName.toUpperCase())).toBe(
      stableNationId(officialName),
    );
    expect(stableNationId("Synthetic Nation")).not.toBe(
      stableNationId(officialName),
    );
  });

  it("supports injected XML and line-structured text fixtures", () => {
    const xml = `
      <ROOT>
        <HD>${normalizeVisibleText(
          "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs",
        )}</HD>
        <P ID="xml-one">Synthetic Nation One</P>
        <HD>${normalizeVisibleText(
          "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs",
        )}</HD>
        <P ID="xml-two">Synthetic Nation Two</P>
        <FRDOC />
      </ROOT>`;
    expect(parseRecognitionEntries(xml, "xml")).toHaveLength(2);

    const text = [
      "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs",
      "Synthetic Nation One",
      "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs",
      "Synthetic Nation Two",
      "[END OF RECOGNITION LIST]",
    ].join("\n");
    expect(parseRecognitionEntries(text, "text")).toHaveLength(2);
  });

  it("requires the stated total and exact GovInfo transcript evidence", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");
    const officialText = `
      SUMMARY: This notice publishes the current list of 3 Tribal entities.
      ${entries.map((entry) => entry.exactText).join("\n")}
    `;

    expect(() =>
      verifyGovInfoTranscript(officialText, entries, 3),
    ).not.toThrow();
    expect(() =>
      verifyGovInfoTranscript(
        officialText.replace("3 Tribal", "4 Tribal"),
        entries,
        3,
      ),
    ).toThrowError(/expected total of 3/);
    expect(() =>
      verifyGovInfoTranscript(
        officialText.replace("Synthetic Nation, Example", "Different Nation"),
        entries,
        3,
      ),
    ).toThrowError(/differs from GovInfo/);
  });

  it("carries a machine-readable blocking publication review into the registry", () => {
    const registry = buildBiaRegistryFromDocuments(fullSyntheticDocuments());

    expect(registry.publicationReview).toEqual(BIA_PUBLICATION_REVIEW);
    expect(registry.publicationReview).toMatchObject({
      state: "required_before_publication",
      blocking: true,
      reasonCode: "source-grouping-semantics-require-human-review",
      reviewedAt: null,
    });
  });

  it.each([
    {
      label: "metadata",
      fetchImpl: injectedFetch({
        metadata: response(JSON.stringify(validMetadata), "text/html"),
      }),
      message: /metadata response Content-Type/,
    },
    {
      label: "structured body",
      fetchImpl: injectedFetch({
        structured: response("<html></html>", "application/json"),
      }),
      message: /structured body response Content-Type/,
    },
    {
      label: "GovInfo text",
      fetchImpl: injectedFetch({
        official: response("<html></html>", "text/plain"),
      }),
      message: /GovInfo official text response Content-Type/,
    },
  ])("rejects an unexpected $label media type before parsing", async (test) => {
    await expect(
      fetchOfficialBiaRegistry({
        fetchImpl: test.fetchImpl,
        retrievedAt: "2026-07-30T20:00:00.000Z",
      }),
    ).rejects.toThrowError(test.message);
  });

  it.each([
    {
      label: "metadata",
      fetchImpl: injectedFetch({
        metadata: response(
          "{}",
          "application/json",
          BIA_RESPONSE_POLICY.metadata.maxBytes + 1,
        ),
      }),
      message: /metadata response declares/,
    },
    {
      label: "structured body",
      fetchImpl: injectedFetch({
        structured: response(
          "",
          "text/html",
          BIA_RESPONSE_POLICY.structuredBody.maxBytes + 1,
        ),
      }),
      message: /structured body response declares/,
    },
    {
      label: "GovInfo text",
      fetchImpl: injectedFetch({
        official: response(
          "",
          "text/html",
          BIA_RESPONSE_POLICY.officialText.maxBytes + 1,
        ),
      }),
      message: /GovInfo official text response declares/,
    },
  ])("rejects an oversized declared $label before parsing", async (test) => {
    await expect(
      fetchOfficialBiaRegistry({
        fetchImpl: test.fetchImpl,
        retrievedAt: "2026-07-30T20:00:00.000Z",
      }),
    ).rejects.toThrowError(test.message);
  });

  it("enforces the byte limit when Content-Length is absent", async () => {
    const oversizedBody = "x".repeat(
      BIA_RESPONSE_POLICY.structuredBody.maxBytes + 1,
    );
    await expect(
      fetchOfficialBiaRegistry({
        fetchImpl: injectedFetch({
          structured: response(oversizedBody, "text/html"),
        }),
        retrievedAt: "2026-07-30T20:00:00.000Z",
      }),
    ).rejects.toThrowError(/structured body response exceeded/);
  });

  it("refuses generated output outside dist before making a source request", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/build-bia-registry.mjs", "--out", "README.md"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/JSON file under dist/);
  });
});
