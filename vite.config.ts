/**
 * vite.config module.
 *
 * @remarks
 * Source module for vite.config.
 */

/**
 * @file vite.config.ts
 * @description Source module for vite.config.
 */

import { resolve } from "path";
import { defineConfig, type PluginOption } from "vite";
// @ts-export-error
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

const shouldAnalyzeBundle = process.env.REVEALGDB_ANALYZE_BUNDLE === "true";
const shouldCollectCoverage =
  process.env.REVEALGDB_COVERAGE === "true" || process.env.VITE_COVERAGE === "true";

export default defineConfig(async () => {
  const plugins: PluginOption[] = [...react()];

  if (shouldCollectCoverage) {
    const { default: istanbul } = await import("vite-plugin-istanbul");

    plugins.push(
      istanbul({
        include: ["src/renderer/**/*.ts", "src/renderer/**/*.tsx"],
        exclude: [
          "node_modules/**",
          "tests/**",
          "src/renderer/**/*-test.tsx",
          "src/renderer/*.d.ts",
          "src/renderer/test-helpers/**",
        ],
        extension: [".ts", ".tsx"],
        forceBuildInstrument: true,
        checkProd: false,
      }),
    );
  }

  if (shouldAnalyzeBundle) {
    plugins.push(
      visualizer({
        open: false,
        filename: "./bundle-report.html",
      }),
    );
  }

  return {
    plugins,
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
      sourcemap: shouldCollectCoverage,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/renderer/index.html"),
          hexeditor: resolve(__dirname, "src/renderer/hexeditor-test.html"),
          gdbcommand: resolve(__dirname, "src/renderer/gdbcommand-test.html"),
          toolbar: resolve(__dirname, "src/renderer/toolbar-test.html"),
          connectionmanager: resolve(__dirname, "src/renderer/connectionmanager-test.html"),
          connectiondialog: resolve(__dirname, "src/renderer/connectiondialog-test.html"),
          settings: resolve(__dirname, "src/renderer/settings-test.html"),
        },
        output: {
          manualChunks(id: string) {
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
  };
});
