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

/** Build an absolute file:// URL for a workspace-relative path.
 *  Works in standard browsers, VS Code Simple Browser, and system browsers. */
function fileUrl(relPath) {
  return "file:///" + path.join(ROOT, relPath).replace(/\\/g, "/");
}

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

function loadRuns(dirPath) {
  try {
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    const runs = files.map((f) => {
      const p = path.join(dirPath, f);
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return { path: p, data, mtime: fs.statSync(p).mtimeMs };
      } catch {
        return null;
      }
    }).filter(Boolean);
    // Sort by mtime desc
    runs.sort((a, b) => b.mtime - a.mtime);
    return runs;
  } catch {
    return [];
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
  // Negative delta = faster = good (green)
  if (deltaMs <= 0) return "good";
  if (deltaMs > 200 && deltaPct > 10) return "bad";
  if (deltaMs > 100 || deltaPct > 5) return "warn";
  return "";
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
  ${staleLabel(null, "npm run metrics:coverage")}
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
  <h2>Coverage <a class="card-link" href="${fileUrl('coverage/index.html')}">full report →</a></h2>
  ${staleLabel(mtime, "npm run metrics:coverage")}
  <div class="metrics">${bars}
  </div>
</div>`;
}

function startupCard() {
  const latestFile = path.join(ROOT, "reports", "startup-benchmark", "latest.json");
  const baselineFile = path.join(ROOT, "reports", "startup-benchmark", "baseline.json");

  let latest = loadJson(latestFile);
  // If latest.json exists but lacks environment info, prefer newest latest-<env>.json
  if (!latest) {
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
        console.log(`  Using per-platform latest file for dashboard: ${path.basename(newest.p)}`);
      }
    } catch (e) {}
  }
  const baseline = loadJson(baselineFile);

  if (!latest) {
    return `
<div class="card">
  <h2>Startup Benchmark</h2>
  ${staleLabel(null, "npm run metrics:benchmark")}
  <p class="empty">No benchmark data found.</p>
</div>`;
  }

  const milestones = Object.keys(latest.data.metrics || {});

  // Load historical runs to allow environment comparisons (e.g., windows vs wsl)
  const runsDir = path.join(ROOT, 'reports', 'startup-benchmark', 'runs');
  const runs = loadRuns(runsDir);
  // Build a simple environment summary: latest per env
  const latestByEnv = new Map();
  for (const r of runs) {
    const env = r.data.environment?.name || r.data.environment?.env?.name || 'unknown';
    if (!latestByEnv.has(env)) latestByEnv.set(env, r);
  }

  const rows = milestones.map((key) => {
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
      deltaClass = deltaColor(deltaMs, deltaPct);
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

  const envMeta = latest.data.environment ? ` · env: ${esc(latest.data.environment.name)} (${esc(latest.data.environment.platform)})` : "";
  const meta = `${latest.data.sampleCount} sample${latest.data.sampleCount !== 1 ? "s" : ""}, commit ${esc(latest.data.shortCommit ?? "?")}${envMeta}`;

  // Build a compact environment comparison table (one row per detected env)
  let envSummaryHtml = "";
  if (latestByEnv.size > 0) {
    const envRows = [...latestByEnv.entries()].map(([env, r]) => {
      const shown = r.data.metrics?.['main-window-shown']?.medianMs ?? (r.data.data && r.data.data.metrics && r.data.data.metrics['main-window-shown']?.medianMs) ?? null;
      const samples = r.data.sampleCount ?? (r.data.data && r.data.data.sampleCount) ?? 'n/a';
      const host = r.data.environment?.host ?? r.data.environment?.platform ?? '';
      return `
        <tr>
          <td>${esc(env)}</td>
          <td class="num">${shown !== null ? esc(String(shown) + 'ms') : '—'}</td>
          <td class="num">${esc(String(samples))}</td>
          <td>${esc(host)}</td>
        </tr>`;
    }).join('');

    envSummaryHtml = `
      <h3>Environment Runs</h3>
      <table class="env-table">
        <thead><tr><th>Environment</th><th class="num">main-window-shown</th><th class="num">samples</th><th>host</th></tr></thead>
        <tbody>${envRows}
        </tbody>
      </table>`;
  }

  return `
<div class="card">
  <h2>Startup Benchmark</h2>
  ${staleLabel(latest.mtime, "npm run metrics:benchmark")}
  <p class="card-meta">${meta}</p>
  ${envSummaryHtml}
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
  <h2>Maintainability <a class="card-link" href="${fileUrl('reports/maintainability/complexity-report.html')}">full report →</a></h2>
  ${staleLabel(mtime, "npm run metrics:maintainability")}
  <h3>Buckets</h3>
  <table>
    <thead><tr><th>Bucket</th><th>Files</th><th>Fns</th><th>Avg CC</th><th>CC≥15</th><th>CC≥25</th></tr></thead>
    <tbody>${bucketRows}
    </tbody>
  </table>
  <h3>Top 5 Hotspots</h3>
  <table class="hotspot-table">
    <colgroup><col style="width:38%"><col style="width:52%"><col style="width:10%"></colgroup>
    <thead><tr><th>Function</th><th>Location</th><th class="num">CC</th></tr></thead>
    <tbody>${hotRows}
    </tbody>
  </table>
</div>`;
}

function benchCard() {
  const benchDir = path.join(ROOT, 'reports', 'function-benchmark');
  
  // Load Windows and WSL data
  const windowsFile = path.join(benchDir, "latest-windows.json");
  const wslFile = path.join(benchDir, "latest-wsl.json");
  
  const windowsData = loadJson(windowsFile);
  const wslData = loadJson(wslFile);

  if (!windowsData && !wslData) {
    return `
<div class="card">
  <h2>Function Benchmarks</h2>
  ${staleLabel(null, "npm run metrics:benchmark")}
  <p class="empty">No benchmark data found.</p>
</div>`;
  }
  
  // Extract file structure from whichever platform has data
  const primaryData = windowsData || wslData;
  const mtime = Math.max(windowsData?.mtime || 0, wslData?.mtime || 0);
  
  // Build maps for quick lookup: fullName::benchName -> bench data
  const windowsMap = new Map();
  const wslMap = new Map();
  
  if (windowsData && windowsData.data && windowsData.data.files) {
    for (const file of windowsData.data.files) {
      for (const group of (file.groups || [])) {
        for (const bench of (group.benchmarks || [])) {
          windowsMap.set(`${group.fullName}::${bench.name}`, bench);
        }
      }
    }
  }
  
  if (wslData && wslData.data && wslData.data.files) {
    for (const file of wslData.data.files) {
      for (const group of (file.groups || [])) {
        for (const bench of (group.benchmarks || [])) {
          wslMap.set(`${group.fullName}::${bench.name}`, bench);
        }
      }
    }
  }

  function formatHz(hz) {
    if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
    if (hz >= 1_000) return `${(hz / 1_000).toFixed(2)}K`;
    return String(Math.round(hz));
  }

  function formatMean(mean) {
    // mean is in milliseconds, convert to microseconds
    return (mean * 1000).toFixed(2);
  }

  function deltaClass(pct) {
    if (pct <= -25) return "bad";
    if (pct <= -10) return "warn";
    if (pct >= 5) return "good";
    return "";
  }

  let totalBenches = 0;
  const sections = [];

  // Iterate through file structure and build cross-platform comparison tables
  for (const file of (primaryData.data.files || [])) {
    const fileName = (file.filepath || file.file || '').replace(/\\/g, "/").split("/").slice(-1)[0];
    
    for (const group of (file.groups || [])) {
      const suiteName = group.fullName.split(" > ").slice(-1)[0];
      totalBenches += (group.benchmarks || []).length;

      const rows = (group.benchmarks || []).map((bench) => {
        const key = `${group.fullName}::${bench.name}`;
        const winBench = windowsMap.get(key);
        const wslBench = wslMap.get(key);

        // Windows columns
        const winHz = winBench?.hz != null ? formatHz(winBench.hz) : "—";
        const winMean = winBench?.mean != null ? formatMean(winBench.mean) : "—";
        const winRme = winBench?.rme != null ? `±${winBench.rme.toFixed(1)}%` : "—";

        // WSL columns
        const wslHz = wslBench?.hz != null ? formatHz(wslBench.hz) : "—";
        const wslMean = wslBench?.mean != null ? formatMean(wslBench.mean) : "—";
        const wslRme = wslBench?.rme != null ? `±${wslBench.rme.toFixed(1)}%` : "—";

        // Difference calculation (Windows as baseline)
        let diffStr = "—";
        let diffCls = "";
        if (winBench?.hz != null && wslBench?.hz != null) {
          const pct = ((winBench.hz - wslBench.hz) / wslBench.hz) * 100;
          const sign = pct >= 0 ? "+" : "";
          const arrow = pct >= 0 ? "↑" : "↓";
          diffStr = `${sign}${pct.toFixed(1)}% ${arrow}`;
          diffCls = deltaClass(pct);
        }

        return `
      <tr>
        <td class="bench-name-compact">${esc(bench.name)}</td>
        <td class="num col-group-win">${esc(winHz)}</td>
        <td class="num col-group-win">${esc(winMean)}</td>
        <td class="num col-group-win">${esc(winRme)}</td>
        <td class="num col-group-wsl">${esc(wslHz)}</td>
        <td class="num col-group-wsl">${esc(wslMean)}</td>
        <td class="num col-group-wsl">${esc(wslRme)}</td>
        <td class="num col-group-delta ${diffCls}">${esc(diffStr)}</td>
      </tr>`;
      }).join("");

      const colgroup = `<colgroup>
        <col style="width:28%">
        <col style="width:11%"><col style="width:9%"><col style="width:8%">
        <col style="width:11%"><col style="width:9%"><col style="width:8%">
        <col style="width:10%">
      </colgroup>`;
      
      sections.push(`
  <h3>${esc(suiteName)} <span class="file-badge">${esc(fileName)}</span></h3>
  <table class="bench-table bench-table-compact">
    ${colgroup}
    <thead>
      <tr>
        <th rowspan="2">Benchmark</th>
        <th class="num col-group-header col-group-win" colspan="3">Windows</th>
        <th class="num col-group-header col-group-wsl" colspan="3">WSL</th>
        <th class="num col-group-header col-group-delta" rowspan="2">Win vs WSL</th>
      </tr>
      <tr>
        <th class="num col-group-win">Ops/sec</th><th class="num col-group-win">Mean (µs)</th><th class="num col-group-win">± Error</th>
        <th class="num col-group-wsl">Ops/sec</th><th class="num col-group-wsl">Mean (µs)</th><th class="num col-group-wsl">± Error</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>`);
    }
  }

  const meta = `${totalBenches} benchmark${totalBenches !== 1 ? "s" : ""} · cross-platform comparison`;
  const reportLink = `<a class="card-link" href="${fileUrl('reports/function-benchmark/report.html')}">full report →</a>`;

  return `
<div class="card card-wide">
  <h2>Function Benchmarks ${reportLink}</h2>
  ${staleLabel(mtime, "npm run metrics:benchmark")}
  <p class="card-meta">${meta}</p>
  ${sections.join("\n")}
</div>`;
}

function bundleReportCard() {
  const mainFile = path.join(ROOT, "reports", "bundle-report-main.html");
  const preloadFile = path.join(ROOT, "reports", "bundle-report-preload.html");
  const rendererFile = path.join(ROOT, "reports", "bundle-report-renderer.html");

  const mainResult = loadFile(mainFile);
  const preloadResult = loadFile(preloadFile);
  const rendererResult = loadFile(rendererFile);

  if (!mainResult && !preloadResult && !rendererResult) {
    return `
<div class="card card-wide">
  <h2>Bundle Reports</h2>
  ${staleLabel(null, "npm run build:analyze")}
  <p class="empty">No bundle reports found.</p>
</div>`;
  }

  const latestMtime = Math.max(
    mainResult?.mtime || 0,
    preloadResult?.mtime || 0,
    rendererResult?.mtime || 0
  );

  const tabs = [];
  const panels = [];

  if (mainResult) {
    tabs.push(`<button class="bundle-tab" onclick="showBundleTab('main')">Main Process</button>`);
    panels.push(`
      <div id="bundle-panel-main" class="bundle-panel">
        <div class="bundle-iframe-wrap">
          <iframe src="${fileUrl('reports/bundle-report-main.html')}" title="Main Process Bundle" class="bundle-iframe"></iframe>
        </div>
      </div>`);
  }

  if (preloadResult) {
    tabs.push(`<button class="bundle-tab" onclick="showBundleTab('preload')">Preload</button>`);
    panels.push(`
      <div id="bundle-panel-preload" class="bundle-panel" style="display:none;">
        <div class="bundle-iframe-wrap">
          <iframe src="${fileUrl('reports/bundle-report-preload.html')}" title="Preload Bundle" class="bundle-iframe"></iframe>
        </div>
      </div>`);
  }

  if (rendererResult) {
    tabs.push(`<button class="bundle-tab" onclick="showBundleTab('renderer')">Renderer Process</button>`);
    panels.push(`
      <div id="bundle-panel-renderer" class="bundle-panel" style="display:none;">
        <div class="bundle-iframe-wrap">
          <iframe src="${fileUrl('reports/bundle-report-renderer.html')}" title="Renderer Process Bundle" class="bundle-iframe"></iframe>
        </div>
      </div>`);
  }

  return `
<div class="card card-wide">
  <h2>Bundle Reports</h2>
  ${staleLabel(latestMtime, "npm run build:analyze")}
  <div class="bundle-tabs">
    ${tabs.join('\n    ')}
  </div>
  ${panels.join('\n  ')}
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

  // Strip the XML declaration / DOCTYPE so inline embedding is clean,
  // then inject an id so the zoom script can target the element.
  // Colour theming is handled entirely by CSS media queries (no JS fill-replacement)
  // so the SVG automatically tracks the browser's light / dark preference.
  const svgContent = svgResult
    ? svgResult.content
      .replace(/<\?xml[^>]*\?>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/(<svg\b)/, '$1 id="coupling-svg"')
      .trim()
    : "";

  const htmlLink = htmlResult
    ? `<a class="card-link" href="${fileUrl('reports/coupling/report.html')}">violations report →</a>`
    : "";

  const zoomControls = svgContent ? `
  <div class="svg-controls">
    <button class="zoom-btn" onclick="svgZoom(-0.25)" title="Zoom out">−</button>
    <span class="zoom-pct" id="coupling-zoom-pct">100%</span>
    <button class="zoom-btn" onclick="svgZoom(+0.25)" title="Zoom in">+</button>
    <button class="zoom-btn" onclick="svgZoom(0)" title="Reset zoom" style="margin-left:4px">↺ Reset</button>
    <span class="zoom-hint">Double-click to zoom in · Shift+double-click to zoom out</span>
  </div>` : "";

  return `
<div class="card card-wide">
  <h2>Coupling ${htmlLink}</h2>
  ${staleLabel(mtime, "npm run metrics:coupling")}
  ${zoomControls}
  ${svgContent ? `<div class="svg-wrap" id="coupling-svg-wrap">${svgContent}</div>` : `<p class="empty">Graph SVG not found.</p>`}
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
    color: #848d97;
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
    overflow: hidden;
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
    color: #848d97;
    margin-bottom: 10px;
  }

  .stale {
    font-size: 11px;
    color: #848d97;
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
    color: #848d97;
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
  .metric-sub { color: #848d97; font-size: 11px; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    color: #848d97;
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
  td.fn-name {
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  td.fn-file {
    font-size: 11px;
    color: #8b949e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Hotspot table — fixed layout so long names truncate inside the card */
  table.hotspot-table { table-layout: fixed; width: 100%; }

  /* Benchmark tables — fixed layout so columns line up across suites.
     Column widths are set via inline style on <col> in the JS; these rules
     just enforce the fixed layout on the table itself. */
  table.bench-table { table-layout: fixed; }
  table.bench-table thead tr:first-child th { border-bottom: 1px solid #30363d; padding-bottom: 3px; }
  table.bench-table-compact tbody tr { line-height: 1.3; }
  table.bench-table-compact td { padding-top: 3px; padding-bottom: 3px; }
  .bench-name-compact { 
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .col-group-header { text-align: center !important; font-size: 11px; letter-spacing: 0.03em; }
  .col-group-current { border-left: 2px solid #1f6feb; }
  .col-group-baseline { border-left: 2px solid #388bfd44; color: #8b949e; }
  .col-group-win { border-left: 2px solid #1f6feb; }
  .col-group-wsl { border-left: 2px solid #58a6ff; }
  .col-group-delta { border-left: 2px solid #30363d; }
  td.col-group-current, td.col-group-baseline, td.col-group-win, td.col-group-wsl, td.col-group-delta { border-left: 1px solid #21262d; }

  /* Status colours */
  .good { color: #3fb950; }
  .warn { color: #d29922; }
  .bad  { color: #f85149; }
  .bar.good { background: #3fb950; }
  .bar.warn { background: #d29922; }
  .bar.bad  { background: #f85149; }

  /* SVG coupling graph — zoom controls and wrapper, fully theme-aware */
  .svg-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  /* ── Light-mode defaults (original graphviz palette is the light theme) ── */
  .zoom-btn {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #24292f;
    cursor: pointer;
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.4;
  }
  .zoom-btn:hover { background: #eaeef2; }
  .zoom-pct {
    font-size: 11px;
    color: #57606a;
    min-width: 38px;
    text-align: center;
  }
  .zoom-hint {
    font-size: 11px;
    color: #848d97;
    margin-left: 6px;
  }
  .svg-wrap {
    margin-top: 8px;
    overflow: auto;
    max-height: 1200px;
    background: #ffffff;
    border-radius: 4px;
    border: 1px solid #d0d7de;
    padding: 8px;
    cursor: zoom-in;
  }
  .svg-wrap svg { display: block; }

  /* Bundle report iframe wrapper */
  .bundle-iframe-wrap {
    margin-top: 12px;
    border: 1px solid #30363d;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
  }
  .bundle-iframe {
    width: 100%;
    height: 800px;
    border: none;
    display: block;
  }
  .bundle-tabs {
    display: flex;
    gap: 4px;
    margin-top: 12px;
    border-bottom: 1px solid #30363d;
  }
  .bundle-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #848d97;
    cursor: pointer;
    padding: 8px 16px;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.2s;
  }
  .bundle-tab:hover {
    color: #c9d1d9;
    background: #21262d;
  }
  .bundle-tab.active {
    color: #58a6ff;
    border-bottom-color: #58a6ff;
  }
  .bundle-panel {
    margin-top: 0;
  }

  /* ── Dark-mode — full palette remap ──────────────────────────────────────────
     Depth:      viewer #1c2128 → outer cluster #21262d → inner cluster #142030
     Nodes:      hue preserved from the original, shifted to a dark variant
     Violations: red / #c40b0a / orange / #ffee44 stay vivid — warnings must
                 stand out MORE on dark backgrounds, not less.
     ──────────────────────────────────────────────────────────────────────── */
  @media (prefers-color-scheme: dark) {
    /* Zoom controls */
    .zoom-btn { background: #21262d; border-color: #30363d; color: #c9d1d9; }
    .zoom-btn:hover { background: #2d333b; }
    .zoom-pct { color: #8b949e; }
    .zoom-hint { color: #6e7681; }

    /* SVG viewer canvas */
    .svg-wrap { background: #1c2128; border-color: #21262d; }

    /* Bundle iframe wrapper dark mode */
    .bundle-iframe-wrap { background: #0d1117; border-color: #30363d; }

    /* Node/cluster labels: only target text with NO explicit fill attribute.
       This avoids overriding violation edge labels (fill="red", fill="#c40b0a")
       which carry semantic colour information. */
    .svg-wrap svg text:not([fill]) { fill: #adbac7; }
    /* Grey node text labels: the [fill="grey"] rule above (for node box fills)
       would otherwise win here, giving #30363d — invisible on dark amber nodes. */
    .svg-wrap svg text[fill="grey"]    { fill: #adbac7; }
    /* Violation edge labels: dark crimson (#c40b0a) is 1.4:1 on the dark viewer
       background; bright red (#ff0000) is only 4.1:1 at 9 px. Remap both to a
       readable light-red that keeps the violation semantic. #ff7b72 = 6.5:1. */
    .svg-wrap svg text[fill="#c40b0a"] { fill: #ff7b72; }
    .svg-wrap svg text[fill="red"]     { fill: #ff7b72; }

    /* ── Cluster / subgraph backgrounds ─────────────────────────────── */
    .svg-wrap svg [fill="white"]     { fill: #21262d; } /* outer cluster              */
    .svg-wrap svg [fill="#ffffff"]   { fill: #21262d; } /* outer cluster (hex form)   */
    .svg-wrap svg [fill="#bbfeff"]   { fill: #142030; } /* inner cluster — dark teal  */

    /* ── Module node fills (hue preserved, shifted to dark variants) ── */
    .svg-wrap svg [fill="#ffffcc"]   { fill: #3d3300; } /* source modules  → dark amber      */
    .svg-wrap svg [fill="#ddfeff"]   { fill: #163545; } /* cyan category   → dark blue-teal  */
    .svg-wrap svg [fill="#ccffcc"]   { fill: #163520; } /* green category  → dark green      */
    .svg-wrap svg [fill="grey"]      { fill: #30363d; } /* external / unresolved modules     */

    /* ── Edges, arrowheads, node borders ────────────────────────────── */
    /* #8b949e = 5.3:1 contrast vs viewer bg, 4.1:1 vs darkest node fill  */
    /* Graphviz uses both "black" and "#000000" spellings — cover both.    */
    .svg-wrap svg [fill="black"]     { fill: #8b949e; }
    .svg-wrap svg [fill="#000000"]   { fill: #8b949e; }
    .svg-wrap svg [stroke="black"]   { stroke: #8b949e; }
    .svg-wrap svg [stroke="#000000"] { stroke: #8b949e; } /* primary edges (1022 occurrences) */
    /* #7a8490 = 4.3:1 vs viewer bg — visually secondary to primary edges  */
    .svg-wrap svg [stroke="grey"]    { stroke: #7a8490; } /* secondary / cluster borders     */
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
<script>
(function () {
  var _zoom = 1;
  var _baseW = null, _baseH = null;

  function ensureBase(el) {
    if (_baseW === null) {
      var r = el.getBoundingClientRect();
      _baseW = r.width  || el.viewBox.baseVal.width  || 1733;
      _baseH = r.height || el.viewBox.baseVal.height || 6306;
      el.style.maxWidth = 'none';
    }
  }

  window.svgZoom = function (delta) {
    var el = document.getElementById('coupling-svg');
    if (!el) return;
    ensureBase(el);
    if (delta === 0) {
      _zoom = 1; _baseW = null; _baseH = null;
      el.style.maxWidth = '';
      el.style.width    = '';
      el.style.height   = '';
    } else {
      _zoom = Math.max(0.1, Math.min(8, _zoom + delta));
      el.style.width  = (_baseW * _zoom) + 'px';
      el.style.height = (_baseH * _zoom) + 'px';
    }
    var lbl = document.getElementById('coupling-zoom-pct');
    if (lbl) lbl.textContent = Math.round(_zoom * 100) + '%';
  };

  // Bundle tab switcher
  window.showBundleTab = function (tabName) {
    // Hide all panels
    var panels = document.querySelectorAll('.bundle-panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].style.display = 'none';
    }
    
    // Remove active class from all tabs
    var tabs = document.querySelectorAll('.bundle-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
    }
    
    // Show selected panel
    var panel = document.getElementById('bundle-panel-' + tabName);
    if (panel) panel.style.display = 'block';
    
    // Mark selected tab as active
    var clickedTab = event.target;
    if (clickedTab) clickedTab.classList.add('active');
  };

  // Double-click: zoom in (or Shift+double-click: zoom out) centered on cursor
  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.getElementById('coupling-svg-wrap');
    if (!wrap) return;
    wrap.addEventListener('dblclick', function (e) {
      var el = document.getElementById('coupling-svg');
      if (!el) return;
      ensureBase(el);
      var delta = e.shiftKey ? -0.5 : 0.5;
      var oldZoom = _zoom;
      var newZoom = Math.max(0.1, Math.min(8, oldZoom + delta));
      if (newZoom === oldZoom) return;

      // Click position relative to the wrap's visible (scrolled) area
      var wrapRect = wrap.getBoundingClientRect();
      var clickInWrapX = e.clientX - wrapRect.left;
      var clickInWrapY = e.clientY - wrapRect.top;

      // Same point expressed in SVG scroll-space coordinates
      var svgX = clickInWrapX + wrap.scrollLeft;
      var svgY = clickInWrapY + wrap.scrollTop;

      // Apply new zoom
      _zoom = newZoom;
      el.style.width  = (_baseW * _zoom) + 'px';
      el.style.height = (_baseH * _zoom) + 'px';

      // Scroll so the clicked point stays under the cursor
      var ratio = newZoom / oldZoom;
      wrap.scrollLeft = svgX * ratio - clickInWrapX;
      wrap.scrollTop  = svgY * ratio - clickInWrapY;

      var lbl = document.getElementById('coupling-zoom-pct');
      if (lbl) lbl.textContent = Math.round(_zoom * 100) + '%';
      e.preventDefault();
    });
    
    // Activate first bundle tab by default
    var firstTab = document.querySelector('.bundle-tab');
    if (firstTab) {
      firstTab.classList.add('active');
      var firstPanel = document.querySelector('.bundle-panel');
      if (firstPanel) firstPanel.style.display = 'block';
    }
  });
})();
</script>
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
  bundleReportCard(),
  couplingCard(),
];

const html = buildHtml(cards);
fs.writeFileSync(OUT, html, "utf8");
console.log(`Dashboard written to reports/dashboard.html`);
