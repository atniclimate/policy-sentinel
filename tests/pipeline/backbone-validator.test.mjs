import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BackboneValidationError,
  extractMarkdownDestinations,
  parseArguments,
  validateBackbone,
  validateMarkdownLinks,
  validateSchemaGraph,
} from "../../scripts/validate-backbone.mjs";

const DIALECT = "https://json-schema.org/draft/2020-12/schema";

const writeJson = (filePath, value) =>
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const withRepository = async (callback) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-backbone-"),
  );
  try {
    await mkdir(path.join(repositoryRoot, "schemas"), { recursive: true });
    await callback(repositoryRoot);
  } finally {
    await rm(repositoryRoot, { force: true, recursive: true });
  }
};

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

test("excludes the preserved owner packet from canonical link validation", async () => {
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

    const result = await validateMarkdownLinks(repositoryRoot);

    assert.deepEqual(result, { localLinks: 0, markdownFiles: 1 });
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
