"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const benchDir = path.join(ROOT, "reports", "function-benchmark");

// Accept: [<inputPath>] or --input <path> and optional --env <env>
let latestFile = path.join(benchDir, "latest.json");
const argv = process.argv.slice(2);
let envOverride = null;
let i = 0;
while (i < argv.length) {
  const a = argv[i];
  if (a === "--input" && argv[i + 1]) {
    latestFile = path.resolve(ROOT, argv[i + 1]);
    i += 2;
  } else if (a === "--env" && argv[i + 1]) {
    envOverride = argv[i + 1];
    i += 2;
  } else if (!a.startsWith('-')) {
    latestFile = path.resolve(ROOT, a);
    i += 1;
  } else {
    i += 1;
  }
}

if (!fs.existsSync(latestFile)) {
  process.stderr.write("No function benchmark results found. Run `npm run metrics:bench` first.\n");
  process.exit(1);
}

fs.mkdirSync(benchDir, { recursive: true });

// Try to detect env name from the JSON payload (annotated run) or filename,
// allow explicit override via --env.
let envName = envOverride;
try {
  const raw = fs.readFileSync(latestFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!envName) {
    if (parsed.environment && parsed.environment.name) envName = parsed.environment.name;
    else if (parsed.data && parsed.data.environment && parsed.data.environment.name) envName = parsed.data.environment.name;
    else if (parsed.data && parsed.data.data && parsed.data.data.environment && parsed.data.data.environment.name) envName = parsed.data.data.environment.name;
  }
} catch (e) {
  // ignore parse errors — we'll fall back to filename heuristics
}

if (!envName) {
  const low = path.basename(latestFile).toLowerCase();
  if (low.includes('wsl')) envName = 'wsl';
  else if (low.includes('windows') || low.includes('win')) envName = 'windows';
  else if (low.includes('mac') || low.includes('darwin')) envName = 'mac';
  else if (low.includes('linux') || low.includes('ubuntu')) envName = 'linux';
  else envName = 'unknown';
}

const baselineFile = path.join(benchDir, "baseline.json");
const envBaselineFile = path.join(benchDir, `baseline-${envName}.json`);

fs.copyFileSync(latestFile, baselineFile);
fs.copyFileSync(latestFile, envBaselineFile);

console.log(`  Baseline updated: reports/function-benchmark/${path.basename(baselineFile)}`);
console.log(`  Per-env baseline updated: reports/function-benchmark/${path.basename(envBaselineFile)}`);
console.log("Done.");
