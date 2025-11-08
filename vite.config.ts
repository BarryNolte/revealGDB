import { resolve } from "path";
import { defineConfig } from "vite";
// @ts-export-error
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
