/**
 * Generates both coupling report outputs in one command:
 *   reports/coupling/report.html  — dependency-cruiser HTML violations report
 *   reports/coupling/graph.svg    — dependency graph SVG (via dot-to-svg.cjs)
 */
"use strict";

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

  fs.writeFileSync(REPORT_SVG, result.stdout, "utf8");
});

console.log("Done.");
