/**
 * Implements gdb-locals.corpus.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Local,
  LocalsContainer,
} from "../../../../../src/main/mi-interface/gdb-parsers/gdb-locals";

type SerializableLocal = {
  name: string;
  value: string;
  fullpath: string;
  sublocals: SerializableLocal[];
};

const LOCALS_CORPUS_PATH = resolve(process.cwd(), "test-files", "Locals.test.inputs.txt");
/**
 * Performs toSerializable as part of this module's internal workflow.
 *
 * @param local - local parameter.
 * @param seen - seen parameter.
 * @returns The computed result produced by this operation.
 */

function toSerializable(local: Local, seen = new WeakSet<Local>()): SerializableLocal {
  if (seen.has(local)) {
    throw new Error(`Cycle detected at local: ${local.fullpath}`);
  }

  seen.add(local);

  return {
    name: local.name,
    value: local.value,
    fullpath: local.fullpath,
    sublocals: local.sublocals.map((child) => toSerializable(child, seen)),
  };
}
/**
 * Performs extractLocalsPayload as part of this module's internal workflow.
 *
 * @param line - line parameter.
 * @returns The computed result produced by this operation.
 */

function extractLocalsPayload(line: string): string {
  const trimmed = line.trim();
  const match = /^locals=\[(.*)\]$/.exec(trimmed);

  if (!match) {
    return trimmed;
  }

  const payload = match[1] ?? "";
  return payload.length === 0 ? "{}" : payload;
}
/**
 * Performs loadCorpusCases as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function loadCorpusCases(): Array<{ id: string; sourceLine: number; input: string }> {
  const lines = readFileSync(LOCALS_CORPUS_PATH, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  return lines.map((line, index) => {
    const sourceLine = index + 1;
    return {
      id: `line-${String(sourceLine).padStart(3, "0")}`,
      sourceLine,
      input: extractLocalsPayload(line),
    };
  });
}

describe("LocalsContainer corpus coverage", () => {
  const corpusCases = loadCorpusCases();

  it("should keep test case count aligned with Locals.test.inputs.txt", () => {
    expect(corpusCases.length).toBeGreaterThan(0);

    const sourceLineCount = readFileSync(LOCALS_CORPUS_PATH, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;

    expect(corpusCases).toHaveLength(sourceLineCount);
  });

  for (const fixture of corpusCases) {
    it(`parses ${fixture.id} from Locals.test.inputs.txt:${fixture.sourceLine}`, () => {
      const container = new LocalsContainer(fixture.input);
      const actual = container.locals.map((local) => toSerializable(local));

      expect(actual).toMatchSnapshot();
    });
  }
});


/**
 * @file gdb-locals.corpus.test.ts
 * @description Source module for gdb-locals.corpus.test.
 */


/**
 * gdb-locals.corpus.test module.
 *
 * @remarks
 * Source module for gdb-locals.corpus.test.
 */
