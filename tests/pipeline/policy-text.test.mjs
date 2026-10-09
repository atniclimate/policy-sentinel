import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import {
  extractPolicyText,
  POLICY_TEXT_PARSER,
} from "../../src/pipeline/policy-text.mjs";

const fr = (body, options = {}) =>
  extractPolicyText({
    bytes: Buffer.from(
      `<!doctype html><html><head><title>Authored test rule</title></head><body>${body}</body></html>`,
    ),
    mediaType: "text/html; charset=UTF-8",
    sourceKind: "govinfo_fr",
    url: "https://www.govinfo.gov/content/pkg/FR-2025-01-01/html/2025-12345.htm",
    expectedIdentity: "2025-12345",
    ...options,
  });
const bill = (body, options = {}) =>
  extractPolicyText({
    bytes: Buffer.from(body),
    mediaType: "text/html",
    sourceKind: "washington_bill",
    url: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1234.htm",
    expectedIdentity: "HB 1234",
    ...options,
  });

test("short historical FR serials require exact identity and reject mixed documents", () => {
  const options = { expectedIdentity: "01-726" };
  const short = fr(
    "<pre>[FR Doc No: 01-726]\n\nAuthored test rule.</pre>",
    options,
  );
  assert.notEqual(short.parser.configDigest, POLICY_TEXT_PARSER.configDigest);
  assert.equal(
    short.parser.configDigest,
    fr("<pre>[FR Doc No: 01-726]\n\nAuthored test rule.</pre>", options).parser
      .configDigest,
  );
  const omitted = fr("<pre>[FR Doc No: 01-726]\n\nAuthored test rule.</pre>", {
    ...options,
    excludedBlockLocators: ["/html[1]/body[1]/pre[1]/paragraph[2]"],
  });
  assert.notEqual(short.parser.configDigest, omitted.parser.configDigest);
  assert.equal(
    fr("<pre>[FR Doc No: 01-726]\n\nAuthored test rule.</pre>", options)
      .identity.matched,
    true,
  );
  assert.throws(() => fr("<pre>[FR Doc No: 01-7260]</pre>", options));
  assert.throws(
    () => fr("<pre>[FR Doc No: 01-726]\n\n[FR Doc No: 01-7]</pre>", options),
    { code: "AMBIGUOUS_SOURCE_IDENTITY" },
  );
  for (const id of ["1-726", "001-726", "01-", "01-1234567"])
    assert.throws(
      () => fr(`<pre>[FR Doc No: ${id}]</pre>`, { expectedIdentity: id }),
      { code: "INVALID_EXPECTED_IDENTITY" },
    );
});

test("Presidential frontmatter permits only bounded NUL printing controls before its page and order heading", () => {
  const header =
    "[Federal Register Volume 90 (Wednesday, January 1, 2025)]\n[Presidential Documents]\n[FR Doc No: 2025-12345]\nPresidential\u0000 Documents\n\u0000 \u0000\n[[Page 10]]\nExecutive Order 99999 of January 1, 2025\n\n";
  const value = fr(`<pre>${header}The agency shall review.</pre>`);
  assert.equal(
    value.exclusions
      .filter((x) => x.reason === "source_nul_delimiter")
      .reduce((sum, x) => sum + x.count, 0),
    3,
  );
  assert.ok(value.text.includes("agency shall review"));
  for (const modified of [
    header.replace("[Presidential Documents]", "[Rules]"),
    header.replace(
      "Presidential\u0000 Documents",
      "Presidential\u0001 Documents",
    ),
    header + "A\u0000B",
    header.replace(
      "Presidential\u0000 Documents",
      `Presidential${"\u0000".repeat(33)} Documents`,
    ),
  ]) {
    assert.throws(() => fr(`<pre>${modified}The agency shall review.</pre>`), {
      code: "CONTROL_CHARACTER",
    });
  }
});

test("preformatted official text has deterministic UTF8 blocks and literal source labels", () => {
  const markup =
    "<pre>AGENCY: Authored test agency.\n\nACTION: Final rule.\n\nThe café council shall review the application.\nContinuation line.\n\n[FR Doc. 2025-12345 Filed 1-1-25; 8:45 am]</pre>";
  const first = fr(markup);
  assert.deepEqual(first, fr(markup));
  assert.deepEqual(first.parser, POLICY_TEXT_PARSER);
  assert.equal(first.blocks.length, 4);
  for (const block of first.blocks)
    assert.equal(
      Buffer.from(first.text)
        .subarray(block.startByte, block.endByte)
        .toString("utf8"),
      block.text,
    );
  assert.ok(first.blocks[2].text.includes("café"));
  assert.ok(first.blocks[2].text.includes("\nContinuation"));
  assert.equal(
    first.sourceMetadataCandidates.find((entry) => entry.field === "action")
      .value,
    "Final rule.",
  );
  assert.ok(Object.isFrozen(first.blocks[0].locator));
});

test("active, hidden and chrome text is absent and only advertised HTTPS anchors survive", () => {
  const value = fr(
    '<header>Official site navigation</header><script>throw new Error("execute");</script><main><h1>Review procedure</h1><p hidden>Hidden instruction</p><p>FR Doc. 2025-12345</p><p>Review <a href="../other.htm">the official source</a>. <a href="javascript:alert(1)">unsafe</a><a href="http://example.gov/">insecure</a><a href="https://127.0.0.1/">local</a></p><iframe src="https://example.gov">embedded</iframe><footer>Footer contact</footer></main>',
  );
  assert.ok(
    !/navigation|throw|Hidden instruction|embedded|Footer/.test(value.text),
  );
  assert.deepEqual(
    value.links.map((link) => link.url),
    ["https://www.govinfo.gov/content/pkg/FR-2025-01-01/other.htm"],
  );
  assert.deepEqual(value.blocks.at(-1).locator.headingPath, [
    "Review procedure",
  ]);
});

test("reviewed omissions bind the parser recipe, reject stale locators and preserve exact surviving bytes", () => {
  const body =
    "<p>FR Doc. 2025-12345</p><p>Authored synthetic reproduction to omit.</p><p>The council shall review.</p>";
  const full = fr(body);
  const omitted = fr(body, {
    excludedBlockLocators: ["/html[1]/body[1]/p[2]"],
  });
  assert.notEqual(full.parser.configDigest, omitted.parser.configDigest);
  assert.ok(!omitted.text.includes("reproduction"));
  assert.equal(omitted.blocks.length, 2);
  assert.equal(
    Buffer.from(omitted.text)
      .subarray(omitted.blocks[1].startByte, omitted.blocks[1].endByte)
      .toString(),
    "The council shall review.",
  );
  assert.throws(() => fr(body, { excludedBlockLocators: ["/missing[1]"] }), {
    code: "REVIEWED_EXCLUSION_LOCATOR_MISSING",
  });
  assert.throws(
    () => fr(body, { excludedBlockLocators: ["/html[1]/body[1]/p[1]"] }),
    { code: "SOURCE_IDENTITY_MISMATCH" },
  );
});

test("reviewed omissions remove nested link text from serialized extraction", () => {
  const omitted = fr(
    '<p>FR Doc. 2025-12345</p><p><span><a href="https://www.govinfo.gov/omitted">OMITTED_TEST_EXPRESSION</a></span></p><p>The council shall <a href="https://www.govinfo.gov/retained">review</a>.</p>',
    { excludedBlockLocators: ["/html[1]/body[1]/p[2]"] },
  );
  assert.ok(!JSON.stringify(omitted).includes("OMITTED_TEST_EXPRESSION"));
  assert.deepEqual(
    omitted.links.map((link) => link.url),
    ["https://www.govinfo.gov/retained"],
  );
  assert.ok(
    omitted.exclusions.some(
      (entry) => entry.reason === "reviewed_reuse_omission",
    ),
  );
});

test("reviewed preformatted omissions conservatively exclude that container's links", () => {
  const omitted = fr(
    '<p>FR Doc. 2025-12345</p><pre>Keep this paragraph.\n\n<a href="https://www.govinfo.gov/omitted">OMITTED_TEST_EXPRESSION</a></pre><p>The council shall review.</p>',
    { excludedBlockLocators: ["/html[1]/body[1]/pre[1]/paragraph[2]"] },
  );
  assert.ok(!JSON.stringify(omitted).includes("OMITTED_TEST_EXPRESSION"));
  assert.deepEqual(omitted.links, []);
  assert.ok(omitted.text.includes("Keep this paragraph."));
});

test("reviewed text-run omissions exclude links whose DOM locators have no text-run suffix", () => {
  const omitted = fr(
    '<p>FR Doc. 2025-12345</p><a href="https://www.govinfo.gov/omitted">OMITTED_TEST_EXPRESSION</a><p>The council shall review.</p>',
    { excludedBlockLocators: ["/html[1]/body[1]/text-run[1]"] },
  );
  assert.ok(!JSON.stringify(omitted).includes("OMITTED_TEST_EXPRESSION"));
  assert.deepEqual(omitted.links, []);
  assert.ok(omitted.text.includes("The council shall review."));
});

test("legacy Washington underline separators preserve anchored bill headers", () => {
  const text = bill(
    "<center><font>________________<br><b>HOUSE BILL 1234</b><br>________________</font></center><p>Read first time.</p>",
  );
  assert.ok(text.identity.sourceValue.includes("HOUSE BILL 1234"));
  assert.throws(() => bill("<p>Some narrative cites HOUSE BILL 1234</p>"), {
    code: "SOURCE_IDENTITY_MISMATCH",
  });
});

test("contact sections and precise location blocks are removed without publishing removed text", () => {
  const value = fr(
    "<pre>FR Doc. 2025-12345\n\nFOR FURTHER INFORMATION CONTACT: Test Person.\n\nOther Person, (202) 555-0142; test@example.gov.\n\nSUPPLEMENTARY INFORMATION: The board shall hold a public hearing.\n\nParcel ID: 123-456-789.\n\nCoordinates: 47.12345, -122.12345.\n\nApplicants may request review.</pre>",
  );
  assert.ok(
    !/Test Person|Other Person|555|example.gov|123-456|47.12345/.test(
      JSON.stringify(value),
    ),
  );
  assert.ok(value.text.includes("shall hold a public hearing"));
  assert.ok(value.text.includes("Applicants may request review."));
  assert.equal(
    value.exclusions.filter(
      (entry) => entry.reason === "personal_contact_section",
    ).length,
    2,
  );
  assert.equal(
    value.exclusions.filter(
      (entry) => entry.reason === "prohibited_location_block",
    ).length,
    2,
  );
});

test("bill insertions and deletions remain distinct explicit source markup, including style", () => {
  const value = bill(
    '<h1>HOUSE BILL 1234</h1><p>Sec. 1. The board <strike>may</strike> <u>shall</u> review.</p><p><span style="text-decoration:line-through">Before</span><span style="text-decoration: underline">After</span></p>',
  );
  assert.ok(
    value.text.includes(
      "[[DELETION]]may[[/DELETION]] [[INSERTION]]shall[[/INSERTION]]",
    ),
  );
  assert.ok(
    value.text.includes(
      "[[DELETION]]Before[[/DELETION]][[INSERTION]]After[[/INSERTION]]",
    ),
  );
  assert.ok(
    value.warnings.includes("amendment_markup_preserved_as_explicit_markers"),
  );
});

test("multi-component statutory citations are not decimal coordinates, while standalone coordinates stay excluded", () => {
  const value = bill(
    "<h1>HOUSE BILL 1234</h1><p>AN ACT amending RCW 12A.13.4567, 98.765.432; and RCW 18.104.043, 18.104.060.</p><p>A point: 47.12345, -122.12345.</p>",
  );
  assert.ok(value.text.includes("12A.13.4567, 98.765.432"));
  assert.ok(value.text.includes("18.104.043, 18.104.060"));
  assert.ok(!value.text.includes("47.12345"));
});

test("well-formed XML uses same extracted rendition and preserves structural headings", () => {
  const value = bill(
    '<?xml version="1.0" encoding="UTF-8"?><Bill><BillHeading>HOUSE BILL 1234</BillHeading><BillSection><SectionCaption>Review</SectionCaption><Paragraph>The board &amp; council <ins>shall</ins> consult.</Paragraph></BillSection></Bill>',
    { mediaType: "application/xml" },
  );
  assert.ok(
    value.text.includes("board & council [[INSERTION]]shall[[/INSERTION]]"),
  );
  assert.deepEqual(value.blocks.at(-1).locator.headingPath, [
    "HOUSE BILL 1234",
    "Review",
  ]);
});

test("XML rejects DTD, XXE, custom entities, malformed markup and processing instructions", () => {
  for (const markup of [
    '<!DOCTYPE Bill SYSTEM "https://example.gov/evil.dtd"><Bill>HOUSE BILL 1234</Bill>',
    '<!DOCTYPE Bill [<!ENTITY x SYSTEM "file:///secret">]><Bill>HOUSE BILL 1234 &x;</Bill>',
    "<Bill>HOUSE BILL 1234 &unknown;</Bill>",
    "<Bill>HOUSE BILL 1234</Other>",
    '<?xml-stylesheet href="https://example.gov/x"?><Bill>HOUSE BILL 1234</Bill>',
  ])
    assert.throws(() => bill(markup, { mediaType: "application/xml" }));
  assert.throws(
    () =>
      fr('<!DOCTYPE html [<!ENTITY x "bad">]><p>FR Doc. 2025-12345 &x;</p>'),
    { code: "DTD_ENTITY_FORBIDDEN" },
  );
});

test("wrong source identity and HTML200 error bodies fail closed", () => {
  assert.throws(() => fr("<p>FR Doc. 2025-99999</p>"), {
    code: "AMBIGUOUS_SOURCE_IDENTITY",
  });
  assert.throws(() => fr("<p>Document 2025-12345</p>"), {
    code: "SOURCE_IDENTITY_MISMATCH",
  });
  assert.throws(() => fr("<h1>Access denied</h1><p>FR Doc. 2025-12345</p>"), {
    code: "SOURCE_ERROR_PAGE",
  });
  assert.throws(
    () => bill("<h1>HOUSE BILL 4321</h1><p>The request was for 1234.</p>"),
    { code: "AMBIGUOUS_SOURCE_IDENTITY" },
  );
});

test("GovInfo line-boundary NUL delimiters are documented omissions with byte identity unchanged", () => {
  const value = fr(
    "<pre>FR Doc No: 2025-12345\n\n\0\0Authored Federal Register heading\0\0\n\nThe board shall review.</pre>",
  );
  assert.ok(!value.text.includes(String.fromCharCode(0)));
  assert.deepEqual(
    value.exclusions
      .filter((entry) => entry.reason === "source_nul_delimiter")
      .map((entry) => entry.count),
    [2, 2],
  );
  assert.throws(() => fr("<pre>FR Doc. 2025-12345\n\nshall\0\0not</pre>"), {
    code: "CONTROL_CHARACTER",
  });
  assert.throws(() => bill("<p>HB 1234\n\0\0Bill</p>"), {
    code: "CONTROL_CHARACTER",
  });
});

test("nested wrappers preserve block boundaries and source identities reject the wrong chamber", () => {
  const value = bill(
    "<center><h1>HOUSE BILL 1234</h1><div><p>First paragraph.</p><p>Second paragraph.</p></div></center>",
  );
  assert.equal(value.blocks.length, 3);
  assert.throws(() => bill("<h1>SENATE BILL 1234</h1>"), {
    code: "AMBIGUOUS_SOURCE_IDENTITY",
  });
  assert.throws(
    () => bill("<h1>HOUSE BILL 1234</h1>", { expectedIdentity: "E2SHB 1234" }),
    { code: "SOURCE_IDENTITY_MISMATCH" },
  );
  assert.equal(
    bill("<h1>ENGROSSED SECOND SUBSTITUTE HOUSE BILL 1234</h1>", {
      expectedIdentity: "E2SHB 1234",
    }).identity.sourceValue,
    "ENGROSSED SECOND SUBSTITUTE HOUSE BILL 1234",
  );
  assert.throws(
    () =>
      bill(
        "<h1>Review procedure</h1><p>Sec. 1: CHAPTER 183, LAWS OF 2022 is referenced.</p>",
        { expectedIdentity: "Chapter 183, 2022" },
      ),
    { code: "SOURCE_IDENTITY_MISMATCH" },
  );
  assert.throws(
    () =>
      bill(
        "<h1>HOUSE BILL 1234</h1><del><p>Old text</p><p>More old text</p></del>",
      ),
    { code: "UNSUPPORTED_BLOCK_AMENDMENT" },
  );
});

test("printed source page labels survive as locators while running page chrome is excluded", () => {
  const value = fr(
    "<pre>FR Doc No: 2025-12345\n\nFederal Register / Vol. 90, No. 1 / Rules and Regulations\n\n[[Page 12345]]\n\nThe council shall review.\n\n[[Page 12346]]\n\nApplicants may appeal.</pre>",
  );
  assert.equal(value.blocks[1].locator.printedPageLabel, "12345");
  assert.equal(value.blocks[2].locator.printedPageLabel, "12346");
  assert.ok(!/Federal Register \/|\[\[Page/.test(value.text));
  assert.ok(
    value.exclusions.some((entry) => entry.reason === "running_page_header"),
  );
});

test("strict UTF8 decoding, reserved markers, unsafe URLs and unsupported types reject", () => {
  assert.throws(() => fr("", { bytes: Buffer.from([0xc3, 0x28]) }), {
    code: "INVALID_UTF8",
  });
  assert.throws(
    () => fr("", { mediaType: "text/html; charset=windows-1252" }),
    { code: "UNSUPPORTED_ENCODING" },
  );
  assert.throws(() => fr("<p>FR Doc. 2025-12345 [[INSERTION]]</p>"), {
    code: "RESERVED_AMENDMENT_MARKER",
  });
  assert.throws(() => fr("", { url: "https://user:password@example.gov/" }), {
    code: "UNSAFE_SOURCE_URL",
  });
  assert.throws(() => fr("", { mediaType: "application/pdf" }), {
    code: "UNSUPPORTED_MEDIA_TYPE",
  });
});

test("chapter and inventory identity screen discovery without inventing policy records", () => {
  const chapter = bill(
    "<h1>CHAPTER 183, LAWS OF 2022</h1><p>Authored policy text.</p>",
    { expectedIdentity: "Chapter 183, 2022" },
  );
  assert.equal(chapter.identity.matched, true);
  const index = bill(
    '<h1>2025 Session Laws</h1><table><tr><td>Chapter 1</td><td><a href="https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/Session%20Laws/1234.SL.htm">HB 1234</a></td></tr></table>',
    {
      sourceKind: "washington_index",
      expectedIdentity: "Washington session law chapter index 2025",
    },
  );
  assert.equal(index.links.length, 1);
  assert.ok(index.warnings.includes("discovery_index_not_policy_instrument"));
  const inventory = bill("<h1>Bill documents: HB 1234</h1>", {
    sourceKind: "washington_index",
    expectedIdentity: "Washington bill inventory 1234 2025-26",
    url: "https://app.leg.wa.gov/bi/tld/documentsearchresults?biennium=2025-26&name=1234",
  });
  assert.equal(inventory.identity.matched, true);
});

function inventoryModel(overrides = {}) {
  const document = {
    id: 101,
    name: "1234",
    biennium: "2025-26",
    displayNum: "1234",
    path: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1234.htm",
    description: "Original Bill",
    shortFriendlyName: "HB 1234",
    longFriendlyName: "House Bill 1234",
    documentClass: "Bills",
    documentType: "Bills",
    extension: ".htm",
    effectiveDate: "2024-12-09T11:42:51.06",
    lastModifiedDate: "2025-01-13T17:41:28.273",
    documentLinks:
      '<a href="https://app.leg.wa.gov/Convert?document=1234">convert</a>',
    ...overrides,
  };
  return {
    billNumber: 1234,
    biennium: "2025-26",
    documents: [document],
    userId: "DO-NOT-RETAIN-USER",
    billnotes: "DO-NOT-RETAIN-NOTES contact@example.gov",
    groupedDocuments: [{ documents: [document] }],
  };
}
function extractInventory(literal, scriptPrefix = "", scriptSuffix = "") {
  return bill(
    `<h1>Bill documents HB 1234</h1><p>DO-NOT-RETAIN-UI-CUSTOMIZATION</p><script>$(document).ready(function(){ ${scriptPrefix} var model = ${literal}; ${scriptSuffix} WSLApp.init(model); });</script>`,
    {
      sourceKind: "washington_index",
      expectedIdentity: "Washington bill inventory 1234 2025-26",
      url: "https://app.leg.wa.gov/bi/tld/documentsearchresults?biennium=2025-26&name=1234",
    },
  );
}

test("Washington inert model selects only reviewed official HTML document metadata with exact JSON pointers", () => {
  const input = inventoryModel();
  input.documents.push({
    ...input.documents[0],
    id: 102,
    documentType: "Bill Reports",
    path: "https://app.leg.wa.gov/Convert?document=1234",
  });
  const output = extractInventory(JSON.stringify(input));
  assert.equal(output.links.length, 1);
  assert.ok(
    output.links[0].sourceLocator.endsWith("::json-pointer=/documents/0/path"),
  );
  assert.equal(output.links[0].sourceMetadata.description, "Original Bill");
  assert.equal(
    output.links[0].sourceMetadata.effectiveDate,
    "2024-12-09T11:42:51.06",
  );
  assert.equal(
    output.links[0].sourceMetadata.dateSemantics,
    "unqualified_provider_metadata",
  );
  assert.ok(
    output.identity.sourceLocator.endsWith("::json-pointer=/billNumber"),
  );
  assert.ok(
    !/DO-NOT-RETAIN|contact@example|Convert\?/.test(JSON.stringify(output)),
  );
  assert.ok(
    output.warnings.includes(
      "inventory_dates_are_unqualified_provider_metadata_not_legal_effect_or_validated_publication",
    ),
  );
  for (const block of output.blocks)
    assert.equal(
      Buffer.from(output.text)
        .subarray(block.startByte, block.endByte)
        .toString("utf8"),
      block.text,
    );
  assert.deepEqual(output, extractInventory(JSON.stringify(input)));
});

test("Washington model parsing rejects executable expressions, duplicate keys/declarations and identity drift", () => {
  const literal = JSON.stringify(inventoryModel());
  assert.throws(() => extractInventory(`(()=>(${literal}))()`), {
    code: "INVENTORY_MODEL_NOT_JSON",
  });
  assert.throws(
    () =>
      extractInventory(
        literal.replace(
          '"billNumber":1234',
          '"billNumber":9999,"billNumber":1234',
        ),
      ),
    { code: "INVENTORY_DUPLICATE_JSON_KEY" },
  );
  assert.throws(
    () => extractInventory(literal, "", `var model = ${literal};`),
    { code: "AMBIGUOUS_INVENTORY_MODEL" },
  );
  assert.throws(() => extractInventory(literal.slice(0, -1)), {
    code: "INVENTORY_MODEL_NOT_JSON",
  });
  assert.throws(
    () =>
      extractInventory(
        JSON.stringify({ ...inventoryModel(), billNumber: 9999 }),
      ),
    { code: "SOURCE_IDENTITY_MISMATCH" },
  );
  assert.throws(
    () =>
      extractInventory(
        JSON.stringify(
          inventoryModel({ path: "https://evil.example/1234.htm" }),
        ),
      ),
    { code: "UNSAFE_INVENTORY_DOCUMENT_URL" },
  );
  assert.throws(
    () =>
      extractInventory(
        JSON.stringify(
          inventoryModel({
            path: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/9999.htm",
          }),
        ),
      ),
    { code: "UNSAFE_INVENTORY_DOCUMENT_URL" },
  );
  assert.throws(
    () =>
      extractInventory(
        JSON.stringify(
          inventoryModel({ description: "Ask someone@example.gov" }),
        ),
      ),
    { code: "INVALID_INVENTORY_METADATA" },
  );
});

test("Washington substitute identifiers retain their advertised variants within the same numbered work", () => {
  const path =
    "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1234-S2.E.htm";
  const model = inventoryModel({
    displayNum: "1234-S2",
    path,
    name: "Engrossed Second Substitute House Bill 1234",
    description: "Engrossed Bill",
  });
  assert.equal(extractInventory(JSON.stringify(model)).links[0].url, path);
  for (const displayNum of ["9999-S2", "1234malicious", "1234-S20"])
    assert.throws(
      () =>
        extractInventory(JSON.stringify(inventoryModel({ displayNum, path }))),
      { code: "SOURCE_IDENTITY_MISMATCH" },
    );
});

test("model lookalikes in comments and strings are ignored and hostile suffix code never runs", () => {
  const output = extractInventory(
    JSON.stringify(inventoryModel()),
    '/* var model = {bad}; */ const note = "var model = bogus;";',
    'throw new Error("MUST NOT EXECUTE");',
  );
  assert.equal(output.links.length, 1);
  assert.ok(!output.text.includes("MUST NOT EXECUTE"));
});
