/**
 * Reads reports/function-benchmark/latest.json (and baseline.json if present)
 * and generates a full self-contained HTML report at
 * reports/function-benchmark/report.html.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const LATEST_FILE = path.join(ROOT, "reports", "function-benchmark", "latest.json");
const BASELINE_FILE = path.join(ROOT, "reports", "function-benchmark", "baseline.json");
const OUT = path.join(ROOT, "reports", "function-benchmark", "report.html");

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { data: JSON.parse(raw), mtime: fs.statSync(filePath).mtime };
  } catch {
    return null;
  }
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHz(hz) {
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(3)}M`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(2)}K`;
  return hz.toFixed(0);
}

function usStr(ms) {
  return (ms * 1000).toFixed(2);
}

function deltaClass(pct) {
  if (pct <= -25) return "bad";
  if (pct <= -10) return "warn";
  if (pct >= 5) return "good";
  return "";
}

/** Generates an inline SVG multi-line chart from slowdown bench data.
 *  slowdownGroups: Map<domSize:number, Map<benchName:string, meanMs:number>> */
function generateSlowdownChart(slowdownGroups) {
  const domSizes = [...slowdownGroups.keys()].sort((a, b) => a - b);
  if (domSizes.length < 2) return "";

  // Names must exactly match the bench() name strings in the bench file.
  const SERIES = [
    { name: "console \xD7100", color: "#3fb950" },
    { name: "log \xD7100",     color: "#58a6ff" },
    { name: "error \xD7100",   color: "#f85149" },
    { name: "debug \xD7100",   color: "#d29922" },
    { name: "html \xD7100",    color: "#bc8cff" },
  ];

  let maxMs = 0;
  for (const byType of slowdownGroups.values()) {
    for (const ms of byType.values()) {
      if (ms > maxMs) maxMs = ms;
    }
  }
  if (maxMs === 0) return "";
  maxMs *= 1.2;

  const W = 680, H = 280;
  const PAD = { top: 20, right: 150, bottom: 50, left: 72 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const n = domSizes.length;
  const xOf = (i) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (ms) => PAD.top + plotH * (1 - ms / maxMs);

  const Y_TICKS = 5;
  let grids = "";
  let yLabels = "";
  for (let t = 0; t <= Y_TICKS; t++) {
    const ms = (t / Y_TICKS) * maxMs;
    const y = yOf(ms).toFixed(1);
    grids += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}" stroke="#21262d" stroke-width="1"/>`;
    const label = ms >= 1 ? `${ms.toFixed(2)}ms` : `${(ms * 1000).toFixed(1)}\u03bcs`;
    yLabels += `<text x="${PAD.left - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#6e7681" font-size="10">${esc(label)}</text>`;
  }

  let xLabels = "";
  domSizes.forEach((sz, i) => {
    xLabels += `<text x="${xOf(i).toFixed(1)}" y="${(PAD.top + plotH + 16).toFixed(1)}" text-anchor="middle" fill="#6e7681" font-size="10">${sz.toLocaleString()}</text>`;
  });

  let paths = "";
  let dots = "";
  for (const { name, color } of SERIES) {
    const pts = domSizes
      .map((sz, i) => {
        const ms = slowdownGroups.get(sz)?.get(name);
        return ms != null ? { x: xOf(i), y: yOf(ms), ms } : null;
      })
      .filter(Boolean);
    if (pts.length < 2) continue;

    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of pts) {
      const tip = p.ms >= 1 ? `${p.ms.toFixed(3)}ms` : `${(p.ms * 1000).toFixed(2)}\u03bcs`;
      dots += `<g><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"/><title>${esc(name)}: ${esc(tip)}</title></g>`;
    }
  }

  let legend = "";
  SERIES.forEach(({ name, color }, i) => {
    const lx = PAD.left + plotW + 14;
    const ly = PAD.top + 4 + i * 22;
    legend += `<line x1="${lx}" y1="${ly + 5}" x2="${lx + 16}" y2="${ly + 5}" stroke="${color}" stroke-width="2.5"/>`;
    legend += `<circle cx="${lx + 8}" cy="${ly + 5}" r="3" fill="${color}"/>`;
    legend += `<text x="${lx + 22}" y="${ly + 5}" dominant-baseline="middle" fill="#c9d1d9" font-size="11">${esc(name)}</text>`;
  });

  const axisLines =
    `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}" stroke="#30363d" stroke-width="1"/>` +
    `<line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}" stroke="#30363d" stroke-width="1"/>`;
  const xTitle = `<text x="${((2 * PAD.left + plotW) / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#8b949e" font-size="11">Messages pre-filled in DOM</text>`;
  const yTitle = `<text transform="rotate(-90)" x="${(-(PAD.top + plotH / 2)).toFixed(1)}" y="14" text-anchor="middle" fill="#8b949e" font-size="11">Mean latency (100 appends)</text>`;

  return (
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"` +
    ` style="display:block;background:#0d1117;border-radius:6px;border:1px solid #30363d;overflow:visible">` +
    axisLines + grids + yLabels + xLabels + xTitle + yTitle + paths + dots + legend +
    `</svg>`
  );
}

let latest = loadJson(LATEST_FILE);
if (!latest) {
  // If latest.json isn't present, attempt to pick the newest per-env latest-*.json
  try {
    const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
    const items = fs.readdirSync(benchDir).filter((f) => f.startsWith('latest-') && f.endsWith('.json'));
    let newest = null;
    for (const f of items) {
      const p = path.join(benchDir, f);
      const j = loadJson(p);
      if (!j) continue;
      if (!newest || j.mtime > newest.mtime) newest = { j, p };
    }
    if (newest) {
      latest = newest.j;
      console.log(`  Using per-platform latest file: ${path.basename(newest.p)}`);
    }
  } catch (e) {
    // ignore
  }
}
if (!latest) {
  console.log("  No benchmark data found — skipping bench report.");
  process.exit(0);
}

// If latest exists but contains no environment metadata, prefer the newest
// `latest-<env>.json` file (this supports dividing results by platform).
try {
  let hasEnv = false;
  if (latest && latest.data) {
    if (latest.data.environment) hasEnv = true;
    else if (latest.data.data && latest.data.data.environment) hasEnv = true;
  }
  if (!hasEnv) {
    const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
    const items = fs.readdirSync(benchDir).filter((f) => f.startsWith('latest-') && f.endsWith('.json'));
    let newest = null;
    for (const f of items) {
      const p = path.join(benchDir, f);
      const j = loadJson(p);
      if (!j) continue;
      if (!newest || j.mtime > newest.mtime) newest = { j, p };
    }
    if (newest) {
      latest = newest.j;
      console.log(`  Switched to per-platform latest file: ${path.basename(newest.p)}`);
    }
  }
} catch (e) {}

// Determine which baseline to use. Priority:
// 1) explicit baseline path passed as first arg
// 2) env-specific baseline (baseline-<env>.json) if latest run contains env info
// 3) default baseline.json
const argv = process.argv.slice(2);
let baseline = null;
if (argv.length > 0 && argv[0] && !argv[0].startsWith('-')) {
  const explicit = path.resolve(ROOT, argv[0]);
  if (fs.existsSync(explicit)) baseline = loadJson(explicit);
}

if (!baseline) {
  let runEnvName = null;
  try {
    if (latest.data && latest.data.environment) runEnvName = latest.data.environment.name;
    else if (latest.data && latest.data.data && latest.data.data.environment) runEnvName = latest.data.data.environment.name;
  } catch (e) {}

  if (runEnvName) {
    const envBaselinePath = path.join(ROOT, 'reports', 'function-benchmark', `baseline-${runEnvName}.json`);
    if (fs.existsSync(envBaselinePath)) baseline = loadJson(envBaselinePath);
  }
}

// Do NOT fall back to a shared/common baseline. Prefer per-env baseline
// (baseline-<env>.json). If none exists for the run's environment, show
// the report without a baseline.

// Build baseline lookup: `${groupFullName}::${name}` → {hz, p99, mean}
const baselineMap = new Map();
if (baseline) {
  for (const file of (baseline.data.files || [])) {
    for (const group of (file.groups || [])) {
      for (const bench of (group.benchmarks || [])) {
        baselineMap.set(`${group.fullName}::${bench.name}`, bench);
      }
    }
  }
}

const generatedAt = new Date().toLocaleString();
const runAt = latest.mtime ? new Date(latest.mtime).toLocaleString() : "unknown";
// Extract environment metadata if present in an annotated run file or payload
let runEnv = null;
try {
  if (latest.data && latest.data.environment) runEnv = latest.data.environment;
  else if (latest.data && latest.data.data && latest.data.data.environment) runEnv = latest.data.data.environment;
} catch (e) {}

// Normalize payload: accept either raw vitest JSON or annotated run (where payload is in latest.data.data)
const payload = (latest && latest.data && latest.data.files)
  ? latest.data
  : (latest && latest.data && latest.data.data && latest.data.data.files)
    ? latest.data.data
    : (latest && latest.data) ? latest.data : {};
const baselineAt = baseline?.mtime ? new Date(baseline.mtime).toLocaleString() : null;

// Discover other platform latest runs (latest-<env>.json) so we can
// highlight platform differences (current run vs other platforms).
let otherLatestPayloads = [];
try {
  const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
  const items = fs.readdirSync(benchDir).filter((f) => f.startsWith('latest-') && f.endsWith('.json'));
  for (const f of items) {
    const p = path.join(benchDir, f);
    if (path.resolve(p) === path.resolve(LATEST_FILE)) continue;
    const j = loadJson(p);
    if (!j) continue;
    const otherData = (j && j.data && j.data.files)
      ? j.data
      : (j && j.data && j.data.data && j.data.data.files)
        ? j.data.data
        : (j && j.data) ? j.data : {};
    const envName = (otherData && otherData.environment && otherData.environment.name) || f.replace(/^latest-/, '').replace(/\.json$/, '');
    otherLatestPayloads.push({ path: p, env: envName, data: otherData, mtime: j.mtime });
  }
} catch (e) {
  otherLatestPayloads = [];
}

// ─── Build sections ────────────────────────────────────────────────────────────

// Suites named "GdbCommandWindow — append at dom:N" feed the slowdown chart.
const SLOWDOWN_RE = /^GdbCommandWindow \u2014 append at dom:(\d+)$/;

let totalBenches = 0;
const sections = [];
const slowdownSections = [];
const slowdownGroups = new Map(); // domSize → Map<benchName, meanMs>

// Platforms ordered: canonical latest first, then any latest-<env>.json files
const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
const platforms = [];
const primaryEnvName = runEnv?.name || 'unknown';
platforms.push({ env: primaryEnvName, data: payload, mtime: latest.mtime, path: LATEST_FILE });
for (const o of otherLatestPayloads) platforms.push({ env: o.env, data: o.data, mtime: o.mtime, path: o.path });

for (let pIdx = 0; pIdx < platforms.length; pIdx++) {
  const plat = platforms[pIdx];
  const envName = plat.env;
  const data = plat.data || {};

  // Load per-env baseline if present (no shared fallback)
  const envBaselinePath = path.join(benchDir, `baseline-${envName}.json`);
  const envBaseline = fs.existsSync(envBaselinePath) ? loadJson(envBaselinePath) : null;
  const envBaselineMap = new Map();
  if (envBaseline) {
    for (const f of (envBaseline.data.files || [])) {
      for (const g of (f.groups || [])) {
        for (const b of (g.benchmarks || [])) {
          envBaselineMap.set(`${g.fullName}::${b.name}`, b);
        }
      }
    }
  }

  for (const file of (data.files || [])) {
    const fileName = (file.filepath || file.file || '').replace(/\\/g, "/").split("/").slice(-1)[0];
    for (const group of (file.groups || [])) {
      const suiteName = group.fullName.split(" > ").slice(-1)[0];
      if (pIdx === 0) totalBenches += (group.benchmarks || []).length;

      const slowdownMatch = SLOWDOWN_RE.exec(suiteName);
      if (slowdownMatch && pIdx === 0) {
        const domSize = parseInt(slowdownMatch[1], 10);
        const byType = new Map();
        for (const bench of (group.benchmarks || [])) {
          if (bench.mean != null) byType.set(bench.name, bench.mean);
        }
        slowdownGroups.set(domSize, byType);
      }

      const envBaselineHead = envBaseline
        ? `<th class="num">Baseline<br><span class="subhead">ops/sec</span></th><th class="num">Baseline<br><span class="subhead">± Error</span></th>`
        : "";
      const envDeltaHead = envBaseline
        ? `<th class="num">Δ Baseline<br><span class="subhead">ops/sec</span></th><th class="num">Δ%</th>`
        : "";

      const rows = (group.benchmarks || []).map((bench) => {
        if (bench.hz == null) {
          const colspan = envBaseline ? 8 : 7;
          return `
        <tr class="bench-error">
          <td class="rank">${bench.rank}</td>
          <td class="bench-name">${esc(bench.name)}: ${esc(envName)}</td>
          <td class="num error-label" colspan="${colspan}">⚠ benchmark errored</td>
        </tr>`;
        }

        const key = `${group.fullName}::${bench.name}`;
        const base = envBaselineMap.get(key);

        let baseHzStr = "—";
        let baseRmeStr = "—";
        if (base != null && base.hz != null) {
          baseHzStr = formatHz(base.hz);
          baseRmeStr = `±${base.rme.toFixed(2)}%`;
        }

        let deltaOps = "—";
        let deltaPct = "—";
        let deltaPctClass = "";
        if (base != null && base.hz != null) {
          const diffHz = bench.hz - base.hz;
          const pct = (diffHz / base.hz) * 100;
          const sign = diffHz >= 0 ? "+" : "";
          const arrow = diffHz >= 0 ? "↑" : "↓";
          deltaOps = `${sign}${formatHz(Math.abs(diffHz))} ${arrow}`;
          deltaPct = `${sign}${pct.toFixed(1)}%`;
          deltaPctClass = deltaClass(pct);
        } else if (envBaseline) {
          deltaOps = "new";
          deltaPct = "";
        }

        const baselineCells = envBaseline
          ? `<td class="num">${esc(baseHzStr)}</td><td class="num">${esc(baseRmeStr)}</td>`
          : "";

        const deltaRow = envBaseline
          ? `<td class="num">${esc(deltaOps)}</td>
           <td class="num ${deltaPctClass}">${esc(deltaPct)}</td>`
          : "";

        return `
        <tr>
          <td class="rank">${bench.rank}</td>
          <td class="bench-name">${esc(bench.name)}: ${esc(envName)}</td>
          <td class="num">${esc(formatHz(bench.hz))}</td>
          <td class="num">${esc(usStr(bench.mean))}</td>
          <td class="num">${esc(usStr(bench.median))}</td>
          <td class="num">${esc(usStr(bench.min))}</td>
          <td class="num">${esc(usStr(bench.max))}</td>
          <td class="num">${esc(`±${bench.rme.toFixed(2)}%`)}</td>
          <td class="num">${esc(bench.sampleCount.toLocaleString())}</td>
          ${baselineCells}
          ${deltaRow}
        </tr>`;
      }).join("");

      const sectionHtml = `
<section>
  <h2>${esc(suiteName)} <span class="file-badge">${esc(fileName)}</span> · ${esc(envName)}</h2>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Benchmark</th>
        <th class="num">Ops / sec</th>
        <th class="num">Mean<br><span class="subhead">(µs)</span></th>
        <th class="num">Median<br><span class="subhead">(µs)</span></th>
        <th class="num">Min<br><span class="subhead">(µs)</span></th>
        <th class="num">Max<br><span class="subhead">(µs)</span></th>
        <th class="num">± Error</th>
        <th class="num">Samples</th>
        ${envBaselineHead}
        ${envDeltaHead}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  </div>
</section>`;

      if (slowdownMatch && pIdx === 0) {
        slowdownSections.push(sectionHtml);
      } else {
        sections.push(sectionHtml);
      }
    }
  }
}

// ─── DOM-slowdown chart ────────────────────────────────────────────────────────

// Build platform-differences HTML: produce pairwise comparisons for all
// detected latest runs (including the canonical latest). Each table will
// label columns with platform names and show bench cells as
// "<benchName>: <platform> — <ops>".
let platformDiffHtml = "";
try {
  const allLatest = [];
  const currentEnvName = runEnv?.name || 'current';
  allLatest.push({ env: currentEnvName, data: payload, mtime: latest.mtime });
  for (const o of otherLatestPayloads) allLatest.push({ env: o.env, data: o.data, mtime: o.mtime });

  const pdOuter = [];
  for (let i = 0; i < allLatest.length; i++) {
    for (let j = i + 1; j < allLatest.length; j++) {
      const A = allLatest[i];
      const B = allLatest[j];

      // Build lookup maps for both platforms
      const mapB = new Map();
      for (const f of (B.data.files || [])) {
        for (const g of (f.groups || [])) {
          for (const b of (g.benchmarks || [])) {
            mapB.set(`${g.fullName}::${b.name}`, b);
          }
        }
      }

      const groupHtml = [];
      for (const file of (A.data.files || [])) {
        const fileName = (file.filepath || file.file || '').replace(/\\/g, "/").split("/").slice(-1)[0];
        for (const group of (file.groups || [])) {
          const suiteName = group.fullName.split(" > ").slice(-1)[0];
          const rows = (group.benchmarks || []).map((bench) => {
            const key = `${group.fullName}::${bench.name}`;
            const otherBench = mapB.get(key);

            const aLabel = `${bench.name}: ${A.env}`;
            const aVal = bench.hz != null ? formatHz(bench.hz) : "—";

            let bLabel = `${bench.name}: ${B.env}`;
            let bVal = otherBench && otherBench.hz != null ? formatHz(otherBench.hz) : "—";

            let diffStr = '—';
            let diffCls = '';
            if (otherBench && otherBench.hz != null && bench.hz != null) {
              const diffHz = bench.hz - otherBench.hz;
              const pct = (diffHz / otherBench.hz) * 100;
              const sign = diffHz >= 0 ? '+' : '';
              const arrow = diffHz >= 0 ? '↑' : '↓';
              diffStr = `${sign}${pct.toFixed(1)}% ${arrow}`;
              diffCls = deltaClass(pct);
            }

            return `<tr><td class="rank">${bench.rank}</td><td class="bench-name">${esc(bench.name)}</td><td class="num"><div class=\"bench-cell\"><span class=\"bench-label\">${esc(aLabel)}</span><br/><span class=\"bench-val\">${esc(aVal)}</span></div></td><td class="num"><div class=\"bench-cell\"><span class=\"bench-label\">${esc(bLabel)}</span><br/><span class=\"bench-val\">${esc(bVal)}</span></div></td><td class="num ${diffCls}">${esc(diffStr)}</td></tr>`;
          }).join('');

          groupHtml.push(`
  <h3>${esc(suiteName)} <span class="file-badge">${esc(fileName)}</span></h3>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Benchmark</th>
        <th class="num">${esc(A.env)}</th>
        <th class="num">${esc(B.env)}</th>
        <th class="num">Δ%</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  </div>`);
        }
      }

      if (groupHtml.length > 0) {
        pdOuter.push(`<section><h2>Platform differences — ${esc(A.env)} vs ${esc(B.env)}</h2>${groupHtml.join('\n')}</section>`);
      }
    }
  }

  platformDiffHtml = pdOuter.join('\n');
} catch (e) {
  platformDiffHtml = '';
}

const chartHtml = slowdownGroups.size >= 2
  ? `
<section>
  <h2>GdbCommandWindow \u2014 Append Latency vs DOM Size</h2>
  <p class="chart-note">Mean time to append \xD7100 messages as the output div pre-fills. Larger DOM \u2192 more reflow work per append.</p>
  <div class="chart-wrap">${generateSlowdownChart(slowdownGroups)}</div>
</section>`
  : "";

// ─── HTML ─────────────────────────────────────────────────────────────────────

const baselineMeta = baseline
  ? `Baseline from ${esc(baselineAt)} &nbsp;·&nbsp; `
  : `<span class="no-baseline">No baseline — run <code>npm run metrics:bench:set-baseline</code> to capture one</span> &nbsp;·&nbsp; `;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>revealGDB — Function Benchmark Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    background: #0d1117;
    color: #c9d1d9;
    padding: 24px 32px;
  }

  header { margin-bottom: 28px; }
  header h1 { font-size: 20px; font-weight: 600; color: #e6edf3; }
  header .meta {
    font-size: 11px;
    color: #6e7681;
    margin-top: 6px;
    line-height: 1.6;
  }
  header .meta code {
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 10px;
    background: #21262d;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .no-baseline { color: #d29922; }

  section {
    margin-bottom: 36px;
  }
  section h2 {
    font-size: 15px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .file-badge {
    font-size: 11px;
    font-weight: 400;
    color: #8b949e;
    font-family: "SFMono-Regular", Consolas, monospace;
    background: #21262d;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #30363d;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 20px;
    font-size: 12px;
    color: #58a6ff;
    text-decoration: none;
  }
  .back-link:hover { text-decoration: underline; }

  .table-wrap {
    overflow-x: auto;
  }

  .chart-wrap {
    overflow-x: auto;
  }

  .chart-note {
    font-size: 12px;
    color: #8b949e;
    margin-bottom: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 900px;
  }
  th {
    text-align: left;
    color: #6e7681;
    font-weight: 500;
    border-bottom: 2px solid #30363d;
    padding: 5px 8px;
    white-space: nowrap;
    vertical-align: bottom;
    line-height: 1.3;
  }
  th.num { text-align: right; }
  .subhead { color: #484f58; font-size: 10px; display: block; }

  td {
    padding: 5px 8px;
    border-bottom: 1px solid #21262d;
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #161b22; }

  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.rank { text-align: right; color: #6e7681; font-size: 11px; width: 28px; }
  td.bench-name {
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 11px;
    white-space: nowrap;
  }

  .good { color: #3fb950; }
  .warn { color: #d29922; }
  .bad  { color: #f85149; }
</style>
</head>
<body>
<a class="back-link" href="../dashboard.html">← Dashboard</a>
<header>
  <h1>revealGDB — Function Benchmark Report</h1>
  <div class="meta">
    ${totalBenches} benchmarks &nbsp;·&nbsp; Run at ${esc(runAt)} ${runEnv ? `&nbsp;·&nbsp; Env: ${esc(runEnv.name)} (${esc(runEnv.platform)})` : ''} &nbsp;·&nbsp; ${baselineMeta}Generated ${esc(generatedAt)}
  </div>
</header>
${sections.join("\n")}
${chartHtml}
${slowdownSections.join("\n")}
${platformDiffHtml}
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
console.log(`  Bench report written to reports/function-benchmark/report.html`);
