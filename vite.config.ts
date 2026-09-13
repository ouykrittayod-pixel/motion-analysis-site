import { defineConfig } from "vite";

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so the base path must match the repository name.
export default defineConfig({
  base: process.env.VITE_BASE || "/motion-analysis-site/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
  },
});
