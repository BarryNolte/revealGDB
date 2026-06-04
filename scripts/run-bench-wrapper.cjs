#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const out = argv[0] || path.join('reports', 'function-benchmark', 'latest-windows.json');

fs.mkdirSync(path.dirname(out), { recursive: true });

console.log('Running Vitest bench with minimal config. Output:', out);

// Limit workers to 1 for more stable CI/WSL runs and avoid worker startup timeouts
const args = ['vitest', '--config', 'scripts/vitest-bench.config.cjs', 'bench', '--run', '--maxWorkers=1', '--outputJson', out];

// Use npx to ensure local vitest is found
const res = spawnSync('npx', args, { stdio: 'inherit', cwd: ROOT, shell: true });
if (res.error) {
  console.error('Failed to run vitest via npx:', res.error);
  process.exit(1);
}
if (res.status !== 0) {
  console.error('Vitest returned non-zero exit code', res.status);
  process.exit(res.status || 1);
}

// After vitest completes, run annotator to write the runs file
console.log('Annotating bench output...');
const annotate = spawnSync('node', ['scripts/annotate-function-bench.cjs', out], { stdio: 'inherit', cwd: ROOT, shell: true });
if (annotate.error) {
  console.error('Failed to annotate:', annotate.error);
  process.exit(1);
}
if (annotate.status !== 0) {
  console.error('Annotator returned non-zero exit code', annotate.status);
  process.exit(annotate.status || 1);
}

console.log('Bench run complete.');
