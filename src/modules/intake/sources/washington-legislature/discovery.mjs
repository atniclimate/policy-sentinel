import { URL } from "node:url";
const fail = (code) => {
  throw new Error(code);
};
export function selectWashingtonChapterCandidates(extraction) {
  if (!/2025 Regular Session/i.test(extraction.text))
    fail("REGULAR_SESSION_SCOPE_REQUIRED");
  const selected = [];
  const exclusions = [];
  for (let chapter = 1; chapter <= 200; chapter++) {
    const links = extraction.links.filter(
      (link) => link.text === `Chapter ${chapter}`,
    );
    if (links.length !== 1) fail("MISSING_OR_DUPLICATE_CHAPTER");
    const link = links[0];
    const url = new URL(link.url);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "lawfilesext.leg.wa.gov" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    )
      fail("UNREVIEWED_CHAPTER_URL");
    const path = decodeURIComponent(url.pathname);
    if (
      chapter === 1 &&
      path ===
        "/biennium//2025-26/Pdf/Initiatives/Initiatives/INITIATIVE 2066.SL.pdf"
    ) {
      exclusions.push({
        chapter,
        reason: "initiative_outside_selected_bill_interface",
        ...link,
      });
      continue;
    }
    if (
      chapter === 2 &&
      path ===
        "/biennium/2025-26/Pdf/Bills/Session Laws/House/2025SALARYSCHEDULE.SL.pdf"
    ) {
      exclusions.push({
        chapter,
        reason: "salary_schedule_not_a_numeric_bill",
        ...link,
      });
      continue;
    }
    const match =
      /^\/biennium\/(2025-26)\/Pdf\/Bills\/Session Laws\/(House|Senate)\/([1-9]\d{3})(-S(?:2)?)?\.sl\.pdf$/i.exec(
        path,
      );
    if (!match) fail("UNSUPPORTED_CHAPTER_BILL_PATH");
    const [, biennium, chamber, bill, variant = ""] = match;
    selected.push({
      chapter,
      year: 2025,
      biennium,
      chamber: chamber.toLowerCase(),
      bill,
      variant: variant.toUpperCase(),
      indexUrl: link.url,
      indexLocator: link.sourceLocator,
      inventoryOperationId: `broad-wa-${bill}-inventory-001`,
      bodyOperationId: `broad-wa-${bill}-session-001`,
      inventoryUrl: `https://app.leg.wa.gov/bi/tld/documentsearchresults?biennium=${biennium}&documentType=1&name=${bill}`,
    });
  }
  if (
    new Set(
      selected.map((item) => `${item.biennium}:${item.chamber}:${item.bill}`),
    ).size !== selected.length
  )
    fail("DUPLICATE_BILL_WORK");
  return { selected, exclusions };
}
export function selectWashingtonSessionLaw(candidate, extraction) {
  const links = extraction.links.filter((link) => {
    const url = new URL(link.url);
    return (
      url.protocol === "https:" &&
      url.hostname === "lawfilesext.leg.wa.gov" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      decodeURIComponent(url.pathname).toLowerCase() ===
        `/biennium/${candidate.biennium}/htm/bills/session laws/${candidate.chamber}/${candidate.bill}${candidate.variant}.sl.htm`.toLowerCase() &&
      link.sourceMetadata?.documentClass === "Bills" &&
      link.sourceMetadata?.documentType === "Session Laws" &&
      link.sourceMetadata?.biennium === candidate.biennium
    );
  });
  if (links.length !== 1) fail("MISSING_OR_AMBIGUOUS_ADVERTISED_SESSION_LAW");
  const chapterEvidence = [];
  for (const [field, value] of Object.entries(links[0].sourceMetadata)) {
    if (
      typeof value !== "string" ||
      !["name", "description", "longFriendlyName"].includes(field)
    )
      continue;
    const short = /\bC\s+(\d+)\s+L\s+(\d{2})\b/i.exec(value);
    const long = /\bChapter\s+(\d+)\s+Year\s+(\d{4})\b/i.exec(value);
    if (
      short &&
      (Number(short[1]) !== candidate.chapter ||
        short[2] !== String(candidate.year).slice(-2))
    )
      fail("INVENTORY_CHAPTER_CONTRADICTION");
    if (
      long &&
      (Number(long[1]) !== candidate.chapter ||
        Number(long[2]) !== candidate.year)
    )
      fail("INVENTORY_CHAPTER_CONTRADICTION");
    if (short || long) chapterEvidence.push({ field, value });
  }
  return {
    ...candidate,
    bodyUrl: links[0].url,
    inventoryLocator: links[0].sourceLocator,
    inventoryMetadata: links[0].sourceMetadata,
    inventoryChapterEvidence: chapterEvidence,
    chapterValidation: chapterEvidence.length
      ? "inventory_consistent_body_review_required"
      : "inventory_unspecified_body_review_required",
  };
}

export function assertWashingtonBillHeader(candidate, header) {
  const match =
    /^(?:ENGROSSED )?(?:(SECOND SUBSTITUTE|SUBSTITUTE) )?(HOUSE|SENATE) BILL ([1-9]\d{3})$/.exec(
      header,
    );
  const variant =
    match?.[1] === "SECOND SUBSTITUTE"
      ? "-S2"
      : match?.[1] === "SUBSTITUTE"
        ? "-S"
        : "";
  if (
    !match ||
    match[2].toLowerCase() !== candidate.chamber ||
    match[3] !== candidate.bill ||
    variant !== candidate.variant
  )
    fail("PRINTED_BILL_VARIANT_CONTRADICTION");
}
