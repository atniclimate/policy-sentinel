import { GOIA_ACCORD_PATH, GOIA_ACCORD_URL, GOIA_ORIGIN } from "./constants";

export function assertGoiaAccordUrl(input: string | URL): URL {
  let url: URL;
  const serialized = typeof input === "string" ? input : input.href;
  try {
    url = new URL(serialized);
  } catch {
    throw new Error("GOIA Centennial Accord URL is invalid.");
  }
  if (
    url.href !== GOIA_ACCORD_URL ||
    url.protocol !== "https:" ||
    /^https:\/\/goia\.wa\.gov:/iu.test(serialized) ||
    url.hostname !== "goia.wa.gov" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "GOIA Centennial Accord URL differs from the one reviewed canonical page.",
    );
  }
  return url;
}

export function buildGoiaAccordUrl(): URL {
  return assertGoiaAccordUrl(new URL(GOIA_ACCORD_PATH, GOIA_ORIGIN));
}
