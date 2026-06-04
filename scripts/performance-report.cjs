#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'performance-report.html');
const FB_RUNS = path.join(ROOT, 'reports', 'function-benchmark', 'runs');
const SB_RUNS = path.join(ROOT, 'reports', 'startup-benchmark', 'runs');

function loadRuns(dir) {
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        return data;
      } catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) { return []; }
}

function envId(run) {
  const env = run.environment || run.data?.environment || {};
  const name = env.name || env.platform || 'unknown';
  const host = env.hostname || env.host || '';
  return host ? `${name} (${host})` : name;
}

function buildStartupTable(startupRuns) {
  const allKeys = new Set();
  const byEnv = {};
  for (const run of startupRuns) {
    const id = envId(run);
    byEnv[id] = run.metrics || run.data?.metrics || {};
    for (const k of Object.keys(byEnv[id])) allKeys.add(k);
  }
  const keys = Array.from(allKeys).sort();
  return { keys, byEnv };
}

function buildFuncTable(funcRuns) {
  // map benchmarkKey -> { env -> medianMs }
  const map = new Map();
  const envs = [];
  for (const run of funcRuns) {
    const id = envId(run);
    envs.push(id);
    const files = run.data?.files || run.files || [];
    for (const file of files) {
      for (const group of file.groups || []) {
        const groupName = group.fullName || group.name || file.filepath || '';
        for (const bench of group.benchmarks || []) {
          const benchName = `${groupName} :: ${bench.name}`;
          const median = bench.median ?? bench.medianMs ?? null;
          // vitest bench median appears in seconds; convert to ms if numeric and <1000
          const medianMs = (typeof median === 'number') ? (median > 0 && median < 1000 ? median * 1000 : median) : null;
          if (!map.has(benchName)) map.set(benchName, {});
          const row = map.get(benchName);
          row[id] = medianMs;
        }
      }
    }
  }
  const rows = Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  return { rows, envs: Array.from(new Set(envs)) };
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderHtml({startup, func}){
  const now = new Date().toISOString();
  const envs = new Set();
  for (const e of Object.keys(startup.byEnv || {})) envs.add(e);
  for (const e of (func.envs||[])) envs.add(e);
  const envList = Array.from(envs);

  let html = `<!doctype html><html><head><meta charset="utf-8"><title>Performance Comparison Report</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:24px}
    table{border-collapse:collapse;width:100%;margin-bottom:24px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f6f8fa}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    h1,h2{margin:8px 0}
  </style></head><body>
  <h1>Performance Comparison</h1>
  <p>Generated: ${esc(now)}</p>
  <h2>Environments</h2>
  <ul>
  `;
  for (const e of envList) html += `<li>${esc(e)}</li>`;
  html += `</ul>`;

  // Startup table
  html += `<h2>Startup Benchmark (median ms)</h2>`;
  if (!startup.keys || startup.keys.length === 0) html += `<p>No startup run data found.</p>`;
  else {
    html += `<table><thead><tr><th>Milestone</th>`;
    for (const e of envList) html += `<th class="num">${esc(e)}</th>`;
    html += `</tr></thead><tbody>`;
    for (const k of startup.keys) {
      html += `<tr><td>${esc(k)}</td>`;
      for (const e of envList) {
        const v = startup.byEnv[e] && startup.byEnv[e][k] && (startup.byEnv[e][k].medianMs ?? startup.byEnv[e][k].median) ;
        html += `<td class="num">${v != null ? esc(String(v)) + ' ms' : '—'}</td>`;
      }
      html += '</tr>';
    }
    html += `</tbody></table>`;
  }

  // Function bench table
  html += `<h2>Function Benchmarks (median ms)</h2>`;
  if (!func.rows || func.rows.length === 0) html += `<p>No function benchmark runs found.</p>`;
  else {
    html += `<table><thead><tr><th>Benchmark</th>`;
    for (const e of func.envs) html += `<th class="num">${esc(e)}</th>`;
    html += `</tr></thead><tbody>`;
    for (const [name, map] of func.rows) {
      html += `<tr><td>${esc(name)}</td>`;
      for (const e of func.envs) {
        const v = map[e];
        html += `<td class="num">${v != null ? esc(String(Math.round(v*10)/10)) + ' ms' : '—'}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
  }

  html += `</body></html>`;
  return html;
}

function main(){
  const funcRuns = loadRuns(FB_RUNS);
  const startupRuns = loadRuns(SB_RUNS);

  const startup = buildStartupTable(startupRuns);
  const func = buildFuncTable(funcRuns);

  // normalize env keys: startup.byEnv currently keyed by envId; ensure keys align with func.envs
  const startupByEnvNormalized = {};
  for (const r of startupRuns) startupByEnvNormalized[envId(r)] = r.metrics || r.data?.metrics || {};
  startup.byEnv = startupByEnvNormalized;

  // ensure func.envs is unique
  func.envs = Array.from(new Set(func.envs));

  const html = renderHtml({startup, func});
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');
  console.log('Performance report written to', OUT);
}

main();
