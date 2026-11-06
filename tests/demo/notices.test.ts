// @vitest-environment node
// T1.8: the third-party notices are served with the page as plain text.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { privacy } from "../../src/demo/copy/privacy";

// A computed specifier: the script is plain JavaScript with no declaration file.
const { copyThirdPartyNotices, NOTICES_SOURCE, NOTICES_TARGET } = (await import(
  pathToFileURL(resolve("scripts/copy-third-party-notices.mjs")).href
)) as {
  copyThirdPartyNotices: (root?: string) => string;
  NOTICES_SOURCE: string;
  NOTICES_TARGET: string;
};

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("third-party notices copy", () => {
  it("copies the notices byte for byte, CRLF and non-ASCII kept", () => {
    const root = mkdtempSync(join(tmpdir(), "ps-notices-"));
    made.push(root);
    const bytes = Buffer.concat([
      Buffer.from("# Notices\r\n\r\nCopyright © Example — MIT\n", "utf8"),
      Buffer.from([0xef, 0xbb, 0xbf]),
    ]);
    writeFileSync(join(root, NOTICES_SOURCE), bytes);
    const written = copyThirdPartyNotices(root);
    expect(written).toBe(join(root, NOTICES_TARGET));
    expect(readFileSync(written).equals(bytes)).toBe(true);
  });

  it("fails loudly when the notices file is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "ps-notices-"));
    made.push(root);
    expect(() => copyThirdPartyNotices(root)).toThrow();
  });

  it("targets a plain-text file in the Pages folder, which serves files as they are", () => {
    expect(NOTICES_TARGET).toBe("docs/THIRD-PARTY-NOTICES.txt");
    expect(readFileSync("docs/.nojekyll")).toBeDefined();
    expect(readFileSync(NOTICES_SOURCE, "utf8")).toMatch(
      /^# Third-party notices/,
    );
    expect(privacy.noticesHref).toBe("./THIRD-PARTY-NOTICES.txt");
  });
});

describe("privacy copy", () => {
  it("names the official services and says they keep their own logs", () => {
    const text = privacy.searchWordsSent([
      "Federal Register",
      "GovInfo",
      "Grants.gov",
    ]);
    expect(text).toContain("Federal Register, GovInfo and Grants.gov.");
    expect(text).toContain("Those services keep their own logs.");
    expect(text).toContain("never in the page address");
    expect(privacy.searchWordsSent(["GovInfo"])).toContain("search: GovInfo.");
    expect(privacy.searchWordsSent([])).toContain("keep their own logs");
  });

  it("avoids the design rule 2 words", () => {
    const all = [
      privacy.searchWordsSent(["A", "B"]),
      privacy.searchWordsSent([]),
      privacy.noticesLink,
    ].join(" ");
    expect(all).not.toMatch(
      /\b(?:governs|applies|applicable|implements|authorizes|authorized by|under|eligible|eligibility|valid|binding|jurisdiction|good law|overrule|enacted by|supporting legislation|the law behind)\b/i,
    );
  });
});
