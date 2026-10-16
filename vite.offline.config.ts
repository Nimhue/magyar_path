// Builds one self-contained HTML file (everything inlined) that opens by double-click, no server needed.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: "es2020", outDir: "dist-offline", assetsInlineLimit: 100_000_000 },
});
