"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const benchDir = path.join(ROOT, "reports", "function-benchmark");
const latestFile = path.join(benchDir, "latest.json");
const baselineFile = path.join(benchDir, "baseline.json");

if (!fs.existsSync(latestFile)) {
  process.stderr.write(
    "No function benchmark results found. Run `npm run metrics:bench` first.\n",
  );
  process.exit(1);
}

fs.mkdirSync(benchDir, { recursive: true });
fs.copyFileSync(latestFile, baselineFile);

console.log("  Baseline updated: reports/function-benchmark/baseline.json");
console.log("Done.");
