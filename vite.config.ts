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
  assetsInclude: ["**/*.gif"],
  server: {
    port: 5173,
  },
  build: {
    outDir: "../../out/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/renderer/index.html"),
        hexeditor: resolve(__dirname, "src/renderer/hexeditor-test.html"),
        gdbcommand: resolve(__dirname, "src/renderer/gdbcommand-test.html"),
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("node_modules/@syncfusion")) {
            return "syncfusion-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
    },
  },
});
