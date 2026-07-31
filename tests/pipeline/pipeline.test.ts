import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("pipeline contract and governance suite passes", () => {
  const output = execFileSync(
    process.execPath,
    ["--test", "tests/pipeline/pipeline.test.mjs"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
  expect(output).toMatch(/\btests \d+\b/);
  expect(output).toMatch(/\bpass \d+\b/);
  expect(output).toMatch(/\bfail 0\b/);
});
