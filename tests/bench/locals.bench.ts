/**
 * Implements locals.bench for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bench, describe } from "vitest";
import { LocalsContainer } from "../../src/main/mi-interface/gdb-parsers/gdb-locals";

// ─── Corpus loading (mirrors gdb-locals.corpus.test.ts) ──────────────────────
/**
 * Performs extractLocalsPayload as part of this module's internal workflow.
 *
 * @param line - line parameter.
 * @returns The computed result produced by this operation.
 */

function extractLocalsPayload(line: string): string {
  const trimmed = line.trim();
  const match = /^locals=\[(.*)\]$/.exec(trimmed);
  if (!match) return trimmed;
  const payload = match[1] ?? "";
  return payload.length === 0 ? "{}" : payload;
}

const corpusLines = readFileSync(
  resolve(process.cwd(), "test-files", "Locals.test.inputs.txt"),
  "utf8",
)
  .split(/\r?\n/)
  .filter((l) => l.trim().length > 0);

// Empty: locals=[]
const emptyPayload = extractLocalsPayload(corpusLines[0]);

// Single simple local: locals=[{name="__func__",value="..."}]
const singlePayload = extractLocalsPayload(corpusLines[1]);

// Multiple locals with nested Rust enum types (shapes + areas)
const rustEnumPayload = extractLocalsPayload(
  corpusLines.find(
    (l) => l.includes("shapes") && l.includes("Vec(size=3)") && l.includes("areas"),
  ) ?? corpusLines[3],
);

// Deep C struct with bitfields, embedded structs, and arrays
const deepStructPayload = extractLocalsPayload(
  corpusLines.find((l) => l.includes("embed_t") && l.includes("bf1") && l.includes("arr =")) ??
    corpusLines[corpusLines.length - 1],
);

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describe("LocalsContainer", () => {
  bench("empty locals", () => {
    new LocalsContainer(emptyPayload);
  });

  bench("single simple local", () => {
    new LocalsContainer(singlePayload);
  });

  bench("multiple locals with nested Rust enum types", () => {
    new LocalsContainer(rustEnumPayload);
  });

  bench("deep C struct with bitfields and embedded structs", () => {
    new LocalsContainer(deepStructPayload);
  });
});
