/**
 * Implements playwright-coverage for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { Page, TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type PageCoverage = Record<string, unknown>;

const PLAYWRIGHT_COVERAGE_DIR = path.resolve(process.cwd(), ".nyc_output", "playwright");
/**
 * Performs shouldCollectCoverage as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function shouldCollectCoverage(): boolean {
  return process.env.PLAYWRIGHT_COLLECT_COVERAGE === "true";
}
/**
 * Performs sanitizeFileName as part of this module's internal workflow.
 *
 * @param value - value parameter.
 * @returns The computed result produced by this operation.
 */

function sanitizeFileName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
/**
 * Performs hasCoverageEntries as part of this module's internal workflow.
 *
 * @param coverage - coverage parameter.
 * @returns The computed result produced by this operation.
 */

function hasCoverageEntries(coverage: PageCoverage | null): coverage is PageCoverage {
  return Boolean(coverage && Object.keys(coverage).length > 0);
}

export async function writePageCoverage(page: Page, testInfo: TestInfo): Promise<void> {
  if (!shouldCollectCoverage()) {
    return;
  }

  const coverage = await page
    .evaluate(() => {
      return (
        (globalThis as typeof globalThis & { __coverage__?: PageCoverage }).__coverage__ ?? null
      );
    })
    .catch(() => null);

  if (!hasCoverageEntries(coverage)) {
    return;
  }

  fs.mkdirSync(PLAYWRIGHT_COVERAGE_DIR, { recursive: true });

  const title = sanitizeFileName(
    `${path.basename(testInfo.file, path.extname(testInfo.file))}-${testInfo.title}`,
  );
  const fileName = `${title}-retry${testInfo.retry}-repeat${testInfo.repeatEachIndex}.json`;
  const filePath = path.join(PLAYWRIGHT_COVERAGE_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(coverage, null, 2) + "\n", "utf8");
}
