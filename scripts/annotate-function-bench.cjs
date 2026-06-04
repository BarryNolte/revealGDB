#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const ROOT = process.cwd();
// Accept optional input path as first positional arg or --input <path>
let inputArg = null;
const argv = process.argv.slice(2);
if (argv.length > 0) {
  const idx = argv.indexOf('--input');
  if (idx >= 0 && argv[idx + 1]) inputArg = argv[idx + 1];
  else if (argv[0] && !argv[0].startsWith('-')) inputArg = argv[0];
}
const LATEST = inputArg ? path.resolve(ROOT, inputArg) : path.join(ROOT, 'reports', 'function-benchmark', 'latest.json');
const RUNS_DIR = path.join(ROOT, 'reports', 'function-benchmark', 'runs');

function safeGitHead() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function detectEnvName() {
  // Heuristics: WSL_DISTRO_NAME or /proc/version contains Microsoft => wsl
  try {
    if (process.env.WSL_DISTRO_NAME) return 'wsl';
    if (process.platform === 'win32') return 'windows';
    if (process.platform === 'darwin') return 'mac';
    // check /proc/version for WSL
    try {
      const v = fs.readFileSync('/proc/version', 'utf8');
      if (v.includes('Microsoft')) return 'wsl';
    } catch (e) {}
    if (process.platform === 'linux') return 'linux';
  } catch (e) {}
  return 'unknown';
}

if (!fs.existsSync(LATEST)) {
  console.log(`No function benchmark file found at ${LATEST} — skipping annotation.`);
  process.exit(0);
}

const latestRaw = fs.readFileSync(LATEST, 'utf8');
let latest;
try {
  latest = JSON.parse(latestRaw);
} catch (e) {
  console.error('Failed to parse latest.json:', e.message);
  process.exit(1);
}

const commit = safeGitHead();
const shortCommit = commit === 'unknown' ? 'unknown' : commit.slice(0, 8);
const timestamp = new Date().toISOString();
const envName = detectEnvName();

fs.mkdirSync(RUNS_DIR, { recursive: true });
const runId = `${timestamp.replace(/[:.]/g, '-')}-${shortCommit}-${envName}`;
const runFile = path.join(RUNS_DIR, `${runId}.json`);

const runPayload = {
  schemaVersion: 1,
  timestamp,
  commit,
  shortCommit,
  environment: {
    name: envName,
    platform: process.platform,
    arch: process.arch,
    cpuModel: os.cpus()[0]?.model ?? null,
    numCpus: os.cpus().length,
    hostname: os.hostname(),
  },
  data: latest,
};

fs.writeFileSync(runFile, JSON.stringify(runPayload, null, 2) + '\n', 'utf8');
console.log(`Annotated function benchmark run: ${runFile}`);

// Also write a per-environment latest-<env>.json in the bench dir so
// downstream reporting scripts can select per-platform latest files.
try {
  const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
  fs.mkdirSync(benchDir, { recursive: true });
  const latestEnvFile = path.join(benchDir, `latest-${envName}.json`);
  fs.writeFileSync(latestEnvFile, JSON.stringify(latest, null, 2) + '\n', 'utf8');
  console.log(`Wrote per-platform latest file: ${latestEnvFile}`);

  // Auto-run aggregator to update latest-aggregate.json so reports stay current
  try {
    const aggScript = path.join(ROOT, 'scripts', 'aggregate-latest-bench.cjs');
    if (fs.existsSync(aggScript)) {
      try {
        console.log('Running aggregator to update reports/function-benchmark/latest-aggregate.json');
        execSync(`node "${aggScript}"`, { cwd: ROOT, stdio: 'inherit' });
        console.log('Aggregator completed');
      } catch (err) {
        console.error('Aggregator failed:', err && err.message ? err.message : err);
      }
    } else {
      console.log('Aggregator script not found; skipping aggregation.');
    }
  } catch (err) {
    console.error('Failed while attempting to run aggregator:', err && err.message ? err.message : err);
  }
} catch (e) {
  console.error('Failed to write per-platform latest file or run aggregator:', e && e.message ? e.message : e);
}
