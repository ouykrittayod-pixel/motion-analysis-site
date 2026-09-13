import { defineConfig } from "vite";

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so the base path must match the repository name. Override it at build
// time if your repo name differs:
//
//   VITE_BASE=/my-repo-name/ npm run build
//
// Locally (npm run dev / npm run preview) it falls back to "/".
export default defineConfig({
  base: process.env.VITE_BASE || "/motion-analysis-system/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0, // keep PDFs/images as real files, never inline them
    chunkSizeWarningLimit: 1000,
  },
});
