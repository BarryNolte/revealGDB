#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { createCoverageMap } = require("istanbul-lib-coverage");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");

const ROOT = process.cwd();
const COVERAGE_DIR = path.join(ROOT, "coverage");
const NYC_DIR = path.join(ROOT, ".nyc_output");
const VITEST_DIR = path.join(NYC_DIR, "vitest");
const PLAYWRIGHT_DIR = path.join(NYC_DIR, "playwright");
const VITEST_FINAL = path.join(VITEST_DIR, "coverage-final.json");
const CLEAN_ONLY = process.argv.includes("--clean");

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name));
}

function cleanArtifacts() {
  removeDir(COVERAGE_DIR);
  removeDir(VITEST_DIR);
  removeDir(PLAYWRIGHT_DIR);
}

function loadCoverageInputs() {
  const coverageMap = createCoverageMap({});

  if (fs.existsSync(VITEST_FINAL)) {
    coverageMap.merge(readJson(VITEST_FINAL));
  }

  for (const filePath of listJsonFiles(PLAYWRIGHT_DIR)) {
    coverageMap.merge(readJson(filePath));
  }

  return coverageMap;
}

function writeReports(coverageMap) {
  ensureDir(COVERAGE_DIR);

  const context = libReport.createContext({
    dir: COVERAGE_DIR,
    coverageMap,
  });

  reports.create("html").execute(context);
  reports.create("lcovonly", { file: "lcov.info" }).execute(context);
  reports.create("json", { file: "coverage-final.json" }).execute(context);
  reports.create("json-summary", { file: "coverage-summary.json" }).execute(context);
  reports.create("text-summary").execute(context);
}

function main() {
  if (CLEAN_ONLY) {
    cleanArtifacts();
    return;
  }

  const coverageMap = loadCoverageInputs();

  if (coverageMap.files().length === 0) {
    throw new Error(
      "No coverage inputs were found. Run the Vitest coverage lane and the Playwright coverage lane before generating the merged report.",
    );
  }

  writeReports(coverageMap);
}

main();