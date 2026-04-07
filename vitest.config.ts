/**
 * vitest.config module.
 *
 * @remarks
 * Source module for vitest.config.
 */

/**
 * @file vitest.config.ts
 * @description Source module for vitest.config.
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const buildVariant = process.env.REVEALGDB_BUILD === "debug" ? "debug" : "release";
const isDebugBuild =
  process.env.REVEALGDB_DEBUG === "true" ||
  (process.env.REVEALGDB_BUILD === undefined && process.env.NODE_ENV === "development");

const coverageInclude = [
  "src/main/**/*.ts",
  "src/preload/**/*.ts",
  "src/renderer/**/*.ts",
  "src/renderer/**/*.tsx",
];

const coverageExclude = [
  "**/*.d.ts",
  "tests/**",
  "src/**/__tests__/**",
  "src/**/*.{test,spec}.{ts,tsx}",
  "src/renderer/**/*-test.tsx",
  "src/renderer/test-helpers/**",
  "scripts/**",
  "reports/**",
  "docs/**",
  "out/**",
  "dist/**",
  "dist_electron/**",
  "build/**",
  "src/renderer/*.html",
];

const buildDefines = {
  __REVEALGDB_BUILD__: JSON.stringify(buildVariant),
  __REVEALGDB_DEBUG__: JSON.stringify(isDebugBuild),
};

export default defineConfig({
  plugins: [react()],
  define: buildDefines,
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "tests/vite/**/*.test.ts",
      "tests/vite/**/*.spec.ts",
      "tests/vite/**/*.test.tsx",
      "tests/vite/**/*.spec.tsx",
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "istanbul",
      clean: true,
      include: coverageInclude,
      exclude: coverageExclude,
      reporter: ["text-summary", "json", "json-summary"],
      reportsDirectory: "./.nyc_output/vitest",
    },
  },
});
