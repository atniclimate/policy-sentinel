import { afterEach, describe, expect, it } from "vitest";
import { installSkipLink } from "../../src/app/skip-link";

describe("skip link", () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.location.hash = "#/";
  });

  it("focuses main content without changing the hash route", () => {
    window.location.hash = "#/search?nation=nation%3Asynthetic-002";
    document.body.innerHTML = `
      <a class="skip-link" href="#main-content">Skip to main content</a>
      <main id="main-content" tabindex="-1">Search results</main>
    `;
    const originalHash = window.location.hash;
    const removeListener = installSkipLink();
    const link = document.querySelector<HTMLAnchorElement>(".skip-link");
    const main = document.getElementById("main-content");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });

    expect(link).not.toBeNull();
    expect(main).not.toBeNull();
    expect(link?.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(main);
    expect(window.location.hash).toBe(originalHash);

    removeListener();
  });

  it("is a no-op when the static skip link is absent", () => {
    expect(() => installSkipLink()()).not.toThrow();
  });
});
