/**
 * Synthetic static index fixtures (index conditions K5). Every value here is
 * synthetic; no file written by these helpers holds a real Nation name,
 * person, contact or address.
 */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

import {
  PATTERN_SET_VERSION,
  type PatternId,
} from "../../../../src/demo/cite-patterns";
import {
  VERBATIM_FIELDS,
  type CfrAuthorityShard,
  type IndexFile,
  type IndexManifest,
  type IndexSource,
  type UscSourceCreditShard,
  type VocabularyFile,
} from "../../../../src/demo/index-types";
import {
  DEFAULT_PROBE_FIXTURE,
  initialManifest,
  manifestBytes,
  shardBytes,
} from "../../../../scripts/demo-index/common.mjs";

export const RETRIEVED = "2026-11-05T12:00:00Z";
export const RIGHTS = {
  statementText: "none stated",
  url: "https://www.federalregister.gov/reader-aids/developer-resources",
  readOn: "2026-11-05",
  readByRole: "owner",
} as const;

const SCHEMA = "../../schemas/demo-index.schema.v1.json";
const pattern = (id: PatternId) => ({ id, version: PATTERN_SET_VERSION });

export function vocabFile(): VocabularyFile {
  return {
    $schema: SCHEMA,
    schemaVersion: "1.0.0",
    artifactType: "vocabulary",
    kind: "fr_agency",
    entries: [
      {
        id: "alpha-department",
        label: "Alpha Department",
        shortLabel: "AD",
        parentId: null,
      },
      {
        id: "beta-service",
        label: "Beta Service",
        shortLabel: null,
        parentId: "alpha-department",
      },
    ],
  };
}

export function cfrShard(): CfrAuthorityShard {
  return {
    $schema: SCHEMA,
    schemaVersion: "1.0.0",
    artifactType: "cfr-authority-shard",
    title: 25,
    editionYear: 2025,
    revisedAsOfText: "Revised as of April 1, 2025",
    volumes: null,
    partsExpected: 3,
    partsReserved: 1,
    subpartAuthorityCount: 0,
    entries: [
      {
        title: 25,
        part: "1a",
        authorityText: "5 U.S.C. 301.",
        sourceText: null,
        authorityCitations: [
          {
            kind: "usc",
            text: "5 U.S.C. 301",
            basis: "source_text_parsed",
            pattern: pattern("usc-section"),
            title: 5,
            section: "301",
            etSeq: false,
          },
        ],
        sourceCitations: [],
        omitted: [],
      },
      {
        title: 25,
        part: "10",
        authorityText: "25 U.S.C. 450f et seq.",
        sourceText: "61 FR 32501, June 24, 1996, unless otherwise noted.",
        authorityCitations: [
          {
            kind: "usc",
            text: "25 U.S.C. 450f et seq.",
            basis: "source_text_parsed",
            pattern: pattern("usc-section"),
            title: 25,
            section: "450f",
            etSeq: true,
          },
        ],
        sourceCitations: [
          {
            kind: "fr",
            text: "61 FR 32501",
            basis: "source_text_parsed",
            pattern: pattern("fr-page"),
            volume: 61,
            page: 32501,
            dateText: "June 24, 1996",
          },
        ],
        omitted: [],
      },
    ],
  };
}

export function uscShard(): UscSourceCreditShard {
  return {
    $schema: SCHEMA,
    schemaVersion: "1.0.0",
    artifactType: "usc-source-credit-shard",
    title: 25,
    chapters: null,
    releasePoint: "119-136",
    publicationName: "Online@119-136",
    currentThroughText: "Current through 119-136",
    unmappedRefCount: 0,
    entries: [
      {
        identifier: "/us/usc/t25/s450f",
        status: "transferred",
        creditText: null,
        credits: [],
        reclassifiedAs: {
          targets: ["/us/usc/t25/s5321"],
          noteText:
            "Section 450f was editorially reclassified as section 5321 of this title.",
          noteTextOmitted: false,
        },
      },
      {
        identifier: "/us/usc/t25/s5304",
        status: null,
        creditText: "(Pub. L. 93–638, § 4, Jan. 4, 1975, 88 Stat. 2204.)",
        credits: [
          {
            kind: "pl",
            text: "Pub. L. 93–638, § 4",
            basis: "source_field",
            pattern: pattern("uslm-pl-href"),
            congress: 93,
            number: 638,
            section: "4",
            date: "1975-01-04",
          },
          {
            kind: "stat",
            text: "88 Stat. 2204",
            basis: "source_field",
            pattern: pattern("uslm-stat-href"),
            volume: 88,
            page: 2204,
            pageEnd: null,
          },
        ],
        reclassifiedAs: null,
      },
    ],
  };
}

export function sourceFor(path: string, value: unknown): IndexSource {
  const base = {
    requestCount: 1,
    retrievedAt: RETRIEVED,
    rights: { ...RIGHTS },
  };
  if (path.startsWith("cfr/")) {
    const shard = value as CfrAuthorityShard;
    return {
      ...base,
      id: "govinfo-cfr-annual",
      name: "GovInfo bulk data, CFR annual edition",
      urlTemplate:
        "https://www.govinfo.gov/bulkdata/CFR/{year}/title-{title}/CFR-{year}-title-{title}.zip",
      linkTemplate: "https://www.ecfr.gov/current/title-{title}/part-{part}",
      requestCount: 2,
      editionYear: shard.editionYear,
      revisedAsOfText: shard.revisedAsOfText,
      volumes: shard.volumes,
    };
  }
  if (path.startsWith("usc/")) {
    const shard = value as UscSourceCreditShard;
    return {
      ...base,
      id: "olrc-uslm",
      name: "Office of the Law Revision Counsel",
      urlTemplate:
        "https://uscode.house.gov/download/releasepoints/us/pl/119/136/xml_usc25@119-136.zip",
      linkTemplate: "https://uscode.house.gov/view.xhtml?req={section}",
      releasePoint: shard.releasePoint,
      publicationName: shard.publicationName,
      currentThroughText: shard.currentThroughText,
      upstreamSha256: "0".repeat(64),
      upstreamBytes: 1000,
    };
  }
  return {
    ...base,
    id: "federal-register-api",
    name: "Federal Register API, agencies",
    urlTemplate: "https://www.federalregister.gov/api/v1/agencies",
    linkTemplate: "https://www.federalregister.gov/agencies/{id}",
  };
}

export interface FixtureFile {
  path: string;
  value: unknown;
  /** Bytes to write instead of the canonical bytes of value. */
  bytes?: Buffer;
  status?: IndexFile["status"];
  /** Changes to the manifest entry after it is filled in. */
  entry?: Partial<IndexFile>;
}

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

/** Write a demo-data directory: the files, then a manifest that lists them. */
export function writeIndex(
  dir: string,
  files: FixtureFile[] = [],
  tweak?: (manifest: IndexManifest) => void,
): IndexManifest {
  mkdirSync(dir, { recursive: true });
  const manifest = initialManifest({
    generatedAt: RETRIEVED,
    patternSetVersion: PATTERN_SET_VERSION,
    verbatimFields: VERBATIM_FIELDS,
  });
  for (const file of files) {
    const canonical = shardBytes(file.value);
    const bytes = file.bytes ?? canonical;
    mkdirSync(dirname(join(dir, file.path)), { recursive: true });
    writeFileSync(join(dir, file.path), bytes);
    const entry = manifest.files.find((f) => f.path === file.path);
    if (!entry) continue;
    const value = file.value as { entries?: unknown[] };
    Object.assign(entry, {
      status: file.status ?? "current",
      sha256: sha256(canonical),
      sizeBytes: canonical.length,
      entryCount: value.entries?.length ?? 0,
      source: sourceFor(file.path, file.value),
      ...file.entry,
    });
  }
  tweak?.(manifest);
  writeFileSync(join(dir, "manifest.json"), manifestBytes(manifest));
  return manifest;
}

const temps: string[] = [];
export function tempDir(prefix = "ps-demo-index-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}
export function removeTemps(): void {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
}

/**
 * The committed recognition structure fixture plus `extra` synthetic entries
 * ("Synthetic Probe Entity 001"), written to a temp file. G3 needs all 575
 * before any index file may be acquired or validated.
 */
export function probeFile(extra = 575): string {
  const added = Array.from(
    { length: extra },
    (_, i) =>
      `<p class="flush-paragraph flush-paragraph-1" id="p-synthetic-${i}">Synthetic Probe Entity ${String(i).padStart(3, "0")}</p>`,
  );
  const html = readFileSync(DEFAULT_PROBE_FIXTURE, "utf8").replace(
    "</body>",
    [...added, "</body>"].join("\n"),
  );
  const file = join(tempDir(), "recognition-notice.html");
  writeFileSync(file, html);
  return file;
}

/** A zip archive of the given files, stored or deflated. */
export function makeZip(
  files: { name: string; data: Buffer; deflate?: boolean }[],
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const body = file.deflate ? deflateRawSync(file.data) : file.data;
    const method = file.deflate ? 8 : 0;
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
