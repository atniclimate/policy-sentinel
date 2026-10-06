import { readFileSync } from "node:fs";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

// The live demo builds straight into docs/, which GitHub Pages serves from main.
// emptyOutDir stays false: docs/ also holds the project's Markdown records.
export default defineConfig({
  root: "demo",
  base: "./",
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "../docs",
    emptyOutDir: false,
    assetsDir: "demo-assets",
    sourcemap: false,
    target: "es2022",
  },
});
