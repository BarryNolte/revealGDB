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

const latest = loadJson(LATEST_FILE);
if (!latest) {
  console.log("  No benchmark data found — skipping bench report.");
  process.exit(0);
}

const baseline = loadJson(BASELINE_FILE);

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
const baselineAt = baseline?.mtime ? new Date(baseline.mtime).toLocaleString() : null;

// ─── Build sections ────────────────────────────────────────────────────────────

// Suites named "GdbCommandWindow — append at dom:N" feed the slowdown chart.
const SLOWDOWN_RE = /^GdbCommandWindow \u2014 append at dom:(\d+)$/;

let totalBenches = 0;
const sections = [];
const slowdownSections = [];
const slowdownGroups = new Map(); // domSize → Map<benchName, meanMs>

for (const file of (latest.data.files || [])) {
  const fileName = file.filepath.replace(/\\/g, "/").split("/").slice(-1)[0];
  for (const group of (file.groups || [])) {
    const suiteName = group.fullName.split(" > ").slice(-1)[0];
    totalBenches += (group.benchmarks || []).length;

    const slowdownMatch = SLOWDOWN_RE.exec(suiteName);
    if (slowdownMatch) {
      const domSize = parseInt(slowdownMatch[1], 10);
      const byType = new Map();
      for (const bench of (group.benchmarks || [])) {
        if (bench.mean != null) byType.set(bench.name, bench.mean);
      }
      slowdownGroups.set(domSize, byType);
    }

    const deltaHead = baseline
      ? `<th class="num">Δ Baseline<br><span class="subhead">ops/sec</span></th>
         <th class="num">Δ%</th>`
      : "";

    const rows = (group.benchmarks || []).map((bench) => {
      // Benchmarks that errored out have no hz/timing fields — render a placeholder row.
      if (bench.hz == null) {
        const colspan = baseline ? 13 : 11;
        return `
        <tr class="bench-error">
          <td class="rank">${bench.rank}</td>
          <td class="bench-name">${esc(bench.name)}</td>
          <td class="num error-label" colspan="${colspan}">⚠ benchmark errored</td>
        </tr>`;
      }

      const key = `${group.fullName}::${bench.name}`;
      const base = baselineMap.get(key);

      let deltaOps = "—";
      let deltaPct = "—";
      let deltaPctClass = "";
      if (base != null) {
        const diffHz = bench.hz - base.hz;
        const pct = (diffHz / base.hz) * 100;
        const sign = diffHz >= 0 ? "+" : "";
        const arrow = diffHz >= 0 ? "↑" : "↓";
        deltaOps = `${sign}${formatHz(Math.abs(diffHz))} ${arrow}`;
        deltaPct = `${sign}${pct.toFixed(1)}%`;
        deltaPctClass = deltaClass(pct);
      } else if (baseline) {
        deltaOps = "new";
        deltaPct = "";
      }

      const deltaRow = baseline
        ? `<td class="num">${esc(deltaOps)}</td>
           <td class="num ${deltaPctClass}">${esc(deltaPct)}</td>`
        : "";

      return `
        <tr>
          <td class="rank">${bench.rank}</td>
          <td class="bench-name">${esc(bench.name)}</td>
          <td class="num">${esc(formatHz(bench.hz))}</td>
          <td class="num">${esc(usStr(bench.mean))}</td>
          <td class="num">${esc(usStr(bench.median))}</td>
          <td class="num">${esc(usStr(bench.p75))}</td>
          <td class="num">${esc(usStr(bench.p99))}</td>
          <td class="num">${esc(usStr(bench.p995))}</td>
          <td class="num">${esc(usStr(bench.p999))}</td>
          <td class="num">${esc(usStr(bench.min))}</td>
          <td class="num">${esc(usStr(bench.max))}</td>
          <td class="num">${esc(`±${bench.rme.toFixed(2)}%`)}</td>
          <td class="num">${esc(bench.sampleCount.toLocaleString())}</td>
          ${deltaRow}
        </tr>`;
    }).join("");

    const sectionHtml = `
<section>
  <h2>${esc(suiteName)} <span class="file-badge">${esc(fileName)}</span></h2>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Benchmark</th>
        <th class="num">Ops / sec</th>
        <th class="num">Mean<br><span class="subhead">(µs)</span></th>
        <th class="num">Median<br><span class="subhead">(µs)</span></th>
        <th class="num">p75<br><span class="subhead">(µs)</span></th>
        <th class="num">p99<br><span class="subhead">(µs)</span></th>
        <th class="num">p99.5<br><span class="subhead">(µs)</span></th>
        <th class="num">p99.9<br><span class="subhead">(µs)</span></th>
        <th class="num">Min<br><span class="subhead">(µs)</span></th>
        <th class="num">Max<br><span class="subhead">(µs)</span></th>
        <th class="num">± Error</th>
        <th class="num">Samples</th>
        ${deltaHead}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  </div>
</section>`;

    if (slowdownMatch) {
      slowdownSections.push(sectionHtml);
    } else {
      sections.push(sectionHtml);
    }
  }
}

// ─── DOM-slowdown chart ────────────────────────────────────────────────────────

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
    ${totalBenches} benchmarks &nbsp;·&nbsp; Run at ${esc(runAt)} &nbsp;·&nbsp; ${baselineMeta}Generated ${esc(generatedAt)}
  </div>
</header>
${sections.join("\n")}
${chartHtml}
${slowdownSections.join("\n")}
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
console.log(`  Bench report written to reports/function-benchmark/report.html`);
