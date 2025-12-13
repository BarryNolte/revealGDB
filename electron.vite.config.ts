/**
 * @type {import('electron-vite').UserConfig}
 */

import { defineConfig } from "electron-vite";
import { resolve } from "path";
// @ts-export-error
import react from "@vitejs/plugin-react";
// import fs from "fs";

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
          manualChunks(_id) {
            const chunkName = "default";
            // if (id.includes("ej2-base") || id.includes("ej2-react-base")) {
            //   chunkName = "syncbase";
            // } else if (
            //   id.includes("ej2-excel-export") ||
            //   id.includes("ej2-file-utils") ||
            //   id.includes("ej2-inputs") ||
            //   id.includes("ej2-navigations") ||
            //   id.includes("ej2-notifications")
            // ) {
            //   chunkName = "syncmisc";
            // } else if (id.includes("ej2-compression") || id.includes("ej2-data")) {
            //   chunkName = "syncmisc1";
            // } else if (id.includes("ej2-splitbuttons")) {
            //   chunkName = "syncsplitbut";
            // } else if (id.includes("ej2-react")) {
            //   chunkName = "react";
            // } else if (id.includes("ej2-dropdowns")) {
            //   chunkName = "syncdropdown";
            // } else if (id.includes("ej2-lists")) {
            //   chunkName = "synclists";
            // } else if (id.includes("ej2-pdf-export") || id.includes("ej2-calendars")) {
            //   chunkName = "syncunused2";
            // } else if (id.includes("syncfusion") && id.includes("grid")) {
            //   chunkName = "syncgrid";
            // } else if (id.includes("node_modules/@syncfusion")) {
            //   chunkName = "syncfusion";
            // } else if (id.includes("ace.js")) {
            //   chunkName = "ace-editor";
            // } else if (id.includes("ace-builds")) {
            //   chunkName = "ace-dynamics";
            // } else if (id.includes("node_modules/dockview")) {
            //   chunkName = "dockview";
            // } else if (
            //   id.includes("node_modules/react") ||
            //   id.includes("node_modules/prop-types") ||
            //   id.includes("scheduler")
            // ) {
            //   chunkName = "react";
            // } else if (id.includes("node_modules")) {
            //   chunkName = "3rdParty";
            // }

            // const idx = id.indexOf("revealGDB");
            // const fileName = id.slice(idx);
            // const questionIdx = id.indexOf("?");
            // const safeFullPath = questionIdx === -1 ? id : id.slice(0, questionIdx);

            // let size: number = 0;
            // try {
            //   if (fs.existsSync(safeFullPath)) {
            //     size = fs.statSync(safeFullPath).size;
            //   }
            // } catch {
            //   size = 0;
            // }

            // console.log(
            //   `${chunkName.padEnd(12, " ")} | ${size.toString().padStart(8, " ")} | ${fileName}`,
            // );

            return chunkName;
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
