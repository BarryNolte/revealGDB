#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const winCwd = process.cwd();

function runSync(cmd, args, opts) {
  const res = spawnSync(cmd, args, Object.assign({ stdio: 'inherit' }, opts));
  if (res.error) {
    console.error(`Failed to run ${cmd}:`, res.error.message || res.error);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status);
}

console.log('Preparing to run function benches inside WSL...');

let wslPath = null;
try {
  const p = spawnSync('wsl', ['wslpath', '-a', '-u', winCwd], { encoding: 'utf8' });
  if (p.status === 0 && p.stdout) wslPath = p.stdout.trim();
} catch (e) {
  // ignore
}

if (!wslPath) {
  // fallback: convert C:\ -> /mnt/c and backslashes
  wslPath = winCwd.replace(/^([A-Za-z]):\\/, (m, drive) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, '/');
}

console.log('WSL path:', wslPath);

// Build command to run inside WSL. Use npx to ensure vitest is available.
// Write environment-specific latest file to avoid clobbering other environments.
const benchOut = 'reports/function-benchmark/latest-wsl.json';
// Include --maxWorkers=1 to reduce chance of worker startup timeouts inside WSL
const benchCmd = `cd '${wslPath}' && node -e "require('node:fs').mkdirSync('reports/function-benchmark',{recursive:true})" && npx vitest --config scripts/vitest-bench.config.cjs bench --run --maxWorkers=1 --outputJson ${benchOut} && node scripts/annotate-function-bench.cjs ${benchOut}`;
console.log('Executing in WSL: ', benchCmd);

runSync('wsl', ['bash', '-lc', benchCmd]);

console.log('Function benches completed in WSL.');
