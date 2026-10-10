import type { PdfFonts } from "../src/demo/pdf";
import { REQUEST_TIMEOUT_MS } from "./api";

async function bytes(url: URL): Promise<Uint8Array> {
  // A request that stalls is given up at the page's request limit, like one that fails.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Font request failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The document fonts for the PDF, fetched from this site only when a PDF is
 * built. Undefined when any of them cannot be fetched: the PDF then uses the
 * standard Helvetica faces.
 */
export async function loadPdfFonts(): Promise<PdfFonts | undefined> {
  try {
    // Each literal new URL(..., import.meta.url) makes Vite ship that font file with the page.
    const [title, body, bold] = await Promise.all([
      bytes(new URL("./fonts/LeagueSpartan-SemiBold.ttf", import.meta.url)),
      bytes(new URL("./fonts/LexendDeca-Regular.ttf", import.meta.url)),
      bytes(new URL("./fonts/LexendDeca-SemiBold.ttf", import.meta.url)),
    ]);
    return { title, body, bold };
  } catch {
    return undefined;
  }
}
