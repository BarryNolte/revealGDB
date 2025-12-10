import { resolve } from "path";
import { defineConfig } from "vite";
// @ts-export-error
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false, // Automatically opens the report in your browser
      filename: "./bundle-report.html",
    }),
  ],
  root: "src/renderer",
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "../../out/renderer",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
    },
  },
});
