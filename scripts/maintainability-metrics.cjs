#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const REPORT_DIR = path.join(ROOT, 'reports', 'maintainability');
const HISTORY_DIR = path.join(REPORT_DIR, 'history');

const SNAPSHOT_FLAG = process.argv.includes('--snapshot');
const TOP_HOTSPOTS_COUNT = 25;
const CC_WARN_THRESHOLD = 15;
const CC_ERROR_THRESHOLD = 25;

const TARGET_BUCKETS = [
  { name: 'main', dir: path.join(SRC_ROOT, 'main') },
  { name: 'renderer', dir: path.join(SRC_ROOT, 'renderer') },
  { name: 'preload', dir: path.join(SRC_ROOT, 'preload') },
];

const EXCLUDED_DIR_SEGMENTS = new Set([
  'tests',
  'test',
  '__tests__',
  'test-helpers',
  'performance',
]);

// --- File helpers ---

function isTsSourceFile(filePath) {
  return /\.(ts|tsx)$/i.test(filePath) && !/\.d\.ts$/i.test(filePath);
}

function isTestLikeFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/').toLowerCase();
  if (/\.(test|spec)\.(ts|tsx)$/i.test(normalized)) return true;
  if (/-test\.(ts|tsx|html)$/i.test(normalized)) return true;
  if (/(^|\/)tests?\//.test(normalized)) return true;
  if (normalized.includes('/test-helpers/')) return true;
  if (/playwright|vitest/.test(normalized)) return true;
  return false;
}

function walkFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_SEGMENTS.has(entry.name.toLowerCase())) continue;
      walkFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && isTsSourceFile(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function countLines(code) {
  const lines = code.split(/\r?\n/);
  const total = lines.length;
  const blank = lines.filter((l) => l.trim().length === 0).length;
  const comment = lines.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
  const sloc = Math.max(1, total - blank - comment);
  return { total, sloc };
}

// --- Per-function cyclomatic complexity ---

function isFunctionLike(node) {
  return (
    node.kind === ts.SyntaxKind.FunctionDeclaration ||
    node.kind === ts.SyntaxKind.FunctionExpression ||
    node.kind === ts.SyntaxKind.ArrowFunction ||
    node.kind === ts.SyntaxKind.MethodDeclaration ||
    node.kind === ts.SyntaxKind.Constructor ||
    node.kind === ts.SyntaxKind.GetAccessor ||
    node.kind === ts.SyntaxKind.SetAccessor
  );
}

function getFunctionName(node) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (node.kind === ts.SyntaxKind.Constructor) return 'constructor';
  if (node.parent) {
    const p = node.parent;
    if (
      (p.kind === ts.SyntaxKind.VariableDeclaration || p.kind === ts.SyntaxKind.PropertyDeclaration) &&
      p.name &&
      ts.isIdentifier(p.name)
    ) {
      return p.name.text;
    }
  }
  return '<anonymous>';
}

function cyclomaticOfSubtree(node) {
  let cc = 1;
  function visit(n) {
    if (n !== node && isFunctionLike(n)) return; // don't recurse into nested functions
    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        cc += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = n.operatorToken && n.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          cc += 1;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return cc;
}

function slocOfSubtree(node, sourceFile) {
  const lines = sourceFile.text.slice(node.getStart(sourceFile), node.getEnd()).split(/\r?\n/);
  return Math.max(1, lines.filter((l) => l.trim().length > 0 && !/^\s*(\/\/|\/\*|\*)/.test(l)).length);
}

function extractFunctions(sourceFile) {
  const functions = [];
  function visit(node) {
    if (isFunctionLike(node)) {
      const name = getFunctionName(node);
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      functions.push({
        name,
        line: line + 1,
        cc: cyclomaticOfSubtree(node),
        sloc: slocOfSubtree(node, sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return functions;
}

function fileLevelCyclomatic(sourceFile) {
  let cc = 1;
  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        cc += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = node.operatorToken && node.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          cc += 1;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return cc;
}

// --- File analysis ---

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const { sloc, total: totalLines } = countLines(code);
  const cyclomatic = fileLevelCyclomatic(sourceFile);
  const functions = extractFunctions(sourceFile);
  const maxFnCC = functions.length > 0 ? Math.max(...functions.map((f) => f.cc)) : 0;

  return {
    file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    sloc,
    totalLines,
    cyclomatic,
    maxFnCC,
    fnCount: functions.length,
    functions,
  };
}

// --- Aggregation helpers ---

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ccLevel(cc) {
  if (cc >= CC_ERROR_THRESHOLD) return 'High';
  if (cc >= CC_WARN_THRESHOLD) return 'Medium';
  return 'Low';
}

// --- Snapshot / trending ---

function loadLatestSnapshot() {
  if (!fs.existsSync(HISTORY_DIR)) return null;
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, files[files.length - 1]), 'utf8'));
  } catch {
    return null;
  }
}

function computeDeltas(current, previous) {
  if (!previous) return null;
  const deltas = {};
  for (const cb of current.buckets) {
    const pb = previous.buckets.find((b) => b.name === cb.name);
    if (!pb) continue;
    deltas[cb.name] = {
      avgCC: Number((cb.avgCC - pb.avgCC).toFixed(2)),
      highCC: cb.highCC - pb.highCC,
      fnOver25: cb.fnOver25 - (pb.fnOver25 ?? 0),
      fnOver15: cb.fnOver15 - (pb.fnOver15 ?? 0),
    };
  }
  if (previous.totals) {
    const cprev = previous.totals;
    const ccur = current.totals;
    deltas.totals = {
      files: ccur.files - cprev.files,
      functions: ccur.functions - cprev.functions,
      fnOver25: ccur.fnOver25 - (cprev.fnOver25 ?? 0),
      fnOver15: ccur.fnOver15 - (cprev.fnOver15 ?? 0),
    };
  }
  return deltas;
}

function formatDelta(val) {
  if (val === 0) return '\u2014';
  return val > 0 ? `+${val}` : `${val}`;
}

// --- HTML report builder ---

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ccClass(cc) {
  if (cc >= CC_ERROR_THRESHOLD) return 'bad';
  if (cc >= CC_WARN_THRESHOLD) return 'warn';
  return 'good';
}

function buildComplexityHtml(report) {
  const generatedAt = new Date(report.generatedAt).toLocaleString();

  // Summary cards
  const summaryCards = report.buckets.map((b) => `
    <div class="summary-card">
      <h3>${escHtml(b.name)}</h3>
      <div class="stat-row"><span class="stat-label">Files</span><span class="stat-val">${b.fileCount}</span></div>
      <div class="stat-row"><span class="stat-label">Functions</span><span class="stat-val">${b.fnCount}</span></div>
      <div class="stat-row"><span class="stat-label">Avg CC</span><span class="stat-val">${b.avgCC}</span></div>
      <div class="stat-row"><span class="stat-label">CC &ge; 25</span><span class="stat-val ${b.fnOver25 > 0 ? 'bad' : ''}">${b.fnOver25}</span></div>
      <div class="stat-row"><span class="stat-label">CC &ge; 15</span><span class="stat-val ${(b.fnOver15 - b.fnOver25) > 0 ? 'warn' : ''}">${b.fnOver15 - b.fnOver25}</span></div>
    </div>`).join('');

  // Trend section
  let trendSection = '';
  if (report.deltas) {
    const trendRows = report.buckets.map((b) => {
      const d = report.deltas[b.name];
      if (!d) return '';
      return `
        <tr>
          <td>${escHtml(b.name)}</td>
          <td class="num ${d.avgCC > 0 ? 'warn' : d.avgCC < 0 ? 'good' : ''}">${formatDelta(d.avgCC)}</td>
          <td class="num ${d.highCC > 0 ? 'bad' : d.highCC < 0 ? 'good' : ''}">${formatDelta(d.highCC)}</td>
          <td class="num ${d.fnOver25 > 0 ? 'bad' : d.fnOver25 < 0 ? 'good' : ''}">${formatDelta(d.fnOver25)}</td>
          <td class="num ${d.fnOver15 > 0 ? 'warn' : d.fnOver15 < 0 ? 'good' : ''}">${formatDelta(d.fnOver15)}</td>
        </tr>`;
    }).join('');
    let totalsRow = '';
    if (report.deltas.totals) {
      const dt = report.deltas.totals;
      totalsRow = `
        <tr class="totals-row">
          <td><strong>total</strong></td>
          <td class="num">&mdash;</td>
          <td class="num">&mdash;</td>
          <td class="num ${dt.fnOver25 > 0 ? 'bad' : dt.fnOver25 < 0 ? 'good' : ''}">${formatDelta(dt.fnOver25)}</td>
          <td class="num ${dt.fnOver15 > 0 ? 'warn' : dt.fnOver15 < 0 ? 'good' : ''}">${formatDelta(dt.fnOver15)}</td>
        </tr>`;
    }
    trendSection = `
  <section>
    <h2>Trend vs Last Snapshot</h2>
    <table>
      <thead><tr><th>Bucket</th><th>Avg CC</th><th>High CC files</th><th>Fn &ge; 25</th><th>Fn &ge; 15</th></tr></thead>
      <tbody>${trendRows}${totalsRow}
      </tbody>
    </table>
  </section>`;
  }

  // Per-bucket file tables
  let fileIdx = 0;
  const bucketSections = report.buckets.map((b) => {
    const sorted = b.files.slice().sort((x, y) => y.maxFnCC - x.maxFnCC);
    const fileRows = sorted.map((f) => {
      const idx = fileIdx++;
      const rowClass = f.maxFnCC >= CC_ERROR_THRESHOLD ? 'row-bad' : f.maxFnCC >= CC_WARN_THRESHOLD ? 'row-warn' : '';
      const fnRows = f.functions
        .slice()
        .sort((x, y) => y.cc - x.cc)
        .map((fn) => `
              <tr>
                <td class="fn-name">${escHtml(fn.name)}</td>
                <td class="num">line ${fn.line}</td>
                <td class="num ${ccClass(fn.cc)}">${fn.cc}</td>
                <td class="num">${fn.sloc}</td>
              </tr>`).join('');
      const shortFile = f.file.replace(/^src\/[^/]+\//, '');
      const fileLink = `../../${f.file}`;
      return `
          <tr class="file-row ${rowClass}" onclick="toggleDetail('fn-detail-${idx}', this)">
            <td><span class="expand-icon" id="icon-${idx}">&#9654;</span> <a href="${escHtml(fileLink)}" onclick="event.stopPropagation()" title="${escHtml(f.file)}">${escHtml(shortFile)}</a></td>
            <td class="num">${f.cyclomatic}</td>
            <td class="num ${ccClass(f.maxFnCC)}">${f.maxFnCC}</td>
            <td class="num">${f.fnCount}</td>
            <td class="num">${f.sloc}</td>
          </tr>
          <tr class="fn-detail" id="fn-detail-${idx}" style="display:none">
            <td colspan="5">
              <table class="fn-table">
                <thead><tr><th>Function</th><th>Location</th><th>CC</th><th>SLOC</th></tr></thead>
                <tbody>${fnRows}
                </tbody>
              </table>
            </td>
          </tr>`;
    }).join('');
    return `
  <section>
    <h2>${escHtml(b.name)} <span class="badge">${b.fileCount} files &middot; ${b.fnCount} fns &middot; avg CC ${b.avgCC}</span></h2>
    <table class="file-table">
      <thead><tr><th>File</th><th>File CC</th><th>Max Fn CC</th><th>Fns</th><th>SLOC</th></tr></thead>
      <tbody>${fileRows}
      </tbody>
    </table>
  </section>`;
  }).join('');

  // Top hotspot functions
  const hotspotRows = report.topHotspots.map((h, i) => {
    const shortFile = h.file.replace(/^src\/[^/]+\//, '');
    return `
        <tr>
          <td class="num rank">${i + 1}</td>
          <td class="fn-name">${escHtml(h.fnName)}</td>
          <td class="file-cell" title="${escHtml(h.file)}"><a href="../../${escHtml(h.file)}">${escHtml(shortFile)}</a>:${h.line}</td>
          <td>${escHtml(h.bucket)}</td>
          <td class="num ${ccClass(h.cc)}">${h.cc}</td>
          <td class="num">${h.sloc}</td>
        </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Code Complexity Report &mdash; revealGDB</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    background: #0d1117;
    color: #c9d1d9;
    padding: 24px;
    line-height: 1.5;
  }
  header { margin-bottom: 28px; }
  header h1 { font-size: 20px; font-weight: 600; color: #e6edf3; }
  header .meta { font-size: 11px; color: #6e7681; margin-top: 4px; }
  h2 {
    font-size: 15px; font-weight: 600; color: #e6edf3;
    margin-bottom: 10px;
    display: flex; align-items: baseline; gap: 10px;
  }
  h2 .badge { font-size: 11px; font-weight: 400; color: #6e7681; }
  section { margin-bottom: 36px; }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .summary-card {
    background: #161b22; border: 1px solid #30363d;
    border-radius: 8px; padding: 14px 16px;
  }
  .summary-card h3 { font-size: 13px; font-weight: 600; color: #e6edf3; margin-bottom: 10px; }
  .stat-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
  .stat-label { color: #8b949e; }
  .stat-val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    text-align: left; color: #6e7681; font-weight: 500;
    border-bottom: 1px solid #30363d; padding: 5px 8px;
    white-space: nowrap; background: #161b22;
    position: sticky; top: 0;
  }
  td { padding: 5px 8px; border-bottom: 1px solid #161b22; vertical-align: middle; }
  .file-table tbody tr:last-child td { border-bottom: none; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.fn-name { font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; }
  td.file-cell { font-size: 11px; color: #8b949e; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.rank { color: #6e7681; width: 30px; }
  a { color: #58a6ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .file-row { cursor: pointer; user-select: none; }
  .file-row:hover { background: #1c2128; }
  .row-warn > td:first-child { border-left: 2px solid #d29922; padding-left: 6px; }
  .row-bad  > td:first-child { border-left: 2px solid #f85149; padding-left: 6px; }
  .expand-icon { display: inline-block; font-size: 9px; color: #6e7681; width: 12px; transition: transform 0.15s; }
  .expand-icon.open { transform: rotate(90deg); }
  .fn-detail td { background: #0d1117; padding: 0; }
  .fn-table { margin: 0; }
  .fn-table th { background: #0d1117; border-bottom-color: #21262d; font-size: 11px; }
  .fn-table td { padding: 3px 8px; border-bottom-color: #0d1117; }
  .totals-row td { border-top: 1px solid #30363d; }
  .good { color: #3fb950; }
  .warn { color: #d29922; }
  .bad  { color: #f85149; }
</style>
</head>
<body>
<header>
  <h1>Code Complexity Report</h1>
  <div class="meta">Generated: ${escHtml(generatedAt)} &nbsp;&middot;&nbsp; Thresholds: warn &ge; ${CC_WARN_THRESHOLD}, error &ge; ${CC_ERROR_THRESHOLD} &nbsp;&middot;&nbsp; Test files excluded</div>
</header>
<div class="summary-grid">
${summaryCards}
</div>
${trendSection}
${bucketSections}
<section>
  <h2>Top ${report.topHotspots.length} Hotspot Functions</h2>
  <table>
    <thead><tr><th>#</th><th>Function</th><th>File:Line</th><th>Bucket</th><th>CC</th><th>SLOC</th></tr></thead>
    <tbody>${hotspotRows}
    </tbody>
  </table>
</section>
<script>
  function toggleDetail(id, row) {
    var detail = document.getElementById(id);
    var icon = row.querySelector('.expand-icon');
    var hidden = detail.style.display === 'none';
    detail.style.display = hidden ? '' : 'none';
    icon.classList.toggle('open', hidden);
  }
<\/script>
</body>
</html>
`;
}

// --- Report writing ---

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const jsonPath = path.join(REPORT_DIR, 'complexity-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const html = buildComplexityHtml(report);
  const htmlPath = path.join(REPORT_DIR, 'complexity-report.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  return { jsonPath, htmlPath };
}

// --- Bucket builder ---

function buildBucket(name, dir) {
  if (!fs.existsSync(dir)) {
    return { name, fileCount: 0, fnCount: 0, avgCC: 0, highCC: 0, mediumCC: 0, lowCC: 0, fnOver25: 0, fnOver15: 0, files: [] };
  }

  const filePaths = walkFiles(dir)
    .map((f) => path.relative(ROOT, f))
    .filter((rel) => !isTestLikeFile(rel))
    .map((rel) => path.join(ROOT, rel));

  const analyzed = filePaths.map(analyzeFile);
  const allFns = analyzed.flatMap((f) => f.functions);

  return {
    name,
    fileCount: analyzed.length,
    fnCount: allFns.length,
    avgCC: Number(avg(analyzed.map((f) => f.cyclomatic)).toFixed(2)),
    highCC: analyzed.filter((f) => f.maxFnCC >= CC_ERROR_THRESHOLD).length,
    mediumCC: analyzed.filter((f) => f.maxFnCC >= CC_WARN_THRESHOLD && f.maxFnCC < CC_ERROR_THRESHOLD).length,
    lowCC: analyzed.filter((f) => f.maxFnCC < CC_WARN_THRESHOLD).length,
    fnOver25: allFns.filter((fn) => fn.cc >= CC_ERROR_THRESHOLD).length,
    fnOver15: allFns.filter((fn) => fn.cc >= CC_WARN_THRESHOLD).length,
    files: analyzed,
  };
}

// --- Entry point ---

function main() {
  const buckets = TARGET_BUCKETS.map((b) => buildBucket(b.name, b.dir));
  const allFiles = buckets.flatMap((b) => b.files.map((f) => ({ ...f, bucket: b.name })));
  const allFunctions = allFiles.flatMap((f) =>
    f.functions.map((fn) => ({ fnName: fn.name, file: f.file, line: fn.line, cc: fn.cc, sloc: fn.sloc, bucket: f.bucket }))
  );
  const topHotspots = allFunctions.slice().sort((a, b) => b.cc - a.cc).slice(0, TOP_HOTSPOTS_COUNT);

  const totals = {
    files: allFiles.length,
    functions: allFunctions.length,
    fnOver25: allFunctions.filter((fn) => fn.cc >= CC_ERROR_THRESHOLD).length,
    fnOver15: allFunctions.filter((fn) => fn.cc >= CC_WARN_THRESHOLD).length,
  };

  const previous = loadLatestSnapshot();
  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    thresholds: { warn: CC_WARN_THRESHOLD, error: CC_ERROR_THRESHOLD },
    buckets,
    totals,
    topHotspots,
    deltas: computeDeltas({ buckets, totals }, previous),
  };

  if (SNAPSHOT_FLAG) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const snapPath = path.join(HISTORY_DIR, `${stamp}.json`);
    fs.writeFileSync(snapPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Snapshot saved: ${path.relative(ROOT, snapPath).replace(/\\/g, '/')}`);
  }

  const out = writeReports(report);
  console.log('Complexity reports generated:');
  console.log(`  ${path.relative(ROOT, out.jsonPath).replace(/\\/g, '/')}`);
  console.log(`  ${path.relative(ROOT, out.htmlPath).replace(/\\/g, '/')}`);
  console.log('');
  for (const b of buckets) {
    console.log(`  ${b.name}: ${b.fileCount} files, ${b.fnCount} fns  --  high CC: ${b.fnOver25}  medium CC: ${b.fnOver15 - b.fnOver25}`);
  }
  console.log('');
  if (topHotspots.length > 0) {
    const top = topHotspots[0];
    console.log(`  Top hotspot: ${top.fnName} (${top.file}:${top.line}) CC=${top.cc}`);
  }
}

main();
