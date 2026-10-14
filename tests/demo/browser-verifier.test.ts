// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const runner = fileURLToPath(
  new URL("../../scripts/verify-demo-browser.mjs", import.meta.url),
);

it("keeps browser-verifier failure and request controls network-free", () => {
  const output = execFileSync(
    process.execPath,
    [runner, "--self-test", "true"],
    { encoding: "utf8", timeout: 10_000, windowsHide: true },
  );
  expect(output).toContain(
    "PASS source/count, request guard and response/trigger controls; no browser or network opened.",
  );
});

it("refuses an existing output directory before changing earlier evidence", () => {
  const out = mkdtempSync(join(tmpdir(), "policy-sentinel-browser-verifier-"));
  try {
    writeFileSync(join(out, "receipt.json"), "earlier receipt");
    writeFileSync(join(out, "desktop-1280.png"), "earlier screenshot");
    const result = spawnSync(
      process.execPath,
      [
        runner,
        "--url",
        "http://127.0.0.1:1",
        "--out",
        out,
        "--fail-probe",
        "true",
      ],
      { encoding: "utf8", timeout: 10_000, windowsHide: true },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain("EEXIST");
    expect(readFileSync(join(out, "receipt.json"), "utf8")).toBe(
      "earlier receipt",
    );
    expect(readFileSync(join(out, "desktop-1280.png"), "utf8")).toBe(
      "earlier screenshot",
    );
  } finally {
    rmSync(join(out, "receipt.json"), { force: true });
    rmSync(join(out, "desktop-1280.png"), { force: true });
    rmdirSync(out);
  }
});
