// @vitest-environment node

import { bench, describe } from "vitest";
import { getRegexMatches } from "../../src/main/mi-interface/mi-result-strategies/regex-parsing-helpers";
import { parseRegisterPayload } from "../../src/main/mi-interface/mi-result-strategies/register-parsing-helpers";

// ─── parseRegisterPayload — register names ────────────────────────────────────

// GDB sends a flat JSON-ish list of register names once on startup.
// The 8-register case covers a minimal embedded target (ESP32 core window).
// The 32-register case is typical ARM Cortex-M (r0–r15 + xPSR + FP regs).
// The 64-register case matches a full ARM64 or RISC-V hart.

const rgxCleanList = /\[(?<list>.*)\]/;
const rgxRegisterValues = /{number="(?<number>[^"]*)",value="(?<value>[^"]*)"}/g;

// Build MI-style register names list: ["r0","r1",...]
const makeNamesList = (count: number) =>
  `[${Array.from({ length: count }, (_, i) => `"r${i}"`).join(",")}]`;

const NAMES_8 = makeNamesList(8);
const NAMES_32 = makeNamesList(32);
const NAMES_64 = makeNamesList(64);

// ─── parseRegisterPayload — register values ───────────────────────────────────

// GDB sends register values as a list of {number="N",value="0x..."} records
// on every stop event.  Values are hex strings of varying length.

function makeRegisterValues(count: number): string {
  return Array.from(
    { length: count },
    (_, i) => `{number="${i}",value="0x${(i * 0x11111111).toString(16).padStart(8, "0")}"}`,
  ).join(",");
}

const VALUES_8 = makeRegisterValues(8);
const VALUES_32 = makeRegisterValues(32);

describe("parseRegisterPayload (names)", () => {
  bench("8 registers", () => {
    parseRegisterPayload(NAMES_8, rgxCleanList, new RegExp(rgxRegisterValues.source, "g"));
  });

  bench("32 registers", () => {
    parseRegisterPayload(NAMES_32, rgxCleanList, new RegExp(rgxRegisterValues.source, "g"));
  });

  bench("64 registers", () => {
    parseRegisterPayload(NAMES_64, rgxCleanList, new RegExp(rgxRegisterValues.source, "g"));
  });
});

describe("parseRegisterPayload (values)", () => {
  bench("8 register values", () => {
    parseRegisterPayload(VALUES_8, rgxCleanList, new RegExp(rgxRegisterValues.source, "g"));
  });

  bench("32 register values", () => {
    parseRegisterPayload(VALUES_32, rgxCleanList, new RegExp(rgxRegisterValues.source, "g"));
  });
});

// ─── Stack frame regex matching ───────────────────────────────────────────────

// StackResultStrategy runs this regex against the full ^done,stack=[...] payload
// on every pause/step. The 1-frame case is a simple stop; 5-frame is typical
// embedded debugging depth; 20-frame covers deeper call chains.

const rgxFrame =
  /frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)"(?:,file="(?<file>[^"]*)")?(?:,fullname="(?<fullname>[^"]*)")?(?:,line="(?<line>[^"]*)")?(?:,arch="(?<arch>[^"]*)")?}/g;

function makeStackPayload(frameCount: number): string {
  const frames = Array.from({ length: frameCount }, (_, i) => {
    const fn = i === 0 ? "main" : `func_${i}`;
    const addr = `0x${(0x08000000 + i * 0x100).toString(16)}`;
    return `frame={level="${i}",addr="${addr}",func="${fn}",file="src/${fn}.c",fullname="/workspace/src/${fn}.c",line="${10 + i * 5}",arch="arm"}`;
  });
  return `stack=[${frames.join(",")}]`;
}

const STACK_1 = makeStackPayload(1);
const STACK_5 = makeStackPayload(5);
const STACK_20 = makeStackPayload(20);

describe("stack frame regex (getRegexMatches)", () => {
  bench("1 frame", () => {
    getRegexMatches(STACK_1, new RegExp(rgxFrame.source, "g"));
  });

  bench("5 frames", () => {
    getRegexMatches(STACK_5, new RegExp(rgxFrame.source, "g"));
  });

  bench("20 frames", () => {
    getRegexMatches(STACK_20, new RegExp(rgxFrame.source, "g"));
  });
});
