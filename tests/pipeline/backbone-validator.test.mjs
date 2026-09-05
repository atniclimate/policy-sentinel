import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import runOneCustody from "../../docs/development/ps09-run-01-custody.json" with { type: "json" };
import { PRESERVED_OWNER_DIRECTION_INPUT_SHA256 } from "../../scripts/owner-input-custody.mjs";

import {
  BackboneValidationError,
  extractRawHtmlTags,
  extractMarkdownDestinations,
  isExcludedOwnerInputDependency,
  matchesOwnerInputCustody,
  parseArguments,
  validateBackbone,
  validateMarkdownLinks,
  validateMarkdownLinksWithOwnerManifest,
  validateSchemaGraph,
} from "../../scripts/validate-backbone.mjs";

const DIALECT = "https://json-schema.org/draft/2020-12/schema";

test("Run 1 custody inventory and exclusion identities agree without requiring local owner inputs", () => {
  const rows = runOneCustody.ownerInputs;
  assert.equal(rows.length, 33);
  assert.equal(new Set(rows.map((row) => row.path.toLowerCase())).size, 33);
  assert.deepEqual(
    Object.fromEntries(rows.map((row) => [row.path, row.sha256])),
    PRESERVED_OWNER_DIRECTION_INPUT_SHA256,
  );
  for (const row of rows) {
    assert.equal(row.filename, path.posix.basename(row.path));
    assert.match(row.path, /^docs\/[^/\\]+$/u);
    assert.match(row.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(row.byteLength) && row.byteLength > 0);
  }
  const csv = rows.filter((row) => row.path.endsWith(".csv"));
  assert.equal(csv.length, 1);
  assert.equal(csv[0].path, "docs/policy-sentinel-selected-records.csv");
  assert.equal(csv[0].byteLength, 2409);
  assert.equal(rows.filter((row) => row.path !== csv[0].path).length, 32);
});

const writeJson = (filePath, value) =>
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const runGit = (repositoryRoot, arguments_) =>
  execFileSync("git", ["-C", repositoryRoot, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

const withRepository = async (callback) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-backbone-"),
  );
  try {
    await mkdir(path.join(repositoryRoot, "schemas"), { recursive: true });
    runGit(repositoryRoot, ["init", "--quiet"]);
    runGit(repositoryRoot, ["config", "user.name", "Policy Sentinel Test"]);
    runGit(repositoryRoot, [
      "config",
      "user.email",
      "policy-sentinel-test@example.invalid",
    ]);
    runGit(repositoryRoot, [
      "commit",
      "--allow-empty",
      "--quiet",
      "--message",
      "fixture root",
    ]);
    await callback(repositoryRoot);
  } finally {
    await rm(repositoryRoot, { force: true, recursive: true });
  }
};

const withGitRepository = withRepository;

const ownerInputFixture =
  "[Owner input with an intentionally absent target](not-canonical.md)\n";
const ownerInputPath = "docs/00-READ-FIRST.md";
const ownerInputManifest = new Map([
  [
    ownerInputPath,
    createHash("sha256").update(ownerInputFixture).digest("hex"),
  ],
]);

const baseSchema = {
  $schema: DIALECT,
  $id: "https://policy-sentinel.invalid/schemas/base.schema.json",
  $defs: {
    identifier: {
      type: "string",
    },
  },
  type: "object",
};

test("validates schema resources, references, and untracked Markdown links", async () => {
  await withRepository(async (repositoryRoot) => {
    await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
    await writeJson(path.join(repositoryRoot, "schemas", "base.schema.json"), {
      ...baseSchema,
      properties: {
        id: { $ref: "#/$defs/identifier" },
      },
    });
    await writeJson(
      path.join(repositoryRoot, "schemas", "consumer.schema.json"),
      {
        $schema: DIALECT,
        $id: "https://policy-sentinel.invalid/schemas/consumer.schema.json",
        $ref: `${baseSchema.$id}#/$defs/identifier`,
      },
    );
    await writeFile(
      path.join(repositoryRoot, "README.md"),
      [
        "# Fixture",
        "",
        "[Guide](docs/guide.md)",
        "[External](https://example.invalid/not-fetched)",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(repositoryRoot, "docs", "guide.md"),
      "[Schema](../schemas/base.schema.json#/$defs/identifier)\n",
      "utf8",
    );

    const result = await validateBackbone(repositoryRoot);

    assert.deepEqual(result.schema, {
      references: 2,
      schemaFiles: 2,
      schemaIds: 2,
    });
    assert.deepEqual(result.markdown, {
      localLinks: 2,
      markdownFiles: 2,
    });
  });
});

test("binds an owner-input exemption to exact bytes and untracked custody", () => {
  const repositoryRelativePath = "docs/00-READ-FIRST.md";
  const fileContents = Buffer.from("preserved owner direction\n", "utf8");
  const expectedSha256 =
    "bcd0059bd991adf781a0e95411190fb8bd1098518ee419fef636a7a6eb85d618";

  assert.equal(
    matchesOwnerInputCustody({
      expectedSha256,
      fileContents,
      repositoryRelativePath,
      untrackedPaths: new Set([repositoryRelativePath]),
    }),
    true,
  );
  assert.equal(
    matchesOwnerInputCustody({
      expectedSha256,
      fileContents: Buffer.from("changed owner direction\n", "utf8"),
      repositoryRelativePath,
      untrackedPaths: new Set([repositoryRelativePath]),
    }),
    false,
  );
  assert.equal(
    matchesOwnerInputCustody({
      expectedSha256,
      fileContents,
      repositoryRelativePath,
      untrackedPaths: new Set(),
    }),
    false,
  );
  assert.equal(
    matchesOwnerInputCustody({
      expectedSha256,
      fileContents,
      repositoryRelativePath,
      untrackedPaths: new Set(["docs/not-the-owner-input.md"]),
    }),
    false,
  );
});

test("rejects canonical dependencies on custody-exempt owner inputs", () => {
  const repositoryRelativeTarget = "docs/00-READ-FIRST.md";

  assert.equal(
    isExcludedOwnerInputDependency({
      excludedOwnerInputPaths: new Set([repositoryRelativeTarget]),
      repositoryRelativeTarget,
    }),
    true,
  );
  assert.equal(
    isExcludedOwnerInputDependency({
      excludedOwnerInputPaths: new Set([repositoryRelativeTarget]),
      repositoryRelativeTarget: "DOCS/00-read-first.MD",
    }),
    true,
  );
  assert.equal(
    isExcludedOwnerInputDependency({
      excludedOwnerInputPaths: new Set([repositoryRelativeTarget]),
      repositoryRelativeTarget: "docs/canonical.md",
    }),
    false,
  );
});

test("enforces owner-input Git custody end to end", async (t) => {
  await t.test("excludes only an exact untracked tuple", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, "README.md"),
        "# Canonical repository entry\n",
        "utf8",
      );
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        ownerInputFixture,
        "utf8",
      );

      const result = await validateMarkdownLinksWithOwnerManifest(
        repositoryRoot,
        ownerInputManifest,
      );

      assert.deepEqual(result, { localLinks: 0, markdownFiles: 1 });
    });
  });

  await t.test("validates altered untracked bytes", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        `${ownerInputFixture}altered\n`,
        "utf8",
      );

      await assert.rejects(
        validateMarkdownLinksWithOwnerManifest(
          repositoryRoot,
          ownerInputManifest,
        ),
        /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u,
      );
    });
  });

  await t.test("validates exact bytes after they enter the index", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        ownerInputFixture,
        "utf8",
      );
      runGit(repositoryRoot, ["add", "--", ownerInputPath]);

      await assert.rejects(
        validateMarkdownLinksWithOwnerManifest(
          repositoryRoot,
          ownerInputManifest,
        ),
        /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u,
      );
    });
  });

  await t.test("validates exact bytes after intent-to-add", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        ownerInputFixture,
        "utf8",
      );
      runGit(repositoryRoot, ["add", "--intent-to-add", "--", ownerInputPath]);

      await assert.rejects(
        validateMarkdownLinksWithOwnerManifest(
          repositoryRoot,
          ownerInputManifest,
        ),
        /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u,
      );
    });
  });

  await t.test(
    "validates exact bytes recreated after a staged deletion",
    async () => {
      await withGitRepository(async (repositoryRoot) => {
        await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
        await writeFile(
          path.join(repositoryRoot, ownerInputPath),
          ownerInputFixture,
          "utf8",
        );
        runGit(repositoryRoot, ["add", "--", ownerInputPath]);
        runGit(repositoryRoot, [
          "commit",
          "--quiet",
          "--message",
          "track reserved path",
        ]);
        runGit(repositoryRoot, ["rm", "--cached", "--", ownerInputPath]);

        await assert.rejects(
          validateMarkdownLinksWithOwnerManifest(
            repositoryRoot,
            ownerInputManifest,
          ),
          /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u,
        );
      });
    },
  );

  await t.test("validates exact bytes when Git ignores the path", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, ".gitignore"),
        `${ownerInputPath}\n`,
        "utf8",
      );
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        ownerInputFixture,
        "utf8",
      );

      await assert.rejects(
        validateMarkdownLinksWithOwnerManifest(
          repositoryRoot,
          ownerInputManifest,
        ),
        /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u,
      );
    });
  });

  await t.test("rejects a canonical inbound Markdown link", async () => {
    await withGitRepository(async (repositoryRoot) => {
      await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
      await writeFile(
        path.join(repositoryRoot, ownerInputPath),
        ownerInputFixture,
        "utf8",
      );
      await writeFile(
        path.join(repositoryRoot, "README.md"),
        `[Owner input](${ownerInputPath})\n`,
        "utf8",
      );

      await assert.rejects(
        validateMarkdownLinksWithOwnerManifest(
          repositoryRoot,
          ownerInputManifest,
        ),
        /README\.md links to a noncanonical preserved owner input/u,
      );
    });
  });
});

test("rejects raw HTML tags without misclassifying URI autolinks", async () => {
  assert.deepEqual(
    extractRawHtmlTags(
      [
        '<a href="docs/owner.md">Owner</a>',
        "<img src='images/owner.png'>",
        '<object data="docs/owner.md"></object>',
        '<form action="docs/owner.md"><button>Open</button></form>',
        '<div style="background:url(docs/owner.md)">Styled</div>',
        "<https://example.invalid/path>",
        '<!-- <a href="ignored.md">Ignored</a> -->',
        '`<a href="inline-code.md">Ignored</a>`',
        "```html",
        '<a href="fenced-code.md">Ignored</a>',
        "```",
      ].join("\n"),
    ),
    [
      '<a href="docs/owner.md">',
      "<img src='images/owner.png'>",
      '<object data="docs/owner.md">',
      '<form action="docs/owner.md">',
      "<button>",
      '<div style="background:url(docs/owner.md)">',
    ],
  );

  await withGitRepository(async (repositoryRoot) => {
    await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, ownerInputPath),
      ownerInputFixture,
      "utf8",
    );
    await writeFile(
      path.join(repositoryRoot, "README.md"),
      `<object data="${ownerInputPath}"></object>\n`,
      "utf8",
    );

    await assert.rejects(
      validateMarkdownLinksWithOwnerManifest(
        repositoryRoot,
        ownerInputManifest,
      ),
      /README\.md uses 1 raw HTML tag/u,
    );
  });
});

test("rejects symbolic-link aliases in inventory and link targets", async (t) => {
  await withRepository(async (repositoryRoot) => {
    await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "docs", "target.md"),
      "# Target\n",
      "utf8",
    );
    const aliasPath = path.join(repositoryRoot, "docs-alias");
    try {
      await symlink(path.join(repositoryRoot, "docs"), aliasPath, "junction");
    } catch (error) {
      if (["EACCES", "ENOSYS", "EPERM"].includes(error.code)) {
        t.skip(`symbolic-link creation is unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    await assert.rejects(
      validateMarkdownLinks(repositoryRoot),
      /symbolic link is not allowed in the authored Markdown tree/u,
    );
  });

  await withRepository(async (repositoryRoot) => {
    await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
    await mkdir(path.join(repositoryRoot, "node_modules"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "docs", "target.md"),
      "# Target\n",
      "utf8",
    );
    const aliasPath = path.join(repositoryRoot, "node_modules", "docs-alias");
    try {
      await symlink(path.join(repositoryRoot, "docs"), aliasPath, "junction");
    } catch (error) {
      if (["EACCES", "ENOSYS", "EPERM"].includes(error.code)) {
        t.skip(`symbolic-link creation is unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await writeFile(
      path.join(repositoryRoot, "README.md"),
      "[Aliased target](node_modules/docs-alias/target.md)\n",
      "utf8",
    );

    await assert.rejects(
      validateMarkdownLinks(repositoryRoot),
      /README\.md link traverses a symbolic link/u,
    );
  });
});

test("rejects Markdown hidden by an intentionally ignored tree", async (t) => {
  await t.test("tracked Markdown cannot escape inventory", async () => {
    await withGitRepository(async (repositoryRoot) => {
      const hiddenDirectory = path.join(repositoryRoot, "docs", "dist");
      await mkdir(hiddenDirectory, { recursive: true });
      await writeFile(
        path.join(hiddenDirectory, "tracked.md"),
        "[Missing](missing.md)\n",
        "utf8",
      );
      runGit(repositoryRoot, ["add", "--force", "--", "docs/dist/tracked.md"]);

      await assert.rejects(
        validateMarkdownLinks(repositoryRoot),
        /tracked Markdown is outside the authored inventory: docs\/dist\/tracked\.md/u,
      );
    });
  });

  await t.test(
    "fails closed when the tracked Git inventory becomes unavailable",
    async () => {
      await withGitRepository(async (repositoryRoot) => {
        const hiddenDirectory = path.join(repositoryRoot, "docs", "dist");
        const hiddenGitDirectory = path.join(
          repositoryRoot,
          "node_modules",
          "git-metadata",
        );
        await mkdir(hiddenDirectory, { recursive: true });
        await mkdir(path.dirname(hiddenGitDirectory), { recursive: true });
        await writeFile(
          path.join(hiddenDirectory, "tracked.md"),
          "[Missing](missing.md)\n",
          "utf8",
        );
        runGit(repositoryRoot, [
          "add",
          "--force",
          "--",
          "docs/dist/tracked.md",
        ]);
        await rename(path.join(repositoryRoot, ".git"), hiddenGitDirectory);

        await assert.rejects(
          validateMarkdownLinks(repositoryRoot),
          (error) =>
            error instanceof BackboneValidationError &&
            /cannot inventory repository Markdown/u.test(error.message),
        );
      });
    },
  );

  await t.test("canonical links cannot target unscanned Markdown", async () => {
    await withRepository(async (repositoryRoot) => {
      const hiddenDirectory = path.join(repositoryRoot, "docs", "dist");
      await mkdir(hiddenDirectory, { recursive: true });
      await writeFile(
        path.join(hiddenDirectory, "untracked.md"),
        "# Hidden input\n",
        "utf8",
      );
      await writeFile(
        path.join(repositoryRoot, "README.md"),
        "[Hidden input](docs/dist/untracked.md)\n",
        "utf8",
      );

      await assert.rejects(
        validateMarkdownLinks(repositoryRoot),
        /README\.md links to Markdown outside the canonical inventory/u,
      );
    });
  });
});

test("validates changed reserved paths even when Git reports them untracked", async () => {
  await withRepository(async (repositoryRoot) => {
    await mkdir(path.join(repositoryRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "README.md"),
      "# Canonical repository entry\n",
      "utf8",
    );
    await writeFile(
      path.join(repositoryRoot, "docs", "00-READ-FIRST.md"),
      "[Owner input with an intentionally absent target](not-canonical.md)\n",
      "utf8",
    );
    await writeFile(
      path.join(
        repositoryRoot,
        "docs",
        "12-CODEX-PNW-03-GEOGRAPHY-RIGHTS-IMPLEMENTATION-LONG-RUN.md",
      ),
      "[Later owner input with an intentionally absent target](also-not-canonical.md)\n",
      "utf8",
    );
    await writeFile(
      path.join(
        repositoryRoot,
        "docs",
        "13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md",
      ),
      "[Current owner input with an intentionally absent target](still-not-canonical.md)\n",
      "utf8",
    );
    await writeFile(
      path.join(
        repositoryRoot,
        "docs",
        "14-CODEX-PNW-05-SOURCE-PACK-CORE-LONG-RUN.md",
      ),
      "[Newest owner input with an intentionally absent target](not-a-canonical-link.md)\n",
      "utf8",
    );
    for (const ownerInput of [
      "14A-CODEX-PNW-05-SOURCE-PACK-CORE-CLOSEOUT.md",
      "15-CODEX-PNW-05-FEDERAL-REGISTER-DOC-REVIEW-MAX-LONG-RUN.md",
      "15A-PNW-05-SOURCE-CANDIDATE-QUALIFICATION-AND-AUTHORIZATION.md",
      "15B-CASE-EXAMPLE-01-LUMMI-POINT-ROBERTS-BROADBAND.md",
      "15C-CASE-EXAMPLE-02-ROADLESS-RULE-RESCISSION.md",
      "15D-PNW-05-CASE-EVIDENCE-CROSSWALK.md",
      "15E-PNW-05-TRIBAL-POLICY-CONTEXT-SOURCE-LANDSCAPE.md",
      "POLICY-SENTINEL-REAL-SOURCE-PRERELEASE-MAX-LONG-RUN.md",
    ]) {
      await writeFile(
        path.join(repositoryRoot, "docs", ownerInput),
        "[Preserved owner input](also-intentionally-not-canonical.md)\n",
        "utf8",
      );
    }

    await assert.rejects(
      validateMarkdownLinks(repositoryRoot),
      (error) =>
        error instanceof BackboneValidationError &&
        /docs\/00-READ-FIRST\.md has a missing local link: not-canonical\.md/u.test(
          error.message,
        ),
    );
  });
});

test("rejects duplicate JSON Schema IDs", async () => {
  await withRepository(async (repositoryRoot) => {
    await writeJson(
      path.join(repositoryRoot, "schemas", "first.schema.json"),
      baseSchema,
    );
    await writeJson(
      path.join(repositoryRoot, "schemas", "second.schema.json"),
      baseSchema,
    );

    await assert.rejects(
      validateSchemaGraph(repositoryRoot),
      (error) =>
        error instanceof BackboneValidationError &&
        /duplicate JSON Schema \$id/u.test(error.message),
    );
  });
});

test("rejects unresolved JSON Schema documents and pointers", async (t) => {
  await t.test("missing schema resource", async () => {
    await withRepository(async (repositoryRoot) => {
      await writeJson(
        path.join(repositoryRoot, "schemas", "base.schema.json"),
        {
          ...baseSchema,
          $ref: "https://policy-sentinel.invalid/schemas/missing.schema.json#/$defs/value",
        },
      );

      await assert.rejects(
        validateSchemaGraph(repositoryRoot),
        /references unknown schema resource/u,
      );
    });
  });

  await t.test("missing JSON Pointer", async () => {
    await withRepository(async (repositoryRoot) => {
      await writeJson(
        path.join(repositoryRoot, "schemas", "base.schema.json"),
        {
          ...baseSchema,
          $ref: "#/$defs/missing",
        },
      );

      await assert.rejects(
        validateSchemaGraph(repositoryRoot),
        /does not resolve at segment missing/u,
      );
    });
  });
});

test("rejects missing local Markdown links", async () => {
  await withRepository(async (repositoryRoot) => {
    await writeFile(
      path.join(repositoryRoot, "README.md"),
      "[Missing](docs/not-present.md)\n",
      "utf8",
    );

    await assert.rejects(
      validateMarkdownLinks(repositoryRoot),
      (error) =>
        error instanceof BackboneValidationError &&
        /README\.md has a missing local link: docs\/not-present\.md/u.test(
          error.message,
        ),
    );
  });
});

test("ignores fenced code, inline code, anchors, and external destinations", () => {
  const destinations = extractMarkdownDestinations(
    [
      "[Local](docs/guide.md)",
      "`[Inline](missing-inline.md)`",
      "```text",
      "[Fence](missing-fence.md)",
      "```",
      "[Anchor](#section)",
      "[External](https://example.invalid/path)",
    ].join("\n"),
  );

  assert.deepEqual(destinations, [
    "docs/guide.md",
    "#section",
    "https://example.invalid/path",
  ]);
});

test("parses the dependency-free CLI boundary", () => {
  assert.equal(parseArguments(["--root", "."]).help, false);
  assert.equal(parseArguments(["--root=."]).root, path.resolve("."));
  assert.equal(parseArguments(["--help"]).help, true);
  assert.throws(() => parseArguments(["--root"]), /requires a path/u);
  assert.throws(() => parseArguments(["--unknown"]), /unknown argument/u);
});
