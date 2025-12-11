/**
 * @type {import('electron-vite').UserConfig}
 */

import { defineConfig } from "electron-vite";
import { resolve } from "path";
// @ts-export-error
import react from "@vitejs/plugin-react";

export default defineConfig({
  preload: {
    root: ".",
    build: {
      outDir: "out/preload",
      emptyOutDir: true,
      sourcemap: true,
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
    build: {
      outDir: "out/main",
      emptyOutDir: true,
      sourcemap: true,
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
    plugins: [react()],
    base: "./",
    build: {
      outDir: "out/renderer",
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          // Configure manual chunks for better control
          manualChunks(id) {
            //console.log(`Chunk: ${id}`);
            if (id.includes("syncfusion") && id.includes("grid")) {
              //console.log("   Bundle: syncgrid")
              return "syncgrid";
              // } else if (id.includes("syncfusion") && id.includes("pdf")) {
              //   //console.log("   Bundle: syncpdf");
              //   return "syncpdf";
            } else if (id.includes("node_modules/@syncfusion")) {
              //console.log("   Bundle: syncfusion");
              return "syncfusion";
            } else if (
              id.includes("node_modules/ace-builds") ||
              id.includes("node_modules/react-ace")
            ) {
              //console.log("   Bundle: ace-editor");
              return "ace-editor";
            } else if (id.includes("node_modules/dockview")) {
              //console.log("   Bundle: dockview");
              return "dockview";
            } else if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/prop-types") ||
              id.includes("scheduler")
            ) {
              //console.log("   Bundle: react");
              return "react";
            } else if (id.includes("node_modules")) {
              //console.log("   Bundle: 3rdParty");
              return "3rdParty";
            }
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
