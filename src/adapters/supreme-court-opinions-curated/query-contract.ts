import {
  SUPREME_COURT_ORIGIN,
  SUPREME_COURT_TERM_PATH,
  SUPREME_COURT_TERM_URL,
} from "./constants";

export function buildSupremeCourtTermIndexUrl(): URL {
  return assertSupremeCourtTermIndexUrl(
    new URL(SUPREME_COURT_TERM_PATH, SUPREME_COURT_ORIGIN),
  );
}

export function assertSupremeCourtTermIndexUrl(input: URL | string): URL {
  let url: URL;
  try {
    url = new URL(typeof input === "string" ? input : input.href);
  } catch {
    throw new Error("Supreme Court curated-opinion index URL is invalid.");
  }
  if (url.href !== SUPREME_COURT_TERM_URL) {
    throw new Error(
      "Supreme Court curated-opinion index URL differs from the reviewed exact term page.",
    );
  }
  return url;
}
