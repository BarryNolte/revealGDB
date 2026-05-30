/**
 * Generates both coupling report outputs in one command:
 *   reports/coupling/report.html  — dependency-cruiser HTML violations report
 *   reports/coupling/graph.svg    — dependency graph SVG (via dot-to-svg.cjs)
 */
"use strict";

/** Returns an SVG <g> element containing a legend for the coupling graph. */
function makeLegend(svgWidth, legendH) {
  const PAD = 14;
  const F = 'font-family="Helvetica,sans-Serif"';
  const BW = 22, BH = 14;

  const nodeItems = [
    { fill: '#ddfeff', fillOp: null,  stroke: 'black',   tc: 'black',   label: 'Source file' },
    { fill: '#ccffcc', fillOp: null,  stroke: 'black',   tc: 'black',   label: 'Type declaration (.d.ts)' },
    { fill: '#ffffcc', fillOp: null,  stroke: 'grey',    tc: '#888888', label: 'Node.js built-in' },
    { fill: '#c40b0a', fillOp: '0.1', stroke: '#c40b0a', tc: '#c40b0a', label: 'npm package' },
    { fill: '#ffee44', fillOp: null,  stroke: 'black',   tc: 'black',   label: 'package.json' },
  ];
  const edgeItems = [
    { dash: false, label: 'Static import' },
    { dash: true,  label: 'Dynamic import' },
  ];

  const titleY   = PAD + 14;
  const nodeRowY = titleY + 20;
  const edgeRowY = nodeRowY + 32;

  const parts = [];
  parts.push(`<rect x="0" y="0" width="${svgWidth}" height="${legendH}" fill="white" stroke="none"/>`);
  parts.push(`<rect x="${PAD}" y="${PAD - 2}" width="${svgWidth - 2 * PAD}" height="${legendH - 2 * PAD + 2}" fill="none" stroke="#cccccc" stroke-width="1" rx="4"/>`);
  parts.push(`<text x="${PAD + 8}" y="${titleY}" ${F} font-size="11" font-weight="bold" fill="#333">Legend</text>`);

  let nx = PAD + 65;
  for (const n of nodeItems) {
    const opAttr = n.fillOp != null ? ` fill-opacity="${n.fillOp}"` : '';
    parts.push(`<rect x="${nx}" y="${nodeRowY}" width="${BW}" height="${BH}" fill="${n.fill}"${opAttr} stroke="${n.stroke}" stroke-width="1" rx="2"/>`);
    parts.push(`<text x="${nx + BW + 4}" y="${nodeRowY + BH - 1}" ${F} font-size="10" fill="${n.tc}">${n.label}</text>`);
    nx += BW + 6 + Math.ceil(n.label.length * 6) + 16;
  }

  let ex = PAD + 65;
  for (const e of edgeItems) {
    const ey = edgeRowY + 7;
    const dashAttr = e.dash ? ' stroke-dasharray="5,3"' : '';
    parts.push(`<line x1="${ex}" y1="${ey}" x2="${ex + 30}" y2="${ey}" stroke="black" stroke-width="2"${dashAttr}/>`);
    parts.push(`<polygon points="${ex + 30},${ey - 4} ${ex + 38},${ey} ${ex + 30},${ey + 4}" fill="black"/>`);
    parts.push(`<text x="${ex + 44}" y="${edgeRowY + 12}" ${F} font-size="10" fill="black">${e.label}</text>`);
    ex += 44 + Math.ceil(e.label.length * 6) + 20;
  }

  return `<g id="legend">\n${parts.join('\n')}\n</g>`;
}

/** Injects a legend band at the top of a Graphviz-generated SVG string. */
function injectLegend(svgText) {
  const LEGEND_H = 110;

  const widthMatch = svgText.match(/<svg[^>]+width="([\d.]+)pt"/);
  const svgWidth = widthMatch ? parseFloat(widthMatch[1]) : 1900;

  // Extend the <svg> height attribute
  svgText = svgText.replace(
    /(height=")([\d.]+)(pt")/,
    (_, pre, h, post) => `${pre}${(parseFloat(h) + LEGEND_H).toFixed(2)}${post}`
  );
  // Extend the viewBox height
  svgText = svgText.replace(
    /(viewBox="0\.00 0\.00 [\d.]+) ([\d.]+)(")/,
    (_, pre, h, post) => `${pre} ${(parseFloat(h) + LEGEND_H).toFixed(2)}${post}`
  );
  // Shift the graph content down by LEGEND_H (increase the Y translate on graph0)
  svgText = svgText.replace(
    /(id="graph0"[^>]+translate\()([\d.]+) ([\d.]+)\)/,
    (_, pre, tx, ty) => `${pre}${tx} ${(parseFloat(ty) + LEGEND_H).toFixed(2)})`
  );

  const legend = makeLegend(svgWidth, LEGEND_H);
  svgText = svgText.replace('<g id="graph0"', `${legend}\n<g id="graph0"`);
  return svgText;
}

/** Injects edge hover-highlight CSS and a hit-area widening script into the SVG. */
function injectInteractivity(svgText) {
  const style = `<style>
g.edge { cursor: pointer; }
g.edge > path,
g.edge > polygon {
  transition: stroke 0.12s ease, stroke-opacity 0.12s ease,
              stroke-width 0.12s ease, fill 0.12s ease, fill-opacity 0.12s ease;
}
.edge-hit {
  stroke: transparent !important;
  stroke-width: 10 !important;
  stroke-opacity: 1 !important;
  fill: none !important;
}
g.edge:hover > path:not(.edge-hit) {
  stroke: #e65c00 !important;
  stroke-width: 3 !important;
  stroke-opacity: 1 !important;
}
g.edge:hover > polygon {
  stroke: #e65c00 !important;
  stroke-opacity: 1 !important;
  stroke-width: 3 !important;
  fill: #e65c00 !important;
  fill-opacity: 1 !important;
}
</style>`;

  // Wide transparent paths sit behind each edge path so thin lines are easy to hover.
  const script = `<script type="text/javascript">
//<![CDATA[
(function () {
  // Works whether the SVG is a standalone file or inlined inside an HTML document.
  var scriptEl = document.currentScript;
  var svg = (scriptEl && scriptEl.closest) ? scriptEl.closest('svg') : document.documentElement;
  var ns   = 'http://www.w3.org/2000/svg';

  // ── hit-area widening ────────────────────────────────────────────────────
  try {
    document.querySelectorAll('g.edge > path').forEach(function (p) {
      var hit = p.cloneNode(false);
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '10');
      hit.setAttribute('fill', 'none');
      hit.setAttribute('class', 'edge-hit');
      hit.removeAttribute('stroke-dasharray');
      p.parentNode.insertBefore(hit, p);
    });
  } catch (e) { /* no-op if scripting is disabled */ }

  // ── node-type lookup ─────────────────────────────────────────────────────
  var FILL_TYPE = {
    '#ddfeff': 'source file',
    '#ccffcc': 'type declaration',
    '#ffffcc': 'built-in',
    '#ffee44': 'package.json',
    '#c40b0a': 'npm package',
  };
  var nodeTypes = {};
  document.querySelectorAll('g.node').forEach(function (g) {
    var t = g.querySelector('title');
    if (!t) return;
    var shape = g.querySelector('path, polygon');
    var type  = shape ? (FILL_TYPE[shape.getAttribute('fill')] || '') : '';
    nodeTypes[t.textContent.trim()] = type;
  });

  // ── tooltip element ──────────────────────────────────────────────────────
  var PAD = 10, LINE_H = 16, CH = 6.3, FS = 11;
  var tip = document.createElementNS(ns, 'g');
  tip.setAttribute('id', 'edge-tooltip');
  tip.setAttribute('pointer-events', 'none');
  tip.style.display = 'none';

  var bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('rx', '4');
  bg.style.fill = '#222';
  bg.style.fillOpacity = '0.9';
  bg.setAttribute('stroke', '#777');
  bg.setAttribute('stroke-width', '0.8');
  tip.appendChild(bg);

  function addLine(bold) {
    var t = document.createElementNS(ns, 'text');
    t.setAttribute('font-family', 'Helvetica,sans-Serif');
    t.setAttribute('font-size', FS);
    t.style.fill = bold ? '#ffffff' : '#c8c8c8';
    if (bold) t.setAttribute('font-weight', 'bold');
    tip.appendChild(t);
    return t;
  }
  var lTitle = addLine(true);
  var lFrom  = addLine(false);
  var lTo    = addLine(false);
  var lKind  = addLine(false);
  var lines  = [lTitle, lFrom, lTo, lKind];
  svg.appendChild(tip);

  // ── SVG coordinate conversion ────────────────────────────────────────────
  function toSvgPt(evt) {
    var rect = svg.getBoundingClientRect();
    var vb   = svg.viewBox.baseVal;
    return {
      x: (evt.clientX - rect.left) * vb.width  / rect.width,
      y: (evt.clientY - rect.top)  * vb.height / rect.height
    };
  }

  // ── tooltip layout ───────────────────────────────────────────────────────
  function layout(x, y) {
    var maxLen = 0;
    lines.forEach(function (l) {
      if (l.textContent.length > maxLen) maxLen = l.textContent.length;
    });
    var w = maxLen * CH + PAD * 2;
    var h = lines.length * LINE_H + PAD * 2;
    // Clamp to SVG viewBox so tooltip never overflows and gets clipped.
    var vb = svg.viewBox.baseVal;
    if (x + w > vb.width)  x = vb.width  - w - PAD;
    if (y + h > vb.height) y = vb.height - h - PAD;
    if (x < PAD) x = PAD;
    if (y < PAD) y = PAD;
    bg.setAttribute('x', x);
    bg.setAttribute('y', y);
    bg.setAttribute('width',  w);
    bg.setAttribute('height', h);
    lines.forEach(function (l, i) {
      l.setAttribute('x', x + PAD);
      l.setAttribute('y', y + PAD + FS + LINE_H * i);
    });
  }

  // ── show/hide ────────────────────────────────────────────────────────────
  function show(edge, evt) {
    var titleEl = edge.querySelector('title');
    if (!titleEl) return;
    var raw   = titleEl.textContent.trim();
    var arrow = raw.indexOf('->');
    if (arrow < 0) return;

    var from = raw.slice(0, arrow).trim();
    var to   = raw.slice(arrow + 2).trim();

    var epPath  = edge.querySelector('path:not(.edge-hit)');
    var dynamic = epPath && epPath.getAttribute('stroke-dasharray');
    var kind    = dynamic ? 'dynamic import' : 'static import';

    var ft = nodeTypes[from] ? '  (' + nodeTypes[from] + ')' : '';
    var tt = nodeTypes[to]   ? '  (' + nodeTypes[to]   + ')' : '';

    lTitle.textContent = from.split('/').pop() + '  \u2192  ' + to.split('/').pop();
    lFrom.textContent  = 'from: ' + from + ft;
    lTo.textContent    = '  to: ' + to   + tt;
    lKind.textContent  = kind;

    var pt = toSvgPt(evt);
    layout(pt.x + 18, pt.y + 18);
    tip.style.display = '';
  }

  function move(evt) {
    if (tip.style.display === 'none') return;
    var pt = toSvgPt(evt);
    layout(pt.x + 18, pt.y + 18);
  }

  // ── wire up events ───────────────────────────────────────────────────────
  document.querySelectorAll('g.edge').forEach(function (edge) {
    edge.addEventListener('mouseenter', function (e) { show(edge, e); });
    edge.addEventListener('mousemove',  move);
    edge.addEventListener('mouseleave', function ()  { tip.style.display = 'none'; });
  });
})();
//]]>
</script>`;

  svgText = svgText.replace(/(<svg[^>]*>)/, `$1\n${style}`);
  svgText = svgText.replace(/<\/svg>/, `${script}\n</svg>`);
  return svgText;
}

const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const DEPCRUISE_CONFIG = path.join(ROOT, ".dependency-cruiser.cjs");
const SRC = path.join(ROOT, "src");
const REPORT_HTML = path.join(ROOT, "reports", "coupling", "report.html");
const REPORT_SVG = path.join(ROOT, "reports", "coupling", "graph.svg");
const DOT_TO_SVG = path.join(ROOT, "scripts", "dot-to-svg.cjs");

function run(label, fn) {
  process.stdout.write(`  ${label}... `);
  try {
    fn();
    process.stdout.write("done\n");
  } catch (err) {
    process.stdout.write("FAILED\n");
    process.stderr.write(String(err.message || err) + "\n");
    process.exit(1);
  }
}

console.log("Coupling report");

run(`HTML violations report → reports/coupling/report.html`, () => {
  execSync(
    `npx depcruise --config "${DEPCRUISE_CONFIG}" "${SRC}" --output-type err-html --output-to "${REPORT_HTML}"`,
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  // Fix relative src/ links so they open the correct file.
  // dependency-cruiser emits href="src/..." relative to the project root,
  // but the HTML lives in reports/coupling/, so we rewrite them to
  // vscode://file/ URIs which work when the report is viewed inside VS Code.
  const rootUri = ROOT.replace(/\\/g, "/");
  let html = fs.readFileSync(REPORT_HTML, "utf8");
  html = html.replace(
    /href="(src\/[^"]+)"/g,
    (_, p) => `href="vscode://file/${rootUri}/${p}"`
  );
  fs.writeFileSync(REPORT_HTML, html, "utf8");
});

run(`Dependency graph → reports/coupling/graph.svg`, () => {
  const dot = execSync(
    `npx depcruise --config "${DEPCRUISE_CONFIG}" "${SRC}" --output-type dot`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );

  const result = spawnSync(process.execPath, [DOT_TO_SVG], {
    input: dot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "dot-to-svg failed");
  }

  fs.writeFileSync(REPORT_SVG, injectInteractivity(injectLegend(result.stdout)), "utf8");
});

console.log("Done.");
