import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_PATH,
  WASHINGTON_GOVERNOR_FILTER_VALUE,
  WASHINGTON_GOVERNOR_ORIGIN,
  WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE,
} from "./constants";

export function buildWashingtonGovernorExecutiveOrdersIndexUrl(): URL {
  const url = new URL(
    WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_PATH,
    WASHINGTON_GOVERNOR_ORIGIN,
  );
  url.search =
    `?governor=${WASHINGTON_GOVERNOR_FILTER_VALUE}` +
    `&field_executive_order_status_target_id=${WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE}`;
  return assertWashingtonGovernorExecutiveOrdersIndexUrl(url);
}

export function assertWashingtonGovernorExecutiveOrdersIndexUrl(
  input: URL | string,
): URL {
  let url: URL;
  try {
    url = new URL(typeof input === "string" ? input : input.href);
  } catch {
    throw new Error(
      "Washington Governor executive-order index URL is invalid.",
    );
  }
  if (url.href !== WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL) {
    throw new Error(
      "Washington Governor executive-order index URL differs from the reviewed exact query.",
    );
  }
  return url;
}
