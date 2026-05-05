/**
 * Reads existing report outputs and generates a self-contained
 * reports/dashboard.html file with five metric cards:
 *   - Coverage
 *   - Startup Benchmark
 *   - Maintainability
 *   - Function Benchmarks
 *   - Coupling
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "reports", "dashboard.html");

// ─── Data loaders ─────────────────────────────────────────────────────────────

function loadJson(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { data, mtime: stat.mtimeMs };
  } catch {
    return null;
  }
}

function loadFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    return { content, mtime: stat.mtimeMs };
  } catch {
    return null;
  }
}

function relativeAge(mtimeMs) {
  if (!mtimeMs) return null;
  const diffMs = Date.now() - mtimeMs;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function staleLabel(mtime, cmd) {
  if (!mtime) return `<span class="stale no-data">No data — run <code>${esc(cmd)}</code></span>`;
  return `<span class="stale">${esc(relativeAge(mtime))}</span>`;
}

function pctColor(pct) {
  if (pct >= 80) return "good";
  if (pct >= 60) return "warn";
  return "bad";
}

function deltaColor(deltaMs, deltaPct) {
  // Red only if BOTH thresholds exceeded (matches startup-benchmark logic)
  if (deltaMs > 200 && deltaPct > 10) return "bad";
  if (deltaMs > 100 || deltaPct > 5) return "warn";
  return "good";
}

function ccColor(cc) {
  if (cc >= 25) return "bad";
  if (cc >= 15) return "warn";
  return "good";
}

// ─── Card builders ────────────────────────────────────────────────────────────

function coverageCard() {
  const file = path.join(ROOT, "coverage", "coverage-summary.json");
  const result = loadJson(file);

  if (!result) {
    return `
<div class="card">
  <h2>Coverage</h2>
  ${staleLabel(null, "npm run test:coverage")}
  <p class="empty">No coverage data found.</p>
</div>`;
  }

  const { data, mtime } = result;
  const total = data.total;
  const metrics = [
    { label: "Statements", pct: total.statements.pct, covered: total.statements.covered, tot: total.statements.total },
    { label: "Branches", pct: total.branches.pct, covered: total.branches.covered, tot: total.branches.total },
    { label: "Functions", pct: total.functions.pct, covered: total.functions.covered, tot: total.functions.total },
    { label: "Lines", pct: total.lines.pct, covered: total.lines.covered, tot: total.lines.total },
  ];

  const bars = metrics.map(({ label, pct, covered, tot }) => {
    const cls = pctColor(pct);
    const rounded = Math.round(pct * 10) / 10;
    return `
    <div class="metric-row">
      <span class="metric-label">${esc(label)}</span>
      <div class="bar-wrap">
        <div class="bar ${cls}" style="width:${Math.min(pct, 100)}%"></div>
      </div>
      <span class="metric-val ${cls}">${rounded}%</span>
      <span class="metric-sub">${covered}/${tot}</span>
    </div>`;
  }).join("");

  return `
<div class="card">
  <h2>Coverage <a class="card-link" href="../coverage/index.html">full report →</a></h2>
  ${staleLabel(mtime, "npm run test:coverage")}
  <div class="metrics">${bars}
  </div>
</div>`;
}

function startupCard() {
  const latestFile = path.join(ROOT, "reports", "startup-benchmark", "latest.json");
  const baselineFile = path.join(ROOT, "reports", "startup-benchmark", "baseline.json");

  const latest = loadJson(latestFile);
  const baseline = loadJson(baselineFile);

  if (!latest) {
    return `
<div class="card">
  <h2>Startup Benchmark</h2>
  ${staleLabel(null, "npm run metrics:benchmark")}
  <p class="empty">No benchmark data found.</p>
</div>`;
  }

  const KEY_MILESTONES = [
    "main-window-created",
    "main-window-ready-to-show",
    "main-window-shown",
  ];

  const rows = KEY_MILESTONES.map((key) => {
    const lMetric = latest.data.metrics?.[key];
    const bMetric = baseline?.data?.metrics?.[key];
    const cur = lMetric?.medianMs ?? null;
    const bas = bMetric?.medianMs ?? null;
    const deltaMs = cur !== null && bas !== null ? cur - bas : null;
    const deltaPct = cur !== null && bas !== null ? ((cur - bas) / bas) * 100 : null;

    const curStr = cur !== null ? `${cur}ms` : "—";
    const basStr = bas !== null ? `${bas}ms` : "—";
    let deltaStr = "—";
    let deltaClass = "";
    if (deltaMs !== null) {
      const sign = deltaMs >= 0 ? "+" : "";
      deltaStr = `${sign}${deltaMs}ms (${sign}${Math.round(deltaPct)}%)`;
      deltaClass = deltaColor(Math.abs(deltaMs), Math.abs(deltaPct));
    }

    const shortKey = key.replace("main-window-", "");
    return `
      <tr>
        <td>${esc(shortKey)}</td>
        <td class="num">${esc(curStr)}</td>
        <td class="num">${esc(basStr)}</td>
        <td class="num ${deltaClass}">${esc(deltaStr)}</td>
      </tr>`;
  }).join("");

  const meta = `${latest.data.sampleCount} sample${latest.data.sampleCount !== 1 ? "s" : ""}, commit ${esc(latest.data.shortCommit ?? "?")}`;

  return `
<div class="card">
  <h2>Startup Benchmark</h2>
  ${staleLabel(latest.mtime, "npm run metrics:benchmark")}
  <p class="card-meta">${meta}</p>
  <table>
    <thead><tr><th>Milestone</th><th>Current</th><th>Baseline</th><th>Delta</th></tr></thead>
    <tbody>${rows}
    </tbody>
  </table>
</div>`;
}

function maintainabilityCard() {
  const file = path.join(ROOT, "reports", "maintainability", "complexity-report.json");
  const result = loadJson(file);

  if (!result) {
    return `
<div class="card">
  <h2>Maintainability</h2>
  ${staleLabel(null, "npm run metrics:maintainability")}
  <p class="empty">No maintainability data found.</p>
</div>`;
  }

  const { data, mtime } = result;
  const buckets = (data.buckets || []);

  const bucketRows = buckets.map((b) => {
    const warnCls = b.fnOver15 > 0 ? "warn" : "";
    const errCls = b.fnOver25 > 0 ? "bad" : "";
    return `
      <tr>
        <td>${esc(b.name)}</td>
        <td class="num">${b.fileCount}</td>
        <td class="num">${b.fnCount}</td>
        <td class="num">${b.avgCC}</td>
        <td class="num ${warnCls}">${b.fnOver15}</td>
        <td class="num ${errCls}">${b.fnOver25}</td>
      </tr>`;
  }).join("");

  const hotspots = (data.topHotspots || []).slice(0, 5);
  const hotRows = hotspots.map((h) => {
    const cls = ccColor(h.cc);
    const shortFile = h.file.replace(/^src\//, "");
    const absPath = path.join(ROOT, h.file).replace(/\\/g, "/");
    const vscodeHref = `vscode://file/${absPath}:${h.line}`;
    return `
      <tr>
        <td class="fn-name"><a class="src-link" href="${esc(vscodeHref)}">${esc(h.fnName)}</a></td>
        <td class="fn-file"><a class="src-link" href="${esc(vscodeHref)}" title="${esc(h.file)}">${esc(shortFile)}:${h.line}</a></td>
        <td class="num ${cls}">${h.cc}</td>
      </tr>`;
  }).join("");

  return `
<div class="card">
  <h2>Maintainability <a class="card-link" href="maintainability/complexity-report.html">full report →</a></h2>
  ${staleLabel(mtime, "npm run metrics:maintainability")}
  <h3>Buckets</h3>
  <table>
    <thead><tr><th>Bucket</th><th>Files</th><th>Fns</th><th>Avg CC</th><th>CC≥15</th><th>CC≥25</th></tr></thead>
    <tbody>${bucketRows}
    </tbody>
  </table>
  <h3>Top 5 Hotspots</h3>
  <table>
    <thead><tr><th>Function</th><th>Location</th><th>CC</th></tr></thead>
    <tbody>${hotRows}
    </tbody>
  </table>
</div>`;
}

function benchCard() {
  const latestFile = path.join(ROOT, "reports", "function-benchmark", "latest.json");
  const baselineFile = path.join(ROOT, "reports", "function-benchmark", "baseline.json");

  const latest = loadJson(latestFile);
  const baseline = loadJson(baselineFile);

  if (!latest) {
    return `
<div class="card">
  <h2>Function Benchmarks</h2>
  ${staleLabel(null, "npm run metrics:bench")}
  <p class="empty">No benchmark data found.</p>
</div>`;
  }

  // Build lookup: `${groupFullName}::${name}` → hz
  const baselineHz = new Map();
  if (baseline) {
    for (const file of (baseline.data.files || [])) {
      for (const group of (file.groups || [])) {
        for (const bench of (group.benchmarks || [])) {
          baselineHz.set(`${group.fullName}::${bench.name}`, bench.hz);
        }
      }
    }
  }

  function formatHz(hz) {
    if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
    if (hz >= 1_000) return `${(hz / 1_000).toFixed(1)}K`;
    return String(Math.round(hz));
  }

  function benchDeltaColor(pct) {
    if (pct <= -25) return "bad";
    if (pct <= -10) return "warn";
    if (pct >= 5) return "good";
    return "";
  }

  let totalBenches = 0;
  const sections = [];
  for (const file of (latest.data.files || [])) {
    for (const group of (file.groups || [])) {
      const suiteName = group.fullName.split(" > ").slice(-1)[0];
      totalBenches += (group.benchmarks || []).length;

      const rows = (group.benchmarks || []).map((bench) => {
        const hzStr = formatHz(bench.hz);
        const p99us = (bench.p99 * 1000).toFixed(1);
        const rmeStr = `±${bench.rme.toFixed(1)}%`;

        let deltaCell;
        if (!baseline) {
          deltaCell = `<td class="num">—</td>`;
        } else {
          const baseHz = baselineHz.get(`${group.fullName}::${bench.name}`);
          if (baseHz != null) {
            const pct = ((bench.hz - baseHz) / baseHz) * 100;
            const sign = pct >= 0 ? "+" : "";
            const cls = benchDeltaColor(pct);
            const arrow = pct >= 0 ? "↑" : "↓";
            deltaCell = `<td class="num ${cls}">${sign}${pct.toFixed(1)}% ${arrow}</td>`;
          } else {
            deltaCell = `<td class="num">new</td>`;
          }
        }

        return `
      <tr>
        <td>${esc(bench.name)}</td>
        <td class="num">${esc(hzStr)}</td>
        <td class="num">${esc(p99us)}</td>
        <td class="num">${esc(rmeStr)}</td>
        ${deltaCell}
      </tr>`;
      }).join("");

      const deltaHeader = baseline ? `<th class="num">Δ Baseline</th>` : "";
      sections.push(`
  <h3>${esc(suiteName)}</h3>
  <table>
    <thead><tr><th>Benchmark</th><th class="num">Ops / sec</th><th class="num">p99 (µs)</th><th class="num">± Error</th>${deltaHeader}</tr></thead>
    <tbody>${rows}
    </tbody>
  </table>`);
    }
  }

  const meta = `${totalBenches} benchmark${totalBenches !== 1 ? "s" : ""}${baseline ? " · comparing vs baseline" : " · no baseline (run metrics:bench:set-baseline)"
    }`;

  const reportLink = `<a class="card-link" href="function-benchmark/report.html">full report →</a>`;

  return `
<div class="card card-wide">
  <h2>Function Benchmarks ${reportLink}</h2>
  ${staleLabel(latest.mtime, "npm run metrics:bench")}
  <p class="card-meta">${meta}</p>
  ${sections.join("\n")}
</div>`;
}

function couplingCard() {
  const svgFile = path.join(ROOT, "reports", "coupling", "graph.svg");
  const htmlFile = path.join(ROOT, "reports", "coupling", "report.html");

  const svgResult = loadFile(svgFile);
  const htmlResult = loadFile(htmlFile);
  const mtime = svgResult?.mtime ?? htmlResult?.mtime ?? null;

  if (!svgResult && !htmlResult) {
    return `
<div class="card">
  <h2>Coupling</h2>
  ${staleLabel(null, "npm run metrics:coupling")}
  <p class="empty">No coupling data found.</p>
</div>`;
  }

  // Strip the XML declaration / DOCTYPE so inline embedding is clean
  const svgContent = svgResult
    ? svgResult.content
      .replace(/<\?xml[^>]*\?>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .trim()
    : "";

  const htmlLink = htmlResult
    ? `<a class="card-link" href="coupling/report.html">violations report →</a>`
    : "";

  return `
<div class="card card-wide">
  <h2>Coupling ${htmlLink}</h2>
  ${staleLabel(mtime, "npm run metrics:coupling")}
  ${svgContent ? `<div class="svg-wrap">${svgContent}</div>` : `<p class="empty">Graph SVG not found.</p>`}
</div>`;
}

// ─── Page assembly ─────────────────────────────────────────────────────────────

function buildHtml(cards) {
  const generatedAt = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>revealGDB — Codebase Metrics Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    background: #0d1117;
    color: #c9d1d9;
    padding: 24px;
  }

  header {
    margin-bottom: 28px;
  }
  header h1 {
    font-size: 20px;
    font-weight: 600;
    color: #e6edf3;
  }
  header .generated {
    font-size: 11px;
    color: #6e7681;
    margin-top: 4px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 20px;
  }

  .card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 18px 20px;
  }
  .card-wide {
    grid-column: 1 / -1;
  }

  .card h2 {
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 6px;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .card h3 {
    font-size: 12px;
    font-weight: 600;
    color: #8b949e;
    margin: 14px 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .card-link {
    font-size: 11px;
    font-weight: 400;
    color: #58a6ff;
    text-decoration: none;
    margin-left: auto;
  }
  .card-link:hover { text-decoration: underline; }

  .src-link {
    color: inherit;
    text-decoration: none;
  }
  .src-link:hover { text-decoration: underline; color: #58a6ff; }

  .card-meta {
    font-size: 11px;
    color: #6e7681;
    margin-bottom: 10px;
  }

  .stale {
    font-size: 11px;
    color: #6e7681;
    display: block;
    margin-bottom: 12px;
  }
  .stale.no-data { color: #f78166; }
  .stale code {
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 10px;
    background: #21262d;
    padding: 1px 4px;
    border-radius: 3px;
  }

  .empty {
    color: #6e7681;
    font-style: italic;
    margin-top: 8px;
  }

  /* Coverage bars */
  .metrics { display: flex; flex-direction: column; gap: 8px; }
  .metric-row {
    display: grid;
    grid-template-columns: 80px 1fr 52px 72px;
    align-items: center;
    gap: 8px;
  }
  .metric-label { color: #8b949e; font-size: 12px; }
  .bar-wrap {
    background: #21262d;
    border-radius: 3px;
    height: 8px;
    overflow: hidden;
  }
  .bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .metric-val { font-weight: 600; font-size: 12px; text-align: right; }
  .metric-sub { color: #6e7681; font-size: 11px; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    color: #6e7681;
    font-weight: 500;
    border-bottom: 1px solid #30363d;
    padding: 4px 6px;
    white-space: nowrap;
  }
  td {
    padding: 5px 6px;
    border-bottom: 1px solid #21262d;
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  td.fn-name { font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; }
  td.fn-file {
    font-size: 11px;
    color: #8b949e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  /* Status colours */
  .good { color: #3fb950; }
  .warn { color: #d29922; }
  .bad  { color: #f85149; }
  .bar.good { background: #3fb950; }
  .bar.warn { background: #d29922; }
  .bar.bad  { background: #f85149; }

  /* SVG coupling graph */
  .svg-wrap {
    margin-top: 10px;
    overflow: auto;
    max-height: 600px;
    background: #0d1117;
    border-radius: 4px;
    border: 1px solid #21262d;
    padding: 8px;
  }
  .svg-wrap svg {
    max-width: 100%;
    height: auto;
    display: block;
  }
</style>
</head>
<body>
<header>
  <h1>revealGDB — Codebase Metrics Dashboard</h1>
  <div class="generated">Generated ${esc(generatedAt)} &nbsp;·&nbsp; Each card shows data from its last run; run individual commands or <code>npm run metrics:all</code> to refresh.</div>
</header>
<div class="grid">
${cards.join("\n")}
</div>
</body>
</html>
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const cards = [
  coverageCard(),
  startupCard(),
  maintainabilityCard(),
  benchCard(),
  couplingCard(),
];

const html = buildHtml(cards);
fs.writeFileSync(OUT, html, "utf8");
console.log(`Dashboard written to reports/dashboard.html`);
