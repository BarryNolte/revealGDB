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

let totalBenches = 0;
const sections = [];

for (const file of (latest.data.files || [])) {
  const fileName = file.filepath.replace(/\\/g, "/").split("/").slice(-1)[0];
  for (const group of (file.groups || [])) {
    const suiteName = group.fullName.split(" > ").slice(-1)[0];
    totalBenches += (group.benchmarks || []).length;

    const deltaHead = baseline
      ? `<th class="num">Δ Baseline<br><span class="subhead">ops/sec</span></th>
         <th class="num">Δ%</th>`
      : "";

    const rows = (group.benchmarks || []).map((bench) => {
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

    sections.push(`
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
</section>`);
  }
}

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
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
console.log(`  Bench report written to reports/function-benchmark/report.html`);
