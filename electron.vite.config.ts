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
