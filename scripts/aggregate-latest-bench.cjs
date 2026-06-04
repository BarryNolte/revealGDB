#!/usr/bin/env node
"use strict";

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
const outFile = path.join(benchDir, 'latest-aggregate.json');

function loadJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return { data: JSON.parse(raw), mtime: fs.statSync(p).mtimeMs, path: p };
  } catch (e) {
    return null;
  }
}

try {
  fs.mkdirSync(benchDir, { recursive: true });
} catch (e) {}

const latestPattern = /^latest-(.+)\.json$/i;
let entries = [];
try {
  const items = fs.readdirSync(benchDir).filter((f) => latestPattern.test(f));
  for (const f of items) {
    const p = path.join(benchDir, f);
    const j = loadJson(p);
    if (!j) continue;

    // Determine environment name
    let env = null;
    try {
      env = j.data && j.data.environment && j.data.environment.name;
      if (!env && j.data && j.data.data && j.data.data.environment) env = j.data.data.environment.name;
    } catch (e) {}
    if (!env) env = f.replace(/^latest-/i, '').replace(/\.json$/i, '');

    // Normalize payload to the vitest files payload when possible
    let payload = j.data;
    if (payload && payload.data && payload.data.files) payload = payload.data;

    entries.push({ env, file: path.relative(ROOT, p).replace(/\\/g, '/'), mtime: j.mtime, data: payload });
  }
} catch (e) {
  console.error('Failed to read bench dir:', e && e.message ? e.message : e);
  process.exit(1);
}

// Sort newest first
entries.sort((a, b) => b.mtime - a.mtime);

const out = {
  generatedAt: new Date().toISOString(),
  platforms: entries,
};

fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`Wrote aggregate: ${path.relative(ROOT, outFile)}`);
