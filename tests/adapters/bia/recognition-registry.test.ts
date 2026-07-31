import { spawnSync } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  rmdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { describe, expect, it } from "vitest";

import {
  BIA_PUBLICATION_REVIEW,
  BIA_RECOGNITION_2026,
  BIA_REVIEWED_TRANSCRIPTION,
  BIA_RESPONSE_POLICY,
  buildBiaRegistryFromDocuments,
  fetchOfficialBiaRegistry,
  govInfoBoundedListSha256,
  normalizeVisibleText,
  parseRecognitionEntries,
  prepareBiaStagingOutput,
  reconcile2026RecognitionEntries,
  resolveBiaStagingOutput,
  stableNationId,
  verifyGovInfoTranscript,
  verifyReviewedRecognitionInventory,
  writeBiaStagingJson,
} from "../../../src/adapters/bia";
import type {
  FetchLike,
  RecognitionSourceDocuments,
} from "../../../src/adapters/bia";

const fixturePath = resolve(
  process.cwd(),
  "fixtures/sources/bia/recognition-structure.html",
);
const repositoryRoot = resolve(process.cwd());
const projectTestTempParent = resolve(repositoryRoot, ".cache/test-tmp/bia");

function hasFileSystemCode(error: unknown, ...codes: string[]): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    codes.includes((error as NodeJS.ErrnoException).code ?? "")
  );
}

async function ensureProjectTestTempParent(): Promise<void> {
  const rootRealPath = await realpath(repositoryRoot);
  const components = relative(repositoryRoot, projectTestTempParent)
    .split(sep)
    .filter(Boolean);
  let current = repositoryRoot;
  let currentRealPath = rootRealPath;

  for (const component of components) {
    current = resolve(current, component);
    try {
      await lstat(current);
    } catch (error) {
      if (!hasFileSystemCode(error, "ENOENT")) {
        throw error;
      }
      await mkdir(resolve(currentRealPath, component));
    }
    const stats = await lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Unsafe project-local test directory: ${current}`);
    }
    currentRealPath = await realpath(current);
    if (
      currentRealPath !== rootRealPath &&
      !currentRealPath.startsWith(`${rootRealPath}${sep}`)
    ) {
      throw new Error(
        `Project-local test directory escapes the repository: ${current}`,
      );
    }
  }
}

async function makeProjectTestDirectory(prefix: string): Promise<string> {
  await ensureProjectTestTempParent();
  return mkdtemp(join(projectTestTempParent, prefix));
}

async function removeProjectTestDirectories(
  ...directories: string[]
): Promise<void> {
  for (const directory of directories) {
    const resolvedDirectory = resolve(directory);
    const relativePath = relative(projectTestTempParent, resolvedDirectory);
    if (
      relativePath === "" ||
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw new Error(
        `Refusing to remove an unsafe test directory: ${resolvedDirectory}`,
      );
    }
    await rm(resolvedDirectory, { recursive: true, force: true });
  }
  try {
    await rmdir(projectTestTempParent);
  } catch (error) {
    if (!hasFileSystemCode(error, "ENOENT", "ENOTEMPTY")) {
      throw error;
    }
  }
  try {
    await rmdir(dirname(projectTestTempParent));
  } catch (error) {
    if (!hasFileSystemCode(error, "ENOENT", "ENOTEMPTY")) {
      throw error;
    }
  }
}

const contiguousHeading =
  "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";
const alaskaHeading =
  "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";

const validMetadata = {
  document_number: BIA_RECOGNITION_2026.documentNumber,
  publication_date: BIA_RECOGNITION_2026.publicationDate,
  body_html_url: BIA_RECOGNITION_2026.structuredBodyUrl,
  pdf_url: BIA_RECOGNITION_2026.officialPdfUrl,
  correction_of: null,
  corrections: [],
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
    { length: 348 },
    (_, index) => `Synthetic Contiguous Nation ${index + 1}`,
  );
  const alaskaNames = Array.from(
    { length: 223 },
    (_, index) => `Synthetic Alaska Nation ${index + 1}`,
  );
  const specialNames = [
    "Aleut Community of St. Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands) (previously listed as Saint Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands))",
    "Arctic Village (See Native Village of Venetie Tribal Government)",
    "Native Village of Venetie Tribal Government (Arctic Village and Village of Venetie)",
    "Pribilof Islands Aleut Communities of St. Paul & St. George Islands (St. George Island and Saint Paul Island)",
    "St. George Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands)",
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
      contiguousHeading,
      ...contiguousNames,
      alaskaHeading,
      ...alaskaNames,
      ...specialNames,
      "[FR Doc. 2026-01899 Filed 1-29-26; 8:45 am]",
    ].join("\n"),
    retrievedAt: "2026-07-30T20:00:00.000Z",
  };
}

describe("BIA annual recognition-list adapter", () => {
  it("parses source paragraphs without retaining markup or hidden page controls", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");

    expect(entries).toHaveLength(16);
    expect(entries[0]).toMatchObject({
      exactText:
        "Capitan Grande Band of Diegueno Mission Indians of California (Barona Group of Capitan Grande Band of Mission Indians of the Barona Reservation, California; Viejas (Baron Long) Group of Capitan Grande Band of Mission Indians of the Viejas Reservation, California)",
      paragraphId: "p-capitan",
      page: "4103",
      section: "contiguous_48",
    });
    expect(
      entries.find((entry) => entry.paragraphId === "p-lumbee")?.exactText,
    ).toBe(
      "Lumbee Tribe of North Carolina (See Supplementary Information supra, noting conditions on the Tribe's eligibility for Federal services)",
    );
    expect(
      entries.find((entry) => entry.paragraphId === "p-fort-sill")?.exactText,
    ).toContain("Fort Sill—Chiricahua—Warm Springs—Apache Tribe");
    expect(
      entries.find((entry) => entry.paragraphId === "p-fort-mojave")?.exactText,
    ).toBe("Fort Mojave Indian Tribe of Arizona, California & Nevada");
    expect(
      entries.find((entry) => entry.paragraphId === "p-pulikla")?.exactText,
    ).toContain("PuliklaTribe");
    expect(
      entries.filter((entry) => entry.section === "contiguous_48"),
    ).toHaveLength(10);
    expect(entries.filter((entry) => entry.section === "alaska")).toHaveLength(
      6,
    );
    expect(JSON.stringify(entries)).not.toMatch(
      /hidden page control|address|contact|email|geometry|latitude|longitude/i,
    );
  });

  it("blocks the unsupported 577-to-575 identity reconciliation", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");

    expect(() => reconcile2026RecognitionEntries(entries, 16, 14)).toThrowError(
      /identity reconciliation is blocked/,
    );
    expect(entries.map((entry) => entry.exactText)).toEqual(
      expect.arrayContaining([
        "Aleut Community of St. Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands) (previously listed as Saint Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands))",
        "Arctic Village (See Native Village of Venetie Tribal Government)",
        "Native Village of Venetie Tribal Government (Arctic Village and Village of Venetie)",
        "Pribilof Islands Aleut Communities of St. Paul & St. George Islands (St. George Island and Saint Paul Island)",
        "St. George Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands)",
        "Village of Venetie (See Native Village of Venetie Tribal Government)",
      ]),
    );
  });

  it("fails closed on source count changes and duplicate grouping rows", async () => {
    const fixture = await readFile(fixturePath, "utf8");
    const entries = parseRecognitionEntries(fixture, "html");

    expect(() => reconcile2026RecognitionEntries(entries, 17, 15)).toThrowError(
      /expected exactly 17/,
    );
    expect(() =>
      reconcile2026RecognitionEntries([...entries, entries[11]], 17, 15),
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
      ${contiguousHeading}
      ${entries
        .filter((entry) => entry.section === "contiguous_48")
        .map((entry) => entry.exactText)
        .join("\n")}
      ${alaskaHeading}
      ${entries
        .filter((entry) => entry.section === "alaska")
        .map((entry) => entry.exactText)
        .join("\n")}
      [FR Doc. 2026-01899 Filed 1-29-26; 8:45 am]
    `;
    const boundedListDigest = govInfoBoundedListSha256(officialText);

    expect(() =>
      verifyGovInfoTranscript(officialText, entries, 3, boundedListDigest),
    ).not.toThrow();
    expect(() =>
      verifyGovInfoTranscript(
        officialText.replace("3 Tribal", "4 Tribal"),
        entries,
        3,
        boundedListDigest,
      ),
    ).toThrowError(/expected total of 3/);
    expect(() =>
      verifyGovInfoTranscript(
        officialText.replace("PuliklaTribe", "Pulikla Tribe"),
        entries,
        3,
        boundedListDigest,
      ),
    ).toThrowError(/bounded recognition-list hash/);
    expect(() =>
      verifyGovInfoTranscript(
        officialText,
        [entries[1], entries[0], ...entries.slice(2)],
        3,
        boundedListDigest,
      ),
    ).toThrowError(/differs from ordered GovInfo/);
    expect(() =>
      verifyGovInfoTranscript(
        officialText.replace(
          alaskaHeading,
          `Extra unreviewed Nation\n${alaskaHeading}`,
        ),
        entries,
        3,
        boundedListDigest,
      ),
    ).toThrowError(/bounded recognition-list hash/);
  });

  it("records a machine-readable blocking publication review", () => {
    expect(BIA_PUBLICATION_REVIEW).toMatchObject({
      state: "required_before_publication",
      blocking: true,
      reasonCode: "current-notice-identity-reconciliation-unresolved",
      reviewedAt: null,
    });
    expect(BIA_REVIEWED_TRANSCRIPTION).toMatchObject({
      rawEntryCount: 577,
      sectionEntryCounts: {
        contiguous_48: 348,
        alaska: 229,
      },
      statedNationCount: 575,
      seeClauseCount: 6,
      identityReconciliation: "blocked_unresolved_row_reconciliation",
    });
  });

  it("rejects any 577-row inventory that is not the reviewed source order", () => {
    const documents = fullSyntheticDocuments();
    const entries = parseRecognitionEntries(documents.structuredBody, "html");

    expect(entries).toHaveLength(577);
    expect(() => verifyReviewedRecognitionInventory(entries)).toThrowError(
      /ordered inventory hash/,
    );
    expect(() => buildBiaRegistryFromDocuments(documents)).toThrowError(
      /GovInfo bounded recognition-list hash/,
    );
  });

  it("requires a fresh review when metadata links a correction", async () => {
    await expect(
      fetchOfficialBiaRegistry({
        fetchImpl: injectedFetch({
          metadata: response(
            JSON.stringify({
              ...validMetadata,
              corrections: [{ document_number: "test-correction" }],
            }),
            "application/json",
          ),
        }),
        retrievedAt: "2026-07-31T00:00:00.000Z",
      }),
    ).rejects.toThrowError(/links a correction/);
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

  it("accepts only ignored BIA staging and removes a stale exact target", async () => {
    const temporaryRoot = await makeProjectTestDirectory("output-");
    try {
      const outputArgument = ".cache/source-validation/bia/review/nations.json";
      const expectedOutput = resolve(temporaryRoot, outputArgument);
      const legacyOutput = resolve(
        temporaryRoot,
        "dist/source-validation/bia/nations.json",
      );
      expect(resolveBiaStagingOutput(temporaryRoot, outputArgument)).toBe(
        expectedOutput,
      );
      for (const unsafePath of [
        "dist/source-validation/bia/nations.json",
        ".cache/source-validation/other/nations.json",
        ".cache/source-validation/bia-lookalike/nations.json",
        ".cache/source-validation/bia/../../outside.json",
        resolve(temporaryRoot, "..", "outside.json"),
      ]) {
        expect(() =>
          resolveBiaStagingOutput(temporaryRoot, unsafePath),
        ).toThrow();
      }

      await mkdir(dirname(expectedOutput), { recursive: true });
      await mkdir(dirname(legacyOutput), { recursive: true });
      await writeFile(expectedOutput, "stale", "utf8");
      await writeFile(legacyOutput, "legacy", "utf8");
      await prepareBiaStagingOutput(temporaryRoot, expectedOutput);
      await expect(access(expectedOutput)).rejects.toThrow();
      await expect(access(legacyOutput)).rejects.toThrow();

      await writeBiaStagingJson(
        temporaryRoot,
        expectedOutput,
        '{"validated":true}\n',
      );
      await expect(readFile(expectedOutput, "utf8")).resolves.toBe(
        '{"validated":true}\n',
      );
      await expect(
        writeBiaStagingJson(
          temporaryRoot,
          expectedOutput,
          '{"overwrite":true}\n',
        ),
      ).rejects.toThrow();
      await expect(readFile(expectedOutput, "utf8")).resolves.toBe(
        '{"validated":true}\n',
      );
      const temporaryPrefix = `.${basename(expectedOutput)}.`;
      expect(
        (await readdir(dirname(expectedOutput))).filter(
          (name) => name.startsWith(temporaryPrefix) && name.endsWith(".tmp"),
        ),
      ).toEqual([]);
      await prepareBiaStagingOutput(temporaryRoot, expectedOutput);
      await expect(access(expectedOutput)).rejects.toThrow();
    } finally {
      await removeProjectTestDirectories(temporaryRoot);
    }

    const ignored = spawnSync(
      "git",
      ["check-ignore", "--quiet", ".cache/source-validation/bia/nations.json"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    expect(ignored.status).toBe(0);
  });

  it("refuses a linked staging component without touching its target", async () => {
    const temporaryRoot = await makeProjectTestDirectory("linked-root-");
    const externalTarget = await makeProjectTestDirectory("linked-target-");
    try {
      const stagingParent = resolve(temporaryRoot, ".cache/source-validation");
      await mkdir(stagingParent, { recursive: true });
      await symlink(
        externalTarget,
        resolve(stagingParent, "bia"),
        process.platform === "win32" ? "junction" : "dir",
      );

      await expect(
        writeBiaStagingJson(
          temporaryRoot,
          ".cache/source-validation/bia/nations.json",
          '{"mustNotWrite":true}\n',
        ),
      ).rejects.toThrow(/linked path component/);
      await expect(readdir(externalTarget)).resolves.toEqual([]);
    } finally {
      await removeProjectTestDirectories(temporaryRoot, externalTarget);
    }
  });

  it("keeps ignored cache paths in the tracked-source denylist", async () => {
    const scanner = await readFile(
      resolve(process.cwd(), "scripts/scan-source-boundary.mjs"),
      "utf8",
    );
    expect(scanner).toMatch(
      /forbiddenTrackedPrefixes\s*=\s*\[[\s\S]*?"\.cache\/"/,
    );
  });

  it("refuses generated output outside ignored BIA validation staging", () => {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/build-bia-registry.mjs",
        "--out",
        "dist/source-validation/bia/nations.json",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(
      /JSON file under \.cache\/source-validation\/bia/,
    );
  });
});
