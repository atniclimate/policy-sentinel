import { describe, expect, it } from "vitest";

import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  assertWashingtonGovernorExecutiveOrdersIndexUrl,
  buildWashingtonGovernorExecutiveOrdersIndexUrl,
} from "../../../src/adapters/washington-governor-executive-orders";

describe("Washington Governor executive-order query contract", () => {
  it("builds the one exact reviewed Bob Ferguson all-status URL", () => {
    expect(buildWashingtonGovernorExecutiveOrdersIndexUrl().href).toBe(
      WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
    );
    expect(
      assertWashingtonGovernorExecutiveOrdersIndexUrl(
        WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      ).href,
    ).toBe(WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL);
  });

  it.each([
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=All&field_executive_order_status_target_id=All",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?field_executive_order_status_target_id=All&governor=220",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&governor=220&field_executive_order_status_target_id=All",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All&page=0",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All&combine=synthetic",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=%32%32%30&field_executive_order_status_target_id=All",
    "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All#rows",
    "http://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All",
    "https://governor.wa.gov.example.invalid/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All",
    "https://user@governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All",
    "https://governor.wa.gov:444/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All",
  ])("rejects query or origin drift: %s", (candidate) => {
    expect(() =>
      assertWashingtonGovernorExecutiveOrdersIndexUrl(candidate),
    ).toThrow(/differs from the reviewed exact query/);
  });
});
