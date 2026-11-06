// @vitest-environment node
// src/demo/copy.ts is a thin re-export shim over src/demo/copy/<area>.ts. These
// checks guard the split itself: each area's slice must still be the exact
// object merged into COPY, and the areas step 9 (tracking.ts) and the source
// and Grants.gov strings land in their own files, not the aggregator.
import { describe, expect, it } from "vitest";
import { COPY, EXAMPLES, namesItsKind } from "../../src/demo/copy";
import { capability } from "../../src/demo/copy/sources";
import { documentCopy } from "../../src/demo/copy/document";
import { frame } from "../../src/demo/copy/frame";
import { grants, grantsDatesSkipped } from "../../src/demo/copy/grants";
import { issues } from "../../src/demo/copy/issues";
import { report } from "../../src/demo/copy/report";
import { results } from "../../src/demo/copy/results";
import { search } from "../../src/demo/copy/search";
import {
  namesItsKind as sharedNamesItsKind,
  ordinal,
} from "../../src/demo/copy/shared";
import { follow } from "../../src/demo/copy/tracking";

describe("copy area split", () => {
  it("merges each area's own object into COPY by reference, unchanged", () => {
    expect(COPY.capability).toBe(capability);
    expect(COPY.grants).toBe(grants);
    expect(COPY.grantsDatesSkipped).toBe(grantsDatesSkipped);
    expect(COPY.follow).toBe(follow);
    for (const key of Object.keys(frame) as (keyof typeof frame)[])
      expect(COPY[key]).toBe(frame[key]);
    for (const key of Object.keys(search) as (keyof typeof search)[])
      expect(COPY[key]).toBe(search[key]);
    for (const key of Object.keys(results) as (keyof typeof results)[])
      expect(COPY[key]).toBe(results[key]);
    for (const key of Object.keys(issues) as (keyof typeof issues)[])
      expect(COPY[key]).toBe(issues[key]);
    for (const key of Object.keys(report) as (keyof typeof report)[])
      expect(COPY[key]).toBe(report[key]);
    for (const key of Object.keys(
      documentCopy,
    ) as (keyof typeof documentCopy)[])
      expect(COPY[key]).toBe(documentCopy[key]);
  });

  it("keeps the Grants.gov and source-capability strings out of the aggregator and in their own files", () => {
    expect(capability["federal-register"]).toMatch(/Topic search/);
    expect(grants.attribution).toMatch(/Grants\.gov API/);
    expect(grantsDatesSkipped).toMatch(/Grants\.gov was not searched/);
  });

  it("keeps the following (tracking) strings in copy/tracking.ts for the Wave 2 lane that edits them", () => {
    expect(follow.title).toBe("Following");
    expect(COPY.follow).toBe(follow);
  });

  it("re-exports namesItsKind and the helpers it shares with results.ts unchanged", () => {
    expect(namesItsKind).toBe(sharedNamesItsKind);
    expect(namesItsKind("Docket", "Docket No. 1")).toBe(true);
    expect(namesItsKind("Docket", "1")).toBe(false);
    expect(ordinal(1)).toBe("st");
    expect(ordinal(11)).toBe("th");
    expect(ordinal(112)).toBe("th");
  });

  it("keeps EXAMPLES in the shim, with every entry naming a real source and query", () => {
    expect(EXAMPLES.length).toBeGreaterThan(0);
    for (const example of EXAMPLES) {
      expect(example.source.length).toBeGreaterThan(0);
      expect(example.query.length).toBeGreaterThan(0);
      expect(example.label.length).toBeGreaterThan(0);
    }
  });

  it("names 0.10.0 and 0.10.1 as earlier demo builds in the status line, without touching demo/main.tsx", () => {
    expect(COPY.statusLine("0.9.1")).toMatch(
      /0\.10\.0 and 0\.10\.1 were earlier demo builds/,
    );
  });
});
