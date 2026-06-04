/**
 * electron.vite.config module.
 *
 * @remarks
 * Source module for electron.vite.config.
 */

/**
 * @file electron.vite.config.ts
 * @description Source module for electron.vite.config.
 */

/**
 * @type {import('electron-vite').UserConfig}
 */

import { defineConfig } from "electron-vite";
import { resolve } from "path";
// @ts-export-error
import react from "@vitejs/plugin-react";
// @ts-export-error
import { visualizer } from "rollup-plugin-visualizer";
// import fs from "fs";

const buildVariant = process.env.REVEALGDB_BUILD === "debug" ? "debug" : "release";
const isDebugBuild =
  process.env.REVEALGDB_DEBUG === "true" ||
  (process.env.REVEALGDB_BUILD === undefined && process.env.NODE_ENV === "development");
const shouldAnalyzeBundle = process.env.REVEALGDB_ANALYZE_BUNDLE === "true";

const buildDefines = {
  __REVEALGDB_BUILD__: JSON.stringify(buildVariant),
  __REVEALGDB_DEBUG__: JSON.stringify(isDebugBuild),
};

const rendererInputs = {
  main: resolve(__dirname, "src/renderer/index.html"),
  hexeditor: resolve(__dirname, "src/renderer/hexeditor-test.html"),
  gdbcommand: resolve(__dirname, "src/renderer/gdbcommand-test.html"),
  toolbar: resolve(__dirname, "src/renderer/toolbar-test.html"),
  connectionmanager: resolve(__dirname, "src/renderer/connectionmanager-test.html"),
  connectiondialog: resolve(__dirname, "src/renderer/connectiondialog-test.html"),
  settings: resolve(__dirname, "src/renderer/settings-test.html"),
};

// For bundle analysis, exclude test HTML entries to focus on production code
const productionInputs = {
  main: resolve(__dirname, "src/renderer/index.html"),
};

export default defineConfig({
  preload: {
    root: ".",
    define: buildDefines,
    plugins: shouldAnalyzeBundle
      ? [
          visualizer({
            open: false,
            filename: "./reports/bundle-report-preload.html",
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : [],
    build: {
      outDir: "out/preload",
      emptyOutDir: true,
      sourcemap: true,
      reportCompressedSize: shouldAnalyzeBundle,
      rollupOptions: {},
      watch: {
        // Rollup WatcherOptions can be configured here
        // For example, to ignore specific files:
        // ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/preload"),
      },
    },
  },
  main: {
    root: ".",
    define: buildDefines,
    plugins: shouldAnalyzeBundle
      ? [
          visualizer({
            open: false,
            filename: "./reports/bundle-report-main.html",
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : [],
    build: {
      outDir: "out/main",
      emptyOutDir: true,
      sourcemap: true,
      reportCompressedSize: shouldAnalyzeBundle,
      rollupOptions: {},
      watch: {
        // Rollup WatcherOptions can be configured here
        // For example, to ignore specific files:
        // ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/main"),
      },
    },
  },
  renderer: {
    plugins: shouldAnalyzeBundle
      ? [
          react(),
          visualizer({
            open: false,
            filename: "./reports/bundle-report-renderer.html",
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : [react()],
    base: "./",
    define: buildDefines,
    assetsInclude: ["**/*.gif"],
    build: {
      outDir: "out/renderer",
      emptyOutDir: true,
      sourcemap: true,
      reportCompressedSize: shouldAnalyzeBundle,
      rollupOptions: {
        input: shouldAnalyzeBundle ? productionInputs : rendererInputs,
        output: {
          // Configure manual chunks for better control
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
    server: {
      port: 5173,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
      },
    },
  },
});
