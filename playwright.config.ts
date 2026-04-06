/**
 * playwright.config module.
 *
 * @remarks
 * Source module for playwright.config.
 */

/**
 * @file playwright.config.ts
 * @description Source module for playwright.config.
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  timeout: 30_000,
  use: {
    headless: true,
  },
});
