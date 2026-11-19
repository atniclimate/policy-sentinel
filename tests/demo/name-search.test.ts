// @vitest-environment node
import { describe, expect, it } from "vitest";
import { holdsTribeName } from "../../src/demo/name-search";

/**
 * "Lummi Nation v. Washington" is left out: it is a case caption as well as
 * a Tribe-shaped name, and the mask's merge rule folds the nation_name span
 * into the case_caption span there, so this module never sees a nation_name
 * span for it. The owner ruling says it may be read either way; it is not
 * pinned.
 */

const TRUE_CASES = [
  "Yakama Nation",
  "yakama nation water rights",
  "Confederated Tribes of the Colville Reservation",
  "Navajo Nation",
  "Leech Lake Band of Ojibwe",
  "Pueblo of Zuni",
  "Native Village of Kotzebue",
  "Gila River Indian Community",
  "Tulalip Tribes housing",
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
  "Navajo",
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
