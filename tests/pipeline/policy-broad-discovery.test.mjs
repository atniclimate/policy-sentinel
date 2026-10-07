import assert from "node:assert/strict";
import test from "node:test";
import {
  selectWashingtonChapterCandidates,
  selectWashingtonSessionLaw,
  assertWashingtonBillHeader,
} from "../../src/pipeline/policy-broad-discovery.mjs";
import * as intakeDiscovery from "../../src/modules/intake/sources/washington-legislature/discovery.mjs";

test("legacy discovery imports preserve the intake functions and export surface", async () => {
  const legacy = await import("../../src/pipeline/policy-broad-discovery.mjs");
  assert.deepEqual(
    Object.keys(legacy).sort(),
    Object.keys(intakeDiscovery).sort(),
  );
  for (const name of Object.keys(legacy)) {
    assert.strictEqual(legacy[name], intakeDiscovery[name]);
  }
});
const fixture = () => ({
  text: "2025 Regular Session",
  links: Array.from({ length: 200 }, (_, i) => ({
    text: `Chapter ${i + 1}`,
    sourceLocator: `/a[${i + 1}]`,
    url: `https://lawfilesext.leg.wa.gov${i === 0 ? "/biennium//2025-26/Pdf/Initiatives/Initiatives/INITIATIVE%202066.SL.pdf" : i === 1 ? "/biennium/2025-26/Pdf/Bills/Session%20Laws/House/2025SALARYSCHEDULE.SL.pdf" : `/biennium/2025-26/Pdf/Bills/Session%20Laws/House/${1000 + i}.SL.pdf`}`,
  })),
});
test("printed bill headers bind substitute variants separately from engrossment", () => {
  const candidate = { chamber: "house", bill: "1002", variant: "-S2" };
  assertWashingtonBillHeader(
    candidate,
    "ENGROSSED SECOND SUBSTITUTE HOUSE BILL 1002",
  );
  assertWashingtonBillHeader(
    { ...candidate, variant: "-S" },
    "SUBSTITUTE HOUSE BILL 1002",
  );
  assertWashingtonBillHeader(
    { ...candidate, variant: "" },
    "ENGROSSED HOUSE BILL 1002",
  );
  for (const header of [
    "SUBSTITUTE HOUSE BILL 1002",
    "HOUSE BILL 1002",
    "SECOND SUBSTITUTE SENATE BILL 1002",
    "SECOND SUBSTITUTE HOUSE BILL 1003",
    "See SECOND SUBSTITUTE HOUSE BILL 1002",
  ])
    assert.throws(
      () => assertWashingtonBillHeader(candidate, header),
      /PRINTED_BILL_VARIANT_CONTRADICTION/,
    );
});
test("chapter selection excludes non-bills and binds complete, unique numeric work routes", () => {
  const selected = selectWashingtonChapterCandidates(fixture());
  assert.equal(selected.selected.length, 198);
  assert.equal(selected.exclusions.length, 2);
  const missing = fixture();
  missing.links.pop();
  assert.throws(
    () => selectWashingtonChapterCandidates(missing),
    /MISSING_OR_DUPLICATE/,
  );
  const misleading = fixture();
  misleading.links[2].url = misleading.links[1].url;
  assert.throws(
    () => selectWashingtonChapterCandidates(misleading),
    /UNSUPPORTED_CHAPTER_BILL_PATH/,
  );
  const unsafe = fixture();
  unsafe.links[3].url = "https://attacker.example/1003.SL.pdf";
  assert.throws(
    () => selectWashingtonChapterCandidates(unsafe),
    /UNREVIEWED_CHAPTER_URL/,
  );
});
test("session-law selection uses advertised exact variants and does not synthesize HTML targets", () => {
  const candidate = selectWashingtonChapterCandidates(fixture()).selected[0];
  const url =
    "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/Session%20Laws/House/1002.SL.htm";
  const link = {
    url,
    sourceLocator: "model.documents[0].path",
    sourceMetadata: {
      documentClass: "Bills",
      documentType: "Session Laws",
      biennium: "2025-26",
    },
  };
  assert.equal(
    selectWashingtonSessionLaw(candidate, { links: [link] }).bodyUrl,
    url,
  );
  assert.throws(
    () => selectWashingtonSessionLaw(candidate, { links: [] }),
    /MISSING_OR_AMBIGUOUS/,
  );
  assert.throws(
    () => selectWashingtonSessionLaw(candidate, { links: [link, link] }),
    /MISSING_OR_AMBIGUOUS/,
  );
  assert.throws(
    () =>
      selectWashingtonSessionLaw(
        { ...candidate, variant: "-S" },
        { links: [link] },
      ),
    /MISSING_OR_AMBIGUOUS/,
  );
  assert.throws(
    () =>
      selectWashingtonSessionLaw(candidate, {
        links: [
          {
            ...link,
            sourceMetadata: {
              ...link.sourceMetadata,
              name: "Session Law C 99 L 25",
            },
          },
        ],
      }),
    /INVENTORY_CHAPTER_CONTRADICTION/,
  );
});
