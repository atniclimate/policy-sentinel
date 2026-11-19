// @vitest-environment node
import { describe, expect, it } from "vitest";
import { holdsTribeName } from "../../src/demo/name-search";

/**
 * Every name here is made up, in the shapes real names take; no real Nation
 * is named in a test (safeguard 4).
 */

const TRUE_CASES = [
  "Example River Nation",
  "example river nation water quality",
  "Confederated Tribes of the Sample Reservation",
  "Sample Nation",
  "Sample Lake Band of Example",
  "Pueblo of Example",
  "Native Village of Sample",
  "Example River Indian Community",
  "Sample Tribes housing",
  // A Tribe as a party in a case caption, or named in a treaty title: the
  // mask folds the name into that span, and it still counts (review finding).
  "Example Tribe v. State",
  "State v. Example Tribe",
  "Example Tribe et al. v. United States",
  "Treaty with the Example Tribe",
  // Village or Community with a name beside it (design (b)1).
  "Example Village",
  "Village of Example",
  "village of the Example",
  "Example Community",
];

const FALSE_CASES = [
  "Indian Tribes",
  "tribal nations",
  "federally recognized Tribes",
  "Alaska Native villages",
  "American Indians",
  "Indian reservation roads",
  "tribal consultation",
  "community development block grants",
  "Virgin Islands",
  "Clean Water Act section 106",
  "Indians",
  "the nation's forests",
  // A one-word name with no anchor word, or only Island: the limit the page states.
  "Samplewood",
  "Example Island",
  // A caption with no Tribe as a party, and general village or community phrases.
  "Smith v. Jones",
  // A caption of general words alone names no Tribe.
  "Indian Tribes v. United States",
  "village water systems",
  "rural community facilities",
  "National Civilian Community Corps",
  "25 CFR 83",
];

describe("holdsTribeName", () => {
  it.each(TRUE_CASES)("recognizes a Tribe-shaped name in %j", (text) => {
    expect(holdsTribeName(text)).toBe(true);
  });

  it.each(FALSE_CASES)(
    "does not recognize %j as a Tribe-shaped name",
    (text) => {
      expect(holdsTribeName(text)).toBe(false);
    },
  );
});
