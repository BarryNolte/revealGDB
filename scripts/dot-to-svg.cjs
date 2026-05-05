/**
 * Reads Graphviz DOT format from stdin and writes SVG to stdout.
 * Used as a cross-platform replacement for the `dot -T svg` command.
 */
"use strict";

const { Graphviz } = require("@hpcc-js/wasm-graphviz");

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const dot = Buffer.concat(chunks).toString("utf8");

  const graphviz = await Graphviz.load();
  const raw = graphviz.dot(dot, "svg");

  // Rewrite local-project hrefs to absolute file:// URIs so links work
  // when the SVG is opened from any location.
  const root = process.cwd().replace(/\\/g, "/");
  const svg = raw.replace(
    /xlink:href="(?!https?:\/\/)([^"]+)"/g,
    (_, p) => `xlink:href="file:///${root}/${p}"`
  );
  process.stdout.write(svg);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
