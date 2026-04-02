import { resolve } from "path";
import { defineConfig } from "vite";
// @ts-export-error
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

const shouldAnalyzeBundle = process.env.REVEALGDB_ANALYZE_BUNDLE === "true";

export default defineConfig({
  plugins: [
    react(),
    ...(shouldAnalyzeBundle
      ? [
          visualizer({
            open: false,
            filename: "./bundle-report.html",
          }),
        ]
      : []),
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
    reportCompressedSize: shouldAnalyzeBundle,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/renderer/index.html"),
        hexeditor: resolve(__dirname, "src/renderer/hexeditor-test.html"),
        gdbcommand: resolve(__dirname, "src/renderer/gdbcommand-test.html"),
        connectionmanager: resolve(__dirname, "src/renderer/connectionmanager-test.html"),
        connectiondialog: resolve(__dirname, "src/renderer/connectiondialog-test.html"),
        settings: resolve(__dirname, "src/renderer/settings-test.html"),
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("node_modules/@syncfusion")) {
            if (
              id.includes("/ej2-react-grids/") ||
              id.includes("/ej2-grids/") ||
              id.includes("/ej2-react-treegrid/") ||
              id.includes("/ej2-treegrid/")
            ) {
              return "syncfusion-grid-vendor";
            }

            if (id.includes("/ej2-react-navigations/") || id.includes("/ej2-navigations/")) {
              return "syncfusion-nav-vendor";
            }

            if (
              id.includes("/ej2-react-popups/") ||
              id.includes("/ej2-popups/") ||
              id.includes("/ej2-react-dropdowns/") ||
              id.includes("/ej2-dropdowns/") ||
              id.includes("/ej2-react-buttons/") ||
              id.includes("/ej2-buttons/") ||
              id.includes("/ej2-react-splitbuttons/") ||
              id.includes("/ej2-splitbuttons/") ||
              id.includes("/ej2-react-inputs/") ||
              id.includes("/ej2-inputs/") ||
              id.includes("/ej2-react-progressbar/") ||
              id.includes("/ej2-progressbar/") ||
              id.includes("/ej2-notifications/")
            ) {
              return "syncfusion-ui-vendor";
            }

            return "syncfusion-ui-vendor";
          }

          if (id.includes("node_modules/react-ace")) {
            return "ace-react-vendor";
          }

          if (id.includes("node_modules/ace-builds")) {
            if (id.includes("/src-noconflict/theme-")) {
              return "ace-theme-vendor";
            }

            if (id.includes("/src-noconflict/mode-")) {
              return "ace-mode-vendor";
            }

            return "ace-core-vendor";
          }

          if (id.includes("node_modules/dock-spawn-ts")) {
            return "dock-vendor";
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
